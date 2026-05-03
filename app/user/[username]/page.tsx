"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { useRouter, useSearchParams, useParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { getDeviceId } from "@/lib/device-id"
import IPTVContent from "@/components/iptv-content"

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

  // Valid session — VideoPlayer reads `lighttv:session` from sessionStorage
  // to render the ticking timer next to the rate/Settings button.
  return <IPTVContent username={username} />
}
