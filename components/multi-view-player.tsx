'use client'

import type React from "react"
import { useEffect, useRef, useState, useCallback } from "react"
import type { Channel } from "@/data/types/channel"
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  X, 
  Maximize2, 
  Minimize2,
  RefreshCw,
  Settings
} from "lucide-react"

interface MultiViewPlayerProps {
  channel: Channel
  slotIndex: number
  isFullscreen: boolean
  onRemove: () => void
  onToggleFullscreen: () => void
  onChangeChannel: () => void
}

export function MultiViewPlayer({
  channel,
  slotIndex,
  isFullscreen,
  onRemove,
  onToggleFullscreen,
  onChangeChannel
}: MultiViewPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const hlsRef = useRef<any>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  
  const [isPlaying, setIsPlaying] = useState(true)
  const [isMuted, setIsMuted] = useState(true) // Start muted for multi-view
  const [volume, setVolume] = useState(50)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showControls, setShowControls] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  
  const controlsTimeoutRef = useRef<NodeJS.Timeout>()

  // Initialize HLS player
  const initializePlayer = useCallback(async () => {
    if (!videoRef.current || !channel.url) return

    setIsLoading(true)
    setError(null)

    const video = videoRef.current

    // Clean up existing player
    if (hlsRef.current) {
      hlsRef.current.destroy()
      hlsRef.current = null
    }

    video.src = ''
    video.load()

    try {
      // Load HLS.js if needed
      if (!window.Hls) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script')
          script.src = 'https://cdn.jsdelivr.net/npm/hls.js@latest'
          script.onload = () => resolve()
          script.onerror = () => reject(new Error('Failed to load HLS.js'))
          document.head.appendChild(script)
        })
      }

      if (channel.url.includes('.m3u8')) {
        if (window.Hls.isSupported()) {
          const hls = new window.Hls({
            maxBufferLength: 30,
            maxMaxBufferLength: 60,
            enableWorker: true,
            lowLatencyMode: true,
          })
          
          hlsRef.current = hls
          hls.loadSource(channel.url)
          hls.attachMedia(video)
          
          hls.on(window.Hls.Events.MANIFEST_PARSED, () => {
            setIsLoading(false)
            video.play().catch(() => {
              // Autoplay blocked, keep muted
              video.muted = true
              video.play()
            })
          })
          
          hls.on(window.Hls.Events.ERROR, (_: any, data: any) => {
            if (data.fatal) {
              setError('Stream error')
              setIsLoading(false)
            }
          })
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
          // Safari native HLS
          video.src = channel.url
          video.addEventListener('loadedmetadata', () => {
            setIsLoading(false)
            video.play().catch(() => {
              video.muted = true
              video.play()
            })
          })
        }
      } else {
        // Direct video source
        video.src = channel.url
        video.addEventListener('loadedmetadata', () => {
          setIsLoading(false)
          video.play().catch(() => {
            video.muted = true
            video.play()
          })
        })
      }
    } catch (err) {
      setError('Failed to load')
      setIsLoading(false)
    }
  }, [channel.url])

  // Initialize on mount and channel change
  useEffect(() => {
    initializePlayer()
    
    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy()
        hlsRef.current = null
      }
    }
  }, [initializePlayer])

  // Retry stream
  const handleRetry = () => {
    setRetryCount(prev => prev + 1)
    initializePlayer()
  }

  // Play/Pause toggle
  const togglePlay = () => {
    if (!videoRef.current) return
    if (videoRef.current.paused) {
      videoRef.current.play()
      setIsPlaying(true)
    } else {
      videoRef.current.pause()
      setIsPlaying(false)
    }
  }

  // Mute toggle
  const toggleMute = () => {
    if (!videoRef.current) return
    videoRef.current.muted = !videoRef.current.muted
    setIsMuted(videoRef.current.muted)
  }

  // Volume change
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!videoRef.current) return
    const val = parseInt(e.target.value)
    setVolume(val)
    videoRef.current.volume = val / 100
    if (val > 0) {
      videoRef.current.muted = false
      setIsMuted(false)
    }
  }

  // Show controls temporarily
  const showControlsTemporarily = useCallback(() => {
    setShowControls(true)
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current)
    }
    controlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false)
    }, 3000)
  }, [])

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full bg-black"
      onMouseMove={showControlsTemporarily}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
      onClick={showControlsTemporarily}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        playsInline
        muted={isMuted}
        autoPlay
      />

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Error Overlay */}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 gap-2">
          <span className="text-red-400 text-sm">{error}</span>
          <button
            onClick={handleRetry}
            className="flex items-center gap-1 px-3 py-1 bg-cyan-500 text-black text-xs rounded hover:bg-cyan-400"
          >
            <RefreshCw className="w-3 h-3" /> Retry
          </button>
        </div>
      )}

      {/* Channel Info (always visible) */}
      <div className="absolute top-2 left-2 right-2 flex items-start justify-between pointer-events-none">
        <div className="flex items-center gap-2 bg-black/60 backdrop-blur-sm rounded px-2 py-1">
          {channel.logo && (
            <img 
              src={channel.logo} 
              alt="" 
              className="w-5 h-5 object-contain"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
          )}
          <span className="text-white text-xs font-medium truncate max-w-[100px]">
            {channel.name}
          </span>
        </div>
      </div>

      {/* Controls (shown on hover) */}
      {(showControls || !isPlaying) && (
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40 transition-opacity">
          {/* Top Controls */}
          <div className="absolute top-2 right-2 flex items-center gap-1">
            <button
              onClick={onToggleFullscreen}
              className="p-1.5 bg-black/60 hover:bg-black/80 rounded text-white transition-colors"
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            >
              {isFullscreen ? (
                <Minimize2 className="w-4 h-4" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </button>
            <button
              onClick={onChangeChannel}
              className="p-1.5 bg-black/60 hover:bg-black/80 rounded text-white transition-colors"
              title="Change Channel"
            >
              <Settings className="w-4 h-4" />
            </button>
            <button
              onClick={onRemove}
              className="p-1.5 bg-red-500/80 hover:bg-red-500 rounded text-white transition-colors"
              title="Remove"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Center Play/Pause */}
          <div className="absolute inset-0 flex items-center justify-center">
            <button
              onClick={togglePlay}
              className="p-3 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors"
            >
              {isPlaying ? (
                <Pause className="w-6 h-6" />
              ) : (
                <Play className="w-6 h-6" />
              )}
            </button>
          </div>

          {/* Bottom Controls */}
          <div className="absolute bottom-0 left-0 right-0 p-2 flex items-center gap-2">
            {/* Mute Button */}
            <button
              onClick={toggleMute}
              className="p-1.5 bg-black/60 hover:bg-black/80 rounded text-white transition-colors"
            >
              {isMuted ? (
                <VolumeX className="w-4 h-4" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </button>

            {/* Volume Slider */}
            <input
              type="range"
              min="0"
              max="100"
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              className="w-16 h-1 appearance-none bg-white/30 rounded-full cursor-pointer accent-cyan-400"
            />

            {/* Slot Number */}
            <span className="ml-auto text-white/60 text-xs">
              Slot {slotIndex + 1}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
