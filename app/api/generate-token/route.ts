import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { randomBytes, createHash } from "crypto"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const userIP = request.ip || request.headers.get("x-forwarded-for") || "unknown"
    const userAgent = request.headers.get("user-agent") || "unknown"

    const body = await request.json().catch(() => ({}))
    const { durationType, duration, isUnlimited, description, isAdminGenerated } = body

    try {
      if (!isAdminGenerated) {
        // Check session cooldown for regular users
        const { data: session, error: sessionError } = await supabase
          .from("user_sessions")
          .select("*")
          .eq("user_ip", userIP)
          .eq("user_agent", userAgent)
          .single()

        // If database tables don't exist, generate token anyway
        if (
          sessionError &&
          (sessionError.message?.includes("relation") || sessionError.message?.includes("does not exist"))
        ) {
          const tokenValue = `tokenno1`
          return NextResponse.json({
            success: true,
            token: tokenValue,
            tokenNumber: 1,
            warning: "Database not set up. Token generated but not stored.",
          })
        }

        const now = new Date()

        if (session) {
          const lastGenerated = new Date(session.last_token_generated)
          const cooldownEnds = new Date(lastGenerated.getTime() + 24 * 60 * 60 * 1000)

          if (now < cooldownEnds) {
            return NextResponse.json(
              {
                success: false,
                error: `Please wait ${Math.ceil((cooldownEnds.getTime() - now.getTime()) / (1000 * 60 * 60))} hours before generating another token`,
              },
              { status: 429 },
            )
          }
        }
      }

      // Find next available token number
      const { data: lastToken } = await supabase
        .from("access_tokens")
        .select("token_number")
        .eq("is_permanent", false)
        .order("token_number", { ascending: false })
        .limit(1)
        .single()

      const nextTokenNumber = (lastToken?.token_number || 0) + 1

      // Generate token
      const tokenValue = `tokenno${nextTokenNumber}`
      const tokenHash = createHash("sha256").update(tokenValue).digest("hex")

      const now = new Date()
      let expiresAt: Date

      if (isUnlimited || durationType === "unlimited") {
        // Set to far future for unlimited tokens
        expiresAt = new Date("2099-12-31T23:59:59Z")
      } else {
        const durationMs = calculateDurationMs(durationType || "hours", duration || 48)
        expiresAt = new Date(now.getTime() + durationMs)
      }

      // Insert token
      const { error: tokenError } = await supabase.from("access_tokens").insert({
        token_hash: tokenHash,
        token_number: nextTokenNumber,
        expires_at: expiresAt.toISOString(),
        user_ip: userIP,
        user_agent: userAgent,
        is_permanent: isUnlimited || durationType === "unlimited",
        used_count: 0,
      })

      if (tokenError) {
        return NextResponse.json({ success: false, error: "Failed to create token" }, { status: 500 })
      }

      if (!isAdminGenerated) {
        // Update or create session
        const sessionId = randomBytes(16).toString("hex")
        const { data: session } = await supabase
          .from("user_sessions")
          .select("*")
          .eq("user_ip", userIP)
          .eq("user_agent", userAgent)
          .single()

        if (session) {
          await supabase.from("user_sessions").update({ last_token_generated: now.toISOString() }).eq("id", session.id)
        } else {
          await supabase.from("user_sessions").insert({
            session_id: sessionId,
            user_ip: userIP,
            user_agent: userAgent,
            last_token_generated: now.toISOString(),
          })
        }
      }

      return NextResponse.json({
        success: true,
        token: tokenValue,
        tokenNumber: nextTokenNumber,
        expiresAt: expiresAt.toISOString(),
      })
    } catch (dbError) {
      console.error("Database error:", dbError)
      // Generate token anyway if database is not set up
      const tokenValue = `tokenno1`
      return NextResponse.json({
        success: true,
        token: tokenValue,
        tokenNumber: 1,
        warning: "Database connection failed. Token generated but not stored.",
      })
    }
  } catch (error) {
    console.error("Token generation error:", error)
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 })
  }
}

function calculateDurationMs(durationType: string, duration: number): number {
  switch (durationType) {
    case "minutes":
      return duration * 60 * 1000
    case "hours":
      return duration * 60 * 60 * 1000
    case "days":
      return duration * 24 * 60 * 60 * 1000
    case "weeks":
      return duration * 7 * 24 * 60 * 60 * 1000
    case "months":
      return duration * 30 * 24 * 60 * 60 * 1000
    default:
      return 48 * 60 * 60 * 1000 // Default to 48 hours
  }
}
