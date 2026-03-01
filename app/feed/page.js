'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default function Feed() {
  const [user, setUser] = useState(null)
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) { window.location.href = '/'; return }
      setUser(data.session.user)
      loadPosts()
    })
  }, [])

  const loadPosts = async () => {
    const { data } = await supabase
      .from('posts')
      .select(`
        id, content, media_url, media_type, location_name,
        likes_count, comments_count, created_at, user_id,
        profiles!posts_user_id_fkey(id, username, full_name, avatar_url)
      `)
      .order('created_at', { ascending: false })
    setPosts(data || [])
    setLoading(false)
  }

  const handleLike = async (postId) => {
    if (!user) return
    await supabase.from('likes').insert({ user_id: user.id, post_id: postId })
    setPosts(p => p.map(x => x.id === postId ? {...x, likes_count: (x.likes_count||0)+1} : x))
  }

  const timeAgo = (date) => {
    const s = Math.floor((new Date() - new Date(date)) / 1000)
    if (s < 60) return 'just now'
    if (s < 3600) return Math.floor(s/60) + 'm ago'
    if (s < 86400) return Math.floor(s/3600) + 'h ago'
    return Math.floor(s/86400) + 'd ago'
  }

  const getName = (post) => {
    const p = post.profiles
    if (!p) return 'Explorer'
    return p.full_name || p.username || post.user_id?.slice(0,8)
  }

  const getUsername = (post) => {
    const p = post.profiles
    if (!p) return 'explorer'
    if (p.username) return p.username
    return post.user_id?.slice(0,8)
  }

  return (
    <div style={{minHeight:'100vh',background:'#070a10',color:'#eef2f7'}}>

      {/* TOP BAR */}
      <div style={{position:'fixed',top:0,left:0,right:0,background:'rgba(7,10,16,0.97)',borderBottom:'1px solid rgba(255,255,255,0.07)',zIndex:100}}>
        <div style={{padding:'0 16px',height:'52px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div style={{fontSize:'20px',fontWeight:'800',background:'linear-gradient(90deg,#00e5ff,#00ff88)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>ECHO⬡WORLD</div>
          <div style={{display:'flex',gap:'8px'}}>
            <button onClick={()=>window.location.href='/search'} style={{background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'20px',padding:'6px 14px',color:'#8892a4',fontSize:'13px',cursor:'pointer'}}>🔍</button>
            <button onClick={async()=>{await supabase.auth.signOut();window.location.href='/'}} style={{background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'20px',padding:'6px 14px',color:'#8892a4',fontSize:'13px',cursor:'pointer'}}>Logout</button>
          </div>
        </div>
        <div style={{display:'flex',gap:'6px',padding:'0 16px 10px',overflowX:'auto',scrollbarWidth:'none'}}>
          <button onClick={()=>{}} style={{padding:'6px 14px',borderRadius:'20px',border:'none',cursor:'pointer',fontSize:'12px',fontWeight:'700',background:'linear-gradient(135deg,#00e5ff,#00ff88)',color:'#070a10',flexShrink:0}}>🌍 All</button>
          <button onClick={()=>window.location.href='/echo'} style={{padding:'6px 14px',borderRadius:'20px',border:'none',cursor:'pointer',fontSize:'12px',fontWeight:'700',background:'rgba(255,255,255,0.07)',color:'#8892a4',flexShrink:0}}>⚡ ECHO</button>
          <button onClick={()=>{}} style={{padding:'6px 14px',borderRadius:'20px',border:'none',cursor:'pointer',fontSize:'12px',fontWeight:'700',background:'rgba(255,255,255,0.07)',color:'#8892a4',flexShrink:0}}>📷 Photos</button>
          <button onClick={()=>{}} style={{padding:'6px 14px',borderRadius:'20px',border:'none',cursor:'pointer',fontSize:'12px',fontWeight:'700',background:'rgba(255,255,255,0.07)',color:'#8892a4',flexShrink:0}}>📦 Capsules</button>
        </div>
      </div>

      {/* BOTTOM NAV */}
      <div style={{position:'fixed',bottom:0,left:0,right:0,background:'rgba(7,10,16,0.98)',borderTop:'1px solid rgba(255,255,255,0.07)',display:'flex',justifyContent:'space-around',padding:'10px 0 20px',zIndex:100}}>
        {[
          {icon:'🏠',label:'Home',path:'/feed'},
          {icon:'🗺',label:'Map',path:'/map'},
          {icon:'📸',label:'Post',path:'/post'},
          {icon:'🏆',label:'Rank',path:'/leaderboard'},
          {icon:'👤',label:'Profile',path:'/profile'},
        ].map(item => (
          <div key={item.label} onClick={()=>window.location.href=item.path} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'4px',cursor:'pointer',color:item.path==='/feed'?'#00e5ff':'#4a5568'}}>
            <span style={{fontSize:'22px'}}>{item.icon}</span>
            <span style={{fontSize:'10px',fontWeight:'600'}}>{item.label}</span>
          </div>
        ))}
      </div>

      {/* CONTENT */}
      <div style={{padding:'102px 16px 90px',maxWidth:'600px',margin:'0 auto'}}>

        <div onClick={()=>window.location.href='/post'} style={{background:'#111620',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'16px',padding:'14px',marginBottom:'16px',display:'flex',gap:'10px',alignItems:'center',cursor:'pointer'}}>
          <div style={{width:'36px',height:'36px',borderRadius:'50%',background:'linear-gradient(135deg,#00e5ff,#00ff88)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>🧭</div>
          <div style={{flex:1,background:'#0c1018',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'30px',padding:'10px 16px',color:'#4a5568',fontSize:'13px'}}>
            Share something at your location...
          </div>
        </div>

        {loading ? (
          <div style={{textAlign:'center',padding:'60px',color:'#4a5568'}}>Loading...</div>
        ) : posts.length === 0 ? (
          <div style={{textAlign:'center',padding:'60px 20px'}}>
            <div style={{fontSize:'48px',marginBottom:'16px'}}>🗺</div>
            <div style={{color:'#8892a4',fontSize:'16px',fontWeight:'700',marginBottom:'16px'}}>No posts yet</div>
            <button onClick={()=>window.location.href='/post'} style={{background:'linear-gradient(135deg,#00e5ff,#00ff88)',border:'none',borderRadius:'12px',padding:'12px 28px',fontSize:'14px',fontWeight:'700',color:'#070a10',cursor:'pointer'}}>📸 Create First Post</button>
          </div>
        ) : posts.map(post => (
          <div key={post.id} style={{background:'#111620',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'16px',marginBottom:'14px',overflow:'hidden'}}>

            {/* Header */}
            <div style={{display:'flex',alignItems:'center',gap:'10px',padding:'12px 14px 8px'}}>
              <div onClick={()=>post.profiles?.id && (window.location.href=`/user/${post.profiles.id}`)} style={{width:'40px',height:'40px',borderRadius:'50%',background:'linear-gradient(135deg,#00e5ff,#00ff88)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,overflow:'hidden',cursor:'pointer',border:'2px solid rgba(0,229,255,0.3)'}}>
                {post.profiles?.avatar_url
                  ? <img src={post.profiles.avatar_url} style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                  : <span style={{fontSize:'16px',fontWeight:'800',color:'#070a10'}}>{getName(post)[0]?.toUpperCase()}</span>
                }
              </div>
              <div style={{flex:1,cursor:'pointer',overflow:'hidden'}} onClick={()=>post.profiles?.id && (window.location.href=`/user/${post.profiles.id}`)}>
                <div style={{fontSize:'14px',fontWeight:'700',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{getName(post)}</div>
                <div style={{fontSize:'11px',color:'#4a5568'}}>@{getUsername(post)}</div>
                {post.location_name && <div style={{fontSize:'11px',color:'#00e5ff',marginTop:'1px'}}>📍 {post.location_name}</div>}
              </div>
              <div style={{fontSize:'11px',color:'#4a5568',flexShrink:0}}>{timeAgo(post.created_at)}</div>
            </div>

            {/* Capsule */}
            {post.media_type==='capsule' && (
              <div style={{margin:'0 14px 10px',background:'rgba(255,202,40,0.06)',border:'1px solid rgba(255,202,40,0.2)',borderRadius:'12px',padding:'14px',display:'flex',gap:'12px',alignItems:'center'}}>
                <span style={{fontSize:'28px'}}>📦</span>
                <div>
                  <div style={{fontSize:'13px',fontWeight:'700',color:'#ffca28'}}>🔒 Time Capsule</div>
                  <div style={{fontSize:'11px',color:'#4a5568',marginTop:'2px'}}>Visit within 300m to unlock</div>
                  {post.location_name && <div style={{fontSize:'11px',color:'#4a5568'}}>📍 {post.location_name}</div>}
                </div>
              </div>
            )}

            {/* Photo */}
            {post.media_url && post.media_type==='photo' && (
              <img src={post.media_url} style={{width:'100%',maxHeight:'420px',objectFit:'cover',display:'block'}}/>
            )}

            {/* Video */}
            {post.media_url && post.media_type==='video' && (
              <video src={post.media_url} controls playsInline style={{width:'100%',maxHeight:'420px',display:'block',background:'#000'}}/>
            )}

            {/* Content */}
            {post.content && (
              <div style={{padding:'10px 14px',fontSize:'14px',color:'#8892a4',lineHeight:'1.6'}}>{post.content}</div>
            )}

            {/* Actions */}
            <div style={{display:'flex',padding:'6px 6px 12px',borderTop:'1px solid rgba(255,255,255,0.04)',marginTop:'4px',gap:'4px'}}>
              <button onClick={()=>handleLike(post.id)} style={{display:'flex',alignItems:'center',gap:'5px',padding:'7px 10px',border:'none',background:'none',cursor:'pointer',color:'#4a5568',fontSize:'13px',borderRadius:'8px'}}>
                ❤️ {post.likes_count||0}
              </button>
              <button style={{display:'flex',alignItems:'center',gap:'5px',padding:'7px 10px',border:'none',background:'none',cursor:'pointer',color:'#4a5568',fontSize:'13px',borderRadius:'8px'}}>
                💬 {post.comments_count||0}
              </button>
              <button style={{display:'flex',alignItems:'center',gap:'5px',padding:'7px 10px',border:'none',background:'none',cursor:'pointer',color:'#4a5568',fontSize:'13px',borderRadius:'8px'}}>
                ↗ Share
              </button>
              <button onClick={()=>window.location.href='/map'} style={{marginLeft:'auto',display:'flex',alignItems:'center',gap:'4px',padding:'7px 10px',border:'none',background:'none',cursor:'pointer',color:'#00e5ff',fontSize:'12px'}}>
                🗺 Map
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
              }
