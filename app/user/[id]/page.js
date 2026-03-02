'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default function UserProfile({ params }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [supported, setSupported] = useState(false)
  const [activeTab, setActiveTab] = useState('all')
  const [activeModal, setActiveModal] = useState(null)
  const [modalList, setModalList] = useState([])
  const [isOwn, setIsOwn] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { window.location.href = '/'; return }
      const u = data.session.user
      setUser(u)
      if (u.id === params.id) { window.location.href = '/profile'; return }

      const { data: p } = await supabase.from('profiles').select('*').eq('id', params.id).single()
      setProfile(p)

      const { data: ps } = await supabase.from('posts').select('*').eq('user_id', params.id).order('created_at', { ascending: false })
      setPosts(ps || [])

      const { data: f } = await supabase.from('followers').select('id').eq('follower_id', u.id).eq('following_id', params.id).single()
      setSupported(!!f)

      setLoading(false)
    })
  }, [params.id])

  const handleSupport = async () => {
    if (!user) return
    if (supported) {
      await supabase.from('followers').delete().eq('follower_id', user.id).eq('following_id', params.id)
      setSupported(false)
    } else {
      await supabase.from('followers').upsert({ follower_id: user.id, following_id: params.id })
      setSupported(true)
      await supabase.from('notifications').insert({ user_id: params.id, from_user_id: user.id, type: 'follow' })
    }
  }

  const openModal = async (type) => {
    setActiveModal(type)
    if (type==='supporters') {
      const { data } = await supabase.from('followers').select('profiles!followers_follower_id_fkey(id,username,full_name,avatar_url)').eq('following_id', params.id)
      setModalList((data||[]).map(d=>d.profiles).filter(Boolean))
    } else if (type==='supporting') {
      const { data } = await supabase.from('followers').select('profiles!followers_following_id_fkey(id,username,full_name,avatar_url)').eq('follower_id', params.id)
      setModalList((data||[]).map(d=>d.profiles).filter(Boolean))
    }
  }

  const filteredPosts = posts.filter(p => {
    if (activeTab==='photos') return p.media_type==='photo'
    if (activeTab==='videos') return p.media_type==='video'
    if (activeTab==='capsules') return p.media_type==='capsule'
    return true
  })

  const getName = () => profile?.full_name || profile?.username || 'Explorer'

  if (loading) return (
    <div style={{height:'100vh',background:'#070a10',display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:'12px'}}>
      <div style={{fontSize:'40px',animation:'spin 1s linear infinite'}}>⬡</div>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <div style={{minHeight:'100vh',background:'#070a10',color:'#eef2f7',paddingBottom:'80px'}}>
      <div style={{position:'fixed',top:0,left:0,right:0,background:'rgba(7,10,16,0.97)',borderBottom:'1px solid rgba(255,255,255,0.07)',padding:'0 16px',height:'52px',display:'flex',alignItems:'center',justifyContent:'space-between',zIndex:100}}>
        <button onClick={()=>window.history.back()} style={{background:'none',border:'none',color:'#8892a4',fontSize:'22px',cursor:'pointer'}}>←</button>
        <div style={{fontSize:'15px',fontWeight:'800'}}>{getName()}</div>
        <button onClick={handleSupport} style={{background:supported?'rgba(0,229,255,0.1)':'linear-gradient(135deg,#00e5ff,#00ff88)',border:supported?'1px solid rgba(0,229,255,0.3)':'none',borderRadius:'20px',padding:'7px 16px',color:supported?'#00e5ff':'#070a10',fontSize:'13px',fontWeight:'700',cursor:'pointer'}}>
          {supported?'✓ Supporting':'+ Support'}
        </button>
      </div>

      <div style={{position:'fixed',bottom:0,left:0,right:0,background:'rgba(7,10,16,0.98)',borderTop:'1px solid rgba(255,255,255,0.07)',display:'flex',justifyContent:'space-around',padding:'10px 0 20px',zIndex:100}}>
        {[{icon:'🏠',path:'/feed'},{icon:'🗺',path:'/map'},{icon:'📸',path:'/post'},{icon:'🏆',path:'/leaderboard'},{icon:'👤',path:'/profile'}].map(item=>(
          <div key={item.path} onClick={()=>window.location.href=item.path} style={{fontSize:'22px',cursor:'pointer',color:'#4a5568'}}>{item.icon}</div>
        ))}
      </div>

      {/* Cover */}
      <div style={{marginTop:'52px',height:'150px',background:'linear-gradient(135deg,#0a1628,#0d2137)',overflow:'hidden',position:'relative'}}>
        {profile?.cover_url&&<img src={profile.cover_url} style={{width:'100%',height:'100%',objectFit:'cover'}}/>}
        <div style={{position:'absolute',inset:0,background:'linear-gradient(to bottom,transparent,rgba(7,10,16,0.5))'}}/>
      </div>

      <div style={{padding:'0 16px'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-end',marginTop:'-40px',marginBottom:'12px'}}>
          <div style={{width:'84px',height:'84px',borderRadius:'50%',border:'3px solid #070a10',overflow:'hidden',background:'linear-gradient(135deg,#00e5ff,#00ff88)',display:'flex',alignItems:'center',justifyContent:'center'}}>
            {profile?.avatar_url?<img src={profile.avatar_url} style={{width:'100%',height:'100%',objectFit:'cover'}}/>:<span style={{fontSize:'32px',fontWeight:'900',color:'#070a10'}}>{getName()[0]?.toUpperCase()}</span>}
          </div>
          <button onClick={()=>window.location.href=`/comments/${params.id}`} style={{background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'20px',padding:'8px 16px',color:'#8892a4',fontSize:'12px',cursor:'pointer'}}>💬 Message</button>
        </div>

        <div style={{marginBottom:'16px'}}>
          <div style={{fontSize:'20px',fontWeight:'800',marginBottom:'2px'}}>{getName()}</div>
          <div style={{fontSize:'13px',color:'#4a5568',marginBottom:'6px'}}>@{profile?.username}</div>
          {profile?.bio&&<div style={{fontSize:'13px',color:'#8892a4',lineHeight:'1.6'}}>{profile.bio}</div>}
        </div>

        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'8px',marginBottom:'16px'}}>
          {[
            {label:'Posts',value:posts.length,modal:null},
            {label:'Supporters',value:profile?.followers_count||0,modal:'supporters'},
            {label:'Supporting',value:profile?.following_count||0,modal:'supporting'},
          ].map(stat=>(
            <div key={stat.label} onClick={()=>stat.modal&&openModal(stat.modal)} style={{background:'#111620',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'14px',padding:'12px 8px',textAlign:'center',cursor:stat.modal?'pointer':'default'}}>
              <div style={{fontSize:'20px',fontWeight:'900',background:'linear-gradient(90deg,#00e5ff,#00ff88)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>{stat.value}</div>
              <div style={{fontSize:'10px',color:'#4a5568',fontWeight:'600'}}>{stat.label}</div>
            </div>
          ))}
        </div>

        <div style={{display:'flex',gap:'6px',marginBottom:'14px'}}>
          {[{key:'all',label:'All'},{key:'photos',label:'Photos'},{key:'videos',label:'Videos'},{key:'capsules',label:'Capsules'}].map(t=>(
            <button key={t.key} onClick={()=>setActiveTab(t.key)} style={{padding:'6px 12px',borderRadius:'16px',border:'none',cursor:'pointer',fontSize:'11px',fontWeight:'700',background:activeTab===t.key?'linear-gradient(135deg,#00e5ff,#00ff88)':'rgba(255,255,255,0.06)',color:activeTab===t.key?'#070a10':'#4a5568'}}>
              {t.label}
            </button>
          ))}
        </div>

        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'3px'}}>
          {filteredPosts.map(post=>(
            <div key={post.id} style={{position:'relative',paddingTop:'100%',background:'#111620',overflow:'hidden',borderRadius:'4px',cursor:'pointer'}} onClick={()=>window.location.href=`/comments/${post.id}`}>
              {post.media_url&&post.media_type==='photo'&&<img src={post.media_url} style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover'}}/>}
              {post.media_url&&post.media_type==='video'&&<video src={post.media_url} style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover'}} muted playsInline/>}
              {!post.media_url&&<div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',padding:'6px'}}><div style={{fontSize:'10px',color:'#8892a4',textAlign:'center'}}>{post.content?.slice(0,40)}</div></div>}
              <div style={{position:'absolute',bottom:'4px',left:'4px',fontSize:'10px',color:'rgba(255,255,255,0.8)',fontWeight:'600',textShadow:'0 1px 2px rgba(0,0,0,0.8)'}}>❤️{post.likes_count||0}</div>
            </div>
          ))}
        </div>
      </div>

      {activeModal&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',display:'flex',alignItems:'flex-end',zIndex:500}} onClick={()=>setActiveModal(null)}>
          <div style={{background:'#111620',borderRadius:'24px 24px 0 0',width:'100%',maxHeight:'70vh',display:'flex',flexDirection:'column'}} onClick={e=>e.stopPropagation()}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'16px 20px 8px'}}>
              <div style={{fontSize:'15px',fontWeight:'800'}}>{activeModal==='supporters'?'👥 Supporters':'🤝 Supporting'}</div>
              <button onClick={()=>setActiveModal(null)} style={{background:'none',border:'none',color:'#4a5568',fontSize:'22px',cursor:'pointer'}}>✕</button>
            </div>
            <div style={{overflowY:'auto',padding:'8px 16px 24px'}}>
              {modalList.map(p=>(
                <div key={p.id} onClick={()=>window.location.href=`/user/${p.id}`} style={{display:'flex',alignItems:'center',gap:'12px',padding:'10px',borderRadius:'12px',cursor:'pointer',marginBottom:'4px'}}>
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
