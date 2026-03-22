'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import MiningWidget from '../components/MiningWidget'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const ECHO_PRICE   = null  // price TBD at exchange listing
const TRANSFER_FEE = 0.00001  // 0.01 ECHO fee

const T = {
  wallet:      { en:'ECHO Wallet',      bn:'ECHO ওয়ালেট',    hi:'ECHO वॉलेट',      ar:'محفظة ECHO',       zh:'ECHO钱包',    fr:'Portefeuille ECHO', es:'Cartera ECHO',    ru:'ECHO Кошелёк',    pt:'Carteira ECHO',    id:'Dompet ECHO',     tr:'ECHO Cüzdanı' },
  balance:     { en:'Balance',          bn:'ব্যালেন্স',       hi:'बैलेंस',           ar:'الرصيد',           zh:'余额',         fr:'Solde',             es:'Saldo',           ru:'Баланс',          pt:'Saldo',            id:'Saldo',           tr:'Bakiye' },
  send:        { en:'Send',             bn:'পাঠাও',           hi:'भेजें',             ar:'إرسال',            zh:'发送',         fr:'Envoyer',           es:'Enviar',          ru:'Отправить',       pt:'Enviar',           id:'Kirim',           tr:'Gönder' },
  receive:     { en:'Receive',          bn:'গ্রহণ করো',       hi:'प्राप्त करें',      ar:'استقبل',           zh:'接收',         fr:'Recevoir',          es:'Recibir',         ru:'Получить',        pt:'Receber',          id:'Terima',          tr:'Al' },
  history:     { en:'History',          bn:'ইতিহাস',          hi:'इतिहास',            ar:'السجل',            zh:'历史',         fr:'Historique',        es:'Historial',       ru:'История',         pt:'Histórico',        id:'Riwayat',         tr:'Geçmiş' },
  mining:      { en:'Mining',           bn:'মাইনিং',          hi:'माइनिंग',           ar:'التعدين',          zh:'挖矿',         fr:'Minage',            es:'Minería',         ru:'Майнинг',         pt:'Mineração',        id:'Mining',          tr:'Madencilik' },
  market:      { en:'Market',           bn:'মার্কেট',         hi:'बाज़ार',             ar:'السوق',            zh:'市场',         fr:'Marché',            es:'Mercado',         ru:'Рынок',           pt:'Mercado',          id:'Pasar',           tr:'Pazar' },
  toAddress:   { en:'Recipient Address',bn:'Recipient Address',hi:'प्राप्तकर्ता पता',  ar:'عنوان المستلم',    zh:'收款地址',    fr:'Adresse destinataire',es:'Dirección receptor',ru:'Адрес получателя',pt:'Endereço receptor', id:'Alamat penerima', tr:'Alıcı Adresi' },
  amount:      { en:'Amount',           bn:'পরিমাণ',          hi:'राशि',              ar:'المبلغ',           zh:'金额',         fr:'Montant',           es:'Cantidad',        ru:'Сумма',           pt:'Valor',            id:'Jumlah',          tr:'Miktar' },
  fee:         { en:'Transfer Fee',     bn:'Transfer Fee',    hi:'Transfer Fee',      ar:'رسوم التحويل',     zh:'转账手续费',  fr:'Frais de transfert',es:'Comisión',        ru:'Комиссия',        pt:'Taxa de transferência',id:'Biaya transfer',tr:'Transfer Ücreti' },
  confirm:     { en:'Confirm Send',     bn:'নিশ্চিত করো',    hi:'पुष्टि करें',        ar:'تأكيد الإرسال',    zh:'确认发送',    fr:'Confirmer',         es:'Confirmar',       ru:'Подтвердить',     pt:'Confirmar',        id:'Konfirmasi',      tr:'Onayla' },
  yourAddress: { en:'Your Address',     bn:'তোমার Address',   hi:'तुम्हारा पता',       ar:'عنوانك',           zh:'你的地址',    fr:'Votre adresse',     es:'Tu dirección',    ru:'Ваш адрес',       pt:'Seu endereço',     id:'Alamatmu',        tr:'Adresin' },
  copied:      { en:'Copied!',          bn:'Copied!',         hi:'कॉपी हो गया!',       ar:'تم النسخ!',        zh:'已复制!',     fr:'Copié!',            es:'¡Copiado!',       ru:'Скопировано!',    pt:'Copiado!',         id:'Disalin!',        tr:'Kopyalandı!' },
  listingSoon: { en:'Listing soon on exchange', bn:'Exchange এ listing আসছে', hi:'एक्सचेंज पर जल्द लिस्टिंग', ar:'الإدراج قريباً في البورصة', zh:'即将上交易所', fr:'Bientôt listé en bourse', es:'Pronto en exchange', ru:'Скоро листинг', pt:'Em breve na exchange', id:'Segera listing di exchange', tr:'Yakında borsada listeleniyor' },
  totalEarned: { en:'Total Earned',     bn:'মোট অর্জিত',     hi:'कुल अर्जित',         ar:'إجمالي المكتسب',   zh:'总收益',      fr:'Total Gagné',       es:'Total Ganado',    ru:'Всего Заработано',pt:'Total Ganho',      id:'Total Diperoleh', tr:'Toplam Kazanılan' },
  totalSpent:  { en:'Total Spent',      bn:'মোট খরচ',        hi:'कुल खर्च',           ar:'إجمالي المنفق',    zh:'总支出',      fr:'Total Dépensé',     es:'Total Gastado',   ru:'Всего Потрачено', pt:'Total Gasto',      id:'Total Digunakan', tr:'Toplam Harcanan' },
  noTxns:      { en:'No transactions yet', bn:'এখনো কোনো transaction নেই', hi:'अभी कोई transaction नहीं', ar:'لا توجد معاملات بعد', zh:'暂无交易', fr:'Aucune transaction', es:'Sin transacciones', ru:'Нет транзакций', pt:'Sem transações', id:'Belum ada transaksi', tr:'Henüz işlem yok' },
  insufficient:{ en:'Insufficient balance', bn:'Balance পর্যাপ্ত নেই', hi:'अपर्याप्त बैलेंस', ar:'رصيد غير كافٍ', zh:'余额不足', fr:'Solde insuffisant', es:'Saldo insuficiente', ru:'Недостаточно средств', pt:'Saldo insuficiente', id:'Saldo tidak cukup', tr:'Yetersiz bakiye' },
}
const tr = (key, lang) => T[key]?.[lang] || T[key]?.en || key

export default function EchoWallet() {
  const [user,     setUser]     = useState(null)
  const [lang,     setLang]     = useState('en')
  const [token,    setToken]    = useState(null)
  const [txns,     setTxns]     = useState([])
  const [loading,  setLoading]  = useState(true)
  const [tab,      setTab]      = useState('wallet')
  const [toAddr,   setToAddr]   = useState('')
  const [sendAmt,  setSendAmt]  = useState('')
  const [sending,  setSending]  = useState(false)
  const [copied,   setCopied]   = useState(false)
  const [myAddr,   setMyAddr]   = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { window.location.href = '/'; return }
      const u = data.session.user
      setUser(u)
      // Get language preference
      const { data: acc } = await supabase.from('investment_accounts').select('language').eq('user_id', u.id).maybeSingle()
      if (acc?.language) setLang(acc.language)
      // Wallet address = user id (unique per user)
      setMyAddr(u.id)
      await loadData(u.id)
      setLoading(false)
    })
  }, [])

  const loadData = async (uid) => {
    const { data: t } = await supabase.from('echo_tokens').select('*').eq('user_id', uid).maybeSingle()
    setToken(t || { balance: 0, total_earned: 0, total_spent: 0 })
    const { data: tx } = await supabase.from('echo_token_transactions')
      .select('*').eq('user_id', uid).order('created_at', { ascending: false }).limit(50)
    setTxns(tx || [])
  }

  const handleSend = async () => {
    if (!toAddr.trim() || !sendAmt) return
    const amt   = parseFloat(sendAmt)
    const total = amt + TRANSFER_FEE
    if (isNaN(amt) || amt <= 0) { alert('Enter valid amount'); return }
    if (total > (token?.balance || 0)) { alert(tr('insufficient', lang)); return }
    if (toAddr.trim() === user.id) { alert('Cannot send to yourself'); return }

    setSending(true)

    // Find receiver by wallet address (user id)
    const { data: receiver } = await supabase.from('profiles').select('id, username, full_name').eq('id', toAddr.trim()).maybeSingle()
    if (!receiver) { alert('Address not found'); setSending(false); return }

    // Deduct from sender
    const newSenderBal = parseFloat(((token?.balance || 0) - total).toFixed(4))
    await supabase.from('echo_tokens').upsert({
      user_id: user.id,
      balance: newSenderBal,
      total_spent: parseFloat(((token?.total_spent || 0) + total).toFixed(4)),
    }, { onConflict: 'user_id' })

    // Add to receiver
    const { data: recvToken } = await supabase.from('echo_tokens').select('*').eq('user_id', receiver.id).maybeSingle()
    await supabase.from('echo_tokens').upsert({
      user_id: receiver.id,
      balance: parseFloat(((recvToken?.balance || 0) + amt).toFixed(4)),
      total_earned: parseFloat(((recvToken?.total_earned || 0) + amt).toFixed(4)),
    }, { onConflict: 'user_id' })

    // Transactions
    await supabase.from('echo_token_transactions').insert([
      { user_id: user.id,    amount: -(amt + TRANSFER_FEE), type: 'transfer', note: `Sent ${amt} ECHO to ${toAddr.slice(0,8)}... (fee: ${TRANSFER_FEE})` },
      { user_id: receiver.id, amount: amt,                  type: 'transfer', note: `Received ${amt} ECHO from ${user.id.slice(0,8)}...` },
    ])

    // Notifications — sender + receiver
    await supabase.from('notifications').insert([
      { user_id: user.id,    from_user_id: null, type: 'system', read: false, message: `🌐 Echo World: ✅ Sent ${amt} ECHO to ${receiver.username || toAddr.slice(0,8)}. Fee: ${TRANSFER_FEE} ECHO.` },
      { user_id: receiver.id, from_user_id: user.id, type: 'system', read: false, message: `🌐 Echo World: 🪙 You received ${amt} ECHO!` },
    ])

    // Push notifications
    try {
      await fetch('/api/push-notify', { method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ userId: user.id, title: '✅ ECHO Sent', message: `${amt} ECHO sent successfully.` }) })
      await fetch('/api/push-notify', { method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ userId: receiver.id, title: '🪙 ECHO Received!', message: `You received ${amt} ECHO!` }) })
    } catch(e) {}

    setToAddr(''); setSendAmt('')
    await loadData(user.id)
    setSending(false)
    alert(`✅ ${amt} ECHO sent!`)
  }

  const copyAddress = () => {
    navigator.clipboard?.writeText(myAddr)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const getTxIcon = (type) => ({
    daily_post: '📝', mining: '⛏️', invest_maturity: '💎',
    usdt_convert: '💱', transfer: '↗', referral: '🔗'
  }[type] || '🪙')

  const timeAgo = (d) => {
    const s = Math.floor((Date.now() - new Date(d)) / 1000)
    if (s < 60) return 'Just now'
    if (s < 3600) return Math.floor(s/60) + 'm ago'
    if (s < 86400) return Math.floor(s/3600) + 'h ago'
    return Math.floor(s/86400) + 'd ago'
  }

  if (loading) return (
    <div style={{ height:'100vh', background:'#070a10', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ fontSize:48, animation:'spin 1s linear infinite' }}>🪙</div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  )

  return (
    <div style={{ minHeight:'100vh', background:'#070a10', color:'#eef2f7', paddingBottom:80, fontFamily:'system-ui,sans-serif' }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}} *{box-sizing:border-box} ::-webkit-scrollbar{display:none}`}</style>

      {/* Header */}
      <div style={{ position:'sticky', top:0, zIndex:100, background:'rgba(7,10,16,.97)', backdropFilter:'blur(16px)', borderBottom:'1px solid rgba(255,255,255,.06)', padding:'14px 16px', display:'flex', alignItems:'center', gap:12 }}>
        <button onClick={()=>window.history.back()} style={{ background:'rgba(255,255,255,.06)', border:'none', borderRadius:10, padding:'8px 14px', color:'#eef2f7', fontSize:13, fontWeight:700, cursor:'pointer' }}>←</button>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:16, fontWeight:900, background:'linear-gradient(90deg,#a855f7,#00e5ff)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>{tr('wallet',lang)}</div>
          <div style={{ fontSize:10, color:'#4a5568' }}>ECHO Token</div>
        </div>
      </div>

      <div style={{ padding:'20px 16px', maxWidth:500, margin:'0 auto' }}>

        {/* Balance Card */}
        <div style={{ background:'linear-gradient(135deg,#1a0d2e,#0d1f3c)', border:'1px solid rgba(168,85,247,.25)', borderRadius:24, padding:'24px', marginBottom:20, position:'relative', overflow:'hidden', animation:'fadeUp .3s ease' }}>
          <div style={{ position:'absolute', top:-40, right:-40, width:160, height:160, background:'radial-gradient(circle,rgba(168,85,247,.15),transparent)', borderRadius:'50%', pointerEvents:'none' }}/>
          <div style={{ fontSize:11, color:'#4a5568', letterSpacing:2, marginBottom:6 }}>⛏️ {tr('balance',lang)}</div>
          <div style={{ fontSize:44, fontWeight:900, background:'linear-gradient(90deg,#a855f7,#00e5ff)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', lineHeight:1, marginBottom:4 }}>
            {(token?.balance || 0).toLocaleString()}
          </div>
          <div style={{ fontSize:13, color:'#a855f7', fontWeight:700, marginBottom:16 }}>ECHO — Price at exchange listing</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
            {[
              { label: tr('totalEarned',lang), value:(token?.total_earned||0).toLocaleString(), color:'#00ff88' },
              { label: tr('totalSpent',lang),  value:(token?.total_spent||0).toLocaleString(),  color:'#ff4560' },
            ].map((s,i) => (
              <div key={i} style={{ background:'rgba(255,255,255,.04)', borderRadius:10, padding:'8px 10px' }}>
                <div style={{ fontSize:14, fontWeight:900, color:s.color }}>{s.value}</div>
                <div style={{ fontSize:9, color:'#4a5568', marginTop:2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', background:'rgba(255,255,255,.04)', borderRadius:14, padding:3, gap:3, marginBottom:16, overflowX:'auto' }}>
          {[['wallet','💼'],['send','↗'],['receive','↙'],['mining','⛏️'],['history','📋'],['market','📈']].map(([k,ic]) => (
            <button key={k} onClick={()=>setTab(k)}
              style={{ flex:1, padding:'9px 4px', borderRadius:11, border:'none', cursor:'pointer', fontSize:11, fontWeight:700, whiteSpace:'nowrap',
                background: tab===k ? 'linear-gradient(135deg,#a855f7,#7c3aed)' : 'transparent',
                color: tab===k ? '#fff' : '#4a5568' }}>
              {ic} {tr(k,lang)}
            </button>
          ))}
        </div>

        {/* WALLET TAB */}
        {tab === 'wallet' && (
          <div>
            {/* Your address */}
            <div style={{ background:'#111620', border:'1px solid rgba(168,85,247,.15)', borderRadius:16, padding:14, marginBottom:12 }}>
              <div style={{ fontSize:11, color:'#4a5568', fontWeight:700, marginBottom:8 }}>{tr('yourAddress',lang)}</div>
              <div style={{ fontSize:11, color:'#a855f7', fontFamily:'monospace', wordBreak:'break-all', marginBottom:8 }}>{myAddr}</div>
              <button onClick={copyAddress}
                style={{ padding:'8px 16px', background: copied ? 'rgba(0,255,136,.1)' : 'rgba(168,85,247,.1)', border:`1px solid ${copied?'rgba(0,255,136,.3)':'rgba(168,85,247,.3)'}`, borderRadius:8, color: copied ? '#00ff88' : '#a855f7', fontSize:12, fontWeight:700, cursor:'pointer' }}>
                {copied ? tr('copied',lang) : '📋 Copy Address'}
              </button>
            </div>

            {/* How to earn */}
            <div style={{ background:'#111620', border:'1px solid rgba(255,255,255,.07)', borderRadius:16, padding:14 }}>
              <div style={{ fontSize:13, fontWeight:800, color:'#eef2f7', marginBottom:10 }}>🪙 How to Earn ECHO</div>
              {[
                { icon:'📝', title:'Daily Post', desc:'Post every day — 0.1 ECHO (max once/day)', earn:'+0.1 ECHO' },
                { icon:'🔥', title:'7-Day Streak', desc:'7 consecutive days — bonus +10.0 ECHO!', earn:'+10.0 ECHO bonus' },
                { icon:'⛏️', title:'Daily Mining', desc:'Start mining every day — earn 3 ECHO per 24h', earn:'+3 ECHO / 24h' },
                { icon:'💎', title:'Invest Maturity', desc:'After 365 days, USDT converts to ECHO', earn:'Principal × 1000' },
                { icon:'🔗', title:'Referral Bonus', desc:'Bonus for each referral investment', earn:'+5 ECHO' },
              ].map((item, i) => (
                <div key={i} style={{ display:'flex', gap:10, padding:'8px 0', borderBottom: i < 3 ? '1px solid rgba(255,255,255,.04)' : 'none', alignItems:'center' }}>
                  <div style={{ width:36, height:36, borderRadius:10, background:'rgba(168,85,247,.08)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>{item.icon}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:12, fontWeight:700, color:'#eef2f7' }}>{item.title}</div>
                    <div style={{ fontSize:10, color:'#4a5568' }}>{item.desc}</div>
                  </div>
                  <div style={{ fontSize:11, color:'#00ff88', fontWeight:700 }}>{item.earn}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SEND TAB */}
        {tab === 'send' && (
          <div>
            <div style={{ background:'#111620', border:'1px solid rgba(255,255,255,.07)', borderRadius:16, padding:16 }}>
              <div style={{ fontSize:13, fontWeight:800, color:'#eef2f7', marginBottom:14 }}>↗ {tr('send',lang)} ECHO</div>

              <div style={{ marginBottom:10 }}>
                <div style={{ fontSize:11, color:'#4a5568', marginBottom:6 }}>{tr('toAddress',lang)}</div>
                <input value={toAddr} onChange={e=>setToAddr(e.target.value)}
                  placeholder="Paste wallet address..."
                  style={{ width:'100%', background:'#0c1018', border:'1px solid rgba(255,255,255,.08)', borderRadius:12, padding:'12px 14px', color:'#a855f7', fontSize:13, outline:'none', fontFamily:'monospace' }}
                />
              </div>

              <div style={{ marginBottom:14 }}>
                <div style={{ fontSize:11, color:'#4a5568', marginBottom:6 }}>{tr('amount',lang)} (ECHO)</div>
                <input value={sendAmt} onChange={e=>setSendAmt(e.target.value)} type="number"
                  placeholder={`Max: ${(token?.balance||0).toFixed(4)}`}
                  style={{ width:'100%', background:'#0c1018', border:'1px solid rgba(255,255,255,.08)', borderRadius:12, padding:'12px 14px', color:'#eef2f7', fontSize:14, outline:'none' }}
                />
                {sendAmt && (
                  <div style={{ fontSize:11, color:'#4a5568', marginTop:4 }}>
                    {tr('fee',lang)}: {TRANSFER_FEE} ECHO | Total: {(parseFloat(sendAmt||0)+TRANSFER_FEE).toFixed(4)} ECHO
                  </div>
                )}
              </div>

              <button onClick={handleSend} disabled={sending || !toAddr || !sendAmt}
                style={{ width:'100%', padding:14, background:(toAddr&&sendAmt)?'linear-gradient(135deg,#a855f7,#7c3aed)':'rgba(255,255,255,.05)', border:'none', borderRadius:14, color:(toAddr&&sendAmt)?'#fff':'#4a5568', fontSize:14, fontWeight:900, cursor:(toAddr&&sendAmt)?'pointer':'default' }}>
                {sending ? '⏳ Sending...' : `↗ ${tr('confirm',lang)}`}
              </button>
            </div>
          </div>
        )}

        {/* RECEIVE TAB */}
        {tab === 'receive' && (
          <div>
            <div style={{ background:'#111620', border:'1px solid rgba(255,255,255,.07)', borderRadius:16, padding:16, textAlign:'center' }}>
              <div style={{ fontSize:13, fontWeight:800, color:'#eef2f7', marginBottom:14 }}>↙ {tr('receive',lang)} ECHO</div>
              <div style={{ fontSize:11, color:'#4a5568', marginBottom:8 }}>{tr('yourAddress',lang)}</div>
              <div style={{ background:'rgba(168,85,247,.06)', border:'1px solid rgba(168,85,247,.2)', borderRadius:12, padding:'14px', marginBottom:14, wordBreak:'break-all', fontSize:12, color:'#a855f7', fontFamily:'monospace' }}>
                {myAddr}
              </div>
              <button onClick={copyAddress}
                style={{ width:'100%', padding:13, background: copied ? 'rgba(0,255,136,.1)' : 'linear-gradient(135deg,#a855f7,#7c3aed)', border:'none', borderRadius:12, color: copied ? '#00ff88' : '#fff', fontSize:14, fontWeight:800, cursor:'pointer' }}>
                {copied ? `✅ ${tr('copied',lang)}` : `📋 Copy Address`}
              </button>
            </div>
          </div>
        )}

        {/* MINING TAB */}
        {tab === 'mining' && user && (
          <MiningWidget userId={user.id} lang={lang} onEarned={() => loadData(user.id)} />
        )}

        {/* HISTORY TAB */}
        {tab === 'history' && (
          <div>
            {txns.length === 0 ? (
              <div style={{ textAlign:'center', padding:40, color:'#4a5568' }}>
                <div style={{ fontSize:40, marginBottom:8 }}>🪙</div>
                <div>{tr('noTxns',lang)}</div>
              </div>
            ) : txns.map((tx, i) => (
              <div key={i} style={{ background:'#111620', border:'1px solid rgba(255,255,255,.06)', borderRadius:14, padding:'12px 14px', marginBottom:8, display:'flex', alignItems:'center', gap:12 }}>
                <div style={{ width:40, height:40, borderRadius:12, background: tx.amount > 0 ? 'rgba(0,255,136,.08)' : 'rgba(255,69,96,.08)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0 }}>
                  {getTxIcon(tx.type)}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:12, fontWeight:700, color:'#eef2f7' }}>{tx.note || tx.type}</div>
                  <div style={{ fontSize:10, color:'#4a5568' }}>{timeAgo(tx.created_at)}</div>
                </div>
                <div style={{ fontSize:14, fontWeight:900, color: tx.amount > 0 ? '#00ff88' : '#ff4560' }}>
                  {tx.amount > 0 ? '+' : ''}{tx.amount} ECHO
                </div>
              </div>
            ))}
          </div>
        )}

        {/* MARKET TAB */}
        {tab === 'market' && (
          <div>
            <div style={{ background:'linear-gradient(135deg,rgba(168,85,247,.08),rgba(0,229,255,.04))', border:'1px solid rgba(168,85,247,.2)', borderRadius:20, padding:24, marginBottom:14, textAlign:'center' }}>
              <div style={{ fontSize:48, marginBottom:8 }}>🪙</div>
              <div style={{ fontSize:22, fontWeight:900, background:'linear-gradient(90deg,#a855f7,#00e5ff)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>ECHO Token</div>
              <div style={{ fontSize:13, color:'#4a5568', marginTop:8 }}>{tr('listingSoon',lang)}</div>
            </div>
            {[
              { label:'Token Name', value:'Echo Token' },
              { label:'Symbol', value:'ECHO' },
              { label:'Network', value:'Echo World Chain' },
              { label:'Total Supply', value:'21,000,000 ECHO' },
              { label:'Price', value:'Available after exchange listing' },
              { label:'Your Balance', value:`${(token?.balance||0).toLocaleString()} ECHO` },
            ].map((item, i) => (
              <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'12px 0', borderBottom:'1px solid rgba(255,255,255,.04)' }}>
                <div style={{ fontSize:13, color:'#4a5568' }}>{item.label}</div>
                <div style={{ fontSize:13, fontWeight:700, color:'#eef2f7' }}>{item.value}</div>
              </div>
            ))}
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
