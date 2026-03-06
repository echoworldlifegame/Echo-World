'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const CATEGORIES = ['general', 'gaming', 'music', 'art', 'sports', 'tech', 'food', 'travel', 'education', 'other']
const CAT_EMOJI = { general: '🌍', gaming: '🎮', music: '🎵', art: '🎨', sports: '⚽', tech: '💻', food: '🍜', travel: '✈️', education: '📚', other: '✨' }

export default function Community() {
  const [user, setUser] = useState(null)
  const [view, setView] = useState('list')
  const [communities, setCommunities] = useState([])
  const [myCommunities, setMyCommunities] = useState([])
  const [activeCommunity, setActiveCommunity] = useState(null)
  const [posts, setPosts] = useState([])
  const [members, setMembers] = useState([])
  const [isMember, setIsMember] = useState(false)
  const [isCreator, setIsCreator] = useState(false)
  const [loading, setLoading] = useState(true)
  const [postText, setPostText] = useState('')
  const [sending, setSending] = useState(false)
  const [activeTab, setActiveTab] = useState('discover')
  const [showCreate, setShowCreate] = useState(false)
  const [showPost, setShowPost] = useState(false)
  const [newCom, setNewCom] = useState({ name: '', description: '', category: 'general', is_private: false })
  const [creating, setCreating] = useState(false)
  const [liked, setLiked] = useState({})

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { window.location.href = '/'; return }
      const u = data.session.user
      setUser(u)
      await loadCommunities(u.id)
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    if (activeCommunity && user) {
      loadCommunityData(activeCommunity.id, user.id)
    }
  }, [activeCommunity])

  const loadCommunities = async (uid) => {
    const { data: all } = await supabase
      .from('communities')
      .select('*')
      .order('member_count', { ascending: false })
    setCommunities(all || [])

    const { data: mine } = await supabase
      .from('community_members')
      .select('community_id, communities(*)')
      .eq('user_id', uid)
    setMyCommunities((mine || []).map(m => m.communities).filter(Boolean))
  }

  const loadCommunityData = async (comId, uid) => {
    const { data: p } = await supabase
      .from('community_posts')
      .select('*, profiles(id, username, full_name, avatar_url)')
      .eq('community_id', comId)
      .order('created_at', { ascending: false })
    setPosts(p || [])

    const { data: m } = await supabase
      .from('community_members')
      .select('*, profiles(id, username, full_name, avatar_url)')
      .eq('community_id', comId)
      .limit(20)
    setMembers(m || [])

    const { data: mem } = await supabase
      .from('community_members')
      .select('id')
      .eq('community_id', comId)
      .eq('user_id', uid)
      .single()
    setIsMember(!!mem)
    setIsCreator(activeCommunity?.creator_id === uid)
  }

  const joinCommunity = async (com) => {
    if (!user) return
    await supabase.from('community_members').upsert({
      community_id: com.id, user_id: user.id, role: 'member'
    })
    await supabase.from('communities').update({
      member_count: (com.member_count || 0) + 1
    }).eq('id', com.id)
    setIsMember(true)
    setCommunities(cs => cs.map(c => c.id === com.id ? { ...c, member_count: (c.member_count || 0) + 1 } : c))
    setActiveCommunity(prev => ({ ...prev, member_count: (prev.member_count || 0) + 1 }))
  }

  const leaveCommunity = async (com) => {
    if (!user || isCreator) return
    await supabase.from('community_members').delete()
      .eq('community_id', com.id).eq('user_id', user.id)
    await supabase.from('communities').update({
      member_count: Math.max((com.member_count || 1) - 1, 0)
    }).eq('id', com.id)
    setIsMember(false)
  }

  const createCommunity = async () => {
    if (!newCom.name.trim() || !user || creating) return
    setCreating(true)
    const { data: com } = await supabase.from('communities').insert({
      name: newCom.name.trim(),
      description: newCom.description.trim(),
      category: newCom.category,
      is_private: newCom.is_private,
      creator_id: user.id,
      member_count: 1,
    }).select().single()

    if (com) {
      await supabase.from('community_members').insert({
        community_id: com.id, user_id: user.id, role: 'admin'
      })
      setCommunities(prev => [com, ...prev])
      setMyCommunities(prev => [com, ...prev])
      setShowCreate(false)
      setNewCom({ name: '', description: '', category: 'general', is_private: false })
      setActiveCommunity(com)
      setView('community')
    }
    setCreating(false)
  }

  const sendPost = async () => {
    if (!postText.trim() || !user || !activeCommunity || sending) return
    if (!isMember) { alert('Join the community first!'); return }
    setSending(true)
    const { data: p } = await supabase.from('community_posts').insert({
      community_id: activeCommunity.id,
      user_id: user.id,
      content: postText.trim(),
      media_type: 'text',
    }).select('*, profiles(id, username, full_name, avatar_url)').single()
    if (p) {
      setPosts(prev => [p, ...prev])
      await supabase.from('communities').update({
        post_count: (activeCommunity.post_count || 0) + 1
      }).eq('id', activeCommunity.id)
    }
    setPostText('')
    setSending(false)
    setShowPost(false)
  }

  const handleLike = async (post) => {
    if (!user) return
    setLiked(p => ({ ...p, [post.id]: !p[post.id] }))
    setPosts(ps => ps.map(p => p.id === post.id ? {
      ...p, likes_count: liked[post.id]
        ? Math.max((p.likes_count || 1) - 1, 0)
        : (p.likes_count || 0) + 1
    } : p))
  }

  const timeAgo = (date) => {
    const s = Math.floor((new Date() - new Date(date)) / 1000)
    if (s < 60) return 'এইমাত্র'
    if (s < 3600) return Math.floor(s / 60) + 'মি'
    if (s < 86400) return Math.floor(s / 3600) + 'ঘ'
    return Math.floor(s / 86400) + 'দিন'
  }

  const Avatar = ({ profile, size = 40 }) => (
    <div style={{ width: size, height: size, borderRadius: '50%', background: 'linear-gradient(135deg,#00e5ff,#00ff88)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
      {profile?.avatar_url
        ? <img src={profile.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : <span style={{ fontSize: size * 0.35, fontWeight: '800', color: '#070a10' }}>{(profile?.full_name || profile?.username || 'E')[0].toUpperCase()}</span>}
    </div>
  )

  const CommunityCard = ({ com, onClick }) => {
    const joined = myCommunities.some(m => m.id === com.id)
    return (
      <div onClick={onClick} style={{ background: '#111620', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', overflow: 'hidden', cursor: 'pointer', marginBottom: '12px' }}>
        <div style={{ height: '70px', background: `linear-gradient(135deg, #0a1628, #001a2e)`, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 50% 50%, rgba(0,229,255,0.1), transparent 70%)' }} />
          <span style={{ fontSize: '32px' }}>{CAT_EMOJI[com.category] || '🌍'}</span>
          {com.is_private && <div style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(0,0,0,0.6)', borderRadius: '8px', padding: '2px 8px', fontSize: '10px', color: '#ffca28' }}>🔒 Private</div>}
        </div>
        <div style={{ padding: '12px 14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
            <div style={{ fontSize: '15px', fontWeight: '800' }}>{com.name}</div>
            <div style={{ fontSize: '10px', background: joined ? 'rgba(0,229,255,0.1)' : 'rgba(255,255,255,0.05)', color: joined ? '#00e5ff' : '#4a5568', borderRadius: '8px', padding: '2px 8px', flexShrink: 0, marginLeft: '8px' }}>
              {joined ? '✓ Joined' : 'Join'}
            </div>
          </div>
          {com.description && <div style={{ fontSize: '12px', color: '#8892a4', marginBottom: '8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{com.description}</div>}
          <div style={{ display: 'flex', gap: '14px', fontSize: '11px', color: '#4a5568' }}>
            <span>👥 {com.member_count || 0} members</span>
            <span>📝 {com.post_count || 0} posts</span>
            <span>{CAT_EMOJI[com.category]} {com.category}</span>
          </div>
        </div>
      </div>
    )
  }

  // ── COMMUNITY DETAIL VIEW ──────────────────────────────────
  if (view === 'community' && activeCommunity) {
    return (
      <div style={{ minHeight: '100vh', background: '#070a10', color: '#eef2f7', paddingBottom: '90px' }}>
        <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}`}</style>

        {/* Header */}
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, background: 'rgba(7,10,16,0.97)', borderBottom: '1px solid rgba(255,255,255,0.07)', zIndex: 100, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button onClick={() => { setView('list'); setActiveCommunity(null) }}
            style={{ background: 'none', border: 'none', color: '#8892a4', fontSize: '22px', cursor: 'pointer' }}>←</button>
          <span style={{ fontSize: '20px' }}>{CAT_EMOJI[activeCommunity.category]}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '15px', fontWeight: '800', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{activeCommunity.name}</div>
            <div style={{ fontSize: '11px', color: '#4a5568' }}>👥 {activeCommunity.member_count} members</div>
          </div>
          {isMember ? (
            <button onClick={() => leaveCommunity(activeCommunity)}
              style={{ padding: '7px 14px', borderRadius: '20px', border: '1px solid rgba(255,69,96,0.3)', background: 'rgba(255,69,96,0.08)', color: '#ff4560', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>
              Leave
            </button>
          ) : (
            <button onClick={() => joinCommunity(activeCommunity)}
              style={{ padding: '7px 14px', borderRadius: '20px', border: 'none', background: 'linear-gradient(135deg,#00e5ff,#00ff88)', color: '#070a10', fontSize: '12px', fontWeight: '800', cursor: 'pointer' }}>
              + Join
            </button>
          )}
        </div>

        <div style={{ paddingTop: '70px' }}>
          {/* Cover */}
          <div style={{ height: '100px', background: 'linear-gradient(135deg,#0a1628,#001a2e)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
            <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 30% 50%,rgba(0,229,255,0.12),transparent 60%),radial-gradient(circle at 70% 50%,rgba(0,255,136,0.08),transparent 60%)' }} />
            <span style={{ fontSize: '48px', zIndex: 1 }}>{CAT_EMOJI[activeCommunity.category]}</span>
          </div>

          {/* Info */}
          <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ fontSize: '18px', fontWeight: '900', marginBottom: '4px' }}>{activeCommunity.name}</div>
            {activeCommunity.description && <div style={{ fontSize: '13px', color: '#8892a4', lineHeight: '1.6', marginBottom: '10px' }}>{activeCommunity.description}</div>}
            <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: '#4a5568', marginBottom: '12px' }}>
              <span>👥 {activeCommunity.member_count} members</span>
              <span>📝 {activeCommunity.post_count || posts.length} posts</span>
              <span>{CAT_EMOJI[activeCommunity.category]} {activeCommunity.category}</span>
            </div>

            {/* Members preview */}
            {members.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ display: 'flex' }}>
                  {members.slice(0, 5).map((m, i) => (
                    <div key={m.id} style={{ marginLeft: i > 0 ? '-8px' : '0', zIndex: 5 - i }}>
                      <Avatar profile={m.profiles} size={28} />
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: '11px', color: '#4a5568' }}>
                  {members.slice(0, 2).map(m => m.profiles?.username).join(', ')}
                  {members.length > 2 ? ` +${members.length - 2} more` : ''}
                </div>
              </div>
            )}
          </div>

          {/* Post input */}
          {isMember && (
            <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <div onClick={() => setShowPost(true)}
                style={{ background: '#111620', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '12px 16px', color: '#4a5568', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '18px' }}>✍️</span>
                <span>Share something with the community...</span>
              </div>
            </div>
          )}

          {/* Posts */}
          <div style={{ padding: '12px 16px' }}>
            {posts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <div style={{ fontSize: '40px', marginBottom: '12px' }}>📭</div>
                <div style={{ color: '#4a5568', fontSize: '14px' }}>No posts yet</div>
                {isMember && <div style={{ fontSize: '12px', color: '#4a5568', marginTop: '4px' }}>Be the first to post!</div>}
              </div>
            ) : posts.map(post => (
              <div key={post.id} style={{ background: '#111620', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '14px', padding: '14px', marginBottom: '10px', animation: 'fadeIn 0.2s ease' }}>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '10px' }}>
                  <Avatar profile={post.profiles} size={38} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: '700' }}>{post.profiles?.full_name || post.profiles?.username}</div>
                    <div style={{ fontSize: '11px', color: '#4a5568' }}>@{post.profiles?.username} · {timeAgo(post.created_at)}</div>
                  </div>
                </div>
                {post.content && <div style={{ fontSize: '14px', color: '#c0c8d8', lineHeight: '1.6', marginBottom: '10px' }}>{post.content}</div>}
                {post.media_url && post.media_type === 'photo' && (
                  <img src={post.media_url} style={{ width: '100%', borderRadius: '10px', marginBottom: '10px', display: 'block' }} />
                )}
                <div style={{ display: 'flex', gap: '4px', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '8px' }}>
                  <button onClick={() => handleLike(post)}
                    style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 12px', border: 'none', background: 'none', cursor: 'pointer', color: liked[post.id] ? '#ff4560' : '#4a5568', fontSize: '13px', borderRadius: '8px' }}>
                    {liked[post.id] ? '❤️' : '🤍'} {post.likes_count || 0}
                  </button>
                  <button style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 12px', border: 'none', background: 'none', cursor: 'pointer', color: '#4a5568', fontSize: '13px', borderRadius: '8px' }}>
                    💬 {post.comments_count || 0}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Post modal */}
        {showPost && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'flex-end', zIndex: 1000 }} onClick={() => setShowPost(false)}>
            <div style={{ background: '#111620', borderRadius: '24px 24px 0 0', width: '100%', padding: '24px' }} onClick={e => e.stopPropagation()}>
              <div style={{ fontSize: '15px', fontWeight: '800', marginBottom: '14px' }}>✍️ Post in {activeCommunity.name}</div>
              <textarea value={postText} onChange={e => setPostText(e.target.value)}
                placeholder="What's on your mind?"
                style={{ width: '100%', background: '#0c1018', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px', padding: '14px', color: '#eef2f7', fontSize: '14px', outline: 'none', resize: 'none', minHeight: '120px', boxSizing: 'border-box' }} />
              <button onClick={sendPost} disabled={!postText.trim() || sending}
                style={{ width: '100%', padding: '14px', background: postText.trim() ? 'linear-gradient(135deg,#00e5ff,#00ff88)' : 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '14px', color: postText.trim() ? '#070a10' : '#4a5568', fontSize: '15px', fontWeight: '800', cursor: postText.trim() ? 'pointer' : 'default', marginTop: '12px' }}>
                {sending ? '⏳ Posting...' : '↗ Post'}
              </button>
            </div>
          </div>
        )}

        {/* Bottom Nav */}
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'rgba(7,10,16,0.98)', borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'space-around', padding: '10px 0 20px', zIndex: 100 }}>
          {[{ icon: '🏠', path: '/feed' }, { icon: '🗺', path: '/map' }, { icon: '📸', path: '/post' }, { icon: '🏆', path: '/leaderboard' }, { icon: '👤', path: '/profile' }].map(item => (
            <div key={item.path} onClick={() => window.location.href = item.path} style={{ fontSize: '22px', cursor: 'pointer', color: '#4a5568' }}>{item.icon}</div>
          ))}
        </div>
      </div>
    )
  }

  // ── LIST VIEW ──────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: '#070a10', color: '#eef2f7', paddingBottom: '90px' }}>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>

      {/* Header */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, background: 'rgba(7,10,16,0.97)', borderBottom: '1px solid rgba(255,255,255,0.07)', zIndex: 100, padding: '12px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
          <button onClick={() => window.history.back()} style={{ background: 'none', border: 'none', color: '#8892a4', fontSize: '22px', cursor: 'pointer' }}>←</button>
          <div style={{ fontSize: '16px', fontWeight: '900', background: 'linear-gradient(90deg,#00e5ff,#00ff88)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', flex: 1 }}>👥 Communities</div>
          <button onClick={() => setShowCreate(true)}
            style={{ padding: '8px 14px', background: 'linear-gradient(135deg,#00e5ff,#00ff88)', border: 'none', borderRadius: '14px', color: '#070a10', fontSize: '13px', fontWeight: '800', cursor: 'pointer' }}>
            + Create
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          {[{ key: 'discover', label: '🔍 Discover' }, { key: 'mine', label: '👥 My Communities' }].map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              style={{ flex: 1, padding: '8px', border: 'none', background: 'transparent', color: activeTab === t.key ? '#00e5ff' : '#4a5568', borderBottom: activeTab === t.key ? '2px solid #00e5ff' : '2px solid transparent', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Bottom Nav */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'rgba(7,10,16,0.98)', borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'space-around', padding: '10px 0 20px', zIndex: 100 }}>
        {[{ icon: '🏠', path: '/feed' }, { icon: '🗺', path: '/map' }, { icon: '📸', path: '/post' }, { icon: '🏆', path: '/leaderboard' }, { icon: '👤', path: '/profile' }].map(item => (
          <div key={item.path} onClick={() => window.location.href = item.path} style={{ fontSize: '22px', cursor: 'pointer', color: '#4a5568' }}>{item.icon}</div>
        ))}
      </div>

      <div style={{ padding: '130px 16px 20px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px' }}>
            <div style={{ fontSize: '32px', animation: 'spin 1s linear infinite' }}>👥</div>
          </div>
        ) : activeTab === 'discover' ? (
          <>
            {/* Category filter */}
            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', scrollbarWidth: 'none', marginBottom: '16px', paddingBottom: '4px' }}>
              {CATEGORIES.map(cat => (
                <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px', borderRadius: '20px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer', whiteSpace: 'nowrap', fontSize: '12px', color: '#8892a4', flexShrink: 0 }}>
                  {CAT_EMOJI[cat]} {cat}
                </div>
              ))}
            </div>
            {communities.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                <div style={{ fontSize: '48px', marginBottom: '12px' }}>👥</div>
                <div style={{ fontSize: '16px', color: '#8892a4', marginBottom: '16px' }}>No communities yet</div>
                <button onClick={() => setShowCreate(true)}
                  style={{ background: 'linear-gradient(135deg,#00e5ff,#00ff88)', border: 'none', borderRadius: '14px', padding: '12px 24px', fontSize: '14px', fontWeight: '700', color: '#070a10', cursor: 'pointer' }}>
                  Create First Community
                </button>
              </div>
            ) : communities.map(com => (
              <CommunityCard key={com.id} com={com} onClick={() => { setActiveCommunity(com); setView('community') }} />
            ))}
          </>
        ) : (
          <>
            {myCommunities.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                <div style={{ fontSize: '48px', marginBottom: '12px' }}>👥</div>
                <div style={{ fontSize: '16px', color: '#8892a4', marginBottom: '16px' }}>You haven't joined any community</div>
                <button onClick={() => setActiveTab('discover')}
                  style={{ background: 'linear-gradient(135deg,#00e5ff,#00ff88)', border: 'none', borderRadius: '14px', padding: '12px 24px', fontSize: '14px', fontWeight: '700', color: '#070a10', cursor: 'pointer' }}>
                  Discover Communities
                </button>
              </div>
            ) : myCommunities.map(com => (
              <CommunityCard key={com.id} com={com} onClick={() => { setActiveCommunity(com); setView('community') }} />
            ))}
          </>
        )}
      </div>

      {/* Create Community Modal */}
      {showCreate && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'flex-end', zIndex: 1000 }} onClick={() => setShowCreate(false)}>
          <div style={{ background: '#111620', borderRadius: '24px 24px 0 0', width: '100%', padding: '24px', maxHeight: '85vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: '16px', fontWeight: '900', marginBottom: '20px' }}>🌍 Create Community</div>

            <div style={{ marginBottom: '14px' }}>
              <div style={{ fontSize: '12px', color: '#4a5568', fontWeight: '700', marginBottom: '6px' }}>COMMUNITY NAME *</div>
              <input value={newCom.name} onChange={e => setNewCom(p => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Dhaka Gamers, BD Foodies..."
                style={{ width: '100%', background: '#0c1018', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '12px 14px', color: '#eef2f7', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
            </div>

            <div style={{ marginBottom: '14px' }}>
              <div style={{ fontSize: '12px', color: '#4a5568', fontWeight: '700', marginBottom: '6px' }}>DESCRIPTION</div>
              <textarea value={newCom.description} onChange={e => setNewCom(p => ({ ...p, description: e.target.value }))}
                placeholder="What is this community about?"
                style={{ width: '100%', background: '#0c1018', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '12px 14px', color: '#eef2f7', fontSize: '14px', outline: 'none', resize: 'none', minHeight: '80px', boxSizing: 'border-box' }} />
            </div>

            <div style={{ marginBottom: '14px' }}>
              <div style={{ fontSize: '12px', color: '#4a5568', fontWeight: '700', marginBottom: '8px' }}>CATEGORY</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {CATEGORIES.map(cat => (
                  <button key={cat} onClick={() => setNewCom(p => ({ ...p, category: cat }))}
                    style={{ padding: '6px 12px', borderRadius: '20px', border: `1px solid ${newCom.category === cat ? '#00e5ff' : 'rgba(255,255,255,0.1)'}`, background: newCom.category === cat ? 'rgba(0,229,255,0.12)' : 'transparent', color: newCom.category === cat ? '#00e5ff' : '#8892a4', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {CAT_EMOJI[cat]} {cat}
                  </button>
                ))}
              </div>
            </div>

            <div onClick={() => setNewCom(p => ({ ...p, is_private: !p.is_private }))}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px', background: '#0c1018', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', cursor: 'pointer', marginBottom: '20px' }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: '700' }}>🔒 Private Community</div>
                <div style={{ fontSize: '12px', color: '#4a5568' }}>Only invited members can join</div>
              </div>
              <div style={{ width: '44px', height: '26px', borderRadius: '13px', background: newCom.is_private ? '#00e5ff' : 'rgba(255,255,255,0.1)', position: 'relative', transition: 'all 0.2s' }}>
                <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#fff', position: 'absolute', top: '3px', left: newCom.is_private ? '21px' : '3px', transition: 'all 0.2s' }} />
              </div>
            </div>

            <button onClick={createCommunity} disabled={!newCom.name.trim() || creating}
              style={{ width: '100%', padding: '15px', background: newCom.name.trim() ? 'linear-gradient(135deg,#00e5ff,#00ff88)' : 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '14px', color: newCom.name.trim() ? '#070a10' : '#4a5568', fontSize: '15px', fontWeight: '800', cursor: newCom.name.trim() ? 'pointer' : 'default' }}>
              {creating ? '⏳ Creating...' : '🌍 Create Community'}
            </button>
            <button onClick={() => setShowCreate(false)}
              style={{ width: '100%', padding: '12px', background: 'transparent', border: 'none', color: '#4a5568', fontSize: '14px', cursor: 'pointer', marginTop: '8px' }}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  )
                                             }
