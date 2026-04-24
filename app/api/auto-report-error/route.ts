import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const { channelId, errorType, errorMessage, userAgent } = await request.json()

    const supabase = await createClient()
    const userIP = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown"

    const { error } = await supabase.from("user_reports").insert({
      channel_id: channelId,
      report_type: "stream_error",
      description: `Automatic error report: ${errorType} - ${errorMessage}`,
      status: "pending",
      user_ip: userIP,
      user_agent: userAgent || "unknown",
    })

    if (error) throw error

    // Also update stream status to failed if it's a critical error
    if (errorType === "fatal" || errorMessage.includes("Failed to load")) {
      await supabase.from("stream_status").upsert(
        {
          channel_id: channelId,
          is_failed: true,
          custom_message: "Stream automatically detected as failed. Technical team has been notified.",
          failed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "channel_id",
        },
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error reporting automatic error:", error)
    return NextResponse.json({ error: "Failed to report error" }, { status: 500 })
  }
}
