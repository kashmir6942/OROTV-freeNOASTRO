import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest, { params }: { params: { shareUrl: string } }) {
  try {
    const { shareUrl } = params
    const url = new URL(request.url)
    const format = url.searchParams.get("format") || "m3u8"

    console.log("[v0] Broadcast request:", { shareUrl, format })

    const supabase = await createClient()

    // Find the playlist by share_url
    const { data: playlist, error } = await supabase
      .from("streaming_playlists")
      .select("*")
      .eq("share_url", shareUrl)
      .single()

    if (error || !playlist) {
      console.error("[v0] Playlist not found:", error)
      return new NextResponse("Playlist not found", { status: 404 })
    }

    // Return the appropriate content based on format
    if (format === "mpd") {
      if (!playlist.mpd_content) {
        return new NextResponse("MPD content not generated. Please save broadcast content first.", { status: 404 })
      }

      return new NextResponse(playlist.mpd_content, {
        status: 200,
        headers: {
          "Content-Type": "application/dash+xml",
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "no-cache",
        },
      })
    } else {
      // Default to M3U8
      if (!playlist.m3u8_content) {
        return new NextResponse("M3U8 content not generated. Please save broadcast content first.", { status: 404 })
      }

      return new NextResponse(playlist.m3u8_content, {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.apple.mpegurl",
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "no-cache",
        },
      })
    }
  } catch (error: any) {
    console.error("[v0] Broadcast API error:", error)
    return new NextResponse(`Error: ${error.message}`, { status: 500 })
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  })
}
