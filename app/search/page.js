'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default function Search() {
  const [user, setUser] = useState(null)
  const [query, setQuery] = useState('')
  const [tab, setTab] = useState('people')
  const [people, setPeople] = useState([])
  const [posts, setPosts] = useState([])
  const [supported, setSupported] = useState({})
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { window.location.href = '/'; return }
      const u = data.session.user
      setUser(u)
      const { data: following } = await supabase.from('followers').select('following_id').eq('follower_id', u.id)
      const map = {}
      ;(following||[]).forEach(f => { map[f.following_id] = true })
      setSupported(map)
    })
  }, [])

  useEffect(() => {
    if (!query.trim()) { setPeople([]); setPosts([]); return }
    const t = setTimeout(() => doSearch(), 400)
    return () => clearTimeout(t)
  }, [query, tab])

  const doSearch = async () => {
    setSearching(true)
    if (tab === 'people') {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .or(`username.ilike.%${query}%,full_name.ilike.%${query}%`)
        .limit(20)
      setPeople(data || [])
    } else {
      const { data } = await supabase
        .from('posts')
        .select('*, profiles(id, username, full_name, avatar_url)')
        .or(`content.ilike.%${query}%,hashtags.ilike.%${query}%,location_name.ilike.%${query}%`)
        .order('created_at', { ascending: false })
        .limit(20)
      setPosts(data || [])
    }
    setSearching(false)
  }

  const handleSupport = async (profileId) => {
    if (!user || profileId === user.id) return
    if (supported[profileId]) {
      await supabase.from('followers').delete().eq('follower_id', user.id).eq('following_id', profileId)
      setSupported(p=>({...p,[profileId]:false}))
    } else {
      await supabase.from('followers').upsert({ follower_id: user.id, following_id: profileId })
      setSupported(p=>({...p,[profileId]:true}))
    }
  }

  return (
    <div style={{minHeight:'100vh',background:'#070a10',color:'#eef2f7',paddingBottom:'80px'}}>
      <div style={{position:'fixed',top:0,left:0,right:0,background:'rgba(7,10,16,0.97)',borderBottom:'1px solid rgba(255,255,255,0.07)',padding:'10px 16px',zIndex:100}}>
        <div style={{display:'flex',gap:'10px',alignItems:'center',marginBottom:'10px'}}>
          <button onClick={()=>window.history.back()} style={{background:'none',border:'none',color:'#8892a4',fontSize:'22px',cursor:'pointer'}}>←</button>
          <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search people, posts, hashtags..." autoFocus
            style={{flex:1,background:'#111620',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'20px',padding:'10px 16px',color:'#eef2f7',fontSize:'14px',outline:'none'}}/>
          {searching&&<div style={{color:'#4a5568',fontSize:'12px'}}>...</div>}
        </div>
        <div style={{display:'flex',gap:'8px'}}>
          {[{key:'people',label:'👥 People'},{key:'posts',label:'📝 Posts'},{key:'hashtags',label:'# Tags'}].map(t=>(
            <button key={t.key} onClick={()=>setTab(t.key)} style={{padding:'6px 14px',borderRadius:'20px',border:'none',cursor:'pointer',fontSize:'12px',fontWeight:'700',background:tab===t.key?'linear-gradient(135deg,#00e5ff,#00ff88)':'rgba(255,255,255,0.07)',color:tab===t.key?'#070a10':'#8892a4'}}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{position:'fixed',bottom:0,left:0,right:0,background:'rgba(7,10,16,0.98)',borderTop:'1px solid rgba(255,255,255,0.07)',display:'flex',justifyContent:'space-around',padding:'10px 0 20px',zIndex:100}}>
        {[{icon:'🏠',path:'/feed'},{icon:'🗺',path:'/map'},{icon:'📸',path:'/post'},{icon:'🏆',path:'/leaderboard'},{icon:'👤',path:'/profile'}].map(item=>(
          <div key={item.path} onClick={()=>window.location.href=item.path} style={{fontSize:'22px',cursor:'pointer',color:'#4a5568'}}>{item.icon}</div>
        ))}
      </div>

      <div style={{padding:'120px 16px 20px'}}>
        {!query && (
          <div style={{textAlign:'center',padding:'40px',color:'#4a5568'}}>
            <div style={{fontSize:'48px',marginBottom:'12px'}}>🔍</div>
            <div>Search for people, posts or hashtags</div>
          </div>
        )}

        {tab==='people'&&people.map(p=>(
          <div key={p.id} style={{display:'flex',alignItems:'center',gap:'12px',padding:'12px',background:'#111620',borderRadius:'14px',marginBottom:'8px',border:'1px solid rgba(255,255,255,0.07)'}}>
            <div onClick={()=>window.location.href=`/user/${p.id}`} style={{width:'50px',height:'50px',borderRadius:'50%',overflow:'hidden',background:'linear-gradient(135deg,#00e5ff,#00ff88)',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}}>
              {p.avatar_url?<img src={p.avatar_url} style={{width:'100%',height:'100%',objectFit:'cover'}}/>:<span style={{fontWeight:'800',color:'#070a10',fontSize:'18px'}}>{(p.full_name||p.username||'E')[0].toUpperCase()}</span>}
            </div>
            <div style={{flex:1,cursor:'pointer',minWidth:0}} onClick={()=>window.location.href=`/user/${p.id}`}>
              <div style={{fontSize:'14px',fontWeight:'700'}}>{p.full_name||p.username}</div>
              <div style={{fontSize:'12px',color:'#4a5568'}}>@{p.username}</div>
              {p.bio&&<div style={{fontSize:'11px',color:'#8892a4',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.bio}</div>}
            </div>
            {user?.id!==p.id&&(
              <button onClick={()=>handleSupport(p.id)} style={{padding:'7px 14px',borderRadius:'20px',border:`1px solid ${supported[p.id]?'rgba(0,229,255,0.3)':'rgba(255,255,255,0.15)'}`,background:supported[p.id]?'rgba(0,229,255,0.08)':'transparent',color:supported[p.id]?'#00e5ff':'#8892a4',fontSize:'12px',fontWeight:'600',cursor:'pointer',flexShrink:0}}>
                {supported[p.id]?'✓ Supporting':'+ Support'}
              </button>
            )}
          </div>
        ))}

        {(tab==='posts'||tab==='hashtags')&&posts.map(post=>(
          <div key={post.id} style={{background:'#111620',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'14px',marginBottom:'10px',overflow:'hidden',cursor:'pointer'}} onClick={()=>window.location.href=`/comments/${post.id}`}>
            {post.media_url&&post.media_type==='photo'&&<img src={post.media_url} style={{width:'100%',maxHeight:'200px',objectFit:'cover'}}/>}
            {post.media_url&&post.media_type==='video'&&<video src={post.media_url} style={{width:'100%',maxHeight:'200px',objectFit:'cover'}} muted playsInline/>}
            <div style={{padding:'10px 12px'}}>
              <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'6px'}}>
                <div style={{width:'28px',height:'28px',borderRadius:'50%',overflow:'hidden',background:'linear-gradient(135deg,#00e5ff,#00ff88)',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center'}}>
                  {post.profiles?.avatar_url?<img src={post.profiles.avatar_url} style={{width:'100%',height:'100%',objectFit:'cover'}}/>:<span style={{fontSize:'12px',fontWeight:'800',color:'#070a10'}}>{(post.profiles?.full_name||'E')[0].toUpperCase()}</span>}
                </div>
                <span style={{fontSize:'12px',fontWeight:'600'}}>{post.profiles?.full_name||post.profiles?.username}</span>
              </div>
              {post.content&&<div style={{fontSize:'13px',color:'#8892a4',lineHeight:'1.5'}}>{post.content?.slice(0,120)}</div>}
              {post.hashtags&&<div style={{fontSize:'12px',color:'#00e5ff',marginTop:'4px'}}>{post.hashtags}</div>}
              <div style={{fontSize:'11px',color:'#2a3040',marginTop:'6px'}}>❤️ {post.likes_count||0} · 💬 {post.comments_count||0}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
      }
