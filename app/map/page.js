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
  const postMarkers = useRef([])
  
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [userPos, setUserPos] = useState([23.8103, 90.4125]) // Default: Dhaka
  const [loading, setLoading] = useState(true)
  const [nearbyPosts, setNearbyPosts] = useState([])
  const [selectedPost, setSelectedPost] = useState(null)

  useEffect(() => {
    // Leaflet লাইব্রেরি ডাইনামিক লোড করা
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
    document.head.appendChild(link)

    const script = document.createElement('script')
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
    script.async = true
    script.onload = () => initMap()
    document.head.appendChild(script)

    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { window.location.href = '/'; return }
      setUser(data.session.user)
      const { data: p } = await supabase.from('profiles').select('*').eq('id', data.session.user.id).single()
      setProfile(p)
      
      // ইউজারের লোকেশন নেওয়া
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((pos) => {
          const newPos = [pos.coords.latitude, pos.coords.longitude]
          setUserPos(newPos)
          if (mapInstance.current) {
            mapInstance.current.setView(newPos, 15)
          }
        })
      }
      loadNearbyPosts()
    })

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove()
        mapInstance.current = null
      }
    }
  }, [])

  const initMap = () => {
    if (typeof window !== 'undefined' && window.L && mapRef.current && !mapInstance.current) {
      mapInstance.current = window.L.map(mapRef.current, {
        zoomControl: false,
        attributionControl: false
      }).setView(userPos, 13)

      window.L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19
      }).addTo(mapInstance.current)

      // ইউজার মার্কার
      const userIcon = window.L.divIcon({
        className: 'user-marker',
        html: `<div style="width:15px;height:15px;background:#00e5ff;border:3px solid #fff;border-radius:50%;box-shadow:0 0 15px #00e5ff;"></div>`
      })
      userMarker.current = window.L.marker(userPos, { icon: userIcon }).addTo(mapInstance.current)
    }
  }

  const loadNearbyPosts = async () => {
    const { data } = await supabase.from('posts').select('*, profiles(username, avatar_url)').not('latitude', 'is', null)
    setNearbyPosts(data || [])
    
    if (window.L && mapInstance.current) {
      data?.forEach(post => {
        const marker = window.L.marker([post.latitude, post.longitude], {
          icon: window.L.divIcon({
            className: 'post-marker',
            html: `<div style="font-size:24px;filter:drop-shadow(0 0 5px rgba(0,0,0,0.5))">📍</div>`
          })
        }).addTo(mapInstance.current)
        
        marker.on('click', () => setSelectedPost(post))
        postMarkers.current.push(marker)
      })
    }
    setLoading(false)
  }

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#070a10', position: 'relative', overflow: 'hidden' }}>
      {/* ম্যাপ কন্টেইনার */}
      <div ref={mapRef} style={{ width: '100%', height: '100%', zIndex: 1 }} />

      {/* সার্চ ও হেডার */}
      <div style={{ position: 'absolute', top: '20px', left: '20px', right: '20px', zIndex: 10, display: 'flex', gap: '10px' }}>
        <button onClick={() => window.location.href = '/feed'} style={{ width: '45px', height: '45px', borderRadius: '15px', background: 'rgba(17,22,32,0.8)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '20px', backdropFilter: 'blur(10px)', cursor: 'pointer' }}>←</button>
        <div style={{ flex: 1, height: '45px', background: 'rgba(17,22,32,0.8)', borderRadius: '15px', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', padding: '0 15px', color: '#8892a4', fontSize: '14px' }}>
          Explore Echo World...
        </div>
      </div>

      {/* সিলেক্টেড পোস্ট প্রিভিউ */}
      {selectedPost && (
        <div style={{ position: 'absolute', bottom: '100px', left: '20px', right: '20px', zIndex: 10, background: '#111620', borderRadius: '20px', padding: '15px', border: '1px solid rgba(0,229,255,0.3)', animation: 'slideUp 0.3s ease-out' }}>
           <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
             <img src={selectedPost.media_url} style={{ width: '60px', height: '60px', borderRadius: '12px', objectFit: 'cover' }} />
             <div style={{ flex: 1 }}>
               <div style={{ color: '#00e5ff', fontWeight: 'bold', fontSize: '14px' }}>@{selectedPost.profiles?.username}</div>
               <div style={{ color: '#8892a4', fontSize: '12px', marginTop: '4px' }}>{selectedPost.content?.slice(0, 50)}...</div>
             </div>
             <button onClick={() => window.location.href = `/comments/${selectedPost.id}`} style={{ padding: '8px 15px', background: '#00e5ff', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' }}>View</button>
             <button onClick={() => setSelectedPost(null)} style={{ color: '#4a5568', background: 'none', border: 'none', fontSize: '18px' }}>✕</button>
           </div>
        </div>
      )}

      {/* নেভিগেশন বার */}
      <div style={{ position: 'absolute', bottom: '20px', left: '20px', right: '20px', height: '65px', background: 'rgba(17,22,32,0.9)', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(15px)', zIndex: 10, display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
        <button onClick={() => window.location.href = '/feed'} style={{ background: 'none', border: 'none', fontSize: '24px', opacity: 0.5 }}>🏠</button>
        <button style={{ background: 'none', border: 'none', fontSize: '24px' }}>📍</button>
        <button onClick={() => window.location.href = '/post'} style={{ width: '50px', height: '50px', background: 'linear-gradient(135deg,#00e5ff,#00ff88)', borderRadius: '50%', border: 'none', fontSize: '24px', marginTop: '-30px', boxShadow: '0 5px 15px rgba(0,229,255,0.4)' }}>+</button>
        <button onClick={() => window.location.href = '/leaderboard'} style={{ background: 'none', border: 'none', fontSize: '24px', opacity: 0.5 }}>🏆</button>
        <button onClick={() => window.location.href = '/profile'} style={{ background: 'none', border: 'none', fontSize: '24px', opacity: 0.5 }}>👤</button>
      </div>

      <style>{`
        @keyframes slideUp { from { transform: translateY(100px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      `}</style>
    </div>
  )
  }
