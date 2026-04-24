"use client"

import { useSearchParams, useRouter } from "next/navigation"
import dynamic from "next/dynamic"
import { X } from "lucide-react"
import { Suspense, useEffect, useState } from "react"

const ReactAllPlayer = dynamic(() => import("react-all-player"), {
  ssr: false,
})

function AnimeVideoPlayerContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const episodeId = searchParams.get("episodeId")
  const [episodeData, setEpisodeData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!episodeId) {
      setError("No episode ID provided")
      setLoading(false)
      return
    }

    const fetchEpisode = async () => {
      try {
        const response = await fetch(`/api/anime/episode?episodeId=${encodeURIComponent(episodeId)}`)
        if (!response.ok) {
          throw new Error("Failed to fetch episode")
        }
        const data = await response.json()
        setEpisodeData(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load episode")
      } finally {
        setLoading(false)
      }
    }

    fetchEpisode()
  }, [episodeId])

  const goBack = () => {
    if (typeof window !== "undefined") {
      // Remove any fullscreen
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {})
      }
      // Close the window/tab
      window.close()
    }
  }

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (typeof window !== "undefined" && document.fullscreenElement) {
        document.exitFullscreen().catch(() => {})
      }
    }
  }, [])

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
        <div className="text-white text-center">
          <p className="text-xl mb-4">Loading player...</p>
        </div>
      </div>
    )
  }

  if (error || !episodeData) {
    return (
      <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
        <div className="text-white text-center">
          <p className="text-xl mb-4">{error || "Failed to load episode"}</p>
          <button onClick={goBack} className="px-6 py-2 bg-orange-500 hover:bg-orange-600 rounded-lg transition-colors">
            Go Back
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col overflow-hidden">
      {/* Top Bar */}
      <div className="bg-gradient-to-b from-black via-black/50 to-transparent px-6 py-4 flex items-center justify-between z-10 flex-shrink-0">
        <div className="text-white">
          <h2 className="text-lg font-bold">{episodeData.title || "Anime Player"}</h2>
          <p className="text-sm text-gray-300">キテレツ大百科</p>
        </div>
        <button
          onClick={goBack}
          className="text-white hover:bg-white/20 rounded-full h-10 w-10 flex items-center justify-center transition-colors flex-shrink-0"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Video Player */}
      <div className="flex-1 relative overflow-hidden flex items-center justify-center min-h-0">
        <ReactAllPlayer
          sources={[
            {
              file: episodeData.m3u8Url,
              label: "HLS Stream",
              type: "hls",
            },
          ]}
          poster="https://static.wikia.nocookie.net/kiteretsu/images/7/7f/Miyoko_Nonohana.png"
        />
      </div>

      {/* Custom Styling */}
      <style jsx global>{`
        .react-all-player {
          width: 100%;
          height: 100%;
        }

        .react-all-player video {
          width: 100%;
          height: 100%;
        }

        /* Progress bar styling */
        .react-all-player .progress-bar {
          background: linear-gradient(to right, #f97316, #ef4444);
        }

        .react-all-player .progress-bar-fill {
          background: linear-gradient(to right, #f97316, #ef4444);
        }

        /* Play button styling */
        .react-all-player .play-button {
          background-color: rgba(0, 0, 0, 0.5);
          border: 3px solid #ec4899;
          border-radius: 50%;
        }

        .react-all-player .play-button:hover {
          background-color: rgba(0, 0, 0, 0.7);
        }

        /* Control bar styling */
        .react-all-player .control-bar {
          background: linear-gradient(to top, rgba(0, 0, 0, 0.8), transparent);
        }

        .react-all-player button {
          color: white;
        }

        .react-all-player button:hover {
          color: #f97316;
        }

        /* Time display */
        .react-all-player .time-display {
          color: #f97316;
        }
      `}</style>
    </div>
  )
}

export default function AnimeVideoPlayerPage() {
  return (
    <Suspense
      fallback={
        <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
          <div className="text-white">Loading player...</div>
        </div>
      }
    >
      <AnimeVideoPlayerContent />
    </Suspense>
  )
}
