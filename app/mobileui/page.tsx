"use client"

import type React from "react"
import { useState, useEffect, useMemo } from "react"
import { VideoPlayer } from "@/components/video-player"
import { allChannels } from "@/data/channels/all-channels"
import { Button } from "@/components/ui/button"
import { Search, Home, Tv, Grid, Menu, X, CheckCircle, XCircle, ChevronDown, ChevronRight, Loader2 } from 'lucide-react'
import { useChannelScanner } from "@/hooks/use-channel-scanner"
import type { Channel } from "@/data/types/channel"
import { ThemeToggle } from "@/components/theme-toggle"
import { TokenAccessOverlay } from "@/components/token-access-overlay"
import { validateTokenClient } from "@/lib/token-manager"
import { createClient } from "@/lib/supabase/client"
import { setUserPreference, getUserPreference } from "@/lib/user-preferences"
import { Suspense } from "react"
import { useDeviceRedirect } from "@/hooks/use-device-redirect"

const useAccessControl = () => {
  const [hasAccess, setHasAccess] = useState(false)
  const [isCheckingAccess, setIsCheckingAccess] = useState(true)

  useEffect(() => {
    const checkAccess = async () => {
      const pathToken = window.location.pathname.slice(1)
      if (pathToken === "permanent" || pathToken.startsWith("tokenlizedlinknumber")) {
        const tokenInfo = await validateTokenClient(pathToken === "permanent" ? "permanent" : pathToken)
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

function MobileUILoading() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-foreground text-xl font-semibold">Loading Cignal Station...</div>
        </div>
    </div>
  )
}

const MobileUI = () => {
  const { hasAccess, isCheckingAccess, setHasAccess } = useAccessControl()
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("All")
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [currentTab, setCurrentTab] = useState<"home" | "livetv" | "categories">("home")
  const [workingExpanded, setWorkingExpanded] = useState(false)
  const [notWorkingExpanded, setNotWorkingExpanded] = useState(false)
  
  // Use the channel scanner hook
  const { isScanning, scanProgress, currentChannel, workingChannels, notWorkingChannels } = useChannelScanner()

  useDeviceRedirect('mobileui') // Move redirect hook inside component to prevent race conditions with access control
  
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

  const categories = useMemo(() => {
    const categorySet = new Set(allChannels.map((channel) => channel.category))
    return ["All", ...Array.from(categorySet).sort()]
  }, [])

  const filteredChannels = useMemo(() => {
    const searchTerm = searchQuery.toLowerCase().trim()

    if (searchTerm) {
      return allChannels.filter((channel) => {
        const channelName = channel.name.toLowerCase()
        const channelCategory = channel.category.toLowerCase()
        return channelName.includes(searchTerm) || channelCategory.includes(searchTerm)
      })
    }

    if (selectedCategory === "All") {
      return allChannels
    }

    return allChannels.filter((channel) => channel.category === selectedCategory)
  }, [searchQuery, selectedCategory])

  if (isCheckingAccess || isScanning) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background via-background to-secondary/30 flex items-center justify-center p-6">
        <div className="text-center max-w-sm w-full">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary via-primary to-accent flex items-center justify-center mx-auto mb-6 shadow-lg"
               style={{ boxShadow: '0 8px 32px rgba(0, 180, 216, 0.35)' }}>
            <span className="text-white font-bold text-lg">CS</span>
          </div>
          <h1 className="text-foreground text-xl font-bold mb-2">Cignal Station</h1>
          {isScanning ? (
            <>
              <p className="text-muted-foreground text-sm mb-4">Scanning channels...</p>
              <div className="w-full h-2 bg-border rounded-full overflow-hidden mb-3">
                <div
                  className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-300"
                  style={{ width: `${scanProgress}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground truncate mb-2">{currentChannel}</p>
              <div className="flex justify-center gap-4 text-xs">
                <span className="text-green-500 font-semibold">{workingChannels.length} working</span>
                <span className="text-red-400 font-semibold">{notWorkingChannels.length} not working</span>
              </div>
            </>
          ) : (
            <>
              <p className="text-muted-foreground text-sm mb-4">Verifying access...</p>
              <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto" />
            </>
          )}
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
    <div className="h-screen bg-gradient-to-b from-background via-background to-secondary/30 flex flex-col overflow-hidden">
      {/* Crystal Aero Header */}
      <div className="bg-card/70 backdrop-blur-xl border-b border-primary/20 px-4 py-3 flex items-center justify-between safe-area-top"
           style={{ boxShadow: '0 4px 20px rgba(0, 180, 216, 0.08)' }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-primary via-primary to-accent flex items-center justify-center shadow-lg"
               style={{ boxShadow: '0 4px 16px rgba(0, 180, 216, 0.35)' }}>
            <span className="text-white font-bold text-xs tracking-tight">CS</span>
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-foreground text-sm tracking-tight">Cignal Station</span>
            <span className="text-[10px] text-muted-foreground font-medium">Stream Anywhere</span>
          </div>
        </div>
        <ThemeToggle />
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto pb-24">
        {currentTab === "home" && (
          <div className="p-4 space-y-5">
            {/* Crystal Search Bar */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-primary w-5 h-5" />
              <input
                type="text"
                placeholder="Search channels..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 bg-card/80 backdrop-blur-sm border border-primary/25 rounded-2xl text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 text-sm transition-all"
                style={{ boxShadow: '0 4px 16px rgba(0, 180, 216, 0.06)' }}
              />
            </div>

            {searchQuery && (
              <div className="space-y-3 animate-fade-in">
                <h2 className="text-sm font-bold text-foreground tracking-tight">Search Results</h2>
                <div className="grid grid-cols-3 gap-2.5">
                  {filteredChannels.map((channel, index) => (
                    <div
                      key={channel.id}
                      onClick={() => handleChannelSelect(channel)}
                      className={`channel-card-smooth flex flex-col gap-1.5 cursor-pointer group active:scale-95 transition-transform stagger-${Math.min(index % 6 + 1, 6)}`}
                      style={{ WebkitTapHighlightColor: 'transparent' }}
                    >
                      <div className="aspect-video bg-gradient-to-br from-secondary/50 to-card rounded-xl overflow-hidden flex items-center justify-center p-2">
                        <img
                          src={channel.logo || "/placeholder.svg"}
                          alt={channel.name}
                          className="w-full h-full object-contain image-zoom-smooth"
                          onError={(e) => {
                            e.currentTarget.style.display = "none"
                          }}
                        />
                      </div>
                      <p className="text-[10px] font-semibold text-foreground/85 truncate text-center px-1">{channel.name}</p>
                    </div>
                  ))}
                </div>
                {filteredChannels.length === 0 && (
                  <div className="text-center py-10">
                    <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-primary/10 flex items-center justify-center">
                      <Search className="w-8 h-8 text-primary/50" />
                    </div>
                    <p className="text-muted-foreground text-sm">No channels found</p>
                  </div>
                )}
              </div>
            )}

            {/* Featured Section - only show when not searching */}
            {!searchQuery && (
              <>
                {/* Welcome Banner */}
                <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary to-accent p-4"
                     style={{ boxShadow: '0 8px 32px rgba(0, 180, 216, 0.25)' }}>
                  <div className="relative z-10">
                    <p className="text-white/80 text-xs font-medium mb-1">Welcome to</p>
                    <h1 className="text-white text-xl font-bold tracking-tight">Cignal Station</h1>
                    <p className="text-white/70 text-xs mt-1">Free streaming, everywhere</p>
                  </div>
                  <div className="absolute -right-4 -bottom-4 w-24 h-24 rounded-full bg-white/10 blur-xl"></div>
                  <div className="absolute right-8 top-2 w-12 h-12 rounded-full bg-accent/30 blur-lg"></div>
                </div>

                {/* Working Channels Folder */}
                <div className="space-y-2">
                  <button
                    onClick={() => setWorkingExpanded(!workingExpanded)}
                    className="w-full flex items-center gap-3 p-3 rounded-2xl bg-green-500/10 border border-green-500/25 active:scale-[0.98] transition-all"
                    style={{ WebkitTapHighlightColor: 'transparent' }}
                  >
                    {workingExpanded ? <ChevronDown className="w-4 h-4 text-green-500" /> : <ChevronRight className="w-4 h-4 text-green-500" />}
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span className="font-semibold text-green-600 dark:text-green-400 text-sm flex-1 text-left">Working</span>
                    <span className="text-xs font-bold text-green-500 bg-green-500/20 px-2.5 py-1 rounded-full">{workingChannels.length}</span>
                  </button>
                  {workingExpanded && (
                    <div className="grid grid-cols-3 gap-2 pl-2 animate-fade-in">
                      {workingChannels.map((channel, index) => (
                        <div
                          key={channel.id}
                          onClick={() => handleChannelSelect(channel)}
                          className="channel-card-smooth flex flex-col gap-1 cursor-pointer active:scale-95"
                          style={{ WebkitTapHighlightColor: 'transparent' }}
                        >
                          <div className="aspect-video bg-gradient-to-br from-green-500/10 to-card rounded-xl overflow-hidden flex items-center justify-center p-1.5 border border-green-500/20">
                            <img src={channel.logo || "/placeholder.svg"} alt={channel.name} className="w-full h-full object-contain" onError={(e) => { e.currentTarget.style.display = "none" }} />
                          </div>
                          <p className="text-[9px] font-medium text-foreground/80 truncate text-center">{channel.name}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Not Working Channels Folder */}
                <div className="space-y-2">
                  <button
                    onClick={() => setNotWorkingExpanded(!notWorkingExpanded)}
                    className="w-full flex items-center gap-3 p-3 rounded-2xl bg-red-500/10 border border-red-500/25 active:scale-[0.98] transition-all"
                    style={{ WebkitTapHighlightColor: 'transparent' }}
                  >
                    {notWorkingExpanded ? <ChevronDown className="w-4 h-4 text-red-400" /> : <ChevronRight className="w-4 h-4 text-red-400" />}
                    <XCircle className="w-5 h-5 text-red-400" />
                    <span className="font-semibold text-red-500 dark:text-red-400 text-sm flex-1 text-left">Not Working</span>
                    <span className="text-xs font-bold text-red-400 bg-red-500/20 px-2.5 py-1 rounded-full">{notWorkingChannels.length}</span>
                  </button>
                  {notWorkingExpanded && (
                    <div className="grid grid-cols-3 gap-2 pl-2 animate-fade-in">
                      {notWorkingChannels.map((channel, index) => (
                        <div
                          key={channel.id}
                          onClick={() => handleChannelSelect(channel)}
                          className="channel-card-smooth flex flex-col gap-1 cursor-pointer active:scale-95 opacity-60"
                          style={{ WebkitTapHighlightColor: 'transparent' }}
                        >
                          <div className="aspect-video bg-gradient-to-br from-red-500/10 to-card rounded-xl overflow-hidden flex items-center justify-center p-1.5 border border-red-500/20">
                            <img src={channel.logo || "/placeholder.svg"} alt={channel.name} className="w-full h-full object-contain" onError={(e) => { e.currentTarget.style.display = "none" }} />
                          </div>
                          <p className="text-[9px] font-medium text-foreground/80 truncate text-center">{channel.name}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <h2 className="text-sm font-bold text-foreground tracking-tight flex items-center gap-2">
                    <span className="w-1.5 h-5 bg-gradient-to-b from-primary to-accent rounded-full"></span>
                    Featured Channels
                  </h2>
                  <div className="grid grid-cols-2 gap-3">
                    {allChannels.slice(0, 4).map((channel, index) => (
                      <div
                        key={channel.id}
                        onClick={() => handleChannelSelect(channel)}
                        className={`channel-card-smooth crystal-shine aspect-[4/3] bg-gradient-to-br from-card to-secondary/30 rounded-2xl overflow-hidden cursor-pointer active:scale-95 transition-all flex items-center justify-center p-4 stagger-${index + 1}`}
                        style={{ WebkitTapHighlightColor: 'transparent' }}
                      >
                        <img
                          src={channel.logo || "/placeholder.svg"}
                          alt={channel.name}
                          className="w-full h-full object-contain image-zoom-smooth"
                          onError={(e) => {
                            e.currentTarget.style.display = "none"
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Categories */}
                <div className="space-y-3">
                  <h2 className="text-sm font-bold text-foreground tracking-tight flex items-center gap-2">
                    <span className="w-1.5 h-5 bg-gradient-to-b from-accent to-primary rounded-full"></span>
                    Browse Categories
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {categories.slice(0, 9).map((category) => (
                      <button
                        key={category}
                        onClick={() => {
                          setSelectedCategory(category)
                          setCurrentTab("livetv")
                        }}
                        className={`category-pill text-xs ${selectedCategory === category ? 'active' : ''}`}
                        style={{ WebkitTapHighlightColor: "transparent", touchAction: "manipulation" }}
                      >
                        {category}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Quick Access */}
                <div className="space-y-3">
                  <h2 className="text-sm font-bold text-foreground tracking-tight flex items-center gap-2">
                    <span className="w-1.5 h-5 bg-gradient-to-b from-primary to-accent rounded-full"></span>
                    Quick Access
                  </h2>
                  <div className="grid grid-cols-3 gap-2.5">
                    {allChannels.slice(4, 10).map((channel, index) => (
                      <div
                        key={channel.id}
                        onClick={() => handleChannelSelect(channel)}
                        className={`channel-card-smooth flex flex-col gap-1.5 cursor-pointer group active:scale-95 stagger-${index + 1}`}
                        style={{ WebkitTapHighlightColor: 'transparent' }}
                      >
                        <div className="aspect-video bg-gradient-to-br from-secondary/50 to-card rounded-xl overflow-hidden flex items-center justify-center p-2">
                          <img
                            src={channel.logo || "/placeholder.svg"}
                            alt={channel.name}
                            className="w-full h-full object-contain image-zoom-smooth"
                            onError={(e) => {
                              e.currentTarget.style.display = "none"
                            }}
                          />
                        </div>
                        <p className="text-[10px] font-semibold text-foreground/85 truncate text-center px-1">{channel.name}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {currentTab === "livetv" && (
          <div className="p-4 space-y-4 animate-fade-in">
            {/* Working Channels Folder */}
            <div className="space-y-2">
              <button
                onClick={() => setWorkingExpanded(!workingExpanded)}
                className="w-full flex items-center gap-2 p-2.5 rounded-xl bg-green-500/10 border border-green-500/25 active:scale-[0.98] transition-all"
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                {workingExpanded ? <ChevronDown className="w-3.5 h-3.5 text-green-500" /> : <ChevronRight className="w-3.5 h-3.5 text-green-500" />}
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="font-semibold text-green-600 dark:text-green-400 text-xs flex-1 text-left">Working</span>
                <span className="text-[10px] font-bold text-green-500 bg-green-500/20 px-2 py-0.5 rounded-full">{workingChannels.length}</span>
              </button>
              {workingExpanded && (
                <div className="grid grid-cols-3 gap-2 animate-fade-in">
                  {workingChannels.map((channel) => (
                    <div
                      key={channel.id}
                      onClick={() => handleChannelSelect(channel)}
                      className="channel-card-smooth flex flex-col gap-1 cursor-pointer active:scale-95"
                      style={{ WebkitTapHighlightColor: 'transparent' }}
                    >
                      <div className="aspect-video bg-gradient-to-br from-green-500/10 to-card rounded-xl overflow-hidden flex items-center justify-center p-1.5 border border-green-500/20">
                        <img src={channel.logo || "/placeholder.svg"} alt={channel.name} className="w-full h-full object-contain" onError={(e) => { e.currentTarget.style.display = "none" }} />
                      </div>
                      <p className="text-[9px] font-medium text-foreground/80 truncate text-center">{channel.name}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Not Working Channels Folder */}
            <div className="space-y-2">
              <button
                onClick={() => setNotWorkingExpanded(!notWorkingExpanded)}
                className="w-full flex items-center gap-2 p-2.5 rounded-xl bg-red-500/10 border border-red-500/25 active:scale-[0.98] transition-all"
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                {notWorkingExpanded ? <ChevronDown className="w-3.5 h-3.5 text-red-400" /> : <ChevronRight className="w-3.5 h-3.5 text-red-400" />}
                <XCircle className="w-4 h-4 text-red-400" />
                <span className="font-semibold text-red-500 dark:text-red-400 text-xs flex-1 text-left">Not Working</span>
                <span className="text-[10px] font-bold text-red-400 bg-red-500/20 px-2 py-0.5 rounded-full">{notWorkingChannels.length}</span>
              </button>
              {notWorkingExpanded && (
                <div className="grid grid-cols-3 gap-2 animate-fade-in">
                  {notWorkingChannels.map((channel) => (
                    <div
                      key={channel.id}
                      onClick={() => handleChannelSelect(channel)}
                      className="channel-card-smooth flex flex-col gap-1 cursor-pointer active:scale-95 opacity-60"
                      style={{ WebkitTapHighlightColor: 'transparent' }}
                    >
                      <div className="aspect-video bg-gradient-to-br from-red-500/10 to-card rounded-xl overflow-hidden flex items-center justify-center p-1.5 border border-red-500/20">
                        <img src={channel.logo || "/placeholder.svg"} alt={channel.name} className="w-full h-full object-contain" onError={(e) => { e.currentTarget.style.display = "none" }} />
                      </div>
                      <p className="text-[9px] font-medium text-foreground/80 truncate text-center">{channel.name}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Category Filter */}
            <div className="space-y-3">
              <h2 className="text-sm font-bold text-foreground tracking-tight flex items-center gap-2">
                <span className="w-1.5 h-5 bg-gradient-to-b from-primary to-accent rounded-full"></span>
                {selectedCategory === "All" ? "All Channels" : selectedCategory}
                <span className="ml-auto text-xs font-medium text-primary bg-primary/10 px-2.5 py-1 rounded-full">
                  {filteredChannels.length}
                </span>
              </h2>
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
                {categories.map((category) => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`category-pill text-xs whitespace-nowrap ${selectedCategory === category ? 'active' : ''}`}
                    style={{ WebkitTapHighlightColor: "transparent", touchAction: "manipulation" }}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>

            {/* Channels Grid */}
            <div className="grid grid-cols-3 gap-2.5">
              {filteredChannels.map((channel, index) => (
                <div
                  key={channel.id}
                  onClick={() => handleChannelSelect(channel)}
                  className={`channel-card-smooth flex flex-col gap-1.5 cursor-pointer group active:scale-95 stagger-${Math.min(index % 6 + 1, 6)}`}
                  style={{ WebkitTapHighlightColor: 'transparent' }}
                >
                  <div className="aspect-video bg-gradient-to-br from-secondary/50 to-card rounded-xl overflow-hidden flex items-center justify-center p-2">
                    <img
                      src={channel.logo || "/placeholder.svg"}
                      alt={channel.name}
                      className="w-full h-full object-contain image-zoom-smooth"
                      onError={(e) => {
                        e.currentTarget.style.display = "none"
                      }}
                    />
                  </div>
                  <p className="text-[10px] font-semibold text-foreground/85 truncate text-center px-1">{channel.name}</p>
                </div>
              ))}
            </div>

            {filteredChannels.length === 0 && (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-primary/10 flex items-center justify-center">
                  <Tv className="w-8 h-8 text-primary/50" />
                </div>
                <p className="text-muted-foreground text-sm">No channels in this category</p>
              </div>
            )}
          </div>
        )}

        {currentTab === "categories" && (
          <div className="p-4 space-y-4 animate-fade-in">
            <h2 className="text-sm font-bold text-foreground tracking-tight flex items-center gap-2">
              <span className="w-1.5 h-5 bg-gradient-to-b from-accent to-primary rounded-full"></span>
              All Categories
            </h2>
            <div className="space-y-2.5">
              {categories.map((category, index) => {
                const count = category === "All" ? allChannels.length : allChannels.filter((ch) => ch.category === category).length
                return (
                  <button
                    key={category}
                    onClick={() => {
                      setSelectedCategory(category)
                      setCurrentTab("livetv")
                    }}
                    className={`aero-card w-full p-4 flex justify-between items-center text-left active:scale-[0.98] stagger-${Math.min(index % 6 + 1, 6)}`}
                    style={{ WebkitTapHighlightColor: 'transparent' }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                        <Grid className="w-5 h-5 text-primary" />
                      </div>
                      <span className="font-semibold text-foreground text-sm">{category}</span>
                    </div>
                    <span className="text-xs text-primary-foreground bg-gradient-to-r from-primary to-accent px-3 py-1.5 rounded-full font-bold shadow-sm">
                      {count}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Crystal Aero Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-card/85 backdrop-blur-xl border-t border-primary/15 px-2 py-2 flex justify-around safe-area-bottom"
           style={{ boxShadow: '0 -4px 24px rgba(0, 180, 216, 0.1)' }}>
        <button
          onClick={() => setCurrentTab("home")}
          className={`flex flex-col items-center gap-1 py-2.5 px-5 rounded-2xl transition-all active:scale-95 ${
            currentTab === "home" 
              ? "text-primary-foreground bg-gradient-to-br from-primary to-accent shadow-lg" 
              : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
          }`}
          style={{ 
            WebkitTapHighlightColor: "transparent", 
            touchAction: "manipulation",
            boxShadow: currentTab === "home" ? '0 4px 16px rgba(0, 180, 216, 0.3)' : 'none'
          }}
        >
          <Home className="w-5 h-5" />
          <span className="text-[10px] font-semibold">Home</span>
        </button>
        <button
          onClick={() => setCurrentTab("livetv")}
          className={`flex flex-col items-center gap-1 py-2.5 px-5 rounded-2xl transition-all active:scale-95 ${
            currentTab === "livetv" 
              ? "text-primary-foreground bg-gradient-to-br from-primary to-accent shadow-lg" 
              : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
          }`}
          style={{ 
            WebkitTapHighlightColor: "transparent", 
            touchAction: "manipulation",
            boxShadow: currentTab === "livetv" ? '0 4px 16px rgba(0, 180, 216, 0.3)' : 'none'
          }}
        >
          <Tv className="w-5 h-5" />
          <span className="text-[10px] font-semibold">Live TV</span>
        </button>
        <button
          onClick={() => setCurrentTab("categories")}
          className={`flex flex-col items-center gap-1 py-2.5 px-5 rounded-2xl transition-all active:scale-95 ${
            currentTab === "categories" 
              ? "text-primary-foreground bg-gradient-to-br from-primary to-accent shadow-lg" 
              : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
          }`}
          style={{ 
            WebkitTapHighlightColor: "transparent", 
            touchAction: "manipulation",
            boxShadow: currentTab === "categories" ? '0 4px 16px rgba(0, 180, 216, 0.3)' : 'none'
          }}
        >
          <Grid className="w-5 h-5" />
          <span className="text-[10px] font-semibold">Explore</span>
        </button>
      </div>
    </div>
  )
}

export default function MobileUIPage() {
  return (
    <Suspense fallback={<MobileUILoading />}>
      <MobileUI />
    </Suspense>
  )
}
