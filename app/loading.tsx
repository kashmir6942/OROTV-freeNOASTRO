"use client"

import { useState, useEffect } from "react"

export default function Loading() {
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 1000)

    return () => clearTimeout(timer)
  }, [])

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-background flex flex-col items-center justify-center z-50">
        <div className="flex flex-col items-center gap-5">
          <img src="/images/cignal-station-logo.png" alt="Cignal Station" className="h-12 w-auto" />
          <div className="w-6 h-6 border-2 border-foreground/20 border-t-foreground rounded-full animate-spin"></div>
        </div>
      </div>
    )
  }

  return null
}
