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
  const [activeTab, setActiveTab] = useState('all')

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) window.location.href = '/'
      else { setUser(data.session.user); loadPosts() }
    })
  }, [])

  const loadPosts = async () => {
    const { data } = await supabase
      .from('posts')
      .select('*, profiles(id, username, full_name, avatar_url)')
      
      .order('created_at', { ascending: false })
    setPosts(data || [])
    setLoading(false)
  }

  const handleLike = async (postId) => {
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

  const getDisplayName = (post) => post.profiles?.full_name || post.profiles?.username || 'Explorer'

  const filteredPosts = posts.filter(p => {
    if (activeTab === 'all') return true
    if (activeTab === 'echo') return p.media_type === 'video' && p.post_format === 'echo'
    if (activeTab === 'photos') return p.media_type === 'photo'
    if (activeTab === 'capsules') return p.media_type === 'capsule'
    return true
  })

  return (
    <div style={{minHeight:'100vh',background:'#070a10',color:'#eef2f7'}}>

      {/* TOP BAR */}
      <div style={{position:'fixed',top:0,left:0,right:0,background:'rgba(7,10,16,0.95)',borderBottom:'1px solid rgba(255,255,255,0.07)',zIndex:100}}>
        <div style={{padding:'0 16px',height:'52px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div style={{fontSize:'20px',fontWeight:'800',background:'linear-gradient(90deg,#00e5ff,#00ff88)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>ECHO⬡WORLD</div>
          <div style={{display:'flex',gap:'8px'}}>
            <button onClick={()=>window.location.href='/search'} style={{background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'20px',padding:'6px 12px',color:'#8892a4',fontSize:'13px',cursor:'pointer'}}>🔍</button>
            <button onClick={async()=>{await supabase.auth.signOut();window.location.href='/'}} style={{background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'20px',padding:'6px 12px',color:'#8892a4',fontSize:'13px',cursor:'pointer'}}>Logout</button>
          </div>
        </div>

        {/* Feed tabs */}
        <div style={{display:'flex',gap:'6px',padding:'0 16px 10px',overflowX:'auto'}}>
          {[
            {key:'all',label:'🌍 All'},
            {key:'echo',label:'⚡ ECHO'},
            {key:'photos',label:'📷 Photos'},
            {key:'capsules',label:'📦 Capsules'},
          ].map(t => (
            <button key={t.key} onClick={()=>setActiveTab(t.key)} style={{padding:'6px 14px',borderRadius:'20px',border:'none',cursor:'pointer',fontSize:'12px',fontWeight:'600',whiteSpace:'nowrap',background:activeTab===t.key?'linear-gradient(135deg,#00e5ff,#00ff88)':'rgba(255,255,255,0.05)',color:activeTab===t.key?'#070a10':'#4a5568'}}>
              {t.label}
            </button>
          ))}
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

      <div style={{paddingTop:'100px',paddingBottom:'90px',maxWidth:'600px',margin:'0 auto',padding:'100px 16px 90px'}}>

        {/* Create post bar */}
        <div style={{background:'#111620',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'16px',padding:'12px',marginBottom:'16px',display:'flex',gap:'10px',alignItems:'center'}}>
          <div style={{width:'36px',height:'36px',borderRadius:'50%',background:'linear-gradient(135deg,#00e5ff,#00ff88)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'16px',flexShrink:0}}>🧭</div>
          <div onClick={()=>window.location.href='/post'} style={{flex:1,background:'#0c1018',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'30px',padding:'10px 16px',color:'#4a5568',fontSize:'13px',cursor:'pointer'}}>
            Share something at your location...
          </div>
        </div>

        {/* ECHO shortcut */}
        {activeTab === 'echo' && (
          <div onClick={()=>window.location.href='/echo'} style={{background:'linear-gradient(135deg,rgba(0,229,255,0.1),rgba(0,255,136,0.06))',border:'1px solid rgba(0,229,255,0.2)',borderRadius:'14px',padding:'16px',marginBottom:'16px',display:'flex',alignItems:'center',gap:'12px',cursor:'pointer'}}>
            <div style={{fontSize:'32px'}}>⚡</div>
            <div>
              <div style={{fontSize:'15px',fontWeight:'700',color:'#00e5ff'}}>ECHO Short Videos</div>
              <div style={{fontSize:'12px',color:'#4a5568'}}>Scroll through short videos from your city</div>
            </div>
            <div style={{marginLeft:'auto',fontSize:'20px',color:'#00e5ff'}}>›</div>
          </div>
        )}

        {/* Posts */}
        {loading ? (
          <div style={{textAlign:'center',padding:'40px',color:'#4a5568'}}>Loading...</div>
        ) : filteredPosts.length === 0 ? (
          <div style={{textAlign:'center',padding:'60px 20px',color:'#4a5568'}}>
            <div style={{fontSize:'48px',marginBottom:'16px'}}>🗺</div>
            <div style={{fontSize:'16px',fontWeight:'700',color:'#8892a4',marginBottom:'8px'}}>No posts yet</div>
            <button onClick={()=>window.location.href='/post'} style={{background:'linear-gradient(135deg,#00e5ff,#00ff88)',border:'none',borderRadius:'12px',padding:'12px 28px',fontSize:'14px',fontWeight:'700',color:'#070a10',cursor:'pointer'}}>📸 Create First Post</button>
          </div>
        ) : filteredPosts.map(post => (
          <div key={post.id} style={{background:'#111620',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'16px',marginBottom:'14px',overflow:'hidden'}}>

            {/* Post header — click to go to user profile */}
            <div style={{display:'flex',alignItems:'center',gap:'10px',padding:'12px 14px 8px'}}>
              <div
                onClick={()=>window.location.href=`/user/${post.profiles?.id}`}
                style={{width:'40px',height:'40px',borderRadius:'50%',background:'linear-gradient(135deg,#00e5ff,#00ff88)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,overflow:'hidden',cursor:'pointer'}}>
                {post.profiles?.avatar_url
                  ? <img src={post.profiles.avatar_url} style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                  : <span style={{fontSize:'16px',fontWeight:'800'}}>{(post.profiles?.full_name||post.profiles?.username||'E')[0].toUpperCase()}</span>
                }
              </div>
              <div style={{flex:1,cursor:'pointer'}} onClick={()=>window.location.href=`/user/${post.profiles?.id}`}>
                <div style={{fontSize:'14px',fontWeight:'700'}}>{getDisplayName(post)}</div>
                <div style={{fontSize:'11px',color:'#4a5568'}}>@{post.profiles?.username||'explorer'}</div>
                {post.location_name && <div style={{fontSize:'11px',color:'#00e5ff',marginTop:'1px'}}>📍 {post.location_name}</div>}
              </div>
              <div style={{fontSize:'11px',color:'#4a5568'}}>{timeAgo(post.created_at)}</div>
            </div>

            {/* Capsule */}
            {post.media_type==='capsule' && (
              <div style={{margin:'0 14px 10px',background:'rgba(255,202,40,0.06)',border:'1px solid rgba(255,202,40,0.2)',borderRadius:'12px',padding:'14px',display:'flex',gap:'12px',alignItems:'center'}}>
                <span style={{fontSize:'28px'}}>📦</span>
                <div>
                  <div style={{fontSize:'13px',fontWeight:'700',color:'#ffca28'}}>🔒 Time Capsule</div>
                  <div style={{fontSize:'11px',color:'#4a5568',marginTop:'2px'}}>Visit within 300m to unlock</div>
                  <div style={{fontSize:'11px',color:'#4a5568'}}>📍 {post.location_name}</div>
                </div>
              </div>
            )}

            {/* Media */}
            {post.media_url && post.media_type==='photo' && (
              <img src={post.media_url} style={{width:'100%',maxHeight:'400px',objectFit:'cover',display:'block'}}/>
            )}
            {post.media_url && (post.media_type==='video') && (
              <video src={post.media_url} controls style={{width:'100%',maxHeight:'400px',display:'block'}}/>
            )}

            {/* Content */}
            {post.content && (
              <div style={{padding:'8px 14px',fontSize:'14px',color:'#8892a4',lineHeight:'1.6'}}>{post.content}</div>
            )}

            {/* Hashtags */}
            {post.hashtags && (
              <div style={{padding:'0 14px 8px',fontSize:'13px',color:'#00e5ff'}}>{post.hashtags}</div>
            )}

            {/* Actions */}
            <div style={{display:'flex',padding:'4px 6px 10px',borderTop:'1px solid rgba(255,255,255,0.04)',marginTop:'4px'}}>
              <button onClick={()=>handleLike(post.id)} style={{display:'flex',alignItems:'center',gap:'5px',padding:'7px 10px',border:'none',background:'none',cursor:'pointer',color:'#4a5568',fontSize:'13px',borderRadius:'8px'}}>
                ❤️ {post.likes_count||0}
              </button>
              <button style={{display:'flex',alignItems:'center',gap:'5px',padding:'7px 10px',border:'none',background:'none',cursor:'pointer',color:'#4a5568',fontSize:'13px',borderRadius:'8px'}}>
                💬 {post.comments_count||0}
              </button>
              <button style={{display:'flex',alignItems:'center',gap:'5px',padding:'7px 10px',border:'none',background:'none',cursor:'pointer',color:'#4a5568',fontSize:'13px',borderRadius:'8px'}}>
                ↗ Share
              </button>
              {post.location_name && (
                <button onClick={()=>window.location.href='/map'} style={{marginLeft:'auto',display:'flex',alignItems:'center',gap:'4px',padding:'7px 10px',border:'none',background:'none',cursor:'pointer',color:'#00e5ff',fontSize:'12px'}}>
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
