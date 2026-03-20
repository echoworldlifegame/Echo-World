'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default function Comments({ params }) {
  const [user, setUser] = useState(null)
  const [post, setPost] = useState(null)
  const [comments, setComments] = useState([])
  const [loading, setLoading] = useState(true)
  const [commentText, setCommentText] = useState('')
  const [sending, setSending] = useState(false)
  const [liked, setLiked] = useState(false)
  const [replyTo, setReplyTo] = useState(null)
  const [likedComments, setLikedComments] = useState({})
  const [supported, setSupported] = useState(false)
  const inputRef = useRef(null)
  const bottomRef = useRef(null)

  // Push notification helper
  const sendPushNotif = async (userId, title, message) => {
    try {
      await fetch('/api/push-notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, title, message })
      })
    } catch(e) {}
  }



  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { window.location.href = '/'; return }
      const u = data.session.user
      setUser(u)
      await loadPost(u.id)
      await loadComments(u.id)
    })
  }, [params.id])

  const loadPost = async (uid) => {
    const { data } = await supabase
      .from('posts')
      .select('*, profiles(id, username, full_name, avatar_url)')
      .eq('id', params.id)
      .single()
    setPost(data)
    if (data) {
      const { data: l } = await supabase.from('likes').select('id').eq('user_id', uid).eq('post_id', params.id).single()
      setLiked(!!l)
      const { data: f } = await supabase.from('followers').select('id').eq('follower_id', uid).eq('following_id', data.user_id).single()
      setSupported(!!f)
    }
    setLoading(false)
  }

  const loadComments = async (uid) => {
    const { data } = await supabase
      .from('comments')
      .select('*, profiles(id, username, full_name, avatar_url)')
      .eq('post_id', params.id)
      .order('created_at', { ascending: true })
    setComments(data || [])
    const { data: lc } = await supabase
      .from('comment_likes').select('comment_id').eq('user_id', uid)
    const map = {}
    ;(lc || []).forEach(l => { map[l.comment_id] = true })
    setLikedComments(map)
  }

  const handleLikePost = async () => {
    if (!user || !post) return
    if (liked) {
      await supabase.from('likes').delete().eq('user_id', user.id).eq('post_id', post.id)
      setLiked(false)
      setPost(p => ({ ...p, likes_count: Math.max((p.likes_count || 1) - 1, 0) }))
    } else {
      await supabase.from('likes').upsert({ user_id: user.id, post_id: post.id })
      setLiked(true)
      setPost(p => ({ ...p, likes_count: (p.likes_count || 0) + 1 }))
      if (post.user_id !== user.id) {
        await supabase.from('notifications').insert({
          user_id: post.user_id, from_user_id: user.id, type: 'like', post_id: post.id, read: false
        })
        sendPushNotif(post.user_id, '❤️ Echo World', 'কেউ তোমার post এ like দিয়েছে!')
      }
    }
  }

  const handleSupport = async () => {
    if (!user || !post || post.user_id === user.id) return
    if (supported) {
      await supabase.from('followers').delete().eq('follower_id', user.id).eq('following_id', post.user_id)
      setSupported(false)
    } else {
      await supabase.from('followers').upsert({ follower_id: user.id, following_id: post.user_id })
      setSupported(true)
      await supabase.from('notifications').insert({
        user_id: post.user_id, from_user_id: user.id, type: 'follow', read: false
      })
      sendPushNotif(post.user_id, '👥 Echo World', 'কেউ তোমাকে Support করছে!')
    }
  }

  const handleShare = async () => {
    try {
      navigator.share?.({ text: post?.content || '', url: window.location.href })
    } catch (e) {}
  }

  const sendComment = async () => {
    if (!commentText.trim() || !user || sending) return
    setSending(true)
    const { data: c } = await supabase.from('comments').insert({
      post_id: params.id,
      user_id: user.id,
      content: replyTo ? `@${replyTo.username} ${commentText.trim()}` : commentText.trim(),
      parent_id: replyTo?.id || null,
    }).select('*, profiles(id, username, full_name, avatar_url)').single()
    if (c) {
      setComments(prev => [...prev, c])
      setPost(p => ({ ...p, comments_count: (p.comments_count || 0) + 1 }))
      if (post.user_id !== user.id) {
        await supabase.from('notifications').insert({
          user_id: post.user_id, from_user_id: user.id, type: 'comment',
          post_id: params.id, message: commentText.trim().slice(0, 100), read: false
        })
        sendPushNotif(post.user_id, '💬 Echo World', `কেউ তোমার post এ comment করেছে!`)
      }
    }
    setCommentText('')
    setReplyTo(null)
    setSending(false)
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
  }

  const handleLikeComment = async (commentId) => {
    if (!user) return
    if (likedComments[commentId]) {
      await supabase.from('comment_likes').delete().eq('user_id', user.id).eq('comment_id', commentId)
      setLikedComments(p => ({ ...p, [commentId]: false }))
      setComments(cs => cs.map(c => c.id === commentId ? { ...c, likes_count: Math.max((c.likes_count || 1) - 1, 0) } : c))
    } else {
      await supabase.from('comment_likes').upsert({ user_id: user.id, comment_id: commentId })
      setLikedComments(p => ({ ...p, [commentId]: true }))
      setComments(cs => cs.map(c => c.id === commentId ? { ...c, likes_count: (c.likes_count || 0) + 1 } : c))
    }
  }

  const deleteComment = async (commentId) => {
    await supabase.from('comments').delete().eq('id', commentId)
    setComments(cs => cs.filter(c => c.id !== commentId))
    setPost(p => ({ ...p, comments_count: Math.max((p.comments_count || 1) - 1, 0) }))
  }

  const timeAgo = (date) => {
    const s = Math.floor((new Date() - new Date(date)) / 1000)
    if (s < 60) return 'এইমাত্র'
    if (s < 3600) return Math.floor(s / 60) + 'মি'
    if (s < 86400) return Math.floor(s / 3600) + 'ঘ'
    return Math.floor(s / 86400) + 'দিন'
  }

  const getName = (p) => p?.profiles?.full_name || p?.profiles?.username || 'Explorer'
  const getUsername = (p) => p?.profiles?.username || 'explorer'
  const topComments = comments.filter(c => !c.parent_id)
  const getReplies = (parentId) => comments.filter(c => c.parent_id === parentId)

  if (loading) return (
    <div style={{ height: '100vh', background: '#070a10', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontSize: '32px', animation: 'spin 1s linear infinite' }}>💬</div>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#070a10', color: '#eef2f7', paddingBottom: '80px' }}>
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, background: 'rgba(7,10,16,0.97)', borderBottom: '1px solid rgba(255,255,255,0.07)', padding: '0 16px', height: '52px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 100 }}>
        <button onClick={() => window.history.back()} style={{ background: 'none', border: 'none', color: '#8892a4', fontSize: '22px', cursor: 'pointer' }}>←</button>
        <div style={{ fontSize: '15px', fontWeight: '800' }}>💬 Comments {comments.length > 0 && `(${comments.length})`}</div>
        <button onClick={handleShare} style={{ background: 'none', border: 'none', color: '#8892a4', fontSize: '20px', cursor: 'pointer' }}>↗</button>
      </div>

      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'rgba(7,10,16,0.98)', borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'space-around', padding: '10px 0 20px', zIndex: 100 }}>
        {[{ icon: '🏠', path: '/feed' }, { icon: '🗺', path: '/map' }, { icon: '📸', path: '/post' }, { icon: '🏆', path: '/leaderboard' }, { icon: '👤', path: '/profile' }].map(item => (
          <div key={item.path} onClick={() => window.location.href = item.path} style={{ fontSize: '22px', cursor: 'pointer', color: '#4a5568' }}>{item.icon}</div>
        ))}
      </div>

      <div style={{ padding: '68px 0 20px' }}>
        {post && (
          <div style={{ background: '#111620', border: '1px solid rgba(255,255,255,0.07)', margin: '0 12px 16px', borderRadius: '16px', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px 8px' }}>
              <div onClick={() => window.location.href = `/user/${post.profiles?.id}`}
                style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'linear-gradient(135deg,#00e5ff,#00ff88)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden', cursor: 'pointer', border: '2px solid rgba(0,229,255,0.3)' }}>
                {post.profiles?.avatar_url
                  ? <img src={post.profiles.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <span style={{ fontSize: '18px', fontWeight: '800', color: '#070a10' }}>{getName(post)[0]?.toUpperCase()}</span>}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div onClick={() => window.location.href = `/user/${post.profiles?.id}`} style={{ fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}>{getName(post)}</div>
                  {user?.id !== post.user_id && (
                    <button onClick={handleSupport}
                      style={{ padding: '2px 10px', borderRadius: '12px', border: `1px solid ${supported ? 'rgba(0,229,255,0.3)' : 'rgba(255,255,255,0.15)'}`, background: supported ? 'rgba(0,229,255,0.08)' : 'transparent', color: supported ? '#00e5ff' : '#4a5568', fontSize: '10px', fontWeight: '600', cursor: 'pointer' }}>
                      {supported ? '✓ Supporting' : '+ Support'}
                    </button>
                  )}
                </div>
                <div style={{ fontSize: '11px', color: '#4a5568' }}>@{getUsername(post)}</div>
              </div>
            </div>
            {post.media_url && post.media_type === 'photo' && (
              <img src={post.media_url} style={{ width: '100%', maxHeight: '400px', objectFit: 'cover', display: 'block' }} />
            )}
            {post.media_url && post.media_type === 'video' && (
              <video src={post.media_url} controls playsInline style={{ width: '100%', maxHeight: '400px', display: 'block', background: '#000' }} />
            )}
            {post.content && <div style={{ padding: '10px 14px 4px', fontSize: '14px', color: '#c0c8d8', lineHeight: '1.6' }}>{post.content}</div>}
            {post.hashtags && <div style={{ padding: '0 14px 8px', fontSize: '12px', color: '#00e5ff' }}>{post.hashtags}</div>}
            <div style={{ display: 'flex', padding: '8px 10px 10px', borderTop: '1px solid rgba(255,255,255,0.04)', gap: '4px' }}>
              <button onClick={handleLikePost}
                style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '8px 14px', border: 'none', background: liked ? 'rgba(255,69,96,0.1)' : 'rgba(255,255,255,0.04)', borderRadius: '10px', cursor: 'pointer', color: liked ? '#ff4560' : '#4a5568', fontSize: '13px', fontWeight: '600' }}>
                {liked ? '❤️' : '🤍'} {post.likes_count || 0}
              </button>
              <button style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '8px 14px', border: 'none', background: 'rgba(0,229,255,0.06)', borderRadius: '10px', cursor: 'pointer', color: '#00e5ff', fontSize: '13px', fontWeight: '600' }}>
                💬 {post.comments_count || 0}
              </button>
              <button onClick={handleShare}
                style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '8px 14px', border: 'none', background: 'rgba(255,255,255,0.04)', borderRadius: '10px', cursor: 'pointer', color: '#4a5568', fontSize: '13px' }}>
                ↗ Share
              </button>
            </div>
          </div>
        )}

        <div style={{ padding: '0 12px' }}>
          <div style={{ fontSize: '13px', color: '#4a5568', fontWeight: '700', letterSpacing: '1px', marginBottom: '12px' }}>💬 {comments.length} COMMENTS</div>
          {comments.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#4a5568' }}>
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>💬</div>
              <div style={{ fontSize: '14px', color: '#8892a4' }}>No comments yet</div>
            </div>
          ) : topComments.map(comment => (
            <div key={comment.id} style={{ marginBottom: '12px' }}>
              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '50%', overflow: 'hidden', background: 'linear-gradient(135deg,#00e5ff,#00ff88)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {comment.profiles?.avatar_url
                    ? <img src={comment.profiles.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <span style={{ fontWeight: '800', color: '#070a10', fontSize: '14px' }}>{(comment.profiles?.full_name || comment.profiles?.username || 'E')[0].toUpperCase()}</span>}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '14px', padding: '10px 12px', marginBottom: '4px' }}>
                    <div style={{ fontSize: '12px', fontWeight: '700', color: '#00e5ff', marginBottom: '4px' }}>{comment.profiles?.full_name || comment.profiles?.username}</div>
                    <div style={{ fontSize: '13px', color: '#c0c8d8', lineHeight: '1.5' }}>{comment.content}</div>
                  </div>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center', paddingLeft: '4px' }}>
                    <span style={{ fontSize: '11px', color: '#4a5568' }}>{timeAgo(comment.created_at)}</span>
                    <button onClick={() => handleLikeComment(comment.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: likedComments[comment.id] ? '#ff4560' : '#4a5568', fontSize: '11px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '3px' }}>
                      {likedComments[comment.id] ? '❤️' : '🤍'} {comment.likes_count || 0}
                    </button>
                    <button onClick={() => { setReplyTo({ id: comment.id, username: comment.profiles?.username }); inputRef.current?.focus() }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4a5568', fontSize: '11px', fontWeight: '600' }}>Reply</button>
                    {comment.user_id === user?.id && (
                      <button onClick={() => deleteComment(comment.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ff4560', fontSize: '11px' }}>Delete</button>
                    )}
                  </div>
                  {getReplies(comment.id).map(reply => (
                    <div key={reply.id} style={{ display: 'flex', gap: '8px', marginTop: '8px', paddingLeft: '8px', borderLeft: '2px solid rgba(0,229,255,0.15)' }}>
                      <div style={{ width: '30px', height: '30px', borderRadius: '50%', overflow: 'hidden', background: 'linear-gradient(135deg,#00e5ff,#00ff88)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {reply.profiles?.avatar_url
                          ? <img src={reply.profiles.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : <span style={{ fontWeight: '800', color: '#070a10', fontSize: '11px' }}>{(reply.profiles?.full_name || reply.profiles?.username || 'E')[0].toUpperCase()}</span>}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '8px 10px', marginBottom: '3px' }}>
                          <div style={{ fontSize: '11px', fontWeight: '700', color: '#00ff88', marginBottom: '3px' }}>{reply.profiles?.full_name || reply.profiles?.username}</div>
                          <div style={{ fontSize: '12px', color: '#c0c8d8', lineHeight: '1.5' }}>{reply.content}</div>
                        </div>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                          <span style={{ fontSize: '10px', color: '#4a5568' }}>{timeAgo(reply.created_at)}</span>
                          <button onClick={() => handleLikeComment(reply.id)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: likedComments[reply.id] ? '#ff4560' : '#4a5568', fontSize: '10px', display: 'flex', alignItems: 'center', gap: '2px' }}>
                            {likedComments[reply.id] ? '❤️' : '🤍'} {reply.likes_count || 0}
                          </button>
                          {reply.user_id === user?.id && (
                            <button onClick={() => deleteComment(reply.id)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ff4560', fontSize: '10px' }}>Delete</button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      </div>

      <div style={{ position: 'fixed', bottom: '68px', left: 0, right: 0, background: 'rgba(7,10,16,0.98)', borderTop: '1px solid rgba(255,255,255,0.07)', padding: '10px 12px', zIndex: 200 }}>
        {replyTo && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', background: 'rgba(0,229,255,0.06)', borderRadius: '8px', padding: '6px 10px' }}>
            <span style={{ fontSize: '12px', color: '#00e5ff' }}>↩ Replying to @{replyTo.username}</span>
            <button onClick={() => setReplyTo(null)} style={{ background: 'none', border: 'none', color: '#4a5568', fontSize: '16px', cursor: 'pointer' }}>✕</button>
          </div>
        )}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: 'linear-gradient(135deg,#00e5ff,#00ff88)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: '14px', fontWeight: '800', color: '#070a10' }}>E</span>
          </div>
          <input ref={inputRef} value={commentText} onChange={e => setCommentText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendComment()}
            placeholder={replyTo ? `Reply to @${replyTo.username}...` : 'Write a comment...'}
            style={{ flex: 1, background: '#111620', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '22px', padding: '10px 16px', color: '#eef2f7', fontSize: '13px', outline: 'none' }} />
          <button onClick={sendComment} disabled={!commentText.trim() || sending}
            style={{ width: '38px', height: '38px', borderRadius: '50%', background: commentText.trim() ? 'linear-gradient(135deg,#00e5ff,#00ff88)' : 'rgba(255,255,255,0.05)', border: 'none', fontSize: '18px', cursor: commentText.trim() ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {sending ? '⏳' : '↗'}
          </button>
        </div>
      </div>
    </div>
  )
    }
