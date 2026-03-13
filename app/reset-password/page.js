'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default function ResetPassword() {
  const [password, setPassword]     = useState('')
  const [confirm,  setConfirm]      = useState('')
  const [showPass, setShowPass]     = useState(false)
  const [loading,  setLoading]      = useState(false)
  const [success,  setSuccess]      = useState(false)
  const [error,    setError]        = useState('')
  const [ready,    setReady]        = useState(false)

  useEffect(() => {
    // Supabase reset link এ access_token থাকে — session set হবে
    supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setReady(true)
      }
    })
    // Already has session
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true)
    })
  }, [])

  const handleReset = async () => {
    if (!password) { setError('নতুন password দাও'); return }
    if (password.length < 6) { setError('কমপক্ষে ৬ অক্ষর দাও'); return }
    if (password !== confirm) { setError('Password দুটো মিলছে না'); return }
    setLoading(true); setError('')
    const { error: e } = await supabase.auth.updateUser({ password })
    if (e) { setError(e.message); setLoading(false); return }
    setSuccess(true)
    setTimeout(() => window.location.href = '/', 2500)
  }

  return (
    <div style={{ minHeight:'100vh', background:'#070a10', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        *{box-sizing:border-box}
      `}</style>

      <div style={{ width:'100%', maxWidth:400, animation:'fadeUp .35s ease' }}>

        {/* Logo */}
        <div style={{ textAlign:'center', marginBottom:32 }}>
          <svg width="56" height="62" viewBox="0 0 100 110">
            <polygon points="50,5 95,30 95,80 50,105 5,80 5,30" fill="none" stroke="#00e5ff" strokeWidth="3"/>
            <text x="50" y="68" textAnchor="middle" fontFamily="Arial Black" fontWeight="900" fontSize="42" fill="#00e5ff">E</text>
          </svg>
          <div style={{ fontSize:26, fontWeight:900, background:'linear-gradient(90deg,#00e5ff,#00ff88)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', marginTop:8 }}>ECHO WORLD</div>
        </div>

        <div style={{ background:'rgba(17,22,32,.9)', border:'1px solid rgba(255,255,255,.08)', borderRadius:24, padding:28, backdropFilter:'blur(20px)' }}>

          {success ? (
            <div style={{ textAlign:'center', padding:'20px 0' }}>
              <div style={{ fontSize:56, marginBottom:12 }}>✅</div>
              <div style={{ fontSize:18, fontWeight:900, color:'#00ff88', marginBottom:8 }}>Password পরিবর্তন হয়েছে!</div>
              <div style={{ fontSize:13, color:'#4a5568' }}>Login page এ যাচ্ছো...</div>
            </div>
          ) : (
            <>
              <div style={{ textAlign:'center', marginBottom:24 }}>
                <div style={{ fontSize:32, marginBottom:8 }}>🔑</div>
                <div style={{ fontSize:18, fontWeight:900, color:'#eef2f7', marginBottom:4 }}>নতুন Password দাও</div>
                <div style={{ fontSize:12, color:'#4a5568' }}>কমপক্ষে ৬ অক্ষর</div>
              </div>

              {error && (
                <div style={{ background:'rgba(255,69,96,.1)', border:'1px solid rgba(255,69,96,.2)', borderRadius:10, padding:'10px 14px', marginBottom:16, fontSize:13, color:'#ff4560', textAlign:'center' }}>
                  ⚠️ {error}
                </div>
              )}

              {!ready && (
                <div style={{ background:'rgba(255,165,0,.08)', border:'1px solid rgba(255,165,0,.2)', borderRadius:10, padding:'10px 14px', marginBottom:16, fontSize:12, color:'#ffa500', textAlign:'center' }}>
                  ⏳ Link verify হচ্ছে...
                </div>
              )}

              <div style={{ marginBottom:14 }}>
                <div style={{ fontSize:11, color:'#4a5568', fontWeight:600, marginBottom:6, letterSpacing:1 }}>নতুন PASSWORD</div>
                <div style={{ position:'relative' }}>
                  <input
                    value={password}
                    onChange={e=>setPassword(e.target.value)}
                    type={showPass ? 'text' : 'password'}
                    placeholder="নতুন password"
                    style={{ width:'100%', background:'#0c1018', border:'1px solid rgba(255,255,255,.08)', borderRadius:12, padding:'12px 44px 12px 14px', color:'#eef2f7', fontSize:14, outline:'none' }}
                  />
                  <button onClick={()=>setShowPass(!showPass)} style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:'#4a5568', cursor:'pointer', fontSize:16 }}>
                    {showPass ? '🙈' : '👁'}
                  </button>
                </div>
                {password && (
                  <div style={{ marginTop:6, height:4, background:'rgba(255,255,255,.05)', borderRadius:2, overflow:'hidden' }}>
                    <div style={{ height:'100%', width: password.length>=10?'100%':password.length>=6?'60%':'30%', background: password.length>=10?'#00ff88':password.length>=6?'#ffca28':'#ff4560', borderRadius:2, transition:'all .3s' }}/>
                  </div>
                )}
              </div>

              <div style={{ marginBottom:20 }}>
                <div style={{ fontSize:11, color:'#4a5568', fontWeight:600, marginBottom:6, letterSpacing:1 }}>PASSWORD নিশ্চিত করো</div>
                <input
                  value={confirm}
                  onChange={e=>setConfirm(e.target.value)}
                  type={showPass ? 'text' : 'password'}
                  placeholder="আবার লেখো"
                  onKeyDown={e=>e.key==='Enter'&&handleReset()}
                  style={{ width:'100%', background:'#0c1018', border:`1px solid ${confirm && password===confirm ? 'rgba(0,255,136,.3)' : confirm ? 'rgba(255,69,96,.3)' : 'rgba(255,255,255,.08)'}`, borderRadius:12, padding:'12px 14px', color:'#eef2f7', fontSize:14, outline:'none' }}
                />
                {confirm && password !== confirm && (
                  <div style={{ fontSize:11, color:'#ff4560', marginTop:4 }}>❌ Password মিলছে না</div>
                )}
                {confirm && password === confirm && password.length >= 6 && (
                  <div style={{ fontSize:11, color:'#00ff88', marginTop:4 }}>✅ Password মিলছে</div>
                )}
              </div>

              <button
                onClick={handleReset}
                disabled={loading || !ready || password.length < 6 || password !== confirm}
                style={{
                  width:'100%', padding:14, border:'none', borderRadius:14,
                  background: (!loading && ready && password.length >= 6 && password === confirm)
                    ? 'linear-gradient(135deg,#00e5ff,#00ff88)'
                    : 'rgba(255,255,255,.05)',
                  color: (!loading && ready && password.length >= 6 && password === confirm) ? '#070a10' : '#4a5568',
                  fontSize:15, fontWeight:800,
                  cursor: (!loading && ready && password.length >= 6 && password === confirm) ? 'pointer' : 'default',
                  transition:'all .2s'
                }}
              >
                {loading ? (
                  <span style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
                    <span style={{ width:16, height:16, border:'2px solid rgba(6,8,16,.3)', borderTopColor:'#060810', borderRadius:'50%', display:'inline-block', animation:'spin 1s linear infinite' }}/>
                    পরিবর্তন হচ্ছে...
                  </span>
                ) : '🔑 Password পরিবর্তন করো'}
              </button>

              <button onClick={()=>window.location.href='/'} style={{ width:'100%', marginTop:10, padding:11, background:'none', border:'none', color:'#4a5568', fontSize:13, cursor:'pointer' }}>
                ← Login এ ফিরে যাও
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
      }
