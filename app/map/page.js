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
  const [userLat, setUserLat] = useState(null)
  const [userLng, setUserLng] = useState(null)
  const [capsules, setCapsules] = useState([])
  const [unlockedZones, setUnlockedZones] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedCapsule, setSelectedCapsule] = useState(null)
  const [nearbyUnlocked, setNearbyUnlocked] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { window.location.href = '/'; return }
      const u = data.session.user
      setUser(u)

      // Load capsules
      const { data: caps } = await supabase
        .from('posts')
        .select('*, profiles(username, full_name, avatar_url)')
        .eq('media_type', 'capsule')
        .not('latitude', 'is', null)
      setCapsules(caps || [])

      // Load unlocked zones
      const { data: zones } = await supabase
        .from('unlocked_zones')
        .select('*')
        .eq('user_id', u.id)
      setUnlockedZones(zones || [])

      setLoading(false)
    })
  }, [])

  useEffect(() => {
    if (loading) return
    loadLeaflet()
  }, [loading])

  const loadLeaflet = () => {
    if (typeof window === 'undefined') return

    // Load Leaflet CSS
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link')
      link.id = 'leaflet-css'
      link.rel = 'stylesheet'
      link.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css'
      document.head.appendChild(link)
    }

    // Load Leaflet JS
    if (window.L) {
      initMap()
      return
    }
    const script = document.createElement('script')
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js'
    script.onload = initMap
    document.head.appendChild(script)
  }

  const initMap = () => {
    if (!mapRef.current || mapInstanceRef.current) return
    const L = window.L

    // Default to Dhaka if no GPS
    const lat = userLat || 23.8103
    const lng = userLng || 90.4125

    const map = L.map(mapRef.current, {
      center: [lat, lng],
      zoom: 15,
      zoomControl: false,
    })

    mapInstanceRef.current = map

    // Dark map tiles
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '©OpenStreetMap ©CartoDB',
      maxZoom: 19,
    }).addTo(map)

    // Add zoom control
    L.control.zoom({ position: 'bottomright' }).addTo(map)

    // Get user location
    if (navigator.geolocation) {
      navigator.geolocation.watchPosition(pos => {
        const { latitude, longitude } = pos.coords
        setUserLat(latitude)
        setUserLng(longitude)
        updateUserOnMap(map, L, latitude, longitude)
        unlockZone(latitude, longitude)
      }, null, { enableHighAccuracy: true, maximumAge: 10000 })
    }

    // Draw fog of war
    drawFogOfWar(map, L, unlockedZones, lat, lng)

    // Add capsule markers
    addCapsuleMarkers(map, L)
  }

  const updateUserOnMap = (map, L, lat, lng) => {
    // Remove old marker
    if (window._userMarker) window._userMarker.remove()

    const icon = L.divIcon({
      html: `<div style="width:20px;height:20px;background:linear-gradient(135deg,#00e5ff,#00ff88);border-radius:50%;border:3px solid white;box-shadow:0 0 15px rgba(0,229,255,0.8);"></div>`,
      className: '',
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    })

    window._userMarker = L.marker([lat, lng], { icon }).addTo(map)
    map.setView([lat, lng], map.getZoom())
  }

  const unlockZone = async (lat, lng) => {
    if (!user) return
    const zoneKey = `${Math.round(lat * 100) / 100}_${Math.round(lng * 100) / 100}`

    // Check if already unlocked
    const exists = unlockedZones.find(z =>
      getDistance(lat, lng, z.lat, z.lng) < 100
    )
    if (exists) return

    // Save to database
    const { data } = await supabase.from('unlocked_zones').insert({
      user_id: user.id,
      location_name: zoneKey,
      lat: lat,
      lng: lng,
    }).select().single()

    if (data) {
      setUnlockedZones(prev => [...prev, data])
      // Redraw fog
      if (mapInstanceRef.current && window.L) {
        if (window._fogLayer) window._fogLayer.remove()
        drawFogOfWar(mapInstanceRef.current, window.L, [...unlockedZones, data], lat, lng)
      }
    }
  }

  const drawFogOfWar = (map, L, zones, currentLat, currentLng) => {
    // World bounds
    const worldBounds = [[-90, -180], [90, 180]]

    // Create SVG fog overlay
    const allZones = [...zones]
    if (currentLat && currentLng) {
      allZones.push({ lat: currentLat, lng: currentLng })
    }

    // Use canvas for fog
    if (window._fogLayer) window._fogLayer.remove()

    const fogLayer = L.imageOverlay('', worldBounds)

    // Draw fog using canvas
    const canvas = document.createElement('canvas')
    const size = 2000
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')

    // Dark fog
    ctx.fillStyle = 'rgba(7, 10, 16, 0.88)'
    ctx.fillRect(0, 0, size, size)

    // Clear circles for unlocked zones
    ctx.globalCompositeOperation = 'destination-out'
    allZones.forEach(zone => {
      const x = ((zone.lng + 180) / 360) * size
      const y = ((90 - zone.lat) / 180) * size
      const radius = 60 // zone radius in pixels

      const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius)
      gradient.addColorStop(0, 'rgba(0,0,0,1)')
      gradient.addColorStop(0.7, 'rgba(0,0,0,0.9)')
      gradient.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = gradient
      ctx.beginPath()
      ctx.arc(x, y, radius, 0, Math.PI * 2)
      ctx.fill()
    })

    window._fogLayer = L.imageOverlay(canvas.toDataURL(), [[-90, -180], [90, 180]], {
      opacity: 1,
      interactive: false,
    }).addTo(map)
  }

  const addCapsuleMarkers = (map, L) => {
    capsules.forEach(capsule => {
      if (!capsule.latitude || !capsule.longitude) return

      const icon = L.divIcon({
        html: `<div style="
          width:32px;height:32px;
          background:linear-gradient(135deg,#ffca28,#ff9800);
          border-radius:50%;
          border:2px solid rgba(255,255,255,0.8);
          display:flex;align-items:center;justify-content:center;
          font-size:16px;
          box-shadow:0 0 12px rgba(255,202,40,0.7);
          cursor:pointer;
        ">📦</div>`,
        className: '',
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      })

      const marker = L.marker([capsule.latitude, capsule.longitude], { icon }).addTo(map)

      marker.on('click', () => {
        const dist = userLat ? getDistance(userLat, userLng, capsule.latitude, capsule.longitude) : 9999
        setSelectedCapsule({ ...capsule, distance: Math.round(dist) })
        setNearbyUnlocked(dist <= 300)
      })
    })
  }

  const getDistance = (lat1, lng1, lat2, lng2) => {
    const R = 6371000
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLng = (lng2 - lng1) * Math.PI / 180
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLng/2)**2
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  }

  return (
    <div style={{minHeight:'100vh',background:'#070a10',color:'#eef2f7'}}>

      {/* TOP BAR */}
      <div style={{position:'fixed',top:0,left:0,right:0,background:'rgba(7,10,16,0.95)',borderBottom:'1px solid rgba(255,255,255,0.07)',padding:'0 16px',height:'56px',display:'flex',alignItems:'center',justifyContent:'space-between',zIndex:1000}}>
        <button onClick={()=>window.location.href='/feed'} style={{background:'none',border:'none',color:'#8892a4',fontSize:'24px',cursor:'pointer'}}>←</button>
        <div style={{fontSize:'16px',fontWeight:'800',background:'linear-gradient(90deg,#00e5ff,#00ff88)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>🗺 Echo Map</div>
        <div style={{fontSize:'12px',color:'#4a5568'}}>{unlockedZones.length} zones</div>
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

      {/* Stats overlay */}
      <div style={{position:'fixed',top:'68px',left:'12px',zIndex:500,background:'rgba(7,10,16,0.85)',border:'1px solid rgba(0,229,255,0.2)',borderRadius:'12px',padding:'10px 14px'}}>
        <div style={{fontSize:'11px',color:'#00e5ff',fontWeight:'700',marginBottom:'4px'}}>🗺 Explored</div>
        <div style={{fontSize:'18px',fontWeight:'800',color:'#eef2f7'}}>{unlockedZones.length}</div>
        <div style={{fontSize:'10px',color:'#4a5568'}}>zones unlocked</div>
      </div>

      <div style={{position:'fixed',top:'68px',right:'12px',zIndex:500,background:'rgba(7,10,16,0.85)',border:'1px solid rgba(255,202,40,0.2)',borderRadius:'12px',padding:'10px 14px'}}>
        <div style={{fontSize:'11px',color:'#ffca28',fontWeight:'700',marginBottom:'4px'}}>📦 Capsules</div>
        <div style={{fontSize:'18px',fontWeight:'800',color:'#eef2f7'}}>{capsules.length}</div>
        <div style={{fontSize:'10px',color:'#4a5568'}}>nearby</div>
      </div>

      {/* Legend */}
      <div style={{position:'fixed',bottom:'100px',left:'12px',zIndex:500,background:'rgba(7,10,16,0.85)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'12px',padding:'10px 14px'}}>
        <div style={{fontSize:'10px',color:'#4a5568',marginBottom:'6px',fontWeight:'600'}}>LEGEND</div>
        <div style={{display:'flex',alignItems:'center',gap:'6px',marginBottom:'4px'}}>
          <div style={{width:'12px',height:'12px',borderRadius:'50%',background:'linear-gradient(135deg,#00e5ff,#00ff88)'}}></div>
          <span style={{fontSize:'10px',color:'#8892a4'}}>You</span>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:'6px',marginBottom:'4px'}}>
          <span style={{fontSize:'12px'}}>📦</span>
          <span style={{fontSize:'10px',color:'#8892a4'}}>Time Capsule</span>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:'6px'}}>
          <div style={{width:'12px',height:'12px',borderRadius:'2px',background:'rgba(7,10,16,0.88)'}}></div>
          <span style={{fontSize:'10px',color:'#8892a4'}}>Unexplored</span>
        </div>
      </div>

      {/* Capsule popup */}
      {selectedCapsule && (
        <div style={{position:'fixed',bottom:'90px',left:'16px',right:'16px',zIndex:2000,background:'#111620',border:'1px solid rgba(255,202,40,0.3)',borderRadius:'16px',padding:'16px'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'12px'}}>
            <div>
              <div style={{fontSize:'14px',fontWeight:'700',color:'#ffca28'}}>📦 Time Capsule</div>
              <div style={{fontSize:'12px',color:'#4a5568',marginTop:'2px'}}>by {selectedCapsule.profiles?.full_name || selectedCapsule.profiles?.username}</div>
              <div style={{fontSize:'11px',color:'#00e5ff',marginTop:'2px'}}>📍 {selectedCapsule.location_name}</div>
            </div>
            <button onClick={()=>setSelectedCapsule(null)} style={{background:'none',border:'none',color:'#4a5568',fontSize:'20px',cursor:'pointer'}}>✕</button>
          </div>

          {nearbyUnlocked ? (
            <div style={{background:'rgba(0,255,136,0.08)',border:'1px solid rgba(0,255,136,0.25)',borderRadius:'10px',padding:'12px'}}>
              <div style={{fontSize:'13px',color:'#00ff88',fontWeight:'700',marginBottom:'6px'}}>🔓 Unlocked!</div>
              {selectedCapsule.media_url && selectedCapsule.media_type==='capsule' && (
                <img src={selectedCapsule.media_url} style={{width:'100%',maxHeight:'180px',objectFit:'cover',borderRadius:'8px',marginBottom:'8px'}}/>
              )}
              {selectedCapsule.content && <div style={{fontSize:'13px',color:'#8892a4'}}>{selectedCapsule.content}</div>}
            </div>
          ) : (
            <div style={{background:'rgba(255,69,96,0.06)',border:'1px solid rgba(255,69,96,0.2)',borderRadius:'10px',padding:'12px',textAlign:'center'}}>
              <div style={{fontSize:'24px',marginBottom:'6px'}}>🔒</div>
              <div style={{fontSize:'13px',color:'#ff4560',fontWeight:'600'}}>You are {selectedCapsule.distance}m away</div>
              <div style={{fontSize:'11px',color:'#4a5568',marginTop:'4px'}}>Come within 300m to unlock this capsule</div>
              <div style={{marginTop:'10px',height:'4px',background:'rgba(255,255,255,0.05)',borderRadius:'2px'}}>
                <div style={{height:'100%',width:`${Math.min((300/Math.max(selectedCapsule.distance,1))*100,100)}%`,background:'linear-gradient(90deg,#ff4560,#ffca28)',borderRadius:'2px'}}></div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
      }
