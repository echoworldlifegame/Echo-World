'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default function UserProfile({ params }) {
  const [profile, setProfile] = useState(null)
  const [posts, setPosts] = useState([])
  const [currentUser, setCurrentUser] = useState(null)
  const [isSupporting, setIsSupporting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('posts')
  const [modal, setModal] = useState(null) // 'supporters' | 'supporting' | 'likes'
  const [modalList, setModalList] = useState([])
  const [modalLoading, setModalLoading] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { window.location.href = '/'; return }
      const u = data.session.user
      setCurrentUser(u)

      const { data: p } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', params.id)
        .single()
      setProfile(p)

      const { data: posts } = await supabase
        .from('posts')
        .select('*')
        .eq('user_id', params.id)
        .order('created_at', { ascending: false })
      setPosts(posts || [])

      if (u.id !== params.id) {
        const { data: f } = await supabase
          .from('followers')
          .select('id')
          .eq('follower_id', u.id)
          .eq('following_id', params.id)
          .single()
        setIsSupporting(!!f)
      }

      setLoading(false)
    })
  }, [params.id])

  const toggleSupport = async () => {
    if (!currentUser) return
    if (isSupporting) {
      await supabase.from('followers').delete()
        .eq('follower_id', currentUser.id).eq('following_id', params.id)
      await supabase.from('profiles').update({ followers_count: Math.max((profile.followers_count||1)-1,0) }).eq('id', params.id)
      await supabase.from('profiles').update({ following_count: Math.max((profile.following_count||1)-1,0) }).eq('id', currentUser.id)
      setProfile(p => ({...p, followers_count: Math.max((p.followers_count||1)-1,0)}))
      setIsSupporting(false)
    } else {
      await supabase.from('followers').insert({ follower_id: currentUser.id, following_id: params.id })
      await supabase.from('profiles').update({ followers_count: (profile.followers_count||0)+1 }).eq('id', params.id)
      await supabase.from('profiles').update({ following_count: (profile.following_count||0)+1 }).eq('id', currentUser.id)
      await supabase.from('notifications').insert({ user_id: params.id, from_user_id: currentUser.id, type: 'follow' })
      setProfile(p => ({...p, followers_count: (p.followers_count||0)+1}))
      setIsSupporting(true)
    }
  }

  const openModal = async (type) => {
    setModal(type)
    setModalLoading(true)
    setModalList([])

    if (type === 'supporters') {
      const { data } = await supabase
        .from('followers')
        .select('profiles!followers_follower_id_fkey(id, username, full_name, avatar_url)')
        .eq('following_id', params.id)
      setModalList((data||[]).map(d => d.profiles).filter(Boolean))
    } else if (type === 'supporting') {
      const { data } = await supabase
        .from('followers')
        .select('profiles!followers_following_id_fkey(id, username, full_name, avatar_url)')
        .eq('follower_id', params.id)
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
    return Math.floor(s/86400) + 'দিন আগে'
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
      <div style={{color:'#4a5568'}}>Loading...</div>
    </div>
  )

  if (!profile) return (
    <div style={{minHeight:'100vh',background:'#070a10',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{color:'#4a5568'}}>User not found</div>
    </div>
  )

  const isOwnProfile = currentUser?.id === params.id

  return (
    <div style={{minHeight:'100vh',background:'#070a10',color:'#eef2f7',paddingBottom:'80px'}}>

      {/* TOP BAR */}
      <div style={{position:'fixed',top:0,left:0,right:0,background:'rgba(7,10,16,0.95)',borderBottom:'1px solid rgba(255,255,255,0.07)',padding:'0 16px',height:'56px',display:'flex',alignItems:'center',justifyContent:'space-between',zIndex:100}}>
        <button onClick={()=>window.history.back()} style={{background:'none',border:'none',color:'#8892a4',fontSize:'24px',cursor:'pointer'}}>←</button>
        <div style={{fontSize:'15px',fontWeight:'700'}}>@{profile.username || 'explorer'}</div>
        <div style={{width:'40px'}}/>
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

      {/* Cover */}
      <div style={{height:'180px',background:profile.cover_url?`url(${profile.cover_url}) center/cover`:'linear-gradient(135deg,#0d1f2d,#1a3a4a)',marginTop:'56px',position:'relative'}}>
        <div style={{position:'absolute',inset:0,background:'rgba(0,0,0,0.2)'}}/>
      </div>

      {/* Avatar + Info */}
      <div style={{padding:'0 16px',marginTop:'-40px',position:'relative',zIndex:10}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-end',marginBottom:'12px'}}>
          <div style={{width:'80px',height:'80px',borderRadius:'50%',border:'3px solid #070a10',overflow:'hidden',background:'linear-gradient(135deg,#00e5ff,#00ff88)',display:'flex',alignItems:'center',justifyContent:'center'}}>
            {profile.avatar_url
              ? <img src={profile.avatar_url} style={{width:'100%',height:'100%',objectFit:'cover'}}/>
              : <span style={{fontSize:'32px',fontWeight:'800',color:'#070a10'}}>{(profile.full_name||profile.username||'E')[0].toUpperCase()}</span>
            }
          </div>
          {!isOwnProfile ? (
            <button onClick={toggleSupport} style={{padding:'10px 24px',borderRadius:'20px',border:'none',cursor:'pointer',fontSize:'13px',fontWeight:'700',background:isSupporting?'rgba(255,255,255,0.08)':'linear-gradient(135deg,#00e5ff,#00ff88)',color:isSupporting?'#8892a4':'#070a10'}}>
              {isSupporting ? '✓ Supporting' : '+ Support'}
            </button>
          ) : (
            <button onClick={()=>window.location.href='/profile'} style={{padding:'10px 24px',borderRadius:'20px',border:'1px solid rgba(255,255,255,0.1)',cursor:'pointer',fontSize:'13px',fontWeight:'700',background:'none',color:'#8892a4'}}>
              Edit Profile
            </button>
          )}
        </div>

        <div style={{marginBottom:'16px'}}>
          <div style={{fontSize:'20px',fontWeight:'800',marginBottom:'2px'}}>{profile.full_name || profile.username}</div>
          <div style={{fontSize:'13px',color:'#4a5568',marginBottom:'6px'}}>@{profile.username}</div>
          {profile.bio && <div style={{fontSize:'13px',color:'#8892a4',lineHeight:'1.5'}}>{profile.bio}</div>}
        </div>

        {/* Stats — clickable */}
        <div style={{display:'flex',gap:'6px',marginBottom:'20px',flexWrap:'wrap'}}>
          <div style={{background:'#111620',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'12px',padding:'10px 16px',textAlign:'center',flex:1,minWidth:'60px'}}>
            <div style={{fontSize:'18px',fontWeight:'800',color:'#00e5ff'}}>{posts.length}</div>
            <div style={{fontSize:'10px',color:'#4a5568'}}>Posts</div>
          </div>
          <div onClick={()=>openModal('supporters')} style={{background:'#111620',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'12px',padding:'10px 16px',textAlign:'center',flex:1,minWidth:'60px',cursor:'pointer'}}>
            <div style={{fontSize:'18px',fontWeight:'800',color:'#00ff88'}}>{profile.followers_count||0}</div>
            <div style={{fontSize:'10px',color:'#4a5568'}}>Supporters</div>
          </div>
          <div onClick={()=>openModal('supporting')} style={{background:'#111620',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'12px',padding:'10px 16px',textAlign:'center',flex:1,minWidth:'60px',cursor:'pointer'}}>
            <div style={{fontSize:'18px',fontWeight:'800',color:'#ffca28'}}>{profile.following_count||0}</div>
            <div style={{fontSize:'10px',color:'#4a5568'}}>Supporting</div>
          </div>
          <div onClick={()=>openModal('likes')} style={{background:'#111620',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'12px',padding:'10px 16px',textAlign:'center',flex:1,minWidth:'60px',cursor:'pointer'}}>
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
          <div style={{textAlign:'center',padding:'40px 0',color:'#4a5568'}}>No posts yet</div>
        ) : filteredPosts.map(post => (
          <div key={post.id} style={{background:'#111620',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'14px',marginBottom:'12px',overflow:'hidden'}}>
            {post.media_type==='capsule' && (
              <div style={{padding:'14px',display:'flex',gap:'12px',alignItems:'center',background:'rgba(255,202,40,0.04)'}}>
                <span style={{fontSize:'24px'}}>📦</span>
                <div>
                  <div style={{fontSize:'13px',fontWeight:'700',color:'#ffca28'}}>🔒 Time Capsule</div>
                  <div style={{fontSize:'11px',color:'#4a5568'}}>📍 {post.location_name}</div>
                </div>
              </div>
            )}
            {post.media_url && post.media_type==='photo' && (
              <img src={post.media_url} style={{width:'100%',maxHeight:'300px',objectFit:'cover',display:'block'}}/>
            )}
            {post.media_url && post.media_type==='video' && (
              <video src={post.media_url} controls playsInline style={{width:'100%',maxHeight:'300px',display:'block',background:'#000'}}/>
            )}
            {post.content && (
              <div style={{padding:'10px 14px',fontSize:'13px',color:'#8892a4',lineHeight:'1.5'}}>{post.content}</div>
            )}
            <div style={{padding:'6px 14px 10px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div style={{display:'flex',gap:'12px'}}>
                <span style={{fontSize:'12px',color:'#4a5568'}}>❤️ {post.likes_count||0}</span>
                <span style={{fontSize:'12px',color:'#4a5568'}}>💬 {post.comments_count||0}</span>
              </div>
              <span style={{fontSize:'11px',color:'#4a5568'}}>{timeAgo(post.created_at)}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {modal && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',zIndex:500,display:'flex',alignItems:'flex-end'}} onClick={()=>setModal(null)}>
          <div style={{width:'100%',background:'#111620',borderRadius:'20px 20px 0 0',padding:'20px 16px',maxHeight:'70vh',overflowY:'auto'}} onClick={e=>e.stopPropagation()}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'16px'}}>
              <div style={{fontSize:'16px',fontWeight:'700'}}>
                {modal==='supporters'?'👥 Supporters':modal==='supporting'?'💙 Supporting':'❤️ Liked by'}
              </div>
              <button onClick={()=>setModal(null)} style={{background:'none',border:'none',color:'#4a5568',fontSize:'20px',cursor:'pointer'}}>✕</button>
            </div>

            {modalLoading ? (
              <div style={{textAlign:'center',padding:'30px',color:'#4a5568'}}>Loading...</div>
            ) : modalList.length === 0 ? (
              <div style={{textAlign:'center',padding:'30px',color:'#4a5568'}}>No one yet</div>
            ) : modalList.map(p => (
              <div key={p.id} onClick={()=>{setModal(null);window.location.href=`/user/${p.id}`}} style={{display:'flex',alignItems:'center',gap:'12px',padding:'10px',borderRadius:'12px',cursor:'pointer',marginBottom:'4px',background:'rgba(255,255,255,0.03)'}}>
                <div style={{width:'44px',height:'44px',borderRadius:'50%',overflow:'hidden',background:'linear-gradient(135deg,#00e5ff,#00ff88)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                  {p.avatar_url
                    ? <img src={p.avatar_url} style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                    : <span style={{fontWeight:'800',color:'#070a10',fontSize:'18px'}}>{(p.full_name||p.username||'E')[0].toUpperCase()}</span>
                  }
                </div>
                <div>
                  <div style={{fontSize:'14px',fontWeight:'700'}}>{p.full_name||p.username}</div>
                  <div style={{fontSize:'12px',color:'#4a5568'}}>@{p.username}</div>
                </div>
                <div style={{marginLeft:'auto',color:'#00e5ff',fontSize:'13px'}}>→</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
               }
