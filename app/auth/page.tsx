'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useEffect, Suspense } from 'react'
import { Tv, User, Lock, UserPlus, LogIn, CheckCircle, ExternalLink, ArrowLeft } from 'lucide-react'

function AuthContent() {
  const searchParams = useSearchParams()
  const initialMode = searchParams.get('mode') === 'register' ? 'register' : 'login'
  
  const [mode, setMode] = useState<'login' | 'register'>(initialMode)
  const [username, setUsername] = useState('')
  const [phcornerUser, setPhcornerUser] = useState('')
  const [password, setPassword] = useState('')
  const [retypePassword, setRetypePassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [registrationSuccess, setRegistrationSuccess] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const newMode = searchParams.get('mode') === 'register' ? 'register' : 'login'
    setMode(newMode)
  }, [searchParams])

  const generateToken = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let token = ''
    for (let i = 0; i < 12; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return token
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      
      // First check if user exists in pending_users
      const { data: pendingUser } = await supabase
        .from('pending_users')
        .select('status, decline_reason')
        .eq('username', username.toLowerCase())
        .single()

      if (pendingUser) {
        if (pendingUser.status === 'pending') {
          setError('Your account is pending approval. Please wait for admin approval.')
          setIsLoading(false)
          return
        }
        if (pendingUser.status === 'declined' || pendingUser.status === 'rejected') {
          setError(`Registration rejected: ${pendingUser.decline_reason || 'Contact admin for details'}`)
          setIsLoading(false)
          return
        }
      }

      // Check user_accounts for approved users
      const { data: userAccount } = await supabase
        .from('user_accounts')
        .select('id, username, password_plain, is_approved, is_banned, ban_reason, phcorner_username')
        .eq('username', username.toLowerCase())
        .single()

      if (!userAccount) {
        setError('User not found. Please register first.')
        setIsLoading(false)
        return
      }

      if (userAccount.is_banned) {
        setError(`Account banned: ${userAccount.ban_reason || 'Contact admin for details'}`)
        setIsLoading(false)
        return
      }

      if (!userAccount.is_approved) {
        setError('Your account is pending approval. Please wait.')
        setIsLoading(false)
        return
      }

      // Verify password
      if (userAccount.password_plain !== password) {
        setError('Invalid password')
        setIsLoading(false)
        return
      }

      // Generate new token and update in database
      const token = generateToken()
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000) // 30 minutes from now

      const { error: tokenError } = await supabase
        .from('user_tokens')
        .upsert({
          user_id: userAccount.id,
          username: username.toLowerCase(),
          token,
          expires_at: expiresAt.toISOString(),
        }, { onConflict: 'username' })

      if (tokenError) {
        console.error('[v0] Token error:', tokenError)
      }

      // Update last login
      await supabase
        .from('user_accounts')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', userAccount.id)

      // Redirect to user page: /user/phc/username?token=xxx
      const phcPath = userAccount.phcorner_username || 'phcorner-user'
      router.push(`/user/phc/${username.toLowerCase()}?token=${token}`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    if (password !== retypePassword) {
      setError('Passwords do not match')
      setIsLoading(false)
      return
    }

    if (username.length < 3) {
      setError('Username must be at least 3 characters')
      setIsLoading(false)
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      setIsLoading(false)
      return
    }

    // Password strength check
    const hasUpperCase = /[A-Z]/.test(password)
    const hasLowerCase = /[a-z]/.test(password)
    const hasNumber = /[0-9]/.test(password)
    if (!(hasUpperCase && hasLowerCase && hasNumber)) {
      setError('Password must contain uppercase, lowercase, and number')
      setIsLoading(false)
      return
    }

    try {
      const supabase = createClient()
      
      // Check if username already exists in pending_users
      const { data: existingPending } = await supabase
        .from('pending_users')
        .select('id, status')
        .eq('username', username.toLowerCase())
        .single()

      if (existingPending) {
        if (existingPending.status === 'pending') {
          setError('Registration pending approval. Please wait.')
        } else if (existingPending.status === 'rejected') {
          setError('Registration was rejected. Contact admin.')
        } else if (existingPending.status === 'banned') {
          setError('This username is banned.')
        } else {
          setError('Username already exists.')
        }
        setIsLoading(false)
        return
      }

      // Get user IP
      let userIp = 'unknown'
      try {
        const ipResponse = await fetch('/api/get-ip')
        const ipData = await ipResponse.json()
        userIp = ipData.ip || 'unknown'
      } catch {
        userIp = 'unknown'
      }

      // Submit to pending_users for admin approval
      const { error: pendingError } = await supabase
        .from('pending_users')
        .insert({
          username: username.toLowerCase(),
          phcorner_username: phcornerUser || null,
          password_hash: password,
          password_plain: password,
          user_ip: userIp,
          user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
          status: 'pending',
        })

      if (pendingError) {
        if (pendingError.message.includes('unique') || pendingError.message.includes('duplicate')) {
          setError('Username already taken')
        } else {
          throw pendingError
        }
        setIsLoading(false)
        return
      }

      // Show success message with PHCorner instructions
      setError(null)
      setRegistrationSuccess(true)
      setUsername('')
      setPassword('')
      setRetypePassword('')
      setPhcornerUser('')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration failed')
    } finally {
      setIsLoading(false)
    }
  }

  // Registration Success Screen
  if (registrationSuccess) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center p-4" style={{
        background: 'linear-gradient(135deg, #0a1628 0%, #1a2744 50%, #0d1a2d 100%)',
      }}>
        <div className="w-full max-w-md">
          <div className="rounded-2xl p-8 text-center" style={{
            background: 'rgba(20, 35, 60, 0.6)',
            border: '1px solid rgba(100, 150, 200, 0.15)',
            backdropFilter: 'blur(12px)',
          }}>
            <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Registration Submitted!</h2>
            <p className="text-gray-400 mb-6">
              Your account is pending admin approval. To speed up the process:
            </p>
            
            <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-4 mb-6">
              <p className="text-cyan-400 text-sm mb-3">
                Comment on PHC-SVWG&apos;s Post or PM him:
              </p>
              <a
                href="https://phcorner.org/direct-messages/add?to=PHC-SVWG"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg font-medium transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                Message PHC-SVWG
              </a>
            </div>

            <button
              onClick={() => {
                setRegistrationSuccess(false)
                setMode('login')
              }}
              className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Login
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4" style={{
      background: 'linear-gradient(135deg, #0a1628 0%, #1a2744 50%, #0d1a2d 100%)',
    }}>
      <div className="w-full max-w-md">
        {/* Back to Home */}
        <button
          onClick={() => router.push('/')}
          className="flex items-center gap-2 text-gray-400 hover:text-cyan-400 transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </button>

        {/* Card */}
        <div className="rounded-2xl p-8" style={{
          background: 'rgba(20, 35, 60, 0.6)',
          border: '1px solid rgba(100, 150, 200, 0.15)',
          backdropFilter: 'blur(12px)',
        }}>
          {/* Logo */}
          <div className="flex flex-col items-center mb-6">
            <img 
              src="/images/light-logo.png" 
              alt="Light IPTV" 
              className="h-16 w-auto mb-2"
              onError={(e) => {
                e.currentTarget.style.display = 'none'
              }}
            />
            <div className="flex items-center gap-2 mb-2">
              <Tv className="w-8 h-8 text-cyan-400" />
              <h1 className="text-2xl font-bold text-cyan-400">Light IPTV</h1>
            </div>
            <p className="text-gray-400 text-sm">
              {mode === 'login' ? 'Welcome back! Please login to your account.' : 'Join the ultimate IPTV experience.'}
            </p>
          </div>

          {/* Tab Toggle */}
          <div className="flex rounded-lg overflow-hidden mb-6" style={{
            background: 'rgba(30, 50, 80, 0.5)',
          }}>
            <button
              type="button"
              onClick={() => { setMode('login'); setError(null) }}
              className={`flex-1 py-3 px-4 text-sm font-medium transition-all ${
                mode === 'login'
                  ? 'bg-gradient-to-r from-cyan-600/30 to-cyan-500/30 text-cyan-400 border border-cyan-500/30'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
              style={{ borderRadius: mode === 'login' ? '8px' : '0' }}
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => { setMode('register'); setError(null) }}
              className={`flex-1 py-3 px-4 text-sm font-medium transition-all ${
                mode === 'register'
                  ? 'bg-gradient-to-r from-cyan-600/30 to-cyan-500/30 text-cyan-400 border border-cyan-500/30'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
              style={{ borderRadius: mode === 'register' ? '8px' : '0' }}
            >
              Register
            </button>
          </div>

          {/* Form */}
          <form onSubmit={mode === 'login' ? handleLogin : handleRegister} className="space-y-4">
            {/* Username */}
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                type="text"
                placeholder="Username (min 3 characters)"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                minLength={3}
                className="w-full pl-12 pr-4 py-3 rounded-lg text-white placeholder-gray-500 outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all"
                style={{
                  background: 'rgba(30, 50, 80, 0.4)',
                  border: '1px solid rgba(100, 150, 200, 0.2)',
                }}
              />
            </div>

            {/* PHCORNER USER (Register only) */}
            {mode === 'register' && (
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 flex items-center justify-center">
                  <span className="text-xs font-bold">PH</span>
                </div>
                <input
                  type="text"
                  placeholder="PHCorner Username"
                  value={phcornerUser}
                  onChange={(e) => setPhcornerUser(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 rounded-lg text-white placeholder-gray-500 outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all"
                  style={{
                    background: 'rgba(30, 50, 80, 0.4)',
                    border: '1px solid rgba(100, 150, 200, 0.2)',
                  }}
                />
              </div>
            )}

            {/* Password */}
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full pl-12 pr-4 py-3 rounded-lg text-white placeholder-gray-500 outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all"
                style={{
                  background: 'rgba(30, 50, 80, 0.4)',
                  border: '1px solid rgba(100, 150, 200, 0.2)',
                }}
              />
            </div>

            {/* Retype Password (Register only) */}
            {mode === 'register' && (
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="password"
                  placeholder="Retype password"
                  value={retypePassword}
                  onChange={(e) => setRetypePassword(e.target.value)}
                  required
                  className="w-full pl-12 pr-4 py-3 rounded-lg text-white placeholder-gray-500 outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all"
                  style={{
                    background: 'rgba(30, 50, 80, 0.4)',
                    border: '1px solid rgba(100, 150, 200, 0.2)',
                  }}
                />
              </div>
            )}

            {/* Error Message */}
            {error && (
              <p className="text-red-400 text-sm text-center">{error}</p>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-lg font-medium text-white flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              style={{
                background: 'linear-gradient(90deg, #06b6d4 0%, #22d3ee 50%, #67e8f9 100%)',
              }}
            >
              {mode === 'login' ? (
                <>
                  <LogIn className="w-5 h-5" />
                  {isLoading ? 'Signing in...' : 'Sign In'}
                </>
              ) : (
                <>
                  <UserPlus className="w-5 h-5" />
                  {isLoading ? 'Creating account...' : 'Create Account'}
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default function AuthPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen w-full flex items-center justify-center" style={{
        background: 'linear-gradient(135deg, #0a1628 0%, #1a2744 50%, #0d1a2d 100%)',
      }}>
        <div className="w-12 h-12 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <AuthContent />
    </Suspense>
  )
}
