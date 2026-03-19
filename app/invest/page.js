'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const OFFER_END     = new Date('2027-06-30')
const USDT_ADDRESS  = 'TEU8tVcEifGgTCxkpCXKw3SMfeoFNfAWkJ'
const MIN_DEPOSIT   = 100
const CLOUDINARY_CLOUD  = 'dbguxwpa8'
const CLOUDINARY_PRESET = 'echoworld_preset'

const PLANS = [
  { min:100,  max:499.99,  rate:2.0, label:'Starter', color:'#00e5ff', emoji:'🌱', monthly:60,  yearly:730  },
  { min:500,  max:999.99,  rate:2.5, label:'Growth',  color:'#00ff88', emoji:'🚀', monthly:75,  yearly:912  },
  { min:1000, max:999999,  rate:3.0, label:'Elite',   color:'#ffa500', emoji:'💎', monthly:90,  yearly:1095 },
]

const LANGS = {
  en:{ name:'English',   flag:'🇬🇧' },
  bn:{ name:'বাংলা',     flag:'🇧🇩' },
  hi:{ name:'हिंदी',     flag:'🇮🇳' },
  ar:{ name:'العربية',   flag:'🇸🇦' },
  zh:{ name:'中文',       flag:'🇨🇳' },
  fr:{ name:'Français',  flag:'🇫🇷' },
  es:{ name:'Español',   flag:'🇪🇸' },
  ru:{ name:'Русский',   flag:'🇷🇺' },
  pt:{ name:'Português', flag:'🇧🇷' },
  id:{ name:'Indonesia', flag:'🇮🇩' },
  tr:{ name:'Türkçe',    flag:'🇹🇷' },
}

const TT = {
  dashboard: { en:'Dashboard',  bn:'ড্যাশবোর্ড', hi:'डैशबोर्ड',  ar:'لوحة التحكم', zh:'仪表板',    fr:'Tableau de bord', es:'Panel',      ru:'Главная',  pt:'Painel',   id:'Dasbor',    tr:'Gösterge Paneli' },
  invest:    { en:'Invest',     bn:'বিনিয়োগ',   hi:'निवेश',      ar:'استثمر',      zh:'投资',      fr:'Investir',        es:'Invertir',   ru:'Инвестиции',pt:'Investir', id:'Investasi', tr:'Yatırım' },
  deposit:   { en:'Deposit',    bn:'ডিপোজিট',   hi:'जमा',        ar:'إيداع',        zh:'存款',      fr:'Dépôt',           es:'Depósito',   ru:'Пополнение',pt:'Depósito', id:'Deposit',   tr:'Yatır' },
  withdraw:  { en:'Withdraw',   bn:'উইথড্র',    hi:'निकासी',     ar:'سحب',          zh:'提款',      fr:'Retirer',         es:'Retirar',    ru:'Вывод',    pt:'Sacar',    id:'Tarik',     tr:'Çek' },
  refer:     { en:'Refer',      bn:'রেফার',      hi:'रेफर',       ar:'إحالة',        zh:'推荐',      fr:'Parrainer',       es:'Referir',    ru:'Реферал',  pt:'Indicar',  id:'Referral',  tr:'Davet' },
  history:   { en:'History',    bn:'ইতিহাস',    hi:'इतिहास',     ar:'السجل',        zh:'历史',      fr:'Historique',      es:'Historial',  ru:'История',  pt:'Histórico',id:'Riwayat',  tr:'Geçmiş' },
  balance:   { en:'Balance',    bn:'ব্যালেন্স',  hi:'बैलेंस',     ar:'الرصيد',       zh:'余额',      fr:'Solde',           es:'Saldo',      ru:'Баланс',   pt:'Saldo',    id:'Saldo',     tr:'Bakiye' },
  totalEarned:{ en:'Total Earned', bn:'মোট আয়', hi:'कुल कमाई',   ar:'إجمالي الأرباح',zh:'总收益',   fr:'Total Gagné',     es:'Total Ganado',ru:'Итого',   pt:'Total Ganho',id:'Total Pendapatan',tr:'Toplam Kazanç' },
  invested:  { en:'Invested',   bn:'বিনিয়োগকৃত',hi:'निवेशित',    ar:'مستثمر',       zh:'已投资',    fr:'Investi',         es:'Invertido',  ru:'Инвестировано',pt:'Investido',id:'Diinvestasikan',tr:'Yatırılan' },
  withdrawn: { en:'Withdrawn',  bn:'উত্তোলিত',  hi:'निकाला',     ar:'مسحوب',        zh:'已提款',    fr:'Retiré',          es:'Retirado',   ru:'Выведено', pt:'Sacado',   id:'Ditarik',   tr:'Çekildi' },
}
// Monetization translations যোগ
const TM = {
  monetize:      { en:'Monetize',       bn:'মনিটাইজ',      hi:'मोनेटाइज',     ar:'تحقيق الدخل',  zh:'变现',     fr:'Monétiser',      es:'Monetizar',   ru:'Монетизация', pt:'Monetizar',  id:'Monetisasi',  tr:'Gelir Et' },
  locked:        { en:'Locked',         bn:'লক করা',        hi:'लॉक्ड',         ar:'مقفل',          zh:'已锁定',   fr:'Verrouillé',     es:'Bloqueado',   ru:'Заблокировано',pt:'Bloqueado', id:'Terkunci',   tr:'Kilitli' },
  unlocked:      { en:'Unlocked',       bn:'আনলক',          hi:'अनलॉक्ड',       ar:'مفتوح',         zh:'已解锁',   fr:'Déverrouillé',   es:'Desbloqueado',ru:'Разблокировано',pt:'Desbloqueado',id:'Terbuka', tr:'Açıldı' },
  daysLeft:      { en:'Days Left',      bn:'দিন বাকি',      hi:'दिन शेष',       ar:'أيام متبقية',   zh:'剩余天数', fr:'Jours Restants', es:'Días Restantes',ru:'Осталось дней',pt:'Dias Restantes',id:'Hari Tersisa',tr:'Kalan Gün' },
  eligible:      { en:'Eligible',       bn:'যোগ্য',         hi:'पात्र',          ar:'مؤهل',          zh:'符合条件', fr:'Éligible',       es:'Elegible',    ru:'Право имею', pt:'Elegível',   id:'Memenuhi Syarat',tr:'Uygun' },
  notEligible:   { en:'Not Eligible',   bn:'যোগ্য নয়',     hi:'पात्र नहीं',    ar:'غير مؤهل',      zh:'不符合',   fr:'Non Éligible',   es:'No Elegible', ru:'Не имею права',pt:'Não Elegível',id:'Tidak Memenuhi',tr:'Uygun Değil' },
  videoIncome:   { en:'Video Income',   bn:'ভিডিও আয়',     hi:'वीडियो आय',     ar:'دخل الفيديو',   zh:'视频收入', fr:'Revenu Vidéo',   es:'Ingresos Video',ru:'Доход Видео',pt:'Renda Vídeo', id:'Pendapatan Video',tr:'Video Geliri' },
  adRevenue:     { en:'Ad Revenue',     bn:'বিজ্ঞাপন আয়',  hi:'विज्ञापन आय',   ar:'عائد الإعلانات',zh:'广告收入', fr:'Revenus Pub',    es:'Ingresos Anuncios',ru:'Доход Реклама',pt:'Receita Anúncio',id:'Pendapatan Iklan',tr:'Reklam Geliri' },
  creatorFund:   { en:'Creator Fund',   bn:'ক্রিয়েটর ফান্ড',hi:'क्रिएटर फंड',  ar:'صندوق المبدعين',zh:'创作者基金',fr:'Fonds Créateur', es:'Fondo Creador',ru:'Фонд Создателей',pt:'Fundo Criador',id:'Dana Kreator',tr:'Yaratıcı Fonu' },
  liveGifts:     { en:'Live Gifts',     bn:'লাইভ গিফট',    hi:'लाइव गिफ्ट',   ar:'هدايا البث المباشر',zh:'直播礼物',fr:'Cadeaux Live',   es:'Regalos Live', ru:'Подарки Лайв',pt:'Presentes Live',id:'Hadiah Live',tr:'Canlı Hediyeler' },
  nidVerify:     { en:'NID Verify',     bn:'NID যাচাই',     hi:'NID सत्यापन',   ar:'التحقق من الهوية',zh:'身份验证',fr:'Vérif. Identité',es:'Verificar ID',ru:'Верификация',pt:'Verificar ID',id:'Verifikasi NID',tr:'Kimlik Doğrula' },
  analytics:     { en:'Analytics',      bn:'অ্যানালিটিক্স', hi:'विश्लेषण',      ar:'تحليلات',        zh:'分析',     fr:'Analytique',     es:'Análisis',    ru:'Аналитика',  pt:'Análise',    id:'Analitik',    tr:'Analitik' },
  supporters:    { en:'Supporters',     bn:'সাপোর্টার',    hi:'समर्थक',        ar:'المتابعون',      zh:'支持者',   fr:'Supporters',     es:'Seguidores',  ru:'Поддержка',  pt:'Apoiadores', id:'Pendukung',   tr:'Destekçiler' },
  views:         { en:'Views',          bn:'ভিউ',           hi:'व्यू',           ar:'المشاهدات',      zh:'观看次数', fr:'Vues',           es:'Vistas',      ru:'Просмотры',  pt:'Visualizações',id:'Tampilan',   tr:'Görüntüleme' },
  watchTime:     { en:'Watch Time',     bn:'ওয়াচ টাইম',   hi:'वॉच टाइम',      ar:'وقت المشاهدة',   zh:'观看时长', fr:'Temps de Visionnage',es:'Tiempo de Visualización',ru:'Время Просмотра',pt:'Tempo Assistido',id:'Waktu Tonton',tr:'İzleme Süresi' },
  income:        { en:'Income',         bn:'আয়',            hi:'आय',             ar:'الدخل',          zh:'收入',     fr:'Revenu',         es:'Ingresos',    ru:'Доход',      pt:'Renda',      id:'Pendapatan',  tr:'Gelir' },
  pending:       { en:'Pending',        bn:'অপেক্ষমাণ',    hi:'लंबित',          ar:'معلق',           zh:'待处理',   fr:'En Attente',     es:'Pendiente',   ru:'В Ожидании', pt:'Pendente',   id:'Menunggu',    tr:'Bekliyor' },
  approved:      { en:'Approved',       bn:'অনুমোদিত',      hi:'अनुमोदित',      ar:'موافق عليه',     zh:'已批准',   fr:'Approuvé',       es:'Aprobado',    ru:'Одобрено',   pt:'Aprovado',   id:'Disetujui',   tr:'Onaylandı' },
  submit:        { en:'Submit',         bn:'জমা দাও',       hi:'सबमिट करें',    ar:'إرسال',          zh:'提交',     fr:'Soumettre',      es:'Enviar',      ru:'Отправить',  pt:'Enviar',     id:'Kirim',       tr:'Gönder' },
  tips:          { en:'Tips to Grow',   bn:'বৃদ্ধির টিপস',  hi:'विकास टिप्स',   ar:'نصائح للنمو',    zh:'增长技巧', fr:'Conseils Croissance',es:'Consejos de Crecimiento',ru:'Советы Роста',pt:'Dicas de Crescimento',id:'Tips Pertumbuhan',tr:'Büyüme İpuçları' },
}
const tm = (key, lg) => TM[key]?.[lg] || TM[key]?.en || key
const tt = (key, lg) => TT[key]?.[lg] || TT[key]?.en || key

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

// NID upload function
async function uploadNID(file) {
  const form = new FormData()
  form.append('file', file)
  form.append('upload_preset', CLOUDINARY_PRESET)
  form.append('folder', 'nid_documents')
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
function Certificate({ inv, username, referralLink, onClose }) {
  const plan = getPlan(inv.amount_usd)
  const certRef = useRef(null)
  const daysIn = Math.floor((Date.now() - new Date(inv.start_date)) / 86400000)
  const earnedSoFar = (daysIn * inv.amount_usd * inv.daily_rate / 100).toFixed(2)

  const loadHtml2Canvas = () => new Promise((resolve, reject) => {
    if (window.html2canvas) { resolve(window.html2canvas); return }
    const script = document.createElement('script')
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'
    script.onload = () => resolve(window.html2canvas)
    script.onerror = reject
    document.head.appendChild(script)
  })

  const handleShare = async () => {
    const shareText = `💎 I'm earning ${inv.daily_rate}% daily on my $${inv.amount_usd} ${plan?.label} investment!\n\n🌐 Join Echo Invest with my link:\n${referralLink}`
    try {
      const h2c = await loadHtml2Canvas()
      const canvas = await h2c(certRef.current, { backgroundColor: '#050d1a', scale: 2, useCORS: true })
      canvas.toBlob(async (blob) => {
        if (blob && navigator.share && navigator.canShare?.({ files: [new File([blob], 'certificate.png', { type: 'image/png' })] })) {
          const file = new File([blob], 'echo-certificate.png', { type: 'image/png' })
          await navigator.share({ title: 'Echo Invest Certificate', text: shareText, files: [file] })
        } else if (blob) {
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url; a.download = 'echo-certificate.png'; a.click()
          URL.revokeObjectURL(url)
          setTimeout(() => { navigator.clipboard?.writeText(shareText); alert('✅ Certificate saved! Now share the image.') }, 500)
        }
      }, 'image/png')
    } catch (err) {
      navigator.clipboard?.writeText(shareText)
      alert('✅ Link copied! Paste and share.')
    }
  }

  const handleDownload = async () => {
    try {
      const h2c = await loadHtml2Canvas()
      const canvas = await h2c(certRef.current, { backgroundColor: '#050d1a', scale: 3, useCORS: true })
      const url = canvas.toDataURL('image/png')
      const a = document.createElement('a')
      a.href = url; a.download = `echo-certificate-${username}.png`; a.click()
    } catch (err) {
      alert('Download failed. Try screenshot.')
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

          <div style={{ fontSize:'9px', color:'#2a3040', letterSpacing:'1px', marginBottom:'6px' }}>echo-world-psi.vercel.app/invest</div>

          {/* Referral link on certificate */}
          <div style={{ background:`${plan?.color}09`, border:`1px solid ${plan?.color}22`, borderRadius:'8px', padding:'6px 10px' }}>
            <div style={{ fontSize:'8px', color:'#4a5568', fontWeight:'700', marginBottom:'2px', letterSpacing:'0.5px' }}>🔗 JOIN WITH MY LINK</div>
            <div style={{ fontSize:'9px', color:plan?.color, fontFamily:'monospace', wordBreak:'break-all', lineHeight:'1.5' }}>{referralLink}</div>
          </div>
        </div>

        {/* ── Referral Link Card (certificate এর বাইরে, share হবে না) ── */}
        <div style={{ marginTop:'14px', background:'linear-gradient(135deg,rgba(0,0,0,0.6),rgba(5,13,26,0.9))', border:`1px solid ${plan?.color}33`, borderRadius:'16px', padding:'16px', backdropFilter:'blur(10px)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'10px' }}>
            <div style={{ width:'32px', height:'32px', borderRadius:'50%', background:`linear-gradient(135deg,${plan?.color},#00ff88)`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'16px', flexShrink:0 }}>🔗</div>
            <div>
              <div style={{ fontSize:'12px', fontWeight:'800', color:'#eef2f7' }}>আপনার রেফারেল লিংক</div>
              <div style={{ fontSize:'10px', color:'#4a5568' }}>Share this link to earn commission</div>
            </div>
          </div>
          <div style={{ background:'rgba(0,0,0,0.4)', border:`1px solid ${plan?.color}22`, borderRadius:'10px', padding:'10px 12px', marginBottom:'10px' }}>
            <div style={{ fontSize:'11px', color:plan?.color, fontFamily:'monospace', wordBreak:'break-all', lineHeight:'1.6' }}>{referralLink}</div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px' }}>
            <button onClick={() => { navigator.clipboard?.writeText(referralLink); alert('✅ Link copied!') }}
              style={{ padding:'10px', background:`${plan?.color}15`, border:`1px solid ${plan?.color}33`, borderRadius:'10px', color:plan?.color, fontSize:'12px', fontWeight:'700', cursor:'pointer' }}>
              📋 Copy Link
            </button>
            <button onClick={handleShare}
              style={{ padding:'10px', background:`linear-gradient(135deg,${plan?.color},#00ff88)`, border:'none', borderRadius:'10px', color:'#050810', fontSize:'12px', fontWeight:'800', cursor:'pointer' }}>
              📤 Share All
            </button>
          </div>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px', marginTop:'10px' }}>
          <button onClick={handleDownload}
            style={{ padding:'14px', background:'rgba(0,229,255,0.1)', border:'1px solid rgba(0,229,255,0.3)', borderRadius:'13px', color:'#00e5ff', fontSize:'13px', fontWeight:'700', cursor:'pointer' }}>
            ⬇ Save Image
          </button>
          <button onClick={onClose}
            style={{ padding:'14px', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'13px', color:'#8892a4', fontSize:'13px', fontWeight:'700', cursor:'pointer' }}>
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
function ShareCard({ account, investments, username, referralLink, onClose }) {
  const totalDaily = investments.filter(i=>i.status==='active').reduce((s,i)=>s+(i.amount_usd*i.daily_rate/100),0)
  const plan = getPlan(account?.total_invested || 0)

  const handleShare = async () => {
    const text = `💎 I'm earning $${totalDaily.toFixed(2)}/day on Echo Invest!\n\n💰 Total Invested: $${(account?.total_invested||0).toFixed(0)}\n⚡ Total Earned: $${(account?.total_earned||0).toFixed(2)}\n\n🔗 Join with my link:\n${referralLink}`
    if (navigator.share) await navigator.share({ title:'Echo Invest Earnings', text, url: referralLink })
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
              { label:tt('invested',lang), value:`$${(account?.total_invested||0).toFixed(0)}`, color:'#00e5ff' },
              { label:tt('totalEarned',lang),   value:`$${(account?.total_earned||0).toFixed(2)}`,   color:'#ffa500' },
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
   LOCK SCREEN — Main component এর বাইরে defined
   এটা বাইরে থাকলে re-render এ keyboard dismiss হবে না
───────────────────────────────────────────────────────── */
function LockScreen({ children }) {
  return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(160deg,#020509,#070d1a,#020509)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'20px', position:'relative' }}>
      <style>{`
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        *{box-sizing:border-box}
      `}</style>

      {/* Logo */}
      <div style={{ animation:'float 3s ease-in-out infinite', marginBottom:'16px' }}>
        <div style={{ width:'80px', height:'80px', borderRadius:'50%', background:'linear-gradient(135deg,#00e5ff,#00ff88)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'36px' }}>💎</div>
      </div>
      <div style={{ fontSize:'26px', fontWeight:'900', background:'linear-gradient(90deg,#00e5ff,#00ff88)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', marginBottom:'4px' }}>Echo Invest</div>
      <div style={{ fontSize:'12px', color:'#4a5568', marginBottom:'24px' }}>Daily Returns · Secure · Transparent</div>

      {/* Static badges — কোনো animation/state নেই, keyboard safe */}
      <div style={{ display:'flex', flexWrap:'wrap', gap:'6px', justifyContent:'center', marginBottom:'24px', maxWidth:'320px' }}>
        {['🔒 Secure', '💎 Principal returned', '📅 14th & 28th', '👥 2-Level refer'].map(t => (
          <div key={t} style={{ background:'rgba(0,229,255,0.05)', border:'1px solid rgba(0,229,255,0.12)', borderRadius:'20px', padding:'5px 11px', fontSize:'10px', color:'#8892a4' }}>{t}</div>
        ))}
      </div>

      {/* PIN form — children */}
      {children}

      <div style={{ marginTop:'20px', maxWidth:'310px', background:'rgba(255,165,0,0.05)', border:'1px solid rgba(255,165,0,0.15)', borderRadius:'12px', padding:'10px 14px', fontSize:'11px', color:'#ffa500', textAlign:'center', lineHeight:'1.6' }}>
        ⚠️ One account per device. Duplicates will be permanently banned.
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
  const [lang, setLang]           = useState(() => { try{ return localStorage.getItem('echoLang')||'bn' }catch(e){ return 'bn' } })
  const [showLangPicker, setShowLangPicker] = useState(false)
  const [activeTab,      setActiveTab]      = useState('dashboard')
  const [monetizeView,   setMonetizeView]   = useState('home') // home|videos|ads|fund|gifts|nid|videoDetail
  const [selectedVideo,  setSelectedVideo]  = useState(null)
  const [isMatured,      setIsMatured]      = useState(false)
  const [daysLeft,       setDaysLeft]       = useState(365)
  const [monetizProgress,setMonetizProgress]= useState(0)
  const [nidFront,       setNidFront]       = useState(null)
  const [nidBack,        setNidBack]        = useState(null)
  const [nidUploading,   setNidUploading]   = useState(false)
  const [nidStatus,      setNidStatus]      = useState('none') // none|pending|approved|rejected
  const [userPosts,      setUserPosts]      = useState([])
  const [shortViews,     setShortViews]     = useState(0)
  const [longWatchHrs,   setLongWatchHrs]   = useState(0)
  const [supporterCount, setSupporterCount] = useState(0)
  const [isMonetized,    setIsMonetized]    = useState(false)
  const [bannerIndex, setBannerIndex] = useState(0)
  const [slideIndex, setSlideIndex] = useState(0)
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
  const [autoDetecting, setAutoDetecting]   = useState(false)
  const [autoTimer, setAutoTimer]           = useState(0)
  const [autoFound, setAutoFound]           = useState(false)
  const autoIntervalRef = useRef(null)
  const autoTimerRef    = useRef(null)
  const autoStartRef    = useRef(null)
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

  const [referralCode, setReferralCode] = useState('')

  // Wallet features
  const [walletTab, setWalletTab]       = useState('withdraw')
  const [showScanner, setShowScanner]   = useState(false)
  const [scannerStarted, setScannerStarted] = useState(false)
  const scannerRef = useRef(null)
  const html5QrRef = useRef(null)
  const [transferTo, setTransferTo]     = useState('')
  const [transferAmt, setTransferAmt]   = useState('')
  const [transferring, setTransferring] = useState(false)
  const [transferUser, setTransferUser] = useState(null)
  const [showQR, setShowQR]             = useState(false)
  const [reinvestAmt, setReinvestAmt]   = useState('')
  const [reinvesting, setReinvesting]   = useState(false)
  const [walletAddr, setWalletAddr]     = useState('')
  const [username, setUsername]         = useState('')
  const [showShareCard, setShowShareCard] = useState(false)
  const [showTree, setShowTree]   = useState(false)
  const [certInv, setCertInv]     = useState(null)

  // Dark/Light mode
  const [darkMode, setDarkMode] = useState(true)
  const bg0  = darkMode ? '#070a12'            : '#f0f4f8'
  const bg1  = darkMode ? '#111620'            : '#ffffff'
  const txt  = darkMode ? '#eef2f7'            : '#1a202c'
  const muted= darkMode ? '#4a5568'            : '#718096'
  const bord = darkMode ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.1)'

  // 2FA TOTP
  const [twoFAEnabled, setTwoFAEnabled] = useState(false)
  const [twoFAStep, setTwoFAStep]       = useState(null)
  const [twoFASecret, setTwoFASecret]   = useState('')
  const [totpInput, setTotpInput]       = useState('')
  const [totpError, setTotpError]       = useState('')
  const [twoFAQR, setTwoFAQR]           = useState('')
  const [twoFAInput, setTwoFAInput]     = useState('')
  const [twoFAError, setTwoFAError]     = useState('')
  const [loadingTOTP, setLoadingTOTP]   = useState(false)

  // Chart
  const [chartPeriod, setChartPeriod] = useState('7')

  const { timer: wdTimer, isWindow: isWdWindow } = useWithdrawalTimer()
  const daysLeft = Math.max(0, Math.ceil((OFFER_END - new Date()) / 86400000))

  // Banner — শুধু authStep === 'app' এ চলবে, PIN screen এ বন্ধ থাকবে
  useEffect(() => {
    if (authStep !== 'app') return
    const iv = setInterval(() => setBannerIndex(i => (i+1) % BANNERS.length), 3000)
    return () => clearInterval(iv)
  }, [authStep])

  // Marketing carousel auto-slide
  useEffect(() => {
    if (authStep !== 'app') return
    const iv = setInterval(() => setSlideIndex(i => (i+1) % 4), 4000)
    return () => clearInterval(iv)
  }, [authStep])

  // Wallet address generate
  useEffect(() => {
    if (!user?.id) return
    setWalletAddr('EW' + user.id)
  }, [user])

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { window.location.href = '/'; return }
      const u = data.session.user
      setUser(u); setForgotEmail(u.email || '')

      // URL থেকে ref code পড়া
      const params = new URLSearchParams(window.location.search)
      const refCode = params.get('ref')

      const { data: acc } = await supabase.from('investment_accounts').select('*').eq('user_id', u.id).single()
      setAccount(acc)
      if (acc?.totp_enabled) { setTwoFAEnabled(true); if (acc.totp_secret) setTwoFASecret(acc.totp_secret) }

      // referral code resolve করা — code দিয়ে referrer এর user_id বের করা
      if (refCode && (!acc || !acc.referred_by)) {
        // UUID format হলে সরাসরি, নাহলে referral_code দিয়ে খোঁজা
        const isUUID = /^[0-9a-f-]{36}$/.test(refCode)
        if (isUUID) {
          // পুরনো UUID link — সরাসরি ব্যবহার
          if (acc) {
            await supabase.from('investment_accounts').update({ referred_by: refCode }).eq('user_id', u.id)
          }
        } else {
          // নতুন username-based code
          const { data: refProfile } = await supabase
            .from('profiles').select('id').eq('referral_code', refCode).single()
          if (refProfile && refProfile.id !== u.id) {
            if (acc) {
              await supabase.from('investment_accounts').update({ referred_by: refProfile.id }).eq('user_id', u.id)
            }
            // নতুন account হলে upsert এ referred_by set হবে handleSetCode এ
            sessionStorage.setItem('echo_referrer_id', refProfile.id)
          }
        }
      }

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

    // ── Maturity check ──
    if (acc?.created_at) {
      const daysSince = Math.floor((Date.now() - new Date(acc.created_at)) / 86400000)
      const dl = Math.max(0, 365 - daysSince)
      setDaysLeft(dl)
      setMonetizProgress(Math.min(100, Math.floor((daysSince / 365) * 100)))
      if (dl === 0) setIsMatured(true)
    }

    // ── NID status ──
    const { data: prof2 } = await supabase.from('profiles').select('nid_status, is_monetized').eq('id', uid).maybeSingle()
    if (prof2) {
      setNidStatus(prof2.nid_status || 'none')
      setIsMonetized(prof2.is_monetized || false)
    }

    // ── User posts for monetization ──
    const { data: myPosts } = await supabase.from('posts').select('*').eq('user_id', uid).order('created_at', { ascending: false }).limit(50)
    setUserPosts(myPosts || [])

    // ── Supporter count ──
    const { data: sups } = await supabase.from('followers').select('id', { count: 'exact', head: true }).eq('following_id', uid)
    setSupporterCount(sups?.length || 0)

    // ── Short views (video posts) ──
    const shortPosts = (myPosts || []).filter(p => p.media_type === 'video' && (p.watch_time_minutes || 0) < 60)
    const totalShortViews = shortPosts.reduce((s, p) => s + (p.view_count || 0), 0)
    setShortViews(totalShortViews)

    // ── Long watch time (hours) ──
    const longPosts = (myPosts || []).filter(p => p.media_type === 'video' && (p.watch_time_minutes || 0) >= 60)
    const totalWatchMins = longPosts.reduce((s, p) => s + (p.watch_time_minutes || 0), 0)
    setLongWatchHrs(Math.floor(totalWatchMins / 60))

    // Load profile — username + referral_code
    const { data: profile } = await supabase.from('profiles').select('username, full_name, referral_code').eq('id', uid).single()
    if (profile) {
      setUsername(profile.username || '')
      if (profile.referral_code) {
        setReferralCode(profile.referral_code)
      } else {
        // Generate unique referral code: username + random 4 digits
        const base = (profile.username || 'user').toLowerCase().replace(/[^a-z0-9]/g, '')
        const rand = Math.floor(1000 + Math.random() * 9000)
        const code = `${base}${rand}`
        await supabase.from('profiles').update({ referral_code: code }).eq('id', uid)
        setReferralCode(code)
      }
    }

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
    // sessionStorage থেকে referrer নাও
    const referrerId = sessionStorage.getItem('echo_referrer_id') || null
    await supabase.from('investment_accounts').upsert({
      user_id: user.id, password: newCode,
      device_fingerprint: fp, language: lang,
      ...(referrerId ? { referred_by: referrerId } : {}),
    }, { onConflict: 'user_id' })
    if (referrerId) sessionStorage.removeItem('echo_referrer_id')
    const { data: acc } = await supabase.from('investment_accounts').select('*').eq('user_id', user.id).single()
    setAccount(acc); setNewCode(''); setConfirmCode(''); setShowChange(false)
    setAuthStep('app'); await loadAll(user.id)
  }

  const handleEnterCode = () => {
    if (codeInput === account?.password) {
      setCodeInput('')
      // 2FA enabled থাকলে TOTP verify করতে হবে
      if (account?.totp_enabled && account?.totp_secret) {
        setTwoFASecret(account.totp_secret)
        setAuthStep('totp')
      } else {
        setAuthStep('app')
      }
    } else {
      setCodeError('❌ Wrong PIN!'); setCodeInput('')
    }
  }

  const handleTotpVerify = async () => {
    setTotpError('')
    try {
      const { authenticator } = await import('otplib')
      const isValid = authenticator.verify({ token: totpInput.trim(), secret: twoFASecret })
      if (isValid) {
        setTotpInput(''); setAuthStep('app')
      } else {
        setTotpError('❌ Wrong code! Check Google Authenticator app.')
        setTotpInput('')
      }
    } catch(e) {
      setTotpError('Verification failed. Try again.')
    }
  }

  const handleForgot = async () => {
    await supabase.from('notifications').insert({
      user_id: user.id, from_user_id: user.id, type: 'system',
      message: `PASSWORD_RESET_REQUEST | Email: ${forgotEmail} | User: ${user.id}`, read: false,
    })
    setForgotSent(true)
  }

  // ── DEPOSIT ──────────────────────────────────────────────
  // ── 2FA TOTP (Google Authenticator) ─────────────────────────
  const setup2FA = async () => {
    setLoadingTOTP(true); setTwoFAError('')
    try {
      const { authenticator } = await import('otplib')
      const secret = authenticator.generateSecret()
      setTwoFASecret(secret)
      // QR code generate
      const otpauth = authenticator.keyuri(user.email || username, 'Echo World', secret)
      const QRCode = (await import('qrcode')).default
      const qrUrl = await QRCode.toDataURL(otpauth)
      setTwoFAQR(qrUrl)
      // Secret DB তে save করো (enabled=false এখনো)
      await supabase.from('investment_accounts')
        .update({ totp_secret: secret, totp_enabled: false })
        .eq('user_id', user.id)
      setTwoFAStep('scan')
    } catch(e) {
      setTwoFAError('Setup failed. Try again.')
    }
    setLoadingTOTP(false)
  }

  const verify2FA = async () => {
    setTwoFAError('')
    try {
      const { authenticator } = await import('otplib')
      const isValid = authenticator.verify({ token: twoFAInput.trim(), secret: twoFASecret })
      if (isValid) {
        await supabase.from('investment_accounts')
          .update({ totp_enabled: true })
          .eq('user_id', user.id)
        setTwoFAEnabled(true)
        setTwoFAStep(null); setTwoFAInput('')
        alert('✅ Google Authenticator 2FA enabled!')
      } else {
        setTwoFAError('❌ Wrong code! Check your app and try again.')
      }
    } catch(e) {
      setTwoFAError('Verification failed.')
    }
  }

  const disable2FA = async () => {
    if (!confirm('Disable 2FA? Your account will be less secure.')) return
    await supabase.from('investment_accounts')
      .update({ totp_enabled: false, totp_secret: null })
      .eq('user_id', user.id)
    setTwoFAEnabled(false); setTwoFASecret(''); setTwoFAQR('')
    setTwoFAStep(null)
  }

  const checkTronPayment = async () => {
    if (!investAmount || parseFloat(investAmount) < 100) return
    try {
      const expectedAmt = parseFloat(investAmount)
      const res = await fetch(
        `https://api.trongrid.io/v1/accounts/${USDT_ADDRESS}/transactions/trc20?limit=20&contract_address=TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t&only_to=true`
      )
      const data = await res.json()
      if (!data.data) return
      const tx = data.data.find(t => {
        const txTime = t.block_timestamp
        const txAmt  = parseFloat(t.value) / 1e6
        return txTime >= autoStartRef.current && Math.abs(txAmt - expectedAmt) < 0.5
      })
      if (tx) {
        clearInterval(autoIntervalRef.current)
        clearInterval(autoTimerRef.current)
        setAutoDetecting(false)
        setAutoFound(true)
        setTxid(tx.transaction_id)
        // Auto submit
        const amt = parseFloat(investAmount)
        const { data: existing } = await supabase.from('deposit_requests').select('id').eq('txid', tx.transaction_id).maybeSingle()
        if (!existing) {
          await supabase.from('deposit_requests').insert({
            user_id: user.id, amount_usd: amt, txid: tx.transaction_id,
            screenshot_url: null, status: 'pending'
          })
          await supabase.from('notifications').insert({
            user_id: user.id, type: 'system',
            message: `⏳ $${amt} USDT deposit detected! Admin approval এর অপেক্ষায়। TX: ${tx.transaction_id.slice(0,16)}...`,
            read: false,
          })
        }
      }
    } catch(e) { console.error(e) }
  }

  const startAutoDetect = () => {
    if (!investAmount || parseFloat(investAmount) < 100) { alert('সর্বনিম্ন $100 লিখুন'); return }
    autoStartRef.current = Date.now()
    setAutoDetecting(true)
    setAutoFound(false)
    setAutoTimer(1800)
    autoIntervalRef.current = setInterval(checkTronPayment, 15000)
    autoTimerRef.current = setInterval(() => {
      setAutoTimer(p => {
        if (p <= 1) {
          clearInterval(autoIntervalRef.current)
          clearInterval(autoTimerRef.current)
          setAutoDetecting(false)
          return 0
        }
        return p - 1
      })
    }, 1000)
    setTimeout(checkTronPayment, 5000)
  }

  const stopAutoDetect = () => {
    clearInterval(autoIntervalRef.current)
    clearInterval(autoTimerRef.current)
    setAutoDetecting(false)
    setAutoTimer(0)
  }

  const submitDeposit = async () => {
    if (submitting) return
    const amt = parseFloat(investAmount)
    if (!amt || amt < MIN_DEPOSIT) { alert(`Minimum $${MIN_DEPOSIT}`); return }
    if (!txid.trim() && !screenshotFile) { alert('Transaction ID অথবা Screenshot দাও'); return }
    setSubmitting(true)
    let screenshotUrl = ''
    if (screenshotFile) {
      setUploadingImg(true)
      try { screenshotUrl = await uploadImage(screenshotFile) }
      catch { alert('Upload failed'); setSubmitting(false); setUploadingImg(false); return }
      setUploadingImg(false)
    }
    await supabase.from('deposit_requests').insert({ user_id: user.id, amount_usd: amt, txid: txid.trim(), screenshot_url: screenshotUrl || null })
    if (!account) {
      // account নেই — create করো, তারপর PIN set করতে বলো
      await supabase.from('investment_accounts').upsert({
        user_id: user.id, password: null,
        device_fingerprint: btoa(navigator.userAgent).slice(0,50)
      })
    }
    alert('✅ Deposit submitted! Admin will verify within 24 hours.')
    setTxid(''); setInvestAmount(''); setScreenshotFile(null); setScreenshotPreview('')
    await loadAll(user.id)
    // Reload account — PIN নেই হলে set করতে পাঠাও
    const { data: newAcc } = await supabase.from('investment_accounts').select('*').eq('user_id', user.id).single()
    if (newAcc && !newAcc.password) setAuthStep('set')
    setSubmitting(false)
  }

  // ── WITHDRAW ─────────────────────────────────────────────
  const submitWithdraw = async () => {
    if (!isWdWindow) { alert('Withdrawal only on 14th & 28th!'); return }
    if (!usdtAddr.trim() || !withdrawAmount || submitting) return
    const amt = parseFloat(withdrawAmount)
    if (amt < 50) { alert('Minimum withdrawal is $50!'); return }
    // Re-check fresh balance before withdraw
    const { data: freshWdAcc } = await supabase.from('investment_accounts').select('wallet_balance').eq('user_id', user.id).single()
    const freshWdBal = parseFloat(freshWdAcc?.wallet_balance || 0)
    if (amt > freshWdBal) { alert(`Insufficient balance! Available: $${freshWdBal.toFixed(2)}`); return }
    setSubmitting(true)
    await supabase.from('investment_accounts').update({ usdt_address: usdtAddr.trim() }).eq('user_id', user.id)
    setSavedUsdtAddr(usdtAddr.trim())
    await supabase.from('withdrawal_requests').insert({ user_id: user.id, amount: amt, usdt_address: usdtAddr.trim() })
    alert('✅ Withdrawal requested!')
    setWithdrawAmount(''); await loadAll(user.id); setSubmitting(false)
  }

  // ── QR SCANNER ──────────────────────────────────────────────
  const startScanner = async () => {
    setShowScanner(true)
    setTimeout(async () => {
      try {
        const { Html5Qrcode } = await import('html5-qrcode')
        const scanner = new Html5Qrcode('qr-reader')
        html5QrRef.current = scanner
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 220, height: 220 } },
          (decodedText) => {
            // QR scan success — address fill করো
            const addr = decodedText.trim()
            stopScanner()
            lookupTransferUser(addr)
          },
          () => {}
        )
        setScannerStarted(true)
      } catch(err) {
        alert('Camera access failed. Please allow camera permission.')
        setShowScanner(false)
      }
    }, 300)
  }

  const stopScanner = async () => {
    try {
      if (html5QrRef.current && scannerStarted) {
        await html5QrRef.current.stop()
        html5QrRef.current = null
      }
    } catch(e) {}
    setScannerStarted(false)
    setShowScanner(false)
  }

  // ── INTERNAL TRANSFER ────────────────────────────────────────
  const lookupTransferUser = async (addr) => {
    setTransferTo(addr)
    if (addr.length < 10) { setTransferUser(null); return }
    // wallet address থেকে user খোঁজো
    const hash = addr.slice(2).toLowerCase()
    const { data: accs } = await supabase.from('investment_accounts')
      .select('user_id, profiles!investment_accounts_user_id_fkey(username, full_name, avatar_url)')
    if (accs) {
      const found = accs.find(a => ('EW' + a.user_id) === addr.trim())
      setTransferUser(found || null)
    }
  }

  const submitTransfer = async () => {
    if (!transferUser || transferring) return
    const amt = parseFloat(transferAmt)
    if (isNaN(amt) || amt < 10) { alert('Minimum transfer $10'); return }
    if (amt > (account?.wallet_balance || 0)) { alert('Insufficient balance!'); return }
    if (transferUser.user_id === user.id) { alert('Cannot transfer to yourself!'); return }
    setTransferring(true)
    try {
      // ── Step 1: Fresh sender balance from DB ──
      const { data: sAcc } = await supabase.from('investment_accounts')
        .select('wallet_balance').eq('user_id', user.id).single()
      const senderBal = parseFloat(sAcc?.wallet_balance || 0)
      if (amt > senderBal) {
        alert(`Balance কম! Available: $${senderBal.toFixed(2)}`); setTransferring(false); return
      }

      // ── Step 2: Fresh receiver balance from DB ──
      const { data: rAcc } = await supabase.from('investment_accounts')
        .select('wallet_balance').eq('user_id', transferUser.user_id).single()
      if (!rAcc) { alert('Receiver এর Investment account নেই!'); setTransferring(false); return }
      const recvBal = parseFloat(rAcc?.wallet_balance || 0)

      // ── Step 3: Deduct sender (exact amount, no floating point drift) ──
      const newSenderBal = parseFloat((senderBal - amt).toFixed(4))
      const { error: sErr } = await supabase.from('investment_accounts')
        .update({ wallet_balance: newSenderBal })
        .eq('user_id', user.id)
      if (sErr) throw new Error('Sender deduct failed: ' + sErr.message)

      // ── Step 4: Credit receiver (wallet only, NOT total_earned — transfer ≠ income) ──
      const newRecvBal = parseFloat((recvBal + amt).toFixed(4))
      const { error: rErr } = await supabase.from('investment_accounts')
        .update({ wallet_balance: newRecvBal })
        .eq('user_id', transferUser.user_id)
      if (rErr) throw new Error('Receiver credit failed: ' + rErr.message)

      // ── Step 5: Log history for both parties ──
      const today = new Date().toISOString().split('T')[0]
      await supabase.from('daily_earnings').insert([
        {
          user_id: user.id, investment_id: null,
          amount: -amt, type: 'transfer_out', date: today,
          note: `Transfer to @${transferUser.profiles?.username} | $${senderBal.toFixed(2)}→$${newSenderBal.toFixed(2)}`
        },
        {
          user_id: transferUser.user_id, investment_id: null,
          amount: amt, type: 'transfer_in', date: today,
          note: `Transfer from @${username} | $${recvBal.toFixed(2)}→$${newRecvBal.toFixed(2)}`
        },
      ])

      // ── Step 6: Notify receiver ──
      await supabase.from('notifications').insert({
        user_id: transferUser.user_id, from_user_id: user.id, type: 'system', read: false,
        message: `💸 @${username} আপনাকে $${amt.toFixed(2)} পাঠিয়েছে! নতুন Balance: $${newRecvBal.toFixed(2)}`
      })

      alert(`✅ Transfer সফল!
$${amt.toFixed(2)} → @${transferUser.profiles?.username}
তোমার নতুন balance: $${newSenderBal.toFixed(2)}`)
      setTransferAmt(''); setTransferTo(''); setTransferUser(null)
      await loadAll(user.id)
    } catch(e) {
      alert('❌ Transfer failed: ' + e.message)
      console.error('Transfer error:', e)
      await loadAll(user.id) // Reload to show actual balance
    }
    setTransferring(false)
  }

  // ── REINVEST ────────────────────────────────────────────────
  const submitReinvest = async () => {
    if (reinvesting) return
    const amt = parseFloat(reinvestAmt)
    if (isNaN(amt) || amt < 20) { alert('Minimum reinvest $20'); return }
    if (amt > (account?.wallet_balance || 0)) { alert('Insufficient balance!'); return }
    const plan = amt >= 1000 ? { rate: 3.0, label: 'Elite' } : amt >= 500 ? { rate: 2.5, label: 'Growth' } : { rate: 2.0, label: 'Starter' }
    if (!confirm(`Reinvest $${amt} as ${plan.label} plan (${plan.rate}%/day)?`)) return
    setReinvesting(true)
    try {
      // Fresh balance from DB
      const { data: freshAcc } = await supabase.from('investment_accounts')
        .select('wallet_balance, total_invested').eq('user_id', user.id).single()
      const freshBal = parseFloat(freshAcc?.wallet_balance || 0)
      if (amt > freshBal) { alert(`Balance কম! Available: $${freshBal.toFixed(2)}`); setReinvesting(false); return }

      const endDate = new Date(); endDate.setFullYear(endDate.getFullYear() + 1)
      const { error } = await supabase.from('investment_accounts').update({
        wallet_balance: parseFloat((freshBal - amt).toFixed(8)),
        total_invested: parseFloat((parseFloat(freshAcc?.total_invested||0) + amt).toFixed(8)),
      }).eq('user_id', user.id)
      if (error) throw error

      await supabase.from('investments').insert({
        user_id: user.id, amount_usd: amt, plan: plan.label,
        daily_rate: plan.rate, start_date: new Date().toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0], status: 'active',
      })
      const today = new Date().toISOString().split('T')[0]
      await supabase.from('daily_earnings').insert({
        user_id: user.id, investment_id: null, amount: -amt,
        type: 'reinvest', date: today,
        note: `Reinvested $${amt.toFixed(2)} as ${plan.label} plan`
      })
      alert(`✅ $${amt.toFixed(2)} reinvested as ${plan.label} plan!`)
      setReinvestAmt('')
      await loadAll(user.id)
    } catch(e) { alert('Error: ' + e.message); console.error(e) }
    setReinvesting(false)
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

  const refLink = typeof window !== 'undefined'
    ? `${window.location.origin}/invest?ref=${referralCode || user?.id}`
    : ''

  const copyReferral = () => {
    navigator.clipboard?.writeText(refLink)
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

  // PIN screens — LockScreen component ব্যবহার করে (বাইরে defined)
  if (authStep === 'set' || showChange) return (
    <LockScreen>
      <div style={{ width:'100%', maxWidth:'310px' }}>
        <div style={{ fontSize:'15px', fontWeight:'800', textAlign:'center', marginBottom:'16px', color:'#eef2f7' }}>
          {showChange ? '🔑 Change PIN' : '🔐 Create Access PIN'}
        </div>
        <input
          type='tel'
          inputMode='numeric'
          pattern='[0-9]*'
          autoComplete='off'
          value={newCode}
          onChange={e => setNewCode(e.target.value.replace(/\D/g,''))}
          placeholder='New PIN'
          style={{ width:'100%', background:'rgba(255,255,255,0.05)', border:`1px solid ${codeError ? '#ff4560' : 'rgba(255,255,255,0.12)'}`, borderRadius:'14px', padding:'15px', color:'#eef2f7', fontSize:'26px', outline:'none', textAlign:'center', letterSpacing:'8px', boxSizing:'border-box', marginBottom:'10px' }}
        />
        <input
          type='tel'
          inputMode='numeric'
          pattern='[0-9]*'
          autoComplete='off'
          value={confirmCode}
          onChange={e => setConfirmCode(e.target.value.replace(/\D/g,''))}
          onKeyDown={e => e.key === 'Enter' && handleSetCode()}
          placeholder='Confirm PIN'
          style={{ width:'100%', background:'rgba(255,255,255,0.05)', border:`1px solid ${codeError ? '#ff4560' : 'rgba(255,255,255,0.12)'}`, borderRadius:'14px', padding:'15px', color:'#eef2f7', fontSize:'26px', outline:'none', textAlign:'center', letterSpacing:'8px', boxSizing:'border-box' }}
        />
        {codeError && <div style={{ color:'#ff4560', fontSize:'12px', textAlign:'center', margin:'8px 0' }}>{codeError}</div>}
        <button onClick={handleSetCode} style={{ width:'100%', padding:'15px', background:'linear-gradient(135deg,#00e5ff,#00ff88)', border:'none', borderRadius:'14px', color:'#050810', fontSize:'15px', fontWeight:'900', cursor:'pointer', marginTop:'12px' }}>
          🔐 Save PIN & Enter
        </button>
        {showChange && <button onClick={() => { setShowChange(false); setAuthStep('app') }} style={{ width:'100%', padding:'12px', background:'transparent', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'14px', color:'#4a5568', fontSize:'13px', cursor:'pointer', marginTop:'8px' }}>Cancel</button>}
      </div>
    </LockScreen>
  )

  if (authStep === 'enter') {
    if (showForgot) return (
      <LockScreen>
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
      </LockScreen>
    )
    return (
      <LockScreen>
        <div style={{ width:'100%', maxWidth:'310px' }}>
          <div style={{ fontSize:'13px', color:'#8892a4', textAlign:'center', marginBottom:'12px' }}>Enter your Access PIN</div>
          <input
            type='password'
            inputMode='numeric'
            pattern='[0-9]*'
            autoComplete='current-password'
            autoFocus
            value={codeInput}
            onChange={e => setCodeInput(e.target.value.replace(/\D/g,''))}
            onKeyDown={e => e.key === 'Enter' && handleEnterCode()}
            placeholder='••••'
            style={{ width:'100%', background:'rgba(255,255,255,0.05)', border:`1px solid ${codeError ? '#ff4560' : 'rgba(255,255,255,0.12)'}`, borderRadius:'14px', padding:'15px', color:'#eef2f7', fontSize:'26px', outline:'none', textAlign:'center', letterSpacing:'8px', boxSizing:'border-box' }}
          />
          {codeError && <div style={{ color:'#ff4560', fontSize:'12px', textAlign:'center', margin:'8px 0' }}>{codeError}</div>}
          <button onClick={handleEnterCode} style={{ width:'100%', padding:'16px', background:'linear-gradient(135deg,#00e5ff,#00ff88)', border:'none', borderRadius:'16px', color:'#050810', fontSize:'16px', fontWeight:'900', cursor:'pointer', marginTop:'12px', boxShadow:'0 4px 24px rgba(0,229,255,0.3)' }}>
            🔓 Unlock
          </button>
          <button onClick={() => setShowForgot(true)} style={{ width:'100%', padding:'10px', background:'transparent', border:'none', color:'#4a5568', fontSize:'12px', cursor:'pointer', marginTop:'6px', textDecoration:'underline' }}>
            Forgot PIN?
          </button>
        </div>
      </LockScreen>
    )
  }

  // ── TOTP Verify Screen ──────────────────────────────────────
  if (authStep === 'totp') {
    return (
      <LockScreen>
        <div style={{ width:'100%', maxWidth:'310px', textAlign:'center' }}>
          <div style={{ fontSize:'40px', marginBottom:'8px' }}>🛡️</div>
          <div style={{ fontSize:'15px', fontWeight:'900', color:'#eef2f7', marginBottom:'4px' }}>2FA Verification</div>
          <div style={{ fontSize:'11px', color:'#4a5568', marginBottom:'20px', lineHeight:'1.7' }}>
            Google Authenticator app খুলুন। Echo World এর ৬ সংখ্যার code দিন।
          </div>
          <input
            type='tel'
            inputMode='numeric'
            maxLength={6}
            autoFocus
            value={totpInput}
            onChange={e => { setTotpInput(e.target.value.replace(/\D/g,'')); setTotpError('') }}
            onKeyDown={e => e.key === 'Enter' && totpInput.length === 6 && handleTotpVerify()}
            placeholder='000000'
            style={{ width:'100%', background:'rgba(255,255,255,0.05)', border:'1px solid ' + (totpError ? '#ff4560' : 'rgba(255,255,255,0.12)'), borderRadius:'14px', padding:'15px', color:'#eef2f7', fontSize:'26px', outline:'none', textAlign:'center', letterSpacing:'8px', boxSizing:'border-box' }}
          />
          {totpError && <div style={{ color:'#ff4560', fontSize:'12px', textAlign:'center', margin:'8px 0' }}>{totpError}</div>}
          <button onClick={handleTotpVerify} disabled={totpInput.length < 6}
            style={{ width:'100%', padding:'16px', background: totpInput.length===6 ? 'linear-gradient(135deg,#00e5ff,#00ff88)' : 'rgba(255,255,255,0.05)', border:'none', borderRadius:'16px', color: totpInput.length===6 ? '#050810' : '#4a5568', fontSize:'16px', fontWeight:'900', cursor: totpInput.length===6 ? 'pointer' : 'default', marginTop:'12px' }}>
            ✅ Verify
          </button>
          <button onClick={() => setAuthStep('enter')} style={{ width:'100%', padding:'10px', background:'transparent', border:'none', color:'#4a5568', fontSize:'12px', cursor:'pointer', marginTop:'6px' }}>
            ← Back to PIN
          </button>
        </div>
      </LockScreen>
    )
  }

  // ─────────────────────────────────────────────────────────
  //  MAIN APP
  // ─────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight:'100vh', background: darkMode ? '#050810' : '#f0f4f8', color: darkMode ? '#eef2f7' : '#1a202c', paddingBottom:'90px', transition:'background 0.3s, color 0.3s' }}>
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
      {certInv && <Certificate inv={certInv} username={username || user?.email?.split('@')[0]} referralLink={refLink} onClose={() => setCertInv(null)} />}
      {showShareCard && <ShareCard account={account} investments={investments} username={username || user?.email?.split('@')[0]} referralLink={refLink} onClose={() => setShowShareCard(false)} />}
      {showTree && <ReferralTree userId={user?.id} onClose={() => setShowTree(false)} />}

      {/* ── HEADER ── */}
      <div style={{ position:'fixed', top:0, left:0, right:0, background:'rgba(5,8,16,0.97)', borderBottom:'1px solid rgba(255,255,255,0.07)', zIndex:100 }}>
        <div style={{ padding:'10px 16px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <button onClick={() => window.location.href='/feed'} style={{ background:'none', border:'none', color:'#8892a4', fontSize:'20px', cursor:'pointer' }}>←</button>
          <div style={{ fontSize:'15px', fontWeight:'900', background:'linear-gradient(90deg,#00e5ff,#00ff88)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>💎 Echo Invest</div>
          <div style={{ display:'flex', gap:'6px' }}>
            <button onClick={() => setDarkMode(m=>!m)} style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'10px', padding:'5px 10px', color:'#8892a4', fontSize:'13px', cursor:'pointer' }}>{darkMode ? '☀️' : '🌙'}</button>
            <button onClick={() => setTwoFAStep('info')} style={{ background: twoFAEnabled ? 'rgba(0,255,136,0.1)' : 'rgba(255,255,255,0.06)', border:'1px solid ' + (twoFAEnabled ? 'rgba(0,255,136,0.3)' : 'rgba(255,255,255,0.1)'), borderRadius:'10px', padding:'5px 10px', color: twoFAEnabled ? '#00ff88' : '#8892a4', fontSize:'11px', cursor:'pointer' }}>{twoFAEnabled ? '🛡️' : '🔒'}</button>
            <button onClick={() => { setShowChange(true); setAuthStep('set') }} style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'10px', padding:'5px 10px', color:'#8892a4', fontSize:'11px', cursor:'pointer' }}>🔑</button>
            <button onClick={() => setShowLangPicker(p=>!p)} style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'10px', padding:'5px 10px', color:'#eef2f7', fontSize:'13px', cursor:'pointer' }}>{LANGS[lang]?.flag}</button>
          </div>
          {showLangPicker && (
            <div style={{ position:'absolute', right:'12px', top:'54px', background:'#111620', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'12px', overflow:'hidden', zIndex:200 }}>
              {Object.entries(LANGS).map(([k,v]) => (
                <div key={k} onClick={() => { setLang(k); setShowLangPicker(false); try{localStorage.setItem('echoLang',k)}catch(e){} }}
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
            { key:'dashboard', icon:'🏠', label:tt('dashboard',lang) },
            { key:'invest',    icon:'📊', label:tt('invest',lang) },
            { key:'deposit',   icon:'📥', label:tt('deposit',lang) },
            { key:'withdraw',  icon:'📤', label:tt('withdraw',lang) },
            { key:'refer',     icon:'👥', label:tt('refer',lang) },
            { key:'history',   icon:'📋', label:tt('history',lang) },
            { key:'security',  icon:'🛡️', label:'Security' },
            { key:'support',   icon:'💬', label:'Support' },
            { key:'monetize',  icon: isMatured ? '💰' : '🔒', label: isMatured ? tm('monetize',lang) : '🔒' },
          ].map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              style={{ padding:'10px 14px', border:'none', background:'transparent', color: activeTab===t.key ? '#00e5ff' : '#4a5568', borderBottom: activeTab===t.key ? '2px solid #00e5ff' : '2px solid transparent', fontSize:'11px', fontWeight:'700', cursor:'pointer', whiteSpace:'nowrap', display:'flex', flexDirection:'column', alignItems:'center', gap:'3px', flexShrink:0 }}>
              <span style={{ fontSize:'18px' }}>{t.icon}</span>{t.label}
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

        {/* ── Marketing Carousel ── */}
        {activeTab === 'dashboard' && authStep === 'app' && (
          <div style={{ marginBottom:'12px', position:'relative', overflow:'hidden', borderRadius:'16px' }}>
            {/* Slides */}
            {[
              /* Slide 0 — Daily Earning */
              <div key={0} style={{ background:'linear-gradient(145deg,#020b18,#041428)', border:'1px solid rgba(0,229,255,0.2)', borderRadius:'16px', padding:'18px 16px', position:'relative', overflow:'hidden' }}>
                <div style={{ position:'absolute', top:'-40px', right:'-40px', width:'160px', height:'160px', background:'radial-gradient(circle,rgba(0,229,255,0.12),transparent 60%)', borderRadius:'50%' }} />
                <div style={{ display:'inline-flex', alignItems:'center', gap:'5px', background:'rgba(0,255,136,0.1)', border:'1px solid rgba(0,255,136,0.3)', borderRadius:'20px', padding:'3px 10px', fontSize:'10px', color:'#00ff88', fontWeight:'700', marginBottom:'12px' }}>✅ আজকের আয় · TODAY</div>
                <div style={{ fontSize:'42px', fontWeight:'900', background:'linear-gradient(90deg,#00e5ff,#00ff88)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', lineHeight:1, marginBottom:'4px' }}>$24.75</div>
                <div style={{ fontSize:'11px', color:'#4a5568', marginBottom:'14px' }}>মাত্র $825 বিনিয়োগ থেকে</div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'6px' }}>
                  {[{l:'আজ',v:'$24.75',c:'#00e5ff'},{l:'মাসে',v:'$742',c:'#00ff88'},{l:'বার্ষিক',v:'$9,033',c:'#ffa500'}].map(s=>(
                    <div key={s.l} style={{ background:'rgba(255,255,255,0.04)', borderRadius:'10px', padding:'8px', textAlign:'center' }}>
                      <div style={{ fontSize:'13px', fontWeight:'900', color:s.c }}>{s.v}</div>
                      <div style={{ fontSize:'9px', color:'#4a5568', marginTop:'2px' }}>{s.l}</div>
                    </div>
                  ))}
                </div>
              </div>,
              /* Slide 1 — Referral */
              <div key={1} style={{ background:'linear-gradient(145deg,#0a0520,#140830)', border:'1px solid rgba(168,85,247,0.25)', borderRadius:'16px', padding:'18px 16px', position:'relative', overflow:'hidden' }}>
                <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', width:'200px', height:'200px', background:'radial-gradient(circle,rgba(168,85,247,0.08),transparent 60%)', borderRadius:'50%', pointerEvents:'none' }} />
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'14px' }}>
                  <div style={{ fontSize:'32px' }}>👥</div>
                  <div style={{ background:'linear-gradient(135deg,#a855f7,#7c3aed)', borderRadius:'20px', padding:'4px 12px', fontSize:'10px', fontWeight:'700', color:'#fff' }}>REFERRAL</div>
                </div>
                <div style={{ fontSize:'18px', fontWeight:'900', color:'#eef2f7', marginBottom:'12px' }}>বন্ধুকে আনুন, আয় করুন</div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px' }}>
                  {[{l:'LEVEL 1',v:'50%',c:'#00e5ff',desc:'সরাসরি রেফারেল'},{l:'LEVEL 2',v:'25%',c:'#ffa500',desc:'পরোক্ষ রেফারেল'}].map(s=>(
                    <div key={s.l} style={{ background:`${s.c}08`, border:`1px solid ${s.c}22`, borderRadius:'12px', padding:'12px', textAlign:'center' }}>
                      <div style={{ fontSize:'9px', color:s.c, fontWeight:'700', marginBottom:'4px' }}>{s.l}</div>
                      <div style={{ fontSize:'28px', fontWeight:'900', color:s.c }}>{s.v}</div>
                      <div style={{ fontSize:'10px', color:'#4a5568', marginTop:'2px' }}>{s.desc}</div>
                    </div>
                  ))}
                </div>
              </div>,
              /* Slide 2 — Plans */
              <div key={2} style={{ background:'linear-gradient(145deg,#020b18,#041020)', border:'1px solid rgba(255,202,40,0.15)', borderRadius:'16px', padding:'18px 16px' }}>
                <div style={{ textAlign:'center', marginBottom:'14px' }}>
                  <div style={{ fontSize:'10px', color:'#4a5568', letterSpacing:'2px', marginBottom:'4px' }}>বিনিয়োগ পরিকল্পনা</div>
                  <div style={{ fontSize:'18px', fontWeight:'900', background:'linear-gradient(90deg,#00e5ff,#00ff88,#ffa500)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>আজই শুরু করুন</div>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'8px' }}>
                  {[{e:'🌱',n:'Starter',r:'2%',m:'$100+',c:'#00e5ff'},{e:'🚀',n:'Growth',r:'2.5%',m:'$500+',c:'#00ff88',pop:true},{e:'💎',n:'Elite',r:'3%',m:'$1000+',c:'#ffa500'}].map(p=>(
                    <div key={p.n} style={{ background:`${p.c}06`, border:`2px solid ${p.c}${p.pop?'55':'22'}`, borderRadius:'12px', padding:'10px 8px', textAlign:'center', position:'relative' }}>
                      {p.pop && <div style={{ position:'absolute', top:'-1px', left:'50%', transform:'translateX(-50%)', background:p.c, fontSize:'7px', fontWeight:'900', color:'#050810', padding:'1px 8px', borderRadius:'0 0 6px 6px', whiteSpace:'nowrap' }}>POPULAR</div>}
                      <div style={{ fontSize:'22px', marginBottom:'4px' }}>{p.e}</div>
                      <div style={{ fontSize:'11px', fontWeight:'700', color:p.c, marginBottom:'4px' }}>{p.n}</div>
                      <div style={{ fontSize:'22px', fontWeight:'900', color:p.c }}>{p.r}</div>
                      <div style={{ fontSize:'8px', color:'#4a5568' }}>/day</div>
                      <div style={{ fontSize:'9px', color:'#6b7280', marginTop:'4px' }}>{p.m}</div>
                    </div>
                  ))}
                </div>
              </div>,
              /* Slide 3 — Join */
              <div key={3} style={{ background:'linear-gradient(145deg,#020b18,#041428)', border:'1px solid rgba(0,255,136,0.2)', borderRadius:'16px', overflow:'hidden' }}>
                <div style={{ background:'linear-gradient(135deg,rgba(0,229,255,0.08),rgba(0,255,136,0.05))', padding:'18px 16px', borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'10px' }}>
                    <div style={{ width:'40px', height:'40px', borderRadius:'50%', background:'linear-gradient(135deg,#00e5ff,#00ff88)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'20px', fontWeight:'900', color:'#050810', boxShadow:'0 0 20px rgba(0,229,255,0.3)' }}>E</div>
                    <div style={{ fontSize:'18px', fontWeight:'900', background:'linear-gradient(90deg,#00e5ff,#00ff88)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>ECHO WORLD</div>
                  </div>
                  <div style={{ fontSize:'12px', color:'#6b7280' }}>বাংলাদেশের সেরা ডেইলি আর্নিং প্ল্যাটফর্ম</div>
                </div>
                <div style={{ padding:'14px 16px' }}>
                  {[{n:'1',t:'সাইন আপ করুন'},{n:'2',t:'$100 USDT জমা দিন'},{n:'3',t:'প্রতিদিন পোস্ট করুন'},{n:'4',t:'১৪ ও ২৮ তারিখ withdraw করুন'}].map(s=>(
                    <div key={s.n} style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'8px' }}>
                      <div style={{ width:'22px', height:'22px', borderRadius:'50%', background:'rgba(0,229,255,0.1)', border:'1px solid rgba(0,229,255,0.25)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'10px', fontWeight:'700', color:'#00e5ff', flexShrink:0 }}>{s.n}</div>
                      <div style={{ fontSize:'12px', color:'#8892a4' }}>{s.t}</div>
                    </div>
                  ))}
                  <div style={{ background:'linear-gradient(135deg,#00e5ff,#00ff88)', borderRadius:'12px', padding:'12px', textAlign:'center', marginTop:'10px' }}>
                    <div style={{ fontSize:'14px', fontWeight:'900', color:'#050810' }}>🚀 এখনই যোগ দিন</div>
                  </div>
                </div>
              </div>
            ][slideIndex]}

            {/* Dots */}
            <div style={{ display:'flex', justifyContent:'center', gap:'6px', marginTop:'10px' }}>
              {[0,1,2,3].map(i => (
                <div key={i} onClick={() => setSlideIndex(i)}
                  style={{ width: slideIndex===i ? '20px' : '6px', height:'6px', borderRadius:'3px', background: slideIndex===i ? '#00e5ff' : 'rgba(255,255,255,0.15)', transition:'all 0.3s', cursor:'pointer' }} />
              ))}
            </div>
          </div>
        )}

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
            {!account ? (
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

                {/* ── Referral Code Card in Dashboard ── */}
                <div style={{ background:'linear-gradient(135deg,#0a1628,#001a2e)', border:'1px solid rgba(0,229,255,0.2)', borderRadius:'16px', padding:'14px 16px', marginBottom:'12px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <div>
                    <div style={{ fontSize:'10px', color:'#4a5568', fontWeight:'700', letterSpacing:'1px', marginBottom:'4px' }}>🔑 YOUR REFERRAL CODE</div>
                    <div style={{ fontSize:'20px', fontWeight:'900', color:'#00e5ff', fontFamily:'monospace', letterSpacing:'4px' }}>
                      {referralCode || '...'}
                    </div>
                    <div style={{ fontSize:'10px', color:'#4a5568', marginTop:'3px' }}>Friends enter this at signup</div>
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
                    <button onClick={copyReferral} style={{ padding:'8px 14px', background: copied ? 'rgba(0,255,136,0.1)' : 'linear-gradient(135deg,#00e5ff,#00ff88)', border: copied ? '1px solid #00ff88' : 'none', borderRadius:'10px', color: copied ? '#00ff88' : '#050810', fontSize:'11px', fontWeight:'800', cursor:'pointer', whiteSpace:'nowrap' }}>
                      {copied ? '✓ Copied!' : '📋 Copy Link'}
                    </button>
                    <button onClick={() => setActiveTab('refer')} style={{ padding:'7px 14px', background:'rgba(0,229,255,0.08)', border:'1px solid rgba(0,229,255,0.2)', borderRadius:'10px', color:'#00e5ff', fontSize:'11px', fontWeight:'700', cursor:'pointer', whiteSpace:'nowrap' }}>
                      👥 Refer & Earn
                    </button>
                  </div>
                </div>

                {/* Stats grid */}
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px', marginBottom:'12px' }}>
                  {[
                    { label:tt('invested',lang), value:`$${(account?.total_invested||0).toFixed(2)}`, icon:'📈', color:'#00e5ff' },
                    { label:tt('totalEarned',lang),   value:`$${(account?.total_earned||0).toFixed(2)}`,   icon:'⚡', color:'#ffa500' },
                    { label:tt('withdrawn',lang),      value:`$${(account?.total_withdrawn||0).toFixed(2)}`,icon:'📤', color:'#ff4560' },
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
              {/* AUTO DETECT */}
              {!autoFound && !autoDetecting && (
                <button onClick={startAutoDetect}
                  style={{ width:'100%', padding:'12px', background:'linear-gradient(135deg,rgba(0,229,255,.15),rgba(0,255,136,.1))', border:'1px solid rgba(0,229,255,.3)', borderRadius:'12px', color:'#00e5ff', fontSize:'13px', fontWeight:'800', cursor:'pointer', marginBottom:'12px' }}>
                  ⚡ Auto Detect Payment
                </button>
              )}
              {autoDetecting && (
                <div style={{ background:'rgba(0,229,255,.06)', border:'1px solid rgba(0,229,255,.2)', borderRadius:'12px', padding:'12px', marginBottom:'12px' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'6px' }}>
                    <div style={{ width:'8px', height:'8px', borderRadius:'50%', background:'#00ff88', animation:'pulse 1.5s infinite' }} />
                    <div style={{ fontSize:'12px', fontWeight:'800', color:'#00e5ff' }}>Payment detect করছি...</div>
                    <div style={{ marginLeft:'auto', fontSize:'13px', fontWeight:'900', color:'#ffa500', fontFamily:'monospace' }}>
                      {String(Math.floor(autoTimer/60)).padStart(2,'0') + ':' + String(autoTimer%60).padStart(2,'0')}
                    </div>
                  </div>
                  <div style={{ fontSize:'11px', color:'#4a5568', marginBottom:'8px' }}>USDT পাঠানোর পর auto detect হবে</div>
                  <button onClick={stopAutoDetect} style={{ fontSize:'11px', color:'#ff4560', background:'none', border:'none', cursor:'pointer', padding:0 }}>{'✕'} বাতিল</button>
                </div>
              )}
              {autoFound && (
                <div style={{ background:'rgba(0,255,136,.1)', border:'1px solid rgba(0,255,136,.3)', borderRadius:'12px', padding:'12px', marginBottom:'12px' }}>
                  <div style={{ fontSize:'13px', fontWeight:'800', color:'#00ff88' }}>{'✅'} Payment Detected!</div>
                  <div style={{ fontSize:'10px', color:'#4a5568', fontFamily:'monospace', marginTop:'4px', wordBreak:'break-all' }}>{txid}</div>
                </div>
              )}
              <div style={{ marginBottom:'12px' }}>
                <div style={{ fontSize:'11px', color:'#4a5568', marginBottom:'6px', fontWeight:'600' }}>Transaction ID (auto/manual)</div>
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

            {/* ── Wallet Card ── */}
            <div style={{ background:'linear-gradient(135deg,#050d1a,#0a1628)', border:'1px solid rgba(0,229,255,0.2)', borderRadius:'20px', padding:'20px', marginBottom:'14px', position:'relative', overflow:'hidden' }}>
              <div style={{ position:'absolute', top:'-30px', right:'-30px', width:'120px', height:'120px', background:'radial-gradient(circle,rgba(0,229,255,0.1),transparent 60%)', borderRadius:'50%' }} />
              <div style={{ fontSize:'10px', color:'#4a5568', fontWeight:'700', letterSpacing:'2px', marginBottom:'6px' }}>ECHO WALLET</div>
              <div style={{ fontSize:'36px', fontWeight:'900', color:'#00ff88', marginBottom:'4px' }}>${(account?.wallet_balance||0).toFixed(2)}</div>
              <div style={{ fontSize:'11px', color:'#4a5568', marginBottom:'16px' }}>Available Balance</div>
              {/* Wallet Address */}
              <div style={{ background:'rgba(0,0,0,0.3)', borderRadius:'12px', padding:'10px 14px', marginBottom:'12px' }}>
                <div style={{ fontSize:'9px', color:'#4a5568', fontWeight:'700', marginBottom:'4px', letterSpacing:'1px' }}>YOUR WALLET ADDRESS</div>
                <div style={{ fontSize:'11px', color:'#00e5ff', fontFamily:'monospace', letterSpacing:'1px', marginBottom:'6px', wordBreak:'break-all' }}>{walletAddr}</div>
                <div style={{ display:'flex', gap:'6px' }}>
                  <button onClick={() => { navigator.clipboard?.writeText(walletAddr); alert('✅ Copied!') }}
                    style={{ flex:1, padding:'6px', background:'rgba(0,229,255,0.08)', border:'1px solid rgba(0,229,255,0.2)', borderRadius:'8px', color:'#00e5ff', fontSize:'10px', fontWeight:'700', cursor:'pointer' }}>
                    📋 Copy
                  </button>
                  <button onClick={() => setShowQR(true)}
                    style={{ flex:1, padding:'6px', background:'rgba(0,255,136,0.08)', border:'1px solid rgba(0,255,136,0.2)', borderRadius:'8px', color:'#00ff88', fontSize:'10px', fontWeight:'700', cursor:'pointer' }}>
                    📱 QR Code
                  </button>
                </div>
              </div>
              {/* Quick stats */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'8px' }}>
                {[
                  { l:'Total In', v:`$${(account?.total_earned||0).toFixed(0)}`, c:'#00ff88' },
                  { l:'Withdrawn', v:`$${(account?.total_withdrawn||0).toFixed(0)}`, c:'#ffa500' },
                  { l:'Invested', v:`$${(account?.total_invested||0).toFixed(0)}`, c:'#00e5ff' },
                ].map(s => (
                  <div key={s.l} style={{ background:'rgba(255,255,255,0.03)', borderRadius:'10px', padding:'8px', textAlign:'center' }}>
                    <div style={{ fontSize:'13px', fontWeight:'900', color:s.c }}>{s.v}</div>
                    <div style={{ fontSize:'9px', color:'#4a5568', marginTop:'1px' }}>{s.l}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* QR Modal */}
            {showQR && (
              <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:'24px' }} onClick={() => setShowQR(false)}>
                <div style={{ background:'#111620', borderRadius:'20px', padding:'28px', textAlign:'center', maxWidth:'280px', width:'100%' }} onClick={e => e.stopPropagation()}>
                  <div style={{ fontSize:'14px', fontWeight:'800', color:'#eef2f7', marginBottom:'16px' }}>📱 Receive Address QR</div>
                  <div style={{ background:'#fff', borderRadius:'12px', padding:'16px', marginBottom:'16px', display:'flex', justifyContent:'center' }}>
                    <img src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(walletAddr)}`} alt='QR' style={{ width:'180px', height:'180px' }} />
                  </div>
                  <div style={{ fontSize:'10px', color:'#4a5568', fontFamily:'monospace', wordBreak:'break-all', marginBottom:'14px', lineHeight:'1.6' }}>{walletAddr}</div>
                  <div style={{ fontSize:'11px', color:'#ffa500', marginBottom:'14px' }}>⚠️ এটি Echo World Internal Address — শুধু platform এর মধ্যে transfer এর জন্য</div>
                  <button onClick={() => setShowQR(false)} style={{ width:'100%', padding:'12px', background:'rgba(255,255,255,0.06)', border:'none', borderRadius:'12px', color:'#8892a4', fontSize:'13px', fontWeight:'700', cursor:'pointer' }}>✕ Close</button>
                </div>
              </div>
            )}

            {/* ── Wallet Action Tabs ── */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'6px', marginBottom:'14px' }}>
              {[
                { key:'withdraw', label:'📤 Withdraw', color:'#ffa500' },
                { key:'transfer', label:'💸 Transfer', color:'#00e5ff' },
                { key:'reinvest', label:'🔄 Reinvest', color:'#00ff88' },
              ].map(t => (
                <button key={t.key} onClick={() => setWalletTab(t.key)}
                  style={{ padding:'10px 6px', borderRadius:'12px', border:`1px solid ${walletTab===t.key ? t.color+'55' : 'rgba(255,255,255,0.06)'}`, background: walletTab===t.key ? t.color+'12' : 'rgba(255,255,255,0.03)', color: walletTab===t.key ? t.color : '#4a5568', fontSize:'11px', fontWeight:'700', cursor:'pointer' }}>
                  {t.label}
                </button>
              ))}
            </div>

            {/* ── WITHDRAW ── */}
            {walletTab === 'withdraw' && (
              <div>
                <div style={{ background: isWdWindow ? 'rgba(0,255,136,0.07)' : 'rgba(0,229,255,0.05)', border:`2px solid ${isWdWindow ? 'rgba(0,255,136,0.3)' : 'rgba(0,229,255,0.15)'}`, borderRadius:'14px', padding:'14px', marginBottom:'12px', textAlign:'center' }}>
                  {isWdWindow
                    ? <div style={{ fontSize:'16px', fontWeight:'900', color:'#00ff88' }}>🟢 Withdrawal Window Open!</div>
                    : <>
                        <div style={{ fontSize:'11px', color:'#00e5ff', fontWeight:'700', marginBottom:'3px' }}>⏰ Next Window</div>
                        <div style={{ fontSize:'24px', fontWeight:'900', color:'#eef2f7', fontFamily:'monospace', letterSpacing:'2px' }}>{wdTimer}</div>
                        <div style={{ fontSize:'10px', color:'#4a5568', marginTop:'2px' }}>14th & 28th each month</div>
                      </>
                  }
                </div>
                <div style={{ background:'#111620', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'16px', padding:'16px', marginBottom:'12px' }}>
                  {savedUsdtAddr && (
                    <div style={{ background:'rgba(0,255,136,0.06)', border:'1px solid rgba(0,255,136,0.15)', borderRadius:'10px', padding:'10px', marginBottom:'10px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <div>
                        <div style={{ fontSize:'9px', color:'#4a5568', fontWeight:'700' }}>SAVED ADDRESS</div>
                        <div style={{ fontSize:'11px', color:'#00ff88', fontFamily:'monospace' }}>{savedUsdtAddr.slice(0,20)}...</div>
                      </div>
                      <button onClick={() => setUsdtAddr(savedUsdtAddr)} style={{ padding:'5px 10px', background:'rgba(0,255,136,0.1)', border:'1px solid rgba(0,255,136,0.2)', borderRadius:'8px', color:'#00ff88', fontSize:'11px', fontWeight:'700', cursor:'pointer' }}>Use</button>
                    </div>
                  )}
                  <div style={{ marginBottom:'10px' }}>
                    <div style={{ fontSize:'10px', color:'#4a5568', marginBottom:'5px', fontWeight:'700' }}>USDT TRC20 ADDRESS</div>
                    <input value={usdtAddr} onChange={e => setUsdtAddr(e.target.value)} placeholder='Your TRC20 address'
                      style={{ width:'100%', background:'#0c1018', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'12px', padding:'12px', color:'#eef2f7', fontSize:'12px', outline:'none', fontFamily:'monospace' }} />
                  </div>
                  <div style={{ marginBottom:'12px' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'5px' }}>
                      <div style={{ fontSize:'10px', color:'#4a5568', fontWeight:'700' }}>AMOUNT (Min $50)</div>
                      <div style={{ fontSize:'10px', color:'#00ff88', cursor:'pointer' }} onClick={() => setWithdrawAmount(String((account?.wallet_balance||0).toFixed(2)))}>Max: ${(account?.wallet_balance||0).toFixed(2)}</div>
                    </div>
                    <input value={withdrawAmount} onChange={e => setWithdrawAmount(e.target.value)} type='number' placeholder='0.00'
                      style={{ width:'100%', background:'#0c1018', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'12px', padding:'12px', color:'#ffa500', fontSize:'18px', fontWeight:'900', outline:'none' }} />
                  </div>
                  <button onClick={submitWithdraw} disabled={!isWdWindow || !usdtAddr.trim() || !withdrawAmount || submitting}
                    style={{ width:'100%', padding:'14px', background: isWdWindow && usdtAddr.trim() && withdrawAmount ? 'linear-gradient(135deg,#ffa500,#ff4560)' : 'rgba(255,255,255,0.05)', border:'none', borderRadius:'14px', color: isWdWindow && usdtAddr.trim() && withdrawAmount ? '#fff' : '#4a5568', fontSize:'14px', fontWeight:'900', cursor: isWdWindow ? 'pointer' : 'default' }}>
                    {submitting ? '⏳ Processing...' : !isWdWindow ? `⏰ Opens in ${wdTimer}` : '📤 Request Withdrawal'}
                  </button>
                </div>
                {withdrawals.length > 0 && (
                  <div style={{ fontSize:'10px', color:'#4a5568', fontWeight:'700', letterSpacing:'1px', marginBottom:'8px' }}>WITHDRAWAL HISTORY</div>
                )}
                {withdrawals.map(w => (
                  <div key={w.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', background:'#111620', border:'1px solid rgba(255,255,255,0.05)', borderRadius:'12px', padding:'12px', marginBottom:'7px' }}>
                    <div>
                      <div style={{ fontSize:'15px', fontWeight:'800', color:'#ffa500' }}>${w.amount}</div>
                      <div style={{ fontSize:'10px', color:'#4a5568', fontFamily:'monospace' }}>{w.usdt_address?.slice(0,18)}...</div>
                      <div style={{ fontSize:'10px', color:'#4a5568' }}>{new Date(w.requested_at).toLocaleDateString()}</div>
                    </div>
                    <div style={{ fontSize:'11px', fontWeight:'700', padding:'4px 10px', borderRadius:'20px', background: w.status==='approved' ? 'rgba(0,255,136,0.1)' : w.status==='rejected' ? 'rgba(255,69,96,0.1)' : 'rgba(255,165,0,0.1)', color: w.status==='approved' ? '#00ff88' : w.status==='rejected' ? '#ff4560' : '#ffa500' }}>
                      {w.status==='approved' ? '✅ Sent' : w.status==='rejected' ? '❌ Rejected' : '⏳ Pending'}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ── TRANSFER ── */}
            {walletTab === 'transfer' && (
              <div>

                {/* QR Scanner Modal */}
                {showScanner && (
                  <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.92)', zIndex:2000, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'20px' }}>
                    <div style={{ width:'100%', maxWidth:'320px' }}>
                      <div style={{ fontSize:'15px', fontWeight:'800', color:'#eef2f7', textAlign:'center', marginBottom:'16px' }}>📱 Scan Wallet QR Code</div>
                      <div style={{ background:'#111620', borderRadius:'16px', overflow:'hidden', marginBottom:'14px', position:'relative' }}>
                        <div id='qr-reader' style={{ width:'100%' }} />
                        {/* Corner overlays */}
                        <div style={{ position:'absolute', top:'16px', left:'16px', width:'30px', height:'30px', borderTop:'3px solid #00e5ff', borderLeft:'3px solid #00e5ff', borderRadius:'4px 0 0 0' }} />
                        <div style={{ position:'absolute', top:'16px', right:'16px', width:'30px', height:'30px', borderTop:'3px solid #00e5ff', borderRight:'3px solid #00e5ff', borderRadius:'0 4px 0 0' }} />
                        <div style={{ position:'absolute', bottom:'16px', left:'16px', width:'30px', height:'30px', borderBottom:'3px solid #00e5ff', borderLeft:'3px solid #00e5ff', borderRadius:'0 0 0 4px' }} />
                        <div style={{ position:'absolute', bottom:'16px', right:'16px', width:'30px', height:'30px', borderBottom:'3px solid #00e5ff', borderRight:'3px solid #00e5ff', borderRadius:'0 0 4px 0' }} />
                      </div>
                      <div style={{ fontSize:'11px', color:'#4a5568', textAlign:'center', marginBottom:'14px' }}>Receiver এর QR code এর সামনে ধরুন</div>
                      <button onClick={stopScanner}
                        style={{ width:'100%', padding:'14px', background:'rgba(255,69,96,0.1)', border:'1px solid rgba(255,69,96,0.3)', borderRadius:'14px', color:'#ff4560', fontSize:'14px', fontWeight:'700', cursor:'pointer' }}>
                        ✕ Cancel Scan
                      </button>
                    </div>
                  </div>
                )}

                <div style={{ background:'rgba(0,229,255,0.04)', border:'1px solid rgba(0,229,255,0.15)', borderRadius:'14px', padding:'14px', marginBottom:'12px', fontSize:'11px', color:'#4a5568', lineHeight:'1.8' }}>
                  💸 Platform এর মধ্যে instant transfer<br/>
                  ⚡ Minimum $10 · Maximum unlimited<br/>
                  🔒 Receiver এর QR scan বা Address paste করুন
                </div>
                <div style={{ background:'#111620', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'16px', padding:'16px', marginBottom:'12px' }}>
                  <div style={{ marginBottom:'12px' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'5px' }}>
                      <div style={{ fontSize:'10px', color:'#4a5568', fontWeight:'700' }}>RECEIVER WALLET ADDRESS</div>
                      <button onClick={startScanner}
                        style={{ padding:'4px 10px', background:'rgba(0,229,255,0.1)', border:'1px solid rgba(0,229,255,0.25)', borderRadius:'8px', color:'#00e5ff', fontSize:'10px', fontWeight:'700', cursor:'pointer' }}>
                        📷 Scan QR
                      </button>
                    </div>
                    <input value={transferTo} onChange={e => lookupTransferUser(e.target.value)} placeholder='EW... অথবা QR scan করুন'
                      style={{ width:'100%', background:'#0c1018', border:`1px solid ${transferUser ? 'rgba(0,255,136,0.3)' : 'rgba(255,255,255,0.1)'}`, borderRadius:'12px', padding:'12px', color:'#00e5ff', fontSize:'12px', outline:'none', fontFamily:'monospace' }} />
                    {transferUser && (
                      <div style={{ display:'flex', alignItems:'center', gap:'8px', marginTop:'8px', background:'rgba(0,255,136,0.06)', border:'1px solid rgba(0,255,136,0.2)', borderRadius:'10px', padding:'8px 12px' }}>
                        <div style={{ width:'28px', height:'28px', borderRadius:'50%', background:'linear-gradient(135deg,#00e5ff,#00ff88)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'12px', fontWeight:'900', color:'#050810' }}>
                          {(transferUser.profiles?.full_name || transferUser.profiles?.username || '?')[0].toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontSize:'12px', fontWeight:'700', color:'#00ff88' }}>✅ @{transferUser.profiles?.username}</div>
                          <div style={{ fontSize:'10px', color:'#4a5568' }}>{transferUser.profiles?.full_name}</div>
                        </div>
                      </div>
                    )}
                    {transferTo.length > 5 && !transferUser && (
                      <div style={{ fontSize:'11px', color:'#ff4560', marginTop:'6px' }}>❌ Address not found</div>
                    )}
                  </div>
                  <div style={{ marginBottom:'14px' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'5px' }}>
                      <div style={{ fontSize:'10px', color:'#4a5568', fontWeight:'700' }}>AMOUNT (Min $10)</div>
                      <div style={{ fontSize:'10px', color:'#00e5ff', cursor:'pointer' }} onClick={() => setTransferAmt(String((account?.wallet_balance||0).toFixed(2)))}>Max: ${(account?.wallet_balance||0).toFixed(2)}</div>
                    </div>
                    <input value={transferAmt} onChange={e => setTransferAmt(e.target.value)} type='number' placeholder='0.00'
                      style={{ width:'100%', background:'#0c1018', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'12px', padding:'12px', color:'#00e5ff', fontSize:'18px', fontWeight:'900', outline:'none' }} />
                  </div>
                  <button onClick={submitTransfer} disabled={!transferUser || !transferAmt || transferring}
                    style={{ width:'100%', padding:'14px', background: transferUser && transferAmt ? 'linear-gradient(135deg,#00e5ff,#0099cc)' : 'rgba(255,255,255,0.05)', border:'none', borderRadius:'14px', color: transferUser && transferAmt ? '#050810' : '#4a5568', fontSize:'14px', fontWeight:'900', cursor: transferUser && transferAmt ? 'pointer' : 'default' }}>
                    {transferring ? '⏳ Sending...' : '💸 Send Transfer'}
                  </button>
                </div>
              </div>
            )}

            {/* ── REINVEST ── */}
            {walletTab === 'reinvest' && (
              <div>
                <div style={{ background:'rgba(0,255,136,0.04)', border:'1px solid rgba(0,255,136,0.15)', borderRadius:'14px', padding:'14px', marginBottom:'12px', fontSize:'11px', color:'#4a5568', lineHeight:'1.8' }}>
                  🔄 Wallet থেকে সরাসরি reinvest করুন<br/>
                  💰 Minimum $20 · Plan auto-select হবে<br/>
                  📈 Starter ($20+) · Growth ($500+) · Elite ($1000+)
                </div>
                <div style={{ background:'#111620', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'16px', padding:'16px', marginBottom:'12px' }}>
                  <div style={{ marginBottom:'14px' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'5px' }}>
                      <div style={{ fontSize:'10px', color:'#4a5568', fontWeight:'700' }}>AMOUNT (Min $20)</div>
                      <div style={{ fontSize:'10px', color:'#00ff88', cursor:'pointer' }} onClick={() => setReinvestAmt(String((account?.wallet_balance||0).toFixed(2)))}>Max: ${(account?.wallet_balance||0).toFixed(2)}</div>
                    </div>
                    <input value={reinvestAmt} onChange={e => setReinvestAmt(e.target.value)} type='number' placeholder='0.00'
                      style={{ width:'100%', background:'#0c1018', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'12px', padding:'12px', color:'#00ff88', fontSize:'18px', fontWeight:'900', outline:'none' }} />
                    {reinvestAmt && parseFloat(reinvestAmt) >= 20 && (
                      <div style={{ marginTop:'8px', background:'rgba(0,255,136,0.06)', border:'1px solid rgba(0,255,136,0.2)', borderRadius:'10px', padding:'10px', textAlign:'center' }}>
                        <div style={{ fontSize:'11px', color:'#4a5568', marginBottom:'2px' }}>Auto-selected Plan</div>
                        <div style={{ fontSize:'14px', fontWeight:'800', color: parseFloat(reinvestAmt)>=1000 ? '#ffa500' : parseFloat(reinvestAmt)>=500 ? '#00ff88' : '#00e5ff' }}>
                          {parseFloat(reinvestAmt)>=1000 ? '💎 Elite — 3%/day' : parseFloat(reinvestAmt)>=500 ? '🚀 Growth — 2.5%/day' : '🌱 Starter — 2%/day'}
                        </div>
                        <div style={{ fontSize:'11px', color:'#4a5568', marginTop:'2px' }}>
                          Daily: ${(parseFloat(reinvestAmt) * (parseFloat(reinvestAmt)>=1000 ? 0.03 : parseFloat(reinvestAmt)>=500 ? 0.025 : 0.02)).toFixed(2)}
                        </div>
                      </div>
                    )}
                  </div>
                  {/* Quick amounts */}
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'6px', marginBottom:'14px' }}>
                    {[20, 100, 500].map(a => (
                      <button key={a} onClick={() => setReinvestAmt(String(a))}
                        style={{ padding:'8px', background:'rgba(0,255,136,0.06)', border:'1px solid rgba(0,255,136,0.15)', borderRadius:'10px', color:'#00ff88', fontSize:'12px', fontWeight:'700', cursor:'pointer' }}>
                        ${a}
                      </button>
                    ))}
                  </div>
                  <button onClick={submitReinvest} disabled={!reinvestAmt || parseFloat(reinvestAmt) < 20 || reinvesting}
                    style={{ width:'100%', padding:'14px', background: reinvestAmt && parseFloat(reinvestAmt)>=20 ? 'linear-gradient(135deg,#00ff88,#00e5ff)' : 'rgba(255,255,255,0.05)', border:'none', borderRadius:'14px', color: reinvestAmt && parseFloat(reinvestAmt)>=20 ? '#050810' : '#4a5568', fontSize:'14px', fontWeight:'900', cursor: reinvestAmt && parseFloat(reinvestAmt)>=20 ? 'pointer' : 'default' }}>
                    {reinvesting ? '⏳ Processing...' : '🔄 Reinvest Now'}
                  </button>
                </div>
              </div>
            )}

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
                {refLink}
              </div>

              {/* ── Referral Code box ── */}
              <div style={{ background:'rgba(0,255,136,0.05)', border:'1px solid rgba(0,255,136,0.2)', borderRadius:'12px', padding:'12px', marginBottom:'12px' }}>
                <div style={{ fontSize:'10px', color:'#4a5568', fontWeight:'700', letterSpacing:'1px', marginBottom:'6px' }}>🔑 YOUR REFERRAL CODE</div>
                <div style={{ fontSize:'22px', fontWeight:'900', color:'#00ff88', fontFamily:'monospace', letterSpacing:'4px', marginBottom:'6px' }}>
                  {referralCode || '...'}
                </div>
                <div style={{ fontSize:'11px', color:'#4a5568' }}>Share this code — friends enter it during signup</div>
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

            {/* ── Commission Image ── */}
            <div style={{ background:'linear-gradient(145deg,#0a0520,#140830)', border:'1px solid rgba(168,85,247,0.25)', borderRadius:'18px', padding:'20px', marginBottom:'14px', position:'relative', overflow:'hidden' }}>
              <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', width:'250px', height:'250px', background:'radial-gradient(circle,rgba(168,85,247,0.07),transparent 60%)', borderRadius:'50%', pointerEvents:'none' }} />
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px' }}>
                <div style={{ fontSize:'28px' }}>👥</div>
                <div style={{ background:'linear-gradient(135deg,#a855f7,#7c3aed)', borderRadius:'20px', padding:'4px 14px', fontSize:'10px', fontWeight:'700', color:'#fff', letterSpacing:'1px' }}>REFERRAL COMMISSION</div>
              </div>
              <div style={{ fontSize:'20px', fontWeight:'900', color:'#eef2f7', marginBottom:'4px' }}>বন্ধুকে আনুন, আয় করুন</div>
              <div style={{ fontSize:'12px', color:'#6b7280', marginBottom:'18px', lineHeight:'1.6' }}>
                আপনার রেফারেলের প্রতিদিনের আয়ের উপর কমিশন পান
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'16px' }}>
                {[
                  {l:'LEVEL 1',v:'50%',c:'#00e5ff',desc:'সরাসরি রেফারেলের দৈনিক আয়ের'},
                  {l:'LEVEL 2',v:'25%',c:'#ffa500',desc:'পরোক্ষ রেফারেলের দৈনিক আয়ের'},
                ].map(s => (
                  <div key={s.l} style={{ background:`${s.c}08`, border:`1px solid ${s.c}22`, borderRadius:'16px', padding:'18px', textAlign:'center' }}>
                    <div style={{ fontSize:'10px', color:s.c, fontWeight:'700', letterSpacing:'1px', marginBottom:'8px' }}>{s.l}</div>
                    <div style={{ fontSize:'48px', fontWeight:'900', color:s.c, lineHeight:1, marginBottom:'6px' }}>{s.v}</div>
                    <div style={{ fontSize:'10px', color:'#4a5568', lineHeight:'1.6' }}>{s.desc}</div>
                  </div>
                ))}
              </div>
              <div style={{ background:'rgba(168,85,247,0.08)', border:'1px solid rgba(168,85,247,0.2)', borderRadius:'12px', padding:'12px', textAlign:'center', fontSize:'12px', color:'#a855f7', fontWeight:'700', lineHeight:'1.6' }}>
                🔗 আপনার রেফারেল লিংক শেয়ার করুন<br/>
                <span style={{ fontSize:'11px', color:'#6b7280', fontWeight:'400' }}>Share your referral link to start earning</span>
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

            {/* ── Earning Chart ── */}
            {(() => {
              const days = parseInt(chartPeriod)
              const filtered = earnings.filter(e => e.type === 'daily').slice(-days)
              const maxAmt = Math.max(...filtered.map(e => e.amount), 0.01)
              return (
                <div style={{ background:'#111620', border:'1px solid rgba(0,229,255,0.15)', borderRadius:'16px', padding:'16px', marginBottom:'14px' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'14px' }}>
                    <div>
                      <div style={{ fontSize:'13px', fontWeight:'800', color:'#eef2f7' }}>📈 Earning Chart</div>
                      <div style={{ fontSize:'10px', color:'#4a5568' }}>Daily returns over time</div>
                    </div>
                    <div style={{ display:'flex', gap:'5px' }}>
                      {['7','14','30'].map(p => (
                        <button key={p} onClick={() => setChartPeriod(p)}
                          style={{ padding:'4px 8px', borderRadius:'8px', border:'1px solid ' + (chartPeriod===p ? 'rgba(0,229,255,0.4)' : 'rgba(255,255,255,0.06)'), background: chartPeriod===p ? 'rgba(0,229,255,0.12)' : 'transparent', color: chartPeriod===p ? '#00e5ff' : '#4a5568', fontSize:'10px', fontWeight:'700', cursor:'pointer' }}>
                          {p}d
                        </button>
                      ))}
                    </div>
                  </div>
                  {filtered.length === 0 ? (
                    <div style={{ textAlign:'center', padding:'30px', color:'#4a5568', fontSize:'12px' }}>No data yet</div>
                  ) : (
                    <>
                      <div style={{ display:'flex', alignItems:'flex-end', gap:'3px', height:'80px' }}>
                        {filtered.map((e, i) => {
                          const h = Math.max((e.amount / maxAmt) * 76, 4)
                          const isLast = i === filtered.length - 1
                          return (
                            <div key={e.id || i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:'2px' }}>
                              {isLast && <div style={{ fontSize:'8px', color:'#00ff88', fontWeight:'800' }}>${e.amount.toFixed(2)}</div>}
                              <div style={{ width:'100%', height: h + 'px', borderRadius:'3px 3px 0 0', background: isLast ? 'linear-gradient(180deg,#00ff88,#00e5ff)' : 'rgba(0,229,255,0.3)' }} />
                            </div>
                          )
                        })}
                      </div>
                      <div style={{ display:'flex', justifyContent:'space-between', marginTop:'6px', fontSize:'9px', color:'#4a5568' }}>
                        <span>{filtered[0]?.date?.slice(5)}</span>
                        <span style={{ color:'#00ff88', fontWeight:'700' }}>Total: ${filtered.reduce((s,e)=>s+e.amount,0).toFixed(2)}</span>
                        <span>{filtered[filtered.length-1]?.date?.slice(5)}</span>
                      </div>
                    </>
                  )}
                </div>
              )
            })()}

            <div style={{ background:'linear-gradient(135deg,rgba(0,229,255,0.06),rgba(0,255,136,0.04))', border:'1px solid rgba(0,229,255,0.15)', borderRadius:'14px', padding:'14px', marginBottom:'14px', display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'8px' }}>
              {[
                { label:'Days', value: earnings.filter(e=>e.type==='daily').length, color:'#00e5ff' },
                { label:tt('totalEarned',lang), value:`$${earnings.reduce((s,e)=>s+e.amount,0).toFixed(2)}`, color:'#00ff88' },
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
              <div key={e.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', background: e.type==='transfer_in'?'rgba(0,229,255,.04)':e.type==='transfer_out'?'rgba(255,69,96,.04)':'#111620', border:`1px solid ${e.type==='transfer_in'?'rgba(0,229,255,.1)':e.type==='transfer_out'?'rgba(255,69,96,.1)':'rgba(255,255,255,0.05)'}`, borderRadius:'12px', padding:'12px', marginBottom:'6px' }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:'12px', fontWeight:'800', color:
                    e.type==='transfer_in'    ? '#00e5ff' :
                    e.type==='transfer_out'   ? '#ff4560' :
                    e.type==='admin_adjustment'?'#ffa500' :
                    e.type==='salary'         ? '#ffca28' :
                    e.type==='streak_bonus'   ? '#ff6b35' :
                    e.type==='reinvest'       ? '#a78bfa' :
                    e.type==='referral'       ? '#00ff88' :
                    '#8892a4'
                  }}>
                    {e.type==='transfer_in'    ? '⬇️ Received Transfer' :
                     e.type==='transfer_out'   ? '⬆️ Sent Transfer' :
                     e.type==='admin_adjustment'? '⚡ Admin Adjustment' :
                     e.type==='salary'         ? '💼 Salary' :
                     e.type==='streak_bonus'   ? '🔥 Streak Bonus' :
                     e.type==='reinvest'       ? '🔄 Reinvested' :
                     e.type==='referral'       ? '🔗 Referral Bonus' :
                     '📈 Daily Return'}
                  </div>
                  <div style={{ fontSize:'10px', color:'#4a5568', marginTop:2 }}>{e.date}</div>
                  {e.note && <div style={{ fontSize:'10px', color:'#6a7585', marginTop:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{e.note}</div>}
                </div>
                <div style={{ fontSize:'16px', fontWeight:'900', color: e.amount>=0 ? '#00ff88' : '#ff4560', marginLeft:8, flexShrink:0 }}>
                  {e.amount>=0 ? '+' : ''}${Math.abs(e.amount).toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>


        {/* ══ SECURITY TAB ══ */}
        {activeTab === 'security' && (
          <div style={{ animation:'fadeUp 0.3s ease' }}>

            {/* 2FA Card */}
            <div style={{ background:'#111620', border:`1px solid ${twoFAEnabled ? 'rgba(0,255,136,0.25)' : 'rgba(255,255,255,0.07)'}`, borderRadius:'16px', padding:'18px', marginBottom:'12px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:'12px', marginBottom:'14px' }}>
                <div style={{ width:44, height:44, borderRadius:'12px', background: twoFAEnabled ? 'rgba(0,255,136,0.12)' : 'rgba(0,229,255,0.08)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22 }}>
                  {twoFAEnabled ? '🛡️' : '🔒'}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:'14px', fontWeight:'800', color:'#eef2f7' }}>Two-Factor Authentication</div>
                  <div style={{ fontSize:'11px', color: twoFAEnabled ? '#00ff88' : '#4a5568', marginTop:2 }}>
                    {twoFAEnabled ? '✅ Enabled — Google Authenticator' : 'Extra security for your account'}
                  </div>
                </div>
                <div style={{ fontSize:11, fontWeight:700, padding:'4px 10px', borderRadius:8, background: twoFAEnabled ? 'rgba(0,255,136,0.1)' : 'rgba(255,69,96,0.1)', color: twoFAEnabled ? '#00ff88' : '#ff4560', border:`1px solid ${twoFAEnabled ? 'rgba(0,255,136,0.3)' : 'rgba(255,69,96,0.2)'}` }}>
                  {twoFAEnabled ? 'ON' : 'OFF'}
                </div>
              </div>
              <div style={{ fontSize:12, color:'#4a5568', lineHeight:1.7, marginBottom:14 }}>
                {twoFAEnabled
                  ? 'Login এ Google Authenticator code লাগবে। Account অনেক বেশি secure।'
                  : 'Google Authenticator দিয়ে login এ extra layer of security যোগ করুন। Highly recommended।'}
              </div>
              <button onClick={() => setTwoFAStep('info')}
                style={{ width:'100%', padding:13, background: twoFAEnabled ? 'rgba(255,69,96,0.1)' : 'linear-gradient(135deg,#00e5ff,#00ff88)', border: twoFAEnabled ? '1px solid rgba(255,69,96,0.3)' : 'none', borderRadius:12, color: twoFAEnabled ? '#ff4560' : '#050810', fontSize:13, fontWeight:800, cursor:'pointer' }}>
                {twoFAEnabled ? '⚙️ Manage 2FA' : '📱 Setup Google Authenticator'}
              </button>
            </div>

            {/* Change PIN */}
            <div style={{ background:'#111620', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'16px', padding:'18px', marginBottom:'12px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:'12px', marginBottom:'14px' }}>
                <div style={{ width:44, height:44, borderRadius:'12px', background:'rgba(255,202,40,0.08)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22 }}>🔑</div>
                <div>
                  <div style={{ fontSize:'14px', fontWeight:'800', color:'#eef2f7' }}>Change Access PIN</div>
                  <div style={{ fontSize:'11px', color:'#4a5568', marginTop:2 }}>Investment account এর PIN পরিবর্তন করো</div>
                </div>
              </div>
              <button onClick={() => { setShowChange(true); setAuthStep('set') }}
                style={{ width:'100%', padding:13, background:'rgba(255,202,40,0.1)', border:'1px solid rgba(255,202,40,0.25)', borderRadius:12, color:'#ffca28', fontSize:13, fontWeight:700, cursor:'pointer' }}>
                🔑 Change PIN
              </button>
            </div>

            {/* Security Tips */}
            <div style={{ background:'rgba(0,229,255,0.04)', border:'1px solid rgba(0,229,255,0.12)', borderRadius:'16px', padding:'16px', marginBottom:'12px' }}>
              <div style={{ fontSize:'13px', fontWeight:'800', color:'#eef2f7', marginBottom:'12px' }}>🛡️ Security Tips</div>
              {[
                ['🔒', 'PIN কখনো কাউকে দেবে না'],
                ['📱', '2FA enable রাখলে account অনেক safe'],
                ['⚠️', 'Suspicious activity দেখলে support এ জানাও'],
                ['🌐', 'Public WiFi তে login এড়িয়ে চলো'],
                ['🔄', 'প্রতি মাসে PIN পরিবর্তন করো'],
              ].map(([ic, txt], i) => (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 0', borderBottom: i < 4 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                  <span style={{ fontSize:18 }}>{ic}</span>
                  <span style={{ fontSize:12, color:'#8892a4' }}>{txt}</span>
                </div>
              ))}
            </div>

            {/* Account Info */}
            <div style={{ background:'#111620', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'16px', padding:'16px' }}>
              <div style={{ fontSize:'13px', fontWeight:'800', color:'#eef2f7', marginBottom:'12px' }}>📋 Account Info</div>
              {[
                ['User ID', user?.id?.slice(0,16)+'...'],
                ['Email', user?.email],
                ['Account Created', account?.created_at ? new Date(account.created_at).toLocaleDateString() : 'N/A'],
                ['2FA Status', twoFAEnabled ? '✅ Enabled' : '❌ Disabled'],
              ].map(([k,v], i) => (
                <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'9px 0', borderBottom: i < 3 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                  <span style={{ fontSize:12, color:'#4a5568' }}>{k}</span>
                  <span style={{ fontSize:12, fontWeight:600, color:'#eef2f7', fontFamily: k==='User ID'?'monospace':'inherit' }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══ SUPPORT TAB ══ */}
        {activeTab === 'support' && (
          <div style={{ animation:'fadeUp 0.3s ease' }}>

            {/* Contact card */}
            <div style={{ background:'linear-gradient(135deg,rgba(0,229,255,0.06),rgba(0,255,136,0.04))', border:'1px solid rgba(0,229,255,0.2)', borderRadius:'16px', padding:'20px', marginBottom:'12px', textAlign:'center' }}>
              <div style={{ fontSize:40, marginBottom:8 }}>💬</div>
              <div style={{ fontSize:15, fontWeight:800, color:'#eef2f7', marginBottom:6 }}>Echo World Support</div>
              <div style={{ fontSize:12, color:'#8892a4', lineHeight:1.7, marginBottom:16 }}>
                যেকোনো সমস্যায় আমরা সাহায্য করতে প্রস্তুত।<br/>
                সাধারণত <span style={{ color:'#00e5ff', fontWeight:600 }}>24 ঘণ্টার মধ্যে</span> reply দেওয়া হয়।
              </div>
              <button onClick={() => window.location.href='/support'}
                style={{ width:'100%', padding:14, background:'linear-gradient(135deg,#00e5ff,#00ff88)', border:'none', borderRadius:14, color:'#050810', fontSize:14, fontWeight:800, cursor:'pointer', marginBottom:8 }}>
                💬 Live Chat Support
              </button>
            </div>

            {/* FAQ */}
            <div style={{ background:'#111620', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'16px', padding:'16px', marginBottom:'12px' }}>
              <div style={{ fontSize:'13px', fontWeight:'800', color:'#eef2f7', marginBottom:'14px' }}>❓ সাধারণ প্রশ্ন</div>
              {[
                { q:'Daily earning কখন আসবে?', a:'প্রতিদিন post করলে earning unlock হয়। Admin manually approve করেন।' },
                { q:'Deposit approve হতে কতক্ষণ লাগে?', a:'সাধারণত 1-24 ঘণ্টা। Admin verify করার পরে approve হয়।' },
                { q:'Withdraw কবে করতে পারব?', a:'প্রতি মাসের 14th ও 28th তারিখে। Minimum $50।' },
                { q:'Referral income কখন আসে?', a:'তোমার referred user এর daily earning এর সাথে।' },
                { q:'PIN ভুলে গেলে কী করব?', a:'PIN screen এ "Forgot PIN?" চাপো। Admin 24 ঘণ্টায় reset করবেন।' },
                { q:'Investment মেয়াদ শেষে কী হবে?', a:'365 দিন পর Principal ফেরত দেওয়া হবে wallet এ।' },
              ].map(({ q, a }, i) => (
                <div key={i} style={{ borderBottom: i < 5 ? '1px solid rgba(255,255,255,0.04)' : 'none', paddingBottom: i < 5 ? 12 : 0, marginBottom: i < 5 ? 12 : 0 }}>
                  <div style={{ fontSize:12, fontWeight:700, color:'#eef2f7', marginBottom:4 }}>Q: {q}</div>
                  <div style={{ fontSize:11, color:'#4a5568', lineHeight:1.6 }}>A: {a}</div>
                </div>
              ))}
            </div>

            {/* Investment Rules */}
            <div style={{ background:'rgba(255,165,0,0.05)', border:'1px solid rgba(255,165,0,0.2)', borderRadius:'16px', padding:'16px' }}>
              <div style={{ fontSize:'13px', fontWeight:'800', color:'#ffa500', marginBottom:'12px' }}>📋 Investment Rules</div>
              {[
                '💰 Minimum deposit: $100 USDT TRC20',
                '📅 Withdrawal: 14th & 28th every month',
                '💵 Minimum withdrawal: $50',
                '📤 Minimum transfer: $10',
                '🔄 Minimum reinvest: $20',
                '📸 Daily post করলেই daily earning পাবে',
                '🔗 Valid referral = $100+ deposit approved',
                '👥 Level 1: 50% | Level 2: 25% commission',
                '💼 Silver salary: 12+ valid referral + $500+ plan',
                '🏆 Gold salary: 25+ valid referral + $500+ plan',
              ].map((rule, i) => (
                <div key={i} style={{ fontSize:11, color:'#8892a4', padding:'5px 0', borderBottom: i < 9 ? '1px solid rgba(255,255,255,0.03)' : 'none', lineHeight:1.5 }}>
                  {rule}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════
            MONETIZE TAB
        ══════════════════════════════════════ */}
        {activeTab === 'monetize' && (
          <div style={{ animation:'fadeUp 0.3s ease' }}>

            {/* ── LOCKED — Investment চলছে ── */}
            {!isMatured ? (
              <div>
                {/* Hero */}
                <div style={{ background:'linear-gradient(135deg,rgba(0,229,255,0.06),rgba(0,255,136,0.04))', border:'1px solid rgba(0,229,255,0.15)', borderRadius:20, padding:24, textAlign:'center', marginBottom:14 }}>
                  <div style={{ fontSize:56, marginBottom:10 }}>🔒</div>
                  <div style={{ fontSize:20, fontWeight:900, background:'linear-gradient(90deg,#00e5ff,#00ff88)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', marginBottom:8 }}>
                    {tm('monetize',lang)} — {tm('locked',lang)}
                  </div>
                  <div style={{ fontSize:12, color:'#4a5568', lineHeight:1.9, marginBottom:16 }}>
                    {lang==='bn' ? <>তোমার <span style={{color:'#00e5ff',fontWeight:700}}>৩৬৫ দিনের investment</span> শেষ হলে এই page টি <span style={{color:'#00ff88',fontWeight:700}}>Monetization Hub</span> এ পরিণত হবে।</> :
                     lang==='hi' ? <>तुम्हारे <span style={{color:'#00e5ff',fontWeight:700}}>365 दिन के investment</span> के बाद यह page <span style={{color:'#00ff88',fontWeight:700}}>Monetization Hub</span> बन जाएगा।</> :
                     lang==='ar' ? <>بعد انتهاء <span style={{color:'#00e5ff',fontWeight:700}}>365 يومًا من الاستثمار</span> ستتحول هذه الصفحة إلى <span style={{color:'#00ff88',fontWeight:700}}>مركز التحقيق من الدخل</span>.</> :
                     <>After your <span style={{color:'#00e5ff',fontWeight:700}}>365-day investment</span> ends, this page becomes your <span style={{color:'#00ff88',fontWeight:700}}>Monetization Hub</span>.</>}
                  </div>
                  {/* Progress */}
                  <div style={{ background:'rgba(255,255,255,0.04)', borderRadius:12, padding:'14px 16px', marginBottom:8 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
                      <span style={{ fontSize:11, color:'#4a5568', fontWeight:600 }}>{tm('daysLeft',lang)}</span>
                      <span style={{ fontSize:13, color:'#ffa500', fontWeight:900 }}>{daysLeft} {lang==='bn'?'দিন':lang==='hi'?'दिन':'days'}</span>
                    </div>
                    <div style={{ height:10, background:'rgba(255,255,255,0.06)', borderRadius:5, overflow:'hidden', marginBottom:6 }}>
                      <div style={{ height:'100%', width:`${monetizProgress}%`, background:'linear-gradient(90deg,#00e5ff,#00ff88)', borderRadius:5, transition:'width 1s' }}/>
                    </div>
                    <div style={{ fontSize:11, color:'#4a5568', textAlign:'center' }}>{monetizProgress}% {lang==='bn'?'সম্পন্ন':lang==='hi'?'पूर्ण':'complete'}</div>
                  </div>
                </div>

                {/* Eligibility Criteria */}
                <div style={{ background:'#111620', border:'1px solid rgba(255,255,255,0.07)', borderRadius:16, padding:'16px', marginBottom:12 }}>
                  <div style={{ fontSize:13, fontWeight:800, color:'#eef2f7', marginBottom:12 }}>
                    📋 {lang==='bn'?'Monetization এর শর্ত':lang==='hi'?'Monetization की शर्तें':'Monetization Criteria'}
                  </div>
                  {[
                    {
                      icon:'🎬',
                      title: lang==='bn'?'Shorts / ছোট ভিডিও':lang==='hi'?'Shorts / छोटे वीडियो':'Shorts / Short Videos',
                      criteria: [
                        { label: lang==='bn'?'ভিউ':lang==='hi'?'व्यू':'Views', need:5000, have:shortViews, unit:'' },
                        { label: tm('supporters',lang), need:600, have:supporterCount, unit:'' },
                      ],
                      color:'#ff4560'
                    },
                    {
                      icon:'📹',
                      title: lang==='bn'?'Long Video':lang==='hi'?'लंबे वीडियो':'Long Videos',
                      criteria: [
                        { label: tm('watchTime',lang), need:1500, have:longWatchHrs, unit:lang==='bn'?'ঘণ্টা':lang==='hi'?'घंटे':'hrs' },
                        { label: tm('supporters',lang), need:500, have:supporterCount, unit:'' },
                      ],
                      color:'#a855f7'
                    },
                    {
                      icon:'🪪',
                      title: tm('nidVerify',lang),
                      criteria: [],
                      nid: true,
                      color:'#00e5ff'
                    },
                  ].map((item, i) => (
                    <div key={i} style={{ background:'rgba(255,255,255,0.03)', border:`1px solid ${item.color}18`, borderRadius:12, padding:'12px', marginBottom:8 }}>
                      <div style={{ fontSize:13, fontWeight:700, color:item.color, marginBottom:8, display:'flex', alignItems:'center', gap:6 }}>
                        <span>{item.icon}</span> {item.title}
                      </div>
                      {item.criteria.map((cr, j) => {
                        const pct = Math.min(100, Math.floor((cr.have / cr.need) * 100))
                        const done = cr.have >= cr.need
                        return (
                          <div key={j} style={{ marginBottom:6 }}>
                            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                              <span style={{ fontSize:11, color:'#8892a4' }}>{cr.label}</span>
                              <span style={{ fontSize:11, fontWeight:700, color: done ? '#00ff88' : '#ffa500' }}>
                                {cr.have.toLocaleString()}/{cr.need.toLocaleString()} {cr.unit} {done ? '✅' : ''}
                              </span>
                            </div>
                            <div style={{ height:5, background:'rgba(255,255,255,0.06)', borderRadius:3, overflow:'hidden' }}>
                              <div style={{ height:'100%', width:`${pct}%`, background: done ? '#00ff88' : item.color, borderRadius:3 }}/>
                            </div>
                          </div>
                        )
                      })}
                      {item.nid && (
                        <div style={{ fontSize:11, color: nidStatus==='approved' ? '#00ff88' : nidStatus==='pending' ? '#ffa500' : '#4a5568' }}>
                          {nidStatus==='approved' ? '✅ ' + (lang==='bn'?'NID অনুমোদিত':lang==='hi'?'NID अनुमोदित':'NID Approved') :
                           nidStatus==='pending'  ? '⏳ ' + (lang==='bn'?'Admin যাচাই করছেন':lang==='hi'?'Admin सत्यापन कर रहे हैं':'Pending Admin Review') :
                           '❌ ' + (lang==='bn'?'NID যাচাই বাকি':lang==='hi'?'NID सत्यापन बाकी':'NID Not Verified')}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Preview features */}
                <div style={{ fontSize:12, fontWeight:800, color:'#eef2f7', marginBottom:8 }}>
                  🚀 {lang==='bn'?'Unlock হলে যা পাবে':lang==='hi'?'Unlock होने पर क्या मिलेगा':'What You'll Unlock'}
                </div>
                {[
                  { icon:'🎬', title: tm('videoIncome',lang),  desc: lang==='bn'?'প্রতিটি video থেকে আয়':lang==='hi'?'हर वीडियो से कमाई':'Earn from every video',            color:'#ff4560' },
                  { icon:'📢', title: tm('adRevenue',lang),    desc: lang==='bn'?'Content এ বিজ্ঞাপন আয়':lang==='hi'?'कंटेंट से विज्ञापन आय':'Ad revenue from your content',     color:'#ffa500' },
                  { icon:'💰', title: tm('creatorFund',lang),  desc: lang==='bn'?'Monthly creator bonus':lang==='hi'?'मासिक क्रिएटर बोनस':'Monthly creator bonus',              color:'#00ff88' },
                  { icon:'🎁', title: tm('liveGifts',lang),    desc: lang==='bn'?'Live gift থেকে real income':lang==='hi'?'लाइव गिफ्ट से आय':'Real income from live gifts',       color:'#00e5ff' },
                  { icon:'📊', title: tm('analytics',lang),    desc: lang==='bn'?'Video performance data':lang==='hi'?'वीडियो परफॉर्मेंस डेटा':'Video performance data',         color:'#a855f7' },
                  { icon:'🤝', title: lang==='bn'?'Brand Deals':lang==='hi'?'ब्रांड डील':'Brand Deals', desc: lang==='bn'?'Company এর সাথে collaboration':lang==='hi'?'कंपनियों के साथ सहयोग':'Collaborate with brands', color:'#ffca28' },
                ].map((f, i) => (
                  <div key={i} style={{ background:'#111620', border:`1px solid ${f.color}15`, borderRadius:12, padding:'10px 12px', marginBottom:6, display:'flex', alignItems:'center', gap:10, opacity:0.7 }}>
                    <div style={{ width:36, height:36, borderRadius:10, background:`${f.color}12`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>{f.icon}</div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:12, fontWeight:700, color:'#eef2f7' }}>{f.title}</div>
                      <div style={{ fontSize:10, color:'#4a5568' }}>{f.desc}</div>
                    </div>
                    <div style={{ fontSize:16 }}>🔒</div>
                  </div>
                ))}
              </div>

            ) : (
              /* ══════════════════════════════════════
                 UNLOCKED — Monetization Active
              ══════════════════════════════════════ */
              <div>

                {/* ── HOME VIEW ── */}
                {monetizeView === 'home' && (
                  <div>
                    {/* Header */}
                    <div style={{ background:'linear-gradient(135deg,rgba(0,255,136,0.08),rgba(0,229,255,0.05))', border:'1px solid rgba(0,255,136,0.2)', borderRadius:20, padding:20, marginBottom:14, textAlign:'center' }}>
                      <div style={{ fontSize:48, marginBottom:6 }}>💰</div>
                      <div style={{ fontSize:18, fontWeight:900, background:'linear-gradient(90deg,#00ff88,#00e5ff)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', marginBottom:4 }}>
                        {tm('monetize',lang)} Hub
                      </div>
                      <div style={{ fontSize:11, color:'#4a5568' }}>
                        {lang==='bn'?'তোমার creator journey শুরু হয়েছে':lang==='hi'?'तुम्हारी creator journey शुरू हो गई है':'Your creator journey has begun'}
                      </div>
                    </div>

                    {/* NID status banner */}
                    {nidStatus !== 'approved' && (
                      <div onClick={() => setMonetizeView('nid')}
                        style={{ background: nidStatus==='pending' ? 'rgba(255,165,0,0.08)' : 'rgba(255,69,96,0.08)', border:`1px solid ${nidStatus==='pending'?'rgba(255,165,0,0.25)':'rgba(255,69,96,0.25)'}`, borderRadius:12, padding:'12px 14px', marginBottom:12, cursor:'pointer', display:'flex', alignItems:'center', gap:10 }}>
                        <div style={{ fontSize:24 }}>{nidStatus==='pending'?'⏳':'🪪'}</div>
                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:12, fontWeight:700, color: nidStatus==='pending'?'#ffa500':'#ff4560' }}>
                            {nidStatus==='pending'
                              ? (lang==='bn'?'NID যাচাই চলছে':lang==='hi'?'NID सत्यापन हो रहा है':'NID Verification Pending')
                              : (lang==='bn'?'NID যাচাই করো':lang==='hi'?'NID सत्यापन करें':'Verify Your NID')}
                          </div>
                          <div style={{ fontSize:10, color:'#4a5568' }}>
                            {lang==='bn'?'Payment পেতে NID verify করা বাধ্যতামূলক':lang==='hi'?'Payment के लिए NID verify जरूरी है':'NID verification required for payouts'}
                          </div>
                        </div>
                        <div style={{ fontSize:16, color:'#4a5568' }}>›</div>
                      </div>
                    )}

                    {/* 4 Main Cards */}
                    {[
                      { key:'videos', icon:'🎬', title: tm('videoIncome',lang),  color:'#ff4560', earn: userPosts.filter(p=>p.media_type==='video').reduce((s,p)=>s+(p.income_earned||0),0) },
                      { key:'ads',    icon:'📢', title: tm('adRevenue',lang),    color:'#ffa500', earn: account?.ad_revenue || 0 },
                      { key:'fund',   icon:'💰', title: tm('creatorFund',lang),  color:'#00ff88', earn: account?.creator_fund || 0 },
                      { key:'gifts',  icon:'🎁', title: tm('liveGifts',lang),    color:'#00e5ff', earn: account?.live_gift_income || 0 },
                    ].map((card, i) => (
                      <div key={i} onClick={() => setMonetizeView(card.key)}
                        style={{ background:'#111620', border:`1px solid ${card.color}22`, borderRadius:16, padding:'16px', marginBottom:10, cursor:'pointer', display:'flex', alignItems:'center', gap:14 }}>
                        <div style={{ width:52, height:52, borderRadius:14, background:`${card.color}12`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:26, flexShrink:0 }}>{card.icon}</div>
                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:14, fontWeight:800, color:'#eef2f7', marginBottom:3 }}>{card.title}</div>
                          <div style={{ fontSize:20, fontWeight:900, color:card.color }}>${card.earn.toFixed(2)}</div>
                        </div>
                        <div style={{ fontSize:20, color:'#4a5568' }}>›</div>
                      </div>
                    ))}

                    {/* Total */}
                    <div style={{ background:'linear-gradient(135deg,rgba(0,229,255,0.08),rgba(0,255,136,0.05))', border:'1px solid rgba(0,229,255,0.2)', borderRadius:14, padding:'14px', textAlign:'center', marginBottom:10 }}>
                      <div style={{ fontSize:10, color:'#4a5568', marginBottom:4 }}>{lang==='bn'?'মোট Monetization আয়':lang==='hi'?'कुल Monetization कमाई':'TOTAL MONETIZATION EARNINGS'}</div>
                      <div style={{ fontSize:28, fontWeight:900, background:'linear-gradient(90deg,#00e5ff,#00ff88)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
                        ${(
                          userPosts.filter(p=>p.media_type==='video').reduce((s,p)=>s+(p.income_earned||0),0) +
                          (account?.ad_revenue||0) + (account?.creator_fund||0) + (account?.live_gift_income||0)
                        ).toFixed(2)}
                      </div>
                    </div>

                    <button onClick={()=>setActiveTab('withdraw')}
                      style={{ width:'100%', padding:14, background:'linear-gradient(135deg,#00e5ff,#00ff88)', border:'none', borderRadius:14, color:'#050810', fontSize:14, fontWeight:900, cursor:'pointer' }}>
                      💳 {lang==='bn'?'Withdraw করো':lang==='hi'?'Withdraw करें':'Withdraw Earnings'}
                    </button>
                  </div>
                )}

                {/* ── VIDEO INCOME VIEW ── */}
                {monetizeView === 'videos' && (
                  <div>
                    <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
                      <button onClick={()=>setMonetizeView('home')} style={{ background:'rgba(255,255,255,0.06)', border:'none', borderRadius:10, padding:'8px 12px', color:'#eef2f7', fontSize:13, cursor:'pointer' }}>← {lang==='bn'?'ফিরে যাও':lang==='hi'?'वापस':'Back'}</button>
                      <div style={{ fontSize:15, fontWeight:800, color:'#ff4560' }}>🎬 {tm('videoIncome',lang)}</div>
                    </div>

                    {/* Stats */}
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginBottom:14 }}>
                      {[
                        { label: tm('views',lang),    value: shortViews.toLocaleString(),    color:'#00e5ff' },
                        { label: tm('watchTime',lang), value: longWatchHrs+'h',              color:'#ffa500' },
                        { label: tm('income',lang),    value: '$'+userPosts.filter(p=>p.media_type==='video').reduce((s,p)=>s+(p.income_earned||0),0).toFixed(2), color:'#00ff88' },
                      ].map((s,i) => (
                        <div key={i} style={{ background:'#111620', border:`1px solid ${s.color}18`, borderRadius:12, padding:'10px 8px', textAlign:'center' }}>
                          <div style={{ fontSize:15, fontWeight:900, color:s.color }}>{s.value}</div>
                          <div style={{ fontSize:9, color:'#4a5568', marginTop:2 }}>{s.label}</div>
                        </div>
                      ))}
                    </div>

                    {/* Video list */}
                    {userPosts.filter(p => p.media_type === 'video').length === 0 ? (
                      <div style={{ textAlign:'center', padding:40, color:'#4a5568' }}>
                        <div style={{ fontSize:40, marginBottom:8 }}>🎬</div>
                        <div style={{ fontSize:13 }}>{lang==='bn'?'এখনো কোনো video নেই':lang==='hi'?'अभी कोई वीडियो नहीं':'No videos yet'}</div>
                      </div>
                    ) : userPosts.filter(p => p.media_type === 'video').map((post, i) => (
                      <div key={i} onClick={() => { setSelectedVideo(post); setMonetizeView('videoDetail') }}
                        style={{ background:'#111620', border:'1px solid rgba(255,255,255,0.07)', borderRadius:14, padding:'12px', marginBottom:8, cursor:'pointer', display:'flex', gap:12, alignItems:'center' }}>
                        <div style={{ width:56, height:56, borderRadius:10, background:'#0c1018', overflow:'hidden', flexShrink:0, position:'relative' }}>
                          {post.media_url && <video src={post.media_url} style={{ width:'100%', height:'100%', objectFit:'cover' }} muted preload="metadata"/>}
                          <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,0.3)', fontSize:18 }}>▶</div>
                        </div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:12, fontWeight:700, color:'#eef2f7', marginBottom:2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                            {post.content || (lang==='bn'?'শিরোনাম নেই':lang==='hi'?'शीर्षक नहीं':'No title')}
                          </div>
                          <div style={{ display:'flex', gap:10 }}>
                            <span style={{ fontSize:10, color:'#4a5568' }}>👁 {(post.view_count||0).toLocaleString()}</span>
                            <span style={{ fontSize:10, color:'#4a5568' }}>⏱ {(post.watch_time_minutes||0)}m</span>
                            <span style={{ fontSize:10, color:'#00ff88', fontWeight:700 }}>${(post.income_earned||0).toFixed(2)}</span>
                          </div>
                        </div>
                        <div style={{ fontSize:16, color:'#4a5568' }}>›</div>
                      </div>
                    ))}

                    {/* Tips */}
                    <div style={{ background:'rgba(255,165,0,0.05)', border:'1px solid rgba(255,165,0,0.2)', borderRadius:14, padding:'14px', marginTop:8 }}>
                      <div style={{ fontSize:12, fontWeight:800, color:'#ffa500', marginBottom:8 }}>💡 {tm('tips',lang)}</div>
                      {(lang==='bn' ? [
                        '📱 ভার্টিকাল ভিডিও বেশি মানুষের সামনে যায়',
                        '⏱ ৩০-৬০ সেকেন্ডের ভিডিও সবচেয়ে বেশি watch হয়',
                        '#️⃣ ৩-৫টা relevant hashtag ব্যবহার করো',
                        '🕐 সকাল ৮টা বা রাত ৮টায় post করলে বেশি reach হয়',
                        '❤️ অন্যদের video তে comment করলে তোমার reach বাড়ে',
                        '🔄 প্রতিদিন post করলে algorithm তোমাকে বেশি দেখায়',
                      ] : lang==='hi' ? [
                        '📱 Vertical video ज्यादा लोगों तक पहुंचती है',
                        '⏱ 30-60 सेकंड के वीडियो सबसे ज्यादा देखे जाते हैं',
                        '#️⃣ 3-5 relevant hashtag इस्तेमाल करें',
                        '🕐 सुबह 8 बजे या रात 8 बजे post करें',
                        '❤️ दूसरों के video पर comment करने से reach बढ़ती है',
                        '🔄 रोज post करने से algorithm आपको ज्यादा दिखाता है',
                      ] : [
                        '📱 Vertical videos reach more people',
                        '⏱ 30-60 second videos get most watch time',
                        '#️⃣ Use 3-5 relevant hashtags',
                        '🕐 Post at 8 AM or 8 PM for maximum reach',
                        '❤️ Commenting on others' videos boosts your reach',
                        '🔄 Daily posting makes algorithm show you more',
                      ]).map((tip, i) => (
                        <div key={i} style={{ fontSize:11, color:'#8892a4', padding:'4px 0', borderBottom: i < 5 ? '1px solid rgba(255,255,255,0.03)' : 'none' }}>{tip}</div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── VIDEO DETAIL VIEW ── */}
                {monetizeView === 'videoDetail' && selectedVideo && (
                  <div>
                    <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
                      <button onClick={()=>setMonetizeView('videos')} style={{ background:'rgba(255,255,255,0.06)', border:'none', borderRadius:10, padding:'8px 12px', color:'#eef2f7', fontSize:13, cursor:'pointer' }}>←</button>
                      <div style={{ fontSize:14, fontWeight:800, color:'#eef2f7' }}>{tm('analytics',lang)}</div>
                    </div>

                    {/* Video preview */}
                    <div style={{ background:'#0c1018', borderRadius:14, overflow:'hidden', marginBottom:14, aspectRatio:'9/16', maxHeight:280, position:'relative' }}>
                      <video src={selectedVideo.media_url} style={{ width:'100%', height:'100%', objectFit:'cover' }} controls/>
                    </div>

                    {/* Analytics grid */}
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:12 }}>
                      {[
                        { icon:'👁', label: tm('views',lang),     value:(selectedVideo.view_count||0).toLocaleString(),     color:'#00e5ff' },
                        { icon:'⏱', label: tm('watchTime',lang),  value:(selectedVideo.watch_time_minutes||0)+'m',          color:'#ffa500' },
                        { icon:'❤️', label: lang==='bn'?'লাইক':lang==='hi'?'लाइक':'Likes', value:(selectedVideo.likes_count||0).toLocaleString(), color:'#ff4560' },
                        { icon:'💰', label: tm('income',lang),     value:'$'+(selectedVideo.income_earned||0).toFixed(2),    color:'#00ff88' },
                      ].map((s,i) => (
                        <div key={i} style={{ background:'#111620', border:`1px solid ${s.color}18`, borderRadius:12, padding:'12px', textAlign:'center' }}>
                          <div style={{ fontSize:20, marginBottom:4 }}>{s.icon}</div>
                          <div style={{ fontSize:18, fontWeight:900, color:s.color }}>{s.value}</div>
                          <div style={{ fontSize:10, color:'#4a5568', marginTop:2 }}>{s.label}</div>
                        </div>
                      ))}
                    </div>

                    {/* Status */}
                    <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:12, padding:'12px', marginBottom:12 }}>
                      <div style={{ fontSize:11, color:'#4a5568', marginBottom:6 }}>{lang==='bn'?'Video অবস্থা':lang==='hi'?'Video की स्थिति':'Video Status'}</div>
                      <div style={{ fontSize:12, fontWeight:700, color: (selectedVideo.view_count||0) >= 1000 ? '#00ff88' : '#ffa500' }}>
                        {(selectedVideo.view_count||0) >= 5000 ? '🔥 '+(lang==='bn'?'Viral!':lang==='hi'?'Viral!':'Viral!') :
                         (selectedVideo.view_count||0) >= 1000 ? '📈 '+(lang==='bn'?'ভালো Performance':lang==='hi'?'अच्छा Performance':'Good Performance') :
                         '📊 '+(lang==='bn'?'বাড়ছে':lang==='hi'?'बढ़ रहा है':'Growing')}
                      </div>
                    </div>

                    {/* Tips for this video */}
                    {(selectedVideo.view_count||0) < 1000 && (
                      <div style={{ background:'rgba(255,165,0,0.05)', border:'1px solid rgba(255,165,0,0.2)', borderRadius:12, padding:'12px' }}>
                        <div style={{ fontSize:12, fontWeight:700, color:'#ffa500', marginBottom:6 }}>💡 {lang==='bn'?'এই video বাড়াতে':lang==='hi'?'इस video को बढ़ाने के लिए':'To grow this video'}</div>
                        {(lang==='bn' ? [
                          'Feed এ share করো — আরো মানুষের কাছে পৌঁছাবে',
                          'Caption এ keyword যোগ করো',
                          'First 3 seconds টা interesting রাখো',
                        ] : lang==='hi' ? [
                          'Feed में share करें — ज्यादा लोगों तक पहुंचेगा',
                          'Caption में keyword जोड़ें',
                          'पहले 3 seconds interesting रखें',
                        ] : [
                          'Share to feed — reach more people',
                          'Add keywords to caption',
                          'Keep first 3 seconds interesting',
                        ]).map((t,i) => (
                          <div key={i} style={{ fontSize:11, color:'#8892a4', padding:'3px 0' }}>• {t}</div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* ── AD REVENUE VIEW ── */}
                {monetizeView === 'ads' && (
                  <div>
                    <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
                      <button onClick={()=>setMonetizeView('home')} style={{ background:'rgba(255,255,255,0.06)', border:'none', borderRadius:10, padding:'8px 12px', color:'#eef2f7', fontSize:13, cursor:'pointer' }}>←</button>
                      <div style={{ fontSize:15, fontWeight:800, color:'#ffa500' }}>📢 {tm('adRevenue',lang)}</div>
                    </div>
                    <div style={{ background:'linear-gradient(135deg,rgba(255,165,0,0.08),rgba(255,202,40,0.04))', border:'1px solid rgba(255,165,0,0.2)', borderRadius:16, padding:20, textAlign:'center', marginBottom:14 }}>
                      <div style={{ fontSize:11, color:'#4a5568', marginBottom:4 }}>{lang==='bn'?'মোট বিজ্ঞাপন আয়':lang==='hi'?'कुल विज्ञापन आय':'Total Ad Revenue'}</div>
                      <div style={{ fontSize:36, fontWeight:900, color:'#ffa500' }}>${(account?.ad_revenue||0).toFixed(2)}</div>
                    </div>
                    <div style={{ background:'#111620', border:'1px solid rgba(255,255,255,0.07)', borderRadius:14, padding:16 }}>
                      <div style={{ fontSize:12, fontWeight:700, color:'#eef2f7', marginBottom:10 }}>
                        {lang==='bn'?'কীভাবে Ad Revenue কাজ করে':lang==='hi'?'Ad Revenue कैसे काम करता है':'How Ad Revenue Works'}
                      </div>
                      {(lang==='bn' ? [
                        '📢 তোমার content এ Echo World বিজ্ঞাপন দেখায়',
                        '👁 প্রতি ১০০০ view এ তুমি share পাবে',
                        '📈 বেশি view = বেশি ad revenue',
                        '💳 প্রতি মাসে wallet এ যোগ হবে',
                      ] : lang==='hi' ? [
                        '📢 Echo World तुम्हारे content पर ads दिखाता है',
                        '👁 हर 1000 view पर share मिलता है',
                        '📈 ज्यादा view = ज्यादा ad revenue',
                        '💳 हर महीने wallet में जुड़ता है',
                      ] : [
                        '📢 Echo World shows ads on your content',
                        '👁 You earn a share per 1000 views',
                        '📈 More views = more ad revenue',
                        '💳 Added to wallet every month',
                      ]).map((t,i) => (
                        <div key={i} style={{ fontSize:12, color:'#8892a4', padding:'6px 0', borderBottom: i<3 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>{t}</div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── CREATOR FUND VIEW ── */}
                {monetizeView === 'fund' && (
                  <div>
                    <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
                      <button onClick={()=>setMonetizeView('home')} style={{ background:'rgba(255,255,255,0.06)', border:'none', borderRadius:10, padding:'8px 12px', color:'#eef2f7', fontSize:13, cursor:'pointer' }}>←</button>
                      <div style={{ fontSize:15, fontWeight:800, color:'#00ff88' }}>💰 {tm('creatorFund',lang)}</div>
                    </div>
                    <div style={{ background:'linear-gradient(135deg,rgba(0,255,136,0.08),rgba(0,229,255,0.04))', border:'1px solid rgba(0,255,136,0.2)', borderRadius:16, padding:20, textAlign:'center', marginBottom:14 }}>
                      <div style={{ fontSize:11, color:'#4a5568', marginBottom:4 }}>{lang==='bn'?'এই মাসের Creator Fund':lang==='hi'?'इस महीने का Creator Fund':'This Month's Creator Fund'}</div>
                      <div style={{ fontSize:36, fontWeight:900, color:'#00ff88' }}>${(account?.creator_fund||0).toFixed(2)}</div>
                    </div>
                    <div style={{ background:'#111620', border:'1px solid rgba(255,255,255,0.07)', borderRadius:14, padding:16 }}>
                      <div style={{ fontSize:12, fontWeight:700, color:'#eef2f7', marginBottom:10 }}>
                        {lang==='bn'?'Creator Fund কীভাবে পাবে':lang==='hi'?'Creator Fund कैसे मिलेगा':'How to Get Creator Fund'}
                      </div>
                      {(lang==='bn' ? [
                        '🏆 Top creators প্রতি মাসে fund পায়',
                        '📊 Posts, views, engagement score এর উপর নির্ভর করে',
                        '🎯 বেশি active থাকলে বেশি পাবে',
                        '💳 মাসের শেষে wallet এ যোগ হবে',
                      ] : lang==='hi' ? [
                        '🏆 Top creators को हर महीने fund मिलता है',
                        '📊 Posts, views, engagement score पर निर्भर',
                        '🎯 ज्यादा active रहने पर ज्यादा मिलता है',
                        '💳 महीने के अंत में wallet में जुड़ता है',
                      ] : [
                        '🏆 Top creators receive monthly fund',
                        '📊 Based on posts, views, engagement score',
                        '🎯 More active = more fund',
                        '💳 Added to wallet at month end',
                      ]).map((t,i) => (
                        <div key={i} style={{ fontSize:12, color:'#8892a4', padding:'6px 0', borderBottom: i<3 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>{t}</div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── LIVE GIFTS VIEW ── */}
                {monetizeView === 'gifts' && (
                  <div>
                    <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
                      <button onClick={()=>setMonetizeView('home')} style={{ background:'rgba(255,255,255,0.06)', border:'none', borderRadius:10, padding:'8px 12px', color:'#eef2f7', fontSize:13, cursor:'pointer' }}>←</button>
                      <div style={{ fontSize:15, fontWeight:800, color:'#00e5ff' }}>🎁 {tm('liveGifts',lang)}</div>
                    </div>
                    <div style={{ background:'linear-gradient(135deg,rgba(0,229,255,0.08),rgba(0,255,136,0.04))', border:'1px solid rgba(0,229,255,0.2)', borderRadius:16, padding:20, textAlign:'center', marginBottom:14 }}>
                      <div style={{ fontSize:11, color:'#4a5568', marginBottom:4 }}>{lang==='bn'?'মোট Live Gift আয়':lang==='hi'?'कुल Live Gift कमाई':'Total Live Gift Income'}</div>
                      <div style={{ fontSize:36, fontWeight:900, color:'#00e5ff' }}>${(account?.live_gift_income||0).toFixed(2)}</div>
                    </div>
                    <div style={{ background:'#111620', border:'1px solid rgba(255,255,255,0.07)', borderRadius:14, padding:16 }}>
                      <div style={{ fontSize:12, fontWeight:700, color:'#eef2f7', marginBottom:10 }}>
                        {lang==='bn'?'Live Gift কীভাবে কাজ করে':lang==='hi'?'Live Gift कैसे काम करता है':'How Live Gifts Work'}
                      </div>
                      {(lang==='bn' ? [
                        '🎁 Viewer রা Live এ gift পাঠায়',
                        '💰 Gift এর ৭০% তুমি পাবে, ৩০% platform',
                        '📅 প্রতি মাসে wallet এ যোগ হবে',
                        '🔴 বেশি Live করলে বেশি gift পাবে',
                      ] : lang==='hi' ? [
                        '🎁 Viewers Live में gift भेजते हैं',
                        '💰 Gift का 70% तुम्हें, 30% platform को',
                        '📅 हर महीने wallet में जुड़ता है',
                        '🔴 ज्यादा Live करने पर ज्यादा gift मिलता है',
                      ] : [
                        '🎁 Viewers send gifts during Live',
                        '💰 70% goes to you, 30% to platform',
                        '📅 Added to wallet monthly',
                        '🔴 Go Live more to receive more gifts',
                      ]).map((t,i) => (
                        <div key={i} style={{ fontSize:12, color:'#8892a4', padding:'6px 0', borderBottom: i<3 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>{t}</div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── NID VERIFY VIEW ── */}
                {monetizeView === 'nid' && (
                  <div>
                    <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
                      <button onClick={()=>setMonetizeView('home')} style={{ background:'rgba(255,255,255,0.06)', border:'none', borderRadius:10, padding:'8px 12px', color:'#eef2f7', fontSize:13, cursor:'pointer' }}>←</button>
                      <div style={{ fontSize:15, fontWeight:800, color:'#00e5ff' }}>🪪 {tm('nidVerify',lang)}</div>
                    </div>

                    {nidStatus === 'approved' ? (
                      <div style={{ textAlign:'center', padding:40 }}>
                        <div style={{ fontSize:56, marginBottom:10 }}>✅</div>
                        <div style={{ fontSize:16, fontWeight:900, color:'#00ff88' }}>
                          {lang==='bn'?'NID অনুমোদিত হয়েছে!':lang==='hi'?'NID अनुमोदित हो गया!':'NID Approved!'}
                        </div>
                      </div>
                    ) : nidStatus === 'pending' ? (
                      <div style={{ textAlign:'center', padding:40 }}>
                        <div style={{ fontSize:56, marginBottom:10 }}>⏳</div>
                        <div style={{ fontSize:16, fontWeight:900, color:'#ffa500' }}>
                          {lang==='bn'?'Admin যাচাই করছেন':lang==='hi'?'Admin सत्यापन कर रहे हैं':'Pending Admin Review'}
                        </div>
                        <div style={{ fontSize:12, color:'#4a5568', marginTop:8 }}>
                          {lang==='bn'?'সাধারণত ২৪ ঘণ্টার মধ্যে':lang==='hi'?'आमतौर पर 24 घंटे में':'Usually within 24 hours'}
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div style={{ background:'rgba(0,229,255,0.05)', border:'1px solid rgba(0,229,255,0.15)', borderRadius:14, padding:14, marginBottom:14 }}>
                          <div style={{ fontSize:12, fontWeight:700, color:'#00e5ff', marginBottom:4 }}>
                            {lang==='bn'?'NID / National ID Card':lang==='hi'?'NID / राष्ट्रीय पहचान पत्र':'NID / National Identity Card'}
                          </div>
                          <div style={{ fontSize:11, color:'#4a5568', lineHeight:1.7 }}>
                            {lang==='bn'?'সব দেশের National ID Card গ্রহণযোগ্য। Front ও Back দুটো ছবি দিতে হবে।':
                             lang==='hi'?'सभी देशों के National ID Card स्वीकार्य हैं। Front और Back दोनों photo देनी होगी।':
                             'All countries' National ID Cards accepted. Upload both front and back photos.'}
                          </div>
                        </div>

                        {/* Front upload */}
                        <div style={{ marginBottom:12 }}>
                          <div style={{ fontSize:11, color:'#4a5568', fontWeight:700, marginBottom:6 }}>
                            {lang==='bn'?'NID এর সামনের অংশ':lang==='hi'?'NID का सामने वाला हिस्सा':'NID Front Side'} *
                          </div>
                          <label style={{ display:'block', cursor:'pointer' }}>
                            <input type="file" accept="image/*" style={{ display:'none' }}
                              onChange={async e => {
                                const f = e.target.files[0]; if(!f) return
                                setNidUploading(true)
                                const url = await uploadNID(f)
                                setNidFront(url)
                                setNidUploading(false)
                              }}
                            />
                            <div style={{ background: nidFront ? 'rgba(0,255,136,0.05)' : '#0c1018', border:`2px dashed ${nidFront ? '#00ff88' : 'rgba(255,255,255,0.1)'}`, borderRadius:12, padding:20, textAlign:'center' }}>
                              {nidFront ? (
                                <img src={nidFront} style={{ maxHeight:120, maxWidth:'100%', borderRadius:8, objectFit:'contain' }}/>
                              ) : (
                                <>
                                  <div style={{ fontSize:32, marginBottom:6 }}>📷</div>
                                  <div style={{ fontSize:12, color:'#4a5568' }}>{lang==='bn'?'ছবি চাপো':lang==='hi'?'Photo tap करें':'Tap to upload'}</div>
                                </>
                              )}
                            </div>
                          </label>
                        </div>

                        {/* Back upload */}
                        <div style={{ marginBottom:16 }}>
                          <div style={{ fontSize:11, color:'#4a5568', fontWeight:700, marginBottom:6 }}>
                            {lang==='bn'?'NID এর পিছনের অংশ':lang==='hi'?'NID का पीछे वाला हिस्सा':'NID Back Side'} *
                          </div>
                          <label style={{ display:'block', cursor:'pointer' }}>
                            <input type="file" accept="image/*" style={{ display:'none' }}
                              onChange={async e => {
                                const f = e.target.files[0]; if(!f) return
                                setNidUploading(true)
                                const url = await uploadNID(f)
                                setNidBack(url)
                                setNidUploading(false)
                              }}
                            />
                            <div style={{ background: nidBack ? 'rgba(0,255,136,0.05)' : '#0c1018', border:`2px dashed ${nidBack ? '#00ff88' : 'rgba(255,255,255,0.1)'}`, borderRadius:12, padding:20, textAlign:'center' }}>
                              {nidBack ? (
                                <img src={nidBack} style={{ maxHeight:120, maxWidth:'100%', borderRadius:8, objectFit:'contain' }}/>
                              ) : (
                                <>
                                  <div style={{ fontSize:32, marginBottom:6 }}>📷</div>
                                  <div style={{ fontSize:12, color:'#4a5568' }}>{lang==='bn'?'ছবি চাপো':lang==='hi'?'Photo tap करें':'Tap to upload'}</div>
                                </>
                              )}
                            </div>
                          </label>
                        </div>

                        <button
                          disabled={!nidFront || !nidBack || nidUploading}
                          onClick={async () => {
                            if (!nidFront || !nidBack) return
                            setNidUploading(true)
                            await supabase.from('profiles').update({
                              nid_front_url: nidFront,
                              nid_back_url: nidBack,
                              nid_status: 'pending',
                              nid_submitted_at: new Date().toISOString(),
                            }).eq('id', user.id)
                            await sendSystemNotif(user.id, lang==='bn'?'তোমার NID জমা হয়েছে। Admin ২৪ ঘণ্টায় যাচাই করবেন।':lang==='hi'?'तुम्हारा NID submit हो गया। Admin 24 घंटे में verify करेगा।':'Your NID has been submitted. Admin will verify within 24 hours.')
                            setNidStatus('pending')
                            setNidUploading(false)
                          }}
                          style={{ width:'100%', padding:14, background: (nidFront && nidBack) ? 'linear-gradient(135deg,#00e5ff,#00ff88)' : 'rgba(255,255,255,0.05)', border:'none', borderRadius:14, color: (nidFront && nidBack) ? '#050810' : '#4a5568', fontSize:14, fontWeight:900, cursor:(nidFront && nidBack)?'pointer':'default' }}>
                          {nidUploading ? '⏳ Uploading...' : tm('submit',lang) + ' NID'}
                        </button>
                      </div>
                    )}
                  </div>
                )}

              </div>
            )}
          </div>
        )}

      {/* ── 2FA TOTP Modal ── */}
      {twoFAStep && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.92)', zIndex:3000, display:'flex', alignItems:'center', justifyContent:'center', padding:'20px' }}>
          <div style={{ background:'#111620', borderRadius:'20px', padding:'24px', width:'100%', maxWidth:'310px' }}>

            {/* Info screen */}
            {twoFAStep === 'info' && (
              <>
                <div style={{ fontSize:'32px', textAlign:'center', marginBottom:'8px' }}>{twoFAEnabled ? '🛡️' : '🔒'}</div>
                <div style={{ fontSize:'15px', fontWeight:'900', color:'#eef2f7', textAlign:'center', marginBottom:'6px' }}>
                  {twoFAEnabled ? '2FA Enabled' : 'Google Authenticator 2FA'}
                </div>
                <div style={{ fontSize:'11px', color:'#4a5568', textAlign:'center', lineHeight:'1.8', marginBottom:'20px' }}>
                  {twoFAEnabled
                    ? '✅ আপনার account Google Authenticator দিয়ে protected।'
                    : 'Google Authenticator app দিয়ে login এ extra security যোগ করুন। Phone এ আগে install করুন।'}
                </div>
                {twoFAEnabled ? (
                  <button onClick={disable2FA} style={{ width:'100%', padding:'13px', background:'rgba(255,69,96,0.1)', border:'1px solid rgba(255,69,96,0.3)', borderRadius:'14px', color:'#ff4560', fontSize:'13px', fontWeight:'700', cursor:'pointer', marginBottom:'8px' }}>
                    🔓 Disable 2FA
                  </button>
                ) : (
                  <button onClick={setup2FA} disabled={loadingTOTP} style={{ width:'100%', padding:'13px', background:'linear-gradient(135deg,#00e5ff,#00ff88)', border:'none', borderRadius:'14px', color:'#050810', fontSize:'13px', fontWeight:'900', cursor:'pointer', marginBottom:'8px' }}>
                    {loadingTOTP ? '⏳ Generating...' : '📱 Setup Google Authenticator'}
                  </button>
                )}
                <button onClick={() => setTwoFAStep(null)} style={{ width:'100%', padding:'12px', background:'transparent', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'14px', color:'#4a5568', fontSize:'13px', cursor:'pointer' }}>Cancel</button>
              </>
            )}

            {/* QR Scan screen */}
            {twoFAStep === 'scan' && (
              <>
                <div style={{ fontSize:'14px', fontWeight:'900', color:'#eef2f7', textAlign:'center', marginBottom:'4px' }}>📱 Scan QR Code</div>
                <div style={{ fontSize:'10px', color:'#4a5568', textAlign:'center', marginBottom:'14px', lineHeight:'1.7' }}>
                  Google Authenticator app খুলুন → + চাপুন → QR scan করুন
                </div>
                {twoFAQR && (
                  <div style={{ background:'#fff', borderRadius:'12px', padding:'12px', marginBottom:'12px', display:'flex', justifyContent:'center' }}>
                    <img src={twoFAQR} alt='TOTP QR' style={{ width:'180px', height:'180px' }} />
                  </div>
                )}
                {/* Manual key */}
                <div style={{ background:'rgba(0,229,255,0.06)', border:'1px solid rgba(0,229,255,0.2)', borderRadius:'10px', padding:'10px', marginBottom:'14px' }}>
                  <div style={{ fontSize:'9px', color:'#4a5568', fontWeight:'700', marginBottom:'3px' }}>QR কাজ না করলে — Manual Key</div>
                  <div style={{ fontSize:'10px', color:'#00e5ff', fontFamily:'monospace', wordBreak:'break-all', letterSpacing:'1px' }}>{twoFASecret}</div>
                </div>
                <button onClick={() => setTwoFAStep('verify')} style={{ width:'100%', padding:'13px', background:'linear-gradient(135deg,#00e5ff,#00ff88)', border:'none', borderRadius:'14px', color:'#050810', fontSize:'13px', fontWeight:'900', cursor:'pointer', marginBottom:'8px' }}>
                  ✅ Scanned! Verify Now →
                </button>
                <button onClick={() => setTwoFAStep(null)} style={{ width:'100%', padding:'12px', background:'transparent', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'14px', color:'#4a5568', fontSize:'13px', cursor:'pointer' }}>Cancel</button>
              </>
            )}

            {/* Verify screen */}
            {twoFAStep === 'verify' && (
              <>
                <div style={{ fontSize:'28px', textAlign:'center', marginBottom:'8px' }}>🔐</div>
                <div style={{ fontSize:'14px', fontWeight:'900', color:'#eef2f7', textAlign:'center', marginBottom:'4px' }}>Enter 6-digit Code</div>
                <div style={{ fontSize:'11px', color:'#4a5568', textAlign:'center', lineHeight:'1.7', marginBottom:'16px' }}>
                  Google Authenticator app এ Echo World এর code দেখুন
                </div>
                <input
                  value={twoFAInput} onChange={e => { setTwoFAInput(e.target.value.replace(/\D/g,'')); setTwoFAError('') }}
                  type='tel' inputMode='numeric' maxLength={6} placeholder='000000'
                  style={{ width:'100%', background:'rgba(255,255,255,0.05)', border:'1px solid ' + (twoFAError ? '#ff4560' : 'rgba(255,255,255,0.12)'), borderRadius:'14px', padding:'15px', color:'#eef2f7', fontSize:'26px', outline:'none', textAlign:'center', letterSpacing:'8px', boxSizing:'border-box', marginBottom:'8px' }}
                />
                {twoFAError && <div style={{ color:'#ff4560', fontSize:'12px', textAlign:'center', marginBottom:'8px' }}>{twoFAError}</div>}
                <button onClick={verify2FA} disabled={twoFAInput.length < 6} style={{ width:'100%', padding:'13px', background: twoFAInput.length===6 ? 'linear-gradient(135deg,#00e5ff,#00ff88)' : 'rgba(255,255,255,0.05)', border:'none', borderRadius:'14px', color: twoFAInput.length===6 ? '#050810' : '#4a5568', fontSize:'13px', fontWeight:'900', cursor: twoFAInput.length===6 ? 'pointer' : 'default', marginBottom:'8px' }}>
                  ✅ Verify & Enable 2FA
                </button>
                <button onClick={() => { setTwoFAStep('scan') }} style={{ width:'100%', padding:'12px', background:'transparent', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'14px', color:'#4a5568', fontSize:'13px', cursor:'pointer' }}>← Back to QR</button>
              </>
            )}

          </div>
        </div>
      )}

      {/* Bottom nav */}
      <div style={{ position:'fixed', bottom:0, left:0, right:0, background:'rgba(5,8,16,0.98)', borderTop:'1px solid rgba(255,255,255,0.07)', display:'flex', justifyContent:'space-around', padding:'10px 0 20px', zIndex:100 }}>
      <div onClick={() => window.location.href='/support'} style={{ fontSize:'22px', cursor:'pointer' }}>💬</div>
        {[{icon:'🏠',path:'/feed'},{icon:'🗺',path:'/map'},{icon:'📸',path:'/post'},{icon:'🏆',path:'/leaderboard'},{icon:'👤',path:'/profile'}].map(item => (
          <div key={item.path} onClick={() => window.location.href=item.path} style={{ fontSize:'22px', cursor:'pointer', color:'#4a5568' }}>{item.icon}</div>
        ))}
      </div>
    </div>
  )
    }
