'use client'

import type React from "react"
import { useState, useEffect, useRef, useMemo } from "react"
import { VideoPlayer } from "@/components/video-player"
import { allChannels as staticChannels } from "@/data/channels/all-channels"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, Search, Menu, HomeIcon, Tv, X, Heart, Star, Clock, PictureInPicture, Keyboard, Zap, TrendingUp, LayoutGrid, List, LogOut, Grid2x2 } from "lucide-react"
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
import { useRouter } from "next/navigation"
import Link from "next/link"

interface IPTVContentProps {
  username: string
}

export default function IPTVContent({ username }: IPTVContentProps) {
  const router = useRouter()
  const { theme } = useTheme()
  const { hasAccess, isCheckingAccess, setHasAccess } = useAccessControl()

  const [allChannels, setAllChannels] = useState<Channel[]>(staticChannels)
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("All")
  const [isDarkMode, setIsDarkMode] = useState(true)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [savedScrollPosition, setSavedScrollPosition] = useState(0)
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
  const [pendingBitrateMode, setPendingBitrateMode] = useState<"high-bitrate" | "optimized" | null>(null)
  const pendingChannelRef = useRef<Channel | null>(null)
  const [restoreUIHidden, setRestoreUIHidden] = useState(false)
  const { isPipActive, pipChannel, activatePip, deactivatePip } = usePipMode()
  const [channelNumberInput, setChannelNumberInput] = useState("")
  const channelNumberTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [recentlyWatched, setRecentlyWatched] = useState<string[]>([])
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [epgData, setEpgData] = useState<any>({})
  const [currentPrograms, setCurrentPrograms] = useState<any>({})
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false)
  const [showQuickSwitch, setShowQuickSwitch] = useState(false)
  const [showChannelStats, setShowChannelStats] = useState(false)

  // Sign out function
  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth')
  }

  // Categories
  const categories = useMemo(() => {
    const cats = new Set(allChannels.map(ch => ch.category))
    return ["All", ...Array.from(cats).sort()]
  }, [allChannels])

  // Filtered channels
  const filteredChannels = useMemo(() => {
    let channels = allChannels
    if (selectedCategory !== "All") {
      channels = channels.filter(ch => ch.category === selectedCategory)
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      channels = channels.filter(ch =>
        ch.name.toLowerCase().includes(query) ||
        ch.category.toLowerCase().includes(query)
      )
    }
    return channels
  }, [allChannels, selectedCategory, searchQuery])

  // Initialize
  useEffect(() => {
    setIsInitialLoading(false)
    setRecentlyWatched(getRecentlyWatched())
    setFavoriteChannels(getFavorites())

    // Detect mobile
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
      setIsPortrait(window.innerHeight > window.innerWidth)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Time update
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  // Channel selection
  const handleChannelSelect = (channel: Channel) => {
    if (selectedChannel?.id === channel.id) return
    setSavedScrollPosition(window.scrollY)
    setSelectedChannel(channel)
    setHeaderTitle(channel.name)
    addToRecentlyWatched(channel.id)
    setRecentlyWatched(getRecentlyWatched())
  }

  // Close player
  const handleClosePlayer = () => {
    setSelectedChannel(null)
    setHeaderTitle(isLiveTVView ? "Live TV" : "Home")
    setTimeout(() => window.scrollTo(0, savedScrollPosition), 100)
  }

  // Favorite toggle
  const toggleFavorite = (channelId: string) => {
    if (isFavorite(channelId)) {
      removeFavorite(channelId)
    } else {
      addFavorite(channelId)
    }
    setFavoriteChannels(getFavorites())
  }

  // Channel number input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      if (/^[0-9]$/.test(e.key)) {
        setChannelNumberInput(prev => {
          const next = prev + e.key
          if (channelNumberTimeoutRef.current) clearTimeout(channelNumberTimeoutRef.current)
          channelNumberTimeoutRef.current = setTimeout(() => {
            const num = parseInt(next, 10)
            const channel = allChannels.find(c => c.channelNumber === num)
            if (channel && channel.id !== selectedChannel?.id) {
              handleChannelSelect(channel)
            }
            setChannelNumberInput("")
          }, 1500)
          return next
        })
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [allChannels, selectedChannel])

  // Loading screen
  if (isInitialLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <img src="/images/light-logo.png" alt="Light TV" className="h-8 w-auto" />
            <span className="text-sm text-muted-foreground">Welcome, {username}</span>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-2">
            <Button
              variant={!isLiveTVView ? "default" : "ghost"}
              size="sm"
              onClick={() => { setIsLiveTVView(false); setHeaderTitle("Home") }}
            >
              <HomeIcon className="w-4 h-4 mr-1" /> Home
            </Button>
            <Button
              variant={isLiveTVView ? "default" : "ghost"}
              size="sm"
              onClick={() => { setIsLiveTVView(true); setHeaderTitle("Live TV") }}
            >
              <Tv className="w-4 h-4 mr-1" /> Live TV
            </Button>
            <Link href="/multiview">
              <Button variant="ghost" size="sm" className="text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10">
                <Grid2x2 className="w-4 h-4 mr-1" /> Multi-View
              </Button>
            </Link>
          </nav>

          <div className="flex items-center gap-2">
            {/* Search */}
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 rounded-lg bg-secondary text-sm w-48 focus:w-64 transition-all outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <ThemeToggle />
            <Button variant="ghost" size="sm" onClick={handleSignOut} className="text-red-500 hover:text-red-400">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4">
        {/* Category Pills */}
        <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-full text-sm whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Channel Grid */}
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
          {filteredChannels.map((channel, index) => (
            <div
              key={channel.id}
              onClick={() => handleChannelSelect(channel)}
              className="cursor-pointer group"
            >
              <div className="rounded-2xl bg-[#919191] hover:bg-[#7a7a7a] transition-colors aspect-square flex flex-col items-center justify-between py-2 px-2 relative overflow-hidden">
                <span
                  className="text-white font-bold text-sm leading-none self-start z-10"
                  style={{ fontFamily: 'Roboto, sans-serif', WebkitTextStroke: '0.5px black' }}
                >
                  {String(channel.channelNumber ?? index + 1).padStart(3, '0')}
                </span>
                {channel.logo ? (
                  <img
                    src={channel.logo}
                    alt={channel.name}
                    className="w-12 h-12 md:w-14 md:h-14 object-contain drop-shadow-md"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                    <span className="text-white font-bold text-xl">{channel.name.charAt(0)}</span>
                  </div>
                )}
                <span
                  className="text-white text-[9px] md:text-[10px] font-semibold text-center leading-tight w-full truncate"
                  style={{ fontFamily: 'Roboto, sans-serif' }}
                >
                  {channel.name}
                </span>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Video Player Modal */}
      {selectedChannel && (
        <div className="fixed inset-0 z-[60] bg-black">
          <VideoPlayer
            channel={selectedChannel}
            user={null}
            onClose={handleClosePlayer}
            onChannelChange={(channelId: string) => {
              const target = allChannels.find(c => c.id === channelId)
              if (target && target.id !== selectedChannel.id) {
                setSelectedChannel(null)
                setTimeout(() => {
                  setSelectedChannel(target)
                  setHeaderTitle(target.name)
                  addToRecentlyWatched(target.id)
                  setRecentlyWatched(getRecentlyWatched())
                }, 300)
              }
            }}
            onBitrateModeChange={() => {}}
            restoreUIHidden={restoreUIHidden}
            availableChannels={allChannels}
            videoRef={videoRef}
            isMuted={isMuted}
            showModernButton={showModernButton}
            showChannelInfo={showChannelInfo}
            showChannelList={showChannelList}
            getCurrentChannelInfo={() => null}
            getCurrentSelectedChannelInfo={() => null}
            onModernButtonHover={() => {}}
            onChannelInfoHover={() => {}}
            onChannelListHover={() => {}}
            isMobile={isMobile}
            isPortrait={isPortrait}
            epgData={epgData}
            currentPrograms={currentPrograms}
            onPositionUpdate={() => {}}
            getSavedPosition={() => null}
          />
        </div>
      )}

      {/* Channel Number OSD */}
      {channelNumberInput && (() => {
        const num = parseInt(channelNumberInput, 10)
        const match = allChannels.find(c => c.channelNumber === num)
        return (
          <div className="fixed inset-0 flex items-center justify-center pointer-events-none select-none z-[200]">
            <div
              className="flex flex-col items-center justify-center gap-3 px-12 py-8 rounded-2xl shadow-2xl"
              style={{
                background: 'rgba(30,30,30,0.72)',
                backdropFilter: 'blur(18px)',
                border: '1px solid rgba(255,255,255,0.15)',
                minWidth: 220,
              }}
            >
              <span className="font-bold text-white leading-none tracking-widest" style={{ fontSize: '4.5rem' }}>
                {channelNumberInput.padStart(3, '0')}
              </span>
              <span className="text-white/90 font-semibold text-center leading-snug" style={{ fontSize: '1.35rem', maxWidth: 260 }}>
                {match ? match.name : '—'}
              </span>
            </div>
          </div>
        )
      })()}

      {/* Modals */}
      <ChannelRequestModal
        isOpen={showChannelRequestModal}
        onClose={() => setShowChannelRequestModal(false)}
      />
      <RatingModal
        isOpen={showRatingModal}
        onClose={() => setShowRatingModal(false)}
      />
      <SupportPopup />
    </div>
  )
}
