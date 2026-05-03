import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { compare } from "bcryptjs"

const TOKEN_TTL_MS = 30 * 60 * 1000 // 30 minutes

function generateToken() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
  let token = ""
  for (let i = 0; i < 12; i++) token += chars.charAt(Math.floor(Math.random() * chars.length))
  return token
}

/**
 * POST /api/auth/login
 *
 * body: { username, password, deviceId }
 *
 * - Rejects if registration is still pending or was declined.
 * - Rejects if account is banned.
 * - Enforces 1 active device per account: if there's a non-expired token bound
 *   to a different deviceId, login is denied with HTTP 409.
 * - Issues a fresh token bound to the supplied deviceId on success.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const username = String(body.username || "").trim().toLowerCase()
    const password = String(body.password || "")
    const deviceId = String(body.deviceId || "").trim()

    if (!username || !password) {
      return NextResponse.json({ error: "Username and password are required" }, { status: 400 })
    }
    if (!deviceId) {
      return NextResponse.json({ error: "Missing device identifier" }, { status: 400 })
    }

    const supabase = await createClient()

    // 1. Look up the approved account
    const { data: user } = await supabase
      .from("user_accounts")
      .select(
        "id, username, password_hash, password_plain, is_active, is_approved, is_banned, ban_reason",
      )
      .eq("username", username)
      .maybeSingle()

    if (!user) {
      // Maybe the registration is still pending or was declined
      const { data: pending } = await supabase
        .from("pending_users")
        .select("status, decline_reason, rejection_reason")
        .eq("username", username)
        .maybeSingle()

      if (pending) {
        if (pending.status === "pending") {
          return NextResponse.json(
            {
              error: "Account pending approval",
              detail:
                "Your registration is awaiting admin approval. Message PHC-SVWG on PHCorner if you haven't already.",
            },
            { status: 403 },
          )
        }
        if (pending.status === "declined" || pending.status === "rejected") {
          return NextResponse.json(
            {
              error: "Registration declined",
              detail: pending.decline_reason || pending.rejection_reason || "Your registration was declined by the admin.",
            },
            { status: 403 },
          )
        }
      }

      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

    if (user.is_banned) {
      return NextResponse.json(
        { error: "Account banned", detail: user.ban_reason || "This account has been banned." },
        { status: 403 },
      )
    }
    if (user.is_active === false) {
      return NextResponse.json({ error: "Account is disabled" }, { status: 403 })
    }
    if (user.is_approved === false) {
      return NextResponse.json(
        {
          error: "Account pending approval",
          detail: "Your account is awaiting admin approval.",
        },
        { status: 403 },
      )
    }

    // Verify password (try hash first, fall back to plaintext for legacy rows)
    let passwordValid = false
    if (user.password_hash) {
      try {
        passwordValid = await compare(password, user.password_hash)
      } catch {
        passwordValid = false
      }
    }
    if (!passwordValid && user.password_plain && password === user.password_plain) {
      passwordValid = true
    }
    if (!passwordValid) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

    // 2. 1-device-per-user enforcement: any non-expired token bound to a
    //    different device blocks the login until it expires or admin force-logs-out.
    const nowIso = new Date().toISOString()
    const { data: existingToken } = await supabase
      .from("user_tokens")
      .select("device_id, expires_at, token")
      .eq("username", username)
      .gt("expires_at", nowIso)
      .order("expires_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (existingToken && existingToken.device_id && existingToken.device_id !== deviceId) {
      return NextResponse.json(
        {
          error: "Already signed in on another device",
          detail:
            "Only one device per account is allowed. Sign out on the other device, wait for the session to expire, or ask an admin to force logout.",
        },
        { status: 409 },
      )
    }

    // 3. Issue a fresh token for this device
    const token = generateToken()
    const expiresAt = new Date(Date.now() + TOKEN_TTL_MS).toISOString()

    // Replace existing token rows for this user so there's only one active session.
    // NOTE: user_tokens.user_id has a FK to auth.users which we don't use in
    // this custom auth flow — we intentionally omit it (column is nullable).
    await supabase.from("user_tokens").delete().eq("username", username)
    const { error: tokenError } = await supabase.from("user_tokens").insert({
      username,
      token,
      device_id: deviceId,
      expires_at: expiresAt,
    })
    if (tokenError) {
      console.error("[v0] login token insert error:", tokenError)
      return NextResponse.json({ error: "Failed to start session", detail: tokenError.message }, { status: 500 })
    }

    await supabase
      .from("user_accounts")
      .update({ last_login_at: nowIso, updated_at: nowIso })
      .eq("id", user.id)

    return NextResponse.json({
      success: true,
      user: { id: user.id, username: user.username },
      token,
      expiresAt,
    })
  } catch (error) {
    console.error("[v0] Login error:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
