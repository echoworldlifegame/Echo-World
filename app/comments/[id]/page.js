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
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [replyTo, setReplyTo] = useState(null)
  const inputRef = useRef(null)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { window.location.href = '/'; return }
      const u = data.session.user
      setUser(u)

      const { data: p } = await supabase
        .from('posts')
        .select('*, profiles(id, username, full_name, avatar_url)')
        .eq('id', params.id)
        .single()
      setPost(p)

      loadComments()
    })
  }, [params.id])

  const loadComments = async () => {
    const { data } = await supabase
      .from('comments')
      .select('*, profiles(id, username, full_name, avatar_url)')
      .eq('post_id', params.id)
      .order('created_at', { ascending: true })
    setComments(data || [])
    setLoading(false)
  }

  const sendComment = async () => {
    if (!text.trim() || !user || sending) return
    setSending(true)

    const { data: comment } = await supabase.from('comments').insert({
      post_id: params.id,
      user_id: user.id,
      content: text.trim(),
      reply_to: replyTo?.id || null,
    }).select('*, profiles(id, username, full_name, avatar_url)').single()

    if (comment) {
      setComments(c => [...c, comment])
      await supabase.from('posts').update({ comments_count: (post?.comments_count||0)+1 }).eq('id', params.id)

      // Notify post owner
      if (post?.user_id !== user.id) {
        await supabase.from('notifications').insert({
          user_id: post.user_id,
          from_user_id: user.id,
          type: 'comment',
          message: text.trim().slice(0, 50),
          post_id: params.id,
        })
      }
    }

    setText('')
    setReplyTo(null)
    setSending(false)
  }

  const handleLikeComment = async (commentId, currentLikes) => {
    await supabase.from('comments').update({ likes_count: (currentLikes||0)+1 }).eq('id', commentId)
    setComments(cs => cs.map(c => c.id===commentId ? {...c, likes_count:(c.likes_count||0)+1} : c))
  }

  const timeAgo = (date) => {
    const s = Math.floor((new Date() - new Date(date)) / 1000)
    if (s < 60) return 'এইমাত্র'
    if (s < 3600) return Math.floor(s/60) + 'মি'
    if (s < 86400) return Math.floor(s/3600) + 'ঘ'
    return Math.floor(s/86400) + 'দিন'
  }

  const topComments = comments.filter(c => !c.reply_to)
  const getReplies = (id) => comments.filter(c => c.reply_to === id)

  return (
    <div style={{minHeight:'100vh',background:'#070a10',color:'#eef2f7',display:'flex',flexDirection:'column'}}>

      {/* TOP BAR */}
      <div style={{position:'fixed',top:0,left:0,right:0,background:'rgba(7,10,16,0.97)',borderBottom:'1px solid rgba(255,255,255,0.07)',padding:'0 16px',height:'56px',display:'flex',alignItems:'center',justifyContent:'space-between',zIndex:100}}>
        <button onClick={()=>window.history.back()} style={{background:'none',border:'none',color:'#8892a4',fontSize:'24px',cursor:'pointer'}}>←</button>
        <div style={{fontSize:'16px',fontWeight:'800'}}>💬 Comments</div>
        <div style={{fontSize:'13px',color:'#4a5568'}}>{comments.length}</div>
      </div>

      {/* POST PREVIEW */}
      {post && (
        <div style={{marginTop:'56px',padding:'12px 16px',borderBottom:'1px solid rgba(255,255,255,0.05)',display:'flex',gap:'10px',alignItems:'center'}}>
          <div style={{width:'40px',height:'40px',borderRadius:'50%',overflow:'hidden',background:'linear-gradient(135deg,#00e5ff,#00ff88)',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center'}}>
            {post.profiles?.avatar_url
              ? <img src={post.profiles.avatar_url} style={{width:'100%',height:'100%',objectFit:'cover'}}/>
              : <span style={{fontWeight:'800',color:'#070a10',fontSize:'16px'}}>{(post.profiles?.full_name||'E')[0].toUpperCase()}</span>
            }
          </div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:'13px',fontWeight:'700'}}>{post.profiles?.full_name||post.profiles?.username}</div>
            {post.content && <div style={{fontSize:'12px',color:'#8892a4',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{post.content}</div>}
          </div>
          {post.media_url && post.media_type==='photo' && (
            <img src={post.media_url} style={{width:'44px',height:'44px',borderRadius:'8px',objectFit:'cover',flexShrink:0}}/>
          )}
        </div>
      )}

      {/* COMMENTS */}
      <div style={{flex:1,padding:'12px 16px',paddingBottom:'80px',overflowY:'auto'}}>
        {loading ? (
          <div style={{textAlign:'center',padding:'30px',color:'#4a5568'}}>Loading...</div>
        ) : topComments.length === 0 ? (
          <div style={{textAlign:'center',padding:'40px',color:'#4a5568'}}>
            <div style={{fontSize:'32px',marginBottom:'8px'}}>💬</div>
            <div>No comments yet. Be first!</div>
          </div>
        ) : topComments.map(comment => (
          <div key={comment.id} style={{marginBottom:'16px'}}>
            {/* Comment */}
            <div style={{display:'flex',gap:'10px'}}>
              <div onClick={()=>window.location.href=`/user/${comment.profiles?.id}`} style={{width:'38px',height:'38px',borderRadius:'50%',overflow:'hidden',background:'linear-gradient(135deg,#00e5ff,#00ff88)',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}}>
                {comment.profiles?.avatar_url
                  ? <img src={comment.profiles.avatar_url} style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                  : <span style={{fontWeight:'800',color:'#070a10',fontSize:'14px'}}>{(comment.profiles?.full_name||'E')[0].toUpperCase()}</span>
                }
              </div>
              <div style={{flex:1}}>
                <div style={{background:'rgba(255,255,255,0.04)',borderRadius:'12px',padding:'10px 12px'}}>
                  <div style={{fontSize:'12px',fontWeight:'700',color:'#00e5ff',marginBottom:'4px'}}>{comment.profiles?.full_name||comment.profiles?.username}</div>
                  <div style={{fontSize:'13px',color:'#eef2f7',lineHeight:'1.5'}}>{comment.content}</div>
                </div>
                <div style={{display:'flex',gap:'16px',padding:'4px 4px 0',alignItems:'center'}}>
                  <span style={{fontSize:'11px',color:'#4a5568'}}>{timeAgo(comment.created_at)}</span>
                  <button onClick={()=>handleLikeComment(comment.id,comment.likes_count)} style={{background:'none',border:'none',color:'#4a5568',fontSize:'11px',cursor:'pointer',padding:0}}>
                    ❤️ {comment.likes_count||0}
                  </button>
                  <button onClick={()=>{setReplyTo(comment);inputRef.current?.focus()}} style={{background:'none',border:'none',color:'#4a5568',fontSize:'11px',cursor:'pointer',padding:0}}>
                    Reply
                  </button>
                </div>
              </div>
            </div>

            {/* Replies */}
            {getReplies(comment.id).map(reply => (
              <div key={reply.id} style={{display:'flex',gap:'8px',marginTop:'8px',paddingLeft:'48px'}}>
                <div style={{width:'30px',height:'30px',borderRadius:'50%',overflow:'hidden',background:'linear-gradient(135deg,#00e5ff,#00ff88)',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}} onClick={()=>window.location.href=`/user/${reply.profiles?.id}`}>
                  {reply.profiles?.avatar_url
                    ? <img src={reply.profiles.avatar_url} style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                    : <span style={{fontWeight:'800',color:'#070a10',fontSize:'12px'}}>{(reply.profiles?.full_name||'E')[0].toUpperCase()}</span>
                  }
                </div>
                <div style={{flex:1}}>
                  <div style={{background:'rgba(255,255,255,0.03)',borderRadius:'10px',padding:'8px 10px'}}>
                    <div style={{fontSize:'11px',fontWeight:'700',color:'#00ff88',marginBottom:'3px'}}>{reply.profiles?.full_name||reply.profiles?.username}</div>
                    <div style={{fontSize:'12px',color:'#c0c8d8',lineHeight:'1.4'}}>{reply.content}</div>
                  </div>
                  <div style={{display:'flex',gap:'12px',padding:'3px 4px 0'}}>
                    <span style={{fontSize:'10px',color:'#4a5568'}}>{timeAgo(reply.created_at)}</span>
                    <button onClick={()=>handleLikeComment(reply.id,reply.likes_count)} style={{background:'none',border:'none',color:'#4a5568',fontSize:'10px',cursor:'pointer',padding:0}}>❤️ {reply.likes_count||0}</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* INPUT */}
      <div style={{position:'fixed',bottom:0,left:0,right:0,background:'rgba(7,10,16,0.98)',borderTop:'1px solid rgba(255,255,255,0.07)',padding:'10px 16px 24px'}}>
        {replyTo && (
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'6px',padding:'4px 8px',background:'rgba(0,229,255,0.06)',borderRadius:'8px'}}>
            <span style={{fontSize:'12px',color:'#00e5ff'}}>↩ Replying to @{replyTo.profiles?.username}</span>
            <button onClick={()=>setReplyTo(null)} style={{background:'none',border:'none',color:'#4a5568',fontSize:'16px',cursor:'pointer'}}>✕</button>
          </div>
        )}
        <div style={{display:'flex',gap:'10px',alignItems:'center'}}>
          <input
            ref={inputRef}
            value={text}
            onChange={e=>setText(e.target.value)}
            onKeyDown={e=>e.key==='Enter'&&sendComment()}
            placeholder={replyTo?`Reply to ${replyTo.profiles?.username}...`:'Add a comment...'}
            style={{flex:1,background:'#111620',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'24px',padding:'12px 16px',color:'#eef2f7',fontSize:'14px',outline:'none'}}
          />
          <button onClick={sendComment} disabled={!text.trim()||sending} style={{width:'44px',height:'44px',borderRadius:'50%',background:text.trim()?'linear-gradient(135deg,#00e5ff,#00ff88)':'rgba(255,255,255,0.05)',border:'none',fontSize:'20px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,transition:'all 0.2s'}}>
            {sending?'⏳':'↗'}
          </button>
        </div>
      </div>
    </div>
  )
          }
