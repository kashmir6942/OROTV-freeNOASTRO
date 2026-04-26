"use client"

import { useState, useEffect, useMemo } from "react"
import { allChannels } from "@/data/channels/all-channels"
import { VideoPlayer } from "@/components/video-player"
import { Search, Home, Layers, User, Play, X, Heart, Info, MoreVertical } from 'lucide-react'
import Image from "next/image"

export default function GeminizUIPage() {
  const [activeCategory, setActiveCategory] = useState("All")
  const [searchQuery, setSearchQuery] = useState("")
  const [showSearch, setShowSearch] = useState(false)
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null)
  const [favorites, setFavorites] = useState<string[]>([])
  
  const [featuredChannel, setFeaturedChannel] = useState(allChannels[0])

  useEffect(() => {
    // Pick a random channel from News or Sports as featured
    const featuredCandidates = allChannels.filter(c => c.category === 'News' || c.category === 'Sports')
    if (featuredCandidates.length > 0) {
      setFeaturedChannel(featuredCandidates[Math.floor(Math.random() * featuredCandidates.length)])
    }
  }, [])

  const toggleFavorite = (e: React.MouseEvent, channelId: string) => {
    e.stopPropagation()
    setFavorites(prev => 
      prev.includes(channelId) ? prev.filter(id => id !== channelId) : [...prev, channelId]
    )
  }

  const filteredChannels = useMemo(() => {
    let result = allChannels

    if (activeCategory === "Favorites") {
      result = result.filter(c => favorites.includes(c.id))
    } else if (activeCategory !== "All") {
      result = result.filter(c => c.category === activeCategory)
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(c => c.name.toLowerCase().includes(query))
    }

    return result
  }, [activeCategory, searchQuery, favorites])

  const categories = ['All', 'Favorites', 'Entertainment', 'Sports', 'Movies', 'Kids', 'News', 'Lifestyle']
  
  const channelsByCategory = useMemo(() => {
    return categories.filter(c => c !== 'All' && c !== 'Favorites').reduce((acc, cat) => {
      const channels = allChannels.filter(c => c.category === cat)
      if (channels.length > 0) {
        acc[cat] = channels
      }
      return acc
    }, {} as Record<string, typeof allChannels>)
  }, [])

  const recommendedChannels = useMemo(() => {
    return allChannels.filter(c => c.category === 'Movies' || c.category === 'Entertainment').slice(0, 5)
  }, [])

  const handleChannelClick = (channelId: string) => {
    setSelectedChannel(channelId)
  }

  const currentChannel = selectedChannel ? allChannels.find(c => c.id === selectedChannel) : null

  return (
    <div className="min-h-screen bg-[#0b0c10] text-white font-sans pb-24 selection:bg-[#6aaadd] selection:text-white">
      {/* Video Player Overlay */}
      {currentChannel && (
        <div className="fixed inset-0 z-[100] bg-black animate-in fade-in duration-300">
          <VideoPlayer
            channel={currentChannel}
            availableChannels={allChannels}
            onClose={() => setSelectedChannel(null)}
            onChannelChange={handleChannelClick}
            isMobile={true}
          />
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0b0c10]/80 backdrop-blur-xl border-b border-white/5 pt-safe-top transition-all duration-300">
        <div className="flex items-center justify-between px-4 h-[54px]">
          <div className="h-8 relative flex items-center gap-2">
             <img 
               src="/images/light-logo.png" 
               alt="Light TV" 
               className="h-full object-contain"
             />
          </div>
          <div className="flex items-center gap-3">
             <button onClick={() => setShowSearch(true)} className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center active:scale-95 transition-transform">
                <Search className="w-4 h-4 text-white" />
             </button>
             <div className="w-9 h-9 bg-gradient-to-br from-[#6aaadd] to-[#4a88bb] rounded-full flex items-center justify-center text-xs font-bold shadow-lg shadow-blue-500/20">
               CC
             </div>
          </div>
        </div>
        
        {/* Tab Scroller */}
        <div className="flex overflow-x-auto px-4 gap-2 h-12 items-center scrollbar-hide mask-linear-fade">
          {categories.map(cat => (
            <button 
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-1.5 rounded-full text-[0.85rem] font-medium whitespace-nowrap transition-all duration-200 ${
                activeCategory === cat 
                  ? 'bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.3)] scale-105' 
                  : 'bg-white/5 text-[#9ca3af] hover:bg-white/10'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </header>

      {/* Main Content */}
      <main className="p-0 space-y-8">
        {/* Hero Section - Only show on 'All' tab */}
        {activeCategory === 'All' && !searchQuery && featuredChannel && (
          <div className="relative w-full aspect-[4/3] sm:aspect-video group cursor-pointer overflow-hidden" onClick={() => handleChannelClick(featuredChannel.id)}>
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0b0c10]/20 to-[#0b0c10] z-10" />
            <img 
              src={featuredChannel.logo || "/placeholder.svg"} 
              className="w-full h-full object-cover opacity-60 scale-105 group-hover:scale-110 transition-transform duration-700"
              alt="Featured"
            />
            <div className="absolute inset-0 z-20 flex flex-col justify-end p-5 pb-8">
              <div className="flex items-center gap-2 mb-2">
                <span className="bg-[#e50914] text-white text-[0.65rem] font-black px-2 py-0.5 rounded shadow-lg shadow-red-600/20 animate-pulse">
                  LIVE
                </span>
                <span className="bg-white/20 backdrop-blur-md text-white text-[0.65rem] font-bold px-2 py-0.5 rounded border border-white/10">
                  HD
                </span>
              </div>
              <h2 className="text-3xl font-black mb-1 drop-shadow-xl leading-tight">{featuredChannel.name}</h2>
              <p className="text-sm text-gray-200 mb-4 drop-shadow-md line-clamp-1 opacity-90">
                Streaming live coverage • {featuredChannel.category}
              </p>
              <div className="flex gap-3">
                <button className="bg-white text-black border-0 px-6 py-2.5 rounded-lg font-bold text-sm flex items-center gap-2 hover:bg-gray-200 active:scale-95 transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)]">
                  <Play className="w-4 h-4 fill-current" /> Watch Now
                </button>
                <button 
                  className="bg-white/10 backdrop-blur-md text-white border border-white/10 px-3 py-2.5 rounded-lg hover:bg-white/20 active:scale-95 transition-all"
                  onClick={(e) => toggleFavorite(e, featuredChannel.id)}
                >
                  <Heart className={`w-5 h-5 ${favorites.includes(featuredChannel.id) ? 'fill-[#e50914] text-[#e50914]' : ''}`} />
                </button>
              </div>
            </div>
          </div>
        )}

        {activeCategory === 'All' && !searchQuery && (
          <div className="px-0">
            <div className="flex justify-between items-baseline px-5 mb-3">
              <h3 className="text-[1.1rem] font-bold text-white flex items-center gap-2">
                <span className="w-1 h-4 bg-[#6aaadd] rounded-full"></span>
                Recommended For You
              </h3>
            </div>
            <div className="flex overflow-x-auto px-5 gap-4 scrollbar-hide snap-x snap-mandatory pb-4">
              {recommendedChannels.map(channel => (
                <div 
                  key={channel.id} 
                  className="flex-none w-[260px] snap-start relative aspect-video bg-[#1a1d26] rounded-xl overflow-hidden cursor-pointer group border border-white/5 shadow-lg"
                  onClick={() => handleChannelClick(channel.id)}
                >
                  <img 
                    src={channel.logo || "/placeholder.svg"} 
                    alt={channel.name}
                    className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent p-3 flex flex-col justify-end">
                    <span className="text-white font-bold text-lg">{channel.name}</span>
                    <span className="text-white/60 text-xs">{channel.category}</span>
                  </div>
                  <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                    <Play className="w-3 h-3 fill-white text-white" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Channel Feeds */}
        <div className="space-y-8 pb-8">
          {activeCategory === 'All' && !searchQuery ? (
            // Grouped View
            Object.entries(channelsByCategory).map(([category, channels]) => (
              <div key={category} className="">
                <div className="flex justify-between items-baseline px-5 mb-3">
                  <h3 className="text-[1.1rem] font-bold text-white flex items-center gap-2">
                    <span className="w-1 h-4 bg-[#6aaadd] rounded-full"></span>
                    {category}
                  </h3>
                  <span className="text-xs text-[#6aaadd] font-medium cursor-pointer hover:text-white transition-colors">View All</span>
                </div>
                <div className="flex overflow-x-auto px-5 gap-3 scrollbar-hide snap-x snap-mandatory">
                  {channels.map(channel => (
                    <div 
                      key={channel.id} 
                      className="flex-none w-[150px] snap-start flex flex-col gap-2 cursor-pointer group"
                      onClick={() => handleChannelClick(channel.id)}
                    >
                      <div className="w-full aspect-video bg-[#1a1d26] rounded-xl flex items-center justify-center relative border border-white/5 overflow-hidden group-active:scale-95 transition-all shadow-md group-hover:shadow-[#6aaadd]/10 group-hover:border-[#6aaadd]/30">
                        <img 
                          src={channel.logo || "/placeholder.svg"} 
                          alt={channel.name}
                          className="w-[70%] h-[70%] object-contain drop-shadow-lg"
                          loading="lazy"
                        />
                        <button 
                          className="absolute top-2 right-2 p-1.5 rounded-full bg-black/40 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/60"
                          onClick={(e) => toggleFavorite(e, channel.id)}
                        >
                          <Heart className={`w-3.5 h-3.5 ${favorites.includes(channel.id) ? 'fill-[#e50914] text-[#e50914]' : 'text-white'}`} />
                        </button>
                      </div>
                      <div className="px-1">
                        <span className="text-[0.9rem] font-semibold text-white block truncate group-hover:text-[#6aaadd] transition-colors">{channel.name}</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-[#e50914] animate-pulse" />
                          <span className="text-[0.75rem] text-[#9ca3af]">Live</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          ) : (
            // Filtered Grid View
            <div className="px-4 min-h-[50vh]">
              <div className="flex justify-between items-baseline mb-4">
                <h3 className="text-[1.1rem] font-bold flex items-center gap-2">
                  {searchQuery ? 'Search Results' : activeCategory === 'Favorites' ? 'My Favorites' : `${activeCategory} Channels`}
                  <span className="text-sm font-normal text-gray-500 ml-2">({filteredChannels.length})</span>
                </h3>
              </div>
              
              {filteredChannels.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {filteredChannels.map(channel => (
                    <div 
                      key={channel.id} 
                      className="flex flex-col gap-2 cursor-pointer group"
                      onClick={() => handleChannelClick(channel.id)}
                    >
                      <div className="w-full aspect-video bg-[#1a1d26] rounded-xl flex items-center justify-center relative border border-white/5 overflow-hidden group-active:scale-95 transition-all shadow-md group-hover:border-[#6aaadd]/30">
                        <img 
                          src={channel.logo || "/placeholder.svg"} 
                          alt={channel.name}
                          className="w-[70%] h-[70%] object-contain"
                          loading="lazy"
                        />
                        <button 
                          className="absolute top-2 right-2 p-1.5 rounded-full bg-black/40 backdrop-blur-sm hover:bg-black/60 transition-colors"
                          onClick={(e) => toggleFavorite(e, channel.id)}
                        >
                          <Heart className={`w-3.5 h-3.5 ${favorites.includes(channel.id) ? 'fill-[#e50914] text-[#e50914]' : 'text-white'}`} />
                        </button>
                      </div>
                      <div className="px-1">
                        <span className="text-[0.9rem] font-semibold text-white block truncate">{channel.name}</span>
                        <span className="text-[0.75rem] text-[#9ca3af] mt-0.5 block">Live • {channel.category}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="w-16 h-16 bg-[#1a1d26] rounded-full flex items-center justify-center mb-4">
                    {activeCategory === 'Favorites' ? <Heart className="w-8 h-8 text-gray-600" /> : <Search className="w-8 h-8 text-gray-600" />}
                  </div>
                  <h3 className="text-lg font-bold text-white mb-1">No channels found</h3>
                  <p className="text-gray-500 text-sm">
                    {activeCategory === 'Favorites' ? "Mark channels as favorites to see them here." : "Try adjusting your search or category."}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Search Overlay */}
      {showSearch && (
        <div className="fixed inset-0 bg-[#0b0c10]/95 backdrop-blur-xl z-[60] flex flex-col pt-safe-top animate-in fade-in duration-200">
          <div className="p-4 border-b border-white/10 flex gap-3">
            <div className="flex-1 bg-[#1a1d26] rounded-xl flex items-center px-4 h-12 border border-white/5 focus-within:border-[#6aaadd]/50 transition-colors">
              <Search className="w-5 h-5 text-[#666]" />
              <input 
                type="text" 
                placeholder="Find channels, shows, movies..." 
                className="bg-transparent border-none text-white p-3 flex-1 text-base outline-none placeholder:text-[#666]"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")}>
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              )}
            </div>
            <button 
              onClick={() => {
                setShowSearch(false)
                setSearchQuery("")
              }}
              className="bg-transparent border-none text-white font-medium px-2"
            >
              Cancel
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {!searchQuery && (
              <div className="mb-6">
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Suggested</h4>
                <div className="flex flex-wrap gap-2">
                  {['News', 'Sports', 'Movies', 'Kids'].map(term => (
                    <button 
                      key={term}
                      onClick={() => setSearchQuery(term)}
                      className="px-4 py-2 bg-[#1a1d26] rounded-lg text-sm font-medium text-gray-300 hover:bg-[#252a36] transition-colors"
                    >
                      {term}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-3 gap-4">
              {(searchQuery ? filteredChannels : []).map(channel => (
                <div 
                  key={channel.id} 
                  className="flex flex-col gap-2 cursor-pointer group"
                  onClick={() => {
                    handleChannelClick(channel.id)
                    setShowSearch(false)
                  }}
                >
                  <div className="w-full aspect-square bg-[#1a1d26] rounded-xl flex items-center justify-center border border-white/5 p-4 group-hover:border-[#6aaadd]/30 transition-colors">
                    <img 
                      src={channel.logo || "/placeholder.svg"} 
                      alt={channel.name}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <span className="text-xs text-center truncate text-gray-300 group-hover:text-white">{channel.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 w-full h-[70px] bg-[#0b0c10]/90 backdrop-blur-lg border-t border-white/5 flex justify-around items-center z-50 pb-safe-bottom">
        <button 
          className={`flex flex-col items-center gap-1.5 w-[60px] bg-transparent border-none transition-colors ${!showSearch && activeCategory !== 'Favorites' ? 'text-white' : 'text-[#666]'}`}
          onClick={() => {
            setShowSearch(false)
            setActiveCategory('All')
          }}
        >
          <Home className={`w-5 h-5 ${!showSearch && activeCategory !== 'Favorites' ? 'text-[#6aaadd] fill-[#6aaadd]/20' : ''}`} />
          <span className="text-[0.65rem] font-medium">Home</span>
        </button>
        <button 
          className={`flex flex-col items-center gap-1.5 w-[60px] bg-transparent border-none transition-colors ${showSearch ? 'text-white' : 'text-[#666]'}`}
          onClick={() => setShowSearch(true)}
        >
          <Search className={`w-5 h-5 ${showSearch ? 'text-[#6aaadd]' : ''}`} />
          <span className="text-[0.65rem] font-medium">Search</span>
        </button>
        <button 
          className={`flex flex-col items-center gap-1.5 w-[60px] bg-transparent border-none transition-colors ${activeCategory === 'Favorites' ? 'text-white' : 'text-[#666]'}`}
          onClick={() => {
            setShowSearch(false)
            setActiveCategory('Favorites')
          }}
        >
          <Heart className={`w-5 h-5 ${activeCategory === 'Favorites' ? 'text-[#6aaadd] fill-[#6aaadd]/20' : ''}`} />
          <span className="text-[0.65rem] font-medium">Favorites</span>
        </button>
        <button className="flex flex-col items-center gap-1.5 w-[60px] bg-transparent border-none text-[#666]">
          <User className="w-5 h-5" />
          <span className="text-[0.65rem] font-medium">Profile</span>
        </button>
      </nav>
    </div>
  )
}
