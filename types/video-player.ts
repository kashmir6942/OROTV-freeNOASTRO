import type { Channel, User } from "@/data/types/channel"

export interface VideoPlayerProps {
  channel: Channel
  user: User
  onClose: () => void
  onChannelChange: (channelId: string) => void
  onLogout: () => void
  availableChannels: Channel[]
}
