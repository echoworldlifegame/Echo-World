'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default function Home() {
  const [step,             setStep]             = useState('splash')
  const [authMode,         setAuthMode]         = useState('login')
  const [email,            setEmail]            = useState('')
  const [password,         setPassword]         = useState('')
  const [fullName,         setFullName]         = useState('')
  const [username,         setUsername]         = useState('')
  const [phone,            setPhone]            = useState('')
  const [dob,              setDob]              = useState('')
  const [gender,           setGender]           = useState('')
  const [referralCode,     setReferralCode]     = useState('')
  const [referralValid,    setReferralValid]    = useState(null)
  const [referralUsername, setReferralUsername] = useState('')
  const [loading,          setLoading]          = useState(false)
  const [error,            setError]            = useState('')
  const [signupStep,       setSignupStep]       = useState(1) // 1 | 2 | 3 | 4(OTP)
  const [showPass,         setShowPass]         = useState(false)

  // OTP state
  const [otp,         setOtp]         = useState(['','','','','','','',''])
  const [otpLoading,  setOtpLoading]  = useState(false)
  const [otpError,    setOtpError]    = useState('')
  const [resendTimer, setResendTimer] = useState(60)
  const [resending,   setResending]   = useState(false)
  const [otpShake,    setOtpShake]    = useState(false)
  const inputRefs = useRef([])

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) window.location.href = '/feed'
    })
    const params = new URLSearchParams(window.location.search)
    const ref = params.get('ref')
    if (ref) { setReferralCode(ref); setAuthMode('signup') }
    setTimeout(() => setStep('auth'), 2800)
  }, [])

  // Resend countdown
  useEffect(() => {
    if (resendTimer <= 0) return
    const t = setTimeout(() => setResendTimer(r => r - 1), 1000)
    return () => clearTimeout(t)
  }, [resendTimer])

  // Auto-submit OTP when 8 digits filled
  useEffect(() => {
    if (signupStep === 4 && otp.every(d => d !== '') && !otpLoading) {
      verifyOTP(otp.join(''))
    }
  }, [otp])

  // ── Referral verify ──
    const verifyReferralCode = async (code) => {
    if (!code || !code.trim() || code.trim().length < 2) { setReferralValid(null); return }
    const q = code.trim().toLowerCase()
    // username অথবা referral_code দিয়ে খোঁজো
    const { data: p1 } = await supabase.from('profiles').select('id, username').eq('username', q).maybeSingle()
    const { data: p2 } = await supabase.from('profiles').select('id, username').eq('referral_code', q).maybeSingle()
    const p = p1 || p2
    if (p) { setReferralValid(true); setReferralUsername(p.username) }
    else { setReferralValid(false); setReferralUsername('') }
  }

  // ── Login ──
  const handleLogin = async () => {
    if (!email || !password) { setError('Email and password required'); return }
    setLoading(true); setError('')
    const { error: e } = await supabase.auth.signInWithPassword({ email, password })
    if (e) { setError(e.message); setLoading(false) }
    else window.location.href = '/feed'
  }

  // ── Signup (steps 1-3) ──
  const handleSignup = async () => {
    // Step 1: email + password validation
    if (signupStep === 1) {
      if (!email || !password) { setError('Email and password required'); return }
      if (password.length < 6) { setError('Password must be at least 6 characters'); return }
      setSignupStep(2); setError(''); return
    }
    // Step 2: name + username
    if (signupStep === 2) {
      if (!fullName || !username) { setError('Name and username required'); return }
      const { data: existing } = await supabase.from('profiles').select('id').eq('username', username).single()
      if (existing) { setError('Username already taken'); return }
      setSignupStep(3); setError(''); return
    }
    // Step 3: details → create account → go to OTP step 4
    if (signupStep === 3) {
      setLoading(true); setError('')

      const { data, error: e } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: undefined, // OTP দিয়ে verify করব, link দরকার নেই
          data: { full_name: fullName }
        }
      })

      if (e) { setError(e.message); setLoading(false); return }

      if (data.user) {
        // Referral check
        let referrerId = null
        if (referralCode.trim() && referralValid) {
          const _refQ = referralCode.trim().toLowerCase()
          const { data: _r1 } = await supabase.from('profiles').select('id').eq('username', _refQ).maybeSingle()
          const { data: _r2 } = await supabase.from('profiles').select('id').eq('referral_code', _refQ).maybeSingle()
          const refProfile = _r1 || _r2
          if (refProfile && refProfile.id !== data.user.id) {
            referrerId = refProfile.id
          }
        }
        if (referrerId) {
          sessionStorage.setItem('echo_referrer_id', referrerId)
          // referrals table এ insert করো
          await supabase.from('referrals').insert({
            referrer_id: referrerId,
            referred_id: data.user.id,
            status: 'pending',
            created_at: new Date().toISOString(),
          }).then(({error}) => { if(error) console.error('referrals insert error:', error) })
        }

        // Profile তৈরি করো
        await supabase.from('profiles').upsert({
          id:        data.user.id,
          full_name: fullName,
          username:  username.toLowerCase(),
          referral_code: username.toLowerCase(),
          phone, dob, gender,
          xp: 0, level: 1,
          coin_balance: 0,
        }, { onConflict: 'id' })
      }

      setLoading(false)
      // Step 4 — OTP verify screen এ যাও
      setSignupStep(4)
      setResendTimer(60)
      setOtp(['','','','','','','',''])
      setTimeout(() => inputRefs.current[0]?.focus(), 200)
    }
  }

  // ── OTP input handlers ──
  const handleOtpInput = (i, val) => {
    if (val.length > 1) {
      const digits = val.replace(/\D/g, '').slice(0, 8)
      const arr = Array.from({ length: 8 }, (_, idx) => digits[idx] || '')
      setOtp(arr)
      setTimeout(() => inputRefs.current[Math.min(digits.length, 7)]?.focus(), 10)
      return
    }
    if (val && !/^\d$/.test(val)) return
    const arr = [...otp]; arr[i] = val; setOtp(arr)
    if (val && i < 7) setTimeout(() => inputRefs.current[i + 1]?.focus(), 10)
  }

  const handleOtpKey = (i, e) => {
    if (e.key === 'Backspace') {
      if (!otp[i] && i > 0) {
        const arr = [...otp]; arr[i - 1] = ''; setOtp(arr)
        inputRefs.current[i - 1]?.focus()
      } else {
        const arr = [...otp]; arr[i] = ''; setOtp(arr)
      }
    }
    if (e.key === 'ArrowLeft'  && i > 0) inputRefs.current[i - 1]?.focus()
    if (e.key === 'ArrowRight' && i < 7) inputRefs.current[i + 1]?.focus()
  }

  // ── OTP Verify ──
  const verifyOTP = async (code) => {
    if (!email || code.length !== 8 || otpLoading) return
    setOtpLoading(true); setOtpError('')

    // 'signup' type first, then 'email' fallback
    let success = false
    for (const type of ['signup', 'email']) {
      const { error: err } = await supabase.auth.verifyOtp({
        email: email.toLowerCase(),
        token: code,
        type,
      })
      if (!err) { success = true; break }
    }

    if (!success) {
      setOtpError('Code টি ভুল বা মেয়াদ শেষ। আবার চেষ্টা করো।')
      setOtp(['','','','','','','',''])
      setOtpShake(true); setTimeout(() => setOtpShake(false), 500)
      setTimeout(() => inputRefs.current[0]?.focus(), 50)
      setOtpLoading(false); return
    }

    setOtpLoading(false)
    setSignupStep(5) // success screen
    setTimeout(() => { window.location.href = '/feed' }, 2000)
  }

  // ── Resend OTP ──
  const resendOTP = async () => {
    if (resendTimer > 0 || resending) return
    setResending(true); setOtpError('')
    const { error: e1 } = await supabase.auth.resend({ type: 'signup', email: email.toLowerCase() })
    if (e1) {
      await supabase.auth.signInWithOtp({ email: email.toLowerCase(), options: { shouldCreateUser: false } })
    }
    setResendTimer(60)
    setOtp(['','','','','','','',''])
    setTimeout(() => inputRefs.current[0]?.focus(), 50)
    setResending(false)
  }

  // ── Google ──
  const handleGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/feed` }
    })
  }

  // ── Forgot password ──
  const handleForgotPassword = async () => {
    if (!email) { setError('Enter your email first'); return }
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`
    })
    alert('Password reset email sent! Check your inbox.')
  }

  // ════════ SPLASH ════════
  if (step === 'splash') return (
    <div style={{ height:'100vh', background:'#070a10', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', position:'relative', overflow:'hidden' }}>
      <div style={{ position:'absolute', width:'300px', height:'300px', borderRadius:'50%', background:'radial-gradient(circle,rgba(0,229,255,0.15),transparent)', top:'50%', left:'50%', transform:'translate(-50%,-50%)', animation:'glow 2s ease infinite' }}/>
      <div style={{ position:'absolute', width:'500px', height:'500px', borderRadius:'50%', background:'radial-gradient(circle,rgba(0,255,136,0.06),transparent)', top:'50%', left:'50%', transform:'translate(-50%,-50%)' }}/>
      <div style={{ position:'relative', marginBottom:'24px', animation:'fadeInUp 0.8s ease' }}>
        <svg width="100" height="110" viewBox="0 0 100 110">
          <polygon points="50,5 95,30 95,80 50,105 5,80 5,30" fill="none" stroke="#00e5ff" strokeWidth="3"/>
          <polygon points="50,15 85,35 85,75 50,95 15,75 15,35" fill="none" stroke="rgba(0,229,255,0.3)" strokeWidth="1"/>
          <text x="50" y="68" textAnchor="middle" fontFamily="Arial Black" fontWeight="900" fontSize="42" fill="#00e5ff">E</text>
        </svg>
      </div>
      <div style={{ animation:'fadeInUp 1s ease', textAlign:'center' }}>
        <div style={{ fontSize:'32px', fontWeight:'900', background:'linear-gradient(90deg,#00e5ff,#00ff88)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', letterSpacing:'-1px', marginBottom:'8px' }}>ECHO WORLD</div>
        <div style={{ fontSize:'13px', color:'#4a5568', letterSpacing:'3px' }}>EXPLORE · CONNECT · CREATE</div>
      </div>
      <div style={{ position:'absolute', bottom:'60px', display:'flex', gap:'8px' }}>
        {[0,1,2].map(i=><div key={i} style={{ width:'6px', height:'6px', borderRadius:'50%', background:'#00e5ff', animation:`dot 1.2s ${i*0.2}s infinite` }}/>)}
      </div>
      <style>{`
        @keyframes glow{0%,100%{opacity:.5}50%{opacity:1}}
        @keyframes fadeInUp{from{transform:translateY(20px);opacity:0}to{transform:translateY(0);opacity:1}}
        @keyframes dot{0%,80%,100%{transform:scale(.6);opacity:.3}40%{transform:scale(1);opacity:1}}
      `}</style>
    </div>
  )

  // ════════ MAIN AUTH UI ════════
  return (
    <div style={{ minHeight:'100vh', background:'#070a10', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'20px', position:'relative', overflow:'hidden' }}>

      <style>{`
        @keyframes glow{0%,100%{opacity:.5}50%{opacity:1}}
        @keyframes fadeInUp{from{transform:translateY(20px);opacity:0}to{transform:translateY(0);opacity:1}}
        @keyframes popIn{0%{transform:scale(.7);opacity:0}70%{transform:scale(1.08)}100%{transform:scale(1);opacity:1}}
        @keyframes shake{0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-8px)}40%,80%{transform:translateX(8px)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        input::placeholder{color:#2a3040}
        *{box-sizing:border-box}
        ::-webkit-scrollbar{display:none}
      `}</style>

      <div style={{ position:'fixed', inset:0, background:'radial-gradient(ellipse at top,rgba(0,229,255,.08) 0%,transparent 60%)', pointerEvents:'none' }}/>
      <div style={{ position:'fixed', inset:0, background:'radial-gradient(ellipse at bottom,rgba(0,255,136,.05) 0%,transparent 60%)', pointerEvents:'none' }}/>

      <div style={{ width:'100%', maxWidth:'400px', position:'relative', zIndex:1 }}>

        {/* Logo — hide on OTP/success steps */}
        {signupStep < 4 && (
          <div style={{ textAlign:'center', marginBottom:'32px' }}>
            <div style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', marginBottom:'12px' }}>
              <svg width="56" height="62" viewBox="0 0 100 110">
                <polygon points="50,5 95,30 95,80 50,105 5,80 5,30" fill="none" stroke="#00e5ff" strokeWidth="3"/>
                <text x="50" y="68" textAnchor="middle" fontFamily="Arial Black" fontWeight="900" fontSize="42" fill="#00e5ff">E</text>
              </svg>
            </div>
            <div style={{ fontSize:'26px', fontWeight:'900', background:'linear-gradient(90deg,#00e5ff,#00ff88)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>ECHO WORLD</div>
            <div style={{ fontSize:'12px', color:'#4a5568', marginTop:'4px', letterSpacing:'2px' }}>EXPLORE · CONNECT · CREATE</div>
          </div>
        )}

        {/* ════ SUCCESS SCREEN (step 5) ════ */}
        {signupStep === 5 && (
          <div style={{ textAlign:'center', padding:'40px 20px', animation:'fadeUp .4s ease' }}>
            <div style={{ fontSize:80, animation:'popIn .5s ease', marginBottom:16 }}>🎉</div>
            <div style={{ fontSize:22, fontWeight:900, color:'#00ff88', marginBottom:8 }}>Welcome to Echo World!</div>
            <div style={{ fontSize:13, color:'#4a5568' }}>Feed এ যাচ্ছো...</div>
          </div>
        )}

        {/* ════ OTP VERIFY SCREEN (step 4) ════ */}
        {signupStep === 4 && (
          <div style={{ animation:'fadeUp .35s ease' }}>

            {/* Header */}
            <div style={{ textAlign:'center', marginBottom:28 }}>
              <div style={{ fontSize:44, marginBottom:10 }}>📧</div>
              <div style={{ fontSize:'26px', fontWeight:'900', background:'linear-gradient(90deg,#00e5ff,#00ff88)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', marginBottom:6 }}>ECHO WORLD</div>
              <div style={{ fontSize:15, fontWeight:800, color:'#eef2f7', marginBottom:8 }}>Email Verify করো</div>
              <div style={{ fontSize:13, color:'#8892a4', lineHeight:1.7 }}>
                <span style={{ color:'#00e5ff', fontWeight:600 }}>{email}</span> এ<br/>
                একটি <span style={{ color:'#eef2f7', fontWeight:700 }}>8-সংখ্যার code</span> পাঠানো হয়েছে
              </div>
            </div>

            <div style={{ background:'rgba(17,22,32,.9)', border:'1px solid rgba(255,255,255,.08)', borderRadius:24, padding:28, backdropFilter:'blur(20px)' }}>

              {/* Progress bar — step 4 of 4 */}
              <div style={{ marginBottom:20 }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
                  {['Account','Profile','Details','Verify'].map((s,i)=>(
                    <div key={s} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4, flex:1 }}>
                      <div style={{ width:28, height:28, borderRadius:'50%', background: i < 3 ? 'linear-gradient(135deg,#00e5ff,#00ff88)' : 'rgba(0,229,255,.2)', border:`2px solid ${i <= 3 ? '#00e5ff' : 'rgba(255,255,255,.1)'}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700, color: i < 3 ? '#070a10' : '#00e5ff' }}>
                        {i < 3 ? '✓' : '●'}
                      </div>
                      <div style={{ fontSize:10, color: i === 3 ? '#00e5ff' : '#4a5568', fontWeight:600 }}>{s}</div>
                    </div>
                  ))}
                </div>
                <div style={{ height:3, background:'rgba(255,255,255,.05)', borderRadius:2, overflow:'hidden' }}>
                  <div style={{ height:'100%', width:'100%', background:'linear-gradient(90deg,#00e5ff,#00ff88)', borderRadius:2 }}/>
                </div>
              </div>

              {/* OTP Boxes */}
              <div style={{ marginBottom:16 }}>
                <div style={{ fontSize:11, color:'#4a5568', fontWeight:700, textAlign:'center', marginBottom:12, letterSpacing:1 }}>
                  Gmail থেকে 8-digit CODE লিখো
                </div>
                <div style={{
                  display:'flex', gap:6, justifyContent:'center',
                  animation: otpShake ? 'shake .4s ease' : 'none'
                }}>
                  {otp.map((digit, i) => (
                    <input
                      key={i}
                      ref={el => inputRefs.current[i] = el}
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={6}
                      value={digit}
                      onChange={e => handleOtpInput(i, e.target.value)}
                      onKeyDown={e => handleOtpKey(i, e)}
                      onFocus={e => e.target.select()}
                      style={{
                        width:36, height:52, borderRadius:12, textAlign:'center',
                        fontSize:20, fontWeight:900, outline:'none',
                        background: digit ? 'rgba(0,229,255,.12)' : '#0c1018',
                        border:`2px solid ${digit ? 'rgba(0,229,255,.6)' : 'rgba(255,255,255,.08)'}`,
                        color:'#eef2f7', transition:'all .15s',
                        boxShadow: digit ? '0 0 12px rgba(0,229,255,.2)' : 'none',
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* OTP Error */}
              {otpError && (
                <div style={{ background:'rgba(255,69,96,.1)', border:'1px solid rgba(255,69,96,.2)', borderRadius:10, padding:'10px 14px', marginBottom:14, fontSize:13, color:'#ff4560', textAlign:'center' }}>
                  ❌ {otpError}
                </div>
              )}

              {/* Verify button */}
              <button
                onClick={() => verifyOTP(otp.join(''))}
                disabled={otpLoading || otp.some(d => !d)}
                style={{
                  width:'100%', padding:14, border:'none', borderRadius:14,
                  background: otp.every(d => d) ? 'linear-gradient(135deg,#00e5ff,#00ff88)' : 'rgba(255,255,255,.05)',
                  color: otp.every(d => d) ? '#070a10' : '#4a5568',
                  fontSize:15, fontWeight:800, cursor: otp.every(d => d) ? 'pointer' : 'default',
                  marginBottom:14, transition:'all .2s',
                  boxShadow: otp.every(d => d) ? '0 6px 20px rgba(0,229,255,.25)' : 'none',
                }}
              >
                {otpLoading ? (
                  <span style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
                    <span style={{ width:16, height:16, border:'2px solid rgba(6,8,16,.3)', borderTopColor:'#060810', borderRadius:'50%', display:'inline-block', animation:'spin 1s linear infinite' }}/>
                    Verify হচ্ছে...
                  </span>
                ) : '✅ Verify করো'}
              </button>

              {/* Resend */}
              <div style={{ textAlign:'center', marginBottom:14 }}>
                {resendTimer > 0 ? (
                  <span style={{ fontSize:12, color:'#4a5568' }}>
                    আবার পাঠাতে পারবে{' '}
                    <span style={{ color:'#00e5ff', fontWeight:700 }}>
                      {String(Math.floor(resendTimer/60)).padStart(2,'0')}:{String(resendTimer%60).padStart(2,'0')}
                    </span>{' '}পরে
                  </span>
                ) : (
                  <button onClick={resendOTP} disabled={resending} style={{ background:'none', border:'none', color:'#00e5ff', fontSize:13, fontWeight:600, cursor:'pointer', textDecoration:'underline' }}>
                    {resending ? '⏳ পাঠানো হচ্ছে...' : '🔄 Code আবার পাঠাও'}
                  </button>
                )}
              </div>

              {/* Tips */}
              <div style={{ background:'rgba(255,202,40,.04)', border:'1px solid rgba(255,202,40,.1)', borderRadius:12, padding:'11px 14px', fontSize:11, color:'#8892a4', lineHeight:1.8 }}>
                <div style={{ fontWeight:700, color:'#ffca28', marginBottom:4 }}>💡 Code পাচ্ছো না?</div>
                <div>• Gmail এর <strong>Spam/Junk</strong> folder চেক করো</div>
                <div>• ১-২ মিনিট অপেক্ষা করো</div>
                <div>• Timer শেষে "আবার পাঠাও" চাপো</div>
              </div>
            </div>
          </div>
        )}

        {/* ════ STEPS 1-3 — Original UI ════ */}
        {signupStep < 4 && (
          <div style={{ background:'rgba(17,22,32,.9)', border:'1px solid rgba(255,255,255,.08)', borderRadius:24, padding:28, backdropFilter:'blur(20px)' }}>

            {/* Mode tabs */}
            <div style={{ display:'flex', background:'rgba(255,255,255,.04)', borderRadius:14, padding:4, marginBottom:24 }}>
              {['login','signup'].map(mode=>(
                <button key={mode} onClick={()=>{ setAuthMode(mode); setError(''); setSignupStep(1) }}
                  style={{ flex:1, padding:10, borderRadius:10, border:'none', cursor:'pointer', fontSize:14, fontWeight:700, background: authMode===mode ? 'linear-gradient(135deg,#00e5ff,#00ff88)' : 'transparent', color: authMode===mode ? '#070a10' : '#4a5568', transition:'all .2s' }}>
                  {mode==='login' ? '🔑 Login' : '🚀 Sign Up'}
                </button>
              ))}
            </div>

            {/* Signup progress (steps 1-3) */}
            {authMode==='signup' && (
              <div style={{ marginBottom:20 }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
                  {['Account','Profile','Details'].map((s,i)=>(
                    <div key={s} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4, flex:1 }}>
                      <div style={{ width:28, height:28, borderRadius:'50%', background: signupStep>i ? 'linear-gradient(135deg,#00e5ff,#00ff88)' : signupStep===i+1 ? 'rgba(0,229,255,.2)' : 'rgba(255,255,255,.05)', border:`2px solid ${signupStep>=i+1 ? '#00e5ff' : 'rgba(255,255,255,.1)'}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700, color: signupStep>i ? '#070a10' : signupStep===i+1 ? '#00e5ff' : '#4a5568' }}>
                        {signupStep>i ? '✓' : i+1}
                      </div>
                      <div style={{ fontSize:10, color: signupStep===i+1 ? '#00e5ff' : '#4a5568', fontWeight:600 }}>{s}</div>
                    </div>
                  ))}
                </div>
                <div style={{ height:3, background:'rgba(255,255,255,.05)', borderRadius:2, overflow:'hidden' }}>
                  <div style={{ height:'100%', width:`${((signupStep-1)/2)*100}%`, background:'linear-gradient(90deg,#00e5ff,#00ff88)', borderRadius:2, transition:'width .4s ease' }}/>
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div style={{ background:'rgba(255,69,96,.1)', border:'1px solid rgba(255,69,96,.2)', borderRadius:10, padding:'10px 14px', marginBottom:16, fontSize:13, color:'#ff4560' }}>
                ⚠️ {error}
              </div>
            )}

            {/* ── LOGIN ── */}
            {authMode==='login' && (
              <div>
                <div style={{ marginBottom:12 }}>
                  <div style={{ fontSize:11, color:'#4a5568', fontWeight:600, marginBottom:6, letterSpacing:1 }}>EMAIL</div>
                  <input value={email} onChange={e=>setEmail(e.target.value)} type="email" placeholder="your@email.com"
                    style={{ width:'100%', background:'#0c1018', border:'1px solid rgba(255,255,255,.08)', borderRadius:12, padding:'12px 14px', color:'#eef2f7', fontSize:14, outline:'none' }}/>
                </div>
                <div style={{ marginBottom:8 }}>
                  <div style={{ fontSize:11, color:'#4a5568', fontWeight:600, marginBottom:6, letterSpacing:1 }}>PASSWORD</div>
                  <div style={{ position:'relative' }}>
                    <input value={password} onChange={e=>setPassword(e.target.value)} type={showPass?'text':'password'} placeholder="••••••••"
                      onKeyDown={e=>e.key==='Enter'&&handleLogin()}
                      style={{ width:'100%', background:'#0c1018', border:'1px solid rgba(255,255,255,.08)', borderRadius:12, padding:'12px 44px 12px 14px', color:'#eef2f7', fontSize:14, outline:'none' }}/>
                    <button onClick={()=>setShowPass(!showPass)} style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:'#4a5568', cursor:'pointer', fontSize:16 }}>
                      {showPass?'🙈':'👁'}
                    </button>
                  </div>
                </div>
                <button onClick={handleForgotPassword} style={{ background:'none', border:'none', color:'#00e5ff', fontSize:12, cursor:'pointer', marginBottom:20, padding:0 }}>
                  Forgot password?
                </button>
                <button onClick={handleLogin} disabled={loading}
                  style={{ width:'100%', padding:14, background:'linear-gradient(135deg,#00e5ff,#00ff88)', border:'none', borderRadius:14, fontSize:15, fontWeight:800, color:'#070a10', cursor:loading?'default':'pointer', opacity:loading?.7:1, marginBottom:12 }}>
                  {loading ? 'Logging in...' : '🔑 Login'}
                </button>
                <button onClick={handleGoogle}
                  style={{ width:'100%', padding:13, background:'rgba(255,255,255,.05)', border:'1px solid rgba(255,255,255,.1)', borderRadius:14, fontSize:14, fontWeight:700, color:'#eef2f7', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
                  <span style={{ fontSize:18 }}>G</span> Continue with Google
                </button>
              </div>
            )}

            {/* ── SIGNUP STEP 1 ── */}
            {authMode==='signup' && signupStep===1 && (
              <div>
                <div style={{ textAlign:'center', marginBottom:20 }}>
                  <div style={{ fontSize:16, fontWeight:800, marginBottom:4 }}>Create Account</div>
                  <div style={{ fontSize:12, color:'#4a5568' }}>Start your exploration journey</div>
                </div>
                <div style={{ marginBottom:12 }}>
                  <div style={{ fontSize:11, color:'#4a5568', fontWeight:600, marginBottom:6, letterSpacing:1 }}>EMAIL</div>
                  <input value={email} onChange={e=>setEmail(e.target.value)} type="email" placeholder="your@email.com"
                    style={{ width:'100%', background:'#0c1018', border:'1px solid rgba(255,255,255,.08)', borderRadius:12, padding:'12px 14px', color:'#eef2f7', fontSize:14, outline:'none' }}/>
                </div>
                <div style={{ marginBottom:20 }}>
                  <div style={{ fontSize:11, color:'#4a5568', fontWeight:600, marginBottom:6, letterSpacing:1 }}>PASSWORD</div>
                  <div style={{ position:'relative' }}>
                    <input value={password} onChange={e=>setPassword(e.target.value)} type={showPass?'text':'password'} placeholder="Min 6 characters"
                      style={{ width:'100%', background:'#0c1018', border:'1px solid rgba(255,255,255,.08)', borderRadius:12, padding:'12px 44px 12px 14px', color:'#eef2f7', fontSize:14, outline:'none' }}/>
                    <button onClick={()=>setShowPass(!showPass)} style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:'#4a5568', cursor:'pointer', fontSize:16 }}>
                      {showPass?'🙈':'👁'}
                    </button>
                  </div>
                  {password && (
                    <div style={{ marginTop:6, height:4, background:'rgba(255,255,255,.05)', borderRadius:2, overflow:'hidden' }}>
                      <div style={{ height:'100%', width: password.length>=10?'100%':password.length>=6?'60%':'30%', background: password.length>=10?'#00ff88':password.length>=6?'#ffca28':'#ff4560', borderRadius:2, transition:'all .3s' }}/>
                    </div>
                  )}
                </div>
                <button onClick={handleSignup}
                  style={{ width:'100%', padding:14, background:'linear-gradient(135deg,#00e5ff,#00ff88)', border:'none', borderRadius:14, fontSize:15, fontWeight:800, color:'#070a10', cursor:'pointer', marginBottom:12 }}>
                  Continue →
                </button>
                <button onClick={handleGoogle}
                  style={{ width:'100%', padding:13, background:'rgba(255,255,255,.05)', border:'1px solid rgba(255,255,255,.1)', borderRadius:14, fontSize:14, fontWeight:700, color:'#eef2f7', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
                  <span style={{ fontSize:18 }}>G</span> Continue with Google
                </button>
              </div>
            )}

            {/* ── SIGNUP STEP 2 ── */}
            {authMode==='signup' && signupStep===2 && (
              <div>
                <div style={{ textAlign:'center', marginBottom:20 }}>
                  <div style={{ fontSize:16, fontWeight:800, marginBottom:4 }}>Your Identity</div>
                  <div style={{ fontSize:12, color:'#4a5568' }}>How will others know you?</div>
                </div>
                <div style={{ marginBottom:12 }}>
                  <div style={{ fontSize:11, color:'#4a5568', fontWeight:600, marginBottom:6, letterSpacing:1 }}>FULL NAME</div>
                  <input value={fullName} onChange={e=>setFullName(e.target.value)} placeholder="Your full name"
                    style={{ width:'100%', background:'#0c1018', border:'1px solid rgba(255,255,255,.08)', borderRadius:12, padding:'12px 14px', color:'#eef2f7', fontSize:14, outline:'none' }}/>
                </div>
                <div style={{ marginBottom:20 }}>
                  <div style={{ fontSize:11, color:'#4a5568', fontWeight:600, marginBottom:6, letterSpacing:1 }}>USERNAME</div>
                  <div style={{ position:'relative' }}>
                    <span style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', color:'#00e5ff', fontSize:14, fontWeight:700 }}>@</span>
                    <input value={username} onChange={e=>setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g,''))} placeholder="username"
                      style={{ width:'100%', background:'#0c1018', border:'1px solid rgba(255,255,255,.08)', borderRadius:12, padding:'12px 14px 12px 30px', color:'#00e5ff', fontSize:14, outline:'none' }}/>
                  </div>
                </div>
                <div style={{ display:'flex', gap:10 }}>
                  <button onClick={()=>setSignupStep(1)}
                    style={{ flex:1, padding:13, background:'rgba(255,255,255,.05)', border:'1px solid rgba(255,255,255,.1)', borderRadius:14, color:'#8892a4', fontSize:14, fontWeight:700, cursor:'pointer' }}>
                    ← Back
                  </button>
                  <button onClick={handleSignup}
                    style={{ flex:2, padding:13, background:'linear-gradient(135deg,#00e5ff,#00ff88)', border:'none', borderRadius:14, color:'#070a10', fontSize:14, fontWeight:800, cursor:'pointer' }}>
                    Continue →
                  </button>
                </div>
              </div>
            )}

            {/* ── SIGNUP STEP 3 ── */}
            {authMode==='signup' && signupStep===3 && (
              <div>
                <div style={{ textAlign:'center', marginBottom:20 }}>
                  <div style={{ fontSize:16, fontWeight:800, marginBottom:4 }}>Almost done! 🎉</div>
                  <div style={{ fontSize:12, color:'#4a5568' }}>Optional details (skip if you want)</div>
                </div>
                <div style={{ marginBottom:12 }}>
                  <div style={{ fontSize:11, color:'#4a5568', fontWeight:600, marginBottom:6, letterSpacing:1 }}>PHONE (OPTIONAL)</div>
                  <input value={phone} onChange={e=>setPhone(e.target.value)} type="tel" placeholder="+880 1X XX XX XX XX"
                    style={{ width:'100%', background:'#0c1018', border:'1px solid rgba(255,255,255,.08)', borderRadius:12, padding:'12px 14px', color:'#eef2f7', fontSize:14, outline:'none' }}/>
                </div>
                <div style={{ marginBottom:12 }}>
                  <div style={{ fontSize:11, color:'#4a5568', fontWeight:600, marginBottom:6, letterSpacing:1 }}>DATE OF BIRTH (OPTIONAL)</div>
                  <input value={dob} onChange={e=>setDob(e.target.value)} type="date"
                    style={{ width:'100%', background:'#0c1018', border:'1px solid rgba(255,255,255,.08)', borderRadius:12, padding:'12px 14px', color:'#eef2f7', fontSize:14, outline:'none', colorScheme:'dark' }}/>
                </div>
                <div style={{ marginBottom:12 }}>
                  <div style={{ fontSize:11, color:'#4a5568', fontWeight:600, marginBottom:8, letterSpacing:1 }}>GENDER (OPTIONAL)</div>
                  <div style={{ display:'flex', gap:8 }}>
                    {[{key:'male',label:'♂ Male'},{key:'female',label:'♀ Female'},{key:'other',label:'⚧ Other'}].map(g=>(
                      <button key={g.key} onClick={()=>setGender(g.key)}
                        style={{ flex:1, padding:10, borderRadius:12, border:`2px solid ${gender===g.key?'#00e5ff':'rgba(255,255,255,.08)'}`, background:gender===g.key?'rgba(0,229,255,.1)':'#0c1018', color:gender===g.key?'#00e5ff':'#4a5568', fontSize:12, fontWeight:700, cursor:'pointer' }}>
                        {g.label}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Referral code */}
                <div style={{ marginBottom:20 }}>
                  <div style={{ fontSize:11, color:'#4a5568', fontWeight:600, marginBottom:6, letterSpacing:1 }}>REFERRAL CODE (OPTIONAL)</div>
                  <div style={{ position:'relative' }}>
                    <input
                      value={referralCode}
                      onChange={e=>{ const v=e.target.value.toLowerCase().replace(/\s/g,''); setReferralCode(v); setReferralValid(null); setReferralUsername('') }}
                      onBlur={()=>verifyReferralCode(referralCode)}
                      placeholder="e.g. rafi4829"
                      style={{ width:'100%', background:'#0c1018', border:`1px solid ${referralValid===true?'#00ff88':referralValid===false?'#ff4560':'rgba(255,255,255,.08)'}`, borderRadius:12, padding:'12px 44px 12px 14px', color:'#eef2f7', fontSize:14, outline:'none', fontFamily:'monospace' }}
                    />
                    {referralCode && <span style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', fontSize:16 }}>{referralValid===true?'✅':referralValid===false?'❌':'🔍'}</span>}
                  </div>
                  {referralValid===true&&referralUsername&&<div style={{ marginTop:6, fontSize:12, color:'#00ff88', fontWeight:700 }}>✅ Referred by @{referralUsername}</div>}
                  {referralValid===false&&<div style={{ marginTop:6, fontSize:12, color:'#ff4560' }}>❌ Invalid referral code</div>}
                  {!referralCode&&<div style={{ marginTop:5, fontSize:11, color:'#2a3040' }}>Have a friend's invite code? Enter it here.</div>}
                </div>
                <div style={{ display:'flex', gap:10 }}>
                  <button onClick={()=>setSignupStep(2)}
                    style={{ flex:1, padding:13, background:'rgba(255,255,255,.05)', border:'1px solid rgba(255,255,255,.1)', borderRadius:14, color:'#8892a4', fontSize:14, fontWeight:700, cursor:'pointer' }}>
                    ← Back
                  </button>
                  <button onClick={handleSignup} disabled={loading}
                    style={{ flex:2, padding:13, background:'linear-gradient(135deg,#00e5ff,#00ff88)', border:'none', borderRadius:14, color:'#070a10', fontSize:14, fontWeight:800, cursor:loading?'default':'pointer', opacity:loading?.7:1 }}>
                    {loading ? (
                      <span style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
                        <span style={{ width:14, height:14, border:'2px solid rgba(6,8,16,.3)', borderTopColor:'#060810', borderRadius:'50%', display:'inline-block', animation:'spin 1s linear infinite' }}/>
                        Creating...
                      </span>
                    ) : '🚀 Join Echo World!'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {signupStep < 4 && (
          <div style={{ textAlign:'center', marginTop:20, fontSize:11, color:'#2a3040' }}>
            By continuing you agree to our Terms & Privacy Policy
          </div>
        )}
      </div>
    </div>
  )
    }
