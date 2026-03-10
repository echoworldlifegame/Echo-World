'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const CLOUD_NAME    = 'dbguxwpa8'
const UPLOAD_PRESET = 'echoworld_preset'
const USDT_ADDRESS  = 'TEU8tVcEifGgTCxkpCXKw3SMfeoFNfAWkJ'
const COIN_RATE     = 100 // 100 coins = 1 USDT

const fmtNum  = n => !n?'0':n>=1e6?(n/1e6).toFixed(1)+'M':n>=1000?(n/1000).toFixed(1)+'K':String(n)
const fmtUSD  = n => '$'+(parseFloat(n)||0).toFixed(2)
const timeAgo = d => {
  const s=Math.floor((Date.now()-new Date(d))/1000)
  if(s<60)return'এইমাত্র';if(s<3600)return Math.floor(s/60)+'মি';
  if(s<86400)return Math.floor(s/3600)+'ঘ';return Math.floor(s/86400)+'দিন'
}

const LEVELS = [
  {min:0,    name:'Explorer',    emoji:'🧭', color:'#4a5568'},
  {min:100,  name:'Rising Star', emoji:'🌟', color:'#00e5ff'},
  {min:300,  name:'Elite',       emoji:'⚡', color:'#00ff88'},
  {min:700,  name:'Champion',    emoji:'🏆', color:'#ffd700'},
  {min:1500, name:'Diamond',     emoji:'💎', color:'#a78bfa'},
  {min:3000, name:'Legend',      emoji:'👑', color:'#ff6b35'},
  {min:6000, name:'God Mode',    emoji:'🌌', color:'#ff4560'},
]
const getLevel = xp => [...LEVELS].reverse().find(l=>xp>=l.min)||LEVELS[0]
const getNextLevel = xp => LEVELS[LEVELS.findIndex(l=>l===getLevel(xp))+1]

// ══════════════════════════════════════════════════════════════════
export default function Profile() {
  const [user,         setUser]         = useState(null)
  const [profile,      setProfile]      = useState(null)
  const [posts,        setPosts]        = useState([])
  const [loading,      setLoading]      = useState(true)
  const [activeTab,    setActiveTab]    = useState('posts')
  const [mainView,     setMainView]     = useState('profile') // profile | settings | invest | refer
  const [supporters,   setSupporters]   = useState(0)
  const [supporting,   setSupporting]   = useState(0)
  const [totalLikes,   setTotalLikes]   = useState(0)

  // Invest data
  const [investments,  setInvestments]  = useState([])
  const [totalInvested,setTotalInvested]= useState(0)
  const [totalEarned,  setTotalEarned]  = useState(0)
  const [dailyEarning, setDailyEarning] = useState(0)
  const [investAccount,setInvestAccount]= useState(null)

  // Coin
  const [coinBalance,  setCoinBalance]  = useState(0)
  const [coinHistory,  setCoinHistory]  = useState([])

  // Referral
  const [referrals,    setReferrals]    = useState([])
  const [referralIncome,setReferralIncome]=useState(0)
  const [showShareCard,setShowShareCard]= useState(false)
  const [shareCopied,  setShareCopied]  = useState(false)

  // Edit profile
  const [editMode,     setEditMode]     = useState(false)
  const [editName,     setEditName]     = useState('')
  const [editBio,      setEditBio]      = useState('')
  const [editUsername, setEditUsername] = useState('')
  const [savingProfile,setSavingProfile]= useState(false)
  const [avatarUploading,setAvatarUploading]=useState(false)
  const [coverUploading,setCoverUploading]=useState(false)
  const avatarRef = useRef(null)
  const coverRef = useRef(null)

  // Settings
  const [settings,     setSettings]     = useState({
    notifications: true, darkMode: true, language: 'বাংলা',
    privacy: 'public', twoFA: false, autoPlay: true,
    emailAlerts: true, pushAlerts: true,
  })
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // Post delete
  const [deleteTarget, setDeleteTarget] = useState(null)
  const longPressTimer = useRef(null)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { window.location.href = '/'; return }
      const u = data.session.user; setUser(u)
      await loadAll(u.id)
    })
  }, [])

  const loadAll = async (uid) => {
    setLoading(true)
    const [
      { data: p },
      { data: myPosts },
      { count: suppCount },
      { count: suppingCount },
    ] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', uid).single(),
      supabase.from('posts').select('*').eq('user_id', uid).order('created_at', { ascending: false }),
      supabase.from('followers').select('*', { count:'exact', head:true }).eq('following_id', uid),
      supabase.from('followers').select('*', { count:'exact', head:true }).eq('follower_id', uid),
    ])
    setProfile(p); setPosts(myPosts||[])
    setSupporters(suppCount||0); setSupporting(suppingCount||0)
    setTotalLikes((myPosts||[]).reduce((s,post)=>s+(post.likes_count||0),0))
    setCoinBalance(p?.coin_balance||0)
    if (p) { setEditName(p.full_name||''); setEditBio(p.bio||''); setEditUsername(p.username||'') }

    // Invest account
    const { data: acc } = await supabase.from('investment_accounts').select('*').eq('user_id', uid).single()
    setInvestAccount(acc)

    // Investments
    const { data: invs } = await supabase.from('investments').select('*').eq('user_id', uid).eq('status', 'active')
    setInvestments(invs||[])
    const tot = (invs||[]).reduce((s,i)=>s+(parseFloat(i.amount)||0),0)
    setTotalInvested(tot)

    // Earnings
    const { data: earns } = await supabase.from('daily_earnings').select('*').eq('user_id', uid).order('created_at', { ascending: false }).limit(30)
    const earned = (earns||[]).reduce((s,e)=>s+(parseFloat(e.amount)||0),0)
    setTotalEarned(earned)
    setDailyEarning((earns&&earns[0])?parseFloat(earns[0].amount)||0:0)

    // Referrals
    const { data: refs } = await supabase.from('referrals').select('*, profiles!referrals_referred_id_fkey(username, full_name, avatar_url, created_at)').eq('referrer_id', uid)
    setReferrals(refs||[])
    const refIncome = (refs||[]).reduce((s,r)=>s+(parseFloat(r.total_earned)||0),0)
    setReferralIncome(refIncome)

    // Coin history
    const { data: coins } = await supabase.from('coin_transactions').select('*').eq('user_id', uid).order('created_at', { ascending: false }).limit(20)
    setCoinHistory(coins||[])

    setLoading(false)
  }

  const saveProfile = async () => {
    if (!user) return
    if (!editName.trim()) { alert('নাম দাও'); return }
    if (!editUsername.trim()) { alert('Username দাও'); return }
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(editUsername.trim())) { alert('Username: শুধু letters, numbers, _ (3-20 chars)'); return }
    setSavingProfile(true)
    try {
      // Check username uniqueness (skip own)
      const { data: existing } = await supabase.from('profiles')
        .select('id').eq('username', editUsername.trim().toLowerCase()).neq('id', user.id).single()
      if (existing) { alert('এই username টি অন্য কেউ নিয়েছে! অন্য username চেষ্টা করো।'); setSavingProfile(false); return }

      const { error } = await supabase.from('profiles').update({
        full_name: editName.trim(),
        bio: editBio.trim(),
        username: editUsername.trim().toLowerCase(),
        updated_at: new Date().toISOString(),
      }).eq('id', user.id)
      if (error) throw error
      await loadAll(user.id)
      setEditMode(false)
      alert('✅ Profile saved!')
    } catch(e) {
      console.error('saveProfile error:', e)
      alert('❌ Save failed: ' + (e.message || 'Unknown error'))
    }
    setSavingProfile(false)
  }

  const uploadAvatar = async (file) => {
    if (!file||!user) return
    if (file.size > 5 * 1024 * 1024) { alert('Image size 5MB এর বেশি না'); return }
    setAvatarUploading(true)
    const fd = new FormData()
    fd.append('file', file)
    fd.append('upload_preset', UPLOAD_PRESET)
    fd.append('folder', 'avatars')
    try {
      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method:'POST', body:fd })
      const d = await res.json()
      if (!d.secure_url) throw new Error(d.error?.message || 'Upload failed')
      const { error } = await supabase.from('profiles').update({ avatar_url: d.secure_url }).eq('id', user.id)
      if (error) throw error
      setProfile(p => ({ ...p, avatar_url: d.secure_url }))
      alert('✅ Profile photo updated!')
    } catch(e) {
      console.error('Avatar upload error:', e)
      alert('❌ Upload failed: ' + (e.message || 'Try again'))
    }
    setAvatarUploading(false)
  }

  const uploadCover = async (file) => {
    if (!file||!user) return
    if (file.size > 8 * 1024 * 1024) { alert('Cover image 8MB এর বেশি না'); return }
    setCoverUploading(true)
    const fd = new FormData()
    fd.append('file', file)
    fd.append('upload_preset', UPLOAD_PRESET)
    fd.append('folder', 'covers')
    try {
      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method:'POST', body:fd })
      const d = await res.json()
      if (!d.secure_url) throw new Error(d.error?.message || 'Upload failed')
      const { error } = await supabase.from('profiles').update({ cover_url: d.secure_url }).eq('id', user.id)
      if (error) throw error
      setProfile(p => ({ ...p, cover_url: d.secure_url }))
      alert('✅ Cover photo updated!')
    } catch(e) {
      console.error('Cover upload error:', e)
      alert('❌ Upload failed: ' + (e.message || 'Try again'))
    }
    setCoverUploading(false)
  }

  const handleLongPressStart = (post) => { longPressTimer.current = setTimeout(()=>setDeleteTarget(post), 700) }
  const handleLongPressEnd   = () => clearTimeout(longPressTimer.current)
  const confirmDelete = async () => {
    if (!deleteTarget) return
    await supabase.from('posts').delete().eq('id', deleteTarget.id)
    setPosts(p=>p.filter(x=>x.id!==deleteTarget.id)); setDeleteTarget(null)
  }

  const getShareUrl = () => `${typeof window!=='undefined'?window.location.origin:''}/register?ref=${profile?.referral_code||profile?.username||user?.id?.slice(0,8)}`

  const shareReferral = async () => {
    const url = getShareUrl()
    try { await navigator.share({ title:'Echo World এ যোগ দাও', text:'আমার সাথে Echo World এ Join করো!', url }) }
    catch(e) { navigator.clipboard?.writeText(url); setShareCopied(true); setTimeout(()=>setShareCopied(false),2500) }
  }

  if (loading) return (
    <div style={{ minHeight:'100vh', background:'#070a10', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ width:48, height:48, border:'3px solid rgba(0,229,255,.2)', borderTop:'3px solid #00e5ff', borderRadius:'50%', animation:'spin 1s linear infinite' }}/>
    </div>
  )

  const xp    = profile?.xp || 0
  const level = getLevel(xp)
  const nextL = getNextLevel(xp)
  const xpPct = nextL ? Math.round(((xp - level.min) / (nextL.min - level.min)) * 100) : 100
  const pName = profile?.full_name || profile?.username || 'User'
  const filteredPosts = posts.filter(p => activeTab==='all'?true:p.media_type===activeTab)
  const referralUrl = getShareUrl()
  const totalBalance = (investAccount?.balance||0) + totalEarned + (coinBalance/COIN_RATE)

  return (
    <div style={{ minHeight:'100vh', background:'#070a10', color:'#eef2f7', fontFamily:"'DM Sans',system-ui,sans-serif", paddingBottom:90 }}>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        @keyframes slideIn{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:translateX(0)}}
        @keyframes shimmer{0%{background-position:-400px 0}100%{background-position:400px 0}}
        @keyframes popIn{0%{transform:scale(0.8);opacity:0}100%{transform:scale(1);opacity:1}}
        @keyframes glow{0%,100%{box-shadow:0 0 20px rgba(0,229,255,.3)}50%{box-shadow:0 0 35px rgba(0,229,255,.6)}}
        *{box-sizing:border-box} ::-webkit-scrollbar{display:none}
        input,textarea{-webkit-appearance:none}
      `}</style>

      {/* ── NAV TABS TOP ── */}
      <div style={{ position:'sticky', top:0, zIndex:100, background:'rgba(7,10,16,.97)', backdropFilter:'blur(16px)', borderBottom:'1px solid rgba(255,255,255,.06)', padding:'0 12px' }}>
        <div style={{ display:'flex', gap:0, height:50 }}>
          {[
            ['profile','👤','Profile'],
            ['invest',  '💰','Wallet'],
            ['refer',   '🔗','Refer'],
            ['settings','⚙️','Settings'],
          ].map(([key,icon,label])=>(
            <button key={key} onClick={()=>setMainView(key)}
              style={{ flex:1, background:'none', border:'none', cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:1, borderBottom: mainView===key?'2px solid #00e5ff':'2px solid transparent', color: mainView===key?'#00e5ff':'#4a5568', transition:'all .2s' }}>
              <span style={{ fontSize:16 }}>{icon}</span>
              <span style={{ fontSize:9, fontWeight:700, letterSpacing:.5 }}>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════ */}
      {/* PROFILE VIEW */}
      {/* ══════════════════════════════════════════ */}
      {mainView === 'profile' && (
        <div style={{ animation:'fadeUp .3s ease' }}>

          {/* COVER + AVATAR */}
          <div style={{ position:'relative', height:180 }}>
            {/* Cover photo or gradient */}
            <div style={{ position:'absolute', inset:0, overflow:'hidden', background:`linear-gradient(135deg, ${level.color}22, #0d1220 60%)` }}>
              {profile?.cover_url
                ? <img src={profile.cover_url} style={{ width:'100%', height:'100%', objectFit:'cover' }} onError={e=>e.target.style.display='none'}/>
                : <>
                    <div style={{ position:'absolute', inset:0, backgroundImage:'radial-gradient(circle at 20% 50%, rgba(0,229,255,.08) 0%, transparent 60%), radial-gradient(circle at 80% 20%, rgba(0,255,136,.06) 0%, transparent 50%)' }}/>
                    <div style={{ position:'absolute', inset:0, backgroundImage:'linear-gradient(rgba(255,255,255,.02) 1px, transparent 1px),linear-gradient(90deg,rgba(255,255,255,.02) 1px,transparent 1px)', backgroundSize:'40px 40px', opacity:.5 }}/>
                  </>
              }
              {/* Cover upload button */}
              <button onClick={()=>coverRef.current?.click()}
                style={{ position:'absolute', top:10, right:10, padding:'5px 12px', background:'rgba(0,0,0,.5)', border:'1px solid rgba(255,255,255,.2)', borderRadius:20, color:'#fff', fontSize:11, fontWeight:700, cursor:'pointer', backdropFilter:'blur(8px)', display:'flex', alignItems:'center', gap:5 }}>
                {coverUploading ? '⏳' : '📷'} {coverUploading ? 'Uploading...' : 'Cover'}
              </button>
              <input ref={coverRef} type='file' accept='image/*' style={{ display:'none' }} onChange={e=>uploadCover(e.target.files[0])}/>
            </div>
            {/* Avatar */}
            <div style={{ position:'absolute', bottom:-44, left:20, zIndex:5 }}>
              <div style={{ position:'relative', width:90, height:90 }}>
                <div style={{ width:90, height:90, borderRadius:'50%', border:`3px solid ${level.color}`, overflow:'hidden', background:'linear-gradient(135deg,#111826,#0d1220)', display:'flex', alignItems:'center', justifyContent:'center', animation:'glow 3s infinite' }}>
                  {profile?.avatar_url
                    ? <img src={profile.avatar_url} style={{ width:'100%', height:'100%', objectFit:'cover' }} onError={e=>e.target.style.display='none'}/>
                    : <span style={{ fontSize:36, fontWeight:900, background:`linear-gradient(135deg,${level.color},#fff)`, WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>{pName[0]?.toUpperCase()}</span>}
                </div>
                {avatarUploading && <div style={{ position:'absolute', inset:0, borderRadius:'50%', background:'rgba(0,0,0,.7)', display:'flex', alignItems:'center', justifyContent:'center' }}><div style={{ width:24, height:24, border:'2px solid #00e5ff', borderTopColor:'transparent', borderRadius:'50%', animation:'spin 1s linear infinite' }}/></div>}
                <button onClick={()=>avatarRef.current?.click()} style={{ position:'absolute', bottom:0, right:0, width:28, height:28, borderRadius:'50%', background:'linear-gradient(135deg,#00e5ff,#00ff88)', border:'2px solid #070a10', cursor:'pointer', fontSize:12, display:'flex', alignItems:'center', justifyContent:'center' }}>📷</button>
                <input ref={avatarRef} type='file' accept='image/*' style={{ display:'none' }} onChange={e=>uploadAvatar(e.target.files[0])}/>
              </div>
            </div>
            {/* Edit + Settings buttons */}
            <div style={{ position:'absolute', bottom:10, right:14, display:'flex', gap:8 }}>
              <button onClick={()=>setEditMode(p=>!p)} style={{ padding:'7px 16px', background: editMode?'rgba(0,229,255,.15)':'rgba(255,255,255,.08)', border:`1px solid ${editMode?'rgba(0,229,255,.4)':'rgba(255,255,255,.15)'}`, borderRadius:20, color: editMode?'#00e5ff':'#eef2f7', fontSize:12, fontWeight:700, cursor:'pointer' }}>
                {editMode ? '✕ Cancel' : '✏️ Edit'}
              </button>
            </div>
          </div>

          {/* PROFILE INFO */}
          <div style={{ padding:'52px 20px 0' }}>
            {editMode ? (
              <div style={{ animation:'popIn .2s ease', marginBottom:16 }}>
                <input value={editName} onChange={e=>setEditName(e.target.value)} placeholder='Full Name'
                  style={{ width:'100%', background:'rgba(255,255,255,.06)', border:'1px solid rgba(255,255,255,.12)', borderRadius:12, padding:'11px 14px', color:'#eef2f7', fontSize:14, outline:'none', marginBottom:8 }}/>
                <input value={editUsername} onChange={e=>setEditUsername(e.target.value)} placeholder='@username'
                  style={{ width:'100%', background:'rgba(255,255,255,.06)', border:'1px solid rgba(255,255,255,.12)', borderRadius:12, padding:'11px 14px', color:'#eef2f7', fontSize:14, outline:'none', marginBottom:8 }}/>
                <textarea value={editBio} onChange={e=>setEditBio(e.target.value)} placeholder='Bio লেখো...' rows={2}
                  style={{ width:'100%', background:'rgba(255,255,255,.06)', border:'1px solid rgba(255,255,255,.12)', borderRadius:12, padding:'11px 14px', color:'#eef2f7', fontSize:13, outline:'none', resize:'none', marginBottom:10 }}/>
                <button onClick={saveProfile} disabled={savingProfile} style={{ width:'100%', padding:13, background:'linear-gradient(135deg,#00e5ff,#00ff88)', border:'none', borderRadius:12, color:'#070a12', fontSize:14, fontWeight:800, cursor:'pointer' }}>
                  {savingProfile ? '⏳ Saving...' : '✅ Save Profile'}
                </button>
              </div>
            ) : (
              <div style={{ marginBottom:14 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:3 }}>
                  <span style={{ fontSize:20, fontWeight:900, color:'#eef2f7' }}>{pName}</span>
                  <span style={{ fontSize:18 }}>{level.emoji}</span>
                  <span style={{ fontSize:11, background:`${level.color}22`, border:`1px solid ${level.color}44`, borderRadius:20, padding:'2px 10px', color:level.color, fontWeight:700 }}>{level.name}</span>
                </div>
                <div style={{ fontSize:13, color:'#4a5568', marginBottom:6 }}>@{profile?.username}</div>
                {profile?.bio && <div style={{ fontSize:13, color:'#b0b8c8', lineHeight:1.6, marginBottom:8 }}>{profile.bio}</div>}
              </div>
            )}

            {/* STATS ROW */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, marginBottom:16 }}>
              {[
                ['👥', fmtNum(supporters),   'Supporters'],
                ['🌍', fmtNum(supporting),   'Supporting'],
                ['❤️', fmtNum(totalLikes),    'Likes'],
                ['📝', fmtNum(posts.length), 'Posts'],
              ].map(([ic,val,lab],i)=>(
                <div key={i} style={{ background:'#111826', borderRadius:12, padding:'10px 6px', textAlign:'center', border:'1px solid rgba(255,255,255,.05)' }}>
                  <div style={{ fontSize:16 }}>{ic}</div>
                  <div style={{ fontSize:16, fontWeight:900, color:'#eef2f7' }}>{val}</div>
                  <div style={{ fontSize:9, color:'#4a5568', fontWeight:600 }}>{lab}</div>
                </div>
              ))}
            </div>

            {/* XP LEVEL BAR */}
            <div style={{ background:'#111826', borderRadius:14, padding:'12px 14px', marginBottom:14, border:'1px solid rgba(255,255,255,.05)' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ fontSize:20 }}>{level.emoji}</span>
                  <div>
                    <div style={{ fontSize:13, fontWeight:800, color:level.color }}>{level.name}</div>
                    <div style={{ fontSize:10, color:'#4a5568' }}>{fmtNum(xp)} XP</div>
                  </div>
                </div>
                {nextL && <div style={{ fontSize:10, color:'#4a5568', textAlign:'right' }}>{nextL.emoji} {nextL.name}<br/><span style={{ color:'#eef2f7', fontWeight:700 }}>{fmtNum(nextL.min - xp)} XP left</span></div>}
              </div>
              <div style={{ height:6, background:'rgba(255,255,255,.08)', borderRadius:3, overflow:'hidden' }}>
                <div style={{ height:'100%', width:`${xpPct}%`, background:`linear-gradient(90deg,${level.color},${nextL?.color||level.color})`, borderRadius:3, transition:'width 1s ease' }}/>
              </div>
            </div>

            {/* 🪙 COIN BALANCE CARD */}
            <div style={{ background:'linear-gradient(135deg,#1a1720,#0f1318)', border:'1px solid rgba(255,215,0,.2)', borderRadius:16, padding:'14px 16px', marginBottom:14, position:'relative', overflow:'hidden' }}>
              <div style={{ position:'absolute', top:-20, right:-20, width:80, height:80, borderRadius:'50%', background:'rgba(255,215,0,.06)' }}/>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <div>
                  <div style={{ fontSize:11, color:'#4a5568', fontWeight:700, marginBottom:4 }}>🪙 Echo Coins</div>
                  <div style={{ fontSize:30, fontWeight:900, color:'#ffd700', letterSpacing:-1 }}>{fmtNum(coinBalance)}</div>
                  <div style={{ fontSize:10, color:'#4a5568', marginTop:2 }}>{(coinBalance/COIN_RATE).toFixed(2)} USDT সমতুল্য</div>
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                  <button onClick={()=>window.location.href='/coins'} style={{ padding:'8px 16px', background:'linear-gradient(135deg,#ffd700,#ff6b35)', border:'none', borderRadius:10, color:'#070a12', fontSize:12, fontWeight:800, cursor:'pointer' }}>💳 Buy</button>
                  <button onClick={()=>{setActiveTab('coins');setMainView('profile')}} style={{ padding:'8px 16px', background:'rgba(255,215,0,.1)', border:'1px solid rgba(255,215,0,.2)', borderRadius:10, color:'#ffd700', fontSize:12, fontWeight:700, cursor:'pointer' }}>📊 History</button>
                </div>
              </div>
              {/* Mini coin history preview */}
              {coinHistory.length>0&&(
                <div style={{ display:'flex', gap:6, marginTop:10, overflowX:'auto', scrollbarWidth:'none' }}>
                  {coinHistory.slice(0,4).map((tx,i)=>(
                    <div key={i} style={{ flexShrink:0, background:'rgba(255,255,255,.04)', borderRadius:8, padding:'5px 10px', whiteSpace:'nowrap' }}>
                      <span style={{ fontSize:10, color: tx.amount>0?'#00ff88':'#ff4560', fontWeight:700 }}>{tx.amount>0?'+':''}{tx.amount} 🪙</span>
                      <div style={{ fontSize:9, color:'#4a5568' }}>{timeAgo(tx.created_at)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 💰 QUICK ACTION BUTTONS */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:14 }}>
              <button onClick={()=>setMainView('invest')} style={{ padding:'12px 10px', background:'linear-gradient(135deg,rgba(0,255,136,.12),rgba(0,229,255,.08))', border:'1px solid rgba(0,255,136,.2)', borderRadius:14, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
                <span style={{ fontSize:20 }}>💰</span>
                <div style={{ textAlign:'left' }}>
                  <div style={{ fontSize:12, fontWeight:800, color:'#00ff88' }}>Invest Wallet</div>
                  <div style={{ fontSize:10, color:'#4a5568' }}>{fmtUSD(totalInvested)} invested</div>
                </div>
              </button>
              <button onClick={()=>setMainView('refer')} style={{ padding:'12px 10px', background:'linear-gradient(135deg,rgba(255,107,53,.12),rgba(255,215,0,.08))', border:'1px solid rgba(255,107,53,.2)', borderRadius:14, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
                <span style={{ fontSize:20 }}>🔗</span>
                <div style={{ textAlign:'left' }}>
                  <div style={{ fontSize:12, fontWeight:800, color:'#ff6b35' }}>Refer & Earn</div>
                  <div style={{ fontSize:10, color:'#4a5568' }}>{referrals.length} referrals</div>
                </div>
              </button>
            </div>

            {/* POST TABS */}
            <div style={{ display:'flex', gap:6, marginBottom:12, overflowX:'auto', scrollbarWidth:'none' }}>
              {[['all','🌐','All'],['photos','📸','Photos'],['videos','🎬','Videos'],['capsule','📦','Capsules']].map(([key,ic,lab])=>(
                <button key={key} onClick={()=>setActiveTab(key)} style={{ padding:'7px 14px', borderRadius:20, border:'none', cursor:'pointer', fontSize:12, fontWeight:700, whiteSpace:'nowrap', flexShrink:0, background: activeTab===key?`linear-gradient(135deg,${level.color},${level.color}88)`:'rgba(255,255,255,.06)', color: activeTab===key?'#070a12':'#4a5568' }}>{ic} {lab}</button>
              ))}
            </div>

            {/* POSTS GRID */}
            <div style={{ fontSize:9, color:'#2a3040', marginBottom:8, textAlign:'center' }}>Long press to delete</div>
            {filteredPosts.length===0 ? (
              <div style={{ textAlign:'center', padding:'40px 20px' }}>
                <div style={{ fontSize:48, marginBottom:10 }}>📭</div>
                <div style={{ color:'#4a5568', fontSize:14, marginBottom:14 }}>No posts yet</div>
                <button onClick={()=>window.location.href='/post'} style={{ background:'linear-gradient(135deg,#00e5ff,#00ff88)', border:'none', borderRadius:12, padding:'10px 24px', fontSize:14, fontWeight:700, color:'#070a10', cursor:'pointer' }}>Create First Post</button>
              </div>
            ) : (
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                {filteredPosts.map(post=>(
                  <div key={post.id}
                    onTouchStart={()=>handleLongPressStart(post)} onTouchEnd={handleLongPressEnd}
                    onMouseDown={()=>handleLongPressStart(post)} onMouseUp={handleLongPressEnd} onMouseLeave={handleLongPressEnd}
                    onClick={()=>{ if(!deleteTarget) window.location.href=`/post/${post.id}` }}
                    style={{ background:'#111620', borderRadius:14, overflow:'hidden', cursor:'pointer', position:'relative', aspectRatio:'1', border:'1px solid rgba(255,255,255,.05)' }}>
                    {post.media_url&&post.media_type==='photo'&&<img src={post.media_url} style={{ width:'100%', height:'100%', objectFit:'cover' }}/>}
                    {post.media_url&&post.media_type==='video'&&<video src={post.media_url} style={{ width:'100%', height:'100%', objectFit:'cover' }} muted playsInline/>}
                    {post.media_type==='capsule'&&<div style={{ width:'100%', height:'100%', background:'linear-gradient(135deg,rgba(255,202,40,.1),rgba(255,165,0,.05))', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:6 }}><span style={{ fontSize:32 }}>📦</span><span style={{ fontSize:10, color:'#ffca28', fontWeight:600 }}>Capsule</span></div>}
                    {!post.media_url&&post.media_type!=='capsule'&&<div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', padding:12 }}><div style={{ fontSize:12, color:'#8892a4', lineHeight:1.5, textAlign:'center' }}>{post.content?.slice(0,60)}{post.content?.length>60?'...':''}</div></div>}
                    <div style={{ position:'absolute', inset:0, background:'linear-gradient(to top,rgba(0,0,0,.7) 0%,transparent 50%)', pointerEvents:'none' }}/>
                    {post.media_type==='video'&&<div style={{ position:'absolute', top:8, right:8, background:'rgba(0,0,0,.6)', borderRadius:6, padding:'3px 6px', fontSize:11 }}>▶</div>}
                    <div style={{ position:'absolute', bottom:6, left:8, fontSize:11, color:'#fff', fontWeight:700 }}>❤️ {post.likes_count||0}</div>
                    <div style={{ position:'absolute', bottom:6, right:8, fontSize:9, color:'rgba(255,255,255,.5)' }}>{timeAgo(post.created_at)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════ */}
      {/* INVEST WALLET VIEW */}
      {/* ══════════════════════════════════════════ */}
      {mainView === 'invest' && (
        <div style={{ padding:'16px 14px', animation:'fadeUp .3s ease' }}>
          {/* Total balance hero */}
          <div style={{ background:'linear-gradient(135deg,#0d1a14,#0a1520)', border:'1px solid rgba(0,255,136,.2)', borderRadius:20, padding:'22px 20px', marginBottom:16, position:'relative', overflow:'hidden', textAlign:'center' }}>
            <div style={{ position:'absolute', top:-40, right:-40, width:140, height:140, borderRadius:'50%', background:'rgba(0,255,136,.05)' }}/>
            <div style={{ position:'absolute', bottom:-30, left:-30, width:100, height:100, borderRadius:'50%', background:'rgba(0,229,255,.04)' }}/>
            <div style={{ fontSize:12, color:'#4a5568', fontWeight:700, marginBottom:6, position:'relative' }}>💰 Total Wallet Balance</div>
            <div style={{ fontSize:40, fontWeight:900, background:'linear-gradient(135deg,#00ff88,#00e5ff)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', position:'relative' }}>{fmtUSD(totalBalance)}</div>
            <div style={{ fontSize:11, color:'#4a5568', marginTop:4, position:'relative' }}>USDT equivalent</div>
          </div>

          {/* 4-card grid */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:16 }}>
            {[
              { ic:'💼', label:'Total Invested',  val:fmtUSD(totalInvested),  color:'#00e5ff', sub:`${investments.length} active plan${investments.length!==1?'s':''}` },
              { ic:'📈', label:'Total Earned',    val:fmtUSD(totalEarned),    color:'#00ff88', sub:'All time earnings' },
              { ic:'⚡', label:"Today's Earning", val:fmtUSD(dailyEarning),   color:'#ffd700', sub:'Daily income' },
              { ic:'🔗', label:'Referral Income', val:fmtUSD(referralIncome), color:'#ff6b35', sub:`${referrals.length} referrals` },
            ].map((card,i)=>(
              <div key={i} style={{ background:'#111826', borderRadius:14, padding:'14px 12px', border:'1px solid rgba(255,255,255,.05)', position:'relative', overflow:'hidden' }}>
                <div style={{ position:'absolute', top:-10, right:-10, width:50, height:50, borderRadius:'50%', background:`${card.color}0d` }}/>
                <div style={{ fontSize:20, marginBottom:6 }}>{card.ic}</div>
                <div style={{ fontSize:10, color:'#4a5568', marginBottom:3, fontWeight:700 }}>{card.label}</div>
                <div style={{ fontSize:20, fontWeight:900, color:card.color }}>{card.val}</div>
                <div style={{ fontSize:9, color:'#4a5568', marginTop:2 }}>{card.sub}</div>
              </div>
            ))}
          </div>

          {/* Account info */}
          <div style={{ background:'#111826', borderRadius:16, padding:'14px 16px', marginBottom:14, border:'1px solid rgba(255,255,255,.05)' }}>
            <div style={{ fontSize:13, fontWeight:800, color:'#eef2f7', marginBottom:12, display:'flex', alignItems:'center', gap:8 }}>
              <span>🏦</span> Investment Account
            </div>
            {investAccount ? (
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                {[
                  ['Account ID', investAccount.id?.slice(0,8)+'...'],
                  ['Balance',    fmtUSD(investAccount.balance||0)],
                  ['Status',     investAccount.status||'Active'],
                  ['Member Since', new Date(investAccount.created_at).toLocaleDateString('bn-BD')],
                ].map(([k,v],i)=>(
                  <div key={i} style={{ background:'rgba(255,255,255,.03)', borderRadius:10, padding:'10px 12px' }}>
                    <div style={{ fontSize:10, color:'#4a5568', marginBottom:3 }}>{k}</div>
                    <div style={{ fontSize:13, fontWeight:700, color:'#eef2f7' }}>{v}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign:'center', padding:'16px 0' }}>
                <div style={{ fontSize:13, color:'#4a5568', marginBottom:10 }}>Investment account নেই</div>
                <button onClick={()=>window.location.href='/invest'} style={{ padding:'10px 24px', background:'linear-gradient(135deg,#00e5ff,#00ff88)', border:'none', borderRadius:12, color:'#070a12', fontSize:13, fontWeight:800, cursor:'pointer' }}>💰 Start Investing</button>
              </div>
            )}
          </div>

          {/* Active plans */}
          {investments.length>0&&(
            <div style={{ marginBottom:14 }}>
              <div style={{ fontSize:13, fontWeight:800, color:'#eef2f7', marginBottom:10, display:'flex', alignItems:'center', gap:8 }}><span>📊</span> Active Plans</div>
              {investments.map((inv,i)=>{
                const rate = parseFloat(inv.amount)>=1000?3:parseFloat(inv.amount)>=500?2.5:2
                const daily = parseFloat(inv.amount)*rate/100
                const daysLeft = inv.maturity_date ? Math.max(0,Math.ceil((new Date(inv.maturity_date)-Date.now())/86400000)) : 365
                return (
                  <div key={inv.id||i} style={{ background:'#111826', borderRadius:14, padding:'14px 16px', marginBottom:8, border:'1px solid rgba(0,229,255,.1)' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
                      <div>
                        <div style={{ fontSize:13, fontWeight:800, color:'#eef2f7' }}>{parseFloat(inv.amount)>=1000?'⭐ Elite':parseFloat(inv.amount)>=500?'🌱 Growth':'🚀 Starter'} Plan</div>
                        <div style={{ fontSize:11, color:'#4a5568', marginTop:2 }}>Invested: {fmtUSD(inv.amount)}</div>
                      </div>
                      <div style={{ textAlign:'right' }}>
                        <div style={{ fontSize:16, fontWeight:900, color:'#00ff88' }}>{fmtUSD(daily)}/day</div>
                        <div style={{ fontSize:10, color:'#4a5568' }}>{rate}% daily</div>
                      </div>
                    </div>
                    <div style={{ height:4, background:'rgba(255,255,255,.08)', borderRadius:2, overflow:'hidden' }}>
                      <div style={{ height:'100%', width:`${Math.min(100,Math.max(0,((365-daysLeft)/365)*100))}%`, background:'linear-gradient(90deg,#00e5ff,#00ff88)', borderRadius:2 }}/>
                    </div>
                    <div style={{ fontSize:10, color:'#4a5568', marginTop:4 }}>{daysLeft} days remaining</div>
                  </div>
                )
              })}
            </div>
          )}

          <button onClick={()=>window.location.href='/invest'} style={{ width:'100%', padding:14, background:'linear-gradient(135deg,#00e5ff,#00ff88)', border:'none', borderRadius:14, color:'#070a12', fontSize:14, fontWeight:800, cursor:'pointer' }}>
            💰 Invest Page এ যাও
          </button>
        </div>
      )}

      {/* ══════════════════════════════════════════ */}
      {/* REFER VIEW */}
      {/* ══════════════════════════════════════════ */}
      {mainView === 'refer' && (
        <div style={{ padding:'16px 14px', animation:'fadeUp .3s ease' }}>

          {/* Refer income hero */}
          <div style={{ background:'linear-gradient(135deg,#1a1020,#0f0d1a)', border:'1px solid rgba(255,107,53,.25)', borderRadius:20, padding:'22px 20px', marginBottom:16, textAlign:'center', position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute', top:-30, left:'50%', transform:'translateX(-50%)', width:180, height:80, borderRadius:'50%', background:'rgba(255,107,53,.06)', filter:'blur(20px)' }}/>
            <div style={{ fontSize:40, marginBottom:6 }}>🔗</div>
            <div style={{ fontSize:12, color:'#4a5568', fontWeight:700, marginBottom:6 }}>Total Referral Income</div>
            <div style={{ fontSize:36, fontWeight:900, background:'linear-gradient(135deg,#ff6b35,#ffd700)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>{fmtUSD(referralIncome)}</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginTop:12 }}>
              <div style={{ background:'rgba(255,255,255,.04)', borderRadius:10, padding:'8px 0' }}>
                <div style={{ fontSize:18, fontWeight:900, color:'#ff6b35' }}>{referrals.length}</div>
                <div style={{ fontSize:10, color:'#4a5568' }}>Total Referrals</div>
              </div>
              <div style={{ background:'rgba(255,255,255,.04)', borderRadius:10, padding:'8px 0' }}>
                <div style={{ fontSize:18, fontWeight:900, color:'#ffd700' }}>{referrals.filter(r=>r.status==='valid').length}</div>
                <div style={{ fontSize:10, color:'#4a5568' }}>Valid (Active)</div>
              </div>
            </div>
          </div>

          {/* Refer code & link */}
          <div style={{ background:'#111826', borderRadius:16, padding:'16px', marginBottom:14, border:'1px solid rgba(255,255,255,.06)' }}>
            <div style={{ fontSize:13, fontWeight:800, color:'#eef2f7', marginBottom:12 }}>🎯 তোমার Refer Code</div>
            <div style={{ background:'rgba(0,229,255,.06)', border:'1px solid rgba(0,229,255,.15)', borderRadius:12, padding:'12px 16px', marginBottom:10, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div>
                <div style={{ fontSize:9, color:'#4a5568', marginBottom:3 }}>REFERRAL CODE</div>
                <div style={{ fontSize:20, fontWeight:900, color:'#00e5ff', letterSpacing:2, fontFamily:'monospace' }}>
                  {profile?.referral_code || profile?.username?.toUpperCase() || user?.id?.slice(0,8).toUpperCase()}
                </div>
              </div>
              <button onClick={()=>{navigator.clipboard?.writeText(profile?.referral_code||profile?.username||'');setShareCopied(true);setTimeout(()=>setShareCopied(false),2000)}}
                style={{ padding:'8px 14px', background: shareCopied?'rgba(0,255,136,.15)':'rgba(0,229,255,.1)', border:`1px solid ${shareCopied?'rgba(0,255,136,.3)':'rgba(0,229,255,.25)'}`, borderRadius:10, color: shareCopied?'#00ff88':'#00e5ff', fontSize:12, fontWeight:700, cursor:'pointer' }}>
                {shareCopied?'✓ Copied!':'📋 Copy'}
              </button>
            </div>
            {/* Link */}
            <div style={{ background:'rgba(255,255,255,.04)', borderRadius:10, padding:'10px 12px', marginBottom:10, fontSize:11, color:'#4a5568', wordBreak:'break-all', lineHeight:1.7 }}>
              {referralUrl}
            </div>
            <button onClick={shareReferral} style={{ width:'100%', padding:14, background:'linear-gradient(135deg,#ff6b35,#ffd700)', border:'none', borderRadius:12, color:'#070a12', fontSize:14, fontWeight:800, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
              ⬆️ Share করো
            </button>
          </div>

          {/* Share Card */}
          <div style={{ background:'#111826', borderRadius:16, padding:'16px', marginBottom:14, border:'1px solid rgba(255,255,255,.06)' }}>
            <div style={{ fontSize:13, fontWeight:800, color:'#eef2f7', marginBottom:12 }}>🖼️ Share Card</div>
            {/* Visual share card */}
            <div id="shareCard" style={{ background:'linear-gradient(135deg,#0d1220,#1a1030)', borderRadius:16, padding:'20px', border:'1px solid rgba(0,229,255,.2)', textAlign:'center', marginBottom:10, position:'relative', overflow:'hidden' }}>
              <div style={{ position:'absolute', inset:0, backgroundImage:'radial-gradient(circle at 20% 30%,rgba(0,229,255,.08) 0%,transparent 50%),radial-gradient(circle at 80% 70%,rgba(255,107,53,.06) 0%,transparent 50%)' }}/>
              <div style={{ position:'relative' }}>
                <div style={{ fontSize:28, marginBottom:6 }}>🌍 Echo World</div>
                <div style={{ width:56, height:56, borderRadius:'50%', background:`linear-gradient(135deg,${level.color},#fff)`, margin:'0 auto 8px', overflow:'hidden', border:`2px solid ${level.color}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, fontWeight:900, color:'#070a12' }}>
                  {profile?.avatar_url?<img src={profile.avatar_url} style={{width:'100%',height:'100%',objectFit:'cover'}}/>:pName[0]?.toUpperCase()}
                </div>
                <div style={{ fontSize:15, fontWeight:900, color:'#eef2f7', marginBottom:2 }}>{pName}</div>
                <div style={{ fontSize:11, color:level.color, marginBottom:10 }}>{level.emoji} {level.name}</div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:6, marginBottom:12 }}>
                  {[
                    ['💰',fmtUSD(totalInvested),'Invested'],
                    ['📈',fmtUSD(totalEarned),'Earned'],
                    ['🔗',referrals.length,'Referrals'],
                  ].map(([ic,v,l],i)=>(
                    <div key={i} style={{ background:'rgba(255,255,255,.05)', borderRadius:8, padding:'6px 4px' }}>
                      <div style={{ fontSize:12 }}>{ic}</div>
                      <div style={{ fontSize:12, fontWeight:800, color:'#eef2f7' }}>{v}</div>
                      <div style={{ fontSize:9, color:'#4a5568' }}>{l}</div>
                    </div>
                  ))}
                </div>
                <div style={{ background:'rgba(0,229,255,.08)', border:'1px solid rgba(0,229,255,.2)', borderRadius:10, padding:'8px 12px' }}>
                  <div style={{ fontSize:10, color:'#4a5568', marginBottom:2 }}>Join with my code:</div>
                  <div style={{ fontSize:16, fontWeight:900, color:'#00e5ff', letterSpacing:2, fontFamily:'monospace' }}>
                    {profile?.referral_code || profile?.username?.toUpperCase() || user?.id?.slice(0,8).toUpperCase()}
                  </div>
                </div>
              </div>
            </div>
            <button onClick={shareReferral} style={{ width:'100%', padding:12, background:'rgba(255,255,255,.07)', border:'1px solid rgba(255,255,255,.1)', borderRadius:12, color:'#eef2f7', fontSize:13, fontWeight:700, cursor:'pointer' }}>
              📤 Card Share করো
            </button>
          </div>

          {/* Commission breakdown */}
          <div style={{ background:'#111826', borderRadius:16, padding:'14px 16px', marginBottom:14, border:'1px solid rgba(255,255,255,.06)' }}>
            <div style={{ fontSize:13, fontWeight:800, color:'#eef2f7', marginBottom:12 }}>💸 Commission Structure</div>
            {[
              { level:'Level 1', pct:'50%', desc:'Direct referral এর daily income এর', color:'#00ff88' },
              { level:'Level 2', pct:'25%', desc:'Indirect referral এর daily income এর', color:'#00e5ff' },
            ].map((row,i)=>(
              <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 0', borderBottom: i<1?'1px solid rgba(255,255,255,.04)':'none' }}>
                <div>
                  <div style={{ fontSize:13, fontWeight:700, color:row.color }}>{row.level}</div>
                  <div style={{ fontSize:11, color:'#4a5568', marginTop:2 }}>{row.desc}</div>
                </div>
                <div style={{ fontSize:22, fontWeight:900, color:row.color }}>{row.pct}</div>
              </div>
            ))}
          </div>

          {/* Referrals list */}
          {referrals.length>0 && (
            <div>
              <div style={{ fontSize:13, fontWeight:800, color:'#eef2f7', marginBottom:10 }}>👥 আমার Referrals</div>
              {referrals.map((ref,i)=>(
                <div key={ref.id||i} style={{ display:'flex', alignItems:'center', gap:10, background:'#111826', borderRadius:12, padding:'10px 12px', marginBottom:8, border:'1px solid rgba(255,255,255,.04)' }}>
                  <div style={{ width:38, height:38, borderRadius:'50%', background:'linear-gradient(135deg,#ff6b35,#ffd700)', overflow:'hidden', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:800, color:'#070a12' }}>
                    {ref.profiles?.avatar_url?<img src={ref.profiles.avatar_url} style={{width:'100%',height:'100%',objectFit:'cover'}}/>:(ref.profiles?.full_name||ref.profiles?.username||'U')[0].toUpperCase()}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:13, fontWeight:700, color:'#eef2f7' }}>{ref.profiles?.full_name||ref.profiles?.username}</div>
                    <div style={{ fontSize:10, color:'#4a5568' }}>Joined {timeAgo(ref.profiles?.created_at)}</div>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontSize:13, fontWeight:800, color:'#00ff88' }}>{fmtUSD(ref.total_earned||0)}</div>
                    <div style={{ fontSize:10, background: ref.status==='valid'?'rgba(0,255,136,.1)':'rgba(255,202,40,.1)', borderRadius:6, padding:'1px 8px', color: ref.status==='valid'?'#00ff88':'#ffca28', fontWeight:700 }}>{ref.status||'pending'}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════ */}
      {/* SETTINGS VIEW */}
      {/* ══════════════════════════════════════════ */}
      {mainView === 'settings' && (
        <div style={{ padding:'16px 14px', animation:'fadeUp .3s ease' }}>

          {/* Account card */}
          <div style={{ background:'#111826', borderRadius:16, padding:'16px', marginBottom:14, border:'1px solid rgba(255,255,255,.06)' }}>
            <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:14 }}>
              <div style={{ width:52, height:52, borderRadius:'50%', background:`linear-gradient(135deg,${level.color},#111)`, overflow:'hidden', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, fontWeight:800, color:'#eef2f7', border:`2px solid ${level.color}44` }}>
                {profile?.avatar_url?<img src={profile.avatar_url} style={{width:'100%',height:'100%',objectFit:'cover'}}/>:pName[0]?.toUpperCase()}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:15, fontWeight:800, color:'#eef2f7' }}>{pName}</div>
                <div style={{ fontSize:11, color:'#4a5568' }}>@{profile?.username}</div>
                <div style={{ fontSize:11, color:'#4a5568', marginTop:1 }}>{user?.email}</div>
              </div>
              <button onClick={()=>{setMainView('profile');setEditMode(true)}} style={{ padding:'7px 14px', background:'rgba(0,229,255,.1)', border:'1px solid rgba(0,229,255,.2)', borderRadius:10, color:'#00e5ff', fontSize:11, fontWeight:700, cursor:'pointer' }}>✏️ Edit</button>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
              {[
                ['📧', 'Email', user?.email?.slice(0,20)+'...'],
                ['🪙', 'Coins', `${fmtNum(coinBalance)} coins`],
                ['💰', 'Invest', fmtUSD(totalInvested)],
                ['🌟', 'Level', level.name],
              ].map(([ic,k,v],i)=>(
                <div key={i} style={{ background:'rgba(255,255,255,.03)', borderRadius:10, padding:'8px 10px', display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ fontSize:16 }}>{ic}</span>
                  <div>
                    <div style={{ fontSize:9, color:'#4a5568' }}>{k}</div>
                    <div style={{ fontSize:12, fontWeight:700, color:'#eef2f7' }}>{v}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Toggle settings */}
          <div style={{ background:'#111826', borderRadius:16, padding:'14px 16px', marginBottom:14, border:'1px solid rgba(255,255,255,.06)' }}>
            <div style={{ fontSize:13, fontWeight:800, color:'#eef2f7', marginBottom:12 }}>🔔 Notifications</div>
            {[
              ['notifications', '🔔', 'Push Notifications'],
              ['emailAlerts',   '📧', 'Email Alerts'],
              ['pushAlerts',    '📱', 'In-App Alerts'],
              ['autoPlay',      '▶️', 'Auto-play Videos'],
            ].map(([key,ic,label])=>(
              <div key={key} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 0', borderBottom:'1px solid rgba(255,255,255,.04)' }}>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <span style={{ fontSize:18 }}>{ic}</span>
                  <span style={{ fontSize:13, color:'#eef2f7' }}>{label}</span>
                </div>
                <div onClick={async()=>{
                    const newVal = !settings[key]
                    setSettings(p=>({...p,[key]:newVal}))
                    await supabase.from('profiles').update({ ['setting_'+key]: newVal }).eq('id', user.id).then(({error})=>{ if(error) console.error('Setting save error:',error) })
                  }}
                  style={{ width:44, height:24, borderRadius:12, background: settings[key]?'#00e5ff':'rgba(255,255,255,.1)', position:'relative', cursor:'pointer', transition:'background .2s', flexShrink:0 }}>
                  <div style={{ position:'absolute', top:3, left: settings[key]?20:3, width:18, height:18, borderRadius:'50%', background:'#fff', transition:'left .2s', boxShadow:'0 1px 4px rgba(0,0,0,.3)' }}/>
                </div>
              </div>
            ))}
          </div>

          {/* Privacy */}
          <div style={{ background:'#111826', borderRadius:16, padding:'14px 16px', marginBottom:14, border:'1px solid rgba(255,255,255,.06)' }}>
            <div style={{ fontSize:13, fontWeight:800, color:'#eef2f7', marginBottom:12 }}>🔒 Privacy & Security</div>
            {[
              ['2FA Authentication', settings.twoFA?'✅ Enabled':'❌ Disabled', ()=>setSettings(p=>({...p,twoFA:!p.twoFA})), settings.twoFA?'#00ff88':'#ff4560'],
              ['Account Privacy',   settings.privacy==='public'?'🌍 Public':'🔒 Private',  ()=>setSettings(p=>({...p,privacy:p.privacy==='public'?'private':'public'})), '#00e5ff'],
              ['Change Password',   '🔑 Update',  ()=>window.location.href='/settings/password', '#ffd700'],
              ['Blocked Users',     '🚫 Manage',  ()=>window.location.href='/settings/blocked',  '#ff6b35'],
            ].map(([label,val,action,color],i)=>(
              <div key={i} onClick={action} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 0', borderBottom: i<3?'1px solid rgba(255,255,255,.04)':'none', cursor:'pointer' }}>
                <span style={{ fontSize:13, color:'#eef2f7' }}>{label}</span>
                <span style={{ fontSize:11, fontWeight:700, color, background:`${color}15`, borderRadius:8, padding:'3px 10px' }}>{val}</span>
              </div>
            ))}
          </div>

          {/* App settings */}
          <div style={{ background:'#111826', borderRadius:16, padding:'14px 16px', marginBottom:14, border:'1px solid rgba(255,255,255,.06)' }}>
            <div style={{ fontSize:13, fontWeight:800, color:'#eef2f7', marginBottom:12 }}>⚙️ App</div>
            {[
              ['🌐', 'Language',      settings.language, ()=>{}, '#4a5568'],
              ['📊', 'Data Usage',    'Normal',          ()=>{}, '#4a5568'],
              ['🗑️', 'Clear Cache',   'Tap to clear',    ()=>{ if(typeof caches!=='undefined') caches.keys().then(ks=>ks.forEach(k=>caches.delete(k))); alert('Cache cleared!') }, '#ff6b35'],
              ['ℹ️', 'App Version',   'v0.1.3',          ()=>{}, '#4a5568'],
            ].map(([ic,label,val,action,color],i)=>(
              <div key={i} onClick={action} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 0', borderBottom: i<3?'1px solid rgba(255,255,255,.04)':'none', cursor:'pointer' }}>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <span style={{ fontSize:18 }}>{ic}</span>
                  <span style={{ fontSize:13, color:'#eef2f7' }}>{label}</span>
                </div>
                <span style={{ fontSize:11, color, fontWeight:700 }}>{val}</span>
              </div>
            ))}
          </div>

          {/* Support */}
          <div style={{ background:'#111826', borderRadius:16, padding:'14px 16px', marginBottom:14, border:'1px solid rgba(255,255,255,.06)' }}>
            <div style={{ fontSize:13, fontWeight:800, color:'#eef2f7', marginBottom:12 }}>🆘 Help & Support</div>
            {[
              ['💬','Support Chat',   '/support'],
              ['📋','Terms of Service','/terms'],
              ['🔏','Privacy Policy', '/privacy'],
              ['⭐','Rate Echo World','#'],
            ].map(([ic,label,path],i)=>(
              <div key={i} onClick={()=>window.location.href=path} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 0', borderBottom: i<3?'1px solid rgba(255,255,255,.04)':'none', cursor:'pointer' }}>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <span style={{ fontSize:18 }}>{ic}</span>
                  <span style={{ fontSize:13, color:'#eef2f7' }}>{label}</span>
                </div>
                <span style={{ fontSize:14, color:'#4a5568' }}>›</span>
              </div>
            ))}
          </div>

          {/* Go to Invest Page */}
          <div style={{ background:'linear-gradient(135deg,rgba(0,255,136,.08),rgba(0,229,255,.06))', borderRadius:16, padding:'16px', marginBottom:14, border:'1px solid rgba(0,255,136,.2)' }}>
            <div style={{ fontSize:13, fontWeight:800, color:'#eef2f7', marginBottom:10 }}>💰 Investment</div>
            <button onClick={()=>window.location.href='/invest'}
              style={{ width:'100%', padding:14, background:'linear-gradient(135deg,#00e5ff,#00ff88)', border:'none', borderRadius:12, color:'#070a12', fontSize:14, fontWeight:800, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
              💰 Invest Page এ যাও →
            </button>
          </div>

          {/* Danger zone */}
          <div style={{ background:'rgba(255,69,96,.06)', borderRadius:16, padding:'14px 16px', marginBottom:20, border:'1px solid rgba(255,69,96,.15)' }}>
            <div style={{ fontSize:13, fontWeight:800, color:'#ff4560', marginBottom:12 }}>⚠️ Danger Zone</div>
            <button onClick={async()=>{ await supabase.auth.signOut(); window.location.href='/' }} style={{ width:'100%', padding:12, background:'rgba(255,69,96,.1)', border:'1px solid rgba(255,69,96,.25)', borderRadius:12, color:'#ff4560', fontSize:14, fontWeight:700, cursor:'pointer', marginBottom:8 }}>
              🚪 Sign Out
            </button>
            <button onClick={()=>setShowDeleteConfirm(true)} style={{ width:'100%', padding:12, background:'rgba(255,69,96,.05)', border:'1px solid rgba(255,69,96,.15)', borderRadius:12, color:'#ff4560', fontSize:13, fontWeight:600, cursor:'pointer', opacity:.7 }}>
              🗑️ Delete Account
            </button>
          </div>
        </div>
      )}

      {/* ── DELETE POST MODAL ── */}
      {deleteTarget&&(
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.85)', zIndex:500, display:'flex', alignItems:'flex-end', justifyContent:'center', padding:20 }} onClick={()=>setDeleteTarget(null)}>
          <div style={{ background:'#1a2030', borderRadius:20, padding:24, width:'100%', maxWidth:400 }} onClick={e=>e.stopPropagation()}>
            <div style={{ textAlign:'center', marginBottom:16 }}>
              <div style={{ fontSize:36, marginBottom:8 }}>🗑️</div>
              <div style={{ fontSize:18, fontWeight:800, marginBottom:4 }}>Delete Post?</div>
              <div style={{ fontSize:13, color:'#4a5568' }}>This cannot be undone.</div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              <button onClick={()=>setDeleteTarget(null)} style={{ padding:14, background:'rgba(255,255,255,.05)', border:'1px solid rgba(255,255,255,.1)', borderRadius:14, color:'#8892a4', fontSize:15, fontWeight:700, cursor:'pointer' }}>Cancel</button>
              <button onClick={confirmDelete} style={{ padding:14, background:'linear-gradient(135deg,#ff4560,#c0392b)', border:'none', borderRadius:14, color:'#fff', fontSize:15, fontWeight:700, cursor:'pointer' }}>🗑️ Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* ── DELETE ACCOUNT CONFIRM ── */}
      {showDeleteConfirm&&(
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.9)', zIndex:600, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }} onClick={()=>setShowDeleteConfirm(false)}>
          <div style={{ background:'#1a2030', borderRadius:20, padding:24, width:'100%', maxWidth:360, border:'1px solid rgba(255,69,96,.3)' }} onClick={e=>e.stopPropagation()}>
            <div style={{ textAlign:'center', marginBottom:20 }}>
              <div style={{ fontSize:48, marginBottom:10 }}>⚠️</div>
              <div style={{ fontSize:18, fontWeight:900, color:'#ff4560', marginBottom:8 }}>Account Delete করবে?</div>
              <div style={{ fontSize:13, color:'#8892a4', lineHeight:1.6 }}>তোমার সব data, posts, investments সব মুছে যাবে। এটা undo করা যাবে না।</div>
            </div>
            <button onClick={()=>setShowDeleteConfirm(false)} style={{ width:'100%', padding:14, background:'rgba(255,255,255,.07)', border:'none', borderRadius:12, color:'#eef2f7', fontSize:14, fontWeight:700, cursor:'pointer', marginBottom:8 }}>বাতিল করো</button>
            <button onClick={()=>{ alert('Support এ যোগাযোগ করো account delete করতে'); setShowDeleteConfirm(false) }} style={{ width:'100%', padding:14, background:'rgba(255,69,96,.15)', border:'1px solid rgba(255,69,96,.3)', borderRadius:12, color:'#ff4560', fontSize:13, fontWeight:600, cursor:'pointer' }}>Support এ Contact করো</button>
          </div>
        </div>
      )}

      {/* ── BOTTOM NAV ── */}
      <div style={{ position:'fixed', bottom:0, left:0, right:0, background:'rgba(7,10,16,.98)', borderTop:'1px solid rgba(255,255,255,.07)', display:'flex', justifyContent:'space-around', padding:'10px 0 20px', zIndex:100 }}>
        {[['🏠','Home','/feed'],['🗺','Map','/map'],['📸','Post','/post'],['🏆','Rank','/leaderboard'],['👤','Me','/profile']].map(([icon,label,path])=>(
          <div key={label} onClick={()=>window.location.href=path} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:3, cursor:'pointer', color: path==='/profile'?'#00e5ff':'#4a5568' }}>
            <span style={{ fontSize:22 }}>{icon}</span>
            <span style={{ fontSize:10, fontWeight:600 }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
