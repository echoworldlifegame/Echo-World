'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
const timeAgo = d => {
  const s = Math.floor((Date.now() - new Date(d)) / 1000)
  if (s < 60)     return 'এইমাত্র'
  if (s < 3600)   return Math.floor(s/60) + ' মিনিট'
  if (s < 86400)  return Math.floor(s/3600) + ' ঘণ্টা'
  if (s < 604800) return Math.floor(s/86400) + ' দিন'
  return Math.floor(s/604800) + ' সপ্তাহ'
}
const fmtNum = n => n >= 1e6 ? (n/1e6).toFixed(1)+'M' : n >= 1000 ? (n/1000).toFixed(1)+'K' : String(n||0)
const getName = p => p?.full_name || p?.username || 'Explorer'

// ─────────────────────────────────────────────
// LEVEL SYSTEM
// ─────────────────────────────────────────────
const LEVELS = [
  { min:0,    label:'Explorer',    emoji:'🧭', color:'#64748b', glow:'rgba(100,116,139,.5)',  bg:'rgba(100,116,139,.08)' },
  { min:100,  label:'Rising Star', emoji:'⭐', color:'#00e5ff', glow:'rgba(0,229,255,.5)',    bg:'rgba(0,229,255,.08)'   },
  { min:500,  label:'Elite',       emoji:'⚡', color:'#00ff88', glow:'rgba(0,255,136,.5)',    bg:'rgba(0,255,136,.08)'   },
  { min:1200, label:'Champion',    emoji:'🏆', color:'#ffca28', glow:'rgba(255,202,40,.5)',   bg:'rgba(255,202,40,.08)'  },
  { min:2500, label:'Diamond',     emoji:'💎', color:'#a78bfa', glow:'rgba(167,139,250,.5)',  bg:'rgba(167,139,250,.08)' },
  { min:5000, label:'Legend',      emoji:'🌟', color:'#ff6b35', glow:'rgba(255,107,53,.5)',   bg:'rgba(255,107,53,.08)'  },
  { min:9999, label:'God Mode',    emoji:'👑', color:'#ff4560', glow:'rgba(255,69,96,.6)',    bg:'rgba(255,69,96,.08)'   },
]
const getLevel = xp => [...LEVELS].reverse().find(l => xp >= l.min) || LEVELS[0]
const getNextLevel = xp => { const i = LEVELS.findIndex(l => l===getLevel(xp)); return LEVELS[i+1]||null }
const getXpPct = xp => { const l=getLevel(xp),n=getNextLevel(xp); return n ? Math.round(((xp-l.min)/(n.min-l.min))*100) : 100 }

// ─────────────────────────────────────────────
// GIFTS
// ─────────────────────────────────────────────
const GIFTS = [
  { e:'🌹', n:'Rose',      c:5,   color:'#ff6b9d', particle:'❤️' },
  { e:'❤️', n:'Heart',     c:10,  color:'#ff4560', particle:'💗' },
  { e:'🎂', n:'Cake',      c:20,  color:'#ffca28', particle:'✨' },
  { e:'🌟', n:'Star',      c:30,  color:'#ffd700', particle:'⭐' },
  { e:'🦋', n:'Butterfly', c:40,  color:'#a78bfa', particle:'🌸' },
  { e:'💎', n:'Diamond',   c:50,  color:'#00e5ff', particle:'💠' },
  { e:'🚀', n:'Rocket',    c:100, color:'#00ff88', particle:'🌙' },
  { e:'🏆', n:'Trophy',    c:200, color:'#ff6b35', particle:'🔥' },
  { e:'👑', n:'Crown',     c:500, color:'#ffd700', particle:'✨' },
  { e:'🌌', n:'Galaxy',    c:999, color:'#ff4560', particle:'🌠' },
]

// ─────────────────────────────────────────────
// REPORT REASONS
// ─────────────────────────────────────────────
const REPORT_REASONS = [
  { icon:'🚫', label:'Spam বা Fake account' },
  { icon:'😡', label:'Harassment বা Bullying' },
  { icon:'🔞', label:'Inappropriate content' },
  { icon:'💰', label:'Scam বা Fraud' },
  { icon:'⚠️', label:'Violence বা Threats' },
  { icon:'📢', label:'Misinformation ছড়ানো' },
  { icon:'🔏', label:'Privacy violation' },
  { icon:'📌', label:'অন্য কারণ' },
]

// ─────────────────────────────────────────────
// CSS ANIMATIONS
// ─────────────────────────────────────────────
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800;900&family=DM+Sans:wght@400;500;600;700&display=swap');
  *{box-sizing:border-box;margin:0;padding:0}
  ::-webkit-scrollbar{display:none}
  body{font-family:'DM Sans',system-ui,sans-serif;background:#060810;color:#eef2f7}
  @keyframes spin    { to{transform:rotate(360deg)} }
  @keyframes fadeUp  { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
  @keyframes fadeIn  { from{opacity:0} to{opacity:1} }
  @keyframes slideUp { from{transform:translateY(110%)} to{transform:translateY(0)} }
  @keyframes popIn   { 0%{transform:scale(.7);opacity:0} 70%{transform:scale(1.08)} 100%{transform:scale(1);opacity:1} }
  @keyframes floatUp { 0%{opacity:1;transform:translateY(0) scale(1)} 100%{opacity:0;transform:translateY(-150px) scale(2)} }
  @keyframes shimmer { 0%{background-position:-600px 0} 100%{background-position:600px 0} }
  @keyframes pulsate { 0%,100%{opacity:.5;transform:scale(1)} 50%{opacity:1;transform:scale(1.05)} }
  @keyframes ringAnim{ 0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)} }
  @keyframes heartPop{ 0%{transform:scale(1)} 30%{transform:scale(1.4)} 60%{transform:scale(.9)} 100%{transform:scale(1)} }
  @keyframes storyProgress { from{width:0%} to{width:100%} }
  @keyframes particleFly { 0%{opacity:1;transform:translate(0,0) scale(1)} 100%{opacity:0;transform:translate(var(--tx),var(--ty)) scale(0)} }
  @keyframes gradientShift { 0%,100%{background-position:0% 50%} 50%{background-position:100% 50%} }
  @keyframes borderGlow { 0%,100%{box-shadow:0 0 8px var(--glow)} 50%{box-shadow:0 0 24px var(--glow),0 0 48px var(--glow)} }
  @keyframes tabSlide { from{opacity:0;transform:translateX(10px)} to{opacity:1;transform:translateX(0)} }
  .post-thumb:active{transform:scale(.95);transition:transform .1s}
  .btn-tap:active{transform:scale(.94)}
  .user-card:active{background:rgba(255,255,255,.07)!important}
  input,textarea{font-family:'DM Sans',system-ui,sans-serif}
  input::placeholder,textarea::placeholder{color:#2a3040}
`

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════
export default function UserProfile({ params }) {
  const targetId = params?.id

  // ── Auth & Data ──
  const [user,          setUser]          = useState(null)
  const [myProfile,     setMyProfile]     = useState(null)
  const [profile,       setProfile]       = useState(null)
  const [posts,         setPosts]         = useState([])
  const [loading,       setLoading]       = useState(true)

  // ── Social ──
  const [supported,     setSupported]     = useState(false)
  const [supportCount,  setSupportCount]  = useState(0)
  const [supportingCnt, setSupportingCnt] = useState(0)
  const [isBlocked,     setIsBlocked]     = useState(false)
  const [mutualFriends, setMutualFriends] = useState([])

  // ── Tabs ──
  const [activeTab,     setActiveTab]     = useState('posts')
  const [postFilter,    setPostFilter]    = useState('all')

  // ── Modals ──
  const [modal,         setModal]         = useState(null)
  const [modalList,     setModalList]     = useState([])
  const [modalLoading,  setModalLoading]  = useState(false)

  // ── Gift ──
  const [myCoinBal,     setMyCoinBal]     = useState(0)
  const [selectedGift,  setSelectedGift]  = useState(null)
  const [giftSending,   setGiftSending]   = useState(false)
  const [giftDone,      setGiftDone]      = useState(false)
  const [floatParticles,setFloatParticles]= useState([])

  // ── Message ──
  const [msgText,       setMsgText]       = useState('')
  const [msgSending,    setMsgSending]    = useState(false)
  const [msgDone,       setMsgDone]       = useState(false)

  // ── Report ──
  const [reportReason,  setReportReason]  = useState('')
  const [reportExtra,   setReportExtra]   = useState('')
  const [reportDone,    setReportDone]    = useState(false)

  // ── Post view ──
  const [viewPost,      setViewPost]      = useState(null)
  const [postComments,  setPostComments]  = useState([])
  const [commentText,   setCommentText]   = useState('')
  const [commentLoading,setCommentLoading]= useState(false)
  const [postLiked,     setPostLiked]     = useState({})
  const [postLikes,     setPostLikes]     = useState({})
  const [postSaved,     setPostSaved]     = useState({})
  const [showSharePost, setShowSharePost] = useState(false)
  const [shareCopied,   setShareCopied]   = useState(false)
  const [relatedPosts,  setRelatedPosts]  = useState([])
  const [commentLiked,  setCommentLiked]  = useState({})
  const [replyTo,       setReplyTo]       = useState(null)

  // ── Stories ──
  const [stories,       setStories]       = useState([])
  const [storyIdx,      setStoryIdx]      = useState(null)
  const [storyPause,    setStoryPause]    = useState(false)
  const storyTimerRef   = useRef(null)
  const [storyTimeLeft, setStoryTimeLeft] = useState(5)

  // ── Misc ──
  const [profileCopied, setProfileCopied]= useState(false)
  const [showMore,      setShowMore]      = useState(false) // more menu
  const [totalLikes,    setTotalLikes]    = useState(0)
  const [totalViews,    setTotalViews]    = useState(0)
  const commentInputRef = useRef(null)

  // ─────────────────────────────────────────────
  // INIT LOAD
  // ─────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { window.location.href = '/'; return }
      const u = data.session.user
      setUser(u)
      if (u.id === targetId) { window.location.href = '/profile'; return }
      await loadAll(u)
    })
  }, [targetId])

  const loadAll = async (u) => {
    const [
      { data: p },
      { data: myP },
      { data: ps },
      { data: followRow },
      { count: supCount },
      { count: supingCount },
    ] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', targetId).single(),
      supabase.from('profiles').select('id,username,full_name,avatar_url,coin_balance,xp').eq('id', u.id).single(),
      supabase.from('posts').select('*').eq('user_id', targetId).order('created_at', { ascending: false }),
      supabase.from('followers').select('id').eq('follower_id', u.id).eq('following_id', targetId).maybeSingle(),
      supabase.from('followers').select('*',{count:'exact',head:true}).eq('following_id', targetId),
      supabase.from('followers').select('*',{count:'exact',head:true}).eq('follower_id', targetId),
    ])

    setProfile(p)
    setMyProfile(myP)
    setPosts(ps || [])
    setSupported(!!followRow)
    setSupportCount(supCount || 0)
    setSupportingCnt(supingCount || 0)
    setMyCoinBal(myP?.coin_balance || 0)
    setTotalLikes((ps||[]).reduce((s,x)=>s+(x.likes_count||0),0))
    setTotalViews((ps||[]).reduce((s,x)=>s+(x.views_count||0),0))

    // Like states
    if (ps?.length) {
      const { data: likedData } = await supabase.from('likes')
        .select('post_id').eq('user_id', u.id)
        .in('post_id', ps.map(x=>x.id))
      const likedMap={}, likesMap={}
      ps.forEach(x=>{ likesMap[x.id]=x.likes_count||0 })
      ;(likedData||[]).forEach(l=>{ likedMap[l.post_id]=true })
      setPostLiked(likedMap); setPostLikes(likesMap)
    }

    // Stories
    const { data: st } = await supabase.from('stories')
      .select('*').eq('user_id', targetId)
      .gte('created_at', new Date(Date.now()-86400000).toISOString())
      .order('created_at', { ascending: true })
    setStories(st||[])

    // Mutual friends
    try {
      const [{ data: myF }, { data: theirF }] = await Promise.all([
        supabase.from('followers').select('following_id').eq('follower_id', u.id).limit(200),
        supabase.from('followers').select('following_id').eq('follower_id', targetId).limit(200),
      ])
      if (myF && theirF) {
        const mySet = new Set(myF.map(f=>f.following_id))
        const mutualIds = theirF.filter(f=>mySet.has(f.following_id)).map(f=>f.following_id).slice(0,5)
        if (mutualIds.length) {
          const { data: mps } = await supabase.from('profiles')
            .select('id,username,full_name,avatar_url').in('id', mutualIds)
          setMutualFriends(mps||[])
        }
      }
    } catch {}

    setLoading(false)
  }

  // ─────────────────────────────────────────────
  // SUPPORT TOGGLE
  // ─────────────────────────────────────────────
  const handleSupport = async () => {
    if (!user) return
    if (supported) {
      await supabase.from('followers').delete().eq('follower_id',user.id).eq('following_id',targetId)
      setSupported(false); setSupportCount(p=>Math.max(0,p-1))
    } else {
      await supabase.from('followers').upsert({follower_id:user.id,following_id:targetId})
      setSupported(true); setSupportCount(p=>p+1)
      supabase.from('notifications').insert({
        user_id:targetId, from_user_id:user.id, type:'follow', read:false,
        message:`🌍 @${myProfile?.username||'Someone'} তোমাকে Support করতে শুরু করেছে!`
      })
    }
  }

  // ─────────────────────────────────────────────
  // MODAL: SUPPORTERS / SUPPORTING
  // ─────────────────────────────────────────────
  const openListModal = async (type) => {
    setModal(type); setModalLoading(true); setModalList([])
    if (type==='supporters') {
      const { data } = await supabase.from('followers')
        .select('profiles!followers_follower_id_fkey(id,username,full_name,avatar_url)')
        .eq('following_id', targetId)
      setModalList((data||[]).map(d=>d.profiles).filter(Boolean))
    } else {
      const { data } = await supabase.from('followers')
        .select('profiles!followers_following_id_fkey(id,username,full_name,avatar_url)')
        .eq('follower_id', targetId)
      setModalList((data||[]).map(d=>d.profiles).filter(Boolean))
    }
    setModalLoading(false)
  }

  // ─────────────────────────────────────────────
  // GIFT
  // ─────────────────────────────────────────────
  const sendGift = async (g) => {
    if (!user||giftSending||!g) return
    if (myCoinBal < g.c) { alert(`🪙 Coin কম!\nদরকার: ${g.c}\nআছে: ${myCoinBal}`); return }
    setGiftSending(true)
    try {
      const { data: fresh } = await supabase.from('profiles').select('coin_balance').eq('id',user.id).single()
      const bal = fresh?.coin_balance||0
      if (bal < g.c) { alert(`Balance কম! আছে: ${bal}`); setGiftSending(false); return }

      await supabase.from('profiles').update({coin_balance: bal-g.c}).eq('id',user.id)
      setMyCoinBal(bal-g.c)

      const recv = Math.floor(g.c*0.8)
      const { data: rp } = await supabase.from('profiles').select('coin_balance').eq('id',targetId).single()
      await supabase.from('profiles').update({coin_balance:(rp?.coin_balance||0)+recv}).eq('id',targetId)

      await supabase.from('coin_transactions').insert([
        {user_id:user.id,  amount:-g.c, type:'gift_sent',     note:`${g.e} ${g.n} → @${profile?.username}`},
        {user_id:targetId, amount:recv,  type:'gift_received', note:`${g.e} ${g.n} from @${myProfile?.username}`},
      ])
      await supabase.from('notifications').insert({
        user_id:targetId, from_user_id:user.id, type:'gift', read:false,
        message:`🎁 @${myProfile?.username||'কেউ'} তোমাকে ${g.e} ${g.n} gift করেছে! (+${recv} 🪙)`
      })

      // Particles
      const particles = Array.from({length:8},(_,i)=>({
        id:Date.now()+i, emoji:g.particle,
        x: Math.random()*200-100, y: -(Math.random()*150+50)
      }))
      setFloatParticles(particles)
      setTimeout(()=>setFloatParticles([]),2500)

      setGiftDone(true)
      setTimeout(()=>{ setGiftDone(false); setModal(null); setSelectedGift(null) },2200)
    } catch(e){ alert('Error: '+e.message) }
    setGiftSending(false)
  }

  // ─────────────────────────────────────────────
  // MESSAGE
  // ─────────────────────────────────────────────
  const sendMessage = async () => {
    if (!msgText.trim()||msgSending) return
    setMsgSending(true)
    try {
      await supabase.from('messages').insert({
        sender_id:user.id, receiver_id:targetId,
        content:msgText.trim(), read:false
      })
      await supabase.from('notifications').insert({
        user_id:targetId, from_user_id:user.id, type:'message', read:false,
        message:`💬 @${myProfile?.username} তোমাকে message করেছে`
      })
      setMsgDone(true)
      setTimeout(()=>{ setMsgDone(false); setModal(null); setMsgText('') },2000)
    } catch(e){ alert('Error: '+e.message) }
    setMsgSending(false)
  }

  // ─────────────────────────────────────────────
  // REPORT
  // ─────────────────────────────────────────────
  const submitReport = async () => {
    if (!reportReason) return
    await supabase.from('reports').insert({
      reporter_id:user.id, reported_id:targetId,
      reason:reportReason, extra:reportExtra, type:'user'
    }).catch(()=>{})
    setReportDone(true)
    setTimeout(()=>{ setReportDone(false); setModal(null); setReportReason(''); setReportExtra('') },2000)
  }

  // ─────────────────────────────────────────────
  // POST VIEW
  // ─────────────────────────────────────────────
  const openPost = async (post) => {
    setViewPost(post); setModal('postView'); setPostComments([]); setRelatedPosts([])
    // view count
    supabase.from('posts').update({views_count:(post.views_count||0)+1}).eq('id',post.id).then(()=>{})
    const { data: cms } = await supabase.from('comments')
      .select('*, profiles(id,username,full_name,avatar_url)')
      .eq('post_id', post.id).order('created_at',{ascending:false}).limit(40)
    setPostComments(cms||[])
    // Related
    const { data: rel } = await supabase.from('posts').select('*')
      .eq('user_id',targetId).neq('id',post.id)
      .order('likes_count',{ascending:false}).limit(6)
    setRelatedPosts(rel||[])
  }

  const sendComment = async () => {
    if (!commentText.trim()||commentLoading||!viewPost) return
    setCommentLoading(true)
    const content = replyTo ? `@${replyTo} ${commentText.trim()}` : commentText.trim()
    const { data: cm } = await supabase.from('comments').insert({
      post_id:viewPost.id, user_id:user.id, content
    }).select('*, profiles(id,username,full_name,avatar_url)').single()
    if (cm) {
      setPostComments(p=>[cm,...p])
      if (user.id!==targetId) {
        await supabase.from('notifications').insert({
          user_id:targetId, from_user_id:user.id, type:'comment', read:false,
          message:`💬 @${myProfile?.username} comment করেছে: "${content.slice(0,40)}"`
        })
      }
    }
    setCommentText(''); setCommentLoading(false); setReplyTo(null)
  }

  const togglePostLike = async (post) => {
    if (!user) return
    const isLiked = postLiked[post.id]
    setPostLiked(p=>({...p,[post.id]:!isLiked}))
    setPostLikes(p=>({...p,[post.id]:(p[post.id]||0)+(isLiked?-1:1)}))
    if (isLiked) {
      await supabase.from('likes').delete().eq('post_id',post.id).eq('user_id',user.id)
      supabase.from('posts').update({likes_count:Math.max(0,(post.likes_count||0)-1)}).eq('id',post.id)
    } else {
      await supabase.from('likes').upsert({post_id:post.id,user_id:user.id})
      supabase.from('posts').update({likes_count:(post.likes_count||0)+1}).eq('id',post.id)
      if (user.id!==targetId) {
        supabase.from('notifications').insert({
          user_id:targetId, from_user_id:user.id, type:'like', read:false,
          message:`❤️ @${myProfile?.username} তোমার post টি like করেছে`
        })
      }
    }
  }

  const toggleSavePost = async (postId) => {
    const isSaved = postSaved[postId]
    setPostSaved(p=>({...p,[postId]:!isSaved}))
    if (isSaved) {
      await supabase.from('saved_posts').delete().eq('post_id',postId).eq('user_id',user.id)
    } else {
      await supabase.from('saved_posts').upsert({post_id:postId,user_id:user.id})
    }
  }

  const copyPostLink = (postId) => {
    navigator.clipboard?.writeText(`${window.location.origin}/comments/${postId}`)
    setShareCopied(true); setTimeout(()=>setShareCopied(false),2000)
  }

  // ─────────────────────────────────────────────
  // STORIES
  // ─────────────────────────────────────────────
  const openStory = (idx) => {
    setStoryIdx(idx); setStoryTimeLeft(5); setStoryPause(false)
    clearInterval(storyTimerRef.current)
    storyTimerRef.current = setInterval(()=>{
      setStoryTimeLeft(t=>{
        if (t<=1) {
          const next = idx+1
          if (next<stories.length) { openStory(next) }
          else closeStory()
          return 5
        }
        return t-0.1
      })
    },100)
  }
  const closeStory = () => {
    clearInterval(storyTimerRef.current)
    setStoryIdx(null); setStoryTimeLeft(5)
  }
  useEffect(()=>()=>clearInterval(storyTimerRef.current),[])

  // ─────────────────────────────────────────────
  // SHARE
  // ─────────────────────────────────────────────
  const shareProfile = () => {
    const url = `${window.location.origin}/user/${targetId}`
    if (navigator.share) {
      navigator.share({title:`${getName(profile)} — Echo World`,url})
    } else {
      navigator.clipboard?.writeText(url)
      setProfileCopied(true); setTimeout(()=>setProfileCopied(false),2500)
    }
  }

  // ─────────────────────────────────────────────
  // DERIVED
  // ─────────────────────────────────────────────
  const xp    = profile?.xp||0
  const lv    = getLevel(xp)
  const nextL = getNextLevel(xp)
  const xpPct = getXpPct(xp)

  const filteredPosts = posts.filter(p=>{
    if (postFilter==='photos')   return p.media_type==='photo'
    if (postFilter==='videos')   return p.media_type==='video'
    if (postFilter==='capsules') return p.media_type==='capsule'
    if (postFilter==='text')     return !p.media_url
    return true
  })

  const hasStories = stories.length>0

  // ─────────────────────────────────────────────
  // LOADING SCREEN
  // ─────────────────────────────────────────────
  if (loading) return (
    <div style={{height:'100vh',background:'#060810',display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:20}}>
      <style>{GLOBAL_CSS}</style>
      <div style={{position:'relative',width:72,height:72}}>
        <div style={{position:'absolute',inset:0,borderRadius:'50%',border:`2px solid ${lv.color}22`}}/>
        <div style={{position:'absolute',inset:0,borderRadius:'50%',border:`2px solid transparent`,borderTopColor:lv.color,animation:'spin 1s linear infinite'}}/>
        <div style={{position:'absolute',inset:10,borderRadius:'50%',border:`1px solid ${lv.color}33`,animation:'spin 2s linear infinite reverse'}}/>
        <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:20}}>⬡</div>
      </div>
      <div style={{fontSize:13,color:'#2a3040',fontWeight:600,animation:'pulsate 1.5s infinite'}}>Profile লোড হচ্ছে...</div>
    </div>
  )

  // ─────────────────────────────────────────────
  // MAIN RENDER
  // ─────────────────────────────────────────────
  return (
    <div style={{minHeight:'100vh',background:'#060810',color:'#eef2f7',paddingBottom:90,overflowX:'hidden'}}>
      <style>{GLOBAL_CSS}</style>

      {/* ── FLOATING PARTICLES ── */}
      {floatParticles.map((p,i)=>(
        <div key={p.id} style={{
          position:'fixed', bottom:'40%', left:'50%', fontSize:24, zIndex:999,
          animation:'floatUp 2.2s ease-out forwards',
          animationDelay:`${i*0.08}s`,
          '--tx':`${p.x}px`, '--ty':`${p.y}px`,
          pointerEvents:'none'
        }}>{p.emoji}</div>
      ))}

      {/* ══════════════════════════════════════ */}
      {/* TOP BAR */}
      {/* ══════════════════════════════════════ */}
      <div style={{
        position:'sticky',top:0,zIndex:100,
        background:'rgba(6,8,16,.94)',backdropFilter:'blur(24px)',
        borderBottom:'1px solid rgba(255,255,255,.05)',
        padding:'0 14px',height:56,
        display:'flex',alignItems:'center',justifyContent:'space-between'
      }}>
        <button className="btn-tap" onClick={()=>window.history.back()} style={{
          width:38,height:38,borderRadius:11,
          background:'rgba(255,255,255,.06)',border:'1px solid rgba(255,255,255,.08)',
          color:'#eef2f7',fontSize:18,cursor:'pointer',
          display:'flex',alignItems:'center',justifyContent:'center'
        }}>←</button>

        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <span style={{fontSize:15,fontWeight:800,fontFamily:"'Sora',sans-serif",letterSpacing:-.3}}>{getName(profile)}</span>
          <span style={{
            fontSize:10,fontWeight:800,
            background:lv.bg,border:`1px solid ${lv.color}44`,
            color:lv.color,borderRadius:20,padding:'2px 8px'
          }}>{lv.emoji} {lv.label}</span>
        </div>

        <div style={{display:'flex',gap:8}}>
          <button className="btn-tap" onClick={()=>setShowMore(true)} style={{
            width:38,height:38,borderRadius:11,
            background:'rgba(255,255,255,.06)',border:'1px solid rgba(255,255,255,.08)',
            color:'#8892a4',fontSize:18,cursor:'pointer',
            display:'flex',alignItems:'center',justifyContent:'center'
          }}>⋯</button>
        </div>
      </div>

      {/* ══════════════════════════════════════ */}
      {/* HERO SECTION */}
      {/* ══════════════════════════════════════ */}
      <div style={{position:'relative',height:230,overflow:'hidden'}}>
        {/* Animated BG */}
        <div style={{position:'absolute',inset:0,background:`linear-gradient(145deg,${lv.color}1a 0%,#060810 55%,rgba(0,229,255,.06) 100%)`}}/>
        <div style={{position:'absolute',inset:0,backgroundImage:`radial-gradient(circle at 25% 60%,${lv.color}18 0%,transparent 50%),radial-gradient(circle at 80% 20%,rgba(0,229,255,.1) 0%,transparent 40%)`}}/>
        {/* Grid pattern */}
        <div style={{position:'absolute',inset:0,backgroundImage:`linear-gradient(${lv.color}07 1px,transparent 1px),linear-gradient(90deg,${lv.color}07 1px,transparent 1px)`,backgroundSize:'40px 40px'}}/>
        {/* Geometric hex */}
        <svg style={{position:'absolute',right:-30,top:-30,opacity:.07}} width={240} height={240} viewBox="0 0 240 240">
          <polygon points="120,12 210,66 210,174 120,228 30,174 30,66" fill="none" stroke={lv.color} strokeWidth={1.5}/>
          <polygon points="120,38 188,78 188,162 120,202 52,162 52,78" fill="none" stroke={lv.color} strokeWidth={1}/>
          <polygon points="120,64 166,90 166,150 120,176 74,150 74,90" fill="none" stroke={lv.color} strokeWidth={.6}/>
          <circle cx="120" cy="120" r="16" fill="none" stroke={lv.color} strokeWidth={.5}/>
        </svg>
        {/* Glow orb */}
        <div style={{position:'absolute',top:40,left:30,width:120,height:120,background:lv.color,opacity:.05,borderRadius:'50%',filter:'blur(40px)'}}/>

        {profile?.cover_url&&<img src={profile.cover_url} style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover',opacity:.25,mixBlendMode:'luminosity'}}/>}

        {/* Level badge */}
        <div style={{
          position:'absolute',top:14,right:14,
          background:'rgba(6,8,16,.7)',backdropFilter:'blur(12px)',
          border:`1px solid ${lv.color}33`,borderRadius:24,
          padding:'5px 14px',display:'flex',alignItems:'center',gap:7
        }}>
          <span style={{fontSize:16}}>{lv.emoji}</span>
          <div>
            <div style={{fontSize:10,fontWeight:900,color:lv.color,lineHeight:1}}>{lv.label}</div>
            <div style={{fontSize:9,color:'#4a5568'}}>{fmtNum(xp)} XP</div>
          </div>
        </div>

        {/* Coin balance badge */}
        <div style={{
          position:'absolute',top:14,left:14,
          background:'rgba(6,8,16,.7)',backdropFilter:'blur(12px)',
          border:'1px solid rgba(255,215,0,.2)',borderRadius:24,
          padding:'5px 12px',display:'flex',alignItems:'center',gap:5
        }}>
          <span style={{fontSize:14}}>🪙</span>
          <span style={{fontSize:11,fontWeight:800,color:'#ffd700'}}>{fmtNum(profile?.coin_balance||0)}</span>
        </div>
      </div>

      {/* ══════════════════════════════════════ */}
      {/* AVATAR + ACTIONS */}
      {/* ══════════════════════════════════════ */}
      <div style={{padding:'0 16px',marginTop:-60,position:'relative',zIndex:10}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-end',marginBottom:16}}>

          {/* Avatar */}
          <div style={{position:'relative',cursor:hasStories?'pointer':'default'}} onClick={()=>hasStories&&openStory(0)}>
            {hasStories&&(
              <div style={{
                position:'absolute',inset:-4,borderRadius:'50%',
                background:`conic-gradient(${lv.color},${lv.color}44,${lv.color})`,
                animation:'ringAnim 3s linear infinite'
              }}/>
            )}
            <div style={{position:'absolute',inset:hasStories?-4:0,borderRadius:'50%',background:'#060810'}}/>
            <div style={{
              position:'relative',width:92,height:92,borderRadius:'50%',
              overflow:'hidden',
              border:`3px solid ${hasStories?'#060810':lv.color}`,
              background:`linear-gradient(135deg,${lv.color}22,#111)`,
              boxShadow:`0 0 0 1px ${lv.color}33, 0 8px 32px ${lv.glow}`,
              display:'flex',alignItems:'center',justifyContent:'center'
            }}>
              {profile?.avatar_url
                ?<img src={profile.avatar_url} style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                :<span style={{fontSize:36,fontWeight:900,fontFamily:"'Sora',sans-serif",background:`linear-gradient(135deg,${lv.color},#fff)`,WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>
                  {getName(profile)[0]?.toUpperCase()}
                </span>}
            </div>
            {hasStories&&(
              <div style={{
                position:'absolute',bottom:2,right:2,
                width:22,height:22,borderRadius:'50%',
                background:'linear-gradient(135deg,#ff6b35,#ffd700)',
                border:'2px solid #060810',
                display:'flex',alignItems:'center',justifyContent:'center',
                fontSize:10,fontWeight:900
              }}>{stories.length}</div>
            )}
          </div>

          {/* Action buttons */}
          <div style={{display:'flex',gap:8,alignItems:'center'}}>
            <button className="btn-tap" onClick={()=>setModal('gift')} style={{
              width:42,height:42,borderRadius:13,
              background:`linear-gradient(135deg,${lv.color}22,${lv.color}11)`,
              border:`1px solid ${lv.color}44`,
              color:lv.color,fontSize:20,cursor:'pointer',
              display:'flex',alignItems:'center',justifyContent:'center',
              boxShadow:`0 4px 12px ${lv.glow}`
            }}>🎁</button>

            <button className="btn-tap" onClick={()=>setModal('message')} style={{
              width:42,height:42,borderRadius:13,
              background:'rgba(0,229,255,.1)',border:'1px solid rgba(0,229,255,.25)',
              color:'#00e5ff',fontSize:20,cursor:'pointer',
              display:'flex',alignItems:'center',justifyContent:'center'
            }}>💬</button>

            <button className="btn-tap" onClick={handleSupport} style={{
              padding:'0 20px',height:42,borderRadius:13,
              background:supported?'rgba(255,255,255,.06)':`linear-gradient(135deg,${lv.color},${lv.color}bb)`,
              border:supported?`1px solid rgba(255,255,255,.1)`:'none',
              color:supported?'#8892a4':'#060810',
              fontSize:13,fontWeight:900,cursor:'pointer',
              fontFamily:"'Sora',sans-serif",
              boxShadow:supported?'none':`0 4px 20px ${lv.glow}`,
              transition:'all .25s'
            }}>
              {supported?'✓ Supporting':'+ Support'}
            </button>
          </div>
        </div>

        {/* ── NAME + BIO ── */}
        <div style={{marginBottom:14,animation:'fadeUp .35s ease'}}>
          <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap',marginBottom:4}}>
            <span style={{fontSize:22,fontWeight:900,fontFamily:"'Sora',sans-serif",letterSpacing:-.5}}>
              {getName(profile)}
            </span>
            {profile?.is_verified&&(
              <span style={{background:'rgba(0,229,255,.15)',border:'1px solid rgba(0,229,255,.3)',borderRadius:20,padding:'2px 8px',fontSize:10,color:'#00e5ff',fontWeight:700}}>
                ✓ Verified
              </span>
            )}
          </div>
          <div style={{fontSize:13,color:'#2a3040',marginBottom:7,fontWeight:500}}>@{profile?.username}</div>
          {profile?.bio&&(
            <div style={{fontSize:14,color:'#8892a4',lineHeight:1.7,marginBottom:8,borderLeft:`2px solid ${lv.color}44`,paddingLeft:10}}>
              {profile.bio}
            </div>
          )}
          {profile?.website&&(
            <a href={profile.website} target="_blank" rel="noreferrer" style={{
              fontSize:12,color:lv.color,textDecoration:'none',
              display:'inline-flex',alignItems:'center',gap:5,
              background:lv.bg,border:`1px solid ${lv.color}33`,
              borderRadius:20,padding:'4px 12px'
            }}>
              🌐 {profile.website.replace(/https?:\/\/(www\.)?/,'')}
            </a>
          )}
        </div>

        {/* ── MUTUAL FRIENDS ── */}
        {mutualFriends.length>0&&(
          <div style={{
            display:'flex',alignItems:'center',gap:10,
            marginBottom:14,padding:'10px 12px',
            background:'rgba(255,255,255,.03)',border:'1px solid rgba(255,255,255,.05)',
            borderRadius:14,animation:'fadeUp .4s ease'
          }}>
            <div style={{display:'flex'}}>
              {mutualFriends.slice(0,4).map((m,i)=>(
                <div key={m.id} style={{
                  width:24,height:24,borderRadius:'50%',overflow:'hidden',
                  border:'2px solid #060810',marginLeft:i>0?-10:0,
                  background:`linear-gradient(135deg,${lv.color},#111)`,
                  display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,fontWeight:800,color:lv.color
                }}>
                  {m.avatar_url?<img src={m.avatar_url} style={{width:'100%',height:'100%',objectFit:'cover'}}/>:(m.username||'?')[0].toUpperCase()}
                </div>
              ))}
            </div>
            <span style={{fontSize:11,color:'#4a5568',flex:1}}>
              {mutualFriends[0]?.full_name||mutualFriends[0]?.username}
              {mutualFriends.length>1?` এবং ${mutualFriends.length-1} জন আরো`:''}ও Support করে
            </span>
          </div>
        )}

        {/* ══════════════════════════════════════ */}
        {/* STATS CARDS */}
        {/* ══════════════════════════════════════ */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8,marginBottom:14}}>
          {[
            {ic:'📝',val:fmtNum(posts.length),lab:'Posts',fn:null},
            {ic:'❤️',val:fmtNum(totalLikes),lab:'Likes',fn:null},
            {ic:'👥',val:fmtNum(supportCount),lab:'Supporters',fn:()=>openListModal('supporters')},
            {ic:'🌍',val:fmtNum(supportingCnt),lab:'Supporting',fn:()=>openListModal('supporting')},
          ].map((s,i)=>(
            <div key={i} className="btn-tap" onClick={s.fn||undefined} style={{
              background:'#0c1020',border:'1px solid rgba(255,255,255,.05)',
              borderRadius:14,padding:'11px 6px',textAlign:'center',
              cursor:s.fn?'pointer':'default',
              position:'relative',overflow:'hidden',
              animation:`fadeUp ${.3+i*.07}s ease`
            }}>
              <div style={{position:'absolute',inset:0,background:`linear-gradient(135deg,${lv.color}06,transparent)`}}/>
              <div style={{fontSize:18,position:'relative'}}>{s.ic}</div>
              <div style={{fontSize:18,fontWeight:900,color:'#eef2f7',position:'relative',fontFamily:"'Sora',sans-serif"}}>{s.val}</div>
              <div style={{fontSize:9,color:'#2a3040',fontWeight:700,position:'relative',letterSpacing:.3}}>{s.lab}</div>
              {s.fn&&<div style={{position:'absolute',bottom:4,right:6,fontSize:8,color:lv.color+'66'}}>›</div>}
            </div>
          ))}
        </div>

        {/* ══════════════════════════════════════ */}
        {/* XP PROGRESS BAR */}
        {/* ══════════════════════════════════════ */}
        <div style={{
          background:'#0c1020',borderRadius:16,padding:'14px 16px',
          marginBottom:14,border:`1px solid ${lv.color}18`,
          animation:'fadeUp .5s ease'
        }}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              <div style={{
                width:36,height:36,borderRadius:10,
                background:lv.bg,border:`1px solid ${lv.color}33`,
                display:'flex',alignItems:'center',justifyContent:'center',fontSize:18
              }}>{lv.emoji}</div>
              <div>
                <div style={{fontSize:14,fontWeight:800,color:lv.color,fontFamily:"'Sora',sans-serif"}}>{lv.label}</div>
                <div style={{fontSize:10,color:'#4a5568'}}>{fmtNum(xp)} XP</div>
              </div>
            </div>
            {nextL&&(
              <div style={{textAlign:'right'}}>
                <div style={{fontSize:10,color:'#4a5568'}}>পরের level</div>
                <div style={{fontSize:12,fontWeight:700,color:nextL.color}}>{nextL.emoji} {nextL.label}</div>
                <div style={{fontSize:10,color:'#2a3040'}}>{fmtNum(nextL.min-xp)} XP বাকি</div>
              </div>
            )}
          </div>
          <div style={{height:6,background:'rgba(255,255,255,.06)',borderRadius:3,overflow:'hidden'}}>
            <div style={{
              height:'100%',width:`${xpPct}%`,borderRadius:3,
              background:`linear-gradient(90deg,${lv.color},${nextL?.color||lv.color})`,
              transition:'width 1.2s cubic-bezier(.4,0,.2,1)',
              boxShadow:`0 0 10px ${lv.glow}`
            }}/>
          </div>
          {/* Level milestones */}
          <div style={{display:'flex',justifyContent:'space-between',marginTop:6}}>
            {LEVELS.slice(0,5).map((l,i)=>(
              <div key={i} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:1}}>
                <span style={{fontSize:10,opacity:xp>=l.min?1:.3}}>{l.emoji}</span>
                <div style={{width:3,height:3,borderRadius:'50%',background:xp>=l.min?l.color:'#2a3040'}}/>
              </div>
            ))}
          </div>
        </div>

        {/* ══════════════════════════════════════ */}
        {/* ACHIEVEMENT BADGES */}
        {/* ══════════════════════════════════════ */}
        <div style={{marginBottom:14,animation:'fadeUp .55s ease'}}>
          <div style={{fontSize:12,fontWeight:800,color:'#4a5568',marginBottom:8,letterSpacing:.5}}>ACHIEVEMENTS</div>
          <div style={{display:'flex',gap:8,overflowX:'auto',scrollbarWidth:'none',paddingBottom:4}}>
            {[
              {show:posts.length>=1,      ic:'📝',label:'First Post',  color:'#00e5ff'},
              {show:posts.length>=10,     ic:'🔥',label:'10 Posts',    color:'#ff6b35'},
              {show:totalLikes>=100,      ic:'❤️',label:'100 Likes',   color:'#ff4560'},
              {show:supportCount>=10,     ic:'👥',label:'10 Fans',     color:'#00ff88'},
              {show:supportCount>=50,     ic:'🌟',label:'50 Fans',     color:'#ffd700'},
              {show:supportCount>=100,    ic:'💎',label:'100 Fans',    color:'#a78bfa'},
              {show:xp>=500,             ic:'⚡',label:'Elite XP',    color:'#00ff88'},
              {show:(profile?.coin_balance||0)>=100,ic:'🪙',label:'Coin Rich',color:'#ffd700'},
              {show:hasStories,           ic:'🎭',label:'Storyteller', color:'#ff6b9d'},
            ].filter(b=>b.show).map((b,i)=>(
              <div key={i} style={{
                display:'flex',flexDirection:'column',alignItems:'center',gap:4,
                padding:'8px 12px',borderRadius:12,flexShrink:0,
                background:`${b.color}10`,border:`1px solid ${b.color}30`,
                minWidth:60
              }}>
                <span style={{fontSize:20}}>{b.ic}</span>
                <span style={{fontSize:9,color:b.color,fontWeight:700,whiteSpace:'nowrap'}}>{b.label}</span>
              </div>
            ))}
            {posts.length===0&&totalLikes===0&&(
              <div style={{fontSize:12,color:'#2a3040',padding:'8px 0'}}>কোনো achievement এখনো নেই</div>
            )}
          </div>
        </div>

        {/* ══════════════════════════════════════ */}
        {/* TAB BAR */}
        {/* ══════════════════════════════════════ */}
        <div style={{
          display:'grid',gridTemplateColumns:'1fr 1fr 1fr',
          gap:0,background:'#0c1020',borderRadius:16,padding:4,
          marginBottom:14,border:'1px solid rgba(255,255,255,.05)'
        }}>
          {[
            ['posts','📸','Posts'],
            ['about','ℹ️','About'],
            ['activity','⚡','Activity'],
          ].map(([key,ic,lab])=>(
            <button key={key} className="btn-tap" onClick={()=>setActiveTab(key)} style={{
              padding:'10px 0',
              background:activeTab===key?`linear-gradient(135deg,${lv.color}33,${lv.color}18)`:'none',
              border:activeTab===key?`1px solid ${lv.color}30`:'1px solid transparent',
              borderRadius:12,
              color:activeTab===key?lv.color:'#2a3040',
              fontSize:12,fontWeight:700,cursor:'pointer',
              transition:'all .2s',
              display:'flex',alignItems:'center',justifyContent:'center',gap:5
            }}>
              {ic} {lab}
              {key==='posts'&&posts.length>0&&<span style={{
                fontSize:10,background:`${lv.color}22`,
                borderRadius:20,padding:'0 5px',color:lv.color
              }}>{posts.length}</span>}
            </button>
          ))}
        </div>

        {/* ══════════════════════════════════════ */}
        {/* POSTS TAB */}
        {/* ══════════════════════════════════════ */}
        {activeTab==='posts'&&(
          <div style={{animation:'tabSlide .25s ease'}}>
            {/* Filter chips */}
            <div style={{display:'flex',gap:7,marginBottom:12,overflowX:'auto',scrollbarWidth:'none',paddingBottom:2}}>
              {[['all','🌐','সব'],['photos','📸','Photos'],['videos','🎬','Videos'],['capsules','📦','Capsules'],['text','📝','Text']].map(([key,ic,lab])=>(
                <button key={key} className="btn-tap" onClick={()=>setPostFilter(key)} style={{
                  padding:'6px 14px',borderRadius:20,border:'none',cursor:'pointer',
                  fontSize:11,fontWeight:700,whiteSpace:'nowrap',flexShrink:0,
                  background:postFilter===key?`linear-gradient(135deg,${lv.color},${lv.color}88)`:'rgba(255,255,255,.05)',
                  color:postFilter===key?'#060810':'#4a5568',transition:'all .2s'
                }}>{ic} {lab}</button>
              ))}
            </div>

            {filteredPosts.length===0?(
              <div style={{textAlign:'center',padding:'48px 20px'}}>
                <div style={{fontSize:52,marginBottom:12}}>📭</div>
                <div style={{color:'#2a3040',fontSize:14,fontWeight:600}}>এই ক্যাটাগরিতে কোনো post নেই</div>
              </div>
            ):(
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:3}}>
                {filteredPosts.map((post,pi)=>(
                  <div key={post.id} className="post-thumb" onClick={()=>openPost(post)} style={{
                    position:'relative',paddingTop:'100%',
                    background:'#0c1020',overflow:'hidden',
                    borderRadius:8,cursor:'pointer',
                    animation:`fadeUp ${.1+pi*.02}s ease`
                  }}>
                    {post.media_url&&post.media_type==='photo'&&<img src={post.media_url} style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover'}}/>}
                    {post.media_url&&post.media_type==='video'&&(
                      <>
                        <video src={post.media_url} style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover'}} muted playsInline/>
                        <div style={{position:'absolute',top:6,right:6,background:'rgba(0,0,0,.6)',backdropFilter:'blur(4px)',borderRadius:6,padding:'2px 6px',fontSize:10,color:'#fff'}}>▶</div>
                      </>
                    )}
                    {post.media_type==='capsule'&&<div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',background:'linear-gradient(135deg,rgba(255,202,40,.08),rgba(255,165,0,.04))'}}><span style={{fontSize:30}}>📦</span><span style={{fontSize:8,color:'#ffca28',fontWeight:700,marginTop:4}}>CAPSULE</span></div>}
                    {!post.media_url&&post.media_type!=='capsule'&&<div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',padding:10,background:`${lv.color}06`}}><div style={{fontSize:10,color:'#8892a4',textAlign:'center',lineHeight:1.5}}>{post.content?.slice(0,50)}</div></div>}
                    {/* Gradient overlay */}
                    <div style={{position:'absolute',inset:0,background:'linear-gradient(to top,rgba(0,0,0,.65) 0%,transparent 55%)',pointerEvents:'none'}}/>
                    {/* Stats */}
                    <div style={{position:'absolute',bottom:5,left:6,display:'flex',gap:6,alignItems:'center'}}>
                      <span style={{fontSize:10,color:'#fff',fontWeight:700,display:'flex',alignItems:'center',gap:2}}>
                        <span style={{color:postLiked[post.id]?'#ff4560':'#fff'}}>❤️</span>
                        {postLikes[post.id]||post.likes_count||0}
                      </span>
                      {(post.comments_count||0)>0&&<span style={{fontSize:10,color:'rgba(255,255,255,.6)'}}>💬{post.comments_count}</span>}
                    </div>
                    {/* New badge */}
                    {pi===0&&<div style={{position:'absolute',top:6,left:6,background:lv.color,borderRadius:5,padding:'2px 6px',fontSize:8,fontWeight:900,color:'#060810'}}>NEW</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════ */}
        {/* ABOUT TAB */}
        {/* ══════════════════════════════════════ */}
        {activeTab==='about'&&(
          <div style={{animation:'tabSlide .25s ease'}}>
            {/* Profile info cards */}
            <div style={{display:'flex',flexDirection:'column',gap:8,marginBottom:16}}>
              {[
                profile?.full_name   &&['👤','Full Name',   profile.full_name],
                profile?.username    &&['🆔','Username',    '@'+profile.username],
                profile?.bio         &&['📝','Bio',         profile.bio],
                profile?.website     &&['🌐','Website',     profile.website],
                profile?.location    &&['📍','Location',    profile.location],
                profile?.created_at  &&['📅','Joined',      new Date(profile.created_at).toLocaleDateString('bn-BD',{year:'numeric',month:'long'})],
              ].filter(Boolean).map(([ic,label,val],i)=>(
                <div key={i} style={{
                  display:'flex',alignItems:'flex-start',gap:12,
                  padding:'13px 14px',
                  background:'#0c1020',borderRadius:13,
                  border:'1px solid rgba(255,255,255,.04)',
                  animation:`fadeUp ${.2+i*.06}s ease`
                }}>
                  <div style={{width:36,height:36,borderRadius:10,background:`${lv.color}10`,border:`1px solid ${lv.color}22`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,flexShrink:0}}>{ic}</div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:10,color:'#4a5568',fontWeight:700,marginBottom:3,letterSpacing:.4}}>{label}</div>
                    <div style={{fontSize:13,color:'#c0c8d8',lineHeight:1.6}}>{val}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Stats overview */}
            <div style={{
              background:`linear-gradient(135deg,${lv.color}10,${lv.color}05)`,
              border:`1px solid ${lv.color}22`,borderRadius:16,padding:16,marginBottom:14
            }}>
              <div style={{fontSize:12,fontWeight:800,color:lv.color,marginBottom:12}}>📊 Stats Overview</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                {[
                  ['📝','Total Posts',    fmtNum(posts.length)],
                  ['❤️','Total Likes',   fmtNum(totalLikes)],
                  ['👥','Supporters',    fmtNum(supportCount)],
                  ['🌍','Supporting',    fmtNum(supportingCnt)],
                  ['🪙','Coins',         fmtNum(profile?.coin_balance||0)],
                  ['⚡','XP Earned',    fmtNum(xp)],
                ].map(([ic,lab,val],i)=>(
                  <div key={i} style={{display:'flex',alignItems:'center',gap:8,padding:'8px 10px',background:'rgba(0,0,0,.3)',borderRadius:10}}>
                    <span style={{fontSize:16}}>{ic}</span>
                    <div>
                      <div style={{fontSize:10,color:'#4a5568'}}>{lab}</div>
                      <div style={{fontSize:14,fontWeight:800,color:'#eef2f7'}}>{val}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Level journey */}
            <div style={{background:'#0c1020',borderRadius:16,padding:16,border:'1px solid rgba(255,255,255,.04)'}}>
              <div style={{fontSize:12,fontWeight:800,color:'#4a5568',marginBottom:12}}>🏆 Level Journey</div>
              <div style={{display:'flex',flexDirection:'column',gap:6}}>
                {LEVELS.map((l,i)=>(
                  <div key={i} style={{
                    display:'flex',alignItems:'center',gap:10,
                    padding:'8px 10px',borderRadius:10,
                    background:xp>=l.min?`${l.color}0c`:'rgba(255,255,255,.02)',
                    border:`1px solid ${xp>=l.min?l.color+'22':'transparent'}`,
                    opacity:xp>=l.min?1:.35
                  }}>
                    <span style={{fontSize:18,width:28,textAlign:'center'}}>{l.emoji}</span>
                    <div style={{flex:1}}>
                      <div style={{fontSize:12,fontWeight:700,color:xp>=l.min?l.color:'#4a5568'}}>{l.label}</div>
                      <div style={{fontSize:9,color:'#4a5568'}}>{fmtNum(l.min)} XP থেকে</div>
                    </div>
                    {xp>=l.min?<span style={{fontSize:14}}>✓</span>:<span style={{fontSize:10,color:'#2a3040'}}>{fmtNum(l.min-xp)} XP</span>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════ */}
        {/* ACTIVITY TAB */}
        {/* ══════════════════════════════════════ */}
        {activeTab==='activity'&&(
          <div style={{animation:'tabSlide .25s ease'}}>
            <div style={{fontSize:12,fontWeight:800,color:'#4a5568',marginBottom:12,letterSpacing:.5}}>RECENT ACTIVITY</div>
            {posts.length===0&&(
              <div style={{textAlign:'center',padding:'40px 0',color:'#2a3040',fontSize:14}}>কোনো activity নেই</div>
            )}
            {posts.slice(0,20).map((post,i)=>(
              <div key={post.id} className="btn-tap" onClick={()=>openPost(post)} style={{
                display:'flex',alignItems:'center',gap:12,
                padding:'12px 12px',background:'#0c1020',
                borderRadius:13,marginBottom:7,
                border:'1px solid rgba(255,255,255,.04)',
                cursor:'pointer',animation:`fadeUp ${.1+i*.04}s ease`
              }}>
                {/* Thumbnail */}
                <div style={{width:50,height:50,borderRadius:11,overflow:'hidden',flexShrink:0,background:'#111',position:'relative'}}>
                  {post.media_url&&post.media_type==='photo'&&<img src={post.media_url} style={{width:'100%',height:'100%',objectFit:'cover'}}/>}
                  {post.media_url&&post.media_type==='video'&&<video src={post.media_url} style={{width:'100%',height:'100%',objectFit:'cover'}} muted playsInline/>}
                  {post.media_type==='capsule'&&<div style={{width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22}}>📦</div>}
                  {!post.media_url&&post.media_type!=='capsule'&&<div style={{width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center',background:`${lv.color}08`,fontSize:18}}>📝</div>}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:12,color:'#eef2f7',fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',marginBottom:4}}>
                    {post.content?.slice(0,48)||(post.media_type==='video'?'🎬 Video post':post.media_type==='capsule'?'📦 Capsule':'📸 Photo')}
                  </div>
                  <div style={{display:'flex',gap:10,fontSize:10,color:'#4a5568'}}>
                    <span>❤️ {postLikes[post.id]||post.likes_count||0}</span>
                    <span>💬 {post.comments_count||0}</span>
                    <span>🕐 {timeAgo(post.created_at)} আগে</span>
                  </div>
                </div>
                {/* Like btn */}
                <button className="btn-tap" onClick={e=>{e.stopPropagation();togglePostLike(post)}} style={{
                  width:36,height:36,borderRadius:10,
                  background:postLiked[post.id]?'rgba(255,69,96,.15)':'rgba(255,255,255,.05)',
                  border:`1px solid ${postLiked[post.id]?'rgba(255,69,96,.3)':'rgba(255,255,255,.07)'}`,
                  fontSize:16,cursor:'pointer',
                  display:'flex',alignItems:'center',justifyContent:'center',
                  animation:postLiked[post.id]?'heartPop .3s ease':'none'
                }}>{postLiked[post.id]?'❤️':'🤍'}</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════ */}
      {/* BOTTOM NAV */}
      {/* ══════════════════════════════════════ */}
      <div style={{
        position:'fixed',bottom:0,left:0,right:0,
        background:'rgba(6,8,16,.97)',backdropFilter:'blur(20px)',
        borderTop:'1px solid rgba(255,255,255,.05)',
        display:'flex',justifyContent:'space-around',
        padding:'10px 0 22px',zIndex:100
      }}>
        {[['🏠','Feed','/feed'],['🗺','Map','/map'],['📸','Post','/post'],['🏆','Rank','/leaderboard'],['👤','Me','/profile']].map(([ic,lab,path])=>(
          <div key={path} className="btn-tap" onClick={()=>window.location.href=path} style={{
            display:'flex',flexDirection:'column',alignItems:'center',gap:3,cursor:'pointer',color:'#2a3040'
          }}>
            <span style={{fontSize:22}}>{ic}</span>
            <span style={{fontSize:9,fontWeight:600}}>{lab}</span>
          </div>
        ))}
      </div>

      {/* ═══════════════════════════════════════════ */}
      {/* ═══ MODALS ════════════════════════════════ */}
      {/* ═══════════════════════════════════════════ */}

      {/* ── MORE MENU ── */}
      {showMore&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.85)',zIndex:400,display:'flex',alignItems:'flex-end'}} onClick={()=>setShowMore(false)}>
          <div style={{width:'100%',background:'#0c1020',borderRadius:'24px 24px 0 0',padding:'16px 16px 32px',animation:'slideUp .25s ease'}} onClick={e=>e.stopPropagation()}>
            <div style={{width:36,height:3,background:'rgba(255,255,255,.12)',borderRadius:2,margin:'0 auto 16px'}}/>
            <div style={{fontSize:14,fontWeight:800,marginBottom:12,color:'#eef2f7'}}>{getName(profile)}</div>
            {[
              {ic:'⬆️',lab:'Profile share করো',fn:()=>{shareProfile();setShowMore(false)}},
              {ic:'📋',lab:`Link copy করো ${profileCopied?'✓':''}`,fn:()=>{navigator.clipboard?.writeText(`${window.location.origin}/user/${targetId}`);setProfileCopied(true);setTimeout(()=>setProfileCopied(false),2000);setShowMore(false)}},
              {ic:'🚫',lab:'Block করো',fn:()=>{setShowMore(false);setModal('block')}},
              {ic:'⚑',lab:'Report করো',fn:()=>{setShowMore(false);setModal('report')}},
            ].map((item,i)=>(
              <div key={i} className="btn-tap" onClick={item.fn} style={{
                display:'flex',alignItems:'center',gap:12,
                padding:'13px 12px',borderRadius:12,cursor:'pointer',
                marginBottom:4,transition:'background .15s'
              }}>
                <span style={{fontSize:20,width:28}}>{item.ic}</span>
                <span style={{fontSize:14,color:'#c0c8d8',fontWeight:500}}>{item.lab}</span>
              </div>
            ))}
            <button onClick={()=>setShowMore(false)} style={{width:'100%',marginTop:8,padding:13,background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.08)',borderRadius:13,color:'#8892a4',fontSize:13,fontWeight:700,cursor:'pointer'}}>বন্ধ করো</button>
          </div>
        </div>
      )}

      {/* ── GIFT MODAL ── */}
      {modal==='gift'&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.88)',zIndex:400,display:'flex',alignItems:'flex-end'}} onClick={()=>{setModal(null);setSelectedGift(null);setGiftDone(false)}}>
          <div style={{width:'100%',background:'#0c1020',borderRadius:'26px 26px 0 0',padding:'20px 16px 36px',border:'1px solid rgba(255,255,255,.06)',animation:'slideUp .3s ease'}} onClick={e=>e.stopPropagation()}>
            <div style={{width:36,height:3,background:'rgba(255,255,255,.12)',borderRadius:2,margin:'0 auto 16px'}}/>
            {giftDone?(
              <div style={{textAlign:'center',padding:'30px 0',animation:'popIn .3s ease'}}>
                <div style={{fontSize:64,marginBottom:10}}>{selectedGift?.e||'🎁'}</div>
                <div style={{fontSize:18,fontWeight:900,color:'#00ff88',fontFamily:"'Sora',sans-serif"}}>Gift পাঠানো হয়েছে! 🎉</div>
                <div style={{fontSize:13,color:'#4a5568',marginTop:6}}>+{Math.floor((selectedGift?.c||0)*.8)} 🪙 {getName(profile)} পেয়েছে</div>
              </div>
            ):(
              <>
                <div style={{textAlign:'center',marginBottom:18}}>
                  <div style={{fontSize:17,fontWeight:900,fontFamily:"'Sora',sans-serif",marginBottom:5}}>
                    🎁 {getName(profile)} কে Gift পাঠাও
                  </div>
                  <div style={{fontSize:12,color:'#4a5568'}}>তোমার 🪙 <span style={{color:'#ffd700',fontWeight:700}}>{fmtNum(myCoinBal)}</span> coins আছে</div>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:8,marginBottom:14}}>
                  {GIFTS.map((g,i)=>{
                    const canAfford = myCoinBal>=g.c
                    const isSelected = selectedGift?.n===g.n
                    return (
                      <div key={i} className="btn-tap" onClick={()=>canAfford&&setSelectedGift(isSelected?null:g)} style={{
                        display:'flex',flexDirection:'column',alignItems:'center',gap:4,
                        padding:'10px 4px',borderRadius:13,
                        background:isSelected?`${g.color}25`:canAfford?`${g.color}10`:'rgba(255,255,255,.02)',
                        border:`2px solid ${isSelected?g.color:canAfford?g.color+'33':'rgba(255,255,255,.05)'}`,
                        cursor:canAfford?'pointer':'not-allowed',
                        opacity:canAfford?1:.35,
                        transition:'all .15s',
                        boxShadow:isSelected?`0 0 16px ${g.color}44`:'none',
                        transform:isSelected?'scale(1.06)':'scale(1)'
                      }}>
                        <span style={{fontSize:24}}>{g.e}</span>
                        <span style={{fontSize:9,color:isSelected?'#eef2f7':'#8892a4',fontWeight:700,textAlign:'center'}}>{g.n}</span>
                        <span style={{fontSize:9,color:g.color,fontWeight:800}}>🪙{g.c}</span>
                      </div>
                    )
                  })}
                </div>
                {selectedGift&&(
                  <div style={{
                    background:`${selectedGift.color}12`,border:`1px solid ${selectedGift.color}33`,
                    borderRadius:13,padding:'10px 14px',marginBottom:12,
                    display:'flex',alignItems:'center',justifyContent:'space-between'
                  }}>
                    <span style={{fontSize:13,color:'#c0c8d8'}}>
                      {selectedGift.e} <strong>{selectedGift.n}</strong> পাঠানো হবে
                    </span>
                    <span style={{fontSize:12,color:selectedGift.color,fontWeight:800}}>🪙 {selectedGift.c}</span>
                  </div>
                )}
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                  <button onClick={()=>window.location.href='/coins'} style={{
                    padding:13,background:'rgba(255,215,0,.08)',border:'1px solid rgba(255,215,0,.2)',
                    borderRadius:13,color:'#ffd700',fontSize:12,fontWeight:700,cursor:'pointer'
                  }}>🪙 Coins কিনো</button>
                  <button onClick={()=>sendGift(selectedGift)} disabled={!selectedGift||giftSending} style={{
                    padding:13,
                    background:selectedGift?`linear-gradient(135deg,${selectedGift?.color||lv.color},${selectedGift?.color||lv.color}aa)`:'rgba(255,255,255,.06)',
                    border:'none',borderRadius:13,
                    color:selectedGift?'#060810':'#4a5568',
                    fontSize:13,fontWeight:900,cursor:selectedGift?'pointer':'default',
                    fontFamily:"'Sora',sans-serif",
                    boxShadow:selectedGift?`0 4px 20px ${selectedGift?.color}55`:'none'
                  }}>
                    {giftSending?'⏳ পাঠানো হচ্ছে...':'🎁 Gift পাঠাও'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── MESSAGE MODAL ── */}
      {modal==='message'&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.88)',zIndex:400,display:'flex',alignItems:'flex-end'}} onClick={()=>{setModal(null);setMsgDone(false)}}>
          <div style={{width:'100%',background:'#0c1020',borderRadius:'26px 26px 0 0',padding:'20px 16px 36px',animation:'slideUp .3s ease'}} onClick={e=>e.stopPropagation()}>
            <div style={{width:36,height:3,background:'rgba(255,255,255,.12)',borderRadius:2,margin:'0 auto 16px'}}/>
            {msgDone?(
              <div style={{textAlign:'center',padding:'30px 0',animation:'popIn .3s ease'}}>
                <div style={{fontSize:56,marginBottom:10}}>✅</div>
                <div style={{fontSize:17,fontWeight:900,color:'#00ff88',fontFamily:"'Sora',sans-serif"}}>Message পাঠানো হয়েছে!</div>
              </div>
            ):(
              <>
                <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:16}}>
                  <div style={{width:40,height:40,borderRadius:12,overflow:'hidden',background:`linear-gradient(135deg,${lv.color},#111)`,flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,fontWeight:800,color:lv.color}}>
                    {profile?.avatar_url?<img src={profile.avatar_url} style={{width:'100%',height:'100%',objectFit:'cover'}}/>:getName(profile)[0]}
                  </div>
                  <div>
                    <div style={{fontSize:14,fontWeight:800}}>{getName(profile)}</div>
                    <div style={{fontSize:11,color:'#4a5568'}}>@{profile?.username}</div>
                  </div>
                </div>
                <textarea value={msgText} onChange={e=>setMsgText(e.target.value)}
                  placeholder={`${getName(profile)} কে কিছু লেখো...`}
                  rows={4} maxLength={500}
                  style={{width:'100%',background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.1)',borderRadius:14,padding:'12px 14px',color:'#eef2f7',fontSize:13,outline:'none',resize:'none',marginBottom:12,lineHeight:1.7}}/>
                <div style={{fontSize:10,color:'#2a3040',textAlign:'right',marginBottom:10}}>{msgText.length}/500</div>
                {/* Quick replies */}
                <div style={{display:'flex',gap:6,overflowX:'auto',scrollbarWidth:'none',marginBottom:12,paddingBottom:2}}>
                  {['👋 হ্যালো!','❤️ তোমার profile টা অনেক সুন্দর!','🤝 Collab করবে?','🎉 Congrats!'].map(t=>(
                    <button key={t} onClick={()=>setMsgText(t)} style={{
                      padding:'6px 12px',borderRadius:20,border:'1px solid rgba(255,255,255,.1)',
                      background:'rgba(255,255,255,.04)',color:'#8892a4',fontSize:11,cursor:'pointer',whiteSpace:'nowrap',flexShrink:0
                    }}>{t}</button>
                  ))}
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                  <button onClick={()=>setModal(null)} style={{padding:13,background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.08)',borderRadius:13,color:'#8892a4',fontSize:13,fontWeight:700,cursor:'pointer'}}>বাতিল</button>
                  <button onClick={sendMessage} disabled={msgSending||!msgText.trim()} style={{
                    padding:13,
                    background:msgText.trim()?'linear-gradient(135deg,#00e5ff,#00ff88)':`rgba(255,255,255,.05)`,
                    border:'none',borderRadius:13,
                    color:msgText.trim()?'#060810':'#4a5568',
                    fontSize:13,fontWeight:900,cursor:msgText.trim()?'pointer':'default',
                    fontFamily:"'Sora',sans-serif"
                  }}>{msgSending?'⏳ পাঠাচ্ছি...':'📨 পাঠাও'}</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── SUPPORTERS / SUPPORTING MODAL ── */}
      {(modal==='supporters'||modal==='supporting')&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.88)',zIndex:400,display:'flex',alignItems:'flex-end'}} onClick={()=>setModal(null)}>
          <div style={{width:'100%',background:'#0c1020',borderRadius:'26px 26px 0 0',maxHeight:'72vh',display:'flex',flexDirection:'column',animation:'slideUp .3s ease'}} onClick={e=>e.stopPropagation()}>
            <div style={{padding:'16px 20px 10px',display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0,borderBottom:'1px solid rgba(255,255,255,.05)'}}>
              <div style={{fontSize:16,fontWeight:900,fontFamily:"'Sora',sans-serif"}}>{modal==='supporters'?'👥 Supporters':'🌍 Supporting'}</div>
              <button onClick={()=>setModal(null)} style={{background:'none',border:'none',color:'#4a5568',fontSize:22,cursor:'pointer'}}>✕</button>
            </div>
            <div style={{overflowY:'auto',padding:'10px 16px 28px',flex:1}}>
              {modalLoading?(
                <div style={{textAlign:'center',padding:30}}>
                  <div style={{width:32,height:32,border:`2px solid rgba(255,255,255,.1)`,borderTopColor:lv.color,borderRadius:'50%',animation:'spin 1s linear infinite',margin:'0 auto'}}/>
                </div>
              ):modalList.length===0?(
                <div style={{textAlign:'center',padding:'30px 0',color:'#2a3040',fontSize:14}}>কেউ নেই</div>
              ):(
                modalList.map((p,i)=>(
                  <div key={p.id} className="btn-tap user-card" onClick={()=>window.location.href=`/user/${p.id}`}
                    style={{display:'flex',alignItems:'center',gap:12,padding:'11px 10px',borderRadius:13,cursor:'pointer',marginBottom:4,transition:'background .15s',animation:`fadeUp ${.1+i*.04}s ease`}}>
                    <div style={{width:46,height:46,borderRadius:14,overflow:'hidden',background:`linear-gradient(135deg,${lv.color},#111)`,flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:17,fontWeight:800,color:lv.color}}>
                      {p.avatar_url?<img src={p.avatar_url} style={{width:'100%',height:'100%',objectFit:'cover'}}/>:(p.full_name||p.username||'E')[0]?.toUpperCase()}
                    </div>
                    <div style={{flex:1}}>
                      <div style={{fontSize:14,fontWeight:700}}>{p.full_name||p.username}</div>
                      <div style={{fontSize:11,color:'#4a5568'}}>@{p.username}</div>
                    </div>
                    <span style={{fontSize:16,color:'#2a3040'}}>›</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── REPORT MODAL ── */}
      {modal==='report'&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.9)',zIndex:400,display:'flex',alignItems:'flex-end'}} onClick={()=>{setModal(null);setReportDone(false)}}>
          <div style={{width:'100%',background:'#0c1020',borderRadius:'26px 26px 0 0',padding:'20px 16px 36px',animation:'slideUp .3s ease'}} onClick={e=>e.stopPropagation()}>
            <div style={{width:36,height:3,background:'rgba(255,255,255,.12)',borderRadius:2,margin:'0 auto 16px'}}/>
            {reportDone?(
              <div style={{textAlign:'center',padding:'30px 0',animation:'popIn .3s ease'}}>
                <div style={{fontSize:56,marginBottom:10}}>✅</div>
                <div style={{fontSize:17,fontWeight:900,color:'#00ff88',fontFamily:"'Sora',sans-serif"}}>Report পাঠানো হয়েছে</div>
                <div style={{fontSize:13,color:'#4a5568',marginTop:6}}>আমরা এটি পর্যালোচনা করব</div>
              </div>
            ):(
              <>
                <div style={{fontSize:16,fontWeight:900,color:'#ff4560',fontFamily:"'Sora',sans-serif",marginBottom:4}}>⚑ Report করো</div>
                <div style={{fontSize:12,color:'#4a5568',marginBottom:16}}>কারণ নির্বাচন করো</div>
                <div style={{display:'flex',flexDirection:'column',gap:7,marginBottom:14}}>
                  {REPORT_REASONS.map((r,i)=>(
                    <div key={i} className="btn-tap" onClick={()=>setReportReason(r.label)}
                      style={{
                        padding:'12px 14px',borderRadius:12,cursor:'pointer',
                        background:reportReason===r.label?'rgba(255,69,96,.12)':'rgba(255,255,255,.03)',
                        border:`1px solid ${reportReason===r.label?'rgba(255,69,96,.35)':'rgba(255,255,255,.06)'}`,
                        display:'flex',justifyContent:'space-between',alignItems:'center',
                        transition:'all .15s'
                      }}>
                      <div style={{display:'flex',gap:10,alignItems:'center'}}>
                        <span style={{fontSize:18}}>{r.icon}</span>
                        <span style={{fontSize:13,color:reportReason===r.label?'#ff4560':'#8892a4'}}>{r.label}</span>
                      </div>
                      {reportReason===r.label&&<span style={{color:'#ff4560',fontWeight:800}}>✓</span>}
                    </div>
                  ))}
                </div>
                {reportReason&&(
                  <textarea value={reportExtra} onChange={e=>setReportExtra(e.target.value)}
                    placeholder="আরো বিস্তারিত লিখতে পারো (optional)..."
                    rows={2} maxLength={200}
                    style={{width:'100%',background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.08)',borderRadius:12,padding:'10px 12px',color:'#eef2f7',fontSize:12,outline:'none',resize:'none',marginBottom:12}}/>
                )}
                <button onClick={submitReport} disabled={!reportReason} style={{
                  width:'100%',padding:13,
                  background:reportReason?'rgba(255,69,96,.15)':'rgba(255,255,255,.05)',
                  border:`1px solid ${reportReason?'rgba(255,69,96,.35)':'rgba(255,255,255,.07)'}`,
                  borderRadius:13,color:reportReason?'#ff4560':'#4a5568',
                  fontSize:13,fontWeight:900,cursor:reportReason?'pointer':'default',
                  fontFamily:"'Sora',sans-serif"
                }}>⚑ Report পাঠাও</button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════ */}
      {/* POST VIEW MODAL */}
      {/* ═══════════════════════════════════════════ */}
      {modal==='postView'&&viewPost&&(
        <div style={{position:'fixed',inset:0,zIndex:300,background:'#060810',display:'flex',flexDirection:'column',animation:'fadeIn .2s ease'}}>
          {/* Header */}
          <div style={{
            display:'flex',alignItems:'center',justifyContent:'space-between',
            padding:'14px 16px',
            borderBottom:'1px solid rgba(255,255,255,.06)',
            flexShrink:0,background:'rgba(6,8,16,.97)',backdropFilter:'blur(20px)'
          }}>
            <button className="btn-tap" onClick={()=>{setModal(null);setViewPost(null);setPostComments([]);setReplyTo(null)}}
              style={{width:38,height:38,borderRadius:11,background:'rgba(255,255,255,.06)',border:'1px solid rgba(255,255,255,.08)',color:'#eef2f7',fontSize:18,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>←</button>
            <div style={{fontSize:14,fontWeight:800,fontFamily:"'Sora',sans-serif"}}>Post</div>
            <div style={{display:'flex',gap:8}}>
              <button className="btn-tap" onClick={()=>toggleSavePost(viewPost.id)} style={{
                width:38,height:38,borderRadius:11,
                background:postSaved[viewPost.id]?'rgba(255,215,0,.12)':'rgba(255,255,255,.06)',
                border:`1px solid ${postSaved[viewPost.id]?'rgba(255,215,0,.3)':'rgba(255,255,255,.08)'}`,
                color:postSaved[viewPost.id]?'#ffd700':'#8892a4',fontSize:16,cursor:'pointer',
                display:'flex',alignItems:'center',justifyContent:'center'
              }}>{postSaved[viewPost.id]?'🔖':'🏷️'}</button>
              <button className="btn-tap" onClick={()=>copyPostLink(viewPost.id)} style={{
                width:38,height:38,borderRadius:11,
                background:shareCopied?'rgba(0,255,136,.12)':'rgba(255,255,255,.06)',
                border:`1px solid ${shareCopied?'rgba(0,255,136,.3)':'rgba(255,255,255,.08)'}`,
                color:shareCopied?'#00ff88':'#8892a4',fontSize:16,cursor:'pointer',
                display:'flex',alignItems:'center',justifyContent:'center'
              }}>{shareCopied?'✓':'⬆'}</button>
            </div>
          </div>

          <div style={{flex:1,overflowY:'auto'}}>
            {/* Media */}
            {viewPost.media_url&&viewPost.media_type==='photo'&&(
              <img src={viewPost.media_url} style={{width:'100%',maxHeight:400,objectFit:'contain',background:'#000',display:'block'}}/>
            )}
            {viewPost.media_url&&viewPost.media_type==='video'&&(
              <video src={viewPost.media_url} controls playsInline style={{width:'100%',maxHeight:400,background:'#000',display:'block'}}/>
            )}

            <div style={{padding:'16px 16px 0'}}>
              {/* Author */}
              <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:14}}>
                <div style={{width:40,height:40,borderRadius:12,overflow:'hidden',background:`linear-gradient(135deg,${lv.color},#111)`,flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:15,fontWeight:800,color:lv.color}}>
                  {profile?.avatar_url?<img src={profile.avatar_url} style={{width:'100%',height:'100%',objectFit:'cover'}}/>:getName(profile)[0]}
                </div>
                <div style={{flex:1}}>
                  <div style={{fontSize:14,fontWeight:800}}>{getName(profile)}</div>
                  <div style={{fontSize:10,color:'#4a5568'}}>@{profile?.username} · {timeAgo(viewPost.created_at)} আগে</div>
                </div>
                {/* Like btn */}
                <button className="btn-tap" onClick={()=>togglePostLike(viewPost)} style={{
                  display:'flex',alignItems:'center',gap:6,
                  padding:'8px 14px',borderRadius:11,
                  background:postLiked[viewPost.id]?'rgba(255,69,96,.12)':'rgba(255,255,255,.06)',
                  border:`1px solid ${postLiked[viewPost.id]?'rgba(255,69,96,.3)':'rgba(255,255,255,.09)'}`,
                  color:postLiked[viewPost.id]?'#ff4560':'#8892a4',
                  fontSize:12,fontWeight:700,cursor:'pointer'
                }}>
                  <span style={{animation:postLiked[viewPost.id]?'heartPop .3s ease':'none'}}>{postLiked[viewPost.id]?'❤️':'🤍'}</span>
                  {postLikes[viewPost.id]||viewPost.likes_count||0}
                </button>
              </div>

              {/* Content */}
              {viewPost.content&&(
                <div style={{fontSize:14,color:'#c0c8d8',lineHeight:1.75,marginBottom:14,whiteSpace:'pre-wrap'}}>
                  {viewPost.content}
                </div>
              )}

              {/* Hashtags */}
              {viewPost.hashtags?.length>0&&(
                <div style={{display:'flex',flexWrap:'wrap',gap:6,marginBottom:14}}>
                  {viewPost.hashtags.map((h,i)=>(
                    <span key={i} style={{fontSize:12,color:lv.color,background:lv.bg,borderRadius:20,padding:'3px 10px',fontWeight:600}}>#{h}</span>
                  ))}
                </div>
              )}

              {/* Stats bar */}
              <div style={{display:'flex',gap:16,padding:'10px 0',borderTop:'1px solid rgba(255,255,255,.05)',borderBottom:'1px solid rgba(255,255,255,.05)',marginBottom:14}}>
                <span style={{fontSize:12,color:'#4a5568'}}>❤️ {postLikes[viewPost.id]||viewPost.likes_count||0} likes</span>
                <span style={{fontSize:12,color:'#4a5568'}}>💬 {postComments.length} comments</span>
                {viewPost.views_count>0&&<span style={{fontSize:12,color:'#4a5568'}}>👁 {fmtNum(viewPost.views_count)} views</span>}
              </div>

              {/* Comments */}
              <div style={{fontSize:14,fontWeight:800,marginBottom:12,display:'flex',alignItems:'center',gap:8}}>
                💬 Comments
                {postComments.length>0&&<span style={{fontSize:11,color:lv.color,background:lv.bg,borderRadius:20,padding:'1px 7px'}}>{postComments.length}</span>}
              </div>

              {replyTo&&(
                <div style={{
                  background:'rgba(0,229,255,.08)',border:'1px solid rgba(0,229,255,.2)',
                  borderRadius:10,padding:'7px 12px',marginBottom:10,
                  display:'flex',justifyContent:'space-between',alignItems:'center'
                }}>
                  <span style={{fontSize:12,color:'#00e5ff'}}>↩ @{replyTo} কে reply করছো</span>
                  <button onClick={()=>setReplyTo(null)} style={{background:'none',border:'none',color:'#4a5568',cursor:'pointer',fontSize:14}}>✕</button>
                </div>
              )}

              {postComments.length===0&&(
                <div style={{textAlign:'center',padding:'24px 0',color:'#2a3040',fontSize:13}}>
                  প্রথম comment করো! 💬
                </div>
              )}

              {postComments.map((cm,i)=>(
                <div key={cm.id} style={{display:'flex',gap:10,marginBottom:14,animation:`fadeUp ${.1+i*.04}s ease`}}>
                  <div style={{width:34,height:34,borderRadius:11,overflow:'hidden',background:`linear-gradient(135deg,${lv.color},#111)`,flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:800,color:lv.color}}>
                    {cm.profiles?.avatar_url?<img src={cm.profiles.avatar_url} style={{width:'100%',height:'100%',objectFit:'cover'}}/>:(cm.profiles?.username||'?')[0]?.toUpperCase()}
                  </div>
                  <div style={{flex:1}}>
                    <div style={{background:'rgba(255,255,255,.04)',borderRadius:'12px 12px 12px 3px',padding:'9px 13px',marginBottom:5}}>
                      <div style={{fontSize:11,fontWeight:700,color:lv.color,marginBottom:4}}>@{cm.profiles?.username}</div>
                      <div style={{fontSize:13,color:'#c0c8d8',lineHeight:1.55}}>{cm.content}</div>
                    </div>
                    <div style={{display:'flex',gap:12,fontSize:10,color:'#4a5568',paddingLeft:4}}>
                      <span>{timeAgo(cm.created_at)} আগে</span>
                      <button onClick={()=>setReplyTo(cm.profiles?.username)} style={{background:'none',border:'none',color:'#4a5568',cursor:'pointer',fontSize:10,padding:0,fontWeight:600}}>↩ Reply</button>
                    </div>
                  </div>
                </div>
              ))}

              {/* Related posts */}
              {relatedPosts.length>0&&(
                <div style={{marginTop:10}}>
                  <div style={{fontSize:13,fontWeight:800,marginBottom:10,color:'#eef2f7'}}>More from {getName(profile)}</div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:3}}>
                    {relatedPosts.map(rp=>(
                      <div key={rp.id} className="post-thumb" onClick={()=>openPost(rp)}
                        style={{position:'relative',paddingTop:'100%',background:'#0c1020',overflow:'hidden',borderRadius:7,cursor:'pointer'}}>
                        {rp.media_url&&rp.media_type==='photo'&&<img src={rp.media_url} style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover'}}/>}
                        {rp.media_url&&rp.media_type==='video'&&<video src={rp.media_url} style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover'}} muted playsInline/>}
                        {!rp.media_url&&<div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:22}}>📝</div>}
                        <div style={{position:'absolute',inset:0,background:'linear-gradient(to top,rgba(0,0,0,.6),transparent 50%)',pointerEvents:'none'}}/>
                        <div style={{position:'absolute',bottom:5,left:5,fontSize:9,color:'#fff',fontWeight:700}}>❤️{rp.likes_count||0}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div style={{height:90}}/>
            </div>
          </div>

          {/* Comment input */}
          <div style={{
            padding:'12px 14px',paddingBottom:26,
            borderTop:'1px solid rgba(255,255,255,.06)',
            background:'rgba(6,8,16,.97)',backdropFilter:'blur(20px)',
            display:'flex',gap:8,flexShrink:0
          }}>
            <div style={{width:34,height:34,borderRadius:11,overflow:'hidden',flexShrink:0,background:`linear-gradient(135deg,${lv.color},#111)`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:800,color:lv.color}}>
              {myProfile?.avatar_url?<img src={myProfile.avatar_url} style={{width:'100%',height:'100%',objectFit:'cover'}}/>:(myProfile?.username||'?')[0]?.toUpperCase()}
            </div>
            <input ref={commentInputRef} value={commentText} onChange={e=>setCommentText(e.target.value)}
              onKeyDown={e=>e.key==='Enter'&&sendComment()}
              placeholder={replyTo?`@${replyTo} কে reply করো...`:'Comment লেখো...'} maxLength={300}
              style={{flex:1,background:'rgba(255,255,255,.06)',border:'1px solid rgba(255,255,255,.1)',borderRadius:12,padding:'9px 14px',color:'#eef2f7',fontSize:13,outline:'none'}}/>
            <button className="btn-tap" onClick={sendComment} disabled={commentLoading||!commentText.trim()} style={{
              width:38,height:38,borderRadius:12,border:'none',
              background:commentText.trim()?`linear-gradient(135deg,${lv.color},${lv.color}aa)`:'rgba(255,255,255,.05)',
              color:commentText.trim()?'#060810':'#4a5568',fontSize:16,cursor:commentText.trim()?'pointer':'default',
              display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,
              boxShadow:commentText.trim()?`0 4px 12px ${lv.glow}`:'none'
            }}>{commentLoading?'⏳':'➤'}</button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════ */}
      {/* STORY VIEWER */}
      {/* ══════════════════════════════════════ */}
      {storyIdx!==null&&stories[storyIdx]&&(
        <div style={{position:'fixed',inset:0,background:'#000',zIndex:500,display:'flex',flexDirection:'column',animation:'fadeIn .15s ease'}} onClick={closeStory}>
          {/* Progress bars */}
          <div style={{display:'flex',gap:3,padding:'14px 12px 0',flexShrink:0}}>
            {stories.map((_,i)=>(
              <div key={i} style={{flex:1,height:3,background:'rgba(255,255,255,.2)',borderRadius:2,overflow:'hidden'}}>
                <div style={{
                  height:'100%',borderRadius:2,background:'#fff',
                  width: i<storyIdx?'100%':i===storyIdx?`${((5-storyTimeLeft)/5)*100}%`:'0%',
                  transition:'none'
                }}/>
              </div>
            ))}
          </div>
          {/* Author */}
          <div style={{display:'flex',alignItems:'center',gap:10,padding:'12px 14px',flexShrink:0}}>
            <div style={{width:38,height:38,borderRadius:'50%',overflow:'hidden',border:`2px solid ${lv.color}`,flexShrink:0}}>
              {profile?.avatar_url?<img src={profile.avatar_url} style={{width:'100%',height:'100%',objectFit:'cover'}}/>:<div style={{width:'100%',height:'100%',background:`linear-gradient(135deg,${lv.color},#111)`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,fontWeight:800,color:lv.color}}>{getName(profile)[0]}</div>}
            </div>
            <div style={{flex:1}}>
              <div style={{fontSize:13,fontWeight:800,color:'#fff'}}>{getName(profile)}</div>
              <div style={{fontSize:10,color:'rgba(255,255,255,.5)'}}>{timeAgo(stories[storyIdx].created_at)} আগে</div>
            </div>
            <button onClick={e=>{e.stopPropagation();closeStory()}} style={{background:'none',border:'none',color:'rgba(255,255,255,.7)',fontSize:24,cursor:'pointer'}}>✕</button>
          </div>
          {/* Content */}
          <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',position:'relative'}} onClick={e=>e.stopPropagation()}>
            {stories[storyIdx].media_url&&<img src={stories[storyIdx].media_url} style={{maxWidth:'100%',maxHeight:'100%',objectFit:'contain'}}/>}
            {stories[storyIdx].text&&!stories[storyIdx].media_url&&(
              <div style={{padding:28,fontSize:22,fontWeight:700,color:'#fff',textAlign:'center',lineHeight:1.55,fontFamily:"'Sora',sans-serif",textShadow:'0 2px 10px rgba(0,0,0,.8)'}}>
                {stories[storyIdx].text}
              </div>
            )}
          </div>
          {/* Tap areas */}
          <div style={{position:'absolute',inset:0,display:'flex'}}>
            <div style={{flex:1}} onClick={e=>{e.stopPropagation();if(storyIdx>0)openStory(storyIdx-1);else closeStory()}}/>
            <div style={{flex:1}} onClick={e=>{e.stopPropagation();if(storyIdx<stories.length-1)openStory(storyIdx+1);else closeStory()}}/>
          </div>
        </div>
      )}
    </div>
  )
   }
