'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const AGORA_APP_ID = process.env.NEXT_PUBLIC_AGORA_APP_ID || 'YOUR_AGORA_APP_ID'

const GIFTS = [
  { emoji:'🌹', name:'Rose',    echo:5   },
  { emoji:'🎂', name:'Cake',    echo:10  },
  { emoji:'💎', name:'Diamond', echo:50  },
  { emoji:'👑', name:'Crown',   echo:100 },
  { emoji:'🚀', name:'Rocket',  echo:200 },
  { emoji:'🏆', name:'Trophy',  echo:500 },
  { emoji:'🌟', name:'Star',    echo:20  },
  { emoji:'❤️', name:'Heart',  echo:15  },
]

const fmtCount = n => !n?'0':n>=1000?(n/1000).toFixed(1)+'K':String(n)

// ══════════════════════════════════════════════════════
// LIVE VIEWER PAGE  (app/live/watch/page.js)
// ══════════════════════════════════════════════════════
export default function LiveViewer({ searchParams }) {
  const channelName = searchParams?.channel
  const [user, setUser] = useState(null)
  const [session, setSession] = useState(null)
  const [host, setHost] = useState(null)
  const [messages, setMessages] = useState([])
  const [msgText, setMsgText] = useState('')
  const [viewerCount, setViewerCount] = useState(0)
  const [status, setStatus] = useState('loading')
  const [showGifts, setShowGifts] = useState(false)
  const [floatingGifts, setFloatingGifts] = useState([])
  const [isFollowing, setIsFollowing] = useState(false)
  const [userCoins, setUserCoins] = useState(0)
  const [muted, setMuted] = useState(false)
  const videoRef = useRef(null)
  const chatRef = useRef(null)
  const AgoraRef = useRef(null)
  const clientRef = useRef(null)
  const msgSubRef = useRef(null)
  const sessSubRef = useRef(null)

  useEffect(() => {
    if (!channelName) { setStatus('not_found'); return }
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { window.location.href = '/'; return }
      const u = data.session.user; setUser(u)
      await loadSession(u)
    })
    // Load Agora SDK
    const script = document.createElement('script')
    script.src = 'https://download.agora.io/sdk/release/AgoraRTC_N-4.21.0.js'
    script.onload = () => { AgoraRef.current = window.AgoraRTC }
    document.head.appendChild(script)
    return () => {
      leaveChannel()
      msgSubRef.current?.unsubscribe()
      sessSubRef.current?.unsubscribe()
      document.head.removeChild(script)
    }
  }, [])

  const loadSession = async (u) => {
    const { data: sess } = await supabase.from('live_sessions')
      .select('*, profiles(id, username, full_name, avatar_url)')
      .eq('channel_name', channelName)
      .eq('status', 'active')
      .single()
    if (!sess) { setStatus('ended'); return }
    setSession(sess)
    setHost(sess.profiles)
    setViewerCount(sess.viewer_count || 0)
    // Check following
    const { data: f } = await supabase.from('followers')
      .select('id').eq('follower_id', u.id).eq('following_id', sess.user_id).single()
    setIsFollowing(!!f)
    // Load coin balance
    const { data: coinProf } = await supabase.from('profiles').select('coin_balance').eq('id', u.id).single()
    setUserCoins(coinProf?.coin_balance || 0)
    // Join as viewer in DB
    await supabase.from('live_viewers').upsert({ session_id: sess.id, user_id: u.id })
    await supabase.rpc('increment_viewers', { session_id_param: sess.id })
    // Send join message
    const { data: p } = await supabase.from('profiles').select('username').eq('id', u.id).single()
    await supabase.from('live_messages').insert({
      session_id: sess.id, user_id: u.id,
      message: `${p?.username || 'Someone'} joined 👋`, type: 'join'
    })
    await loadMessages(sess.id)
    subscribeMessages(sess.id)
    subscribeSession(sess.id)
    await joinAgoraChannel(sess.channel_name)
  }

  const loadMessages = async (sessionId) => {
    const { data } = await supabase.from('live_messages')
      .select('*, profiles(username, avatar_url)')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false }).limit(60)
    setMessages((data || []).reverse())
  }

  const subscribeMessages = (sessionId) => {
    const sub = supabase.channel(`live_msgs_view_${sessionId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'live_messages',
        filter: `session_id=eq.${sessionId}`
      }, payload => {
        const msg = payload.new
        setMessages(p => [...p.slice(-99), msg])
        if (msg.type === 'gift') addFloatingGift(msg.gift_emoji, msg.gift_amount)
        setTimeout(() => { if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight }, 50)
      })
      .subscribe()
    msgSubRef.current = sub
  }

  const subscribeSession = (sessionId) => {
    const sub = supabase.channel(`live_sess_view_${sessionId}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'live_sessions',
        filter: `id=eq.${sessionId}`
      }, payload => {
        if (payload.new?.viewer_count !== undefined) setViewerCount(payload.new.viewer_count)
        if (payload.new?.status === 'ended') { leaveChannel(); setStatus('ended') }
      })
      .subscribe()
    sessSubRef.current = sub
  }

  const joinAgoraChannel = async (channel) => {
    if (!AgoraRef.current) {
      await new Promise(r => setTimeout(r, 2000))
      if (!AgoraRef.current) { setStatus('live'); return }
    }
    try {
      const AgoraRTC = AgoraRef.current
      AgoraRTC.setLogLevel(4)
      const client = AgoraRTC.createClient({ mode: 'live', codec: 'vp8' })
      await client.setClientRole('audience')
      await client.join(AGORA_APP_ID, channel, null, user?.id || Math.random())
      clientRef.current = client
      client.on('user-published', async (remoteUser, mediaType) => {
        await client.subscribe(remoteUser, mediaType)
        if (mediaType === 'video') remoteUser.videoTrack?.play(videoRef.current)
        if (mediaType === 'audio') remoteUser.audioTrack?.play()
      })
      client.on('user-unpublished', (remoteUser, mediaType) => {
        if (mediaType === 'video') remoteUser.videoTrack?.stop()
      })
      setStatus('live')
    } catch (e) {
      console.error('Agora viewer join error:', e)
      setStatus('live') // show chat even if video fails
    }
  }

  const leaveChannel = async () => {
    try {
      if (clientRef.current) await clientRef.current.leave()
      if (session && user) {
        await supabase.from('live_viewers').update({ left_at: new Date().toISOString() })
          .eq('session_id', session.id).eq('user_id', user.id)
        await supabase.rpc('decrement_viewers', { session_id_param: session.id })
      }
    } catch (e) {}
  }

  const sendMessage = async () => {
    if (!msgText.trim() || !session || !user) return
    const text = msgText.trim(); setMsgText('')
    await supabase.from('live_messages').insert({
      session_id: session.id, user_id: user.id, message: text, type: 'chat'
    })
  }

  const sendGift = async (g) => {
    if (!user || !session) return
    // Check coin balance
    const { data: prof } = await supabase.from('profiles').select('coin_balance').eq('id', user.id).single()
    const bal = prof?.coin_balance || 0
    if (bal < g.echo) {
      alert(`🪙 পর্যাপ্ত Coin নেই!\nদরকার: ${g.echo} coins\nতোমার আছে: ${bal} coins\n\nProfile > Coin Store থেকে কিনো।`)
      setShowGifts(false)
      return
    }
    // Deduct coins
    await supabase.from('profiles').update({ coin_balance: bal - g.echo }).eq('id', user.id)
    // Add transaction
    await supabase.from('coin_transactions').insert({
      user_id: user.id, amount: -g.echo, type: 'gift_sent',
      ref_id: session.id, note: `${g.emoji} ${g.name} sent in live`
    })
    // Add transaction for host (received)
    await supabase.from('coin_transactions').insert({
      user_id: session.user_id, amount: Math.floor(g.echo * 0.8), type: 'gift_received',
      ref_id: session.id, note: `${g.emoji} ${g.name} received from viewer`
    })
    // Update host balance (80% cut)
    const { data: hostProf } = await supabase.from('profiles').select('coin_balance').eq('id', session.user_id).single()
    await supabase.from('profiles').update({
      coin_balance: (hostProf?.coin_balance || 0) + Math.floor(g.echo * 0.8)
    }).eq('id', session.user_id)
    // Fetch sender name for notification
    const { data: senderProf } = await supabase.from('profiles')
      .select('username, full_name').eq('id', user.id).single()
    const senderName = senderProf?.full_name || senderProf?.username || 'কেউ'

    // Post message in live chat with sender name
    await supabase.from('live_messages').insert({
      session_id: session.id, user_id: user.id,
      message: `${g.emoji} @${senderName} ${g.name} gift করেছে!`, type: 'gift',
      gift_emoji: g.emoji, gift_amount: g.echo
    })
    // Notify host
    await supabase.from('notifications').insert({
      user_id: session.user_id, from_user_id: user.id,
      type: 'gift', read: false,
      message: `🎁 @${senderName} তোমার live এ ${g.emoji} ${g.name} gift করেছে! (+${Math.floor(g.echo*0.8)} coins)`
    })
    setUserCoins(p => p - g.echo)
    setShowGifts(false)
  }

  const toggleFollow = async () => {
    if (!user || !host) return
    if (isFollowing) {
      await supabase.from('followers').delete().eq('follower_id', user.id).eq('following_id', host.id)
      setIsFollowing(false)
    } else {
      await supabase.from('followers').insert({ follower_id: user.id, following_id: host.id })
      setIsFollowing(true)
    }
  }

  const addFloatingGift = (emoji, amount) => {
    const id = Date.now()
    setFloatingGifts(p => [...p, { id, emoji, amount }])
    setTimeout(() => setFloatingGifts(p => p.filter(g => g.id !== id)), 3000)
  }

  const pName = host?.full_name || host?.username || 'Host'

  if (status === 'not_found' || status === 'ended') return (
    <div style={{ minHeight:'100vh', background:'#070a10', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:'12px' }}>
      <div style={{ fontSize:'48px' }}>📺</div>
      <div style={{ color:'#eef2f7', fontWeight:'800', fontSize:'18px' }}>Live শেষ হয়ে গেছে</div>
      <div style={{ color:'#4a5568', fontSize:'13px' }}>এই Live আর চলছে না</div>
      <button onClick={() => window.location.href = '/feed'} style={{ marginTop:'10px', padding:'12px 24px', background:'linear-gradient(135deg,#00e5ff,#00ff88)', border:'none', borderRadius:'12px', color:'#070a12', fontWeight:'800', cursor:'pointer' }}>← Feed এ যাও</button>
    </div>
  )

  if (status === 'loading') return (
    <div style={{ minHeight:'100vh', background:'#000', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:'14px' }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ width:'48px', height:'48px', border:'3px solid rgba(255,255,255,.1)', borderTop:'3px solid #ff4560', borderRadius:'50%', animation:'spin 1s linear infinite' }}/>
      <div style={{ color:'rgba(255,255,255,.6)', fontSize:'13px' }}>Live যুক্ত হচ্ছে...</div>
    </div>
  )

  return (
    <div style={{ position:'fixed', inset:0, background:'#000', zIndex:999, display:'flex', flexDirection:'column' }}>
      <style>{`
        @keyframes floatUp{0%{transform:translateY(0);opacity:1}100%{transform:translateY(-200px) scale(1.4);opacity:0}}
        @keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
      `}</style>

      {/* Video */}
      <div ref={videoRef} style={{ position:'absolute', inset:0, background:'#111', zIndex:1 }}/>

      {/* Floating gifts */}
      {floatingGifts.map(g => (
        <div key={g.id} style={{ position:'absolute', bottom:'250px', left:'40%', zIndex:50, animation:'floatUp 3s ease forwards', pointerEvents:'none', textAlign:'center' }}>
          <div style={{ fontSize:'48px' }}>{g.emoji}</div>
          <div style={{ fontSize:'11px', color:'#ffd700', fontWeight:'800', background:'rgba(0,0,0,.7)', borderRadius:'8px', padding:'2px 8px' }}>+{g.echo} Echo</div>
        </div>
      ))}

      {/* TOP BAR */}
      <div style={{ position:'absolute', top:0, left:0, right:0, padding:'14px', display:'flex', alignItems:'center', gap:'8px', background:'linear-gradient(rgba(0,0,0,.7),transparent)', zIndex:20 }}>
        <button onClick={() => { leaveChannel(); window.location.href = '/feed' }} style={{ background:'rgba(0,0,0,.5)', border:'none', color:'#fff', fontSize:'20px', cursor:'pointer', borderRadius:'50%', width:'36px', height:'36px', display:'flex', alignItems:'center', justifyContent:'center' }}>←</button>
        {/* Host */}
        <div style={{ display:'flex', alignItems:'center', gap:'8px', background:'rgba(0,0,0,.5)', borderRadius:'20px', padding:'4px 12px 4px 4px', backdropFilter:'blur(8px)', flex:1, minWidth:0 }}>
          <div style={{ width:'30px', height:'30px', borderRadius:'50%', overflow:'hidden', background:'linear-gradient(135deg,#00e5ff,#00ff88)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'11px', fontWeight:'800', color:'#070a12', flexShrink:0 }}>
            {host?.avatar_url ? <img src={host.avatar_url} style={{ width:'100%', height:'100%', objectFit:'cover' }}/> : (pName[0]||'H').toUpperCase()}
          </div>
          <span style={{ fontSize:'12px', fontWeight:'700', color:'#fff', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{pName}</span>
          <div style={{ display:'flex', alignItems:'center', gap:'4px', background:'rgba(255,69,96,.85)', borderRadius:'6px', padding:'3px 8px', flexShrink:0 }}>
            <span style={{ width:'6px', height:'6px', borderRadius:'50%', background:'#fff', display:'inline-block', animation:'pulse 1s infinite' }}/>
            <span style={{ fontSize:'10px', fontWeight:'900', color:'#fff' }}>LIVE</span>
          </div>
        </div>
        {/* Viewers */}
        <div style={{ display:'flex', alignItems:'center', gap:'4px', background:'rgba(0,0,0,.5)', borderRadius:'8px', padding:'4px 10px', flexShrink:0 }}>
          <span style={{ fontSize:'12px' }}>👁</span>
          <span style={{ fontSize:'12px', fontWeight:'700', color:'#fff' }}>{fmtCount(viewerCount)}</span>
        </div>
        {/* Follow */}
        <button onClick={toggleFollow} style={{ padding:'6px 14px', background: isFollowing ? 'rgba(255,255,255,.1)' : 'linear-gradient(135deg,#ff4560,#ff6b35)', border: isFollowing ? '1px solid rgba(255,255,255,.2)' : 'none', borderRadius:'10px', color:'#fff', fontSize:'11px', fontWeight:'800', cursor:'pointer', flexShrink:0 }}>
          {isFollowing ? '✓' : '+ Follow'}
        </button>
        <button onClick={() => setMuted(p => !p)} style={{ background:'rgba(0,0,0,.5)', border:'none', color:'#fff', fontSize:'18px', cursor:'pointer', borderRadius:'50%', width:'36px', height:'36px', display:'flex', alignItems:'center', justifyContent:'center' }}>
          {muted ? '🔇' : '🔊'}
        </button>
      </div>

      {/* Live title */}
      {session?.title && (
        <div style={{ position:'absolute', top:'64px', left:'14px', right:'14px', zIndex:20 }}>
          <div style={{ fontSize:'13px', fontWeight:'700', color:'rgba(255,255,255,.9)', textShadow:'0 1px 4px rgba(0,0,0,.9)' }}>{session.title}</div>
        </div>
      )}

      {/* Chat */}
      <div style={{ position:'absolute', bottom:'80px', left:0, right:'0', zIndex:20, pointerEvents:'none' }}>
        <div ref={chatRef} style={{ maxHeight:'220px', overflowY:'auto', padding:'0 12px', display:'flex', flexDirection:'column', gap:'5px', scrollbarWidth:'none' }}>
          {messages.map((msg, i) => (
            <div key={msg.id || i} style={{ display:'inline-flex', pointerEvents:'auto' }}>
              {msg.type === 'gift' ? (
                <div style={{ background:'rgba(255,215,0,.15)', border:'1px solid rgba(255,215,0,.25)', borderRadius:'14px', padding:'5px 12px', display:'flex', alignItems:'center', gap:'5px' }}>
                  <span style={{ fontSize:'15px' }}>{msg.gift_emoji}</span>
                  <span style={{ fontSize:'11px', color:'#ffd700', fontWeight:'700' }}>{msg.profiles?.username || 'User'}</span>
                  <span style={{ fontSize:'11px', color:'rgba(255,255,255,.7)' }}>{msg.message}</span>
                </div>
              ) : msg.type === 'join' ? (
                <div style={{ background:'rgba(0,229,255,.08)', borderRadius:'12px', padding:'4px 10px' }}>
                  <span style={{ fontSize:'11px', color:'#00e5ff' }}>{msg.message}</span>
                </div>
              ) : (
                <div style={{ background:'rgba(0,0,0,.55)', borderRadius:'14px', padding:'5px 12px', backdropFilter:'blur(4px)' }}>
                  <span style={{ fontSize:'11px', color:'#00e5ff', fontWeight:'700' }}>{msg.profiles?.username || 'User'} </span>
                  <span style={{ fontSize:'12px', color:'rgba(255,255,255,.9)' }}>{msg.message}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Bottom input */}
      <div style={{ position:'absolute', bottom:0, left:0, right:0, padding:'10px 12px 28px', background:'linear-gradient(transparent,rgba(0,0,0,.8))', zIndex:20, display:'flex', gap:'8px' }}>
        <input value={msgText} onChange={e => setMsgText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendMessage()}
          placeholder='মন্তব্য করো...'
          style={{ flex:1, background:'rgba(255,255,255,.12)', border:'1px solid rgba(255,255,255,.12)', borderRadius:'22px', padding:'10px 16px', color:'#fff', fontSize:'13px', outline:'none' }}/>
        <button onClick={sendMessage} disabled={!msgText.trim()} style={{ width:'40px', height:'40px', borderRadius:'50%', background: msgText.trim() ? 'linear-gradient(135deg,#00e5ff,#00ff88)' : 'rgba(255,255,255,.1)', border:'none', cursor: msgText.trim() ? 'pointer' : 'default', fontSize:'16px', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          ➤
        </button>
        <button onClick={() => setShowGifts(p => !p)} style={{ width:'40px', height:'40px', borderRadius:'50%', background:'rgba(255,215,0,.15)', border:'1px solid rgba(255,215,0,.3)', cursor:'pointer', fontSize:'18px', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          🎁
        </button>
      </div>

      {/* Gift panel */}
      {showGifts && (
        <div style={{ position:'absolute', bottom:'80px', left:0, right:0, zIndex:30, background:'rgba(13,18,32,.95)', backdropFilter:'blur(12px)', borderTop:'1px solid rgba(255,255,255,.1)', padding:'16px', animation:'slideUp .25s ease' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'12px' }}>
            <div>
              <div style={{ fontSize:'13px', fontWeight:'800', color:'#eef2f7' }}>🎁 {pName} কে Gift পাঠাও</div>
              <div style={{ fontSize:'11px', color:'#ffd700', marginTop:'2px' }}>🪙 তোমার: {userCoins} coins · <span onClick={()=>window.location.href='/coins'} style={{ color:'#00e5ff', cursor:'pointer', textDecoration:'underline' }}>কিনো</span></div>
            </div>
            <button onClick={() => setShowGifts(false)} style={{ background:'none', border:'none', color:'#4a5568', fontSize:'18px', cursor:'pointer' }}>✕</button>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'8px' }}>
            {GIFTS.map((g, i) => (
              <div key={i} onClick={() => sendGift(g)}
                style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'3px', padding:'10px 6px',
                  background: userCoins >= g.echo ? 'rgba(255,255,255,.06)' : 'rgba(255,69,96,.04)',
                  borderRadius:'12px', cursor: userCoins >= g.echo ? 'pointer' : 'not-allowed',
                  border:`1px solid ${userCoins >= g.echo ? 'rgba(255,255,255,.08)' : 'rgba(255,69,96,.15)'}`,
                  opacity: userCoins >= g.echo ? 1 : 0.45 }}>
                <span style={{ fontSize:'28px' }}>{g.emoji}</span>
                <span style={{ fontSize:'10px', color:'#eef2f7', fontWeight:'700' }}>{g.name}</span>
                <span style={{ fontSize:'9px', color:'#ffd700' }}>🪙 {g.echo}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
              }
