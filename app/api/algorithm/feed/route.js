// app/api/algorithm/feed/route.js
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const W = {
  LIKE: 2.0, COMMENT: 4.0, SHARE: 5.0, REMIX: 8.0, SAVE: 6.0,
  VIEW: 0.3, LONG_VIEW: 3.0, COMPLETION: 4.0, SKIP_PENALTY: -3.0,
  HALF_LIFE_HOURS: 18,
  FOLLOWING_BOOST: 2.5, MUTUAL_BOOST: 1.8,
  LOCATION_CLOSE: 3.0, LOCATION_MED: 1.5, LOCATION_FAR: 0.8,
  NEW_CREATOR: 1.3, VERIFIED: 1.1,
  SAME_CREATOR_PENALTY: 0.3, SEEN_PENALTY: 0.1,
}

function timeDecay(createdAt) {
  const ageHours = (Date.now() - new Date(createdAt).getTime()) / 3600000
  return Math.pow(0.5, ageHours / W.HALF_LIFE_HOURS)
}

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')
    const userLat = parseFloat(searchParams.get('lat') || '0')
    const userLng = parseFloat(searchParams.get('lng') || '0')
    const hasLocation = userLat !== 0 || userLng !== 0

    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

    // ── Fetch data in parallel ──────────────────────────
    const [
      { data: posts },
      { data: following },
      { data: interactions },
      { data: seenPosts },
      { data: myProfile },
    ] = await Promise.all([
      supabase.from('posts')
        .select('*, profiles(id, username, full_name, avatar_url, xp, created_at)')
        .in('privacy', ['public'])
        .not('user_id', 'eq', userId)
        .order('created_at', { ascending: false })
        .limit(200),

      supabase.from('followers').select('following_id').eq('follower_id', userId),

      supabase.from('post_interactions')
        .select('post_id, type, duration_ms')
        .eq('user_id', userId)
        .gte('created_at', new Date(Date.now() - 7 * 86400000).toISOString()),

      supabase.from('post_interactions')
        .select('post_id')
        .eq('user_id', userId)
        .eq('type', 'view')
        .gte('created_at', new Date(Date.now() - 2 * 86400000).toISOString()),

      supabase.from('profiles').select('xp, created_at').eq('id', userId).single(),
    ])

    const followingIds = new Set((following || []).map(f => f.following_id))
    const seenIds = new Set((seenPosts || []).map(s => s.post_id))

    // Build interaction score map
    const interactionMap = {}
    ;(interactions || []).forEach(i => {
      if (!interactionMap[i.post_id]) interactionMap[i.post_id] = 0
      if (i.type === 'like') interactionMap[i.post_id] += W.LIKE
      if (i.type === 'comment') interactionMap[i.post_id] += W.COMMENT
      if (i.type === 'share') interactionMap[i.post_id] += W.SHARE
      if (i.type === 'remix') interactionMap[i.post_id] += W.REMIX
      if (i.type === 'skip') interactionMap[i.post_id] += W.SKIP_PENALTY
      if (i.type === 'long_view') interactionMap[i.post_id] += W.LONG_VIEW
      if (i.type === 'completion') interactionMap[i.post_id] += W.COMPLETION
      if (i.type === 'view') interactionMap[i.post_id] += W.VIEW
    })

    // ── Score each post ──────────────────────────────────
    const creatorCount = {}
    const scoredPosts = (posts || []).map(post => {
      let score = 0

      // Base engagement score
      score += (post.likes_count || 0) * W.LIKE
      score += (post.comments_count || 0) * W.COMMENT

      // Time decay
      score *= timeDecay(post.created_at)

      // Following boost
      if (followingIds.has(post.user_id)) score *= W.FOLLOWING_BOOST

      // Location boost
      if (hasLocation && post.location_lat && post.location_lng) {
        const km = haversineKm(userLat, userLng, post.location_lat, post.location_lng)
        if (km < 5) score *= W.LOCATION_CLOSE
        else if (km < 50) score *= W.LOCATION_MED
        else if (km < 500) score *= W.LOCATION_FAR
      }

      // New creator boost (account < 30 days)
      const profileAge = post.profiles?.created_at
        ? (Date.now() - new Date(post.profiles.created_at).getTime()) / 86400000
        : 999
      if (profileAge < 30) score *= W.NEW_CREATOR

      // Personal interaction bonus
      if (interactionMap[post.id]) score += interactionMap[post.id]

      // Already seen penalty
      if (seenIds.has(post.id)) score *= W.SEEN_PENALTY

      // Same creator diversity penalty
      creatorCount[post.user_id] = (creatorCount[post.user_id] || 0) + 1
      if (creatorCount[post.user_id] >= 3) score *= W.SAME_CREATOR_PENALTY

      // Media type boost (videos slightly preferred)
      if (post.media_type === 'video') score *= 1.2
      if (post.media_type === 'capsule') score *= 1.1

      return { ...post, score: Math.max(score, 0) }
    })

    // Sort by score
    scoredPosts.sort((a, b) => b.score - a.score)

    // ── Diversity injection ──────────────────────────────
    // Every 5th post: inject a following post if not already there
    const followingPosts = scoredPosts.filter(p => followingIds.has(p.user_id))
    const nonFollowingPosts = scoredPosts.filter(p => !followingIds.has(p.user_id))

    const diversified = []
    let fi = 0, ni = 0
    for (let i = 0; i < scoredPosts.length; i++) {
      if (i % 5 === 0 && fi < followingPosts.length) {
        diversified.push(followingPosts[fi++])
      } else if (ni < nonFollowingPosts.length) {
        diversified.push(nonFollowingPosts[ni++])
      } else if (fi < followingPosts.length) {
        diversified.push(followingPosts[fi++])
      }
    }

    // Deduplicate
    const seen = new Set()
    const final = diversified.filter(p => {
      if (seen.has(p.id)) return false
      seen.add(p.id)
      return true
    })

    const paginated = final.slice(offset, offset + limit)

    return NextResponse.json({ posts: paginated, total: final.length })
  } catch (error) {
    console.error('Feed algorithm error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
