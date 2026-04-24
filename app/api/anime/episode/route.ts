import { kiteretsuEpisodes } from "@/data/anime/キテレツ大百科"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const episodeId = request.nextUrl.searchParams.get("episodeId")

  if (!episodeId) {
    return NextResponse.json({ error: "Episode ID required" }, { status: 400 })
  }

  const episode = kiteretsuEpisodes.find((ep: any) => ep.id === episodeId)

  if (!episode) {
    return NextResponse.json({ error: "Episode not found" }, { status: 404 })
  }

  // Return only necessary data, never expose m3u8Url in URL
  return NextResponse.json({
    id: episode.id,
    title: episode.title,
    number: episode.number,
    m3u8Url: episode.m3u8Url,
  })
}
