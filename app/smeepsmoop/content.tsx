'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { allChannels } from '@/data/channels/all-channels'
import { VideoPlayer } from '@/components/video-player'
import { Search, Play, ChevronRight, Clock, Menu } from 'lucide-react'
import type { Channel } from '@/data/types/channel'
import Link from 'next/link'

export default function SmeepsmoopContent() {
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null)
  const [filteredCategory, setFilteredCategory] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')
  const [heroIndex, setHeroIndex] = useState(0)
  const [showMenu, setShowMenu] = useState(false)
  const [currentPrograms, setCurrentPrograms] = useState<Record<string, any>>({})
  const heroCarouselRef = useRef<HTMLDivElement>(null)

  const liveChannels = useMemo(() => {
    return allChannels.filter((ch) => ch.url && ch.name && ch.logo)
  }, [])

  const categories = useMemo(() => {
    const cats = new Set(liveChannels.map((ch) => ch.category))
    return ['All', ...Array.from(cats).sort()]
  }, [liveChannels])

  const filteredChannels = useMemo(() => {
    return liveChannels.filter((ch) => {
      const matchesCategory = filteredCategory === 'All' || ch.category === filteredCategory
      const matchesSearch = searchQuery === '' || ch.name.toLowerCase().includes(searchQuery.toLowerCase())
      return matchesCategory && matchesSearch
    })
  }, [liveChannels, filteredCategory, searchQuery])

  const featuredChannels = useMemo(() => {
    return filteredChannels.slice(0, 6)
  }, [filteredChannels])

  useEffect(() => {
    if (featuredChannels.length === 0) return
    const interval = setInterval(() => {
      setHeroIndex((prev) => (prev + 1) % featuredChannels.length)
    }, 8000)
    return () => clearInterval(interval)
  }, [featuredChannels.length])

  // Fetch EPG data
  useEffect(() => {
    const fetchEPG = async () => {
      try {
        const response = await fetch(
          '/api/proxy-epg?url=' + encodeURIComponent('https://epgshare01.online/epgshare01/epg_ripper_PH1.xml.gz')
        )
        if (response.ok) {
          const text = await response.text()
          const parser = new DOMParser()
          const xmlDoc = parser.parseFromString(text, 'text/xml')
          const programmes = xmlDoc.getElementsByTagName('programme')

          const progs: Record<string, any> = {}
          const now = new Date()

          for (let i = 0; i < programmes.length; i++) {
            const prog = programmes[i]
            const start = prog.getAttribute('start')
            const title = prog.getElementsByTagName('title')[0]?.textContent || 'Unknown'

            if (!start) continue
            const startTime = new Date(
              start.replace(/(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/, '$1-$2-$3T$4:$5:$6')
            )

            if (startTime <= now) {
              const channelId = prog.getAttribute('channel')
              if (channelId && !progs[channelId]) {
                progs[channelId] = {
                  title,
                  start,
                  stop: prog.getAttribute('stop') || '',
                }
              }
            }
          }
          setCurrentPrograms(progs)
        }
      } catch (err) {
        console.error('EPG fetch failed:', err)
      }
    }

    fetchEPG()
    const interval = setInterval(fetchEPG, 600000)
    return () => clearInterval(interval)
  }, [])

  const handleChannelSelect = (channel: Channel) => {
    setSelectedChannel(channel)
  }

  if (selectedChannel) {
    return (
      <VideoPlayer
        channel={selectedChannel}
        user={null}
        onClose={() => setSelectedChannel(null)}
        onChannelChange={(newChannelId) => {
          const newChannel = allChannels.find((ch) => ch.id === newChannelId)
          if (newChannel) setSelectedChannel(newChannel)
        }}
        availableChannels={liveChannels}
        videoRef={{ current: null } as any}
        isMuted={false}
        showModernButton={false}
        showChannelInfo={false}
        showChannelList={false}
        getCurrentChannelInfo={() => ({ current: '', next: '' })}
        getCurrentSelectedChannelInfo={() => ({ current: '', next: '' })}
        onModernButtonHover={() => {}}
        onChannelInfoHover={() => {}}
        onChannelListHover={() => {}}
        isMobile={false}
        isPortrait={false}
        epgData={{}}
        currentPrograms={currentPrograms}
      />
    )
  }

  const heroChannel = featuredChannels[heroIndex] || featuredChannels[0]
  const heroProgram = heroChannel ? currentPrograms[heroChannel.id] : null

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-slate-950/95 border-b border-slate-800/50">
        <div className="px-4 py-4 md:px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-white text-sm font-bold">LIVE</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Smeepsmoop</h1>
              <p className="text-xs text-gray-400">Live TV Streaming</p>
            </div>
          </div>

          {/* Search Bar */}
          <div className="hidden md:flex flex-1 max-w-md mx-8">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search channels..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500 transition"
              />
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/" className="text-gray-400 hover:text-white text-sm transition">
              Home
            </Link>
            <Link href="/salvadoronlyadminpanel" className="text-gray-400 hover:text-white text-sm transition">
              Admin
            </Link>
            <button className="text-gray-400 hover:text-white transition">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
              </svg>
            </button>
          </nav>

          {/* Mobile Menu */}
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="md:hidden p-2 hover:bg-slate-800 rounded-lg transition"
          >
            <Menu className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Mobile Search */}
        <div className="md:hidden px-4 pb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search channels..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500 transition"
            />
          </div>
        </div>
      </header>

      {/* Featured Hero Section */}
      {heroChannel && (
        <div className="relative h-64 md:h-96 overflow-hidden bg-gradient-to-b from-slate-900 to-slate-950">
          {/* Background Image */}
          <div className="absolute inset-0">
            <img
              src={heroChannel.logo || '/placeholder.svg'}
              alt={heroChannel.name}
              className="w-full h-full object-cover opacity-40"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />
          </div>

          {/* Hero Content */}
          <div className="relative h-full flex flex-col justify-end p-6 md:p-8 max-w-3xl">
            <div className="flex items-center gap-3 mb-4">
              <img
                src={heroChannel.logo || '/placeholder.svg'}
                alt={heroChannel.name}
                className="w-16 h-16 md:w-20 md:h-20 rounded-lg object-cover border-2 border-blue-500"
              />
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="bg-red-600 text-white text-xs">LIVE</Badge>
                  {heroChannel.isHD && <Badge className="bg-blue-600 text-white text-xs">HD</Badge>}
                </div>
                <h2 className="text-2xl md:text-4xl font-black text-white">{heroChannel.name}</h2>
              </div>
            </div>

            {/* Description */}
            <p className="text-gray-300 text-sm md:text-base mb-4 line-clamp-2">
              {heroProgram?.title || 'Live programming'}
            </p>

            {/* Watch Now Button */}
            <Button
              onClick={() => handleChannelSelect(heroChannel)}
              className="w-full md:w-48 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all duration-200 shadow-lg"
            >
              <Play className="w-5 h-5 fill-current" />
              Watch Now
            </Button>

            {/* Hero Carousel Indicators */}
            <div className="flex gap-2 mt-6">
              {featuredChannels.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setHeroIndex(i)}
                  className={`h-1 rounded-full transition-all duration-300 ${
                    i === heroIndex ? 'bg-blue-500 w-6' : 'bg-white/30 w-2'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Category Filter */}
      <div className="sticky top-20 z-30 bg-slate-950 border-b border-slate-800/50 overflow-x-auto">
        <div className="px-4 md:px-6 py-3 flex gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => {
                setFilteredCategory(cat)
                setHeroIndex(0)
              }}
              className={`px-4 py-2 rounded-full font-medium text-sm whitespace-nowrap transition-all duration-200 ${
                filteredCategory === cat
                  ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg'
                  : 'bg-slate-800 text-gray-300 hover:bg-slate-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <main className="px-4 md:px-6 py-8">
        {/* Channel Grid */}
        {filteredChannels.length > 0 ? (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 mb-12">
              {filteredChannels.map((channel) => {
                const program = currentPrograms[channel.id]
                return (
                  <Card
                    key={channel.id}
                    onClick={() => handleChannelSelect(channel)}
                    className="group cursor-pointer bg-slate-800/40 border-slate-700/50 hover:border-blue-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/20 overflow-hidden"
                  >
                    {/* Channel Logo */}
                    <div className="relative aspect-video overflow-hidden bg-slate-900">
                      <img
                        src={channel.logo || '/placeholder.svg'}
                        alt={channel.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      />

                      {/* Hover Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-between p-3">
                        <div className="flex gap-1 justify-end">
                          {channel.isHD && <Badge className="bg-blue-600 text-xs text-white">HD</Badge>}
                          <Badge className="bg-red-600 text-xs text-white">LIVE</Badge>
                        </div>
                        <Button
                          size="sm"
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleChannelSelect(channel)
                          }}
                        >
                          <Play className="w-3 h-3 mr-1 fill-current" />
                          Play
                        </Button>
                      </div>
                    </div>

                    {/* Channel Info */}
                    <div className="p-3">
                      <p className="font-bold text-white text-sm line-clamp-1 group-hover:text-blue-300 transition">
                        {channel.name}
                      </p>
                      <p className="text-xs text-gray-400 mt-1 line-clamp-1">{program?.title || 'Live'}</p>
                    </div>
                  </Card>
                )
              })}
            </div>

            {/* Live Guide Section */}
            <div className="mt-8 mb-12">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg md:text-xl font-bold text-white flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-500" />
                  Live Guide
                </h3>
                <Button variant="ghost" size="sm" className="text-blue-400 hover:text-blue-300 text-xs md:text-sm">
                  View All
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
                {filteredChannels.slice(0, 4).map((channel) => {
                  const program = currentPrograms[channel.id]
                  return (
                    <Card
                      key={channel.id}
                      onClick={() => handleChannelSelect(channel)}
                      className="group cursor-pointer bg-slate-800/40 border-slate-700/50 hover:border-blue-500/50 transition-all duration-200 p-3"
                    >
                      <div className="flex gap-3">
                        <img
                          src={channel.logo || '/placeholder.svg'}
                          alt={channel.name}
                          className="w-12 h-12 rounded object-cover flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-white text-sm">{channel.name}</p>
                          <p className="text-xs text-gray-400 line-clamp-1 mt-1">
                            {program?.title || 'Live programming'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Badge className="bg-red-600 text-xs text-white whitespace-nowrap">LIVE</Badge>
                        </div>
                      </div>
                    </Card>
                  )
                })}
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-400 text-lg">No channels found</p>
            <Button
              onClick={() => {
                setSearchQuery('')
                setFilteredCategory('All')
              }}
              variant="outline"
              className="mt-4"
            >
              Reset Filters
            </Button>
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-slate-950 border-t border-slate-800 px-4 py-3 md:hidden">
        <div className="flex justify-around items-center gap-2">
          <Link
            href="/"
            className="flex flex-col items-center gap-1 py-2 px-4 text-gray-400 hover:text-blue-400 transition text-xs"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
            </svg>
            <span>Home</span>
          </Link>
          <button className="flex flex-col items-center gap-1 py-2 px-4 text-blue-400 transition text-xs">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 4h12v2H6V4zm0 7h12v2H6v-2zm0 7h12v2H6v-2z" />
            </svg>
            <span>Live</span>
          </button>
          <Link
            href="/salvadoronlyadminpanel/playlisthome"
            className="flex flex-col items-center gap-1 py-2 px-4 text-gray-400 hover:text-blue-400 transition text-xs"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M4 6h16v2H4V6zm0 5h16v2H4v-2zm0 5h16v2H4v-2z" />
            </svg>
            <span>Guide</span>
          </Link>
          <button className="flex flex-col items-center gap-1 py-2 px-4 text-gray-400 hover:text-blue-400 transition text-xs">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M15.5 1h-8C6.12 1 5 2.12 5 3.5v17C5 21.88 6.12 23 7.5 23h8c1.38 0 2.5-1.12 2.5-2.5v-17C18 2.12 16.88 1 15.5 1zm-4 21c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm4.5-4H7V4h9v14z" />
            </svg>
            <span>Profile</span>
          </button>
        </div>
      </nav>

      {/* Safe area for bottom nav */}
      <div className="h-20 md:h-0" />
    </div>
  )
}
