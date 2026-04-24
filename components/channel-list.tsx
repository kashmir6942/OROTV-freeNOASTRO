"use client"

import { useState } from "react"
import type { Channel } from "@/data/types/channel"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Search, Play } from 'lucide-react'
import { useIsMobile } from "@/hooks/use-mobile"

interface ChannelListProps {
  channels: Channel[]
  currentChannel?: Channel
  onChannelSelect: (channel: Channel) => void
}

export function ChannelList({ channels, currentChannel, onChannelSelect }: ChannelListProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedGroup, setSelectedGroup] = useState<string>("All")
  const isMobile = useIsMobile()

  // Group channels by category
  const groupedChannels = channels.reduce(
    (groups, channel) => {
      const group = channel.group || "Other"
      if (!groups[group]) {
        groups[group] = []
      }
      groups[group].push(channel)
      return groups
    },
    {} as Record<string, Channel[]>,
  )

  const groups = ["All", ...Object.keys(groupedChannels).sort()]

  // Filter channels based on search and group
  const filteredChannels = channels.filter((channel) => {
    const matchesSearch = channel.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesGroup = selectedGroup === "All" || channel.group === selectedGroup
    return matchesSearch && matchesGroup
  })

  if (isMobile) {
    return null
  }

  return (
    <div className="hidden md:flex md:w-80 lg:w-80 xl:w-80 bg-background border-r-4 border-border flex-col">
      {/* Header */}
      <div className="p-4 border-b-4 border-border">
        <h2 className="brutalist-text-medium text-foreground mb-4 text-shadow-brutal">Sky Bronze CHANNELS</h2>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="SEARCH CHANNELS..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="brutalist-input pl-10 font-mono font-bold uppercase placeholder:text-muted-foreground"
          />
        </div>

        {/* Group filters */}
        <div className="flex flex-wrap gap-2">
          {groups.map((group) => (
            <Badge
              key={group}
              className={`cursor-pointer font-mono font-bold uppercase border-2 ${
                selectedGroup === group
                  ? "bg-accent text-accent-foreground border-accent"
                  : "bg-secondary text-secondary-foreground border-secondary hover:bg-accent hover:text-accent-foreground hover:border-accent"
              }`}
              onClick={() => setSelectedGroup(group)}
            >
              {group} ({group === "All" ? channels.length : groupedChannels[group]?.length || 0})
            </Badge>
          ))}
        </div>
      </div>

      {/* Channel list */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {filteredChannels.map((channel) => (
            <Button
              key={channel.id}
              className={`w-full justify-start p-3 mb-2 h-auto brutalist-card ${
                currentChannel?.id === channel.id
                  ? "bg-accent text-accent-foreground border-accent"
                  : "bg-card text-card-foreground border-border hover:bg-accent hover:text-accent-foreground hover:border-accent"
              }`}
              onClick={() => onChannelSelect(channel)}
            >
              <div className="flex items-center gap-3 w-full">
                <img
                  src={channel.logo || "/placeholder.svg"}
                  alt={channel.name}
                  className="w-10 h-10 object-cover flex-shrink-0 border-2 border-border"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement
                    target.src = "/placeholder.svg?height=40&width=40"
                  }}
                />
                <div className="flex-1 text-left">
                  <div className="font-mono font-bold uppercase truncate">{channel.name}</div>
                  <div className="font-mono text-xs text-muted-foreground uppercase">{channel.group}</div>
                </div>
                {currentChannel?.id === channel.id && <Play className="w-4 h-4 flex-shrink-0" />}
              </div>
            </Button>
          ))}
        </div>
      </ScrollArea>

      {/* Channel count */}
      <div className="p-4 border-t-4 border-border text-center brutalist-status-bar">
        {filteredChannels.length} CHANNELS AVAILABLE
      </div>
    </div>
  )
}
