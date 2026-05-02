'use client'

import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import IPTVContent from '@/components/iptv-content'

export default function UserPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const username = params.username as string
  const token = searchParams.get('token')
  
  const [isValidating, setIsValidating] = useState(true)
  const [isValid, setIsValid] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const validateToken = async () => {
      if (!token || !username) {
        setError('Invalid access. Please login again.')
        setIsValidating(false)
        return
      }

      try {
        const supabase = createClient()
        
        // Check if token is valid for this user
        const { data: tokenData, error: tokenError } = await supabase
          .from('user_tokens')
          .select('*')
          .eq('username', username.toLowerCase())
          .eq('token', token)
          .single()

        if (tokenError || !tokenData) {
          setError('Invalid or expired token. Please login again.')
          setIsValidating(false)
          return
        }

        // Check if token is expired
        const expiresAt = new Date(tokenData.expires_at)
        if (expiresAt < new Date()) {
          setError('Session expired. Please login again.')
          setIsValidating(false)
          return
        }

        // Check device binding - only 1 device per account
        const currentDeviceId = getDeviceId()
        
        if (tokenData.device_id && tokenData.device_id !== currentDeviceId) {
          // Another device is using this account
          setError('This account is already logged in on another device. Only 1 device per account is allowed.')
          setIsValidating(false)
          return
        }

        // Bind this device if not already bound
        if (!tokenData.device_id) {
          await supabase
            .from('user_tokens')
            .update({ device_id: currentDeviceId })
            .eq('id', tokenData.id)
        }

        // Valid token - allow access
        sessionStorage.setItem('currentToken', token)
        sessionStorage.setItem('currentUser', username)
        setIsValid(true)
      } catch (err) {
        setError('Failed to validate access. Please try again.')
      } finally {
        setIsValidating(false)
      }
    }

    validateToken()
  }, [token, username])

  // Generate a unique device ID
  function getDeviceId(): string {
    let deviceId = localStorage.getItem('deviceId')
    if (!deviceId) {
      deviceId = 'device_' + Math.random().toString(36).substring(2) + Date.now().toString(36)
      localStorage.setItem('deviceId', deviceId)
    }
    return deviceId
  }

  if (isValidating) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white">Validating access...</p>
        </div>
      </div>
    )
  }

  if (error || !isValid) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-6 max-w-md text-center">
          <p className="text-red-400 mb-4">{error || 'Access denied'}</p>
          <a 
            href="/auth" 
            className="inline-block px-6 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors"
          >
            Go to Login
          </a>
        </div>
      </div>
    )
  }

  return <IPTVContent />
}
