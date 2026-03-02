'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const CLOUD_NAME = 'dbguxwpa8'
const UPLOAD_PRESET = 'echoworld_preset'

export default function Stories() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [stories, setStories] = useState([])
  const [grouped, setGrouped] = useState([])
  const [viewing, setViewing] = useState(null)
  const [viewingIndex, setViewingIndex] = useState(0)
  const [storyIndex, setStoryIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [caption, setCaption] = useState('')
  const [selectedFile, setSelectedFile] = useState(null)
  const [selectedUrl, setSelectedUrl] = useState(null)
  const [selectedType, setSelectedType] = useState(null)
  const [progress, setProgress] = useState(0)
  const [viewers, setViewers] = useState([])
  const [showViewers, setShowViewers] = useState(false)
  const fileRef = useRef(null)
  const progressRef = useRef(null)
  const videoRef = useRef(null)
  const touchStartX = useRef(0)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { window.location.href = '/'; return }
      const u = data.session.user
      setUser(u)
      const { data: p } = await supabase.from('profiles').select('*').eq('id', u.id).single()
      setProfile(p)
      await loadStories(u.id)
    })
  }, [])

  useEffect(() => {
    if (!viewing) return
    startProgress()
    return () => clearInterval(progressRef.current)
  }, [viewing, storyIndex])

  const startProgress = () => {
    clearInterval(progressRef.current)
    setProgress(0)
    const duration = 5000
    const interval = 50
    let elapsed = 0
    progressRef.current = setInterval(() => {
      elapsed += interval
      setProgress((elapsed / duration) * 100)
      if (elapsed >= duration) {
        clearInterval(progressRef.current)
        goNextStory()
      }
    }, interval)
  }

  const loadStories = async (uid) => {
    const now = new Date().toISOString()
    const { data } = await supabase
      .from('stories')
      .select('*, profiles(id, username, full_name, avatar_url)')
      .gt('expires_at', now)
      .order('created_at', { ascending: false })

    if (!data) { setLoading(false); return }
    setStories(data)

    // Group by user
    const groups = {}
    data.forEach(s => {
      const uid2 = s.user_id
      if (!groups[uid2]) {
        groups[uid2] = {
          user: s.profiles,
          stories: [],
          hasMyStory: uid2 === uid,
        }
      }
      groups[uid2].stories.push(s)
    })

    // My story first
    const arr = Object.values(groups).sort((a, b) => {
      if (a.hasMyStory) return -1
      if (b.hasMyStory) return 1
      return 0
    })

    // Add "Add Story" at beginning if no my story
    if (!groups[uid]) {
      arr.unshift({ user: null, stories: [], hasMyStory: true, isAdd: true })
    }

    setGrouped(arr)
    setLoading(false)
  }

  const openStory = async (groupIndex) => {
    const group = grouped[groupIndex]
    if (!group || group.isAdd) { setShowCreate(true); return }
    setViewing(group)
    setViewingIndex(groupIndex)
    setStoryIndex(0)

    // Mark as viewed
    const story = group.stories[0]
    if (story && user) {
      await supabase.from('story_views').upsert({
        story_id: story.id, user_id: user.id
      })
      await supabase.from('stories').update({ views_count: (story.views_count || 0) + 1 }).eq('id', story.id)
    }
  }

  const goNextStory = async () => {
    if (!viewing) return
    if (storyIndex < viewing.stories.length - 1) {
      const next = storyIndex + 1
      setStoryIndex(next)
      // Mark viewed
      const story = viewing.stories[next]
      if (story && user) {
        await supabase.from('story_views').upsert({ story_id: story.id, user_id: user.id })
      }
    } else {
      // Next user's stories
      const nextGroup = grouped[viewingIndex + 1]
      if (nextGroup && !nextGroup.isAdd) {
        setViewing(nextGroup)
        setViewingIndex(viewingIndex + 1)
        setStoryIndex(0)
      } else {
        closeStory()
      }
    }
  }

  const goPrevStory = () => {
    if (storyIndex > 0) {
      setStoryIndex(storyIndex - 1)
    } else if (viewingIndex > 0) {
      const prevGroup = grouped[viewingIndex - 1]
      if (prevGroup && !prevGroup.isAdd) {
        setViewing(prevGroup)
        setViewingIndex(viewingIndex - 1)
        setStoryIndex(prevGroup.stories.length - 1)
      }
    }
  }

  const closeStory = () => {
    clearInterval(progressRef.current)
    setViewing(null)
    setProgress(0)
  }

  const handleTouchStart = (e) => { touchStartX.current = e.touches[0].clientX }
  const handleTouchEnd = (e) => {
    const diff = touchStartX.current - e.changedTouches[0].clientX
    if (Math.abs(diff) > 50) {
      if (diff > 0) goNextStory()
      else goPrevStory()
    }
  }

  const loadViewers = async (storyId) => {
    const { data } = await supabase
      .from('story_views')
      .select('*, profiles(id, username, full_name, avatar_url)')
      .eq('story_id', storyId)
    setViewers(data || [])
    setShowViewers(true)
  }

  const deleteStory = async (storyId) => {
    await supabase.from('stories').delete().eq('id', storyId)
    closeStory()
    await loadStories(user.id)
  }

  const uploadStory = async () => {
    if (!selectedFile || !user) return
    setUploading(true)
    const formData = new FormData()
    formData.append('file', selectedFile)
    formData.append('upload_preset', UPLOAD_PRESET)

    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${selectedType === 'video' ? 'video' : 'image'}/upload`,
      { method: 'POST', body: formData }
    )
    const d = await res.json()

    await supabase.from('stories').insert({
      user_id: user.id,
      media_url: d.secure_url,
      media_type: selectedType,
      caption,
    })

    setUploading(false)
    setShowCreate(false)
    setSelectedFile(null)
    setSelectedUrl(null)
    setCaption('')
    await loadStories(user.id)
  }

  const timeLeft = (expiresAt) => {
    const ms = new Date(expiresAt) - new Date()
    const h = Math.floor(ms / 3600000)
    const m = Math.floor((ms % 3600000) / 60000)
    if (h > 0) return `${h}h left`
    return `${m}m left`
  }

  const currentStory = viewing?.stories[storyIndex]

  return (
    <div style={{ minHeight: '100vh', background: '#070a10', color: '#eef2f7', paddingBottom: '80px' }}>

      {/* TOP BAR */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, background: 'rgba(7,10,16,0.97)', borderBottom: '1px solid rgba(255,255,255,0.07)', padding: '0 16px', height: '52px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 100 }}>
        <button onClick={() => window.history.back()} style={{ background: 'none', border: 'none', color: '#8892a4', fontSize: '22px', cursor: 'pointer' }}>←</button>
        <div style={{ fontSize: '15px', fontWeight: '800' }}>📸 Stories</div>
        <button onClick={() => setShowCreate(true)} style={{ background: 'linear-gradient(135deg,#00e5ff,#00ff88)', border: 'none', borderRadius: '20px', padding: '7px 14px', color: '#070a10', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>+ Add</button>
      </div>

      {/* BOTTOM NAV */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'rgba(7,10,16,0.98)', borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'space-around', padding: '10px 0 20px', zIndex: 100 }}>
        {[{ icon: '🏠', path: '/feed' }, { icon: '🗺', path: '/map' }, { icon: '📸', path: '/post' }, { icon: '🏆', path: '/leaderboard' }, { icon: '👤', path: '/profile' }].map(item => (
          <div key={item.path} onClick={() => window.location.href = item.path} style={{ fontSize: '22px', cursor: 'pointer', color: '#4a5568' }}>{item.icon}</div>
        ))}
      </div>

      {/* STORIES GRID */}
      <div style={{ padding: '68px 16px 20px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px' }}>
            <div style={{ fontSize: '32px', animation: 'spin 1s linear infinite' }}>📸</div>
            <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
          </div>
        ) : (
          <>
            {/* Horizontal scroll — story circles */}
            <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '16px', scrollbarWidth: 'none', marginBottom: '20px' }}>
              {grouped.map((group, i) => (
                <div key={i} onClick={() => openStory(i)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', cursor: 'pointer', flexShrink: 0 }}>
                  <div style={{ position: 'relative' }}>
                    <div style={{ width: '68px', height: '68px', borderRadius: '50%', padding: '3px', background: group.isAdd ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg,#00e5ff,#00ff88,#ffa500)', boxShadow: group.isAdd ? 'none' : '0 0 16px rgba(0,229,255,0.4)' }}>
                      <div style={{ width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden', background: '#111620', border: '2px solid #070a10', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {group.isAdd ? (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <span style={{ fontSize: '22px' }}>+</span>
                          </div>
                        ) : group.user?.avatar_url ? (
                          <img src={group.user.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <span style={{ fontSize: '24px', fontWeight: '900', color: '#00e5ff' }}>{(group.user?.full_name || group.user?.username || 'E')[0].toUpperCase()}</span>
                        )}
                      </div>
                    </div>
                    {group.stories.length > 0 && (
                      <div style={{ position: 'absolute', bottom: '0', right: '0', background: '#ff4560', borderRadius: '50%', width: '18px', height: '18px', fontSize: '9px', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #070a10', color: '#fff' }}>
                        {group.stories.length}
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: '10px', color: '#8892a4', fontWeight: '600', maxWidth: '68px', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {group.isAdd ? 'Add Story' : group.hasMyStory ? 'Your Story' : group.user?.username}
                  </div>
                </div>
              ))}
            </div>

            {/* Stories list */}
            <div style={{ fontSize: '12px', color: '#4a5568', fontWeight: '700', letterSpacing: '1px', marginBottom: '12px' }}>ALL STORIES</div>
            {grouped.filter(g => !g.isAdd && g.stories.length > 0).map((group, i) => (
              <div key={i} onClick={() => openStory(grouped.indexOf(group))}
                style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '14px', marginBottom: '8px', cursor: 'pointer' }}>
                <div style={{ width: '52px', height: '52px', borderRadius: '50%', padding: '2px', background: 'linear-gradient(135deg,#00e5ff,#00ff88)', flexShrink: 0 }}>
                  <div style={{ width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden', background: '#111620', border: '2px solid #070a10', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {group.user?.avatar_url
                      ? <img src={group.user.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <span style={{ fontSize: '18px', fontWeight: '900', color: '#00e5ff' }}>{(group.user?.full_name || group.user?.username || 'E')[0].toUpperCase()}</span>
                    }
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', fontWeight: '700', marginBottom: '2px' }}>{group.user?.full_name || group.user?.username}</div>
                  <div style={{ fontSize: '11px', color: '#4a5568' }}>@{group.user?.username} · {group.stories.length} {group.stories.length === 1 ? 'story' : 'stories'}</div>
                </div>
                <div style={{ fontSize: '11px', color: '#4a5568' }}>{timeLeft(group.stories[0].expires_at)}</div>
              </div>
            ))}

            {grouped.filter(g => !g.isAdd).length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px', color: '#4a5568' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>📸</div>
                <div style={{ fontSize: '16px', fontWeight: '700', color: '#8892a4', marginBottom: '8px' }}>No stories yet</div>
                <div style={{ fontSize: '13px', marginBottom: '20px' }}>Be the first to share a story!</div>
                <button onClick={() => setShowCreate(true)} style={{ background: 'linear-gradient(135deg,#00e5ff,#00ff88)', border: 'none', borderRadius: '12px', padding: '12px 28px', fontSize: '14px', fontWeight: '700', color: '#070a10', cursor: 'pointer' }}>+ Add Story</button>
              </div>
            )}
          </>
        )}
      </div>

      {/* STORY VIEWER */}
      {viewing && currentStory && (
        <div style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 1000, display: 'flex', flexDirection: 'column' }}
          onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>

          {/* Progress bars */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, padding: '10px 8px 0', display: 'flex', gap: '4px' }}>
            {viewing.stories.map((_, i) => (
              <div key={i} style={{ flex: 1, height: '3px', background: 'rgba(255,255,255,0.3)', borderRadius: '2px', overflow: 'hidden' }}>
                <div style={{ height: '100%', background: '#fff', borderRadius: '2px', width: i < storyIndex ? '100%' : i === storyIndex ? `${progress}%` : '0%', transition: i === storyIndex ? 'none' : 'none' }} />
              </div>
            ))}
          </div>

          {/* Top bar */}
          <div style={{ position: 'absolute', top: '20px', left: 0, right: 0, zIndex: 10, display: 'flex', alignItems: 'center', gap: '10px', padding: '0 16px' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '50%', overflow: 'hidden', background: 'linear-gradient(135deg,#00e5ff,#00ff88)', border: '2px solid rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              onClick={() => window.location.href = `/user/${viewing.user?.id}`}>
              {viewing.user?.avatar_url
                ? <img src={viewing.user.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <span style={{ fontWeight: '800', color: '#070a10', fontSize: '14px' }}>{(viewing.user?.full_name || 'E')[0].toUpperCase()}</span>
              }
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '13px', fontWeight: '700', color: '#fff' }}>{viewing.user?.full_name || viewing.user?.username}</div>
              <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)' }}>{timeLeft(currentStory.expires_at)}</div>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {viewing.hasMyStory && (
                <>
                  <button onClick={() => loadViewers(currentStory.id)}
                    style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '16px', padding: '5px 10px', color: '#fff', fontSize: '11px', fontWeight: '600', cursor: 'pointer' }}>
                    👁 {currentStory.views_count || 0}
                  </button>
                  <button onClick={() => deleteStory(currentStory.id)}
                    style={{ background: 'rgba(255,69,96,0.3)', border: 'none', borderRadius: '16px', padding: '5px 10px', color: '#ff4560', fontSize: '11px', fontWeight: '600', cursor: 'pointer' }}>
                    🗑
                  </button>
                </>
              )}
              <button onClick={closeStory} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', color: '#fff', fontSize: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
            </div>
          </div>

          {/* Media */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onClick={(e) => {
              const x = e.clientX
              const w = window.innerWidth
              if (x < w / 3) goPrevStory()
              else if (x > (w * 2) / 3) goNextStory()
              else { clearInterval(progressRef.current); startProgress() }
            }}>
            {currentStory.media_type === 'video' ? (
              <video ref={videoRef} src={currentStory.media_url} autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: 'contain' }} onEnded={goNextStory} />
            ) : (
              <img src={currentStory.media_url} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            )}
          </div>

          {/* Caption */}
          {currentStory.caption && (
            <div style={{ position: 'absolute', bottom: '80px', left: 0, right: 0, padding: '0 20px', textAlign: 'center' }}>
              <div style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', borderRadius: '12px', padding: '10px 16px', fontSize: '14px', color: '#fff', lineHeight: '1.5' }}>
                {currentStory.caption}
              </div>
            </div>
          )}

          {/* Nav zones */}
          <div style={{ position: 'absolute', top: '70px', bottom: '0', left: '0', width: '33%' }} onClick={goPrevStory} />
          <div style={{ position: 'absolute', top: '70px', bottom: '0', right: '0', width: '33%' }} onClick={goNextStory} />
        </div>
      )}

      {/* VIEWERS MODAL */}
      {showViewers && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'flex-end', zIndex: 1100 }} onClick={() => setShowViewers(false)}>
          <div style={{ background: '#111620', borderRadius: '24px 24px 0 0', width: '100%', maxHeight: '60vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px 8px' }}>
              <div style={{ fontSize: '15px', fontWeight: '800' }}>👁 Viewers ({viewers.length})</div>
              <button onClick={() => setShowViewers(false)} style={{ background: 'none', border: 'none', color: '#4a5568', fontSize: '22px', cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ overflowY: 'auto', padding: '8px 16px 24px' }}>
              {viewers.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px', color: '#4a5568' }}>No views yet</div>
              ) : viewers.map(v => (
                <div key={v.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px', borderRadius: '12px', marginBottom: '4px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', overflow: 'hidden', background: 'linear-gradient(135deg,#00e5ff,#00ff88)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {v.profiles?.avatar_url ? <img src={v.profiles.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontWeight: '800', color: '#070a10' }}>{(v.profiles?.full_name || 'E')[0].toUpperCase()}</span>}
                  </div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: '700' }}>{v.profiles?.full_name || v.profiles?.username}</div>
                    <div style={{ fontSize: '11px', color: '#4a5568' }}>@{v.profiles?.username}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* CREATE STORY */}
      {showCreate && (
        <div style={{ position: 'fixed', inset: 0, background: '#070a10', zIndex: 1000, display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '0 16px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
            <button onClick={() => { setShowCreate(false); setSelectedFile(null); setSelectedUrl(null) }} style={{ background: 'none', border: 'none', color: '#8892a4', fontSize: '22px', cursor: 'pointer' }}>✕</button>
            <div style={{ fontSize: '15px', fontWeight: '800' }}>📸 New Story</div>
            <button onClick={uploadStory} disabled={!selectedFile || uploading}
              style={{ background: selectedFile ? 'linear-gradient(135deg,#00e5ff,#00ff88)' : 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '20px', padding: '8px 16px', color: selectedFile ? '#070a10' : '#4a5568', fontSize: '13px', fontWeight: '700', cursor: selectedFile ? 'pointer' : 'default', opacity: uploading ? 0.7 : 1 }}>
              {uploading ? 'Uploading...' : 'Share ✓'}
            </button>
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px', gap: '16px' }}>
            {!selectedUrl ? (
              <div onClick={() => fileRef.current?.click()}
                style={{ width: '100%', maxWidth: '360px', height: '400px', background: '#111620', border: '2px dashed rgba(0,229,255,0.3)', borderRadius: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', gap: '12px' }}>
                <div style={{ fontSize: '60px' }}>📸</div>
                <div style={{ fontSize: '16px', fontWeight: '700', color: '#00e5ff' }}>Tap to select photo/video</div>
                <div style={{ fontSize: '12px', color: '#4a5568' }}>Story expires in 24 hours</div>
              </div>
            ) : (
              <div style={{ width: '100%', maxWidth: '360px', borderRadius: '20px', overflow: 'hidden', position: 'relative' }}>
                {selectedType === 'video'
                  ? <video src={selectedUrl} style={{ width: '100%', maxHeight: '400px', objectFit: 'cover' }} controls playsInline />
                  : <img src={selectedUrl} style={{ width: '100%', maxHeight: '400px', objectFit: 'cover' }} />
                }
                <button onClick={() => { setSelectedFile(null); setSelectedUrl(null) }}
                  style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', color: '#fff', fontSize: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
              </div>
            )}

            <input value={caption} onChange={e => setCaption(e.target.value)} placeholder="Add a caption..."
              style={{ width: '100%', maxWidth: '360px', background: '#111620', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '14px', padding: '12px 16px', color: '#eef2f7', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />

            {!selectedUrl && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', width: '100%', maxWidth: '360px' }}>
                <button onClick={() => fileRef.current?.click()}
                  style={{ padding: '14px', background: 'linear-gradient(135deg,#00e5ff,#00ff88)', border: 'none', borderRadius: '14px', color: '#070a10', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}>
                  📷 Photo
                </button>
                <button onClick={() => fileRef.current?.click()}
                  style={{ padding: '14px', background: 'linear-gradient(135deg,#ffa500,#ff6b35)', border: 'none', borderRadius: '14px', color: '#fff', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}>
                  🎬 Video
                </button>
              </div>
            )}
          </div>

          <input ref={fileRef} type="file" accept="image/*,video/*" onChange={e => {
            const f = e.target.files[0]
            if (!f) return
            setSelectedFile(f)
            setSelectedUrl(URL.createObjectURL(f))
            setSelectedType(f.type.startsWith('video') ? 'video' : 'photo')
          }} style={{ display: 'none' }} />
        </div>
      )}
    </div>
  )
    }
