'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default function Home() {
  const [step, setStep] = useState('splash')
  const [authMode, setAuthMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
  const [phone, setPhone] = useState('')
  const [dob, setDob] = useState('')
  const [gender, setGender] = useState('')
  const [referralCode, setReferralCode] = useState('')
  const [referralValid, setReferralValid] = useState(null) // null=unchecked, true=valid, false=invalid
  const [referralUsername, setReferralUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [signupStep, setSignupStep] = useState(1)
  const [showPass, setShowPass] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) window.location.href = '/feed'
    })
    // URL থেকে ref code পড়া
    const params = new URLSearchParams(window.location.search)
    const ref = params.get('ref')
    if (ref) {
      setReferralCode(ref)
      setAuthMode('signup')
    }
    setTimeout(() => setStep('auth'), 2800)
  }, [])

  // Referral code verify করা
  const verifyReferralCode = async (code) => {
    if (!code.trim()) { setReferralValid(null); setReferralUsername(''); return }
    const { data } = await supabase
      .from('profiles')
      .select('id, username')
      .eq('referral_code', code.trim().toLowerCase())
      .single()
    if (data) {
      setReferralValid(true)
      setReferralUsername(data.username)
    } else {
      setReferralValid(false)
      setReferralUsername('')
    }
  }

  const handleLogin = async () => {
    if (!email || !password) { setError('Email and password required'); return }
    setLoading(true); setError('')
    const { error: e } = await supabase.auth.signInWithPassword({ email, password })
    if (e) { setError(e.message); setLoading(false) }
    else window.location.href = '/feed'
  }

  const handleSignup = async () => {
    if (signupStep === 1) {
      if (!email || !password) { setError('Email and password required'); return }
      if (password.length < 6) { setError('Password must be at least 6 characters'); return }
      setSignupStep(2); setError('')
      return
    }
    if (signupStep === 2) {
      if (!fullName || !username) { setError('Name and username required'); return }
      const { data: existing } = await supabase.from('profiles').select('id').eq('username', username).single()
      if (existing) { setError('Username already taken'); return }
      setSignupStep(3); setError('')
      return
    }
    if (signupStep === 3) {
      setLoading(true); setError('')
      const { data, error: e } = await supabase.auth.signUp({ email, password })
      if (e) { setError(e.message); setLoading(false); return }

      if (data.user) {
        // Referral code থেকে referrer এর user_id বের করা
        let referrerId = null
        if (referralCode.trim() && referralValid) {
          const { data: refProfile } = await supabase
            .from('profiles')
            .select('id')
            .eq('referral_code', referralCode.trim().toLowerCase())
            .single()
          if (refProfile && refProfile.id !== data.user.id) {
            referrerId = refProfile.id
          }
        }

        // sessionStorage এ referrer save করো (invest page এ PIN set করার সময় ব্যবহার হবে)
        if (referrerId) {
          sessionStorage.setItem('echo_referrer_id', referrerId)
        }

        await supabase.from('profiles').upsert({
          id: data.user.id,
          full_name: fullName,
          username: username.toLowerCase(),
          phone, dob, gender,
          xp: 0, level: 1,
        })
      }
      window.location.href = '/feed'
    }
  }

  const handleGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/feed` }
    })
  }

  const handleForgotPassword = async () => {
    if (!email) { setError('Enter your email first'); return }
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`
    })
    alert('Password reset email sent! Check your inbox.')
  }

  // SPLASH
  if (step === 'splash') return (
    <div style={{ height: '100vh', background: '#070a10', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', width: '300px', height: '300px', borderRadius: '50%', background: 'radial-gradient(circle,rgba(0,229,255,0.15),transparent)', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', animation: 'glow 2s ease infinite' }} />
      <div style={{ position: 'absolute', width: '500px', height: '500px', borderRadius: '50%', background: 'radial-gradient(circle,rgba(0,255,136,0.06),transparent)', top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }} />

      <div style={{ position: 'relative', marginBottom: '24px', animation: 'fadeInUp 0.8s ease' }}>
        <svg width="100" height="110" viewBox="0 0 100 110">
          <polygon points="50,5 95,30 95,80 50,105 5,80 5,30" fill="none" stroke="#00e5ff" strokeWidth="3"/>
          <polygon points="50,15 85,35 85,75 50,95 15,75 15,35" fill="none" stroke="rgba(0,229,255,0.3)" strokeWidth="1"/>
          <text x="50" y="68" textAnchor="middle" fontFamily="Arial Black" fontWeight="900" fontSize="42" fill="#00e5ff">E</text>
        </svg>
      </div>

      <div style={{ animation: 'fadeInUp 1s ease', textAlign: 'center' }}>
        <div style={{ fontSize: '32px', fontWeight: '900', background: 'linear-gradient(90deg,#00e5ff,#00ff88)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-1px', marginBottom: '8px' }}>ECHO WORLD</div>
        <div style={{ fontSize: '13px', color: '#4a5568', letterSpacing: '3px' }}>EXPLORE · CONNECT · CREATE</div>
      </div>

      <div style={{ position: 'absolute', bottom: '60px', display: 'flex', gap: '8px' }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#00e5ff', animation: `dot 1.2s ${i * 0.2}s infinite` }} />
        ))}
      </div>

      <style>{`
        @keyframes glow { 0%,100%{opacity:0.5} 50%{opacity:1} }
        @keyframes fadeInUp { from{transform:translateY(20px);opacity:0} to{transform:translateY(0);opacity:1} }
        @keyframes dot { 0%,80%,100%{transform:scale(0.6);opacity:0.3} 40%{transform:scale(1);opacity:1} }
      `}</style>
    </div>
  )

  // AUTH
  return (
    <div style={{ minHeight: '100vh', background: '#070a10', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px', position: 'relative', overflow: 'hidden' }}>

      <div style={{ position: 'fixed', inset: 0, background: 'radial-gradient(ellipse at top,rgba(0,229,255,0.08) 0%,transparent 60%)', pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', inset: 0, background: 'radial-gradient(ellipse at bottom,rgba(0,255,136,0.05) 0%,transparent 60%)', pointerEvents: 'none' }} />

      <div style={{ width: '100%', maxWidth: '400px', position: 'relative', zIndex: 1 }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
            <svg width="56" height="62" viewBox="0 0 100 110">
              <polygon points="50,5 95,30 95,80 50,105 5,80 5,30" fill="none" stroke="#00e5ff" strokeWidth="3"/>
              <text x="50" y="68" textAnchor="middle" fontFamily="Arial Black" fontWeight="900" fontSize="42" fill="#00e5ff">E</text>
            </svg>
          </div>
          <div style={{ fontSize: '26px', fontWeight: '900', background: 'linear-gradient(90deg,#00e5ff,#00ff88)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>ECHO WORLD</div>
          <div style={{ fontSize: '12px', color: '#4a5568', marginTop: '4px', letterSpacing: '2px' }}>EXPLORE · CONNECT · CREATE</div>
        </div>

        {/* Card */}
        <div style={{ background: 'rgba(17,22,32,0.9)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '24px', padding: '28px', backdropFilter: 'blur(20px)' }}>

          {/* Mode tabs */}
          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.04)', borderRadius: '14px', padding: '4px', marginBottom: '24px' }}>
            {['login', 'signup'].map(mode => (
              <button key={mode} onClick={() => { setAuthMode(mode); setError(''); setSignupStep(1) }}
                style={{ flex: 1, padding: '10px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: '700', background: authMode === mode ? 'linear-gradient(135deg,#00e5ff,#00ff88)' : 'transparent', color: authMode === mode ? '#070a10' : '#4a5568', transition: 'all 0.2s' }}>
                {mode === 'login' ? '🔑 Login' : '🚀 Sign Up'}
              </button>
            ))}
          </div>

          {/* Signup progress */}
          {authMode === 'signup' && (
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                {['Account', 'Profile', 'Details'].map((s, i) => (
                  <div key={s} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', flex: 1 }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: signupStep > i ? 'linear-gradient(135deg,#00e5ff,#00ff88)' : signupStep === i + 1 ? 'rgba(0,229,255,0.2)' : 'rgba(255,255,255,0.05)', border: `2px solid ${signupStep >= i + 1 ? '#00e5ff' : 'rgba(255,255,255,0.1)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '700', color: signupStep > i ? '#070a10' : signupStep === i + 1 ? '#00e5ff' : '#4a5568' }}>
                      {signupStep > i ? '✓' : i + 1}
                    </div>
                    <div style={{ fontSize: '10px', color: signupStep === i + 1 ? '#00e5ff' : '#4a5568', fontWeight: '600' }}>{s}</div>
                  </div>
                ))}
              </div>
              <div style={{ height: '3px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${((signupStep - 1) / 2) * 100}%`, background: 'linear-gradient(90deg,#00e5ff,#00ff88)', borderRadius: '2px', transition: 'width 0.4s ease' }} />
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{ background: 'rgba(255,69,96,0.1)', border: '1px solid rgba(255,69,96,0.2)', borderRadius: '10px', padding: '10px 14px', marginBottom: '16px', fontSize: '13px', color: '#ff4560' }}>
              ⚠️ {error}
            </div>
          )}

          {/* LOGIN */}
          {authMode === 'login' && (
            <div>
              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '11px', color: '#4a5568', fontWeight: '600', marginBottom: '6px', letterSpacing: '1px' }}>EMAIL</div>
                <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="your@email.com"
                  style={{ width: '100%', background: '#0c1018', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '12px 14px', color: '#eef2f7', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div style={{ marginBottom: '8px' }}>
                <div style={{ fontSize: '11px', color: '#4a5568', fontWeight: '600', marginBottom: '6px', letterSpacing: '1px' }}>PASSWORD</div>
                <div style={{ position: 'relative' }}>
                  <input value={password} onChange={e => setPassword(e.target.value)} type={showPass ? 'text' : 'password'} placeholder="••••••••"
                    onKeyDown={e => e.key === 'Enter' && handleLogin()}
                    style={{ width: '100%', background: '#0c1018', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '12px 44px 12px 14px', color: '#eef2f7', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
                  <button onClick={() => setShowPass(!showPass)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#4a5568', cursor: 'pointer', fontSize: '16px' }}>
                    {showPass ? '🙈' : '👁'}
                  </button>
                </div>
              </div>
              <button onClick={handleForgotPassword} style={{ background: 'none', border: 'none', color: '#00e5ff', fontSize: '12px', cursor: 'pointer', marginBottom: '20px', padding: 0 }}>
                Forgot password?
              </button>
              <button onClick={handleLogin} disabled={loading}
                style={{ width: '100%', padding: '14px', background: 'linear-gradient(135deg,#00e5ff,#00ff88)', border: 'none', borderRadius: '14px', fontSize: '15px', fontWeight: '800', color: '#070a10', cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.7 : 1, marginBottom: '12px' }}>
                {loading ? 'Logging in...' : '🔑 Login'}
              </button>
              <button onClick={handleGoogle}
                style={{ width: '100%', padding: '13px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px', fontSize: '14px', fontWeight: '700', color: '#eef2f7', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <span style={{ fontSize: '18px' }}>G</span> Continue with Google
              </button>
            </div>
          )}

          {/* SIGNUP */}
          {authMode === 'signup' && (
            <div>
              {signupStep === 1 && (
                <div>
                  <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                    <div style={{ fontSize: '16px', fontWeight: '800', marginBottom: '4px' }}>Create Account</div>
                    <div style={{ fontSize: '12px', color: '#4a5568' }}>Start your exploration journey</div>
                  </div>
                  <div style={{ marginBottom: '12px' }}>
                    <div style={{ fontSize: '11px', color: '#4a5568', fontWeight: '600', marginBottom: '6px', letterSpacing: '1px' }}>EMAIL</div>
                    <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="your@email.com"
                      style={{ width: '100%', background: '#0c1018', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '12px 14px', color: '#eef2f7', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ fontSize: '11px', color: '#4a5568', fontWeight: '600', marginBottom: '6px', letterSpacing: '1px' }}>PASSWORD</div>
                    <div style={{ position: 'relative' }}>
                      <input value={password} onChange={e => setPassword(e.target.value)} type={showPass ? 'text' : 'password'} placeholder="Min 6 characters"
                        style={{ width: '100%', background: '#0c1018', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '12px 44px 12px 14px', color: '#eef2f7', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
                      <button onClick={() => setShowPass(!showPass)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#4a5568', cursor: 'pointer', fontSize: '16px' }}>
                        {showPass ? '🙈' : '👁'}
                      </button>
                    </div>
                    {password && (
                      <div style={{ marginTop: '6px', height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: password.length >= 10 ? '100%' : password.length >= 6 ? '60%' : '30%', background: password.length >= 10 ? '#00ff88' : password.length >= 6 ? '#ffca28' : '#ff4560', borderRadius: '2px', transition: 'all 0.3s' }} />
                      </div>
                    )}
                  </div>
                  <button onClick={handleSignup}
                    style={{ width: '100%', padding: '14px', background: 'linear-gradient(135deg,#00e5ff,#00ff88)', border: 'none', borderRadius: '14px', fontSize: '15px', fontWeight: '800', color: '#070a10', cursor: 'pointer', marginBottom: '12px' }}>
                    Continue →
                  </button>
                  <button onClick={handleGoogle}
                    style={{ width: '100%', padding: '13px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px', fontSize: '14px', fontWeight: '700', color: '#eef2f7', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '18px' }}>G</span> Continue with Google
                  </button>
                </div>
              )}

              {signupStep === 2 && (
                <div>
                  <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                    <div style={{ fontSize: '16px', fontWeight: '800', marginBottom: '4px' }}>Your Identity</div>
                    <div style={{ fontSize: '12px', color: '#4a5568' }}>How will others know you?</div>
                  </div>
                  <div style={{ marginBottom: '12px' }}>
                    <div style={{ fontSize: '11px', color: '#4a5568', fontWeight: '600', marginBottom: '6px', letterSpacing: '1px' }}>FULL NAME</div>
                    <input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Your full name"
                      style={{ width: '100%', background: '#0c1018', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '12px 14px', color: '#eef2f7', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ fontSize: '11px', color: '#4a5568', fontWeight: '600', marginBottom: '6px', letterSpacing: '1px' }}>USERNAME</div>
                    <div style={{ position: 'relative' }}>
                      <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#00e5ff', fontSize: '14px', fontWeight: '700' }}>@</span>
                      <input value={username} onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, ''))} placeholder="username"
                        style={{ width: '100%', background: '#0c1018', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '12px 14px 12px 30px', color: '#00e5ff', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => setSignupStep(1)}
                      style={{ flex: 1, padding: '13px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px', color: '#8892a4', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}>
                      ← Back
                    </button>
                    <button onClick={handleSignup}
                      style={{ flex: 2, padding: '13px', background: 'linear-gradient(135deg,#00e5ff,#00ff88)', border: 'none', borderRadius: '14px', color: '#070a10', fontSize: '14px', fontWeight: '800', cursor: 'pointer' }}>
                      Continue →
                    </button>
                  </div>
                </div>
              )}

              {signupStep === 3 && (
                <div>
                  <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                    <div style={{ fontSize: '16px', fontWeight: '800', marginBottom: '4px' }}>Almost done! 🎉</div>
                    <div style={{ fontSize: '12px', color: '#4a5568' }}>Optional details (skip if you want)</div>
                  </div>
                  <div style={{ marginBottom: '12px' }}>
                    <div style={{ fontSize: '11px', color: '#4a5568', fontWeight: '600', marginBottom: '6px', letterSpacing: '1px' }}>PHONE (OPTIONAL)</div>
                    <input value={phone} onChange={e => setPhone(e.target.value)} type="tel" placeholder="+880 1X XX XX XX XX"
                      style={{ width: '100%', background: '#0c1018', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '12px 14px', color: '#eef2f7', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                  <div style={{ marginBottom: '12px' }}>
                    <div style={{ fontSize: '11px', color: '#4a5568', fontWeight: '600', marginBottom: '6px', letterSpacing: '1px' }}>DATE OF BIRTH (OPTIONAL)</div>
                    <input value={dob} onChange={e => setDob(e.target.value)} type="date"
                      style={{ width: '100%', background: '#0c1018', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '12px 14px', color: '#eef2f7', fontSize: '14px', outline: 'none', boxSizing: 'border-box', colorScheme: 'dark' }} />
                  </div>
                  <div style={{ marginBottom: '12px' }}>
                    <div style={{ fontSize: '11px', color: '#4a5568', fontWeight: '600', marginBottom: '8px', letterSpacing: '1px' }}>GENDER (OPTIONAL)</div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {[{ key: 'male', label: '♂ Male' }, { key: 'female', label: '♀ Female' }, { key: 'other', label: '⚧ Other' }].map(g => (
                        <button key={g.key} onClick={() => setGender(g.key)}
                          style={{ flex: 1, padding: '10px', borderRadius: '12px', border: `2px solid ${gender === g.key ? '#00e5ff' : 'rgba(255,255,255,0.08)'}`, background: gender === g.key ? 'rgba(0,229,255,0.1)' : '#0c1018', color: gender === g.key ? '#00e5ff' : '#4a5568', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>
                          {g.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* ── REFERRAL CODE FIELD ── */}
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ fontSize: '11px', color: '#4a5568', fontWeight: '600', marginBottom: '6px', letterSpacing: '1px' }}>REFERRAL CODE (OPTIONAL)</div>
                    <div style={{ position: 'relative' }}>
                      <input
                        value={referralCode}
                        onChange={e => {
                          const val = e.target.value.toLowerCase().replace(/\s/g, '')
                          setReferralCode(val)
                          setReferralValid(null)
                          setReferralUsername('')
                        }}
                        onBlur={() => verifyReferralCode(referralCode)}
                        placeholder="e.g. rafi4829"
                        style={{
                          width: '100%',
                          background: '#0c1018',
                          border: `1px solid ${referralValid === true ? '#00ff88' : referralValid === false ? '#ff4560' : 'rgba(255,255,255,0.08)'}`,
                          borderRadius: '12px',
                          padding: '12px 44px 12px 14px',
                          color: '#eef2f7',
                          fontSize: '14px',
                          outline: 'none',
                          boxSizing: 'border-box',
                          fontFamily: 'monospace',
                        }}
                      />
                      {referralCode && (
                        <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '16px' }}>
                          {referralValid === true ? '✅' : referralValid === false ? '❌' : '🔍'}
                        </span>
                      )}
                    </div>
                    {/* Referral status message */}
                    {referralValid === true && referralUsername && (
                      <div style={{ marginTop: '6px', fontSize: '12px', color: '#00ff88', fontWeight: '700' }}>
                        ✅ Referred by @{referralUsername}
                      </div>
                    )}
                    {referralValid === false && (
                      <div style={{ marginTop: '6px', fontSize: '12px', color: '#ff4560' }}>
                        ❌ Invalid referral code
                      </div>
                    )}
                    {!referralCode && (
                      <div style={{ marginTop: '5px', fontSize: '11px', color: '#2a3040' }}>
                        Have a friend's invite code? Enter it here.
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => setSignupStep(2)}
                      style={{ flex: 1, padding: '13px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px', color: '#8892a4', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}>
                      ← Back
                    </button>
                    <button onClick={handleSignup} disabled={loading}
                      style={{ flex: 2, padding: '13px', background: 'linear-gradient(135deg,#00e5ff,#00ff88)', border: 'none', borderRadius: '14px', color: '#070a10', fontSize: '14px', fontWeight: '800', cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.7 : 1 }}>
                      {loading ? 'Creating...' : '🚀 Join Echo World!'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '11px', color: '#2a3040' }}>
          By continuing you agree to our Terms & Privacy Policy
        </div>
      </div>

      <style>{`
        @keyframes glow { 0%,100%{opacity:0.5} 50%{opacity:1} }
        input::placeholder { color: #2a3040; }
      `}</style>
    </div>
  )
      }
