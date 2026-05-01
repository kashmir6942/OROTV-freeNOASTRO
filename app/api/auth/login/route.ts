import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { compare } from "bcryptjs"

function generateToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let token = ''
  for (let i = 0; i < 12; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return token
}

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json()

    if (!username || !password) {
      return NextResponse.json({ error: "Username and password are required" }, { status: 400 })
    }

    const supabase = await createClient()

    // Check if user is banned
    const { data: bannedUser } = await supabase
      .from("banned_users")
      .select("id, reason")
      .eq("username", username.toLowerCase())
      .single()

    if (bannedUser) {
      return NextResponse.json({ 
        error: `Account banned${bannedUser.reason ? `: ${bannedUser.reason}` : ''}` 
      }, { status: 401 })
    }

    // Get user account
    const { data: user, error } = await supabase
      .from("user_accounts")
      .select("id, username, password_hash, is_active")
      .eq("username", username.toLowerCase())
      .single()

    if (error || !user) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

    if (!user.is_active) {
      return NextResponse.json({ error: "Account is disabled" }, { status: 401 })
    }

    // Verify password
    const isPasswordValid = await compare(password, user.password_hash)

    if (!isPasswordValid) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

    // Generate new token (expires in 30 minutes)
    const token = generateToken()
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000)

    // Delete existing token for this user
    await supabase
      .from("user_tokens")
      .delete()
      .eq("username", user.username)

    // Insert new token
    const { error: tokenError } = await supabase
      .from("user_tokens")
      .insert({
        user_id: user.id,
        username: user.username,
        token,
        expires_at: expiresAt.toISOString(),
      })

    if (tokenError) {
      console.error("[v0] Token creation error:", tokenError)
      return NextResponse.json({ error: "Failed to create session" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      username: user.username,
      token,
      expiresAt: expiresAt.toISOString(),
    })
  } catch (error) {
    console.error("[v0] Login error:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
