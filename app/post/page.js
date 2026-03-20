'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const CLOUD_NAME    = 'dbguxwpa8'
const UPLOAD_PRESET = 'echoworld_preset'

// ─────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────
const POST_TYPES = [
  { key:'regular', icon:'🌍', label:'Post',    desc:'Share with the world',       color:'#00e5ff', glow:'rgba(0,229,255,.4)'  },
  { key:'echo',    icon:'⚡', label:'ECHO',    desc:'Vertical video feed',        color:'#ff6b35', glow:'rgba(255,107,53,.4)' },
  { key:'capsule', icon:'📦', label:'Capsule', desc:'Hidden by location & time',  color:'#ffca28', glow:'rgba(255,202,40,.4)' },
]

const PRIVACY = [
  { key:'public',  icon:'🌍', label:'Public'   },
  { key:'friends', icon:'👥', label:'Friends'  },
  { key:'private', icon:'🔒', label:'Only Me'  },
]

const VIBES = [
  {v:'😊 Happy',    color:'#ffd700'}, {v:'😎 Chill',    color:'#00e5ff'},
  {v:'🔥 Fire',     color:'#ff6b35'}, {v:'🌧 Moody',    color:'#a78bfa'},
  {v:'💪 Motivated',color:'#00ff88'}, {v:'🎉 Party',    color:'#ff6b9d'},
  {v:'🌿 Nature',   color:'#4ade80'}, {v:'🏙 Urban',    color:'#94a3b8'},
  {v:'✨ Aesthetic', color:'#c084fc'}, {v:'🧠 Deep',     color:'#38bdf8'},
  {v:'🌊 Calm',     color:'#0ea5e9'}, {v:'🎨 Creative', color:'#f472b6'},
]

const FONTS = [
  {key:'default', label:'Default', style:{}},
  {key:'sora',    label:'Sora',    style:{fontFamily:"'Sora',sans-serif",fontWeight:700}},
  {key:'mono',    label:'Mono',    style:{fontFamily:'monospace',letterSpacing:'.5px'}},
  {key:'serif',   label:'Serif',   style:{fontFamily:'Georgia,serif',fontStyle:'italic'}},
]

const TEXT_COLORS = ['#eef2f7','#00e5ff','#00ff88','#ffca28','#ff6b35','#ff6b9d','#a78bfa','#ff4560']

const BG_GRADIENTS = [
  null,
  'linear-gradient(135deg,#0d1f3c,#1a3a5c)',
  'linear-gradient(135deg,#1a0d2e,#2d1b4e)',
  'linear-gradient(135deg,#0d2e1a,#1b4e2d)',
  'linear-gradient(135deg,#2e1a0d,#4e2d1b)',
  'linear-gradient(135deg,#1a1a1a,#2d2d2d)',
  'linear-gradient(135deg,#0d1f3c 0%,#1a0d2e 50%,#2e1a0d 100%)',
]

const STICKERS = ['🔥','⚡','💎','🌟','🏆','❤️','🚀','🎯','💫','🌈','🎭','🦋','🌊','⭐','🎪','🎨','🎵','💥','🌙','☀️']

const FILTERS = [
  {key:'none',    label:'Original', css:'none'},
  {key:'warm',    label:'Warm',     css:'sepia(30%) saturate(120%) brightness(105%)'},
  {key:'cool',    label:'Cool',     css:'hue-rotate(15deg) saturate(110%) brightness(95%)'},
  {key:'vivid',   label:'Vivid',    css:'saturate(160%) contrast(110%)'},
  {key:'fade',    label:'Fade',     css:'opacity(.9) brightness(108%) saturate(80%)'},
  {key:'mono',    label:'B&W',      css:'grayscale(100%)'},
  {key:'drama',   label:'Drama',    css:'contrast(130%) brightness(90%) saturate(110%)'},
]

const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800;900&family=DM+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap');
  *{box-sizing:border-box;margin:0;padding:0}
  ::-webkit-scrollbar{display:none}
  body,html{font-family:'DM Sans',system-ui,sans-serif;background:#060810;color:#eef2f7}
  input,textarea,select{font-family:'DM Sans',system-ui,sans-serif}
  input::placeholder,textarea::placeholder{color:#2a3040}
  @keyframes spin    { to{transform:rotate(360deg)} }
  @keyframes fadeUp  { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }
  @keyframes fadeIn  { from{opacity:0} to{opacity:1} }
  @keyframes popIn   { 0%{transform:scale(.65);opacity:0} 65%{transform:scale(1.08)} 100%{transform:scale(1);opacity:1} }
  @keyframes slideUp { from{transform:translateY(105%)} to{transform:translateY(0)} }
  @keyframes shimmer { 0%{background-position:-500px 0} 100%{background-position:500px 0} }
  @keyframes ripple  { 0%{transform:scale(0);opacity:.5} 100%{transform:scale(4);opacity:0} }
  @keyframes glowPulse{0%,100%{opacity:.4}50%{opacity:.9}}
  @keyframes borderDance{0%{background-position:0% 0%}100%{background-position:200% 0%}}
  @keyframes typeIn  { from{opacity:0;transform:translateX(-6px)} to{opacity:1;transform:translateX(0)} }
  @keyframes confetti{ 0%{transform:translateY(0) rotate(0deg);opacity:1} 100%{transform:translateY(-200px) rotate(720deg);opacity:0} }
  @keyframes uploadFill{from{width:0%} to{width:100%}}
  .btn-tap:active{transform:scale(.93)!important;transition:transform .08s!important}
  .card-hover{transition:all .2s}
  .card-hover:active{transform:scale(.97);background:rgba(255,255,255,.06)!important}
`

// ─────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────
export default function Post() {
  const [user,    setUser]    = useState(null)
  const [profile, setProfile] = useState(null)

  // ── Post Content ──
  const [postType,       setPostType]       = useState('regular')
  const [content,        setContent]        = useState('')
  const [title,          setTitle]          = useState('')
  const [hashtags,       setHashtags]       = useState('')
  const [privacy,        setPrivacy]        = useState('public')
  const [selectedVibes,  setSelectedVibes]  = useState([])
  const [charCount,      setCharCount]      = useState(0)

  // ── Text styling ──
  const [textFont,       setTextFont]       = useState('default')
  const [textColor,      setTextColor]      = useState('#eef2f7')
  const [bgGradient,     setBgGradient]     = useState(null)
  const [selectedSticker,setSelectedSticker]= useState(null)
  const [showStyling,    setShowStyling]    = useState(false)

  // ── Media ──
  const [mediaFile,      setMediaFile]      = useState(null)
  const [mediaUrl,       setMediaUrl]       = useState(null)
  const [mediaType,      setMediaType]      = useState(null)
  const [selectedFilter, setSelectedFilter] = useState('none')
  const [showFilters,    setShowFilters]    = useState(false)
  const [mediaDuration,  setMediaDuration]  = useState(null)
  const [mediaSize,      setMediaSize]      = useState(null)
  const fileInputRef   = useRef(null)
  const imageInputRef  = useRef(null)
  const videoInputRef  = useRef(null)

  // ── Upload ──
  const [uploading,      setUploading]      = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadStage,    setUploadStage]    = useState('')
  const [posted,         setPosted]         = useState(false)
  const [postError,      setPostError]      = useState(null)

  // ── Camera ──
  const [cameraMode,     setCameraMode]     = useState(false)
  const [cameraFacing,   setCameraFacing]   = useState('user')
  const [cameraStream,   setCameraStream]   = useState(null)
  const [recording,      setRecording]      = useState(false)
  const [recordingTime,  setRecordingTime]  = useState(0)
  const [flashMode,      setFlashMode]      = useState(false)
  const [zoom,           setZoom]           = useState(1)
  const cameraRef       = useRef(null)
  const mediaRecRef     = useRef(null)
  const recordChunks    = useRef([])
  const recordTimer     = useRef(null)
  const flashRef        = useRef(null)

  // ── Location ──
  const [locationEnabled,   setLocationEnabled]   = useState(false)
  const [locationName,      setLocationName]       = useState('')
  const [locationCoords,    setLocationCoords]     = useState(null)
  const [detectingLoc,      setDetectingLoc]       = useState(false)
  const [locationSearchMode,setLocationSearchMode] = useState(false)
  const [locationQuery,     setLocationQuery]      = useState('')
  const [locationSuggestions,setLocationSuggestions]=useState([])

  // ── Capsule ──
  const [capsuleRadius,     setCapsuleRadius]      = useState(300)
  const [capsuleUnlockDate, setCapsuleUnlockDate]  = useState('')
  const [capsuleMessage,    setCapsuleMessage]     = useState('')
  const [capsuleHint,       setCapsuleHint]        = useState('')

  // ── Drafts ──
  const [drafts,            setDrafts]             = useState([])
  const [showDrafts,        setShowDrafts]         = useState(false)
  const [draftSaved,        setDraftSaved]         = useState(false)

  // ── Poll ──
  const [isPoll,            setIsPoll]             = useState(false)
  const [pollOptions,       setPollOptions]        = useState(['',''])
  const [pollDuration,      setPollDuration]       = useState(24)

  // ── Link preview ──
  const [detectedLink,      setDetectedLink]       = useState(null)
  const [showLinkPreview,   setShowLinkPreview]    = useState(true)

  // ── Confetti ──
  const [confetti,          setConfetti]           = useState([])

  // ── Tab (mobile nav) ──
  const [activeSection,     setActiveSection]      = useState('write') // write | style | extras

  const textareaRef = useRef(null)

  // ─────────────────────────────────────────────
  // INIT
  // ─────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { window.location.href = '/'; return }
      const u = data.session.user
      setUser(u)
      const { data: p } = await supabase.from('profiles').select('*').eq('id', u.id).single()
      setProfile(p)
    })
    // Load drafts
    try {
      const saved = JSON.parse(localStorage.getItem('echo_drafts')||'[]')
      setDrafts(saved)
    } catch {}
  }, [])

  // ─── Char counter ───
  useEffect(() => {
    setCharCount(content.length)
    // Link detection
    const urlMatch = content.match(/https?:\/\/[^\s]+/)
    if (urlMatch) setDetectedLink(urlMatch[0])
    else setDetectedLink(null)
  }, [content])

  // ─── Auto hashtag suggestion ───
  const autoHashtags = content.match(/#\w+/g)?.join(' ') || ''

  // ─────────────────────────────────────────────
  // LOCATION
  // ─────────────────────────────────────────────
  const detectLocation = () => {
    setDetectingLoc(true)
    navigator.geolocation?.getCurrentPosition(async pos => {
      const { latitude: lat, longitude: lng } = pos.coords
      setLocationCoords([lat, lng])
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`)
        const d   = await res.json()
        const a   = d.address
        const name = a.neighbourhood || a.suburb || a.village || a.town || a.city || a.county || 'Unknown'
        const city = a.city || a.town || a.county || ''
        setLocationName(city ? `${name}, ${city}` : name)
      } catch { setLocationName(`${lat.toFixed(4)}, ${lng.toFixed(4)}`) }
      setLocationEnabled(true); setDetectingLoc(false)
    }, () => { setDetectingLoc(false); alert('Location access denied') }, { enableHighAccuracy:true })
  }

  const searchLocation = async (q) => {
    setLocationQuery(q)
    if (q.length < 3) { setLocationSuggestions([]); return }
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5`)
      const d   = await res.json()
      setLocationSuggestions(d.map(r=>({ name:r.display_name.split(',').slice(0,2).join(','), lat:parseFloat(r.lat), lng:parseFloat(r.lon) })))
    } catch {}
  }

  const pickLocation = (s) => {
    setLocationName(s.name)
    setLocationCoords([s.lat, s.lng])
    setLocationEnabled(true)
    setLocationSuggestions([])
    setLocationSearchMode(false)
    setLocationQuery('')
  }

  // ─────────────────────────────────────────────
  // CAMERA
  // ─────────────────────────────────────────────
  const openCamera = async (mode='photo') => {
    try {
      const constraints = {
        video: { facingMode: cameraFacing, width:{ideal:1280}, height:{ideal:720} },
        audio: mode==='video'
      }
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      setCameraStream(stream)
      setCameraMode(mode)
      setTimeout(() => { if (cameraRef.current) cameraRef.current.srcObject = stream }, 120)
    } catch { alert('Camera access denied') }
  }

  const flipCamera = async () => {
    const newFacing = cameraFacing==='user'?'environment':'user'
    setCameraFacing(newFacing)
    if (cameraStream) {
      cameraStream.getTracks().forEach(t=>t.stop())
      try {
        const stream = await navigator.mediaDevices.getUserMedia({video:{facingMode:newFacing,width:{ideal:1280},height:{ideal:720}},audio:cameraMode==='video'})
        setCameraStream(stream)
        if (cameraRef.current) cameraRef.current.srcObject = stream
      } catch {}
    }
  }

  const takePhoto = () => {
    if (!cameraRef.current) return
    // Flash effect
    if (flashRef.current) {
      flashRef.current.style.opacity = '1'
      setTimeout(() => { if (flashRef.current) flashRef.current.style.opacity = '0' }, 150)
    }
    const canvas = document.createElement('canvas')
    canvas.width  = cameraRef.current.videoWidth
    canvas.height = cameraRef.current.videoHeight
    canvas.getContext('2d').drawImage(cameraRef.current, 0, 0)
    canvas.toBlob(blob => {
      const file = new File([blob], `photo_${Date.now()}.jpg`, {type:'image/jpeg'})
      setMediaFile(file)
      setMediaUrl(URL.createObjectURL(blob))
      setMediaType('photo')
      setMediaSize((blob.size/1024/1024).toFixed(1))
      closeCamera()
    }, 'image/jpeg', 0.92)
  }

  const startRecording = () => {
    recordChunks.current = []
    const mr = new MediaRecorder(cameraStream, {mimeType:'video/webm'})
    mr.ondataavailable = e => { if (e.data.size>0) recordChunks.current.push(e.data) }
    mr.onstop = () => {
      const blob = new Blob(recordChunks.current, {type:'video/mp4'})
      const file = new File([blob], `video_${Date.now()}.mp4`, {type:'video/mp4'})
      setMediaFile(file)
      setMediaUrl(URL.createObjectURL(blob))
      setMediaType('video')
      setMediaSize((blob.size/1024/1024).toFixed(1))
      closeCamera()
    }
    mediaRecRef.current = mr
    mr.start()
    setRecording(true); setRecordingTime(0)
    recordTimer.current = setInterval(()=>setRecordingTime(t=>t+1),1000)
  }

  const stopRecording = () => {
    mediaRecRef.current?.stop()
    clearInterval(recordTimer.current)
    setRecording(false)
  }

  const closeCamera = () => {
    cameraStream?.getTracks().forEach(t=>t.stop())
    setCameraStream(null); setCameraMode(false); setRecording(false)
    clearInterval(recordTimer.current)
  }

  // ─────────────────────────────────────────────
  // FILE HANDLING
  // ─────────────────────────────────────────────
  const handleFilePick = (e) => {
    const f = e.target.files[0]
    if (!f) return
    const isVideo = f.type.startsWith('video')
    setMediaFile(f); setMediaUrl(URL.createObjectURL(f))
    setMediaType(isVideo?'video':'photo')
    setMediaSize((f.size/1024/1024).toFixed(1))
    // Get video duration
    if (isVideo) {
      const vid = document.createElement('video')
      vid.src = URL.createObjectURL(f)
      vid.onloadedmetadata = () => setMediaDuration(Math.round(vid.duration))
    }
  }

  const removeMedia = () => {
    setMediaFile(null); setMediaUrl(null); setMediaType(null)
    setSelectedFilter('none'); setMediaDuration(null); setMediaSize(null)
    if (fileInputRef.current) fileInputRef.current.value=''
    if (imageInputRef.current) imageInputRef.current.value=''
    if (videoInputRef.current) videoInputRef.current.value=''
  }

  // ─────────────────────────────────────────────
  // UPLOAD
  // ─────────────────────────────────────────────
  const uploadToCloudinary = (file) => {
    return new Promise((resolve, reject) => {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('upload_preset', UPLOAD_PRESET)
      if (selectedFilter!=='none') formData.append('effect', selectedFilter)
      const xhr = new XMLHttpRequest()
      xhr.upload.onprogress = e => {
        if (e.lengthComputable) setUploadProgress(Math.round(e.loaded/e.total*85))
      }
      xhr.onload = () => { try { resolve(JSON.parse(xhr.responseText).secure_url) } catch { reject(new Error('Upload parse error')) } }
      xhr.onerror = () => reject(new Error('Network error'))
      xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`)
      xhr.send(formData)
    })
  }

  // ─────────────────────────────────────────────
  // DRAFTS
  // ─────────────────────────────────────────────
  const saveDraft = () => {
    const draft = {
      id: Date.now(), postType, content, title, hashtags,
      privacy, selectedVibes, textFont, textColor, bgGradient,
      capsuleRadius, capsuleUnlockDate, capsuleMessage,
      isPoll, pollOptions, pollDuration,
      savedAt: new Date().toISOString()
    }
    const updated = [draft, ...drafts].slice(0, 5)
    setDrafts(updated)
    try { localStorage.setItem('echo_drafts', JSON.stringify(updated)) } catch {}
    setDraftSaved(true)
    setTimeout(()=>setDraftSaved(false), 2000)
  }

  const loadDraft = (d) => {
    setPostType(d.postType||'regular'); setContent(d.content||''); setTitle(d.title||'')
    setHashtags(d.hashtags||''); setPrivacy(d.privacy||'public')
    setSelectedVibes(d.selectedVibes||[]); setTextFont(d.textFont||'default')
    setTextColor(d.textColor||'#eef2f7'); setBgGradient(d.bgGradient||null)
    setCapsuleRadius(d.capsuleRadius||300); setCapsuleUnlockDate(d.capsuleUnlockDate||'')
    setCapsuleMessage(d.capsuleMessage||''); setIsPoll(d.isPoll||false)
    setPollOptions(d.pollOptions||['','']); setPollDuration(d.pollDuration||24)
    setShowDrafts(false)
  }

  const deleteDraft = (id) => {
    const updated = drafts.filter(d=>d.id!==id)
    setDrafts(updated)
    try { localStorage.setItem('echo_drafts', JSON.stringify(updated)) } catch {}
  }

  // ─────────────────────────────────────────────
  // POLL
  // ─────────────────────────────────────────────
  const addPollOption = () => {
    if (pollOptions.length < 5) setPollOptions(p=>[...p,''])
  }
  const removePollOption = (i) => {
    if (pollOptions.length > 2) setPollOptions(p=>p.filter((_,idx)=>idx!==i))
  }
  const updatePollOption = (i,val) => {
    setPollOptions(p=>p.map((x,idx)=>idx===i?val:x))
  }

  // ─────────────────────────────────────────────
  // VIBES
  // ─────────────────────────────────────────────
  const toggleVibe = (v) => {
    setSelectedVibes(p => p.includes(v) ? p.filter(x=>x!==v) : p.length<3 ? [...p,v] : p)
  }

  // ─────────────────────────────────────────────
  // XP PREVIEW
  // ─────────────────────────────────────────────
  const getXP = () => {
    let xp = 10
    if (mediaFile) xp += mediaType==='video'?20:15
    if (postType==='capsule') xp = 35
    if (isPoll) xp += 5
    if (locationEnabled) xp += 5
    if (selectedVibes.length>0) xp += 3
    if (title.trim()) xp += 2
    return xp
  }

  // ─────────────────────────────────────────────
  // CONFETTI
  // ─────────────────────────────────────────────
  const spawnConfetti = () => {
    const items = Array.from({length:18},(_,i)=>({
      id:i, x:Math.random()*100,
      color:['#00e5ff','#00ff88','#ffca28','#ff6b35','#ff4560','#a78bfa'][i%6],
      delay:Math.random()*.5, size:6+Math.random()*8
    }))
    setConfetti(items)
    setTimeout(()=>setConfetti([]),2500)
  }

  // ─────────────────────────────────────────────
  // POST SUBMIT
  // ─────────────────────────────────────────────
  const handlePost = async () => {
    if (!user) return
    setPostError(null)

    if (!content.trim() && !mediaFile && !isPoll && postType!=='capsule') {
      setPostError('কিছু লিখো অথবা media যোগ করো!'); return
    }
    if (postType==='capsule' && !locationEnabled) {
      setPostError('Capsule এর জন্য location দরকার!'); return
    }
    if (isPoll && pollOptions.filter(x=>x.trim()).length < 2) {
      setPostError('Poll এর জন্য কমপক্ষে ২টি option দাও!'); return
    }

    setUploading(true); setUploadProgress(0); setUploadStage('Preparing...')

    let uploadedUrl = null
    let finalMediaType = postType==='capsule'?'capsule':(mediaType||'text')

    if (mediaFile) {
      setUploadStage('Uploading media...')
      try { uploadedUrl = await uploadToCloudinary(mediaFile) }
      catch(e) { setPostError('Upload failed: '+e.message); setUploading(false); return }
    }

    setUploadProgress(88); setUploadStage('Saving post...')

    const postData = {
      user_id:      user.id,
      content:      content.trim()||null,
      title:        title.trim()||null,
      hashtags:     hashtags.trim() || (autoHashtags||null),
      media_url:    uploadedUrl,
      media_type:   finalMediaType,
      privacy,
      post_format:  postType==='echo'?'echo':'regular',
      vibe_tags:    selectedVibes.length>0?selectedVibes:null,
      text_font:    textFont!=='default'?textFont:null,
      text_color:   textColor!=='#eef2f7'?textColor:null,
      bg_gradient:  bgGradient||null,
      sticker:      selectedSticker||null,
      media_filter: selectedFilter!=='none'?selectedFilter:null,
      is_poll:      isPoll||null,
      poll_options: isPoll?pollOptions.filter(x=>x.trim()):null,
      poll_duration: isPoll?pollDuration:null,
      link_url:     detectedLink||null,
      likes_count:  0, comments_count:0,
      ...(locationEnabled && locationCoords && {
        location_lat:  locationCoords[0],
        location_lng:  locationCoords[1],
        location_name: locationName,
      }),
      ...(postType==='capsule' && {
        capsule_radius:      capsuleRadius,
        capsule_unlock_date: capsuleUnlockDate||null,
        capsule_message:     capsuleMessage||null,
        capsule_hint:        capsuleHint||null,
      }),
    }

    const { data: newPost, error } = await supabase.from('posts').insert(postData).select().single()

    if (error) {
      setPostError('Post failed: '+error.message)
      setUploading(false); return
    }

    setUploadProgress(93); setUploadStage('Earning XP...')
    const xpGain = getXP()
    await supabase.from('profiles').update({ xp:(profile?.xp||0)+xpGain }).eq('id', user.id)

    // ── Daily earning — post করলে সাথে সাথে income ──
    try {
      await fetch('/api/post-earning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      })
    } catch(e) { console.log('earning error:', e) }

    // Algorithm track
    try {
      await fetch('/api/algorithm/interact',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({postId:newPost.id,type:'post_created',source:'post'})
      })
    } catch {}

    // Update explored zones
    if (locationEnabled && locationCoords) {
      await supabase.from('explored_zones').upsert({
        user_id:user.id, zone_name:locationName.split(',')[0],
        lat:locationCoords[0], lng:locationCoords[1],
        last_visited:new Date().toISOString()
      },{onConflict:'user_id,zone_name'}).catch(()=>{})
    }

    setUploadProgress(100); setUploadStage('Done!')
    spawnConfetti()
    setTimeout(()=>{
      setPosted(true)
      setTimeout(()=>{
        window.location.href = postType==='echo'?'/echo':'/feed'
      },2000)
    },600)
  }

  // ─────────────────────────────────────────────
  // COMPUTED
  // ─────────────────────────────────────────────
  const currentPostType  = POST_TYPES.find(p=>p.key===postType)
  const currentFilter    = FILTERS.find(f=>f.key===selectedFilter)
  const currentFont      = FONTS.find(f=>f.key===textFont)
  const canPost          = !uploading && (content.trim()||mediaFile||isPoll||(postType==='capsule'&&locationEnabled))

  // ─────────────────────────────────────────────
  // CAMERA UI
  // ─────────────────────────────────────────────
  if (cameraMode) return (
    <div style={{height:'100vh',background:'#000',display:'flex',flexDirection:'column',overflow:'hidden',position:'relative'}}>
      <style>{GLOBAL_CSS}</style>

      {/* Flash overlay */}
      <div ref={flashRef} style={{position:'absolute',inset:0,background:'#fff',opacity:0,zIndex:50,pointerEvents:'none',transition:'opacity .15s'}}/>

      {/* Top controls */}
      <div style={{position:'absolute',top:0,left:0,right:0,padding:'16px',display:'flex',alignItems:'center',justifyContent:'space-between',zIndex:20,background:'linear-gradient(to bottom,rgba(0,0,0,.6),transparent)'}}>
        <button className="btn-tap" onClick={closeCamera} style={{width:42,height:42,borderRadius:'50%',background:'rgba(0,0,0,.5)',border:'1px solid rgba(255,255,255,.2)',color:'#fff',fontSize:20,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',backdropFilter:'blur(8px)'}}>✕</button>

        {recording&&(
          <div style={{display:'flex',alignItems:'center',gap:7,background:'rgba(255,69,96,.85)',borderRadius:20,padding:'6px 14px',backdropFilter:'blur(8px)'}}>
            <div style={{width:7,height:7,borderRadius:'50%',background:'#fff',animation:'glowPulse 1s infinite'}}/>
            <span style={{color:'#fff',fontSize:13,fontWeight:700}}>REC {Math.floor(recordingTime/60).toString().padStart(2,'0')}:{(recordingTime%60).toString().padStart(2,'0')}</span>
          </div>
        )}

        <div style={{display:'flex',gap:8}}>
          <button className="btn-tap" onClick={flipCamera} style={{width:42,height:42,borderRadius:'50%',background:'rgba(0,0,0,.5)',border:'1px solid rgba(255,255,255,.2)',color:'#fff',fontSize:18,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',backdropFilter:'blur(8px)'}}>🔄</button>
        </div>
      </div>

      {/* Camera preview */}
      <video ref={cameraRef} autoPlay playsInline muted style={{width:'100%',height:'100%',objectFit:'cover',transform:cameraFacing==='user'?'scaleX(-1)':'none'}}/>

      {/* Focus lines */}
      <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',pointerEvents:'none',zIndex:10}}>
        <div style={{width:80,height:80,position:'relative',opacity:.6}}>
          {[{t:0,l:0,bt:'none',bb:'1px solid #fff',br:'none',bl:'1px solid #fff'},{t:0,r:0,bt:'none',bb:'1px solid #fff',br:'1px solid #fff',bl:'none'},
            {b:0,l:0,bt:'1px solid #fff',bb:'none',br:'none',bl:'1px solid #fff'},{b:0,r:0,bt:'1px solid #fff',bb:'none',br:'1px solid #fff',bl:'none'}
          ].map((s,i)=><div key={i} style={{position:'absolute',width:18,height:18,...s}}/>)}
        </div>
      </div>

      {/* Zoom slider */}
      <div style={{position:'absolute',right:16,top:'50%',transform:'translateY(-50%)',display:'flex',flexDirection:'column',alignItems:'center',gap:8,zIndex:20}}>
        <span style={{color:'rgba(255,255,255,.6)',fontSize:11,fontWeight:600}}>{zoom.toFixed(1)}x</span>
        <input type="range" min={1} max={3} step={.1} value={zoom} onChange={e=>setZoom(parseFloat(e.target.value))}
          style={{writingMode:'vertical-lr',height:100,accentColor:'#fff',opacity:.8}}/>
      </div>

      {/* Bottom controls */}
      <div style={{position:'absolute',bottom:0,left:0,right:0,padding:'24px 20px 40px',display:'flex',flexDirection:'column',alignItems:'center',gap:20,background:'linear-gradient(to top,rgba(0,0,0,.8),transparent)',zIndex:20}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-around',width:'100%'}}>
          {/* Gallery pick */}
          <button className="btn-tap" onClick={()=>fileInputRef.current?.click()} style={{width:48,height:48,borderRadius:12,background:'rgba(255,255,255,.15)',border:'1px solid rgba(255,255,255,.25)',color:'#fff',fontSize:20,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',backdropFilter:'blur(8px)'}}>📁</button>
          <input ref={fileInputRef} type="file" accept="image/*,video/*" onChange={handleFilePick} style={{display:'none'}}/>

          {/* Shutter */}
          {cameraMode==='photo'?(
            <button className="btn-tap" onClick={takePhoto} style={{width:78,height:78,borderRadius:'50%',background:'#fff',border:'5px solid rgba(255,255,255,.35)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 0 24px rgba(255,255,255,.3)'}}>
              <div style={{width:58,height:58,borderRadius:'50%',background:'linear-gradient(135deg,#f0f0f0,#fff)'}}/>
            </button>
          ):!recording?(
            <button className="btn-tap" onClick={startRecording} style={{width:78,height:78,borderRadius:'50%',background:'#ff4560',border:'5px solid rgba(255,69,96,.35)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 0 24px rgba(255,69,96,.5)'}}>
              <div style={{width:28,height:28,borderRadius:'50%',background:'#fff'}}/>
            </button>
          ):(
            <button className="btn-tap" onClick={stopRecording} style={{width:78,height:78,borderRadius:'50%',background:'#fff',border:'5px solid #ff4560',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 0 24px rgba(255,69,96,.5)'}}>
              <div style={{width:22,height:22,borderRadius:4,background:'#ff4560'}}/>
            </button>
          )}

          {/* Mode switch */}
          <button className="btn-tap" onClick={()=>setCameraMode(m=>m==='photo'?'video':'photo')} style={{width:48,height:48,borderRadius:12,background:'rgba(255,255,255,.15)',border:'1px solid rgba(255,255,255,.25)',color:'#fff',fontSize:20,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',backdropFilter:'blur(8px)'}}>
            {cameraMode==='photo'?'🎬':'📷'}
          </button>
        </div>
        <div style={{color:'rgba(255,255,255,.5)',fontSize:11,fontWeight:500}}>
          {cameraMode==='photo'?'Tap circle to capture':recording?'Tap ■ to stop recording':'Tap ● to start recording'}
        </div>
      </div>
    </div>
  )

  // ─────────────────────────────────────────────
  // SUCCESS UI
  // ─────────────────────────────────────────────
  if (posted) return (
    <div style={{height:'100vh',background:'#060810',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:20,position:'relative',overflow:'hidden'}}>
      <style>{GLOBAL_CSS}</style>
      {/* Confetti */}
      {confetti.map(c=>(
        <div key={c.id} style={{position:'absolute',left:`${c.x}%`,top:'60%',width:c.size,height:c.size,background:c.color,borderRadius:2,animation:`confetti 1.8s ${c.delay}s ease-out forwards`}}/>
      ))}
      <div style={{fontSize:80,animation:'popIn .5s ease'}}>🎉</div>
      <div style={{fontSize:24,fontWeight:900,color:'#00ff88',fontFamily:"'Sora',sans-serif",animation:'fadeUp .5s .2s both'}}>Posted!</div>
      <div style={{display:'flex',alignItems:'center',gap:8,background:'rgba(0,255,136,.08)',border:'1px solid rgba(0,255,136,.2)',borderRadius:20,padding:'8px 18px',animation:'fadeUp .5s .35s both'}}>
        <span style={{fontSize:16}}>⚡</span>
        <span style={{fontSize:14,color:'#00ff88',fontWeight:700}}>+{getXP()} XP earned!</span>
      </div>
      <div style={{fontSize:12,color:'#2a3040',animation:'fadeUp .5s .5s both'}}>Redirecting to feed...</div>
    </div>
  )

  // ─────────────────────────────────────────────
  // MAIN UI
  // ─────────────────────────────────────────────
  return (
    <div style={{minHeight:'100vh',background:'#060810',color:'#eef2f7',paddingBottom:100}}>
      <style>{GLOBAL_CSS}</style>

      {/* Confetti (on submit) */}
      {confetti.map(c=>(
        <div key={c.id} style={{position:'fixed',left:`${c.x}%`,top:'50%',width:c.size,height:c.size,background:c.color,borderRadius:2,animation:`confetti 1.8s ${c.delay}s ease-out forwards`,zIndex:999,pointerEvents:'none'}}/>
      ))}

      {/* ═══════════════════════════════════════ */}
      {/* TOP BAR */}
      {/* ═══════════════════════════════════════ */}
      <div style={{
        position:'sticky',top:0,zIndex:100,
        background:'rgba(6,8,16,.96)',backdropFilter:'blur(24px)',
        borderBottom:'1px solid rgba(255,255,255,.05)',
        height:58,padding:'0 14px',
        display:'flex',alignItems:'center',justifyContent:'space-between'
      }}>
        <button className="btn-tap" onClick={()=>window.history.back()} style={{width:38,height:38,borderRadius:11,background:'rgba(255,255,255,.06)',border:'1px solid rgba(255,255,255,.08)',color:'#eef2f7',fontSize:18,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>←</button>

        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <span style={{fontSize:18}}>{currentPostType?.icon}</span>
          <span style={{fontSize:15,fontWeight:900,fontFamily:"'Sora',sans-serif",background:`linear-gradient(90deg,${currentPostType?.color},#fff)`,WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>
            {currentPostType?.label}
          </span>
        </div>

        <div style={{display:'flex',gap:6}}>
          {/* Draft save */}
          <button className="btn-tap" onClick={saveDraft} style={{
            width:38,height:38,borderRadius:11,
            background:draftSaved?'rgba(0,255,136,.12)':'rgba(255,255,255,.06)',
            border:`1px solid ${draftSaved?'rgba(0,255,136,.3)':'rgba(255,255,255,.08)'}`,
            color:draftSaved?'#00ff88':'#8892a4',fontSize:14,cursor:'pointer',
            display:'flex',alignItems:'center',justifyContent:'center'
          }}>{draftSaved?'✓':'💾'}</button>

          {/* Post button */}
          <button className="btn-tap" onClick={handlePost} disabled={!canPost} style={{
            padding:'0 18px',height:38,borderRadius:11,border:'none',
            background: canPost ? `linear-gradient(135deg,${currentPostType?.color},${currentPostType?.color}99)` : 'rgba(255,255,255,.06)',
            color: canPost ? '#060810' : '#4a5568',
            fontSize:13,fontWeight:900,cursor:canPost?'pointer':'default',
            fontFamily:"'Sora',sans-serif",
            boxShadow: canPost ? `0 4px 16px ${currentPostType?.glow}` : 'none',
            transition:'all .2s'
          }}>
            {uploading ? `${uploadProgress}%` : postType==='capsule'?'Drop 📦':postType==='echo'?'ECHO ⚡':'Post ⚡'}
          </button>
        </div>
      </div>

      <div style={{padding:'16px 16px 0'}}>

        {/* ═══════════════════════════════════════ */}
        {/* POST TYPE SELECTOR */}
        {/* ═══════════════════════════════════════ */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8,marginBottom:16}}>
          {POST_TYPES.map((t,i)=>(
            <button key={t.key} className="btn-tap" onClick={()=>setPostType(t.key)} style={{
              padding:'12px 6px',borderRadius:14,
              background: postType===t.key ? `${t.color}15` : '#0c1020',
              border: `2px solid ${postType===t.key ? t.color : 'rgba(255,255,255,.05)'}`,
              color: postType===t.key ? t.color : '#4a5568',
              cursor:'pointer',
              display:'flex',flexDirection:'column',alignItems:'center',gap:4,
              transition:'all .2s',
              boxShadow: postType===t.key ? `0 0 20px ${t.glow}` : 'none',
              animation:`fadeUp ${.2+i*.08}s ease`
            }}>
              <span style={{fontSize:22}}>{t.icon}</span>
              <span style={{fontSize:12,fontWeight:800,fontFamily:"'Sora',sans-serif"}}>{t.label}</span>
              <span style={{fontSize:9,color:postType===t.key?t.color+'88':'#2a3040',textAlign:'center',lineHeight:1.3}}>{t.desc}</span>
            </button>
          ))}
        </div>

        {/* ── Type hints ── */}
        {postType==='echo'&&(
          <div style={{background:'rgba(255,107,53,.06)',border:'1px solid rgba(255,107,53,.2)',borderRadius:12,padding:'10px 14px',marginBottom:14,fontSize:12,color:'#ff6b35',display:'flex',gap:8,alignItems:'flex-start',animation:'fadeIn .3s ease'}}>
            <span style={{fontSize:16,flexShrink:0}}>⚡</span>
            <span>ECHO posts appear in the vertical video feed. Upload a video for best results. Full screen, immersive content!</span>
          </div>
        )}
        {postType==='capsule'&&(
          <div style={{background:'rgba(255,202,40,.06)',border:'1px solid rgba(255,202,40,.2)',borderRadius:12,padding:'10px 14px',marginBottom:14,fontSize:12,color:'#ffca28',display:'flex',gap:8,alignItems:'flex-start',animation:'fadeIn .3s ease'}}>
            <span style={{fontSize:16,flexShrink:0}}>📦</span>
            <span>Capsule posts are only visible to users within <strong>{capsuleRadius}m</strong> of your location. Hidden treasure for nearby explorers!</span>
          </div>
        )}

        {/* ═══════════════════════════════════════ */}
        {/* AUTHOR ROW */}
        {/* ═══════════════════════════════════════ */}
        <div style={{display:'flex',gap:10,alignItems:'flex-start',marginBottom:14}}>
          <div style={{width:46,height:46,borderRadius:14,overflow:'hidden',flexShrink:0,background:'linear-gradient(135deg,#00e5ff,#00ff88)',display:'flex',alignItems:'center',justifyContent:'center',border:'2px solid rgba(0,229,255,.2)'}}>
            {profile?.avatar_url?<img src={profile.avatar_url} style={{width:'100%',height:'100%',objectFit:'cover'}}/>:<span style={{fontSize:18,fontWeight:800,color:'#060810'}}>{(profile?.full_name||'E')[0]?.toUpperCase()}</span>}
          </div>
          <div style={{flex:1}}>
            <div style={{fontSize:14,fontWeight:700,marginBottom:6}}>{profile?.full_name||'Explorer'}</div>
            {/* Privacy */}
            <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
              {PRIVACY.map(p=>(
                <button key={p.key} className="btn-tap" onClick={()=>setPrivacy(p.key)} style={{
                  padding:'4px 10px',borderRadius:20,
                  border:`1px solid ${privacy===p.key?'rgba(0,229,255,.5)':'rgba(255,255,255,.08)'}`,
                  background:privacy===p.key?'rgba(0,229,255,.1)':'rgba(255,255,255,.03)',
                  color:privacy===p.key?'#00e5ff':'#4a5568',fontSize:11,fontWeight:600,cursor:'pointer'
                }}>{p.icon} {p.label}</button>
              ))}
            </div>
          </div>
          {/* Drafts btn */}
          {drafts.length>0&&(
            <button className="btn-tap" onClick={()=>setShowDrafts(true)} style={{padding:'6px 10px',borderRadius:10,background:'rgba(255,202,40,.08)',border:'1px solid rgba(255,202,40,.2)',color:'#ffca28',fontSize:11,fontWeight:700,cursor:'pointer',flexShrink:0}}>
              💾 {drafts.length}
            </button>
          )}
        </div>

        {/* ═══════════════════════════════════════ */}
        {/* WRITE AREA */}
        {/* ═══════════════════════════════════════ */}
        <div style={{
          background: bgGradient||'#0c1020',
          borderRadius:16,
          border:`1px solid rgba(255,255,255,.06)`,
          marginBottom:14,
          overflow:'hidden',
          transition:'all .3s'
        }}>
          {/* Title */}
          <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Title (optional)"
            style={{
              width:'100%',background:'transparent',border:'none',outline:'none',
              padding:'14px 16px 0',
              color:textColor,fontSize:17,fontWeight:700,
              ...currentFont?.style
            }}/>

          {/* Content */}
          <textarea ref={textareaRef} value={content} onChange={e=>setContent(e.target.value)}
            placeholder={
              postType==='capsule'?'এখানে কেউ আসলে কী দেখবে? তাদের জন্য লেখো...':
              postType==='echo'?'তোমার ECHO moment কী? ⚡':
              'তোমার adventure শেয়ার করো... 🌍'
            }
            style={{
              width:'100%',background:'transparent',border:'none',outline:'none',
              resize:'none',padding:'10px 16px 14px',
              color:textColor,fontSize:15,lineHeight:1.7,
              minHeight:isPoll?60:120,
              ...currentFont?.style
            }}/>

          {/* Sticker */}
          {selectedSticker&&(
            <div style={{padding:'0 16px 10px',display:'flex',alignItems:'center',gap:8}}>
              <span style={{fontSize:36}}>{selectedSticker}</span>
              <button onClick={()=>setSelectedSticker(null)} style={{background:'none',border:'none',color:'#4a5568',fontSize:12,cursor:'pointer',padding:'2px 6px'}}>✕ Remove</button>
            </div>
          )}

          {/* Char counter */}
          <div style={{padding:'4px 16px 10px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div style={{fontSize:10,color:charCount>450?'#ff4560':charCount>300?'#ffca28':'#2a3040'}}>
              {charCount}/500
            </div>
            {autoHashtags&&!hashtags&&(
              <button onClick={()=>setHashtags(autoHashtags)} style={{fontSize:10,color:'#00e5ff',background:'none',border:'none',cursor:'pointer',fontWeight:600}}>
                #{autoHashtags.replace(/#/g,'').split(' ').join(' #')} যোগ করো?
              </button>
            )}
          </div>
        </div>

        {/* ═══════════════════════════════════════ */}
        {/* MEDIA SECTION */}
        {/* ═══════════════════════════════════════ */}
        {mediaUrl?(
          <div style={{position:'relative',borderRadius:16,overflow:'hidden',marginBottom:14,background:'#000'}}>
            {mediaType==='photo'?(
              <img src={mediaUrl} style={{width:'100%',maxHeight:380,objectFit:'cover',display:'block',filter:currentFilter?.css}}/>
            ):(
              <video src={mediaUrl} controls playsInline style={{width:'100%',maxHeight:380,display:'block',background:'#000',filter:currentFilter?.css}}/>
            )}

            {/* Top controls */}
            <div style={{position:'absolute',top:10,left:10,right:10,display:'flex',justifyContent:'space-between',gap:8}}>
              <div style={{display:'flex',gap:6}}>
                {mediaType==='photo'&&(
                  <button className="btn-tap" onClick={()=>setShowFilters(!showFilters)} style={{background:'rgba(0,0,0,.65)',border:'none',borderRadius:8,padding:'5px 10px',color:'#fff',fontSize:11,fontWeight:700,cursor:'pointer',backdropFilter:'blur(8px)'}}>
                    🎨 Filter
                  </button>
                )}
              </div>
              <button className="btn-tap" onClick={removeMedia} style={{background:'rgba(0,0,0,.65)',border:'none',borderRadius:'50%',width:34,height:34,color:'#fff',fontSize:16,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',backdropFilter:'blur(8px)'}}>✕</button>
            </div>

            {/* Media info */}
            <div style={{position:'absolute',bottom:10,left:10,display:'flex',gap:6}}>
              <span style={{background:'rgba(0,0,0,.65)',borderRadius:7,padding:'3px 8px',fontSize:10,color:'#fff',fontWeight:600,backdropFilter:'blur(4px)'}}>
                {mediaType==='photo'?'📷':'🎬'} {mediaSize}MB
              </span>
              {mediaDuration&&<span style={{background:'rgba(0,0,0,.65)',borderRadius:7,padding:'3px 8px',fontSize:10,color:'#fff',fontWeight:600,backdropFilter:'blur(4px)'}}>⏱ {mediaDuration}s</span>}
            </div>

            {/* Filter panel */}
            {showFilters&&mediaType==='photo'&&(
              <div style={{position:'absolute',bottom:0,left:0,right:0,background:'rgba(0,0,0,.88)',padding:'12px 14px',backdropFilter:'blur(10px)'}}>
                <div style={{display:'flex',gap:8,overflowX:'auto',scrollbarWidth:'none'}}>
                  {FILTERS.map(f=>(
                    <div key={f.key} className="btn-tap" onClick={()=>{setSelectedFilter(f.key);setShowFilters(false)}} style={{
                      display:'flex',flexDirection:'column',alignItems:'center',gap:5,flexShrink:0,cursor:'pointer'
                    }}>
                      <div style={{width:52,height:52,borderRadius:10,overflow:'hidden',border:`2px solid ${selectedFilter===f.key?'#00e5ff':'transparent'}`,transition:'border-color .15s'}}>
                        <img src={mediaUrl} style={{width:'100%',height:'100%',objectFit:'cover',filter:f.css}}/>
                      </div>
                      <span style={{fontSize:9,color:selectedFilter===f.key?'#00e5ff':'#8892a4',fontWeight:600}}>{f.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ):(
          /* Media pick buttons */
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8,marginBottom:14}}>
            {[
              {ic:'📷',lab:'Camera',  fn:()=>openCamera('photo')},
              {ic:'🎬',lab:'Video',   fn:()=>openCamera('video')},
              {ic:'🖼',lab:'Gallery', fn:()=>imageInputRef.current?.click()},
              {ic:'📁',lab:'File',    fn:()=>fileInputRef.current?.click()},
            ].map((b,i)=>(
              <div key={i} className="card-hover btn-tap" onClick={b.fn} style={{
                background:'#0c1020',border:'1px solid rgba(255,255,255,.05)',
                borderRadius:14,padding:'14px 6px',cursor:'pointer',textAlign:'center',
                animation:`fadeUp ${.25+i*.06}s ease`
              }}>
                <div style={{fontSize:24,marginBottom:5}}>{b.ic}</div>
                <div style={{fontSize:10,color:'#4a5568',fontWeight:700}}>{b.lab}</div>
              </div>
            ))}
            <input ref={imageInputRef} type="file" accept="image/*" onChange={handleFilePick} style={{display:'none'}}/>
            <input ref={videoInputRef} type="file" accept="video/*" onChange={handleFilePick} style={{display:'none'}}/>
            <input ref={fileInputRef}  type="file" accept="image/*,video/*" onChange={handleFilePick} style={{display:'none'}}/>
          </div>
        )}

        {/* ═══════════════════════════════════════ */}
        {/* SECTION TABS */}
        {/* ═══════════════════════════════════════ */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:0,background:'#0c1020',borderRadius:14,padding:3,marginBottom:14,border:'1px solid rgba(255,255,255,.04)'}}>
          {[['write','✍️','Write'],['style','🎨','Style'],['extras','🔧','Extras']].map(([key,ic,lab])=>(
            <button key={key} className="btn-tap" onClick={()=>setActiveSection(key)} style={{
              padding:'9px 0',borderRadius:11,
              background:activeSection===key?'rgba(0,229,255,.1)':'none',
              border:activeSection===key?'1px solid rgba(0,229,255,.2)':'1px solid transparent',
              color:activeSection===key?'#00e5ff':'#2a3040',
              fontSize:11,fontWeight:700,cursor:'pointer',
              display:'flex',alignItems:'center',justifyContent:'center',gap:4,transition:'all .2s'
            }}>{ic} {lab}</button>
          ))}
        </div>

        {/* ═══════════════════════════════════════ */}
        {/* WRITE SECTION */}
        {/* ═══════════════════════════════════════ */}
        {activeSection==='write'&&(
          <div style={{animation:'tabSlide .2s ease'}}>

            {/* Hashtags */}
            <div style={{marginBottom:14}}>
              <div style={{fontSize:11,fontWeight:700,color:'#4a5568',marginBottom:6,letterSpacing:.4}}>HASHTAGS</div>
              <div style={{display:'flex',alignItems:'center',background:'#0c1020',border:'1px solid rgba(255,255,255,.06)',borderRadius:12,overflow:'hidden'}}>
                <span style={{padding:'10px 12px',fontSize:14,color:'#00e5ff',flexShrink:0}}>#</span>
                <input value={hashtags} onChange={e=>setHashtags(e.target.value)} placeholder="echoworld adventure travel..."
                  style={{flex:1,background:'transparent',border:'none',outline:'none',color:'#00e5ff',fontSize:13,padding:'10px 12px 10px 0'}}/>
              </div>
            </div>

            {/* Vibe tags */}
            <div style={{marginBottom:14}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                <div style={{fontSize:11,fontWeight:700,color:'#4a5568',letterSpacing:.4}}>VIBE TAGS</div>
                <div style={{fontSize:10,color:'#2a3040'}}>{selectedVibes.length}/3 selected</div>
              </div>
              <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
                {VIBES.map(({v,color})=>{
                  const sel = selectedVibes.includes(v)
                  return (
                    <button key={v} className="btn-tap" onClick={()=>toggleVibe(v)} style={{
                      padding:'6px 12px',borderRadius:20,border:`1px solid ${sel?color+'55':'rgba(255,255,255,.07)'}`,
                      background:sel?`${color}18`:'rgba(255,255,255,.03)',
                      color:sel?color:'#4a5568',fontSize:11,fontWeight:600,cursor:'pointer',
                      transition:'all .15s',
                      boxShadow:sel?`0 0 10px ${color}33`:'none'
                    }}>{v}</button>
                  )
                })}
              </div>
            </div>

            {/* Poll toggle */}
            <div style={{marginBottom:14}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 14px',background:'#0c1020',border:'1px solid rgba(255,255,255,.05)',borderRadius:13,cursor:'pointer'}} onClick={()=>setIsPoll(!isPoll)}>
                <div style={{display:'flex',alignItems:'center',gap:10}}>
                  <span style={{fontSize:20}}>📊</span>
                  <div>
                    <div style={{fontSize:13,fontWeight:700}}>Poll যোগ করো</div>
                    <div style={{fontSize:10,color:'#4a5568'}}>মানুষের মতামত নাও</div>
                  </div>
                </div>
                <div style={{width:36,height:20,borderRadius:20,background:isPoll?'#00e5ff':'rgba(255,255,255,.1)',position:'relative',transition:'background .2s',cursor:'pointer'}}>
                  <div style={{position:'absolute',top:2,left:isPoll?18:2,width:16,height:16,borderRadius:'50%',background:'#fff',transition:'left .2s'}}/>
                </div>
              </div>
              {isPoll&&(
                <div style={{marginTop:10,padding:'14px',background:'rgba(0,229,255,.04)',border:'1px solid rgba(0,229,255,.12)',borderRadius:13,animation:'fadeIn .3s ease'}}>
                  <div style={{fontSize:11,fontWeight:700,color:'#00e5ff',marginBottom:10}}>📊 Poll Options</div>
                  {pollOptions.map((opt,i)=>(
                    <div key={i} style={{display:'flex',gap:8,marginBottom:7,alignItems:'center'}}>
                      <div style={{width:22,height:22,borderRadius:6,background:'rgba(0,229,255,.15)',border:'1px solid rgba(0,229,255,.3)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:800,color:'#00e5ff',flexShrink:0}}>{i+1}</div>
                      <input value={opt} onChange={e=>updatePollOption(i,e.target.value)} placeholder={`Option ${i+1}...`} maxLength={50}
                        style={{flex:1,background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.08)',borderRadius:9,padding:'8px 12px',color:'#eef2f7',fontSize:12,outline:'none'}}/>
                      {pollOptions.length>2&&<button onClick={()=>removePollOption(i)} style={{background:'none',border:'none',color:'#4a5568',fontSize:16,cursor:'pointer',padding:'0 4px'}}>✕</button>}
                    </div>
                  ))}
                  {pollOptions.length<5&&(
                    <button onClick={addPollOption} style={{width:'100%',padding:'8px',borderRadius:9,border:'1px dashed rgba(0,229,255,.3)',background:'transparent',color:'#00e5ff',fontSize:12,fontWeight:600,cursor:'pointer',marginBottom:10}}>+ Option যোগ করো</button>
                  )}
                  <div style={{fontSize:11,color:'#4a5568',marginBottom:6}}>Poll কতক্ষণ চলবে?</div>
                  <div style={{display:'flex',gap:6}}>
                    {[6,12,24,48,72].map(h=>(
                      <button key={h} onClick={()=>setPollDuration(h)} style={{
                        flex:1,padding:'6px 0',borderRadius:8,border:`1px solid ${pollDuration===h?'rgba(0,229,255,.4)':'rgba(255,255,255,.07)'}`,
                        background:pollDuration===h?'rgba(0,229,255,.1)':'transparent',
                        color:pollDuration===h?'#00e5ff':'#4a5568',fontSize:10,fontWeight:700,cursor:'pointer'
                      }}>{h}h</button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════ */}
        {/* STYLE SECTION */}
        {/* ═══════════════════════════════════════ */}
        {activeSection==='style'&&(
          <div style={{animation:'tabSlide .2s ease'}}>

            {/* Text font */}
            <div style={{marginBottom:14}}>
              <div style={{fontSize:11,fontWeight:700,color:'#4a5568',marginBottom:8,letterSpacing:.4}}>FONT STYLE</div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:6}}>
                {FONTS.map(f=>(
                  <button key={f.key} className="btn-tap" onClick={()=>setTextFont(f.key)} style={{
                    padding:'10px 6px',borderRadius:11,
                    background:textFont===f.key?'rgba(0,229,255,.1)':'#0c1020',
                    border:`1px solid ${textFont===f.key?'rgba(0,229,255,.35)':'rgba(255,255,255,.05)'}`,
                    color:textFont===f.key?'#00e5ff':'#8892a4',
                    fontSize:12,fontWeight:700,cursor:'pointer',
                    ...f.style
                  }}>{f.label}</button>
                ))}
              </div>
            </div>

            {/* Text color */}
            <div style={{marginBottom:14}}>
              <div style={{fontSize:11,fontWeight:700,color:'#4a5568',marginBottom:8,letterSpacing:.4}}>TEXT COLOR</div>
              <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                {TEXT_COLORS.map(c=>(
                  <div key={c} className="btn-tap" onClick={()=>setTextColor(c)} style={{
                    width:34,height:34,borderRadius:10,background:c,cursor:'pointer',
                    border:`3px solid ${textColor===c?'#fff':'transparent'}`,
                    boxShadow:textColor===c?`0 0 10px ${c}88`:'none',
                    transition:'all .15s'
                  }}/>
                ))}
              </div>
            </div>

            {/* Background gradient */}
            <div style={{marginBottom:14}}>
              <div style={{fontSize:11,fontWeight:700,color:'#4a5568',marginBottom:8,letterSpacing:.4}}>POST BACKGROUND</div>
              <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                {BG_GRADIENTS.map((g,i)=>(
                  <div key={i} className="btn-tap" onClick={()=>setBgGradient(g)} style={{
                    width:42,height:42,borderRadius:10,cursor:'pointer',
                    background:g||'#0c1020',
                    border:`2px solid ${bgGradient===g?(g?'rgba(255,255,255,.6)':'rgba(0,229,255,.5)'):'transparent'}`,
                    display:'flex',alignItems:'center',justifyContent:'center',
                    transition:'all .15s',flexShrink:0
                  }}>
                    {!g&&<span style={{fontSize:14,color:'#4a5568'}}>✕</span>}
                  </div>
                ))}
              </div>
            </div>

            {/* Stickers */}
            <div style={{marginBottom:14}}>
              <div style={{fontSize:11,fontWeight:700,color:'#4a5568',marginBottom:8,letterSpacing:.4}}>STICKER</div>
              <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                {STICKERS.map(s=>(
                  <div key={s} className="btn-tap" onClick={()=>setSelectedSticker(selectedSticker===s?null:s)} style={{
                    width:38,height:38,borderRadius:10,background: selectedSticker===s?'rgba(255,255,255,.15)':'#0c1020',
                    border:`1px solid ${selectedSticker===s?'rgba(255,255,255,.4)':'rgba(255,255,255,.06)'}`,
                    display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,cursor:'pointer',
                    transition:'all .15s'
                  }}>{s}</div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════ */}
        {/* EXTRAS SECTION */}
        {/* ═══════════════════════════════════════ */}
        {activeSection==='extras'&&(
          <div style={{animation:'tabSlide .2s ease'}}>

            {/* Location */}
            <div style={{marginBottom:14}}>
              <div style={{fontSize:11,fontWeight:700,color:'#4a5568',marginBottom:8,letterSpacing:.4}}>📍 LOCATION</div>
              {!locationEnabled?(
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                  <button className="btn-tap card-hover" onClick={detectLocation} disabled={detectingLoc} style={{
                    padding:'12px',borderRadius:13,border:'1px solid rgba(0,229,255,.2)',
                    background:'rgba(0,229,255,.05)',color:'#00e5ff',fontSize:12,fontWeight:700,cursor:'pointer'
                  }}>
                    {detectingLoc?'⏳ Detecting...':'📡 Auto Detect'}
                  </button>
                  <button className="btn-tap card-hover" onClick={()=>setLocationSearchMode(true)} style={{
                    padding:'12px',borderRadius:13,border:'1px solid rgba(255,255,255,.08)',
                    background:'#0c1020',color:'#8892a4',fontSize:12,fontWeight:700,cursor:'pointer'
                  }}>🔍 Search</button>
                </div>
              ):(
                <div style={{background:'rgba(0,229,255,.06)',border:'1px solid rgba(0,229,255,.2)',borderRadius:13,padding:'10px 14px',display:'flex',gap:10,alignItems:'center'}}>
                  <span style={{fontSize:20,flexShrink:0}}>📍</span>
                  <input value={locationName} onChange={e=>setLocationName(e.target.value)}
                    style={{flex:1,background:'transparent',border:'none',outline:'none',color:'#00e5ff',fontSize:13,fontWeight:600}}/>
                  <button onClick={()=>{setLocationEnabled(false);setLocationCoords(null);setLocationName('')}} style={{background:'none',border:'none',color:'#ff4560',fontSize:18,cursor:'pointer'}}>✕</button>
                </div>
              )}
              {locationSearchMode&&(
                <div style={{marginTop:8,animation:'fadeIn .2s ease'}}>
                  <input value={locationQuery} onChange={e=>searchLocation(e.target.value)} placeholder="শহর বা জায়গা লেখো..."
                    style={{width:'100%',background:'#0c1020',border:'1px solid rgba(255,255,255,.1)',borderRadius:11,padding:'10px 14px',color:'#eef2f7',fontSize:13,outline:'none',marginBottom:6}}/>
                  {locationSuggestions.map((s,i)=>(
                    <div key={i} className="card-hover" onClick={()=>pickLocation(s)} style={{padding:'10px 14px',background:'#0c1020',borderRadius:10,marginBottom:5,cursor:'pointer',fontSize:12,color:'#eef2f7',border:'1px solid rgba(255,255,255,.04)'}}>
                      📍 {s.name}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Capsule settings */}
            {postType==='capsule'&&(
              <div style={{background:'rgba(255,202,40,.05)',border:'1px solid rgba(255,202,40,.15)',borderRadius:16,padding:'14px',marginBottom:14}}>
                <div style={{fontSize:13,fontWeight:800,color:'#ffca28',marginBottom:12}}>📦 Capsule Settings</div>

                {/* Radius */}
                <div style={{marginBottom:14}}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
                    <span style={{fontSize:12,color:'#8892a4'}}>Unlock Radius</span>
                    <span style={{fontSize:13,color:'#ffca28',fontWeight:800}}>{capsuleRadius}m</span>
                  </div>
                  <input type="range" min={50} max={2000} step={50} value={capsuleRadius} onChange={e=>setCapsuleRadius(Number(e.target.value))}
                    style={{width:'100%',accentColor:'#ffca28',height:4}}/>
                  <div style={{display:'flex',justifyContent:'space-between',fontSize:9,color:'#2a3040',marginTop:3}}>
                    <span>50m</span><span>2km</span>
                  </div>
                </div>

                {/* Unlock date */}
                <div style={{marginBottom:12}}>
                  <div style={{fontSize:11,color:'#8892a4',marginBottom:6}}>Unlock Date (optional)</div>
                  <input type="datetime-local" value={capsuleUnlockDate} onChange={e=>setCapsuleUnlockDate(e.target.value)}
                    style={{width:'100%',background:'rgba(0,0,0,.3)',border:'1px solid rgba(255,255,255,.08)',borderRadius:9,padding:'9px 12px',color:'#eef2f7',fontSize:12,outline:'none'}}/>
                </div>

                {/* Hint */}
                <div style={{marginBottom:12}}>
                  <div style={{fontSize:11,color:'#8892a4',marginBottom:6}}>Hint for finder (optional)</div>
                  <input value={capsuleHint} onChange={e=>setCapsuleHint(e.target.value)} placeholder="একটা ছোট clue দাও..." maxLength={100}
                    style={{width:'100%',background:'rgba(0,0,0,.3)',border:'1px solid rgba(255,255,255,.08)',borderRadius:9,padding:'9px 12px',color:'#eef2f7',fontSize:12,outline:'none'}}/>
                </div>

                {/* Secret message */}
                <div>
                  <div style={{fontSize:11,color:'#8892a4',marginBottom:6}}>Secret message</div>
                  <textarea value={capsuleMessage} onChange={e=>setCapsuleMessage(e.target.value)} placeholder="finder কে কী বলতে চাও?" maxLength={300}
                    style={{width:'100%',background:'rgba(0,0,0,.3)',border:'1px solid rgba(255,255,255,.08)',borderRadius:9,padding:'9px 12px',color:'#eef2f7',fontSize:12,outline:'none',resize:'none',minHeight:70}}/>
                </div>
              </div>
            )}

            {/* Link detected */}
            {detectedLink&&showLinkPreview&&(
              <div style={{background:'rgba(0,229,255,.05)',border:'1px solid rgba(0,229,255,.15)',borderRadius:13,padding:'10px 14px',marginBottom:14,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <div style={{display:'flex',gap:8,alignItems:'center',overflow:'hidden'}}>
                  <span style={{fontSize:18,flexShrink:0}}>🔗</span>
                  <span style={{fontSize:11,color:'#00e5ff',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{detectedLink}</span>
                </div>
                <button onClick={()=>setShowLinkPreview(false)} style={{background:'none',border:'none',color:'#4a5568',fontSize:14,cursor:'pointer',flexShrink:0}}>✕</button>
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════ */}
        {/* XP PREVIEW */}
        {/* ═══════════════════════════════════════ */}
        <div style={{
          background:'linear-gradient(135deg,rgba(0,229,255,.06),rgba(0,255,136,.04))',
          border:'1px solid rgba(0,229,255,.12)',
          borderRadius:14,padding:'12px 16px',marginBottom:14,
          display:'flex',alignItems:'center',justifyContent:'space-between'
        }}>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <span style={{fontSize:20}}>⚡</span>
            <div>
              <div style={{fontSize:13,fontWeight:800,color:'#eef2f7'}}>+{getXP()} XP</div>
              <div style={{fontSize:10,color:'#4a5568'}}>এই post এ পাবে</div>
            </div>
          </div>
          <div style={{display:'flex',gap:6,flexWrap:'wrap',justifyContent:'flex-end'}}>
            {[
              {show:true,        ic:'📝',val:'+10'},
              {show:!!mediaFile, ic:'🖼',val:mediaType==='video'?'+20':'+15'},
              {show:locationEnabled,ic:'📍',val:'+5'},
              {show:isPoll,      ic:'📊',val:'+5'},
              {show:selectedVibes.length>0,ic:'✨',val:'+3'},
              {show:!!title.trim(),ic:'✏️',val:'+2'},
            ].filter(x=>x.show).map((x,i)=>(
              <span key={i} style={{fontSize:10,color:'#00e5ff',background:'rgba(0,229,255,.1)',borderRadius:8,padding:'2px 6px',fontWeight:700}}>{x.ic} {x.val}</span>
            ))}
          </div>
        </div>

        {/* ═══════════════════════════════════════ */}
        {/* ERROR */}
        {/* ═══════════════════════════════════════ */}
        {postError&&(
          <div style={{background:'rgba(255,69,96,.08)',border:'1px solid rgba(255,69,96,.25)',borderRadius:12,padding:'10px 14px',marginBottom:14,fontSize:12,color:'#ff4560',display:'flex',gap:8,alignItems:'center',animation:'fadeIn .2s ease'}}>
            <span>⚠️</span>{postError}
          </div>
        )}

        {/* ═══════════════════════════════════════ */}
        {/* UPLOAD PROGRESS */}
        {/* ═══════════════════════════════════════ */}
        {uploading&&(
          <div style={{marginBottom:14,padding:'14px',background:'rgba(0,229,255,.04)',border:'1px solid rgba(0,229,255,.12)',borderRadius:14,animation:'fadeIn .2s ease'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
              <span style={{fontSize:12,color:'#8892a4'}}>{uploadStage}</span>
              <span style={{fontSize:13,color:'#00e5ff',fontWeight:800}}>{uploadProgress}%</span>
            </div>
            <div style={{height:5,background:'rgba(255,255,255,.06)',borderRadius:3,overflow:'hidden'}}>
              <div style={{
                height:'100%',width:`${uploadProgress}%`,
                background:`linear-gradient(90deg,${currentPostType?.color},#00ff88)`,
                borderRadius:3,transition:'width .3s ease',
                boxShadow:`0 0 10px ${currentPostType?.glow}`
              }}/>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════ */}
        {/* POST BUTTON */}
        {/* ═══════════════════════════════════════ */}
        <button className="btn-tap" onClick={handlePost} disabled={!canPost} style={{
          width:'100%',padding:'17px',border:'none',borderRadius:16,
          background: canPost
            ? `linear-gradient(135deg,${currentPostType?.color},${currentPostType?.color}88)`
            : 'rgba(255,255,255,.04)',
          color: canPost ? '#060810' : '#4a5568',
          fontSize:16,fontWeight:900,cursor:canPost?'pointer':'default',
          fontFamily:"'Sora',sans-serif",letterSpacing:.3,
          boxShadow: canPost ? `0 8px 32px ${currentPostType?.glow}` : 'none',
          transition:'all .2s'
        }}>
          {uploading
            ? `⏳ ${uploadStage} ${uploadProgress}%`
            : postType==='capsule' ? '📦 Capsule Drop করো'
            : postType==='echo'    ? '⚡ ECHO তে Publish করো'
            :                        '🌍 Post Share করো'}
        </button>

        <div style={{textAlign:'center',marginTop:8,fontSize:11,color:'#2a3040',paddingBottom:8}}>
          ⚡ +{getXP()} XP · {PRIVACY.find(p=>p.key===privacy)?.icon} {PRIVACY.find(p=>p.key===privacy)?.label}
        </div>
      </div>

      {/* ═══════════════════════════════════════ */}
      {/* DRAFTS MODAL */}
      {/* ═══════════════════════════════════════ */}
      {showDrafts&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.88)',zIndex:400,display:'flex',alignItems:'flex-end'}} onClick={()=>setShowDrafts(false)}>
          <div style={{width:'100%',background:'#0c1020',borderRadius:'24px 24px 0 0',padding:'20px 16px 32px',maxHeight:'70vh',display:'flex',flexDirection:'column',animation:'slideUp .3s ease'}} onClick={e=>e.stopPropagation()}>
            <div style={{width:36,height:3,background:'rgba(255,255,255,.12)',borderRadius:2,margin:'0 auto 16px'}}/>
            <div style={{fontSize:15,fontWeight:900,fontFamily:"'Sora',sans-serif",marginBottom:14}}>💾 Saved Drafts</div>
            <div style={{overflowY:'auto',flex:1}}>
              {drafts.map(d=>(
                <div key={d.id} style={{background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.06)',borderRadius:13,padding:'12px',marginBottom:8}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:6}}>
                    <div style={{display:'flex',gap:6,alignItems:'center'}}>
                      <span style={{fontSize:16}}>{POST_TYPES.find(p=>p.key===d.postType)?.icon}</span>
                      <span style={{fontSize:12,fontWeight:700,color:POST_TYPES.find(p=>p.key===d.postType)?.color}}>
                        {POST_TYPES.find(p=>p.key===d.postType)?.label}
                      </span>
                    </div>
                    <button onClick={()=>deleteDraft(d.id)} style={{background:'none',border:'none',color:'#ff4560',fontSize:12,cursor:'pointer'}}>✕</button>
                  </div>
                  <div style={{fontSize:12,color:'#8892a4',marginBottom:8,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                    {d.content||d.title||'(Media only)'}
                  </div>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                    <span style={{fontSize:10,color:'#2a3040'}}>{new Date(d.savedAt).toLocaleDateString()}</span>
                    <button onClick={()=>loadDraft(d)} style={{padding:'6px 14px',background:`${currentPostType?.color}15`,border:`1px solid ${currentPostType?.color}33`,borderRadius:8,color:currentPostType?.color,fontSize:11,fontWeight:700,cursor:'pointer'}}>
                      Load
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* BOTTOM NAV */}
      <div style={{
        position:'fixed',bottom:0,left:0,right:0,
        background:'rgba(6,8,16,.98)',backdropFilter:'blur(20px)',
        borderTop:'1px solid rgba(255,255,255,.05)',
        display:'flex',justifyContent:'space-around',padding:'10px 0 22px',zIndex:100
      }}>
        {[['🏠','Feed','/feed'],['🗺','Map','/map'],['📸','Post','/post'],['🏆','Rank','/leaderboard'],['👤','Me','/profile']].map(([ic,lab,path])=>(
          <div key={path} className="btn-tap" onClick={()=>window.location.href=path} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:3,cursor:'pointer',color:path==='/post'?'#00e5ff':'#2a3040'}}>
            <span style={{fontSize:22}}>{ic}</span>
            <span style={{fontSize:9,fontWeight:600}}>{lab}</span>
          </div>
        ))}
      </div>
    </div>
  )
                     }
