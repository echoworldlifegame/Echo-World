'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default function Leaderboard() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('supporters')
  const [currentUser, setCurrentUser] = useState(null)
  const [myRank, setMyRank] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) { window.location.href = '/'; return }
      setCurrentUser(data.session.user)
      loadLeaderboard('supporters', data.session.user.id)
    })
  }, [])

  const loadLeaderboard = async (type, userId) => {
    setLoading(true)
    setUsers([])

    let orderCol = 'followers_count'
    if (type === 'posts') orderCol = 'posts_count'
    if (type === 'likes') orderCol = 'total_likes'
    if (type === 'explorer') orderCol = 'zones_explored'

    const { data } = await supabase
      .from('profiles')
      .select('id, username, full_name, avatar_url, followers_count, following_count, bio')
      .order(orderCol, { ascending: false, nullsFirst: false })
      .limit(50)

    const list = (data || []).filter(u => u.username)
    setUsers(list)

    const rank = list.findIndex(u => u.id === userId)
    setMyRank(rank >= 0 ? rank + 1 : null)
    setLoading(false)
  }

  const handleTabChange = (tab) => {
    setActiveTab(tab)
    loadLeaderboard(tab, currentUser?.id)
  }

  const getRankIcon = (i) => {
    if (i === 0) return '🥇'
    if (i === 1) return '🥈'
    if (i === 2) return '🥉'
    return `#${i+1}`
  }

  const getRankColor = (i) => {
    if (i === 0) return '#FFD700'
    if (i === 1) return '#C0C0C0'
    if (i === 2) return '#CD7F32'
    return '#4a5568'
  }

  const getStatValue = (user) => {
    if (activeTab === 'supporters') return user.followers_count || 0
    if (activeTab === 'posts') return user.posts_count || 0
    if (activeTab === 'likes') return user.total_likes || 0
    if (activeTab === 'explorer') return user.zones_explored || 0
    return 0
  }

  const getStatLabel = () => {
    if (activeTab === 'supporters') return 'supporters'
    if (activeTab === 'posts') return 'posts'
    if (activeTab === 'likes') return 'likes'
    if (activeTab === 'explorer') return 'zones'
    return ''
  }

  const tabs = [
    { key: 'supporters', icon: '👥', label: 'Top Supporters' },
    { key: 'posts', icon: '📸', label: 'Most Posts' },
    { key: 'likes', icon: '❤️', label: 'Most Liked' },
    { key: 'explorer', icon: '🗺', label: 'Explorer' },
  ]

  return (
    <div style={{minHeight:'100vh',background:'#070a10',color:'#eef2f7',paddingBottom:'80px'}}>

      {/* TOP BAR */}
      <div style={{position:'fixed',top:0,left:0,right:0,background:'rgba(7,10,16,0.97)',borderBottom:'1px solid rgba(255,255,255,0.07)',padding:'0 16px',height:'56px',display:'flex',alignItems:'center',justifyContent:'space-between',zIndex:100}}>
        <div style={{fontSize:'18px',fontWeight:'800',background:'linear-gradient(90deg,#FFD700,#ff8c00)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>🏆 Leaderboard</div>
        {myRank && (
          <div style={{background:'rgba(255,215,0,0.1)',border:'1px solid rgba(255,215,0,0.2)',borderRadius:'20px',padding:'4px 12px',fontSize:'12px',color:'#FFD700',fontWeight:'700'}}>
            You: #{myRank}
          </div>
        )}
      </div>

      {/* BOTTOM NAV */}
      <div style={{position:'fixed',bottom:0,left:0,right:0,background:'rgba(7,10,16,0.98)',borderTop:'1px solid rgba(255,255,255,0.07)',display:'flex',justifyContent:'space-around',padding:'10px 0 20px',zIndex:100}}>
        {[
          {icon:'🏠',label:'Home',path:'/feed'},
          {icon:'🗺',label:'Map',path:'/map'},
          {icon:'📸',label:'Post',path:'/post'},
          {icon:'🏆',label:'Rank',path:'/leaderboard'},
          {icon:'👤',label:'Profile',path:'/profile'},
        ].map(item => (
          <div key={item.label} onClick={()=>window.location.href=item.path} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'4px',cursor:'pointer',color:item.path==='/leaderboard'?'#FFD700':'#4a5568'}}>
            <span style={{fontSize:'22px'}}>{item.icon}</span>
            <span style={{fontSize:'10px',fontWeight:'600'}}>{item.label}</span>
          </div>
        ))}
      </div>

      <div style={{paddingTop:'56px'}}>

        {/* Top 3 podium */}
        {!loading && users.length >= 3 && (
          <div style={{background:'linear-gradient(180deg,rgba(255,215,0,0.05) 0%,transparent 100%)',padding:'24px 16px 16px',marginBottom:'8px'}}>
            <div style={{display:'flex',alignItems:'flex-end',justifyContent:'center',gap:'12px'}}>

              {/* 2nd */}
              <div onClick={()=>window.location.href=`/user/${users[1].id}`} style={{display:'flex',flexDirection:'column',alignItems:'center',cursor:'pointer',flex:1}}>
                <div style={{width:'60px',height:'60px',borderRadius:'50%',overflow:'hidden',background:'linear-gradient(135deg,#00e5ff,#00ff88)',border:'3px solid #C0C0C0',display:'flex',alignItems:'center',justifyContent:'center',marginBottom:'6px'}}>
                  {users[1].avatar_url
                    ? <img src={users[1].avatar_url} style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                    : <span style={{fontWeight:'800',color:'#070a10',fontSize:'22px'}}>{(users[1].full_name||users[1].username||'E')[0].toUpperCase()}</span>
                  }
                </div>
                <div style={{fontSize:'20px',marginBottom:'4px'}}>🥈</div>
                <div style={{fontSize:'11px',fontWeight:'700',textAlign:'center',color:'#C0C0C0',maxWidth:'70px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{users[1].full_name||users[1].username}</div>
                <div style={{fontSize:'11px',color:'#4a5568'}}>{getStatValue(users[1])} {getStatLabel()}</div>
                <div style={{height:'60px',width:'100%',background:'rgba(192,192,192,0.1)',borderRadius:'8px 8px 0 0',marginTop:'6px'}}/>
              </div>

              {/* 1st */}
              <div onClick={()=>window.location.href=`/user/${users[0].id}`} style={{display:'flex',flexDirection:'column',alignItems:'center',cursor:'pointer',flex:1}}>
                <div style={{fontSize:'24px',marginBottom:'4px'}}>👑</div>
                <div style={{width:'74px',height:'74px',borderRadius:'50%',overflow:'hidden',background:'linear-gradient(135deg,#00e5ff,#00ff88)',border:'3px solid #FFD700',display:'flex',alignItems:'center',justifyContent:'center',marginBottom:'6px',boxShadow:'0 0 20px rgba(255,215,0,0.3)'}}>
                  {users[0].avatar_url
                    ? <img src={users[0].avatar_url} style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                    : <span style={{fontWeight:'800',color:'#070a10',fontSize:'28px'}}>{(users[0].full_name||users[0].username||'E')[0].toUpperCase()}</span>
                  }
                </div>
                <div style={{fontSize:'22px',marginBottom:'4px'}}>🥇</div>
                <div style={{fontSize:'12px',fontWeight:'800',textAlign:'center',color:'#FFD700',maxWidth:'80px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{users[0].full_name||users[0].username}</div>
                <div style={{fontSize:'11px',color:'#4a5568'}}>{getStatValue(users[0])} {getStatLabel()}</div>
                <div style={{height:'80px',width:'100%',background:'rgba(255,215,0,0.08)',borderRadius:'8px 8px 0 0',marginTop:'6px'}}/>
              </div>

              {/* 3rd */}
              <div onClick={()=>window.location.href=`/user/${users[2].id}`} style={{display:'flex',flexDirection:'column',alignItems:'center',cursor:'pointer',flex:1}}>
                <div style={{width:'56px',height:'56px',borderRadius:'50%',overflow:'hidden',background:'linear-gradient(135deg,#00e5ff,#00ff88)',border:'3px solid #CD7F32',display:'flex',alignItems:'center',justifyContent:'center',marginBottom:'6px'}}>
                  {users[2].avatar_url
                    ? <img src={users[2].avatar_url} style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                    : <span style={{fontWeight:'800',color:'#070a10',fontSize:'20px'}}>{(users[2].full_name||users[2].username||'E')[0].toUpperCase()}</span>
                  }
                </div>
                <div style={{fontSize:'18px',marginBottom:'4px'}}>🥉</div>
                <div style={{fontSize:'11px',fontWeight:'700',textAlign:'center',color:'#CD7F32',maxWidth:'70px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{users[2].full_name||users[2].username}</div>
                <div style={{fontSize:'11px',color:'#4a5568'}}>{getStatValue(users[2])} {getStatLabel()}</div>
                <div style={{height:'44px',width:'100%',background:'rgba(205,127,50,0.1)',borderRadius:'8px 8px 0 0',marginTop:'6px'}}/>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div style={{display:'flex',gap:'6px',padding:'0 16px 12px',overflowX:'auto',scrollbarWidth:'none'}}>
          {tabs.map(t => (
            <button key={t.key} onClick={()=>handleTabChange(t.key)} style={{padding:'7px 14px',borderRadius:'20px',border:'none',cursor:'pointer',fontSize:'12px',fontWeight:'700',whiteSpace:'nowrap',flexShrink:0,background:activeTab===t.key?'linear-gradient(135deg,#FFD700,#ff8c00)':'rgba(255,255,255,0.06)',color:activeTab===t.key?'#070a10':'#4a5568'}}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* List */}
        <div style={{padding:'0 16px'}}>
          {loading ? (
            <div style={{textAlign:'center',padding:'40px',color:'#4a5568'}}>Loading...</div>
          ) : users.length === 0 ? (
            <div style={{textAlign:'center',padding:'40px',color:'#4a5568'}}>No users yet</div>
          ) : users.slice(3).map((u, idx) => {
            const realIdx = idx + 3
            const isMe = u.id === currentUser?.id
            return (
              <div key={u.id} onClick={()=>window.location.href=`/user/${u.id}`}
                style={{display:'flex',alignItems:'center',gap:'12px',padding:'12px',borderRadius:'14px',marginBottom:'6px',cursor:'pointer',background:isMe?'rgba(0,229,255,0.06)':'rgba(255,255,255,0.02)',border:`1px solid ${isMe?'rgba(0,229,255,0.2)':'rgba(255,255,255,0.05)'}`}}>
                <div style={{width:'32px',textAlign:'center',fontSize:realIdx<3?'22px':'14px',fontWeight:'800',color:getRankColor(realIdx),flexShrink:0}}>
                  {getRankIcon(realIdx)}
                </div>
                <div style={{width:'46px',height:'46px',borderRadius:'50%',overflow:'hidden',background:'linear-gradient(135deg,#00e5ff,#00ff88)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,border:`2px solid ${isMe?'#00e5ff':'transparent'}`}}>
                  {u.avatar_url
                    ? <img src={u.avatar_url} style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                    : <span style={{fontWeight:'800',color:'#070a10',fontSize:'18px'}}>{(u.full_name||u.username||'E')[0].toUpperCase()}</span>
                  }
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:'14px',fontWeight:'700',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',color:isMe?'#00e5ff':'#eef2f7'}}>
                    {u.full_name||u.username} {isMe&&'(You)'}
                  </div>
                  <div style={{fontSize:'11px',color:'#4a5568'}}>@{u.username}</div>
                </div>
                <div style={{textAlign:'right',flexShrink:0}}>
                  <div style={{fontSize:'15px',fontWeight:'800',color:getRankColor(realIdx)}}>{getStatValue(u)}</div>
                  <div style={{fontSize:'10px',color:'#4a5568'}}>{getStatLabel()}</div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
        }
