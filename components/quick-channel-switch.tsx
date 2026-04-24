"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { X, Search, Tv } from "lucide-react"
import type { Channel } from "@/data/types/channel"

interface QuickChannelSwitchProps {
  isOpen: boolean
  onClose: () => void
  allChannels: Channel[]
  onChannelSelect: (channel: Channel) => void
  currentChannel?: Channel | null
}

export function QuickChannelSwitch({ isOpen, onClose, allChannels, onChannelSelect, currentChannel }: QuickChannelSwitchProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [filteredChannels, setFilteredChannels] = useState<Channel[]>([])

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery("")
      setFilteredChannels([])
      return
    }

    if (searchQuery.trim() === "") {
      // Show first 20 channels when no search
      setFilteredChannels(allChannels.slice(0, 20))
    } else {
      // Filter channels by name or number
      const query = searchQuery.toLowerCase()
      const filtered = allChannels.filter(
        (ch) =>
          ch.name.toLowerCase().includes(query) ||
          ch.number?.toString().includes(query) ||
          ch.category?.toLowerCase().includes(query)
      ).slice(0, 20)
      setFilteredChannels(filtered)
    }
  }, [isOpen, searchQuery, allChannels])

  const handleChannelClick = (channel: Channel) => {
    onChannelSelect(channel)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-background/95 backdrop-blur-md flex items-center justify-center z-[60] p-4">
      <Card className="bg-card border-border w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Tv className="w-5 h-5 text-foreground" />
            <h2 className="text-lg font-semibold text-foreground">Quick Channel Switch</h2>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by channel name, number, or category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-secondary border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20"
              autoFocus
            />
          </div>
          {currentChannel && (
            <p className="text-xs text-muted-foreground mt-2">
              Currently watching: <span className="text-foreground font-medium">{currentChannel.name}</span>
            </p>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {filteredChannels.length === 0 ? (
            <div className="text-center py-12">
              <Tv className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
              <p className="text-muted-foreground">No channels found</p>
              <p className="text-xs text-muted-foreground mt-1">Try a different search term</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {filteredChannels.map((channel) => (
                <button
                  key={channel.id}
                  onClick={() => handleChannelClick(channel)}
                  className={`p-3 rounded-lg border transition-all text-left hover:border-foreground/30 hover:bg-secondary/50 ${
                    currentChannel?.id === channel.id
                      ? 'bg-foreground/10 border-foreground/30'
                      : 'border-border bg-background'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {channel.logo && (
                      <img
                        src={channel.logo}
                        alt={channel.name}
                        className="w-10 h-10 object-contain rounded"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{channel.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {channel.number && (
                          <span className="text-xs text-muted-foreground">#{channel.number}</span>
                        )}
                        {channel.category && (
                          <span className="text-xs text-muted-foreground">{channel.category}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-border">
          <p className="text-xs text-muted-foreground text-center">
            Press ESC to close • {filteredChannels.length} of {allChannels.length} channels
          </p>
        </div>
      </Card>
    </div>
  )
}
