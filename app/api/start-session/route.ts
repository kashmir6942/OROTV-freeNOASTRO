import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createHash } from "crypto"

export async function POST(request: NextRequest) {
  try {
    const { token, sessionId } = await request.json()

    console.log("[v0] Starting session for token:", token, "sessionId:", sessionId)

    if (!token || !sessionId) {
      return NextResponse.json({ success: false, error: "Token and sessionId required" })
    }

    if (token === "permanent") {
      return NextResponse.json({ success: true, message: "Permanent token, no session tracking needed" })
    }

    const supabase = await createClient()

    // Hash the token for database lookup
    const tokenHash = createHash("sha256").update(token).digest("hex")

    // Get token data
    const { data: tokenData, error: fetchError } = await supabase
      .from("access_tokens")
      .select("id")
      .eq("token_hash", tokenHash)
      .single()

    if (fetchError || !tokenData) {
      console.log("[v0] Token not found for session start")
      return NextResponse.json({ success: false, error: "Token not found" })
    }

    // Start session
    const { error: rpcError } = await supabase.rpc("start_session", {
      p_token_id: tokenData.id,
      p_session_id: sessionId,
    })

    if (rpcError) {
      console.log("[v0] Failed to start session:", rpcError)
      return NextResponse.json({ success: false, error: "Failed to start session" })
    }

    console.log("[v0] Session started successfully")
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Start session error:", error)
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 })
  }
}
