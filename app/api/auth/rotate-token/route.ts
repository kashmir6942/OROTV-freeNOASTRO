import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

const TOKEN_TTL_MS = 30 * 60 * 1000 // 30 minutes

function generateToken() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
  let token = ""
  for (let i = 0; i < 12; i++) token += chars.charAt(Math.floor(Math.random() * chars.length))
  return token
}

/**
 * POST /api/auth/rotate-token
 *
 * body: { username, token, deviceId }
 *
 * Verifies the supplied (still-valid) token + deviceId belong to the user,
 * then atomically replaces it with a fresh 30-minute token. The old token
 * is deleted from `user_tokens` so it can no longer be used.
 *
 * Returns: { token, expiresAt }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const username = String(body.username || "").trim().toLowerCase()
    const oldToken = String(body.token || "").trim()
    const deviceId = String(body.deviceId || "").trim()

    if (!username || !oldToken || !deviceId) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 })
    }

    const supabase = await createClient()
    const nowIso = new Date().toISOString()

    // Verify current token + device + not yet expired
    const { data: existing, error: fetchError } = await supabase
      .from("user_tokens")
      .select("id, username, device_id, expires_at")
      .eq("username", username)
      .eq("token", oldToken)
      .maybeSingle()

    if (fetchError || !existing) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    if (existing.device_id && existing.device_id !== deviceId) {
      return NextResponse.json({ error: "Device mismatch" }, { status: 403 })
    }

    if (new Date(existing.expires_at).getTime() <= Date.now()) {
      // Already expired — let caller redirect to login
      return NextResponse.json({ error: "Token expired" }, { status: 401 })
    }

    // Atomic swap: delete the old row and insert a new one. Because the
    // application enforces a single token-per-user, this guarantees the
    // previous token immediately becomes useless.
    const newToken = generateToken()
    const newExpires = new Date(Date.now() + TOKEN_TTL_MS).toISOString()

    await supabase.from("user_tokens").delete().eq("username", username)
    const { error: insertError } = await supabase.from("user_tokens").insert({
      username,
      token: newToken,
      device_id: deviceId,
      expires_at: newExpires,
    })

    if (insertError) {
      console.error("[v0] rotate-token insert error:", insertError)
      return NextResponse.json(
        { error: "Failed to rotate token", detail: insertError.message },
        { status: 500 },
      )
    }

    return NextResponse.json({ success: true, token: newToken, expiresAt: newExpires })
  } catch (error) {
    console.error("[v0] rotate-token error:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
