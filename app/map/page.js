'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default function MapPage() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [userLat, setUserLat] = useState(null)
  const [userLng, setUserLng] = useState(null)
  const [prevLat, setPrevLat] = useState(null)
  const [prevLng, setPrevLng] = useState(null)
  const [unlockedZones, setUnlockedZones] = useState([])
  const [nearbyPosts, setNearbyPosts] = useState([])
  const [livePeople, setLivePeople] = useState([])
  const [selectedPost, setSelectedPost] = useState(null)
  const [mapReady, setMapReady] = useState(false)
  const [isLive, setIsLive] = useState(false)
  const [liveInterval, setLiveInterval] = useState(null)
  const [walkerPos, setWalkerPos] = useState(null)
  const [walkerTarget, setWalkerTarget] = useState(null)
  const [stats, setStats] = useState({ zones: 0, km: 0 })
  const mapRef = useRef(null)
  const leafletMap = useRef(null)
  const userMarker = useRef(null)
  const liveMarkers = useRef({})
  const postMarkers = useRef([])
  const darkOverlay = useRef(null)
  const exploredCircles = useRef([])
  const walkerFrame = useRef(null)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { window.location.href = '/'; return }
      const u = data.session.user
      setUser(u)
      const { data: p } = await supabase.from('profiles').select('*').eq('id', u.id).single()
      setProfile(p)

      // Load explored zones
      const { data: zones } = await supabase
        .from('explored_zones')
        .select('*')
        .eq('user_id', u.id)
      setUnlockedZones(zones || [])
      setStats({ zones: (zones||[]).length, km: Math.round((zones||[]).length * 0.5) })
    })
    loadLeaflet()
    return () => {
      if (liveInterval) clearInterval(liveInterval)
      cancelAnimationFrame(walkerFrame.current)
    }
  }, [])

  const loadLeaflet = () => {
    if (document.getElementById('leaflet-css')) { initMap(); return }
    const link = document.createElement('link')
    link.id = 'leaflet-css'
    link.rel = 'stylesheet'
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
    document.head.appendChild(link)
    const script = document.createElement('script')
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
    script.onload = () => initMap()
    document.head.appendChild(script)
  }

  const initMap = () => {
    if (!mapRef.current || leafletMap.current) return
    const L = window.L
    const map = L.map(mapRef.current, {
      center: [23.8103, 90.4125],
      zoom: 14,
      zoomControl: false,
    })

    // Street map tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
      maxZoom: 19,
    }).addTo(map)

    leafletMap.current = map
    setMapReady(true)

    // Start watching location
    if (navigator.geolocation) {
      navigator.geolocation.watchPosition(
        pos => handleLocationUpdate(pos.coords.latitude, pos.coords.longitude),
        err => console.log(err),
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
      )
    }
  }

  const handleLocationUpdate = async (lat, lng) => {
    setUserLat(lat)
    setUserLng(lng)

    // Animate walker movement
    if (walkerPos) {
      setWalkerTarget({ lat, lng })
      animateWalker(walkerPos.lat, walkerPos.lng, lat, lng)
    } else {
      setWalkerPos({ lat, lng })
      setWalkerTarget({ lat, lng })
    }

    if (!leafletMap.current) return
    const L = window.L

    // Center map
    leafletMap.current.setView([lat, lng], 15)

    // Update or create user marker with profile pic
    if (userMarker.current) {
      userMarker.current.setLatLng([lat, lng])
    } else {
      const avatarUrl = profile?.avatar_url
      const icon = L.divIcon({
        html: `
          <div style="
            position:relative;
            display:flex;
            flex-direction:column;
            align-items:center;
          ">
            <div style="
              width:44px;height:44px;
              border-radius:50%;
              border:3px solid #00e5ff;
              overflow:hidden;
              background:linear-gradient(135deg,#00e5ff,#00ff88);
              box-shadow:0 0 16px rgba(0,229,255,0.7);
              display:flex;align-items:center;justify-content:center;
            ">
              ${avatarUrl
                ? `<img src="${avatarUrl}" style="width:100%;height:100%;object-fit:cover;"/>`
                : `<span style="font-size:20px;font-weight:900;color:#070a10;">${(profile?.full_name||'E')[0].toUpperCase()}</span>`
              }
            </div>
            <div style="
              width:0;height:0;
              border-left:8px solid transparent;
              border-right:8px solid transparent;
              border-top:12px solid #00e5ff;
              margin-top:-2px;
            "></div>
            <div style="
              background:rgba(0,229,255,0.15);
              border:1px solid rgba(0,229,255,0.4);
              border-radius:20px;
              padding:2px 8px;
              font-size:10px;
              color:#00e5ff;
              font-weight:700;
              white-space:nowrap;
              margin-top:4px;
              backdrop-filter:blur(4px);
            ">📍 You</div>
          </div>
        `,
        className: '',
        iconSize: [60, 80],
        iconAnchor: [30, 56],
      })
      userMarker.current = L.marker([lat, lng], { icon }).addTo(leafletMap.current)
    }

    // Unlock zone at current location
    await unlockZone(lat, lng)

    // Load nearby posts
    await loadNearbyPosts(lat, lng)
  }

  const animateWalker = (fromLat, fromLng, toLat, toLng) => {
    if (!userMarker.current || !window.L) return
    const steps = 30
    let step = 0
    const animate = () => {
      if (step >= steps) {
        setWalkerPos({ lat: toLat, lng: toLng })
        return
      }
      const t = step / steps
      const currentLat = fromLat + (toLat - fromLat) * t
      const currentLng = fromLng + (toLng - fromLng) * t
      userMarker.current.setLatLng([currentLat, currentLng])
      step++
      walkerFrame.current = requestAnimationFrame(animate)
    }
    walkerFrame.current = requestAnimationFrame(animate)
  }

  const unlockZone = async (lat, lng) => {
    if (!user || !leafletMap.current) return
    const L = window.L

    // Round to grid (approx 500m grid)
    const gridLat = Math.round(lat * 100) / 100
    const gridLng = Math.round(lng * 100) / 100
    const zoneKey = `${gridLat},${gridLng}`

    // Check if already unlocked
    const { data: existing } = await supabase
      .from('explored_zones')
      .select('id')
      .eq('user_id', user.id)
      .eq('zone_key', zoneKey)
      .single()

    if (!existing) {
      await supabase.from('explored_zones').insert({
        user_id: user.id,
        zone_key: zoneKey,
        lat: gridLat,
        lng: gridLng,
      })
      setStats(s => ({ zones: s.zones + 1, km: s.km + 1 }))
    }

    // Draw fog of war — dark overlay with clear circle
    redrawFog(lat, lng)
  }

  const redrawFog = async (centerLat, centerLng) => {
    if (!leafletMap.current || !window.L) return
    const L = window.L

    // Remove old fog
    if (darkOverlay.current) leafletMap.current.removeLayer(darkOverlay.current)
    exploredCircles.current.forEach(c => leafletMap.current.removeLayer(c))
    exploredCircles.current = []

    // Get all explored zones
    const { data: zones } = await supabase
      .from('explored_zones')
      .select('lat,lng')
      .eq('user_id', user.id)

    // Draw clear circles for each explored zone
    ;(zones||[]).forEach(zone => {
      const circle = L.circle([zone.lat, zone.lng], {
        radius: 500,
        color: 'transparent',
        fillColor: 'transparent',
        fillOpacity: 0,
        weight: 0,
      }).addTo(leafletMap.current)
      exploredCircles.current.push(circle)
    })

    // Create SVG fog overlay
    const bounds = leafletMap.current.getBounds()
    const fogHtml = createFogSVG(bounds, zones || [], centerLat, centerLng)
    const fogIcon = L.divIcon({
      html: fogHtml,
      className: '',
      iconSize: [0, 0],
    })

    // Use pane for fog
    if (!leafletMap.current.getPane('fogPane')) {
      leafletMap.current.createPane('fogPane')
      leafletMap.current.getPane('fogPane').style.zIndex = 450
      leafletMap.current.getPane('fogPane').style.pointerEvents = 'none'
    }

    // Draw fog as circle complement
    const outerBounds = [
      [bounds.getSouth()-2, bounds.getWest()-2],
      [bounds.getNorth()+2, bounds.getWest()-2],
      [bounds.getNorth()+2, bounds.getEast()+2],
      [bounds.getSouth()-2, bounds.getEast()+2],
    ]

    // Dark overlay
    darkOverlay.current = L.polygon(outerBounds, {
      color: 'transparent',
      fillColor: '#070a10',
      fillOpacity: 0.88,
      pane: 'fogPane',
    }).addTo(leafletMap.current)

    // Clear holes for each explored zone
    ;(zones||[]).forEach(zone => {
      const clearCircle = L.circle([zone.lat, zone.lng], {
        radius: 600,
        color: 'rgba(0,229,255,0.15)',
        weight: 2,
        fillColor: '#070a10',
        fillOpacity: 0,
        pane: 'fogPane',
      }).addTo(leafletMap.current)
      exploredCircles.current.push(clearCircle)
    })

    // Current position glow
    const glowCircle = L.circle([centerLat, centerLng], {
      radius: 300,
      color: 'rgba(0,229,255,0.4)',
      weight: 2,
      fillColor: 'rgba(0,229,255,0.05)',
      fillOpacity: 1,
      pane: 'fogPane',
    }).addTo(leafletMap.current)
    exploredCircles.current.push(glowCircle)
  }

  const createFogSVG = (bounds, zones, centerLat, centerLng) => ''

  const loadNearbyPosts = async (lat, lng) => {
    const { data } = await supabase
      .from('posts')
      .select('*, profiles(id, username, full_name, avatar_url)')
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)

    if (!data || !leafletMap.current) return
    const L = window.L

    // Clear old markers
    postMarkers.current.forEach(m => leafletMap.current.removeLayer(m))
    postMarkers.current = []

    // Filter within ~10km
    const nearby = data.filter(post => {
      const d = getDistance(lat, lng, post.latitude, post.longitude)
      return d <= 10
    })
    setNearbyPosts(nearby)

    nearby.forEach(post => {
      const icon = L.divIcon({
        html: `
          <div style="
            width:36px;height:36px;
            borderRadius:50%;
            border:2px solid ${post.media_type==='video'?'#ffa500':post.media_type==='capsule'?'#ffca28':'#00ff88'};
            overflow:hidden;
            background:#111620;
            display:flex;align-items:center;justify-content:center;
            cursor:pointer;
            box-shadow:0 2px 8px rgba(0,0,0,0.5);
          ">
            ${post.media_url && post.media_type==='photo'
              ? `<img src="${post.media_url}" style="width:100%;height:100%;object-fit:cover;"/>`
              : `<span style="font-size:16px;">${post.media_type==='video'?'⚡':post.media_type==='capsule'?'📦':'📝'}</span>`
            }
          </div>
        `,
        className: '',
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      })
      const marker = L.marker([post.latitude, post.longitude], { icon })
        .addTo(leafletMap.current)
        .on('click', () => setSelectedPost(post))
      postMarkers.current.push(marker)
    })
  }

  const toggleLive = async () => {
    if (!user || !userLat) return
    if (isLive) {
      clearInterval(liveInterval)
      setLiveInterval(null)
      await supabase.from('live_locations').delete().eq('user_id', user.id)
      setIsLive(false)
      // Remove live markers
      Object.values(liveMarkers.current).forEach(m => leafletMap.current?.removeLayer(m))
      liveMarkers.current = {}
    } else {
      setIsLive(true)
      await updateLiveLocation()
      const interval = setInterval(async () => {
        await updateLiveLocation()
        await loadLivePeople()
      }, 5000)
      setLiveInterval(interval)
      await loadLivePeople()
    }
  }

  const updateLiveLocation = async () => {
    if (!user || !userLat) return
    await supabase.from('live_locations').upsert({
      user_id: user.id,
      lat: userLat,
      lng: userLng,
      updated_at: new Date().toISOString(),
    })
  }

  const loadLivePeople = async () => {
    if (!leafletMap.current || !window.L) return
    const L = window.L
    const fiveMinAgo = new Date(Date.now() - 5*60*1000).toISOString()
    const { data } = await supabase
      .from('live_locations')
      .select('*, profiles(id, username, full_name, avatar_url)')
      .gt('updated_at', fiveMinAgo)
      .neq('user_id', user.id)

    setLivePeople(data || [])

    ;(data||[]).forEach(person => {
      const icon = L.divIcon({
        html: `
          <div style="display:flex;flex-direction:column;align-items:center;">
            <div style="
              width:38px;height:38px;
              border-radius:50%;
              border:2px solid #ff4560;
              overflow:hidden;
              background:linear-gradient(135deg,#ff4560,#ff6b35);
              display:flex;align-items:center;justify-content:center;
              box-shadow:0 0 12px rgba(255,69,96,0.6);
              animation:livePulse 1.5s infinite;
            ">
              ${person.profiles?.avatar_url
                ? `<img src="${person.profiles.avatar_url}" style="width:100%;height:100%;object-fit:cover;"/>`
                : `<span style="font-size:16px;font-weight:800;color:#fff;">${(person.profiles?.full_name||'?')[0].toUpperCase()}</span>`
              }
            </div>
            <div style="
              background:rgba(255,69,96,0.15);
              border:1px solid rgba(255,69,96,0.4);
              border-radius:12px;padding:1px 6px;
              font-size:9px;color:#ff4560;font-weight:700;
              margin-top:3px;white-space:nowrap;
            ">🔴 LIVE · @${person.profiles?.username||'?'}</div>
          </div>
        `,
        className: '',
        iconSize: [50, 60],
        iconAnchor: [25, 38],
      })

      if (liveMarkers.current[person.user_id]) {
        liveMarkers.current[person.user_id].setLatLng([person.lat, person.lng])
      } else {
        liveMarkers.current[person.user_id] = L.marker([person.lat, person.lng], { icon }).addTo(leafletMap.current)
      }
    })
  }

  const getDistance = (lat1, lng1, lat2, lng2) => {
    const R = 6371
    const dLat = (lat2-lat1) * Math.PI/180
    const dLng = (lng2-lng1) * Math.PI/180
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  }

  const timeAgo = (date) => {
    const s = Math.floor((new Date()-new Date(date))/1000)
    if(s<60) return 'এইমাত্র'
    if(s<3600) return Math.floor(s/60)+'মি'
    if(s<86400) return Math.floor(s/3600)+'ঘ'
    return Math.floor(s/86400)+'দিন'
  }

  return (
    <div style={{height:'100vh',background:'#070a10',overflow:'hidden',position:'relative'}}>

      {/* TOP BAR */}
      <div style={{position:'fixed',top:0,left:0,right:0,zIndex:500,padding:'10px 16px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <button onClick={()=>window.location.href='/feed'} style={{background:'rgba(7,10,16,0.85)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'50%',width:'40px',height:'40px',color:'#fff',fontSize:'18px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',backdropFilter:'blur(8px)'}}>←</button>

        <div style={{background:'rgba(7,10,16,0.85)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'20px',padding:'6px 14px',display:'flex',gap:'12px',alignItems:'center',backdropFilter:'blur(8px)'}}>
          <div style={{fontSize:'12px',color:'#00e5ff',fontWeight:'700'}}>🗺 {stats.zones} zones</div>
          <div style={{width:'1px',height:'14px',background:'rgba(255,255,255,0.1)'}}/>
          <div style={{fontSize:'12px',color:'#00ff88',fontWeight:'700'}}>📍 {stats.km}km</div>
          {livePeople.length>0&&(
            <>
              <div style={{width:'1px',height:'14px',background:'rgba(255,255,255,0.1)'}}/>
              <div style={{fontSize:'12px',color:'#ff4560',fontWeight:'700'}}>🔴 {livePeople.length} live</div>
            </>
          )}
        </div>

        <button onClick={toggleLive} style={{background:isLive?'rgba(255,69,96,0.2)':'rgba(7,10,16,0.85)',border:`1px solid ${isLive?'rgba(255,69,96,0.5)':'rgba(255,255,255,0.1)'}`,borderRadius:'20px',padding:'8px 14px',color:isLive?'#ff4560':'#8892a4',fontSize:'12px',fontWeight:'700',cursor:'pointer',backdropFilter:'blur(8px)',display:'flex',alignItems:'center',gap:'6px'}}>
          {isLive?<><span style={{animation:'blink 1s infinite'}}>🔴</span> Live</>:'📡 Go Live'}
        </button>
      </div>

      {/* MAP */}
      <div ref={mapRef} style={{width:'100%',height:'100%',position:'absolute',top:0,left:0}}/>

      {/* POST CARD */}
      {selectedPost && (
        <div style={{position:'fixed',bottom:'80px',left:'16px',right:'16px',zIndex:500,background:'rgba(17,22,32,0.97)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'20px',padding:'16px',backdropFilter:'blur(12px)'}}>
          <div style={{display:'flex',gap:'10px',alignItems:'center',marginBottom:'10px'}}>
            <div style={{width:'40px',height:'40px',borderRadius:'50%',overflow:'hidden',background:'linear-gradient(135deg,#00e5ff,#00ff88)',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}} onClick={()=>window.location.href=`/user/${selectedPost.profiles?.id}`}>
              {selectedPost.profiles?.avatar_url?<img src={selectedPost.profiles.avatar_url} style={{width:'100%',height:'100%',objectFit:'cover'}}/>:<span style={{fontWeight:'800',color:'#070a10'}}>{(selectedPost.profiles?.full_name||'E')[0].toUpperCase()}</span>}
            </div>
            <div style={{flex:1}}>
              <div style={{fontSize:'14px',fontWeight:'700'}}>{selectedPost.profiles?.full_name||selectedPost.profiles?.username}</div>
              <div style={{fontSize:'11px',color:'#4a5568'}}>📍 {selectedPost.location_name} · {timeAgo(selectedPost.created_at)}</div>
            </div>
            <button onClick={()=>setSelectedPost(null)} style={{background:'none',border:'none',color:'#4a5568',fontSize:'20px',cursor:'pointer'}}>✕</button>
          </div>
          {selectedPost.media_url&&selectedPost.media_type==='photo'&&<img src={selectedPost.media_url} style={{width:'100%',height:'140px',objectFit:'cover',borderRadius:'12px',marginBottom:'8px'}}/>}
          {selectedPost.media_url&&selectedPost.media_type==='video'&&<video src={selectedPost.media_url} style={{width:'100%',height:'140px',objectFit:'cover',borderRadius:'12px',marginBottom:'8px'}} controls playsInline muted/>}
          {selectedPost.content&&<div style={{fontSize:'13px',color:'#c0c8d8',marginBottom:'8px'}}>{selectedPost.content}</div>}
          <button onClick={()=>window.location.href=`/comments/${selectedPost.id}`} style={{width:'100%',padding:'10px',background:'linear-gradient(135deg,#00e5ff,#00ff88)',border:'none',borderRadius:'12px',fontSize:'13px',fontWeight:'700',color:'#070a10',cursor:'pointer'}}>
            View Post & Comments
          </button>
        </div>
      )}

      {/* FOG INFO */}
      {!userLat && (
        <div style={{position:'fixed',top:'50%',left:'50%',transform:'translate(-50%,-50%)',zIndex:500,background:'rgba(7,10,16,0.9)',border:'1px solid rgba(0,229,255,0.2)',borderRadius:'20px',padding:'24px',textAlign:'center',backdropFilter:'blur(12px)',maxWidth:'280px'}}>
          <div style={{fontSize:'40px',marginBottom:'12px'}}>🗺</div>
          <div style={{fontSize:'16px',fontWeight:'800',color:'#00e5ff',marginBottom:'8px'}}>Explore the World</div>
          <div style={{fontSize:'13px',color:'#4a5568',lineHeight:'1.6'}}>Enable location to unlock your surroundings. Walk around to reveal the map!</div>
        </div>
      )}

      {/* BOTTOM NAV */}
      <div style={{position:'fixed',bottom:0,left:0,right:0,background:'rgba(7,10,16,0.95)',borderTop:'1px solid rgba(255,255,255,0.07)',display:'flex',justifyContent:'space-around',padding:'10px 0 20px',zIndex:500}}>
        {[{icon:'🏠',path:'/feed'},{icon:'🗺',path:'/map'},{icon:'📸',path:'/post'},{icon:'🏆',path:'/leaderboard'},{icon:'👤',path:'/profile'}].map(item=>(
          <div key={item.path} onClick={()=>window.location.href=item.path} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'3px',cursor:'pointer',color:item.path==='/map'?'#00e5ff':'#4a5568'}}>
            <span style={{fontSize:'22px'}}>{item.icon}</span>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes livePulse {
          0%,100%{box-shadow:0 0 12px rgba(255,69,96,0.6)}
          50%{box-shadow:0 0 24px rgba(255,69,96,0.9)}
        }
        @keyframes blink {
          0%,100%{opacity:1}50%{opacity:0.3}
        }
        .leaflet-container{background:#0a0f18!important}
        .leaflet-tile{filter:brightness(0.7) saturate(1.1)!important}
      `}</style>
    </div>
  )
    }
