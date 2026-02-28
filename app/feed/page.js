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
      if (!data.session) window.location.href = '/'
      else { setUser(data.session.user); loadPosts() }
    })
  }, [])

  const loadPosts = async () => {
    const { data } = await supabase
      .from('posts')
      .select('*, profiles(username, avatar_url)')
      .order('created_at', { ascending: false })
    setPosts(data || [])
    setLoading(false)
  }

  const handleLike = async (postId) => {
    if (!user) return
    await supabase.from('likes').insert({ user_id: user.id, post_id: postId })
    setPosts(posts.map(p => p.id === postId ? {...p, likes_count: (p.likes_count||0)+1} : p))
  }

  const timeAgo = (date) => {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000)
    if (seconds < 60) return 'just now'
    if (seconds < 3600) return Math.floor(seconds/60) + 'm ago'
    if (seconds < 86400) return Math.floor(seconds/3600) + 'h ago'
    return Math.floor(seconds/86400) + 'd ago'
  }

  return (
    <div style={{minHeight:'100vh',background:'#070a10',color:'#eef2f7'}}>
      {/* TOP BAR */}
      <div style={{position:'fixed',top:0,left:0,right:0,background:'rgba(7,10,16,0.95)',borderBottom:'1px solid rgba(255,255,255,0.07)',padding:'0 20px',height:'56px',display:'flex',alignItems:'center',justifyContent:'space-between',zIndex:100}}>
        <div style={{fontSize:'20px',fontWeight:'800',background:'linear-gradient(90deg,#00e5ff,#00ff88)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>ECHO⬡WORLD</div>
        <button onClick={async()=>{await supabase.auth.signOut();window.location.href='/'}} style={{background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'20px',padding:'6px 14px',color:'#8892a4',fontSize:'13px',cursor:'pointer'}}>Logout</button>
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

      <div style={{paddingTop:'76px',paddingBottom:'90px',maxWidth:'600px',margin:'0 auto',padding:'76px 16px 90px'}}>

        {/* Welcome card */}
        <div style={{background:'linear-gradient(135deg,rgba(0,229,255,0.08),rgba(0,255,136,0.05))',border:'1px solid rgba(0,229,255,0.15)',borderRadius:'16px',padding:'16px',marginBottom:'20px'}}>
          <div style={{fontSize:'13px',color:'#00e5ff',marginBottom:'4px'}}>⚔ Level 1 Explorer</div>
          <div style={{fontSize:'18px',fontWeight:'700'}}>Welcome to Echo World! 🌍</div>
          <div style={{fontSize:'13px',color:'#4a5568',marginTop:'4px'}}>Start exploring to unlock your city</div>
        </div>

        {/* Create post bar */}
        <div style={{background:'#111620',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'16px',padding:'14px',marginBottom:'20px',display:'flex',gap:'12px',alignItems:'center'}}>
          <div style={{width:'38px',height:'38px',borderRadius:'50%',background:'linear-gradient(135deg,#00e5ff,#00ff88)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'18px',flexShrink:0}}>🧭</div>
          <div onClick={()=>window.location.href='/post'} style={{flex:1,background:'#0c1018',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'30px',padding:'10px 16px',color:'#4a5568',fontSize:'14px',cursor:'pointer'}}>
            Share something at your location...
          </div>
        </div>

        {/* Posts */}
        {loading ? (
          <div style={{textAlign:'center',padding:'40px',color:'#4a5568'}}>Loading posts...</div>
        ) : posts.length === 0 ? (
          <div style={{textAlign:'center',padding:'60px 20px',color:'#4a5568'}}>
            <div style={{fontSize:'48px',marginBottom:'16px'}}>🗺</div>
            <div style={{fontSize:'18px',fontWeight:'700',color:'#8892a4',marginBottom:'8px'}}>No posts yet</div>
            <div style={{fontSize:'14px',marginBottom:'24px'}}>Be the first to post!</div>
            <button onClick={()=>window.location.href='/post'} style={{background:'linear-gradient(135deg,#00e5ff,#00ff88)',border:'none',borderRadius:'12px',padding:'12px 28px',fontSize:'14px',fontWeight:'700',color:'#070a10',cursor:'pointer'}}>📸 Create First Post</button>
          </div>
        ) : posts.map(post => (
          <div key={post.id} style={{background:'#111620',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'16px',marginBottom:'16px',overflow:'hidden'}}>

            {/* Post header */}
            <div style={{display:'flex',alignItems:'center',gap:'10px',padding:'14px 16px 10px'}}>
              <div style={{width:'40px',height:'40px',borderRadius:'50%',background:'linear-gradient(135deg,#00e5ff,#00ff88)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'18px',flexShrink:0}}>
                {post.profiles?.username?.[0]?.toUpperCase() || '👤'}
              </div>
              <div style={{flex:1}}>
                <div style={{fontSize:'14px',fontWeight:'600'}}>{post.profiles?.username || 'Explorer'}</div>
                {post.location_name && (
                  <div style={{fontSize:'11px',color:'#00e5ff',marginTop:'2px'}}>📍 {post.location_name}</div>
                )}
              </div>
              <div style={{fontSize:'11px',color:'#4a5568'}}>{timeAgo(post.created_at)}</div>
            </div>

            {/* Media */}
            {post.media_url && post.media_type === 'photo' && (
              <img src={post.media_url} style={{width:'100%',maxHeight:'400px',objectFit:'cover',display:'block'}}/>
            )}
            {post.media_url && post.media_type === 'video' && (
              <video src={post.media_url} controls style={{width:'100%',maxHeight:'400px',display:'block'}}/>
            )}

            {/* Capsule */}
            {post.media_type === 'capsule' && (
              <div style={{margin:'0 16px 12px',background:'rgba(255,202,40,0.06)',border:'1px solid rgba(255,202,40,0.2)',borderRadius:'10px',padding:'14px',display:'flex',gap:'12px',alignItems:'center'}}>
                <span style={{fontSize:'28px'}}>📦</span>
                <div>
                  <div style={{fontSize:'13px',fontWeight:'600',color:'#ffca28'}}>🔒 Time Capsule</div>
                  <div style={{fontSize:'11px',color:'#4a5568',marginTop:'2px'}}>Visit this location to unlock</div>
                </div>
              </div>
            )}

            {/* Content */}
            {post.content && (
              <div style={{padding:'8px 16px 12px',fontSize:'14px',color:'#8892a4',lineHeight:'1.6'}}>{post.content}</div>
            )}

            {/* Actions */}
            <div style={{display:'flex',gap:'4px',padding:'4px 8px 12px',borderTop:'1px solid rgba(255,255,255,0.05)'}}>
              <button onClick={()=>handleLike(post.id)} style={{display:'flex',alignItems:'center',gap:'6px',padding:'8px 12px',border:'none',background:'none',cursor:'pointer',color:'#4a5568',fontSize:'13px',borderRadius:'8px'}}>
                ❤️ {post.likes_count || 0}
              </button>
              <button style={{display:'flex',alignItems:'center',gap:'6px',padding:'8px 12px',border:'none',background:'none',cursor:'pointer',color:'#4a5568',fontSize:'13px',borderRadius:'8px'}}>
                💬 {post.comments_count || 0}
              </button>
              <button onClick={()=>{navigator.clipboard?.writeText(window.location.origin+'/post/'+post.id)}} style={{display:'flex',alignItems:'center',gap:'6px',padding:'8px 12px',border:'none',background:'none',cursor:'pointer',color:'#4a5568',fontSize:'13px',borderRadius:'8px'}}>
                ↗ Share
              </button>
              {post.location_name && (
                <button style={{marginLeft:'auto',display:'flex',alignItems:'center',gap:'4px',padding:'8px 12px',border:'none',background:'none',cursor:'pointer',color:'#00e5ff',fontSize:'12px'}}>
                  🗺 Map
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
