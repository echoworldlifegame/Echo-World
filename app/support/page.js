'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const ADMIN_EMAIL = 'mdakibgoodboy4@gmail.com'
const DEFAULT_SUPPORT_NAME = 'Echo World Support'

export default function SupportChat() {
  const [user, setUser]             = useState(null)
  const [isAdmin, setIsAdmin]       = useState(false)
  const [myUsername, setMyUsername] = useState('')
  const [messages, setMessages]     = useState([])
  const [input, setInput]           = useState('')
  const [sending, setSending]       = useState(false)
  const [loading, setLoading]       = useState(true)
  // Admin only
  const [conversations, setConversations]       = useState([])
  const [selectedUserId, setSelectedUserId]     = useState(null)
  const [selectedUsername, setSelectedUsername] = useState('')
  const [unreadMap, setUnreadMap]   = useState({})
  const [adminName, setAdminName]   = useState(DEFAULT_SUPPORT_NAME)
  const [showNameEdit, setShowNameEdit] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { window.location.href = '/'; return }
      const u = data.session.user
      setUser(u)
      const admin = u.email === ADMIN_EMAIL
      setIsAdmin(admin)
      const { data: profile } = await supabase
        .from('profiles').select('username, full_name').eq('id', u.id).single()
      setMyUsername(profile?.username || profile?.full_name || u.email?.split('@')[0] || 'User')
      if (admin) {
        await loadConversations()
      } else {
        await loadMessages(u.id)
      }
      setLoading(false)
    })
  }, [])

  // Realtime
  useEffect(() => {
    if (!user) return
    const uid = user.id
    const channel = supabase
      .channel('support_realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'support_messages' }, (payload) => {
        const msg = payload.new
        if (isAdmin) {
          loadConversations()
          // Admin এর selected conversation এ নতুন message এলে add করো
          if (selectedUserId && msg.user_id === selectedUserId) {
            setMessages(prev => {
              // duplicate check
              if (prev.find(m => m.id === msg.id)) return prev
              return [...prev, msg]
            })
            markRead(selectedUserId)
          }
        } else {
          // User নিজের conversation এর যেকোনো message (নিজের বা admin এর)
          if (msg.user_id === uid) {
            setMessages(prev => {
              if (prev.find(m => m.id === msg.id)) return prev
              return [...prev, msg]
            })
            if (msg.sender_role === 'admin') markRead(uid)
          }
        }
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'support_messages' }, () => {
        if (!isAdmin) setMessages([])
        if (isAdmin) loadConversations()
      })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [user, isAdmin, selectedUserId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const loadMessages = async (uid) => {
    const { data } = await supabase
      .from('support_messages')
      .select('*')
      .eq('user_id', uid)
      .order('created_at', { ascending: true })
    setMessages(data || [])
    await markRead(uid)
  }

  const markRead = async (uid) => {
    const role = isAdmin ? 'user' : 'admin'
    await supabase.from('support_messages')
      .update({ read: true })
      .eq('user_id', uid)
      .eq('sender_role', role)
  }

  const clearChat = async (uid) => {
    if (!window.confirm('এই conversation এর সব message delete হয়ে যাবে। নিশ্চিত?')) return
    await supabase.from('support_messages').delete().eq('user_id', uid)
    setMessages([])
    setSelectedUserId(null)
    setSelectedUsername('')
    await loadConversations()
  }

  const loadConversations = async () => {
    const { data } = await supabase
      .from('support_messages')
      .select('user_id, message, created_at, read, sender_role, sender_name, profiles!support_messages_user_id_fkey(username, full_name)')
      .order('created_at', { ascending: false })
    if (!data) return
    const map = {}, unread = {}
    data.forEach(m => {
      if (!map[m.user_id]) map[m.user_id] = m
      if (!m.read && m.sender_role === 'user') unread[m.user_id] = (unread[m.user_id] || 0) + 1
    })
    setConversations(Object.values(map))
    setUnreadMap(unread)
  }

  const sendMessage = async () => {
    if (!input.trim() || sending) return
    setSending(true)
    const uid = isAdmin ? selectedUserId : user.id
    if (!uid) { setSending(false); return }
    const senderName = isAdmin ? adminName : myUsername
    const role = isAdmin ? 'admin' : 'user'

    // Optimistic UI — turant screen এ দেখাবে
    const tempMsg = {
      id: 'temp_' + Date.now(),
      user_id: uid,
      sender_role: role,
      sender_name: senderName,
      message: input.trim(),
      read: false,
      created_at: new Date().toISOString(),
    }
    setMessages(prev => [...prev, tempMsg])
    const sentText = input.trim()
    setInput('')

    const { data: inserted } = await supabase.from('support_messages').insert({
      user_id: uid,
      sender_role: role,
      sender_name: senderName,
      message: sentText,
      read: false,
    }).select().single()

    // temp message কে real message দিয়ে replace করো
    if (inserted) {
      setMessages(prev => prev.map(m => m.id === tempMsg.id ? inserted : m))
    }

    if (isAdmin) {
      await supabase.from('notifications').insert({
        user_id: uid, from_user_id: null, type: 'support_reply',
        message: `💬 Support: ${sentText}`, read: false,
      })
    }
    setSending(false)
  }

  const timeStr = (d) => new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  const dateStr = (d) => new Date(d).toLocaleDateString([], { month: 'short', day: 'numeric' })

  if (loading) return (
    <div style={{ height: '100vh', background: '#050810', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#00e5ff' }}>Loading...</div>
  )

  // ─── ADMIN VIEW ────────────────────────────────────────────
  if (isAdmin) return (
    <div style={{ height: '100vh', background: '#070a12', color: '#eef2f7', display: 'flex', flexDirection: 'column' }}>
      <style>{`*{box-sizing:border-box}::-webkit-scrollbar{display:none}`}</style>

      {/* Header */}
      <div style={{ padding: '14px 16px', background: 'rgba(7,10,18,0.97)', borderBottom: '1px solid rgba(0,229,255,0.12)', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <button onClick={() => selectedUserId ? setSelectedUserId(null) : window.location.href = '/admin'}
          style={{ background: 'none', border: 'none', color: '#8892a4', fontSize: '20px', cursor: 'pointer' }}>←</button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '15px', fontWeight: '900', background: 'linear-gradient(90deg,#00e5ff,#00ff88)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            {selectedUserId ? `💬 @${selectedUsername}` : '💬 Support Inbox'}
          </div>
          {!selectedUserId && <div style={{ fontSize: '11px', color: '#4a5568' }}>{conversations.length} conversations</div>}
        </div>
        {selectedUserId && (
          <div onClick={() => setShowNameEdit(p => !p)}
            style={{ background: 'rgba(0,229,255,0.08)', border: '1px solid rgba(0,229,255,0.2)', borderRadius: '10px', padding: '5px 10px', cursor: 'pointer', fontSize: '11px', color: '#00e5ff', fontWeight: '700' }}>
            🪪 {adminName}
          </div>
        )}
        {selectedUserId && (
          <div onClick={() => clearChat(selectedUserId)}
            style={{ background: 'rgba(255,69,96,0.1)', border: '1px solid rgba(255,69,96,0.25)', borderRadius: '10px', padding: '5px 10px', cursor: 'pointer', fontSize: '11px', color: '#ff4560', fontWeight: '700' }}>
            🗑 End Chat
          </div>
        )}
        {!selectedUserId && Object.values(unreadMap).reduce((s, v) => s + v, 0) > 0 && (
          <div style={{ background: '#ff4560', borderRadius: '20px', padding: '2px 10px', fontSize: '11px', fontWeight: '700' }}>
            {Object.values(unreadMap).reduce((s, v) => s + v, 0)} new
          </div>
        )}
      </div>

      {/* Name edit box */}
      {showNameEdit && selectedUserId && (
        <div style={{ background: '#111826', border: '1px solid rgba(0,229,255,0.15)', margin: '8px 12px', borderRadius: '12px', padding: '10px', display: 'flex', gap: '8px', alignItems: 'center' }}>
          <div style={{ fontSize: '11px', color: '#4a5568', whiteSpace: 'nowrap' }}>নাম:</div>
          <input value={adminName} onChange={e => setAdminName(e.target.value)}
            placeholder="Display name..."
            style={{ flex: 1, background: '#0c1018', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '7px 10px', color: '#eef2f7', fontSize: '13px', outline: 'none' }} />
          <button onClick={() => setShowNameEdit(false)}
            style={{ padding: '7px 14px', background: 'linear-gradient(135deg,#00e5ff,#00ff88)', border: 'none', borderRadius: '8px', color: '#050810', fontSize: '12px', fontWeight: '800', cursor: 'pointer' }}>Save</button>
        </div>
      )}

      {/* Conversation list or chat */}
      {!selectedUserId ? (
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
          {conversations.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px', color: '#4a5568' }}>
              <div style={{ fontSize: '40px', marginBottom: '10px' }}>💬</div>
              <div>No support messages yet</div>
            </div>
          ) : conversations.map(conv => {
            const uname = conv.profiles?.username || conv.profiles?.full_name || conv.user_id?.slice(0, 8)
            return (
              <div key={conv.user_id}
                onClick={async () => { setSelectedUserId(conv.user_id); setSelectedUsername(uname); await loadMessages(conv.user_id) }}
                style={{ background: '#111826', border: `1px solid ${unreadMap[conv.user_id] ? 'rgba(0,229,255,0.3)' : 'rgba(255,255,255,0.06)'}`, borderRadius: '14px', padding: '13px', marginBottom: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'linear-gradient(135deg,#7c3aed,#a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: '900', color: '#fff', flexShrink: 0 }}>
                  {uname?.[0]?.toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: '700', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>@{uname}</span>
                    {unreadMap[conv.user_id] > 0 && <span style={{ background: '#00e5ff', color: '#050810', borderRadius: '20px', padding: '1px 8px', fontSize: '10px', fontWeight: '800' }}>{unreadMap[conv.user_id]} new</span>}
                  </div>
                  <div style={{ fontSize: '11px', color: '#4a5568', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '2px' }}>
                    {conv.sender_role === 'admin' ? `${conv.sender_name || 'Support'}: ` : `@${uname}: `}{conv.message}
                  </div>
                  <div style={{ fontSize: '10px', color: '#2a3040', marginTop: '2px' }}>{timeStr(conv.created_at)}</div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <>
          <div style={{ flex: 1, overflowY: 'auto', padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {messages.map((msg, i) => {
              const isMe = msg.sender_role === 'admin'  // admin এর কাছে: admin message = নিজের
              const showDate = i === 0 || dateStr(messages[i - 1]?.created_at) !== dateStr(msg.created_at)
              const displayName = isMe
                ? (msg.sender_name || DEFAULT_SUPPORT_NAME)
                : (msg.sender_name || `@${selectedUsername}`)
              return (
                <div key={msg.id}>
                  {showDate && <div style={{ textAlign: 'center', fontSize: '10px', color: '#2a3040', margin: '6px 0' }}>{dateStr(msg.created_at)}</div>}
                  <div style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start', alignItems: 'flex-end', gap: '6px' }}>
                    {/* User avatar — বাম দিকে */}
                    {!isMe && (
                      <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'linear-gradient(135deg,#7c3aed,#a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '900', color: '#fff', flexShrink: 0 }}>
                        {displayName?.[0]?.toUpperCase()}
                      </div>
                    )}
                    <div style={{ maxWidth: '75%' }}>
                      <div style={{ fontSize: '10px', fontWeight: '700', marginBottom: '3px', color: isMe ? '#00e5ff' : '#a855f7', textAlign: isMe ? 'right' : 'left' }}>
                        {displayName}
                      </div>
                      <div style={{
                        background: isMe ? 'linear-gradient(135deg,#00e5ff,#00ff88)' : '#1e2535',
                        borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                        padding: '10px 14px', fontSize: '13px',
                        color: isMe ? '#050810' : '#eef2f7',
                        fontWeight: isMe ? '600' : '400', lineHeight: '1.5',
                        opacity: msg.id?.toString().startsWith('temp_') ? 0.7 : 1,
                      }}>
                        {msg.message}
                      </div>
                      <div style={{ fontSize: '10px', color: '#2a3040', marginTop: '3px', textAlign: isMe ? 'right' : 'left' }}>
                        {msg.id?.toString().startsWith('temp_') ? 'Sending...' : timeStr(msg.created_at)}
                      </div>
                    </div>
                    {/* Admin avatar — ডান দিকে */}
                    {isMe && (
                      <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'linear-gradient(135deg,#00e5ff,#00ff88)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: '900', color: '#050810', flexShrink: 0 }}>EW</div>
                    )}
                  </div>
                </div>
              )
            })}
            <div ref={bottomRef} />
          </div>
          <div style={{ padding: '12px 14px 28px', background: 'rgba(7,10,18,0.97)', borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
            <textarea value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendMessage())}
              placeholder={`Reply as ${adminName}...`} rows={1}
              style={{ flex: 1, background: '#111826', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px', padding: '11px 14px', color: '#eef2f7', fontSize: '13px', outline: 'none', resize: 'none', lineHeight: '1.5' }} />
            <button onClick={sendMessage} disabled={!input.trim() || sending}
              style={{ padding: '11px 16px', background: input.trim() ? 'linear-gradient(135deg,#00e5ff,#00ff88)' : 'rgba(255,255,255,0.06)', border: 'none', borderRadius: '14px', color: input.trim() ? '#050810' : '#4a5568', fontSize: '16px', cursor: input.trim() ? 'pointer' : 'default', flexShrink: 0 }}>➤</button>
          </div>
        </>
      )}
    </div>
  )

  // ─── USER VIEW ─────────────────────────────────────────────
  return (
    <div style={{ height: '100vh', background: '#050810', color: '#eef2f7', display: 'flex', flexDirection: 'column' }}>
      <style>{`*{box-sizing:border-box}::-webkit-scrollbar{display:none}`}</style>

      <div style={{ padding: '14px 16px', background: 'rgba(5,8,16,0.97)', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button onClick={() => window.location.href = '/invest'} style={{ background: 'none', border: 'none', color: '#8892a4', fontSize: '20px', cursor: 'pointer' }}>←</button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg,#00e5ff,#00ff88)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '900', color: '#050810' }}>EW</div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: '800' }}>Echo World Support</div>
            <div style={{ fontSize: '10px', color: '#00ff88' }}>● Online · replies within 24h</div>
          </div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#4a5568' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>👋</div>
            <div style={{ fontSize: '14px', fontWeight: '700', marginBottom: '6px', color: '#8892a4' }}>Welcome to Echo World Support!</div>
            <div style={{ fontSize: '12px', lineHeight: '1.7' }}>Ask us anything about your investment,<br />deposits, withdrawals, or salary program.<br />We typically reply within 24 hours.</div>
          </div>
        )}

        {messages.map((msg, i) => {
          const isMe = msg.sender_role === 'user'  // user এর কাছে: user message = নিজের
          const isAdminMsg = msg.sender_role === 'admin'
          const showDate = i === 0 || dateStr(messages[i - 1]?.created_at) !== dateStr(msg.created_at)
          const displayName = isAdminMsg
            ? (msg.sender_name || DEFAULT_SUPPORT_NAME)
            : (msg.sender_name || myUsername)

          return (
            <div key={msg.id}>
              {showDate && <div style={{ textAlign: 'center', fontSize: '10px', color: '#2a3040', margin: '4px 0' }}>{dateStr(msg.created_at)}</div>}
              <div style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start', alignItems: 'flex-end', gap: '8px' }}>

                {/* Admin avatar — বাম দিকে */}
                {isAdminMsg && (
                  <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'linear-gradient(135deg,#00e5ff,#00ff88)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: '900', color: '#050810', flexShrink: 0 }}>EW</div>
                )}

                <div style={{ maxWidth: '72%' }}>
                  {/* Name */}
                  <div style={{ fontSize: '10px', fontWeight: '700', marginBottom: '3px', color: isAdminMsg ? '#00e5ff' : '#a855f7', textAlign: isMe ? 'right' : 'left' }}>
                    {displayName}
                  </div>
                  {/* Bubble */}
                  <div style={{
                    background: isMe ? 'linear-gradient(135deg,#7c3aed,#a855f7)' : '#1a2030',
                    borderRadius: isMe ? '18px 18px 4px 18px' : '4px 18px 18px 18px',
                    padding: '10px 14px', fontSize: '13px', color: '#eef2f7', lineHeight: '1.5',
                    opacity: msg.id?.toString().startsWith('temp_') ? 0.7 : 1,
                  }}>
                    {msg.message}
                  </div>
                  {/* Time */}
                  <div style={{ fontSize: '10px', color: '#2a3040', marginTop: '3px', textAlign: isMe ? 'right' : 'left' }}>
                    {msg.id?.toString().startsWith('temp_') ? 'Sending...' : timeStr(msg.created_at)}
                    {isMe && !msg.id?.toString().startsWith('temp_') && (msg.read ? ' ✓✓' : ' ✓')}
                  </div>
                </div>

                {/* User avatar — ডান দিকে */}
                {isMe && (
                  <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'linear-gradient(135deg,#7c3aed,#a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '900', color: '#fff', flexShrink: 0 }}>
                    {myUsername?.[0]?.toUpperCase() || 'U'}
                  </div>
                )}
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      <div style={{ padding: '12px 14px 32px', background: 'rgba(5,8,16,0.97)', borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
        <textarea value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendMessage())}
          placeholder='Type a message...' rows={1}
          style={{ flex: 1, background: '#111826', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', padding: '11px 16px', color: '#eef2f7', fontSize: '13px', outline: 'none', resize: 'none', lineHeight: '1.5', maxHeight: '100px' }} />
        <button onClick={sendMessage} disabled={!input.trim() || sending}
          style={{ width: '44px', height: '44px', borderRadius: '50%', background: input.trim() ? 'linear-gradient(135deg,#7c3aed,#a855f7)' : 'rgba(255,255,255,0.07)', border: 'none', color: '#fff', fontSize: '18px', cursor: input.trim() ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>➤</button>
      </div>
    </div>
  )
    }
