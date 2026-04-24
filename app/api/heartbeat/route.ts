import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const { sessionId } = await request.json()

    if (!sessionId) {
      return NextResponse.json({ success: false, error: "SessionId required" })
    }

    const supabase = await createClient()

    // Update heartbeat
    const { error: rpcError } = await supabase.rpc("update_session_heartbeat", {
      p_session_id: sessionId,
    })

    if (rpcError) {
      console.log("[v0] Failed to update heartbeat:", rpcError)
      return NextResponse.json({ success: false, error: "Failed to update heartbeat" })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Heartbeat error:", error)
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 })
  }
}
