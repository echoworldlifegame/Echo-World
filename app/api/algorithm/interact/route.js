// app/api/algorithm/interact/route.js
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// XP rewards per interaction type
const XP_REWARDS = {
  like: 1,
  comment: 3,
  share: 4,
  remix: 10,
  follow: 5,
  view: 0,
  long_view: 1,
  completion: 2,
  skip: 0,
  post_created: 10,
  profile_view: 0,
  comment_view: 0,
  search: 0,
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { postId, type, durationMs = 0, source = 'feed', query, targetUserId } = body

    // Get current user from auth header
    const authHeader = request.headers.get('authorization') || request.headers.get('Authorization')
    let userId = null

    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '')
      const { data: { user } } = await supabase.auth.getUser(token)
      userId = user?.id
    }

    // If no auth header, try to get from cookie (Next.js session)
    if (!userId) {
      const cookieHeader = request.headers.get('cookie') || ''
      const { data: { user } } = await supabase.auth.getUser()
      userId = user?.id
    }

    if (!userId) {
      // Still track non-auth interactions anonymously
      return NextResponse.json({ ok: true, anonymous: true })
    }

    // ── Save interaction ──────────────────────────────
    if (postId && type) {
      // Don't duplicate view interactions within 1 hour
      if (type === 'view') {
        const { data: existing } = await supabase
          .from('post_interactions')
          .select('id')
          .eq('user_id', userId)
          .eq('post_id', postId)
          .eq('type', 'view')
          .gte('created_at', new Date(Date.now() - 3600000).toISOString())
          .single()

        if (existing) return NextResponse.json({ ok: true, skipped: true })
      }

      await supabase.from('post_interactions').insert({
        user_id: userId,
        post_id: postId,
        type,
        duration_ms: durationMs,
        source,
      })

      // Award XP to post owner for engagement
      if (['like', 'comment', 'share', 'remix'].includes(type)) {
        const { data: post } = await supabase
          .from('posts')
          .select('user_id')
          .eq('id', postId)
          .single()

        if (post?.user_id && post.user_id !== userId) {
          const xpGain = { like: 2, comment: 5, share: 8, remix: 15 }[type] || 0
          if (xpGain > 0) {
            await supabase.rpc('increment_xp', { user_id: post.user_id, amount: xpGain })
              .catch(async () => {
                // Fallback if RPC doesn't exist
                const { data: profile } = await supabase
                  .from('profiles').select('xp').eq('id', post.user_id).single()
                await supabase.from('profiles')
                  .update({ xp: (profile?.xp || 0) + xpGain })
                  .eq('id', post.user_id)
              })
          }
        }
      }

      // Award XP to interactor
      const interactorXP = XP_REWARDS[type] || 0
      if (interactorXP > 0) {
        const { data: profile } = await supabase
          .from('profiles').select('xp').eq('id', userId).single()
        await supabase.from('profiles')
          .update({ xp: (profile?.xp || 0) + interactorXP })
          .eq('id', userId)
      }
    }

    // ── Track search query ────────────────────────────
    if (type === 'search' && query) {
      await supabase.from('search_logs').insert({
        user_id: userId,
        query: query.toLowerCase().trim(),
        source,
      }).catch(() => {}) // table may not exist yet
    }

    // ── Track follow ──────────────────────────────────
    if (type === 'follow' && targetUserId) {
      // XP for following
      const { data: profile } = await supabase
        .from('profiles').select('xp').eq('id', userId).single()
      await supabase.from('profiles')
        .update({ xp: (profile?.xp || 0) + 5 })
        .eq('id', userId)
    }

    // ── Update streak ─────────────────────────────────
    if (['like', 'comment', 'post_created', 'view'].includes(type)) {
      await updateStreak(userId)
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Interact error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

async function updateStreak(userId) {
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('streak_days, last_active_date')
      .eq('id', userId)
      .single()

    if (!profile) return

    const today = new Date().toISOString().split('T')[0]
    const lastActive = profile.last_active_date

    if (lastActive === today) return // already updated today

    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
    const newStreak = lastActive === yesterday
      ? (profile.streak_days || 0) + 1
      : 1 // streak broken

    await supabase.from('profiles').update({
      streak_days: newStreak,
      last_active_date: today,
    }).eq('id', userId)

    // Streak milestone XP
    if ([7, 14, 30, 60, 100].includes(newStreak)) {
      const bonusXP = newStreak * 10
      const { data: p } = await supabase.from('profiles').select('xp').eq('id', userId).single()
      await supabase.from('profiles').update({ xp: (p?.xp || 0) + bonusXP }).eq('id', userId)
    }
  } catch {}
}
