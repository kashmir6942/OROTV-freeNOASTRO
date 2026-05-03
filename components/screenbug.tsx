"use client"

import type { Channel } from "@/data/types/channel"

/**
 * Screenbug overlay shown over the video.
 *
 * The overlay is rendered as an absolutely-positioned <img> with `inset-0`
 * so it ALWAYS stretches to the same width and height as the video element
 * underneath. The image itself is a transparent PNG sized to a 16:9 canvas,
 * so the logo stays in the correct on-screen corner regardless of how the
 * video is letter-/pillar-boxed by the player.
 *
 * `pointer-events-none` guarantees the overlay never intercepts taps or
 * keyboard events on the video controls.
 */

// Map channel IDs (and a few aliases) to their screenbug PNGs.
// Add new channels here without touching the player.
const SCREENBUG_BY_ID: Record<string, string> = {
  // Nickelodeon family
  "nickelodeon-cignal":
    "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Nickelodeon%20%28360p%29-oNKUBAonRTuHOwJwtod8ms7azBw5tN.png",
  "nickelodeon-global":
    "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Nickelodeon%20%28360p%29-oNKUBAonRTuHOwJwtod8ms7azBw5tN.png",
  nickjr:
    "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Nickelodeon%20%28360p%29-oNKUBAonRTuHOwJwtod8ms7azBw5tN.png",

  // JimJam
  jimjam:
    "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/JimJam%20%28576p%29-xCRFrpkZZkWncLwJ2BDktOw1E4raLH.png",

  // Cartoon Network family
  "cartoon-network":
    "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Cartoon%20Network%20%281080p%29-kcB7esFhnKTk0FKbczDjTH6dbOdgNE.png",
  "cartoon-cartoon-ph":
    "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Cartoon%20Network%20%281080p%29-kcB7esFhnKTk0FKbczDjTH6dbOdgNE.png",

  // Cartoonito
  cartoonito:
    "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Cartoonito%20%28720p%29-T1C7cuMXJDiefP8afbOMAXaSAWPtcu.png",

  // Channels with the larger "Light" bottom-left bug
  a2z:
    "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/A2Z%2C%20PBO%2C%20TMC%2C%20Celestial%20Movies%20Pinoy%2C%20Animal%20Planet%2C%20Disney%20Channel%2C%20Disney%20jr-MApE9t0P2H0wQIdEN72yl1wFnfVLsa.png",
  pbo:
    "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/A2Z%2C%20PBO%2C%20TMC%2C%20Celestial%20Movies%20Pinoy%2C%20Animal%20Planet%2C%20Disney%20Channel%2C%20Disney%20jr-MApE9t0P2H0wQIdEN72yl1wFnfVLsa.png",
  tmc:
    "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/A2Z%2C%20PBO%2C%20TMC%2C%20Celestial%20Movies%20Pinoy%2C%20Animal%20Planet%2C%20Disney%20Channel%2C%20Disney%20jr-MApE9t0P2H0wQIdEN72yl1wFnfVLsa.png",
  "celestial-movies-pinoy":
    "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/A2Z%2C%20PBO%2C%20TMC%2C%20Celestial%20Movies%20Pinoy%2C%20Animal%20Planet%2C%20Disney%20Channel%2C%20Disney%20jr-MApE9t0P2H0wQIdEN72yl1wFnfVLsa.png",
  "animal-planet":
    "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/A2Z%2C%20PBO%2C%20TMC%2C%20Celestial%20Movies%20Pinoy%2C%20Animal%20Planet%2C%20Disney%20Channel%2C%20Disney%20jr-MApE9t0P2H0wQIdEN72yl1wFnfVLsa.png",
  "disney-channel-eu":
    "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/A2Z%2C%20PBO%2C%20TMC%2C%20Celestial%20Movies%20Pinoy%2C%20Animal%20Planet%2C%20Disney%20Channel%2C%20Disney%20jr-MApE9t0P2H0wQIdEN72yl1wFnfVLsa.png",
  "disney-junior-eu":
    "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/A2Z%2C%20PBO%2C%20TMC%2C%20Celestial%20Movies%20Pinoy%2C%20Animal%20Planet%2C%20Disney%20Channel%2C%20Disney%20jr-MApE9t0P2H0wQIdEN72yl1wFnfVLsa.png",
}

// Default "Light" bug used for any channel not explicitly mapped above.
const DEFAULT_SCREENBUG =
  "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/The%20rest%20of%20the%20channels-mXunYFuf58MkugJXsdoZsQ21JQpsJG.png"

export function getScreenbugForChannel(channel: Pick<Channel, "id" | "name">): string {
  if (channel.id && SCREENBUG_BY_ID[channel.id]) {
    return SCREENBUG_BY_ID[channel.id]
  }
  // Heuristic fallback by name in case the id changes
  const name = (channel.name || "").toLowerCase()
  if (name.includes("nickelodeon") || name.includes("nick jr") || name.includes("nickjr")) {
    return SCREENBUG_BY_ID["nickelodeon-cignal"]
  }
  if (name.includes("jim jam") || name.includes("jimjam")) {
    return SCREENBUG_BY_ID.jimjam
  }
  if (name.includes("cartoonito")) {
    return SCREENBUG_BY_ID.cartoonito
  }
  if (name.includes("cartoon network")) {
    return SCREENBUG_BY_ID["cartoon-network"]
  }
  return DEFAULT_SCREENBUG
}

interface ScreenbugProps {
  channel: Pick<Channel, "id" | "name">
  className?: string
}

export function Screenbug({ channel, className = "" }: ScreenbugProps) {
  const src = getScreenbugForChannel(channel)
  return (
    <img
      src={src || "/placeholder.svg"}
      alt=""
      aria-hidden="true"
      draggable={false}
      className={`pointer-events-none absolute inset-0 w-full h-full object-fill select-none ${className}`}
      style={{
        // Mirror however the underlying <video> is sized so the logo stays
        // glued to the same on-screen corner as the broadcaster intends.
        zIndex: 5,
      }}
    />
  )
}
