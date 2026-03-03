// sw-location.js — Place this in your /public folder
// Background Live Location Service Worker

let liveInterval = null
let supabaseUrl = null
let supabaseKey = null
let userId = null
let liveMode = 'public'

self.addEventListener('message', (event) => {
  const { type, payload } = event.data

  if (type === 'START_LIVE') {
    supabaseUrl = payload.supabaseUrl
    supabaseKey = payload.supabaseKey
    userId = payload.userId
    liveMode = payload.liveMode || 'public'
    startTracking()
  }

  if (type === 'STOP_LIVE') {
    stopTracking()
    if (supabaseUrl && supabaseKey && userId) {
      deleteLiveLocation()
    }
  }

  if (type === 'UPDATE_LOCATION') {
    if (userId && supabaseUrl && supabaseKey) {
      pushLocation(payload.lat, payload.lng)
    }
  }

  if (type === 'UPDATE_LIVE_MODE') {
    liveMode = payload.liveMode
  }
})

const startTracking = () => {
  if (liveInterval) clearInterval(liveInterval)
  // Service worker can't use geolocation directly
  // It receives location updates from the page via postMessage
  // and also keeps the session alive with periodic pings
  liveInterval = setInterval(() => {
    // Ping to keep SW alive & notify page to send location
    self.clients.matchAll().then(clients => {
      clients.forEach(client => {
        client.postMessage({ type: 'REQUEST_LOCATION_UPDATE' })
      })
    })
  }, 4000)
}

const stopTracking = () => {
  if (liveInterval) {
    clearInterval(liveInterval)
    liveInterval = null
  }
}

const pushLocation = async (lat, lng) => {
  try {
    await fetch(`${supabaseUrl}/rest/v1/live_locations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Prefer': 'resolution=merge-duplicates',
      },
      body: JSON.stringify({
        user_id: userId,
        lat,
        lng,
        live_mode: liveMode,
        updated_at: new Date().toISOString(),
      }),
    })
  } catch (e) {
    console.error('[SW] Location push failed:', e)
  }
}

const deleteLiveLocation = async () => {
  try {
    await fetch(`${supabaseUrl}/rest/v1/live_locations?user_id=eq.${userId}`, {
      method: 'DELETE',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
      },
    })
  } catch (e) {
    console.error('[SW] Delete live location failed:', e)
  }
}

// Keep SW alive
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()))
