import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

const SECRET_KEY = process.env.CHANNEL_ENCRYPTION_KEY || 'default-secret-key'
const TOKEN_VALIDITY = 5 * 60 * 1000 // 5 minutes (short-lived)

// In-memory session store (use Redis in production)
const sessionStore = new Map<string, { count: number; lastRequest: number }>()

function rateLimit(fingerprint: string): boolean {
  const now = Date.now()
  const session = sessionStore.get(fingerprint)
  
  if (!session) {
    sessionStore.set(fingerprint, { count: 1, lastRequest: now })
    return true
  }
  
  // Reset if more than 1 minute passed
  if (now - session.lastRequest > 60000) {
    session.count = 1
    session.lastRequest = now
    return true
  }
  
  // Max 10 requests per minute
  if (session.count >= 10) {
    console.log('[v0] L1 rate limit exceeded')
    return false
  }
  
  session.count++
  session.lastRequest = now
  return true
}

export async function POST(request: NextRequest) {
  try {
    const { channelId, channelUrl } = await request.json()

    if (!channelId || !channelUrl) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Enhanced fingerprinting with more data points
    const clientIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'
    const acceptLanguage = request.headers.get('accept-language') || 'unknown'
    const acceptEncoding = request.headers.get('accept-encoding') || 'unknown'
    const referer = request.headers.get('referer') || ''
    
    // Validate referer (must be from our domain)
    if (referer && !referer.includes(request.headers.get('host') || '')) {
      console.log('[v0] L1 invalid referer detected')
      return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 })
    }
    
    // Generate enhanced fingerprint
    const fingerprint = crypto
      .createHash('sha256')
      .update(`${clientIp}-${userAgent}-${acceptLanguage}-${acceptEncoding}`)
      .digest('hex')
      .substring(0, 24)

    // Rate limiting
    if (!rateLimit(fingerprint)) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
    }

    // Generate session ID
    const sessionId = crypto.randomBytes(16).toString('hex')
    
    // Generate expiration time (5 minutes)
    const expiresAt = Date.now() + TOKEN_VALIDITY

    // Create signature payload with session
    const payload = `${channelId}|${fingerprint}|${sessionId}|${expiresAt}`
    
    // Sign with HMAC-SHA512 (stronger)
    const signature = crypto
      .createHmac('sha512', SECRET_KEY)
      .update(payload)
      .digest('hex')

    // Create token
    const token = Buffer.from(`${payload}|${signature}`).toString('base64url')

    return NextResponse.json({
      token,
      sessionId,
      expiresAt,
      protectedUrl: `/api/l1/stream?token=${token}&id=${channelId}&sid=${sessionId}`,
    })
  } catch (error) {
    console.error('[v0] L1 token generation error:', error)
    return NextResponse.json({ error: 'Failed to generate token' }, { status: 500 })
  }
}
