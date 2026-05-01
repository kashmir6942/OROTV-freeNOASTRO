import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { hash } from "bcryptjs"

export async function POST(request: NextRequest) {
  try {
    const { username, password, phcornerUsername } = await request.json()

    if (!username || !password) {
      return NextResponse.json({ error: "Username and password are required" }, { status: 400 })
    }

    const trimmedUsername = String(username).trim()
    if (trimmedUsername.length < 3) {
      return NextResponse.json({ error: "Username must be at least 3 characters" }, { status: 400 })
    }

    if (!/^[a-zA-Z0-9_.-]+$/.test(trimmedUsername)) {
      return NextResponse.json(
        { error: "Username may only contain letters, numbers, underscore, dot, and dash" },
        { status: 400 },
      )
    }

    if (String(password).length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 })
    }

    const supabase = await createClient()

    // Reject if username already approved
    const { data: existingApproved } = await supabase
      .from("user_accounts")
      .select("id")
      .eq("username", trimmedUsername)
      .maybeSingle()
    if (existingApproved) {
      return NextResponse.json({ error: "Username already exists" }, { status: 400 })
    }

    // Reject if username already pending
    const { data: existingPending } = await supabase
      .from("pending_users")
      .select("id, status")
      .eq("username", trimmedUsername)
      .maybeSingle()
    if (existingPending && existingPending.status === "pending") {
      return NextResponse.json(
        { error: "An application with this username is already awaiting approval" },
        { status: 400 },
      )
    }

    const passwordHash = await hash(password, 10)
    const userIp =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown"
    const userAgent = request.headers.get("user-agent") || "unknown"

    // Upsert into pending_users (overwrite previous declined entries for same username)
    if (existingPending) {
      const { error: updateError } = await supabase
        .from("pending_users")
        .update({
          password_hash: passwordHash,
          password_plain: password,
          phcorner_username: phcornerUsername || null,
          status: "pending",
          decline_reason: null,
          user_ip: userIp,
          user_agent: userAgent,
          created_at: new Date().toISOString(),
          decided_at: null,
        })
        .eq("id", existingPending.id)

      if (updateError) {
        console.error("[v0] Pending user update error:", updateError)
        return NextResponse.json({ error: "Failed to submit registration" }, { status: 500 })
      }
    } else {
      const { error: insertError } = await supabase.from("pending_users").insert([
        {
          username: trimmedUsername,
          password_hash: passwordHash,
          password_plain: password,
          phcorner_username: phcornerUsername || null,
          status: "pending",
          user_ip: userIp,
          user_agent: userAgent,
        },
      ])

      if (insertError) {
        console.error("[v0] Registration error:", insertError)
        return NextResponse.json({ error: "Failed to submit registration" }, { status: 500 })
      }
    }

    return NextResponse.json({
      success: true,
      pending: true,
      message: "Registration submitted. An administrator must approve your account before you can sign in.",
    })
  } catch (error) {
    console.error("[v0] Registration error:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
