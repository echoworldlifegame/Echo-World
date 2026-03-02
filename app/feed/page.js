'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default function Feed() {
  const [user, setUser] = useState(null)
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('all')
  const [liked, setLiked] = useState({})
  const [supported, setSupported] = useState({})
  const [notifCount, setNotifCount] = useState(0)
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [installed, setInstalled] = useState(false)
  const videoRefs = useRef({})
  const observerRef = useRef(null)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { window.location.href = '/'; return }
      const u = data.session.user
      setUser(u)
      await loadData(u.id)
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', u.id)
        .eq('read', false)
      setNotifCount(count || 0)
    })

    // PWA install prompt
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
    })

    window.addEventListener('appinstalled', () => {
      setInstalled(true)
      setDeferredPrompt(null)
    })

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setInstalled(true)
    }
  }, [])

  useEffect(() => {
    observerRef.current = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const video = entry.target
        if (entry.isIntersecting && entry.intersectionRatio >= 0.7) {
          video.play().catch(() => {})
        } else {
          video.pause()
        }
      })
    }, { threshold: 0.7 })

    Object.values(videoRefs.current).forEach(v => {
      if (v) observerRef.current.observe(v)
    })
    return () => observerRef.current?.disconnect()
  }, [posts])

  const loadData = async (userId) => {
    const { data: following } = await supabase
      .from('followers').select('following_id').eq('follower_id', userId)
    const followingIds = (following || []).map(f => f.following_id)

    const { data } = await supabase
      .from('posts')
      .select('*, profiles(id, username, full_name, avatar_url)')
      .order('created_at', { ascending: false })
      .limit(50)

    if (!data) { setLoading(false); return }

    const sorted = [...data].sort((a, b) => {
      const aF = followingIds.includes(a.user_id)
      const bF = followingIds.includes(b.user_id)
      if (aF && !bF) return -1
      if (!aF && bF) return 1
      return new Date(b.created_at) - new Date(a.created_at)
    })
    setPosts(sorted)

    const { data: myLikes } = await supabase
      .from('likes').select('post_id').eq('user_id', userId)
    const likedMap = {}
    ;(myLikes || []).forEach(l => { likedMap[l.post_id] = true })
    setLiked(likedMap)

    const supportedMap = {}
    followingIds.forEach(id => { supportedMap[id] = true })
    setSupported(supportedMap)

    setLoading(false)
  }

  const handleInstall = async () => {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') setInstalled(true)
    setDeferredPrompt(null)
  }

  const handleLike = async (post) => {
    if (!user) return
    if (liked[post.id]) {
      await supabase.from('likes').delete().eq('user_id', user.id).eq('post_id', post.id)
      setLiked(p => ({ ...p, [post.id]: false }))
      setPosts(ps => ps.map(p => p.id === post.id ? { ...p, likes_count: Math.max((p.likes_count || 1) - 1, 0) } : p))
    } else {
      await supabase.from('likes').upsert({ user_id: user.id, post_id: post.id })
      setLiked(p => ({ ...p, [post.id]: true }))
      setPosts(ps => ps.map(p => p.id === post.id ? { ...p, likes_count: (p.likes_count || 0) + 1 } : p))
      if (post.user_id !== user.id) {
        await supabase.from('notifications').insert({
          user_id: post.user_id, from_user_id: user.id, type: 'like', post_id: post.id
        })
      }
    }
  }

  const handleSupport = async (profileId) => {
    if (!user || profileId === user.id) return
    if (supported[profileId]) {
      await supabase.from('followers').delete().eq('follower_id', user.id).eq('following_id', profileId)
      setSupported(p => ({ ...p, [profileId]: false }))
    } else {
      await supabase.from('followers').upsert({ follower_id: user.id, following_id: profileId })
      setSupported(p => ({ ...p, [profileId]: true }))
      await supabase.from('notifications').insert({
        user_id: profileId, from_user_id: user.id, type: 'follow'
      })
    }
  }

  const timeAgo = (date) => {
    const s = Math.floor((new Date() - new Date(date)) / 1000)
    if (s < 60) return 'এইমাত্র'
    if (s < 3600) return Math.floor(s / 60) + ' মিনিট আগে'
    if (s < 86400) return Math.floor(s / 3600) + ' ঘন্টা আগে'
    return Math.floor(s / 86400) + ' দিন আগে'
  }

  const getName = p => p.profiles?.full_name || p.profiles?.username || 'Explorer'
  const getUsername = p => p.profiles?.username || 'explorer'

  const filteredPosts = posts.filter(p => {
    if (activeTab === 'photos') return p.media_type === 'photo'
    if (activeTab === 'capsules') return p.media_type === 'capsule'
    return true
  })

  return (
    <div style={{ minHeight: '100vh', background: '#070a10', color: '#eef2f7' }}>

      {/* TOP BAR */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, background: 'rgba(7,10,16,0.97)', borderBottom: '1px solid rgba(255,255,255,0.07)', zIndex: 100 }}>

        {/* ROW 1: Logo + Search + Notif + Install + Settings */}
        <div style={{ padding: '0 12px', height: '54px', display: 'flex', alignItems: 'center', gap: '8px' }}>

          {/* Logo */}
          <div style={{ fontSize: '17px', fontWeight: '900', background: 'linear-gradient(90deg,#00e5ff,#00ff88)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', flexShrink: 0 }}>ECHO⬡WORLD</div>

          {/* Search bar — লম্বা */}
          <div onClick={() => window.location.href = '/search'}
            style={{ flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '22px', padding: '8px 14px', color: '#4a5568', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
            <span style={{ fontSize: '14px', flexShrink: 0 }}>🔍</span>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Search people, posts...</span>
          </div>

          {/* Notification */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <button onClick={() => window.location.href = '/notifications'}
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '16px' }}>
              🔔
            </button>
            {notifCount > 0 && (
              <div style={{ position: 'absolute', top: '-3px', right: '-3px', background: '#ff4560', borderRadius: '50%', width: '15px', height: '15px', fontSize: '8px', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>{notifCount > 9 ? '9+' : notifCount}</div>
            )}
          </div>

          {/* Install App button — সবসময় দেখাবে, installed হলে disabled */}
          <button
            onClick={handleInstall}
            disabled={installed || !deferredPrompt}
            title={installed ? 'Already installed' : 'Install App'}
            style={{
              background: installed ? 'rgba(0,255,136,0.08)' : deferredPrompt ? 'linear-gradient(135deg,#00e5ff,#00ff88)' : 'rgba(255,255,255,0.05)',
              border: installed ? '1px solid rgba(0,255,136,0.2)' : deferredPrompt ? 'none' : '1px solid rgba(255,255,255,0.1)',
              borderRadius: '50%', width: '36px', height: '36px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: installed || !deferredPrompt ? 'default' : 'pointer',
              fontSize: '16px', flexShrink: 0,
              opacity: !deferredPrompt && !installed ? 0.4 : 1,
            }}>
            {installed ? '✓' : 'APP'}
          </button>

          {/* Settings */}
          <button onClick={() => window.location.href = '/settings'}
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '16px', flexShrink: 0 }}>
            ⚙️
          </button>
        </div>

        {/* TABS */}
        <div style={{ display: 'flex', gap: '6px', padding: '0 12px 10px', overflowX: 'auto', scrollbarWidth: 'none' }}>
          {[
            { key: 'all', label: '🌍 All' },
            { key: 'echo', label: '⚡ ECHO', direct: '/echo' },
            { key: 'photos', label: '📷 Photos' },
            { key: 'capsules', label: '📦 Capsules' },
          ].map(t => (
            <button key={t.key} onClick={() => t.direct ? window.location.href = t.direct : setActiveTab(t.key)}
              style={{ padding: '6px 14px', borderRadius: '20px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: '700', whiteSpace: 'nowrap', flexShrink: 0, background: activeTab === t.key && !t.direct ? 'linear-gradient(135deg,#00e5ff,#00ff88)' : 'rgba(255,255,255,0.07)', color: activeTab === t.key && !t.direct ? '#070a10' : '#8892a4' }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* BOTTOM NAV */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'rgba(7,10,16,0.98)', borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'space-around', padding: '10px 0 20px', zIndex: 100 }}>
        {[{ icon: '🏠', label: 'Home', path: '/feed' }, { icon: '🗺', label: 'Map', path: '/map' }, { icon: '📸', label: 'Post', path: '/post' }, { icon: '🏆', label: 'Rank', path: '/leaderboard' }, { icon: '👤', label: 'Profile', path: '/profile' }].map(item => (
          <div key={item.label} onClick={() => window.location.href = item.path} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', cursor: 'pointer', color: item.path === '/feed' ? '#00e5ff' : '#4a5568' }}>
            <span style={{ fontSize: '22px' }}>{item.icon}</span>
            <span style={{ fontSize: '10px', fontWeight: '600' }}>{item.label}</span>
          </div>
        ))}
      </div>

      {/* CONTENT */}
      <div style={{ padding: '110px 0 90px', maxWidth: '600px', margin: '0 auto' }}>

        {/* Create post bar */}
        <div onClick={() => window.location.href = '/post'}
          style={{ background: '#111620', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', padding: '12px 14px', margin: '0 12px 14px', display: 'flex', gap: '10px', alignItems: 'center', cursor: 'pointer' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg,#00e5ff,#00ff88)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '18px' }}>🧭</div>
          <div style={{ flex: 1, background: '#0c1018', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '30px', padding: '10px 16px', color: '#4a5568', fontSize: '13px' }}>Share something at your location...</div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#4a5568' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px', animation: 'spin 1s linear infinite' }}>⬡</div>
            <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
          </div>
        ) : filteredPosts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🗺</div>
            <div style={{ color: '#8892a4', fontSize: '16px', marginBottom: '16px' }}>No posts yet</div>
            <button onClick={() => window.location.href = '/post'} style={{ background: 'linear-gradient(135deg,#00e5ff,#00ff88)', border: 'none', borderRadius: '12px', padding: '12px 28px', fontSize: '14px', fontWeight: '700', color: '#070a10', cursor: 'pointer' }}>Create First Post</button>
          </div>
        ) : filteredPosts.map(post => (
          <div key={post.id} style={{ background: '#111620', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', margin: '0 12px 14px', overflow: 'hidden' }}>

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px 8px' }}>
              <div onClick={() => post.profiles?.id && (window.location.href = `/user/${post.profiles.id}`)}
                style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'linear-gradient(135deg,#00e5ff,#00ff88)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden', cursor: 'pointer', border: '2px solid rgba(0,229,255,0.2)' }}>
                {post.profiles?.avatar_url
                  ? <img src={post.profiles.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <span style={{ fontSize: '16px', fontWeight: '800', color: '#070a10' }}>{getName(post)[0]?.toUpperCase()}</span>
                }
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div onClick={() => post.profiles?.id && (window.location.href = `/user/${post.profiles.id}`)} style={{ fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}>{getName(post)}</div>
                  {user?.id !== post.user_id && (
                    <button onClick={() => handleSupport(post.profiles?.id)}
                      style={{ padding: '2px 10px', borderRadius: '12px', border: `1px solid ${supported[post.profiles?.id] ? 'rgba(0,229,255,0.3)' : 'rgba(255,255,255,0.15)'}`, background: supported[post.profiles?.id] ? 'rgba(0,229,255,0.08)' : 'transparent', color: supported[post.profiles?.id] ? '#00e5ff' : '#4a5568', fontSize: '10px', fontWeight: '600', cursor: 'pointer' }}>
                      {supported[post.profiles?.id] ? '✓ Supporting' : '+ Support'}
                    </button>
                  )}
                </div>
                <div style={{ fontSize: '11px', color: '#4a5568' }}>@{getUsername(post)} · {timeAgo(post.created_at)}</div>
                {post.location_name && <div style={{ fontSize: '11px', color: '#00e5ff' }}>📍 {post.location_name}</div>}
              </div>
              <div style={{ fontSize: '12px', color: '#2a3040', flexShrink: 0 }}>{post.privacy === 'private' ? '🔒' : post.privacy === 'friends' ? '👥' : '🌍'}</div>
            </div>

            {/* Media */}
            {post.media_url && post.media_type === 'photo' && (
              <img src={post.media_url} style={{ width: '100%', maxHeight: '450px', objectFit: 'cover', display: 'block' }} />
            )}
            {post.media_url && post.media_type === 'video' && (
              <video
                ref={el => { if (el) { videoRefs.current[post.id] = el; observerRef.current?.observe(el) } }}
                src={post.media_url} playsInline muted loop controls
                style={{ width: '100%', maxHeight: '450px', display: 'block', background: '#000' }} />
            )}
            {post.media_type === 'capsule' && (
              <div style={{ margin: '0 14px 8px', background: 'rgba(255,202,40,0.06)', border: '1px solid rgba(255,202,40,0.2)', borderRadius: '12px', padding: '16px', display: 'flex', gap: '12px', alignItems: 'center' }}>
                <span style={{ fontSize: '28px' }}>📦</span>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#ffca28' }}>🔒 Time Capsule</div>
                  <div style={{ fontSize: '11px', color: '#4a5568', marginTop: '2px' }}>Visit within 300m to unlock</div>
                </div>
              </div>
            )}

            {post.content && <div style={{ padding: '8px 14px', fontSize: '14px', color: '#c0c8d8', lineHeight: '1.6' }}>{post.content}</div>}
            {post.hashtags && <div style={{ padding: '0 14px 8px', fontSize: '12px', color: '#00e5ff' }}>{post.hashtags}</div>}

            {/* Actions */}
            <div style={{ display: 'flex', padding: '4px 6px 10px', borderTop: '1px solid rgba(255,255,255,0.04)', gap: '4px' }}>
              <button onClick={() => handleLike(post)}
                style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '8px 12px', border: 'none', background: 'none', cursor: 'pointer', color: liked[post.id] ? '#ff4560' : '#4a5568', fontSize: '13px', borderRadius: '8px', transition: 'all 0.2s', transform: liked[post.id] ? 'scale(1.1)' : 'scale(1)' }}>
                {liked[post.id] ? '❤️' : '🤍'} {post.likes_count || 0}
              </button>
              <button onClick={() => window.location.href = `/comments/${post.id}`}
                style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '8px 12px', border: 'none', background: 'none', cursor: 'pointer', color: '#4a5568', fontSize: '13px', borderRadius: '8px' }}>
                💬 {post.comments_count || 0}
              </button>
              <button onClick={() => navigator.share?.({ text: post.content || '', url: `${window.location.origin}/post/${post.id}` })}
                style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '8px 12px', border: 'none', background: 'none', cursor: 'pointer', color: '#4a5568', fontSize: '13px', borderRadius: '8px' }}>
                ↗ Share
              </button>
              <button onClick={() => window.location.href = '/map'}
                style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '4px', padding: '8px 10px', border: 'none', background: 'none', cursor: 'pointer', color: '#00e5ff', fontSize: '12px' }}>
                🗺 Map
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
        }
