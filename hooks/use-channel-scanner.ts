"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import type { Channel } from "@/data/types/channel"
import { allChannels } from "@/data/channels/all-channels"
import Hls from "hls.js"

export type ChannelStatus = "working" | "not_working" | "pending"

export interface ScanResult {
  channel: Channel
  status: ChannelStatus
}

// Determine status by URL heuristic (fast pre-classification)
function getUrlHeuristic(channel: Channel): ChannelStatus {
  const url = channel.url || ""
  // These are known working patterns
  if (url.includes("ucdn.mediaquest.com.ph")) return "working"
  if (url.endsWith(".m3u8")) return "working"
  return "not_working"
}

export function useChannelScanner() {
  const [isScanning, setIsScanning] = useState(true)
  const [scanProgress, setScanProgress] = useState(0)
  const [currentChannel, setCurrentChannel] = useState<string>("")
  const [results, setResults] = useState<ScanResult[]>([])
  const [workingChannels, setWorkingChannels] = useState<Channel[]>([])
  const [notWorkingChannels, setNotWorkingChannels] = useState<Channel[]>([])
  const abortRef = useRef(false)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const hlsRef = useRef<Hls | null>(null)

  const scanChannel = useCallback(async (channel: Channel): Promise<ChannelStatus> => {
    return new Promise((resolve) => {
      const url = channel.url || ""
      if (!url) {
        resolve("not_working")
        return
      }

      // Quick heuristic check first
      const heuristic = getUrlHeuristic(channel)
      
      // For known working URLs, trust the heuristic
      if (heuristic === "working") {
        resolve("working")
        return
      }

      // For unknown URLs, try to probe
      const timeout = setTimeout(() => {
        resolve(heuristic)
      }, 1500)

      // Try HLS playback test (muted, hidden)
      if (Hls.isSupported() && (url.endsWith(".mpd") || url.endsWith(".m3u8"))) {
        try {
          const video = document.createElement("video")
          video.muted = true
          video.style.display = "none"
          document.body.appendChild(video)

          const hls = new Hls({
            enableWorker: false,
            lowLatencyMode: false,
            maxBufferLength: 1,
            maxMaxBufferLength: 2,
          })

          // Set up DRM if available
          if (channel.drm?.clearkey) {
            const keys = Object.entries(channel.drm.clearkey)
            if (keys.length > 0) {
              hls.config.emeEnabled = true
              hls.config.drmSystems = {
                "com.widevine.alpha": {},
                "org.w3.clearkey": {},
              }
            }
          }

          let resolved = false
          const cleanup = () => {
            if (!resolved) {
              resolved = true
              clearTimeout(timeout)
              hls.destroy()
              video.remove()
            }
          }

          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            cleanup()
            resolve("working")
          })

          hls.on(Hls.Events.ERROR, (_, data) => {
            if (data.fatal) {
              cleanup()
              resolve(heuristic)
            }
          })

          video.oncanplay = () => {
            cleanup()
            resolve("working")
          }

          video.onerror = () => {
            cleanup()
            resolve(heuristic)
          }

          hls.loadSource(url)
          hls.attachMedia(video)
        } catch {
          clearTimeout(timeout)
          resolve(heuristic)
        }
      } else {
        // For non-HLS URLs, just use heuristic
        clearTimeout(timeout)
        resolve(heuristic)
      }
    })
  }, [])

  useEffect(() => {
    const runScan = async () => {
      abortRef.current = false
      const scanResults: ScanResult[] = []
      const working: Channel[] = []
      const notWorking: Channel[] = []

      for (let i = 0; i < allChannels.length; i++) {
        if (abortRef.current) break

        const channel = allChannels[i]
        setCurrentChannel(channel.name)
        setScanProgress(Math.round(((i + 1) / allChannels.length) * 100))

        const status = await scanChannel(channel)
        scanResults.push({ channel, status })

        if (status === "working") {
          working.push(channel)
        } else {
          notWorking.push(channel)
        }

        // Update state incrementally
        setResults([...scanResults])
        setWorkingChannels([...working])
        setNotWorkingChannels([...notWorking])
      }

      setIsScanning(false)
    }

    runScan()

    return () => {
      abortRef.current = true
    }
  }, [scanChannel])

  return {
    isScanning,
    scanProgress,
    currentChannel,
    results,
    workingChannels,
    notWorkingChannels,
  }
}
