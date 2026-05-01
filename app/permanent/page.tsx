"use client"

import { useEffect, useState } from "react"
import { useDeviceRedirect } from "@/hooks/use-device-redirect"
import HomeExperience from "@/components/home-experience"

export default function PermanentPage() {
  const [ready, setReady] = useState(false)
  useDeviceRedirect("permanent")

  useEffect(() => {
    // Permanent route bypasses auth entirely - mark current token so any
    // child guards relying on sessionStorage stay happy.
    try {
      sessionStorage.setItem("currentToken", "permanent")
    } catch {}
    setReady(true)
  }, [])

  if (!ready) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-foreground text-xl">Loading...</div>
      </div>
    )
  }

  return <HomeExperience />
}
