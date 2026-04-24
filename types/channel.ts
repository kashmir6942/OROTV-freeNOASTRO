export interface Channel {
  id: string
  name: string
  url: string
  logo?: string
  category: string
  accessLevel: "all" | "premium" | "subscriber"
  drmKeys?: Record<string, string>
  isM3u8?: boolean
  isHD?: boolean
  drm?: {
    clearkey: Record<string, string>
  }
  description?: string
}

export interface User {
  username: string
  isPermanent: boolean
  expiresAt: string
}
