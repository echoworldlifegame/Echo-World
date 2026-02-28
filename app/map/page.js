'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default function MapPage() {
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [userLat, setUserLat] = useState(null)
  const [userLng, setUserLng] = useState(null)
  const [capsules, setCapsules] = useState([])
  const [unlockedZones, setUnlockedZones] = useState([])
  const [liveUsers, setLiveUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedCapsule, setSelectedCapsule] = useState(null)
  const [nearbyUnlocked, setNearbyUnlocked] = useState(false)
  const [cityName, setCityName] = useState('Dhaka')
  const [stats, setStats] = useState({ city: 0, country: 0, world: 0 })
  const [locationSharing, setLocationSharing] = useState('off')
  const [showSharingMenu, setShowSharingMenu] = useState(false)
  const zonesRef = useRef([])
  const userLatRef = useRef(null)
  const userLngRef = useRef(null)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { window.location.href = '/'; return }
      const u = data.session.user
      setUser(u)

      const { data: p } = await supabase.from('profiles').select('*').eq('id', u.id).single()
      setProfile(p)
      setLocationSharing(p?.location_sharing || 'off')

      const { data: caps } = await supabase
        .from('posts')
        .select('*, profiles(id, username, full_name, avatar_url)')
        .eq('media_type', 'capsule')
        .not('latitude', 'is', null)
      setCapsules(caps || [])

      const { data: zones } = await supabase
        .from('unlocked_zones')
        .select('*')
        .eq('user_id', u.id)
      setUnlockedZones(zones || [])
      zonesRef.current = zones || []
      calculateStats(zones || [])

      // Load live users
      const { data: liveData } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url, live_lat, live_lng, location_sharing, live_updated_at')
        .eq('location_sharing', 'public')
        .not('live_lat', 'is', null)
        .neq('id', u.id)
      setLiveUsers(liveData || [])

      setLoading(false)
    })
  }, [])

  useEffect(() => {
    if (!loading) loadLeaflet()
  }, [loading])

  const calculateStats = (zones) => {
    const total = zones.length
    setStats({
      city: Math.min((total / 500) * 100, 100).toFixed(2),
      country: Math.min((total / 50000) * 100, 100).toFixed(4),
      world: Math.min((total / 5000000) * 100, 100).toFixed(6),
    })
  }

  const loadLeaflet = () => {
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link')
      link.id = 'leaflet-css'
      link.rel = 'stylesheet'
      link.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css'
      document.head.appendChild(link)
    }
    if (window.L) { initMap(); return }
    const script = document.createElement('script')
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js'
    script.onload = initMap
    document.head.appendChild(script)
  }

  const initMap = () => {
    if (!mapRef.current || mapInstanceRef.current) return
    const L = window.L

    const map = L.map(mapRef.current, {
      center: [23.8103, 90.4125],
      zoom: 15,
      zoomControl: false,
    })
    mapInstanceRef.current = map

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '©OpenStreetMap ©CartoDB',
      maxZoom: 19,
    }).addTo(map)

    L.control.zoom({ position: 'bottomright' }).addTo(map)

    addCapsuleMarkers(map, L)
    addLiveUserMarkers(map, L)
    drawFog(map, L, zonesRef.current, 23.8103, 90.4125)

    if (navigator.geolocation) {
      navigator.geolocation.watchPosition(pos => {
        const { latitude, longitude } = pos.coords
        setUserLat(latitude)
        setUserLng(longitude)
        userLatRef.current = latitude
        userLngRef.current = longitude
        updateUserMarker(map, L, latitude, longitude)
        unlockZone(latitude, longitude)

        // Update live location if sharing enabled
        if (locationSharing !== 'off') {
          supabase.from('profiles').update({
            live_lat: latitude,
            live_lng: longitude,
            live_updated_at: new Date().toISOString(),
          }).eq('id', user?.id)
        }

        fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`)
          .then(r => r.json())
          .then(d => setCityName(d.address?.city || d.address?.town || 'Your City'))
      }, null, { enableHighAccuracy: true, maximumAge: 5000 })
    }
  }

  const updateUserMarker = (map, L, lat, lng) => {
    if (window._userMarker) window._userMarker.remove()
    if (window._accuracyCircle) window._accuracyCircle.remove()

    const avatarUrl = profile?.avatar_url
    const username = profile?.username || 'Me'
    const letter = username[0].toUpperCase()

    const avatarContent = avatarUrl
      ? `<img src="${avatarUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;"/>`
      : `<span style="font-size:14px;font-weight:800;color:#070a10;">${letter}</span>`

    const icon = L.divIcon({
      html: `<div style="position:relative;display:flex;flex-direction:column;align-items:center;">
        <div style="width:38px;height:38px;border-radius:50%;border:3px solid #00e5ff;overflow:hidden;background:linear-gradient(135deg,#00e5ff,#00ff88);display:flex;align-items:center;justify-content:center;box-shadow:0 0 20px rgba(0,229,255,0.8);">
          ${avatarContent}
        </div>
        <div style="background:rgba(0,0,0,0.85);border:1px solid rgba(0,229,255,0.5);border-radius:6px;padding:2px 7px;margin-top:3px;white-space:nowrap;">
          <span style="font-size:9px;color:#00e5ff;font-weight:700;">@${username}</span>
        </div>
      </div>`,
      className: '',
      iconSize: [38, 60],
      iconAnchor: [19, 19],
    })

    window._userMarker = L.marker([lat, lng], { icon }).addTo(map)
    window._accuracyCircle = L.circle([lat, lng], {
      radius: 30,
      color: '#00e5ff',
      fillColor: '#00e5ff',
      fillOpacity: 0.06,
      weight: 1,
    }).addTo(map)

    map.setView([lat, lng], map.getZoom())
  }

  const addLiveUserMarkers = (map, L) => {
    liveUsers.forEach(lu => {
      if (!lu.live_lat || !lu.live_lng) return
      const letter = (lu.full_name || lu.username || 'U')[0].toUpperCase()
      const avatarContent = lu.avatar_url
        ? `<img src="${lu.avatar_url}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;"/>`
        : `<span style="font-size:12px;font-weight:800;color:#070a10;">${letter}</span>`

      const icon = L.divIcon({
        html: `<div style="display:flex;flex-direction:column;align-items:center;cursor:pointer;">
          <div style="width:34px;height:34px;border-radius:50%;border:2px solid #00ff88;overflow:hidden;background:linear-gradient(135deg,#00ff88,#00e5ff);display:flex;align-items:center;justify-content:center;box-shadow:0 0 12px rgba(0,255,136,0.6);">
            ${avatarContent}
          </div>
          <div style="background:rgba(0,0,0,0.85);border:1px solid rgba(0,255,136,0.4);border-radius:6px;padding:2px 6px;margin-top:2px;white-space:nowrap;">
            <span style="font-size:9px;color:#00ff88;font-weight:700;">@${lu.username}</span>
          </div>
        </div>`,
        className: '',
        iconSize: [34, 56],
        iconAnchor: [17, 17],
      })

      const marker = L.marker([lu.live_lat, lu.live_lng], { icon }).addTo(map)
      marker.on('click', () => {
        window.location.href = `/user/${lu.id}`
      })
    })
  }

  const unlockZone = async (lat, lng) => {
    if (!user) return
    const exists = zonesRef.current.find(z => getDistance(lat, lng, z.lat, z.lng) < 200)
    if (exists) return

    const { data } = await supabase.from('unlocked_zones').insert({
      user_id: user.id,
      location_name: cityName,
      lat, lng,
    }).select().single()

    if (data) {
      const newZones = [...zonesRef.current, data]
      zonesRef.current = newZones
      setUnlockedZones(newZones)
      calculateStats(newZones)
      if (mapInstanceRef.current && window.L) {
        drawFog(mapInstanceRef.current, window.L, newZones, lat, lng)
      }
    }
  }

  const drawFog = (map, L, zones, currentLat, currentLng) => {
    if (window._fogLayer) window._fogLayer.remove()

    const allZones = [...zones]
    if (currentLat && currentLng) allZones.push({ lat: currentLat, lng: currentLng })

    const canvas = document.createElement('canvas')
    canvas.width = 4096
    canvas.height = 2048
    const ctx = canvas.getContext('2d')

    ctx.fillStyle = 'rgba(5,8,14,0.87)'
    ctx.fillRect(0, 0, 4096, 2048)

    ctx.globalCompositeOperation = 'destination-out'
    allZones.forEach(zone => {
      const x = ((zone.lng + 180) / 360) * 4096
      const y = ((90 - zone.lat) / 180) * 2048
      const radius = 130

      const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius)
      gradient.addColorStop(0, 'rgba(0,0,0,1)')
      gradient.addColorStop(0.6, 'rgba(0,0,0,0.95)')
      gradient.addColorStop(0.85, 'rgba(0,0,0,0.4)')
      gradient.addColorStop(1, 'rgba(0,0,0,0)')

      ctx.fillStyle = gradient
      ctx.beginPath()
      ctx.arc(x, y, radius, 0, Math.PI * 2)
      ctx.fill()
    })

    window._fogLayer = L.imageOverlay(
      canvas.toDataURL(),
      [[-90, -180], [90, 180]],
      { opacity: 1, interactive: false, zIndex: 400 }
    ).addTo(map)
  }

  const addCapsuleMarkers = (map, L) => {
    capsules.forEach(capsule => {
      if (!capsule.latitude || !capsule.longitude) return
      const ownerName = capsule.profiles?.full_name || capsule.profiles?.username || 'Explorer'
      const ownerId = capsule.profiles?.id
      const letter = ownerName[0].toUpperCase()
      const avatarContent = capsule.profiles?.avatar_url
        ? `<img src="${capsule.profiles.avatar_url}" style="width:18px;height:18px;border-radius:50%;object-fit:cover;"/>`
        : `<span style="font-size:9px;font-weight:800;color:#070a10;">${letter}</span>`

      const icon = L.divIcon({
        html: `<div style="display:flex;flex-direction:column;align-items:center;">
          <div style="width:34px;height:34px;background:rgba(255,202,40,0.15);border:2px solid rgba(255,202,40,0.8);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:17px;box-shadow:0 0 12px rgba(255,202,40,0.5);">📦</div>
          <div style="display:flex;align-items:center;gap:3px;background:rgba(0,0,0,0.85);border:1px solid rgba(255,202,40,0.35);border-radius:8px;padding:2px 6px;margin-top:2px;cursor:pointer;">
            <div style="width:18px;height:18px;border-radius:50%;background:linear-gradient(135deg,#ffca28,#ff9800);display:flex;align-items:center;justify-content:center;overflow:hidden;">${avatarContent}</div>
            <span style="font-size:9px;color:#ffca28;font-weight:600;">@${capsule.profiles?.username||'?'}</span>
          </div>
        </div>`,
        className: '',
        iconSize: [60, 60],
        iconAnchor: [30, 17],
      })

      const marker = L.marker([capsule.latitude, capsule.longitude], { icon }).addTo(map)
      marker.on('click', () => {
        const dist = userLatRef.current ? getDistance(userLatRef.current, userLngRef.current, capsule.latitude, capsule.longitude) : 9999
        setSelectedCapsule({ ...capsule, distance: Math.round(dist), ownerId })
        setNearbyUnlocked(dist <= 300)
      })
    })
  }

  const updateLocationSharing = async (mode) => {
    setLocationSharing(mode)
    setShowSharingMenu(false)
    await supabase.from('profiles').update({ location_sharing: mode }).eq('id', user.id)
    if (mode === 'off') {
      await supabase.from('profiles').update({ live_lat: null, live_lng: null }).eq('id', user.id)
    }
  }

  const showRoute = () => {
    if (!selectedCapsule || !userLatRef.current) return
    window.open(`https://www.google.com/maps/dir/${userLatRef.current},${userLngRef.current}/${selectedCapsule.latitude},${selectedCapsule.longitude}`, '_blank')
  }

  const getDistance = (lat1, lng1, lat2, lng2) => {
    const R = 6371000
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLng = (lng2 - lng1) * Math.PI / 180
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  }

  const sharingColor = locationSharing === 'public' ? '#00ff88' : locationSharing === 'friends' ? '#00e5ff' : '#4a5568'
  const sharingLabel = locationSharing === 'public' ? '🟢 Public' : locationSharing === 'friends' ? '🔵 Friends' : '⚫ Off'

  return (
    <div style={{minHeight:'100vh',background:'#070a10',color:'#eef2f7'}}>

      {/* TOP BAR */}
      <div style={{position:'fixed',top:0,left:0,right:0,background:'rgba(7,10,16,0.95)',borderBottom:'1px solid rgba(255,255,255,0.07)',padding:'0 14px',height:'56px',display:'flex',alignItems:'center',justifyContent:'space-between',zIndex:1000}}>
        <button onClick={()=>window.location.href='/feed'} style={{background:'none',border:'none',color:'#8892a4',fontSize:'24px',cursor:'pointer'}}>←</button>
        <div style={{fontSize:'16px',fontWeight:'800',background:'linear-gradient(90deg,#00e5ff,#00ff88)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>🗺 Echo Map</div>
        <button onClick={()=>setShowSharingMenu(!showSharingMenu)} style={{background:'rgba(255,255,255,0.05)',border:`1px solid ${sharingColor}40`,borderRadius:'20px',padding:'5px 12px',color:sharingColor,fontSize:'11px',cursor:'pointer',fontWeight:'600'}}>
          {sharingLabel}
        </button>
      </div>

      {/* Location sharing menu */}
      {showSharingMenu && (
        <div style={{position:'fixed',top:'60px',right:'10px',zIndex:2000,background:'#111620',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'14px',padding:'8px',minWidth:'180px',boxShadow:'0 8px 32px rgba(0,0,0,0.5)'}}>
          <div style={{fontSize:'11px',color:'#4a5568',padding:'6px 10px',fontWeight:'700'}}>📍 LOCATION SHARING</div>
          {[
            {mode:'off', label:'⚫ Off', desc:'Hidden from everyone', color:'#4a5568'},
            {mode:'friends', label:'🔵 Friends only', desc:'Only your supporters', color:'#00e5ff'},
            {mode:'public', label:'🟢 Public', desc:'Everyone can see you', color:'#00ff88'},
          ].map(opt => (
            <div key={opt.mode} onClick={()=>updateLocationSharing(opt.mode)} style={{padding:'10px 12px',borderRadius:'10px',cursor:'pointer',background:locationSharing===opt.mode?'rgba(255,255,255,0.06)':'transparent',marginBottom:'2px'}}>
              <div style={{fontSize:'13px',fontWeight:'600',color:opt.color}}>{opt.label}</div>
              <div style={{fontSize:'10px',color:'#4a5568'}}>{opt.desc}</div>
            </div>
          ))}
        </div>
      )}

      {/* BOTTOM NAV */}
      <div style={{position:'fixed',bottom:0,left:0,right:0,background:'rgba(7,10,16,0.98)',borderTop:'1px solid rgba(255,255,255,0.07)',display:'flex',justifyContent:'space-around',padding:'10px 0 20px',zIndex:1000}}>
        {[
          {icon:'🏠',label:'Home',path:'/feed'},
          {icon:'🗺',label:'Map',path:'/map'},
          {icon:'📸',label:'Post',path:'/post'},
          {icon:'🏆',label:'Rank',path:'/leaderboard'},
          {icon:'👤',label:'Profile',path:'/profile'},
        ].map(item => (
          <div key={item.label} onClick={()=>window.location.href=item.path} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'4px',cursor:'pointer',color:item.path==='/map'?'#00e5ff':'#4a5568'}}>
            <span style={{fontSize:'22px'}}>{item.icon}</span>
            <span style={{fontSize:'10px',fontWeight:'600'}}>{item.label}</span>
          </div>
        ))}
      </div>

      {/* MAP */}
      <div style={{position:'fixed',top:'56px',left:0,right:0,bottom:'80px',zIndex:1}}>
        {loading ? (
          <div style={{width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center',background:'#070a10',flexDirection:'column',gap:'16px'}}>
            <div style={{fontSize:'48px'}}>🗺</div>
            <div style={{color:'#4a5568'}}>Loading map...</div>
          </div>
        ) : <div ref={mapRef} style={{width:'100%',height:'100%'}}/>}
      </div>

      {/* Stats */}
      <div style={{position:'fixed',top:'68px',left:'10px',zIndex:500,background:'rgba(7,10,16,0.9)',border:'1px solid rgba(0,229,255,0.2)',borderRadius:'12px',padding:'10px 12px'}}>
        <div style={{fontSize:'10px',color:'#00e5ff',fontWeight:'700',marginBottom:'5px'}}>📊 Explored</div>
        <div style={{fontSize:'10px',color:'#8892a4',marginBottom:'2px'}}>🏙 {cityName}: <span style={{color:'#00e5ff',fontWeight:'700'}}>{stats.city}%</span></div>
        <div style={{fontSize:'10px',color:'#8892a4',marginBottom:'2px'}}>🇧🇩 Country: <span style={{color:'#00ff88',fontWeight:'700'}}>{stats.country}%</span></div>
        <div style={{fontSize:'10px',color:'#8892a4'}}>🌍 World: <span style={{color:'#ffca28',fontWeight:'700'}}>{stats.world}%</span></div>
      </div>

      {/* Live users count */}
      <div style={{position:'fixed',top:'68px',right:'10px',zIndex:500,background:'rgba(7,10,16,0.9)',border:'1px solid rgba(0,255,136,0.2)',borderRadius:'12px',padding:'10px 12px',textAlign:'center'}}>
        <div style={{fontSize:'10px',color:'#00ff88',fontWeight:'700',marginBottom:'3px'}}>🟢 Live</div>
        <div style={{fontSize:'18px',fontWeight:'800'}}>{liveUsers.length}</div>
        <div style={{fontSize:'9px',color:'#4a5568'}}>online</div>
      </div>

      {/* Legend */}
      <div style={{position:'fixed',bottom:'92px',left:'10px',zIndex:500,background:'rgba(7,10,16,0.9)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'10px',padding:'8px 12px'}}>
        <div style={{fontSize:'9px',color:'#4a5568',marginBottom:'5px',fontWeight:'700'}}>LEGEND</div>
        <div style={{display:'flex',alignItems:'center',gap:'5px',marginBottom:'3px'}}>
          <div style={{width:'10px',height:'10px',borderRadius:'50%',border:'2px solid #00e5ff'}}></div>
          <span style={{fontSize:'9px',color:'#8892a4'}}>You</span>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:'5px',marginBottom:'3px'}}>
          <div style={{width:'10px',height:'10px',borderRadius:'50%',border:'2px solid #00ff88'}}></div>
          <span style={{fontSize:'9px',color:'#8892a4'}}>Live users</span>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:'5px',marginBottom:'3px'}}>
          <span style={{fontSize:'10px'}}>📦</span>
          <span style={{fontSize:'9px',color:'#8892a4'}}>Capsule</span>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:'5px'}}>
          <div style={{width:'10px',height:'10px',background:'rgba(5,8,14,0.87)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'2px'}}></div>
          <span style={{fontSize:'9px',color:'#8892a4'}}>Fog</span>
        </div>
      </div>

      {/* Capsule popup */}
      {selectedCapsule && (
        <div style={{position:'fixed',bottom:'90px',left:'12px',right:'12px',zIndex:2000,background:'#111620',border:`1px solid ${nearbyUnlocked?'rgba(0,255,136,0.3)':'rgba(255,202,40,0.3)'}`,borderRadius:'16px',padding:'16px'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'12px'}}>
            <div>
              <div style={{fontSize:'15px',fontWeight:'700',color:'#ffca28'}}>📦 Time Capsule</div>
              <div onClick={()=>window.location.href=`/user/${selectedCapsule.ownerId}`} style={{fontSize:'12px',color:'#00e5ff',marginTop:'3px',cursor:'pointer'}}>
                👤 @{selectedCapsule.profiles?.username} — tap to visit profile
              </div>
              <div style={{fontSize:'11px',color:'#4a5568',marginTop:'2px'}}>📍 {selectedCapsule.location_name}</div>
            </div>
            <button onClick={()=>setSelectedCapsule(null)} style={{background:'none',border:'none',color:'#4a5568',fontSize:'20px',cursor:'pointer'}}>✕</button>
          </div>

          {!nearbyUnlocked ? (
            <>
              <div style={{background:'rgba(255,69,96,0.06)',border:'1px solid rgba(255,69,96,0.2)',borderRadius:'10px',padding:'12px',marginBottom:'10px',textAlign:'center'}}>
                <div style={{fontSize:'24px',marginBottom:'4px'}}>🔒</div>
                <div style={{fontSize:'13px',color:'#ff4560',fontWeight:'600'}}>{selectedCapsule.distance}m away</div>
                <div style={{fontSize:'11px',color:'#4a5568',marginTop:'3px'}}>Need to be within 300m</div>
                <div style={{marginTop:'8px',height:'4px',background:'rgba(255,255,255,0.05)',borderRadius:'2px'}}>
                  <div style={{height:'100%',width:`${Math.min((300/Math.max(selectedCapsule.distance,1))*100,100)}%`,background:'linear-gradient(90deg,#ff4560,#ffca28)',borderRadius:'2px'}}></div>
                </div>
              </div>
              <button onClick={showRoute} style={{width:'100%',padding:'12px',background:'linear-gradient(135deg,#00e5ff,#00ff88)',border:'none',borderRadius:'10px',fontSize:'14px',fontWeight:'700',color:'#070a10',cursor:'pointer'}}>
                🗺 Show Route on Google Maps
              </button>
            </>
          ) : (
            <div style={{background:'rgba(0,255,136,0.06)',border:'1px solid rgba(0,255,136,0.2)',borderRadius:'10px',padding:'14px'}}>
              <div style={{fontSize:'13px',color:'#00ff88',fontWeight:'700',marginBottom:'8px'}}>🔓 Capsule Unlocked!</div>
              {selectedCapsule.media_url && <img src={selectedCapsule.media_url} style={{width:'100%',maxHeight:'200px',objectFit:'cover',borderRadius:'8px',marginBottom:'8px'}}/>}
              {selectedCapsule.content && <div style={{fontSize:'13px',color:'#8892a4',lineHeight:'1.6'}}>{selectedCapsule.content}</div>}
            </div>
          )}
        </div>
      )}
    </div>
  )
        }
