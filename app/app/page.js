'use client'
import { useState } from 'react'
import { supabase } from '../../lib/supabase'
export default function Home() {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleAuth = async () => {
    setLoading(true)
    setMessage('')

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setMessage(error.message)
      else setMessage('✅ Login successful! Welcome back!')
    } else {
      const { data, error } = await supabase.auth.signUp({ email, password })
      if (error) {
        setMessage(error.message)
      } else {
        await supabase.from('profiles').insert({
          id: data.user.id,
          username: username,
          full_name: username,
        })
        setMessage('✅ Account created! Check your email to verify.')
      }
    }
    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #070a10 0%, #0c1018 50%, #070a10 100%)',
      padding: '20px',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '420px',
      }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{
            fontFamily: 'Syne, sans-serif',
            fontSize: '36px',
            fontWeight: '800',
            background: 'linear-gradient(90deg, #00e5ff, #00ff88)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '-1px',
            marginBottom: '8px',
          }}>
            ECHO⬡WORLD
          </div>
          <div style={{ color: '#4a5568', fontSize: '14px' }}>
            Life is a Game. Explore the World.
          </div>
        </div>

        {/* Card */}
        <div style={{
          background: '#111620',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: '20px',
          padding: '32px',
        }}>

          {/* Tabs */}
          <div style={{
            display: 'flex',
            background: '#0c1018',
            borderRadius: '12px',
            padding: '4px',
            marginBottom: '28px',
          }}>
            <button onClick={() => setIsLogin(true)} style={{
              flex: 1,
              padding: '10px',
              border: 'none',
              borderRadius: '10px',
              cursor: 'pointer',
              fontFamily: 'Syne, sans-serif',
              fontWeight: '700',
              fontSize: '14px',
              background: isLogin ? 'linear-gradient(135deg, #00e5ff, #00ff88)' : 'transparent',
              color: isLogin ? '#070a10' : '#4a5568',
              transition: 'all 0.2s',
            }}>Login</button>
            <button onClick={() => setIsLogin(false)} style={{
              flex: 1,
              padding: '10px',
              border: 'none',
              borderRadius: '10px',
              cursor: 'pointer',
              fontFamily: 'Syne, sans-serif',
              fontWeight: '700',
              fontSize: '14px',
              background: !isLogin ? 'linear-gradient(135deg, #00e5ff, #00ff88)' : 'transparent',
              color: !isLogin ? '#070a10' : '#4a5568',
              transition: 'all 0.2s',
            }}>Sign Up</button>
          </div>

          {/* Username field - only for signup */}
          {!isLogin && (
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', color: '#4a5568', marginBottom: '6px', letterSpacing: '0.05em' }}>USERNAME</div>
              <input
                type="text"
                placeholder="your_username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                style={{
                  width: '100%',
                  background: '#0c1018',
                  border: '1px solid rgba(255,255,255,0.07)',
                  borderRadius: '10px',
                  padding: '12px 16px',
                  color: '#eef2f7',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          )}

          {/* Email */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '12px', color: '#4a5568', marginBottom: '6px', letterSpacing: '0.05em' }}>EMAIL</div>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              style={{
                width: '100%',
                background: '#0c1018',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: '10px',
                padding: '12px 16px',
                color: '#eef2f7',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Password */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ fontSize: '12px', color: '#4a5568', marginBottom: '6px', letterSpacing: '0.05em' }}>PASSWORD</div>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={{
                width: '100%',
                background: '#0c1018',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: '10px',
                padding: '12px 16px',
                color: '#eef2f7',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Message */}
          {message && (
            <div style={{
              background: message.includes('✅') ? 'rgba(0,255,136,0.1)' : 'rgba(255,69,96,0.1)',
              border: `1px solid ${message.includes('✅') ? 'rgba(0,255,136,0.3)' : 'rgba(255,69,96,0.3)'}`,
              borderRadius: '10px',
              padding: '12px',
              marginBottom: '16px',
              fontSize: '13px',
              color: message.includes('✅') ? '#00ff88' : '#ff4560',
            }}>
              {message}
            </div>
          )}

          {/* Button */}
          <button
            onClick={handleAuth}
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px',
              background: 'linear-gradient(135deg, #00e5ff, #00ff88)',
              border: 'none',
              borderRadius: '12px',
              fontFamily: 'Syne, sans-serif',
              fontSize: '15px',
              fontWeight: '800',
              color: '#070a10',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              letterSpacing: '0.5px',
            }}
          >
            {loading ? '⏳ Please wait...' : isLogin ? '🚀 Enter Echo World' : '🌍 Create Account'}
          </button>

        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '12px', color: '#4a5568' }}>
          Echo World © 2025 · Life is a Game
        </div>

      </div>
    </div>
  )
    }
