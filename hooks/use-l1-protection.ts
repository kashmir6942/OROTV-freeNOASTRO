import { useState, useEffect, useCallback } from 'react'

interface L1TokenResponse {
  token: string
  sessionId: string
  expiresAt: number
  protectedUrl: string
}

interface L1StreamResponse {
  url: string
}

export function useL1Protection(channelId: string | null, originalUrl: string | null) {
  const [protectedUrl, setProtectedUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const generateToken = useCallback(async () => {
    if (!channelId || !originalUrl) {
      setProtectedUrl(null)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      console.log('[v0] Generating L1 protected URL for channel:', channelId)

      // Generate token
      const tokenResponse = await fetch('/api/l1/generate-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channelId,
          channelUrl: originalUrl,
        }),
      })

      if (!tokenResponse.ok) {
        throw new Error('Failed to generate L1 token')
      }

      const tokenData: L1TokenResponse = await tokenResponse.json()

      // Fetch the actual stream URL using the token
      const streamResponse = await fetch(`/api/l1/stream?token=${tokenData.token}&id=${channelId}&sid=${tokenData.sessionId}`)

      if (!streamResponse.ok) {
        throw new Error('Failed to validate L1 token')
      }

      const streamData: L1StreamResponse = await streamResponse.json()

      console.log('[v0] L1 protection enabled')
      setProtectedUrl(streamData.url)

      // Auto-refresh token before expiration (refresh at 80% of lifetime for 5min tokens = 4min)
      const lifetime = tokenData.expiresAt - Date.now()
      const refreshTime = lifetime * 0.8

      setTimeout(() => {
        console.log('[v0] Refreshing L1 token...')
        generateToken()
      }, refreshTime)

    } catch (err: any) {
      console.error('[v0] L1 protection error:', err)
      setError(err.message)
      // Fallback to original URL if L1 fails
      setProtectedUrl(originalUrl)
    } finally {
      setIsLoading(false)
    }
  }, [channelId, originalUrl])

  useEffect(() => {
    generateToken()
  }, [generateToken])

  return {
    url: protectedUrl,
    isLoading,
    error,
    refresh: generateToken,
  }
}
