"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { kiteretsuEpisodes } from "@/data/anime/キテレツ大百科"
import { ExternalLink, Home, Play } from "lucide-react"

const KITERETSU_CHANNEL = {
  id: "kiteretsu-daihyakka-eng",
  name: "Kiteretsu Daihyakka",
  logo: "https://i.imgur.com/5gJTEHT.png",
  description: "Classic 1990s anime series",
  category: "Anime",
  group: "Premium",
}

export default function AnimePicksPage() {
  const [isClient, setIsClient] = useState(false)
  const router = useRouter()

  useEffect(() => {
    setIsClient(true)
    document.body.style.overflow = "auto"
    document.documentElement.style.overflow = "auto"
    document.body.style.height = "auto"
    document.documentElement.style.height = "auto"

    return () => {
      document.body.style.overflow = "auto"
      document.documentElement.style.overflow = "auto"
      document.body.style.height = "auto"
      document.documentElement.style.height = "auto"
    }
  }, [])

  const handlePlayM3u8 = (episodeId: string) => {
    window.open(`/anime-video-player?episodeId=${encodeURIComponent(episodeId)}`, "_blank")
  }

  const handleEpisodeClick = (episodeUrl: string) => {
    window.open(episodeUrl, "_blank")
  }

  if (!isClient) {
    return null
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-900 to-slate-800">
      {/* Header */}
      <header className="bg-slate-800/50 backdrop-blur border-b border-slate-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-white font-bold text-lg">Anime Picks</h1>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/permanent">
              <Button variant="outline" size="sm" className="gap-2 bg-transparent">
                <Home className="w-4 h-4" />
                Go To Live Playlist
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="w-full max-w-7xl mx-auto px-4 py-8">
        {/* Channel Header */}
        <div className="mb-8">
          <div className="flex gap-6 items-start">
            <div className="flex-shrink-0">
              <img
                src={KITERETSU_CHANNEL.logo || "/placeholder.svg"}
                alt={KITERETSU_CHANNEL.name}
                className="w-32 h-32 rounded-lg object-cover shadow-lg"
                loading="lazy"
              />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-3xl font-bold text-white mb-2">{KITERETSU_CHANNEL.name}</h2>
              <p className="text-slate-300 mb-4">{KITERETSU_CHANNEL.description}</p>
              <div className="flex gap-2 flex-wrap">
                <span className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-sm">
                  {KITERETSU_CHANNEL.category}
                </span>
                <span className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full text-sm">
                  {KITERETSU_CHANNEL.group}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Episodes Grid */}
        <div className="mb-8">
          <h3 className="text-2xl font-bold text-white mb-6">Episodes</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {kiteretsuEpisodes && kiteretsuEpisodes.length > 0 ? (
              kiteretsuEpisodes.map((episode) => (
                <Card
                  key={episode.id}
                  className="bg-slate-700/50 border-slate-600 hover:border-blue-500 transition-all overflow-hidden"
                >
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-slate-400 text-sm">Episode {episode.number}</p>
                        <h4 className="text-white font-semibold text-lg break-words">{episode.title}</h4>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Button
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white gap-2"
                        onClick={() => handleEpisodeClick(episode.url)}
                      >
                        <ExternalLink className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate">Play Redirection</span>
                      </Button>
                      <Button
                        className="w-full bg-orange-600 hover:bg-orange-700 text-white gap-2"
                        onClick={() => handlePlayM3u8(episode.id)}
                      >
                        <Play className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate">Play m3u8 Version</span>
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            ) : (
              <div className="col-span-full text-center py-12">
                <p className="text-slate-400 text-lg">No episodes available yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Info Section */}
        <div className="bg-slate-700/30 border border-slate-600 rounded-lg p-6 mb-8">
          <h3 className="text-white font-semibold mb-3">About This Series</h3>
          <p className="text-slate-300">
            {KITERETSU_CHANNEL.name} is a classic anime series. You can watch episodes using either the external player
            or our built-in m3u8 video player for a seamless viewing experience.
          </p>
        </div>
      </main>
    </div>
  )
}
