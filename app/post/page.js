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
  const [files, setFiles] = useState([])
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
  const [activeEditTab, setActiveEditTab] = useState('filters')

  // Basic adjustments
  const [brightness, setBrightness] = useState(100)
  const [contrast, setContrast] = useState(100)
  const [saturation, setSaturation] = useState(100)
  const [hue, setHue] = useState(0)
  const [blur, setBlur] = useState(0)
  const [opacity, setOpacity] = useState(100)
  const [vignette, setVignette] = useState(0)
  const [rotation, setRotation] = useState(0)
  const [flipH, setFlipH] = useState(false)
  const [flipV, setFlipV] = useState(false)
  const [filter, setFilter] = useState('none')
  const [scale, setScale] = useState(100)

  // Advanced adjustments
  const [shadows, setShadows] = useState(0)
  const [highlights, setHighlights] = useState(0)
  const [temperature, setTemperature] = useState(0)
  const [tint, setTint] = useState(0)
  const [grain, setGrain] = useState(0)
  const [fade, setFade] = useState(0)
  const [exposure, setExposure] = useState(0)
  const [clarity, setClarity] = useState(0)
  const [dehaze, setDehaze] = useState(0)
  const [texture, setTexture] = useState(0)

  // Text overlay
  const [textOverlay, setTextOverlay] = useState('')
  const [textColor, setTextColor] = useState('#ffffff')
  const [textSize, setTextSize] = useState(24)
  const [textPosition, setTextPosition] = useState('bottom')
  const [textBg, setTextBg] = useState(false)
  const [textFont, setTextFont] = useState('sans-serif')
  const [textBold, setTextBold] = useState(true)
  const [textShadow, setTextShadow] = useState(true)

  // Stickers/Emoji overlay
  const [sticker, setSticker] = useState('')
  const [stickerPosition, setStickerPosition] = useState('center')

  // Border/Frame
  const [borderStyle, setBorderStyle] = useState('none')
  const [borderColor, setBorderColor] = useState('#00e5ff')

  // Video specific
  const [speed, setSpeed] = useState(1)
  const [muted, setMuted] = useState(false)
  const [loop, setLoop] = useState(true)
  const [videoQuality, setVideoQuality] = useState('high')

  const fileInputRef = useRef(null)
  const photoInputRef = useRef(null)
  const videoInputRef = useRef(null)
  const multiInputRef = useRef(null)
  const canvasRef = useRef(null)
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

  const handlePhotoSelect = (e) => {
    const f = e.target.files[0]
    if (!f) return
    setFiles([f])
    setFileUrl(URL.createObjectURL(f))
    setFileType('photo')
    setPostType('photo')
    setStep('edit')
  }

  const handleVideoSelect = (e) => {
    const f = e.target.files[0]
    if (!f) return
    setFiles([f])
    setFileUrl(URL.createObjectURL(f))
    setFileType('video')
    setPostType(postType)
    setStep('edit')
  }

  const handleMultiSelect = (e) => {
    const fs = Array.from(e.target.files)
    if (!fs.length) return
    setFiles(fs)
    setFileUrl(URL.createObjectURL(fs[0]))
    setFileType('photo')
    setPostType('photo')
    setStep('edit')
  }

  const getFilterCSS = (f) => {
    const filters = {
      none:'', warm:'sepia(0.25) saturate(1.5) hue-rotate(-10deg)',
      cool:'hue-rotate(20deg) saturate(0.9) brightness(1.05)',
      bw:'grayscale(1)', fade:'opacity(0.88) brightness(1.1) saturate(0.8)',
      vivid:'saturate(2) contrast(1.1)', drama:'contrast(1.4) brightness(0.85) saturate(0.7)',
      golden:'sepia(0.5) saturate(1.8) brightness(1.1)',
      vintage:'sepia(0.4) contrast(0.85) brightness(0.9) saturate(0.8)',
      neon:'saturate(3) contrast(1.2) hue-rotate(10deg)',
      matte:'contrast(0.85) brightness(1.05) saturate(0.75)',
      cinema:'contrast(1.2) brightness(0.9) sepia(0.1) saturate(1.1)',
      chrome:'contrast(1.25) saturate(1.3) brightness(1.05)',
      summer:'saturate(1.4) hue-rotate(-5deg) brightness(1.1)',
      winter:'hue-rotate(15deg) saturate(0.85) brightness(1.05)',
      purple:'hue-rotate(270deg) saturate(1.2)',
      emerald:'hue-rotate(120deg) saturate(1.3)',
      rose:'hue-rotate(330deg) saturate(1.4)',
      blueprint:'hue-rotate(200deg) saturate(1.5) contrast(1.1)',
      infrared:'hue-rotate(180deg) saturate(2) contrast(1.2)',
      lomo:'contrast(1.5) saturate(1.3) brightness(0.9)',
      retro:'sepia(0.6) contrast(1.1) brightness(0.95) hue-rotate(-10deg)',
      moonlight:'brightness(1.2) saturate(0.5) hue-rotate(200deg)',
      sunset:'sepia(0.3) saturate(1.6) hue-rotate(-20deg) brightness(1.1)',
    }
    return filters[f] || ''
  }

  const getEditorStyle = () => ({
    filter: `
      brightness(${brightness + exposure}%)
      contrast(${contrast}%)
      saturate(${saturation}%)
      hue-rotate(${hue + temperature}deg)
      blur(${blur}px)
      opacity(${opacity}%)
      ${getFilterCSS(filter)}
    `,
    transform: `rotate(${rotation}deg) scaleX(${flipH?-1:1}) scaleY(${flipV?-1:1}) scale(${scale/100})`,
  })

  const resetEdits = () => {
    setBrightness(100); setContrast(100); setSaturation(100)
    setHue(0); setBlur(0); setOpacity(100); setVignette(0)
    setRotation(0); setFlipH(false); setFlipV(false)
    setFilter('none'); setScale(100); setShadows(0)
    setHighlights(0); setTemperature(0); setTint(0)
    setGrain(0); setFade(0); setExposure(0)
    setClarity(0); setDehaze(0); setTexture(0)
    setTextOverlay(''); setSticker(''); setBorderStyle('none')
    setSpeed(1); setMuted(false)
  }

  const downloadWithWatermark = async () => {
    if (!fileUrl) return
    if (fileType === 'video') {
      const a = document.createElement('a')
      a.href = fileUrl
      a.download = `echoworld_${Date.now()}.mp4`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      return
    }

    const canvas = document.createElement('canvas')
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')

      // Apply basic filter via CSS-like approach
      ctx.filter = getEditorStyle().filter
      ctx.drawImage(img, 0, 0)
      ctx.filter = 'none'

      // Watermark
      const wm = '⬡ ECHO WORLD'
      const fontSize = Math.max(20, img.width * 0.04)
      ctx.font = `bold ${fontSize}px sans-serif`
      ctx.globalAlpha = 0.7
      ctx.fillStyle = '#00e5ff'
      ctx.strokeStyle = '#000'
      ctx.lineWidth = 2
      const x = img.width - ctx.measureText(wm).width - 16
      const y = img.height - 16
      ctx.strokeText(wm, x, y)
      ctx.fillText(wm, x, y)
      ctx.globalAlpha = 1

      // Text overlay
      if (textOverlay) {
        const tSize = Math.max(textSize, 16)
        ctx.font = `${textBold?'bold ':''} ${tSize}px ${textFont}`
        ctx.fillStyle = textColor
        ctx.strokeStyle = '#000'
        ctx.lineWidth = 2
        const tx = img.width / 2 - ctx.measureText(textOverlay).width / 2
        const ty = textPosition==='top' ? tSize+20 : textPosition==='middle' ? img.height/2 : img.height - 40
        if (textShadow) ctx.strokeText(textOverlay, tx, ty)
        ctx.fillText(textOverlay, tx, ty)
      }

      const link = document.createElement('a')
      link.download = `echoworld_${Date.now()}.jpg`
      link.href = canvas.toDataURL('image/jpeg', 0.92)
      link.click()
    }
    img.src = fileUrl
  }

  const uploadMedia = async (file) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('upload_preset', UPLOAD_PRESET)
    return new Promise((resolve) => {
      const xhr = new XMLHttpRequest()
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) setUploadProgress(Math.round((e.loaded/e.total)*90))
      }
      xhr.onload = () => {
        const d = JSON.parse(xhr.responseText)
        setUploadProgress(100)
        resolve(d.secure_url)
      }
      xhr.onerror = () => resolve(null)
      xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`)
      xhr.send(formData)
    })
  }

  const handlePost = async () => {
    if (!user) return
    if (!content && !files.length && postType !== 'capsule' && postType !== 'checkin') return
    setUploading(true)

    if (files.length > 1) {
      // Multi-photo post
      for (const f of files) {
        const mediaUrl = await uploadMedia(f)
        if (!mediaUrl) continue
        await supabase.from('posts').insert({
          user_id: user.id,
          content,
          media_url: mediaUrl,
          media_type: 'photo',
          location_name: locationName,
          latitude, longitude,
          hashtags, privacy,
        })
      }
      setUploading(false)
      window.location.href = '/feed'
      return
    }

    let mediaUrl = null
    if (files.length === 1) {
      mediaUrl = await uploadMedia(files[0])
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
      latitude, longitude,
      hashtags, privacy,
      post_format: postType === 'echo' ? 'echo' : 'full',
    })

    setUploading(false)
    if (!error) window.location.href = '/feed'
    else alert('Post failed: ' + error.message)
  }

  const filters = [
    'none','warm','cool','bw','fade','vivid','drama','golden','vintage',
    'neon','matte','cinema','chrome','summer','winter','purple','emerald',
    'rose','blueprint','infrared','lomo','retro','moonlight','sunset'
  ]

  const editTabs = [
    {key:'filters', label:'🎨'},
    {key:'light', label:'☀️'},
    {key:'color', label:'🌈'},
    {key:'detail', label:'🔍'},
    {key:'transform', label:'↻'},
    {key:'text', label:'✏️'},
    {key:'sticker', label:'😊'},
    {key:'border', label:'🖼'},
    ...(fileType==='video'?[{key:'video',label:'🎬'}]:[]),
  ]

  const sliders = {
    light: [
      {label:'☀️ Exposure', value:exposure, setter:setExposure, min:-50, max:50, unit:''},
      {label:'🌟 Brightness', value:brightness, setter:setBrightness, min:0, max:200, unit:'%'},
      {label:'◑ Contrast', value:contrast, setter:setContrast, min:0, max:200, unit:'%'},
      {label:'🔆 Highlights', value:highlights, setter:setHighlights, min:-50, max:50, unit:''},
      {label:'🌑 Shadows', value:shadows, setter:setShadows, min:-50, max:50, unit:''},
      {label:'💧 Blur', value:blur, setter:setBlur, min:0, max:15, unit:'px'},
      {label:'🌫 Vignette', value:vignette, setter:setVignette, min:0, max:80, unit:'%'},
      {label:'🫧 Dehaze', value:dehaze, setter:setDehaze, min:-50, max:50, unit:''},
      {label:'👁 Opacity', value:opacity, setter:setOpacity, min:20, max:100, unit:'%'},
    ],
    color: [
      {label:'🎨 Saturation', value:saturation, setter:setSaturation, min:0, max:300, unit:'%'},
      {label:'🌡 Temperature', value:temperature, setter:setTemperature, min:-60, max:60, unit:'°'},
      {label:'🌈 Hue', value:hue, setter:setHue, min:-180, max:180, unit:'°'},
      {label:'💜 Tint', value:tint, setter:setTint, min:-50, max:50, unit:''},
      {label:'🎞 Fade', value:fade, setter:setFade, min:0, max:50, unit:'%'},
      {label:'📽 Grain', value:grain, setter:setGrain, min:0, max:50, unit:''},
    ],
    detail: [
      {label:'🔍 Clarity', value:clarity, setter:setClarity, min:-50, max:50, unit:''},
      {label:'🎯 Texture', value:texture, setter:setTexture, min:-50, max:50, unit:''},
      {label:'🔎 Scale', value:scale, setter:setScale, min:50, max:150, unit:'%'},
    ],
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

          {/* Single Photo */}
          <div onClick={()=>photoInputRef.current?.click()} style={{background:'#111620',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'16px',padding:'20px',cursor:'pointer',textAlign:'center'}}>
            <div style={{fontSize:'32px',marginBottom:'8px'}}>📷</div>
            <div style={{fontSize:'14px',fontWeight:'700',marginBottom:'4px'}}>Photo</div>
            <div style={{fontSize:'11px',color:'#4a5568'}}>Single photo</div>
          </div>

          {/* Multi Photos */}
          <div onClick={()=>multiInputRef.current?.click()} style={{background:'#111620',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'16px',padding:'20px',cursor:'pointer',textAlign:'center'}}>
            <div style={{fontSize:'32px',marginBottom:'8px'}}>🖼</div>
            <div style={{fontSize:'14px',fontWeight:'700',marginBottom:'4px'}}>Multi Photos</div>
            <div style={{fontSize:'11px',color:'#4a5568'}}>Up to 10 photos</div>
          </div>

          {/* ECHO Short Video */}
          <div onClick={()=>{setPostType('echo');videoInputRef.current?.click()}} style={{background:'#111620',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'16px',padding:'20px',cursor:'pointer',textAlign:'center'}}>
            <div style={{fontSize:'32px',marginBottom:'8px'}}>⚡</div>
            <div style={{fontSize:'14px',fontWeight:'700',marginBottom:'4px'}}>ECHO Short</div>
            <div style={{fontSize:'11px',color:'#4a5568'}}>Vertical short video</div>
          </div>

          {/* Long Video */}
          <div onClick={()=>{setPostType('video');videoInputRef.current?.click()}} style={{background:'#111620',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'16px',padding:'20px',cursor:'pointer',textAlign:'center'}}>
            <div style={{fontSize:'32px',marginBottom:'8px'}}>🎬</div>
            <div style={{fontSize:'14px',fontWeight:'700',marginBottom:'4px'}}>Long Video</div>
            <div style={{fontSize:'11px',color:'#4a5568'}}>Full length video</div>
          </div>

          {/* Text Post */}
          <div onClick={()=>{setPostType('text');setStep('details')}} style={{background:'#111620',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'16px',padding:'20px',cursor:'pointer',textAlign:'center'}}>
            <div style={{fontSize:'32px',marginBottom:'8px'}}>✏️</div>
            <div style={{fontSize:'14px',fontWeight:'700',marginBottom:'4px'}}>Text Post</div>
            <div style={{fontSize:'11px',color:'#4a5568'}}>Share thoughts</div>
          </div>

          {/* Time Capsule */}
          <div onClick={()=>{setPostType('capsule');setStep('details')}} style={{background:'#111620',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'16px',padding:'20px',cursor:'pointer',textAlign:'center'}}>
            <div style={{fontSize:'32px',marginBottom:'8px'}}>📦</div>
            <div style={{fontSize:'14px',fontWeight:'700',marginBottom:'4px'}}>Time Capsule</div>
            <div style={{fontSize:'11px',color:'#4a5568'}}>Hidden until visited</div>
          </div>

          {/* Check-in */}
          <div onClick={()=>{setPostType('checkin');setStep('details')}} style={{background:'#111620',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'16px',padding:'20px',cursor:'pointer',textAlign:'center'}}>
            <div style={{fontSize:'32px',marginBottom:'8px'}}>📍</div>
            <div style={{fontSize:'14px',fontWeight:'700',marginBottom:'4px'}}>Check-in</div>
            <div style={{fontSize:'11px',color:'#4a5568'}}>Mark location</div>
          </div>
        </div>

        {/* Hidden inputs */}
        <input ref={photoInputRef} type="file" accept="image/*" onChange={handlePhotoSelect} style={{display:'none'}}/>
        <input ref={videoInputRef} type="file" accept="video/*" onChange={handleVideoSelect} style={{display:'none'}}/>
        <input ref={multiInputRef} type="file" accept="image/*" multiple onChange={handleMultiSelect} style={{display:'none'}}/>
      </div>
    </div>
  )

  // STEP: EDIT
  if (step === 'edit') return (
    <div style={{minHeight:'100vh',background:'#070a10',color:'#eef2f7'}}>
      <div style={{position:'fixed',top:0,left:0,right:0,background:'rgba(7,10,16,0.97)',borderBottom:'1px solid rgba(255,255,255,0.07)',padding:'0 16px',height:'56px',display:'flex',alignItems:'center',justifyContent:'space-between',zIndex:100}}>
        <button onClick={()=>setStep('select')} style={{background:'none',border:'none',color:'#8892a4',fontSize:'24px',cursor:'pointer'}}>←</button>
        <div style={{fontSize:'14px',fontWeight:'700'}}>{fileType==='video'?'🎬 Edit Video':'📷 Edit Photo'}</div>
        <button onClick={()=>setStep('details')} style={{background:'linear-gradient(135deg,#00e5ff,#00ff88)',border:'none',borderRadius:'20px',padding:'8px 16px',fontSize:'13px',fontWeight:'700',color:'#070a10',cursor:'pointer'}}>Next →</button>
      </div>

      <div style={{paddingTop:'56px'}}>
        {/* PREVIEW */}
        <div style={{width:'100%',background:'#000',position:'relative',overflow:'hidden',minHeight:'300px',display:'flex',alignItems:'center',justifyContent:'center'}}>
          {fileType==='photo' ? (
            <div style={{position:'relative',width:'100%'}}>
              <img src={fileUrl} style={{width:'100%',maxHeight:'52vh',objectFit:'contain',display:'block',...getEditorStyle()}}/>
              {vignette>0&&<div style={{position:'absolute',inset:0,background:`radial-gradient(ellipse at center,transparent ${100-vignette}%,rgba(0,0,0,${vignette/100}) 100%)`,pointerEvents:'none'}}/>}
              {borderStyle!=='none'&&<div style={{position:'absolute',inset:'4px',border:`4px ${borderStyle} ${borderColor}`,pointerEvents:'none',borderRadius:'4px'}}/>}
              {sticker&&<div style={{position:'absolute',fontSize:'40px',top:stickerPosition==='top'?'10px':stickerPosition==='center'?'50%':'auto',bottom:stickerPosition==='bottom'?'10px':'auto',left:'50%',transform:`translateX(-50%)${stickerPosition==='center'?' translateY(-50%)':''}`,pointerEvents:'none'}}>{sticker}</div>}
              {textOverlay&&(
                <div style={{position:'absolute',left:'50%',transform:'translateX(-50%)',
                  top:textPosition==='top'?'10px':textPosition==='middle'?'50%':'auto',
                  bottom:textPosition==='bottom'?'10px':'auto',
                  color:textColor,fontSize:`${textSize}px`,
                  fontWeight:textBold?'800':'400',
                  fontFamily:textFont,
                  background:textBg?'rgba(0,0,0,0.5)':'transparent',
                  padding:textBg?'4px 10px':'0',
                  borderRadius:'6px',
                  textShadow:textShadow?'2px 2px 4px rgba(0,0,0,0.8)':'none',
                  textAlign:'center',whiteSpace:'nowrap',pointerEvents:'none'}}>
                  {textOverlay}
                </div>
              )}
            </div>
          ) : (
            <div style={{position:'relative',width:'100%'}}>
              <video ref={previewVideoRef} src={fileUrl} style={{width:'100%',maxHeight:'52vh',objectFit:'contain',display:'block',...getEditorStyle()}}
                controls playsInline loop={loop}/>
              {textOverlay&&<div style={{position:'absolute',left:'50%',transform:'translateX(-50%)',top:textPosition==='top'?'10px':textPosition==='middle'?'45%':'auto',bottom:textPosition==='bottom'?'40px':'auto',color:textColor,fontSize:`${textSize}px`,fontWeight:'800',textShadow:'2px 2px 4px rgba(0,0,0,0.8)',whiteSpace:'nowrap',pointerEvents:'none'}}>{textOverlay}</div>}
            </div>
          )}
        </div>

        {/* Multi photo selector */}
        {files.length > 1 && (
          <div style={{display:'flex',gap:'6px',padding:'8px 12px',overflowX:'auto',background:'#0a0f18',scrollbarWidth:'none'}}>
            {files.map((f,i) => (
              <img key={i} src={URL.createObjectURL(f)} style={{width:'50px',height:'50px',borderRadius:'8px',objectFit:'cover',border:`2px solid ${i===0?'#00e5ff':'transparent'}`,flexShrink:0,cursor:'pointer'}}/>
            ))}
          </div>
        )}

        {/* EDIT TABS */}
        <div style={{display:'flex',borderBottom:'1px solid rgba(255,255,255,0.07)',overflowX:'auto',scrollbarWidth:'none',background:'#0a0f18'}}>
          {editTabs.map(t => (
            <button key={t.key} onClick={()=>setActiveEditTab(t.key)} style={{padding:'10px 16px',border:'none',cursor:'pointer',fontSize:'16px',whiteSpace:'nowrap',flexShrink:0,background:'transparent',borderBottom:activeEditTab===t.key?'2px solid #00e5ff':'2px solid transparent',color:activeEditTab===t.key?'#00e5ff':'#4a5568'}}>
              {t.label}
            </button>
          ))}
        </div>

        <div style={{padding:'14px',maxHeight:'45vh',overflowY:'auto'}}>

          {/* FILTERS */}
          {activeEditTab==='filters' && (
            <div style={{display:'flex',gap:'8px',overflowX:'auto',paddingBottom:'8px',scrollbarWidth:'none'}}>
              {filters.map(f => (
                <div key={f} onClick={()=>setFilter(f)} style={{flexShrink:0,textAlign:'center',cursor:'pointer'}}>
                  <div style={{width:'60px',height:'60px',borderRadius:'10px',overflow:'hidden',border:`2px solid ${filter===f?'#00e5ff':'transparent'}`,marginBottom:'4px',background:'#1a2030'}}>
                    {fileType==='photo'&&fileUrl
                      ? <img src={fileUrl} style={{width:'100%',height:'100%',objectFit:'cover',filter:getFilterCSS(f)}}/>
                      : <div style={{width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'18px',filter:getFilterCSS(f)}}>🎬</div>
                    }
                  </div>
                  <div style={{fontSize:'8px',color:filter===f?'#00e5ff':'#4a5568',fontWeight:'600',textTransform:'capitalize'}}>{f}</div>
                </div>
              ))}
            </div>
          )}

          {/* LIGHT, COLOR, DETAIL sliders */}
          {['light','color','detail'].includes(activeEditTab) && (
            <div>
              {sliders[activeEditTab].map(adj => (
                <div key={adj.label} style={{marginBottom:'14px'}}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:'5px'}}>
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

          {/* TRANSFORM */}
          {activeEditTab==='transform' && (
            <div>
              <div style={{marginBottom:'16px'}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:'6px'}}>
                  <span style={{fontSize:'12px',color:'#8892a4'}}>↻ Rotation</span>
                  <span style={{fontSize:'12px',color:'#00e5ff',fontWeight:'600'}}>{rotation}°</span>
                </div>
                <input type="range" min={-180} max={180} value={rotation} onChange={e=>setRotation(Number(e.target.value))} style={{width:'100%',accentColor:'#00e5ff'}}/>
              </div>
              <div style={{display:'flex',gap:'8px',marginBottom:'14px'}}>
                {[0,90,180,270].map(r=>(
                  <button key={r} onClick={()=>setRotation(r)} style={{flex:1,padding:'8px',borderRadius:'8px',border:`1px solid ${rotation===r?'#00e5ff':'rgba(255,255,255,0.07)'}`,background:rotation===r?'rgba(0,229,255,0.1)':'rgba(255,255,255,0.03)',color:rotation===r?'#00e5ff':'#4a5568',fontSize:'12px',cursor:'pointer'}}>{r}°</button>
                ))}
              </div>
              <div style={{display:'flex',gap:'8px',marginBottom:'14px'}}>
                <button onClick={()=>setFlipH(!flipH)} style={{flex:1,padding:'10px',borderRadius:'10px',border:`2px solid ${flipH?'#00e5ff':'rgba(255,255,255,0.07)'}`,background:flipH?'rgba(0,229,255,0.1)':'rgba(255,255,255,0.03)',color:flipH?'#00e5ff':'#4a5568',fontSize:'12px',fontWeight:'700',cursor:'pointer'}}>↔ Flip H</button>
                <button onClick={()=>setFlipV(!flipV)} style={{flex:1,padding:'10px',borderRadius:'10px',border:`2px solid ${flipV?'#00e5ff':'rgba(255,255,255,0.07)'}`,background:flipV?'rgba(0,229,255,0.1)':'rgba(255,255,255,0.03)',color:flipV?'#00e5ff':'#4a5568',fontSize:'12px',fontWeight:'700',cursor:'pointer'}}>↕ Flip V</button>
              </div>
              <div style={{marginBottom:'14px'}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:'6px'}}>
                  <span style={{fontSize:'12px',color:'#8892a4'}}>🔎 Scale</span>
                  <span style={{fontSize:'12px',color:'#00e5ff',fontWeight:'600'}}>{scale}%</span>
                </div>
                <input type="range" min={50} max={150} value={scale} onChange={e=>setScale(Number(e.target.value))} style={{width:'100%',accentColor:'#00e5ff'}}/>
              </div>
            </div>
          )}

          {/* TEXT */}
          {activeEditTab==='text' && (
            <div>
              <input placeholder="Add text..." value={textOverlay} onChange={e=>setTextOverlay(e.target.value)}
                style={{width:'100%',background:'#0c1018',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'12px',padding:'12px',color:'#eef2f7',fontSize:'14px',outline:'none',boxSizing:'border-box',marginBottom:'12px'}}/>
              <div style={{display:'flex',gap:'6px',flexWrap:'wrap',marginBottom:'10px'}}>
                {['#ffffff','#000000','#00e5ff','#00ff88','#ff4560','#ffca28','#ffa500','#ff69b4','#9c27b0','#4caf50','#2196f3','#f44336'].map(c=>(
                  <div key={c} onClick={()=>setTextColor(c)} style={{width:'28px',height:'28px',borderRadius:'50%',background:c,border:`3px solid ${textColor===c?'#fff':'transparent'}`,cursor:'pointer'}}/>
                ))}
              </div>
              <div style={{marginBottom:'10px'}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:'4px'}}>
                  <span style={{fontSize:'12px',color:'#8892a4'}}>Size</span>
                  <span style={{fontSize:'12px',color:'#00e5ff'}}>{textSize}px</span>
                </div>
                <input type="range" min={12} max={72} value={textSize} onChange={e=>setTextSize(Number(e.target.value))} style={{width:'100%',accentColor:'#00e5ff'}}/>
              </div>
              <div style={{display:'flex',gap:'6px',marginBottom:'10px'}}>
                {['top','middle','bottom'].map(p=>(
                  <button key={p} onClick={()=>setTextPosition(p)} style={{flex:1,padding:'8px',borderRadius:'8px',border:`2px solid ${textPosition===p?'#00e5ff':'rgba(255,255,255,0.07)'}`,background:textPosition===p?'rgba(0,229,255,0.1)':'transparent',color:textPosition===p?'#00e5ff':'#4a5568',fontSize:'11px',cursor:'pointer',textTransform:'capitalize'}}>{p}</button>
                ))}
              </div>
              <div style={{display:'flex',gap:'8px',marginBottom:'10px'}}>
                <button onClick={()=>setTextBold(!textBold)} style={{flex:1,padding:'8px',borderRadius:'8px',border:`2px solid ${textBold?'#00e5ff':'rgba(255,255,255,0.07)'}`,background:textBold?'rgba(0,229,255,0.1)':'transparent',color:textBold?'#00e5ff':'#4a5568',fontSize:'12px',fontWeight:'700',cursor:'pointer'}}>B Bold</button>
                <button onClick={()=>setTextBg(!textBg)} style={{flex:1,padding:'8px',borderRadius:'8px',border:`2px solid ${textBg?'#00e5ff':'rgba(255,255,255,0.07)'}`,background:textBg?'rgba(0,229,255,0.1)':'transparent',color:textBg?'#00e5ff':'#4a5568',fontSize:'12px',cursor:'pointer'}}>⬛ BG</button>
                <button onClick={()=>setTextShadow(!textShadow)} style={{flex:1,padding:'8px',borderRadius:'8px',border:`2px solid ${textShadow?'#00e5ff':'rgba(255,255,255,0.07)'}`,background:textShadow?'rgba(0,229,255,0.1)':'transparent',color:textShadow?'#00e5ff':'#4a5568',fontSize:'12px',cursor:'pointer'}}>💫 Shadow</button>
              </div>
              <div style={{fontSize:'12px',color:'#4a5568',marginBottom:'6px'}}>Font</div>
              <div style={{display:'flex',gap:'6px',flexWrap:'wrap'}}>
                {['sans-serif','serif','monospace','cursive','fantasy'].map(f=>(
                  <button key={f} onClick={()=>setTextFont(f)} style={{padding:'6px 10px',borderRadius:'8px',border:`1px solid ${textFont===f?'#00e5ff':'rgba(255,255,255,0.07)'}`,background:textFont===f?'rgba(0,229,255,0.1)':'transparent',color:textFont===f?'#00e5ff':'#4a5568',fontSize:'11px',cursor:'pointer',fontFamily:f}}>{f}</button>
                ))}
              </div>
            </div>
          )}

          {/* STICKER */}
          {activeEditTab==='sticker' && (
            <div>
              <div style={{fontSize:'12px',color:'#4a5568',marginBottom:'8px',fontWeight:'600'}}>SELECT STICKER</div>
              <div style={{display:'flex',gap:'8px',flexWrap:'wrap',marginBottom:'14px'}}>
                {['❤️','🔥','⚡','🌟','💫','🎉','👑','💎','🌈','😍','🤩','😎','🥳','💪','🙌','🤝','👏','✌️','🫶','💯','🎯','🚀','🌍','📍','⬡'].map(s=>(
                  <button key={s} onClick={()=>setSticker(sticker===s?'':s)} style={{fontSize:'28px',background:sticker===s?'rgba(0,229,255,0.15)':'rgba(255,255,255,0.04)',border:`2px solid ${sticker===s?'#00e5ff':'transparent'}`,borderRadius:'10px',padding:'6px',cursor:'pointer',width:'46px',height:'46px'}}>
                    {s}
                  </button>
                ))}
              </div>
              {sticker && (
                <>
                  <div style={{fontSize:'12px',color:'#4a5568',marginBottom:'8px',fontWeight:'600'}}>POSITION</div>
                  <div style={{display:'flex',gap:'8px'}}>
                    {['top','center','bottom'].map(p=>(
                      <button key={p} onClick={()=>setStickerPosition(p)} style={{flex:1,padding:'8px',borderRadius:'8px',border:`2px solid ${stickerPosition===p?'#00e5ff':'rgba(255,255,255,0.07)'}`,background:stickerPosition===p?'rgba(0,229,255,0.1)':'transparent',color:stickerPosition===p?'#00e5ff':'#4a5568',fontSize:'11px',cursor:'pointer',textTransform:'capitalize'}}>{p}</button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* BORDER */}
          {activeEditTab==='border' && (
            <div>
              <div style={{fontSize:'12px',color:'#4a5568',marginBottom:'8px',fontWeight:'600'}}>BORDER STYLE</div>
              <div style={{display:'flex',gap:'8px',marginBottom:'14px',flexWrap:'wrap'}}>
                {['none','solid','dashed','dotted','double'].map(b=>(
                  <button key={b} onClick={()=>setBorderStyle(b)} style={{padding:'8px 12px',borderRadius:'8px',border:`2px solid ${borderStyle===b?'#00e5ff':'rgba(255,255,255,0.07)'}`,background:borderStyle===b?'rgba(0,229,255,0.1)':'transparent',color:borderStyle===b?'#00e5ff':'#4a5568',fontSize:'12px',cursor:'pointer',textTransform:'capitalize'}}>{b}</button>
                ))}
              </div>
              {borderStyle!=='none'&&(
                <>
                  <div style={{fontSize:'12px',color:'#4a5568',marginBottom:'8px',fontWeight:'600'}}>BORDER COLOR</div>
                  <div style={{display:'flex',gap:'8px',flexWrap:'wrap'}}>
                    {['#00e5ff','#00ff88','#ff4560','#ffca28','#ffffff','#000000','#ffa500','#ff69b4'].map(c=>(
                      <div key={c} onClick={()=>setBorderColor(c)} style={{width:'32px',height:'32px',borderRadius:'50%',background:c,border:`3px solid ${borderColor===c?'#fff':'transparent'}`,cursor:'pointer'}}/>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* VIDEO */}
          {activeEditTab==='video'&&fileType==='video'&&(
            <div>
              <div style={{marginBottom:'16px'}}>
                <div style={{fontSize:'12px',color:'#4a5568',fontWeight:'600',marginBottom:'8px'}}>🎚 SPEED</div>
                <div style={{display:'flex',gap:'6px',flexWrap:'wrap'}}>
                  {[0.25,0.5,0.75,1,1.25,1.5,2,3,4].map(s=>(
                    <button key={s} onClick={()=>setSpeed(s)} style={{padding:'7px 10px',borderRadius:'8px',border:`2px solid ${speed===s?'#00e5ff':'rgba(255,255,255,0.07)'}`,background:speed===s?'rgba(0,229,255,0.1)':'transparent',color:speed===s?'#00e5ff':'#4a5568',fontSize:'11px',fontWeight:'700',cursor:'pointer'}}>{s}x</button>
                  ))}
                </div>
              </div>
              <div style={{display:'flex',gap:'8px',marginBottom:'14px'}}>
                <button onClick={()=>setMuted(!muted)} style={{flex:1,padding:'10px',borderRadius:'10px',border:`2px solid ${muted?'#ff4560':'rgba(255,255,255,0.07)'}`,background:muted?'rgba(255,69,96,0.1)':'transparent',color:muted?'#ff4560':'#4a5568',fontSize:'13px',fontWeight:'700',cursor:'pointer'}}>
                  {muted?'🔇 Muted':'🔊 Audio On'}
                </button>
                <button onClick={()=>setLoop(!loop)} style={{flex:1,padding:'10px',borderRadius:'10px',border:`2px solid ${loop?'#00e5ff':'rgba(255,255,255,0.07)'}`,background:loop?'rgba(0,229,255,0.1)':'transparent',color:loop?'#00e5ff':'#4a5568',fontSize:'13px',fontWeight:'700',cursor:'pointer'}}>
                  {loop?'🔁 Loop On':'➡ No Loop'}
                </button>
              </div>
            </div>
          )}

          {/* Reset */}
          <button onClick={resetEdits} style={{width:'100%',padding:'10px',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'10px',color:'#8892a4',fontSize:'13px',cursor:'pointer',marginTop:'8px'}}>
            ↺ Reset All
          </button>
        </div>

        {/* Download button */}
        <div style={{padding:'12px 16px',borderTop:'1px solid rgba(255,255,255,0.07)',display:'flex',gap:'10px'}}>
          <button onClick={downloadWithWatermark} style={{flex:1,padding:'12px',background:'rgba(0,229,255,0.08)',border:'1px solid rgba(0,229,255,0.2)',borderRadius:'12px',color:'#00e5ff',fontSize:'13px',fontWeight:'700',cursor:'pointer'}}>
            ⬇ Download
          </button>
          <button onClick={()=>setStep('details')} style={{flex:2,padding:'12px',background:'linear-gradient(135deg,#00e5ff,#00ff88)',border:'none',borderRadius:'12px',color:'#070a10',fontSize:'14px',fontWeight:'800',cursor:'pointer'}}>
            Next → Post Details
          </button>
        </div>
      </div>
    </div>
  )

  // STEP: DETAILS
  return (
    <div style={{minHeight:'100vh',background:'#070a10',color:'#eef2f7'}}>
      <div style={{position:'fixed',top:0,left:0,right:0,background:'rgba(7,10,16,0.97)',borderBottom:'1px solid rgba(255,255,255,0.07)',padding:'0 16px',height:'56px',display:'flex',alignItems:'center',justifyContent:'space-between',zIndex:100}}>
        <button onClick={()=>files.length?setStep('edit'):window.location.href='/feed'} style={{background:'none',border:'none',color:'#8892a4',fontSize:'24px',cursor:'pointer'}}>←</button>
        <div style={{fontSize:'16px',fontWeight:'700'}}>Post Details</div>
        <button onClick={handlePost} disabled={uploading} style={{background:'linear-gradient(135deg,#00e5ff,#00ff88)',border:'none',borderRadius:'20px',padding:'8px 18px',fontSize:'13px',fontWeight:'700',color:'#070a10',cursor:'pointer',opacity:uploading?0.6:1}}>
          {uploading?`${uploadProgress}%`:'Post ✓'}
        </button>
      </div>

      <div style={{padding:'72px 16px 40px'}}>
        {fileUrl && (
          <div style={{marginBottom:'14px',borderRadius:'14px',overflow:'hidden',maxHeight:'200px',background:'#000',position:'relative'}}>
            {fileType==='photo'
              ? <img src={fileUrl} style={{width:'100%',maxHeight:'200px',objectFit:'cover',...getEditorStyle()}}/>
              : <video src={fileUrl} style={{width:'100%',maxHeight:'200px',objectFit:'cover'}} playsInline muted/>
            }
            {textOverlay&&<div style={{position:'absolute',bottom:'8px',left:'50%',transform:'translateX(-50%)',color:textColor,fontSize:'14px',fontWeight:'800',textShadow:'1px 1px 3px #000',whiteSpace:'nowrap'}}>{textOverlay}</div>}
            {files.length>1&&<div style={{position:'absolute',top:'8px',right:'8px',background:'rgba(0,0,0,0.7)',borderRadius:'10px',padding:'4px 8px',fontSize:'11px',color:'#fff',fontWeight:'700'}}>+{files.length} photos</div>}
          </div>
        )}

        <textarea placeholder="Write a caption..." value={content} onChange={e=>setContent(e.target.value)}
          style={{width:'100%',background:'#111620',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'14px',padding:'14px',color:'#eef2f7',fontSize:'14px',resize:'none',minHeight:'90px',outline:'none',boxSizing:'border-box',lineHeight:'1.6',marginBottom:'10px'}}/>

        <input placeholder="#hashtags" value={hashtags} onChange={e=>setHashtags(e.target.value)}
          style={{width:'100%',background:'#111620',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'12px',padding:'12px 14px',color:'#00e5ff',fontSize:'14px',outline:'none',boxSizing:'border-box',marginBottom:'10px'}}/>

        <div style={{background:'#111620',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'12px',padding:'12px 14px',marginBottom:'10px',display:'flex',alignItems:'center',gap:'10px'}}>
          <span>📍</span>
          <input placeholder="Location..." value={locationName} onChange={e=>setLocationName(e.target.value)}
            style={{flex:1,background:'none',border:'none',color:'#00e5ff',fontSize:'13px',outline:'none'}}/>
        </div>

        <div style={{background:'#111620',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'12px',padding:'12px 14px',marginBottom:'16px'}}>
          <div style={{fontSize:'11px',color:'#4a5568',marginBottom:'8px',fontWeight:'600'}}>PRIVACY</div>
          <div style={{display:'flex',gap:'8px'}}>
            {[{key:'public',label:'🌍 Public'},{key:'friends',label:'👥 Supporters'},{key:'private',label:'🔒 Only Me'}].map(p=>(
              <button key={p.key} onClick={()=>setPrivacy(p.key)} style={{flex:1,padding:'8px',borderRadius:'10px',border:'none',cursor:'pointer',fontSize:'11px',fontWeight:'600',background:privacy===p.key?'linear-gradient(135deg,#00e5ff,#00ff88)':'rgba(255,255,255,0.05)',color:privacy===p.key?'#070a10':'#4a5568'}}>
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {uploading&&(
          <div style={{background:'#111620',borderRadius:'12px',padding:'12px',marginBottom:'12px'}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:'6px'}}>
              <span style={{fontSize:'13px',color:'#8892a4'}}>Uploading{files.length>1?` (${files.length} photos)`:''}</span>
              <span style={{fontSize:'13px',color:'#00e5ff',fontWeight:'700'}}>{uploadProgress}%</span>
            </div>
            <div style={{height:'4px',background:'rgba(255,255,255,0.05)',borderRadius:'2px'}}>
              <div style={{height:'100%',width:`${uploadProgress}%`,background:'linear-gradient(90deg,#00e5ff,#00ff88)',borderRadius:'2px',transition:'width 0.3s'}}/>
            </div>
          </div>
        )}

        <div style={{display:'flex',gap:'10px'}}>
          <button onClick={downloadWithWatermark} style={{flex:1,padding:'14px',background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'14px',color:'#8892a4',fontSize:'14px',fontWeight:'700',cursor:'pointer'}}>
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
