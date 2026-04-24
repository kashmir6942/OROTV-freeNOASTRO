"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { createClient } from "@/lib/supabase/client"
import {
  Plus,
  Download,
  Upload,
  Trash2,
  Copy,
  CheckCircle,
  User,
  List,
  FolderOpen,
  AlertCircle,
  Radio,
  FileText,
  Share2,
  Search,
  Edit,
  TestTube,
  FileSpreadsheet,
  FolderPlus,
  ClipboardCopy,
  CheckSquare,
  Square,
} from "lucide-react"

interface Channel {
  id: string
  name: string
  logo_url?: string
  stream_url: string
  license_key?: string
  category_id?: string
  category_name?: string
  created_by: string
  created_at: string
}

interface Category {
  id: string
  name: string
  description?: string
}

interface Playlist {
  id: string
  name: string
  description?: string
  created_by: string
  is_public: boolean
  share_url?: string
  channel_count: number
  created_at: string
  m3u8_content?: string
  mpd_content?: string
}

export default function PlaylistCreator() {
  const [username, setUsername] = useState("")
  const [isUsernameSet, setIsUsernameSet] = useState(false)

  const [activeView, setActiveView] = useState<"channels" | "playlists">("channels")
  const [channels, setChannels] = useState<Channel[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null)

  const [newChannel, setNewChannel] = useState({
    name: "",
    logo_url: "",
    stream_url: "",
    license_key: "",
    category_id: "",
  })

  const [importUrl, setImportUrl] = useState("")

  const [newPlaylist, setNewPlaylist] = useState({
    name: "",
    description: "",
    is_public: false,
    selected_channels: [] as string[],
  })

  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [sortBy, setSortBy] = useState<"name" | "date" | "category">("date")
  const [selectedChannels, setSelectedChannels] = useState<string[]>([])
  const [editingChannel, setEditingChannel] = useState<Channel | null>(null)
  const [editingPlaylist, setEditingPlaylist] = useState<Playlist | null>(null)
  const [testingChannel, setTestingChannel] = useState<string | null>(null)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)
  const [newCategory, setNewCategory] = useState({ name: "", description: "" })
  const [showCategoryManager, setShowCategoryManager] = useState(false)

  useEffect(() => {
    if (isUsernameSet && username) {
      loadData()
    }
  }, [isUsernameSet, username])

  const handleUsernameSubmit = () => {
    if (username.trim().length < 3) {
      alert("Username must be at least 3 characters long")
      return
    }
    setIsUsernameSet(true)
    console.log("[v0] Username set:", username)
  }

  const loadData = async () => {
    if (!username) return

    const supabase = createClient()
    setIsLoading(true)

    try {
      console.log("[v0] Loading data for user:", username)

      const { data: categoriesData, error: categoriesError } = await supabase
        .from("streaming_categories")
        .select("*")
        .order("name")

      if (categoriesError) throw categoriesError

      const { data: channelsData, error: channelsError } = await supabase
        .from("streaming_channels")
        .select(`
          *,
          streaming_categories(id, name)
        `)
        .order("created_at", { ascending: false })

      if (channelsError) throw channelsError

      // In production, you'd add a proper created_by column
      const userChannels =
        channelsData?.filter((ch) => ch.license_key?.startsWith(`USER:${username}:`) || ch.license_key === null) || []

      const { data: playlistsData, error: playlistsError } = await supabase
        .from("streaming_playlists")
        .select(`
          *,
          playlist_channels(id)
        `)
        .order("created_at", { ascending: false })

      if (playlistsError) throw playlistsError

      const userPlaylists = playlistsData?.filter((pl) => pl.description?.startsWith(`USER:${username}`)) || []

      console.log("[v0] Data loaded:", {
        categories: categoriesData?.length || 0,
        channels: userChannels.length,
        playlists: userPlaylists.length,
      })

      setCategories(categoriesData || [])
      setChannels(
        userChannels.map((channel) => ({
          ...channel,
          category_name: channel.streaming_categories?.name || "Uncategorized",
          created_by: username,
        })),
      )
      setPlaylists(
        userPlaylists.map((playlist) => ({
          ...playlist,
          channel_count: playlist.playlist_channels?.length || 0,
          created_by: username,
        })),
      )
    } catch (error: any) {
      console.error("[v0] Error loading data:", error)
      alert(`Failed to load data: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  const addChannel = async () => {
    if (!newChannel.name || !newChannel.stream_url) {
      alert("Please fill in channel name and stream URL")
      return
    }

    if (checkDuplicateUrl(newChannel.stream_url)) {
      alert("This stream URL already exists for another channel.")
      return
    }

    const supabase = createClient()
    try {
      const userLicenseKey = newChannel.license_key ? `USER:${username}:${newChannel.license_key}` : `USER:${username}:`

      const { error } = await supabase.from("streaming_channels").insert([
        {
          name: newChannel.name,
          logo_url: newChannel.logo_url || null,
          stream_url: newChannel.stream_url,
          license_key: userLicenseKey,
          category_id: newChannel.category_id || null,
          is_active: true,
        },
      ])

      if (error) throw error

      console.log("[v0] Channel added successfully")
      setNewChannel({
        name: "",
        logo_url: "",
        stream_url: "",
        license_key: "",
        category_id: "",
      })
      await loadData()
      alert("Channel added successfully!")
    } catch (error: any) {
      console.error("[v0] Error adding channel:", error)
      alert(`Failed to add channel: ${error.message}`)
    }
  }

  const importM3U = async () => {
    if (!importUrl) {
      alert("Please provide an M3U URL")
      return
    }

    try {
      console.log("[v0] Fetching M3U from:", importUrl)
      const response = await fetch(importUrl)
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)

      const m3uContent = await response.text()
      const parsedChannels = parseM3U8(m3uContent)

      if (parsedChannels.length === 0) {
        alert("No valid channels found in M3U file")
        return
      }

      const supabase = createClient()

      const channelsToInsert = parsedChannels.map((ch) => ({
        ...ch,
        license_key: ch.license_key ? `USER:${username}:${ch.license_key}` : `USER:${username}:`,
      }))

      const { error } = await supabase.from("streaming_channels").insert(channelsToInsert)

      if (error) throw error

      setImportUrl("")
      await loadData()
      alert(`Successfully imported ${parsedChannels.length} channels!`)
    } catch (error: any) {
      console.error("[v0] Error importing M3U:", error)
      alert(`Failed to import: ${error.message}`)
    }
  }

  const parseM3U8 = (content: string) => {
    const lines = content
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
    const channels: any[] = []
    let currentChannel: any = {}
    let currentLicenseKey = ""

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]

      if (line.startsWith("#EXTINF:")) {
        const nameMatch = line.match(/,(.+)$/)
        const logoMatch = line.match(/tvg-logo="([^"]+)"/)
        const groupMatch = line.match(/group-title="([^"]+)"/)

        currentChannel = {
          name: nameMatch ? nameMatch[1].trim() : `Channel ${channels.length + 1}`,
          logo_url: logoMatch ? logoMatch[1] : null,
          category_name: groupMatch ? groupMatch[1] : "Entertainment",
        }
      } else if (line.startsWith("#KODIPROP:inputstream.adaptive.license_key=")) {
        const licenseMatch = line.match(/license_key=(.+)$/)
        if (licenseMatch) currentLicenseKey = licenseMatch[1]
      } else if (line.startsWith("http")) {
        if (currentChannel.name) {
          channels.push({
            name: currentChannel.name,
            logo_url: currentChannel.logo_url,
            stream_url: line,
            license_key: currentLicenseKey || null,
            is_active: true,
          })
          currentChannel = {}
          currentLicenseKey = ""
        }
      }
    }

    return channels
  }

  const addCategory = async () => {
    if (!newCategory.name) {
      alert("Please provide a category name")
      return
    }

    const supabase = createClient()
    try {
      const { error } = await supabase.from("streaming_categories").insert([
        {
          name: newCategory.name,
          description: newCategory.description || null,
        },
      ])

      if (error) throw error

      setNewCategory({ name: "", description: "" })
      await loadData()
      alert("Category added successfully!")
    } catch (error: any) {
      console.error("[v0] Error adding category:", error)
      alert(`Failed to add category: ${error.message}`)
    }
  }

  const deleteCategory = async (categoryId: string) => {
    if (!confirm("Delete this category? Channels in this category will become uncategorized.")) return

    const supabase = createClient()
    try {
      const { error } = await supabase.from("streaming_categories").delete().eq("id", categoryId)
      if (error) throw error
      await loadData()
      alert("Category deleted successfully!")
    } catch (error: any) {
      console.error("[v0] Error deleting category:", error)
      alert(`Failed to delete category: ${error.message}`)
    }
  }

  const createPlaylist = async () => {
    if (!newPlaylist.name) {
      alert("Please provide a playlist name")
      return
    }

    const supabase = createClient()
    try {
      const shareUrl = `${username}-${Date.now()}`

      const { data: playlist, error: playlistError } = await supabase
        .from("streaming_playlists")
        .insert([
          {
            name: newPlaylist.name,
            description: `USER:${username}|${newPlaylist.description}`,
            is_public: newPlaylist.is_public,
            share_url: shareUrl,
          },
        ])
        .select()
        .single()

      if (playlistError) throw playlistError

      if (newPlaylist.selected_channels.length > 0) {
        const playlistChannels = newPlaylist.selected_channels.map((channelId, index) => ({
          playlist_id: playlist.id,
          channel_id: channelId,
          channel_order: index,
        }))

        const { error: channelError } = await supabase.from("playlist_channels").insert(playlistChannels)

        if (channelError) throw channelError
      }

      setNewPlaylist({
        name: "",
        description: "",
        is_public: false,
        selected_channels: [],
      })
      await loadData()
      alert("Playlist created successfully!")
    } catch (error: any) {
      console.error("[v0] Error creating playlist:", error)
      alert(`Failed to create playlist: ${error.message}`)
    }
  }

  const generateM3U = async (playlistId?: string) => {
    const supabase = createClient()

    try {
      let channelsToInclude = channels

      if (playlistId) {
        const { data: playlistChannels, error } = await supabase
          .from("playlist_channels")
          .select(`
            channel_order,
            streaming_channels!inner(*)
          `)
          .eq("playlist_id", playlistId)
          .order("channel_order")

        if (error) throw error
        channelsToInclude = playlistChannels?.map((pc) => pc.streaming_channels as any) || []
      }

      if (channelsToInclude.length === 0) {
        alert("No channels found")
        return
      }

      let m3uContent = "#EXTM3U\n"
      channelsToInclude.forEach((channel) => {
        const actualLicenseKey = channel.license_key?.replace(/^USER:[^:]+:/, "") || ""

        if (actualLicenseKey) {
          m3uContent += `#KODIPROP:inputstream.adaptive.license_key=${actualLicenseKey}\n`
        }
        m3uContent += `#EXTINF:-1 tvg-logo="${channel.logo_url || ""}" group-title="${channel.category_name || "Entertainment"}",${channel.name}\n`
        m3uContent += `${channel.stream_url}\n`
      })

      const blob = new Blob([m3uContent], { type: "text/plain" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = playlistId ? `playlist-${playlistId}.m3u` : `${username}-channels.m3u`
      a.click()
      URL.revokeObjectURL(url)

      alert(`M3U file downloaded! (${channelsToInclude.length} channels)`)
    } catch (error: any) {
      console.error("[v0] Error generating M3U:", error)
      alert(`Failed to generate M3U: ${error.message}`)
    }
  }

  const generateMPD = async (playlistId?: string) => {
    const supabase = createClient()

    try {
      let channelsToInclude = channels

      if (playlistId) {
        const { data: playlistChannels, error } = await supabase
          .from("playlist_channels")
          .select(`
            channel_order,
            streaming_channels!inner(*)
          `)
          .eq("playlist_id", playlistId)
          .order("channel_order")

        if (error) throw error
        channelsToInclude = playlistChannels?.map((pc) => pc.streaming_channels as any) || []
      }

      if (channelsToInclude.length === 0) {
        alert("No channels found")
        return
      }

      // Generate MPD manifest for DASH streaming
      let mpdContent = `<?xml version="1.0" encoding="UTF-8"?>
<MPD xmlns="urn:mpeg:dash:schema:mpd:2011" type="static" mediaPresentationDuration="PT0H0M0.0S" minBufferTime="PT2.0S" profiles="urn:mpeg:dash:profile:isoff-live:2011">
  <Period>
`

      channelsToInclude.forEach((channel, index) => {
        const actualLicenseKey = channel.license_key?.replace(/^USER:[^:]+:/, "") || ""

        mpdContent += `    <!-- Channel: ${channel.name} -->
    <AdaptationSet id="${index}" mimeType="video/mp4" contentType="video">
      <ContentProtection schemeIdUri="urn:mpeg:dash:mp4protection:2011" value="cenc" cenc:default_KID="${actualLicenseKey ? actualLicenseKey.split(":")[0] : ""}"/>
      <Representation id="${index}_video" bandwidth="2000000" codecs="avc1.4d401f" width="1920" height="1080">
        <BaseURL>${channel.stream_url}</BaseURL>
      </Representation>
    </AdaptationSet>
`
      })

      mpdContent += `  </Period>
</MPD>`

      const blob = new Blob([mpdContent], { type: "application/dash+xml" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = playlistId ? `playlist-${playlistId}.mpd` : `${username}-channels.mpd`
      a.click()
      URL.revokeObjectURL(url)

      alert(`MPD file downloaded! (${channelsToInclude.length} channels)`)
    } catch (error: any) {
      console.error("[v0] Error generating MPD:", error)
      alert(`Failed to generate MPD: ${error.message}`)
    }
  }

  const saveBroadcastContent = async (playlistId: string) => {
    const supabase = createClient()

    try {
      const { data: playlistChannels, error } = await supabase
        .from("playlist_channels")
        .select(`
          channel_order,
          streaming_channels!inner(*)
        `)
        .eq("playlist_id", playlistId)
        .order("channel_order")

      if (error) throw error
      const channelsToInclude = playlistChannels?.map((pc) => pc.streaming_channels as any) || []

      if (channelsToInclude.length === 0) {
        alert("No channels in this playlist")
        return
      }

      // Generate M3U8 content
      let m3u8Content = "#EXTM3U\n"
      channelsToInclude.forEach((channel: any) => {
        const actualLicenseKey = channel.license_key?.replace(/^USER:[^:]+:/, "") || ""
        if (actualLicenseKey) {
          m3u8Content += `#KODIPROP:inputstream.adaptive.license_key=${actualLicenseKey}\n`
        }
        m3u8Content += `#EXTINF:-1 tvg-logo="${channel.logo_url || ""}" group-title="${channel.category_name || "Entertainment"}",${channel.name}\n`
        m3u8Content += `${channel.stream_url}\n`
      })

      // Generate MPD content
      let mpdContent = `<?xml version="1.0" encoding="UTF-8"?>
<MPD xmlns="urn:mpeg:dash:schema:mpd:2011" type="static" mediaPresentationDuration="PT0H0M0.0S" minBufferTime="PT2.0S" profiles="urn:mpeg:dash:profile:isoff-live:2011">
  <Period>
`
      channelsToInclude.forEach((channel: any, index: number) => {
        const actualLicenseKey = channel.license_key?.replace(/^USER:[^:]+:/, "") || ""
        mpdContent += `    <AdaptationSet id="${index}" mimeType="video/mp4" contentType="video">
      <ContentProtection schemeIdUri="urn:mpeg:dash:mp4protection:2011" value="cenc" cenc:default_KID="${actualLicenseKey ? actualLicenseKey.split(":")[0] : ""}"/>
      <Representation id="${index}_video" bandwidth="2000000" codecs="avc1.4d401f" width="1920" height="1080">
        <BaseURL>${channel.stream_url}</BaseURL>
      </Representation>
    </AdaptationSet>
`
      })
      mpdContent += `  </Period>
</MPD>`

      // Save to database
      const { error: updateError } = await supabase
        .from("streaming_playlists")
        .update({
          m3u8_content: m3u8Content,
          mpd_content: mpdContent,
        })
        .eq("id", playlistId)

      if (updateError) throw updateError

      alert("Broadcast content saved! Your playlist is now ready to stream.")
      await loadData()
    } catch (error: any) {
      console.error("[v0] Error saving broadcast content:", error)
      alert(`Failed to save broadcast content: ${error.message}`)
    }
  }

  const copyShareUrl = async (shareUrl: string) => {
    const fullUrl = `${window.location.origin}/playlist/${shareUrl}`
    await navigator.clipboard.writeText(fullUrl)
    setCopiedUrl(shareUrl)
    setTimeout(() => setCopiedUrl(null), 2000)
  }

  const copyBroadcastUrl = async (shareUrl: string, format: "m3u8" | "mpd") => {
    const fullUrl = `${window.location.origin}/api/broadcast/${shareUrl}?format=${format}`
    await navigator.clipboard.writeText(fullUrl)
    setCopiedUrl(`${shareUrl}-${format}`)
    setTimeout(() => setCopiedUrl(null), 2000)
  }

  const deleteChannel = async (channelId: string) => {
    const supabase = createClient()
    try {
      const { error } = await supabase.from("streaming_channels").delete().eq("id", channelId)
      if (error) throw error
      await loadData()
      alert("Channel deleted successfully!")
    } catch (error: any) {
      console.error("[v0] Error deleting channel:", error)
      alert(`Failed to delete channel: ${error.message}`)
    }
  }

  const updateChannel = async () => {
    if (!editingChannel) return

    const supabase = createClient()
    try {
      const userLicenseKey = editingChannel.license_key
        ? `USER:${username}:${editingChannel.license_key.replace(/^USER:[^:]+:/, "")}`
        : `USER:${username}:`

      const { error } = await supabase
        .from("streaming_channels")
        .update({
          name: editingChannel.name,
          logo_url: editingChannel.logo_url || null,
          stream_url: editingChannel.stream_url,
          license_key: userLicenseKey,
          category_id: editingChannel.category_id || null,
        })
        .eq("id", editingChannel.id)

      if (error) throw error

      setEditingChannel(null)
      await loadData()
      alert("Channel updated successfully!")
    } catch (error: any) {
      console.error("[v0] Error updating channel:", error)
      alert(`Failed to update channel: ${error.message}`)
    }
  }

  const testChannelStream = async (streamUrl: string, channelId: string) => {
    setTestingChannel(channelId)
    setTestResult(null)

    try {
      // Using a HEAD request to check accessibility without downloading
      const response = await fetch(streamUrl, { method: "HEAD", mode: "no-cors", cache: "no-store" })
      // The 'no-cors' mode means we can't actually check the response status, but if it doesn't throw, it's likely accessible.
      // A more robust test might involve trying to fetch a small part of the stream or using a dedicated streaming test library.
      setTestResult({ success: true, message: "Stream URL is likely accessible" })
    } catch (error) {
      setTestResult({ success: false, message: "Stream URL may not be accessible or CORS blocked" })
    } finally {
      setTimeout(() => {
        setTestingChannel(null)
        setTestResult(null)
      }, 3000)
    }
  }

  const checkDuplicateUrl = (url: string): boolean => {
    return channels.some((ch) => ch.stream_url === url)
  }

  const bulkDeleteChannels = async () => {
    if (selectedChannels.length === 0) return
    if (!confirm(`Delete ${selectedChannels.length} selected channels?`)) return

    const supabase = createClient()
    try {
      const { error } = await supabase.from("streaming_channels").delete().in("id", selectedChannels)
      if (error) throw error
      setSelectedChannels([])
      await loadData()
      alert(`${selectedChannels.length} channels deleted successfully!`)
    } catch (error: any) {
      console.error("[v0] Error deleting channels:", error)
      alert(`Failed to delete channels: ${error.message}`)
    }
  }

  const bulkAssignCategory = async (categoryId: string) => {
    if (selectedChannels.length === 0) return

    const supabase = createClient()
    try {
      const { error } = await supabase
        .from("streaming_channels")
        .update({ category_id: categoryId || null })
        .in("id", selectedChannels)

      if (error) throw error
      setSelectedChannels([])
      await loadData()
      alert(`Category assigned to ${selectedChannels.length} channels!`)
    } catch (error: any) {
      console.error("[v0] Error assigning category:", error)
      alert(`Failed to assign category: ${error.message}`)
    }
  }

  const clonePlaylist = async (playlistId: string) => {
    const supabase = createClient()
    try {
      const { data: originalPlaylist, error: fetchError } = await supabase
        .from("streaming_playlists")
        .select("*")
        .eq("id", playlistId)
        .single()

      if (fetchError) throw fetchError

      const { data: playlistChannels, error: channelsError } = await supabase
        .from("playlist_channels")
        .select("channel_id, channel_order")
        .eq("playlist_id", playlistId)
        .order("channel_order")

      if (channelsError) throw channelsError

      const shareUrl = `${username}-${Date.now()}`
      const { data: newPlaylist, error: createError } = await supabase
        .from("streaming_playlists")
        .insert([
          {
            name: `${originalPlaylist.name} (Copy)`,
            description: originalPlaylist.description,
            is_public: originalPlaylist.is_public,
            share_url: shareUrl,
          },
        ])
        .select()
        .single()

      if (createError) throw createError

      if (playlistChannels && playlistChannels.length > 0) {
        const newPlaylistChannels = playlistChannels.map((pc) => ({
          playlist_id: newPlaylist.id,
          channel_id: pc.channel_id,
          channel_order: pc.channel_order,
        }))

        const { error: insertError } = await supabase.from("playlist_channels").insert(newPlaylistChannels)
        if (insertError) throw insertError
      }

      await loadData()
      alert("Playlist cloned successfully!")
    } catch (error: any) {
      console.error("[v0] Error cloning playlist:", error)
      alert(`Failed to clone playlist: ${error.message}`)
    }
  }

  const exportToCSV = () => {
    if (channels.length === 0) {
      alert("No channels to export")
      return
    }

    const csvHeader = "Name,Logo URL,Stream URL,License Key,Category\n"
    const csvRows = channels
      .map((ch) => {
        const actualLicenseKey = ch.license_key?.replace(/^USER:[^:]+:/, "") || ""
        return `"${ch.name.replace(/"/g, '""')}","${(ch.logo_url || "").replace(/"/g, '""')}","${ch.stream_url.replace(/"/g, '""')}","${actualLicenseKey.replace(/"/g, '""')}","${(ch.category_name || "").replace(/"/g, '""')}"`
      })
      .join("\n")

    const csvContent = csvHeader + csvRows
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${username}-channels.csv`
    a.click()
    URL.revokeObjectURL(url)

    alert(`CSV file downloaded! (${channels.length} channels)`)
  }

  const filteredAndSortedChannels = channels
    .filter((ch) => {
      const matchesSearch = ch.name.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesCategory = selectedCategory === "all" || ch.category_id === selectedCategory
      return matchesSearch && matchesCategory
    })
    .sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name)
      if (sortBy === "category") return (a.category_name || "").localeCompare(b.category_name || "")
      // Sort by creation date in descending order (newest first)
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })

  const deletePlaylist = async (playlistId: string) => {
    const supabase = createClient()
    try {
      const { error } = await supabase.from("streaming_playlists").delete().eq("id", playlistId)
      if (error) throw error
      await loadData()
      alert("Playlist deleted successfully!")
    } catch (error: any) {
      console.error("[v0] Error deleting playlist:", error)
      alert(`Failed to delete playlist: ${error.message}`)
    }
  }

  if (!isUsernameSet) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6">
        <Card className="w-full max-w-2xl border-2 border-black">
          <CardHeader className="space-y-4">
            <div>
              <CardTitle className="text-3xl text-black mb-2">Playlist Creator & Broadcaster</CardTitle>
              <CardDescription className="text-base">
                Generate .mpd and .m3u files to broadcast live channels online
              </CardDescription>
            </div>

            <div className="bg-blue-50 border-2 border-blue-400 p-4 rounded space-y-2">
              <div className="flex items-start gap-2">
                <Radio className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-900">
                  <p className="font-semibold mb-2">How to use this generator:</p>
                  <ol className="list-decimal list-inside space-y-1 ml-2">
                    <li>Create your account (enter username)</li>
                    <li>Add your channels (name, logo, key, URL for m3u8 or mpd)</li>
                    <li>Manage your channels (generate m3u8 and manage categories)</li>
                    <li>Share your broadcast URL link with friends</li>
                    <li>Generate your own m3u8 playlists for Smart TVs and streaming devices</li>
                  </ol>
                </div>
              </div>
            </div>

            <div className="bg-yellow-50 border-2 border-yellow-400 p-4 rounded">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-yellow-800">
                  <p className="font-semibold mb-1">User Isolation Enabled</p>
                  <p>Each username has separate channels and playlists. Choose a unique name to avoid conflicts.</p>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-black text-base">Username (min. 3 characters)</Label>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                className="border-2 border-black mt-2 text-base h-12"
                onKeyPress={(e) => e.key === "Enter" && handleUsernameSubmit()}
              />
            </div>

            <Button
              onClick={handleUsernameSubmit}
              className="w-full bg-black text-white hover:bg-gray-800 border-2 border-black h-12 text-base"
            >
              <User className="w-5 h-5 mr-2" />
              Continue to Playlist Creator
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 pb-6 border-b-2 border-black">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-black mb-2">Playlist Creator & Broadcaster</h1>
              <p className="text-gray-600">
                Create playlists, generate M3U/MPD files, and broadcast live channels online
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Badge className="bg-black text-white border-2 border-black px-4 py-2 text-base">
                <User className="w-4 h-4 mr-2" />
                {username}
              </Badge>
              <Button
                onClick={() => {
                  setIsUsernameSet(false)
                  setUsername("")
                }}
                variant="outline"
                className="border-2 border-black"
              >
                Switch User
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div className="flex items-start gap-3 p-3 bg-gray-50 border-2 border-gray-200 rounded">
              <FileText className="w-5 h-5 text-black flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-black text-sm">M3U8 & MPD Support</p>
                <p className="text-xs text-gray-600">Generate both formats with DRM support</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-gray-50 border-2 border-gray-200 rounded">
              <Radio className="w-5 h-5 text-black flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-black text-sm">Live Broadcasting</p>
                <p className="text-xs text-gray-600">Share URLs for live streaming</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-gray-50 border-2 border-gray-200 rounded">
              <Share2 className="w-5 h-5 text-black flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-black text-sm">Smart TV Compatible</p>
                <p className="text-xs text-gray-600">Works with all streaming devices</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-2 mb-6">
          <Button
            onClick={() => setActiveView("channels")}
            variant={activeView === "channels" ? "default" : "outline"}
            className={
              activeView === "channels"
                ? "bg-black text-white border-2 border-black"
                : "border-2 border-black text-black hover:bg-gray-100"
            }
          >
            <List className="w-4 h-4 mr-2" />
            Channels ({channels.length})
          </Button>
          <Button
            onClick={() => setActiveView("playlists")}
            variant={activeView === "playlists" ? "default" : "outline"}
            className={
              activeView === "playlists"
                ? "bg-black text-white border-2 border-black"
                : "border-2 border-black text-black hover:bg-gray-100"
            }
          >
            <FolderOpen className="w-4 h-4 mr-2" />
            Playlists ({playlists.length})
          </Button>
          <Button
            onClick={() => setShowCategoryManager(!showCategoryManager)}
            variant="outline"
            className="border-2 border-black text-black hover:bg-gray-100"
          >
            <FolderPlus className="w-4 h-4 mr-2" />
            Categories ({categories.length})
          </Button>
        </div>

        {showCategoryManager && (
          <Card className="border-2 border-black mb-6">
            <CardHeader>
              <CardTitle className="text-black">Category Manager</CardTitle>
              <CardDescription>Create and manage categories for organizing your channels</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-black">Category Name *</Label>
                  <Input
                    value={newCategory.name}
                    onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                    placeholder="e.g., Sports, Movies, News"
                    className="border-2 border-gray-300"
                  />
                </div>
                <div>
                  <Label className="text-black">Description</Label>
                  <Input
                    value={newCategory.description}
                    onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
                    placeholder="Optional"
                    className="border-2 border-gray-300"
                  />
                </div>
              </div>
              <Button onClick={addCategory} className="bg-black text-white hover:bg-gray-800 border-2 border-black">
                <Plus className="w-4 h-4 mr-2" />
                Add Category
              </Button>

              <Separator />

              <div className="space-y-2">
                <Label className="text-black">Existing Categories</Label>
                {categories.length === 0 ? (
                  <p className="text-gray-500 text-sm">No categories yet</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    {categories.map((cat) => (
                      <div
                        key={cat.id}
                        className="flex items-center justify-between p-3 border-2 border-gray-200 rounded"
                      >
                        <div>
                          <p className="font-semibold text-black">{cat.name}</p>
                          {cat.description && <p className="text-xs text-gray-500">{cat.description}</p>}
                        </div>
                        <Button
                          onClick={() => deleteCategory(cat.id)}
                          size="sm"
                          variant="outline"
                          className="border-2 border-red-500 text-red-500 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {isLoading ? (
          <div className="text-center py-12">
            <div className="text-black text-xl">Loading...</div>
          </div>
        ) : activeView === "channels" ? (
          <div className="space-y-6">
            <Card className="border-2 border-black">
              <CardHeader>
                <CardTitle className="text-black">Add New Channel</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-black">Channel Name *</Label>
                    <Input
                      value={newChannel.name}
                      onChange={(e) => setNewChannel({ ...newChannel, name: e.target.value })}
                      placeholder="e.g., CNN"
                      className="border-2 border-gray-300"
                    />
                  </div>
                  <div>
                    <Label className="text-black">Logo URL</Label>
                    <Input
                      value={newChannel.logo_url}
                      onChange={(e) => setNewChannel({ ...newChannel, logo_url: e.target.value })}
                      placeholder="https://..."
                      className="border-2 border-gray-300"
                    />
                  </div>
                  <div>
                    <Label className="text-black">Stream URL *</Label>
                    <Input
                      value={newChannel.stream_url}
                      onChange={(e) => setNewChannel({ ...newChannel, stream_url: e.target.value })}
                      placeholder="https://...m3u8"
                      className="border-2 border-gray-300"
                    />
                  </div>
                  <div>
                    <Label className="text-black">License Key (optional)</Label>
                    <Input
                      value={newChannel.license_key}
                      onChange={(e) => setNewChannel({ ...newChannel, license_key: e.target.value })}
                      placeholder="DRM key"
                      className="border-2 border-gray-300"
                    />
                  </div>
                </div>
                <Button onClick={addChannel} className="bg-black text-white hover:bg-gray-800 border-2 border-black">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Channel
                </Button>
              </CardContent>
            </Card>

            <Card className="border-2 border-black">
              <CardHeader>
                <CardTitle className="text-black">Import from M3U URL</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-black">M3U Playlist URL</Label>
                  <Input
                    value={importUrl}
                    onChange={(e) => setImportUrl(e.target.value)}
                    placeholder="https://example.com/playlist.m3u"
                    className="border-2 border-gray-300"
                  />
                </div>
                <Button onClick={importM3U} className="bg-black text-white hover:bg-gray-800 border-2 border-black">
                  <Upload className="w-4 h-4 mr-2" />
                  Import Channels
                </Button>
              </CardContent>
            </Card>

            <Card className="border-2 border-black">
              <CardHeader>
                <CardTitle className="text-black">Search & Filter</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-black">Search Channels</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search by name..."
                        className="border-2 border-gray-300 pl-10"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-black">Filter by Category</Label>
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="w-full h-10 border-2 border-gray-300 rounded px-3"
                    >
                      <option value="all">All Categories</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label className="text-black">Sort By</Label>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as any)}
                      className="w-full h-10 border-2 border-gray-300 rounded px-3"
                    >
                      <option value="date">Date Added</option>
                      <option value="name">Name (A-Z)</option>
                      <option value="category">Category</option>
                    </select>
                  </div>
                </div>

                {selectedChannels.length > 0 && (
                  <div className="flex items-center gap-2 p-3 bg-blue-50 border-2 border-blue-400 rounded">
                    <CheckSquare className="w-5 h-5 text-blue-600" />
                    <span className="text-blue-900 font-semibold">{selectedChannels.length} channels selected</span>
                    <div className="flex gap-2 ml-auto">
                      <select
                        onChange={(e) => {
                          if (e.target.value) {
                            bulkAssignCategory(e.target.value)
                            e.target.value = "" // Reset the select to default option
                          }
                        }}
                        className="h-9 border-2 border-blue-500 rounded px-2 text-sm"
                      >
                        <option value="">Assign Category...</option>
                        {categories.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.name}
                          </option>
                        ))}
                      </select>
                      <Button
                        onClick={bulkDeleteChannels}
                        size="sm"
                        variant="outline"
                        className="border-2 border-red-500 text-red-500 hover:bg-red-50 bg-transparent"
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Delete Selected
                      </Button>
                      <Button
                        onClick={() => setSelectedChannels([])}
                        size="sm"
                        variant="outline"
                        className="border-2 border-gray-400"
                      >
                        Clear Selection
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-2 border-black">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-black">My Channels</CardTitle>
                  <CardDescription>
                    {filteredAndSortedChannels.length} of {channels.length} channels
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={exportToCSV}
                    size="sm"
                    variant="outline"
                    className="border-2 border-black text-black hover:bg-gray-100 bg-transparent"
                  >
                    <FileSpreadsheet className="w-4 h-4 mr-2" />
                    Export CSV
                  </Button>
                  <Button
                    onClick={() => generateM3U()}
                    size="sm"
                    className="bg-black text-white hover:bg-gray-800 border-2 border-black"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export M3U
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {filteredAndSortedChannels.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    {channels.length === 0
                      ? "No channels yet. Add your first channel above."
                      : "No channels match your search/filter criteria."}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredAndSortedChannels.map((channel) => (
                      <div
                        key={channel.id}
                        className="flex items-center gap-4 p-4 border-2 border-gray-200 rounded hover:border-black transition-colors relative" // Added relative for absolute positioning of test result
                      >
                        <button
                          onClick={() => {
                            if (selectedChannels.includes(channel.id)) {
                              setSelectedChannels(selectedChannels.filter((id) => id !== channel.id))
                            } else {
                              setSelectedChannels([...selectedChannels, channel.id])
                            }
                          }}
                          className="flex-shrink-0"
                        >
                          {selectedChannels.includes(channel.id) ? (
                            <CheckSquare className="w-5 h-5 text-blue-600" />
                          ) : (
                            <Square className="w-5 h-5 text-gray-400" />
                          )}
                        </button>

                        {channel.logo_url ? (
                          <img
                            src={channel.logo_url || "/placeholder.svg"}
                            alt={channel.name}
                            className="w-12 h-12 object-cover rounded border-2 border-gray-300 flex-shrink-0"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-gray-200 rounded border-2 border-gray-300 flex items-center justify-center flex-shrink-0">
                            <span className="text-gray-500 text-xs">No Logo</span>
                          </div>
                        )}

                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-black truncate">{channel.name}</h4>
                          <p className="text-sm text-gray-500 truncate">{channel.stream_url}</p>
                          {channel.category_name && (
                            <Badge className="bg-gray-200 text-black border border-gray-300 mt-1">
                              {channel.category_name}
                            </Badge>
                          )}
                        </div>

                        <div className="flex gap-2 flex-shrink-0">
                          <Button
                            onClick={() => testChannelStream(channel.stream_url, channel.id)}
                            size="sm"
                            variant="outline"
                            className="border-2 border-blue-500 text-blue-600 hover:bg-blue-50"
                            disabled={testingChannel === channel.id}
                          >
                            {testingChannel === channel.id ? (
                              <>Testing...</>
                            ) : (
                              <>
                                <TestTube className="w-4 h-4" />
                              </>
                            )}
                          </Button>
                          <Button
                            onClick={() => setEditingChannel(channel)}
                            size="sm"
                            variant="outline"
                            className="border-2 border-gray-400 text-gray-600 hover:bg-gray-50"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            onClick={() => deleteChannel(channel.id)}
                            size="sm"
                            variant="outline"
                            className="border-2 border-red-500 text-red-500 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>

                        {testingChannel === channel.id && testResult && (
                          <div
                            className={`absolute right-4 top-1/2 transform -translate-y-1/2 px-3 py-1 rounded text-sm ${
                              testResult.success ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                            }`}
                          >
                            {testResult.message}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {editingChannel && (
              <Card className="border-2 border-blue-500 bg-blue-50">
                <CardHeader>
                  <CardTitle className="text-black">Edit Channel</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-black">Channel Name *</Label>
                      <Input
                        value={editingChannel.name}
                        onChange={(e) => setEditingChannel({ ...editingChannel, name: e.target.value })}
                        className="border-2 border-gray-300"
                      />
                    </div>
                    <div>
                      <Label className="text-black">Logo URL</Label>
                      <Input
                        value={editingChannel.logo_url || ""}
                        onChange={(e) => setEditingChannel({ ...editingChannel, logo_url: e.target.value })}
                        className="border-2 border-gray-300"
                      />
                    </div>
                    <div>
                      <Label className="text-black">Stream URL *</Label>
                      <Input
                        value={editingChannel.stream_url}
                        onChange={(e) => setEditingChannel({ ...editingChannel, stream_url: e.target.value })}
                        className="border-2 border-gray-300"
                      />
                    </div>
                    <div>
                      <Label className="text-black">License Key</Label>
                      <Input
                        value={editingChannel.license_key?.replace(/^USER:[^:]+:/, "") || ""}
                        onChange={(e) => setEditingChannel({ ...editingChannel, license_key: e.target.value })}
                        className="border-2 border-gray-300"
                      />
                    </div>
                    <div>
                      <Label className="text-black">Category</Label>
                      <select
                        value={editingChannel.category_id || ""}
                        onChange={(e) => setEditingChannel({ ...editingChannel, category_id: e.target.value })}
                        className="w-full h-10 border-2 border-gray-300 rounded px-3"
                      >
                        <option value="">No Category</option>
                        {categories.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={updateChannel}
                      className="bg-black text-white hover:bg-gray-800 border-2 border-black"
                    >
                      Save Changes
                    </Button>
                    <Button
                      onClick={() => setEditingChannel(null)}
                      variant="outline"
                      className="border-2 border-gray-400"
                    >
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            <Card className="border-2 border-black">
              <CardHeader>
                <CardTitle className="text-black">Create New Playlist</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-black">Playlist Name *</Label>
                    <Input
                      value={newPlaylist.name}
                      onChange={(e) => setNewPlaylist({ ...newPlaylist, name: e.target.value })}
                      placeholder="My Playlist"
                      className="border-2 border-gray-300"
                    />
                  </div>
                  <div>
                    <Label className="text-black">Description</Label>
                    <Input
                      value={newPlaylist.description}
                      onChange={(e) => setNewPlaylist({ ...newPlaylist, description: e.target.value })}
                      placeholder="Optional"
                      className="border-2 border-gray-300"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-black mb-2 block">Select Channels</Label>
                  <div className="max-h-48 overflow-y-auto border-2 border-gray-300 rounded p-4 space-y-2">
                    {channels.length === 0 ? (
                      <p className="text-gray-500 text-sm">No channels available. Add channels first.</p>
                    ) : (
                      channels.map((channel) => (
                        <label
                          key={channel.id}
                          className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
                        >
                          <input
                            type="checkbox"
                            checked={newPlaylist.selected_channels.includes(channel.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setNewPlaylist({
                                  ...newPlaylist,
                                  selected_channels: [...newPlaylist.selected_channels, channel.id],
                                })
                              } else {
                                setNewPlaylist({
                                  ...newPlaylist,
                                  selected_channels: newPlaylist.selected_channels.filter((id) => id !== channel.id),
                                })
                              }
                            }}
                            className="w-4 h-4"
                          />
                          <span className="text-black">{channel.name}</span>
                        </label>
                      ))
                    )}
                  </div>
                </div>

                <Button
                  onClick={createPlaylist}
                  disabled={channels.length === 0}
                  className="bg-black text-white hover:bg-gray-800 border-2 border-black disabled:opacity-50"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Playlist
                </Button>
              </CardContent>
            </Card>

            <Card className="border-2 border-black">
              <CardHeader>
                <CardTitle className="text-black">My Playlists</CardTitle>
                <CardDescription>
                  Create playlists, save for broadcast, and share streaming URLs with friends
                </CardDescription>
              </CardHeader>
              <CardContent>
                {playlists.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No playlists yet. Create your first playlist above.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {playlists.map((playlist) => (
                      <Card key={playlist.id} className="border-2 border-gray-300">
                        <CardHeader>
                          <CardTitle className="text-lg text-black">{playlist.name}</CardTitle>
                          {playlist.description && !playlist.description.startsWith("USER:") && (
                            <p className="text-sm text-gray-600">{playlist.description}</p>
                          )}
                          <Badge className="bg-gray-200 text-black border-2 border-gray-300 w-fit">
                            {playlist.channel_count} channels
                          </Badge>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="space-y-2">
                            <p className="text-xs font-semibold text-gray-600 uppercase">Download Files</p>
                            <div className="grid grid-cols-2 gap-2">
                              <Button
                                onClick={() => generateM3U(playlist.id)}
                                size="sm"
                                className="bg-black text-white hover:bg-gray-800 border-2 border-black"
                              >
                                <Download className="w-4 h-4 mr-1" />
                                M3U
                              </Button>
                              <Button
                                onClick={() => generateMPD(playlist.id)}
                                size="sm"
                                className="bg-black text-white hover:bg-gray-800 border-2 border-black"
                              >
                                <Download className="w-4 h-4 mr-1" />
                                MPD
                              </Button>
                            </div>
                          </div>

                          <Separator />

                          <div className="space-y-2">
                            <p className="text-xs font-semibold text-gray-600 uppercase">Broadcasting</p>
                            <Button
                              onClick={() => saveBroadcastContent(playlist.id)}
                              size="sm"
                              variant="outline"
                              className="border-2 border-blue-500 text-blue-600 hover:bg-blue-50 w-full"
                            >
                              <Upload className="w-4 h-4 mr-2" />
                              {playlist.m3u8_content || playlist.mpd_content
                                ? "Update Broadcast"
                                : "Save for Broadcast"}
                            </Button>

                            {(playlist.m3u8_content || playlist.mpd_content) && playlist.share_url && (
                              <div className="space-y-2 pt-2">
                                <p className="text-xs text-gray-600">Share these URLs with friends:</p>
                                <div className="grid grid-cols-2 gap-2">
                                  <Button
                                    onClick={() => copyBroadcastUrl(playlist.share_url!, "m3u8")}
                                    size="sm"
                                    variant="outline"
                                    className="border-2 border-green-500 text-green-600 hover:bg-green-50 text-xs"
                                  >
                                    {copiedUrl === `${playlist.share_url}-m3u8` ? (
                                      <>
                                        <CheckCircle className="w-3 h-3 mr-1" />
                                        Copied!
                                      </>
                                    ) : (
                                      <>
                                        <Copy className="w-3 h-3 mr-1" />
                                        M3U8 URL
                                      </>
                                    )}
                                  </Button>
                                  <Button
                                    onClick={() => copyBroadcastUrl(playlist.share_url!, "mpd")}
                                    size="sm"
                                    variant="outline"
                                    className="border-2 border-green-500 text-green-600 hover:bg-green-50 text-xs"
                                  >
                                    {copiedUrl === `${playlist.share_url}-mpd` ? (
                                      <>
                                        <CheckCircle className="w-3 h-3 mr-1" />
                                        Copied!
                                      </>
                                    ) : (
                                      <>
                                        <Copy className="w-3 h-3 mr-1" />
                                        MPD URL
                                      </>
                                    )}
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>

                          <Separator />

                          <Button
                            onClick={() => clonePlaylist(playlist.id)}
                            size="sm"
                            variant="outline"
                            className="border-2 border-blue-500 text-blue-600 hover:bg-blue-50 w-full"
                          >
                            <ClipboardCopy className="w-4 h-4 mr-2" />
                            Clone Playlist
                          </Button>

                          <Button
                            onClick={() => deletePlaylist(playlist.id)}
                            size="sm"
                            variant="outline"
                            className="border-2 border-red-500 text-red-500 hover:bg-red-50 w-full"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete Playlist
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
