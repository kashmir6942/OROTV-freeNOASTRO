import { NextRequest, NextResponse } from 'next/server';
import { decryptChannelUrl } from '@/lib/encryption';

const VALID_TOKENS = new Set(process.env.VIDEO_PROXY_TOKENS?.split(',') || []);
const REQUEST_CACHE = new Map<string, { url: string; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export async function POST(request: NextRequest) {
  try {
    // Validate authorization token
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token || !VALID_TOKENS.has(token)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { encrypted, iv, authTag, requestId } = await request.json();

    if (!encrypted || !iv || !authTag || !requestId) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    // Check request cache to prevent replay attacks
    const cached = REQUEST_CACHE.get(requestId);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return NextResponse.json({ error: 'Request already processed' }, { status: 400 });
    }

    // Decrypt channel URL
    let channelUrl: string;
    try {
      channelUrl = decryptChannelUrl(encrypted, iv, authTag);
    } catch (error) {
      return NextResponse.json({ error: 'Decryption failed' }, { status: 400 });
    }

    // Validate URL safety
    try {
      const url = new URL(channelUrl);
      if (!['http:', 'https:'].includes(url.protocol)) {
        throw new Error('Invalid protocol');
      }
    } catch {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
    }

    // Cache this request
    REQUEST_CACHE.set(requestId, { url: channelUrl, timestamp: Date.now() });

    // Clean old cache entries
    for (const [key, value] of REQUEST_CACHE.entries()) {
      if (Date.now() - value.timestamp > CACHE_DURATION) {
        REQUEST_CACHE.delete(key);
      }
    }

    // Return only metadata, never the actual URL in response
    return NextResponse.json(
      {
        status: 'ready',
        requestId,
        expiresIn: 300, // 5 minutes
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'X-Content-Type-Options': 'nosniff',
          'X-Frame-Options': 'DENY',
        },
      },
    );
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}
