'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default function UserProfile({ params }) {
  const [currentUser, setCurrentUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [posts, setPosts] = useState([])
  const [isSupporting, setIsSupporting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('all')

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { window.location.href = '/'; return }
      const cu = data.session.user
      setCurrentUser(cu)
      const { data: p } = await supabase.from('profiles').select('*').eq('id', params.id).single()
      setProfile(p)
      const { data: userPosts } = await supabase.from('posts').select('*').eq('user_id', params.id).eq('privacy','public').order('created_at', { ascending: false })
      setPosts(userPosts || [])
      const { data: followData } = await supabase.from('followers').select('id').eq('follower_id', cu.id).eq('following_id', params.id).single()
      setIsSupporting(!!followData)
      setLoading(false)
    })
  }, [params.id])

  const toggleSupport = async () => {
    if (!currentUser) return
    if (isSupporting) {
      await supabase.from('followers').delete().eq('follower_id', currentUser.id).eq('following_id', params.id)
      await supabase.from('profiles').update({ followers_count: Math.max((profile.followers_count||1)-1, 0) }).eq('id', params.id)
      setProfile({...profile, followers_count: Math.max((profile.followers_count||1)-1, 0)})
      setIsSupporting(false)
    } else {
      await supabase.from('followers').insert({ follower_id: currentUser.id, following_id: params.id })
      await supabase.from('profiles').update({ followers_count: (profile.followers_count||0)+1 }).eq('id', params.id)
      await supabase.from('notifications').insert({ user_id: params.id, from_user_id: currentUser.id, type: 'follow' })
      setProfile({...profile, followers_count: (profile.followers_count||0)+1})
      setIsSupporting(true)
    }
  }

  const timeAgo = (date) => {
    const s = Math.floor((new Date() - new Date(date)) / 1000)
    if (s < 60) return 'just now'
    if (s < 3600) return Math.floor(s/60) + 'm ago'
    if (s < 86400) return Math.floor(s/3600) + 'h ago'
    return Math.floor(s/86400) + 'd ago'
  }

  const filteredPosts = posts.filter(p => {
    if (activeTab === 'all') return true
    if (activeTab === 'photos') return p.media_type === 'photo'
    if (activeTab === 'videos') return p.media_type === 'video'
    if (activeTab === 'capsules') return p.media_type === 'capsule'
    return true
  })

  if (loading) return <div style={{minHeight:'100vh',background:'#070a10',display:'flex',alignItems:'center',justifyContent:'center',color:'#4a5568'}}>Loading...</div>
  if (!profile) return <div style={{minHeight:'100vh',background:'#070a10',display:'flex',alignItems:'center',justifyContent:'center',color:'#ff4560'}}>User not found</div>

  const isOwnProfile = currentUser?.id === params.id

  return (
    <div style={{minHeight:'100vh',background:'#070a10',color:'#eef2f7'}}>

      {/* TOP BAR */}
      <div style={{position:'fixed',top:0,left:0,right:0,background:'rgba(7,10,16,0.95)',borderBottom:'1px solid rgba(255,255,255,0.07)',padding:'0 16px',height:'56px',display:'flex',alignItems:'center',gap:'12px',zIndex:100}}>
        <button onClick={()=>window.history.back()} style={{background:'none',border:'none',color:'#8892a4',fontSize:'24px',cursor:'pointer'}}>←</button>
        <div style={{fontSize:'16px',fontWeight:'800',color:'#eef2f7'}}>{profile.full_name || profile.username}</div>
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
          <div key={item.label} onClick={()=>window.location.href=item.path} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'4px',cursor:'pointer',color:'#4a5568'}}>
            <span style={{fontSize:'22px'}}>{item.icon}</span>
            <span style={{fontSize:'10px',fontWeight:'600'}}>{item.label}</span>
          </div>
        ))}
      </div>

      <div style={{paddingTop:'56px',paddingBottom:'90px',maxWidth:'600px',margin:'0 auto'}}>

        {/* Cover */}
        <div style={{height:'160px',background:'linear-gradient(135deg,#0a1828,#0d2040)',position:'relative',overflow:'hidden'}}>
          {profile.cover_url && <img src={profile.cover_url} style={{width:'100%',height:'100%',objectFit:'cover'}}/>}
          <div style={{position:'absolute',inset:0,background:'linear-gradient(to bottom,transparent,rgba(7,10,16,0.8))'}}></div>
        </div>

        {/* Profile info */}
        <div style={{padding:'0 16px',marginTop:'-36px',marginBottom:'16px'}}>
          <div style={{display:'flex',alignItems:'flex-end',justifyContent:'space-between',marginBottom:'12px'}}>
            <div style={{width:'72px',height:'72px',borderRadius:'50%',border:'3px solid #070a10',overflow:'hidden',background:'linear-gradient(135deg,#00e5ff,#00ff88)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'28px'}}>
              {profile.avatar_url ? <img src={profile.avatar_url} style={{width:'100%',height:'100%',objectFit:'cover'}}/> : (profile.username?.[0]?.toUpperCase()||'🧭')}
            </div>
            {!isOwnProfile && (
              <button onClick={toggleSupport} style={{
                background: isSupporting ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg,#00e5ff,#00ff88)',
                border: isSupporting ? '1px solid rgba(255,255,255,0.15)' : 'none',
                borderRadius:'10px',padding:'10px 20px',
                fontSize:'14px',fontWeight:'700',
                color: isSupporting ? '#8892a4' : '#070a10',
                cursor:'pointer',
              }}>
                {isSupporting ? '✓ Supporting' : '⚡ Support'}
              </button>
            )}
            {isOwnProfile && (
              <button onClick={()=>window.location.href='/profile'} style={{background:'rgba(0,229,255,0.1)',border:'1px solid rgba(0,229,255,0.3)',borderRadius:'10px',padding:'10px 20px',fontSize:'14px',fontWeight:'700',color:'#00e5ff',cursor:'pointer'}}>
                ✏ Edit Profile
              </button>
            )}
          </div>

          <div style={{fontSize:'20px',fontWeight:'800',marginBottom:'2px'}}>{profile.full_name || profile.username}</div>
          <div style={{fontSize:'13px',color:'#4a5568',marginBottom:'8px'}}>@{profile.username}</div>
          {profile.bio && <div style={{fontSize:'14px',color:'#8892a4',marginBottom:'12px',lineHeight:'1.5'}}>{profile.bio}</div>}

          {/* Stats */}
          <div style={{display:'flex',gap:'0',background:'#111620',borderRadius:'12px',border:'1px solid rgba(255,255,255,0.07)',overflow:'hidden',marginBottom:'16px'}}>
            {[
              {label:'Posts',value:posts.length},
              {label:'Supporters',value:profile.followers_count||0},
              {label:'Supporting',value:profile.following_count||0},
              {label:'Level',value:profile.level||1},
            ].map((s,i) => (
              <div key={s.label} style={{flex:1,textAlign:'center',padding:'12px 4px',borderRight:i<3?'1px solid rgba(255,255,255,0.05)':'none'}}>
                <div style={{fontSize:'18px',fontWeight:'800',color:'#00e5ff'}}>{s.value}</div>
                <div style={{fontSize:'10px',color:'#4a5568'}}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Badges */}
          <div style={{background:'#111620',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'12px',padding:'14px',marginBottom:'16px'}}>
            <div style={{fontSize:'12px',fontWeight:'700',color:'#4a5568',marginBottom:'10px'}}>🏅 BADGES</div>
            <div style={{display:'flex',gap:'8px',flexWrap:'wrap'}}>
              {[
                {icon:'🌍',label:'Explorer',earned:posts.length>0},
                {icon:'📸',label:'First Post',earned:posts.length>0},
                {icon:'📦',label:'Capsule',earned:posts.some(p=>p.media_type==='capsule')},
                {icon:'🍜',label:'Foodie',earned:false},
                {icon:'🌙',label:'Night Owl',earned:false},
                {icon:'👑',label:'Mayor',earned:false},
                {icon:'📍',label:'Check-in',earned:posts.some(p=>p.media_type==='checkin')},
              ].map(badge => (
                <div key={badge.label} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'3px',padding:'8px',borderRadius:'10px',minWidth:'52px',background:badge.earned?'rgba(255,202,40,0.1)':'rgba(255,255,255,0.02)',border:`1px solid ${badge.earned?'rgba(255,202,40,0.3)':'rgba(255,255,255,0.05)'}`,opacity:badge.earned?1:0.35}}>
                  <span style={{fontSize:'20px'}}>{badge.icon}</span>
                  <span style={{fontSize:'9px',color:badge.earned?'#ffca28':'#4a5568',textAlign:'center'}}>{badge.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Tabs */}
          <div style={{display:'flex',gap:'6px',background:'#111620',borderRadius:'12px',padding:'4px',border:'1px solid rgba(255,255,255,0.07)',marginBottom:'16px'}}>
            {[
              {key:'all',label:'All'},
              {key:'photos',label:'📷'},
              {key:'videos',label:'🎥'},
              {key:'capsules',label:'📦'},
            ].map(tab => (
              <button key={tab.key} onClick={()=>setActiveTab(tab.key)} style={{flex:1,padding:'8px 4px',border:'none',borderRadius:'8px',cursor:'pointer',fontSize:'13px',fontWeight:'600',background:activeTab===tab.key?'linear-gradient(135deg,#00e5ff,#00ff88)':'transparent',color:activeTab===tab.key?'#070a10':'#4a5568'}}>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Posts */}
          {filteredPosts.length === 0 ? (
            <div style={{textAlign:'center',padding:'40px',color:'#4a5568'}}>
              <div style={{fontSize:'40px',marginBottom:'12px'}}>🗺</div>
              <div>No posts here yet!</div>
            </div>
          ) : filteredPosts.map(post => (
            <div key={post.id} style={{background:'#111620',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'14px',marginBottom:'12px',overflow:'hidden'}}>
              <div style={{padding:'10px 14px 6px',display:'flex',justifyContent:'space-between'}}>
                <div style={{fontSize:'11px',color:'#00e5ff'}}>📍 {post.location_name||'Unknown'}</div>
                <div style={{fontSize:'11px',color:'#4a5568'}}>{timeAgo(post.created_at)}</div>
              </div>
              {post.media_url && post.media_type==='photo' && <img src={post.media_url} style={{width:'100%',maxHeight:'280px',objectFit:'cover',display:'block'}}/>}
              {post.media_url && post.media_type==='video' && <video src={post.media_url} controls style={{width:'100%',maxHeight:'280px',display:'block'}}/>}
              {post.media_type==='capsule' && <div style={{margin:'0 14px 10px',background:'rgba(255,202,40,0.06)',border:'1px solid rgba(255,202,40,0.2)',borderRadius:'10px',padding:'12px',display:'flex',gap:'10px',alignItems:'center'}}><span style={{fontSize:'24px'}}>📦</span><div style={{fontSize:'12px',color:'#ffca28'}}>🔒 Time Capsule</div></div>}
              {post.content && <div style={{padding:'8px 14px 12px',fontSize:'14px',color:'#8892a4'}}>{post.content}</div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
                                                                              }
