export interface Channel {
  id: string
  channelNumber?: number
  name: string
  logo?: string
  category: string
  streamUrl?: string
  url?: string
  isHD?: boolean
  accessLevel?: "all" | "premium" | "basic"
  drmKeys?: Record<string, string>
  isM3u8?: boolean
  description?: string
  group?: string
  licenseKey?: string
  licenseType?: string
  manifestType?: string
  isHLS?: boolean
  drm?: {
    clearkey?: Record<string, string>
  }
  isExternal?: boolean
  externalUrl?: string
  watermark?: "watermark1" | "watermark2" | "default"
  episodes?: Array<{
    id: string
    number: number
    title: string
    url: string
    isExternal?: boolean
  }>
}

export interface User {
  username: string
  isPermanent: boolean
  expiresAt: string
}

export interface ChannelAnalytics {
  currentViewers: number
  peakViewers: number
  totalViews: number
}
