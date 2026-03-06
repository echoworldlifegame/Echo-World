'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const ADMIN_EMAIL = 'mdakibgoodboy4@gmail.com'

export default function Admin() {
  const [user, setUser] = useState(null)
  const [authorized, setAuthorized] = useState(false)
  const [tab, setTab] = useState('dashboard')
  const [stats, setStats] = useState({})
  const [users, setUsers] = useState([])
  const [posts, setPosts] = useState([])
  const [announcement, setAnnouncement] = useState('')
  const [loading, setLoading] = useState(true)
  const [searchUser, setSearchUser] = useState('')

  // Investment states
  const [deposits, setDeposits] = useState([])
  const [withdrawals, setWithdrawals] = useState([])
  const [investUsers, setInvestUsers] = useState([])
  const [selectedInvestUser, setSelectedInvestUser] = useState(null)
  const [balanceAdjust, setBalanceAdjust] = useState('')
  const [adjustType, setAdjustType] = useState('add')
  const [newPasswordFor, setNewPasswordFor] = useState('')
  const [passwordResetRequests, setPasswordResetRequests] = useState([])
  const [investTab, setInvestTab] = useState('deposits')

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { window.location.href = '/'; return }
      const u = data.session.user
      setUser(u)
      if (u.email !== ADMIN_EMAIL) { setLoading(false); return }
      setAuthorized(true)
      await loadDashboard()
      setLoading(false)
    })
  }, [])

  const loadDashboard = async () => {
    const [
      { count: totalUsers },
      { count: totalPosts },
      { count: totalLikes },
      { count: todayUsers },
      { count: pendingDeposits },
      { count: pendingWithdrawals },
    ] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('posts').select('*', { count: 'exact', head: true }),
      supabase.from('likes').select('*', { count: 'exact', head: true }),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', new Date(Date.now() - 86400000).toISOString()),
      supabase.from('deposit_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('withdrawal_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    ])
    setStats({ totalUsers, totalPosts, totalLikes, todayUsers, pendingDeposits, pendingWithdrawals })
  }

  const loadUsers = async () => {
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(100)
    setUsers(data || [])
  }

  const loadPosts = async () => {
    const { data } = await supabase.from('posts').select('*, profiles(username, full_name)').order('created_at', { ascending: false }).limit(50)
    setPosts(data || [])
  }

  const loadInvestment = async () => {
    // Deposits with profile info
    const { data: deps, error: depErr } = await supabase
      .from('deposit_requests')
      .select(`
        *,
        profiles!deposit_requests_user_id_fkey(id, username, full_name)
      `)
      .order('requested_at', { ascending: false })
    if (depErr) console.error('deposits error:', depErr)
    setDeposits(deps || [])

    // Withdrawals with profile info
    const { data: wds, error: wdErr } = await supabase
      .from('withdrawal_requests')
      .select(`
        *,
        profiles!withdrawal_requests_user_id_fkey(id, username, full_name)
      `)
      .order('requested_at', { ascending: false })
    if (wdErr) console.error('withdrawals error:', wdErr)
    setWithdrawals(wds || [])

    // Investment accounts with profile info
    const { data: invUsers, error: invErr } = await supabase
      .from('investment_accounts')
      .select(`
        *,
        profiles!investment_accounts_user_id_fkey(id, username, full_name, avatar_url)
      `)
      .order('created_at', { ascending: false })
    if (invErr) console.error('invest accounts error:', invErr)
    setInvestUsers(invUsers || [])

    // Password reset requests — notifications table থেকে
    const { data: resets, error: resetErr } = await supabase
      .from('notifications')
      .select(`
        *,
        profiles!notifications_user_id_fkey(id, username, full_name)
      `)
      .eq('type', 'system')
      .ilike('message', 'PASSWORD_RESET_REQUEST%')
      .eq('read', false)
      .order('created_at', { ascending: false })
    if (resetErr) console.error('resets error:', resetErr)
    setPasswordResetRequests(resets || [])
  }

  // ── DEPOSIT ACTIONS ──────────────────────────────────────
  const approveDeposit = async (dep) => {
    const plan = dep.amount_usd >= 1000 ? { rate: 3.0, label: 'Elite' }
      : dep.amount_usd >= 500 ? { rate: 2.5, label: 'Growth' }
      : { rate: 2.0, label: 'Starter' }

    const endDate = new Date()
    endDate.setFullYear(endDate.getFullYear() + 1)

    // Update deposit status
    await supabase.from('deposit_requests').update({
      status: 'approved', processed_at: new Date().toISOString()
    }).eq('id', dep.id)

    // Create investment
    await supabase.from('investments').insert({
      user_id: dep.user_id,
      amount_usd: dep.amount_usd,
      plan: plan.label,
      daily_rate: plan.rate,
      start_date: new Date().toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0],
      status: 'active',
    })

    // Update account totals
    const { data: acc } = await supabase.from('investment_accounts').select('*').eq('user_id', dep.user_id).single()
    if (acc) {
      await supabase.from('investment_accounts').update({
        total_invested: (acc.total_invested || 0) + dep.amount_usd,
      }).eq('user_id', dep.user_id)
    } else {
      await supabase.from('investment_accounts').upsert({
        user_id: dep.user_id,
        total_invested: dep.amount_usd,
        password: '1234',
      })
    }

    // Notify user
    await supabase.from('notifications').insert({
      user_id: dep.user_id,
      from_user_id: dep.user_id,
      type: 'system',
      message: `✅ Your deposit of $${dep.amount_usd} has been approved! ${plan.label} Plan activated at ${plan.rate}% daily.`,
    })

    setDeposits(d => d.map(x => x.id === dep.id ? { ...x, status: 'approved' } : x))
    alert(`✅ Approved! ${plan.label} plan activated for $${dep.amount_usd}`)
  }

  const rejectDeposit = async (dep, note = '') => {
    await supabase.from('deposit_requests').update({
      status: 'rejected', admin_note: note, processed_at: new Date().toISOString()
    }).eq('id', dep.id)
    await supabase.from('notifications').insert({
      user_id: dep.user_id, from_user_id: dep.user_id, type: 'system',
      message: `❌ Your deposit of $${dep.amount_usd} was rejected. ${note}`,
    })
    setDeposits(d => d.map(x => x.id === dep.id ? { ...x, status: 'rejected' } : x))
  }

  // ── WITHDRAWAL ACTIONS ───────────────────────────────────
  const approveWithdrawal = async (wd) => {
    const { data: acc } = await supabase.from('investment_accounts').select('*').eq('user_id', wd.user_id).single()
    if (!acc || acc.wallet_balance < wd.amount) {
      alert('Insufficient balance!'); return
    }
    await supabase.from('withdrawal_requests').update({
      status: 'approved', processed_at: new Date().toISOString()
    }).eq('id', wd.id)
    await supabase.from('investment_accounts').update({
      wallet_balance: (acc.wallet_balance || 0) - wd.amount,
      total_withdrawn: (acc.total_withdrawn || 0) + wd.amount,
    }).eq('user_id', wd.user_id)
    await supabase.from('notifications').insert({
      user_id: wd.user_id, from_user_id: wd.user_id, type: 'system',
      message: `✅ Withdrawal of $${wd.amount} approved! Sent to ${wd.usdt_address}`,
    })
    setWithdrawals(w => w.map(x => x.id === wd.id ? { ...x, status: 'approved' } : x))
  }

  const rejectWithdrawal = async (wd, note = '') => {
    await supabase.from('withdrawal_requests').update({
      status: 'rejected', admin_note: note, processed_at: new Date().toISOString()
    }).eq('id', wd.id)
    await supabase.from('notifications').insert({
      user_id: wd.user_id, from_user_id: wd.user_id, type: 'system',
      message: `❌ Withdrawal of $${wd.amount} rejected. ${note}`,
    })
    setWithdrawals(w => w.map(x => x.id === wd.id ? { ...x, status: 'rejected' } : x))
  }

  // ── BALANCE ADJUST ───────────────────────────────────────
  const adjustBalance = async () => {
    if (!selectedInvestUser || !balanceAdjust) return
    const amt = parseFloat(balanceAdjust)
    if (isNaN(amt) || amt <= 0) { alert('Invalid amount'); return }
    const acc = investUsers.find(u => u.user_id === selectedInvestUser.user_id)
    if (!acc) { alert('Account not found'); return }

    const currentBalance = acc.wallet_balance || 0
    const currentEarned = acc.total_earned || 0
    const newBalance = adjustType === 'add' ? currentBalance + amt : Math.max(currentBalance - amt, 0)
    const newEarned = adjustType === 'add' ? currentEarned + amt : currentEarned

    await supabase.from('investment_accounts').update({
      wallet_balance: newBalance,
      total_earned: newEarned,
    }).eq('user_id', selectedInvestUser.user_id)

    // Add to daily earnings log
    await supabase.from('daily_earnings').insert({
      user_id: selectedInvestUser.user_id,
      investment_id: null,
      amount: adjustType === 'add' ? amt : -amt,
      type: 'admin_adjustment',
      date: new Date().toISOString().split('T')[0],
    })

    await supabase.from('notifications').insert({
      user_id: selectedInvestUser.user_id,
      from_user_id: user.id,
      type: 'system',
      message: adjustType === 'add'
        ? `💰 Admin added $${amt} to your wallet balance.`
        : `📤 Admin deducted $${amt} from your wallet balance.`,
    })

    setInvestUsers(prev => prev.map(u => u.user_id === selectedInvestUser.user_id
      ? { ...u, wallet_balance: newBalance, total_earned: newEarned }
      : u
    ))
    setSelectedInvestUser(prev => ({ ...prev, wallet_balance: newBalance }))
    setBalanceAdjust('')
    alert(`✅ Balance ${adjustType === 'add' ? 'added' : 'deducted'}: $${amt}`)
  }

  // ── PASSWORD RESET ────────────────────────────────────────
  const resetPassword = async (targetUserId) => {
    if (!newPasswordFor.trim()) { alert('Enter new password'); return }
    if (!/^\d{4,}$/.test(newPasswordFor)) { alert('Numbers only, min 4 digits!'); return }

    await supabase.from('investment_accounts').update({
      password: newPasswordFor,
    }).eq('user_id', targetUserId)

    await supabase.from('notifications').insert({
      user_id: targetUserId, from_user_id: user.id, type: 'system',
      message: `🔑 Your invest access code has been reset to: ${newPasswordFor} — Please login and change it immediately.`,
    })

    // Mark reset request as read
    await supabase.from('notifications').update({ read: true })
      .eq('user_id', targetUserId).eq('type', 'system').ilike('message', 'PASSWORD_RESET_REQUEST%')

    setNewPasswordFor('')
    setPasswordResetRequests(prev => prev.filter(r => r.user_id !== targetUserId))
    alert(`✅ Password reset to: ${newPasswordFor} — User notified.`)
  }

  // ── OTHER ACTIONS ─────────────────────────────────────────
  const deleteUser = async (userId) => {
    if (!confirm('Delete this user?')) return
    await supabase.from('posts').delete().eq('user_id', userId)
    await supabase.from('profiles').delete().eq('id', userId)
    setUsers(u => u.filter(x => x.id !== userId))
  }

  const deletePost = async (postId) => {
    if (!confirm('Delete?')) return
    await supabase.from('posts').delete().eq('id', postId)
    setPosts(p => p.filter(x => x.id !== postId))
  }

  const banUser = async (userId, ban) => {
    await supabase.from('profiles').update({ banned: ban }).eq('id', userId)
    setUsers(u => u.map(x => x.id === userId ? { ...x, banned: ban } : x))
  }

  const sendAnnouncement = async () => {
    if (!announcement.trim()) return
    const { data: allUsers } = await supabase.from('profiles').select('id')
    const notifs = (allUsers || []).map(u => ({
      user_id: u.id, from_user_id: user.id, type: 'announcement', message: announcement.trim(),
    }))
    await supabase.from('notifications').insert(notifs)
    alert('📢 Sent!'); setAnnouncement('')
  }

  const timeAgo = (date) => {
    const s = Math.floor((new Date() - new Date(date)) / 1000)
    if (s < 60) return 'এইমাত্র'
    if (s < 3600) return Math.floor(s / 60) + 'মি'
    if (s < 86400) return Math.floor(s / 3600) + 'ঘ'
    return Math.floor(s / 86400) + 'দিন'
  }

  const StatusBadge = ({ status }) => {
    const colors = { approved: '#00ff88', rejected: '#ff4560', pending: '#ffa500' }
    const bg = { approved: 'rgba(0,255,136,0.1)', rejected: 'rgba(255,69,96,0.1)', pending: 'rgba(255,165,0,0.1)' }
    return (
      <span style={{ fontSize: '11px', fontWeight: '700', padding: '3px 9px', borderRadius: '8px', color: colors[status] || '#8892a4', background: bg[status] || 'rgba(255,255,255,0.05)' }}>
        {status}
      </span>
    )
  }

  if (loading) return <div style={{ height: '100vh', background: '#070a10', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#00e5ff', fontSize: '18px' }}>Loading...</div>

  if (!authorized) return (
    <div style={{ height: '100vh', background: '#070a10', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', color: '#ff4560', padding: '24px', textAlign: 'center' }}>
      <div style={{ fontSize: '60px' }}>🚫</div>
      <div style={{ fontSize: '22px', fontWeight: '800' }}>Access Denied</div>
      <button onClick={() => window.location.href = '/feed'} style={{ background: 'linear-gradient(135deg,#00e5ff,#00ff88)', border: 'none', borderRadius: '12px', padding: '12px 28px', fontSize: '14px', fontWeight: '700', color: '#070a10', cursor: 'pointer' }}>Go Back</button>
    </div>
  )

  const tabs = [
    { key: 'dashboard', label: '📊 Dashboard' },
    { key: 'invest', label: '💎 Invest' },
    { key: 'users', label: '👥 Users' },
    { key: 'posts', label: '📝 Posts' },
    { key: 'announce', label: '📢 Announce' },
    { key: 'settings', label: '⚙️ Settings' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#070a10', color: '#eef2f7' }}>

      {/* TOP BAR */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, background: 'rgba(7,10,16,0.98)', borderBottom: '1px solid rgba(0,229,255,0.1)', padding: '0 16px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 100 }}>
        <div style={{ fontSize: '16px', fontWeight: '900', background: 'linear-gradient(90deg,#00e5ff,#00ff88)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>⬡ Admin Panel</div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {(stats.pendingDeposits > 0 || stats.pendingWithdrawals > 0) && (
            <div style={{ background: '#ff4560', borderRadius: '20px', padding: '2px 8px', fontSize: '11px', fontWeight: '700', color: '#fff' }}>
              {(stats.pendingDeposits || 0) + (stats.pendingWithdrawals || 0)} pending
            </div>
          )}
          <button onClick={() => window.location.href = '/feed'} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '5px 12px', color: '#8892a4', fontSize: '12px', cursor: 'pointer' }}>← App</button>
        </div>
      </div>

      {/* TABS */}
      <div style={{ position: 'fixed', top: '56px', left: 0, right: 0, background: 'rgba(7,10,16,0.97)', borderBottom: '1px solid rgba(255,255,255,0.07)', zIndex: 99, display: 'flex', gap: '4px', padding: '8px 12px', overflowX: 'auto', scrollbarWidth: 'none' }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => {
            setTab(t.key)
            if (t.key === 'users') loadUsers()
            if (t.key === 'posts') loadPosts()
            if (t.key === 'invest') loadInvestment()
          }}
            style={{ padding: '7px 14px', borderRadius: '20px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: '700', whiteSpace: 'nowrap', flexShrink: 0, background: tab === t.key ? 'linear-gradient(135deg,#00e5ff,#00ff88)' : 'rgba(255,255,255,0.07)', color: tab === t.key ? '#070a10' : '#8892a4', position: 'relative' }}>
            {t.label}
            {t.key === 'invest' && (stats.pendingDeposits > 0 || stats.pendingWithdrawals > 0) && (
              <span style={{ position: 'absolute', top: '-4px', right: '-4px', background: '#ff4560', borderRadius: '50%', width: '14px', height: '14px', fontSize: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: '900' }}>
                {(stats.pendingDeposits || 0) + (stats.pendingWithdrawals || 0)}
              </span>
            )}
          </button>
        ))}
      </div>

      <div style={{ padding: '120px 16px 40px' }}>

        {/* ── DASHBOARD ── */}
        {tab === 'dashboard' && (
          <div>
            <div style={{ fontSize: '18px', fontWeight: '800', marginBottom: '16px', color: '#00e5ff' }}>📊 Overview</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
              {[
                { label: 'Total Users', value: stats.totalUsers || 0, icon: '👥', color: '#00e5ff' },
                { label: 'Total Posts', value: stats.totalPosts || 0, icon: '📝', color: '#00ff88' },
                { label: 'Pending Deposits', value: stats.pendingDeposits || 0, icon: '📥', color: '#ffa500' },
                { label: 'Pending Withdrawals', value: stats.pendingWithdrawals || 0, icon: '📤', color: '#ff4560' },
              ].map(s => (
                <div key={s.label} style={{ background: '#111620', border: `1px solid ${s.color}22`, borderRadius: '16px', padding: '16px', textAlign: 'center' }}>
                  <div style={{ fontSize: '28px', marginBottom: '6px' }}>{s.icon}</div>
                  <div style={{ fontSize: '28px', fontWeight: '900', color: s.color, marginBottom: '4px' }}>{s.value}</div>
                  <div style={{ fontSize: '11px', color: '#4a5568', fontWeight: '600' }}>{s.label}</div>
                </div>
              ))}
            </div>
            {(stats.pendingDeposits > 0 || stats.pendingWithdrawals > 0) && (
              <div onClick={() => { setTab('invest'); loadInvestment() }}
                style={{ background: 'rgba(255,165,0,0.08)', border: '1px solid rgba(255,165,0,0.3)', borderRadius: '14px', padding: '14px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <div style={{ fontSize: '14px', fontWeight: '700', color: '#ffa500' }}>⚠️ Pending requests need approval</div>
                <div style={{ fontSize: '12px', color: '#ffa500' }}>Review →</div>
              </div>
            )}
          </div>
        )}

        {/* ── INVEST PANEL ── */}
        {tab === 'invest' && (
          <div>
            <div style={{ fontSize: '16px', fontWeight: '800', color: '#00e5ff', marginBottom: '14px' }}>💎 Investment Control</div>

            {/* Sub tabs */}
            <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', overflowX: 'auto', scrollbarWidth: 'none' }}>
              {[
                { key: 'deposits', label: `📥 Deposits${deposits.filter(d => d.status === 'pending').length > 0 ? ` (${deposits.filter(d => d.status === 'pending').length})` : ''}` },
                { key: 'withdrawals', label: `📤 Withdrawals${withdrawals.filter(w => w.status === 'pending').length > 0 ? ` (${withdrawals.filter(w => w.status === 'pending').length})` : ''}` },
                { key: 'accounts', label: '💰 Accounts' },
                { key: 'resets', label: `🔑 Resets${passwordResetRequests.length > 0 ? ` (${passwordResetRequests.length})` : ''}` },
              ].map(t => (
                <button key={t.key} onClick={() => setInvestTab(t.key)}
                  style={{ padding: '7px 14px', borderRadius: '16px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: '700', whiteSpace: 'nowrap', flexShrink: 0, background: investTab === t.key ? 'rgba(0,229,255,0.15)' : 'rgba(255,255,255,0.06)', color: investTab === t.key ? '#00e5ff' : '#8892a4', border: investTab === t.key ? '1px solid rgba(0,229,255,0.3)' : '1px solid transparent' }}>
                  {t.label}
                </button>
              ))}
            </div>

            {/* DEPOSITS */}
            {investTab === 'deposits' && (
              <div>
                {deposits.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#4a5568' }}>No deposits yet</div>
                ) : deposits.map(dep => (
                  <div key={dep.id} style={{ background: '#111620', border: `1px solid ${dep.status === 'pending' ? 'rgba(255,165,0,0.3)' : 'rgba(255,255,255,0.07)'}`, borderRadius: '14px', padding: '14px', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                      <div>
                        <div style={{ fontSize: '18px', fontWeight: '900', color: '#00ff88' }}>${dep.amount_usd}</div>
                        <div style={{ fontSize: '12px', color: '#8892a4' }}>@{dep.profiles?.username} · {dep.profiles?.full_name}</div>
                        <div style={{ fontSize: '10px', color: '#4a5568' }}>{timeAgo(dep.requested_at)}</div>
                      </div>
                      <StatusBadge status={dep.status} />
                    </div>
                    <div style={{ background: '#0c1018', borderRadius: '10px', padding: '10px', marginBottom: '10px' }}>
                      <div style={{ fontSize: '11px', color: '#4a5568', marginBottom: '4px' }}>TX ID:</div>
                      <div style={{ fontSize: '11px', color: '#00e5ff', wordBreak: 'break-all', fontFamily: 'monospace' }}>{dep.txid}</div>
                      {dep.screenshot_url && (
                        <a href={dep.screenshot_url} target="_blank" rel="noreferrer"
                          style={{ display: 'inline-block', marginTop: '6px', fontSize: '11px', color: '#00e5ff', textDecoration: 'underline' }}>
                          View Screenshot →
                        </a>
                      )}
                    </div>
                    {dep.status === 'pending' && (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        <button onClick={() => approveDeposit(dep)}
                          style={{ padding: '10px', background: 'rgba(0,255,136,0.1)', border: '1px solid rgba(0,255,136,0.3)', borderRadius: '10px', color: '#00ff88', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>
                          ✅ Approve
                        </button>
                        <button onClick={() => { const note = prompt('Rejection reason (optional):') || ''; rejectDeposit(dep, note) }}
                          style={{ padding: '10px', background: 'rgba(255,69,96,0.1)', border: '1px solid rgba(255,69,96,0.3)', borderRadius: '10px', color: '#ff4560', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>
                          ❌ Reject
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* WITHDRAWALS */}
            {investTab === 'withdrawals' && (
              <div>
                {withdrawals.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#4a5568' }}>No withdrawals yet</div>
                ) : withdrawals.map(wd => (
                  <div key={wd.id} style={{ background: '#111620', border: `1px solid ${wd.status === 'pending' ? 'rgba(255,165,0,0.3)' : 'rgba(255,255,255,0.07)'}`, borderRadius: '14px', padding: '14px', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                      <div>
                        <div style={{ fontSize: '18px', fontWeight: '900', color: '#ffa500' }}>${wd.amount}</div>
                        <div style={{ fontSize: '12px', color: '#8892a4' }}>@{wd.profiles?.username}</div>
                        <div style={{ fontSize: '10px', color: '#4a5568' }}>{timeAgo(wd.requested_at)}</div>
                      </div>
                      <StatusBadge status={wd.status} />
                    </div>
                    <div style={{ background: '#0c1018', borderRadius: '10px', padding: '10px', marginBottom: '10px' }}>
                      <div style={{ fontSize: '11px', color: '#4a5568', marginBottom: '4px' }}>USDT Address:</div>
                      <div style={{ fontSize: '11px', color: '#00e5ff', wordBreak: 'break-all', fontFamily: 'monospace' }}>{wd.usdt_address}</div>
                    </div>
                    {wd.status === 'pending' && (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        <button onClick={() => approveWithdrawal(wd)}
                          style={{ padding: '10px', background: 'rgba(0,255,136,0.1)', border: '1px solid rgba(0,255,136,0.3)', borderRadius: '10px', color: '#00ff88', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>
                          ✅ Send & Approve
                        </button>
                        <button onClick={() => { const note = prompt('Rejection reason:') || ''; rejectWithdrawal(wd, note) }}
                          style={{ padding: '10px', background: 'rgba(255,69,96,0.1)', border: '1px solid rgba(255,69,96,0.3)', borderRadius: '10px', color: '#ff4560', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>
                          ❌ Reject
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* ACCOUNTS — balance adjust */}
            {investTab === 'accounts' && (
              <div>
                {/* Selected user panel */}
                {selectedInvestUser && (
                  <div style={{ background: 'rgba(0,229,255,0.06)', border: '1px solid rgba(0,229,255,0.2)', borderRadius: '16px', padding: '16px', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <div>
                        <div style={{ fontSize: '15px', fontWeight: '800' }}>@{selectedInvestUser.profiles?.username}</div>
                        <div style={{ fontSize: '12px', color: '#4a5568' }}>{selectedInvestUser.profiles?.full_name}</div>
                      </div>
                      <button onClick={() => setSelectedInvestUser(null)}
                        style={{ background: 'none', border: 'none', color: '#4a5568', fontSize: '18px', cursor: 'pointer' }}>✕</button>
                    </div>

                    {/* Account stats */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '14px' }}>
                      {[
                        { label: 'Wallet Balance', value: `$${(selectedInvestUser.wallet_balance || 0).toFixed(2)}`, color: '#00ff88' },
                        { label: 'Total Invested', value: `$${(selectedInvestUser.total_invested || 0).toFixed(2)}`, color: '#00e5ff' },
                        { label: 'Total Earned', value: `$${(selectedInvestUser.total_earned || 0).toFixed(2)}`, color: '#ffa500' },
                        { label: 'Total Withdrawn', value: `$${(selectedInvestUser.total_withdrawn || 0).toFixed(2)}`, color: '#ff4560' },
                      ].map(s => (
                        <div key={s.label} style={{ background: '#111620', borderRadius: '12px', padding: '10px', textAlign: 'center' }}>
                          <div style={{ fontSize: '14px', fontWeight: '900', color: s.color }}>{s.value}</div>
                          <div style={{ fontSize: '10px', color: '#4a5568' }}>{s.label}</div>
                        </div>
                      ))}
                    </div>

                    {/* Access code */}
                    <div style={{ background: '#0c1018', borderRadius: '10px', padding: '10px', marginBottom: '12px' }}>
                      <div style={{ fontSize: '11px', color: '#4a5568', marginBottom: '4px' }}>Access Code</div>
                      <div style={{ fontSize: '16px', fontWeight: '900', color: '#ffa500', letterSpacing: '4px' }}>{selectedInvestUser.password}</div>
                    </div>

                    {/* Device fingerprint */}
                    <div style={{ background: '#0c1018', borderRadius: '10px', padding: '10px', marginBottom: '14px' }}>
                      <div style={{ fontSize: '11px', color: '#4a5568', marginBottom: '4px' }}>Device Fingerprint</div>
                      <div style={{ fontSize: '10px', color: '#8892a4', fontFamily: 'monospace', wordBreak: 'break-all' }}>{selectedInvestUser.device_fingerprint || 'N/A'}</div>
                    </div>

                    {/* Balance adjust */}
                    <div style={{ fontSize: '13px', fontWeight: '700', color: '#eef2f7', marginBottom: '10px' }}>💰 Adjust Wallet Balance</div>
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                      <button onClick={() => setAdjustType('add')}
                        style={{ flex: 1, padding: '10px', background: adjustType === 'add' ? 'rgba(0,255,136,0.15)' : 'rgba(255,255,255,0.05)', border: `1px solid ${adjustType === 'add' ? '#00ff88' : 'rgba(255,255,255,0.1)'}`, borderRadius: '10px', color: adjustType === 'add' ? '#00ff88' : '#4a5568', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>
                        ➕ Add
                      </button>
                      <button onClick={() => setAdjustType('deduct')}
                        style={{ flex: 1, padding: '10px', background: adjustType === 'deduct' ? 'rgba(255,69,96,0.15)' : 'rgba(255,255,255,0.05)', border: `1px solid ${adjustType === 'deduct' ? '#ff4560' : 'rgba(255,255,255,0.1)'}`, borderRadius: '10px', color: adjustType === 'deduct' ? '#ff4560' : '#4a5568', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>
                        ➖ Deduct
                      </button>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                      <input value={balanceAdjust} onChange={e => setBalanceAdjust(e.target.value)} type="number" placeholder="Amount ($)"
                        style={{ flex: 1, background: '#0c1018', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '10px 12px', color: '#eef2f7', fontSize: '14px', outline: 'none' }} />
                      <button onClick={adjustBalance}
                        style={{ padding: '10px 18px', background: adjustType === 'add' ? 'linear-gradient(135deg,#00e5ff,#00ff88)' : 'linear-gradient(135deg,#ff4560,#c0392b)', border: 'none', borderRadius: '10px', color: '#fff', fontSize: '13px', fontWeight: '800', cursor: 'pointer' }}>
                        Apply
                      </button>
                    </div>

                    {/* Reset password from here too */}
                    <div style={{ fontSize: '13px', fontWeight: '700', color: '#eef2f7', marginBottom: '8px' }}>🔑 Reset Access Code</div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input value={newPasswordFor} onChange={e => setNewPasswordFor(e.target.value.replace(/\D/g, ''))} placeholder="New code (numbers)"
                        style={{ flex: 1, background: '#0c1018', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '10px 12px', color: '#eef2f7', fontSize: '14px', outline: 'none', letterSpacing: '3px' }} />
                      <button onClick={() => resetPassword(selectedInvestUser.user_id)}
                        style={{ padding: '10px 16px', background: 'rgba(255,202,40,0.1)', border: '1px solid rgba(255,202,40,0.3)', borderRadius: '10px', color: '#ffca28', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>
                        Reset
                      </button>
                    </div>
                  </div>
                )}

                {/* User list */}
                <div style={{ fontSize: '12px', color: '#4a5568', fontWeight: '700', letterSpacing: '1px', marginBottom: '10px' }}>
                  ALL INVESTMENT ACCOUNTS ({investUsers.length})
                </div>
                {investUsers.map(acc => (
                  <div key={acc.id} onClick={() => setSelectedInvestUser(acc)}
                    style={{ background: selectedInvestUser?.user_id === acc.user_id ? 'rgba(0,229,255,0.08)' : '#111620', border: `1px solid ${selectedInvestUser?.user_id === acc.user_id ? 'rgba(0,229,255,0.3)' : 'rgba(255,255,255,0.07)'}`, borderRadius: '12px', padding: '12px', marginBottom: '8px', cursor: 'pointer' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: '700' }}>@{acc.profiles?.username}</div>
                        <div style={{ fontSize: '11px', color: '#4a5568' }}>{acc.profiles?.full_name}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '14px', fontWeight: '900', color: '#00ff88' }}>${(acc.wallet_balance || 0).toFixed(2)}</div>
                        <div style={{ fontSize: '10px', color: '#4a5568' }}>wallet</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '12px', marginTop: '6px', fontSize: '11px', color: '#4a5568' }}>
                      <span>Invested: <span style={{ color: '#00e5ff' }}>${(acc.total_invested || 0).toFixed(0)}</span></span>
                      <span>Earned: <span style={{ color: '#ffa500' }}>${(acc.total_earned || 0).toFixed(0)}</span></span>
                      <span>Code: <span style={{ color: '#ffca28', letterSpacing: '2px' }}>{acc.password}</span></span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* PASSWORD RESETS */}
            {investTab === 'resets' && (
              <div>
                {passwordResetRequests.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#4a5568' }}>
                    <div style={{ fontSize: '32px', marginBottom: '8px' }}>✅</div>
                    <div>No pending reset requests</div>
                  </div>
                ) : passwordResetRequests.map(req => (
                  <div key={req.id} style={{ background: '#111620', border: '1px solid rgba(255,202,40,0.2)', borderRadius: '14px', padding: '14px', marginBottom: '10px' }}>
                    <div style={{ fontSize: '13px', fontWeight: '700', marginBottom: '4px' }}>@{req.profiles?.username}</div>
                    <div style={{ fontSize: '11px', color: '#4a5568', marginBottom: '4px' }}>{req.profiles?.full_name}</div>
                    <div style={{ fontSize: '11px', color: '#8892a4', marginBottom: '10px', wordBreak: 'break-all' }}>{req.message}</div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input
                        placeholder="New code (numbers)"
                        onChange={e => setNewPasswordFor(e.target.value.replace(/\D/g, ''))}
                        style={{ flex: 1, background: '#0c1018', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '9px 12px', color: '#eef2f7', fontSize: '14px', outline: 'none', letterSpacing: '3px' }}
                      />
                      <button onClick={() => resetPassword(req.user_id)}
                        style={{ padding: '9px 14px', background: 'rgba(255,202,40,0.1)', border: '1px solid rgba(255,202,40,0.3)', borderRadius: '10px', color: '#ffca28', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>
                        Send Code
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── USERS ── */}
        {tab === 'users' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ fontSize: '16px', fontWeight: '800', color: '#00e5ff' }}>👥 Users ({users.length})</div>
            </div>
            <input value={searchUser} onChange={e => setSearchUser(e.target.value)} placeholder="Search users..."
              style={{ width: '100%', background: '#111620', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '10px 14px', color: '#eef2f7', fontSize: '13px', outline: 'none', boxSizing: 'border-box', marginBottom: '12px' }} />
            {users.filter(u => !searchUser || u.username?.includes(searchUser) || u.full_name?.includes(searchUser)).map(u => (
              <div key={u.id} style={{ background: '#111620', border: `1px solid ${u.banned ? 'rgba(255,69,96,0.3)' : 'rgba(255,255,255,0.07)'}`, borderRadius: '14px', padding: '12px', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '42px', height: '42px', borderRadius: '50%', overflow: 'hidden', background: 'linear-gradient(135deg,#00e5ff,#00ff88)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }} onClick={() => window.location.href = `/user/${u.id}`}>
                    {u.avatar_url ? <img src={u.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontWeight: '800', color: '#070a10', fontSize: '16px' }}>{(u.full_name || u.username || 'E')[0].toUpperCase()}</span>}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: '700' }}>{u.full_name || u.username} {u.banned && <span style={{ color: '#ff4560', fontSize: '10px' }}>🚫 BANNED</span>}</div>
                    <div style={{ fontSize: '11px', color: '#4a5568' }}>@{u.username} · {timeAgo(u.created_at)}</div>
                    <div style={{ fontSize: '10px', color: '#2a3040', fontFamily: 'monospace' }}>{u.id}</div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                    <button onClick={() => banUser(u.id, !u.banned)} style={{ padding: '5px 10px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: '600', background: u.banned ? 'rgba(0,229,255,0.1)' : 'rgba(255,165,0,0.15)', color: u.banned ? '#00e5ff' : '#ffa500' }}>
                      {u.banned ? 'Unban' : 'Ban'}
                    </button>
                    <button onClick={() => deleteUser(u.id)} style={{ padding: '5px 10px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: '600', background: 'rgba(255,69,96,0.15)', color: '#ff4560' }}>Del</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── POSTS ── */}
        {tab === 'posts' && (
          <div>
            <div style={{ fontSize: '16px', fontWeight: '800', color: '#00e5ff', marginBottom: '14px' }}>📝 Posts ({posts.length})</div>
            {posts.map(post => (
              <div key={post.id} style={{ background: '#111620', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '14px', padding: '12px', marginBottom: '8px' }}>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                  {post.media_url && post.media_type === 'photo' && <img src={post.media_url} style={{ width: '60px', height: '60px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0 }} />}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '12px', fontWeight: '700', color: '#00e5ff', marginBottom: '3px' }}>@{post.profiles?.username}</div>
                    <div style={{ fontSize: '12px', color: '#8892a4', marginBottom: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{post.content || '(no caption)'}</div>
                    <div style={{ fontSize: '10px', color: '#4a5568' }}>❤️{post.likes_count || 0} · {timeAgo(post.created_at)}</div>
                  </div>
                  <button onClick={() => deletePost(post.id)} style={{ padding: '6px 12px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: '600', background: 'rgba(255,69,96,0.15)', color: '#ff4560', flexShrink: 0 }}>🗑</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── ANNOUNCE ── */}
        {tab === 'announce' && (
          <div>
            <div style={{ fontSize: '16px', fontWeight: '800', color: '#00e5ff', marginBottom: '16px' }}>📢 Send Announcement</div>
            <div style={{ background: '#111620', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', padding: '16px' }}>
              <textarea value={announcement} onChange={e => setAnnouncement(e.target.value)} placeholder="Write announcement..." rows={5}
                style={{ width: '100%', background: '#0c1018', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '12px', color: '#eef2f7', fontSize: '14px', outline: 'none', resize: 'none', boxSizing: 'border-box', marginBottom: '12px' }} />
              <button onClick={sendAnnouncement} disabled={!announcement.trim()}
                style={{ width: '100%', padding: '14px', background: 'linear-gradient(135deg,#00e5ff,#00ff88)', border: 'none', borderRadius: '12px', fontSize: '14px', fontWeight: '800', color: '#070a10', cursor: 'pointer', opacity: announcement.trim() ? 1 : 0.5 }}>
                📢 Send to All Users
              </button>
            </div>
          </div>
        )}

        {/* ── SETTINGS ── */}
        {tab === 'settings' && (
          <div>
            <div style={{ fontSize: '16px', fontWeight: '800', color: '#00e5ff', marginBottom: '16px' }}>⚙️ Settings</div>
            <div style={{ background: '#111620', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', padding: '16px' }}>
              {[
                { label: 'Supabase Dashboard', url: 'https://supabase.com/dashboard' },
                { label: 'Vercel Dashboard', url: 'https://vercel.com/dashboard' },
                { label: 'Cloudinary Dashboard', url: 'https://cloudinary.com/console' },
                { label: 'GitHub Repo', url: 'https://github.com/echoworldlifegame/Echo-World' },
              ].map(link => (
                <a key={link.label} href={link.url} target="_blank" rel="noreferrer"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', marginBottom: '6px', color: '#00e5ff', textDecoration: 'none', fontSize: '13px' }}>
                  {link.label} →
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
      }
