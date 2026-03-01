'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default function Echo() {
  const [user, setUser] = useState(null)
  const [videos, setVideos] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [liked, setLiked] = useState({})
  const videoRefs = useRef([])
  const containerRef = useRef(null)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { window.location.href = '/'; return }
      setUser(data.session.user)
      const { data: vids } = await supabase
        .from('posts')
        .select('*, profiles(id, username, full_name, avatar_url)')
        .eq('media_type', 'video')
        .not('media_url', 'is', null)
        .order('created_at', { ascending: false })
      setVideos(vids || [])
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    // Pause all, play current
    videoRefs.current.forEach((v, i) => {
      if (!v) return
      if (i === currentIndex) {
        v.play().catch(() => {})
      } else {
        v.pause()
        v.currentTime = 0
      }
    })
  }, [currentIndex])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let startY = 0
    const onTouchStart = (e) => { startY = e.touches[0].clientY }
    const onTouchEnd = (e) => {
      const diff = startY - e.changedTouches[0].clientY
      if (diff > 60 && currentIndex < videos.length - 1) setCurrentIndex(i => i + 1)
      if (diff < -60 && currentIndex > 0) setCurrentIndex(i => i - 1)
    }

    container.addEventListener('touchstart', onTouchStart)
    container.addEventListener('touchend', onTouchEnd)
    return () => {
      container.removeEventListener('touchstart', onTouchStart)
      container.removeEventListener('touchend', onTouchEnd)
    }
  }, [currentIndex, videos.length])

  const handleLike = async (video) => {
    if (liked[video.id]) return
    await supabase.from('likes').insert({ user_id: user.id, post_id: video.id })
    setLiked(prev => ({ ...prev, [video.id]: true }))
    setVideos(vids => vids.map(v => v.id === video.id ? { ...v, likes_count: (v.likes_count || 0) + 1 } : v))
  }

  if (loading) return (
    <div style={{minHeight:'100vh',background:'#000',display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:'16px'}}>
      <div style={{fontSize:'40px'}}>⚡</div>
      <div style={{color:'#4a5568'}}>Loading ECHO...</div>
    </div>
  )

  if (videos.length === 0) return (
    <div style={{minHeight:'100vh',background:'#000',display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:'16px',color:'#fff'}}>
      <div style={{fontSize:'48px'}}>⚡</div>
      <div style={{fontSize:'18px',fontWeight:'700'}}>No ECHO videos yet</div>
      <div style={{fontSize:'13px',color:'#4a5568'}}>Upload a video as ECHO format</div>
      <button onClick={()=>window.location.href='/post'} style={{background:'linear-gradient(135deg,#00e5ff,#00ff88)',border:'none',borderRadius:'12px',padding:'12px 28px',fontSize:'14px',fontWeight:'700',color:'#070a10',cursor:'pointer',marginTop:'8px'}}>
        + Create ECHO
      </button>
      <button onClick={()=>window.location.href='/feed'} style={{background:'none',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'12px',padding:'10px 24px',fontSize:'13px',color:'#4a5568',cursor:'pointer'}}>
        ← Back
      </button>
    </div>
  )

  const video = videos[currentIndex]

  return (
    <div ref={containerRef} style={{minHeight:'100vh',background:'#000',position:'relative',overflow:'hidden',userSelect:'none'}}>

      {/* Back button */}
      <button onClick={()=>window.location.href='/feed'} style={{position:'fixed',top:'16px',left:'16px',zIndex:100,background:'rgba(0,0,0,0.5)',border:'none',borderRadius:'50%',width:'40px',height:'40px',color:'#fff',fontSize:'20px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>←</button>

      {/* ECHO Logo */}
      <div style={{position:'fixed',top:'16px',left:'50%',transform:'translateX(-50%)',zIndex:100,fontSize:'16px',fontWeight:'800',background:'linear-gradient(90deg,#00e5ff,#00ff88)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>⚡ ECHO</div>

      {/* Video counter */}
      <div style={{position:'fixed',top:'16px',right:'16px',zIndex:100,background:'rgba(0,0,0,0.5)',borderRadius:'20px',padding:'4px 12px',color:'#fff',fontSize:'12px'}}>
        {currentIndex + 1} / {videos.length}
      </div>

      {/* Video */}
      <div style={{width:'100vw',height:'100vh',position:'relative'}}>
        <video
          ref={el => videoRefs.current[currentIndex] = el}
          src={video.media_url}
          style={{width:'100%',height:'100%',objectFit:'cover'}}
          loop
          playsInline
          muted={false}
          onClick={() => {
            const v = videoRefs.current[currentIndex]
            if (v) v.paused ? v.play() : v.pause()
          }}
        />

        {/* Gradient overlay */}
        <div style={{position:'absolute',inset:0,background:'linear-gradient(to top,rgba(0,0,0,0.8) 0%,transparent 40%,transparent 70%,rgba(0,0,0,0.3) 100%)',pointerEvents:'none'}}/>

        {/* User info — bottom left */}
        <div style={{position:'absolute',bottom:'100px',left:'16px',right:'80px'}}>
          <div
            onClick={()=>window.location.href=`/user/${video.profiles?.id}`}
            style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'10px',cursor:'pointer'}}>
            <div style={{width:'44px',height:'44px',borderRadius:'50%',border:'2px solid #fff',overflow:'hidden',background:'linear-gradient(135deg,#00e5ff,#00ff88)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
              {video.profiles?.avatar_url
                ? <img src={video.profiles.avatar_url} style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                : <span style={{fontSize:'18px',fontWeight:'800',color:'#070a10'}}>{(video.profiles?.username||'E')[0].toUpperCase()}</span>
              }
            </div>
            <div>
              <div style={{color:'#fff',fontSize:'15px',fontWeight:'700'}}>{video.profiles?.full_name || video.profiles?.username}</div>
              <div style={{color:'rgba(255,255,255,0.6)',fontSize:'12px'}}>@{video.profiles?.username}</div>
            </div>
          </div>

          {video.location_name && (
            <div style={{color:'rgba(255,255,255,0.7)',fontSize:'12px',marginBottom:'6px'}}>📍 {video.location_name}</div>
          )}
          {video.content && (
            <div style={{color:'rgba(255,255,255,0.9)',fontSize:'13px',lineHeight:'1.5',marginBottom:'6px'}}>{video.content}</div>
          )}
          {video.hashtags && (
            <div style={{color:'#00e5ff',fontSize:'12px'}}>{video.hashtags}</div>
          )}
        </div>

        {/* Action buttons — right side */}
        <div style={{position:'absolute',bottom:'100px',right:'12px',display:'flex',flexDirection:'column',gap:'20px',alignItems:'center'}}>

          {/* Like */}
          <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'4px'}}>
            <button
              onClick={()=>handleLike(video)}
              style={{width:'48px',height:'48px',borderRadius:'50%',background:liked[video.id]?'rgba(255,69,96,0.3)':'rgba(255,255,255,0.1)',border:`2px solid ${liked[video.id]?'#ff4560':'rgba(255,255,255,0.3)'}`,cursor:'pointer',fontSize:'22px',display:'flex',alignItems:'center',justifyContent:'center'}}>
              {liked[video.id] ? '❤️' : '🤍'}
            </button>
            <span style={{color:'#fff',fontSize:'11px',fontWeight:'600'}}>{video.likes_count||0}</span>
          </div>

          {/* Comment */}
          <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'4px'}}>
            <button style={{width:'48px',height:'48px',borderRadius:'50%',background:'rgba(255,255,255,0.1)',border:'2px solid rgba(255,255,255,0.3)',cursor:'pointer',fontSize:'22px',display:'flex',alignItems:'center',justifyContent:'center'}}>
              💬
            </button>
            <span style={{color:'#fff',fontSize:'11px',fontWeight:'600'}}>{video.comments_count||0}</span>
          </div>

          {/* Share */}
          <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'4px'}}>
            <button
              onClick={()=>navigator.share?.({title:'Echo World',url:window.location.href})}
              style={{width:'48px',height:'48px',borderRadius:'50%',background:'rgba(255,255,255,0.1)',border:'2px solid rgba(255,255,255,0.3)',cursor:'pointer',fontSize:'22px',display:'flex',alignItems:'center',justifyContent:'center'}}>
              ↗
            </button>
            <span style={{color:'#fff',fontSize:'11px',fontWeight:'600'}}>Share</span>
          </div>

          {/* Map */}
          <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'4px'}}>
            <button
              onClick={()=>window.location.href='/map'}
              style={{width:'48px',height:'48px',borderRadius:'50%',background:'rgba(0,229,255,0.15)',border:'2px solid rgba(0,229,255,0.4)',cursor:'pointer',fontSize:'22px',display:'flex',alignItems:'center',justifyContent:'center'}}>
              🗺
            </button>
            <span style={{color:'#00e5ff',fontSize:'11px',fontWeight:'600'}}>Map</span>
          </div>
        </div>

        {/* Scroll indicators */}
        <div style={{position:'absolute',bottom:'60px',left:'50%',transform:'translateX(-50%)',display:'flex',flexDirection:'column',alignItems:'center',gap:'3px'}}>
          {currentIndex < videos.length - 1 && (
            <div style={{color:'rgba(255,255,255,0.4)',fontSize:'11px',textAlign:'center'}}>
              ↑ swipe up for next
            </div>
          )}
        </div>

        {/* Progress dots */}
        <div style={{position:'absolute',right:'6px',top:'50%',transform:'translateY(-50%)',display:'flex',flexDirection:'column',gap:'4px'}}>
          {videos.slice(0, Math.min(videos.length, 8)).map((_, i) => (
            <div key={i} onClick={()=>setCurrentIndex(i)} style={{width:'3px',height:i===currentIndex?'20px':'6px',borderRadius:'2px',background:i===currentIndex?'#00e5ff':'rgba(255,255,255,0.3)',cursor:'pointer',transition:'all 0.3s'}}/>
          ))}
        </div>
      </div>

      {/* Bottom nav */}
      <div style={{position:'fixed',bottom:0,left:0,right:0,background:'rgba(0,0,0,0.7)',borderTop:'1px solid rgba(255,255,255,0.07)',display:'flex',justifyContent:'space-around',padding:'10px 0 20px',zIndex:100}}>
        {[
          {icon:'🏠',label:'Home',path:'/feed'},
          {icon:'🗺',label:'Map',path:'/map'},
          {icon:'📸',label:'Post',path:'/post'},
          {icon:'🏆',label:'Rank',path:'/leaderboard'},
          {icon:'👤',label:'Profile',path:'/profile'},
        ].map(item => (
          <div key={item.label} onClick={()=>window.location.href=item.path} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'4px',cursor:'pointer',color:'rgba(255,255,255,0.4)'}}>
            <span style={{fontSize:'22px'}}>{item.icon}</span>
            <span style={{fontSize:'10px',fontWeight:'600'}}>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
          }
