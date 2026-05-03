'use client'

import type React from "react"
import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { allChannels } from "@/data/channels/all-channels"
import type { Channel } from "@/data/types/channel"
import { 
  ArrowLeft, 
  Plus, 
  X, 
  Search,
  LayoutGrid,
  Columns2,
  Grid2x2,
  Maximize2
} from "lucide-react"
import Link from "next/link"
import { MultiViewPlayer } from "@/components/multi-view-player"

type LayoutMode = '2' | '3' | '4'

export default function MultiViewPage() {
  const [layout, setLayout] = useState<LayoutMode>('2')
  const [selectedChannels, setSelectedChannels] = useState<(Channel | null)[]>([null, null, null, null])
  const [selectingSlot, setSelectingSlot] = useState<number | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [fullscreenSlot, setFullscreenSlot] = useState<number | null>(null)

  // Categories
  const categories = useMemo(() => {
    const cats = new Set(allChannels.map(ch => ch.category))
    return ["All", ...Array.from(cats).sort()]
  }, [])

  // Filtered channels for selection
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
  }, [selectedCategory, searchQuery])

  // Get visible slots based on layout
  const visibleSlots = parseInt(layout)

  // Handle channel selection
  const handleSelectChannel = (channel: Channel) => {
    if (selectingSlot === null) return
    
    const newChannels = [...selectedChannels]
    newChannels[selectingSlot] = channel
    setSelectedChannels(newChannels)
    setSelectingSlot(null)
    setSearchQuery('')
  }

  // Remove channel from slot
  const handleRemoveChannel = (slotIndex: number) => {
    const newChannels = [...selectedChannels]
    newChannels[slotIndex] = null
    setSelectedChannels(newChannels)
  }

  // Toggle fullscreen for a slot
  const handleToggleFullscreen = (slotIndex: number) => {
    setFullscreenSlot(fullscreenSlot === slotIndex ? null : slotIndex)
  }

  // Get grid class based on layout and fullscreen
  const getGridClass = () => {
    if (fullscreenSlot !== null) {
      return 'grid-cols-1 grid-rows-1'
    }
    switch (layout) {
      case '2':
        return 'grid-cols-2 grid-rows-1'
      case '3':
        return 'grid-cols-3 grid-rows-1 md:grid-cols-2 md:grid-rows-2'
      case '4':
        return 'grid-cols-2 grid-rows-2'
      default:
        return 'grid-cols-2 grid-rows-1'
    }
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-2 bg-zinc-900/80 border-b border-zinc-800">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
            <span className="hidden sm:inline">Back</span>
          </Link>
          <h1 className="text-lg font-bold text-cyan-400">Multi-View</h1>
        </div>

        {/* Layout Selector */}
        <div className="flex items-center gap-2 bg-zinc-800 rounded-lg p-1">
          <button
            onClick={() => setLayout('2')}
            className={`p-2 rounded ${layout === '2' ? 'bg-cyan-500 text-black' : 'text-gray-400 hover:text-white'}`}
            title="2 Videos"
          >
            <Columns2 className="w-5 h-5" />
          </button>
          <button
            onClick={() => setLayout('3')}
            className={`p-2 rounded ${layout === '3' ? 'bg-cyan-500 text-black' : 'text-gray-400 hover:text-white'}`}
            title="3 Videos"
          >
            <LayoutGrid className="w-5 h-5" />
          </button>
          <button
            onClick={() => setLayout('4')}
            className={`p-2 rounded ${layout === '4' ? 'bg-cyan-500 text-black' : 'text-gray-400 hover:text-white'}`}
            title="4 Videos"
          >
            <Grid2x2 className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Content - Video Grid */}
      <div className={`flex-1 grid gap-1 p-1 ${getGridClass()}`}>
        {Array.from({ length: visibleSlots }).map((_, index) => {
          // Skip if fullscreen is active and this is not the fullscreen slot
          if (fullscreenSlot !== null && fullscreenSlot !== index) return null

          const channel = selectedChannels[index]

          return (
            <div
              key={index}
              className="relative bg-zinc-900 rounded-lg overflow-hidden flex items-center justify-center"
              style={{ minHeight: fullscreenSlot !== null ? '100%' : layout === '2' ? 'calc(100vh - 60px)' : 'auto' }}
            >
              {channel ? (
                <MultiViewPlayer
                  channel={channel}
                  slotIndex={index}
                  isFullscreen={fullscreenSlot === index}
                  onRemove={() => handleRemoveChannel(index)}
                  onToggleFullscreen={() => handleToggleFullscreen(index)}
                  onChangeChannel={() => {
                    handleRemoveChannel(index)
                    setSelectingSlot(index)
                  }}
                />
              ) : (
                <button
                  onClick={() => setSelectingSlot(index)}
                  className="flex flex-col items-center justify-center gap-3 p-8 rounded-xl border-2 border-dashed border-zinc-700 hover:border-cyan-500 hover:bg-zinc-800/50 transition-all"
                >
                  <Plus className="w-12 h-12 text-zinc-500" />
                  <span className="text-zinc-500 text-sm">Add Channel</span>
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* Channel Selection Modal */}
      {selectingSlot !== null && (
        <div className="fixed inset-0 z-50 bg-black/90 flex flex-col">
          {/* Modal Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
            <h2 className="text-lg font-semibold">Select Channel for Slot {selectingSlot + 1}</h2>
            <button
              onClick={() => {
                setSelectingSlot(null)
                setSearchQuery('')
              }}
              className="p-2 hover:bg-zinc-800 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Search */}
          <div className="px-4 py-3 border-b border-zinc-800">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search channels..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-zinc-800 rounded-lg text-sm outline-none focus:ring-2 focus:ring-cyan-500"
                autoFocus
              />
            </div>
          </div>

          {/* Category Pills */}
          <div className="flex gap-2 px-4 py-2 overflow-x-auto scrollbar-hide border-b border-zinc-800">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-full text-xs whitespace-nowrap transition-all ${
                  selectedCategory === cat
                    ? 'bg-cyan-500 text-black'
                    : 'bg-zinc-800 text-gray-400 hover:bg-zinc-700'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Channel Grid */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
              {filteredChannels.map((channel, idx) => {
                // Check if already selected in another slot
                const isAlreadySelected = selectedChannels.some((c, i) => c?.id === channel.id && i !== selectingSlot)

                return (
                  <button
                    key={channel.id}
                    onClick={() => !isAlreadySelected && handleSelectChannel(channel)}
                    disabled={isAlreadySelected}
                    className={`rounded-2xl aspect-square flex flex-col items-center justify-between py-2 px-2 transition-all ${
                      isAlreadySelected
                        ? 'bg-zinc-800 opacity-50 cursor-not-allowed'
                        : 'bg-[#919191] hover:bg-cyan-600 cursor-pointer'
                    }`}
                  >
                    <span
                      className="text-white font-bold text-sm leading-none self-start z-10"
                      style={{ fontFamily: 'Roboto, sans-serif', WebkitTextStroke: '0.5px black' }}
                    >
                      {String(channel.channelNumber ?? idx + 1).padStart(3, '0')}
                    </span>
                    {channel.logo ? (
                      <img
                        src={channel.logo}
                        alt={channel.name}
                        className="w-10 h-10 object-contain drop-shadow-md"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                        <span className="text-white font-bold text-lg">{channel.name.charAt(0)}</span>
                      </div>
                    )}
                    <span
                      className="text-white text-[8px] font-semibold text-center leading-tight w-full truncate"
                      style={{ fontFamily: 'Roboto, sans-serif' }}
                    >
                      {channel.name}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
