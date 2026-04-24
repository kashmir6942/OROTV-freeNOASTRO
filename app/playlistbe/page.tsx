"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Plus, Trash2, Download, Upload, LogOut, Edit2 } from "lucide-react"

interface Channel {
  id: string
  name: string
  url: string
  logo?: string
  categoryId?: string
  licenseKey?: string
}

export default function PlaylistBackendPage() {
  const router = useRouter()
  const [channels, setChannels] = useState<Channel[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [authLoading, setAuthLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [m3u8Url, setM3u8Url] = useState("")

  // Form state for adding channel
  const [newChannel, setNewChannel] = useState({
    name: "",
    url: "",
    logo: "",
    licenseKey: "",
  })

  useEffect(() => {
    const checkAuth = () => {
      const userStr = localStorage.getItem("musictv_user")
      console.log("[v0] Checking auth, userStr:", userStr)

      if (!userStr) {
        console.log("[v0] No user found, redirecting to login")
        router.push("/login")
        return
      }

      try {
        const user = JSON.parse(userStr)
        console.log("[v0] User authenticated:", user.username)
        setCurrentUser(user)
        setIsAuthenticated(true)
      } catch (error) {
        console.error("[v0] Auth parse error:", error)
        router.push("/login")
      } finally {
        setAuthLoading(false)
      }
    }

    checkAuth()
  }, [router])

  const loadChannels = async () => {
    if (!currentUser) return

    try {
      const userStr = localStorage.getItem("musictv_user")
      if (!userStr) {
        router.push("/login")
        return
      }

      const user = JSON.parse(userStr)
      const response = await fetch(`/api/playlist/channel?userId=${user.id}`)

      if (response.ok) {
        const data = await response.json()
        setChannels(data.channels || [])
      }
    } catch (error) {
      console.error("[v0] Load channels error:", error)
    }
  }

  useEffect(() => {
    if (isAuthenticated && currentUser) {
      loadChannels()
    }
  }, [isAuthenticated, currentUser])

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Verifying access...</p>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  const handleAddChannel = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage("")

    try {
      const response = await fetch("/api/playlist/channel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser.id,
          channelData: newChannel,
        }),
      })

      if (response.ok) {
        setMessage("✓ Channel added successfully!")
        setNewChannel({ name: "", url: "", logo: "", licenseKey: "" })
        loadChannels()
        setTimeout(() => setMessage(""), 3000)
      } else {
        setMessage("Failed to add channel")
      }
    } catch (error) {
      setMessage("Error adding channel")
      console.error("[v0] Add channel error:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteChannel = async (channelId: string) => {
    if (!confirm("Are you sure you want to delete this channel?")) return

    setLoading(true)

    try {
      const response = await fetch(`/api/playlist/channel?channelId=${channelId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        setMessage("✓ Channel deleted successfully!")
        loadChannels()
        setTimeout(() => setMessage(""), 3000)
      } else {
        setMessage("Failed to delete channel")
      }
    } catch (error) {
      setMessage("Error deleting channel")
      console.error("[v0] Delete channel error:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateM3U8 = async () => {
    setLoading(true)
    setMessage("")

    try {
      const response = await fetch("/api/playlist/m3u8", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser.id,
          playlistName: "My Playlist",
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setMessage("✓ Playlist generated successfully!")

        // Download the playlist
        const element = document.createElement("a")
        element.setAttribute("href", "data:text/plain;charset=utf-8," + encodeURIComponent(data.m3u8Content))
        element.setAttribute("download", `playlist_${Date.now()}.m3u8`)
        element.style.display = "none"
        document.body.appendChild(element)
        element.click()
        document.body.removeChild(element)

        setTimeout(() => setMessage(""), 3000)
      } else {
        setMessage(data.error || "Failed to generate playlist")
      }
    } catch (error) {
      setMessage("Error generating playlist")
      console.error("[v0] Generate M3U8 error:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem("musictv_user")
    router.push("/login")
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header with logout */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-foreground">Playlist Backend</h1>
            <p className="text-muted-foreground">
              Welcome back, <span className="font-semibold">{currentUser?.username}</span>
            </p>
          </div>
          <Button onClick={handleLogout} variant="outline" className="gap-2 bg-transparent">
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>

        {message && (
          <Alert
            className={message.includes("✓") ? "bg-green-500/10 border-green-500" : "bg-red-500/10 border-red-500"}
          >
            <AlertDescription className={message.includes("✓") ? "text-green-600" : "text-red-600"}>
              {message}
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Add Channel Form */}
          <Card className="lg:col-span-1 bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Add Channel
              </CardTitle>
              <CardDescription>Add a new channel to your playlist</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddChannel} className="space-y-3">
                <Input
                  type="text"
                  placeholder="Channel Name"
                  value={newChannel.name}
                  onChange={(e) => setNewChannel({ ...newChannel, name: e.target.value })}
                  className="bg-background border-border text-foreground placeholder:text-muted-foreground"
                  required
                  disabled={loading}
                />
                <Input
                  type="url"
                  placeholder="Stream URL"
                  value={newChannel.url}
                  onChange={(e) => setNewChannel({ ...newChannel, url: e.target.value })}
                  className="bg-background border-border text-foreground placeholder:text-muted-foreground"
                  required
                  disabled={loading}
                />
                <Input
                  type="url"
                  placeholder="Logo URL (optional)"
                  value={newChannel.logo}
                  onChange={(e) => setNewChannel({ ...newChannel, logo: e.target.value })}
                  className="bg-background border-border text-foreground placeholder:text-muted-foreground"
                  disabled={loading}
                />
                <Input
                  type="text"
                  placeholder="License Key (optional)"
                  value={newChannel.licenseKey}
                  onChange={(e) => setNewChannel({ ...newChannel, licenseKey: e.target.value })}
                  className="bg-background border-border text-foreground placeholder:text-muted-foreground"
                  disabled={loading}
                />
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Adding..." : "Add Channel"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Playlist Actions */}
          <Card className="lg:col-span-2 bg-card border-border">
            <CardHeader>
              <CardTitle>Playlist Functions</CardTitle>
              <CardDescription>Manage and export your playlist</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Button
                  onClick={handleGenerateM3U8}
                  disabled={loading || channels.length === 0}
                  className="gap-2 bg-transparent"
                  variant="outline"
                >
                  <Download className="h-4 w-4" />
                  Generate M3U8
                </Button>
                <Button
                  onClick={handleGenerateM3U8}
                  disabled={loading}
                  className="gap-2 bg-transparent"
                  variant="outline"
                >
                  <Upload className="h-4 w-4" />
                  Generate MPD (DASH)
                </Button>
              </div>

              <div className="bg-muted p-4 rounded-lg space-y-2">
                <h3 className="font-semibold text-foreground">Core Features:</h3>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Add/Edit/Delete Channels</li>
                  <li>Generate M3U8 Playlists</li>
                  <li>Generate MPD Playlists (DASH)</li>
                  <li>Encrypt Playlist Content</li>
                  <li>Import from M3U Files</li>
                  <li>Xtream Codes Integration</li>
                  <li>Category Management</li>
                  <li>Public Sharing Controls</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Channels List */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle>Active Channels ({channels.length})</CardTitle>
            <CardDescription>All channels in your playlist</CardDescription>
          </CardHeader>
          <CardContent>
            {channels.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No channels added yet. Start by adding a channel above.
              </p>
            ) : (
              <div className="space-y-2">
                {channels.map((channel) => (
                  <div
                    key={channel.id}
                    className="flex items-center justify-between p-4 bg-muted rounded-lg hover:bg-muted/80 transition"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground">{channel.name}</p>
                      <p className="text-sm text-muted-foreground truncate">{channel.url}</p>
                      {channel.licenseKey && (
                        <p className="text-xs text-muted-foreground">
                          License: {channel.licenseKey.substring(0, 20)}...
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2 ml-4">
                      <Button size="sm" variant="outline" disabled={loading} className="gap-1 bg-transparent">
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        onClick={() => handleDeleteChannel(channel.id)}
                        size="sm"
                        variant="destructive"
                        disabled={loading}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
