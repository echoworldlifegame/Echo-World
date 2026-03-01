'use client'
import { useState, useEffect, useRef } from 'react'
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
  const videoRef = useRef(null)
  const touchStartY = useRef(0)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { window.location.href = '/'; return }
      const u = data.session.user
      setUser(u)

      // Get following list for priority sorting
      const { data: following } = await supabase
        .from('followers')
        .select('following_id')
        .eq('follower_id', u.id)
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
      }
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.play().catch(()=>{})
      setPaused(false)
    }
  }, [currentIndex])

  const handleTouchStart = (e) => { touchStartY.current = e.touches[0].clientY }
  const handleTouchEnd = (e) => {
    const diff = touchStartY.current - e.changedTouches[0].clientY
    if (diff > 50 && currentIndex < videos.length-1) setCurrentIndex(i=>i+1)
    if (diff < -50 && currentIndex > 0) setCurrentIndex(i=>i-1)
  }

  const togglePlay = () => {
    if (!videoRef.current) return
    if (videoRef.current.paused) { videoRef.current.play(); setPaused(false) }
    else { videoRef.current.pause(); setPaused(true) }
  }

  const handleLike = async () => {
    if (!user || !videos[currentIndex] || liked[videos[currentIndex].id]) return
    const vid = videos[currentIndex]
    await supabase.from('likes').insert({ user_id: user.id, post_id: vid.id })
    setLiked(p=>({...p,[vid.id]:true}))
    setVideos(vs=>vs.map((v,i)=>i===currentIndex?{...v,likes_count:(v.likes_count||0)+1}:v))
  }

  const timeAgo = (date) => {
    const s = Math.floor((new Date() - new Date(date)) / 1000)
    if (s < 60) return 'এইমাত্র'
    if (s < 3600) return Math.floor(s/60) + 'মি আগে'
    if (s < 86400) return Math.floor(s/3600) + 'ঘ আগে'
    return Math.floor(s/86400) + 'দিন আগে'
  }

  const getName = (vid) => vid.profiles?.full_name || vid.profiles?.username || 'Explorer'
  const getUsername = (vid) => vid.profiles?.username || 'explorer'

  if (loading) return (
    <div style={{height:'100vh',background:'#000',display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:'12px'}}>
      <div style={{fontSize:'40px'}}>⚡</div>
      <div style={{color:'#4a5568',fontSize:'14px'}}>Loading ECHO...</div>
    </div>
  )

  if (videos.length === 0) return (
    <div style={{height:'100vh',background:'#000',display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:'16px',color:'#fff',padding:'24px',textAlign:'center'}}>
      <div style={{fontSize:'56px'}}>⚡</div>
      <div style={{fontSize:'22px',fontWeight:'800'}}>No ECHO Videos</div>
      <div style={{fontSize:'13px',color:'#555',maxWidth:'260px'}}>Upload a video to start the ECHO feed</div>
      <button onClick={()=>window.location.href='/post'} style={{background:'linear-gradient(135deg,#00e5ff,#00ff88)',border:'none',borderRadius:'14px',padding:'14px 36px',fontSize:'15px',fontWeight:'800',color:'#000',cursor:'pointer',marginTop:'8px'}}>
        ⚡ Create ECHO
      </button>
      <button onClick={()=>window.location.href='/feed'} style={{background:'none',border:'1px solid #222',borderRadius:'12px',padding:'10px 24px',fontSize:'13px',color:'#555',cursor:'pointer'}}>
        ← Back
      </button>
    </div>
  )

  const vid = videos[currentIndex]

  return (
    <div
      style={{height:'100vh',background:'#000',overflow:'hidden',position:'relative',touchAction:'pan-x'}}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Back */}
      <button onClick={()=>window.location.href='/feed'} style={{position:'fixed',top:'16px',left:'16px',zIndex:300,background:'rgba(0,0,0,0.5)',border:'none',borderRadius:'50%',width:'40px',height:'40px',color:'#fff',fontSize:'20px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>←</button>

      {/* Logo */}
      <div style={{position:'fixed',top:'20px',left:'50%',transform:'translateX(-50%)',zIndex:300,fontSize:'15px',fontWeight:'900',background:'linear-gradient(90deg,#00e5ff,#00ff88)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>⚡ ECHO</div>

      {/* Create button */}
      <button onClick={()=>window.location.href='/post'} style={{position:'fixed',top:'14px',right:'16px',zIndex:300,background:'linear-gradient(135deg,#00e5ff,#00ff88)',border:'none',borderRadius:'20px',padding:'6px 14px',fontSize:'12px',fontWeight:'700',color:'#000',cursor:'pointer'}}>+ Create</button>

      {/* Video */}
      <video
        ref={videoRef}
        key={vid.id}
        src={vid.media_url}
        style={{width:'100%',height:'100%',objectFit:'cover',position:'absolute',top:0,left:0}}
        loop playsInline autoPlay
        onClick={togglePlay}
      />

      {/* Pause icon */}
      {paused && (
        <div style={{position:'absolute',top:'50%',left:'50%',transform:'translate(-50%,-50%)',background:'rgba(0,0,0,0.5)',borderRadius:'50%',width:'70px',height:'70px',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'30px',pointerEvents:'none',zIndex:200}}>▶️</div>
      )}

      {/* Gradient */}
      <div style={{position:'absolute',inset:0,background:'linear-gradient(to top,rgba(0,0,0,0.9) 0%,transparent 40%,rgba(0,0,0,0.15) 100%)',pointerEvents:'none',zIndex:100}}/>

      {/* User info */}
      <div style={{position:'absolute',bottom:'92px',left:'16px',right:'76px',zIndex:200}}>
        <div onClick={()=>vid.profiles?.id&&(window.location.href=`/user/${vid.profiles.id}`)} style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'8px',cursor:'pointer'}}>
          <div style={{width:'48px',height:'48px',borderRadius:'50%',border:'2px solid rgba(255,255,255,0.8)',overflow:'hidden',background:'linear-gradient(135deg,#00e5ff,#00ff88)',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center'}}>
            {vid.profiles?.avatar_url
              ? <img src={vid.profiles.avatar_url} style={{width:'100%',height:'100%',objectFit:'cover'}}/>
              : <span style={{fontWeight:'800',color:'#000',fontSize:'20px'}}>{getName(vid)[0]?.toUpperCase()}</span>
            }
          </div>
          <div>
            <div style={{color:'#fff',fontWeight:'700',fontSize:'15px'}}>{getName(vid)}</div>
            <div style={{color:'rgba(255,255,255,0.6)',fontSize:'12px'}}>@{getUsername(vid)} · {timeAgo(vid.created_at)}</div>
          </div>
        </div>
        {vid.location_name && <div style={{color:'rgba(255,255,255,0.7)',fontSize:'12px',marginBottom:'4px'}}>📍 {vid.location_name}</div>}
        {vid.content && <div style={{color:'rgba(255,255,255,0.9)',fontSize:'13px',lineHeight:'1.5'}}>{vid.content}</div>}
        {vid.hashtags && <div style={{color:'#00e5ff',fontSize:'12px',marginTop:'4px'}}>{vid.hashtags}</div>}
      </div>

      {/* Actions */}
      <div style={{position:'absolute',bottom:'92px',right:'12px',zIndex:200,display:'flex',flexDirection:'column',gap:'20px',alignItems:'center'}}>
        <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'3px'}}>
          <button onClick={handleLike} style={{width:'52px',height:'52px',borderRadius:'50%',background:liked[vid.id]?'rgba(255,69,96,0.35)':'rgba(0,0,0,0.4)',border:`2px solid ${liked[vid.id]?'#ff4560':'rgba(255,255,255,0.5)'}`,fontSize:'24px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
            {liked[vid.id]?'❤️':'🤍'}
          </button>
          <span style={{color:'#fff',fontSize:'11px',fontWeight:'700'}}>{vid.likes_count||0}</span>
        </div>
        <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'3px'}}>
          <button style={{width:'52px',height:'52px',borderRadius:'50%',background:'rgba(0,0,0,0.4)',border:'2px solid rgba(255,255,255,0.5)',fontSize:'24px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>💬</button>
          <span style={{color:'#fff',fontSize:'11px',fontWeight:'700'}}>{vid.comments_count||0}</span>
        </div>
        <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'3px'}}>
          <button onClick={()=>navigator.share?.({text:vid.content||'',url:window.location.href})} style={{width:'52px',height:'52px',borderRadius:'50%',background:'rgba(0,0,0,0.4)',border:'2px solid rgba(255,255,255,0.5)',fontSize:'24px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>↗</button>
          <span style={{color:'#fff',fontSize:'11px',fontWeight:'700'}}>Share</span>
        </div>
        <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'3px'}}>
          <button onClick={()=>window.location.href='/map'} style={{width:'52px',height:'52px',borderRadius:'50%',background:'rgba(0,229,255,0.2)',border:'2px solid rgba(0,229,255,0.6)',fontSize:'22px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>🗺</button>
          <span style={{color:'#00e5ff',fontSize:'11px',fontWeight:'700'}}>Map</span>
        </div>
      </div>

      {/* Progress dots */}
      <div style={{position:'absolute',right:'4px',top:'50%',transform:'translateY(-50%)',display:'flex',flexDirection:'column',gap:'4px',zIndex:200}}>
        {videos.slice(0,Math.min(videos.length,10)).map((_,i)=>(
          <div key={i} onClick={()=>setCurrentIndex(i)} style={{width:'3px',height:i===currentIndex?'20px':'5px',borderRadius:'2px',background:i===currentIndex?'#00e5ff':'rgba(255,255,255,0.3)',cursor:'pointer',transition:'all 0.3s'}}/>
        ))}
      </div>

      {/* Swipe hint */}
      {currentIndex < videos.length-1 && (
        <div style={{position:'absolute',bottom:'74px',left:'50%',transform:'translateX(-50%)',zIndex:200,color:'rgba(255,255,255,0.3)',fontSize:'11px'}}>↑ swipe up</div>
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
    </div>
  )
    }
