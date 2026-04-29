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

  // Ensure allChannels is imported or passed if needed, but since it's global let's use staticChannels for fallback if needed. 
  // We'll rely on the staticChannels here since allChannels state isn't passed down.
  const guideFilteredChannels = staticChannels.filter(
    (channel) =>
      channel.name.toLowerCase().includes(channelGuideSearch.toLowerCase()) ||
      channel.category.toLowerCase().includes(channelGuideSearch.toLowerCase()),
  )

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-xl flex items-center justify-center z-[100] p-4 sm:p-8 animate-in fade-in duration-300">
      <div className="bg-[#0f0f13] rounded-2xl w-full max-w-5xl h-full max-h-[85vh] flex flex-col border border-white/10 shadow-2xl overflow-hidden">
        {/* TV Guide Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-6 border-b border-white/10 bg-[#14141a]">
          <div className="flex items-center gap-4 mb-4 sm:mb-0">
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center border border-white/20">
              <Tv className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-wide">TV Guide</h2>
              <p className="text-xs text-white/50 tracking-widest uppercase mt-1">Live Programming</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/40 w-4 h-4" />
              <input
                type="text"
                placeholder="Search channels..."
                value={channelGuideSearch}
                onChange={(e) => setChannelGuideSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/30 text-sm transition-all"
              />
            </div>
            <button onClick={onClose} className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* TV Guide Content */}
        <div className="flex-1 overflow-y-auto p-2 sm:p-4 bg-[#0a0a0c]">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {guideFilteredChannels.length === 0 ? (
              <div className="col-span-full text-center text-white/40 py-20 flex flex-col items-center">
                <Search className="w-12 h-12 mb-4 opacity-20" />
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
                    className="group bg-[#14141a] border border-white/5 rounded-xl p-4 hover:bg-[#1f1f26] hover:border-white/20 transition-all cursor-pointer"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-16 h-16 bg-black/40 rounded-lg flex items-center justify-center p-2 border border-white/5">
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
                          <h3 className="text-base font-bold text-white truncate">{channel.name}</h3>
                          <span className="text-[10px] text-white/60 bg-white/10 px-2 py-0.5 rounded font-medium tracking-wider">
                            CH {String(channel.channelNumber ?? 0).padStart(3, '0')}
                          </span>
                        </div>
                        <span className="inline-block text-[10px] text-blue-400 font-semibold tracking-wider uppercase mb-2">
                          {channel.category}
                        </span>
                        <div className="bg-black/40 rounded p-2 border border-white/5">
                          <p className="text-[11px] text-white/50 uppercase tracking-widest mb-0.5">Now Playing</p>
                          <p className="text-xs text-white/90 truncate font-medium">
                            {currentProg?.title || "Live Broadcast"}
                          </p>
                        </div>
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

  // Initialize favorites and recently watched
  useEffect(() => {
    setFavorites(getFavorites())
    setRecentlyWatched(getRecentlyWatched())
  }, [])

  // Save viewMode to localStorage
  useEffect(() => {
    localStorage.setItem('light-view-mode', viewMode)
  }, [viewMode])

  // Load channels from database and merge with static channels
  useEffect(() => {
    const loadDbChannels = async () => {
      try {
        const supabase = createClient()
        const { data: dbChannels, error } = await supabase
          .from("channels")
          .select("*")

        if (error) {
          console.error("[v0] Supabase query error:", error.message)
          return
        }

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
        console.error("[v0] Failed to load channels from database:", error)
      }
    }

    loadDbChannels()
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
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      if (/^[0-9]$/.test(e.key)) {
        setChannelNumberInput(prev => {
          const newInput = prev + e.key
          if (channelNumberTimeoutRef.current) {
            clearTimeout(channelNumberTimeoutRef.current)
          }
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
  }, [selectedChannel])

  useEffect(() => {
    const initializeUserData = async () => {
      const savedTheme = await getUserPreference("ultrafantsa_theme", "dark")
      const savedRecent = await getUserPreference("ultrafantsa_recent", [])
      const savedFavorites = await getUserPreference("ultrafantsa_favorites", [])

      // Smart TV styling is predominantly dark mode
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
    const channelNum = String(channel.channelNumber ?? 0).padStart(3, '0')
    const currentProg = getCurrentChannelInfo(channel).current

    return (
      <div
        key={channel.id}
        className="group relative cursor-pointer snap-start shrink-0 animate-scale-in"
        onClick={() => handleChannelSelect(channel)}
      >
        <div className="w-[180px] h-[100px] md:w-[260px] md:h-[146px] rounded-xl bg-[#14141a] flex flex-col justify-end overflow-hidden border border-white/5 hover:border-white/40 hover:ring-2 hover:ring-white transition-all duration-300 shadow-xl relative">
          {/* Subtle gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent z-10" />

          {/* Channel Number Badge */}
          <div className="absolute top-2 left-2 z-20 bg-black/60 px-2 py-0.5 rounded text-[10px] font-bold text-white tracking-widest backdrop-blur-sm border border-white/10">
            CH {channelNum}
          </div>

          {/* Centered Logo */}
          <div className="absolute inset-0 flex items-center justify-center z-0 p-8 pb-12">
            {channel.logo ? (
              <img
                src={channel.logo}
                alt={channel.name}
                className="max-w-full max-h-full object-contain opacity-80 group-hover:opacity-100 transition-opacity drop-shadow-2xl"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
              />
            ) : (
              <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center border border-white/20">
                <span className="text-white font-bold text-2xl">{channel.name.charAt(0)}</span>
              </div>
            )}
          </div>

          {/* Bottom Info Bar */}
          <div className="relative z-20 p-3 w-full">
            <h3 className="text-white font-medium text-sm md:text-base truncate drop-shadow-md">{channel.name}</h3>
            <p className="text-blue-400/90 text-xs truncate mt-0.5 font-medium">{currentProg === "No information available" ? channel.category : currentProg}</p>
          </div>

          {/* Favorite Button */}
          {showFavorite && (
            <button
              onClick={(e) => { e.stopPropagation(); toggleFavorite(channel.id) }}
              className="absolute top-2 right-2 z-30 p-1.5 bg-black/50 hover:bg-white/20 rounded-full transition-all duration-200 opacity-0 group-hover:opacity-100 border border-white/10 backdrop-blur-sm"
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
      <div key={title} className="group relative pt-2 pb-6">
        <div className="flex items-center gap-2 mb-4 px-4 md:px-12">
          {icon && <span className="text-white/60">{icon}</span>}
          <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">{title}</h2>
        </div>
        <div className="relative group-hover:z-10">
          <div id={rowId} className="flex gap-4 overflow-x-auto px-4 md:px-12 pb-4 pt-2 snap-x scrollbar-hide scroll-smooth">
            {channels.map((channel) => createChannelTile(channel, showFavorite))}
          </div>
          <button
            onClick={() => scrollChannelRow("left", rowId)}
            className="hidden md:flex absolute left-0 top-0 bottom-6 w-16 z-20 bg-gradient-to-r from-[#0a0a0a] via-[#0a0a0a]/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity items-center justify-start pl-2"
          >
            <ChevronLeft className="h-8 w-8 text-white hover:scale-125 transition-transform drop-shadow-xl" />
          </button>
          <button
            onClick={() => scrollChannelRow("right", rowId)}
            className="hidden md:flex absolute right-0 top-0 bottom-6 w-16 z-20 bg-gradient-to-l from-[#0a0a0a] via-[#0a0a0a]/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity items-center justify-end pr-2"
          >
            <ChevronRight className="h-8 w-8 text-white hover:scale-125 transition-transform drop-shadow-xl" />
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

    if (isLiveTVView && !searchTerm) {
      return selectedCategory === "All"
        ? allChannels
        : allChannels.filter((channel) => channel.category === selectedCategory)
    }

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

    return []
  }, [searchQuery, isLiveTVView, selectedCategory, allChannels])

  const categories = useMemo(() => {
    const channelsToUse = searchQuery || isLiveTVView ? filteredChannels : allChannels
    const categorySet = new Set(channelsToUse.map((channel) => channel.category))
    return ["All", ...Array.from(categorySet).sort()]
  }, [searchQuery, filteredChannels, isLiveTVView, allChannels])

  if (isInitialLoading) {
    return (
      <div className="fixed inset-0 bg-[#0a0a0a] flex flex-col items-center justify-center z-50">
        <div className="flex flex-col items-center gap-6">
          <img src="/images/light-logo.png" alt="Light TV" className="h-16 w-auto drop-shadow-2xl" />
          <div className="w-10 h-10 border-4 border-white/10 border-t-white rounded-full animate-spin"></div>
        </div>
      </div>
    )
  }

  if (isCheckingAccess) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-white/10 border-t-white rounded-full animate-spin"></div>
          <div className="text-white/50 text-sm tracking-widest uppercase">Verifying connection</div>
        </div>
      </div>
    )
  }

  if (selectedChannel && viewMode === 'grid') {
    return (
      <div className="fixed inset-0 z-50 bg-black">
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
    if (listSelectedCategory !== "All") {
      channels = channels.filter(ch => ch.category === listSelectedCategory)
    }
    if (term) {
      const numericSearch = parseInt(term, 10)
      if (!isNaN(numericSearch) && numericSearch > 0) {
        channels = channels.filter(ch => {
          const num = ch.channelNumber ?? 0
          return num.toString().includes(term) ||
            num.toString().padStart(3, '0').includes(term)
        })
      } else {
        channels = channels.filter(ch =>
          ch.name.toLowerCase().includes(term) ||
          ch.category.toLowerCase().includes(term)
        )
      }
    }
    return channels
  })()

  const listCategories = ["All", ...Array.from(new Set(allChannels.map(ch => ch.category))).sort()]

  // LIST MODE LAYOUT (Cable TV / Set-top box style)
  if (viewMode === 'list') {
    return (
      <div className="h-screen bg-[#050505] text-white flex flex-col overflow-hidden selection:bg-white/10 font-sans">
        <SupportPopup isOpen={showSupportModal} onClose={() => setShowSupportModal(false)} isFirstTime={isFirstTimeUser} />
        {showKeyboardShortcuts && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[100] p-4" onClick={() => setShowKeyboardShortcuts(false)}>
            <div className="bg-[#14141a] border border-white/10 rounded-2xl max-w-sm w-full p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-3">
                  <Keyboard className="w-5 h-5 text-blue-400" />
                  <h2 className="text-sm font-bold text-white tracking-widest uppercase">Remote Shortcuts</h2>
                </div>
                <button onClick={() => setShowKeyboardShortcuts(false)} className="text-white/40 hover:text-white transition-colors duration-300">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-1.5">
                {[['Play/Pause', 'Space'], ['Mute', 'M'], ['Fullscreen', 'F'], ['PiP', 'P'], ['Vol Up', '↑'], ['Vol Down', '↓'], ['Seek Fwd', '→'], ['Seek Back', '←'], ['Direct Channel', '0-9']].map(([label, key]) => (
                  <div key={label} className="flex justify-between items-center py-2.5 border-b border-white/5 last:border-0">
                    <span className="text-white/70 text-sm font-medium">{label}</span>
                    <kbd className="px-3 py-1 bg-white/10 border border-white/10 rounded-md text-white font-mono text-xs font-bold tracking-widest">{key}</kbd>
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

        {/* SMART TV TOP BAR */}
        <header className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0a]/90 backdrop-blur-2xl border-b border-white/5 h-16 flex items-center justify-between px-4 md:px-8">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <button className="md:hidden p-1 text-white/70 hover:text-white" onClick={() => setIsMobileMenuOpen(true)}>
                <Menu className="w-6 h-6" />
              </button>
              <img src="/images/light-logo.png" alt="Light TV" className="h-8 md:h-10 w-auto opacity-90" />
            </div>
            <nav className="hidden md:flex items-center gap-2 border-l border-white/10 pl-6">
              <button
                onClick={() => { handleHomeNavigation(); setViewMode('grid'); }}
                className="px-4 py-2 rounded-full text-sm font-bold tracking-wide transition-all duration-300 text-white/50 hover:text-white hover:bg-white/10"
              >
                HOME
              </button>
              <button
                onClick={() => { handleLiveTVNavigation(); setViewMode('grid'); }}
                className="px-4 py-2 rounded-full text-sm font-bold tracking-wide transition-all duration-300 text-white/50 hover:text-white hover:bg-white/10"
              >
                LIVE TV
              </button>
              <button
                onClick={() => setShowChannelGuide(true)}
                className="px-4 py-2 rounded-full text-sm font-bold tracking-wide transition-all duration-300 text-white/50 hover:text-white hover:bg-white/10"
              >
                TV GUIDE
              </button>
              <button
                onClick={() => setShowChannelRequestModal(true)}
                className="px-4 py-2 rounded-full text-sm font-bold tracking-wide transition-all duration-300 text-white/50 hover:text-white hover:bg-white/10"
              >
                REQUEST
              </button>
              <button
                onClick={() => setShowRatingModal(true)}
                className="px-4 py-2 rounded-full text-sm font-bold tracking-wide transition-all duration-300 text-white/50 hover:text-white hover:bg-white/10"
              >
                RATE
              </button>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-full mr-2">
              <Clock className="w-4 h-4 text-blue-400" />
              <span className="text-sm font-bold text-white tracking-widest">{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>

            <button onClick={() => setShowQuickSwitch(true)} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 text-white/60 hover:text-white transition-all">
              <Zap className="w-5 h-5" />
            </button>
            <button onClick={() => setShowChannelStats(true)} className="hidden sm:flex w-10 h-10 items-center justify-center rounded-full hover:bg-white/10 text-white/60 hover:text-white transition-all">
              <TrendingUp className="w-5 h-5" />
            </button>
            <button onClick={() => setViewMode('grid')} className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-full transition-all border border-white/10 text-white">
              <LayoutGrid className="w-4 h-4" />
              <span className="text-xs font-bold tracking-widest hidden sm:block uppercase">Grid UI</span>
            </button>
          </div>
        </header>

        {/* Mobile Menu Overlay */}
        {isMobileMenuOpen && (
          <div className="md:hidden fixed inset-0 z-[100] bg-[#050505]/95 backdrop-blur-3xl flex flex-col pt-8 px-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-end mb-8">
              <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 bg-white/10 rounded-full text-white/70 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>
            <nav className="flex flex-col gap-6">
              <button onClick={() => { handleHomeNavigation(); setIsMobileMenuOpen(false); }} className="text-2xl font-black text-left text-white tracking-widest uppercase border-b border-white/10 pb-4">Home</button>
              <button onClick={() => { handleLiveTVNavigation(); setIsMobileMenuOpen(false); }} className="text-2xl font-black text-left text-white tracking-widest uppercase border-b border-white/10 pb-4">Live TV</button>
              <button onClick={() => { setShowChannelGuide(true); setIsMobileMenuOpen(false); }} className="text-2xl font-black text-left text-white tracking-widest uppercase border-b border-white/10 pb-4">TV Guide</button>
              <button onClick={() => { setShowChannelRequestModal(true); setIsMobileMenuOpen(false); }} className="text-2xl font-black text-left text-white tracking-widest uppercase border-b border-white/10 pb-4">Request Channel</button>
              <button onClick={() => { setShowRatingModal(true); setIsMobileMenuOpen(false); }} className="text-2xl font-black text-left text-white tracking-widest uppercase border-b border-white/10 pb-4">Rate Us</button>
            </nav>
          </div>
        )}

        <div className="flex flex-col md:flex-row flex-1 pt-16 min-h-0 bg-[#050505]">
          {/* MOBILE LIST LAYOUT */}
          <div className="flex flex-col flex-1 min-h-0 md:hidden">
            <div className="shrink-0 w-full bg-black relative" style={{ aspectRatio: '16/9' }}>
              {selectedChannel && isMobile ? (
                <VideoPlayer
                  channel={selectedChannel}
                  user={null}
                  onClose={() => { setSelectedChannel(null); setHeaderTitle("Live TV") }}
                  onChannelChange={() => { }}
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
                  embedded={true}
                />
              ) : !selectedChannel ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0a0a0c] p-6 border-b border-white/5">
                  <Tv className="w-12 h-12 text-white/20 mb-4" />
                  <h1 className="text-xl font-bold text-white mb-2 tracking-wide">Ready to Watch</h1>
                  <p className="text-sm text-white/50 text-center">Select a channel from the guide below</p>
                </div>
              ) : null}
            </div>

            <div className="shrink-0 bg-[#0f0f13] border-b border-white/5 p-3">
              <div className="relative group mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <input
                  type="text"
                  placeholder="Search by name or number..."
                  value={listSearchQuery}
                  onChange={(e) => setListSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-sm transition-all"
                />
              </div>
              <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                {listCategories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setListSelectedCategory(cat)}
                    className={`whitespace-nowrap shrink-0 px-4 py-1.5 rounded-full text-xs font-bold tracking-wider transition-all duration-300 ${listSelectedCategory === cat
                      ? "bg-white text-black"
                      : "bg-white/5 text-white/50 hover:text-white hover:bg-white/10 border border-white/5"
                      }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto bg-[#050505]">
              {listFilteredChannels.map((channel) => {
                const isActive = selectedChannel?.id === channel.id
                const currentProg = getCurrentChannelInfo(channel).current

                return (
                  <button
                    key={channel.id}
                    onClick={() => {
                      if (selectedChannel?.id === channel.id) return
                      setSelectedChannel(channel)
                      setHeaderTitle(channel.name)
                      addToRecentlyWatched(channel.id)
                      setRecentlyWatched(getRecentlyWatched())
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all duration-200 border-b border-white/5 ${isActive
                      ? "bg-blue-600/10 border-l-4 border-l-blue-500"
                      : "hover:bg-white/5 border-l-4 border-l-transparent"
                      }`}
                  >
                    <span className="text-xs font-bold text-white/30 w-6 text-right shrink-0 tracking-widest">
                      {String(channel.channelNumber ?? 0).padStart(3, '0')}
                    </span>
                    <div className="w-10 h-10 rounded bg-white/5 flex items-center justify-center p-1.5 shrink-0">
                      <img src={channel.logo || "/placeholder.svg"} alt="" className="w-full h-full object-contain" onError={(e) => { e.currentTarget.style.display = "none" }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`text-sm font-bold truncate ${isActive ? "text-white" : "text-white/80"}`}>
                          {channel.name}
                        </p>
                        {channel.isHD && <span className="text-[8px] px-1.5 py-0.5 bg-white/10 text-white rounded font-bold tracking-widest">HD</span>}
                      </div>
                      <p className="text-xs text-blue-400/80 truncate font-medium mt-0.5">{currentProg === "No information available" ? channel.category : currentProg}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* DESKTOP LIST LAYOUT (Cignal TV Style sidebar) */}
          <aside className="hidden md:flex w-[380px] bg-[#0a0a0c] border-r border-white/5 flex-col shrink-0 overflow-hidden shadow-2xl z-10">
            <div className="p-5 border-b border-white/5 bg-[#0f0f13]">
              <div className="relative group mb-4">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <input
                  type="text"
                  placeholder="Find channel or number..."
                  value={listSearchQuery}
                  onChange={(e) => setListSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-black border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-sm transition-all shadow-inner"
                />
              </div>
              <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                {listCategories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setListSelectedCategory(cat)}
                    className={`whitespace-nowrap shrink-0 px-4 py-1.5 rounded-full text-xs font-bold tracking-wider transition-all duration-300 ${listSelectedCategory === cat
                      ? "bg-blue-500 text-white shadow-[0_0_15px_rgba(59,130,246,0.3)]"
                      : "bg-white/5 text-white/50 hover:text-white hover:bg-white/10 border border-white/5"
                      }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto bg-[#0a0a0c]">
              {listFilteredChannels.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
                  <Tv className="w-12 h-12 text-white/10 mb-4" />
                  <p className="text-base font-medium text-white/50">No matching channels</p>
                </div>
              ) : (
                listFilteredChannels.map((channel) => {
                  const isActive = selectedChannel?.id === channel.id
                  const currentProg = getCurrentChannelInfo(channel).current

                  return (
                    <button
                      key={channel.id}
                      onClick={() => {
                        if (selectedChannel?.id === channel.id) return
                        setSelectedChannel(channel)
                        setHeaderTitle(channel.name)
                        addToRecentlyWatched(channel.id)
                        setRecentlyWatched(getRecentlyWatched())
                      }}
                      className={`w-full flex items-center gap-4 px-5 py-3.5 text-left transition-all duration-200 border-b border-white/5 group ${isActive
                        ? "bg-[#14141a] border-l-4 border-l-blue-500"
                        : "hover:bg-[#111115] border-l-4 border-l-transparent"
                        }`}
                    >
                      <span className="text-[11px] font-bold text-white/30 w-8 text-right shrink-0 tracking-widest tabular-nums group-hover:text-white/50 transition-colors">
                        {String(channel.channelNumber ?? 0).padStart(3, '0')}
                      </span>
                      <div className={`w-12 h-12 rounded bg-black/40 flex items-center justify-center p-1.5 shrink-0 border transition-all ${isActive ? 'border-white/20' : 'border-white/5'}`}>
                        <img src={channel.logo || "/placeholder.svg"} alt="" className="w-full h-full object-contain drop-shadow-md" onError={(e) => { e.currentTarget.style.display = "none" }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className={`text-base font-bold truncate tracking-wide ${isActive ? "text-white" : "text-white/80 group-hover:text-white"}`}>
                            {channel.name}
                          </p>
                          {channel.isHD && <span className="text-[8px] px-1.5 py-0.5 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded font-bold tracking-widest uppercase">HD</span>}
                        </div>
                        <p className={`text-[11px] truncate font-medium ${isActive ? 'text-blue-400' : 'text-white/40 group-hover:text-white/60'}`}>
                          {currentProg === "No information available" ? channel.category : currentProg}
                        </p>
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
                channel={selectedChannel}
                user={null}
                onClose={() => { setSelectedChannel(null); setHeaderTitle("Live TV") }}
                onChannelChange={() => { }}
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
                embedded={true}
              />
            ) : !selectedChannel ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#14141a] via-[#050505] to-black z-0">
                <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:50px_50px]"></div>
                <div className="z-10 flex flex-col items-center text-center max-w-lg px-8">
                  <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mb-8 border border-white/10 shadow-[0_0_40px_rgba(255,255,255,0.05)]">
                    <Tv className="w-10 h-10 text-white/40" />
                  </div>
                  <h1 className="text-3xl font-bold text-white tracking-wide mb-4">Welcome to Light TV</h1>
                  <p className="text-lg text-white/50 leading-relaxed mb-10">Select a channel from the guide to start watching live television.</p>

                  <div className="grid grid-cols-2 gap-4 w-full text-left">
                    <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                      <Keyboard className="w-5 h-5 text-white/40 mb-2" />
                      <p className="text-xs text-white/60 font-medium">Use number keys to directly tune to a channel</p>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                      <Search className="w-5 h-5 text-white/40 mb-2" />
                      <p className="text-xs text-white/60 font-medium">Search across categories instantly</p>
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
            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[200] pointer-events-none select-none">
              <div className="flex flex-col items-center justify-center gap-3 px-16 py-10 rounded-3xl shadow-2xl bg-black/80 backdrop-blur-2xl border border-white/10">
                <span className="font-bold text-white leading-none tracking-widest text-6xl drop-shadow-lg">{channelNumberInput.padStart(3, '0')}</span>
                <span className="text-blue-400 font-bold text-xl tracking-wide">{match ? match.name : '—'}</span>
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

  // GRID MODE LAYOUT (Android TV / Smart TV OS Style)
  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-white/20 font-sans">
      <SupportPopup isOpen={showSupportModal} onClose={() => setShowSupportModal(false)} isFirstTime={isFirstTimeUser} />

      {showKeyboardShortcuts && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[100] p-4" onClick={() => setShowKeyboardShortcuts(false)}>
          <div className="bg-[#14141a] border border-white/10 rounded-2xl max-w-sm w-full p-6 shadow-2xl animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-3">
                <Keyboard className="w-5 h-5 text-blue-400" />
                <h2 className="text-sm font-bold text-white tracking-widest uppercase">Remote Shortcuts</h2>
              </div>
              <button onClick={() => setShowKeyboardShortcuts(false)} className="text-white/40 hover:text-white transition-colors duration-300">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-1.5 text-sm">
              {[['Play/Pause', 'Space'], ['Mute', 'M'], ['Fullscreen', 'F'], ['Picture-in-Picture', 'P'], ['Volume Up', '↑'], ['Volume Down', '↓'], ['Seek Forward', '→'], ['Seek Backward', '←']].map(([label, key]) => (
                <div key={label} className="flex justify-between items-center py-2.5 border-b border-white/5 last:border-0">
                  <span className="text-white/70 font-medium">{label}</span>
                  <kbd className="px-3 py-1 bg-white/10 rounded-md text-white font-mono text-xs font-bold tracking-widest border border-white/10">{key}</kbd>
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
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${isNavTransparent ? 'bg-gradient-to-b from-black/90 to-transparent pt-4 pb-12' : 'bg-[#0a0a0a]/95 backdrop-blur-xl border-b border-white/5 py-3'}`}>
        <div className="px-6 md:px-12">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 md:gap-8">
              <button className="md:hidden p-1 text-white/70 hover:text-white" onClick={() => setIsMobileMenuOpen(true)}>
                <Menu className="w-6 h-6" />
              </button>
              <img src="/images/light-logo.png" alt="Light TV" className="h-10 md:h-12 w-auto drop-shadow-xl" />
              <nav className="hidden md:flex items-center gap-2">
                <button
                  onClick={handleHomeNavigation}
                  className={`px-5 py-2.5 rounded-full text-xs font-bold tracking-widest uppercase transition-all duration-300 ${!isLiveTVView ? "bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.3)]" : "text-white/60 hover:text-white hover:bg-white/10"}`}
                >
                  Home
                </button>
                <button
                  onClick={handleLiveTVNavigation}
                  className={`px-5 py-2.5 rounded-full text-xs font-bold tracking-widest uppercase transition-all duration-300 ${isLiveTVView ? "bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.3)]" : "text-white/60 hover:text-white hover:bg-white/10"}`}
                >
                  Live TV
                </button>
                <button
                  onClick={() => setShowChannelGuide(true)}
                  className="px-5 py-2.5 rounded-full text-xs font-bold tracking-widest uppercase text-white/60 hover:text-white hover:bg-white/10 transition-all duration-300"
                >
                  Guide
                </button>
                <button
                  onClick={() => setShowChannelRequestModal(true)}
                  className="px-5 py-2.5 rounded-full text-xs font-bold tracking-widest uppercase text-white/60 hover:text-white hover:bg-white/10 transition-all duration-300"
                >
                  Request
                </button>
                <button
                  onClick={() => setShowRatingModal(true)}
                  className="px-5 py-2.5 rounded-full text-xs font-bold tracking-widest uppercase text-white/60 hover:text-white hover:bg-white/10 transition-all duration-300"
                >
                  Rate
                </button>
              </nav>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden lg:flex relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
                <input
                  type="text"
                  placeholder="Search content..."
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-11 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-full focus:outline-none focus:bg-white/10 focus:ring-2 focus:ring-white/30 text-sm w-60 text-white placeholder:text-white/40 transition-all duration-300 shadow-inner"
                />
              </div>
              <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-black/40 border border-white/10 rounded-full backdrop-blur-md">
                <span className="text-sm font-bold text-white tracking-widest">{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>

              <button onClick={() => setShowQuickSwitch(true)} className="w-10 h-10 flex items-center justify-center hover:bg-white/10 rounded-full transition-all text-white/70 hover:text-white"><Zap className="w-5 h-5" /></button>
              <button onClick={() => setViewMode('list')} className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-full transition-all border border-white/10 text-white">
                <List className="w-4 h-4" />
                <span className="text-xs font-bold tracking-widest hidden sm:block uppercase">List UI</span>
              </button>
              <button onClick={() => setShowKeyboardShortcuts(true)} className="hidden md:flex w-10 h-10 items-center justify-center hover:bg-white/10 rounded-full transition-all text-white/70 hover:text-white"><Keyboard className="w-5 h-5" /></button>
              <button onClick={() => setShowSupportModal(true)} className="hidden md:flex w-10 h-10 items-center justify-center hover:bg-white/10 rounded-full transition-all text-white/70 hover:text-white"><Heart className="w-5 h-5" /></button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile search overlay */}
      {isMobileSearchOpen && (
        <div className="md:hidden fixed top-20 left-0 right-0 z-40 bg-[#0a0a0a]/95 backdrop-blur-2xl border-b border-white/10 px-4 py-4">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input
              type="text"
              placeholder="Search channels..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              autoFocus
              className="w-full pl-10 pr-4 py-3 bg-black/50 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
        </div>
      )}

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-[100] bg-[#050505]/95 backdrop-blur-3xl flex flex-col pt-8 px-6 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex justify-end mb-8">
            <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 bg-white/10 rounded-full text-white/70 hover:text-white">
              <X className="w-6 h-6" />
            </button>
          </div>
          <nav className="flex flex-col gap-6">
            <button onClick={() => { handleHomeNavigation(); setIsMobileMenuOpen(false); }} className="text-2xl font-black text-left text-white tracking-widest uppercase border-b border-white/10 pb-4">Home</button>
            <button onClick={() => { handleLiveTVNavigation(); setIsMobileMenuOpen(false); }} className="text-2xl font-black text-left text-white tracking-widest uppercase border-b border-white/10 pb-4">Live TV</button>
            <button onClick={() => { setShowChannelGuide(true); setIsMobileMenuOpen(false); }} className="text-2xl font-black text-left text-white tracking-widest uppercase border-b border-white/10 pb-4">TV Guide</button>
            <button onClick={() => { setShowChannelRequestModal(true); setIsMobileMenuOpen(false); }} className="text-2xl font-black text-left text-white tracking-widest uppercase border-b border-white/10 pb-4">Request Channel</button>
            <button onClick={() => { setShowRatingModal(true); setIsMobileMenuOpen(false); }} className="text-2xl font-black text-left text-white tracking-widest uppercase border-b border-white/10 pb-4">Rate Us</button>
          </nav>
        </div>
      )}

      <main className={`pt-24 md:pt-32 pb-20 w-full relative z-10 ${isMobileSearchOpen ? 'pt-40' : ''}`}>

        {/* Ambient background glow */}
        <div className="fixed top-0 left-0 right-0 h-[600px] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#1a1a2e] via-[#050505] to-[#050505] pointer-events-none -z-10 opacity-70"></div>

        {!isLiveTVView ? (
          <div className="w-full">
            {/* Hero / Welcome */}
            <div className="px-6 md:px-12 pt-4 pb-12">
              <h1 className="text-4xl md:text-6xl font-black text-white tracking-tight mb-4 drop-shadow-lg">Welcome To... <br /><span className="text-blue-500">Light TV - By PHC-SVWG </span></h1>
              <p className="text-lg text-white/60 max-w-xl mb-8 font-medium">Immerse yourself in endless entertainment. Your premium destination for live channels and programs.</p>
              <div className="flex gap-4">
                <Button onClick={handleLiveTVNavigation} className="bg-white text-black hover:bg-gray-200 px-8 py-6 rounded-full text-sm font-bold tracking-widest uppercase transition-all shadow-[0_0_30px_rgba(255,255,255,0.2)]">
                  Start Watching
                </Button>
                <Button onClick={() => setShowChannelGuide(true)} className="bg-white/10 text-white hover:bg-white/20 border border-white/10 px-8 py-6 rounded-full text-sm font-bold tracking-widest uppercase transition-all backdrop-blur-md">
                  TV Guide
                </Button>
              </div>
            </div>

            {/* Smart TV Rows */}
            <div className="space-y-6 md:space-y-10">
              {favorites.length > 0 && createRow("Favorites", allChannels.filter(ch => favorites.includes(ch.id)), <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />, true)}
              {recentlyWatched.length > 0 && createRow("Jump Back In", allChannels.filter(ch => recentlyWatched.includes(ch.id)).sort((a, b) => recentlyWatched.indexOf(a.id) - recentlyWatched.indexOf(b.id)), <Clock className="w-5 h-5" />, true)}

              {Object.entries(categorizeChannels()).map(([categoryName, categoryChannels], index) => {
                if (categoryChannels.length === 0) return null
                return (
                  <div key={categoryName} className="animate-fade-in" style={{ animationDelay: `${index * 0.1}s` }}>
                    {createRow(categoryName, categoryChannels, null, true)}
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          <div className="w-full">
            <div className="px-6 md:px-12 py-4 mb-6">
              <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight mb-6">
                {searchQuery ? "Search Results" : "Live Channels"}
              </h1>

              {/* Smart TV Category Pills */}
              {!searchQuery && (
                <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 snap-x">
                  {categories.map((category, index) => (
                    <button
                      key={category}
                      onClick={() => setSelectedCategory(category)}
                      className={`whitespace-nowrap shrink-0 snap-start px-6 py-2.5 rounded-full text-xs font-bold tracking-widest uppercase transition-all duration-300 ${selectedCategory === category
                        ? "bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.3)] scale-105"
                        : "bg-white/5 text-white/50 hover:bg-white/10 hover:text-white border border-white/5"
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
              <div className="px-6 md:px-12 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
                {filteredChannels.map((channel, index) => (
                  <div
                    key={channel.id}
                    onClick={() => handleChannelSelectForLiveTV(channel)}
                    className="group relative cursor-pointer animate-scale-in aspect-video bg-[#14141a] rounded-xl border border-white/5 hover:border-white hover:ring-4 hover:ring-white/30 transition-all duration-300 shadow-xl overflow-hidden"
                    style={{ animationDelay: `${(index % 12) * 0.05}s` }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent z-10" />

                    <div className="absolute top-3 left-3 z-20 bg-black/60 px-2 py-0.5 rounded text-[10px] font-bold text-white tracking-widest backdrop-blur-sm border border-white/10">
                      CH {String(channel.channelNumber ?? 0).padStart(3, '0')}
                    </div>

                    <div className="absolute inset-0 flex items-center justify-center z-0 p-8 pb-12">
                      {channel.logo ? (
                        <img src={channel.logo} alt={channel.name} className="max-w-full max-h-full object-contain opacity-70 group-hover:opacity-100 transition-opacity drop-shadow-xl" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center border border-white/20"><span className="text-white font-bold text-2xl">{channel.name.charAt(0)}</span></div>
                      )}
                    </div>

                    <div className="absolute bottom-0 left-0 right-0 p-4 z-20">
                      <h3 className="text-white font-bold text-sm md:text-base truncate drop-shadow-md tracking-wide">{channel.name}</h3>
                      <p className="text-blue-400 text-xs truncate mt-1 font-medium">{getCurrentChannelInfo(channel).current === "No information available" ? channel.category : getCurrentChannelInfo(channel).current}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-20">
                <Tv className="w-16 h-16 text-white/20 mx-auto mb-4" />
                <p className="text-xl text-white/50 font-medium">No channels match your search.</p>
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
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[200] pointer-events-none select-none">
            <div className="flex flex-col items-center justify-center gap-3 px-16 py-10 rounded-3xl shadow-2xl bg-black/80 backdrop-blur-2xl border border-white/10">
              <span className="font-bold text-white leading-none tracking-widest text-6xl drop-shadow-lg">{channelNumberInput.padStart(3, '0')}</span>
              <span className="text-blue-400 font-bold text-xl tracking-wide">{match ? match.name : '—'}</span>
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