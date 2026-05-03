"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { useRouter, useSearchParams, useParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { getDeviceId } from "@/lib/device-id"
import IPTVContent from "@/components/iptv-content"
import { allChannels } from "@/data/channels/all-channels"
import type { Channel } from "@/data/types/channel"
import { MultiViewPlayer } from "@/components/multi-view-player"
import { ArrowLeft, X } from "lucide-react"

const ROTATE_BEFORE_MS = 60 * 1000 // rotate ~1 minute before token expires

/**
 * Publish the current Light TV session to sessionStorage + a custom event so
 * the VideoPlayer toolbar can render the live ticking timer beside the rate /
 * Settings button.
 */
function publishSession(payload: {
  username: string
  token: string
  expiresAt: string
  deviceId: string
}) {
  try {
    sessionStorage.setItem("lighttv:session", JSON.stringify(payload))
    sessionStorage.setItem("currentToken", payload.token)
    window.dispatchEvent(new CustomEvent("lighttv:session", { detail: payload }))
  } catch {}
}

export default function UserPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const params = useParams()
  const username = (params.username as string)?.toLowerCase()
  const initialToken = searchParams.get("token") || ""

  const [isValidating, setIsValidating] = useState(true)
  const [isValid, setIsValid] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const tokenRef = useRef<string>(initialToken)
  const expiresAtRef = useRef<number>(0)
  const rotatingRef = useRef(false)

  // Multi-view state
  const [isMultiView, setIsMultiView] = useState(false)
  const [multiViewLayout, setMultiViewLayout] = useState<'2' | '3' | '4'>('2')
  const [multiViewChannels, setMultiViewChannels] = useState<(Channel | null)[]>([null, null, null, null])

  // Initial token validation against the DB
  const validate = useCallback(async () => {
    if (!initialToken || !username) {
      setError("Missing token or username")
      setIsValidating(false)
      return
    }

    try {
      const supabase = createClient()
      const { data, error: fetchError } = await supabase
        .from("user_tokens")
        .select("token, expires_at, device_id")
        .eq("username", username)
        .eq("token", initialToken)
        .maybeSingle()

      if (fetchError || !data) {
        setError("Invalid or expired token")
        setIsValidating(false)
        return
      }

      const expiresAt = new Date(data.expires_at).getTime()
      if (Date.now() >= expiresAt) {
        setError("Session expired. Please sign in again.")
        setIsValidating(false)
        return
      }

      tokenRef.current = data.token
      expiresAtRef.current = expiresAt
      publishSession({
        username,
        token: data.token,
        expiresAt: data.expires_at,
        deviceId: getDeviceId(),
      })
      setIsValid(true)
      setIsValidating(false)
    } catch {
      setError("Token validation failed")
      setIsValidating(false)
    }
  }, [initialToken, username])

  useEffect(() => {
    validate()
  }, [validate])

  // Check URL for multivideo param on mount and listen for changes
  useEffect(() => {
    const checkMultiView = () => {
      const url = new URL(window.location.href)
      const mv = url.searchParams.get('multivideo')
      if (mv === 'true') {
        const layout = url.searchParams.get('layout') as '2' | '3' | '4' || '2'
        setMultiViewLayout(layout)
        const channels: (Channel | null)[] = [null, null, null, null]
        for (let i = 0; i < 4; i++) {
          const chId = url.searchParams.get(`ch${i}`)
          if (chId) {
            const found = allChannels.find(c => c.id === chId)
            if (found) channels[i] = found
          }
        }
        setMultiViewChannels(channels)
        setIsMultiView(true)
      } else {
        setIsMultiView(false)
      }
    }

    // Check on mount
    checkMultiView()

    // Listen for custom event from video player
    const handleMultiVideoEvent = (e: CustomEvent) => {
      const { layout, channels: channelIds } = e.detail
      setMultiViewLayout(layout)
      const channels: (Channel | null)[] = [null, null, null, null]
      channelIds.forEach((id: string, i: number) => {
        const found = allChannels.find(c => c.id === id)
        if (found) channels[i] = found
      })
      setMultiViewChannels(channels)
      setIsMultiView(true)
    }

    window.addEventListener('lighttv:multivideo', handleMultiVideoEvent as EventListener)
    window.addEventListener('popstate', checkMultiView)

    return () => {
      window.removeEventListener('lighttv:multivideo', handleMultiVideoEvent as EventListener)
      window.removeEventListener('popstate', checkMultiView)
    }
  }, [])

  // Periodically check if it's time to rotate. We rotate ~1 minute before
  // the current token expires so the user never sees a flash.
  useEffect(() => {
    if (!isValid) return

    const tryRotate = async () => {
      if (rotatingRef.current) return
      const remainingMs = expiresAtRef.current - Date.now()
      if (remainingMs > ROTATE_BEFORE_MS) return

      rotatingRef.current = true
      try {
        const res = await fetch("/api/auth/rotate-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username,
            token: tokenRef.current,
            deviceId: getDeviceId(),
          }),
        })
        const json = await res.json()
        if (!res.ok || !json.token) {
          setIsValid(false)
          setError(json.error || "Session expired. Please sign in again.")
          return
        }
        tokenRef.current = json.token
        expiresAtRef.current = new Date(json.expiresAt).getTime()
        publishSession({
          username: username!,
          token: json.token,
          expiresAt: json.expiresAt,
          deviceId: getDeviceId(),
        })
        // Update URL silently so a copied link reflects the active token
        router.replace(`/user/${username}?token=${encodeURIComponent(json.token)}`, { scroll: false })
      } catch (err) {
        console.error("[v0] rotate failed:", err)
      } finally {
        rotatingRef.current = false
      }
    }

    // Check every 10 seconds
    const interval = setInterval(tryRotate, 10_000)
    // Also try once on mount in case the token is already close to expiry
    tryRotate()
    return () => clearInterval(interval)
  }, [isValid, username, router])

  // Loading state
  if (isValidating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-zinc-800 border-t-cyan-400 rounded-full animate-spin" />
          <p className="text-zinc-500 text-sm">Validating session...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error || !isValid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black p-4">
        <div className="w-full max-w-sm bg-[#0e0e10] border border-zinc-800/80 rounded-2xl p-6 text-center">
          <h1 className="text-lg font-semibold text-white mb-2">Session ended</h1>
          <p className="text-sm text-zinc-400 mb-5">{error || "Invalid session"}</p>
          <button
            onClick={() => router.push("/login")}
            className="w-full h-10 rounded-lg bg-cyan-400 hover:bg-cyan-300 text-black font-semibold transition-colors"
          >
            Go to Login
          </button>
        </div>
      </div>
    )
  }

  // Exit multi-view handler
  const exitMultiView = () => {
    const url = new URL(window.location.href)
    url.searchParams.delete('multivideo')
    url.searchParams.delete('layout')
    for (let i = 0; i < 4; i++) url.searchParams.delete(`ch${i}`)
    window.history.pushState({}, '', url.toString())
    setIsMultiView(false)
  }

  // Multi-view mode
  if (isMultiView) {
    const activeChannels = multiViewChannels.slice(0, parseInt(multiViewLayout)).filter(c => c !== null) as Channel[]
    const layoutCount = parseInt(multiViewLayout)

    return (
      <div className="min-h-screen bg-black flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 bg-zinc-900 border-b border-zinc-800">
          <button
            onClick={exitMultiView}
            className="flex items-center gap-2 text-gray-400 hover:text-white"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm font-medium">Exit Multi-View</span>
          </button>
          <span className="text-cyan-400 text-sm font-bold">{layoutCount} Channels</span>
        </div>

        {/* Multi-view grid */}
        <div className={`flex-1 grid gap-1 p-1 ${
          layoutCount === 2 ? 'grid-cols-2' :
          layoutCount === 3 ? 'grid-cols-3' :
          'grid-cols-2 grid-rows-2'
        }`}>
          {Array.from({ length: layoutCount }).map((_, idx) => {
            const ch = multiViewChannels[idx]
            if (!ch) {
              return (
                <div key={idx} className="bg-zinc-900 rounded-lg flex items-center justify-center">
                  <span className="text-zinc-600 text-sm">Empty Slot</span>
                </div>
              )
            }
            return (
              <div key={idx} className="relative bg-black rounded-lg overflow-hidden">
                <MultiViewPlayer
                  channel={ch}
                  onRemove={() => {
                    const newChannels = [...multiViewChannels]
                    newChannels[idx] = null
                    setMultiViewChannels(newChannels)
                  }}
                  onSwap={() => {}}
                />
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // Valid session — VideoPlayer reads `lighttv:session` from sessionStorage
  // to render the ticking timer next to the rate/Settings button.
  return <IPTVContent username={username} />
}
