"use client"

import type React from "react"
import { useEffect, useRef, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  X,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Minimize,
  SkipBack,
  SkipForward,
  AlertTriangle,
  RotateCcw,
  Expand,
  Settings,
  PictureInPicture,
  Signal,
  Monitor
} from "lucide-react"
import type { VideoPlayerProps } from "@/types/video-player"

// Mock Supabase client to resolve import error in preview environment
const createClient = () => ({
  from: () => ({
    select: () => ({
      eq: async () => ({ data: [] })
    })
  }),
  channel: () => ({
    on: () => ({
      subscribe: () => ({})
    })
  }),
  removeChannel: () => { }
});

// Inline useKeyboardShortcuts to resolve import error
const useKeyboardShortcuts = ({
  onPlayPause, onMute, onFullscreen, onPiP, onVolumeUp, onVolumeDown, onSeekForward, onSeekBackward
}: any) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      switch (e.key.toLowerCase()) {
        case 'f': onFullscreen?.(); break;
        case 'p': onPiP?.(); break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onPlayPause, onMute, onFullscreen, onPiP, onVolumeUp, onVolumeDown, onSeekForward, onSeekBackward]);
};

// Define the Channel type for better type safety
interface Channel {
  id: string
  name: string
  url: string
  logo?: string
  category?: string
  isHD?: boolean
  drm?: {
    clearkey?: Record<string, string>
  }
  watermark?: "watermark1" | "watermark2" | "default"
}

declare global {
  interface Window {
    shaka: any
    Hls: any
  }
}

interface ExtendedVideoPlayerProps extends VideoPlayerProps {
  isTraditionalMode?: boolean
  showModernButton?: boolean
  showChannelInfo?: boolean
  showChannelList?: boolean
  channelNumberInput?: string
  showChannelNumberOverlay?: boolean
  onModernModeClick?: () => void
  onChannelNumberSelect?: (channelId: string) => void
  onModernButtonHover?: () => void
  onChannelInfoHover?: () => void
  onChannelListHover?: () => void
  isMobile?: boolean
  isPortrait?: boolean
  epgData?: any
  currentPrograms?: any
  onPositionUpdate?: (channelId: string, position: number) => void
  getSavedPosition?: (channelId: string) => Promise<number>
  embedded?: boolean
  onBitrateModeChange?: (mode: "high-bitrate" | "optimized") => void
  restoreUIHidden?: boolean
}

export function VideoPlayer({
  channel,
  user,
  onClose,
  onChannelChange,
  onLogout,
  availableChannels,
  isTraditionalMode = false,
  showModernButton = false,
  showChannelInfo = false,
  showChannelList: propShowChannelList = false,
  channelNumberInput = "",
  showChannelNumberOverlay = false,
  onModernModeClick,
  onChannelNumberSelect,
  onModernButtonHover,
  onChannelInfoHover,
  onChannelListHover,
  isMobile = false,
  isPortrait = false,
  epgData,
  currentPrograms,
  onPositionUpdate,
  getSavedPosition,
  embedded = false,
  onBitrateModeChange,
  restoreUIHidden = false,
}: ExtendedVideoPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const playerRef = useRef<any>(null)
  const hlsRef = useRef<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showControls, setShowControls] = useState(true)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [showChannelList, setShowChannelList] = useState(false)
  const [currentTime, setCurrentTime] = useState("")
  const [retryCount, setRetryCount] = useState(0)
  const [connectionStatus, setConnectionStatus] = useState<"connected" | "disconnected" | "reconnecting">(
    "reconnecting",
  )
  const [isBuffering, setIsBuffering] = useState(false)
  const [bufferingStartTime, setBufferingStartTime] = useState<number | null>(null)
  const [playerType, setPlayerType] = useState<"shaka" | "hls" | null>(null)
  const controlsTimeoutRef = useRef<NodeJS.Timeout>()
  const bufferingTimeoutRef = useRef<NodeJS.Timeout>()
  const [showPortraitWarning, setShowPortraitWarning] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [forceAspectRatio, setForceAspectRatio] = useState(true)
  const [aspectRatioMode, setAspectRatioMode] = useState<"16:9" | "4:3" | "original">("16:9")
  const [streamStatus, setStreamStatus] = useState<any>(null)
  const [showTechnicalDifficulties, setShowTechnicalDifficulties] = useState(false)
  const [viewerSessionId, setViewerSessionId] = useState<string | null>(null)
  const [audioTracks, setAudioTracks] = useState<any[]>([])
  const [subtitleTracks, setSubtitleTracks] = useState<any[]>([])
  const [currentAudioTrack, setCurrentAudioTrack] = useState<number>(-1)
  const [currentSubtitleTrack, setCurrentSubtitleTrack] = useState<number>(-1)
  const [showAudioMenu, setShowAudioMenu] = useState(false)
  const [showSubtitleMenu, setShowSubtitleMenu] = useState(false)
  const [selectedQuality, setSelectedQuality] = useState<number>(-1) // -1 = auto
  const [availableQualities, setAvailableQualities] = useState<Array<{ index: number; height: number; label: string }>>([])
  const [isUIHidden, setIsUIHidden] = useState(false)
  const [showUIButtonVisible, setShowUIButtonVisible] = useState(true)
  const showUIButtonTimeoutRef = useRef<NodeJS.Timeout>()
  // Load streaming mode from localStorage
  const [streamingMode, setStreamingMode] = useState<"high-bitrate" | "optimized">(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("orotv-streaming-mode")
      if (saved === "optimized" || saved === "high-bitrate") return saved
    }
    return "high-bitrate"
  })
  const streamingModeRef = useRef<"high-bitrate" | "optimized">(
    typeof window !== "undefined"
      ? (localStorage.getItem("orotv-streaming-mode") as "high-bitrate" | "optimized") || "high-bitrate"
      : "high-bitrate"
  )
  const wasUIHiddenRef = useRef(false)

  // Internal OSD (satellite TV style number input)
  const [osdInput, setOsdInput] = useState("")

  // Restore UI hidden state if prop is set (after auto-reconnect)
  useEffect(() => {
    if (restoreUIHidden) {
      setIsUIHidden(true)
      setShowUIButtonVisible(false)
    }
  }, [restoreUIHidden])

  // Save UI hidden state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("orotv-ui-hidden", isUIHidden ? "true" : "false")
  }, [isUIHidden])

  const [archiveMode, setArchiveMode] = useState(false)
  const bufferingSinceRef = useRef<number | null>(null)
  const bufferingCheckIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const lastBufferingCheckRef = useRef<number>(0)

  const [lastSavedPosition, setLastSavedPosition] = useState(0)
  const positionSaveIntervalRef = useRef<NodeJS.Timeout>()

  // Moving text announcements
  const [movingTextAnnouncements, setMovingTextAnnouncements] = useState<any[]>([])

  const startViewerSession = async () => {
    try {
      const response = await fetch("/api/viewer-tracking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "start",
          channel_id: channel.id,
          user_agent: navigator.userAgent,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setViewerSessionId(data.session_id)
        console.log("[v0] Viewer session started:", data.session_id)
      }
    } catch (error) {
      console.error("[v0] Failed to start viewer session:", error)
    }
  }

  const endViewerSession = async () => {
    if (!viewerSessionId) return

    try {
      await fetch("/api/viewer-tracking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "end",
          session_id: viewerSessionId,
        }),
      })
      console.log("[v0] Viewer session ended")
    } catch (error) {
      console.error("[v0] Failed to end viewer session:", error)
    }
  }

  const sendHeartbeat = async () => {
    if (!viewerSessionId) return

    try {
      await fetch("/api/viewer-tracking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "heartbeat",
          session_id: viewerSessionId,
        }),
      })
    } catch (error) {
      console.error("[v0] Failed to send heartbeat:", error)
    }
  }

  const reportError = async (errorType: string, errorMessage: string) => {
    try {
      await fetch("/api/user-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel_id: channel.id,
          report_type: "playback_error",
          description: `${errorType}: ${errorMessage}`,
          error_details: {
            type: errorType,
            message: errorMessage,
            timestamp: new Date().toISOString(),
            user_agent: navigator.userAgent,
          },
        }),
      })
      console.log("[v0] Error reported")
    } catch (error) {
      console.error("[v0] Failed to report error:", error)
    }
  }

  useEffect(() => {
    const checkStreamStatus = async () => {
      try {
        const response = await fetch(`/api/stream-status/${channel.id}`)
        const data = await response.json()

        if (data.streamStatus && data.streamStatus.is_failed) {
          setStreamStatus(data.streamStatus)
          setShowTechnicalDifficulties(true)
          setError(null) // Clear video errors when showing technical difficulties
        } else {
          setStreamStatus(null)
          setShowTechnicalDifficulties(false)
        }
      } catch (error) {
        console.error("[v0] Error checking stream status:", error)
      }
    }

    checkStreamStatus()

    // Check stream status every 30 seconds for real-time sync
    const statusInterval = setInterval(checkStreamStatus, 30000)

    return () => clearInterval(statusInterval)
  }, [channel.id])

  const trackChannelPlay = async () => {
    try {
      // Track the channel view
      await fetch("/api/channel-analytics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelId: channel.id,
          action: "view",
        }),
      })

      // Start viewer session for real-time analytics
      await startViewerSession()

      console.log("[v0] Channel play tracked:", channel.id)
    } catch (error) {
      console.error("[v0] Error tracking channel play:", error)
    }
  }

  const currentChannelIndex = availableChannels.findIndex((ch) => ch.id === channel.id)

  const getEpgSchedule = () => {
    let nowProg: any = null
    let nextProg: any = null
    let laterProg: any = null

    // 1. Get raw programmes list
    let programmes: any[] = []
    if (epgData && typeof epgData === "object") {
      const epgEntry = Object.values(epgData).find((epg: any) => {
        if (!epg || !epg.name) return false
        const epgName = epg.name.toLowerCase().trim()
        const channelName = channel.name.toLowerCase().trim()
        if (epgName === channelName) return true
        if (epgName.includes(channelName) || channelName.includes(epgName)) return true
        const cleanEpgName = epgName.replace(/[\s\-_.]/g, "")
        const cleanChannelName = channelName.replace(/[\s\-_.]/g, "")
        return cleanEpgName.includes(cleanChannelName) || cleanChannelName.includes(cleanEpgName)
      }) as any
      if (epgEntry && epgEntry.programmes) {
        programmes = epgEntry.programmes
      }
    }

    // 2. Determine NOW, NEXT, LATER
    const now = new Date()
    if (programmes.length > 0) {
      const sorted = [...programmes].sort((a: any, b: any) => {
        if (!a.start || !b.start) return 0
        const startA = new Date(a.start.replace(/(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})\s(.+)/, "$1-$2-$3T$4:$5:$6")).getTime()
        const startB = new Date(b.start.replace(/(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})\s(.+)/, "$1-$2-$3T$4:$5:$6")).getTime()
        return startA - startB
      })

      for (let i = 0; i < sorted.length; i++) {
        const prog = sorted[i]
        if (!prog.start || !prog.stop) continue
        const startTime = new Date(prog.start.replace(/(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})\s(.+)/, "$1-$2-$3T$4:$5:$6"))
        const stopTime = new Date(prog.stop.replace(/(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})\s(.+)/, "$1-$2-$3T$4:$5:$6"))

        if (now >= startTime && now < stopTime) {
          nowProg = prog
          if (i + 1 < sorted.length) nextProg = sorted[i + 1]
          if (i + 2 < sorted.length) laterProg = sorted[i + 2]
          break
        } else if (startTime > now && !nowProg && !nextProg) {
          nextProg = prog
          if (i + 1 < sorted.length) laterProg = sorted[i + 1]
          break
        }
      }
    }

    // Fallback for NOW if missing from explicit EPG bounds but currentPrograms is injected directly
    if (!nowProg && currentPrograms && currentPrograms[channel.name]) {
      nowProg = currentPrograms[channel.name]
    }

    return { nowProg, nextProg, laterProg }
  }

  const { nowProg, nextProg, laterProg } = getEpgSchedule()

  const formatTime = (dateString: string) => {
    if (!dateString) return ""

    try {
      let date: Date
      if (dateString.includes("T") || dateString.includes("-")) {
        date = new Date(dateString)
      } else {
        const match = dateString.match(/(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})\s*(.+)?/)
        if (match) {
          const [, year, month, day, hour, minute, second] = match
          date = new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}`)
        } else {
          date = new Date(dateString)
        }
      }

      if (isNaN(date.getTime())) return "Invalid time"

      return date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })
    } catch (error) {
      return "Invalid time"
    }
  }

  const calculateProgress = (startString: string, stopString: string) => {
    if (!startString || !stopString) return 0
    try {
      let startDate: Date, stopDate: Date
      if (startString.includes("T") || startString.includes("-")) {
        startDate = new Date(startString)
        stopDate = new Date(stopString)
      } else {
        const m1 = startString.match(/(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})\s*(.+)?/)
        const m2 = stopString.match(/(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})\s*(.+)?/)
        if (m1 && m2) {
          startDate = new Date(`${m1[1]}-${m1[2]}-${m1[3]}T${m1[4]}:${m1[5]}:${m1[6]}`)
          stopDate = new Date(`${m2[1]}-${m2[2]}-${m2[3]}T${m2[4]}:${m2[5]}:${m2[6]}`)
        } else {
          startDate = new Date(startString)
          stopDate = new Date(stopString)
        }
      }
      const now = new Date().getTime()
      const start = startDate.getTime()
      const end = stopDate.getTime()
      if (now < start) return 0
      if (now > end) return 100
      return Math.round(((now - start) / (end - start)) * 100)
    } catch (e) {
      return 0
    }
  }

  const isM3u8Stream = (url: string) => {
    return url.includes(".m3u8") || url.includes("m3u8")
  }

  // Flash the "Show UI" button for 3 seconds on any activity while UI is hidden
  const flashShowUIButton = useCallback(() => {
    setShowUIButtonVisible(true)
    if (showUIButtonTimeoutRef.current) clearTimeout(showUIButtonTimeoutRef.current)
    showUIButtonTimeoutRef.current = setTimeout(() => {
      setShowUIButtonVisible(false)
    }, 3000)
  }, [])

  const showControlsTemporarily = useCallback(() => {
    if (isTraditionalMode) return
    setShowControls(true)
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current)
    }
    controlsTimeoutRef.current = setTimeout(
      () => {
        setShowControls(false)
        setShowSettings(false)
      },
      isMobile ? 6000 : 5000,
    )
  }, [isTraditionalMode, isMobile])

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (isTraditionalMode) return
      showControlsTemporarily()

      if (e.touches.length === 1) {
        e.preventDefault()
      }
    },
    [isTraditionalMode, showControlsTemporarily],
  )

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      e.preventDefault()
    }
  }, [])

  const isLiveStream = (channel: Channel): boolean => {
    return !channel.url?.includes("vod") && !channel.url?.includes("replay")
  }

  const initializePlayer = async () => {
    if (showTechnicalDifficulties) {
      setIsLoading(false)
      return
    }

    if (!videoRef.current) {
      return
    }

    let initTimeout: NodeJS.Timeout | null = null

    try {
      setIsLoading(true)
      setError(null)
      setConnectionStatus("reconnecting")

      const video = videoRef.current

      if (playerRef.current) {
        await playerRef.current.destroy()
        playerRef.current = null
      }
      if (hlsRef.current) {
        hlsRef.current.destroy()
        hlsRef.current = null
      }

      video.src = ""
      video.load()

      initTimeout = setTimeout(() => {
        setIsLoading(false)
        if (retryCount < 5) {
          const retryDelay = Math.floor(Math.random() * 10000) + 5000
          setError(`Loading timeout - Retrying (${retryCount + 1}/5)...`)
          setTimeout(() => {
            setRetryCount(prev => prev + 1)
            retryStream()
          }, retryDelay)
        } else {
          setError("Failed to load channel after 5 attempts. Please try another channel or check your connection.")
        }
      }, 15000)

      if (isM3u8Stream(channel.url)) {
        setPlayerType("hls")

        if (!window.Hls) {
          const script = document.createElement("script")
          script.src = "https://cdn.jsdelivr.net/npm/hls.js@latest"
          script.onload = () => {
            if (initTimeout) clearTimeout(initTimeout)
            initializePlayer()
          }
          script.onerror = () => {
            setError("Failed to load video player library")
            setIsLoading(false)
            if (initTimeout) clearTimeout(initTimeout)
            reportError("library_error", "Failed to load HLS.js")
          }
          document.head.appendChild(script)
          return
        }

        if (window.Hls.isSupported()) {
          const currentMode = streamingModeRef.current
          const isOptimized = currentMode === "optimized"

          const hlsConfig = isOptimized ? {
            enableWorker: true,
            lowLatencyMode: false,
            startLevel: 0,
            autoStartLoad: true,
            capLevelToPlayerSize: true,
          } : {
            enableWorker: true,
            lowLatencyMode: false,
            startLevel: -1,
            autoStartLoad: true,
            autoLevelCapping: -1,
          }

          hlsRef.current = new window.Hls(hlsConfig)

          hlsRef.current.loadSource(channel.url)
          hlsRef.current.attachMedia(video)

          hlsRef.current.on(window.Hls.Events.MANIFEST_PARSED, () => {
            if (initTimeout) clearTimeout(initTimeout)
            setConnectionStatus("connected")
            setIsLoading(false)
            setRetryCount(0)
            const playPromise = video.play()
            if (playPromise !== undefined) {
              playPromise.catch((err) => {
                setIsLoading(false)
              })
            }
          })

          hlsRef.current.on(window.Hls.Events.ERROR, (event: any, data: any) => {
            if (!data.fatal) return

            reportError("fatal", `HLS Error: ${data.details || data.type}`)

            switch (data.type) {
              case window.Hls.ErrorTypes.NETWORK_ERROR:
                hlsRef.current?.startLoad()
                setTimeout(() => {
                  if (connectionStatus !== "connected" && retryCount < 5) {
                    const retryDelay = Math.floor(Math.random() * 10000) + 5000
                    setError(`Network error - Retrying (${retryCount + 1}/5)...`)
                    setTimeout(() => {
                      setRetryCount(prev => prev + 1)
                      retryStream()
                    }, retryDelay)
                  }
                }, 3000)
                break
              case window.Hls.ErrorTypes.MEDIA_ERROR:
                hlsRef.current?.recoverMediaError()
                break
              default:
                if (initTimeout) clearTimeout(initTimeout)
                setConnectionStatus("disconnected")
                setIsLoading(false)
                if (retryCount < 5) {
                  const retryDelay = Math.floor(Math.random() * 10000) + 5000
                  setError(`Stream error - Retrying (${retryCount + 1}/5)...`)
                  setTimeout(() => {
                    setRetryCount(prev => prev + 1)
                    retryStream()
                  }, retryDelay)
                } else {
                  setError(`Stream Error: ${data.details || "Failed to load stream after 5 attempts"}`)
                }
                break
            }
          })
        } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
          setPlayerType("hls")
          video.src = channel.url
          video.addEventListener("loadedmetadata", () => {
            if (initTimeout) clearTimeout(initTimeout)
            setConnectionStatus("connected")
            setIsLoading(false)
            setRetryCount(0)
            video.play().catch((err) => {
              setIsLoading(false)
            })
          })
          video.addEventListener("error", (e) => {
            if (initTimeout) clearTimeout(initTimeout)
            setConnectionStatus("disconnected")
            setIsLoading(false)
            reportError("fatal", "Native HLS playback error")
            if (retryCount < 5) {
              const retryDelay = Math.floor(Math.random() * 10000) + 5000
              setError(`HLS error - Retrying (${retryCount + 1}/5)...`)
              setTimeout(() => {
                setRetryCount(prev => prev + 1)
                retryStream()
              }, retryDelay)
            } else {
              setError("Failed to load HLS stream after 5 attempts")
            }
          })
        } else {
          setError("HLS streaming not supported in this browser")
          setIsLoading(false)
          reportError("fatal", "HLS not supported in browser")
          return
        }
      } else {
        setPlayerType("shaka")

        if (!window.shaka) {
          const script = document.createElement("script")
          script.src = "https://cdn.jsdelivr.net/npm/shaka-player@4.3.6/dist/shaka-player.compiled.js"
          script.onload = () => {
            if (initTimeout) clearTimeout(initTimeout)
            initializePlayer()
          }
          script.onerror = () => {
            setError("Failed to load video player library")
            setIsLoading(false)
            if (initTimeout) clearTimeout(initTimeout)
            reportError("library_error", "Failed to load Shaka Player")
          }
          document.head.appendChild(script)
          return
        }

        if (!window.shaka.Player.isBrowserSupported()) {
          setError("Shaka Player not supported in this browser")
          setIsLoading(false)
          reportError("fatal", "Shaka Player not supported in browser")
          return
        }

        playerRef.current = new window.shaka.Player(video)

        const isOptimized = streamingModeRef.current === "optimized"
        const isHD = streamingModeRef.current === "high-bitrate"

        playerRef.current.configure({
          streaming: {
            bufferBehind: isHD ? 180 : (isOptimized ? 20 : 60),
            bufferingGoal: isHD ? 180 : (isOptimized ? 30 : 90),
            rebufferingGoal: isHD ? 0.5 : (isOptimized ? 8 : 5),
            bufferAhead: isHD ? 180 : (isOptimized ? 20 : 60),
          },
          abr: {
            enabled: isHD ? false : true,
          },
        })

        if (channel.drm?.clearkey) {
          playerRef.current.configure({
            drm: {
              clearKeys: channel.drm.clearkey,
            },
          })
        }

        playerRef.current.addEventListener("error", (event: any) => {
          setError(`Stream error: ${event.detail.message || "Failed to load stream"}`)
          setConnectionStatus("disconnected")
          setIsLoading(false)
          reportError("fatal", `Shaka Player Error: ${event.detail.message || "Unknown error"}`)
        })

        try {
          await playerRef.current.load(channel.url)
          if (initTimeout) clearTimeout(initTimeout)
          setConnectionStatus("connected")
          setIsLoading(false)
          setRetryCount(0)

          video.play().catch((err) => {
            setIsLoading(false)
          })
        } catch (err: any) {
          setError(`Failed to load stream: ${err.message}`)
          setConnectionStatus("disconnected")
          setIsLoading(false)
          reportError("fatal", `Failed to load stream: ${err.message}`)
        }
      }

      video.addEventListener("loadstart", () => {
        setConnectionStatus("reconnecting")
      })

      video.addEventListener("canplay", () => {
        if (initTimeout) clearTimeout(initTimeout)
        setConnectionStatus("connected")
        setIsLoading(false)
        setRetryCount(0)
      })

      video.addEventListener("waiting", () => {
        setIsBuffering(true)
      })

      video.addEventListener("playing", () => {
        setIsBuffering(false)
        setConnectionStatus("connected")
        setIsLoading(false)
        trackChannelPlay()
      })

      video.addEventListener("play", () => {
        setIsPlaying(true)
      })

      video.addEventListener("pause", () => {
        setIsPlaying(false)
      })

      video.addEventListener("error", (e) => {
        setError("Video playback error")
        setConnectionStatus("disconnected")
        setIsLoading(false)
        reportError("fatal", "Video element playback error")
      })
    } catch (err: any) {
      if (initTimeout) clearTimeout(initTimeout)
      setConnectionStatus("disconnected")
      setIsLoading(false)
      reportError("fatal", `Player initialization failed: ${err.message}`)

      if (retryCount < 5) {
        const retryDelay = Math.floor(Math.random() * 10000) + 5000
        setError(`Failed to connect - Retrying (${retryCount + 1}/5)...`)
        setTimeout(() => {
          setRetryCount(prev => prev + 1)
          retryStream()
        }, retryDelay)
      } else {
        setError(err.message || "Failed to connect to stream after 5 attempts")
      }
    }
  }

  const retryStream = () => {
    initializePlayer()
  }

  const smartReopenChannel = useCallback(() => {
    wasUIHiddenRef.current = isUIHidden

    if (playerRef.current) {
      playerRef.current.destroy().catch(() => { })
      playerRef.current = null
    }
    if (hlsRef.current) {
      hlsRef.current.destroy()
      hlsRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.src = ""
      videoRef.current.load()
    }

    setIsLoading(true)
    setError(null)
    setIsBuffering(false)
    setConnectionStatus("reconnecting")
    bufferingSinceRef.current = null

    setTimeout(() => {
      initializePlayer()
      setTimeout(() => {
        if (wasUIHiddenRef.current) {
          setIsUIHidden(true)
          setShowUIButtonVisible(false)
        }
      }, 1000)
    }, 300)
  }, [channel.id, isUIHidden])

  useEffect(() => {
    if (isBuffering) {
      if (!bufferingSinceRef.current) {
        bufferingSinceRef.current = Date.now()
      }

      if (!bufferingCheckIntervalRef.current) {
        bufferingCheckIntervalRef.current = setInterval(() => {
          if (bufferingSinceRef.current && isBuffering) {
            const bufferingDuration = Date.now() - bufferingSinceRef.current

            if (bufferingDuration >= 10000) {
              if (bufferingCheckIntervalRef.current) {
                clearInterval(bufferingCheckIntervalRef.current)
                bufferingCheckIntervalRef.current = null
              }
              bufferingSinceRef.current = null
              wasUIHiddenRef.current = isUIHidden
              if (onBitrateModeChange) {
                onBitrateModeChange(streamingModeRef.current)
              } else {
                smartReopenChannel()
              }
            }
          }
        }, 2000)
      }
    } else {
      bufferingSinceRef.current = null
      if (bufferingCheckIntervalRef.current) {
        clearInterval(bufferingCheckIntervalRef.current)
        bufferingCheckIntervalRef.current = null
      }
    }

    return () => {
      if (bufferingCheckIntervalRef.current) {
        clearInterval(bufferingCheckIntervalRef.current)
        bufferingCheckIntervalRef.current = null
      }
    }
  }, [isBuffering, smartReopenChannel, isUIHidden, onBitrateModeChange])

  const togglePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause()
      } else {
        videoRef.current.play().catch(console.error)
      }
    }
  }

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted
      setIsMuted(videoRef.current.muted)
    }
  }

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      const target = embedded && containerRef.current ? containerRef.current : document.documentElement
      target.requestFullscreen()
    } else {
      document.exitFullscreen()
    }
  }

  const togglePictureInPicture = async () => {
    try {
      if (!videoRef.current) return

      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture()
      } else {
        await videoRef.current.requestPictureInPicture()
      }
    } catch (error) {
      console.error("[v0] PiP error:", error)
    }
  }

  useKeyboardShortcuts({
    onPlayPause: togglePlayPause,
    onMute: toggleMute,
    onFullscreen: toggleFullscreen,
    onPiP: togglePictureInPicture,
    onVolumeUp: () => {
      if (videoRef.current) {
        videoRef.current.volume = Math.min(1, videoRef.current.volume + 0.1)
      }
    },
    onVolumeDown: () => {
      if (videoRef.current) {
        videoRef.current.volume = Math.max(0, videoRef.current.volume - 0.1)
      }
    },
    onSeekForward: () => {
      if (videoRef.current) {
        videoRef.current.currentTime += 10
      }
    },
    onSeekBackward: () => {
      if (videoRef.current) {
        videoRef.current.currentTime -= 10
      }
    },
  })

  const saveCurrentPosition = useCallback(() => {
    if (videoRef.current && onPositionUpdate && !isLiveStream(channel)) {
      const currentTime = videoRef.current.currentTime
      if (currentTime > 0 && Math.abs(currentTime - lastSavedPosition) > 5) {
        onPositionUpdate(channel.id, currentTime)
        setLastSavedPosition(currentTime)
      }
    }
  }, [channel, onPositionUpdate, lastSavedPosition])

  useEffect(() => {
    if (!isLiveStream(channel)) {
      positionSaveIntervalRef.current = setInterval(saveCurrentPosition, 10000)

      return () => {
        if (positionSaveIntervalRef.current) {
          clearInterval(positionSaveIntervalRef.current)
        }
        saveCurrentPosition()
      }
    }
  }, [channel, saveCurrentPosition])

  const restoreSavedPosition = useCallback(async () => {
    if (videoRef.current && getSavedPosition && !isLiveStream(channel)) {
      try {
        const savedPosition = await getSavedPosition(channel.id)
        if (savedPosition > 0) {
          videoRef.current.currentTime = savedPosition
          setLastSavedPosition(savedPosition)
        }
      } catch (error) {
        console.error("[v0] Failed to restore video position:", error)
      }
    }
  }, [channel, getSavedPosition])

  useEffect(() => {
    if (videoRef.current && !isLiveStream(channel)) {
      const video = videoRef.current

      const handleLoadedMetadata = () => {
        restoreSavedPosition()
      }

      if (video.readyState >= 1) {
        restoreSavedPosition()
      } else {
        video.addEventListener("loadedmetadata", handleLoadedMetadata)
        return () => video.removeEventListener("loadedmetadata", handleLoadedMetadata)
      }
    }
  }, [channel, restoreSavedPosition])

  useEffect(() => {
    let isActive = true
    let initTimeoutId: NodeJS.Timeout | null = null

    const setupPlayer = async () => {
      if (!isActive) return

      initTimeoutId = setTimeout(() => {
        if (isActive) {
          setError("Player initialization timed out")
          setIsLoading(false)
          setConnectionStatus("disconnected")
        }
      }, 20000)

      try {
        await initializePlayer()
      } catch (err) {
        if (isActive) {
          setError("Failed to initialize player")
          setIsLoading(false)
        }
      } finally {
        if (initTimeoutId) clearTimeout(initTimeoutId)
      }
    }

    setupPlayer()

    if (isActive) {
      startViewerSession()
    }

    const timeInterval = setInterval(() => {
      const now = new Date()
      setCurrentTime(
        now.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        }),
      )
    }, 1000)

    const heartbeatInterval = setInterval(sendHeartbeat, 30000)

    return () => {
      isActive = false

      if (initTimeoutId) clearTimeout(initTimeoutId)

      if (playerRef.current) {
        playerRef.current.destroy().catch(console.error)
        playerRef.current = null
      }
      if (hlsRef.current) {
        hlsRef.current.destroy()
        hlsRef.current = null
      }

      if (videoRef.current) {
        videoRef.current.pause()
        videoRef.current.src = ""
      }

      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current)
      }
      clearInterval(timeInterval)
      clearInterval(heartbeatInterval)

      endViewerSession()
    }
  }, [channel])

  useEffect(() => {
    return () => {
      if (videoRef.current) {
        const video = videoRef.current
        video.pause()
        video.src = ""
        video.load()
      }

      if (playerRef.current) {
        playerRef.current.destroy().catch(console.error)
        playerRef.current = null
      }

      if (hlsRef.current) {
        hlsRef.current.destroy()
        hlsRef.current = null
      }

      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current)
      }
      if (bufferingTimeoutRef.current) {
        clearTimeout(bufferingTimeoutRef.current)
      }
      if (positionSaveIntervalRef.current) {
        clearInterval(positionSaveIntervalRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (isMobile && isPortrait) {
      setShowPortraitWarning(true)
      const timer = setTimeout(() => {
        setShowPortraitWarning(false)
      }, 5000)

      return () => clearTimeout(timer)
    } else {
      setShowPortraitWarning(false)
    }
  }, [isMobile, isPortrait])

  useEffect(() => {
    const savedForceAspectRatio = localStorage.getItem("pambanlo_force_aspect_ratio")
    const savedAspectRatioMode = localStorage.getItem("pambanlo_aspect_ratio_mode")

    if (savedForceAspectRatio !== null) {
      setForceAspectRatio(savedForceAspectRatio === "true")
    }
    if (savedAspectRatioMode) {
      setAspectRatioMode(savedAspectRatioMode as "16:9" | "4:3" | "original")
    }
  }, [])

  const getVideoStyle = () => {
    if (!forceAspectRatio) {
      return "object-contain"
    }
    return "object-fill"
  }

  const getContainerAspectRatio = () => {
    if (embedded) {
      return "w-full h-full"
    }
    if (!forceAspectRatio || aspectRatioMode === "original") {
      return "w-full h-full"
    }

    switch (aspectRatioMode) {
      case "16:9":
        return "w-full h-full aspect-video"
      case "4:3":
        return "w-full h-full aspect-[4/3]"
      default:
        return "w-full h-full aspect-video"
    }
  }

  useEffect(() => {
    if (!osdInput) return;

    const timeoutId = setTimeout(() => {
      const num = parseInt(osdInput, 10);
      const target = availableChannels.find((c) => (c as any).channelNumber === num);
      if (target && target.id !== channel.id) {
        onChannelChange(target.id);
      }
      setOsdInput("");
    }, 1500);

    return () => clearTimeout(timeoutId);
  }, [osdInput, availableChannels, channel.id, onChannelChange]);

  useEffect(() => {
    if (isMobile) {
      return
    }

    const handleKeyPress = (event: KeyboardEvent) => {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Enter", "Space"].includes(event.key)) {
        event.preventDefault()
      }

      switch (event.key) {
        case "Escape":
        case "Backspace":
          setShowChannelList(false)
          setShowSettings(false)
          break
        case "Enter":
        case " ":
          if (videoRef.current) {
            if (videoRef.current.paused) {
              videoRef.current.play()
            } else {
              videoRef.current.pause()
            }
          }
          break
        case "m":
        case "M":
          if (videoRef.current) {
            videoRef.current.muted = !videoRef.current.muted
            setIsMuted(videoRef.current.muted)
          }
          break
        default:
          if (/^[0-9]$/.test(event.key)) {
            setOsdInput(prev => prev + event.key)
          }
          break
      }
    }

    window.addEventListener("keydown", handleKeyPress)
    return () => window.removeEventListener("keydown", handleKeyPress)
  }, [showChannelList, isMobile])

  if (showTechnicalDifficulties && streamStatus) {
    return (
      <div className="relative w-full h-full bg-black flex items-center justify-center">
        <div className="text-center p-8 max-w-md">
          {streamStatus.custom_image_url && (
            <img
              src={streamStatus.custom_image_url || "/placeholder.svg"}
              alt="Technical Difficulties"
              className="w-full max-w-xs mx-auto mb-6 rounded-lg"
            />
          )}
          <div className="text-white text-xl font-semibold mb-4">
            {streamStatus.custom_message || "Technical Difficulties"}
          </div>
          <div className="text-gray-400 text-sm mb-6">We're working to resolve this issue. Please try again later.</div>
          <div className="flex gap-4 justify-center">
            <Button onClick={() => window.location.reload()} className="bg-orange-500 hover:bg-orange-600 text-white">
              Refresh Page
            </Button>
            <Button
              onClick={onClose}
              variant="outline"
              className="border-gray-600 text-gray-300 hover:bg-gray-800 bg-transparent"
            >
              Back to Channels
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className={`${embedded ? 'absolute inset-0' : 'fixed inset-0 z-50'} bg-black flex flex-col font-sans`}
      onMouseMove={isTraditionalMode ? undefined : () => { showControlsTemporarily(); if (isUIHidden) flashShowUIButton() }}
      onTouchStart={(e) => { handleTouchStart(e); if (isUIHidden) flashShowUIButton() }}
      onTouchMove={handleTouchMove}
      onClick={() => { if (isUIHidden) flashShowUIButton() }}
      tabIndex={0}
      onFocus={showControlsTemporarily}
      style={{
        touchAction: "manipulation",
        WebkitTouchCallout: "none",
        WebkitUserSelect: "none",
        userSelect: "none",
      }}
    >
      {showPortraitWarning && isMobile && isPortrait && !embedded && (
        <div className="fixed inset-0 bg-black z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="text-center max-w-xs">
            <div className="w-12 h-12 mx-auto mb-4 border border-white/20 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            <h3 className="text-white font-medium text-base mb-2">Rotate for Best View</h3>
            <p className="text-white/50 text-sm">Turn your device to landscape mode</p>
          </div>
        </div>
      )}

      {/* Satellite TV style OSD — shows whenever typing a number inside the player */}
      {osdInput && (
        <div className="fixed inset-0 flex items-center justify-center pointer-events-none select-none z-[999999]">
          <div
            className="flex flex-col items-center justify-center gap-3 px-12 py-8 rounded-2xl shadow-2xl"
            style={{
              background: 'rgba(30,30,30,0.72)',
              backdropFilter: 'blur(18px)',
              WebkitBackdropFilter: 'blur(18px)',
              border: '1px solid rgba(255,255,255,0.15)',
              minWidth: 220,
            }}
          >
            <span
              className="font-bold text-white leading-none tracking-widest"
              style={{ fontSize: '4.5rem', fontFamily: 'system-ui, sans-serif', textShadow: '0 2px 12px rgba(0,0,0,0.5)' }}
            >
              {osdInput.padStart(3, '0')}
            </span>
            <span
              className="text-white/90 font-semibold text-center leading-snug"
              style={{ fontSize: '1.35rem', fontFamily: 'system-ui, sans-serif', textShadow: '0 1px 6px rgba(0,0,0,0.4)', maxWidth: 260 }}
            >
              {(() => {
                const num = parseInt(osdInput, 10);
                const match = availableChannels.find(c => (c as any).channelNumber === num);
                return match ? match.name : '—';
              })()}
            </span>
          </div>
        </div>
      )}

      {/* Show UI button - visible on activity when UI is hidden, auto-hides after 3s */}
      {isUIHidden && showUIButtonVisible && (
        <button
          onClick={() => { setIsUIHidden(false); setShowUIButtonVisible(false) }}
          className="absolute top-4 right-4 z-50 flex items-center gap-1.5 bg-black/80 hover:bg-black text-white text-sm font-medium px-3 py-2 rounded-full border border-white/20 transition-opacity duration-300"
          style={{ pointerEvents: "auto", touchAction: "manipulation" }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          Show UI
        </button>
      )}

      {/* SETTINGS PANEL overlaying the STB Interface */}
      {showSettings && !isUIHidden && (
        <div
          className="absolute bottom-[180px] left-6 z-50 bg-[#111] border border-white/10 rounded-2xl p-4 w-72 shadow-2xl"
          style={{ pointerEvents: "auto" }}
        >
          {/* Quality Mode - Main Focus */}
          <div className="mb-4">
            <p className="text-white/40 text-[10px] uppercase tracking-wider mb-3 font-bold">Quality</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  if (streamingMode !== "high-bitrate") {
                    localStorage.setItem("orotv-streaming-mode", "high-bitrate")
                    streamingModeRef.current = "high-bitrate"
                    setStreamingMode("high-bitrate")
                    setShowSettings(false)
                    if (onBitrateModeChange) {
                      onBitrateModeChange("high-bitrate")
                    } else {
                      smartReopenChannel()
                    }
                  }
                }}
                className={`py-3 px-4 rounded-xl text-sm font-bold transition-all ${streamingMode === "high-bitrate"
                  ? "bg-white text-black"
                  : "bg-white/10 text-white/70 hover:bg-white/20"
                  }`}
              >
                <div className="flex flex-col items-center gap-1">
                  <span className="text-lg">HD</span>
                  <span className="text-[10px] opacity-50">Best Quality</span>
                </div>
              </button>
              <button
                onClick={() => {
                  if (streamingMode !== "optimized") {
                    localStorage.setItem("orotv-streaming-mode", "optimized")
                    streamingModeRef.current = "optimized"
                    setStreamingMode("optimized")
                    setShowSettings(false)
                    if (onBitrateModeChange) {
                      onBitrateModeChange("optimized")
                    } else {
                      smartReopenChannel()
                    }
                  }
                }}
                className={`py-3 px-4 rounded-xl text-sm font-bold transition-all ${streamingMode === "optimized"
                  ? "bg-white text-black"
                  : "bg-white/10 text-white/70 hover:bg-white/20"
                  }`}
              >
                <div className="flex flex-col items-center gap-1">
                  <span className="text-lg">SD</span>
                  <span className="text-[10px] opacity-50">Save Data</span>
                </div>
              </button>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="space-y-2">
            <button
              onClick={() => { setIsUIHidden(true); setShowSettings(false); setTimeout(() => setShowUIButtonVisible(false), 100) }}
              className="w-full flex items-center gap-3 py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
            >
              <svg className="w-5 h-5 text-white/60" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
              </svg>
              <span className="text-white/80 text-sm font-bold">Hide Controls</span>
            </button>

            <button
              onClick={() => {
                setShowSettings(false)
                if (hlsRef.current) {
                  hlsRef.current.destroy()
                  hlsRef.current = null
                }
                if (playerRef.current) {
                  playerRef.current.destroy().catch(() => { })
                  playerRef.current = null
                }
                if (videoRef.current) {
                  videoRef.current.src = ""
                  videoRef.current.load()
                }
                setIsLoading(true)
                setError(null)
                setIsBuffering(false)
                setTimeout(() => initializePlayer(), 200)
              }}
              className="w-full flex items-center gap-3 py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
            >
              <RotateCcw className="w-5 h-5 text-white/60" />
              <span className="text-white/80 text-sm font-bold">Restart Stream</span>
            </button>
          </div>
        </div>
      )}

      <div className={`flex-1 relative overflow-hidden`}>
        <div className={`absolute inset-0 flex items-center justify-center bg-black`}>
          <div className={`${getContainerAspectRatio()} max-w-full max-h-full`}>
            <video
              ref={videoRef}
              className={`w-full h-full bg-black ${embedded ? 'object-contain' : getVideoStyle()}`}
              autoPlay
              playsInline
              muted={isMuted}
              controls={false}
              crossOrigin="anonymous"
              style={{
                ...(embedded
                  ? { objectFit: 'contain' as const }
                  : forceAspectRatio && aspectRatioMode !== "original"
                    ? {
                      aspectRatio: aspectRatioMode === "16:9" ? "16/9" : aspectRatioMode === "4:3" ? "4/3" : "16/9",
                      objectFit: "fill",
                    }
                    : {}),
                WebkitAppearance: "none",
                appearance: "none",
              }}
            />
          </div>
        </div>

        {isLoading && !error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 animate-in fade-in duration-300">
            <div className="text-center">
              <div className="w-10 h-10 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-white/80 text-sm font-bold">{channel.name}</p>
            </div>
          </div>
        )}

        {!isTraditionalMode && error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 animate-in fade-in duration-300 z-50">
            <div className="max-w-sm mx-4 text-center">
              <AlertTriangle className="h-12 w-12 text-white/60 mx-auto mb-4" />
              <h3 className="text-white font-bold text-lg mb-2">Stream Unavailable</h3>
              <p className="text-white/50 text-sm mb-6">{error}</p>
              <div className="space-y-2">
                <button
                  onClick={retryStream}
                  className="w-full py-3 px-4 bg-white text-black rounded-xl font-bold transition-colors hover:bg-white/90 active:bg-white/80 touch-manipulation"
                  style={{ pointerEvents: "auto", touchAction: "manipulation" }}
                >
                  Retry
                </button>
                <button
                  onClick={onClose}
                  className="w-full py-3 px-4 bg-white/10 text-white rounded-xl font-bold transition-colors hover:bg-white/20 active:bg-white/10 touch-manipulation"
                  style={{ pointerEvents: "auto", touchAction: "manipulation" }}
                >
                  Back
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* SATELLITE TV EPG BOTTOM BAR */}
      {!isTraditionalMode && !isUIHidden && (
        <div
          className={`absolute bottom-0 left-0 right-0 z-40 bg-[#0a0a0a]/95 backdrop-blur-sm border-t border-[#333] text-white p-6 transition-all duration-300 ${showControls ? "translate-y-0 opacity-100" : "translate-y-full opacity-0 pointer-events-none"}`}
          style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 1.5rem)' }}
        >
          {/* Top Row: Channel Info & Time */}
          <div className="flex justify-between items-center mb-8">
            {/* Left side: Channel details and icons */}
            <div className="flex items-center gap-4 flex-wrap">
              <span className="text-2xl font-black tracking-wider w-12 text-center">
                {String(currentChannelIndex + 1).padStart(3, '0')}
              </span>

              <div className="relative h-10 w-16 bg-white/5 rounded-md flex items-center justify-center overflow-hidden border border-white/10">
                <img
                  src={channel.logo || "/placeholder.svg?height=40&width=64"}
                  alt={channel.name}
                  className="h-full w-full object-contain p-1"
                />
              </div>

              <span className="text-2xl font-bold tracking-tight ml-2 truncate max-w-[200px] md:max-w-none">
                {channel.name.toUpperCase()}
              </span>

              <span className="border border-white/40 text-[10px] font-black px-1.5 py-0.5 rounded bg-white/10 ml-2">
                {channel.isHD ? 'HD' : 'SD'}
              </span>

              {/* Action Icons */}
              <div className="flex items-center gap-1 sm:gap-1.5 ml-2 sm:ml-4" style={{ pointerEvents: "auto" }}>
                {/* Restored Media Controls */}
                {!isMobile && (
                  <button onClick={() => switchChannel("prev")} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/70 hover:text-white" title="Previous Channel">
                    <SkipBack className="w-4 h-4" />
                  </button>
                )}

                <button onClick={togglePlayPause} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/70 hover:text-white" title="Play/Pause">
                  {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                </button>

                {!isMobile && (
                  <button onClick={() => switchChannel("next")} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/70 hover:text-white" title="Next Channel">
                    <SkipForward className="w-4 h-4" />
                  </button>
                )}

                <button onClick={toggleMute} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/70 hover:text-white" title="Volume">
                  {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </button>

                <button onClick={toggleFullscreen} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/70 hover:text-white hidden sm:block" title="Fullscreen">
                  {document.fullscreenElement ? <Minimize className="w-5 h-5" /> : <Expand className="w-5 h-5" />}
                </button>

                <div className="w-px h-5 bg-white/20 mx-1 hidden sm:block"></div>

                {/* STB Accented Icons (Matching Reference Image) */}
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className="p-2 bg-white hover:bg-gray-200 rounded-full transition-colors active:scale-95 shadow-md"
                  title="Settings"
                >
                  <Settings className="w-5 h-5 text-black" />
                </button>
                {!isMobile && (
                  <button
                    onClick={togglePictureInPicture}
                    className="p-2 bg-white hover:bg-gray-200 rounded-full transition-colors active:scale-95 shadow-md"
                    title="Picture-in-Picture"
                  >
                    <PictureInPicture className="w-5 h-5 text-black" />
                  </button>
                )}
              </div>
            </div>

            {/* Right side: Live badge, Time, Close */}
            <div className="flex items-center gap-5">
              <span className="bg-[#2a2a2a] text-white/90 text-[11px] font-black px-3 py-1 rounded-full border border-[#444] tracking-widest hidden sm:block">
                LIVE
              </span>
              <span className="text-xl md:text-2xl font-bold tracking-tight tabular-nums">
                {currentTime || "00:00"}
              </span>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-full transition-colors ml-2"
                style={{ pointerEvents: "auto" }}
              >
                <X className="w-6 h-6 text-white/70 hover:text-white" />
              </button>
            </div>
          </div>

          {/* Bottom Row: EPG Columns */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-12 relative">
            {/* NOW */}
            <div className="relative">
              <div className="text-[11px] text-white/40 font-black mb-2 tracking-widest uppercase">NOW</div>
              <div className="font-bold text-sm md:text-base mb-3 truncate pr-4 text-white">
                {nowProg?.title || "No Information Available"}
              </div>
              <div className="flex items-center gap-4">
                {nowProg?.start ? (
                  <>
                    <div className="flex-1 h-1.5 bg-[#222] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-white transition-all duration-1000 ease-linear"
                        style={{ width: `${calculateProgress(nowProg.start, nowProg.stop)}%` }}
                      ></div>
                    </div>
                    <div className="text-[11px] text-white/50 font-medium whitespace-nowrap">
                      {formatTime(nowProg.start)} - {formatTime(nowProg.stop)}
                    </div>
                  </>
                ) : (
                  <div className="text-[11px] text-white/50 font-medium whitespace-nowrap">
                    --:-- - --:--
                  </div>
                )}
              </div>
            </div>

            {/* NEXT */}
            <div className="relative md:border-l border-[#222] md:pl-8 hidden sm:block">
              <div className="text-[11px] text-white/40 font-black mb-2 tracking-widest uppercase">NEXT</div>
              <div className="font-bold text-sm md:text-base mb-3 truncate pr-4 text-white">
                {nextProg?.title || "No Information Available"}
              </div>
              <div className="text-[11px] text-white/50 font-medium">
                {nextProg?.start ? formatTime(nextProg.start) : "--:--"}
              </div>
            </div>

            {/* LATER */}
            <div className="relative md:border-l border-[#222] md:pl-8 hidden md:block">
              <div className="text-[11px] text-white/40 font-black mb-2 tracking-widest uppercase">LATER</div>
              <div className="font-bold text-sm md:text-base mb-3 truncate pr-4 text-white">
                {laterProg?.title || "No Information Available"}
              </div>
              <div className="text-[11px] text-white/50 font-medium">
                {laterProg?.start ? formatTime(laterProg.start) : "--:--"}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}