'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

// ═══════════════════════════════════════════════════════
// SNAKE
// ═══════════════════════════════════════════════════════
function SnakeGame() {
  const canvasRef = useRef(null)
  const gRef = useRef({ snake:[{x:10,y:10}], dir:{x:1,y:0}, food:{x:5,y:5}, score:0, alive:true, loop:null })
  const [score, setScore] = useState(0)
  const [alive, setAlive] = useState(true)
  const S=20,COLS=16,ROWS=22

  const draw = useCallback(() => {
    const c=canvasRef.current; if(!c) return
    const ctx=c.getContext('2d'); const g=gRef.current
    ctx.fillStyle='#0a0f1a'; ctx.fillRect(0,0,COLS*S,ROWS*S)
    // grid
    ctx.strokeStyle='rgba(255,255,255,.03)'
    for(let i=0;i<COLS;i++){ctx.beginPath();ctx.moveTo(i*S,0);ctx.lineTo(i*S,ROWS*S);ctx.stroke()}
    for(let i=0;i<ROWS;i++){ctx.beginPath();ctx.moveTo(0,i*S);ctx.lineTo(COLS*S,i*S);ctx.stroke()}
    // food glow
    ctx.shadowColor='#ff4560'; ctx.shadowBlur=12
    ctx.fillStyle='#ff4560'
    ctx.beginPath(); ctx.arc(g.food.x*S+S/2,g.food.y*S+S/2,S/2-3,0,Math.PI*2); ctx.fill()
    ctx.shadowBlur=0
    // snake
    g.snake.forEach((s,i) => {
      const ratio = 1 - i/g.snake.length*0.6
      ctx.fillStyle = i===0 ? '#00ff88' : `rgba(0,229,255,${ratio})`
      ctx.shadowColor = i===0 ? '#00ff88' : 'transparent'
      ctx.shadowBlur = i===0 ? 8 : 0
      const pad=i===0?1:2
      ctx.fillRect(s.x*S+pad,s.y*S+pad,S-pad*2,S-pad*2)
    })
    ctx.shadowBlur=0
    if(!g.alive){
      ctx.fillStyle='rgba(0,0,0,.6)'; ctx.fillRect(0,0,COLS*S,ROWS*S)
      ctx.fillStyle='#ff4560'; ctx.font='bold 22px system-ui'; ctx.textAlign='center'
      ctx.fillText('Game Over',COLS*S/2,ROWS*S/2-20)
      ctx.fillStyle='#eef2f7'; ctx.font='16px system-ui'
      ctx.fillText(`Score: ${g.score}`,COLS*S/2,ROWS*S/2+10)
    }
  },[])

  useEffect(() => {
    draw()
    gRef.current.loop = setInterval(() => {
      const g=gRef.current; if(!g.alive) return
      const head={x:g.snake[0].x+g.dir.x, y:g.snake[0].y+g.dir.y}
      if(head.x<0||head.x>=COLS||head.y<0||head.y>=ROWS||g.snake.some(s=>s.x===head.x&&s.y===head.y)){
        g.alive=false; clearInterval(g.loop); setAlive(false); draw(); return
      }
      g.snake.unshift(head)
      if(head.x===g.food.x&&head.y===g.food.y){
        g.score++; setScore(g.score)
        g.food={x:Math.floor(Math.random()*COLS),y:Math.floor(Math.random()*ROWS)}
      } else g.snake.pop()
      draw()
    },140)
    const k=(e)=>{
      const g=gRef.current
      if(e.key==='ArrowUp'&&g.dir.y===0)g.dir={x:0,y:-1}
      if(e.key==='ArrowDown'&&g.dir.y===0)g.dir={x:0,y:1}
      if(e.key==='ArrowLeft'&&g.dir.x===0)g.dir={x:-1,y:0}
      if(e.key==='ArrowRight'&&g.dir.x===0)g.dir={x:1,y:0}
    }
    window.addEventListener('keydown',k)
    return ()=>{clearInterval(gRef.current.loop);window.removeEventListener('keydown',k)}
  },[draw])

  const restart=()=>{
    clearInterval(gRef.current.loop)
    gRef.current={snake:[{x:10,y:10}],dir:{x:1,y:0},food:{x:5,y:5},score:0,alive:true,loop:null}
    setScore(0);setAlive(true)
    gRef.current.loop=setInterval(()=>{
      const g=gRef.current;if(!g.alive)return
      const head={x:g.snake[0].x+g.dir.x,y:g.snake[0].y+g.dir.y}
      if(head.x<0||head.x>=COLS||head.y<0||head.y>=ROWS||g.snake.some(s=>s.x===head.x&&s.y===head.y)){g.alive=false;clearInterval(g.loop);setAlive(false);draw();return}
      g.snake.unshift(head)
      if(head.x===g.food.x&&head.y===g.food.y){g.score++;setScore(g.score);g.food={x:Math.floor(Math.random()*COLS),y:Math.floor(Math.random()*ROWS)}}
      else g.snake.pop()
      draw()
    },140)
  }

  const swipe=(dir)=>{
    const g=gRef.current
    if(dir==='up'&&g.dir.y===0)g.dir={x:0,y:-1}
    if(dir==='down'&&g.dir.y===0)g.dir={x:0,y:1}
    if(dir==='left'&&g.dir.x===0)g.dir={x:-1,y:0}
    if(dir==='right'&&g.dir.x===0)g.dir={x:1,y:0}
  }

  return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'10px'}}>
      <div style={{fontSize:'20px',fontWeight:'900',color:'#00ff88'}}>🐍 Score: {score}</div>
      <canvas ref={canvasRef} width={COLS*S} height={ROWS*S} style={{borderRadius:'14px',border:'2px solid rgba(0,255,136,.3)',maxWidth:'100%'}} />
      {!alive&&<button onClick={restart} style={{padding:'12px 28px',background:'linear-gradient(135deg,#00e5ff,#00ff88)',border:'none',borderRadius:'12px',fontSize:'14px',fontWeight:'800',color:'#070a12',cursor:'pointer'}}>🔄 Restart</button>}
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,56px)',gap:'6px'}}>
        {[['','⬆️',''],['⬅️','','➡️'],['','⬇️','']].flat().map((d,i)=>(
          <button key={i} onClick={()=>d&&swipe({1:'up',3:'left',5:'right',7:'down'}[i])}
            style={{height:'56px',borderRadius:'12px',border:'1px solid rgba(255,255,255,.1)',background:d?'rgba(255,255,255,.08)':'transparent',fontSize:'22px',cursor:d?'pointer':'default'}}>{d}</button>
        ))}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════
// BUBBLE SHOOTER
// ═══════════════════════════════════════════════════════
function BubbleShooter() {
  const canvasRef = useRef(null)
  const W=300,H=480,R=18,COLS=10,ROWS=8
  const COLORS=['#ff4560','#00e5ff','#00ff88','#ffd700','#a78bfa','#ff8c69']
  const stateRef = useRef(null)
  const [score,setScore]=useState(0)
  const [gameOver,setGameOver]=useState(false)

  const randColor=()=>COLORS[Math.floor(Math.random()*COLORS.length)]

  const initGrid=()=>{
    const g=[]
    for(let r=0;r<ROWS;r++){
      g[r]=[]
      for(let c=0;c<COLS;c++) g[r][c]={color:randColor(),x:(c*R*2)+(r%2?R:0)+R,y:r*R*1.73+R}
    }
    return g
  }

  const drawState=(ctx,s)=>{
    ctx.fillStyle='#0a0f1a'; ctx.fillRect(0,0,W,H)
    // grid bubbles
    s.grid.forEach(row=>row.forEach(b=>{
      if(!b) return
      ctx.shadowColor=b.color; ctx.shadowBlur=6
      ctx.fillStyle=b.color
      ctx.beginPath(); ctx.arc(b.x,b.y,R-2,0,Math.PI*2); ctx.fill()
      ctx.fillStyle='rgba(255,255,255,.3)'
      ctx.beginPath(); ctx.arc(b.x-4,b.y-4,4,0,Math.PI*2); ctx.fill()
    }))
    ctx.shadowBlur=0
    // shooter
    const sx=W/2, sy=H-R-10
    ctx.fillStyle=s.nextColor
    ctx.shadowColor=s.nextColor; ctx.shadowBlur=10
    ctx.beginPath(); ctx.arc(sx,sy,R-2,0,Math.PI*2); ctx.fill()
    ctx.shadowBlur=0
    // aim line
    ctx.strokeStyle='rgba(255,255,255,.2)'; ctx.setLineDash([5,8])
    ctx.beginPath(); ctx.moveTo(sx,sy)
    ctx.lineTo(sx+Math.cos(s.angle)*80,sy+Math.sin(s.angle)*80)
    ctx.stroke(); ctx.setLineDash([])
    // score
    ctx.fillStyle='#eef2f7'; ctx.font='bold 16px system-ui'; ctx.textAlign='left'
    ctx.fillText(`Score: ${s.score}`,10,H-10)
  }

  useEffect(()=>{
    const canvas=canvasRef.current; const ctx=canvas.getContext('2d')
    const s={grid:initGrid(),nextColor:randColor(),angle:-Math.PI/2,bullet:null,score:0}
    stateRef.current=s; drawState(ctx,s)

    const handleMove=(e)=>{
      const rect=canvas.getBoundingClientRect()
      const cx=(e.touches?e.touches[0].clientX:e.clientX)-rect.left
      const cy=(e.touches?e.touches[0].clientY:e.clientY)-rect.top
      const sx=W/2,sy=H-R-10
      s.angle=Math.atan2(cy-sy,cx-sx)
      if(!s.bullet) drawState(ctx,s)
    }

    const shoot=(e)=>{
      if(s.bullet) return
      const rect=canvas.getBoundingClientRect()
      const cx=(e.touches?e.touches[0].clientX:e.clientX)-rect.left
      const cy=(e.touches?e.touches[0].clientY:e.clientY)-rect.top
      const sx=W/2,sy=H-R-10
      const ang=Math.atan2(cy-sy,cx-sx)
      s.bullet={x:sx,y:sy,vx:Math.cos(ang)*8,vy:Math.sin(ang)*8,color:s.nextColor}
      s.nextColor=randColor()
    }

    const loop=setInterval(()=>{
      if(!s.bullet){drawState(ctx,s);return}
      s.bullet.x+=s.bullet.vx; s.bullet.y+=s.bullet.vy
      // wall bounce
      if(s.bullet.x<R||s.bullet.x>W-R) s.bullet.vx*=-1
      if(s.bullet.y<R){s.bullet.vy*=-1}
      // check collision with grid
      let hit=false
      s.grid.forEach((row,ri)=>row.forEach((b,ci)=>{
        if(!b||hit) return
        const dx=s.bullet.x-b.x,dy=s.bullet.y-b.y
        if(Math.sqrt(dx*dx+dy*dy)<R*2){
          // place bubble near hit
          const nr=Math.max(0,Math.min(ROWS-1,ri+(s.bullet.vy>0?1:0)))
          const nc=Math.max(0,Math.min(COLS-1,ci))
          if(!s.grid[nr][nc]){
            s.grid[nr][nc]={color:s.bullet.color,x:b.x+(nc-ci)*R*2,y:b.y+(nr-ri)*R*1.73}
          }
          // pop matches
          const toCheck=[{r:ri,c:ci}]; const visited=new Set()
          const matches=[]; const color=b.color
          while(toCheck.length){
            const{r:cr,c:cc}=toCheck.pop()
            const key=`${cr},${cc}`; if(visited.has(key)) continue
            visited.add(key)
            if(s.grid[cr]?.[cc]?.color===color){
              matches.push({r:cr,c:cc})
              for(const[dr,dc] of[[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]]){
                const nr2=cr+dr,nc2=cc+dc
                if(nr2>=0&&nr2<ROWS&&nc2>=0&&nc2<COLS&&!visited.has(`${nr2},${nc2}`)) toCheck.push({r:nr2,c:nc2})
              }
            }
          }
          if(matches.length>=3){
            matches.forEach(({r:mr,c:mc})=>{s.grid[mr][mc]=null})
            s.score+=matches.length*10; setScore(s.score)
          }
          s.bullet=null; hit=true
        }
      }))
      // out of bounds
      if(s.bullet&&s.bullet.y>H+R){s.bullet=null}
      // check game over
      if(s.grid[ROWS-1]?.some(b=>b)){setGameOver(true);clearInterval(loop)}
      drawState(ctx,s)
    },16)
    canvas.addEventListener('mousemove',handleMove)
    canvas.addEventListener('touchmove',handleMove,{passive:true})
    canvas.addEventListener('click',shoot)
    canvas.addEventListener('touchend',shoot)
    return()=>{clearInterval(loop);canvas.removeEventListener('mousemove',handleMove);canvas.removeEventListener('click',shoot)}
  },[])

  return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'10px'}}>
      <div style={{fontSize:'18px',fontWeight:'900',color:'#a78bfa'}}>🫧 Score: {score}</div>
      <canvas ref={canvasRef} width={W} height={H} style={{borderRadius:'14px',border:'2px solid rgba(167,139,250,.3)',maxWidth:'100%',cursor:'crosshair'}} />
      {gameOver&&<div style={{textAlign:'center'}}><div style={{fontSize:'18px',fontWeight:'900',color:'#ff4560',marginBottom:'8px'}}>Game Over! Score: {score}</div></div>}
      <div style={{fontSize:'11px',color:'#4a5568'}}>Tap/Click করো shoot করতে</div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════
// CAR RACING
// ═══════════════════════════════════════════════════════
function CarRacing() {
  const canvasRef=useRef(null)
  const W=300,H=500
  const stateRef=useRef(null)
  const [score,setScore]=useState(0)
  const [alive,setAlive]=useState(true)
  const [started,setStarted]=useState(false)

  const drawCar=(ctx,x,y,color,w=36,h=56)=>{
    ctx.fillStyle=color
    ctx.fillRect(x-w/2,y-h/2,w,h)
    ctx.fillStyle='rgba(0,0,0,.5)'
    ctx.fillRect(x-w/2+4,y-h/2+6,w-8,14)
    ctx.fillRect(x-w/2+4,y+h/2-20,w-8,14)
    ctx.fillStyle='#ffd700'
    ctx.fillRect(x-w/2,y-h/2,8,6); ctx.fillRect(x+w/2-8,y-h/2,8,6)
    ctx.fillStyle='#ff4560'
    ctx.fillRect(x-w/2,y+h/2-6,8,6); ctx.fillRect(x+w/2-8,y+h/2-6,8,6)
  }

  useEffect(()=>{
    const canvas=canvasRef.current; const ctx=canvas.getContext('2d')
    const LANES=[60,120,180,240]
    const s={
      player:{x:W/2,y:H-80,speed:0},
      enemies:[],roadOffset:0,score:0,alive:true,started:false,
      keys:{left:false,right:false},loop:null,spawnTimer:0
    }
    stateRef.current=s

    const draw=()=>{
      // road
      ctx.fillStyle='#1a1a2e'; ctx.fillRect(0,0,W,H)
      ctx.fillStyle='#16213e'
      ctx.fillRect(40,0,W-80,H)
      // lane markings
      ctx.strokeStyle='rgba(255,255,255,.15)'; ctx.setLineDash([30,20]); ctx.lineWidth=3
      ;[W/3,W*2/3].forEach(x=>{ctx.beginPath();ctx.moveTo(x,(s.roadOffset%50)-50);ctx.lineTo(x,H+50);ctx.stroke()})
      ctx.setLineDash([])
      // enemies
      s.enemies.forEach(e=>drawCar(ctx,e.x,e.y,'#ff4560'))
      // player
      drawCar(ctx,s.player.x,s.player.y,'#00e5ff')
      // score
      ctx.fillStyle='#eef2f7'; ctx.font='bold 18px system-ui'; ctx.textAlign='center'
      ctx.fillText(`Score: ${s.score}`,W/2,30)
      if(!s.started){
        ctx.fillStyle='rgba(0,0,0,.6)'; ctx.fillRect(0,0,W,H)
        ctx.fillStyle='#00e5ff'; ctx.font='bold 20px system-ui'
        ctx.fillText('Tap to Start!',W/2,H/2)
        ctx.fillStyle='#4a5568'; ctx.font='14px system-ui'
        ctx.fillText('Arrow keys or buttons',W/2,H/2+30)
      }
      if(!s.alive){
        ctx.fillStyle='rgba(0,0,0,.7)'; ctx.fillRect(0,0,W,H)
        ctx.fillStyle='#ff4560'; ctx.font='bold 24px system-ui'
        ctx.fillText('CRASH! 💥',W/2,H/2-20)
        ctx.fillStyle='#eef2f7'; ctx.font='18px system-ui'
        ctx.fillText(`Score: ${s.score}`,W/2,H/2+20)
        ctx.fillStyle='#00e5ff'; ctx.font='14px system-ui'
        ctx.fillText('Tap to restart',W/2,H/2+50)
      }
    }

    const loop=setInterval(()=>{
      if(!s.alive||!s.started){draw();return}
      s.roadOffset+=4+s.score/200
      s.spawnTimer++
      if(s.spawnTimer>Math.max(40,80-s.score/50)){
        s.spawnTimer=0
        s.enemies.push({x:LANES[Math.floor(Math.random()*LANES.length)]+40,y:-60,speed:3+Math.random()*2+s.score/300})
      }
      // move enemies
      s.enemies=s.enemies.filter(e=>{
        e.y+=e.speed
        // collision
        if(Math.abs(e.x-s.player.x)<30&&Math.abs(e.y-s.player.y)<40){s.alive=false;setAlive(false)}
        return e.y<H+60
      })
      // move player
      if(s.keys.left&&s.player.x>60) s.player.x-=4
      if(s.keys.right&&s.player.x<W-60) s.player.x+=4
      s.score++; if(s.score%100===0) setScore(s.score)
      draw()
    },16)
    s.loop=loop

    const handleKey=(e)=>{
      if(e.key==='ArrowLeft') s.keys.left=e.type==='keydown'
      if(e.key==='ArrowRight') s.keys.right=e.type==='keydown'
    }
    window.addEventListener('keydown',handleKey)
    window.addEventListener('keyup',handleKey)

    const handleTap=()=>{
      if(!s.started){s.started=true;setStarted(true);return}
      if(!s.alive){
        s.enemies=[];s.score=0;s.alive=true;s.started=true;s.roadOffset=0;s.spawnTimer=0
        s.player.x=W/2
        setScore(0);setAlive(true)
      }
    }
    canvas.addEventListener('click',handleTap)
    return()=>{clearInterval(loop);window.removeEventListener('keydown',handleKey);window.removeEventListener('keyup',handleKey);canvas.removeEventListener('click',handleTap)}
  },[])

  const moveLeft=()=>{if(stateRef.current)stateRef.current.keys.left=true}
  const moveRight=()=>{if(stateRef.current)stateRef.current.keys.right=true}
  const stopMove=()=>{if(stateRef.current){stateRef.current.keys.left=false;stateRef.current.keys.right=false}}

  return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'10px'}}>
      <div style={{fontSize:'18px',fontWeight:'900',color:'#00e5ff'}}>🚗 Score: {score}</div>
      <canvas ref={canvasRef} width={W} height={H} style={{borderRadius:'14px',border:'2px solid rgba(0,229,255,.3)',maxWidth:'100%',cursor:'pointer'}} />
      <div style={{display:'flex',gap:'20px'}}>
        <button onPointerDown={moveLeft} onPointerUp={stopMove} onPointerLeave={stopMove}
          style={{width:'80px',height:'60px',borderRadius:'14px',border:'2px solid rgba(0,229,255,.3)',background:'rgba(0,229,255,.1)',fontSize:'28px',cursor:'pointer',userSelect:'none'}}>⬅️</button>
        <button onPointerDown={moveRight} onPointerUp={stopMove} onPointerLeave={stopMove}
          style={{width:'80px',height:'60px',borderRadius:'14px',border:'2px solid rgba(0,229,255,.3)',background:'rgba(0,229,255,.1)',fontSize:'28px',cursor:'pointer',userSelect:'none'}}>➡️</button>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════
// BOWLING
// ═══════════════════════════════════════════════════════
function Bowling() {
  const [angle,setAngle]=useState(0)
  const [power,setPower]=useState(50)
  const [pins,setPins]=useState(()=>Array(10).fill(true))
  const [rolling,setRolling]=useState(false)
  const [score,setScore]=useState(0)
  const [frame,setFrame]=useState(1)
  const [msg,setMsg]=useState('')
  const [ballPos,setBallPos]=useState({x:50,y:90})
  const canvasRef=useRef(null)

  const PIN_POS=[
    {x:50,y:15},{x:45,y:22},{x:55,y:22},{x:40,y:29},{x:50,y:29},{x:60,y:29},
    {x:35,y:36},{x:45,y:36},{x:55,y:36},{x:65,y:36}
  ]

  useEffect(()=>{
    const c=canvasRef.current; if(!c) return
    const ctx=c.getContext('2d')
    const W=c.width,H=c.height
    ctx.fillStyle='#1a1a2e'; ctx.fillRect(0,0,W,H)
    // lane
    ctx.fillStyle='#c8a96e'; ctx.fillRect(W*0.2,0,W*0.6,H)
    ctx.fillStyle='rgba(0,0,0,.1)'
    ctx.fillRect(W*0.2,0,6,H); ctx.fillRect(W*0.8-6,0,6,H)
    // gutters
    ctx.fillStyle='#8B6914'; ctx.fillRect(W*0.2-20,0,20,H); ctx.fillRect(W*0.8,0,20,H)
    // pins
    pins.forEach((up,i)=>{
      const p=PIN_POS[i]
      const px=W*0.2+W*0.6*p.x/100, py=H*p.y/100
      ctx.beginPath(); ctx.arc(px,py,8,0,Math.PI*2)
      ctx.fillStyle=up?'#ffffff':'rgba(255,255,255,.15)'
      ctx.shadowColor=up?'rgba(255,255,255,.5)':'transparent'
      ctx.shadowBlur=up?8:0
      ctx.fill(); ctx.shadowBlur=0
    })
    // ball
    const bx=W*0.2+W*0.6*ballPos.x/100, by=H*ballPos.y/100
    ctx.beginPath(); ctx.arc(bx,by,14,0,Math.PI*2)
    ctx.fillStyle='#1a1a2e'
    ctx.shadowColor='#00e5ff'; ctx.shadowBlur=12
    ctx.fill()
    ctx.fillStyle='rgba(0,229,255,.4)'
    ctx.beginPath(); ctx.arc(bx-4,by-4,4,0,Math.PI*2); ctx.fill()
    ctx.shadowBlur=0
    // aim arrow
    if(!rolling){
      const rad=(angle-90)*Math.PI/180
      ctx.strokeStyle='rgba(0,229,255,.5)'; ctx.lineWidth=2; ctx.setLineDash([5,5])
      ctx.beginPath(); ctx.moveTo(bx,by); ctx.lineTo(bx+Math.cos(rad)*60,by+Math.sin(rad)*60); ctx.stroke()
      ctx.setLineDash([])
    }
  },[pins,ballPos,angle,rolling])

  const roll=()=>{
    if(rolling) return
    setRolling(true)
    const rad=(angle-90)*Math.PI/180
    let bx=50,by=90; let t=0
    const anim=setInterval(()=>{
      t+=2
      bx+=Math.cos(rad)*power/30
      by+=Math.sin(rad)*power/30
      setBallPos({x:Math.max(5,Math.min(95,bx)),y:Math.max(5,by)})
      if(by<20){
        clearInterval(anim)
        // calculate hits based on angle and power
        const newPins=[...pins]
        let knocked=0
        newPins.forEach((up,i)=>{
          if(!up) return
          const p=PIN_POS[i]
          const dx=Math.abs(p.x-50-(angle-90)*0.3)
          const chance=power/100*(1-dx/40)
          if(Math.random()<Math.max(0,chance)){newPins[i]=false;knocked++}
        })
        setPins(newPins)
        const allDown=newPins.every(p=>!p)
        if(allDown){setMsg('🎳 STRIKE!');setScore(p=>p+knocked*15)}
        else if(knocked===0){setMsg('Gutter... 😢')}
        else{setMsg(`${knocked} pins!`);setScore(p=>p+knocked*10)}
        setFrame(p=>p+1)
        setTimeout(()=>{setRolling(false);setBallPos({x:50,y:90});if(allDown||frame%2===0)setPins(Array(10).fill(true));setMsg('')},1500)
      }
    },20)
  }

  return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'12px'}}>
      <div style={{display:'flex',gap:'20px',fontSize:'14px',fontWeight:'800'}}>
        <span style={{color:'#ffd700'}}>🎳 Score: {score}</span>
        <span style={{color:'#4a5568'}}>Frame: {frame}/10</span>
      </div>
      {msg&&<div style={{fontSize:'18px',fontWeight:'900',color:msg.includes('STRIKE')?'#ffd700':'#00e5ff',animation:'fadeUp .3s ease'}}>{msg}</div>}
      <canvas ref={canvasRef} width={300} height={400} style={{borderRadius:'14px',border:'2px solid rgba(255,215,0,.3)',maxWidth:'100%'}} />
      <div style={{width:'100%',maxWidth:'300px',display:'flex',flexDirection:'column',gap:'10px'}}>
        <div>
          <div style={{fontSize:'11px',color:'#4a5568',marginBottom:'4px'}}>Angle: {angle}°</div>
          <input type='range' min='-30' max='30' value={angle} onChange={e=>setAngle(parseInt(e.target.value))} disabled={rolling}
            style={{width:'100%',accentColor:'#00e5ff'}} />
        </div>
        <div>
          <div style={{fontSize:'11px',color:'#4a5568',marginBottom:'4px'}}>Power: {power}%</div>
          <input type='range' min='20' max='100' value={power} onChange={e=>setPower(parseInt(e.target.value))} disabled={rolling}
            style={{width:'100%',accentColor:'#ffd700'}} />
        </div>
        <button onClick={roll} disabled={rolling}
          style={{padding:'14px',background:rolling?'rgba(255,255,255,.06)':'linear-gradient(135deg,#ffd700,#ffa500)',border:'none',borderRadius:'14px',fontSize:'15px',fontWeight:'900',color:rolling?'#4a5568':'#070a12',cursor:rolling?'default':'pointer'}}>
          {rolling?'Rolling...':'🎳 Bowl!'}
        </button>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════
// CRICKET
// ═══════════════════════════════════════════════════════
function Cricket() {
  const SHOTS=['Drive','Pull','Cut','Sweep','Defend']
  const DELIVERIES=['Fast','Spin','Yorker','Bouncer','Full toss']
  const [phase,setPhase]=useState('toss') // toss,batting,bowling,result
  const [batting,setBatting]=useState(true)
  const [score,setScore]=useState(0)
  const [wickets,setWickets]=useState(0)
  const [balls,setBalls]=useState(0)
  const [aiScore,setAiScore]=useState(0)
  const [msg,setMsg]=useState('')
  const [history,setHistory]=useState([])
  const OVERS=3, MAX_BALLS=OVERS*6

  const toss=(choice)=>{
    const win=Math.random()>0.5
    const bat=(choice==='bat')===win
    setBatting(bat)
    setPhase(bat?'batting':'bowling')
    setMsg(win?`Toss জিতেছ! ${bat?'Batting':'Bowling'} করো`:`Toss হেরেছ! ${bat?'Bowling':'Batting'} করো`)
    setTimeout(()=>setMsg(''),2000)
  }

  const playShot=(shot)=>{
    if(balls>=MAX_BALLS||wickets>=10) return
    const delivery=DELIVERIES[Math.floor(Math.random()*DELIVERIES.length)]
    const shotIdx=SHOTS.indexOf(shot)
    const delIdx=DELIVERIES.indexOf(delivery)
    const diff=Math.abs(shotIdx-delIdx)
    let runs=0,out=false
    const r=Math.random()
    if(diff<=1){
      if(r<0.08)out=true
      else if(r<0.15)runs=6
      else if(r<0.3)runs=4
      else if(r<0.5)runs=Math.floor(Math.random()*3)+1
      else runs=0
    } else {
      if(r<0.2)out=true
      else if(r<0.35)runs=4
      else runs=Math.floor(Math.random()*2)
    }
    const nb=balls+1
    setBalls(nb)
    if(out){
      const nw=wickets+1; setWickets(nw)
      setHistory(p=>[{ball:nb,runs:'W',delivery},...p.slice(0,7)])
      setMsg(`OUT! ${delivery} delivery! 🏏`)
      if(nw>=10||(phase==='batting'&&nb>=MAX_BALLS)){endInnings()}
    } else {
      setScore(p=>p+runs)
      setHistory(p=>[{ball:nb,runs,delivery},...p.slice(0,7)])
      setMsg(runs===6?'SIX! 🙌':runs===4?'FOUR! 👏':runs===0?'Dot ball':''+runs+' run'+(runs>1?'s':''))
      if(nb>=MAX_BALLS) endInnings()
    }
    setTimeout(()=>setMsg(''),1500)
  }

  const endInnings=()=>{
    if(phase==='batting'){
      // AI bats
      let ais=0
      for(let i=0;i<MAX_BALLS;i++){
        const r=Math.random()
        if(r<0.1)break
        else if(r<0.2)ais+=6
        else if(r<0.35)ais+=4
        else if(r<0.6)ais+=Math.floor(Math.random()*3)+1
      }
      setAiScore(ais)
      setPhase('result')
    } else {
      setPhase('result')
    }
  }

  const restart=()=>{setPhase('toss');setScore(0);setWickets(0);setBalls(0);setAiScore(0);setHistory([]);setMsg('')}

  if(phase==='toss') return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'16px',padding:'20px'}}>
      <div style={{fontSize:'48px'}}>🏏</div>
      <div style={{fontSize:'18px',fontWeight:'900',color:'#eef2f7'}}>Toss করো!</div>
      <div style={{display:'flex',gap:'12px'}}>
        <button onClick={()=>toss('bat')} style={{padding:'14px 24px',background:'linear-gradient(135deg,#00e5ff,#00ff88)',border:'none',borderRadius:'14px',fontSize:'14px',fontWeight:'800',color:'#070a12',cursor:'pointer'}}>🏏 Batting</button>
        <button onClick={()=>toss('bowl')} style={{padding:'14px 24px',background:'linear-gradient(135deg,#ff4560,#ffa500)',border:'none',borderRadius:'14px',fontSize:'14px',fontWeight:'800',color:'#fff',cursor:'pointer'}}>⚾ Bowling</button>
      </div>
    </div>
  )

  if(phase==='result') return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'14px',padding:'20px'}}>
      <div style={{fontSize:'48px'}}>{score>aiScore?'🏆':score===aiScore?'🤝':'😢'}</div>
      <div style={{fontSize:'20px',fontWeight:'900',color:score>aiScore?'#00ff88':score===aiScore?'#ffd700':'#ff4560'}}>
        {score>aiScore?'জিতেছ!':score===aiScore?'Draw!':'হেরেছ!'}
      </div>
      <div style={{background:'rgba(255,255,255,.05)',borderRadius:'14px',padding:'16px',width:'100%',maxWidth:'280px'}}>
        <div style={{display:'flex',justifyContent:'space-between',marginBottom:'8px'}}>
          <span style={{color:'#00e5ff',fontWeight:'800'}}>তুমি</span>
          <span style={{color:'#00e5ff',fontWeight:'900',fontSize:'20px'}}>{score}/{wickets}</span>
        </div>
        <div style={{display:'flex',justifyContent:'space-between'}}>
          <span style={{color:'#ff4560',fontWeight:'800'}}>AI</span>
          <span style={{color:'#ff4560',fontWeight:'900',fontSize:'20px'}}>{aiScore}/10</span>
        </div>
      </div>
      <button onClick={restart} style={{padding:'12px 24px',background:'linear-gradient(135deg,#00e5ff,#00ff88)',border:'none',borderRadius:'12px',fontSize:'14px',fontWeight:'800',color:'#070a12',cursor:'pointer'}}>🔄 Again</button>
    </div>
  )

  return (
    <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>
      <div style={{background:'rgba(255,255,255,.05)',borderRadius:'14px',padding:'12px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <div style={{textAlign:'center'}}>
          <div style={{fontSize:'10px',color:'#4a5568'}}>Score</div>
          <div style={{fontSize:'22px',fontWeight:'900',color:'#00e5ff'}}>{score}/{wickets}</div>
        </div>
        <div style={{textAlign:'center'}}>
          <div style={{fontSize:'10px',color:'#4a5568'}}>Overs</div>
          <div style={{fontSize:'18px',fontWeight:'900',color:'#eef2f7'}}>{Math.floor(balls/6)}.{balls%6}/{OVERS}</div>
        </div>
        <div style={{textAlign:'center'}}>
          <div style={{fontSize:'10px',color:'#4a5568'}}>Target</div>
          <div style={{fontSize:'18px',fontWeight:'900',color:'#ffd700'}}>{phase==='bowling'?aiScore+1:'-'}</div>
        </div>
      </div>
      {msg&&<div style={{textAlign:'center',fontSize:'16px',fontWeight:'900',color:'#00ff88',animation:'fadeUp .2s ease'}}>{msg}</div>}
      {/* Ball history */}
      <div style={{display:'flex',gap:'6px',flexWrap:'wrap'}}>
        {history.slice(0,6).map((h,i)=>(
          <div key={i} style={{width:'36px',height:'36px',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'12px',fontWeight:'900',
            background:h.runs==='W'?'rgba(255,69,96,.2)':h.runs===6?'rgba(0,255,136,.2)':h.runs===4?'rgba(255,215,0,.2)':'rgba(255,255,255,.06)',
            color:h.runs==='W'?'#ff4560':h.runs===6?'#00ff88':h.runs===4?'#ffd700':'#eef2f7',
            border:`1px solid ${h.runs==='W'?'rgba(255,69,96,.4)':h.runs>=4?'rgba(0,255,136,.3)':'rgba(255,255,255,.1)'}`}}>
            {h.runs}
          </div>
        ))}
      </div>
      <div style={{fontSize:'12px',color:'#4a5568',textAlign:'center'}}>Shot বেছে নাও:</div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px'}}>
        {SHOTS.map(s=>(
          <button key={s} onClick={()=>playShot(s)}
            style={{padding:'14px',borderRadius:'12px',border:'1px solid rgba(0,229,255,.2)',background:'rgba(0,229,255,.06)',color:'#eef2f7',fontSize:'13px',fontWeight:'700',cursor:'pointer'}}>
            🏏 {s}
          </button>
        ))}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════
// FOOTBALL PvP PENALTY SHOOTOUT
// ═══════════════════════════════════════════════════════
function Football() {
  const DIRS=['⬅️ Left','⬆️ Top','➡️ Right','↙️ Low-L','↘️ Low-R']
  const [phase,setPhase]=useState('choose') // choose,shoot,result
  const [playerScore,setPlayerScore]=useState(0)
  const [aiScore,setAiScore]=useState(0)
  const [round,setRound]=useState(1)
  const [msg,setMsg]=useState('')
  const [history,setHistory]=useState([])
  const [animGoal,setAnimGoal]=useState(false)
  const [animSave,setAnimSave]=useState(false)
  const ROUNDS=5

  const shoot=(dir)=>{
    if(phase!=='choose') return
    setPhase('shoot')
    const aiDir=Math.floor(Math.random()*DIRS.length)
    const scored=DIRS.indexOf(dir)!==aiDir
    const newPS=playerScore+(scored?1:0)
    // AI shoots
    const aiShootDir=Math.floor(Math.random()*DIRS.length)
    const myDir=Math.floor(Math.random()*DIRS.length)
    const aiScored=aiShootDir!==myDir
    const newAIS=aiScore+(aiScored?1:0)

    setPlayerScore(newPS); setAiScore(newAIS)
    setHistory(p=>[...p,{round,playerScored:scored,aiScored}])

    if(scored){setAnimGoal(true);setTimeout(()=>setAnimGoal(false),800)}
    else{setAnimSave(true);setTimeout(()=>setAnimSave(false),800)}

    setMsg(`${scored?'⚽ GOAL!':'🧤 Saved!'} | AI: ${aiScored?'⚽ GOAL!':'🧤 Saved!'}`)

    setTimeout(()=>{
      setMsg('')
      if(round>=ROUNDS){setPhase('result')}
      else{setRound(p=>p+1);setPhase('choose')}
    },2000)
  }

  const restart=()=>{setPhase('choose');setPlayerScore(0);setAiScore(0);setRound(1);setMsg('');setHistory([])}

  return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'14px'}}>
      {/* Scoreboard */}
      <div style={{display:'flex',gap:'0',background:'#111620',borderRadius:'16px',overflow:'hidden',width:'100%',maxWidth:'300px'}}>
        <div style={{flex:1,textAlign:'center',padding:'12px',background:'rgba(0,229,255,.08)'}}>
          <div style={{fontSize:'10px',color:'#4a5568'}}>তুমি 🇧🇩</div>
          <div style={{fontSize:'32px',fontWeight:'900',color:'#00e5ff'}}>{playerScore}</div>
        </div>
        <div style={{width:'1px',background:'rgba(255,255,255,.1)'}} />
        <div style={{padding:'12px',textAlign:'center',background:'rgba(255,255,255,.03)'}}>
          <div style={{fontSize:'10px',color:'#4a5568'}}>Round</div>
          <div style={{fontSize:'20px',fontWeight:'900',color:'#4a5568'}}>{round}/{ROUNDS}</div>
        </div>
        <div style={{width:'1px',background:'rgba(255,255,255,.1)'}} />
        <div style={{flex:1,textAlign:'center',padding:'12px',background:'rgba(255,69,96,.08)'}}>
          <div style={{fontSize:'10px',color:'#4a5568'}}>AI 🤖</div>
          <div style={{fontSize:'32px',fontWeight:'900',color:'#ff4560'}}>{aiScore}</div>
        </div>
      </div>

      {/* Goal visual */}
      <div style={{position:'relative',width:'280px',height:'160px',background:'linear-gradient(180deg,#87CEEB,#4a7c59)',borderRadius:'14px',overflow:'hidden',border:'2px solid rgba(255,255,255,.1)'}}>
        {/* field */}
        <div style={{position:'absolute',bottom:0,left:0,right:0,height:'80px',background:'#4a7c59'}} />
        <div style={{position:'absolute',bottom:'80px',left:'50%',transform:'translateX(-50%)',width:'100px',height:'2px',background:'rgba(255,255,255,.5)'}} />
        {/* goal */}
        <div style={{position:'absolute',top:'10px',left:'50%',transform:'translateX(-50%)',width:'120px',height:'70px',border:'4px solid white',borderBottom:'none',borderRadius:'4px 4px 0 0'}} />
        {/* ball */}
        <div style={{position:'absolute',bottom:'90px',left:'50%',transform:'translateX(-50%)',fontSize:animGoal?'32px':animSave?'20px':'24px',transition:'all .3s',filter:animGoal?'drop-shadow(0 0 12px #ffd700)':'none'}}>
          ⚽
        </div>
        {/* goalkeeper */}
        <div style={{position:'absolute',top:'20px',left:'50%',transform:'translateX(-50%)',fontSize:'28px',transition:'all .3s'}}>{animSave?'🧤':'🧤'}</div>
        {/* goal flash */}
        {animGoal&&<div style={{position:'absolute',inset:0,background:'rgba(255,215,0,.3)',borderRadius:'12px',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'32px',fontWeight:'900'}}>⚽ GOAL!</div>}
        {animSave&&<div style={{position:'absolute',inset:0,background:'rgba(0,100,255,.2)',borderRadius:'12px',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'28px',fontWeight:'900',color:'#fff'}}>🧤 SAVED!</div>}
      </div>

      {msg&&<div style={{fontSize:'15px',fontWeight:'900',color:'#ffd700',textAlign:'center'}}>{msg}</div>}

      {phase==='choose'&&(
        <>
          <div style={{fontSize:'12px',color:'#4a5568'}}>কোন দিকে শট নেবে?</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px',width:'100%',maxWidth:'300px'}}>
            {DIRS.map(d=>(
              <button key={d} onClick={()=>shoot(d)}
                style={{padding:'14px',borderRadius:'12px',border:'1px solid rgba(0,255,136,.2)',background:'rgba(0,255,136,.06)',color:'#eef2f7',fontSize:'13px',fontWeight:'700',cursor:'pointer'}}>
                {d}
              </button>
            ))}
          </div>
        </>
      )}

      {phase==='result'&&(
        <div style={{textAlign:'center'}}>
          <div style={{fontSize:'36px',marginBottom:'8px'}}>{playerScore>aiScore?'🏆':playerScore===aiScore?'🤝':'😢'}</div>
          <div style={{fontSize:'20px',fontWeight:'900',color:playerScore>aiScore?'#00ff88':playerScore===aiScore?'#ffd700':'#ff4560',marginBottom:'12px'}}>
            {playerScore>aiScore?'জিতেছ!':playerScore===aiScore?'Draw!':'হেরেছ!'}
          </div>
          <button onClick={restart} style={{padding:'12px 24px',background:'linear-gradient(135deg,#00e5ff,#00ff88)',border:'none',borderRadius:'12px',fontSize:'14px',fontWeight:'800',color:'#070a12',cursor:'pointer'}}>🔄 Again</button>
        </div>
      )}

      {/* Round history */}
      {history.length>0&&(
        <div style={{display:'flex',gap:'6px',flexWrap:'wrap',justifyContent:'center'}}>
          {history.map((h,i)=>(
            <div key={i} style={{fontSize:'16px'}}>{h.playerScored?'⚽':'❌'}</div>
          ))}
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════
// CHESS (simplified)
// ═══════════════════════════════════════════════════════
function Chess() {
  const INIT=[
    ['♜','♞','♝','♛','♚','♝','♞','♜'],
    ['♟','♟','♟','♟','♟','♟','♟','♟'],
    Array(8).fill(''),Array(8).fill(''),Array(8).fill(''),Array(8).fill(''),
    ['♙','♙','♙','♙','♙','♙','♙','♙'],
    ['♖','♘','♗','♕','♔','♗','♘','♖'],
  ]
  const BLACK='♜♞♝♛♚♟'
  const WHITE='♖♘♗♕♔♙'
  const [board,setBoard]=useState(INIT.map(r=>[...r]))
  const [sel,setSel]=useState(null)
  const [turn,setTurn]=useState('white')
  const [msg,setMsg]=useState('White এর turn')
  const [captured,setCaptured]=useState({white:[],black:[]})

  const isWhite=p=>WHITE.includes(p)
  const isBlack=p=>BLACK.includes(p)
  const isEmpty=p=>p===''

  const click=(r,c)=>{
    const piece=board[r][c]
    if(!sel){
      if(turn==='white'&&isWhite(piece)) setSel([r,c])
      else if(turn==='black'&&isBlack(piece)) setSel([r,c])
    } else {
      const [sr,sc]=sel
      if(sr===r&&sc===c){setSel(null);return}
      const sp=board[sr][sc]
      // basic move validation - any piece can go anywhere (simplified)
      const target=board[r][c]
      const sameTeam=(turn==='white'&&isWhite(target))||(turn==='black'&&isBlack(target))
      if(sameTeam){setSel([r,c]);return}
      const nb=board.map(row=>[...row])
      if(target!==''){
        setCaptured(p=>({...p,[turn==='white'?'white':'black']:[...p[turn==='white'?'white':'black'],target]}))
      }
      nb[r][c]=sp; nb[sr][sc]=''; setBoard(nb); setSel(null)
      const nextTurn=turn==='white'?'black':'white'
      setTurn(nextTurn); setMsg(`${nextTurn==='white'?'White':'Black'} এর turn`)
    }
  }

  return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'10px'}}>
      <div style={{fontSize:'13px',fontWeight:'700',color:turn==='white'?'#eef2f7':'#4a5568',background:'rgba(255,255,255,.05)',borderRadius:'10px',padding:'6px 14px'}}>{msg}</div>
      <div style={{background:'#111',borderRadius:'12px',padding:'4px',border:'2px solid rgba(255,255,255,.1)'}}>
        {board.map((row,r)=>(
          <div key={r} style={{display:'flex'}}>
            {row.map((piece,c)=>{
              const isLight=(r+c)%2===0
              const isSelected=sel&&sel[0]===r&&sel[1]===c
              return (
                <div key={c} onClick={()=>click(r,c)}
                  style={{width:'36px',height:'36px',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'22px',cursor:'pointer',
                    background:isSelected?'rgba(0,229,255,.5)':isLight?'rgba(255,255,255,.12)':'rgba(0,0,0,.4)',
                    border:isSelected?'2px solid #00e5ff':'2px solid transparent',borderRadius:'4px',transition:'all .1s'}}>
                  {piece}
                </div>
              )
            })}
          </div>
        ))}
      </div>
      <div style={{display:'flex',gap:'16px',fontSize:'11px'}}>
        <div style={{color:'#eef2f7'}}>White captured: {captured.white.join(' ')||'none'}</div>
        <div style={{color:'#4a5568'}}>Black captured: {captured.black.join(' ')||'none'}</div>
      </div>
      <button onClick={()=>{setBoard(INIT.map(r=>[...r]));setSel(null);setTurn('white');setMsg('White এর turn');setCaptured({white:[],black:[]})}}
        style={{padding:'10px 20px',background:'linear-gradient(135deg,#a78bfa,#00e5ff)',border:'none',borderRadius:'10px',fontSize:'13px',fontWeight:'800',color:'#fff',cursor:'pointer'}}>
        🔄 New Game
      </button>
    </div>
  )
}

// ═══════════════════════════════════════════════════════
// CARROM
// ═══════════════════════════════════════════════════════
function Carrom() {
  const canvasRef=useRef(null)
  const W=300,H=300
  const stateRef=useRef(null)
  const [score,setScore]=useState({p1:0,p2:0})
  const [turn,setTurn]=useState(1)
  const [msg,setMsg]=useState('')

  useEffect(()=>{
    const canvas=canvasRef.current; const ctx=canvas.getContext('2d')
    const HOLE_R=12,COIN_R=10,STRIKER_R=14,BOARD=260
    const OFF=(W-BOARD)/2

    // coins
    const coins=[]
    const center=W/2
    const positions=[
      {x:center,y:center-22},{x:center+19,y:center-11},{x:center+19,y:center+11},
      {x:center,y:center+22},{x:center-19,y:center+11},{x:center-19,y:center-11},
      {x:center,y:center}
    ]
    positions.forEach((p,i)=>coins.push({x:p.x,y:p.y,vx:0,vy:0,color:i<3?'#eef2f7':i<6?'#1a1a2e':'#ff4560',pocketed:false,r:COIN_R}))
    const striker={x:center,y:BOARD+OFF-30,vx:0,vy:0,r:STRIKER_R,moving:false}
    const s={coins,striker,score:{p1:0,p2:0},turn:1,angle:-Math.PI/2,power:50}
    stateRef.current=s

    const draw=()=>{
      ctx.fillStyle='#c8a96e'; ctx.fillRect(0,0,W,H)
      ctx.fillStyle='#b8955a'; ctx.fillRect(OFF,OFF,BOARD,BOARD)
      // holes
      const holes=[{x:OFF+HOLE_R,y:OFF+HOLE_R},{x:OFF+BOARD-HOLE_R,y:OFF+HOLE_R},{x:OFF+HOLE_R,y:OFF+BOARD-HOLE_R},{x:OFF+BOARD-HOLE_R,y:OFF+BOARD-HOLE_R}]
      holes.forEach(h=>{ctx.fillStyle='#0a0a0a';ctx.beginPath();ctx.arc(h.x,h.y,HOLE_R,0,Math.PI*2);ctx.fill()})
      // center circle
      ctx.strokeStyle='rgba(0,0,0,.3)';ctx.lineWidth=2;ctx.beginPath();ctx.arc(center,center,30,0,Math.PI*2);ctx.stroke()
      // coins
      s.coins.forEach(c=>{
        if(c.pocketed) return
        ctx.fillStyle=c.color; ctx.shadowColor=c.color; ctx.shadowBlur=4
        ctx.beginPath();ctx.arc(c.x,c.y,c.r,0,Math.PI*2);ctx.fill()
        ctx.shadowBlur=0
      })
      // striker
      ctx.fillStyle='#ffd700'; ctx.shadowColor='#ffd700'; ctx.shadowBlur=8
      ctx.beginPath();ctx.arc(s.striker.x,s.striker.y,s.striker.r,0,Math.PI*2);ctx.fill()
      ctx.shadowBlur=0
      // aim
      if(!s.striker.moving){
        ctx.strokeStyle='rgba(255,215,0,.4)';ctx.setLineDash([5,5]);ctx.lineWidth=2
        ctx.beginPath();ctx.moveTo(s.striker.x,s.striker.y)
        ctx.lineTo(s.striker.x+Math.cos(s.angle)*70,s.striker.y+Math.sin(s.angle)*70)
        ctx.stroke();ctx.setLineDash([])
      }
      // scores
      ctx.fillStyle='#0a0a0a';ctx.font='bold 13px system-ui';ctx.textAlign='left'
      ctx.fillText(`P1: ${s.score.p1}`,5,16);ctx.textAlign='right';ctx.fillText(`P2: ${s.score.p2}`,W-5,16)
    }

    const physics=setInterval(()=>{
      let moving=false
      const allCoins=[...s.coins,s.striker]
      allCoins.forEach(c=>{
        if(c.pocketed) return
        c.x+=c.vx; c.y+=c.vy; c.vx*=0.98; c.vy*=0.98
        if(Math.abs(c.vx)<0.05) c.vx=0
        if(Math.abs(c.vy)<0.05) c.vy=0
        if(Math.abs(c.vx)>0||Math.abs(c.vy)>0) moving=true
        // walls
        if(c.x-c.r<OFF){c.x=OFF+c.r;c.vx=Math.abs(c.vx)}
        if(c.x+c.r>OFF+BOARD){c.x=OFF+BOARD-c.r;c.vx=-Math.abs(c.vx)}
        if(c.y-c.r<OFF){c.y=OFF+c.r;c.vy=Math.abs(c.vy)}
        if(c.y+c.r>OFF+BOARD){c.y=OFF+BOARD-c.r;c.vy=-Math.abs(c.vy)}
        // pocket check
        holes.forEach(h=>{
          const dx=c.x-h.x,dy=c.y-h.y
          if(Math.sqrt(dx*dx+dy*dy)<HOLE_R+c.r-5){
            if(c===s.striker){c.x=center;c.y=BOARD+OFF-30;c.vx=0;c.vy=0}
            else if(!c.pocketed){
              c.pocketed=true
              if(c.color==='#ff4560'){s.score.p1+=3;setScore({...s.score})}
              else{s.score[s.turn===1?'p1':'p2']+=1;setScore({...s.score})}
            }
          }
        })
        // coin-coin collision
        s.coins.forEach(c2=>{
          if(c===c2||c.pocketed||c2.pocketed) return
          const dx=c2.x-c.x,dy=c2.y-c.y,dist=Math.sqrt(dx*dx+dy*dy)
          if(dist<c.r+c2.r&&dist>0){
            const nx=dx/dist,ny=dy/dist
            const overlap=(c.r+c2.r-dist)/2
            c.x-=nx*overlap;c.y-=ny*overlap;c2.x+=nx*overlap;c2.y+=ny*overlap
            const rv=c.vx*nx+c.vy*ny-c2.vx*nx-c2.vy*ny
            c.vx-=rv*nx;c.vy-=rv*ny;c2.vx+=rv*nx;c2.vy+=rv*ny
          }
        })
      })
      s.striker.moving=moving
      draw()
    },16)

    const handleMove=(e)=>{
      if(s.striker.moving) return
      const rect=canvas.getBoundingClientRect()
      const cx=(e.touches?e.touches[0].clientX:e.clientX)-rect.left
      const cy=(e.touches?e.touches[0].clientY:e.clientY)-rect.top
      s.angle=Math.atan2(cy-s.striker.y,cx-s.striker.x)
      draw()
    }
    const handleShoot=(e)=>{
      if(s.striker.moving) return
      const speed=s.power/10
      s.striker.vx=Math.cos(s.angle)*speed; s.striker.vy=Math.sin(s.angle)*speed
      s.striker.moving=true
    }

    canvas.addEventListener('mousemove',handleMove)
    canvas.addEventListener('touchmove',handleMove,{passive:true})
    canvas.addEventListener('click',handleShoot)
    canvas.addEventListener('touchend',handleShoot)
    draw()
    return()=>{clearInterval(physics);canvas.removeEventListener('mousemove',handleMove);canvas.removeEventListener('click',handleShoot)}
  },[])

  return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'12px'}}>
      <div style={{display:'flex',gap:'20px',fontSize:'14px',fontWeight:'800'}}>
        <span style={{color:'#eef2f7'}}>P1: {score.p1}</span>
        <span style={{color:'#ffd700'}}>🎯 Carrom</span>
        <span style={{color:'#4a5568'}}>P2: {score.p2}</span>
      </div>
      <canvas ref={canvasRef} width={W} height={H} style={{borderRadius:'14px',border:'2px solid rgba(255,215,0,.3)',maxWidth:'100%',cursor:'crosshair'}} />
      <div style={{fontSize:'11px',color:'#4a5568'}}>Mouse/Touch দিয়ে aim করো → Click করো strike করতে</div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════
// LUDO
// ═══════════════════════════════════════════════════════
function Ludo() {
  const COLORS=['#ff4560','#00e5ff','#00ff88','#ffd700']
  const NAMES=['Red','Blue','Green','Yellow']
  const [pieces,setPieces]=useState(()=>
    COLORS.map((_,ci)=>Array(4).fill(0).map((_,pi)=>({color:COLORS[ci],pos:-1,home:false,id:`${ci}-${pi}`})))
  )
  const [turn,setTurn]=useState(0)
  const [dice,setDice]=useState(null)
  const [rolled,setRolled]=useState(false)
  const [msg,setMsg]=useState('Red এর turn - Dice roll করো!')
  const [winner,setWinner]=useState(null)

  const rollDice=()=>{
    if(rolled||winner) return
    const d=Math.floor(Math.random()*6)+1
    setDice(d)
    setRolled(true)
    // auto move for AI players (turns 1,2,3)
    if(turn>0){
      setTimeout(()=>{
        const movable=pieces[turn].filter(p=>!p.home&&(p.pos>=0||d===6))
        if(movable.length>0){
          const p=movable[Math.floor(Math.random()*movable.length)]
          movePiece(turn,p.id,d)
        } else {
          setMsg(`${NAMES[turn]} move করতে পারছে না`)
          setTimeout(()=>nextTurn(),1000)
        }
      },800)
    } else {
      const canMove=pieces[0].some(p=>!p.home&&(p.pos>=0||d===6))
      if(!canMove){
        setMsg('Move করার সুযোগ নেই!')
        setTimeout(()=>nextTurn(),1000)
      } else {
        setMsg(`${d} এসেছে! কোন piece move করবে?`)
      }
    }
  }

  const movePiece=(playerIdx,pieceId,d=dice)=>{
    if(!rolled&&playerIdx===0) return
    setPieces(prev=>{
      const np=prev.map(player=>player.map(p=>{
        if(p.id!==pieceId) return p
        if(p.home) return p
        let newPos=p.pos===-1?(d===6?0:p.pos):(p.pos+d)
        if(newPos>=52){return{...p,home:true,pos:52}}
        return{...p,pos:newPos}
      }))
      // check win
      if(np[playerIdx].every(p=>p.home)) setWinner(playerIdx)
      return np
    })
    if(playerIdx===0) nextTurn()
  }

  const nextTurn=()=>{
    setRolled(false)
    setDice(null)
    const next=(turn+1)%4
    setTurn(next)
    setMsg(`${NAMES[next]} এর turn${next===0?' - Dice roll করো!':''}`)
  }

  const CELL_S=22
  const boardSize=15*CELL_S

  return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'12px'}}>
      {winner!==null&&<div style={{fontSize:'20px',fontWeight:'900',color:COLORS[winner]}}>🏆 {NAMES[winner]} জিতেছে!</div>}
      {/* simplified ludo board visual */}
      <div style={{background:'#f5f5dc',borderRadius:'12px',padding:'6px',border:'3px solid #8B6914',position:'relative',width:`${boardSize}px`,height:`${boardSize}px`}}>
        {/* Color quadrants */}
        {[['#ff456033','#ff4560'],['#00e5ff33','#00e5ff'],['#00ff8833','#00ff88'],['#ffd70033','#ffd700']].map(([bg,border],i)=>{
          const positions=[[0,0],[9*CELL_S,0],[9*CELL_S,9*CELL_S],[0,9*CELL_S]]
          const [lx,ly]=positions[i]
          return (
            <div key={i} style={{position:'absolute',left:lx,top:ly,width:6*CELL_S,height:6*CELL_S,background:bg,border:`2px solid ${border}`,borderRadius:'8px',display:'flex',flexWrap:'wrap',alignItems:'center',justifyContent:'center',gap:'6px',padding:'8px'}}>
              {pieces[i].map(p=>(
                <div key={p.id} onClick={()=>turn===0&&i===0&&rolled&&!p.home&&movePiece(0,p.id)}
                  style={{width:'20px',height:'20px',borderRadius:'50%',background:p.color,border:'2px solid rgba(255,255,255,.5)',cursor:turn===0&&i===0&&rolled?'pointer':'default',opacity:p.home?.3:1,boxShadow:`0 0 6px ${p.color}`}} />
              ))}
            </div>
          )
        })}
        {/* center */}
        <div style={{position:'absolute',left:6*CELL_S,top:6*CELL_S,width:3*CELL_S,height:3*CELL_S,background:'linear-gradient(135deg,#ff4560,#00e5ff,#00ff88,#ffd700)',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'20px'}}>⭐</div>
      </div>

      <div style={{fontSize:'12px',color:'#eef2f7',textAlign:'center',padding:'8px 14px',background:'rgba(255,255,255,.05)',borderRadius:'10px'}}>{msg}</div>

      {dice&&<div style={{fontSize:'48px'}}>{['','⚀','⚁','⚂','⚃','⚄','⚅'][dice]}</div>}

      {turn===0&&!rolled&&!winner&&(
        <button onClick={rollDice} style={{padding:'14px 32px',background:'linear-gradient(135deg,#ff4560,#ffa500)',border:'none',borderRadius:'14px',fontSize:'16px',fontWeight:'900',color:'#fff',cursor:'pointer'}}>
          🎲 Dice Roll করো
        </button>
      )}
      {turn===0&&rolled&&!winner&&(
        <div style={{display:'flex',gap:'8px',flexWrap:'wrap',justifyContent:'center'}}>
          {pieces[0].filter(p=>!p.home&&(p.pos>=0||dice===6)).map(p=>(
            <button key={p.id} onClick={()=>movePiece(0,p.id)}
              style={{padding:'10px 18px',background:'linear-gradient(135deg,#ff4560,#ffa500)',border:'none',borderRadius:'12px',fontSize:'13px',fontWeight:'800',color:'#fff',cursor:'pointer'}}>
              Piece {p.id.split('-')[1]*1+1} (pos:{p.pos===-1?'Base':p.pos})
            </button>
          ))}
        </div>
      )}
      {winner!==null&&<button onClick={()=>{setPieces(COLORS.map((_,ci)=>Array(4).fill(0).map((_,pi)=>({color:COLORS[ci],pos:-1,home:false,id:`${ci}-${pi}`}))));setTurn(0);setDice(null);setRolled(false);setWinner(null);setMsg('Red এর turn - Dice roll করো!')}} style={{padding:'12px 24px',background:'linear-gradient(135deg,#00e5ff,#00ff88)',border:'none',borderRadius:'12px',fontSize:'14px',fontWeight:'800',color:'#070a12',cursor:'pointer'}}>🔄 New Game</button>}
    </div>
  )
}

// ═══════════════════════════════════════════════════════
// GAME MAP
// ═══════════════════════════════════════════════════════
const GAME_COMPONENTS={snake:SnakeGame,bubble:BubbleShooter,racing:CarRacing,bowling:Bowling,cricket:Cricket,football:Football,chess:Chess,carrom:Carrom,ludo:Ludo}
const GAME_INFO={snake:'🐍 Snake',bubble:'🫧 Bubble Shooter',racing:'🚗 Car Racing',bowling:'🎳 Bowling',cricket:'🏏 Cricket',football:'⚽ Football',chess:'♟️ Chess',carrom:'🎯 Carrom',ludo:'🎲 Ludo'}

// ═══════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════
export default function GamePlay() {
  const [params,setParams]=useState({game:'',mode:'solo'})
  const [score,setScore]=useState(null)

  useEffect(()=>{
    const p=new URLSearchParams(window.location.search)
    setParams({game:p.get('game')||'',mode:p.get('mode')||'solo'})
  },[])

  const GameComp=GAME_COMPONENTS[params.game]
  const title=GAME_INFO[params.game]||'🎮 Game'

  return (
    <div style={{minHeight:'100vh',background:'#070a12',color:'#eef2f7',fontFamily:'system-ui,sans-serif'}}>
      <style>{`*{box-sizing:border-box}::-webkit-scrollbar{display:none}@keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
      {/* TOP BAR */}
      <div style={{position:'sticky',top:0,zIndex:100,background:'rgba(7,10,18,.97)',backdropFilter:'blur(12px)',borderBottom:'1px solid rgba(255,255,255,.07)',height:'54px',display:'flex',alignItems:'center',padding:'0 16px',gap:'10px'}}>
        <button onClick={()=>window.location.href='/games'} style={{background:'none',border:'none',color:'#4a5568',fontSize:'20px',cursor:'pointer'}}>←</button>
        <div style={{flex:1,fontSize:'15px',fontWeight:'900',background:'linear-gradient(90deg,#00e5ff,#a78bfa)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>{title}</div>
        {score!==null&&<div style={{fontSize:'13px',fontWeight:'800',color:'#ffd700'}}>🏆 {score}</div>}
      </div>
      <div style={{padding:'16px',display:'flex',justifyContent:'center'}}>
        {GameComp?(
          <GameComp onScore={setScore} vsMode={params.mode==='vs'} />
        ):(
          <div style={{textAlign:'center',padding:'60px 20px'}}>
            <div style={{fontSize:'56px',marginBottom:'12px'}}>🎮</div>
            <div style={{fontSize:'16px',color:'#4a5568'}}>Game not found</div>
            <button onClick={()=>window.location.href='/games'} style={{padding:'12px 24px',background:'linear-gradient(135deg,#00e5ff,#00ff88)',border:'none',borderRadius:'12px',fontSize:'14px',fontWeight:'800',color:'#070a12',cursor:'pointer',marginTop:'16px'}}>← Games</button>
          </div>
        )}
      </div>
    </div>
  )
        }
