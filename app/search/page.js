'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default function Search() {
  const [user, setUser] = useState(null)
  const [query, setQuery] = useState('')
  const [activeTab, setActiveTab] = useState('all')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState({ users: [], posts: [], hashtags: [] })
  const [trending, setTrending] = useState({ users: [], posts: [], hashtags: [] })
  const [supported, setSupported] = useState({})
  const [recentSearches, setRecentSearches] = useState([])
  const [userPos, setUserPos] = useState(null)
  const inputRef = useRef(null)
  const debounceRef = useRef(null)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { window.location.href = '/'; return }
      const u = data.session.user
      setUser(u)
      await loadTrending(u.id)
      loadRecentSearches()
    })

    navigator.geolocation?.getCurrentPosition(
      pos => setUserPos([pos.coords.latitude, pos.coords.longitude]),
      () => {}
    )

    // Auto focus
    setTimeout(() => inputRef.current?.focus(), 200)
  }, [])

  const loadRecentSearches = () => {
    try {
      const saved = localStorage.getItem('echo_recent_searches')
      setRecentSearches(saved ? JSON.parse(saved) : [])
    } catch { setRecentSearches([]) }
  }

  const saveRecentSearch = (q) => {
    try {
      const prev = JSON.parse(localStorage.getItem('echo_recent_searches') || '[]')
      const updated = [q, ...prev.filter(s => s !== q)].slice(0, 8)
      localStorage.setItem('echo_recent_searches', JSON.stringify(updated))
      setRecentSearches(updated)
    } catch {}
  }

  const clearRecentSearches = () => {
    localStorage.removeItem('echo_recent_searches')
    setRecentSearches([])
  }

  const loadTrending = async (userId) => {
    const [
      { data: trendUsers },
      { data: trendPosts },
      { data: following },
    ] = await Promise.all([
      supabase.from('profiles')
        .select('id, username, full_name, avatar_url, xp, bio')
        .order('xp', { ascending: false })
        .limit(10),
      supabase.from('posts')
        .select('*, profiles(id, username, full_name, avatar_url)')
        .order('likes_count', { ascending: false })
        .not('media_url', 'is', null)
        .limit(20),
      supabase.from('followers').select('following_id').eq('follower_id', userId),
    ])

    const supportedMap = {}
    ;(following || []).forEach(f => { supportedMap[f.following_id] = true })
    setSupported(supportedMap)

    // Extract trending hashtags from posts
    const hashtagMap = {}
    ;(trendPosts || []).forEach(p => {
      if (p.hashtags) {
        p.hashtags.split(/\s+/).filter(h => h.startsWith('#')).forEach(h => {
          hashtagMap[h] = (hashtagMap[h] || 0) + 1
        })
      }
    })
    const trendHashtags = Object.entries(hashtagMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([tag, count]) => ({ tag, count }))

    setTrending({
      users: (trendUsers || []).filter(u => u.id !== userId),
      posts: trendPosts || [],
      hashtags: trendHashtags,
    })
  }

  // ─── Search ───────────────────────────────────────────
  const doSearch = useCallback(async (q, userId) => {
    if (!q.trim()) { setResults({ users: [], posts: [], hashtags: [] }); return }
    setLoading(true)

    const searchTerm = q.trim()
    const isHashtag = searchTerm.startsWith('#')

    const [
      { data: users },
      { data: posts },
      { data: hashtagPosts },
      { data: following },
    ] = await Promise.all([
      isHashtag ? { data: [] } : supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url, xp, bio')
        .or(`username.ilike.%${searchTerm}%,full_name.ilike.%${searchTerm}%`)
        .neq('id', userId)
        .limit(20),

      isHashtag ? { data: [] } : supabase
        .from('posts')
        .select('*, profiles(id, username, full_name, avatar_url)')
        .or(`content.ilike.%${searchTerm}%,title.ilike.%${searchTerm}%`)
        .in('privacy', ['public'])
        .order('likes_count', { ascending: false })
        .limit(30),

      isHashtag ? supabase
        .from('posts')
        .select('*, profiles(id, username, full_name, avatar_url)')
        .ilike('hashtags', `%${searchTerm}%`)
        .in('privacy', ['public'])
        .order('likes_count', { ascending: false })
        .limit(30) : { data: [] },

      supabase.from('followers').select('following_id').eq('follower_id', userId),
    ])

    const supportedMap = {}
    ;(following || []).forEach(f => { supportedMap[f.following_id] = true })
    setSupported(supportedMap)

    // Extract hashtags from results
    const hashtagMap = {}
    const allPosts = [...(posts || []), ...(hashtagPosts || [])]
    allPosts.forEach(p => {
      if (p.hashtags) {
        p.hashtags.split(/\s+/).filter(h => h.startsWith('#') && h.toLowerCase().includes(searchTerm.replace('#', '').toLowerCase())).forEach(h => {
          hashtagMap[h] = (hashtagMap[h] || 0) + 1
        })
      }
    })
    const hashtags = Object.entries(hashtagMap).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([tag, count]) => ({ tag, count }))

    setResults({
      users: users || [],
      posts: isHashtag ? (hashtagPosts || []) : (posts || []),
      hashtags,
    })

    // Track search in algorithm
    try {
      await fetch('/api/algorithm/interact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'search', query: searchTerm, source: 'search' })
      })
    } catch {}

    setLoading(false)
  }, [])

  const handleQueryChange = (q) => {
    setQuery(q)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      if (user) doSearch(q, user.id)
    }, 350)
  }

  const handleSearchSubmit = (q) => {
    if (q.trim()) {
      saveRecentSearch(q.trim())
      if (user) doSearch(q, user.id)
    }
  }

  const handleSupport = async (profileId) => {
    if (!user) return
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

  const getLevelEmoji = (xp = 0) => {
    if (xp >= 6000) return '🌌'
    if (xp >= 3000) return '👑'
    if (xp >= 1500) return '💎'
    if (xp >= 700) return '🏆'
    if (xp >= 300) return '⚡'
    if (xp >= 100) return '🌟'
    return '🧭'
  }

  const timeAgo = (date) => {
    const s = Math.floor((new Date() - new Date(date)) / 1000)
    if (s < 3600) return Math.floor(s / 60) + 'মি'
    if (s < 86400) return Math.floor(s / 3600) + 'ঘ'
    return Math.floor(s / 86400) + 'দিন'
  }

  const isSearching = query.trim().length > 0
  const displayUsers = isSearching ? results.users : trending.users
  const displayPosts = isSearching ? results.posts : trending.posts
  const displayHashtags = isSearching ? results.hashtags : trending.hashtags

  const totalResults = results.users.length + results.posts.length

  // Filter by tab
  const getTabPosts = () => {
    if (activeTab === 'photos') return displayPosts.filter(p => p.media_type === 'photo')
    if (activeTab === 'videos') return displayPosts.filter(p => p.media_type === 'video')
    if (activeTab === 'capsules') return displayPosts.filter(p => p.media_type === 'capsule')
    return displayPosts
  }

  return (
    <div style={{ minHeight: '100vh', background: '#070a10', color: '#eef2f7', paddingBottom: '90px' }}>

      {/* ── TOP SEARCH BAR ── */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, background: 'rgba(7,10,16,0.97)', borderBottom: '1px solid rgba(255,255,255,0.07)', zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px' }}>
          <button onClick={() => window.history.back()} style={{ background: 'none', border: 'none', color: '#8892a4', fontSize: '22px', cursor: 'pointer', flexShrink: 0 }}>←</button>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', background: '#111620', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '22px', padding: '0 14px', gap: '8px' }}>
            <span style={{ fontSize: '16px', flexShrink: 0 }}>🔍</span>
            <input
              ref={inputRef}
              value={query}
              onChange={e => handleQueryChange(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearchSubmit(query)}
              placeholder="Search people, posts, #hashtags..."
              style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#eef2f7', fontSize: '14px', padding: '11px 0' }}
            />
            {query && (
              <button onClick={() => { setQuery(''); setResults({ users: [], posts: [], hashtags: [] }) }}
                style={{ background: 'none', border: 'none', color: '#4a5568', fontSize: '18px', cursor: 'pointer', flexShrink: 0, padding: '0' }}>✕</button>
            )}
          </div>
        </div>

        {/* Filter tabs — only when searching */}
        {isSearching && (
          <div style={{ display: 'flex', gap: '6px', padding: '0 12px 10px', overflowX: 'auto', scrollbarWidth: 'none' }}>
            {[
              { key: 'all', label: '🌍 All' },
              { key: 'people', label: '👤 People' },
              { key: 'photos', label: '📷 Photos' },
              { key: 'videos', label: '🎬 Videos' },
              { key: 'capsules', label: '📦 Capsules' },
              { key: 'hashtags', label: '# Tags' },
            ].map(t => (
              <button key={t.key} onClick={() => setActiveTab(t.key)}
                style={{ padding: '6px 14px', borderRadius: '20px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: '700', whiteSpace: 'nowrap', flexShrink: 0, background: activeTab === t.key ? 'linear-gradient(135deg,#00e5ff,#00ff88)' : 'rgba(255,255,255,0.06)', color: activeTab === t.key ? '#070a10' : '#4a5568' }}>
                {t.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div style={{ paddingTop: isSearching ? '108px' : '68px' }}>

        {/* ── LOADING ── */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div style={{ fontSize: '28px', animation: 'spin 0.8s linear infinite' }}>🔍</div>
            <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
          </div>
        )}

        {/* ── RECENT SEARCHES (no query) ── */}
        {!isSearching && recentSearches.length > 0 && (
          <div style={{ padding: '14px 16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <div style={{ fontSize: '12px', fontWeight: '800', color: '#4a5568', letterSpacing: '1px' }}>RECENT</div>
              <button onClick={clearRecentSearches} style={{ background: 'none', border: 'none', color: '#ff4560', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}>Clear</button>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px' }}>
              {recentSearches.map((s, i) => (
                <button key={i} onClick={() => { setQuery(s); handleQueryChange(s) }}
                  style={{ padding: '6px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', color: '#8892a4', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  🕐 {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── TRENDING HASHTAGS ── */}
        {displayHashtags.length > 0 && (activeTab === 'all' || activeTab === 'hashtags') && (
          <div style={{ padding: '14px 16px 0' }}>
            <div style={{ fontSize: '12px', fontWeight: '800', color: '#4a5568', letterSpacing: '1px', marginBottom: '10px' }}>
              {isSearching ? '# HASHTAGS' : '🔥 TRENDING TAGS'}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px', marginBottom: '4px' }}>
              {displayHashtags.map(({ tag, count }) => (
                <button key={tag} onClick={() => { setQuery(tag); handleQueryChange(tag) }}
                  style={{ padding: '7px 14px', background: 'rgba(0,229,255,0.06)', border: '1px solid rgba(0,229,255,0.15)', borderRadius: '20px', color: '#00e5ff', fontSize: '13px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  {tag} <span style={{ fontSize: '10px', color: '#4a5568' }}>{count}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── USERS / PEOPLE ── */}
        {displayUsers.length > 0 && (activeTab === 'all' || activeTab === 'people') && (
          <div style={{ padding: '14px 16px 0' }}>
            <div style={{ fontSize: '12px', fontWeight: '800', color: '#4a5568', letterSpacing: '1px', marginBottom: '10px' }}>
              {isSearching ? '👤 PEOPLE' : '🌟 TOP EXPLORERS'}
            </div>
            {displayUsers.map(u => (
              <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', cursor: 'pointer' }}
                onClick={() => window.location.href = `/user/${u.id}`}>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'linear-gradient(135deg,#00e5ff,#00ff88)', flexShrink: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid rgba(0,229,255,0.15)' }}>
                  {u.avatar_url
                    ? <img src={u.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <span style={{ fontSize: '18px', fontWeight: '800', color: '#070a10' }}>{(u.full_name || 'E')[0]?.toUpperCase()}</span>
                  }
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <span style={{ fontSize: '14px', fontWeight: '700' }}>{u.full_name}</span>
                    <span style={{ fontSize: '13px' }}>{getLevelEmoji(u.xp)}</span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#4a5568' }}>@{u.username}</div>
                  {u.bio && <div style={{ fontSize: '11px', color: '#4a5568', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '200px', marginTop: '1px' }}>{u.bio}</div>}
                </div>
                <button onClick={e => { e.stopPropagation(); handleSupport(u.id) }}
                  style={{ padding: '7px 16px', borderRadius: '20px', border: `1px solid ${supported[u.id] ? 'rgba(0,229,255,0.3)' : 'rgba(255,255,255,0.12)'}`, background: supported[u.id] ? 'rgba(0,229,255,0.08)' : 'rgba(255,255,255,0.04)', color: supported[u.id] ? '#00e5ff' : '#8892a4', fontSize: '12px', fontWeight: '700', cursor: 'pointer', flexShrink: 0 }}>
                  {supported[u.id] ? '✓' : '+ Support'}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ── POSTS GRID ── */}
        {getTabPosts().length > 0 && activeTab !== 'people' && activeTab !== 'hashtags' && (
          <div style={{ padding: '14px 16px 0' }}>
            <div style={{ fontSize: '12px', fontWeight: '800', color: '#4a5568', letterSpacing: '1px', marginBottom: '10px' }}>
              {isSearching ? `📋 POSTS (${getTabPosts().length})` : '🔥 TRENDING POSTS'}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '4px' }}>
              {getTabPosts().map(post => (
                <div key={post.id}
                  onClick={() => window.location.href = `/comments/${post.id}`}
                  style={{ aspectRatio: '1', borderRadius: '8px', overflow: 'hidden', background: '#111620', cursor: 'pointer', position: 'relative' }}>

                  {post.media_url && post.media_type === 'photo' && (
                    <img src={post.media_url} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  )}
                  {post.media_url && post.media_type === 'video' && (
                    <video src={post.media_url} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} muted playsInline />
                  )}
                  {post.media_type === 'capsule' && (
                    <div style={{ width: '100%', height: '100%', background: 'rgba(255,202,40,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px' }}>📦</div>
                  )}
                  {!post.media_url && post.media_type !== 'capsule' && (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px', boxSizing: 'border-box' }}>
                      <div style={{ fontSize: '10px', color: '#8892a4', textAlign: 'center', lineHeight: '1.4' }}>{post.content?.slice(0, 40)}</div>
                    </div>
                  )}

                  {/* Overlay */}
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top,rgba(0,0,0,0.6) 0%,transparent 50%)', pointerEvents: 'none' }} />

                  {/* Video badge */}
                  {post.media_type === 'video' && (
                    <div style={{ position: 'absolute', top: '5px', right: '5px', background: 'rgba(0,0,0,0.65)', borderRadius: '4px', padding: '2px 4px', fontSize: '10px' }}>▶</div>
                  )}

                  {/* Likes */}
                  <div style={{ position: 'absolute', bottom: '4px', left: '5px', fontSize: '10px', color: '#fff', fontWeight: '700' }}>❤️ {post.likes_count || 0}</div>

                  {/* Avatar */}
                  <div style={{ position: 'absolute', top: '5px', left: '5px', width: '22px', height: '22px', borderRadius: '50%', overflow: 'hidden', background: 'linear-gradient(135deg,#00e5ff,#00ff88)', border: '1px solid rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: '800', color: '#070a10' }}>
                    {post.profiles?.avatar_url
                      ? <img src={post.profiles.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : (post.profiles?.full_name || 'E')[0]?.toUpperCase()
                    }
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── NO RESULTS ── */}
        {isSearching && !loading && totalResults === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: '48px', marginBottom: '14px' }}>🔍</div>
            <div style={{ fontSize: '17px', fontWeight: '700', marginBottom: '8px' }}>No results for "{query}"</div>
            <div style={{ fontSize: '13px', color: '#4a5568', marginBottom: '20px' }}>Try different keywords or hashtags</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
              {trending.hashtags.slice(0, 4).map(({ tag }) => (
                <button key={tag} onClick={() => { setQuery(tag); handleQueryChange(tag) }}
                  style={{ padding: '7px 16px', background: 'rgba(0,229,255,0.06)', border: '1px solid rgba(0,229,255,0.15)', borderRadius: '20px', color: '#00e5ff', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>
                  {tag}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── EMPTY TRENDING ── */}
        {!isSearching && trending.users.length === 0 && trending.posts.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: '48px', marginBottom: '14px' }}>🔍</div>
            <div style={{ fontSize: '16px', color: '#4a5568' }}>Search for people, posts, or hashtags</div>
          </div>
        )}
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
