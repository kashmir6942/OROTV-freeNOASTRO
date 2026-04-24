import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { notFound } from "next/navigation"
import { Play } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import PlaylistActions from "./playlist-actions"

interface PlaylistPageProps {
  params: {
    shareUrl: string
  }
}

export default async function PlaylistPage({ params }: PlaylistPageProps) {
  const cookieStore = cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
      },
    },
  )

  const { data: playlist, error } = await supabase
    .from("streaming_playlists")
    .select(`
      *,
      playlist_channels(
        channel_order,
        streaming_channels!inner(
          id,
          name,
          logo_url,
          stream_url,
          license_key,
          is_active,
          streaming_categories(name)
        )
      )
    `)
    .eq("share_url", params.shareUrl)
    .eq("is_public", true)
    .single()

  if (error || !playlist) {
    console.error("Playlist not found:", error)
    notFound()
  }

  const channels =
    playlist.playlist_channels
      ?.filter((pc) => pc.streaming_channels?.is_active)
      ?.sort((a, b) => a.channel_order - b.channel_order)
      ?.map((pc) => pc.streaming_channels) || []

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{playlist.name}</h1>
          {playlist.description && <p className="text-muted-foreground mt-2">{playlist.description}</p>}
        </div>
        <div className="flex gap-2">
          <Badge variant="secondary">{channels.length} Channels</Badge>
          <Badge variant="outline">Public Playlist</Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Play className="h-5 w-5" />
                Channels ({channels.length})
              </CardTitle>
              <CardDescription>Active streaming channels in this playlist</CardDescription>
            </CardHeader>
            <CardContent>
              {channels.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No active channels in this playlist</div>
              ) : (
                <div className="space-y-3">
                  {channels.map((channel, index) => (
                    <div key={channel.id} className="flex items-center space-x-4 p-3 border rounded-lg">
                      <div className="text-sm text-muted-foreground w-8">{index + 1}</div>
                      {channel.logo_url ? (
                        <img
                          src={channel.logo_url || "/placeholder.svg"}
                          alt={channel.name}
                          className="w-10 h-10 rounded object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                          <Play className="h-5 w-5" />
                        </div>
                      )}
                      <div className="flex-1">
                        <div className="font-medium">{channel.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {channel.streaming_categories?.name || "Unknown Category"}
                          {channel.license_key && " • DRM Protected"}
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {channel.stream_url.includes(".mpd") ? "DASH" : "HLS"}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <PlaylistActions playlist={playlist} channels={channels} shareUrl={params.shareUrl} />
      </div>
    </div>
  )
}
