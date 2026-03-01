'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const CLOUD_NAME = 'dbguxwpa8'
const UPLOAD_PRESET = 'echoworld_preset'

export default function Post() {
  const [user, setUser] = useState(null)
  const [step, setStep] = useState('select') // select | edit | details
  const [postType, setPostType] = useState('text')
  const [file, setFile] = useState(null)
  const [fileUrl, setFileUrl] = useState(null)
  const [fileType, setFileType] = useState(null)
  const [content, setContent] = useState('')
  const [hashtags, setHashtags] = useState('')
  const [locationName, setLocationName] = useState('')
  const [latitude, setLatitude] = useState(null)
  const [longitude, setLongitude] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [privacy, setPrivacy] = useState('public')

  // Editor states
  const [brightness, setBrightness] = useState(100)
  const [contrast, setContrast] = useState(100)
  const [saturation, setSaturation] = useState(100)
  const [filter, setFilter] = useState('none')

  const fileInputRef = useRef(null)
  const canvasRef = useRef(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) { window.location.href = '/'; return }
      setUser(data.session.user)
    })
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(pos => {
        setLatitude(pos.coords.latitude)
        setLongitude(pos.coords.longitude)
        fetch(`https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json`)
          .then(r => r.json())
          .then(d => {
            const addr = d.address
            setLocationName(addr?.suburb || addr?.neighbourhood || addr?.city || addr?.town || '')
          })
      })
    }
  }, [])

  const handleFileSelect = (e) => {
    const f = e.target.files[0]
    if (!f) return
    setFile(f)
    setFileUrl(URL.createObjectURL(f))
    setFileType(f.type.startsWith('video') ? 'video' : 'photo')
    setPostType(f.type.startsWith('video') ? 'video' : 'photo')
    setStep('edit')
  }

  const getFilterStyle = () => {
    const filters = {
      none: '',
      warm: 'sepia(0.3) saturate(1.4)',
      cool: 'hue-rotate(30deg) saturate(0.9)',
      bw: 'grayscale(1)',
      fade: 'opacity(0.85) brightness(1.1)',
      vivid: 'saturate(1.8) contrast(1.1)',
      drama: 'contrast(1.3) brightness(0.9) saturate(0.8)',
    }
    return `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) ${filters[filter]||''}`
  }

  const uploadMedia = async () => {
    if (!file) return null
    setUploading(true)
    setUploadProgress(0)

    const formData = new FormData()
    formData.append('file', file)
    formData.append('upload_preset', UPLOAD_PRESET)

    return new Promise((resolve) => {
      const xhr = new XMLHttpRequest()
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) setUploadProgress(Math.round((e.loaded/e.total)*100))
      }
      xhr.onload = () => {
        const data = JSON.parse(xhr.responseText)
        setUploading(false)
        resolve(data.secure_url)
      }
      xhr.onerror = () => { setUploading(false); resolve(null) }
      xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`)
      xhr.send(formData)
    })
  }

  const handlePost = async () => {
    if (!user) return
    if (!content && !file && postType !== 'capsule') return

    setUploading(true)
    let mediaUrl = null

    if (file) {
      mediaUrl = await uploadMedia()
      if (!mediaUrl) { alert('Upload failed'); setUploading(false); return }
    }

    const mediaType = postType === 'capsule' ? 'capsule' :
                      postType === 'checkin' ? 'checkin' :
                      fileType || 'text'

    const { error } = await supabase.from('posts').insert({
      user_id: user.id,
      content,
      media_url: mediaUrl,
      media_type: mediaType,
      location_name: locationName,
      latitude,
      longitude,
      hashtags,
      privacy,
      post_format: postType === 'video' ? 'echo' : 'full',
    })

    setUploading(false)
    if (!error) window.location.href = '/feed'
    else alert('Post failed: ' + error.message)
  }

  const filters = [
    {key:'none', label:'Normal'},
    {key:'warm', label:'Warm'},
    {key:'cool', label:'Cool'},
    {key:'bw', label:'B&W'},
    {key:'fade', label:'Fade'},
    {key:'vivid', label:'Vivid'},
    {key:'drama', label:'Drama'},
  ]

  // STEP: SELECT
  if (step === 'select') return (
    <div style={{minHeight:'100vh',background:'#070a10',color:'#eef2f7'}}>
      <div style={{position:'fixed',top:0,left:0,right:0,background:'rgba(7,10,16,0.97)',borderBottom:'1px solid rgba(255,255,255,0.07)',padding:'0 16px',height:'56px',display:'flex',alignItems:'center',justifyContent:'space-between',zIndex:100}}>
        <button onClick={()=>window.location.href='/feed'} style={{background:'none',border:'none',color:'#8892a4',fontSize:'24px',cursor:'pointer'}}>←</button>
        <div style={{fontSize:'16px',fontWeight:'700'}}>Create Post</div>
        <div style={{width:'40px'}}/>
      </div>

      <div style={{padding:'80px 16px 40px'}}>
        <div style={{fontSize:'13px',color:'#4a5568',marginBottom:'16px',textAlign:'center'}}>What do you want to share?</div>

        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px',marginBottom:'24px'}}>
          {[
            {type:'photo', icon:'📷', label:'Photo', desc:'Share a photo'},
            {type:'video', icon:'⚡', label:'ECHO Video', desc:'Short vertical video'},
            {type:'text', icon:'✏️', label:'Text Post', desc:'Share your thoughts'},
            {type:'capsule', icon:'📦', label:'Time Capsule', desc:'Hidden until visited'},
            {type:'checkin', icon:'📍', label:'Check-in', desc:'Mark your location'},
          ].map(t => (
            <div key={t.type}
              onClick={()=>{
                if (t.type === 'photo' || t.type === 'video') {
                  setPostType(t.type)
                  fileInputRef.current?.click()
                } else {
                  setPostType(t.type)
                  setStep('details')
                }
              }}
              style={{background:'#111620',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'16px',padding:'20px',cursor:'pointer',textAlign:'center'}}>
              <div style={{fontSize:'32px',marginBottom:'8px'}}>{t.icon}</div>
              <div style={{fontSize:'14px',fontWeight:'700',marginBottom:'4px'}}>{t.label}</div>
              <div style={{fontSize:'11px',color:'#4a5568'}}>{t.desc}</div>
            </div>
          ))}
        </div>

        <input ref={fileInputRef} type="file" accept="image/*,video/*" onChange={handleFileSelect} style={{display:'none'}}/>
      </div>
    </div>
  )

  // STEP: EDIT
  if (step === 'edit') return (
    <div style={{minHeight:'100vh',background:'#070a10',color:'#eef2f7'}}>
      <div style={{position:'fixed',top:0,left:0,right:0,background:'rgba(7,10,16,0.97)',borderBottom:'1px solid rgba(255,255,255,0.07)',padding:'0 16px',height:'56px',display:'flex',alignItems:'center',justifyContent:'space-between',zIndex:100}}>
        <button onClick={()=>setStep('select')} style={{background:'none',border:'none',color:'#8892a4',fontSize:'24px',cursor:'pointer'}}>←</button>
        <div style={{fontSize:'16px',fontWeight:'700'}}>
          {fileType === 'video' ? '⚡ Edit Video' : '📷 Edit Photo'}
        </div>
        <button onClick={()=>setStep('details')} style={{background:'linear-gradient(135deg,#00e5ff,#00ff88)',border:'none',borderRadius:'20px',padding:'8px 18px',fontSize:'13px',fontWeight:'700',color:'#070a10',cursor:'pointer'}}>
          Next →
        </button>
      </div>

      <div style={{paddingTop:'56px'}}>
        {/* Preview */}
        <div style={{width:'100%',maxHeight:'60vw',overflow:'hidden',background:'#000',display:'flex',alignItems:'center',justifyContent:'center',minHeight:'300px'}}>
          {fileType === 'photo' ? (
            <img src={fileUrl} style={{width:'100%',maxHeight:'60vh',objectFit:'contain',filter:getFilterStyle()}}/>
          ) : (
            <video src={fileUrl} style={{width:'100%',maxHeight:'60vh',objectFit:'contain',filter:getFilterStyle()}} controls playsInline/>
          )}
        </div>

        <div style={{padding:'16px'}}>
          {/* Filters — photo only */}
          {fileType === 'photo' && (
            <div style={{marginBottom:'20px'}}>
              <div style={{fontSize:'12px',color:'#4a5568',fontWeight:'700',marginBottom:'10px'}}>FILTERS</div>
              <div style={{display:'flex',gap:'8px',overflowX:'auto',paddingBottom:'6px',scrollbarWidth:'none'}}>
                {filters.map(f => (
                  <div key={f.key} onClick={()=>setFilter(f.key)} style={{flexShrink:0,textAlign:'center',cursor:'pointer'}}>
                    <div style={{width:'60px',height:'60px',borderRadius:'10px',overflow:'hidden',border:`2px solid ${filter===f.key?'#00e5ff':'transparent'}`,marginBottom:'4px'}}>
                      <img src={fileUrl} style={{width:'100%',height:'100%',objectFit:'cover',filter:`brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) ${f.key==='warm'?'sepia(0.3) saturate(1.4)':f.key==='cool'?'hue-rotate(30deg)':f.key==='bw'?'grayscale(1)':f.key==='fade'?'opacity(0.85) brightness(1.1)':f.key==='vivid'?'saturate(1.8)':f.key==='drama'?'contrast(1.3) brightness(0.9)':''}`}}/>
                    </div>
                    <div style={{fontSize:'9px',color:filter===f.key?'#00e5ff':'#4a5568',fontWeight:'600'}}>{f.label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Adjustments */}
          <div style={{marginBottom:'16px'}}>
            <div style={{fontSize:'12px',color:'#4a5568',fontWeight:'700',marginBottom:'12px'}}>ADJUSTMENTS</div>
            {[
              {label:'☀️ Brightness', value:brightness, setter:setBrightness, min:50, max:150},
              {label:'◑ Contrast', value:contrast, setter:setContrast, min:50, max:150},
              {label:'🎨 Saturation', value:saturation, setter:setSaturation, min:0, max:200},
            ].map(adj => (
              <div key={adj.label} style={{marginBottom:'14px'}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:'6px'}}>
                  <span style={{fontSize:'12px',color:'#8892a4'}}>{adj.label}</span>
                  <span style={{fontSize:'12px',color:'#00e5ff',fontWeight:'600'}}>{adj.value}%</span>
                </div>
                <input
                  type="range" min={adj.min} max={adj.max} value={adj.value}
                  onChange={e=>adj.setter(Number(e.target.value))}
                  style={{width:'100%',accentColor:'#00e5ff'}}
                />
              </div>
            ))}
          </div>

          {/* Reset */}
          <button onClick={()=>{setBrightness(100);setContrast(100);setSaturation(100);setFilter('none')}} style={{width:'100%',padding:'10px',background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'10px',color:'#8892a4',fontSize:'13px',cursor:'pointer'}}>
            ↺ Reset
          </button>
        </div>
      </div>
    </div>
  )

  // STEP: DETAILS
  return (
    <div style={{minHeight:'100vh',background:'#070a10',color:'#eef2f7'}}>
      <div style={{position:'fixed',top:0,left:0,right:0,background:'rgba(7,10,16,0.97)',borderBottom:'1px solid rgba(255,255,255,0.07)',padding:'0 16px',height:'56px',display:'flex',alignItems:'center',justifyContent:'space-between',zIndex:100}}>
        <button onClick={()=>file?setStep('edit'):window.location.href='/feed'} style={{background:'none',border:'none',color:'#8892a4',fontSize:'24px',cursor:'pointer'}}>←</button>
        <div style={{fontSize:'16px',fontWeight:'700'}}>Post Details</div>
        <button onClick={handlePost} disabled={uploading} style={{background:'linear-gradient(135deg,#00e5ff,#00ff88)',border:'none',borderRadius:'20px',padding:'8px 18px',fontSize:'13px',fontWeight:'700',color:'#070a10',cursor:'pointer',opacity:uploading?0.6:1}}>
          {uploading ? `${uploadProgress}%` : 'Post ✓'}
        </button>
      </div>

      <div style={{padding:'72px 16px 40px'}}>

        {/* Preview thumbnail */}
        {fileUrl && (
          <div style={{marginBottom:'16px',borderRadius:'14px',overflow:'hidden',maxHeight:'200px',background:'#000'}}>
            {fileType==='photo'
              ? <img src={fileUrl} style={{width:'100%',maxHeight:'200px',objectFit:'cover',filter:getFilterStyle()}}/>
              : <video src={fileUrl} style={{width:'100%',maxHeight:'200px',objectFit:'cover'}} playsInline muted/>
            }
          </div>
        )}

        {/* Post type badge */}
        <div style={{display:'flex',gap:'8px',marginBottom:'16px'}}>
          {[
            {type:'photo',icon:'📷'},
            {type:'video',icon:'⚡'},
            {type:'text',icon:'✏️'},
            {type:'capsule',icon:'📦'},
            {type:'checkin',icon:'📍'},
          ].map(t => (
            <div key={t.type} style={{padding:'6px 12px',borderRadius:'20px',fontSize:'12px',fontWeight:'600',cursor:'pointer',background:postType===t.type?'linear-gradient(135deg,#00e5ff,#00ff88)':'rgba(255,255,255,0.05)',color:postType===t.type?'#070a10':'#4a5568'}}
              onClick={()=>setPostType(t.type)}>
              {t.icon}
            </div>
          ))}
        </div>

        {/* Caption */}
        <textarea
          placeholder={postType==='capsule'?'What\'s inside your time capsule?':postType==='checkin'?'What are you doing here?':'Write a caption...'}
          value={content}
          onChange={e=>setContent(e.target.value)}
          style={{width:'100%',background:'#111620',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'14px',padding:'14px',color:'#eef2f7',fontSize:'14px',resize:'none',minHeight:'100px',outline:'none',boxSizing:'border-box',lineHeight:'1.6'}}
        />

        {/* Hashtags */}
        <input
          placeholder="#hashtags"
          value={hashtags}
          onChange={e=>setHashtags(e.target.value)}
          style={{width:'100%',background:'#111620',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'14px',padding:'12px 14px',color:'#00e5ff',fontSize:'14px',outline:'none',marginTop:'10px',boxSizing:'border-box'}}
        />

        {/* Location */}
        <div style={{background:'#111620',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'14px',padding:'12px 14px',marginTop:'10px',display:'flex',alignItems:'center',gap:'10px'}}>
          <span style={{fontSize:'16px'}}>📍</span>
          <input
            placeholder="Location..."
            value={locationName}
            onChange={e=>setLocationName(e.target.value)}
            style={{flex:1,background:'none',border:'none',color:'#00e5ff',fontSize:'13px',outline:'none'}}
          />
        </div>

        {/* Privacy */}
        <div style={{background:'#111620',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'14px',padding:'12px 14px',marginTop:'10px'}}>
          <div style={{fontSize:'12px',color:'#4a5568',marginBottom:'8px',fontWeight:'600'}}>PRIVACY</div>
          <div style={{display:'flex',gap:'8px'}}>
            {[
              {key:'public',label:'🌍 Public'},
              {key:'friends',label:'👥 Supporters'},
              {key:'private',label:'🔒 Only Me'},
            ].map(p => (
              <button key={p.key} onClick={()=>setPrivacy(p.key)} style={{flex:1,padding:'8px',borderRadius:'10px',border:'none',cursor:'pointer',fontSize:'11px',fontWeight:'600',background:privacy===p.key?'linear-gradient(135deg,#00e5ff,#00ff88)':'rgba(255,255,255,0.05)',color:privacy===p.key?'#070a10':'#4a5568'}}>
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Upload progress */}
        {uploading && (
          <div style={{marginTop:'16px',background:'#111620',borderRadius:'12px',padding:'14px'}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:'8px'}}>
              <span style={{fontSize:'13px',color:'#8892a4'}}>Uploading...</span>
              <span style={{fontSize:'13px',color:'#00e5ff',fontWeight:'700'}}>{uploadProgress}%</span>
            </div>
            <div style={{height:'4px',background:'rgba(255,255,255,0.05)',borderRadius:'2px'}}>
              <div style={{height:'100%',width:`${uploadProgress}%`,background:'linear-gradient(90deg,#00e5ff,#00ff88)',borderRadius:'2px',transition:'width 0.3s'}}/>
            </div>
          </div>
        )}

        {/* Post button */}
        <button onClick={handlePost} disabled={uploading} style={{width:'100%',marginTop:'20px',padding:'16px',background:'linear-gradient(135deg,#00e5ff,#00ff88)',border:'none',borderRadius:'14px',fontSize:'16px',fontWeight:'800',color:'#070a10',cursor:'pointer',opacity:uploading?0.6:1}}>
          {uploading ? `Uploading ${uploadProgress}%...` : postType==='capsule'?'📦 Drop Capsule':'📸 Post Now'}
        </button>
      </div>
    </div>
  )
                                    }
