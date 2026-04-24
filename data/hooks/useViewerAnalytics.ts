"use client"

import { useState, useEffect } from "react"
import type { ChannelAnalytics } from "../types/channel"

export function useViewerAnalytics() {
  const [analytics, setAnalytics] = useState<Map<string, ChannelAnalytics>>(new Map())

  // Simulate viewer analytics data
  useEffect(() => {
    const generateAnalytics = () => {
      const newAnalytics = new Map<string, ChannelAnalytics>()

      // Generate random viewer data for channels
      const channelIds = [
        "nickelodeon",
        "nick-jr",
        "cartoon-network",
        "hbo",
        "cinemax",
        "discovery",
        "natgeo",
        "axn",
        "warner-tv",
        "cnn",
      ]

      channelIds.forEach((id) => {
        const currentViewers = Math.floor(Math.random() * 50000) + 1000
        newAnalytics.set(id, {
          currentViewers,
          peakViewers: currentViewers + Math.floor(Math.random() * 20000),
          totalViews: Math.floor(Math.random() * 1000000) + 100000,
        })
      })

      setAnalytics(newAnalytics)
    }

    generateAnalytics()

    // Update analytics every 30 seconds
    const interval = setInterval(generateAnalytics, 30000)

    return () => clearInterval(interval)
  }, [])

  const getChannelAnalytics = (channelId: string): ChannelAnalytics | undefined => {
    return analytics.get(channelId)
  }

  const isChannelPopular = (channelId: string): boolean => {
    const channelAnalytics = analytics.get(channelId)
    return channelAnalytics ? channelAnalytics.currentViewers > 25000 : false
  }

  return {
    getChannelAnalytics,
    isChannelPopular,
    analytics,
  }
}
