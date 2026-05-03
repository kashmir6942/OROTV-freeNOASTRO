"use client"

import { useEffect, useState } from "react"
import { Timer } from "lucide-react"

type Session = {
  username: string
  token: string
  expiresAt: string
  deviceId: string
}

function readSession(): Session | null {
  if (typeof window === "undefined") return null
  try {
    const raw = sessionStorage.getItem("lighttv:session")
    if (!raw) return null
    return JSON.parse(raw) as Session
  } catch {
    return null
  }
}

/**
 * Ticking countdown that lives next to the HD/SD rate badge inside the
 * VideoPlayer toolbar. Shows the time remaining on the current session token
 * and turns red as it approaches expiry. The user/[username] page is what
 * actually performs the secure rotation against /api/auth/rotate-token; this
 * component only reads `lighttv:session` from sessionStorage.
 */
export function SessionTimer({ className = "" }: { className?: string }) {
  const [session, setSession] = useState<Session | null>(null)
  const [now, setNow] = useState<number>(() => Date.now())

  useEffect(() => {
    setSession(readSession())
    const onUpdate = () => setSession(readSession())
    window.addEventListener("lighttv:session", onUpdate)
    window.addEventListener("storage", onUpdate)
    return () => {
      window.removeEventListener("lighttv:session", onUpdate)
      window.removeEventListener("storage", onUpdate)
    }
  }, [])

  useEffect(() => {
    if (!session) return
    const interval = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [session])

  if (!session) return null

  const expiresMs = new Date(session.expiresAt).getTime()
  const remaining = Math.max(0, Math.floor((expiresMs - now) / 1000))
  const minutes = Math.floor(remaining / 60)
  const seconds = remaining % 60
  const lowTime = remaining < 5 * 60

  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-md sm:rounded-lg text-[9px] sm:text-[11px] font-mono font-bold tabular-nums border tracking-wider ${
        lowTime
          ? "bg-red-500/20 text-red-300 border-red-500/40"
          : "bg-cyan-400/15 text-cyan-200 border-cyan-400/30"
      } ${className}`}
      title={`Session token rotates automatically. ${minutes}m ${seconds}s remaining.`}
      aria-label={`Session ${minutes} minutes ${seconds} seconds remaining`}
    >
      <Timer className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
      {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
    </span>
  )
}
