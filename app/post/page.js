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
  const [profile, setProfile] = useState(null)

  // Content
  const [content, setContent] = useState('')
  const [title, setTitle] = useState('')
  const [hashtags, setHashtags] = useState('')
  const [mediaFile, setMediaFile] = useState(null)
  const [mediaUrl, setMediaUrl] = useState(null)
  const [mediaType, setMediaType] = useState(null) // 'photo' | 'video'
  const [postType, setPostType] = useState('regular') // 'regular' | 'capsule' | 'echo'

  // Privacy
  const [privacy, setPrivacy] = useState('public')

  // Location
  const [locationEnabled, setLocationEnabled] = useState(false)
  const [locationName, setLocationName] = useState('')
  const [locationCoords, setLocationCoords] = useState(null)
  const [detectingLocation, setDetectingLocation] = useState(false)
  const [locationSearch, setLocationSearch] = useState('')

  // Capsule settings
  const [capsuleRadius, setCapsuleRadius] = useState(300)
  const [capsuleUnlockDate, setCapsuleUnlockDate] = useState('')
  const [capsuleMessage, setCapsuleMessage] = useState('')

  // Upload
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [posted, setPosted] = useState(false)

  // Camera
  const [cameraMode, setCameraMode] = useState(false)
  const [cameraStream, setCameraStream] = useState(null)
  const [recording, setRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const cameraRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const recordedChunksRef = useRef([])
  const recordTimerRef = useRef(null)
  const fileInputRef = useRef(null)

  // Mood / vibe tags
  const [selectedVibes, setSelectedVibes] = useState([])

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { window.location.href = '/'; return }
      const u = data.session.user
      setUser(u)
      const { data: p } = await supabase.from('profiles').select('*').eq('id', u.id).single()
      setProfile(p)
    })
  }, [])

  // ─── Location ─────────────────────────────────────────
  const detectLocation = () => {
    setDetectingLocation(true)
    navigator.geolocation?.getCurrentPosition(async pos => {
      const { latitude: lat, longitude: lng } = pos.coords
      setLocationCoords([lat, lng])
      // Reverse geocode
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`)
        const data = await res.json()
        const addr = data.address
        const name = addr.neighbourhood || addr.suburb || addr.village || addr.town || addr.city || addr.county || 'Unknown'
        const city = addr.city || addr.town || addr.county || ''
        setLocationName(city ? `${name}, ${city}` : name)
      } catch {
        setLocationName(`${lat.toFixed(4)}, ${lng.toFixed(4)}`)
      }
      setLocationEnabled(true)
      setDetectingLocation(false)
    }, () => {
      setDetectingLocation(false)
      alert('Location access denied. Please enable location in browser settings.')
    }, { enableHighAccuracy: true })
  }

  // ─── Camera ───────────────────────────────────────────
  const openCamera = async (mode = 'photo') => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: mode === 'video' })
      setCameraStream(stream)
      setCameraMode(mode)
      setTimeout(() => { if (cameraRef.current) cameraRef.current.srcObject = stream }, 100)
    } catch { alert('Camera access denied') }
  }

  const takePhoto = () => {
    if (!cameraRef.current) return
    const canvas = document.createElement('canvas')
    canvas.width = cameraRef.current.videoWidth
    canvas.height = cameraRef.current.videoHeight
    canvas.getContext('2d').drawImage(cameraRef.current, 0, 0)
    canvas.toBlob(blob => {
      const file = new File([blob], `photo_${Date.now()}.jpg`, { type: 'image/jpeg' })
      setMediaFile(file)
      setMediaUrl(URL.createObjectURL(blob))
      setMediaType('photo')
      closeCamera()
    }, 'image/jpeg', 0.92)
  }

  const startRecording = () => {
    recordedChunksRef.current = []
    const mr = new MediaRecorder(cameraStream)
    mr.ondataavailable = e => { if (e.data.size > 0) recordedChunksRef.current.push(e.data) }
    mr.onstop = () => {
      const blob = new Blob(recordedChunksRef.current, { type: 'video/mp4' })
      const file = new File([blob], `video_${Date.now()}.mp4`, { type: 'video/mp4' })
      setMediaFile(file)
      setMediaUrl(URL.createObjectURL(blob))
      setMediaType('video')
      closeCamera()
    }
    mediaRecorderRef.current = mr
    mr.start()
    setRecording(true)
    setRecordingTime(0)
    recordTimerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000)
  }

  const stopRecording = () => {
    mediaRecorderRef.current?.stop()
    clearInterval(recordTimerRef.current)
    setRecording(false)
  }

  const closeCamera = () => {
    cameraStream?.getTracks().forEach(t => t.stop())
    setCameraStream(null)
    setCameraMode(false)
  }

  // ─── File pick ────────────────────────────────────────
  const handleFilePick = (e) => {
    const f = e.target.files[0]
    if (!f) return
    setMediaFile(f)
    setMediaUrl(URL.createObjectURL(f))
    setMediaType(f.type.startsWith('video') ? 'video' : 'photo')
  }

  const removeMedia = () => {
    setMediaFile(null)
    setMediaUrl(null)
    setMediaType(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // ─── Upload to Cloudinary ─────────────────────────────
  const uploadToCloudinary = (file) => {
    return new Promise((resolve, reject) => {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('upload_preset', UPLOAD_PRESET)
      const xhr = new XMLHttpRequest()
      xhr.upload.onprogress = e => {
        if (e.lengthComputable) setUploadProgress(Math.round(e.loaded / e.total * 90))
      }
      xhr.onload = () => {
        const res = JSON.parse(xhr.responseText)
        resolve(res.secure_url)
      }
      xhr.onerror = reject
      xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`)
      xhr.send(formData)
    })
  }

  // ─── Post ─────────────────────────────────────────────
  const handlePost = async () => {
    if (!user) return
    if (!content.trim() && !mediaFile && postType !== 'capsule') {
      alert('কিছু লিখো বা মিডিয়া যোগ করো!'); return
    }
    if (postType === 'capsule' && !locationEnabled) {
      alert('Capsule এর জন্য location দরকার!'); return
    }
    setUploading(true)
    setUploadProgress(0)

    let uploadedMediaUrl = null
    let finalMediaType = postType === 'capsule' ? 'capsule' : (mediaType || 'text')

    if (mediaFile) {
      try {
        uploadedMediaUrl = await uploadToCloudinary(mediaFile)
      } catch {
        alert('Upload failed!'); setUploading(false); return
      }
    }

    setUploadProgress(92)

    const postData = {
      user_id: user.id,
      content: content.trim() || null,
      title: title.trim() || null,
      hashtags: hashtags.trim() || null,
      media_url: uploadedMediaUrl,
      media_type: finalMediaType,
      privacy,
      post_format: postType === 'echo' ? 'echo' : 'regular',
      vibe_tags: selectedVibes.length > 0 ? selectedVibes : null,
      ...(locationEnabled && locationCoords && {
        location_lat: locationCoords[0],
        location_lng: locationCoords[1],
        location_name: locationName,
      }),
      ...(postType === 'capsule' && {
        capsule_radius: capsuleRadius,
        capsule_unlock_date: capsuleUnlockDate || null,
        capsule_message: capsuleMessage || null,
      }),
      likes_count: 0,
      comments_count: 0,
    }

    const { data: newPost, error } = await supabase.from('posts').insert(postData).select().single()

    if (error) {
      alert('Post failed: ' + error.message)
      setUploading(false)
      return
    }

    // Award XP
    const xpGain = postType === 'capsule' ? 30 : mediaFile ? (mediaType === 'video' ? 20 : 15) : 10
    await supabase.from('profiles').update({ xp: (profile?.xp || 0) + xpGain }).eq('id', user.id)

    // Track in algorithm
    try {
      await fetch('/api/algorithm/interact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId: newPost.id, type: 'post_created', source: 'post' })
      })
    } catch {}

    // Update explored zones if location
    if (locationEnabled && locationCoords) {
      const zoneName = locationName.split(',')[0]
      await supabase.from('explored_zones').upsert({
        user_id: user.id,
        zone_name: zoneName,
        lat: locationCoords[0],
        lng: locationCoords[1],
        last_visited: new Date().toISOString()
      }, { onConflict: 'user_id,zone_name' })
    }

    setUploadProgress(100)
    setPosted(true)
    setTimeout(() => {
      if (postType === 'echo') window.location.href = '/echo'
      else window.location.href = '/feed'
    }, 1800)
  }

  const vibes = ['😊 Happy', '😎 Chill', '🔥 Fire', '🌧 Moody', '💪 Motivated', '🎉 Party', '🌿 Nature', '🏙 Urban', '✨ Aesthetic', '🧠 Deep']

  const toggleVibe = (v) => {
    setSelectedVibes(prev => prev.includes(v) ? prev.filter(x => x !== v) : prev.length < 3 ? [...prev, v] : prev)
  }

  // ─── CAMERA MODE ──────────────────────────────────────
  if (cameraMode) return (
    <div style={{ height: '100vh', background: '#000', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', zIndex: 10 }}>
        <button onClick={closeCamera} style={{ background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%', width: '40px', height: '40px', color: '#fff', fontSize: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)' }}>✕</button>
        {recording && <div style={{ background: '#ff4560', borderRadius: '20px', padding: '5px 14px', color: '#fff', fontSize: '13px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#fff', display: 'inline-block' }} />REC {recordingTime}s</div>}
        <div style={{ width: '40px' }} />
      </div>

      <video ref={cameraRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />

      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
        {cameraMode === 'photo' ? (
          <button onClick={takePhoto} style={{ width: '76px', height: '76px', borderRadius: '50%', background: '#fff', border: '5px solid rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>📷</button>
        ) : !recording ? (
          <button onClick={startRecording} style={{ width: '76px', height: '76px', borderRadius: '50%', background: '#ff4560', border: '5px solid rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>●</button>
        ) : (
          <button onClick={stopRecording} style={{ width: '76px', height: '76px', borderRadius: '50%', background: '#fff', border: '5px solid #ff4560', cursor: 'pointer', fontSize: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>■</button>
        )}
        <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px' }}>{cameraMode === 'photo' ? 'Tap to capture' : recording ? 'Tap ■ to stop' : 'Tap ● to record'}</div>
      </div>
    </div>
  )

  // ─── SUCCESS ──────────────────────────────────────────
  if (posted) return (
    <div style={{ height: '100vh', background: '#070a10', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
      <div style={{ fontSize: '72px', animation: 'popIn 0.5s ease' }}>🎉</div>
      <div style={{ fontSize: '22px', fontWeight: '900', color: '#00ff88' }}>Posted!</div>
      <div style={{ fontSize: '13px', color: '#4a5568' }}>Redirecting...</div>
      <style>{`@keyframes popIn{from{transform:scale(0)}to{transform:scale(1)}}`}</style>
    </div>
  )

  // ─── MAIN POST UI ─────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: '#070a10', color: '#eef2f7', paddingBottom: '100px' }}>

      {/* TOP BAR */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, background: 'rgba(7,10,16,0.97)', borderBottom: '1px solid rgba(255,255,255,0.07)', zIndex: 100, height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px' }}>
        <button onClick={() => window.history.back()} style={{ background: 'none', border: 'none', color: '#8892a4', fontSize: '24px', cursor: 'pointer' }}>←</button>
        <div style={{ fontSize: '15px', fontWeight: '900', background: 'linear-gradient(90deg,#00e5ff,#00ff88)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Create Post</div>
        <button onClick={handlePost} disabled={uploading}
          style={{ background: uploading ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg,#00e5ff,#00ff88)', border: 'none', borderRadius: '20px', padding: '8px 18px', color: uploading ? '#4a5568' : '#070a10', fontSize: '13px', fontWeight: '800', cursor: uploading ? 'not-allowed' : 'pointer' }}>
          {uploading ? `${uploadProgress}%` : 'Post ⚡'}
        </button>
      </div>

      <div style={{ padding: '72px 16px 20px' }}>

        {/* POST TYPE SELECTOR */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          {[
            { key: 'regular', icon: '📝', label: 'Post' },
            { key: 'echo', icon: '⚡', label: 'ECHO' },
            { key: 'capsule', icon: '📦', label: 'Capsule' },
          ].map(t => (
            <button key={t.key} onClick={() => setPostType(t.key)}
              style={{ flex: 1, padding: '10px 6px', borderRadius: '12px', border: `2px solid ${postType === t.key ? '#00e5ff' : 'rgba(255,255,255,0.07)'}`, background: postType === t.key ? 'rgba(0,229,255,0.1)' : '#111620', color: postType === t.key ? '#00e5ff' : '#4a5568', fontSize: '12px', fontWeight: '700', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
              <span style={{ fontSize: '18px' }}>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>

        {/* ECHO INFO */}
        {postType === 'echo' && (
          <div style={{ background: 'rgba(255,165,0,0.06)', border: '1px solid rgba(255,165,0,0.2)', borderRadius: '12px', padding: '10px 14px', marginBottom: '14px', fontSize: '12px', color: '#ffa500' }}>
            ⚡ ECHO posts appear in the vertical video feed. Upload a video for best results!
          </div>
        )}

        {/* CAPSULE INFO */}
        {postType === 'capsule' && (
          <div style={{ background: 'rgba(255,202,40,0.06)', border: '1px solid rgba(255,202,40,0.2)', borderRadius: '12px', padding: '10px 14px', marginBottom: '14px', fontSize: '12px', color: '#ffca28' }}>
            📦 Capsule posts are only visible to users within {capsuleRadius}m of this location.
          </div>
        )}

        {/* USER HEADER */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', marginBottom: '14px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'linear-gradient(135deg,#00e5ff,#00ff88)', flexShrink: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid rgba(0,229,255,0.2)' }}>
            {profile?.avatar_url ? <img src={profile.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: '18px', fontWeight: '800', color: '#070a10' }}>{(profile?.full_name || 'E')[0]?.toUpperCase()}</span>}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '14px', fontWeight: '700', marginBottom: '2px' }}>{profile?.full_name || 'Explorer'}</div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {/* Privacy */}
              {[{ key: 'public', icon: '🌍', label: 'Public' }, { key: 'friends', icon: '👥', label: 'Friends' }, { key: 'private', icon: '🔒', label: 'Only Me' }].map(p => (
                <button key={p.key} onClick={() => setPrivacy(p.key)}
                  style={{ padding: '3px 10px', borderRadius: '12px', border: `1px solid ${privacy === p.key ? 'rgba(0,229,255,0.5)' : 'rgba(255,255,255,0.1)'}`, background: privacy === p.key ? 'rgba(0,229,255,0.1)' : 'transparent', color: privacy === p.key ? '#00e5ff' : '#4a5568', fontSize: '11px', fontWeight: '600', cursor: 'pointer' }}>
                  {p.icon} {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* TITLE (optional) */}
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Title (optional)"
          style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', color: '#eef2f7', fontSize: '18px', fontWeight: '700', marginBottom: '8px', boxSizing: 'border-box' }} />

        {/* CONTENT */}
        <textarea value={content} onChange={e => setContent(e.target.value)}
          placeholder={postType === 'capsule' ? 'Write a message for whoever finds this capsule...' : postType === 'echo' ? 'What\'s your ECHO moment? ⚡' : 'Share your adventure...'}
          style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', resize: 'none', color: '#eef2f7', fontSize: '15px', lineHeight: '1.65', minHeight: '100px', boxSizing: 'border-box', marginBottom: '10px' }} />

        {/* HASHTAGS */}
        <input value={hashtags} onChange={e => setHashtags(e.target.value)} placeholder="#hashtags #echoworld"
          style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', color: '#00e5ff', fontSize: '13px', boxSizing: 'border-box', marginBottom: '14px' }} />

        {/* MEDIA PREVIEW */}
        {mediaUrl && (
          <div style={{ position: 'relative', borderRadius: '16px', overflow: 'hidden', marginBottom: '14px' }}>
            {mediaType === 'photo'
              ? <img src={mediaUrl} style={{ width: '100%', maxHeight: '360px', objectFit: 'cover', display: 'block' }} />
              : <video src={mediaUrl} controls style={{ width: '100%', maxHeight: '360px', display: 'block', background: '#000' }} playsInline />
            }
            <button onClick={removeMedia} style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(0,0,0,0.75)', border: 'none', borderRadius: '50%', width: '34px', height: '34px', color: '#fff', fontSize: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)' }}>✕</button>
            <div style={{ position: 'absolute', bottom: '10px', left: '10px', background: 'rgba(0,0,0,0.6)', borderRadius: '8px', padding: '3px 8px', fontSize: '11px', color: '#fff', fontWeight: '600' }}>{mediaType === 'photo' ? '📷 Photo' : '🎬 Video'}</div>
          </div>
        )}

        {/* MEDIA BUTTONS */}
        {!mediaUrl && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '14px' }}>
            <div onClick={() => openCamera('photo')} style={{ background: '#111620', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '14px', padding: '16px 8px', cursor: 'pointer', textAlign: 'center' }}>
              <div style={{ fontSize: '26px', marginBottom: '5px' }}>📷</div>
              <div style={{ fontSize: '11px', color: '#8892a4', fontWeight: '600' }}>Camera</div>
            </div>
            <div onClick={() => openCamera('video')} style={{ background: '#111620', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '14px', padding: '16px 8px', cursor: 'pointer', textAlign: 'center' }}>
              <div style={{ fontSize: '26px', marginBottom: '5px' }}>🎬</div>
              <div style={{ fontSize: '11px', color: '#8892a4', fontWeight: '600' }}>Video</div>
            </div>
            <div onClick={() => fileInputRef.current?.click()} style={{ background: '#111620', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '14px', padding: '16px 8px', cursor: 'pointer', textAlign: 'center' }}>
              <div style={{ fontSize: '26px', marginBottom: '5px' }}>📁</div>
              <div style={{ fontSize: '11px', color: '#8892a4', fontWeight: '600' }}>Gallery</div>
            </div>
            <input ref={fileInputRef} type="file" accept="image/*,video/*" onChange={handleFilePick} style={{ display: 'none' }} />
          </div>
        )}

        <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)', margin: '6px 0 14px' }} />

        {/* LOCATION */}
        <div style={{ marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <div style={{ fontSize: '13px', fontWeight: '700', color: '#8892a4' }}>📍 Location</div>
            {!locationEnabled ? (
              <button onClick={detectLocation} disabled={detectingLocation}
                style={{ padding: '6px 14px', borderRadius: '20px', border: '1px solid rgba(0,229,255,0.3)', background: 'rgba(0,229,255,0.06)', color: '#00e5ff', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}>
                {detectingLocation ? '⏳ Detecting...' : '📡 Detect'}
              </button>
            ) : (
              <button onClick={() => { setLocationEnabled(false); setLocationCoords(null); setLocationName('') }}
                style={{ padding: '5px 12px', borderRadius: '20px', border: '1px solid rgba(255,69,96,0.3)', background: 'rgba(255,69,96,0.06)', color: '#ff4560', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}>
                ✕ Remove
              </button>
            )}
          </div>

          {locationEnabled && (
            <div style={{ background: '#111620', border: '1px solid rgba(0,229,255,0.2)', borderRadius: '12px', padding: '10px 12px', display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span style={{ fontSize: '18px' }}>📍</span>
              <input value={locationName} onChange={e => setLocationName(e.target.value)}
                style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#00e5ff', fontSize: '13px', fontWeight: '600' }} />
            </div>
          )}
        </div>

        {/* CAPSULE SETTINGS */}
        {postType === 'capsule' && (
          <div style={{ background: '#111620', border: '1px solid rgba(255,202,40,0.2)', borderRadius: '16px', padding: '14px', marginBottom: '14px' }}>
            <div style={{ fontSize: '13px', fontWeight: '800', color: '#ffca28', marginBottom: '12px' }}>📦 Capsule Settings</div>
            <div style={{ marginBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ fontSize: '12px', color: '#8892a4' }}>Unlock Radius</span>
                <span style={{ fontSize: '12px', color: '#ffca28', fontWeight: '700' }}>{capsuleRadius}m</span>
              </div>
              <input type="range" min={50} max={1000} step={50} value={capsuleRadius} onChange={e => setCapsuleRadius(Number(e.target.value))} style={{ width: '100%', accentColor: '#ffca28' }} />
            </div>
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '12px', color: '#8892a4', marginBottom: '5px' }}>Unlock Date (optional)</div>
              <input type="datetime-local" value={capsuleUnlockDate} onChange={e => setCapsuleUnlockDate(e.target.value)}
                style={{ width: '100%', background: '#0c1018', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '8px', padding: '8px 10px', color: '#eef2f7', fontSize: '12px', outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <textarea value={capsuleMessage} onChange={e => setCapsuleMessage(e.target.value)} placeholder="Secret message for the finder..."
              style={{ width: '100%', background: '#0c1018', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '8px', padding: '8px 10px', color: '#eef2f7', fontSize: '12px', outline: 'none', resize: 'none', minHeight: '60px', boxSizing: 'border-box' }} />
          </div>
        )}

        {/* VIBE TAGS */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '13px', fontWeight: '700', color: '#8892a4', marginBottom: '8px' }}>✨ Vibe Tags <span style={{ color: '#2a3040', fontWeight: '400' }}>(max 3)</span></div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {vibes.map(v => (
              <button key={v} onClick={() => toggleVibe(v)}
                style={{ padding: '6px 12px', borderRadius: '20px', border: `1px solid ${selectedVibes.includes(v) ? 'rgba(0,229,255,0.5)' : 'rgba(255,255,255,0.07)'}`, background: selectedVibes.includes(v) ? 'rgba(0,229,255,0.1)' : 'rgba(255,255,255,0.03)', color: selectedVibes.includes(v) ? '#00e5ff' : '#4a5568', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>
                {v}
              </button>
            ))}
          </div>
        </div>

        {/* UPLOAD PROGRESS */}
        {uploading && (
          <div style={{ marginBottom: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ fontSize: '12px', color: '#8892a4' }}>Uploading...</span>
              <span style={{ fontSize: '12px', color: '#00e5ff', fontWeight: '700' }}>{uploadProgress}%</span>
            </div>
            <div style={{ height: '4px', background: 'rgba(255,255,255,0.07)', borderRadius: '2px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${uploadProgress}%`, background: 'linear-gradient(90deg,#00e5ff,#00ff88)', transition: 'width 0.3s ease', borderRadius: '2px' }} />
            </div>
          </div>
        )}

        {/* POST BUTTON (bottom) */}
        <button onClick={handlePost} disabled={uploading}
          style={{ width: '100%', padding: '16px', background: uploading ? 'rgba(255,255,255,0.04)' : 'linear-gradient(135deg,#00e5ff,#00ff88)', border: 'none', borderRadius: '16px', color: uploading ? '#4a5568' : '#070a10', fontSize: '16px', fontWeight: '800', cursor: uploading ? 'not-allowed' : 'pointer', letterSpacing: '0.5px' }}>
          {uploading ? `Uploading ${uploadProgress}%...` : postType === 'capsule' ? '📦 Drop Capsule' : postType === 'echo' ? '⚡ Publish ECHO' : '🌍 Share Post'}
        </button>

        {/* XP preview */}
        <div style={{ textAlign: 'center', marginTop: '10px', fontSize: '11px', color: '#2a3040' }}>
          ⚡ +{postType === 'capsule' ? 30 : mediaFile ? (mediaType === 'video' ? 20 : 15) : 10} XP for posting
        </div>
      </div>

      {/* BOTTOM NAV */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'rgba(7,10,16,0.98)', borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'space-around', padding: '10px 0 20px', zIndex: 100 }}>
        {[{ icon: '🏠', label: 'Home', path: '/feed' }, { icon: '🗺', label: 'Map', path: '/map' }, { icon: '📸', label: 'Post', path: '/post' }, { icon: '🏆', label: 'Rank', path: '/leaderboard' }, { icon: '👤', label: 'Profile', path: '/profile' }].map(item => (
          <div key={item.label} onClick={() => window.location.href = item.path} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', cursor: 'pointer', color: item.path === '/post' ? '#00e5ff' : '#4a5568' }}>
            <span style={{ fontSize: '22px' }}>{item.icon}</span>
            <span style={{ fontSize: '10px', fontWeight: '600' }}>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
                                            }
