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
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [editBio, setEditBio] = useState('')
  const [uploading, setUploading] = useState('')
  const [activeTab, setActiveTab] = useState('posts')
  const [modal, setModal] = useState(null)
  const [modalList, setModalList] = useState([])
  const [modalLoading, setModalLoading] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const avatarRef = useRef(null)
  const coverRef = useRef(null)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { window.location.href = '/'; return }
      const u = data.session.user
      setUser(u)

      const { data: p } = await supabase.from('profiles').select('*').eq('id', u.id).single()
      setProfile(p)
      setEditName(p?.full_name || '')
      setEditBio(p?.bio || '')

      const { data: myPosts } = await supabase
        .from('posts')
        .select('*')
        .eq('user_id', u.id)
        .order('created_at', { ascending: false })
      setPosts(myPosts || [])
      setLoading(false)
    })
  }, [])

  const uploadImage = async (file, type) => {
    setUploading(type)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('upload_preset', UPLOAD_PRESET)
    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`, {
      method: 'POST', body: formData
    })
    const data = await res.json()
    const field = type === 'avatar' ? 'avatar_url' : 'cover_url'
    await supabase.from('profiles').update({ [field]: data.secure_url }).eq('id', user.id)
    setProfile(p => ({ ...p, [field]: data.secure_url }))
    setUploading('')
  }

  const saveProfile = async () => {
    await supabase.from('profiles').update({
      full_name: editName,
      bio: editBio,
    }).eq('id', user.id)
    setProfile(p => ({ ...p, full_name: editName, bio: editBio }))
    setEditing(false)
  }

  const deletePost = async (postId) => {
    await supabase.from('posts').delete().eq('id', postId)
    setPosts(p => p.filter(x => x.id !== postId))
    setDeleteConfirm(null)
  }

  const openModal = async (type) => {
    setModal(type)
    setModalLoading(true)
    setModalList([])

    if (type === 'supporters') {
      const { data } = await supabase
        .from('followers')
        .select('follower_id, profiles!followers_follower_id_fkey(id, username, full_name, avatar_url)')
        .eq('following_id', user.id)
      setModalList((data||[]).map(d => d.profiles).filter(Boolean))
    } else if (type === 'supporting') {
      const { data } = await supabase
        .from('followers')
        .select('following_id, profiles!followers_following_id_fkey(id, username, full_name, avatar_url)')
        .eq('follower_id', user.id)
      setModalList((data||[]).map(d => d.profiles).filter(Boolean))
    } else if (type === 'likes') {
      const postIds = posts.map(p => p.id)
      if (postIds.length === 0) { setModalLoading(false); return }
      const { data } = await supabase
        .from('likes')
        .select('profiles!likes_user_id_fkey(id, username, full_name, avatar_url)')
        .in('post_id', postIds)
      const unique = []
      const seen = new Set()
      ;(data||[]).forEach(d => {
        if (d.profiles && !seen.has(d.profiles.id)) {
          seen.add(d.profiles.id)
          unique.push(d.profiles)
        }
      })
      setModalList(unique)
    }
    setModalLoading(false)
  }

  const timeAgo = (date) => {
    const s = Math.floor((new Date() - new Date(date)) / 1000)
    if (s < 60) return 'এইমাত্র'
    if (s < 3600) return Math.floor(s/60) + 'মি আগে'
    if (s < 86400) return Math.floor(s/3600) + 'ঘ আগে'
    if (s < 604800) return Math.floor(s/86400) + 'দিন আগে'
    return new Date(date).toLocaleDateString('bn-BD')
  }

  const totalLikes = posts.reduce((sum, p) => sum + (p.likes_count||0), 0)

  const filteredPosts = posts.filter(p => {
    if (activeTab === 'photos') return p.media_type === 'photo'
    if (activeTab === 'videos') return p.media_type === 'video'
    if (activeTab === 'capsules') return p.media_type === 'capsule'
    return true
  })

  if (loading) return (
    <div style={{minHeight:'100vh',background:'#070a10',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{color:'#4a5568',fontSize:'14px'}}>Loading...</div>
    </div>
  )

  return (
    <div style={{minHeight:'100vh',background:'#070a10',color:'#eef2f7',paddingBottom:'80px'}}>

      {/* TOP BAR */}
      <div style={{position:'fixed',top:0,left:0,right:0,background:'rgba(7,10,16,0.97)',borderBottom:'1px solid rgba(255,255,255,0.07)',padding:'0 16px',height:'56px',display:'flex',alignItems:'center',justifyContent:'space-between',zIndex:100}}>
        <div style={{fontSize:'15px',fontWeight:'800',background:'linear-gradient(90deg,#00e5ff,#00ff88)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>My Profile</div>
        <div style={{display:'flex',gap:'8px'}}>
          <button onClick={()=>window.location.href='/search'} style={{background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'20px',padding:'6px 12px',color:'#8892a4',fontSize:'13px',cursor:'pointer'}}>🔍</button>
          {editing ? (
            <>
              <button onClick={()=>setEditing(false)} style={{background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'20px',padding:'6px 14px',color:'#8892a4',fontSize:'13px',cursor:'pointer'}}>Cancel</button>
              <button onClick={saveProfile} style={{background:'linear-gradient(135deg,#00e5ff,#00ff88)',border:'none',borderRadius:'20px',padding:'6px 16px',color:'#070a10',fontSize:'13px',fontWeight:'700',cursor:'pointer'}}>Save</button>
            </>
          ) : (
            <>
              <button onClick={()=>setEditing(true)} style={{background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'20px',padding:'6px 14px',color:'#8892a4',fontSize:'13px',cursor:'pointer'}}>✏️ Edit</button>
              <button onClick={async()=>{await supabase.auth.signOut();window.location.href='/'}} style={{background:'rgba(255,69,96,0.1)',border:'1px solid rgba(255,69,96,0.2)',borderRadius:'20px',padding:'6px 14px',color:'#ff4560',fontSize:'13px',cursor:'pointer'}}>Logout</button>
            </>
          )}
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
          <div key={item.label} onClick={()=>window.location.href=item.path} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'4px',cursor:'pointer',color:item.path==='/profile'?'#00e5ff':'#4a5568'}}>
            <span style={{fontSize:'22px'}}>{item.icon}</span>
            <span style={{fontSize:'10px',fontWeight:'600'}}>{item.label}</span>
          </div>
        ))}
      </div>

      {/* Cover */}
      <div style={{height:'180px',background:profile?.cover_url?`url(${profile.cover_url}) center/cover`:'linear-gradient(135deg,#0d1f2d,#1a3a4a)',marginTop:'56px',position:'relative',cursor:editing?'pointer':'default'}}
        onClick={()=>editing&&coverRef.current?.click()}>
        {profile?.cover_url && <img src={profile.cover_url} style={{width:'100%',height:'100%',objectFit:'cover',position:'absolute',inset:0}}/>}
        {editing && (
          <div style={{position:'absolute',inset:0,background:'rgba(0,0,0,0.4)',display:'flex',alignItems:'center',justifyContent:'center'}}>
            <div style={{background:'rgba(0,0,0,0.6)',borderRadius:'12px',padding:'8px 16px',color:'#fff',fontSize:'13px',fontWeight:'600'}}>
              {uploading==='cover'?'Uploading...':'📷 Change Cover'}
            </div>
          </div>
        )}
        <input ref={coverRef} type="file" accept="image/*" onChange={e=>e.target.files[0]&&uploadImage(e.target.files[0],'cover')} style={{display:'none'}}/>
      </div>

      <div style={{padding:'0 16px',marginTop:'-44px',position:'relative',zIndex:10}}>

        {/* Avatar */}
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-end',marginBottom:'12px'}}>
          <div style={{position:'relative',cursor:editing?'pointer':'default'}} onClick={()=>editing&&avatarRef.current?.click()}>
            <div style={{width:'88px',height:'88px',borderRadius:'50%',border:'3px solid #070a10',overflow:'hidden',background:'linear-gradient(135deg,#00e5ff,#00ff88)',display:'flex',alignItems:'center',justifyContent:'center'}}>
              {profile?.avatar_url
                ? <img src={profile.avatar_url} style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                : <span style={{fontSize:'34px',fontWeight:'800',color:'#070a10'}}>{(profile?.full_name||profile?.username||'E')[0].toUpperCase()}</span>
              }
            </div>
            {editing && (
              <div style={{position:'absolute',bottom:0,right:0,background:'#00e5ff',borderRadius:'50%',width:'26px',height:'26px',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'13px',border:'2px solid #070a10'}}>
                {uploading==='avatar'?'⏳':'📷'}
              </div>
            )}
            <input ref={avatarRef} type="file" accept="image/*" onChange={e=>e.target.files[0]&&uploadImage(e.target.files[0],'avatar')} style={{display:'none'}}/>
          </div>
        </div>

        {/* Name & Bio */}
        {editing ? (
          <div style={{marginBottom:'16px'}}>
            <input value={editName} onChange={e=>setEditName(e.target.value)} placeholder="Full name"
              style={{width:'100%',background:'#111620',border:'1px solid rgba(0,229,255,0.3)',borderRadius:'12px',padding:'12px 14px',color:'#eef2f7',fontSize:'15px',outline:'none',marginBottom:'10px',boxSizing:'border-box',fontWeight:'700'}}/>
            <textarea value={editBio} onChange={e=>setEditBio(e.target.value)} placeholder="Write your bio..."
              style={{width:'100%',background:'#111620',border:'1px solid rgba(0,229,255,0.3)',borderRadius:'12px',padding:'12px 14px',color:'#eef2f7',fontSize:'13px',outline:'none',resize:'none',minHeight:'80px',boxSizing:'border-box',lineHeight:'1.5'}}/>
          </div>
        ) : (
          <div style={{marginBottom:'16px'}}>
            <div style={{fontSize:'20px',fontWeight:'800',marginBottom:'2px'}}>{profile?.full_name || profile?.username}</div>
            <div style={{fontSize:'13px',color:'#4a5568',marginBottom:'6px'}}>@{profile?.username}</div>
            {profile?.bio && <div style={{fontSize:'13px',color:'#8892a4',lineHeight:'1.5'}}>{profile.bio}</div>}
          </div>
        )}

        {/* Stats — all clickable */}
        <div style={{display:'flex',gap:'6px',marginBottom:'20px'}}>
          <div style={{background:'#111620',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'12px',padding:'10px',textAlign:'center',flex:1}}>
            <div style={{fontSize:'18px',fontWeight:'800',color:'#00e5ff'}}>{posts.length}</div>
            <div style={{fontSize:'10px',color:'#4a5568'}}>Posts</div>
          </div>
          <div onClick={()=>openModal('supporters')} style={{background:'#111620',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'12px',padding:'10px',textAlign:'center',flex:1,cursor:'pointer'}}>
            <div style={{fontSize:'18px',fontWeight:'800',color:'#00ff88'}}>{profile?.followers_count||0}</div>
            <div style={{fontSize:'10px',color:'#4a5568'}}>Supporters</div>
          </div>
          <div onClick={()=>openModal('supporting')} style={{background:'#111620',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'12px',padding:'10px',textAlign:'center',flex:1,cursor:'pointer'}}>
            <div style={{fontSize:'18px',fontWeight:'800',color:'#ffca28'}}>{profile?.following_count||0}</div>
            <div style={{fontSize:'10px',color:'#4a5568'}}>Supporting</div>
          </div>
          <div onClick={()=>openModal('likes')} style={{background:'#111620',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'12px',padding:'10px',textAlign:'center',flex:1,cursor:'pointer'}}>
            <div style={{fontSize:'18px',fontWeight:'800',color:'#ff4560'}}>{totalLikes}</div>
            <div style={{fontSize:'10px',color:'#4a5568'}}>Likes</div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{display:'flex',gap:'6px',marginBottom:'16px'}}>
          {[
            {key:'posts',label:'All'},
            {key:'photos',label:'📷'},
            {key:'videos',label:'⚡'},
            {key:'capsules',label:'📦'},
          ].map(t => (
            <button key={t.key} onClick={()=>setActiveTab(t.key)} style={{padding:'7px 16px',borderRadius:'20px',border:'none',cursor:'pointer',fontSize:'12px',fontWeight:'700',background:activeTab===t.key?'linear-gradient(135deg,#00e5ff,#00ff88)':'rgba(255,255,255,0.06)',color:activeTab===t.key?'#070a10':'#4a5568'}}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Posts */}
        {filteredPosts.length === 0 ? (
          <div style={{textAlign:'center',padding:'40px 0',color:'#4a5568'}}>
            <div style={{fontSize:'40px',marginBottom:'12px'}}>📭</div>
            <div>No posts yet</div>
            <button onClick={()=>window.location.href='/post'} style={{background:'linear-gradient(135deg,#00e5ff,#00ff88)',border:'none',borderRadius:'12px',padding:'10px 24px',fontSize:'13px',fontWeight:'700',color:'#070a10',cursor:'pointer',marginTop:'16px'}}>
              + Create Post
            </button>
          </div>
        ) : filteredPosts.map(post => (
          <div key={post.id} style={{background:'#111620',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'14px',marginBottom:'12px',overflow:'hidden'}}>
            {/* Post header */}
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 12px 6px'}}>
              <div style={{display:'flex',alignItems:'center',gap:'6px'}}>
                {post.media_type==='capsule'&&<span style={{fontSize:'14px'}}>📦</span>}
                {post.media_type==='photo'&&<span style={{fontSize:'14px'}}>📷</span>}
                {post.media_type==='video'&&<span style={{fontSize:'14px'}}>⚡</span>}
                {post.media_type==='checkin'&&<span style={{fontSize:'14px'}}>📍</span>}
                {post.location_name&&<span style={{fontSize:'11px',color:'#00e5ff'}}>📍 {post.location_name}</span>}
              </div>
              <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                <span style={{fontSize:'11px',color:'#4a5568'}}>{timeAgo(post.created_at)}</span>
                <button onClick={()=>setDeleteConfirm(post.id)} style={{background:'rgba(255,69,96,0.1)',border:'none',borderRadius:'8px',padding:'4px 8px',color:'#ff4560',fontSize:'12px',cursor:'pointer'}}>🗑</button>
              </div>
            </div>

            {post.media_type==='capsule' && (
              <div style={{margin:'0 12px 8px',background:'rgba(255,202,40,0.06)',border:'1px solid rgba(255,202,40,0.2)',borderRadius:'10px',padding:'12px',display:'flex',gap:'10px',alignItems:'center'}}>
                <span style={{fontSize:'22px'}}>📦</span>
                <div>
                  <div style={{fontSize:'12px',fontWeight:'700',color:'#ffca28'}}>🔒 Time Capsule</div>
                  <div style={{fontSize:'10px',color:'#4a5568',marginTop:'2px'}}>Visit within 300m to unlock</div>
                </div>
              </div>
            )}
            {post.media_url && post.media_type==='photo' && (
              <img src={post.media_url} style={{width:'100%',maxHeight:'280px',objectFit:'cover',display:'block'}}/>
            )}
            {post.media_url && post.media_type==='video' && (
              <video src={post.media_url} controls playsInline style={{width:'100%',maxHeight:'280px',display:'block',background:'#000'}}/>
            )}
            {post.content && (
              <div style={{padding:'8px 12px',fontSize:'13px',color:'#8892a4',lineHeight:'1.5'}}>{post.content}</div>
            )}
            <div style={{padding:'6px 12px 10px',display:'flex',justifyContent:'space-between'}}>
              <div style={{display:'flex',gap:'12px'}}>
                <span style={{fontSize:'12px',color:'#4a5568'}}>❤️ {post.likes_count||0}</span>
                <span style={{fontSize:'12px',color:'#4a5568'}}>💬 {post.comments_count||0}</span>
              </div>
              <span style={{fontSize:'10px',color:'#2a3040',fontStyle:'italic'}}>{post.privacy||'public'}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Delete confirm */}
      {deleteConfirm && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',zIndex:600,display:'flex',alignItems:'center',justifyContent:'center',padding:'20px'}}>
          <div style={{background:'#111620',border:'1px solid rgba(255,69,96,0.3)',borderRadius:'16px',padding:'24px',width:'100%',maxWidth:'300px',textAlign:'center'}}>
            <div style={{fontSize:'32px',marginBottom:'12px'}}>🗑</div>
            <div style={{fontSize:'16px',fontWeight:'700',marginBottom:'8px'}}>Delete Post?</div>
            <div style={{fontSize:'13px',color:'#4a5568',marginBottom:'20px'}}>This cannot be undone</div>
            <div style={{display:'flex',gap:'10px'}}>
              <button onClick={()=>setDeleteConfirm(null)} style={{flex:1,padding:'12px',background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'12px',color:'#8892a4',fontSize:'14px',cursor:'pointer'}}>Cancel</button>
              <button onClick={()=>deletePost(deleteConfirm)} style={{flex:1,padding:'12px',background:'linear-gradient(135deg,#ff4560,#ff6b35)',border:'none',borderRadius:'12px',color:'#fff',fontSize:'14px',fontWeight:'700',cursor:'pointer'}}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Supporters/Supporting/Likes Modal */}
      {modal && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',zIndex:500,display:'flex',alignItems:'flex-end'}} onClick={()=>setModal(null)}>
          <div style={{width:'100%',background:'#111620',borderRadius:'20px 20px 0 0',padding:'20px 16px',maxHeight:'70vh',overflowY:'auto'}} onClick={e=>e.stopPropagation()}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'16px'}}>
              <div style={{fontSize:'16px',fontWeight:'700'}}>
                {modal==='supporters'?`👥 Supporters (${profile?.followers_count||0})`:modal==='supporting'?`💙 Supporting (${profile?.following_count||0})`:`❤️ Liked by (${totalLikes})`}
              </div>
              <button onClick={()=>setModal(null)} style={{background:'none',border:'none',color:'#4a5568',fontSize:'22px',cursor:'pointer'}}>✕</button>
            </div>

            {modalLoading ? (
              <div style={{textAlign:'center',padding:'30px',color:'#4a5568'}}>Loading...</div>
            ) : modalList.length === 0 ? (
              <div style={{textAlign:'center',padding:'30px',color:'#4a5568'}}>
                <div style={{fontSize:'32px',marginBottom:'8px'}}>👻</div>
                <div>No one yet</div>
              </div>
            ) : modalList.map(p => (
              <div key={p.id} onClick={()=>{setModal(null);window.location.href=`/user/${p.id}`}} style={{display:'flex',alignItems:'center',gap:'12px',padding:'10px',borderRadius:'12px',cursor:'pointer',marginBottom:'4px',background:'rgba(255,255,255,0.03)'}}>
                <div style={{width:'46px',height:'46px',borderRadius:'50%',overflow:'hidden',background:'linear-gradient(135deg,#00e5ff,#00ff88)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                  {p.avatar_url
                    ? <img src={p.avatar_url} style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                    : <span style={{fontWeight:'800',color:'#070a10',fontSize:'18px'}}>{(p.full_name||p.username||'E')[0].toUpperCase()}</span>
                  }
                </div>
                <div style={{flex:1}}>
                  <div style={{fontSize:'14px',fontWeight:'700'}}>{p.full_name||p.username}</div>
                  <div style={{fontSize:'12px',color:'#4a5568'}}>@{p.username}</div>
                </div>
                <div style={{color:'#00e5ff',fontSize:'16px'}}>→</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
    }
