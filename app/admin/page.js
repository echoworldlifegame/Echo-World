'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const ADMIN_EMAIL = 'mdakibgoodboy4@gmail.com'
const ADMIN_EMAIL = 'hamja01782@gmail.com'

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

  /* coins */
  const [coinPurchases,  setCoinPurchases]  = useState([])
  const [coinFilter,     setCoinFilter]     = useState('all')
  const [coinSearch,     setCoinSearch]     = useState('')
  const [coinDebug,      setCoinDebug]      = useState(null)
  const [adminAlerts,    setAdminAlerts]    = useState([])
  const [grantUserQ,     setGrantUserQ]     = useState('')
  const [grantAmt,       setGrantAmt]       = useState('')
  const [grantUserResult,setGrantUserResult]= useState(null)
  const [grantUserPicked,setGrantUserPicked]= useState(null)

  /* user detail modal */
  const [selUser,      setSelUser]      = useState(null)  // selected user for modal
  const [selUserInvAcc,setSelUserInvAcc]= useState(null)  // invest account
  const [userModalTab, setUserModalTab] = useState('info') // info|security|password
  const [newLoginPass, setNewLoginPass] = useState('')
  const [passResetLoading, setPassResetLoading] = useState(false)
  const [twoFaCancelLoading, setTwoFaCancelLoading] = useState(false)

  /* live subscriptions */
  const [liveSubs,     setLiveSubs]     = useState([])
  const [liveSearch,   setLiveSearch]   = useState('')
  const [liveFilter,   setLiveFilter]   = useState('all') // all|pending|active|rejected|free
  const [freeUserId,   setFreeUserId]   = useState('')
  const [freeUserSearch, setFreeUserSearch] = useState('')
  const [freeUserResults, setFreeUserResults] = useState([])

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
      await loadCoinPurchases()   // load on init so badge shows
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
    const { data: profiles } = await supabase
      .from('profiles').select('*').order('created_at', { ascending: false }).limit(300)
    if (!profiles) { setUsers([]); return }
    // auth.users থেকে email আনো — admin API route দিয়ে
    // এখন profiles এ email column যোগ করো Supabase এ
    // অথবা profiles.email সরাসরি save করো signup এ
    setUsers(profiles || [])
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
    const amt = parseFloat(adjAmt)
    if (isNaN(amt) || amt <= 0) { alert('Valid amount দাও'); return }
    try {
      // ALWAYS fetch fresh balance from DB — never trust stale state
      // Atomic adjust via DB function
      const { data: result, error: rpcErr } = await supabase.rpc('safe_adjust_balance', {
        p_user_id: selAcc.user_id,
        p_amount:  amt,
        p_type:    adjType,
      })
      if (rpcErr) throw rpcErr
      if (!result?.success) throw new Error(result?.error || 'Adjust failed')

      const prevBal = parseFloat(result.previous_balance)
      const newBal  = parseFloat(result.new_balance)

      // Also update total_earned for 'add' only
      if (adjType === 'add') {
        const { data: ea } = await supabase.from('investment_accounts')
          .select('total_earned').eq('user_id', selAcc.user_id).single()
        const newEarned = parseFloat((parseFloat(ea?.total_earned||0) + amt).toFixed(4))
        await supabase.from('investment_accounts')
          .update({ total_earned: newEarned }).eq('user_id', selAcc.user_id)
      }

      const today = new Date().toISOString().split('T')[0]
      await supabase.from('daily_earnings').insert({
        user_id: selAcc.user_id, investment_id: null,
        amount: adjType === 'add' ? amt : -amt,
        type: 'admin_adjustment', date: today,
        note: `Admin ${adjType}: $${prevBal.toFixed(2)} → $${newBal.toFixed(2)}`
      })
      await sendSystemNotif(selAcc.user_id,
        adjType === 'add'
          ? `✅ Admin আপনার wallet এ $${amt.toFixed(2)} যোগ করেছে। নতুন balance: $${newBal.toFixed(2)}`
          : `⚠️ Admin আপনার wallet থেকে $${amt.toFixed(2)} কেটেছে। নতুন balance: $${newBal.toFixed(2)}`
      )
      setInvestAccs(prev => prev.map(a =>
        a.user_id === selAcc.user_id ? { ...a, wallet_balance: newBal } : a
      ))
      setSelAcc(p => ({ ...p, wallet_balance: newBal }))
      setAdjAmt('')
      alert(`✅ Done!\n${adjType==='add'?'+':'-'}$${amt.toFixed(2)}\nPrevious: $${prevBal.toFixed(2)}\nNew balance: $${newBal.toFixed(2)}`)
    } catch(e) {
      alert('Error: ' + e.message)
      console.error(e)
    }
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

  /* ── user detail modal open ── */
  const openUserDetail = async (u) => {
    setSelUser(u)
    setUserModalTab('info')
    setNewLoginPass('')
    // invest account load করো
    const { data: invAcc } = await supabase
      .from('investment_accounts')
      .select('*')
      .eq('user_id', u.id)
      .maybeSingle()
    setSelUserInvAcc(invAcc || null)
    // email load করো admin API থেকে
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/admin/get-user-email?userId=' + u.id, {
        headers: { 'Authorization': 'Bearer ' + session?.access_token }
      })
      if (res.ok) {
        const { email, last_sign_in, created_at } = await res.json()
        setSelUser(prev => ({ ...prev, email, last_sign_in, auth_created_at: created_at }))
      }
    } catch(e) { console.log('email fetch error:', e) }
  }

  /* ── 2FA cancel by admin ── */
  const cancelTwoFa = async () => {
    if (!selUser) return
    if (!confirm(`@${selUser.username} এর 2FA বাতিল করবে?`)) return
    setTwoFaCancelLoading(true)
    await supabase.from('investment_accounts')
      .update({ totp_enabled: false, totp_secret: null })
      .eq('user_id', selUser.id)
    await sendSystemNotif(selUser.id, 'আপনার Echo Invest 2FA Admin কর্তৃক বাতিল করা হয়েছে। নিরাপত্তার জন্য আবার চালু করুন।')
    setSelUserInvAcc(p => p ? { ...p, totp_enabled: false, totp_secret: null } : p)
    setTwoFaCancelLoading(false)
    alert(`✅ @${selUser.username} এর 2FA বাতিল হয়েছে`)
  }

  /* ── login password change by admin ── */
  const changeLoginPassword = async () => {
    if (!selUser || !newLoginPass || newLoginPass.length < 6) {
      alert('কমপক্ষে ৬ অক্ষরের password দাও'); return
    }
    if (!confirm(`@${selUser.username} এর login password পরিবর্তন করবে?`)) return
    setPassResetLoading(true)
    try {
      // Supabase Admin API দিয়ে password change — Next.js API route এ করতে হবে
      const res = await fetch('/api/admin/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selUser.id, newPassword: newLoginPass })
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Failed')
      await sendSystemNotif(selUser.id, 'আপনার Echo World login password Admin কর্তৃক পরিবর্তন করা হয়েছে। নিরাপদ থাকতে নিজে পরিবর্তন করুন।')
      setNewLoginPass('')
      alert(`✅ @${selUser.username} এর password পরিবর্তন হয়েছে`)
    } catch(e) {
      alert('Error: ' + e.message)
    }
    setPassResetLoading(false)
  }

  /* ── password reset email ── */
  const sendPasswordResetEmail = async () => {
    if (!selUser?.email) { alert('User এর email নেই'); return }
    await supabase.auth.resetPasswordForEmail(selUser.email, {
      redirectTo: `${window.location.origin}/reset-password`
    })
    await sendSystemNotif(selUser.id, 'আপনার email এ password reset link পাঠানো হয়েছে। Email চেক করুন।')
    alert(`✅ Password reset email পাঠানো হয়েছে ${selUser.email} এ`)
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

  /* ── coin purchases ── */
  const loadCoinPurchases = async () => {
    const debug = {}

    // Load purchases
    const { data: purchases, error: pErr } = await supabase
      .from('coin_purchases')
      .select('*')
      .order('created_at', { ascending: false })

    debug.purchaseError = pErr?.message || null
    debug.purchaseCount = purchases?.length || 0
    debug.rawFirst = purchases?.[0] || null

    if (pErr) {
      console.error('coin_purchases error:', pErr)
      setCoinPurchases([])
      setCoinDebug(debug)
      return
    }

    if (purchases && purchases.length > 0) {
      const uids = [...new Set(purchases.map(p => p.user_id).filter(Boolean))]
      debug.uids = uids

      const { data: profs, error: profErr } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url, coin_balance')
        .in('id', uids)

      debug.profileError = profErr?.message || null
      debug.profileCount = profs?.length || 0

      const profMap = {}
      if (profs) profs.forEach(p => { profMap[p.id] = p })
      const merged = purchases.map(p => ({ ...p, profiles: profMap[p.user_id] || null }))
      setCoinPurchases(merged)
    } else {
      setCoinPurchases([])
    }

    setCoinDebug(debug)

    const { data: alerts } = await supabase
      .from('admin_alerts').select('*').eq('read', false)
      .order('created_at', { ascending: false }).limit(20)
    setAdminAlerts(alerts || [])
  }

  const approveCoin = async (purchase) => {
    try {
      // CRITICAL: Re-fetch from DB to check status — prevent double approval
      const { data: freshPurchase } = await supabase.from('coin_purchases')
        .select('status').eq('id', purchase.id).single()
      if (freshPurchase?.status === 'approved') {
        alert('⚠️ এই purchase আগেই approve হয়েছে! Double approve হবে না।')
        await loadCoinPurchases(); return
      }
      // First update status to prevent race condition
      const { error: statusErr } = await supabase.from('coin_purchases').update({
        status: 'approved', approved_by: user.id, updated_at: new Date().toISOString()
      }).eq('id', purchase.id).eq('status', 'pending') // only update if still pending
      if (statusErr) throw statusErr

      // Now fetch fresh coin balance and add coins
      const { data: prof } = await supabase.from('profiles')
        .select('coin_balance').eq('id', purchase.user_id).single()
      const curBal = parseInt(prof?.coin_balance || 0)
      const newBal = curBal + parseInt(purchase.coins)
      const { error: balErr } = await supabase.from('profiles')
        .update({ coin_balance: newBal }).eq('id', purchase.user_id)
      if (balErr) throw balErr

      // Check if transaction already logged
      const { data: existingTx } = await supabase.from('coin_transactions')
        .select('id').eq('ref_id', purchase.id).maybeSingle()
      if (!existingTx) {
        await supabase.from('coin_transactions').insert({
          user_id: purchase.user_id, amount: parseInt(purchase.coins),
          type: 'purchase', ref_id: purchase.id,
          note: `${purchase.coins} coins purchased — ${purchase.usdt_amount} USDT | Prev: ${curBal} → New: ${newBal}`
        })
      }
      await sendSystemNotif(purchase.user_id,
        `🪙 তোমার ${purchase.coins} Coins approve হয়েছে! নতুন Balance: ${newBal} coins`)
      alert(`✅ Approved! +${purchase.coins} coins
User balance: ${curBal} → ${newBal}`)
      await loadCoinPurchases()
    } catch(e) { alert('Error: ' + e.message); console.error(e) }
  }

  const rejectCoin = async (purchase) => {
    await supabase.from('coin_purchases').update({
      status: 'rejected', updated_at: new Date().toISOString()
    }).eq('id', purchase.id)
    await sendSystemNotif(purchase.user_id,
      `❌ তোমার Coin purchase reject হয়েছে। সঠিক TRX hash বা screenshot দিয়ে আবার চেষ্টা করো।`)
    await loadCoinPurchases()
  }

  const grantCoins = async (userId, amount) => {
    if (!userId || !amount) return
    const amt = parseInt(amount)
    if (isNaN(amt) || amt <= 0) { alert('Valid amount দাও'); return }
    try {
      // Fresh balance from DB
      const { data: prof } = await supabase.from('profiles')
        .select('coin_balance').eq('id', userId).single()
      const curBal = parseInt(prof?.coin_balance || 0)
      const newBal = curBal + amt
      const { error } = await supabase.from('profiles')
        .update({ coin_balance: newBal }).eq('id', userId)
      if (error) throw error
      await supabase.from('coin_transactions').insert({
        user_id: userId, amount: amt,
        type: 'admin_grant',
        note: `Admin grant | Prev: ${curBal} → New: ${newBal}`
      })
      await sendSystemNotif(userId,
        `🎁 Admin তোমাকে ${amt} Coins দিয়েছে! নতুন Balance: ${newBal} coins`)
      alert(`✅ ${amt} Coins দেওয়া হয়েছে!
Previous: ${curBal}
New: ${newBal}`)
      await loadCoinPurchases()
    } catch(e) { alert('Error: ' + e.message) }
  }

  /* ── live subscriptions ── */
  const loadLiveSubs = async () => {
    // Admin bypass: use service-level query without RLS filter
    const { data, error } = await supabase
      .from('live_subscriptions')
      .select('*, profiles(id, username, full_name, avatar_url)')
      .order('created_at', { ascending: false })
    if (error) console.error('loadLiveSubs error:', error)
    setLiveSubs(data || [])
  }

  const approveLive = async (sub) => {
    const expires = new Date()
    expires.setMonth(expires.getMonth() + 1)
    const { error } = await supabase.from('live_subscriptions').update({
      status: 'active',
      expires_at: expires.toISOString(),
      granted_by: user.id,
      updated_at: new Date().toISOString()
    }).eq('id', sub.id)
    if (error) { alert('Error: ' + error.message); return }
    await sendSystemNotif(sub.user_id, '✅ তোমার Live subscription activate হয়েছে! এখন Live শুরু করতে পারবে।')
    await loadLiveSubs()
  }

  const rejectLive = async (sub) => {
    const { error } = await supabase.from('live_subscriptions').update({
      status: 'rejected',
      updated_at: new Date().toISOString()
    }).eq('id', sub.id)
    if (error) { alert('Error: ' + error.message); return }
    await sendSystemNotif(sub.user_id, '❌ তোমার Live payment verify হয়নি। সঠিক TRX hash দিয়ে আবার চেষ্টা করো বা Support এ যোগাযোগ করো।')
    await loadLiveSubs()
  }

  const revokeLive = async (sub) => {
    const { error } = await supabase.from('live_subscriptions').update({
      status: 'expired',
      updated_at: new Date().toISOString()
    }).eq('id', sub.id)
    if (error) { alert('Error: ' + error.message); return }
    await sendSystemNotif(sub.user_id, '⚠️ তোমার Live access revoke করা হয়েছে।')
    await loadLiveSubs()
  }

  const grantFreeLive = async (userId, months = 1) => {
    if (!userId) return
    const expires = new Date()
    expires.setMonth(expires.getMonth() + months)
    // Check existing
    const { data: existing } = await supabase.from('live_subscriptions')
      .select('id').eq('user_id', userId).in('status', ['active','free']).limit(1)
    if (existing && existing.length > 0) {
      await supabase.from('live_subscriptions').update({
        status: 'free', expires_at: expires.toISOString(),
        granted_by: user.id, note: `Admin granted ${months} month(s) free live`,
        updated_at: new Date().toISOString()
      }).eq('id', existing[0].id)
    } else {
      await supabase.from('live_subscriptions').insert({
        user_id: userId, status: 'free',
        expires_at: expires.toISOString(),
        granted_by: user.id,
        note: `Admin granted ${months} month(s) free live`,
        amount_usdt: 0,
        trx_hash: 'admin_grant'
      })
    }
    await sendSystemNotif(userId, `🎁 Admin তোমাকে ${months} মাসের Free Live access দিয়েছে! এখনই Live শুরু করো।`)
    setFreeUserId(''); setFreeUserSearch(''); setFreeUserResults([])
    await loadLiveSubs()
    alert(`✅ ${months} মাসের Free Live দেওয়া হয়েছে!`)
  }

  const searchFreeUser = (q) => {
    setFreeUserSearch(q)
    if (q.length < 2) { setFreeUserResults([]); return }
    // Debounced async search - don't block input
    clearTimeout(window._adminSearchTimer)
    window._adminSearchTimer = setTimeout(async () => {
      const { data } = await supabase.from('profiles')
        .select('id, username, full_name, avatar_url')
        .or(`username.ilike.%${q}%,full_name.ilike.%${q}%`)
        .limit(8)
      setFreeUserResults(data || [])
    }, 300)
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
      {/* ═══════════════ USER DETAIL MODAL ═══════════════ */}
      {selUser && (
        <div style={{ position:'fixed', inset:0, zIndex:999, background:'rgba(0,0,0,.85)', display:'flex', alignItems:'flex-end', justifyContent:'center' }}
          onClick={e=>{ if(e.target===e.currentTarget) setSelUser(null) }}>
          <div style={{ width:'100%', maxWidth:480, background:'#0d1117', borderRadius:'24px 24px 0 0', border:'1px solid rgba(0,229,255,.15)', maxHeight:'90vh', overflowY:'auto', animation:'fadeUp .25s ease' }}>

            {/* Modal Header */}
            <div style={{ padding:'16px', borderBottom:'1px solid rgba(255,255,255,.06)', display:'flex', alignItems:'center', gap:12 }}>
              <div style={{ width:48, height:48, borderRadius:'50%', overflow:'hidden', background:'linear-gradient(135deg,#00e5ff,#00ff88)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                {selUser.avatar_url ? <img src={selUser.avatar_url} style={{ width:'100%', height:'100%', objectFit:'cover' }}/> : <span style={{ fontWeight:'900', color:'#070a12', fontSize:'18px' }}>{(selUser.full_name||selUser.username||'E')[0].toUpperCase()}</span>}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:15, fontWeight:800, color:'#eef2f7' }}>{selUser.full_name || selUser.username}</div>
                <div style={{ fontSize:11, color:'#4a5568' }}>@{selUser.username}</div>
                <div style={{ fontSize:9, color:'#00e5ff', fontFamily:'monospace' }}>{selUser.id}</div>
              </div>
              <button onClick={()=>setSelUser(null)} style={{ background:'rgba(255,255,255,.06)', border:'none', borderRadius:10, padding:'8px 12px', color:'#8892a4', cursor:'pointer', fontSize:13 }}>✕</button>
            </div>

            {/* Modal Tabs */}
            <div style={{ display:'flex', gap:4, padding:'12px 12px 0' }}>
              {[{k:'info',l:'📋 Info'},{k:'security',l:'🔐 2FA'},{k:'password',l:'🔑 Password'}].map(t=>(
                <button key={t.k} onClick={()=>setUserModalTab(t.k)}
                  style={{ flex:1, padding:'8px 4px', borderRadius:10, border:'none', cursor:'pointer', fontSize:11, fontWeight:700,
                    background: userModalTab===t.k ? 'linear-gradient(135deg,#00e5ff,#00ff88)' : 'rgba(255,255,255,.05)',
                    color: userModalTab===t.k ? '#070a12' : '#4a5568' }}>
                  {t.l}
                </button>
              ))}
            </div>

            <div style={{ padding:16 }}>

              {/* ── INFO TAB ── */}
              {userModalTab === 'info' && (
                <div>
                  {[
                    ['👤 Full Name', selUser.full_name || '—'],
                    ['🆔 Username', '@' + (selUser.username || '—')],
                    ['📧 Email', selUser.email || '—'],
                    ['📱 Phone', selUser.phone || '—'],
                    ['🎂 Date of Birth', selUser.dob || '—'],
                    ['⚧ Gender', selUser.gender || '—'],
                    ['📅 Account Created', selUser.created_at ? new Date(selUser.created_at).toLocaleString('en-BD', { timeZone:'Asia/Dhaka', year:'numeric', month:'long', day:'numeric', hour:'2-digit', minute:'2-digit' }) : '—'],
                    ['🕐 Last Login', selUser.last_sign_in ? new Date(selUser.last_sign_in).toLocaleString('en-BD', { timeZone:'Asia/Dhaka', year:'numeric', month:'long', day:'numeric', hour:'2-digit', minute:'2-digit' }) : '—'],
                    ['🪙 Coin Balance', selUser.coin_balance ?? '0'],
                    ['⭐ XP / Level', `${selUser.xp || 0} XP / Level ${selUser.level || 1}`],
                    ['🔗 Referral Code', selUser.referral_code || '—'],
                    ['🚫 Banned', selUser.banned ? '✅ Yes — Banned' : '❌ No'],
                  ].map(([label, value]) => (
                    <div key={label} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'9px 0', borderBottom:'1px solid rgba(255,255,255,.04)' }}>
                      <div style={{ fontSize:11, color:'#4a5568', fontWeight:600 }}>{label}</div>
                      <div style={{ fontSize:12, color:'#eef2f7', fontWeight:700, textAlign:'right', maxWidth:'60%', wordBreak:'break-all' }}>{String(value)}</div>
                    </div>
                  ))}

                  {/* Invest Account Info */}
                  {selUserInvAcc && (
                    <div style={{ marginTop:12, background:'rgba(0,229,255,.04)', border:'1px solid rgba(0,229,255,.1)', borderRadius:12, padding:12 }}>
                      <div style={{ fontSize:11, fontWeight:800, color:'#00e5ff', marginBottom:8 }}>💎 Investment Account</div>
                      {[
                        ['Status', selUserInvAcc.status || '—'],
                        ['Total Invested', `$${selUserInvAcc.total_invested || 0}`],
                        ['Wallet Balance', `$${(selUserInvAcc.wallet_balance || 0).toFixed(2)}`],
                        ['Total Earned', `$${(selUserInvAcc.total_earned || 0).toFixed(2)}`],
                        ['Total Withdrawn', `$${(selUserInvAcc.total_withdrawn || 0).toFixed(2)}`],
                        ['Valid Referrals', selUserInvAcc.valid_referrals || 0],
                        ['2FA Enabled', selUserInvAcc.totp_enabled ? '✅ Yes' : '❌ No'],
                      ].map(([label, value]) => (
                        <div key={label} style={{ display:'flex', justifyContent:'space-between', padding:'5px 0', borderBottom:'1px solid rgba(255,255,255,.03)' }}>
                          <div style={{ fontSize:10, color:'#4a5568' }}>{label}</div>
                          <div style={{ fontSize:11, color:'#eef2f7', fontWeight:700 }}>{String(value)}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Quick Actions */}
                  <div style={{ display:'flex', gap:8, marginTop:12 }}>
                    <button onClick={()=>toggleBan(selUser)}
                      style={{ flex:1, padding:'10px 8px', borderRadius:10, border:'none', cursor:'pointer', fontSize:12, fontWeight:700,
                        background: selUser.banned ? 'rgba(0,229,255,.1)' : 'rgba(255,165,0,.1)',
                        color: selUser.banned ? '#00e5ff' : '#ffa500' }}>
                      {selUser.banned ? '✅ Unban' : '🚫 Ban'}
                    </button>
                    <button onClick={()=>{ if(confirm('Delete user permanently?')) { deleteUser(selUser.id); setSelUser(null) } }}
                      style={{ flex:1, padding:'10px 8px', borderRadius:10, border:'none', cursor:'pointer', fontSize:12, fontWeight:700, background:'rgba(255,69,96,.1)', color:'#ff4560' }}>
                      🗑 Delete
                    </button>
                    <button onClick={()=>window.open(`/user/${selUser.id}`, '_blank')}
                      style={{ flex:1, padding:'10px 8px', borderRadius:10, border:'none', cursor:'pointer', fontSize:12, fontWeight:700, background:'rgba(255,255,255,.06)', color:'#8892a4' }}>
                      👁 Profile
                    </button>
                  </div>
                </div>
              )}

              {/* ── 2FA TAB ── */}
              {userModalTab === 'security' && (
                <div>
                  <div style={{ background:'rgba(0,229,255,.04)', border:'1px solid rgba(0,229,255,.1)', borderRadius:12, padding:14, marginBottom:12 }}>
                    <div style={{ fontSize:12, fontWeight:800, color:'#eef2f7', marginBottom:4 }}>🔐 Two-Factor Authentication</div>
                    <div style={{ fontSize:11, color:'#4a5568', lineHeight:1.7 }}>
                      {selUserInvAcc?.totp_enabled
                        ? '✅ User এর 2FA চালু আছে।'
                        : '❌ User এর 2FA বন্ধ আছে।'}
                    </div>
                  </div>

                  {selUserInvAcc?.totp_enabled && (
                    <div style={{ background:'rgba(255,69,96,.06)', border:'1px solid rgba(255,69,96,.15)', borderRadius:12, padding:14, marginBottom:12 }}>
                      <div style={{ fontSize:12, fontWeight:800, color:'#ff4560', marginBottom:6 }}>⚠️ Admin — 2FA বাতিল করো</div>
                      <div style={{ fontSize:11, color:'#8892a4', lineHeight:1.7, marginBottom:10 }}>
                        এটি করলে user এর Invest PIN screen এ আর 2FA code চাইবে না।
                        User কে নিরাপত্তার জন্য আবার চালু করতে বলো।
                      </div>
                      <button onClick={cancelTwoFa} disabled={twoFaCancelLoading}
                        style={{ width:'100%', padding:'11px', borderRadius:10, border:'none', cursor:'pointer', fontSize:13, fontWeight:800, background:'rgba(255,69,96,.15)', color:'#ff4560' }}>
                        {twoFaCancelLoading ? '⏳ Processing...' : '🔓 2FA বাতিল করো'}
                      </button>
                    </div>
                  )}

                  {/* User নিজে 2FA cancel request */}
                  <div style={{ background:'rgba(255,165,0,.05)', border:'1px solid rgba(255,165,0,.15)', borderRadius:12, padding:14 }}>
                    <div style={{ fontSize:12, fontWeight:800, color:'#ffa500', marginBottom:6 }}>📌 User 2FA Cancel Request</div>
                    <div style={{ fontSize:11, color:'#8892a4', lineHeight:1.7 }}>
                      User যদি 2FA cancel করতে চায় — তারা Invest → Security → Cancel 2FA Request বাটনে চাপলে
                      তোমার কাছে notification আসবে। তখন উপরের বাটন দিয়ে বাতিল করো।
                    </div>
                  </div>
                </div>
              )}

              {/* ── PASSWORD TAB ── */}
              {userModalTab === 'password' && (
                <div>
                  {/* Send Reset Email */}
                  <div style={{ background:'rgba(0,229,255,.04)', border:'1px solid rgba(0,229,255,.1)', borderRadius:12, padding:14, marginBottom:12 }}>
                    <div style={{ fontSize:12, fontWeight:800, color:'#00e5ff', marginBottom:6 }}>📧 Password Reset Email পাঠাও</div>
                    <div style={{ fontSize:11, color:'#8892a4', lineHeight:1.7, marginBottom:10 }}>
                      User এর email এ একটি reset link পাঠানো হবে।
                      User সেই link দিয়ে নিজেই নতুন password দিতে পারবে।
                    </div>
                    <div style={{ fontSize:11, color:'#4a5568', marginBottom:8 }}>📧 {selUser.email || 'Email নেই'}</div>
                    <button onClick={sendPasswordResetEmail}
                      style={{ width:'100%', padding:'11px', borderRadius:10, border:'none', cursor:'pointer', fontSize:13, fontWeight:800, background:'rgba(0,229,255,.12)', color:'#00e5ff' }}>
                      📧 Reset Email পাঠাও
                    </button>
                  </div>

                  {/* Admin Force Change Password */}
                  <div style={{ background:'rgba(255,165,0,.05)', border:'1px solid rgba(255,165,0,.15)', borderRadius:12, padding:14 }}>
                    <div style={{ fontSize:12, fontWeight:800, color:'#ffa500', marginBottom:6 }}>🔑 Admin — Password সরাসরি পরিবর্তন</div>
                    <div style={{ fontSize:11, color:'#8892a4', lineHeight:1.7, marginBottom:10 }}>
                      নতুন password দাও — user এর login password পরিবর্তন হয়ে যাবে।
                      কমপক্ষে ৬ অক্ষর লাগবে।
                    </div>
                    <input
                      value={newLoginPass}
                      onChange={e=>setNewLoginPass(e.target.value)}
                      type="text"
                      placeholder="নতুন password (min 6 char)"
                      style={{ width:'100%', background:'#0c1018', border:'1px solid rgba(255,255,255,.08)', borderRadius:10, padding:'11px 14px', color:'#eef2f7', fontSize:13, outline:'none', marginBottom:10 }}
                    />
                    <button onClick={changeLoginPassword} disabled={passResetLoading || newLoginPass.length < 6}
                      style={{ width:'100%', padding:'11px', borderRadius:10, border:'none', cursor: newLoginPass.length >= 6 ? 'pointer' : 'default', fontSize:13, fontWeight:800,
                        background: newLoginPass.length >= 6 ? 'linear-gradient(135deg,#00e5ff,#00ff88)' : 'rgba(255,255,255,.05)',
                        color: newLoginPass.length >= 6 ? '#070a12' : '#4a5568' }}>
                      {passResetLoading ? '⏳ Changing...' : '🔑 Password পরিবর্তন করো'}
                    </button>
                    <div style={{ fontSize:10, color:'#4a5568', marginTop:8, textAlign:'center' }}>
                      ⚠️ এর জন্য /api/admin/change-password route লাগবে
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

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
            { key:'coins',     label:`🪙 Coins${coinPurchases.filter(p=>p.status==='pending').length > 0 ? ` (${coinPurchases.filter(p=>p.status==='pending').length})` : ''}` },
            { key:'live',      label:`🔴 Live${liveSubs.filter(s=>s.status==='pending').length > 0 ? ` (${liveSubs.filter(s=>s.status==='pending').length})` : ''}` },
          ].map(t => (
            <button key={t.key} onClick={() => {
              setTab(t.key)
              if (t.key === 'users') loadUsers()
              if (t.key === 'posts') loadPosts()
              if (t.key === 'invest') loadInvest()
              if (t.key === 'referral') loadInvest()
              if (t.key === 'coins') loadCoinPurchases()
              if (t.key === 'live') loadLiveSubs()
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
                  <div onClick={() => openUserDetail(u)}
                    style={{ width:'40px', height:'40px', borderRadius:'50%', overflow:'hidden', flexShrink:0, cursor:'pointer', background:'linear-gradient(135deg,#00e5ff,#00ff88)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    {u.avatar_url ? <img src={u.avatar_url} style={{ width:'100%', height:'100%', objectFit:'cover' }} /> : <span style={{ fontWeight:'800', color:'#070a12', fontSize:'15px' }}>{(u.full_name||u.username||'E')[0].toUpperCase()}</span>}
                  </div>
                  <div style={{ flex:1, minWidth:0, cursor:'pointer' }} onClick={() => openUserDetail(u)}>
                    <div style={{ fontSize:'13px', fontWeight:'700' }}>
                      {u.full_name || u.username}
                      {u.banned && <Tag color='#ff4560'>BANNED</Tag>}
                    </div>
                    <div style={{ fontSize:'10px', color:'#4a5568' }}>@{u.username} · {timeAgo(u.created_at)}</div>
                    <div style={{ fontSize:'9px', color:'#00e5ff', fontFamily:'monospace', cursor:'pointer' }} onClick={e=>{e.stopPropagation();openUserDetail(u)}}>{u.id}</div>
                  </div>
                  <div style={{ display:'flex', gap:'5px', flexShrink:0 }}>
                    <button onClick={() => toggleBan(u)}
                      style={{ padding:'5px 10px', borderRadius:'8px', border:'none', cursor:'pointer', fontSize:'11px', fontWeight:'600', background: u.banned ? 'rgba(0,229,255,.1)' : 'rgba(255,165,0,.12)', color: u.banned ? '#00e5ff' : '#ffa500' }}>
                      {u.banned ? 'Unban' : 'Ban'}
                    </button>
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

        {/* ══ LIVE SUBSCRIPTIONS TAB ══ */}
        {tab === 'live' && (
          <div style={{ padding: '0 12px' }}>

            {/* Stats row */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'8px', marginBottom:'14px' }}>
              {[
                { icon:'⏳', label:'Pending', val: liveSubs.filter(s=>s.status==='pending').length, color:'#ffca28' },
                { icon:'✅', label:'Active',  val: liveSubs.filter(s=>s.status==='active').length,  color:'#00ff88' },
                { icon:'🎁', label:'Free',    val: liveSubs.filter(s=>s.status==='free').length,    color:'#00e5ff' },
                { icon:'❌', label:'Rejected',val: liveSubs.filter(s=>s.status==='rejected').length,color:'#ff4560' },
              ].map((st,i) => (
                <div key={i} onClick={()=>setLiveFilter(st.label.toLowerCase())}
                  style={{ background: liveFilter===st.label.toLowerCase() ? `${st.color}15` : '#111826', border:`1px solid ${liveFilter===st.label.toLowerCase() ? st.color+'40' : 'rgba(255,255,255,0.07)'}`, borderRadius:'12px', padding:'12px 8px', textAlign:'center', cursor:'pointer' }}>
                  <div style={{ fontSize:'20px', marginBottom:'4px' }}>{st.icon}</div>
                  <div style={{ fontSize:'20px', fontWeight:'900', color: st.color }}>{st.val}</div>
                  <div style={{ fontSize:'10px', color:'#4a5568', fontWeight:'600' }}>{st.label}</div>
                </div>
              ))}
            </div>

            {/* Grant free live section */}
            <div style={{ background:'#111826', border:'1px solid rgba(0,229,255,0.2)', borderRadius:'16px', padding:'14px', marginBottom:'14px' }}>
              <div style={{ fontSize:'13px', fontWeight:'800', color:'#00e5ff', marginBottom:'12px', display:'flex', alignItems:'center', gap:'6px' }}>
                🎁 কাউকে Free Live দাও
              </div>
              <div style={{ position:'relative', marginBottom:'10px' }}>
                <input value={freeUserSearch} onChange={e=>searchFreeUser(e.target.value)}
                  placeholder='Username বা নাম খোঁজো...'
                  style={{ width:'100%', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:'10px', padding:'10px 14px', color:'#eef2f7', fontSize:'13px', outline:'none' }}/>
                {freeUserResults.length > 0 && (
                  <div style={{ position:'absolute', top:'100%', left:0, right:0, background:'#1a2235', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'10px', zIndex:50, overflow:'hidden', marginTop:'4px' }}>
                    {freeUserResults.map(u => (
                      <div key={u.id} onClick={()=>{ setFreeUserId(u.id); setFreeUserSearch(`@${u.username} — ${u.full_name||''}`); setFreeUserResults([]) }}
                        style={{ display:'flex', alignItems:'center', gap:'10px', padding:'10px 14px', cursor:'pointer', borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ width:'32px', height:'32px', borderRadius:'50%', background:'linear-gradient(135deg,#00e5ff,#00ff88)', flexShrink:0, overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'12px', fontWeight:'800', color:'#070a12' }}>
                          {u.avatar_url ? <img src={u.avatar_url} style={{width:'100%',height:'100%',objectFit:'cover'}}/> : (u.full_name||u.username||'U')[0].toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontSize:'12px', fontWeight:'700', color:'#eef2f7' }}>{u.full_name || u.username}</div>
                          <div style={{ fontSize:'10px', color:'#4a5568' }}>@{u.username}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {freeUserId && (
                <div style={{ display:'flex', gap:'8px' }}>
                  {[1,3,6,12].map(m => (
                    <button key={m} onClick={()=>grantFreeLive(freeUserId, m)}
                      style={{ flex:1, padding:'9px 4px', background:'linear-gradient(135deg,#00e5ff20,#00ff8820)', border:'1px solid rgba(0,229,255,0.3)', borderRadius:'10px', color:'#00e5ff', fontSize:'12px', fontWeight:'800', cursor:'pointer' }}>
                      {m}m
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Filter + Search */}
            <div style={{ display:'flex', gap:'8px', marginBottom:'12px' }}>
              <input value={liveSearch} onChange={e=>setLiveSearch(e.target.value)}
                placeholder='Search by username...'
                style={{ flex:1, background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'10px', padding:'9px 12px', color:'#eef2f7', fontSize:'12px', outline:'none' }}/>
              <select value={liveFilter} onChange={e=>setLiveFilter(e.target.value)}
                style={{ background:'#111826', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'10px', padding:'9px 10px', color:'#eef2f7', fontSize:'12px', outline:'none' }}>
                <option value='all'>All</option>
                <option value='pending'>Pending</option>
                <option value='active'>Active</option>
                <option value='free'>Free</option>
                <option value='rejected'>Rejected</option>
              </select>
            </div>

            {/* Subscriptions list */}
            {liveSubs
              .filter(s => liveFilter === 'all' ? true : s.status === liveFilter)
              .filter(s => !liveSearch || (s.profiles?.username||'').toLowerCase().includes(liveSearch.toLowerCase()) || (s.profiles?.full_name||'').toLowerCase().includes(liveSearch.toLowerCase()))
              .map(sub => (
              <div key={sub.id} style={{ background:'#111826', border:`1px solid ${sub.status==='pending'?'rgba(255,202,40,0.25)':sub.status==='active'?'rgba(0,255,136,0.2)':sub.status==='free'?'rgba(0,229,255,0.2)':'rgba(255,69,96,0.15)'}`, borderRadius:'14px', padding:'14px', marginBottom:'10px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'10px' }}>
                  {/* Avatar */}
                  <div style={{ width:'42px', height:'42px', borderRadius:'50%', background:'linear-gradient(135deg,#00e5ff,#00ff88)', flexShrink:0, overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'16px', fontWeight:'800', color:'#070a12' }}>
                    {sub.profiles?.avatar_url ? <img src={sub.profiles.avatar_url} style={{width:'100%',height:'100%',objectFit:'cover'}}/> : (sub.profiles?.full_name||sub.profiles?.username||'U')[0].toUpperCase()}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:'6px', flexWrap:'wrap' }}>
                      <span style={{ fontSize:'13px', fontWeight:'800', color:'#eef2f7' }}>{sub.profiles?.full_name || sub.profiles?.username}</span>
                      <span style={{ fontSize:'10px', padding:'2px 8px', borderRadius:'8px', fontWeight:'700',
                        background: sub.status==='pending'?'rgba(255,202,40,0.15)':sub.status==='active'?'rgba(0,255,136,0.15)':sub.status==='free'?'rgba(0,229,255,0.15)':'rgba(255,69,96,0.15)',
                        color: sub.status==='pending'?'#ffca28':sub.status==='active'?'#00ff88':sub.status==='free'?'#00e5ff':'#ff4560' }}>
                        {sub.status==='pending'?'⏳ Pending':sub.status==='active'?'✅ Active':sub.status==='free'?'🎁 Free':'❌ Rejected'}
                      </span>
                    </div>
                    <div style={{ fontSize:'10px', color:'#4a5568' }}>@{sub.profiles?.username} · {new Date(sub.created_at).toLocaleDateString('en-BD')}</div>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontSize:'14px', fontWeight:'900', color: sub.amount_usdt > 0 ? '#00ff88' : '#00e5ff' }}>{sub.amount_usdt > 0 ? `${sub.amount_usdt} USDT` : 'FREE'}</div>
                    {sub.expires_at && <div style={{ fontSize:'10px', color:'#4a5568' }}>Exp: {new Date(sub.expires_at).toLocaleDateString()}</div>}
                  </div>
                </div>

                {/* TRX Hash */}
                {sub.trx_hash && (
                  <div style={{ background:'rgba(0,0,0,0.3)', borderRadius:'8px', padding:'8px 10px', marginBottom:'10px', display:'flex', alignItems:'center', gap:'8px' }}>
                    <span style={{ fontSize:'10px', color:'#4a5568', flexShrink:0 }}>TRX:</span>
                    <span style={{ fontSize:'10px', color:'#00e5ff', fontFamily:'monospace', wordBreak:'break-all', flex:1 }}>{sub.trx_hash}</span>
                    <button onClick={()=>{ window.open(`https://tronscan.org/#/transaction/${sub.trx_hash}`,'_blank') }}
                      style={{ background:'rgba(0,229,255,0.1)', border:'1px solid rgba(0,229,255,0.2)', borderRadius:'6px', padding:'4px 8px', color:'#00e5ff', fontSize:'10px', fontWeight:'700', cursor:'pointer', flexShrink:0 }}>
                      Verify ↗
                    </button>
                  </div>
                )}

                {/* Note */}
                {sub.note && <div style={{ fontSize:'11px', color:'#4a5568', marginBottom:'8px', fontStyle:'italic' }}>📝 {sub.note}</div>}

                {/* Action buttons */}
                <div style={{ display:'flex', gap:'8px', flexWrap:'wrap' }}>
                  {sub.status === 'pending' && (<>
                    <button onClick={()=>approveLive(sub)}
                      style={{ flex:1, padding:'9px', background:'linear-gradient(135deg,#00ff88,#00e5ff)', border:'none', borderRadius:'10px', color:'#070a12', fontSize:'12px', fontWeight:'800', cursor:'pointer' }}>
                      ✅ Approve — Activate
                    </button>
                    <button onClick={()=>rejectLive(sub)}
                      style={{ flex:1, padding:'9px', background:'rgba(255,69,96,0.15)', border:'1px solid rgba(255,69,96,0.3)', borderRadius:'10px', color:'#ff4560', fontSize:'12px', fontWeight:'700', cursor:'pointer' }}>
                      ❌ Reject
                    </button>
                  </>)}
                  {(sub.status === 'active' || sub.status === 'free') && (
                    <button onClick={()=>revokeLive(sub)}
                      style={{ padding:'9px 14px', background:'rgba(255,69,96,0.1)', border:'1px solid rgba(255,69,96,0.25)', borderRadius:'10px', color:'#ff4560', fontSize:'12px', fontWeight:'700', cursor:'pointer' }}>
                      🚫 Revoke Access
                    </button>
                  )}
                  {sub.status === 'rejected' && (
                    <button onClick={()=>approveLive(sub)}
                      style={{ padding:'9px 14px', background:'rgba(0,255,136,0.1)', border:'1px solid rgba(0,255,136,0.25)', borderRadius:'10px', color:'#00ff88', fontSize:'12px', fontWeight:'700', cursor:'pointer' }}>
                      ✅ Approve Anyway
                    </button>
                  )}
                </div>
              </div>
            ))}

            {liveSubs.filter(s => liveFilter==='all' ? true : s.status===liveFilter).length === 0 && (
              <div style={{ textAlign:'center', padding:'40px', color:'#4a5568' }}>
                <div style={{ fontSize:'36px', marginBottom:'10px' }}>🔴</div>
                <div style={{ fontSize:'14px' }}>কোনো Live subscription নেই</div>
              </div>
            )}
          </div>
        )}


        {/* ══ COINS TAB ══ */}
        {tab === 'coins' && (
          <div style={{ padding:'0 12px' }}>

            {/* Stats */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'8px', marginBottom:'14px' }}>
              {[
                ['⏳','Pending',  coinPurchases.filter(p=>p.status==='pending').length,  'pending'],
                ['✅','Approved', coinPurchases.filter(p=>p.status==='approved').length, 'approved'],
                ['❌','Rejected', coinPurchases.filter(p=>p.status==='rejected').length, 'rejected'],
              ].map(([ic,lb,cnt,key])=>(
                <div key={key} onClick={()=>setCoinFilter(key===coinFilter?'all':key)}
                  style={{ background: coinFilter===key?'rgba(0,229,255,.1)':'#111826', border:`1px solid ${coinFilter===key?'rgba(0,229,255,.3)':'rgba(255,255,255,.06)'}`, borderRadius:'12px', padding:'12px', textAlign:'center', cursor:'pointer' }}>
                  <div style={{ fontSize:'20px' }}>{ic}</div>
                  <div style={{ fontSize:'18px', fontWeight:'900', color:'#eef2f7' }}>{cnt}</div>
                  <div style={{ fontSize:'10px', color:'#4a5568' }}>{lb}</div>
                </div>
              ))}
            </div>

            {/* Grant coins box */}
            <div style={{ background:'rgba(255,215,0,.06)', border:'1px solid rgba(255,215,0,.15)', borderRadius:'14px', padding:'14px', marginBottom:'14px' }}>
              <div style={{ fontSize:'13px', fontWeight:'800', color:'#ffd700', marginBottom:'10px' }}>🎁 Manual Coins দাও</div>
              <div style={{ display:'flex', gap:'8px', marginBottom:'8px' }}>
                <input
                  value={grantUserQ}
                  onChange={async e => {
                    const q = e.target.value; setGrantUserQ(q)
                    if (q.length < 2) { setGrantUserResult(null); return }
                    const { data } = await supabase.from('profiles')
                      .select('id, username, full_name, avatar_url, coin_balance')
                      .or(`username.ilike.%${q}%,full_name.ilike.%${q}%`)
                      .limit(5)
                    setGrantUserResult(data || [])
                  }}
                  placeholder='Username বা নাম লেখো...'
                  style={{ flex:1, background:'rgba(255,255,255,.06)', border:`1px solid ${grantUserPicked?'rgba(0,255,136,.3)':'rgba(255,255,255,.1)'}`, borderRadius:'10px', padding:'10px 12px', color:'#eef2f7', fontSize:'13px', outline:'none' }}/>
                <input
                  value={grantAmt}
                  onChange={e=>setGrantAmt(e.target.value)}
                  type='number' placeholder='Coins' min='1'
                  style={{ width:'90px', background:'rgba(255,255,255,.06)', border:'1px solid rgba(255,255,255,.1)', borderRadius:'10px', padding:'10px 12px', color:'#eef2f7', fontSize:'13px', outline:'none' }}/>
                <button onClick={async()=>{
                  if (!grantUserPicked || !grantAmt) { alert('User select করো এবং amount দাও'); return }
                  await grantCoins(grantUserPicked.id, grantAmt)
                  setGrantUserQ(''); setGrantAmt(''); setGrantUserPicked(null); setGrantUserResult(null)
                }} style={{ padding:'10px 16px', background:'linear-gradient(135deg,#ffd700,#ff6b35)', border:'none', borderRadius:'10px', color:'#070a12', fontSize:'12px', fontWeight:'800', cursor:'pointer', whiteSpace:'nowrap' }}>
                  দাও 🎁
                </button>
              </div>
              {/* Search results dropdown */}
              {grantUserResult && grantUserResult.length > 0 && !grantUserPicked && (
                <div style={{ background:'#1a2030', border:'1px solid rgba(255,255,255,.1)', borderRadius:'10px', overflow:'hidden', marginBottom:'8px' }}>
                  {grantUserResult.map(p=>(
                    <div key={p.id} onClick={()=>{ setGrantUserPicked(p); setGrantUserQ(p.username||p.full_name); setGrantUserResult(null) }}
                      style={{ padding:'10px 12px', cursor:'pointer', display:'flex', alignItems:'center', gap:'10px', borderBottom:'1px solid rgba(255,255,255,.05)' }}>
                      <div style={{ width:32, height:32, borderRadius:'50%', background:'linear-gradient(135deg,#ffd700,#ff6b35)', overflow:'hidden', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:800, color:'#070a12' }}>
                        {p.avatar_url ? <img src={p.avatar_url} style={{width:'100%',height:'100%',objectFit:'cover'}}/> : (p.full_name||p.username||'?')[0].toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontSize:13, fontWeight:700, color:'#eef2f7' }}>{p.full_name || p.username}</div>
                        <div style={{ fontSize:10, color:'#4a5568' }}>@{p.username} · 🪙 {p.coin_balance||0} coins</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {grantUserPicked && (
                <div style={{ background:'rgba(0,255,136,.06)', border:'1px solid rgba(0,255,136,.2)', borderRadius:'10px', padding:'8px 12px', marginBottom:'8px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <span style={{ fontSize:12, color:'#00ff88' }}>✅ @{grantUserPicked.username} · 🪙 {grantUserPicked.coin_balance||0} coins</span>
                  <button onClick={()=>{setGrantUserPicked(null);setGrantUserQ('')}} style={{ background:'none', border:'none', color:'#ff4560', cursor:'pointer', fontSize:16 }}>✕</button>
                </div>
              )}
            </div>

            {/* Filter + Search */}
            <div style={{ display:'flex', gap:'8px', marginBottom:'12px' }}>
              <input value={coinSearch} onChange={e=>setCoinSearch(e.target.value)}
                placeholder='User খোঁজো...'
                style={{ flex:1, background:'rgba(255,255,255,.06)', border:'1px solid rgba(255,255,255,.1)', borderRadius:'10px', padding:'9px 12px', color:'#eef2f7', fontSize:'13px', outline:'none' }}/>
              <select value={coinFilter} onChange={e=>setCoinFilter(e.target.value)}
                style={{ background:'rgba(255,255,255,.06)', border:'1px solid rgba(255,255,255,.1)', borderRadius:'10px', padding:'9px 12px', color:'#eef2f7', fontSize:'13px', outline:'none' }}>
                <option value='all'>সব</option>
                <option value='pending'>Pending</option>
                <option value='approved'>Approved</option>
                <option value='rejected'>Rejected</option>
              </select>
            </div>

            {/* Purchase list */}
            {coinPurchases
              .filter(p => coinFilter==='all' ? true : p.status===coinFilter)
              .filter(p => !coinSearch || (p.profiles?.username||'').toLowerCase().includes(coinSearch.toLowerCase()) || (p.profiles?.full_name||'').toLowerCase().includes(coinSearch.toLowerCase()))
              .map(p => (
              <div key={p.id} style={{ background:'#111826', border:`1px solid ${p.status==='pending'?'rgba(255,202,40,.25)':p.status==='approved'?'rgba(0,255,136,.15)':'rgba(255,69,96,.15)'}`, borderRadius:'14px', padding:'14px', marginBottom:'10px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'10px' }}>
                  <div style={{ width:'40px', height:'40px', borderRadius:'50%', background:'linear-gradient(135deg,#ffd700,#ff6b35)', overflow:'hidden', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'15px', fontWeight:'800', color:'#070a12' }}>
                    {p.profiles?.avatar_url ? <img src={p.profiles.avatar_url} style={{width:'100%',height:'100%',objectFit:'cover'}}/> : (p.profiles?.full_name||p.profiles?.username||'U')[0].toUpperCase()}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:'13px', fontWeight:'800', color:'#eef2f7' }}>{p.profiles?.full_name||p.profiles?.username}</div>
                    <div style={{ fontSize:'11px', color:'#4a5568' }}>@{p.profiles?.username} · {new Date(p.created_at).toLocaleDateString('bn-BD')}</div>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontSize:'16px', fontWeight:'900', color:'#ffd700' }}>🪙 {p.coins}</div>
                    <div style={{ fontSize:'11px', color:'#00e5ff' }}>{p.usdt_amount} USDT</div>
                  </div>
                </div>

                {/* Status badge */}
                <div style={{ display:'inline-flex', alignItems:'center', gap:'5px', background: p.status==='pending'?'rgba(255,202,40,.1)':p.status==='approved'?'rgba(0,255,136,.1)':'rgba(255,69,96,.1)', border:`1px solid ${p.status==='pending'?'rgba(255,202,40,.25)':p.status==='approved'?'rgba(0,255,136,.25)':'rgba(255,69,96,.25)'}`, borderRadius:'20px', padding:'3px 10px', marginBottom:'10px' }}>
                  <span style={{ width:'6px', height:'6px', borderRadius:'50%', background: p.status==='pending'?'#ffca28':p.status==='approved'?'#00ff88':'#ff4560', display:'inline-block' }}/>
                  <span style={{ fontSize:'11px', fontWeight:'700', color: p.status==='pending'?'#ffca28':p.status==='approved'?'#00ff88':'#ff4560' }}>
                    {p.status==='pending'?'⏳ Pending':p.status==='approved'?'✅ Approved':'❌ Rejected'}
                  </span>
                </div>

                {/* TRX hash */}
                {p.trx_hash && (
                  <div style={{ background:'rgba(0,0,0,.3)', borderRadius:'8px', padding:'8px 10px', marginBottom:'8px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <div>
                      <div style={{ fontSize:'10px', color:'#4a5568', marginBottom:'2px' }}>TRX Hash</div>
                      <div style={{ fontSize:'11px', color:'#00e5ff', fontFamily:'monospace', wordBreak:'break-all' }}>{p.trx_hash.slice(0,30)}...</div>
                    </div>
                    <a href={`https://tronscan.org/#/transaction/${p.trx_hash}`} target='_blank'
                      style={{ padding:'5px 10px', background:'rgba(0,229,255,.1)', border:'1px solid rgba(0,229,255,.2)', borderRadius:'7px', color:'#00e5ff', fontSize:'11px', fontWeight:'700', textDecoration:'none', flexShrink:0 }}>
                      Verify ↗
                    </a>
                  </div>
                )}

                {/* Screenshot */}
                {p.screenshot_url && (
                  <div style={{ marginBottom:'8px' }}>
                    <div style={{ fontSize:'10px', color:'#4a5568', marginBottom:'4px' }}>Screenshot</div>
                    <img src={p.screenshot_url} onClick={()=>window.open(p.screenshot_url,'_blank')}
                      style={{ width:'100%', maxHeight:'160px', objectFit:'contain', borderRadius:'8px', border:'1px solid rgba(255,255,255,.08)', cursor:'pointer', background:'#000' }}/>
                  </div>
                )}

                {/* Actions */}
                {p.status === 'pending' && (
                  <div style={{ display:'flex', gap:'8px', marginTop:'10px' }}>
                    <button onClick={()=>approveCoin(p)}
                      style={{ flex:1, padding:'10px', background:'rgba(0,255,136,.1)', border:'1px solid rgba(0,255,136,.25)', borderRadius:'10px', color:'#00ff88', fontSize:'12px', fontWeight:'800', cursor:'pointer' }}>
                      ✅ Approve (+{p.coins} Coins)
                    </button>
                    <button onClick={()=>rejectCoin(p)}
                      style={{ flex:1, padding:'10px', background:'rgba(255,69,96,.1)', border:'1px solid rgba(255,69,96,.25)', borderRadius:'10px', color:'#ff4560', fontSize:'12px', fontWeight:'800', cursor:'pointer' }}>
                      ❌ Reject
                    </button>
                  </div>
                )}
              </div>
            ))}

            {coinPurchases.filter(p=>coinFilter==='all'?true:p.status===coinFilter).length===0 && (
              <div style={{ textAlign:'center', padding:'40px', color:'#4a5568' }}>
                <div style={{ fontSize:'36px', marginBottom:'10px' }}>🪙</div>
                <div style={{ fontSize:'14px' }}>কোনো Coin purchase নেই</div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
    }
