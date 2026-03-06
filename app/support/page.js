'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const ADMIN_EMAIL = 'mdakibgoodboy4@gmail.com'

export default function SupportChat() {
  const [user, setUser]       = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput]     = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  // Admin only — list of all conversations
  const [conversations, setConversations] = useState([])
  const [selectedUserId, setSelectedUserId] = useState(null)
  const [selectedUsername, setSelectedUsername] = useState('')
  const [unreadMap, setUnreadMap] = useState({})
  const bottomRef = useRef(null)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { window.location.href = '/'; return }
      const u = data.session.user
      setUser(u)
      const admin = u.email === ADMIN_EMAIL
      setIsAdmin(admin)
      if (admin) {
        await loadConversations()
      } else {
        await loadMessages(u.id)
      }
      setLoading(false)
    })
  }, [])

  // Realtime subscription
  useEffect(() => {
    if (!user) return
    const channel = supabase
      .channel('support_chat')
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'support_messages',
        filter: isAdmin ? undefined : `user_id=eq.${user.id}`,
      }, (payload) => {
        if (isAdmin) {
          loadConversations()
          if (selectedUserId && payload.new.user_id === selectedUserId) {
            setMessages(prev => [...prev, payload.new])
            markRead(selectedUserId)
          }
        } else {
          setMessages(prev => [...prev, payload.new])
          markRead(user.id)
        }
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior:'smooth' }), 100)
      })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [user, isAdmin, selectedUserId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior:'smooth' })
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

  const loadConversations = async () => {
    // Get distinct user_ids with latest message
    const { data } = await supabase
      .from('support_messages')
      .select('user_id, message, created_at, read, sender_role, profiles!support_messages_user_id_fkey(username, full_name, avatar_url)')
      .order('created_at', { ascending: false })

    if (!data) return
    // Group by user_id, keep latest
    const map = {}
    const unread = {}
    data.forEach(m => {
      if (!map[m.user_id]) map[m.user_id] = m
      if (!m.read && m.sender_role === 'user') {
        unread[m.user_id] = (unread[m.user_id] || 0) + 1
      }
    })
    setConversations(Object.values(map))
    setUnreadMap(unread)
  }

  const sendMessage = async () => {
    if (!input.trim() || sending) return
    setSending(true)
    const uid = isAdmin ? selectedUserId : user.id
    if (!uid) { setSending(false); return }

    await supabase.from('support_messages').insert({
      user_id: uid,
      sender_role: isAdmin ? 'admin' : 'user',
      message: input.trim(),
      read: false,
    })

    // Notify user if admin sends
    if (isAdmin) {
      await supabase.from('notifications').insert({
        user_id: uid,
        from_user_id: null,
        type: 'system',
        message: `🌐 Echo World Support: ${input.trim()}`,
        read: false,
      })
    }

    setInput('')
    setSending(false)
  }

  const timeStr = (d) => new Date(d).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })
  const dateStr = (d) => new Date(d).toLocaleDateString([], { month:'short', day:'numeric' })

  if (loading) return (
    <div style={{ height:'100vh', background:'#050810', display:'flex', alignItems:'center', justifyContent:'center', color:'#00e5ff' }}>Loading...</div>
  )

  // ── ADMIN VIEW ──────────────────────────────────────────
  if (isAdmin) return (
    <div style={{ height:'100vh', background:'#070a12', color:'#eef2f7', display:'flex', flexDirection:'column' }}>
      <style>{`*{box-sizing:border-box}::-webkit-scrollbar{display:none}`}</style>
      <div style={{ padding:'14px 16px', background:'rgba(7,10,18,0.97)', borderBottom:'1px solid rgba(0,229,255,0.12)', display:'flex', alignItems:'center', gap:'12px' }}>
        <button onClick={() => selectedUserId ? setSelectedUserId(null) : window.location.href='/admin'}
          style={{ background:'none', border:'none', color:'#8892a4', fontSize:'20px', cursor:'pointer' }}>←</button>
        <div>
          <div style={{ fontSize:'15px', fontWeight:'900', background:'linear-gradient(90deg,#00e5ff,#00ff88)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
            {selectedUserId ? `💬 @${selectedUsername}` : '💬 Support Inbox'}
          </div>
          {!selectedUserId && <div style={{ fontSize:'11px', color:'#4a5568' }}>{conversations.length} conversations</div>}
        </div>
        {Object.values(unreadMap).reduce((s,v)=>s+v,0) > 0 && !selectedUserId && (
          <div style={{ marginLeft:'auto', background:'#ff4560', borderRadius:'20px', padding:'2px 10px', fontSize:'11px', fontWeight:'700' }}>
            {Object.values(unreadMap).reduce((s,v)=>s+v,0)} new
          </div>
        )}
      </div>

      {!selectedUserId ? (
        // Conversation list
        <div style={{ flex:1, overflowY:'auto', padding:'12px' }}>
          {conversations.length === 0 ? (
            <div style={{ textAlign:'center', padding:'60px', color:'#4a5568' }}>
              <div style={{ fontSize:'40px', marginBottom:'10px' }}>💬</div>
              <div>No support messages yet</div>
            </div>
          ) : conversations.map(conv => (
            <div key={conv.user_id} onClick={async () => { setSelectedUserId(conv.user_id); setSelectedUsername(conv.profiles?.username || conv.user_id.slice(0,8)); await loadMessages(conv.user_id) }}
              style={{ background:'#111826', border:`1px solid ${unreadMap[conv.user_id] ? 'rgba(0,229,255,0.3)' : 'rgba(255,255,255,0.06)'}`, borderRadius:'14px', padding:'13px', marginBottom:'8px', cursor:'pointer', display:'flex', alignItems:'center', gap:'12px' }}>
              <div style={{ width:'42px', height:'42px', borderRadius:'50%', background:'linear-gradient(135deg,#00e5ff,#00ff88)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'16px', fontWeight:'900', color:'#050810', flexShrink:0 }}>
                {(conv.profiles?.full_name || conv.profiles?.username || '?')[0].toUpperCase()}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:'13px', fontWeight:'700', display:'flex', justifyContent:'space-between' }}>
                  <span>@{conv.profiles?.username}</span>
                  {unreadMap[conv.user_id] > 0 && <span style={{ background:'#00e5ff', color:'#050810', borderRadius:'20px', padding:'1px 8px', fontSize:'10px', fontWeight:'800' }}>{unreadMap[conv.user_id]}</span>}
                </div>
                <div style={{ fontSize:'11px', color:'#4a5568', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', marginTop:'2px' }}>
                  {conv.sender_role === 'admin' ? '(You): ' : ''}{conv.message}
                </div>
                <div style={{ fontSize:'10px', color:'#2a3040', marginTop:'2px' }}>{timeStr(conv.created_at)}</div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        // Chat window
        <>
          <div style={{ flex:1, overflowY:'auto', padding:'14px', display:'flex', flexDirection:'column', gap:'10px' }}>
            {messages.map((msg, i) => {
              const isAdminMsg = msg.sender_role === 'admin'
              const showDate = i === 0 || dateStr(messages[i-1]?.created_at) !== dateStr(msg.created_at)
              return (
                <div key={msg.id}>
                  {showDate && <div style={{ textAlign:'center', fontSize:'10px', color:'#2a3040', margin:'6px 0' }}>{dateStr(msg.created_at)}</div>}
                  <div style={{ display:'flex', justifyContent: isAdminMsg ? 'flex-end' : 'flex-start' }}>
                    <div style={{ maxWidth:'75%' }}>
                      <div style={{ background: isAdminMsg ? 'linear-gradient(135deg,#00e5ff,#00ff88)' : '#1a2030', borderRadius: isAdminMsg ? '18px 18px 4px 18px' : '18px 18px 18px 4px', padding:'11px 14px', fontSize:'13px', color: isAdminMsg ? '#050810' : '#eef2f7', fontWeight: isAdminMsg ? '600' : '400', lineHeight:'1.5' }}>
                        {msg.message}
                      </div>
                      <div style={{ fontSize:'10px', color:'#2a3040', marginTop:'3px', textAlign: isAdminMsg ? 'right' : 'left' }}>
                        {isAdminMsg ? 'Echo World Support' : `@${selectedUsername}`} · {timeStr(msg.created_at)}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
            <div ref={bottomRef} />
          </div>

          <div style={{ padding:'12px 14px 28px', background:'rgba(7,10,18,0.97)', borderTop:'1px solid rgba(255,255,255,0.07)', display:'flex', gap:'10px', alignItems:'flex-end' }}>
            <textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key==='Enter' && !e.shiftKey && (e.preventDefault(), sendMessage())} placeholder='Reply as Echo World Support...' rows={1}
              style={{ flex:1, background:'#111826', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'14px', padding:'11px 14px', color:'#eef2f7', fontSize:'13px', outline:'none', resize:'none', lineHeight:'1.5' }} />
            <button onClick={sendMessage} disabled={!input.trim() || sending}
              style={{ padding:'11px 16px', background: input.trim() ? 'linear-gradient(135deg,#00e5ff,#00ff88)' : 'rgba(255,255,255,0.06)', border:'none', borderRadius:'14px', color: input.trim() ? '#050810' : '#4a5568', fontSize:'16px', cursor: input.trim() ? 'pointer' : 'default', flexShrink:0 }}>
              ➤
            </button>
          </div>
        </>
      )}
    </div>
  )

  // ── USER VIEW ───────────────────────────────────────────
  return (
    <div style={{ height:'100vh', background:'#050810', color:'#eef2f7', display:'flex', flexDirection:'column' }}>
      <style>{`*{box-sizing:border-box}::-webkit-scrollbar{display:none}`}</style>
      <div style={{ padding:'14px 16px', background:'rgba(5,8,16,0.97)', borderBottom:'1px solid rgba(255,255,255,0.07)', display:'flex', alignItems:'center', gap:'12px' }}>
        <button onClick={() => window.location.href='/invest'} style={{ background:'none', border:'none', color:'#8892a4', fontSize:'20px', cursor:'pointer' }}>←</button>
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
            <div style={{ width:'32px', height:'32px', borderRadius:'50%', background:'linear-gradient(135deg,#00e5ff,#00ff88)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'14px', fontWeight:'900', color:'#050810' }}>EW</div>
            <div>
              <div style={{ fontSize:'14px', fontWeight:'800' }}>Echo World Support</div>
              <div style={{ fontSize:'10px', color:'#00ff88' }}>● Online · replies within 24h</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ flex:1, overflowY:'auto', padding:'14px', display:'flex', flexDirection:'column', gap:'10px' }}>
        {messages.length === 0 && (
          <div style={{ textAlign:'center', padding:'40px 20px', color:'#4a5568' }}>
            <div style={{ fontSize:'40px', marginBottom:'12px' }}>👋</div>
            <div style={{ fontSize:'14px', fontWeight:'700', marginBottom:'6px', color:'#8892a4' }}>Welcome to Echo World Support!</div>
            <div style={{ fontSize:'12px', lineHeight:'1.7' }}>
              Ask us anything about your investment,<br/>deposits, withdrawals, or salary program.<br/>We typically reply within 24 hours.
            </div>
          </div>
        )}
        {messages.map((msg, i) => {
          const isAdminMsg = msg.sender_role === 'admin'
          const showDate = i === 0 || dateStr(messages[i-1]?.created_at) !== dateStr(msg.created_at)
          return (
            <div key={msg.id}>
              {showDate && <div style={{ textAlign:'center', fontSize:'10px', color:'#2a3040', margin:'4px 0' }}>{dateStr(msg.created_at)}</div>}
              <div style={{ display:'flex', justifyContent: isAdminMsg ? 'flex-start' : 'flex-end', alignItems:'flex-end', gap:'8px' }}>
                {isAdminMsg && (
                  <div style={{ width:'28px', height:'28px', borderRadius:'50%', background:'linear-gradient(135deg,#00e5ff,#00ff88)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'11px', fontWeight:'900', color:'#050810', flexShrink:0 }}>EW</div>
                )}
                <div style={{ maxWidth:'72%' }}>
                  {isAdminMsg && <div style={{ fontSize:'10px', color:'#00e5ff', fontWeight:'700', marginBottom:'4px' }}>Echo World Support</div>}
                  <div style={{ background: isAdminMsg ? '#1a2030' : 'linear-gradient(135deg,#00e5ff,#00ff88)', borderRadius: isAdminMsg ? '4px 18px 18px 18px' : '18px 18px 4px 18px', padding:'11px 14px', fontSize:'13px', color: isAdminMsg ? '#eef2f7' : '#050810', lineHeight:'1.5' }}>
                    {msg.message}
                  </div>
                  <div style={{ fontSize:'10px', color:'#2a3040', marginTop:'3px', textAlign: isAdminMsg ? 'left' : 'right' }}>
                    {timeStr(msg.created_at)} {!isAdminMsg && (msg.read ? '✓✓' : '✓')}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      <div style={{ padding:'12px 14px 32px', background:'rgba(5,8,16,0.97)', borderTop:'1px solid rgba(255,255,255,0.07)', display:'flex', gap:'10px', alignItems:'flex-end' }}>
        <textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key==='Enter' && !e.shiftKey && (e.preventDefault(), sendMessage())} placeholder='Type a message...' rows={1}
          style={{ flex:1, background:'#111826', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'20px', padding:'11px 16px', color:'#eef2f7', fontSize:'13px', outline:'none', resize:'none', lineHeight:'1.5', maxHeight:'100px' }} />
        <button onClick={sendMessage} disabled={!input.trim() || sending}
          style={{ width:'44px', height:'44px', borderRadius:'50%', background: input.trim() ? 'linear-gradient(135deg,#00e5ff,#00ff88)' : 'rgba(255,255,255,0.07)', border:'none', color: input.trim() ? '#050810' : '#4a5568', fontSize:'18px', cursor: input.trim() ? 'pointer' : 'default', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          ➤
        </button>
      </div>
    </div>
  )
}
