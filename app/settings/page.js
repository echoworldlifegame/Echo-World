'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default function Settings() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saved, setSaved] = useState(false)

  // Settings states
  const [autoplay, setAutoplay] = useState(true)
  const [notifications, setNotifications] = useState(true)
  const [locationEnabled, setLocationEnabled] = useState(true)
  const [privateAccount, setPrivateAccount] = useState(false)
  const [showOnMap, setShowOnMap] = useState(true)
  const [darkMode, setDarkMode] = useState(true)
  const [language, setLanguage] = useState('bn')
  const [dataUsage, setDataUsage] = useState('normal')
  const [emailNotif, setEmailNotif] = useState(false)
  const [pushNotif, setPushNotif] = useState(true)
  const [showOnline, setShowOnline] = useState(true)
  const [allowMix, setAllowMix] = useState(true)
  const [allowDM, setAllowDM] = useState(true)
  const [safeSearch, setSafeSearch] = useState(false)
  const [activeSection, setActiveSection] = useState('account')

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { window.location.href = '/'; return }
      const u = data.session.user
      setUser(u)
      const { data: p } = await supabase.from('profiles').select('*').eq('id', u.id).single()
      setProfile(p)

      // Load saved settings
      const s = localStorage.getItem('echo_settings')
      if (s) {
        const parsed = JSON.parse(s)
        setAutoplay(parsed.autoplay ?? true)
        setNotifications(parsed.notifications ?? true)
        setLocationEnabled(parsed.locationEnabled ?? true)
        setPrivateAccount(parsed.privateAccount ?? false)
        setShowOnMap(parsed.showOnMap ?? true)
        setDarkMode(parsed.darkMode ?? true)
        setLanguage(parsed.language ?? 'bn')
        setDataUsage(parsed.dataUsage ?? 'normal')
        setEmailNotif(parsed.emailNotif ?? false)
        setPushNotif(parsed.pushNotif ?? true)
        setShowOnline(parsed.showOnline ?? true)
        setAllowMix(parsed.allowMix ?? true)
        setAllowDM(parsed.allowDM ?? true)
        setSafeSearch(parsed.safeSearch ?? false)
      }
      setLoading(false)
    })
  }, [])

  const saveSettings = async () => {
    const settings = {
      autoplay, notifications, locationEnabled, privateAccount,
      showOnMap, darkMode, language, dataUsage, emailNotif,
      pushNotif, showOnline, allowMix, allowDM, safeSearch
    }
    localStorage.setItem('echo_settings', JSON.stringify(settings))

    // Save some to database
    await supabase.from('profiles').update({
      is_private: privateAccount,
    }).eq('id', user.id)

    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  const handleDeleteAccount = async () => {
    if (!confirm('Are you sure? This cannot be undone!')) return
    if (!confirm('All your posts, likes and data will be deleted forever!')) return
    await supabase.from('posts').delete().eq('user_id', user.id)
    await supabase.from('likes').delete().eq('user_id', user.id)
    await supabase.from('followers').delete().eq('follower_id', user.id)
    await supabase.from('notifications').delete().eq('user_id', user.id)
    await supabase.from('profiles').delete().eq('id', user.id)
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  const Toggle = ({ value, onChange, disabled }) => (
    <div onClick={() => !disabled && onChange(!value)}
      style={{ width: '48px', height: '26px', borderRadius: '13px', background: value ? 'linear-gradient(135deg,#00e5ff,#00ff88)' : 'rgba(255,255,255,0.1)', position: 'relative', cursor: disabled ? 'not-allowed' : 'pointer', transition: 'all 0.3s', flexShrink: 0, opacity: disabled ? 0.5 : 1 }}>
      <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#fff', position: 'absolute', top: '3px', left: value ? '25px' : '3px', transition: 'left 0.3s', boxShadow: '0 1px 4px rgba(0,0,0,0.3)' }} />
    </div>
  )

  const Section = ({ title, icon, children }) => (
    <div style={{ background: '#111620', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', marginBottom: '14px', overflow: 'hidden' }}>
      <div style={{ padding: '14px 16px 10px', fontSize: '12px', color: '#4a5568', fontWeight: '700', letterSpacing: '1px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        {icon} {title}
      </div>
      {children}
    </div>
  )

  const Row = ({ label, sub, right, onClick, danger }) => (
    <div onClick={onClick}
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)', cursor: onClick ? 'pointer' : 'default' }}>
      <div>
        <div style={{ fontSize: '14px', fontWeight: '600', color: danger ? '#ff4560' : '#eef2f7' }}>{label}</div>
        {sub && <div style={{ fontSize: '11px', color: '#4a5568', marginTop: '2px' }}>{sub}</div>}
      </div>
      {right}
    </div>
  )

  const sections = [
    { key: 'account', label: '👤 Account', icon: '👤' },
    { key: 'privacy', label: '🔒 Privacy', icon: '🔒' },
    { key: 'notif', label: '🔔 Notifications', icon: '🔔' },
    { key: 'media', label: '🎬 Media', icon: '🎬' },
    { key: 'about', label: 'ℹ️ About', icon: 'ℹ️' },
  ]

  if (loading) return (
    <div style={{ height: '100vh', background: '#070a10', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontSize: '32px', animation: 'spin 1s linear infinite' }}>⚙️</div>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#070a10', color: '#eef2f7', paddingBottom: '100px' }}>

      {/* TOP BAR */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, background: 'rgba(7,10,16,0.97)', borderBottom: '1px solid rgba(255,255,255,0.07)', padding: '0 16px', height: '52px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 100 }}>
        <button onClick={() => window.history.back()} style={{ background: 'none', border: 'none', color: '#8892a4', fontSize: '22px', cursor: 'pointer' }}>←</button>
        <div style={{ fontSize: '15px', fontWeight: '800' }}>⚙️ Settings</div>
        <button onClick={saveSettings} style={{ background: saved ? 'rgba(0,255,136,0.1)' : 'linear-gradient(135deg,#00e5ff,#00ff88)', border: saved ? '1px solid rgba(0,255,136,0.3)' : 'none', borderRadius: '20px', padding: '7px 16px', color: saved ? '#00ff88' : '#070a10', fontSize: '13px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.3s' }}>
          {saved ? '✓ Saved!' : 'Save'}
        </button>
      </div>

      {/* BOTTOM NAV */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'rgba(7,10,16,0.98)', borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'space-around', padding: '10px 0 20px', zIndex: 100 }}>
        {[{ icon: '🏠', path: '/feed' }, { icon: '🗺', path: '/map' }, { icon: '📸', path: '/post' }, { icon: '🏆', path: '/leaderboard' }, { icon: '👤', path: '/profile' }].map(item => (
          <div key={item.path} onClick={() => window.location.href = item.path} style={{ fontSize: '22px', cursor: 'pointer', color: '#4a5568' }}>{item.icon}</div>
        ))}
      </div>

      <div style={{ padding: '68px 16px 20px' }}>

        {/* PROFILE CARD */}
        <div onClick={() => window.location.href = '/profile'} style={{ background: 'linear-gradient(135deg,#0a1628,#0d2137)', border: '1px solid rgba(0,229,255,0.15)', borderRadius: '16px', padding: '16px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '14px', cursor: 'pointer' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '50%', overflow: 'hidden', background: 'linear-gradient(135deg,#00e5ff,#00ff88)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid rgba(0,229,255,0.4)' }}>
            {profile?.avatar_url ? <img src={profile.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontWeight: '900', color: '#070a10', fontSize: '22px' }}>{(profile?.full_name || profile?.username || 'E')[0]?.toUpperCase()}</span>}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '16px', fontWeight: '800' }}>{profile?.full_name || profile?.username}</div>
            <div style={{ fontSize: '12px', color: '#4a5568' }}>@{profile?.username} · ⚡{profile?.xp || 0} XP · Lv.{profile?.level || 1}</div>
            <div style={{ fontSize: '11px', color: '#00e5ff', marginTop: '2px' }}>{user?.email}</div>
          </div>
          <div style={{ fontSize: '20px', color: '#4a5568' }}>›</div>
        </div>

        {/* SECTION TABS */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', overflowX: 'auto', scrollbarWidth: 'none' }}>
          {sections.map(s => (
            <button key={s.key} onClick={() => setActiveSection(s.key)}
              style={{ padding: '6px 14px', borderRadius: '20px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: '700', whiteSpace: 'nowrap', flexShrink: 0, background: activeSection === s.key ? 'linear-gradient(135deg,#00e5ff,#00ff88)' : 'rgba(255,255,255,0.07)', color: activeSection === s.key ? '#070a10' : '#8892a4' }}>
              {s.label}
            </button>
          ))}
        </div>

        {/* ACCOUNT */}
        {activeSection === 'account' && (
          <>
            <Section title="ACCOUNT" icon="👤">
              <Row label="Edit Profile" sub="Change name, bio, photo" right={<div style={{ fontSize: '20px', color: '#4a5568' }}>›</div>} onClick={() => window.location.href = '/profile'} />
              <Row label="Username" sub={`@${profile?.username}`} right={<div style={{ fontSize: '12px', color: '#4a5568' }}>›</div>} onClick={() => window.location.href = '/profile'} />
              <Row label="Phone Number" sub={profile?.phone || 'Not set'} right={<div style={{ fontSize: '20px', color: '#4a5568' }}>›</div>} onClick={() => window.location.href = '/profile'} />
              <Row label="Email" sub={user?.email} right={<div style={{ fontSize: '12px', color: '#4a5568' }}>›</div>} />
            </Section>

            <Section title="DISPLAY" icon="🎨">
              <Row label="Dark Mode" sub="Dark theme (recommended)" right={<Toggle value={darkMode} onChange={setDarkMode} />} />
              <Row label="Language" sub="App language"
                right={
                  <select value={language} onChange={e => setLanguage(e.target.value)}
                    style={{ background: '#0c1018', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '4px 8px', color: '#eef2f7', fontSize: '12px', cursor: 'pointer', outline: 'none' }}>
                    <option value="bn">বাংলা</option>
                    <option value="en">English</option>
                    <option value="hi">हिंदी</option>
                  </select>
                } />
            </Section>

            <Section title="ACCOUNT ACTIONS" icon="⚡">
              <Row label="Logout" sub="Sign out of your account" right={<div style={{ fontSize: '20px', color: '#4a5568' }}>›</div>} onClick={handleLogout} />
              <Row label="Delete Account" sub="Permanently delete everything" right={<div style={{ fontSize: '16px' }}>›</div>} onClick={handleDeleteAccount} danger />
            </Section>
          </>
        )}

        {/* PRIVACY */}
        {activeSection === 'privacy' && (
          <>
            <Section title="ACCOUNT PRIVACY" icon="🔒">
              <Row label="Private Account" sub="Only supporters see your posts" right={<Toggle value={privateAccount} onChange={setPrivateAccount} />} />
              <Row label="Show on Map" sub="Others can see you on the map" right={<Toggle value={showOnMap} onChange={setShowOnMap} />} />
              <Row label="Show Online Status" sub="Let others see when you're active" right={<Toggle value={showOnline} onChange={setShowOnline} />} />
            </Section>

            <Section title="INTERACTIONS" icon="🤝">
              <Row label="Allow MIX" sub="Others can remix your ECHO videos" right={<Toggle value={allowMix} onChange={setAllowMix} />} />
              <Row label="Allow Messages" sub="Others can message you" right={<Toggle value={allowDM} onChange={setAllowDM} />} />
              <Row label="Safe Search" sub="Filter sensitive content" right={<Toggle value={safeSearch} onChange={setSafeSearch} />} />
            </Section>

            <Section title="DATA" icon="📊">
              <Row label="Location Access" sub="Required for map features" right={<Toggle value={locationEnabled} onChange={setLocationEnabled} />} />
              <Row label="Clear Cache" sub="Free up storage space"
                right={<button onClick={() => { localStorage.clear(); alert('Cache cleared!') }} style={{ background: 'rgba(255,69,96,0.1)', border: '1px solid rgba(255,69,96,0.2)', borderRadius: '8px', padding: '5px 12px', color: '#ff4560', fontSize: '12px', cursor: 'pointer', fontWeight: '600' }}>Clear</button>} />
              <Row label="Download My Data" sub="Get all your data as JSON"
                right={<button onClick={async () => {
                  const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
                  const { data: posts } = await supabase.from('posts').select('*').eq('user_id', user.id)
                  const blob = new Blob([JSON.stringify({ profile: p, posts }, null, 2)], { type: 'application/json' })
                  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'echoworld_data.json'; a.click()
                }} style={{ background: 'rgba(0,229,255,0.1)', border: '1px solid rgba(0,229,255,0.2)', borderRadius: '8px', padding: '5px 12px', color: '#00e5ff', fontSize: '12px', cursor: 'pointer', fontWeight: '600' }}>Export</button>} />
            </Section>
          </>
        )}

        {/* NOTIFICATIONS */}
        {activeSection === 'notif' && (
          <>
            <Section title="PUSH NOTIFICATIONS" icon="🔔">
              <Row label="Push Notifications" sub="Notifications on your device" right={<Toggle value={pushNotif} onChange={setPushNotif} />} />
              <Row label="Email Notifications" sub="Get updates via email" right={<Toggle value={emailNotif} onChange={setEmailNotif} />} />
            </Section>

            <Section title="NOTIFICATION TYPES" icon="📋">
              {[
                { label: 'New Supporters', sub: 'When someone supports you', key: 'follow' },
                { label: 'Likes', sub: 'When someone likes your post', key: 'like' },
                { label: 'Comments', sub: 'When someone comments', key: 'comment' },
                { label: 'ECHO Remix', sub: 'When someone mixes your video', key: 'remix' },
                { label: 'Announcements', sub: 'Updates from Echo World', key: 'announce' },
              ].map(item => (
                <Row key={item.key} label={item.label} sub={item.sub} right={<Toggle value={true} onChange={() => { }} />} />
              ))}
            </Section>
          </>
        )}

        {/* MEDIA */}
        {activeSection === 'media' && (
          <>
            <Section title="VIDEO" icon="🎬">
              <Row label="Autoplay Videos" sub="Videos play automatically in feed" right={<Toggle value={autoplay} onChange={setAutoplay} />} />
              <Row label="Data Usage" sub="Control video quality"
                right={
                  <select value={dataUsage} onChange={e => setDataUsage(e.target.value)}
                    style={{ background: '#0c1018', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '4px 8px', color: '#eef2f7', fontSize: '12px', cursor: 'pointer', outline: 'none' }}>
                    <option value="low">Low (Save data)</option>
                    <option value="normal">Normal</option>
                    <option value="high">High Quality</option>
                  </select>
                } />
            </Section>

            <Section title="UPLOAD" icon="📤">
              <Row label="Auto-compress Photos" sub="Reduce file size before upload" right={<Toggle value={true} onChange={() => { }} />} />
              <Row label="Video Max Length" sub="Maximum video duration"
                right={
                  <select defaultValue="60"
                    style={{ background: '#0c1018', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '4px 8px', color: '#eef2f7', fontSize: '12px', cursor: 'pointer', outline: 'none' }}>
                    <option value="30">30 seconds</option>
                    <option value="60">60 seconds</option>
                    <option value="180">3 minutes</option>
                  </select>
                } />
            </Section>
          </>
        )}

        {/* ABOUT */}
        {activeSection === 'about' && (
          <>
            <Section title="APP INFO" icon="ℹ️">
              <Row label="Version" right={<div style={{ fontSize: '13px', color: '#4a5568' }}>v1.0.0 Beta</div>} />
              <Row label="Build" right={<div style={{ fontSize: '13px', color: '#4a5568' }}>2026.03</div>} />
              <Row label="Platform" right={<div style={{ fontSize: '13px', color: '#4a5568' }}>Web PWA</div>} />
            </Section>

            <Section title="LINKS" icon="🔗">
              {[
                { label: 'Privacy Policy', url: '#' },
                { label: 'Terms of Service', url: '#' },
                { label: 'Help & Support', url: '#' },
                { label: 'Report a Bug', url: '#' },
              ].map(link => (
                <Row key={link.label} label={link.label} right={<div style={{ fontSize: '20px', color: '#4a5568' }}>›</div>} onClick={() => window.open(link.url)} />
              ))}
            </Section>

            <div style={{ textAlign: 'center', padding: '20px', color: '#2a3040' }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>⬡</div>
              <div style={{ fontSize: '14px', fontWeight: '700', color: '#4a5568' }}>Echo World</div>
              <div style={{ fontSize: '12px', marginTop: '4px' }}>Made with ❤️ for explorers</div>
            </div>
          </>
        )}
      </div>
    </div>
  )
        }
