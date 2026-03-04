// app/api/algorithm/echo/route.js
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

function timeDecay(createdAt, halfLifeHours = 12) {
  const ageHours = (Date.now() - new Date(createdAt).getTime()) / 3600000
  return Math.pow(0.5, ageHours / halfLifeHours)
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
    const limit = parseInt(searchParams.get('limit') || '30')
    const userLat = parseFloat(searchParams.get('lat') || '0')
    const userLng = parseFloat(searchParams.get('lng') || '0')
    const hasLocation = userLat !== 0 || userLng !== 0

    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

    const [
      { data: videos },
      { data: following },
      { data: interactions },
      { data: watchHistory },
    ] = await Promise.all([
      supabase.from('posts')
        .select('*, profiles(id, username, full_name, avatar_url, xp, created_at)')
        .eq('media_type', 'video')
        .not('media_url', 'is', null)
        .in('privacy', ['public'])
        .not('user_id', 'eq', userId)
        .order('created_at', { ascending: false })
        .limit(300),

      supabase.from('followers').select('following_id').eq('follower_id', userId),

      supabase.from('post_interactions')
        .select('post_id, type, duration_ms')
        .eq('user_id', userId)
        .in('type', ['like', 'comment', 'share', 'remix', 'skip', 'completion', 'long_view', 'view'])
        .gte('created_at', new Date(Date.now() - 14 * 86400000).toISOString()),

      supabase.from('post_interactions')
        .select('post_id')
        .eq('user_id', userId)
        .eq('type', 'completion')
        .gte('created_at', new Date(Date.now() - 3 * 86400000).toISOString()),
    ])

    const followingIds = new Set((following || []).map(f => f.following_id))
    const watchedIds = new Set((watchHistory || []).map(w => w.post_id))

    // Build interaction map
    const interactionMap = {}
    ;(interactions || []).forEach(i => {
      if (!interactionMap[i.post_id]) interactionMap[i.post_id] = { score: 0, skipped: false }
      if (i.type === 'like') interactionMap[i.post_id].score += 3
      if (i.type === 'comment') interactionMap[i.post_id].score += 5
      if (i.type === 'share') interactionMap[i.post_id].score += 6
      if (i.type === 'remix') interactionMap[i.post_id].score += 10
      if (i.type === 'completion') interactionMap[i.post_id].score += 5
      if (i.type === 'long_view') interactionMap[i.post_id].score += 4
      if (i.type === 'view') interactionMap[i.post_id].score += 0.5
      if (i.type === 'skip') { interactionMap[i.post_id].score -= 4; interactionMap[i.post_id].skipped = true }
    })

    const creatorCount = {}
    const scored = (videos || []).map(video => {
      let score = 0

      // Base engagement
      score += (video.likes_count || 0) * 2
      score += (video.comments_count || 0) * 4

      // Time decay (faster for echo — 12h half life)
      score *= timeDecay(video.created_at, 12)

      // Following boost
      if (followingIds.has(video.user_id)) score *= 3.0

      // Location
      if (hasLocation && video.location_lat && video.location_lng) {
        const km = haversineKm(userLat, userLng, video.location_lat, video.location_lng)
        if (km < 5) score *= 3.5
        else if (km < 50) score *= 1.8
        else if (km < 500) score *= 1.2
      }

      // Remix boost
      if (video.remix_of) score *= 1.4

      // Already watched penalty
      if (watchedIds.has(video.id)) score *= 0.05

      // Personal interaction
      if (interactionMap[video.id]) {
        score += interactionMap[video.id].score
        if (interactionMap[video.id].skipped) score *= 0.2
      }

      // New creator boost
      const profileAge = video.profiles?.created_at
        ? (Date.now() - new Date(video.profiles.created_at).getTime()) / 86400000
        : 999
      if (profileAge < 30) score *= 1.4

      // Diversity
      creatorCount[video.user_id] = (creatorCount[video.user_id] || 0) + 1
      if (creatorCount[video.user_id] >= 3) score *= 0.2

      return { ...video, score: Math.max(score, 0) }
    })

    scored.sort((a, b) => b.score - a.score)

    // Diversity: mix following + non-following
    const followingVids = scored.filter(v => followingIds.has(v.user_id))
    const nonFollowingVids = scored.filter(v => !followingIds.has(v.user_id))

    const mixed = []
    let fi = 0, ni = 0
    for (let i = 0; i < scored.length; i++) {
      if (i % 4 === 0 && fi < followingVids.length) mixed.push(followingVids[fi++])
      else if (ni < nonFollowingVids.length) mixed.push(nonFollowingVids[ni++])
      else if (fi < followingVids.length) mixed.push(followingVids[fi++])
    }

    // Deduplicate
    const seen = new Set()
    const final = mixed.filter(v => { if (seen.has(v.id)) return false; seen.add(v.id); return true })

    return NextResponse.json({ videos: final.slice(0, limit) })
  } catch (error) {
    console.error('Echo algorithm error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
