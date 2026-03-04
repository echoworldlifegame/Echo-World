'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useParams } from 'next/navigation'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default function UserProfile() {
  const { id } = useParams()
  const [me, setMe] = useState(null)
  const [profile, setProfile] = useState(null)
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [isSupporting, setIsSupporting] = useState(false)
  const [supportLoading, setSupportLoading] = useState(false)
  const [supporters, setSupporters] = useState(0)
  const [supporting, setSupporting] = useState(0)
  const [totalLikes, setTotalLikes] = useState(0)
  const [activeTab, setActiveTab] = useState('all')
  const [mutualFollowers, setMutualFollowers] = useState([])

  // Level system
  const levelThresholds = [0, 100, 300, 700, 1500, 3000, 6000]
  const levelNames = ['Explorer', 'Rising Star', 'Elite', 'Champion', 'Diamond', 'Legend', 'God Mode']
  const levelEmojis = ['🧭', '🌟', '⚡', '🏆', '💎', '👑', '🌌']

  const getLevel = (xp = 0) => {
    for (let i = levelThresholds.length - 1; i >= 0; i--) {
      if (xp >= levelThresholds[i]) return i + 1
    }
    return 1
  }
  const getLevelName = (xp = 0) => levelNames[getLevel(xp) - 1] || 'Explorer'
  const getLevelEmoji = (xp = 0) => levelEmojis[getLevel(xp) - 1] || '🧭'

  useEffect(() => {
    if (!id) return
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { window.location.href = '/'; return }
      const u = data.session.user
      setMe(u)

      // Redirect to own profile
      if (u.id === id) { window.location.href = '/profile'; return }

      await loadUserProfile(u.id, id)

      // Track profile view in algorithm
      try {
        await fetch('/api/algorithm/interact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ targetUserId: id, type: 'profile_view', source: 'user_profile' })
        })
      } catch {}
    })
  }, [id])

  const loadUserProfile = async (myId, userId) => {
    const [
      { data: p },
      { data: userPosts },
      { count: suppCount },
      { count: suppingCount },
      { data: myFollowing },
      { data: isFollowing },
    ] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).single(),
      supabase.from('posts')
        .select('*')
        .eq('user_id', userId)
        .in('privacy', ['public', 'friends'])
        .order('created_at', { ascending: false }),
      supabase.from('followers').select('*', { count: 'exact', head: true }).eq('following_id', userId),
      supabase.from('followers').select('*', { count: 'exact', head: true }).eq('follower_id', userId),
      supabase.from('followers').select('following_id').eq('follower_id', myId),
      supabase.from('followers').select('id').eq('follower_id', myId).eq('following_id', userId).single(),
    ])

    setProfile(p)
    setPosts(userPosts || [])
    setSupporters(suppCount || 0)
    setSupporting(suppingCount || 0)
    setIsSupporting(!!isFollowing)

    const likeSum = (userPosts || []).reduce((sum, post) => sum + (post.likes_count || 0), 0)
    setTotalLikes(likeSum)

    // Mutual followers
    const myFollowingIds = (myFollowing || []).map(f => f.following_id)
    const { data: theirFollowers } = await supabase
      .from('followers').select('follower_id').eq('following_id', userId)
    const theirFollowerIds = (theirFollowers || []).map(f => f.follower_id)
    const mutualIds = myFollowingIds.filter(id => theirFollowerIds.includes(id))

    if (mutualIds.length > 0) {
      const { data: mutuals } = await supabase
        .from('profiles').select('id, username, full_name, avatar_url').in('id', mutualIds.slice(0, 3))
      setMutualFollowers(mutuals || [])
    }

    setLoading(false)
  }

  const handleSupport = async () => {
    if (!me || supportLoading) return
    setSupportLoading(true)

    if (isSupporting) {
      await supabase.from('followers').delete().eq('follower_id', me.id).eq('following_id', id)
      setSupporters(s => Math.max(s - 1, 0))
      setIsSupporting(false)
    } else {
      await supabase.from('followers').upsert({ follower_id: me.id, following_id: id })
      setSupporters(s => s + 1)
      setIsSupporting(true)

      // Notification
      await supabase.from('notifications').insert({
        user_id: id, from_user_id: me.id, type: 'follow',
        message: 'started supporting you'
      })

      // Algorithm track
      try {
        await fetch('/api/algorithm/interact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ targetUserId: id, type: 'follow', source: 'user_profile' })
        })
      } catch {}
    }
    setSupportLoading(false)
  }

  const handleMessage = () => {
    window.location.href = `/messages/${id}`
  }

  const filteredPosts = posts.filter(p => {
    if (activeTab === 'photos') return p.media_type === 'photo'
    if (activeTab === 'videos') return p.media_type === 'video'
    if (activeTab === 'capsules') return p.media_type === 'capsule'
    return true
  })

  const timeAgo = (date) => {
    const s = Math.floor((new Date() - new Date(date)) / 1000)
    if (s < 60) return 'এইমাত্র'
    if (s < 3600) return Math.floor(s / 60) + 'মি'
    if (s < 86400) return Math.floor(s / 3600) + 'ঘ'
    return Math.floor(s / 86400) + 'দিন'
  }

  const xp = profile?.xp || 0
  const level = getLevel(xp)
  const levelName = getLevelName(xp)
  const levelEmoji = getLevelEmoji(xp)
  const levelThreshold = levelThresholds[level] || levelThresholds[levelThresholds.length - 1]
  const prevThreshold = levelThresholds[level - 1] || 0
  const progress = Math.min(((xp - prevThreshold) / (levelThreshold - prevThreshold)) * 100, 100)

  if (loading) return (
    <div style={{ height: '100vh', background: '#070a10', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '12px' }}>
      <div style={{ fontSize: '36px', animation: 'spin 1s linear infinite' }}>⬡</div>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  if (!profile) return (
    <div style={{ height: '100vh', background: '#070a10', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '12px', color: '#eef2f7' }}>
      <div style={{ fontSize: '48px' }}>👤</div>
      <div style={{ fontSize: '16px', color: '#4a5568' }}>User not found</div>
      <button onClick={() => window.history.back()} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '10px 22px', color: '#8892a4', fontSize: '13px', cursor: 'pointer' }}>← Go Back</button>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#070a10', color: '#eef2f7', paddingBottom: '90px' }}>

      {/* ── TOP BAR ── */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, background: 'rgba(7,10,16,0.97)', borderBottom: '1px solid rgba(255,255,255,0.07)', zIndex: 100, height: '54px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px' }}>
        <button onClick={() => window.history.back()} style={{ background: 'none', border: 'none', color: '#8892a4', fontSize: '22px', cursor: 'pointer' }}>←</button>
        <div style={{ fontSize: '15px', fontWeight: '800' }}>{profile.full_name}</div>
        <button onClick={() => {
          if (navigator.share) navigator.share({ title: profile.full_name, url: window.location.href })
          else navigator.clipboard?.writeText(window.location.href).then(() => alert('Link copied!'))
        }} style={{ background: 'none', border: 'none', color: '#8892a4', fontSize: '20px', cursor: 'pointer' }}>↗</button>
      </div>

      <div style={{ paddingTop: '54px' }}>

        {/* ── COVER GRADIENT ── */}
        <div style={{ height: '100px', background: `linear-gradient(135deg, #0a1628, #001a2e, #0d1117)`, position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(circle at 30% 50%, rgba(0,229,255,0.15), transparent 60%), radial-gradient(circle at 70% 50%, rgba(0,255,136,0.1), transparent 60%)` }} />
          {/* Level badge on cover */}
          <div style={{ position: 'absolute', top: '12px', right: '12px', background: 'rgba(0,0,0,0.5)', borderRadius: '20px', padding: '4px 12px', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ fontSize: '14px' }}>{levelEmoji}</span>
            <span style={{ fontSize: '11px', fontWeight: '800', color: '#00e5ff' }}>Lv.{level} {levelName}</span>
          </div>
        </div>

        {/* ── AVATAR ── */}
        <div style={{ padding: '0 16px', marginTop: '-42px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div style={{ width: '84px', height: '84px', borderRadius: '50%', background: 'linear-gradient(135deg,#00e5ff,#00ff88)', padding: '3px', border: '3px solid #070a10', flexShrink: 0 }}>
            <div style={{ width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden', background: '#111620', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {profile.avatar_url
                ? <img src={profile.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <span style={{ fontSize: '28px', fontWeight: '900', color: '#00e5ff' }}>{(profile.full_name || 'E')[0]?.toUpperCase()}</span>
              }
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: '8px', paddingBottom: '4px' }}>
            <button onClick={handleMessage}
              style={{ padding: '9px 16px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '20px', color: '#eef2f7', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>
              💬 Message
            </button>
            <button onClick={handleSupport} disabled={supportLoading}
              style={{ padding: '9px 20px', background: isSupporting ? 'rgba(0,229,255,0.08)' : 'linear-gradient(135deg,#00e5ff,#00ff88)', border: isSupporting ? '2px solid rgba(0,229,255,0.3)' : 'none', borderRadius: '20px', color: isSupporting ? '#00e5ff' : '#070a10', fontSize: '13px', fontWeight: '800', cursor: 'pointer', opacity: supportLoading ? 0.6 : 1, minWidth: '100px' }}>
              {supportLoading ? '...' : isSupporting ? '✓ Supporting' : '+ Support'}
            </button>
          </div>
        </div>

        {/* ── NAME + BIO ── */}
        <div style={{ padding: '0 16px 12px' }}>
          <div style={{ fontSize: '20px', fontWeight: '800', marginBottom: '2px' }}>{profile.full_name}</div>
          <div style={{ fontSize: '13px', color: '#4a5568', marginBottom: '8px' }}>@{profile.username}</div>
          {profile.bio && <div style={{ fontSize: '13px', color: '#c0c8d8', lineHeight: '1.6', marginBottom: '8px' }}>{profile.bio}</div>}
          {profile.website && (
            <div onClick={() => window.open(profile.website, '_blank')} style={{ fontSize: '12px', color: '#00e5ff', cursor: 'pointer', marginBottom: '6px' }}>🌐 {profile.website}</div>
          )}

          {/* Mutual followers */}
          {mutualFollowers.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
              <div style={{ display: 'flex' }}>
                {mutualFollowers.map((m, i) => (
                  <div key={m.id} style={{ width: '20px', height: '20px', borderRadius: '50%', overflow: 'hidden', background: 'linear-gradient(135deg,#00e5ff,#00ff88)', border: '2px solid #070a10', marginLeft: i > 0 ? '-6px' : '0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: '800', color: '#070a10' }}>
                    {m.avatar_url ? <img src={m.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (m.full_name || 'E')[0]}
                  </div>
                ))}
              </div>
              <div style={{ fontSize: '11px', color: '#4a5568' }}>
                Followed by {mutualFollowers.map(m => m.username).join(', ')} {mutualFollowers.length < supporters ? '& others' : ''}
              </div>
            </div>
          )}
        </div>

        {/* ── XP BAR ── */}
        <div style={{ margin: '0 16px 14px', background: '#111620', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '14px', padding: '12px 14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <div style={{ fontSize: '13px', fontWeight: '700', color: '#8892a4' }}>{levelEmoji} {levelName}</div>
            <div style={{ fontSize: '13px', fontWeight: '800', color: '#00ff88' }}>⚡ {xp} XP</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '4px', height: '6px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg,#00e5ff,#00ff88)', borderRadius: '4px' }} />
          </div>
        </div>

        {/* ── STATS ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '8px', padding: '0 16px 14px' }}>
          {[
            { label: 'Posts', value: posts.length, icon: '📝' },
            { label: 'Supporters', value: supporters, icon: '👥' },
            { label: 'Supporting', value: supporting, icon: '💚' },
            { label: 'Likes', value: totalLikes, icon: '❤️' },
          ].map(s => (
            <div key={s.label} style={{ background: '#111620', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '10px 6px', textAlign: 'center' }}>
              <div style={{ fontSize: '16px', marginBottom: '3px' }}>{s.icon}</div>
              <div style={{ fontSize: '16px', fontWeight: '800' }}>{s.value}</div>
              <div style={{ fontSize: '9px', color: '#4a5568', marginTop: '1px' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* ── POST TABS ── */}
        <div style={{ padding: '0 16px' }}>
          <div style={{ display: 'flex', gap: '0', borderBottom: '1px solid rgba(255,255,255,0.06)', marginBottom: '10px', overflowX: 'auto', scrollbarWidth: 'none' }}>
            {[
              { key: 'all', label: '📋 All' },
              { key: 'photos', label: '📷 Photos' },
              { key: 'videos', label: '🎬 Videos' },
              { key: 'capsules', label: '📦 Capsules' },
            ].map(t => (
              <button key={t.key} onClick={() => setActiveTab(t.key)}
                style={{ padding: '8px 14px', border: 'none', background: 'transparent', color: activeTab === t.key ? '#00e5ff' : '#4a5568', borderBottom: activeTab === t.key ? '2px solid #00e5ff' : '2px solid transparent', fontSize: '12px', fontWeight: '700', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                {t.label}
              </button>
            ))}
          </div>

          {/* ── POST GRID ── */}
          {filteredPosts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <div style={{ fontSize: '40px', marginBottom: '10px' }}>📭</div>
              <div style={{ color: '#4a5568', fontSize: '14px' }}>No posts yet</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {filteredPosts.map(post => (
                <div key={post.id}
                  onClick={() => window.location.href = `/comments/${post.id}`}
                  style={{ background: '#111620', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '14px', overflow: 'hidden', cursor: 'pointer', position: 'relative', aspectRatio: '1' }}>

                  {post.media_url && post.media_type === 'photo' && (
                    <img src={post.media_url} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  )}
                  {post.media_url && post.media_type === 'video' && (
                    <video src={post.media_url} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} muted playsInline />
                  )}
                  {post.media_type === 'capsule' && (
                    <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg,rgba(255,202,40,0.08),rgba(255,165,0,0.04))', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '30px' }}>📦</span>
                      <span style={{ fontSize: '10px', color: '#ffca28', fontWeight: '600' }}>Capsule</span>
                    </div>
                  )}
                  {!post.media_url && post.media_type !== 'capsule' && (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px', boxSizing: 'border-box' }}>
                      <div style={{ fontSize: '12px', color: '#8892a4', lineHeight: '1.5', textAlign: 'center' }}>{post.content?.slice(0, 60)}{post.content?.length > 60 ? '...' : ''}</div>
                    </div>
                  )}

                  {/* Gradient overlay */}
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top,rgba(0,0,0,0.65) 0%,transparent 50%)', pointerEvents: 'none' }} />

                  {/* Video badge */}
                  {post.media_type === 'video' && (
                    <div style={{ position: 'absolute', top: '7px', right: '7px', background: 'rgba(0,0,0,0.6)', borderRadius: '6px', padding: '2px 6px', fontSize: '11px' }}>▶</div>
                  )}

                  {/* Remix badge */}
                  {post.remix_of && (
                    <div style={{ position: 'absolute', top: '7px', left: '7px', background: 'rgba(255,165,0,0.8)', borderRadius: '6px', padding: '2px 6px', fontSize: '10px', fontWeight: '700', color: '#fff' }}>🔀</div>
                  )}

                  {/* Likes + time */}
                  <div style={{ position: 'absolute', bottom: '6px', left: '8px', fontSize: '11px', color: '#fff', fontWeight: '700' }}>❤️ {post.likes_count || 0}</div>
                  <div style={{ position: 'absolute', bottom: '6px', right: '8px', fontSize: '9px', color: 'rgba(255,255,255,0.45)' }}>{timeAgo(post.created_at)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── BOTTOM NAV ── */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'rgba(7,10,16,0.98)', borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'space-around', padding: '10px 0 20px', zIndex: 100 }}>
        {[
          { icon: '🏠', label: 'Home', path: '/feed' },
          { icon: '🗺', label: 'Map', path: '/map' },
          { icon: '📸', label: 'Post', path: '/post' },
          { icon: '🏆', label: 'Rank', path: '/leaderboard' },
          { icon: '👤', label: 'Profile', path: '/profile' },
        ].map(item => (
          <div key={item.label} onClick={() => window.location.href = item.path}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', cursor: 'pointer', color: '#4a5568' }}>
            <span style={{ fontSize: '22px' }}>{item.icon}</span>
            <span style={{ fontSize: '10px', fontWeight: '600' }}>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
    }
