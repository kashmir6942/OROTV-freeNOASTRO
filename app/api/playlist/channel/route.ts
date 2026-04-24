import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// Add channel to user's playlist
export async function POST(request: NextRequest) {
  try {
    const { userId, channelData } = await request.json()

    if (!userId || !channelData) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const supabase = await createClient()

    const { data, error } = await supabase.from("streaming_channels").insert([
      {
        name: channelData.name,
        stream_url: channelData.url,
        logo_url: channelData.logo,
        category_id: channelData.categoryId,
        license_key: channelData.licenseKey,
      },
    ])

    if (error) {
      console.error("[v0] Add channel error:", error)
      return NextResponse.json({ error: "Failed to add channel" }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("[v0] Add channel error:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}

// Delete channel from playlist
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const channelId = searchParams.get("channelId")

    if (!channelId) {
      return NextResponse.json({ error: "Channel ID is required" }, { status: 400 })
    }

    const supabase = await createClient()

    const { error } = await supabase.from("streaming_channels").delete().eq("id", channelId)

    if (error) {
      console.error("[v0] Delete channel error:", error)
      return NextResponse.json({ error: "Failed to delete channel" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Delete channel error:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
