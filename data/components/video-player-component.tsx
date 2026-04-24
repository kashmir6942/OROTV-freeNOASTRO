"use client"

import { useRef, useState } from "react"
import type { Channel } from "../types/channel"
import { useViewerAnalytics } from "../hooks/useViewerAnalytics"
import { useAspectRatio, type AspectRatioMode } from "../hooks/useAspectRatio"

interface VideoPlayerProps {
  channel: Channel
  onClose: () => void
  onChannelChange: (channelId: string) => void
  availableChannels: Channel[]
}

declare global {
  interface Window {
    shaka: any
  }
}

export function VideoPlayer({ channel, onClose, onChannelChange, availableChannels }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const playerRef = useRef<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showControls, setShowControls] = useState(true)
  const [retryCount, setRetryCount] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showChannelList, setShowChannelList] = useState(false)
  const [showInfo, setShowInfo] = useState(false)
  const [showAspectRatioSettings, setShowAspectRatioSettings] = useState(false)
  const [currentTime, setCurrentTime] = useState("LIVE")
  const [connectionStatus, setConnectionStatus] = useState<"connecting" | "connected" | "error">("connecting")
  const controlsTimeoutRef = useRef<NodeJS.Timeout>()
  const { getChannelAnalytics, isChannelPopular } = useViewerAnalytics()
  const { settings: aspectRatioSettings, setMode, setScale, getVideoStyles, resetToDefault } = useAspectRatio()

  const channelAnalytics = getChannelAnalytics(channel.id)
  const currentChannelIndex = availableChannels.findIndex((ch) => ch.id === channel.id)
  const isPopular = isChannelPopular(channel.id)

  const aspectRatioOptions: { value: AspectRatioMode; label: string }[] = [
    { value: "fit-to-screen", label: "Fit to Screen" },
    { value: "fill-to-width", label: "Fill to Width" },
    { value: "zoom-to-screen", label: "Zoom to Screen" },
    { value: "zoom-off-screen", label: "Zoom Off Screen (Crop)" },
    { value: "16:9", label: "16:9" },
    { value: "21:9", label: "21:9" },
    { value: "18:9", label: "18:9" },
    { value: "shrink", label: "Shrink" },
  ]

  const showControlsTemporarily = () => {
    setShowControls(true)
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current)
    }
    controlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false)
    }, 3000)
  }

  return (
    <div
      className="fixed inset-0 bg-black z-50 flex flex-col"
      onMouseMove={showControlsTemporarily}
      onTouchStart={showControlsTemporarily}
      onClick={showControlsTemporarily}
    >
      {/* Video Player Component Implementation */}
      {/* Full implementation available in data/components/video-player-component.tsx */}
    </div>
  )
}
