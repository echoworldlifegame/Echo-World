'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const CLOUD_NAME = 'dbguxwpa8'
const UPLOAD_PRESET = 'echoworld_preset'

export default function Echo() {
  const [videos, setVideos] = useState([])
  const [user, setUser] = useState(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [liked, setLiked] = useState({})
  const [supported, setSupported] = useState({})
  const [paused, setPaused] = useState(false)
  const [showHeart, setShowHeart] = useState(false)
  const [showOutro, setShowOutro] = useState(false)
  const [outroTimer, setOutroTimer] = useState(null)
  const [mixMode, setMixMode] = useState(false)
  const [mixVideo, setMixVideo] = useState(null)
  const [mixStep, setMixStep] = useState('choose')
  const [mixLayout, setMixLayout] = useState('side')
  const [mixFile, setMixFile] = useState(null)
  const [mixFileUrl, setMixFileUrl] = useState(null)
  const [mixFileType, setMixFileType] = useState(null)
  const [mixPrivacy, setMixPrivacy] = useState('public')
  const [mixCaption, setMixCaption] = useState('')
  const [mixTitle, setMixTitle] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showComments, setShowComments] = useState(false)
  const [comments, setComments] = useState([])
  const [commentText, setCommentText] = useState('')
  const [sendingComment, setSendingComment] = useState(false)
  const [transitioning, setTransitioning] = useState(false)
  const [transDir, setTransDir] = useState(0)
  const [nextIndex, setNextIndex] = useState(null)
  const [userPos, setUserPos] = useState(null)

  // Mix editor states
  const [brightness, setBrightness] = useState(100)
  const [contrast, setContrast] = useState(100)
  const [saturation, setSaturation] = useState(100)
  const [hue, setHue] = useState(0)
  const [blur, setBlur] = useState(0)
  const [filter, setFilter] = useState('none')
  const [textOverlay, setTextOverlay] = useState('')
  const [textColor, setTextColor] = useState('#ffffff')
  const [textSize, setTextSize] = useState(22)
  const [speed, setSpeed] = useState(1)
  const [mixMuted, setMixMuted] = useState(false)
  const [activeEditTab, setActiveEditTab] = useState('filters')

  const videoRef = useRef(null)
  const mixFileRef = useRef(null)
  const cameraRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const recordedChunksRef = useRef([])
  const [recording, setRecording] = useState(false)
  const [cameraStream, setCameraStream] = useState(null)
  const touchStartY = useRef(0)
  const touchStartTime = useRef(0)
  const lastTap = useRef(0)
  const videoStartTime = useRef(null)
  const watchedRef = useRef({})

  // ─── Get location ─────────────────────────────────────
  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      pos => setUserPos([pos.coords.latitude, pos.coords.longitude]),
      () => {}
    )
  }, [])

  // ─── Auth + load algorithm videos ─────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { window.location.href = '/'; return }
      const u = data.session.user
      setUser(u)
      await loadAlgorithmVideos(u.id)
    })
  }, [])

  // ─── Load videos from algorithm ───────────────────────
  const loadAlgorithmVideos = async (userId) => {
    try {
      const params = new URLSearchParams({
        userId,
        limit: 30,
        ...(userPos && { lat: userPos[0], lng: userPos[1] })
      })
      const res = await fetch(`/api/algorithm/echo?${params}`)
      const data = await res.json()

      if (data.videos && data.videos.length > 0) {
        setVideos(data.videos)

        const { data: myLikes } = await supabase
          .from('likes').select('post_id').eq('user_id', userId)
        const likedMap = {}
        ;(myLikes || []).forEach(l => { likedMap[l.post_id] = true })
        setLiked(likedMap)

        const { data: following } = await supabase
          .from('followers').select('following_id').eq('follower_id', userId)
        const supportedMap = {}
        ;(following || []).forEach(f => { supportedMap[f.following_id] = true })
        setSupported(supportedMap)

        setLoading(false)
        return
      }
    } catch (e) {}

    // Fallback
    await loadVideosFallback(userId)
  }

  const loadVideosFallback = async (userId) => {
    const { data: following } = await supabase
      .from('followers').select('following_id').eq('follower_id', userId)
    const followingIds = (following || []).map(f => f.following_id)

    const { data: vids } = await supabase
      .from('posts')
      .select('*, profiles(id, username, full_name, avatar_url)')
      .eq('media_type', 'video')
      .not('media_url', 'is', null)
      .order('created_at', { ascending: false })

    if (vids) {
      const sorted = [...vids].sort((a, b) => {
        const aF = followingIds.includes(a.user_id)
        const bF = followingIds.includes(b.user_id)
        if (aF && !bF) return -1
        if (!aF && bF) return 1
        return 0
      })
      setVideos(sorted)

      const { data: myLikes } = await supabase
        .from('likes').select('post_id').eq('user_id', userId)
      const likedMap = {}
      ;(myLikes || []).forEach(l => { likedMap[l.post_id] = true })
      setLiked(likedMap)

      const supportedMap = {}
      followingIds.forEach(id => { supportedMap[id] = true })
      setSupported(supportedMap)
    }
    setLoading(false)
  }

  // ─── Track interaction ────────────────────────────────
  const trackInteraction = useCallback(async (postId, type, durationMs = 0) => {
    if (!postId) return
    try {
      await fetch('/api/algorithm/interact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId, type, durationMs, source: 'echo' })
      })
    } catch (e) {}
  }, [])

  // ─── Video play/pause on index change ─────────────────
  useEffect(() => {
    if (!videoRef.current || !videos[currentIndex]) return
    videoRef.current.play().catch(() => {})
    setPaused(false)
    setShowOutro(false)
    videoStartTime.current = Date.now()

    // Track view after 1s
    const vid = videos[currentIndex]
    const t = setTimeout(() => {
      if (!watchedRef.current[vid.id]) {
        trackInteraction(vid.id, 'view')
        watchedRef.current[vid.id] = true
      }
    }, 1000)
    return () => clearTimeout(t)
  }, [currentIndex, videos])

  // ─── Navigation ───────────────────────────────────────
  const navigate = useCallback((dir) => {
    if (transitioning) return
    const next = currentIndex + dir

    // Track skip if going forward quickly
    if (dir > 0 && videoStartTime.current) {
      const watchDur = Date.now() - videoStartTime.current
      if (watchDur < 3000) {
        trackInteraction(videos[currentIndex]?.id, 'skip', watchDur)
      } else if (watchDur > 5000) {
        trackInteraction(videos[currentIndex]?.id, 'long_view', watchDur)
      }
    }

    if (next < 0 || next >= videos.length) return
    setTransitioning(true)
    setTransDir(dir)
    setNextIndex(next)
    setTimeout(() => {
      setCurrentIndex(next)
      setNextIndex(null)
      setTransitioning(false)
      setTransDir(0)
    }, 350)
  }, [currentIndex, videos.length, transitioning, videos])

  const handleTouchStart = (e) => {
    touchStartY.current = e.touches[0].clientY
    touchStartTime.current = Date.now()
  }

  const handleTouchEnd = (e) => {
    const diff = touchStartY.current - e.changedTouches[0].clientY
    const duration = Date.now() - touchStartTime.current
    if (Math.abs(diff) > 60 && duration < 600) {
      if (diff > 0) navigate(1)
      else navigate(-1)
    }
  }

  const handleTap = (e) => {
    const now = Date.now()
    if (now - lastTap.current < 280) {
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

  const handleVideoEnd = () => {
    // Track completion
    const vid = videos[currentIndex]
    if (vid) trackInteraction(vid.id, 'completion', videoRef.current?.duration * 1000 || 0)

    setShowOutro(true)
    const t = setTimeout(() => {
      setShowOutro(false)
      navigate(1)
    }, 2200)
    setOutroTimer(t)
  }

  // ─── Video progress tracking ──────────────────────────
  const handleTimeUpdate = (e) => {
    const vid = videos[currentIndex]
    if (!vid) return
    const pct = e.target.currentTime / e.target.duration
    // Track at 80% watch = completion signal
    if (pct > 0.8 && !watchedRef.current[vid.id + '_complete']) {
      watchedRef.current[vid.id + '_complete'] = true
      trackInteraction(vid.id, 'completion', e.target.currentTime * 1000)
    }
  }

  const handleLike = async () => {
    if (!user || !videos[currentIndex]) return
    const vid = videos[currentIndex]
    if (liked[vid.id]) {
      await supabase.from('likes').delete().eq('user_id', user.id).eq('post_id', vid.id)
      await supabase.from('posts').update({ likes_count: Math.max((vid.likes_count || 1) - 1, 0) }).eq('id', vid.id)
      setLiked(p => ({ ...p, [vid.id]: false }))
      setVideos(vs => vs.map((v, i) => i === currentIndex ? { ...v, likes_count: Math.max((v.likes_count || 1) - 1, 0) } : v))
    } else {
      await supabase.from('likes').upsert({ user_id: user.id, post_id: vid.id })
      await supabase.from('posts').update({ likes_count: (vid.likes_count || 0) + 1 }).eq('id', vid.id)
      setLiked(p => ({ ...p, [vid.id]: true }))
      setVideos(vs => vs.map((v, i) => i === currentIndex ? { ...v, likes_count: (v.likes_count || 0) + 1 } : v))
      trackInteraction(vid.id, 'like')
    }
  }

  const handleSupport = async (profileId) => {
    if (!user || profileId === user.id || supported[profileId]) return
    await supabase.from('followers').upsert({ follower_id: user.id, following_id: profileId })
    await supabase.from('notifications').insert({ user_id: profileId, from_user_id: user.id, type: 'follow', message: 'started supporting you' })
    setSupported(p => ({ ...p, [profileId]: true }))
  }

  const loadComments = async (postId) => {
    const { data } = await supabase
      .from('comments')
      .select('*, profiles(id, username, full_name, avatar_url)')
      .eq('post_id', postId)
      .order('created_at', { ascending: true })
    setComments(data || [])
  }

  const sendComment = async () => {
    if (!commentText.trim() || !user || sendingComment) return
    const vid = videos[currentIndex]
    setSendingComment(true)
    const { data: c } = await supabase.from('comments').insert({
      post_id: vid.id, user_id: user.id, content: commentText.trim()
    }).select('*, profiles(id, username, full_name, avatar_url)').single()
    if (c) {
      setComments(prev => [...prev, c])
      setVideos(vs => vs.map((v, i) => i === currentIndex ? { ...v, comments_count: (v.comments_count || 0) + 1 } : v))
      trackInteraction(vid.id, 'comment')
    }
    setCommentText('')
    setSendingComment(false)
  }

  // ─── Camera / Mix ─────────────────────────────────────
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      setCameraStream(stream)
      if (cameraRef.current) cameraRef.current.srcObject = stream
    } catch (e) { alert('Camera access denied') }
  }

  const startRecording = () => {
    if (!cameraStream) return
    recordedChunksRef.current = []
    const mr = new MediaRecorder(cameraStream)
    mr.ondataavailable = e => { if (e.data.size > 0) recordedChunksRef.current.push(e.data) }
    mr.onstop = () => {
      const blob = new Blob(recordedChunksRef.current, { type: 'video/mp4' })
      const url = URL.createObjectURL(blob)
      setMixFile(new File([blob], 'mix.mp4', { type: 'video/mp4' }))
      setMixFileUrl(url)
      setMixFileType('video')
      setMixStep('edit')
      cameraStream.getTracks().forEach(t => t.stop())
      setCameraStream(null)
    }
    mediaRecorderRef.current = mr
    mr.start()
    setRecording(true)
  }

  const stopRecording = () => {
    mediaRecorderRef.current?.stop()
    setRecording(false)
  }

  const getFilterCSS = (f) => {
    const filters = {
      none: '', warm: 'sepia(0.25) saturate(1.5)', cool: 'hue-rotate(20deg) saturate(0.9)',
      bw: 'grayscale(1)', vivid: 'saturate(2) contrast(1.1)', drama: 'contrast(1.4) brightness(0.85)',
      golden: 'sepia(0.5) saturate(1.8)', neon: 'saturate(3) contrast(1.2)', cinema: 'contrast(1.2) sepia(0.1)',
    }
    return filters[f] || ''
  }

  const getMixStyle = () => ({
    filter: `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) hue-rotate(${hue}deg) blur(${blur}px) ${getFilterCSS(filter)}`,
  })

  const handleMixUpload = async () => {
    if (!user || !mixVideo) return
    setUploading(true)
    let mediaUrl = null
    if (mixFile) {
      const formData = new FormData()
      formData.append('file', mixFile)
      formData.append('upload_preset', UPLOAD_PRESET)
      const xhr = new XMLHttpRequest()
      xhr.upload.onprogress = e => { if (e.lengthComputable) setUploadProgress(Math.round(e.loaded / e.total * 100)) }
      mediaUrl = await new Promise(resolve => {
        xhr.onload = () => resolve(JSON.parse(xhr.responseText).secure_url)
        xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`)
        xhr.send(formData)
      })
    }
    const { data: newPost } = await supabase.from('posts').insert({
      user_id: user.id, content: mixCaption, title: mixTitle,
      media_url: mediaUrl, media_type: 'video',
      privacy: mixPrivacy, post_format: 'echo',
      remix_of: mixVideo.id, remix_of_user: mixVideo.user_id,
    }).select().single()

    // Track remix interaction
    trackInteraction(mixVideo.id, 'remix')

    setUploading(false)
    setMixMode(false)
    alert('🎉 ECHO MIX uploaded!')
  }

  const formatNum = n => !n ? '0' : n >= 1000000 ? (n / 1000000).toFixed(1) + 'M' : n >= 1000 ? (n / 1000).toFixed(1) + 'K' : n.toString()
  const getName = vid => vid.profiles?.full_name || vid.profiles?.username || 'Explorer'
  const getUsername = vid => vid.profiles?.username || 'explorer'
  const timeAgo = date => {
    const s = Math.floor((new Date() - new Date(date)) / 1000)
    if (s < 60) return 'এইমাত্র'
    if (s < 3600) return Math.floor(s / 60) + 'মি'
    if (s < 86400) return Math.floor(s / 3600) + 'ঘ'
    return Math.floor(s / 86400) + 'দিন'
  }

  const bottomNav = (
    <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.92)', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-around', padding: '10px 0 20px', zIndex: 400 }}>
      {[{ icon: '🏠', label: 'Home', path: '/feed' }, { icon: '🗺', label: 'Map', path: '/map' }, { icon: '📸', label: 'Post', path: '/post' }, { icon: '🏆', label: 'Rank', path: '/leaderboard' }, { icon: '👤', label: 'Profile', path: '/profile' }].map(item => (
        <div key={item.label} onClick={() => window.location.href = item.path} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', cursor: 'pointer', color: 'rgba(255,255,255,0.35)' }}>
          <span style={{ fontSize: '22px' }}>{item.icon}</span>
          <span style={{ fontSize: '10px', fontWeight: '600' }}>{item.label}</span>
        </div>
      ))}
    </div>
  )

  if (loading) return (
    <div style={{ height: '100vh', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '12px' }}>
      <div style={{ fontSize: '48px', animation: 'spin 1s linear infinite' }}>⚡</div>
      <div style={{ color: '#4a5568', fontSize: '14px', letterSpacing: '2px' }}>AI LOADING ECHO...</div>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  if (videos.length === 0) return (
    <div style={{ height: '100vh', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px', color: '#fff', padding: '24px', textAlign: 'center', paddingBottom: '80px' }}>
      <div style={{ fontSize: '64px' }}>⚡</div>
      <div style={{ fontSize: '24px', fontWeight: '900' }}>No ECHO Videos</div>
      <button onClick={() => window.location.href = '/post'} style={{ background: 'linear-gradient(135deg,#00e5ff,#00ff88)', border: 'none', borderRadius: '14px', padding: '14px 36px', fontSize: '15px', fontWeight: '800', color: '#000', cursor: 'pointer' }}>⚡ Create First ECHO</button>
      {bottomNav}
    </div>
  )

  // ─── MIX MODE ─────────────────────────────────────────
  if (mixMode && mixVideo) {
    if (mixStep === 'camera') return (
      <div style={{ minHeight: '100vh', background: '#000', color: '#fff', paddingBottom: '80px' }}>
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.9)', padding: '0 16px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 100 }}>
          <button onClick={() => { cameraStream?.getTracks().forEach(t => t.stop()); setCameraStream(null); setMixStep('choose') }} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '24px', cursor: 'pointer' }}>←</button>
          <div style={{ fontSize: '14px', fontWeight: '800', color: '#ffa500' }}>🎥 Record MIX</div>
          <div style={{ width: '40px' }} />
        </div>
        <div style={{ paddingTop: '56px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '72px 16px 20px' }}>
          <div style={{ width: '100%', borderRadius: '16px', overflow: 'hidden', background: '#111', position: 'relative' }}>
            <video ref={cameraRef} autoPlay playsInline muted style={{ width: '100%', maxHeight: '50vh', objectFit: 'cover', display: 'block' }} />
            {recording && <div style={{ position: 'absolute', top: '12px', right: '12px', background: '#ff4560', borderRadius: '20px', padding: '4px 10px', fontSize: '12px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px' }}>🔴 REC</div>}
          </div>
          {!cameraStream ? (
            <button onClick={startCamera} style={{ width: '100%', padding: '14px', background: 'linear-gradient(135deg,#ffa500,#ff6b35)', border: 'none', borderRadius: '14px', color: '#fff', fontSize: '15px', fontWeight: '800', cursor: 'pointer' }}>📷 Open Camera</button>
          ) : !recording ? (
            <button onClick={startRecording} style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#ff4560', border: '4px solid #fff', fontSize: '28px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>●</button>
          ) : (
            <button onClick={stopRecording} style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#fff', border: '4px solid #ff4560', fontSize: '28px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>■</button>
          )}
        </div>
        {bottomNav}
      </div>
    )

    if (mixStep === 'choose') return (
      <div style={{ minHeight: '100vh', background: '#070a10', color: '#eef2f7', paddingBottom: '80px' }}>
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, background: 'rgba(7,10,16,0.97)', padding: '0 16px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 100, borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <button onClick={() => setMixMode(false)} style={{ background: 'none', border: 'none', color: '#8892a4', fontSize: '24px', cursor: 'pointer' }}>←</button>
          <div style={{ fontSize: '15px', fontWeight: '900', color: '#ffa500' }}>🔀 ECHO MIX</div>
          <div style={{ width: '40px' }} />
        </div>
        <div style={{ padding: '72px 16px 20px' }}>
          <div style={{ borderRadius: '16px', overflow: 'hidden', marginBottom: '16px', position: 'relative' }}>
            <video src={mixVideo.media_url} style={{ width: '100%', maxHeight: '180px', objectFit: 'cover' }} playsInline muted loop autoPlay />
            <div style={{ position: 'absolute', bottom: '8px', left: '10px', background: 'rgba(0,0,0,0.7)', borderRadius: '8px', padding: '4px 10px', fontSize: '12px', color: '#ffa500', fontWeight: '700' }}>
              🔀 Mixing: @{getUsername(mixVideo)}
            </div>
          </div>
          <div style={{ fontSize: '12px', color: '#4a5568', marginBottom: '12px', fontWeight: '600' }}>YOUR CONTENT</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
            {[
              { icon: '🎥', label: 'Record Camera', action: 'camera' },
              { icon: '📁', label: 'Upload Video', action: 'upload-video' },
              { icon: '🖼', label: 'Upload Photo', action: 'upload-photo' },
              { icon: '🔊', label: 'Audio Only', action: 'audio' },
            ].map(opt => (
              <div key={opt.action} onClick={() => {
                if (opt.action === 'camera') { setMixStep('camera'); startCamera() }
                else if (opt.action === 'audio') { setMixFileType('audio'); setMixStep('edit') }
                else mixFileRef.current?.click()
              }} style={{ background: '#111620', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '14px', padding: '18px', cursor: 'pointer', textAlign: 'center' }}>
                <div style={{ fontSize: '28px', marginBottom: '8px' }}>{opt.icon}</div>
                <div style={{ fontSize: '12px', fontWeight: '700' }}>{opt.label}</div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: '12px', color: '#4a5568', marginBottom: '10px', fontWeight: '600' }}>LAYOUT</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
            {[
              { key: 'side', label: '▫ Side' },
              { key: 'top', label: '⬒ Top/Bot' },
              { key: 'pip-me', label: '⊡ Me Big' },
              { key: 'pip-them', label: '⊠ Them Big' },
              { key: 'split-v', label: '⬓ Split V' },
              { key: 'overlay', label: '⧉ Overlay' },
            ].map(l => (
              <button key={l.key} onClick={() => setMixLayout(l.key)} style={{ padding: '8px', borderRadius: '10px', border: `2px solid ${mixLayout === l.key ? '#ffa500' : 'rgba(255,255,255,0.07)'}`, background: mixLayout === l.key ? 'rgba(255,165,0,0.1)' : 'rgba(255,255,255,0.02)', color: mixLayout === l.key ? '#ffa500' : '#4a5568', fontSize: '11px', fontWeight: '600', cursor: 'pointer' }}>
                {l.label}
              </button>
            ))}
          </div>
          <input ref={mixFileRef} type="file" accept="image/*,video/*" onChange={e => {
            const f = e.target.files[0]; if (!f) return
            setMixFile(f); setMixFileUrl(URL.createObjectURL(f))
            setMixFileType(f.type.startsWith('video') ? 'video' : 'photo')
            setMixStep('edit')
          }} style={{ display: 'none' }} />
        </div>
        {bottomNav}
      </div>
    )

    if (mixStep === 'edit') {
      const renderLayout = () => {
        const orig = <video src={mixVideo.media_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} playsInline muted loop autoPlay />
        const mine = mixFileUrl ? (
          mixFileType === 'video'
            ? <video src={mixFileUrl} style={{ width: '100%', height: '100%', objectFit: 'cover', ...getMixStyle() }} playsInline muted loop autoPlay />
            : <img src={mixFileUrl} style={{ width: '100%', height: '100%', objectFit: 'cover', ...getMixStyle() }} />
        ) : <div style={{ width: '100%', height: '100%', background: '#1a2030', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4a5568', fontSize: '12px' }}>🎙 Audio Only</div>

        if (mixLayout === 'side') return <div style={{ display: 'flex', height: '240px' }}><div style={{ flex: 1, overflow: 'hidden' }}>{orig}</div><div style={{ flex: 1, overflow: 'hidden' }}>{mine}</div></div>
        if (mixLayout === 'top') return <div style={{ height: '280px' }}><div style={{ height: '140px', overflow: 'hidden' }}>{orig}</div><div style={{ height: '140px', overflow: 'hidden' }}>{mine}</div></div>
        if (mixLayout === 'pip-me') return <div style={{ height: '260px', position: 'relative', overflow: 'hidden' }}><div style={{ position: 'absolute', inset: 0 }}>{mine}</div><div style={{ position: 'absolute', top: '10px', right: '10px', width: '90px', height: '130px', borderRadius: '10px', overflow: 'hidden', border: '2px solid #ffa500' }}>{orig}</div></div>
        if (mixLayout === 'pip-them') return <div style={{ height: '260px', position: 'relative', overflow: 'hidden' }}><div style={{ position: 'absolute', inset: 0 }}>{orig}</div><div style={{ position: 'absolute', top: '10px', right: '10px', width: '90px', height: '130px', borderRadius: '10px', overflow: 'hidden', border: '2px solid #ffa500' }}>{mine}</div></div>
        if (mixLayout === 'split-v') return <div style={{ display: 'flex', height: '240px' }}><div style={{ width: '50%', overflow: 'hidden', clipPath: 'polygon(0 0,85% 0,100% 100%,0 100%)' }}>{orig}</div><div style={{ width: '50%', overflow: 'hidden', clipPath: 'polygon(15% 0,100% 0,100% 100%,0 100%)' }}>{mine}</div></div>
        return <div style={{ height: '260px', position: 'relative', overflow: 'hidden' }}><div style={{ position: 'absolute', inset: 0 }}>{orig}</div><div style={{ position: 'absolute', inset: 0, opacity: 0.6 }}>{mine}</div></div>
      }

      return (
        <div style={{ minHeight: '100vh', background: '#070a10', color: '#eef2f7', paddingBottom: '80px' }}>
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, background: 'rgba(7,10,16,0.97)', padding: '0 16px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 100, borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
            <button onClick={() => setMixStep('choose')} style={{ background: 'none', border: 'none', color: '#8892a4', fontSize: '24px', cursor: 'pointer' }}>←</button>
            <div style={{ fontSize: '14px', fontWeight: '800', color: '#ffa500' }}>✂️ Edit MIX</div>
            <button onClick={() => setMixStep('preview')} style={{ background: 'linear-gradient(135deg,#ffa500,#ff6b35)', border: 'none', borderRadius: '20px', padding: '8px 16px', fontSize: '13px', fontWeight: '700', color: '#fff', cursor: 'pointer' }}>Preview →</button>
          </div>
          <div style={{ padding: '72px 16px 20px' }}>
            <div style={{ borderRadius: '16px', overflow: 'hidden', marginBottom: '12px', background: '#000', position: 'relative' }}>
              {renderLayout()}
              <div style={{ position: 'absolute', top: '8px', left: '8px', background: 'rgba(0,0,0,0.65)', borderRadius: '8px', padding: '3px 8px', fontSize: '10px', color: '#ffa500', fontWeight: '700' }}>🔀 MIX · @{getUsername(mixVideo)}</div>
              {textOverlay && <div style={{ position: 'absolute', bottom: '10px', left: '50%', transform: 'translateX(-50%)', color: textColor, fontSize: `${textSize}px`, fontWeight: '800', textShadow: '2px 2px 6px rgba(0,0,0,0.9)', whiteSpace: 'nowrap' }}>{textOverlay}</div>}
            </div>

            <div style={{ display: 'flex', gap: '0', borderBottom: '1px solid rgba(255,255,255,0.07)', marginBottom: '14px', overflowX: 'auto', scrollbarWidth: 'none' }}>
              {['filters', 'adjust', 'text', 'video'].map(t => (
                <button key={t} onClick={() => setActiveEditTab(t)} style={{ padding: '8px 14px', border: 'none', background: 'transparent', color: activeEditTab === t ? '#ffa500' : '#4a5568', borderBottom: activeEditTab === t ? '2px solid #ffa500' : '2px solid transparent', fontSize: '12px', fontWeight: '700', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  {t === 'filters' ? '🎨 Filters' : t === 'adjust' ? '⚙️ Adjust' : t === 'text' ? '✏️ Text' : '🎬 Video'}
                </button>
              ))}
            </div>

            {activeEditTab === 'filters' && (
              <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px', scrollbarWidth: 'none' }}>
                {['none', 'warm', 'cool', 'bw', 'vivid', 'drama', 'golden', 'neon', 'cinema'].map(f => (
                  <div key={f} onClick={() => setFilter(f)} style={{ flexShrink: 0, textAlign: 'center', cursor: 'pointer' }}>
                    <div style={{ width: '55px', height: '55px', borderRadius: '10px', overflow: 'hidden', border: `2px solid ${filter === f ? '#ffa500' : 'transparent'}`, background: '#1a2030', marginBottom: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', filter: getFilterCSS(f) }}>🎬</div>
                    <div style={{ fontSize: '9px', color: filter === f ? '#ffa500' : '#4a5568', fontWeight: '600', textTransform: 'capitalize' }}>{f}</div>
                  </div>
                ))}
              </div>
            )}

            {activeEditTab === 'adjust' && (
              <div>
                {[
                  { label: '☀️ Brightness', value: brightness, setter: setBrightness, min: 0, max: 200, unit: '%' },
                  { label: '◑ Contrast', value: contrast, setter: setContrast, min: 0, max: 200, unit: '%' },
                  { label: '🎨 Saturation', value: saturation, setter: setSaturation, min: 0, max: 200, unit: '%' },
                  { label: '🌈 Hue', value: hue, setter: setHue, min: -180, max: 180, unit: '°' },
                  { label: '💧 Blur', value: blur, setter: setBlur, min: 0, max: 10, unit: 'px' },
                ].map(adj => (
                  <div key={adj.label} style={{ marginBottom: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '12px', color: '#8892a4' }}>{adj.label}</span>
                      <span style={{ fontSize: '12px', color: '#ffa500', fontWeight: '600' }}>{adj.value}{adj.unit}</span>
                    </div>
                    <input type="range" min={adj.min} max={adj.max} value={adj.value} onChange={e => adj.setter(Number(e.target.value))} style={{ width: '100%', accentColor: '#ffa500' }} />
                  </div>
                ))}
              </div>
            )}

            {activeEditTab === 'text' && (
              <div>
                <input placeholder="Add text overlay..." value={textOverlay} onChange={e => setTextOverlay(e.target.value)}
                  style={{ width: '100%', background: '#0c1018', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '10px 12px', color: '#eef2f7', fontSize: '13px', outline: 'none', boxSizing: 'border-box', marginBottom: '10px' }} />
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
                  {['#ffffff', '#000000', '#ffa500', '#00e5ff', '#00ff88', '#ff4560', '#ffca28'].map(c => (
                    <div key={c} onClick={() => setTextColor(c)} style={{ width: '28px', height: '28px', borderRadius: '50%', background: c, border: `3px solid ${textColor === c ? '#fff' : 'transparent'}`, cursor: 'pointer' }} />
                  ))}
                </div>
                <input type="range" min={12} max={48} value={textSize} onChange={e => setTextSize(Number(e.target.value))} style={{ width: '100%', accentColor: '#ffa500' }} />
              </div>
            )}

            {activeEditTab === 'video' && (
              <div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '14px' }}>
                  {[0.5, 0.75, 1, 1.25, 1.5, 2].map(s => (
                    <button key={s} onClick={() => setSpeed(s)} style={{ padding: '7px 12px', borderRadius: '8px', border: `2px solid ${speed === s ? '#ffa500' : 'rgba(255,255,255,0.07)'}`, background: speed === s ? 'rgba(255,165,0,0.1)' : 'transparent', color: speed === s ? '#ffa500' : '#4a5568', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>{s}x</button>
                  ))}
                </div>
                <button onClick={() => setMixMuted(!mixMuted)} style={{ width: '100%', padding: '10px', borderRadius: '10px', border: `2px solid ${mixMuted ? '#ff4560' : 'rgba(255,255,255,0.07)'}`, background: mixMuted ? 'rgba(255,69,96,0.1)' : 'transparent', color: mixMuted ? '#ff4560' : '#4a5568', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>
                  {mixMuted ? '🔇 Muted' : '🔊 Audio On'}
                </button>
              </div>
            )}

            <input placeholder="Title..." value={mixTitle} onChange={e => setMixTitle(e.target.value)}
              style={{ width: '100%', background: '#111620', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '10px 12px', color: '#eef2f7', fontSize: '13px', outline: 'none', boxSizing: 'border-box', marginTop: '14px', marginBottom: '8px' }} />
            <textarea placeholder="Caption..." value={mixCaption} onChange={e => setMixCaption(e.target.value)}
              style={{ width: '100%', background: '#111620', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '10px 12px', color: '#eef2f7', fontSize: '13px', outline: 'none', boxSizing: 'border-box', resize: 'none', minHeight: '60px', marginBottom: '8px' }} />
            <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
              {[{ key: 'public', label: '🌍' }, { key: 'friends', label: '👥' }, { key: 'private', label: '🔒' }, { key: 'capsule', label: '📦' }].map(p => (
                <button key={p.key} onClick={() => setMixPrivacy(p.key)} style={{ flex: 1, padding: '8px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '16px', background: mixPrivacy === p.key ? 'linear-gradient(135deg,#ffa500,#ff6b35)' : 'rgba(255,255,255,0.05)' }}>{p.label}</button>
              ))}
            </div>
          </div>
          {bottomNav}
        </div>
      )
    }

    // Preview step
    return (
      <div style={{ minHeight: '100vh', background: '#070a10', color: '#eef2f7', paddingBottom: '80px' }}>
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, background: 'rgba(7,10,16,0.97)', padding: '0 16px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 100, borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <button onClick={() => setMixStep('edit')} style={{ background: 'none', border: 'none', color: '#8892a4', fontSize: '24px', cursor: 'pointer' }}>←</button>
          <div style={{ fontSize: '14px', fontWeight: '800', color: '#ffa500' }}>👁 Preview MIX</div>
          <div style={{ width: '40px' }} />
        </div>
        <div style={{ padding: '72px 16px 20px' }}>
          <div style={{ borderRadius: '16px', overflow: 'hidden', marginBottom: '16px', background: '#000', position: 'relative' }}>
            {mixLayout === 'side' ? (
              <div style={{ display: 'flex', height: '300px' }}>
                <div style={{ flex: 1, overflow: 'hidden' }}><video src={mixVideo.media_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} playsInline muted loop autoPlay /></div>
                {mixFileUrl && <div style={{ flex: 1, overflow: 'hidden' }}>{mixFileType === 'video' ? <video src={mixFileUrl} style={{ width: '100%', height: '100%', objectFit: 'cover', ...getMixStyle() }} playsInline muted loop autoPlay /> : <img src={mixFileUrl} style={{ width: '100%', height: '100%', objectFit: 'cover', ...getMixStyle() }} />}</div>}
              </div>
            ) : (
              <div style={{ height: '300px', position: 'relative' }}>
                <video src={mixVideo.media_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} playsInline muted loop autoPlay />
                {mixFileUrl && <div style={{ position: 'absolute', bottom: '12px', right: '12px', width: '100px', height: '150px', borderRadius: '10px', overflow: 'hidden', border: '2px solid #ffa500' }}>{mixFileType === 'video' ? <video src={mixFileUrl} style={{ width: '100%', height: '100%', objectFit: 'cover', ...getMixStyle() }} playsInline muted loop autoPlay /> : <img src={mixFileUrl} style={{ width: '100%', height: '100%', objectFit: 'cover', ...getMixStyle() }} />}</div>}
              </div>
            )}
            <div style={{ position: 'absolute', top: '8px', left: '8px', background: 'rgba(0,0,0,0.7)', borderRadius: '8px', padding: '4px 10px', fontSize: '11px', fontWeight: '900', color: '#00e5ff', backdropFilter: 'blur(4px)' }}>⬡ ECHO WORLD</div>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={() => { if (mixFileUrl) { const a = document.createElement('a'); a.href = mixFileUrl; a.download = `echoworld_mix_${Date.now()}.mp4`; a.click() } }} style={{ flex: 1, padding: '14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px', color: '#8892a4', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}>⬇ Download</button>
            <button onClick={handleMixUpload} disabled={uploading} style={{ flex: 2, padding: '14px', background: 'linear-gradient(135deg,#ffa500,#ff6b35)', border: 'none', borderRadius: '14px', color: '#fff', fontSize: '15px', fontWeight: '800', cursor: 'pointer', opacity: uploading ? 0.7 : 1 }}>
              {uploading ? `Uploading ${uploadProgress}%...` : '⚡ Upload MIX'}
            </button>
          </div>
        </div>
        {bottomNav}
      </div>
    )
  }

  // ─── MAIN ECHO FEED ───────────────────────────────────
  const vid = videos[currentIndex]

  return (
    <div style={{ height: '100vh', background: '#000', overflow: 'hidden', position: 'relative', userSelect: 'none' }}
      onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd} onClick={handleTap}>

      {/* Current video */}
      <video ref={videoRef} key={vid.id} src={vid.media_url}
        style={{
          position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover',
          transform: transitioning ? `translateY(${transDir < 0 ? '100%' : '-100%'})` : 'translateY(0)',
          transition: transitioning ? 'transform 0.35s cubic-bezier(0.25,0.46,0.45,0.94)' : 'none'
        }}
        loop={false} playsInline autoPlay
        onEnded={handleVideoEnd}
        onTimeUpdate={handleTimeUpdate} />

      {/* Next video peek */}
      {transitioning && nextIndex !== null && videos[nextIndex] && (
        <video src={videos[nextIndex].media_url}
          style={{
            position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover',
            transform: transDir > 0 ? 'translateY(100%)' : 'translateY(-100%)',
            transition: 'transform 0.35s cubic-bezier(0.25,0.46,0.45,0.94)'
          }}
          playsInline muted autoPlay />
      )}

      {/* Gradient overlay */}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top,rgba(0,0,0,0.95) 0%,transparent 40%,rgba(0,0,0,0.1) 100%)', pointerEvents: 'none', zIndex: 100 }} />

      {/* Double tap heart */}
      {showHeart && <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', fontSize: '90px', zIndex: 400, pointerEvents: 'none', animation: 'heartPop 0.9s ease forwards' }}>❤️</div>}

      {/* Pause icon */}
      {paused && <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', background: 'rgba(0,0,0,0.55)', borderRadius: '50%', width: '72px', height: '72px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', pointerEvents: 'none', zIndex: 200 }}>▶️</div>}

      {/* ECHO WORLD OUTRO */}
      {showOutro && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(7,10,16,0.96)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 450, animation: 'fadeIn 0.4s ease' }}>
          <div style={{ fontSize: '60px', marginBottom: '16px', animation: 'echoPulse 1s ease infinite' }}>⬡</div>
          <div style={{ fontSize: '38px', fontWeight: '900', background: 'linear-gradient(90deg,#00e5ff,#00ff88)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-1px' }}>ECHO WORLD</div>
          <div style={{ fontSize: '13px', color: '#4a5568', marginTop: '8px' }}>echo-world-psi.vercel.app</div>
          <div style={{ marginTop: '20px', display: 'flex', gap: '8px' }}>
            {[0, 1, 2].map(i => <div key={i} style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#00e5ff', animation: `dot 1s ${i * 0.2}s infinite` }} />)}
          </div>
        </div>
      )}

      {/* TOP BAR */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px' }}>
        <button onClick={() => window.location.href = '/feed'} style={{ background: 'rgba(0,0,0,0.4)', border: 'none', borderRadius: '50%', width: '38px', height: '38px', color: '#fff', fontSize: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)' }}>←</button>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ fontSize: '16px', fontWeight: '900', background: 'linear-gradient(90deg,#00e5ff,#00ff88)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '1px' }}>⚡ ECHO</div>
          <div style={{ fontSize: '8px', color: 'rgba(255,255,255,0.4)', letterSpacing: '1px' }}>AI POWERED</div>
        </div>
        <button onClick={(e) => { e.stopPropagation(); setShowSearch(!showSearch) }} style={{ background: 'rgba(0,0,0,0.4)', border: 'none', borderRadius: '50%', width: '38px', height: '38px', color: '#fff', fontSize: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)' }}>🔍</button>
      </div>

      {/* Search */}
      {showSearch && (
        <div style={{ position: 'fixed', top: '60px', left: '16px', right: '16px', zIndex: 300 }} onClick={e => e.stopPropagation()}>
          <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search ECHO videos..." autoFocus
            style={{ width: '100%', background: 'rgba(0,0,0,0.85)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '20px', padding: '10px 18px', color: '#fff', fontSize: '14px', outline: 'none', boxSizing: 'border-box', backdropFilter: 'blur(12px)' }} />
        </div>
      )}

      {/* Video title */}
      {vid.title && <div style={{ position: 'absolute', bottom: '200px', left: '16px', right: '80px', zIndex: 200, fontSize: '16px', fontWeight: '800', color: '#fff', textShadow: '0 2px 8px rgba(0,0,0,0.9)', lineHeight: '1.3' }}>{vid.title}</div>}

      {/* USER INFO */}
      <div style={{ position: 'absolute', bottom: '92px', left: '16px', right: '80px', zIndex: 200 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
          <div style={{ position: 'relative', flexShrink: 0 }} onClick={(e) => { e.stopPropagation(); vid.profiles?.id && (window.location.href = `/user/${vid.profiles.id}`) }}>
            <div style={{ width: '50px', height: '50px', borderRadius: '50%', border: '2px solid rgba(255,255,255,0.9)', overflow: 'hidden', background: 'linear-gradient(135deg,#00e5ff,#00ff88)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              {vid.profiles?.avatar_url ? <img src={vid.profiles.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontWeight: '800', color: '#000', fontSize: '20px' }}>{getName(vid)[0]?.toUpperCase()}</span>}
            </div>
            {user?.id !== vid.profiles?.id && !supported[vid.profiles?.id] && (
              <div onClick={(e) => { e.stopPropagation(); handleSupport(vid.profiles?.id) }} style={{ position: 'absolute', bottom: '-4px', right: '-4px', width: '20px', height: '20px', borderRadius: '50%', background: 'linear-gradient(135deg,#00e5ff,#00ff88)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '2px solid #000', fontSize: '12px', fontWeight: '900', color: '#000' }}>+</div>
            )}
          </div>
          <div onClick={(e) => { e.stopPropagation(); vid.profiles?.id && (window.location.href = `/user/${vid.profiles.id}`) }} style={{ cursor: 'pointer' }}>
            <div style={{ color: '#fff', fontWeight: '800', fontSize: '15px', textShadow: '0 1px 4px rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              {getName(vid)}
              {vid.profiles?.creator_tier === 'new' && <span style={{ fontSize: '8px', background: 'rgba(0,255,136,0.2)', color: '#00ff88', borderRadius: '4px', padding: '1px 4px' }}>NEW</span>}
            </div>
            <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: '11px' }}>@{getUsername(vid)} · {timeAgo(vid.created_at)}</div>
          </div>
        </div>
        {vid.location_name && <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: '12px', marginBottom: '4px' }}>📍 {vid.location_name}</div>}
        {vid.content && <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: '13px', lineHeight: '1.5', textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>{vid.content}</div>}
        {vid.hashtags && <div style={{ color: '#00e5ff', fontSize: '12px', marginTop: '3px' }}>{vid.hashtags}</div>}
        {vid.remix_of && <div style={{ marginTop: '5px', background: 'rgba(255,165,0,0.15)', borderRadius: '8px', padding: '3px 10px', fontSize: '11px', color: '#ffa500', display: 'inline-block' }}>🔀 MIX</div>}
      </div>

      {/* ACTION BUTTONS */}
      <div style={{ position: 'absolute', bottom: '92px', right: '10px', zIndex: 200, display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>

        {/* Profile */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
          <div onClick={(e) => { e.stopPropagation(); vid.profiles?.id && (window.location.href = `/user/${vid.profiles.id}`) }} style={{ width: '46px', height: '46px', borderRadius: '50%', overflow: 'hidden', background: 'linear-gradient(135deg,#00e5ff,#00ff88)', border: '2px solid rgba(255,255,255,0.6)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {vid.profiles?.avatar_url ? <img src={vid.profiles.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontWeight: '800', color: '#000', fontSize: '16px' }}>{getName(vid)[0]?.toUpperCase()}</span>}
          </div>
        </div>

        {/* Like */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
          <button onClick={(e) => { e.stopPropagation(); handleLike() }} style={{ width: '48px', height: '48px', borderRadius: '50%', background: liked[vid.id] ? 'rgba(255,69,96,0.3)' : 'rgba(255,255,255,0.1)', border: `2px solid ${liked[vid.id] ? '#ff4560' : 'rgba(255,255,255,0.4)'}`, fontSize: '22px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', transform: liked[vid.id] ? 'scale(1.15)' : 'scale(1)', backdropFilter: 'blur(8px)' }}>
            {liked[vid.id] ? '❤️' : '🤍'}
          </button>
          <span style={{ color: '#fff', fontSize: '11px', fontWeight: '700' }}>{formatNum(vid.likes_count)}</span>
        </div>

        {/* Comment */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
          <button onClick={(e) => { e.stopPropagation(); loadComments(vid.id); setShowComments(true); trackInteraction(vid.id, 'comment') }} style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', border: '2px solid rgba(255,255,255,0.4)', fontSize: '22px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)' }}>💬</button>
          <span style={{ color: '#fff', fontSize: '11px', fontWeight: '700' }}>{formatNum(vid.comments_count)}</span>
        </div>

        {/* Share */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
          <button onClick={(e) => { e.stopPropagation(); trackInteraction(vid.id, 'share'); navigator.share?.({ text: vid.content || '', url: window.location.href }) }} style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', border: '2px solid rgba(255,255,255,0.4)', fontSize: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)' }}>↗</button>
          <span style={{ color: '#fff', fontSize: '11px', fontWeight: '700' }}>Share</span>
        </div>

        {/* MIX */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
          <button onClick={(e) => { e.stopPropagation(); setMixVideo(vid); setMixMode(true); setMixStep('choose') }} style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(255,165,0,0.2)', border: '2px solid rgba(255,165,0,0.6)', fontSize: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)' }}>🔀</button>
          <span style={{ color: '#ffa500', fontSize: '11px', fontWeight: '700' }}>MIX</span>
        </div>

        {/* Map */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
          <button onClick={(e) => { e.stopPropagation(); window.location.href = '/map' }} style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(0,229,255,0.15)', border: '2px solid rgba(0,229,255,0.4)', fontSize: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)' }}>🗺</button>
          <span style={{ color: '#00e5ff', fontSize: '11px', fontWeight: '700' }}>Map</span>
        </div>
      </div>

      {/* Progress dots */}
      <div style={{ position: 'absolute', right: '3px', top: '50%', transform: 'translateY(-50%)', display: 'flex', flexDirection: 'column', gap: '3px', zIndex: 200 }}>
        {videos.slice(Math.max(0, currentIndex - 4), currentIndex + 5).map((_, i) => {
          const ri = Math.max(0, currentIndex - 4) + i
          return <div key={ri} onClick={(e) => { e.stopPropagation(); setCurrentIndex(ri) }} style={{ width: '3px', height: ri === currentIndex ? '24px' : '5px', borderRadius: '2px', background: ri === currentIndex ? 'linear-gradient(#00e5ff,#00ff88)' : 'rgba(255,255,255,0.2)', cursor: 'pointer', transition: 'all 0.3s' }} />
        })}
      </div>

      {/* Counter */}
      <div style={{ position: 'absolute', top: '62px', right: '16px', zIndex: 200, background: 'rgba(0,0,0,0.5)', borderRadius: '16px', padding: '3px 10px', color: '#fff', fontSize: '11px', fontWeight: '700', backdropFilter: 'blur(8px)' }}>
        {currentIndex + 1}/{videos.length}
      </div>

      {/* COMMENTS SHEET */}
      {showComments && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 500, display: 'flex', flexDirection: 'column' }} onClick={() => setShowComments(false)}>
          <div style={{ flex: 1 }} />
          <div style={{ background: '#111620', borderRadius: '24px 24px 0 0', maxHeight: '70vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px 8px' }}>
              <div style={{ fontSize: '15px', fontWeight: '800' }}>💬 Comments</div>
              <button onClick={() => setShowComments(false)} style={{ background: 'none', border: 'none', color: '#4a5568', fontSize: '20px', cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 8px', maxHeight: '50vh' }}>
              {comments.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px', color: '#4a5568' }}>No comments yet. Be first!</div>
              ) : comments.map(c => (
                <div key={c.id} style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                  <div style={{ width: '34px', height: '34px', borderRadius: '50%', overflow: 'hidden', background: 'linear-gradient(135deg,#00e5ff,#00ff88)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }} onClick={() => window.location.href = `/user/${c.profiles?.id}`}>
                    {c.profiles?.avatar_url ? <img src={c.profiles.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontWeight: '800', color: '#000', fontSize: '13px' }}>{(c.profiles?.full_name || 'E')[0].toUpperCase()}</span>}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '10px', padding: '8px 10px' }}>
                      <div style={{ fontSize: '11px', fontWeight: '700', color: '#00e5ff', marginBottom: '3px' }}>{c.profiles?.full_name || c.profiles?.username}</div>
                      <div style={{ fontSize: '13px', color: '#eef2f7' }}>{c.content}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ padding: '8px 16px 24px', borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', gap: '8px' }}>
              <input value={commentText} onChange={e => setCommentText(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendComment()} placeholder="Add a comment..."
                style={{ flex: 1, background: '#0c1018', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '20px', padding: '10px 14px', color: '#eef2f7', fontSize: '13px', outline: 'none' }} />
              <button onClick={sendComment} disabled={!commentText.trim() || sendingComment} style={{ width: '40px', height: '40px', borderRadius: '50%', background: commentText.trim() ? 'linear-gradient(135deg,#00e5ff,#00ff88)' : 'rgba(255,255,255,0.05)', border: 'none', fontSize: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {sendingComment ? '⏳' : '↗'}
              </button>
            </div>
          </div>
        </div>
      )}

      {bottomNav}

      <style>{`
        @keyframes heartPop {
          0%{transform:translate(-50%,-50%) scale(0);opacity:1}
          50%{transform:translate(-50%,-50%) scale(1.4);opacity:1}
          100%{transform:translate(-50%,-80%) scale(1);opacity:0}
        }
        @keyframes fadeIn { from{opacity:0}to{opacity:1} }
        @keyframes echoPulse {
          0%,100%{transform:scale(1) rotate(0deg)}
          50%{transform:scale(1.2) rotate(180deg)}
        }
        @keyframes dot {
          0%,80%,100%{transform:scale(0);opacity:0.3}
          40%{transform:scale(1);opacity:1}
        }
      `}</style>
    </div>
  )
}
