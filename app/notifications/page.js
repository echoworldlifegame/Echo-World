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
  const [activeTab, setActiveTab] = useState('all')

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { window.location.href = '/'; return }
      const u = data.session.user
      setUser(u)
      await loadNotifications(u.id)
      // Mark all as read
      await supabase.from('notifications').update({ read: true }).eq('user_id', u.id).eq('read', false)
    })
  }, [])

  const loadNotifications = async (uid) => {
    const { data } = await supabase
      .from('notifications')
      .select('*, profiles!notifications_from_user_id_fkey(id, username, full_name, avatar_url)')
      .eq('user_id', uid)
      .order('created_at', { ascending: false })
      .limit(100)
    setNotifications(data || [])
    setLoading(false)
  }

  const deleteNotif = async (id) => {
    await supabase.from('notifications').delete().eq('id', id)
    setNotifications(n => n.filter(x => x.id !== id))
  }

  const clearAll = async () => {
    if (!user) return
    await supabase.from('notifications').delete().eq('user_id', user.id)
    setNotifications([])
  }

  const getIcon = (type) => {
    const icons = {
      follow: '👥',
      like: '❤️',
      comment: '💬',
      mention: '📢',
      remix: '🔀',
      announcement: '📣',
      reward: '🎁',
      level_up: '⚡',
      badge: '🏅',
    }
    return icons[type] || '🔔'
  }

  const getColor = (type) => {
    const colors = {
      follow: '#00e5ff',
      like: '#ff4560',
      comment: '#00ff88',
      mention: '#ffca28',
      remix: '#ffa500',
      announcement: '#9c27b0',
      reward: '#ffca28',
      level_up: '#00e5ff',
      badge: '#ffa500',
    }
    return colors[type] || '#4a5568'
  }

  const getMessage = (notif) => {
    const name = notif.profiles?.full_name || notif.profiles?.username || 'Someone'
    switch (notif.type) {
      case 'follow': return `${name} started supporting you`
      case 'like': return `${name} liked your post`
      case 'comment': return `${name} commented: "${notif.message?.slice(0, 50)}"`
      case 'mention': return `${name} mentioned you`
      case 'remix': return `${name} remixed your ECHO`
      case 'announcement': return notif.message || 'New announcement'
      case 'reward': return notif.message || 'You earned a reward!'
      case 'level_up': return notif.message || 'You leveled up!'
      case 'badge': return notif.message || 'You earned a badge!'
      default: return notif.message || 'New notification'
    }
  }

  const handleClick = (notif) => {
    if (notif.type === 'follow' && notif.from_user_id) {
      window.location.href = `/user/${notif.from_user_id}`
    } else if (notif.post_id && (notif.type === 'like' || notif.type === 'comment' || notif.type === 'remix')) {
      window.location.href = `/comments/${notif.post_id}`
    } else if (notif.type === 'announcement') {
      // stay
    }
  }

  const timeAgo = (date) => {
    const s = Math.floor((new Date() - new Date(date)) / 1000)
    if (s < 60) return 'এইমাত্র'
    if (s < 3600) return Math.floor(s / 60) + 'মি আগে'
    if (s < 86400) return Math.floor(s / 3600) + 'ঘ আগে'
    if (s < 604800) return Math.floor(s / 86400) + 'দিন আগে'
    return Math.floor(s / 604800) + 'সপ্তাহ আগে'
  }

  const tabs = [
    { key: 'all', label: '🔔 All' },
    { key: 'follow', label: '👥 Supporters' },
    { key: 'like', label: '❤️ Likes' },
    { key: 'comment', label: '💬 Comments' },
    { key: 'announcement', label: '📣 Updates' },
  ]

  const filtered = notifications.filter(n => activeTab === 'all' || n.type === activeTab)
  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <div style={{ minHeight: '100vh', background: '#070a10', color: '#eef2f7', paddingBottom: '80px' }}>

      {/* TOP BAR */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, background: 'rgba(7,10,16,0.97)', borderBottom: '1px solid rgba(255,255,255,0.07)', zIndex: 100 }}>
        <div style={{ padding: '0 16px', height: '52px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button onClick={() => window.location.href = '/feed'} style={{ background: 'none', border: 'none', color: '#8892a4', fontSize: '22px', cursor: 'pointer' }}>←</button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ fontSize: '16px', fontWeight: '900' }}>🔔 Notifications</div>
            {unreadCount > 0 && (
              <div style={{ background: '#ff4560', borderRadius: '20px', padding: '2px 8px', fontSize: '11px', fontWeight: '700', color: '#fff' }}>{unreadCount}</div>
            )}
          </div>
          <button onClick={clearAll} style={{ background: 'none', border: 'none', color: '#4a5568', fontSize: '12px', cursor: 'pointer', fontWeight: '600' }}>
            Clear All
          </button>
        </div>

        {/* TABS */}
        <div style={{ display: 'flex', gap: '6px', padding: '0 12px 10px', overflowX: 'auto', scrollbarWidth: 'none' }}>
          {tabs.map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              style={{ padding: '6px 12px', borderRadius: '20px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: '700', whiteSpace: 'nowrap', flexShrink: 0, background: activeTab === t.key ? 'linear-gradient(135deg,#00e5ff,#00ff88)' : 'rgba(255,255,255,0.07)', color: activeTab === t.key ? '#070a10' : '#8892a4' }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* BOTTOM NAV */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'rgba(7,10,16,0.98)', borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'space-around', padding: '10px 0 20px', zIndex: 100 }}>
        {[{ icon: '🏠', path: '/feed' }, { icon: '🗺', path: '/map' }, { icon: '📸', path: '/post' }, { icon: '🏆', path: '/leaderboard' }, { icon: '👤', path: '/profile' }].map(item => (
          <div key={item.path} onClick={() => window.location.href = item.path} style={{ fontSize: '22px', cursor: 'pointer', color: '#4a5568' }}>{item.icon}</div>
        ))}
      </div>

      <div style={{ padding: '112px 16px 20px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#4a5568' }}>
            <div style={{ fontSize: '32px', animation: 'spin 1s linear infinite' }}>🔔</div>
            <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#4a5568' }}>
            <div style={{ fontSize: '60px', marginBottom: '16px' }}>🔔</div>
            <div style={{ fontSize: '16px', fontWeight: '700', marginBottom: '8px', color: '#8892a4' }}>No notifications yet</div>
            <div style={{ fontSize: '13px' }}>When someone likes or supports you, it'll show here</div>
          </div>
        ) : (
          <div>
            {filtered.map((notif, index) => {
              const isFirst = index === 0 || new Date(filtered[index - 1].created_at).toDateString() !== new Date(notif.created_at).toDateString()
              return (
                <div key={notif.id}>
                  {isFirst && (
                    <div style={{ fontSize: '11px', color: '#4a5568', fontWeight: '700', letterSpacing: '1px', marginBottom: '8px', marginTop: index > 0 ? '16px' : '0', paddingLeft: '4px' }}>
                      {new Date(notif.created_at).toDateString() === new Date().toDateString() ? 'TODAY' :
                        new Date(notif.created_at).toDateString() === new Date(Date.now() - 86400000).toDateString() ? 'YESTERDAY' :
                          new Date(notif.created_at).toLocaleDateString('en', { month: 'short', day: 'numeric' }).toUpperCase()}
                    </div>
                  )}
                  <div onClick={() => handleClick(notif)}
                    style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: notif.read ? 'rgba(255,255,255,0.02)' : 'rgba(0,229,255,0.04)', border: `1px solid ${notif.read ? 'rgba(255,255,255,0.05)' : 'rgba(0,229,255,0.12)'}`, borderRadius: '14px', marginBottom: '8px', cursor: 'pointer', position: 'relative', transition: 'all 0.2s' }}>

                    {/* Avatar */}
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                      <div style={{ width: '46px', height: '46px', borderRadius: '50%', overflow: 'hidden', background: 'linear-gradient(135deg,#00e5ff,#00ff88)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {notif.profiles?.avatar_url
                          ? <img src={notif.profiles.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : notif.type === 'announcement'
                            ? <span style={{ fontSize: '20px' }}>📣</span>
                            : <span style={{ fontWeight: '800', color: '#070a10', fontSize: '18px' }}>{(notif.profiles?.full_name || notif.profiles?.username || 'E')[0]?.toUpperCase()}</span>
                        }
                      </div>
                      {/* Type badge */}
                      <div style={{ position: 'absolute', bottom: '-2px', right: '-2px', width: '20px', height: '20px', borderRadius: '50%', background: getColor(notif.type), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', border: '2px solid #070a10' }}>
                        {getIcon(notif.type)}
                      </div>
                    </div>

                    {/* Message */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '13px', color: '#eef2f7', lineHeight: '1.5', marginBottom: '3px' }}>
                        <span style={{ fontWeight: '700', color: getColor(notif.type) }}>{notif.profiles?.full_name || notif.profiles?.username || (notif.type === 'announcement' ? 'Echo World' : 'Someone')} </span>
                        {notif.type === 'follow' ? 'started supporting you' :
                          notif.type === 'like' ? 'liked your post' :
                            notif.type === 'comment' ? `commented: "${notif.message?.slice(0, 40)}"` :
                              notif.type === 'remix' ? 'remixed your ECHO' :
                                notif.type === 'announcement' ? notif.message :
                                  notif.message || 'sent you a notification'}
                      </div>
                      <div style={{ fontSize: '11px', color: '#4a5568' }}>{timeAgo(notif.created_at)}</div>
                    </div>

                    {/* Unread dot */}
                    {!notif.read && (
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#00e5ff', flexShrink: 0 }} />
                    )}

                    {/* Delete */}
                    <button onClick={(e) => { e.stopPropagation(); deleteNotif(notif.id) }}
                      style={{ background: 'none', border: 'none', color: '#2a3040', fontSize: '16px', cursor: 'pointer', padding: '4px', flexShrink: 0 }}>✕</button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
      }
