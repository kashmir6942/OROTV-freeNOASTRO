"use client"

import { Download, Share } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface PlaylistActionsProps {
  playlist: any
  channels: any[]
  shareUrl: string
}

export default function PlaylistActions({ playlist, channels, shareUrl }: PlaylistActionsProps) {
  const generateM3UContent = () => {
    let m3uContent = "#EXTM3U\n"

    channels.forEach((channel) => {
      if (channel.license_key) {
        m3uContent += `#KODIPROP:inputstream.adaptive.license_key=${channel.license_key}\n`
      }
      m3uContent += `#EXTINF:-1 tvg-logo="${channel.logo_url || ""}" group-title="${channel.streaming_categories?.name || "Entertainment"}",${channel.name}\n`
      m3uContent += `${channel.stream_url}\n`
    })

    return m3uContent
  }

  const handleDownload = () => {
    const m3uContent = playlist.m3u8_content || generateM3UContent()

    if (!m3uContent || m3uContent === "#EXTM3U\n") {
      alert("No content available for download")
      return
    }

    const blob = new Blob([m3uContent], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${playlist.name.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.m3u`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleCopyUrl = async () => {
    try {
      const url = window.location.href
      await navigator.clipboard.writeText(url)
      alert("URL copied to clipboard!")
    } catch (error) {
      console.error("Failed to copy URL:", error)
      alert("Failed to copy URL")
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Download Playlist
          </CardTitle>
          <CardDescription>Get the M3U file for your device</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={handleDownload} className="w-full" disabled={channels.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Download M3U File
          </Button>
          <div className="text-xs text-muted-foreground">
            Compatible with VLC, Kodi, Smart TVs, and other media players
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Share className="h-5 w-5" />
            Share Playlist
          </CardTitle>
          <CardDescription>Share this playlist with others</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-3 bg-muted rounded-lg">
            <div className="text-xs text-muted-foreground mb-1">Playlist URL:</div>
            <div className="text-sm font-mono break-all">
              {typeof window !== "undefined" ? window.location.href : `https://localhost:3000/playlist/${shareUrl}`}
            </div>
          </div>
          <Button variant="outline" className="w-full bg-transparent" onClick={handleCopyUrl}>
            <Share className="h-4 w-4 mr-2" />
            Copy Share URL
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Playlist Info</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Created:</span>
            <span>{new Date(playlist.created_at).toLocaleDateString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Updated:</span>
            <span>{new Date(playlist.updated_at).toLocaleDateString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Format:</span>
            <span>M3U</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Active Channels:</span>
            <span>{channels.length}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
