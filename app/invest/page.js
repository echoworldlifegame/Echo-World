'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const OFFER_END     = new Date('2027-06-30')
const USDT_ADDRESS  = 'YOUR_USDT_TRC20_ADDRESS'
const MIN_DEPOSIT   = 100
const CLOUDINARY_CLOUD  = 'dbguxwpa8'
const CLOUDINARY_PRESET = 'echoworld_preset'

const PLANS = [
  { min:100,  max:499.99,  rate:2.0, label:'Starter', color:'#00e5ff', emoji:'🌱', monthly:60,  yearly:730  },
  { min:500,  max:999.99,  rate:2.5, label:'Growth',  color:'#00ff88', emoji:'🚀', monthly:75,  yearly:912  },
  { min:1000, max:999999,  rate:3.0, label:'Elite',   color:'#ffa500', emoji:'💎', monthly:90,  yearly:1095 },
]

const LANGS = {
  en:{ name:'English', flag:'🇬🇧' },
  bn:{ name:'বাংলা',   flag:'🇧🇩' },
  hi:{ name:'हिंदी',   flag:'🇮🇳' },
  ar:{ name:'العربية', flag:'🇸🇦' },
  zh:{ name:'中文',    flag:'🇨🇳' },
}

const BANNERS = [
  { icon:'🔒', text:'100% Secure Investment Platform' },
  { icon:'✅', text:'Verified by active investors worldwide' },
  { icon:'💎', text:'Principal 100% returned after maturity' },
  { icon:'⚡', text:'Daily returns — post every day to unlock' },
  { icon:'📅', text:'Withdraw on 14th & 28th every month' },
  { icon:'👥', text:'2-Level referral — earn from your network' },
  { icon:'📈', text:'Up to 3% daily — highest in the market' },
  { icon:'💼', text:'Refer 12 investors → $100/month salary!' },
  { icon:'🏆', text:'Refer 25 investors → $250/month salary!' },
  { icon:'🔥', text:'7-day streak → bonus reward unlocked!' },
]

const BADGE_CONFIG = {
  starter_investor: { label:'Starter Investor',  emoji:'🌱', color:'#00e5ff', desc:'First investment made' },
  growth_investor:  { label:'Growth Investor',   emoji:'🚀', color:'#00ff88', desc:'$500+ invested'       },
  elite_investor:   { label:'Elite Investor',    emoji:'💎', color:'#ffa500', desc:'$1000+ invested'      },
  top_referrer:     { label:'Top Referrer',      emoji:'🔗', color:'#a855f7', desc:'5+ valid referrals'   },
  streak_7:         { label:'7-Day Streak',      emoji:'🔥', color:'#ff6b35', desc:'7 days straight posts'},
  streak_30:        { label:'30-Day Streak',     emoji:'⚡', color:'#ffca28', desc:'30 days straight'     },
  streak_90:        { label:'90-Day Legend',     emoji:'🏆', color:'#ffa500', desc:'90 days straight'     },
  salary_silver:    { label:'Silver Earner',     emoji:'🥈', color:'#00e5ff', desc:'Monthly salary silver'},
  salary_gold:      { label:'Gold Earner',       emoji:'🥇', color:'#ffa500', desc:'Monthly salary gold'  },
}

const MILESTONE_AMOUNTS = [100, 500, 1000, 5000]

const getPlan = (amt) => PLANS.find(p => amt >= p.min && amt <= p.max)

const uploadImage = async (file) => {
  const form = new FormData()
  form.append('file', file)
  form.append('upload_preset', CLOUDINARY_PRESET)
  form.append('folder', 'invest_screenshots')
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`, { method:'POST', body:form })
  const data = await res.json()
  return data.secure_url
}

async function sendSystemNotif(userId, message) {
  await supabase.from('notifications').insert({
    user_id: userId, from_user_id: null,
    type: 'system', message: `🌐 Echo World: ${message}`, read: false,
  })
}

const timeAgo = (d) => {
  const s = Math.floor((Date.now() - new Date(d)) / 1000)
  if (s < 3600)  return Math.floor(s/60)  + 'm ago'
  if (s < 86400) return Math.floor(s/3600)+ 'h ago'
  return Math.floor(s/86400) + 'd ago'
}

/* ── Withdrawal countdown ── */
function useWithdrawalTimer() {
  const [timer, setTimer] = useState('')
  const [isWindow, setIsWindow] = useState(false)
  useEffect(() => {
    const tick = () => {
      const now = new Date()
      const day = now.getDate()
      const isWin = (day >= 13 && day <= 15) || (day >= 27 && day <= 29)
      setIsWindow(isWin)
      if (isWin) { setTimer(''); return }
      // next window
      const year = now.getFullYear(), month = now.getMonth()
      let next
      if (day < 13) next = new Date(year, month, 13, 0, 0, 0)
      else if (day < 27) next = new Date(year, month, 27, 0, 0, 0)
      else next = new Date(year, month+1, 13, 0, 0, 0)
      const diff = next - now
      const d = Math.floor(diff/86400000)
      const h = Math.floor((diff%86400000)/3600000)
      const m = Math.floor((diff%3600000)/60000)
      const s = Math.floor((diff%60000)/1000)
      setTimer(`${d}d ${h}h ${m}m ${s}s`)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])
  return { timer, isWindow }
}

/* ─────────────────────────────────────────────────────────
   CERTIFICATE COMPONENT
───────────────────────────────────────────────────────── */
function Certificate({ inv, username, onClose }) {
  const plan = getPlan(inv.amount_usd)
  const certRef = useRef(null)
  const daysIn = Math.floor((Date.now() - new Date(inv.start_date)) / 86400000)
  const earnedSoFar = (daysIn * inv.amount_usd * inv.daily_rate / 100).toFixed(2)

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({
        title: 'Echo Invest Certificate',
        text: `I'm earning ${inv.daily_rate}% daily on my $${inv.amount_usd} ${plan?.label} investment at Echo Invest! Join me: ${window.location.origin}/invest`,
        url: `${window.location.origin}/invest`,
      })
    } else {
      navigator.clipboard?.writeText(`${window.location.origin}/invest`)
      alert('Link copied!')
    }
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:'16px' }}>
      <div style={{ width:'100%', maxWidth:'360px' }}>
        {/* Certificate card */}
        <div ref={certRef} style={{ background:'linear-gradient(135deg,#050d1a,#0a1628,#051020)', border:`2px solid ${plan?.color}44`, borderRadius:'20px', padding:'28px 24px', position:'relative', overflow:'hidden', textAlign:'center' }}>
          {/* decorative corners */}
          {['top:0,left:0', 'top:0,right:0', 'bottom:0,left:0', 'bottom:0,right:0'].map((pos, i) => {
            const [v, h] = pos.split(',')
            return <div key={i} style={{ position:'absolute', [v.split(':')[0]]:0, [h.split(':')[0]]:0, width:'40px', height:'40px', borderTop: i<2 ? `2px solid ${plan?.color}66` : 'none', borderBottom: i>=2 ? `2px solid ${plan?.color}66` : 'none', borderLeft: i%2===0 ? `2px solid ${plan?.color}66` : 'none', borderRight: i%2===1 ? `2px solid ${plan?.color}66` : 'none' }} />
          })}
          {/* radial glow */}
          <div style={{ position:'absolute', inset:0, background:`radial-gradient(circle at 50% 0%, ${plan?.color}12, transparent 60%)`, pointerEvents:'none' }} />

          <div style={{ fontSize:'10px', letterSpacing:'3px', color: plan?.color, fontWeight:'700', marginBottom:'10px', opacity:0.8 }}>ECHO INVEST — CERTIFICATE OF INVESTMENT</div>
          <div style={{ fontSize:'40px', marginBottom:'6px' }}>{plan?.emoji}</div>
          <div style={{ fontSize:'22px', fontWeight:'900', color:'#eef2f7', marginBottom:'2px' }}>{plan?.label} Plan</div>
          <div style={{ fontSize:'13px', color:'#4a5568', marginBottom:'20px' }}>This certifies that</div>

          <div style={{ fontSize:'18px', fontWeight:'800', color: plan?.color, marginBottom:'16px', background:`${plan?.color}12`, borderRadius:'10px', padding:'8px 16px', display:'inline-block' }}>
            @{username}
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'8px', marginBottom:'20px' }}>
            {[
              { label:'Amount', value:`$${inv.amount_usd}` },
              { label:'Daily Rate', value:`${inv.daily_rate}%` },
              { label:'Earned', value:`$${earnedSoFar}` },
            ].map(s => (
              <div key={s.label} style={{ background:'rgba(255,255,255,0.04)', borderRadius:'10px', padding:'10px 6px' }}>
                <div style={{ fontSize:'14px', fontWeight:'900', color: plan?.color }}>{s.value}</div>
                <div style={{ fontSize:'9px', color:'#4a5568', marginTop:'2px' }}>{s.label}</div>
              </div>
            ))}
          </div>

          <div style={{ borderTop:`1px solid ${plan?.color}22`, paddingTop:'14px', marginBottom:'14px' }}>
            <div style={{ fontSize:'11px', color:'#4a5568', marginBottom:'4px' }}>Investment Period</div>
            <div style={{ fontSize:'12px', fontWeight:'700', color:'#eef2f7' }}>
              {new Date(inv.start_date).toLocaleDateString('en', { month:'short', day:'numeric', year:'numeric' })} → {new Date(inv.end_date).toLocaleDateString('en', { month:'short', day:'numeric', year:'numeric' })}
            </div>
            <div style={{ fontSize:'11px', color: plan?.color, marginTop:'4px', fontWeight:'700' }}>Day {daysIn} of 365 · {((daysIn/365)*100).toFixed(1)}% complete</div>
          </div>

          <div style={{ fontSize:'9px', color:'#2a3040', letterSpacing:'1px' }}>echo-world-psi.vercel.app/invest</div>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginTop:'12px' }}>
          <button onClick={handleShare}
            style={{ padding:'14px', background:`linear-gradient(135deg,${plan?.color},#00ff88)`, border:'none', borderRadius:'13px', color:'#050810', fontSize:'14px', fontWeight:'900', cursor:'pointer' }}>
            📤 Share
          </button>
          <button onClick={onClose}
            style={{ padding:'14px', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'13px', color:'#8892a4', fontSize:'14px', fontWeight:'700', cursor:'pointer' }}>
            ✕ Close
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────
   SHARE & EARN CARD
───────────────────────────────────────────────────────── */
function ShareCard({ account, investments, username, onClose }) {
  const totalDaily = investments.filter(i=>i.status==='active').reduce((s,i)=>s+(i.amount_usd*i.daily_rate/100),0)
  const plan = getPlan(account?.total_invested || 0)

  const handleShare = async () => {
    const text = `💎 I'm earning $${totalDaily.toFixed(2)}/day on Echo Invest!\n\n💰 Total Invested: $${(account?.total_invested||0).toFixed(0)}\n⚡ Total Earned: $${(account?.total_earned||0).toFixed(2)}\n\nJoin me → ${window.location.origin}/invest?ref=${account?.user_id}`
    if (navigator.share) await navigator.share({ title:'Echo Invest Earnings', text, url:`${window.location.origin}/invest` })
    else { navigator.clipboard?.writeText(text); alert('Copied to clipboard!') }
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:'16px' }}>
      <div style={{ width:'100%', maxWidth:'340px' }}>
        <div style={{ background:'linear-gradient(135deg,#050d1a,#0a1628)', border:'2px solid rgba(0,255,136,0.3)', borderRadius:'24px', padding:'28px 22px', textAlign:'center', position:'relative', overflow:'hidden' }}>
          <div style={{ position:'absolute', inset:0, background:'radial-gradient(circle at 50% 0%,rgba(0,255,136,0.1),transparent 60%)', pointerEvents:'none' }} />

          <div style={{ fontSize:'36px', marginBottom:'8px' }}>💰</div>
          <div style={{ fontSize:'11px', letterSpacing:'2px', color:'#4a5568', fontWeight:'700', marginBottom:'4px' }}>MY ECHO INVEST EARNINGS</div>
          <div style={{ fontSize:'15px', fontWeight:'800', color:'#00ff88', marginBottom:'20px' }}>@{username}</div>

          <div style={{ background:'rgba(0,255,136,0.06)', border:'1px solid rgba(0,255,136,0.2)', borderRadius:'16px', padding:'16px', marginBottom:'16px' }}>
            <div style={{ fontSize:'36px', fontWeight:'900', color:'#00ff88' }}>${totalDaily.toFixed(2)}</div>
            <div style={{ fontSize:'12px', color:'#4a5568' }}>earned per day</div>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginBottom:'20px' }}>
            {[
              { label:'Total Invested', value:`$${(account?.total_invested||0).toFixed(0)}`, color:'#00e5ff' },
              { label:'Total Earned',   value:`$${(account?.total_earned||0).toFixed(2)}`,   color:'#ffa500' },
            ].map(s => (
              <div key={s.label} style={{ background:'rgba(255,255,255,0.04)', borderRadius:'12px', padding:'12px' }}>
                <div style={{ fontSize:'16px', fontWeight:'900', color:s.color }}>{s.value}</div>
                <div style={{ fontSize:'10px', color:'#4a5568', marginTop:'2px' }}>{s.label}</div>
              </div>
            ))}
          </div>

          <div style={{ fontSize:'11px', color:'#4a5568', marginBottom:'4px' }}>Join Echo Invest & start earning daily</div>
          <div style={{ fontSize:'11px', color:'#00e5ff', fontWeight:'700', marginBottom:'4px' }}>echo-world-psi.vercel.app/invest</div>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginTop:'12px' }}>
          <button onClick={handleShare}
            style={{ padding:'14px', background:'linear-gradient(135deg,#00e5ff,#00ff88)', border:'none', borderRadius:'13px', color:'#050810', fontSize:'14px', fontWeight:'900', cursor:'pointer' }}>
            📤 Share Card
          </button>
          <button onClick={onClose}
            style={{ padding:'14px', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'13px', color:'#8892a4', fontSize:'14px', fontWeight:'700', cursor:'pointer' }}>
            ✕ Close
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────
   REFERRAL TREE
───────────────────────────────────────────────────────── */
function ReferralTree({ userId, onClose }) {
  const [tree, setTree] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      // Level 1 referrals
      const { data: lvl1Users } = await supabase
        .from('investment_accounts')
        .select('user_id, total_invested, profiles!investment_accounts_user_id_fkey(username, full_name, avatar_url)')
        .eq('referred_by', userId)

      const nodes = []
      for (const u of (lvl1Users || [])) {
        // Level 2 referrals
        const { data: lvl2 } = await supabase
          .from('investment_accounts')
          .select('user_id, total_invested, profiles!investment_accounts_user_id_fkey(username, full_name)')
          .eq('referred_by', u.user_id)

        // Check if valid (has approved deposit >= $100)
        const { data: dep } = await supabase
          .from('deposit_requests')
          .select('id')
          .eq('user_id', u.user_id)
          .eq('status', 'approved')
          .gte('amount_usd', 100)
          .limit(1)

        nodes.push({ ...u, isValid: (dep||[]).length > 0, children: lvl2 || [] })
      }
      setTree(nodes)
      setLoading(false)
    }
    load()
  }, [userId])

  const validCount = tree.filter(n => n.isValid).length
  const totalLvl2  = tree.reduce((s, n) => s + n.children.length, 0)

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.9)', zIndex:1000, overflowY:'auto', padding:'16px' }}>
      <div style={{ maxWidth:'420px', margin:'0 auto' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px' }}>
          <div style={{ fontSize:'16px', fontWeight:'900', background:'linear-gradient(90deg,#00e5ff,#00ff88)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>🌳 Referral Tree</div>
          <button onClick={onClose} style={{ background:'rgba(255,255,255,0.08)', border:'none', borderRadius:'10px', padding:'6px 14px', color:'#8892a4', cursor:'pointer', fontSize:'13px' }}>✕ Close</button>
        </div>

        {/* Summary */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'8px', marginBottom:'16px' }}>
          {[
            { label:'Level 1', value: tree.length,  color:'#00e5ff' },
            { label:'Valid',   value: validCount,    color:'#00ff88' },
            { label:'Level 2', value: totalLvl2,     color:'#ffa500' },
          ].map(s => (
            <div key={s.label} style={{ background:'#111826', border:`1px solid ${s.color}22`, borderRadius:'12px', padding:'12px', textAlign:'center' }}>
              <div style={{ fontSize:'22px', fontWeight:'900', color:s.color }}>{s.value}</div>
              <div style={{ fontSize:'10px', color:'#4a5568' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign:'center', padding:'40px', color:'#4a5568' }}>Loading tree...</div>
        ) : tree.length === 0 ? (
          <div style={{ textAlign:'center', padding:'40px', color:'#4a5568' }}>
            <div style={{ fontSize:'36px', marginBottom:'8px' }}>🌱</div>
            <div>No referrals yet. Share your link!</div>
          </div>
        ) : (
          /* ROOT node */
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center' }}>
            <div style={{ background:'linear-gradient(135deg,#00e5ff,#00ff88)', borderRadius:'50%', width:'52px', height:'52px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'22px', fontWeight:'900', color:'#050810', marginBottom:'6px' }}>
              You
            </div>
            <div style={{ width:'2px', height:'16px', background:'rgba(0,229,255,0.3)', marginBottom:'0' }} />

            {/* Level 1 nodes */}
            <div style={{ width:'100%' }}>
              {tree.map((node, idx) => (
                <div key={node.user_id} style={{ marginBottom:'12px' }}>
                  {/* connector */}
                  <div style={{ display:'flex', justifyContent:'center', marginBottom:'0' }}>
                    <div style={{ width:'2px', height:'14px', background: node.isValid ? 'rgba(0,255,136,0.4)' : 'rgba(255,255,255,0.1)' }} />
                  </div>
                  {/* level 1 card */}
                  <div style={{ background:'#111826', border:`1px solid ${node.isValid ? 'rgba(0,255,136,0.3)' : 'rgba(255,255,255,0.07)'}`, borderRadius:'14px', padding:'12px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                      <div style={{ width:'34px', height:'34px', borderRadius:'50%', background: node.isValid ? 'linear-gradient(135deg,#00ff8833,#00e5ff33)' : 'rgba(255,255,255,0.05)', border:`1px solid ${node.isValid ? '#00ff8844' : 'rgba(255,255,255,0.1)'}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'13px', fontWeight:'700', color: node.isValid ? '#00ff88' : '#4a5568' }}>
                        {(node.profiles?.username||'U')[0].toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontSize:'12px', fontWeight:'700', color: node.isValid ? '#eef2f7' : '#8892a4' }}>@{node.profiles?.username}</div>
                        <div style={{ fontSize:'10px', color:'#4a5568' }}>
                          {node.isValid ? `✅ Valid · $${(node.total_invested||0).toFixed(0)} invested` : '⏳ No deposit yet'}
                        </div>
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize:'10px', color: node.isValid ? '#00ff88' : '#4a5568', fontWeight:'700', background: node.isValid ? 'rgba(0,255,136,0.08)' : 'rgba(255,255,255,0.04)', borderRadius:'8px', padding:'3px 8px' }}>L1</div>
                      {node.children.length > 0 && <div style={{ fontSize:'9px', color:'#ffa500', textAlign:'center', marginTop:'2px' }}>+{node.children.length} L2</div>}
                    </div>
                  </div>

                  {/* level 2 children */}
                  {node.children.length > 0 && (
                    <div style={{ marginLeft:'24px', marginTop:'6px', borderLeft:'2px solid rgba(255,165,0,0.15)', paddingLeft:'12px' }}>
                      {node.children.map(child => (
                        <div key={child.user_id} style={{ background:'rgba(255,165,0,0.04)', border:'1px solid rgba(255,165,0,0.12)', borderRadius:'10px', padding:'8px 12px', marginBottom:'5px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                          <div style={{ fontSize:'11px', color:'#8892a4' }}>@{child.profiles?.username}</div>
                          <div style={{ fontSize:'10px', color:'#ffa500', background:'rgba(255,165,0,0.08)', borderRadius:'6px', padding:'2px 8px', fontWeight:'700' }}>L2</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────
   MAIN APP
───────────────────────────────────────────────────────── */
export default function Invest() {
  const [user, setUser]           = useState(null)
  const [account, setAccount]     = useState(null)
  const [investments, setInvestments] = useState([])
  const [earnings, setEarnings]   = useState([])
  const [withdrawals, setWithdrawals] = useState([])
  const [deposits, setDeposits]   = useState([])
  const [referrals, setReferrals] = useState([])
  const [salaries, setSalaries]   = useState([])
  const [badges, setBadges]       = useState([])
  const [loading, setLoading]     = useState(true)
  const [lang, setLang]           = useState('bn')
  const [showLangPicker, setShowLangPicker] = useState(false)
  const [activeTab, setActiveTab] = useState('dashboard')
  const [bannerIndex, setBannerIndex] = useState(0)
  const [postedToday, setPostedToday] = useState(false)
  const [todayEarning, setTodayEarning] = useState(0)
  const [referralCount, setReferralCount] = useState(0)
  const [milestone, setMilestone] = useState(null) // popup

  // Auth
  const [authStep, setAuthStep]   = useState('loading')
  const [codeInput, setCodeInput] = useState('')
  const [newCode, setNewCode]     = useState('')
  const [confirmCode, setConfirmCode] = useState('')
  const [codeError, setCodeError] = useState('')
  const [showChange, setShowChange] = useState(false)
  const [showForgot, setShowForgot] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotSent, setForgotSent]   = useState(false)

  // Forms
  const [investAmount, setInvestAmount] = useState('')
  const [txid, setTxid]           = useState('')
  const [screenshotFile, setScreenshotFile] = useState(null)
  const [screenshotPreview, setScreenshotPreview] = useState('')
  const [uploadingImg, setUploadingImg] = useState(false)
  const [usdtAddr, setUsdtAddr]   = useState('')
  const [savedUsdtAddr, setSavedUsdtAddr] = useState('')
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [copied, setCopied]       = useState(false)
  const [calcAmount, setCalcAmount] = useState('500')

  // Salary
  const [showSalaryApply, setShowSalaryApply] = useState(false)
  const [salaryNote, setSalaryNote] = useState('')
  const [salaryApplying, setSalaryApplying] = useState(false)

  // Overlays
  const [certInv, setCertInv]     = useState(null)
  const [showShareCard, setShowShareCard] = useState(false)
  const [showTree, setShowTree]   = useState(false)

  const { timer: wdTimer, isWindow: isWdWindow } = useWithdrawalTimer()
  const daysLeft = Math.max(0, Math.ceil((OFFER_END - new Date()) / 86400000))

  useEffect(() => {
    const iv = setInterval(() => setBannerIndex(i => (i+1) % BANNERS.length), 3200)
    return () => clearInterval(iv)
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { window.location.href = '/'; return }
      const u = data.session.user
      setUser(u); setForgotEmail(u.email || '')
      const { data: acc } = await supabase.from('investment_accounts').select('*').eq('user_id', u.id).single()
      setAccount(acc)
      if (!acc || !acc.password) setAuthStep('set')
      else setAuthStep('enter')
      if (acc) await loadAll(u.id)
      setLoading(false)
    })
  }, [])

  const loadAll = async (uid) => {
    const { data: acc } = await supabase.from('investment_accounts').select('*').eq('user_id', uid).single()
    setAccount(acc)
    if (acc?.usdt_address) { setSavedUsdtAddr(acc.usdt_address); setUsdtAddr(acc.usdt_address) }
    if (acc?.language) setLang(acc.language)

    const today = new Date().toISOString().split('T')[0]

    const [
      { data: inv }, { data: earn }, { data: wd }, { data: dep },
      { data: ref }, { data: sal }, { data: bdg },
    ] = await Promise.all([
      supabase.from('investments').select('*').eq('user_id', uid).order('created_at', { ascending: false }),
      supabase.from('daily_earnings').select('*').eq('user_id', uid).order('date', { ascending: false }).limit(60),
      supabase.from('withdrawal_requests').select('*').eq('user_id', uid).order('requested_at', { ascending: false }),
      supabase.from('deposit_requests').select('*').eq('user_id', uid).order('requested_at', { ascending: false }),
      supabase.from('referral_earnings').select('*').eq('user_id', uid).order('created_at', { ascending: false }).limit(30),
      supabase.from('salary_requests').select('*').eq('user_id', uid).order('requested_at', { ascending: false }),
      supabase.from('user_badges').select('*').eq('user_id', uid),
    ])

    setInvestments(inv || [])
    setEarnings(earn || [])
    setWithdrawals(wd || [])
    setDeposits(dep || [])
    setReferrals(ref || [])
    setSalaries(sal || [])
    setBadges(bdg || [])

    const todayEarn = (earn || []).filter(e => e.date === today).reduce((s, e) => s + e.amount, 0)
    setTodayEarning(todayEarn)

    // Valid referral count
    const { data: refUsers } = await supabase.from('investment_accounts').select('user_id').eq('referred_by', uid)
    if (refUsers?.length > 0) {
      const refIds = refUsers.map(r => r.user_id)
      const { data: validDeps } = await supabase.from('deposit_requests').select('user_id').eq('status', 'approved').in('user_id', refIds).gte('amount_usd', 100)
      setReferralCount(new Set((validDeps||[]).map(r => r.user_id)).size)
    }

    // Post today?
    const { data: posts } = await supabase.from('posts').select('id').eq('user_id', uid).gte('created_at', today+'T00:00:00').limit(1)
    setPostedToday((posts||[]).length > 0)

    // Check milestones
    if (acc) await checkMilestones(uid, acc.total_invested || 0)

    // Award badges
    await awardBadges(uid, inv || [], acc, refUsers?.length || 0)
  }

  const checkMilestones = async (uid, totalInvested) => {
    for (const amt of MILESTONE_AMOUNTS) {
      if (totalInvested >= amt) {
        const { error } = await supabase.from('investment_milestones').insert({ user_id: uid, milestone_amount: amt }).select()
        if (!error) {
          // New milestone! show popup
          setMilestone(amt)
          setTimeout(() => setMilestone(null), 5000)
          await sendSystemNotif(uid, `🎉 Congratulations! You've reached the $${amt} investment milestone! Keep growing!`)
          break
        }
      }
    }
  }

  const awardBadges = async (uid, invs, acc, refCount) => {
    const totalInv = acc?.total_invested || 0
    const toBadge = []
    if (totalInv >= 100)  toBadge.push('starter_investor')
    if (totalInv >= 500)  toBadge.push('growth_investor')
    if (totalInv >= 1000) toBadge.push('elite_investor')
    if (refCount >= 5)    toBadge.push('top_referrer')

    for (const key of toBadge) {
      await supabase.from('user_badges').upsert({ user_id: uid, badge_key: key }, { onConflict: 'user_id,badge_key' })
    }
  }

  // ── AUTH ──────────────────────────────────────────────────
  const handleSetCode = async () => {
    setCodeError('')
    if (newCode.length < 4) { setCodeError('Minimum 4 digits!'); return }
    if (!/^\d+$/.test(newCode)) { setCodeError('Numbers only!'); return }
    if (newCode !== confirmCode) { setCodeError("PINs don't match!"); return }
    const fp = btoa(navigator.userAgent + screen.width + screen.height).slice(0, 50)
    await supabase.from('investment_accounts').upsert({ user_id: user.id, password: newCode, device_fingerprint: fp, language: lang })
    const { data: acc } = await supabase.from('investment_accounts').select('*').eq('user_id', user.id).single()
    setAccount(acc); setNewCode(''); setConfirmCode(''); setShowChange(false)
    setAuthStep('app'); await loadAll(user.id)
  }

  const handleEnterCode = () => {
    if (codeInput === account?.password) { setAuthStep('app'); setCodeInput('') }
    else { setCodeError('❌ Wrong PIN!'); setCodeInput('') }
  }

  const handleForgot = async () => {
    await supabase.from('notifications').insert({
      user_id: user.id, from_user_id: user.id, type: 'system',
      message: `PASSWORD_RESET_REQUEST | Email: ${forgotEmail} | User: ${user.id}`, read: false,
    })
    setForgotSent(true)
  }

  // ── DEPOSIT ──────────────────────────────────────────────
  const submitDeposit = async () => {
    if (submitting) return
    const amt = parseFloat(investAmount)
    if (!amt || amt < MIN_DEPOSIT) { alert(`Minimum $${MIN_DEPOSIT}`); return }
    if (!txid.trim()) { alert('Enter Transaction ID'); return }
    setSubmitting(true)
    let screenshotUrl = ''
    if (screenshotFile) {
      setUploadingImg(true)
      try { screenshotUrl = await uploadImage(screenshotFile) }
      catch { alert('Upload failed'); setSubmitting(false); setUploadingImg(false); return }
      setUploadingImg(false)
    }
    await supabase.from('deposit_requests').insert({ user_id: user.id, amount_usd: amt, txid: txid.trim(), screenshot_url: screenshotUrl || null })
    if (!account) await supabase.from('investment_accounts').upsert({ user_id: user.id, password: '1234', device_fingerprint: btoa(navigator.userAgent).slice(0,50) })
    alert('✅ Deposit submitted! Admin will verify within 24 hours.')
    setTxid(''); setInvestAmount(''); setScreenshotFile(null); setScreenshotPreview('')
    await loadAll(user.id); setSubmitting(false)
  }

  // ── WITHDRAW ─────────────────────────────────────────────
  const submitWithdraw = async () => {
    if (!isWdWindow) { alert('Withdrawal only on 14th & 28th!'); return }
    if (!usdtAddr.trim() || !withdrawAmount || submitting) return
    const amt = parseFloat(withdrawAmount)
    if (amt > (account?.wallet_balance || 0)) { alert('Insufficient balance!'); return }
    setSubmitting(true)
    await supabase.from('investment_accounts').update({ usdt_address: usdtAddr.trim() }).eq('user_id', user.id)
    setSavedUsdtAddr(usdtAddr.trim())
    await supabase.from('withdrawal_requests').insert({ user_id: user.id, amount: amt, usdt_address: usdtAddr.trim() })
    alert('✅ Withdrawal requested!')
    setWithdrawAmount(''); await loadAll(user.id); setSubmitting(false)
  }

  // ── SALARY APPLY ──────────────────────────────────────────
  const applySalary = async () => {
    if (salaryApplying) return
    const activeInv = investments.filter(i => i.status === 'active')
    const hasGrowthPlus = activeInv.some(i => i.amount_usd >= 500)
    if (!hasGrowthPlus) { alert('You need an active Growth/Elite plan ($500+)'); return }
    if (referralCount < 12) { alert(`Need ${12 - referralCount} more valid referrals`); return }
    const currentMonth = new Date().toISOString().slice(0, 7)
    const existing = salaries.find(s => s.month === currentMonth && s.status !== 'rejected')
    if (existing) { alert('Already applied this month!'); return }
    const level = referralCount >= 25 ? 'gold' : 'silver'
    const amount = referralCount >= 25 ? 250 : 100
    setSalaryApplying(true)
    await supabase.from('salary_requests').insert({
      user_id: user.id, amount, level,
      usdt_address: savedUsdtAddr || usdtAddr,
      month: currentMonth, valid_referral_count: referralCount,
      investor_plan: 'growth', note: salaryNote,
    })
    await sendSystemNotif(user.id, `Your ${level === 'gold' ? '🥇 Gold' : '🥈 Silver'} salary application ($${amount}) has been received! Admin will verify within 48 hours.`)
    setShowSalaryApply(false); setSalaryNote('')
    await loadAll(user.id); setSalaryApplying(false)
    alert('✅ Salary application submitted!')
  }

  const copyReferral = () => {
    navigator.clipboard?.writeText(`${window.location.origin}/invest?ref=${user?.id}`)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  const activeInvestments = investments.filter(i => i.status === 'active')
  const totalDailyEarning = activeInvestments.reduce((s, i) => s + (i.amount_usd * i.daily_rate / 100), 0)
  const hasGrowthPlus = activeInvestments.some(i => i.amount_usd >= 500)
  const salaryLevel = referralCount >= 25 && hasGrowthPlus ? 'gold' : referralCount >= 12 && hasGrowthPlus ? 'silver' : 'none'
  const salaryAmount = salaryLevel === 'gold' ? 250 : salaryLevel === 'silver' ? 100 : 0
  const currentMonth = new Date().toISOString().slice(0, 7)
  const thisMonthSalary = salaries.find(s => s.month === currentMonth)
  const calcAmt = parseFloat(calcAmount) || 0
  const calcPlan = getPlan(calcAmt)
  const calcDaily = calcPlan ? (calcAmt * calcPlan.rate / 100) : 0

  // ─────────────────────────────────────────────────────────
  //  RENDER LOCK / SET PIN
  // ─────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ height:'100vh', background:'#050810', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'12px' }}>
      <div style={{ fontSize:'40px', animation:'spin 1s linear infinite' }}>💎</div>
      <div style={{ color:'#00e5ff', fontWeight:'700' }}>Loading Echo Invest...</div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}@keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  )

  const LockWrap = ({ children }) => (
    <div style={{ minHeight:'100vh', background:'linear-gradient(160deg,#020509,#070d1a,#020509)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'20px', position:'relative', overflow:'hidden' }}>
      <style>{`@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}@keyframes spin{to{transform:rotate(360deg)}}@keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`}</style>
      <div style={{ position:'absolute', top:'8px', right:'14px', zIndex:10 }}>
        <button onClick={() => setShowLangPicker(p=>!p)} style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'12px', padding:'6px 12px', color:'#eef2f7', fontSize:'13px', cursor:'pointer' }}>
          {LANGS[lang]?.flag} {LANGS[lang]?.name}
        </button>
        {showLangPicker && (
          <div style={{ position:'absolute', right:0, top:'40px', background:'#111620', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'12px', overflow:'hidden', zIndex:100 }}>
            {Object.entries(LANGS).map(([k,v]) => (
              <div key={k} onClick={() => { setLang(k); setShowLangPicker(false) }}
                style={{ padding:'10px 16px', cursor:'pointer', fontSize:'13px', color: lang===k ? '#00e5ff' : '#eef2f7', background: lang===k ? 'rgba(0,229,255,0.08)' : 'transparent', display:'flex', gap:'8px', whiteSpace:'nowrap' }}>
                {v.flag} {v.name}
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ animation:'float 3s ease-in-out infinite', marginBottom:'16px' }}>
        <div style={{ width:'80px', height:'80px', borderRadius:'50%', background:'linear-gradient(135deg,#00e5ff,#00ff88)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'36px' }}>💎</div>
      </div>
      <div style={{ fontSize:'26px', fontWeight:'900', background:'linear-gradient(90deg,#00e5ff,#00ff88)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', marginBottom:'4px' }}>Echo Invest</div>
      <div style={{ fontSize:'12px', color:'#4a5568', marginBottom:'20px' }}>Daily Returns · Secure · Transparent</div>

      {/* Banner */}
      <div style={{ width:'100%', maxWidth:'340px', background:'rgba(0,229,255,0.04)', border:'1px solid rgba(0,229,255,0.15)', borderRadius:'12px', padding:'10px 14px', marginBottom:'20px' }}>
        <div key={bannerIndex} style={{ display:'flex', alignItems:'center', gap:'8px', animation:'fadeUp 0.4s ease' }}>
          <span style={{ fontSize:'16px' }}>{BANNERS[bannerIndex].icon}</span>
          <span style={{ fontSize:'11px', color:'#8892a4' }}>{BANNERS[bannerIndex].text}</span>
        </div>
      </div>

      {children}

      <div style={{ marginTop:'18px', maxWidth:'320px', background:'rgba(255,165,0,0.05)', border:'1px solid rgba(255,165,0,0.15)', borderRadius:'12px', padding:'10px 14px', fontSize:'11px', color:'#ffa500', textAlign:'center', lineHeight:'1.6' }}>
        ⚠️ One account per device. Duplicates will be permanently banned.
      </div>
    </div>
  )

  const PinInput = ({ value, onChange, onEnter, placeholder = '••••' }) => (
    <input type='password' inputMode='numeric' value={value} onChange={e => onChange(e.target.value.replace(/\D/g,''))} onKeyDown={e => e.key === 'Enter' && onEnter?.()}
      placeholder={placeholder}
      style={{ width:'100%', background:'rgba(255,255,255,0.05)', border:`1px solid ${codeError ? '#ff4560' : 'rgba(255,255,255,0.12)'}`, borderRadius:'14px', padding:'15px', color:'#eef2f7', fontSize:'26px', outline:'none', textAlign:'center', letterSpacing:'8px', boxSizing:'border-box' }} />
  )

  if (authStep === 'set' || showChange) return (
    <LockWrap>
      <div style={{ width:'100%', maxWidth:'310px' }}>
        <div style={{ fontSize:'15px', fontWeight:'800', textAlign:'center', marginBottom:'16px', color:'#eef2f7' }}>
          {showChange ? '🔑 Change PIN' : '🔐 Create Access PIN'}
        </div>
        <PinInput value={newCode} onChange={setNewCode} placeholder='New PIN' />
        <div style={{ height:'10px' }} />
        <PinInput value={confirmCode} onChange={setConfirmCode} onEnter={handleSetCode} placeholder='Confirm PIN' />
        {codeError && <div style={{ color:'#ff4560', fontSize:'12px', textAlign:'center', margin:'8px 0' }}>{codeError}</div>}
        <button onClick={handleSetCode} style={{ width:'100%', padding:'15px', background:'linear-gradient(135deg,#00e5ff,#00ff88)', border:'none', borderRadius:'14px', color:'#050810', fontSize:'15px', fontWeight:'900', cursor:'pointer', marginTop:'12px' }}>
          🔐 Save PIN & Enter
        </button>
        {showChange && <button onClick={() => { setShowChange(false); setAuthStep('app') }} style={{ width:'100%', padding:'12px', background:'transparent', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'14px', color:'#4a5568', fontSize:'13px', cursor:'pointer', marginTop:'8px' }}>Cancel</button>}
      </div>
    </LockWrap>
  )

  if (authStep === 'enter') {
    if (showForgot) return (
      <LockWrap>
        <div style={{ width:'100%', maxWidth:'310px', textAlign:'center' }}>
          <div style={{ fontSize:'14px', fontWeight:'700', marginBottom:'4px', color:'#eef2f7' }}>🔑 Reset PIN</div>
          <div style={{ fontSize:'11px', color:'#4a5568', marginBottom:'16px', lineHeight:'1.7' }}>Submit your email. Admin will send a new PIN within 24 hours.</div>
          {forgotSent ? (
            <div style={{ background:'rgba(0,255,136,0.08)', border:'1px solid rgba(0,255,136,0.2)', borderRadius:'12px', padding:'14px', color:'#00ff88', fontWeight:'700' }}>✅ Request sent! Check notifications within 24h.</div>
          ) : (
            <input value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} placeholder='Your email'
              style={{ width:'100%', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:'14px', padding:'13px', color:'#eef2f7', fontSize:'14px', outline:'none', boxSizing:'border-box', marginBottom:'10px' }} />
          )}
          {!forgotSent && <button onClick={handleForgot} style={{ width:'100%', padding:'14px', background:'linear-gradient(135deg,#00e5ff,#00ff88)', border:'none', borderRadius:'14px', color:'#050810', fontSize:'14px', fontWeight:'900', cursor:'pointer', marginBottom:'8px' }}>📧 Request Reset</button>}
          <button onClick={() => { setShowForgot(false); setForgotSent(false) }} style={{ width:'100%', padding:'12px', background:'transparent', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'14px', color:'#4a5568', fontSize:'13px', cursor:'pointer' }}>← Back</button>
        </div>
      </LockWrap>
    )
    return (
      <LockWrap>
        <div style={{ width:'100%', maxWidth:'310px' }}>
          <div style={{ fontSize:'13px', color:'#8892a4', textAlign:'center', marginBottom:'12px' }}>Enter your Access PIN</div>
          <PinInput value={codeInput} onChange={setCodeInput} onEnter={handleEnterCode} />
          {codeError && <div style={{ color:'#ff4560', fontSize:'12px', textAlign:'center', margin:'8px 0' }}>{codeError}</div>}
          <button onClick={handleEnterCode} style={{ width:'100%', padding:'16px', background:'linear-gradient(135deg,#00e5ff,#00ff88)', border:'none', borderRadius:'16px', color:'#050810', fontSize:'16px', fontWeight:'900', cursor:'pointer', marginTop:'12px', boxShadow:'0 4px 24px rgba(0,229,255,0.3)' }}>
            🔓 Unlock
          </button>
          <button onClick={() => setShowForgot(true)} style={{ width:'100%', padding:'10px', background:'transparent', border:'none', color:'#4a5568', fontSize:'12px', cursor:'pointer', marginTop:'6px', textDecoration:'underline' }}>
            Forgot PIN?
          </button>
        </div>
      </LockWrap>
    )
  }

  // ─────────────────────────────────────────────────────────
  //  MAIN APP
  // ─────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight:'100vh', background:'#050810', color:'#eef2f7', paddingBottom:'90px' }}>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
        @keyframes milestoneIn{0%{opacity:0;transform:scale(0.7)}60%{transform:scale(1.05)}100%{opacity:1;transform:scale(1)}}
        *{box-sizing:border-box}::-webkit-scrollbar{display:none}
      `}</style>

      {/* ── Milestone popup ── */}
      {milestone && (
        <div style={{ position:'fixed', top:'80px', left:'50%', transform:'translateX(-50%)', zIndex:500, background:'linear-gradient(135deg,#0a1628,#001a2e)', border:'2px solid rgba(255,202,40,0.4)', borderRadius:'20px', padding:'18px 24px', textAlign:'center', animation:'milestoneIn 0.5s ease', boxShadow:'0 8px 40px rgba(255,202,40,0.2)', minWidth:'260px' }}>
          <div style={{ fontSize:'36px', marginBottom:'6px' }}>🎉</div>
          <div style={{ fontSize:'16px', fontWeight:'900', color:'#ffca28' }}>${milestone} Milestone!</div>
          <div style={{ fontSize:'12px', color:'#8892a4', marginTop:'4px' }}>You've reached ${milestone} invested!</div>
        </div>
      )}

      {/* Overlays */}
      {certInv && <Certificate inv={certInv} username={user?.email?.split('@')[0]} onClose={() => setCertInv(null)} />}
      {showShareCard && <ShareCard account={account} investments={investments} username={user?.email?.split('@')[0]} onClose={() => setShowShareCard(false)} />}
      {showTree && <ReferralTree userId={user?.id} onClose={() => setShowTree(false)} />}

      {/* ── HEADER ── */}
      <div style={{ position:'fixed', top:0, left:0, right:0, background:'rgba(5,8,16,0.97)', borderBottom:'1px solid rgba(255,255,255,0.07)', zIndex:100 }}>
        <div style={{ padding:'10px 16px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <button onClick={() => window.location.href='/feed'} style={{ background:'none', border:'none', color:'#8892a4', fontSize:'20px', cursor:'pointer' }}>←</button>
          <div style={{ fontSize:'15px', fontWeight:'900', background:'linear-gradient(90deg,#00e5ff,#00ff88)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>💎 Echo Invest</div>
          <div style={{ display:'flex', gap:'6px' }}>
            <button onClick={() => { setShowChange(true); setAuthStep('set') }} style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'10px', padding:'5px 10px', color:'#8892a4', fontSize:'11px', cursor:'pointer' }}>🔑</button>
            <button onClick={() => setShowLangPicker(p=>!p)} style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'10px', padding:'5px 10px', color:'#eef2f7', fontSize:'13px', cursor:'pointer' }}>{LANGS[lang]?.flag}</button>
          </div>
          {showLangPicker && (
            <div style={{ position:'absolute', right:'12px', top:'54px', background:'#111620', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'12px', overflow:'hidden', zIndex:200 }}>
              {Object.entries(LANGS).map(([k,v]) => (
                <div key={k} onClick={() => { setLang(k); setShowLangPicker(false) }}
                  style={{ padding:'10px 14px', cursor:'pointer', fontSize:'13px', color: lang===k ? '#00e5ff' : '#eef2f7', background: lang===k ? 'rgba(0,229,255,0.08)' : 'transparent', display:'flex', gap:'8px', whiteSpace:'nowrap' }}>
                  {v.flag} {v.name}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Banner */}
        <div style={{ background:'linear-gradient(90deg,rgba(0,229,255,0.05),rgba(0,255,136,0.03))', borderTop:'1px solid rgba(0,229,255,0.1)', padding:'6px 16px' }}>
          <div key={bannerIndex} style={{ display:'flex', alignItems:'center', gap:'8px', animation:'fadeUp 0.4s ease' }}>
            <span style={{ fontSize:'14px' }}>{BANNERS[bannerIndex].icon}</span>
            <span style={{ fontSize:'11px', color:'#8892a4', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{BANNERS[bannerIndex].text}</span>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', overflowX:'auto', scrollbarWidth:'none', padding:'0 6px' }}>
          {[
            { key:'dashboard', icon:'🏠', label:'Home' },
            { key:'invest',    icon:'📊', label:'Plans' },
            { key:'deposit',   icon:'📥', label:'Deposit' },
            { key:'withdraw',  icon:'📤', label:'Withdraw' },
            { key:'refer',     icon:'👥', label:'Refer' },
            { key:'history',   icon:'📋', label:'History' },
          ].map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              style={{ padding:'8px 10px', border:'none', background:'transparent', color: activeTab===t.key ? '#00e5ff' : '#4a5568', borderBottom: activeTab===t.key ? '2px solid #00e5ff' : '2px solid transparent', fontSize:'9px', fontWeight:'700', cursor:'pointer', whiteSpace:'nowrap', display:'flex', flexDirection:'column', alignItems:'center', gap:'2px', flexShrink:0 }}>
              <span style={{ fontSize:'14px' }}>{t.icon}</span>{t.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding:'132px 14px 20px' }}>

        {/* Status bar */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px', marginBottom:'12px' }}>
          <div style={{ background:'linear-gradient(135deg,rgba(0,229,255,0.08),rgba(0,255,136,0.05))', border:'1px solid rgba(0,229,255,0.2)', borderRadius:'12px', padding:'10px 12px' }}>
            <div style={{ fontSize:'10px', color:'#00e5ff', fontWeight:'700', marginBottom:'2px' }}>Offer ends in</div>
            <div style={{ fontSize:'18px', fontWeight:'900', color:'#00ff88' }}>{daysLeft}d left</div>
          </div>
          <div onClick={() => !postedToday && (window.location.href = '/post')}
            style={{ background: postedToday ? 'rgba(0,255,136,0.06)' : 'rgba(255,165,0,0.08)', border:`1px solid ${postedToday ? 'rgba(0,255,136,0.2)' : 'rgba(255,165,0,0.25)'}`, borderRadius:'12px', padding:'10px 12px', cursor: postedToday ? 'default' : 'pointer' }}>
            <div style={{ fontSize:'10px', color: postedToday ? '#00ff88' : '#ffa500', fontWeight:'700', marginBottom:'2px' }}>Daily Post</div>
            <div style={{ fontSize:'13px', fontWeight:'800', color: postedToday ? '#00ff88' : '#ffa500' }}>{postedToday ? '✅ Done!' : '⚠️ Tap to post'}</div>
          </div>
        </div>

        {/* Badges row */}
        {badges.length > 0 && (
          <div style={{ display:'flex', gap:'6px', marginBottom:'12px', overflowX:'auto', scrollbarWidth:'none', paddingBottom:'2px' }}>
            {badges.map(b => {
              const cfg = BADGE_CONFIG[b.badge_key]
              if (!cfg) return null
              return (
                <div key={b.id} style={{ flexShrink:0, background:`${cfg.color}12`, border:`1px solid ${cfg.color}33`, borderRadius:'20px', padding:'4px 12px', display:'flex', alignItems:'center', gap:'5px' }}>
                  <span style={{ fontSize:'14px' }}>{cfg.emoji}</span>
                  <span style={{ fontSize:'10px', fontWeight:'700', color: cfg.color, whiteSpace:'nowrap' }}>{cfg.label}</span>
                </div>
              )
            })}
          </div>
        )}

        {/* ══ DASHBOARD ══ */}
        {activeTab === 'dashboard' && (
          <div style={{ animation:'fadeUp 0.3s ease' }}>
            {!account || !account.total_invested ? (
              <div>
                <div style={{ background:'linear-gradient(135deg,#0a1628,#001a2e)', border:'1px solid rgba(0,229,255,0.2)', borderRadius:'20px', padding:'24px', textAlign:'center', marginBottom:'14px' }}>
                  <div style={{ fontSize:'48px', marginBottom:'10px' }}>💎</div>
                  <div style={{ fontSize:'20px', fontWeight:'900', marginBottom:'8px' }}>Welcome to Echo Invest</div>
                  <div style={{ fontSize:'12px', color:'#4a5568', marginBottom:'20px', lineHeight:'1.7' }}>
                    Start with $100 USDT — earn daily returns.<br/>
                    Principal 100% returned after 1 year.<br/>
                    Hold $500+ to unlock monthly salary!
                  </div>
                  <button onClick={() => setActiveTab('deposit')} style={{ padding:'14px 32px', background:'linear-gradient(135deg,#00e5ff,#00ff88)', border:'none', borderRadius:'14px', color:'#050810', fontSize:'15px', fontWeight:'900', cursor:'pointer' }}>
                    💰 Start Investing
                  </button>
                </div>

                {/* Streak info for new users */}
                <div style={{ background:'rgba(255,107,53,0.06)', border:'1px solid rgba(255,107,53,0.2)', borderRadius:'14px', padding:'14px', marginBottom:'14px' }}>
                  <div style={{ fontSize:'13px', fontWeight:'800', color:'#ff6b35', marginBottom:'8px' }}>🔥 Streak Bonus Program</div>
                  {[
                    { days:'7 days',  bonus:'🎁 Special wallet bonus', color:'#ff6b35' },
                    { days:'30 days', bonus:'⚡ Extra earning bonus',   color:'#ffca28' },
                    { days:'90 days', bonus:'🏆 Elite legend bonus',   color:'#ffa500' },
                  ].map(s => (
                    <div key={s.days} style={{ display:'flex', justifyContent:'space-between', marginBottom:'6px', fontSize:'12px' }}>
                      <span style={{ color:'#8892a4' }}>Post {s.days} straight</span>
                      <span style={{ color: s.color, fontWeight:'700' }}>{s.bonus}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {/* Wallet card */}
                <div style={{ background:'linear-gradient(135deg,#0a1628,#001830)', border:'1px solid rgba(0,229,255,0.2)', borderRadius:'20px', padding:'20px', marginBottom:'12px', position:'relative', overflow:'hidden' }}>
                  <div style={{ position:'absolute', top:'-30px', right:'-30px', width:'110px', height:'110px', background:'radial-gradient(circle,rgba(0,229,255,0.1),transparent 70%)', borderRadius:'50%' }} />
                  <div style={{ fontSize:'10px', color:'#4a5568', fontWeight:'700', letterSpacing:'1px', marginBottom:'4px' }}>WALLET BALANCE</div>
                  <div style={{ fontSize:'36px', fontWeight:'900', color:'#00ff88', marginBottom:'4px' }}>${(account?.wallet_balance||0).toFixed(2)}</div>
                  <div style={{ fontSize:'11px', color:'#4a5568' }}>Today: <span style={{ color:'#00ff88', fontWeight:'700' }}>${todayEarning.toFixed(4)}</span> · Daily: <span style={{ color:'#00e5ff', fontWeight:'700' }}>${totalDailyEarning.toFixed(4)}</span></div>
                  {/* Share card button */}
                  <button onClick={() => setShowShareCard(true)} style={{ marginTop:'10px', padding:'7px 14px', background:'rgba(0,255,136,0.08)', border:'1px solid rgba(0,255,136,0.2)', borderRadius:'10px', color:'#00ff88', fontSize:'11px', fontWeight:'700', cursor:'pointer' }}>
                    📤 Share My Earnings Card
                  </button>
                </div>

                {/* Stats grid */}
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px', marginBottom:'12px' }}>
                  {[
                    { label:'Total Invested', value:`$${(account?.total_invested||0).toFixed(2)}`, icon:'📈', color:'#00e5ff' },
                    { label:'Total Earned',   value:`$${(account?.total_earned||0).toFixed(2)}`,   icon:'⚡', color:'#ffa500' },
                    { label:'Withdrawn',      value:`$${(account?.total_withdrawn||0).toFixed(2)}`,icon:'📤', color:'#ff4560' },
                    { label:'Active Plans',   value: activeInvestments.length,                     icon:'💎', color:'#00ff88' },
                  ].map(s => (
                    <div key={s.label} style={{ background:`${s.color}09`, border:`1px solid ${s.color}22`, borderRadius:'14px', padding:'12px' }}>
                      <div style={{ fontSize:'18px', marginBottom:'4px' }}>{s.icon}</div>
                      <div style={{ fontSize:'16px', fontWeight:'900', color:s.color }}>{s.value}</div>
                      <div style={{ fontSize:'9px', color:'#4a5568', marginTop:'2px' }}>{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* Active investment cards */}
                {activeInvestments.map(inv => {
                  const plan = getPlan(inv.amount_usd)
                  const daysIn = Math.floor((Date.now() - new Date(inv.start_date)) / 86400000)
                  const pct = Math.min((daysIn/365)*100, 100)
                  const earned = daysIn * inv.amount_usd * inv.daily_rate / 100
                  return (
                    <div key={inv.id} style={{ background:'linear-gradient(135deg,#0d1820,#111620)', border:`1px solid ${plan?.color}33`, borderRadius:'16px', padding:'16px', marginBottom:'10px' }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'10px' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                          <span style={{ fontSize:'22px' }}>{plan?.emoji}</span>
                          <div>
                            <div style={{ fontSize:'14px', fontWeight:'800', color:plan?.color }}>{plan?.label} Plan</div>
                            <div style={{ fontSize:'11px', color:'#4a5568' }}>${inv.amount_usd} · {inv.daily_rate}%/day</div>
                          </div>
                        </div>
                        <button onClick={() => setCertInv(inv)} style={{ padding:'5px 12px', background:`${plan?.color}14`, border:`1px solid ${plan?.color}33`, borderRadius:'8px', color:plan?.color, fontSize:'10px', fontWeight:'700', cursor:'pointer' }}>
                          🏅 Certificate
                        </button>
                      </div>
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'6px', marginBottom:'8px' }}>
                        {[
                          { l:'Day', v:`${daysIn}/365` },
                          { l:'Earned', v:`$${earned.toFixed(2)}` },
                          { l:'Matures', v: new Date(inv.end_date).toLocaleDateString('en',{month:'short',day:'numeric'}) },
                        ].map(s => (
                          <div key={s.l} style={{ background:'rgba(255,255,255,0.04)', borderRadius:'8px', padding:'6px', textAlign:'center' }}>
                            <div style={{ fontSize:'12px', fontWeight:'800' }}>{s.v}</div>
                            <div style={{ fontSize:'9px', color:'#4a5568' }}>{s.l}</div>
                          </div>
                        ))}
                      </div>
                      <div style={{ background:'rgba(255,255,255,0.06)', borderRadius:'4px', height:'6px', overflow:'hidden' }}>
                        <div style={{ height:'100%', width:`${pct}%`, background:`linear-gradient(90deg,${plan?.color},#00ff88)`, borderRadius:'4px', transition:'width 1s' }} />
                      </div>
                      <div style={{ fontSize:'10px', color:'#4a5568', marginTop:'3px', textAlign:'right' }}>{pct.toFixed(1)}% complete</div>
                    </div>
                  )
                })}

                {/* Withdrawal timer */}
                <div style={{ background: isWdWindow ? 'rgba(0,255,136,0.07)' : 'rgba(0,229,255,0.05)', border:`1px solid ${isWdWindow ? 'rgba(0,255,136,0.25)' : 'rgba(0,229,255,0.15)'}`, borderRadius:'14px', padding:'14px', marginBottom:'10px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <div>
                    <div style={{ fontSize:'12px', fontWeight:'700', color: isWdWindow ? '#00ff88' : '#00e5ff' }}>
                      {isWdWindow ? '🟢 Withdrawal Window OPEN!' : '⏰ Next Withdrawal'}
                    </div>
                    <div style={{ fontSize:'11px', color:'#4a5568' }}>{isWdWindow ? '14th & 28th window is active' : `Opens in: ${wdTimer}`}</div>
                  </div>
                  {isWdWindow && <button onClick={() => setActiveTab('withdraw')} style={{ padding:'8px 14px', background:'linear-gradient(135deg,#00ff88,#00e5ff)', border:'none', borderRadius:'10px', color:'#050810', fontSize:'12px', fontWeight:'800', cursor:'pointer' }}>Withdraw →</button>}
                </div>

                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px' }}>
                  <button onClick={() => setActiveTab('deposit')} style={{ padding:'13px', background:'rgba(0,229,255,0.08)', border:'1px solid rgba(0,229,255,0.2)', borderRadius:'14px', color:'#00e5ff', fontSize:'13px', fontWeight:'700', cursor:'pointer' }}>📥 Deposit</button>
                  <button onClick={() => setActiveTab('withdraw')} style={{ padding:'13px', background:'rgba(0,255,136,0.08)', border:'1px solid rgba(0,255,136,0.2)', borderRadius:'14px', color:'#00ff88', fontSize:'13px', fontWeight:'700', cursor:'pointer' }}>📤 Withdraw</button>
                </div>
              </>
            )}
          </div>
        )}

        {/* ══ PLANS ══ */}
        {activeTab === 'invest' && (
          <div style={{ animation:'fadeUp 0.3s ease' }}>
            {/* Calculator */}
            <div style={{ background:'#111620', border:'1px solid rgba(0,229,255,0.2)', borderRadius:'18px', padding:'18px', marginBottom:'16px' }}>
              <div style={{ fontSize:'13px', fontWeight:'800', marginBottom:'12px' }}>🧮 Earnings Calculator</div>
              <input value={calcAmount} onChange={e => setCalcAmount(e.target.value)} type='number' placeholder='Enter amount ($)'
                style={{ width:'100%', background:'#0c1018', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'12px', padding:'12px', color:'#eef2f7', fontSize:'16px', outline:'none', boxSizing:'border-box', marginBottom:'12px', fontWeight:'700' }} />
              {calcAmt >= 100 && calcPlan ? (
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'8px' }}>
                  {[{ l:'Daily', v:`$${calcDaily.toFixed(2)}`, c:'#00e5ff' }, { l:'Monthly', v:`$${(calcDaily*30).toFixed(2)}`, c:'#00ff88' }, { l:'Yearly', v:`$${(calcDaily*365).toFixed(2)}`, c:'#ffa500' }].map(s => (
                    <div key={s.l} style={{ background:'rgba(255,255,255,0.04)', borderRadius:'10px', padding:'10px', textAlign:'center' }}>
                      <div style={{ fontSize:'15px', fontWeight:'900', color:s.c }}>{s.v}</div>
                      <div style={{ fontSize:'10px', color:'#4a5568' }}>{s.l}</div>
                    </div>
                  ))}
                </div>
              ) : calcAmt > 0 && calcAmt < 100 ? (
                <div style={{ fontSize:'12px', color:'#ff4560', textAlign:'center' }}>⚠️ Minimum $100</div>
              ) : (
                <div style={{ fontSize:'12px', color:'#4a5568', textAlign:'center' }}>Enter amount to see projections</div>
              )}
              {calcPlan && calcAmt >= 100 && <div style={{ marginTop:'8px', fontSize:'12px', color:calcPlan.color, textAlign:'center', fontWeight:'700' }}>{calcPlan.emoji} {calcPlan.label} Plan — {calcPlan.rate}%/day</div>}
            </div>

            {PLANS.map((plan, idx) => (
              <div key={plan.label} style={{ background:'linear-gradient(135deg,#0d1820,#111620)', border:`2px solid ${plan.color}${idx===1 ? '88' : '33'}`, borderRadius:'20px', padding:'20px', marginBottom:'14px', position:'relative', overflow:'hidden' }}>
                {idx === 1 && <div style={{ position:'absolute', top:'12px', right:'12px', background:'linear-gradient(135deg,#00ff88,#00e5ff)', borderRadius:'20px', padding:'3px 10px', fontSize:'10px', fontWeight:'900', color:'#050810' }}>⭐ POPULAR</div>}
                <div style={{ display:'flex', alignItems:'center', gap:'12px', marginBottom:'14px' }}>
                  <span style={{ fontSize:'30px' }}>{plan.emoji}</span>
                  <div>
                    <div style={{ fontSize:'19px', fontWeight:'900', color:plan.color }}>{plan.label}</div>
                    <div style={{ fontSize:'11px', color:'#4a5568' }}>${plan.min}{plan.max < 999999 ? ` – $${plan.max}` : '+'} USDT</div>
                  </div>
                  <div style={{ marginLeft:'auto', background:`${plan.color}22`, border:`2px solid ${plan.color}44`, borderRadius:'14px', padding:'10px 14px', textAlign:'center' }}>
                    <div style={{ fontSize:'24px', fontWeight:'900', color:plan.color }}>{plan.rate}%</div>
                    <div style={{ fontSize:'10px', color:'#4a5568' }}>/day</div>
                  </div>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'7px', marginBottom:'12px' }}>
                  {[{ l:'Monthly', v:`~${plan.monthly}%` }, { l:'Yearly', v:`~${plan.yearly}%` }, { l:'Duration', v:'365 Days' }].map(s => (
                    <div key={s.l} style={{ background:'rgba(255,255,255,0.04)', borderRadius:'10px', padding:'8px', textAlign:'center' }}>
                      <div style={{ fontSize:'13px', fontWeight:'800' }}>{s.v}</div>
                      <div style={{ fontSize:'10px', color:'#4a5568' }}>{s.l}</div>
                    </div>
                  ))}
                </div>
                <div style={{ background:'rgba(0,255,136,0.05)', border:'1px solid rgba(0,255,136,0.12)', borderRadius:'10px', padding:'10px', marginBottom:'12px', fontSize:'11px', color:'#4a5568', lineHeight:'1.8' }}>
                  ✅ Principal returned · 📝 Daily post required · 📅 14th & 28th withdrawal
                  {idx >= 1 && <> · 💼 Salary eligible</>}
                </div>
                <button onClick={() => { setActiveTab('deposit'); setInvestAmount(String(plan.min)) }}
                  style={{ width:'100%', padding:'13px', background:`linear-gradient(135deg,${plan.color},#00ff88)`, border:'none', borderRadius:'12px', color:'#050810', fontSize:'14px', fontWeight:'900', cursor:'pointer' }}>
                  {plan.emoji} Start with ${plan.min}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ══ DEPOSIT ══ */}
        {activeTab === 'deposit' && (
          <div style={{ animation:'fadeUp 0.3s ease' }}>
            <div style={{ background:'rgba(255,165,0,0.06)', border:'1px solid rgba(255,165,0,0.2)', borderRadius:'12px', padding:'12px 14px', marginBottom:'14px', fontSize:'12px', color:'#ffa500', lineHeight:'1.6' }}>
              ⚠️ Minimum <strong>$100 USDT</strong> · TRC20 only. Wrong network = permanent loss.
            </div>
            <div style={{ background:'#111620', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'20px', padding:'18px', marginBottom:'14px' }}>
              <div style={{ fontSize:'14px', fontWeight:'800', marginBottom:'14px' }}>📥 Deposit USDT (TRC20)</div>
              <div style={{ background:'linear-gradient(135deg,rgba(0,229,255,0.06),rgba(0,255,136,0.04))', border:'1px solid rgba(0,229,255,0.2)', borderRadius:'14px', padding:'14px', marginBottom:'14px' }}>
                <div style={{ fontSize:'10px', color:'#4a5568', fontWeight:'700', marginBottom:'6px' }}>DEPOSIT ADDRESS</div>
                <div style={{ fontSize:'11px', color:'#00e5ff', wordBreak:'break-all', fontFamily:'monospace', background:'#0c1018', borderRadius:'8px', padding:'10px', lineHeight:'1.6' }}>{USDT_ADDRESS}</div>
                <button onClick={() => { navigator.clipboard?.writeText(USDT_ADDRESS); setCopied(true); setTimeout(()=>setCopied(false),2000) }}
                  style={{ marginTop:'10px', padding:'9px 16px', background: copied ? 'rgba(0,255,136,0.15)' : 'rgba(0,229,255,0.1)', border:`1px solid ${copied ? '#00ff88' : '#00e5ff'}44`, borderRadius:'10px', color: copied ? '#00ff88' : '#00e5ff', fontSize:'12px', fontWeight:'700', cursor:'pointer' }}>
                  {copied ? '✓ Copied!' : '📋 Copy Address'}
                </button>
              </div>
              <div style={{ marginBottom:'12px' }}>
                <div style={{ fontSize:'11px', color:'#4a5568', marginBottom:'6px', fontWeight:'600' }}>Amount ($) — Min $100</div>
                <input value={investAmount} onChange={e => setInvestAmount(e.target.value)} type='number' placeholder='e.g. 500'
                  style={{ width:'100%', background:'#0c1018', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'12px', padding:'12px', color:'#eef2f7', fontSize:'14px', outline:'none' }} />
                {investAmount && getPlan(parseFloat(investAmount)) && <div style={{ fontSize:'11px', color:'#00ff88', marginTop:'4px' }}>✓ {getPlan(parseFloat(investAmount))?.emoji} {getPlan(parseFloat(investAmount))?.label} — {getPlan(parseFloat(investAmount))?.rate}%/day</div>}
              </div>
              <div style={{ marginBottom:'12px' }}>
                <div style={{ fontSize:'11px', color:'#4a5568', marginBottom:'6px', fontWeight:'600' }}>Transaction ID *</div>
                <input value={txid} onChange={e => setTxid(e.target.value)} placeholder='TX Hash / ID'
                  style={{ width:'100%', background:'#0c1018', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'12px', padding:'12px', color:'#eef2f7', fontSize:'13px', outline:'none', fontFamily:'monospace' }} />
              </div>
              <div style={{ marginBottom:'16px' }}>
                <div style={{ fontSize:'11px', color:'#4a5568', marginBottom:'6px', fontWeight:'600' }}>📸 Payment Screenshot (optional)</div>
                {screenshotPreview ? (
                  <div style={{ position:'relative' }}>
                    <img src={screenshotPreview} alt='ss' style={{ width:'100%', maxHeight:'200px', objectFit:'cover', borderRadius:'12px' }} />
                    <button onClick={() => { setScreenshotFile(null); setScreenshotPreview('') }} style={{ position:'absolute', top:'8px', right:'8px', background:'rgba(0,0,0,0.7)', border:'none', borderRadius:'50%', width:'28px', height:'28px', color:'#fff', cursor:'pointer' }}>✕</button>
                  </div>
                ) : (
                  <label style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'8px', background:'#0c1018', border:'2px dashed rgba(0,229,255,0.2)', borderRadius:'12px', padding:'22px', cursor:'pointer' }}>
                    <span style={{ fontSize:'28px' }}>📸</span>
                    <span style={{ fontSize:'12px', color:'#4a5568' }}>Tap to upload screenshot</span>
                    <input type='file' accept='image/*' style={{ display:'none' }} onChange={e => {
                      const f = e.target.files?.[0]; if (!f) return
                      setScreenshotFile(f)
                      const r = new FileReader(); r.onload = ev => setScreenshotPreview(ev.target.result); r.readAsDataURL(f)
                    }} />
                  </label>
                )}
              </div>
              <button onClick={submitDeposit} disabled={!txid.trim() || submitting}
                style={{ width:'100%', padding:'14px', background: txid.trim() ? 'linear-gradient(135deg,#00e5ff,#00ff88)' : 'rgba(255,255,255,0.05)', border:'none', borderRadius:'14px', color: txid.trim() ? '#050810' : '#4a5568', fontSize:'14px', fontWeight:'900', cursor: txid.trim() ? 'pointer' : 'default' }}>
                {submitting ? '⏳ Submitting...' : '📥 Submit Deposit Request'}
              </button>
            </div>
            {deposits.map(d => (
              <div key={d.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', background:'#111620', border:'1px solid rgba(255,255,255,0.05)', borderRadius:'12px', padding:'12px', marginBottom:'7px' }}>
                <div>
                  <div style={{ fontSize:'15px', fontWeight:'800' }}>${d.amount_usd}</div>
                  <div style={{ fontSize:'10px', color:'#4a5568', fontFamily:'monospace' }}>{d.txid?.slice(0,22)}...</div>
                  <div style={{ fontSize:'10px', color:'#4a5568' }}>{new Date(d.requested_at).toLocaleDateString()}</div>
                </div>
                <div style={{ fontSize:'12px', fontWeight:'700', padding:'4px 12px', borderRadius:'20px', background: d.status==='approved' ? 'rgba(0,255,136,0.1)' : d.status==='rejected' ? 'rgba(255,69,96,0.1)' : 'rgba(255,165,0,0.1)', color: d.status==='approved' ? '#00ff88' : d.status==='rejected' ? '#ff4560' : '#ffa500' }}>
                  {d.status === 'approved' ? '✅ Approved' : d.status === 'rejected' ? '❌ Rejected' : '⏳ Pending'}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ══ WITHDRAW ══ */}
        {activeTab === 'withdraw' && (
          <div style={{ animation:'fadeUp 0.3s ease' }}>
            {/* Countdown timer */}
            <div style={{ background: isWdWindow ? 'rgba(0,255,136,0.07)' : 'rgba(0,229,255,0.05)', border:`2px solid ${isWdWindow ? 'rgba(0,255,136,0.3)' : 'rgba(0,229,255,0.15)'}`, borderRadius:'16px', padding:'16px', marginBottom:'14px', textAlign:'center' }}>
              {isWdWindow ? (
                <>
                  <div style={{ fontSize:'20px', fontWeight:'900', color:'#00ff88' }}>🟢 Window Open!</div>
                  <div style={{ fontSize:'12px', color:'#4a5568', marginTop:'4px' }}>Withdrawal is available right now</div>
                </>
              ) : (
                <>
                  <div style={{ fontSize:'12px', color:'#00e5ff', fontWeight:'700', marginBottom:'4px' }}>⏰ Next Withdrawal Window</div>
                  <div style={{ fontSize:'28px', fontWeight:'900', color:'#eef2f7', fontFamily:'monospace', letterSpacing:'2px' }}>{wdTimer}</div>
                  <div style={{ fontSize:'11px', color:'#4a5568', marginTop:'4px' }}>Opens on 14th or 28th each month</div>
                </>
              )}
            </div>

            <div style={{ background:'#111620', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'20px', padding:'18px', marginBottom:'14px' }}>
              <div style={{ fontSize:'22px', fontWeight:'900', color:'#00ff88', marginBottom:'14px' }}>${(account?.wallet_balance||0).toFixed(2)} available</div>
              {savedUsdtAddr && (
                <div style={{ background:'rgba(0,255,136,0.06)', border:'1px solid rgba(0,255,136,0.15)', borderRadius:'10px', padding:'10px', marginBottom:'8px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <div>
                    <div style={{ fontSize:'10px', color:'#4a5568', fontWeight:'700' }}>Saved Address</div>
                    <div style={{ fontSize:'11px', color:'#00ff88', fontFamily:'monospace' }}>{savedUsdtAddr.slice(0,24)}...</div>
                  </div>
                  <button onClick={() => setUsdtAddr(savedUsdtAddr)} style={{ padding:'5px 10px', background:'rgba(0,255,136,0.1)', border:'1px solid rgba(0,255,136,0.2)', borderRadius:'8px', color:'#00ff88', fontSize:'11px', fontWeight:'700', cursor:'pointer' }}>Use</button>
                </div>
              )}
              <div style={{ marginBottom:'12px' }}>
                <div style={{ fontSize:'11px', color:'#4a5568', marginBottom:'5px', fontWeight:'600' }}>USDT TRC20 Address</div>
                <input value={usdtAddr} onChange={e => setUsdtAddr(e.target.value)} placeholder='Your TRC20 address'
                  style={{ width:'100%', background:'#0c1018', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'12px', padding:'12px', color:'#eef2f7', fontSize:'13px', outline:'none', fontFamily:'monospace' }} />
              </div>
              <div style={{ marginBottom:'14px' }}>
                <div style={{ fontSize:'11px', color:'#4a5568', marginBottom:'5px', fontWeight:'600' }}>Amount (USD)</div>
                <input value={withdrawAmount} onChange={e => setWithdrawAmount(e.target.value)} type='number' placeholder='0.00'
                  style={{ width:'100%', background:'#0c1018', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'12px', padding:'12px', color:'#eef2f7', fontSize:'14px', outline:'none' }} />
              </div>
              <button onClick={submitWithdraw} disabled={!isWdWindow || !usdtAddr.trim() || !withdrawAmount || submitting}
                style={{ width:'100%', padding:'14px', background: isWdWindow && usdtAddr.trim() && withdrawAmount ? 'linear-gradient(135deg,#ffa500,#ff4560)' : 'rgba(255,255,255,0.05)', border:'none', borderRadius:'14px', color: isWdWindow && usdtAddr.trim() && withdrawAmount ? '#fff' : '#4a5568', fontSize:'14px', fontWeight:'900', cursor: isWdWindow ? 'pointer' : 'default' }}>
                {!isWdWindow ? `⏰ Opens in ${wdTimer}` : '📤 Request Withdrawal'}
              </button>
            </div>
            {withdrawals.map(w => (
              <div key={w.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', background:'#111620', border:'1px solid rgba(255,255,255,0.05)', borderRadius:'12px', padding:'12px', marginBottom:'7px' }}>
                <div>
                  <div style={{ fontSize:'15px', fontWeight:'800' }}>${w.amount}</div>
                  <div style={{ fontSize:'10px', color:'#4a5568', fontFamily:'monospace' }}>{w.usdt_address?.slice(0,18)}...</div>
                  <div style={{ fontSize:'10px', color:'#4a5568' }}>{new Date(w.requested_at).toLocaleDateString()}</div>
                </div>
                <div>
                  <div style={{ fontSize:'11px', fontWeight:'700', padding:'4px 10px', borderRadius:'20px', background: w.status==='approved' ? 'rgba(0,255,136,0.1)' : w.status==='rejected' ? 'rgba(255,69,96,0.1)' : 'rgba(255,165,0,0.1)', color: w.status==='approved' ? '#00ff88' : w.status==='rejected' ? '#ff4560' : '#ffa500' }}>
                    {w.status==='approved' ? '✅ Sent' : w.status==='rejected' ? '❌ Rejected' : '⏳ Pending'}
                  </div>
                  {w.admin_note && <div style={{ fontSize:'10px', color:'#4a5568', marginTop:'3px' }}>{w.admin_note}</div>}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ══ REFER ══ */}
        {activeTab === 'refer' && (
          <div style={{ animation:'fadeUp 0.3s ease' }}>
            <div style={{ background:'linear-gradient(135deg,#0a1628,#001a2e)', border:'1px solid rgba(0,229,255,0.2)', borderRadius:'20px', padding:'20px', marginBottom:'14px', textAlign:'center' }}>
              <div style={{ fontSize:'32px', marginBottom:'8px' }}>👥</div>
              <div style={{ fontSize:'16px', fontWeight:'900', marginBottom:'6px' }}>Refer & Earn</div>
              <div style={{ fontSize:'12px', color:'#4a5568', marginBottom:'4px' }}>🥇 Level 1 — 50% of referral's daily income</div>
              <div style={{ fontSize:'12px', color:'#4a5568', marginBottom:'16px' }}>🥈 Level 2 — 25% of indirect referral's daily income</div>
              <div style={{ background:'#0c1018', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'12px', padding:'10px', marginBottom:'10px', wordBreak:'break-all', fontSize:'11px', color:'#00e5ff', fontFamily:'monospace', textAlign:'left' }}>
                {typeof window !== 'undefined' ? `${window.location.origin}/invest?ref=${user?.id}` : ''}
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px' }}>
                <button onClick={copyReferral} style={{ padding:'12px', background: copied ? 'rgba(0,255,136,0.1)' : 'linear-gradient(135deg,#00e5ff,#00ff88)', border: copied ? '1px solid #00ff88' : 'none', borderRadius:'12px', color: copied ? '#00ff88' : '#050810', fontSize:'13px', fontWeight:'900', cursor:'pointer' }}>
                  {copied ? '✓ Copied!' : '📋 Copy Link'}
                </button>
                <button onClick={() => setShowTree(true)} style={{ padding:'12px', background:'rgba(0,229,255,0.08)', border:'1px solid rgba(0,229,255,0.2)', borderRadius:'12px', color:'#00e5ff', fontSize:'13px', fontWeight:'700', cursor:'pointer' }}>
                  🌳 View Tree
                </button>
              </div>
            </div>

            {/* Referral stats */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginBottom:'14px' }}>
              {[
                { label:'Level 1 Earned', value:`$${referrals.filter(r=>r.level===1).reduce((s,r)=>s+r.amount,0).toFixed(2)}`, color:'#00e5ff', icon:'🥇' },
                { label:'Level 2 Earned', value:`$${referrals.filter(r=>r.level===2).reduce((s,r)=>s+r.amount,0).toFixed(2)}`, color:'#00ff88', icon:'🥈' },
              ].map(s => (
                <div key={s.label} style={{ background:'#111620', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'14px', padding:'14px', textAlign:'center' }}>
                  <div style={{ fontSize:'22px', marginBottom:'4px' }}>{s.icon}</div>
                  <div style={{ fontSize:'18px', fontWeight:'900', color:s.color }}>{s.value}</div>
                  <div style={{ fontSize:'10px', color:'#4a5568', marginTop:'2px' }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Salary program */}
            <div style={{ background:'linear-gradient(135deg,#0d1a10,#0a1628)', border:'1px solid rgba(255,165,0,0.25)', borderRadius:'20px', padding:'18px', marginBottom:'14px' }}>
              <div style={{ fontSize:'15px', fontWeight:'900', color:'#ffa500', marginBottom:'4px' }}>💼 Monthly Salary Program</div>
              <div style={{ fontSize:'11px', color:'#4a5568', marginBottom:'14px' }}>Hold $500+ Growth plan + refer 12+ valid investors</div>

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginBottom:'14px' }}>
                {[
                  { icon:'🥈', amount:'$100', label:'Silver', refs:12, color:'#00e5ff', unlocked: referralCount>=12 && hasGrowthPlus },
                  { icon:'🥇', amount:'$250', label:'Gold',   refs:25, color:'#ffa500', unlocked: referralCount>=25 && hasGrowthPlus },
                ].map(tier => (
                  <div key={tier.label} style={{ background: tier.unlocked ? `${tier.color}12` : 'rgba(255,255,255,0.03)', border:`1px solid ${tier.unlocked ? tier.color+'44' : 'rgba(255,255,255,0.08)'}`, borderRadius:'14px', padding:'14px', textAlign:'center', position:'relative' }}>
                    {tier.unlocked && <div style={{ position:'absolute', top:'-8px', left:'50%', transform:'translateX(-50%)', background:tier.color, borderRadius:'20px', padding:'2px 10px', fontSize:'9px', fontWeight:'900', color:'#050810', whiteSpace:'nowrap' }}>UNLOCKED</div>}
                    <div style={{ fontSize:'26px', marginBottom:'4px' }}>{tier.icon}</div>
                    <div style={{ fontSize:'20px', fontWeight:'900', color:tier.color }}>{tier.amount}</div>
                    <div style={{ fontSize:'9px', color:'#4a5568' }}>per month</div>
                    <div style={{ fontSize:'10px', color:'#8892a4', fontWeight:'600', marginTop:'2px' }}>{tier.refs} valid refs</div>
                  </div>
                ))}
              </div>

              {/* Progress */}
              <div style={{ marginBottom:'14px' }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'5px', fontSize:'11px' }}>
                  <span style={{ color:'#8892a4' }}>Valid Referrals</span>
                  <span style={{ fontWeight:'800', color: referralCount>=25 ? '#ffa500' : referralCount>=12 ? '#00e5ff' : '#00ff88' }}>{referralCount} / 25</span>
                </div>
                <div style={{ background:'rgba(255,255,255,0.06)', borderRadius:'6px', height:'10px', overflow:'hidden', position:'relative' }}>
                  <div style={{ height:'100%', width:`${Math.min((referralCount/25)*100,100)}%`, background: referralCount>=25 ? 'linear-gradient(90deg,#ffa500,#ffca28)' : 'linear-gradient(90deg,#00e5ff,#00ff88)', borderRadius:'6px', transition:'width 1s' }} />
                  <div style={{ position:'absolute', top:0, bottom:0, left:`${(12/25)*100}%`, width:'2px', background:'rgba(0,229,255,0.5)' }} />
                </div>
                <div style={{ display:'flex', justifyContent:'space-between', marginTop:'3px', fontSize:'9px', color:'#4a5568' }}>
                  <span>0</span>
                  <span style={{ color: referralCount>=12 ? '#00e5ff' : '#4a5568' }}>12 🥈</span>
                  <span style={{ color: referralCount>=25 ? '#ffa500' : '#4a5568' }}>25 🥇</span>
                </div>
              </div>

              {/* Requirements checklist */}
              <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:'10px', padding:'12px', marginBottom:'14px', fontSize:'11px', color:'#4a5568', lineHeight:'1.9' }}>
                <div style={{ color: hasGrowthPlus ? '#00ff88' : '#ff4560' }}>{hasGrowthPlus ? '✅' : '❌'} Active Growth/Elite plan ($500+)</div>
                <div style={{ color: referralCount>=12 ? '#00ff88' : '#4a5568' }}>{referralCount>=12 ? '✅' : `⏳ ${referralCount}/12`} Valid referrals (each $100+ deposit)</div>
                <div style={{ color:'#4a5568' }}>📋 Each referral must have active investment</div>
              </div>

              {thisMonthSalary ? (
                <div style={{ background: thisMonthSalary.status==='approved' ? 'rgba(0,255,136,0.08)' : thisMonthSalary.status==='rejected' ? 'rgba(255,69,96,0.08)' : 'rgba(255,165,0,0.08)', border:`1px solid ${thisMonthSalary.status==='approved' ? 'rgba(0,255,136,0.2)' : thisMonthSalary.status==='rejected' ? 'rgba(255,69,96,0.2)' : 'rgba(255,165,0,0.2)'}`, borderRadius:'12px', padding:'12px', textAlign:'center', color: thisMonthSalary.status==='approved' ? '#00ff88' : thisMonthSalary.status==='rejected' ? '#ff4560' : '#ffa500', fontSize:'13px', fontWeight:'700' }}>
                  {thisMonthSalary.status==='approved' ? `✅ $${thisMonthSalary.amount} paid this month!` : thisMonthSalary.status==='pending' ? '⏳ Application under review (48h)' : `❌ Rejected: ${thisMonthSalary.admin_note || ''}`}
                </div>
              ) : salaryLevel !== 'none' ? (
                !showSalaryApply ? (
                  <button onClick={() => setShowSalaryApply(true)} style={{ width:'100%', padding:'14px', background:'linear-gradient(135deg,#ffa500,#ffca28)', border:'none', borderRadius:'14px', color:'#050810', fontSize:'14px', fontWeight:'900', cursor:'pointer' }}>
                    📋 Apply for ${salaryAmount}/month Salary
                  </button>
                ) : (
                  <div>
                    <textarea value={salaryNote} onChange={e => setSalaryNote(e.target.value)} placeholder='Note for admin (optional)...' rows={3}
                      style={{ width:'100%', background:'#0c1018', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'12px', padding:'10px', color:'#eef2f7', fontSize:'13px', outline:'none', resize:'none', boxSizing:'border-box', marginBottom:'10px' }} />
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px' }}>
                      <button onClick={() => setShowSalaryApply(false)} style={{ padding:'12px', background:'transparent', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'12px', color:'#4a5568', fontSize:'13px', cursor:'pointer' }}>Cancel</button>
                      <button onClick={applySalary} disabled={salaryApplying} style={{ padding:'12px', background:'linear-gradient(135deg,#ffa500,#ffca28)', border:'none', borderRadius:'12px', color:'#050810', fontSize:'13px', fontWeight:'800', cursor:'pointer' }}>
                        {salaryApplying ? '⏳' : `Submit`}
                      </button>
                    </div>
                  </div>
                )
              ) : (
                <div style={{ fontSize:'12px', color:'#4a5568', textAlign:'center', padding:'10px', lineHeight:'1.6' }}>
                  {!hasGrowthPlus ? '⚠️ Deposit $500+ to unlock salary program' : `Need ${Math.max(12-referralCount,0)} more valid referrals for $100/month`}
                </div>
              )}
            </div>

            {referrals.slice(0,8).map(r => (
              <div key={r.id} style={{ display:'flex', justifyContent:'space-between', background:'#111620', border:'1px solid rgba(255,255,255,0.05)', borderRadius:'10px', padding:'10px 12px', marginBottom:'6px' }}>
                <div style={{ fontSize:'11px', color:'#8892a4' }}>Level {r.level} · {new Date(r.created_at).toLocaleDateString()}</div>
                <div style={{ fontSize:'13px', fontWeight:'700', color:'#00ff88' }}>+${r.amount.toFixed(4)}</div>
              </div>
            ))}
          </div>
        )}

        {/* ══ HISTORY ══ */}
        {activeTab === 'history' && (
          <div style={{ animation:'fadeUp 0.3s ease' }}>
            <div style={{ background:'linear-gradient(135deg,rgba(0,229,255,0.06),rgba(0,255,136,0.04))', border:'1px solid rgba(0,229,255,0.15)', borderRadius:'14px', padding:'14px', marginBottom:'14px', display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'8px' }}>
              {[
                { label:'Days', value: earnings.filter(e=>e.type==='daily').length, color:'#00e5ff' },
                { label:'Total Earned', value:`$${earnings.reduce((s,e)=>s+e.amount,0).toFixed(2)}`, color:'#00ff88' },
                { label:'Avg/Day', value: earnings.length > 0 ? `$${(earnings.reduce((s,e)=>s+e.amount,0)/earnings.length).toFixed(2)}` : '$0', color:'#ffa500' },
              ].map(s => (
                <div key={s.label} style={{ textAlign:'center' }}>
                  <div style={{ fontSize:'15px', fontWeight:'900', color:s.color }}>{s.value}</div>
                  <div style={{ fontSize:'10px', color:'#4a5568' }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Streak info */}
            {account?.current_streak > 0 && (
              <div style={{ background:'rgba(255,107,53,0.07)', border:'1px solid rgba(255,107,53,0.2)', borderRadius:'14px', padding:'14px', marginBottom:'14px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div>
                  <div style={{ fontSize:'14px', fontWeight:'800', color:'#ff6b35' }}>🔥 {account.current_streak} Day Streak!</div>
                  <div style={{ fontSize:'11px', color:'#4a5568' }}>Best: {account.longest_streak} days</div>
                </div>
                <div style={{ fontSize:'24px' }}>{account.current_streak >= 90 ? '🏆' : account.current_streak >= 30 ? '⚡' : '🔥'}</div>
              </div>
            )}

            {earnings.length === 0 ? (
              <div style={{ textAlign:'center', padding:'40px', color:'#4a5568' }}>
                <div style={{ fontSize:'30px', marginBottom:'8px' }}>📋</div>
                <div>No earnings yet</div>
              </div>
            ) : earnings.map(e => (
              <div key={e.id} style={{ display:'flex', justifyContent:'space-between', background:'#111620', border:'1px solid rgba(255,255,255,0.05)', borderRadius:'12px', padding:'12px', marginBottom:'6px' }}>
                <div>
                  <div style={{ fontSize:'11px', fontWeight:'700', color: e.type==='admin_adjustment' ? '#ffa500' : e.type==='salary' ? '#ffca28' : e.type==='streak_bonus' ? '#ff6b35' : '#8892a4', textTransform:'uppercase' }}>
                    {e.type==='admin_adjustment' ? '⚡ Adjustment' : e.type==='salary' ? '💼 Salary' : e.type==='streak_bonus' ? '🔥 Streak Bonus' : '📈 Daily Return'}
                  </div>
                  <div style={{ fontSize:'10px', color:'#4a5568' }}>{e.date}</div>
                </div>
                <div style={{ fontSize:'15px', fontWeight:'800', color: e.amount>=0 ? '#00ff88' : '#ff4560' }}>
                  {e.amount>=0 ? '+' : ''}${e.amount.toFixed(4)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom nav */}
      <div style={{ position:'fixed', bottom:0, left:0, right:0, background:'rgba(5,8,16,0.98)', borderTop:'1px solid rgba(255,255,255,0.07)', display:'flex', justifyContent:'space-around', padding:'10px 0 20px', zIndex:100 }}>
        {[{icon:'🏠',path:'/feed'},{icon:'🗺',path:'/map'},{icon:'📸',path:'/post'},{icon:'🏆',path:'/leaderboard'},{icon:'👤',path:'/profile'}].map(item => (
          <div key={item.path} onClick={() => window.location.href=item.path} style={{ fontSize:'22px', cursor:'pointer', color:'#4a5568' }}>{item.icon}</div>
        ))}
      </div>
    </div>
  )
    }
