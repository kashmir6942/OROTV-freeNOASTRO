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
} from "lucide-react"
import type { VideoPlayerProps } from "@/types/video-player"
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts"
import { createClient } from "@/lib/supabase/client"

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
  const [showEPGOverlay, setShowEPGOverlay] = useState(false)
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

  const setHighestQuality = useCallback(() => {
    try {
      const isHighBitrate = streamingModeRef.current === "high-bitrate"
      
      if (playerType === "hls" && hlsRef.current) {
        const levels = hlsRef.current.levels
        if (levels && levels.length > 0) {
          // Extract available quality levels
          const qualities = levels.map((level: any, index: number) => ({
            index,
            height: level.height || 0,
            label: level.height ? `${level.height}p` : `Level ${index + 1}`,
          })).sort((a: any, b: any) => b.height - a.height)
          setAvailableQualities(qualities)

          if (isHighBitrate) {
            // HD Mode: Force highest quality
            let highestLevel = 0
            let highestBitrate = 0
            levels.forEach((level: any, index: number) => {
              if (level.bitrate > highestBitrate) {
                highestBitrate = level.bitrate
                highestLevel = index
              }
            })
            hlsRef.current.currentLevel = highestLevel
            console.log("[v0] HD Mode: Forced to highest quality level", highestLevel)
          } else {
            // Optimized Mode: Let ABR auto-select (set to -1 for auto)
            hlsRef.current.currentLevel = -1
            console.log("[v0] Optimized Mode: ABR auto-selection enabled")
          }
        }
      } else if (playerType === "shaka" && playerRef.current) {
        const tracks = playerRef.current.getVariantTracks()
        if (tracks && tracks.length > 0) {
          if (isHighBitrate) {
            // HD Mode: Force highest quality track
            let highestTrack = tracks[0]
            let highestBandwidth = 0
            tracks.forEach((track: any) => {
              if (track.bandwidth > highestBandwidth) {
                highestBandwidth = track.bandwidth
                highestTrack = track
              }
            })
            playerRef.current.configure({ abr: { enabled: false } })
            playerRef.current.selectVariantTrack(highestTrack, true)
            console.log("[v0] HD Mode: Forced to highest quality track")
          } else {
            // Optimized Mode: Enable ABR
            playerRef.current.configure({ abr: { enabled: true } })
            console.log("[v0] Optimized Mode: ABR enabled")
          }
        }
      }
    } catch (error) {
      console.error("[v0] setHighestQuality error:", error)
    }
  }, [playerType])

  const handleQualityChange = useCallback((qualityIndex: number) => {
    try {
      if (playerType === "hls" && hlsRef.current) {
        hlsRef.current.currentLevel = qualityIndex
        setSelectedQuality(qualityIndex)
        console.log("[v0] Quality changed to:", qualityIndex === -1 ? "Auto" : `${qualityIndex}`)
      }
    } catch (error) {
      console.error("[v0] Failed to change quality:", error)
    }
  }, [playerType])

  const loadAudioAndSubtitleTracks = useCallback(() => {
    try {
      const video = videoRef.current
      if (!video) return

      // Check native HTML5 text tracks (for embedded subtitles)
      const nativeTextTracks = Array.from(video.textTracks || [])
      console.log("[v0] Native text tracks found:", nativeTextTracks.length)

      if (playerType === "hls" && hlsRef.current) {
        // HLS.js audio tracks
        const audioTrackList = hlsRef.current.audioTracks || []
        const audioTracks = audioTrackList.map((track: any, index: number) => ({
          id: index,
          label: track.name || track.lang || `Audio ${index + 1}`,
          language: track.lang || "unknown",
        }))
        setAudioTracks(audioTracks)
        setCurrentAudioTrack(hlsRef.current.audioTrack)

        // HLS.js subtitle tracks
        const subtitleTrackList = hlsRef.current.subtitleTracks || []
        let subtitleTracks = subtitleTrackList.map((track: any, index: number) => ({
          id: index,
          label: track.name || track.lang || `Subtitle ${index + 1}`,
          language: track.lang || "unknown",
          source: "hls",
        }))

        // Also check native text tracks
        const nativeSubs = nativeTextTracks
          .filter((track) => track.kind === "subtitles" || track.kind === "captions")
          .map((track, index) => ({
            id: subtitleTracks.length + index,
            label: track.label || track.language || `Subtitle ${subtitleTracks.length + index + 1}`,
            language: track.language || "unknown",
            source: "native",
            track: track,
          }))

        subtitleTracks = [...subtitleTracks, ...nativeSubs]
        console.log("[v0] Total subtitle tracks:", subtitleTracks.length)
        setSubtitleTracks(subtitleTracks)
        setCurrentSubtitleTrack(hlsRef.current.subtitleTrack)
      } else if (playerType === "shaka" && playerRef.current) {
        // Shaka Player audio tracks
        const audioTrackList = playerRef.current.getAudioLanguagesAndRoles() || []
        const audioTracks = audioTrackList.map((track: any, index: number) => ({
          id: index,
          label: track.label || track.language || `Audio ${index + 1}`,
          language: track.language || "unknown",
        }))
        setAudioTracks(audioTracks)

        // Shaka Player text tracks (subtitles)
        const textTrackList = playerRef.current.getTextLanguagesAndRoles() || []
        let subtitleTracks = textTrackList.map((track: any, index: number) => ({
          id: index,
          label: track.label || track.language || `Subtitle ${index + 1}`,
          language: track.language || "unknown",
          source: "shaka",
        }))

        // Also check native text tracks
        const nativeSubs = nativeTextTracks
          .filter((track) => track.kind === "subtitles" || track.kind === "captions")
          .map((track, index) => ({
            id: subtitleTracks.length + index,
            label: track.label || track.language || `Subtitle ${subtitleTracks.length + index + 1}`,
            language: track.language || "unknown",
            source: "native",
            track: track,
          }))

        subtitleTracks = [...subtitleTracks, ...nativeSubs]
        console.log("[v0] Total subtitle tracks:", subtitleTracks.length)
        setSubtitleTracks(subtitleTracks)
      } else {
        // Native video player - check text tracks
        const nativeSubs = nativeTextTracks
          .filter((track) => track.kind === "subtitles" || track.kind === "captions")
          .map((track, index) => ({
            id: index,
            label: track.label || track.language || `Subtitle ${index + 1}`,
            language: track.language || "unknown",
            source: "native",
            track: track,
          }))

        console.log("[v0] Native subtitle tracks:", nativeSubs.length)
        setSubtitleTracks(nativeSubs)
      }
    } catch (error) {
      console.log("[v0] Error loading tracks:", error)
    }
  }, [playerType])

  const switchAudioTrack = useCallback(
    (trackId: number) => {
      try {
        if (playerType === "hls" && hlsRef.current) {
          hlsRef.current.audioTrack = trackId
          setCurrentAudioTrack(trackId)
          console.log("[v0] Switched to audio track:", trackId)
        } else if (playerType === "shaka" && playerRef.current) {
          const audioTracks = playerRef.current.getAudioLanguagesAndRoles()
          if (audioTracks[trackId]) {
            playerRef.current.selectAudioLanguage(audioTracks[trackId].language)
            setCurrentAudioTrack(trackId)
            console.log("[v0] Switched to audio language:", audioTracks[trackId].language)
          }
        }
      } catch (error) {
        console.log("[v0] Error switching audio track:", error)
      }
    },
    [playerType],
  )

  const switchSubtitleTrack = useCallback(
    (trackId: number, trackData?: any) => {
      try {
        const video = videoRef.current
        if (!video) return

        // Disable all native text tracks first
        Array.from(video.textTracks || []).forEach((track) => {
          track.mode = "hidden"
        })

        if (trackId === -1) {
          // Disable all subtitles
          if (playerType === "hls" && hlsRef.current) {
            hlsRef.current.subtitleTrack = -1
          } else if (playerType === "shaka" && playerRef.current) {
            playerRef.current.setTextTrackVisibility(false)
          }
          setCurrentSubtitleTrack(-1)
          console.log("[v0] Subtitles disabled")
          return
        }

        // Check if it's a native track
        if (trackData && trackData.source === "native" && trackData.track) {
          trackData.track.mode = "showing"
          setCurrentSubtitleTrack(trackId)
          console.log("[v0] Enabled native subtitle track:", trackData.label)
        } else if (playerType === "hls" && hlsRef.current) {
          hlsRef.current.subtitleTrack = trackId
          setCurrentSubtitleTrack(trackId)
          console.log("[v0] Switched to HLS subtitle track:", trackId)
        } else if (playerType === "shaka" && playerRef.current) {
          const textTracks = playerRef.current.getTextLanguagesAndRoles()
          if (textTracks[trackId]) {
            playerRef.current.selectTextLanguage(textTracks[trackId].language)
            playerRef.current.setTextTrackVisibility(true)
            setCurrentSubtitleTrack(trackId)
            console.log("[v0] Switched to Shaka subtitle language:", textTracks[trackId].language)
          }
        }
      } catch (error) {
        console.log("[v0] Error switching subtitle track:", error)
      }
    },
    [playerType],
  )

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
        prog.start.replace(/(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})\s(.+)/, "$1-$2-$3T$4:$5:$6"),
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

    let initTimeout: NodeJS.Timeout | null = null

    try {
      console.log("[v0] Initializing player for channel:", channel.name)
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
      
      // Set a timeout to detect hanging initialization
      initTimeout = setTimeout(() => {
        console.log("[v0] Player initialization timeout, retrying...")
        setError("Loading timeout")
        setIsLoading(false)
        // Auto-retry once on timeout
        if (retryCount < 2) {
          setTimeout(() => retryStream(), 1000)
        }
      }, 15000) // 15 second timeout

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
            if (initTimeout) clearTimeout(initTimeout)
            initializePlayer()
          }
          script.onerror = () => {
            console.error("[v0] Failed to load HLS.js")
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
          console.log("[v0] HLS.js is supported, creating player, mode:", currentMode)
          const isOptimized = currentMode === "optimized"
          
          // OPTIMIZATION 1: Tuned HLS.js config to prevent constant rebuffering
          hlsRef.current = new window.Hls({
            enableWorker: !isAndroidTV,
            lowLatencyMode: false,
            // OPTIMIZATION 2: Larger buffers prevent micro-stalls
            backBufferLength: isOptimized ? 15 : (isAndroidTV ? 45 : 90),
            maxBufferLength: isOptimized ? 30 : (isAndroidTV ? 60 : 90),
            maxMaxBufferLength: isOptimized ? 60 : (isAndroidTV ? 120 : 180),
            // OPTIMIZATION 3: Longer timeouts prevent premature failures
            manifestLoadingTimeOut: 20000,
            manifestLoadingMaxRetry: 4,
            levelLoadingTimeOut: 15000,
            levelLoadingMaxRetry: 4,
            fragLoadingTimeOut: 25000,
            fragLoadingMaxRetry: 6,
            // OPTIMIZATION 4: Start at auto level, let ABR decide
            startLevel: isOptimized ? 0 : -1,
            autoStartLoad: true,
            // OPTIMIZATION 5: More tolerance for buffer holes
            maxLoadingDelay: isOptimized ? 10 : 6,
            maxBufferHole: 1.5,
            // OPTIMIZATION 6: Smoother ABR switching to avoid quality ping-pong
            abrEwmaFastLive: 3,
            abrEwmaSlowLive: 9,
            abrEwmaDefaultEstimate: 500000, // 500kbps default estimate
            abrBandWidthFactor: isOptimized ? 0.6 : 0.85,
            abrBandWidthUpFactor: isOptimized ? 0.4 : 0.6,
            // OPTIMIZATION 7: Faster recovery from stalls
            nudgeMaxRetry: 5,
            nudgeOffset: 0.2,
            // OPTIMIZATION 8: Progressive loading for smoother playback
            progressive: true,
            testBandwidth: true,
          })

          hlsRef.current.loadSource(channel.url)
          hlsRef.current.attachMedia(video)

          hlsRef.current.on(window.Hls.Events.MANIFEST_PARSED, () => {
            console.log("[v0] HLS manifest parsed successfully")
            if (initTimeout) clearTimeout(initTimeout)
            setConnectionStatus("connected")
            setIsLoading(false)
            setRetryCount(0) // Reset retry count on success

            setTimeout(() => {
              setHighestQuality()
              loadAudioAndSubtitleTracks()
            }, 500)

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
            
            if (!data.fatal) {
              console.log("[v0] Non-fatal HLS error, continuing...")
              return
            }
            
            reportError("fatal", `HLS Error: ${data.details || data.type}`)

            switch (data.type) {
              case window.Hls.ErrorTypes.NETWORK_ERROR:
                console.log("[v0] Network error, attempting recovery")
                hlsRef.current?.startLoad()
                // If recovery doesn't work, retry after 2 seconds
                setTimeout(() => {
                  if (connectionStatus !== "connected" && retryCount < 2) {
                    console.log("[v0] Network recovery failed, full retry...")
                    retryStream()
                  }
                }, 3000)
                break
              case window.Hls.ErrorTypes.MEDIA_ERROR:
                console.log("[v0] Media error, attempting recovery")
                hlsRef.current?.recoverMediaError()
                setTimeout(() => {
                  if (connectionStatus !== "connected" && retryCount < 2) {
                    console.log("[v0] Media recovery failed, full retry...")
                    retryStream()
                  }
                }, 3000)
                break
              default:
                if (initTimeout) clearTimeout(initTimeout)
                setError(`Stream Error: ${data.details || "Failed to load stream"}`)
                setConnectionStatus("disconnected")
                setIsLoading(false)
                // Auto-retry once
                if (retryCount < 1) {
                  setTimeout(() => retryStream(), 2000)
                }
                break
            }
          })
        } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
          // Safari native HLS support
          console.log("[v0] Using native HLS support")
          setPlayerType("hls")
          video.src = channel.url
          video.addEventListener("loadedmetadata", () => {
            console.log("[v0] Native HLS metadata loaded")
            if (initTimeout) clearTimeout(initTimeout)
            setConnectionStatus("connected")
            setIsLoading(false)
            setRetryCount(0)
            video.play().catch((err) => {
              console.error("[v0] Failed to autoplay:", err)
              setIsLoading(false)
            })
          })
          video.addEventListener("error", (e) => {
            console.error("[v0] Native HLS error:", e)
            if (initTimeout) clearTimeout(initTimeout)
            setError("Failed to load HLS stream")
            setConnectionStatus("disconnected")
            setIsLoading(false)
            reportError("fatal", "Native HLS playback error")
            // Auto-retry once
            if (retryCount < 1) {
              setTimeout(() => retryStream(), 2000)
            }
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
            if (initTimeout) clearTimeout(initTimeout)
            initializePlayer()
          }
          script.onerror = () => {
            console.error("[v0] Failed to load Shaka Player")
            setError("Failed to load video player library")
            setIsLoading(false)
            if (initTimeout) clearTimeout(initTimeout)
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

        const isOptimized = streamingModeRef.current === "optimized"
        
        // OPTIMIZATION: Tuned Shaka Player config for both modes
        playerRef.current.configure({
          streaming: {
            // Larger buffers prevent rebuffering
            bufferBehind: isOptimized ? 20 : (isAndroidTV ? 45 : 60),
            bufferingGoal: isOptimized ? 30 : (isAndroidTV ? 60 : 90),
            rebufferingGoal: isOptimized ? 8 : 5,
            bufferAhead: isOptimized ? 20 : (isAndroidTV ? 45 : 60),
            // Faster recovery
            stallEnabled: true,
            stallThreshold: 1,
            stallSkip: 0.1,
            // Prevent jumping around
            jumpLargeGaps: true,
            smallGapLimit: 1.5,
          },
          abr: {
            // Smoother ABR to prevent quality ping-pong
            enabled: true,
            switchInterval: isOptimized ? 8 : 4,
            bandwidthUpgradeTarget: isOptimized ? 0.6 : 0.85,
            bandwidthDowngradeTarget: 0.95,
          },
          manifest: {
            retryParameters: {
              timeout: 25000,
              maxAttempts: 6,
              baseDelay: 1500,
              backoffFactor: 2,
              fuzzFactor: 0.5,
            },
          },
        })

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
          console.log("[v0] Loading stream")
          await playerRef.current.load(channel.url)
          console.log("[v0] Stream loaded successfully")
          if (initTimeout) clearTimeout(initTimeout)
          setConnectionStatus("connected")
          setIsLoading(false)
          setRetryCount(0)

          setTimeout(() => {
            setHighestQuality()
            loadAudioAndSubtitleTracks()
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
        if (initTimeout) clearTimeout(initTimeout)
        setConnectionStatus("connected")
        setIsLoading(false)
        setRetryCount(0)

        setTimeout(() => {
          setHighestQuality()
        }, 1000)
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
      if (initTimeout) clearTimeout(initTimeout)
      setError(err.message || "Failed to connect to stream")
      setConnectionStatus("disconnected")
      setIsLoading(false)
      reportError("fatal", `Player initialization failed: ${err.message}`)
      
      // Auto-retry on error once
      if (retryCount < 2) {
        console.log("[v0] Auto-retrying after error...")
        setTimeout(() => retryStream(), 2000)
      }
    }
  }

  const retryStream = () => {
    setRetryCount((prev) => prev + 1)
    initializePlayer()
  }

  // Smart reopen: fully destroy player and reinitialize with new settings
  const smartReopenChannel = useCallback(() => {
    console.log("[v0] Smart reopen: destroying and reinitializing player, mode:", streamingModeRef.current)
    
    // Remember if UI was hidden to restore it after reopen
    wasUIHiddenRef.current = isUIHidden
    
    // Clean up current player completely
    if (playerRef.current) {
      playerRef.current.destroy().catch(() => {})
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
    
    // Reset states
    setIsLoading(true)
    setError(null)
    setIsBuffering(false)
    setConnectionStatus("reconnecting")
    bufferingSinceRef.current = null
    
    // Reinitialize after brief delay
    setTimeout(() => {
      initializePlayer()
      // Restore UI hidden state after player is ready
      setTimeout(() => {
        if (wasUIHiddenRef.current) {
          setIsUIHidden(true)
          setShowUIButtonVisible(false)
        }
      }, 1000)
    }, 300)
  }, [channel.id, isUIHidden])

  // Buffering watchdog: if buffering exceeds 10 seconds, close player → go home → reopen
  useEffect(() => {
    if (isBuffering) {
      if (!bufferingSinceRef.current) {
        bufferingSinceRef.current = Date.now()
        console.log("[v0] Buffering started at:", new Date().toISOString())
      }
      
      // Check every 2 seconds if we've been buffering too long
      if (!bufferingCheckIntervalRef.current) {
        bufferingCheckIntervalRef.current = setInterval(() => {
          if (bufferingSinceRef.current && isBuffering) {
            const bufferingDuration = Date.now() - bufferingSinceRef.current
            console.log("[v0] Buffering duration:", bufferingDuration, "ms")
            
            if (bufferingDuration >= 10000) { // 10 seconds
              console.log("[v0] Buffering exceeded 10s, closing player and reopening via home")
              if (bufferingCheckIntervalRef.current) {
                clearInterval(bufferingCheckIntervalRef.current)
                bufferingCheckIntervalRef.current = null
              }
              bufferingSinceRef.current = null
              // Save UI hidden state to restore after reopen
              wasUIHiddenRef.current = isUIHidden
              // Use parent's close → reopen cycle (goes back to home UI first)
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
      // Not buffering anymore, reset
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
        console.log("[v0] Exited Picture-in-Picture")
      } else {
        await videoRef.current.requestPictureInPicture()
        console.log("[v0] Entered Picture-in-Picture")
      }
    } catch (error) {
      console.error("[v0] PiP error:", error)
    }
  }

  // Keyboard shortcuts integration
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
        return "text-white/50"
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
    
    // Use a flag to prevent race conditions and ensure cleanup
    let isActive = true
    let initTimeoutId: NodeJS.Timeout | null = null
    
    const setupPlayer = async () => {
      if (!isActive) return
      
      // Add a safety timeout to detect stuck initialization
      initTimeoutId = setTimeout(() => {
        if (isActive) {
          console.log("[v0] setupPlayer timeout - forcing error state")
          setError("Player initialization timed out")
          setIsLoading(false)
          setConnectionStatus("disconnected")
        }
      }, 20000) // 20 second overall timeout
      
      try {
        await initializePlayer()
      } catch (err) {
        console.error("[v0] setupPlayer error:", err)
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

    const epgUpdateInterval = setInterval(() => {
      console.log("[v0] Video player requesting EPG update...")
      // Trigger a re-render to get fresh EPG data from parent
      setCurrentTime((prev) => prev) // Force re-render
    }, 60000)

    const heartbeatInterval = setInterval(sendHeartbeat, 30000)

    return () => {
      console.log("[v0] Channel cleanup triggered")
      isActive = false
      
      if (initTimeoutId) clearTimeout(initTimeoutId)
      
      // Clean up players immediately on channel change
      if (playerRef.current) {
        console.log("[v0] Cleaning up Shaka player on channel change")
        playerRef.current.destroy().catch(console.error)
        playerRef.current = null
      }
      if (hlsRef.current) {
        console.log("[v0] Cleaning up HLS player on channel change")
        hlsRef.current.destroy()
        hlsRef.current = null
      }
      
      // Stop video
      if (videoRef.current) {
        videoRef.current.pause()
        videoRef.current.src = ""
      }
      
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current)
      }
      clearInterval(timeInterval)
      clearInterval(epgUpdateInterval)
      clearInterval(heartbeatInterval)

      endViewerSession()
    }
  }, [channel])

  // Load moving text announcements for this channel
  useEffect(() => {
    const loadMovingTextAnnouncements = async () => {
      try {
        const supabase = createClient()
        const { data } = await supabase
          .from("moving_text_announcements")
          .select("*")
          .eq("is_active", true)
        
        if (data) {
          // Filter announcements that apply to this channel
          const relevantAnnouncements = data.filter((ann: any) => {
            if (ann.target === "all") return true
            if (ann.target === "single" || ann.target === "multiple") {
              return ann.channel_ids?.includes(channel.id)
            }
            return false
          })
          setMovingTextAnnouncements(relevantAnnouncements)
        }
      } catch (error) {
        console.error("[v0] Failed to load moving text announcements:", error)
      }
    }
    
    loadMovingTextAnnouncements()
    
    // Set up realtime subscription
    const supabase = createClient()
    const subscription = supabase
      .channel("moving-text-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "moving_text_announcements" }, () => {
        loadMovingTextAnnouncements()
      })
      .subscribe()
    
    return () => {
      supabase.removeChannel(subscription)
    }
  }, [channel.id])

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
    if (embedded) {
      // In embedded (list) mode, fill parent completely
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
      ref={containerRef}
      className={`${embedded ? 'absolute inset-0' : 'fixed inset-0 z-50'} bg-black flex flex-col`}
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

      {isTraditionalMode && showChannelNumberOverlay && channelNumberInput && (
        <div className={`${embedded ? 'absolute' : 'fixed'} top-4 right-4 z-[99999] bg-black/30 text-white p-4 rounded-lg border-2 border-gray-500 shadow-2xl pointer-events-none animate-in fade-in duration-200`}>
          <div className="flex items-center space-x-3 mb-2">
            <div className="text-2xl font-bold text-gray-300">{channelNumberInput}</div>
            <div className="text-sm text-white/60">
              {(() => {
                const foundChannel = availableChannels.find(
                  (ch, index) => (index + 1).toString() === channelNumberInput,
                )
                return foundChannel ? foundChannel.name : "Channel not found"
              })()}
            </div>
          </div>
          <div className="flex items-center space-x-2 mt-3 text-xs text-white/50">
            <span>Playing in 3 seconds...</span>
          </div>
        </div>
      )}

      {isTraditionalMode && (
        <div
          className={`${embedded ? 'absolute' : 'fixed'} top-4 right-4 z-[99998] bg-black/30 text-white p-3 rounded-lg shadow-xl border border-white/20 transition-all duration-300 ${
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
            <div className="text-white">
              <div className="text-sm font-medium">{channel.name}</div>
              <div className="text-xs text-white/50">
                Channel {currentChannelIndex + 1} • {channel.category}
                {channel.isHD && " • HD"}
              </div>
            </div>
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

      {/* NEW MINIMAL TOP BAR */}
      {!isTraditionalMode && !isUIHidden && (
        <div
          className={`absolute top-0 left-0 right-0 z-20 transition-opacity duration-300 ${
            showControls ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
          style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, transparent 100%)" }}
        >
          <div className="flex items-center justify-between p-3">
            {/* Left: Close + Channel Name */}
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 active:bg-white/30 transition-colors touch-manipulation"
                style={{ pointerEvents: "auto", touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
              >
                <X className="w-5 h-5 text-white" />
              </button>
              <div className="flex flex-col">
                <span className="text-white font-semibold text-sm truncate max-w-[180px]">{channel.name}</span>
                <div className="flex items-center gap-1.5">
                  <div className={`w-1.5 h-1.5 rounded-full ${connectionStatus === "connected" ? "bg-white" : connectionStatus === "reconnecting" ? "bg-white/50 animate-pulse" : "bg-white/30"}`}></div>
                  <span className="text-white/50 text-xs">{streamingMode === "optimized" ? "SD" : "HD"}</span>
                </div>
              </div>
            </div>

            {/* Right: Settings */}
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 active:bg-white/30 transition-colors touch-manipulation"
              style={{ pointerEvents: "auto", touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
            >
              <Settings className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>
      )}

      {/* NEW MINIMAL SETTINGS PANEL */}
      {showSettings && (
        <div 
          className="absolute top-16 right-3 z-30 bg-black/95 backdrop-blur-sm border border-white/10 rounded-2xl p-4 w-72"
          style={{ pointerEvents: "auto" }}
        >
          {/* Quality Mode - Main Focus */}
          <div className="mb-4">
            <p className="text-white/40 text-[10px] uppercase tracking-wider mb-3 font-medium">Quality</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  if (streamingMode !== "high-bitrate") {
                    localStorage.setItem("orotv-streaming-mode", "high-bitrate")
                    streamingModeRef.current = "high-bitrate"
                    setStreamingMode("high-bitrate")
                    setShowSettings(false)
                    // Trigger parent close → reopen cycle (goes back to home then reopens)
                    if (onBitrateModeChange) {
                      onBitrateModeChange("high-bitrate")
                    } else {
                      smartReopenChannel()
                    }
                  }
                }}
                className={`py-3 px-4 rounded-xl text-sm font-medium transition-all ${
                  streamingMode === "high-bitrate"
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
                    // Trigger parent close → reopen cycle (goes back to home then reopens)
                    if (onBitrateModeChange) {
                      onBitrateModeChange("optimized")
                    } else {
                      smartReopenChannel()
                    }
                  }
                }}
                className={`py-3 px-4 rounded-xl text-sm font-medium transition-all ${
                  streamingMode === "optimized"
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
            {/* Hide UI */}
            <button
              onClick={() => { setIsUIHidden(true); setShowSettings(false); setTimeout(() => setShowUIButtonVisible(false), 100) }}
              className="w-full flex items-center gap-3 py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
            >
              <svg className="w-5 h-5 text-white/60" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
              </svg>
              <span className="text-white/80 text-sm">Hide Controls</span>
            </button>
            
            {/* Refresh */}
            <button
              onClick={() => { setShowSettings(false); initializePlayer() }}
              className="w-full flex items-center gap-3 py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
            >
              <RotateCcw className="w-5 h-5 text-white/60" />
              <span className="text-white/80 text-sm">Refresh Stream</span>
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

        {/* Moving Text Announcements Overlay */}
        {movingTextAnnouncements.length > 0 && connectionStatus === "connected" && !error && !isBuffering && (
          <div className="absolute bottom-16 left-0 right-0 z-20 pointer-events-none overflow-hidden">
            {movingTextAnnouncements.map((announcement, index) => (
              <div
                key={announcement.id || index}
                className="w-full py-2 px-4"
                style={{
                  fontFamily: announcement.font || "Segoe UI",
                }}
              >
                {announcement.display_mode === "scrolling" ? (
                  <div
                    className="whitespace-nowrap text-white text-lg font-semibold drop-shadow-lg"
                    style={{
                      animation: `${announcement.scroll_direction === "right" ? "scrollRight" : "scrollLeft"} ${60 / (announcement.scroll_speed || 20)}s linear infinite`,
                      textShadow: "2px 2px 4px rgba(0,0,0,0.8)",
                    }}
                  >
                    {announcement.message}
                  </div>
                ) : (
                  <div
                    className="text-center text-white text-lg font-semibold drop-shadow-lg"
                    style={{
                      textShadow: "2px 2px 4px rgba(0,0,0,0.8)",
                    }}
                  >
                    {announcement.message}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Moving Text Animation Styles */}
        <style jsx>{`
          @keyframes scrollLeft {
            0% { transform: translateX(100%); }
            100% { transform: translateX(-100%); }
          }
          @keyframes scrollRight {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
          }
        `}</style>

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
                    className="bg-white/20 text-white px-4 py-2 rounded-lg text-sm font-medium touch-manipulation min-h-[48px] min-w-[48px] flex items-center justify-center"
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
                <div className="flex items-center space-x-3">
                  <div className="bg-white text-black px-2.5 py-1 rounded text-sm font-bold">
                    {String(currentChannelIndex + 1).padStart(3, "0")}
                  </div>
                  <div className="text-white">
                    <h2 className="text-lg font-semibold">{channel.name}</h2>
                    <div className="flex items-center gap-2 text-sm text-white/60">
                      <span>{channel.category}</span>
                      {channel.isHD && <span>• HD</span>}
                      <div className="flex items-center gap-1">
                        <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
                        <span>LIVE</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Program Schedule */}
              <div className="space-y-2">
                {getCurrentProgram() ? (
                  <div className="bg-white/10 text-white p-3 rounded-xl">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="text-xs text-white/50 mb-1">NOW</div>
                        <div className="font-medium">{getCurrentProgram().title}</div>
                        {getCurrentProgram().desc && (
                          <div className="text-sm text-white/60 mt-1">{getCurrentProgram().desc}</div>
                        )}
                        <div className="text-xs text-white/50 mt-1">
                          {getCurrentProgram().start && getCurrentProgram().stop ? (
                            <>
                              {formatTime(getCurrentProgram().start)} - {formatTime(getCurrentProgram().stop)}
                            </>
                          ) : (
                            "Live"
                          )}
                        </div>
                      </div>
                      {getCurrentProgram().rating && (
                        <div className="bg-white/10 px-2 py-1 rounded text-xs">
                          {getCurrentProgram().rating}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="bg-white/10 text-white p-3 rounded-xl">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="text-xs text-white/50 mb-1">NOW</div>
                        <div className="font-medium">{channel.name}</div>
                        <div className="text-sm text-white/60 mt-1">Live broadcast</div>
                      </div>
                      <div className="bg-white/10 px-2 py-1 rounded text-xs">LIVE</div>
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
          <div className="absolute inset-0 flex items-center justify-center bg-black animate-in fade-in duration-300">
            <div className="text-center">
              <div className="w-10 h-10 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-white/80 text-sm">{channel.name}</p>
            </div>
          </div>
        )}

        {!isTraditionalMode && error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black animate-in fade-in duration-300">
            <div className="max-w-sm mx-4 text-center">
              <AlertTriangle className="h-12 w-12 text-white/60 mx-auto mb-4" />
              <h3 className="text-white font-medium text-lg mb-2">Stream Unavailable</h3>
              <p className="text-white/50 text-sm mb-6">{error}</p>
              <div className="space-y-2">
                <button
                  onClick={retryStream}
                  className="w-full py-3 px-4 bg-white text-black rounded-xl font-medium transition-colors hover:bg-white/90 active:bg-white/80 touch-manipulation"
                  style={{ pointerEvents: "auto", touchAction: "manipulation" }}
                >
                  Retry
                </button>
                <button
                  onClick={onClose}
                  className="w-full py-3 px-4 bg-white/10 text-white rounded-xl font-medium transition-colors hover:bg-white/20 active:bg-white/10 touch-manipulation"
                  style={{ pointerEvents: "auto", touchAction: "manipulation" }}
                >
                  Back
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* NEW MINIMAL BOTTOM BAR */}
      {!isTraditionalMode && !isUIHidden && (
        <div
          className={`absolute bottom-0 left-0 right-0 z-20 transition-opacity duration-300 ${
            showControls ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
          style={{ background: "linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 100%)" }}
        >
          <div className="p-3 flex items-center justify-between">
            {/* Left: Play/Pause + Volume */}
            <div className="flex items-center gap-2">
              <button
                onClick={togglePlayPause}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 active:bg-white/30 transition-colors touch-manipulation"
                style={{ pointerEvents: "auto", touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
              >
                {isPlaying ? <Pause className="w-5 h-5 text-white" /> : <Play className="w-5 h-5 text-white ml-0.5" />}
              </button>
              <button
                onClick={toggleMute}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 active:bg-white/30 transition-colors touch-manipulation"
                style={{ pointerEvents: "auto", touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
              >
                {isMuted ? <VolumeX className="w-5 h-5 text-white" /> : <Volume2 className="w-5 h-5 text-white" />}
              </button>
            </div>

            {/* Center: Channel Navigation (desktop only) */}
            {!isMobile && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => switchChannel("prev")}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors touch-manipulation"
                  style={{ pointerEvents: "auto", touchAction: "manipulation" }}
                >
                  <SkipBack className="w-4 h-4 text-white/70" />
                </button>
                <span className="text-white/60 text-xs px-2">{currentChannelIndex + 1}/{availableChannels.length}</span>
                <button
                  onClick={() => switchChannel("next")}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors touch-manipulation"
                  style={{ pointerEvents: "auto", touchAction: "manipulation" }}
                >
                  <SkipForward className="w-4 h-4 text-white/70" />
                </button>
              </div>
            )}

            {/* Right: Fullscreen + PiP */}
            <div className="flex items-center gap-2">
              {!isMobile && (
                <button
                  onClick={togglePictureInPicture}
                  className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 active:bg-white/30 transition-colors touch-manipulation"
                  style={{ pointerEvents: "auto", touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
                  title="Picture-in-Picture"
                >
                  <PictureInPicture className="w-5 h-5 text-white" />
                </button>
              )}
              <button
                onClick={toggleFullscreen}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 active:bg-white/30 transition-colors touch-manipulation"
                style={{ pointerEvents: "auto", touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
              >
                {document.fullscreenElement ? <Minimize className="w-5 h-5 text-white" /> : <Expand className="w-5 h-5 text-white" />}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Audio Track Menu - simplified */}
      {showAudioMenu && audioTracks.length > 1 && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-30 bg-black/95 backdrop-blur border border-white/10 rounded-xl p-3 min-w-[200px]">
          <p className="text-white/50 text-xs mb-2">Audio Track</p>
          {audioTracks.map((track) => (
            <button
              key={track.id}
              onClick={() => { switchAudioTrack(track.id); setShowAudioMenu(false) }}
              className={`w-full text-left py-2 px-3 rounded-lg text-sm transition-colors ${currentAudioTrack === track.id ? "bg-white text-black" : "text-white/80 hover:bg-white/10"}`}
              style={{ pointerEvents: "auto" }}
            >
              {track.language || track.label || `Track ${track.id}`}
            </button>
          ))}
        </div>
      )}

      {/* Subtitle Menu - simplified */}
      {showSubtitleMenu && subtitleTracks.length > 0 && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-30 bg-black/95 backdrop-blur border border-white/10 rounded-xl p-3 min-w-[200px]">
          <p className="text-white/50 text-xs mb-2">Subtitles</p>
          <button
            onClick={() => { switchSubtitleTrack(-1); setShowSubtitleMenu(false) }}
            className={`w-full text-left py-2 px-3 rounded-lg text-sm transition-colors ${currentSubtitleTrack === -1 ? "bg-white text-black" : "text-white/80 hover:bg-white/10"}`}
            style={{ pointerEvents: "auto" }}
          >
            Off
          </button>
          {subtitleTracks.map((track) => (
            <button
              key={track.id}
              onClick={() => { switchSubtitleTrack(track.id); setShowSubtitleMenu(false) }}
              className={`w-full text-left py-2 px-3 rounded-lg text-sm transition-colors ${currentSubtitleTrack === track.id ? "bg-white text-black" : "text-white/80 hover:bg-white/10"}`}
              style={{ pointerEvents: "auto" }}
            >
              {track.language || track.label || `Subtitle ${track.id}`}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
