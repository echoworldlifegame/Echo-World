'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default function Profile() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { window.location.href = '/'; return }
      const u = data.session.user
      setUser(u)
      const { data: p } = await supabase.from('profiles').select('*').eq('id', u.id).single()
      setProfile(p)
      const { data: userPosts } = await supabase.from('posts').select('*').eq('user_id', u.id).order('created_at', { ascending: false })
      setPosts(userPosts || [])
      setLoading(false)
    })
  }, [])

  const timeAgo = (date) => {
    const s = Math.floor((new Date() - new Date(date)) / 1000)
    if (s < 60) return 'just now'
    if (s < 3600) return Math.floor(s/60) + 'm ago'
    if (s < 86400) return Math.floor(s/3600) + 'h ago'
    return Math.floor(s/86400) + 'd ago'
  }

  if (loading) return (
    <div style={{minHeight:'100vh',background:'#070a10',display:'flex',alignItems:'center',justifyContent:'center',color:'#4a5568'}}>
      Loading...
    </div>
  )

  return (
    <div style={{minHeight:'100vh',background:'#070a10',color:'#eef2f7'}}>

      {/* TOP BAR */}
      <div style={{position:'fixed',top:0,left:0,right:0,background:'rgba(7,10,16,0.95)',borderBottom:'1px solid rgba(255,255,255,0.07)',padding:'0 20px',height:'56px',display:'flex',alignItems:'center',justifyContent:'space-between',zIndex:100}}>
        <button onClick={()=>window.location.href='/feed'} style={{background:'none',border:'none',color:'#8892a4',fontSize:'24px',cursor:'pointer'}}>←</button>
        <div style={{fontSize:'16px',fontWeight:'800',background:'linear-gradient(90deg,#00e5ff,#00ff88)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>Profile</div>
        <button onClick={async()=>{await supabase.auth.signOut();window.location.href='/'}} style={{background:'rgba(255,69,96,0.1)',border:'1px solid rgba(255,69,96,0.3)',borderRadius:'20px',padding:'6px 14px',color:'#ff4560',fontSize:'12px',cursor:'pointer',fontWeight:'600'}}>Logout</button>
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
          <div key={item.label} onClick={()=>window.location.href=item.path} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'4px',cursor:'pointer',color:item.path==='/profile'?'#00e5ff':'#4a5568'}}>
            <span style={{fontSize:'22px'}}>{item.icon}</span>
            <span style={{fontSize:'10px',fontWeight:'600'}}>{item.label}</span>
          </div>
        ))}
      </div>

      <div style={{padding:'76px 16px 90px',maxWidth:'600px',margin:'0 auto'}}>

        {/* Profile Hero */}
        <div style={{background:'linear-gradient(135deg,rgba(0,229,255,0.08),rgba(0,255,136,0.05))',border:'1px solid rgba(0,229,255,0.15)',borderRadius:'20px',padding:'24px',marginBottom:'20px',textAlign:'center'}}>
          <div style={{width:'80px',height:'80px',borderRadius:'50%',background:'linear-gradient(135deg,#00e5ff,#00ff88)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'36px',margin:'0 auto 16px',border:'3px solid rgba(0,229,255,0.3)'}}>
            {profile?.username?.[0]?.toUpperCase() || '🧭'}
          </div>
          <div style={{fontSize:'22px',fontWeight:'800',marginBottom:'4px'}}>{profile?.username || 'Explorer'}</div>
          <div style={{fontSize:'13px',color:'#4a5568',marginBottom:'16px'}}>{user?.email}</div>

          {/* Level & XP */}
          <div style={{background:'rgba(0,0,0,0.3)',borderRadius:'12px',padding:'12px',marginBottom:'16px'}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:'6px'}}>
              <span style={{fontSize:'13px',color:'#00e5ff',fontWeight:'700'}}>⚔ Level {profile?.level || 1}</span>
              <span style={{fontSize:'12px',color:'#4a5568'}}>{profile?.xp || 0} XP</span>
            </div>
            <div style={{height:'6px',background:'rgba(255,255,255,0.05)',borderRadius:'3px'}}>
              <div style={{height:'100%',width:`${Math.min(((profile?.xp||0)%1000)/10,100)}%`,background:'linear-gradient(90deg,#00e5ff,#00ff88)',borderRadius:'3px',minWidth:'4px'}}></div>
            </div>
          </div>

          {/* Stats */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'10px'}}>
            {[
              {label:'Posts',value:posts.length,icon:'📸'},
              {label:'Level',value:profile?.level||1,icon:'⚔'},
              {label:'XP',value:profile?.xp||0,icon:'✨'},
            ].map(stat => (
              <div key={stat.label} style={{background:'rgba(0,0,0,0.3)',borderRadius:'10px',padding:'10px'}}>
                <div style={{fontSize:'20px',marginBottom:'4px'}}>{stat.icon}</div>
                <div style={{fontSize:'18px',fontWeight:'800',color:'#00e5ff'}}>{stat.value}</div>
                <div style={{fontSize:'11px',color:'#4a5568'}}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Badges */}
        <div style={{background:'#111620',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'16px',padding:'16px',marginBottom:'20px'}}>
          <div style={{fontSize:'14px',fontWeight:'700',marginBottom:'12px'}}>🏅 Badges</div>
          <div style={{display:'flex',gap:'10px',flexWrap:'wrap'}}>
            {[
              {icon:'🌍',label:'Explorer',earned:posts.length>0},
              {icon:'📸',label:'First Post',earned:posts.length>0},
              {icon:'🍜',label:'Foodie',earned:false},
              {icon:'🌙',label:'Night Owl',earned:false},
              {icon:'👑',label:'Mayor',earned:false},
              {icon:'📦',label:'Capsule',earned:posts.some(p=>p.media_type==='capsule')},
            ].map(badge => (
              <div key={badge.label} style={{
                display:'flex',flexDirection:'column',alignItems:'center',gap:'4px',
                padding:'10px',borderRadius:'10px',width:'64px',
                background:badge.earned ? 'rgba(255,202,40,0.1)' : 'rgba(255,255,255,0.03)',
                border:`1px solid ${badge.earned ? 'rgba(255,202,40,0.3)' : 'rgba(255,255,255,0.05)'}`,
                opacity:badge.earned ? 1 : 0.4,
              }}>
                <span style={{fontSize:'24px'}}>{badge.icon}</span>
                <span style={{fontSize:'9px',color:badge.earned?'#ffca28':'#4a5568',textAlign:'center'}}>{badge.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* My Posts */}
        <div style={{fontSize:'14px',fontWeight:'700',marginBottom:'12px',color:'#8892a4'}}>📸 My Posts ({posts.length})</div>

        {posts.length === 0 ? (
          <div style={{textAlign:'center',padding:'40px',color:'#4a5568'}}>
            <div style={{fontSize:'40px',marginBottom:'12px'}}>🗺</div>
            <div>No posts yet. Go explore!</div>
            <button onClick={()=>window.location.href='/post'} style={{marginTop:'16px',background:'linear-gradient(135deg,#00e5ff,#00ff88)',border:'none',borderRadius:'10px',padding:'10px 24px',fontSize:'13px',fontWeight:'700',color:'#070a10',cursor:'pointer'}}>
              Create First Post
            </button>
          </div>
        ) : posts.map(post => (
          <div key={post.id} style={{background:'#111620',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'14px',marginBottom:'12px',overflow:'hidden'}}>
            {post.media_url && post.media_type==='photo' && (
              <img src={post.media_url} style={{width:'100%',maxHeight:'200px',objectFit:'cover',display:'block'}}/>
            )}
            {post.media_url && post.media_type==='video' && (
              <video src={post.media_url} controls style={{width:'100%',maxHeight:'200px',display:'block'}}/>
            )}
            <div style={{padding:'12px'}}>
              {post.media_type==='capsule' && (
                <div style={{fontSize:'12px',color:'#ffca28',marginBottom:'6px'}}>📦 Time Capsule</div>
              )}
              {post.content && <div style={{fontSize:'14px',color:'#8892a4',marginBottom:'8px'}}>{post.content}</div>}
              <div style={{display:'flex',justifyContent:'space-between',fontSize:'11px',color:'#4a5568'}}>
                <span>📍 {post.location_name || 'Unknown'}</span>
                <span>{timeAgo(post.created_at)}</span>
              </div>
            </div>
          </div>
        ))}

      </div>
    </div>
  )
    }
