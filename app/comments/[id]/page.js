'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useParams } from 'next/navigation'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default function Comments() {
  const { id } = useParams()
  const [me, setMe] = useState(null)
  const [post, setPost] = useState(null)
  const [postOwner, setPostOwner] = useState(null)
  const [comments, setComments] = useState([])
  const [liked, setLiked] = useState(false)
  const [supported, setSupported] = useState(false)
  const [commentLikes, setCommentLikes] = useState({})
  const [loading, setLoading] = useState(true)
  const [commentText, setCommentText] = useState('')
  const [sending, setSending] = useState(false)
  const [replyTo, setReplyTo] = useState(null) // { id, username }
  const [expandedReplies, setExpandedReplies] = useState({})
  const [showOptions, setShowOptions] = useState(null) // comment id
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [showDoubleTap, setShowDoubleTap] = useState(false)
  const lastTap = useRef(0)
  const inputRef = useRef(null)
  const commentsEndRef = useRef(null)

  useEffect(() => {
    if (!id) return
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { window.location.href = '/'; return }
      const u = data.session.user
      setMe(u)
      await loadAll(u.id, id)

      // Algorithm: track comment page view
    })
  }, [id])

  const loadAll = async (userId, postId) => {
    const [
      { data: p },
      { data: allComments },
      { data: myLike },
      { data: myFollow },
      { data: myCommentLikes },
    ] = await Promise.all([
      supabase.from('posts').select('*, profiles(id, username, full_name, avatar_url)').eq('id', postId).single(),
      supabase.from('comments')
        .select('*, profiles(id, username, full_name, avatar_url)')
        .eq('post_id', postId)
        .order('created_at', { ascending: true }),
      supabase.from('likes').select('id').eq('user_id', userId).eq('post_id', postId).single(),
      supabase.from('followers').select('id').eq('follower_id', userId).eq('following_id', null).single(),
      supabase.from('comment_likes').select('comment_id').eq('user_id', userId),
    ])

    setPost(p)
    setPostOwner(p?.profiles)
    setComments(allComments || [])
    setLiked(!!myLike)

    // Check if following post owner
    if (p?.user_id && p.user_id !== userId) {
      const { data: followCheck } = await supabase
        .from('followers').select('id').eq('follower_id', userId).eq('following_id', p.user_id).single()
      setSupported(!!followCheck)
    }

    const clMap = {}
    ;(myCommentLikes || []).forEach(cl => { clMap[cl.comment_id] = true })
    setCommentLikes(clMap)

    setLoading(false)
  }

  // ─── Like post ────────────────────────────────────────
  const handleLikePost = async () => {
    if (!me || !post) return
    if (liked) {
      await supabase.from('likes').delete().eq('user_id', me.id).eq('post_id', post.id)
      setLiked(false)
      setPost(p => ({ ...p, likes_count: Math.max((p.likes_count || 1) - 1, 0) }))
    } else {
      await supabase.from('likes').upsert({ user_id: me.id, post_id: post.id })
      setLiked(true)
      setPost(p => ({ ...p, likes_count: (p.likes_count || 0) + 1 }))
      setShowDoubleTap(true)
      setTimeout(() => setShowDoubleTap(false), 900)
      if (post.user_id !== me.id) {
        await supabase.from('notifications').insert({
          user_id: post.user_id, from_user_id: me.id, type: 'like', post_id: post.id
        })
      }
    }
  }

  // ─── Double tap like ──────────────────────────────────
  const handleMediaTap = () => {
    const now = Date.now()
    if (now - lastTap.current < 300) {
      if (!liked) handleLikePost()
      setShowDoubleTap(true)
      setTimeout(() => setShowDoubleTap(false), 900)
    }
    lastTap.current = now
  }

  // ─── Support post owner ───────────────────────────────
  const handleSupport = async () => {
    if (!me || !post || post.user_id === me.id) return
    if (supported) {
      await supabase.from('followers').delete().eq('follower_id', me.id).eq('following_id', post.user_id)
      setSupported(false)
    } else {
      await supabase.from('followers').upsert({ follower_id: me.id, following_id: post.user_id })
      setSupported(true)
      await supabase.from('notifications').insert({
        user_id: post.user_id, from_user_id: me.id, type: 'follow'
      })
    }
  }

  // ─── Like comment ─────────────────────────────────────
  const handleLikeComment = async (commentId) => {
    if (!me) return
    if (commentLikes[commentId]) {
      await supabase.from('comment_likes').delete().eq('user_id', me.id).eq('comment_id', commentId)
      setCommentLikes(p => ({ ...p, [commentId]: false }))
      setComments(cs => cs.map(c => c.id === commentId ? { ...c, likes_count: Math.max((c.likes_count || 1) - 1, 0) } : c))
    } else {
      await supabase.from('comment_likes').upsert({ user_id: me.id, comment_id: commentId })
      setCommentLikes(p => ({ ...p, [commentId]: true }))
      setComments(cs => cs.map(c => c.id === commentId ? { ...c, likes_count: (c.likes_count || 0) + 1 } : c))
    }
  }

  // ─── Send comment / reply ─────────────────────────────
  const handleSend = async () => {
    if (!commentText.trim() || !me || sending) return
    setSending(true)

    const content = replyTo
      ? `@${replyTo.username} ${commentText.trim()}`
      : commentText.trim()

    const { data: newComment } = await supabase
      .from('comments')
      .insert({
        post_id: post.id,
        user_id: me.id,
        content,
        parent_id: replyTo?.id || null,
      })
      .select('*, profiles(id, username, full_name, avatar_url)')
      .single()

    if (newComment) {
      setComments(prev => [...prev, newComment])
      setPost(p => ({ ...p, comments_count: (p.comments_count || 0) + 1 }))

      // Expand replies if replying
      if (replyTo?.id) {
        setExpandedReplies(prev => ({ ...prev, [replyTo.id]: true }))
      }

      // Notification to post owner
      if (post.user_id !== me.id) {
        await supabase.from('notifications').insert({
          user_id: post.user_id, from_user_id: me.id, type: 'comment',
          post_id: post.id, comment_id: newComment.id
        })
      }
      // Notification to comment owner if reply
      if (replyTo && replyTo.userId && replyTo.userId !== me.id && replyTo.userId !== post.user_id) {
        await supabase.from('notifications').insert({
          user_id: replyTo.userId, from_user_id: me.id, type: 'reply',
          post_id: post.id, comment_id: newComment.id
        })
      }

    }

    setCommentText('')
    setReplyTo(null)
    setSending(false)
    setTimeout(() => commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
  }

  // ─── Delete comment ───────────────────────────────────
  const handleDeleteComment = async () => {
    if (!deleteTarget) return
    await supabase.from('comments').delete().eq('id', deleteTarget).eq('user_id', me.id)
    setComments(cs => cs.filter(c => c.id !== deleteTarget && c.parent_id !== deleteTarget))
    setPost(p => ({ ...p, comments_count: Math.max((p.comments_count || 1) - 1, 0) }))
    setDeleteTarget(null)
    setShowOptions(null)
  }

  // ─── Share ────────────────────────────────────────────
  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ text: post.content || '', url: window.location.href })
    } else {
      navigator.clipboard?.writeText(window.location.href)
      alert('Link copied!')
    }
  }

  const timeAgo = (date) => {
    const s = Math.floor((new Date() - new Date(date)) / 1000)
    if (s < 60) return 'এইমাত্র'
    if (s < 3600) return Math.floor(s / 60) + 'মি'
    if (s < 86400) return Math.floor(s / 3600) + 'ঘ'
    if (s < 604800) return Math.floor(s / 86400) + 'দিন'
    return new Date(date).toLocaleDateString('bn-BD')
  }

  const getName = (p) => p?.full_name || p?.username || 'Explorer'
  const getUsername = (p) => p?.username || 'explorer'

  // Separate top-level vs replies
  const topLevelComments = comments.filter(c => !c.parent_id)
  const getReplies = (commentId) => comments.filter(c => c.parent_id === commentId)

  if (loading) return (
    <div style={{ height: '100vh', background: '#070a10', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontSize: '32px', animation: 'spin 1s linear infinite' }}>⬡</div>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  if (!post) return (
    <div style={{ height: '100vh', background: '#070a10', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', color: '#eef2f7' }}>
      <div style={{ fontSize: '48px' }}>📭</div>
      <div style={{ color: '#4a5568' }}>Post not found</div>
      <button onClick={() => window.history.back()} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '10px 22px', color: '#8892a4', fontSize: '13px', cursor: 'pointer' }}>← Back</button>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#070a10', color: '#eef2f7', paddingBottom: '80px' }}>

      {/* ── TOP BAR ── */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, background: 'rgba(7,10,16,0.97)', borderBottom: '1px solid rgba(255,255,255,0.07)', zIndex: 100, height: '54px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px' }}>
        <button onClick={() => window.history.back()} style={{ background: 'none', border: 'none', color: '#8892a4', fontSize: '22px', cursor: 'pointer' }}>←</button>
        <div style={{ fontSize: '15px', fontWeight: '800' }}>Post</div>
        <button onClick={handleShare} style={{ background: 'none', border: 'none', color: '#8892a4', fontSize: '20px', cursor: 'pointer' }}>↗</button>
      </div>

      <div style={{ paddingTop: '54px' }}>

        {/* ── POST CARD ── */}
        <div style={{ background: '#111620', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>

          {/* Post header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 16px 10px' }}>
            <div onClick={() => postOwner?.id && (window.location.href = `/user/${postOwner.id}`)}
              style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'linear-gradient(135deg,#00e5ff,#00ff88)', flexShrink: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '2px solid rgba(0,229,255,0.2)' }}>
              {postOwner?.avatar_url
                ? <img src={postOwner.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <span style={{ fontSize: '16px', fontWeight: '800', color: '#070a10' }}>{getName(postOwner)[0]?.toUpperCase()}</span>
              }
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div onClick={() => postOwner?.id && (window.location.href = `/user/${postOwner.id}`)}
                  style={{ fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}>{getName(postOwner)}</div>
                {me?.id !== post.user_id && (
                  <button onClick={handleSupport}
                    style={{ padding: '2px 10px', borderRadius: '12px', border: `1px solid ${supported ? 'rgba(0,229,255,0.3)' : 'rgba(255,255,255,0.12)'}`, background: supported ? 'rgba(0,229,255,0.08)' : 'transparent', color: supported ? '#00e5ff' : '#4a5568', fontSize: '10px', fontWeight: '600', cursor: 'pointer' }}>
                    {supported ? '✓ Supporting' : '+ Support'}
                  </button>
                )}
              </div>
              <div style={{ fontSize: '11px', color: '#4a5568' }}>@{getUsername(postOwner)} · {timeAgo(post.created_at)}</div>
              {post.location_name && <div style={{ fontSize: '11px', color: '#00e5ff', marginTop: '1px' }}>📍 {post.location_name}</div>}
            </div>
            <div style={{ fontSize: '14px', color: '#2a3040' }}>{post.privacy === 'private' ? '🔒' : post.privacy === 'friends' ? '👥' : '🌍'}</div>
          </div>

          {/* Post title */}
          {post.title && <div style={{ padding: '0 16px 6px', fontSize: '17px', fontWeight: '800' }}>{post.title}</div>}

          {/* Post content */}
          {post.content && <div style={{ padding: '0 16px 10px', fontSize: '14px', color: '#c0c8d8', lineHeight: '1.65' }}>{post.content}</div>}
          {post.hashtags && <div style={{ padding: '0 16px 10px', fontSize: '13px', color: '#00e5ff' }}>{post.hashtags}</div>}

          {/* Media */}
          {post.media_url && post.media_type === 'photo' && (
            <div style={{ position: 'relative' }} onClick={handleMediaTap}>
              <img src={post.media_url} style={{ width: '100%', maxHeight: '500px', objectFit: 'cover', display: 'block' }} />
              {showDoubleTap && (
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', fontSize: '80px', animation: 'heartPop 0.9s ease forwards', pointerEvents: 'none' }}>❤️</div>
              )}
            </div>
          )}
          {post.media_url && post.media_type === 'video' && (
            <video src={post.media_url} controls playsInline style={{ width: '100%', maxHeight: '500px', display: 'block', background: '#000' }} />
          )}
          {post.media_type === 'capsule' && (
            <div style={{ margin: '0 16px 10px', background: 'rgba(255,202,40,0.06)', border: '1px solid rgba(255,202,40,0.2)', borderRadius: '14px', padding: '18px', display: 'flex', gap: '14px', alignItems: 'center' }}>
              <span style={{ fontSize: '32px' }}>📦</span>
              <div>
                <div style={{ fontSize: '14px', fontWeight: '700', color: '#ffca28' }}>Time Capsule</div>
                <div style={{ fontSize: '12px', color: '#4a5568', marginTop: '3px' }}>Visit within {post.capsule_radius || 300}m to unlock</div>
              </div>
            </div>
          )}

          {/* Remix badge */}
          {post.remix_of && (
            <div style={{ margin: '4px 16px 8px', display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(255,165,0,0.08)', borderRadius: '8px', padding: '3px 10px', fontSize: '11px', color: '#ffa500', cursor: 'pointer' }}
              onClick={() => window.location.href = `/comments/${post.remix_of}`}>
              🔀 ECHO MIX — see original
            </div>
          )}

          {/* ── ACTION BAR ── */}
          <div style={{ display: 'flex', alignItems: 'center', padding: '8px 10px 12px', gap: '4px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
            <button onClick={handleLikePost}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', border: 'none', background: 'none', cursor: 'pointer', color: liked ? '#ff4560' : '#4a5568', fontSize: '14px', borderRadius: '10px', transition: 'transform 0.2s', transform: liked ? 'scale(1.1)' : 'scale(1)' }}>
              {liked ? '❤️' : '🤍'} <span style={{ fontWeight: '700' }}>{post.likes_count || 0}</span>
            </button>
            <button onClick={() => inputRef.current?.focus()}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', border: 'none', background: 'none', cursor: 'pointer', color: '#4a5568', fontSize: '14px', borderRadius: '10px' }}>
              💬 <span style={{ fontWeight: '700' }}>{post.comments_count || 0}</span>
            </button>
            <button onClick={handleShare}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', border: 'none', background: 'none', cursor: 'pointer', color: '#4a5568', fontSize: '14px', borderRadius: '10px' }}>
              ↗ Share
            </button>
            {post.media_type === 'video' && (
              <button onClick={() => window.location.href = '/echo'}
                style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '4px', padding: '7px 12px', border: 'none', background: 'rgba(255,165,0,0.08)', borderRadius: '10px', cursor: 'pointer', color: '#ffa500', fontSize: '12px', fontWeight: '700' }}>
                🔀 MIX
              </button>
            )}
          </div>
        </div>

        {/* ── COMMENTS SECTION ── */}
        <div style={{ padding: '14px 16px 0' }}>
          <div style={{ fontSize: '13px', fontWeight: '800', color: '#8892a4', marginBottom: '14px', letterSpacing: '0.5px' }}>
            💬 {comments.length} COMMENTS
          </div>

          {topLevelComments.length === 0 && (
            <div style={{ textAlign: 'center', padding: '32px 20px' }}>
              <div style={{ fontSize: '36px', marginBottom: '10px' }}>💬</div>
              <div style={{ color: '#4a5568', fontSize: '14px' }}>No comments yet. Be first!</div>
            </div>
          )}

          {topLevelComments.map(comment => {
            const replies = getReplies(comment.id)
            const isMyComment = comment.user_id === me?.id
            return (
              <div key={comment.id} style={{ marginBottom: '18px' }}>

                {/* Comment */}
                <div style={{ display: 'flex', gap: '10px' }}>
                  <div onClick={() => comment.profiles?.id && (window.location.href = comment.profiles.id === me?.id ? '/profile' : `/user/${comment.profiles.id}`)}
                    style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg,#00e5ff,#00ff88)', flexShrink: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '1px solid rgba(0,229,255,0.15)' }}>
                    {comment.profiles?.avatar_url
                      ? <img src={comment.profiles.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <span style={{ fontSize: '13px', fontWeight: '800', color: '#070a10' }}>{getName(comment.profiles)[0]?.toUpperCase()}</span>
                    }
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '14px', padding: '10px 12px', marginBottom: '4px', position: 'relative' }}
                      onContextMenu={e => { e.preventDefault(); setShowOptions(comment.id) }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                        <span style={{ fontSize: '12px', fontWeight: '700', color: '#00e5ff', cursor: 'pointer' }}
                          onClick={() => comment.profiles?.id && (window.location.href = comment.profiles.id === me?.id ? '/profile' : `/user/${comment.profiles.id}`)}>
                          {getName(comment.profiles)}
                        </span>
                        {comment.user_id === post.user_id && (
                          <span style={{ fontSize: '9px', background: 'rgba(0,229,255,0.1)', color: '#00e5ff', borderRadius: '4px', padding: '1px 5px', fontWeight: '700' }}>Author</span>
                        )}
                      </div>
                      <div style={{ fontSize: '13px', color: '#eef2f7', lineHeight: '1.55', wordBreak: 'break-word' }}>{comment.content}</div>
                    </div>

                    {/* Comment actions */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '0 4px' }}>
                      <span style={{ fontSize: '10px', color: '#2a3040' }}>{timeAgo(comment.created_at)}</span>
                      <button onClick={() => handleLikeComment(comment.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: commentLikes[comment.id] ? '#ff4560' : '#4a5568', fontSize: '12px', padding: '0', display: 'flex', alignItems: 'center', gap: '3px', fontWeight: '600' }}>
                        {commentLikes[comment.id] ? '❤️' : '🤍'} {comment.likes_count || 0}
                      </button>
                      <button onClick={() => {
                        setReplyTo({ id: comment.id, username: getUsername(comment.profiles), userId: comment.user_id })
                        inputRef.current?.focus()
                      }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4a5568', fontSize: '12px', fontWeight: '600', padding: '0' }}>
                        Reply
                      </button>
                      {isMyComment && (
                        <button onClick={() => setDeleteTarget(comment.id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ff4560', fontSize: '12px', padding: '0', marginLeft: 'auto' }}>
                          🗑
                        </button>
                      )}
                    </div>

                    {/* Replies */}
                    {replies.length > 0 && (
                      <div style={{ marginTop: '8px' }}>
                        {!expandedReplies[comment.id] ? (
                          <button onClick={() => setExpandedReplies(p => ({ ...p, [comment.id]: true }))}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#00e5ff', fontSize: '12px', fontWeight: '700', padding: '0', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            ↩ {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
                          </button>
                        ) : (
                          <div style={{ borderLeft: '2px solid rgba(0,229,255,0.15)', paddingLeft: '12px', marginTop: '6px' }}>
                            {replies.map(reply => (
                              <div key={reply.id} style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                                <div onClick={() => reply.profiles?.id && (window.location.href = reply.profiles.id === me?.id ? '/profile' : `/user/${reply.profiles.id}`)}
                                  style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'linear-gradient(135deg,#00e5ff,#00ff88)', flexShrink: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                                  {reply.profiles?.avatar_url
                                    ? <img src={reply.profiles.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    : <span style={{ fontSize: '10px', fontWeight: '800', color: '#070a10' }}>{getName(reply.profiles)[0]?.toUpperCase()}</span>
                                  }
                                </div>
                                <div style={{ flex: 1 }}>
                                  <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '8px 10px', marginBottom: '3px' }}>
                                    <div style={{ fontSize: '11px', fontWeight: '700', color: '#00e5ff', marginBottom: '3px' }}>{getName(reply.profiles)}</div>
                                    <div style={{ fontSize: '12px', color: '#c0c8d8', lineHeight: '1.5', wordBreak: 'break-word' }}>{reply.content}</div>
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '0 4px' }}>
                                    <span style={{ fontSize: '9px', color: '#2a3040' }}>{timeAgo(reply.created_at)}</span>
                                    <button onClick={() => handleLikeComment(reply.id)}
                                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: commentLikes[reply.id] ? '#ff4560' : '#4a5568', fontSize: '11px', padding: '0', display: 'flex', alignItems: 'center', gap: '2px' }}>
                                      {commentLikes[reply.id] ? '❤️' : '🤍'} {reply.likes_count || 0}
                                    </button>
                                    {reply.user_id === me?.id && (
                                      <button onClick={() => setDeleteTarget(reply.id)}
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ff4560', fontSize: '11px', padding: '0', marginLeft: 'auto' }}>🗑</button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                            <button onClick={() => setExpandedReplies(p => ({ ...p, [comment.id]: false }))}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4a5568', fontSize: '11px', padding: '0' }}>
                              ↑ Hide replies
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
          <div ref={commentsEndRef} />
        </div>
      </div>

      {/* ── DELETE CONFIRM ── */}
      {deleteTarget && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 500, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '20px' }} onClick={() => setDeleteTarget(null)}>
          <div style={{ background: '#1a2030', borderRadius: '20px', padding: '24px', width: '100%', maxWidth: '400px' }} onClick={e => e.stopPropagation()}>
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>🗑️</div>
              <div style={{ fontSize: '17px', fontWeight: '800', marginBottom: '4px' }}>Delete Comment?</div>
              <div style={{ fontSize: '13px', color: '#4a5568' }}>This cannot be undone.</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <button onClick={() => setDeleteTarget(null)} style={{ padding: '13px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px', color: '#8892a4', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleDeleteComment} style={{ padding: '13px', background: 'linear-gradient(135deg,#ff4560,#c0392b)', border: 'none', borderRadius: '14px', color: '#fff', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}>🗑️ Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* ── COMMENT INPUT ── */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'rgba(7,10,16,0.98)', borderTop: '1px solid rgba(255,255,255,0.07)', padding: '8px 12px 28px', zIndex: 200 }}>
        {/* Reply indicator */}
        {replyTo && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', background: 'rgba(0,229,255,0.06)', borderRadius: '10px', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', color: '#00e5ff', fontWeight: '600' }}>↩ Replying to @{replyTo.username}</span>
            <button onClick={() => setReplyTo(null)} style={{ background: 'none', border: 'none', color: '#4a5568', fontSize: '16px', cursor: 'pointer', padding: '0' }}>✕</button>
          </div>
        )}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
          <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: 'linear-gradient(135deg,#00e5ff,#00ff88)', flexShrink: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {me?.user_metadata?.avatar_url
              ? <img src={me.user_metadata.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span style={{ fontSize: '13px', fontWeight: '800', color: '#070a10' }}>👤</span>
            }
          </div>
          <div style={{ flex: 1, background: '#111620', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '22px', padding: '10px 14px', display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
            <textarea
              ref={inputRef}
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
              placeholder={replyTo ? `Reply to @${replyTo.username}...` : 'Add a comment...'}
              rows={1}
              style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#eef2f7', fontSize: '14px', resize: 'none', maxHeight: '100px', lineHeight: '1.5', fontFamily: 'inherit' }}
            />
            <button onClick={handleSend} disabled={!commentText.trim() || sending}
              style={{ width: '32px', height: '32px', borderRadius: '50%', background: commentText.trim() ? 'linear-gradient(135deg,#00e5ff,#00ff88)' : 'rgba(255,255,255,0.05)', border: 'none', cursor: commentText.trim() ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0, transition: 'all 0.2s' }}>
              {sending ? '⏳' : '↗'}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes heartPop {
          0%{transform:translate(-50%,-50%) scale(0);opacity:1}
          50%{transform:translate(-50%,-50%) scale(1.4);opacity:1}
          100%{transform:translate(-50%,-80%) scale(1);opacity:0}
        }
      `}</style>
    </div>
  )
        }
