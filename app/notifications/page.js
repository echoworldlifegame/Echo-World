'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default function Notifications() {
  const [user, setUser] = useState(null)
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { window.location.href = '/'; return }
      const u = data.session.user
      setUser(u)

      const { data: notifs } = await supabase
        .from('notifications')
        .select('*, profiles!notifications_from_user_id_fkey(id, username, full_name, avatar_url)')
        .eq('user_id', u.id)
        .order('created_at', { ascending: false })
        .limit(50)

      setNotifications(notifs || [])

      // Mark all as read
      await supabase.from('notifications').update({ read: true }).eq('user_id', u.id).eq('read', false)

      setLoading(false)
    })
  }, [])

  const timeAgo = (date) => {
    const s = Math.floor((new Date() - new Date(date)) / 1000)
    if (s < 60) return 'এইমাত্র'
    if (s < 3600) return Math.floor(s/60) + 'মি আগে'
    if (s < 86400) return Math.floor(s/3600) + 'ঘ আগে'
    return Math.floor(s/86400) + 'দিন আগে'
  }

  const getNotifContent = (n) => {
    const name = n.profiles?.full_name || n.profiles?.username || 'Someone'
    switch(n.type) {
      case 'follow': return { icon:'👥', text:`${name} started supporting you`, color:'#00ff88' }
      case 'like': return { icon:'❤️', text:`${name} liked your post`, color:'#ff4560' }
      case 'comment': return { icon:'💬', text:`${name} commented: "${n.message||''}"`, color:'#00e5ff' }
      case 'mention': return { icon:'@', text:`${name} mentioned you`, color:'#ffca28' }
      case 'remix': return { icon:'🔀', text:`${name} remixed your video`, color:'#ffa500' }
      default: return { icon:'🔔', text:n.message||'New notification', color:'#8892a4' }
    }
  }

  return (
    <div style={{minHeight:'100vh',background:'#070a10',color:'#eef2f7',paddingBottom:'80px'}}>

      {/* TOP BAR */}
      <div style={{position:'fixed',top:0,left:0,right:0,background:'rgba(7,10,16,0.97)',borderBottom:'1px solid rgba(255,255,255,0.07)',padding:'0 16px',height:'56px',display:'flex',alignItems:'center',justifyContent:'space-between',zIndex:100}}>
        <button onClick={()=>window.history.back()} style={{background:'none',border:'none',color:'#8892a4',fontSize:'24px',cursor:'pointer'}}>←</button>
        <div style={{fontSize:'16px',fontWeight:'800'}}>🔔 Notifications</div>
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

      <div style={{padding:'72px 16px 20px'}}>
        {loading ? (
          <div style={{textAlign:'center',padding:'40px',color:'#4a5568'}}>Loading...</div>
        ) : notifications.length === 0 ? (
          <div style={{textAlign:'center',padding:'60px 20px'}}>
            <div style={{fontSize:'48px',marginBottom:'16px'}}>🔔</div>
            <div style={{color:'#4a5568',fontSize:'15px'}}>No notifications yet</div>
          </div>
        ) : notifications.map(n => {
          const { icon, text, color } = getNotifContent(n)
          return (
            <div key={n.id}
              onClick={()=>n.profiles?.id&&(window.location.href=`/user/${n.profiles.id}`)}
              style={{display:'flex',alignItems:'center',gap:'12px',padding:'12px',borderRadius:'14px',marginBottom:'6px',background:n.read?'rgba(255,255,255,0.02)':'rgba(0,229,255,0.04)',border:`1px solid ${n.read?'rgba(255,255,255,0.04)':'rgba(0,229,255,0.1)'}`,cursor:'pointer'}}>

              <div style={{width:'48px',height:'48px',borderRadius:'50%',overflow:'hidden',background:'linear-gradient(135deg,#00e5ff,#00ff88)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,position:'relative'}}>
                {n.profiles?.avatar_url
                  ? <img src={n.profiles.avatar_url} style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                  : <span style={{fontWeight:'800',color:'#070a10',fontSize:'18px'}}>{(n.profiles?.full_name||n.profiles?.username||'?')[0].toUpperCase()}</span>
                }
                <div style={{position:'absolute',bottom:'-2px',right:'-2px',background:color,borderRadius:'50%',width:'20px',height:'20px',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'11px',border:'2px solid #070a10'}}>
                  {icon}
                </div>
              </div>

              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:'13px',color:'#eef2f7',lineHeight:'1.4'}}>{text}</div>
                <div style={{fontSize:'11px',color:'#4a5568',marginTop:'3px'}}>{timeAgo(n.created_at)}</div>
              </div>

              {!n.read && (
                <div style={{width:'8px',height:'8px',borderRadius:'50%',background:'#00e5ff',flexShrink:0}}/>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
            }
