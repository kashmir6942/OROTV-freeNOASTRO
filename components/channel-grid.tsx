"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Play, Users, Search, Filter, Shield, Hand as Hd } from "lucide-react"
import type { Channel, User } from "@/types/channel"

interface ChannelGridProps {
  channels: Channel[]
  onChannelSelect: (channel: Channel) => void
  user: User // Added user prop for authentication context
}

export function ChannelGrid({ channels, onChannelSelect, user }: ChannelGridProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")

  // Guard against undefined channels
  const safeChannels = Array.isArray(channels) ? channels : []
  const categories = ["all", ...Array.from(new Set(safeChannels.map((ch) => ch.category)))]

  const filteredChannels = safeChannels.filter((channel) => {
    const matchesSearch = channel.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === "all" || channel.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  return (
    <div className="space-y-6">
      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4 animate-in slide-in-from-top-2 duration-500">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4 transition-colors duration-300" />
          <Input
            placeholder="Search channels..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-gray-800/50 border-gray-700 text-foreground placeholder-muted-foreground h-10 landscape:h-8 landscape:text-sm transition-all duration-300 focus:scale-[1.02] focus:shadow-lg focus:shadow-blue-500/20"
          />
        </div>
        <div className="flex items-center space-x-2">
          <Filter className="h-4 w-4 text-muted-foreground landscape:h-3 landscape:w-3 transition-colors duration-300" />
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-48 landscape:w-36 bg-gray-800/50 border-gray-700 text-foreground landscape:h-8 landscape:text-sm transition-all duration-300 hover:border-blue-500/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700">
              {categories.map((category) => (
                <SelectItem
                  key={category}
                  value={category}
                  className="text-foreground hover:bg-gray-700 transition-colors duration-200"
                >
                  {category === "all" ? "All Categories" : category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Channel Stats */}
      <div className="flex items-center justify-between text-foreground animate-in slide-in-from-left-2 duration-500 delay-150">
        <h2 className="text-2xl font-bold">{selectedCategory === "all" ? "All Channels" : selectedCategory}</h2>
        <div className="text-sm text-muted-foreground">
          {filteredChannels.length} of {safeChannels.length} channels
        </div>
      </div>

      {/* Channel Grid */}
      <div className="grid grid-cols-1 mobile-landscape:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-8 landscape:gap-4">
        {filteredChannels.map((channel, index) => {
          const viewerCount = Math.floor(Math.random() * 50000) + 1000
          const isPopular = viewerCount > 25000

          return (
            <Card
              key={channel.id}
              className="group bg-gray-800/50 border-gray-700 hover:border-blue-500/50 transition-all duration-500 hover:scale-105 hover:shadow-2xl hover:shadow-blue-500/20 cursor-pointer animate-in fade-in-0 zoom-in-95"
              style={{
                animationDelay: `${index * 100}ms`,
                animationDuration: "600ms",
              }}
              onClick={() => onChannelSelect(channel)}
            >
              <CardContent className="p-6 landscape:p-4">
                <div className="relative mb-4 landscape:mb-2 overflow-hidden rounded-lg">
                  <img
                    src={channel.logo || "/placeholder.svg?height=120&width=200&text=" + channel.name}
                    alt={channel.name}
                    className="w-full h-40 landscape:h-24 object-cover rounded-lg transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500 rounded-lg flex items-center justify-center">
                    <Button className="bg-blue-600 hover:bg-blue-700 landscape:text-xs landscape:px-2 landscape:py-1 transform scale-90 group-hover:scale-100 transition-all duration-300 shadow-lg">
                      <Play className="h-4 w-4 mr-2 landscape:h-3 landscape:w-3 landscape:mr-1 animate-pulse" />
                      Watch Live
                    </Button>
                  </div>
                  {isPopular && (
                    <Badge className="absolute top-2 right-2 landscape:top-1 landscape:right-1 bg-red-600 text-foreground text-sm landscape:text-xs animate-pulse shadow-lg">
                      HOT
                    </Badge>
                  )}
                  <div className="absolute top-2 left-2 landscape:top-1 landscape:left-1 flex space-x-1">
                    {channel.isHD && (
                      <Badge className="bg-green-600 text-foreground text-sm landscape:text-xs flex items-center space-x-1 shadow-lg shadow-green-500/30 animate-in slide-in-from-left-2 duration-500">
                        <Hd className="h-3 w-3 landscape:h-2 landscape:w-2" />
                        <span>HD</span>
                      </Badge>
                    )}
                    {channel.drm && (
                      <Badge className="bg-yellow-600 text-foreground text-sm landscape:text-xs flex items-center space-x-1 shadow-lg shadow-yellow-500/30 animate-in slide-in-from-left-2 duration-500 delay-100">
                        <Shield className="h-3 w-3 landscape:h-2 landscape:w-2" />
                        <span>DRM</span>
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="space-y-2 landscape:space-y-1">
                  <h3 className="font-bold text-foreground text-xl landscape:text-lg truncate group-hover:text-blue-400 transition-colors duration-300">
                    {channel.name}
                  </h3>
                  <p className="text-muted-foreground text-base landscape:text-sm">{channel.category}</p>
                  {channel.description && (
                    <p className="text-muted-foreground text-sm landscape:text-xs truncate">{channel.description}</p>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-muted-foreground text-base landscape:text-sm group-hover:text-blue-400 transition-colors duration-300">
                      <Users className="h-4 w-4 landscape:h-3 landscape:w-3" />
                      <span className="tabular-nums">{viewerCount.toLocaleString()}</span>
                    </div>
                    <Badge
                      variant="outline"
                      className={`transition-all duration-300 landscape:text-xs ${
                        channel.accessLevel === "all"
                          ? "border-green-500 text-green-400 hover:shadow-green-500/30 hover:shadow-lg"
                          : channel.accessLevel === "premium"
                            ? "border-yellow-500 text-yellow-400 hover:shadow-yellow-500/30 hover:shadow-lg"
                            : "border-blue-500 text-blue-400 hover:shadow-blue-500/30 hover:shadow-lg"
                      }`}
                    >
                      {channel.accessLevel.toUpperCase()}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {filteredChannels.length === 0 && (
        <div className="text-center py-12 animate-in fade-in-0 zoom-in-95 duration-700">
          <div className="text-6xl mb-4 animate-bounce">📺</div>
          <div className="text-muted-foreground text-lg mb-2">No channels found</div>
          <div className="text-muted-foreground text-sm">Try adjusting your search or filter criteria</div>
        </div>
      )}
    </div>
  )
}
