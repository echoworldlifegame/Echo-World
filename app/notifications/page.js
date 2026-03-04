'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default function Notifications() {
  const [user, setUser] = useState(null)
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [supported, setSupported] = useState({})

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { window.location.href = '/'; return }
      const u = data.session.user
      setUser(u)
      await loadNotifications(u.id)
      await markAllRead(u.id)
    })
  }, [])

  const loadNotifications = async (userId) => {
    const { data } = await supabase
      .from('notifications')
      .select('*, from_profile:profiles!notifications_from_user_id_fkey(id, username, full_name, avatar_url)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(100)

    setNotifications(data || [])

    // Load following state for all senders
    const senderIds = [...new Set((data || []).map(n => n.from_user_id).filter(Boolean))]
    if (senderIds.length > 0) {
      const { data: following } = await supabase
        .from('followers')
        .select('following_id')
        .eq('follower_id', userId)
        .in('following_id', senderIds)
      const map = {}
      ;(following || []).forEach(f => { map[f.following_id] = true })
      setSupported(map)
    }

    setLoading(false)
  }

  const markAllRead = async (userId) => {
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false)
  }

  const handleSupport = async (fromUserId) => {
    if (!user || !fromUserId) return
    if (supported[fromUserId]) {
      await supabase.from('followers').delete().eq('follower_id', user.id).eq('following_id', fromUserId)
      setSupported(p => ({ ...p, [fromUserId]: false }))
    } else {
      await supabase.from('followers').upsert({ follower_id: user.id, following_id: fromUserId })
      setSupported(p => ({ ...p, [fromUserId]: true }))
      await supabase.from('notifications').insert({
        user_id: fromUserId, from_user_id: user.id, type: 'follow'
      })
    }
  }

  const handleNotifTap = (notif) => {
    if (notif.post_id) window.location.href = `/comments/${notif.post_id}`
    else if (notif.from_user_id) window.location.href = `/user/${notif.from_user_id}`
  }

  const handleDeleteNotif = async (notifId) => {
    await supabase.from('notifications').delete().eq('id', notifId)
    setNotifications(prev => prev.filter(n => n.id !== notifId))
  }

  const handleClearAll = async () => {
    if (!user) return
    await supabase.from('notifications').delete().eq('user_id', user.id)
    setNotifications([])
  }

  const timeAgo = (date) => {
    const s = Math.floor((new Date() - new Date(date)) / 1000)
    if (s < 60) return 'এইমাত্র'
    if (s < 3600) return Math.floor(s / 60) + ' মিনিট আগে'
    if (s < 86400) return Math.floor(s / 3600) + ' ঘন্টা আগে'
    if (s < 604800) return Math.floor(s / 86400) + ' দিন আগে'
    return new Date(date).toLocaleDateString('bn-BD')
  }

  const getNotifIcon = (type) => {
    const icons = {
      like: '❤️', comment: '💬', follow: '👥', reply: '↩️',
      mention: '📣', remix: '🔀', capsule: '📦', system: '📢',
    }
    return icons[type] || '🔔'
  }

  const getNotifColor = (type) => {
    const colors = {
      like: '#ff4560', comment: '#00e5ff', follow: '#00ff88',
      reply: '#ffa500', mention: '#ffca28', remix: '#ffa500',
      capsule: '#ffca28', system: '#8892a4',
    }
    return colors[type] || '#4a5568'
  }

  const getNotifText = (notif) => {
    const name = notif.from_profile?.full_name || notif.from_profile?.username || 'Someone'
    switch (notif.type) {
      case 'like': return `${name} liked your post`
      case 'comment': return `${name} commented on your post`
      case 'follow': return `${name} started supporting you`
      case 'reply': return `${name} replied to your comment`
      case 'mention': return `${name} mentioned you`
      case 'remix': return `${name} remixed your video`
      case 'capsule': return `${name} found your capsule!`
      case 'system': return notif.message || 'System notification'
      default: return notif.message || 'New notification'
    }
  }

  const filteredNotifs = notifications.filter(n => {
    if (filter === 'all') return true
    if (filter === 'likes') return n.type === 'like'
    if (filter === 'comments') return ['comment', 'reply'].includes(n.type)
    if (filter === 'social') return ['follow', 'mention'].includes(n.type)
    if (filter === 'echo') return ['remix', 'capsule'].includes(n.type)
    return true
  })

  // Group by date
  const grouped = {}
  filteredNotifs.forEach(n => {
    const d = new Date(n.created_at)
    const now = new Date()
    let key
    const diffDays = Math.floor((now - d) / 86400000)
    if (diffDays === 0) key = 'Today'
    else if (diffDays === 1) key = 'Yesterday'
    else if (diffDays < 7) key = 'This Week'
    else key = 'Older'
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(n)
  })

  const groupOrder = ['Today', 'Yesterday', 'This Week', 'Older']

  if (loading) return (
    <div style={{ height: '100vh', background: '#070a10', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontSize: '32px', animation: 'spin 1s linear infinite' }}>🔔</div>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#070a10', color: '#eef2f7', paddingBottom: '90px' }}>

      {/* ── TOP BAR ── */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, background: 'rgba(7,10,16,0.97)', borderBottom: '1px solid rgba(255,255,255,0.07)', zIndex: 100 }}>
        <div style={{ height: '54px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px' }}>
          <button onClick={() => window.history.back()} style={{ background: 'none', border: 'none', color: '#8892a4', fontSize: '22px', cursor: 'pointer' }}>←</button>
          <div style={{ fontSize: '15px', fontWeight: '800' }}>🔔 Notifications</div>
          {notifications.length > 0
            ? <button onClick={handleClearAll} style={{ background: 'none', border: 'none', color: '#ff4560', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>Clear All</button>
            : <div style={{ width: '60px' }} />
          }
        </div>

        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: '6px', padding: '0 12px 10px', overflowX: 'auto', scrollbarWidth: 'none' }}>
          {[
            { key: 'all', label: '🔔 All' },
            { key: 'likes', label: '❤️ Likes' },
            { key: 'comments', label: '💬 Comments' },
            { key: 'social', label: '👥 Social' },
            { key: 'echo', label: '⚡ ECHO' },
          ].map(t => (
            <button key={t.key} onClick={() => setFilter(t.key)}
              style={{ padding: '6px 14px', borderRadius: '20px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: '700', whiteSpace: 'nowrap', flexShrink: 0, background: filter === t.key ? 'linear-gradient(135deg,#00e5ff,#00ff88)' : 'rgba(255,255,255,0.06)', color: filter === t.key ? '#070a10' : '#4a5568' }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ paddingTop: '104px' }}>
        {filteredNotifs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 20px' }}>
            <div style={{ fontSize: '56px', marginBottom: '16px' }}>🔔</div>
            <div style={{ fontSize: '18px', fontWeight: '700', marginBottom: '8px' }}>No notifications</div>
            <div style={{ fontSize: '13px', color: '#4a5568' }}>When someone likes or comments, it'll show here.</div>
          </div>
        ) : (
          groupOrder.map(group => {
            if (!grouped[group]?.length) return null
            return (
              <div key={group}>
                <div style={{ padding: '12px 16px 6px', fontSize: '11px', fontWeight: '800', color: '#4a5568', letterSpacing: '1px' }}>
                  {group.toUpperCase()}
                </div>
                {grouped[group].map((notif, idx) => (
                  <div key={notif.id}
                    style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', background: notif.read ? 'transparent' : 'rgba(0,229,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.04)', cursor: 'pointer', position: 'relative' }}
                    onClick={() => handleNotifTap(notif)}>

                    {/* Unread dot */}
                    {!notif.read && (
                      <div style={{ position: 'absolute', left: '6px', top: '50%', transform: 'translateY(-50%)', width: '5px', height: '5px', borderRadius: '50%', background: '#00e5ff' }} />
                    )}

                    {/* Avatar + type icon */}
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                      <div style={{ width: '46px', height: '46px', borderRadius: '50%', background: 'linear-gradient(135deg,#00e5ff,#00ff88)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid rgba(0,229,255,0.15)' }}>
                        {notif.from_profile?.avatar_url
                          ? <img src={notif.from_profile.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : <span style={{ fontSize: '17px', fontWeight: '800', color: '#070a10' }}>
                              {notif.type === 'system' ? '📢' : (notif.from_profile?.full_name || 'E')[0]?.toUpperCase()}
                            </span>
                        }
                      </div>
                      <div style={{ position: 'absolute', bottom: '-2px', right: '-2px', width: '20px', height: '20px', borderRadius: '50%', background: getNotifColor(notif.type), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', border: '2px solid #070a10' }}>
                        {getNotifIcon(notif.type)}
                      </div>
                    </div>

                    {/* Text */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '13px', color: '#eef2f7', lineHeight: '1.45', marginBottom: '2px' }}>
                        <span style={{ fontWeight: '700' }}>{notif.from_profile?.full_name || notif.from_profile?.username}</span>
                        {' '}
                        <span style={{ color: '#8892a4' }}>
                          {notif.type === 'like' && 'liked your post'}
                          {notif.type === 'comment' && 'commented on your post'}
                          {notif.type === 'follow' && 'started supporting you'}
                          {notif.type === 'reply' && 'replied to your comment'}
                          {notif.type === 'mention' && 'mentioned you'}
                          {notif.type === 'remix' && 'remixed your video 🔀'}
                          {notif.type === 'capsule' && 'found your capsule! 📦'}
                          {notif.type === 'system' && (notif.message || '')}
                        </span>
                      </div>
                      <div style={{ fontSize: '11px', color: '#2a3040' }}>{timeAgo(notif.created_at)}</div>
                    </div>

                    {/* Follow back button */}
                    {notif.type === 'follow' && notif.from_user_id && (
                      <button onClick={e => { e.stopPropagation(); handleSupport(notif.from_user_id) }}
                        style={{ padding: '6px 14px', borderRadius: '20px', border: `1px solid ${supported[notif.from_user_id] ? 'rgba(0,229,255,0.3)' : 'rgba(255,255,255,0.15)'}`, background: supported[notif.from_user_id] ? 'rgba(0,229,255,0.08)' : 'rgba(255,255,255,0.04)', color: supported[notif.from_user_id] ? '#00e5ff' : '#8892a4', fontSize: '11px', fontWeight: '700', cursor: 'pointer', flexShrink: 0 }}>
                        {supported[notif.from_user_id] ? '✓ Supporting' : 'Support'}
                      </button>
                    )}

                    {/* Delete button */}
                    <button onClick={e => { e.stopPropagation(); handleDeleteNotif(notif.id) }}
                      style={{ background: 'none', border: 'none', color: '#2a3040', fontSize: '16px', cursor: 'pointer', padding: '4px', flexShrink: 0 }}>
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )
          })
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
