'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const CLOUD_NAME = 'dbguxwpa8'
const UPLOAD_PRESET = 'echoworld_preset'

export default function Profile() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [editMode, setEditMode] = useState(false)
  const [activeTab, setActiveTab] = useState('all')
  const [activeModal, setActiveModal] = useState(null)
  const [modalList, setModalList] = useState([])
  const [fullName, setFullName] = useState('')
  const [bio, setBio] = useState('')
  const [username, setUsername] = useState('')
  const [phone, setPhone] = useState('')
  const [avatarUrl, setAvatarUrl] = useState(null)
  const [coverUrl, setCoverUrl] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [saving, setSaving] = useState(false)
  const avatarRef = useRef(null)
  const coverRef = useRef(null)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { window.location.href = '/'; return }
      const u = data.session.user
      setUser(u)
      await loadProfile(u.id)
      await loadPosts(u.id)
    })
  }, [])

  const loadProfile = async (uid) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', uid).single()
    if (data) {
      setProfile(data)
      setFullName(data.full_name || '')
      setBio(data.bio || '')
      setUsername(data.username || '')
      setPhone(data.phone || '')
      setAvatarUrl(data.avatar_url || null)
      setCoverUrl(data.cover_url || null)
    }
    setLoading(false)
  }

  const loadPosts = async (uid) => {
    const { data } = await supabase
      .from('posts')
      .select('*')
      .eq('user_id', uid)
      .order('created_at', { ascending: false })
    setPosts(data || [])
  }

  const uploadImage = async (file) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('upload_preset', UPLOAD_PRESET)
    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method: 'POST', body: formData })
    const d = await res.json()
    return d.secure_url
  }

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    const url = await uploadImage(file)
    setAvatarUrl(url)
    setUploading(false)
  }

  const handleCoverChange = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    const url = await uploadImage(file)
    setCoverUrl(url)
    setUploading(false)
  }

  const saveProfile = async () => {
    if (!user) return
    setSaving(true)
    await supabase.from('profiles').update({
      full_name: fullName,
      bio,
      username,
      phone,
      avatar_url: avatarUrl,
      cover_url: coverUrl,
    }).eq('id', user.id)
    await loadProfile(user.id)
    setSaving(false)
    setEditMode(false)
  }

  const handleDeletePost = async (postId) => {
    await supabase.from('posts').delete().eq('id', postId)
    setPosts(p => p.filter(x => x.id !== postId))
    setDeleteConfirm(null)
  }

  const openModal = async (type) => {
    setActiveModal(type)
    if (type === 'supporters') {
      const { data } = await supabase
        .from('followers')
        .select('profiles!followers_follower_id_fkey(id, username, full_name, avatar_url)')
        .eq('following_id', user.id)
      setModalList((data || []).map(d => d.profiles).filter(Boolean))
    } else if (type === 'supporting') {
      const { data } = await supabase
        .from('followers')
        .select('profiles!followers_following_id_fkey(id, username, full_name, avatar_url)')
        .eq('follower_id', user.id)
      setModalList((data || []).map(d => d.profiles).filter(Boolean))
    } else if (type === 'likes') {
      const { data: myPosts } = await supabase.from('posts').select('id').eq('user_id', user.id)
      const ids = (myPosts || []).map(p => p.id)
      if (ids.length) {
        const { data } = await supabase
          .from('likes')
          .select('profiles!likes_user_id_fkey(id, username, full_name, avatar_url)')
          .in('post_id', ids)
        const unique = {}
        ;(data || []).forEach(l => { if (l.profiles) unique[l.profiles.id] = l.profiles })
        setModalList(Object.values(unique))
      }
    }
  }

  const timeAgo = (date) => {
    const s = Math.floor((new Date() - new Date(date)) / 1000)
    if (s < 60) return 'এইমাত্র'
    if (s < 3600) return Math.floor(s/60) + 'মি আগে'
    if (s < 86400) return Math.floor(s/3600) + 'ঘ আগে'
    return Math.floor(s/86400) + 'দিন আগে'
  }

  const filteredPosts = posts.filter(p => {
    if (activeTab === 'photos') return p.media_type === 'photo'
    if (activeTab === 'videos') return p.media_type === 'video'
    if (activeTab === 'capsules') return p.media_type === 'capsule'
    return true
  })

  const getName = () => profile?.full_name || profile?.username || 'Explorer'

  if (loading) return (
    <div style={{height:'100vh',background:'#070a10',display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:'12px'}}>
      <div style={{fontSize:'40px',animation:'spin 1s linear infinite'}}>⬡</div>
      <div style={{color:'#4a5568',fontSize:'14px'}}>Loading Profile...</div>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <div style={{minHeight:'100vh',background:'#070a10',color:'#eef2f7',paddingBottom:'80px'}}>

      {/* TOP BAR */}
      <div style={{position:'fixed',top:0,left:0,right:0,background:'rgba(7,10,16,0.97)',borderBottom:'1px solid rgba(255,255,255,0.07)',padding:'0 16px',height:'52px',display:'flex',alignItems:'center',justifyContent:'space-between',zIndex:100}}>
        <button onClick={()=>window.location.href='/feed'} style={{background:'none',border:'none',color:'#8892a4',fontSize:'22px',cursor:'pointer'}}>←</button>
        <div style={{fontSize:'15px',fontWeight:'800'}}>{getName()}</div>
        <div style={{display:'flex',gap:'8px'}}>
          <button onClick={()=>window.location.href='/notifications'} style={{background:'none',border:'none',color:'#8892a4',fontSize:'22px',cursor:'pointer'}}>🔔</button>
          <button onClick={async()=>{await supabase.auth.signOut();window.location.href='/'}} style={{background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'16px',padding:'4px 12px',color:'#8892a4',fontSize:'12px',cursor:'pointer'}}>Logout</button>
        </div>
      </div>

      {/* BOTTOM NAV */}
      <div style={{position:'fixed',bottom:0,left:0,right:0,background:'rgba(7,10,16,0.98)',borderTop:'1px solid rgba(255,255,255,0.07)',display:'flex',justifyContent:'space-around',padding:'10px 0 20px',zIndex:100}}>
        {[{icon:'🏠',label:'Home',path:'/feed'},{icon:'🗺',label:'Map',path:'/map'},{icon:'📸',label:'Post',path:'/post'},{icon:'🏆',label:'Rank',path:'/leaderboard'},{icon:'👤',label:'Profile',path:'/profile'}].map(item=>(
          <div key={item.label} onClick={()=>window.location.href=item.path} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'3px',cursor:'pointer',color:item.path==='/profile'?'#00e5ff':'#4a5568'}}>
            <span style={{fontSize:'22px'}}>{item.icon}</span>
            <span style={{fontSize:'10px',fontWeight:'600'}}>{item.label}</span>
          </div>
        ))}
      </div>

      {/* COVER */}
      <div style={{marginTop:'52px',position:'relative',height:'160px',background:'linear-gradient(135deg,#0a1628,#0d2137,#0a2820)',overflow:'hidden'}}>
        {coverUrl && <img src={coverUrl} style={{width:'100%',height:'100%',objectFit:'cover'}}/>}
        {!coverUrl && (
          <div style={{position:'absolute',inset:0,background:'linear-gradient(135deg,#00e5ff11,#00ff8811)',display:'flex',alignItems:'center',justifyContent:'center'}}>
            <div style={{fontSize:'80px',opacity:0.08,fontWeight:'900'}}>⬡</div>
          </div>
        )}
        {editMode && (
          <>
            <div onClick={()=>coverRef.current?.click()} style={{position:'absolute',inset:0,background:'rgba(0,0,0,0.4)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',fontSize:'28px'}}>📷</div>
            <input ref={coverRef} type="file" accept="image/*" onChange={handleCoverChange} style={{display:'none'}}/>
          </>
        )}
      </div>

      {/* AVATAR + BUTTONS */}
      <div style={{padding:'0 16px',position:'relative'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-end',marginTop:'-40px',marginBottom:'12px'}}>
          <div style={{position:'relative'}}>
            <div style={{width:'84px',height:'84px',borderRadius:'50%',border:'3px solid #070a10',overflow:'hidden',background:'linear-gradient(135deg,#00e5ff,#00ff88)',display:'flex',alignItems:'center',justifyContent:'center',cursor:editMode?'pointer':'default'}}
              onClick={()=>editMode&&avatarRef.current?.click()}>
              {avatarUrl
                ? <img src={avatarUrl} style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                : <span style={{fontSize:'32px',fontWeight:'900',color:'#070a10'}}>{getName()[0]?.toUpperCase()}</span>
              }
            </div>
            {editMode && (
              <>
                <div style={{position:'absolute',bottom:'0',right:'0',background:'#00e5ff',borderRadius:'50%',width:'26px',height:'26px',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'14px',cursor:'pointer',border:'2px solid #070a10'}} onClick={()=>avatarRef.current?.click()}>✏️</div>
                <input ref={avatarRef} type="file" accept="image/*" onChange={handleAvatarChange} style={{display:'none'}}/>
              </>
            )}
            {uploading && <div style={{position:'absolute',inset:0,borderRadius:'50%',background:'rgba(0,0,0,0.6)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'12px',color:'#00e5ff'}}>...</div>}
          </div>

          <div style={{display:'flex',gap:'8px',marginBottom:'8px'}}>
            {!editMode ? (
              <>
                <button onClick={()=>setEditMode(true)} style={{background:'rgba(255,255,255,0.07)',border:'1px solid rgba(255,255,255,0.12)',borderRadius:'20px',padding:'8px 18px',color:'#eef2f7',fontSize:'13px',fontWeight:'600',cursor:'pointer'}}>✏️ Edit</button>
                <button onClick={()=>window.location.href='/post'} style={{background:'linear-gradient(135deg,#00e5ff,#00ff88)',border:'none',borderRadius:'20px',padding:'8px 18px',color:'#070a10',fontSize:'13px',fontWeight:'700',cursor:'pointer'}}>+ Post</button>
              </>
            ) : (
              <>
                <button onClick={()=>{setEditMode(false);loadProfile(user.id)}} style={{background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'20px',padding:'8px 16px',color:'#8892a4',fontSize:'13px',cursor:'pointer'}}>Cancel</button>
                <button onClick={saveProfile} disabled={saving} style={{background:'linear-gradient(135deg,#00e5ff,#00ff88)',border:'none',borderRadius:'20px',padding:'8px 18px',color:'#070a10',fontSize:'13px',fontWeight:'700',cursor:'pointer',opacity:saving?0.7:1}}>{saving?'Saving...':'Save ✓'}</button>
              </>
            )}
          </div>
        </div>

        {/* PROFILE INFO */}
        {!editMode ? (
          <div style={{marginBottom:'16px'}}>
            <div style={{fontSize:'20px',fontWeight:'800',marginBottom:'2px'}}>{getName()}</div>
            <div style={{fontSize:'13px',color:'#4a5568',marginBottom:'6px'}}>@{profile?.username || 'explorer'}</div>
            {profile?.bio && <div style={{fontSize:'13px',color:'#8892a4',lineHeight:'1.6',marginBottom:'6px'}}>{profile.bio}</div>}
            {profile?.phone && <div style={{fontSize:'12px',color:'#4a5568'}}>📱 {profile.phone}</div>}
          </div>
        ) : (
          <div style={{marginBottom:'16px'}}>
            <input value={fullName} onChange={e=>setFullName(e.target.value)} placeholder="Full Name"
              style={{width:'100%',background:'#111620',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'12px',padding:'10px 14px',color:'#eef2f7',fontSize:'14px',outline:'none',boxSizing:'border-box',marginBottom:'8px'}}/>
            <input value={username} onChange={e=>setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g,''))} placeholder="username"
              style={{width:'100%',background:'#111620',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'12px',padding:'10px 14px',color:'#00e5ff',fontSize:'14px',outline:'none',boxSizing:'border-box',marginBottom:'8px'}}/>
            <textarea value={bio} onChange={e=>setBio(e.target.value)} placeholder="Bio..." rows={3}
              style={{width:'100%',background:'#111620',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'12px',padding:'10px 14px',color:'#eef2f7',fontSize:'13px',outline:'none',resize:'none',boxSizing:'border-box',marginBottom:'8px'}}/>
            <input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="Phone number"
              style={{width:'100%',background:'#111620',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'12px',padding:'10px 14px',color:'#eef2f7',fontSize:'14px',outline:'none',boxSizing:'border-box'}}/>
          </div>
        )}

        {/* STATS */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'8px',marginBottom:'16px'}}>
          {[
            {label:'Posts',value:posts.length,modal:null},
            {label:'Supporters',value:profile?.followers_count||0,modal:'supporters'},
            {label:'Supporting',value:profile?.following_count||0,modal:'supporting'},
            {label:'Likes',value:posts.reduce((a,p)=>a+(p.likes_count||0),0),modal:'likes'},
          ].map(stat=>(
            <div key={stat.label} onClick={()=>stat.modal&&openModal(stat.modal)}
              style={{background:'#111620',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'14px',padding:'12px 8px',textAlign:'center',cursor:stat.modal?'pointer':'default'}}>
              <div style={{fontSize:'20px',fontWeight:'900',background:'linear-gradient(90deg,#00e5ff,#00ff88)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>{stat.value}</div>
              <div style={{fontSize:'10px',color:'#4a5568',fontWeight:'600',marginTop:'2px'}}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* POST TABS */}
        <div style={{display:'flex',gap:'6px',marginBottom:'14px',overflowX:'auto',scrollbarWidth:'none'}}>
          {[{key:'all',label:'📋 All'},{key:'photos',label:'📷 Photos'},{key:'videos',label:'🎬 Videos'},{key:'capsules',label:'📦 Capsules'}].map(t=>(
            <button key={t.key} onClick={()=>setActiveTab(t.key)} style={{padding:'6px 14px',borderRadius:'20px',border:'none',cursor:'pointer',fontSize:'12px',fontWeight:'700',whiteSpace:'nowrap',flexShrink:0,background:activeTab===t.key?'linear-gradient(135deg,#00e5ff,#00ff88)':'rgba(255,255,255,0.06)',color:activeTab===t.key?'#070a10':'#4a5568'}}>
              {t.label}
            </button>
          ))}
        </div>

        {/* POSTS GRID */}
        {filteredPosts.length === 0 ? (
          <div style={{textAlign:'center',padding:'40px 20px',color:'#4a5568'}}>
            <div style={{fontSize:'40px',marginBottom:'12px'}}>📭</div>
            <div>No posts yet</div>
            <button onClick={()=>window.location.href='/post'} style={{marginTop:'16px',background:'linear-gradient(135deg,#00e5ff,#00ff88)',border:'none',borderRadius:'12px',padding:'10px 24px',fontSize:'13px',fontWeight:'700',color:'#070a10',cursor:'pointer'}}>Create Post</button>
          </div>
        ) : (
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'3px',marginBottom:'16px'}}>
            {filteredPosts.map(post=>(
              <div key={post.id} style={{position:'relative',paddingTop:'100%',background:'#111620',overflow:'hidden',borderRadius:'4px',cursor:'pointer'}}
                onClick={()=>setDeleteConfirm(post.id)}>
                {post.media_url && post.media_type==='photo' && (
                  <img src={post.media_url} style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover'}}/>
                )}
                {post.media_url && post.media_type==='video' && (
                  <video src={post.media_url} style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover'}} muted playsInline/>
                )}
                {!post.media_url && (
                  <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',padding:'8px'}}>
                    <div style={{fontSize:'11px',color:'#8892a4',textAlign:'center',lineHeight:'1.4'}}>{post.content?.slice(0,50)||'...'}</div>
                  </div>
                )}
                <div style={{position:'absolute',inset:0,background:'rgba(0,0,0,0)',transition:'background 0.2s',display:'flex',alignItems:'center',justifyContent:'center'}}>
                  {post.media_type==='video'&&<span style={{fontSize:'18px',filter:'drop-shadow(0 1px 3px rgba(0,0,0,0.8))'}}>▶</span>}
                </div>
                <div style={{position:'absolute',bottom:'4px',left:'4px',display:'flex',gap:'4px',alignItems:'center'}}>
                  <span style={{fontSize:'10px',color:'rgba(255,255,255,0.8)',fontWeight:'600',textShadow:'0 1px 2px rgba(0,0,0,0.8)'}}>❤️{post.likes_count||0}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* DELETE CONFIRM */}
      {deleteConfirm && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:500,padding:'20px'}} onClick={()=>setDeleteConfirm(null)}>
          <div style={{background:'#111620',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'20px',padding:'24px',width:'100%',maxWidth:'320px'}} onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:'16px',fontWeight:'800',marginBottom:'8px',textAlign:'center'}}>Delete Post?</div>
            <div style={{fontSize:'13px',color:'#4a5568',marginBottom:'20px',textAlign:'center'}}>This cannot be undone.</div>
            <div style={{display:'flex',gap:'10px'}}>
              <button onClick={()=>setDeleteConfirm(null)} style={{flex:1,padding:'12px',background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'12px',color:'#8892a4',fontSize:'14px',cursor:'pointer'}}>Cancel</button>
              <button onClick={()=>handleDeletePost(deleteConfirm)} style={{flex:1,padding:'12px',background:'rgba(255,69,96,0.2)',border:'1px solid rgba(255,69,96,0.3)',borderRadius:'12px',color:'#ff4560',fontSize:'14px',fontWeight:'700',cursor:'pointer'}}>🗑 Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL */}
      {activeModal && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',display:'flex',alignItems:'flex-end',zIndex:500}} onClick={()=>setActiveModal(null)}>
          <div style={{background:'#111620',borderRadius:'24px 24px 0 0',width:'100%',maxHeight:'70vh',display:'flex',flexDirection:'column'}} onClick={e=>e.stopPropagation()}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'16px 20px 8px'}}>
              <div style={{fontSize:'15px',fontWeight:'800',textTransform:'capitalize'}}>
                {activeModal==='supporters'?'👥 Supporters':activeModal==='supporting'?'🤝 Supporting':'❤️ Likes'}
              </div>
              <button onClick={()=>setActiveModal(null)} style={{background:'none',border:'none',color:'#4a5568',fontSize:'22px',cursor:'pointer'}}>✕</button>
            </div>
            <div style={{overflowY:'auto',padding:'8px 16px 24px'}}>
              {modalList.length===0?(
                <div style={{textAlign:'center',padding:'24px',color:'#4a5568'}}>No one here yet</div>
              ):modalList.map(p=>(
                <div key={p.id} onClick={()=>window.location.href=`/user/${p.id}`} style={{display:'flex',alignItems:'center',gap:'12px',padding:'10px',borderRadius:'12px',cursor:'pointer',marginBottom:'4px',background:'rgba(255,255,255,0.02)'}}>
                  <div style={{width:'44px',height:'44px',borderRadius:'50%',overflow:'hidden',background:'linear-gradient(135deg,#00e5ff,#00ff88)',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center'}}>
                    {p.avatar_url?<img src={p.avatar_url} style={{width:'100%',height:'100%',objectFit:'cover'}}/>:<span style={{fontWeight:'800',color:'#070a10',fontSize:'16px'}}>{(p.full_name||p.username||'E')[0].toUpperCase()}</span>}
                  </div>
                  <div>
                    <div style={{fontSize:'14px',fontWeight:'700'}}>{p.full_name||p.username}</div>
                    <div style={{fontSize:'12px',color:'#4a5568'}}>@{p.username}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
         }
