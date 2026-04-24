"use client"

import { useEffect, useRef } from "react"

interface UseViewerTrackingProps {
  tokenId: string | null // Changed from number to string to match UUID
  enabled: boolean
}

export function useViewerTracking({ tokenId, enabled }: UseViewerTrackingProps) {
  const hasIncrementedRef = useRef(false)
  const cleanupExecutedRef = useRef(false)
  const currentTokenRef = useRef<string | null>(null)

  useEffect(() => {
    if (!enabled || !tokenId || hasIncrementedRef.current) return

    console.log("[v0] Starting viewer tracking for token:", tokenId)
    currentTokenRef.current = tokenId

    const incrementViewers = async () => {
      try {
        const response = await fetch("/api/increment-viewers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tokenId }),
        })

        if (response.ok) {
          hasIncrementedRef.current = true
          console.log("[v0] Successfully incremented viewers for token:", tokenId)
        } else {
          console.error("[v0] Failed to increment viewers:", await response.text())
        }
      } catch (error) {
        console.error("[v0] Error incrementing viewers:", error)
      }
    }

    incrementViewers()

    const cleanup = async () => {
      if (cleanupExecutedRef.current || !hasIncrementedRef.current || !currentTokenRef.current) return
      cleanupExecutedRef.current = true

      console.log("[v0] Cleaning up viewer for token:", currentTokenRef.current)

      const cleanupData = JSON.stringify({ tokenId: currentTokenRef.current })

      if (navigator.sendBeacon) {
        // Convert JSON to FormData for sendBeacon
        const formData = new FormData()
        formData.append("tokenId", currentTokenRef.current)
        const success = navigator.sendBeacon("/api/decrement-viewers", formData)
        if (!success) {
          console.warn("[v0] sendBeacon failed, falling back to fetch")
          // Fallback to fetch if sendBeacon fails
          fetch("/api/decrement-viewers", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: cleanupData,
            keepalive: true,
          }).catch((error) => console.error("[v0] Cleanup fetch failed:", error))
        }
      } else {
        // Fallback for browsers without sendBeacon
        try {
          await fetch("/api/decrement-viewers", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: cleanupData,
            keepalive: true,
          })
        } catch (error) {
          console.error("[v0] Error decrementing viewers:", error)
        }
      }
    }

    const handleBeforeUnload = () => cleanup()
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") cleanup()
    }
    const handlePageHide = () => cleanup()

    window.addEventListener("beforeunload", handleBeforeUnload)
    document.addEventListener("visibilitychange", handleVisibilityChange)
    window.addEventListener("pagehide", handlePageHide)

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      window.removeEventListener("pagehide", handlePageHide)
      cleanup()
    }
  }, [tokenId, enabled])

  useEffect(() => {
    if (currentTokenRef.current !== tokenId) {
      hasIncrementedRef.current = false
      cleanupExecutedRef.current = false
      currentTokenRef.current = tokenId
    }
  }, [tokenId])
}
