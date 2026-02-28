'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default function Search() {
  const [query, setQuery] = useState('')
  const [users, setUsers] = useState([])
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState('users')

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) window.location.href = '/'
    })
  }, [])

  useEffect(() => {
    if (query.length < 2) { setUsers([]); setPosts([]); return }
    const timer = setTimeout(() => doSearch(), 500)
    return () => clearTimeout(timer)
  }, [query])

  const doSearch = async () => {
    setLoading(true)
    const { data: userData } = await supabase
      .from('profiles')
      .select('*')
      .or(`username.ilike.%${query}%,full_name.ilike.%${query}%`)
      .limit(20)
    setUsers(userData || [])

    const { data: postData } = await supabase
      .from('posts')
      .select('*, profiles(username, full_name, avatar_url)')
      .or(`content.ilike.%${query}%,location_name.ilike.%${query}%,hashtags.ilike.%${query}%`)
      .eq('privacy', 'public')
      .limit(20)
    setPosts(postData || [])
    setLoading(false)
  }

  return (
    <div style={{minHeight:'100vh',background:'#070a10',color:'#eef2f7'}}>

      {/* TOP BAR */}
      <div style={{position:'fixed',top:0,left:0,right:0,background:'rgba(7,10,16,0.95)',borderBottom:'1px solid rgba(255,255,255,0.07)',padding:'8px 16px',zIndex:100}}>
        <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'8px'}}>
          <button onClick={()=>window.history.back()} style={{background:'none',border:'none',color:'#8892a4',fontSize:'22px',cursor:'pointer',flexShrink:0}}>←</button>
          <div style={{flex:1,background:'#111620',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'12px',display:'flex',alignItems:'center',gap:'8px',padding:'10px 14px'}}>
            <span style={{fontSize:'16px'}}>🔍</span>
            <input
              autoFocus
              value={query}
              onChange={e=>setQuery(e.target.value)}
              placeholder="Search users, posts, locations..."
              style={{flex:1,background:'none',border:'none',color:'#eef2f7',fontSize:'14px',outline:'none'}}
            />
            {query && <button onClick={()=>setQuery('')} style={{background:'none',border:'none',color:'#4a5568',cursor:'pointer',fontSize:'16px'}}>✕</button>}
          </div>
        </div>

        {/* Tabs */}
        <div style={{display:'flex',gap:'6px'}}>
          {[
            {key:'users',label:'👤 Users'},
            {key:'posts',label:'📸 Posts'},
          ].map(t => (
            <button key={t.key} onClick={()=>setTab(t.key)} style={{padding:'6px 16px',borderRadius:'20px',border:'none',cursor:'pointer',fontSize:'12px',fontWeight:'600',background:tab===t.key?'linear-gradient(135deg,#00e5ff,#00ff88)':'rgba(255,255,255,0.05)',color:tab===t.key?'#070a10':'#4a5568'}}>
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
          <div key={item.label} onClick={()=>window.location.href=item.path} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'4px',cursor:'pointer',color:'#4a5568'}}>
            <span style={{fontSize:'22px'}}>{item.icon}</span>
            <span style={{fontSize:'10px',fontWeight:'600'}}>{item.label}</span>
          </div>
        ))}
      </div>

      <div style={{paddingTop:'110px',paddingBottom:'90px',maxWidth:'600px',margin:'0 auto',padding:'110px 16px 90px'}}>

        {/* Empty state */}
        {query.length < 2 && (
          <div style={{textAlign:'center',padding:'60px 20px',color:'#4a5568'}}>
            <div style={{fontSize:'48px',marginBottom:'16px'}}>🔍</div>
            <div style={{fontSize:'16px',fontWeight:'600',color:'#8892a4',marginBottom:'8px'}}>Search Echo World</div>
            <div style={{fontSize:'13px'}}>Find users by name or username</div>
            <div style={{fontSize:'13px'}}>Find posts by location or hashtag</div>
          </div>
        )}

        {loading && (
          <div style={{textAlign:'center',padding:'40px',color:'#4a5568'}}>Searching...</div>
        )}

        {/* Users */}
        {tab === 'users' && !loading && users.map(user => (
          <div key={user.id} onClick={()=>window.location.href=`/user/${user.id}`} style={{display:'flex',alignItems:'center',gap:'12px',background:'#111620',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'14px',padding:'14px',marginBottom:'10px',cursor:'pointer'}}>
            <div style={{width:'48px',height:'48px',borderRadius:'50%',background:'linear-gradient(135deg,#00e5ff,#00ff88)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'20px',overflow:'hidden',flexShrink:0}}>
              {user.avatar_url ? <img src={user.avatar_url} style={{width:'100%',height:'100%',objectFit:'cover'}}/> : (user.username?.[0]?.toUpperCase()||'🧭')}
            </div>
            <div style={{flex:1}}>
              <div style={{fontSize:'15px',fontWeight:'700'}}>{user.full_name || user.username}</div>
              <div style={{fontSize:'12px',color:'#4a5568'}}>@{user.username}</div>
              <div style={{fontSize:'11px',color:'#00e5ff',marginTop:'2px'}}>⚔ Level {user.level||1} · {user.followers_count||0} Supporters</div>
            </div>
            <div style={{color:'#4a5568',fontSize:'18px'}}>›</div>
          </div>
        ))}

        {tab === 'users' && !loading && query.length >= 2 && users.length === 0 && (
          <div style={{textAlign:'center',padding:'40px',color:'#4a5568'}}>
            <div style={{fontSize:'32px',marginBottom:'12px'}}>😶</div>
            <div>No users found for "{query}"</div>
          </div>
        )}

        {/* Posts */}
        {tab === 'posts' && !loading && posts.map(post => (
          <div key={post.id} style={{background:'#111620',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'14px',marginBottom:'12px',overflow:'hidden'}}>
            <div style={{display:'flex',alignItems:'center',gap:'10px',padding:'12px 14px 8px',cursor:'pointer'}} onClick={()=>window.location.href=`/user/${post.user_id}`}>
              <div style={{width:'36px',height:'36px',borderRadius:'50%',background:'linear-gradient(135deg,#00e5ff,#00ff88)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'16px',overflow:'hidden',flexShrink:0}}>
                {post.profiles?.avatar_url ? <img src={post.profiles.avatar_url} style={{width:'100%',height:'100%',objectFit:'cover'}}/> : (post.profiles?.username?.[0]?.toUpperCase()||'🧭')}
              </div>
              <div>
                <div style={{fontSize:'13px',fontWeight:'600'}}>{post.profiles?.full_name || post.profiles?.username}</div>
                {post.location_name && <div style={{fontSize:'11px',color:'#00e5ff'}}>📍 {post.location_name}</div>}
              </div>
            </div>
            {post.media_url && post.media_type==='photo' && <img src={post.media_url} style={{width:'100%',maxHeight:'200px',objectFit:'cover',display:'block'}}/>}
            {post.content && <div style={{padding:'8px 14px 12px',fontSize:'13px',color:'#8892a4'}}>{post.content}</div>}
          </div>
        ))}

        {tab === 'posts' && !loading && query.length >= 2 && posts.length === 0 && (
          <div style={{textAlign:'center',padding:'40px',color:'#4a5568'}}>
            <div style={{fontSize:'32px',marginBottom:'12px'}}>📭</div>
            <div>No posts found for "{query}"</div>
          </div>
        )}
      </div>
    </div>
  )
      }
