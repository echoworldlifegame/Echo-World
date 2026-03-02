'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

// তোমার email দাও
const ADMIN_EMAIL = 'mdakibgoodboy4@gmail.com'

export default function Admin() {
  const [user, setUser] = useState(null)
  const [authorized, setAuthorized] = useState(false)
  const [tab, setTab] = useState('dashboard')
  const [stats, setStats] = useState({})
  const [users, setUsers] = useState([])
  const [posts, setPosts] = useState([])
  const [reports, setReports] = useState([])
  const [announcement, setAnnouncement] = useState('')
  const [loading, setLoading] = useState(true)
  const [searchUser, setSearchUser] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { window.location.href = '/'; return }
      const u = data.session.user
      setUser(u)
      if (u.email !== ADMIN_EMAIL) {
        setAuthorized(false)
        setLoading(false)
        return
      }
      setAuthorized(true)
      await loadDashboard()
    })
  }, [])

  const loadDashboard = async () => {
    const [
      { count: totalUsers },
      { count: totalPosts },
      { count: totalLikes },
      { count: todayUsers },
    ] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('posts').select('*', { count: 'exact', head: true }),
      supabase.from('likes').select('*', { count: 'exact', head: true }),
      supabase.from('profiles').select('*', { count: 'exact', head: true })
        .gte('created_at', new Date(Date.now()-86400000).toISOString()),
    ])
    setStats({ totalUsers, totalPosts, totalLikes, todayUsers })
    setLoading(false)
  }

  const loadUsers = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)
    setUsers(data || [])
  }

  const loadPosts = async () => {
    const { data } = await supabase
      .from('posts')
      .select('*, profiles(username, full_name)')
      .order('created_at', { ascending: false })
      .limit(50)
    setPosts(data || [])
  }

  const deleteUser = async (userId) => {
    if (!confirm('Delete this user?')) return
    await supabase.from('posts').delete().eq('user_id', userId)
    await supabase.from('likes').delete().eq('user_id', userId)
    await supabase.from('followers').delete().eq('follower_id', userId)
    await supabase.from('profiles').delete().eq('id', userId)
    setUsers(u => u.filter(x => x.id !== userId))
  }

  const deletePost = async (postId) => {
    if (!confirm('Delete this post?')) return
    await supabase.from('posts').delete().eq('id', postId)
    setPosts(p => p.filter(x => x.id !== postId))
  }

  const banUser = async (userId) => {
    await supabase.from('profiles').update({ banned: true }).eq('id', userId)
    setUsers(u => u.map(x => x.id===userId ? {...x, banned:true} : x))
  }

  const unbanUser = async (userId) => {
    await supabase.from('profiles').update({ banned: false }).eq('id', userId)
    setUsers(u => u.map(x => x.id===userId ? {...x, banned:false} : x))
  }

  const sendAnnouncement = async () => {
    if (!announcement.trim()) return
    const { data: allUsers } = await supabase.from('profiles').select('id')
    const notifs = (allUsers||[]).map(u => ({
      user_id: u.id,
      from_user_id: user.id,
      type: 'announcement',
      message: announcement.trim(),
    }))
    await supabase.from('notifications').insert(notifs)
    alert('📢 Announcement sent to all users!')
    setAnnouncement('')
  }

  const timeAgo = (date) => {
    const s = Math.floor((new Date()-new Date(date))/1000)
    if(s<60) return 'এইমাত্র'
    if(s<3600) return Math.floor(s/60)+'মি'
    if(s<86400) return Math.floor(s/3600)+'ঘ'
    return Math.floor(s/86400)+'দিন'
  }

  if (loading) return (
    <div style={{height:'100vh',background:'#070a10',display:'flex',alignItems:'center',justifyContent:'center',color:'#00e5ff',fontSize:'18px',fontWeight:'700'}}>
      Loading Admin...
    </div>
  )

  if (!authorized) return (
    <div style={{height:'100vh',background:'#070a10',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:'16px',color:'#ff4560',padding:'24px',textAlign:'center'}}>
      <div style={{fontSize:'60px'}}>🚫</div>
      <div style={{fontSize:'22px',fontWeight:'800'}}>Access Denied</div>
      <div style={{fontSize:'14px',color:'#4a5568'}}>You are not authorized to view this page.</div>
      <button onClick={()=>window.location.href='/feed'} style={{background:'linear-gradient(135deg,#00e5ff,#00ff88)',border:'none',borderRadius:'12px',padding:'12px 28px',fontSize:'14px',fontWeight:'700',color:'#070a10',cursor:'pointer'}}>Go Back</button>
    </div>
  )

  const tabs = [
    {key:'dashboard',label:'📊 Dashboard'},
    {key:'users',label:'👥 Users'},
    {key:'posts',label:'📝 Posts'},
    {key:'announce',label:'📢 Announce'},
    {key:'settings',label:'⚙️ Settings'},
  ]

  return (
    <div style={{minHeight:'100vh',background:'#070a10',color:'#eef2f7'}}>

      {/* TOP BAR */}
      <div style={{position:'fixed',top:0,left:0,right:0,background:'rgba(7,10,16,0.98)',borderBottom:'1px solid rgba(0,229,255,0.1)',padding:'0 16px',height:'56px',display:'flex',alignItems:'center',justifyContent:'space-between',zIndex:100}}>
        <div style={{fontSize:'16px',fontWeight:'900',background:'linear-gradient(90deg,#00e5ff,#00ff88)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>⬡ Admin Panel</div>
        <div style={{display:'flex',gap:'8px',alignItems:'center'}}>
          <div style={{fontSize:'11px',color:'#4a5568'}}>👑 {user?.email}</div>
          <button onClick={()=>window.location.href='/feed'} style={{background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'16px',padding:'5px 12px',color:'#8892a4',fontSize:'12px',cursor:'pointer'}}>← App</button>
        </div>
      </div>

      {/* SIDE NAV (desktop) / TOP SCROLL (mobile) */}
      <div style={{position:'fixed',top:'56px',left:0,right:0,background:'rgba(7,10,16,0.97)',borderBottom:'1px solid rgba(255,255,255,0.07)',zIndex:99,display:'flex',gap:'4px',padding:'8px 12px',overflowX:'auto',scrollbarWidth:'none'}}>
        {tabs.map(t=>(
          <button key={t.key} onClick={()=>{setTab(t.key);if(t.key==='users')loadUsers();if(t.key==='posts')loadPosts()}}
            style={{padding:'7px 14px',borderRadius:'20px',border:'none',cursor:'pointer',fontSize:'12px',fontWeight:'700',whiteSpace:'nowrap',flexShrink:0,background:tab===t.key?'linear-gradient(135deg,#00e5ff,#00ff88)':'rgba(255,255,255,0.07)',color:tab===t.key?'#070a10':'#8892a4'}}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={{padding:'120px 16px 40px'}}>

        {/* DASHBOARD */}
        {tab==='dashboard'&&(
          <div>
            <div style={{fontSize:'18px',fontWeight:'800',marginBottom:'16px',color:'#00e5ff'}}>📊 Overview</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px',marginBottom:'20px'}}>
              {[
                {label:'Total Users',value:stats.totalUsers||0,icon:'👥',color:'#00e5ff'},
                {label:'Total Posts',value:stats.totalPosts||0,icon:'📝',color:'#00ff88'},
                {label:'Total Likes',value:stats.totalLikes||0,icon:'❤️',color:'#ff4560'},
                {label:'New Today',value:stats.todayUsers||0,icon:'🆕',color:'#ffca28'},
              ].map(s=>(
                <div key={s.label} style={{background:'#111620',border:`1px solid ${s.color}22`,borderRadius:'16px',padding:'16px',textAlign:'center'}}>
                  <div style={{fontSize:'28px',marginBottom:'6px'}}>{s.icon}</div>
                  <div style={{fontSize:'28px',fontWeight:'900',color:s.color,marginBottom:'4px'}}>{s.value}</div>
                  <div style={{fontSize:'11px',color:'#4a5568',fontWeight:'600'}}>{s.label}</div>
                </div>
              ))}
            </div>

            <div style={{background:'#111620',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'16px',padding:'16px',marginBottom:'16px'}}>
              <div style={{fontSize:'14px',fontWeight:'700',marginBottom:'12px',color:'#00e5ff'}}>🚀 Quick Actions</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px'}}>
                {[
                  {label:'View All Users',action:()=>{setTab('users');loadUsers()}},
                  {label:'View All Posts',action:()=>{setTab('posts');loadPosts()}},
                  {label:'Send Announcement',action:()=>setTab('announce')},
                  {label:'App Settings',action:()=>setTab('settings')},
                ].map(a=>(
                  <button key={a.label} onClick={a.action} style={{padding:'10px',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'12px',color:'#8892a4',fontSize:'12px',cursor:'pointer',fontWeight:'600'}}>
                    {a.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{background:'rgba(0,229,255,0.04)',border:'1px solid rgba(0,229,255,0.1)',borderRadius:'16px',padding:'16px'}}>
              <div style={{fontSize:'13px',fontWeight:'700',color:'#00e5ff',marginBottom:'10px'}}>💾 Free Tier Status</div>
              {[
                {label:'Supabase DB',used:'~50MB',total:'500MB',pct:10,color:'#00ff88'},
                {label:'Supabase Bandwidth',used:'~200MB',total:'2GB',pct:10,color:'#00e5ff'},
                {label:'Cloudinary Storage',used:'~1GB',total:'25GB',pct:4,color:'#ffca28'},
                {label:'Vercel Bandwidth',used:'~5GB',total:'100GB',pct:5,color:'#00ff88'},
              ].map(r=>(
                <div key={r.label} style={{marginBottom:'10px'}}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:'4px'}}>
                    <span style={{fontSize:'11px',color:'#8892a4'}}>{r.label}</span>
                    <span style={{fontSize:'11px',color:r.color,fontWeight:'600'}}>{r.used} / {r.total}</span>
                  </div>
                  <div style={{height:'4px',background:'rgba(255,255,255,0.05)',borderRadius:'2px'}}>
                    <div style={{height:'100%',width:`${r.pct}%`,background:r.color,borderRadius:'2px'}}/>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* USERS */}
        {tab==='users'&&(
          <div>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'14px'}}>
              <div style={{fontSize:'16px',fontWeight:'800',color:'#00e5ff'}}>👥 Users ({users.length})</div>
            </div>
            <input value={searchUser} onChange={e=>setSearchUser(e.target.value)} placeholder="Search users..."
              style={{width:'100%',background:'#111620',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'12px',padding:'10px 14px',color:'#eef2f7',fontSize:'13px',outline:'none',boxSizing:'border-box',marginBottom:'12px'}}/>
            {users.filter(u=>!searchUser||u.username?.includes(searchUser)||u.full_name?.includes(searchUser)).map(u=>(
              <div key={u.id} style={{background:'#111620',border:`1px solid ${u.banned?'rgba(255,69,96,0.3)':'rgba(255,255,255,0.07)'}`,borderRadius:'14px',padding:'12px',marginBottom:'8px'}}>
                <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
                  <div style={{width:'42px',height:'42px',borderRadius:'50%',overflow:'hidden',background:'linear-gradient(135deg,#00e5ff,#00ff88)',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}} onClick={()=>window.location.href=`/user/${u.id}`}>
                    {u.avatar_url?<img src={u.avatar_url} style={{width:'100%',height:'100%',objectFit:'cover'}}/>:<span style={{fontWeight:'800',color:'#070a10',fontSize:'16px'}}>{(u.full_name||u.username||'E')[0].toUpperCase()}</span>}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:'13px',fontWeight:'700'}}>{u.full_name||u.username} {u.banned&&<span style={{color:'#ff4560',fontSize:'10px'}}>🚫 BANNED</span>}</div>
                    <div style={{fontSize:'11px',color:'#4a5568'}}>@{u.username} · {timeAgo(u.created_at)}</div>
                    <div style={{fontSize:'10px',color:'#2a3040'}}>{u.id}</div>
                  </div>
                  <div style={{display:'flex',gap:'6px',flexShrink:0}}>
                    <button onClick={()=>u.banned?unbanUser(u.id):banUser(u.id)} style={{padding:'5px 10px',borderRadius:'8px',border:'none',cursor:'pointer',fontSize:'11px',fontWeight:'600',background:u.banned?'rgba(0,229,255,0.1)':'rgba(255,165,0,0.15)',color:u.banned?'#00e5ff':'#ffa500'}}>
                      {u.banned?'Unban':'Ban'}
                    </button>
                    <button onClick={()=>deleteUser(u.id)} style={{padding:'5px 10px',borderRadius:'8px',border:'none',cursor:'pointer',fontSize:'11px',fontWeight:'600',background:'rgba(255,69,96,0.15)',color:'#ff4560'}}>
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* POSTS */}
        {tab==='posts'&&(
          <div>
            <div style={{fontSize:'16px',fontWeight:'800',color:'#00e5ff',marginBottom:'14px'}}>📝 Posts ({posts.length})</div>
            {posts.map(post=>(
              <div key={post.id} style={{background:'#111620',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'14px',padding:'12px',marginBottom:'8px'}}>
                <div style={{display:'flex',gap:'10px',alignItems:'flex-start'}}>
                  {post.media_url&&post.media_type==='photo'&&<img src={post.media_url} style={{width:'60px',height:'60px',borderRadius:'8px',objectFit:'cover',flexShrink:0}}/>}
                  {post.media_url&&post.media_type==='video'&&<video src={post.media_url} style={{width:'60px',height:'60px',borderRadius:'8px',objectFit:'cover',flexShrink:0}} muted playsInline/>}
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:'12px',fontWeight:'700',color:'#00e5ff',marginBottom:'3px'}}>@{post.profiles?.username}</div>
                    <div style={{fontSize:'12px',color:'#8892a4',marginBottom:'3px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{post.content||'(no caption)'}</div>
                    <div style={{fontSize:'10px',color:'#4a5568'}}>❤️{post.likes_count||0} · 💬{post.comments_count||0} · {timeAgo(post.created_at)}</div>
                  </div>
                  <button onClick={()=>deletePost(post.id)} style={{padding:'6px 12px',borderRadius:'8px',border:'none',cursor:'pointer',fontSize:'11px',fontWeight:'600',background:'rgba(255,69,96,0.15)',color:'#ff4560',flexShrink:0}}>
                    🗑 Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ANNOUNCE */}
        {tab==='announce'&&(
          <div>
            <div style={{fontSize:'16px',fontWeight:'800',color:'#00e5ff',marginBottom:'16px'}}>📢 Send Announcement</div>
            <div style={{background:'#111620',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'16px',padding:'16px',marginBottom:'14px'}}>
              <div style={{fontSize:'13px',color:'#4a5568',marginBottom:'10px'}}>This will be sent to ALL users as a notification.</div>
              <textarea value={announcement} onChange={e=>setAnnouncement(e.target.value)} placeholder="Write announcement..." rows={5}
                style={{width:'100%',background:'#0c1018',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'12px',padding:'12px',color:'#eef2f7',fontSize:'14px',outline:'none',resize:'none',boxSizing:'border-box',marginBottom:'12px'}}/>
              <button onClick={sendAnnouncement} disabled={!announcement.trim()} style={{width:'100%',padding:'14px',background:'linear-gradient(135deg,#00e5ff,#00ff88)',border:'none',borderRadius:'12px',fontSize:'14px',fontWeight:'800',color:'#070a10',cursor:'pointer',opacity:announcement.trim()?1:0.5}}>
                📢 Send to All Users
              </button>
            </div>
          </div>
        )}

        {/* SETTINGS */}
        {tab==='settings'&&(
          <div>
            <div style={{fontSize:'16px',fontWeight:'800',color:'#00e5ff',marginBottom:'16px'}}>⚙️ App Settings</div>
            <div style={{background:'#111620',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'16px',padding:'16px',marginBottom:'12px'}}>
              <div style={{fontSize:'14px',fontWeight:'700',marginBottom:'12px'}}>🔗 Quick Links</div>
              {[
                {label:'Supabase Dashboard',url:'https://supabase.com/dashboard'},
                {label:'Vercel Dashboard',url:'https://vercel.com/dashboard'},
                {label:'Cloudinary Dashboard',url:'https://cloudinary.com/console'},
                {label:'GitHub Repo',url:'https://github.com/echoworldlifegame/Echo-World'},
              ].map(link=>(
                <a key={link.label} href={link.url} target="_blank" rel="noreferrer"
                  style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px',background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:'10px',marginBottom:'6px',color:'#00e5ff',textDecoration:'none',fontSize:'13px'}}>
                  {link.label} →
                </a>
              ))}
            </div>

            <div style={{background:'rgba(255,202,40,0.06)',border:'1px solid rgba(255,202,40,0.15)',borderRadius:'16px',padding:'16px'}}>
              <div style={{fontSize:'13px',fontWeight:'700',color:'#ffca28',marginBottom:'8px'}}>⚠️ Important Notes</div>
              <div style={{fontSize:'12px',color:'#8892a4',lineHeight:'1.8'}}>
                • Supabase free plan pauses after 7 days of inactivity<br/>
                • Visit the app regularly to keep it active<br/>
                • Free tier supports ~500-1000 active users<br/>
                • Cloudinary auto-optimizes images/videos
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
                    }
