'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const MINING_DURATION = 24 * 60 * 60 * 1000 // 24 hours
const MINING_REWARD   = 3   // 3 ECHO per 24h
const TICK_MS         = 1000 // update every second

// Translations
const T = {
  startMining:   { en:'Start Mining', bn:'মাইনিং শুরু করো', hi:'माइनिंग शुरू करें', ar:'ابدأ التعدين', zh:'开始挖矿', fr:'Commencer le minage', es:'Iniciar minería', ru:'Начать майнинг', pt:'Iniciar mineração', id:'Mulai Mining', tr:'Madenciliği Başlat' },
  mining:        { en:'Mining...', bn:'মাইনিং চলছে...', hi:'माइनिंग चल रही है...', ar:'جارٍ التعدين...', zh:'挖矿中...', fr:'Minage en cours...', es:'Minando...', ru:'Майнинг...', pt:'Minerando...', id:'Sedang Mining...', tr:'Madencilik Yapılıyor...' },
  miningDone:    { en:'Mining Complete!', bn:'মাইনিং সম্পন্ন!', hi:'माइनिंग पूरी हुई!', ar:'اكتمل التعدين!', zh:'挖矿完成!', fr:'Minage terminé!', es:'¡Minería completa!', ru:'Майнинг завершён!', pt:'Mineração concluída!', id:'Mining Selesai!', tr:'Madencilik Tamamlandı!' },
  postFirst:     { en:'Post first to start mining', bn:'মাইনিং শুরু করতে আগে post করো', hi:'माइनिंग शुरू करने के लिए पहले post करें', ar:'انشر أولاً لبدء التعدين', zh:'先发布帖子才能开始挖矿', fr:'Postez d\'abord pour commencer', es:'Publica primero para minar', ru:'Сначала сделайте пост', pt:'Poste primeiro para minerar', id:'Post dulu untuk mulai mining', tr:'Madencilik için önce paylaşım yap' },
  earned:        { en:'Earned', bn:'অর্জিত', hi:'अर्जित', ar:'مكتسب', zh:'已赚取', fr:'Gagné', es:'Ganado', ru:'Заработано', pt:'Ganho', id:'Diperoleh', tr:'Kazanılan' },
  timeLeft:      { en:'Time Left', bn:'সময় বাকি', hi:'समय शेष', ar:'الوقت المتبقي', zh:'剩余时间', fr:'Temps restant', es:'Tiempo restante', ru:'Осталось', pt:'Tempo restante', id:'Sisa waktu', tr:'Kalan süre' },
  claimReward:   { en:'Claim Reward', bn:'Reward নাও', hi:'पुरस्कार लें', ar:'احصل على المكافأة', zh:'领取奖励', fr:'Réclamer la récompense', es:'Reclamar recompensa', ru:'Получить награду', pt:'Reivindicar recompensa', id:'Klaim Reward', tr:'Ödülü Al' },
  perDay:        { en:'3 ECHO / 24h', bn:'৩ ECHO / ২৪ ঘণ্টা', hi:'3 ECHO / 24 घंटे', ar:'3 ECHO / 24 ساعة', zh:'每24小时3 ECHO', fr:'3 ECHO / 24h', es:'3 ECHO / 24h', ru:'3 ECHO / 24ч', pt:'3 ECHO / 24h', id:'3 ECHO / 24jam', tr:'3 ECHO / 24sa' },
  goPost:        { en:'Go Post', bn:'Post করো', hi:'Post करें', ar:'انشر الآن', zh:'去发帖', fr:'Publier', es:'Publicar', ru:'Опубликовать', pt:'Publicar', id:'Buat Post', tr:'Paylaş' },
  collecting:    { en:'Collecting...', bn:'সংগ্রহ হচ্ছে...', hi:'एकत्र हो रहा है...', ar:'جمع...', zh:'收集中...', fr:'Collecte...', es:'Recopilando...', ru:'Сбор...', pt:'Coletando...', id:'Mengumpulkan...', tr:'Toplanıyor...' },
}
const t = (key, lang) => T[key]?.[lang] || T[key]?.en || key

export default function MiningWidget({ userId, lang = 'en', onEarned }) {
  const [status,      setStatus]      = useState('loading') // loading|no_post|idle|mining|done|claiming
  const [echoToken,   setEchoToken]   = useState(null)
  const [earnedSoFar, setEarnedSoFar] = useState(0)
  const [timeLeft,    setTimeLeft]    = useState(0)
  const [postedToday, setPostedToday] = useState(false)
  const tickRef = useRef(null)

  useEffect(() => {
    if (userId) loadMiningStatus()
    return () => clearInterval(tickRef.current)
  }, [userId])

  const loadMiningStatus = async () => {
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' })

    // Post করেছে কিনা check
    const { data: posts } = await supabase.from('posts').select('id')
      .eq('user_id', userId)
      .gte('created_at', `${today}T00:00:00+06:00`)
      .limit(1)
    const hasPost = (posts || []).length > 0
    setPostedToday(hasPost)

    // Echo token & mining status
    const { data: echo } = await supabase.from('echo_tokens').select('*').eq('user_id', userId).maybeSingle()
    setEchoToken(echo)

    if (!echo?.mining_active) {
      setStatus(hasPost ? 'idle' : 'no_post')
      return
    }

    const startedAt = new Date(echo.mining_started_at).getTime()
    const elapsed   = Date.now() - startedAt
    const earned    = Math.min(MINING_REWARD, (elapsed / MINING_DURATION) * MINING_REWARD)
    setEarnedSoFar(parseFloat(earned.toFixed(6)))

    if (elapsed >= MINING_DURATION) {
      setStatus('done')
    } else {
      setStatus('mining')
      startTick(startedAt)
    }
  }

  const startTick = (startedAt) => {
    clearInterval(tickRef.current)
    tickRef.current = setInterval(() => {
      const elapsed = Date.now() - startedAt
      const earned  = Math.min(MINING_REWARD, (elapsed / MINING_DURATION) * MINING_REWARD)
      const left    = Math.max(0, MINING_DURATION - elapsed)
      setEarnedSoFar(parseFloat(earned.toFixed(6)))
      setTimeLeft(left)
      if (elapsed >= MINING_DURATION) {
        clearInterval(tickRef.current)
        setStatus('done')
      }
    }, TICK_MS)
  }

  const handleStartMining = async () => {
    if (!postedToday) return
    setStatus('mining')
    const now = new Date().toISOString()
    const { data: echo } = await supabase.from('echo_tokens').select('*').eq('user_id', userId).maybeSingle()

    await supabase.from('echo_tokens').upsert({
      user_id: userId,
      balance: echo?.balance || 0,
      total_earned: echo?.total_earned || 0,
      mining_active: true,
      mining_started_at: now,
    }, { onConflict: 'user_id' })

    setEchoToken(prev => ({ ...prev, mining_active: true, mining_started_at: now }))
    startTick(new Date(now).getTime())

    // Notification
    await supabase.from('notifications').insert({
      user_id: userId, from_user_id: null, type: 'system', read: false,
      message: '🌐 Echo World: ⛏️ Mining started! You will earn 3 ECHO in 24 hours.'
    })

    // Push notification
    try {
      await fetch('/api/push-notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, title: '⛏️ Echo World — Mining', message: 'Mining started! 3 ECHO in 24 hours.' })
      })
    } catch(e) {}
  }

  const handleClaim = async () => {
    setStatus('claiming')
    const { data: echo } = await supabase.from('echo_tokens').select('*').eq('user_id', userId).maybeSingle()
    const newBalance = parseFloat((echo?.balance || 0) + MINING_REWARD).toFixed(4)
    const newEarned  = parseFloat((echo?.total_earned || 0) + MINING_REWARD).toFixed(4)

    await supabase.from('echo_tokens').upsert({
      user_id: userId,
      balance: parseFloat(newBalance),
      total_earned: parseFloat(newEarned),
      mining_active: false,
      last_mined_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })

    await supabase.from('echo_token_transactions').insert({
      user_id: userId, amount: MINING_REWARD, type: 'mining', note: 'Mining reward — 24h complete'
    })

    // Notification
    await supabase.from('notifications').insert({
      user_id: userId, from_user_id: null, type: 'system', read: false,
      message: `🌐 Echo World: ✅ Mining complete! +${MINING_REWARD} ECHO added to your wallet.`
    })

    try {
      await fetch('/api/push-notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, title: '✅ Echo World — Mining Complete', message: `+${MINING_REWARD} ECHO added to your wallet!` })
      })
    } catch(e) {}

    if (onEarned) onEarned(parseFloat(newBalance))
    setStatus('idle')
    setEarnedSoFar(0)
    setTimeLeft(0)
    await loadMiningStatus()
  }

  const formatTime = (ms) => {
    const h = Math.floor(ms / 3600000)
    const m = Math.floor((ms % 3600000) / 60000)
    const s = Math.floor((ms % 60000) / 1000)
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
  }

  const pct = Math.min(100, (earnedSoFar / MINING_REWARD) * 100)

  if (status === 'loading') return null

  return (
    <div style={{ background:'linear-gradient(135deg,rgba(168,85,247,.08),rgba(0,229,255,.05))', border:'1px solid rgba(168,85,247,.2)', borderRadius:20, padding:20, marginBottom:14 }}>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes pulse{0%,100%{opacity:.6}50%{opacity:1}}
        @keyframes glow{0%,100%{box-shadow:0 0 10px rgba(168,85,247,.3)}50%{box-shadow:0 0 20px rgba(168,85,247,.6)}}
      `}</style>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
        <div style={{ width:42, height:42, borderRadius:14, background:'rgba(168,85,247,.15)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22,
          animation: status==='mining' ? 'spin 3s linear infinite' : 'none' }}>⛏️</div>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:14, fontWeight:800, color:'#eef2f7' }}>ECHO Mining</div>
          <div style={{ fontSize:11, color:'#4a5568' }}>{t('perDay', lang)}</div>
        </div>
        {status === 'mining' && (
          <div style={{ display:'flex', alignItems:'center', gap:6, background:'rgba(0,255,136,.1)', border:'1px solid rgba(0,255,136,.2)', borderRadius:20, padding:'4px 10px' }}>
            <div style={{ width:6, height:6, borderRadius:'50%', background:'#00ff88', animation:'pulse 1s infinite' }}/>
            <span style={{ fontSize:10, color:'#00ff88', fontWeight:700 }}>LIVE</span>
          </div>
        )}
      </div>

      {/* NO POST */}
      {status === 'no_post' && (
        <div>
          <div style={{ background:'rgba(255,165,0,.08)', border:'1px solid rgba(255,165,0,.2)', borderRadius:12, padding:'12px 14px', marginBottom:12, fontSize:12, color:'#ffa500', textAlign:'center' }}>
            ⚠️ {t('postFirst', lang)}
          </div>
          <button onClick={()=>window.location.href='/post'}
            style={{ width:'100%', padding:12, background:'linear-gradient(135deg,#ffa500,#ffca28)', border:'none', borderRadius:12, color:'#070a10', fontSize:13, fontWeight:800, cursor:'pointer' }}>
            📝 {t('goPost', lang)}
          </button>
        </div>
      )}

      {/* IDLE */}
      {status === 'idle' && (
        <div>
          <div style={{ textAlign:'center', marginBottom:12 }}>
            <div style={{ fontSize:11, color:'#4a5568' }}>{t('earned', lang)}: {echoToken?.balance?.toFixed(4) || '0'} ECHO</div>
          </div>
          <button onClick={handleStartMining}
            style={{ width:'100%', padding:14, background:'linear-gradient(135deg,#a855f7,#7c3aed)', border:'none', borderRadius:14, color:'#fff', fontSize:14, fontWeight:900, cursor:'pointer', animation:'glow 2s ease infinite' }}>
            ⛏️ {t('startMining', lang)}
          </button>
        </div>
      )}

      {/* MINING */}
      {status === 'mining' && (
        <div>
          {/* Progress */}
          <div style={{ marginBottom:12 }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
              <span style={{ fontSize:11, color:'#4a5568' }}>{t('earned', lang)}</span>
              <span style={{ fontSize:13, fontWeight:900, color:'#a855f7' }}>{earnedSoFar.toFixed(6)} ECHO</span>
            </div>
            <div style={{ height:8, background:'rgba(255,255,255,.06)', borderRadius:4, overflow:'hidden' }}>
              <div style={{ height:'100%', width:`${pct}%`, background:'linear-gradient(90deg,#a855f7,#00e5ff)', borderRadius:4, transition:'width .5s ease' }}/>
            </div>
          </div>

          {/* Timer */}
          <div style={{ background:'rgba(255,255,255,.04)', borderRadius:12, padding:'10px', textAlign:'center', marginBottom:12 }}>
            <div style={{ fontSize:11, color:'#4a5568', marginBottom:4 }}>{t('timeLeft', lang)}</div>
            <div style={{ fontSize:22, fontWeight:900, color:'#eef2f7', fontFamily:'monospace' }}>{formatTime(timeLeft)}</div>
          </div>

          <div style={{ fontSize:11, color:'#4a5568', textAlign:'center', animation:'pulse 2s infinite' }}>
            ⛏️ {t('mining', lang)}
          </div>
        </div>
      )}

      {/* DONE — claim */}
      {status === 'done' && (
        <div>
          <div style={{ textAlign:'center', marginBottom:14 }}>
            <div style={{ fontSize:40, marginBottom:6 }}>🎉</div>
            <div style={{ fontSize:16, fontWeight:900, color:'#00ff88' }}>{t('miningDone', lang)}</div>
            <div style={{ fontSize:22, fontWeight:900, color:'#a855f7', margin:'8px 0' }}>+{MINING_REWARD} ECHO</div>
          </div>
          <button onClick={handleClaim}
            style={{ width:'100%', padding:14, background:'linear-gradient(135deg,#00ff88,#00e5ff)', border:'none', borderRadius:14, color:'#070a10', fontSize:14, fontWeight:900, cursor:'pointer' }}>
            {status === 'claiming' ? t('collecting', lang) : `✅ ${t('claimReward', lang)}`}
          </button>
        </div>
      )}
    </div>
  )
    }
