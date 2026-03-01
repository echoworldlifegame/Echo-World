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
  const videoRef = useRef(null)
  const touchStartY = useRef(0)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { window.location.href = '/'; return }
      setUser(data.session.user)
      const { data: vids, error } = await supabase
        .from('posts')
        .select('*, profiles(id, username, full_name, avatar_url)')
        .eq('media_type', 'video')
        .not('media_url', 'is', null)
        .order('created_at', { ascending: false })
      console.log('Videos:', vids, 'Error:', error)
      setVideos(vids || [])
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.play().catch(() => {})
    }
  }, [currentIndex])

  const handleTouchStart = (e) => {
    touchStartY.current = e.touches[0].clientY
  }

  const handleTouchEnd = (e) => {
    const diff = touchStartY.current - e.changedTouches[0].clientY
    if (diff > 50 && currentIndex < videos.length - 1) setCurrentIndex(i => i + 1)
    if (diff < -50 && currentIndex > 0) setCurrentIndex(i => i - 1)
  }

  const handleLike = async () => {
    if (!user || !videos[currentIndex]) return
    const vid = videos[currentIndex]
    if (liked[vid.id]) return
    await supabase.from('likes').insert({ user_id: user.id, post_id: vid.id })
    setLiked(p => ({...p, [vid.id]: true}))
    setVideos(vs => vs.map((v,i) => i === currentIndex ? {...v, likes_count: (v.likes_count||0)+1} : v))
  }

  if (loading) return (
    <div style={{height:'100vh',background:'#000',display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:'12px',color:'#fff'}}>
      <div style={{fontSize:'40px'}}>⚡</div>
      <div>Loading ECHO...</div>
    </div>
  )

  if (videos.length === 0) return (
    <div style={{height:'100vh',background:'#000',display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:'16px',color:'#fff',padding:'20px',textAlign:'center'}}>
      <div style={{fontSize:'48px'}}>⚡</div>
      <div style={{fontSize:'20px',fontWeight:'700'}}>No ECHO Videos Yet</div>
      <div style={{fontSize:'13px',color:'#666'}}>Upload a video to appear here</div>
      <button onClick={()=>window.location.href='/post'} style={{background:'linear-gradient(135deg,#00e5ff,#00ff88)',border:'none',borderRadius:'12px',padding:'14px 32px',fontSize:'15px',fontWeight:'700',color:'#000',cursor:'pointer',marginTop:'8px'}}>
        ⚡ Create ECHO
      </button>
      <button onClick={()=>window.location.href='/feed'} style={{background:'none',border:'1px solid #333',borderRadius:'12px',padding:'10px 24px',fontSize:'13px',color:'#666',cursor:'pointer'}}>
        ← Back to Feed
      </button>
    </div>
  )

  const vid = videos[currentIndex]

  return (
    <div
      style={{height:'100vh',background:'#000',overflow:'hidden',position:'relative',touchAction:'none'}}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Back */}
      <button onClick={()=>window.location.href='/feed'} style={{position:'fixed',top:'16px',left:'16px',zIndex:200,background:'rgba(0,0,0,0.6)',border:'none',borderRadius:'50%',width:'40px',height:'40px',color:'#fff',fontSize:'20px',cursor:'pointer'}}>←</button>

      {/* Logo */}
      <div style={{position:'fixed',top:'20px',left:'50%',transform:'translateX(-50%)',zIndex:200,fontSize:'16px',fontWeight:'900',background:'linear-gradient(90deg,#00e5ff,#00ff88)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>⚡ ECHO</div>

      {/* Counter */}
      <div style={{position:'fixed',top:'20px',right:'16px',zIndex:200,background:'rgba(0,0,0,0.6)',borderRadius:'20px',padding:'4px 12px',color:'#fff',fontSize:'12px',fontWeight:'600'}}>
        {currentIndex+1}/{videos.length}
      </div>

      {/* Video */}
      <video
        ref={videoRef}
        key={vid.id}
        src={vid.media_url}
        style={{width:'100%',height:'100%',objectFit:'cover',position:'absolute',top:0,left:0}}
        loop playsInline
        onClick={e => e.target.paused ? e.target.play() : e.target.pause()}
      />

      {/* Gradient */}
      <div style={{position:'absolute',inset:0,background:'linear-gradient(to top,rgba(0,0,0,0.85) 0%,transparent 45%,rgba(0,0,0,0.2) 100%)',pointerEvents:'none'}}/>

      {/* User info */}
      <div style={{position:'absolute',bottom:'90px',left:'16px',right:'72px',zIndex:100}}>
        <div onClick={()=>window.location.href=`/user/${vid.profiles?.id}`} style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'10px',cursor:'pointer'}}>
          <div style={{width:'46px',height:'46px',borderRadius:'50%',border:'2px solid #fff',overflow:'hidden',background:'linear-gradient(135deg,#00e5ff,#00ff88)',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center'}}>
            {vid.profiles?.avatar_url
              ? <img src={vid.profiles.avatar_url} style={{width:'100%',height:'100%',objectFit:'cover'}}/>
              : <span style={{fontWeight:'800',color:'#000',fontSize:'18px'}}>{(vid.profiles?.username||'E')[0].toUpperCase()}</span>
            }
          </div>
          <div>
            <div style={{color:'#fff',fontWeight:'700',fontSize:'15px'}}>{vid.profiles?.full_name||vid.profiles?.username||'Explorer'}</div>
            <div style={{color:'rgba(255,255,255,0.6)',fontSize:'12px'}}>@{vid.profiles?.username||'explorer'}</div>
          </div>
        </div>
        {vid.location_name && <div style={{color:'rgba(255,255,255,0.7)',fontSize:'12px',marginBottom:'5px'}}>📍 {vid.location_name}</div>}
        {vid.content && <div style={{color:'rgba(255,255,255,0.9)',fontSize:'13px',lineHeight:'1.5'}}>{vid.content}</div>}
        {vid.hashtags && <div style={{color:'#00e5ff',fontSize:'12px',marginTop:'4px'}}>{vid.hashtags}</div>}
      </div>

      {/* Actions */}
      <div style={{position:'absolute',bottom:'90px',right:'12px',zIndex:100,display:'flex',flexDirection:'column',gap:'18px',alignItems:'center'}}>
        <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'4px'}}>
          <button onClick={handleLike} style={{width:'50px',height:'50px',borderRadius:'50%',background:liked[vid.id]?'rgba(255,69,96,0.4)':'rgba(255,255,255,0.15)',border:`2px solid ${liked[vid.id]?'#ff4560':'rgba(255,255,255,0.4)'}`,fontSize:'22px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
            {liked[vid.id]?'❤️':'🤍'}
          </button>
          <span style={{color:'#fff',fontSize:'11px',fontWeight:'600'}}>{vid.likes_count||0}</span>
        </div>
        <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'4px'}}>
          <button style={{width:'50px',height:'50px',borderRadius:'50%',background:'rgba(255,255,255,0.15)',border:'2px solid rgba(255,255,255,0.4)',fontSize:'22px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>💬</button>
          <span style={{color:'#fff',fontSize:'11px',fontWeight:'600'}}>{vid.comments_count||0}</span>
        </div>
        <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'4px'}}>
          <button onClick={()=>window.location.href='/map'} style={{width:'50px',height:'50px',borderRadius:'50%',background:'rgba(0,229,255,0.2)',border:'2px solid rgba(0,229,255,0.5)',fontSize:'22px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>🗺</button>
          <span style={{color:'#00e5ff',fontSize:'11px',fontWeight:'600'}}>Map</span>
        </div>
      </div>

      {/* Swipe hint */}
      <div style={{position:'absolute',bottom:'72px',left:'50%',transform:'translateX(-50%)',zIndex:100,color:'rgba(255,255,255,0.3)',fontSize:'11px',textAlign:'center'}}>
        {currentIndex < videos.length-1 ? '↑ swipe up' : ''}
      </div>

      {/* Bottom nav */}
      <div style={{position:'fixed',bottom:0,left:0,right:0,background:'rgba(0,0,0,0.8)',borderTop:'1px solid rgba(255,255,255,0.07)',display:'flex',justifyContent:'space-around',padding:'10px 0 20px',zIndex:200}}>
        {[
          {icon:'🏠',label:'Home',path:'/feed'},
          {icon:'🗺',label:'Map',path:'/map'},
          {icon:'📸',label:'Post',path:'/post'},
          {icon:'🏆',label:'Rank',path:'/leaderboard'},
          {icon:'👤',label:'Profile',path:'/profile'},
        ].map(item => (
          <div key={item.label} onClick={()=>window.location.href=item.path} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'3px',cursor:'pointer',color:'rgba(255,255,255,0.4)'}}>
            <span style={{fontSize:'22px'}}>{item.icon}</span>
            <span style={{fontSize:'10px',fontWeight:'600'}}>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
  }
