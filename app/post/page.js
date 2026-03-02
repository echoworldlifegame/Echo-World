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
  const [step, setStep] = useState('select')
  const [postType, setPostType] = useState('photo')
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
  const [sharpness, setSharpness] = useState(0)
  const [blur, setBlur] = useState(0)
  const [hue, setHue] = useState(0)
  const [warmth, setWarmth] = useState(0)
  const [vignette, setVignette] = useState(0)
  const [opacity, setOpacity] = useState(100)
  const [rotation, setRotation] = useState(0)
  const [flipH, setFlipH] = useState(false)
  const [flipV, setFlipV] = useState(false)
  const [filter, setFilter] = useState('none')
  const [textOverlay, setTextOverlay] = useState('')
  const [textColor, setTextColor] = useState('#ffffff')
  const [textSize, setTextSize] = useState(24)
  const [textPosition, setTextPosition] = useState('bottom')
  const [showTextEditor, setShowTextEditor] = useState(false)
  const [activeEditTab, setActiveEditTab] = useState('filters')
  const [trimStart, setTrimStart] = useState(0)
  const [trimEnd, setTrimEnd] = useState(100)
  const [videoDuration, setVideoDuration] = useState(0)
  const [speed, setSpeed] = useState(1)
  const [muted, setMuted] = useState(false)

  const fileInputRef = useRef(null)
  const canvasRef = useRef(null)
  const videoRef = useRef(null)
  const previewVideoRef = useRef(null)

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
          }).catch(()=>{})
      })
    }
  }, [])

  useEffect(() => {
    if (previewVideoRef.current) {
      previewVideoRef.current.playbackRate = speed
      previewVideoRef.current.muted = muted
    }
  }, [speed, muted])

  const handleFileSelect = (e) => {
    const f = e.target.files[0]
    if (!f) return
    setFile(f)
    setFileUrl(URL.createObjectURL(f))
    const isVideo = f.type.startsWith('video')
    setFileType(isVideo ? 'video' : 'photo')
    setPostType(isVideo ? 'video' : 'photo')
    setStep('edit')
  }

  const getFilterCSS = (f) => {
    const filters = {
      none: '',
      warm: 'sepia(0.25) saturate(1.5) hue-rotate(-10deg)',
      cool: 'hue-rotate(20deg) saturate(0.9) brightness(1.05)',
      bw: 'grayscale(1)',
      fade: 'opacity(0.88) brightness(1.1) saturate(0.8)',
      vivid: 'saturate(2) contrast(1.1)',
      drama: 'contrast(1.4) brightness(0.85) saturate(0.7)',
      golden: 'sepia(0.5) saturate(1.8) brightness(1.1)',
      vintage: 'sepia(0.4) contrast(0.85) brightness(0.9) saturate(0.8)',
      neon: 'saturate(3) contrast(1.2) hue-rotate(10deg)',
      matte: 'contrast(0.85) brightness(1.05) saturate(0.75)',
      cinema: 'contrast(1.2) brightness(0.9) sepia(0.1) saturate(1.1)',
    }
    return filters[f] || ''
  }

  const getEditorStyle = () => {
    const baseFilter = `
      brightness(${brightness}%)
      contrast(${contrast}%)
      saturate(${saturation}%)
      hue-rotate(${hue}deg)
      blur(${blur}px)
      opacity(${opacity}%)
      ${getFilterCSS(filter)}
    `
    return {
      filter: baseFilter,
      transform: `rotate(${rotation}deg) scaleX(${flipH?-1:1}) scaleY(${flipV?-1:1})`,
    }
  }

  const resetEdits = () => {
    setBrightness(100); setContrast(100); setSaturation(100)
    setSharpness(0); setBlur(0); setHue(0); setWarmth(0)
    setVignette(0); setOpacity(100); setRotation(0)
    setFlipH(false); setFlipV(false); setFilter('none')
    setTextOverlay(''); setSpeed(1); setMuted(false)
  }

  const handleDownload = () => {
    if (!fileUrl) return
    const a = document.createElement('a')
    a.href = fileUrl
    a.download = `echoworld_${Date.now()}.${fileType==='video'?'mp4':'jpg'}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  const uploadMedia = async () => {
    if (!file) return null
    const formData = new FormData()
    formData.append('file', file)
    formData.append('upload_preset', UPLOAD_PRESET)
    return new Promise((resolve) => {
      const xhr = new XMLHttpRequest()
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) setUploadProgress(Math.round((e.loaded/e.total)*100))
      }
      xhr.onload = () => { const d = JSON.parse(xhr.responseText); resolve(d.secure_url) }
      xhr.onerror = () => resolve(null)
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
    const mediaType = postType === 'capsule' ? 'capsule' : postType === 'checkin' ? 'checkin' : fileType || 'text'
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
    {key:'none',label:'Normal'},{key:'warm',label:'Warm'},{key:'cool',label:'Cool'},
    {key:'bw',label:'B&W'},{key:'fade',label:'Fade'},{key:'vivid',label:'Vivid'},
    {key:'drama',label:'Drama'},{key:'golden',label:'Golden'},{key:'vintage',label:'Vintage'},
    {key:'neon',label:'Neon'},{key:'matte',label:'Matte'},{key:'cinema',label:'Cinema'},
  ]

  const editTabs = [
    {key:'filters',label:'🎨 Filters'},
    {key:'adjust',label:'⚙️ Adjust'},
    {key:'transform',label:'↻ Transform'},
    {key:'text',label:'✏️ Text'},
    ...(fileType==='video'?[{key:'video',label:'🎬 Video'}]:[]),
  ]

  const s = {
    input: {width:'100%',background:'#0c1018',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'12px',padding:'14px 16px',color:'#eef2f7',fontSize:'14px',outline:'none',boxSizing:'border-box',marginBottom:'10px'},
    btn: {width:'100%',padding:'15px',background:'linear-gradient(135deg,#00e5ff,#00ff88)',border:'none',borderRadius:'14px',fontSize:'15px',fontWeight:'800',color:'#070a10',cursor:'pointer'},
    card: {background:'#111620',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'16px',padding:'16px'},
  }

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
            {type:'photo',icon:'📷',label:'Photo',desc:'Share a photo'},
            {type:'video',icon:'⚡',label:'ECHO Video',desc:'Short vertical video'},
            {type:'text',icon:'✏️',label:'Text Post',desc:'Share your thoughts'},
            {type:'capsule',icon:'📦',label:'Time Capsule',desc:'Hidden until visited'},
            {type:'checkin',icon:'📍',label:'Check-in',desc:'Mark your location'},
          ].map(t => (
            <div key={t.type} onClick={()=>{
              if (t.type==='photo'||t.type==='video') { setPostType(t.type); fileInputRef.current?.click() }
              else { setPostType(t.type); setStep('details') }
            }} style={{background:'#111620',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'16px',padding:'20px',cursor:'pointer',textAlign:'center'}}>
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
        <div style={{fontSize:'15px',fontWeight:'700'}}>{fileType==='video'?'🎬 Edit Video':'📷 Edit Photo'}</div>
        <button onClick={()=>setStep('details')} style={{background:'linear-gradient(135deg,#00e5ff,#00ff88)',border:'none',borderRadius:'20px',padding:'8px 18px',fontSize:'13px',fontWeight:'700',color:'#070a10',cursor:'pointer'}}>Next →</button>
      </div>

      <div style={{paddingTop:'56px'}}>
        {/* PREVIEW */}
        <div style={{width:'100%',background:'#000',display:'flex',alignItems:'center',justifyContent:'center',position:'relative',overflow:'hidden'}}>
          {fileType==='photo' ? (
            <div style={{position:'relative',width:'100%'}}>
              <img src={fileUrl} style={{width:'100%',maxHeight:'55vh',objectFit:'contain',display:'block',...getEditorStyle()}}/>
              {/* Vignette overlay */}
              {vignette > 0 && (
                <div style={{position:'absolute',inset:0,background:`radial-gradient(ellipse at center, transparent ${100-vignette}%, rgba(0,0,0,${vignette/100}) 100%)`,pointerEvents:'none'}}/>
              )}
              {/* Text overlay */}
              {textOverlay && (
                <div style={{position:'absolute',left:'50%',transform:'translateX(-50%)',
                  top:textPosition==='top'?'10px':textPosition==='middle'?'50%':'auto',
                  bottom:textPosition==='bottom'?'10px':'auto',
                  marginTop:textPosition==='middle'?'-20px':'0',
                  color:textColor,fontSize:`${textSize}px`,fontWeight:'800',
                  textShadow:'2px 2px 4px rgba(0,0,0,0.8)',textAlign:'center',
                  whiteSpace:'nowrap',padding:'4px 12px',pointerEvents:'none'}}>
                  {textOverlay}
                </div>
              )}
            </div>
          ) : (
            <div style={{position:'relative',width:'100%'}}>
              <video ref={previewVideoRef} src={fileUrl} style={{width:'100%',maxHeight:'55vh',objectFit:'contain',display:'block',...getEditorStyle()}}
                controls playsInline loop/>
              {textOverlay && (
                <div style={{position:'absolute',left:'50%',transform:'translateX(-50%)',
                  top:textPosition==='top'?'10px':textPosition==='middle'?'50%':'auto',
                  bottom:textPosition==='bottom'?'10px':'auto',
                  color:textColor,fontSize:`${textSize}px`,fontWeight:'800',
                  textShadow:'2px 2px 4px rgba(0,0,0,0.8)',textAlign:'center',whiteSpace:'nowrap',
                  padding:'4px 12px',pointerEvents:'none'}}>
                  {textOverlay}
                </div>
              )}
            </div>
          )}
        </div>

        {/* EDIT TABS */}
        <div style={{display:'flex',gap:'0',borderBottom:'1px solid rgba(255,255,255,0.07)',overflowX:'auto',scrollbarWidth:'none'}}>
          {editTabs.map(t => (
            <button key={t.key} onClick={()=>setActiveEditTab(t.key)} style={{padding:'10px 14px',border:'none',cursor:'pointer',fontSize:'12px',fontWeight:'700',whiteSpace:'nowrap',flexShrink:0,background:'transparent',color:activeEditTab===t.key?'#00e5ff':'#4a5568',borderBottom:activeEditTab===t.key?'2px solid #00e5ff':'2px solid transparent'}}>
              {t.label}
            </button>
          ))}
        </div>

        <div style={{padding:'16px'}}>

          {/* FILTERS TAB */}
          {activeEditTab==='filters' && (
            <div>
              <div style={{display:'flex',gap:'8px',overflowX:'auto',paddingBottom:'8px',scrollbarWidth:'none'}}>
                {filters.map(f => (
                  <div key={f.key} onClick={()=>setFilter(f.key)} style={{flexShrink:0,textAlign:'center',cursor:'pointer'}}>
                    <div style={{width:'64px',height:'64px',borderRadius:'12px',overflow:'hidden',border:`2px solid ${filter===f.key?'#00e5ff':'transparent'}`,marginBottom:'4px'}}>
                      <img src={fileType==='photo'?fileUrl:'/placeholder.jpg'} style={{width:'100%',height:'100%',objectFit:'cover',filter:getFilterCSS(f.key)}} onError={e=>e.target.style.display='none'}/>
                      {fileType==='video' && <div style={{width:'100%',height:'100%',background:'#1a2030',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'20px'}}>🎬</div>}
                    </div>
                    <div style={{fontSize:'10px',color:filter===f.key?'#00e5ff':'#4a5568',fontWeight:'600'}}>{f.label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ADJUST TAB */}
          {activeEditTab==='adjust' && (
            <div>
              {[
                {label:'☀️ Brightness',value:brightness,setter:setBrightness,min:0,max:200,unit:'%'},
                {label:'◑ Contrast',value:contrast,setter:setContrast,min:0,max:200,unit:'%'},
                {label:'🎨 Saturation',value:saturation,setter:setSaturation,min:0,max:200,unit:'%'},
                {label:'🔆 Highlights',value:opacity,setter:setOpacity,min:50,max:100,unit:'%'},
                {label:'🌈 Hue',value:hue,setter:setHue,min:-180,max:180,unit:'°'},
                {label:'💧 Blur',value:blur,setter:setBlur,min:0,max:10,unit:'px'},
                {label:'🌑 Vignette',value:vignette,setter:setVignette,min:0,max:80,unit:'%'},
              ].map(adj => (
                <div key={adj.label} style={{marginBottom:'14px'}}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:'6px'}}>
                    <span style={{fontSize:'12px',color:'#8892a4'}}>{adj.label}</span>
                    <span style={{fontSize:'12px',color:'#00e5ff',fontWeight:'600'}}>{adj.value}{adj.unit}</span>
                  </div>
                  <input type="range" min={adj.min} max={adj.max} value={adj.value}
                    onChange={e=>adj.setter(Number(e.target.value))}
                    style={{width:'100%',accentColor:'#00e5ff',height:'4px'}}/>
                </div>
              ))}
            </div>
          )}

          {/* TRANSFORM TAB */}
          {activeEditTab==='transform' && (
            <div>
              <div style={{marginBottom:'20px'}}>
                <div style={{fontSize:'12px',color:'#4a5568',fontWeight:'600',marginBottom:'10px'}}>ROTATION</div>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:'6px'}}>
                  <span style={{fontSize:'12px',color:'#8892a4'}}>↻ Rotate</span>
                  <span style={{fontSize:'12px',color:'#00e5ff',fontWeight:'600'}}>{rotation}°</span>
                </div>
                <input type="range" min={-180} max={180} value={rotation}
                  onChange={e=>setRotation(Number(e.target.value))}
                  style={{width:'100%',accentColor:'#00e5ff'}}/>
              </div>

              <div style={{marginBottom:'20px'}}>
                <div style={{fontSize:'12px',color:'#4a5568',fontWeight:'600',marginBottom:'10px'}}>FLIP</div>
                <div style={{display:'flex',gap:'10px'}}>
                  <button onClick={()=>setFlipH(!flipH)} style={{flex:1,padding:'12px',borderRadius:'12px',border:`2px solid ${flipH?'#00e5ff':'rgba(255,255,255,0.07)'}`,background:flipH?'rgba(0,229,255,0.1)':'rgba(255,255,255,0.03)',color:flipH?'#00e5ff':'#4a5568',fontSize:'13px',fontWeight:'700',cursor:'pointer'}}>
                    ↔ Flip Horizontal
                  </button>
                  <button onClick={()=>setFlipV(!flipV)} style={{flex:1,padding:'12px',borderRadius:'12px',border:`2px solid ${flipV?'#00e5ff':'rgba(255,255,255,0.07)'}`,background:flipV?'rgba(0,229,255,0.1)':'rgba(255,255,255,0.03)',color:flipV?'#00e5ff':'#4a5568',fontSize:'13px',fontWeight:'700',cursor:'pointer'}}>
                    ↕ Flip Vertical
                  </button>
                </div>
              </div>

              <div style={{display:'flex',gap:'8px',flexWrap:'wrap'}}>
                {[0,90,180,270].map(r => (
                  <button key={r} onClick={()=>setRotation(r)} style={{padding:'8px 16px',borderRadius:'10px',border:`1px solid ${rotation===r?'#00e5ff':'rgba(255,255,255,0.07)'}`,background:rotation===r?'rgba(0,229,255,0.1)':'rgba(255,255,255,0.03)',color:rotation===r?'#00e5ff':'#4a5568',fontSize:'12px',cursor:'pointer'}}>
                    {r}°
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* TEXT TAB */}
          {activeEditTab==='text' && (
            <div>
              <div style={{marginBottom:'14px'}}>
                <div style={{fontSize:'12px',color:'#4a5568',fontWeight:'600',marginBottom:'8px'}}>TEXT</div>
                <input
                  placeholder="Add text to your media..."
                  value={textOverlay}
                  onChange={e=>setTextOverlay(e.target.value)}
                  style={{width:'100%',background:'#0c1018',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'12px',padding:'12px 14px',color:'#eef2f7',fontSize:'14px',outline:'none',boxSizing:'border-box'}}
                />
              </div>

              <div style={{marginBottom:'14px'}}>
                <div style={{fontSize:'12px',color:'#4a5568',fontWeight:'600',marginBottom:'8px'}}>TEXT COLOR</div>
                <div style={{display:'flex',gap:'8px',flexWrap:'wrap'}}>
                  {['#ffffff','#000000','#00e5ff','#00ff88','#ff4560','#ffca28','#ffa500','#ff69b4','#9c27b0'].map(c => (
                    <div key={c} onClick={()=>setTextColor(c)} style={{width:'32px',height:'32px',borderRadius:'50%',background:c,border:`3px solid ${textColor===c?'#fff':'transparent'}`,cursor:'pointer'}}/>
                  ))}
                </div>
              </div>

              <div style={{marginBottom:'14px'}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:'6px'}}>
                  <span style={{fontSize:'12px',color:'#8892a4'}}>📏 Text Size</span>
                  <span style={{fontSize:'12px',color:'#00e5ff',fontWeight:'600'}}>{textSize}px</span>
                </div>
                <input type="range" min={12} max={60} value={textSize}
                  onChange={e=>setTextSize(Number(e.target.value))}
                  style={{width:'100%',accentColor:'#00e5ff'}}/>
              </div>

              <div>
                <div style={{fontSize:'12px',color:'#4a5568',fontWeight:'600',marginBottom:'8px'}}>TEXT POSITION</div>
                <div style={{display:'flex',gap:'8px'}}>
                  {['top','middle','bottom'].map(pos => (
                    <button key={pos} onClick={()=>setTextPosition(pos)} style={{flex:1,padding:'10px',borderRadius:'10px',border:`2px solid ${textPosition===pos?'#00e5ff':'rgba(255,255,255,0.07)'}`,background:textPosition===pos?'rgba(0,229,255,0.1)':'rgba(255,255,255,0.03)',color:textPosition===pos?'#00e5ff':'#4a5568',fontSize:'12px',fontWeight:'600',cursor:'pointer',textTransform:'capitalize'}}>
                      {pos==='top'?'⬆ Top':pos==='middle'?'⬛ Middle':'⬇ Bottom'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* VIDEO TAB */}
          {activeEditTab==='video' && fileType==='video' && (
            <div>
              <div style={{marginBottom:'20px'}}>
                <div style={{fontSize:'12px',color:'#4a5568',fontWeight:'600',marginBottom:'10px'}}>🎚 PLAYBACK SPEED</div>
                <div style={{display:'flex',gap:'8px'}}>
                  {[0.25,0.5,0.75,1,1.25,1.5,2,3].map(s => (
                    <button key={s} onClick={()=>setSpeed(s)} style={{flex:1,padding:'8px 4px',borderRadius:'8px',border:`2px solid ${speed===s?'#00e5ff':'rgba(255,255,255,0.07)'}`,background:speed===s?'rgba(0,229,255,0.1)':'rgba(255,255,255,0.03)',color:speed===s?'#00e5ff':'#4a5568',fontSize:'10px',fontWeight:'700',cursor:'pointer'}}>
                      {s}x
                    </button>
                  ))}
                </div>
              </div>

              <div style={{marginBottom:'20px'}}>
                <div style={{fontSize:'12px',color:'#4a5568',fontWeight:'600',marginBottom:'10px'}}>🔊 AUDIO</div>
                <button onClick={()=>setMuted(!muted)} style={{width:'100%',padding:'12px',borderRadius:'12px',border:`2px solid ${muted?'#ff4560':'rgba(255,255,255,0.07)'}`,background:muted?'rgba(255,69,96,0.1)':'rgba(255,255,255,0.03)',color:muted?'#ff4560':'#4a5568',fontSize:'13px',fontWeight:'700',cursor:'pointer'}}>
                  {muted?'🔇 Muted (tap to unmute)':'🔊 Audio On (tap to mute)'}
                </button>
              </div>

              <div style={{background:'rgba(0,229,255,0.04)',border:'1px solid rgba(0,229,255,0.1)',borderRadius:'12px',padding:'12px',marginBottom:'16px'}}>
                <div style={{fontSize:'12px',color:'#4a5568',lineHeight:'1.6'}}>
                  💡 More advanced video editing (trim, crop, transitions) available after upload via Cloudinary.
                </div>
              </div>
            </div>
          )}

          {/* Reset + Download */}
          <div style={{display:'flex',gap:'10px',marginTop:'16px'}}>
            <button onClick={resetEdits} style={{flex:1,padding:'11px',background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'12px',color:'#8892a4',fontSize:'13px',cursor:'pointer'}}>
              ↺ Reset
            </button>
            <button onClick={handleDownload} style={{flex:1,padding:'11px',background:'rgba(0,229,255,0.1)',border:'1px solid rgba(0,229,255,0.2)',borderRadius:'12px',color:'#00e5ff',fontSize:'13px',fontWeight:'700',cursor:'pointer'}}>
              ⬇ Download
            </button>
          </div>
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
          {uploading?`${uploadProgress}%`:'Post ✓'}
        </button>
      </div>

      <div style={{padding:'72px 16px 40px'}}>
        {fileUrl && (
          <div style={{marginBottom:'16px',borderRadius:'14px',overflow:'hidden',maxHeight:'220px',background:'#000',position:'relative'}}>
            {fileType==='photo'
              ? <img src={fileUrl} style={{width:'100%',maxHeight:'220px',objectFit:'cover',...getEditorStyle()}}/>
              : <video src={fileUrl} style={{width:'100%',maxHeight:'220px',objectFit:'cover'}} playsInline muted/>
            }
            {textOverlay && (
              <div style={{position:'absolute',left:'50%',transform:'translateX(-50%)',
                top:textPosition==='top'?'10px':textPosition==='middle'?'45%':'auto',
                bottom:textPosition==='bottom'?'10px':'auto',
                color:textColor,fontSize:`${Math.min(textSize,20)}px`,fontWeight:'800',
                textShadow:'2px 2px 4px rgba(0,0,0,0.8)',whiteSpace:'nowrap',pointerEvents:'none'}}>
                {textOverlay}
              </div>
            )}
          </div>
        )}

        <div style={{display:'flex',gap:'8px',marginBottom:'14px',flexWrap:'wrap'}}>
          {['photo','video','text','capsule','checkin'].map(t => (
            <div key={t} onClick={()=>setPostType(t)} style={{padding:'6px 12px',borderRadius:'20px',fontSize:'11px',fontWeight:'600',cursor:'pointer',background:postType===t?'linear-gradient(135deg,#00e5ff,#00ff88)':'rgba(255,255,255,0.05)',color:postType===t?'#070a10':'#4a5568'}}>
              {t==='photo'?'📷':t==='video'?'⚡':t==='text'?'✏️':t==='capsule'?'📦':'📍'}
            </div>
          ))}
        </div>

        <textarea placeholder="Write a caption..." value={content} onChange={e=>setContent(e.target.value)}
          style={{width:'100%',background:'#111620',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'14px',padding:'14px',color:'#eef2f7',fontSize:'14px',resize:'none',minHeight:'90px',outline:'none',boxSizing:'border-box',lineHeight:'1.6',marginBottom:'10px'}}/>

        <input placeholder="#hashtags" value={hashtags} onChange={e=>setHashtags(e.target.value)}
          style={{...s.input,color:'#00e5ff'}}/>

        <div style={{background:'#111620',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'14px',padding:'12px 14px',marginBottom:'10px',display:'flex',alignItems:'center',gap:'10px'}}>
          <span>📍</span>
          <input placeholder="Location..." value={locationName} onChange={e=>setLocationName(e.target.value)}
            style={{flex:1,background:'none',border:'none',color:'#00e5ff',fontSize:'13px',outline:'none'}}/>
        </div>

        <div style={{background:'#111620',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'14px',padding:'12px 14px',marginBottom:'16px'}}>
          <div style={{fontSize:'12px',color:'#4a5568',marginBottom:'8px',fontWeight:'600'}}>PRIVACY</div>
          <div style={{display:'flex',gap:'8px'}}>
            {[{key:'public',label:'🌍 Public'},{key:'friends',label:'👥 Supporters'},{key:'private',label:'🔒 Only Me'}].map(p => (
              <button key={p.key} onClick={()=>setPrivacy(p.key)} style={{flex:1,padding:'8px',borderRadius:'10px',border:'none',cursor:'pointer',fontSize:'11px',fontWeight:'600',background:privacy===p.key?'linear-gradient(135deg,#00e5ff,#00ff88)':'rgba(255,255,255,0.05)',color:privacy===p.key?'#070a10':'#4a5568'}}>
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {uploading && (
          <div style={{background:'#111620',borderRadius:'12px',padding:'14px',marginBottom:'14px'}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:'8px'}}>
              <span style={{fontSize:'13px',color:'#8892a4'}}>Uploading...</span>
              <span style={{fontSize:'13px',color:'#00e5ff',fontWeight:'700'}}>{uploadProgress}%</span>
            </div>
            <div style={{height:'4px',background:'rgba(255,255,255,0.05)',borderRadius:'2px'}}>
              <div style={{height:'100%',width:`${uploadProgress}%`,background:'linear-gradient(90deg,#00e5ff,#00ff88)',borderRadius:'2px',transition:'width 0.3s'}}/>
            </div>
          </div>
        )}

        <div style={{display:'flex',gap:'10px'}}>
          <button onClick={handleDownload} style={{flex:1,padding:'14px',background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'14px',color:'#8892a4',fontSize:'14px',fontWeight:'700',cursor:'pointer'}}>
            ⬇ Download
          </button>
          <button onClick={handlePost} disabled={uploading} style={{flex:2,padding:'14px',background:'linear-gradient(135deg,#00e5ff,#00ff88)',border:'none',borderRadius:'14px',fontSize:'15px',fontWeight:'800',color:'#070a10',cursor:'pointer',opacity:uploading?0.6:1}}>
            {uploading?`Uploading ${uploadProgress}%...`:postType==='capsule'?'📦 Drop Capsule':'📸 Post Now'}
          </button>
        </div>
      </div>
    </div>
  )
    }
