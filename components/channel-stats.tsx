"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { X, TrendingUp, Eye, Flame, Clock } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import type { Channel } from "@/data/types/channel"

interface ChannelStats {
  channelId: string
  viewCount: number
  currentViewers: number
  peakViewers: number
  avgWatchTime: number
}

interface ChannelStatsProps {
  isOpen: boolean
  onClose: () => void
  allChannels: Channel[]
  onChannelSelect: (channel: Channel) => void
}

export function ChannelStats({ isOpen, onClose, allChannels, onChannelSelect }: ChannelStatsProps) {
  const [stats, setStats] = useState<Map<string, ChannelStats>>(new Map())
  const [sortBy, setSortBy] = useState<'viewers' | 'views' | 'trending'>('viewers')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen) {
      loadStats()
      const interval = setInterval(loadStats, 10000)
      return () => clearInterval(interval)
    }
  }, [isOpen])

  const loadStats = async () => {
    try {
      setLoading(true)
      console.log('[v0] Fetching real-time channel analytics from Supabase...')
      
      const supabase = createClient()
      const { data, error } = await supabase
        .from('channel_analytics')
        .select('channel_id, view_count, total_viewers, peak_viewers, total_watch_time')
        .order('total_viewers', { ascending: false })
        .limit(50)

      if (error) {
        console.error('[v0] Error fetching channel analytics:', error)
        return
      }

      const statsMap = new Map<string, ChannelStats>()
      
      if (data && data.length > 0) {
        data.forEach((stat) => {
          statsMap.set(stat.channel_id, {
            channelId: stat.channel_id,
            viewCount: stat.view_count || 0,
            currentViewers: stat.total_viewers || 0,
            peakViewers: stat.peak_viewers || 0,
            avgWatchTime: stat.total_watch_time || 0,
          })
        })
        console.log('[v0] Loaded stats for', statsMap.size, 'channels from Supabase')
      }

      setStats(statsMap)
    } catch (error) {
      console.error('[v0] Error in loadStats:', error)
    } finally {
      setLoading(false)
    }
  }

  const getSortedChannels = () => {
    const channelsWithStats = allChannels
      .filter(ch => stats.has(ch.id))
      .map(ch => ({ channel: ch, stats: stats.get(ch.id)! }))

    switch (sortBy) {
      case 'viewers':
        return channelsWithStats.sort((a, b) => b.stats.currentViewers - a.stats.currentViewers)
      case 'views':
        return channelsWithStats.sort((a, b) => b.stats.viewCount - a.stats.viewCount)
      case 'trending':
        return channelsWithStats.sort((a, b) => {
          const aRatio = a.stats.currentViewers / a.stats.peakViewers
          const bRatio = b.stats.currentViewers / b.stats.peakViewers
          return bRatio - aRatio
        })
      default:
        return channelsWithStats
    }
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toString()
  }

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    if (hours > 0) return `${hours}h ${mins}m`
    return `${mins}m`
  }

  const handleChannelClick = (channel: Channel) => {
    onChannelSelect(channel)
    onClose()
  }

  if (!isOpen) return null

  const sortedChannels = getSortedChannels()

  return (
    <div className="fixed inset-0 bg-background/95 backdrop-blur-md flex items-center justify-center z-[60] p-4">
      <Card className="bg-card border-border w-full max-w-3xl max-h-[80vh] flex flex-col">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-foreground" />
            <h2 className="text-lg font-semibold text-foreground">Channel Statistics</h2>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 border-b border-border">
          <div className="flex gap-2">
            <button
              onClick={() => setSortBy('viewers')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                sortBy === 'viewers'
                  ? 'bg-foreground text-background'
                  : 'bg-secondary text-foreground hover:bg-secondary/80'
              }`}
            >
              <Eye className="w-3 h-3 inline mr-1" />
              Current Viewers
            </button>
            <button
              onClick={() => setSortBy('views')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                sortBy === 'views'
                  ? 'bg-foreground text-background'
                  : 'bg-secondary text-foreground hover:bg-secondary/80'
              }`}
            >
              Total Views
            </button>
            <button
              onClick={() => setSortBy('trending')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                sortBy === 'trending'
                  ? 'bg-foreground text-background'
                  : 'bg-secondary text-foreground hover:bg-secondary/80'
              }`}
            >
              <Flame className="w-3 h-3 inline mr-1" />
              Trending
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {sortedChannels.length === 0 ? (
            <div className="text-center py-12">
              <TrendingUp className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
              <p className="text-muted-foreground">No statistics available</p>
            </div>
          ) : (
            <div className="space-y-2">
              {sortedChannels.map(({ channel, stats }, idx) => (
                <button
                  key={channel.id}
                  onClick={() => handleChannelClick(channel)}
                  className="w-full p-3 rounded-lg border border-border bg-background hover:border-foreground/30 hover:bg-secondary/50 transition-all text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="text-lg font-bold text-muted-foreground w-6">
                      {idx + 1}
                    </div>
                    {channel.logo && (
                      <img
                        src={channel.logo}
                        alt={channel.name}
                        className="w-12 h-12 object-contain rounded"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{channel.name}</p>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        <div className="flex items-center gap-1">
                          <Eye className="w-3 h-3 text-muted-foreground" />
                          <span className="text-xs text-foreground font-medium">{formatNumber(stats.currentViewers)}</span>
                          <span className="text-xs text-muted-foreground">watching</span>
                        </div>
                        <span className="text-xs text-muted-foreground">•</span>
                        <span className="text-xs text-muted-foreground">{formatNumber(stats.viewCount)} views</span>
                        <span className="text-xs text-muted-foreground">•</span>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">{formatDuration(stats.avgWatchTime)} avg</span>
                        </div>
                      </div>
                    </div>
                    {idx < 3 && (
                      <div className={`text-xl ${idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}`}>
                        {idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-border">
          <p className="text-xs text-muted-foreground text-center">
            Stats update every 5 seconds • Showing top {sortedChannels.length} channels
          </p>
        </div>
      </Card>
    </div>
  )
}
