import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const { originalChannelId, replacementUrl, replacementKey, isAutomatic } = await request.json()

    const supabase = await createClient()

    const { error } = await supabase.from("stream_status").upsert(
      {
        channel_id: originalChannelId,
        is_failed: false,
        custom_message: isAutomatic ? "Stream automatically replaced" : "Stream manually replaced",
        custom_image_url: null,
        restored_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "channel_id",
      },
    )

    if (error) throw error

    // Log the replacement for admin tracking
    await supabase.from("user_reports").insert({
      channel_id: originalChannelId,
      report_type: "channel_replacement",
      description: `Channel ${isAutomatic ? "automatically" : "manually"} replaced. New URL: ${replacementUrl}`,
      status: "resolved",
      user_ip: "system",
      user_agent: "admin_system",
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error handling channel replacement:", error)
    return NextResponse.json({ error: "Failed to handle channel replacement" }, { status: 500 })
  }
}
