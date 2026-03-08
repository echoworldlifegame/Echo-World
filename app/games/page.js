'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const GAMES = [
  { id:'ludo',     name:'Ludo',           emoji:'🎲', desc:'2-4 জন খেলতে পারবে', modes:['solo','vs'] },
  { id:'bubble',   name:'Bubble Shooter', emoji:'🫧', desc:'Bubble ফাটাও, score করো', modes:['solo','vs'] },
  { id:'racing',   name:'Car Racing',     emoji:'🚗', desc:'Speed এ race করো', modes:['solo','vs'] },
  { id:'snake',    name:'Snake',          emoji:'🐍', desc:'খাও আর বড় হও', modes:['solo','vs'] },
  { id:'carrom',   name:'Carrom',         emoji:'🎯', desc:'Board এ coin ফেলো', modes:['solo','vs'] },
  { id:'chess',    name:'Chess',          emoji:'♟️', desc:'রাজা বাঁচাও', modes:['vs'] },
  { id:'bowling',  name:'Bowling',        emoji:'🎳', desc:'Strike মারো', modes:['solo','vs'] },
  { id:'cricket',  name:'Cricket',        emoji:'🏏', desc:'বাংলাদেশ জিতবে!', modes:['solo','vs'] },
  { id:'football', name:'Football',       emoji:'⚽', desc:'PvP Penalty Shootout', modes:['solo','vs'] },
]

export default function GamesLobby() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [challenges, setChallenges] = useState([])
  const [friends, setFriends] = useState([])
  const [showChallenge, setShowChallenge] = useState(null)
  const [challengeSent, setChallengeSent] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { window.location.href = '/'; return }
      const u = data.session.user
      setUser(u)
      const { data: p } = await supabase.from('profiles').select('*').eq('id', u.id).single()
      setProfile(p)
      loadChallenges(u.id)
      loadFriends(u.id)
    })
  }, [])

  const loadChallenges = async (uid) => {
    const { data } = await supabase.from('game_challenges')
      .select('*, challenger:profiles!game_challenges_challenger_id_fkey(id,username,full_name,avatar_url)')
      .eq('challenged_id', uid).eq('status', 'pending')
      .order('created_at', { ascending: false })
    setChallenges(data || [])
  }

  const loadFriends = async (uid) => {
    const { data } = await supabase.from('followers')
      .select('following:profiles!followers_following_id_fkey(id,username,full_name,avatar_url)')
      .eq('follower_id', uid).limit(30)
    setFriends((data || []).map(f => f.following))
  }

  const sendChallenge = async (gameId, friendId) => {
    if (!user) return
    await supabase.from('game_challenges').insert({
      game_id: gameId, challenger_id: user.id, challenged_id: friendId, status: 'pending'
    })
    await supabase.from('notifications').insert({
      user_id: friendId, from_user_id: user.id, type: 'system',
      message: `🎮 ${profile?.username || 'Someone'} তোমাকে ${GAMES.find(g=>g.id===gameId)?.name} খেলতে challenge করেছে!`,
      read: false,
    })
    setChallengeSent(gameId)
    setTimeout(() => setChallengeSent(null), 3000)
    setShowChallenge(null)
  }

  const acceptChallenge = async (ch) => {
    await supabase.from('game_challenges').update({ status: 'accepted' }).eq('id', ch.id)
    const { data: session } = await supabase.from('game_sessions').insert({
      game_id: ch.game_id, player1_id: ch.challenger_id, player2_id: user.id,
      status: 'active', state: JSON.stringify({}),
    }).select().single()
    if (session) window.location.href = `/games/play?id=${session.id}&game=${ch.game_id}&mode=vs`
  }

  const declineChallenge = async (ch) => {
    await supabase.from('game_challenges').update({ status: 'declined' }).eq('id', ch.id)
    setChallenges(prev => prev.filter(c => c.id !== ch.id))
  }

  const playSolo = (gameId) => window.location.href = `/games/play?game=${gameId}&mode=solo`

  return (
    <div style={{ minHeight:'100vh', background:'#070a12', color:'#eef2f7', fontFamily:'system-ui,sans-serif', paddingBottom:'90px' }}>
      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
        @keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
        *{box-sizing:border-box} ::-webkit-scrollbar{display:none}
      `}</style>

      {/* TOP BAR */}
      <div style={{ position:'sticky', top:0, zIndex:100, background:'rgba(7,10,18,.97)', backdropFilter:'blur(12px)', borderBottom:'1px solid rgba(255,255,255,.07)' }}>
        <div style={{ padding:'0 16px', height:'54px', display:'flex', alignItems:'center', gap:'10px' }}>
          <button onClick={() => window.history.back()} style={{ background:'none', border:'none', color:'#4a5568', fontSize:'20px', cursor:'pointer' }}>←</button>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:'16px', fontWeight:'900', background:'linear-gradient(90deg,#00e5ff,#a78bfa,#ff4560)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>🎮 Echo Games</div>
            <div style={{ fontSize:'9px', color:'#4a5568' }}>{GAMES.length} games • solo & multiplayer</div>
          </div>
          {challenges.length > 0 && (
            <div style={{ background:'#ff4560', borderRadius:'20px', padding:'3px 10px', fontSize:'11px', fontWeight:'800', color:'#fff', animation:'pulse 1.5s infinite' }}>
              ⚔️ {challenges.length}
            </div>
          )}
        </div>
      </div>

      <div style={{ padding:'14px' }}>

        {/* Pending Challenges */}
        {challenges.length > 0 && (
          <div style={{ marginBottom:'16px' }}>
            <div style={{ fontSize:'11px', fontWeight:'800', color:'#ff4560', marginBottom:'8px', letterSpacing:'1px' }}>⚔️ CHALLENGES</div>
            {challenges.map(ch => {
              const game = GAMES.find(g => g.id === ch.game_id)
              return (
                <div key={ch.id} style={{ background:'rgba(255,69,96,.08)', border:'1px solid rgba(255,69,96,.25)', borderRadius:'14px', padding:'12px', marginBottom:'8px', display:'flex', alignItems:'center', gap:'10px' }}>
                  <div style={{ fontSize:'28px' }}>{game?.emoji}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:'13px', fontWeight:'700' }}>@{ch.challenger?.username}</div>
                    <div style={{ fontSize:'11px', color:'#8892a4' }}>{game?.name} খেলতে challenge করেছে</div>
                  </div>
                  <button onClick={() => acceptChallenge(ch)} style={{ padding:'7px 14px', borderRadius:'10px', border:'none', cursor:'pointer', fontSize:'12px', fontWeight:'800', background:'linear-gradient(135deg,#00e5ff,#00ff88)', color:'#070a12' }}>▶ Play</button>
                  <button onClick={() => declineChallenge(ch)} style={{ padding:'7px 12px', borderRadius:'10px', border:'1px solid rgba(255,69,96,.3)', cursor:'pointer', fontSize:'12px', background:'rgba(255,69,96,.1)', color:'#ff4560' }}>✕</button>
                </div>
              )
            })}
          </div>
        )}

        {/* Games Grid */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'10px' }}>
          {GAMES.map((g, i) => (
            <div key={g.id}
              style={{ animation:`fadeUp ${0.05*i}s ease`, background:'linear-gradient(145deg,#111826,#0d1420)', border:'1px solid rgba(255,255,255,.07)', borderRadius:'18px', padding:'14px 10px', cursor:'pointer', position:'relative', overflow:'hidden', textAlign:'center' }}
              onClick={() => setShowChallenge(g)}>
              <div style={{ position:'absolute', top:0, left:0, right:0, height:'2px', background:'linear-gradient(90deg,#00e5ff,#a78bfa,#ff4560)', opacity:.6 }} />
              <div style={{ fontSize:'36px', marginBottom:'8px' }}>{g.emoji}</div>
              <div style={{ fontSize:'12px', fontWeight:'800', color:'#eef2f7', marginBottom:'4px' }}>{g.name}</div>
              <div style={{ fontSize:'9px', color:'#4a5568', marginBottom:'8px', lineHeight:'1.4' }}>{g.desc}</div>
              <div style={{ display:'flex', gap:'4px', justifyContent:'center', flexWrap:'wrap' }}>
                {g.modes.includes('solo') && <span style={{ fontSize:'8px', padding:'2px 7px', borderRadius:'6px', background:'rgba(0,229,255,.12)', color:'#00e5ff', fontWeight:'700' }}>Solo</span>}
                {g.modes.includes('vs') && <span style={{ fontSize:'8px', padding:'2px 7px', borderRadius:'6px', background:'rgba(255,69,96,.12)', color:'#ff4560', fontWeight:'700' }}>VS</span>}
              </div>
              {challengeSent === g.id && (
                <div style={{ position:'absolute', inset:0, background:'rgba(0,255,136,.2)', borderRadius:'18px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'28px' }}>✅</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Game Mode Modal */}
      {showChallenge && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.85)', display:'flex', alignItems:'flex-end', zIndex:1000 }} onClick={() => setShowChallenge(null)}>
          <div style={{ background:'#111620', borderRadius:'24px 24px 0 0', width:'100%', padding:'24px', maxHeight:'85vh', overflowY:'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ width:'40px', height:'4px', background:'rgba(255,255,255,.1)', borderRadius:'2px', margin:'0 auto 20px' }} />
            <div style={{ display:'flex', alignItems:'center', gap:'14px', marginBottom:'20px' }}>
              <div style={{ fontSize:'48px' }}>{showChallenge.emoji}</div>
              <div>
                <div style={{ fontSize:'20px', fontWeight:'900' }}>{showChallenge.name}</div>
                <div style={{ fontSize:'12px', color:'#4a5568' }}>{showChallenge.desc}</div>
              </div>
            </div>

            {showChallenge.modes.includes('solo') && (
              <button onClick={() => { playSolo(showChallenge.id); setShowChallenge(null) }}
                style={{ width:'100%', padding:'16px', background:'linear-gradient(135deg,#00e5ff,#00ff88)', border:'none', borderRadius:'14px', fontSize:'15px', fontWeight:'800', color:'#070a12', cursor:'pointer', marginBottom:'12px' }}>
                🎯 Solo Play
              </button>
            )}

            {showChallenge.modes.includes('vs') && (
              <div>
                <div style={{ fontSize:'12px', fontWeight:'800', color:'#ff4560', marginBottom:'10px' }}>⚔️ Friend কে Challenge করো</div>
                {friends.length === 0 ? (
                  <div style={{ textAlign:'center', padding:'20px', color:'#4a5568', fontSize:'12px' }}>কাউকে follow করলে এখানে দেখাবে</div>
                ) : friends.map(f => (
                  <div key={f.id} style={{ display:'flex', alignItems:'center', gap:'10px', padding:'10px', borderRadius:'12px', marginBottom:'6px', background:'rgba(255,255,255,.03)', border:'1px solid rgba(255,255,255,.06)' }}>
                    <div style={{ width:'40px', height:'40px', borderRadius:'50%', background:'linear-gradient(135deg,#00e5ff,#00ff88)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:'800', color:'#070a12', fontSize:'15px', flexShrink:0, overflow:'hidden' }}>
                      {f.avatar_url ? <img src={f.avatar_url} style={{ width:'100%', height:'100%', objectFit:'cover' }} /> : (f.full_name||f.username||'?')[0].toUpperCase()}
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:'13px', fontWeight:'700' }}>{f.full_name || f.username}</div>
                      <div style={{ fontSize:'10px', color:'#4a5568' }}>@{f.username}</div>
                    </div>
                    <button onClick={() => sendChallenge(showChallenge.id, f.id)}
                      style={{ padding:'8px 16px', borderRadius:'10px', border:'none', cursor:'pointer', fontSize:'12px', fontWeight:'800', background:'linear-gradient(135deg,#ff4560,#ff8c69)', color:'#fff' }}>
                      ⚔️ Challenge
                    </button>
                  </div>
                ))}
              </div>
            )}
            <button onClick={() => setShowChallenge(null)} style={{ width:'100%', padding:'12px', background:'transparent', border:'none', color:'#4a5568', fontSize:'14px', cursor:'pointer', marginTop:'8px' }}>Cancel</button>
          </div>
        </div>
      )}

      {/* BOTTOM NAV */}
      <div style={{ position:'fixed', bottom:0, left:0, right:0, background:'rgba(7,10,16,.98)', borderTop:'1px solid rgba(255,255,255,.07)', display:'flex', justifyContent:'space-around', padding:'10px 0 20px', zIndex:100 }}>
        {[['🏠','Home','/feed'],['🗺','Map','/map'],['📸','Post','/post'],['🏆','Rank','/leaderboard'],['👤','Profile','/profile']].map(([icon,label,path]) => (
          <div key={label} onClick={() => window.location.href=path} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'3px', cursor:'pointer', color:'#4a5568' }}>
            <span style={{ fontSize:'22px' }}>{icon}</span>
            <span style={{ fontSize:'10px', fontWeight:'600' }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
        }
