import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = await createClient()

    const { data: streamStatuses, error } = await supabase
      .from("stream_status")
      .select("*")
      .order("updated_at", { ascending: false })

    if (error) throw error

    return NextResponse.json({ streamStatuses })
  } catch (error) {
    console.error("[v0] Error fetching stream statuses:", error)
    return NextResponse.json({ error: "Failed to fetch stream statuses" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { channelId, isFailed, customMessage, customImageUrl } = await request.json()

    const supabase = await createClient()

    const { data, error } = await supabase
      .from("stream_status")
      .upsert(
        {
          channel_id: channelId,
          is_failed: isFailed,
          custom_message: customMessage || "Technical difficulties. Please try again later.",
          custom_image_url: customImageUrl,
          failed_at: isFailed ? new Date().toISOString() : null,
          restored_at: !isFailed ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "channel_id",
        },
      )
      .select()

    if (error) throw error

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("[v0] Error updating stream status:", error)
    return NextResponse.json({ error: "Failed to update stream status" }, { status: 500 })
  }
}
