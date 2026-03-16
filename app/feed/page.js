'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const fmtDur = (s) => { if(!s||isNaN(s)) return ''; const m=Math.floor(s/60),sec=Math.floor(s%60); return `${m}:${sec.toString().padStart(2,'0')}` }
const fmtCount = (n) => !n?'0':n>=1000000?(n/1000000).toFixed(1)+'M':n>=1000?(n/1000).toFixed(1)+'K':String(n)
const timeAgo = (d) => {
  if(!d) return ''
  const s=Math.floor((Date.now()-new Date(d))/1000)
  if(s<60) return 'এইমাত্র'
  if(s<3600) return Math.floor(s/60)+' মিনিট আগে'
  if(s<86400) return Math.floor(s/3600)+' ঘণ্টা আগে'
  if(s<2592000) return Math.floor(s/86400)+' দিন আগে'
  return Math.floor(s/2592000)+' মাস আগে'
}
const getName = (post) => post?.profiles?.full_name || post?.profiles?.username || 'User'

// ══════════════════════════════════════════════════════
// YOUTUBE PLAYER
// ══════════════════════════════════════════════════════
function YouTubePlayer({ post, onClose, user, liked, onLike, supported, onSupport, onNext }) {
  const videoRef     = useRef(null)
  const progressRef  = useRef(null)
  const containerRef = useRef(null)
  const hideTimer    = useRef(null)
  const tapTimer     = useRef(null)
  const lastTap      = useRef(0)
  const dragRef      = useRef(false)
  const miniRef      = useRef(null)
  const dragPos      = useRef({ x: 0, y: 0, ox: 0, oy: 0 })

  const [playing,       setPlaying]       = useState(false)
  const [currentTime,   setCurrentTime]   = useState(0)
  const [duration,      setDuration]      = useState(0)
  const [buffered,      setBuffered]      = useState(0)
  const [muted,         setMuted]         = useState(false)
  const [showControls,  setShowControls]  = useState(true)
  const [playbackRate,  setPlaybackRate]  = useState(1)
  const [showRate,      setShowRate]      = useState(false)
  const [comments,      setComments]      = useState([])
  const [commentText,   setCommentText]   = useState('')
  const [showComments,  setShowComments]  = useState(false)
  const [recommended,   setRecommended]   = useState([])
  const [isLiked,       setIsLiked]       = useState(!!(liked&&liked[post?.id]))
  const [isDisliked,    setIsDisliked]    = useState(false)
  const [likeCount,     setLikeCount]     = useState(post?.likes_count||0)
  const [isFollowing,   setIsFollowing]   = useState(!!(supported&&post?.profiles?.id&&supported[post.profiles.id]))
  const [showDesc,      setShowDesc]      = useState(false)
  const [commentLikes,  setCommentLikes]  = useState({})
  const [replyTo,       setReplyTo]       = useState(null)
  const [miniMode,      setMiniMode]      = useState(false)
  const [miniPos,       setMiniPos]       = useState({ x: 16, y: null })
  const [seekAnim,      setSeekAnim]      = useState(null)  // {dir, x}
  const [skipAmt,       setSkipAmt]       = useState(10)
  const [brightness,    setBrightness]    = useState(1)
  const [savedPos,      setSavedPos]      = useState(null)
  const [showSaved,     setShowSaved]     = useState(false)

  useEffect(() => {
    if (!post?.id) return
    // Load user coin balance
    if (user?.id) supabase.from('profiles').select('coin_balance').eq('id',user.id).single().then(({data})=>{ if(data) setUserCoinBal(data.coin_balance||0) })
    loadComments(); loadRecommended()
    supabase.from('posts').update({ views_count: (post.views_count||0)+1 }).eq('id', post.id).then(()=>{})
    // Restore saved position
    const saved = sessionStorage.getItem(`vpos_${post.id}`)
    if (saved) setSavedPos(parseFloat(saved))
    const t = setTimeout(() => {
      const v = videoRef.current; if (!v) return
      if (saved) v.currentTime = parseFloat(saved)
      v.play().then(()=>setPlaying(true)).catch(()=>{})
    }, 300)
    const ctrlTimer = setTimeout(()=>setShowControls(false), 3000)
    return () => { clearTimeout(t); clearTimeout(ctrlTimer); clearTimeout(hideTimer.current); clearTimeout(tapTimer.current) }
  }, [post?.id])

  const loadComments = async () => {
    if (!post?.id) return
    const { data } = await supabase.from('comments').select('*, profiles(id,username,full_name,avatar_url)').eq('post_id', post.id).order('created_at', { ascending: false }).limit(30)
    setComments(data||[])
  }
  const loadRecommended = async () => {
    if (!post?.id) return
    const { data } = await supabase.from('posts').select('*, profiles(username,full_name,avatar_url)').eq('media_type','video').neq('id', post.id).order('likes_count', { ascending: false }).limit(10)
    setRecommended(data||[])
  }

  const resetHide = useCallback(() => {
    setShowControls(true)
    clearTimeout(hideTimer.current)
    hideTimer.current = setTimeout(() => setShowControls(false), 3500)
  }, [])

  // ── Touch: single tap = show/hide controls, double tap = seek ──
  const handleVideoTouch = (e) => {
    if (miniMode) return
    const now = Date.now()
    const v = videoRef.current; if (!v) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.changedTouches[0].clientX - rect.left
    const side = x < rect.width * 0.35 ? 'left' : x > rect.width * 0.65 ? 'right' : 'center'

    if (now - lastTap.current < 300) {
      // Double tap
      clearTimeout(tapTimer.current)
      const amt = 10
      if (side === 'left')  { v.currentTime = Math.max(0, v.currentTime - amt); setSeekAnim({ dir:'left',  n: amt }); setTimeout(()=>setSeekAnim(null), 700) }
      if (side === 'right') { v.currentTime = Math.min(duration, v.currentTime + amt); setSeekAnim({ dir:'right', n: amt }); setTimeout(()=>setSeekAnim(null), 700) }
      if (side === 'center') { if(v.paused){v.play();setPlaying(true)}else{v.pause();setPlaying(false)} }
      lastTap.current = 0
    } else {
      lastTap.current = now
      tapTimer.current = setTimeout(() => {
        // Single tap = show/hide controls
        setShowControls(p => { clearTimeout(hideTimer.current); if(!p) hideTimer.current=setTimeout(()=>setShowControls(false),3500); return !p })
      }, 260)
    }
  }

  const seek = (e) => {
    e.stopPropagation()
    const v = videoRef.current; const bar = progressRef.current; if (!v||!bar||!duration) return
    const rect = bar.getBoundingClientRect()
    const x = (e.touches?e.touches[0].clientX:e.clientX) - rect.left
    v.currentTime = Math.max(0, Math.min(1, x/rect.width)) * duration
    resetHide()
  }
  const skip = (sec) => {
    const v = videoRef.current; if (!v) return
    v.currentTime = Math.max(0, Math.min(duration, v.currentTime + sec))
    setSeekAnim({ dir: sec>0?'right':'left', n: Math.abs(sec) }); setTimeout(()=>setSeekAnim(null), 700)
    resetHide()
  }

  // ── Mini player drag ──
  const startDrag = (e) => {
    dragRef.current = true
    const t = e.touches?e.touches[0]:e
    const el = miniRef.current; if (!el) return
    const rect = el.getBoundingClientRect()
    dragPos.current = { ox: t.clientX - rect.left, oy: t.clientY - rect.top }
  }
  const onDrag = (e) => {
    if (!dragRef.current) return
    const t = e.touches?e.touches[0]:e
    const x = Math.max(0, Math.min(window.innerWidth - 200, t.clientX - dragPos.current.ox))
    const y = Math.max(0, Math.min(window.innerHeight - 130, t.clientY - dragPos.current.oy))
    setMiniPos({ x, y })
  }
  const endDrag = () => { dragRef.current = false }

  const toggleLike = () => {
    if (!user||!post?.id) return
    if (isLiked) { supabase.from('likes').delete().eq('post_id',post.id).eq('user_id',user.id).then(()=>{}); setIsLiked(false); setIsDisliked(false); setLikeCount(p=>Math.max(0,p-1)) }
    else { supabase.from('likes').insert({post_id:post.id,user_id:user.id}).then(()=>{}); setIsLiked(true); setIsDisliked(false); setLikeCount(p=>p+1) }
    onLike&&onLike(post)
  }
  const toggleDislike = () => {
    if (!user||!post?.id) return
    if (isLiked) { supabase.from('likes').delete().eq('post_id',post.id).eq('user_id',user.id).then(()=>{}); setIsLiked(false); setLikeCount(p=>Math.max(0,p-1)) }
    setIsDisliked(p => !p)
  }
  const toggleFollow = () => {
    if (!user||!post?.profiles?.id) return
    if (isFollowing) { supabase.from('followers').delete().eq('follower_id',user.id).eq('following_id',post.profiles.id).then(()=>{}); setIsFollowing(false) }
    else { supabase.from('followers').insert({follower_id:user.id,following_id:post.profiles.id}).then(()=>{}); setIsFollowing(true) }
    onSupport&&onSupport(post.profiles.id)
  }
  const submitComment = async () => {
    if (!commentText.trim()||!user||!post?.id) return
    const text = (replyTo?`@${replyTo} `:'')+commentText.trim()
    setCommentText(''); setReplyTo(null)
    await supabase.from('comments').insert({post_id:post.id,user_id:user.id,content:text})
    loadComments()
  }
  const saveProgress = () => {
    const v = videoRef.current; if (!v) return
    sessionStorage.setItem(`vpos_${post.id}`, v.currentTime)
    setShowSaved(true); setTimeout(()=>setShowSaved(false), 2000)
  }

  const pct = duration ? (currentTime/duration*100) : 0
  if (!post?.id) return null

  // ── MINI PLAYER ──
  if (miniMode) {
    const miniY = miniPos.y !== null ? miniPos.y : window.innerHeight - 140
    return (
      <div ref={miniRef}
        style={{ position:'fixed', left: miniPos.x, top: miniY, width:200, height:120, borderRadius:12, overflow:'hidden', zIndex:2000, boxShadow:'0 8px 32px rgba(0,0,0,.6)', cursor:'grab', touchAction:'none' }}
        onMouseDown={startDrag} onMouseMove={onDrag} onMouseUp={endDrag}
        onTouchStart={startDrag} onTouchMove={onDrag} onTouchEnd={endDrag}>
        <video ref={videoRef} src={post.media_url} style={{ width:'100%', height:'100%', objectFit:'cover' }}
          onTimeUpdate={e=>setCurrentTime(e.target.currentTime||0)}
          onLoadedMetadata={e=>setDuration(e.target.duration||0)}
          onPlay={()=>setPlaying(true)} onPause={()=>setPlaying(false)} playsInline/>
        <div style={{ position:'absolute', inset:0, background:'linear-gradient(transparent 40%,rgba(0,0,0,.8))' }}/>
        <div style={{ position:'absolute', bottom:4, left:8, right:8, display:'flex', alignItems:'center', gap:6 }}>
          <button onClick={()=>{ const v=videoRef.current; if(v){ if(v.paused){v.play();setPlaying(true)}else{v.pause();setPlaying(false)} } }} style={{ background:'none', border:'none', color:'#fff', fontSize:16, cursor:'pointer', padding:0 }}>{playing?'⏸':'▶'}</button>
          <div style={{ flex:1, height:3, background:'rgba(255,255,255,.3)', borderRadius:2 }}>
            <div style={{ height:'100%', width:`${pct}%`, background:'#ff0000', borderRadius:2 }}/>
          </div>
          <button onClick={()=>setMiniMode(false)} style={{ background:'rgba(0,0,0,.5)', border:'none', color:'#fff', fontSize:11, cursor:'pointer', borderRadius:6, padding:'3px 7px' }}>⬆ Back</button>
          <button onClick={()=>{ saveProgress(); setMiniMode(false); onClose() }} style={{ background:'rgba(255,69,96,.7)', border:'none', color:'#fff', fontSize:11, cursor:'pointer', borderRadius:6, padding:'3px 7px' }}>✕</button>
        </div>
      </div>
    )
  }

  // ── FULL PLAYER ──
  return (
    <div style={{ position:'fixed', inset:0, background:'#000', zIndex:500, display:'flex', flexDirection:'column', overflowY:'auto' }}>
      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes seekPulse{0%{opacity:1;transform:translateY(-50%) scale(1)}100%{opacity:0;transform:translateY(-50%) scale(1.6)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes savedPop{0%{opacity:0;transform:translateX(-50%) scale(.8)}50%{opacity:1;transform:translateX(-50%) scale(1.05)}100%{opacity:0;transform:translateX(-50%) scale(.9)}}
      `}</style>

      {/* ── VIDEO AREA ── */}
      <div ref={containerRef} style={{ position:'sticky', top:0, zIndex:20, background:'#000', userSelect:'none' }}>
        <video ref={videoRef} src={post.media_url||''} poster={post.image_url||''}
          style={{ width:'100%', display:'block', aspectRatio:'16/9', objectFit:'cover', maxHeight:'56.25vw', filter:`brightness(${brightness})` }}
          onTimeUpdate={e=>{setCurrentTime(e.target.currentTime||0); if(e.target.buffered?.length>0) setBuffered((e.target.buffered.end(e.target.buffered.length-1)/e.target.duration*100)||0)}}
          onLoadedMetadata={e=>setDuration(e.target.duration||0)}
          onPlay={()=>setPlaying(true)} onPause={()=>setPlaying(false)}
          playsInline preload="metadata"/>

        {/* Touch zones overlay */}
        <div style={{ position:'absolute', inset:0, touchAction:'none' }} onTouchEnd={handleVideoTouch}/>

        {/* Seek animations */}
        {seekAnim && (
          <>
            {seekAnim.dir==='left' && (
              <div style={{ position:'absolute', left:'8%', top:'50%', transform:'translateY(-50%)', pointerEvents:'none', textAlign:'center', animation:'seekPulse .7s ease forwards' }}>
                <div style={{ fontSize:36 }}>⏪</div>
                <div style={{ fontSize:13, color:'#fff', fontWeight:800, background:'rgba(0,0,0,.5)', borderRadius:8, padding:'2px 10px', marginTop:4 }}>-{seekAnim.n}s</div>
              </div>
            )}
            {seekAnim.dir==='right' && (
              <div style={{ position:'absolute', right:'8%', top:'50%', transform:'translateY(-50%)', pointerEvents:'none', textAlign:'center', animation:'seekPulse .7s ease forwards' }}>
                <div style={{ fontSize:36 }}>⏩</div>
                <div style={{ fontSize:13, color:'#fff', fontWeight:800, background:'rgba(0,0,0,.5)', borderRadius:8, padding:'2px 10px', marginTop:4 }}>+{seekAnim.n}s</div>
              </div>
            )}
          </>
        )}

        {/* Play/Pause center indicator */}
        {!playing && showControls && (
          <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', width:64, height:64, borderRadius:'50%', background:'rgba(0,0,0,.65)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:28, pointerEvents:'none' }}>▶</div>
        )}

        {/* Saved toast */}
        {showSaved && <div style={{ position:'absolute', bottom:60, left:'50%', transform:'translateX(-50%)', background:'rgba(0,255,136,.9)', color:'#070a12', fontWeight:800, fontSize:12, borderRadius:10, padding:'6px 16px', whiteSpace:'nowrap', animation:'savedPop 2s ease forwards', zIndex:30, pointerEvents:'none' }}>✅ Progress saved!</div>}

        {/* Controls overlay */}
        <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', justifyContent:'space-between', padding:'0', opacity: showControls?1:0, transition:'opacity .3s', pointerEvents: showControls?'auto':'none' }} onClick={e=>e.stopPropagation()}>

          {/* Top bar */}
          <div style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 10px', background:'linear-gradient(rgba(0,0,0,.7),transparent)' }}>
            <button onClick={onClose} style={{ background:'none', border:'none', color:'#fff', fontSize:22, cursor:'pointer', padding:'2px 6px' }}>←</button>
            <div style={{ flex:1, fontSize:12, color:'rgba(255,255,255,.85)', fontWeight:700, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{post.content||'Video'}</div>
            <button onClick={()=>setMiniMode(true)} title="Mini Player" style={{ background:'rgba(255,255,255,.15)', border:'none', color:'#fff', fontSize:11, fontWeight:800, borderRadius:6, padding:'4px 9px', cursor:'pointer', flexShrink:0 }}>⊡ Mini</button>
          </div>

          {/* Center row — skip buttons shown on controls visible */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 14px' }}>
            <button onClick={()=>skip(-10)} style={{ background:'rgba(0,0,0,.45)', border:'none', color:'#fff', fontSize:11, fontWeight:800, borderRadius:8, padding:'8px 12px', cursor:'pointer' }}>⏪ 10s</button>
            <button onClick={()=>{ const v=videoRef.current; if(v){if(v.paused){v.play();setPlaying(true)}else{v.pause();setPlaying(false)}} }} style={{ background:'rgba(0,0,0,.5)', border:'none', color:'#fff', fontSize:28, borderRadius:'50%', width:56, height:56, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>{playing?'⏸':'▶'}</button>
            <button onClick={()=>skip(10)} style={{ background:'rgba(0,0,0,.45)', border:'none', color:'#fff', fontSize:11, fontWeight:800, borderRadius:8, padding:'8px 12px', cursor:'pointer' }}>10s ⏩</button>
          </div>

          {/* Bottom controls */}
          <div style={{ background:'linear-gradient(transparent,rgba(0,0,0,.9))', padding:'4px 10px 8px' }}>
            {/* Progress bar */}
            <div ref={progressRef} style={{ height:22, display:'flex', alignItems:'center', cursor:'pointer', marginBottom:2 }} onClick={seek} onTouchEnd={seek}>
              <div style={{ position:'relative', width:'100%', height:4, background:'rgba(255,255,255,.2)', borderRadius:2 }}>
                <div style={{ position:'absolute', left:0, top:0, height:'100%', width:`${buffered}%`, background:'rgba(255,255,255,.3)', borderRadius:2 }}/>
                <div style={{ position:'absolute', left:0, top:0, height:'100%', width:`${pct}%`, background:'#ff0000', borderRadius:2 }}/>
                <div style={{ position:'absolute', top:'50%', left:`${pct}%`, transform:'translate(-50%,-50%)', width:14, height:14, borderRadius:'50%', background:'#ff0000', boxShadow:'0 0 0 3px rgba(255,0,0,.3)' }}/>
              </div>
            </div>
            {/* Bottom row */}
            <div style={{ display:'flex', alignItems:'center', gap:4 }}>
              <button onClick={()=>{setMuted(p=>!p);if(videoRef.current)videoRef.current.muted=!muted}} style={{ background:'none', border:'none', color:'#fff', fontSize:17, cursor:'pointer' }}>{muted?'🔇':'🔊'}</button>
              <span style={{ color:'rgba(255,255,255,.8)', fontSize:11, fontVariantNumeric:'tabular-nums' }}>{fmtDur(currentTime)}</span>
              <span style={{ color:'rgba(255,255,255,.4)', fontSize:10 }}>/</span>
              <span style={{ color:'rgba(255,255,255,.5)', fontSize:11 }}>{fmtDur(duration)}</span>
              <div style={{ flex:1 }}/>
              {/* Brightness */}
              <button onClick={()=>setBrightness(p=>p<=0.5?1:p-0.25)} style={{ background:'rgba(255,255,255,.12)', border:'none', color:'#fff', fontSize:10, fontWeight:700, borderRadius:4, padding:'3px 6px', cursor:'pointer' }}>☀ {Math.round(brightness*100)}%</button>
              {/* Speed */}
              <div style={{ position:'relative' }}>
                <button onClick={e=>{e.stopPropagation();setShowRate(p=>!p)}} style={{ background:'rgba(255,255,255,.15)', border:'none', color:'#fff', fontSize:10, fontWeight:800, borderRadius:4, padding:'3px 7px', cursor:'pointer' }}>{playbackRate}x</button>
                {showRate && <div style={{ position:'absolute', bottom:28, right:0, background:'#1a1f2e', borderRadius:8, border:'1px solid rgba(255,255,255,.12)', zIndex:30, overflow:'hidden' }}>
                  {[0.25,0.5,0.75,1,1.25,1.5,1.75,2].map(r=>(
                    <div key={r} onClick={e=>{e.stopPropagation();if(videoRef.current)videoRef.current.playbackRate=r;setPlaybackRate(r);setShowRate(false)}} style={{ padding:'9px 16px', fontSize:12, color:playbackRate===r?'#ff4560':'#eef2f7', cursor:'pointer', whiteSpace:'nowrap', background:playbackRate===r?'rgba(255,69,96,.1)':'transparent' }}>{playbackRate===r?'● ':''}{r}x</div>
                  ))}
                </div>}
              </div>
              {/* Save progress */}
              <button onClick={saveProgress} style={{ background:'rgba(0,229,255,.15)', border:'none', color:'#00e5ff', fontSize:11, fontWeight:700, borderRadius:4, padding:'3px 7px', cursor:'pointer' }}>💾</button>
              {/* Fullscreen */}
              <button onClick={e=>{e.stopPropagation();if(!document.fullscreenElement)containerRef.current?.requestFullscreen?.();else document.exitFullscreen?.()}} style={{ background:'none', border:'none', color:'#fff', fontSize:17, cursor:'pointer' }}>⛶</button>
            </div>
          </div>
        </div>
      </div>

      {/* Content below video */}
      <div style={{ flex:1, padding:'12px 14px', animation:'fadeUp .3s ease' }}>
        {/* Title & meta */}
        <div style={{ marginBottom:10 }}>
          <div style={{ fontSize:15, fontWeight:800, color:'#eef2f7', lineHeight:1.45, marginBottom:4 }}>{post.content||'Video'}</div>
          <div style={{ fontSize:11, color:'#4a5568' }}>👁 {fmtCount(post.views_count||0)} · {timeAgo(post.created_at)}</div>
        </div>

        {/* Actions row */}
        <div style={{ display:'flex', gap:6, marginBottom:14, overflowX:'auto', paddingBottom:2 }}>
          {/* Like */}
          <button onClick={toggleLike} style={{ display:'flex', alignItems:'center', gap:5, padding:'8px 14px', borderRadius:24, border:'none', background: isLiked?'rgba(255,69,96,.2)':'rgba(255,255,255,.07)', cursor:'pointer', color: isLiked?'#ff4560':'#eef2f7', fontSize:13, fontWeight:700, flexShrink:0 }}>
            {isLiked?'❤️':'🤍'} {fmtCount(likeCount)}
          </button>
          {/* Dislike */}
          <button onClick={toggleDislike} style={{ display:'flex', alignItems:'center', gap:5, padding:'8px 14px', borderRadius:24, border:'none', background: isDisliked?'rgba(100,116,139,.25)':'rgba(255,255,255,.07)', cursor:'pointer', color: isDisliked?'#94a3b8':'#eef2f7', fontSize:13, fontWeight:700, flexShrink:0 }}>
            {isDisliked?'👎':'👎🏻'}
          </button>
          {/* Comments */}
          <button onClick={()=>setShowComments(p=>!p)} style={{ display:'flex', alignItems:'center', gap:5, padding:'8px 14px', borderRadius:24, border:'none', background: showComments?'rgba(0,229,255,.15)':'rgba(255,255,255,.07)', cursor:'pointer', color: showComments?'#00e5ff':'#eef2f7', fontSize:13, fontWeight:700, flexShrink:0 }}>
            💬 {fmtCount(comments.length)}
          </button>
          {/* Share */}
          <button onClick={()=>{ try{navigator.share({title:post.content||'',url:`${window.location.origin}/feed?v=${post.id}`})}catch(e){navigator.clipboard?.writeText(`${window.location.origin}/feed?v=${post.id}`)} }} style={{ display:'flex', alignItems:'center', gap:5, padding:'8px 14px', borderRadius:24, border:'none', background:'rgba(255,255,255,.07)', cursor:'pointer', color:'#eef2f7', fontSize:13, fontWeight:700, flexShrink:0 }}>
            ⬆️ Share
          </button>
          {/* Save */}
          <button onClick={saveProgress} style={{ display:'flex', alignItems:'center', gap:5, padding:'8px 14px', borderRadius:24, border:'none', background:'rgba(0,229,255,.08)', cursor:'pointer', color:'#00e5ff', fontSize:13, fontWeight:700, flexShrink:0 }}>
            💾 Save
          </button>
          {/* Download */}
          <a href={post.media_url} download style={{ display:'flex', alignItems:'center', gap:5, padding:'8px 14px', borderRadius:24, border:'none', background:'rgba(255,255,255,.07)', cursor:'pointer', color:'#eef2f7', fontSize:13, fontWeight:700, textDecoration:'none', flexShrink:0 }}>
            ⬇️
          </a>
        </div>

        {/* Channel card */}
        <div style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 14px', background:'#111826', borderRadius:14, marginBottom:14, border:'1px solid rgba(255,255,255,.06)' }}>
          <div style={{ width:42, height:42, borderRadius:'50%', background:'linear-gradient(135deg,#00e5ff,#00ff88)', overflow:'hidden', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, fontWeight:800, color:'#070a12' }}>
            {post.profiles?.avatar_url?<img src={post.profiles.avatar_url} style={{width:'100%',height:'100%',objectFit:'cover'}} onError={e=>e.target.style.display='none'}/>:(post.profiles?.full_name||post.profiles?.username||'U')[0].toUpperCase()}
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:14, fontWeight:800, color:'#eef2f7' }}>{post.profiles?.full_name||post.profiles?.username}</div>
            <div style={{ fontSize:11, color:'#4a5568' }}>@{post.profiles?.username}</div>
          </div>
          <button onClick={toggleFollow} style={{ padding:'8px 18px', borderRadius:20, border: isFollowing?'1px solid rgba(0,229,255,.3)':'none', background: isFollowing?'rgba(0,229,255,.08)':'linear-gradient(135deg,#ff4560,#ff6b35)', color: isFollowing?'#00e5ff':'#fff', fontSize:12, fontWeight:800, cursor:'pointer' }}>
            {isFollowing?'✓ Following':'+ Follow'}
          </button>
        </div>

        {/* Description */}
        {post.description && (
          <div style={{ background:'rgba(255,255,255,.04)', borderRadius:12, padding:'12px 14px', marginBottom:14, border:'1px solid rgba(255,255,255,.06)' }}>
            <div style={{ fontSize:13, color:'#b0b8c8', lineHeight:1.6, display: showDesc?'block':'-webkit-box', WebkitLineClamp:3, WebkitBoxOrient:'vertical', overflow: showDesc?'visible':'hidden' }}>{post.description}</div>
            {post.description.length>120&&<button onClick={()=>setShowDesc(p=>!p)} style={{ background:'none', border:'none', color:'#00e5ff', fontSize:12, cursor:'pointer', marginTop:4, padding:0 }}>{showDesc?'▲ কম দেখাও':'▼ আরো দেখাও'}</button>}
          </div>
        )}

        {/* Comments */}
        {showComments && (
          <div style={{ animation:'fadeUp .2s ease' }}>
            <div style={{ fontSize:13, fontWeight:800, color:'#eef2f7', marginBottom:10 }}>💬 মন্তব্য ({comments.length})</div>
            <div style={{ display:'flex', gap:8, marginBottom:14 }}>
              <input value={commentText} onChange={e=>setCommentText(e.target.value)} onKeyDown={e=>e.key==='Enter'&&submitComment()}
                placeholder={replyTo?`@${replyTo} কে reply করছ...`:'মন্তব্য লেখো...'}
                style={{ flex:1, background:'rgba(255,255,255,.07)', border:'1px solid rgba(255,255,255,.1)', borderRadius:22, padding:'10px 16px', color:'#eef2f7', fontSize:13, outline:'none' }}/>
              {replyTo&&<button onClick={()=>setReplyTo(null)} style={{ background:'rgba(255,69,96,.1)', border:'1px solid rgba(255,69,96,.2)', borderRadius:8, padding:'0 10px', color:'#ff4560', fontSize:12, cursor:'pointer' }}>✕</button>}
              <button onClick={submitComment} disabled={!commentText.trim()} style={{ width:40, height:40, borderRadius:'50%', background: commentText.trim()?'linear-gradient(135deg,#00e5ff,#00ff88)':'rgba(255,255,255,.07)', border:'none', cursor: commentText.trim()?'pointer':'default', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, flexShrink:0 }}>➤</button>
            </div>
            {comments.map((cm,i)=>(
              <div key={cm.id||i} style={{ display:'flex', gap:10, marginBottom:12 }}>
                <div style={{ width:34, height:34, borderRadius:'50%', background:'linear-gradient(135deg,#00e5ff,#00ff88)', flexShrink:0, overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:800, color:'#070a12' }}>
                  {cm.profiles?.avatar_url?<img src={cm.profiles.avatar_url} style={{width:'100%',height:'100%',objectFit:'cover'}} onError={e=>e.target.style.display='none'}/>:(cm.profiles?.full_name||cm.profiles?.username||'U')[0].toUpperCase()}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ display:'flex', gap:6, alignItems:'baseline' }}>
                    <span style={{ fontSize:12, fontWeight:700, color:'#00e5ff' }}>{cm.profiles?.username}</span>
                    <span style={{ fontSize:10, color:'#4a5568' }}>{timeAgo(cm.created_at)}</span>
                  </div>
                  <div style={{ fontSize:13, color:'#c0c8d8', lineHeight:1.5, marginTop:2 }}>{cm.content}</div>
                  <div style={{ display:'flex', gap:12, marginTop:5 }}>
                    <button onClick={()=>setCommentLikes(p=>({...p,[cm.id]:!p[cm.id]}))} style={{ background:'none', border:'none', color: commentLikes[cm.id]?'#ff4560':'#4a5568', fontSize:12, cursor:'pointer', padding:0 }}>
                      {commentLikes[cm.id]?'❤️':'🤍'} {cm.likes_count||0}
                    </button>
                    <button onClick={()=>setReplyTo(cm.profiles?.username)} style={{ background:'none', border:'none', color:'#4a5568', fontSize:11, cursor:'pointer', padding:0 }}>↩ Reply</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Recommended */}
        {recommended.length>0&&(
          <div style={{ marginTop:16 }}>
            <div style={{ fontSize:13, fontWeight:800, color:'#eef2f7', marginBottom:10 }}>📺 আরো দেখো</div>
            {recommended.map(rec=>(
              <div key={rec.id} onClick={()=>onNext&&onNext(rec)} style={{ display:'flex', gap:10, marginBottom:12, cursor:'pointer' }}>
                <div style={{ width:120, height:68, borderRadius:8, overflow:'hidden', flexShrink:0, background:'#111', position:'relative' }}>
                  <video src={rec.media_url} style={{ width:'100%', height:'100%', objectFit:'cover' }} muted playsInline preload="metadata"/>
                  <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,.3)' }}>
                    <span style={{ fontSize:20 }}>▶</span>
                  </div>
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:12, fontWeight:700, color:'#eef2f7', lineHeight:1.45, overflow:'hidden', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' }}>{rec.content||'Video'}</div>
                  <div style={{ fontSize:11, color:'#4a5568', marginTop:3 }}>{rec.profiles?.username} · {fmtCount(rec.views_count||0)} views</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function ShortViewer({ post, allPosts, currentIdx, totalCount, onClose, onNext, onPrev, user, isLiked, likeCount, isSupported, onLike, onSupport }) {
  const videoRef = useRef(null)
  const startY = useRef(0)
  const [playing, setPlaying] = useState(false)
  const [muted, setMuted] = useState(false)
  const [progress, setProgress] = useState(0)
  const [showHeart, setShowHeart] = useState(false)
  const [showMore, setShowMore] = useState(false)
  const [showComments, setShowComments] = useState(false)
  const [showReport, setShowReport] = useState(false)
  const [showSpeed, setShowSpeed] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [saved, setSaved] = useState(false)
  const [reported, setReported] = useState(false)
  const [comments, setComments] = useState([])
  const [commentText, setCommentText] = useState('')
  const [replyTo, setReplyTo] = useState(null)
  const [commentLikes, setCommentLikes] = useState({})
  const [showCaption, setShowCaption] = useState(false)
  const [slideAnim, setSlideAnim] = useState(null)
  const [localLiked, setLocalLiked] = useState(isLiked)
  const [localLikeCount, setLocalLikeCount] = useState(likeCount||0)
  const [showRemix, setShowRemix] = useState(false)
  const [remixCaption, setRemixCaption] = useState('')
  const [remixPosting, setRemixPosting] = useState(false)
  const [remixDone, setRemixDone] = useState(false)
  const [mutedUsers, setMutedUsers] = useState({})
  const [notInterested, setNotInterested] = useState({})
  const [loopOff, setLoopOff] = useState(false)
  const [translated, setTranslated] = useState(null)
  const [translating, setTranslating] = useState(false)
  const [showGift, setShowGift] = useState(false)
  const [giftSent, setGiftSent] = useState(false)
  const [userCoinBal, setUserCoinBal] = useState(0)
  const [giftLoading, setGiftLoading] = useState(false)
  const [userName, setUserName] = useState('')

  useEffect(() => {
    // Load coin balance when gift modal might be used
    if (user?.id) {
      supabase.from('profiles').select('coin_balance, username, full_name').eq('id', user.id).single()
        .then(({ data }) => {
          if (data) {
            setUserCoinBal(data.coin_balance || 0)
            setUserName(data.full_name || data.username || 'User')
          }
        })
    }
  }, [user?.id])

  useEffect(() => {
    setLocalLiked(isLiked)
    setLocalLikeCount(likeCount||0)
  }, [post?.id])

  useEffect(() => {
    if(!post?.id) return
    const t = setTimeout(()=>{ const v=videoRef.current; if(v){ v.currentTime=0; v.play().then(()=>setPlaying(true)).catch(()=>setPlaying(false)) } }, 150)
    loadComments()
    return ()=>clearTimeout(t)
  }, [post?.id])

  const loadComments = async () => {
    if(!post?.id) return
    const {data} = await supabase.from('comments').select('*, profiles(id,username,full_name,avatar_url)').eq('post_id',post.id).order('created_at',{ascending:false}).limit(20)
    setComments(data||[])
  }
  const submitComment = async () => {
    if(!commentText.trim()||!user||!post?.id) return
    const prefix=replyTo?`@${replyTo} `:''
    const text=prefix+commentText.trim(); setCommentText(''); setReplyTo(null)
    await supabase.from('comments').insert({post_id:post.id,user_id:user.id,content:text})
    loadComments()
  }
  const handleSwipe = (e) => {
    try {
      const diff=startY.current-e.changedTouches[0].clientY
      if(Math.abs(diff)<40) return
      if(diff>0&&currentIdx<totalCount-1){ setSlideAnim('up'); setTimeout(()=>{setSlideAnim(null);onNext()},300) }
      else if(diff<0&&currentIdx>0){ setSlideAnim('down'); setTimeout(()=>{setSlideAnim(null);onPrev()},300) }
    }catch(err){}
  }
  const handleDoubleTap = () => {
    if(!user||!post?.id) return
    if(!localLiked){ supabase.from('likes').insert({post_id:post.id,user_id:user.id}).then(()=>{}); setLocalLiked(true); setLocalLikeCount(p=>p+1); onLike&&onLike(post,true) }
    setShowHeart(true); setTimeout(()=>setShowHeart(false),900)
  }
  const toggleLike = () => {
    if(!user||!post?.id) return
    if(localLiked){ supabase.from('likes').delete().eq('post_id',post.id).eq('user_id',user.id).then(()=>{}); setLocalLiked(false); setLocalLikeCount(p=>Math.max(0,p-1)); onLike&&onLike(post,false) }
    else { supabase.from('likes').insert({post_id:post.id,user_id:user.id}).then(()=>{}); setLocalLiked(true); setLocalLikeCount(p=>p+1); onLike&&onLike(post,true) }
  }
  const changeSpeed = (s) => { try{if(videoRef.current)videoRef.current.playbackRate=s}catch(e){}; setSpeed(s); setShowSpeed(false) }

  if(!post?.id) return null
  const pName = post.profiles?.full_name || post.profiles?.username || 'User'

  const slideStyle = slideAnim==='up'
    ? {animation:'slideOutUp .3s ease forwards'}
    : slideAnim==='down'
    ? {animation:'slideOutDown .3s ease forwards'}
    : {}

  return (
    <div style={{position:'fixed',inset:0,background:'#000',zIndex:500,overflow:'hidden'}}
      onTouchStart={e=>{try{startY.current=e.touches[0].clientY}catch(er){}}}
      onTouchEnd={handleSwipe}>
      <style>{`
        @keyframes slideOutUp{from{transform:translateY(0)}to{transform:translateY(-100%)}}
        @keyframes slideOutDown{from{transform:translateY(0)}to{transform:translateY(100%)}}
        @keyframes heartPop{0%{transform:translate(-50%,-50%) scale(0);opacity:1}60%{transform:translate(-50%,-50%) scale(1.5);opacity:1}100%{transform:translate(-50%,-50%) scale(1);opacity:0}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}
      `}</style>

      {/* Video */}
      <div style={{position:'absolute',inset:0,...slideStyle}}>
        <video ref={videoRef} src={post.media_url||''}
          style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover'}}
          loop muted={muted} playsInline
          onTimeUpdate={e=>{try{const d=e.target.duration;if(d>0)setProgress(e.target.currentTime/d*100)}catch(er){}}}
          onClick={()=>{try{const v=videoRef.current;if(!v)return;if(v.paused){v.play();setPlaying(true)}else{v.pause();setPlaying(false)}}catch(er){}}}
          onDoubleClick={handleDoubleTap}
          onError={()=>setPlaying(false)}/>
      </div>

      {/* Progress */}
      <div style={{position:'absolute',top:0,left:0,right:0,height:'2px',background:'rgba(255,255,255,.2)',zIndex:10}}>
        <div style={{height:'100%',width:`${Math.min(100,progress||0)}%`,background:'#fff',transition:'width .1s'}}/>
      </div>

      {/* Top bar */}
      <div style={{position:'absolute',top:0,left:0,right:0,padding:'14px 16px',display:'flex',alignItems:'center',gap:'12px',background:'linear-gradient(rgba(0,0,0,.55),transparent)',zIndex:20}}>
        <button onClick={onClose} style={{background:'none',border:'none',color:'#fff',fontSize:'22px',cursor:'pointer',padding:'4px'}}>←</button>
        <div style={{flex:1,textAlign:'center',fontSize:'15px',fontWeight:'900',color:'#fff',letterSpacing:'2px'}}>ECHO</div>
        <button onClick={()=>setMuted(p=>!p)} style={{background:'none',border:'none',color:'#fff',fontSize:'20px',cursor:'pointer',padding:'4px'}}>{muted?'🔇':'🔊'}</button>
      </div>

      {!playing&&<div style={{position:'absolute',top:'50%',left:'50%',transform:'translate(-50%,-50%)',fontSize:'56px',opacity:.75,pointerEvents:'none',zIndex:15}}>⏸</div>}
      {showHeart&&<div style={{position:'absolute',top:'38%',left:'50%',fontSize:'88px',animation:'heartPop .9s ease forwards',pointerEvents:'none',zIndex:25}}>❤️</div>}
      {reported&&<div style={{position:'absolute',bottom:'130px',left:'50%',transform:'translateX(-50%)',background:'rgba(0,0,0,.85)',borderRadius:'12px',padding:'10px 20px',color:'#fff',fontSize:'13px',fontWeight:'700',zIndex:50,whiteSpace:'nowrap',zIndex:60}}>✅ রিপোর্ট করা হয়েছে</div>}

      {/* Right actions */}
      <div style={{position:'absolute',right:'12px',bottom:'130px',display:'flex',flexDirection:'column',gap:'18px',alignItems:'center',zIndex:20}}>
        <div style={{position:'relative',marginBottom:'2px'}}>
          <div onClick={()=>post.profiles?.id&&(window.location.href=`/user/${post.profiles.id}`)} style={{width:'48px',height:'48px',borderRadius:'50%',overflow:'hidden',border:'2px solid #fff',cursor:'pointer',background:'linear-gradient(135deg,#00e5ff,#00ff88)',display:'flex',alignItems:'center',justifyContent:'center'}}>
            {post.profiles?.avatar_url?<img src={post.profiles.avatar_url} style={{width:'100%',height:'100%',objectFit:'cover'}} onError={e=>e.target.style.display='none'}/>:<span style={{fontSize:'18px',fontWeight:'800',color:'#070a12'}}>{(pName[0]||'U').toUpperCase()}</span>}
          </div>
          {user?.id!==post.profiles?.id&&!isSupported&&<div onClick={()=>onSupport&&onSupport(post.profiles?.id)} style={{position:'absolute',bottom:'-8px',left:'50%',transform:'translateX(-50%)',width:'20px',height:'20px',borderRadius:'50%',background:'#ff4560',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',fontSize:'13px',fontWeight:'900',color:'#fff'}}>+</div>}
        </div>
        <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'2px'}}>
          <button onClick={toggleLike} style={{background:'none',border:'none',cursor:'pointer',fontSize:'34px',transition:'transform .15s',transform:localLiked?'scale(1.2)':'scale(1)',filter:localLiked?'drop-shadow(0 0 8px #ff4560)':'none'}}>{localLiked?'❤️':'🤍'}</button>
          <span style={{color:'#fff',fontSize:'11px',fontWeight:'800',textShadow:'0 1px 4px rgba(0,0,0,.9)'}}>{fmtCount(localLikeCount)}</span>
        </div>
        <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'2px'}}>
          <button onClick={()=>setShowComments(true)} style={{background:'none',border:'none',cursor:'pointer',fontSize:'32px'}}>💬</button>
          <span style={{color:'#fff',fontSize:'11px',fontWeight:'800',textShadow:'0 1px 4px rgba(0,0,0,.9)'}}>{fmtCount(post.comments_count||0)}</span>
        </div>
        <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'2px'}}>
          <button onClick={()=>setSaved(p=>!p)} style={{background:'none',border:'none',cursor:'pointer',fontSize:'30px',filter:saved?'drop-shadow(0 0 8px #ffd700)':'none'}}>🔖</button>
          <span style={{color:'#fff',fontSize:'11px',fontWeight:'800',textShadow:'0 1px 4px rgba(0,0,0,.9)'}}>Save</span>
        </div>
        <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'2px'}}>
          <button onClick={()=>{try{navigator.share({url:`${window.location.origin}/feed?v=${post.id}`})}catch(e){navigator.clipboard?.writeText(`${window.location.origin}/feed?v=${post.id}`)}}} style={{background:'none',border:'none',cursor:'pointer',fontSize:'30px'}}>⬆️</button>
          <span style={{color:'#fff',fontSize:'11px',fontWeight:'800',textShadow:'0 1px 4px rgba(0,0,0,.9)'}}>Share</span>
        </div>
        <button onClick={()=>setShowMore(true)} style={{background:'rgba(255,255,255,.15)',backdropFilter:'blur(8px)',border:'none',cursor:'pointer',fontSize:'18px',borderRadius:'50%',width:'44px',height:'44px',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontWeight:'900'}}>•••</button>
      </div>

      {/* Bottom */}
      <div style={{position:'absolute',bottom:0,left:0,right:'68px',padding:'14px 16px 36px',background:'linear-gradient(transparent,rgba(0,0,0,.82))',zIndex:20}}>
        <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'6px',flexWrap:'wrap'}}>
          <span onClick={()=>post.profiles?.id&&(window.location.href=`/user/${post.profiles.id}`)} style={{fontSize:'14px',fontWeight:'900',color:'#fff',cursor:'pointer'}}>{pName}</span>
          {user?.id!==post.profiles?.id&&<button onClick={()=>onSupport&&onSupport(post.profiles?.id)} style={{padding:'2px 10px',borderRadius:'8px',border:'1px solid rgba(255,255,255,.65)',background:'transparent',color:'#fff',fontSize:'11px',fontWeight:'700',cursor:'pointer'}}>{isSupported?'✓ Supporting':'+ Support'}</button>}
        </div>
        {post.content&&<div onClick={()=>setShowCaption(p=>!p)} style={{fontSize:'13px',color:'rgba(255,255,255,.9)',lineHeight:'1.5',marginBottom:'5px',cursor:'pointer'}}>
          <span style={{overflow:showCaption?'visible':'hidden',display:'-webkit-box',WebkitLineClamp:showCaption?999:2,WebkitBoxOrient:'vertical'}}>{post.content}</span>
          {(post.content?.length||0)>80&&<span style={{color:'#00e5ff',fontSize:'11px',fontWeight:'700'}}>{showCaption?' ▲':' ▼ more'}</span>}
        </div>}
        {post.hashtags&&<div style={{fontSize:'12px',color:'#00e5ff',fontWeight:'700',marginBottom:'5px'}}>{post.hashtags}</div>}
        <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
          <span style={{fontSize:'16px',animation:'spin 3s linear infinite',display:'inline-block',flexShrink:0}}>🎵</span>
          <span style={{fontSize:'11px',color:'rgba(255,255,255,.7)',whiteSpace:'nowrap',overflow:'hidden'}}>Echo World · {pName}</span>
        </div>
      </div>

      {/* Nav dots */}
      {totalCount>1&&<div style={{position:'absolute',right:'4px',top:'50%',transform:'translateY(-50%)',display:'flex',flexDirection:'column',gap:'4px',opacity:.45,zIndex:20}}>
        {Array.from({length:Math.min(7,totalCount)}).map((_,i)=>{
          const dotIdx=Math.max(0,currentIdx-3)+i
          return <div key={i} style={{width:'3px',height:dotIdx===currentIdx?'22px':'5px',borderRadius:'2px',background:'#fff',transition:'height .2s'}}/>
        })}
      </div>}

      {/* More Menu */}
      {showMore&&<div style={{position:'fixed',inset:0,zIndex:100,background:'rgba(0,0,0,.5)'}} onClick={()=>setShowMore(false)}>
        <div style={{position:'absolute',bottom:0,left:0,right:0,background:'#1a1f2e',borderRadius:'24px 24px 0 0',padding:'16px 0 44px',animation:'slideUp .25s ease'}} onClick={e=>e.stopPropagation()}>
          <div style={{width:'40px',height:'4px',borderRadius:'2px',background:'rgba(255,255,255,.15)',margin:'0 auto 18px'}}/>
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'10px',padding:'0 14px 14px'}}>
            {[
              {icon:'🔗',label:'Copy Link',active:false,fn:()=>{navigator.clipboard?.writeText(`${window.location.origin}/feed?v=${post.id}`).then(()=>alert('লিংক কপি হয়েছে ✓'));setShowMore(false)}},
              {icon:'⬆️',label:'Share',active:false,fn:()=>{try{navigator.share({title:post.content||'Echo Video',url:`${window.location.origin}/feed?v=${post.id}`})}catch(e){navigator.clipboard?.writeText(`${window.location.origin}/feed?v=${post.id}`)};setShowMore(false)}},
              {icon:'⬇️',label:'Download',active:false,fn:()=>{
                try{const a=document.createElement('a');a.href=post.media_url;a.download=`echo_${post.id}.mp4`;a.target='_blank';document.body.appendChild(a);a.click();setTimeout(()=>document.body.removeChild(a),100)}catch(e){window.open(post.media_url,'_blank')}
                setShowMore(false)
              }},
              {icon:'🎵',label:'Remix',active:false,fn:()=>{setShowMore(false);setRemixCaption('🎵 Remix: '+( post.content||'').slice(0,40));setShowRemix(true)}},
              {icon:saved?'✅':'🔖',label:saved?'Saved ✓':'Save',active:saved,fn:()=>{setSaved(p=>!p);setShowMore(false)}},
              {icon:notInterested[post.id]?'👁️‍🗨️':'🚫',label:notInterested[post.id]?'Shown again':'Not Interested',active:notInterested[post.id],fn:()=>{setNotInterested(p=>({...p,[post.id]:!p[post.id]}));setShowMore(false)}},
              {icon:'📢',label:'Report',active:false,fn:()=>{setShowMore(false);setShowReport(true)}},
              {icon:mutedUsers[post.profiles?.id]?'🔔':'🔕',label:mutedUsers[post.profiles?.id]?'Unmute User':'Mute User',active:mutedUsers[post.profiles?.id],fn:()=>{setMutedUsers(p=>({...p,[post.profiles?.id]:!p[post.profiles?.id]}));setShowMore(false)}},
              {icon:'👤',label:'Profile',active:false,fn:()=>{setShowMore(false);if(post.profiles?.id)window.location.href=`/user/${post.profiles.id}`}},
              {icon:showCaption?'📋':'📋',label:showCaption?'Hide Caption':'Captions',active:showCaption,fn:()=>{setShowCaption(p=>!p);setShowMore(false)}},
              {icon:'⚡',label:`Speed ${speed}x`,active:speed!==1,fn:()=>{setShowMore(false);setShowSpeed(true)}},
              {icon:loopOff?'🔁':'🔄',label:loopOff?'Loop Off':'Loop On',active:!loopOff,fn:()=>{setLoopOff(p=>!p);if(videoRef.current)videoRef.current.loop=loopOff;setShowMore(false)}},
              {icon:translated?'🌐':'🌍',label:translated?'Original':'Translate',active:!!translated,fn:async()=>{
                setShowMore(false)
                if(translated){setTranslated(null);return}
                setTranslating(true)
                await new Promise(r=>setTimeout(r,800))
                setTranslated('[Translated] '+(post.content||'No caption'))
                setTranslating(false)
              }},
              {icon:'📊',label:'Stats',active:false,fn:()=>{
                setShowMore(false)
                const msg = `📊 Video Stats

👁️ Views: ${fmtCount(post.views_count||0)}
❤️ Likes: ${fmtCount(post.likes_count||0)}
💬 Comments: ${fmtCount(post.comments_count||0)}
📅 Posted: ${timeAgo(post.created_at)}`
                alert(msg)
              }},
              {icon:'🎁',label:'Send Gift',active:false,fn:()=>{setShowMore(false);setShowGift(true)}},
              {icon:muted?'🔊':'🔇',label:muted?'Unmute':'Mute Video',active:muted,fn:()=>{setMuted(p=>!p);if(videoRef.current)videoRef.current.muted=!muted;setShowMore(false)}},
            ].map((item,i)=><div key={i} onClick={item.fn} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'6px',cursor:'pointer',padding:'10px 4px',borderRadius:'12px',background:item.active?'rgba(0,229,255,.1)':'rgba(255,255,255,.05)',border:`1px solid ${item.active?'rgba(0,229,255,.3)':'rgba(255,255,255,.07)'}`}}>
              <span style={{fontSize:'24px'}}>{item.icon}</span>
              <span style={{fontSize:'10px',color:item.active?'#00e5ff':'#b0b8c8',fontWeight:'600',textAlign:'center',lineHeight:'1.3'}}>{item.label}</span>
            </div>)}
          </div>
          <button onClick={()=>setShowMore(false)} style={{width:'calc(100% - 28px)',margin:'0 14px',padding:'14px',background:'rgba(255,255,255,.07)',border:'none',borderRadius:'14px',color:'#eef2f7',fontSize:'14px',fontWeight:'700',cursor:'pointer'}}>Cancel</button>
        </div>
      </div>}

      {/* Remix Modal */}
      {showRemix&&<div style={{position:'fixed',inset:0,zIndex:110,background:'rgba(0,0,0,.7)'}} onClick={()=>setShowRemix(false)}>
        <div style={{position:'absolute',bottom:0,left:0,right:0,background:'#1a1f2e',borderRadius:'24px 24px 0 0',padding:'20px 16px 44px',animation:'slideUp .25s ease'}} onClick={e=>e.stopPropagation()}>
          <div style={{width:'40px',height:'4px',borderRadius:'2px',background:'rgba(255,255,255,.15)',margin:'0 auto 16px'}}/>
          <div style={{fontSize:'16px',fontWeight:'900',color:'#eef2f7',marginBottom:'4px',textAlign:'center'}}>🎵 Remix Video</div>
          <div style={{fontSize:'12px',color:'#4a5568',marginBottom:'16px',textAlign:'center'}}>এই video টা তোমার profile এ share হবে</div>
          {/* Original video preview */}
          <div style={{display:'flex',gap:'10px',padding:'10px',background:'rgba(255,255,255,.04)',borderRadius:'12px',marginBottom:'14px',border:'1px solid rgba(255,255,255,.07)'}}>
            <div style={{width:'60px',height:'60px',borderRadius:'8px',background:'#111',overflow:'hidden',flexShrink:0,position:'relative'}}>
              <video src={post.media_url} style={{width:'100%',height:'100%',objectFit:'cover'}} muted playsInline preload="metadata"/>
              <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(0,0,0,.3)',fontSize:'18px'}}>▶</div>
            </div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:'12px',fontWeight:'700',color:'#eef2f7',marginBottom:'2px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{post.content||'Video'}</div>
              <div style={{fontSize:'11px',color:'#4a5568'}}>by {getName(post)}</div>
              <div style={{fontSize:'10px',color:'#4a5568',marginTop:'2px'}}>❤️ {fmtCount(post.likes_count||0)} · 👁 {fmtCount(post.views_count||0)}</div>
            </div>
          </div>
          {/* Caption input */}
          <div style={{marginBottom:'14px'}}>
            <div style={{fontSize:'12px',color:'#4a5568',marginBottom:'6px',fontWeight:'700'}}>তোমার মন্তব্য:</div>
            <textarea value={remixCaption} onChange={e=>setRemixCaption(e.target.value)} maxLength={200}
              placeholder='এই video সম্পর্কে কিছু লেখো...'
              style={{width:'100%',background:'rgba(255,255,255,.07)',border:'1px solid rgba(255,255,255,.12)',borderRadius:'12px',padding:'10px 14px',color:'#eef2f7',fontSize:'13px',outline:'none',resize:'none',height:'80px',fontFamily:'system-ui'}}/>
            <div style={{fontSize:'10px',color:'#4a5568',textAlign:'right',marginTop:'3px'}}>{remixCaption.length}/200</div>
          </div>
          {remixDone&&<div style={{background:'rgba(0,255,136,.1)',border:'1px solid rgba(0,255,136,.3)',borderRadius:'10px',padding:'10px',marginBottom:'12px',textAlign:'center',fontSize:'13px',color:'#00ff88',fontWeight:'700'}}>✅ Remix সফলভাবে share হয়েছে!</div>}
          <button onClick={async()=>{
            if(!user||remixPosting) return
            setRemixPosting(true)
            try{
              await supabase.from('posts').insert({
                user_id:user.id,
                content:remixCaption||'🎵 Remix',
                media_url:post.media_url,
                media_type:'video',
                hashtags:'#remix #echo',
                remix_of:post.id,
                created_at:new Date().toISOString()
              })
              setRemixDone(true)
              setTimeout(()=>{setShowRemix(false);setRemixDone(false)},2000)
            }catch(e){alert('Error: '+e.message)}
            setRemixPosting(false)
          }} disabled={remixPosting} style={{width:'100%',padding:'14px',background:remixPosting?'rgba(255,255,255,.1)':'linear-gradient(135deg,#00e5ff,#00ff88)',border:'none',borderRadius:'14px',color:remixPosting?'#4a5568':'#070a12',fontSize:'14px',fontWeight:'800',cursor:remixPosting?'default':'pointer',marginBottom:'8px'}}>
            {remixPosting?'Posting...':'🎵 Remix করো ও Share করো'}
          </button>
          <button onClick={()=>setShowRemix(false)} style={{width:'100%',padding:'13px',background:'rgba(255,255,255,.06)',border:'none',borderRadius:'14px',color:'#eef2f7',fontSize:'14px',fontWeight:'700',cursor:'pointer'}}>Cancel</button>
        </div>
      </div>}

      {/* Gift Modal */}
      {showGift&&<div style={{position:'fixed',inset:0,zIndex:110,background:'rgba(0,0,0,.7)'}} onClick={()=>setShowGift(false)}>
        <div style={{position:'absolute',bottom:0,left:0,right:0,background:'#1a1f2e',borderRadius:'24px 24px 0 0',padding:'20px 16px 44px',animation:'slideUp .25s ease'}} onClick={e=>e.stopPropagation()}>
          <div style={{width:'40px',height:'4px',borderRadius:'2px',background:'rgba(255,255,255,.15)',margin:'0 auto 16px'}}/>
          <div style={{fontSize:'16px',fontWeight:'900',color:'#eef2f7',marginBottom:'2px',textAlign:'center'}}>🎁 Gift পাঠাও</div>
          <div style={{fontSize:'12px',color:'#4a5568',marginBottom:'4px',textAlign:'center'}}>to {getName(post)}</div>
          <div style={{textAlign:'center',marginBottom:'14px'}}>
            <span style={{fontSize:'11px',color:'#ffd700',fontWeight:'700'}}>🪙 তোমার: </span>
            <span style={{fontSize:'11px',color:'#ffd700',fontWeight:'900'}}>{userCoinBal} coins</span>
            <span style={{fontSize:'11px',color:'#4a5568'}}> · </span>
            <span onClick={()=>{setShowGift(false);window.location.href='/coins'}} style={{fontSize:'11px',color:'#00e5ff',cursor:'pointer',fontWeight:'700',textDecoration:'underline'}}>কিনো</span>
          </div>
          {giftSent?<div style={{textAlign:'center',padding:'20px'}}>
            <div style={{fontSize:'48px',marginBottom:'8px'}}>🎉</div>
            <div style={{color:'#00ff88',fontWeight:'800',fontSize:'15px'}}>Gift পাঠানো হয়েছে!</div>
          </div>:<div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'10px',marginBottom:'16px'}}>
            {[{e:'🌹',n:'Rose',c:5},{e:'🎂',n:'Cake',c:10},{e:'💎',n:'Diamond',c:50},{e:'👑',n:'Crown',c:100},{e:'🚀',n:'Rocket',c:200},{e:'🏆',n:'Trophy',c:500},{e:'🌟',n:'Star',c:20},{e:'❤️',n:'Heart',c:15}].map((g,i)=>{
              const canAfford = userCoinBal >= g.c
              return (
              <div key={i} onClick={async()=>{
                if(!canAfford){alert(`🪙 Coin কম!\nদরকার: ${g.c}\nআছে: ${userCoinBal}`);return}
                if(!user||!post?.user_id||giftLoading) return
                if(user.id === post.user_id){alert('নিজেকে gift দেওয়া যাবে না');return}
                setGiftLoading(true)
                try {
                  // Fresh sender balance
                  const {data:sp} = await supabase.from('profiles').select('coin_balance').eq('id',user.id).single()
                  const freshBal = sp?.coin_balance || 0
                  if(freshBal < g.c){alert(`Balance কম! আছে: ${freshBal} coins`);setGiftLoading(false);return}
                  // Deduct sender
                  await supabase.from('profiles').update({coin_balance: freshBal - g.c}).eq('id',user.id)
                  setUserCoinBal(freshBal - g.c)
                  // Credit receiver 80%
                  const recv = Math.floor(g.c * 0.8)
                  const {data:rp} = await supabase.from('profiles').select('coin_balance').eq('id',post.user_id).single()
                  await supabase.from('profiles').update({coin_balance:(rp?.coin_balance||0)+recv}).eq('id',post.user_id)
                  // Log transactions
                  await supabase.from('coin_transactions').insert([
                    {user_id:user.id, amount:-g.c, type:'gift_sent', note:`${g.e} ${g.n} → @${post.profiles?.username||'user'}`},
                    {user_id:post.user_id, amount:recv, type:'gift_received', note:`${g.e} ${g.n} from viewer`}
                  ])
                  const senderName = userName || user?.email?.split('@')[0] || 'কেউ'
                  await supabase.from('notifications').insert({user_id:post.user_id,type:'gift',read:false,from_user_id:user.id,message:`🎁 @${senderName} তোমাকে ${g.e} ${g.n} gift করেছে! (+${recv} coins)`})
                  setGiftSent(true)
                  setTimeout(()=>{setGiftSent(false);setShowGift(false)},2000)
                } catch(e) { alert('Gift পাঠাতে সমস্যা: '+e.message) }
                setGiftLoading(false)
              }} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'4px',padding:'10px 4px',borderRadius:'12px',background:canAfford?'rgba(255,255,255,.06)':'rgba(255,69,96,.04)',border:`1px solid ${canAfford?'rgba(255,255,255,.1)':'rgba(255,69,96,.12)'}`,cursor:canAfford?'pointer':'not-allowed',opacity:canAfford?1:0.45}}>
                <span style={{fontSize:'26px'}}>{g.e}</span>
                <span style={{fontSize:'10px',color:'#eef2f7',fontWeight:'700'}}>{g.n}</span>
                <span style={{fontSize:'9px',color:'#ffd700',fontWeight:'700'}}>🪙 {g.c}</span>
              </div>
            )})}
          </div>}
          {!giftSent&&<button onClick={()=>setShowGift(false)} style={{width:'100%',padding:'13px',background:'rgba(255,255,255,.06)',border:'none',borderRadius:'14px',color:'#eef2f7',fontSize:'14px',fontWeight:'700',cursor:'pointer'}}>Cancel</button>}
        </div>
      </div>}

      {/* Translating indicator */}
      {translating&&<div style={{position:'absolute',top:'50%',left:'50%',transform:'translate(-50%,-50%)',background:'rgba(0,0,0,.85)',borderRadius:'12px',padding:'16px 24px',color:'#fff',fontSize:'13px',fontWeight:'700',zIndex:50,textAlign:'center'}}>
        <div style={{fontSize:'24px',marginBottom:'8px',animation:'spin 1s linear infinite'}}>🌐</div>
        Translating...
      </div>}

      {/* Show translated caption */}
      {translated&&!showMore&&<div style={{position:'absolute',top:'14px',left:'50%',transform:'translateX(-50%)',background:'rgba(0,0,0,.85)',borderRadius:'12px',padding:'10px 16px',color:'#00e5ff',fontSize:'12px',fontWeight:'600',zIndex:30,maxWidth:'80%',textAlign:'center',border:'1px solid rgba(0,229,255,.3)'}}>
        🌐 {translated}
        <button onClick={()=>setTranslated(null)} style={{marginLeft:'8px',background:'none',border:'none',color:'#4a5568',cursor:'pointer',fontSize:'14px'}}>✕</button>
      </div>}

      {/* Speed */}
      {showSpeed&&<div style={{position:'fixed',inset:0,zIndex:100,background:'rgba(0,0,0,.5)'}} onClick={()=>setShowSpeed(false)}>
        <div style={{position:'absolute',bottom:0,left:0,right:0,background:'#1a1f2e',borderRadius:'24px 24px 0 0',padding:'20px 16px 44px',animation:'slideUp .25s ease'}} onClick={e=>e.stopPropagation()}>
          <div style={{fontSize:'14px',fontWeight:'800',color:'#eef2f7',marginBottom:'14px',textAlign:'center'}}>⚡ Speed</div>
          {[0.25,0.5,0.75,1,1.25,1.5,2].map(s=><button key={s} onClick={()=>changeSpeed(s)} style={{width:'100%',padding:'12px 16px',marginBottom:'6px',borderRadius:'12px',border:'none',background:speed===s?'linear-gradient(135deg,#00e5ff,#00ff88)':'rgba(255,255,255,.07)',color:speed===s?'#070a12':'#eef2f7',fontSize:'14px',fontWeight:speed===s?'800':'400',cursor:'pointer',display:'flex',justifyContent:'space-between'}}><span>{s}x</span>{speed===s&&<span>✓</span>}</button>)}
        </div>
      </div>}

      {/* Report */}
      {showReport&&<div style={{position:'fixed',inset:0,zIndex:100,background:'rgba(0,0,0,.5)'}} onClick={()=>setShowReport(false)}>
        <div style={{position:'absolute',bottom:0,left:0,right:0,background:'#1a1f2e',borderRadius:'24px 24px 0 0',padding:'20px 16px 44px',animation:'slideUp .25s ease'}} onClick={e=>e.stopPropagation()}>
          <div style={{fontSize:'14px',fontWeight:'800',color:'#eef2f7',marginBottom:'14px',textAlign:'center'}}>📢 Report</div>
          {['Spam','Inappropriate','Harassment','Misinformation','Nudity','Violence','Other'].map(r=><button key={r} onClick={()=>{setShowReport(false);setReported(true);setTimeout(()=>setReported(false),3000)}} style={{width:'100%',padding:'12px 16px',marginBottom:'6px',borderRadius:'12px',border:'1px solid rgba(255,69,96,.2)',background:'rgba(255,69,96,.05)',color:'#eef2f7',fontSize:'13px',cursor:'pointer',textAlign:'left'}}>{r}</button>)}
        </div>
      </div>}

      {/* Comments Drawer */}
      {showComments&&<div style={{position:'fixed',inset:0,zIndex:100,background:'rgba(0,0,0,.4)'}} onClick={()=>setShowComments(false)}>
        <div style={{position:'absolute',bottom:0,left:0,right:0,background:'#1a1f2e',borderRadius:'24px 24px 0 0',maxHeight:'75vh',display:'flex',flexDirection:'column',animation:'slideUp .25s ease'}} onClick={e=>e.stopPropagation()}>
          <div style={{padding:'14px 16px 10px',borderBottom:'1px solid rgba(255,255,255,.07)',display:'flex',justifyContent:'space-between',alignItems:'center',flexShrink:0}}>
            <span style={{fontSize:'14px',fontWeight:'800',color:'#eef2f7'}}>💬 {comments.length} Comments</span>
            <button onClick={()=>setShowComments(false)} style={{background:'none',border:'none',color:'#4a5568',fontSize:'20px',cursor:'pointer'}}>✕</button>
          </div>
          <div style={{flex:1,overflowY:'auto',padding:'10px 14px'}}>
            {comments.length===0&&<div style={{textAlign:'center',padding:'30px',color:'#4a5568',fontSize:'13px'}}>এখনো কোনো মন্তব্য নেই</div>}
            {comments.map(cm=><div key={cm.id} style={{display:'flex',gap:'10px',marginBottom:'14px'}}>
              <div style={{width:'34px',height:'34px',borderRadius:'50%',background:'linear-gradient(135deg,#00e5ff,#00ff88)',flexShrink:0,overflow:'hidden',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'12px',fontWeight:'800',color:'#070a12'}}>
                {cm.profiles?.avatar_url?<img src={cm.profiles.avatar_url} style={{width:'100%',height:'100%',objectFit:'cover'}} onError={e=>e.target.style.display='none'}/>:(cm.profiles?.full_name||cm.profiles?.username||'U')[0].toUpperCase()}
              </div>
              <div style={{flex:1}}>
                <div style={{display:'flex',gap:'6px',alignItems:'center',marginBottom:'2px'}}>
                  <span style={{fontSize:'12px',fontWeight:'700',color:'#eef2f7'}}>{cm.profiles?.full_name||cm.profiles?.username}</span>
                  <span style={{fontSize:'10px',color:'#4a5568'}}>{timeAgo(cm.created_at)}</span>
                </div>
                <div style={{fontSize:'13px',color:'#c0c8d8',lineHeight:'1.5'}}>{cm.content}</div>
                <div style={{display:'flex',gap:'14px',marginTop:'5px'}}>
                  <button onClick={()=>setCommentLikes(p=>({...p,[cm.id]:!p[cm.id]}))} style={{background:'none',border:'none',cursor:'pointer',fontSize:'12px',color:commentLikes[cm.id]?'#ff4560':'#4a5568',padding:0,display:'flex',alignItems:'center',gap:'3px'}}>
                    {commentLikes[cm.id]?'❤️':'🤍'} Like
                  </button>
                  <button onClick={()=>setReplyTo(cm.profiles?.username||'User')} style={{background:'none',border:'none',cursor:'pointer',fontSize:'12px',color:'#4a5568',padding:0}}>↩ Reply</button>
                </div>
              </div>
            </div>)}
          </div>
          {user&&<div style={{padding:'10px 14px 24px',borderTop:'1px solid rgba(255,255,255,.07)',flexShrink:0}}>
            {replyTo&&<div style={{fontSize:'11px',color:'#00e5ff',marginBottom:'6px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span>↩ @{replyTo} কে reply</span>
              <button onClick={()=>setReplyTo(null)} style={{background:'none',border:'none',color:'#4a5568',cursor:'pointer',fontSize:'16px'}}>✕</button>
            </div>}
            <div style={{display:'flex',gap:'8px'}}>
              <input value={commentText} onChange={e=>setCommentText(e.target.value)} onKeyDown={e=>e.key==='Enter'&&!e.shiftKey&&submitComment()}
                placeholder={replyTo?`@${replyTo} কে reply...`:'মন্তব্য লিখুন...'}
                style={{flex:1,background:'rgba(255,255,255,.08)',border:'1px solid rgba(255,255,255,.12)',borderRadius:'20px',padding:'10px 14px',color:'#eef2f7',fontSize:'13px',outline:'none'}}/>
              <button onClick={submitComment} disabled={!commentText.trim()} style={{padding:'10px 16px',borderRadius:'20px',border:'none',background:commentText.trim()?'linear-gradient(135deg,#00e5ff,#00ff88)':'rgba(255,255,255,.07)',color:commentText.trim()?'#070a12':'#4a5568',fontSize:'12px',fontWeight:'800',cursor:commentText.trim()?'pointer':'default',flexShrink:0}}>Post</button>
            </div>
          </div>}
        </div>
      </div>}
    </div>
  )
}

// ══════════════════════════════════════════════════════
// SHORT VIEWER WRAPPER (manages index state)
// ══════════════════════════════════════════════════════
function ShortViewerWrapper({ posts, startIdx, onClose, user, liked, onLike, supported, onSupport }) {
  const [idx, setIdx] = useState(()=>Math.max(0,Math.min(startIdx||0,(posts?.length||1)-1)))
  const safePosts = Array.isArray(posts)&&posts.length>0 ? posts : []
  const post = safePosts[idx]

  if(!post) return (
    <div style={{position:'fixed',inset:0,background:'#000',zIndex:500,display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:'16px'}}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{width:'40px',height:'40px',border:'3px solid rgba(255,255,255,.2)',borderTop:'3px solid #fff',borderRadius:'50%',animation:'spin 1s linear infinite'}}/>
      <div style={{color:'rgba(255,255,255,.6)',fontSize:'14px'}}>Loading video...</div>
      <button onClick={onClose} style={{padding:'10px 20px',background:'rgba(255,255,255,.1)',border:'none',color:'#fff',borderRadius:'10px',cursor:'pointer'}}>← Back</button>
    </div>
  )

  return (
    <ShortViewer
      key={post.id}
      post={post}
      allPosts={safePosts}
      currentIdx={idx}
      totalCount={safePosts.length}
      onClose={onClose}
      onNext={()=>setIdx(i=>Math.min(safePosts.length-1,i+1))}
      onPrev={()=>setIdx(i=>Math.max(0,i-1))}
      user={user}
      isLiked={!!(liked&&liked[post.id])}
      likeCount={post.likes_count||0}
      isSupported={!!(supported&&post.profiles?.id&&supported[post.profiles.id])}
      onLike={onLike}
      onSupport={onSupport}
    />
  )
}

// ══════════════════════════════════════════════════════
// STORY VIEWER
// ══════════════════════════════════════════════════════
function StoryViewer({ group, onClose }) {
  const [idx, setIdx] = useState(0)
  const [progress, setProgress] = useState(0)
  const timerRef = useRef(null)
  const story = group?.items?.[idx]

  useEffect(() => {
    setProgress(0)
    timerRef.current = setInterval(()=>{
      setProgress(p=>{
        if(p>=100){ clearInterval(timerRef.current); if(idx<(group?.items?.length||0)-1){setIdx(i=>i+1)}else onClose(); return 0 }
        return p+2
      })
    },100)
    return ()=>clearInterval(timerRef.current)
  },[idx])

  if(!story) return null
  return (
    <div style={{position:'fixed',inset:0,background:'#000',zIndex:600}}>
      <div style={{position:'absolute',top:0,left:0,right:0,padding:'12px 12px 0',display:'flex',gap:'3px',zIndex:10}}>
        {group.items.map((_,i)=><div key={i} style={{flex:1,height:'3px',borderRadius:'2px',background:'rgba(255,255,255,.3)',overflow:'hidden'}}>
          <div style={{height:'100%',background:'#fff',width:`${i<idx?100:i===idx?progress:0}%`,transition:i===idx?'width .1s':'none'}}/>
        </div>)}
      </div>
      <button onClick={onClose} style={{position:'absolute',top:'18px',right:'14px',background:'none',border:'none',color:'#fff',fontSize:'22px',cursor:'pointer',zIndex:10}}>✕</button>
      {story.media_url?.match(/\.(mp4|webm|mov)/i)
        ?<video src={story.media_url} style={{width:'100%',height:'100%',objectFit:'cover'}} autoPlay muted playsInline onEnded={()=>{if(idx<group.items.length-1)setIdx(i=>i+1);else onClose()}}/>
        :<img src={story.media_url} style={{width:'100%',height:'100%',objectFit:'cover'}} onClick={()=>{if(idx<group.items.length-1)setIdx(i=>i+1);else onClose()}}/>}
      <div style={{position:'absolute',top:0,left:0,width:'40%',height:'100%',zIndex:5}} onClick={()=>{if(idx>0)setIdx(i=>i-1);else onClose()}}/>
      <div style={{position:'absolute',top:0,right:0,width:'40%',height:'100%',zIndex:5}} onClick={()=>{if(idx<group.items.length-1)setIdx(i=>i+1);else onClose()}}/>
      <div style={{position:'absolute',top:'28px',left:'14px',display:'flex',alignItems:'center',gap:'10px',zIndex:10}}>
        <div style={{width:'38px',height:'38px',borderRadius:'50%',overflow:'hidden',border:'2px solid #fff',background:'linear-gradient(135deg,#00e5ff,#00ff88)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
          {group.profile?.avatar_url?<img src={group.profile.avatar_url} style={{width:'100%',height:'100%',objectFit:'cover'}}/>:<span style={{fontSize:'14px',fontWeight:'800',color:'#070a12'}}>{(group.profile?.full_name||group.profile?.username||'U')[0].toUpperCase()}</span>}
        </div>
        <div>
          <div style={{color:'#fff',fontWeight:'700',fontSize:'13px'}}>{group.profile?.full_name||group.profile?.username}</div>
          <div style={{color:'rgba(255,255,255,.6)',fontSize:'10px'}}>{timeAgo(story.created_at)}</div>
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════
// MAIN FEED
// ══════════════════════════════════════════════════════
export default function Feed() {
  const [user, setUser] = useState(null)
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('all')
  const [liked, setLiked] = useState({})
  const [supported, setSupported] = useState({})
  const [notifCount, setNotifCount] = useState(0)
  const [dmCount, setDmCount] = useState(0)
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [installed, setInstalled] = useState(false)
  const [stories, setStories] = useState([])
  const [videoDurations, setVideoDurations] = useState({})
  const [openVideo, setOpenVideo] = useState(null)
  const [openShortIdx, setOpenShortIdx] = useState(null)
  const [shortsList, setShortsList] = useState([])
  const [storyGroup, setStoryGroup] = useState(null)
  const [showLiveModal, setShowLiveModal] = useState(false)
  const [liveStep, setLiveStep] = useState('check') // check|plans|payment|submitted|active|free
  const [liveSub, setLiveSub] = useState(null) // current subscription
  const [liveLoading, setLiveLoading] = useState(false)
  const [activeLives, setActiveLives] = useState([])
  const [trxHash, setTrxHash] = useState('')
  const [trxSubmitting, setTrxSubmitting] = useState(false)
  const [trxDone, setTrxDone] = useState(false)
  const [copied, setCopied] = useState(false)
  const [investTotal, setInvestTotal] = useState(0)
  const [lightboxImg, setLightboxImg] = useState(null) // photo lightbox
  const videoRefs = useRef({})
  const observerRef = useRef(null)

  useEffect(() => {
    supabase.auth.getSession().then(async({data})=>{
      if(!data.session){window.location.href='/';return}
      const u=data.session.user; setUser(u)
      await loadData(u.id)
      await checkLiveStatus(u.id)
      const {count}=await supabase.from('notifications').select('*',{count:'exact',head:true}).eq('user_id',u.id).eq('read',false)
      setNotifCount(count||0)
      const {data:convs}=await supabase.from('conversations').select('id').or(`user1_id.eq.${u.id},user2_id.eq.${u.id}`)
      if(convs?.length){
        const {count:unread}=await supabase.from('messages').select('*',{count:'exact',head:true}).in('conversation_id',convs.map(c=>c.id)).eq('read',false).neq('sender_id',u.id)
        setDmCount(unread||0)
      }
    })
    window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();setDeferredPrompt(e)})
    window.addEventListener('appinstalled',()=>{setInstalled(true);setDeferredPrompt(null)})
    if(window.matchMedia('(display-mode: standalone)').matches) setInstalled(true)
  },[])

  useEffect(()=>{
    observerRef.current=new IntersectionObserver(entries=>{
      entries.forEach(entry=>{const v=entry.target;if(entry.isIntersecting&&entry.intersectionRatio>=0.7)v.play().catch(()=>{});else v.pause()})
    },{threshold:0.7})
    Object.values(videoRefs.current).forEach(v=>{if(v)observerRef.current.observe(v)})
    return()=>observerRef.current?.disconnect()
  },[posts])

  const checkLiveStatus = async(userId) => {
    setLiveLoading(true)
    try {
      // Check if user has $1000+ investment
      const {data:inv} = await supabase.from('investments').select('amount').eq('user_id',userId).eq('status','active')
      const total = (inv||[]).reduce((s,i)=>s+(parseFloat(i.amount)||0),0)
      setInvestTotal(total)
      // Check live subscription
      const {data:sub} = await supabase.from('live_subscriptions')
        .select('*').eq('user_id',userId)
        .order('created_at',{ascending:false}).limit(1).single()
      if(sub) {
        setLiveSub(sub)
        if(total >= 1000) { setLiveStep('free') }
        else if(sub.status==='active' && sub.expires_at && new Date(sub.expires_at)>new Date()) { setLiveStep('active') }
        else if(sub.status==='pending') { setLiveStep('submitted') }
        else if(sub.status==='free') { setLiveStep('free') }
        else { setLiveStep('plans') }
      } else {
        if(total >= 1000) { setLiveStep('free') }
        else { setLiveStep('plans') }
      }
      setLiveLoading(false)
    } catch(e) { setLiveStep('plans'); setLiveLoading(false) }
  }

  const submitTrxHash = async() => {
    if(!trxHash.trim()||!user) return
    setTrxSubmitting(true)
    try {
      await supabase.from('live_subscriptions').insert({
        user_id: user.id,
        trx_hash: trxHash.trim(),
        status: 'pending',
        amount_usdt: 15,
        note: 'Live subscription payment submitted'
      })
      setTrxDone(true)
      setLiveStep('submitted')
    } catch(e) { alert('Error: '+e.message) }
    setTrxSubmitting(false)
  }

  const loadData = async(userId)=>{
    setLoading(true)
    const {data:following}=await supabase.from('followers').select('following_id').eq('follower_id',userId)
    const followingIds=(following||[]).map(f=>f.following_id)
    const {data}=await supabase.from('posts').select('*, profiles(id,username,full_name,avatar_url)').order('created_at',{ascending:false}).limit(50)
    if(!data){setLoading(false);return}
    const nowMs=Date.now()
    const scored=data.map(post=>{
      let score=0; score+=(post.likes_count||0)*2; score+=(post.comments_count||0)*4
      const ageH=(nowMs-new Date(post.created_at).getTime())/3600000
      score*=Math.pow(0.5,ageH/18)
      if(followingIds.includes(post.user_id))score*=2.5
      if(post.media_type==='video')score*=1.2
      return{...post,score}
    })
    scored.sort((a,b)=>b.score-a.score)
    const sorted=scored // সব post দেখাবে
    setPosts(sorted)
    setShortsList(sorted.filter(p=>p.media_type==='video'||p.media_url?.match(/\.(mp4|webm|mov)/i)))
    const {data:myLikes}=await supabase.from('likes').select('post_id').eq('user_id',userId)
    const lm={}; (myLikes||[]).forEach(l=>{lm[l.post_id]=true}); setLiked(lm)
    const sm={}; followingIds.forEach(id=>{sm[id]=true}); setSupported(sm)
    const {data:st}=await supabase.from('stories').select('*, profiles(id,username,full_name,avatar_url)').gt('expires_at',new Date().toISOString()).order('created_at',{ascending:false})
    const grp={}; (st||[]).forEach(s=>{const uid=s.profiles?.id;if(!grp[uid])grp[uid]={profile:s.profiles,items:[]};grp[uid].items.push(s)})
    setStories(Object.values(grp))
    // Load active live sessions
    try {
      const {data:lives} = await supabase.from('live_sessions')
        .select('*, profiles(id,username,full_name,avatar_url)')
        .eq('status','active')
        .order('viewer_count',{ascending:false})
        .limit(10)
      setActiveLives(lives||[])
    } catch(e) {}
    setLoading(false)
  }

  const handleLike = async(post)=>{
    if(!user) return
    if(liked[post.id]){
      await supabase.from('likes').delete().eq('post_id',post.id).eq('user_id',user.id)
      setLiked(p=>({...p,[post.id]:false})); setPosts(p=>p.map(pp=>pp.id===post.id?{...pp,likes_count:Math.max(0,(pp.likes_count||1)-1)}:pp))
    } else {
      await supabase.from('likes').insert({post_id:post.id,user_id:user.id})
      setLiked(p=>({...p,[post.id]:true})); setPosts(p=>p.map(pp=>pp.id===post.id?{...pp,likes_count:(pp.likes_count||0)+1}:pp))
    }
  }
  const handleSupport = async(targetId)=>{
    if(!user||!targetId) return
    if(supported[targetId]){await supabase.from('followers').delete().eq('follower_id',user.id).eq('following_id',targetId);setSupported(p=>({...p,[targetId]:false}))}
    else{await supabase.from('followers').insert({follower_id:user.id,following_id:targetId});setSupported(p=>({...p,[targetId]:true}))}
  }
  const openShortVideo=(post)=>{
    if(!post?.id) return
    const idx=shortsList.findIndex(p=>p.id===post.id)
    setOpenShortIdx(idx>=0?idx:0)
    if(idx<0) setShortsList(prev=>[post,...prev])
  }
  const filteredPosts=posts.filter(p=>{
    if(activeTab==='photos') return p.media_type==='photo'
    if(activeTab==='videos') return p.media_type==='video'||p.media_url?.match(/\.(mp4|webm|mov)/i)
    if(activeTab==='capsules') return p.media_type==='capsule'
    return true
  })

  return (
    <div style={{minHeight:'100vh',background:'#070a10',color:'#eef2f7',fontFamily:'system-ui,sans-serif',paddingBottom:'90px'}}>
      {/* ══ LIGHTBOX ══ */}
      {lightboxImg && (
        <div onClick={()=>setLightboxImg(null)}
          style={{position:'fixed',inset:0,zIndex:9999,background:'rgba(0,0,0,.95)',display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
          <button onClick={()=>setLightboxImg(null)}
            style={{position:'absolute',top:16,right:16,background:'rgba(255,255,255,.1)',border:'none',borderRadius:'50%',width:40,height:40,color:'#fff',fontSize:20,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button>
          <img src={lightboxImg} style={{maxWidth:'100%',maxHeight:'90vh',objectFit:'contain',borderRadius:12}} onClick={e=>e.stopPropagation()}/>
        </div>
      )}

      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes storyGlow{0%,100%{box-shadow:0 0 0 2.5px #00e5ff}50%{box-shadow:0 0 0 2.5px #00ff88}}
        @keyframes liveGlow{0%,100%{box-shadow:0 0 0 0 rgba(255,69,96,.4)}50%{box-shadow:0 0 0 8px rgba(255,69,96,0)}} @keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.08)}} @keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
        @keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}
        *{box-sizing:border-box} ::-webkit-scrollbar{display:none}
      `}</style>

      {/* Overlays */}
      {openVideo&&<YouTubePlayer post={openVideo} onClose={()=>setOpenVideo(null)} user={user} liked={liked} onLike={handleLike} supported={supported} onSupport={handleSupport} onNext={p=>{setOpenVideo(null);setTimeout(()=>setOpenVideo(p),80)}}/>}
      {openShortIdx!==null&&<ShortViewerWrapper posts={shortsList} startIdx={openShortIdx} onClose={()=>setOpenShortIdx(null)} user={user} liked={liked} onLike={handleLike} supported={supported} onSupport={handleSupport}/>}
      {storyGroup&&<StoryViewer group={storyGroup} onClose={()=>setStoryGroup(null)}/>}

      {/* ══ LIVE SYSTEM MODAL ══ */}
      {showLiveModal&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.85)',zIndex:400,display:'flex',alignItems:'flex-end'}} onClick={()=>setShowLiveModal(false)}>
          <div style={{width:'100%',background:'linear-gradient(180deg,#0d1220 0%,#111827 100%)',borderRadius:'28px 28px 0 0',padding:'0 0 44px',animation:'slideUp .35s cubic-bezier(.25,.46,.45,.94)',maxHeight:'90vh',overflowY:'auto',border:'1px solid rgba(255,255,255,.08)',borderBottom:'none'}} onClick={e=>e.stopPropagation()}>

            {/* Handle */}
            <div style={{padding:'14px 0 0',display:'flex',justifyContent:'center',marginBottom:'4px'}}>
              <div style={{width:'44px',height:'5px',borderRadius:'3px',background:'rgba(255,255,255,.15)'}}/>
            </div>

            {/* ── STEP: PLANS (default) ── */}
            {liveStep==='plans'&&<>
              {/* Hero */}
              <div style={{position:'relative',overflow:'hidden',padding:'28px 20px 24px',textAlign:'center'}}>
                <div style={{position:'absolute',inset:0,background:'radial-gradient(ellipse at 50% 0%, rgba(255,69,96,.18) 0%, transparent 70%)'}}/>
                <div style={{position:'relative'}}>
                  <div style={{display:'inline-flex',alignItems:'center',gap:'8px',background:'rgba(255,69,96,.15)',border:'1px solid rgba(255,69,96,.35)',borderRadius:'20px',padding:'6px 16px',marginBottom:'14px'}}>
                    <span style={{width:'8px',height:'8px',borderRadius:'50%',background:'#ff4560',display:'inline-block',animation:'liveGlow 1.5s infinite'}}/>
                    <span style={{fontSize:'12px',fontWeight:'900',color:'#ff4560',letterSpacing:'2px'}}>LIVE</span>
                  </div>
                  <div style={{fontSize:'22px',fontWeight:'900',color:'#eef2f7',marginBottom:'6px'}}>Echo Live চালু করুন</div>
                  <div style={{fontSize:'13px',color:'#4a5568'}}>তোমার followers দের সাথে সরাসরি connect করো</div>
                </div>
              </div>

              {/* $1000 investor badge */}
              {investTotal>=500&&investTotal<1000&&<div style={{margin:'0 16px 14px',background:'linear-gradient(135deg,rgba(255,202,40,.1),rgba(255,202,40,.05))',border:'1px solid rgba(255,202,40,.25)',borderRadius:'14px',padding:'12px 14px',display:'flex',gap:'10px',alignItems:'center'}}>
                <span style={{fontSize:'22px'}}>⭐</span>
                <div><div style={{fontSize:'12px',fontWeight:'800',color:'#ffca28'}}>Elite Investor</div><div style={{fontSize:'11px',color:'#4a5568'}}>${Math.round(investTotal)} invested · ${Math.round(1000-investTotal)} more for FREE Live</div></div>
              </div>}

              {/* Plan card */}
              <div style={{margin:'0 16px 16px',background:'linear-gradient(135deg,rgba(255,69,96,.1),rgba(255,107,53,.08))',border:'1px solid rgba(255,69,96,.25)',borderRadius:'20px',padding:'20px',position:'relative',overflow:'hidden'}}>
                <div style={{position:'absolute',top:'-20px',right:'-20px',width:'100px',height:'100px',borderRadius:'50%',background:'rgba(255,69,96,.08)'}}/>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'14px'}}>
                  <div>
                    <div style={{fontSize:'18px',fontWeight:'900',color:'#eef2f7',marginBottom:'3px'}}>🔴 Live Monthly</div>
                    <div style={{fontSize:'12px',color:'#4a5568'}}>১ মাস সাবস্ক্রিপশন · নবায়নযোগ্য</div>
                  </div>
                  <div style={{textAlign:'right'}}>
                    <div style={{fontSize:'28px',fontWeight:'900',background:'linear-gradient(135deg,#00e5ff,#00ff88)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>15</div>
                    <div style={{fontSize:'11px',color:'#4a5568',marginTop:'-4px'}}>USDT / মাস</div>
                  </div>
                </div>
                {[['🔴','Unlimited Live Streaming'],['💬','Real-time Live Chat'],['🎁','Receive Live Gifts'],['📊','Viewer Analytics'],['⚡','HD Quality Broadcast'],['🌟','Featured on Live tab']].map(([ic,feat],i)=>(
                  <div key={i} style={{display:'flex',gap:'8px',alignItems:'center',marginBottom:'7px'}}>
                    <span style={{fontSize:'14px'}}>{ic}</span>
                    <span style={{fontSize:'12px',color:'#b0b8c8'}}>{feat}</span>
                  </div>
                ))}
              </div>

              <div style={{padding:'0 16px'}}>
                <button onClick={()=>setLiveStep('payment')} style={{width:'100%',padding:'16px',background:'linear-gradient(135deg,#ff4560,#ff6b35)',border:'none',borderRadius:'16px',color:'#fff',fontSize:'15px',fontWeight:'900',cursor:'pointer',marginBottom:'10px',boxShadow:'0 4px 20px rgba(255,69,96,.35)'}}>
                  💳 Payment করুন — Live চালু করুন
                </button>
                <button onClick={()=>setShowLiveModal(false)} style={{width:'100%',padding:'14px',background:'rgba(255,255,255,.06)',border:'none',borderRadius:'14px',color:'#eef2f7',fontSize:'14px',fontWeight:'700',cursor:'pointer'}}>Cancel</button>
              </div>
            </>}

            {/* ── STEP: PAYMENT ── */}
            {liveStep==='payment'&&<>
              <div style={{padding:'20px 20px 0',display:'flex',alignItems:'center',gap:'12px',marginBottom:'20px'}}>
                <button onClick={()=>setLiveStep('plans')} style={{background:'rgba(255,255,255,.07)',border:'none',color:'#eef2f7',fontSize:'13px',fontWeight:'700',borderRadius:'10px',padding:'8px 14px',cursor:'pointer'}}>← Back</button>
                <div style={{fontSize:'16px',fontWeight:'900',color:'#eef2f7'}}>💳 Payment</div>
              </div>

              {/* Step indicators */}
              <div style={{display:'flex',alignItems:'center',padding:'0 20px',marginBottom:'22px',gap:'0'}}>
                {[['1','Send USDT'],['2','Copy TRX ID'],['3','Submit']].map(([num,label],i)=>(
                  <div key={i} style={{display:'flex',alignItems:'center',flex:i<2?1:'auto'}}>
                    <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'4px'}}>
                      <div style={{width:'28px',height:'28px',borderRadius:'50%',background:'linear-gradient(135deg,#00e5ff,#00ff88)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'12px',fontWeight:'900',color:'#070a12'}}>{num}</div>
                      <span style={{fontSize:'10px',color:'#4a5568',whiteSpace:'nowrap'}}>{label}</span>
                    </div>
                    {i<2&&<div style={{flex:1,height:'2px',background:'rgba(0,229,255,.25)',margin:'0 4px',marginBottom:'14px'}}/>}
                  </div>
                ))}
              </div>

              {/* Amount */}
              <div style={{margin:'0 16px 14px',background:'rgba(0,229,255,.06)',border:'1px solid rgba(0,229,255,.2)',borderRadius:'16px',padding:'16px',textAlign:'center'}}>
                <div style={{fontSize:'13px',color:'#4a5568',marginBottom:'4px'}}>পাঠাতে হবে</div>
                <div style={{fontSize:'36px',fontWeight:'900',background:'linear-gradient(135deg,#00e5ff,#00ff88)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>15 USDT</div>
                <div style={{fontSize:'12px',color:'#4a5568'}}>TRC20 Network · ১ মাসের জন্য</div>
              </div>

              {/* USDT address */}
              <div style={{margin:'0 16px 14px',background:'rgba(255,255,255,.04)',borderRadius:'14px',padding:'14px',border:'1px solid rgba(255,255,255,.08)'}}>
                <div style={{fontSize:'11px',color:'#4a5568',marginBottom:'8px',fontWeight:'700',display:'flex',alignItems:'center',gap:'6px'}}>
                  <span>💳</span> USDT TRC20 Wallet Address
                </div>
                <div style={{fontSize:'11px',color:'#00e5ff',fontWeight:'700',wordBreak:'break-all',lineHeight:'1.6',background:'rgba(0,229,255,.05)',borderRadius:'8px',padding:'8px 10px',marginBottom:'8px',border:'1px solid rgba(0,229,255,.1)'}}>
                  TEU8tVcEifGgTCxkpCXKw3SMfeoFNfAWkJ
                </div>
                <button onClick={()=>{
                  navigator.clipboard?.writeText('TEU8tVcEifGgTCxkpCXKw3SMfeoFNfAWkJ')
                  setCopied(true); setTimeout(()=>setCopied(false),2500)
                }} style={{width:'100%',padding:'10px',background:copied?'rgba(0,255,136,.15)':'linear-gradient(135deg,#00e5ff,#00ff88)',border:copied?'1px solid rgba(0,255,136,.4)':'none',borderRadius:'10px',color:copied?'#00ff88':'#070a12',fontSize:'13px',fontWeight:'800',cursor:'pointer'}}>
                  {copied?'✓ কপি হয়েছে!':'📋 Address Copy করুন'}
                </button>
              </div>

              {/* TRX Hash input */}
              <div style={{margin:'0 16px 16px'}}>
                <div style={{fontSize:'12px',color:'#4a5568',marginBottom:'8px',fontWeight:'700'}}>
                  Transaction Hash / TRX ID দিন:
                </div>
                <input
                  value={trxHash}
                  onChange={e=>setTrxHash(e.target.value)}
                  placeholder='e.g. 0x1234abcd... বা TRX hash paste করুন'
                  style={{width:'100%',background:'rgba(255,255,255,.06)',border:'1px solid rgba(255,255,255,.12)',borderRadius:'12px',padding:'12px 14px',color:'#eef2f7',fontSize:'13px',outline:'none',marginBottom:'8px',fontFamily:'monospace'}}
                />
                <div style={{fontSize:'11px',color:'#4a5568',lineHeight:'1.6'}}>
                  Payment করার পরে TronScan বা তোমার wallet থেকে Transaction Hash কপি করে এখানে paste করো
                </div>
              </div>

              <div style={{padding:'0 16px'}}>
                <button onClick={submitTrxHash} disabled={!trxHash.trim()||trxSubmitting}
                  style={{width:'100%',padding:'15px',background:trxHash.trim()&&!trxSubmitting?'linear-gradient(135deg,#ff4560,#ff6b35)':'rgba(255,255,255,.06)',border:'none',borderRadius:'16px',color:trxHash.trim()&&!trxSubmitting?'#fff':'#4a5568',fontSize:'15px',fontWeight:'900',cursor:trxHash.trim()&&!trxSubmitting?'pointer':'default',marginBottom:'10px',boxShadow:trxHash.trim()?'0 4px 20px rgba(255,69,96,.3)':'none'}}>
                  {trxSubmitting?'Submitting...':'✅ Submit করুন — Verify অপেক্ষা করুন'}
                </button>
                <button onClick={()=>setShowLiveModal(false)} style={{width:'100%',padding:'14px',background:'rgba(255,255,255,.06)',border:'none',borderRadius:'14px',color:'#eef2f7',fontSize:'14px',fontWeight:'700',cursor:'pointer'}}>Cancel</button>
              </div>
            </>}

            {/* ── STEP: SUBMITTED (pending) ── */}
            {liveStep==='submitted'&&<>
              <div style={{padding:'30px 20px',textAlign:'center'}}>
                <div style={{width:'80px',height:'80px',borderRadius:'50%',background:'rgba(255,202,40,.1)',border:'2px solid rgba(255,202,40,.3)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'36px',margin:'0 auto 16px'}}>⏳</div>
                <div style={{fontSize:'20px',fontWeight:'900',color:'#eef2f7',marginBottom:'8px'}}>Verification অপেক্ষায়</div>
                <div style={{fontSize:'13px',color:'#4a5568',lineHeight:'1.7',marginBottom:'20px'}}>
                  তোমার payment submit হয়েছে।<br/>
                  Admin verify করলে ২৪ ঘণ্টার মধ্যে Live চালু হবে।
                </div>
                <div style={{background:'rgba(255,202,40,.08)',border:'1px solid rgba(255,202,40,.2)',borderRadius:'14px',padding:'14px',marginBottom:'20px',textAlign:'left'}}>
                  <div style={{fontSize:'12px',fontWeight:'700',color:'#ffca28',marginBottom:'8px'}}>📋 Submission Details</div>
                  {liveSub&&<>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:'5px'}}>
                      <span style={{fontSize:'11px',color:'#4a5568'}}>Amount:</span>
                      <span style={{fontSize:'11px',color:'#eef2f7',fontWeight:'700'}}>15 USDT</span>
                    </div>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:'5px'}}>
                      <span style={{fontSize:'11px',color:'#4a5568'}}>Status:</span>
                      <span style={{fontSize:'11px',color:'#ffca28',fontWeight:'700'}}>⏳ Pending Review</span>
                    </div>
                    <div style={{marginTop:'6px'}}>
                      <span style={{fontSize:'11px',color:'#4a5568'}}>TRX Hash:</span>
                      <div style={{fontSize:'10px',color:'#00e5ff',fontFamily:'monospace',wordBreak:'break-all',marginTop:'3px'}}>{liveSub.trx_hash}</div>
                    </div>
                  </>}
                </div>
                <button onClick={()=>setShowLiveModal(false)} style={{width:'100%',padding:'14px',background:'linear-gradient(135deg,#00e5ff,#00ff88)',border:'none',borderRadius:'14px',color:'#070a12',fontSize:'14px',fontWeight:'800',cursor:'pointer'}}>ঠিক আছে</button>
              </div>
            </>}

            {/* ── STEP: ACTIVE ── */}
            {liveStep==='active'&&<>
              <div style={{padding:'24px 20px',textAlign:'center'}}>
                <div style={{display:'inline-flex',alignItems:'center',gap:'8px',background:'rgba(255,69,96,.15)',border:'1px solid rgba(255,69,96,.4)',borderRadius:'20px',padding:'8px 20px',marginBottom:'16px'}}>
                  <span style={{width:'10px',height:'10px',borderRadius:'50%',background:'#ff4560',display:'inline-block',animation:'liveGlow 1.5s infinite'}}/>
                  <span style={{fontSize:'13px',fontWeight:'900',color:'#ff4560',letterSpacing:'2px'}}>LIVE ACTIVE</span>
                </div>
                <div style={{fontSize:'20px',fontWeight:'900',color:'#eef2f7',marginBottom:'6px'}}>তুমি Live করতে পারবে! 🎉</div>
                {liveSub?.expires_at&&<div style={{fontSize:'12px',color:'#4a5568',marginBottom:'20px'}}>
                  Expires: {new Date(liveSub.expires_at).toLocaleDateString('bn-BD')}
                </div>}
              </div>
              <div style={{margin:'0 16px',display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px',marginBottom:'16px'}}>
                {[['👁','Viewers','0'],['❤️','Likes','0'],['💬','Comments','0'],['🎁','Gifts','0']].map(([ic,lb,vl],i)=>(
                  <div key={i} style={{background:'rgba(255,255,255,.04)',borderRadius:'12px',padding:'14px',textAlign:'center',border:'1px solid rgba(255,255,255,.07)'}}>
                    <div style={{fontSize:'22px',marginBottom:'4px'}}>{ic}</div>
                    <div style={{fontSize:'18px',fontWeight:'900',color:'#eef2f7'}}>{vl}</div>
                    <div style={{fontSize:'10px',color:'#4a5568'}}>{lb}</div>
                  </div>
                ))}
              </div>
              <div style={{padding:'0 16px'}}>
                <button onClick={()=>{ setShowLiveModal(false); window.location.href='/live/broadcast' }} style={{width:'100%',padding:'16px',background:'linear-gradient(135deg,#ff4560,#ff6b35)',border:'none',borderRadius:'16px',color:'#fff',fontSize:'16px',fontWeight:'900',cursor:'pointer',marginBottom:'10px',boxShadow:'0 4px 24px rgba(255,69,96,.4)'}}>
                  🔴 Live শুরু করুন
                </button>
                <button onClick={()=>setShowLiveModal(false)} style={{width:'100%',padding:'14px',background:'rgba(255,255,255,.06)',border:'none',borderRadius:'14px',color:'#eef2f7',fontSize:'14px',fontWeight:'700',cursor:'pointer'}}>Cancel</button>
              </div>
            </>}

            {/* ── STEP: FREE ($1000+ investor) ── */}
            {liveStep==='free'&&<>
              <div style={{padding:'24px 20px',textAlign:'center'}}>
                <div style={{position:'relative',display:'inline-block',marginBottom:'16px'}}>
                  <div style={{width:'90px',height:'90px',borderRadius:'50%',background:'linear-gradient(135deg,#ffd700,#ff6b35)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'42px',margin:'0 auto',boxShadow:'0 0 30px rgba(255,215,0,.3)'}}>👑</div>
                  <div style={{position:'absolute',top:'-4px',right:'-4px',background:'#ff4560',borderRadius:'50%',width:'26px',height:'26px',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'12px',border:'2px solid #0d1220'}}>🔴</div>
                </div>
                <div style={{fontSize:'22px',fontWeight:'900',background:'linear-gradient(135deg,#ffd700,#ff6b35)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',marginBottom:'6px'}}>Elite Investor Perk! 👑</div>
                <div style={{fontSize:'13px',color:'#4a5568',lineHeight:'1.7',marginBottom:'20px'}}>
                  তুমি <span style={{color:'#ffd700',fontWeight:'800'}}>${Math.round(investTotal)}</span> invest করেছ।<br/>
                  Elite Investor হিসেবে Live সম্পূর্ণ <span style={{color:'#00ff88',fontWeight:'800'}}>FREE</span>!
                </div>
                <div style={{background:'linear-gradient(135deg,rgba(255,215,0,.08),rgba(255,107,53,.06))',border:'1px solid rgba(255,215,0,.2)',borderRadius:'16px',padding:'16px',marginBottom:'20px',textAlign:'left'}}>
                  {[['👑','Elite Investor perks — সব free'],['🔴','Unlimited live streaming'],['💬','Priority live chat'],['🎁','Premium gift effects'],['📊','Advanced analytics'],['⭐','Verified Live badge']].map(([ic,f],i)=>(
                    <div key={i} style={{display:'flex',gap:'8px',alignItems:'center',marginBottom:'7px'}}>
                      <span style={{fontSize:'14px'}}>{ic}</span>
                      <span style={{fontSize:'12px',color:'#b0b8c8'}}>{f}</span>
                    </div>
                  ))}
                </div>
                <button onClick={()=>{ setShowLiveModal(false); window.location.href='/live/broadcast' }} style={{width:'100%',padding:'16px',background:'linear-gradient(135deg,#ffd700,#ff6b35)',border:'none',borderRadius:'16px',color:'#070a12',fontSize:'16px',fontWeight:'900',cursor:'pointer',marginBottom:'10px',boxShadow:'0 4px 24px rgba(255,215,0,.35)'}}>
                  👑 Live শুরু করুন — FREE
                </button>
                <button onClick={()=>setShowLiveModal(false)} style={{width:'100%',padding:'14px',background:'rgba(255,255,255,.06)',border:'none',borderRadius:'14px',color:'#eef2f7',fontSize:'14px',fontWeight:'700',cursor:'pointer'}}>Cancel</button>
              </div>
            </>}

          </div>
        </div>
      )}

            {/* TOP BAR */}
      <div style={{position:'sticky',top:0,zIndex:100,background:'rgba(7,10,16,.97)',backdropFilter:'blur(14px)',borderBottom:'1px solid rgba(255,255,255,.07)'}}>
        <div style={{padding:'0 12px',height:'54px',display:'flex',alignItems:'center',gap:'8px'}}>
          <div onClick={()=>window.location.href='/search'} style={{flex:1,background:'rgba(255,255,255,.06)',border:'1px solid rgba(255,255,255,.12)',borderRadius:'22px',padding:'9px 14px',color:'#4a5568',fontSize:'13px',cursor:'pointer',display:'flex',alignItems:'center',gap:'6px',minWidth:0}}>
            <span>🔍</span><span style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>Search Echo World...</span>
          </div>
          {/* LIVE button */}
          <button onClick={()=>setShowLiveModal(true)} style={{background:'rgba(255,69,96,.15)',border:'1px solid rgba(255,69,96,.4)',borderRadius:'10px',padding:'6px 10px',display:'flex',alignItems:'center',gap:'4px',cursor:'pointer',flexShrink:0,animation:'liveGlow 2s infinite'}}>
            <span style={{width:'8px',height:'8px',borderRadius:'50%',background:'#ff4560',display:'inline-block',flexShrink:0}}/>
            <span style={{fontSize:'11px',fontWeight:'800',color:'#ff4560'}}>LIVE</span>
          </button>
          <div style={{position:'relative'}}>
            <button onClick={()=>window.location.href='/messages'} style={{background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.1)',borderRadius:'50%',width:'36px',height:'36px',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',fontSize:'16px'}}>✉️</button>
            {dmCount>0&&<div style={{position:'absolute',top:'-3px',right:'-3px',background:'#00e5ff',borderRadius:'50%',width:'15px',height:'15px',fontSize:'8px',fontWeight:'700',display:'flex',alignItems:'center',justifyContent:'center',color:'#070a10'}}>{dmCount>9?'9+':dmCount}</div>}
          </div>
          <div style={{position:'relative'}}>
            <button onClick={()=>window.location.href='/notifications'} style={{background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.1)',borderRadius:'50%',width:'36px',height:'36px',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',fontSize:'16px'}}>🔔</button>
            {notifCount>0&&<div style={{position:'absolute',top:'-3px',right:'-3px',background:'#ff4560',borderRadius:'50%',width:'15px',height:'15px',fontSize:'8px',fontWeight:'700',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff'}}>{notifCount>9?'9+':notifCount}</div>}
          </div>
          <button onClick={()=>{if(deferredPrompt)deferredPrompt.prompt()}} style={{background:installed?'rgba(0,255,136,.1)':'linear-gradient(135deg,#00ff88,#00e5ff)',border:installed?'1px solid rgba(0,255,136,.3)':'2px solid rgba(0,255,136,.6)',borderRadius:'10px',width:'42px',height:'36px',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',cursor:'pointer',flexShrink:0,gap:'1px'}}>
            <span style={{fontSize:'10px'}}>{installed?'✓':'⬇'}</span>
            <span style={{fontSize:'7px',color:installed?'#00ff88':'#070a10',fontWeight:'700'}}>{installed?'APP':'GET'}</span>
          </button>
          <button onClick={()=>window.location.href='/settings'} style={{background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.1)',borderRadius:'50%',width:'36px',height:'36px',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',fontSize:'16px',flexShrink:0}}>⚙️</button>
        </div>
        <div style={{display:'flex',gap:'4px',padding:'0 10px 10px',overflowX:'auto',scrollbarWidth:'none'}}>
          {[['all','🌍 All'],['photos','📸 Photos'],['videos','🎬 Videos'],['capsules','📦 Capsules']].map(([key,label])=>(
            <button key={key} onClick={()=>setActiveTab(key)} style={{padding:'6px 14px',borderRadius:'20px',border:'none',cursor:'pointer',fontSize:'12px',fontWeight:'700',whiteSpace:'nowrap',flexShrink:0,background:activeTab===key?'linear-gradient(135deg,#00e5ff,#00ff88)':'rgba(255,255,255,.06)',color:activeTab===key?'#070a12':'#4a5568'}}>{label}</button>
          ))}
        </div>
      </div>

      {/* BOTTOM NAV */}
      <div style={{position:'fixed',bottom:0,left:0,right:0,background:'rgba(7,10,16,.98)',borderTop:'1px solid rgba(255,255,255,.07)',display:'flex',justifyContent:'space-around',padding:'10px 0 20px',zIndex:100}}>
        {[['🏠','Home','/feed'],['🗺','Map','/map'],['📸','Post','/post'],['🏆','Rank','/leaderboard'],['👤','Me','/profile']].map(([icon,label,path])=>(
          <div key={label} onClick={()=>window.location.href=path} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'3px',cursor:'pointer',color:path==='/feed'?'#00e5ff':'#4a5568'}}>
            <span style={{fontSize:'22px'}}>{icon}</span>
            <span style={{fontSize:'10px',fontWeight:'600'}}>{label}</span>
          </div>
        ))}
      </div>

      <div style={{paddingTop:'8px'}}>
        {/* STORIES */}
        {stories.length>0&&<div style={{display:'flex',gap:'12px',overflowX:'auto',padding:'0 12px 14px',scrollbarWidth:'none'}}>
          <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'5px',cursor:'pointer',flexShrink:0}} onClick={()=>window.location.href='/post?story=1'}>
            <div style={{width:'62px',height:'62px',borderRadius:'50%',background:'rgba(255,255,255,.04)',border:'2px dashed rgba(0,229,255,.4)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'26px'}}>+</div>
            <span style={{fontSize:'10px',color:'#4a5568',fontWeight:'600'}}>Add</span>
          </div>
          {stories.map((sg,i)=><div key={i} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'5px',cursor:'pointer',flexShrink:0}} onClick={()=>setStoryGroup(sg)}>
            <div style={{width:'62px',height:'62px',borderRadius:'50%',padding:'2px',background:'linear-gradient(135deg,#00e5ff,#00ff88)',animation:'storyGlow 2s infinite'}}>
              <div style={{width:'100%',height:'100%',borderRadius:'50%',overflow:'hidden',border:'2px solid #070a10',background:'#111620',display:'flex',alignItems:'center',justifyContent:'center'}}>
                {sg.profile?.avatar_url?<img src={sg.profile.avatar_url} style={{width:'100%',height:'100%',objectFit:'cover'}} onError={e=>e.target.style.display='none'}/>:<span style={{fontSize:'20px',fontWeight:'800',color:'#00e5ff'}}>{(sg.profile?.full_name||sg.profile?.username||'U')[0].toUpperCase()}</span>}
              </div>
            </div>
            <span style={{fontSize:'10px',color:'#8892a4',fontWeight:'600',maxWidth:'62px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',textAlign:'center'}}>{sg.profile?.username}</span>
          </div>)}
        </div>}

        {/* LIVE CARDS */}
        {activeLives.length>0&&(
          <div style={{margin:'0 12px 14px'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'10px'}}>
              <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                <span style={{width:'8px',height:'8px',borderRadius:'50%',background:'#ff4560',display:'inline-block',animation:'liveGlow 1.5s infinite'}}/>
                <span style={{fontSize:'14px',fontWeight:'900',color:'#eef2f7'}}>LIVE এখন</span>
                <span style={{fontSize:'11px',background:'rgba(255,69,96,.15)',color:'#ff4560',borderRadius:'8px',padding:'2px 8px',fontWeight:'700'}}>{activeLives.length}</span>
              </div>
            </div>
            <div style={{display:'flex',gap:'10px',overflowX:'auto',scrollbarWidth:'none',paddingBottom:'4px'}}>
              {activeLives.map(live=>(
                <div key={live.id} onClick={()=>window.location.href=`/live/watch?channel=${live.channel_name}`}
                  style={{flexShrink:0,width:'150px',borderRadius:'14px',overflow:'hidden',cursor:'pointer',border:'2px solid rgba(255,69,96,.4)',position:'relative',background:'#000'}}>
                  {/* Thumbnail */}
                  <div style={{width:'150px',height:'200px',background:'linear-gradient(135deg,#1a1f2e,#0d1220)',display:'flex',alignItems:'center',justifyContent:'center',position:'relative'}}>
                    {live.thumbnail_url
                      ?<img src={live.thumbnail_url} style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                      :<div style={{fontSize:'36px',opacity:.4}}>📺</div>}
                    {/* Gradient overlay */}
                    <div style={{position:'absolute',inset:0,background:'linear-gradient(transparent 40%,rgba(0,0,0,.85))'}}/>
                    {/* LIVE badge */}
                    <div style={{position:'absolute',top:'8px',left:'8px',display:'flex',alignItems:'center',gap:'4px',background:'rgba(255,69,96,.9)',borderRadius:'6px',padding:'3px 8px'}}>
                      <span style={{width:'5px',height:'5px',borderRadius:'50%',background:'#fff',display:'inline-block'}}/>
                      <span style={{fontSize:'9px',fontWeight:'900',color:'#fff',letterSpacing:'1px'}}>LIVE</span>
                    </div>
                    {/* Viewers */}
                    <div style={{position:'absolute',top:'8px',right:'8px',background:'rgba(0,0,0,.7)',borderRadius:'6px',padding:'3px 7px',display:'flex',alignItems:'center',gap:'3px'}}>
                      <span style={{fontSize:'10px'}}>👁</span>
                      <span style={{fontSize:'10px',fontWeight:'700',color:'#fff'}}>{live.viewer_count||0}</span>
                    </div>
                    {/* Bottom info */}
                    <div style={{position:'absolute',bottom:'8px',left:'8px',right:'8px'}}>
                      <div style={{display:'flex',alignItems:'center',gap:'5px',marginBottom:'3px'}}>
                        <div style={{width:'22px',height:'22px',borderRadius:'50%',background:'linear-gradient(135deg,#00e5ff,#00ff88)',overflow:'hidden',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'9px',fontWeight:'800',color:'#070a12'}}>
                          {live.profiles?.avatar_url
                            ?<img src={live.profiles.avatar_url} style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                            :(live.profiles?.full_name||live.profiles?.username||'?')[0].toUpperCase()}
                        </div>
                        <span style={{fontSize:'11px',fontWeight:'700',color:'#fff',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{live.profiles?.full_name||live.profiles?.username}</span>
                      </div>
                      <div style={{fontSize:'10px',color:'rgba(255,255,255,.75)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{live.title||'Live Stream'}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* MAP CTA */}
        <div style={{background:'#111620',border:'1px solid rgba(255,255,255,.07)',borderRadius:'16px',padding:'12px 14px',margin:'0 12px 14px',display:'flex',gap:'10px',alignItems:'center',cursor:'pointer'}} onClick={()=>window.location.href='/map'}>
          <div style={{width:'36px',height:'36px',borderRadius:'50%',background:'linear-gradient(135deg,#00e5ff,#00ff88)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,fontSize:'18px'}}>🧭</div>
          <div style={{flex:1}}><div style={{fontSize:'13px',fontWeight:'700',color:'#eef2f7'}}>Echo World Map</div><div style={{fontSize:'11px',color:'#4a5568'}}>আশেপাশের মানুষদের দেখো</div></div>
          <span style={{color:'#00e5ff',fontSize:'16px'}}>→</span>
        </div>

        {/* POSTS */}
        {loading?(
          <div style={{textAlign:'center',padding:'60px 20px'}}><div style={{fontSize:'32px',animation:'spin 1s linear infinite'}}>⬡</div></div>
        ):filteredPosts.length===0?(
          <div style={{textAlign:'center',padding:'60px 20px'}}>
            <div style={{fontSize:'48px',marginBottom:'16px'}}>🗺</div>
            <div style={{color:'#8892a4',fontSize:'16px',marginBottom:'16px'}}>No posts yet</div>
            <button onClick={()=>window.location.href='/post'} style={{background:'linear-gradient(135deg,#00e5ff,#00ff88)',border:'none',borderRadius:'12px',padding:'12px 28px',fontSize:'14px',fontWeight:'700',color:'#070a10',cursor:'pointer'}}>Create First Post</button>
          </div>
        ):filteredPosts.map(post=>(
          <div key={post.id} style={{background:'#111620',border:'1px solid rgba(255,255,255,.07)',borderRadius:'16px',margin:'0 12px 14px',overflow:'hidden',animation:'fadeUp .3s ease'}}>
            {/* Header */}
            <div style={{display:'flex',alignItems:'center',gap:'10px',padding:'12px 14px 8px'}}>
              <div onClick={()=>post.profiles?.id&&(window.location.href=`/user/${post.profiles.id}`)} style={{width:'42px',height:'42px',borderRadius:'50%',background:'linear-gradient(135deg,#00e5ff,#00ff88)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,overflow:'hidden',cursor:'pointer',border:'2px solid rgba(0,229,255,.2)'}}>
                {post.profiles?.avatar_url?<img src={post.profiles.avatar_url} style={{width:'100%',height:'100%',objectFit:'cover'}} onError={e=>e.target.style.display='none'}/>:<span style={{fontSize:'16px',fontWeight:'800',color:'#070a10'}}>{(getName(post)[0]||'U').toUpperCase()}</span>}
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                  <div onClick={()=>post.profiles?.id&&(window.location.href=`/user/${post.profiles.id}`)} style={{fontSize:'14px',fontWeight:'700',cursor:'pointer'}}>{getName(post)}</div>
                  {user?.id!==post.user_id&&<button onClick={()=>handleSupport(post.profiles?.id)} style={{padding:'2px 10px',borderRadius:'12px',border:`1px solid ${supported[post.profiles?.id]?'rgba(0,229,255,.3)':'rgba(255,255,255,.15)'}`,background:supported[post.profiles?.id]?'rgba(0,229,255,.08)':'transparent',color:supported[post.profiles?.id]?'#00e5ff':'#4a5568',fontSize:'10px',fontWeight:'600',cursor:'pointer'}}>{supported[post.profiles?.id]?'✓ Supporting':'+ Support'}</button>}
                </div>
                <div style={{fontSize:'11px',color:'#4a5568'}}>@{post.profiles?.username||''} · {timeAgo(post.created_at)}</div>
                {post.location_name&&<div style={{fontSize:'11px',color:'#00e5ff'}}>📍 {post.location_name}</div>}
              </div>
              <div style={{fontSize:'12px',color:'#2a3040',flexShrink:0}}>{post.privacy==='private'?'🔒':post.privacy==='friends'?'👥':'🌍'}</div>
            </div>

            {/* Photo */}
            {post.media_url&&post.media_type==='photo'&&<img src={post.media_url} onClick={()=>setLightboxImg(post.media_url)} style={{width:'100%',maxHeight:'450px',objectFit:'cover',display:'block',cursor:'zoom-in'}} onError={e=>e.target.style.display='none'}/>}

            {/* Video */}
            {post.media_url&&(post.media_type==='video'||post.media_url?.match(/\.(mp4|webm|mov)/i))&&(()=>{
              const dur=videoDurations[post.id]
              const isLong=dur!==undefined&&dur>60
              return (
                <div style={{position:'relative'}}>
                  {dur===undefined&&<video src={post.media_url} style={{display:'none'}} preload="metadata" onLoadedMetadata={e=>{try{setVideoDurations(p=>({...p,[post.id]:e.target.duration||0}))}catch(er){}}}/>}
                  {!isLong&&(
                    <div style={{position:'relative',cursor:'pointer'}} onClick={()=>openShortVideo(post)}>
                      <video ref={el=>{if(el){videoRefs.current[post.id]=el;try{observerRef.current?.observe(el)}catch(er){}}}} src={post.media_url} playsInline muted loop style={{width:'100%',maxHeight:'480px',display:'block',background:'#000',objectFit:'cover'}}/>
                      <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(0,0,0,.1)'}}>
                        <div style={{width:'54px',height:'54px',borderRadius:'50%',background:'rgba(0,0,0,.6)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'22px',border:'2px solid rgba(255,255,255,.7)'}}>▶</div>
                      </div>
                      <div style={{position:'absolute',top:'10px',left:'10px',background:'rgba(255,0,0,.9)',borderRadius:'6px',padding:'2px 8px',fontSize:'10px',fontWeight:'800',color:'#fff'}}>SHORT</div>
                      {dur>0&&<div style={{position:'absolute',bottom:'10px',right:'10px',background:'rgba(0,0,0,.75)',borderRadius:'4px',padding:'2px 7px',fontSize:'11px',fontWeight:'700',color:'#fff'}}>{fmtDur(dur)}</div>}
                    </div>
                  )}
                  {isLong&&(
                    <div onClick={()=>setOpenVideo(post)} style={{position:'relative',background:'#000',cursor:'pointer',paddingBottom:'56.25%',overflow:'hidden'}}>
                      {post.image_url?<img src={post.image_url} style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover'}} onError={e=>e.target.style.display='none'}/>:<video src={post.media_url} style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover'}} preload="metadata" muted/>}
                      <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(0,0,0,.2)'}}>
                        <div style={{width:'62px',height:'62px',borderRadius:'50%',background:'rgba(0,0,0,.75)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'28px',border:'3px solid rgba(255,255,255,.9)'}}>▶</div>
                      </div>
                      <div style={{position:'absolute',top:'10px',left:'10px',background:'rgba(255,0,0,.9)',borderRadius:'6px',padding:'2px 8px',fontSize:'10px',fontWeight:'800',color:'#fff'}}>VIDEO</div>
                      <div style={{position:'absolute',bottom:'10px',right:'10px',background:'rgba(0,0,0,.75)',borderRadius:'4px',padding:'2px 7px',fontSize:'11px',fontWeight:'700',color:'#fff'}}>{fmtDur(dur)}</div>
                    </div>
                  )}
                </div>
              )
            })()}

            {/* Capsule */}
            {post.media_type==='capsule'&&<div style={{margin:'0 14px 8px',background:'rgba(255,202,40,.06)',border:'1px solid rgba(255,202,40,.2)',borderRadius:'12px',padding:'16px',display:'flex',gap:'12px',alignItems:'center'}}>
              <span style={{fontSize:'28px'}}>📦</span>
              <div><div style={{fontSize:'13px',fontWeight:'700',color:'#ffca28'}}>🔒 Time Capsule</div><div style={{fontSize:'11px',color:'#4a5568',marginTop:'2px'}}>Visit within 300m to unlock</div></div>
            </div>}

            {post.content&&<div style={{padding:'8px 14px',fontSize:'14px',color:'#c0c8d8',lineHeight:'1.6'}}>{post.content}</div>}
            {post.hashtags&&<div style={{padding:'0 14px 8px',fontSize:'12px',color:'#00e5ff'}}>{post.hashtags}</div>}

            {/* Actions */}
            <div style={{display:'flex',padding:'4px 6px 10px',borderTop:'1px solid rgba(255,255,255,.04)',gap:'4px'}}>
              <button onClick={()=>handleLike(post)} style={{display:'flex',alignItems:'center',gap:'5px',padding:'8px 12px',border:'none',background:'none',cursor:'pointer',color:liked[post.id]?'#ff4560':'#4a5568',fontSize:'13px',borderRadius:'8px',transition:'all .2s'}}>
                {liked[post.id]?'❤️':'🤍'} {fmtCount(post.likes_count||0)}
              </button>
              <button onClick={()=>window.location.href=`/comments/${post.id}`} style={{display:'flex',alignItems:'center',gap:'5px',padding:'8px 12px',border:'none',background:'none',cursor:'pointer',color:'#4a5568',fontSize:'13px',borderRadius:'8px'}}>
                💬 {fmtCount(post.comments_count||0)}
              </button>
              <button onClick={()=>{try{navigator.share({text:post.content||'',url:`${window.location.origin}/comments/${post.id}`})}catch(e){}}} style={{display:'flex',alignItems:'center',gap:'5px',padding:'8px 12px',border:'none',background:'none',cursor:'pointer',color:'#4a5568',fontSize:'13px',borderRadius:'8px'}}>↗ Share</button>
              {(post.media_type==='video'||post.media_url?.match(/\.(mp4|webm|mov)/i))&&<button onClick={()=>{const d=videoDurations[post.id];if(!d||d<=60)openShortVideo(post);else setOpenVideo(post)}} style={{display:'flex',alignItems:'center',gap:'4px',padding:'8px 10px',border:'none',background:'none',cursor:'pointer',color:'#ff4560',fontSize:'12px',fontWeight:'700',borderRadius:'8px'}}>▶ Watch</button>}
              <button onClick={()=>window.location.href='/map'} style={{marginLeft:'auto',display:'flex',alignItems:'center',gap:'4px',padding:'8px 10px',border:'none',background:'none',cursor:'pointer',color:'#00e5ff',fontSize:'12px'}}>🗺 Map</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
                                  }
