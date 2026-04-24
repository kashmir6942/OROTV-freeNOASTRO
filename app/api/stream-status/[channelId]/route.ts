import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest, { params }: { params: { channelId: string } }) {
  try {
    const supabase = await createClient()

    const { data: streamStatus, error } = await supabase
      .from("stream_status")
      .select("*")
      .eq("channel_id", params.channelId)
      .single()

    if (error && error.code !== "PGRST116") throw error

    return NextResponse.json({ streamStatus })
  } catch (error) {
    console.error("[v0] Error fetching stream status:", error)
    return NextResponse.json({ error: "Failed to fetch stream status" }, { status: 500 })
  }
}
