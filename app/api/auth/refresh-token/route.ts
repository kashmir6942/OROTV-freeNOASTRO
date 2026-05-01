import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { randomBytes } from "crypto"

const TOKEN_TTL_MS = 30 * 60 * 1000

function generateToken(): string {
  return randomBytes(16).toString("hex").toUpperCase()
}

export async function POST(request: NextRequest) {
  try {
    const { username, token } = await request.json()
    if (!username || !token) {
      return NextResponse.json({ error: "Missing username or token" }, { status: 400 })
    }

    const supabase = await createClient()

    // Confirm caller owns a non-expired token
    const { data: existing } = await supabase
      .from("user_tokens")
      .select("id, expires_at")
      .eq("username", username)
      .eq("token", token)
      .maybeSingle()

    if (!existing) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    if (new Date(existing.expires_at) < new Date()) {
      return NextResponse.json({ error: "Token expired" }, { status: 401 })
    }

    // Block refresh for banned / unapproved / force-logged-out users
    const { data: account } = await supabase
      .from("user_accounts")
      .select("is_banned, is_approved, is_active")
      .eq("username", username)
      .maybeSingle()

    if (!account || !account.is_approved || account.is_banned || !account.is_active) {
      return NextResponse.json({ error: "Account not allowed" }, { status: 403 })
    }

    const { data: forced } = await supabase
      .from("forced_logouts")
      .select("id")
      .eq("username", username)
      .eq("consumed", false)
      .maybeSingle()
    if (forced) {
      // Consume + invalidate session
      await supabase.from("forced_logouts").update({ consumed: true }).eq("id", forced.id)
      await supabase.from("user_tokens").delete().eq("username", username)
      return NextResponse.json({ error: "Forced logout" }, { status: 403 })
    }

    const newToken = generateToken()
    const newExpiry = new Date(Date.now() + TOKEN_TTL_MS).toISOString()

    const { error: updateError } = await supabase
      .from("user_tokens")
      .update({ token: newToken, expires_at: newExpiry })
      .eq("id", existing.id)

    if (updateError) {
      return NextResponse.json({ error: "Failed to refresh" }, { status: 500 })
    }

    return NextResponse.json({ success: true, token: newToken, expiresAt: newExpiry })
  } catch (e) {
    console.error("[v0] Refresh error:", e)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
