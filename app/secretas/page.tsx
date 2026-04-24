"use client"

import type React from "react"
import { useState, useEffect, useMemo } from "react"
import { VideoPlayer } from "@/components/video-player"
import { allChannels } from "@/data/channels/all-channels"
import { Search, Home, Tv, Grid, Menu, X } from 'lucide-react'
import type { Channel } from "@/data/types/channel"
import { TokenAccessOverlay } from "@/components/token-access-overlay"
import { validateTokenClient } from "@/lib/token-manager"
import { setUserPreference, getUserPreference } from "@/lib/user-preferences"
import { Suspense } from "react"

const useAccessControl = () => {
  const [hasAccess, setHasAccess] = useState(false)
  const [isCheckingAccess, setIsCheckingAccess] = useState(true)

  useEffect(() => {
    const checkAccess = async () => {
      const pathToken = window.location.pathname.slice(1)
      if (pathToken === "secretas" || pathToken === "permanent" || pathToken.startsWith("tokenlizedlinknumber")) {
        const tokenInfo = await validateTokenClient(pathToken === "permanent" ? "permanent" : (pathToken === "secretas" ? "permanent" : pathToken))
        if (tokenInfo.isValid) {
          setHasAccess(true)
          setIsCheckingAccess(false)
          return
        }
      }

      const sessionToken = sessionStorage.getItem("currentToken")
      if (sessionToken) {
        const tokenInfo = await validateTokenClient(sessionToken)
        if (tokenInfo.isValid) {
          setHasAccess(true)
          setIsCheckingAccess(false)
          return
        } else {
          sessionStorage.removeItem("currentToken")
        }
      }

      setIsCheckingAccess(false)
    }

    checkAccess()
  }, [])

  return { hasAccess, isCheckingAccess, setHasAccess }
}

const SecretsasUI = () => {
  const { hasAccess, isCheckingAccess, setHasAccess } = useAccessControl()
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [currentTab, setCurrentTab] = useState<"home" | "channels" | "search">("home")

  useEffect(() => {
    const initializeUserData = async () => {
      const savedTheme = await getUserPreference("ultrafantsa_theme", "dark")
      const isDark = savedTheme === "dark"
      if (isDark) {
        document.documentElement.classList.add("dark")
      } else {
        document.documentElement.classList.remove("dark")
      }
    }

    initializeUserData()
  }, [])

  const handleChannelSelect = (channel: Channel) => {
    if (channel.url) {
      setSelectedChannel(channel)
    }
  }

  const handleClosePlayer = () => {
    setSelectedChannel(null)
  }

  // Get featured channel (first one with logo)
  const featuredChannel = useMemo(() => {
    return allChannels.find(ch => ch.logo && ["tv5", "a2z", "abs-cbn"].includes(ch.id)) || allChannels[0]
  }, [])

  // Get Filipino channels for main grid (first 9)
  const filipinoChannels = useMemo(() => {
    return allChannels.slice(0, 9)
  }, [])

  // Filter channels for search
  const filteredChannels = useMemo(() => {
    if (!searchQuery) return []
    const term = searchQuery.toLowerCase()
    return allChannels.filter(ch => ch.name.toLowerCase().includes(term))
  }, [searchQuery])

  if (isCheckingAccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-foreground text-xl font-semibold">Verifying access...</div>
        </div>
      </div>
    )
  }

  if (!hasAccess) {
    return <TokenAccessOverlay onAccessGranted={() => setHasAccess(true)} />
  }

  if (selectedChannel) {
    return (
      <VideoPlayer
        channel={selectedChannel}
        user={null}
        onClose={handleClosePlayer}
        onChannelChange={() => {}}
        availableChannels={allChannels}
        videoRef={null}
        isMuted={true}
        showModernButton={false}
        showChannelInfo={true}
        showChannelList={true}
        getCurrentChannelInfo={() => ({ current: "Now", next: "Next" })}
        getCurrentSelectedChannelInfo={() => ({ current: "Now", next: "Next" })}
        onModernButtonHover={() => {}}
        onChannelInfoHover={() => {}}
        onChannelListHover={() => {}}
        isMobile={true}
        isPortrait={true}
        epgData={{}}
        currentPrograms={{}}
        onPositionUpdate={() => {}}
        getSavedPosition={() => Promise.resolve(0)}
      />
    )
  }

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-card border-b border-border px-4 py-3 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <img src="/images/design-mode/s.png" alt="Sky Bronze" className="h-6 w-auto" />
          <span className="font-bold text-foreground text-xs">Broadcast</span>
        </div>
        <button className="p-2 rounded hover:bg-muted">
          <Menu className="w-5 h-5 text-foreground" />
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="bg-card border-b border-border px-4 flex gap-6 sticky top-[52px] z-40">
        <button
          onClick={() => setCurrentTab("home")}
          className={`py-3 text-sm font-medium transition-colors border-b-2 ${
            currentTab === "home" 
              ? "border-primary text-foreground" 
              : "border-transparent text-muted-foreground"
          }`}
        >
          Live TV
        </button>
        <button
          onClick={() => setCurrentTab("channels")}
          className={`py-3 text-sm font-medium transition-colors border-b-2 ${
            currentTab === "channels" 
              ? "border-primary text-foreground" 
              : "border-transparent text-muted-foreground"
          }`}
        >
          On Demand
        </button>
        <button className="py-3 text-sm font-medium text-muted-foreground border-b-2 border-transparent">Sports</button>
        <button className="py-3 text-sm font-medium text-muted-foreground border-b-2 border-transparent">My Stuff</button>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto pb-20">
        {currentTab === "home" && (
          <>
            {/* Featured Content */}
            {featuredChannel && (
              <div className="relative w-full h-56 bg-card overflow-hidden">
                <img
                  src={featuredChannel.logo || "/placeholder.svg"}
                  alt={featuredChannel.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="bg-red-600 text-white text-xs font-bold px-2 py-1 rounded">LIVE</div>
                  </div>
                  <h3 className="text-white font-bold text-base mb-1">{featuredChannel.name}</h3>
                  <p className="text-gray-300 text-xs">Featured Content</p>
                </div>
                <button
                  onClick={() => handleChannelSelect(featuredChannel)}
                  className="absolute bottom-4 right-4 bg-white/90 hover:bg-white text-foreground px-4 py-2 rounded text-sm font-semibold transition-colors"
                >
                  Watch Now
                </button>
              </div>
            )}

            {/* Filipino Channels Section */}
            <div className="px-4 py-6">
              <h2 className="text-foreground font-bold text-lg mb-4">Filipino Channels</h2>
              <div className="grid grid-cols-3 gap-3">
                {filipinoChannels.map((channel) => (
                  <div
                    key={channel.id}
                    onClick={() => handleChannelSelect(channel)}
                    className="cursor-pointer group"
                  >
                    {/* Channel Logo Box */}
                    <div className="relative aspect-square bg-card border border-border rounded-lg overflow-hidden mb-2 flex items-center justify-center">
                      <img
                        src={channel.logo || "/placeholder.svg"}
                        alt={channel.name}
                        className="w-full h-full object-contain p-2"
                        onError={(e) => {
                          e.currentTarget.style.display = "none"
                        }}
                      />
                      {channel.isHD && (
                        <div className="absolute top-1 right-1 bg-blue-600 text-white text-xs font-bold px-1.5 py-0.5 rounded">HD</div>
                      )}
                    </div>
                    {/* Program Info */}
                    <p className="text-foreground text-xs font-medium truncate text-center mb-1">{channel.name}</p>
                    <div className="text-center">
                      <p className="text-muted-foreground text-xs">Now: News Hour</p>
                      <p className="text-muted-foreground text-xs">Next: Prime Time</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {currentTab === "channels" && (
          <div className="p-4 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
              <input
                type="text"
                placeholder="Search channels..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-card border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary text-sm"
              />
            </div>

            {searchQuery && (
              <div className="grid grid-cols-3 gap-3">
                {filteredChannels.map((channel) => (
                  <div
                    key={channel.id}
                    onClick={() => handleChannelSelect(channel)}
                    className="cursor-pointer"
                  >
                    <div className="relative aspect-square bg-card border border-border rounded-lg overflow-hidden mb-2 flex items-center justify-center">
                      <img
                        src={channel.logo || "/placeholder.svg"}
                        alt={channel.name}
                        className="w-full h-full object-contain p-2"
                        onError={(e) => {
                          e.currentTarget.style.display = "none"
                        }}
                      />
                    </div>
                    <p className="text-foreground text-xs font-medium truncate text-center">{channel.name}</p>
                  </div>
                ))}
              </div>
            )}

            {!searchQuery && (
              <div className="text-center py-8 text-muted-foreground">
                <p>Search for channels...</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border px-2 py-2 flex justify-around items-center">
        <button className="flex flex-col items-center gap-1 py-2 px-3 text-muted-foreground hover:text-foreground">
          <Home className="w-5 h-5" />
          <span className="text-xs font-semibold">Home</span>
        </button>
        <button className="w-10 h-10 rounded-full bg-muted" />
        <button className="flex flex-col items-center gap-1 py-2 px-3 text-muted-foreground hover:text-foreground">
          <Grid className="w-5 h-5" />
          <span className="text-xs font-semibold">Channels</span>
        </button>
      </div>
    </div>
  )
}

export default function SecretsasPage() {
  return (
    <Suspense fallback={<div />}>
      <SecretsasUI />
    </Suspense>
  )
}
