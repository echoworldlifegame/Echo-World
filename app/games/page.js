'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const GAMES = [
  // Casual
  { id:'snake',        name:'Snake',          emoji:'🐍', cat:'casual',  modes:['solo','vs'] },
  { id:'tetris',       name:'Tetris',         emoji:'🟦', cat:'casual',  modes:['solo'] },
  { id:'2048',         name:'2048',           emoji:'🔢', cat:'casual',  modes:['solo','vs'] },
  { id:'flappy',       name:'Flappy Bird',    emoji:'🐦', cat:'casual',  modes:['solo','vs'] },
  { id:'minesweeper',  name:'Minesweeper',    emoji:'💣', cat:'casual',  modes:['solo'] },
  { id:'breakout',     name:'Breakout',       emoji:'🧱', cat:'casual',  modes:['solo'] },
  { id:'pong',         name:'Pong',           emoji:'🏓', cat:'casual',  modes:['solo','vs'] },
  { id:'colorswitch',  name:'Color Switch',   emoji:'🎨', cat:'casual',  modes:['solo'] },
  { id:'dino',         name:'Dino Run',       emoji:'🦕', cat:'casual',  modes:['solo','vs'] },
  { id:'tapping',      name:'Tap Speed',      emoji:'👆', cat:'casual',  modes:['solo','vs'] },
  // Card
  { id:'memory',       name:'Memory Match',   emoji:'🃏', cat:'card',    modes:['solo','vs'] },
  { id:'war',          name:'Card War',       emoji:'⚔️', cat:'card',    modes:['vs'] },
  { id:'blackjack',    name:'Blackjack',      emoji:'🎰', cat:'card',    modes:['solo'] },
  { id:'solitaire',    name:'Solitaire',      emoji:'🂡', cat:'card',    modes:['solo'] },
  { id:'snap',         name:'Snap',           emoji:'👋', cat:'card',    modes:['vs'] },
  { id:'teenpatti',    name:'Teen Patti',     emoji:'🎴', cat:'card',    modes:['vs'] },
  { id:'higher_lower', name:'Higher Lower',   emoji:'📈', cat:'card',    modes:['solo','vs'] },
  { id:'pairs',        name:'Pairs',          emoji:'🎲', cat:'card',    modes:['solo','vs'] },
  // Board/Puzzle
  { id:'tictactoe',    name:'Tic Tac Toe',    emoji:'❌', cat:'board',   modes:['solo','vs'] },
  { id:'chess',        name:'Chess',          emoji:'♟️', cat:'board',   modes:['vs'] },
  { id:'ludo',         name:'Ludo',           emoji:'🎲', cat:'board',   modes:['vs'] },
  { id:'connect4',     name:'Connect Four',   emoji:'🔴', cat:'board',   modes:['solo','vs'] },
  { id:'checkers',     name:'Checkers',       emoji:'⚫', cat:'board',   modes:['vs'] },
  { id:'dots',         name:'Dots & Boxes',   emoji:'🔲', cat:'board',   modes:['vs'] },
  { id:'sudoku',       name:'Sudoku',         emoji:'🔢', cat:'board',   modes:['solo'] },
  { id:'15puzzle',     name:'15 Puzzle',      emoji:'🧩', cat:'board',   modes:['solo'] },
  { id:'reversi',      name:'Reversi',        emoji:'🔵', cat:'board',   modes:['vs'] },
  { id:'battleship',   name:'Battleship',     emoji:'🚢', cat:'board',   modes:['vs'] },
  // Word/Quiz
  { id:'hangman',      name:'Hangman',        emoji:'🪢', cat:'word',    modes:['solo','vs'] },
  { id:'wordguess',    name:'Word Guess',     emoji:'🔤', cat:'word',    modes:['solo','vs'] },
  { id:'typingrace',   name:'Typing Race',    emoji:'⌨️', cat:'word',    modes:['solo','vs'] },
  { id:'quiz',         name:'বাংলা Quiz',     emoji:'🧠', cat:'word',    modes:['solo','vs'] },
  { id:'wordsearch',   name:'Word Search',    emoji:'🔍', cat:'word',    modes:['solo'] },
  { id:'anagram',      name:'Anagram',        emoji:'🔀', cat:'word',    modes:['solo','vs'] },
  { id:'trivia',       name:'Trivia',         emoji:'❓', cat:'word',    modes:['solo','vs'] },
  { id:'scramble',     name:'Scramble',       emoji:'📝', cat:'word',    modes:['solo','vs'] },
  { id:'mathquiz',     name:'Math Quiz',      emoji:'➗', cat:'word',    modes:['solo','vs'] },
  { id:'riddle',       name:'Riddle',         emoji:'🤔', cat:'word',    modes:['solo'] },
  { id:'reactiontime', name:'Reaction Time',  emoji:'⚡', cat:'casual',  modes:['solo','vs'] },
  { id:'colorguess',   name:'Color Guess',    emoji:'🌈', cat:'casual',  modes:['solo','vs'] },
  { id:'numberguess',  name:'Number Guess',   emoji:'🔮', cat:'casual',  modes:['solo','vs'] },
  { id:'rockpaper',    name:'Rock Paper',     emoji:'✊', cat:'card',    modes:['solo','vs'] },
]

const CATS = [
  { key:'all',    label:'🎮 All',     color:'#00e5ff' },
  { key:'casual', label:'🕹️ Casual',  color:'#00ff88' },
  { key:'card',   label:'🃏 Card',    color:'#ffa500' },
  { key:'board',  label:'♟️ Board',   color:'#a78bfa' },
  { key:'word',   label:'📝 Word',    color:'#f472b6' },
]

export default function GamesLobby() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [cat, setCat] = useState('all')
  const [search, setSearch] = useState('')
  const [challenges, setChallenges] = useState([])
  const [showChallenge, setShowChallenge] = useState(null) // game to challenge
  const [friends, setFriends] = useState([])
  const [challengeSent, setChallengeSent] = useState(null)
  const [activeGames, setActiveGames] = useState([])

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { window.location.href = '/'; return }
      const u = data.session.user
      setUser(u)
      const { data: p } = await supabase.from('profiles').select('*').eq('id', u.id).single()
      setProfile(p)
      loadChallenges(u.id)
      loadFriends(u.id)
      loadActiveGames(u.id)
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

  const loadActiveGames = async (uid) => {
    const { data } = await supabase.from('game_sessions')
      .select('*, opponent:profiles!game_sessions_player2_id_fkey(id,username,full_name)')
      .or(`player1_id.eq.${uid},player2_id.eq.${uid}`)
      .eq('status', 'active').order('created_at', { ascending: false }).limit(5)
    setActiveGames(data || [])
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
    if (session) window.location.href = `/games/play?id=${session.id}&game=${ch.game_id}`
  }

  const declineChallenge = async (ch) => {
    await supabase.from('game_challenges').update({ status: 'declined' }).eq('id', ch.id)
    setChallenges(prev => prev.filter(c => c.id !== ch.id))
  }

  const playSolo = (gameId) => {
    window.location.href = `/games/play?game=${gameId}&mode=solo`
  }

  const filtered = GAMES.filter(g =>
    (cat === 'all' || g.cat === cat) &&
    (search === '' || g.name.toLowerCase().includes(search.toLowerCase()))
  )

  const timeAgo = (d) => {
    const s = Math.floor((Date.now() - new Date(d)) / 1000)
    if (s < 60) return 'এইমাত্র'
    if (s < 3600) return Math.floor(s/60) + 'মি আগে'
    return Math.floor(s/3600) + 'ঘ আগে'
  }

  if (!user) return <div style={{ height:'100vh', background:'#050810', display:'flex', alignItems:'center', justifyContent:'center', color:'#00e5ff', fontSize:'24px' }}>🎮</div>

  return (
    <div style={{ minHeight:'100vh', background:'#070a12', color:'#eef2f7', fontFamily:'system-ui,sans-serif', paddingBottom:'90px' }}>
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.5} }
        @keyframes glow { 0%,100%{box-shadow:0 0 12px rgba(0,229,255,.3)} 50%{box-shadow:0 0 24px rgba(0,229,255,.6)} }
        *{box-sizing:border-box}
        ::-webkit-scrollbar{display:none}
      `}</style>

      {/* TOP BAR */}
      <div style={{ position:'sticky', top:0, zIndex:100, background:'rgba(7,10,18,.97)', backdropFilter:'blur(12px)', borderBottom:'1px solid rgba(255,255,255,.07)' }}>
        <div style={{ padding:'0 16px', height:'54px', display:'flex', alignItems:'center', gap:'10px' }}>
          <button onClick={() => window.history.back()} style={{ background:'none', border:'none', color:'#4a5568', fontSize:'20px', cursor:'pointer' }}>←</button>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:'15px', fontWeight:'900', background:'linear-gradient(90deg,#00e5ff,#a78bfa)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>🎮 Echo Games</div>
            <div style={{ fontSize:'9px', color:'#4a5568' }}>{GAMES.length} games • solo & multiplayer</div>
          </div>
          {challenges.length > 0 && (
            <div style={{ background:'#ff4560', borderRadius:'20px', padding:'3px 10px', fontSize:'11px', fontWeight:'800', color:'#fff', animation:'pulse 1.5s infinite' }}>
              ⚔️ {challenges.length}
            </div>
          )}
        </div>

        {/* Search */}
        <div style={{ padding:'0 16px 10px' }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder='🔍 গেম খোঁজো...'
            style={{ width:'100%', background:'rgba(255,255,255,.06)', border:'1px solid rgba(255,255,255,.08)', borderRadius:'12px', padding:'9px 14px', color:'#eef2f7', fontSize:'13px', outline:'none' }} />
        </div>

        {/* Cat tabs */}
        <div style={{ display:'flex', gap:'6px', padding:'0 12px 10px', overflowX:'auto', scrollbarWidth:'none' }}>
          {CATS.map(c => (
            <button key={c.key} onClick={() => setCat(c.key)}
              style={{ padding:'6px 14px', borderRadius:'20px', border:'none', cursor:'pointer', fontSize:'12px', fontWeight:'700', whiteSpace:'nowrap', flexShrink:0,
                background: cat===c.key ? `linear-gradient(135deg,${c.color},${c.color}88)` : 'rgba(255,255,255,.06)',
                color: cat===c.key ? '#070a12' : '#4a5568' }}>
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding:'12px 14px' }}>

        {/* Pending Challenges */}
        {challenges.length > 0 && (
          <div style={{ marginBottom:'16px', animation:'fadeUp .3s ease' }}>
            <div style={{ fontSize:'12px', fontWeight:'800', color:'#ff4560', marginBottom:'8px', letterSpacing:'1px' }}>⚔️ CHALLENGES ({challenges.length})</div>
            {challenges.map(ch => {
              const game = GAMES.find(g => g.id === ch.game_id)
              return (
                <div key={ch.id} style={{ background:'rgba(255,69,96,.08)', border:'1px solid rgba(255,69,96,.25)', borderRadius:'14px', padding:'12px', marginBottom:'8px', display:'flex', alignItems:'center', gap:'10px' }}>
                  <div style={{ fontSize:'28px' }}>{game?.emoji}</div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:'13px', fontWeight:'700', color:'#eef2f7' }}>@{ch.challenger?.username}</div>
                    <div style={{ fontSize:'11px', color:'#8892a4' }}>{game?.name} খেলতে challenge করেছে · {timeAgo(ch.created_at)}</div>
                  </div>
                  <div style={{ display:'flex', gap:'6px' }}>
                    <button onClick={() => acceptChallenge(ch)}
                      style={{ padding:'7px 14px', borderRadius:'10px', border:'none', cursor:'pointer', fontSize:'12px', fontWeight:'800', background:'linear-gradient(135deg,#00e5ff,#00ff88)', color:'#070a12' }}>
                      ▶ Play
                    </button>
                    <button onClick={() => declineChallenge(ch)}
                      style={{ padding:'7px 12px', borderRadius:'10px', border:'1px solid rgba(255,69,96,.3)', cursor:'pointer', fontSize:'12px', background:'rgba(255,69,96,.1)', color:'#ff4560' }}>
                      ✕
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Active Games */}
        {activeGames.length > 0 && (
          <div style={{ marginBottom:'16px' }}>
            <div style={{ fontSize:'12px', fontWeight:'800', color:'#00ff88', marginBottom:'8px', letterSpacing:'1px' }}>🟢 ACTIVE GAMES</div>
            <div style={{ display:'flex', gap:'8px', overflowX:'auto', paddingBottom:'4px' }}>
              {activeGames.map(s => {
                const game = GAMES.find(g => g.id === s.game_id)
                return (
                  <div key={s.id} onClick={() => window.location.href=`/games/play?id=${s.id}&game=${s.game_id}`}
                    style={{ background:'rgba(0,255,136,.08)', border:'1px solid rgba(0,255,136,.2)', borderRadius:'14px', padding:'10px 14px', cursor:'pointer', flexShrink:0, textAlign:'center', minWidth:'90px' }}>
                    <div style={{ fontSize:'24px', marginBottom:'4px' }}>{game?.emoji}</div>
                    <div style={{ fontSize:'10px', fontWeight:'700', color:'#00ff88' }}>Resume</div>
                    <div style={{ fontSize:'9px', color:'#4a5568' }}>vs @{s.opponent?.username}</div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Games Grid */}
        <div style={{ fontSize:'12px', fontWeight:'800', color:'#4a5568', marginBottom:'10px', letterSpacing:'1px' }}>
          {cat === 'all' ? 'ALL GAMES' : CATS.find(c=>c.key===cat)?.label.toUpperCase()} ({filtered.length})
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'8px' }}>
          {filtered.map((g, i) => (
            <div key={g.id} style={{ animation:`fadeUp ${0.05*i}s ease`, background:'#111826', border:'1px solid rgba(255,255,255,.06)', borderRadius:'16px', padding:'12px', cursor:'pointer', position:'relative', overflow:'hidden' }}
              onClick={() => {
                if (g.modes.includes('solo') && !g.modes.includes('vs')) playSolo(g.id)
                else setShowChallenge(g)
              }}>
              {/* glow bg */}
              <div style={{ position:'absolute', top:'-20px', right:'-20px', width:'70px', height:'70px', borderRadius:'50%',
                background: g.cat==='casual'?'rgba(0,255,136,.06)':g.cat==='card'?'rgba(255,165,0,.06)':g.cat==='board'?'rgba(167,139,250,.06)':'rgba(244,114,182,.06)' }} />
              <div style={{ fontSize:'30px', marginBottom:'6px' }}>{g.emoji}</div>
              <div style={{ fontSize:'11px', fontWeight:'800', color:'#eef2f7', lineHeight:'1.3', marginBottom:'4px' }}>{g.name}</div>
              <div style={{ display:'flex', gap:'3px', flexWrap:'wrap' }}>
                {g.modes.includes('solo') && <span style={{ fontSize:'8px', padding:'2px 6px', borderRadius:'6px', background:'rgba(0,229,255,.1)', color:'#00e5ff', fontWeight:'700' }}>Solo</span>}
                {g.modes.includes('vs') && <span style={{ fontSize:'8px', padding:'2px 6px', borderRadius:'6px', background:'rgba(255,69,96,.1)', color:'#ff4560', fontWeight:'700' }}>VS</span>}
              </div>
              {challengeSent === g.id && (
                <div style={{ position:'absolute', inset:0, background:'rgba(0,255,136,.15)', borderRadius:'16px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'24px' }}>✅</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Game Mode Modal */}
      {showChallenge && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.8)', display:'flex', alignItems:'flex-end', zIndex:1000 }} onClick={() => setShowChallenge(null)}>
          <div style={{ background:'#111620', borderRadius:'24px 24px 0 0', width:'100%', padding:'24px', maxHeight:'80vh', overflowY:'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ display:'flex', alignItems:'center', gap:'12px', marginBottom:'20px' }}>
              <div style={{ fontSize:'40px' }}>{showChallenge.emoji}</div>
              <div>
                <div style={{ fontSize:'17px', fontWeight:'900', color:'#eef2f7' }}>{showChallenge.name}</div>
                <div style={{ fontSize:'11px', color:'#4a5568' }}>কীভাবে খেলবে?</div>
              </div>
            </div>

            {showChallenge.modes.includes('solo') && (
              <button onClick={() => { playSolo(showChallenge.id); setShowChallenge(null) }}
                style={{ width:'100%', padding:'15px', background:'linear-gradient(135deg,#00e5ff,#00ff88)', border:'none', borderRadius:'14px', fontSize:'14px', fontWeight:'800', color:'#070a12', cursor:'pointer', marginBottom:'10px' }}>
                🎯 Solo Play — নিজে খেলো
              </button>
            )}

            {showChallenge.modes.includes('vs') && (
              <div>
                <div style={{ fontSize:'12px', fontWeight:'800', color:'#ff4560', marginBottom:'10px' }}>⚔️ Challenge করো</div>
                {friends.length === 0 ? (
                  <div style={{ textAlign:'center', padding:'20px', color:'#4a5568', fontSize:'12px' }}>কাউকে follow করলে এখানে দেখাবে</div>
                ) : friends.map(f => (
                  <div key={f.id} style={{ display:'flex', alignItems:'center', gap:'10px', padding:'10px', borderRadius:'12px', marginBottom:'6px', background:'rgba(255,255,255,.03)', border:'1px solid rgba(255,255,255,.06)' }}>
                    <div style={{ width:'38px', height:'38px', borderRadius:'50%', background:'linear-gradient(135deg,#00e5ff,#00ff88)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:'800', color:'#070a12', fontSize:'14px', flexShrink:0 }}>
                      {f.avatar_url ? <img src={f.avatar_url} style={{ width:'100%', height:'100%', borderRadius:'50%', objectFit:'cover' }} /> : (f.full_name||f.username||'?')[0].toUpperCase()}
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:'13px', fontWeight:'700', color:'#eef2f7' }}>{f.full_name || f.username}</div>
                      <div style={{ fontSize:'10px', color:'#4a5568' }}>@{f.username}</div>
                    </div>
                    <button onClick={() => sendChallenge(showChallenge.id, f.id)}
                      style={{ padding:'7px 14px', borderRadius:'10px', border:'none', cursor:'pointer', fontSize:'12px', fontWeight:'800', background:'linear-gradient(135deg,#ff4560,#ff8c69)', color:'#fff' }}>
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
        {[
          { icon:'🏠', label:'Home', path:'/feed' },
          { icon:'🗺', label:'Map', path:'/map' },
          { icon:'📸', label:'Post', path:'/post' },
          { icon:'🏆', label:'Rank', path:'/leaderboard' },
          { icon:'👤', label:'Profile', path:'/profile' },
        ].map(item => (
          <div key={item.label} onClick={() => window.location.href = item.path}
            style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'3px', cursor:'pointer', color:'#4a5568' }}>
            <span style={{ fontSize:'22px' }}>{item.icon}</span>
            <span style={{ fontSize:'10px', fontWeight:'600' }}>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
    }
