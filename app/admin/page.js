'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const ADMIN_EMAIL = 'mdakibgoodboy4@gmail.com'

/* ─────────────────────────────────────────────
   sendSystemNotif — from_user_id: null
   এতে user এর notification এ কোনো profile ছবি
   দেখাবে না, শুধু "Echo World" ব্র্যান্ডিং দেখাবে
───────────────────────────────────────────── */
async function sendSystemNotif(userId, message) {
  await supabase.from('notifications').insert({
    user_id: userId,
    from_user_id: null,          // ← NULL = system, কোনো profile দেখাবে না
    type: 'system',
    message: `🌐 Echo World: ${message}`,
    read: false,
  })
}

const timeAgo = (d) => {
  const s = Math.floor((Date.now() - new Date(d)) / 1000)
  if (s < 60) return 'এইমাত্র'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

const StatusPill = ({ status }) => {
  const m = {
    approved: ['#00ff88', 'rgba(0,255,136,0.12)', '✅ Approved'],
    rejected: ['#ff4560', 'rgba(255,69,96,0.12)', '❌ Rejected'],
    pending:  ['#ffa500', 'rgba(255,165,0,0.12)',  '⏳ Pending'],
    active:   ['#00ff88', 'rgba(0,255,136,0.12)', '🟢 Active'],
    blocked:  ['#ff4560', 'rgba(255,69,96,0.12)', '🚫 Blocked'],
    silver:   ['#00e5ff', 'rgba(0,229,255,0.12)', '🥈 Silver'],
    gold:     ['#ffa500', 'rgba(255,165,0,0.12)', '🥇 Gold'],
  }
  const [c, bg, label] = m[status] || m.pending
  return <span style={{ color: c, background: bg, fontSize: '10px', fontWeight: '700', padding: '3px 10px', borderRadius: '20px', whiteSpace: 'nowrap' }}>{label}</span>
}

// 2FA Badge — shows status and reset button
const TwoFABadge = ({ userId, onReset, username }) => {
  const [enabled, setEnabled] = useState(null)
  useEffect(() => {
    supabase.from('investment_accounts').select('totp_enabled').eq('user_id', userId).single()
      .then(({ data }) => setEnabled(data?.totp_enabled || false))
  }, [userId])
  if (enabled === null) return null
  if (!enabled) return <span style={{ fontSize:'10px', color:'#4a5568', padding:'4px 8px', borderRadius:'6px', background:'rgba(255,255,255,0.04)' }}>No 2FA</span>
  return (
    <button onClick={() => onReset(userId, username)}
      style={{ padding:'5px 10px', borderRadius:'8px', border:'none', cursor:'pointer', fontSize:'11px', fontWeight:'600', background:'rgba(0,255,136,0.1)', color:'#00ff88' }}>
      🛡️ Reset 2FA
    </button>
  )
}

const Card = ({ children, accent, style = {} }) => (
  <div style={{ background: '#111826', border: `1px solid ${accent || 'rgba(255,255,255,0.07)'}`, borderRadius: '16px', padding: '16px', ...style }}>
    {children}
  </div>
)

const Stat = ({ icon, label, value, color = '#00e5ff', onClick }) => (
  <div onClick={onClick} style={{ background: '#111826', border: `1px solid ${color}18`, borderRadius: '14px', padding: '14px 12px', textAlign: 'center', cursor: onClick ? 'pointer' : 'default', transition: 'border 0.2s' }}>
    <div style={{ fontSize: '22px', marginBottom: '5px' }}>{icon}</div>
    <div style={{ fontSize: '22px', fontWeight: '900', color }}>{value}</div>
    <div style={{ fontSize: '10px', color: '#4a5568', marginTop: '2px', fontWeight: '600' }}>{label}</div>
  </div>
)

/* ── tiny Tag ── */
const Tag = ({ children, color = '#4a5568' }) => (
  <span style={{ fontSize: '9px', fontWeight: '700', padding: '2px 7px', borderRadius: '8px', background: `${color}18`, color, border: `1px solid ${color}30`, marginLeft: '4px' }}>{children}</span>
)

export default function AdminPage() {
  const [user, setUser]           = useState(null)
  const [authorized, setAuth]     = useState(false)
  const [loading, setLoading]     = useState(true)
  const [tab, setTab]             = useState('dashboard')
  const [investTab, setInvestTab] = useState('deposits')

  /* stats */
  const [stats, setStats] = useState({})

  /* users/posts */
  const [users, setUsers]         = useState([])
  const [userSearch, setUserSearch] = useState('')
  const [posts, setPosts]         = useState([])

  /* invest */
  const [deposits,     setDeposits]     = useState([])
  const [withdrawals,  setWithdrawals]  = useState([])
  const [investAccs,   setInvestAccs]   = useState([])
  const [salaries,     setSalaries]     = useState([])
  const [resetReqs,    setResetReqs]    = useState([])
  const [dupGroups,    setDupGroups]    = useState([])

  /* selected account panel */
  const [selAcc,       setSelAcc]       = useState(null)
  const [selInvs,      setSelInvs]      = useState([])
  const [selEarns,     setSelEarns]     = useState([])
  const [adjAmt,       setAdjAmt]       = useState('')
  const [adjType,      setAdjType]      = useState('add')
  const [newPin,       setNewPin]       = useState('')

  /* announce */
  const [announce,     setAnnounce]     = useState('')

  /* referral & platform */
  const [commRates,    setCommRates]    = useState({ l1: 50, l2: 25 })
  const [manualRefUid, setManualRefUid] = useState('')
  const [manualRefAmt, setManualRefAmt] = useState('')
  const [platformStats, setPlatformStats] = useState({})
  const [refTab,       setRefTab]       = useState('commission')

  /* ── init ── */
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { window.location.href = '/'; return }
      const u = data.session.user
      setUser(u)
      if (u.email !== ADMIN_EMAIL) { setLoading(false); return }
      setAuth(true)
      await refreshStats()
      await loadCommRates()
      setLoading(false)
    })
  }, [])

  /* ── stats ── */
  const refreshStats = async () => {
    const [
      { count: c1 }, { count: c2 }, { count: c3 }, { count: c4 },
      { count: c5 }, { count: c6 }, { count: c7 },
    ] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('posts').select('*', { count: 'exact', head: true }),
      supabase.from('profiles').select('*', { count: 'exact', head: true })
        .gte('created_at', new Date(Date.now() - 86400000).toISOString()),
      supabase.from('deposit_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('withdrawal_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('salary_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('investment_accounts').select('*', { count: 'exact', head: true }),
    ])
    setStats({ users: c1, posts: c2, todayUsers: c3, pDep: c4, pWd: c5, pSal: c6, investors: c7 })
    // Platform financial stats
    const { data: finData } = await supabase.from('investment_accounts').select('total_invested, total_earned, total_withdrawn, wallet_balance')
    if (finData) {
      const totals = finData.reduce((acc, r) => ({
        invested:  acc.invested  + (r.total_invested  || 0),
        earned:    acc.earned    + (r.total_earned    || 0),
        withdrawn: acc.withdrawn + (r.total_withdrawn || 0),
        wallet:    acc.wallet    + (r.wallet_balance  || 0),
      }), { invested: 0, earned: 0, withdrawn: 0, wallet: 0 })
      setPlatformStats(totals)
    }
  }

  /* ── users ── */
  const loadUsers = async () => {
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(300)
    setUsers(data || [])
  }

  const reset2FA = async (userId, username) => {
    if (!confirm(`Reset 2FA for @${username}? They will need to re-setup Google Authenticator.`)) return
    await supabase.from('investment_accounts')
      .update({ totp_enabled: false, totp_secret: null })
      .eq('user_id', userId)
    await supabase.from('notifications').insert({
      user_id: userId, from_user_id: null, type: 'system',
      message: '🔐 Echo World: আপনার 2FA reset করা হয়েছে। Security settings থেকে পুনরায় setup করুন।',
      read: false,
    })
    alert(`✅ 2FA reset for @${username}`)
    loadUsers()
  }

  /* ── posts ── */
  const loadPosts = async () => {
    const { data } = await supabase.from('posts')
      .select('*, profiles(username, full_name)')
      .order('created_at', { ascending: false }).limit(60)
    setPosts(data || [])
  }

  /* ── commission rates ── */
  const loadCommRates = async () => {
    const { data } = await supabase.from('platform_settings').select('key, value').in('key', ['referral_l1_rate', 'referral_l2_rate'])
    if (data) {
      const l1 = data.find(r => r.key === 'referral_l1_rate')
      const l2 = data.find(r => r.key === 'referral_l2_rate')
      setCommRates({ l1: parseFloat(l1?.value || 50), l2: parseFloat(l2?.value || 25) })
    }
  }

  const saveCommRates = async () => {
    await supabase.from('platform_settings').upsert([
      { key: 'referral_l1_rate', value: String(commRates.l1) },
      { key: 'referral_l2_rate', value: String(commRates.l2) },
    ])
    alert(`✅ Saved! L1=${commRates.l1}%, L2=${commRates.l2}%\nএখন থেকে নতুন daily earnings এ এই rate apply হবে।`)
  }

  /* ── invest ── */
  const loadInvest = useCallback(async () => {
    const [
      { data: deps },
      { data: wds },
      { data: accs },
      { data: sals },
      { data: rsts },
    ] = await Promise.all([
      supabase.from('deposit_requests')
        .select('*, profiles!deposit_requests_user_id_fkey(id,username,full_name)')
        .order('requested_at', { ascending: false }),
      supabase.from('withdrawal_requests')
        .select('*, profiles!withdrawal_requests_user_id_fkey(id,username,full_name)')
        .order('requested_at', { ascending: false }),
      supabase.from('investment_accounts')
        .select('*, profiles!investment_accounts_user_id_fkey(id,username,full_name,avatar_url,created_at)')
        .order('created_at', { ascending: false }),
      supabase.from('salary_requests')
        .select('*, profiles!salary_requests_user_id_fkey(id,username,full_name)')
        .order('requested_at', { ascending: false }),
      supabase.from('notifications')
        .select('*, profiles!notifications_user_id_fkey(id,username,full_name)')
        .eq('type', 'system').ilike('message', 'PASSWORD_RESET_REQUEST%').eq('read', false)
        .order('created_at', { ascending: false }),
    ])

    setDeposits(deps || [])
    setWithdrawals(wds || [])
    setInvestAccs(accs || [])
    setSalaries(sals || [])
    setResetReqs(rsts || [])

    /* duplicate device detection */
    const fp_map = {}
    ;(accs || []).forEach(a => {
      if (!a.device_fingerprint) return
      if (!fp_map[a.device_fingerprint]) fp_map[a.device_fingerprint] = []
      fp_map[a.device_fingerprint].push(a)
    })
    setDupGroups(Object.values(fp_map).filter(g => g.length > 1))
  }, [])

  const loadAccDetail = async (uid) => {
    const [{ data: invs }, { data: earns }] = await Promise.all([
      supabase.from('investments').select('*').eq('user_id', uid).order('created_at', { ascending: false }),
      supabase.from('daily_earnings').select('*').eq('user_id', uid).order('date', { ascending: false }).limit(30),
    ])
    setSelInvs(invs || [])
    setSelEarns(earns || [])
  }

  /* ──────────────────────────────────────────
     ACTION FUNCTIONS
  ────────────────────────────────────────── */

  /* deposit approve */
  const approveDeposit = async (dep) => {
    const plan = dep.amount_usd >= 1000 ? { rate: 3.0, label: 'Elite' }
      : dep.amount_usd >= 500  ? { rate: 2.5, label: 'Growth' }
      : { rate: 2.0, label: 'Starter' }
    const endDate = new Date(); endDate.setFullYear(endDate.getFullYear() + 1)
    await supabase.from('deposit_requests').update({ status: 'approved', processed_at: new Date().toISOString() }).eq('id', dep.id)
    await supabase.from('investments').insert({
      user_id: dep.user_id, amount_usd: dep.amount_usd, plan: plan.label,
      daily_rate: plan.rate, start_date: new Date().toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0], status: 'active',
    })
    const { data: acc } = await supabase.from('investment_accounts').select('*').eq('user_id', dep.user_id).single()
    if (acc) await supabase.from('investment_accounts').update({ total_invested: (acc.total_invested || 0) + dep.amount_usd }).eq('user_id', dep.user_id)
    else await supabase.from('investment_accounts').upsert({ user_id: dep.user_id, total_invested: dep.amount_usd, password: '1234' })

    // ── Referral: valid_referrals count update ──
    if (acc?.referred_by) {
      const referrerId = acc.referred_by
      // Level 1 referrer এর valid_referrals বাড়াও
      const { data: refAcc } = await supabase.from('investment_accounts').select('valid_referrals').eq('user_id', referrerId).single()
      if (refAcc) {
        await supabase.from('investment_accounts').update({ valid_referrals: (refAcc.valid_referrals || 0) + 1 }).eq('user_id', referrerId)
        await sendSystemNotif(referrerId, `🎉 আপনার একজন referral $${dep.amount_usd} invest করেছে! Valid referral count বেড়েছে।`)
      }
      // Level 2 referrer খোঁজা
      const { data: refAcc2 } = await supabase.from('investment_accounts').select('referred_by').eq('user_id', referrerId).single()
      if (refAcc2?.referred_by) {
        await sendSystemNotif(refAcc2.referred_by, `✨ আপনার Level 2 referral $${dep.amount_usd} invest করেছে!`)
      }
    }

    await sendSystemNotif(dep.user_id, `আপনার $${dep.amount_usd} ডিপোজিট অনুমোদিত হয়েছে! ${plan.label} Plan সক্রিয় — ${plan.rate}% দৈনিক আয়। প্রতিদিন পোস্ট করুন!`)
    setDeposits(d => d.map(x => x.id === dep.id ? { ...x, status: 'approved' } : x))
    refreshStats()
  }

  const rejectDeposit = async (dep) => {
    const note = prompt('Rejection reason:') || ''
    await supabase.from('deposit_requests').update({ status: 'rejected', admin_note: note, processed_at: new Date().toISOString() }).eq('id', dep.id)
    await sendSystemNotif(dep.user_id, `$${dep.amount_usd} ডিপোজিট অনুমোদিত হয়নি।${note ? ' কারণ: ' + note : ''} সহায়তার জন্য যোগাযোগ করুন।`)
    setDeposits(d => d.map(x => x.id === dep.id ? { ...x, status: 'rejected' } : x))
    refreshStats()
  }

  /* withdrawal */
  const approveWithdrawal = async (wd) => {
    const { data: acc } = await supabase.from('investment_accounts').select('*').eq('user_id', wd.user_id).single()
    if (!acc || acc.wallet_balance < wd.amount) { alert('Insufficient balance!'); return }
    await supabase.from('withdrawal_requests').update({ status: 'approved', processed_at: new Date().toISOString() }).eq('id', wd.id)
    await supabase.from('investment_accounts').update({
      wallet_balance: (acc.wallet_balance || 0) - wd.amount,
      total_withdrawn: (acc.total_withdrawn || 0) + wd.amount,
    }).eq('user_id', wd.user_id)
    await sendSystemNotif(wd.user_id, `$${wd.amount} উত্তোলন অনুমোদিত! ${wd.usdt_address?.slice(0,10)}... এ পাঠানো হয়েছে। Network confirmation এ ১-২৪ ঘন্টা লাগতে পারে।`)
    setWithdrawals(w => w.map(x => x.id === wd.id ? { ...x, status: 'approved' } : x))
    refreshStats()
  }

  const rejectWithdrawal = async (wd) => {
    const note = prompt('Rejection reason:') || ''
    await supabase.from('withdrawal_requests').update({ status: 'rejected', admin_note: note, processed_at: new Date().toISOString() }).eq('id', wd.id)
    await sendSystemNotif(wd.user_id, `$${wd.amount} উত্তোলন অনুরোধ বাতিল।${note ? ' কারণ: ' + note : ''}`)
    setWithdrawals(w => w.map(x => x.id === wd.id ? { ...x, status: 'rejected' } : x))
    refreshStats()
  }

  /* salary */
  const approveSalary = async (sal) => {
    const { data: acc } = await supabase.from('investment_accounts').select('*').eq('user_id', sal.user_id).single()
    await supabase.from('investment_accounts').update({
      wallet_balance: (acc?.wallet_balance || 0) + sal.amount,
      total_earned: (acc?.total_earned || 0) + sal.amount,
    }).eq('user_id', sal.user_id)
    await supabase.from('daily_earnings').insert({
      user_id: sal.user_id, investment_id: null, amount: sal.amount,
      type: 'salary', date: new Date().toISOString().split('T')[0],
    })
    await supabase.from('salary_requests').update({ status: 'approved', processed_at: new Date().toISOString() }).eq('id', sal.id)
    await sendSystemNotif(sal.user_id, `🎉 আপনার ${sal.month} মাসের স্যালারি $${sal.amount} (${sal.level === 'gold' ? '🥇 Gold' : '🥈 Silver'}) আপনার ওয়ালেটে যোগ হয়েছে!`)
    setSalaries(p => p.map(s => s.id === sal.id ? { ...s, status: 'approved' } : s))
    refreshStats()
    alert(`✅ $${sal.amount} salary paid to @${sal.profiles?.username}`)
  }

  const rejectSalary = async (sal) => {
    const note = prompt('Rejection reason:') || ''
    await supabase.from('salary_requests').update({ status: 'rejected', admin_note: note, processed_at: new Date().toISOString() }).eq('id', sal.id)
    await sendSystemNotif(sal.user_id, `${sal.month} স্যালারি আবেদন অনুমোদিত হয়নি।${note ? ' কারণ: ' + note : ''} নিশ্চিত করুন আপনার referral-রা active investment করেছে।`)
    setSalaries(p => p.map(s => s.id === sal.id ? { ...s, status: 'rejected', admin_note: note } : s))
    refreshStats()
  }

  /* balance adjust */
  const applyAdjust = async () => {
    if (!selAcc || !adjAmt) return
    const amt = parseFloat(adjAmt); if (isNaN(amt) || amt <= 0) return
    const cur = investAccs.find(a => a.user_id === selAcc.user_id)
    const newBal = adjType === 'add' ? (cur?.wallet_balance || 0) + amt : Math.max((cur?.wallet_balance || 0) - amt, 0)
    const newEarned = adjType === 'add' ? (cur?.total_earned || 0) + amt : (cur?.total_earned || 0)
    await supabase.from('investment_accounts').update({ wallet_balance: newBal, total_earned: newEarned }).eq('user_id', selAcc.user_id)
    await supabase.from('daily_earnings').insert({ user_id: selAcc.user_id, investment_id: null, amount: adjType === 'add' ? amt : -amt, type: 'admin_adjustment', date: new Date().toISOString().split('T')[0] })
    await sendSystemNotif(selAcc.user_id, adjType === 'add' ? `Admin দ্বারা আপনার wallet এ $${amt} যোগ করা হয়েছে।` : `Admin দ্বারা আপনার wallet থেকে $${amt} কাটা হয়েছে।`)
    setInvestAccs(prev => prev.map(a => a.user_id === selAcc.user_id ? { ...a, wallet_balance: newBal, total_earned: newEarned } : a))
    setSelAcc(p => ({ ...p, wallet_balance: newBal, total_earned: newEarned }))
    setAdjAmt('')
    alert(`✅ Balance ${adjType === 'add' ? 'added' : 'deducted'}: $${amt}`)
  }

  /* reset pin */
  const applyResetPin = async (targetUid, username, reqId = null) => {
    if (!newPin || !/^\d{4,}$/.test(newPin)) { alert('Enter valid numeric PIN (4+ digits)'); return }
    await supabase.from('investment_accounts').update({ password: newPin }).eq('user_id', targetUid)
    await sendSystemNotif(targetUid, `আপনার Echo Invest access code রিসেট করা হয়েছে। নতুন code: ${newPin} — লগইন করে এখনই পরিবর্তন করুন।`)
    if (reqId) {
      await supabase.from('notifications').update({ read: true }).eq('id', reqId)
      setResetReqs(p => p.filter(r => r.id !== reqId))
    }
    setNewPin('')
    alert(`✅ PIN reset for @${username}`)
  }

  /* block invest account */
  const toggleBlockInvest = async (uid, curStatus) => {
    const block = curStatus !== 'blocked'
    await supabase.from('investment_accounts').update({ status: block ? 'blocked' : 'active' }).eq('user_id', uid)
    if (block) await sendSystemNotif(uid, 'আপনার Echo Invest অ্যাকাউন্ট একাধিক অ্যাকাউন্ট নীতি লঙ্ঘনের কারণে ব্লক করা হয়েছে।')
    setInvestAccs(p => p.map(a => a.user_id === uid ? { ...a, status: block ? 'blocked' : 'active' } : a))
    if (selAcc?.user_id === uid) setSelAcc(p => ({ ...p, status: block ? 'blocked' : 'active' }))
  }

  /* ban user */
  const toggleBan = async (u) => {
    const ban = !u.banned
    await supabase.from('profiles').update({ banned: ban }).eq('id', u.id)
    if (ban) await sendSystemNotif(u.id, 'আপনার Echo World অ্যাকাউন্ট সাময়িকভাবে স্থগিত করা হয়েছে।')
    setUsers(p => p.map(x => x.id === u.id ? { ...x, banned: ban } : x))
  }

  const deleteUser = async (id) => {
    if (!confirm('Delete this user permanently?')) return
    await supabase.from('posts').delete().eq('user_id', id)
    await supabase.from('profiles').delete().eq('id', id)
    setUsers(p => p.filter(x => x.id !== id))
  }

  const deletePost = async (id) => {
    if (!confirm('Delete post?')) return
    await supabase.from('posts').delete().eq('id', id)
    setPosts(p => p.filter(x => x.id !== id))
  }

  /* manual referral commission */
  const addManualCommission = async () => {
    if (!manualRefUid.trim() || !manualRefAmt) return
    const amt = parseFloat(manualRefAmt)
    if (isNaN(amt) || amt <= 0) { alert('Enter valid amount'); return }
    const { data: refAcc } = await supabase.from('investment_accounts').select('*').eq('user_id', manualRefUid.trim()).single()
    if (!refAcc) { alert('User not found'); return }
    await supabase.from('investment_accounts').update({
      wallet_balance: (refAcc.wallet_balance || 0) + amt,
      total_earned: (refAcc.total_earned || 0) + amt,
    }).eq('user_id', manualRefUid.trim())
    await supabase.from('daily_earnings').insert({
      user_id: manualRefUid.trim(), investment_id: null,
      amount: amt, type: 'admin_adjustment',
      date: new Date().toISOString().split('T')[0],
    })
    await sendSystemNotif(manualRefUid.trim(), `Admin দ্বারা রেফারেল কমিশন $${amt} আপনার wallet এ যোগ হয়েছে।`)
    setManualRefUid(''); setManualRefAmt('')
    alert(`✅ $${amt} referral commission added!`)
    loadInvest()
  }

  /* announce */
  const sendAnnounce = async () => {
    if (!announce.trim()) return
    const { data: all } = await supabase.from('profiles').select('id')
    const rows = (all || []).map(u => ({
      user_id: u.id,
      from_user_id: null,   // ← NULL = কোনো profile দেখাবে না
      type: 'announcement',
      message: `📢 Echo World: ${announce.trim()}`,
      read: false,
    }))
    await supabase.from('notifications').insert(rows)
    alert(`📢 Sent to ${rows.length} users!`)
    setAnnounce('')
  }

  /* ──────────────────────────────────────────
     RENDER
  ────────────────────────────────────────── */
  if (loading) return (
    <div style={{ height:'100vh', background:'#070a12', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:'14px' }}>
      <div style={{ width:'52px', height:'52px', borderRadius:'50%', background:'linear-gradient(135deg,#00e5ff,#00ff88)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'24px', animation:'spin 1.5s linear infinite' }}>⬡</div>
      <div style={{ color:'#00e5ff', fontWeight:'700', fontSize:'14px' }}>Loading Admin Panel...</div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}} @keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}} *{box-sizing:border-box}`}</style>
    </div>
  )

  if (!authorized) return (
    <div style={{ height:'100vh', background:'#070a12', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'14px', color:'#ff4560' }}>
      <div style={{ fontSize:'56px' }}>🚫</div>
      <div style={{ fontSize:'20px', fontWeight:'800' }}>Access Denied</div>
      <button onClick={() => window.location.href='/feed'} style={{ padding:'11px 26px', background:'linear-gradient(135deg,#00e5ff,#00ff88)', border:'none', borderRadius:'12px', fontSize:'14px', fontWeight:'700', color:'#070a12', cursor:'pointer' }}>← Go Back</button>
    </div>
  )

  const totalPending = (stats.pDep || 0) + (stats.pWd || 0) + (stats.pSal || 0)
  const filteredUsers = users.filter(u => !userSearch || u.username?.toLowerCase().includes(userSearch.toLowerCase()) || u.full_name?.toLowerCase().includes(userSearch.toLowerCase()))

  return (
    <div style={{ minHeight:'100vh', background:'#070a12', color:'#eef2f7', fontFamily:'system-ui,sans-serif' }}>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
        @keyframes glow{0%,100%{box-shadow:0 0 16px rgba(0,229,255,.2)}50%{box-shadow:0 0 28px rgba(0,229,255,.45)}}
        *{box-sizing:border-box}
        ::-webkit-scrollbar{display:none}
        input,textarea{-webkit-user-select:text;user-select:text}
      `}</style>

      {/* ─── TOP BAR ─── */}
      <div style={{ position:'fixed', top:0, left:0, right:0, zIndex:200, background:'rgba(7,10,18,.97)', backdropFilter:'blur(12px)', borderBottom:'1px solid rgba(0,229,255,.12)' }}>
        <div style={{ padding:'0 16px', height:'54px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
            <div style={{ width:'34px', height:'34px', borderRadius:'50%', background:'linear-gradient(135deg,#00e5ff,#00ff88)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'16px', animation:'glow 3s ease-in-out infinite' }}>⬡</div>
            <div>
              <div style={{ fontSize:'14px', fontWeight:'900', background:'linear-gradient(90deg,#00e5ff,#00ff88)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>Echo World</div>
              <div style={{ fontSize:'9px', color:'#4a5568', fontWeight:'600', letterSpacing:'1px' }}>ADMIN PANEL</div>
            </div>
          </div>
          <div style={{ display:'flex', gap:'7px', alignItems:'center' }}>
            {totalPending > 0 && (
              <div onClick={() => { setTab('invest'); loadInvest() }}
                style={{ background:'#ff4560', borderRadius:'20px', padding:'3px 10px', fontSize:'11px', fontWeight:'800', color:'#fff', cursor:'pointer', animation:'pulse 2s infinite' }}>
                ⚠️ {totalPending} pending
              </div>
            )}
            {dupGroups.length > 0 && (
              <div onClick={() => { setTab('invest'); setInvestTab('duplicates'); loadInvest() }}
                style={{ background:'rgba(255,165,0,.15)', border:'1px solid rgba(255,165,0,.3)', borderRadius:'20px', padding:'3px 10px', fontSize:'11px', fontWeight:'700', color:'#ffa500', cursor:'pointer' }}>
                📱 {dupGroups.length} dup
              </div>
            )}
            <button onClick={() => window.location.href='/storage'}
              style={{ background:'rgba(0,229,255,.08)', border:'1px solid rgba(0,229,255,.2)', borderRadius:'14px', padding:'5px 12px', color:'#00e5ff', fontSize:'12px', cursor:'pointer', fontWeight:'700' }}>
              📊
            </button>
            <button onClick={() => window.location.href='/feed'}
              style={{ background:'rgba(255,255,255,.06)', border:'1px solid rgba(255,255,255,.1)', borderRadius:'14px', padding:'5px 12px', color:'#8892a4', fontSize:'12px', cursor:'pointer' }}>
              ← App
            </button>
          </div>
        </div>

        {/* MAIN TABS */}
        <div style={{ display:'flex', gap:'4px', padding:'0 12px 10px', overflowX:'auto', scrollbarWidth:'none' }}>
          {[
            { key:'dashboard', label:'📊 Dashboard' },
            { key:'invest',    label:`💎 Invest${totalPending > 0 ? ` (${totalPending})` : ''}` },
            { key:'users',     label:'👥 Users' },
            { key:'posts',     label:'📝 Posts' },
            { key:'announce',  label:'📢 Announce' },
            { key:'referral',  label:'🔗 Referral' },
            { key:'storage',   label:'📊 Storage' },
          ].map(t => (
            <button key={t.key} onClick={() => {
              setTab(t.key)
              if (t.key === 'users') loadUsers()
              if (t.key === 'posts') loadPosts()
              if (t.key === 'invest') loadInvest()
              if (t.key === 'referral') loadInvest()
            }} style={{ padding:'6px 14px', borderRadius:'20px', border:'none', cursor:'pointer', fontSize:'12px', fontWeight:'700', whiteSpace:'nowrap', flexShrink:0, transition:'all .2s',
              background: tab === t.key ? 'linear-gradient(135deg,#00e5ff,#00ff88)' : 'rgba(255,255,255,.07)',
              color: tab === t.key ? '#070a12' : '#8892a4' }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ─── CONTENT ─── */}
      <div style={{ padding:'115px 14px 40px' }}>

        {/* ═══════════════ DASHBOARD ═══════════════ */}
        {tab === 'dashboard' && (
          <div style={{ animation:'fadeUp .3s ease' }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginBottom:'14px' }}>
              <Stat icon='👥' label='Total Users'  value={stats.users     || 0} color='#00e5ff' />
              <Stat icon='📝' label='Total Posts'  value={stats.posts     || 0} color='#00ff88' />
              <Stat icon='🆕' label='Today Joined' value={stats.todayUsers|| 0} color='#ffca28' />
              <Stat icon='💎' label='Investors'    value={stats.investors  || 0} color='#ffa500' />
            </div>

            {/* Platform Financial Summary */}
            <div style={{ background:'linear-gradient(135deg,rgba(0,229,255,0.06),rgba(0,255,136,0.04))', border:'1px solid rgba(0,229,255,0.15)', borderRadius:'16px', padding:'16px', marginBottom:'14px' }}>
              <div style={{ fontSize:'12px', fontWeight:'800', color:'#00e5ff', marginBottom:'12px' }}>💰 Platform Financial Summary</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px' }}>
                {[
                  { l:'Total Invested', v:`$${(platformStats.invested||0).toFixed(0)}`,  c:'#00e5ff' },
                  { l:'Total Earned',   v:`$${(platformStats.earned||0).toFixed(0)}`,    c:'#ffa500' },
                  { l:'Total Withdrawn',v:`$${(platformStats.withdrawn||0).toFixed(0)}`, c:'#ff4560' },
                  { l:'In Wallets',     v:`$${(platformStats.wallet||0).toFixed(0)}`,    c:'#00ff88' },
                ].map(s => (
                  <div key={s.l} style={{ background:'rgba(255,255,255,0.03)', borderRadius:'10px', padding:'10px', textAlign:'center' }}>
                    <div style={{ fontSize:'16px', fontWeight:'900', color:s.c }}>{s.v}</div>
                    <div style={{ fontSize:'9px', color:'#4a5568', marginTop:'2px' }}>{s.l}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginBottom:'14px' }}>
            </div>

            {/* Pending alert banner */}
            {totalPending > 0 && (
              <div onClick={() => { setTab('invest'); loadInvest() }}
                style={{ background:'rgba(255,165,0,.07)', border:'2px solid rgba(255,165,0,.35)', borderRadius:'14px', padding:'14px 16px', marginBottom:'14px', cursor:'pointer', animation:'pulse 3s infinite' }}>
                <div style={{ fontSize:'13px', fontWeight:'800', color:'#ffa500', marginBottom:'6px' }}>⚠️ {totalPending} Requests Waiting</div>
                <div style={{ display:'flex', gap:'16px' }}>
                  {[['📥 Deposits', stats.pDep], ['📤 Withdrawals', stats.pWd], ['💼 Salaries', stats.pSal]].map(([lbl, v]) => (
                    <div key={lbl} style={{ fontSize:'11px', color:'#8892a4' }}>{lbl}: <span style={{ fontWeight:'800', color: v > 0 ? '#ffa500' : '#4a5568' }}>{v || 0}</span></div>
                  ))}
                </div>
              </div>
            )}

            {dupGroups.length > 0 && (
              <div onClick={() => { setTab('invest'); setInvestTab('duplicates'); loadInvest() }}
                style={{ background:'rgba(255,69,96,.06)', border:'1px solid rgba(255,69,96,.25)', borderRadius:'14px', padding:'14px 16px', marginBottom:'14px', cursor:'pointer' }}>
                <div style={{ fontSize:'13px', fontWeight:'700', color:'#ff4560' }}>📱 {dupGroups.length} Duplicate Device Group(s)</div>
                <div style={{ fontSize:'11px', color:'#4a5568', marginTop:'3px' }}>Multiple accounts from same device detected — Tap to review</div>
              </div>
            )}

            {/* System notice about notifications */}
            <Card style={{ background:'rgba(0,229,255,.04)', borderColor:'rgba(0,229,255,.15)' }}>
              <div style={{ fontSize:'12px', fontWeight:'700', color:'#00e5ff', marginBottom:'8px' }}>🌐 Echo World Branding</div>
              <div style={{ fontSize:'11px', color:'#8892a4', lineHeight:'1.8' }}>
                ✅ সকল system notifications <strong style={{ color:'#00e5ff' }}>Echo World</strong> নামে যায়<br/>
                ✅ আপনার personal profile কখনো দেখাবে না<br/>
                ✅ Announcement, Deposit approval, Withdrawal, Password reset — সব Echo World নামে
              </div>
            </Card>
          </div>
        )}

        {/* ═══════════════ INVEST PANEL ═══════════════ */}
        {tab === 'invest' && (
          <div style={{ animation:'fadeUp .3s ease' }}>
            <div style={{ fontSize:'15px', fontWeight:'900', color:'#00e5ff', marginBottom:'14px' }}>💎 Investment Control Center</div>

            {/* invest sub-tabs */}
            <div style={{ display:'flex', gap:'5px', marginBottom:'16px', overflowX:'auto', scrollbarWidth:'none', paddingBottom:'3px' }}>
              {[
                { key:'deposits',    label:`📥 Deposits${deposits.filter(d=>d.status==='pending').length > 0 ? ` (${deposits.filter(d=>d.status==='pending').length})` : ''}` },
                { key:'withdrawals', label:`📤 Withdraw${withdrawals.filter(w=>w.status==='pending').length > 0 ? ` (${withdrawals.filter(w=>w.status==='pending').length})` : ''}` },
                { key:'salary',      label:`💼 Salary${salaries.filter(s=>s.status==='pending').length > 0 ? ` (${salaries.filter(s=>s.status==='pending').length})` : ''}` },
                { key:'accounts',    label:`👤 Accounts (${investAccs.length})` },
                { key:'duplicates',  label:`📱 Duplicates${dupGroups.length > 0 ? ` (${dupGroups.length})` : ''}` },
                { key:'resets',      label:`🔑 Resets${resetReqs.length > 0 ? ` (${resetReqs.length})` : ''}` },
              ].map(t => (
                <button key={t.key} onClick={() => setInvestTab(t.key)}
                  style={{ padding:'6px 13px', borderRadius:'14px', border:`1px solid ${investTab===t.key ? 'rgba(0,229,255,.35)' : 'transparent'}`, cursor:'pointer', fontSize:'11px', fontWeight:'700', whiteSpace:'nowrap', flexShrink:0,
                    background: investTab===t.key ? 'rgba(0,229,255,.12)' : 'rgba(255,255,255,.05)',
                    color: investTab===t.key ? '#00e5ff' : '#8892a4' }}>
                  {t.label}
                </button>
              ))}
            </div>

            {/* ─── DEPOSITS ─── */}
            {investTab === 'deposits' && (
              <div>
                {deposits.length === 0
                  ? <div style={{ textAlign:'center', padding:'40px', color:'#4a5568' }}>No deposits yet</div>
                  : deposits.map(dep => (
                  <div key={dep.id} style={{ background:'#111826', border:`2px solid ${dep.status==='pending' ? 'rgba(255,165,0,.4)' : 'rgba(255,255,255,.06)'}`, borderRadius:'16px', padding:'16px', marginBottom:'12px' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'12px' }}>
                      <div>
                        <div style={{ fontSize:'22px', fontWeight:'900', color:'#00ff88' }}>${dep.amount_usd}</div>
                        <div style={{ fontSize:'13px', fontWeight:'700', color:'#eef2f7' }}>@{dep.profiles?.username}</div>
                        <div style={{ fontSize:'11px', color:'#4a5568' }}>{dep.profiles?.full_name} · {timeAgo(dep.requested_at)}</div>
                        {/* auto-detect plan */}
                        <div style={{ marginTop:'4px' }}>
                          {dep.amount_usd >= 1000 ? <Tag color='#ffa500'>💎 Elite 3%/day</Tag>
                            : dep.amount_usd >= 500 ? <Tag color='#00ff88'>🚀 Growth 2.5%/day</Tag>
                            : <Tag color='#00e5ff'>🌱 Starter 2%/day</Tag>}
                        </div>
                      </div>
                      <StatusPill status={dep.status} />
                    </div>
                    <div style={{ background:'#0c1018', borderRadius:'10px', padding:'12px', marginBottom:'12px' }}>
                      <div style={{ fontSize:'10px', color:'#4a5568', fontWeight:'700', marginBottom:'4px', letterSpacing:'.5px' }}>TX ID</div>
                      <div style={{ fontSize:'11px', color:'#00e5ff', wordBreak:'break-all', fontFamily:'monospace', lineHeight:'1.6' }}>{dep.txid}</div>
                      {dep.screenshot_url && (
                        <div style={{ marginTop:'10px' }}>
                          <div style={{ fontSize:'10px', color:'#4a5568', marginBottom:'5px' }}>📸 Payment Screenshot</div>
                          <img src={dep.screenshot_url} alt='proof' style={{ width:'100%', maxHeight:'220px', objectFit:'cover', borderRadius:'8px', border:'1px solid rgba(255,255,255,.08)' }} />
                        </div>
                      )}
                    </div>
                    {dep.status === 'pending' && (
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px' }}>
                        <button onClick={() => approveDeposit(dep)} style={{ padding:'13px', background:'rgba(0,255,136,.1)', border:'1px solid rgba(0,255,136,.3)', borderRadius:'12px', color:'#00ff88', fontSize:'14px', fontWeight:'700', cursor:'pointer' }}>✅ Approve</button>
                        <button onClick={() => rejectDeposit(dep)}  style={{ padding:'13px', background:'rgba(255,69,96,.1)',  border:'1px solid rgba(255,69,96,.3)',  borderRadius:'12px', color:'#ff4560', fontSize:'14px', fontWeight:'700', cursor:'pointer' }}>❌ Reject</button>
                      </div>
                    )}
                    {dep.admin_note && <div style={{ marginTop:'8px', fontSize:'11px', color:'#4a5568' }}>Note: {dep.admin_note}</div>}
                  </div>
                ))}
              </div>
            )}

            {/* ─── WITHDRAWALS ─── */}
            {investTab === 'withdrawals' && (
              <div>
                {withdrawals.length === 0
                  ? <div style={{ textAlign:'center', padding:'40px', color:'#4a5568' }}>No withdrawals yet</div>
                  : withdrawals.map(wd => (
                  <div key={wd.id} style={{ background:'#111826', border:`2px solid ${wd.status==='pending' ? 'rgba(255,165,0,.4)' : 'rgba(255,255,255,.06)'}`, borderRadius:'16px', padding:'16px', marginBottom:'12px' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'12px' }}>
                      <div>
                        <div style={{ fontSize:'22px', fontWeight:'900', color:'#ffa500' }}>${wd.amount}</div>
                        <div style={{ fontSize:'13px', fontWeight:'700' }}>@{wd.profiles?.username}</div>
                        <div style={{ fontSize:'11px', color:'#4a5568' }}>{timeAgo(wd.requested_at)}</div>
                      </div>
                      <StatusPill status={wd.status} />
                    </div>
                    <div style={{ background:'#0c1018', borderRadius:'10px', padding:'12px', marginBottom:'12px' }}>
                      <div style={{ fontSize:'10px', color:'#ffa500', fontWeight:'700', marginBottom:'6px', letterSpacing:'.5px' }}>⬇ SEND USDT TO THIS ADDRESS</div>
                      <div style={{ fontSize:'12px', color:'#00e5ff', wordBreak:'break-all', fontFamily:'monospace', background:'rgba(0,229,255,.04)', padding:'8px', borderRadius:'7px', lineHeight:'1.6' }}>{wd.usdt_address}</div>
                      <button onClick={() => navigator.clipboard?.writeText(wd.usdt_address)}
                        style={{ marginTop:'8px', padding:'6px 14px', background:'rgba(0,229,255,.08)', border:'1px solid rgba(0,229,255,.2)', borderRadius:'8px', color:'#00e5ff', fontSize:'11px', fontWeight:'600', cursor:'pointer' }}>
                        📋 Copy Address
                      </button>
                    </div>
                    {wd.status === 'pending' && (
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px' }}>
                        <button onClick={() => approveWithdrawal(wd)} style={{ padding:'13px', background:'rgba(0,255,136,.1)', border:'1px solid rgba(0,255,136,.3)', borderRadius:'12px', color:'#00ff88', fontSize:'13px', fontWeight:'700', cursor:'pointer' }}>✅ Sent & Approve</button>
                        <button onClick={() => rejectWithdrawal(wd)}  style={{ padding:'13px', background:'rgba(255,69,96,.1)',  border:'1px solid rgba(255,69,96,.3)',  borderRadius:'12px', color:'#ff4560', fontSize:'13px', fontWeight:'700', cursor:'pointer' }}>❌ Reject</button>
                      </div>
                    )}
                    {wd.admin_note && <div style={{ marginTop:'8px', fontSize:'11px', color:'#4a5568' }}>Note: {wd.admin_note}</div>}
                  </div>
                ))}
              </div>
            )}

            {/* ─── SALARY ─── */}
            {investTab === 'salary' && (
              <div>
                {salaries.length === 0
                  ? (
                    <div style={{ textAlign:'center', padding:'50px', color:'#4a5568' }}>
                      <div style={{ fontSize:'36px', marginBottom:'8px' }}>💼</div>
                      <div>No salary applications yet</div>
                    </div>
                  ) : salaries.map(sal => (
                  <div key={sal.id} style={{ background:'#111826', border:`2px solid ${sal.status==='pending' ? 'rgba(255,165,0,.4)' : 'rgba(255,255,255,.06)'}`, borderRadius:'18px', padding:'18px', marginBottom:'14px' }}>

                    {/* header */}
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'14px' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:'11px' }}>
                        <div style={{ width:'44px', height:'44px', borderRadius:'50%', background:'linear-gradient(135deg,#ffa500,#ffca28)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'18px', fontWeight:'900', color:'#050810', flexShrink:0 }}>
                          {(sal.profiles?.full_name || sal.profiles?.username || 'U')[0].toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontSize:'15px', fontWeight:'800' }}>@{sal.profiles?.username}</div>
                          <div style={{ fontSize:'11px', color:'#8892a4' }}>{sal.profiles?.full_name}</div>
                          <div style={{ fontSize:'10px', color:'#4a5568' }}>{timeAgo(sal.requested_at)}</div>
                        </div>
                      </div>
                      <div style={{ textAlign:'right' }}>
                        <div style={{ fontSize:'26px', fontWeight:'900', color: sal.level==='gold' ? '#ffa500' : '#00e5ff' }}>${sal.amount}</div>
                        <StatusPill status={sal.level} />
                      </div>
                    </div>

                    {/* detail grid */}
                    <div style={{ background:'#0c1018', borderRadius:'12px', padding:'14px', marginBottom:'14px' }}>
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'10px' }}>
                        {[
                          { k:'Month',           v: sal.month,                     c:'#eef2f7' },
                          { k:'Valid Referrals', v: `${sal.valid_referral_count||'?'} people`, c:'#00ff88' },
                          { k:'Plan Level',      v: sal.investor_plan || 'growth',  c:'#eef2f7' },
                          { k:'Salary/month',    v: `$${sal.amount}`,               c: sal.level==='gold' ? '#ffa500' : '#00e5ff' },
                        ].map(row => (
                          <div key={row.k}>
                            <div style={{ fontSize:'9px', color:'#4a5568', fontWeight:'700', letterSpacing:'.5px', marginBottom:'3px' }}>{row.k.toUpperCase()}</div>
                            <div style={{ fontSize:'13px', fontWeight:'700', color: row.c }}>{row.v}</div>
                          </div>
                        ))}
                      </div>

                      {sal.usdt_address && (
                        <div style={{ borderTop:'1px solid rgba(255,255,255,.05)', paddingTop:'10px' }}>
                          <div style={{ fontSize:'9px', color:'#4a5568', fontWeight:'700', marginBottom:'4px' }}>USDT ADDRESS</div>
                          <div style={{ fontSize:'11px', color:'#00e5ff', fontFamily:'monospace', wordBreak:'break-all' }}>{sal.usdt_address}</div>
                        </div>
                      )}

                      {sal.note && (
                        <div style={{ borderTop:'1px solid rgba(255,255,255,.05)', paddingTop:'10px', marginTop:'10px' }}>
                          <div style={{ fontSize:'9px', color:'#4a5568', fontWeight:'700', marginBottom:'3px' }}>APPLICANT NOTE</div>
                          <div style={{ fontSize:'12px', color:'#8892a4', fontStyle:'italic' }}>"{sal.note}"</div>
                        </div>
                      )}
                    </div>

                    {/* verify link */}
                    <button onClick={() => window.open(`/user/${sal.user_id}`, '_blank')}
                      style={{ width:'100%', padding:'9px', background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.08)', borderRadius:'10px', color:'#8892a4', fontSize:'12px', fontWeight:'600', cursor:'pointer', marginBottom:'10px' }}>
                      👁 View Profile & Verify Referrals
                    </button>

                    {sal.status === 'pending' ? (
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px' }}>
                        <button onClick={() => approveSalary(sal)} style={{ padding:'14px', background:'rgba(0,255,136,.1)', border:'1px solid rgba(0,255,136,.3)', borderRadius:'12px', color:'#00ff88', fontSize:'14px', fontWeight:'700', cursor:'pointer' }}>✅ Approve & Pay</button>
                        <button onClick={() => rejectSalary(sal)}  style={{ padding:'14px', background:'rgba(255,69,96,.1)',  border:'1px solid rgba(255,69,96,.3)',  borderRadius:'12px', color:'#ff4560', fontSize:'14px', fontWeight:'700', cursor:'pointer' }}>❌ Reject</button>
                      </div>
                    ) : (
                      <div style={{ padding:'12px', borderRadius:'12px', textAlign:'center', background: sal.status==='approved' ? 'rgba(0,255,136,.07)' : 'rgba(255,69,96,.07)', border:`1px solid ${sal.status==='approved' ? 'rgba(0,255,136,.2)' : 'rgba(255,69,96,.2)'}`, color: sal.status==='approved' ? '#00ff88' : '#ff4560', fontSize:'13px', fontWeight:'700' }}>
                        {sal.status==='approved' ? `✅ $${sal.amount} paid` : `❌ Rejected: ${sal.admin_note || ''}`}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* ─── ACCOUNTS ─── */}
            {investTab === 'accounts' && (
              <div>
                {/* selected account detail panel */}
                {selAcc && (
                  <div style={{ background:'rgba(0,229,255,.04)', border:'1px solid rgba(0,229,255,.2)', borderRadius:'18px', padding:'18px', marginBottom:'16px', animation:'fadeUp .3s ease' }}>
                    {/* header */}
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:'11px' }}>
                        <div style={{ width:'46px', height:'46px', borderRadius:'50%', background:'linear-gradient(135deg,#00e5ff,#00ff88)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'18px', fontWeight:'900', color:'#050810' }}>
                          {(selAcc.profiles?.full_name || selAcc.profiles?.username || '?')[0].toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontSize:'15px', fontWeight:'800' }}>@{selAcc.profiles?.username}</div>
                          <div style={{ fontSize:'11px', color:'#4a5568' }}>{selAcc.profiles?.full_name}</div>
                          {selAcc.status === 'blocked' && <Tag color='#ff4560'>🚫 BLOCKED</Tag>}
                        </div>
                      </div>
                      <button onClick={() => { setSelAcc(null); setSelInvs([]); setSelEarns([]) }} style={{ background:'none', border:'none', color:'#4a5568', fontSize:'22px', cursor:'pointer', lineHeight:1 }}>✕</button>
                    </div>

                    {/* wallet stats */}
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px', marginBottom:'14px' }}>
                      {[
                        { l:'Wallet',    v:`$${(selAcc.wallet_balance||0).toFixed(2)}`,   c:'#00ff88' },
                        { l:'Invested',  v:`$${(selAcc.total_invested||0).toFixed(2)}`,   c:'#00e5ff' },
                        { l:'Earned',    v:`$${(selAcc.total_earned||0).toFixed(2)}`,      c:'#ffa500' },
                        { l:'Withdrawn', v:`$${(selAcc.total_withdrawn||0).toFixed(2)}`,  c:'#ff4560' },
                      ].map(s => (
                        <div key={s.l} style={{ background:'#0c1018', borderRadius:'10px', padding:'10px', textAlign:'center' }}>
                          <div style={{ fontSize:'15px', fontWeight:'900', color:s.c }}>{s.v}</div>
                          <div style={{ fontSize:'9px', color:'#4a5568', marginTop:'2px' }}>{s.l}</div>
                        </div>
                      ))}
                    </div>

                    {/* info block */}
                    <div style={{ background:'#0c1018', borderRadius:'12px', padding:'12px', marginBottom:'14px' }}>
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginBottom:'10px' }}>
                        <div>
                          <div style={{ fontSize:'9px', color:'#4a5568', fontWeight:'700', marginBottom:'3px' }}>ACCESS PIN</div>
                          <div style={{ fontSize:'20px', fontWeight:'900', color:'#ffca28', letterSpacing:'5px' }}>{selAcc.password}</div>
                        </div>
                        <div>
                          <div style={{ fontSize:'9px', color:'#4a5568', fontWeight:'700', marginBottom:'3px' }}>STATUS</div>
                          <StatusPill status={selAcc.status || 'active'} />
                        </div>
                      </div>
                      {selAcc.usdt_address && (
                        <div style={{ marginBottom:'8px' }}>
                          <div style={{ fontSize:'9px', color:'#4a5568', fontWeight:'700', marginBottom:'3px' }}>USDT ADDRESS</div>
                          <div style={{ fontSize:'10px', color:'#00e5ff', fontFamily:'monospace', wordBreak:'break-all' }}>{selAcc.usdt_address}</div>
                        </div>
                      )}
                      <div>
                        <div style={{ fontSize:'9px', color:'#4a5568', fontWeight:'700', marginBottom:'3px' }}>DEVICE FINGERPRINT</div>
                        <div style={{ fontSize:'9px', color:'#8892a4', fontFamily:'monospace', wordBreak:'break-all', lineHeight:'1.5' }}>{selAcc.device_fingerprint || 'N/A'}</div>
                        {/* duplicate warning */}
                        {dupGroups.some(g => g.some(a => a.user_id === selAcc.user_id)) && (
                          <div style={{ marginTop:'6px', padding:'6px 10px', background:'rgba(255,69,96,.1)', border:'1px solid rgba(255,69,96,.25)', borderRadius:'8px', fontSize:'10px', color:'#ff4560', fontWeight:'700' }}>
                            ⚠️ Duplicate device! Another account shares this fingerprint.
                          </div>
                        )}
                      </div>
                    </div>

                    {/* active investments mini list */}
                    {selInvs.filter(i => i.status === 'active').length > 0 && (
                      <div style={{ marginBottom:'14px' }}>
                        <div style={{ fontSize:'10px', color:'#4a5568', fontWeight:'700', letterSpacing:'.5px', marginBottom:'6px' }}>ACTIVE INVESTMENTS</div>
                        {selInvs.filter(i => i.status === 'active').map(inv => {
                          const daysIn = Math.floor((Date.now() - new Date(inv.start_date)) / 86400000)
                          const pct = Math.min(daysIn / 365 * 100, 100)
                          return (
                            <div key={inv.id} style={{ background:'#0c1018', borderRadius:'10px', padding:'10px 12px', marginBottom:'6px' }}>
                              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'6px' }}>
                                <span style={{ fontSize:'12px', fontWeight:'700', color:'#00e5ff' }}>{inv.plan} — {inv.daily_rate}%/day</span>
                                <span style={{ fontSize:'12px', fontWeight:'700', color:'#00ff88' }}>${inv.amount_usd}</span>
                              </div>
                              <div style={{ background:'rgba(255,255,255,.06)', borderRadius:'4px', height:'5px' }}>
                                <div style={{ height:'100%', width:`${pct}%`, background:'linear-gradient(90deg,#00e5ff,#00ff88)', borderRadius:'4px' }} />
                              </div>
                              <div style={{ fontSize:'10px', color:'#4a5568', marginTop:'3px' }}>Day {daysIn}/365 · Ends {new Date(inv.end_date).toLocaleDateString()}</div>
                            </div>
                          )
                        })}
                      </div>
                    )}

                    {/* recent earnings mini */}
                    {selEarns.slice(0, 5).length > 0 && (
                      <div style={{ marginBottom:'14px' }}>
                        <div style={{ fontSize:'10px', color:'#4a5568', fontWeight:'700', letterSpacing:'.5px', marginBottom:'6px' }}>RECENT EARNINGS</div>
                        {selEarns.slice(0, 5).map(e => (
                          <div key={e.id} style={{ display:'flex', justifyContent:'space-between', fontSize:'11px', padding:'5px 0', borderBottom:'1px solid rgba(255,255,255,.04)' }}>
                            <span style={{ color:'#8892a4' }}>{e.date} · <span style={{ color: e.type==='admin_adjustment' ? '#ffa500' : e.type==='salary' ? '#ffca28' : '#4a5568' }}>{e.type}</span></span>
                            <span style={{ color: e.amount >= 0 ? '#00ff88' : '#ff4560', fontWeight:'700' }}>{e.amount >= 0 ? '+' : ''}${e.amount.toFixed(4)}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* balance adjust */}
                    <div style={{ marginBottom:'14px' }}>
                      <div style={{ fontSize:'12px', fontWeight:'700', marginBottom:'8px' }}>💰 Adjust Balance</div>
                      <div style={{ display:'flex', gap:'6px', marginBottom:'8px' }}>
                        {['add','deduct'].map(type => (
                          <button key={type} onClick={() => setAdjType(type)}
                            style={{ flex:1, padding:'8px', background: adjType===type ? (type==='add' ? 'rgba(0,255,136,.15)' : 'rgba(255,69,96,.15)') : 'rgba(255,255,255,.04)', border:`1px solid ${adjType===type ? (type==='add' ? '#00ff8866' : '#ff456066') : 'rgba(255,255,255,.08)'}`, borderRadius:'10px', color: adjType===type ? (type==='add' ? '#00ff88' : '#ff4560') : '#4a5568', fontSize:'12px', fontWeight:'700', cursor:'pointer' }}>
                            {type === 'add' ? '➕ Add' : '➖ Deduct'}
                          </button>
                        ))}
                      </div>
                      <div style={{ display:'flex', gap:'8px' }}>
                        <input value={adjAmt} onChange={e => setAdjAmt(e.target.value)} type='number' placeholder='Amount ($)'
                          style={{ flex:1, background:'#0c1018', border:'1px solid rgba(255,255,255,.1)', borderRadius:'10px', padding:'10px 12px', color:'#eef2f7', fontSize:'14px', outline:'none' }} />
                        <button onClick={applyAdjust}
                          style={{ padding:'10px 18px', background: adjType==='add' ? 'linear-gradient(135deg,#00e5ff,#00ff88)' : 'linear-gradient(135deg,#ff4560,#c0392b)', border:'none', borderRadius:'10px', color:'#fff', fontSize:'13px', fontWeight:'800', cursor:'pointer' }}>
                          Apply
                        </button>
                      </div>
                    </div>

                    {/* reset PIN */}
                    <div style={{ marginBottom:'14px' }}>
                      <div style={{ fontSize:'12px', fontWeight:'700', marginBottom:'8px' }}>🔑 Reset Access PIN</div>
                      <div style={{ display:'flex', gap:'8px' }}>
                        <input value={newPin} onChange={e => setNewPin(e.target.value.replace(/\D/g,''))} placeholder='New PIN (numbers)'
                          style={{ flex:1, background:'#0c1018', border:'1px solid rgba(255,255,255,.1)', borderRadius:'10px', padding:'10px 12px', color:'#eef2f7', fontSize:'14px', outline:'none', letterSpacing:'4px' }} />
                        <button onClick={() => applyResetPin(selAcc.user_id, selAcc.profiles?.username)}
                          style={{ padding:'10px 14px', background:'rgba(255,202,40,.1)', border:'1px solid rgba(255,202,40,.3)', borderRadius:'10px', color:'#ffca28', fontSize:'12px', fontWeight:'700', cursor:'pointer' }}>
                          Reset
                        </button>
                      </div>
                    </div>

                    {/* block/unblock */}
                    <button onClick={() => toggleBlockInvest(selAcc.user_id, selAcc.status)}
                      style={{ width:'100%', padding:'12px', background: selAcc.status==='blocked' ? 'rgba(0,255,136,.1)' : 'rgba(255,69,96,.1)', border:`1px solid ${selAcc.status==='blocked' ? 'rgba(0,255,136,.3)' : 'rgba(255,69,96,.3)'}`, borderRadius:'12px', color: selAcc.status==='blocked' ? '#00ff88' : '#ff4560', fontSize:'13px', fontWeight:'700', cursor:'pointer' }}>
                      {selAcc.status === 'blocked' ? '✅ Unblock Account' : '🚫 Block Invest Account'}
                    </button>
                  </div>
                )}

                {/* accounts list */}
                <div style={{ fontSize:'10px', color:'#4a5568', fontWeight:'700', letterSpacing:'1px', marginBottom:'10px' }}>ALL INVESTORS ({investAccs.length})</div>
                {investAccs.map(acc => (
                  <div key={acc.id} onClick={async () => { setSelAcc(acc); await loadAccDetail(acc.user_id) }}
                    style={{ background: selAcc?.user_id===acc.user_id ? 'rgba(0,229,255,.05)' : '#111826', border:`1px solid ${acc.status==='blocked' ? 'rgba(255,69,96,.3)' : selAcc?.user_id===acc.user_id ? 'rgba(0,229,255,.25)' : 'rgba(255,255,255,.06)'}`, borderRadius:'14px', padding:'12px 14px', marginBottom:'8px', cursor:'pointer', transition:'all .2s' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                      <div style={{ width:'38px', height:'38px', borderRadius:'50%', background: acc.status==='blocked' ? '#ff456033' : 'linear-gradient(135deg,#00e5ff22,#00ff8822)', border:`2px solid ${acc.status==='blocked' ? '#ff4560' : '#00e5ff33'}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'14px', fontWeight:'800', color: acc.status==='blocked' ? '#ff4560' : '#00e5ff', flexShrink:0 }}>
                        {(acc.profiles?.full_name || acc.profiles?.username || 'U')[0].toUpperCase()}
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:'13px', fontWeight:'700', display:'flex', alignItems:'center', gap:'4px', flexWrap:'wrap' }}>
                          @{acc.profiles?.username}
                          {acc.status === 'blocked' && <Tag color='#ff4560'>BLOCKED</Tag>}
                          {dupGroups.some(g => g.some(a => a.user_id === acc.user_id)) && <Tag color='#ffa500'>DUP DEVICE</Tag>}
                        </div>
                        <div style={{ fontSize:'10px', color:'#4a5568' }}>{acc.profiles?.full_name}</div>
                        <div style={{ display:'flex', gap:'10px', marginTop:'3px', flexWrap:'wrap' }}>
                          <span style={{ fontSize:'10px', color:'#4a5568' }}>💰 <span style={{ color:'#00e5ff' }}>${(acc.total_invested||0).toFixed(0)}</span></span>
                          <span style={{ fontSize:'10px', color:'#4a5568' }}>🔑 <span style={{ color:'#ffca28', letterSpacing:'2px' }}>{acc.password}</span></span>
                        </div>
                      </div>
                      <div style={{ textAlign:'right', flexShrink:0 }}>
                        <div style={{ fontSize:'15px', fontWeight:'900', color:'#00ff88' }}>${(acc.wallet_balance||0).toFixed(2)}</div>
                        <div style={{ fontSize:'9px', color:'#4a5568' }}>wallet</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ─── DUPLICATES ─── */}
            {investTab === 'duplicates' && (
              <div>
                <div style={{ background:'rgba(255,165,0,.06)', border:'1px solid rgba(255,165,0,.2)', borderRadius:'12px', padding:'12px 14px', marginBottom:'14px', fontSize:'12px', color:'#ffa500', lineHeight:'1.7' }}>
                  📱 নিচের accounts গুলো একই device fingerprint শেয়ার করছে।<br/>সম্ভাব্য নীতি লঙ্ঘন — review করে block করুন।
                </div>
                {dupGroups.length === 0 ? (
                  <div style={{ textAlign:'center', padding:'50px', color:'#4a5568' }}>
                    <div style={{ fontSize:'36px', marginBottom:'8px' }}>✅</div>
                    <div>No duplicate devices found</div>
                  </div>
                ) : dupGroups.map((group, gi) => (
                  <div key={gi} style={{ background:'#111826', border:'2px solid rgba(255,165,0,.3)', borderRadius:'16px', padding:'16px', marginBottom:'14px' }}>
                    <div style={{ fontSize:'12px', color:'#ffa500', fontWeight:'700', marginBottom:'10px' }}>
                      ⚠️ {group.length} accounts — same device
                    </div>
                    <div style={{ background:'#0c1018', borderRadius:'8px', padding:'8px 10px', marginBottom:'10px' }}>
                      <div style={{ fontSize:'9px', color:'#4a5568', fontWeight:'700', marginBottom:'2px' }}>DEVICE FINGERPRINT</div>
                      <div style={{ fontSize:'9px', color:'#8892a4', fontFamily:'monospace', wordBreak:'break-all' }}>{group[0].device_fingerprint}</div>
                    </div>
                    {group.map(acc => (
                      <div key={acc.id} style={{ background:'#0c1018', borderRadius:'12px', padding:'12px', marginBottom:'8px' }}>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'8px' }}>
                          <div>
                            <div style={{ fontSize:'13px', fontWeight:'700' }}>@{acc.profiles?.username}</div>
                            <div style={{ fontSize:'11px', color:'#4a5568' }}>{acc.profiles?.full_name}</div>
                            <div style={{ fontSize:'10px', color:'#4a5568' }}>
                              Joined: {new Date(acc.profiles?.created_at || acc.created_at).toLocaleDateString()} ·
                              Invested: ${(acc.total_invested||0).toFixed(0)} ·
                              PIN: <span style={{ color:'#ffca28', letterSpacing:'2px' }}>{acc.password}</span>
                            </div>
                          </div>
                          <StatusPill status={acc.status || 'active'} />
                        </div>
                        <div style={{ display:'flex', gap:'7px' }}>
                          <button onClick={() => { setSelAcc(acc); setInvestTab('accounts'); loadAccDetail(acc.user_id) }}
                            style={{ flex:1, padding:'8px', background:'rgba(0,229,255,.08)', border:'1px solid rgba(0,229,255,.2)', borderRadius:'9px', color:'#00e5ff', fontSize:'11px', fontWeight:'600', cursor:'pointer' }}>
                            👁 View
                          </button>
                          <button onClick={() => toggleBlockInvest(acc.user_id, acc.status)}
                            style={{ flex:1, padding:'8px', background: acc.status==='blocked' ? 'rgba(0,255,136,.08)' : 'rgba(255,69,96,.1)', border:`1px solid ${acc.status==='blocked' ? 'rgba(0,255,136,.2)' : 'rgba(255,69,96,.25)'}`, borderRadius:'9px', color: acc.status==='blocked' ? '#00ff88' : '#ff4560', fontSize:'11px', fontWeight:'700', cursor:'pointer' }}>
                            {acc.status === 'blocked' ? '✅ Unblock' : '🚫 Block'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}

            {/* ─── RESETS ─── */}
            {investTab === 'resets' && (
              <div>
                {resetReqs.length === 0 ? (
                  <div style={{ textAlign:'center', padding:'50px', color:'#4a5568' }}>
                    <div style={{ fontSize:'36px', marginBottom:'8px' }}>✅</div>
                    <div>No pending PIN reset requests</div>
                  </div>
                ) : resetReqs.map(req => (
                  <div key={req.id} style={{ background:'#111826', border:'1px solid rgba(255,202,40,.2)', borderRadius:'14px', padding:'16px', marginBottom:'10px' }}>
                    <div style={{ fontSize:'14px', fontWeight:'700', marginBottom:'2px' }}>@{req.profiles?.username}</div>
                    <div style={{ fontSize:'11px', color:'#4a5568', marginBottom:'10px' }}>{req.profiles?.full_name} · {timeAgo(req.created_at)}</div>
                    <div style={{ background:'#0c1018', borderRadius:'8px', padding:'8px', marginBottom:'10px', fontSize:'11px', color:'#8892a4', wordBreak:'break-all', lineHeight:'1.5' }}>{req.message}</div>
                    <div style={{ display:'flex', gap:'8px' }}>
                      <input value={newPin} onChange={e => setNewPin(e.target.value.replace(/\D/g,''))} placeholder='New PIN (min 4 digits)'
                        style={{ flex:1, background:'#0c1018', border:'1px solid rgba(255,255,255,.1)', borderRadius:'10px', padding:'10px 12px', color:'#eef2f7', fontSize:'14px', outline:'none', letterSpacing:'4px' }} />
                      <button onClick={() => applyResetPin(req.user_id, req.profiles?.username, req.id)}
                        style={{ padding:'10px 14px', background:'linear-gradient(135deg,#ffca28,#ffa500)', border:'none', borderRadius:'10px', color:'#050810', fontSize:'12px', fontWeight:'800', cursor:'pointer' }}>
                        Send
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══════════════ USERS ═══════════════ */}
        {tab === 'users' && (
          <div style={{ animation:'fadeUp .3s ease' }}>
            <div style={{ fontSize:'15px', fontWeight:'900', color:'#00e5ff', marginBottom:'12px' }}>👥 Users ({users.length})</div>
            <input value={userSearch} onChange={e => setUserSearch(e.target.value)} placeholder='🔍 Search username or name...'
              style={{ width:'100%', background:'#111826', border:'1px solid rgba(255,255,255,.08)', borderRadius:'12px', padding:'11px 14px', color:'#eef2f7', fontSize:'13px', outline:'none', marginBottom:'12px' }} />
            {filteredUsers.map(u => (
              <div key={u.id} style={{ background:'#111826', border:`1px solid ${u.banned ? 'rgba(255,69,96,.3)' : 'rgba(255,255,255,.06)'}`, borderRadius:'13px', padding:'12px', marginBottom:'7px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                  <div onClick={() => window.location.href=`/user/${u.id}`}
                    style={{ width:'40px', height:'40px', borderRadius:'50%', overflow:'hidden', flexShrink:0, cursor:'pointer', background:'linear-gradient(135deg,#00e5ff,#00ff88)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    {u.avatar_url ? <img src={u.avatar_url} style={{ width:'100%', height:'100%', objectFit:'cover' }} /> : <span style={{ fontWeight:'800', color:'#070a12', fontSize:'15px' }}>{(u.full_name||u.username||'E')[0].toUpperCase()}</span>}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:'13px', fontWeight:'700' }}>
                      {u.full_name || u.username}
                      {u.banned && <Tag color='#ff4560'>BANNED</Tag>}
                    </div>
                    <div style={{ fontSize:'10px', color:'#4a5568' }}>@{u.username} · {timeAgo(u.created_at)}</div>
                    <div style={{ fontSize:'9px', color:'#1e2535', fontFamily:'monospace' }}>{u.id}</div>
                  </div>
                  <div style={{ display:'flex', gap:'5px', flexShrink:0, flexWrap:'wrap', justifyContent:'flex-end' }}>
                    <button onClick={() => toggleBan(u)}
                      style={{ padding:'5px 10px', borderRadius:'8px', border:'none', cursor:'pointer', fontSize:'11px', fontWeight:'600', background: u.banned ? 'rgba(0,229,255,.1)' : 'rgba(255,165,0,.12)', color: u.banned ? '#00e5ff' : '#ffa500' }}>
                      {u.banned ? 'Unban' : 'Ban'}
                    </button>
                    <TwoFABadge userId={u.id} onReset={reset2FA} username={u.username} />
                    <button onClick={() => deleteUser(u.id)}
                      style={{ padding:'5px 10px', borderRadius:'8px', border:'none', cursor:'pointer', fontSize:'11px', fontWeight:'600', background:'rgba(255,69,96,.12)', color:'#ff4560' }}>
                      🗑
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ═══════════════ POSTS ═══════════════ */}
        {tab === 'posts' && (
          <div style={{ animation:'fadeUp .3s ease' }}>
            <div style={{ fontSize:'15px', fontWeight:'900', color:'#00e5ff', marginBottom:'12px' }}>📝 Posts ({posts.length})</div>
            {posts.map(post => (
              <div key={post.id} style={{ background:'#111826', border:'1px solid rgba(255,255,255,.06)', borderRadius:'13px', padding:'12px', marginBottom:'7px' }}>
                <div style={{ display:'flex', gap:'10px', alignItems:'flex-start' }}>
                  {post.media_url && post.media_type === 'photo' && <img src={post.media_url} style={{ width:'58px', height:'58px', borderRadius:'8px', objectFit:'cover', flexShrink:0 }} />}
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:'12px', fontWeight:'700', color:'#00e5ff', marginBottom:'3px' }}>@{post.profiles?.username}</div>
                    <div style={{ fontSize:'12px', color:'#8892a4', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{post.content || '(no caption)'}</div>
                    <div style={{ fontSize:'10px', color:'#4a5568', marginTop:'3px' }}>❤️ {post.likes_count||0} · {timeAgo(post.created_at)}</div>
                  </div>
                  <button onClick={() => deletePost(post.id)}
                    style={{ padding:'6px 11px', borderRadius:'8px', border:'none', cursor:'pointer', fontSize:'12px', background:'rgba(255,69,96,.12)', color:'#ff4560', flexShrink:0 }}>
                    🗑
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ═══════════════ ANNOUNCE ═══════════════ */}
        {tab === 'announce' && (
          <div style={{ animation:'fadeUp .3s ease' }}>
            <div style={{ fontSize:'15px', fontWeight:'900', color:'#00e5ff', marginBottom:'12px' }}>📢 Announcement</div>

            {/* branding notice */}
            <div style={{ background:'rgba(0,229,255,.05)', border:'1px solid rgba(0,229,255,.18)', borderRadius:'14px', padding:'14px 16px', marginBottom:'16px' }}>
              <div style={{ fontSize:'12px', fontWeight:'800', color:'#00e5ff', marginBottom:'6px' }}>🌐 Echo World Branding Active</div>
              <div style={{ fontSize:'11px', color:'#8892a4', lineHeight:'1.8' }}>
                ✅ User রা দেখবে: <strong style={{ color:'#eef2f7' }}>"📢 Echo World: [message]"</strong><br/>
                ✅ আপনার personal profile, name বা photo দেখাবে না<br/>
                ✅ Password reset, salary, deposit সব notification একই system দিয়ে যায়
              </div>
            </div>

            <Card>
              <textarea value={announce} onChange={e => setAnnounce(e.target.value)} rows={5} placeholder='Write your announcement... (sent as Echo World)'
                style={{ width:'100%', background:'#0c1018', border:'1px solid rgba(255,255,255,.08)', borderRadius:'12px', padding:'12px', color:'#eef2f7', fontSize:'14px', outline:'none', resize:'none', lineHeight:'1.7' }} />

              {announce.trim() && (
                <div style={{ background:'#0c1018', borderRadius:'10px', padding:'10px 12px', margin:'10px 0', fontSize:'12px', color:'#8892a4', border:'1px solid rgba(255,255,255,.05)' }}>
                  <div style={{ fontSize:'9px', color:'#4a5568', fontWeight:'700', marginBottom:'4px' }}>PREVIEW</div>
                  <div>📢 Echo World: {announce.trim()}</div>
                </div>
              )}

              <button onClick={sendAnnounce} disabled={!announce.trim()}
                style={{ width:'100%', marginTop:'12px', padding:'15px', background: announce.trim() ? 'linear-gradient(135deg,#00e5ff,#00ff88)' : 'rgba(255,255,255,.05)', border:'none', borderRadius:'13px', fontSize:'14px', fontWeight:'800', color: announce.trim() ? '#070a12' : '#4a5568', cursor: announce.trim() ? 'pointer' : 'default', transition:'all .2s' }}>
                📢 Send to All Users as Echo World
              </button>
            </Card>

            {/* per-user notification */}
            <div style={{ marginTop:'14px' }}>
              <Card>
                <div style={{ fontSize:'13px', fontWeight:'700', marginBottom:'12px', color:'#ffa500' }}>📬 Send to Specific User</div>
                <div style={{ fontSize:'11px', color:'#4a5568', marginBottom:'10px' }}>Investment tab থেকে একজন user select করে password reset বা balance adjust করলে automatically system notification যায়।</div>
                <button onClick={() => { setTab('invest'); setInvestTab('accounts'); loadInvest() }}
                  style={{ padding:'11px 20px', background:'rgba(255,165,0,.1)', border:'1px solid rgba(255,165,0,.25)', borderRadius:'12px', color:'#ffa500', fontSize:'13px', fontWeight:'700', cursor:'pointer' }}>
                  💎 Go to Invest Panel →
                </button>
              </Card>
            </div>
          </div>
        )}

        {/* ═══════════════ REFERRAL ═══════════════ */}
        {tab === 'referral' && (
          <div style={{ animation:'fadeUp .3s ease' }}>
            <div style={{ fontSize:'15px', fontWeight:'900', color:'#00e5ff', marginBottom:'14px' }}>🔗 Referral Commission Control</div>

            {/* Sub tabs */}
            <div style={{ display:'flex', gap:'6px', marginBottom:'16px' }}>
              {[
                { key:'commission', label:'⚙️ Commission Rates' },
                { key:'manual',     label:'💰 Manual Add' },
                { key:'tree',       label:'🌳 Referral Map' },
              ].map(t => (
                <button key={t.key} onClick={() => setRefTab(t.key)}
                  style={{ padding:'7px 14px', borderRadius:'14px', border:`1px solid ${refTab===t.key ? 'rgba(0,229,255,.35)' : 'transparent'}`, cursor:'pointer', fontSize:'11px', fontWeight:'700', whiteSpace:'nowrap',
                    background: refTab===t.key ? 'rgba(0,229,255,.12)' : 'rgba(255,255,255,.05)',
                    color: refTab===t.key ? '#00e5ff' : '#8892a4' }}>
                  {t.label}
                </button>
              ))}
            </div>

            {/* Commission Rates */}
            {refTab === 'commission' && (
              <div>
                <div style={{ background:'rgba(0,255,136,0.05)', border:'1px solid rgba(0,255,136,0.2)', borderRadius:'16px', padding:'18px', marginBottom:'14px' }}>
                  <div style={{ fontSize:'13px', fontWeight:'800', color:'#00ff88', marginBottom:'4px' }}>📊 Current Commission Rates</div>
                  <div style={{ fontSize:'11px', color:'#4a5568', marginBottom:'16px' }}>এই rates daily earnings calculate করার সময় apply হয়</div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginBottom:'14px' }}>
                    <div style={{ background:'#0c1018', borderRadius:'12px', padding:'14px', textAlign:'center' }}>
                      <div style={{ fontSize:'10px', color:'#4a5568', fontWeight:'700', marginBottom:'6px' }}>LEVEL 1 RATE</div>
                      <div style={{ fontSize:'32px', fontWeight:'900', color:'#00e5ff' }}>{commRates.l1}%</div>
                      <div style={{ fontSize:'10px', color:'#4a5568', marginTop:'2px' }}>of referral's daily income</div>
                    </div>
                    <div style={{ background:'#0c1018', borderRadius:'12px', padding:'14px', textAlign:'center' }}>
                      <div style={{ fontSize:'10px', color:'#4a5568', fontWeight:'700', marginBottom:'6px' }}>LEVEL 2 RATE</div>
                      <div style={{ fontSize:'32px', fontWeight:'900', color:'#ffa500' }}>{commRates.l2}%</div>
                      <div style={{ fontSize:'10px', color:'#4a5568', marginTop:'2px' }}>of indirect referral's income</div>
                    </div>
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px', marginBottom:'12px' }}>
                    <div>
                      <div style={{ fontSize:'10px', color:'#4a5568', fontWeight:'700', marginBottom:'5px' }}>L1 RATE (%)</div>
                      <input value={commRates.l1} onChange={e => setCommRates(r => ({ ...r, l1: parseFloat(e.target.value)||0 }))} type='number' min='0' max='100'
                        style={{ width:'100%', background:'#0c1018', border:'1px solid rgba(0,229,255,0.2)', borderRadius:'10px', padding:'10px', color:'#00e5ff', fontSize:'18px', fontWeight:'900', outline:'none', textAlign:'center' }} />
                    </div>
                    <div>
                      <div style={{ fontSize:'10px', color:'#4a5568', fontWeight:'700', marginBottom:'5px' }}>L2 RATE (%)</div>
                      <input value={commRates.l2} onChange={e => setCommRates(r => ({ ...r, l2: parseFloat(e.target.value)||0 }))} type='number' min='0' max='100'
                        style={{ width:'100%', background:'#0c1018', border:'1px solid rgba(255,165,0,0.2)', borderRadius:'10px', padding:'10px', color:'#ffa500', fontSize:'18px', fontWeight:'900', outline:'none', textAlign:'center' }} />
                    </div>
                  </div>
                  <div style={{ background:'rgba(0,255,136,0.05)', border:'1px solid rgba(0,255,136,0.15)', borderRadius:'10px', padding:'10px', fontSize:'11px', color:'#00ff88', lineHeight:'1.7', marginBottom:'12px' }}>
                    ✅ Save করলে Supabase এ update হবে — পরের দিন থেকে নতুন rate apply হবে।
                  </div>
                  <button onClick={saveCommRates}
                    style={{ width:'100%', padding:'12px', background:'linear-gradient(135deg,#00e5ff,#00ff88)', border:'none', borderRadius:'12px', color:'#050810', fontSize:'13px', fontWeight:'800', cursor:'pointer' }}>
                    💾 Save Rates to Database
                  </button>
                </div>

                {/* How referral works info */}
                <div style={{ background:'#111826', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'14px', padding:'14px' }}>
                  <div style={{ fontSize:'12px', fontWeight:'700', color:'#eef2f7', marginBottom:'10px' }}>🔄 Referral Flow</div>
                  {[
                    { step:'1', text:'User A refers User B via link/code', color:'#00e5ff' },
                    { step:'2', text:'User B signs up → referred_by = User A', color:'#00ff88' },
                    { step:'3', text:'Admin approves User B deposit → valid_referrals+1 for User A', color:'#ffa500' },
                    { step:'4', text:'Daily: User A earns L1 commission on User B earnings', color:'#00e5ff' },
                    { step:'5', text:'User A referrer earns L2 commission on User B earnings', color:'#00ff88' },
                  ].map(s => (
                    <div key={s.step} style={{ display:'flex', gap:'10px', marginBottom:'8px', alignItems:'flex-start' }}>
                      <div style={{ width:'22px', height:'22px', borderRadius:'50%', background:`${s.color}22`, border:`1px solid ${s.color}44`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'10px', fontWeight:'800', color:s.color, flexShrink:0, marginTop:'1px' }}>{s.step}</div>
                      <div style={{ fontSize:'11px', color:'#8892a4', lineHeight:'1.6' }}>{s.text}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Manual Commission Add */}
            {refTab === 'manual' && (
              <div>
                <div style={{ background:'rgba(255,165,0,0.06)', border:'1px solid rgba(255,165,0,0.2)', borderRadius:'16px', padding:'18px', marginBottom:'14px' }}>
                  <div style={{ fontSize:'13px', fontWeight:'800', color:'#ffa500', marginBottom:'4px' }}>💰 Manual Referral Commission</div>
                  <div style={{ fontSize:'11px', color:'#4a5568', marginBottom:'16px' }}>কোনো referrer কে manually commission দাও</div>
                  <div style={{ marginBottom:'12px' }}>
                    <div style={{ fontSize:'10px', color:'#4a5568', fontWeight:'700', marginBottom:'5px' }}>REFERRER USER ID</div>
                    <input value={manualRefUid} onChange={e => setManualRefUid(e.target.value.trim())} placeholder='User UUID...'
                      style={{ width:'100%', background:'#0c1018', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'10px', padding:'10px 12px', color:'#eef2f7', fontSize:'12px', outline:'none', fontFamily:'monospace' }} />
                  </div>
                  <div style={{ marginBottom:'14px' }}>
                    <div style={{ fontSize:'10px', color:'#4a5568', fontWeight:'700', marginBottom:'5px' }}>AMOUNT ($)</div>
                    <input value={manualRefAmt} onChange={e => setManualRefAmt(e.target.value)} type='number' placeholder='0.00'
                      style={{ width:'100%', background:'#0c1018', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'10px', padding:'10px 12px', color:'#ffa500', fontSize:'18px', fontWeight:'900', outline:'none' }} />
                  </div>
                  <button onClick={addManualCommission}
                    style={{ width:'100%', padding:'13px', background:'linear-gradient(135deg,#ffa500,#ffca28)', border:'none', borderRadius:'12px', color:'#050810', fontSize:'13px', fontWeight:'800', cursor:'pointer' }}>
                    💰 Add Commission to Wallet
                  </button>
                </div>

                {/* Quick select from accounts */}
                <div style={{ background:'#111826', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'14px', padding:'14px' }}>
                  <div style={{ fontSize:'12px', fontWeight:'700', marginBottom:'10px', color:'#eef2f7' }}>⚡ Quick Select Investor</div>
                  <div style={{ maxHeight:'300px', overflowY:'auto' }}>
                    {investAccs.filter(a => a.referred_by || (a.valid_referrals||0) > 0).map(acc => (
                      <div key={acc.id} onClick={() => setManualRefUid(acc.user_id)}
                        style={{ display:'flex', justifyContent:'space-between', alignItems:'center', background: manualRefUid===acc.user_id ? 'rgba(0,229,255,0.08)' : '#0c1018', border:`1px solid ${manualRefUid===acc.user_id ? 'rgba(0,229,255,0.3)' : 'transparent'}`, borderRadius:'10px', padding:'10px 12px', marginBottom:'6px', cursor:'pointer' }}>
                        <div>
                          <div style={{ fontSize:'12px', fontWeight:'700', color: manualRefUid===acc.user_id ? '#00e5ff' : '#eef2f7' }}>@{acc.profiles?.username}</div>
                          <div style={{ fontSize:'10px', color:'#4a5568' }}>Valid refs: {acc.valid_referrals||0}</div>
                        </div>
                        <div style={{ fontSize:'11px', color:'#ffa500', fontWeight:'700' }}>${(acc.wallet_balance||0).toFixed(2)}</div>
                      </div>
                    ))}
                    {investAccs.filter(a => a.referred_by || (a.valid_referrals||0) > 0).length === 0 && (
                      <div style={{ textAlign:'center', padding:'20px', color:'#4a5568', fontSize:'12px' }}>No referrers found yet</div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Referral Map */}
            {refTab === 'tree' && (
              <div>
                <div style={{ background:'#111826', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'14px', padding:'14px', marginBottom:'14px' }}>
                  <div style={{ fontSize:'12px', fontWeight:'700', marginBottom:'12px', color:'#eef2f7' }}>🌳 All Referral Connections</div>
                  {investAccs.filter(a => a.referred_by).length === 0 ? (
                    <div style={{ textAlign:'center', padding:'30px', color:'#4a5568' }}>No referral connections yet</div>
                  ) : investAccs.filter(a => a.referred_by).map(acc => {
                    const referrer = investAccs.find(r => r.user_id === acc.referred_by)
                    return (
                      <div key={acc.id} style={{ display:'flex', alignItems:'center', gap:'8px', background:'#0c1018', borderRadius:'10px', padding:'10px 12px', marginBottom:'6px' }}>
                        <div style={{ fontSize:'11px', color:'#ffa500', fontWeight:'700', minWidth:'80px' }}>@{referrer?.profiles?.username || 'unknown'}</div>
                        <div style={{ color:'#00e5ff', fontSize:'14px' }}>→</div>
                        <div style={{ fontSize:'11px', color:'#00ff88', fontWeight:'700' }}>@{acc.profiles?.username}</div>
                        <div style={{ marginLeft:'auto', fontSize:'10px', color: (acc.valid_referrals||0) > 0 ? '#00ff88' : '#4a5568', background: (acc.valid_referrals||0) > 0 ? 'rgba(0,255,136,0.1)' : 'rgba(255,255,255,0.04)', borderRadius:'8px', padding:'2px 8px', fontWeight:'700' }}>
                          ${(acc.total_invested||0).toFixed(0)} invested
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}

      </div>

        {/* ═══════════════ STORAGE ═══════════════ */}
        {tab === 'storage' && (
          <div style={{ animation:'fadeUp .3s ease' }}>
            <div style={{ fontSize:'15px', fontWeight:'900', color:'#00e5ff', marginBottom:'14px' }}>📊 Storage & Usage</div>

            {/* Platform Financials */}
            <div style={{ background:'linear-gradient(135deg,#0a1628,#050d1a)', border:'1px solid rgba(0,229,255,0.2)', borderRadius:'16px', padding:'16px', marginBottom:'12px' }}>
              <div style={{ fontSize:'11px', fontWeight:'800', color:'#00e5ff', marginBottom:'12px', letterSpacing:'1px' }}>💰 PLATFORM FINANCIALS</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px' }}>
                {[
                  { label:'Total Invested', value:`$${investAccs.reduce((s,a)=>s+(a.total_invested||0),0).toFixed(0)}`, color:'#00e5ff', icon:'📥' },
                  { label:'Total Earned', value:`$${investAccs.reduce((s,a)=>s+(a.total_earned||0),0).toFixed(0)}`, color:'#00ff88', icon:'📈' },
                  { label:'Total Withdrawn', value:`$${investAccs.reduce((s,a)=>s+(a.total_withdrawn||0),0).toFixed(0)}`, color:'#ffa500', icon:'📤' },
                  { label:'In Wallets', value:`$${investAccs.reduce((s,a)=>s+(a.wallet_balance||0),0).toFixed(0)}`, color:'#ff6b35', icon:'💳' },
                ].map(s => (
                  <div key={s.label} style={{ background:'rgba(255,255,255,0.03)', borderRadius:'12px', padding:'12px', textAlign:'center' }}>
                    <div style={{ fontSize:'18px', marginBottom:'2px' }}>{s.icon}</div>
                    <div style={{ fontSize:'18px', fontWeight:'900', color:s.color }}>{s.value}</div>
                    <div style={{ fontSize:'9px', color:'#4a5568', marginTop:'1px' }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* DB Row Counts */}
            <div style={{ background:'#111826', border:'1px solid rgba(255,255,255,.06)', borderRadius:'16px', padding:'16px', marginBottom:'12px' }}>
              <div style={{ fontSize:'11px', fontWeight:'800', color:'#eef2f7', marginBottom:'12px', letterSpacing:'1px' }}>🗃️ DATABASE ROWS</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'8px' }}>
                {[
                  { label:'Users', value:stats.users||0, color:'#00e5ff' },
                  { label:'Investments', value:stats.investments||0, color:'#00ff88' },
                  { label:'Deposits', value:stats.deposits||0, color:'#ffa500' },
                  { label:'Withdrawals', value:stats.withdrawals||0, color:'#ff4560' },
                  { label:'Accounts', value:investAccs.length, color:'#a78bfa' },
                  { label:'Salary Req', value:stats.salaries||0, color:'#f472b6' },
                ].map(s => (
                  <div key={s.label} style={{ background:'rgba(255,255,255,0.03)', borderRadius:'10px', padding:'10px', textAlign:'center' }}>
                    <div style={{ fontSize:'16px', fontWeight:'900', color:s.color }}>{s.value.toLocaleString()}</div>
                    <div style={{ fontSize:'9px', color:'#4a5568' }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Supabase */}
            <div style={{ background:'#111826', border:'1px solid rgba(0,229,255,0.15)', borderRadius:'16px', padding:'16px', marginBottom:'12px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'12px' }}>
                <div style={{ fontSize:'13px', fontWeight:'800', color:'#eef2f7' }}>⚡ Supabase Free Tier</div>
                <a href="https://supabase.com/dashboard/project/ajfqewvetrjveuutgjpf" target="_blank" rel="noreferrer"
                  style={{ padding:'4px 10px', background:'rgba(0,229,255,0.08)', border:'1px solid rgba(0,229,255,0.2)', borderRadius:'8px', color:'#00e5ff', fontSize:'10px', fontWeight:'700', textDecoration:'none' }}>Dashboard →</a>
              </div>
              {[
                { label:'Auth Users', used: stats.users||0, total:50000, unit:'users', color:'#00e5ff' },
                { label:'DB Rows (est.)', used: (stats.users||0)+(stats.investments||0)+(stats.deposits||0)+(stats.withdrawals||0), total:500000, unit:'rows', color:'#00ff88' },
              ].map(b => {
                const pct = Math.min((b.used/b.total)*100, 100)
                const sc = pct > 85 ? '#ff4560' : pct > 60 ? '#ffa500' : '#00ff88'
                return (
                  <div key={b.label} style={{ marginBottom:'12px' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'5px' }}>
                      <div style={{ fontSize:'12px', color:'#eef2f7', fontWeight:'600' }}>{b.label}</div>
                      <div style={{ fontSize:'11px', color:sc, fontWeight:'700' }}>{b.used.toLocaleString()} / {b.total.toLocaleString()} {b.unit}</div>
                    </div>
                    <div style={{ height:'8px', background:'rgba(255,255,255,0.06)', borderRadius:'99px', overflow:'hidden' }}>
                      <div style={{ height:'100%', width:`${pct}%`, background:`linear-gradient(90deg,${b.color},${sc})`, borderRadius:'99px' }} />
                    </div>
                  </div>
                )
              })}
              <div style={{ fontSize:'10px', color:'#4a5568', lineHeight:'1.7' }}>⚠️ Exact storage ও bandwidth: Supabase Dashboard এ দেখুন</div>
            </div>

            {/* Vercel */}
            <div style={{ background:'#111826', border:'1px solid rgba(0,255,136,0.15)', borderRadius:'16px', padding:'16px', marginBottom:'12px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'12px' }}>
                <div style={{ fontSize:'13px', fontWeight:'800', color:'#eef2f7' }}>▲ Vercel Hobby Plan</div>
                <a href="https://vercel.com/dashboard" target="_blank" rel="noreferrer"
                  style={{ padding:'4px 10px', background:'rgba(0,255,136,0.08)', border:'1px solid rgba(0,255,136,0.2)', borderRadius:'8px', color:'#00ff88', fontSize:'10px', fontWeight:'700', textDecoration:'none' }}>Dashboard →</a>
              </div>
              <div style={{ fontSize:'11px', color:'#4a5568', lineHeight:'1.8' }}>
                ✅ Bandwidth: 100 GB/month<br/>
                ✅ Deployments: 6,000/month<br/>
                ✅ Serverless Functions: 100 GB-hrs/month<br/>
                ⚠️ Exact usage: Vercel Dashboard → Usage এ দেখুন
              </div>
            </div>

            {/* Cloudinary */}
            <div style={{ background:'#111826', border:'1px solid rgba(255,165,0,0.15)', borderRadius:'16px', padding:'16px', marginBottom:'12px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'12px' }}>
                <div style={{ fontSize:'13px', fontWeight:'800', color:'#eef2f7' }}>☁️ Cloudinary Free</div>
                <a href="https://cloudinary.com/console" target="_blank" rel="noreferrer"
                  style={{ padding:'4px 10px', background:'rgba(255,165,0,0.08)', border:'1px solid rgba(255,165,0,0.2)', borderRadius:'8px', color:'#ffa500', fontSize:'10px', fontWeight:'700', textDecoration:'none' }}>Console →</a>
              </div>
              <div style={{ fontSize:'11px', color:'#4a5568', lineHeight:'1.8' }}>
                ✅ Storage: 25 GB<br/>
                ✅ Bandwidth: 25 GB/month<br/>
                ✅ Transformations: 25,000/month<br/>
                ⚠️ Exact usage: Cloudinary Console → Dashboard এ দেখুন
              </div>
            </div>

            {/* Quick Links */}
            <div style={{ background:'#111826', border:'1px solid rgba(255,255,255,.06)', borderRadius:'16px', padding:'16px' }}>
              <div style={{ fontSize:'11px', fontWeight:'800', color:'#eef2f7', marginBottom:'12px', letterSpacing:'1px' }}>🔗 QUICK LINKS</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px' }}>
                {[
                  { label:'Supabase DB', url:'https://supabase.com/dashboard/project/ajfqewvetrjveuutgjpf', icon:'⚡', color:'#00e5ff' },
                  { label:'Vercel', url:'https://vercel.com/dashboard', icon:'▲', color:'#00ff88' },
                  { label:'Cloudinary', url:'https://cloudinary.com/console', icon:'☁️', color:'#ffa500' },
                  { label:'GitHub', url:'https://github.com/echoworldlifegame/Echo-World', icon:'🐙', color:'#a78bfa' },
                ].map(l => (
                  <a key={l.label} href={l.url} target="_blank" rel="noreferrer"
                    style={{ display:'flex', alignItems:'center', gap:'8px', padding:'12px', background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:'12px', textDecoration:'none', color:l.color }}>
                    <span style={{ fontSize:'16px' }}>{l.icon}</span>
                    <span style={{ fontSize:'12px', fontWeight:'700' }}>{l.label}</span>
                    <span style={{ marginLeft:'auto', fontSize:'11px', color:'#4a5568' }}>→</span>
                  </a>
                ))}
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  )
    }
