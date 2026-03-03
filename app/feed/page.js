'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default function Feed() {
  const [user, setUser] = useState(null)
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState('all')
  const [liked, setLiked] = useState({})
  const [supported, setSupported] = useState({})
  const [notifCount, setNotifCount] = useState(0)
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [installed, setInstalled] = useState(false)
  const [stories, setStories] = useState([])
  const [userPos, setUserPos] = useState(null)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const videoRefs = useRef({})
  const observerRef = useRef(null)
  const visibilityTimers = useRef({})
  const postStartTimes = useRef({})

  // ─── Get user location ───────────────────────────────
  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      (pos) => setUserPos([pos.coords.latitude, pos.coords.longitude]),
      () => {}
    )
  }, [])

  // ─── Auth + initial load ─────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { window.location.href = '/'; return }
      const u = data.session.user
      setUser(u)
      await loadAlgorithmFeed(u.id, 0, false)
      loadStories()
      loadNotifCount(u.id)
    })

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
    })
    window.addEventListener('appinstalled', () => {
      setInstalled(true)
      setDeferredPrompt(null)
    })
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setInstalled(true)
    }
  }, [])

  // ─── Video auto-play observer ─────────────────────────
  useEffect(() => {
    observerRef.current = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const video = entry.target
        const postId = video.dataset.postId
        if (entry.isIntersecting && entry.intersectionRatio >= 0.7) {
          video.play().catch(() => {})
          // Start visibility timer for interaction tracking
          if (postId) {
            postStartTimes.current[postId] = Date.now()
            visibilityTimers.current[postId] = setTimeout(() => {
              trackInteraction(postId, 'view')
            }, 1000)
          }
        } else {
          video.pause()
          if (postId) {
            clearTimeout(visibilityTimers.current[postId])
            const dur = postStartTimes.current[postId]
              ? Date.now() - postStartTimes.current[postId]
              : 0
            if (dur > 5000) trackInteraction(postId, 'long_view', dur)
            delete postStartTimes.current[postId]
          }
        }
      })
    }, { threshold: 0.7 })

    Object.values(videoRefs.current).forEach(v => {
      if (v) observerRef.current.observe(v)
    })
    return () => observerRef.current?.disconnect()
  }, [posts])

  // ─── Intersection observer for post visibility ────────
  useEffect(() => {
    const postObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const postId = entry.target.dataset.postId
        if (!postId) return
        if (entry.isIntersecting) {
          postStartTimes.current[postId] = postStartTimes.current[postId] || Date.now()
          visibilityTimers.current[postId] = visibilityTimers.current[postId] || setTimeout(() => {
            trackInteraction(postId, 'view')
          }, 1000)
        } else {
          clearTimeout(visibilityTimers.current[postId])
          delete visibilityTimers.current[postId]
          const dur = postStartTimes.current[postId]
            ? Date.now() - postStartTimes.current[postId]
            : 0
          if (dur > 5000) trackInteraction(postId, 'long_view', dur)
          delete postStartTimes.current[postId]
        }
      })
    }, { threshold: 0.5 })

    document.querySelectorAll('[data-post-id]').forEach(el => {
      if (el.tagName !== 'VIDEO') postObserver.observe(el)
    })
    return () => postObserver.disconnect()
  }, [posts])

  // ─── Track interaction with algorithm ─────────────────
  const trackInteraction = useCallback(async (postId, type, durationMs = 0) => {
    try {
      await fetch('/api/algorithm/interact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId, type, durationMs, source: 'feed' })
      })
    } catch (e) {}
  }, [])

  // ─── Load algorithm feed ──────────────────────────────
  const loadAlgorithmFeed = async (userId, pageNum = 0, append = false) => {
    if (pageNum === 0) setLoading(true)
    try {
      const params = new URLSearchParams({
        userId,
        limit: 20,
        offset: pageNum * 20,
        ...(userPos && { lat: userPos[0], lng: userPos[1] }),
        ...(pageNum === 0 && { forceRefresh: 'true' })
      })
      const res = await fetch(`/api/algorithm/feed?${params}`)
      const data = await res.json()

      if (data.posts) {
        const newPosts = data.posts

        // Load liked states
        const { data: myLikes } = await supabase
          .from('likes').select('post_id').eq('user_id', userId)
        const likedMap = {}
        ;(myLikes || []).forEach(l => { likedMap[l.post_id] = true })
        setLiked(likedMap)

        // Load following states
        const { data: following } = await supabase
          .from('followers').select('following_id').eq('follower_id', userId)
        const supportedMap = {}
        ;(following || []).forEach(f => { supportedMap[f.following_id] = true })
        setSupported(supportedMap)

        if (append) {
          setPosts(prev => [...prev, ...newPosts])
        } else {
          setPosts(newPosts)
        }
        setHasMore(newPosts.length === 20)
      }
    } catch (e) {
      // Fallback to simple load
      await loadDataFallback(userId)
    }
    setLoading(false)
    setRefreshing(false)
  }

  // ─── Fallback data load (if algorithm API fails) ──────
  const loadDataFallback = async (userId) => {
    const { data: following } = await supabase
      .from('followers').select('following_id').eq('follower_id', userId)
    const followingIds = (following || []).map(f => f.following_id)

    const { data } = await supabase
      .from('posts')
      .select('*, profiles(id, username, full_name, avatar_url)')
      .order('created_at', { ascending: false })
      .limit(50)

    if (!data) return

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
  }

  const loadStories = async () => {
    const now = new Date().toISOString()
    const { data: st } = await supabase
      .from('stories')
      .select('*, profiles(id, username, full_name, avatar_url)')
      .gt('expires_at', now)
      .order('created_at', { ascending: false })

    const groups = {}
    ;(st || []).forEach(s => {
      if (!groups[s.user_id]) groups[s.user_id] = { user: s.profiles, count: 0 }
      groups[s.user_id].count++
    })
    setStories(Object.values(groups))
  }

  const loadNotifCount = async (userId) => {
    const { count } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('read', false)
    setNotifCount(count || 0)
  }

  // ─── Pull to refresh ──────────────────────────────────
  const handleRefresh = async () => {
    if (!user || refreshing) return
    setRefreshing(true)
    setPage(0)
    await loadAlgorithmFeed(user.id, 0, false)
  }

  // ─── Load more (infinite scroll) ─────────────────────
  const loadMore = async () => {
    if (!user || !hasMore || loading) return
    const nextPage = page + 1
    setPage(nextPage)
    await loadAlgorithmFeed(user.id, nextPage, true)
  }

  // ─── PWA install ─────────────────────────────────────
  const handleInstall = async () => {
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt()
        const { outcome } = await deferredPrompt.userChoice
        if (outcome === 'accepted') setInstalled(true)
        setDeferredPrompt(null)
      } catch (e) {}
      return
    }
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent)
    if (isIOS) {
      alert('iOS তে Install করতে:\n\n১. নিচে Share বাটনে চাপো\n২. "Add to Home Screen" সিলেক্ট করো\n৩. "Add" চাপো')
      return
    }
    if (installed) { alert('App already installed!'); return }
    alert('Chrome ব্যবহার করুন।')
  }

  // ─── Like ────────────────────────────────────────────
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
      trackInteraction(post.id, 'like')
      if (post.user_id !== user.id) {
        await supabase.from('notifications').insert({
          user_id: post.user_id, from_user_id: user.id, type: 'like', post_id: post.id
        })
      }
    }
  }

  // ─── Support ─────────────────────────────────────────
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

      {/* ── TOP BAR ── */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, background: 'rgba(7,10,16,0.97)', borderBottom: '1px solid rgba(255,255,255,0.07)', zIndex: 100 }}>
        <div style={{ padding: '0 12px', height: '54px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ fontSize: '16px', fontWeight: '900', background: 'linear-gradient(90deg,#00e5ff,#00ff88)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', flexShrink: 0 }}>ECHO⬡WORLD</div>
          <div onClick={() => window.location.href = '/search'}
            style={{ flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '22px', padding: '9px 14px', color: '#4a5568', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
            <span style={{ fontSize: '14px', flexShrink: 0 }}>🔍</span>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Search people, posts...</span>
          </div>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <button onClick={() => window.location.href = '/notifications'}
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '16px' }}>
              🔔
            </button>
            {notifCount > 0 && (
              <div style={{ position: 'absolute', top: '-3px', right: '-3px', background: '#ff4560', borderRadius: '50%', width: '15px', height: '15px', fontSize: '8px', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                {notifCount > 9 ? '9+' : notifCount}
              </div>
            )}
          </div>
          <button onClick={handleInstall} title={installed ? 'Installed' : 'Install App'}
            style={{ background: installed ? 'rgba(0,255,136,0.1)' : 'linear-gradient(135deg,#00ff88,#00e5ff)', border: installed ? '1px solid rgba(0,255,136,0.3)' : '2px solid rgba(0,255,136,0.6)', borderRadius: '10px', width: '42px', height: '36px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, gap: '1px' }}>
            <span style={{ fontSize: '12px', lineHeight: 1 }}>{installed ? '✓' : '📲'}</span>
            <span style={{ fontSize: '7px', fontWeight: '900', color: installed ? '#00ff88' : '#070a10', lineHeight: 1 }}>APP</span>
          </button>
          <button onClick={() => window.location.href = '/settings'}
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '16px', flexShrink: 0 }}>
            ⚙️
          </button>
        </div>

        {/* Filter tabs */}
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
          {/* Algorithm indicator */}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px', background: 'rgba(0,229,255,0.06)', borderRadius: '20px', border: '1px solid rgba(0,229,255,0.15)', flexShrink: 0 }}>
            <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#00e5ff', animation: 'pulse 2s infinite' }} />
            <span style={{ fontSize: '9px', color: '#00e5ff', fontWeight: '700' }}>AI FEED</span>
          </div>
        </div>
      </div>

      {/* ── BOTTOM NAV ── */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'rgba(7,10,16,0.98)', borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'space-around', padding: '10px 0 20px', zIndex: 100 }}>
        {[
          { icon: '🏠', label: 'Home', path: '/feed' },
          { icon: '🗺', label: 'Map', path: '/map' },
          { icon: '📸', label: 'Post', path: '/post' },
          { icon: '🏆', label: 'Rank', path: '/leaderboard' },
          { icon: '👤', label: 'Profile', path: '/profile' }
        ].map(item => (
          <div key={item.label} onClick={() => window.location.href = item.path}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', cursor: 'pointer', color: item.path === '/feed' ? '#00e5ff' : '#4a5568' }}>
            <span style={{ fontSize: '22px' }}>{item.icon}</span>
            <span style={{ fontSize: '10px', fontWeight: '600' }}>{item.label}</span>
          </div>
        ))}
      </div>

      {/* ── MAIN CONTENT ── */}
      <div style={{ padding: '110px 0 90px', maxWidth: '600px', margin: '0 auto' }}>

        {/* Pull to refresh button */}
        <div style={{ padding: '0 12px 10px', display: 'flex', justifyContent: 'center' }}>
          <button onClick={handleRefresh} disabled={refreshing}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 16px', background: 'rgba(0,229,255,0.06)', border: '1px solid rgba(0,229,255,0.15)', borderRadius: '20px', color: '#00e5ff', fontSize: '11px', fontWeight: '700', cursor: 'pointer', opacity: refreshing ? 0.6 : 1 }}>
            <span style={{ display: 'inline-block', animation: refreshing ? 'spin 1s linear infinite' : 'none' }}>🔄</span>
            {refreshing ? 'Refreshing...' : 'Refresh Feed'}
          </button>
        </div>

        {/* ── STORIES BAR ── */}
        <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', padding: '0 12px 14px', scrollbarWidth: 'none' }}>
          <div onClick={() => window.location.href = '/stories'}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px', cursor: 'pointer', flexShrink: 0 }}>
            <div style={{ width: '62px', height: '62px', borderRadius: '50%', background: 'rgba(255,255,255,0.04)', border: '2px dashed rgba(0,229,255,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px' }}>+</div>
            <div style={{ fontSize: '9px', color: '#4a5568', fontWeight: '600' }}>Add Story</div>
          </div>
          {stories.map((s, i) => (
            <div key={i} onClick={() => window.location.href = '/stories'}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px', cursor: 'pointer', flexShrink: 0 }}>
              <div style={{ width: '62px', height: '62px', borderRadius: '50%', padding: '2px', background: 'linear-gradient(135deg,#00e5ff,#00ff88,#ffa500)', boxShadow: '0 0 14px rgba(0,229,255,0.35)' }}>
                <div style={{ width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden', background: '#111620', border: '2px solid #070a10', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {s.user?.avatar_url
                    ? <img src={s.user.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <span style={{ fontSize: '22px', fontWeight: '900', color: '#00e5ff' }}>{(s.user?.full_name || s.user?.username || 'E')[0].toUpperCase()}</span>
                  }
                </div>
              </div>
              <div style={{ fontSize: '9px', color: '#8892a4', fontWeight: '600', maxWidth: '62px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'center' }}>
                {s.user?.username}
              </div>
            </div>
          ))}
        </div>

        {/* ── POST COMPOSER SHORTCUT ── */}
        <div onClick={() => window.location.href = '/post'}
          style={{ background: '#111620', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', padding: '12px 14px', margin: '0 12px 14px', display: 'flex', gap: '10px', alignItems: 'center', cursor: 'pointer' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg,#00e5ff,#00ff88)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '18px' }}>🧭</div>
          <div style={{ flex: 1, background: '#0c1018', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '30px', padding: '10px 16px', color: '#4a5568', fontSize: '13px' }}>Share something at your location...</div>
        </div>

        {/* ── POSTS ── */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#4a5568' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px', animation: 'spin 1s linear infinite' }}>⬡</div>
            <div style={{ fontSize: '12px', color: '#4a5568', marginTop: '8px' }}>AI algorithm loading your personalized feed...</div>
            <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
          </div>
        ) : filteredPosts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🗺</div>
            <div style={{ color: '#8892a4', fontSize: '16px', marginBottom: '16px' }}>No posts yet</div>
            <button onClick={() => window.location.href = '/post'} style={{ background: 'linear-gradient(135deg,#00e5ff,#00ff88)', border: 'none', borderRadius: '12px', padding: '12px 28px', fontSize: '14px', fontWeight: '700', color: '#070a10', cursor: 'pointer' }}>Create First Post</button>
          </div>
        ) : filteredPosts.map((post, idx) => (
          <div key={post.id} data-post-id={post.id}
            style={{ background: '#111620', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', margin: '0 12px 14px', overflow: 'hidden' }}>

            {/* Algorithm score badge (debug — optional remove) */}
            {post.score && (
              <div style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(0,229,255,0.1)', border: '1px solid rgba(0,229,255,0.2)', borderRadius: '8px', padding: '2px 6px', fontSize: '9px', color: '#00e5ff', fontWeight: '700', zIndex: 10 }}>
                ⚡ {Math.round(post.score)}
              </div>
            )}

            {/* Post header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px 8px', position: 'relative' }}>
              <div onClick={() => post.profiles?.id && (window.location.href = `/user/${post.profiles.id}`)}
                style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'linear-gradient(135deg,#00e5ff,#00ff88)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden', cursor: 'pointer', border: '2px solid rgba(0,229,255,0.2)' }}>
                {post.profiles?.avatar_url
                  ? <img src={post.profiles.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <span style={{ fontSize: '16px', fontWeight: '800', color: '#070a10' }}>{getName(post)[0]?.toUpperCase()}</span>
                }
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div onClick={() => post.profiles?.id && (window.location.href = `/user/${post.profiles.id}`)}
                    style={{ fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}>{getName(post)}</div>
                  {/* Creator tier badge */}
                  {post.profiles?.creator_tier === 'new' && (
                    <span style={{ fontSize: '9px', background: 'rgba(0,255,136,0.1)', color: '#00ff88', border: '1px solid rgba(0,255,136,0.3)', borderRadius: '6px', padding: '1px 5px', fontWeight: '700' }}>NEW</span>
                  )}
                  {post.profiles?.creator_tier === 'rising' && (
                    <span style={{ fontSize: '9px', background: 'rgba(255,202,40,0.1)', color: '#ffca28', border: '1px solid rgba(255,202,40,0.3)', borderRadius: '6px', padding: '1px 5px', fontWeight: '700' }}>📈</span>
                  )}
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
              <div style={{ fontSize: '12px', color: '#2a3040', flexShrink: 0 }}>
                {post.privacy === 'private' ? '🔒' : post.privacy === 'friends' ? '👥' : '🌍'}
              </div>
            </div>

            {/* Media */}
            {post.media_url && post.media_type === 'photo' && (
              <img src={post.media_url} style={{ width: '100%', maxHeight: '450px', objectFit: 'cover', display: 'block' }} />
            )}
            {post.media_url && post.media_type === 'video' && (
              <video
                ref={el => { if (el) { videoRefs.current[post.id] = el; observerRef.current?.observe(el) } }}
                data-post-id={post.id}
                src={post.media_url} playsInline muted loop controls
                onTimeUpdate={(e) => {
                  const pct = e.target.currentTime / e.target.duration
                  if (pct > 0.8) trackInteraction(post.id, 'completion', 0)
                }}
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

            {/* Remix badge */}
            {post.remix_of && (
              <div style={{ margin: '4px 14px 0', display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(255,165,0,0.1)', borderRadius: '8px', padding: '3px 8px', fontSize: '11px', color: '#ffa500' }}>
                🔀 ECHO MIX
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
              <button onClick={() => { trackInteraction(post.id, 'comment'); window.location.href = `/comments/${post.id}` }}
                style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '8px 12px', border: 'none', background: 'none', cursor: 'pointer', color: '#4a5568', fontSize: '13px', borderRadius: '8px' }}>
                💬 {post.comments_count || 0}
              </button>
              <button onClick={() => { trackInteraction(post.id, 'share'); navigator.share?.({ text: post.content || '', url: `${window.location.origin}/comments/${post.id}` }) }}
                style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '8px 12px', border: 'none', background: 'none', cursor: 'pointer', color: '#4a5568', fontSize: '13px', borderRadius: '8px' }}>
                ↗ Share
              </button>
              {post.media_type === 'video' && (
                <button onClick={() => { trackInteraction(post.id, 'remix'); window.location.href = '/echo' }}
                  style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '8px 10px', border: 'none', background: 'rgba(255,165,0,0.08)', borderRadius: '8px', cursor: 'pointer', color: '#ffa500', fontSize: '12px', fontWeight: '600' }}>
                  🔀 MIX
                </button>
              )}
              <button onClick={() => window.location.href = '/map'}
                style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '4px', padding: '8px 10px', border: 'none', background: 'none', cursor: 'pointer', color: '#00e5ff', fontSize: '12px' }}>
                🗺 Map
              </button>
            </div>
          </div>
        ))}

        {/* Load more */}
        {!loading && hasMore && filteredPosts.length > 0 && (
          <div style={{ textAlign: 'center', padding: '16px' }}>
            <button onClick={loadMore}
              style={{ padding: '10px 28px', background: 'rgba(0,229,255,0.08)', border: '1px solid rgba(0,229,255,0.2)', borderRadius: '20px', color: '#00e5ff', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>
              Load More
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes pulse {
          0%,100%{opacity:1;transform:scale(1)}
          50%{opacity:0.5;transform:scale(1.3)}
        }
      `}</style>
    </div>
  )
}
