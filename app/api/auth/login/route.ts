import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { compare } from "bcryptjs"
import { randomBytes } from "crypto"

const TOKEN_TTL_MS = 30 * 60 * 1000 // 30 minutes

function generateToken(): string {
  // 16 random bytes -> 32 hex chars (URL-safe)
  return randomBytes(16).toString("hex").toUpperCase()
}

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json()

    if (!username || !password) {
      return NextResponse.json({ error: "Username and password are required" }, { status: 400 })
    }

    const trimmedUsername = String(username).trim()
    const supabase = await createClient()

    // 1) If still pending, surface the right message
    const { data: pending } = await supabase
      .from("pending_users")
      .select("status, decline_reason")
      .eq("username", trimmedUsername)
      .maybeSingle()

    if (pending && pending.status === "pending") {
      return NextResponse.json(
        { error: "Your account is awaiting administrator approval." },
        { status: 403 },
      )
    }
    if (pending && pending.status === "declined") {
      return NextResponse.json(
        { error: `Registration declined${pending.decline_reason ? `: ${pending.decline_reason}` : "."}` },
        { status: 403 },
      )
    }

    // 2) Look up approved account
    const { data: user, error } = await supabase
      .from("user_accounts")
      .select("id, username, password_hash, is_active, is_approved, is_banned, ban_reason")
      .eq("username", trimmedUsername)
      .maybeSingle()

    if (error || !user) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

    if (user.is_banned) {
      return NextResponse.json(
        { error: `Account banned${user.ban_reason ? `: ${user.ban_reason}` : "."}` },
        { status: 403 },
      )
    }

    if (!user.is_approved) {
      return NextResponse.json(
        { error: "Your account is awaiting administrator approval." },
        { status: 403 },
      )
    }

    if (!user.is_active) {
      return NextResponse.json({ error: "Account is disabled" }, { status: 401 })
    }

    const ok = await compare(password, user.password_hash)
    if (!ok) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

    // 3) Issue 30-minute rotating token
    const token = generateToken()
    const expiresAt = new Date(Date.now() + TOKEN_TTL_MS).toISOString()

    // Wipe existing tokens for this user, then insert the new one
    await supabase.from("user_tokens").delete().eq("username", user.username)
    const { error: tokenInsertError } = await supabase.from("user_tokens").insert([
      {
        username: user.username,
        token,
        expires_at: expiresAt,
      },
    ])
    if (tokenInsertError) {
      console.error("[v0] Token issuance error:", tokenInsertError)
      return NextResponse.json({ error: "Failed to start session" }, { status: 500 })
    }

    // Clear stale forced logouts so login can proceed
    await supabase.from("forced_logouts").delete().eq("username", user.username)

    return NextResponse.json({
      success: true,
      user: { id: user.id, username: user.username },
      token,
      expiresAt,
      redirectTo: `/users/${encodeURIComponent(user.username)}?token=${token}`,
    })
  } catch (error) {
    console.error("[v0] Login error:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
