"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { useRouter, useSearchParams, useParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import IPTVContent from "@/components/iptv-content"

export default function UserPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const params = useParams()
  const username = (params?.username as string) || ""
  const initialToken = searchParams?.get("token") || ""

  const [activeToken, setActiveToken] = useState(initialToken)
  const [isValidating, setIsValidating] = useState(true)
  const [isValid, setIsValid] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [timeRemaining, setTimeRemaining] = useState(0)
  const refreshingRef = useRef(false)

  // Validate token against the database
  const validateToken = useCallback(async () => {
    if (!username || !activeToken) {
      setError("Missing token or username")
      setIsValidating(false)
      return
    }

    try {
      const supabase = createClient()

      // Check ban / approval before consuming token
      const { data: account } = await supabase
        .from("user_accounts")
        .select("is_banned, is_approved, is_active, ban_reason")
        .eq("username", username)
        .maybeSingle()

      if (!account || !account.is_approved || !account.is_active) {
        setError("Account not allowed. Please sign in again.")
        setIsValidating(false)
        return
      }
      if (account.is_banned) {
        setError(`Banned${account.ban_reason ? `: ${account.ban_reason}` : "."}`)
        setIsValidating(false)
        return
      }

      // Forced logout?
      const { data: forced } = await supabase
        .from("forced_logouts")
        .select("id")
        .eq("username", username)
        .eq("consumed", false)
        .maybeSingle()
      if (forced) {
        await supabase.from("forced_logouts").update({ consumed: true }).eq("id", forced.id)
        await supabase.from("user_tokens").delete().eq("username", username)
        setError("You were signed out by an administrator.")
        setIsValidating(false)
        return
      }

      const { data, error: fetchError } = await supabase
        .from("user_tokens")
        .select("*")
        .eq("username", username)
        .eq("token", activeToken)
        .maybeSingle()

      if (fetchError || !data) {
        setError("Invalid token. Please sign in again.")
        setIsValidating(false)
        return
      }

      const expiresAt = new Date(data.expires_at)
      const now = new Date()
      if (now > expiresAt) {
        setError("Token expired. Please sign in again.")
        setIsValidating(false)
        return
      }

      setTimeRemaining(Math.floor((expiresAt.getTime() - now.getTime()) / 1000))
      setIsValid(true)
      setIsValidating(false)
    } catch (e) {
      console.error("[v0] Token validation error:", e)
      setError("Token validation failed")
      setIsValidating(false)
    }
  }, [username, activeToken])

  useEffect(() => {
    validateToken()
  }, [validateToken])

  // Countdown
  useEffect(() => {
    if (!isValid || timeRemaining <= 0) return
    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          setIsValid(false)
          setError("Session expired. Please sign in again.")
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [isValid, timeRemaining])

  // Auto-rotate token via API every 30 minutes (well before expiry).
  // We rotate when ~5 minutes remain so the URL token stays in sync.
  useEffect(() => {
    if (!isValid) return
    if (timeRemaining > 300) return
    if (timeRemaining <= 0) return
    if (refreshingRef.current) return

    const rotate = async () => {
      refreshingRef.current = true
      try {
        const res = await fetch("/api/auth/refresh-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, token: activeToken }),
        })
        const json = await res.json()
        if (!res.ok || !json.success) {
          setIsValid(false)
          setError(json.error || "Session expired.")
          return
        }
        // Update URL silently and reset timer to 30 minutes
        const newUrl = `/users/${encodeURIComponent(username)}?token=${json.token}`
        window.history.replaceState({}, "", newUrl)
        setActiveToken(json.token)
        setTimeRemaining(Math.floor((new Date(json.expiresAt).getTime() - Date.now()) / 1000))

        try {
          const raw = sessionStorage.getItem("orotv_session")
          const parsed = raw ? JSON.parse(raw) : {}
          sessionStorage.setItem(
            "orotv_session",
            JSON.stringify({ ...parsed, username, token: json.token, expiresAt: json.expiresAt }),
          )
        } catch {}
      } finally {
        refreshingRef.current = false
      }
    }

    rotate()
  }, [isValid, timeRemaining, username, activeToken])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  if (isValidating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Validating session...</p>
        </div>
      </div>
    )
  }

  if (error || !isValid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center p-8 rounded-2xl border border-border bg-card max-w-md w-full">
          <img src="/images/what-brand-logo.png" alt="OROTV" className="h-16 w-auto mx-auto mb-4" />
          <div className="text-destructive text-lg mb-4">{error || "Invalid session"}</div>
          <button
            onClick={() => router.push("/login")}
            className="w-full px-6 py-3 rounded-md font-medium bg-primary text-primary-foreground hover:opacity-90 transition"
          >
            Go to Sign In
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="relative">
      {/* Session timer badge */}
      <div
        className="fixed top-4 right-4 z-[100] px-3 py-1.5 rounded-full text-xs font-mono flex items-center gap-2 border"
        style={{
          background: timeRemaining < 300 ? "rgba(239, 68, 68, 0.15)" : "rgba(6, 182, 212, 0.15)",
          borderColor: timeRemaining < 300 ? "rgba(239, 68, 68, 0.5)" : "rgba(6, 182, 212, 0.5)",
          color: timeRemaining < 300 ? "#ef4444" : "#22d3ee",
        }}
        aria-live="polite"
      >
        <span
          className="w-2 h-2 rounded-full animate-pulse"
          style={{ background: timeRemaining < 300 ? "#ef4444" : "#22d3ee" }}
        />
        {formatTime(timeRemaining)}
      </div>

      <IPTVContent username={username} />
    </div>
  )
}
