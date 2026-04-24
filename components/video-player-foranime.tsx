"use client"

import type React from "react"

import { useEffect, useRef, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
  Signal,
  List,
  AlertTriangle,
  RotateCcw,
  LogOut,
  Expand,
  Settings,
  Info,
} from "lucide-react"
import type { VideoPlayerProps } from "@/types/video-player"

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
  getSavedPosition?: (channelId: string) => Promise<number> // Make async for Supabase
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
}: ExtendedVideoPlayerProps) {
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
  const [showEPGOverlay, setShowEPGOverlay] = useState(false)
  const [streamStatus, setStreamStatus] = useState<any>(null)
  const [showTechnicalDifficulties, setShowTechnicalDifficulties] = useState(false)
  const [viewerSessionId, setViewerSessionId] = useState<string | null>(null)

  const [lastSavedPosition, setLastSavedPosition] = useState(0)
  const positionSaveIntervalRef = useRef<NodeJS.Timeout>()

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
            url: channel.url,
            timestamp: new Date().toISOString(),
            user_agent: navigator.userAgent,
          },
        }),
      })
      console.log("[v0] Error reported automatically")
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
        body: JSON.JSON.stringify({
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

  const setHighestQuality = useCallback(() => {
    try {
      if (playerType === "hls" && hlsRef.current) {
        // For HLS streams, set to highest quality level
        const levels = hlsRef.current.levels
        if (levels && levels.length > 0) {
          // Find the highest quality level (highest bitrate)
          let highestLevel = 0
          let highestBitrate = 0

          levels.forEach((level: any, index: number) => {
            if (level.bitrate > highestBitrate) {
              highestBitrate = level.bitrate
              highestLevel = index
            }
          })

          hlsRef.current.currentLevel = highestLevel
        }
      } else if (playerType === "shaka" && playerRef.current) {
        // For DASH streams, set to highest quality
        const tracks = playerRef.current.getVariantTracks()
        if (tracks && tracks.length > 0) {
          // Find the highest quality track (highest bandwidth)
          let highestTrack = tracks[0]
          let highestBandwidth = 0

          tracks.forEach((track: any) => {
            if (track.bandwidth > highestBandwidth) {
              highestBandwidth = track.bandwidth
              highestTrack = track
            }
          })

          playerRef.current.selectVariantTrack(highestTrack, true)
        }
      }
    } catch (error) {}
  }, [playerType])

  const currentChannelIndex = availableChannels.findIndex((ch) => ch.id === channel.id)

  const getCurrentProgram = () => {
    if (!currentPrograms || !epgData) return null

    // Try multiple matching strategies
    let currentProg = null

    // Direct match by channel name
    if (currentPrograms[channel.name]) {
      currentProg = currentPrograms[channel.name]
    }

    // If no direct match, try EPG data matching
    if (!currentProg && epgData && typeof epgData === "object") {
      const epgEntry = Object.values(epgData).find((epg: any) => {
        if (!epg || !epg.name) return false
        const epgName = epg.name.toLowerCase().trim()
        const channelName = channel.name.toLowerCase().trim()

        // Direct match
        if (epgName === channelName) return true

        // Contains match
        if (epgName.includes(channelName) || channelName.includes(epgName)) return true

        // Remove spaces and special characters for matching
        const cleanEpgName = epgName.replace(/[\s\-_.]/g, "")
        const cleanChannelName = channelName.replace(/[\s\-_.]/g, "")

        return cleanEpgName.includes(cleanChannelName) || cleanChannelName.includes(cleanEpgName)
      }) as any

      if (epgEntry && currentPrograms[epgEntry.id]) {
        currentProg = currentPrograms[epgEntry.id]
      }
    }

    return currentProg
  }

  const getNextProgram = () => {
    if (!epgData || typeof epgData !== "object") return null

    // Find matching EPG entry for current channel
    const epgEntry = Object.values(epgData).find((epg: any) => {
      if (!epg || !epg.name) return false
      const epgName = epg.name.toLowerCase().trim()
      const channelName = channel.name.toLowerCase().trim()

      // Direct match
      if (epgName === channelName) return true

      // Contains match
      if (epgName.includes(channelName) || channelName.includes(epgName)) return true

      // Remove spaces and special characters for matching
      const cleanEpgName = epgName.replace(/[\s\-_.]/g, "")
      const cleanChannelName = channelName.replace(/[\s\-_.]/g, "")

      return cleanEpgName.includes(cleanChannelName) || cleanChannelName.includes(cleanEpgName)
    }) as any

    if (!epgEntry || !epgEntry.programmes) return null

    const now = new Date()
    const programmes = epgEntry.programmes

    // Find the next program after current time
    const nextProg = programmes.find((prog: any) => {
      if (!prog.start) return false

      const startTime = new Date(
        prog.start.replace(/(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2}) (.+)/, "$1-$2-$3T$4:$5:$6"),
      )

      return startTime > now
    })

    return nextProg || null
  }

  const formatTime = (dateString: string) => {
    if (!dateString) return ""

    try {
      let date: Date

      // Check if it's already in ISO format or a standard date string
      if (dateString.includes("T") || dateString.includes("-")) {
        date = new Date(dateString)
      } else {
        // Handle XMLTV format: YYYYMMDDHHMMSS +TIMEZONE
        const match = dateString.match(/(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})\s*(.+)?/)
        if (match) {
          const [, year, month, day, hour, minute, second] = match
          date = new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}`)
        } else {
          date = new Date(dateString)
        }
      }

      // Check if date is valid
      if (isNaN(date.getTime())) {
        console.log("[v0] Invalid date string:", dateString)
        return "Invalid time"
      }

      return date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })
    } catch (error) {
      console.log("[v0] Error formatting time:", error, "for dateString:", dateString)
      return "Invalid time"
    }
  }

  const isM3u8Stream = (url: string) => {
    return url.includes(".m3u8") || url.includes("m3u8")
  }

  const getTimeRemaining = () => {
    if (!user) return "Guest"
    if (user.isPermanent) return "Permanent"
    const remaining = new Date(user.expiresAt).getTime() - new Date().getTime()
    const hours = Math.floor(remaining / (1000 * 60 * 60))
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60))
    return `${hours}h ${minutes}m remaining`
  }

  const showControlsTemporarily = useCallback(() => {
    if (isTraditionalMode) return
    setShowControls(true)
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current)
    }
    controlsTimeoutRef.current = setTimeout(
      () => {
        setShowControls(false)
      },
      isMobile ? 4000 : 3000,
    ) // Longer timeout for mobile
  }, [isTraditionalMode, isMobile])

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (isTraditionalMode) return
      showControlsTemporarily()

      // Prevent default to avoid unwanted scrolling
      if (e.touches.length === 1) {
        e.preventDefault()
      }
    },
    [isTraditionalMode, showControlsTemporarily],
  )

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    // Prevent scrolling when touching video area
    if (e.touches.length === 1) {
      e.preventDefault()
    }
  }, [])

  const isLiveStream = (channel: Channel): boolean => {
    // Most channels are live streams, only save position for VOD content
    // You can customize this logic based on your channel types
    return !channel.url?.includes("vod") && !channel.url?.includes("replay")
  }

  const initializePlayer = async () => {
    if (showTechnicalDifficulties) {
      setIsLoading(false)
      return
    }

    if (!videoRef.current) {
      console.log("[v0] Video ref not available")
      return
    }

    try {
      console.log("[v0] Initializing player for channel:", channel.name, "URL:", channel.url)
      setIsLoading(true)
      setError(null)
      setConnectionStatus("reconnecting")

      const video = videoRef.current

      // Clean up existing players
      if (playerRef.current) {
        console.log("[v0] player destroy shaka")
        await playerRef.current.destroy()
        playerRef.current = null
      }
      if (hlsRef.current) {
        console.log("[v0] Player destroy hls js")
        hlsRef.current.destroy()
        hlsRef.current = null
      }

      // Reset video element
      video.src = ""
      video.load()

      const isAndroidTV = /android.*tv|googletv|androidtv|smart-tv|smarttv/i.test(navigator.userAgent.toLowerCase())

      if (isM3u8Stream(channel.url)) {
        console.log("[v0] Detected m3u8 stream, using HLS.js player")
        setPlayerType("hls")

        // Load HLS.js if not available
        if (!window.Hls) {
          console.log("[v0] Loading HLS.js library")
          const script = document.createElement("script")
          script.src = "https://cdn.jsdelivr.net/npm/hls.js@latest"
          script.onload = () => {
            console.log("[v0] HLS.js loaded, reinitializing")
            initializePlayer()
          }
          script.onerror = () => {
            console.error("[v0] Failed to load HLS.js")
            setError("Failed to load video player library")
            setIsLoading(false)
            reportError("library_error", "Failed to load HLS.js")
          }
          document.head.appendChild(script)
          return
        }

        if (window.Hls.isSupported()) {
          console.log("[v0] HLS.js is supported, creating player")
          hlsRef.current = new window.Hls({
            enableWorker: !isAndroidTV,
            lowLatencyMode: false,
            backBufferLength: isAndroidTV ? 30 : 90,
            maxBufferLength: isAndroidTV ? 60 : 300,
            maxMaxBufferLength: isAndroidTV ? 120 : 600,
            manifestLoadingTimeOut: isAndroidTV ? 20000 : 10000,
            manifestLoadingMaxRetry: isAndroidTV ? 6 : 3,
            levelLoadingTimeOut: isAndroidTV ? 20000 : 10000,
            fragLoadingTimeOut: isAndroidTV ? 30000 : 20000,
          })

          hlsRef.current.loadSource(channel.url)
          hlsRef.current.attachMedia(video)

          hlsRef.current.on(window.Hls.Events.MANIFEST_PARSED, () => {
            console.log("[v0] HLS manifest parsed successfully")
            setConnectionStatus("connected")
            setIsLoading(false)

            setTimeout(() => {
              setHighestQuality()
            }, 1000)

            const playPromise = video.play()
            if (playPromise !== undefined) {
              playPromise.catch((err) => {
                console.error("[v0] Failed to autoplay:", err)
                setIsLoading(false)
              })
            }
          })

          hlsRef.current.on(window.Hls.Events.LEVEL_LOADED, () => {
            setTimeout(() => {
              setHighestQuality()
            }, 500)
          })

          hlsRef.current.on(window.Hls.Events.ERROR, (event: any, data: any) => {
            console.error("[v0] HLS.js error:", data)
            reportError(data.fatal ? "fatal" : "non_fatal", `HLS Error: ${data.details || data.type}`)

            if (data.fatal) {
              switch (data.type) {
                case window.Hls.ErrorTypes.NETWORK_ERROR:
                  console.log("[v0] Network error, attempting recovery")
                  hlsRef.current?.startLoad()
                  break
                case window.Hls.ErrorTypes.MEDIA_ERROR:
                  console.log("[v0] Media error, attempting recovery")
                  hlsRef.current?.recoverMediaError()
                  break
                default:
                  setError(`Stream Error: ${data.details || "Failed to load stream"}`)
                  setConnectionStatus("disconnected")
                  setIsLoading(false)
                  break
              }
            }
          })
        } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
          // Safari native HLS support
          console.log("[v0] Using native HLS support")
          setPlayerType("hls")
          video.src = channel.url
          video.addEventListener("loadedmetadata", () => {
            console.log("[v0] Native HLS metadata loaded")
            setConnectionStatus("connected")
            setIsLoading(false)
            video.play().catch((err) => {
              console.error("[v0] Failed to autoplay:", err)
              setIsLoading(false)
            })
          })
          video.addEventListener("error", (e) => {
            console.error("[v0] Native HLS error:", e)
            setError("Failed to load HLS stream")
            setConnectionStatus("disconnected")
            setIsLoading(false)
            reportError("fatal", "Native HLS playback error")
          })
        } else {
          console.error("[v0] HLS not supported")
          setError("HLS streaming not supported in this browser")
          setIsLoading(false)
          reportError("fatal", "HLS not supported in browser")
          return
        }
      } else {
        console.log("[v0] Using Shaka Player for DASH/MPD stream")
        setPlayerType("shaka")

        if (!window.shaka) {
          console.log("[v0] Loading Shaka Player library")
          const script = document.createElement("script")
          script.src = "https://cdn.jsdelivr.net/npm/shaka-player@4.3.6/dist/shaka-player.compiled.js"
          script.onload = () => {
            console.log("[v0] Shaka Player loaded, reinitializing")
            initializePlayer()
          }
          script.onerror = () => {
            console.error("[v0] Failed to load Shaka Player")
            setError("Failed to load video player library")
            setIsLoading(false)
            reportError("library_error", "Failed to load Shaka Player")
          }
          document.head.appendChild(script)
          return
        }

        if (!window.shaka.Player.isBrowserSupported()) {
          console.error("[v0] Shaka Player not supported")
          setError("Shaka Player not supported in this browser")
          setIsLoading(false)
          reportError("fatal", "Shaka Player not supported in browser")
          return
        }

        console.log("[v0] Creating Shaka Player instance")
        playerRef.current = new window.shaka.Player(video)

        if (isAndroidTV) {
          playerRef.current.configure({
            streaming: {
              bufferBehind: 30,
              bufferingGoal: 60,
              rebufferingGoal: 10,
              bufferAhead: 30,
            },
            manifest: {
              retryParameters: {
                timeout: 20000,
                maxAttempts: 6,
                baseDelay: 2000,
                backoffFactor: 2,
                fuzzFactor: 0.5,
              },
            },
          })
        }

        if (channel.drm?.clearkey) {
          console.log("[v0] Configuring DRM clearkeys")
          playerRef.current.configure({
            drm: {
              clearKeys: channel.drm.clearkey,
            },
          })
        }

        playerRef.current.addEventListener("error", (event: any) => {
          console.error("[v0] Shaka Player error:", event.detail)
          setError(`Stream error: ${event.detail.message || "Failed to load stream"}`)
          setConnectionStatus("disconnected")
          setIsLoading(false)
          reportError("fatal", `Shaka Player Error: ${event.detail.message || "Unknown error"}`)
        })

        try {
          console.log("[v0] Loading stream URL:", channel.url)
          await playerRef.current.load(channel.url)
          console.log("[v0] Stream loaded successfully")
          setConnectionStatus("connected")
          setIsLoading(false)

          setTimeout(() => {
            setHighestQuality()
          }, 1000)

          video.play().catch((err) => {
            console.error("[v0] Failed to autoplay:", err)
            setIsLoading(false)
          })
        } catch (err: any) {
          console.error("[v0] Failed to load stream:", err)
          setError(`Failed to load stream: ${err.message}`)
          setConnectionStatus("disconnected")
          setIsLoading(false)
          reportError("fatal", `Failed to load stream: ${err.message}`)
        }
      }

      // Common video event listeners
      video.addEventListener("loadstart", () => {
        console.log("[v0] Video load started")
        setConnectionStatus("reconnecting")
      })

      video.addEventListener("canplay", () => {
        console.log("[v0] Video can play")
        setConnectionStatus("connected")
        setIsLoading(false)

        setTimeout(() => {
          setHighestQuality()
        }, 2000)
      })

      video.addEventListener("waiting", () => {
        console.log("[v0] Video waiting/buffering")
        setIsBuffering(true)
      })

      video.addEventListener("playing", () => {
        console.log("[v0] Video playing")
        setIsBuffering(false)
        setConnectionStatus("connected")
        setIsLoading(false)
        trackChannelPlay()
      })

      video.addEventListener("play", () => {
        console.log("[v0] Video play event")
        setIsPlaying(true)
      })

      video.addEventListener("pause", () => {
        console.log("[v0] Video pause event")
        setIsPlaying(false)
      })

      video.addEventListener("error", (e) => {
        console.error("[v0] Video element error:", e)
        setError("Video playback error")
        setConnectionStatus("disconnected")
        setIsLoading(false)
        reportError("fatal", "Video element playback error")
      })
    } catch (err: any) {
      console.error("[v0] Failed to initialize player:", err)
      setError(err.message || "Failed to connect to stream")
      setConnectionStatus("disconnected")
      setIsLoading(false)
      reportError("fatal", `Player initialization failed: ${err.message}`)
    }
  }

  const retryStream = () => {
    setRetryCount((prev) => prev + 1)
    initializePlayer()
  }

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
      document.documentElement.requestFullscreen()
    } else {
      document.exitFullscreen()
    }
  }

  const switchChannel = (direction: "prev" | "next") => {
    const newIndex =
      direction === "next"
        ? (currentChannelIndex + 1) % availableChannels.length
        : (currentChannelIndex - 1 + availableChannels.length) % availableChannels.length

    onChannelChange(availableChannels[newIndex].id)
  }

  const selectChannel = (channelId: string) => {
    onChannelChange(channelId)
    setShowChannelList(false)
  }

  const getConnectionColor = () => {
    switch (connectionStatus) {
      case "connected":
        return "text-green-500"
      case "disconnected":
        return "text-destructive"
      case "reconnecting":
        return "text-yellow-500"
      default:
        return "text-muted-foreground"
    }
  }

  const getConnectionIcon = () => {
    switch (connectionStatus) {
      case "connected":
        return <Signal className="h-4 w-4" />
      case "disconnected":
        return <AlertTriangle className="h-4 w-4" />
      case "reconnecting":
        return <RotateCcw className="h-4 w-4 animate-spin" />
      default:
        return <Signal className="h-4 w-4" />
    }
  }

  const saveCurrentPosition = useCallback(() => {
    if (videoRef.current && onPositionUpdate && !isLiveStream(channel)) {
      const currentTime = videoRef.current.currentTime
      if (currentTime > 0 && Math.abs(currentTime - lastSavedPosition) > 5) {
        onPositionUpdate(channel.id, currentTime)
        setLastSavedPosition(currentTime)
        console.log(`[v0] Saved position for ${channel.name}: ${currentTime}s`)
      }
    }
  }, [channel, onPositionUpdate, lastSavedPosition]) // Fixed dependency to use channel instead of channel.id and channel.name

  useEffect(() => {
    if (!isLiveStream(channel)) {
      positionSaveIntervalRef.current = setInterval(saveCurrentPosition, 10000) // Save every 10 seconds

      return () => {
        if (positionSaveIntervalRef.current) {
          clearInterval(positionSaveIntervalRef.current)
        }
        // Save position one final time when component unmounts
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
          console.log(`[v0] Restored position for ${channel.name}: ${savedPosition}s`)
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
    console.log("[v0] Channel changed, initializing player")
    initializePlayer()

    startViewerSession()

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

    const epgUpdateInterval = setInterval(() => {
      console.log("[v0] Video player requesting EPG update...")
      // Trigger a re-render to get fresh EPG data from parent
      setCurrentTime((prev) => prev) // Force re-render
    }, 60000)

    const heartbeatInterval = setInterval(sendHeartbeat, 30000)

    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current)
      }
      clearInterval(timeInterval)
      clearInterval(epgUpdateInterval)
      clearInterval(heartbeatInterval)

      endViewerSession()
    }
  }, [channel])

  useEffect(() => {
    return () => {
      console.log("[v0] VideoPlayer component unmounting, cleaning up...")

      // Stop and clean up video element
      if (videoRef.current) {
        const video = videoRef.current
        video.pause()
        video.src = ""
        video.load()
        console.log("[v0] Video element cleaned up")
      }

      // Clean up players
      if (playerRef.current) {
        console.log("[v0] Destroying Shaka player on unmount")
        playerRef.current.destroy().catch(console.error)
        playerRef.current = null
      }

      if (hlsRef.current) {
        console.log("[v0] Destroying HLS player on unmount")
        hlsRef.current.destroy()
        hlsRef.current = null
      }

      // Clear all timeouts
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current)
      }
      if (bufferingTimeoutRef.current) {
        clearTimeout(bufferingTimeoutRef.current)
      }
      if (positionSaveIntervalRef.current) {
        clearInterval(positionSaveIntervalRef.current)
      }

      console.log("[v0] VideoPlayer cleanup complete")
    }
  }, []) // Empty dependency array means this runs only on unmount

  useEffect(() => {
    if (isMobile && isPortrait) {
      setShowPortraitWarning(true)
      const timer = setTimeout(() => {
        setShowPortraitWarning(false)
      }, 5000) // Show for 5 seconds

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

  const updateAspectRatioSettings = (force: boolean, mode: "16:9" | "4:3" | "original") => {
    setForceAspectRatio(force)
    setAspectRatioMode(mode)
    localStorage.setItem("pambanlo_force_aspect_ratio", force.toString())
    localStorage.setItem("pambanlo_aspect_ratio_mode", mode)
  }

  const getVideoStyle = () => {
    if (!forceAspectRatio) {
      return "object-contain" // Original behavior
    }

    return "object-fill"
  }

  const getContainerAspectRatio = () => {
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
    if (isMobile) {
      // Mobile devices don't need keyboard shortcuts
      return
    }

    const handleKeyPress = (event: KeyboardEvent) => {
      // Prevent default for navigation keys
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Enter", "Space"].includes(event.key)) {
        event.preventDefault()
      }

      switch (event.key) {
        case "i":
        case "I":
          setShowEPGOverlay(!showEPGOverlay)
          break
        case "Escape":
        case "Backspace":
          setShowEPGOverlay(false)
          setShowChannelList(false)
          break
        case "Enter":
        case " ":
          // Toggle play/pause
          if (videoRef.current) {
            if (videoRef.current.paused) {
              videoRef.current.play()
            } else {
              videoRef.current.pause()
            }
          }
          break
        case "ArrowUp":
          setShowChannelList(true)
          break
        case "ArrowDown":
          setShowChannelList(false)
          break
        case "m":
        case "M":
          // Toggle mute
          if (videoRef.current) {
            videoRef.current.muted = !videoRef.current.muted
            setIsMuted(videoRef.current.muted)
          }
          break
      }
    }

    window.addEventListener("keydown", handleKeyPress)
    return () => window.removeEventListener("keydown", handleKeyPress)
  }, [showEPGOverlay, showChannelList, isMobile])

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
      className="fixed inset-0 bg-black z-50 flex flex-col"
      onMouseMove={isTraditionalMode ? undefined : showControlsTemporarily}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      tabIndex={0}
      onFocus={showControlsTemporarily}
      style={{
        touchAction: "manipulation",
        WebkitTouchCallout: "none",
        WebkitUserSelect: "none",
        userSelect: "none",
      }}
    >
      {showPortraitWarning && isMobile && isPortrait && (
        <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-6">
          <div className="bg-gray-900 border border-red-500/50 rounded-xl p-8 max-w-sm text-center">
            <div className="mb-6">
              <div className="w-16 h-16 mx-auto mb-4 bg-red-500/20 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
              </div>
              <h3 className="text-foreground font-bold text-xl mb-3">Better Experience Available</h3>
              <p className="text-gray-400 text-sm mb-6">
                I Recommend Playing <span className="text-red-400 font-semibold">"{channel.name}"</span> on landscape
                mode, thank you!
              </p>
            </div>
            <div className="flex items-center justify-center space-x-2 text-xs text-gray-400">
              <div className="w-2 h-2 bg-red-500/20 rounded-full animate-pulse"></div>
              <span>Rotate your device for the best viewing experience</span>
            </div>
          </div>
        </div>
      )}

      {isTraditionalMode && showChannelNumberOverlay && channelNumberInput && (
        <div className="fixed top-4 right-4 z-[99999] bg-black/30 text-foreground p-4 rounded-lg border-2 border-gray-500 shadow-2xl pointer-events-none animate-in fade-in duration-200">
          <div className="flex items-center space-x-3 mb-2">
            <div className="text-2xl font-bold text-gray-300">{channelNumberInput}</div>
            <div className="text-sm text-muted-foreground">
              {(() => {
                const foundChannel = availableChannels.find(
                  (ch, index) => (index + 1).toString() === channelNumberInput,
                )
                return foundChannel ? foundChannel.name : "Channel not found"
              })()}
            </div>
          </div>
          <div className="flex items-center space-x-2 mt-3 text-xs text-muted-foreground">
            <span>Playing in 3 seconds...</span>
          </div>
        </div>
      )}

      {isTraditionalMode && (
        <div
          className={`fixed top-4 right-4 z-[99998] bg-black/30 text-foreground p-3 rounded-lg shadow-xl border border-white/20 transition-all duration-300 ${
            showChannelInfo ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4 pointer-events-none"
          }`}
          onMouseEnter={onChannelInfoHover}
        >
          <div className="flex items-center space-x-3">
            <img
              src={channel.logo || "/placeholder.svg?height=32&width=32&text=TV"}
              alt={channel.name}
              className="h-8 w-8 rounded object-cover"
            />
            <div className="text-foreground">
              <div className="text-sm font-medium">{channel.name}</div>
              <div className="text-xs text-muted-foreground">
                Channel {currentChannelIndex + 1} • {channel.category}
                {channel.isHD && " • HD"}
              </div>
            </div>
          </div>
        </div>
      )}

      {!isTraditionalMode && (
        <div
          className={`absolute top-0 left-0 right-0 z-20 hotel-video-controls ${
            showControls ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
        >
          <div className={`flex items-center justify-between ${isMobile ? "p-3" : "p-6"}`}>
            <div className="flex items-center space-x-4">
              <Button
                onClick={onClose}
                variant="ghost"
                size={isMobile ? "sm" : "sm"}
                className={`text-foreground hover:bg-white/20 active:bg-white/10 focus:bg-white/10 rounded-full transition-all duration-200 touch-manipulation ${
                  isMobile ? "h-12 w-12 min-h-[48px] min-w-[48px]" : "h-8 w-8"
                }`}
                style={{
                  pointerEvents: "auto",
                  touchAction: "manipulation",
                  WebkitTapHighlightColor: "transparent",
                }}
              >
                <X className={`${isMobile ? "h-6 w-6" : "h-5 w-5"}`} />
              </Button>
              <div className="text-foreground">
                <div
                  className={`${isMobile ? "text-base" : "text-lg"} font-bold text-white`}
                >
                  Now Playing {channel.name}
                </div>
                <div className={`${isMobile ? "text-xs" : "text-sm"} text-muted-foreground`}>welcome.</div>
              </div>
            </div>

            <div className={`flex items-center space-x-2 ${isMobile ? "space-x-3" : "space-x-6"}`}>
              <div
                className={`flex items-center space-x-2 ${isMobile ? "text-xs" : "text-sm"} ${getConnectionColor()}`}
              >
                {getConnectionIcon()}
                <span className="capitalize font-medium">{connectionStatus}</span>
                {playerType && (
                  <Badge
                    variant="outline"
                    className={`${isMobile ? "text-xs px-1 py-0" : "text-xs px-2 py-0.5"} border-white/30 text-foreground`}
                  >
                    {playerType === "hls" ? "HLS" : "DASH"}
                  </Badge>
                )}
              </div>

              {!isMobile && <div className="text-foreground text-sm font-medium">{currentTime}</div>}

              <Badge
                variant="secondary"
                className={`bg-white/20 text-foreground border-white/30 ${isMobile ? "text-xs px-2 py-1" : ""}`}
              >
                {currentChannelIndex + 1} / {availableChannels.length}
              </Badge>

              <Button
                onClick={() => setShowSettings(!showSettings)}
                variant="ghost"
                size="sm"
                className="text-foreground hover:bg-gray-400/20 active:bg-gray-400/10 focus:bg-gray-400/10 rounded-full transition-all duration-200 touch-manipulation"
                style={{ pointerEvents: "auto", touchAction: "manipulation" }}
              >
                <Settings className="h-4 w-4" />
              </Button>

              {user && !isMobile && (
                <Button
                  onClick={onLogout}
                  variant="ghost"
                  size="sm"
                  className="text-white hover:bg-white/20 active:bg-white/10 focus:bg-white/10 rounded-full transition-all duration-200 touch-manipulation"
                  style={{ pointerEvents: "auto", touchAction: "manipulation" }}
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {showSettings && (
        <div className="absolute top-20 right-6 z-30 bg-black/60 border border-white/20 rounded-xl p-6 min-w-80">
          <h3 className={`text-foreground font-bold ${isMobile ? "mb-4 text-lg" : "mb-6 text-xl"}`}>Video Settings</h3>

          <div className="space-y-4">
            <div>
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={forceAspectRatio}
                  onChange={(e) => updateAspectRatioSettings(e.target.checked, aspectRatioMode)}
                  className="w-4 h-4 text-red-600 bg-gray-800 border-gray-600 rounded focus:ring-red-500"
                />
                <span className="text-foreground text-sm">Force Aspect Ratio</span>
              </label>
              <p className="text-muted-foreground text-xs mt-1 ml-7">
                Stretch video to fit selected aspect ratio (recommended for consistent viewing)
              </p>
            </div>

            {forceAspectRatio && (
              <div>
                <label className="text-foreground text-sm font-medium mb-2 block">Aspect Ratio Mode</label>
                <div className="space-y-2">
                  {[
                    { value: "16:9", label: "16:9 (Widescreen)", description: "Standard HD format" },
                    { value: "4:3", label: "4:3 (Traditional)", description: "Classic TV format" },
                    { value: "original", label: "Original", description: "Keep source aspect ratio" },
                  ].map((option) => (
                    <label key={option.value} className="flex items-start space-x-3 cursor-pointer">
                      <input
                        type="radio"
                        name="aspectRatio"
                        value={option.value}
                        checked={aspectRatioMode === option.value}
                        onChange={(e) =>
                          updateAspectRatioSettings(forceAspectRatio, e.target.value as "16:9" | "4:3" | "original")
                        }
                        className="w-4 h-4 text-red-600 bg-gray-800 border-gray-600 focus:ring-red-500 mt-0.5"
                      />
                      <div>
                        <span className="text-foreground text-sm">{option.label}</span>
                        <p className="text-muted-foreground text-xs">{option.description}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-white/10">
            <Button
              onClick={() => setShowSettings(false)}
              className="w-full bg-gray-500 hover:bg-gray-600 active:bg-gray-700 focus:bg-gray-600 transition-all duration-200 touch-manipulation"
              style={{ pointerEvents: "auto", touchAction: "manipulation" }}
            >
              Apply Settings
            </Button>
          </div>
        </div>
      )}

      <div className="flex-1 relative overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center bg-black">
          <div className={`${getContainerAspectRatio()} max-w-full max-h-full`}>
            <video
              ref={videoRef}
              className={`w-full h-full bg-black ${getVideoStyle()}`}
              autoPlay
              playsInline
              muted={isMuted}
              controls={false}
              crossOrigin="anonymous"
              style={{
                ...(forceAspectRatio && aspectRatioMode !== "original"
                  ? {
                      aspectRatio: aspectRatioMode === "16:9" ? "16/9" : aspectRatioMode === "4/3" ? "4/3" : "16/9",
                      objectFit: "fill",
                    }
                  : {}),
                WebkitAppearance: "none",
                appearance: "none",
              }}
            />
          </div>
        </div>

        {showEPGOverlay && !isLoading && !error && (
          <div
            className="absolute bottom-0 left-0 right-0 z-30 bg-gradient-to-t from-black/90 via-black/70 to-transparent p-6"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowEPGOverlay(false)
              }
            }}
          >
            <div className="max-w-4xl mx-auto">
              <div className="flex justify-between items-center mb-2">
                {isMobile && (
                  <button
                    onClick={() => setShowEPGOverlay(!showEPGOverlay)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium touch-manipulation min-h-[48px] min-w-[48px] flex items-center justify-center"
                    style={{ pointerEvents: "auto", touchAction: "manipulation" }}
                  >
                    Info
                  </button>
                )}
                <button
                  onClick={() => setShowEPGOverlay(false)}
                  className={`text-white/70 hover:text-white transition-colors touch-manipulation ${
                    isMobile ? "min-h-[48px] min-w-[48px] flex items-center justify-center" : ""
                  }`}
                  style={{ pointerEvents: "auto", touchAction: "manipulation" }}
                >
                  <X className={`${isMobile ? "h-6 w-6" : "h-5 w-5"}`} />
                </button>
              </div>

              {/* Channel Info Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-4">
                  <div className="bg-red-600 text-white px-3 py-1 rounded text-sm font-bold">
                    {String(currentChannelIndex + 1).padStart(3, "0")}
                  </div>
                  <div className="text-white">
                    <h2 className="text-xl font-bold">{channel.name}</h2>
                    <div className="flex items-center space-x-2 text-sm text-gray-300">
                      <span>{channel.category}</span>
                      {channel.isHD && <span>• HD</span>}
                      <div className="flex items-center space-x-1">
                        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                        <span>LIVE</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-red-600 text-white px-4 py-2 rounded-lg">
                  <div className="text-xs">CHANNEL GUIDE</div>
                  <div className="text-sm font-bold">Channel Guide For: {channel.name} </div>
                </div>
              </div>

              {/* Program Schedule */}
              <div className="space-y-2">
                {getCurrentProgram() ? (
                  <div className="bg-blue-600/80 text-white p-3 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="text-sm opacity-90">NOW PLAYING</div>
                        <div className="font-bold text-lg">{getCurrentProgram().title}</div>
                        {getCurrentProgram().desc && (
                          <div className="text-sm opacity-75 mt-1">{getCurrentProgram().desc}</div>
                        )}
                        <div className="text-sm opacity-90 mt-1">
                          {getCurrentProgram().start && getCurrentProgram().stop ? (
                            <>
                              {formatTime(getCurrentProgram().start)} - {formatTime(getCurrentProgram().stop)}
                            </>
                          ) : (
                            "Live Programming"
                          )}
                        </div>
                      </div>
                      {getCurrentProgram().rating && (
                        <div className="bg-white/20 px-2 py-1 rounded text-xs font-bold">
                          {getCurrentProgram().rating}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="bg-blue-600/80 text-white p-3 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="text-sm opacity-90">NOW PLAYING</div>
                        <div className="font-bold text-lg">{channel.name} Live</div>
                        <div className="text-sm opacity-75 mt-1">No Information Available.</div>
                        <div className="text-sm opacity-90 mt-1">No Program information available. </div>
                      </div>
                      <div className="bg-white/20 px-2 py-1 rounded text-xs font-bold">LIVE</div>
                    </div>
                  </div>
                )}

                {getNextProgram() ? (
                  <div className="bg-gray-800/80 text-white p-3 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="text-sm opacity-90">UP NEXT</div>
                        <div className="font-bold">{getNextProgram().title}</div>
                        {getNextProgram().desc && (
                          <div className="text-sm opacity-75 mt-1">{getNextProgram().desc}</div>
                        )}
                        <div className="text-sm opacity-90 mt-1">
                          {getNextProgram().start && getNextProgram().stop ? (
                            <>
                              {formatTime(getNextProgram().start)} - {formatTime(getNextProgram().stop)}
                            </>
                          ) : (
                            "Coming up next"
                          )}
                        </div>
                      </div>
                      {getNextProgram().rating && (
                        <div className="bg-white/20 px-2 py-1 rounded text-xs font-bold">{getNextProgram().rating}</div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-800/80 text-white p-3 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="text-sm opacity-90">UP NEXT</div>
                        <div className="font-bold">No Information Available.</div>
                        <div className="text-sm opacity-75 mt-1">No Programme Available</div>
                        <div className="text-sm opacity-90 mt-1">Invalid Time - Invalid Time</div>
                      </div>
                      <div className="bg-white/20 px-2 py-1 rounded text-xs font-bold">LIVE</div>
                    </div>
                  </div>
                )}

                <div className="mt-4 text-center">
                  <div className="text-xs text-gray-400">
                    {isMobile ? (
                      <>Tap "Info" to toggle program details • Tap "×" to close</>
                    ) : (
                      <>Press 'I' to toggle program info • Press 'ESC' to close</>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {isLoading && !error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-foreground text-lg">Loading stream...</p>
              <p className="text-muted-foreground text-sm mt-2">{channel.name}</p>
            </div>
          </div>
        )}

        {!isTraditionalMode && error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black">
            <Card className="max-w-md bg-gray-900 border-red-500/30">
              <CardContent className="p-8 text-center">
                <AlertTriangle className="h-20 w-20 text-red-400 mx-auto mb-6" />
                <h3 className="text-foreground font-bold text-2xl mb-4">Stream Unavailable</h3>
                <p className="text-red-200 text-sm mb-6 leading-relaxed">{error}</p>
                <div className="space-y-3">
                  <Button
                    onClick={retryStream}
                    className="w-full bg-white text-black hover:bg-white/90 active:bg-white/80 focus:bg-white/90 transition-all duration-200 touch-manipulation"
                    style={{ pointerEvents: "auto", touchAction: "manipulation" }}
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Retry Connection ({retryCount})
                  </Button>
                  <Button
                    onClick={onClose}
                    variant="outline"
                    className="w-full bg-transparent border-white/30 text-foreground hover:bg-white/10 active:bg-white/5 focus:bg-white/5 touch-manipulation"
                    style={{ pointerEvents: "auto", touchAction: "manipulation" }}
                  >
                    Back to Channels
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {!isTraditionalMode && (
        <div
          className={`absolute bottom-0 left-0 right-0 z-20 hotel-video-controls ${
            showControls ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
        >
          <div className={`${isMobile ? "px-3 py-3" : "px-6 py-4"} bg-black/20`}>
            <div className={`flex items-center justify-between ${isMobile ? "mb-3" : "mb-4"}`}>
              <div className="flex items-center space-x-3">
                <img
                  src={channel.logo || "/placeholder.svg?height=40&width=40&text=TV"}
                  alt={channel.name}
                  className={`${isMobile ? "h-6 w-6" : "h-8 w-8"} rounded object-cover`}
                />
                <div className="text-foreground">
                  <h3 className={`font-medium ${isMobile ? "text-sm" : "text-base"}`}>{channel.name}</h3>
                  <div
                    className={`flex items-center space-x-2 ${isMobile ? "text-xs" : "text-xs"} text-muted-foreground`}
                  >
                    <span>{channel.category}</span>
                    {channel.isHD && <span>• HD</span>}
                  </div>
                </div>
              </div>
              <div className={`flex items-center space-x-2 ${isMobile ? "text-xs" : "text-xs"} text-green-400`}>
                <div className="w-1.5 h-1.5 bg-current rounded-full animate-pulse"></div>
                <span>LIVE</span>
              </div>
            </div>

            <div className={`flex items-center justify-center ${isMobile ? "space-x-4" : "space-x-4"}`}>
              <Button
                onClick={() => switchChannel("prev")}
                variant="ghost"
                size="sm"
                className={`text-foreground hover:bg-white/20 active:bg-white/10 focus:bg-white/10 rounded-full touch-manipulation ${
                  isMobile ? "h-12 w-12 min-h-[48px] min-w-[48px]" : "h-8 w-8"
                }`}
                style={{
                  pointerEvents: "auto",
                  touchAction: "manipulation",
                  WebkitTapHighlightColor: "transparent",
                }}
              >
                <SkipBack className={`${isMobile ? "h-5 w-5" : "h-3 w-3"}`} />
              </Button>

              <Button
                onClick={togglePlayPause}
                variant="ghost"
                size="sm"
                className={`text-foreground hover:bg-white/20 active:bg-white/10 focus:bg-white/10 rounded-full border border-white/30 touch-manipulation ${
                  isMobile ? "h-14 w-14 min-h-[56px] min-w-[56px]" : "h-10 w-10"
                }`}
                style={{
                  pointerEvents: "auto",
                  touchAction: "manipulation",
                  WebkitTapHighlightColor: "transparent",
                }}
              >
                {isPlaying ? (
                  <Pause className={`${isMobile ? "h-6 w-6" : "h-4 w-4"}`} />
                ) : (
                  <Play className={`${isMobile ? "h-6 w-6" : "h-4 w-4"}`} />
                )}
              </Button>

              <Button
                onClick={() => switchChannel("next")}
                variant="ghost"
                size="sm"
                className={`text-foreground hover:bg-white/20 active:bg-white/10 focus:bg-white/10 rounded-full touch-manipulation ${
                  isMobile ? "h-12 w-12 min-h-[48px] min-w-[48px]" : "h-8 w-8"
                }`}
                style={{
                  pointerEvents: "auto",
                  touchAction: "manipulation",
                  WebkitTapHighlightColor: "transparent",
                }}
              >
                <SkipForward className={`${isMobile ? "h-5 w-5" : "h-3 w-3"}`} />
              </Button>

              <Button
                onClick={toggleMute}
                variant="ghost"
                size="sm"
                className={`text-foreground hover:bg-white/20 active:bg-white/10 focus:bg-white/10 rounded-full touch-manipulation ${
                  isMobile ? "h-12 w-12 min-h-[48px] min-w-[48px]" : "h-8 w-8"
                }`}
                style={{
                  pointerEvents: "auto",
                  touchAction: "manipulation",
                  WebkitTapHighlightColor: "transparent",
                }}
              >
                {isMuted ? (
                  <VolumeX className={`${isMobile ? "h-5 w-5" : "h-3 w-3"}`} />
                ) : (
                  <Volume2 className={`${isMobile ? "h-5 w-5" : "h-3 w-3"}`} />
                )}
              </Button>

              <Button
                onClick={() => setShowEPGOverlay(!showEPGOverlay)}
                variant="ghost"
                size="sm"
                className={`text-foreground hover:bg-white/20 active:bg-white/10 focus:bg-white/10 rounded-full touch-manipulation ${
                  isMobile ? "h-12 w-12 min-h-[48px] min-w-[48px]" : "h-8 w-8"
                } ${showEPGOverlay ? "bg-white/20" : ""}`}
                style={{
                  pointerEvents: "auto",
                  touchAction: "manipulation",
                  WebkitTapHighlightColor: "transparent",
                }}
              >
                <Info className={`${isMobile ? "h-5 w-5" : "h-3 w-3"}`} />
              </Button>

              <Button
                onClick={() => setShowChannelList(!showChannelList)}
                variant="ghost"
                size="sm"
                className={`text-foreground hover:bg-white/20 active:bg-white/10 focus:bg-white/10 rounded-full touch-manipulation ${
                  isMobile ? "h-12 w-12 min-h-[48px] min-w-[48px]" : "h-8 w-8"
                }`}
                style={{
                  pointerEvents: "auto",
                  touchAction: "manipulation",
                  WebkitTapHighlightColor: "transparent",
                }}
              >
                <List className={`${isMobile ? "h-5 w-5" : "h-3 w-3"}`} />
              </Button>

              <Button
                onClick={toggleFullscreen}
                variant="ghost"
                size="sm"
                className={`text-foreground hover:bg-white/20 active:bg-white/10 focus:bg-white/10 rounded-full touch-manipulation ${
                  isMobile ? "h-12 w-12 min-h-[48px] min-w-[48px]" : "h-8 w-8"
                }`}
                style={{
                  pointerEvents: "auto",
                  touchAction: "manipulation",
                  WebkitTapHighlightColor: "transparent",
                }}
              >
                {document.fullscreenElement ? (
                  <Minimize className={`${isMobile ? "h-5 w-5" : "h-3 w-3"}`} />
                ) : (
                  <Expand className={`${isMobile ? "h-5 w-5" : "h-3 w-3"}`} />
                )}
              </Button>
            </div>

            {showChannelList && (
              <div className="border-t border-white/20 bg-black/40 max-h-80 overflow-y-auto">
                <div className={`${isMobile ? "p-4" : "p-6"}`}>
                  <h4 className={`text-foreground font-bold ${isMobile ? "mb-4 text-lg" : "mb-6 text-xl"}`}>
                    Available Channels ({availableChannels.length})
                  </h4>
                  <div
                    className={`grid gap-4 ${
                      isMobile
                        ? "grid-cols-2 sm:grid-cols-3"
                        : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8"
                    }`}
                  >
                    {availableChannels.map((ch) => {
                      const isCurrentChannel = ch.id === channel.id
                      return (
                        <Button
                          key={ch.id}
                          onClick={() => selectChannel(ch.id)}
                          variant="ghost"
            className={`h-auto touch-manipulation ${isMobile ? "p-3" : "p-4"} flex flex-col items-center space-y-3 rounded-xl ${
              isSelected
                ? "bg-white/20 dark:bg-gray-800/50 border-2 border-white/40 dark:border-gray-400 text-foreground"
                              : "text-foreground hover:bg-white/20 active:bg-white/10 focus:bg-white/10 border border-white/20 hover:border-white/40"
                          }`}
                          style={{ pointerEvents: "auto", touchAction: "manipulation" }}
                        >
                          <img
                            src={ch.logo || "/placeholder.svg?height=40&width=40&text=TV"}
                            alt={ch.name}
                            className={`${isMobile ? "h-10 w-10" : "h-12 w-12"} rounded-lg object-cover`}
                          />
                          <div className="text-center">
                            <div
                              className={`${isMobile ? "text-xs" : "text-xs"} font-medium truncate w-full ${
                                isMobile ? "max-w-[70px]" : "max-w-[90px]"
                              } mb-1`}
                            >
                              {ch.name}
                            </div>
                            <div className="flex justify-center space-x-1">
                              {ch.isHD && <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>}
                              {ch.drm && <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full"></div>}
                              {isM3u8Stream(ch.url) && (
                                <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full"></div>
                              )}
                            </div>
                          </div>
                        </Button>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {!isTraditionalMode && isMobile && (
        <div className="absolute bottom-20 right-4 z-20">
          <button
            onClick={() => setShowEPGOverlay(!showEPGOverlay)}
            className={`bg-blue-600 text-white px-4 py-3 rounded-full touch-manipulation min-h-[48px] min-w-[48px] flex items-center justify-center ${
              showControls ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
            style={{
              pointerEvents: "auto",
              touchAction: "manipulation",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </button>
        </div>
      )}
    </div>
  )
}
