"use client"

import type React from "react"
import { useState, useEffect, useRef, useMemo } from "react"
import { VideoPlayer } from "@/components/video-player"
import { allChannels } from "@/data/channels/all-channels"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, Search, Menu, HomeIcon, Tv, X, Heart, Star, Clock, PictureInPicture, Keyboard, Zap, TrendingUp, LayoutGrid, List } from "lucide-react"
import type { Channel } from "@/data/types/channel"
import { ThemeToggle } from "@/components/theme-toggle"
import { SetupCheck } from "@/components/setup-check"
import { createClient } from "@/lib/supabase/client"
import { setUserPreference, getUserPreference } from "@/lib/user-preferences"
import { ChannelRequestModal } from "@/components/channel-request-modal"
import { RatingModal } from "@/components/rating-modal"
import { useTheme } from "next-themes"
import { SupportPopup } from "@/components/support-popup"
import { ReportModal } from "@/components/report-modal"
import { AnnouncementsSystem } from "@/components/announcements-system"
import { IOSUnsupportedModal } from "@/components/ios-unsupported-modal"
import { useAccessControl } from "@/lib/hooks/useAccessControl" // Added import for useAccessControl
import { getFavorites, addFavorite, removeFavorite, isFavorite, addToRecentlyWatched, getRecentlyWatched } from "@/lib/favorites"
import { QuickChannelSwitch } from "@/components/quick-channel-switch"
import { ChannelStats } from "@/components/channel-stats"
import { PipMode, usePipMode } from "@/components/pip-mode"

type StreamFormat = "HLS" | "DASH" | "CLEARKEY_DRM" | "UNKNOWN"

const getNextProgram = (channelId: string, epgEntry: any) => {
  if (!epgEntry || !epgEntry.programmes) return null

  const now = new Date()
  const programmes = epgEntry.programmes

  const nextProg = programmes.find((prog: any) => {
    if (!prog.start) return false

    const startTime = new Date(
      prog.start.replace(/(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2}) (.+)/, "$1-$2-$3T$4:$5:$6"),
    )

    return startTime > now
  })

  return nextProg
}

const ChannelGuideModal = ({
  isOpen,
  onClose,
  channelGuideSearch,
  setChannelGuideSearch,
  epgData,
  currentPrograms,
}: {
  isOpen: boolean
  onClose: () => void
  channelGuideSearch: string
  setChannelGuideSearch: (search: string) => void
  epgData: any
  currentPrograms: any
}) => {
  if (!isOpen) return null

  const guideFilteredChannels = allChannels.filter(
    (channel) =>
      channel.name.toLowerCase().includes(channelGuideSearch.toLowerCase()) ||
      channel.category.toLowerCase().includes(channelGuideSearch.toLowerCase()),
  )

  return (
    <div className="fixed inset-0 bg-background/80 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-card rounded-lg w-full max-w-sm sm:max-w-md md:max-w-2xl lg:max-w-4xl h-full sm:h-5/6 max-h-screen flex flex-col border border-border">
        <div className="flex items-center justify-between p-3 sm:p-4 border-b border-border">
          <h2 className="text-base sm:text-lg font-semibold text-foreground">Channel Guide</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors p-1">
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        <div className="p-3 border-b border-border">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-muted-foreground w-3.5 h-3.5" />
            <input
              type="text"
              placeholder="Search channels..."
              value={channelGuideSearch}
              onChange={(e) => setChannelGuideSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-secondary border-none rounded-md text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-border text-sm"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 sm:p-3">
          <div className="space-y-2">
            {guideFilteredChannels.length === 0 ? (
              <div className="text-center text-muted-foreground py-8 text-sm">{"No channels found"}</div>
            ) : (
              guideFilteredChannels.map((channel) => {
                let epgEntry = null
                let currentProg = null
                let nextProg = null

                try {
                  if (epgData && typeof epgData === "object") {
                    epgEntry = Object.values(epgData).find((epg: any) => {
                      if (!epg || !epg.name) return false
                      const epgName = epg.name.toLowerCase().trim()
                      const channelName = channel.name.toLowerCase().trim()

                      if (epgName === channelName) return true
                      if (epgName.includes(channelName) || channelName.includes(epgName)) return true

                      const cleanEpgName = epgName.replace(/[\s\-_.]/g, "")
                      const cleanChannelName = channelName.replace(/[\s\-_.]/g, "")

                      if (cleanEpgName.includes(cleanChannelName) || cleanChannelName.includes(cleanEpgName))
                        return true

                      return false
                    }) as any

                    currentProg = epgEntry && currentPrograms ? currentPrograms[epgEntry.id] : null
                    nextProg = epgEntry ? getNextProgram(epgEntry.id, epgEntry) : null
                  }
                } catch (error) {
                  console.log("[v0] Error matching EPG data:", error)
                }

                return (
                  <div
                    key={channel.id}
                    className="rounded-md p-2.5 hover:bg-secondary transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0">
                        <img
                          src={channel.logo || "/placeholder.svg"}
                          alt={channel.name}
                          className="w-10 h-10 object-contain bg-secondary rounded-md p-1"
                          onError={(e) => {
                            e.currentTarget.style.display = "none"
                          }}
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-medium text-foreground truncate">{channel.name}</h3>
                          <span className="text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded ml-2 shrink-0">
                            {channel.category}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {currentProg?.title || "No program info"}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Home() {
  const { theme } = useTheme()
  const { hasAccess, isCheckingAccess, setHasAccess } = useAccessControl()

  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("All")
  const [isDarkMode, setIsDarkMode] = useState(true)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [savedScrollPosition, setSavedScrollPosition] = useState(0)
  const [streamFormat, setStreamFormat] = useState<StreamFormat>("UNKNOWN")
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isMuted, setIsMuted] = useState(true)
  const [showSettings, setShowSettings] = useState(false)
  const [recentChannels, setRecentChannels] = useState<string[]>([])
  const [favoriteChannels, setFavoriteChannels] = useState<string[]>([])
  const [isPCUser, setIsPCUser] = useState(false)
  const [showChannelInfo, setShowChannelInfo] = useState(true)
  const [channelInfoTimeout, setChannelInfoTimeout] = useState<NodeJS.Timeout | null>(null)
  const [showChannelList, setShowChannelList] = useState(true)
  const modernButtonTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const channelListTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [showModernButton, setShowModernButton] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false)
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [isMobile, setIsMobile] = useState(false)
  const [isPortrait, setIsPortrait] = useState(false)
  const [isLiveTVView, setIsLiveTVView] = useState(true) // Changed from false to true
  const [wasInLiveTVBeforePlayer, setWasInLiveTVBeforePlayer] = useState(false)
  const [headerTitle, setHeaderTitle] = useState("Home")
  const [showChannelRequestModal, setShowChannelRequestModal] = useState(false)
  const [showRatingModal, setShowRatingModal] = useState(false)
  const [recommendedChannels, setRecommendedChannels] = useState<Channel[]>([])
  const [currentRecommendedIndex, setCurrentRecommendedIndex] = useState(0)
  const [isNavTransparent, setIsNavTransparent] = useState(true)
  const [scrollTimeout, setScrollTimeout] = useState<NodeJS.Timeout | null>(null)
  const recommendedIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const searchTimerRef = useRef<NodeJS.Timeout | null>(null)
  const [showChannelGuide, setShowChannelGuide] = useState(false)
  const [channelGuideSearch, setChannelGuideSearch] = useState("")
  const [epgData, setEpgData] = useState<any>({})
  const [currentPrograms, setCurrentPrograms] = useState<any>({})
  const [topPicks, setTopPicks] = useState<Channel[]>([])
  const [lastTopPicksRefresh, setLastTopPicksRefresh] = useState<number>(0)
  const [userSessionId, setUserSessionId] = useState<string>("")
  const [showReportModal, setShowReportModal] = useState(false)
  const [showSupportModal, setShowSupportModal] = useState(false)
  const [isFirstTimeUser, setIsFirstTimeUser] = useState(false)
  const [favorites, setFavorites] = useState<string[]>([])
  const [recentlyWatched, setRecentlyWatched] = useState<string[]>([])
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false)
  const [showQuickSwitch, setShowQuickSwitch] = useState(false)
  const [showChannelStats, setShowChannelStats] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const { isPipActive, pipChannel, activatePip, deactivatePip } = usePipMode()
  const [listSearchQuery, setListSearchQuery] = useState("")
  const [listSelectedCategory, setListSelectedCategory] = useState("All")

  const EPG_URLS = [
    "https://epgshare01.online/epgshare01/epg_ripper_PH1.xml.gz",
    "https://epgshare01.online/epgshare01/epg_ripper_PH2.xml.gz",
    "https://epgshare01.online/epgshare01/epg_ripper_ID1.xml.gz",
    "https://epgshare01.online/epgshare01/epg_ripper_MY1.xml.gz",
    "https://epgshare01.online/epgshare01/epg_ripper_HK1.xml.gz",
    "https://epgshare01.online/epgshare01/epg_ripper_US1.xml.gz",
    "https://www.open-epg.com/files/philippines1.xml.gz",
    "https://www.open-epg.com/files/philippines2.xml.gz",
  ]

  useEffect(() => {
    document.title = headerTitle
  }, [headerTitle])

  // Initialize favorites and recently watched
  useEffect(() => {
    setFavorites(getFavorites())
    setRecentlyWatched(getRecentlyWatched())
  }, [])



  // Check if first-time user and show support popup
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    const hasSeenPopup = localStorage.getItem('supportPopupSeen') === 'true'
    if (!hasSeenPopup) {
      setIsFirstTimeUser(true)
      setShowSupportModal(true)
    }
  }, [])

  const fetchEPGData = async () => {
    try {
      const fallbackEPGData = {
        gma7: {
          id: "gma7",
          name: "GMA 7",
          programmes: [
            {
              start: "20241201120000 +0800",
              stop: "20241201130000 +0800",
              title: "24 Oras",
              desc: "News and current affairs program",
            },
          ],
        },
      }

      const epgPromises = EPG_URLS.map(async (url) => {
        try {
          console.log(`[v0] Fetching EPG from: ${url}`)
          const response = await fetch(`/api/proxy-epg?url=${encodeURIComponent(url)}`, {
            method: "GET",
            headers: {
              Accept: "application/xml",
            },
          })

          if (!response.ok) {
            console.log(`[v0] EPG fetch failed with status ${response.status} for ${url}`)
            const errorText = await response.text()
            console.log(`[v0] Error response: ${errorText.substring(0, 200)}`)
            return null
          }

          const xmlText = await response.text()
          console.log(`[v0] Received ${xmlText.length} bytes of XML from ${url}`)
          const parsed = parseEPGXML(xmlText)
          console.log(`[v0] Successfully parsed EPG, found ${Object.keys(parsed).length} channels`)
          return parsed
        } catch (error) {
          console.log(`[v0] Error fetching EPG from ${url}:`, error instanceof Error ? error.message : error)
          return null
        }
      })

      const results = await Promise.all(epgPromises)
      const combinedEPG = results.reduce((acc, epg) => {
        if (epg) return { ...acc, ...epg }
        return acc
      }, {})

      console.log(`[v0] Combined EPG has ${Object.keys(combinedEPG).length} total channels`)
      const finalEPGData = Object.keys(combinedEPG).length > 0 ? combinedEPG : fallbackEPGData
      setEpgData(finalEPGData)
      updateCurrentPrograms(finalEPGData)
    } catch (error) {
      console.log("[v0] EPG fetch error:", error instanceof Error ? error.message : error)
      setEpgData({})
    }
  }

  const parseEPGXML = (xmlText: string) => {
    try {
      const parser = new DOMParser()
      const xmlDoc = parser.parseFromString(xmlText, "text/xml")
      const channels: any = {}
      const channelElements = xmlDoc.getElementsByTagName("channel")

      for (let i = 0; i < channelElements.length; i++) {
        const channel = channelElements[i]
        const id = channel.getAttribute("id")
        const displayName = channel.getElementsByTagName("display-name")[0]?.textContent

        if (id && displayName) {
          channels[id] = { id, name: displayName, programmes: [] }
        }
      }

      const programmeElements = xmlDoc.getElementsByTagName("programme")
      for (let i = 0; i < programmeElements.length; i++) {
        const programme = programmeElements[i]
        const channelId = programme.getAttribute("channel")
        const start = programme.getAttribute("start")
        const stop = programme.getAttribute("stop")
        const title = programme.getElementsByTagName("title")[0]?.textContent
        const desc = programme.getElementsByTagName("desc")[0]?.textContent

        if (channelId && channels[channelId] && title) {
          channels[channelId].programmes.push({ start, stop, title, desc: desc || "" })
        }
      }

      return channels
    } catch (error) {
      console.log("[v0] Error parsing EPG XML:", error)
      return {}
    }
  }

  const updateCurrentPrograms = (epgData: any) => {
    const now = new Date()
    const currentProgs: any = {}

    Object.keys(epgData).forEach((channelId) => {
      const programmes = epgData[channelId].programmes
      const currentProg = programmes.find((prog: any) => {
        if (!prog.start || !prog.stop) return false
        const startTime = new Date(
          prog.start.replace(/(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2}) (.+)/, "$1-$2-$3T$4:$5:$6"),
        )
        const endTime = new Date(
          prog.stop.replace(/(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2}) (.+)/, "$1-$2-$3T$4:$5:$6"),
        )
        return startTime <= now && now <= endTime
      })

      if (currentProg) {
        currentProgs[channelId] = currentProg
      }
    })

    setCurrentPrograms(currentProgs)
  }

  useEffect(() => {
    fetchEPGData()
    const epgRefreshInterval = setInterval(fetchEPGData, 600000)
    return () => clearInterval(epgRefreshInterval)
  }, [])

  useEffect(() => {
    const initializeSession = async () => {
      let sessionId = await getUserPreference("userSessionId")
      if (!sessionId) {
        sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        await setUserPreference("userSessionId", sessionId)
      }
      setUserSessionId(sessionId)
    }
    initializeSession()
  }, [])

  const handleChannelSelectForLiveTV = (channel: Channel) => {
    setWasInLiveTVBeforePlayer(true)
    setSelectedChannel(channel)
    setHeaderTitle(channel.name)
    setIsLiveTVView(true)
  }

  const handleChannelSelect = (channel: Channel) => {
  setSavedScrollPosition(window.scrollY)
  if (channel.url) {
  setWasInLiveTVBeforePlayer(false)
  setSelectedChannel(channel)
  setHeaderTitle(channel.name)
  addToRecentlyWatched(channel.id)
  setRecentlyWatched(getRecentlyWatched())
  }
  }

  const toggleFavorite = (channelId: string) => {
    if (isFavorite(channelId)) {
      removeFavorite(channelId)
    } else {
      addFavorite(channelId)
    }
    setFavorites(getFavorites())
  }

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY
      if (scrollY > 50) {
        setIsNavTransparent(false)
      } else {
        setIsNavTransparent(true)
      }

      if (scrollTimeout) {
        clearTimeout(scrollTimeout)
      }

      const timeout = setTimeout(() => {
        if (window.scrollY > 50) {
          setIsNavTransparent(true)
        }
      }, 4000)

      setScrollTimeout(timeout)
    }

    window.addEventListener("scroll", handleScroll)
    return () => {
      window.removeEventListener("scroll", handleScroll)
      if (scrollTimeout) {
        clearTimeout(scrollTimeout)
      }
    }
  }, [scrollTimeout])

  useEffect(() => {
    const initializeRecommendedChannels = () => {
      const channels = allChannels.filter(
        (channel) =>
          channel.id !== "good-tv" &&
          channel.id !== "kartoon-channel" &&
          !channel.name.toLowerCase().includes("fpt play"),
      )

      const categoryPriority = {
        Movies: 3,
        Entertainment: 2,
        Sports: 2,
        News: 1,
      }

      const recommended = []
      for (const [category, count] of Object.entries(categoryPriority)) {
        const categoryChannels = channels.filter((ch) => ch.category === category)
        const sorted = categoryChannels.sort((a, b) => {
          if (a.isHD && !b.isHD) return -1
          if (!a.isHD && b.isHD) return 1
          return a.name.localeCompare(b.name)
        })
        recommended.push(...sorted.slice(0, count))
      }

      setRecommendedChannels(recommended.slice(0, 12))
    }

    initializeRecommendedChannels()

    const startAutoScroll = () => {
      recommendedIntervalRef.current = setInterval(() => {
        setCurrentRecommendedIndex((prev) => (prev + 1) % 12)
      }, 12000)
    }

    startAutoScroll()

    return () => {
      if (recommendedIntervalRef.current) {
        clearInterval(recommendedIntervalRef.current)
      }
    }
  }, [])

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
      setIsPortrait(window.innerHeight > window.innerWidth)
    }

    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  useEffect(() => {
    const initializeUserData = async () => {
      const savedTheme = await getUserPreference("ultrafantsa_theme", "dark")
      const savedRecent = await getUserPreference("ultrafantsa_recent", [])
      const savedFavorites = await getUserPreference("ultrafantsa_favorites", [])

      const isDark = savedTheme === "dark"
      setIsDarkMode(isDark)
      if (isDark) {
        document.documentElement.classList.add("dark")
      } else {
        document.documentElement.classList.remove("dark")
      }

      setRecentChannels(savedRecent)
      setFavoriteChannels(savedFavorites)
    }

    initializeUserData()
  }, [])

  useEffect(() => {
    const checkFirstVisit = async () => {
      const hasVisited = await getUserPreference("ultrafantsa_visited", false)

      if (!hasVisited) {
        await setUserPreference("ultrafantsa_visited", true)
        setTimeout(() => {
          setIsInitialLoading(false)
        }, 1500)
      } else {
        setTimeout(() => {
          setIsInitialLoading(false)
        }, 1500)
      }
    }

    checkFirstVisit()
  }, [])

  const handleClosePlayer = () => {
    setSelectedChannel(null)
    if (wasInLiveTVBeforePlayer) {
      setHeaderTitle("Live TV")
      setIsLiveTVView(true)
    } else {
      setHeaderTitle("Home")
      setIsLiveTVView(false)
    }
    setWasInLiveTVBeforePlayer(false)
    setTimeout(() => {
      window.scrollTo(0, savedScrollPosition)
    }, 100)
  }

  const handleVideoPositionUpdate = async (channelId: string, position: number) => {
    if (!userSessionId) return

    try {
      const supabase = createClient()
      await supabase.rpc("upsert_video_position", {
        p_user_session: userSessionId,
        p_channel_id: channelId,
        p_position: position,
      })
    } catch (error) {
      console.error("[v0] Error saving video position:", error)
    }
  }

  const getSavedVideoPosition = async (channelId: string): Promise<number> => {
    if (!userSessionId) return 0

    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("video_positions")
        .select("position")
        .eq("user_session", userSessionId)
        .eq("channel_id", channelId)
        .single()

      return data?.position || 0
    } catch (error) {
      console.error("[v0] Error loading video position:", error)
      return 0
    }
  }

  const toggleTheme = async () => {
    const newTheme = !isDarkMode
    setIsDarkMode(newTheme)
    await setUserPreference("ultrafantsa_theme", newTheme ? "dark" : "light")
  }

  const addToFavorites = async (channelId: string) => {
    const newFavorites = [...favoriteChannels, channelId]
    setFavoriteChannels(newFavorites)
    await setUserPreference("ultrafantsa_favorites", newFavorites)
  }

  const removeFromFavorites = async (channelId: string) => {
    const newFavorites = favoriteChannels.filter((id) => id !== channelId)
    setFavoriteChannels(newFavorites)
    await setUserPreference("ultrafantsa_favorites", newFavorites)
  }

  const addToRecent = async (channelId: string) => {
    const newRecent = [channelId, ...recentChannels.filter((id) => id !== channelId)].slice(0, 10)
    setRecentChannels(newRecent)
    await setUserPreference("ultrafantsa_recent", newRecent)
  }

  const createChannelTile = (channel: Channel, showFavorite = true) => {
    const isChannelFavorite = isFavorite(channel.id)
    
    return (
    <div
      key={channel.id}
      className="group cursor-pointer shrink-0 animate-slide-up relative"
    >
      <div 
        className="w-32 h-20 sm:w-40 sm:h-24 md:w-48 md:h-28 rounded-xl border border-border/50 bg-card overflow-hidden relative flex items-center justify-center channel-card-smooth shadow-sm hover:border-border"
        onClick={() => handleChannelSelect(channel)}
      >
        {channel.logo ? (
          <img
            src={channel.logo || "/placeholder.svg"}
            alt={channel.name}
            className="w-full h-full object-contain px-3 py-2 image-zoom-smooth"
            onError={(e) => {
              ;(e.target as HTMLImageElement).src =
                `/placeholder.svg?height=80&width=140&text=${encodeURIComponent(channel.name.charAt(0))}`
            }}
          />
        ) : (
          <span className="font-semibold text-xs text-foreground">{channel.name}</span>
        )}
        {channel.isHD && (
          <span className="absolute top-1 right-1 text-[9px] px-1.5 py-0.5 bg-foreground/90 text-background rounded-md font-bold shadow-md backdrop-blur-sm">HD</span>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        
        {/* Favorite star button */}
        {showFavorite && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              toggleFavorite(channel.id)
            }}
            className="absolute top-1 left-1 z-10 p-1 bg-black/40 hover:bg-black/60 rounded-full backdrop-blur-sm transition-all duration-300 opacity-0 group-hover:opacity-100"
          >
            <Star className={`w-3 h-3 ${isChannelFavorite ? "fill-yellow-400 text-yellow-400" : "text-white"}`} />
          </button>
        )}
      </div>
      <p className="text-[11px] font-semibold truncate mt-2 text-foreground w-32 sm:w-40 md:w-48 group-hover:text-foreground/70 transition-colors duration-300">{channel.name}</p>
    </div>
  )
  }

  const scrollChannelRow = (direction: "left" | "right", containerId: string) => {
    const container = document.getElementById(containerId)
    if (container) {
      const scrollAmount = 300
      const currentScroll = container.scrollLeft
      const newScroll = direction === "left" ? Math.max(0, currentScroll - scrollAmount) : currentScroll + scrollAmount

      container.scrollTo({
        left: newScroll,
        behavior: "smooth",
      })
    }
  }

  const getCurrentChannelInfo = (channel: Channel) => {
    if (!channel) return { current: null, next: null }

    let epgEntry = null
    let currentProg = null
    let nextProg = null

    try {
      if (epgData && typeof epgData === "object") {
        epgEntry = Object.values(epgData).find((epg: any) => {
          if (!epg || !epg.name) return false
          const epgName = epg.name.toLowerCase()
          const channelName = channel.name.toLowerCase()
          return epgName.includes(channelName) || channelName.includes(channelName.replace(/\s+/g, ""))
        }) as any

        currentProg = epgEntry && currentPrograms ? currentPrograms[epgEntry.id] : null
        nextProg = epgEntry ? getNextProgram(epgEntry.id, epgEntry) : null
      }
    } catch (error) {
      console.error("[v0] Error getting channel info:", error)
    }

    return {
      current: currentProg?.title || "No information available",
      next: nextProg?.title || "No information available",
    }
  }

  const getCurrentSelectedChannelInfo = () => {
    if (!selectedChannel) return { current: "No information available", next: "No information available" }
    return getCurrentChannelInfo(selectedChannel)
  }

  const handleModernButtonHover = () => {
    setShowModernButton(true)
    if (modernButtonTimeoutRef.current) {
      clearTimeout(modernButtonTimeoutRef.current)
    }
  }

  const handleChannelInfoHover = () => {
    setShowChannelInfo(true)
    if (channelInfoTimeout) {
      clearTimeout(channelInfoTimeout)
    }
  }

  const handleChannelListHover = () => {
    setShowChannelList(true)
    if (channelListTimeoutRef.current) {
      clearTimeout(channelListTimeoutRef.current)
    }
  }

  const handleMobileSearch = () => {
    setIsMobileMenuOpen(true)
    setIsMobileSearchOpen(!isMobileSearchOpen)

    setTimeout(() => {
      const searchInput = document.querySelector('input[placeholder="Search channels..."]') as HTMLInputElement
      if (searchInput) {
        searchInput.focus()
      }
    }, 100)
  }

  const handleMobileMenu = () => {
    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current)
    }
    setIsMobileMenuOpen(!isMobileMenuOpen)
  }

  const createRow = (title: string, channels: Channel[], icon?: React.ReactNode, showFavorite = false) => {
    const rowId = `row-${title.toLowerCase().replace(/\s+/g, "-")}`

    return (
      <div key={title} className="group">
        <div className="flex items-center gap-2 mb-3">
          {icon}
          <h2 className="text-base md:text-lg font-semibold text-foreground">{title}</h2>
          <span className="text-xs text-muted-foreground">{channels.length}</span>
        </div>
        <div className="relative">
          <div id={rowId} className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-hide scroll-smooth">
            {channels.map((channel) => createChannelTile(channel, showFavorite))}
          </div>
          <button
            onClick={() => scrollChannelRow("left", rowId)}
            className="hidden md:flex absolute left-0 top-0 bottom-2 px-3 z-20 bg-gradient-to-r from-background via-background/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity items-center"
          >
            <ChevronLeft className="h-5 w-5 text-foreground" />
          </button>
          <button
            onClick={() => scrollChannelRow("right", rowId)}
            className="hidden md:flex absolute right-0 top-0 bottom-2 px-3 z-20 bg-gradient-to-l from-background via-background/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity items-center"
          >
            <ChevronRight className="h-5 w-5 text-foreground" />
          </button>
        </div>
      </div>
    )
  }

  const categorizeChannels = () => {
    const filteredChannels = allChannels.filter(
      (channel) =>
        channel.id !== "alltv" &&
        channel.id !== "alltv2" &&
        channel.url &&
        channel.name,
    )

    return {
      Local: filteredChannels.filter((ch) =>
        ["gma-7", "a2z", "one-ph", "one-ph-hd", "tv5-hd", "ptv-4", "ibc", "kapamilya-channel", "jeepney-tv"].includes(ch.id),
      ),
      Sports: filteredChannels.filter((ch) => ch.category === "Sports"),
      Entertainment: filteredChannels.filter((ch) => ch.category === "Entertainment"),
      Movies: filteredChannels.filter((ch) => ch.category === "Movies"),
      Kids: filteredChannels.filter((ch) => ch.category === "Kids"),
      News: filteredChannels.filter((ch) => ch.category === "News"),
      Documentary: filteredChannels.filter((ch) => ch.category === "Documentary"),
      Lifestyle: filteredChannels.filter((ch) => ch.category === "Lifestyle"),
    }
  }

  const handleHomeNavigation = () => {
    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current)
    }
    setIsLiveTVView(false)
    setHeaderTitle("Home")
    setSelectedChannel(null)
    setSearchQuery("")
    setIsMobileMenuOpen(false)
    setIsMobileSearchOpen(false)
  }

  const handleLiveTVNavigation = () => {
    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current)
    }
    setIsLiveTVView(true)
    setHeaderTitle("Live TV")
    setSelectedChannel(null)
    setSearchQuery("")
    setIsMobileMenuOpen(false)
    setIsMobileSearchOpen(false)
    setWasInLiveTVBeforePlayer(false)
  }

  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    if (value.trim()) {
      setSelectedCategory("All")
      setIsLiveTVView(true)
    }
  }

  const filteredChannels = useMemo(() => {
    const searchTerm = searchQuery.toLowerCase().trim()

    // If in Live TV view and no search term, show channels based on selected category
    if (isLiveTVView && !searchTerm) {
      return selectedCategory === "All"
        ? allChannels
        : allChannels.filter((channel) => channel.category === selectedCategory)
    }

    // If there's a search term, filter all channels
    if (searchTerm) {
      return allChannels.filter((channel) => {
        const channelName = channel.name.toLowerCase()
        const channelCategory = channel.category.toLowerCase()
        const channelGroup = (channel.group || "").toLowerCase()

        return (
          channelName.includes(searchTerm) || channelCategory.includes(searchTerm) || channelGroup.includes(searchTerm)
        )
      })
    }

    // If not in Live TV view and no search term, return empty array (Home view)
    return []
  }, [searchQuery, isLiveTVView, selectedCategory])

  const categories = useMemo(() => {
    // Use filteredChannels if searching, otherwise use allChannels for category list
    const channelsToUse = searchQuery || isLiveTVView ? filteredChannels : allChannels
    const categorySet = new Set(channelsToUse.map((channel) => channel.category))
    // Ensure "All" is always an option
    return ["All", ...Array.from(categorySet).sort()]
  }, [searchQuery, filteredChannels, isLiveTVView])

  if (isInitialLoading) {
    return (
      <div className="fixed inset-0 bg-background flex flex-col items-center justify-center z-50">
        <div className="flex flex-col items-center gap-6">
              <img src="/images/cignal-station-logo.png" alt="Cignal Station" className="h-16 w-auto" />
          <div className="w-8 h-8 border-2 border-foreground/20 border-t-foreground rounded-full animate-spin"></div>
        </div>
      </div>
    )
  }

  if (isCheckingAccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-foreground/20 border-t-foreground rounded-full animate-spin"></div>
          <div className="text-muted-foreground text-sm">Verifying access...</div>
        </div>
      </div>
    )
  }

  // Removed TokenAccessOverlay check - directly proceed to Live TV if access is granted
  // if (!hasAccess) {
  //   return <TokenAccessOverlay onAccessGranted={() => setHasAccess(true)} />
  // }

  if (selectedChannel && viewMode === 'grid') {
    return (
      <div className="relative">
        <VideoPlayer
          channel={selectedChannel}
          user={null}
          onClose={handleClosePlayer}
          onChannelChange={() => {}}
          availableChannels={allChannels}
          videoRef={videoRef}
          isMuted={isMuted}
          showModernButton={showModernButton}
          showChannelInfo={showChannelInfo}
          showChannelList={showChannelList}
          getCurrentChannelInfo={getCurrentChannelInfo}
          getCurrentSelectedChannelInfo={getCurrentSelectedChannelInfo}
          onModernButtonHover={handleModernButtonHover}
          onChannelInfoHover={handleChannelInfoHover}
          onChannelListHover={handleChannelListHover}
          isMobile={isMobile}
          isPortrait={isPortrait}
          epgData={epgData}
          currentPrograms={currentPrograms}
          onPositionUpdate={handleVideoPositionUpdate}
          getSavedPosition={getSavedVideoPosition}
        />
      </div>
    )
  }

  // List mode filtered channels
  const listFilteredChannels = (() => {
    const term = listSearchQuery.toLowerCase().trim()
    let channels = allChannels
    if (listSelectedCategory !== "All") {
      channels = channels.filter(ch => ch.category === listSelectedCategory)
    }
    if (term) {
      channels = channels.filter(ch =>
        ch.name.toLowerCase().includes(term) ||
        ch.category.toLowerCase().includes(term)
      )
    }
    return channels
  })()

  const listCategories = ["All", ...Array.from(new Set(allChannels.map(ch => ch.category))).sort()]

  // LIST MODE LAYOUT
  if (viewMode === 'list') {
    return (
      <div className="h-screen bg-background text-foreground flex flex-col overflow-hidden selection:bg-foreground/10">
        <SupportPopup isOpen={showSupportModal} onClose={() => setShowSupportModal(false)} isFirstTime={isFirstTimeUser} />
        {showKeyboardShortcuts && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[60] p-4" onClick={() => setShowKeyboardShortcuts(false)}>
            <div className="bg-card border border-border/20 rounded-2xl max-w-sm w-full p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-start mb-5">
                <div className="flex items-center gap-2.5">
                  <Keyboard className="w-4 h-4 text-foreground/60" />
                  <h2 className="text-sm font-medium text-foreground tracking-wide uppercase">Shortcuts</h2>
                </div>
                <button onClick={() => setShowKeyboardShortcuts(false)} className="text-muted-foreground/40 hover:text-foreground transition-colors duration-300">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-1">
                {[['Play/Pause', 'Space'], ['Mute', 'M'], ['Fullscreen', 'F'], ['PiP', 'P'], ['Vol Up', '\u2191'], ['Vol Down', '\u2193'], ['Seek Fwd', '\u2192'], ['Seek Back', '\u2190']].map(([label, key]) => (
                  <div key={label} className="flex justify-between items-center py-2 border-b border-border/10 last:border-0">
                    <span className="text-muted-foreground/60 text-sm">{label}</span>
                    <kbd className="px-2.5 py-1 bg-secondary/40 border border-border/10 rounded-lg text-foreground/80 font-mono text-xs">{key}</kbd>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        <IOSUnsupportedModal />
        <ReportModal isOpen={showReportModal} onClose={() => setShowReportModal(false)} />
        <RatingModal isOpen={showRatingModal} onClose={() => setShowRatingModal(false)} />
        <AnnouncementsSystem />

        {/* SAME HEADER */}
        <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-xl border-b border-border/20 safe-area-top">
          <div className="px-2 md:px-5">
            <div className="flex items-center justify-between h-14 md:h-14">
              <div className="flex items-center gap-4">
              <img src="/images/cignal-station-logo.png" alt="Cignal Station" className="h-6 md:h-7 w-auto" />
                <nav className="hidden md:flex items-center gap-0.5">
                  <button
                    onClick={() => { handleHomeNavigation(); setViewMode('grid'); }}
                    className={`px-2.5 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                      !isLiveTVView && viewMode === 'grid' ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                    }`}
                  >
                    Home
                  </button>
                  <button
                    onClick={() => { handleLiveTVNavigation(); setViewMode('grid'); }}
                    className={`px-2.5 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                      isLiveTVView && viewMode === 'grid' ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                    }`}
                  >
                    Live TV
                  </button>
                  <button
                    onClick={() => setShowChannelRequestModal(true)}
                    className="px-2.5 py-1.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all duration-200"
                  >
                    Request
                  </button>
                  <button
                    onClick={() => setShowRatingModal(true)}
                    className="px-2.5 py-1.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all duration-200"
                  >
                    Rate
                  </button>
                </nav>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setShowQuickSwitch(true)}
                  className="p-2.5 md:p-2 hover:bg-secondary/60 rounded-lg transition-all duration-200 touch-manipulation"
                  title="Quick Switch"
                >
                  <Zap className="w-4 h-4 text-muted-foreground hover:text-foreground transition-colors" />
                </button>
                <button
                  onClick={() => setShowChannelStats(true)}
                  className="hidden sm:block p-2.5 md:p-2 hover:bg-secondary/60 rounded-lg transition-all duration-200 touch-manipulation"
                  title="Channel Stats"
                >
                  <TrendingUp className="w-4 h-4 text-muted-foreground hover:text-foreground transition-colors" />
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className="flex items-center gap-1.5 px-2.5 py-2.5 md:py-2 hover:bg-secondary/60 rounded-lg transition-all duration-200 touch-manipulation"
                  title="Switch to Grid"
                >
                  <LayoutGrid className="w-4 h-4 text-muted-foreground hover:text-foreground transition-colors" />
                  <span className="text-xs font-medium text-muted-foreground hidden sm:inline">Grid</span>
                </button>
                <button
                  onClick={() => setShowKeyboardShortcuts(true)}
                  className="hidden md:block p-2.5 md:p-2 hover:bg-secondary/60 rounded-lg transition-all duration-200 touch-manipulation"
                  title="Keyboard Shortcuts"
                >
                  <Keyboard className="w-4 h-4 text-muted-foreground hover:text-foreground transition-colors" />
                </button>
                <button
                  onClick={() => setShowSupportModal(true)}
                  className="flex items-center gap-2 px-2.5 py-2 hover:bg-secondary/60 rounded-lg transition-all duration-200"
                  title="Support Us"
                >
                  <Heart className="w-4 h-4 text-muted-foreground hover:text-foreground transition-colors" />
                  <span className="text-xs font-medium text-muted-foreground hidden sm:inline">Support</span>
                </button>
                <ThemeToggle />
                {!isMobile && <SetupCheck />}
              </div>
            </div>
          </div>
        </header>

        {/* LIST LAYOUT: Video top + scrollable channel list below on mobile; sidebar + video on desktop */}
        <div className="flex flex-col md:flex-row flex-1 pt-12 md:pt-14 min-h-0">

          {/* === MOBILE LAYOUT (stacked: video top, channels below) === */}
          <div className="flex flex-col flex-1 min-h-0 md:hidden">
            {/* Video area - fixed 16:9 at top */}
            <div className="shrink-0 w-full bg-black relative" style={{ aspectRatio: '16/9' }}>
              {selectedChannel ? (
                <>
                  <VideoPlayer
                    channel={selectedChannel}
                    user={null}
                    onClose={() => {
                      setSelectedChannel(null)
                      setHeaderTitle("Live TV")
                    }}
                    onChannelChange={() => {}}
                    availableChannels={allChannels}
                    videoRef={videoRef}
                    isMuted={isMuted}
                    showModernButton={showModernButton}
                    showChannelInfo={showChannelInfo}
                    showChannelList={showChannelList}
                    getCurrentChannelInfo={getCurrentChannelInfo}
                    getCurrentSelectedChannelInfo={getCurrentSelectedChannelInfo}
                    onModernButtonHover={handleModernButtonHover}
                    onChannelInfoHover={handleChannelInfoHover}
                    onChannelListHover={handleChannelListHover}
                    isMobile={isMobile}
                    isPortrait={isPortrait}
                    epgData={epgData}
                    currentPrograms={currentPrograms}
                    onPositionUpdate={handleVideoPositionUpdate}
                    getSavedPosition={getSavedVideoPosition}
                    embedded={true}
                  />
                </>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#060608]">
                  <div className="relative mb-4">
                    <div className="absolute -inset-3 rounded-full bg-white/[0.02] blur-lg animate-pulse" style={{ animationDuration: '4s' }} />
                    <div className="relative w-16 h-16 rounded-full bg-white/[0.03] border border-white/[0.06] flex items-center justify-center">
                      <Tv className="w-7 h-7 text-white/20" />
                    </div>
                  </div>
                  <p className="text-sm font-extralight text-white/60 tracking-wide">Select a channel to watch</p>
                </div>
              )}
            </div>

            {/* Now playing bar (mobile) */}
            {selectedChannel && (
              <div className="shrink-0 bg-[#060608] border-b border-white/5 px-3 py-2 flex items-center gap-2.5">
                <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                <img
                  src={selectedChannel.logo || "/placeholder.svg"}
                  alt=""
                  className="w-5 h-5 rounded object-contain"
                  onError={(e) => { e.currentTarget.style.display = "none" }}
                />
                <p className="text-xs font-medium text-white/80 truncate flex-1">{selectedChannel.name}</p>
                <span className="text-[9px] text-white/25 uppercase tracking-widest font-medium">Live</span>
              </div>
            )}

            {/* Search + Categories */}
            <div className="shrink-0 bg-background border-b border-border/20">
              <div className="p-2.5">
                <div className="relative group">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/60 group-focus-within:text-foreground/80 transition-colors duration-300" />
                  <input
                    type="text"
                    placeholder="Search channels..."
                    value={listSearchQuery}
                    onChange={(e) => setListSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-secondary/40 border border-border/20 rounded-xl text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-foreground/5 focus:bg-secondary/60 focus:border-foreground/10 text-sm transition-all duration-300"
                  />
                </div>
              </div>
              <div className="flex gap-1.5 overflow-x-auto scrollbar-hide px-2.5 pb-2 shrink-0">
                {listCategories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setListSelectedCategory(cat)}
                    className={`whitespace-nowrap shrink-0 px-3 py-1.5 rounded-full text-[11px] font-medium transition-all duration-300 ${
                      listSelectedCategory === cat
                        ? "bg-foreground text-background"
                        : "bg-secondary/40 text-muted-foreground/70 hover:text-foreground/80 hover:bg-secondary/60"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Scrollable channel list */}
            <div className="flex-1 overflow-y-auto bg-background">
              <div className="px-2.5 py-1.5">
                <p className="text-[10px] text-muted-foreground/50 tracking-[0.15em] uppercase font-medium">
                  {listFilteredChannels.length} Channel{listFilteredChannels.length !== 1 ? 's' : ''}
                </p>
              </div>
              {listFilteredChannels.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-4">
                  <Search className="w-8 h-8 text-muted-foreground/40 mb-3" />
                  <p className="text-sm text-muted-foreground text-center">No channels found</p>
                </div>
              ) : (
                listFilteredChannels.map((channel, index) => {
                  const isActive = selectedChannel?.id === channel.id
                  return (
                    <button
                      key={channel.id}
                      onClick={() => {
                        setSelectedChannel(channel)
                        setHeaderTitle(channel.name)
                        addToRecentlyWatched(channel.id)
                        setRecentlyWatched(getRecentlyWatched())
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-all duration-300 border-b border-border/10 group ${
                        isActive
                          ? "bg-foreground/[0.06] border-l-2 border-l-red-500/80"
                          : "hover:bg-foreground/[0.03] border-l-2 border-l-transparent"
                      }`}
                    >
                      <span className="text-[9px] font-mono text-muted-foreground/30 w-4 text-right shrink-0 tabular-nums">
                        {index + 1}
                      </span>
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 overflow-hidden border transition-all duration-300 ${
                        isActive
                          ? "bg-white/[0.08] border-white/10"
                          : "bg-foreground/[0.03] border-border/10 group-hover:bg-foreground/[0.05] group-hover:border-border/20"
                      }`}>
                        <img
                          src={channel.logo || "/placeholder.svg"}
                          alt={channel.name}
                          className="w-full h-full object-contain p-1.5"
                          onError={(e) => { e.currentTarget.style.display = "none" }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className={`text-[13px] font-medium truncate transition-colors duration-300 ${isActive ? "text-foreground" : "text-foreground/60 group-hover:text-foreground/90"}`}>
                            {channel.name}
                          </p>
                          {channel.isHD && (
                            <span className="text-[7px] px-1 py-0.5 bg-foreground/10 text-foreground/50 rounded font-semibold shrink-0 tracking-wider">HD</span>
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground/40 truncate">{channel.category}</p>
                      </div>
                      {isActive && (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <div className="w-1 h-1 bg-red-500 rounded-full animate-pulse" />
                          <span className="text-[9px] font-medium text-red-500/80 uppercase tracking-[0.15em]">Live</span>
                        </div>
                      )}
                    </button>
                  )
                })
              )}
            </div>
          </div>

          {/* === DESKTOP LAYOUT (sidebar left + video right) === */}
          {/* Channel Sidebar - desktop only */}
          <aside className="hidden md:flex w-80 lg:w-96 border-r border-border/30 bg-background flex-col shrink-0 overflow-hidden">
            {/* Sidebar Search */}
            <div className="p-3 border-b border-border/20">
              <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/60 group-focus-within:text-foreground/80 transition-colors duration-300" />
                <input
                  type="text"
                  placeholder="Search channels..."
                  value={listSearchQuery}
                  onChange={(e) => setListSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-secondary/40 border border-border/20 rounded-xl text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-foreground/5 focus:bg-secondary/60 focus:border-foreground/10 text-sm transition-all duration-300"
                />
              </div>
            </div>

            {/* Category pills */}
            <div className="flex gap-1.5 overflow-x-auto scrollbar-hide px-3 py-2 border-b border-border/20 shrink-0">
              {listCategories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setListSelectedCategory(cat)}
                  className={`whitespace-nowrap shrink-0 px-3 py-1.5 rounded-full text-[11px] font-medium transition-all duration-300 ${
                    listSelectedCategory === cat
                      ? "bg-foreground text-background"
                      : "bg-secondary/40 text-muted-foreground/70 hover:text-foreground/80 hover:bg-secondary/60"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Channel count */}
            <div className="px-3 py-1.5 border-b border-border/10">
              <p className="text-[10px] text-muted-foreground/50 tracking-[0.15em] uppercase font-medium">
                {listFilteredChannels.length} Channel{listFilteredChannels.length !== 1 ? 's' : ''}
              </p>
            </div>

            {/* Channel list */}
            <div className="flex-1 overflow-y-auto">
              {listFilteredChannels.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-4">
                  <Search className="w-8 h-8 text-muted-foreground/40 mb-3" />
                  <p className="text-sm text-muted-foreground text-center">No channels found</p>
                  <p className="text-xs text-muted-foreground/60 mt-1 text-center">Try a different search</p>
                </div>
              ) : (
                listFilteredChannels.map((channel, index) => {
                  const isActive = selectedChannel?.id === channel.id
                  return (
                    <button
                      key={channel.id}
                      onClick={() => {
                        setSelectedChannel(channel)
                        setHeaderTitle(channel.name)
                        addToRecentlyWatched(channel.id)
                        setRecentlyWatched(getRecentlyWatched())
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-all duration-300 border-b border-border/10 group ${
                        isActive
                          ? "bg-foreground/[0.06] border-l-2 border-l-red-500/80"
                          : "hover:bg-foreground/[0.03] border-l-2 border-l-transparent"
                      }`}
                    >
                      <span className="text-[9px] font-mono text-muted-foreground/30 w-4 text-right shrink-0 tabular-nums">
                        {index + 1}
                      </span>
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 overflow-hidden border transition-all duration-300 ${
                        isActive 
                          ? "bg-white/[0.08] border-white/10" 
                          : "bg-foreground/[0.03] border-border/10 group-hover:bg-foreground/[0.05] group-hover:border-border/20"
                      }`}>
                        <img
                          src={channel.logo || "/placeholder.svg"}
                          alt={channel.name}
                          className="w-full h-full object-contain p-1.5"
                          onError={(e) => { e.currentTarget.style.display = "none" }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className={`text-[13px] font-medium truncate transition-colors duration-300 ${isActive ? "text-foreground" : "text-foreground/60 group-hover:text-foreground/90"}`}>
                            {channel.name}
                          </p>
                          {channel.isHD && (
                            <span className="text-[7px] px-1 py-0.5 bg-foreground/10 text-foreground/50 rounded font-semibold shrink-0 tracking-wider">HD</span>
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground/40 truncate">{channel.category}</p>
                      </div>
                      {isActive && (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <div className="w-1 h-1 bg-red-500 rounded-full animate-pulse" />
                          <span className="text-[9px] font-medium text-red-500/80 uppercase tracking-[0.15em]">Live</span>
                        </div>
                      )}
                    </button>
                  )
                })
              )}
            </div>
          </aside>

          {/* Main Video Area - desktop only */}
          <div className="hidden md:flex flex-1 flex-col bg-[#060608] min-h-0 overflow-hidden">
            {selectedChannel ? (
              <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                {/* Video container */}
                <div className="flex-1 min-h-0 relative">
                  <VideoPlayer
                    channel={selectedChannel}
                    user={null}
                    onClose={() => {
                      setSelectedChannel(null)
                      setHeaderTitle("Live TV")
                    }}
                    onChannelChange={() => {}}
                    availableChannels={allChannels}
                    videoRef={videoRef}
                    isMuted={isMuted}
                    showModernButton={showModernButton}
                    showChannelInfo={showChannelInfo}
                    showChannelList={showChannelList}
                    getCurrentChannelInfo={getCurrentChannelInfo}
                    getCurrentSelectedChannelInfo={getCurrentSelectedChannelInfo}
                    onModernButtonHover={handleModernButtonHover}
                    onChannelInfoHover={handleChannelInfoHover}
                    onChannelListHover={handleChannelListHover}
                    isMobile={isMobile}
                    isPortrait={isPortrait}
                    epgData={epgData}
                    currentPrograms={currentPrograms}
                    onPositionUpdate={handleVideoPositionUpdate}
                    getSavedPosition={getSavedVideoPosition}
                    embedded={true}
                  />
                </div>
                {/* Now Playing bar */}
                <div className="shrink-0 bg-[#060608] border-t border-white/5 px-4 py-2.5 flex items-center gap-3">
                  <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                  <img
                    src={selectedChannel.logo || "/placeholder.svg"}
                    alt=""
                    className="w-6 h-6 rounded object-contain"
                    onError={(e) => { e.currentTarget.style.display = "none" }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white/90 truncate">{selectedChannel.name}</p>
                  </div>
                  <span className="text-[10px] text-white/30 uppercase tracking-widest font-medium">Live</span>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center bg-[#060608]">
                <div className="relative flex flex-col items-center gap-8 text-center px-6">
                  <div className="relative">
                    <div className="absolute -inset-4 rounded-full bg-white/[0.02] blur-xl animate-pulse" style={{ animationDuration: '4s' }} />
                    <div className="relative w-24 h-24 rounded-full bg-white/[0.03] border border-white/[0.06] flex items-center justify-center">
                      <Tv className="w-10 h-10 text-white/20" />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <h2 className="text-2xl font-extralight text-white/80 tracking-[0.15em] uppercase">Select a channel</h2>
                    <p className="text-sm text-white/20 max-w-xs leading-relaxed font-light">Choose from the sidebar to start watching</p>
                  </div>
                  <div className="w-12 h-px bg-white/10" />
                </div>
              </div>
            )}
          </div>
        </div>

        <ChannelGuideModal
          isOpen={showChannelGuide}
          onClose={() => setShowChannelGuide(false)}
          channelGuideSearch={channelGuideSearch}
          setChannelGuideSearch={setChannelGuideSearch}
          epgData={epgData}
          currentPrograms={currentPrograms}
        />
        <ChannelRequestModal isOpen={showChannelRequestModal} onClose={() => setShowChannelRequestModal(false)} />
        <QuickChannelSwitch
          isOpen={showQuickSwitch}
          onClose={() => setShowQuickSwitch(false)}
          allChannels={allChannels}
          onChannelSelect={(ch) => {
            setSelectedChannel(ch)
            setHeaderTitle(ch.name)
            addToRecentlyWatched(ch.id)
            setRecentlyWatched(getRecentlyWatched())
          }}
          currentChannel={selectedChannel}
        />
        <ChannelStats
          isOpen={showChannelStats}
          onClose={() => setShowChannelStats(false)}
          allChannels={allChannels}
          onChannelSelect={(ch) => {
            setSelectedChannel(ch)
            setHeaderTitle(ch.name)
            addToRecentlyWatched(ch.id)
            setRecentlyWatched(getRecentlyWatched())
          }}
        />
        <PipMode
          isActive={isPipActive}
          channel={pipChannel}
          onClose={deactivatePip}
          onMaximize={() => {
            if (pipChannel) {
              setSelectedChannel(pipChannel)
              setHeaderTitle(pipChannel.name)
              deactivatePip()
            }
          }}
        />
      </div>
    )
  }

  const renderWelcomeSection = () => {
    return (
      <div className="mt-8 pt-6 border-t border-border/20">
        <div className="space-y-4 py-4 px-3 md:px-5">
          <img src="/images/cignal-station-logo.png" alt="Cignal Station" className="h-8 w-auto" />
          <div className="space-y-1.5">
            <h2 className="text-base md:text-lg font-medium text-foreground tracking-tight">Welcome to Cignal Station</h2>
            <p className="text-xs text-muted-foreground/60 leading-relaxed max-w-sm">
              Your streaming destination for live TV, movies, entertainment, and more.
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleLiveTVNavigation} className="premium-button px-5 py-2.5 rounded-xl text-xs h-auto">
              Explore Live TV
            </Button>
            <Button onClick={() => setShowChannelRequestModal(true)} variant="outline" className="px-5 py-2.5 rounded-xl text-xs font-medium border border-border/30 text-foreground/80 hover:bg-secondary/40 hover:border-foreground/10 transition-all duration-300 h-auto">
              Request a Channel
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-foreground/10">
      <SupportPopup isOpen={showSupportModal} onClose={() => setShowSupportModal(false)} isFirstTime={isFirstTimeUser} />

      {/* Keyboard Shortcuts Modal */}
      {showKeyboardShortcuts && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[60] p-4" onClick={() => setShowKeyboardShortcuts(false)}>
          <div className="bg-card border border-border/20 rounded-2xl max-w-sm w-full p-6 shadow-2xl animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-5">
              <div className="flex items-center gap-2.5">
                <Keyboard className="w-4 h-4 text-foreground/60" />
                <h2 className="text-sm font-medium text-foreground tracking-wide uppercase">Shortcuts</h2>
              </div>
              <button onClick={() => setShowKeyboardShortcuts(false)} className="text-muted-foreground/40 hover:text-foreground transition-colors duration-300">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center py-2 border-b border-border/50">
                <span className="text-muted-foreground">Play/Pause</span>
                <kbd className="px-2 py-1 bg-secondary rounded text-foreground font-mono text-xs">Space</kbd>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border/50">
                <span className="text-muted-foreground">Mute</span>
                <kbd className="px-2 py-1 bg-secondary rounded text-foreground font-mono text-xs">M</kbd>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border/50">
                <span className="text-muted-foreground">Fullscreen</span>
                <kbd className="px-2 py-1 bg-secondary rounded text-foreground font-mono text-xs">F</kbd>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border/50">
                <span className="text-muted-foreground">Picture-in-Picture</span>
                <kbd className="px-2 py-1 bg-secondary rounded text-foreground font-mono text-xs">P</kbd>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border/50">
                <span className="text-muted-foreground">Volume Up</span>
                <kbd className="px-2 py-1 bg-secondary rounded text-foreground font-mono text-xs">↑</kbd>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border/50">
                <span className="text-muted-foreground">Volume Down</span>
                <kbd className="px-2 py-1 bg-secondary rounded text-foreground font-mono text-xs">↓</kbd>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border/50">
                <span className="text-muted-foreground">Seek Forward</span>
                <kbd className="px-2 py-1 bg-secondary rounded text-foreground font-mono text-xs">→</kbd>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-muted-foreground">Seek Backward</span>
                <kbd className="px-2 py-1 bg-secondary rounded text-foreground font-mono text-xs">←</kbd>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-border">
              <p className="text-xs text-muted-foreground text-center">Press the keys while watching a video</p>
            </div>
          </div>
        </div>
      )}
      <IOSUnsupportedModal />

      <ReportModal isOpen={showReportModal} onClose={() => setShowReportModal(false)} />
      <AnnouncementsSystem />

      <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-xl border-b border-border/20">
        <div className="px-3 md:px-5">
          <div className="flex items-center justify-between h-12 md:h-14">
            {/* Logo + Nav together on left */}
            <div className="flex items-center gap-4">
              <img src="/images/cignal-station-logo.png" alt="Cignal Station" className="h-6 md:h-7 w-auto" />
              <nav className="hidden md:flex items-center gap-0.5">
                <button
                  onClick={handleHomeNavigation}
                  className={`px-2.5 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                    !isLiveTVView ? "bg-secondary/60 text-foreground" : "text-muted-foreground/70 hover:text-foreground hover:bg-secondary/40"
                  }`}
                >
                  Home
                </button>
                <button
                  onClick={handleLiveTVNavigation}
                  className={`px-2.5 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isLiveTVView ? "bg-secondary/60 text-foreground" : "text-muted-foreground/70 hover:text-foreground hover:bg-secondary/40"
                  }`}
                >
                  Live TV
                </button>
                <button
                  onClick={() => setShowChannelRequestModal(true)}
                  className="px-2.5 py-1.5 rounded-lg text-sm font-medium text-muted-foreground/70 hover:text-foreground hover:bg-secondary/40 transition-all duration-200"
                >
                  Request
                </button>
                <button
                  onClick={() => setShowRatingModal(true)}
                  className="px-2.5 py-1.5 rounded-lg text-sm font-medium text-muted-foreground/70 hover:text-foreground hover:bg-secondary/40 transition-all duration-200"
                >
                  Rate
                </button>
              </nav>
            </div>

            {/* Right section */}
            <div className="flex items-center gap-1.5">
              <div className="hidden md:flex relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-8 pr-3 py-1.5 bg-secondary/40 border border-border/20 rounded-lg focus:outline-none focus:ring-1 focus:ring-foreground/5 text-sm w-44 text-foreground placeholder:text-muted-foreground/40 transition-all duration-300"
                />
              </div>
              <button
                onClick={() => setShowQuickSwitch(true)}
                className="p-2 hover:bg-secondary/50 rounded-lg transition-all duration-200"
                title="Quick Switch"
              >
                <Zap className="w-4 h-4 text-muted-foreground/60 hover:text-foreground transition-colors duration-200" />
              </button>
              <button
                onClick={() => setShowChannelStats(true)}
                className="p-2 hover:bg-secondary/50 rounded-lg transition-all duration-200"
                title="Channel Stats"
              >
                <TrendingUp className="w-4 h-4 text-muted-foreground/60 hover:text-foreground transition-colors duration-200" />
              </button>
              <button
                onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                className="flex items-center gap-1.5 px-2.5 py-2 hover:bg-secondary/50 rounded-lg transition-all duration-200"
                title={viewMode === 'grid' ? 'Switch to List' : 'Switch to Grid'}
              >
                {viewMode === 'grid' ? (
                  <List className="w-4 h-4 text-muted-foreground/60 hover:text-foreground transition-colors duration-200" />
                ) : (
                  <LayoutGrid className="w-4 h-4 text-muted-foreground/60 hover:text-foreground transition-colors duration-200" />
                )}
                <span className="text-xs font-medium text-muted-foreground/60 hidden sm:inline">{viewMode === 'grid' ? 'List' : 'Grid'}</span>
              </button>
              <button
                onClick={() => setShowKeyboardShortcuts(true)}
                className="p-2 hover:bg-secondary/50 rounded-lg transition-all duration-200"
                title="Keyboard Shortcuts"
              >
                <Keyboard className="w-4 h-4 text-muted-foreground/60 hover:text-foreground transition-colors duration-200" />
              </button>
              <button
                onClick={() => setShowSupportModal(true)}
                className="flex items-center gap-2 px-2.5 py-2 hover:bg-secondary/50 rounded-lg transition-all duration-200"
                title="Support Us"
              >
                <Heart className="w-4 h-4 text-muted-foreground/60 hover:text-foreground transition-colors duration-200" />
                <span className="text-xs font-medium text-muted-foreground/60 hidden sm:inline">Support</span>
              </button>
              <ThemeToggle />
              {!isMobile && <SetupCheck />}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile search bar */}
      {isMobileSearchOpen && (
        <div className="md:hidden fixed top-12 left-0 right-0 z-40 bg-background/95 backdrop-blur-xl border-b border-border/20 px-3 py-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
            <input
              type="text"
              placeholder="Search channels..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              autoFocus
              className="w-full pl-8 pr-3 py-1.5 bg-secondary/40 border border-border/20 rounded-lg focus:outline-none focus:ring-1 focus:ring-foreground/5 text-sm text-foreground placeholder:text-muted-foreground/40 transition-all duration-300"
            />
          </div>
        </div>
      )}

      <main className={`pt-12 md:pt-14 ${isMobileSearchOpen ? 'pt-[88px]' : ''} pb-16 md:pb-6 w-full`}>
        {!isLiveTVView ? (
          <div className="w-full">
            {/* Quick actions - animated buttons */}
            <div className="px-3 md:px-5 py-3 flex gap-2">
              <button
                onClick={handleLiveTVNavigation}
                className="premium-button px-5 py-2.5 rounded-xl text-xs"
              >
                Explore Live TV
              </button>
              <button
                onClick={() => setShowChannelRequestModal(true)}
                className="px-5 py-2.5 rounded-xl text-xs font-semibold border-2 border-border text-foreground hover:bg-secondary hover:border-foreground/30 transition-all duration-300 hover:shadow-md active:scale-95"
              >
                Request Channel
              </button>
            </div>

            {/* Category sections */}
            <div className="space-y-6 px-3 md:px-5">
              {/* Favorites Row */}
              {favorites.length > 0 && createRow(
                "My Favorites",
                allChannels.filter(ch => favorites.includes(ch.id)),
                <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />,
                true
              )}

              {/* Recently Watched Row */}
              {recentlyWatched.length > 0 && createRow(
                "Recently Watched",
                allChannels.filter(ch => recentlyWatched.includes(ch.id))
                  .sort((a, b) => recentlyWatched.indexOf(a.id) - recentlyWatched.indexOf(b.id)),
                <Clock className="w-3 h-3 text-foreground" />,
                true
              )}

              {Object.entries(categorizeChannels()).map(([categoryName, categoryChannels], categoryIndex) => {
                if (categoryChannels.length === 0) return null

                return (
                  <div
                    key={categoryName}
                    className="animate-fade-in"
                    style={{ animationDelay: `${categoryIndex * 0.05}s` }}
                  >
                    {createRow(
                      categoryName,
                      categoryChannels,
                      <div className="w-3 h-3 bg-foreground rounded-sm"></div>,
                      true,
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          <div className="w-full px-3 md:px-5">
            {/* Header + Category pills inline */}
            <div className="py-3 space-y-3">
              <div className="flex items-baseline justify-between">
                <h1 className="text-lg md:text-xl font-semibold text-foreground">
                  {searchQuery ? "Search Results" : "Live TV"}
                </h1>
                {searchQuery && (
                  <p className="text-[10px] text-muted-foreground">
                    {filteredChannels.length} found
                  </p>
                )}
              </div>

              {/* Category pills - animated */}
              {!searchQuery && (
                <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-3 px-3 pb-1">
                  {categories.map((category, index) => (
                    <button
                      key={category}
                      onClick={() => setSelectedCategory(category)}
                      className={`category-pill whitespace-nowrap shrink-0 animate-fade-in ${
                        selectedCategory === category
                          ? "active"
                          : ""
                      }`}
                      style={{ animationDelay: `${index * 0.05}s` }}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Channel grid - ultra-smooth rectangular cards */}
            {filteredChannels.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5 md:gap-3">
                {filteredChannels.map((channel, index) => (
                  <div
                    key={channel.id}
                    onClick={() => handleChannelSelectForLiveTV(channel)}
                    className="cursor-pointer group animate-scale-in"
                    style={{ animationDelay: `${(index % 18) * 0.025}s` }}
                  >
                    <div className="bg-card rounded-xl overflow-hidden border border-border/50 shadow-sm channel-card-smooth hover:border-border relative">
                      <div className="aspect-[3/2] bg-secondary/20 flex items-center justify-center relative overflow-hidden">
                        <img
                          src={channel.logo || "/placeholder.svg"}
                          alt={channel.name}
                          className="w-full h-full object-contain p-3 md:p-4 image-zoom-smooth"
                          onError={(e) => {
                            e.currentTarget.style.display = "none"
                          }}
                        />
                        {channel.isHD && (
                          <span className="absolute top-1.5 right-1.5 text-[9px] px-2 py-0.5 bg-foreground/90 text-background rounded-md font-bold shadow-md backdrop-blur-sm">
                            HD
                          </span>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                      </div>
                      <div className="px-2 py-2">
                        <h3 className="font-semibold text-foreground text-center text-[11px] md:text-xs truncate group-hover:text-foreground/70 transition-colors duration-300">
                          {channel.name}
                        </h3>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-sm text-muted-foreground">No channels found</p>
              </div>
            )}
          </div>
        )}
      </main>

      <ChannelGuideModal
        isOpen={showChannelGuide}
        onClose={() => setShowChannelGuide(false)}
        channelGuideSearch={channelGuideSearch}
        setChannelGuideSearch={setChannelGuideSearch}
        epgData={epgData}
        currentPrograms={currentPrograms}
      />

      <ChannelRequestModal isOpen={showChannelRequestModal} onClose={() => setShowChannelRequestModal(false)} />
      <RatingModal isOpen={showRatingModal} onClose={() => setShowRatingModal(false)} />

      {/* New Feature Modals */}
      <QuickChannelSwitch
        isOpen={showQuickSwitch}
        onClose={() => setShowQuickSwitch(false)}
        allChannels={allChannels}
        onChannelSelect={handleChannelSelect}
        currentChannel={selectedChannel}
      />

      <ChannelStats
        isOpen={showChannelStats}
        onClose={() => setShowChannelStats(false)}
        allChannels={allChannels}
        onChannelSelect={handleChannelSelect}
      />

      <PipMode
        isActive={isPipActive}
        channel={pipChannel}
        onClose={deactivatePip}
        onMaximize={() => {
          if (pipChannel) {
            handleChannelSelect(pipChannel)
            deactivatePip()
          }
        }}
      />
    </div>
  )
}

// ... rest of code ...

const detectStreamFormat = (url: string): StreamFormat => {
  if (url.includes(".m3u8")) return "HLS"
  if (url.includes(".mpd")) return "DASH"
  if (url.includes("clearkey")) return "CLEARKEY_DRM"
  return "UNKNOWN"
}
