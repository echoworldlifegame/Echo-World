'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default function DM() {
  const [user, setUser] = useState(null)
  const [conversations, setConversations] = useState([])
  const [activeConv, setActiveConv] = useState(null)
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [search, setSearch] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [loading, setLoading] = useState(true)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)
  const realtimeRef = useRef(null)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { window.location.href = '/'; return }
      const u = data.session.user
      setUser(u)
      await loadConversations(u.id)
      setLoading(false)
    })
    return () => { realtimeRef.current?.unsubscribe() }
  }, [])

  useEffect(() => {
    if (activeConv && user) {
      loadMessages(activeConv.id, user.id)
      subscribeMessages(activeConv.id)
    }
  }, [activeConv])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Check URL for userId param — direct message from profile
  useEffect(() => {
    if (!user) return
    const params = new URLSearchParams(window.location.search)
    const userId = params.get('user')
    if (userId) {
      supabase.from('profiles').select('*').eq('id', userId).single().then(({ data }) => {
        if (data) startConversation(data)
      })
    }
  }, [user])

  const loadConversations = async (uid) => {
    const { data } = await supabase
      .from('conversations')
      .select(`*, user1:profiles!conversations_user1_id_fkey(id,username,full_name,avatar_url), user2:profiles!conversations_user2_id_fkey(id,username,full_name,avatar_url)`)
      .or(`user1_id.eq.${uid},user2_id.eq.${uid}`)
      .order('last_message_at', { ascending: false })
    setConversations(data || [])
  }

  const loadMessages = async (convId, uid) => {
    const { data } = await supabase
      .from('messages').select('*').eq('conversation_id', convId)
      .order('created_at', { ascending: true })
    setMessages(data || [])
    await supabase.from('messages').update({ read: true })
      .eq('conversation_id', convId).neq('sender_id', uid)
  }

  const subscribeMessages = (convId) => {
    realtimeRef.current?.unsubscribe()
    realtimeRef.current = supabase
      .channel(`messages:${convId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${convId}` },
        payload => setMessages(prev => [...prev, payload.new]))
      .subscribe()
  }

  const searchUsers = async (q) => {
    if (!q.trim()) { setSearchResults([]); return }
    setSearching(true)
    const { data } = await supabase.from('profiles').select('id,username,full_name,avatar_url')
      .or(`username.ilike.%${q}%,full_name.ilike.%${q}%`).neq('id', user.id).limit(10)
    setSearchResults(data || [])
    setSearching(false)
  }

  const startConversation = async (otherUser) => {
    const user1_id = user.id < otherUser.id ? user.id : otherUser.id
    const user2_id = user.id < otherUser.id ? otherUser.id : user.id
    const { data: existing } = await supabase.from('conversations').select('*')
      .eq('user1_id', user1_id).eq('user2_id', user2_id).single()
    if (existing) {
      setActiveConv({ ...existing, other: otherUser })
    } else {
      const { data: newConv } = await supabase.from('conversations')
        .insert({ user1_id, user2_id }).select().single()
      if (newConv) {
        setActiveConv({ ...newConv, other: otherUser })
        await loadConversations(user.id)
      }
    }
    setSearch('')
    setSearchResults([])
  }

  const sendMessage = async () => {
    if (!text.trim() || !activeConv || !user || sending) return
    setSending(true)
    const { data: msg } = await supabase.from('messages').insert({
      conversation_id: activeConv.id,
      sender_id: user.id,
      content: text.trim(),
    }).select().single()
    if (msg) {
      setMessages(prev => [...prev, msg])
      await supabase.from('conversations').update({
        last_message: text.trim().slice(0, 100),
        last_message_at: new Date().toISOString()
      }).eq('id', activeConv.id)
      await loadConversations(user.id)
      await supabase.from('notifications').insert({
        user_id: activeConv.other.id, from_user_id: user.id,
        type: 'message', message: text.trim().slice(0, 100)
      })
    }
    setText('')
    setSending(false)
    inputRef.current?.focus()
  }

  const getOther = (conv) => conv.other || (conv.user1_id === user?.id ? conv.user2 : conv.user1)

  const timeAgo = (date) => {
    const s = Math.floor((new Date() - new Date(date)) / 1000)
    if (s < 60) return 'এইমাত্র'
    if (s < 3600) return Math.floor(s / 60) + 'মি'
    if (s < 86400) return Math.floor(s / 3600) + 'ঘ'
    return Math.floor(s / 86400) + 'দিন'
  }

  const Avatar = ({ profile, size = 44 }) => (
    <div style={{ width: size, height: size, borderRadius: '50%', background: 'linear-gradient(135deg,#00e5ff,#00ff88)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0, border: '2px solid rgba(0,229,255,0.2)' }}>
      {profile?.avatar_url
        ? <img src={profile.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : <span style={{ fontSize: size * 0.35, fontWeight: '800', color: '#070a10' }}>{(profile?.full_name || profile?.username || 'E')[0].toUpperCase()}</span>}
    </div>
  )

  // ── CHAT VIEW ──────────────────────────────────────────────
  if (activeConv) {
    const other = getOther(activeConv)
    return (
      <div style={{ height: '100vh', background: '#070a10', display: 'flex', flexDirection: 'column' }}>
        <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}`}</style>

        {/* Header */}
        <div style={{ background: 'rgba(7,10,16,0.97)', borderBottom: '1px solid rgba(255,255,255,0.07)', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
          <button onClick={() => { setActiveConv(null); realtimeRef.current?.unsubscribe() }}
            style={{ background: 'none', border: 'none', color: '#8892a4', fontSize: '22px', cursor: 'pointer' }}>←</button>
          <div onClick={() => window.location.href = `/user/${other?.id}`} style={{ cursor: 'pointer' }}>
            <Avatar profile={other} size={42} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }} onClick={() => window.location.href = `/user/${other?.id}`} >
            <div style={{ fontSize: '15px', fontWeight: '700', color: '#eef2f7' }}>{other?.full_name || other?.username}</div>
            <div style={{ fontSize: '11px', color: '#00e5ff' }}>@{other?.username}</div>
          </div>
          <button onClick={() => window.location.href = `/user/${other?.id}`}
            style={{ background: 'rgba(0,229,255,0.1)', border: '1px solid rgba(0,229,255,0.2)', borderRadius: '10px', padding: '6px 12px', color: '#00e5ff', fontSize: '12px', cursor: 'pointer', fontWeight: '600' }}>
            👤 Profile
          </button>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 12px' }}>
          {messages.length === 0 && (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <Avatar profile={other} size={72} />
              <div style={{ fontSize: '16px', fontWeight: '700', marginTop: '16px', marginBottom: '6px' }}>{other?.full_name || other?.username}</div>
              <div style={{ fontSize: '13px', color: '#4a5568' }}>@{other?.username}</div>
              <div style={{ fontSize: '13px', color: '#4a5568', marginTop: '12px' }}>Say hello! 👋</div>
            </div>
          )}
          {messages.map((msg, i) => {
            const isMine = msg.sender_id === user?.id
            const showTime = i === 0 || (new Date(msg.created_at) - new Date(messages[i - 1].created_at)) > 300000
            const showAvatar = !isMine && (i === messages.length - 1 || messages[i + 1]?.sender_id !== msg.sender_id)
            return (
              <div key={msg.id} style={{ animation: 'fadeIn 0.2s ease' }}>
                {showTime && (
                  <div style={{ textAlign: 'center', fontSize: '11px', color: '#4a5568', margin: '12px 0 8px' }}>
                    {timeAgo(msg.created_at)}
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start', alignItems: 'flex-end', gap: '6px', marginBottom: '3px' }}>
                  {!isMine && (
                    <div style={{ width: 28, height: 28, flexShrink: 0, opacity: showAvatar ? 1 : 0 }}>
                      <Avatar profile={other} size={28} />
                    </div>
                  )}
                  <div style={{
                    maxWidth: '72%',
                    padding: '10px 14px',
                    borderRadius: isMine ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                    background: isMine ? 'linear-gradient(135deg,#00e5ff,#00ff88)' : 'rgba(255,255,255,0.08)',
                    color: isMine ? '#070a10' : '#eef2f7',
                    fontSize: '14px',
                    lineHeight: '1.5',
                    fontWeight: isMine ? '500' : '400',
                    wordBreak: 'break-word',
                    boxShadow: isMine ? '0 2px 12px rgba(0,229,255,0.25)' : 'none',
                    border: isMine ? 'none' : '1px solid rgba(255,255,255,0.06)',
                  }}>
                    {msg.content}
                  </div>
                  {isMine && (
                    <span style={{ fontSize: '10px', color: '#4a5568', flexShrink: 0, marginBottom: '2px' }}>
                      {msg.read ? '✓✓' : '✓'}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div style={{ background: 'rgba(7,10,16,0.98)', borderTop: '1px solid rgba(255,255,255,0.07)', padding: '12px', display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
          <input ref={inputRef} value={text} onChange={e => setText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            placeholder={`Message ${other?.username}...`}
            style={{ flex: 1, background: '#111620', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '24px', padding: '12px 18px', color: '#eef2f7', fontSize: '14px', outline: 'none' }} />
          <button onClick={sendMessage} disabled={!text.trim() || sending}
            style={{ width: '46px', height: '46px', borderRadius: '50%', background: text.trim() ? 'linear-gradient(135deg,#00e5ff,#00ff88)' : 'rgba(255,255,255,0.05)', border: 'none', fontSize: '20px', cursor: text.trim() ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.2s' }}>
            {sending ? '⏳' : '↗'}
          </button>
        </div>
      </div>
    )
  }

  // ── CONVERSATIONS LIST ─────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: '#070a10', color: '#eef2f7' }}>
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, background: 'rgba(7,10,16,0.97)', borderBottom: '1px solid rgba(255,255,255,0.07)', zIndex: 100, padding: '12px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
          <button onClick={() => window.history.back()} style={{ background: 'none', border: 'none', color: '#8892a4', fontSize: '22px', cursor: 'pointer' }}>←</button>
          <div style={{ fontSize: '16px', fontWeight: '900', background: 'linear-gradient(90deg,#00e5ff,#00ff88)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', flex: 1 }}>💬 Messages</div>
        </div>
        <div style={{ position: 'relative' }}>
          <input value={search} onChange={e => { setSearch(e.target.value); searchUsers(e.target.value) }}
            placeholder="🔍 Search people to message..."
            style={{ width: '100%', background: '#111620', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px', padding: '10px 16px', color: '#eef2f7', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
          {searching && <div style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '14px' }}>⏳</div>}
        </div>
        {searchResults.length > 0 && (
          <div style={{ background: '#111620', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px', marginTop: '8px', overflow: 'hidden', maxHeight: '240px', overflowY: 'auto' }}>
            {searchResults.map(u => (
              <div key={u.id} onClick={() => startConversation(u)}
                style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <Avatar profile={u} size={38} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', fontWeight: '700' }}>{u.full_name || u.username}</div>
                  <div style={{ fontSize: '11px', color: '#4a5568' }}>@{u.username}</div>
                </div>
                <div style={{ fontSize: '20px' }}>💬</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'rgba(7,10,16,0.98)', borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'space-around', padding: '10px 0 20px', zIndex: 100 }}>
        {[{ icon: '🏠', path: '/feed' }, { icon: '🗺', path: '/map' }, { icon: '📸', path: '/post' }, { icon: '🏆', path: '/leaderboard' }, { icon: '👤', path: '/profile' }].map(item => (
          <div key={item.path} onClick={() => window.location.href = item.path} style={{ fontSize: '22px', cursor: 'pointer', color: '#4a5568' }}>{item.icon}</div>
        ))}
      </div>

      <div style={{ padding: '150px 0 90px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px' }}>
            <div style={{ fontSize: '32px', animation: 'spin 1s linear infinite' }}>💬</div>
            <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
          </div>
        ) : conversations.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: '56px', marginBottom: '16px' }}>💬</div>
            <div style={{ fontSize: '18px', fontWeight: '700', marginBottom: '8px' }}>No messages yet</div>
            <div style={{ fontSize: '14px', color: '#4a5568' }}>Search someone to start chatting!</div>
          </div>
        ) : conversations.map(conv => {
          const other = getOther(conv)
          return (
            <div key={conv.id} onClick={() => setActiveConv({ ...conv, other })}
              style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)', cursor: 'pointer' }}>
              <div style={{ position: 'relative' }}>
                <Avatar profile={other} size={52} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                  <div style={{ fontSize: '14px', fontWeight: '700' }}>{other?.full_name || other?.username}</div>
                  <div style={{ fontSize: '11px', color: '#4a5568' }}>{timeAgo(conv.last_message_at)}</div>
                </div>
                <div style={{ fontSize: '13px', color: '#4a5568', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {conv.last_message || 'Start a conversation...'}
                </div>
              </div>
              <div style={{ fontSize: '16px', color: '#4a5568' }}>›</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
