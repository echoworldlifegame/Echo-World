'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default function Echo() {
  const [videos, setVideos] = useState([])
  const [user, setUser] = useState(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [liked, setLiked] = useState({})
  const [paused, setPaused] = useState(false)
  const [showHeart, setShowHeart] = useState(false)
  const [showViews, setShowViews] = useState(false)
  const [mixMode, setMixMode] = useState(false)
  const [mixVideo, setMixVideo] = useState(null)
  const [mixLayout, setMixLayout] = useState('top') // top | bottom | left | right | pip
  const [translateY, setTranslateY] = useState(0)
  const [dragging, setDragging] = useState(false)

  const videoRef = useRef(null)
  const mixVideoRef = useRef(null)
  const touchStartY = useRef(0)
  const touchStartTime = useRef(0)
  const lastTap = useRef(0)
  const dragStartY = useRef(0)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { window.location.href = '/'; return }
      const u = data.session.user
      setUser(u)

      const { data: following } = await supabase
        .from('followers').select('following_id').eq('follower_id', u.id)
      const followingIds = (following||[]).map(f=>f.following_id)

      const { data: vids } = await supabase
        .from('posts')
        .select('*, profiles(id, username, full_name, avatar_url)')
        .eq('media_type', 'video')
        .not('media_url', 'is', null)
        .order('created_at', { ascending: false })

      if (vids) {
        const sorted = [...vids].sort((a,b) => {
          const aF = followingIds.includes(a.user_id)
          const bF = followingIds.includes(b.user_id)
          if (aF && !bF) return -1
          if (!aF && bF) return 1
          return 0
        })
        setVideos(sorted)

        // Check liked status
        const { data: myLikes } = await supabase
          .from('likes').select('post_id').eq('user_id', u.id)
        const likedMap = {}
        ;(myLikes||[]).forEach(l => { likedMap[l.post_id] = true })
        setLiked(likedMap)
      }
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.play().catch(()=>{})
      setPaused(false)
    }
    // Add view count
    if (videos[currentIndex]) {
      addView(videos[currentIndex].id)
    }
  }, [currentIndex])

  const addView = async (postId) => {
    await supabase.rpc('increment_views', { post_id: postId }).catch(()=>{})
  }

  const goNext = useCallback(() => {
    if (currentIndex < videos.length - 1) {
      setTranslateY(-100)
      setTimeout(() => {
        setCurrentIndex(i => i + 1)
        setTranslateY(0)
      }, 300)
    }
  }, [currentIndex, videos.length])

  const goPrev = useCallback(() => {
    if (currentIndex > 0) {
      setTranslateY(100)
      setTimeout(() => {
        setCurrentIndex(i => i - 1)
        setTranslateY(0)
      }, 300)
    }
  }, [currentIndex])

  const handleTouchStart = (e) => {
    touchStartY.current = e.touches[0].clientY
    touchStartTime.current = Date.now()
    dragStartY.current = e.touches[0].clientY
  }

  const handleTouchMove = (e) => {
    if (dragging) {
      const diff = e.touches[0].clientY - dragStartY.current
      // slight visual drag
    }
  }

  const handleTouchEnd = (e) => {
    const diff = touchStartY.current - e.changedTouches[0].clientY
    const duration = Date.now() - touchStartTime.current
    if (Math.abs(diff) > 50 && duration < 500) {
      if (diff > 0) goNext()
      else goPrev()
    }
  }

  const handleDoubleTap = () => {
    const now = Date.now()
    if (now - lastTap.current < 300) {
      // Double tap — like!
      handleLike()
      setShowHeart(true)
      setTimeout(() => setShowHeart(false), 1000)
    }
    lastTap.current = now
  }

  const togglePlay = () => {
    if (!videoRef.current) return
    if (videoRef.current.paused) { videoRef.current.play(); setPaused(false) }
    else { videoRef.current.pause(); setPaused(true) }
  }

  const handleLike = async () => {
    if (!user || !videos[currentIndex]) return
    const vid = videos[currentIndex]
    if (liked[vid.id]) {
      // Unlike
      await supabase.from('likes').delete().eq('user_id', user.id).eq('post_id', vid.id)
      await supabase.from('posts').update({ likes_count: Math.max((vid.likes_count||1)-1,0) }).eq('id', vid.id)
      setLiked(p=>({...p,[vid.id]:false}))
      setVideos(vs=>vs.map((v,i)=>i===currentIndex?{...v,likes_count:Math.max((v.likes_count||1)-1,0)}:v))
    } else {
      // Like
      await supabase.from('likes').insert({ user_id: user.id, post_id: vid.id })
      await supabase.from('posts').update({ likes_count: (vid.likes_count||0)+1 }).eq('id', vid.id)
      setLiked(p=>({...p,[vid.id]:true}))
      setVideos(vs=>vs.map((v,i)=>i===currentIndex?{...v,likes_count:(v.likes_count||0)+1}:v))
    }
  }

  const openMix = () => {
    setMixVideo(videos[currentIndex])
    setMixMode(true)
  }

  const timeAgo = (date) => {
    const s = Math.floor((new Date() - new Date(date)) / 1000)
    if (s < 60) return 'এইমাত্র'
    if (s < 3600) return Math.floor(s/60) + 'মি'
    if (s < 86400) return Math.floor(s/3600) + 'ঘ'
    return Math.floor(s/86400) + 'দিন'
  }

  const formatNum = (n) => {
    if (!n) return '0'
    if (n >= 1000000) return (n/1000000).toFixed(1) + 'M'
    if (n >= 1000) return (n/1000).toFixed(1) + 'K'
    return n.toString()
  }

  const getName = (vid) => vid.profiles?.full_name || vid.profiles?.username || 'Explorer'
  const getUsername = (vid) => vid.profiles?.username || 'explorer'

  if (loading) return (
    <div style={{height:'100vh',background:'#000',display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:'12px'}}>
      <div style={{fontSize:'40px',animation:'pulse 1s infinite'}}>⚡</div>
      <div style={{color:'#4a5568',fontSize:'14px'}}>Loading ECHO...</div>
    </div>
  )

  if (videos.length === 0) return (
    <div style={{height:'100vh',background:'#000',display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:'16px',color:'#fff',padding:'24px',textAlign:'center'}}>
      <div style={{fontSize:'56px'}}>⚡</div>
      <div style={{fontSize:'22px',fontWeight:'800'}}>No ECHO Videos</div>
      <button onClick={()=>window.location.href='/post'} style={{background:'linear-gradient(135deg,#00e5ff,#00ff88)',border:'none',borderRadius:'14px',padding:'14px 36px',fontSize:'15px',fontWeight:'800',color:'#000',cursor:'pointer'}}>⚡ Create ECHO</button>
      <button onClick={()=>window.location.href='/feed'} style={{background:'none',border:'1px solid #222',borderRadius:'12px',padding:'10px 24px',fontSize:'13px',color:'#555',cursor:'pointer'}}>← Back</button>
    </div>
  )

  const vid = videos[currentIndex]

  // MIX MODE
  if (mixMode && mixVideo) {
    const layoutStyles = {
      top: { main: {position:'absolute',top:0,left:0,right:0,height:'50%'}, mix: {position:'absolute',bottom:0,left:0,right:0,height:'50%'} },
      bottom: { main: {position:'absolute',bottom:0,left:0,right:0,height:'50%'}, mix: {position:'absolute',top:0,left:0,right:0,height:'50%'} },
      left: { main: {position:'absolute',top:0,left:0,bottom:0,width:'50%'}, mix: {position:'absolute',top:0,right:0,bottom:0,width:'50%'} },
      right: { main: {position:'absolute',top:0,right:0,bottom:0,width:'50%'}, mix: {position:'absolute',top:0,left:0,bottom:0,width:'50%'} },
      pip: { main: {position:'absolute',inset:0}, mix: {position:'absolute',top:'16px',right:'16px',width:'120px',height:'200px',borderRadius:'12px',overflow:'hidden',border:'2px solid #00e5ff'} },
    }
    const ls = layoutStyles[mixLayout]
    return (
      <div style={{height:'100vh',background:'#000',overflow:'hidden',position:'relative'}}>
        <div style={ls.main}>
          <video ref={videoRef} src={vid.media_url} style={{width:'100%',height:'100%',objectFit:'cover'}} loop playsInline autoPlay/>
        </div>
        <div style={ls.mix}>
          <video ref={mixVideoRef} src={mixVideo.media_url} style={{width:'100%',height:'100%',objectFit:'cover'}} loop playsInline autoPlay/>
        </div>

        {/* Mix controls */}
        <div style={{position:'fixed',top:0,left:0,right:0,background:'rgba(0,0,0,0.7)',padding:'12px 16px',zIndex:300,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <button onClick={()=>setMixMode(false)} style={{background:'none',border:'none',color:'#fff',fontSize:'20px',cursor:'pointer'}}>✕</button>
          <div style={{fontSize:'14px',fontWeight:'700',color:'#00e5ff'}}>⚡ ECHO MIX</div>
          <button onClick={()=>window.location.href='/post?mix=true'} style={{background:'linear-gradient(135deg,#00e5ff,#00ff88)',border:'none',borderRadius:'20px',padding:'6px 14px',fontSize:'12px',fontWeight:'700',color:'#000',cursor:'pointer'}}>Record 🎬</button>
        </div>

        {/* Layout selector */}
        <div style={{position:'fixed',bottom:'80px',left:'50%',transform:'translateX(-50%)',zIndex:300,display:'flex',gap:'8px',background:'rgba(0,0,0,0.7)',borderRadius:'20px',padding:'8px 12px'}}>
          {[
            {key:'top',icon:'⬆'},
            {key:'bottom',icon:'⬇'},
            {key:'left',icon:'⬅'},
            {key:'right',icon:'➡'},
            {key:'pip',icon:'⊡'},
          ].map(l => (
            <button key={l.key} onClick={()=>setMixLayout(l.key)} style={{width:'36px',height:'36px',borderRadius:'50%',border:`2px solid ${mixLayout===l.key?'#00e5ff':'transparent'}`,background:mixLayout===l.key?'rgba(0,229,255,0.2)':'rgba(255,255,255,0.1)',color:'#fff',fontSize:'16px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
              {l.icon}
            </button>
          ))}
        </div>

        {/* Bottom nav */}
        <div style={{position:'fixed',bottom:0,left:0,right:0,background:'rgba(0,0,0,0.85)',borderTop:'1px solid rgba(255,255,255,0.07)',display:'flex',justifyContent:'space-around',padding:'10px 0 20px',zIndex:300}}>
          {[{icon:'🏠',path:'/feed'},{icon:'🗺',path:'/map'},{icon:'📸',path:'/post'},{icon:'🏆',path:'/leaderboard'},{icon:'👤',path:'/profile'}].map(item=>(
            <div key={item.path} onClick={()=>window.location.href=item.path} style={{display:'flex',flexDirection:'column',alignItems:'center',cursor:'pointer',color:'rgba(255,255,255,0.4)',fontSize:'22px'}}>
              {item.icon}
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div
      style={{height:'100vh',background:'#000',overflow:'hidden',position:'relative',touchAction:'none',transition:'transform 0.3s ease'}}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onClick={handleDoubleTap}
    >
      {/* Video */}
      <video
        ref={videoRef}
        key={vid.id}
        src={vid.media_url}
        style={{width:'100%',height:'100%',objectFit:'cover',position:'absolute',top:0,left:0,transform:`translateY(${translateY}%)`,transition:'transform 0.3s ease'}}
        loop playsInline autoPlay
        onClick={e=>{e.stopPropagation();togglePlay()}}
      />

      {/* Double tap heart */}
      {showHeart && (
        <div style={{position:'absolute',top:'50%',left:'50%',transform:'translate(-50%,-50%)',fontSize:'80px',zIndex:400,pointerEvents:'none',animation:'heartPop 1s ease forwards'}}>
          ❤️
        </div>
      )}

      {/* Pause icon */}
      {paused && (
        <div style={{position:'absolute',top:'50%',left:'50%',transform:'translate(-50%,-50%)',background:'rgba(0,0,0,0.5)',borderRadius:'50%',width:'70px',height:'70px',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'30px',pointerEvents:'none',zIndex:200}}>▶️</div>
      )}

      {/* Gradient */}
      <div style={{position:'absolute',inset:0,background:'linear-gradient(to top,rgba(0,0,0,0.92) 0%,transparent 40%,rgba(0,0,0,0.2) 100%)',pointerEvents:'none',zIndex:100}}/>

      {/* TOP BAR */}
      <div style={{position:'fixed',top:0,left:0,right:0,zIndex:300,display:'flex',alignItems:'center',justifyContent:'space-between',padding:'16px'}}>
        <button onClick={()=>window.location.href='/feed'} style={{background:'rgba(0,0,0,0.4)',border:'none',borderRadius:'50%',width:'38px',height:'38px',color:'#fff',fontSize:'18px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',backdropFilter:'blur(4px)'}}>←</button>
        <div style={{fontSize:'15px',fontWeight:'900',background:'linear-gradient(90deg,#00e5ff,#00ff88)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>⚡ ECHO</div>
        <button onClick={()=>window.location.href='/post'} style={{background:'linear-gradient(135deg,#00e5ff,#00ff88)',border:'none',borderRadius:'20px',padding:'6px 14px',fontSize:'12px',fontWeight:'700',color:'#000',cursor:'pointer'}}>+ Create</button>
      </div>

      {/* USER INFO */}
      <div style={{position:'absolute',bottom:'92px',left:'16px',right:'76px',zIndex:200}}>
        <div onClick={()=>vid.profiles?.id&&(window.location.href=`/user/${vid.profiles.id}`)} style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'8px',cursor:'pointer'}}>
          <div style={{width:'48px',height:'48px',borderRadius:'50%',border:'2px solid rgba(255,255,255,0.8)',overflow:'hidden',background:'linear-gradient(135deg,#00e5ff,#00ff88)',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center'}}>
            {vid.profiles?.avatar_url
              ? <img src={vid.profiles.avatar_url} style={{width:'100%',height:'100%',objectFit:'cover'}}/>
              : <span style={{fontWeight:'800',color:'#000',fontSize:'20px'}}>{getName(vid)[0]?.toUpperCase()}</span>
            }
          </div>
          <div>
            <div style={{color:'#fff',fontWeight:'700',fontSize:'15px',textShadow:'0 1px 4px rgba(0,0,0,0.8)'}}>{getName(vid)}</div>
            <div style={{color:'rgba(255,255,255,0.6)',fontSize:'12px'}}>@{getUsername(vid)} · {timeAgo(vid.created_at)}</div>
          </div>
        </div>
        {vid.location_name && <div style={{color:'rgba(255,255,255,0.8)',fontSize:'12px',marginBottom:'4px'}}>📍 {vid.location_name}</div>}
        {vid.content && <div style={{color:'rgba(255,255,255,0.9)',fontSize:'13px',lineHeight:'1.5',textShadow:'0 1px 3px rgba(0,0,0,0.8)'}}>{vid.content}</div>}
        {vid.hashtags && <div style={{color:'#00e5ff',fontSize:'12px',marginTop:'4px'}}>{vid.hashtags}</div>}
      </div>

      {/* ACTION BUTTONS */}
      <div style={{position:'absolute',bottom:'92px',right:'12px',zIndex:200,display:'flex',flexDirection:'column',gap:'16px',alignItems:'center'}}>

        {/* Like */}
        <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'3px'}}>
          <button onClick={(e)=>{e.stopPropagation();handleLike()}} style={{width:'52px',height:'52px',borderRadius:'50%',background:liked[vid.id]?'rgba(255,69,96,0.35)':'rgba(0,0,0,0.4)',border:`2px solid ${liked[vid.id]?'#ff4560':'rgba(255,255,255,0.5)'}`,fontSize:'24px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',transition:'all 0.2s',transform:liked[vid.id]?'scale(1.1)':'scale(1)'}}>
            {liked[vid.id]?'❤️':'🤍'}
          </button>
          <span style={{color:'#fff',fontSize:'11px',fontWeight:'700'}}>{formatNum(vid.likes_count)}</span>
        </div>

        {/* Comments */}
        <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'3px'}}>
          <button onClick={(e)=>e.stopPropagation()} style={{width:'52px',height:'52px',borderRadius:'50%',background:'rgba(0,0,0,0.4)',border:'2px solid rgba(255,255,255,0.5)',fontSize:'24px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>💬</button>
          <span style={{color:'#fff',fontSize:'11px',fontWeight:'700'}}>{formatNum(vid.comments_count)}</span>
        </div>

        {/* Views */}
        <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'3px'}}>
          <button onClick={(e)=>{e.stopPropagation();setShowViews(!showViews)}} style={{width:'52px',height:'52px',borderRadius:'50%',background:'rgba(0,0,0,0.4)',border:'2px solid rgba(255,255,255,0.5)',fontSize:'22px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>👁</button>
          <span style={{color:'#fff',fontSize:'11px',fontWeight:'700'}}>{formatNum(vid.views_count)}</span>
        </div>

        {/* Share */}
        <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'3px'}}>
          <button onClick={(e)=>{e.stopPropagation();navigator.share?.({text:vid.content||'',url:window.location.href})}} style={{width:'52px',height:'52px',borderRadius:'50%',background:'rgba(0,0,0,0.4)',border:'2px solid rgba(255,255,255,0.5)',fontSize:'22px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>↗</button>
          <span style={{color:'#fff',fontSize:'11px',fontWeight:'700'}}>Share</span>
        </div>

        {/* ECHO MIX */}
        <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'3px'}}>
          <button onClick={(e)=>{e.stopPropagation();openMix()}} style={{width:'52px',height:'52px',borderRadius:'50%',background:'rgba(255,165,0,0.2)',border:'2px solid rgba(255,165,0,0.6)',fontSize:'20px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>🔀</button>
          <span style={{color:'#ffa500',fontSize:'11px',fontWeight:'700'}}>MIX</span>
        </div>

        {/* Map */}
        <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'3px'}}>
          <button onClick={(e)=>{e.stopPropagation();window.location.href='/map'}} style={{width:'52px',height:'52px',borderRadius:'50%',background:'rgba(0,229,255,0.15)',border:'2px solid rgba(0,229,255,0.5)',fontSize:'22px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>🗺</button>
          <span style={{color:'#00e5ff',fontSize:'11px',fontWeight:'700'}}>Map</span>
        </div>
      </div>

      {/* Views popup */}
      {showViews && (
        <div style={{position:'absolute',bottom:'280px',right:'70px',background:'rgba(0,0,0,0.85)',borderRadius:'12px',padding:'10px 16px',zIndex:300,border:'1px solid rgba(255,255,255,0.1)'}}>
          <div style={{color:'#fff',fontSize:'13px',fontWeight:'700'}}>👁 {formatNum(vid.views_count)} views</div>
          <div style={{color:'#4a5568',fontSize:'11px',marginTop:'2px'}}>❤️ {formatNum(vid.likes_count)} likes</div>
          <div style={{color:'#4a5568',fontSize:'11px'}}>💬 {formatNum(vid.comments_count)} comments</div>
        </div>
      )}

      {/* Progress dots */}
      <div style={{position:'absolute',right:'4px',top:'50%',transform:'translateY(-50%)',display:'flex',flexDirection:'column',gap:'4px',zIndex:200}}>
        {videos.slice(Math.max(0,currentIndex-4), currentIndex+5).map((_,i)=>{
          const realI = Math.max(0,currentIndex-4)+i
          return (
            <div key={realI} onClick={(e)=>{e.stopPropagation();setCurrentIndex(realI)}} style={{width:'3px',height:realI===currentIndex?'22px':'5px',borderRadius:'2px',background:realI===currentIndex?'#00e5ff':'rgba(255,255,255,0.25)',cursor:'pointer',transition:'all 0.3s'}}/>
          )
        })}
      </div>

      {/* Counter */}
      <div style={{position:'absolute',top:'70px',right:'16px',zIndex:200,background:'rgba(0,0,0,0.5)',borderRadius:'20px',padding:'4px 12px',color:'#fff',fontSize:'12px',fontWeight:'700',backdropFilter:'blur(4px)'}}>
        {currentIndex+1}/{videos.length}
      </div>

      {/* Swipe hint */}
      {currentIndex < videos.length-1 && currentIndex === 0 && (
        <div style={{position:'absolute',bottom:'74px',left:'50%',transform:'translateX(-50%)',zIndex:200,color:'rgba(255,255,255,0.35)',fontSize:'11px',animation:'bounce 2s infinite'}}>↑ swipe up for next</div>
      )}

      {/* Bottom nav */}
      <div style={{position:'fixed',bottom:0,left:0,right:0,background:'rgba(0,0,0,0.85)',borderTop:'1px solid rgba(255,255,255,0.07)',display:'flex',justifyContent:'space-around',padding:'10px 0 20px',zIndex:300}}>
        {[
          {icon:'🏠',label:'Home',path:'/feed'},
          {icon:'🗺',label:'Map',path:'/map'},
          {icon:'📸',label:'Post',path:'/post'},
          {icon:'🏆',label:'Rank',path:'/leaderboard'},
          {icon:'👤',label:'Profile',path:'/profile'},
        ].map(item=>(
          <div key={item.label} onClick={()=>window.location.href=item.path} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'3px',cursor:'pointer',color:'rgba(255,255,255,0.4)'}}>
            <span style={{fontSize:'22px'}}>{item.icon}</span>
            <span style={{fontSize:'10px',fontWeight:'600'}}>{item.label}</span>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes heartPop {
          0% { transform: translate(-50%,-50%) scale(0); opacity: 1; }
          50% { transform: translate(-50%,-50%) scale(1.2); opacity: 1; }
          100% { transform: translate(-50%,-80%) scale(1); opacity: 0; }
        }
        @keyframes bounce {
          0%,100% { transform: translateX(-50%) translateY(0); }
          50% { transform: translateX(-50%) translateY(-6px); }
        }
      `}</style>
    </div>
  )
    }
