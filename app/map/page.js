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

  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [userPos, setUserPos] = useState(null)
  const [isLive, setIsLive] = useState(false)
  const [stats, setStats] = useState({ zones: 0, km: 0, live: 0 })
  const [selectedPost, setSelectedPost] = useState(null)
  const [mapStyle, setMapStyle] = useState('dark')
  const [showLegend, setShowLegend] = useState(false)
  const [nearbyCount, setNearbyCount] = useState(0)

  const mapStyles = {
    dark: 'https://{s}.basemaps.cartocdn.com/dark_matter/{z}/{x}/{y}{r}.png',
    night: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    street: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { window.location.href = '/'; return }
      const u = data.session.user
      setUser(u)
      const { data: p } = await supabase.from('profiles').select('*').eq('id', u.id).single()
      setProfile(p)
      initMap(u, p)
    })
    return () => {
      cancelAnimationFrame(walkerFrame.current)
      clearInterval(liveInterval.current)
    }
  }, [])

  const initMap = (u, p) => {
    if (mapInstance.current) return
    const L = window.L
    if (!L) {
      const script = document.createElement('script')
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
      script.onload = () => {
        const css = document.createElement('link')
        css.rel = 'stylesheet'
        css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
        document.head.appendChild(css)
        setTimeout(() => setupMap(u, p), 100)
      }
      document.head.appendChild(script)
    } else {
      setupMap(u, p)
    }
  }

  const setupMap = (u, p) => {
    const L = window.L
    if (!mapRef.current || mapInstance.current) return

    const map = L.map(mapRef.current, {
      zoomControl: false,
      attributionControl: false,
    }).setView([23.8103, 90.4125], 13)

    L.tileLayer(mapStyles.street, {
      maxZoom: 19,
      opacity: 0.9,
    }).addTo(map)

    // Custom zoom control
    L.control.zoom({ position: 'bottomright' }).addTo(map)

    mapInstance.current = map

    // Get location
    navigator.geolocation.watchPosition(
      pos => {
        const { latitude: lat, longitude: lng } = pos.coords
        const newPos = [lat, lng]

        if (!userPos) {
          map.setView(newPos, 16)
        }

        setUserPos(newPos)
        animateWalker(newPos, p)
        unlockZone(u.id, lat, lng)
        loadNearbyPosts(lat, lng)
        loadLiveUsers(lat, lng, u.id)
      },
      err => console.log(err),
      { enableHighAccuracy: true }
    )

    loadExploredZones(u.id, map)
  }

  const animateWalker = (newPos, p) => {
    const L = window.L
    const map = mapInstance.current
    if (!map) return

    if (!userMarker.current) {
      const avatarHtml = `
        <div style="position:relative;display:flex;flex-direction:column;align-items:center">
          <div style="width:46px;height:46px;border-radius:50%;border:3px solid #00e5ff;overflow:hidden;background:linear-gradient(135deg,#00e5ff,#00ff88);box-shadow:0 0 20px rgba(0,229,255,0.8),0 0 40px rgba(0,229,255,0.4);display:flex;align-items:center;justify-content:center">
            ${p?.avatar_url
              ? `<img src="${p.avatar_url}" style="width:100%;height:100%;object-fit:cover"/>`
              : `<span style="font-size:18px;font-weight:900;color:#070a10">${(p?.full_name||p?.username||'E')[0].toUpperCase()}</span>`
            }
          </div>
          <div style="width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:10px solid #00e5ff;margin-top:-2px;filter:drop-shadow(0 2px 4px rgba(0,229,255,0.5))"></div>
          <div style="background:rgba(0,229,255,0.15);backdrop-filter:blur(8px);border:1px solid rgba(0,229,255,0.4);border-radius:10px;padding:2px 8px;margin-top:2px;font-size:10px;color:#00e5ff;font-weight:700;white-space:nowrap">📍 You</div>
        </div>
      `
      const icon = L.divIcon({ html: avatarHtml, className: '', iconAnchor: [23, 56] })
      userMarker.current = L.marker(newPos, { icon, zIndexOffset: 1000 }).addTo(map)
    } else {
      const from = userMarker.current.getLatLng()
      const steps = 30
      let step = 0
      cancelAnimationFrame(walkerFrame.current)
      const animate = () => {
        const t = step / steps
        const lat = from.lat + (newPos[0] - from.lat) * t
        const lng = from.lng + (newPos[1] - from.lng) * t
        userMarker.current.setLatLng([lat, lng])
        step++
        if (step <= steps) walkerFrame.current = requestAnimationFrame(animate)
      }
      animate()
    }
  }

  const unlockZone = async (uid, lat, lng) => {
    const zoneKey = `${Math.round(lat * 100) / 100}_${Math.round(lng * 100) / 100}`
    const { error } = await supabase.from('explored_zones').upsert(
      { user_id: uid, zone_key: zoneKey, lat, lng },
      { onConflict: 'user_id,zone_key' }
    )
    if (!error) {
      const { count } = await supabase
        .from('explored_zones')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', uid)
      setStats(s => ({ ...s, zones: count || 0, km: Math.round((count || 0) * 0.25 * 10) / 10 }))
    }
  }

  const loadExploredZones = async (uid, map) => {
    const L = window.L
    const { data } = await supabase.from('explored_zones').select('*').eq('user_id', uid)
    if (!data?.length) return

    // Light fog — less dark
    const fogPane = map.createPane('fog')
    fogPane.style.zIndex = 450
    fogPane.style.pointerEvents = 'none'

    const bounds = map.getBounds().pad(2)
    const outerCoords = [
      [bounds.getNorth(), bounds.getWest()],
      [bounds.getNorth(), bounds.getEast()],
      [bounds.getSouth(), bounds.getEast()],
      [bounds.getSouth(), bounds.getWest()],
    ]

    const holes = data.map(zone => {
      const r = 0.006
      const pts = []
      for (let i = 0; i < 32; i++) {
        const angle = (i / 32) * 2 * Math.PI
        pts.push([zone.lat + Math.sin(angle) * r, zone.lng + Math.cos(angle) * r])
      }
      return pts
    })

    fogLayer.current = L.polygon([outerCoords, ...holes], {
      color: 'transparent',
      fillColor: '#0a0f1a',
      fillOpacity: 0.55,
      pane: 'fog',
    }).addTo(map)

    // Glow for explored zones
    data.forEach(zone => {
      L.circle([zone.lat, zone.lng], {
        radius: 400,
        color: 'rgba(0,229,255,0.15)',
        fillColor: 'rgba(0,229,255,0.04)',
        fillOpacity: 1,
        weight: 1,
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
      .limit(30)

    setNearbyCount((data || []).length)

    ;(data || []).forEach(post => {
      const colors = {
        video: '#ffa500',
        photo: '#00e5ff',
        capsule: '#ffca28',
        text: '#00ff88',
      }
      const color = colors[post.media_type] || '#00e5ff'
      const icons = { video: '🎬', photo: '📷', capsule: '📦', text: '💬' }
      const icon = icons[post.media_type] || '📝'

      const markerHtml = `
        <div style="display:flex;flex-direction:column;align-items:center;cursor:pointer">
          <div style="width:40px;height:40px;border-radius:50%;background:${color}22;border:2px solid ${color};display:flex;align-items:center;justify-content:center;font-size:18px;box-shadow:0 0 12px ${color}66">
            ${icon}
          </div>
          <div style="width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-top:8px solid ${color}"></div>
        </div>
      `
      const markerIcon = L.divIcon({ html: markerHtml, className: '', iconAnchor: [20, 48] })
      const marker = L.marker([post.latitude, post.longitude], { icon: markerIcon }).addTo(map)

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
      const html = `
        <div style="display:flex;flex-direction:column;align-items:center">
          <div style="position:relative">
            <div style="width:42px;height:42px;border-radius:50%;border:3px solid #ff4560;overflow:hidden;background:linear-gradient(135deg,#ff4560,#ff6b35);display:flex;align-items:center;justify-content:center;box-shadow:0 0 16px rgba(255,69,96,0.6)">
              ${loc.profiles?.avatar_url
                ? `<img src="${loc.profiles.avatar_url}" style="width:100%;height:100%;object-fit:cover"/>`
                : `<span style="font-size:16px;font-weight:900;color:#fff">${(loc.profiles?.full_name||'E')[0].toUpperCase()}</span>`
              }
            </div>
            <div style="position:absolute;top:-4px;right:-4px;width:12px;height:12px;background:#ff4560;border-radius:50%;border:2px solid #fff;animation:pulse 1s infinite"></div>
          </div>
          <div style="background:rgba(255,69,96,0.15);border:1px solid rgba(255,69,96,0.4);border-radius:8px;padding:2px 6px;margin-top:2px;font-size:9px;color:#ff4560;font-weight:700">🔴 LIVE</div>
        </div>
      `
      const icon = L.divIcon({ html, className: '', iconAnchor: [21, 54] })
      liveMarkers.current[loc.user_id] = L.marker([loc.lat, loc.lng], { icon }).addTo(map)
    })
  }

  const toggleLive = async () => {
    if (!user || !userPos) return
    if (isLive) {
      clearInterval(liveInterval.current)
      await supabase.from('live_locations').delete().eq('user_id', user.id)
      setIsLive(false)
    } else {
      const updateLoc = async () => {
        if (userPos) {
          await supabase.from('live_locations').upsert({
            user_id: user.id, lat: userPos[0], lng: userPos[1], updated_at: new Date().toISOString()
          }, { onConflict: 'user_id' })
        }
      }
      await updateLoc()
      liveInterval.current = setInterval(updateLoc, 5000)
      setIsLive(true)
    }
  }

  const changeMapStyle = (style) => {
    const L = window.L
    const map = mapInstance.current
    if (!map || !L) return
    setMapStyle(style)
    map.eachLayer(layer => {
      if (layer._url) map.removeLayer(layer)
    })
    L.tileLayer(mapStyles[style], { maxZoom: 19, opacity: 0.92 }).addTo(map)
  }

  const centerOnMe = () => {
    if (mapInstance.current && userPos) {
      mapInstance.current.setView(userPos, 16)
    }
  }

  const getDistance = (lat1, lng1, lat2, lng2) => {
    const R = 6371
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLng = (lng2 - lng1) * Math.PI / 180
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  }

  return (
    <div style={{ height: '100vh', background: '#0a0f1a', position: 'relative', overflow: 'hidden' }}>

      <style>{`
        @keyframes pulse { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.4);opacity:0.7} }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        .leaflet-container { background: #1a2035 !important; }
      `}</style>

      {/* MAP */}
      <div ref={mapRef} style={{ width: '100%', height: '100%' }} />

      {/* TOP BAR */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 500, padding: '12px' }}>
        <div style={{ background: 'rgba(10,15,26,0.85)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button onClick={() => window.history.back()} style={{ background: 'none', border: 'none', color: '#8892a4', fontSize: '20px', cursor: 'pointer', flexShrink: 0 }}>←</button>
          <div style={{ fontSize: '15px', fontWeight: '800', background: 'linear-gradient(90deg,#00e5ff,#00ff88)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', flex: 1 }}>🗺 Echo Map</div>

          {/* Live button */}
          <button onClick={toggleLive}
            style={{ padding: '6px 12px', borderRadius: '20px', border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: '700', background: isLive ? 'rgba(255,69,96,0.2)' : 'rgba(0,229,255,0.15)', color: isLive ? '#ff4560' : '#00e5ff', border: `1px solid ${isLive ? 'rgba(255,69,96,0.4)' : 'rgba(0,229,255,0.3)'}`, display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: isLive ? '#ff4560' : '#00e5ff', display: 'inline-block', animation: isLive ? 'pulse 1s infinite' : 'none' }} />
            {isLive ? 'LIVE' : 'Go Live'}
          </button>

          <button onClick={() => setShowLegend(!showLegend)}
            style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '14px' }}>
            ℹ️
          </button>
        </div>
      </div>

      {/* MAP STYLE SWITCHER */}
      <div style={{ position: 'absolute', top: '76px', left: '12px', zIndex: 500 }}>
        <div style={{ background: 'rgba(10,15,26,0.85)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '6px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {[
            { key: 'street', icon: '🗺', label: 'Street' },
            { key: 'dark', icon: '🌙', label: 'Dark' },
            { key: 'satellite', icon: '🛸', label: 'Satellite' },
          ].map(s => (
            <button key={s.key} onClick={() => changeMapStyle(s.key)}
              title={s.label}
              style={{ width: '36px', height: '36px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '16px', background: mapStyle === s.key ? 'rgba(0,229,255,0.2)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', outline: mapStyle === s.key ? '2px solid #00e5ff' : 'none' }}>
              {s.icon}
            </button>
          ))}
        </div>
      </div>

      {/* CENTER ON ME */}
      <div style={{ position: 'absolute', right: '12px', bottom: '180px', zIndex: 500 }}>
        <button onClick={centerOnMe}
          style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'rgba(10,15,26,0.9)', backdropFilter: 'blur(16px)', border: '2px solid rgba(0,229,255,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '20px', boxShadow: '0 4px 16px rgba(0,229,255,0.3)' }}>
          🎯
        </button>
      </div>

      {/* STATS BAR */}
      <div style={{ position: 'absolute', bottom: '90px', left: '12px', right: '12px', zIndex: 500 }}>
        <div style={{ background: 'rgba(10,15,26,0.88)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '12px 16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '8px', textAlign: 'center' }}>
            {[
              { icon: '🗺', value: stats.zones, label: 'Zones' },
              { icon: '📍', value: `${stats.km}km`, label: 'Explored' },
              { icon: '🔴', value: stats.live, label: 'Live' },
              { icon: '📝', value: nearbyCount, label: 'Nearby' },
            ].map(s => (
              <div key={s.label}>
                <div style={{ fontSize: '16px', marginBottom: '2px' }}>{s.icon}</div>
                <div style={{ fontSize: '14px', fontWeight: '900', color: '#00e5ff' }}>{s.value}</div>
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

      {/* LEGEND */}
      {showLegend && (
        <div style={{ position: 'absolute', top: '76px', right: '12px', zIndex: 500 }}>
          <div style={{ background: 'rgba(10,15,26,0.95)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '14px', width: '180px' }}>
            <div style={{ fontSize: '12px', fontWeight: '800', color: '#00e5ff', marginBottom: '10px' }}>Map Legend</div>
            {[
              { color: '#00e5ff', icon: '📍', label: 'You' },
              { color: '#ff4560', icon: '🔴', label: 'Live Users' },
              { color: '#ffa500', icon: '🎬', label: 'Videos' },
              { color: '#00e5ff', icon: '📷', label: 'Photos' },
              { color: '#ffca28', icon: '📦', label: 'Capsules' },
              { color: '#00ff88', icon: '💬', label: 'Text Posts' },
            ].map(l => (
              <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <span style={{ fontSize: '16px' }}>{l.icon}</span>
                <span style={{ fontSize: '12px', color: '#8892a4' }}>{l.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* POST POPUP */}
      {selectedPost && (
        <div style={{ position: 'absolute', bottom: '160px', left: '12px', right: '12px', zIndex: 500 }}>
          <div style={{ background: 'rgba(10,15,26,0.96)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', padding: '14px', display: 'flex', gap: '12px', alignItems: 'center' }}>
            {selectedPost.media_url && selectedPost.media_type === 'photo' && (
              <img src={selectedPost.media_url} style={{ width: '60px', height: '60px', borderRadius: '12px', objectFit: 'cover', flexShrink: 0 }} />
            )}
            {selectedPost.media_url && selectedPost.media_type === 'video' && (
              <video src={selectedPost.media_url} style={{ width: '60px', height: '60px', borderRadius: '12px', objectFit: 'cover', flexShrink: 0 }} muted playsInline />
            )}
            {!selectedPost.media_url && (
              <div style={{ width: '60px', height: '60px', borderRadius: '12px', background: 'rgba(0,229,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', flexShrink: 0 }}>💬</div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '12px', fontWeight: '700', color: '#00e5ff', marginBottom: '3px' }}>@{selectedPost.profiles?.username}</div>
              <div style={{ fontSize: '12px', color: '#8892a4', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '6px' }}>{selectedPost.content || '(no caption)'}</div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => window.location.href = `/comments/${selectedPost.id}`}
                  style={{ flex: 1, padding: '7px', background: 'linear-gradient(135deg,#00e5ff,#00ff88)', border: 'none', borderRadius: '10px', color: '#070a10', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>
                  View Post
                </button>
                <button onClick={() => setSelectedPost(null)}
                  style={{ padding: '7px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#4a5568', fontSize: '12px', cursor: 'pointer' }}>
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
