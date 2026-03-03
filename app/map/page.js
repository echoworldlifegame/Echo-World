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
  const lastCenter = useRef(null)
  const userMoving = useRef(false)

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
  const [followers, setFollowers] = useState([])
  const [autoCenter, setAutoCenter] = useState(false)
  const [mapReady, setMapReady] = useState(false)

  const mapStyles = {
    street: {
      url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
      label: '🗺 Street',
      filter: 'none',
    },
    light: {
      url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
      label: '☀️ Light',
      filter: 'none',
    },
    dark: {
      url: 'https://{s}.basemaps.cartocdn.com/dark_matter_lite/{z}/{x}/{y}{r}.png',
      label: '🌙 Dark',
      filter: 'brightness(1.4) contrast(0.9)',
    },
    satellite: {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
      label: '🛸 Hybrid',
      filter: 'none',
    },
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { window.location.href = '/'; return }
      const u = data.session.user
      setUser(u)
      const { data: p } = await supabase.from('profiles').select('*').eq('id', u.id).single()
      setProfile(p)

      // Load followers
      const { data: fol } = await supabase
        .from('followers')
        .select('profiles!followers_following_id_fkey(id, username, full_name, avatar_url)')
        .eq('follower_id', u.id)
      setFollowers((fol || []).map(f => f.profiles).filter(Boolean))

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
    }).setView([23.8103, 90.4125], 13)

    // Tile layer
    tileLayer.current = L.tileLayer(mapStyles.street.url, {
      maxZoom: 19,
      opacity: 1,
    }).addTo(map)

    // Apply css filter
    setTimeout(() => {
      const tiles = document.querySelector('.leaflet-tile-pane')
      if (tiles) tiles.style.filter = mapStyles.street.filter
    }, 500)

    L.control.zoom({ position: 'bottomright' }).addTo(map)

    // Detect user interaction — disable auto center
    map.on('dragstart', () => { userMoving.current = true })
    map.on('zoomstart', () => { userMoving.current = true })

    mapInstance.current = map
    setMapReady(true)

    // Geolocation
    navigator.geolocation.watchPosition(
      pos => {
        const { latitude: lat, longitude: lng } = pos.coords
        const newPos = [lat, lng]
        setUserPos(newPos)

        // Only center map on FIRST location
        if (!lastCenter.current) {
          map.setView(newPos, 16)
          lastCenter.current = newPos
        }

        animateWalker(newPos, p)
        unlockZone(u.id, lat, lng)
        loadNearbyPosts(lat, lng)
        loadLiveUsers(lat, lng, u.id)
      },
      err => console.log(err),
      { enableHighAccuracy: true, maximumAge: 3000 }
    )

    loadExploredZones(u.id, map)
  }

  const animateWalker = (newPos, p) => {
    const L = window.L
    const map = mapInstance.current
    if (!map || !L) return

    const avatarContent = p?.avatar_url
      ? `<img src="${p.avatar_url}" style="width:100%;height:100%;object-fit:cover;border-radius:50%"/>`
      : `<span style="font-size:18px;font-weight:900;color:#070a10">${(p?.full_name || p?.username || 'E')[0].toUpperCase()}</span>`

    const html = `
      <div style="display:flex;flex-direction:column;align-items:center;filter:drop-shadow(0 4px 12px rgba(0,229,255,0.6))">
        <div style="width:46px;height:46px;border-radius:50%;border:3px solid #00e5ff;overflow:hidden;background:linear-gradient(135deg,#00e5ff,#00ff88);display:flex;align-items:center;justify-content:center;box-shadow:0 0 0 6px rgba(0,229,255,0.15)">
          ${avatarContent}
        </div>
        <div style="width:0;height:0;border-left:7px solid transparent;border-right:7px solid transparent;border-top:12px solid #00e5ff;margin-top:-1px"></div>
        <div style="background:rgba(0,229,255,0.9);border-radius:8px;padding:2px 8px;margin-top:3px;font-size:10px;color:#070a10;font-weight:800;white-space:nowrap">📍 You</div>
      </div>
    `

    if (!userMarker.current) {
      const icon = L.divIcon({ html, className: '', iconAnchor: [23, 62] })
      userMarker.current = L.marker(newPos, { icon, zIndexOffset: 1000 }).addTo(map)
    } else {
      const from = userMarker.current.getLatLng()
      const steps = 40
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

      // Auto center only if enabled
      if (autoCenter && !userMoving.current) {
        map.panTo(newPos, { animate: true, duration: 1 })
      }
    }
  }

  const unlockZone = async (uid, lat, lng) => {
    const zoneKey = `${Math.round(lat * 100) / 100}_${Math.round(lng * 100) / 100}`
    await supabase.from('explored_zones').upsert(
      { user_id: uid, zone_key: zoneKey, lat, lng },
      { onConflict: 'user_id,zone_key' }
    )
    const { count } = await supabase
      .from('explored_zones')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', uid)
    setStats(s => ({ ...s, zones: count || 0, km: Math.round((count || 0) * 0.25 * 10) / 10 }))
  }

  const loadExploredZones = async (uid, map) => {
    const L = window.L
    const { data } = await supabase.from('explored_zones').select('*').eq('user_id', uid)
    if (!data?.length) return

    const fogPane = map.createPane('fog')
    fogPane.style.zIndex = 450
    fogPane.style.pointerEvents = 'none'

    const bounds = [[-90, -180], [-90, 180], [90, 180], [90, -180]]
    const holes = data.map(zone => {
      const r = 0.007
      const pts = []
      for (let i = 0; i < 36; i++) {
        const angle = (i / 36) * 2 * Math.PI
        pts.push([zone.lat + Math.sin(angle) * r, zone.lng + Math.cos(angle) * r])
      }
      return pts
    })

    fogLayer.current = L.polygon([bounds, ...holes], {
      color: 'transparent',
      fillColor: '#070a10',
      fillOpacity: 0.45,
      pane: 'fog',
    }).addTo(map)

    // Soft glow for explored zones
    data.forEach(zone => {
      L.circle([zone.lat, zone.lng], {
        radius: 500,
        color: 'rgba(0,229,255,0.12)',
        fillColor: 'rgba(0,229,255,0.03)',
        fillOpacity: 1,
        weight: 1.5,
        dashArray: '4,4',
      }).addTo(map)
    })
  }

  const loadNearbyPosts = async (lat, lng) => {
    const L = window.L
    const map = mapInstance.current
    if (!map || !L) return

    postMarkers.current.forEach(m => map.removeLayer(m))
    postMarkers.current = []

    const { data } = await supabase
      .from('posts')
      .select('*, profiles(username, full_name, avatar_url)')
      .not('latitude', 'is', null)
      .limit(40)

    setNearbyCount((data || []).length)

    const typeConfig = {
      video: { color: '#ffa500', emoji: '🎬' },
      photo: { color: '#00e5ff', emoji: '📷' },
      capsule: { color: '#ffca28', emoji: '📦' },
      text: { color: '#00ff88', emoji: '💬' },
    }

    ;(data || []).forEach(post => {
      const cfg = typeConfig[post.media_type] || typeConfig.text
      const html = `
        <div style="display:flex;flex-direction:column;align-items:center;cursor:pointer;transition:transform 0.2s">
          <div style="width:42px;height:42px;border-radius:50%;background:${cfg.color}18;border:2.5px solid ${cfg.color};display:flex;align-items:center;justify-content:center;font-size:18px;box-shadow:0 0 14px ${cfg.color}55;backdrop-filter:blur(4px)">
            ${cfg.emoji}
          </div>
          <div style="width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-top:8px solid ${cfg.color};margin-top:-1px"></div>
        </div>
      `
      const icon = L.divIcon({ html, className: '', iconAnchor: [21, 50] })
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
      .from('live_locations')
      .select('*, profiles(id, username, full_name, avatar_url)')
      .neq('user_id', uid)
      .gte('updated_at', fiveMinAgo)

    setStats(s => ({ ...s, live: (data || []).length }))

    Object.values(liveMarkers.current).forEach(m => map.removeLayer(m))
    liveMarkers.current = {}

    ;(data || []).forEach(loc => {
      const avatarContent = loc.profiles?.avatar_url
        ? `<img src="${loc.profiles.avatar_url}" style="width:100%;height:100%;object-fit:cover;border-radius:50%"/>`
        : `<span style="font-size:16px;font-weight:900;color:#fff">${(loc.profiles?.full_name || 'E')[0].toUpperCase()}</span>`

      const html = `
        <div style="display:flex;flex-direction:column;align-items:center;cursor:pointer">
          <div style="position:relative">
            <div style="width:44px;height:44px;border-radius:50%;border:3px solid #ff4560;overflow:hidden;background:linear-gradient(135deg,#ff4560,#ff8c69);display:flex;align-items:center;justify-content:center;box-shadow:0 0 0 6px rgba(255,69,96,0.2),0 0 20px rgba(255,69,96,0.5)">
              ${avatarContent}
            </div>
            <div style="position:absolute;top:-2px;right:-2px;width:14px;height:14px;background:#ff4560;border-radius:50%;border:2px solid #fff;animation:livePulse 1s infinite"></div>
          </div>
          <div style="width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-top:8px solid #ff4560;margin-top:-1px"></div>
          <div style="background:rgba(255,69,96,0.85);border-radius:8px;padding:2px 6px;margin-top:3px;font-size:9px;color:#fff;font-weight:800">🔴 LIVE · @${loc.profiles?.username || ''}</div>
        </div>
      `
      const icon = L.divIcon({ html, className: '', iconAnchor: [22, 64] })
      liveMarkers.current[loc.user_id] = L.marker([loc.lat, loc.lng], { icon }).addTo(map)
    })
  }

  const startLive = async () => {
    if (!user || !userPos) { alert('Location not found yet!'); return }
    const updateLoc = async () => {
      if (userPos) {
        await supabase.from('live_locations').upsert({
          user_id: user.id,
          lat: userPos[0],
          lng: userPos[1],
          live_mode: liveMode,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' })
      }
    }
    await updateLoc()
    liveInterval.current = setInterval(updateLoc, 5000)
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
    tileLayer.current = L.tileLayer(mapStyles[styleKey].url, { maxZoom: 19, opacity: 1 }).addTo(map)
    setTimeout(() => {
      const tiles = document.querySelector('.leaflet-tile-pane')
      if (tiles) tiles.style.filter = mapStyles[styleKey].filter || 'none'
    }, 300)
  }

  const centerOnMe = () => {
    if (mapInstance.current && userPos) {
      userMoving.current = false
      mapInstance.current.setView(userPos, 16, { animate: true })
    }
  }

  return (
    <div style={{ height: '100vh', background: '#1a2035', position: 'relative', overflow: 'hidden' }}>
      <style>{`
        @keyframes livePulse { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.5);opacity:0.6} }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        .leaflet-container { background: #e8e0d8 !important; }
        .leaflet-control-zoom a { background: rgba(10,15,26,0.9) !important; color: #00e5ff !important; border-color: rgba(0,229,255,0.2) !important; backdrop-filter: blur(8px); }
        .leaflet-control-zoom a:hover { background: rgba(0,229,255,0.2) !important; }
      `}</style>

      {/* MAP */}
      <div ref={mapRef} style={{ width: '100%', height: '100%' }} />

      {/* TOP BAR */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 500, padding: '12px 12px 0' }}>
        <div style={{ background: 'rgba(10,15,26,0.88)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '18px', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '10px', boxShadow: '0 4px 24px rgba(0,0,0,0.3)' }}>
          <button onClick={() => window.history.back()} style={{ background: 'none', border: 'none', color: '#8892a4', fontSize: '20px', cursor: 'pointer', flexShrink: 0 }}>←</button>
          <div style={{ fontSize: '15px', fontWeight: '900', background: 'linear-gradient(90deg,#00e5ff,#00ff88)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', flex: 1 }}>⬡ Echo Map</div>

          {/* Auto center toggle */}
          <button onClick={() => { setAutoCenter(!autoCenter); userMoving.current = false }}
            title="Auto follow location"
            style={{ width: '32px', height: '32px', borderRadius: '50%', border: 'none', cursor: 'pointer', fontSize: '14px', background: autoCenter ? 'rgba(0,229,255,0.2)' : 'rgba(255,255,255,0.08)', outline: autoCenter ? '2px solid #00e5ff' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            🧭
          </button>

          {/* Live button */}
          {isLive ? (
            <button onClick={stopLive}
              style={{ padding: '7px 14px', borderRadius: '20px', border: '1px solid rgba(255,69,96,0.5)', cursor: 'pointer', fontSize: '11px', fontWeight: '800', background: 'rgba(255,69,96,0.2)', color: '#ff4560', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#ff4560', display: 'inline-block', animation: 'livePulse 1s infinite' }} />
              Stop Live
            </button>
          ) : (
            <button onClick={() => setShowLivePicker(true)}
              style={{ padding: '7px 14px', borderRadius: '20px', border: '1px solid rgba(0,229,255,0.3)', cursor: 'pointer', fontSize: '11px', fontWeight: '800', background: 'rgba(0,229,255,0.12)', color: '#00e5ff', display: 'flex', alignItems: 'center', gap: '5px' }}>
              📡 Go Live
            </button>
          )}

          <button onClick={() => setShowLegend(!showLegend)}
            style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '14px' }}>
            ℹ️
          </button>
        </div>
      </div>

      {/* MAP STYLE SWITCHER */}
      <div style={{ position: 'absolute', top: '78px', left: '12px', zIndex: 500 }}>
        <div style={{ background: 'rgba(10,15,26,0.88)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px', padding: '6px', display: 'flex', flexDirection: 'column', gap: '4px', boxShadow: '0 4px 16px rgba(0,0,0,0.3)' }}>
          {Object.entries(mapStyles).map(([key, style]) => (
            <button key={key} onClick={() => changeMapStyle(key)} title={style.label}
              style={{ width: '38px', height: '38px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontSize: '17px', background: mapStyle === key ? 'rgba(0,229,255,0.2)' : 'transparent', outline: mapStyle === key ? '2px solid #00e5ff' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
              {style.label.split(' ')[0]}
            </button>
          ))}
        </div>
      </div>

      {/* CENTER ON ME */}
      <div style={{ position: 'absolute', right: '12px', bottom: '200px', zIndex: 500 }}>
        <button onClick={centerOnMe}
          style={{ width: '46px', height: '46px', borderRadius: '50%', background: 'rgba(10,15,26,0.9)', backdropFilter: 'blur(16px)', border: '2px solid rgba(0,229,255,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '20px', boxShadow: '0 4px 20px rgba(0,229,255,0.35)', transition: 'all 0.2s' }}>
          🎯
        </button>
      </div>

      {/* STATS BAR */}
      <div style={{ position: 'absolute', bottom: '90px', left: '12px', right: '12px', zIndex: 500 }}>
        <div style={{ background: 'rgba(10,15,26,0.9)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '18px', padding: '12px 16px', boxShadow: '0 -4px 24px rgba(0,0,0,0.3)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '4px', textAlign: 'center' }}>
            {[
              { icon: '🗺', value: stats.zones, label: 'Zones', color: '#00e5ff' },
              { icon: '📍', value: `${stats.km}km`, label: 'Explored', color: '#00ff88' },
              { icon: '🔴', value: stats.live, label: 'Live', color: '#ff4560' },
              { icon: '📝', value: nearbyCount, label: 'Nearby', color: '#ffca28' },
            ].map(s => (
              <div key={s.label} style={{ padding: '4px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)' }}>
                <div style={{ fontSize: '16px', marginBottom: '2px' }}>{s.icon}</div>
                <div style={{ fontSize: '15px', fontWeight: '900', color: s.color }}>{s.value}</div>
                <div style={{ fontSize: '9px', color: '#4a5568', fontWeight: '600', letterSpacing: '0.5px' }}>{s.label}</div>
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

      {/* LIVE PICKER MODAL */}
      {showLivePicker && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'flex-end', zIndex: 1000 }} onClick={() => setShowLivePicker(false)}>
          <div style={{ background: '#111620', borderRadius: '24px 24px 0 0', width: '100%', padding: '24px', boxShadow: '0 -8px 40px rgba(0,0,0,0.5)' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: '16px', fontWeight: '900', marginBottom: '6px', color: '#eef2f7' }}>📡 Share Live Location</div>
            <div style={{ fontSize: '12px', color: '#4a5568', marginBottom: '20px' }}>Choose who can see your location</div>

            {[
              { key: 'public', icon: '🌍', title: 'Everyone', sub: 'All Echo World users can see you' },
              { key: 'followers', icon: '👥', title: 'Supporters Only', sub: 'Only people you support' },
              { key: 'private', icon: '🔒', title: 'Private', sub: 'Only you can see (test mode)' },
            ].map(opt => (
              <div key={opt.key} onClick={() => setLiveMode(opt.key)}
                style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px', borderRadius: '14px', marginBottom: '10px', border: `2px solid ${liveMode === opt.key ? '#00e5ff' : 'rgba(255,255,255,0.07)'}`, background: liveMode === opt.key ? 'rgba(0,229,255,0.08)' : 'rgba(255,255,255,0.02)', cursor: 'pointer', transition: 'all 0.2s' }}>
                <div style={{ fontSize: '28px' }}>{opt.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', fontWeight: '700', color: liveMode === opt.key ? '#00e5ff' : '#eef2f7' }}>{opt.title}</div>
                  <div style={{ fontSize: '11px', color: '#4a5568' }}>{opt.sub}</div>
                </div>
                {liveMode === opt.key && <div style={{ fontSize: '18px' }}>✓</div>}
              </div>
            ))}

            <button onClick={startLive}
              style={{ width: '100%', padding: '15px', background: 'linear-gradient(135deg,#ff4560,#ff6b35)', border: 'none', borderRadius: '14px', color: '#fff', fontSize: '15px', fontWeight: '800', cursor: 'pointer', marginTop: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              🔴 Start Live Location
            </button>
            <button onClick={() => setShowLivePicker(false)}
              style={{ width: '100%', padding: '13px', background: 'transparent', border: 'none', color: '#4a5568', fontSize: '14px', cursor: 'pointer', marginTop: '8px' }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* LEGEND */}
      {showLegend && (
        <div style={{ position: 'absolute', top: '78px', right: '12px', zIndex: 500 }}>
          <div style={{ background: 'rgba(10,15,26,0.95)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '14px', width: '190px', boxShadow: '0 4px 24px rgba(0,0,0,0.4)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ fontSize: '12px', fontWeight: '800', color: '#00e5ff' }}>Map Legend</div>
              <button onClick={() => setShowLegend(false)} style={{ background: 'none', border: 'none', color: '#4a5568', cursor: 'pointer', fontSize: '16px' }}>✕</button>
            </div>
            {[
              { color: '#00e5ff', emoji: '📍', label: 'Your Location' },
              { color: '#ff4560', emoji: '🔴', label: 'Live Users' },
              { color: '#ffa500', emoji: '🎬', label: 'Video Posts' },
              { color: '#00e5ff', emoji: '📷', label: 'Photo Posts' },
              { color: '#ffca28', emoji: '📦', label: 'Time Capsules' },
              { color: '#00ff88', emoji: '💬', label: 'Text Posts' },
              { color: 'rgba(0,229,255,0.5)', emoji: '⭕', label: 'Explored Zone' },
            ].map(l => (
              <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <span style={{ fontSize: '16px' }}>{l.emoji}</span>
                <span style={{ fontSize: '12px', color: '#8892a4' }}>{l.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* POST POPUP */}
      {selectedPost && (
        <div style={{ position: 'absolute', bottom: '160px', left: '12px', right: '12px', zIndex: 500 }}>
          <div style={{ background: 'rgba(10,15,26,0.97)', backdropFilter: 'blur(24px)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '20px', padding: '14px', display: 'flex', gap: '12px', alignItems: 'center', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                <div style={{ fontSize: '13px', fontWeight: '700', color: '#00e5ff' }}>@{selectedPost.profiles?.username}</div>
                <div style={{ fontSize: '10px', background: 'rgba(0,229,255,0.1)', color: '#00e5ff', borderRadius: '6px', padding: '1px 6px' }}>{selectedPost.media_type}</div>
              </div>
              <div style={{ fontSize: '12px', color: '#8892a4', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '8px' }}>{selectedPost.content || '(no caption)'}</div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => window.location.href = `/comments/${selectedPost.id}`}
                  style={{ flex: 1, padding: '8px', background: 'linear-gradient(135deg,#00e5ff,#00ff88)', border: 'none', borderRadius: '10px', color: '#070a10', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>
                  View Post →
                </button>
                <button onClick={() => setSelectedPost(null)}
                  style={{ padding: '8px 14px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#4a5568', fontSize: '12px', cursor: 'pointer' }}>
                  ✕
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
                                                                 }
