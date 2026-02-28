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
  const [loading, setLoading] = useState(true)
  const [selectedCapsule, setSelectedCapsule] = useState(null)
  const [nearbyUnlocked, setNearbyUnlocked] = useState(false)
  const [cityName, setCityName] = useState('Dhaka')
  const [stats, setStats] = useState({ city: 0, country: 0, world: 0 })
  const zonesRef = useRef([])

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { window.location.href = '/'; return }
      const u = data.session.user
      setUser(u)

      const { data: p } = await supabase.from('profiles').select('*').eq('id', u.id).single()
      setProfile(p)

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
      setLoading(false)
    })
  }, [])

  const calculateStats = (zones) => {
    const total = zones.length
    // Rough calculations
    const cityPercent = Math.min((total / 500) * 100, 100).toFixed(2)
    const countryPercent = Math.min((total / 50000) * 100, 100).toFixed(4)
    const worldPercent = Math.min((total / 5000000) * 100, 100).toFixed(6)
    setStats({ city: cityPercent, country: countryPercent, world: worldPercent })
  }

  useEffect(() => {
    if (!loading) loadLeaflet()
  }, [loading])

  const loadLeaflet = () => {
    if (typeof window === 'undefined') return
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
    const lat = 23.8103
    const lng = 90.4125

    const map = L.map(mapRef.current, {
      center: [lat, lng],
      zoom: 15,
      zoomControl: false,
    })
    mapInstanceRef.current = map

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '©OpenStreetMap ©CartoDB',
      maxZoom: 19,
    }).addTo(map)

    L.control.zoom({ position: 'bottomright' }).addTo(map)

    // Add capsule markers
    addCapsuleMarkers(map, L)

    // Start GPS
    if (navigator.geolocation) {
      navigator.geolocation.watchPosition(pos => {
        const { latitude, longitude } = pos.coords
        setUserLat(latitude)
        setUserLng(longitude)
        updateUserMarker(map, L, latitude, longitude)
        unlockZone(latitude, longitude)

        // Get city name
        fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`)
          .then(r => r.json())
          .then(d => setCityName(d.address?.city || d.address?.town || 'Your City'))
      }, null, { enableHighAccuracy: true, maximumAge: 5000 })
    }

    // Initial fog
    drawFog(map, L, zonesRef.current, lat, lng)
  }

  const updateUserMarker = (map, L, lat, lng) => {
    if (window._userMarker) window._userMarker.remove()

    const avatarUrl = profile?.avatar_url
    const username = profile?.username || 'Me'
    const letter = username[0].toUpperCase()

    const html = avatarUrl
      ? `<div style="width:36px;height:36px;border-radius:50%;border:3px solid #00e5ff;overflow:hidden;box-shadow:0 0 15px rgba(0,229,255,0.7);">
           <img src="${avatarUrl}" style="width:100%;height:100%;object-fit:cover;"/>
         </div>
         <div style="position:absolute;bottom:-18px;left:50%;transform:translateX(-50%);white-space:nowrap;background:rgba(0,0,0,0.7);color:#00e5ff;font-size:9px;padding:1px 5px;border-radius:4px;font-weight:700;">@${username}</div>`
      : `<div style="width:36px;height:36px;border-radius:50%;border:3px solid #00e5ff;background:linear-gradient(135deg,#00e5ff,#00ff88);display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:800;color:#070a10;box-shadow:0 0 15px rgba(0,229,255,0.7);">${letter}</div>
         <div style="position:absolute;bottom:-18px;left:50%;transform:translateX(-50%);white-space:nowrap;background:rgba(0,0,0,0.7);color:#00e5ff;font-size:9px;padding:1px 5px;border-radius:4px;font-weight:700;">@${username}</div>`

    const icon = L.divIcon({
      html: `<div style="position:relative;">${html}</div>`,
      className: '',
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    })

    window._userMarker = L.marker([lat, lng], { icon }).addTo(map)

    // Accuracy circle
    if (window._accuracyCircle) window._accuracyCircle.remove()
    window._accuracyCircle = L.circle([lat, lng], {
      radius: 30,
      color: '#00e5ff',
      fillColor: '#00e5ff',
      fillOpacity: 0.08,
      weight: 1,
    }).addTo(map)

    map.setView([lat, lng], map.getZoom())
  }

  const unlockZone = async (lat, lng) => {
    if (!user) return

    const exists = zonesRef.current.find(z =>
      getDistance(lat, lng, z.lat, z.lng) < 200
    )
    if (exists) return

    const { data } = await supabase.from('unlocked_zones').insert({
      user_id: user.id,
      location_name: cityName,
      lat: lat,
      lng: lng,
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

    // Draw fog using SVG circles (hole punch method)
    const allZones = [...zones]
    if (currentLat && currentLng) {
      allZones.push({ lat: currentLat, lng: currentLng })
    }

    // Create canvas overlay
    const canvas = document.createElement('canvas')
    canvas.width = 4096
    canvas.height = 2048
    const ctx = canvas.getContext('2d')

    // Fill with fog
    ctx.fillStyle = 'rgba(5, 8, 14, 0.85)'
    ctx.fillRect(0, 0, 4096, 2048)

    // Punch holes for unlocked zones (3km radius = bigger holes)
    ctx.globalCompositeOperation = 'destination-out'
    allZones.forEach(zone => {
      const x = ((zone.lng + 180) / 360) * 4096
      const y = ((90 - zone.lat) / 180) * 2048
      const radius = 120 // ~3km visual

      const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius)
      gradient.addColorStop(0, 'rgba(0,0,0,1)')
      gradient.addColorStop(0.6, 'rgba(0,0,0,0.95)')
      gradient.addColorStop(0.85, 'rgba(0,0,0,0.5)')
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
      const ownerAvatar = capsule.profiles?.avatar_url
      const ownerId = capsule.profiles?.id
      const letter = ownerName[0].toUpperCase()

      const avatarHtml = ownerAvatar
        ? `<img src="${ownerAvatar}" style="width:20px;height:20px;border-radius:50%;object-fit:cover;border:1px solid rgba(255,202,40,0.8);"/>`
        : `<div style="width:20px;height:20px;border-radius:50%;background:linear-gradient(135deg,#ffca28,#ff9800);display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;color:#070a10;border:1px solid rgba(255,202,40,0.8);">${letter}</div>`

      const icon = L.divIcon({
        html: `<div style="position:relative;display:flex;flex-direction:column;align-items:center;">
          <div style="width:36px;height:36px;background:rgba(255,202,40,0.15);border:2px solid rgba(255,202,40,0.8);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:18px;box-shadow:0 0 12px rgba(255,202,40,0.5);cursor:pointer;">📦</div>
          <div style="display:flex;align-items:center;gap:3px;background:rgba(0,0,0,0.8);border:1px solid rgba(255,202,40,0.3);border-radius:8px;padding:2px 6px;margin-top:3px;cursor:pointer;" onclick="window.location.href='/user/${ownerId}'">
            ${avatarHtml}
            <span style="font-size:9px;color:#ffca28;font-weight:600;">@${capsule.profiles?.username||'explorer'}</span>
          </div>
        </div>`,
        className: '',
        iconSize: [60, 60],
        iconAnchor: [30, 18],
      })

      const marker = L.marker([capsule.latitude, capsule.longitude], { icon }).addTo(map)

      marker.on('click', () => {
        const dist = userLat ? getDistance(userLat, userLng, capsule.latitude, capsule.longitude) : 9999
        setSelectedCapsule({ ...capsule, distance: Math.round(dist), ownerId })
        setNearbyUnlocked(dist <= 300)
      })
    })
  }

  const showRoute = () => {
    if (!selectedCapsule || !userLat) return
    const url = `https://www.google.com/maps/dir/${userLat},${userLng}/${selectedCapsule.latitude},${selectedCapsule.longitude}`
    window.open(url, '_blank')
  }

  const getDistance = (lat1, lng1, lat2, lng2) => {
    const R = 6371000
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLng = (lng2 - lng1) * Math.PI / 180
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  }

  return (
    <div style={{minHeight:'100vh',background:'#070a10',color:'#eef2f7'}}>

      {/* TOP BAR */}
      <div style={{position:'fixed',top:0,left:0,right:0,background:'rgba(7,10,16,0.95)',borderBottom:'1px solid rgba(255,255,255,0.07)',padding:'0 16px',height:'56px',display:'flex',alignItems:'center',justifyContent:'space-between',zIndex:1000}}>
        <button onClick={()=>window.location.href='/feed'} style={{background:'none',border:'none',color:'#8892a4',fontSize:'24px',cursor:'pointer'}}>←</button>
        <div style={{fontSize:'16px',fontWeight:'800',background:'linear-gradient(90deg,#00e5ff,#00ff88)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>🗺 Echo Map</div>
        <div style={{fontSize:'11px',color:'#4a5568',textAlign:'right'}}>
          <div style={{color:'#00e5ff'}}>{unlockedZones.length} zones</div>
        </div>
      </div>

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
            <div style={{color:'#4a5568',fontSize:'14px'}}>Loading map...</div>
          </div>
        ) : (
          <div ref={mapRef} style={{width:'100%',height:'100%'}}/>
        )}
      </div>

      {/* Stats overlay — top left */}
      <div style={{position:'fixed',top:'68px',left:'10px',zIndex:500,background:'rgba(7,10,16,0.9)',border:'1px solid rgba(0,229,255,0.2)',borderRadius:'12px',padding:'10px 12px',minWidth:'130px'}}>
        <div style={{fontSize:'10px',color:'#00e5ff',fontWeight:'700',marginBottom:'6px'}}>📊 Explored</div>
        <div style={{fontSize:'11px',color:'#8892a4',marginBottom:'3px'}}>
          🏙 {cityName}: <span style={{color:'#00e5ff',fontWeight:'700'}}>{stats.city}%</span>
        </div>
        <div style={{fontSize:'11px',color:'#8892a4',marginBottom:'3px'}}>
          🇧🇩 Country: <span style={{color:'#00ff88',fontWeight:'700'}}>{stats.country}%</span>
        </div>
        <div style={{fontSize:'11px',color:'#8892a4'}}>
          🌍 World: <span style={{color:'#ffca28',fontWeight:'700'}}>{stats.world}%</span>
        </div>
      </div>

      {/* Capsule count — top right */}
      <div style={{position:'fixed',top:'68px',right:'10px',zIndex:500,background:'rgba(7,10,16,0.9)',border:'1px solid rgba(255,202,40,0.2)',borderRadius:'12px',padding:'10px 12px',textAlign:'center'}}>
        <div style={{fontSize:'10px',color:'#ffca28',fontWeight:'700',marginBottom:'4px'}}>📦 Capsules</div>
        <div style={{fontSize:'20px',fontWeight:'800',color:'#eef2f7'}}>{capsules.length}</div>
        <div style={{fontSize:'9px',color:'#4a5568'}}>on map</div>
      </div>

      {/* Legend */}
      <div style={{position:'fixed',bottom:'92px',left:'10px',zIndex:500,background:'rgba(7,10,16,0.9)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'10px',padding:'8px 12px'}}>
        <div style={{fontSize:'9px',color:'#4a5568',marginBottom:'5px',fontWeight:'700'}}>LEGEND</div>
        <div style={{display:'flex',alignItems:'center',gap:'5px',marginBottom:'3px'}}>
          <div style={{width:'10px',height:'10px',borderRadius:'50%',border:'2px solid #00e5ff',background:'linear-gradient(135deg,#00e5ff,#00ff88)'}}></div>
          <span style={{fontSize:'9px',color:'#8892a4'}}>You</span>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:'5px',marginBottom:'3px'}}>
          <span style={{fontSize:'10px'}}>📦</span>
          <span style={{fontSize:'9px',color:'#8892a4'}}>Capsule</span>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:'5px'}}>
          <div style={{width:'10px',height:'10px',borderRadius:'2px',background:'rgba(5,8,14,0.85)',border:'1px solid rgba(255,255,255,0.1)'}}></div>
          <span style={{fontSize:'9px',color:'#8892a4'}}>Fog</span>
        </div>
      </div>

      {/* Capsule popup */}
      {selectedCapsule && (
        <div style={{position:'fixed',bottom:'90px',left:'12px',right:'12px',zIndex:2000,background:'#111620',border:`1px solid ${nearbyUnlocked?'rgba(0,255,136,0.3)':'rgba(255,202,40,0.3)'}`,borderRadius:'16px',padding:'16px',maxHeight:'60vh',overflowY:'auto'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'12px'}}>
            <div>
              <div style={{fontSize:'15px',fontWeight:'700',color:'#ffca28'}}>📦 Time Capsule</div>
              <div
                onClick={()=>window.location.href=`/user/${selectedCapsule.ownerId}`}
                style={{fontSize:'12px',color:'#00e5ff',marginTop:'3px',cursor:'pointer',textDecoration:'underline'}}>
                by @{selectedCapsule.profiles?.username}
              </div>
              <div style={{fontSize:'11px',color:'#4a5568',marginTop:'2px'}}>📍 {selectedCapsule.location_name}</div>
            </div>
            <button onClick={()=>setSelectedCapsule(null)} style={{background:'none',border:'none',color:'#4a5568',fontSize:'20px',cursor:'pointer'}}>✕</button>
          </div>

          {!nearbyUnlocked && (
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
                🗺 Show Route to Capsule
              </button>
            </>
          )}

          {nearbyUnlocked && (
            <div style={{background:'rgba(0,255,136,0.06)',border:'1px solid rgba(0,255,136,0.2)',borderRadius:'10px',padding:'14px'}}>
              <div style={{fontSize:'13px',color:'#00ff88',fontWeight:'700',marginBottom:'8px'}}>🔓 Capsule Unlocked!</div>
              {selectedCapsule.media_url && (
                <img src={selectedCapsule.media_url} style={{width:'100%',maxHeight:'200px',objectFit:'cover',borderRadius:'8px',marginBottom:'8px'}}/>
              )}
              {selectedCapsule.content && (
                <div style={{fontSize:'13px',color:'#8892a4',lineHeight:'1.6'}}>{selectedCapsule.content}</div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
    }
