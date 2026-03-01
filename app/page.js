'use client'
import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default function Home() {
  const [mode, setMode] = useState('welcome') // welcome | login | signup1 | signup2 | signup3
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Signup fields
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [username, setUsername] = useState('')
  const [usernameError, setUsernameError] = useState('')
  const [dob, setDob] = useState('')
  const [gender, setGender] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPass, setShowPass] = useState(false)

  // Login fields
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')

  const validateUsername = (val) => {
    const clean = val.toLowerCase().replace(/[^a-z0-9_.]/g, '')
    setUsername(clean)
    if (clean.length < 3) setUsernameError('At least 3 characters')
    else if (clean.length > 20) setUsernameError('Max 20 characters')
    else if (!/^[a-z]/.test(clean)) setUsernameError('Must start with a letter')
    else setUsernameError('')
  }

  const checkUsername = async () => {
    if (usernameError || !username) return false
    const { data } = await supabase.from('profiles').select('id').eq('username', username).single()
    if (data) { setUsernameError('Username already taken'); return false }
    return true
  }

  const goToStep2 = async () => {
    if (!firstName.trim()) { setError('First name required'); return }
    if (!lastName.trim()) { setError('Last name required'); return }
    if (!username || usernameError) { setError('Valid username required'); return }
    setError('')
    setLoading(true)
    const ok = await checkUsername()
    setLoading(false)
    if (ok) setMode('signup2')
  }

  const goToStep3 = () => {
    if (!dob) { setError('Date of birth required'); return }
    const age = new Date().getFullYear() - new Date(dob).getFullYear()
    if (age < 13) { setError('Must be at least 13 years old'); return }
    if (!gender) { setError('Please select gender'); return }
    setError('')
    setMode('signup3')
  }

  const handleSignup = async () => {
    if (!phone.trim()) { setError('Phone number required'); return }
    if (!email.trim()) { setError('Email required'); return }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return }
    if (password !== confirmPassword) { setError('Passwords do not match'); return }
    setError('')
    setLoading(true)

    const { data, error: signupError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: `${firstName} ${lastName}`,
          username,
        }
      }
    })

    if (signupError) { setError(signupError.message); setLoading(false); return }

    if (data.user) {
      await supabase.from('profiles').upsert({
        id: data.user.id,
        username,
        full_name: `${firstName} ${lastName}`,
        phone,
        date_of_birth: dob,
        gender,
        email,
      })
      window.location.href = '/feed'
    }
    setLoading(false)
  }

  const handleLogin = async () => {
    if (!loginEmail || !loginPassword) { setError('Fill all fields'); return }
    setError('')
    setLoading(true)
    const { error: loginError } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: loginPassword,
    })
    if (loginError) { setError('Wrong email or password'); setLoading(false); return }
    window.location.href = '/feed'
  }

  const handleGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/feed` }
    })
  }

  const bg = {minHeight:'100vh',background:'#070a10',color:'#eef2f7',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'24px'}
  const card = {width:'100%',maxWidth:'400px',background:'#111620',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'24px',padding:'28px 24px'}
  const input = {width:'100%',background:'#0c1018',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'12px',padding:'14px 16px',color:'#eef2f7',fontSize:'14px',outline:'none',boxSizing:'border-box',marginBottom:'10px'}
  const btn = {width:'100%',padding:'15px',background:'linear-gradient(135deg,#00e5ff,#00ff88)',border:'none',borderRadius:'14px',fontSize:'15px',fontWeight:'800',color:'#070a10',cursor:'pointer',marginTop:'6px'}
  const btnGhost = {width:'100%',padding:'13px',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'14px',fontSize:'14px',fontWeight:'600',color:'#8892a4',cursor:'pointer',marginTop:'8px'}

  // WELCOME
  if (mode === 'welcome') return (
    <div style={bg}>
      <div style={{textAlign:'center',marginBottom:'40px'}}>
        <div style={{fontSize:'48px',marginBottom:'12px'}}>⬡</div>
        <div style={{fontSize:'32px',fontWeight:'900',background:'linear-gradient(90deg,#00e5ff,#00ff88)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',letterSpacing:'-1px'}}>ECHO WORLD</div>
        <div style={{fontSize:'14px',color:'#4a5568',marginTop:'8px'}}>Explore. Share. Discover.</div>
      </div>
      <div style={{width:'100%',maxWidth:'400px'}}>
        <button onClick={()=>setMode('signup1')} style={btn}>🚀 Create Account</button>
        <button onClick={()=>setMode('login')} style={{...btnGhost,marginTop:'12px'}}>🔑 Sign In</button>
        <div style={{textAlign:'center',margin:'16px 0',color:'#2a3040',fontSize:'13px'}}>— or —</div>
        <button onClick={handleGoogle} style={{...btnGhost,display:'flex',alignItems:'center',justifyContent:'center',gap:'10px',color:'#eef2f7'}}>
          <span style={{fontSize:'18px'}}>G</span> Continue with Google
        </button>
      </div>
    </div>
  )

  // LOGIN
  if (mode === 'login') return (
    <div style={bg}>
      <div style={{width:'100%',maxWidth:'400px'}}>
        <button onClick={()=>{setMode('welcome');setError('')}} style={{background:'none',border:'none',color:'#4a5568',fontSize:'24px',cursor:'pointer',marginBottom:'16px'}}>←</button>
        <div style={{fontSize:'24px',fontWeight:'800',marginBottom:'6px'}}>Welcome back 👋</div>
        <div style={{fontSize:'13px',color:'#4a5568',marginBottom:'24px'}}>Sign in to your account</div>

        <div style={card}>
          {error && <div style={{background:'rgba(255,69,96,0.1)',border:'1px solid rgba(255,69,96,0.2)',borderRadius:'10px',padding:'10px 14px',color:'#ff4560',fontSize:'13px',marginBottom:'14px'}}>{error}</div>}

          <input style={input} type="email" placeholder="Email address" value={loginEmail} onChange={e=>setLoginEmail(e.target.value)}/>
          <div style={{position:'relative'}}>
            <input style={{...input,paddingRight:'50px'}} type={showPass?'text':'password'} placeholder="Password" value={loginPassword} onChange={e=>setLoginPassword(e.target.value)}/>
            <button onClick={()=>setShowPass(!showPass)} style={{position:'absolute',right:'14px',top:'14px',background:'none',border:'none',color:'#4a5568',cursor:'pointer',fontSize:'16px'}}>{showPass?'🙈':'👁'}</button>
          </div>

          <button onClick={handleLogin} disabled={loading} style={{...btn,opacity:loading?0.7:1}}>
            {loading?'Signing in...':'Sign In →'}
          </button>
          <div style={{textAlign:'center',margin:'14px 0',color:'#2a3040',fontSize:'12px'}}>— or —</div>
          <button onClick={handleGoogle} style={{...btnGhost,display:'flex',alignItems:'center',justifyContent:'center',gap:'8px',color:'#eef2f7'}}>
            <span style={{fontSize:'16px'}}>G</span> Continue with Google
          </button>
          <div style={{textAlign:'center',marginTop:'16px'}}>
            <span style={{fontSize:'13px',color:'#4a5568'}}>No account? </span>
            <span onClick={()=>{setMode('signup1');setError('')}} style={{fontSize:'13px',color:'#00e5ff',cursor:'pointer',fontWeight:'600'}}>Sign Up</span>
          </div>
        </div>
      </div>
    </div>
  )

  // SIGNUP STEP 1
  if (mode === 'signup1') return (
    <div style={bg}>
      <div style={{width:'100%',maxWidth:'400px'}}>
        <button onClick={()=>{setMode('welcome');setError('')}} style={{background:'none',border:'none',color:'#4a5568',fontSize:'24px',cursor:'pointer',marginBottom:'12px'}}>←</button>

        {/* Progress */}
        <div style={{display:'flex',gap:'6px',marginBottom:'24px'}}>
          {[1,2,3].map(s => (
            <div key={s} style={{flex:1,height:'4px',borderRadius:'2px',background:s<=1?'linear-gradient(90deg,#00e5ff,#00ff88)':'rgba(255,255,255,0.08)'}}/>
          ))}
        </div>

        <div style={{fontSize:'22px',fontWeight:'800',marginBottom:'4px'}}>Create your account</div>
        <div style={{fontSize:'13px',color:'#4a5568',marginBottom:'24px'}}>Step 1 of 3 — Basic info</div>

        <div style={card}>
          {error && <div style={{background:'rgba(255,69,96,0.1)',border:'1px solid rgba(255,69,96,0.2)',borderRadius:'10px',padding:'10px 14px',color:'#ff4560',fontSize:'13px',marginBottom:'14px'}}>{error}</div>}

          <div style={{display:'flex',gap:'8px'}}>
            <input style={{...input,flex:1}} placeholder="First name" value={firstName} onChange={e=>setFirstName(e.target.value)}/>
            <input style={{...input,flex:1}} placeholder="Last name" value={lastName} onChange={e=>setLastName(e.target.value)}/>
          </div>

          <div style={{position:'relative'}}>
            <div style={{position:'absolute',left:'14px',top:'14px',color:'#4a5568',fontSize:'14px'}}>@</div>
            <input style={{...input,paddingLeft:'30px'}} placeholder="username" value={username} onChange={e=>validateUsername(e.target.value)}/>
          </div>
          {usernameError && <div style={{fontSize:'12px',color:'#ff4560',marginTop:'-8px',marginBottom:'8px'}}>⚠ {usernameError}</div>}
          {username && !usernameError && <div style={{fontSize:'12px',color:'#00ff88',marginTop:'-8px',marginBottom:'8px'}}>✓ @{username} looks good!</div>}
          <div style={{fontSize:'11px',color:'#4a5568',marginBottom:'12px'}}>Only letters, numbers, dots and underscores. Must start with a letter.</div>

          <button onClick={goToStep2} disabled={loading} style={{...btn,opacity:loading?0.7:1}}>
            {loading?'Checking...':'Next →'}
          </button>

          <div style={{textAlign:'center',marginTop:'16px'}}>
            <span style={{fontSize:'13px',color:'#4a5568'}}>Already have account? </span>
            <span onClick={()=>{setMode('login');setError('')}} style={{fontSize:'13px',color:'#00e5ff',cursor:'pointer',fontWeight:'600'}}>Sign In</span>
          </div>
        </div>
      </div>
    </div>
  )

  // SIGNUP STEP 2
  if (mode === 'signup2') return (
    <div style={bg}>
      <div style={{width:'100%',maxWidth:'400px'}}>
        <button onClick={()=>{setMode('signup1');setError('')}} style={{background:'none',border:'none',color:'#4a5568',fontSize:'24px',cursor:'pointer',marginBottom:'12px'}}>←</button>

        <div style={{display:'flex',gap:'6px',marginBottom:'24px'}}>
          {[1,2,3].map(s => (
            <div key={s} style={{flex:1,height:'4px',borderRadius:'2px',background:s<=2?'linear-gradient(90deg,#00e5ff,#00ff88)':'rgba(255,255,255,0.08)'}}/>
          ))}
        </div>

        <div style={{fontSize:'22px',fontWeight:'800',marginBottom:'4px'}}>About you</div>
        <div style={{fontSize:'13px',color:'#4a5568',marginBottom:'24px'}}>Step 2 of 3 — Personal info</div>

        <div style={card}>
          {error && <div style={{background:'rgba(255,69,96,0.1)',border:'1px solid rgba(255,69,96,0.2)',borderRadius:'10px',padding:'10px 14px',color:'#ff4560',fontSize:'13px',marginBottom:'14px'}}>{error}</div>}

          <div style={{fontSize:'12px',color:'#4a5568',marginBottom:'6px',fontWeight:'600'}}>DATE OF BIRTH</div>
          <input style={input} type="date" value={dob} onChange={e=>setDob(e.target.value)} max={new Date().toISOString().split('T')[0]}/>

          <div style={{fontSize:'12px',color:'#4a5568',margin:'8px 0 10px',fontWeight:'600'}}>GENDER</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'8px',marginBottom:'16px'}}>
            {[
              {key:'male',label:'👦 Male'},
              {key:'female',label:'👧 Female'},
              {key:'other',label:'🌈 Other'},
            ].map(g => (
              <div key={g.key} onClick={()=>setGender(g.key)}
                style={{padding:'12px 8px',borderRadius:'12px',textAlign:'center',cursor:'pointer',fontSize:'12px',fontWeight:'700',border:`2px solid ${gender===g.key?'#00e5ff':'rgba(255,255,255,0.07)'}`,background:gender===g.key?'rgba(0,229,255,0.08)':'rgba(255,255,255,0.02)',color:gender===g.key?'#00e5ff':'#4a5568'}}>
                {g.label}
              </div>
            ))}
          </div>

          <button onClick={goToStep3} style={btn}>Next →</button>
        </div>
      </div>
    </div>
  )

  // SIGNUP STEP 3
  return (
    <div style={bg}>
      <div style={{width:'100%',maxWidth:'400px'}}>
        <button onClick={()=>{setMode('signup2');setError('')}} style={{background:'none',border:'none',color:'#4a5568',fontSize:'24px',cursor:'pointer',marginBottom:'12px'}}>←</button>

        <div style={{display:'flex',gap:'6px',marginBottom:'24px'}}>
          {[1,2,3].map(s => (
            <div key={s} style={{flex:1,height:'4px',borderRadius:'2px',background:'linear-gradient(90deg,#00e5ff,#00ff88)'}}/>
          ))}
        </div>

        <div style={{fontSize:'22px',fontWeight:'800',marginBottom:'4px'}}>Almost done! 🎉</div>
        <div style={{fontSize:'13px',color:'#4a5568',marginBottom:'24px'}}>Step 3 of 3 — Contact & Password</div>

        <div style={card}>
          {error && <div style={{background:'rgba(255,69,96,0.1)',border:'1px solid rgba(255,69,96,0.2)',borderRadius:'10px',padding:'10px 14px',color:'#ff4560',fontSize:'13px',marginBottom:'14px'}}>{error}</div>}

          <div style={{position:'relative'}}>
            <div style={{position:'absolute',left:'14px',top:'14px',color:'#4a5568',fontSize:'14px'}}>📱</div>
            <input style={{...input,paddingLeft:'36px'}} type="tel" placeholder="Phone number (e.g. +8801...)" value={phone} onChange={e=>setPhone(e.target.value)}/>
          </div>

          <input style={input} type="email" placeholder="Email address" value={email} onChange={e=>setEmail(e.target.value)}/>

          <div style={{position:'relative'}}>
            <input style={{...input,paddingRight:'50px'}} type={showPass?'text':'password'} placeholder="Password (min 6 chars)" value={password} onChange={e=>setPassword(e.target.value)}/>
            <button onClick={()=>setShowPass(!showPass)} style={{position:'absolute',right:'14px',top:'14px',background:'none',border:'none',color:'#4a5568',cursor:'pointer',fontSize:'16px'}}>{showPass?'🙈':'👁'}</button>
          </div>

          <input style={input} type="password" placeholder="Confirm password" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)}/>

          {password && confirmPassword && (
            <div style={{fontSize:'12px',marginTop:'-6px',marginBottom:'8px',color:password===confirmPassword?'#00ff88':'#ff4560'}}>
              {password===confirmPassword?'✓ Passwords match':'✗ Passwords do not match'}
            </div>
          )}

          <div style={{background:'rgba(0,229,255,0.04)',border:'1px solid rgba(0,229,255,0.1)',borderRadius:'10px',padding:'10px 14px',marginBottom:'14px'}}>
            <div style={{fontSize:'12px',color:'#4a5568',lineHeight:'1.6'}}>
              By signing up you agree to Echo World's terms. Your info is kept private and secure.
            </div>
          </div>

          <button onClick={handleSignup} disabled={loading} style={{...btn,opacity:loading?0.7:1}}>
            {loading?'Creating account...':'🚀 Create Account'}
          </button>
        </div>
      </div>
    </div>
  )
        }
