'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const OFFER_END = new Date('2027-06-30')
const USDT_ADDRESS = 'YOUR_USDT_TRC20_ADDRESS'

const PLANS = [
  { min: 10, max: 499.99, rate: 2.0, label: 'Starter', color: '#00e5ff', emoji: '🌱' },
  { min: 500, max: 999.99, rate: 2.5, label: 'Growth', color: '#00ff88', emoji: '🚀' },
  { min: 1000, max: 999999, rate: 3.0, label: 'Elite', color: '#ffa500', emoji: '💎' },
]

const LANGS = {
  en: { name: 'English', flag: '🇬🇧' },
  bn: { name: 'বাংলা', flag: '🇧🇩' },
  hi: { name: 'हिंदी', flag: '🇮🇳' },
  ar: { name: 'العربية', flag: '🇸🇦' },
  zh: { name: '中文', flag: '🇨🇳' },
}

const T = {
  en: {
    title: 'Echo Invest', subtitle: 'Daily Returns · Secure · Transparent',
    setPass: 'Set Your Access Code', setPassSub: 'Choose a numeric code (min 4 digits)',
    enterPass: 'Enter Your Access Code', enterBtn: 'Unlock', wrongPass: 'Wrong code!',
    newCode: 'New Code', confirmCode: 'Confirm Code', saveCode: 'Save Code',
    mismatch: "Codes don't match!", tooShort: 'Minimum 4 digits!',
    changePass: 'Change Code', forgotPass: 'Forgot Code?',
    forgotTitle: 'Reset Access Code', forgotSub: 'Submit your email. Admin will send a new code within 24 hours.',
    forgotEmail: 'Your registered email', forgotSubmit: 'Request Reset', forgotSent: '✅ Request sent! Check your email within 24 hours.',
    dashboard: 'Dashboard', invest: 'Invest', withdraw: 'Withdraw', deposit: 'Deposit', history: 'History', refer: 'Refer',
    totalInvested: 'Total Invested', walletBalance: 'Wallet Balance', totalEarned: 'Total Earned', totalWithdrawn: 'Withdrawn',
    dailyEarn: "Today's Earnings", postToEarn: '📝 Post daily to earn!',
    plans: 'Investment Plans', daily: 'daily', duration: '1 Year Plan',
    offerEnds: 'Offer ends June 2027', returnBack: '✅ Principal returned after maturity',
    depositTitle: 'Deposit USDT (TRC20)', depositNote: 'Send USDT to address below, then submit TX ID',
    copyAddr: 'Copy Address', txid: 'Transaction ID', screenshot: 'Screenshot URL (optional)', submitDeposit: 'Submit Deposit',
    withdrawTitle: 'Withdraw', withdrawNote: 'Available: 14th & 28th each month', usdtAddr: 'Your USDT Address', amount: 'Amount (USD)', submitWithdraw: 'Request Withdrawal',
    referTitle: 'Refer & Earn', level1: 'Level 1: 50% of referral daily income', level2: 'Level 2: 25% of referral daily income',
    warning: '⚠️ One account per device. Multiple accounts may result in permanent ban.',
    active: 'Active', pending: 'Pending', approved: 'Approved', rejected: 'Rejected',
    noInvest: 'No active investments', investNow: 'Invest Now',
    postRequired: 'Make a post today to receive earnings!',
  },
  bn: {
    title: 'ইকো ইনভেস্ট', subtitle: 'দৈনিক রিটার্ন · নিরাপদ · স্বচ্ছ',
    setPass: 'আপনার অ্যাক্সেস কোড সেট করুন', setPassSub: 'একটি সংখ্যার কোড বেছে নিন (কমপক্ষে ৪ সংখ্যা)',
    enterPass: 'আপনার অ্যাক্সেস কোড দিন', enterBtn: 'প্রবেশ করুন', wrongPass: 'ভুল কোড!',
    newCode: 'নতুন কোড', confirmCode: 'কোড নিশ্চিত করুন', saveCode: 'কোড সেভ করুন',
    mismatch: 'কোড মিলছে না!', tooShort: 'কমপক্ষে ৪ সংখ্যা!',
    changePass: 'কোড পরিবর্তন', forgotPass: 'কোড ভুলে গেছেন?',
    forgotTitle: 'অ্যাক্সেস কোড রিসেট', forgotSub: 'আপনার ইমেইল দিন। অ্যাডমিন ২৪ ঘন্টার মধ্যে নতুন কোড পাঠাবে।',
    forgotEmail: 'আপনার নিবন্ধিত ইমেইল', forgotSubmit: 'রিসেট অনুরোধ', forgotSent: '✅ অনুরোধ পাঠানো হয়েছে! ২৪ ঘন্টার মধ্যে ইমেইল চেক করুন।',
    dashboard: 'ড্যাশবোর্ড', invest: 'বিনিয়োগ', withdraw: 'উত্তোলন', deposit: 'জমা', history: 'ইতিহাস', refer: 'রেফার',
    totalInvested: 'মোট বিনিয়োগ', walletBalance: 'ওয়ালেট ব্যালেন্স', totalEarned: 'মোট আয়', totalWithdrawn: 'উত্তোলিত',
    dailyEarn: 'আজকের আয়', postToEarn: '📝 আয় পেতে প্রতিদিন পোস্ট করুন!',
    plans: 'বিনিয়োগ পরিকল্পনা', daily: 'দৈনিক', duration: '১ বছরের প্ল্যান',
    offerEnds: 'অফার শেষ জুন ২০২৭', returnBack: '✅ মেয়াদ শেষে মূল অর্থ ফেরত',
    depositTitle: 'USDT জমা (TRC20)', depositNote: 'নিচের ঠিকানায় USDT পাঠান তারপর TX ID দিন',
    copyAddr: 'ঠিকানা কপি', txid: 'ট্রানজেকশন ID', screenshot: 'স্ক্রিনশট URL (ঐচ্ছিক)', submitDeposit: 'জমা করুন',
    withdrawTitle: 'উত্তোলন', withdrawNote: 'প্রতি মাসে ১৪ ও ২৮ তারিখ', usdtAddr: 'আপনার USDT ঠিকানা', amount: 'পরিমাণ (USD)', submitWithdraw: 'উত্তোলন অনুরোধ',
    referTitle: 'রেফার করুন ও আয় করুন', level1: 'লেভেল ১: রেফারের দৈনিক আয়ের ৫০%', level2: 'লেভেল ২: রেফারের দৈনিক আয়ের ২৫%',
    warning: '⚠️ এক ডিভাইসে একটি অ্যাকাউন্ট। একাধিক অ্যাকাউন্ট থাকলে স্থায়ী ব্লক হতে পারে।',
    active: 'সক্রিয়', pending: 'অপেক্ষমাণ', approved: 'অনুমোদিত', rejected: 'বাতিল',
    noInvest: 'কোনো সক্রিয় বিনিয়োগ নেই', investNow: 'এখন বিনিয়োগ করুন',
    postRequired: 'আজ একটি পোস্ট করুন আয় পেতে!',
  },
}

export default function Invest() {
  const [user, setUser] = useState(null)
  const [account, setAccount] = useState(null)
  const [investments, setInvestments] = useState([])
  const [earnings, setEarnings] = useState([])
  const [withdrawals, setWithdrawals] = useState([])
  const [deposits, setDeposits] = useState([])
  const [referrals, setReferrals] = useState([])
  const [loading, setLoading] = useState(true)
  const [lang, setLang] = useState('bn')
  const [showLangPicker, setShowLangPicker] = useState(false)

  // Auth states
  const [authStep, setAuthStep] = useState('loading') // loading | set | enter | app
  const [codeInput, setCodeInput] = useState('')
  const [newCode, setNewCode] = useState('')
  const [confirmCode, setConfirmCode] = useState('')
  const [codeError, setCodeError] = useState('')
  const [showChange, setShowChange] = useState(false)
  const [showForgot, setShowForgot] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotSent, setForgotSent] = useState(false)
  const [forgotSubmitting, setForgotSubmitting] = useState(false)

  // App states
  const [activeTab, setActiveTab] = useState('dashboard')
  const [postedToday, setPostedToday] = useState(false)
  const [todayEarning, setTodayEarning] = useState(0)
  const [investAmount, setInvestAmount] = useState('')
  const [txid, setTxid] = useState('')
  const [screenshot, setScreenshot] = useState('')
  const [usdtAddr, setUsdtAddr] = useState('')
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [copied, setCopied] = useState(false)

  const t = T[lang] || T.en
  const daysLeft = Math.max(0, Math.ceil((OFFER_END - new Date()) / 86400000))

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { window.location.href = '/'; return }
      const u = data.session.user
      setUser(u)
      setForgotEmail(u.email || '')
      const { data: acc } = await supabase.from('investment_accounts').select('*').eq('user_id', u.id).single()
      setAccount(acc)
      if (!acc || !acc.password) {
        setAuthStep('set')
      } else {
        setAuthStep('enter')
      }
      if (acc) await loadAll(u.id)
      setLoading(false)
    })
  }, [])

  const loadAll = async (uid) => {
    const { data: acc } = await supabase.from('investment_accounts').select('*').eq('user_id', uid).single()
    setAccount(acc)
    const { data: inv } = await supabase.from('investments').select('*').eq('user_id', uid).order('created_at', { ascending: false })
    setInvestments(inv || [])
    const today = new Date().toISOString().split('T')[0]
    const { data: earn } = await supabase.from('daily_earnings').select('*').eq('user_id', uid).order('date', { ascending: false }).limit(30)
    setEarnings(earn || [])
    const todayE = (earn || []).filter(e => e.date === today).reduce((s, e) => s + e.amount, 0)
    setTodayEarning(todayE)
    const { data: w } = await supabase.from('withdrawal_requests').select('*').eq('user_id', uid).order('requested_at', { ascending: false })
    setWithdrawals(w || [])
    const { data: d } = await supabase.from('deposit_requests').select('*').eq('user_id', uid).order('requested_at', { ascending: false })
    setDeposits(d || [])
    const { data: ref } = await supabase.from('referral_earnings').select('*').eq('user_id', uid).order('created_at', { ascending: false }).limit(20)
    setReferrals(ref || [])
    const { data: posts } = await supabase.from('posts').select('id').eq('user_id', uid).gte('created_at', today + 'T00:00:00').limit(1)
    setPostedToday((posts || []).length > 0)
    if (acc?.language) setLang(acc.language)
  }

  // ── SET NEW CODE ──────────────────────────────────────────
  const handleSetCode = async () => {
    setCodeError('')
    if (newCode.length < 4) { setCodeError(t.tooShort); return }
    if (!/^\d+$/.test(newCode)) { setCodeError('Numbers only!'); return }
    if (newCode !== confirmCode) { setCodeError(t.mismatch); return }
    const fp = btoa(navigator.userAgent + screen.width + screen.height).slice(0, 50)
    await supabase.from('investment_accounts').upsert({
      user_id: user.id,
      password: newCode,
      device_fingerprint: fp,
      language: lang,
    })
    const { data: acc } = await supabase.from('investment_accounts').select('*').eq('user_id', user.id).single()
    setAccount(acc)
    setNewCode('')
    setConfirmCode('')
    setShowChange(false)
    setAuthStep('app')
    await loadAll(user.id)
  }

  // ── ENTER CODE ────────────────────────────────────────────
  const handleEnterCode = () => {
    setCodeError('')
    if (codeInput === account?.password) {
      setAuthStep('app')
      setCodeInput('')
    } else {
      setCodeError(t.wrongPass)
      setCodeInput('')
    }
  }

  // ── FORGOT CODE ───────────────────────────────────────────
  const handleForgotSubmit = async () => {
    if (!forgotEmail.trim() || forgotSubmitting) return
    setForgotSubmitting(true)
    await supabase.from('notifications').insert({
      user_id: user.id,
      from_user_id: user.id,
      type: 'system',
      message: `PASSWORD_RESET_REQUEST | Email: ${forgotEmail} | User: ${user.id}`,
      read: false,
    })
    setForgotSent(true)
    setForgotSubmitting(false)
  }

  // ── DEPOSIT ───────────────────────────────────────────────
  const submitDeposit = async () => {
    if (!txid.trim() || !user || submitting) return
    setSubmitting(true)
    await supabase.from('deposit_requests').insert({
      user_id: user.id,
      amount_usd: parseFloat(investAmount) || 0,
      txid: txid.trim(),
      screenshot_url: screenshot.trim() || null,
    })
    alert('✅ Deposit submitted! Admin will verify and credit your account.')
    setTxid(''); setScreenshot(''); setInvestAmount('')
    await loadAll(user.id)
    setSubmitting(false)
  }

  // ── WITHDRAW ──────────────────────────────────────────────
  const submitWithdraw = async () => {
    if (!usdtAddr.trim() || !withdrawAmount || submitting) return
    const now = new Date()
    const day = now.getDate()
    if (!((day >= 13 && day <= 15) || (day >= 27 && day <= 29))) {
      alert(lang === 'bn' ? 'শুধুমাত্র ১৪ ও ২৮ তারিখে উত্তোলন করা যাবে!' : 'Withdrawal only on 14th & 28th!')
      return
    }
    setSubmitting(true)
    const amt = parseFloat(withdrawAmount)
    if (amt > (account?.wallet_balance || 0)) {
      alert('Insufficient balance!')
      setSubmitting(false)
      return
    }
    await supabase.from('withdrawal_requests').insert({
      user_id: user.id, amount: amt, usdt_address: usdtAddr.trim(),
    })
    alert('✅ Withdrawal requested!')
    setUsdtAddr(''); setWithdrawAmount('')
    await loadAll(user.id)
    setSubmitting(false)
  }

  const copyReferral = () => {
    navigator.clipboard?.writeText(`${window.location.origin}/invest?ref=${user?.id}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const getPlan = (amount) => PLANS.find(p => amount >= p.min && amount <= p.max)
  const activeInvestments = investments.filter(i => i.status === 'active')
  const totalDailyEarning = activeInvestments.reduce((s, i) => s + (i.amount_usd * i.daily_rate / 100), 0)

  // ── LOADING ───────────────────────────────────────────────
  if (loading) return (
    <div style={{ height: '100vh', background: '#050810', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontSize: '40px', animation: 'spin 1s linear infinite' }}>💎</div>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  // ── SHARED LOCK SCREEN WRAPPER ─────────────────────────────
  const LockScreen = ({ children }) => (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#050810,#0a0f1e)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px', position: 'relative', overflow: 'hidden' }}>
      <style>{`@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}`}</style>
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 30% 20%,rgba(0,229,255,0.08),transparent 50%),radial-gradient(circle at 70% 80%,rgba(0,255,136,0.06),transparent 50%)', pointerEvents: 'none' }} />

      {/* Lang */}
      <div style={{ position: 'absolute', top: '16px', right: '16px', zIndex: 10 }}>
        <button onClick={() => setShowLangPicker(p => !p)}
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '12px', padding: '6px 12px', color: '#eef2f7', fontSize: '13px', cursor: 'pointer' }}>
          {LANGS[lang]?.flag} {LANGS[lang]?.name}
        </button>
        {showLangPicker && (
          <div style={{ position: 'absolute', right: 0, top: '40px', background: '#111620', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', overflow: 'hidden', zIndex: 100 }}>
            {Object.entries(LANGS).map(([k, v]) => (
              <div key={k} onClick={() => { setLang(k); setShowLangPicker(false) }}
                style={{ padding: '10px 16px', cursor: 'pointer', fontSize: '13px', color: lang === k ? '#00e5ff' : '#eef2f7', background: lang === k ? 'rgba(0,229,255,0.08)' : 'transparent', display: 'flex', gap: '8px', whiteSpace: 'nowrap' }}>
                {v.flag} {v.name}
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ animation: 'float 3s ease-in-out infinite', marginBottom: '20px' }}>
        <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'linear-gradient(135deg,#00e5ff,#00ff88)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 40px rgba(0,229,255,0.4)', fontSize: '36px' }}>💎</div>
      </div>
      <div style={{ fontSize: '26px', fontWeight: '900', background: 'linear-gradient(90deg,#00e5ff,#00ff88)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '4px' }}>{t.title}</div>
      <div style={{ fontSize: '13px', color: '#4a5568', marginBottom: '6px' }}>{t.subtitle}</div>
      <div style={{ fontSize: '11px', color: '#00ff88', background: 'rgba(0,255,136,0.08)', borderRadius: '20px', padding: '3px 12px', border: '1px solid rgba(0,255,136,0.2)', marginBottom: '28px' }}>
        🕐 {daysLeft} days left
      </div>
      {children}
      <div style={{ marginTop: '24px', maxWidth: '320px', background: 'rgba(255,165,0,0.06)', border: '1px solid rgba(255,165,0,0.2)', borderRadius: '12px', padding: '10px 14px', fontSize: '11px', color: '#ffa500', textAlign: 'center' }}>
        {t.warning}
      </div>
    </div>
  )

  // ── SET CODE SCREEN ───────────────────────────────────────
  if (authStep === 'set' || showChange) return (
    <LockScreen>
      <div style={{ width: '100%', maxWidth: '320px' }}>
        <div style={{ fontSize: '15px', fontWeight: '800', textAlign: 'center', marginBottom: '4px', color: '#eef2f7' }}>{t.setPass}</div>
        <div style={{ fontSize: '12px', color: '#4a5568', textAlign: 'center', marginBottom: '20px' }}>{t.setPassSub}</div>
        <input
          type="password" inputMode="numeric" value={newCode}
          onChange={e => setNewCode(e.target.value.replace(/\D/g, ''))}
          placeholder="New code (numbers only)"
          style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '14px', padding: '14px', color: '#eef2f7', fontSize: '18px', outline: 'none', textAlign: 'center', letterSpacing: '4px', boxSizing: 'border-box', marginBottom: '10px' }}
        />
        <input
          type="password" inputMode="numeric" value={confirmCode}
          onChange={e => setConfirmCode(e.target.value.replace(/\D/g, ''))}
          onKeyDown={e => e.key === 'Enter' && handleSetCode()}
          placeholder="Confirm code"
          style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: `1px solid ${codeError ? '#ff4560' : 'rgba(255,255,255,0.12)'}`, borderRadius: '14px', padding: '14px', color: '#eef2f7', fontSize: '18px', outline: 'none', textAlign: 'center', letterSpacing: '4px', boxSizing: 'border-box', marginBottom: '8px' }}
        />
        {codeError && <div style={{ color: '#ff4560', fontSize: '12px', textAlign: 'center', marginBottom: '8px' }}>{codeError}</div>}
        <button onClick={handleSetCode}
          style={{ width: '100%', padding: '15px', background: 'linear-gradient(135deg,#00e5ff,#00ff88)', border: 'none', borderRadius: '14px', color: '#050810', fontSize: '15px', fontWeight: '900', cursor: 'pointer', marginBottom: '10px' }}>
          🔐 {t.saveCode}
        </button>
        {showChange && (
          <button onClick={() => setShowChange(false)}
            style={{ width: '100%', padding: '12px', background: 'transparent', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', color: '#4a5568', fontSize: '13px', cursor: 'pointer' }}>
            Cancel
          </button>
        )}
      </div>
    </LockScreen>
  )

  // ── ENTER CODE SCREEN ─────────────────────────────────────
  if (authStep === 'enter') {
    if (showForgot) return (
      <LockScreen>
        <div style={{ width: '100%', maxWidth: '320px' }}>
          <div style={{ fontSize: '15px', fontWeight: '800', textAlign: 'center', marginBottom: '4px', color: '#eef2f7' }}>{t.forgotTitle}</div>
          <div style={{ fontSize: '12px', color: '#4a5568', textAlign: 'center', marginBottom: '20px', lineHeight: '1.6' }}>{t.forgotSub}</div>
          {forgotSent ? (
            <div style={{ background: 'rgba(0,255,136,0.08)', border: '1px solid rgba(0,255,136,0.2)', borderRadius: '14px', padding: '16px', textAlign: 'center', color: '#00ff88', fontSize: '14px', fontWeight: '700', marginBottom: '12px' }}>
              {t.forgotSent}
            </div>
          ) : (
            <>
              <input value={forgotEmail} onChange={e => setForgotEmail(e.target.value)}
                placeholder={t.forgotEmail}
                style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '14px', padding: '14px', color: '#eef2f7', fontSize: '14px', outline: 'none', boxSizing: 'border-box', marginBottom: '10px' }} />
              <button onClick={handleForgotSubmit} disabled={forgotSubmitting}
                style={{ width: '100%', padding: '15px', background: 'linear-gradient(135deg,#00e5ff,#00ff88)', border: 'none', borderRadius: '14px', color: '#050810', fontSize: '15px', fontWeight: '900', cursor: 'pointer', marginBottom: '10px' }}>
                {forgotSubmitting ? '⏳' : `📧 ${t.forgotSubmit}`}
              </button>
            </>
          )}
          <button onClick={() => { setShowForgot(false); setForgotSent(false) }}
            style={{ width: '100%', padding: '12px', background: 'transparent', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', color: '#4a5568', fontSize: '13px', cursor: 'pointer' }}>
            ← Back
          </button>
        </div>
      </LockScreen>
    )

    return (
      <LockScreen>
        <div style={{ width: '100%', maxWidth: '320px' }}>
          <div style={{ fontSize: '14px', color: '#8892a4', textAlign: 'center', marginBottom: '12px' }}>{t.enterPass}</div>
          <input
            type="password" inputMode="numeric" value={codeInput}
            onChange={e => setCodeInput(e.target.value.replace(/\D/g, ''))}
            onKeyDown={e => e.key === 'Enter' && handleEnterCode()}
            placeholder="••••••"
            style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: `1px solid ${codeError ? '#ff4560' : 'rgba(255,255,255,0.12)'}`, borderRadius: '16px', padding: '16px', color: '#eef2f7', fontSize: '22px', outline: 'none', textAlign: 'center', letterSpacing: '8px', boxSizing: 'border-box', marginBottom: '8px' }}
          />
          {codeError && <div style={{ color: '#ff4560', fontSize: '12px', textAlign: 'center', marginBottom: '8px' }}>{codeError}</div>}
          <button onClick={handleEnterCode}
            style={{ width: '100%', padding: '16px', background: 'linear-gradient(135deg,#00e5ff,#00ff88)', border: 'none', borderRadius: '16px', color: '#050810', fontSize: '16px', fontWeight: '900', cursor: 'pointer', marginBottom: '12px' }}>
            🔓 {t.enterBtn}
          </button>
          <button onClick={() => setShowForgot(true)}
            style={{ width: '100%', padding: '10px', background: 'transparent', border: 'none', color: '#4a5568', fontSize: '13px', cursor: 'pointer', textDecoration: 'underline' }}>
            {t.forgotPass}
          </button>
        </div>
      </LockScreen>
    )
  }

  // ── MAIN APP ───────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: '#050810', color: '#eef2f7', paddingBottom: '90px' }}>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}} @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}`}</style>

      {/* Header */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, background: 'rgba(5,8,16,0.97)', borderBottom: '1px solid rgba(255,255,255,0.07)', zIndex: 100, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button onClick={() => window.location.href = '/feed'} style={{ background: 'none', border: 'none', color: '#8892a4', fontSize: '20px', cursor: 'pointer' }}>←</button>
        <div style={{ fontSize: '15px', fontWeight: '900', background: 'linear-gradient(90deg,#00e5ff,#00ff88)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>💎 {t.title}</div>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <button onClick={() => { setShowChange(true); setAuthStep('set') }}
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '5px 10px', color: '#8892a4', fontSize: '11px', cursor: 'pointer', fontWeight: '700' }}>
            🔑
          </button>
          <button onClick={() => setShowLangPicker(p => !p)}
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '5px 10px', color: '#eef2f7', fontSize: '12px', cursor: 'pointer' }}>
            {LANGS[lang]?.flag}
          </button>
        </div>
        {showLangPicker && (
          <div style={{ position: 'absolute', right: '12px', top: '54px', background: '#111620', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', overflow: 'hidden', zIndex: 200 }}>
            {Object.entries(LANGS).map(([k, v]) => (
              <div key={k} onClick={() => { setLang(k); setShowLangPicker(false) }}
                style={{ padding: '10px 14px', cursor: 'pointer', fontSize: '13px', color: lang === k ? '#00e5ff' : '#eef2f7', background: lang === k ? 'rgba(0,229,255,0.08)' : 'transparent', display: 'flex', gap: '8px', whiteSpace: 'nowrap' }}>
                {v.flag} {v.name}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={{ position: 'fixed', top: '54px', left: 0, right: 0, background: 'rgba(5,8,16,0.97)', borderBottom: '1px solid rgba(255,255,255,0.06)', zIndex: 99, display: 'flex', overflowX: 'auto', scrollbarWidth: 'none', padding: '0 8px' }}>
        {[
          { key: 'dashboard', label: t.dashboard, icon: '📊' },
          { key: 'invest', label: t.invest, icon: '💰' },
          { key: 'deposit', label: t.deposit, icon: '📥' },
          { key: 'withdraw', label: t.withdraw, icon: '📤' },
          { key: 'refer', label: t.refer, icon: '👥' },
          { key: 'history', label: t.history, icon: '📋' },
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            style={{ padding: '10px 12px', border: 'none', background: 'transparent', color: activeTab === tab.key ? '#00e5ff' : '#4a5568', borderBottom: activeTab === tab.key ? '2px solid #00e5ff' : '2px solid transparent', fontSize: '10px', fontWeight: '700', cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', flexShrink: 0 }}>
            <span style={{ fontSize: '15px' }}>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      <div style={{ padding: '120px 16px 20px' }}>

        {/* Offer banner */}
        <div style={{ background: 'linear-gradient(135deg,rgba(0,229,255,0.08),rgba(0,255,136,0.05))', border: '1px solid rgba(0,229,255,0.2)', borderRadius: '14px', padding: '10px 14px', marginBottom: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '12px', fontWeight: '700', color: '#00e5ff' }}>{t.offerEnds}</div>
            <div style={{ fontSize: '11px', color: '#4a5568' }}>{t.returnBack}</div>
          </div>
          <div style={{ fontSize: '18px', fontWeight: '900', color: '#00ff88' }}>{daysLeft}d</div>
        </div>

        {/* Post to earn */}
        {!postedToday && account && (
          <div onClick={() => window.location.href = '/post'}
            style={{ background: 'rgba(255,165,0,0.08)', border: '1px solid rgba(255,165,0,0.25)', borderRadius: '14px', padding: '12px 14px', marginBottom: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '22px', animation: 'pulse 2s infinite' }}>📝</span>
            <div>
              <div style={{ fontSize: '13px', fontWeight: '700', color: '#ffa500' }}>{t.postToEarn}</div>
              <div style={{ fontSize: '11px', color: '#4a5568' }}>Tap to post now</div>
            </div>
          </div>
        )}

        {/* ── DASHBOARD ── */}
        {activeTab === 'dashboard' && (
          <div>
            {!account ? (
              <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <div style={{ fontSize: '48px', marginBottom: '12px' }}>💎</div>
                <div style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px' }}>Deposit USDT to activate</div>
                <button onClick={() => setActiveTab('deposit')}
                  style={{ background: 'linear-gradient(135deg,#00e5ff,#00ff88)', border: 'none', borderRadius: '14px', padding: '14px 28px', fontSize: '15px', fontWeight: '800', color: '#050810', cursor: 'pointer' }}>
                  💰 Start Investing
                </button>
              </div>
            ) : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
                  {[
                    { label: t.walletBalance, value: `$${(account.wallet_balance || 0).toFixed(2)}`, icon: '💰', color: '#00ff88', bg: 'rgba(0,255,136,0.08)' },
                    { label: t.totalInvested, value: `$${(account.total_invested || 0).toFixed(2)}`, icon: '📈', color: '#00e5ff', bg: 'rgba(0,229,255,0.08)' },
                    { label: t.totalEarned, value: `$${(account.total_earned || 0).toFixed(2)}`, icon: '⚡', color: '#ffa500', bg: 'rgba(255,165,0,0.08)' },
                    { label: t.totalWithdrawn, value: `$${(account.total_withdrawn || 0).toFixed(2)}`, icon: '📤', color: '#ff4560', bg: 'rgba(255,69,96,0.08)' },
                  ].map(s => (
                    <div key={s.label} style={{ background: s.bg, border: `1px solid ${s.color}33`, borderRadius: '16px', padding: '14px' }}>
                      <div style={{ fontSize: '20px', marginBottom: '6px' }}>{s.icon}</div>
                      <div style={{ fontSize: '18px', fontWeight: '900', color: s.color }}>{s.value}</div>
                      <div style={{ fontSize: '10px', color: '#4a5568', marginTop: '2px' }}>{s.label}</div>
                    </div>
                  ))}
                </div>

                <div style={{ background: 'linear-gradient(135deg,rgba(0,229,255,0.1),rgba(0,255,136,0.07))', border: '1px solid rgba(0,229,255,0.2)', borderRadius: '16px', padding: '16px', marginBottom: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '11px', color: '#4a5568', fontWeight: '700', marginBottom: '4px' }}>{t.dailyEarn}</div>
                    <div style={{ fontSize: '26px', fontWeight: '900', color: '#00ff88' }}>${todayEarning.toFixed(4)}</div>
                    <div style={{ fontSize: '11px', color: '#4a5568' }}>Expected: ${totalDailyEarning.toFixed(4)}/day</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    {activeInvestments.map(i => (
                      <div key={i.id} style={{ fontSize: '16px', fontWeight: '800', color: '#00e5ff' }}>{i.daily_rate}% {t.daily}</div>
                    ))}
                  </div>
                </div>

                <div style={{ fontSize: '12px', color: '#8892a4', fontWeight: '700', letterSpacing: '1px', marginBottom: '10px' }}>📈 ACTIVE INVESTMENTS</div>
                {activeInvestments.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '30px', background: '#111620', borderRadius: '16px', marginBottom: '14px' }}>
                    <div style={{ fontSize: '32px', marginBottom: '8px' }}>💤</div>
                    <div style={{ color: '#4a5568', fontSize: '13px', marginBottom: '12px' }}>{t.noInvest}</div>
                    <button onClick={() => setActiveTab('deposit')}
                      style={{ background: 'linear-gradient(135deg,#00e5ff,#00ff88)', border: 'none', borderRadius: '12px', padding: '10px 20px', fontSize: '13px', fontWeight: '800', color: '#050810', cursor: 'pointer' }}>
                      {t.investNow}
                    </button>
                  </div>
                ) : activeInvestments.map(inv => {
                  const plan = getPlan(inv.amount_usd)
                  const daysIn = Math.floor((new Date() - new Date(inv.start_date)) / 86400000)
                  const progress = Math.min((daysIn / 365) * 100, 100)
                  return (
                    <div key={inv.id} style={{ background: '#111620', border: `1px solid ${plan?.color || '#00e5ff'}33`, borderRadius: '16px', padding: '14px', marginBottom: '10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '22px' }}>{plan?.emoji}</span>
                          <div>
                            <div style={{ fontSize: '14px', fontWeight: '800', color: plan?.color }}>{plan?.label} Plan</div>
                            <div style={{ fontSize: '12px', color: '#4a5568' }}>${inv.amount_usd} invested</div>
                          </div>
                        </div>
                        <div style={{ background: `${plan?.color}22`, border: `1px solid ${plan?.color}44`, borderRadius: '10px', padding: '6px 12px', textAlign: 'center' }}>
                          <div style={{ fontSize: '16px', fontWeight: '900', color: plan?.color }}>{inv.daily_rate}%</div>
                          <div style={{ fontSize: '9px', color: '#4a5568' }}>{t.daily}</div>
                        </div>
                      </div>
                      <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '4px', height: '6px', overflow: 'hidden', marginBottom: '6px' }}>
                        <div style={{ height: '100%', width: `${progress}%`, background: `linear-gradient(90deg,${plan?.color},#00ff88)`, borderRadius: '4px' }} />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#4a5568' }}>
                        <span>Day {daysIn}/365</span>
                        <span>Ends: {new Date(inv.end_date).toLocaleDateString()}</span>
                      </div>
                    </div>
                  )
                })}
              </>
            )}
          </div>
        )}

        {/* ── INVEST PLANS ── */}
        {activeTab === 'invest' && (
          <div>
            {PLANS.map(plan => (
              <div key={plan.label} style={{ background: '#111620', border: `1px solid ${plan.color}44`, borderRadius: '20px', padding: '20px', marginBottom: '14px', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '100px', height: '100px', background: `radial-gradient(circle,${plan.color}15,transparent 70%)`, borderRadius: '50%' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '28px' }}>{plan.emoji}</span>
                    <div>
                      <div style={{ fontSize: '18px', fontWeight: '900', color: plan.color }}>{plan.label}</div>
                      <div style={{ fontSize: '12px', color: '#4a5568' }}>${plan.min}{plan.max < 999999 ? ` – $${plan.max}` : '+'}</div>
                    </div>
                  </div>
                  <div style={{ background: `${plan.color}22`, border: `1px solid ${plan.color}44`, borderRadius: '12px', padding: '8px 14px', textAlign: 'center' }}>
                    <div style={{ fontSize: '22px', fontWeight: '900', color: plan.color }}>{plan.rate}%</div>
                    <div style={{ fontSize: '10px', color: '#4a5568' }}>{t.daily}</div>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '14px' }}>
                  {[
                    { label: 'Monthly', value: `${(plan.rate * 30).toFixed(0)}%` },
                    { label: 'Yearly', value: `${(plan.rate * 365).toFixed(0)}%` },
                    { label: 'Duration', value: '365 days' },
                  ].map(s => (
                    <div key={s.label} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '10px', padding: '8px', textAlign: 'center' }}>
                      <div style={{ fontSize: '13px', fontWeight: '800', color: '#eef2f7' }}>{s.value}</div>
                      <div style={{ fontSize: '10px', color: '#4a5568' }}>{s.label}</div>
                    </div>
                  ))}
                </div>
                <button onClick={() => { setActiveTab('deposit'); setInvestAmount(String(plan.min)) }}
                  style={{ width: '100%', padding: '12px', background: `linear-gradient(135deg,${plan.color},#00ff88)`, border: 'none', borderRadius: '12px', color: '#050810', fontSize: '14px', fontWeight: '800', cursor: 'pointer' }}>
                  {t.investNow} — Min ${plan.min}
                </button>
              </div>
            ))}
            <div style={{ background: 'rgba(0,229,255,0.06)', border: '1px solid rgba(0,229,255,0.15)', borderRadius: '14px', padding: '14px', fontSize: '12px', color: '#8892a4', lineHeight: '1.9' }}>
              ✅ Principal returned after 1 year<br />
              📝 Daily post required to receive earnings<br />
              📅 Withdraw on 14th & 28th each month<br />
              💱 USDT (TRC20) only<br />
              🔒 One account per device
            </div>
          </div>
        )}

        {/* ── DEPOSIT ── */}
        {activeTab === 'deposit' && (
          <div>
            <div style={{ background: '#111620', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '20px', padding: '20px', marginBottom: '14px' }}>
              <div style={{ fontSize: '15px', fontWeight: '800', marginBottom: '4px' }}>{t.depositTitle}</div>
              <div style={{ fontSize: '12px', color: '#4a5568', marginBottom: '16px' }}>{t.depositNote}</div>
              <div style={{ background: 'rgba(0,229,255,0.06)', border: '1px solid rgba(0,229,255,0.2)', borderRadius: '14px', padding: '14px', marginBottom: '14px' }}>
                <div style={{ fontSize: '11px', color: '#4a5568', marginBottom: '6px' }}>USDT TRC20 Address</div>
                <div style={{ fontSize: '11px', color: '#00e5ff', wordBreak: 'break-all', marginBottom: '10px', fontFamily: 'monospace' }}>{USDT_ADDRESS}</div>
                <button onClick={() => { navigator.clipboard?.writeText(USDT_ADDRESS); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
                  style={{ padding: '8px 16px', background: copied ? 'rgba(0,255,136,0.1)' : 'rgba(0,229,255,0.1)', border: `1px solid ${copied ? '#00ff88' : '#00e5ff'}44`, borderRadius: '10px', color: copied ? '#00ff88' : '#00e5ff', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>
                  {copied ? '✓ Copied!' : t.copyAddr}
                </button>
              </div>
              {[
                { label: 'Amount (USD)', value: investAmount, set: setInvestAmount, type: 'number', placeholder: 'e.g. 100' },
                { label: t.txid + ' *', value: txid, set: setTxid, type: 'text', placeholder: 'Transaction hash...' },
                { label: t.screenshot, value: screenshot, set: setScreenshot, type: 'text', placeholder: 'https://...' },
              ].map(f => (
                <div key={f.label} style={{ marginBottom: '12px' }}>
                  <div style={{ fontSize: '12px', color: '#4a5568', marginBottom: '6px' }}>{f.label}</div>
                  <input value={f.value} onChange={e => f.set(e.target.value)} type={f.type} placeholder={f.placeholder}
                    style={{ width: '100%', background: '#0c1018', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '12px 14px', color: '#eef2f7', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
                  {f.label.includes('Amount') && investAmount && getPlan(parseFloat(investAmount)) && (
                    <div style={{ fontSize: '11px', color: '#00ff88', marginTop: '4px' }}>
                      ✓ {getPlan(parseFloat(investAmount))?.label} Plan — {getPlan(parseFloat(investAmount))?.rate}% daily
                    </div>
                  )}
                </div>
              ))}
              <button onClick={submitDeposit} disabled={!txid.trim() || submitting}
                style={{ width: '100%', padding: '14px', background: txid.trim() ? 'linear-gradient(135deg,#00e5ff,#00ff88)' : 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '14px', color: txid.trim() ? '#050810' : '#4a5568', fontSize: '15px', fontWeight: '800', cursor: txid.trim() ? 'pointer' : 'default' }}>
                {submitting ? '⏳' : `📥 ${t.submitDeposit}`}
              </button>
            </div>
            {deposits.length > 0 && deposits.map(d => (
              <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#111620', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '12px 14px', marginBottom: '8px' }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '700' }}>${d.amount_usd}</div>
                  <div style={{ fontSize: '11px', color: '#4a5568' }}>{new Date(d.requested_at).toLocaleDateString()}</div>
                </div>
                <div style={{ fontSize: '12px', fontWeight: '700', padding: '4px 10px', borderRadius: '8px', background: d.status === 'approved' ? 'rgba(0,255,136,0.1)' : d.status === 'rejected' ? 'rgba(255,69,96,0.1)' : 'rgba(255,165,0,0.1)', color: d.status === 'approved' ? '#00ff88' : d.status === 'rejected' ? '#ff4560' : '#ffa500' }}>
                  {t[d.status] || d.status}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── WITHDRAW ── */}
        {activeTab === 'withdraw' && (
          <div>
            <div style={{ background: 'rgba(255,165,0,0.06)', border: '1px solid rgba(255,165,0,0.2)', borderRadius: '14px', padding: '14px', marginBottom: '14px' }}>
              <div style={{ fontSize: '13px', fontWeight: '700', color: '#ffa500', marginBottom: '4px' }}>📅 {t.withdrawNote}</div>
              <div style={{ fontSize: '12px', color: '#4a5568' }}>Next: 14th & 28th of each month</div>
            </div>
            <div style={{ background: '#111620', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '20px', padding: '20px', marginBottom: '14px' }}>
              <div style={{ fontSize: '22px', fontWeight: '900', color: '#00ff88', marginBottom: '16px' }}>
                Available: ${(account?.wallet_balance || 0).toFixed(2)}
              </div>
              {[
                { label: t.usdtAddr, value: usdtAddr, set: setUsdtAddr, placeholder: 'TRC20 address...' },
                { label: t.amount, value: withdrawAmount, set: setWithdrawAmount, placeholder: '0.00', type: 'number' },
              ].map(f => (
                <div key={f.label} style={{ marginBottom: '12px' }}>
                  <div style={{ fontSize: '12px', color: '#4a5568', marginBottom: '6px' }}>{f.label}</div>
                  <input value={f.value} onChange={e => f.set(e.target.value)} type={f.type || 'text'} placeholder={f.placeholder}
                    style={{ width: '100%', background: '#0c1018', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '12px 14px', color: '#eef2f7', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
                </div>
              ))}
              <button onClick={submitWithdraw} disabled={!usdtAddr.trim() || !withdrawAmount || submitting}
                style={{ width: '100%', padding: '14px', background: usdtAddr.trim() && withdrawAmount ? 'linear-gradient(135deg,#ffa500,#ff4560)' : 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '14px', color: usdtAddr.trim() && withdrawAmount ? '#fff' : '#4a5568', fontSize: '15px', fontWeight: '800', cursor: 'pointer' }}>
                {submitting ? '⏳' : `📤 ${t.submitWithdraw}`}
              </button>
            </div>
            {withdrawals.map(w => (
              <div key={w.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#111620', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '12px 14px', marginBottom: '8px' }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '700' }}>${w.amount}</div>
                  <div style={{ fontSize: '10px', color: '#4a5568' }}>{new Date(w.requested_at).toLocaleDateString()}</div>
                </div>
                <div style={{ fontSize: '12px', fontWeight: '700', padding: '4px 10px', borderRadius: '8px', background: w.status === 'approved' ? 'rgba(0,255,136,0.1)' : w.status === 'rejected' ? 'rgba(255,69,96,0.1)' : 'rgba(255,165,0,0.1)', color: w.status === 'approved' ? '#00ff88' : w.status === 'rejected' ? '#ff4560' : '#ffa500' }}>
                  {t[w.status] || w.status}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── REFER ── */}
        {activeTab === 'refer' && (
          <div>
            <div style={{ background: 'linear-gradient(135deg,rgba(0,229,255,0.1),rgba(0,255,136,0.07))', border: '1px solid rgba(0,229,255,0.2)', borderRadius: '20px', padding: '20px', marginBottom: '14px', textAlign: 'center' }}>
              <div style={{ fontSize: '36px', marginBottom: '8px' }}>👥</div>
              <div style={{ fontSize: '17px', fontWeight: '900', marginBottom: '8px' }}>{t.referTitle}</div>
              <div style={{ fontSize: '12px', color: '#4a5568', marginBottom: '4px' }}>{t.level1}</div>
              <div style={{ fontSize: '12px', color: '#4a5568', marginBottom: '16px' }}>{t.level2}</div>
              <div style={{ background: '#0c1018', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '10px', marginBottom: '10px', wordBreak: 'break-all', fontSize: '11px', color: '#00e5ff', fontFamily: 'monospace' }}>
                {typeof window !== 'undefined' ? `${window.location.origin}/invest?ref=${user?.id}` : ''}
              </div>
              <button onClick={copyReferral}
                style={{ width: '100%', padding: '13px', background: copied ? 'rgba(0,255,136,0.1)' : 'linear-gradient(135deg,#00e5ff,#00ff88)', border: copied ? '1px solid #00ff88' : 'none', borderRadius: '13px', color: copied ? '#00ff88' : '#050810', fontSize: '14px', fontWeight: '800', cursor: 'pointer' }}>
                {copied ? '✓ Copied!' : '📋 Copy Referral Link'}
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
              {[
                { label: 'Level 1 Earnings', value: `$${referrals.filter(r => r.level === 1).reduce((s, r) => s + r.amount, 0).toFixed(2)}`, color: '#00e5ff' },
                { label: 'Level 2 Earnings', value: `$${referrals.filter(r => r.level === 2).reduce((s, r) => s + r.amount, 0).toFixed(2)}`, color: '#00ff88' },
              ].map(s => (
                <div key={s.label} style={{ background: '#111620', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '14px', padding: '14px', textAlign: 'center' }}>
                  <div style={{ fontSize: '18px', fontWeight: '900', color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: '10px', color: '#4a5568', marginTop: '4px' }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── HISTORY ── */}
        {activeTab === 'history' && (
          <div>
            <div style={{ fontSize: '12px', color: '#4a5568', fontWeight: '700', letterSpacing: '1px', marginBottom: '10px' }}>DAILY EARNINGS</div>
            {earnings.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#4a5568' }}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>📋</div>
                <div>No earnings yet</div>
              </div>
            ) : earnings.map(e => (
              <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', background: '#111620', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '12px 14px', marginBottom: '6px' }}>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: '700', color: '#8892a4', textTransform: 'uppercase' }}>{e.type}</div>
                  <div style={{ fontSize: '11px', color: '#4a5568' }}>{e.date}</div>
                </div>
                <div style={{ fontSize: '14px', fontWeight: '800', color: '#00ff88' }}>+${e.amount.toFixed(4)}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom nav */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'rgba(5,8,16,0.98)', borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'space-around', padding: '10px 0 20px', zIndex: 100 }}>
        {[{ icon: '🏠', path: '/feed' }, { icon: '🗺', path: '/map' }, { icon: '📸', path: '/post' }, { icon: '🏆', path: '/leaderboard' }, { icon: '👤', path: '/profile' }].map(item => (
          <div key={item.path} onClick={() => window.location.href = item.path} style={{ fontSize: '22px', cursor: 'pointer', color: '#4a5568' }}>{item.icon}</div>
        ))}
      </div>
    </div>
  )
      }
