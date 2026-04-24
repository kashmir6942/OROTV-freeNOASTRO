import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

const SECRET_KEY = process.env.CHANNEL_ENCRYPTION_KEY || 'default-secret-key'

// Track used tokens (in-memory, use Redis in production)
const usedTokens = new Set<string>()
const activeSessions = new Map<string, { channelId: string; created: number }>()

async function getChannelUrl(channelId: string): Promise<string | null> {
  try {
    const { allChannels } = await import('@/data/channels/all-channels')
    const channel = allChannels.find((ch: any) => ch.id === channelId)
    return channel?.url || null
  } catch {
    return null
  }
}

function validateToken(
  token: string,
  channelId: string,
  sessionId: string,
  clientIp: string,
  userAgent: string,
  acceptLanguage: string,
  acceptEncoding: string
): boolean {
  try {
    // Prevent token reuse
    if (usedTokens.has(token)) {
      console.log('[v0] L1 token already used (replay attack detected)')
      return false
    }

    // Decode token
    const decoded = Buffer.from(token, 'base64url').toString('utf-8')
    const [tokenChannelId, fingerprint, tokenSessionId, expiresAtStr, signature] = decoded.split('|')

    // Check expiration (strict 5 minute window)
    const expiresAt = parseInt(expiresAtStr, 10)
    if (Date.now() > expiresAt) {
      console.log('[v0] L1 token expired')
      return false
    }

    // Check channel ID match
    if (tokenChannelId !== channelId) {
      console.log('[v0] L1 channel ID mismatch')
      return false
    }

    // Check session ID match
    if (tokenSessionId !== sessionId) {
      console.log('[v0] L1 session ID mismatch')
      return false
    }

    // Verify fingerprint (enhanced)
    const expectedFingerprint = crypto
      .createHash('sha256')
      .update(`${clientIp}-${userAgent}-${acceptLanguage}-${acceptEncoding}`)
      .digest('hex')
      .substring(0, 24)

    if (fingerprint !== expectedFingerprint) {
      console.log('[v0] L1 fingerprint mismatch - device/network change detected')
      return false
    }

    // Verify signature with HMAC-SHA512
    const payload = `${tokenChannelId}|${fingerprint}|${tokenSessionId}|${expiresAtStr}`
    const expectedSignature = crypto
      .createHmac('sha512', SECRET_KEY)
      .update(payload)
      .digest('hex')

    if (signature !== expectedSignature) {
      console.log('[v0] L1 signature invalid')
      return false
    }

    // Check session exists and is valid
    const session = activeSessions.get(sessionId)
    if (!session || session.channelId !== channelId) {
      console.log('[v0] L1 session invalid or expired')
      return false
    }

    // Session must be less than 10 minutes old
    if (Date.now() - session.created > 10 * 60 * 1000) {
      console.log('[v0] L1 session too old')
      activeSessions.delete(sessionId)
      return false
    }

    // Mark token as used
    usedTokens.add(token)
    
    // Clean up old tokens (memory management)
    if (usedTokens.size > 10000) {
      const tokensToDelete = Array.from(usedTokens).slice(0, 5000)
      tokensToDelete.forEach(t => usedTokens.delete(t))
    }

    return true
  } catch (error) {
    console.error('[v0] L1 token validation error:', error)
    return false
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')
  const channelId = searchParams.get('id')
  const sessionId = searchParams.get('sid')

  if (!token || !channelId || !sessionId) {
    return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
  }

  // Get enhanced client info
  const clientIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
  const userAgent = request.headers.get('user-agent') || 'unknown'
  const acceptLanguage = request.headers.get('accept-language') || 'unknown'
  const acceptEncoding = request.headers.get('accept-encoding') || 'unknown'
  const referer = request.headers.get('referer') || ''

  // Validate referer
  if (referer && !referer.includes(request.headers.get('host') || '')) {
    console.log('[v0] L1 invalid referer on stream request')
    return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 })
  }

  // Create session if it doesn't exist
  if (!activeSessions.has(sessionId)) {
    activeSessions.set(sessionId, {
      channelId,
      created: Date.now(),
    })
  }

  // Validate token with enhanced checks
  if (!validateToken(token, channelId, sessionId, clientIp, userAgent, acceptLanguage, acceptEncoding)) {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 403 })
  }

  // Get actual channel URL
  const channelUrl = await getChannelUrl(channelId)
  if (!channelUrl) {
    return NextResponse.json({ error: 'Channel not found' }, { status: 404 })
  }

  // Clean up old sessions (memory management)
  const now = Date.now()
  for (const [sid, session] of activeSessions.entries()) {
    if (now - session.created > 15 * 60 * 1000) { // 15 minutes
      activeSessions.delete(sid)
    }
  }

  // Return the actual URL
  return NextResponse.json({ url: channelUrl })
}
