import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { hash } from "bcryptjs"

export async function POST(request: NextRequest) {
  try {
    const { username, password, phcornerUser } = await request.json()

    if (!username || !password) {
      return NextResponse.json({ error: "Username and password are required" }, { status: 400 })
    }

    if (username.length < 3) {
      return NextResponse.json({ error: "Username must be at least 3 characters" }, { status: 400 })
    }

    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 })
    }

    // Password strength validation
    if (!/[A-Z]/.test(password)) {
      return NextResponse.json({ error: "Password must contain uppercase letter" }, { status: 400 })
    }
    if (!/[a-z]/.test(password)) {
      return NextResponse.json({ error: "Password must contain lowercase letter" }, { status: 400 })
    }
    if (!/[0-9]/.test(password)) {
      return NextResponse.json({ error: "Password must contain a number" }, { status: 400 })
    }

    const supabase = await createClient()

    // Check if username already exists in user_accounts
    const { data: existingUser } = await supabase
      .from("user_accounts")
      .select("id")
      .eq("username", username.toLowerCase())
      .single()

    if (existingUser) {
      return NextResponse.json({ error: "Username already exists" }, { status: 400 })
    }

    // Check if username is pending approval
    const { data: pendingUser } = await supabase
      .from("pending_users")
      .select("id, status")
      .eq("username", username.toLowerCase())
      .single()

    if (pendingUser) {
      if (pendingUser.status === 'pending') {
        return NextResponse.json({ error: "Registration already pending approval" }, { status: 400 })
      } else if (pendingUser.status === 'rejected') {
        return NextResponse.json({ error: "This username was rejected. Contact admin." }, { status: 400 })
      }
    }

    // Check if user is banned
    const { data: bannedUser } = await supabase
      .from("banned_users")
      .select("id")
      .eq("username", username.toLowerCase())
      .single()

    if (bannedUser) {
      return NextResponse.json({ error: "This username is banned" }, { status: 400 })
    }

    // Hash password
    const passwordHash = await hash(password, 10)

    // Insert into pending_users for admin approval
    const { error: insertError } = await supabase
      .from("pending_users")
      .insert({
        username: username.toLowerCase(),
        phcorner_user: phcornerUser || null,
        password_hash: passwordHash,
        status: 'pending',
      })

    if (insertError) {
      console.error("[v0] Registration error:", insertError)
      if (insertError.message.includes('duplicate') || insertError.message.includes('unique')) {
        return NextResponse.json({ error: "Username already exists" }, { status: 400 })
      }
      return NextResponse.json({ error: "Failed to submit registration" }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: "Registration submitted for approval" 
    })
  } catch (error) {
    console.error("[v0] Registration error:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
