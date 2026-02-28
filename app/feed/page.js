'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default function Feed() {
  const [user, setUser] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) window.location.href = '/'
      else setUser(data.session.user)
    })
  }, [])

  return (
    <div style={{minHeight:'100vh',background:'#070a10',color:'#eef2f7'}}>
      {/* TOP BAR */}
      <div style={{
        position:'fixed',top:0,left:0,right:0,
        background:'rgba(7,10,16,0.95)',
        borderBottom:'1px solid rgba(255,255,255,0.07)',
        padding:'0 20px',height:'56px',
        display:'flex',alignItems:'center',
        justifyContent:'space-between',zIndex:100,
      }}>
        <div style={{
          fontSize:'20px',fontWeight:'800',
          background:'linear-gradient(90deg,#00e5ff,#00ff88)',
          WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',
        }}>ECHO⬡WORLD</div>
        <button onClick={async()=>{
          await supabase.auth.signOut()
          window.location.href='/'
        }} style={{
          background:'rgba(255,255,255,0.05)',
          border:'1px solid rgba(255,255,255,0.1)',
          borderRadius:'20px',padding:'6px 14px',
          color:'#8892a4',fontSize:'13px',cursor:'pointer',
        }}>Logout</button>
      </div>

      {/* BOTTOM NAV */}
      <div style={{
        position:'fixed',bottom:0,left:0,right:0,
        background:'rgba(7,10,16,0.98)',
        borderTop:'1px solid rgba(255,255,255,0.07)',
        display:'flex',justifyContent:'space-around',
        padding:'10px 0 20px',zIndex:100,
      }}>
        {[
          {icon:'🏠',label:'Home',path:'/feed'},
          {icon:'🗺',label:'Map',path:'/map'},
          {icon:'📸',label:'Post',path:'/post'},
          {icon:'🏆',label:'Rank',path:'/leaderboard'},
          {icon:'👤',label:'Profile',path:'/profile'},
        ].map(item => (
          <div key={item.label} onClick={()=>window.location.href=item.path}
            style={{
              display:'flex',flexDirection:'column',alignItems:'center',
              gap:'4px',cursor:'pointer',
              color:item.path==='/feed' ? '#00e5ff' : '#4a5568',
            }}>
            <span style={{fontSize:'22px'}}>{item.icon}</span>
            <span style={{fontSize:'10px',fontWeight:'600'}}>{item.label}</span>
          </div>
        ))}
      </div>

      {/* MAIN CONTENT */}
      <div style={{paddingTop:'76px',paddingBottom:'90px',maxWidth:'600px',margin:'0 auto',padding:'76px 16px 90px'}}>

        {/* Welcome */}
        <div style={{
          background:'linear-gradient(135deg,rgba(0,229,255,0.08),rgba(0,255,136,0.05))',
          border:'1px solid rgba(0,229,255,0.15)',
          borderRadius:'16px',padding:'16px',marginBottom:'20px',
        }}>
          <div style={{fontSize:'13px',color:'#00e5ff',marginBottom:'4px'}}>⚔ Level 1 Explorer</div>
          <div style={{fontSize:'18px',fontWeight:'700'}}>Welcome to Echo World! 🌍</div>
          <div style={{fontSize:'13px',color:'#4a5568',marginTop:'4px'}}>Start exploring to unlock your city</div>
          <div style={{height:'4px',background:'rgba(255,255,255,0.05)',borderRadius:'2px',marginTop:'12px'}}>
            <div style={{height:'100%',width:'2%',background:'linear-gradient(90deg,#00e5ff,#00ff88)',borderRadius:'2px'}}></div>
          </div>
          <div style={{fontSize:'11px',color:'#4a5568',marginTop:'4px'}}>Dhaka: 0% Unlocked</div>
        </div>

        {/* Create Post */}
        <div style={{
          background:'#111620',border:'1px solid rgba(255,255,255,0.07)',
          borderRadius:'16px',padding:'16px',marginBottom:'20px',
        }}>
          <div style={{display:'flex',gap:'12px',alignItems:'center'}}>
            <div style={{
              width:'40px',height:'40px',borderRadius:'50%',flexShrink:0,
              background:'linear-gradient(135deg,#00e5ff,#00ff88)',
              display:'flex',alignItems:'center',justifyContent:'center',fontSize:'18px',
            }}>🧭</div>
            <div onClick={()=>window.location.href='/post'} style={{
              flex:1,background:'#0c1018',
              border:'1px solid rgba(255,255,255,0.07)',
              borderRadius:'30px',padding:'12px 16px',
              color:'#4a5568',fontSize:'14px',cursor:'pointer',
            }}>Share something at your location...</div>
          </div>
          <div style={{display:'flex',gap:'8px',marginTop:'12px',justifyContent:'center'}}>
            {[
              {icon:'🎥',label:'Video',color:'rgba(255,69,96,0.15)',border:'rgba(255,69,96,0.3)',text:'#ff4560'},
              {icon:'📷',label:'Photo',color:'rgba(0,255,136,0.1)',border:'rgba(0,255,136,0.25)',text:'#00ff88'},
              {icon:'📦',label:'Capsule',color:'rgba(255,202,40,0.1)',border:'rgba(255,202,40,0.25)',text:'#ffca28'},
              {icon:'📍',label:'Check-in',color:'rgba(0,229,255,0.1)',border:'rgba(0,229,255,0.25)',text:'#00e5ff'},
            ].map(btn => (
              <div key={btn.label} onClick={()=>window.location.href='/post'}
                style={{
                  display:'flex',alignItems:'center',gap:'5px',
                  padding:'7px 12px',borderRadius:'8px',cursor:'pointer',
                  background:btn.color,border:`1px solid ${btn.border}`,color:btn.text,
                  fontSize:'12px',fontWeight:'600',
                }}>
                <span>{btn.icon}</span><span>{btn.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Empty state */}
        <div style={{
          textAlign:'center',padding:'60px 20px',
          color:'#4a5568',
        }}>
          <div style={{fontSize:'48px',marginBottom:'16px'}}>🗺</div>
          <div style={{fontSize:'18px',fontWeight:'700',color:'#8892a4',marginBottom:'8px'}}>
            No posts yet
          </div>
          <div style={{fontSize:'14px',marginBottom:'24px'}}>
            Go outside, explore your city and be the first to post!
          </div>
          <button onClick={()=>window.location.href='/post'} style={{
            background:'linear-gradient(135deg,#00e5ff,#00ff88)',
            border:'none',borderRadius:'12px',
            padding:'12px 28px',fontSize:'14px',fontWeight:'700',
            color:'#070a10',cursor:'pointer',
          }}>📸 Create First Post</button>
        </div>

      </div>
    </div>
  )
}
