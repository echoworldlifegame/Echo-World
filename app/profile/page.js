'use client'
import { useState, useEffect, useRef } from 'react'
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
  const [activeTab, setActiveTab] = useState('all')
  const [editMode, setEditMode] = useState(false)
  const [editBio, setEditBio] = useState('')
  const [editName, setEditName] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const avatarRef = useRef()
  const coverRef = useRef()
  const [avatarUrl, setAvatarUrl] = useState('')
  const [coverUrl, setCoverUrl] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { window.location.href = '/'; return }
      const u = data.session.user
      setUser(u)
      const { data: p } = await supabase.from('profiles').select('*').eq('id', u.id).single()
      setProfile(p)
      setEditBio(p?.bio || '')
      setEditName(p?.full_name || p?.username || '')
      setAvatarUrl(p?.avatar_url || '')
      const { data: userPosts } = await supabase.from('posts').select('*').eq('user_id', u.id).order('created_at', { ascending: false })
      setPosts(userPosts || [])
      setLoading(false)
    })
  }, [])

  const uploadImage = async (file, type) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('upload_preset', 'echoworld_preset')
    const res = await fetch(`https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/auto/upload`, { method: 'POST', body: formData })
    const data = await res.json()
    if (data.secure_url) {
      if (type === 'avatar') {
        setAvatarUrl(data.secure_url)
        await supabase.from('profiles').update({ avatar_url: data.secure_url }).eq('id', user.id)
      } else {
        setCoverUrl(data.secure_url)
      }
    }
  }

  const saveProfile = async () => {
    await supabase.from('profiles').update({ bio: editBio, full_name: editName }).eq('id', user.id)
    setProfile({ ...profile, bio: editBio, full_name: editName })
    setEditMode(false)
  }

  const deletePost = async (postId) => {
    await supabase.from('posts').delete().eq('id', postId)
    setPosts(posts.filter(p => p.id !== postId))
    setDeleteConfirm(null)
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

  return (
    <div style={{minHeight:'100vh',background:'#070a10',color:'#eef2f7'}}>

      {/* TOP BAR */}
      <div style={{position:'fixed',top:0,left:0,right:0,background:'rgba(7,10,16,0.95)',borderBottom:'1px solid rgba(255,255,255,0.07)',padding:'0 16px',height:'56px',display:'flex',alignItems:'center',justifyContent:'space-between',zIndex:100}}>
        <button onClick={()=>window.location.href='/feed'} style={{background:'none',border:'none',color:'#8892a4',fontSize:'24px',cursor:'pointer'}}>←</button>
        <div style={{fontSize:'16px',fontWeight:'800',background:'linear-gradient(90deg,#00e5ff,#00ff88)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>My Profile</div>
        <button onClick={()=>setEditMode(!editMode)} style={{background:'rgba(0,229,255,0.1)',border:'1px solid rgba(0,229,255,0.3)',borderRadius:'20px',padding:'6px 14px',color:'#00e5ff',fontSize:'12px',cursor:'pointer',fontWeight:'600'}}>
          {editMode ? 'Cancel' : '✏ Edit'}
        </button>
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

      <div style={{paddingTop:'56px',paddingBottom:'90px',maxWidth:'600px',margin:'0 auto'}}>

        {/* Cover Photo */}
        <div style={{position:'relative',height:'180px',background:'linear-gradient(135deg,#0a1828,#0d2040)',overflow:'hidden'}}>
          {coverUrl && <img src={coverUrl} style={{width:'100%',height:'100%',objectFit:'cover'}}/>}
          <div style={{position:'absolute',inset:0,background:'linear-gradient(to bottom,transparent,rgba(7,10,16,0.8))'}}></div>
          <input ref={coverRef} type="file" accept="image/*" onChange={e=>uploadImage(e.target.files[0],'cover')} style={{display:'none'}}/>
          <button onClick={()=>coverRef.current.click()} style={{position:'absolute',bottom:'12px',right:'12px',background:'rgba(0,0,0,0.6)',border:'1px solid rgba(255,255,255,0.2)',borderRadius:'8px',padding:'6px 12px',color:'#fff',fontSize:'12px',cursor:'pointer'}}>
            📷 Change Cover
          </button>
        </div>

        {/* Avatar + Name */}
        <div style={{padding:'0 16px',marginTop:'-40px',marginBottom:'16px',position:'relative'}}>
          <div style={{display:'flex',alignItems:'flex-end',justifyContent:'space-between'}}>
            <div style={{position:'relative'}}>
              <div style={{width:'80px',height:'80px',borderRadius:'50%',border:'3px solid #070a10',overflow:'hidden',background:'linear-gradient(135deg,#00e5ff,#00ff88)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'32px'}}>
                {avatarUrl ? <img src={avatarUrl} style={{width:'100%',height:'100%',objectFit:'cover'}}/> : (profile?.username?.[0]?.toUpperCase() || '🧭')}
              </div>
              <input ref={avatarRef} type="file" accept="image/*" onChange={e=>uploadImage(e.target.files[0],'avatar')} style={{display:'none'}}/>
              <button onClick={()=>avatarRef.current.click()} style={{position:'absolute',bottom:0,right:0,background:'#111620',border:'1px solid rgba(255,255,255,0.2)',borderRadius:'50%',width:'24px',height:'24px',fontSize:'12px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>📷</button>
            </div>
            <div style={{display:'flex',gap:'8px'}}>
              <button onClick={()=>window.location.href='/post'} style={{background:'linear-gradient(135deg,#00e5ff,#00ff88)',border:'none',borderRadius:'8px',padding:'8px 16px',fontSize:'13px',fontWeight:'700',color:'#070a10',cursor:'pointer'}}>+ Post</button>
              <button onClick={async()=>{await supabase.auth.signOut();window.location.href='/'}} style={{background:'rgba(255,69,96,0.1)',border:'1px solid rgba(255,69,96,0.3)',borderRadius:'8px',padding:'8px 12px',fontSize:'13px',color:'#ff4560',cursor:'pointer'}}>Logout</button>
            </div>
          </div>

          <div style={{marginTop:'12px'}}>
            {editMode ? (
              <input value={editName} onChange={e=>setEditName(e.target.value)} style={{fontSize:'20px',fontWeight:'800',background:'#111620',border:'1px solid rgba(0,229,255,0.3)',borderRadius:'8px',padding:'6px 12px',color:'#eef2f7',width:'100%',outline:'none',boxSizing:'border-box',marginBottom:'8px'}}/>
            ) : (
              <div style={{fontSize:'22px',fontWeight:'800'}}>{profile?.full_name || profile?.username}</div>
            )}
            <div style={{fontSize:'13px',color:'#4a5568',marginBottom:'8px'}}>@{profile?.username} · {user?.email}</div>

            {editMode ? (
              <textarea value={editBio} onChange={e=>setEditBio(e.target.value)} placeholder="Write something about yourself..." style={{width:'100%',background:'#111620',border:'1px solid rgba(0,229,255,0.3)',borderRadius:'8px',padding:'8px 12px',color:'#eef2f7',fontSize:'13px',outline:'none',resize:'none',fontFamily:'inherit',boxSizing:'border-box',minHeight:'80px'}}/>
            ) : (
              <div style={{fontSize:'14px',color:'#8892a4'}}>{profile?.bio || 'No bio yet. Tap Edit to add one!'}</div>
            )}

            {editMode && (
              <button onClick={saveProfile} style={{marginTop:'10px',background:'linear-gradient(135deg,#00e5ff,#00ff88)',border:'none',borderRadius:'8px',padding:'10px 24px',fontSize:'14px',fontWeight:'700',color:'#070a10',cursor:'pointer',width:'100%'}}>
                💾 Save Profile
              </button>
            )}
          </div>

          {/* Stats */}
          <div style={{display:'flex',gap:'16px',marginTop:'16px',padding:'12px',background:'#111620',borderRadius:'12px',border:'1px solid rgba(255,255,255,0.07)'}}>
            {[
              {label:'Posts',value:posts.length},
              {label:'Level',value:profile?.level||1},
              {label:'XP',value:profile?.xp||0},
              {label:'Capsules',value:posts.filter(p=>p.media_type==='capsule').length},
            ].map(s => (
              <div key={s.label} style={{flex:1,textAlign:'center'}}>
                <div style={{fontSize:'18px',fontWeight:'800',color:'#00e5ff'}}>{s.value}</div>
                <div style={{fontSize:'11px',color:'#4a5568'}}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Level bar */}
        <div style={{padding:'0 16px',marginBottom:'16px'}}>
          <div style={{background:'#111620',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'12px',padding:'12px'}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:'6px'}}>
              <span style={{fontSize:'12px',color:'#00e5ff',fontWeight:'700'}}>⚔ Level {profile?.level||1} Explorer</span>
              <span style={{fontSize:'12px',color:'#4a5568'}}>{profile?.xp||0} XP</span>
            </div>
            <div style={{height:'6px',background:'rgba(255,255,255,0.05)',borderRadius:'3px'}}>
              <div style={{height:'100%',width:`${Math.min(((profile?.xp||0)%1000)/10,100)}%`,background:'linear-gradient(90deg,#00e5ff,#00ff88)',borderRadius:'3px',minWidth:'4px'}}></div>
            </div>
          </div>
        </div>

        {/* Badges */}
        <div style={{padding:'0 16px',marginBottom:'16px'}}>
          <div style={{background:'#111620',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'12px',padding:'14px'}}>
            <div style={{fontSize:'13px',fontWeight:'700',marginBottom:'12px',color:'#8892a4'}}>🏅 BADGES</div>
            <div style={{display:'flex',gap:'8px',flexWrap:'wrap'}}>
              {[
                {icon:'🌍',label:'Explorer',earned:posts.length>0},
                {icon:'📸',label:'First Post',earned:posts.length>0},
                {icon:'📦',label:'Capsule',earned:posts.some(p=>p.media_type==='capsule')},
                {icon:'🍜',label:'Foodie',earned:false},
                {icon:'🌙',label:'Night Owl',earned:false},
                {icon:'👑',label:'Mayor',earned:false},
                {icon:'🗺',label:'Traveller',earned:false},
                {icon:'📍',label:'Check-in',earned:posts.some(p=>p.media_type==='checkin')},
              ].map(badge => (
                <div key={badge.label} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'4px',padding:'10px 8px',borderRadius:'10px',minWidth:'58px',background:badge.earned?'rgba(255,202,40,0.1)':'rgba(255,255,255,0.02)',border:`1px solid ${badge.earned?'rgba(255,202,40,0.3)':'rgba(255,255,255,0.05)'}`,opacity:badge.earned?1:0.35}}>
                  <span style={{fontSize:'22px'}}>{badge.icon}</span>
                  <span style={{fontSize:'9px',color:badge.earned?'#ffca28':'#4a5568',textAlign:'center'}}>{badge.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{padding:'0 16px',marginBottom:'16px'}}>
          <div style={{display:'flex',gap:'6px',background:'#111620',borderRadius:'12px',padding:'4px',border:'1px solid rgba(255,255,255,0.07)'}}>
            {[
              {key:'all',label:'All'},
              {key:'photos',label:'📷 Photos'},
              {key:'videos',label:'🎥 Videos'},
              {key:'capsules',label:'📦 Capsules'},
            ].map(tab => (
              <button key={tab.key} onClick={()=>setActiveTab(tab.key)} style={{flex:1,padding:'8px 4px',border:'none',borderRadius:'8px',cursor:'pointer',fontSize:'12px',fontWeight:'600',background:activeTab===tab.key?'linear-gradient(135deg,#00e5ff,#00ff88)':'transparent',color:activeTab===tab.key?'#070a10':'#4a5568'}}>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Posts Grid */}
        <div style={{padding:'0 16px'}}>
          {filteredPosts.length === 0 ? (
            <div style={{textAlign:'center',padding:'40px',color:'#4a5568'}}>
              <div style={{fontSize:'40px',marginBottom:'12px'}}>🗺</div>
              <div>No posts here yet!</div>
            </div>
          ) : filteredPosts.map(post => (
            <div key={post.id} style={{background:'#111620',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'14px',marginBottom:'12px',overflow:'hidden'}}>

              {/* Post Header */}
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 14px 8px'}}>
                <div>
                  <div style={{fontSize:'12px',color:'#00e5ff'}}>📍 {post.location_name || 'Unknown location'}</div>
                  <div style={{fontSize:'11px',color:'#4a5568',marginTop:'2px'}}>{timeAgo(post.created_at)}</div>
                </div>
                <div style={{display:'flex',gap:'6px'}}>
                  <span style={{fontSize:'11px',background:post.media_type==='capsule'?'rgba(255,202,40,0.15)':'rgba(0,229,255,0.1)',color:post.media_type==='capsule'?'#ffca28':'#00e5ff',padding:'3px 8px',borderRadius:'6px'}}>
                    {post.media_type==='capsule'?'📦 Capsule':post.media_type==='photo'?'📷 Photo':post.media_type==='video'?'🎥 Video':post.media_type==='checkin'?'📍 Check-in':'✍ Text'}
                  </span>
                  <button onClick={()=>setDeleteConfirm(post.id)} style={{background:'rgba(255,69,96,0.1)',border:'1px solid rgba(255,69,96,0.2)',borderRadius:'6px',padding:'3px 8px',color:'#ff4560',fontSize:'11px',cursor:'pointer'}}>🗑</button>
                </div>
              </div>

              {/* Media */}
              {post.media_url && post.media_type==='photo' && <img src={post.media_url} style={{width:'100%',maxHeight:'280px',objectFit:'cover',display:'block'}}/>}
              {post.media_url && post.media_type==='video' && <video src={post.media_url} controls style={{width:'100%',maxHeight:'280px',display:'block'}}/>}
              {post.media_url && post.media_type==='capsule' && (
                <div style={{margin:'0 14px 10px',background:'rgba(255,202,40,0.06)',border:'1px solid rgba(255,202,40,0.2)',borderRadius:'10px',padding:'12px',display:'flex',gap:'10px',alignItems:'center'}}>
                  <span style={{fontSize:'24px'}}>📦</span>
                  <div style={{fontSize:'12px',color:'#ffca28'}}>🔒 Locked capsule — visible only at this location</div>
                </div>
              )}

              {post.content && <div style={{padding:'8px 14px 12px',fontSize:'14px',color:'#8892a4',lineHeight:'1.6'}}>{post.content}</div>}

              {/* Delete confirm */}
              {deleteConfirm === post.id && (
                <div style={{margin:'0 14px 12px',background:'rgba(255,69,96,0.08)',border:'1px solid rgba(255,69,96,0.2)',borderRadius:'10px',padding:'12px'}}>
                  <div style={{fontSize:'13px',color:'#ff4560',marginBottom:'10px',fontWeight:'600'}}>⚠ Delete this post?</div>
                  <div style={{display:'flex',gap:'8px'}}>
                    <button onClick={()=>deletePost(post.id)} style={{flex:1,background:'#ff4560',border:'none',borderRadius:'8px',padding:'8px',color:'#fff',fontSize:'13px',fontWeight:'700',cursor:'pointer'}}>Yes, Delete</button>
                    <button onClick={()=>setDeleteConfirm(null)} style={{flex:1,background:'#111620',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'8px',padding:'8px',color:'#8892a4',fontSize:'13px',cursor:'pointer'}}>Cancel</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

      </div>
    </div>
  )
                   }
