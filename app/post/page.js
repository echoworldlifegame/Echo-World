'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default function Post() {
  const [user, setUser] = useState(null)
  const [content, setContent] = useState('')
  const [locationName, setLocationName] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [postType, setPostType] = useState('text')

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) window.location.href = '/'
      else setUser(data.session.user)
    })
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(pos => {
        fetch(`https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json`)
          .then(r => r.json())
          .then(d => setLocationName(d.display_name?.split(',').slice(0,2).join(', ') || 'Unknown Location'))
      })
    }
  }, [])

  const handlePost = async () => {
    if (!content.trim()) { setMessage('Please write something!'); return }
    setLoading(true)
    const { error } = await supabase.from('posts').insert({
      user_id: user.id,
      content: content,
      location_name: locationName,
      media_type: postType,
    })
    if (error) setMessage(error.message)
    else {
      setMessage('✅ Posted successfully!')
      setTimeout(() => window.location.href = '/feed', 1500)
    }
    setLoading(false)
  }

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
        <button onClick={()=>window.location.href='/feed'} style={{
          background:'none',border:'none',color:'#8892a4',fontSize:'24px',cursor:'pointer',
        }}>←</button>
        <div style={{
          fontSize:'16px',fontWeight:'800',
          background:'linear-gradient(90deg,#00e5ff,#00ff88)',
          WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',
        }}>Create Post</div>
        <button onClick={handlePost} disabled={loading} style={{
          background:'linear-gradient(135deg,#00e5ff,#00ff88)',
          border:'none',borderRadius:'20px',
          padding:'8px 18px',fontSize:'13px',fontWeight:'700',
          color:'#070a10',cursor:'pointer',
        }}>{loading ? '...' : 'POST'}</button>
      </div>

      <div style={{paddingTop:'76px',padding:'76px 16px 20px',maxWidth:'600px',margin:'0 auto'}}>

        {/* Post Type */}
        <div style={{
          display:'flex',gap:'8px',marginBottom:'20px',overflowX:'auto',paddingBottom:'4px',
        }}>
          {[
            {type:'text',icon:'✍',label:'Text'},
            {type:'video',icon:'🎥',label:'Video'},
            {type:'photo',icon:'📷',label:'Photo'},
            {type:'capsule',icon:'📦',label:'Capsule'},
            {type:'checkin',icon:'📍',label:'Check-in'},
          ].map(t => (
            <button key={t.type} onClick={()=>setPostType(t.type)} style={{
              display:'flex',alignItems:'center',gap:'6px',
              padding:'8px 16px',borderRadius:'20px',border:'none',
              cursor:'pointer',whiteSpace:'nowrap',fontSize:'13px',fontWeight:'600',
              background:postType===t.type ? 'linear-gradient(135deg,#00e5ff,#00ff88)' : '#111620',
              color:postType===t.type ? '#070a10' : '#4a5568',
              border:postType===t.type ? 'none' : '1px solid rgba(255,255,255,0.07)',
            }}>{t.icon} {t.label}</button>
          ))}
        </div>

        {/* Location */}
        <div style={{
          display:'flex',alignItems:'center',gap:'10px',
          background:'rgba(0,229,255,0.06)',
          border:'1px solid rgba(0,229,255,0.2)',
          borderRadius:'12px',padding:'12px 16px',marginBottom:'16px',
        }}>
          <span style={{fontSize:'20px'}}>📍</span>
          <div>
            <div style={{fontSize:'12px',color:'#00e5ff',marginBottom:'2px'}}>Your Location</div>
            <div style={{fontSize:'13px',color:'#8892a4'}}>{locationName || 'Detecting location...'}</div>
          </div>
        </div>

        {/* Content */}
        <textarea
          value={content}
          onChange={e=>setContent(e.target.value)}
          placeholder={
            postType==='capsule'
              ? '📦 Write a message for whoever visits this place...'
              : postType==='checkin'
              ? '📍 What are you doing here?'
              : '✍ Share something about this place...'
          }
          style={{
            width:'100%',minHeight:'160px',
            background:'#111620',
            border:'1px solid rgba(255,255,255,0.07)',
            borderRadius:'14px',padding:'16px',
            color:'#eef2f7',fontSize:'15px',
            outline:'none',resize:'none',
            fontFamily:'inherit',lineHeight:'1.6',
            boxSizing:'border-box',
          }}
        />

        {/* Capsule info */}
        {postType==='capsule' && (
          <div style={{
            background:'rgba(255,202,40,0.06)',
            border:'1px solid rgba(255,202,40,0.2)',
            borderRadius:'12px',padding:'12px 16px',marginTop:'12px',
          }}>
            <div style={{fontSize:'13px',color:'#ffca28',fontWeight:'600',marginBottom:'4px'}}>
              📦 Time Capsule Mode
            </div>
            <div style={{fontSize:'12px',color:'#4a5568'}}>
              Only people who physically visit this location can unlock your message
            </div>
          </div>
        )}

        {/* Message */}
        {message && (
          <div style={{
            background:message.includes('✅') ? 'rgba(0,255,136,0.1)' : 'rgba(255,69,96,0.1)',
            border:`1px solid ${message.includes('✅') ? 'rgba(0,255,136,0.3)' : 'rgba(255,69,96,0.3)'}`,
            borderRadius:'12px',padding:'14px',marginTop:'16px',
            fontSize:'14px',
            color:message.includes('✅') ? '#00ff88' : '#ff4560',
          }}>{message}</div>
        )}

        {/* Submit */}
        <button onClick={handlePost} disabled={loading} style={{
          width:'100%',padding:'16px',marginTop:'20px',
          background:'linear-gradient(135deg,#00e5ff,#00ff88)',
          border:'none',borderRadius:'14px',
          fontSize:'16px',fontWeight:'800',color:'#070a10',
          cursor:loading?'not-allowed':'pointer',
          opacity:loading?0.7:1,
        }}>
          {loading ? '⏳ Posting...' :
            postType==='capsule' ? '📦 Plant Capsule' :
            postType==='checkin' ? '📍 Check In' :
            '🚀 Post to Echo World'}
        </button>

      </div>
    </div>
  )
        }
