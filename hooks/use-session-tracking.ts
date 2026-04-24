"use client"

import { useEffect, useRef } from "react"

interface UseSessionTrackingProps {
  token: string | null
  enabled?: boolean
}

export function useSessionTracking({ token, enabled = true }: UseSessionTrackingProps) {
  const sessionIdRef = useRef<string | null>(null)
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const isSessionActiveRef = useRef(false)

  // Generate unique session ID
  const generateSessionId = () => {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  // Start session
  const startSession = async () => {
    if (!token || !enabled || token === "permanent" || isSessionActiveRef.current) {
      return
    }

    try {
      sessionIdRef.current = generateSessionId()
      console.log("[v0] Starting session tracking:", sessionIdRef.current)

      const response = await fetch("/api/start-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          sessionId: sessionIdRef.current,
        }),
      })

      const result = await response.json()
      if (result.success) {
        isSessionActiveRef.current = true
        console.log("[v0] Session started successfully")

        // Start heartbeat
        startHeartbeat()
      } else {
        console.error("[v0] Failed to start session:", result.error)
      }
    } catch (error) {
      console.error("[v0] Error starting session:", error)
    }
  }

  // End session
  const endSession = async () => {
    if (!sessionIdRef.current || !isSessionActiveRef.current) {
      return
    }

    try {
      console.log("[v0] Ending session tracking:", sessionIdRef.current)

      // Stop heartbeat
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current)
        heartbeatIntervalRef.current = null
      }

      // Try multiple methods to ensure session ends
      const sessionId = sessionIdRef.current

      // Method 1: Regular fetch
      try {
        const response = await fetch("/api/end-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
        })
        const result = await response.json()
        if (result.success) {
          console.log("[v0] Session ended successfully via fetch")
        }
      } catch (fetchError) {
        console.error("[v0] Fetch method failed:", fetchError)

        // Method 2: sendBeacon as fallback
        const formData = new FormData()
        formData.append("sessionId", sessionId)
        if (navigator.sendBeacon("/api/end-session", formData)) {
          console.log("[v0] Session ended via sendBeacon fallback")
        }
      }
    } catch (error) {
      console.error("[v0] Error ending session:", error)
    } finally {
      isSessionActiveRef.current = false
      sessionIdRef.current = null
    }
  }

  // Start heartbeat
  const startHeartbeat = () => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current)
    }

    heartbeatIntervalRef.current = setInterval(async () => {
      if (!sessionIdRef.current || !isSessionActiveRef.current) {
        return
      }

      try {
        await fetch("/api/heartbeat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: sessionIdRef.current,
          }),
        })
      } catch (error) {
        console.error("[v0] Heartbeat failed:", error)
      }
    }, 30000) // Send heartbeat every 30 seconds
  }

  // Setup session tracking
  useEffect(() => {
    if (!enabled || !token || token === "permanent") {
      console.log("[v0] Session tracking disabled:", { enabled, token })
      return
    }

    console.log("[v0] Setting up session tracking for token:", token)

    const startTimer = setTimeout(() => {
      console.log("[v0] Starting session after delay")
      startSession()
    }, 1000)

    // Handle page visibility changes
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Page is hidden, but don't end session immediately
        console.log("[v0] Page hidden, continuing session")
      } else {
        // Page is visible again, ensure session is active
        if (!isSessionActiveRef.current) {
          startSession()
        }
      }
    }

    // Handle beforeunload (tab close/refresh)
    const handleBeforeUnload = () => {
      console.log("[v0] Page unloading, ending session")
      if (sessionIdRef.current && isSessionActiveRef.current) {
        // Try immediate cleanup first
        endSession()

        // Also use sendBeacon as backup
        const formData = new FormData()
        formData.append("sessionId", sessionIdRef.current)
        navigator.sendBeacon("/api/end-session", formData)
      }
    }

    const handlePageHide = () => {
      console.log("[v0] Page hiding, ending session")
      if (sessionIdRef.current && isSessionActiveRef.current) {
        // Try immediate cleanup first
        endSession()

        // Also use sendBeacon as backup
        const formData = new FormData()
        formData.append("sessionId", sessionIdRef.current)
        navigator.sendBeacon("/api/end-session", formData)
      }
    }

    const handleWindowBlur = () => {
      console.log("[v0] Window lost focus")
      // Don't end session on blur, just log it
    }

    const handleWindowFocus = () => {
      console.log("[v0] Window gained focus")
      // Ensure session is still active
      if (!isSessionActiveRef.current && token && enabled) {
        startSession()
      }
    }

    // Add event listeners
    document.addEventListener("visibilitychange", handleVisibilityChange)
    window.addEventListener("beforeunload", handleBeforeUnload)
    window.addEventListener("pagehide", handlePageHide)
    window.addEventListener("blur", handleWindowBlur)
    window.addEventListener("focus", handleWindowFocus)

    // Cleanup function
    return () => {
      console.log("[v0] Cleaning up session tracking")
      clearTimeout(startTimer)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      window.removeEventListener("beforeunload", handleBeforeUnload)
      window.removeEventListener("pagehide", handlePageHide)
      window.removeEventListener("blur", handleWindowBlur)
      window.removeEventListener("focus", handleWindowFocus)
      endSession()
    }
  }, [token, enabled])

  return {
    startSession,
    endSession,
    sessionId: sessionIdRef.current,
    isActive: isSessionActiveRef.current,
  }
}
