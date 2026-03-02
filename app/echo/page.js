'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default function Echo() {
  const [videos, setVideos] = useState([])
  const [user, setUser] = useState(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [liked, setLiked] = useState({})
  const [supported, setSupported] = useState({})
  const [paused, setPaused] = useState(false)
  const [showHeart, setShowHeart] = useState(false)
  const [mixMode, setMixMode] = useState(false)
  const [mixVideo, setMixVideo] = useState(null)
  const [mixStep, setMixStep] = useState('choose') // choose | record | edit | preview
  const [mixLayout, setMixLayout] = useState('side') // side | top | pip
  const [mixFile, setMixFile] = useState(null)
  const [mixFileUrl, setMixFileUrl] = useState(null)
  const [mixFileType, setMixFileType] = useState(null)
  const [mixPrivacy, setMixPrivacy] = useState('public')
  const [mixCaption, setMixCaption] = useState('')
  const [mixBrightness, setMixBrightness] = useState(100)
  const [mixContrast, setMixContrast] = useState(100)
  const [mixSaturation, setMixSaturation] = useState(100)
  const [mixFilter, setMixFilter] = useState('none')
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const videoRef = useRef(null)
  const mixFileRef = useRef(null)
  const touchStartY = useRef(0)
  const touchStartTime = useRef(0)
  const lastTap = useRef(0)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { window.location.href = '/'; return }
      const u = data.session.user
      setUser(u)

      const { data: following } = await supabase
        .from('followers').select('following_id').eq('follower_id', u.id)
      const followingIds = (following||[]).map(f=>f.following_id)

      const { data: vids } = await supabase
        .from('posts')
        .select('*, profiles(id, username, full_name, avatar_url)')
        .eq('media_type', 'video')
        .not('media_url', 'is', null)
        .order('created_at', { ascending: false })

      if (vids) {
        const sorted = [...vids].sort((a,b) => {
          const aF = followingIds.includes(a.user_id)
          const bF = followingIds.includes(b.user_id)
          if (aF && !bF) return -1
          if (!aF && bF) return 1
          return 0
        })
        setVideos(sorted)

        const { data: myLikes } = await supabase
          .from('likes').select('post_id').eq('user_id', u.id)
        const likedMap = {}
        ;(myLikes||[]).forEach(l => { likedMap[l.post_id] = true })
        setLiked(likedMap)

        const supportedMap = {}
        followingIds.forEach(id => { supportedMap[id] = true })
        setSupported(supportedMap)
      }
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.play().catch(()=>{})
      setPaused(false)
    }
    if (videos[currentIndex]) {
      supabase.from('posts').update({ views_count: (videos[currentIndex].views_count||0)+1 }).eq('id', videos[currentIndex].id).then(()=>{})
    }
  }, [currentIndex])

  const goNext = useCallback(() => {
    if (currentIndex < videos.length - 1) setCurrentIndex(i => i + 1)
  }, [currentIndex, videos.length])

  const goPrev = useCallback(() => {
    if (currentIndex > 0) setCurrentIndex(i => i - 1)
  }, [currentIndex])

  const handleTouchStart = (e) => {
    touchStartY.current = e.touches[0].clientY
    touchStartTime.current = Date.now()
  }

  const handleTouchEnd = (e) => {
    const diff = touchStartY.current - e.changedTouches[0].clientY
    const duration = Date.now() - touchStartTime.current
    if (Math.abs(diff) > 50 && duration < 500) {
      if (diff > 0) goNext()
      else goPrev()
    }
  }

  const handleTap = () => {
    const now = Date.now()
    if (now - lastTap.current < 300) {
      handleLike()
      setShowHeart(true)
      setTimeout(() => setShowHeart(false), 900)
    } else {
      togglePlay()
    }
    lastTap.current = now
  }

  const togglePlay = () => {
    if (!videoRef.current) return
    if (videoRef.current.paused) { videoRef.current.play(); setPaused(false) }
    else { videoRef.current.pause(); setPaused(true) }
  }

  const handleLike = async () => {
    if (!user || !videos[currentIndex]) return
    const vid = videos[currentIndex]
    if (liked[vid.id]) {
      await supabase.from('likes').delete().eq('user_id', user.id).eq('post_id', vid.id)
      await supabase.from('posts').update({ likes_count: Math.max((vid.likes_count||1)-1,0) }).eq('id', vid.id)
      setLiked(p=>({...p,[vid.id]:false}))
      setVideos(vs=>vs.map((v,i)=>i===currentIndex?{...v,likes_count:Math.max((v.likes_count||1)-1,0)}:v))
    } else {
      await supabase.from('likes').insert({ user_id: user.id, post_id: vid.id })
      await supabase.from('posts').update({ likes_count: (vid.likes_count||0)+1 }).eq('id', vid.id)
      setLiked(p=>({...p,[vid.id]:true}))
      setVideos(vs=>vs.map((v,i)=>i===currentIndex?{...v,likes_count:(v.likes_count||0)+1}:v))
    }
  }

  const handleSupport = async (profileId) => {
    if (!user || profileId === user.id) return
    if (supported[profileId]) return
    await supabase.from('followers').insert({ follower_id: user.id, following_id: profileId })
    await supabase.from('profiles').update({ followers_count: supabase.rpc('increment', {x:1}) }).eq('id', profileId)
    setSupported(p=>({...p,[profileId]:true}))
  }

  const handleMixFileSelect = (e) => {
    const f = e.target.files[0]
    if (!f) return
    setMixFile(f)
    setMixFileUrl(URL.createObjectURL(f))
    setMixFileType(f.type.startsWith('video')?'video':'photo')
    setMixStep('edit')
  }

  const getMixFilter = () => {
    const filters = {
      none:'',warm:'sepia(0.3) saturate(1.4)',cool:'hue-rotate(30deg)',
      bw:'grayscale(1)',fade:'opacity(0.85) brightness(1.1)',
      vivid:'saturate(1.8)',drama:'contrast(1.3) brightness(0.9)',
    }
    return `brightness(${mixBrightness}%) contrast(${mixContrast}%) saturate(${mixSaturation}%) ${filters[mixFilter]||''}`
  }

  const handleMixUpload = async () => {
    if (!user || !mixVideo) return
    setUploading(true)
    let mediaUrl = null

    if (mixFile) {
      const formData = new FormData()
      formData.append('file', mixFile)
      formData.append('upload_preset', 'echoworld_preset')
      const xhr = new XMLHttpRequest()
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) setUploadProgress(Math.round((e.loaded/e.total)*100))
      }
      mediaUrl = await new Promise(resolve => {
        xhr.onload = () => { const d = JSON.parse(xhr.responseText); resolve(d.secure_url) }
        xhr.open('POST', 'https://api.cloudinary.com/v1_1/dbguxwpa8/auto/upload')
        xhr.send(formData)
      })
    }

    await supabase.from('posts').insert({
      user_id: user.id,
      content: mixCaption,
      media_url: mediaUrl,
      media_type: 'video',
      privacy: mixPrivacy,
      post_format: 'echo',
      remix_of: mixVideo.id,
      remix_of_user: mixVideo.user_id,
    })

    setUploading(false)
    setMixMode(false)
    alert('ECHO MIX uploaded! 🎉')
  }

  const handleDownload = () => {
    if (!mixFileUrl) return
    const a = document.createElement('a')
    a.href = mixFileUrl
    a.download = `echoworld_mix_${Date.now()}.mp4`
    a.click()
  }

  const formatNum = (n) => {
    if (!n) return '0'
    if (n>=1000000) return (n/1000000).toFixed(1)+'M'
    if (n>=1000) return (n/1000).toFixed(1)+'K'
    return n.toString()
  }

  const getName = (vid) => vid.profiles?.full_name || vid.profiles?.username || 'Explorer'
  const getUsername = (vid) => vid.profiles?.username || 'explorer'

  const timeAgo = (date) => {
    const s = Math.floor((new Date()-new Date(date))/1000)
    if (s<60) return 'এইমাত্র'
    if (s<3600) return Math.floor(s/60)+'মি'
    if (s<86400) return Math.floor(s/3600)+'ঘ'
    return Math.floor(s/86400)+'দিন'
  }

  const navItems = [
    {icon:'🏠',label:'Home',path:'/feed'},
    {icon:'🗺',label:'Map',path:'/map'},
    {icon:'📸',label:'Post',path:'/post'},
    {icon:'🏆',label:'Rank',path:'/leaderboard'},
    {icon:'👤',label:'Profile',path:'/profile'},
  ]

  const bottomNav = (
    <div style={{position:'fixed',bottom:0,left:0,right:0,background:'rgba(0,0,0,0.9)',borderTop:'1px solid rgba(255,255,255,0.07)',display:'flex',justifyContent:'space-around',padding:'10px 0 20px',zIndex:400}}>
      {navItems.map(item=>(
        <div key={item.label} onClick={()=>window.location.href=item.path} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'3px',cursor:'pointer',color:'rgba(255,255,255,0.4)'}}>
          <span style={{fontSize:'22px'}}>{item.icon}</span>
          <span style={{fontSize:'10px',fontWeight:'600'}}>{item.label}</span>
        </div>
      ))}
    </div>
  )

  if (loading) return (
    <div style={{height:'100vh',background:'#000',display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:'12px'}}>
      <div style={{fontSize:'40px'}}>⚡</div>
      <div style={{color:'#4a5568',fontSize:'14px'}}>Loading ECHO...</div>
    </div>
  )

  if (videos.length === 0) return (
    <div style={{height:'100vh',background:'#000',display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:'16px',color:'#fff',padding:'24px',textAlign:'center',paddingBottom:'80px'}}>
      <div style={{fontSize:'56px'}}>⚡</div>
      <div style={{fontSize:'22px',fontWeight:'800'}}>No ECHO Videos</div>
      <button onClick={()=>window.location.href='/post'} style={{background:'linear-gradient(135deg,#00e5ff,#00ff88)',border:'none',borderRadius:'14px',padding:'14px 36px',fontSize:'15px',fontWeight:'800',color:'#000',cursor:'pointer'}}>⚡ Create ECHO</button>
      <button onClick={()=>window.location.href='/feed'} style={{background:'none',border:'1px solid #222',borderRadius:'12px',padding:'10px 24px',fontSize:'13px',color:'#555',cursor:'pointer'}}>← Back</button>
      {bottomNav}
    </div>
  )

  // MIX MODE
  if (mixMode && mixVideo) {
    // STEP: CHOOSE
    if (mixStep === 'choose') return (
      <div style={{minHeight:'100vh',background:'#070a10',color:'#eef2f7',paddingBottom:'80px'}}>
        <div style={{position:'fixed',top:0,left:0,right:0,background:'rgba(7,10,16,0.97)',padding:'0 16px',height:'56px',display:'flex',alignItems:'center',justifyContent:'space-between',zIndex:100,borderBottom:'1px solid rgba(255,255,255,0.07)'}}>
          <button onClick={()=>{setMixMode(false);setMixStep('choose')}} style={{background:'none',border:'none',color:'#8892a4',fontSize:'24px',cursor:'pointer'}}>←</button>
          <div style={{fontSize:'15px',fontWeight:'800',background:'linear-gradient(90deg,#ffa500,#ff6b35)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>🔀 ECHO MIX</div>
          <div style={{width:'40px'}}/>
        </div>

        <div style={{padding:'72px 16px 20px'}}>
          {/* Original video preview */}
          <div style={{borderRadius:'16px',overflow:'hidden',marginBottom:'16px',position:'relative'}}>
            <video src={mixVideo.media_url} style={{width:'100%',maxHeight:'200px',objectFit:'cover'}} playsInline muted loop autoPlay/>
            <div style={{position:'absolute',bottom:'8px',left:'10px',background:'rgba(0,0,0,0.7)',borderRadius:'8px',padding:'4px 10px',fontSize:'12px',color:'#fff'}}>
              Original by @{getUsername(mixVideo)}
            </div>
          </div>

          <div style={{fontSize:'13px',color:'#4a5568',marginBottom:'16px',textAlign:'center'}}>Choose how to MIX this video</div>

          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}}>
            {[
              {icon:'🎥',label:'Record with Camera',desc:'Use your camera live',action:'camera'},
              {icon:'📁',label:'Upload Video/Photo',desc:'From your gallery',action:'upload'},
              {icon:'🔊',label:'Use Audio Only',desc:'Keep original audio',action:'audio'},
            ].map(opt => (
              <div key={opt.action}
                onClick={()=>{
                  if (opt.action==='upload') mixFileRef.current?.click()
                  else if (opt.action==='audio') setMixStep('edit')
                  else alert('Camera recording coming soon! Use Upload for now.')
                }}
                style={{background:'#111620',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'16px',padding:'20px',cursor:'pointer',textAlign:'center'}}>
                <div style={{fontSize:'32px',marginBottom:'8px'}}>{opt.icon}</div>
                <div style={{fontSize:'13px',fontWeight:'700',marginBottom:'4px'}}>{opt.label}</div>
                <div style={{fontSize:'11px',color:'#4a5568'}}>{opt.desc}</div>
              </div>
            ))}
          </div>

          <input ref={mixFileRef} type="file" accept="image/*,video/*" onChange={handleMixFileSelect} style={{display:'none'}}/>

          {/* Layout selector */}
          <div style={{marginTop:'20px'}}>
            <div style={{fontSize:'12px',color:'#4a5568',fontWeight:'600',marginBottom:'10px'}}>LAYOUT</div>
            <div style={{display:'flex',gap:'8px'}}>
              {[
                {key:'side',label:'◫ Side by Side'},
                {key:'top',label:'⬒ Top / Bottom'},
                {key:'pip',label:'⊡ Picture in Picture'},
              ].map(l => (
                <button key={l.key} onClick={()=>setMixLayout(l.key)} style={{flex:1,padding:'8px',borderRadius:'10px',border:`2px solid ${mixLayout===l.key?'#ffa500':'rgba(255,255,255,0.07)'}`,background:mixLayout===l.key?'rgba(255,165,0,0.1)':'rgba(255,255,255,0.02)',color:mixLayout===l.key?'#ffa500':'#4a5568',fontSize:'11px',fontWeight:'600',cursor:'pointer'}}>
                  {l.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        {bottomNav}
      </div>
    )

    // STEP: EDIT
    if (mixStep === 'edit') return (
      <div style={{minHeight:'100vh',background:'#070a10',color:'#eef2f7',paddingBottom:'80px'}}>
        <div style={{position:'fixed',top:0,left:0,right:0,background:'rgba(7,10,16,0.97)',padding:'0 16px',height:'56px',display:'flex',alignItems:'center',justifyContent:'space-between',zIndex:100,borderBottom:'1px solid rgba(255,255,255,0.07)'}}>
          <button onClick={()=>setMixStep('choose')} style={{background:'none',border:'none',color:'#8892a4',fontSize:'24px',cursor:'pointer'}}>←</button>
          <div style={{fontSize:'15px',fontWeight:'800',color:'#ffa500'}}>✂️ Edit MIX</div>
          <button onClick={()=>setMixStep('preview')} style={{background:'linear-gradient(135deg,#ffa500,#ff6b35)',border:'none',borderRadius:'20px',padding:'8px 16px',fontSize:'13px',fontWeight:'700',color:'#fff',cursor:'pointer'}}>Preview →</button>
        </div>

        <div style={{padding:'72px 16px 20px'}}>
          {/* Preview layout */}
          <div style={{borderRadius:'16px',overflow:'hidden',marginBottom:'16px',background:'#000',position:'relative'}}>
            {mixLayout==='side' ? (
              <div style={{display:'flex',height:'200px'}}>
                <video src={mixVideo.media_url} style={{flex:1,objectFit:'cover'}} playsInline muted loop autoPlay/>
                {mixFileUrl && (
                  mixFileType==='video'
                    ? <video src={mixFileUrl} style={{flex:1,objectFit:'cover',filter:getMixFilter()}} playsInline muted loop autoPlay/>
                    : <img src={mixFileUrl} style={{flex:1,objectFit:'cover',filter:getMixFilter()}}/>
                )}
              </div>
            ) : mixLayout==='top' ? (
              <div style={{height:'300px',position:'relative'}}>
                <video src={mixVideo.media_url} style={{width:'100%',height:'150px',objectFit:'cover'}} playsInline muted loop autoPlay/>
                {mixFileUrl && (
                  mixFileType==='video'
                    ? <video src={mixFileUrl} style={{width:'100%',height:'150px',objectFit:'cover',filter:getMixFilter()}} playsInline muted loop autoPlay/>
                    : <img src={mixFileUrl} style={{width:'100%',height:'150px',objectFit:'cover',filter:getMixFilter()}}/>
                )}
              </div>
            ) : (
              <div style={{height:'250px',position:'relative'}}>
                <video src={mixVideo.media_url} style={{width:'100%',height:'100%',objectFit:'cover'}} playsInline muted loop autoPlay/>
                {mixFileUrl && (
                  <div style={{position:'absolute',bottom:'12px',right:'12px',width:'100px',height:'140px',borderRadius:'10px',overflow:'hidden',border:'2px solid #ffa500'}}>
                    {mixFileType==='video'
                      ? <video src={mixFileUrl} style={{width:'100%',height:'100%',objectFit:'cover',filter:getMixFilter()}} playsInline muted loop autoPlay/>
                      : <img src={mixFileUrl} style={{width:'100%',height:'100%',objectFit:'cover',filter:getMixFilter()}}/>
                    }
                  </div>
                )}
              </div>
            )}

            {/* Original credit */}
            <div style={{position:'absolute',bottom:'8px',left:'10px',background:'rgba(0,0,0,0.7)',borderRadius:'8px',padding:'3px 8px',fontSize:'11px',color:'#ffa500'}}>
              🔀 MIX · @{getUsername(mixVideo)}
            </div>
          </div>

          {/* Filters */}
          {mixFileUrl && (
            <>
              <div style={{fontSize:'12px',color:'#4a5568',fontWeight:'600',marginBottom:'8px'}}>FILTERS</div>
              <div style={{display:'flex',gap:'8px',overflowX:'auto',paddingBottom:'8px',marginBottom:'12px',scrollbarWidth:'none'}}>
                {['none','warm','cool','bw','fade','vivid','drama'].map(f => (
                  <div key={f} onClick={()=>setMixFilter(f)} style={{flexShrink:0,textAlign:'center',cursor:'pointer'}}>
                    <div style={{width:'55px',height:'55px',borderRadius:'10px',overflow:'hidden',border:`2px solid ${mixFilter===f?'#ffa500':'transparent'}`,marginBottom:'4px',background:'#1a2030'}}>
                      {mixFileUrl && (mixFileType==='photo'
                        ? <img src={mixFileUrl} style={{width:'100%',height:'100%',objectFit:'cover',filter:f==='none'?'':f==='warm'?'sepia(0.3) saturate(1.4)':f==='cool'?'hue-rotate(30deg)':f==='bw'?'grayscale(1)':f==='fade'?'opacity(0.85) brightness(1.1)':f==='vivid'?'saturate(1.8)':'contrast(1.3) brightness(0.9)'}}/>
                        : <div style={{width:'100%',height:'100%',background:'#2a3040',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'18px'}}>🎬</div>
                      )}
                    </div>
                    <div style={{fontSize:'9px',color:mixFilter===f?'#ffa500':'#4a5568',fontWeight:'600',textTransform:'capitalize'}}>{f}</div>
                  </div>
                ))}
              </div>

              {/* Adjustments */}
              <div style={{marginBottom:'16px'}}>
                {[
                  {label:'☀️ Brightness',value:mixBrightness,setter:setMixBrightness,min:50,max:150},
                  {label:'◑ Contrast',value:mixContrast,setter:setMixContrast,min:50,max:150},
                  {label:'🎨 Saturation',value:mixSaturation,setter:setMixSaturation,min:0,max:200},
                ].map(adj => (
                  <div key={adj.label} style={{marginBottom:'12px'}}>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:'4px'}}>
                      <span style={{fontSize:'12px',color:'#8892a4'}}>{adj.label}</span>
                      <span style={{fontSize:'12px',color:'#ffa500',fontWeight:'600'}}>{adj.value}%</span>
                    </div>
                    <input type="range" min={adj.min} max={adj.max} value={adj.value} onChange={e=>adj.setter(Number(e.target.value))} style={{width:'100%',accentColor:'#ffa500'}}/>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Caption */}
          <textarea placeholder="Add caption..." value={mixCaption} onChange={e=>setMixCaption(e.target.value)}
            style={{width:'100%',background:'#111620',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'12px',padding:'12px',color:'#eef2f7',fontSize:'13px',resize:'none',minHeight:'70px',outline:'none',boxSizing:'border-box',marginBottom:'12px'}}/>

          {/* Privacy */}
          <div style={{display:'flex',gap:'8px',marginBottom:'16px'}}>
            {[
              {key:'public',label:'🌍 Public'},
              {key:'friends',label:'👥 Supporters'},
              {key:'private',label:'🔒 Private'},
              {key:'capsule',label:'📦 Capsule'},
            ].map(p => (
              <button key={p.key} onClick={()=>setMixPrivacy(p.key)} style={{flex:1,padding:'7px 4px',borderRadius:'8px',border:'none',cursor:'pointer',fontSize:'10px',fontWeight:'600',background:mixPrivacy===p.key?'linear-gradient(135deg,#ffa500,#ff6b35)':'rgba(255,255,255,0.05)',color:mixPrivacy===p.key?'#fff':'#4a5568'}}>
                {p.label}
              </button>
            ))}
          </div>
        </div>
        {bottomNav}
      </div>
    )

    // STEP: PREVIEW
    return (
      <div style={{minHeight:'100vh',background:'#070a10',color:'#eef2f7',paddingBottom:'80px'}}>
        <div style={{position:'fixed',top:0,left:0,right:0,background:'rgba(7,10,16,0.97)',padding:'0 16px',height:'56px',display:'flex',alignItems:'center',justifyContent:'space-between',zIndex:100,borderBottom:'1px solid rgba(255,255,255,0.07)'}}>
          <button onClick={()=>setMixStep('edit')} style={{background:'none',border:'none',color:'#8892a4',fontSize:'24px',cursor:'pointer'}}>←</button>
          <div style={{fontSize:'15px',fontWeight:'800',color:'#ffa500'}}>🔀 Preview MIX</div>
          <div style={{width:'40px'}}/>
        </div>

        <div style={{padding:'72px 16px 20px'}}>
          {/* Preview */}
          <div style={{borderRadius:'16px',overflow:'hidden',marginBottom:'20px',background:'#000',position:'relative'}}>
            {mixLayout==='side' ? (
              <div style={{display:'flex',height:'300px'}}>
                <video src={mixVideo.media_url} style={{flex:1,objectFit:'cover'}} playsInline muted loop autoPlay/>
                {mixFileUrl ? (
                  mixFileType==='video'
                    ? <video src={mixFileUrl} style={{flex:1,objectFit:'cover',filter:getMixFilter()}} playsInline muted loop autoPlay/>
                    : <img src={mixFileUrl} style={{flex:1,objectFit:'cover',filter:getMixFilter()}}/>
                ) : <div style={{flex:1,background:'#1a2030',display:'flex',alignItems:'center',justifyContent:'center',color:'#4a5568',fontSize:'12px'}}>Your content here</div>}
              </div>
            ) : mixLayout==='top' ? (
              <div style={{height:'400px'}}>
                <video src={mixVideo.media_url} style={{width:'100%',height:'200px',objectFit:'cover'}} playsInline muted loop autoPlay/>
                {mixFileUrl ? (
                  mixFileType==='video'
                    ? <video src={mixFileUrl} style={{width:'100%',height:'200px',objectFit:'cover',filter:getMixFilter()}} playsInline muted loop autoPlay/>
                    : <img src={mixFileUrl} style={{width:'100%',height:'200px',objectFit:'cover',filter:getMixFilter()}}/>
                ) : <div style={{width:'100%',height:'200px',background:'#1a2030',display:'flex',alignItems:'center',justifyContent:'center',color:'#4a5568',fontSize:'12px'}}>Your content here</div>}
              </div>
            ) : (
              <div style={{height:'350px',position:'relative'}}>
                <video src={mixVideo.media_url} style={{width:'100%',height:'100%',objectFit:'cover'}} playsInline muted loop autoPlay/>
                {mixFileUrl && (
                  <div style={{position:'absolute',bottom:'16px',right:'16px',width:'110px',height:'160px',borderRadius:'12px',overflow:'hidden',border:'2px solid #ffa500'}}>
                    {mixFileType==='video'
                      ? <video src={mixFileUrl} style={{width:'100%',height:'100%',objectFit:'cover',filter:getMixFilter()}} playsInline muted loop autoPlay/>
                      : <img src={mixFileUrl} style={{width:'100%',height:'100%',objectFit:'cover',filter:getMixFilter()}}/>
                    }
                  </div>
                )}
              </div>
            )}

            {/* Watermark */}
            <div style={{position:'absolute',top:'10px',left:'10px',background:'rgba(0,0,0,0.6)',borderRadius:'8px',padding:'4px 10px',display:'flex',alignItems:'center',gap:'6px'}}>
              <span style={{fontSize:'12px',fontWeight:'900',background:'linear-gradient(90deg,#00e5ff,#00ff88)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>⬡ ECHO WORLD</span>
            </div>

            {/* MIX credit */}
            <div style={{position:'absolute',bottom:'8px',left:'10px',background:'rgba(0,0,0,0.7)',borderRadius:'8px',padding:'3px 8px',fontSize:'11px',color:'#ffa500'}}>
              🔀 MIX · @{getUsername(mixVideo)}
            </div>
          </div>

          {mixCaption && <div style={{fontSize:'14px',color:'#8892a4',marginBottom:'16px',padding:'0 4px'}}>{mixCaption}</div>}

          <div style={{display:'flex',gap:'10px',marginBottom:'16px'}}>
            <button onClick={handleDownload} style={{flex:1,padding:'14px',background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'14px',color:'#eef2f7',fontSize:'14px',fontWeight:'700',cursor:'pointer'}}>
              ⬇ Download
            </button>
            <button onClick={handleMixUpload} disabled={uploading} style={{flex:2,padding:'14px',background:'linear-gradient(135deg,#ffa500,#ff6b35)',border:'none',borderRadius:'14px',color:'#fff',fontSize:'14px',fontWeight:'800',cursor:'pointer',opacity:uploading?0.7:1}}>
              {uploading ? `Uploading ${uploadProgress}%...` : '⚡ Upload MIX'}
            </button>
          </div>

          {uploading && (
            <div style={{background:'#111620',borderRadius:'12px',padding:'12px'}}>
              <div style={{height:'4px',background:'rgba(255,255,255,0.05)',borderRadius:'2px'}}>
                <div style={{height:'100%',width:`${uploadProgress}%`,background:'linear-gradient(90deg,#ffa500,#ff6b35)',borderRadius:'2px',transition:'width 0.3s'}}/>
              </div>
            </div>
          )}
        </div>
        {bottomNav}
      </div>
    )
  }

  const vid = videos[currentIndex]

  return (
    <div
      style={{height:'100vh',background:'#000',overflow:'hidden',position:'relative',userSelect:'none'}}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onClick={handleTap}
    >
      {/* Video — TikTok/Reels size */}
      <video
        ref={videoRef}
        key={vid.id}
        src={vid.media_url}
        style={{position:'absolute',top:0,left:0,width:'100%',height:'100%',objectFit:'cover'}}
        loop playsInline autoPlay
      />

      {/* Double tap heart */}
      {showHeart && (
        <div style={{position:'absolute',top:'50%',left:'50%',transform:'translate(-50%,-50%)',fontSize:'80px',zIndex:400,pointerEvents:'none'}}>
          ❤️
        </div>
      )}

      {/* Pause */}
      {paused && (
        <div style={{position:'absolute',top:'50%',left:'50%',transform:'translate(-50%,-50%)',background:'rgba(0,0,0,0.5)',borderRadius:'50%',width:'70px',height:'70px',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'28px',pointerEvents:'none',zIndex:200}}>▶️</div>
      )}

      {/* Gradient overlay */}
      <div style={{position:'absolute',inset:0,background:'linear-gradient(to top,rgba(0,0,0,0.92) 0%,transparent 45%,rgba(0,0,0,0.15) 100%)',pointerEvents:'none',zIndex:100}}/>

      {/* TOP BAR */}
      <div style={{position:'fixed',top:0,left:0,right:0,zIndex:300,display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 16px'}}>
        <button onClick={()=>window.location.href='/feed'} style={{background:'rgba(0,0,0,0.4)',border:'none',borderRadius:'50%',width:'38px',height:'38px',color:'#fff',fontSize:'18px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',backdropFilter:'blur(4px)'}}>←</button>
        <div style={{fontSize:'15px',fontWeight:'900',background:'linear-gradient(90deg,#00e5ff,#00ff88)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>⚡ ECHO</div>
        <button onClick={(e)=>{e.stopPropagation();setShowSearch(!showSearch)}} style={{background:'rgba(0,0,0,0.4)',border:'none',borderRadius:'50%',width:'38px',height:'38px',color:'#fff',fontSize:'18px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',backdropFilter:'blur(4px)'}}>🔍</button>
      </div>

      {/* Search bar */}
      {showSearch && (
        <div style={{position:'fixed',top:'60px',left:'16px',right:'16px',zIndex:300}} onClick={e=>e.stopPropagation()}>
          <input
            value={searchQuery}
            onChange={e=>setSearchQuery(e.target.value)}
            placeholder="Search videos..."
            autoFocus
            style={{width:'100%',background:'rgba(0,0,0,0.8)',border:'1px solid rgba(255,255,255,0.2)',borderRadius:'20px',padding:'10px 16px',color:'#fff',fontSize:'14px',outline:'none',boxSizing:'border-box',backdropFilter:'blur(8px)'}}
          />
        </div>
      )}

      {/* USER INFO — bottom left */}
      <div style={{position:'absolute',bottom:'90px',left:'16px',right:'80px',zIndex:200}}>
        <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'8px'}}>
          {/* Avatar with support button */}
          <div style={{position:'relative',flexShrink:0}} onClick={(e)=>{e.stopPropagation();vid.profiles?.id&&(window.location.href=`/user/${vid.profiles.id}`)}}>
            <div style={{width:'50px',height:'50px',borderRadius:'50%',border:'2px solid rgba(255,255,255,0.8)',overflow:'hidden',background:'linear-gradient(135deg,#00e5ff,#00ff88)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}}>
              {vid.profiles?.avatar_url
                ? <img src={vid.profiles.avatar_url} style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                : <span style={{fontWeight:'800',color:'#000',fontSize:'20px'}}>{getName(vid)[0]?.toUpperCase()}</span>
              }
            </div>
            {/* Support + button */}
            {user?.id !== vid.profiles?.id && !supported[vid.profiles?.id] && (
              <div onClick={(e)=>{e.stopPropagation();handleSupport(vid.profiles?.id)}} style={{position:'absolute',bottom:'-4px',right:'-4px',width:'20px',height:'20px',borderRadius:'50%',background:'#ff4560',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',border:'2px solid #000',fontSize:'12px',fontWeight:'800',color:'#fff',lineHeight:1}}>+</div>
            )}
          </div>
          <div onClick={(e)=>{e.stopPropagation();vid.profiles?.id&&(window.location.href=`/user/${vid.profiles.id}`)}} style={{cursor:'pointer'}}>
            <div style={{color:'#fff',fontWeight:'700',fontSize:'15px',textShadow:'0 1px 4px rgba(0,0,0,0.8)'}}>{getName(vid)}</div>
            <div style={{color:'rgba(255,255,255,0.6)',fontSize:'12px'}}>@{getUsername(vid)} · {timeAgo(vid.created_at)}</div>
          </div>
        </div>
        {vid.location_name && <div style={{color:'rgba(255,255,255,0.8)',fontSize:'12px',marginBottom:'4px'}}>📍 {vid.location_name}</div>}
        {vid.content && <div style={{color:'rgba(255,255,255,0.9)',fontSize:'13px',lineHeight:'1.5',textShadow:'0 1px 3px rgba(0,0,0,0.8)'}}>{vid.content}</div>}
        {vid.hashtags && <div style={{color:'#00e5ff',fontSize:'12px',marginTop:'4px'}}>{vid.hashtags}</div>}
        {/* Original MIX credit */}
        {vid.remix_of_user && (
          <div style={{marginTop:'6px',background:'rgba(255,165,0,0.15)',borderRadius:'8px',padding:'4px 10px',fontSize:'11px',color:'#ffa500',display:'inline-block'}}>
            🔀 MIX · @{vid.remix_username||'someone'}
          </div>
        )}
      </div>

      {/* ACTION BUTTONS — right */}
      <div style={{position:'absolute',bottom:'90px',right:'12px',zIndex:200,display:'flex',flexDirection:'column',gap:'14px',alignItems:'center'}}>

        {/* Profile */}
        <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'3px'}}>
          <button onClick={(e)=>{e.stopPropagation();vid.profiles?.id&&(window.location.href=`/user/${vid.profiles.id}`)}} style={{width:'50px',height:'50px',borderRadius:'50%',overflow:'hidden',background:'linear-gradient(135deg,#00e5ff,#00ff88)',border:'2px solid rgba(255,255,255,0.5)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
            {vid.profiles?.avatar_url
              ? <img src={vid.profiles.avatar_url} style={{width:'100%',height:'100%',objectFit:'cover'}}/>
              : <span style={{fontWeight:'800',color:'#000',fontSize:'18px'}}>{getName(vid)[0]?.toUpperCase()}</span>
            }
          </button>
          <span style={{color:'rgba(255,255,255,0.6)',fontSize:'10px'}}>Profile</span>
        </div>

        {/* Like */}
        <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'3px'}}>
          <button onClick={(e)=>{e.stopPropagation();handleLike()}} style={{width:'50px',height:'50px',borderRadius:'50%',background:liked[vid.id]?'rgba(255,69,96,0.3)':'rgba(0,0,0,0.4)',border:`2px solid ${liked[vid.id]?'#ff4560':'rgba(255,255,255,0.4)'}`,fontSize:'22px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',transition:'all 0.2s',transform:liked[vid.id]?'scale(1.1)':'scale(1)'}}>
            {liked[vid.id]?'❤️':'🤍'}
          </button>
          <span style={{color:'#fff',fontSize:'11px',fontWeight:'700'}}>{formatNum(vid.likes_count)}</span>
        </div>

        {/* Comment */}
        <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'3px'}}>
          <button onClick={(e)=>e.stopPropagation()} style={{width:'50px',height:'50px',borderRadius:'50%',background:'rgba(0,0,0,0.4)',border:'2px solid rgba(255,255,255,0.4)',fontSize:'22px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>💬</button>
          <span style={{color:'#fff',fontSize:'11px',fontWeight:'700'}}>{formatNum(vid.comments_count)}</span>
        </div>

        {/* Share */}
        <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'3px'}}>
          <button onClick={(e)=>{e.stopPropagation();navigator.share?.({text:vid.content||'',url:window.location.href})}} style={{width:'50px',height:'50px',borderRadius:'50%',background:'rgba(0,0,0,0.4)',border:'2px solid rgba(255,255,255,0.4)',fontSize:'22px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>↗</button>
          <span style={{color:'#fff',fontSize:'11px',fontWeight:'700'}}>Share</span>
        </div>

        {/* MIX */}
        <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'3px'}}>
          <button onClick={(e)=>{e.stopPropagation();setMixVideo(vid);setMixMode(true);setMixStep('choose')}} style={{width:'50px',height:'50px',borderRadius:'50%',background:'rgba(255,165,0,0.2)',border:'2px solid rgba(255,165,0,0.6)',fontSize:'20px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>🔀</button>
          <span style={{color:'#ffa500',fontSize:'11px',fontWeight:'700'}}>MIX</span>
        </div>

        {/* Map */}
        <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'3px'}}>
          <button onClick={(e)=>{e.stopPropagation();window.location.href='/map'}} style={{width:'50px',height:'50px',borderRadius:'50%',background:'rgba(0,229,255,0.15)',border:'2px solid rgba(0,229,255,0.4)',fontSize:'20px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>🗺</button>
          <span style={{color:'#00e5ff',fontSize:'11px',fontWeight:'700'}}>Map</span>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{position:'absolute',right:'4px',top:'50%',transform:'translateY(-50%)',display:'flex',flexDirection:'column',gap:'4px',zIndex:200}}>
        {videos.slice(Math.max(0,currentIndex-4),currentIndex+5).map((_,i)=>{
          const ri = Math.max(0,currentIndex-4)+i
          return <div key={ri} onClick={(e)=>{e.stopPropagation();setCurrentIndex(ri)}} style={{width:'3px',height:ri===currentIndex?'22px':'5px',borderRadius:'2px',background:ri===currentIndex?'#00e5ff':'rgba(255,255,255,0.25)',cursor:'pointer',transition:'all 0.3s'}}/>
        })}
      </div>

      {/* Counter */}
      <div style={{position:'absolute',top:'62px',right:'16px',zIndex:200,background:'rgba(0,0,0,0.5)',borderRadius:'16px',padding:'3px 10px',color:'#fff',fontSize:'11px',fontWeight:'700',backdropFilter:'blur(4px)'}}>
        {currentIndex+1}/{videos.length}
      </div>

      {bottomNav}

      <style>{`
        @keyframes heartPop {
          0%{transform:translate(-50%,-50%) scale(0);opacity:1}
          50%{transform:translate(-50%,-50%) scale(1.3);opacity:1}
          100%{transform:translate(-50%,-80%) scale(1);opacity:0}
        }
      `}</style>
    </div>
  )
    }
