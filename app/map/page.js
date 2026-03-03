'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default function Map() {
  const mapRef = useRef(null)
  const mapInstance = useRef(null)
  const userMarker = useRef(null)
  const walkerFrame = useRef(null)
  const liveInterval = useRef(null)
  const fogLayer = useRef(null)
  const postMarkers = useRef([])
  const liveMarkers = useRef({})
  const tileLayer = useRef(null)
  const isDragging = useRef(false)
  const prevPos = useRef(null)
  const prevTime = useRef(null)
  const exploredZones = useRef(new Set())
  const fogHoles = useRef([])

  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [userPos, setUserPos] = useState(null)
  const [isLive, setIsLive] = useState(false)
  const [liveMode, setLiveMode] = useState('public')
  const [showLivePicker, setShowLivePicker] = useState(false)
  const [stats, setStats] = useState({ zones: 0, km: 0, live: 0 })
  const [selectedPost, setSelectedPost] = useState(null)
  const [mapStyle, setMapStyle] = useState('street')
  const [showLegend, setShowLegend] = useState(false)
  const [nearbyCount, setNearbyCount] = useState(0)
  const [speed, setSpeed] = useState(0) // m/s

  const mapStyles = {
    street: {
      url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
      label: '🗺 Street',
    },
    light: {
      url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
      label: '☀️ Light',
    },
    dark: {
      url: 'https://{s}.basemaps.cartocdn.com/dark_matter_lite/{z}/{x}/{y}{r}.png',
      label: '🌙 Dark',
    },
    hybrid: {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
      label: '🛸 Hybrid',
    },
  }

  // Speed → transport mode
  const getTransport = (spd) => {
    if (spd < 1.5) return 'walk'      // < 5.4 km/h
    if (spd < 6) return 'bike'         // < 21.6 km/h
    if (spd < 20) return 'moto'        // < 72 km/h
    return 'car'
  }

  // Transport emoji/animation
  const getMarkerHTML = (p, spd, avatarContent) => {
    const mode = getTransport(spd)
    const vehicles = {
      walk: { emoji: '🚶', label: 'Walking', color: '#00e5ff' },
      bike: { emoji: '🚴', label: 'Cycling', color: '#00ff88' },
      moto: { emoji: '🏍️', label: 'Riding', color: '#ffa500' },
      car: { emoji: '🚗', label: 'Driving', color: '#ff4560' },
    }
    const v = vehicles[mode]

    return `
      <div style="display:flex;flex-direction:column;align-items:center;filter:drop-shadow(0 4px 14px ${v.color}88)">
        <div style="position:relative;display:flex;flex-direction:column;align-items:center">
          <!-- Avatar on top -->
          <div style="width:42px;height:42px;border-radius:50%;border:3px solid ${v.color};overflow:hidden;background:linear-gradient(135deg,${v.color},#00ff88);display:flex;align-items:center;justify-content:center;box-shadow:0 0 0 5px ${v.color}22,0 0 20px ${v.color}66;margin-bottom:-8px;z-index:2">
            ${avatarContent}
          </div>
          <!-- Vehicle below avatar -->
          <div style="font-size:26px;z-index:1;animation:bounce 0.6s infinite alternate">${v.emoji}</div>
        </div>
        <div style="width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:10px solid ${v.color};margin-top:-2px"></div>
        <div style="background:${v.color}dd;border-radius:8px;padding:2px 8px;margin-top:3px;font-size:9px;color:#070a10;font-weight:900;white-space:nowrap">${v.label} · ${(spd * 3.6).toFixed(1)} km/h</div>
      </div>
    `
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { window.location.href = '/'; return }
      const u = data.session.user
      setUser(u)
      const { data: p } = await supabase.from('profiles').select('*').eq('id', u.id).single()
      setProfile(p)
      loadLeaflet(u, p)
    })
    return () => {
      cancelAnimationFrame(walkerFrame.current)
      clearInterval(liveInterval.current)
    }
  }, [])

  const loadLeaflet = (u, p) => {
    if (window.L) { setupMap(u, p); return }
    const css = document.createElement('link')
    css.rel = 'stylesheet'
    css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
    document.head.appendChild(css)
    const script = document.createElement('script')
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
    script.onload = () => setTimeout(() => setupMap(u, p), 200)
    document.head.appendChild(script)
  }

  const setupMap = (u, p) => {
    const L = window.L
    if (!mapRef.current || mapInstance.current) return

    const map = L.map(mapRef.current, {
      zoomControl: false,
      attributionControl: false,
      dragging: true,
      scrollWheelZoom: true,
      doubleClickZoom: true,
      touchZoom: true,
      inertia: true,
    }).setView([23.8103, 90.4125], 14)

    tileLayer.current = L.tileLayer(mapStyles.street.url, { maxZoom: 19 }).addTo(map)
    L.control.zoom({ position: 'bottomright' }).addTo(map)

    // Track user interaction — NEVER auto center after user touches map
    map.on('dragstart', () => { isDragging.current = true })
    map.on('zoomstart', () => { isDragging.current = true })

    mapInstance.current = map

    // Load existing explored zones
    loadExploredZones(u.id, map)

    // Geolocation
    let firstFix = true
    navigator.geolocation.watchPosition(
      pos => {
        const { latitude: lat, longitude: lng, speed: gpsSpeed } = pos.coords
        const newPos = [lat, lng]
        const now = Date.now()

        // Calculate speed
        let spd = gpsSpeed || 0
        if (prevPos.current && prevTime.current) {
          const dist = getDistanceM(prevPos.current[0], prevPos.current[1], lat, lng)
          const dt = (now - prevTime.current) / 1000
          if (dt > 0) spd = Math.max(gpsSpeed || 0, dist / dt)
        }
        prevPos.current = newPos
        prevTime.current = now
        setSpeed(spd)
        setUserPos(newPos)

        // Only center on VERY FIRST fix
        if (firstFix) {
          map.setView(newPos, 16)
          firstFix = false
        }

        updateMarker(newPos, p, spd)
        clearFogAt(lat, lng, map)
        loadNearbyPosts(lat, lng)
        loadLiveUsers(lat, lng, u.id)
        unlockZoneDB(u.id, lat, lng)
      },
      err => console.log(err),
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 10000 }
    )
  }

  // Clear fog smoothly at position — no full redraw
  const clearFogAt = (lat, lng, map) => {
    const L = window.L
    if (!map || !L) return

    const zoneKey = `${(lat * 200 | 0)}_${(lng * 200 | 0)}`
    if (exploredZones.current.has(zoneKey)) return
    exploredZones.current.add(zoneKey)

    // Add a hole to fog
    const r = 0.0045 // ~500m
    const pts = []
    for (let i = 0; i < 48; i++) {
      const angle = (i / 48) * 2 * Math.PI
      pts.push([lat + Math.sin(angle) * r, lng + Math.cos(angle) * r])
    }
    fogHoles.current.push(pts)

    // Redraw fog with all holes
    if (fogLayer.current) map.removeLayer(fogLayer.current)
    const bounds = [[-90, -180], [-90, 180], [90, 180], [90, -180]]
    const fogPane = map.getPane('fog') || (() => {
      const p = map.createPane('fog')
      p.style.zIndex = 450
      p.style.pointerEvents = 'none'
      return p
    })()

    fogLayer.current = L.polygon([bounds, ...fogHoles.current], {
      color: 'transparent',
      fillColor: '#050810',
      fillOpacity: 0.5,
      pane: 'fog',
    }).addTo(map)

    // Glow ring at newly explored area
    L.circle([lat, lng], {
      radius: 500,
      color: 'rgba(0,229,255,0.18)',
      fillColor: 'rgba(0,229,255,0.03)',
      fillOpacity: 1,
      weight: 1.5,
      pane: 'fog',
    }).addTo(map)
  }

  const loadExploredZones = async (uid, map) => {
    const L = window.L
    const { data } = await supabase.from('explored_zones').select('*').eq('user_id', uid)
    if (!data?.length) {
      // Draw initial full fog
      const fogPane = map.createPane('fog')
      fogPane.style.zIndex = 450
      fogPane.style.pointerEvents = 'none'
      const bounds = [[-90, -180], [-90, 180], [90, 180], [90, -180]]
      fogLayer.current = L.polygon([bounds], {
        color: 'transparent',
        fillColor: '#050810',
        fillOpacity: 0.5,
        pane: 'fog',
      }).addTo(map)
      return
    }

    const fogPane = map.createPane('fog')
    fogPane.style.zIndex = 450
    fogPane.style.pointerEvents = 'none'

    data.forEach(zone => {
      const zoneKey = `${(zone.lat * 200 | 0)}_${(zone.lng * 200 | 0)}`
      exploredZones.current.add(zoneKey)
      const r = 0.0045
      const pts = []
      for (let i = 0; i < 48; i++) {
        const angle = (i / 48) * 2 * Math.PI
        pts.push([zone.lat + Math.sin(angle) * r, zone.lng + Math.cos(angle) * r])
      }
      fogHoles.current.push(pts)
    })

    const bounds = [[-90, -180], [-90, 180], [90, 180], [90, -180]]
    fogLayer.current = L.polygon([bounds, ...fogHoles.current], {
      color: 'transparent',
      fillColor: '#050810',
      fillOpacity: 0.5,
      pane: 'fog',
    }).addTo(map)

    data.forEach(zone => {
      L.circle([zone.lat, zone.lng], {
        radius: 500,
        color: 'rgba(0,229,255,0.15)',
        fillColor: 'rgba(0,229,255,0.02)',
        fillOpacity: 1,
        weight: 1,
        pane: 'fog',
      }).addTo(map)
    })

    setStats(s => ({ ...s, zones: data.length, km: Math.round(data.length * 0.5 * 10) / 10 }))
  }

  const unlockZoneDB = async (uid, lat, lng) => {
    const zoneKey = `${Math.round(lat * 100) / 100}_${Math.round(lng * 100) / 100}`
    await supabase.from('explored_zones').upsert(
      { user_id: uid, zone_key: zoneKey, lat, lng },
      { onConflict: 'user_id,zone_key' }
    )
    const { count } = await supabase
      .from('explored_zones').select('*', { count: 'exact', head: true }).eq('user_id', uid)
    setStats(s => ({ ...s, zones: count || 0, km: Math.round((count || 0) * 0.5 * 10) / 10 }))
  }

  const updateMarker = (newPos, p, spd) => {
    const L = window.L
    const map = mapInstance.current
    if (!map || !L) return

    const avatarContent = p?.avatar_url
      ? `<img src="${p.avatar_url}" style="width:100%;height:100%;object-fit:cover;border-radius:50%"/>`
      : `<span style="font-size:17px;font-weight:900;color:#070a10">${(p?.full_name || p?.username || 'E')[0].toUpperCase()}</span>`

    const html = getMarkerHTML(p, spd, avatarContent)
    const icon = L.divIcon({ html, className: '', iconAnchor: [30, 75] })

    if (!userMarker.current) {
      userMarker.current = L.marker(newPos, { icon, zIndexOffset: 1000 }).addTo(map)
    } else {
      userMarker.current.setIcon(icon)
      const from = userMarker.current.getLatLng()
      const steps = 30
      let step = 0
      cancelAnimationFrame(walkerFrame.current)
      const animate = () => {
        const t = step / steps
        const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
        userMarker.current.setLatLng([
          from.lat + (newPos[0] - from.lat) * ease,
          from.lng + (newPos[1] - from.lng) * ease,
        ])
        step++
        if (step <= steps) walkerFrame.current = requestAnimationFrame(animate)
      }
      animate()
    }
    // NEVER auto pan — user controls map
  }

  const loadNearbyPosts = async (lat, lng) => {
    const L = window.L
    const map = mapInstance.current
    if (!map || !L) return

    postMarkers.current.forEach(m => map.removeLayer(m))
    postMarkers.current = []

    const { data } = await supabase
      .from('posts').select('*, profiles(username, full_name, avatar_url)')
      .not('latitude', 'is', null).limit(40)

    setNearbyCount((data || []).length)
    const cfg = {
      video: { color: '#ffa500', emoji: '🎬' },
      photo: { color: '#00e5ff', emoji: '📷' },
      capsule: { color: '#ffca28', emoji: '📦' },
      text: { color: '#00ff88', emoji: '💬' },
    }
    ;(data || []).forEach(post => {
      const c = cfg[post.media_type] || cfg.text
      const html = `
        <div style="display:flex;flex-direction:column;align-items:center;cursor:pointer">
          <div style="width:40px;height:40px;border-radius:50%;background:${c.color}18;border:2.5px solid ${c.color};display:flex;align-items:center;justify-content:center;font-size:18px;box-shadow:0 0 14px ${c.color}55">${c.emoji}</div>
          <div style="width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-top:8px solid ${c.color};margin-top:-1px"></div>
        </div>`
      const icon = L.divIcon({ html, className: '', iconAnchor: [20, 48] })
      const marker = L.marker([post.latitude, post.longitude], { icon }).addTo(map)
      marker.on('click', () => setSelectedPost(post))
      postMarkers.current.push(marker)
    })
  }

  const loadLiveUsers = async (lat, lng, uid) => {
    const L = window.L
    const map = mapInstance.current
    if (!map || !L) return
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
    const { data } = await supabase
      .from('live_locations').select('*, profiles(id, username, full_name, avatar_url)')
      .neq('user_id', uid).gte('updated_at', fiveMinAgo)
    setStats(s => ({ ...s, live: (data || []).length }))
    Object.values(liveMarkers.current).forEach(m => map.removeLayer(m))
    liveMarkers.current = {}
    ;(data || []).forEach(loc => {
      const av = loc.profiles?.avatar_url
        ? `<img src="${loc.profiles.avatar_url}" style="width:100%;height:100%;object-fit:cover;border-radius:50%"/>`
        : `<span style="font-size:14px;font-weight:900;color:#fff">${(loc.profiles?.full_name || 'E')[0].toUpperCase()}</span>`
      const html = `
        <div style="display:flex;flex-direction:column;align-items:center;cursor:pointer">
          <div style="position:relative">
            <div style="width:42px;height:42px;border-radius:50%;border:3px solid #ff4560;overflow:hidden;background:linear-gradient(135deg,#ff4560,#ff8c69);display:flex;align-items:center;justify-content:center;box-shadow:0 0 0 6px rgba(255,69,96,0.2),0 0 20px rgba(255,69,96,0.5)">${av}</div>
            <div style="position:absolute;top:-2px;right:-2px;width:13px;height:13px;background:#ff4560;border-radius:50%;border:2px solid #fff;animation:livePulse 1s infinite"></div>
          </div>
          <div style="width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-top:8px solid #ff4560;margin-top:-1px"></div>
          <div style="background:rgba(255,69,96,0.9);border-radius:8px;padding:2px 7px;margin-top:3px;font-size:9px;color:#fff;font-weight:800">🔴 @${loc.profiles?.username || ''}</div>
        </div>`
      const icon = L.divIcon({ html, className: '', iconAnchor: [21, 64] })
      liveMarkers.current[loc.user_id] = L.marker([loc.lat, loc.lng], { icon }).addTo(map)
    })
  }

  const startLive = async () => {
    if (!user || !userPos) { alert('Location not found yet!'); return }
    const update = async () => {
      if (userPos) {
        await supabase.from('live_locations').upsert({
          user_id: user.id, lat: userPos[0], lng: userPos[1],
          live_mode: liveMode, updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' })
      }
    }
    await update()
    liveInterval.current = setInterval(update, 4000)
    setIsLive(true)
    setShowLivePicker(false)
  }

  const stopLive = async () => {
    clearInterval(liveInterval.current)
    await supabase.from('live_locations').delete().eq('user_id', user.id)
    setIsLive(false)
  }

  const changeMapStyle = (styleKey) => {
    const L = window.L
    const map = mapInstance.current
    if (!map || !L) return
    setMapStyle(styleKey)
    if (tileLayer.current) map.removeLayer(tileLayer.current)
    tileLayer.current = L.tileLayer(mapStyles[styleKey].url, { maxZoom: 19 }).addTo(map)
  }

  const centerOnMe = () => {
    if (mapInstance.current && userPos) {
      isDragging.current = false
      mapInstance.current.setView(userPos, 16, { animate: true })
    }
  }

  const getDistanceM = (lat1, lng1, lat2, lng2) => {
    const R = 6371000
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLng = (lng2 - lng1) * Math.PI / 180
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  }

  const transport = getTransport(speed)
  const transportLabel = { walk: '🚶 Walking', bike: '🚴 Cycling', moto: '🏍️ Riding', car: '🚗 Driving' }

  return (
    <div style={{ height: '100vh', background: '#1a2035', position: 'relative', overflow: 'hidden' }}>
      <style>{`
        @keyframes livePulse { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.6);opacity:0.5} }
        @keyframes bounce { from{transform:translateY(0)} to{transform:translateY(-4px)} }
        .leaflet-container { background: #e8e0d8 !important; }
        .leaflet-control-zoom a { background: rgba(10,15,26,0.92) !important; color: #00e5ff !important; border-color: rgba(0,229,255,0.2) !important; }
        .leaflet-control-zoom a:hover { background: rgba(0,229,255,0.15) !important; }
        .leaflet-tile-pane { transition: filter 0.5s; }
      `}</style>

      <div ref={mapRef} style={{ width: '100%', height: '100%' }} />

      {/* TOP BAR */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 500, padding: '12px 12px 0' }}>
        <div style={{ background: 'rgba(10,15,26,0.88)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '18px', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button onClick={() => window.history.back()} style={{ background: 'none', border: 'none', color: '#8892a4', fontSize: '20px', cursor: 'pointer' }}>←</button>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '14px', fontWeight: '900', background: 'linear-gradient(90deg,#00e5ff,#00ff88)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>⬡ Echo Map</div>
            {speed > 0.3 && <div style={{ fontSize: '10px', color: '#4a5568' }}>{transportLabel[transport]} · {(speed * 3.6).toFixed(1)} km/h</div>}
          </div>

          {isLive ? (
            <button onClick={stopLive} style={{ padding: '7px 12px', borderRadius: '20px', border: '1px solid rgba(255,69,96,0.5)', cursor: 'pointer', fontSize: '11px', fontWeight: '800', background: 'rgba(255,69,96,0.2)', color: '#ff4560', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#ff4560', display: 'inline-block', animation: 'livePulse 1s infinite' }} />
              Stop Live
            </button>
          ) : (
            <button onClick={() => setShowLivePicker(true)} style={{ padding: '7px 12px', borderRadius: '20px', border: '1px solid rgba(0,229,255,0.3)', cursor: 'pointer', fontSize: '11px', fontWeight: '800', background: 'rgba(0,229,255,0.12)', color: '#00e5ff' }}>
              📡 Go Live
            </button>
          )}

          <button onClick={() => setShowLegend(!showLegend)} style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '14px' }}>ℹ️</button>
        </div>
      </div>

      {/* MAP STYLE */}
      <div style={{ position: 'absolute', top: '78px', left: '12px', zIndex: 500 }}>
        <div style={{ background: 'rgba(10,15,26,0.88)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px', padding: '6px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {[
            { key: 'street', icon: '🗺' },
            { key: 'light', icon: '☀️' },
            { key: 'dark', icon: '🌙' },
            { key: 'hybrid', icon: '🛸' },
          ].map(s => (
            <button key={s.key} onClick={() => changeMapStyle(s.key)}
              style={{ width: '38px', height: '38px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontSize: '18px', background: mapStyle === s.key ? 'rgba(0,229,255,0.2)' : 'transparent', outline: mapStyle === s.key ? '2px solid #00e5ff' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {s.icon}
            </button>
          ))}
        </div>
      </div>

      {/* CENTER */}
      <div style={{ position: 'absolute', right: '12px', bottom: '200px', zIndex: 500 }}>
        <button onClick={centerOnMe} style={{ width: '46px', height: '46px', borderRadius: '50%', background: 'rgba(10,15,26,0.92)', backdropFilter: 'blur(16px)', border: '2px solid rgba(0,229,255,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '20px', boxShadow: '0 4px 20px rgba(0,229,255,0.3)' }}>🎯</button>
      </div>

      {/* STATS */}
      <div style={{ position: 'absolute', bottom: '90px', left: '12px', right: '12px', zIndex: 500 }}>
        <div style={{ background: 'rgba(10,15,26,0.9)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '18px', padding: '12px 16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '4px', textAlign: 'center' }}>
            {[
              { icon: '🗺', value: stats.zones, label: 'Zones', color: '#00e5ff' },
              { icon: '📍', value: `${stats.km}km`, label: 'Explored', color: '#00ff88' },
              { icon: '🔴', value: stats.live, label: 'Live', color: '#ff4560' },
              { icon: '📝', value: nearbyCount, label: 'Posts', color: '#ffca28' },
            ].map(s => (
              <div key={s.label} style={{ padding: '4px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)' }}>
                <div style={{ fontSize: '15px', marginBottom: '2px' }}>{s.icon}</div>
                <div style={{ fontSize: '14px', fontWeight: '900', color: s.color }}>{s.value}</div>
                <div style={{ fontSize: '9px', color: '#4a5568', fontWeight: '600' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* BOTTOM NAV */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(7,10,16,0.98)', borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'space-around', padding: '10px 0 20px', zIndex: 600 }}>
        {[
          { icon: '🏠', label: 'Home', path: '/feed' },
          { icon: '🗺', label: 'Map', path: '/map' },
          { icon: '📸', label: 'Post', path: '/post' },
          { icon: '🏆', label: 'Rank', path: '/leaderboard' },
          { icon: '👤', label: 'Profile', path: '/profile' }
        ].map(item => (
          <div key={item.label} onClick={() => window.location.href = item.path}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', cursor: 'pointer', color: item.path === '/map' ? '#00e5ff' : '#4a5568' }}>
            <span style={{ fontSize: '22px' }}>{item.icon}</span>
            <span style={{ fontSize: '10px', fontWeight: '600' }}>{item.label}</span>
          </div>
        ))}
      </div>

      {/* LIVE PICKER */}
      {showLivePicker && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'flex-end', zIndex: 1000 }} onClick={() => setShowLivePicker(false)}>
          <div style={{ background: '#111620', borderRadius: '24px 24px 0 0', width: '100%', padding: '24px' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: '16px', fontWeight: '900', color: '#eef2f7', marginBottom: '6px' }}>📡 Share Live Location</div>
            <div style={{ fontSize: '12px', color: '#4a5568', marginBottom: '20px' }}>Who can see your location?</div>
            {[
              { key: 'public', icon: '🌍', title: 'Everyone', sub: 'All Echo World users' },
              { key: 'followers', icon: '👥', title: 'Supporters Only', sub: 'People you support' },
              { key: 'private', icon: '🔒', title: 'Only Me', sub: 'Private mode' },
            ].map(opt => (
              <div key={opt.key} onClick={() => setLiveMode(opt.key)}
                style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px', borderRadius: '14px', marginBottom: '10px', border: `2px solid ${liveMode === opt.key ? '#00e5ff' : 'rgba(255,255,255,0.07)'}`, background: liveMode === opt.key ? 'rgba(0,229,255,0.08)' : 'rgba(255,255,255,0.02)', cursor: 'pointer' }}>
                <div style={{ fontSize: '28px' }}>{opt.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', fontWeight: '700', color: liveMode === opt.key ? '#00e5ff' : '#eef2f7' }}>{opt.title}</div>
                  <div style={{ fontSize: '11px', color: '#4a5568' }}>{opt.sub}</div>
                </div>
                {liveMode === opt.key && <div style={{ color: '#00e5ff', fontSize: '18px' }}>✓</div>}
              </div>
            ))}
            <button onClick={startLive} style={{ width: '100%', padding: '15px', background: 'linear-gradient(135deg,#ff4560,#ff6b35)', border: 'none', borderRadius: '14px', color: '#fff', fontSize: '15px', fontWeight: '800', cursor: 'pointer', marginTop: '8px' }}>
              🔴 Start Live
            </button>
            <button onClick={() => setShowLivePicker(false)} style={{ width: '100%', padding: '12px', background: 'transparent', border: 'none', color: '#4a5568', fontSize: '14px', cursor: 'pointer', marginTop: '6px' }}>Cancel</button>
          </div>
        </div>
      )}

      {/* LEGEND */}
      {showLegend && (
        <div style={{ position: 'absolute', top: '78px', right: '12px', zIndex: 500 }}>
          <div style={{ background: 'rgba(10,15,26,0.95)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '14px', width: '190px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ fontSize: '12px', fontWeight: '800', color: '#00e5ff' }}>Map Legend</div>
              <button onClick={() => setShowLegend(false)} style={{ background: 'none', border: 'none', color: '#4a5568', cursor: 'pointer', fontSize: '16px' }}>✕</button>
            </div>
            {[
              { emoji: '🚶', label: 'Walking (0-5 km/h)' },
              { emoji: '🚴', label: 'Cycling (5-21 km/h)' },
              { emoji: '🏍️', label: 'Riding (21-72 km/h)' },
              { emoji: '🚗', label: 'Driving (72+ km/h)' },
              { emoji: '🔴', label: 'Live Users' },
              { emoji: '📷', label: 'Photo Posts' },
              { emoji: '🎬', label: 'Video Posts' },
              { emoji: '📦', label: 'Time Capsules' },
              { emoji: '⭕', label: 'Explored Zone' },
            ].map(l => (
              <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '7px' }}>
                <span style={{ fontSize: '16px' }}>{l.emoji}</span>
                <span style={{ fontSize: '11px', color: '#8892a4' }}>{l.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* POST POPUP */}
      {selectedPost && (
        <div style={{ position: 'absolute', bottom: '160px', left: '12px', right: '12px', zIndex: 500 }}>
          <div style={{ background: 'rgba(10,15,26,0.97)', backdropFilter: 'blur(24px)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '20px', padding: '14px', display: 'flex', gap: '12px', alignItems: 'center' }}>
            {selectedPost.media_url && selectedPost.media_type === 'photo' && (
              <img src={selectedPost.media_url} style={{ width: '64px', height: '64px', borderRadius: '14px', objectFit: 'cover', flexShrink: 0 }} />
            )}
            {selectedPost.media_url && selectedPost.media_type === 'video' && (
              <video src={selectedPost.media_url} style={{ width: '64px', height: '64px', borderRadius: '14px', objectFit: 'cover', flexShrink: 0 }} muted playsInline />
            )}
            {!selectedPost.media_url && (
              <div style={{ width: '64px', height: '64px', borderRadius: '14px', background: 'rgba(0,229,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '30px', flexShrink: 0 }}>💬</div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '13px', fontWeight: '700', color: '#00e5ff', marginBottom: '4px' }}>@{selectedPost.profiles?.username}</div>
              <div style={{ fontSize: '12px', color: '#8892a4', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '8px' }}>{selectedPost.content || '(no caption)'}</div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => window.location.href = `/comments/${selectedPost.id}`}
                  style={{ flex: 1, padding: '8px', background: 'linear-gradient(135deg,#00e5ff,#00ff88)', border: 'none', borderRadius: '10px', color: '#070a10', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>
                  View Post →
                </button>
                <button onClick={() => setSelectedPost(null)}
                  style={{ padding: '8px 14px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#4a5568', fontSize: '12px', cursor: 'pointer' }}>✕</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
        }
