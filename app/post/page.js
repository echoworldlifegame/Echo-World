'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default function Post() {
  const [user, setUser] = useState(null)
  const [content, setContent] = useState('')
  const [locationName, setLocationName] = useState('')
  const [latitude, setLatitude] = useState(null)
  const [longitude, setLongitude] = useState(null)
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState('')
  const [postType, setPostType] = useState('text')
  const [mediaUrl, setMediaUrl] = useState('')
  const [mediaPreview, setMediaPreview] = useState('')
  const fileRef = useRef()

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) window.location.href = '/'
      else setUser(data.session.user)
    })
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(pos => {
        setLatitude(pos.coords.latitude)
        setLongitude(pos.coords.longitude)
        fetch(`https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json`)
          .then(r => r.json())
          .then(d => setLocationName(d.display_name?.split(',').slice(0,2).join(', ') || 'Unknown'))
      })
    }
  }, [])

  const handleFileUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    setMessage('')
    setMediaPreview(URL.createObjectURL(file))

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('upload_preset', 'echoworld_preset')
      formData.append('cloud_name', process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME)

      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/auto/upload`,
        { method: 'POST', body: formData }
      )
      const data = await res.json()
      if (data.secure_url) {
        setMediaUrl(data.secure_url)
        setMessage('✅ Upload ready!')
      } else {
        setMessage('❌ Upload failed. Try again.')
        setMediaPreview('')
      }
    } catch(err) {
      setMessage('❌ Upload error: ' + err.message)
      setMediaPreview('')
    }
    setUploading(false)
  }

  const handlePost = async () => {
    if (!content.trim() && !mediaUrl) {
      setMessage('Please write something or upload a file!')
      return
    }
    setLoading(true)
    const { error } = await supabase.from('posts').insert({
      user_id: user.id,
      content: content,
      location_name: locationName,
      latitude: latitude,
      longitude: longitude,
      media_url: mediaUrl,
      media_type: postType,
    })
    if (error) setMessage(error.message)
    else {
      setMessage('✅ Posted!')
      setTimeout(() => window.location.href = '/feed', 1200)
    }
    setLoading(false)
  }

  const showMediaUpload = postType === 'photo' || postType === 'video' || postType === 'capsule'
  const acceptType = postType === 'video' ? 'video/*' : 'image/*'

  return (
    <div style={{minHeight:'100vh',background:'#070a10',color:'#eef2f7'}}>
      <div style={{position:'fixed',top:0,left:0,right:0,background:'rgba(7,10,16,0.95)',borderBottom:'1px solid rgba(255,255,255,0.07)',padding:'0 20px',height:'56px',display:'flex',alignItems:'center',justifyContent:'space-between',zIndex:100}}>
        <button onClick={()=>window.location.href='/feed'} style={{background:'none',border:'none',color:'#8892a4',fontSize:'24px',cursor:'pointer'}}>←</button>
        <div style={{fontSize:'16px',fontWeight:'800',background:'linear-gradient(90deg,#00e5ff,#00ff88)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>Create Post</div>
        <button onClick={handlePost} disabled={loading||uploading} style={{background:'linear-gradient(135deg,#00e5ff,#00ff88)',border:'none',borderRadius:'20px',padding:'8px 18px',fontSize:'13px',fontWeight:'700',color:'#070a10',cursor:'pointer',opacity:(loading||uploading)?0.6:1}}>
          {loading ? '...' : 'POST'}
        </button>
      </div>

      <div style={{padding:'76px 16px 20px',maxWidth:'600px',margin:'0 auto'}}>

        {/* Type selector */}
        <div style={{display:'flex',gap:'8px',marginBottom:'20px',overflowX:'auto',paddingBottom:'4px'}}>
          {[
            {type:'text',icon:'✍',label:'Text'},
            {type:'photo',icon:'📷',label:'Photo'},
            {type:'video',icon:'🎥',label:'Video'},
            {type:'capsule',icon:'📦',label:'Capsule'},
            {type:'checkin',icon:'📍',label:'Check-in'},
          ].map(t => (
            <button key={t.type} onClick={()=>{setPostType(t.type);setMediaUrl('');setMediaPreview('');setMessage('')}} style={{
              display:'flex',alignItems:'center',gap:'6px',
              padding:'8px 16px',borderRadius:'20px',
              cursor:'pointer',whiteSpace:'nowrap',fontSize:'13px',fontWeight:'600',
              background:postType===t.type ? 'linear-gradient(135deg,#00e5ff,#00ff88)' : '#111620',
              color:postType===t.type ? '#070a10' : '#4a5568',
              border:postType===t.type ? 'none' : '1px solid rgba(255,255,255,0.07)',
            }}>{t.icon} {t.label}</button>
          ))}
        </div>

        {/* Location */}
        <div style={{display:'flex',alignItems:'center',gap:'10px',background:'rgba(0,229,255,0.06)',border:'1px solid rgba(0,229,255,0.2)',borderRadius:'12px',padding:'12px 16px',marginBottom:'16px'}}>
          <span style={{fontSize:'20px'}}>📍</span>
          <div>
            <div style={{fontSize:'12px',color:'#00e5ff',marginBottom:'2px'}}>Your Location</div>
            <div style={{fontSize:'13px',color:'#8892a4'}}>{locationName || 'Detecting...'}</div>
          </div>
        </div>

        {/* Capsule info */}
        {postType==='capsule' && (
          <div style={{background:'rgba(255,202,40,0.06)',border:'1px solid rgba(255,202,40,0.2)',borderRadius:'12px',padding:'12px 16px',marginBottom:'16px'}}>
            <div style={{fontSize:'13px',color:'#ffca28',fontWeight:'600',marginBottom:'4px'}}>📦 Time Capsule Mode</div>
            <div style={{fontSize:'12px',color:'#4a5568'}}>Only people physically at this location can unlock this. Add a photo + message!</div>
          </div>
        )}

        {/* Media Upload */}
        {showMediaUpload && (
          <div style={{marginBottom:'16px'}}>
            <input
              ref={fileRef}
              type="file"
              accept={acceptType}
              onChange={handleFileUpload}
              style={{display:'none'}}
            />
            {!mediaPreview ? (
              <div onClick={()=>fileRef.current.click()} style={{
                border:'2px dashed rgba(0,229,255,0.3)',borderRadius:'14px',
                padding:'36px',textAlign:'center',cursor:'pointer',
                background:'rgba(0,229,255,0.03)',
              }}>
                <div style={{fontSize:'40px',marginBottom:'8px'}}>
                  {postType==='capsule' ? '📦' : postType==='video' ? '🎥' : '📷'}
                </div>
                <div style={{fontSize:'14px',color:'#00e5ff',fontWeight:'600'}}>
                  Tap to select {postType==='video' ? 'video' : 'photo'}
                </div>
                <div style={{fontSize:'12px',color:'#4a5568',marginTop:'4px'}}>
                  {postType==='video' ? 'MP4, MOV supported' : 'JPG, PNG, GIF supported'}
                </div>
              </div>
            ) : (
              <div style={{position:'relative',borderRadius:'14px',overflow:'hidden'}}>
                {postType==='video'
                  ? <video src={mediaPreview} controls style={{width:'100%',borderRadius:'14px',maxHeight:'300px'}}/>
                  : <img src={mediaPreview} style={{width:'100%',borderRadius:'14px',maxHeight:'300px',objectFit:'cover'}}/>
                }
                <button onClick={()=>{setMediaPreview('');setMediaUrl('');setMessage('')}} style={{
                  position:'absolute',top:'10px',right:'10px',
                  background:'rgba(0,0,0,0.7)',border:'none',borderRadius:'50%',
                  width:'32px',height:'32px',color:'#fff',cursor:'pointer',fontSize:'16px',
                }}>✕</button>
                {uploading && (
                  <div style={{position:'absolute',inset:0,background:'rgba(0,0,0,0.65)',display:'flex',alignItems:'center',justifyContent:'center',gap:'10px',flexDirection:'column'}}>
                    <div style={{color:'#00e5ff',fontSize:'15px',fontWeight:'700'}}>⏳ Uploading...</div>
                    <div style={{color:'#4a5568',fontSize:'12px'}}>Please wait</div>
                  </div>
                )}
                {mediaUrl && !uploading && (
                  <div style={{position:'absolute',bottom:'10px',left:'10px',background:'rgba(0,255,136,0.9)',borderRadius:'6px',padding:'4px 10px',fontSize:'12px',color:'#070a10',fontWeight:'700'}}>✅ Ready to post</div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Text */}
        <textarea
          value={content}
          onChange={e=>setContent(e.target.value)}
          placeholder={
            postType==='capsule' ? '📦 Write a secret message for whoever visits...' :
            postType==='checkin' ? '📍 What are you doing here?' :
            '✍ Share something about this place...'
          }
          style={{width:'100%',minHeight:'130px',background:'#111620',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'14px',padding:'16px',color:'#eef2f7',fontSize:'15px',outline:'none',resize:'none',fontFamily:'inherit',boxSizing:'border-box'}}
        />

        {/* Message */}
        {message && (
          <div style={{background:message.includes('✅')?'rgba(0,255,136,0.1)':'rgba(255,69,96,0.1)',border:`1px solid ${message.includes('✅')?'rgba(0,255,136,0.3)':'rgba(255,69,96,0.3)'}`,borderRadius:'12px',padding:'14px',marginTop:'12px',fontSize:'14px',color:message.includes('✅')?'#00ff88':'#ff4560'}}>
            {message}
          </div>
        )}

        <button onClick={handlePost} disabled={loading||uploading} style={{width:'100%',padding:'16px',marginTop:'16px',background:'linear-gradient(135deg,#00e5ff,#00ff88)',border:'none',borderRadius:'14px',fontSize:'16px',fontWeight:'800',color:'#070a10',cursor:(loading||uploading)?'not-allowed':'pointer',opacity:(loading||uploading)?0.7:1}}>
          {uploading ? '⏳ Uploading...' : loading ? '⏳ Posting...' :
           postType==='capsule' ? '📦 Plant Capsule' :
           postType==='checkin' ? '📍 Check In' : '🚀 Post to Echo World'}
        </button>

      </div>
    </div>
  )
  }
