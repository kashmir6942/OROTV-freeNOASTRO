"use client"

import { useEffect, useState } from "react"
import HomeExperience from "@/components/home-experience"

/**
 * Permanent owner-only test route.
 *
 * Bypasses register/login and the rotating-token system so the owner can
 * always preview the live channels UI (useful for QA, demos, and verifying
 * production-only changes without going through the approval flow).
 */
export default function AdminPanelChannelTestPage() {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    try {
      sessionStorage.setItem("currentToken", "permanent")
    } catch {}
    setReady(true)
  }, [])

  if (!ready) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-foreground text-xl">Loading owner preview...</div>
      </div>
    )
  }

  return (
    <div className="relative">
      <div className="fixed top-2 left-1/2 -translate-x-1/2 z-[200] px-3 py-1 rounded-full text-[10px] font-mono uppercase tracking-wider border border-amber-500/40 bg-amber-500/15 text-amber-500">
        Owner preview - bypassing auth
      </div>
      <HomeExperience />
    </div>
  )
}
