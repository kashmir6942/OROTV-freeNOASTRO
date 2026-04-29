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
    <div className="fixed inset-0 bg-[#000000] flex items-center justify-center z-[100] animate-in fade-in duration-300">
      <div className="bg-[#141414] w-full h-full max-w-6xl max-h-[90vh] flex flex-col border border-[#333] overflow-hidden">
        {/* TV Guide Header - Flat */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-5 border-b border-[#333] bg-[#1a1a1a]">
          <div className="flex items-center gap-4 mb-4 sm:mb-0">
            <div className="w-10 h-10 bg-[#333] flex items-center justify-center rounded-sm">
              <Tv className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white uppercase tracking-wider">TV Guide</h2>
              <p className="text-xs text-[#888] uppercase mt-1">Live Programming</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#888] w-4 h-4" />
              <input
                type="text"
                placeholder="Search channels..."
                value={channelGuideSearch}
                onChange={(e) => setChannelGuideSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-[#222] border border-[#444] rounded-sm text-white placeholder:text-[#888] focus:outline-none focus:border-blue-600 transition-colors text-sm"
              />
            </div>
            <button onClick={onClose} className="w-10 h-10 bg-[#222] hover:bg-[#333] flex items-center justify-center text-white rounded-sm transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* TV Guide Content - Flat List */}
        <div className="flex-1 overflow-y-auto bg-[#0a0a0a] p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {guideFilteredChannels.length === 0 ? (
              <div className="col-span-full text-center text-[#555] py-20 flex flex-col items-center">
                <Search className="w-12 h-12 mb-4" />
                <p className="text-lg">No channels found</p>
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
                    className="group bg-[#141414] border border-[#222] p-3 hover:bg-[#1f1f1f] hover:border-[#444] transition-colors cursor-pointer flex gap-4 items-center"
                  >
                    <div className="flex-shrink-0 w-16 h-12 bg-[#000] flex items-center justify-center p-1 border border-[#333]">
                      <img
                        src={channel.logo || "/placeholder.svg"}
                        alt={channel.name}
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          e.currentTarget.style.display = "none"
                        }}
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="text-sm font-bold text-white truncate">{channel.name}</h3>
                        <span className="text-[10px] text-[#aaa] bg-[#222] px-1.5 py-0.5 rounded-sm font-mono tracking-wider">
                          CH {String(channel.channelNumber ?? 0).padStart(3, '0')}
                        </span>
                      </div>
                      <p className="text-xs text-[#888] truncate">
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

export default function Home() {
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
  const [isLiveTVView, setIsLiveTVView] = useState(true)
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
    "https://www.open-epg.com/files/philippines1.xml.gz",
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
      setIsNavTransparent(scrollY <= 50)
      if (scrollTimeout) clearTimeout(scrollTimeout)
      const timeout = setTimeout(() => {
        if (window.scrollY > 50) setIsNavTransparent(false) // Changed for flat header behavior
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
      setTimeout(() => setIsInitialLoading(false), 1500)
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
        className="group relative cursor-pointer snap-start shrink-0 animate-in fade-in duration-500"
        onClick={() => handleChannelSelect(channel)}
      >
        <div className="w-[180px] h-[100px] md:w-[260px] md:h-[146px] bg-[#1a1a1a] flex flex-col justify-end overflow-hidden border-2 border-transparent hover:border-[#0055ff] transition-colors duration-200">
          {/* Flat top left CH number indicator */}
          <div className="absolute top-0 left-0 z-20 bg-[#222] px-2 py-1 text-[10px] font-mono text-white tracking-widest border-b border-r border-[#333]">
            CH {channelNum}
          </div>

          {/* Centered Logo against Solid Background */}
          <div className="absolute inset-0 flex items-center justify-center z-0 p-8 pb-12 bg-[#0d0d0d]">
            {channel.logo ? (
              <img
                src={channel.logo}
                alt={channel.name}
                className="max-w-full max-h-full object-contain opacity-80 group-hover:opacity-100 transition-opacity"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
              />
            ) : (
              <div className="w-14 h-14 bg-[#222] flex items-center justify-center border border-[#333]">
                <span className="text-[#888] font-bold text-2xl uppercase">{channel.name.charAt(0)}</span>
              </div>
            )}
          </div>

          {/* Solid Bottom Info Bar */}
          <div className="relative z-20 px-3 py-2 bg-[#141414] border-t border-[#333] w-full">
            <h3 className="text-white font-medium text-xs md:text-sm truncate uppercase tracking-wide">{channel.name}</h3>
            <p className="text-[#00aa88] text-[10px] md:text-xs truncate font-medium uppercase mt-0.5">{currentProg === "No information available" ? channel.category : currentProg}</p>
          </div>

          {showFavorite && (
            <button
              onClick={(e) => { e.stopPropagation(); toggleFavorite(channel.id) }}
              className="absolute top-2 right-2 z-30 p-1.5 bg-[#222] hover:bg-[#333] transition-colors opacity-0 group-hover:opacity-100 border border-[#444]"
            >
              <Star className={`w-3.5 h-3.5 ${isChannelFavorite ? "fill-yellow-400 text-yellow-400" : "text-white"}`} />
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
      <div key={title} className="group relative pt-4 pb-4 border-b border-[#1a1a1a]">
        <div className="flex items-center gap-2 mb-3 px-4 md:px-12">
          {icon && <span className="text-[#888]">{icon}</span>}
          <h2 className="text-sm md:text-base font-bold text-[#ccc] uppercase tracking-widest">{title}</h2>
        </div>
        <div className="relative group-hover:z-10">
          <div id={rowId} className="flex gap-4 overflow-x-auto px-4 md:px-12 pb-4 snap-x scrollbar-hide scroll-smooth">
            {channels.map((channel) => createChannelTile(channel, showFavorite))}
          </div>
          <button
            onClick={() => scrollChannelRow("left", rowId)}
            className="hidden md:flex absolute left-0 top-0 bottom-6 w-12 z-20 bg-[#0f0f0f] opacity-0 group-hover:opacity-90 transition-opacity items-center justify-center border-r border-[#333]"
          >
            <ChevronLeft className="h-6 w-6 text-white" />
          </button>
          <button
            onClick={() => scrollChannelRow("right", rowId)}
            className="hidden md:flex absolute right-0 top-0 bottom-6 w-12 z-20 bg-[#0f0f0f] opacity-0 group-hover:opacity-90 transition-opacity items-center justify-center border-l border-[#333]"
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
      <div className="fixed inset-0 bg-[#111] flex flex-col items-center justify-center z-50">
        <div className="flex flex-col items-center gap-6 animate-in fade-in duration-1000">
          <img src="/images/light-logo.png" alt="Light TV" className="h-12 w-auto" />
          <div className="w-8 h-8 border-4 border-[#333] border-t-blue-600 rounded-full animate-spin"></div>
          <p className="text-[#888] font-mono text-xs uppercase tracking-widest mt-4">Initializing System...</p>
        </div>
      </div>
    )
  }

  if (isCheckingAccess) {
    return (
      <div className="min-h-screen bg-[#111] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 animate-in fade-in duration-500">
          <div className="w-8 h-8 border-4 border-[#333] border-t-blue-600 rounded-full animate-spin"></div>
          <div className="text-[#888] text-xs font-mono tracking-widest uppercase">Verifying Network</div>
        </div>
      </div>
    )
  }

  if (selectedChannel && viewMode === 'grid') {
    return (
      <div className="fixed inset-0 z-50 bg-[#000]">
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

  // LIST MODE LAYOUT (Set-top Box styling)
  if (viewMode === 'list') {
    return (
      <div className="h-screen bg-[#0d0d0d] text-white flex flex-col overflow-hidden selection:bg-[#333] font-sans animate-in fade-in duration-500">
        <SupportPopup isOpen={showSupportModal} onClose={() => setShowSupportModal(false)} isFirstTime={isFirstTimeUser} />
        {showKeyboardShortcuts && (
          <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[100] p-4 animate-in fade-in duration-300" onClick={() => setShowKeyboardShortcuts(false)}>
            <div className="bg-[#1a1a1a] border border-[#333] rounded-sm max-w-sm w-full p-6" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-3">
                  <Keyboard className="w-5 h-5 text-blue-500" />
                  <h2 className="text-sm font-bold text-white tracking-widest uppercase">Remote Shortcuts</h2>
                </div>
                <button onClick={() => setShowKeyboardShortcuts(false)} className="text-[#888] hover:text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-0 text-sm">
                {[['Play/Pause', 'Space'], ['Mute', 'M'], ['Fullscreen', 'F'], ['PiP', 'P'], ['Vol Up', '↑'], ['Vol Down', '↓'], ['Seek Fwd', '→'], ['Seek Back', '←'], ['Direct Channel', '0-9']].map(([label, key]) => (
                  <div key={label} className="flex justify-between items-center py-3 border-b border-[#222] last:border-0">
                    <span className="text-[#ccc] font-medium">{label}</span>
                    <kbd className="px-3 py-1 bg-[#222] border border-[#444] rounded-sm text-white font-mono text-xs font-bold tracking-widest">{key}</kbd>
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

        {/* FLAT TOP BAR */}
        <header className="fixed top-0 left-0 right-0 z-50 bg-[#141414] border-b border-[#222] h-14 flex items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <button className="md:hidden p-1 text-[#888] hover:text-white transition-colors" onClick={() => setIsMobileMenuOpen(true)}>
                <Menu className="w-5 h-5" />
              </button>
              <img src="/images/light-logo.png" alt="Light TV" className="h-6 md:h-8 w-auto" />
            </div>
            <nav className="hidden md:flex items-center gap-1 border-l border-[#333] pl-6">
              <button onClick={() => { handleHomeNavigation(); setViewMode('grid'); }} className="px-4 py-2 text-xs font-bold tracking-wider uppercase text-[#888] hover:text-white hover:bg-[#222] rounded-sm transition-colors">HOME</button>
              <button onClick={() => { handleLiveTVNavigation(); setViewMode('grid'); }} className="px-4 py-2 text-xs font-bold tracking-wider uppercase text-[#888] hover:text-white hover:bg-[#222] rounded-sm transition-colors">LIVE TV</button>
              <button onClick={() => setShowChannelGuide(true)} className="px-4 py-2 text-xs font-bold tracking-wider uppercase text-[#888] hover:text-white hover:bg-[#222] rounded-sm transition-colors">TV GUIDE</button>
              <button onClick={() => setShowChannelRequestModal(true)} className="px-4 py-2 text-xs font-bold tracking-wider uppercase text-[#888] hover:text-white hover:bg-[#222] rounded-sm transition-colors">REQUEST</button>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-[#222] border border-[#333] rounded-sm mr-2">
              <Clock className="w-3.5 h-3.5 text-blue-500" />
              <span className="text-xs font-mono font-bold text-white tracking-widest">{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <button onClick={() => setShowQuickSwitch(true)} className="w-8 h-8 flex items-center justify-center rounded-sm hover:bg-[#222] text-[#888] hover:text-white transition-colors"><Zap className="w-4 h-4" /></button>
            <button onClick={() => setShowChannelStats(true)} className="hidden sm:flex w-8 h-8 items-center justify-center rounded-sm hover:bg-[#222] text-[#888] hover:text-white transition-colors"><TrendingUp className="w-4 h-4" /></button>
            <button onClick={() => setViewMode('grid')} className="flex items-center gap-2 px-3 py-1.5 bg-[#222] hover:bg-[#333] rounded-sm transition-colors border border-[#333] text-white">
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="text-[10px] font-bold tracking-widest hidden sm:block uppercase">Grid View</span>
            </button>
          </div>
        </header>

        {isMobileMenuOpen && (
          <div className="md:hidden fixed inset-0 z-[100] bg-[#111] flex flex-col pt-6 px-6 animate-in fade-in duration-200">
            <div className="flex justify-end mb-6">
              <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 bg-[#222] rounded-sm text-[#888] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex flex-col gap-2">
              <button onClick={() => { handleHomeNavigation(); setIsMobileMenuOpen(false); }} className="text-xl font-bold text-left text-white tracking-widest uppercase bg-[#1a1a1a] p-4 rounded-sm border border-[#333]">Home</button>
              <button onClick={() => { handleLiveTVNavigation(); setIsMobileMenuOpen(false); }} className="text-xl font-bold text-left text-white tracking-widest uppercase bg-[#1a1a1a] p-4 rounded-sm border border-[#333]">Live TV</button>
              <button onClick={() => { setShowChannelGuide(true); setIsMobileMenuOpen(false); }} className="text-xl font-bold text-left text-white tracking-widest uppercase bg-[#1a1a1a] p-4 rounded-sm border border-[#333]">TV Guide</button>
              <button onClick={() => { setShowChannelRequestModal(true); setIsMobileMenuOpen(false); }} className="text-xl font-bold text-left text-white tracking-widest uppercase bg-[#1a1a1a] p-4 rounded-sm border border-[#333]">Request Channel</button>
              <button onClick={() => { setShowRatingModal(true); setIsMobileMenuOpen(false); }} className="text-xl font-bold text-left text-white tracking-widest uppercase bg-[#1a1a1a] p-4 rounded-sm border border-[#333]">Rate Us</button>
            </nav>
          </div>
        )}

        <div className="flex flex-col md:flex-row flex-1 pt-14 min-h-0 bg-[#0d0d0d]">
          {/* MOBILE LIST LAYOUT */}
          <div className="flex flex-col flex-1 min-h-0 md:hidden">
            <div className="shrink-0 w-full bg-black relative" style={{ aspectRatio: '16/9' }}>
              {selectedChannel && isMobile ? (
                <VideoPlayer
                  channel={selectedChannel} user={null} onClose={() => { setSelectedChannel(null); setHeaderTitle("Live TV") }} onChannelChange={() => { }}
                  onBitrateModeChange={handleBitrateModeChange} restoreUIHidden={restoreUIHidden} availableChannels={allChannels} videoRef={videoRef} isMuted={isMuted} showModernButton={showModernButton} showChannelInfo={showChannelInfo} showChannelList={showChannelList} getCurrentChannelInfo={getCurrentChannelInfo} getCurrentSelectedChannelInfo={getCurrentSelectedChannelInfo} onModernButtonHover={handleModernButtonHover} onChannelInfoHover={handleChannelInfoHover} onChannelListHover={handleChannelListHover} isMobile={isMobile} isPortrait={isPortrait} epgData={epgData} currentPrograms={currentPrograms} onPositionUpdate={handleVideoPositionUpdate} getSavedPosition={getSavedVideoPosition} embedded={true}
                />
              ) : !selectedChannel ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#141414] border-b border-[#222]">
                  <Tv className="w-8 h-8 text-[#444] mb-3" />
                  <h1 className="text-sm font-bold text-white uppercase tracking-wider">Tuner Ready</h1>
                  <p className="text-xs text-[#888] mt-1">Select channel below</p>
                </div>
              ) : null}
            </div>

            <div className="shrink-0 bg-[#1a1a1a] border-b border-[#222] p-3">
              <div className="relative mb-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#888]" />
                <input
                  type="text" placeholder="Search by name or number..." value={listSearchQuery} onChange={(e) => setListSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-[#111] border border-[#333] rounded-sm text-white placeholder:text-[#666] focus:outline-none focus:border-blue-600 text-sm transition-colors"
                />
              </div>
              <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                {listCategories.map((cat) => (
                  <button
                    key={cat} onClick={() => setListSelectedCategory(cat)}
                    className={`whitespace-nowrap shrink-0 px-3 py-1.5 rounded-sm text-[10px] font-bold uppercase tracking-wider transition-colors ${listSelectedCategory === cat ? "bg-white text-black" : "bg-[#222] text-[#aaa] hover:bg-[#333] border border-[#333]"}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto bg-[#0d0d0d]">
              {listFilteredChannels.map((channel) => {
                const isActive = selectedChannel?.id === channel.id
                const currentProg = getCurrentChannelInfo(channel).current

                return (
                  <button
                    key={channel.id} onClick={() => { if (selectedChannel?.id !== channel.id) { setSelectedChannel(channel); setHeaderTitle(channel.name); addToRecentlyWatched(channel.id); setRecentlyWatched(getRecentlyWatched()) } }}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left border-b border-[#1a1a1a] transition-colors ${isActive ? "bg-[#142036] border-l-4 border-l-blue-600" : "bg-[#111] hover:bg-[#1a1a1a] border-l-4 border-l-transparent"}`}
                  >
                    <span className="text-[10px] font-mono text-[#666] w-6 text-right shrink-0">{String(channel.channelNumber ?? 0).padStart(3, '0')}</span>
                    <div className="w-10 h-10 bg-[#000] border border-[#222] flex items-center justify-center p-1 rounded-sm shrink-0">
                      <img src={channel.logo || "/placeholder.svg"} alt="" className="w-full h-full object-contain" onError={(e) => { e.currentTarget.style.display = "none" }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`text-sm font-bold uppercase truncate tracking-wide ${isActive ? "text-white" : "text-[#ccc]"}`}>{channel.name}</p>
                        {channel.isHD && <span className="text-[8px] px-1 py-0.5 bg-[#222] text-[#aaa] rounded-sm font-bold uppercase tracking-widest border border-[#333]">HD</span>}
                      </div>
                      <p className={`text-xs truncate font-medium mt-0.5 uppercase ${isActive ? 'text-blue-400' : 'text-[#00aa88]'}`}>{currentProg === "No information available" ? channel.category : currentProg}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* DESKTOP LIST LAYOUT */}
          <aside className="hidden md:flex w-[320px] bg-[#111] border-r border-[#222] flex-col shrink-0 overflow-hidden z-10">
            <div className="p-4 border-b border-[#222] bg-[#1a1a1a]">
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#888]" />
                <input
                  type="text" placeholder="Find channel or number..." value={listSearchQuery} onChange={(e) => setListSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-[#000] border border-[#333] rounded-sm text-white placeholder:text-[#555] focus:outline-none focus:border-blue-600 text-sm transition-colors"
                />
              </div>
              <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                {listCategories.map((cat) => (
                  <button
                    key={cat} onClick={() => setListSelectedCategory(cat)}
                    className={`whitespace-nowrap shrink-0 px-3 py-1 rounded-sm text-[10px] font-bold tracking-wider uppercase transition-colors ${listSelectedCategory === cat ? "bg-blue-600 text-white" : "bg-[#222] text-[#888] hover:bg-[#333] border border-[#333]"}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto bg-[#0d0d0d]">
              {listFilteredChannels.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
                  <Tv className="w-10 h-10 text-[#333] mb-3" />
                  <p className="text-sm font-medium text-[#666] uppercase tracking-wider">No matching channels</p>
                </div>
              ) : (
                listFilteredChannels.map((channel) => {
                  const isActive = selectedChannel?.id === channel.id
                  const currentProg = getCurrentChannelInfo(channel).current

                  return (
                    <button
                      key={channel.id} onClick={() => { if (selectedChannel?.id !== channel.id) { setSelectedChannel(channel); setHeaderTitle(channel.name); addToRecentlyWatched(channel.id); setRecentlyWatched(getRecentlyWatched()) } }}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left border-b border-[#1a1a1a] transition-colors group ${isActive ? "bg-[#142036] border-l-4 border-l-blue-600" : "bg-[#111] hover:bg-[#1a1a1a] border-l-4 border-l-transparent"}`}
                    >
                      <span className="text-[11px] font-mono font-bold text-[#666] w-8 text-right shrink-0 tracking-widest tabular-nums">{String(channel.channelNumber ?? 0).padStart(3, '0')}</span>
                      <div className={`w-10 h-10 bg-[#000] border flex items-center justify-center p-1 rounded-sm shrink-0 transition-colors ${isActive ? 'border-blue-500/50' : 'border-[#333]'}`}>
                        <img src={channel.logo || "/placeholder.svg"} alt="" className="w-full h-full object-contain" onError={(e) => { e.currentTarget.style.display = "none" }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className={`text-sm font-bold uppercase truncate tracking-wide ${isActive ? "text-white" : "text-[#aaa] group-hover:text-[#fff]"}`}>{channel.name}</p>
                          {channel.isHD && <span className="text-[8px] px-1 py-0.5 bg-[#222] text-blue-500 border border-[#333] rounded-sm font-bold uppercase tracking-widest">HD</span>}
                        </div>
                        <p className={`text-[10px] truncate font-medium uppercase ${isActive ? 'text-blue-400' : 'text-[#00aa88]'}`}>{currentProg === "No information available" ? channel.category : currentProg}</p>
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          </aside>

          {/* Desktop Video Area */}
          <div className="hidden md:flex flex-1 flex-col bg-black min-h-0 relative">
            {selectedChannel && !isMobile ? (
              <VideoPlayer
                channel={selectedChannel} user={null} onClose={() => { setSelectedChannel(null); setHeaderTitle("Live TV") }} onChannelChange={() => { }}
                onBitrateModeChange={handleBitrateModeChange} restoreUIHidden={restoreUIHidden} availableChannels={allChannels} videoRef={videoRef} isMuted={isMuted} showModernButton={showModernButton} showChannelInfo={showChannelInfo} showChannelList={showChannelList} getCurrentChannelInfo={getCurrentChannelInfo} getCurrentSelectedChannelInfo={getCurrentSelectedChannelInfo} onModernButtonHover={handleModernButtonHover} onChannelInfoHover={handleChannelInfoHover} onChannelListHover={handleChannelListHover} isMobile={isMobile} isPortrait={isPortrait} epgData={epgData} currentPrograms={currentPrograms} onPositionUpdate={handleVideoPositionUpdate} getSavedPosition={getSavedVideoPosition} embedded={true}
              />
            ) : !selectedChannel ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#141414] z-0">
                <div className="z-10 flex flex-col items-center text-center max-w-lg px-8 border border-[#222] bg-[#1a1a1a] p-12 rounded-sm">
                  <Tv className="w-12 h-12 text-[#444] mb-6" />
                  <h1 className="text-2xl font-bold text-white uppercase tracking-wider mb-2">Tuner Ready</h1>
                  <p className="text-sm text-[#888] mb-8 uppercase tracking-wide">Select a channel from the guide to broadcast.</p>
                  <div className="grid grid-cols-2 gap-4 w-full text-left">
                    <div className="bg-[#111] border border-[#333] rounded-sm p-4">
                      <Keyboard className="w-4 h-4 text-blue-500 mb-2" />
                      <p className="text-[10px] text-[#aaa] font-medium uppercase tracking-wide">Numpad: Direct Tune</p>
                    </div>
                    <div className="bg-[#111] border border-[#333] rounded-sm p-4">
                      <Search className="w-4 h-4 text-blue-500 mb-2" />
                      <p className="text-[10px] text-[#aaa] font-medium uppercase tracking-wide">Search to locate channel</p>
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
            <div className="fixed top-10 right-10 z-[200] pointer-events-none select-none animate-in fade-in zoom-in duration-200">
              <div className="flex flex-col items-end gap-1 px-6 py-4 bg-[#141414] border-2 border-blue-600 rounded-sm">
                <span className="font-mono font-bold text-white leading-none text-4xl">{channelNumberInput.padStart(3, '0')}</span>
                <span className="text-blue-500 font-bold text-xs uppercase tracking-widest">{match ? match.name : 'NO SIGNAL'}</span>
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

  // GRID MODE LAYOUT (Set-top Box / Smart TV style)
  return (
    <div className="min-h-screen bg-[#0d0d0d] text-white selection:bg-[#333] font-sans animate-in fade-in duration-500">
      <SupportPopup isOpen={showSupportModal} onClose={() => setShowSupportModal(false)} isFirstTime={isFirstTimeUser} />

      {showKeyboardShortcuts && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[100] p-4 animate-in fade-in duration-300" onClick={() => setShowKeyboardShortcuts(false)}>
          <div className="bg-[#1a1a1a] border border-[#333] rounded-sm max-w-sm w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-3">
                <Keyboard className="w-5 h-5 text-blue-500" />
                <h2 className="text-sm font-bold text-white tracking-widest uppercase">Remote Shortcuts</h2>
              </div>
              <button onClick={() => setShowKeyboardShortcuts(false)} className="text-[#888] hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-0 text-sm">
              {[['Play/Pause', 'Space'], ['Mute', 'M'], ['Fullscreen', 'F'], ['Picture-in-Picture', 'P'], ['Volume Up', '↑'], ['Volume Down', '↓'], ['Seek Forward', '→'], ['Seek Backward', '←']].map(([label, key]) => (
                <div key={label} className="flex justify-between items-center py-3 border-b border-[#222] last:border-0">
                  <span className="text-[#ccc] font-medium">{label}</span>
                  <kbd className="px-3 py-1 bg-[#222] border border-[#444] rounded-sm text-white font-mono text-xs font-bold tracking-widest">{key}</kbd>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      <IOSUnsupportedModal />
      <ReportModal isOpen={showReportModal} onClose={() => setShowReportModal(false)} />
      <AnnouncementsSystem />

      {/* SMART TV TOP BAR FOR GRID */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#141414] border-b border-[#222] py-3 px-4 md:px-8 h-16 flex items-center justify-between transition-colors">
        <div className="flex items-center gap-4 md:gap-8">
          <button className="md:hidden p-1 text-[#888] hover:text-white transition-colors" onClick={() => setIsMobileMenuOpen(true)}>
            <Menu className="w-6 h-6" />
          </button>
          <img src="/images/light-logo.png" alt="Light TV" className="h-8 md:h-10 w-auto" />
          <nav className="hidden md:flex items-center gap-1 border-l border-[#333] pl-6">
            <button
              onClick={handleHomeNavigation}
              className={`px-4 py-2 rounded-sm text-xs font-bold tracking-wider uppercase transition-colors ${!isLiveTVView ? "bg-blue-600 text-white" : "text-[#888] hover:text-white hover:bg-[#222]"}`}
            >
              Home
            </button>
            <button
              onClick={handleLiveTVNavigation}
              className={`px-4 py-2 rounded-sm text-xs font-bold tracking-wider uppercase transition-colors ${isLiveTVView ? "bg-blue-600 text-white" : "text-[#888] hover:text-white hover:bg-[#222]"}`}
            >
              Live TV
            </button>
            <button
              onClick={() => setShowChannelGuide(true)}
              className="px-4 py-2 rounded-sm text-xs font-bold tracking-wider uppercase text-[#888] hover:text-white hover:bg-[#222] transition-colors"
            >
              Guide
            </button>
            <button
              onClick={() => setShowChannelRequestModal(true)}
              className="px-4 py-2 rounded-sm text-xs font-bold tracking-wider uppercase text-[#888] hover:text-white hover:bg-[#222] transition-colors"
            >
              Request
            </button>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden lg:flex relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#888]" />
            <input
              type="text"
              placeholder="Search content..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-9 pr-3 py-1.5 bg-[#000] border border-[#333] rounded-sm focus:outline-none focus:border-blue-600 text-sm w-60 text-white placeholder:text-[#555] transition-colors"
            />
          </div>
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-[#222] border border-[#333] rounded-sm">
            <span className="text-xs font-mono font-bold text-white tracking-widest">{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>

          <button onClick={() => setShowQuickSwitch(true)} className="w-8 h-8 flex items-center justify-center bg-[#222] hover:bg-[#333] border border-[#333] rounded-sm transition-colors text-[#888] hover:text-white"><Zap className="w-4 h-4" /></button>
          <button onClick={() => setViewMode('list')} className="flex items-center gap-2 px-3 py-1.5 bg-[#222] hover:bg-[#333] border border-[#333] rounded-sm transition-colors text-white">
            <List className="w-3.5 h-3.5" />
            <span className="text-[10px] font-bold tracking-widest hidden sm:block uppercase">List UI</span>
          </button>
          <button onClick={() => setShowKeyboardShortcuts(true)} className="hidden md:flex w-8 h-8 items-center justify-center bg-[#222] hover:bg-[#333] border border-[#333] rounded-sm transition-colors text-[#888] hover:text-white"><Keyboard className="w-4 h-4" /></button>
        </div>
      </header>

      {/* Mobile search overlay */}
      {isMobileSearchOpen && (
        <div className="md:hidden fixed top-16 left-0 right-0 z-40 bg-[#1a1a1a] border-b border-[#333] px-4 py-3 animate-in fade-in duration-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#888]" />
            <input
              type="text"
              placeholder="Search channels..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              autoFocus
              className="w-full pl-9 pr-3 py-2 bg-[#000] border border-[#333] rounded-sm text-white focus:outline-none focus:border-blue-600 text-sm"
            />
          </div>
        </div>
      )}

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-[100] bg-[#111] flex flex-col pt-6 px-6 animate-in fade-in duration-200">
          <div className="flex justify-end mb-6">
            <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 bg-[#222] rounded-sm text-[#888] hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
          <nav className="flex flex-col gap-2">
            <button onClick={() => { handleHomeNavigation(); setIsMobileMenuOpen(false); }} className="text-xl font-bold text-left text-white tracking-widest uppercase bg-[#1a1a1a] p-4 rounded-sm border border-[#333]">Home</button>
            <button onClick={() => { handleLiveTVNavigation(); setIsMobileMenuOpen(false); }} className="text-xl font-bold text-left text-white tracking-widest uppercase bg-[#1a1a1a] p-4 rounded-sm border border-[#333]">Live TV</button>
            <button onClick={() => { setShowChannelGuide(true); setIsMobileMenuOpen(false); }} className="text-xl font-bold text-left text-white tracking-widest uppercase bg-[#1a1a1a] p-4 rounded-sm border border-[#333]">TV Guide</button>
            <button onClick={() => { setShowChannelRequestModal(true); setIsMobileMenuOpen(false); }} className="text-xl font-bold text-left text-white tracking-widest uppercase bg-[#1a1a1a] p-4 rounded-sm border border-[#333]">Request Channel</button>
            <button onClick={() => { setShowRatingModal(true); setIsMobileMenuOpen(false); }} className="text-xl font-bold text-left text-white tracking-widest uppercase bg-[#1a1a1a] p-4 rounded-sm border border-[#333]">Rate Us</button>
          </nav>
        </div>
      )}

      <main className={`pt-20 md:pt-24 pb-20 w-full relative z-10 ${isMobileSearchOpen ? 'pt-32' : ''}`}>

        {!isLiveTVView ? (
          <div className="w-full animate-in fade-in duration-500">
            {/* Hero / Welcome */}
            <div className="px-6 md:px-12 pt-6 pb-10 border-b border-[#1a1a1a]">
              <h1 className="text-3xl md:text-5xl font-black text-white uppercase tracking-wider mb-2">Welcome To <br /><span className="text-blue-500">Light TV</span></h1>
              <p className="text-sm md:text-base text-[#888] max-w-xl mb-6 uppercase tracking-widest">Select a channel below to initiate broadcast.</p>
              <div className="flex gap-4">
                <Button onClick={handleLiveTVNavigation} className="bg-blue-600 text-white hover:bg-blue-700 px-8 py-6 rounded-sm text-sm font-bold tracking-widest uppercase transition-colors">
                  Start Watching
                </Button>
                <Button onClick={() => setShowChannelGuide(true)} className="bg-[#222] text-white hover:bg-[#333] border border-[#444] px-8 py-6 rounded-sm text-sm font-bold tracking-widest uppercase transition-colors">
                  TV Guide
                </Button>
              </div>
            </div>

            {/* Smart TV Rows */}
            <div className="space-y-2 md:space-y-4 pt-4">
              {favorites.length > 0 && createRow("Favorites", allChannels.filter(ch => favorites.includes(ch.id)), <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />, true)}
              {recentlyWatched.length > 0 && createRow("Jump Back In", allChannels.filter(ch => recentlyWatched.includes(ch.id)).sort((a, b) => recentlyWatched.indexOf(a.id) - recentlyWatched.indexOf(b.id)), <Clock className="w-5 h-5" />, true)}

              {Object.entries(categorizeChannels()).map(([categoryName, categoryChannels], index) => {
                if (categoryChannels.length === 0) return null
                return (
                  <div key={categoryName} className="animate-in fade-in duration-500" style={{ animationDelay: `${index * 0.1}s` }}>
                    {createRow(categoryName, categoryChannels, null, true)}
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          <div className="w-full animate-in fade-in duration-500">
            <div className="px-6 md:px-12 py-4 mb-4 border-b border-[#1a1a1a]">
              <h1 className="text-xl md:text-2xl font-bold text-[#ccc] uppercase tracking-widest mb-4">
                {searchQuery ? "Search Results" : "Live Channels"}
              </h1>

              {/* Flat Category Selection */}
              {!searchQuery && (
                <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 snap-x">
                  {categories.map((category) => (
                    <button
                      key={category}
                      onClick={() => setSelectedCategory(category)}
                      className={`whitespace-nowrap shrink-0 snap-start px-4 py-2 rounded-sm text-[10px] font-bold tracking-widest uppercase transition-colors ${selectedCategory === category
                        ? "bg-blue-600 text-white"
                        : "bg-[#1a1a1a] text-[#888] hover:bg-[#222] hover:text-white border border-[#333]"
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
              <div className="px-6 md:px-12 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                {filteredChannels.map((channel, index) => (
                  <div
                    key={channel.id}
                    onClick={() => handleChannelSelectForLiveTV(channel)}
                    className="group relative cursor-pointer animate-in fade-in duration-500 aspect-video bg-[#1a1a1a] rounded-sm border-2 border-transparent hover:border-blue-600 transition-colors overflow-hidden"
                    style={{ animationDelay: `${(index % 12) * 0.05}s` }}
                  >
                    <div className="absolute top-0 left-0 z-20 bg-[#222] px-2 py-1 text-[10px] font-mono font-bold text-white tracking-widest border-b border-r border-[#333]">
                      CH {String(channel.channelNumber ?? 0).padStart(3, '0')}
                    </div>

                    <div className="absolute inset-0 flex items-center justify-center z-0 p-8 pb-12 bg-[#0a0a0a]">
                      {channel.logo ? (
                        <img src={channel.logo} alt={channel.name} className="max-w-full max-h-full object-contain opacity-70 group-hover:opacity-100 transition-opacity" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                      ) : (
                        <div className="w-12 h-12 bg-[#222] flex items-center justify-center border border-[#333]"><span className="text-[#888] font-bold text-xl uppercase">{channel.name.charAt(0)}</span></div>
                      )}
                    </div>

                    <div className="absolute bottom-0 left-0 right-0 p-3 bg-[#111] border-t border-[#222] z-20">
                      <h3 className="text-white font-bold text-xs md:text-sm truncate uppercase tracking-wide">{channel.name}</h3>
                      <p className="text-[#00aa88] text-[10px] truncate mt-0.5 font-medium uppercase">{getCurrentChannelInfo(channel).current === "No information available" ? channel.category : getCurrentChannelInfo(channel).current}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-20">
                <Tv className="w-12 h-12 text-[#333] mx-auto mb-4" />
                <p className="text-sm text-[#666] font-medium uppercase tracking-widest">No matching channels.</p>
              </div>
            )}
          </div>
        )}
      </main>

      <ChannelGuideModal isOpen={showChannelGuide} onClose={() => setShowChannelGuide(false)} channelGuideSearch={channelGuideSearch} setChannelGuideSearch={setChannelGuideSearch} epgData={epgData} currentPrograms={currentPrograms} />
      <ChannelRequestModal isOpen={showChannelRequestModal} onClose={() => setShowChannelRequestModal(false)} />
      <RatingModal isOpen={showRatingModal} onClose={() => setShowRatingModal(false)} />

      {/* OSD Channel Number overlay */}
      {channelNumberInput && (() => {
        const num = parseInt(channelNumberInput, 10)
        const match = allChannels.find(c => c.channelNumber === num)
        return (
          <div className="fixed top-16 right-12 z-[200] pointer-events-none select-none animate-in fade-in zoom-in duration-200">
            <div className="flex flex-col items-end gap-1 px-6 py-4 bg-[#141414] border-2 border-blue-600 rounded-sm">
              <span className="font-mono font-bold text-white leading-none text-4xl">{channelNumberInput.padStart(3, '0')}</span>
              <span className="text-blue-500 font-bold text-xs uppercase tracking-widest">{match ? match.name : 'NO SIGNAL'}</span>
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