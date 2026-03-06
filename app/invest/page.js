'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const OFFER_END = new Date('2027-06-30')
const USDT_ADDRESS = 'YOUR_USDT_TRC20_ADDRESS'
const MIN_DEPOSIT = 100
const CLOUDINARY_CLOUD = 'dbguxwpa8'
const CLOUDINARY_PRESET = 'echoworld_preset'

const PLANS = [
  { min: 100, max: 499.99, rate: 2.0, label: 'Starter', color: '#00e5ff', emoji: '🌱', monthlyReturn: 60, yearlyReturn: 730 },
  { min: 500, max: 999.99, rate: 2.5, label: 'Growth', color: '#00ff88', emoji: '🚀', monthlyReturn: 75, yearlyReturn: 912 },
  { min: 1000, max: 999999, rate: 3.0, label: 'Elite', color: '#ffa500', emoji: '💎', monthlyReturn: 90, yearlyReturn: 1095 },
]

const LANGS = {
  en: { name: 'English', flag: '🇬🇧' },
  bn: { name: 'বাংলা', flag: '🇧🇩' },
  hi: { name: 'हिंदी', flag: '🇮🇳' },
  ar: { name: 'العربية', flag: '🇸🇦' },
  zh: { name: '中文', flag: '🇨🇳' },
}

const BANNERS = [
  { icon: '🔒', text: '100% Secure Investment Platform — Your funds are always protected' },
  { icon: '✅', text: 'Verified by active investors worldwide' },
  { icon: '💎', text: 'Principal amount returned 100% after maturity — Zero risk on capital' },
  { icon: '⚡', text: 'Daily returns credited to your wallet — post daily to unlock' },
  { icon: '🌍', text: 'Available in 5 languages — Trusted globally' },
  { icon: '📅', text: 'Transparent withdrawal system — 14th & 28th every month' },
  { icon: '🔗', text: 'Blockchain-verified USDT transactions — Full transparency' },
  { icon: '👥', text: '2-Level referral system — Earn from your network daily' },
  { icon: '📈', text: 'Up to 3% daily returns — One of the highest in the market' },
  { icon: '💼', text: 'Refer 12 investors + hold $500 → Earn $100/month salary!' },
  { icon: '🏆', text: 'Refer 25 investors + hold $500 → Earn $250/month salary!' },
  { icon: '🎯', text: 'Echo World Investment — Building wealth together' },
]

const T = {
  en: {
    title: 'Echo Invest', subtitle: 'Daily Returns · Secure · Transparent',
    setPass: 'Create Your Access PIN', setPassSub: 'Choose a secure numeric PIN (min 4 digits)',
    enterPass: 'Enter Your Access PIN', enterBtn: 'Unlock', wrongPass: '❌ Wrong PIN! Try again.',
    newCode: 'New PIN', confirmCode: 'Confirm PIN', saveCode: 'Create PIN & Enter',
    mismatch: "PINs don't match!", tooShort: 'Minimum 4 digits!',
    changePass: 'Change PIN', forgotPass: 'Forgot PIN?',
    forgotTitle: 'Reset Access PIN', forgotSub: 'Submit your email. Admin will send a new PIN within 24 hours.',
    forgotEmail: 'Your registered email', forgotSubmit: 'Request Reset',
    forgotSent: '✅ Request sent! Check your email within 24 hours.',
    dashboard: 'Home', invest: 'Plans', withdraw: 'Withdraw', deposit: 'Deposit', history: 'History', refer: 'Refer & Earn',
    totalInvested: 'Total Invested', walletBalance: 'Wallet Balance', totalEarned: 'Total Earned', totalWithdrawn: 'Withdrawn',
    dailyEarn: "Today's Earnings", postToEarn: '📝 Post daily to unlock earnings!',
    daily: '/day', duration: '365 Days',
    offerEnds: 'Limited Offer — Ends June 2027', returnBack: '✅ Full principal returned at maturity',
    depositTitle: 'Deposit USDT (TRC20)', depositNote: 'Minimum $100 USDT. Send to address below, then submit TX ID.',
    copyAddr: '📋 Copy Address', txid: 'Transaction ID', submitDeposit: 'Submit Deposit Request',
    withdrawTitle: 'Withdraw Earnings', withdrawNote: 'Withdrawal: 14th & 28th each month',
    usdtAddr: 'Your USDT TRC20 Address', amount: 'Amount (USD)', submitWithdraw: 'Request Withdrawal',
    saveAddr: '💾 Save Address', savedAddr: 'Saved Address',
    referTitle: 'Refer & Earn', level1: '🥇 Level 1 — 50% of direct referral\'s daily income',
    level2: '🥈 Level 2 — 25% of indirect referral\'s daily income',
    warning: '⚠️ One account per device. Duplicates will be permanently banned.',
    pending: 'Pending', approved: '✅ Approved', rejected: '❌ Rejected',
    noInvest: 'No active investment yet', investNow: 'Start Investing',
    calcTitle: '🧮 Earnings Calculator',
    salaryTitle: '💼 Monthly Salary Program',
    salaryDesc: 'Refer active investors & hold $500+ to qualify',
    salaryApply: 'Apply for Salary',
    salaryApplied: '✅ Application submitted!',
    salaryReq1: '• Hold Growth plan ($500+) active',
    salaryReq2: '• Minimum 12 valid referrals (each deposited $100+)',
    salaryReq3: '• Each referral must have active investment',
    applyBtn: '📋 Apply Now',
    noGrowth: '⚠️ You need an active Growth/Elite plan ($500+) to qualify',
  },
  bn: {
    title: 'ইকো ইনভেস্ট', subtitle: 'দৈনিক রিটার্ন · নিরাপদ · স্বচ্ছ',
    setPass: 'আপনার অ্যাক্সেস PIN তৈরি করুন', setPassSub: 'একটি নিরাপদ সংখ্যার PIN বেছে নিন (কমপক্ষে ৪ সংখ্যা)',
    enterPass: 'আপনার অ্যাক্সেস PIN দিন', enterBtn: 'প্রবেশ করুন', wrongPass: '❌ ভুল PIN! আবার চেষ্টা করুন।',
    newCode: 'নতুন PIN', confirmCode: 'PIN নিশ্চিত করুন', saveCode: 'PIN তৈরি করুন ও প্রবেশ করুন',
    mismatch: 'PIN মিলছে না!', tooShort: 'কমপক্ষে ৪ সংখ্যা!',
    changePass: 'PIN পরিবর্তন', forgotPass: 'PIN ভুলে গেছেন?',
    forgotTitle: 'অ্যাক্সেস PIN রিসেট', forgotSub: 'আপনার ইমেইল দিন। অ্যাডমিন ২৪ ঘন্টার মধ্যে নতুন PIN পাঠাবে।',
    forgotEmail: 'আপনার ইমেইল ঠিকানা', forgotSubmit: 'রিসেট অনুরোধ করুন',
    forgotSent: '✅ অনুরোধ পাঠানো হয়েছে! ২৪ ঘন্টার মধ্যে ইমেইল চেক করুন।',
    dashboard: 'হোম', invest: 'প্ল্যান', withdraw: 'উত্তোলন', deposit: 'জমা', history: 'ইতিহাস', refer: 'রেফার ও আয়',
    totalInvested: 'মোট বিনিয়োগ', walletBalance: 'ওয়ালেট ব্যালেন্স', totalEarned: 'মোট আয়', totalWithdrawn: 'উত্তোলিত',
    dailyEarn: 'আজকের আয়', postToEarn: '📝 আয় পেতে প্রতিদিন পোস্ট করুন!',
    daily: '/দিন', duration: '৩৬৫ দিন',
    offerEnds: 'সীমিত অফার — জুন ২০২৭ পর্যন্ত', returnBack: '✅ মেয়াদ শেষে মূল বিনিয়োগ সম্পূর্ণ ফেরত',
    depositTitle: 'USDT জমা দিন (TRC20)', depositNote: 'সর্বনিম্ন $১০০ USDT। নিচের ঠিকানায় পাঠান তারপর TX ID দিন।',
    copyAddr: '📋 ঠিকানা কপি', txid: 'ট্রানজেকশন ID', submitDeposit: 'জমার অনুরোধ পাঠান',
    withdrawTitle: 'আয় উত্তোলন করুন', withdrawNote: 'উত্তোলন: প্রতি মাসে ১৪ ও ২৮ তারিখ',
    usdtAddr: 'আপনার USDT TRC20 ঠিকানা', amount: 'পরিমাণ (USD)', submitWithdraw: 'উত্তোলনের অনুরোধ',
    saveAddr: '💾 ঠিকানা সেভ করুন', savedAddr: 'সেভ করা ঠিকানা',
    referTitle: 'রেফার করুন ও আয় করুন', level1: '🥇 লেভেল ১ — সরাসরি রেফারের দৈনিক আয়ের ৫০%',
    level2: '🥈 লেভেল ২ — পরোক্ষ রেফারের দৈনিক আয়ের ২৫%',
    warning: '⚠️ এক ডিভাইসে একটি অ্যাকাউন্ট। একাধিক অ্যাকাউন্ট থাকলে স্থায়ী ব্লক হবে।',
    pending: 'অপেক্ষমাণ', approved: '✅ অনুমোদিত', rejected: '❌ বাতিল',
    noInvest: 'এখনো কোনো বিনিয়োগ নেই', investNow: 'বিনিয়োগ শুরু করুন',
    calcTitle: '🧮 আয় ক্যালকুলেটর',
    salaryTitle: '💼 মাসিক স্যালারি প্রোগ্রাম',
    salaryDesc: 'সক্রিয় বিনিয়োগকারী রেফার করুন এবং $৫০০+ ধরে রাখুন',
    salaryApply: 'স্যালারির জন্য আবেদন',
    salaryApplied: '✅ আবেদন জমা দেওয়া হয়েছে!',
    salaryReq1: '• Growth প্ল্যান ($৫০০+) সক্রিয় থাকতে হবে',
    salaryReq2: '• কমপক্ষে ১২ জন valid রেফার (প্রত্যেকে $১০০+ ডিপোজিট করেছে)',
    salaryReq3: '• প্রতিটি রেফারের সক্রিয় বিনিয়োগ থাকতে হবে',
    applyBtn: '📋 এখন আবেদন করুন',
    noGrowth: '⚠️ যোগ্য হতে Growth/Elite প্ল্যান ($৫০০+) সক্রিয় থাকতে হবে',
  },
}

const uploadImage = async (file) => {
  const form = new FormData()
  form.append('file', file)
  form.append('upload_preset', CLOUDINARY_PRESET)
  form.append('folder', 'invest_screenshots')
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`, { method: 'POST', body: form })
  const data = await res.json()
  return data.secure_url
}

export default function Invest() {
  const [user, setUser] = useState(null)
  const [account, setAccount] = useState(null)
  const [investments, setInvestments] = useState([])
  const [earnings, setEarnings] = useState([])
  const [withdrawals, setWithdrawals] = useState([])
  const [deposits, setDeposits] = useState([])
  const [referrals, setReferrals] = useState([])
  const [salaries, setSalaries] = useState([])
  const [loading, setLoading] = useState(true)
  const [lang, setLang] = useState('bn')
  const [showLangPicker, setShowLangPicker] = useState(false)

  // Auth
  const [authStep, setAuthStep] = useState('loading')
  const [codeInput, setCodeInput] = useState('')
  const [newCode, setNewCode] = useState('')
  const [confirmCode, setConfirmCode] = useState('')
  const [codeError, setCodeError] = useState('')
  const [showChange, setShowChange] = useState(false)
  const [showForgot, setShowForgot] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotSent, setForgotSent] = useState(false)
  const [forgotSubmitting, setForgotSubmitting] = useState(false)

  // App
  const [activeTab, setActiveTab] = useState('dashboard')
  const [postedToday, setPostedToday] = useState(false)
  const [todayEarning, setTodayEarning] = useState(0)
  const [investAmount, setInvestAmount] = useState('')
  const [txid, setTxid] = useState('')
  const [screenshotFile, setScreenshotFile] = useState(null)
  const [screenshotPreview, setScreenshotPreview] = useState('')
  const [uploadingImg, setUploadingImg] = useState(false)
  const [usdtAddr, setUsdtAddr] = useState('')
  const [savedUsdtAddr, setSavedUsdtAddr] = useState('')
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [copied, setCopied] = useState(false)
  const [calcAmount, setCalcAmount] = useState('500')
  const [bannerIndex, setBannerIndex] = useState(0)
  const [salaryApplying, setSalaryApplying] = useState(false)
  const [salaryApplied, setSalaryApplied] = useState(false)
  const [referralCount, setReferralCount] = useState(0)
  const [showSalaryApply, setShowSalaryApply] = useState(false)
  const [salaryNote, setSalaryNote] = useState('')

  const t = T[lang] || T.en
  const daysLeft = Math.max(0, Math.ceil((OFFER_END - new Date()) / 86400000))

  useEffect(() => {
    const interval = setInterval(() => setBannerIndex(i => (i + 1) % BANNERS.length), 3200)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { window.location.href = '/'; return }
      const u = data.session.user
      setUser(u)
      setForgotEmail(u.email || '')
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

    const { data: inv } = await supabase.from('investments').select('*').eq('user_id', uid).order('created_at', { ascending: false })
    setInvestments(inv || [])

    const today = new Date().toISOString().split('T')[0]
    const { data: earn } = await supabase.from('daily_earnings').select('*').eq('user_id', uid).order('date', { ascending: false }).limit(60)
    setEarnings(earn || [])
    setTodayEarning((earn || []).filter(e => e.date === today).reduce((s, e) => s + e.amount, 0))

    const { data: w } = await supabase.from('withdrawal_requests').select('*').eq('user_id', uid).order('requested_at', { ascending: false })
    setWithdrawals(w || [])

    const { data: d } = await supabase.from('deposit_requests').select('*').eq('user_id', uid).order('requested_at', { ascending: false })
    setDeposits(d || [])

    const { data: ref } = await supabase.from('referral_earnings').select('*').eq('user_id', uid).order('created_at', { ascending: false }).limit(30)
    setReferrals(ref || [])

    const { data: sal } = await supabase.from('salary_requests').select('*').eq('user_id', uid).order('requested_at', { ascending: false })
    setSalaries(sal || [])

    // Count valid referrals: referred users who have approved deposit >= $100
    const { data: refUsers } = await supabase.from('investment_accounts').select('user_id').eq('referred_by', uid)
    if (refUsers && refUsers.length > 0) {
      const refIds = refUsers.map(r => r.user_id)
      const { data: validDeps } = await supabase.from('deposit_requests')
        .select('user_id').eq('status', 'approved').in('user_id', refIds).gte('amount_usd', 100)
      setReferralCount(new Set((validDeps || []).map(r => r.user_id)).size)
    }

    const { data: posts } = await supabase.from('posts').select('id').eq('user_id', uid).gte('created_at', today + 'T00:00:00').limit(1)
    setPostedToday((posts || []).length > 0)
  }

  // ── AUTH ────────────────────────────────────────────────
  const handleSetCode = async () => {
    setCodeError('')
    if (newCode.length < 4) { setCodeError(t.tooShort); return }
    if (!/^\d+$/.test(newCode)) { setCodeError('Numbers only!'); return }
    if (newCode !== confirmCode) { setCodeError(t.mismatch); return }
    const fp = btoa(navigator.userAgent + screen.width + screen.height).slice(0, 50)
    await supabase.from('investment_accounts').upsert({ user_id: user.id, password: newCode, device_fingerprint: fp, language: lang })
    const { data: acc } = await supabase.from('investment_accounts').select('*').eq('user_id', user.id).single()
    setAccount(acc)
    setNewCode(''); setConfirmCode(''); setShowChange(false)
    setAuthStep('app')
    await loadAll(user.id)
  }

  const handleEnterCode = () => {
    setCodeError('')
    if (codeInput === account?.password) { setAuthStep('app'); setCodeInput('') }
    else { setCodeError(t.wrongPass); setCodeInput('') }
  }

  const handleForgotSubmit = async () => {
    if (!forgotEmail.trim() || forgotSubmitting) return
    setForgotSubmitting(true)
    await supabase.from('notifications').insert({
      user_id: user.id, from_user_id: user.id, type: 'system',
      message: `PASSWORD_RESET_REQUEST | Email: ${forgotEmail} | User: ${user.id}`,
      read: false,
    })
    setForgotSent(true); setForgotSubmitting(false)
  }

  // ── DEPOSIT ─────────────────────────────────────────────
  const submitDeposit = async () => {
    if (!user || submitting) return
    const amt = parseFloat(investAmount)
    if (!amt || amt < MIN_DEPOSIT) { alert(`Minimum deposit is $${MIN_DEPOSIT} USDT`); return }
    if (!txid.trim()) { alert('Please enter Transaction ID'); return }
    setSubmitting(true)

    let screenshotUrl = ''
    if (screenshotFile) {
      setUploadingImg(true)
      try { screenshotUrl = await uploadImage(screenshotFile) }
      catch { alert('Image upload failed. Try again.'); setSubmitting(false); setUploadingImg(false); return }
      setUploadingImg(false)
    }

    await supabase.from('deposit_requests').insert({
      user_id: user.id, amount_usd: amt, txid: txid.trim(),
      screenshot_url: screenshotUrl || null,
    })

    if (!account) {
      const fp = btoa(navigator.userAgent + screen.width + screen.height).slice(0, 50)
      await supabase.from('investment_accounts').upsert({ user_id: user.id, password: '1234', device_fingerprint: fp })
    }

    alert('✅ Deposit submitted! Admin will verify within 24 hours.')
    setTxid(''); setInvestAmount(''); setScreenshotFile(null); setScreenshotPreview('')
    await loadAll(user.id)
    setSubmitting(false)
  }

  // ── WITHDRAW ─────────────────────────────────────────────
  const submitWithdraw = async () => {
    if (!usdtAddr.trim() || !withdrawAmount || submitting) return
    const now = new Date(); const day = now.getDate()
    if (!((day >= 13 && day <= 15) || (day >= 27 && day <= 29))) {
      alert(lang === 'bn' ? 'শুধুমাত্র ১৪ ও ২৮ তারিখে উত্তোলন করা যাবে!' : 'Withdrawal only on 14th & 28th!')
      return
    }
    setSubmitting(true)
    const amt = parseFloat(withdrawAmount)
    if (amt > (account?.wallet_balance || 0)) { alert('Insufficient balance!'); setSubmitting(false); return }

    await supabase.from('investment_accounts').update({ usdt_address: usdtAddr.trim() }).eq('user_id', user.id)
    setSavedUsdtAddr(usdtAddr.trim())
    await supabase.from('withdrawal_requests').insert({ user_id: user.id, amount: amt, usdt_address: usdtAddr.trim() })
    alert('✅ Withdrawal requested!')
    setWithdrawAmount('')
    await loadAll(user.id)
    setSubmitting(false)
  }

  // ── SALARY APPLY ─────────────────────────────────────────
  const applySalary = async () => {
    if (salaryApplying) return
    const activeInv = investments.filter(i => i.status === 'active')
    const hasGrowthPlus = activeInv.some(i => i.amount_usd >= 500)

    if (!hasGrowthPlus) {
      alert(t.noGrowth); return
    }
    if (referralCount < 12) {
      alert(lang === 'bn'
        ? `আপনার ${referralCount} জন valid রেফার আছে। স্যালারির জন্য কমপক্ষে ১২ জন লাগবে।`
        : `You have ${referralCount} valid referrals. Minimum 12 required for salary.`)
      return
    }

    const level = referralCount >= 25 ? 'gold' : 'silver'
    const amount = referralCount >= 25 ? 250 : 100
    const currentMonth = new Date().toISOString().slice(0, 7)

    // Check already applied this month
    const existing = salaries.find(s => s.month === currentMonth && s.status !== 'rejected')
    if (existing) {
      alert(lang === 'bn' ? 'এই মাসে আপনি ইতোমধ্যে আবেদন করেছেন!' : 'Already applied this month!')
      return
    }

    setSalaryApplying(true)
    await supabase.from('salary_requests').insert({
      user_id: user.id,
      amount,
      level,
      usdt_address: savedUsdtAddr || usdtAddr,
      month: currentMonth,
      valid_referral_count: referralCount,
      investor_plan: level === 'gold' ? 'elite_or_growth' : 'growth',
      note: salaryNote,
    })

    await supabase.from('notifications').insert({
      user_id: user.id, from_user_id: user.id, type: 'system',
      message: `SALARY_APPLICATION | Level: ${level} | Amount: $${amount} | Referrals: ${referralCount} | Month: ${currentMonth}`,
      read: false,
    })

    setSalaryApplied(true); setShowSalaryApply(false); setSalaryNote('')
    await loadAll(user.id)
    setSalaryApplying(false)
  }

  const copyReferral = () => {
    navigator.clipboard?.writeText(`${window.location.origin}/invest?ref=${user?.id}`)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  const getPlan = (amount) => PLANS.find(p => amount >= p.min && amount <= p.max)
  const activeInvestments = investments.filter(i => i.status === 'active')
  const totalDailyEarning = activeInvestments.reduce((s, i) => s + (i.amount_usd * i.daily_rate / 100), 0)
  const hasGrowthPlus = activeInvestments.some(i => i.amount_usd >= 500)
  const currentMonth = new Date().toISOString().slice(0, 7)
  const thisMonthSalary = salaries.find(s => s.month === currentMonth)
  const calcAmt = parseFloat(calcAmount) || 0
  const calcPlan = getPlan(calcAmt)
  const calcDaily = calcPlan ? (calcAmt * calcPlan.rate / 100) : 0
  const salaryLevel = referralCount >= 25 && hasGrowthPlus ? 'gold' : referralCount >= 12 && hasGrowthPlus ? 'silver' : 'none'
  const salaryAmount = salaryLevel === 'gold' ? 250 : salaryLevel === 'silver' ? 100 : 0

  if (loading) return (
    <div style={{ height: '100vh', background: '#050810', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '12px' }}>
      <div style={{ fontSize: '40px', animation: 'spin 1s linear infinite' }}>💎</div>
      <div style={{ color: '#00e5ff', fontSize: '14px', fontWeight: '700' }}>Loading Echo Invest...</div>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  // ── LOCK SCREEN ────────────────────────────────────────────
  const LockScreen = ({ children }) => (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg,#020509,#070d1a,#020509)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px', position: 'relative', overflow: 'hidden' }}>
      <style>{`
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
        @keyframes glow{0%,100%{box-shadow:0 0 30px rgba(0,229,255,0.3)}50%{box-shadow:0 0 60px rgba(0,229,255,0.6)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
      `}</style>
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', top: '10%', left: '5%', width: '200px', height: '200px', background: 'radial-gradient(circle,rgba(0,229,255,0.05),transparent 70%)', borderRadius: '50%' }} />
        <div style={{ position: 'absolute', bottom: '15%', right: '5%', width: '160px', height: '160px', background: 'radial-gradient(circle,rgba(0,255,136,0.04),transparent 70%)', borderRadius: '50%' }} />
      </div>

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

      <div style={{ animation: 'float 3s ease-in-out infinite', marginBottom: '16px' }}>
        <div style={{ width: '88px', height: '88px', borderRadius: '50%', background: 'linear-gradient(135deg,#00e5ff,#00ff88)', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'glow 3s ease-in-out infinite', fontSize: '38px' }}>💎</div>
      </div>
      <div style={{ fontSize: '28px', fontWeight: '900', background: 'linear-gradient(90deg,#00e5ff,#00ff88)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '4px', animation: 'fadeUp 0.5s ease' }}>{t.title}</div>
      <div style={{ fontSize: '13px', color: '#4a5568', marginBottom: '10px' }}>{t.subtitle}</div>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '18px', flexWrap: 'wrap', justifyContent: 'center' }}>
        <div style={{ fontSize: '11px', color: '#00ff88', background: 'rgba(0,255,136,0.08)', borderRadius: '20px', padding: '4px 14px', border: '1px solid rgba(0,255,136,0.2)' }}>🕐 {daysLeft} days left</div>
        <div style={{ fontSize: '11px', color: '#ffa500', background: 'rgba(255,165,0,0.08)', borderRadius: '20px', padding: '4px 14px', border: '1px solid rgba(255,165,0,0.2)' }}>⚡ Up to 3%/day</div>
        <div style={{ fontSize: '11px', color: '#00e5ff', background: 'rgba(0,229,255,0.08)', borderRadius: '20px', padding: '4px 14px', border: '1px solid rgba(0,229,255,0.2)' }}>💼 $100-250/month salary</div>
      </div>

      {/* Scrolling banner */}
      <div style={{ width: '100%', maxWidth: '360px', background: 'rgba(0,229,255,0.04)', border: '1px solid rgba(0,229,255,0.15)', borderRadius: '12px', padding: '10px 14px', marginBottom: '20px' }}>
        <div key={bannerIndex} style={{ display: 'flex', alignItems: 'center', gap: '8px', animation: 'fadeUp 0.4s ease' }}>
          <span style={{ fontSize: '18px', flexShrink: 0 }}>{BANNERS[bannerIndex].icon}</span>
          <span style={{ fontSize: '12px', color: '#8892a4', lineHeight: '1.5' }}>{BANNERS[bannerIndex].text}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '4px', marginTop: '8px' }}>
          {BANNERS.map((_, i) => (
            <div key={i} style={{ width: i === bannerIndex ? '14px' : '4px', height: '4px', borderRadius: '2px', background: i === bannerIndex ? '#00e5ff' : 'rgba(255,255,255,0.15)', transition: 'all 0.3s' }} />
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap', justifyContent: 'center', maxWidth: '360px' }}>
        {['🔒 Secure', '✅ Verified', '💎 Principal Back', '📅 Bi-Monthly Payout', '💼 Salary Program'].map(b => (
          <div key={b} style={{ fontSize: '10px', color: '#8892a4', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', padding: '4px 10px' }}>{b}</div>
        ))}
      </div>

      {children}

      <div style={{ marginTop: '20px', maxWidth: '320px', background: 'rgba(255,165,0,0.05)', border: '1px solid rgba(255,165,0,0.15)', borderRadius: '12px', padding: '10px 14px', fontSize: '11px', color: '#ffa500', textAlign: 'center', lineHeight: '1.6' }}>
        {t.warning}
      </div>
    </div>
  )

  if (authStep === 'set' || showChange) return (
    <LockScreen>
      <div style={{ width: '100%', maxWidth: '320px' }}>
        <div style={{ fontSize: '16px', fontWeight: '800', textAlign: 'center', marginBottom: '4px', color: '#eef2f7' }}>{t.setPass}</div>
        <div style={{ fontSize: '12px', color: '#4a5568', textAlign: 'center', marginBottom: '20px' }}>{t.setPassSub}</div>
        <input type="password" inputMode="numeric" value={newCode} onChange={e => setNewCode(e.target.value.replace(/\D/g, ''))} placeholder="New PIN"
          style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '14px', padding: '14px', color: '#eef2f7', fontSize: '22px', outline: 'none', textAlign: 'center', letterSpacing: '6px', boxSizing: 'border-box', marginBottom: '10px' }} />
        <input type="password" inputMode="numeric" value={confirmCode} onChange={e => setConfirmCode(e.target.value.replace(/\D/g, ''))} onKeyDown={e => e.key === 'Enter' && handleSetCode()} placeholder="Confirm PIN"
          style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: `1px solid ${codeError ? '#ff4560' : 'rgba(255,255,255,0.12)'}`, borderRadius: '14px', padding: '14px', color: '#eef2f7', fontSize: '22px', outline: 'none', textAlign: 'center', letterSpacing: '6px', boxSizing: 'border-box', marginBottom: '8px' }} />
        {codeError && <div style={{ color: '#ff4560', fontSize: '12px', textAlign: 'center', marginBottom: '8px' }}>{codeError}</div>}
        <button onClick={handleSetCode}
          style={{ width: '100%', padding: '15px', background: 'linear-gradient(135deg,#00e5ff,#00ff88)', border: 'none', borderRadius: '14px', color: '#050810', fontSize: '15px', fontWeight: '900', cursor: 'pointer', marginBottom: '8px' }}>
          🔐 {t.saveCode}
        </button>
        {showChange && <button onClick={() => { setShowChange(false); setAuthStep('app') }} style={{ width: '100%', padding: '12px', background: 'transparent', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', color: '#4a5568', fontSize: '13px', cursor: 'pointer' }}>Cancel</button>}
      </div>
    </LockScreen>
  )

  if (authStep === 'enter') {
    if (showForgot) return (
      <LockScreen>
        <div style={{ width: '100%', maxWidth: '320px' }}>
          <div style={{ fontSize: '15px', fontWeight: '800', textAlign: 'center', marginBottom: '4px', color: '#eef2f7' }}>{t.forgotTitle}</div>
          <div style={{ fontSize: '12px', color: '#4a5568', textAlign: 'center', marginBottom: '20px', lineHeight: '1.6' }}>{t.forgotSub}</div>
          {forgotSent ? (
            <div style={{ background: 'rgba(0,255,136,0.08)', border: '1px solid rgba(0,255,136,0.2)', borderRadius: '14px', padding: '16px', textAlign: 'center', color: '#00ff88', fontSize: '14px', fontWeight: '700', marginBottom: '12px' }}>{t.forgotSent}</div>
          ) : (
            <>
              <input value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} placeholder={t.forgotEmail}
                style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '14px', padding: '14px', color: '#eef2f7', fontSize: '14px', outline: 'none', boxSizing: 'border-box', marginBottom: '10px' }} />
              <button onClick={handleForgotSubmit} disabled={forgotSubmitting}
                style={{ width: '100%', padding: '15px', background: 'linear-gradient(135deg,#00e5ff,#00ff88)', border: 'none', borderRadius: '14px', color: '#050810', fontSize: '15px', fontWeight: '900', cursor: 'pointer', marginBottom: '10px' }}>
                {forgotSubmitting ? '⏳' : `📧 ${t.forgotSubmit}`}
              </button>
            </>
          )}
          <button onClick={() => { setShowForgot(false); setForgotSent(false) }}
            style={{ width: '100%', padding: '12px', background: 'transparent', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', color: '#4a5568', fontSize: '13px', cursor: 'pointer' }}>← Back</button>
        </div>
      </LockScreen>
    )
    return (
      <LockScreen>
        <div style={{ width: '100%', maxWidth: '320px' }}>
          <div style={{ fontSize: '14px', color: '#8892a4', textAlign: 'center', marginBottom: '12px' }}>{t.enterPass}</div>
          <input type="password" inputMode="numeric" value={codeInput} onChange={e => setCodeInput(e.target.value.replace(/\D/g, ''))} onKeyDown={e => e.key === 'Enter' && handleEnterCode()} placeholder="••••••"
            style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: `1px solid ${codeError ? '#ff4560' : 'rgba(255,255,255,0.12)'}`, borderRadius: '16px', padding: '16px', color: '#eef2f7', fontSize: '28px', outline: 'none', textAlign: 'center', letterSpacing: '10px', boxSizing: 'border-box', marginBottom: '8px' }} />
          {codeError && <div style={{ color: '#ff4560', fontSize: '12px', textAlign: 'center', marginBottom: '8px' }}>{codeError}</div>}
          <button onClick={handleEnterCode}
            style={{ width: '100%', padding: '16px', background: 'linear-gradient(135deg,#00e5ff,#00ff88)', border: 'none', borderRadius: '16px', color: '#050810', fontSize: '16px', fontWeight: '900', cursor: 'pointer', marginBottom: '12px', boxShadow: '0 4px 24px rgba(0,229,255,0.3)' }}>
            🔓 {t.enterBtn}
          </button>
          <button onClick={() => setShowForgot(true)} style={{ width: '100%', padding: '10px', background: 'transparent', border: 'none', color: '#4a5568', fontSize: '13px', cursor: 'pointer', textDecoration: 'underline' }}>
            {t.forgotPass}
          </button>
        </div>
      </LockScreen>
    )
  }

  // ── MAIN APP ───────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: '#050810', color: '#eef2f7', paddingBottom: '90px' }}>
      <style>{`
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
      `}</style>

      {/* Header */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, background: 'rgba(5,8,16,0.97)', borderBottom: '1px solid rgba(255,255,255,0.07)', zIndex: 100 }}>
        <div style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button onClick={() => window.location.href = '/feed'} style={{ background: 'none', border: 'none', color: '#8892a4', fontSize: '20px', cursor: 'pointer' }}>←</button>
          <div style={{ fontSize: '16px', fontWeight: '900', background: 'linear-gradient(90deg,#00e5ff,#00ff88)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>💎 {t.title}</div>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button onClick={() => { setShowChange(true); setAuthStep('set') }}
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '5px 10px', color: '#8892a4', fontSize: '11px', cursor: 'pointer' }}>🔑</button>
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

        {/* Rolling trust banner */}
        <div style={{ background: 'linear-gradient(90deg,rgba(0,229,255,0.05),rgba(0,255,136,0.03),rgba(0,229,255,0.05))', borderTop: '1px solid rgba(0,229,255,0.1)', borderBottom: '1px solid rgba(0,229,255,0.08)', padding: '7px 16px', overflow: 'hidden' }}>
          <div key={bannerIndex} style={{ display: 'flex', alignItems: 'center', gap: '8px', animation: 'fadeUp 0.4s ease' }}>
            <span style={{ fontSize: '14px', flexShrink: 0 }}>{BANNERS[bannerIndex].icon}</span>
            <span style={{ fontSize: '11px', color: '#8892a4', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{BANNERS[bannerIndex].text}</span>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', overflowX: 'auto', scrollbarWidth: 'none', padding: '0 6px' }}>
          {[
            { key: 'dashboard', label: t.dashboard, icon: '🏠' },
            { key: 'invest', label: t.invest, icon: '📊' },
            { key: 'deposit', label: t.deposit, icon: '📥' },
            { key: 'withdraw', label: t.withdraw, icon: '📤' },
            { key: 'refer', label: t.refer, icon: '👥' },
            { key: 'history', label: t.history, icon: '📋' },
          ].map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              style={{ padding: '9px 11px', border: 'none', background: 'transparent', color: activeTab === tab.key ? '#00e5ff' : '#4a5568', borderBottom: activeTab === tab.key ? '2px solid #00e5ff' : '2px solid transparent', fontSize: '9px', fontWeight: '700', cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', flexShrink: 0 }}>
              <span style={{ fontSize: '14px' }}>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: '132px 16px 20px' }}>

        {/* Quick status bar */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '14px' }}>
          <div style={{ background: 'linear-gradient(135deg,rgba(0,229,255,0.08),rgba(0,255,136,0.05))', border: '1px solid rgba(0,229,255,0.2)', borderRadius: '12px', padding: '10px 12px' }}>
            <div style={{ fontSize: '10px', fontWeight: '700', color: '#00e5ff', marginBottom: '2px' }}>{t.offerEnds}</div>
            <div style={{ fontSize: '18px', fontWeight: '900', color: '#00ff88' }}>{daysLeft} days</div>
          </div>
          <div onClick={() => !postedToday && (window.location.href = '/post')}
            style={{ background: postedToday ? 'rgba(0,255,136,0.06)' : 'rgba(255,165,0,0.08)', border: `1px solid ${postedToday ? 'rgba(0,255,136,0.2)' : 'rgba(255,165,0,0.25)'}`, borderRadius: '12px', padding: '10px 12px', cursor: postedToday ? 'default' : 'pointer' }}>
            <div style={{ fontSize: '10px', fontWeight: '700', color: postedToday ? '#00ff88' : '#ffa500', marginBottom: '2px' }}>Daily Post</div>
            <div style={{ fontSize: '13px', fontWeight: '800', color: postedToday ? '#00ff88' : '#ffa500' }}>{postedToday ? '✅ Done!' : '⚠️ Tap to post'}</div>
          </div>
        </div>

        {/* ── DASHBOARD ── */}
        {activeTab === 'dashboard' && (
          <div style={{ animation: 'fadeUp 0.3s ease' }}>
            {!account || account.total_invested === 0 ? (
              <div>
                <div style={{ background: 'linear-gradient(135deg,#0a1628,#001a2e)', border: '1px solid rgba(0,229,255,0.2)', borderRadius: '20px', padding: '24px', marginBottom: '16px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 50% 0%,rgba(0,229,255,0.1),transparent 60%)', pointerEvents: 'none' }} />
                  <div style={{ fontSize: '48px', marginBottom: '12px' }}>💎</div>
                  <div style={{ fontSize: '20px', fontWeight: '900', marginBottom: '8px' }}>Welcome to Echo Invest</div>
                  <div style={{ fontSize: '13px', color: '#4a5568', marginBottom: '20px', lineHeight: '1.7' }}>
                    Start with $100 USDT and earn daily returns.<br />
                    Your principal is 100% returned after 1 year.<br />
                    Hold $500+ to unlock the monthly salary program!
                  </div>
                  <button onClick={() => setActiveTab('deposit')}
                    style={{ padding: '14px 32px', background: 'linear-gradient(135deg,#00e5ff,#00ff88)', border: 'none', borderRadius: '14px', color: '#050810', fontSize: '15px', fontWeight: '900', cursor: 'pointer', boxShadow: '0 4px 20px rgba(0,229,255,0.3)' }}>
                    💰 {t.investNow}
                  </button>
                </div>
                <div style={{ background: '#111620', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', padding: '16px' }}>
                  <div style={{ fontSize: '13px', fontWeight: '800', marginBottom: '14px' }}>Why Trust Echo Invest?</div>
                  {[
                    { icon: '🔒', title: 'Secure Platform', desc: 'Every USDT transaction is blockchain-verified and traceable.' },
                    { icon: '💎', title: 'Principal Returned', desc: 'After 365 days, your full investment is returned automatically.' },
                    { icon: '📅', title: 'Regular Payouts', desc: 'Withdraw on 14th & 28th every month. No delays, no hidden fees.' },
                    { icon: '💼', title: 'Salary Program', desc: 'Refer 12+ investors with $500+ plan → earn $100-250/month salary.' },
                  ].map(f => (
                    <div key={f.title} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', marginBottom: '12px' }}>
                      <span style={{ fontSize: '22px', flexShrink: 0 }}>{f.icon}</span>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: '700', marginBottom: '2px' }}>{f.title}</div>
                        <div style={{ fontSize: '11px', color: '#4a5568', lineHeight: '1.5' }}>{f.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <>
                <div style={{ background: 'linear-gradient(135deg,#0a1628,#001830)', border: '1px solid rgba(0,229,255,0.2)', borderRadius: '20px', padding: '20px', marginBottom: '14px', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', top: '-30px', right: '-30px', width: '120px', height: '120px', background: 'radial-gradient(circle,rgba(0,229,255,0.1),transparent 70%)', borderRadius: '50%' }} />
                  <div style={{ fontSize: '11px', color: '#4a5568', fontWeight: '700', letterSpacing: '1px', marginBottom: '4px' }}>WALLET BALANCE</div>
                  <div style={{ fontSize: '38px', fontWeight: '900', color: '#00ff88', marginBottom: '4px' }}>${(account?.wallet_balance || 0).toFixed(2)}</div>
                  <div style={{ fontSize: '12px', color: '#4a5568' }}>Today: <span style={{ color: '#00ff88', fontWeight: '700' }}>${todayEarning.toFixed(4)}</span> · Expected/day: <span style={{ color: '#00e5ff', fontWeight: '700' }}>${totalDailyEarning.toFixed(4)}</span></div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '14px' }}>
                  {[
                    { label: t.totalInvested, value: `$${(account?.total_invested || 0).toFixed(2)}`, icon: '📈', color: '#00e5ff', bg: 'rgba(0,229,255,0.07)' },
                    { label: t.totalEarned, value: `$${(account?.total_earned || 0).toFixed(2)}`, icon: '⚡', color: '#ffa500', bg: 'rgba(255,165,0,0.07)' },
                    { label: t.totalWithdrawn, value: `$${(account?.total_withdrawn || 0).toFixed(2)}`, icon: '📤', color: '#ff4560', bg: 'rgba(255,69,96,0.07)' },
                    { label: 'Active Plans', value: activeInvestments.length, icon: '💎', color: '#00ff88', bg: 'rgba(0,255,136,0.07)' },
                  ].map(s => (
                    <div key={s.label} style={{ background: s.bg, border: `1px solid ${s.color}22`, borderRadius: '14px', padding: '12px' }}>
                      <div style={{ fontSize: '18px', marginBottom: '5px' }}>{s.icon}</div>
                      <div style={{ fontSize: '16px', fontWeight: '900', color: s.color }}>{s.value}</div>
                      <div style={{ fontSize: '10px', color: '#4a5568', marginTop: '2px' }}>{s.label}</div>
                    </div>
                  ))}
                </div>

                {activeInvestments.map(inv => {
                  const plan = getPlan(inv.amount_usd)
                  const daysIn = Math.floor((new Date() - new Date(inv.start_date)) / 86400000)
                  const progress = Math.min((daysIn / 365) * 100, 100)
                  const earned = daysIn * inv.amount_usd * inv.daily_rate / 100
                  return (
                    <div key={inv.id} style={{ background: 'linear-gradient(135deg,#0d1820,#111620)', border: `1px solid ${plan?.color || '#00e5ff'}33`, borderRadius: '16px', padding: '16px', marginBottom: '10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontSize: '24px' }}>{plan?.emoji}</span>
                          <div>
                            <div style={{ fontSize: '15px', fontWeight: '800', color: plan?.color }}>{plan?.label} Plan</div>
                            <div style={{ fontSize: '12px', color: '#4a5568' }}>${inv.amount_usd} · {inv.daily_rate}%{t.daily}</div>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '13px', fontWeight: '800', color: '#00ff88' }}>+${(inv.amount_usd * inv.daily_rate / 100).toFixed(4)}/day</div>
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px', marginBottom: '10px' }}>
                        {[{ label: 'Day', value: `${daysIn}/365` }, { label: 'Earned', value: `$${earned.toFixed(2)}` }, { label: 'Matures', value: new Date(inv.end_date).toLocaleDateString('en', { month: 'short', day: 'numeric' }) }].map(s => (
                          <div key={s.label} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '8px', padding: '6px', textAlign: 'center' }}>
                            <div style={{ fontSize: '12px', fontWeight: '800', color: '#eef2f7' }}>{s.value}</div>
                            <div style={{ fontSize: '9px', color: '#4a5568' }}>{s.label}</div>
                          </div>
                        ))}
                      </div>
                      <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '4px', height: '6px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${progress}%`, background: `linear-gradient(90deg,${plan?.color},#00ff88)`, borderRadius: '4px', transition: 'width 1s ease' }} />
                      </div>
                      <div style={{ fontSize: '10px', color: '#4a5568', marginTop: '4px', textAlign: 'right' }}>{progress.toFixed(1)}% complete</div>
                    </div>
                  )
                })}

                {/* Salary teaser on dashboard */}
                {hasGrowthPlus && (
                  <div onClick={() => setActiveTab('refer')}
                    style={{ background: 'linear-gradient(135deg,rgba(255,165,0,0.08),rgba(255,202,40,0.05))', border: '1px solid rgba(255,165,0,0.2)', borderRadius: '14px', padding: '14px 16px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: '800', color: '#ffa500' }}>💼 Salary Program</div>
                      <div style={{ fontSize: '11px', color: '#4a5568' }}>{referralCount}/12 valid referrals · {salaryLevel !== 'none' ? `$${salaryAmount}/month unlocked!` : `${12 - referralCount} more to unlock`}</div>
                    </div>
                    <div style={{ fontSize: '12px', color: '#ffa500' }}>View →</div>
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <button onClick={() => setActiveTab('deposit')} style={{ padding: '14px', background: 'rgba(0,229,255,0.08)', border: '1px solid rgba(0,229,255,0.2)', borderRadius: '14px', color: '#00e5ff', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>📥 New Deposit</button>
                  <button onClick={() => setActiveTab('withdraw')} style={{ padding: '14px', background: 'rgba(0,255,136,0.08)', border: '1px solid rgba(0,255,136,0.2)', borderRadius: '14px', color: '#00ff88', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>📤 Withdraw</button>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── PLANS ── */}
        {activeTab === 'invest' && (
          <div style={{ animation: 'fadeUp 0.3s ease' }}>
            {/* Calculator */}
            <div style={{ background: '#111620', border: '1px solid rgba(0,229,255,0.2)', borderRadius: '18px', padding: '18px', marginBottom: '16px' }}>
              <div style={{ fontSize: '14px', fontWeight: '800', marginBottom: '14px' }}>{t.calcTitle}</div>
              <input value={calcAmount} onChange={e => setCalcAmount(e.target.value)} type="number" placeholder="Enter amount ($)"
                style={{ width: '100%', background: '#0c1018', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '12px 14px', color: '#eef2f7', fontSize: '16px', outline: 'none', boxSizing: 'border-box', marginBottom: '12px', fontWeight: '700' }} />
              {calcAmt >= 100 && calcPlan ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                  {[
                    { label: 'Daily', value: `$${calcDaily.toFixed(2)}`, color: '#00e5ff' },
                    { label: 'Monthly', value: `$${(calcDaily * 30).toFixed(2)}`, color: '#00ff88' },
                    { label: 'Yearly', value: `$${(calcDaily * 365).toFixed(2)}`, color: '#ffa500' },
                  ].map(s => (
                    <div key={s.label} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '10px', padding: '10px', textAlign: 'center' }}>
                      <div style={{ fontSize: '15px', fontWeight: '900', color: s.color }}>{s.value}</div>
                      <div style={{ fontSize: '10px', color: '#4a5568' }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              ) : calcAmt > 0 && calcAmt < 100 ? (
                <div style={{ fontSize: '12px', color: '#ff4560', textAlign: 'center' }}>⚠️ Minimum deposit is $100</div>
              ) : (
                <div style={{ fontSize: '12px', color: '#4a5568', textAlign: 'center' }}>Enter amount to see projected earnings</div>
              )}
              {calcPlan && calcAmt >= 100 && <div style={{ marginTop: '10px', fontSize: '12px', color: calcPlan.color, textAlign: 'center', fontWeight: '700' }}>{calcPlan.emoji} {calcPlan.label} Plan — {calcPlan.rate}%{t.daily}</div>}
            </div>

            {PLANS.map((plan, idx) => (
              <div key={plan.label} style={{ background: 'linear-gradient(135deg,#0d1820,#111620)', border: `2px solid ${plan.color}${idx === 1 ? '88' : '33'}`, borderRadius: '20px', padding: '20px', marginBottom: '14px', position: 'relative', overflow: 'hidden' }}>
                {idx === 1 && <div style={{ position: 'absolute', top: '12px', right: '12px', background: 'linear-gradient(135deg,#00ff88,#00e5ff)', borderRadius: '20px', padding: '3px 10px', fontSize: '10px', fontWeight: '900', color: '#050810' }}>⭐ POPULAR</div>}
                {idx === 1 && <div style={{ position: 'absolute', bottom: '60px', right: '12px', background: 'rgba(255,165,0,0.15)', border: '1px solid rgba(255,165,0,0.3)', borderRadius: '20px', padding: '3px 10px', fontSize: '10px', fontWeight: '700', color: '#ffa500' }}>💼 Salary Eligible</div>}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                  <span style={{ fontSize: '32px' }}>{plan.emoji}</span>
                  <div>
                    <div style={{ fontSize: '20px', fontWeight: '900', color: plan.color }}>{plan.label}</div>
                    <div style={{ fontSize: '12px', color: '#4a5568' }}>${plan.min}{plan.max < 999999 ? ` – $${plan.max}` : '+'} USDT</div>
                  </div>
                  <div style={{ marginLeft: 'auto', background: `${plan.color}22`, border: `2px solid ${plan.color}44`, borderRadius: '14px', padding: '10px 16px', textAlign: 'center' }}>
                    <div style={{ fontSize: '26px', fontWeight: '900', color: plan.color }}>{plan.rate}%</div>
                    <div style={{ fontSize: '10px', color: '#4a5568' }}>{t.daily}</div>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '14px' }}>
                  {[{ label: 'Monthly', value: `~${plan.monthlyReturn}%` }, { label: 'Yearly', value: `~${plan.yearlyReturn}%` }, { label: 'Duration', value: t.duration }].map(s => (
                    <div key={s.label} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '10px', padding: '8px', textAlign: 'center' }}>
                      <div style={{ fontSize: '13px', fontWeight: '800', color: '#eef2f7' }}>{s.value}</div>
                      <div style={{ fontSize: '10px', color: '#4a5568' }}>{s.label}</div>
                    </div>
                  ))}
                </div>
                <div style={{ background: 'rgba(0,255,136,0.06)', border: '1px solid rgba(0,255,136,0.15)', borderRadius: '10px', padding: '10px', marginBottom: '14px', fontSize: '11px', color: '#4a5568', lineHeight: '1.8' }}>
                  ✅ Principal returned at maturity · 📝 Daily post required<br />
                  📅 Withdraw 14th & 28th · 💱 USDT TRC20 only
                  {idx >= 1 && <><br />💼 Eligible for $100-250/month salary program</>}
                </div>
                <button onClick={() => { setActiveTab('deposit'); setInvestAmount(String(plan.min)) }}
                  style={{ width: '100%', padding: '14px', background: `linear-gradient(135deg,${plan.color},#00ff88)`, border: 'none', borderRadius: '12px', color: '#050810', fontSize: '14px', fontWeight: '900', cursor: 'pointer', boxShadow: `0 4px 16px ${plan.color}30` }}>
                  {t.investNow} — Min ${plan.min}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ── DEPOSIT ── */}
        {activeTab === 'deposit' && (
          <div style={{ animation: 'fadeUp 0.3s ease' }}>
            <div style={{ background: 'rgba(255,165,0,0.06)', border: '1px solid rgba(255,165,0,0.2)', borderRadius: '12px', padding: '12px 14px', marginBottom: '14px', fontSize: '12px', color: '#ffa500', lineHeight: '1.6' }}>
              ⚠️ Minimum: <strong>$100 USDT</strong> · TRC20 network only. Wrong network = funds lost permanently.
            </div>

            <div style={{ background: '#111620', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '20px', padding: '20px', marginBottom: '14px' }}>
              <div style={{ fontSize: '15px', fontWeight: '800', marginBottom: '14px' }}>{t.depositTitle}</div>

              {/* USDT Address box */}
              <div style={{ background: 'linear-gradient(135deg,rgba(0,229,255,0.06),rgba(0,255,136,0.04))', border: '1px solid rgba(0,229,255,0.2)', borderRadius: '14px', padding: '16px', marginBottom: '16px' }}>
                <div style={{ fontSize: '11px', color: '#4a5568', marginBottom: '8px', fontWeight: '700', letterSpacing: '1px' }}>USDT TRC20 DEPOSIT ADDRESS</div>
                <div style={{ fontSize: '11px', color: '#00e5ff', wordBreak: 'break-all', marginBottom: '12px', fontFamily: 'monospace', background: '#0c1018', borderRadius: '8px', padding: '10px', lineHeight: '1.6' }}>{USDT_ADDRESS}</div>
                <button onClick={() => { navigator.clipboard?.writeText(USDT_ADDRESS); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
                  style={{ padding: '10px 18px', background: copied ? 'rgba(0,255,136,0.15)' : 'rgba(0,229,255,0.1)', border: `1px solid ${copied ? '#00ff88' : '#00e5ff'}44`, borderRadius: '10px', color: copied ? '#00ff88' : '#00e5ff', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>
                  {copied ? '✓ Copied!' : t.copyAddr}
                </button>
              </div>

              {/* Amount */}
              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '12px', color: '#4a5568', marginBottom: '6px', fontWeight: '600' }}>Amount (USD) — Min $100</div>
                <input value={investAmount} onChange={e => setInvestAmount(e.target.value)} type="number" placeholder="e.g. 100"
                  style={{ width: '100%', background: '#0c1018', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '12px 14px', color: '#eef2f7', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
                {investAmount && parseFloat(investAmount) < MIN_DEPOSIT && <div style={{ fontSize: '11px', color: '#ff4560', marginTop: '4px' }}>⚠️ Minimum is $100</div>}
                {investAmount && parseFloat(investAmount) >= MIN_DEPOSIT && getPlan(parseFloat(investAmount)) && (
                  <div style={{ fontSize: '11px', color: '#00ff88', marginTop: '4px' }}>✓ {getPlan(parseFloat(investAmount))?.emoji} {getPlan(parseFloat(investAmount))?.label} Plan — {getPlan(parseFloat(investAmount))?.rate}%{t.daily}</div>
                )}
              </div>

              {/* TX ID */}
              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '12px', color: '#4a5568', marginBottom: '6px', fontWeight: '600' }}>{t.txid} *</div>
                <input value={txid} onChange={e => setTxid(e.target.value)} placeholder="Transaction hash / TX ID"
                  style={{ width: '100%', background: '#0c1018', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '12px 14px', color: '#eef2f7', fontSize: '13px', outline: 'none', boxSizing: 'border-box', fontFamily: 'monospace' }} />
              </div>

              {/* Screenshot upload */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '12px', color: '#4a5568', marginBottom: '6px', fontWeight: '600' }}>📸 Payment Screenshot (optional but recommended)</div>
                {screenshotPreview ? (
                  <div style={{ position: 'relative', marginBottom: '8px' }}>
                    <img src={screenshotPreview} alt="screenshot" style={{ width: '100%', maxHeight: '220px', objectFit: 'cover', borderRadius: '12px', border: '1px solid rgba(0,229,255,0.2)' }} />
                    <button onClick={() => { setScreenshotFile(null); setScreenshotPreview('') }}
                      style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(0,0,0,0.7)', border: 'none', borderRadius: '50%', width: '28px', height: '28px', color: '#fff', fontSize: '14px', cursor: 'pointer' }}>✕</button>
                    {uploadingImg && (
                      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#00e5ff', fontSize: '14px', fontWeight: '700' }}>
                        <span style={{ animation: 'spin 1s linear infinite', marginRight: '6px' }}>⏳</span> Uploading...
                      </div>
                    )}
                  </div>
                ) : (
                  <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', background: '#0c1018', border: '2px dashed rgba(0,229,255,0.2)', borderRadius: '12px', padding: '24px', cursor: 'pointer' }}>
                    <span style={{ fontSize: '32px' }}>📸</span>
                    <span style={{ fontSize: '13px', color: '#4a5568', fontWeight: '600' }}>Tap to upload screenshot</span>
                    <span style={{ fontSize: '11px', color: '#2a3040' }}>JPG · PNG supported</span>
                    <input type="file" accept="image/*" style={{ display: 'none' }}
                      onChange={e => {
                        const file = e.target.files?.[0]
                        if (!file) return
                        setScreenshotFile(file)
                        const reader = new FileReader()
                        reader.onload = ev => setScreenshotPreview(ev.target.result)
                        reader.readAsDataURL(file)
                      }} />
                  </label>
                )}
              </div>

              <button onClick={submitDeposit} disabled={!txid.trim() || submitting}
                style={{ width: '100%', padding: '15px', background: txid.trim() ? 'linear-gradient(135deg,#00e5ff,#00ff88)' : 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '14px', color: txid.trim() ? '#050810' : '#4a5568', fontSize: '15px', fontWeight: '900', cursor: txid.trim() ? 'pointer' : 'default', boxShadow: txid.trim() ? '0 4px 20px rgba(0,229,255,0.25)' : 'none' }}>
                {submitting ? '⏳ Submitting...' : `📥 ${t.submitDeposit}`}
              </button>
            </div>

            {deposits.length > 0 && (
              <div>
                <div style={{ fontSize: '12px', color: '#4a5568', fontWeight: '700', letterSpacing: '1px', marginBottom: '8px' }}>DEPOSIT HISTORY</div>
                {deposits.map(d => (
                  <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#111620', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '12px 14px', marginBottom: '8px' }}>
                    <div>
                      <div style={{ fontSize: '15px', fontWeight: '800' }}>${d.amount_usd}</div>
                      <div style={{ fontSize: '10px', color: '#4a5568', fontFamily: 'monospace' }}>{d.txid?.slice(0, 22)}...</div>
                      <div style={{ fontSize: '10px', color: '#4a5568' }}>{new Date(d.requested_at).toLocaleDateString()}</div>
                    </div>
                    <div style={{ fontSize: '12px', fontWeight: '700', padding: '5px 12px', borderRadius: '20px', background: d.status === 'approved' ? 'rgba(0,255,136,0.1)' : d.status === 'rejected' ? 'rgba(255,69,96,0.1)' : 'rgba(255,165,0,0.1)', color: d.status === 'approved' ? '#00ff88' : d.status === 'rejected' ? '#ff4560' : '#ffa500' }}>
                      {t[d.status] || d.status}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── WITHDRAW ── */}
        {activeTab === 'withdraw' && (
          <div style={{ animation: 'fadeUp 0.3s ease' }}>
            <div style={{ background: 'rgba(255,165,0,0.06)', border: '1px solid rgba(255,165,0,0.2)', borderRadius: '14px', padding: '14px', marginBottom: '14px' }}>
              <div style={{ fontSize: '13px', fontWeight: '700', color: '#ffa500', marginBottom: '2px' }}>📅 {t.withdrawNote}</div>
              <div style={{ fontSize: '11px', color: '#4a5568' }}>Available balance: <span style={{ color: '#00ff88', fontWeight: '700' }}>${(account?.wallet_balance || 0).toFixed(2)}</span></div>
            </div>

            <div style={{ background: '#111620', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '20px', padding: '20px', marginBottom: '14px' }}>
              <div style={{ fontSize: '22px', fontWeight: '900', color: '#00ff88', marginBottom: '16px' }}>${(account?.wallet_balance || 0).toFixed(2)} available</div>

              {/* Saved address */}
              {savedUsdtAddr && (
                <div style={{ background: 'rgba(0,255,136,0.06)', border: '1px solid rgba(0,255,136,0.15)', borderRadius: '10px', padding: '10px 12px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '10px', color: '#4a5568', marginBottom: '2px', fontWeight: '700' }}>{t.savedAddr}</div>
                    <div style={{ fontSize: '11px', color: '#00ff88', fontFamily: 'monospace' }}>{savedUsdtAddr.slice(0, 24)}...</div>
                  </div>
                  <button onClick={() => setUsdtAddr(savedUsdtAddr)}
                    style={{ padding: '5px 12px', background: 'rgba(0,255,136,0.1)', border: '1px solid rgba(0,255,136,0.2)', borderRadius: '8px', color: '#00ff88', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}>
                    Use ✓
                  </button>
                </div>
              )}

              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '12px', color: '#4a5568', marginBottom: '6px', fontWeight: '600' }}>{t.usdtAddr}</div>
                <input value={usdtAddr} onChange={e => setUsdtAddr(e.target.value)} placeholder="TRC20 address..."
                  style={{ width: '100%', background: '#0c1018', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '12px 14px', color: '#eef2f7', fontSize: '13px', outline: 'none', boxSizing: 'border-box', fontFamily: 'monospace' }} />
                {usdtAddr && usdtAddr !== savedUsdtAddr && (
                  <button onClick={async () => {
                    await supabase.from('investment_accounts').update({ usdt_address: usdtAddr }).eq('user_id', user.id)
                    setSavedUsdtAddr(usdtAddr); alert('✅ Address saved!')
                  }} style={{ marginTop: '6px', padding: '6px 14px', background: 'rgba(0,229,255,0.08)', border: '1px solid rgba(0,229,255,0.2)', borderRadius: '8px', color: '#00e5ff', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}>
                    {t.saveAddr}
                  </button>
                )}
              </div>

              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '12px', color: '#4a5568', marginBottom: '6px', fontWeight: '600' }}>{t.amount}</div>
                <input value={withdrawAmount} onChange={e => setWithdrawAmount(e.target.value)} type="number" placeholder="0.00"
                  style={{ width: '100%', background: '#0c1018', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '12px 14px', color: '#eef2f7', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
                {withdrawAmount && (
                  <div style={{ fontSize: '11px', color: parseFloat(withdrawAmount) > (account?.wallet_balance || 0) ? '#ff4560' : '#00ff88', marginTop: '4px' }}>
                    {parseFloat(withdrawAmount) > (account?.wallet_balance || 0) ? '⚠️ Insufficient balance' : '✓ Valid amount'}
                  </div>
                )}
              </div>

              <button onClick={submitWithdraw} disabled={!usdtAddr.trim() || !withdrawAmount || submitting}
                style={{ width: '100%', padding: '14px', background: usdtAddr.trim() && withdrawAmount ? 'linear-gradient(135deg,#ffa500,#ff4560)' : 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '14px', color: usdtAddr.trim() && withdrawAmount ? '#fff' : '#4a5568', fontSize: '15px', fontWeight: '900', cursor: 'pointer' }}>
                {submitting ? '⏳' : `📤 ${t.submitWithdraw}`}
              </button>
            </div>

            {withdrawals.length > 0 && (
              <div>
                <div style={{ fontSize: '12px', color: '#4a5568', fontWeight: '700', letterSpacing: '1px', marginBottom: '8px' }}>WITHDRAWAL HISTORY</div>
                {withdrawals.map(w => (
                  <div key={w.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#111620', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '12px 14px', marginBottom: '8px' }}>
                    <div>
                      <div style={{ fontSize: '15px', fontWeight: '800' }}>${w.amount}</div>
                      <div style={{ fontSize: '10px', color: '#4a5568', fontFamily: 'monospace' }}>{w.usdt_address?.slice(0, 18)}...</div>
                      <div style={{ fontSize: '10px', color: '#4a5568' }}>{new Date(w.requested_at).toLocaleDateString()}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: '700', padding: '5px 12px', borderRadius: '20px', background: w.status === 'approved' ? 'rgba(0,255,136,0.1)' : w.status === 'rejected' ? 'rgba(255,69,96,0.1)' : 'rgba(255,165,0,0.1)', color: w.status === 'approved' ? '#00ff88' : w.status === 'rejected' ? '#ff4560' : '#ffa500' }}>
                        {t[w.status] || w.status}
                      </div>
                      {w.admin_note && <div style={{ fontSize: '10px', color: '#4a5568', marginTop: '4px' }}>{w.admin_note}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── REFER & EARN ── */}
        {activeTab === 'refer' && (
          <div style={{ animation: 'fadeUp 0.3s ease' }}>

            {/* Referral link */}
            <div style={{ background: 'linear-gradient(135deg,#0a1628,#001a2e)', border: '1px solid rgba(0,229,255,0.2)', borderRadius: '20px', padding: '20px', marginBottom: '14px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 50% 0%,rgba(0,229,255,0.08),transparent 60%)', pointerEvents: 'none' }} />
              <div style={{ fontSize: '36px', marginBottom: '8px' }}>👥</div>
              <div style={{ fontSize: '17px', fontWeight: '900', marginBottom: '8px' }}>{t.referTitle}</div>
              <div style={{ fontSize: '12px', color: '#4a5568', marginBottom: '4px' }}>{t.level1}</div>
              <div style={{ fontSize: '12px', color: '#4a5568', marginBottom: '16px' }}>{t.level2}</div>
              <div style={{ background: '#0c1018', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '10px', marginBottom: '10px', wordBreak: 'break-all', fontSize: '11px', color: '#00e5ff', fontFamily: 'monospace', textAlign: 'left' }}>
                {typeof window !== 'undefined' ? `${window.location.origin}/invest?ref=${user?.id}` : ''}
              </div>
              <button onClick={copyReferral}
                style={{ width: '100%', padding: '13px', background: copied ? 'rgba(0,255,136,0.1)' : 'linear-gradient(135deg,#00e5ff,#00ff88)', border: copied ? '1px solid #00ff88' : 'none', borderRadius: '13px', color: copied ? '#00ff88' : '#050810', fontSize: '14px', fontWeight: '900', cursor: 'pointer' }}>
                {copied ? '✓ Copied!' : '📋 Copy Referral Link'}
              </button>
            </div>

            {/* Referral stats */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
              {[
                { label: 'Level 1 Earned', value: `$${referrals.filter(r => r.level === 1).reduce((s, r) => s + r.amount, 0).toFixed(2)}`, color: '#00e5ff', icon: '🥇' },
                { label: 'Level 2 Earned', value: `$${referrals.filter(r => r.level === 2).reduce((s, r) => s + r.amount, 0).toFixed(2)}`, color: '#00ff88', icon: '🥈' },
              ].map(s => (
                <div key={s.label} style={{ background: '#111620', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '14px', padding: '14px', textAlign: 'center' }}>
                  <div style={{ fontSize: '22px', marginBottom: '4px' }}>{s.icon}</div>
                  <div style={{ fontSize: '18px', fontWeight: '900', color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: '10px', color: '#4a5568', marginTop: '3px' }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* ── SALARY PROGRAM ── */}
            <div style={{ background: 'linear-gradient(135deg,#0d1a10,#0a1628)', border: '1px solid rgba(255,165,0,0.25)', borderRadius: '20px', padding: '20px', marginBottom: '14px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '100px', height: '100px', background: 'radial-gradient(circle,rgba(255,165,0,0.08),transparent 70%)', borderRadius: '50%' }} />
              <div style={{ fontSize: '16px', fontWeight: '900', marginBottom: '4px', color: '#ffa500' }}>{t.salaryTitle}</div>
              <div style={{ fontSize: '12px', color: '#4a5568', marginBottom: '16px' }}>{t.salaryDesc}</div>

              {/* Salary tiers */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
                {[
                  { icon: '🥈', amount: '$100', label: 'Silver', desc: '12 valid referrals', refs: 12, color: '#00e5ff', unlocked: referralCount >= 12 && hasGrowthPlus },
                  { icon: '🥇', amount: '$250', label: 'Gold', desc: '25 valid referrals', refs: 25, color: '#ffa500', unlocked: referralCount >= 25 && hasGrowthPlus },
                ].map(tier => (
                  <div key={tier.label} style={{ background: tier.unlocked ? `rgba(${tier.color === '#ffa500' ? '255,165,0' : '0,229,255'},0.08)` : 'rgba(255,255,255,0.03)', border: `1px solid ${tier.unlocked ? tier.color + '44' : 'rgba(255,255,255,0.08)'}`, borderRadius: '14px', padding: '14px', textAlign: 'center', position: 'relative' }}>
                    {tier.unlocked && <div style={{ position: 'absolute', top: '-8px', left: '50%', transform: 'translateX(-50%)', background: tier.color, borderRadius: '20px', padding: '2px 10px', fontSize: '9px', fontWeight: '900', color: '#050810', whiteSpace: 'nowrap' }}>UNLOCKED</div>}
                    <div style={{ fontSize: '26px', marginBottom: '4px' }}>{tier.icon}</div>
                    <div style={{ fontSize: '20px', fontWeight: '900', color: tier.color }}>{tier.amount}</div>
                    <div style={{ fontSize: '9px', color: '#4a5568', marginBottom: '4px' }}>per month</div>
                    <div style={{ fontSize: '11px', color: '#8892a4', fontWeight: '700' }}>{tier.desc}</div>
                  </div>
                ))}
              </div>

              {/* Progress */}
              <div style={{ marginBottom: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontSize: '12px', color: '#8892a4' }}>Valid Referrals</span>
                  <span style={{ fontSize: '12px', fontWeight: '800', color: referralCount >= 25 ? '#ffa500' : referralCount >= 12 ? '#00e5ff' : '#00ff88' }}>{referralCount} / 25</span>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '6px', height: '10px', overflow: 'hidden', position: 'relative' }}>
                  <div style={{ height: '100%', width: `${Math.min((referralCount / 25) * 100, 100)}%`, background: referralCount >= 25 ? 'linear-gradient(90deg,#ffa500,#ffca28)' : referralCount >= 12 ? 'linear-gradient(90deg,#00e5ff,#00ff88)' : 'linear-gradient(90deg,#00e5ff,#00ff88)', borderRadius: '6px', transition: 'width 1s ease' }} />
                  {/* Milestone markers */}
                  <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${(12 / 25) * 100}%`, width: '2px', background: 'rgba(0,229,255,0.5)' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '10px', color: '#4a5568' }}>
                  <span>0</span>
                  <span style={{ color: referralCount >= 12 ? '#00e5ff' : '#4a5568' }}>12 🥈</span>
                  <span style={{ color: referralCount >= 25 ? '#ffa500' : '#4a5568' }}>25 🥇</span>
                </div>
              </div>

              {/* Requirements */}
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '12px', marginBottom: '14px', fontSize: '11px', color: '#4a5568', lineHeight: '1.9' }}>
                <div style={{ fontSize: '12px', fontWeight: '700', color: '#8892a4', marginBottom: '6px' }}>📋 Eligibility Requirements</div>
                <div style={{ color: hasGrowthPlus ? '#00ff88' : '#ff4560' }}>{hasGrowthPlus ? '✅' : '❌'} {t.salaryReq1}</div>
                <div style={{ color: referralCount >= 12 ? '#00ff88' : '#4a5568' }}>{referralCount >= 12 ? '✅' : `⏳ ${referralCount}/12`} {t.salaryReq2}</div>
                <div>{t.salaryReq3}</div>
              </div>

              {/* Already applied this month */}
              {thisMonthSalary ? (
                <div style={{ background: thisMonthSalary.status === 'approved' ? 'rgba(0,255,136,0.08)' : thisMonthSalary.status === 'rejected' ? 'rgba(255,69,96,0.08)' : 'rgba(255,165,0,0.08)', border: `1px solid ${thisMonthSalary.status === 'approved' ? 'rgba(0,255,136,0.2)' : thisMonthSalary.status === 'rejected' ? 'rgba(255,69,96,0.2)' : 'rgba(255,165,0,0.2)'}`, borderRadius: '12px', padding: '12px', textAlign: 'center' }}>
                  <div style={{ fontSize: '14px', fontWeight: '800', color: thisMonthSalary.status === 'approved' ? '#00ff88' : thisMonthSalary.status === 'rejected' ? '#ff4560' : '#ffa500' }}>
                    {thisMonthSalary.status === 'approved' ? '✅ Salary Approved!' : thisMonthSalary.status === 'rejected' ? '❌ Application Rejected' : '⏳ Application Under Review'}
                  </div>
                  <div style={{ fontSize: '11px', color: '#4a5568', marginTop: '4px' }}>
                    {thisMonthSalary.status === 'approved' ? `$${thisMonthSalary.amount} has been added to your wallet` : thisMonthSalary.status === 'pending' ? 'Admin will verify within 48 hours' : thisMonthSalary.admin_note || 'Contact admin for details'}
                  </div>
                </div>
              ) : salaryLevel !== 'none' ? (
                !showSalaryApply ? (
                  <button onClick={() => setShowSalaryApply(true)}
                    style={{ width: '100%', padding: '14px', background: 'linear-gradient(135deg,#ffa500,#ffca28)', border: 'none', borderRadius: '14px', color: '#050810', fontSize: '15px', fontWeight: '900', cursor: 'pointer', boxShadow: '0 4px 16px rgba(255,165,0,0.3)' }}>
                    {t.applyBtn} — ${salaryAmount}/month
                  </button>
                ) : (
                  <div>
                    <div style={{ fontSize: '12px', color: '#8892a4', marginBottom: '8px' }}>Add a note (optional):</div>
                    <textarea value={salaryNote} onChange={e => setSalaryNote(e.target.value)} placeholder="Any message for admin..."
                      style={{ width: '100%', background: '#0c1018', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '10px 12px', color: '#eef2f7', fontSize: '13px', outline: 'none', resize: 'none', boxSizing: 'border-box', marginBottom: '10px' }} rows={3} />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <button onClick={() => setShowSalaryApply(false)}
                        style={{ padding: '12px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#4a5568', fontSize: '13px', cursor: 'pointer' }}>Cancel</button>
                      <button onClick={applySalary} disabled={salaryApplying}
                        style={{ padding: '12px', background: 'linear-gradient(135deg,#ffa500,#ffca28)', border: 'none', borderRadius: '12px', color: '#050810', fontSize: '13px', fontWeight: '800', cursor: 'pointer' }}>
                        {salaryApplying ? '⏳' : `Submit — $${salaryAmount}`}
                      </button>
                    </div>
                  </div>
                )
              ) : (
                <div style={{ fontSize: '12px', color: '#4a5568', textAlign: 'center', lineHeight: '1.6', padding: '10px' }}>
                  {!hasGrowthPlus
                    ? '⚠️ Deposit $500+ (Growth plan) to unlock salary program'
                    : `Need ${Math.max(12 - referralCount, 0)} more valid referrals for $100/month salary`}
                </div>
              )}

              {/* Salary history */}
              {salaries.filter(s => s.month !== currentMonth).length > 0 && (
                <div style={{ marginTop: '14px' }}>
                  <div style={{ fontSize: '11px', color: '#4a5568', fontWeight: '700', letterSpacing: '1px', marginBottom: '8px' }}>SALARY HISTORY</div>
                  {salaries.filter(s => s.month !== currentMonth).map(s => (
                    <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '10px', padding: '10px 12px', marginBottom: '6px' }}>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: '700', color: '#ffa500' }}>${s.amount}/mo</div>
                        <div style={{ fontSize: '10px', color: '#4a5568' }}>{s.month} · {s.level}</div>
                      </div>
                      <div style={{ fontSize: '11px', fontWeight: '700', padding: '3px 10px', borderRadius: '8px', alignSelf: 'center', background: s.status === 'approved' ? 'rgba(0,255,136,0.1)' : s.status === 'rejected' ? 'rgba(255,69,96,0.1)' : 'rgba(255,165,0,0.1)', color: s.status === 'approved' ? '#00ff88' : s.status === 'rejected' ? '#ff4560' : '#ffa500' }}>
                        {s.status}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {referrals.slice(0, 10).map(r => (
              <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', background: '#111620', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '10px 14px', marginBottom: '6px' }}>
                <div style={{ fontSize: '12px', color: '#8892a4' }}>Level {r.level} · {new Date(r.created_at).toLocaleDateString()}</div>
                <div style={{ fontSize: '13px', fontWeight: '700', color: '#00ff88' }}>+${r.amount.toFixed(4)}</div>
              </div>
            ))}
          </div>
        )}

        {/* ── HISTORY ── */}
        {activeTab === 'history' && (
          <div style={{ animation: 'fadeUp 0.3s ease' }}>
            <div style={{ background: 'linear-gradient(135deg,rgba(0,229,255,0.06),rgba(0,255,136,0.04))', border: '1px solid rgba(0,229,255,0.15)', borderRadius: '14px', padding: '14px', marginBottom: '14px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
              {[
                { label: 'Total Days', value: earnings.filter(e => e.type === 'daily').length, color: '#00e5ff' },
                { label: 'Total Earned', value: `$${earnings.reduce((s, e) => s + e.amount, 0).toFixed(2)}`, color: '#00ff88' },
                { label: 'Avg/Day', value: earnings.length > 0 ? `$${(earnings.reduce((s, e) => s + e.amount, 0) / earnings.length).toFixed(2)}` : '$0', color: '#ffa500' },
              ].map(s => (
                <div key={s.label} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '15px', fontWeight: '900', color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: '10px', color: '#4a5568' }}>{s.label}</div>
                </div>
              ))}
            </div>

            <div style={{ fontSize: '12px', color: '#4a5568', fontWeight: '700', letterSpacing: '1px', marginBottom: '10px' }}>EARNINGS LOG</div>
            {earnings.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#4a5568' }}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>📋</div>
                <div>No earnings yet. Make a deposit to start!</div>
              </div>
            ) : earnings.map(e => (
              <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', background: '#111620', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '12px 14px', marginBottom: '6px' }}>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: '700', color: e.type === 'admin_adjustment' ? '#ffa500' : e.type === 'salary' ? '#ffca28' : '#8892a4', textTransform: 'uppercase' }}>
                    {e.type === 'admin_adjustment' ? '⚡ Adjustment' : e.type === 'salary' ? '💼 Salary' : '📈 Daily Return'}
                  </div>
                  <div style={{ fontSize: '11px', color: '#4a5568' }}>{e.date}</div>
                </div>
                <div style={{ fontSize: '15px', fontWeight: '800', color: e.amount >= 0 ? '#00ff88' : '#ff4560' }}>
                  {e.amount >= 0 ? '+' : ''}${e.amount.toFixed(4)}
                </div>
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
