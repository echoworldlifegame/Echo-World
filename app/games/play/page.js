'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

// ═══════════════════════════════════════════════════════
// SNAKE GAME
// ═══════════════════════════════════════════════════════
function SnakeGame({ onScore }) {
  const canvasRef = useRef(null)
  const gameRef = useRef({ snake:[{x:10,y:10}], dir:{x:1,y:0}, food:{x:5,y:5}, score:0, alive:true, loop:null })
  const [score, setScore] = useState(0)
  const [alive, setAlive] = useState(true)
  const SIZE = 20, COLS = 16, ROWS = 20

  const draw = useCallback(() => {
    const c = canvasRef.current; if (!c) return
    const ctx = c.getContext('2d')
    const g = gameRef.current
    ctx.fillStyle = '#0c1018'; ctx.fillRect(0,0,COLS*SIZE,ROWS*SIZE)
    ctx.fillStyle = '#ff4560'
    ctx.fillRect(g.food.x*SIZE+2, g.food.y*SIZE+2, SIZE-4, SIZE-4)
    g.snake.forEach((s,i) => {
      ctx.fillStyle = i===0 ? '#00ff88' : '#00e5ff'
      ctx.fillRect(s.x*SIZE+1, s.y*SIZE+1, SIZE-2, SIZE-2)
    })
  }, [])

  const step = useCallback(() => {
    const g = gameRef.current; if (!g.alive) return
    const head = { x: g.snake[0].x + g.dir.x, y: g.snake[0].y + g.dir.y }
    if (head.x<0||head.x>=COLS||head.y<0||head.y>=ROWS||g.snake.some(s=>s.x===head.x&&s.y===head.y)) {
      g.alive = false; clearInterval(g.loop); setAlive(false); onScore && onScore(g.score); return
    }
    g.snake.unshift(head)
    if (head.x===g.food.x && head.y===g.food.y) {
      g.score++; setScore(g.score)
      g.food = { x:Math.floor(Math.random()*COLS), y:Math.floor(Math.random()*ROWS) }
    } else g.snake.pop()
    draw()
  }, [draw, onScore])

  useEffect(() => {
    draw()
    gameRef.current.loop = setInterval(step, 150)
    const handleKey = (e) => {
      const g = gameRef.current
      if (e.key==='ArrowUp'&&g.dir.y===0) g.dir={x:0,y:-1}
      if (e.key==='ArrowDown'&&g.dir.y===0) g.dir={x:0,y:1}
      if (e.key==='ArrowLeft'&&g.dir.x===0) g.dir={x:-1,y:0}
      if (e.key==='ArrowRight'&&g.dir.x===0) g.dir={x:1,y:0}
    }
    window.addEventListener('keydown', handleKey)
    return () => { clearInterval(gameRef.current.loop); window.removeEventListener('keydown', handleKey) }
  }, [draw, step])

  const restart = () => {
    gameRef.current = { snake:[{x:10,y:10}], dir:{x:1,y:0}, food:{x:5,y:5}, score:0, alive:true, loop:null }
    setScore(0); setAlive(true)
    gameRef.current.loop = setInterval(step, 150); draw()
  }

  const swipe = (dir) => {
    const g = gameRef.current
    if (dir==='up'&&g.dir.y===0) g.dir={x:0,y:-1}
    if (dir==='down'&&g.dir.y===0) g.dir={x:0,y:1}
    if (dir==='left'&&g.dir.x===0) g.dir={x:-1,y:0}
    if (dir==='right'&&g.dir.x===0) g.dir={x:1,y:0}
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'12px' }}>
      <div style={{ fontSize:'18px', fontWeight:'900', color:'#00ff88' }}>Score: {score}</div>
      <canvas ref={canvasRef} width={COLS*SIZE} height={ROWS*SIZE} style={{ borderRadius:'12px', border:'2px solid rgba(0,255,136,.3)' }} />
      {!alive && <button onClick={restart} style={{ padding:'12px 28px', background:'linear-gradient(135deg,#00e5ff,#00ff88)', border:'none', borderRadius:'12px', fontSize:'14px', fontWeight:'800', color:'#070a12', cursor:'pointer' }}>🔄 Restart</button>}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,52px)', gap:'6px' }}>
        {[['','⬆️',''],['⬅️','','➡️'],['','⬇️','']].flat().map((d,i) => (
          <button key={i} onClick={() => d&&swipe({1:'up',3:'left',5:'right',7:'down'}[i])}
            style={{ height:'52px', borderRadius:'10px', border:'1px solid rgba(255,255,255,.1)', background: d?'rgba(255,255,255,.08)':'transparent', fontSize:'20px', cursor:d?'pointer':'default' }}>{d}</button>
        ))}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════
// TETRIS
// ═══════════════════════════════════════════════════════
function TetrisGame({ onScore }) {
  const canvasRef = useRef(null)
  const stateRef = useRef(null)
  const [score, setScore] = useState(0)
  const [alive, setAlive] = useState(true)
  const SIZE=22, COLS=10, ROWS=18
  const PIECES = [
    [[1,1,1,1]], [[1,1],[1,1]], [[1,1,1],[0,1,0]], [[1,1,1],[1,0,0]],
    [[1,1,1],[0,0,1]], [[1,1,0],[0,1,1]], [[0,1,1],[1,1,0]]
  ]
  const COLORS = ['#00e5ff','#ffd700','#a78bfa','#ff8c69','#00ff88','#ff4560','#ffa500']

  const newPiece = () => {
    const idx = Math.floor(Math.random()*PIECES.length)
    return { shape: PIECES[idx], color: COLORS[idx], x: 3, y: 0 }
  }

  const initState = () => ({
    board: Array(ROWS).fill(null).map(()=>Array(COLS).fill(0)),
    current: newPiece(), score: 0, alive: true, loop: null
  })

  const canPlace = (board, piece, dx=0, dy=0) => {
    return piece.shape.every((row,r) => row.every((v,c) => {
      if (!v) return true
      const nx=piece.x+c+dx, ny=piece.y+r+dy
      return nx>=0&&nx<COLS&&ny>=0&&ny<ROWS&&!board[ny][nx]
    }))
  }

  const place = (state) => {
    const b = state.board.map(r=>[...r])
    state.current.shape.forEach((row,r) => row.forEach((v,c) => {
      if (v) b[state.current.y+r][state.current.x+c] = state.current.color
    }))
    let lines = 0
    const nb = b.filter(row => { if(row.every(Boolean)){lines++;return false} return true })
    while(nb.length<ROWS) nb.unshift(Array(COLS).fill(0))
    state.score += lines*100; setScore(state.score)
    return nb
  }

  const draw = (state) => {
    const c = canvasRef.current; if(!c) return
    const ctx = c.getContext('2d')
    ctx.fillStyle='#0c1018'; ctx.fillRect(0,0,COLS*SIZE,ROWS*SIZE)
    state.board.forEach((row,r) => row.forEach((v,c2) => {
      if(v){ctx.fillStyle=v; ctx.fillRect(c2*SIZE+1,r*SIZE+1,SIZE-2,SIZE-2)}
    }))
    state.current.shape.forEach((row,r) => row.forEach((v,c2) => {
      if(v){ctx.fillStyle=state.current.color; ctx.fillRect((state.current.x+c2)*SIZE+1,(state.current.y+r)*SIZE+1,SIZE-2,SIZE-2)}
    }))
  }

  useEffect(() => {
    const s = initState(); stateRef.current = s; draw(s)
    const step = () => {
      const st = stateRef.current; if(!st.alive) return
      if(canPlace(st.board,st.current,0,1)) { st.current.y++; draw(st) }
      else {
        const nb = place(st); st.board = nb
        st.current = newPiece()
        if(!canPlace(nb,st.current)){st.alive=false;clearInterval(st.loop);setAlive(false);onScore&&onScore(st.score)}
        draw(st)
      }
    }
    s.loop = setInterval(step, 500)
    const handleKey = (e) => {
      const st = stateRef.current; if(!st?.alive) return
      if(e.key==='ArrowLeft'&&canPlace(st.board,st.current,-1,0)) st.current.x--
      if(e.key==='ArrowRight'&&canPlace(st.board,st.current,1,0)) st.current.x++
      if(e.key==='ArrowDown'&&canPlace(st.board,st.current,0,1)) st.current.y++
      if(e.key==='ArrowUp'){
        const rot=st.current.shape[0].map((_,i)=>st.current.shape.map(r=>r[i]).reverse())
        const np={...st.current,shape:rot}
        if(canPlace(st.board,np)) st.current=np
      }
      draw(st)
    }
    window.addEventListener('keydown',handleKey)
    return () => {clearInterval(s.loop);window.removeEventListener('keydown',handleKey)}
  }, [])

  const restart = () => {
    if(stateRef.current?.loop) clearInterval(stateRef.current.loop)
    const s=initState(); stateRef.current=s; setScore(0); setAlive(true); draw(s)
    s.loop=setInterval(()=>{
      const st=stateRef.current; if(!st.alive) return
      if(canPlace(st.board,st.current,0,1)){st.current.y++;draw(st)}
      else{const nb=place(st);st.board=nb;st.current=newPiece();if(!canPlace(nb,st.current)){st.alive=false;clearInterval(st.loop);setAlive(false)}draw(st)}
    },500)
  }

  const move = (dir) => {
    const st=stateRef.current; if(!st?.alive) return
    if(dir==='left'&&canPlace(st.board,st.current,-1,0)) st.current.x--
    if(dir==='right'&&canPlace(st.board,st.current,1,0)) st.current.x++
    if(dir==='down'&&canPlace(st.board,st.current,0,1)) st.current.y++
    if(dir==='rotate'){const rot=st.current.shape[0].map((_,i)=>st.current.shape.map(r=>r[i]).reverse());const np={...st.current,shape:rot};if(canPlace(st.board,np))st.current=np}
    draw(st)
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'12px' }}>
      <div style={{ fontSize:'18px', fontWeight:'900', color:'#a78bfa' }}>Score: {score}</div>
      <canvas ref={canvasRef} width={COLS*SIZE} height={ROWS*SIZE} style={{ borderRadius:'12px', border:'2px solid rgba(167,139,250,.3)' }} />
      {!alive && <button onClick={restart} style={{ padding:'12px 28px', background:'linear-gradient(135deg,#a78bfa,#00e5ff)', border:'none', borderRadius:'12px', fontSize:'14px', fontWeight:'800', color:'#fff', cursor:'pointer' }}>🔄 Restart</button>}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,52px)', gap:'6px' }}>
        {[['🔄','⬆️',''],['⬅️','⬇️','➡️']].flat().map((d,i)=>(
          <button key={i} onClick={()=>d&&move({0:'rotate',1:'rotate',3:'left',4:'down',5:'right'}[i]||'')}
            style={{height:'52px',borderRadius:'10px',border:'1px solid rgba(255,255,255,.1)',background:d?'rgba(255,255,255,.08)':'transparent',fontSize:'20px',cursor:d?'pointer':'default'}}>{d}</button>
        ))}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════
// 2048
// ═══════════════════════════════════════════════════════
function Game2048({ onScore }) {
  const init = () => { const b=Array(4).fill(null).map(()=>Array(4).fill(0)); addTile(b); addTile(b); return b }
  const addTile = (b) => {
    const empty=[]; b.forEach((r,i)=>r.forEach((v,j)=>{if(!v)empty.push([i,j])}))
    if(!empty.length) return; const [r,c]=empty[Math.floor(Math.random()*empty.length)]; b[r][c]=Math.random()<0.9?2:4
  }
  const [board, setBoard] = useState(init)
  const [score, setScore] = useState(0)
  const [won, setWon] = useState(false)
  const [lost, setLost] = useState(false)

  const slide = (row) => {
    let r=row.filter(Boolean),s=0
    for(let i=0;i<r.length-1;i++) if(r[i]===r[i+1]){r[i]*=2;s+=r[i];r.splice(i+1,1);i++}
    while(r.length<4) r.push(0)
    return {row:r,score:s}
  }

  const move = (dir) => {
    if(won||lost) return
    let b=board.map(r=>[...r]); let sc=0; let changed=false
    const transform=(b)=>{ const t=b[0].map((_,c)=>b.map(r=>r[c])); return t.map(r=>[...r]) }
    let nb=b
    if(dir==='left') nb=b.map(r=>{const{row,score:s}=slide(r);sc+=s;if(row.join()!==r.join())changed=true;return row})
    if(dir==='right') nb=b.map(r=>{const rev=[...r].reverse();const{row,score:s}=slide(rev);sc+=s;const nr=[...row].reverse();if(nr.join()!==r.join())changed=true;return nr})
    if(dir==='up'){const t=transform(b);const slid=t.map(r=>{const{row,score:s}=slide(r);sc+=s;if(row.join()!==r.join())changed=true;return row});nb=transform(slid)}
    if(dir==='down'){const t=transform(b).map(r=>[...r].reverse());const slid=t.map(r=>{const{row,score:s}=slide(r);sc+=s;if(row.join()!==r.join())changed=true;return row});nb=transform(slid.map(r=>[...r].reverse()))}
    if(!changed) return
    addTile(nb); setBoard(nb); setScore(p=>p+sc)
    if(nb.some(r=>r.includes(2048))) setWon(true)
    else if(!nb.some(r=>r.includes(0))) setLost(true)
    onScore&&onScore(score+sc)
  }

  const COLORS = {0:'#1a2035',2:'#eee4da',4:'#ede0c8',8:'#f2b179',16:'#f59563',32:'#f67c5f',64:'#f65e3b',128:'#edcf72',256:'#edcc61',512:'#edc850',1024:'#edc53f',2048:'#edc22e'}

  useEffect(()=>{
    const h=(e)=>{
      if(e.key==='ArrowLeft')move('left'); if(e.key==='ArrowRight')move('right')
      if(e.key==='ArrowUp')move('up'); if(e.key==='ArrowDown')move('down')
    }
    window.addEventListener('keydown',h); return ()=>window.removeEventListener('keydown',h)
  })

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'12px' }}>
      <div style={{ fontSize:'18px', fontWeight:'900', color:'#ffd700' }}>Score: {score}</div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'6px', background:'#0c1018', padding:'8px', borderRadius:'14px', border:'2px solid rgba(255,215,0,.3)' }}>
        {board.flat().map((v,i)=>(
          <div key={i} style={{ width:'64px', height:'64px', borderRadius:'10px', background:COLORS[v]||'#f9f6f2', display:'flex', alignItems:'center', justifyContent:'center', fontSize:v>99?v>999?'16px':'20px':'24px', fontWeight:'900', color:v<=4?'#776e65':'#f9f6f2', transition:'all .1s' }}>
            {v||''}
          </div>
        ))}
      </div>
      {(won||lost)&&<div style={{textAlign:'center'}}>
        <div style={{fontSize:'20px',fontWeight:'900',color:won?'#ffd700':'#ff4560',marginBottom:'8px'}}>{won?'🎉 2048!':'💀 Game Over'}</div>
        <button onClick={()=>{setBoard(init());setScore(0);setWon(false);setLost(false)}} style={{padding:'10px 24px',background:'linear-gradient(135deg,#ffd700,#ffa500)',border:'none',borderRadius:'12px',fontSize:'14px',fontWeight:'800',color:'#070a12',cursor:'pointer'}}>🔄 Again</button>
      </div>}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,52px)', gap:'6px' }}>
        {[['','⬆️',''],['⬅️','⬇️','➡️']].flat().map((d,i)=>(
          <button key={i} onClick={()=>{if(d==='⬆️')move('up');if(d==='⬇️')move('down');if(d==='⬅️')move('left');if(d==='➡️')move('right')}}
            style={{height:'52px',borderRadius:'10px',border:'1px solid rgba(255,255,255,.1)',background:d?'rgba(255,255,255,.08)':'transparent',fontSize:'20px',cursor:d?'pointer':'default'}}>{d}</button>
        ))}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════
// TIC TAC TOE
// ═══════════════════════════════════════════════════════
function TicTacToe({ vsMode, onScore }) {
  const [board, setBoard] = useState(Array(9).fill(null))
  const [xIsNext, setXIsNext] = useState(true)
  const [winner, setWinner] = useState(null)

  const checkWinner = (b) => {
    const lines=[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]]
    for(const[a,b2,c] of lines) if(b[a]&&b[a]===b[b2]&&b[a]===b[c]) return b[a]
    if(b.every(Boolean)) return 'draw'
    return null
  }

  const aiMove = (b) => {
    const empty=b.reduce((a,v,i)=>v?a:[...a,i],[])
    if(!empty.length) return
    // simple ai
    const lines=[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]]
    for(const[a,b2,c] of lines){const v=[b[a],b[b2],b[c]];if(v.filter(x=>x==='O').length===2&&v.includes(null)){b[v.indexOf(null)===0?a:v.indexOf(null)===1?b2:c]='O';return}}
    for(const[a,b2,c] of lines){const v=[b[a],b[b2],b[c]];if(v.filter(x=>x==='X').length===2&&v.includes(null)){b[v.indexOf(null)===0?a:v.indexOf(null)===1?b2:c]='O';return}}
    if(b[4]===null){b[4]='O';return}
    b[empty[Math.floor(Math.random()*empty.length)]]='O'
  }

  const click = (i) => {
    if(board[i]||winner) return
    const nb=[...board]; nb[i]='X'
    const w=checkWinner(nb)
    if(w){setBoard(nb);setWinner(w);return}
    if(!vsMode){setTimeout(()=>{aiMove(nb);const w2=checkWinner(nb);setBoard([...nb]);if(w2)setWinner(w2);else setXIsNext(true)},400)}
    setBoard(nb); if(vsMode)setXIsNext(p=>!p)
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'16px' }}>
      <div style={{ fontSize:'14px', fontWeight:'700', color:'#eef2f7' }}>
        {winner ? (winner==='draw'?'🤝 Draw!':`🎉 ${winner} wins!`) : `${vsMode?`Player ${xIsNext?'X':'O'}`:'Your'} turn (${xIsNext?'X':'O'})`}
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'8px' }}>
        {board.map((v,i)=>(
          <button key={i} onClick={()=>click(i)}
            style={{ width:'88px', height:'88px', borderRadius:'14px', border:`2px solid ${v==='X'?'rgba(0,229,255,.4)':v==='O'?'rgba(255,69,96,.4)':'rgba(255,255,255,.1)'}`, background:v?'rgba(255,255,255,.05)':'rgba(255,255,255,.03)', fontSize:'36px', cursor:'pointer', fontWeight:'900', color:v==='X'?'#00e5ff':'#ff4560', transition:'all .15s' }}>
            {v}
          </button>
        ))}
      </div>
      {winner && <button onClick={()=>{setBoard(Array(9).fill(null));setWinner(null);setXIsNext(true)}} style={{padding:'10px 24px',background:'linear-gradient(135deg,#00e5ff,#00ff88)',border:'none',borderRadius:'12px',fontSize:'14px',fontWeight:'800',color:'#070a12',cursor:'pointer'}}>🔄 Again</button>}
    </div>
  )
}

// ═══════════════════════════════════════════════════════
// CONNECT FOUR
// ═══════════════════════════════════════════════════════
function ConnectFour({ vsMode }) {
  const [board, setBoard] = useState(Array(6).fill(null).map(()=>Array(7).fill(null)))
  const [turn, setTurn] = useState('R')
  const [winner, setWinner] = useState(null)

  const checkWin = (b) => {
    for(let r=0;r<6;r++) for(let c=0;c<7;c++){
      const v=b[r][c]; if(!v) continue
      if(c+3<7&&[1,2,3].every(i=>b[r][c+i]===v)) return v
      if(r+3<6&&[1,2,3].every(i=>b[r+i][c]===v)) return v
      if(r+3<6&&c+3<7&&[1,2,3].every(i=>b[r+i][c+i]===v)) return v
      if(r+3<6&&c-3>=0&&[1,2,3].every(i=>b[r+i][c-i]===v)) return v
    }
    return null
  }

  const drop = (col) => {
    if(winner) return
    const nb=board.map(r=>[...r])
    let row=-1; for(let r=5;r>=0;r--){if(!nb[r][col]){row=r;break}}
    if(row===-1) return
    nb[row][col]=turn
    const w=checkWin(nb); setBoard(nb)
    if(w){setWinner(w);return}
    setTurn(p=>p==='R'?'Y':'R')
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'12px' }}>
      <div style={{ fontSize:'13px', fontWeight:'700', color: winner?'#ffd700':turn==='R'?'#ff4560':'#ffd700' }}>
        {winner ? `🎉 ${winner==='R'?'🔴':'🟡'} Wins!` : `${turn==='R'?'🔴':'🟡'} ${vsMode?'Player':'Your'} Turn`}
      </div>
      <div style={{ background:'#0c1018', borderRadius:'14px', padding:'8px', border:'2px solid rgba(0,229,255,.2)' }}>
        <div style={{ display:'flex', gap:'4px', marginBottom:'4px' }}>
          {Array(7).fill(0).map((_,c)=>(
            <button key={c} onClick={()=>drop(c)} style={{width:'36px',height:'24px',borderRadius:'6px',background:'rgba(0,229,255,.1)',border:'1px solid rgba(0,229,255,.2)',cursor:'pointer',fontSize:'10px',color:'#00e5ff'}}>▼</button>
          ))}
        </div>
        {board.map((row,r)=>(
          <div key={r} style={{ display:'flex', gap:'4px', marginBottom:'4px' }}>
            {row.map((v,c)=>(
              <div key={c} style={{ width:'36px', height:'36px', borderRadius:'50%', background:v==='R'?'#ff4560':v==='Y'?'#ffd700':'rgba(255,255,255,.05)', border:'2px solid rgba(255,255,255,.08)', transition:'background .2s' }} />
            ))}
          </div>
        ))}
      </div>
      {winner && <button onClick={()=>{setBoard(Array(6).fill(null).map(()=>Array(7).fill(null)));setWinner(null);setTurn('R')}} style={{padding:'10px 24px',background:'linear-gradient(135deg,#ff4560,#ffd700)',border:'none',borderRadius:'12px',fontSize:'14px',fontWeight:'800',color:'#fff',cursor:'pointer'}}>🔄 Again</button>}
    </div>
  )
}

// ═══════════════════════════════════════════════════════
// MEMORY MATCH
// ═══════════════════════════════════════════════════════
function MemoryMatch({ onScore }) {
  const EMOJIS = ['🐶','🐱','🐭','🐹','🦊','🐻','🐼','🐨','🦁','🐯','🦝','🐸']
  const shuffle = () => [...EMOJIS,...EMOJIS].sort(()=>Math.random()-.5).map((e,i)=>({id:i,emoji:e,flipped:false,matched:false}))
  const [cards, setCards] = useState(shuffle)
  const [flipped, setFlipped] = useState([])
  const [moves, setMoves] = useState(0)
  const [won, setWon] = useState(false)

  const flip = (id) => {
    if(flipped.length===2) return
    const c=cards.find(c=>c.id===id)
    if(c.flipped||c.matched) return
    const nf=[...flipped,id]
    setCards(p=>p.map(c=>c.id===id?{...c,flipped:true}:c))
    setFlipped(nf)
    if(nf.length===2){
      setMoves(p=>p+1)
      const [a,b]=nf.map(id=>cards.find(c=>c.id===id))
      if(a.emoji===b.emoji){
        setCards(p=>p.map(c=>nf.includes(c.id)?{...c,matched:true}:c))
        setFlipped([])
        if(cards.filter(c=>c.matched).length+2===cards.length) setWon(true)
      } else setTimeout(()=>{setCards(p=>p.map(c=>nf.includes(c.id)?{...c,flipped:false}:c));setFlipped([])},900)
    }
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'12px' }}>
      <div style={{ fontSize:'14px', fontWeight:'700', color:'#eef2f7' }}>Moves: {moves} {won&&'🎉 Done!'}</div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(6,1fr)', gap:'6px' }}>
        {cards.map(c=>(
          <button key={c.id} onClick={()=>flip(c.id)}
            style={{ width:'46px', height:'46px', borderRadius:'10px', border:`2px solid ${c.matched?'rgba(0,255,136,.4)':c.flipped?'rgba(0,229,255,.4)':'rgba(255,255,255,.1)'}`, background:c.matched?'rgba(0,255,136,.1)':c.flipped?'rgba(0,229,255,.1)':'rgba(255,255,255,.05)', fontSize:'22px', cursor:'pointer', transition:'all .2s' }}>
            {(c.flipped||c.matched)?c.emoji:'❓'}
          </button>
        ))}
      </div>
      {won&&<button onClick={()=>{setCards(shuffle());setFlipped([]);setMoves(0);setWon(false)}} style={{padding:'10px 24px',background:'linear-gradient(135deg,#00ff88,#00e5ff)',border:'none',borderRadius:'12px',fontSize:'14px',fontWeight:'800',color:'#070a12',cursor:'pointer'}}>🔄 Again</button>}
    </div>
  )
}

// ═══════════════════════════════════════════════════════
// HANGMAN
// ═══════════════════════════════════════════════════════
function HangmanGame() {
  const WORDS = ['JAVASCRIPT','REACT','PYTHON','CODING','COMPUTER','INTERNET','MOBILE','ANDROID','GALAXY','KEYBOARD','MONITOR','NETWORK']
  const [word] = useState(()=>WORDS[Math.floor(Math.random()*WORDS.length)])
  const [guessed, setGuessed] = useState(new Set())
  const wrong = [...guessed].filter(l=>!word.includes(l)).length
  const won = word.split('').every(l=>guessed.has(l))
  const lost = wrong >= 6

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'14px' }}>
      <div style={{ fontSize:'36px', textAlign:'center', letterSpacing:'4px', fontWeight:'900' }}>
        {lost ? '💀' : ['🙂','😮','😰','😱','🥵','😵'][wrong]}
      </div>
      <div style={{ fontSize:'11px', color:'#ff4560', fontWeight:'700' }}>Wrong: {wrong}/6</div>
      <div style={{ display:'flex', gap:'8px', flexWrap:'wrap', justifyContent:'center' }}>
        {word.split('').map((l,i)=>(
          <div key={i} style={{ width:'32px', height:'40px', borderBottom:'3px solid #00e5ff', display:'flex', alignItems:'flex-end', justifyContent:'center', fontSize:'20px', fontWeight:'900', color:'#eef2f7', paddingBottom:'2px' }}>
            {guessed.has(l)?l:''}
          </div>
        ))}
      </div>
      {(won||lost)&&<div style={{fontSize:'16px',fontWeight:'900',color:won?'#00ff88':'#ff4560'}}>{won?'🎉 Correct!':'💀 '+word}</div>}
      <div style={{ display:'flex', gap:'4px', flexWrap:'wrap', justifyContent:'center', maxWidth:'300px' }}>
        {'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(l=>(
          <button key={l} onClick={()=>!guessed.has(l)&&setGuessed(p=>new Set([...p,l]))} disabled={guessed.has(l)||won||lost}
            style={{ width:'32px', height:'32px', borderRadius:'8px', border:`1px solid ${word.includes(l)&&guessed.has(l)?'rgba(0,255,136,.5)':guessed.has(l)?'rgba(255,69,96,.4)':'rgba(255,255,255,.15)'}`, background:word.includes(l)&&guessed.has(l)?'rgba(0,255,136,.15)':guessed.has(l)?'rgba(255,69,96,.1)':'rgba(255,255,255,.05)', color:guessed.has(l)?word.includes(l)?'#00ff88':'#ff4560':'#eef2f7', fontSize:'11px', fontWeight:'800', cursor:guessed.has(l)?'default':'pointer' }}>
            {l}
          </button>
        ))}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════
// QUIZ
// ═══════════════════════════════════════════════════════
function QuizGame({ onScore }) {
  const QS = [
    {q:'বাংলাদেশের রাজধানী কি?',a:['ঢাকা','চট্টগ্রাম','সিলেট','রাজশাহী'],correct:0},
    {q:'বাংলাদেশের স্বাধীনতা দিবস কবে?',a:['২৬ মার্চ','১৬ ডিসেম্বর','২১ ফেব্রুয়ারি','১৫ আগস্ট'],correct:0},
    {q:'পদ্মা নদী কোথায় পড়েছে?',a:['বঙ্গোপসাগর','আরব সাগর','লালসাগর','কাস্পিয়ান সাগর'],correct:0},
    {q:'বাংলাদেশের জাতীয় ফুল কি?',a:['শাপলা','গোলাপ','কদম','হাসনাহেনা'],correct:0},
    {q:'সূর্য কোন দিকে উদয় হয়?',a:['পূর্ব','পশ্চিম','উত্তর','দক্ষিণ'],correct:0},
    {q:'পৃথিবীর সবচেয়ে বড় মহাসাগর কোনটি?',a:['প্রশান্ত মহাসাগর','আটলান্টিক','ভারত মহাসাগর','আর্কটিক'],correct:0},
    {q:'১ কিলোমিটার = কত মিটার?',a:['১০০০','১০০','১০০০০','৫০০'],correct:0},
    {q:'মানবদেহে হাড়ের সংখ্যা কত?',a:['২০৬','২০০','২১০','১৮০'],correct:0},
  ]
  const [qi, setQi] = useState(0)
  const [score, setScore] = useState(0)
  const [ans, setAns] = useState(null)
  const [done, setDone] = useState(false)

  const answer = (i) => {
    if(ans!==null) return
    setAns(i)
    if(i===QS[qi].correct) setScore(p=>p+10)
    setTimeout(()=>{
      if(qi+1>=QS.length){setDone(true);onScore&&onScore(score+(i===QS[qi].correct?10:0))}
      else{setQi(p=>p+1);setAns(null)}
    },1200)
  }

  if(done) return (
    <div style={{textAlign:'center',padding:'20px'}}>
      <div style={{fontSize:'48px',marginBottom:'8px'}}>🏆</div>
      <div style={{fontSize:'22px',fontWeight:'900',color:'#ffd700',marginBottom:'4px'}}>Score: {score}/{QS.length*10}</div>
      <button onClick={()=>{setQi(0);setScore(0);setAns(null);setDone(false)}} style={{padding:'12px 24px',background:'linear-gradient(135deg,#ffd700,#ffa500)',border:'none',borderRadius:'12px',fontSize:'14px',fontWeight:'800',color:'#070a12',cursor:'pointer',marginTop:'12px'}}>🔄 Again</button>
    </div>
  )

  const q=QS[qi]
  return (
    <div style={{display:'flex',flexDirection:'column',gap:'14px'}}>
      <div style={{fontSize:'11px',color:'#4a5568',fontWeight:'700'}}>{qi+1}/{QS.length} · Score: {score}</div>
      <div style={{background:'rgba(255,255,255,.05)',borderRadius:'14px',padding:'16px',fontSize:'15px',fontWeight:'700',color:'#eef2f7',lineHeight:'1.5'}}>{q.q}</div>
      {q.a.map((a,i)=>(
        <button key={i} onClick={()=>answer(i)}
          style={{padding:'14px',borderRadius:'12px',border:`2px solid ${ans===null?'rgba(255,255,255,.1)':i===q.correct?'rgba(0,255,136,.6)':ans===i?'rgba(255,69,96,.6)':'rgba(255,255,255,.1)'}`,
          background:ans===null?'rgba(255,255,255,.05)':i===q.correct?'rgba(0,255,136,.15)':ans===i?'rgba(255,69,96,.15)':'rgba(255,255,255,.03)',
          color:ans!==null&&i===q.correct?'#00ff88':ans===i?'#ff4560':'#eef2f7',fontSize:'13px',fontWeight:'700',cursor:'pointer',textAlign:'left',transition:'all .2s'}}>
          {['🅐','🅑','🅒','🅓'][i]} {a}
        </button>
      ))}
    </div>
  )
}

// ═══════════════════════════════════════════════════════
// NUMBER GUESS
// ═══════════════════════════════════════════════════════
function NumberGuess() {
  const [target] = useState(()=>Math.floor(Math.random()*100)+1)
  const [input, setInput] = useState('')
  const [history, setHistory] = useState([])
  const [won, setWon] = useState(false)

  const guess = () => {
    const n=parseInt(input); if(isNaN(n)||n<1||n>100) return
    const hint = n<target?'📈 বড়':n>target?'📉 ছোট':'🎉 সঠিক!'
    setHistory(p=>[{n,hint},...p])
    if(n===target) setWon(true)
    setInput('')
  }

  return (
    <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>
      <div style={{fontSize:'14px',color:'#eef2f7',fontWeight:'700'}}>১ থেকে ১০০ এর মধ্যে একটি সংখ্যা ভাবছি 🤔</div>
      <div style={{display:'flex',gap:'8px'}}>
        <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&guess()} type='number' min='1' max='100' placeholder='অনুমান করো...' disabled={won}
          style={{flex:1,background:'rgba(255,255,255,.06)',border:'1px solid rgba(255,255,255,.1)',borderRadius:'12px',padding:'12px',color:'#eef2f7',fontSize:'15px',outline:'none'}} />
        <button onClick={guess} disabled={won} style={{padding:'12px 20px',background:'linear-gradient(135deg,#00e5ff,#00ff88)',border:'none',borderRadius:'12px',fontSize:'14px',fontWeight:'800',color:'#070a12',cursor:'pointer'}}>Go</button>
      </div>
      <div style={{display:'flex',flexDirection:'column',gap:'6px',maxHeight:'200px',overflowY:'auto'}}>
        {history.map((h,i)=>(
          <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'8px 12px',background:'rgba(255,255,255,.04)',borderRadius:'10px',fontSize:'13px'}}>
            <span style={{fontWeight:'700',color:'#00e5ff'}}>{h.n}</span>
            <span style={{color:h.hint.includes('🎉')?'#00ff88':'#ffa500'}}>{h.hint}</span>
          </div>
        ))}
      </div>
      {won&&<div style={{textAlign:'center'}}><div style={{fontSize:'20px',fontWeight:'900',color:'#00ff88',marginBottom:'8px'}}>🎉 {history.length}তম চেষ্টায়!</div></div>}
    </div>
  )
}

// ═══════════════════════════════════════════════════════
// ROCK PAPER SCISSORS
// ═══════════════════════════════════════════════════════
function RockPaper() {
  const [score, setScore] = useState({w:0,l:0,d:0})
  const [result, setResult] = useState(null)
  const CHOICES = ['✊','✋','✌️']
  const NAMES = ['Rock','Paper','Scissors']

  const play = (i) => {
    const ai = Math.floor(Math.random()*3)
    let r
    if(i===ai) r='draw'
    else if((i===0&&ai===2)||(i===1&&ai===0)||(i===2&&ai===1)) r='win'
    else r='lose'
    setResult({player:CHOICES[i],ai:CHOICES[ai],r})
    setScore(p=>({...p,[r==='win'?'w':r==='lose'?'l':'d']:p[r==='win'?'w':r==='lose'?'l':'d']+1}))
  }

  return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'16px'}}>
      <div style={{display:'flex',gap:'20px',fontSize:'12px',fontWeight:'800'}}>
        <span style={{color:'#00ff88'}}>Win: {score.w}</span>
        <span style={{color:'#ff4560'}}>Lose: {score.l}</span>
        <span style={{color:'#4a5568'}}>Draw: {score.d}</span>
      </div>
      {result && (
        <div style={{textAlign:'center',background:'rgba(255,255,255,.05)',borderRadius:'16px',padding:'16px 24px'}}>
          <div style={{display:'flex',gap:'20px',justifyContent:'center',fontSize:'48px',marginBottom:'8px'}}>
            <span>{result.player}</span><span style={{fontSize:'24px',alignSelf:'center',color:'#4a5568'}}>vs</span><span>{result.ai}</span>
          </div>
          <div style={{fontSize:'16px',fontWeight:'900',color:result.r==='win'?'#00ff88':result.r==='lose'?'#ff4560':'#ffd700'}}>
            {result.r==='win'?'🎉 জিতেছ!':result.r==='lose'?'💀 হেরেছ!':'🤝 Draw!'}
          </div>
        </div>
      )}
      <div style={{fontSize:'13px',color:'#4a5568'}}>বেছে নাও:</div>
      <div style={{display:'flex',gap:'12px'}}>
        {CHOICES.map((c,i)=>(
          <button key={i} onClick={()=>play(i)}
            style={{width:'80px',height:'80px',borderRadius:'50%',border:'2px solid rgba(255,255,255,.15)',background:'rgba(255,255,255,.06)',fontSize:'36px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',transition:'all .15s'}}
            onMouseEnter={e=>e.target.style.transform='scale(1.1)'}
            onMouseLeave={e=>e.target.style.transform='scale(1)'}>
            {c}
          </button>
        ))}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════
// REACTION TIME
// ═══════════════════════════════════════════════════════
function ReactionTime({ onScore }) {
  const [state, setState] = useState('wait') // wait, ready, go, result
  const [time, setTime] = useState(null)
  const [best, setBest] = useState(null)
  const timerRef = useRef(null)
  const startRef = useRef(null)

  const start = () => {
    if(state==='go'){
      const t=Date.now()-startRef.current; setTime(t)
      if(!best||t<best){setBest(t);onScore&&onScore(Math.max(0,1000-t))}
      setState('result'); return
    }
    setState('ready')
    clearTimeout(timerRef.current)
    timerRef.current=setTimeout(()=>{startRef.current=Date.now();setState('go')},1000+Math.random()*3000)
  }

  const BG = {wait:'rgba(0,229,255,.08)',ready:'rgba(255,165,0,.08)',go:'rgba(0,255,136,.2)',result:'rgba(255,255,255,.05)'}
  const MSG = {wait:'👆 ট্যাপ করো শুরু করতে',ready:'⏳ অপেক্ষা করো...',go:'🟢 এখনই ট্যাপ করো!',result:`⚡ ${time}ms`}

  return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'16px'}}>
      {best && <div style={{fontSize:'12px',color:'#ffd700',fontWeight:'800'}}>🏆 Best: {best}ms</div>}
      <div onClick={start}
        style={{width:'240px',height:'240px',borderRadius:'50%',background:BG[state],border:`3px solid ${state==='go'?'#00ff88':state==='ready'?'#ffa500':'rgba(0,229,255,.3)'}`,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',transition:'all .2s',textAlign:'center',padding:'20px'}}>
        <div>
          <div style={{fontSize:state==='go'?'48px':'28px',marginBottom:'8px'}}>{state==='go'?'🟢':state==='ready'?'🟡':'👆'}</div>
          <div style={{fontSize:'14px',fontWeight:'800',color:state==='go'?'#00ff88':state==='ready'?'#ffa500':'#eef2f7',lineHeight:'1.4'}}>{MSG[state]}</div>
        </div>
      </div>
      {state==='result'&&<div style={{fontSize:'22px',fontWeight:'900',color:time<250?'#00ff88':time<400?'#ffd700':'#ff4560'}}>{time<250?'🚀 번쩍!':time<400?'⚡ দ্রুত!':'🐢 আরো চেষ্টা করো'}</div>}
    </div>
  )
}

// ═══════════════════════════════════════════════════════
// MATH QUIZ
// ═══════════════════════════════════════════════════════
function MathQuiz({ onScore }) {
  const gen = () => {
    const ops = ['+','-','×']; const op=ops[Math.floor(Math.random()*ops.length)]
    const a=Math.floor(Math.random()*20)+1, b=Math.floor(Math.random()*20)+1
    const ans=op==='+'?a+b:op==='-'?a-b:a*b
    const wrong=[ans+Math.floor(Math.random()*5)+1,ans-Math.floor(Math.random()*5)-1,ans+Math.floor(Math.random()*10)+5]
    const opts=[...new Set([ans,...wrong])].slice(0,4).sort(()=>Math.random()-.5)
    return {q:`${a} ${op} ${b} = ?`,ans,opts}
  }
  const [q, setQ] = useState(gen)
  const [score, setScore] = useState(0)
  const [selected, setSelected] = useState(null)
  const [streak, setStreak] = useState(0)

  const answer = (v) => {
    if(selected!==null) return
    setSelected(v)
    if(v===q.ans){setScore(p=>p+10);setStreak(p=>p+1);onScore&&onScore(score+10)}
    else setStreak(0)
    setTimeout(()=>{setQ(gen());setSelected(null)},1000)
  }

  return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'16px'}}>
      <div style={{display:'flex',gap:'16px',fontSize:'12px',fontWeight:'800'}}>
        <span style={{color:'#00e5ff'}}>Score: {score}</span>
        <span style={{color:'#ffd700'}}>🔥 Streak: {streak}</span>
      </div>
      <div style={{background:'rgba(255,255,255,.06)',borderRadius:'20px',padding:'24px 32px',fontSize:'28px',fontWeight:'900',color:'#eef2f7',textAlign:'center'}}>{q.q}</div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px',width:'100%',maxWidth:'280px'}}>
        {q.opts.map((v,i)=>(
          <button key={i} onClick={()=>answer(v)}
            style={{padding:'16px',borderRadius:'14px',border:`2px solid ${selected===null?'rgba(255,255,255,.1)':v===q.ans?'rgba(0,255,136,.6)':selected===v?'rgba(255,69,96,.6)':'rgba(255,255,255,.1)'}`,
            background:selected===null?'rgba(255,255,255,.05)':v===q.ans?'rgba(0,255,136,.15)':selected===v?'rgba(255,69,96,.15)':'rgba(255,255,255,.03)',
            fontSize:'20px',fontWeight:'900',color:selected!==null&&v===q.ans?'#00ff88':selected===v?'#ff4560':'#eef2f7',cursor:'pointer',transition:'all .2s'}}>
            {v}
          </button>
        ))}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════
// SUDOKU
// ═══════════════════════════════════════════════════════
function SudokuGame() {
  const PUZZLE = [
    [5,3,0,0,7,0,0,0,0],[6,0,0,1,9,5,0,0,0],[0,9,8,0,0,0,0,6,0],
    [8,0,0,0,6,0,0,0,3],[4,0,0,8,0,3,0,0,1],[7,0,0,0,2,0,0,0,6],
    [0,6,0,0,0,0,2,8,0],[0,0,0,4,1,9,0,0,5],[0,0,0,0,8,0,0,7,9]
  ]
  const SOLUTION = [
    [5,3,4,6,7,8,9,1,2],[6,7,2,1,9,5,3,4,8],[1,9,8,3,4,2,5,6,7],
    [8,5,9,7,6,1,4,2,3],[4,2,6,8,5,3,7,9,1],[7,1,3,9,2,4,8,5,6],
    [9,6,1,5,3,7,2,8,4],[2,8,7,4,1,9,6,3,5],[3,4,5,2,8,6,1,7,9]
  ]
  const [board, setBoard] = useState(PUZZLE.map(r=>[...r]))
  const [sel, setSel] = useState(null)
  const [errors, setErrors] = useState(new Set())

  const setCell = (n) => {
    if(!sel) return
    const [r,c]=sel
    if(PUZZLE[r][c]!==0) return
    const nb=board.map(row=>[...row]); nb[r][c]=n; setBoard(nb)
    if(n!==0&&n!==SOLUTION[r][c]) setErrors(p=>new Set([...p,`${r},${c}`]))
    else setErrors(p=>{const s=new Set(p);s.delete(`${r},${c}`);return s})
  }

  return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'12px'}}>
      <div style={{fontSize:'11px',color:'#ff4560',fontWeight:'700'}}>Errors: {errors.size}</div>
      <div style={{background:'#0c1018',borderRadius:'14px',padding:'6px',border:'2px solid rgba(0,229,255,.2)'}}>
        {board.map((row,r)=>(
          <div key={r} style={{display:'flex',borderBottom:r%3===2&&r!==8?'2px solid rgba(0,229,255,.3)':'1px solid rgba(255,255,255,.05)'}}>
            {row.map((v,c)=>(
              <button key={c} onClick={()=>setSel([r,c])}
                style={{width:'32px',height:'32px',borderRight:c%3===2&&c!==8?'2px solid rgba(0,229,255,.3)':'1px solid rgba(255,255,255,.05)',
                background:sel&&sel[0]===r&&sel[1]===c?'rgba(0,229,255,.2)':errors.has(`${r},${c}`)?'rgba(255,69,96,.15)':PUZZLE[r][c]!==0?'rgba(255,255,255,.04)':'transparent',
                color:PUZZLE[r][c]!==0?'#8892a4':errors.has(`${r},${c}`)?'#ff4560':'#00e5ff',
                fontSize:'14px',fontWeight:PUZZLE[r][c]!==0?'900':'700',cursor:'pointer',border:'none'}}>
                {v||''}
              </button>
            ))}
          </div>
        ))}
      </div>
      <div style={{display:'flex',gap:'6px',flexWrap:'wrap',justifyContent:'center'}}>
        {[1,2,3,4,5,6,7,8,9,0].map(n=>(
          <button key={n} onClick={()=>setCell(n)}
            style={{width:'34px',height:'34px',borderRadius:'8px',border:'1px solid rgba(255,255,255,.15)',background:'rgba(255,255,255,.06)',color:'#eef2f7',fontSize:'14px',fontWeight:'800',cursor:'pointer'}}>
            {n===0?'✕':n}
          </button>
        ))}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════
// WORD GUESS (Wordle-like)
// ═══════════════════════════════════════════════════════
function WordGuess() {
  const WORDS = ['REACT','CLOUD','PHONE','MONEY','WATER','EARTH','LIGHT','MUSIC','DANCE','HAPPY','MAGIC','PIXEL']
  const [target] = useState(()=>WORDS[Math.floor(Math.random()*WORDS.length)])
  const [guesses, setGuesses] = useState([])
  const [current, setCurrent] = useState('')
  const [won, setWon] = useState(false)
  const [lost, setLost] = useState(false)

  const submit = () => {
    if(current.length!==5) return
    const w=current.toUpperCase()
    const result=w.split('').map((l,i)=>({l,s:l===target[i]?'correct':target.includes(l)?'present':'absent'}))
    setGuesses(p=>[...p,result])
    if(w===target) setWon(true)
    else if(guesses.length+1>=6) setLost(true)
    setCurrent('')
  }

  const COLORS = {correct:'#00ff88',present:'#ffd700',absent:'rgba(255,255,255,.1)'}

  return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'12px'}}>
      <div style={{fontSize:'11px',color:'#4a5568'}}>5-letter word গেস করো ({6-guesses.length} চেষ্টা বাকি)</div>
      <div style={{display:'flex',flexDirection:'column',gap:'4px'}}>
        {[...guesses,...Array(Math.max(0,6-guesses.length)).fill(null)].map((g,i)=>(
          <div key={i} style={{display:'flex',gap:'4px'}}>
            {Array(5).fill(0).map((_,j)=>(
              <div key={j} style={{width:'46px',height:'46px',borderRadius:'10px',border:`2px solid ${g?COLORS[g[j].s]:'rgba(255,255,255,.1)'}`,background:g?`${COLORS[g[j].s]}22`:'rgba(255,255,255,.03)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'20px',fontWeight:'900',color:g?COLORS[g[j].s]:'#eef2f7'}}>
                {g?g[j].l:i===guesses.length&&j<current.length?current[j]:''}
              </div>
            ))}
          </div>
        ))}
      </div>
      {!won&&!lost&&(
        <>
          <input value={current} onChange={e=>setCurrent(e.target.value.toUpperCase().slice(0,5))} onKeyDown={e=>e.key==='Enter'&&submit()} placeholder='WORD' maxLength={5}
            style={{width:'160px',background:'rgba(255,255,255,.06)',border:'1px solid rgba(255,255,255,.15)',borderRadius:'12px',padding:'10px',color:'#eef2f7',fontSize:'18px',fontWeight:'900',outline:'none',textAlign:'center',letterSpacing:'4px'}} />
          <button onClick={submit} style={{padding:'10px 24px',background:'linear-gradient(135deg,#00e5ff,#00ff88)',border:'none',borderRadius:'12px',fontSize:'14px',fontWeight:'800',color:'#070a12',cursor:'pointer'}}>Submit</button>
        </>
      )}
      {(won||lost)&&<div style={{textAlign:'center'}}><div style={{fontSize:'18px',fontWeight:'900',color:won?'#00ff88':'#ff4560',marginBottom:'4px'}}>{won?'🎉 Correct!':'💀 '+target}</div></div>}
    </div>
  )
}

// ═══════════════════════════════════════════════════════
// BLACKJACK
// ═══════════════════════════════════════════════════════
function Blackjack() {
  const deck = () => {
    const s=['♠','♥','♦','♣'],v=['A','2','3','4','5','6','7','8','9','10','J','Q','K']
    return s.flatMap(s=>v.map(v=>({s,v}))).sort(()=>Math.random()-.5)
  }
  const val = (hand) => {
    let t=0,aces=0
    hand.forEach(c=>{
      if(['J','Q','K'].includes(c.v)) t+=10
      else if(c.v==='A'){t+=11;aces++}
      else t+=parseInt(c.v)
    })
    while(t>21&&aces>0){t-=10;aces--}
    return t
  }
  const [d, setD] = useState(deck)
  const [player, setPlayer] = useState([])
  const [dealer, setDealer] = useState([])
  const [phase, setPhase] = useState('bet') // bet,play,done
  const [msg, setMsg] = useState('')

  const deal = () => {
    const nd=[...d]; const p=[nd.pop(),nd.pop()]; const de=[nd.pop(),nd.pop()]
    setD(nd); setPlayer(p); setDealer(de); setPhase('play'); setMsg('')
  }
  const hit = () => {
    const nd=[...d]; const np=[...player,nd.pop()]; setD(nd); setPlayer(np)
    if(val(np)>21){setMsg('💀 Bust! হেরেছ');setPhase('done')}
  }
  const stand = () => {
    let de=[...dealer], nd=[...d]
    while(val(de)<17){de.push(nd.pop())}
    setD(nd); setDealer(de); setPhase('done')
    const pv=val(player),dv=val(de)
    if(dv>21||pv>dv) setMsg('🎉 জিতেছ!')
    else if(pv===dv) setMsg('🤝 Draw!')
    else setMsg('💀 Dealer জিতেছে')
  }

  const Card = ({c,hide})=>(
    <div style={{width:'44px',height:'64px',borderRadius:'8px',background:hide?'rgba(0,229,255,.1)':'rgba(255,255,255,.95)',border:`1px solid ${hide?'rgba(0,229,255,.3)':'rgba(0,0,0,.1)'}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:hide?'20px':'16px',fontWeight:'900',color:hide?'#00e5ff':['♥','♦'].includes(c?.s)?'#ff4560':'#0c1018'}}>
      {hide?'🂠':`${c?.v}${c?.s}`}
    </div>
  )

  return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'14px'}}>
      {phase!=='bet'&&(<>
        <div style={{textAlign:'center'}}>
          <div style={{fontSize:'11px',color:'#4a5568',marginBottom:'6px'}}>Dealer {phase==='done'?`(${val(dealer)})`:''}</div>
          <div style={{display:'flex',gap:'6px',justifyContent:'center'}}>
            {dealer.map((c,i)=><Card key={i} c={c} hide={phase==='play'&&i===1} />)}
          </div>
        </div>
        <div style={{textAlign:'center'}}>
          <div style={{fontSize:'11px',color:'#4a5568',marginBottom:'6px'}}>You ({val(player)})</div>
          <div style={{display:'flex',gap:'6px',justifyContent:'center'}}>
            {player.map((c,i)=><Card key={i} c={c} />)}
          </div>
        </div>
      </>)}
      {msg&&<div style={{fontSize:'18px',fontWeight:'900',color:msg.includes('🎉')?'#00ff88':msg.includes('🤝')?'#ffd700':'#ff4560'}}>{msg}</div>}
      <div style={{display:'flex',gap:'10px',flexWrap:'wrap',justifyContent:'center'}}>
        {phase==='bet'&&<button onClick={deal} style={{padding:'14px 28px',background:'linear-gradient(135deg,#ffd700,#ffa500)',border:'none',borderRadius:'14px',fontSize:'15px',fontWeight:'800',color:'#070a12',cursor:'pointer'}}>🃏 Deal</button>}
        {phase==='play'&&<>
          <button onClick={hit} style={{padding:'12px 24px',background:'linear-gradient(135deg,#00e5ff,#00ff88)',border:'none',borderRadius:'12px',fontSize:'14px',fontWeight:'800',color:'#070a12',cursor:'pointer'}}>👆 Hit</button>
          <button onClick={stand} style={{padding:'12px 24px',background:'linear-gradient(135deg,#ff4560,#ffa500)',border:'none',borderRadius:'12px',fontSize:'14px',fontWeight:'800',color:'#fff',cursor:'pointer'}}>✋ Stand</button>
        </>}
        {phase==='done'&&<button onClick={()=>{setD(deck());setPlayer([]);setDealer([]);setPhase('bet');setMsg('')}} style={{padding:'12px 24px',background:'linear-gradient(135deg,#a78bfa,#00e5ff)',border:'none',borderRadius:'12px',fontSize:'14px',fontWeight:'800',color:'#fff',cursor:'pointer'}}>🔄 Again</button>}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════
// FLAPPY BIRD
// ═══════════════════════════════════════════════════════
function FlappyBird({ onScore }) {
  const canvasRef = useRef(null)
  const state = useRef({ bird:{y:150,vy:0}, pipes:[], score:0, alive:false, started:false, loop:null })
  const [score, setScore] = useState(0)
  const [started, setStarted] = useState(false)
  const [alive, setAlive] = useState(true)
  const W=280,H=400,GAP=110,PIPE_W=40

  const tap = useCallback(() => {
    const s=state.current
    if(!s.started){s.started=true;s.alive=true;setStarted(true);setAlive(true)}
    if(s.alive) s.bird.vy=-6
    else{
      s.bird={y:150,vy:0};s.pipes=[];s.score=0;s.alive=true;s.started=true
      setScore(0);setAlive(true);setStarted(true)
    }
  },[])

  useEffect(()=>{
    const c=canvasRef.current; const ctx=c.getContext('2d')
    const draw=()=>{
      const s=state.current
      ctx.fillStyle='#0c1018';ctx.fillRect(0,0,W,H)
      // bird
      ctx.fillStyle=s.alive?'#ffd700':'#ff4560'
      ctx.beginPath();ctx.arc(70,s.bird.y,14,0,Math.PI*2);ctx.fill()
      ctx.fillStyle='#070a12';ctx.font='16px sans-serif';ctx.fillText('🐦',58,s.bird.y+6)
      // pipes
      s.pipes.forEach(p=>{
        ctx.fillStyle='rgba(0,255,136,.7)';ctx.fillRect(p.x,0,PIPE_W,p.top)
        ctx.fillRect(p.x,p.top+GAP,PIPE_W,H-p.top-GAP)
      })
      // score
      ctx.fillStyle='#eef2f7';ctx.font='bold 20px sans-serif';ctx.fillText(s.score,W/2-10,30)
      if(!s.started){ctx.fillStyle='rgba(255,255,255,.7)';ctx.font='bold 16px sans-serif';ctx.fillText('Tap to start',W/2-50,H/2)}
    }
    const step=()=>{
      const s=state.current; if(!s.alive||!s.started){draw();return}
      s.bird.vy+=0.4;s.bird.y+=s.bird.vy
      if(s.bird.y>H-14||s.bird.y<14){s.alive=false;setAlive(false);onScore&&onScore(s.score);draw();return}
      if(!s.pipes.length||s.pipes[s.pipes.length-1].x<W-160){
        s.pipes.push({x:W,top:Math.floor(Math.random()*(H-GAP-80))+40,scored:false})
      }
      s.pipes=s.pipes.filter(p=>{
        p.x-=3
        if(!p.scored&&p.x+PIPE_W<70){p.scored=true;s.score++;setScore(s.score)}
        if(p.x<60&&p.x+PIPE_W>56&&(s.bird.y<p.top+8||s.bird.y>p.top+GAP-8)){s.alive=false;setAlive(false);onScore&&onScore(s.score)}
        return p.x>-PIPE_W
      })
      draw()
    }
    state.current.loop=setInterval(step,20)
    draw()
    return()=>clearInterval(state.current.loop)
  },[onScore])

  return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'12px'}}>
      <div style={{fontSize:'18px',fontWeight:'900',color:'#ffd700'}}>Score: {score}</div>
      <canvas ref={canvasRef} width={W} height={H} onClick={tap} style={{borderRadius:'14px',border:'2px solid rgba(255,215,0,.3)',cursor:'pointer'}} />
      {!alive&&started&&<div style={{fontSize:'14px',color:'#ff4560',fontWeight:'800'}}>Tap কানভাসে restart করতে</div>}
      {!started&&<div style={{fontSize:'12px',color:'#4a5568'}}>Canvas এ tap করে শুরু করো</div>}
    </div>
  )
}

// ═══════════════════════════════════════════════════════
// MINESWEEPER
// ═══════════════════════════════════════════════════════
function Minesweeper() {
  const ROWS=9,COLS=9,MINES=10
  const init=()=>{
    const b=Array(ROWS).fill(null).map(()=>Array(COLS).fill({mine:false,rev:false,flag:false,adj:0}))
    let placed=0
    while(placed<MINES){const r=Math.floor(Math.random()*ROWS),c=Math.floor(Math.random()*COLS);if(!b[r][c].mine){b[r][c]={...b[r][c],mine:true};placed++}}
    for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){
      if(b[r][c].mine)continue
      let adj=0
      for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++){const nr=r+dr,nc=c+dc;if(nr>=0&&nr<ROWS&&nc>=0&&nc<COLS&&b[nr][nc].mine)adj++}
      b[r][c]={...b[r][c],adj}
    }
    return b.map(row=>row.map(c=>({...c})))
  }
  const [board,setBoard]=useState(init)
  const [status,setStatus]=useState('play')
  const [flags,setFlags]=useState(0)

  const reveal=(r,c,b=board)=>{
    if(b[r][c].rev||b[r][c].flag)return b
    const nb=b.map(row=>row.map(c=>({...c})))
    const stack=[[r,c]]
    while(stack.length){
      const[cr,cc]=stack.pop()
      if(nb[cr][cc].rev||nb[cr][cc].flag)continue
      nb[cr][cc]={...nb[cr][cc],rev:true}
      if(nb[cr][cc].adj===0&&!nb[cr][cc].mine)
        for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++){const nr=cr+dr,nc=cc+dc;if(nr>=0&&nr<ROWS&&nc>=0&&nc<COLS&&!nb[nr][nc].rev)stack.push([nr,nc])}
    }
    return nb
  }

  const click=(r,c)=>{
    if(status!=='play'||board[r][c].flag||board[r][c].rev)return
    if(board[r][c].mine){const nb=board.map(row=>row.map(c=>({...c,rev:c.mine?true:c.rev})));setBoard(nb);setStatus('lost');return}
    const nb=reveal(r,c)
    setBoard(nb)
    if(nb.flat().filter(c=>!c.mine&&!c.rev).length===0)setStatus('won')
  }
  const flag=(e,r,c)=>{
    e.preventDefault()
    if(status!=='play'||board[r][c].rev)return
    const nb=board.map(row=>row.map(c=>({...c})))
    nb[r][c].flag=!nb[r][c].flag
    setFlags(p=>nb[r][c].flag?p+1:p-1)
    setBoard(nb)
  }
  const ADJ_COLORS=['','#00e5ff','#00ff88','#ff4560','#a78bfa','#ffa500','#f472b6','#ffd700','#ff8c69']

  return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'10px'}}>
      <div style={{display:'flex',gap:'16px',fontSize:'12px',fontWeight:'800'}}>
        <span style={{color:'#ff4560'}}>💣 {MINES-flags}</span>
        <span style={{color:status==='won'?'#00ff88':status==='lost'?'#ff4560':'#eef2f7'}}>{status==='won'?'🎉 Won!':status==='lost'?'💀 Lost!':'🎮 Playing'}</span>
      </div>
      <div style={{background:'#0c1018',padding:'4px',borderRadius:'10px',border:'1px solid rgba(255,255,255,.1)'}}>
        {board.map((row,r)=>(
          <div key={r} style={{display:'flex'}}>
            {row.map((c,col)=>(
              <button key={col} onClick={()=>click(r,col)} onContextMenu={e=>flag(e,r,col)}
                style={{width:'28px',height:'28px',border:'1px solid rgba(255,255,255,.06)',background:c.rev?'rgba(255,255,255,.04)':'rgba(255,255,255,.08)',fontSize:'12px',fontWeight:'900',cursor:'pointer',color:ADJ_COLORS[c.adj]||'#eef2f7',padding:0}}>
                {c.rev?(c.mine?'💣':c.adj||''):c.flag?'🚩':''}
              </button>
            ))}
          </div>
        ))}
      </div>
      {status!=='play'&&<button onClick={()=>{setBoard(init());setStatus('play');setFlags(0)}} style={{padding:'10px 24px',background:'linear-gradient(135deg,#00e5ff,#a78bfa)',border:'none',borderRadius:'12px',fontSize:'14px',fontWeight:'800',color:'#fff',cursor:'pointer'}}>🔄 Again</button>}
      <div style={{fontSize:'10px',color:'#4a5568'}}>Long press / right click = flag</div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════
// HIGHER LOWER
// ═══════════════════════════════════════════════════════
function HigherLower({onScore}) {
  const gen=()=>Math.floor(Math.random()*100)+1
  const [current,setCurrent]=useState(gen)
  const [next,setNext]=useState(gen)
  const [score,setScore]=useState(0)
  const [revealed,setRevealed]=useState(false)
  const [correct,setCorrect]=useState(null)

  const guess=(higher)=>{
    const isHigher=next>=current
    const right=higher===isHigher
    setRevealed(true);setCorrect(right)
    setTimeout(()=>{
      if(right){setScore(p=>p+1);setCurrent(next);setNext(gen());setRevealed(false);setCorrect(null);onScore&&onScore(score+1)}
      else{setCurrent(gen());setNext(gen());setScore(0);setRevealed(false);setCorrect(null)}
    },1200)
  }

  return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'16px'}}>
      <div style={{fontSize:'14px',fontWeight:'800',color:'#ffd700'}}>Score: {score}</div>
      <div style={{display:'flex',gap:'16px',alignItems:'center'}}>
        <div style={{width:'100px',height:'100px',borderRadius:'20px',background:'rgba(0,229,255,.1)',border:'2px solid rgba(0,229,255,.3)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'36px',fontWeight:'900',color:'#00e5ff'}}>{current}</div>
        <div style={{fontSize:'24px',color:'#4a5568'}}>vs</div>
        <div style={{width:'100px',height:'100px',borderRadius:'20px',background:correct===true?'rgba(0,255,136,.2)':correct===false?'rgba(255,69,96,.2)':'rgba(255,255,255,.06)',border:`2px solid ${correct===true?'rgba(0,255,136,.5)':correct===false?'rgba(255,69,96,.5)':'rgba(255,255,255,.1)'}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'36px',fontWeight:'900',color:'#eef2f7'}}>
          {revealed?next:'?'}
        </div>
      </div>
      <div style={{fontSize:'12px',color:'#4a5568'}}>পরের সংখ্যা কি বড় নাকি ছোট?</div>
      {!revealed&&(
        <div style={{display:'flex',gap:'12px'}}>
          <button onClick={()=>guess(true)} style={{padding:'14px 24px',background:'linear-gradient(135deg,#00ff88,#00e5ff)',border:'none',borderRadius:'14px',fontSize:'15px',fontWeight:'800',color:'#070a12',cursor:'pointer'}}>📈 Higher</button>
          <button onClick={()=>guess(false)} style={{padding:'14px 24px',background:'linear-gradient(135deg,#ff4560,#ffa500)',border:'none',borderRadius:'14px',fontSize:'15px',fontWeight:'800',color:'#fff',cursor:'pointer'}}>📉 Lower</button>
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════
// COLOR GUESS
// ═══════════════════════════════════════════════════════
function ColorGuess({onScore}) {
  const randColor=()=>`rgb(${Math.floor(Math.random()*256)},${Math.floor(Math.random()*256)},${Math.floor(Math.random()*256)})`
  const genRound=()=>{const target=randColor();const opts=[target,...Array(3).fill(0).map(randColor)].sort(()=>Math.random()-.5);return{target,opts}}
  const [round,setRound]=useState(genRound)
  const [score,setScore]=useState(0)
  const [sel,setSel]=useState(null)

  const guess=(c)=>{
    if(sel)return;setSel(c)
    if(c===round.target){setScore(p=>p+10);onScore&&onScore(score+10)}
    setTimeout(()=>{setRound(genRound());setSel(null)},1200)
  }

  return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'16px'}}>
      <div style={{fontSize:'14px',fontWeight:'800',color:'#eef2f7'}}>Score: {score}</div>
      <div style={{width:'160px',height:'160px',borderRadius:'20px',background:round.target,border:'3px solid rgba(255,255,255,.2)',boxShadow:`0 8px 32px ${round.target}66`}} />
      <div style={{fontSize:'12px',color:'#4a5568'}}>এই রঙটি বেছে নাও:</div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
        {round.opts.map((c,i)=>(
          <button key={i} onClick={()=>guess(c)}
            style={{width:'110px',height:'50px',borderRadius:'12px',background:c,border:`3px solid ${sel?c===round.target?'#00ff88':sel===c?'#ff4560':'rgba(255,255,255,.1)':'rgba(255,255,255,.2)'}`,cursor:'pointer',transition:'all .2s',transform:sel&&c===round.target?'scale(1.05)':'scale(1)'}} />
        ))}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════
// TYPING RACE
// ═══════════════════════════════════════════════════════
function TypingRace({onScore}) {
  const TEXTS=['The quick brown fox jumps over the lazy dog','React is a JavaScript library for building user interfaces','Echo World is the best social platform ever','Learning to code is one of the best skills you can have']
  const [text]=useState(()=>TEXTS[Math.floor(Math.random()*TEXTS.length)])
  const [typed,setTyped]=useState('')
  const [start,setStart]=useState(null)
  const [done,setDone]=useState(false)
  const [wpm,setWpm]=useState(0)

  const type=(v)=>{
    if(done)return
    if(!start)setStart(Date.now())
    setTyped(v)
    if(v===text){
      const mins=(Date.now()-start)/60000
      const w=Math.round(text.split(' ').length/mins)
      setWpm(w);setDone(true);onScore&&onScore(w)
    }
  }

  return (
    <div style={{display:'flex',flexDirection:'column',gap:'14px'}}>
      {done&&<div style={{fontSize:'20px',fontWeight:'900',color:'#00ff88',textAlign:'center'}}>🎉 {wpm} WPM!</div>}
      <div style={{background:'rgba(255,255,255,.05)',borderRadius:'14px',padding:'14px',fontSize:'15px',lineHeight:'1.8',fontFamily:'monospace'}}>
        {text.split('').map((c,i)=>(
          <span key={i} style={{color:i<typed.length?(typed[i]===c?'#00ff88':'#ff4560'):i===typed.length?'#eef2f7':'#4a5568',background:i===typed.length?'rgba(0,229,255,.2)':'transparent',borderRadius:'2px'}}>{c}</span>
        ))}
      </div>
      <textarea value={typed} onChange={e=>type(e.target.value)} disabled={done} placeholder='এখানে টাইপ করো...'
        style={{width:'100%',height:'80px',background:'rgba(255,255,255,.06)',border:'1px solid rgba(255,255,255,.1)',borderRadius:'12px',padding:'10px',color:'#eef2f7',fontSize:'14px',outline:'none',resize:'none',fontFamily:'monospace'}} />
      {done&&<button onClick={()=>{setTyped('');setStart(null);setDone(false)}} style={{padding:'10px 24px',background:'linear-gradient(135deg,#00e5ff,#00ff88)',border:'none',borderRadius:'12px',fontSize:'14px',fontWeight:'800',color:'#070a12',cursor:'pointer',margin:'0 auto'}}>🔄 Again</button>}
    </div>
  )
}

// ═══════════════════════════════════════════════════════
// GAME COMPONENT MAP
// ═══════════════════════════════════════════════════════
const GAME_COMPONENTS = {
  snake: SnakeGame, tetris: TetrisGame, '2048': Game2048, tictactoe: TicTacToe,
  connect4: ConnectFour, memory: MemoryMatch, hangman: HangmanGame, quiz: QuizGame,
  numberguess: NumberGuess, rockpaper: RockPaper, reactiontime: ReactionTime,
  mathquiz: MathQuiz, sudoku: SudokuGame, wordguess: WordGuess, blackjack: Blackjack,
  flappy: FlappyBird, minesweeper: Minesweeper, higher_lower: HigherLower,
  colorguess: ColorGuess, typingrace: TypingRace,
}

const GAME_INFO = {
  snake:'🐍 Snake',tetris:'🟦 Tetris','2048':'🔢 2048',tictactoe:'❌ Tic Tac Toe',
  connect4:'🔴 Connect Four',memory:'🃏 Memory Match',hangman:'🪢 Hangman',quiz:'🧠 বাংলা Quiz',
  numberguess:'🔮 Number Guess',rockpaper:'✊ Rock Paper',reactiontime:'⚡ Reaction Time',
  mathquiz:'➗ Math Quiz',sudoku:'🔢 Sudoku',wordguess:'🔤 Word Guess',blackjack:'🎰 Blackjack',
  flappy:'🐦 Flappy Bird',minesweeper:'💣 Minesweeper',higher_lower:'📈 Higher Lower',
  colorguess:'🌈 Color Guess',typingrace:'⌨️ Typing Race',
}

// ═══════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════
export default function GamePlay() {
  const [params, setParams] = useState({ game: '', mode: 'solo', id: '' })
  const [user, setUser] = useState(null)
  const [score, setScore] = useState(null)

  useEffect(() => {
    const p = new URLSearchParams(window.location.search)
    setParams({ game: p.get('game')||'', mode: p.get('mode')||'solo', id: p.get('id')||'' })
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setUser(data.session.user)
    })
  }, [])

  const GameComp = GAME_COMPONENTS[params.game]
  const title = GAME_INFO[params.game] || params.game

  return (
    <div style={{ minHeight:'100vh', background:'#070a12', color:'#eef2f7', fontFamily:'system-ui,sans-serif' }}>
      <style>{`*{box-sizing:border-box} ::-webkit-scrollbar{display:none}`}</style>

      {/* TOP BAR */}
      <div style={{ position:'sticky', top:0, zIndex:100, background:'rgba(7,10,18,.97)', backdropFilter:'blur(12px)', borderBottom:'1px solid rgba(255,255,255,.07)', height:'54px', display:'flex', alignItems:'center', padding:'0 16px', gap:'10px' }}>
        <button onClick={() => window.location.href='/games'} style={{ background:'none', border:'none', color:'#4a5568', fontSize:'20px', cursor:'pointer' }}>←</button>
        <div style={{ flex:1, fontSize:'15px', fontWeight:'900', background:'linear-gradient(90deg,#00e5ff,#a78bfa)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
          {title}
        </div>
        {score !== null && (
          <div style={{ fontSize:'13px', fontWeight:'800', color:'#ffd700' }}>🏆 {score}</div>
        )}
        <span style={{ fontSize:'11px', padding:'4px 10px', borderRadius:'20px', background: params.mode==='solo'?'rgba(0,229,255,.1)':'rgba(255,69,96,.1)', color: params.mode==='solo'?'#00e5ff':'#ff4560', fontWeight:'700' }}>
          {params.mode==='solo'?'Solo':'VS'}
        </span>
      </div>

      <div style={{ padding:'16px', display:'flex', justifyContent:'center' }}>
        {GameComp ? (
          <GameComp onScore={setScore} vsMode={params.mode==='vs'} />
        ) : (
          <div style={{ textAlign:'center', padding:'60px 20px' }}>
            <div style={{ fontSize:'56px', marginBottom:'16px' }}>🎮</div>
            <div style={{ fontSize:'18px', fontWeight:'700', color:'#4a5568', marginBottom:'8px' }}>Coming Soon</div>
            <div style={{ fontSize:'13px', color:'#2d3748', marginBottom:'20px' }}>এই গেমটি শীঘ্রই আসছে!</div>
            <button onClick={() => window.location.href='/games'} style={{ padding:'12px 24px', background:'linear-gradient(135deg,#00e5ff,#00ff88)', border:'none', borderRadius:'12px', fontSize:'14px', fontWeight:'800', color:'#070a12', cursor:'pointer' }}>← Games</button>
          </div>
        )}
      </div>
    </div>
  )
      }
