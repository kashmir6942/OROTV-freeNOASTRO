import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const userIP = request.ip || request.headers.get("x-forwarded-for") || "unknown"
    const userAgent = request.headers.get("user-agent") || "unknown"

    try {
      // Check existing session
      const { data: session, error } = await supabase
        .from("user_sessions")
        .select("*")
        .eq("user_ip", userIP)
        .eq("user_agent", userAgent)
        .single()

      if (error && error.code !== "PGRST116") {
        // If table doesn't exist, allow token generation
        if (error.message?.includes("relation") || error.message?.includes("does not exist")) {
          return NextResponse.json({
            canGenerate: true,
            error: "Database not set up. Please run setup scripts, but token generation is allowed.",
          })
        }
        return NextResponse.json({ canGenerate: false, error: "Database error" }, { status: 500 })
      }

      const now = new Date()

      if (!session) {
        // No session exists, user can generate
        return NextResponse.json({ canGenerate: true })
      }

      // Check if 24 hours have passed since last token generation
      const lastGenerated = new Date(session.last_token_generated)
      const cooldownEnds = new Date(lastGenerated.getTime() + 24 * 60 * 60 * 1000)

      if (now < cooldownEnds) {
        return NextResponse.json({
          canGenerate: false,
          cooldownEndsAt: cooldownEnds.toISOString(),
        })
      }

      return NextResponse.json({ canGenerate: true })
    } catch (dbError) {
      console.error("Database error:", dbError)
      // Allow token generation if database is not set up
      return NextResponse.json({
        canGenerate: true,
        error: "Database connection failed, but token generation is allowed.",
      })
    }
  } catch (error) {
    console.error("Session check error:", error)
    return NextResponse.json({ canGenerate: false, error: "Server error" }, { status: 500 })
  }
}
