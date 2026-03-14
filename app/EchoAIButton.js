'use client'
import { useState, useRef, useEffect } from 'react'

export default function EchoAIButton() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([
    { role: 'assistant', content: '👋 আমি Echo AI! যেকোনো প্রশ্ন করো!' }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, open])

  async function send() {
    const text = input.trim()
    if (!text || loading) return
    const userMsg = { role: 'user', content: text }
    const newMsgs = [...messages, userMsg]
    setMessages(newMsgs)
    setInput('')
    setLoading(true)
    try {
      const res = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMsgs })
      })
      const data = await res.json()
      setMessages(p => [...p, { role: 'assistant', content: data.reply || 'উত্তর পাওয়া যায়নি।' }])
    } catch {
      setMessages(p => [...p, { role: 'assistant', content: '❌ সংযোগ সমস্যা।' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button onClick={() => setOpen(!open)} style={{
        position:'fixed',bottom:80,right:16,zIndex:998,
        width:52,height:52,borderRadius:16,border:'none',
        background:'linear-gradient(135deg,#8b5cf6,#f472b6)',
        boxShadow:'0 4px 24px rgba(139,92,246,0.45)',
        color:'white',fontSize:22,cursor:'pointer',
        display:'flex',alignItems:'center',justifyContent:'center'
      }}>
        {open ? '✕' : '⟡'}
      </button>

      {open && (
        <div style={{
          position:'fixed',bottom:144,right:16,zIndex:997,
          width:'min(340px, calc(100vw - 32px))',
          height:'min(480px, calc(100vh - 180px))',
          background:'#0f0f1a',border:'1px solid rgba(255,255,255,0.1)',
          borderRadius:20,display:'flex',flexDirection:'column',
          boxShadow:'0 20px 60px rgba(0,0,0,0.6)',overflow:'hidden',
          fontFamily:'sans-serif'
        }}>
          <div style={{
            background:'linear-gradient(135deg,rgba(139,92,246,.15),rgba(244,114,182,.15))',
            borderBottom:'1px solid rgba(255,255,255,0.07)',
            padding:'12px 14px',display:'flex',alignItems:'center',gap:10,flexShrink:0
          }}>
            <div style={{
              width:32,height:32,borderRadius:10,flexShrink:0,
              background:'linear-gradient(135deg,#8b5cf6,#f472b6)',
              display:'flex',alignItems:'center',justifyContent:'center',fontSize:16
            }}>⟡</div>
            <div style={{flex:1}}>
              <div style={{fontWeight:700,fontSize:13,color:'#eeeeff'}}>Echo AI</div>
              <div style={{fontSize:10,color:'#34d399'}}>● Online</div>
            </div>
            <a href="/ai-chat" style={{
              padding:'4px 10px',borderRadius:7,
              background:'rgba(139,92,246,.2)',color:'#8b5cf6',
              fontSize:11,textDecoration:'none'
            }}>Full ↗</a>
          </div>

          <div style={{flex:1,overflowY:'auto',padding:12,display:'flex',flexDirection:'column',gap:10}}>
            {messages.map((msg, i) => (
              <div key={i} style={{
                display:'flex',gap:8,
                flexDirection:msg.role==='user'?'row-reverse':'row',
                alignItems:'flex-end'
              }}>
                {msg.role==='assistant' && (
                  <div style={{
                    width:26,height:26,borderRadius:8,flexShrink:0,
                    background:'linear-gradient(135deg,#8b5cf6,#f472b6)',
                    display:'flex',alignItems:'center',justifyContent:'center',fontSize:13
                  }}>⟡</div>
                )}
                <div style={{
                  maxWidth:'80%',padding:'9px 12px',
                  borderRadius:msg.role==='user'?'14px 14px 4px 14px':'14px 14px 14px 4px',
                  background:msg.role==='user'?'linear-gradient(135deg,#8b5cf6,#7c3aed)':'#161625',
                  border:msg.role==='assistant'?'1px solid rgba(255,255,255,0.07)':'none',
                  fontSize:12.5,lineHeight:1.7,color:'#eeeeff',
                  whiteSpace:'pre-wrap',wordBreak:'break-word'
                }}>{msg.content}</div>
              </div>
            ))}
            {loading && (
              <div style={{display:'flex',gap:8,alignItems:'flex-end'}}>
                <div style={{
                  width:26,height:26,borderRadius:8,
                  background:'linear-gradient(135deg,#8b5cf6,#f472b6)',
                  display:'flex',alignItems:'center',justifyContent:'center',fontSize:13
                }}>⟡</div>
                <div style={{
                  padding:'9px 14px',borderRadius:'14px 14px 14px 4px',
                  background:'#161625',border:'1px solid rgba(255,255,255,0.07)',
                  display:'flex',gap:4,alignItems:'center'
                }}>
                  {[0,1,2].map(i=>(
                    <div key={i} style={{
                      width:6,height:6,borderRadius:'50%',background:'#8b5cf6',
                      animation:`bounce 1s ${i*0.15}s infinite`
                    }}/>
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef}/>
          </div>

          <div style={{borderTop:'1px solid rgba(255,255,255,0.07)',padding:10,flexShrink:0}}>
            <div style={{
              display:'flex',gap:8,alignItems:'center',
              background:'#161625',border:'1px solid rgba(255,255,255,0.1)',
              borderRadius:12,padding:'6px 6px 6px 12px'
            }}>
              <input
                value={input}
                onChange={e=>setInput(e.target.value)}
                onKeyDown={e=>{if(e.key==='Enter')send()}}
                placeholder="প্রশ্ন করো..."
                style={{
                  flex:1,background:'transparent',border:'none',outline:'none',
                  color:'#eeeeff',fontSize:13,fontFamily:'inherit'
                }}
              />
              <button onClick={send} disabled={loading||!input.trim()} style={{
                width:32,height:32,borderRadius:9,border:'none',
                background:loading||!input.trim()?'#1e1e30':'linear-gradient(135deg,#8b5cf6,#f472b6)',
                color:'white',fontSize:16,cursor:'pointer',
                display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0
              }}>{loading?'⟳':'↑'}</button>
            </div>
          </div>
        </div>
      )}
      <style>{`@keyframes bounce{0%,100%{transform:translateY(0);opacity:.4;}50%{transform:translateY(-4px);opacity:1;}}`}</style>
    </>
  )
        }
