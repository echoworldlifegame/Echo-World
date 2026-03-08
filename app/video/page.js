'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

// ─── Format helpers ───────────────────────────────────
const fmtTime = (s) => {
  if (isNaN(s)) return '0:00'
  const m = Math.floor(s / 60), sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}
const fmtCount = (n) => n >= 1000000 ? (n/1000000).toFixed(1)+'M' : n >= 1000 ? (n/1000).toFixed(1)+'K' : String(n||0)
const timeAgo = (d) => {
  const s = Math.floor((Date.now() - new Date(d)) / 1000)
  if (s < 60) return 'এইমাত্র'
  if (s < 3600) return Math.floor(s/60) + ' মিনিট আগে'
  if (s < 86400) return Math.floor(s/3600) + ' ঘণ্টা আগে'
  if (s < 2592000) return Math.floor(s/86400) + ' দিন আগে'
  return Math.floor(s/2592000) + ' মাস আগে'
}

// ─── YouTube Style Video Player ───────────────────────
function VideoPlayer({ src, poster, onEnded }) {
  const videoRef = useRef(null)
  const progressRef = useRef(null)
  const containerRef = useRef(null)
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [muted, setMuted] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [buffered, setBuffered] = useState(0)
  const [quality, setQuality] = useState('Auto')
  const [showQuality, setShowQuality] = useState(false)
  const [showVolume, setShowVolume] = useState(false)
  const [seeking, setSeeking] = useState(false)
  const hideTimer = useRef(null)

  const resetHideTimer = useCallback(() => {
    setShowControls(true)
    clearTimeout(hideTimer.current)
    hideTimer.current = setTimeout(() => { if (playing) setShowControls(false) }, 3000)
  }, [playing])

  useEffect(() => {
    resetHideTimer()
    return () => clearTimeout(hideTimer.current)
  }, [playing, resetHideTimer])

  const togglePlay = () => {
    const v = videoRef.current; if (!v) return
    if (v.paused) { v.play(); setPlaying(true) }
    else { v.pause(); setPlaying(false) }
    resetHideTimer()
  }

  const handleProgress = (e) => {
    const v = videoRef.current; if (!v) return
    setCurrentTime(v.currentTime)
    if (v.buffered.length > 0) setBuffered(v.buffered.end(v.buffered.length-1) / v.duration * 100)
  }

  const seek = (e) => {
    const v = videoRef.current; const bar = progressRef.current
    if (!v || !bar) return
    const rect = bar.getBoundingClientRect()
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left
    const pct = Math.max(0, Math.min(1, x / rect.width))
    v.currentTime = pct * v.duration
    setCurrentTime(v.currentTime)
  }

  const toggleFullscreen = () => {
    const el = containerRef.current
    if (!document.fullscreenElement) {
      el?.requestFullscreen?.()
      setFullscreen(true)
    } else {
      document.exitFullscreen?.()
      setFullscreen(false)
    }
  }

  const skip = (sec) => {
    const v = videoRef.current; if (!v) return
    v.currentTime = Math.max(0, Math.min(v.duration, v.currentTime + sec))
    resetHideTimer()
  }

  const pct = duration ? (currentTime / duration * 100) : 0

  return (
    <div ref={containerRef}
      style={{ position:'relative', background:'#000', borderRadius: fullscreen?0:'0', overflow:'hidden', userSelect:'none' }}
      onMouseMove={resetHideTimer} onTouchStart={resetHideTimer}
      onClick={togglePlay}>
      <video ref={videoRef} src={src} poster={poster} style={{ width:'100%', display:'block', maxHeight: fullscreen?'100vh':'280px', objectFit:'contain' }}
        onTimeUpdate={handleProgress} onLoadedMetadata={e => setDuration(e.target.duration)}
        onEnded={() => { setPlaying(false); onEnded?.() }}
        onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)}
        playsInline preload="metadata" />

      {/* Center play/pause indicator */}
      {!playing && (
        <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', width:'64px', height:'64px', borderRadius:'50%', background:'rgba(0,0,0,.6)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'28px', pointerEvents:'none' }}>
          ▶
        </div>
      )}

      {/* Skip zones */}
      <div style={{ position:'absolute', top:0, left:0, width:'35%', height:'80%' }} onClick={e=>{e.stopPropagation();skip(-10);resetHideTimer()}} />
      <div style={{ position:'absolute', top:0, right:0, width:'35%', height:'80%' }} onClick={e=>{e.stopPropagation();skip(10);resetHideTimer()}} />

      {/* Controls overlay */}
      <div style={{ position:'absolute', bottom:0, left:0, right:0, background:'linear-gradient(transparent,rgba(0,0,0,.85))', padding:'0 10px 10px', transition:'opacity .3s', opacity: showControls?1:0, pointerEvents: showControls?'auto':'none' }}
        onClick={e => e.stopPropagation()}>

        {/* Progress bar */}
        <div ref={progressRef} style={{ height:'14px', display:'flex', alignItems:'center', cursor:'pointer', marginBottom:'4px' }}
          onClick={seek} onTouchEnd={seek}>
          <div style={{ position:'relative', width:'100%', height:'4px', background:'rgba(255,255,255,.3)', borderRadius:'2px' }}>
            {/* buffered */}
            <div style={{ position:'absolute', left:0, top:0, height:'100%', width:`${buffered}%`, background:'rgba(255,255,255,.4)', borderRadius:'2px' }} />
            {/* played */}
            <div style={{ position:'absolute', left:0, top:0, height:'100%', width:`${pct}%`, background:'#ff0000', borderRadius:'2px', transition:'width .1s' }} />
            {/* thumb */}
            <div style={{ position:'absolute', top:'50%', left:`${pct}%`, transform:'translate(-50%,-50%)', width:'14px', height:'14px', borderRadius:'50%', background:'#ff0000' }} />
          </div>
        </div>

        {/* Bottom controls */}
        <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
          {/* Play/Pause */}
          <button onClick={togglePlay} style={{ background:'none', border:'none', color:'#fff', fontSize:'20px', cursor:'pointer', padding:'2px 6px' }}>
            {playing ? '⏸' : '▶'}
          </button>

          {/* Skip */}
          <button onClick={() => skip(-10)} style={{ background:'none', border:'none', color:'#fff', fontSize:'13px', cursor:'pointer', padding:'2px' }}>⏪10</button>
          <button onClick={() => skip(10)} style={{ background:'none', border:'none', color:'#fff', fontSize:'13px', cursor:'pointer', padding:'2px' }}>10⏩</button>

          {/* Volume */}
          <div style={{ position:'relative' }}>
            <button onClick={() => { setMuted(p=>!p); videoRef.current && (videoRef.current.muted = !muted) }}
              style={{ background:'none', border:'none', color:'#fff', fontSize:'18px', cursor:'pointer', padding:'2px' }}>
              {muted || volume===0 ? '🔇' : volume < 0.5 ? '🔉' : '🔊'}
            </button>
          </div>

          {/* Time */}
          <span style={{ color:'#fff', fontSize:'11px', flex:1 }}>{fmtTime(currentTime)} / {fmtTime(duration)}</span>

          {/* Quality */}
          <div style={{ position:'relative' }}>
            <button onClick={() => setShowQuality(p=>!p)}
              style={{ background:'rgba(255,255,255,.15)', border:'1px solid rgba(255,255,255,.2)', color:'#fff', fontSize:'10px', fontWeight:'700', borderRadius:'4px', padding:'3px 7px', cursor:'pointer' }}>
              {quality}
            </button>
            {showQuality && (
              <div style={{ position:'absolute', bottom:'30px', right:0, background:'rgba(0,0,0,.95)', borderRadius:'8px', overflow:'hidden', minWidth:'80px', border:'1px solid rgba(255,255,255,.1)' }}>
                {['Auto','1080p','720p','480p','360p'].map(q => (
                  <div key={q} onClick={() => { setQuality(q); setShowQuality(false) }}
                    style={{ padding:'8px 14px', fontSize:'12px', color: quality===q ? '#ff0000' : '#eef2f7', background: quality===q ? 'rgba(255,0,0,.1)' : 'transparent', cursor:'pointer', fontWeight: quality===q ? '800' : '400' }}>
                    {q === quality ? '✓ ' : ''}{q}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Fullscreen */}
          <button onClick={toggleFullscreen}
            style={{ background:'none', border:'none', color:'#fff', fontSize:'18px', cursor:'pointer', padding:'2px' }}>
            {fullscreen ? '⛶' : '⛶'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Comments Section ─────────────────────────────────
function Comments({ postId, user }) {
  const [comments, setComments] = useState([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => { loadComments() }, [postId])

  const loadComments = async () => {
    const { data } = await supabase.from('comments')
      .select('*, profiles(id,username,full_name,avatar_url)')
      .eq('post_id', postId).order('created_at', { ascending: false }).limit(30)
    setComments(data || [])
  }

  const submit = async () => {
    if (!text.trim() || !user) return
    setLoading(true)
    await supabase.from('comments').insert({ post_id: postId, user_id: user.id, content: text.trim() })
    setText(''); setLoading(false); loadComments()
  }

  return (
    <div style={{ marginTop:'16px' }}>
      <div style={{ fontSize:'14px', fontWeight:'800', color:'#eef2f7', marginBottom:'12px' }}>
        💬 {comments.length} Comments
      </div>
      {/* Input */}
      {user && (
        <div style={{ display:'flex', gap:'8px', marginBottom:'14px' }}>
          <input value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>e.key==='Enter'&&submit()}
            placeholder='মন্তব্য লিখুন...'
            style={{ flex:1, background:'rgba(255,255,255,.06)', border:'1px solid rgba(255,255,255,.1)', borderRadius:'24px', padding:'10px 16px', color:'#eef2f7', fontSize:'13px', outline:'none' }} />
          <button onClick={submit} disabled={!text.trim()||loading}
            style={{ padding:'10px 16px', borderRadius:'24px', border:'none', background: text.trim()?'linear-gradient(135deg,#00e5ff,#00ff88)':'rgba(255,255,255,.06)', color: text.trim()?'#070a12':'#4a5568', fontSize:'13px', fontWeight:'800', cursor: text.trim()?'pointer':'default' }}>
            Post
          </button>
        </div>
      )}
      {/* Comment list */}
      {comments.map(c => (
        <div key={c.id} style={{ display:'flex', gap:'10px', marginBottom:'12px' }}>
          <div style={{ width:'34px', height:'34px', borderRadius:'50%', background:'linear-gradient(135deg,#00e5ff,#00ff88)', flexShrink:0, overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:'800', color:'#070a12', fontSize:'13px' }}>
            {c.profiles?.avatar_url ? <img src={c.profiles.avatar_url} style={{ width:'100%', height:'100%', objectFit:'cover' }} /> : (c.profiles?.full_name||c.profiles?.username||'?')[0].toUpperCase()}
          </div>
          <div style={{ flex:1 }}>
            <div style={{ display:'flex', gap:'8px', alignItems:'center', marginBottom:'3px' }}>
              <span style={{ fontSize:'12px', fontWeight:'700', color:'#eef2f7' }}>{c.profiles?.full_name || c.profiles?.username}</span>
              <span style={{ fontSize:'10px', color:'#4a5568' }}>{timeAgo(c.created_at)}</span>
            </div>
            <div style={{ fontSize:'13px', color:'#b0b8c8', lineHeight:'1.5' }}>{c.content}</div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Main Video Page ──────────────────────────────────
export default function VideoPage() {
  const [post, setPost] = useState(null)
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [liked, setLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const [following, setFollowing] = useState(false)
  const [recommended, setRecommended] = useState([])
  const [showComments, setShowComments] = useState(false)
  const [loading, setLoading] = useState(true)
  const [videoId, setVideoId] = useState(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const p = new URLSearchParams(window.location.search)
    const id = p.get('id')
    setVideoId(id)
    supabase.auth.getSession().then(async ({ data }) => {
      const u = data.session?.user
      if (u) {
        setUser(u)
        const { data: pr } = await supabase.from('profiles').select('*').eq('id', u.id).single()
        setProfile(pr)
      }
      if (id) loadPost(id, u?.id)
    })
  }, [])

  const loadPost = async (id, uid) => {
    setLoading(true)
    const { data: p } = await supabase.from('posts')
      .select('*, profiles(id,username,full_name,avatar_url,bio)')
      .eq('id', id).single()
    if (!p) { setLoading(false); return }
    setPost(p)
    setLikeCount(p.likes_count || 0)

    // increment views
    await supabase.from('posts').update({ views_count: (p.views_count||0)+1 }).eq('id', id)

    if (uid) {
      const { data: lk } = await supabase.from('likes').select('id').eq('post_id', id).eq('user_id', uid).maybeSingle()
      setLiked(!!lk)
      const { data: fl } = await supabase.from('followers').select('id').eq('follower_id', uid).eq('following_id', p.profiles?.id).maybeSingle()
      setFollowing(!!fl)
    }

    // Load recommended videos
    const { data: rec } = await supabase.from('posts')
      .select('*, profiles(username,full_name,avatar_url)')
      .eq('type', 'video').neq('id', id)
      .order('likes_count', { ascending: false }).limit(8)
    setRecommended(rec || [])
    setLoading(false)
  }

  const toggleLike = async () => {
    if (!user || !post) return
    if (liked) {
      await supabase.from('likes').delete().eq('post_id', post.id).eq('user_id', user.id)
      setLiked(false); setLikeCount(p => p-1)
    } else {
      await supabase.from('likes').insert({ post_id: post.id, user_id: user.id })
      setLiked(true); setLikeCount(p => p+1)
    }
  }

  const toggleFollow = async () => {
    if (!user || !post) return
    if (following) {
      await supabase.from('followers').delete().eq('follower_id', user.id).eq('following_id', post.profiles?.id)
      setFollowing(false)
    } else {
      await supabase.from('followers').insert({ follower_id: user.id, following_id: post.profiles?.id })
      setFollowing(true)
      await supabase.from('notifications').insert({ user_id: post.profiles?.id, from_user_id: user.id, type:'follow', message:`@${profile?.username} তোমাকে follow করেছে`, read:false })
    }
  }

  const share = async () => {
    const url = window.location.href
    if (navigator.share) await navigator.share({ title: post?.caption || 'Echo World Video', url })
    else { navigator.clipboard?.writeText(url); alert('Link copied!') }
  }

  if (loading) return (
    <div style={{ height:'100vh', background:'#070a12', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ width:'40px', height:'40px', border:'3px solid rgba(0,229,255,.2)', borderTop:'3px solid #00e5ff', borderRadius:'50%', animation:'spin 1s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  if (!post) return (
    <div style={{ height:'100vh', background:'#070a12', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'12px' }}>
      <div style={{ fontSize:'48px' }}>😢</div>
      <div style={{ color:'#4a5568' }}>Video পাওয়া যাচ্ছে না</div>
      <button onClick={() => window.history.back()} style={{ padding:'10px 20px', background:'linear-gradient(135deg,#00e5ff,#00ff88)', border:'none', borderRadius:'12px', fontSize:'13px', fontWeight:'800', color:'#070a12', cursor:'pointer' }}>← Back</button>
    </div>
  )

  return (
    <div style={{ minHeight:'100vh', background:'#0f1117', color:'#eef2f7', fontFamily:'system-ui,sans-serif', paddingBottom:'30px' }}>
      <style>{`*{box-sizing:border-box}::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:#0f1117}::-webkit-scrollbar-thumb{background:#2d3748;border-radius:4px}@keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* TOP BAR */}
      <div style={{ position:'sticky', top:0, zIndex:100, background:'rgba(15,17,23,.97)', backdropFilter:'blur(12px)', borderBottom:'1px solid rgba(255,255,255,.07)', height:'50px', display:'flex', alignItems:'center', padding:'0 14px', gap:'10px' }}>
        <button onClick={() => window.history.back()} style={{ background:'none', border:'none', color:'#4a5568', fontSize:'20px', cursor:'pointer' }}>←</button>
        <div style={{ flex:1, fontSize:'14px', fontWeight:'800', color:'#eef2f7', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
          {post.caption || 'Video'}
        </div>
        <button onClick={share} style={{ background:'none', border:'none', color:'#4a5568', fontSize:'20px', cursor:'pointer' }}>⬆️</button>
      </div>

      {/* VIDEO PLAYER */}
      <div style={{ background:'#000', position:'sticky', top:'50px', zIndex:90 }}>
        <VideoPlayer src={post.video_url} poster={post.thumbnail_url || post.image_url} onEnded={() => {}} />
      </div>

      <div style={{ padding:'14px', animation:'fadeUp .3s ease' }}>

        {/* Title + Views */}
        <div style={{ marginBottom:'10px' }}>
          <div style={{ fontSize:'16px', fontWeight:'800', color:'#eef2f7', lineHeight:'1.4', marginBottom:'6px' }}>{post.caption}</div>
          <div style={{ fontSize:'12px', color:'#4a5568' }}>
            {fmtCount(post.views_count||0)} views · {timeAgo(post.created_at)}
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display:'flex', gap:'4px', marginBottom:'14px', overflowX:'auto', paddingBottom:'4px' }}>
          {[
            { icon: liked?'👍':'👍', label: fmtCount(likeCount), active: liked, action: toggleLike, color:'#00e5ff' },
            { icon:'👎', label:'Dislike', active:false, action:()=>{}, color:'#4a5568' },
            { icon:'💬', label:'Comments', active:showComments, action:()=>setShowComments(p=>!p), color:'#00ff88' },
            { icon:'⬆️', label:'Share', active:false, action:share, color:'#a78bfa' },
            { icon: saved?'🔖':'🔖', label: saved?'Saved':'Save', active:saved, action:()=>setSaved(p=>!p), color:'#ffd700' },
          ].map((btn, i) => (
            <button key={i} onClick={btn.action}
              style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'4px', padding:'8px 16px', borderRadius:'24px', border:'none', cursor:'pointer', flexShrink:0, background: btn.active?`rgba(${btn.color==='#00e5ff'?'0,229,255':btn.color==='#00ff88'?'0,255,136':'167,139,250'},.15)`:'rgba(255,255,255,.06)', transition:'all .15s' }}>
              <span style={{ fontSize:'20px' }}>{btn.icon}</span>
              <span style={{ fontSize:'10px', fontWeight:'700', color: btn.active?btn.color:'#4a5568' }}>{btn.label}</span>
            </button>
          ))}
        </div>

        {/* Channel info */}
        <div style={{ display:'flex', alignItems:'center', gap:'12px', padding:'12px', background:'rgba(255,255,255,.04)', borderRadius:'14px', marginBottom:'14px' }}>
          <div onClick={() => window.location.href=`/profile?id=${post.profiles?.id}`}
            style={{ width:'44px', height:'44px', borderRadius:'50%', background:'linear-gradient(135deg,#00e5ff,#00ff88)', flexShrink:0, overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:'800', color:'#070a12', fontSize:'16px', cursor:'pointer' }}>
            {post.profiles?.avatar_url ? <img src={post.profiles.avatar_url} style={{ width:'100%', height:'100%', objectFit:'cover' }} /> : (post.profiles?.full_name||post.profiles?.username||'?')[0].toUpperCase()}
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:'14px', fontWeight:'800', color:'#eef2f7' }}>{post.profiles?.full_name || post.profiles?.username}</div>
            <div style={{ fontSize:'11px', color:'#4a5568' }}>@{post.profiles?.username}</div>
          </div>
          {user?.id !== post.profiles?.id && (
            <button onClick={toggleFollow}
              style={{ padding:'8px 18px', borderRadius:'20px', border: following?'1px solid rgba(255,255,255,.2)':'none', background: following?'transparent':'linear-gradient(135deg,#ff0000,#cc0000)', color:'#fff', fontSize:'12px', fontWeight:'800', cursor:'pointer', flexShrink:0 }}>
              {following ? 'Following' : 'Subscribe'}
            </button>
          )}
        </div>

        {/* Description */}
        {post.description && (
          <div style={{ background:'rgba(255,255,255,.04)', borderRadius:'12px', padding:'12px', marginBottom:'14px', fontSize:'13px', color:'#b0b8c8', lineHeight:'1.6' }}>
            {post.description}
          </div>
        )}

        {/* Comments */}
        {showComments && <Comments postId={post.id} user={user} />}

        {/* Recommended */}
        {recommended.length > 0 && (
          <div style={{ marginTop:'20px' }}>
            <div style={{ fontSize:'14px', fontWeight:'800', color:'#eef2f7', marginBottom:'12px' }}>🎬 আরো দেখো</div>
            {recommended.map(r => (
              <div key={r.id} onClick={() => window.location.href=`/video?id=${r.id}`}
                style={{ display:'flex', gap:'10px', marginBottom:'12px', cursor:'pointer', borderRadius:'12px', padding:'8px', background:'rgba(255,255,255,.03)', border:'1px solid rgba(255,255,255,.06)', transition:'background .15s' }}
                onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,.07)'}
                onMouseLeave={e=>e.currentTarget.style.background='rgba(255,255,255,.03)'}>
                {/* Thumbnail */}
                <div style={{ width:'120px', height:'72px', borderRadius:'8px', background:'#1a1a2e', flexShrink:0, overflow:'hidden', position:'relative' }}>
                  {r.thumbnail_url || r.image_url ? (
                    <img src={r.thumbnail_url || r.image_url} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                  ) : (
                    <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'24px' }}>🎬</div>
                  )}
                  <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <div style={{ width:'28px', height:'28px', borderRadius:'50%', background:'rgba(0,0,0,.6)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'12px' }}>▶</div>
                  </div>
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:'13px', fontWeight:'700', color:'#eef2f7', lineHeight:'1.4', marginBottom:'4px', overflow:'hidden', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' }}>
                    {r.caption || 'Video'}
                  </div>
                  <div style={{ fontSize:'11px', color:'#4a5568' }}>{r.profiles?.full_name || r.profiles?.username}</div>
                  <div style={{ fontSize:'11px', color:'#4a5568' }}>{fmtCount(r.views_count||0)} views · {timeAgo(r.created_at)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
                                     }
