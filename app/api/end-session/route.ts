import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    let sessionId: string

    const contentType = request.headers.get("content-type")

    if (contentType?.includes("application/json")) {
      const body = await request.json()
      sessionId = body.sessionId
    } else {
      // Handle FormData from sendBeacon
      const formData = await request.formData()
      sessionId = formData.get("sessionId") as string
    }

    console.log("[v0] Ending session:", sessionId)

    if (!sessionId) {
      return NextResponse.json({ success: false, error: "SessionId required" })
    }

    const supabase = await createClient()

    // End session
    const { error: rpcError } = await supabase.rpc("end_session", {
      p_session_id: sessionId,
    })

    if (rpcError) {
      console.log("[v0] Failed to end session:", rpcError)
      return NextResponse.json({ success: false, error: "Failed to end session" })
    }

    console.log("[v0] Session ended successfully")
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] End session error:", error)
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 })
  }
}
