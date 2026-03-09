'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const AGORA_APP_ID = process.env.NEXT_PUBLIC_AGORA_APP_ID || '9fda9c95b7434484b73b29d0cf5ace3c'

const GIFTS = [
  { emoji:'🌹', name:'Rose',    echo: 5,   anim:'💫' },
  { emoji:'🎂', name:'Cake',    echo: 10,  anim:'🎊' },
  { emoji:'💎', name:'Diamond', echo: 50,  anim:'✨' },
  { emoji:'👑', name:'Crown',   echo: 100, anim:'🌟' },
  { emoji:'🚀', name:'Rocket',  echo: 200, anim:'🚀' },
  { emoji:'🏆', name:'Trophy',  echo: 500, anim:'🏆' },
  { emoji:'🌟', name:'Star',    echo: 20,  anim:'⭐' },
  { emoji:'❤️', name:'Heart',   echo: 15,  anim:'❤️' },
]

const fmtCount = n => !n?'0':n>=1000000?(n/1000000).toFixed(1)+'M':n>=1000?(n/1000).toFixed(1)+'K':String(n)

// ══════════════════════════════════════════════════════
// LIVE BROADCASTER PAGE  (app/live/broadcast/page.js)
// ══════════════════════════════════════════════════════
export default function LiveBroadcast() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [liveStatus, setLiveStatus] = useState('check') // check|no_sub|starting|live|ended
  const [agoraClient, setAgoraClient] = useState(null)
  const [localTrack, setLocalTrack] = useState(null)
  const [audioTrack, setAudioTrack] = useState(null)
  const [session, setSession] = useState(null)
  const [title, setTitle] = useState('')
  const [messages, setMessages] = useState([])
  const [msgText, setMsgText] = useState('')
  const [viewerCount, setViewerCount] = useState(0)
  const [cameraOn, setCameraOn] = useState(true)
  const [micOn, setMicOn] = useState(true)
  const [showGifts, setShowGifts] = useState(false)
  const [floatingGifts, setFloatingGifts] = useState([])
  const [beauty, setBeauty] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [isFront, setIsFront] = useState(true)
  const [loading, setLoading] = useState(false)
  const [agoraLoaded, setAgoraLoaded] = useState(false)
  const videoRef = useRef(null)
  const chatRef = useRef(null)
  const msgSubRef = useRef(null)
  const viewerSubRef = useRef(null)
  const AgoraRef = useRef(null)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { window.location.href = '/'; return }
      const u = data.session.user; setUser(u)
      const { data: p } = await supabase.from('profiles').select('*').eq('id', u.id).single()
      setProfile(p)
      // Check live subscription
      const { data: sub } = await supabase.from('live_subscriptions')
        .select('*').eq('user_id', u.id)
        .in('status', ['active', 'free'])
        .gt('expires_at', new Date().toISOString())
        .limit(1).single()
      // Check $1000+ investment
      const { data: inv } = await supabase.from('investments')
        .select('amount').eq('user_id', u.id).eq('status', 'active')
      const total = (inv || []).reduce((s, i) => s + (parseFloat(i.amount) || 0), 0)
      if (sub || total >= 1000) {
        setLiveStatus('ready')
      } else {
        setLiveStatus('no_sub')
      }
    })
    // Load Agora SDK dynamically
    const script = document.createElement('script')
    script.src = 'https://download.agora.io/sdk/release/AgoraRTC_N-4.21.0.js'
    script.onload = () => { AgoraRef.current = window.AgoraRTC; setAgoraLoaded(true) }
    script.onerror = () => console.error('Agora SDK load failed')
    document.head.appendChild(script)
    return () => { document.head.removeChild(script) }
  }, [])

  const startLive = async () => {
    if (!title.trim()) { alert('Live এর একটা title দাও!'); return }
    if (!agoraLoaded || !AgoraRef.current) { alert('SDK loading... একটু অপেক্ষা করো'); return }
    setLoading(true)
    try {
      const channelName = `echo_${user.id}_${Date.now()}`
      // Create session in DB
      const { data: sess, error } = await supabase.from('live_sessions').insert({
        user_id: user.id,
        channel_name: channelName,
        title: title.trim(),
        status: 'active',
        thumbnail_url: profile?.avatar_url || null
      }).select().single()
      if (error) throw error
      setSession(sess)

      // Init Agora
      const AgoraRTC = AgoraRef.current
      AgoraRTC.setLogLevel(4)
      const client = AgoraRTC.createClient({ mode: 'live', codec: 'vp8' })
      await client.setClientRole('host')
      await client.join(AGORA_APP_ID, channelName, null, user.id)

      // Camera + Mic tracks
      const [mic, cam] = await AgoraRTC.createMicrophoneAndCameraTracks(
        { encoderConfig: 'music_standard' },
        { encoderConfig: '720p_2', facingMode: 'user' }
      )
      await client.publish([mic, cam])
      cam.play(videoRef.current)
      setAgoraClient(client)
      setLocalTrack(cam)
      setAudioTrack(mic)
      setLiveStatus('live')
      setViewerCount(0)
      subscribeToMessages(sess.id)
      subscribeToViewers(sess.id)
    } catch (e) {
      console.error('Start live error:', e)
      alert('Live শুরু করতে সমস্যা: ' + e.message)
    }
    setLoading(false)
  }

  const endLive = async () => {
    if (!confirm('Live শেষ করবে?')) return
    try {
      if (localTrack) { localTrack.stop(); localTrack.close() }
      if (audioTrack) { audioTrack.stop(); audioTrack.close() }
      if (agoraClient) { await agoraClient.leave() }
      if (session) {
        await supabase.from('live_sessions').update({
          status: 'ended', ended_at: new Date().toISOString()
        }).eq('id', session.id)
      }
      msgSubRef.current?.unsubscribe()
      viewerSubRef.current?.unsubscribe()
    } catch (e) { console.error('End live error:', e) }
    setLiveStatus('ended')
  }

  const subscribeToMessages = (sessionId) => {
    // Load existing
    supabase.from('live_messages').select('*, profiles(username, avatar_url)')
      .eq('session_id', sessionId).order('created_at', { ascending: false }).limit(50)
      .then(({ data }) => setMessages((data || []).reverse()))
    // Realtime
    const sub = supabase.channel(`live_chat_${sessionId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'live_messages',
        filter: `session_id=eq.${sessionId}`
      }, payload => {
        const msg = payload.new
        setMessages(p => [...p.slice(-99), msg])
        if (msg.type === 'gift') showFloatingGift(msg.gift_emoji, msg.gift_amount)
        if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight
      })
      .subscribe()
    msgSubRef.current = sub
  }

  const subscribeToViewers = (sessionId) => {
    const sub = supabase.channel(`live_viewers_${sessionId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'live_sessions',
        filter: `id=eq.${sessionId}`
      }, payload => {
        if (payload.new?.viewer_count !== undefined)
          setViewerCount(payload.new.viewer_count)
      })
      .subscribe()
    viewerSubRef.current = sub
  }

  const sendMessage = async () => {
    if (!msgText.trim() || !session || !user) return
    const text = msgText.trim(); setMsgText('')
    await supabase.from('live_messages').insert({
      session_id: session.id, user_id: user.id,
      message: text, type: 'chat'
    })
  }

  const showFloatingGift = (emoji, amount) => {
    const id = Date.now()
    setFloatingGifts(p => [...p, { id, emoji, amount }])
    setTimeout(() => setFloatingGifts(p => p.filter(g => g.id !== id)), 3000)
  }

  const toggleCamera = async () => {
    if (localTrack) { await localTrack.setEnabled(!cameraOn); setCameraOn(p => !p) }
  }
  const toggleMic = async () => {
    if (audioTrack) { await audioTrack.setEnabled(!micOn); setMicOn(p => !p) }
  }
  const flipCamera = async () => {
    if (!AgoraRef.current || !agoraClient) return
    try {
      if (localTrack) { localTrack.stop(); localTrack.close() }
      const newCam = await AgoraRef.current.createCameraVideoTrack({
        encoderConfig: '720p_2', facingMode: isFront ? 'environment' : 'user'
      })
      await agoraClient.unpublish([localTrack])
      await agoraClient.publish([newCam])
      newCam.play(videoRef.current)
      setLocalTrack(newCam); setIsFront(p => !p)
    } catch (e) { console.error('Flip error:', e) }
  }

  const pName = profile?.full_name || profile?.username || 'Host'

  // ── NO SUBSCRIPTION ──
  if (liveStatus === 'no_sub') return (
    <div style={{ minHeight:'100vh', background:'#070a10', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', padding:'24px' }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ fontSize:'56px', marginBottom:'16px' }}>🔴</div>
      <div style={{ fontSize:'20px', fontWeight:'900', color:'#eef2f7', marginBottom:'8px', textAlign:'center' }}>Live Subscription নেই</div>
      <div style={{ fontSize:'13px', color:'#4a5568', textAlign:'center', lineHeight:'1.7', marginBottom:'24px' }}>Live করতে ১৫ USDT/মাস subscription দরকার।<br/>অথবা ১০০০+ USDT invest করলে সম্পূর্ণ free।</div>
      <button onClick={() => window.location.href = '/feed'} style={{ padding:'14px 28px', background:'linear-gradient(135deg,#ff4560,#ff6b35)', border:'none', borderRadius:'14px', color:'#fff', fontSize:'14px', fontWeight:'800', cursor:'pointer', marginBottom:'10px' }}>
        💳 Subscribe করুন
      </button>
      <button onClick={() => window.location.href = '/feed'} style={{ padding:'12px 24px', background:'rgba(255,255,255,.07)', border:'none', borderRadius:'12px', color:'#eef2f7', fontSize:'13px', fontWeight:'600', cursor:'pointer' }}>← Back</button>
    </div>
  )

  // ── ENDED ──
  if (liveStatus === 'ended') return (
    <div style={{ minHeight:'100vh', background:'#070a10', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', padding:'24px' }}>
      <div style={{ fontSize:'56px', marginBottom:'16px' }}>🏁</div>
      <div style={{ fontSize:'22px', fontWeight:'900', color:'#eef2f7', marginBottom:'6px' }}>Live শেষ হয়েছে!</div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', width:'100%', maxWidth:'280px', marginBottom:'24px' }}>
        {[['👥','Viewers',fmtCount(session?.peak_viewers||0)],['💬','Messages',fmtCount(messages.length)],['⏱','Duration','--'],['🎁','Gifts',fmtCount(session?.total_gifts_received||0)]].map(([ic,lb,vl],i) => (
          <div key={i} style={{ background:'#111826', borderRadius:'12px', padding:'14px', textAlign:'center', border:'1px solid rgba(255,255,255,.07)' }}>
            <div style={{ fontSize:'22px' }}>{ic}</div>
            <div style={{ fontSize:'18px', fontWeight:'900', color:'#00e5ff' }}>{vl}</div>
            <div style={{ fontSize:'10px', color:'#4a5568' }}>{lb}</div>
          </div>
        ))}
      </div>
      <button onClick={() => window.location.href = '/feed'} style={{ padding:'14px 28px', background:'linear-gradient(135deg,#00e5ff,#00ff88)', border:'none', borderRadius:'14px', color:'#070a12', fontSize:'14px', fontWeight:'800', cursor:'pointer' }}>← Feed এ যাও</button>
    </div>
  )

  // ── READY TO START ──
  if (liveStatus === 'ready' || liveStatus === 'check') return (
    <div style={{ minHeight:'100vh', background:'#070a10', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', padding:'20px' }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.05)}}`}</style>
      <div style={{ width:'100%', maxWidth:'400px' }}>
        <button onClick={() => window.location.href = '/feed'} style={{ background:'none', border:'none', color:'#4a5568', fontSize:'13px', cursor:'pointer', marginBottom:'20px', display:'flex', alignItems:'center', gap:'6px' }}>← Back</button>
        <div style={{ textAlign:'center', marginBottom:'28px' }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:'8px', background:'rgba(255,69,96,.12)', border:'1px solid rgba(255,69,96,.3)', borderRadius:'20px', padding:'8px 20px', marginBottom:'14px' }}>
            <span style={{ width:'9px', height:'9px', borderRadius:'50%', background:'#ff4560', display:'inline-block', animation:'pulse 1.5s infinite' }}/>
            <span style={{ fontSize:'13px', fontWeight:'900', color:'#ff4560', letterSpacing:'2px' }}>LIVE</span>
          </div>
          <div style={{ fontSize:'22px', fontWeight:'900', color:'#eef2f7' }}>Live শুরু করো</div>
        </div>
        {/* Avatar preview */}
        <div style={{ display:'flex', alignItems:'center', gap:'12px', background:'#111826', borderRadius:'16px', padding:'14px', marginBottom:'16px', border:'1px solid rgba(255,255,255,.07)' }}>
          <div style={{ width:'52px', height:'52px', borderRadius:'50%', background:'linear-gradient(135deg,#00e5ff,#00ff88)', overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'20px', fontWeight:'800', color:'#070a12', flexShrink:0 }}>
            {profile?.avatar_url ? <img src={profile.avatar_url} style={{ width:'100%', height:'100%', objectFit:'cover' }}/> : (pName[0]||'U').toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize:'14px', fontWeight:'800', color:'#eef2f7' }}>{pName}</div>
            <div style={{ fontSize:'11px', color:'#00ff88' }}>✅ Live করার অনুমতি আছে</div>
          </div>
        </div>
        {/* Title input */}
        <div style={{ marginBottom:'14px' }}>
          <div style={{ fontSize:'12px', color:'#4a5568', marginBottom:'6px', fontWeight:'700' }}>Live Title *</div>
          <input value={title} onChange={e => setTitle(e.target.value)} maxLength={60}
            placeholder='আজকের Live কিসের বিষয়ে?'
            style={{ width:'100%', background:'rgba(255,255,255,.06)', border:'1px solid rgba(255,255,255,.12)', borderRadius:'12px', padding:'12px 14px', color:'#eef2f7', fontSize:'14px', outline:'none' }}/>
        </div>
        {/* Tips */}
        <div style={{ background:'rgba(0,229,255,.06)', border:'1px solid rgba(0,229,255,.12)', borderRadius:'12px', padding:'12px 14px', marginBottom:'20px' }}>
          {[['📱','ভালো আলোতে বসো'],['🔊','শান্ত জায়গা বেছে নাও'],['💬','Followers দের আগে জানাও'],['🔋','Phone charge রাখো']].map(([ic,tip],i) => (
            <div key={i} style={{ display:'flex', gap:'8px', alignItems:'center', marginBottom: i<3?'6px':0 }}>
              <span>{ic}</span><span style={{ fontSize:'12px', color:'#8892a4' }}>{tip}</span>
            </div>
          ))}
        </div>
        <button onClick={startLive} disabled={loading || !title.trim() || liveStatus==='check'}
          style={{ width:'100%', padding:'16px', background: title.trim()&&!loading ? 'linear-gradient(135deg,#ff4560,#ff6b35)' : 'rgba(255,255,255,.06)', border:'none', borderRadius:'16px', color: title.trim()&&!loading ? '#fff' : '#4a5568', fontSize:'16px', fontWeight:'900', cursor: title.trim()&&!loading ? 'pointer' : 'default', boxShadow: title.trim() ? '0 4px 24px rgba(255,69,96,.35)' : 'none' }}>
          {loading ? '⏳ শুরু হচ্ছে...' : '🔴 Live শুরু করো'}
        </button>
      </div>
    </div>
  )

  // ── LIVE BROADCASTING ──
  return (
    <div style={{ position:'fixed', inset:0, background:'#000', zIndex:999, display:'flex', flexDirection:'column' }}>
      <style>{`
        @keyframes floatUp{0%{transform:translateY(0) scale(1);opacity:1}100%{transform:translateY(-200px) scale(1.5);opacity:0}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.6}}
      `}</style>

      {/* Camera */}
      <div ref={videoRef} style={{ position:'absolute', inset:0, background:'#000', zIndex:1 }}/>
      {!cameraOn && (
        <div style={{ position:'absolute', inset:0, background:'#111', display:'flex', alignItems:'center', justifyContent:'center', zIndex:2 }}>
          <div style={{ fontSize:'56px', opacity:.4 }}>📷</div>
        </div>
      )}

      {/* Floating gifts */}
      {floatingGifts.map(g => (
        <div key={g.id} style={{ position:'absolute', bottom:'200px', left:'50%', transform:'translateX(-50%)', zIndex:50, animation:'floatUp 3s ease forwards', textAlign:'center', pointerEvents:'none' }}>
          <div style={{ fontSize:'52px' }}>{g.emoji}</div>
          <div style={{ fontSize:'12px', color:'#ffd700', fontWeight:'800', background:'rgba(0,0,0,.7)', borderRadius:'10px', padding:'2px 8px' }}>+{g.amount} Echo</div>
        </div>
      ))}

      {/* TOP BAR */}
      <div style={{ position:'absolute', top:0, left:0, right:0, padding:'14px 14px 0', display:'flex', alignItems:'center', gap:'10px', background:'linear-gradient(rgba(0,0,0,.7),transparent)', zIndex:20 }}>
        {/* Host info */}
        <div style={{ display:'flex', alignItems:'center', gap:'8px', background:'rgba(0,0,0,.5)', borderRadius:'20px', padding:'5px 12px 5px 5px', backdropFilter:'blur(8px)' }}>
          <div style={{ width:'32px', height:'32px', borderRadius:'50%', overflow:'hidden', background:'linear-gradient(135deg,#00e5ff,#00ff88)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'13px', fontWeight:'800', color:'#070a12' }}>
            {profile?.avatar_url ? <img src={profile.avatar_url} style={{ width:'100%', height:'100%', objectFit:'cover' }}/> : (pName[0]||'U').toUpperCase()}
          </div>
          <span style={{ fontSize:'12px', fontWeight:'700', color:'#fff' }}>{pName}</span>
        </div>
        {/* Live badge */}
        <div style={{ display:'flex', alignItems:'center', gap:'5px', background:'rgba(255,69,96,.9)', borderRadius:'8px', padding:'4px 10px' }}>
          <span style={{ width:'7px', height:'7px', borderRadius:'50%', background:'#fff', display:'inline-block', animation:'pulse 1s infinite' }}/>
          <span style={{ fontSize:'11px', fontWeight:'900', color:'#fff', letterSpacing:'1px' }}>LIVE</span>
        </div>
        {/* Viewers */}
        <div style={{ display:'flex', alignItems:'center', gap:'5px', background:'rgba(0,0,0,.5)', borderRadius:'8px', padding:'4px 10px', backdropFilter:'blur(4px)' }}>
          <span style={{ fontSize:'12px' }}>👁</span>
          <span style={{ fontSize:'12px', fontWeight:'700', color:'#fff' }}>{fmtCount(viewerCount)}</span>
        </div>
        <div style={{ flex:1 }}/>
        {/* End button */}
        <button onClick={endLive} style={{ background:'rgba(255,69,96,.9)', border:'none', borderRadius:'10px', padding:'7px 14px', color:'#fff', fontSize:'12px', fontWeight:'800', cursor:'pointer' }}>
          End
        </button>
      </div>

      {/* Title */}
      <div style={{ position:'absolute', top:'62px', left:'14px', right:'14px', zIndex:20 }}>
        <div style={{ fontSize:'13px', fontWeight:'700', color:'rgba(255,255,255,.9)', textShadow:'0 1px 4px rgba(0,0,0,.8)' }}>{title}</div>
      </div>

      {/* Right controls */}
      <div style={{ position:'absolute', right:'14px', bottom:'220px', display:'flex', flexDirection:'column', gap:'12px', zIndex:20 }}>
        {[
          { icon: micOn ? '🎙' : '🔇', action: toggleMic, active: micOn },
          { icon: cameraOn ? '📷' : '📷', action: toggleCamera, active: cameraOn },
          { icon: '🔄', action: flipCamera, active: true },
          { icon: '🎁', action: () => setShowGifts(p => !p), active: showGifts },
          { icon: '⚙️', action: () => setShowSettings(p => !p), active: showSettings },
        ].map((btn, i) => (
          <button key={i} onClick={btn.action} style={{ width:'46px', height:'46px', borderRadius:'50%', background: btn.active ? 'rgba(0,0,0,.65)' : 'rgba(255,69,96,.3)', border:`1px solid ${btn.active ? 'rgba(255,255,255,.2)' : 'rgba(255,69,96,.5)'}`, backdropFilter:'blur(8px)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', fontSize:'20px' }}>
            {btn.icon}
          </button>
        ))}
      </div>

      {/* Chat area */}
      <div style={{ position:'absolute', bottom:'80px', left:0, right:'70px', zIndex:20, pointerEvents:'none' }}>
        <div ref={chatRef} style={{ maxHeight:'200px', overflowY:'auto', padding:'0 12px', display:'flex', flexDirection:'column', gap:'6px', scrollbarWidth:'none' }}>
          {messages.map((msg, i) => (
            <div key={msg.id || i} style={{ display:'inline-flex', alignItems:'center', gap:'6px', pointerEvents:'auto' }}>
              {msg.type === 'gift' ? (
                <div style={{ background:'rgba(255,215,0,.15)', border:'1px solid rgba(255,215,0,.3)', borderRadius:'16px', padding:'5px 12px', display:'flex', alignItems:'center', gap:'6px' }}>
                  <span style={{ fontSize:'16px' }}>{msg.gift_emoji}</span>
                  <span style={{ fontSize:'11px', color:'#ffd700', fontWeight:'700' }}>{msg.profiles?.username || 'User'}</span>
                  <span style={{ fontSize:'11px', color:'rgba(255,255,255,.7)' }}>sent {msg.gift_emoji}</span>
                </div>
              ) : msg.type === 'join' ? (
                <div style={{ background:'rgba(0,229,255,.1)', borderRadius:'12px', padding:'4px 10px' }}>
                  <span style={{ fontSize:'11px', color:'#00e5ff' }}>👋 {msg.message}</span>
                </div>
              ) : (
                <div style={{ background:'rgba(0,0,0,.55)', borderRadius:'16px', padding:'6px 12px', backdropFilter:'blur(4px)' }}>
                  <span style={{ fontSize:'11px', color:'#00e5ff', fontWeight:'700' }}>{msg.profiles?.username || 'User'} </span>
                  <span style={{ fontSize:'12px', color:'rgba(255,255,255,.9)' }}>{msg.message}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Chat input */}
      <div style={{ position:'absolute', bottom:0, left:0, right:0, padding:'10px 14px 28px', background:'linear-gradient(transparent,rgba(0,0,0,.8))', zIndex:20, display:'flex', gap:'8px' }}>
        <input value={msgText} onChange={e => setMsgText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendMessage()}
          placeholder='Live chat এ লেখো...'
          style={{ flex:1, background:'rgba(255,255,255,.12)', border:'1px solid rgba(255,255,255,.15)', borderRadius:'22px', padding:'10px 16px', color:'#fff', fontSize:'13px', outline:'none', backdropFilter:'blur(8px)' }}/>
        <button onClick={sendMessage} disabled={!msgText.trim()} style={{ width:'40px', height:'40px', borderRadius:'50%', background: msgText.trim() ? 'linear-gradient(135deg,#00e5ff,#00ff88)' : 'rgba(255,255,255,.1)', border:'none', cursor: msgText.trim() ? 'pointer' : 'default', fontSize:'18px', display:'flex', alignItems:'center', justifyContent:'center' }}>
          ➤
        </button>
        <button onClick={() => setShowGifts(p => !p)} style={{ width:'40px', height:'40px', borderRadius:'50%', background:'rgba(255,215,0,.15)', border:'1px solid rgba(255,215,0,.3)', cursor:'pointer', fontSize:'18px', display:'flex', alignItems:'center', justifyContent:'center' }}>
          🎁
        </button>
      </div>

      {/* Gift panel */}
      {showGifts && (
        <div style={{ position:'absolute', bottom:'80px', left:0, right:0, zIndex:30, background:'rgba(13,18,32,.95)', backdropFilter:'blur(12px)', borderTop:'1px solid rgba(255,255,255,.1)', padding:'16px', animation:'slideUp .25s ease' }}>
          <div style={{ fontSize:'13px', fontWeight:'800', color:'#eef2f7', marginBottom:'12px' }}>🎁 Gift (Host কে পাঠাও)</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'8px' }}>
            {GIFTS.map((g, i) => (
              <div key={i} onClick={async () => {
                if (!user || !session) return
                await supabase.from('live_messages').insert({
                  session_id: session.id, user_id: user.id,
                  message: `${g.emoji} ${g.name}`, type: 'gift',
                  gift_emoji: g.emoji, gift_amount: g.echo
                })
                await supabase.from('live_sessions').update({
                  total_gifts_received: (session.total_gifts_received || 0) + g.echo
                }).eq('id', session.id)
                showFloatingGift(g.emoji, g.echo)
                setShowGifts(false)
              }} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'4px', padding:'10px 6px', background:'rgba(255,255,255,.06)', borderRadius:'12px', cursor:'pointer', border:'1px solid rgba(255,255,255,.08)' }}>
                <span style={{ fontSize:'28px' }}>{g.emoji}</span>
                <span style={{ fontSize:'10px', color:'#eef2f7', fontWeight:'700' }}>{g.name}</span>
                <span style={{ fontSize:'9px', color:'#ffd700' }}>{g.echo} Echo</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
                                         }
