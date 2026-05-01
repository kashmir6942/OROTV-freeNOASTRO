'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useSearchParams, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

// Import the main IPTV content component
import IPTVContent from '@/components/iptv-content'

export default function UserPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const params = useParams()
  const username = params.username as string
  const token = searchParams.get('token')

  const [isValidating, setIsValidating] = useState(true)
  const [isValid, setIsValid] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [timeRemaining, setTimeRemaining] = useState<number>(0)

  const validateToken = useCallback(async () => {
    if (!token || !username) {
      setError('Missing token or username')
      setIsValidating(false)
      return
    }

    try {
      const supabase = createClient()
      
      // Get user's token from database
      const { data, error: fetchError } = await supabase
        .from('user_tokens')
        .select('*')
        .eq('username', username.toLowerCase())
        .eq('token', token)
        .single()

      if (fetchError || !data) {
        setError('Invalid token')
        setIsValidating(false)
        return
      }

      // Check if token is expired
      const expiresAt = new Date(data.expires_at)
      const now = new Date()

      if (now > expiresAt) {
        setError('Token expired. Please login again.')
        setIsValidating(false)
        return
      }

      // Calculate remaining time
      const remaining = Math.floor((expiresAt.getTime() - now.getTime()) / 1000)
      setTimeRemaining(remaining)
      setIsValid(true)
      setIsValidating(false)
    } catch {
      setError('Token validation failed')
      setIsValidating(false)
    }
  }, [token, username])

  // Validate on mount
  useEffect(() => {
    validateToken()
  }, [validateToken])

  // Countdown timer
  useEffect(() => {
    if (!isValid || timeRemaining <= 0) return

    const interval = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          setIsValid(false)
          setError('Session expired. Please login again.')
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [isValid, timeRemaining])

  // Auto-refresh token when less than 5 minutes remaining
  useEffect(() => {
    if (!isValid || timeRemaining > 300 || timeRemaining <= 0) return

    const refreshToken = async () => {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        
        if (user) {
          const newToken = generateToken()
          const newExpiry = new Date(Date.now() + 30 * 60 * 1000)

          const { error: updateError } = await supabase
            .from('user_tokens')
            .update({
              token: newToken,
              expires_at: newExpiry.toISOString(),
            })
            .eq('user_id', user.id)

          if (!updateError) {
            // Update URL with new token
            router.replace(`/users/${username}?token=${newToken}`)
            setTimeRemaining(1800)
          }
        }
      } catch {
        // Silent fail, will redirect on expiry
      }
    }

    refreshToken()
  }, [isValid, timeRemaining, username, router])

  const generateToken = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let token = ''
    for (let i = 0; i < 12; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return token
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Loading state
  if (isValidating) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{
        background: 'linear-gradient(135deg, #0a1628 0%, #1a2744 50%, #0d1a2d 100%)',
      }}>
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Validating session...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error || !isValid) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{
        background: 'linear-gradient(135deg, #0a1628 0%, #1a2744 50%, #0d1a2d 100%)',
      }}>
        <div className="text-center p-8 rounded-2xl" style={{
          background: 'rgba(20, 35, 60, 0.6)',
          border: '1px solid rgba(100, 150, 200, 0.15)',
        }}>
          <div className="text-red-400 text-xl mb-4">{error || 'Invalid session'}</div>
          <button
            onClick={() => router.push('/auth')}
            className="px-6 py-3 rounded-lg font-medium text-white"
            style={{
              background: 'linear-gradient(90deg, #06b6d4 0%, #22d3ee 50%, #67e8f9 100%)',
            }}
          >
            Go to Login
          </button>
        </div>
      </div>
    )
  }

  // Valid session - show IPTV content
  return (
    <div className="relative">
      {/* Session timer badge */}
      <div 
        className="fixed top-4 right-4 z-[100] px-3 py-1.5 rounded-full text-xs font-mono flex items-center gap-2"
        style={{
          background: timeRemaining < 300 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(6, 182, 212, 0.2)',
          border: `1px solid ${timeRemaining < 300 ? 'rgba(239, 68, 68, 0.5)' : 'rgba(6, 182, 212, 0.5)'}`,
          color: timeRemaining < 300 ? '#ef4444' : '#22d3ee',
        }}
      >
        <span className="w-2 h-2 rounded-full animate-pulse" style={{
          background: timeRemaining < 300 ? '#ef4444' : '#22d3ee',
        }} />
        {formatTime(timeRemaining)}
      </div>
      
      {/* Main IPTV Content */}
      <IPTVContent username={username} />
    </div>
  )
}
