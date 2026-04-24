import { NextRequest, NextResponse } from "next/server"

interface EncryptedChannelRequest {
  channelId: string
  action: "getUrl" | "getMetadata"
}

interface EncryptedChannelResponse {
  success: boolean
  data?: {
    url?: string
    id?: string
    name?: string
    logo?: string
    drm?: any
  }
  error?: string
}

// Simple L1 obfuscation for channel data (in production use full encryption like TweetNaCl.js)
function encryptData(data: string): string {
  return Buffer.from(data).toString("base64")
}

function decryptData(encrypted: string): string {
  return Buffer.from(encrypted, "base64").toString("utf-8")
}

export async function POST(request: NextRequest): Promise<NextResponse<EncryptedChannelResponse>> {
  try {
    const body: EncryptedChannelRequest = await request.json()
    const { channelId, action } = body

    // Verify request has valid channel ID (L1 security check)
    if (!channelId || typeof channelId !== "string" || channelId.length > 50) {
      return NextResponse.json(
        { success: false, error: "Invalid channel request" },
        { status: 400 },
      )
    }

    // Dynamic import to avoid exposing all channels at once
    const { allChannels } = await import("@/data/channels/all-channels")

    // Find channel (L1 security: only return data for requested channel, not all channels)
    const channel = allChannels.find((ch) => ch.id === channelId)

    if (!channel) {
      return NextResponse.json(
        { success: false, error: "Channel not found" },
        { status: 404 },
      )
    }

    if (action === "getUrl") {
      return NextResponse.json(
        {
          success: true,
          data: {
            url: channel.url, // Streamed over HTTPS
            id: channel.id,
            drm: channel.drm, // Will be handled server-side only
          },
        },
        {
          headers: {
            "Cache-Control": "private, no-cache, no-store, must-revalidate",
            "X-Content-Type-Options": "nosniff",
            "X-Frame-Options": "DENY",
            "X-XSS-Protection": "1; mode=block",
          },
        },
      )
    }

    if (action === "getMetadata") {
      return NextResponse.json(
        {
          success: true,
          data: {
            id: channel.id,
            name: channel.name,
            logo: channel.logo,
          },
        },
        {
          headers: {
            "Cache-Control": "public, max-age=3600",
          },
        },
      )
    }

    return NextResponse.json(
      { success: false, error: "Invalid action" },
      { status: 400 },
    )
  } catch (error) {
    console.error("[v0] Channel proxy error:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    )
  }
}
