import type { Channel } from "../types/channel"

export function parseM3UContent(content: string): Channel[] {
  const lines = content.split("\n").filter((line) => line.trim())
  const channels: Channel[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()

    if (line.startsWith("#EXTINF:")) {
      const nextLine = lines[i + 1]?.trim()
      if (!nextLine || nextLine.startsWith("#")) continue

      // Extract channel info from EXTINF line
      const logoMatch = line.match(/tvg-logo="([^"]*)"/)
      const groupMatch = line.match(/group-title="([^"]*)"/)
      const nameMatch = line.match(/,\s*(.+)$/)

      // Extract license info from KODIPROP lines
      let licenseKey = ""
      let licenseType = ""
      let manifestType = ""

      // Look for KODIPROP lines before the URL
      let j = i + 1
      while (j < lines.length && lines[j].startsWith("#KODIPROP:")) {
        const kodipropLine = lines[j]

        if (kodipropLine.includes("license_key=")) {
          licenseKey = kodipropLine.split("license_key=")[1]
        }
        if (kodipropLine.includes("license_type=")) {
          licenseType = kodipropLine.split("license_type=")[1]
        }
        if (kodipropLine.includes("manifest_type=")) {
          manifestType = kodipropLine.split("manifest_type=")[1]
        }
        j++
      }

      const url = lines[j]?.trim()
      if (!url || url.startsWith("#")) continue

      const channel: Channel = {
        id: `channel-${channels.length + 1}`,
        name: nameMatch?.[1] || "Unknown Channel",
        logo: logoMatch?.[1] || "/placeholder.svg?height=64&width=64",
        url: url,
        group: groupMatch?.[1] || "Other",
        licenseKey: licenseKey || undefined,
        licenseType: licenseType || undefined,
        manifestType: manifestType || undefined,
        isHLS: url.includes(".m3u8"),
      }

      channels.push(channel)
      i = j // Skip to after the URL
    }
  }

  return channels
}

export function groupChannels(channels: Channel[]): Record<string, Channel[]> {
  return channels.reduce(
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
}
