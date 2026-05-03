import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { hash } from "bcryptjs"

/**
 * POST /api/auth/register
 *
 * Submits a registration into pending_users for admin approval.
 * Required: username, phcornerUsername, password.
 * Optional: email.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const username = String(body.username || "").trim().toLowerCase()
    const phcornerUsername = String(body.phcornerUsername || body.phcorner_user || "").trim()
    const password = String(body.password || "")

    if (!username || !password) {
      return NextResponse.json({ error: "Username and password are required" }, { status: 400 })
    }
    if (username.length < 3) {
      return NextResponse.json({ error: "Username must be at least 3 characters" }, { status: 400 })
    }
    if (!phcornerUsername) {
      return NextResponse.json({ error: "PHCorner username is required for verification" }, { status: 400 })
    }
    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 })
    }

    const supabase = await createClient()

    // Block if username is already approved
    const { data: existingApproved } = await supabase
      .from("user_accounts")
      .select("id, is_banned")
      .eq("username", username)
      .maybeSingle()

    if (existingApproved) {
      if (existingApproved.is_banned) {
        return NextResponse.json({ error: "This username is banned" }, { status: 400 })
      }
      return NextResponse.json({ error: "Username already exists" }, { status: 400 })
    }

    // Block if there's already a pending request
    const { data: existingPending } = await supabase
      .from("pending_users")
      .select("id, status")
      .eq("username", username)
      .maybeSingle()

    if (existingPending) {
      if (existingPending.status === "pending") {
        return NextResponse.json(
          { error: "A registration for this username is already pending approval" },
          { status: 400 },
        )
      }
      if (existingPending.status === "declined" || existingPending.status === "rejected") {
        // Allow re-submission: replace the row below.
        await supabase.from("pending_users").delete().eq("id", existingPending.id)
      } else {
        return NextResponse.json({ error: "Username already exists" }, { status: 400 })
      }
    }

    // Capture client metadata
    const forwarded = request.headers.get("x-forwarded-for")
    const realIp = request.headers.get("x-real-ip")
    const cfIp = request.headers.get("cf-connecting-ip")
    const userIp = cfIp || forwarded?.split(",")[0]?.trim() || realIp || "unknown"
    const userAgent = request.headers.get("user-agent") || "unknown"

    const passwordHash = await hash(password, 10)

    const { data, error } = await supabase
      .from("pending_users")
      .insert([
        {
          username,
          phcorner_username: phcornerUsername,
          phcorner_user: phcornerUsername,
          password_hash: passwordHash,
          password_plain: password,
          status: "pending",
          user_ip: userIp,
          user_agent: userAgent,
        },
      ])
      .select("id, username, phcorner_username, status")
      .single()

    if (error) {
      console.error("[v0] Registration error:", error)
      return NextResponse.json({ error: "Failed to submit registration" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      pending: true,
      user: { id: data.id, username: data.username, status: data.status },
      message:
        "Registration submitted. Message PHC-SVWG on PHCorner with your username and wait for admin approval.",
    })
  } catch (error) {
    console.error("[v0] Registration error:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
