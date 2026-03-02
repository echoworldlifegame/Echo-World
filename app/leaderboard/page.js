'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default function Leaderboard() {
  const [user, setUser] = useState(null)
  const [activeTab, setActiveTab] = useState('xp')
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [myRank, setMyRank] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: s }) => {
      if (!s.session) { window.location.href = '/'; return }
      setUser(s.session.user)
      await loadTab('xp', s.session.user.id)
    })
  }, [])

  const loadTab = async (tab, uid) => {
    setLoading(true)
    setActiveTab(tab)
    let query

    if (tab === 'xp') {
      const { data: d } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url, xp, level, streak')
        .order('xp', { ascending: false })
        .limit(50)
      setData(d || [])
      const rank = (d || []).findIndex(p => p.id === uid) + 1
      setMyRank(rank > 0 ? rank : null)

    } else if (tab === 'posts') {
      const { data: d } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url, total_posts, xp, level')
        .order('total_posts', { ascending: false })
        .limit(50)
      setData(d || [])
      const rank = (d || []).findIndex(p => p.id === uid) + 1
      setMyRank(rank > 0 ? rank : null)

    } else if (tab === 'liked') {
      const { data: d } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url, total_likes_received, xp, level')
        .order('total_likes_received', { ascending: false })
        .limit(50)
      setData(d || [])
      const rank = (d || []).findIndex(p => p.id === uid) + 1
      setMyRank(rank > 0 ? rank : null)

    } else if (tab === 'supporters') {
      const { data: d } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url, followers_count, xp, level')
        .order('followers_count', { ascending: false })
        .limit(50)
      setData(d || [])
      const rank = (d || []).findIndex(p => p.id === uid) + 1
      setMyRank(rank > 0 ? rank : null)

    } else if (tab === 'streak') {
      const { data: d } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url, streak, xp, level')
        .order('streak', { ascending: false })
        .limit(50)
      setData(d || [])
      const rank = (d || []).findIndex(p => p.id === uid) + 1
      setMyRank(rank > 0 ? rank : null)

    } else if (tab === 'explorer') {
      const { data: d } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url, xp, level')
        .order('xp', { ascending: false })
        .limit(50)
      // Combine with explored zones count
      const { data: zones } = await supabase
        .from('explored_zones')
        .select('user_id')
      const zoneCounts = {}
      ;(zones || []).forEach(z => { zoneCounts[z.user_id] = (zoneCounts[z.user_id] || 0) + 1 })
      const merged = (d || []).map(p => ({ ...p, zones: zoneCounts[p.id] || 0 }))
        .sort((a, b) => b.zones - a.zones)
      setData(merged)
      const rank = merged.findIndex(p => p.id === uid) + 1
      setMyRank(rank > 0 ? rank : null)
    }

    setLoading(false)
  }

  const getLevelTitle = (level) => {
    if (!level || level < 5) return '🧭 Explorer'
    if (level < 10) return '🌟 Rising Star'
    if (level < 20) return '⚡ Elite'
    if (level < 30) return '🏆 Champion'
    if (level < 50) return '💎 Diamond'
    return '👑 Legend'
  }

  const getRankIcon = (index) => {
    if (index === 0) return '🥇'
    if (index === 1) return '🥈'
    if (index === 2) return '🥉'
    return `#${index + 1}`
  }

  const getTabValue = (item) => {
    if (activeTab === 'xp') return `⚡ ${item.xp || 0} XP`
    if (activeTab === 'posts') return `📝 ${item.total_posts || 0} posts`
    if (activeTab === 'liked') return `❤️ ${item.total_likes_received || 0} likes`
    if (activeTab === 'supporters') return `👥 ${item.followers_count || 0}`
    if (activeTab === 'streak') return `🔥 ${item.streak || 0} days`
    if (activeTab === 'explorer') return `🗺 ${item.zones || 0} zones`
    return ''
  }

  const tabs = [
    { key: 'xp', label: '⚡ XP' },
    { key: 'posts', label: '📝 Posts' },
    { key: 'liked', label: '❤️ Liked' },
    { key: 'supporters', label: '👥 Fans' },
    { key: 'streak', label: '🔥 Streak' },
    { key: 'explorer', label: '🗺 Explorer' },
  ]

  const top3 = data.slice(0, 3)
  const rest = data.slice(3)

  return (
    <div style={{ minHeight: '100vh', background: '#070a10', color: '#eef2f7', paddingBottom: '80px' }}>

      {/* TOP BAR */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, background: 'rgba(7,10,16,0.97)', borderBottom: '1px solid rgba(255,255,255,0.07)', zIndex: 100 }}>
        <div style={{ padding: '0 16px', height: '52px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button onClick={() => window.location.href = '/feed'} style={{ background: 'none', border: 'none', color: '#8892a4', fontSize: '22px', cursor: 'pointer' }}>←</button>
          <div style={{ fontSize: '16px', fontWeight: '900', background: 'linear-gradient(90deg,#ffca28,#ffa500)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>🏆 Leaderboard</div>
          <div style={{ width: '32px' }} />
        </div>

        {/* TABS */}
        <div style={{ display: 'flex', gap: '6px', padding: '0 12px 10px', overflowX: 'auto', scrollbarWidth: 'none' }}>
          {tabs.map(t => (
            <button key={t.key} onClick={() => loadTab(t.key, user?.id)}
              style={{ padding: '6px 14px', borderRadius: '20px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: '700', whiteSpace: 'nowrap', flexShrink: 0, background: activeTab === t.key ? 'linear-gradient(135deg,#ffca28,#ffa500)' : 'rgba(255,255,255,0.07)', color: activeTab === t.key ? '#070a10' : '#8892a4', transition: 'all 0.2s' }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* BOTTOM NAV */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'rgba(7,10,16,0.98)', borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'space-around', padding: '10px 0 20px', zIndex: 100 }}>
        {[{ icon: '🏠', path: '/feed' }, { icon: '🗺', path: '/map' }, { icon: '📸', path: '/post' }, { icon: '🏆', path: '/leaderboard' }, { icon: '👤', path: '/profile' }].map(item => (
          <div key={item.path} onClick={() => window.location.href = item.path} style={{ fontSize: '22px', cursor: 'pointer', color: item.path === '/leaderboard' ? '#ffca28' : '#4a5568' }}>{item.icon}</div>
        ))}
      </div>

      <div style={{ padding: '112px 16px 20px' }}>

        {/* MY RANK CARD */}
        {myRank && (
          <div style={{ background: 'linear-gradient(135deg,#0a1628,#0d2137)', border: '1px solid rgba(255,202,40,0.2)', borderRadius: '16px', padding: '14px 16px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ fontSize: '28px', fontWeight: '900', color: '#ffca28', minWidth: '40px', textAlign: 'center' }}>#{myRank}</div>
            <div>
              <div style={{ fontSize: '12px', color: '#4a5568', fontWeight: '600' }}>YOUR RANK</div>
              <div style={{ fontSize: '14px', fontWeight: '700', color: '#ffca28' }}>
                {myRank === 1 ? '🥇 You are #1!' : myRank <= 3 ? '🏆 Top 3!' : myRank <= 10 ? '⚡ Top 10!' : `Keep going! 💪`}
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#4a5568' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px', animation: 'spin 1s linear infinite' }}>🏆</div>
            <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
          </div>
        ) : (
          <>
            {/* TOP 3 PODIUM */}
            {top3.length >= 3 && (
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: '8px', marginBottom: '8px' }}>

                  {/* 2nd place */}
                  <div style={{ flex: 1, textAlign: 'center' }} onClick={() => window.location.href = `/user/${top3[1]?.id}`}>
                    <div style={{ width: '52px', height: '52px', borderRadius: '50%', overflow: 'hidden', background: 'linear-gradient(135deg,#c0c0c0,#a8a8a8)', border: '3px solid #c0c0c0', margin: '0 auto 6px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 0 16px rgba(192,192,192,0.4)' }}>
                      {top3[1]?.avatar_url ? <img src={top3[1].avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: '20px', fontWeight: '900', color: '#070a10' }}>{(top3[1]?.full_name || top3[1]?.username || 'E')[0].toUpperCase()}</span>}
                    </div>
                    <div style={{ fontSize: '11px', fontWeight: '700', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{top3[1]?.full_name || top3[1]?.username}</div>
                    <div style={{ fontSize: '10px', color: '#c0c0c0', fontWeight: '600' }}>{getTabValue(top3[1])}</div>
                    <div style={{ height: '70px', background: 'linear-gradient(to top,#c0c0c022,transparent)', border: '1px solid rgba(192,192,192,0.2)', borderBottom: 'none', borderRadius: '8px 8px 0 0', marginTop: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>🥈</div>
                  </div>

                  {/* 1st place */}
                  <div style={{ flex: 1, textAlign: 'center' }} onClick={() => window.location.href = `/user/${top3[0]?.id}`}>
                    <div style={{ fontSize: '20px', marginBottom: '4px', animation: 'bounce 1s infinite' }}>👑</div>
                    <div style={{ width: '64px', height: '64px', borderRadius: '50%', overflow: 'hidden', background: 'linear-gradient(135deg,#ffca28,#ffa500)', border: '3px solid #ffca28', margin: '0 auto 6px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 0 24px rgba(255,202,40,0.6)' }}>
                      {top3[0]?.avatar_url ? <img src={top3[0].avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: '24px', fontWeight: '900', color: '#070a10' }}>{(top3[0]?.full_name || top3[0]?.username || 'E')[0].toUpperCase()}</span>}
                    </div>
                    <div style={{ fontSize: '12px', fontWeight: '800', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{top3[0]?.full_name || top3[0]?.username}</div>
                    <div style={{ fontSize: '11px', color: '#ffca28', fontWeight: '700' }}>{getTabValue(top3[0])}</div>
                    <div style={{ height: '100px', background: 'linear-gradient(to top,#ffca2822,transparent)', border: '1px solid rgba(255,202,40,0.3)', borderBottom: 'none', borderRadius: '8px 8px 0 0', marginTop: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px' }}>🥇</div>
                  </div>

                  {/* 3rd place */}
                  <div style={{ flex: 1, textAlign: 'center' }} onClick={() => window.location.href = `/user/${top3[2]?.id}`}>
                    <div style={{ width: '52px', height: '52px', borderRadius: '50%', overflow: 'hidden', background: 'linear-gradient(135deg,#cd7f32,#a0522d)', border: '3px solid #cd7f32', margin: '0 auto 6px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 0 16px rgba(205,127,50,0.4)' }}>
                      {top3[2]?.avatar_url ? <img src={top3[2].avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: '20px', fontWeight: '900', color: '#070a10' }}>{(top3[2]?.full_name || top3[2]?.username || 'E')[0].toUpperCase()}</span>}
                    </div>
                    <div style={{ fontSize: '11px', fontWeight: '700', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{top3[2]?.full_name || top3[2]?.username}</div>
                    <div style={{ fontSize: '10px', color: '#cd7f32', fontWeight: '600' }}>{getTabValue(top3[2])}</div>
                    <div style={{ height: '50px', background: 'linear-gradient(to top,#cd7f3222,transparent)', border: '1px solid rgba(205,127,50,0.2)', borderBottom: 'none', borderRadius: '8px 8px 0 0', marginTop: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>🥉</div>
                  </div>
                </div>
              </div>
            )}

            {/* REST OF LIST */}
            <div>
              {rest.map((item, index) => {
                const isMe = item.id === user?.id
                return (
                  <div key={item.id} onClick={() => window.location.href = isMe ? '/profile' : `/user/${item.id}`}
                    style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: isMe ? 'rgba(0,229,255,0.06)' : 'rgba(255,255,255,0.02)', border: `1px solid ${isMe ? 'rgba(0,229,255,0.2)' : 'rgba(255,255,255,0.06)'}`, borderRadius: '14px', marginBottom: '8px', cursor: 'pointer', transition: 'all 0.2s' }}>

                    {/* Rank */}
                    <div style={{ minWidth: '32px', textAlign: 'center', fontSize: index < 7 ? '18px' : '14px', fontWeight: '900', color: isMe ? '#00e5ff' : '#4a5568' }}>
                      {index + 4}
                    </div>

                    {/* Avatar */}
                    <div style={{ width: '44px', height: '44px', borderRadius: '50%', overflow: 'hidden', background: 'linear-gradient(135deg,#00e5ff,#00ff88)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', border: isMe ? '2px solid #00e5ff' : '2px solid transparent', boxShadow: isMe ? '0 0 12px rgba(0,229,255,0.4)' : 'none' }}>
                      {item.avatar_url ? <img src={item.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontWeight: '800', color: '#070a10', fontSize: '16px' }}>{(item.full_name || item.username || 'E')[0].toUpperCase()}</span>}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                        <div style={{ fontSize: '14px', fontWeight: '700', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.full_name || item.username}</div>
                        {isMe && <span style={{ fontSize: '10px', background: 'rgba(0,229,255,0.15)', color: '#00e5ff', borderRadius: '8px', padding: '1px 6px', fontWeight: '700', flexShrink: 0 }}>You</span>}
                      </div>
                      <div style={{ fontSize: '11px', color: '#4a5568' }}>{getLevelTitle(item.level)} · Lv.{item.level || 1}</div>
                    </div>

                    {/* Value */}
                    <div style={{ fontSize: '13px', fontWeight: '700', color: isMe ? '#00e5ff' : '#ffca28', flexShrink: 0 }}>
                      {getTabValue(item)}
                    </div>
                  </div>
                )
              })}
            </div>

            {data.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px', color: '#4a5568' }}>
                <div style={{ fontSize: '40px', marginBottom: '12px' }}>🏆</div>
                <div>No data yet. Be the first!</div>
              </div>
            )}
          </>
        )}
      </div>

      <style>{`
        @keyframes bounce {
          0%,100%{transform:translateY(0)}
          50%{transform:translateY(-6px)}
        }
      `}</style>
    </div>
  )
              }
