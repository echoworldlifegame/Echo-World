'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const CLOUD_NAME = 'dbguxwpa8'
const UPLOAD_PRESET = 'echoworld_preset'

export default function Profile() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('all')
  const [statsTab, setStatsTab] = useState('Explorer')
  const [supporters, setSupporters] = useState(0)
  const [supporting, setSupporting] = useState(0)
  const [totalLikes, setTotalLikes] = useState(0)

  // Edit profile
  const [editMode, setEditMode] = useState(false)
  const [editName, setEditName] = useState('')
  const [editBio, setEditBio] = useState('')
  const [editUsername, setEditUsername] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editWebsite, setEditWebsite] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)

  // Avatar upload
  const [avatarUploading, setAvatarUploading] = useState(false)
  const avatarInputRef = useRef(null)

  // Post delete — long press only
  const [deleteTarget, setDeleteTarget] = useState(null)
  const longPressTimer = useRef(null)

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
  const getNextXP = (xp = 0) => {
    const lvl = getLevel(xp)
    return levelThresholds[lvl] || levelThresholds[levelThresholds.length - 1]
  }
  const getPrevXP = (xp = 0) => {
    const lvl = getLevel(xp)
    return levelThresholds[lvl - 1] || 0
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { window.location.href = '/'; return }
      const u = data.session.user
      setUser(u)
      await loadProfile(u.id)
    })
  }, [])

  const loadProfile = async (userId) => {
    const [
      { data: p },
      { data: myPosts },
      { count: suppCount },
      { count: suppingCount },
    ] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).single(),
      supabase.from('posts').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      supabase.from('followers').select('*', { count: 'exact', head: true }).eq('following_id', userId),
      supabase.from('followers').select('*', { count: 'exact', head: true }).eq('follower_id', userId),
    ])

    setProfile(p)
    setPosts(myPosts || [])
    setSupporters(suppCount || 0)
    setSupporting(suppingCount || 0)

    // Total likes on my posts
    const likeSum = (myPosts || []).reduce((sum, post) => sum + (post.likes_count || 0), 0)
    setTotalLikes(likeSum)

    if (p) {
      setEditName(p.full_name || '')
      setEditBio(p.bio || '')
      setEditUsername(p.username || '')
      setEditPhone(p.phone || '')
      setEditWebsite(p.website || '')
    }

    setLoading(false)
  }

  // ─── Avatar upload ────────────────────────────────────
  const handleAvatarChange = async (e) => {
    const file = e.target.files[0]
    if (!file || !user) return
    setAvatarUploading(true)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('upload_preset', UPLOAD_PRESET)
    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method: 'POST', body: formData })
    const data = await res.json()
    if (data.secure_url) {
      await supabase.from('profiles').update({ avatar_url: data.secure_url }).eq('id', user.id)
      setProfile(p => ({ ...p, avatar_url: data.secure_url }))
    }
    setAvatarUploading(false)
  }

  // ─── Save profile ─────────────────────────────────────
  const saveProfile = async () => {
    if (!user || savingProfile) return
    setSavingProfile(true)
    // Check username uniqueness
    if (editUsername !== profile?.username) {
      const { data: existing } = await supabase.from('profiles').select('id').eq('username', editUsername).neq('id', user.id).single()
      if (existing) { alert('Username already taken!'); setSavingProfile(false); return }
    }
    await supabase.from('profiles').update({
      full_name: editName,
      bio: editBio,
      username: editUsername.toLowerCase(),
      phone: editPhone,
      website: editWebsite,
    }).eq('id', user.id)
    setProfile(p => ({ ...p, full_name: editName, bio: editBio, username: editUsername, phone: editPhone, website: editWebsite }))
    setSavingProfile(false)
    setEditMode(false)
  }

  // ─── Post tap → go to comments ─────────────────────────
  const longPressTriggered = useRef(false)

  const handlePostTap = (postId) => {
    if (longPressTriggered.current) {
      longPressTriggered.current = false
      return
    }
    window.location.href = `/comments/${postId}`
  }

  // ─── Long press → show delete ─────────────────────────
  const handleLongPressStart = (post) => {
    longPressTriggered.current = false
    longPressTimer.current = setTimeout(() => {
      longPressTriggered.current = true
      setDeleteTarget(post)
    }, 550)
  }

  const handleLongPressEnd = () => {
    clearTimeout(longPressTimer.current)
  }

  // ─── Delete post ──────────────────────────────────────
  const confirmDelete = async () => {
    if (!deleteTarget) return
    await supabase.from('posts').delete().eq('id', deleteTarget.id).eq('user_id', user.id)
    setPosts(ps => ps.filter(p => p.id !== deleteTarget.id))
    setDeleteTarget(null)
  }

  // ─── Logout ───────────────────────────────────────────
  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  const filteredPosts = posts.filter(p => {
    if (activeTab === 'photos') return p.media_type === 'photo'
    if (activeTab === 'videos') return p.media_type === 'video'
    if (activeTab === 'capsules') return p.media_type === 'capsule'
    return true
  })

  const xp = profile?.xp || 0
  const level = getLevel(xp)
  const levelName = getLevelName(xp)
  const levelEmoji = getLevelEmoji(xp)
  const nextXP = getNextXP(xp)
  const prevXP = getPrevXP(xp)
  const progress = Math.min(((xp - prevXP) / (nextXP - prevXP)) * 100, 100)

  const timeAgo = (date) => {
    const s = Math.floor((new Date() - new Date(date)) / 1000)
    if (s < 60) return 'এইমাত্র'
    if (s < 3600) return Math.floor(s / 60) + ' মিনিট আগে'
    if (s < 86400) return Math.floor(s / 3600) + ' ঘন্টা আগে'
    return Math.floor(s / 86400) + ' দিন আগে'
  }

  if (loading) return (
    <div style={{ height: '100vh', background: '#070a10', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '12px' }}>
      <div style={{ fontSize: '36px', animation: 'spin 1s linear infinite' }}>⬡</div>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#070a10', color: '#eef2f7', paddingBottom: '90px' }}>

      {/* ── TOP BAR ── */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, background: 'rgba(7,10,16,0.97)', borderBottom: '1px solid rgba(255,255,255,0.07)', zIndex: 100, height: '54px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px' }}>
        <button onClick={() => window.history.back()} style={{ background: 'none', border: 'none', color: '#8892a4', fontSize: '22px', cursor: 'pointer' }}>←</button>
        <div style={{ fontSize: '15px', fontWeight: '800' }}>{profile?.full_name || 'Profile'}</div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => window.location.href = '/notifications'} style={{ background: 'none', border: 'none', color: '#8892a4', fontSize: '20px', cursor: 'pointer' }}>🔔</button>
          <button onClick={handleLogout} style={{ background: 'rgba(255,69,96,0.08)', border: '1px solid rgba(255,69,96,0.2)', borderRadius: '20px', padding: '5px 12px', color: '#ff4560', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>Logout</button>
        </div>
      </div>

      <div style={{ paddingTop: '54px' }}>

        {/* ── AVATAR + NAME ── */}
        <div style={{ padding: '20px 16px 0', display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <div style={{ width: '82px', height: '82px', borderRadius: '50%', background: 'linear-gradient(135deg,#00e5ff,#00ff88)', padding: '3px', cursor: 'pointer' }} onClick={() => !editMode && avatarInputRef.current?.click()}>
              <div style={{ width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden', background: '#111620', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {avatarUploading
                  ? <span style={{ fontSize: '22px', animation: 'spin 1s linear infinite' }}>⏳</span>
                  : profile?.avatar_url
                    ? <img src={profile.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <span style={{ fontSize: '28px', fontWeight: '900', color: '#00e5ff' }}>{(profile?.full_name || 'E')[0]?.toUpperCase()}</span>
                }
              </div>
            </div>
            {/* Camera icon */}
            <div onClick={() => avatarInputRef.current?.click()} style={{ position: 'absolute', bottom: '0', right: '0', width: '26px', height: '26px', borderRadius: '50%', background: '#00e5ff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '2px solid #070a10', fontSize: '13px' }}>📷</div>
            <input ref={avatarInputRef} type="file" accept="image/*" onChange={handleAvatarChange} style={{ display: 'none' }} />
          </div>

          <div style={{ flex: 1 }}>
            {editMode ? (
              <input value={editName} onChange={e => setEditName(e.target.value)}
                style={{ width: '100%', background: '#111620', border: '1px solid rgba(0,229,255,0.3)', borderRadius: '8px', padding: '6px 10px', color: '#eef2f7', fontSize: '16px', fontWeight: '700', outline: 'none', boxSizing: 'border-box', marginBottom: '4px' }} />
            ) : (
              <div style={{ fontSize: '20px', fontWeight: '800', marginBottom: '2px' }}>{profile?.full_name}</div>
            )}
            <div style={{ fontSize: '13px', color: '#4a5568', marginBottom: '4px' }}>@{profile?.username}</div>
            {/* Level badge */}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: 'rgba(0,229,255,0.08)', border: '1px solid rgba(0,229,255,0.2)', borderRadius: '20px', padding: '3px 10px' }}>
              <span style={{ fontSize: '14px' }}>{levelEmoji}</span>
              <span style={{ fontSize: '11px', fontWeight: '800', color: '#00e5ff' }}>Level {level} · {levelName}</span>
            </div>
          </div>

          {/* Edit / Save button */}
          {!editMode ? (
            <button onClick={() => setEditMode(true)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '8px 14px', color: '#8892a4', fontSize: '12px', fontWeight: '700', cursor: 'pointer', flexShrink: 0 }}>✏️ Edit</button>
          ) : (
            <button onClick={saveProfile} disabled={savingProfile} style={{ background: 'linear-gradient(135deg,#00e5ff,#00ff88)', border: 'none', borderRadius: '10px', padding: '8px 14px', color: '#070a10', fontSize: '12px', fontWeight: '800', cursor: 'pointer', flexShrink: 0 }}>
              {savingProfile ? '...' : '✓ Save'}
            </button>
          )}
        </div>

        {/* ── EDIT FIELDS ── */}
        {editMode && (
          <div style={{ padding: '14px 16px 0' }}>
            {[
              { label: '👤 Username', value: editUsername, setter: setEditUsername, placeholder: 'username' },
              { label: '📝 Bio', value: editBio, setter: setEditBio, placeholder: 'Tell your story...' },
              { label: '📱 Phone', value: editPhone, setter: setEditPhone, placeholder: '01XXXXXXXXX' },
              { label: '🌐 Website', value: editWebsite, setter: setEditWebsite, placeholder: 'https://...' },
            ].map(f => (
              <div key={f.label} style={{ marginBottom: '10px' }}>
                <div style={{ fontSize: '11px', color: '#4a5568', fontWeight: '600', marginBottom: '4px' }}>{f.label}</div>
                <input value={f.value} onChange={e => f.setter(e.target.value)} placeholder={f.placeholder}
                  style={{ width: '100%', background: '#111620', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '8px', padding: '8px 10px', color: '#eef2f7', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
              </div>
            ))}
            <button onClick={() => setEditMode(false)} style={{ width: '100%', padding: '10px', background: 'transparent', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', color: '#4a5568', fontSize: '13px', cursor: 'pointer', marginBottom: '4px' }}>Cancel</button>
          </div>
        )}

        {/* ── BIO / INFO ── */}
        {!editMode && (
          <div style={{ padding: '12px 16px 0' }}>
            {profile?.bio && <div style={{ fontSize: '13px', color: '#c0c8d8', lineHeight: '1.6', marginBottom: '6px' }}>{profile.bio}</div>}
            {profile?.phone && <div style={{ fontSize: '12px', color: '#4a5568', marginBottom: '2px' }}>📱 {profile.phone}</div>}
            {profile?.website && <div style={{ fontSize: '12px', color: '#00e5ff', marginBottom: '2px', cursor: 'pointer' }} onClick={() => window.open(profile.website, '_blank')}>{profile.website}</div>}
          </div>
        )}

        {/* ── XP PROGRESS BAR ── */}
        <div style={{ margin: '14px 16px 0', background: '#111620', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', padding: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <div>
              <span style={{ fontSize: '11px', color: '#4a5568', fontWeight: '600', letterSpacing: '1px' }}>EXPLORER LEVEL</span>
              <div style={{ fontSize: '22px', fontWeight: '900', color: '#00e5ff' }}>Level {level} · {levelEmoji} {levelName}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '11px', color: '#4a5568', letterSpacing: '1px' }}>TOTAL XP</div>
              <div style={{ fontSize: '22px', fontWeight: '900', color: '#00ff88' }}>⚡ {xp}</div>
            </div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '6px', height: '8px', overflow: 'hidden', marginBottom: '4px' }}>
            <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg,#00e5ff,#00ff88)', borderRadius: '6px', transition: 'width 1s ease' }} />
          </div>
          <div style={{ fontSize: '11px', color: '#4a5568', textAlign: 'right' }}>{xp - prevXP}/{nextXP - prevXP} XP to Level {level + 1}</div>
        </div>

        {/* ── STATS TABS ── */}
        <div style={{ margin: '12px 16px 0' }}>
          <div style={{ display: 'flex', gap: '0', borderBottom: '1px solid rgba(255,255,255,0.06)', marginBottom: '10px', overflowX: 'auto', scrollbarWidth: 'none' }}>
            {['Explorer', 'Creator', 'Liked', 'Social'].map(t => (
              <button key={t} onClick={() => setStatsTab(t)} style={{ padding: '8px 14px', border: 'none', background: 'transparent', color: statsTab === t ? '#00e5ff' : '#4a5568', borderBottom: statsTab === t ? '2px solid #00e5ff' : '2px solid transparent', fontSize: '12px', fontWeight: '700', cursor: 'pointer', whiteSpace: 'nowrap' }}>{t}</button>
            ))}
          </div>

          {statsTab === 'Explorer' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {[
                { label: 'Zones Explored', value: profile?.zones_explored || 0, icon: '🗺' },
                { label: 'Capsules Dropped', value: posts.filter(p => p.media_type === 'capsule').length, icon: '📦' },
                { label: 'Total Distance', value: `${((profile?.total_distance || 0) / 1000).toFixed(1)}km`, icon: '📏' },
                { label: 'Streak Days', value: profile?.streak_days || 0, icon: '🔥' },
              ].map(s => (
                <div key={s.label} style={{ background: '#111620', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '12px', textAlign: 'center' }}>
                  <div style={{ fontSize: '22px', marginBottom: '4px' }}>{s.icon}</div>
                  <div style={{ fontSize: '18px', fontWeight: '800', color: '#eef2f7' }}>{s.value}</div>
                  <div style={{ fontSize: '10px', color: '#4a5568', marginTop: '2px' }}>{s.label}</div>
                </div>
              ))}
            </div>
          )}

          {statsTab === 'Creator' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {[
                { label: 'Total Posts', value: posts.length, icon: '📝' },
                { label: 'Total Likes', value: totalLikes, icon: '❤️' },
                { label: 'Videos', value: posts.filter(p => p.media_type === 'video').length, icon: '🎬' },
                { label: 'Photos', value: posts.filter(p => p.media_type === 'photo').length, icon: '📷' },
              ].map(s => (
                <div key={s.label} style={{ background: '#111620', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '12px', textAlign: 'center' }}>
                  <div style={{ fontSize: '22px', marginBottom: '4px' }}>{s.icon}</div>
                  <div style={{ fontSize: '18px', fontWeight: '800', color: '#eef2f7' }}>{s.value}</div>
                  <div style={{ fontSize: '10px', color: '#4a5568', marginTop: '2px' }}>{s.label}</div>
                </div>
              ))}
            </div>
          )}

          {statsTab === 'Liked' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
              {posts.filter(p => p.likes_count > 0).sort((a, b) => b.likes_count - a.likes_count).slice(0, 6).map(p => (
                <div key={p.id} onClick={() => handlePostTap(p.id)} style={{ aspectRatio: '1', borderRadius: '10px', overflow: 'hidden', background: '#111620', cursor: 'pointer', position: 'relative' }}>
                  {p.media_url && p.media_type === 'photo' && <img src={p.media_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                  {p.media_url && p.media_type === 'video' && <video src={p.media_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted playsInline />}
                  {!p.media_url && <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: '#4a5568', padding: '6px', textAlign: 'center' }}>{p.content?.slice(0, 30)}</div>}
                  <div style={{ position: 'absolute', bottom: '4px', left: '4px', background: 'rgba(0,0,0,0.75)', borderRadius: '6px', padding: '2px 6px', fontSize: '10px', color: '#ff4560', fontWeight: '700' }}>❤️ {p.likes_count}</div>
                </div>
              ))}
              {posts.filter(p => p.likes_count > 0).length === 0 && <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '24px', color: '#4a5568', fontSize: '13px' }}>No liked posts yet</div>}
            </div>
          )}

          {statsTab === 'Social' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '8px' }}>
              {[
                { label: 'Posts', value: posts.length, icon: '📝', path: null },
                { label: 'Supporters', value: supporters, icon: '👥', path: '/supporters' },
                { label: 'Supporting', value: supporting, icon: '💚', path: '/supporting' },
                { label: 'Likes', value: totalLikes, icon: '❤️', path: null },
              ].map(s => (
                <div key={s.label} onClick={() => s.path && (window.location.href = s.path)} style={{ background: '#111620', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '10px 6px', textAlign: 'center', cursor: s.path ? 'pointer' : 'default' }}>
                  <div style={{ fontSize: '18px', marginBottom: '3px' }}>{s.icon}</div>
                  <div style={{ fontSize: '16px', fontWeight: '800' }}>{s.value}</div>
                  <div style={{ fontSize: '9px', color: '#4a5568', marginTop: '2px' }}>{s.label}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── QUICK ACTIONS ── */}
        <div style={{ display: 'flex', gap: '8px', padding: '14px 16px 0', overflowX: 'auto', scrollbarWidth: 'none' }}>
          {[
      { icon: '💎', label: 'Invest', path: '/invest' },
      { icon: '📸', label: 'New Post', path: '/post' },
      { icon: '🗺', label: 'My Map', path: '/map' },
      { icon: '👥', label: 'Community', path: '/community' },
      { icon: '💬', label: 'Messages', path: '/dm' },
      { icon: '🏆', label: 'Leaderboard', path: '/leaderboard' },
      { icon: '⚙️', label: 'Settings', path: '/settings' },
          ].map(a => (
            <button key={a.label} onClick={() => window.location.href = a.path}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', padding: '10px 14px', background: '#111620', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', cursor: 'pointer', flexShrink: 0 }}>
              <span style={{ fontSize: '20px' }}>{a.icon}</span>
              <span style={{ fontSize: '10px', color: '#8892a4', fontWeight: '600' }}>{a.label}</span>
            </button>
          ))}
        </div>

        {/* ── POST GRID ── */}
        <div style={{ padding: '14px 16px 0' }}>
          <div style={{ display: 'flex', gap: '0', borderBottom: '1px solid rgba(255,255,255,0.06)', marginBottom: '10px', overflowX: 'auto', scrollbarWidth: 'none' }}>
            {[
              { key: 'all', label: '📋 All' },
              { key: 'photos', label: '📷 Photos' },
              { key: 'videos', label: '🎬 Videos' },
              { key: 'capsules', label: '📦 Capsules' },
            ].map(t => (
              <button key={t.key} onClick={() => setActiveTab(t.key)} style={{ padding: '8px 14px', border: 'none', background: 'transparent', color: activeTab === t.key ? '#00e5ff' : '#4a5568', borderBottom: activeTab === t.key ? '2px solid #00e5ff' : '2px solid transparent', fontSize: '12px', fontWeight: '700', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                {t.label}
              </button>
            ))}
          </div>

          {/* Long press hint */}
          <div style={{ fontSize: '10px', color: '#2a3040', marginBottom: '8px', textAlign: 'center' }}>
            Tap to view · Long press to delete
          </div>

          {filteredPosts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <div style={{ fontSize: '40px', marginBottom: '10px' }}>📭</div>
              <div style={{ color: '#4a5568', fontSize: '14px', marginBottom: '14px' }}>No posts yet</div>
              <button onClick={() => window.location.href = '/post'} style={{ background: 'linear-gradient(135deg,#00e5ff,#00ff88)', border: 'none', borderRadius: '12px', padding: '10px 24px', fontSize: '14px', fontWeight: '700', color: '#070a10', cursor: 'pointer' }}>Create First Post</button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {filteredPosts.map(post => (
                <div
                  key={post.id}
                  onTouchStart={() => handleLongPressStart(post)}
                  onTouchEnd={(e) => { handleLongPressEnd(); }}
                  onMouseDown={() => handleLongPressStart(post)}
                  onMouseUp={handleLongPressEnd}
                  onMouseLeave={handleLongPressEnd}
                  onClick={() => { if (!deleteTarget) handlePostTap(post.id) }}
                  style={{ background: '#111620', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '14px', overflow: 'hidden', cursor: 'pointer', position: 'relative', aspectRatio: '1' }}>

                  {/* Media */}
                  {post.media_url && post.media_type === 'photo' && (
                    <img src={post.media_url} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  )}
                  {post.media_url && post.media_type === 'video' && (
                    <video src={post.media_url} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} muted playsInline />
                  )}
                  {post.media_type === 'capsule' && (
                    <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg,rgba(255,202,40,0.1),rgba(255,165,0,0.05))', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '32px' }}>📦</span>
                      <span style={{ fontSize: '10px', color: '#ffca28', fontWeight: '600' }}>Capsule</span>
                    </div>
                  )}
                  {!post.media_url && post.media_type !== 'capsule' && (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px', boxSizing: 'border-box' }}>
                      <div style={{ fontSize: '12px', color: '#8892a4', lineHeight: '1.5', textAlign: 'center' }}>{post.content?.slice(0, 60)}{post.content?.length > 60 ? '...' : ''}</div>
                    </div>
                  )}

                  {/* Overlay gradient */}
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top,rgba(0,0,0,0.7) 0%,transparent 50%)', pointerEvents: 'none' }} />

                  {/* Video icon */}
                  {post.media_type === 'video' && <div style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(0,0,0,0.6)', borderRadius: '6px', padding: '3px 6px', fontSize: '11px' }}>▶</div>}

                  {/* Likes */}
                  <div style={{ position: 'absolute', bottom: '6px', left: '8px', fontSize: '11px', color: '#fff', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '3px' }}>
                    ❤️ {post.likes_count || 0}
                  </div>

                  {/* Time */}
                  <div style={{ position: 'absolute', bottom: '6px', right: '8px', fontSize: '9px', color: 'rgba(255,255,255,0.5)' }}>
                    {timeAgo(post.created_at)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── DELETE CONFIRM MODAL (long press only) ── */}
      {deleteTarget && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 500, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '20px' }} onClick={() => setDeleteTarget(null)}>
          <div style={{ background: '#1a2030', borderRadius: '20px', padding: '24px', width: '100%', maxWidth: '400px' }} onClick={e => e.stopPropagation()}>
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <div style={{ fontSize: '36px', marginBottom: '8px' }}>🗑️</div>
              <div style={{ fontSize: '18px', fontWeight: '800', marginBottom: '4px' }}>Delete Post?</div>
              <div style={{ fontSize: '13px', color: '#4a5568' }}>This cannot be undone.</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <button onClick={() => setDeleteTarget(null)} style={{ padding: '14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px', color: '#8892a4', fontSize: '15px', fontWeight: '700', cursor: 'pointer' }}>Cancel</button>
              <button onClick={confirmDelete} style={{ padding: '14px', background: 'linear-gradient(135deg,#ff4560,#c0392b)', border: 'none', borderRadius: '14px', color: '#fff', fontSize: '15px', fontWeight: '700', cursor: 'pointer' }}>🗑️ Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* ── BOTTOM NAV ── */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'rgba(7,10,16,0.98)', borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'space-around', padding: '10px 0 20px', zIndex: 100 }}>
        {[{ icon: '🏠', label: 'Home', path: '/feed' }, { icon: '🗺', label: 'Map', path: '/map' }, { icon: '📸', label: 'Post', path: '/post' }, { icon: '🏆', label: 'Rank', path: '/leaderboard' }, { icon: '👤', label: 'Profile', path: '/profile' }].map(item => (
          <div key={item.label} onClick={() => window.location.href = item.path} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', cursor: 'pointer', color: item.path === '/profile' ? '#00e5ff' : '#4a5568' }}>
            <span style={{ fontSize: '22px' }}>{item.icon}</span>
            <span style={{ fontSize: '10px', fontWeight: '600' }}>{item.label}</span>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
      `}</style>
    </div>
  )
    }
