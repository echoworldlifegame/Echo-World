'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const USDT_ADDRESS = 'TEU8tVcEifGgTCxkpCXKw3SMfeoFNfAWkJ'
const COIN_RATE = 100 // 100 coins = 1 USDT
const MIN_COINS = 100

const COIN_PACKAGES = [
  { coins: 100,  usdt: 1,   bonus: 0,   label: 'Starter',  color: '#4a5568', emoji: '💰' },
  { coins: 500,  usdt: 5,   bonus: 50,  label: 'Popular',  color: '#00e5ff', emoji: '💎', tag: '🔥 Most Popular' },
  { coins: 1000, usdt: 10,  bonus: 150, label: 'Pro',      color: '#00ff88', emoji: '👑', tag: '✨ Best Value' },
  { coins: 2500, usdt: 25,  bonus: 500, label: 'Elite',    color: '#ffd700', emoji: '🏆', tag: '⭐ Premium' },
  { coins: 5000, usdt: 50,  bonus: 1200,label: 'Legend',   color: '#ff6b35', emoji: '🚀' },
  { coins: 10000,usdt: 100, bonus: 3000,label: 'Ultimate', color: '#ff4560', emoji: '💫', tag: '👑 Max' },
]

const fmtCount = n => !n?'0':n>=1000?(n/1000).toFixed(1)+'K':String(n)
const timeAgo = d => {
  const s=Math.floor((Date.now()-new Date(d))/1000)
  if(s<60) return 'এইমাত্র'
  if(s<3600) return Math.floor(s/60)+'মি আগে'
  if(s<86400) return Math.floor(s/3600)+'ঘ আগে'
  return Math.floor(s/86400)+'দিন আগে'
}

export default function CoinStore() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [step, setStep] = useState('store') // store | payment | submitted
  const [selectedPkg, setSelectedPkg] = useState(null)
  const [customCoins, setCustomCoins] = useState('')
  const [trxHash, setTrxHash] = useState('')
  const [screenshot, setScreenshot] = useState(null)
  const [screenshotUrl, setScreenshotUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [copied, setCopied] = useState(false)
  const [transactions, setTransactions] = useState([])
  const [pendingPurchases, setPendingPurchases] = useState([])
  const [showHistory, setShowHistory] = useState(false)
  const fileRef = useRef(null)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { window.location.href = '/'; return }
      const u = data.session.user; setUser(u)
      const { data: p } = await supabase.from('profiles').select('*').eq('id', u.id).single()
      setProfile(p)
      loadHistory(u.id)
    })
  }, [])

  const loadHistory = async (uid) => {
    const { data: tx } = await supabase.from('coin_transactions')
      .select('*').eq('user_id', uid).order('created_at', { ascending: false }).limit(20)
    setTransactions(tx || [])
    const { data: purch } = await supabase.from('coin_purchases')
      .select('*').eq('user_id', uid).eq('status', 'pending').order('created_at', { ascending: false })
    setPendingPurchases(purch || [])
  }

  const uploadScreenshot = async (file) => {
    if (!file) return null
    setUploading(true)
    try {
      const ext = file.name.split('.').pop()
      const path = `coin_screenshots/${user.id}_${Date.now()}.${ext}`
      const { error } = await supabase.storage.from('invest_screenshots').upload(path, file)
      if (error) throw error
      const { data: { publicUrl } } = supabase.storage.from('invest_screenshots').getPublicUrl(path)
      setScreenshotUrl(publicUrl)
      setUploading(false)
      return publicUrl
    } catch (e) {
      alert('Upload error: ' + e.message)
      setUploading(false)
      return null
    }
  }

  const handleFileChange = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setScreenshot(file)
    await uploadScreenshot(file)
  }

  const submitPurchase = async () => {
    if (!selectedPkg && !customCoins) return
    if (!trxHash.trim() && !screenshotUrl) {
      alert('TRX Hash অথবা Screenshot দাও'); return
    }
    setSubmitting(true)
    const coins = selectedPkg ? selectedPkg.coins + selectedPkg.bonus : parseInt(customCoins)
    const usdt = selectedPkg ? selectedPkg.usdt : Math.ceil(parseInt(customCoins) / COIN_RATE)
    try {
      await supabase.from('coin_purchases').insert({
        user_id: user.id,
        coins,
        usdt_amount: usdt,
        trx_hash: trxHash.trim() || null,
        screenshot_url: screenshotUrl || null,
        status: 'pending'
      })
      setSubmitted(true)
      setStep('submitted')
    } catch (e) {
      alert('Error: ' + e.message)
    }
    setSubmitting(false)
  }

  const totalCoins = profile?.coin_balance || 0
  const customUsdt = customCoins ? Math.ceil(parseInt(customCoins || 0) / COIN_RATE) : 0

  // ── SUBMITTED ──
  if (step === 'submitted') return (
    <div style={{ minHeight:'100vh', background:'#070a10', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', padding:'24px', gap:'16px' }}>
      <style>{`@keyframes pop{0%{transform:scale(0)}70%{transform:scale(1.2)}100%{transform:scale(1)}}`}</style>
      <div style={{ fontSize:'72px', animation:'pop .5s ease' }}>⏳</div>
      <div style={{ fontSize:'22px', fontWeight:'900', color:'#eef2f7', textAlign:'center' }}>Request পাঠানো হয়েছে!</div>
      <div style={{ fontSize:'13px', color:'#4a5568', textAlign:'center', lineHeight:'1.8' }}>
        Admin verify করলে তোমার coin balance এ<br/>
        <span style={{ color:'#ffd700', fontWeight:'800', fontSize:'16px' }}>{selectedPkg ? (selectedPkg.coins + selectedPkg.bonus) : customCoins} coins</span><br/>
        যোগ হয়ে যাবে। সাধারণত ১-২৪ ঘণ্টার মধ্যে।
      </div>
      <div style={{ background:'rgba(255,215,0,.08)', border:'1px solid rgba(255,215,0,.2)', borderRadius:'14px', padding:'14px 20px', textAlign:'center' }}>
        <div style={{ fontSize:'12px', color:'#ffca28', fontWeight:'700' }}>📊 তোমার বর্তমান Balance</div>
        <div style={{ fontSize:'28px', fontWeight:'900', color:'#ffd700', margin:'4px 0' }}>🪙 {fmtCount(totalCoins)}</div>
        <div style={{ fontSize:'11px', color:'#4a5568' }}>Coins</div>
      </div>
      <button onClick={() => window.location.href = '/profile'} style={{ padding:'14px 28px', background:'linear-gradient(135deg,#00e5ff,#00ff88)', border:'none', borderRadius:'14px', color:'#070a12', fontWeight:'800', fontSize:'14px', cursor:'pointer' }}>← Profile এ যাও</button>
    </div>
  )

  // ── PAYMENT ──
  if (step === 'payment') return (
    <div style={{ minHeight:'100vh', background:'#070a10', color:'#eef2f7', fontFamily:'system-ui,sans-serif', paddingBottom:'40px' }}>
      <style>{`*{box-sizing:border-box}`}</style>
      <div style={{ position:'sticky', top:0, background:'rgba(7,10,16,.97)', borderBottom:'1px solid rgba(255,255,255,.07)', padding:'14px 16px', display:'flex', alignItems:'center', gap:'12px', zIndex:50 }}>
        <button onClick={() => setStep('store')} style={{ background:'none', border:'none', color:'#4a5568', fontSize:'22px', cursor:'pointer' }}>←</button>
        <div style={{ fontSize:'16px', fontWeight:'900' }}>💳 Payment</div>
      </div>
      <div style={{ padding:'20px 16px' }}>
        {/* Order summary */}
        <div style={{ background:'linear-gradient(135deg,rgba(255,215,0,.12),rgba(255,107,53,.08))', border:'1px solid rgba(255,215,0,.25)', borderRadius:'20px', padding:'20px', marginBottom:'20px', textAlign:'center' }}>
          <div style={{ fontSize:'40px', marginBottom:'8px' }}>{selectedPkg?.emoji || '💰'}</div>
          <div style={{ fontSize:'28px', fontWeight:'900', color:'#ffd700' }}>
            {selectedPkg ? fmtCount(selectedPkg.coins) : customCoins} Coins
          </div>
          {selectedPkg?.bonus > 0 && (
            <div style={{ fontSize:'13px', color:'#00ff88', fontWeight:'700', marginTop:'3px' }}>
              +{selectedPkg.bonus} Bonus coins included!
            </div>
          )}
          <div style={{ fontSize:'22px', fontWeight:'900', color:'#00e5ff', marginTop:'8px' }}>
            {selectedPkg ? selectedPkg.usdt : customUsdt} USDT
          </div>
          <div style={{ fontSize:'11px', color:'#4a5568', marginTop:'2px' }}>TRC20 Network</div>
        </div>

        {/* Steps */}
        <div style={{ background:'rgba(0,229,255,.06)', border:'1px solid rgba(0,229,255,.12)', borderRadius:'14px', padding:'14px', marginBottom:'16px' }}>
          <div style={{ fontSize:'12px', color:'#00e5ff', fontWeight:'800', marginBottom:'10px' }}>📋 Payment Steps</div>
          {[
            ['1️⃣', 'নিচের address এ USDT পাঠাও'],
            ['2️⃣', 'TRX Hash অথবা Screenshot নাও'],
            ['3️⃣', 'Submit করো — Admin verify করবে'],
            ['4️⃣', 'Coins তোমার account এ যোগ হবে'],
          ].map(([n, t], i) => (
            <div key={i} style={{ display:'flex', gap:'8px', marginBottom: i<3?'7px':0 }}>
              <span style={{ fontSize:'14px' }}>{n}</span>
              <span style={{ fontSize:'12px', color:'#b0b8c8' }}>{t}</span>
            </div>
          ))}
        </div>

        {/* USDT Address */}
        <div style={{ background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.09)', borderRadius:'14px', padding:'14px', marginBottom:'16px' }}>
          <div style={{ fontSize:'11px', color:'#4a5568', marginBottom:'6px', fontWeight:'700' }}>💳 USDT TRC20 Address</div>
          <div style={{ fontSize:'11px', color:'#00e5ff', fontWeight:'700', wordBreak:'break-all', background:'rgba(0,229,255,.05)', borderRadius:'8px', padding:'8px 10px', marginBottom:'8px', lineHeight:'1.7' }}>
            {USDT_ADDRESS}
          </div>
          <button onClick={() => { navigator.clipboard?.writeText(USDT_ADDRESS); setCopied(true); setTimeout(()=>setCopied(false),2500) }}
            style={{ width:'100%', padding:'10px', background: copied?'rgba(0,255,136,.15)':'linear-gradient(135deg,#00e5ff,#00ff88)', border: copied?'1px solid rgba(0,255,136,.4)':'none', borderRadius:'10px', color: copied?'#00ff88':'#070a12', fontSize:'13px', fontWeight:'800', cursor:'pointer' }}>
            {copied ? '✓ Copied!' : '📋 Address Copy করো'}
          </button>
        </div>

        {/* TRX Hash input */}
        <div style={{ marginBottom:'14px' }}>
          <div style={{ fontSize:'12px', color:'#4a5568', fontWeight:'700', marginBottom:'7px' }}>Option 1: Transaction Hash দাও</div>
          <input value={trxHash} onChange={e => setTrxHash(e.target.value)}
            placeholder='Transaction Hash / TRX ID paste করো...'
            style={{ width:'100%', background:'rgba(255,255,255,.06)', border:'1px solid rgba(255,255,255,.1)', borderRadius:'12px', padding:'12px 14px', color:'#eef2f7', fontSize:'13px', outline:'none', fontFamily:'monospace' }}/>
        </div>

        {/* OR divider */}
        <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'14px' }}>
          <div style={{ flex:1, height:'1px', background:'rgba(255,255,255,.07)' }}/>
          <span style={{ fontSize:'12px', color:'#4a5568', fontWeight:'700' }}>অথবা</span>
          <div style={{ flex:1, height:'1px', background:'rgba(255,255,255,.07)' }}/>
        </div>

        {/* Screenshot upload */}
        <div style={{ marginBottom:'20px' }}>
          <div style={{ fontSize:'12px', color:'#4a5568', fontWeight:'700', marginBottom:'7px' }}>Option 2: Screenshot দাও</div>
          <input ref={fileRef} type='file' accept='image/*' onChange={handleFileChange} style={{ display:'none' }}/>
          {!screenshotUrl ? (
            <button onClick={() => fileRef.current?.click()} disabled={uploading}
              style={{ width:'100%', padding:'16px', background:'rgba(255,255,255,.05)', border:'2px dashed rgba(255,255,255,.12)', borderRadius:'12px', color:'#4a5568', fontSize:'13px', cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', gap:'8px' }}>
              <span style={{ fontSize:'28px' }}>{uploading ? '⏳' : '📤'}</span>
              <span>{uploading ? 'Uploading...' : 'Screenshot Upload করো'}</span>
            </button>
          ) : (
            <div style={{ position:'relative', borderRadius:'12px', overflow:'hidden', border:'2px solid rgba(0,255,136,.3)' }}>
              <img src={screenshotUrl} style={{ width:'100%', maxHeight:'200px', objectFit:'contain', background:'#111' }}/>
              <div style={{ position:'absolute', top:'8px', right:'8px', background:'rgba(0,255,136,.9)', borderRadius:'8px', padding:'4px 10px', fontSize:'11px', fontWeight:'800', color:'#070a12' }}>✓ Uploaded</div>
              <button onClick={() => { setScreenshotUrl(''); setScreenshot(null) }}
                style={{ position:'absolute', top:'8px', left:'8px', background:'rgba(255,69,96,.9)', border:'none', borderRadius:'8px', padding:'4px 10px', fontSize:'11px', fontWeight:'700', color:'#fff', cursor:'pointer' }}>Remove</button>
            </div>
          )}
        </div>

        <button onClick={submitPurchase} disabled={submitting || (!trxHash.trim() && !screenshotUrl)}
          style={{ width:'100%', padding:'15px', background: (!submitting && (trxHash.trim() || screenshotUrl)) ? 'linear-gradient(135deg,#ffd700,#ff6b35)' : 'rgba(255,255,255,.06)', border:'none', borderRadius:'16px', color: (!submitting && (trxHash.trim() || screenshotUrl)) ? '#070a12' : '#4a5568', fontSize:'15px', fontWeight:'900', cursor: (!submitting && (trxHash.trim() || screenshotUrl)) ? 'pointer' : 'default', boxShadow: (trxHash.trim()||screenshotUrl) ? '0 4px 20px rgba(255,215,0,.3)' : 'none' }}>
          {submitting ? '⏳ Submitting...' : '🪙 Coins Request পাঠাও'}
        </button>
      </div>
    </div>
  )

  // ── STORE ──
  return (
    <div style={{ minHeight:'100vh', background:'#070a10', color:'#eef2f7', fontFamily:'system-ui,sans-serif', paddingBottom:'90px' }}>
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}} @keyframes shimmer{0%{background-position:-200%}100%{background-position:200%}} *{box-sizing:border-box} ::-webkit-scrollbar{display:none}`}</style>

      {/* Header */}
      <div style={{ position:'sticky', top:0, background:'rgba(7,10,16,.97)', backdropFilter:'blur(14px)', borderBottom:'1px solid rgba(255,255,255,.07)', padding:'14px 16px', zIndex:50 }}>
        <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
          <button onClick={() => window.history.back()} style={{ background:'none', border:'none', color:'#4a5568', fontSize:'22px', cursor:'pointer' }}>←</button>
          <div style={{ fontSize:'16px', fontWeight:'900' }}>🪙 Coin Store</div>
          <div style={{ marginLeft:'auto', background:'rgba(255,215,0,.12)', border:'1px solid rgba(255,215,0,.25)', borderRadius:'20px', padding:'5px 14px', display:'flex', alignItems:'center', gap:'6px' }}>
            <span style={{ fontSize:'16px' }}>🪙</span>
            <span style={{ fontSize:'14px', fontWeight:'900', color:'#ffd700' }}>{fmtCount(totalCoins)}</span>
          </div>
        </div>
      </div>

      <div style={{ padding:'16px' }}>
        {/* Balance card */}
        <div style={{ background:'linear-gradient(135deg,#1a1f2e,#111826)', border:'1px solid rgba(255,215,0,.2)', borderRadius:'20px', padding:'20px', marginBottom:'20px', textAlign:'center', position:'relative', overflow:'hidden' }}>
          <div style={{ position:'absolute', top:'-30px', right:'-30px', width:'120px', height:'120px', borderRadius:'50%', background:'rgba(255,215,0,.05)' }}/>
          <div style={{ position:'absolute', bottom:'-20px', left:'-20px', width:'80px', height:'80px', borderRadius:'50%', background:'rgba(255,107,53,.05)' }}/>
          <div style={{ fontSize:'13px', color:'#4a5568', marginBottom:'6px', fontWeight:'700', position:'relative' }}>তোমার Coin Balance</div>
          <div style={{ fontSize:'42px', fontWeight:'900', background:'linear-gradient(135deg,#ffd700,#ff6b35)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', position:'relative' }}>
            🪙 {fmtCount(totalCoins)}
          </div>
          <div style={{ fontSize:'12px', color:'#4a5568', marginTop:'4px', position:'relative' }}>Echo Coins · {(totalCoins / COIN_RATE).toFixed(2)} USDT সমতুল্য</div>
          {pendingPurchases.length > 0 && (
            <div style={{ marginTop:'10px', background:'rgba(255,202,40,.08)', border:'1px solid rgba(255,202,40,.2)', borderRadius:'10px', padding:'8px', position:'relative' }}>
              <span style={{ fontSize:'11px', color:'#ffca28', fontWeight:'700' }}>⏳ {pendingPurchases.length}টি purchase pending verification</span>
            </div>
          )}
        </div>

        {/* Rate info */}
        <div style={{ display:'flex', gap:'8px', marginBottom:'20px' }}>
          <div style={{ flex:1, background:'rgba(0,229,255,.06)', border:'1px solid rgba(0,229,255,.12)', borderRadius:'12px', padding:'12px', textAlign:'center' }}>
            <div style={{ fontSize:'20px', fontWeight:'900', color:'#00e5ff' }}>100</div>
            <div style={{ fontSize:'10px', color:'#4a5568' }}>Coins</div>
            <div style={{ fontSize:'11px', color:'#00e5ff', fontWeight:'700' }}>= 1 USDT</div>
          </div>
          <div style={{ flex:1, background:'rgba(0,255,136,.06)', border:'1px solid rgba(0,255,136,.12)', borderRadius:'12px', padding:'12px', textAlign:'center' }}>
            <div style={{ fontSize:'20px', fontWeight:'900', color:'#00ff88' }}>Min</div>
            <div style={{ fontSize:'10px', color:'#4a5568' }}>Purchase</div>
            <div style={{ fontSize:'11px', color:'#00ff88', fontWeight:'700' }}>100 Coins</div>
          </div>
          <div style={{ flex:1, background:'rgba(255,215,0,.06)', border:'1px solid rgba(255,215,0,.12)', borderRadius:'12px', padding:'12px', textAlign:'center' }}>
            <div style={{ fontSize:'20px', fontWeight:'900', color:'#ffd700' }}>Gift</div>
            <div style={{ fontSize:'10px', color:'#4a5568' }}>Coins দিয়ে</div>
            <div style={{ fontSize:'11px', color:'#ffd700', fontWeight:'700' }}>Live তে</div>
          </div>
        </div>

        {/* Packages */}
        <div style={{ fontSize:'14px', fontWeight:'800', marginBottom:'12px' }}>🎁 Packages</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginBottom:'20px' }}>
          {COIN_PACKAGES.map((pkg, i) => (
            <div key={i} onClick={() => { setSelectedPkg(pkg); setCustomCoins(''); setStep('payment') }}
              style={{ background: selectedPkg?.coins === pkg.coins ? `${pkg.color}20` : '#111826', border:`2px solid ${selectedPkg?.coins===pkg.coins?pkg.color:'rgba(255,255,255,.07)'}`, borderRadius:'16px', padding:'16px 12px', cursor:'pointer', position:'relative', overflow:'hidden', animation:`fadeUp ${.05*i}s ease` }}>
              {pkg.tag && (
                <div style={{ position:'absolute', top:'6px', right:'6px', fontSize:'9px', background:'rgba(255,255,255,.1)', borderRadius:'6px', padding:'2px 6px', color:pkg.color, fontWeight:'800' }}>{pkg.tag}</div>
              )}
              <div style={{ fontSize:'28px', marginBottom:'6px' }}>{pkg.emoji}</div>
              <div style={{ fontSize:'18px', fontWeight:'900', color: pkg.color }}>{fmtCount(pkg.coins)}</div>
              {pkg.bonus > 0 && <div style={{ fontSize:'10px', color:'#00ff88', fontWeight:'700' }}>+{pkg.bonus} bonus</div>}
              <div style={{ fontSize:'11px', color:'#4a5568', marginTop:'2px' }}>{pkg.label}</div>
              <div style={{ fontSize:'14px', fontWeight:'900', color:'#eef2f7', marginTop:'6px' }}>{pkg.usdt} USDT</div>
            </div>
          ))}
        </div>

        {/* Custom amount */}
        <div style={{ background:'#111826', border:'1px solid rgba(255,255,255,.07)', borderRadius:'16px', padding:'16px', marginBottom:'20px' }}>
          <div style={{ fontSize:'13px', fontWeight:'800', marginBottom:'10px' }}>✏️ Custom Amount</div>
          <div style={{ display:'flex', gap:'8px', alignItems:'center' }}>
            <div style={{ position:'relative', flex:1 }}>
              <span style={{ position:'absolute', left:'12px', top:'50%', transform:'translateY(-50%)', fontSize:'16px' }}>🪙</span>
              <input value={customCoins} onChange={e => { const v=e.target.value.replace(/\D/,''); setCustomCoins(v); setSelectedPkg(null) }}
                placeholder='কতো Coin চাও? (min 100)'
                type='number' min='100'
                style={{ width:'100%', background:'rgba(255,255,255,.06)', border:'1px solid rgba(255,255,255,.1)', borderRadius:'10px', padding:'11px 14px 11px 36px', color:'#eef2f7', fontSize:'14px', outline:'none' }}/>
            </div>
            <div style={{ background:'rgba(0,229,255,.08)', border:'1px solid rgba(0,229,255,.15)', borderRadius:'10px', padding:'11px 14px', textAlign:'center', minWidth:'70px' }}>
              <div style={{ fontSize:'13px', fontWeight:'900', color:'#00e5ff' }}>{customUsdt}</div>
              <div style={{ fontSize:'10px', color:'#4a5568' }}>USDT</div>
            </div>
          </div>
          {customCoins && parseInt(customCoins) >= MIN_COINS && (
            <button onClick={() => setStep('payment')}
              style={{ width:'100%', marginTop:'12px', padding:'12px', background:'linear-gradient(135deg,#00e5ff,#00ff88)', border:'none', borderRadius:'12px', color:'#070a12', fontSize:'13px', fontWeight:'800', cursor:'pointer' }}>
              💳 {customCoins} Coins কিনো — {customUsdt} USDT
            </button>
          )}
          {customCoins && parseInt(customCoins) < MIN_COINS && (
            <div style={{ fontSize:'11px', color:'#ff4560', marginTop:'6px' }}>⚠️ Minimum 100 coins কিনতে হবে</div>
          )}
        </div>

        {/* History */}
        <div>
          <button onClick={() => setShowHistory(p=>!p)} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', width:'100%', background:'#111826', border:'1px solid rgba(255,255,255,.07)', borderRadius:'14px', padding:'14px 16px', cursor:'pointer', color:'#eef2f7' }}>
            <span style={{ fontSize:'13px', fontWeight:'800' }}>📊 Transaction History</span>
            <span style={{ fontSize:'18px', color:'#4a5568' }}>{showHistory ? '▲' : '▼'}</span>
          </button>
          {showHistory && (
            <div style={{ background:'#111826', borderRadius:'0 0 14px 14px', border:'1px solid rgba(255,255,255,.07)', borderTop:'none', overflow:'hidden' }}>
              {transactions.length === 0 ? (
                <div style={{ textAlign:'center', padding:'24px', color:'#4a5568', fontSize:'13px' }}>কোনো transaction নেই</div>
              ) : transactions.map(tx => (
                <div key={tx.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 16px', borderBottom:'1px solid rgba(255,255,255,.04)' }}>
                  <div>
                    <div style={{ fontSize:'12px', fontWeight:'700', color:'#eef2f7' }}>
                      {tx.type==='purchase'?'💳 Purchase':tx.type==='gift_sent'?'🎁 Gift Sent':tx.type==='gift_received'?'🎁 Gift Received':'⭐ Admin Grant'}
                    </div>
                    <div style={{ fontSize:'10px', color:'#4a5568' }}>{timeAgo(tx.created_at)}</div>
                    {tx.note && <div style={{ fontSize:'10px', color:'#6a7585', marginTop:'2px' }}>{tx.note}</div>}
                  </div>
                  <div style={{ fontSize:'15px', fontWeight:'900', color: tx.amount > 0 ? '#00ff88' : '#ff4560' }}>
                    {tx.amount > 0 ? '+' : ''}{tx.amount} 🪙
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom nav */}
      <div style={{ position:'fixed', bottom:0, left:0, right:0, background:'rgba(7,10,16,.98)', borderTop:'1px solid rgba(255,255,255,.07)', display:'flex', justifyContent:'space-around', padding:'10px 0 20px', zIndex:100 }}>
        {[['🏠','Home','/feed'],['🗺','Map','/map'],['📸','Post','/post'],['🏆','Rank','/leaderboard'],['👤','Me','/profile']].map(([icon, label, path]) => (
          <div key={label} onClick={() => window.location.href = path} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'3px', cursor:'pointer', color: path==='/profile'?'#00e5ff':'#4a5568' }}>
            <span style={{ fontSize:'22px' }}>{icon}</span>
            <span style={{ fontSize:'10px', fontWeight:'600' }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
         }
