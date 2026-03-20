'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const ECHO_PRICE = 0.001 // 1 ECHO = $0.001

export default function EchoWallet() {
  const [user,    setUser]    = useState(null)
  const [token,   setToken]   = useState(null)
  const [txns,    setTxns]    = useState([])
  const [loading, setLoading] = useState(true)
  const [tab,     setTab]     = useState('wallet') // wallet | market | convert
  const [convertAmt, setConvertAmt] = useState('')
  const [converting, setConverting] = useState(false)
  const [sendTo,  setSendTo]  = useState('')
  const [sendAmt, setSendAmt] = useState('')
  const [sending, setSending] = useState(false)
  const [searchUser, setSearchUser] = useState(null)
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { window.location.href = '/'; return }
      const u = data.session.user
      setUser(u)
      await loadData(u.id)
      setLoading(false)
    })
  }, [])

  const loadData = async (uid) => {
    const { data: t } = await supabase.from('echo_tokens').select('*').eq('user_id', uid).maybeSingle()
    setToken(t || { balance: 0, total_earned: 0 })

    const { data: tx } = await supabase.from('echo_token_transactions')
      .select('*').eq('user_id', uid).order('created_at', { ascending: false }).limit(50)
    setTxns(tx || [])
  }

  const searchUserByUsername = async (q) => {
    if (q.length < 2) { setSearchUser(null); return }
    setSearching(true)
    const { data } = await supabase.from('profiles').select('id, username, full_name, avatar_url')
      .ilike('username', `%${q}%`).limit(1).maybeSingle()
    setSearchUser(data || null)
    setSearching(false)
  }

  const handleSend = async () => {
    if (!searchUser || !sendAmt || parseFloat(sendAmt) <= 0) return
    if (parseFloat(sendAmt) > (token?.balance || 0)) { alert('Insufficient ECHO balance'); return }
    if (searchUser.id === user.id) { alert('নিজেকে পাঠাতে পারবে না'); return }
    setSending(true)
    const amt = parseFloat(sendAmt)

    // Sender balance কমাও
    await supabase.from('echo_tokens').upsert({
      user_id: user.id,
      balance: Math.max(0, (token?.balance || 0) - amt),
      total_spent: (token?.total_spent || 0) + amt,
    }, { onConflict: 'user_id' })

    // Receiver balance বাড়াও
    const { data: recvToken } = await supabase.from('echo_tokens').select('*').eq('user_id', searchUser.id).maybeSingle()
    await supabase.from('echo_tokens').upsert({
      user_id: searchUser.id,
      balance: (recvToken?.balance || 0) + amt,
      total_earned: (recvToken?.total_earned || 0) + amt,
    }, { onConflict: 'user_id' })

    // Transactions
    await supabase.from('echo_token_transactions').insert([
      { user_id: user.id, amount: -amt, type: 'transfer', note: `Sent to @${searchUser.username}` },
      { user_id: searchUser.id, amount: amt, type: 'transfer', note: `Received from @${user.email?.split('@')[0]}` },
    ])

    // Notification
    await supabase.from('notifications').insert({
      user_id: searchUser.id, from_user_id: user.id, type: 'system', read: false,
      message: `🌐 Echo World: 🪙 তুমি ${amt} ECHO token পেয়েছো!`
    })

    setSendAmt(''); setSendTo(''); setSearchUser(null)
    await loadData(user.id)
    setSending(false)
    alert(`✅ ${amt} ECHO পাঠানো হয়েছে @${searchUser.username} কে!`)
  }

  const timeAgo = (d) => {
    const s = Math.floor((Date.now() - new Date(d)) / 1000)
    if (s < 60) return 'এইমাত্র'
    if (s < 3600) return Math.floor(s/60) + 'm ago'
    if (s < 86400) return Math.floor(s/3600) + 'h ago'
    return Math.floor(s/86400) + 'd ago'
  }

  const getTxIcon = (type) => {
    if (type === 'daily_post') return '📝'
    if (type === 'invest_maturity') return '💎'
    if (type === 'usdt_convert') return '💱'
    if (type === 'transfer') return '↗'
    if (type === 'referral') return '🔗'
    return '🪙'
  }

  if (loading) return (
    <div style={{ height:'100vh', background:'#070a10', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:12 }}>
      <div style={{ fontSize:48, animation:'spin 1s linear infinite' }}>🪙</div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  )

  const usdValue = ((token?.balance || 0) * ECHO_PRICE).toFixed(4)

  return (
    <div style={{ minHeight:'100vh', background:'#070a10', color:'#eef2f7', paddingBottom:80, fontFamily:'system-ui,sans-serif' }}>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        @keyframes glow{0%,100%{opacity:.5}50%{opacity:1}}
        *{box-sizing:border-box}
        ::-webkit-scrollbar{display:none}
      `}</style>

      {/* Header */}
      <div style={{ position:'sticky', top:0, zIndex:100, background:'rgba(7,10,16,.97)', backdropFilter:'blur(16px)', borderBottom:'1px solid rgba(255,255,255,.06)', padding:'14px 16px', display:'flex', alignItems:'center', gap:12 }}>
        <button onClick={()=>window.history.back()} style={{ background:'rgba(255,255,255,.06)', border:'none', borderRadius:10, padding:'8px 14px', color:'#eef2f7', fontSize:13, fontWeight:700, cursor:'pointer' }}>← Back</button>
        <div>
          <div style={{ fontSize:16, fontWeight:900, background:'linear-gradient(90deg,#00e5ff,#00ff88)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>ECHO Wallet</div>
          <div style={{ fontSize:10, color:'#4a5568' }}>1 ECHO = $0.001</div>
        </div>
      </div>

      <div style={{ padding:'20px 16px', maxWidth:500, margin:'0 auto' }}>

        {/* Balance Card */}
        <div style={{ background:'linear-gradient(135deg,#0d1f3c,#051020)', border:'1px solid rgba(0,229,255,.2)', borderRadius:24, padding:'28px 24px', marginBottom:20, textAlign:'center', position:'relative', overflow:'hidden', animation:'fadeUp .3s ease' }}>
          <div style={{ position:'absolute', top:-40, right:-40, width:160, height:160, background:'radial-gradient(circle,rgba(0,229,255,.12),transparent)', borderRadius:'50%', pointerEvents:'none' }}/>
          <div style={{ fontSize:13, color:'#4a5568', letterSpacing:2, marginBottom:8 }}>ECHO BALANCE</div>
          <div style={{ fontSize:48, fontWeight:900, background:'linear-gradient(90deg,#00e5ff,#00ff88)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', lineHeight:1, marginBottom:4 }}>
            {(token?.balance || 0).toLocaleString()}
          </div>
          <div style={{ fontSize:14, color:'#4a5568', marginBottom:20 }}>ECHO ≈ ${usdValue} USD</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            {[
              { label:'Total Earned', value:(token?.total_earned||0).toLocaleString(), color:'#00ff88' },
              { label:'Total Spent',  value:(token?.total_spent||0).toLocaleString(),  color:'#ff4560' },
            ].map((s,i) => (
              <div key={i} style={{ background:'rgba(255,255,255,.04)', borderRadius:12, padding:'10px' }}>
                <div style={{ fontSize:18, fontWeight:900, color:s.color }}>{s.value}</div>
                <div style={{ fontSize:10, color:'#4a5568', marginTop:2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', background:'rgba(255,255,255,.04)', borderRadius:14, padding:3, gap:3, marginBottom:16 }}>
          {[['wallet','💼 Wallet'],['send','↗ Send'],['market','📈 Market']].map(([k,l]) => (
            <button key={k} onClick={()=>setTab(k)}
              style={{ flex:1, padding:'10px 4px', borderRadius:11, border:'none', cursor:'pointer', fontSize:12, fontWeight:700,
                background: tab===k ? 'linear-gradient(135deg,#00e5ff,#00ff88)' : 'transparent',
                color: tab===k ? '#070a10' : '#4a5568', transition:'all .2s' }}>
              {l}
            </button>
          ))}
        </div>

        {/* WALLET TAB */}
        {tab === 'wallet' && (
          <div>
            {/* How to earn */}
            <div style={{ background:'#111620', border:'1px solid rgba(0,229,255,.1)', borderRadius:16, padding:16, marginBottom:14 }}>
              <div style={{ fontSize:13, fontWeight:800, color:'#00e5ff', marginBottom:10 }}>🪙 ECHO কীভাবে পাবে</div>
              {[
                { icon:'📝', title:'প্রতিদিন Post করো', desc:'প্রতিটি post এ ECHO earn করো', earn:'+10 ECHO/post' },
                { icon:'💎', title:'Invest Maturity', desc:'365 দিন পরে USDT → ECHO convert হবে', earn:'Principal × 1000 ECHO' },
                { icon:'🔗', title:'Referral Bonus', desc:'Referral income এর একটা অংশ ECHO তে', earn:'+5 ECHO/referral' },
              ].map((item, i) => (
                <div key={i} style={{ display:'flex', gap:12, padding:'10px 0', borderBottom: i < 2 ? '1px solid rgba(255,255,255,.04)' : 'none' }}>
                  <div style={{ width:40, height:40, borderRadius:12, background:'rgba(0,229,255,.08)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0 }}>{item.icon}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:700, color:'#eef2f7' }}>{item.title}</div>
                    <div style={{ fontSize:11, color:'#4a5568' }}>{item.desc}</div>
                  </div>
                  <div style={{ fontSize:11, color:'#00ff88', fontWeight:700, whiteSpace:'nowrap' }}>{item.earn}</div>
                </div>
              ))}
            </div>

            {/* Transactions */}
            <div style={{ fontSize:13, fontWeight:800, color:'#eef2f7', marginBottom:10 }}>📋 Transaction History</div>
            {txns.length === 0 ? (
              <div style={{ textAlign:'center', padding:40, color:'#4a5568' }}>
                <div style={{ fontSize:40, marginBottom:8 }}>🪙</div>
                <div>এখনো কোনো transaction নেই</div>
              </div>
            ) : txns.map((tx, i) => (
              <div key={i} style={{ background:'#111620', border:'1px solid rgba(255,255,255,.06)', borderRadius:14, padding:'12px 14px', marginBottom:8, display:'flex', alignItems:'center', gap:12 }}>
                <div style={{ width:40, height:40, borderRadius:12, background: tx.amount > 0 ? 'rgba(0,255,136,.08)' : 'rgba(255,69,96,.08)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0 }}>
                  {getTxIcon(tx.type)}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:'#eef2f7' }}>{tx.note || tx.type}</div>
                  <div style={{ fontSize:11, color:'#4a5568' }}>{timeAgo(tx.created_at)}</div>
                </div>
                <div style={{ fontSize:15, fontWeight:900, color: tx.amount > 0 ? '#00ff88' : '#ff4560' }}>
                  {tx.amount > 0 ? '+' : ''}{tx.amount} ECHO
                </div>
              </div>
            ))}
          </div>
        )}

        {/* SEND TAB */}
        {tab === 'send' && (
          <div>
            <div style={{ background:'#111620', border:'1px solid rgba(255,255,255,.07)', borderRadius:16, padding:16, marginBottom:14 }}>
              <div style={{ fontSize:13, fontWeight:800, color:'#eef2f7', marginBottom:12 }}>↗ ECHO পাঠাও</div>

              <div style={{ marginBottom:10 }}>
                <div style={{ fontSize:11, color:'#4a5568', marginBottom:6 }}>Username</div>
                <input value={sendTo} onChange={e=>{ setSendTo(e.target.value); searchUserByUsername(e.target.value) }}
                  placeholder="@username"
                  style={{ width:'100%', background:'#0c1018', border:'1px solid rgba(255,255,255,.08)', borderRadius:12, padding:'12px 14px', color:'#eef2f7', fontSize:14, outline:'none' }}
                />
                {searching && <div style={{ fontSize:11, color:'#4a5568', marginTop:4 }}>🔍 Searching...</div>}
                {searchUser && (
                  <div style={{ marginTop:8, background:'rgba(0,229,255,.06)', border:'1px solid rgba(0,229,255,.15)', borderRadius:10, padding:'10px 12px', display:'flex', alignItems:'center', gap:10 }}>
                    <div style={{ width:32, height:32, borderRadius:'50%', background:'linear-gradient(135deg,#00e5ff,#00ff88)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:900, color:'#070a10' }}>
                      {searchUser.avatar_url ? <img src={searchUser.avatar_url} style={{ width:'100%', height:'100%', objectFit:'cover', borderRadius:'50%' }}/> : (searchUser.full_name||searchUser.username||'U')[0].toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontSize:13, fontWeight:700, color:'#eef2f7' }}>{searchUser.full_name || searchUser.username}</div>
                      <div style={{ fontSize:11, color:'#4a5568' }}>@{searchUser.username}</div>
                    </div>
                    <div style={{ marginLeft:'auto', fontSize:12, color:'#00ff88' }}>✅</div>
                  </div>
                )}
              </div>

              <div style={{ marginBottom:14 }}>
                <div style={{ fontSize:11, color:'#4a5568', marginBottom:6 }}>Amount (ECHO)</div>
                <input value={sendAmt} onChange={e=>setSendAmt(e.target.value)} type="number"
                  placeholder={`Max: ${(token?.balance||0).toLocaleString()} ECHO`}
                  style={{ width:'100%', background:'#0c1018', border:'1px solid rgba(255,255,255,.08)', borderRadius:12, padding:'12px 14px', color:'#eef2f7', fontSize:14, outline:'none' }}
                />
                {sendAmt && <div style={{ fontSize:11, color:'#4a5568', marginTop:4 }}>≈ ${(parseFloat(sendAmt||0)*ECHO_PRICE).toFixed(4)} USD</div>}
              </div>

              <button onClick={handleSend} disabled={sending || !searchUser || !sendAmt}
                style={{ width:'100%', padding:14, background: (searchUser && sendAmt) ? 'linear-gradient(135deg,#00e5ff,#00ff88)' : 'rgba(255,255,255,.05)', border:'none', borderRadius:14, color: (searchUser && sendAmt) ? '#070a10' : '#4a5568', fontSize:14, fontWeight:900, cursor: (searchUser && sendAmt) ? 'pointer' : 'default' }}>
                {sending ? '⏳ Sending...' : '↗ Send ECHO'}
              </button>
            </div>
          </div>
        )}

        {/* MARKET TAB */}
        {tab === 'market' && (
          <div>
            {/* Price card */}
            <div style={{ background:'linear-gradient(135deg,rgba(0,229,255,.08),rgba(0,255,136,.04))', border:'1px solid rgba(0,229,255,.2)', borderRadius:20, padding:24, marginBottom:14, textAlign:'center' }}>
              <div style={{ fontSize:36, marginBottom:8 }}>🪙</div>
              <div style={{ fontSize:24, fontWeight:900, background:'linear-gradient(90deg,#00e5ff,#00ff88)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>ECHO Token</div>
              <div style={{ fontSize:32, fontWeight:900, color:'#00ff88', margin:'12px 0' }}>$0.001</div>
              <div style={{ fontSize:11, color:'#4a5568' }}>Current Price</div>
            </div>

            {/* Token info */}
            {[
              { label:'Token Name', value:'Echo Token' },
              { label:'Symbol', value:'ECHO' },
              { label:'Network', value:'Echo World Chain' },
              { label:'Total Supply', value:'21,000,000 ECHO' },
              { label:'Initial Price', value:'$0.001' },
              { label:'Your Balance', value:`${(token?.balance||0).toLocaleString()} ECHO` },
              { label:'Your USD Value', value:`$${usdValue}` },
            ].map((item, i) => (
              <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'12px 0', borderBottom:'1px solid rgba(255,255,255,.04)' }}>
                <div style={{ fontSize:13, color:'#4a5568' }}>{item.label}</div>
                <div style={{ fontSize:13, fontWeight:700, color:'#eef2f7' }}>{item.value}</div>
              </div>
            ))}

            <div style={{ background:'rgba(255,165,0,.05)', border:'1px solid rgba(255,165,0,.15)', borderRadius:14, padding:'14px', marginTop:16, textAlign:'center' }}>
              <div style={{ fontSize:12, fontWeight:700, color:'#ffa500', marginBottom:4 }}>⚠️ Coming Soon</div>
              <div style={{ fontSize:11, color:'#8892a4', lineHeight:1.7 }}>
                ECHO Token শীঘ্রই crypto exchange এ list হবে।
                তোমার ECHO balance সংরক্ষণ করো।
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Nav */}
      <div style={{ position:'fixed', bottom:0, left:0, right:0, background:'rgba(7,10,16,.98)', backdropFilter:'blur(20px)', borderTop:'1px solid rgba(255,255,255,.05)', display:'flex', justifyContent:'space-around', padding:'10px 0 22px', zIndex:100 }}>
        {[['🏠','/feed'],['🗺','/map'],['📸','/post'],['🏆','/leaderboard'],['👤','/profile']].map(([ic,path]) => (
          <div key={path} onClick={()=>window.location.href=path} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:3, cursor:'pointer', color:'#2a3040' }}>
            <span style={{ fontSize:22 }}>{ic}</span>
          </div>
        ))}
      </div>
    </div>
  )
        }
