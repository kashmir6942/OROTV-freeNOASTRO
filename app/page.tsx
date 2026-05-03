"use client"

import type React from "react"
import { useState, useEffect, useRef, useMemo } from "react"
import { VideoPlayer } from "@/components/video-player"
import { allChannels as staticChannels } from "@/data/channels/all-channels"
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
import { useAccessControl } from "@/lib/hooks/useAccessControl"
import { LightLogo } from "@/components/light-logo"
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

  const guideFilteredChannels = staticChannels.filter(
    (channel) =>
      channel.name.toLowerCase().includes(channelGuideSearch.toLowerCase()) ||
      channel.category.toLowerCase().includes(channelGuideSearch.toLowerCase()),
  )

  return (
    <div className="fixed inset-0 bg-zinc-950/90 flex items-center justify-center z-[100] p-4 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-zinc-950 w-full max-w-6xl h-full max-h-[85vh] rounded-3xl flex flex-col border border-zinc-800 overflow-hidden shadow-2xl">
        {/* Modern Rounded Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-6 border-b border-zinc-800 bg-zinc-900/50">
          <div className="flex items-center gap-4 mb-4 sm:mb-0">
            <div className="w-12 h-12 bg-blue-500/10 text-blue-500 flex items-center justify-center rounded-2xl">
              <Tv className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-zinc-100 tracking-tight">TV Guide</h2>
              <p className="text-sm text-zinc-400 font-medium">Live Programming Schedule</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-zinc-500 w-4 h-4" />
              <input
                type="text"
                placeholder="Search channels..."
                value={channelGuideSearch}
                onChange={(e) => setChannelGuideSearch(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-full text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-blue-500 transition-colors text-sm"
              />
            </div>
            <button onClick={onClose} className="w-10 h-10 bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-300 hover:text-white rounded-full transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-zinc-950">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {guideFilteredChannels.length === 0 ? (
              <div className="col-span-full text-center text-zinc-500 py-20 flex flex-col items-center">
                <Search className="w-12 h-12 mb-4 opacity-50" />
                <p className="text-lg font-medium">No channels found</p>
              </div>
            ) : (
              guideFilteredChannels.map((channel) => {
                let epgEntry = null
                let currentProg = null

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
                  }
                } catch (error) {
                  console.log("[v0] Error matching EPG data:", error)
                }

                return (
                  <div
                    key={channel.id}
                    className="group bg-zinc-900 border border-zinc-800 p-4 rounded-2xl hover:bg-zinc-800 hover:border-zinc-700 transition-all cursor-pointer flex flex-col gap-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-shrink-0 w-12 h-12 bg-zinc-950 rounded-xl flex items-center justify-center p-2 border border-zinc-800">
                        <img
                          src={channel.logo || "/placeholder.svg"}
                          alt={channel.name}
                          className="w-full h-full object-contain"
                          onError={(e) => { e.currentTarget.style.display = "none" }}
                        />
                      </div>
                      <span className="text-[11px] text-zinc-300 bg-zinc-800 px-2.5 py-1 rounded-full font-semibold">
                        CH {String(channel.channelNumber ?? 0).padStart(3, '0')}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-zinc-100 truncate mb-1">{channel.name}</h3>
                      <p className="text-xs text-blue-400 truncate font-medium">
                        {currentProg?.title || "Live Broadcast"}
                      </p>
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

export default function Home({ bypassAuth = false }: { bypassAuth?: boolean } = {}) {
  const { theme } = useTheme()
  const { hasAccess, isCheckingAccess, setHasAccess } = useAccessControl()

  const [allChannels, setAllChannels] = useState<Channel[]>(staticChannels)
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

  // MODIFIED: Start directly on Home UI
  const [isLiveTVView, setIsLiveTVView] = useState(false)

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
  const [pendingBitrateMode, setPendingBitrateMode] = useState<"high-bitrate" | "optimized" | null>(null)
  const pendingChannelRef = useRef<Channel | null>(null)
  const [restoreUIHidden, setRestoreUIHidden] = useState(false)
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
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('light-view-mode')
      return (saved === 'grid' || saved === 'list') ? saved : 'grid'
    }
    return 'grid'
  })
  const { isPipActive, pipChannel, activatePip, deactivatePip } = usePipMode()
  const [listSearchQuery, setListSearchQuery] = useState("")
  const [listSelectedCategory, setListSelectedCategory] = useState("All")
  const [channelNumberInput, setChannelNumberInput] = useState("")
  const channelNumberTimeoutRef = useRef<NodeJS.Timeout | null>(null)

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

  // Live Clock Update
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    document.title = headerTitle
  }, [headerTitle])

  useEffect(() => {
    setFavorites(getFavorites())
    setRecentlyWatched(getRecentlyWatched())
  }, [])

  useEffect(() => {
    localStorage.setItem('light-view-mode', viewMode)
  }, [viewMode])

  useEffect(() => {
    const loadDbChannels = async () => {
      try {
        const supabase = createClient()
        const { data: dbChannels, error } = await supabase.from("channels").select("*")

        if (error) return

        if (dbChannels && Array.isArray(dbChannels) && dbChannels.length > 0) {
          const activeChannels = dbChannels.filter((ch: any) => ch.is_active !== false)
          const convertedDbChannels: Channel[] = activeChannels.map((ch: any) => ({
            id: ch.id,
            channelNumber: ch.channel_number || undefined,
            name: ch.name,
            url: ch.url,
            logo: ch.logo || undefined,
            category: ch.category || "Entertainment",
            group: ch.group_name || "Other",
            isHD: ch.is_hd || false,
            drm: ch.drm || undefined,
          }))

          const staticIds = new Set(staticChannels.map(c => c.id))
          const newDbChannels = convertedDbChannels.filter(c => !staticIds.has(c.id))

          if (newDbChannels.length > 0) {
            setAllChannels([...staticChannels, ...newDbChannels])
          }
        }
      } catch (error) {
        console.error("[v0] Failed to load channels:", error)
      }
    }
    loadDbChannels()
  }, [])

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
      const epgPromises = EPG_URLS.map(async (url) => {
        try {
          const response = await fetch(`/api/proxy-epg?url=${encodeURIComponent(url)}`, { headers: { Accept: "application/xml" } })
          if (!response.ok) return null
          const xmlText = await response.text()
          return parseEPGXML(xmlText)
        } catch { return null }
      })

      const results = await Promise.all(epgPromises)
      const combinedEPG = results.reduce((acc, epg) => (epg ? { ...acc, ...epg } : acc), {})
      setEpgData(combinedEPG)
      updateCurrentPrograms(combinedEPG)
    } catch {
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
        if (id && displayName) channels[id] = { id, name: displayName, programmes: [] }
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
    } catch { return {} }
  }

  const updateCurrentPrograms = (epgData: any) => {
    const now = new Date()
    const currentProgs: any = {}
    Object.keys(epgData).forEach((channelId) => {
      const programmes = epgData[channelId].programmes
      const currentProg = programmes.find((prog: any) => {
        if (!prog.start || !prog.stop) return false
        const startTime = new Date(prog.start.replace(/(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2}) (.+)/, "$1-$2-$3T$4:$5:$6"))
        const endTime = new Date(prog.stop.replace(/(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2}) (.+)/, "$1-$2-$3T$4:$5:$6"))
        return startTime <= now && now <= endTime
      })
      if (currentProg) currentProgs[channelId] = currentProg
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
    if (selectedChannel?.id === channel.id) return
    setWasInLiveTVBeforePlayer(true)
    setSelectedChannel(channel)
    setHeaderTitle(channel.name)
    setIsLiveTVView(true)
  }

  const handleChannelSelect = (channel: Channel) => {
    if (selectedChannel?.id === channel.id) return
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
      if (scrollTimeout) clearTimeout(scrollTimeout)
      const timeout = setTimeout(() => {
        if (window.scrollY > 50) setIsNavTransparent(false)
      }, 4000)
      setScrollTimeout(timeout)
    }
    window.addEventListener("scroll", handleScroll)
    return () => {
      window.removeEventListener("scroll", handleScroll)
      if (scrollTimeout) clearTimeout(scrollTimeout)
    }
  }, [scrollTimeout])

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
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (/^[0-9]$/.test(e.key)) {
        setChannelNumberInput(prev => {
          const newInput = prev + e.key
          if (channelNumberTimeoutRef.current) clearTimeout(channelNumberTimeoutRef.current)
          channelNumberTimeoutRef.current = setTimeout(() => {
            const channelNum = parseInt(newInput, 10)
            if (channelNum > 0) {
              const targetChannel = allChannels.find(c => c.channelNumber === channelNum)
              if (targetChannel && targetChannel.id !== selectedChannel?.id) {
                if (selectedChannel) {
                  const wasHidden = localStorage.getItem("orotv-ui-hidden") === "true"
                  pendingChannelRef.current = targetChannel
                  setSelectedChannel(null)
                  setTimeout(() => {
                    if (pendingChannelRef.current) {
                      setRestoreUIHidden(wasHidden)
                      setSelectedChannel(pendingChannelRef.current)
                      setHeaderTitle(pendingChannelRef.current.name)
                      addToRecentlyWatched(pendingChannelRef.current.id)
                      setRecentlyWatched(getRecentlyWatched())
                      pendingChannelRef.current = null
                      setTimeout(() => setRestoreUIHidden(false), 1500)
                    }
                  }, 300)
                } else {
                  setSelectedChannel(targetChannel)
                  setHeaderTitle(targetChannel.name)
                  addToRecentlyWatched(targetChannel.id)
                  setRecentlyWatched(getRecentlyWatched())
                }
              }
            }
            setChannelNumberInput("")
          }, 1500)
          return newInput
        })
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [selectedChannel, allChannels])

  useEffect(() => {
    const initializeUserData = async () => {
      await getUserPreference("ultrafantsa_theme", "dark")
      const savedRecent = await getUserPreference("ultrafantsa_recent", [])
      const savedFavorites = await getUserPreference("ultrafantsa_favorites", [])
      setIsDarkMode(true)
      document.documentElement.classList.add("dark")
      setRecentChannels(savedRecent)
      setFavoriteChannels(savedFavorites)
    }
    initializeUserData()
  }, [])

  useEffect(() => {
    const checkFirstVisit = async () => {
      const hasVisited = await getUserPreference("ultrafantsa_visited", false)
      if (!hasVisited) await setUserPreference("ultrafantsa_visited", true)
      setTimeout(() => setIsInitialLoading(false), 1000)
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
    setTimeout(() => window.scrollTo(0, savedScrollPosition), 100)
  }

  const handleBitrateModeChange = (mode: "high-bitrate" | "optimized") => {
    localStorage.setItem("orotv-streaming-mode", mode)
    const wasHidden = localStorage.getItem("orotv-ui-hidden") === "true"
    pendingChannelRef.current = selectedChannel
    setPendingBitrateMode(mode)
    setSelectedChannel(null)
    setTimeout(() => {
      if (pendingChannelRef.current) {
        setRestoreUIHidden(wasHidden)
        setSelectedChannel(pendingChannelRef.current)
        pendingChannelRef.current = null
        setTimeout(() => setRestoreUIHidden(false), 1500)
      }
      setPendingBitrateMode(null)
    }, 500)
  }

  const handleVideoPositionUpdate = async (channelId: string, position: number) => {
    if (!userSessionId) return
    try {
      const supabase = createClient()
      await supabase.rpc("upsert_video_position", { p_user_session: userSessionId, p_channel_id: channelId, p_position: position })
    } catch (error) { console.error(error) }
  }

  const getSavedVideoPosition = async (channelId: string): Promise<number> => {
    if (!userSessionId) return 0
    try {
      const supabase = createClient()
      const { data } = await supabase.from("video_positions").select("position").eq("user_session", userSessionId).eq("channel_id", channelId).single()
      return data?.position || 0
    } catch { return 0 }
  }

  const createChannelTile = (channel: Channel, showFavorite = true) => {
    const isChannelFavorite = isFavorite(channel.id)
    const channelNum = String(channel.channelNumber ?? 0).padStart(3, '0')
    const currentProg = getCurrentChannelInfo(channel).current

    return (
      <div
        key={channel.id}
        className="group relative cursor-pointer snap-start shrink-0"
        onClick={() => handleChannelSelect(channel)}
      >
        <div className="w-[160px] h-[100px] md:w-[240px] md:h-[135px] bg-zinc-900 rounded-2xl flex flex-col justify-end overflow-hidden border border-zinc-800 hover:border-zinc-500 hover:bg-zinc-800/50 transition-colors duration-200">
          {/* Rounded Pill Channel Number */}
          <div className="absolute top-3 left-3 z-20 bg-zinc-950/80 px-3 py-1 text-[10px] font-semibold text-zinc-100 rounded-full border border-zinc-800">
            CH {channelNum}
          </div>

          {/* Logo Area */}
          <div className="absolute inset-0 flex items-center justify-center z-0 p-8 pb-10">
            {channel.logo ? (
              <img
                src={channel.logo}
                alt={channel.name}
                className="max-w-full max-h-full object-contain opacity-80 group-hover:opacity-100 transition-opacity"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
              />
            ) : (
              <div className="w-12 h-12 bg-zinc-800 flex items-center justify-center border border-zinc-700 rounded-xl">
                <span className="text-zinc-400 font-semibold text-lg">{channel.name.charAt(0)}</span>
              </div>
            )}
          </div>

          {/* Info Block */}
          <div className="relative z-20 px-4 py-3 bg-zinc-950 w-full border-t border-zinc-800">
            <h3 className="text-zinc-100 font-semibold text-sm truncate">{channel.name}</h3>
            <p className="text-blue-400 text-xs truncate font-medium mt-0.5">{currentProg === "No information available" ? channel.category : currentProg}</p>
          </div>

          {showFavorite && (
            <button
              onClick={(e) => { e.stopPropagation(); toggleFavorite(channel.id) }}
              className="absolute top-3 right-3 z-30 p-2 bg-zinc-950 hover:bg-zinc-800 transition-colors opacity-0 group-hover:opacity-100 border border-zinc-800 rounded-full"
            >
              <Star className={`w-3.5 h-3.5 ${isChannelFavorite ? "fill-yellow-400 text-yellow-400" : "text-zinc-400"}`} />
            </button>
          )}
        </div>
      </div>
    )
  }

  const scrollChannelRow = (direction: "left" | "right", containerId: string) => {
    const container = document.getElementById(containerId)
    if (container) {
      const scrollAmount = window.innerWidth > 768 ? 600 : 300
      const currentScroll = container.scrollLeft
      const newScroll = direction === "left" ? Math.max(0, currentScroll - scrollAmount) : currentScroll + scrollAmount
      container.scrollTo({ left: newScroll, behavior: "smooth" })
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
    } catch (error) { console.error("[v0] Error getting channel info:", error) }
    return { current: currentProg?.title || "No information available", next: nextProg?.title || "No information available" }
  }

  const getCurrentSelectedChannelInfo = () => {
    if (!selectedChannel) return { current: "No information available", next: "No information available" }
    return getCurrentChannelInfo(selectedChannel)
  }

  const handleModernButtonHover = () => {
    setShowModernButton(true)
    if (modernButtonTimeoutRef.current) clearTimeout(modernButtonTimeoutRef.current)
  }

  const handleChannelInfoHover = () => {
    setShowChannelInfo(true)
    if (channelInfoTimeout) clearTimeout(channelInfoTimeout)
  }

  const handleChannelListHover = () => {
    setShowChannelList(true)
    if (channelListTimeoutRef.current) clearTimeout(channelListTimeoutRef.current)
  }

  const createRow = (title: string, channels: Channel[], icon?: React.ReactNode, showFavorite = false) => {
    const rowId = `row-${title.toLowerCase().replace(/\s+/g, "-")}`
    return (
      <div key={title} className="group relative pt-2 pb-6">
        <div className="flex items-center gap-2 mb-4 px-4 md:px-12">
          {icon && <span className="text-zinc-500">{icon}</span>}
          <h2 className="text-lg md:text-xl font-semibold text-zinc-100 tracking-tight">{title}</h2>
        </div>
        <div className="relative group-hover:z-10">
          <div id={rowId} className="flex gap-4 overflow-x-auto px-4 md:px-12 pb-4 snap-x scrollbar-hide scroll-smooth">
            {channels.map((channel) => createChannelTile(channel, showFavorite))}
          </div>
          <button
            onClick={() => scrollChannelRow("left", rowId)}
            className="hidden md:flex absolute left-0 top-0 bottom-6 w-12 z-20 bg-gradient-to-r from-zinc-950 to-transparent opacity-0 group-hover:opacity-100 transition-opacity items-center justify-start pl-2"
          >
            <ChevronLeft className="h-6 w-6 text-white" />
          </button>
          <button
            onClick={() => scrollChannelRow("right", rowId)}
            className="hidden md:flex absolute right-0 top-0 bottom-6 w-12 z-20 bg-gradient-to-l from-zinc-950 to-transparent opacity-0 group-hover:opacity-100 transition-opacity items-center justify-end pr-2"
          >
            <ChevronRight className="h-6 w-6 text-white" />
          </button>
        </div>
      </div>
    )
  }

  const categorizeChannels = () => {
    const filteredChannels = allChannels.filter((channel) => channel.id !== "alltv" && channel.id !== "alltv2" && channel.url && channel.name)
    return {
      Local: filteredChannels.filter((ch) => ["gma-7", "a2z", "one-ph", "one-ph-hd", "tv5-hd", "ptv-4", "ibc", "kapamilya-channel", "jeepney-tv"].includes(ch.id)),
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
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    setIsLiveTVView(false)
    setHeaderTitle("Home")
    setSelectedChannel(null)
    setSearchQuery("")
    setIsMobileMenuOpen(false)
    setIsMobileSearchOpen(false)
  }

  const handleLiveTVNavigation = () => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
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
    if (isLiveTVView && !searchTerm) return selectedCategory === "All" ? allChannels : allChannels.filter((channel) => channel.category === selectedCategory)
    if (searchTerm) return allChannels.filter((channel) => channel.name.toLowerCase().includes(searchTerm) || channel.category.toLowerCase().includes(searchTerm) || (channel.group || "").toLowerCase().includes(searchTerm))
    return []
  }, [searchQuery, isLiveTVView, selectedCategory, allChannels])

  const categories = useMemo(() => {
    const channelsToUse = searchQuery || isLiveTVView ? filteredChannels : allChannels
    const categorySet = new Set(channelsToUse.map((channel) => channel.category))
    return ["All", ...Array.from(categorySet).sort()]
  }, [searchQuery, filteredChannels, isLiveTVView, allChannels])

  if (isInitialLoading) {
    return (
      <div className="fixed inset-0 bg-zinc-950 flex flex-col items-center justify-center z-50">
        <div className="flex flex-col items-center gap-6">
          <img src="/images/light-logo.png" alt="Light TV" className="h-10 w-auto" />
          <div className="w-8 h-8 border-2 border-zinc-800 border-t-blue-500 rounded-full animate-spin"></div>
        </div>
      </div>
    )
  }

  if (isCheckingAccess && !bypassAuth) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-zinc-800 border-t-cyan-500 rounded-full animate-spin"></div>
          <div className="text-zinc-500 text-sm font-medium">Loading...</div>
        </div>
      </div>
    )
  }

  if (!hasAccess && !bypassAuth) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4 relative overflow-hidden">
        {/* Subtle grid pattern background */}
        <div
          className="absolute inset-0 opacity-30 pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(circle at 25% 25%, rgba(6, 182, 212, 0.08) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(6, 182, 212, 0.05) 0%, transparent 50%)",
          }}
        />

        <div className="relative z-10 w-full max-w-md flex flex-col items-center">
          {/* Brand wordmark */}
          <div className="mb-8">
            <LightLogo size="lg" variant="light" />
          </div>

          {/* Card */}
          <div className="w-full bg-[#0e0e10] border border-zinc-800/80 rounded-2xl p-8 shadow-2xl">
            <div className="text-center space-y-2 mb-8">
              <h1 className="text-2xl md:text-3xl font-bold text-white text-balance leading-tight">
                Welcome to Light TV
              </h1>
              <p className="text-sm text-zinc-400 text-pretty leading-relaxed">
                Sign in to access premium streaming content
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={() => { window.location.href = "/login" }}
                className="w-full h-12 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-black font-semibold text-base transition-colors"
              >
                Sign In
              </button>
              <button
                onClick={() => { window.location.href = "/register" }}
                className="w-full h-12 rounded-xl bg-[#1a1a1d] hover:bg-[#222226] text-white font-semibold text-base border border-zinc-800/80 transition-colors"
              >
                Create Account
              </button>
            </div>

            <div className="mt-6 pt-6 border-t border-zinc-800/80 text-center">
              <p className="text-xs text-zinc-500 leading-relaxed">
                Registration requires PHCorner verification.{" "}
                <a
                  href="https://phcorner.org/direct-messages/add?to=PHC-SVWG"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyan-400 hover:text-cyan-300 underline-offset-2 hover:underline font-medium"
                >
                  Learn more
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (selectedChannel && viewMode === 'grid') {
    return (
      <div className="fixed inset-0 z-50 bg-zinc-950 md:p-4">
        <div className="w-full h-full bg-black rounded-none md:rounded-3xl overflow-hidden border border-zinc-800/50 relative">
          <VideoPlayer
            channel={selectedChannel}
            user={null}
            onClose={handleClosePlayer}
            onChannelChange={(channelId: string) => {
              const target = allChannels.find(c => c.id === channelId)
              if (!target || target.id === selectedChannel.id) return
              const wasHidden = localStorage.getItem("orotv-ui-hidden") === "true"
              pendingChannelRef.current = target
              setSelectedChannel(null)
              setTimeout(() => {
                if (pendingChannelRef.current) {
                  setRestoreUIHidden(wasHidden)
                  setSelectedChannel(pendingChannelRef.current)
                  setHeaderTitle(pendingChannelRef.current.name)
                  addToRecentlyWatched(pendingChannelRef.current.id)
                  setRecentlyWatched(getRecentlyWatched())
                  pendingChannelRef.current = null
                  setTimeout(() => setRestoreUIHidden(false), 1500)
                }
              }, 300)
            }}
            onBitrateModeChange={handleBitrateModeChange}
            restoreUIHidden={restoreUIHidden}
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
      </div>
    )
  }

  const listFilteredChannels = (() => {
    const term = listSearchQuery.toLowerCase().trim()
    let channels = allChannels
    if (listSelectedCategory !== "All") channels = channels.filter(ch => ch.category === listSelectedCategory)
    if (term) {
      const numericSearch = parseInt(term, 10)
      if (!isNaN(numericSearch) && numericSearch > 0) {
        channels = channels.filter(ch => {
          const num = ch.channelNumber ?? 0
          return num.toString().includes(term) || num.toString().padStart(3, '0').includes(term)
        })
      } else {
        channels = channels.filter(ch => ch.name.toLowerCase().includes(term) || ch.category.toLowerCase().includes(term))
      }
    }
    return channels
  })()

  const listCategories = ["All", ...Array.from(new Set(allChannels.map(ch => ch.category))).sort()]

  // LIST MODE LAYOUT (Modern Rounded Sidebar style)
  if (viewMode === 'list') {
    return (
      <div className="h-screen bg-zinc-950 text-zinc-100 flex flex-col overflow-hidden font-sans antialiased">
        <SupportPopup isOpen={showSupportModal} onClose={() => setShowSupportModal(false)} isFirstTime={isFirstTimeUser} />
        {showKeyboardShortcuts && (
          <div className="fixed inset-0 bg-zinc-950/80 flex items-center justify-center z-[100] p-4" onClick={() => setShowKeyboardShortcuts(false)}>
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-sm w-full p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-500/10 text-blue-400 rounded-xl flex items-center justify-center"><Keyboard className="w-4 h-4" /></div>
                  <h2 className="text-sm font-semibold text-white">Remote Shortcuts</h2>
                </div>
                <button onClick={() => setShowKeyboardShortcuts(false)} className="text-zinc-500 hover:text-white bg-zinc-800 hover:bg-zinc-700 p-2 rounded-full transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-2 text-sm">
                {[['Play/Pause', 'Space'], ['Mute', 'M'], ['Fullscreen', 'F'], ['PiP', 'P'], ['Vol Up', '↑'], ['Vol Down', '↓'], ['Seek Fwd', '→'], ['Seek Back', '←'], ['Direct Channel', '0-9']].map(([label, key]) => (
                  <div key={label} className="flex justify-between items-center px-4 py-3 bg-zinc-950/50 rounded-xl border border-zinc-800">
                    <span className="text-zinc-400 font-medium">{label}</span>
                    <kbd className="px-2 py-1 bg-zinc-800 rounded-md text-zinc-200 font-mono text-xs font-semibold">{key}</kbd>
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

        {/* MODERN FLAT TOP BAR */}
        <header className="fixed top-0 left-0 right-0 z-50 bg-zinc-950 border-b border-zinc-800 h-16 flex items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <button className="md:hidden p-2 text-zinc-400 hover:text-white bg-zinc-900 rounded-full transition-colors" onClick={() => setIsMobileMenuOpen(true)}>
                <Menu className="w-5 h-5" />
              </button>
              <img src="/images/light-logo.png" alt="Light TV" className="h-6 md:h-8 w-auto" />
            </div>
            <nav className="hidden md:flex items-center gap-2 border-l border-zinc-800 pl-6">
              <button onClick={() => { handleHomeNavigation(); setViewMode('grid'); }} className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-full transition-colors">Home</button>
              <button onClick={() => { handleLiveTVNavigation(); setViewMode('grid'); }} className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-full transition-colors">Live TV</button>
              <button onClick={() => setShowChannelGuide(true)} className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-full transition-colors">Guide</button>
              <button onClick={() => setShowChannelRequestModal(true)} className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-full transition-colors">Request</button>
              <button onClick={() => setShowRatingModal(true)} className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-full transition-colors">Rate</button>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-full mr-2">
              <Clock className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-xs font-semibold text-zinc-200">{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <button onClick={() => setShowQuickSwitch(true)} className="w-9 h-9 flex items-center justify-center bg-zinc-900 hover:bg-zinc-800 rounded-full transition-colors text-zinc-400 hover:text-white"><Zap className="w-4 h-4" /></button>
            <button onClick={() => setShowChannelStats(true)} className="hidden sm:flex w-9 h-9 items-center justify-center bg-zinc-900 hover:bg-zinc-800 rounded-full transition-colors text-zinc-400 hover:text-white"><TrendingUp className="w-4 h-4" /></button>
            <button onClick={() => setViewMode('grid')} className="flex items-center gap-2 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 rounded-full transition-colors border border-zinc-800 text-zinc-200">
              <LayoutGrid className="w-4 h-4" />
              <span className="text-xs font-semibold hidden sm:block">Grid View</span>
            </button>
          </div>
        </header>

        {isMobileMenuOpen && (
          <div className="md:hidden fixed inset-0 z-[100] bg-zinc-950 flex flex-col pt-6 px-6 animate-in fade-in duration-200">
            <div className="flex justify-end mb-6">
              <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 bg-zinc-900 rounded-full text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex flex-col gap-3">
              <button onClick={() => { handleHomeNavigation(); setIsMobileMenuOpen(false); }} className="text-base font-semibold text-left text-white bg-zinc-900 p-4 rounded-2xl border border-zinc-800">Home</button>
              <button onClick={() => { handleLiveTVNavigation(); setIsMobileMenuOpen(false); }} className="text-base font-semibold text-left text-white bg-zinc-900 p-4 rounded-2xl border border-zinc-800">Live TV</button>
              <button onClick={() => { setShowChannelGuide(true); setIsMobileMenuOpen(false); }} className="text-base font-semibold text-left text-white bg-zinc-900 p-4 rounded-2xl border border-zinc-800">TV Guide</button>
              <button onClick={() => { setShowChannelRequestModal(true); setIsMobileMenuOpen(false); }} className="text-base font-semibold text-left text-white bg-zinc-900 p-4 rounded-2xl border border-zinc-800">Request Channel</button>
              <button onClick={() => { setShowRatingModal(true); setIsMobileMenuOpen(false); }} className="text-base font-semibold text-left text-white bg-zinc-900 p-4 rounded-2xl border border-zinc-800">Rate Us</button>
            </nav>
          </div>
        )}

        <div className="flex flex-col md:flex-row flex-1 pt-16 min-h-0 bg-zinc-950">
          {/* MOBILE LIST LAYOUT */}
          <div className="flex flex-col flex-1 min-h-0 md:hidden">
            <div className="shrink-0 w-full bg-black relative" style={{ aspectRatio: '16/9' }}>
              {selectedChannel && isMobile ? (
                <VideoPlayer
                  channel={selectedChannel} user={null} onClose={() => { setSelectedChannel(null); setHeaderTitle("Live TV") }} onChannelChange={() => { }}
                  onBitrateModeChange={handleBitrateModeChange} restoreUIHidden={restoreUIHidden} availableChannels={allChannels} videoRef={videoRef} isMuted={isMuted} showModernButton={showModernButton} showChannelInfo={showChannelInfo} showChannelList={showChannelList} getCurrentChannelInfo={getCurrentChannelInfo} getCurrentSelectedChannelInfo={getCurrentSelectedChannelInfo} onModernButtonHover={handleModernButtonHover} onChannelInfoHover={handleChannelInfoHover} onChannelListHover={handleChannelListHover} isMobile={isMobile} isPortrait={isPortrait} epgData={epgData} currentPrograms={currentPrograms} onPositionUpdate={handleVideoPositionUpdate} getSavedPosition={getSavedVideoPosition} embedded={true}
                />
              ) : !selectedChannel ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900 border-b border-zinc-800">
                  <div className="w-12 h-12 bg-zinc-950 rounded-full flex items-center justify-center mb-3">
                    <Tv className="w-5 h-5 text-zinc-500" />
                  </div>
                  <h1 className="text-sm font-semibold text-zinc-200">Tuner Ready</h1>
                  <p className="text-xs text-zinc-500 mt-1">Select channel below</p>
                </div>
              ) : null}
            </div>

            <div className="shrink-0 bg-zinc-950 border-b border-zinc-800 p-4">
              <div className="relative mb-3">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="text" placeholder="Search channels..." value={listSearchQuery} onChange={(e) => setListSearchQuery(e.target.value)}
                  className="w-full pl-11 pr-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-full text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-blue-500/50 text-sm transition-colors"
                />
              </div>
              <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                {listCategories.map((cat) => (
                  <button
                    key={cat} onClick={() => setListSelectedCategory(cat)}
                    className={`whitespace-nowrap shrink-0 px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${listSelectedCategory === cat ? "bg-zinc-100 text-zinc-900" : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800 border border-zinc-800"}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto bg-zinc-950 p-3">
              {listFilteredChannels.map((channel) => {
                const isActive = selectedChannel?.id === channel.id
                const currentProg = getCurrentChannelInfo(channel).current

                return (
                  <button
                    key={channel.id} onClick={() => { if (selectedChannel?.id !== channel.id) { setSelectedChannel(channel); setHeaderTitle(channel.name); addToRecentlyWatched(channel.id); setRecentlyWatched(getRecentlyWatched()) } }}
                    className={`w-full flex items-center gap-3 px-4 py-3 mb-2 text-left rounded-2xl transition-colors border ${isActive ? "bg-blue-500/10 border-blue-500/30" : "bg-zinc-900/50 border-transparent hover:bg-zinc-900"}`}
                  >
                    <span className="text-[11px] font-semibold text-zinc-500 w-6 text-right shrink-0">{String(channel.channelNumber ?? 0).padStart(3, '0')}</span>
                    <div className="w-10 h-10 bg-zinc-950 border border-zinc-800 flex items-center justify-center p-1.5 rounded-xl shrink-0">
                      <img src={channel.logo || "/placeholder.svg"} alt="" className="w-full h-full object-contain" onError={(e) => { e.currentTarget.style.display = "none" }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className={`text-sm font-semibold truncate ${isActive ? "text-zinc-100" : "text-zinc-300"}`}>{channel.name}</p>
                        {channel.isHD && <span className="text-[9px] px-1.5 py-0.5 bg-blue-500/10 text-blue-400 rounded-md font-semibold border border-blue-500/20">HD</span>}
                      </div>
                      <p className={`text-xs truncate font-medium ${isActive ? 'text-blue-400' : 'text-zinc-500'}`}>{currentProg === "No information available" ? channel.category : currentProg}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* DESKTOP LIST LAYOUT */}
          <aside className="hidden md:flex w-[340px] bg-zinc-950 border-r border-zinc-800 flex-col shrink-0 overflow-hidden z-10">
            <div className="p-5 border-b border-zinc-800 bg-zinc-950">
              <div className="relative mb-4">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="text" placeholder="Find channel..." value={listSearchQuery} onChange={(e) => setListSearchQuery(e.target.value)}
                  className="w-full pl-11 pr-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-full text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-blue-500/50 text-sm transition-colors"
                />
              </div>
              <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 snap-x">
                {listCategories.map((cat) => (
                  <button
                    key={cat} onClick={() => setListSelectedCategory(cat)}
                    className={`whitespace-nowrap snap-start shrink-0 px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${listSelectedCategory === cat ? "bg-zinc-100 text-zinc-900" : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800 border border-zinc-800"}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto bg-zinc-950 p-3">
              {listFilteredChannels.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
                  <div className="w-12 h-12 bg-zinc-900 rounded-full flex items-center justify-center mb-3">
                    <Tv className="w-6 h-6 text-zinc-500" />
                  </div>
                  <p className="text-sm font-medium text-zinc-500">No matching channels</p>
                </div>
              ) : (
                listFilteredChannels.map((channel) => {
                  const isActive = selectedChannel?.id === channel.id
                  const currentProg = getCurrentChannelInfo(channel).current

                  return (
                    <button
                      key={channel.id} onClick={() => { if (selectedChannel?.id !== channel.id) { setSelectedChannel(channel); setHeaderTitle(channel.name); addToRecentlyWatched(channel.id); setRecentlyWatched(getRecentlyWatched()) } }}
                      className={`w-full flex items-center gap-4 px-4 py-3 mb-2 text-left rounded-2xl transition-colors border ${isActive ? "bg-blue-500/10 border-blue-500/30" : "bg-zinc-900/40 border-transparent hover:bg-zinc-900"}`}
                    >
                      <span className="text-[11px] font-semibold text-zinc-500 w-6 text-right shrink-0">{String(channel.channelNumber ?? 0).padStart(3, '0')}</span>
                      <div className={`w-12 h-12 bg-zinc-950 border flex items-center justify-center p-2 rounded-xl shrink-0 transition-colors ${isActive ? 'border-blue-500/30' : 'border-zinc-800'}`}>
                        <img src={channel.logo || "/placeholder.svg"} alt="" className="w-full h-full object-contain" onError={(e) => { e.currentTarget.style.display = "none" }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className={`text-sm font-semibold truncate ${isActive ? "text-zinc-100" : "text-zinc-300"}`}>{channel.name}</p>
                          {channel.isHD && <span className="text-[9px] px-1.5 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-md font-semibold">HD</span>}
                        </div>
                        <p className={`text-xs truncate font-medium ${isActive ? 'text-blue-400' : 'text-zinc-500'}`}>{currentProg === "No information available" ? channel.category : currentProg}</p>
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          </aside>

          {/* Desktop Video Area */}
          <div className="hidden md:flex flex-1 flex-col bg-zinc-950 min-h-0 relative p-4">
            {selectedChannel && !isMobile ? (
              <div className="flex-1 rounded-3xl overflow-hidden border border-zinc-800 bg-black">
                <VideoPlayer
                  channel={selectedChannel} user={null} onClose={() => { setSelectedChannel(null); setHeaderTitle("Live TV") }} onChannelChange={() => { }}
                  onBitrateModeChange={handleBitrateModeChange} restoreUIHidden={restoreUIHidden} availableChannels={allChannels} videoRef={videoRef} isMuted={isMuted} showModernButton={showModernButton} showChannelInfo={showChannelInfo} showChannelList={showChannelList} getCurrentChannelInfo={getCurrentChannelInfo} getCurrentSelectedChannelInfo={getCurrentSelectedChannelInfo} onModernButtonHover={handleModernButtonHover} onChannelInfoHover={handleChannelInfoHover} onChannelListHover={handleChannelListHover} isMobile={isMobile} isPortrait={isPortrait} epgData={epgData} currentPrograms={currentPrograms} onPositionUpdate={handleVideoPositionUpdate} getSavedPosition={getSavedVideoPosition} embedded={true}
                />
              </div>
            ) : !selectedChannel ? (
              <div className="absolute inset-4 flex flex-col items-center justify-center bg-zinc-900/30 z-0 rounded-3xl border border-zinc-800/50">
                <div className="z-10 flex flex-col items-center text-center max-w-md px-8">
                  <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mb-6">
                    <Tv className="w-8 h-8 text-zinc-400" />
                  </div>
                  <h1 className="text-xl font-bold text-zinc-100 mb-2">Tuner Ready</h1>
                  <p className="text-sm text-zinc-500 mb-8">Select a channel from the sidebar to broadcast.</p>
                  <div className="grid grid-cols-2 gap-4 w-full text-left">
                    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
                      <Keyboard className="w-5 h-5 text-blue-500 mb-2" />
                      <p className="text-xs text-zinc-400 font-medium">Numpad: Direct Tune</p>
                    </div>
                    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
                      <Search className="w-5 h-5 text-blue-500 mb-2" />
                      <p className="text-xs text-zinc-400 font-medium">Search to locate channel</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {/* Modals for List View */}
        <ChannelGuideModal isOpen={showChannelGuide} onClose={() => setShowChannelGuide(false)} channelGuideSearch={channelGuideSearch} setChannelGuideSearch={setChannelGuideSearch} epgData={epgData} currentPrograms={currentPrograms} />
        <ChannelRequestModal isOpen={showChannelRequestModal} onClose={() => setShowChannelRequestModal(false)} />
        <RatingModal isOpen={showRatingModal} onClose={() => setShowRatingModal(false)} />

        {channelNumberInput && (() => {
          const num = parseInt(channelNumberInput, 10)
          const match = allChannels.find(c => c.channelNumber === num)
          return (
            <div className="fixed top-20 right-10 z-[200] pointer-events-none select-none animate-in fade-in slide-in-from-right-4 duration-200">
              <div className="flex items-center gap-4 px-6 py-4 bg-zinc-900 border border-zinc-800 rounded-[24px]">
                <span className="font-bold text-zinc-100 text-3xl bg-zinc-950 px-4 py-2 rounded-2xl border border-zinc-800">{channelNumberInput.padStart(3, '0')}</span>
                <div className="flex flex-col">
                  <span className="text-zinc-500 text-xs font-semibold uppercase tracking-wider">Tuning</span>
                  <span className="text-blue-400 font-bold text-sm">{match ? match.name : 'NO SIGNAL'}</span>
                </div>
              </div>
            </div>
          )
        })()}
        <QuickChannelSwitch isOpen={showQuickSwitch} onClose={() => setShowQuickSwitch(false)} allChannels={allChannels} onChannelSelect={handleChannelSelect} currentChannel={selectedChannel} />
        <ChannelStats isOpen={showChannelStats} onClose={() => setShowChannelStats(false)} allChannels={allChannels} onChannelSelect={handleChannelSelect} />
        <PipMode isActive={isPipActive} channel={pipChannel} onClose={deactivatePip} onMaximize={() => { if (pipChannel) { handleChannelSelect(pipChannel); deactivatePip() } }} />
      </div>
    )
  }

  // GRID MODE LAYOUT (Modern Smart TV style)
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans antialiased animate-in fade-in duration-300">
      <SupportPopup isOpen={showSupportModal} onClose={() => setShowSupportModal(false)} isFirstTime={isFirstTimeUser} />

      {showKeyboardShortcuts && (
        <div className="fixed inset-0 bg-zinc-950/80 flex items-center justify-center z-[100] p-4" onClick={() => setShowKeyboardShortcuts(false)}>
          <div className="bg-zinc-900 border border-zinc-800 rounded-[24px] max-w-sm w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-500/10 text-blue-400 rounded-xl flex items-center justify-center"><Keyboard className="w-4 h-4" /></div>
                <h2 className="text-sm font-semibold text-zinc-100">Remote Shortcuts</h2>
              </div>
              <button onClick={() => setShowKeyboardShortcuts(false)} className="text-zinc-500 hover:text-white bg-zinc-800 hover:bg-zinc-700 p-2 rounded-full transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2 text-sm">
              {[['Play/Pause', 'Space'], ['Mute', 'M'], ['Fullscreen', 'F'], ['Picture-in-Picture', 'P'], ['Volume Up', '↑'], ['Volume Down', '↓'], ['Seek Forward', '→'], ['Seek Backward', '←']].map(([label, key]) => (
                <div key={label} className="flex justify-between items-center px-4 py-3 bg-zinc-950/50 rounded-xl border border-zinc-800">
                  <span className="text-zinc-400 font-medium">{label}</span>
                  <kbd className="px-2 py-1 bg-zinc-800 rounded-lg text-zinc-200 font-mono text-xs font-semibold border border-zinc-700">{key}</kbd>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      <IOSUnsupportedModal />
      <ReportModal isOpen={showReportModal} onClose={() => setShowReportModal(false)} />
      <AnnouncementsSystem />

      {/* MODERN FLAT TOP BAR */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isNavTransparent ? 'bg-transparent pt-4 pb-12' : 'bg-zinc-950 border-b border-zinc-800 py-3'}`}>
        <div className="px-6 md:px-12 flex items-center justify-between">
          <div className="flex items-center gap-4 md:gap-8">
            <button className="md:hidden p-2 text-zinc-400 hover:text-white bg-zinc-900 rounded-full transition-colors" onClick={() => setIsMobileMenuOpen(true)}>
              <Menu className="w-5 h-5" />
            </button>
            <img src="/images/light-logo.png" alt="Light TV" className="h-8 md:h-10 w-auto" />
            <nav className="hidden md:flex items-center gap-2 border-l border-zinc-800 pl-6">
              <button
                onClick={handleHomeNavigation}
                className={`px-5 py-2.5 rounded-full text-xs font-semibold transition-colors ${!isLiveTVView ? "bg-zinc-100 text-zinc-900" : "text-zinc-400 hover:text-white hover:bg-zinc-900"}`}
              >
                Home
              </button>
              <button
                onClick={handleLiveTVNavigation}
                className={`px-5 py-2.5 rounded-full text-xs font-semibold transition-colors ${isLiveTVView ? "bg-zinc-100 text-zinc-900" : "text-zinc-400 hover:text-white hover:bg-zinc-900"}`}
              >
                Live TV
              </button>
              <button
                onClick={() => setShowChannelGuide(true)}
                className="px-5 py-2.5 rounded-full text-xs font-semibold text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors"
              >
                Guide
              </button>
              <button
                onClick={() => setShowChannelRequestModal(true)}
                className="px-5 py-2.5 rounded-full text-xs font-semibold text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors"
              >
                Request
              </button>
              <button
                onClick={() => setShowRatingModal(true)}
                className="px-5 py-2.5 rounded-full text-xs font-semibold text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors"
              >
                Rate Us
              </button>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden lg:flex relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type="text"
                placeholder="Search content..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-11 pr-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-full focus:outline-none focus:border-blue-500/50 text-sm w-60 text-zinc-100 placeholder:text-zinc-500 transition-colors"
              />
            </div>
            <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-full">
              <span className="text-xs font-semibold text-zinc-300">{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>

            <button onClick={() => setShowQuickSwitch(true)} className="w-9 h-9 flex items-center justify-center bg-zinc-900 hover:bg-zinc-800 rounded-full transition-colors text-zinc-400 hover:text-white"><Zap className="w-4 h-4" /></button>
            <button onClick={() => setViewMode('list')} className="flex items-center gap-2 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-full transition-colors text-zinc-300 hover:text-white">
              <List className="w-4 h-4" />
              <span className="text-[10px] font-semibold hidden sm:block uppercase">List UI</span>
            </button>
            <button onClick={() => setShowKeyboardShortcuts(true)} className="hidden md:flex w-9 h-9 items-center justify-center bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-full transition-colors text-zinc-400 hover:text-white"><Keyboard className="w-4 h-4" /></button>
          </div>
        </div>
      </header>

      {/* Mobile search overlay */}
      {isMobileSearchOpen && (
        <div className="md:hidden fixed top-20 left-4 right-4 z-40 bg-zinc-900 border border-zinc-800 rounded-[20px] p-3 animate-in fade-in duration-200">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Search channels..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              autoFocus
              className="w-full pl-11 pr-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-full text-zinc-100 focus:outline-none focus:border-blue-500/50 text-sm"
            />
          </div>
        </div>
      )}

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-[100] bg-zinc-950 flex flex-col p-6 animate-in fade-in duration-200">
          <div className="flex justify-end mb-6">
            <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 bg-zinc-900 rounded-full text-zinc-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
          <nav className="flex flex-col gap-3 mt-4">
            <button onClick={() => { handleHomeNavigation(); setIsMobileMenuOpen(false); }} className="text-lg font-semibold text-left text-white bg-zinc-900 hover:bg-zinc-800 p-4 rounded-2xl border border-zinc-800 transition-colors">Home</button>
            <button onClick={() => { handleLiveTVNavigation(); setIsMobileMenuOpen(false); }} className="text-lg font-semibold text-left text-white bg-zinc-900 hover:bg-zinc-800 p-4 rounded-2xl border border-zinc-800 transition-colors">Live TV</button>
            <button onClick={() => { setShowChannelGuide(true); setIsMobileMenuOpen(false); }} className="text-lg font-semibold text-left text-white bg-zinc-900 hover:bg-zinc-800 p-4 rounded-2xl border border-zinc-800 transition-colors">TV Guide</button>
            <button onClick={() => { setShowChannelRequestModal(true); setIsMobileMenuOpen(false); }} className="text-lg font-semibold text-left text-white bg-zinc-900 hover:bg-zinc-800 p-4 rounded-2xl border border-zinc-800 transition-colors">Request Channel</button>
            <button onClick={() => { setShowRatingModal(true); setIsMobileMenuOpen(false); }} className="text-lg font-semibold text-left text-white bg-zinc-900 hover:bg-zinc-800 p-4 rounded-2xl border border-zinc-800 transition-colors">Rate Us</button>
          </nav>
        </div>
      )}

      <main className={`pt-24 md:pt-32 pb-20 w-full relative z-10`}>

        {!isLiveTVView ? (
          <div className="w-full animate-in fade-in duration-500">
            {/* Modern Clean Hero */}
            <div className="px-6 md:px-12 mb-10">
              <div className="bg-zinc-900 border border-zinc-800 rounded-[24px] md:rounded-[32px] p-8 md:p-14 relative overflow-hidden">
                <div className="relative z-10">
                  <h1 className="text-4xl md:text-5xl font-bold text-zinc-100 tracking-tight mb-4">Stream Your <br className="hidden md:block" /><span className="text-blue-500">Favorites</span></h1>
                  <p className="text-sm md:text-base text-zinc-400 max-w-xl mb-8 font-medium leading-relaxed">Dive into a beautiful, lightweight interface designed for your living room. Select a channel to begin and owned by phc svwg.</p>
                  <div className="flex flex-wrap gap-4">
                    <Button onClick={handleLiveTVNavigation} className="bg-zinc-100 text-zinc-900 hover:bg-zinc-300 px-8 py-6 rounded-full text-sm font-semibold transition-colors flex items-center gap-2">
                      Start Watching
                    </Button>
                    <Button onClick={() => setShowChannelGuide(true)} className="bg-zinc-800 text-zinc-200 hover:bg-zinc-700 border border-zinc-700 px-8 py-6 rounded-full text-sm font-semibold transition-colors">
                      TV Guide
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Content Rows */}
            <div className="space-y-6 md:space-y-10">
              {favorites.length > 0 && createRow("Your Favorites", allChannels.filter(ch => favorites.includes(ch.id)), <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />, true)}
              {recentlyWatched.length > 0 && createRow("Jump Back In", allChannels.filter(ch => recentlyWatched.includes(ch.id)).sort((a, b) => recentlyWatched.indexOf(a.id) - recentlyWatched.indexOf(b.id)), <Clock className="w-4 h-4 text-zinc-400" />, true)}

              {Object.entries(categorizeChannels()).map(([categoryName, categoryChannels], index) => {
                if (categoryChannels.length === 0) return null
                return (
                  <div key={categoryName} className="animate-in fade-in duration-700" style={{ animationDelay: `${index * 0.1}s` }}>
                    {createRow(categoryName, categoryChannels, null, true)}
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          <div className="w-full animate-in fade-in duration-500">
            <div className="px-6 md:px-12 py-2 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <h1 className="text-2xl md:text-3xl font-bold text-zinc-100 flex items-center gap-3">
                <div className="w-1.5 h-8 bg-blue-500 rounded-full"></div>
                {searchQuery ? "Search Results" : "Live Channels"}
              </h1>

              {/* Rounded Category Pills */}
              {!searchQuery && (
                <div className="flex gap-2 overflow-x-auto scrollbar-hide snap-x p-1.5 bg-zinc-900 border border-zinc-800 rounded-full">
                  {categories.map((category) => (
                    <button
                      key={category}
                      onClick={() => setSelectedCategory(category)}
                      className={`whitespace-nowrap shrink-0 snap-start px-5 py-2 rounded-full text-sm font-medium transition-colors ${selectedCategory === category
                        ? "bg-zinc-100 text-zinc-900"
                        : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
                        }`}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Grid of Channels */}
            {filteredChannels.length > 0 ? (
              <div className="px-6 md:px-12 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-5">
                {filteredChannels.map((channel, index) => (
                  <div
                    key={channel.id}
                    onClick={() => handleChannelSelectForLiveTV(channel)}
                    className="group relative cursor-pointer animate-in fade-in duration-500 aspect-[4/3] bg-zinc-900 rounded-[24px] border border-zinc-800 hover:border-blue-500/50 hover:bg-zinc-800/80 transition-all overflow-hidden"
                    style={{ animationDelay: `${(index % 12) * 0.05}s` }}
                  >
                    <div className="absolute top-3 left-3 z-20 bg-zinc-950/80 px-3 py-1 text-[10px] font-semibold text-zinc-100 rounded-full border border-zinc-800">
                      CH {String(channel.channelNumber ?? 0).padStart(3, '0')}
                    </div>

                    <div className="absolute inset-0 flex items-center justify-center z-0 p-8 pb-10">
                      {channel.logo ? (
                        <img src={channel.logo} alt={channel.name} className="max-w-full max-h-full object-contain opacity-80 group-hover:opacity-100 transition-opacity duration-200" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                      ) : (
                        <div className="w-12 h-12 bg-zinc-800 flex items-center justify-center rounded-2xl border border-zinc-700"><span className="text-zinc-400 font-bold text-xl uppercase">{channel.name.charAt(0)}</span></div>
                      )}
                    </div>

                    <div className="absolute bottom-0 left-0 right-0 p-4 bg-zinc-950 border-t border-zinc-800 z-20">
                      <h3 className="text-zinc-100 font-semibold text-sm truncate">{channel.name}</h3>
                      <p className="text-blue-400 text-[11px] truncate mt-0.5 font-medium">{channel.category}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-24 bg-zinc-900 border border-zinc-800 mx-6 md:mx-12 rounded-[32px]">
                <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4 border border-zinc-700">
                  <Tv className="w-8 h-8 text-zinc-500" />
                </div>
                <h3 className="text-lg font-bold text-zinc-100 mb-1">No channels found</h3>
                <p className="text-sm text-zinc-500">Try adjusting your search or category.</p>
              </div>
            )}
          </div>
        )}
      </main>

      <ChannelGuideModal isOpen={showChannelGuide} onClose={() => setShowChannelGuide(false)} channelGuideSearch={channelGuideSearch} setChannelGuideSearch={setChannelGuideSearch} epgData={epgData} currentPrograms={currentPrograms} />
      <ChannelRequestModal isOpen={showChannelRequestModal} onClose={() => setShowChannelRequestModal(false)} />
      <RatingModal isOpen={showRatingModal} onClose={() => setShowRatingModal(false)} />
      <ReportModal isOpen={showReportModal} onClose={() => setShowReportModal(false)} />

      {/* OSD Channel Number overlay - Modern Pill */}
      {channelNumberInput && (() => {
        const num = parseInt(channelNumberInput, 10)
        const match = allChannels.find(c => c.channelNumber === num)
        return (
          <div className="fixed top-24 right-4 md:right-12 z-[200] pointer-events-none select-none animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="flex items-center gap-4 px-6 py-4 bg-zinc-900 border border-zinc-800 rounded-[24px] shadow-2xl">
              <span className="font-bold text-zinc-100 text-3xl md:text-4xl bg-zinc-950 px-4 py-2 rounded-2xl border border-zinc-800">{channelNumberInput.padStart(3, '0')}</span>
              <div className="flex flex-col">
                <span className="text-zinc-500 text-xs font-semibold uppercase">Tuning</span>
                <span className="text-blue-400 font-bold text-sm md:text-base max-w-[120px] truncate">{match ? match.name : 'NO SIGNAL'}</span>
              </div>
            </div>
          </div>
        )
      })()}

      <QuickChannelSwitch isOpen={showQuickSwitch} onClose={() => setShowQuickSwitch(false)} allChannels={allChannels} onChannelSelect={handleChannelSelect} currentChannel={selectedChannel} />
      <ChannelStats isOpen={showChannelStats} onClose={() => setShowChannelStats(false)} allChannels={allChannels} onChannelSelect={handleChannelSelect} />
      <PipMode isActive={isPipActive} channel={pipChannel} onClose={deactivatePip} onMaximize={() => { if (pipChannel) { handleChannelSelect(pipChannel); deactivatePip() } }} />
    </div>
  )
}

const detectStreamFormat = (url: string): StreamFormat => {
  if (url.includes(".m3u8")) return "HLS"
  if (url.includes(".mpd")) return "DASH"
  if (url.includes("clearkey")) return "CLEARKEY_DRM"
  return "UNKNOWN"
}
