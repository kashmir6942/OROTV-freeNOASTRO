import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// Generate M3U8 playlist from channels
export async function POST(request: NextRequest) {
  try {
    const { userId, playlistName } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    const supabase = await createClient()

    // Get all channels
    const { data: channels, error: channelError } = await supabase
      .from("streaming_channels")
      .select("*")
      .eq("is_active", true)

    if (channelError) {
      console.error("[v0] Fetch channels error:", channelError)
      return NextResponse.json({ error: "Failed to fetch channels" }, { status: 500 })
    }

    // Generate M3U8 content
    let m3u8Content = "#EXTM3U\n"
    m3u8Content += "#EXT-X-VERSION:3\n\n"

    channels?.forEach((channel) => {
      m3u8Content += `#EXTINF:-1 tvg-id="${channel.id}" tvg-name="${channel.name}" tvg-logo="${channel.logo_url || ""}",${channel.name}\n`
      m3u8Content += `${channel.stream_url}\n`
    })

    // Save to database
    const { data, error } = await supabase.from("streaming_playlists").insert([
      {
        name: playlistName || "My Playlist",
        m3u8_content: m3u8Content,
        is_public: false,
      },
    ])

    if (error) {
      console.error("[v0] Generate M3U8 error:", error)
      return NextResponse.json({ error: "Failed to generate playlist" }, { status: 500 })
    }

    return NextResponse.json({ success: true, m3u8Content, data })
  } catch (error) {
    console.error("[v0] Generate M3U8 error:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
