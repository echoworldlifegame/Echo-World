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
    const { data, error } = await supabase
      .from('posts')
      .select('*, profiles(id, username, full_name, avatar_url)')
      .order('created_at', { ascending: false })
    if (error) console.log('Error:', error)
    setPosts(data || [])
    setLoading(false)
  }

  const handleLike = async (postId) => {
    if (!user) return
    await supabase.from('likes').insert({ user_id: user.id, post_id: postId })
    setPosts(posts.map(p => p.id === postId ? {...p, likes_count: (p.likes_count||0)+1} : p))
  }

  const timeAgo = (date) => {
    const s = Math.floor((new Date() - new Date(date)) / 1000)
    if (s < 60) return 'just now'
    if (s < 3600) return Math.floor(s/60) + 'm ago'
    if (s < 86400) return Math.floor(s/3600) + 'h ago'
    return Math.floor(s/86400) + 'd ago'
  }

  return (
    <div style={{minHeight:'100vh',background:'#070a10',color:'#eef2f7'}}>

      <div style={{position:'fixed',top:0,left:0,right:0,background:'rgba(7,10,16,0.95)',borderBottom:'1px solid rgba(255,255,255,0.07)',zIndex:100}}>
        <div style={{padding:'0 16px',height:'52px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div style={{fontSize:'20px',fontWeight:'800',background:'linear-gradient(90deg,#00e5ff,#00ff88)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>ECHO⬡WORLD</div>
          <div style={{display:'flex',gap:'8px'}}>
            <button onClick={()=>window.location.href='/search'} style={{background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'20px',padding:'6px 12px',color:'#8892a4',fontSize:'13px',cursor:'pointer'}}>🔍</button>
            <button onClick={async()=>{await supabase.auth.signOut();window.location.href='/'}} style={{background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'20px',padding:'6px 12px',color:'#8892a4',fontSize:'13px',cursor:'pointer'}}>Logout</button>
          </div>
        </div>
        <div style={{display:'flex',gap:'6px',padding:'0 16px 10px',overflowX:'auto'}}>
          {[
            {label:'🌍 All', onClick:null},
            {label:'⚡ ECHO', onClick:()=>window.location.href='/echo'},
            {label:'📷 Photos', onClick:null},
            {label:'📦 Capsules', onClick:null},
          ].map((t,i) => (
            <button key={i} onClick={t.onClick||undefined} style={{padding:'6px 14px',borderRadius:'20px',border:'none',cursor:'pointer',fontSize:'12px',fontWeight:'600',whiteSpace:'nowrap',background:i===0?'linear-gradient(135deg,#00e5ff,#00ff88)':'rgba(255,255,255,0.05)',color:i===0?'#070a10':'#4a5568'}}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

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

      <div style={{padding:'100px 16px 90px',maxWidth:'600px',margin:'0 auto'}}>

        <div style={{background:'#111620',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'16px',padding:'12px',marginBottom:'16px',display:'flex',gap:'10px',alignItems:'center'}}>
          <div style={{width:'36px',height:'36px',borderRadius:'50%',background:'linear-gradient(135deg,#00e5ff,#00ff88)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'16px',flexShrink:0}}>🧭</div>
          <div onClick={()=>window.location.href='/post'} style={{flex:1,background:'#0c1018',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'30px',padding:'10px 16px',color:'#4a5568',fontSize:'13px',cursor:'pointer'}}>
            Share something at your location...
          </div>
        </div>

        {loading ? (
          <div style={{textAlign:'center',padding:'60px',color:'#4a5568',fontSize:'14px'}}>Loading posts...</div>
        ) : posts.length === 0 ? (
          <div style={{textAlign:'center',padding:'60px 20px'}}>
            <div style={{fontSize:'48px',marginBottom:'16px'}}>🗺</div>
            <div style={{fontSize:'16px',fontWeight:'700',color:'#8892a4',marginBottom:'16px'}}>No posts yet</div>
            <button onClick={()=>window.location.href='/post'} style={{background:'linear-gradient(135deg,#00e5ff,#00ff88)',border:'none',borderRadius:'12px',padding:'12px 28px',fontSize:'14px',fontWeight:'700',color:'#070a10',cursor:'pointer'}}>
              📸 Create First Post
            </button>
          </div>
        ) : posts.map(post => (
          <div key={post.id} style={{background:'#111620',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'16px',marginBottom:'14px',overflow:'hidden'}}>
            <div style={{display:'flex',alignItems:'center',gap:'10px',padding:'12px 14px 8px'}}>
              <div onClick={()=>window.location.href=`/user/${post.profiles?.id}`} style={{width:'40px',height:'40px',borderRadius:'50%',background:'linear-gradient(135deg,#00e5ff,#00ff88)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,overflow:'hidden',cursor:'pointer'}}>
                {post.profiles?.avatar_url
                  ? <img src={post.profiles.avatar_url} style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                  : <span style={{fontSize:'16px',fontWeight:'800',color:'#070a10'}}>{(post.profiles?.full_name||post.profiles?.username||'E')[0].toUpperCase()}</span>
                }
              </div>
              <div style={{flex:1,cursor:'pointer'}} onClick={()=>window.location.href=`/user/${post.profiles?.id}`}>
                <div style={{fontSize:'14px',fontWeight:'700'}}>{post.profiles?.full_name||post.profiles?.username||'Explorer'}</div>
                <div style={{fontSize:'11px',color:'#4a5568'}}>@{post.profiles?.username||'explorer'}</div>
                {post.location_name && <div style={{fontSize:'11px',color:'#00e5ff',marginTop:'1px'}}>📍 {post.location_name}</div>}
              </div>
              <div style={{fontSize:'11px',color:'#4a5568'}}>{timeAgo(post.created_at)}</div>
            </div>

            {post.media_type==='capsule' && (
              <div style={{margin:'0 14px 10px',background:'rgba(255,202,40,0.06)',border:'1px solid rgba(255,202,40,0.2)',borderRadius:'12px',padding:'14px',display:'flex',gap:'12px',alignItems:'center'}}>
                <span style={{fontSize:'28px'}}>📦</span>
                <div>
                  <div style={{fontSize:'13px',fontWeight:'700',color:'#ffca28'}}>🔒 Time Capsule</div>
                  <div style={{fontSize:'11px',color:'#4a5568',marginTop:'2px'}}>Visit within 300m to unlock · 📍 {post.location_name}</div>
                </div>
              </div>
            )}

            {post.media_url && post.media_type==='photo' && (
              <img src={post.media_url} style={{width:'100%',maxHeight:'400px',objectFit:'cover',display:'block'}}/>
            )}
            {post.media_url && post.media_type==='video' && (
              <video src={post.media_url} controls style={{width:'100%',maxHeight:'400px',display:'block'}}/>
            )}

            {post.content && (
              <div style={{padding:'8px 14px',fontSize:'14px',color:'#8892a4',lineHeight:'1.6'}}>{post.content}</div>
            )}

            <div style={{display:'flex',padding:'4px 6px 10px',borderTop:'1px solid rgba(255,255,255,0.04)',marginTop:'4px'}}>
              <button onClick={()=>handleLike(post.id)} style={{display:'flex',alignItems:'center',gap:'5px',padding:'7px 10px',border:'none',background:'none',cursor:'pointer',color:'#4a5568',fontSize:'13px'}}>
                ❤️ {post.likes_count||0}
              </button>
              <button style={{display:'flex',alignItems:'center',gap:'5px',padding:'7px 10px',border:'none',background:'none',cursor:'pointer',color:'#4a5568',fontSize:'13px'}}>
                💬 {post.comments_count||0}
              </button>
              <button style={{display:'flex',alignItems:'center',gap:'5px',padding:'7px 10px',border:'none',background:'none',cursor:'pointer',color:'#4a5568',fontSize:'13px'}}>
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
