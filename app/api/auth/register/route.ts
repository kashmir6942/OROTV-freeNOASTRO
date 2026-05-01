import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { hash } from "bcryptjs"

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json()

    if (!username || !password) {
      return NextResponse.json({ error: "Username and password are required" }, { status: 400 })
    }

    if (username.length < 3) {
      return NextResponse.json({ error: "Username must be at least 3 characters" }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 })
    }

    const supabase = await createClient()

    // Check if username already exists
    const { data: existingUser } = await supabase.from("user_accounts").select("id").eq("username", username).single()

    if (existingUser) {
      return NextResponse.json({ error: "Username already exists" }, { status: 400 })
    }

    // Hash password
    const passwordHash = await hash(password, 10)

    const { data, error } = await supabase
      .from("user_accounts")
      .insert([
        {
          username,
          password_hash: passwordHash,
        },
      ])
      .select("id, username")
      .single()

    if (error) {
      console.error("[v0] Registration error:", error)
      return NextResponse.json({ error: "Failed to create account" }, { status: 500 })
    }

    return NextResponse.json({ success: true, user: data })
  } catch (error) {
    console.error("[v0] Registration error:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
