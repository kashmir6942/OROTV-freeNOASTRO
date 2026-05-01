"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { createClient } from "@/lib/supabase/client"
import { Users, Clock, Shield, Trash2, AlertTriangle, Plus, Download, RefreshCw, Settings, BarChart3, Copy, CheckCircle, UserCheck, Star, Tv, Upload, Search, X, MessageSquare, Pencil, Check, Ban } from 'lucide-react'
import { allChannels } from "@/data/channels/all-channels"

interface TokenData {
  id: string
  token_number: number
  expires_at: string
  user_ip: string
  user_agent: string
  used_count: number
  viewers: number // Use correct column name from database
  is_permanent: boolean
  created_at: string
}

interface SessionData {
  id: string
  user_ip: string
  user_agent: string
  last_token_generated: string
  created_at: string
}

interface PHCornerUsername {
  id: string
  username: string
  password?: string // Added password field
  token_hash: string
  user_ip: string
  user_agent: string
  created_at: string
}

interface MaintenanceMode {
  id: string
  is_active: boolean
  title: string
  message: string
  custom_color: string
  updated_at: string
}

export default function AdminPanel() {
  const [tokens, setTokens] = useState<TokenData[]>([])
  const [sessions, setSessions] = useState<SessionData[]>([])
  const [phcornerUsernames, setPhcornerUsernames] = useState<PHCornerUsername[]>([])
  const [pendingUsers, setPendingUsers] = useState<any[]>([])
  const [bannedUsers, setBannedUsers] = useState<any[]>([])
  const [userAccounts, setUserAccounts] = useState<any[]>([])
  const [userSearchQuery, setUserSearchQuery] = useState("")
  const [rejectionReason, setRejectionReason] = useState("")
  const [selectedPendingUser, setSelectedPendingUser] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [dbError, setDbError] = useState<string | null>(null)
  const [stats, setStats] = useState({
    totalTokens: 0,
    activeTokens: 0,
    totalUsage: 0,
    currentActiveUsage: 0, // This will now represent currentActiveViewers
    uniqueUsers: 0,
  })
  const [activeTab, setActiveTab] = useState("overview")
  const [showPasswordsTab, setShowPasswordsTab] = useState(false)
  const [newTokenConfig, setNewTokenConfig] = useState({
    count: 1,
    durationType: "hours",
    duration: 48,
    isUnlimited: false,
    description: "",
  })
  const [generatedTokens, setGeneratedTokens] = useState<string[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [copiedToken, setCopiedToken] = useState<string | null>(null)
  const [userReports, setUserReports] = useState<any[]>([])
  const [channelAnalytics, setChannelAnalytics] = useState<any[]>([])
  const [viewerStats, setViewerStats] = useState<any[]>([])
  const [announcements, setAnnouncements] = useState<any[]>([])
  const [maintenanceMode, setMaintenanceMode] = useState<MaintenanceMode | null>(null)
  const [newAnnouncement, setNewAnnouncement] = useState({
    title: "",
    message: "",
    type: "info",
    show_popup: false,
    auto_dismiss_seconds: null as number | null,
  })
  const [editingMaintenance, setEditingMaintenance] = useState({
    title: "",
    message: "",
    custom_color: "#ef4444", // Added custom_color field with default red
  })

  const [analyticsData, setAnalyticsData] = useState<any>({
    total_active_viewers: 0,
    total_active_channels: 0,
    peak_channel_id: "N/A",
    peak_channel_viewers: 0,
    total_tokens: 0,
  })

  const [channelRequests, setChannelRequests] = useState<any[]>([])
  const [userRatings, setUserRatings] = useState<any[]>([])
  const [dbChannels, setDbChannels] = useState<any[]>([])
  const [ceasedChannels, setCeasedChannels] = useState<any[]>([])
  const [channelManagerSearch, setChannelManagerSearch] = useState("")
  const [channelManagerCategory, setChannelManagerCategory] = useState("All")
  const [showAddChannelModal, setShowAddChannelModal] = useState(false)
  const [selectedCeasedChannel, setSelectedCeasedChannel] = useState<string | null>(null)
  const [ceasedChannelForm, setCeasedChannelForm] = useState({
    status_message: "",
    reason: "",
    shutdown_image: "",
    shutdown_video: "",
    is_ceased: false
  })
  const [channelStatusSearch, setChannelStatusSearch] = useState("")
  const [movingTextAnnouncements, setMovingTextAnnouncements] = useState<any[]>([])
  const [newMovingText, setNewMovingText] = useState({
    message: "",
    display_mode: "scrolling" as "scrolling" | "static",
    scroll_direction: "left" as "left" | "right",
    font: "Segoe UI",
    scroll_speed: 20,
    target: "all" as "single" | "multiple" | "all",
    channel_ids: [] as string[],
    is_active: true,
  })
  const [movingTextChannelSearch, setMovingTextChannelSearch] = useState("")
  const [addChannelForm, setAddChannelForm] = useState({
    name: "",
    logo: "",
    url: "",
    category: "Entertainment",
    group: "Other",
    drm_key_id: "",
    drm_key: "",
    is_hd: true,
    non_hls: false,
  })
  const [editingChannel, setEditingChannel] = useState<any | null>(null)
  const [editChannelForm, setEditChannelForm] = useState({
    name: "",
    logo: "",
    url: "",
    category: "Entertainment",
    group: "Other",
    drm_key_id: "",
    drm_key: "",
    is_hd: true,
    non_hls: false,
  })

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 5000) // Changed from 10000 to 5000ms for faster updates
    return () => clearInterval(interval)
  }, [])

  const loadData = async () => {
    const supabase = createClient()

    try {
      await fetchTokens()

      try {
        const analyticsResponse = await fetch("/api/analytics")
        if (analyticsResponse.ok) {
          const analyticsResult = await analyticsResponse.json()
          if (analyticsResult.success) {
            setAnalyticsData(analyticsResult.analytics)
            setViewerStats(analyticsResult.topChannels)
            console.log("[v0] Analytics data loaded:", analyticsResult)
          }
        } else {
          console.error("[v0] Analytics API returned error:", analyticsResponse.status)
          setAnalyticsData({
            total_active_viewers: 0,
            total_active_channels: 0,
            peak_channel_id: "N/A",
            peak_channel_viewers: 0,
            total_tokens: 0,
          })
        }
      } catch (analyticsError) {
        console.error("[v0] Failed to load analytics:", analyticsError)
        // Set default values on error
        setAnalyticsData({
          total_active_viewers: 0,
          total_active_channels: 0,
          peak_channel_id: "N/A",
          peak_channel_viewers: 0,
          total_tokens: 0,
        })
      }

      // Load sessions
      const { data: sessionsData, error: sessionsError } = await supabase
        .from("user_sessions")
        .select("*")
        .order("created_at", { ascending: false })

      if (sessionsError && !sessionsError.message.includes('relation "user_sessions" does not exist')) {
        throw sessionsError
      }

      const { data: usernamesData, error: usernamesError } = await supabase
        .from("phcorner_usernames")
        .select("*")
        .order("created_at", { ascending: false })

      if (usernamesError && !usernamesError.message.includes('relation "phcorner_usernames" does not exist')) {
        console.error("Error loading PHCorner usernames:", usernamesError)
      }

      const { data: reportsData } = await supabase
        .from("user_reports")
        .select("*")
        .order("created_at", { ascending: false })

      const { data: analyticsData } = await supabase
        .from("channel_analytics")
        .select("*")
        .order("date", { ascending: false })

      // const { data: topChannelsData, error: topChannelsError } = await supabase.rpc("get_top_viewed_channels", {
      //   limit_count: 10,
      // })

      // Load announcements
      const { data: announcementsData } = await supabase
        .from("announcements")
        .select("*")
        .order("created_at", { ascending: false })

      // Load maintenance mode
      const { data: maintenanceData } = await supabase.from("maintenance_mode").select("*").single()

      const { data: channelRequestsData } = await supabase
        .from("channel_requests")
        .select("*")
        .order("created_at", { ascending: false })

      const { data: userRatingsData } = await supabase
        .from("user_ratings")
        .select("*")
        .order("created_at", { ascending: false })

      // Load channels for Channel Manager
      const { data: channelsData } = await supabase
        .from("channels")
        .select("*")
        .order("name", { ascending: true })

      // Load channel status for ceased channels
      const { data: ceasedData } = await supabase
        .from("channel_status")
        .select("*")
        .eq("is_ceased", true)

      // Load moving text announcements
      const { data: movingTextData } = await supabase
        .from("moving_text_announcements")
        .select("*")
        .order("created_at", { ascending: false })

      // Load pending users for approval
      const { data: pendingUsersData } = await supabase
        .from("pending_users")
        .select("*")
        .order("created_at", { ascending: false })

      // Load banned users
      const { data: bannedUsersData } = await supabase
        .from("banned_users")
        .select("*")
        .order("banned_at", { ascending: false })

      // Load user accounts
      const { data: userAccountsData } = await supabase
        .from("user_accounts")
        .select("*")
        .order("created_at", { ascending: false })

      setPendingUsers(pendingUsersData || [])
      setBannedUsers(bannedUsersData || [])
      setUserAccounts(userAccountsData || [])
      setSessions(sessionsData || [])
      setDbChannels(channelsData || [])
      setCeasedChannels(ceasedData || [])
      setMovingTextAnnouncements(movingTextData || [])
      setUserRatings(userRatingsData || [])
      setPhcornerUsernames(usernamesData || [])
      setUserReports(reportsData || [])
      setChannelAnalytics(analyticsData || [])
      setAnnouncements(announcementsData || [])
      setMaintenanceMode(maintenanceData)
      setChannelRequests(channelRequestsData || [])

      console.log("Admin panel data loaded successfully")
    } catch (error) {
      console.error("Error loading admin data:", error)
      setDbError("Failed to load admin data. Check database connection.")
    } finally {
      setIsLoading(false)
    }
  }

  const fetchTokens = async () => {
    try {
      const supabase = createClient()

      const { data: tokensData, error: tokensError } = await supabase
        .from("access_tokens")
        .select("*")
        .order("created_at", { ascending: false })

      if (tokensError) {
        if (tokensError.message.includes('relation "access_tokens" does not exist')) {
          setDbError("Database tables not found. Please run the setup scripts first.")
          setIsLoading(false)
          return
        }
        throw tokensError
      }

      setTokens(tokensData || [])

      const now = new Date()
      const activeTokens = tokensData?.filter((token) => new Date(token.expires_at) > now).length || 0

      const currentActiveViewers = tokensData?.reduce((sum, token) => sum + (token.viewers || 0), 0) || 0
      const totalUsage = tokensData?.reduce((sum, token) => sum + (token.used_count || 0), 0) || 0
      const uniqueIPs = new Set(tokensData?.map((token) => token.user_ip)).size

      setStats({
        totalTokens: tokensData?.length || 0,
        activeTokens,
        totalUsage,
        currentActiveUsage: currentActiveViewers, // Use viewers count
        uniqueUsers: uniqueIPs,
      })
    } catch (error) {
      console.error("Error fetching tokens:", error)
      setDbError("Failed to load tokens. Check database connection.")
    }
  }

  // User approval functions
  const approveUser = async (pendingUserId: string) => {
    const supabase = createClient()
    try {
      // Get pending user data
      const { data: pendingUser, error: fetchError } = await supabase
        .from("pending_users")
        .select("*")
        .eq("id", pendingUserId)
        .single()

      if (fetchError || !pendingUser) throw fetchError

      // Create user account
      const { error: insertError } = await supabase
        .from("user_accounts")
        .insert({
          username: pendingUser.username,
          password_hash: pendingUser.password_hash,
          is_active: true,
        })

      if (insertError) throw insertError

      // Update pending user status
      await supabase
        .from("pending_users")
        .update({ status: 'approved', updated_at: new Date().toISOString() })
        .eq("id", pendingUserId)

      await loadData()
    } catch (error) {
      console.error("[v0] Error approving user:", error)
    }
  }

  const rejectUser = async (pendingUserId: string, reason: string) => {
    const supabase = createClient()
    try {
      await supabase
        .from("pending_users")
        .update({ 
          status: 'rejected', 
          rejection_reason: reason,
          updated_at: new Date().toISOString() 
        })
        .eq("id", pendingUserId)

      await loadData()
    } catch (error) {
      console.error("[v0] Error rejecting user:", error)
    }
  }

  const banUser = async (userId: string, username: string, reason: string) => {
    const supabase = createClient()
    try {
      // Add to banned_users
      await supabase
        .from("banned_users")
        .insert({
          user_id: userId,
          username,
          reason,
          banned_by: 'admin',
        })

      // Deactivate account
      await supabase
        .from("user_accounts")
        .update({ is_active: false })
        .eq("id", userId)

      // Delete their tokens
      await supabase
        .from("user_tokens")
        .delete()
        .eq("username", username)

      await loadData()
    } catch (error) {
      console.error("[v0] Error banning user:", error)
    }
  }

  const unbanUser = async (bannedId: string, username: string) => {
    const supabase = createClient()
    try {
      // Remove from banned_users
      await supabase
        .from("banned_users")
        .delete()
        .eq("id", bannedId)

      // Reactivate account if exists
      await supabase
        .from("user_accounts")
        .update({ is_active: true })
        .eq("username", username)

      await loadData()
    } catch (error) {
      console.error("[v0] Error unbanning user:", error)
    }
  }

  const forceLogoutUser = async (username: string) => {
    const supabase = createClient()
    try {
      // Delete their tokens to force re-login
      await supabase
        .from("user_tokens")
        .delete()
        .eq("username", username)

      await loadData()
      alert(`User ${username} has been logged out`)
    } catch (error) {
      console.error("[v0] Error forcing logout:", error)
    }
  }

  const deleteToken = async (tokenId: string) => {
    const supabase = createClient()

    // Add confirmation dialog
    const confirmed = window.confirm("Are you sure you want to delete this token? This action cannot be undone.")
    if (!confirmed) return

    try {
      // First cleanup any active sessions for this token
      const { error: sessionError } = await supabase.from("active_sessions").delete().eq("token_id", tokenId)

      if (sessionError) throw sessionError

      // Then delete the token
      const { error } = await supabase.from("access_tokens").delete().eq("id", tokenId)

      if (error) throw error

      console.log("[v0] Token deleted successfully")
      await loadData() // Refresh the data
    } catch (error) {
      console.error("[v0] Error deleting token:", error)
    }
  }

  const resetTokenUsage = async (tokenId: string) => {
    const supabase = createClient()

    try {
      const { error } = await supabase.rpc("reset_token_usage", {
        token_id: tokenId,
      })

      if (error) throw error

      console.log("[v0] Token usage reset successfully")
      await loadData() // Refresh the data
    } catch (error) {
      console.error("[v0] Error resetting token usage:", error)
    }
  }

  const getActiveSessionsForToken = async (tokenHash: string) => {
    const supabase = createClient()

    try {
      const { data, error } = await supabase.rpc("get_active_token_sessions", {
        token_hash_param: tokenHash,
      })

      if (error) throw error
      return data || 0
    } catch (error) {
      console.error("[v0] Error getting active sessions:", error)
      return 0
    }
  }

  const generateBulkTokens = async () => {
    setIsGenerating(true)
    const supabase = createClient()
    const newTokens: string[] = []

    try {
      for (let i = 0; i < newTokenConfig.count; i++) {
        const response = await fetch("/api/generate-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            durationType: newTokenConfig.durationType,
            duration: newTokenConfig.duration,
            isUnlimited: newTokenConfig.isUnlimited || newTokenConfig.durationType === "unlimited",
            description: newTokenConfig.description,
            isAdminGenerated: true,
          }),
        })

        if (response.ok) {
          const data = await response.json()
          newTokens.push(data.token)
        } else {
          const errorData = await response.json()
          console.error("Failed to generate token:", errorData.error)
        }
      }

      setGeneratedTokens(newTokens)
      await loadData() // Refresh the data
    } catch (error) {
      console.error("Error generating bulk tokens:", error)
    } finally {
      setIsGenerating(false)
    }
  }

  const copyToClipboard = async (token: string) => {
    const fullUrl = `${window.location.origin}/${token}`
    await navigator.clipboard.writeText(fullUrl)
    setCopiedToken(token)
    setTimeout(() => setCopiedToken(null), 2000)
  }

  const deleteAllExpiredTokens = async () => {
    const supabase = createClient()
    const now = new Date().toISOString()

    try {
      const { error } = await supabase.from("access_tokens").delete().lt("expires_at", now).eq("is_permanent", false)

      if (error) throw error
      await loadData()
    } catch (error) {
      console.error("Error deleting expired tokens:", error)
    }
  }

  const exportData = () => {
    const data = {
      tokens,
      sessions,
      stats,
      exportDate: new Date().toISOString(),
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `admin-data-${new Date().toISOString().split("T")[0]}.json`
    a.click()
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date()
  }

  const getUsernameForToken = (tokenId: string) => {
    const username = phcornerUsernames.find((u) => u.token_hash === tokenId)
    return username?.username || "Not provided"
  }

  const createAnnouncement = async () => {
    if (!newAnnouncement.title || !newAnnouncement.message) {
      alert("Please fill in title and message")
      return
    }

    const supabase = createClient()
    try {
      console.log("[v0] Creating announcement with data:", newAnnouncement)

      const { error } = await supabase.from("announcements").insert([
        {
          title: newAnnouncement.title,
          message: newAnnouncement.message,
          type: newAnnouncement.type,
          show_on_home: newAnnouncement.show_popup,
          auto_dismiss_seconds: newAnnouncement.auto_dismiss_seconds || null,
        },
      ])

      if (error) {
        console.log("[v0] Database error:", error)
        throw error
      }

      setNewAnnouncement({
        title: "",
        message: "",
        type: "info",
        show_popup: false,
        auto_dismiss_seconds: null,
      })

      await loadData()
      alert("Announcement created successfully!")
    } catch (error) {
      console.error("Error creating announcement:", error)
      alert(`Failed to create announcement: ${error.message}`)
    }
  }

  const toggleAnnouncement = async (id: string, isActive: boolean) => {
    const supabase = createClient()
    try {
      const { error } = await supabase
        .from("announcements")
        .update({ is_active: !isActive, updated_at: new Date().toISOString() })
        .eq("id", id)

      if (error) throw error
      await loadData()
    } catch (error) {
      console.error("Error toggling announcement:", error)
    }
  }

  const toggleMaintenanceMode = async () => {
    const supabase = createClient()
    try {
      console.log("[v0] Toggling maintenance mode from:", maintenanceMode?.is_active)

      const { error } = await supabase
        .from("maintenance_mode")
        .update({
          is_active: !maintenanceMode?.is_active,
          updated_at: new Date().toISOString(),
        })
        .eq("id", maintenanceMode.id)

      if (error) throw error

      setMaintenanceMode((prev) =>
        prev
          ? {
            ...prev,
            is_active: !prev.is_active,
            updated_at: new Date().toISOString(),
          }
          : null,
      )

      console.log("[v0] Maintenance mode toggled successfully")
      await loadData()
    } catch (error) {
      console.error("Error toggling maintenance mode:", error)
    }
  }

  const updateMaintenanceMode = async () => {
    if (!editingMaintenance.title || !editingMaintenance.message) {
      alert("Please fill in both title and message")
      return
    }

    const supabase = createClient()
    try {
      const { error } = await supabase
        .from("maintenance_mode")
        .update({
          title: editingMaintenance.title,
          message: editingMaintenance.message,
          custom_color: editingMaintenance.custom_color, // Added custom_color update
          updated_at: new Date().toISOString(),
        })
        .eq("id", maintenanceMode.id)

      if (error) throw error

      setEditingMaintenance({ title: "", message: "", custom_color: "#ef4444" }) // Reset custom_color
      await loadData()
      alert("Maintenance mode updated successfully!")
    } catch (error) {
      console.error("Error updating maintenance mode:", error)
      alert("Failed to update maintenance mode")
    }
  }

  const resolveReport = async (reportId: string) => {
    const supabase = createClient()
    try {
      const { error } = await supabase
        .from("user_reports")
        .update({
          status: "resolved",
          resolved_at: new Date().toISOString(),
        })
        .eq("id", reportId)

      if (error) throw error
      await loadData()
    } catch (error) {
      console.error("Error resolving report:", error)
    }
  }

  const cleanupAllStaleSessions = async () => {
    try {
      const supabase = createClient()

      // Delete all sessions older than 5 minutes
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()

      const { error } = await supabase.from("active_sessions").delete().lt("last_heartbeat", fiveMinutesAgo)

      if (error) {
        console.error("Failed to cleanup stale sessions:", error)
        alert("Failed to cleanup stale sessions")
      } else {
        console.log("Cleaned up stale sessions")
        alert("Cleaned up all stale sessions")
        loadData() // Refresh the data
      }
    } catch (error) {
      console.error("Error cleaning up sessions:", error)
      alert("Error cleaning up sessions")
    }
  }

  const cleanupStaleSessions = async () => {
    const supabase = createClient()

    try {
      const { error } = await supabase.rpc("cleanup_stale_sessions")

      if (error) throw error

      console.log("[v0] Stale sessions cleaned up successfully")
      await loadData() // Refresh the data
    } catch (error) {
      console.error("[v0] Error cleaning up stale sessions:", error)
    }
  }

  const updateChannelRequestStatus = async (requestId: string, status: string, adminNotes?: string) => {
    const supabase = createClient()
    try {
      console.log("[v0] Updating channel request:", requestId, "to status:", status)

      const { error } = await supabase
        .from("channel_requests")
        .update({
          status,
          admin_notes: adminNotes || null,
          processed_by: "admin",
          processed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", requestId)

      if (error) {
        console.error("[v0] Database error updating channel request:", error)
        throw error
      }

      console.log("[v0] Channel request updated successfully")
      await loadData()
    } catch (error) {
      console.error("[v0] Error updating channel request:", error)
      alert(`Failed to update channel request: ${error.message}`)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-gray-600">Loading admin panel...</p>
        </div>
      </div>
    )
  }

  if (dbError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-black p-6">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Salvador Admin Panel</h1>
            <p className="text-gray-400">Token management and usage statistics</p>
          </div>

          <Card className="bg-white/10 backdrop-blur-lg border-white/20">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <AlertTriangle className="w-5 h-5 mr-2 text-yellow-400" />
                Database Setup Required
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-gray-300 mb-4">{dbError}</div>
              <div className="bg-gray-800/50 p-4 rounded-lg">
                <p className="text-sm text-gray-400 mb-2">To set up the database, run these scripts:</p>
                <code className="text-green-400 text-sm">
                  1. scripts/01-create-tables.sql
                  <br />
                  2. scripts/02-insert-permanent-token.sql
                </code>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-black p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Salvador Admin Panel</h1>
          <p className="text-gray-400">Advanced token management and system administration</p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2 mb-8 bg-white/5 p-1 rounded-lg">
          {[
            { id: "overview", label: "Overview", icon: BarChart3 },
            { id: "user-approvals", label: "User Approvals", icon: UserCheck },
            { id: "generate", label: "Generate Tokens", icon: Plus },
            { id: "manage", label: "Manage Tokens", icon: Settings },
            { id: "analytics", label: "Analytics", icon: Users },
            { id: "usernames", label: "PHCorner Users", icon: UserCheck },
            { id: "passwords", label: "Passwords On Each Token", icon: Shield },
            { id: "viewers", label: "Viewer Analytics", icon: Users },
            { id: "reports", label: "User Reports", icon: Shield },
            { id: "announcements", label: "Announcements", icon: AlertTriangle },
            { id: "maintenance", label: "Maintenance", icon: Settings },
            { id: "channel-requests", label: "Channel Requests", icon: Plus },
            { id: "user-ratings", label: "User Ratings", icon: Star },
            { id: "channel-manager", label: "Channel Manager", icon: Tv },
            { id: "channel-status", label: "Channel Status", icon: AlertTriangle },
            { id: "moving-text", label: "Moving Text", icon: MessageSquare },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center px-4 py-2 rounded-md transition-colors ${activeTab === tab.id ? "bg-white/20 text-white" : "text-gray-400 hover:text-white hover:bg-white/10"
                }`}
            >
              <tab.icon className="w-4 h-4 mr-2" />
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "overview" && (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <Card className="bg-white/10 backdrop-blur-lg border-white/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-400 flex items-center">
                    <Shield className="w-4 h-4 mr-2" />
                    Total Tokens
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">{stats.totalTokens}</div>
                </CardContent>
              </Card>

              <Card className="bg-white/10 backdrop-blur-lg border-white/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-400 flex items-center">
                    <Clock className="w-4 h-4 mr-2" />
                    Active Tokens
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-purple-400">{stats.activeTokens}</div>
                </CardContent>
              </Card>

              <Card className="bg-white/10 backdrop-blur-lg border-white/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-400 flex items-center">
                    <Users className="w-4 h-4 mr-2" />
                    Unique Users
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-400">{stats.uniqueUsers}</div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <Card className="bg-white/10 backdrop-blur-lg border-white/20">
                <CardHeader>
                  <CardTitle className="text-white">Token Viewers</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-purple-500/20 rounded-lg p-4">
                    <div className="text-purple-400 text-sm font-medium">Current Active Viewers</div>
                    <span className="text-white text-2xl font-bold">{stats.currentActiveUsage || 0}</span>
                  </div>

                  <div className="bg-blue-500/20 rounded-lg p-4">
                    <div className="text-blue-400 text-sm font-medium">Total Cumulative Usage</div>
                    <span className="text-white text-2xl font-bold">{stats.totalUsage || 0}</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/10 backdrop-blur-lg border-white/20">
                <CardHeader>
                  <CardTitle className="text-white">Token Statistics</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-green-500/20 rounded-lg p-4">
                    <div className="text-green-400 text-sm font-medium">Avg Usage Per Token</div>
                    <span className="text-white">
                      {stats.totalTokens > 0 ? (stats.totalUsage / stats.totalTokens).toFixed(1) : 0}
                    </span>
                  </div>

                  <div className="bg-orange-500/20 rounded-lg p-4">
                    <div className="text-orange-400 text-sm font-medium mb-2">Viewer Management</div>
                    <Button
                      onClick={cleanupStaleSessions}
                      size="sm"
                      className="bg-orange-500 hover:bg-orange-600 text-white"
                    >
                      Reset All Viewers
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card className="bg-white/10 backdrop-blur-lg border-white/20 mb-8">
              <CardHeader>
                <CardTitle className="text-white">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-4">
                  <Button
                    onClick={() => setActiveTab("generate")}
                    className="bg-blue-500/20 text-blue-400 border-blue-500/30 hover:bg-blue-500/30"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Generate Tokens
                  </Button>
                  <Button
                    onClick={deleteAllExpiredTokens}
                    variant="destructive"
                    className="bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/30"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Expired
                  </Button>
                  <Button
                    onClick={exportData}
                    className="bg-purple-500/20 text-purple-400 border-purple-500/30 hover:bg-purple-500/30"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export Data
                  </Button>
                  <Button
                    onClick={loadData}
                    className="bg-green-500/20 text-green-400 border-green-500/30 hover:bg-green-500/30"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh
                  </Button>
                  <Button
                    onClick={cleanupAllStaleSessions}
                    className="bg-orange-500/20 text-orange-400 border-orange-500/30 hover:bg-orange-500/30"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Cleanup All Stale Sessions
                  </Button>
                  <Button
                    onClick={() => (window.location.href = "/salvadoronlyadminpanel/playlisthome")}
                    className="bg-indigo-500/20 text-indigo-400 border-indigo-500/30 hover:bg-indigo-500/30"
                  >
                    <BarChart3 className="w-4 h-4 mr-2" />
                    Playlist Generator
                  </Button>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {activeTab === "user-approvals" && (
          <div className="space-y-6">
            {/* Search and Bulk Actions */}
            <Card className="bg-white/10 backdrop-blur-lg border-white/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <UserCheck className="w-5 h-5" />
                  User Management
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-4">
                  <div className="flex-1 min-w-[200px]">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        placeholder="Search users..."
                        value={userSearchQuery}
                        onChange={(e) => setUserSearchQuery(e.target.value)}
                        className="bg-white/10 border-white/20 text-white pl-10"
                      />
                    </div>
                  </div>
                  <Button
                    onClick={async () => {
                      const pending = pendingUsers.filter(u => u.status === 'pending')
                      for (const user of pending) {
                        await approveUser(user.id)
                      }
                    }}
                    className="bg-green-500/20 text-green-400 hover:bg-green-500/30"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Approve All ({pendingUsers.filter(u => u.status === 'pending').length})
                  </Button>
                  <Button
                    onClick={async () => {
                      const reason = prompt("Enter rejection reason for all:")
                      if (reason) {
                        const pending = pendingUsers.filter(u => u.status === 'pending')
                        for (const user of pending) {
                          await rejectUser(user.id, reason)
                        }
                      }
                    }}
                    className="bg-red-500/20 text-red-400 hover:bg-red-500/30"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Reject All
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Pending Users */}
            <Card className="bg-white/10 backdrop-blur-lg border-white/20">
              <CardHeader>
                <CardTitle className="text-white">Pending Approvals ({pendingUsers.filter(u => u.status === 'pending').length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {pendingUsers
                    .filter(u => u.status === 'pending')
                    .filter(u => 
                      u.username?.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
                      u.phcorner_user?.toLowerCase().includes(userSearchQuery.toLowerCase())
                    )
                    .map((user) => (
                    <div key={user.id} className="bg-white/5 p-4 rounded-lg border border-white/10">
                      <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-white font-medium">{user.username}</span>
                            <Badge className="bg-yellow-500/20 text-yellow-400">Pending</Badge>
                          </div>
                          {user.phcorner_user && (
                            <p className="text-sm text-gray-400">PHCorner: {user.phcorner_user}</p>
                          )}
                          <p className="text-xs text-gray-500">
                            Registered: {new Date(user.created_at).toLocaleString()}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => approveUser(user.id)}
                            className="bg-green-500/20 text-green-400 hover:bg-green-500/30"
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedPendingUser(user.id)
                              const reason = prompt("Enter rejection reason:")
                              if (reason) {
                                rejectUser(user.id, reason)
                              }
                            }}
                            className="bg-red-500/20 text-red-400 hover:bg-red-500/30"
                          >
                            <X className="w-4 h-4 mr-1" />
                            Reject
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {pendingUsers.filter(u => u.status === 'pending').length === 0 && (
                    <p className="text-gray-400 text-center py-8">No pending approvals</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Active Users */}
            <Card className="bg-white/10 backdrop-blur-lg border-white/20">
              <CardHeader>
                <CardTitle className="text-white">Active Users ({userAccounts.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {userAccounts
                    .filter(u => 
                      u.username?.toLowerCase().includes(userSearchQuery.toLowerCase())
                    )
                    .map((user) => (
                    <div key={user.id} className="bg-white/5 p-4 rounded-lg border border-white/10">
                      <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="space-y-1">
                          <span className="text-white font-medium">{user.username}</span>
                          <p className="text-xs text-gray-500">
                            Created: {new Date(user.created_at).toLocaleString()}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => forceLogoutUser(user.username)}
                            className="bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30"
                          >
                            Force Logout
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => {
                              const reason = prompt("Enter ban reason:")
                              if (reason) {
                                banUser(user.id, user.username, reason)
                              }
                            }}
                            className="bg-red-500/20 text-red-400 hover:bg-red-500/30"
                          >
                            Ban
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Banned Users */}
            <Card className="bg-white/10 backdrop-blur-lg border-white/20">
              <CardHeader>
                <CardTitle className="text-white text-red-400">Banned Users ({bannedUsers.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-[300px] overflow-y-auto">
                  {bannedUsers
                    .filter(u => 
                      u.username?.toLowerCase().includes(userSearchQuery.toLowerCase())
                    )
                    .map((user) => (
                    <div key={user.id} className="bg-red-500/10 p-4 rounded-lg border border-red-500/20">
                      <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="space-y-1">
                          <span className="text-white font-medium">{user.username}</span>
                          {user.reason && (
                            <p className="text-sm text-red-400">Reason: {user.reason}</p>
                          )}
                          <p className="text-xs text-gray-500">
                            Banned: {new Date(user.banned_at).toLocaleString()}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => unbanUser(user.id, user.username)}
                          className="bg-green-500/20 text-green-400 hover:bg-green-500/30"
                        >
                          Unban
                        </Button>
                      </div>
                    </div>
                  ))}
                  {bannedUsers.length === 0 && (
                    <p className="text-gray-400 text-center py-8">No banned users</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "generate" && (
          <Card className="bg-white/10 backdrop-blur-lg border-white/20 mb-8">
            <CardHeader>
              <CardTitle className="text-white">Generate Custom Tokens</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label className="text-gray-300">Number of Tokens</Label>
                    <Input
                      type="number"
                      min="1"
                      max="100"
                      value={newTokenConfig.count}
                      onChange={(e) =>
                        setNewTokenConfig({ ...newTokenConfig, count: Number.parseInt(e.target.value) || 1 })
                      }
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </div>

                  <div>
                    <Label className="text-gray-300">Duration Type</Label>
                    <Select
                      value={newTokenConfig.durationType}
                      onValueChange={(value) => setNewTokenConfig({ ...newTokenConfig, durationType: value })}
                    >
                      <SelectTrigger className="bg-white/10 border-white/20 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="minutes">Minutes</SelectItem>
                        <SelectItem value="hours">Hours</SelectItem>
                        <SelectItem value="days">Days</SelectItem>
                        <SelectItem value="weeks">Weeks</SelectItem>
                        <SelectItem value="months">Months</SelectItem>
                        <SelectItem value="unlimited">Unlimited</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {newTokenConfig.durationType !== "unlimited" && (
                    <div>
                      <Label className="text-gray-300">Duration</Label>
                      <Input
                        type="number"
                        min="1"
                        value={newTokenConfig.duration}
                        onChange={(e) =>
                          setNewTokenConfig({ ...newTokenConfig, duration: Number.parseInt(e.target.value) || 1 })
                        }
                        className="bg-white/10 border-white/20 text-white"
                      />
                    </div>
                  )}

                  <div>
                    <Label className="text-gray-300">Description (Optional)</Label>
                    <Textarea
                      value={newTokenConfig.description}
                      onChange={(e) => setNewTokenConfig({ ...newTokenConfig, description: e.target.value })}
                      className="bg-white/10 border-white/20 text-white"
                      placeholder="Token description or notes..."
                    />
                  </div>

                  <Button
                    onClick={generateBulkTokens}
                    disabled={isGenerating}
                    className="w-full bg-blue-500/20 text-blue-400 border-blue-500/30 hover:bg-blue-500/30"
                  >
                    {isGenerating ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4 mr-2" />
                        Generate Tokens
                      </>
                    )}
                  </Button>
                </div>

                {generatedTokens.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-white font-semibold">Generated Tokens</h3>
                    <div className="max-h-96 overflow-y-auto space-y-2">
                      {generatedTokens.map((token, index) => (
                        <div key={index} className="flex items-center justify-between bg-white/5 p-3 rounded-lg">
                          <code className="text-green-400 text-sm">
                            {window.location.origin}/{token}
                          </code>
                          <Button
                            onClick={() => copyToClipboard(token)}
                            size="sm"
                            className="bg-white/10 hover:bg-white/20"
                          >
                            {copiedToken === token ? (
                              <CheckCircle className="w-4 h-4 text-green-400" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === "manage" && (
          <Card className="bg-white/10 backdrop-blur-lg border-white/20 mb-8">
            <CardHeader>
              <CardTitle className="text-white">Token Management</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/20">
                      <th className="text-left py-3 px-4 text-gray-400">Token #</th>
                      <th className="text-left py-3 px-4 text-gray-400">Status</th>
                      <th className="text-left py-3 px-4 text-gray-400">Viewers</th>
                      <th className="text-left py-3 px-4 text-gray-400">Expires</th>
                      <th className="text-left py-3 px-4 text-gray-400">User IP</th>
                      <th className="text-left py-3 px-4 text-gray-400">PHCorner Username</th>
                      <th className="text-left py-3 px-4 text-gray-400">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tokens.map((token) => (
                      <tr key={token.id} className="border-b border-white/10">
                        <td className="py-3 px-4 text-white">
                          {token.is_permanent ? "Permanent" : `#${token.token_number}`}
                        </td>
                        <td className="py-3 px-4">
                          <Badge
                            variant={isExpired(token.expires_at) ? "destructive" : "default"}
                            className={
                              isExpired(token.expires_at) ? "" : "bg-purple-500/20 text-purple-400 border-purple-500/30"
                            }
                          >
                            {isExpired(token.expires_at) ? "Expired" : "Active"}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-white">{token.viewers || 0}</td>
                        <td className="py-3 px-4 text-gray-300">
                          {token.is_permanent ? "Never" : formatDate(token.expires_at)}
                        </td>
                        <td className="py-3 px-4 text-gray-300">{token.user_ip}</td>
                        <td className="py-3 px-4 text-purple-400">{getUsernameForToken(token.id)}</td>
                        <td className="py-3 px-4">
                          <div className="flex gap-2">
                            <Button
                              onClick={() => resetTokenUsage(token.id)}
                              size="sm"
                              variant="outline"
                              className="bg-yellow-500/20 border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/30"
                            >
                              Reset Viewers
                            </Button>
                            <Button
                              onClick={() => resetTokenUsage(token.id)}
                              size="sm"
                              variant="outline"
                              className="bg-blue-500/20 border-blue-500/30 text-blue-400 hover:bg-blue-500/30"
                            >
                              Reset Sessions
                            </Button>
                            <Button
                              onClick={() => deleteToken(token.id)}
                              size="sm"
                              variant="outline"
                              className="bg-red-500/20 border-red-500/30 text-red-400 hover:bg-red-500/30"
                            >
                              Remove Token
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === "analytics" && (
          <>
            {/* Enhanced Analytics Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <Card className="bg-white/10 backdrop-blur-lg border-white/20">
                <CardHeader>
                  <CardTitle className="text-white">Usage Analytics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Average Usage per Token:</span>
                      <span className="text-white">
                        {stats.totalTokens > 0 ? (stats.totalUsage / stats.totalTokens).toFixed(1) : 0}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Active Rate:</span>
                      <span className="text-emerald-400">
                        {stats.totalTokens > 0 ? ((stats.activeTokens / stats.totalTokens) * 100).toFixed(1) : 0}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Tokens per User:</span>
                      <span className="text-blue-400">
                        {stats.uniqueUsers > 0 ? (stats.totalTokens / stats.uniqueUsers).toFixed(1) : 0}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/10 backdrop-blur-lg border-white/20">
                <CardHeader>
                  <CardTitle className="text-white">System Health</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Database Status:</span>
                      <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">Connected</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Total Sessions:</span>
                      <span className="text-white">{sessions.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Last Activity:</span>
                      <span className="text-gray-300">
                        {sessions.length > 0 && sessions[0].last_token_generated
                          ? formatDate(sessions[0].last_token_generated)
                          : "None"}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sessions Table */}
            <Card className="bg-white/10 backdrop-blur-lg border-white/20">
              <CardHeader>
                <CardTitle className="text-white">User Sessions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/20">
                        <th className="text-left py-3 px-4 text-gray-400">User IP</th>
                        <th className="text-left py-3 px-4 text-gray-400">Last Token Generated</th>
                        <th className="text-left py-3 px-4 text-gray-400">First Seen</th>
                        <th className="text-left py-3 px-4 text-gray-400">User Agent</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sessions.map((session) => (
                        <tr key={session.id} className="border-b border-white/10">
                          <td className="py-3 px-4 text-white">{session.user_ip}</td>
                          <td className="py-3 px-4 text-gray-300">{formatDate(session.last_token_generated)}</td>
                          <td className="py-3 px-4 text-gray-300">{formatDate(session.created_at)}</td>
                          <td className="py-3 px-4 text-gray-300 max-w-xs truncate">{session.user_agent}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {activeTab === "usernames" && (
          <Card className="bg-white/10 backdrop-blur-lg border-white/20 mb-8">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <UserCheck className="w-5 h-5 mr-2" />
                PHCorner Usernames ({phcornerUsernames.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/20">
                      <th className="text-left py-3 px-4 text-gray-400">Username</th>
                      <th className="text-left py-3 px-4 text-gray-400">Password</th>
                      <th className="text-left py-3 px-4 text-gray-400">Token</th>
                      <th className="text-left py-3 px-4 text-gray-400">User IP</th>
                      <th className="text-left py-3 px-4 text-gray-400">Submitted</th>
                      <th className="text-left py-3 px-4 text-gray-400">User Agent</th>
                    </tr>
                  </thead>
                  <tbody>
                    {phcornerUsernames.map((username) => (
                      <tr key={username.id} className="border-b border-white/10">
                        <td className="py-3 px-4 text-purple-400 font-medium">{username.username}</td>
                        <td className="py-3 px-4 text-yellow-400 font-mono">{username.password || "Not provided"}</td>
                        <td className="py-3 px-4 text-white">{username.token_hash}</td>
                        <td className="py-3 px-4 text-gray-300">{username.user_ip}</td>
                        <td className="py-3 px-4 text-gray-300">{formatDate(username.created_at)}</td>
                        <td className="py-3 px-4 text-gray-300 max-w-xs truncate">{username.user_agent}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === "passwords" && (
          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Shield className="w-5 h-5 mr-2" />
                Passwords On Each Token
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {phcornerUsernames.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <UserCheck className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No PHCorner users found</p>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {phcornerUsernames.map((user) => {
                      // Find the corresponding token for this user
                      const correspondingToken = tokens.find(
                        (token) =>
                          token.id === user.token_hash ||
                          token.token_number.toString() === user.token_hash.replace(/\D/g, ""),
                      )

                      return (
                        <Card key={user.id} className="bg-gray-700/50 border-gray-600">
                          <CardContent className="p-4">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                              <div>
                                <div className="text-sm text-gray-400">Token</div>
                                <div className="text-white font-mono text-sm">
                                  {correspondingToken ? `Token #${correspondingToken.token_number}` : "Unknown Token"}
                                </div>
                                <div className="text-xs text-gray-500 mt-1">{user.token_hash.substring(0, 8)}...</div>
                              </div>

                              <div>
                                <div className="text-sm text-gray-400">PHCorner User</div>
                                <div className="text-white font-medium">{user.username || "Not provided"}</div>
                              </div>

                              <div>
                                <div className="text-sm text-gray-400">Password</div>
                                <div className="text-white font-mono text-sm bg-gray-800 px-2 py-1 rounded">
                                  {user.password || "Not set"}
                                </div>
                              </div>

                              <div>
                                <div className="text-sm text-gray-400">Created</div>
                                <div className="text-white text-sm">{formatDate(user.created_at)}</div>
                                <div className="text-xs text-gray-500">IP: {user.user_ip}</div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Viewer Analytics Tab */}
        {activeTab === "viewers" && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <Card className="bg-white/10 backdrop-blur-lg border-white/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-400">Total Active Viewers</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-400">{analyticsData.total_active_viewers || 0}</div>
                </CardContent>
              </Card>

              <Card className="bg-white/10 backdrop-blur-lg border-white/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-400">Active Channels</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-400">{analyticsData.total_active_channels || 0}</div>
                </CardContent>
              </Card>

              <Card className="bg-white/10 backdrop-blur-lg border-white/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-400">Peak Channel</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-lg font-bold text-slate-400">
                    {analyticsData.peak_channel_id || "N/A"}
                    {analyticsData.peak_channel_viewers > 0 && (
                      <div className="text-sm text-gray-400 mt-1">{analyticsData.peak_channel_viewers} viewers</div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="bg-white/10 backdrop-blur-lg border-white/20 mb-8">
              <CardHeader>
                <CardTitle className="text-white">Top 5 Most Viewed Channels</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/20">
                        <th className="text-left py-3 px-4 text-gray-400">Rank</th>
                        <th className="text-left py-3 px-4 text-gray-400">Channel ID</th>
                        <th className="text-left py-3 px-4 text-gray-400">Current Viewers</th>
                        <th className="text-left py-3 px-4 text-gray-400">Active Tokens</th>
                        <th className="text-left py-3 px-4 text-gray-400">Total Views</th>
                        <th className="text-left py-3 px-4 text-gray-400">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {viewerStats.slice(0, 5).map((stat, index) => (
                        <tr key={stat.channel_id} className="border-b border-white/10">
                          <td className="py-3 px-4 text-white font-bold">#{index + 1}</td>
                          <td className="py-3 px-4 text-white font-mono">{stat.channel_id}</td>
                          <td className="py-3 px-4 text-green-400 font-semibold">{stat.current_viewers || 0}</td>
                          <td className="py-3 px-4 text-blue-400 font-semibold">{stat.token_count || 0}</td>
                          <td className="py-3 px-4 text-slate-400 font-semibold">{stat.total_views || 0}</td>
                          <td className="py-3 px-4">
                            <Badge
                              className={`${stat.current_viewers > 0 ? "bg-green-500/20 text-green-400 border-green-500/30" : "bg-gray-500/20 text-gray-400 border-gray-500/30"}`}
                            >
                              {stat.current_viewers > 0 ? "Active" : "Inactive"}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                      {viewerStats.length === 0 && (
                        <tr>
                          <td colSpan={6} className="py-8 px-4 text-center text-gray-400">
                            No channels currently have active viewers
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/10 backdrop-blur-lg border-white/20">
              <CardHeader>
                <CardTitle className="text-white">Channel Analytics History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/20">
                        <th className="text-left py-3 px-4 text-gray-400">Channel ID</th>
                        <th className="text-left py-3 px-4 text-gray-400">Date</th>
                        <th className="text-left py-3 px-4 text-gray-400">Total Viewers</th>
                        <th className="text-left py-3 px-4 text-gray-400">Peak Viewers</th>
                        <th className="text-left py-3 px-4 text-gray-400">Watch Time (hrs)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {channelAnalytics.slice(0, 20).map((analytics) => (
                        <tr key={`${analytics.channel_id}-${analytics.date}`} className="border-b border-white/10">
                          <td className="py-3 px-4 text-white font-mono">{analytics.channel_id}</td>
                          <td className="py-3 px-4 text-gray-300">{analytics.date}</td>
                          <td className="py-3 px-4 text-blue-400">{analytics.total_viewers}</td>
                          <td className="py-3 px-4 text-purple-400">{analytics.peak_viewers}</td>
                          <td className="py-3 px-4 text-green-400">
                            {Math.round((analytics.total_watch_time || 0) / 3600)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* User Reports Tab */}
        {activeTab === "reports" && (
          <Card className="bg-white/10 backdrop-blur-lg border-white/20">
            <CardHeader>
              <CardTitle className="text-white">Automatic User Reports ({userReports.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/20">
                      <th className="text-left py-3 px-4 text-gray-400">Channel ID</th>
                      <th className="text-left py-3 px-4 text-gray-400">Type</th>
                      <th className="text-left py-3 px-4 text-gray-400">Description</th>
                      <th className="text-left py-3 px-4 text-gray-400">Status</th>
                      <th className="text-left py-3 px-4 text-gray-400">User IP</th>
                      <th className="text-left py-3 px-4 text-gray-400">Reported</th>
                      <th className="text-left py-3 px-4 text-gray-400">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {userReports.map((report) => (
                      <tr key={report.id} className="border-b border-white/10">
                        <td className="py-3 px-4 text-white font-mono">{report.channel_id}</td>
                        <td className="py-3 px-4">
                          <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                            {report.report_type}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-gray-300 max-w-xs truncate">{report.description}</td>
                        <td className="py-3 px-4">
                          <Badge
                            variant={report.status === "resolved" ? "default" : "destructive"}
                            className={
                              report.status === "resolved"
                                ? "bg-green-500/20 text-green-400 border-green-500/30"
                                : report.status === "investigating"
                                  ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                                  : "bg-red-500/20 text-red-400 border-red-500/30"
                            }
                          >
                            {report.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-gray-300">{report.user_ip}</td>
                        <td className="py-3 px-4 text-gray-300">{formatDate(report.created_at)}</td>
                        <td className="py-3 px-4">
                          {report.status !== "resolved" && (
                            <Button
                              onClick={() => resolveReport(report.id)}
                              size="sm"
                              className="bg-green-500/20 text-green-400 border-green-500/30 hover:bg-green-500/30"
                            >
                              Resolve
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Announcements Tab */}
        {activeTab === "announcements" && (
          <>
            <Card className="bg-white/10 backdrop-blur-lg border-white/20 mb-8">
              <CardHeader>
                <CardTitle className="text-white">Create New Announcement</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-300">Title</Label>
                    <Input
                      value={newAnnouncement.title}
                      onChange={(e) => setNewAnnouncement({ ...newAnnouncement, title: e.target.value })}
                      placeholder="Announcement title..."
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-300">Type</Label>
                    <Select
                      value={newAnnouncement.type}
                      onValueChange={(value) => setNewAnnouncement({ ...newAnnouncement, type: value })}
                    >
                      <SelectTrigger className="bg-white/10 border-white/20 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="info">Info</SelectItem>
                        <SelectItem value="warning">Warning</SelectItem>
                        <SelectItem value="maintenance">Maintenance</SelectItem>
                        <SelectItem value="success">Success</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label className="text-gray-300">Message</Label>
                  <Textarea
                    value={newAnnouncement.message}
                    onChange={(e) => setNewAnnouncement({ ...newAnnouncement, message: e.target.value })}
                    placeholder="Announcement message..."
                    className="bg-white/10 border-white/20 text-white"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center space-x-2 pt-6">
                    <input
                      type="checkbox"
                      checked={newAnnouncement.show_popup}
                      onChange={(e) => setNewAnnouncement({ ...newAnnouncement, show_popup: e.target.checked })}
                      className="rounded"
                    />
                    <Label className="text-gray-300">Show as Popup</Label>
                  </div>
                  <div>
                    <Label className="text-gray-300">Auto Dismiss (seconds)</Label>
                    <Input
                      type="number"
                      value={newAnnouncement.auto_dismiss_seconds || ""}
                      onChange={(e) =>
                        setNewAnnouncement({
                          ...newAnnouncement,
                          auto_dismiss_seconds: e.target.value ? Number.parseInt(e.target.value) : null,
                        })
                      }
                      placeholder="Leave empty for manual"
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </div>
                </div>
                <Button
                  onClick={createAnnouncement}
                  className="bg-blue-500/20 text-blue-400 border-blue-500/30 hover:bg-blue-500/30"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Announcement
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-white/10 backdrop-blur-lg border-white/20">
              <CardHeader>
                <CardTitle className="text-white">Active Announcements ({announcements.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/20">
                        <th className="text-left py-3 px-4 text-gray-400">Title</th>
                        <th className="text-left py-3 px-4 text-gray-400">Type</th>
                        <th className="text-left py-3 px-4 text-gray-400">Status</th>
                        <th className="text-left py-3 px-4 text-gray-400">Popup</th>
                        <th className="text-left py-3 px-4 text-gray-400">Auto Dismiss</th>
                        <th className="text-left py-3 px-4 text-gray-400">Created</th>
                        <th className="text-left py-3 px-4 text-gray-400">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {announcements.map((announcement) => (
                        <tr key={announcement.id} className="border-b border-white/10">
                          <td className="py-3 px-4 text-white font-semibold">{announcement.title}</td>
                          <td className="py-3 px-4">
                            <Badge
                              className={`
                              ${announcement.type === "warning" ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" : ""}
                              ${announcement.type === "maintenance" ? "bg-red-500/20 text-red-400 border-red-500/30" : ""}
                              ${announcement.type === "success" ? "bg-green-500/20 text-green-400 border-green-500/30" : ""}
                              ${announcement.type === "info" ? "bg-blue-500/20 text-blue-400 border-blue-500/30" : ""}
                            `}
                            >
                              {announcement.type}
                            </Badge>
                          </td>
                          <td className="py-3 px-4">
                            <Badge
                              variant={announcement.is_active ? "default" : "destructive"}
                              className={
                                announcement.is_active
                                  ? "bg-green-500/20 text-green-400 border-green-500/30"
                                  : "bg-gray-500/20 text-gray-400 border-gray-500/30"
                              }
                            >
                              {announcement.is_active ? "Active" : "Inactive"}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-gray-300">{announcement.show_on_home ? "Yes" : "No"}</td>
                          <td className="py-3 px-4 text-gray-300">
                            {announcement.auto_dismiss_seconds ? `${announcement.auto_dismiss_seconds}s` : "Manual"}
                          </td>
                          <td className="py-3 px-4 text-gray-300">{formatDate(announcement.created_at)}</td>
                          <td className="py-3 px-4">
                            <Button
                              onClick={() => toggleAnnouncement(announcement.id, announcement.is_active)}
                              size="sm"
                              className={
                                announcement.is_active
                                  ? "bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/30"
                                  : "bg-green-500/20 text-green-400 border-green-500/30 hover:bg-green-500/30"
                              }
                            >
                              {announcement.is_active ? "Deactivate" : "Activate"}
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* Maintenance Tab */}
        {activeTab === "maintenance" && (
          <Card className="bg-white/10 backdrop-blur-lg border-white/20">
            <CardHeader>
              <CardTitle className="text-white">Maintenance Mode Control</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                <div>
                  <h3 className="text-white font-semibold">Maintenance Mode</h3>
                  <p className="text-gray-400">
                    {maintenanceMode?.is_active ? "System is currently in maintenance mode" : "System is operational"}
                  </p>
                </div>
                <Button
                  onClick={toggleMaintenanceMode}
                  className={
                    maintenanceMode?.is_active
                      ? "bg-green-500/20 text-green-400 border-green-500/30"
                      : "bg-red-500/20 text-red-400 border-red-500/30"
                  }
                >
                  {maintenanceMode?.is_active ? "Disable Maintenance" : "Enable Maintenance"}
                </Button>
              </div>

              {maintenanceMode && (
                <div className="space-y-4">
                  <div>
                    <Label className="text-gray-300">Current Title</Label>
                    <div className="p-3 bg-white/5 rounded-lg text-white">{maintenanceMode.title}</div>
                  </div>
                  <div>
                    <Label className="text-gray-300">Current Message</Label>
                    <div className="p-3 bg-white/5 rounded-lg text-white">{maintenanceMode.message}</div>
                  </div>

                  <div className="border-t border-white/10 pt-4">
                    <h4 className="text-white font-semibold mb-4">Update Maintenance Mode</h4>
                    <div className="space-y-4">
                      <div>
                        <Label className="text-gray-300">New Title</Label>
                        <Input
                          value={editingMaintenance.title}
                          onChange={(e) => setEditingMaintenance({ ...editingMaintenance, title: e.target.value })}
                          placeholder="Enter maintenance title..."
                          className="bg-white/10 border-white/20 text-white"
                        />
                      </div>
                      <div>
                        <Label className="text-gray-300">New Message</Label>
                        <Textarea
                          value={editingMaintenance.message}
                          onChange={(e) => setEditingMaintenance({ ...editingMaintenance, message: e.target.value })}
                          placeholder="Enter maintenance message..."
                          className="bg-white/10 border-white/20 text-white"
                        />
                      </div>
                      <div>
                        <Label className="text-gray-300">Custom Color</Label>
                        <div className="flex items-center space-x-3">
                          <input
                            type="color"
                            value={editingMaintenance.custom_color}
                            onChange={(e) =>
                              setEditingMaintenance({ ...editingMaintenance, custom_color: e.target.value })
                            }
                            className="w-12 h-10 rounded border border-white/20 bg-transparent cursor-pointer"
                          />
                          <Input
                            value={editingMaintenance.custom_color}
                            onChange={(e) =>
                              setEditingMaintenance({ ...editingMaintenance, custom_color: e.target.value })
                            }
                            placeholder="#ef4444"
                            className="bg-white/10 border-white/20 text-white flex-1"
                          />
                        </div>
                      </div>
                      <Button
                        onClick={updateMaintenanceMode}
                        className="bg-blue-500/20 text-blue-400 border-blue-500/30 hover:bg-blue-500/30"
                      >
                        Update Maintenance Mode
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {" "}
                    {/* Changed to 3 columns to include color */}
                    <div>
                      <Label className="text-gray-300">Status</Label>
                      <div className="p-3 bg-white/5 rounded-lg">
                        <Badge
                          variant={maintenanceMode.is_active ? "destructive" : "default"}
                          className={
                            maintenanceMode.is_active
                              ? "bg-red-500/20 text-red-400 border-red-500/30"
                              : "bg-green-500/20 text-green-400 border-green-500/30"
                          }
                        >
                          {maintenanceMode.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    </div>
                    <div>
                      <Label className="text-gray-300">Current Color</Label>
                      <div className="p-3 bg-white/5 rounded-lg flex items-center space-x-2">
                        <div
                          className="w-4 h-4 rounded border border-white/20"
                          style={{ backgroundColor: maintenanceMode.custom_color }}
                        ></div>
                        <span className="text-white text-sm">{maintenanceMode.custom_color}</span>
                      </div>
                    </div>
                    <div>
                      <Label className="text-gray-300">Last Updated</Label>
                      <div className="p-3 bg-white/5 rounded-lg text-white">
                        {formatDate(maintenanceMode.updated_at)}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === "channel-requests" && (
          <Card className="bg-white/10 backdrop-blur-lg border-white/20">
            <CardHeader>
              <CardTitle className="text-white">Channel Requests ({channelRequests.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {channelRequests.map((request) => (
                  <Card key={request.id} className="bg-white/5 border-white/10">
                    <CardContent className="p-6">
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                        {/* Channel Info */}
                        <div className="lg:col-span-2">
                          <div className="flex items-center space-x-3">
                            <img
                              src={request.channel_logo || "/placeholder.svg"}
                              alt={request.channel_name}
                              className="w-12 h-12 object-contain rounded-lg bg-white/10 p-1"
                              onError={(e) => {
                                e.currentTarget.src = "/generic-channel-logo.png"
                              }}
                            />
                            <div>
                              <h3 className="text-white font-semibold text-sm">{request.channel_name}</h3>
                              <p className="text-gray-400 text-xs">{formatDate(request.created_at)}</p>
                            </div>
                          </div>
                        </div>

                        {/* Stream URL */}
                        <div className="lg:col-span-4">
                          <Label className="text-gray-400 text-xs">Stream URL</Label>
                          <div className="bg-gray-800/50 rounded-lg p-3 mt-1">
                            <div className="flex items-center justify-between">
                              <code className="text-green-400 text-xs break-all font-mono leading-relaxed">
                                {request.channel_link}
                              </code>
                              <Button
                                onClick={() => navigator.clipboard.writeText(request.channel_link)}
                                size="sm"
                                variant="ghost"
                                className="ml-2 h-6 w-6 p-0 text-gray-400 hover:text-white"
                              >
                                <Copy className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        </div>

                        {/* Clearkey */}
                        <div className="lg:col-span-3">
                          <Label className="text-gray-400 text-xs">Clearkey DRM</Label>
                          <div className="bg-gray-800/50 rounded-lg p-3 mt-1">
                            {request.clearkey_drm ? (
                              <div className="flex items-center justify-between">
                                <code className="text-yellow-400 text-xs break-all font-mono leading-relaxed">
                                  {request.clearkey_drm}
                                </code>
                                <Button
                                  onClick={() => navigator.clipboard.writeText(request.clearkey_drm)}
                                  size="sm"
                                  variant="ghost"
                                  className="ml-2 h-6 w-6 p-0 text-gray-400 hover:text-white"
                                >
                                  <Copy className="w-3 h-3" />
                                </Button>
                              </div>
                            ) : (
                              <span className="text-gray-500 text-xs">No DRM required</span>
                            )}
                          </div>
                        </div>

                        {/* Status & Actions */}
                        <div className="lg:col-span-3">
                          <div className="flex flex-col space-y-3">
                            <div>
                              <Label className="text-gray-400 text-xs">Status</Label>
                              <div className="mt-1">
                                <Badge
                                  className={`
                                    ${request.status === "pending" ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" : ""}
                                    ${request.status === "approved" ? "bg-green-500/20 text-green-400 border-green-500/30" : ""}
                                    ${request.status === "rejected" ? "bg-red-500/20 text-red-400 border-red-500/30" : ""}
                                  `}
                                >
                                  {request.status}
                                </Badge>
                              </div>
                            </div>

                            {/* Actions */}
                            {request.status === "pending" && (
                              <div className="flex gap-2">
                                <Button
                                  onClick={() => updateChannelRequestStatus(request.id, "approved")}
                                  size="sm"
                                  className="bg-green-500/20 text-green-400 border-green-500/30 hover:bg-green-500/30 flex-1"
                                >
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Approve
                                </Button>
                                <Button
                                  onClick={() => {
                                    const reason = prompt("Rejection reason (optional):")
                                    updateChannelRequestStatus(request.id, "rejected", reason || "Not suitable")
                                  }}
                                  size="sm"
                                  className="bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/30 flex-1"
                                >
                                  <AlertTriangle className="w-3 h-3 mr-1" />
                                  Reject
                                </Button>
                              </div>
                            )}

                            {/* Additional Info for Processed Requests */}
                            {request.status !== "pending" && (
                              <div className="text-xs text-gray-400">
                                <div>Processed: {request.processed_at ? formatDate(request.processed_at) : "N/A"}</div>
                                {request.admin_notes && (
                                  <div className="mt-1 p-2 bg-gray-800/30 rounded text-gray-300">
                                    Note: {request.admin_notes}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Additional Details Row */}
                      <div className="mt-4 pt-4 border-t border-white/10">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                          <div>
                            <span className="text-gray-400">Submitted by:</span>
                            <span className="text-white ml-2">{request.user_ip || "Unknown"}</span>
                          </div>
                          <div>
                            <span className="text-gray-400">Request ID:</span>
                            <span className="text-gray-300 ml-2 font-mono">{request.id.substring(0, 8)}...</span>
                          </div>
                          <div>
                            <span className="text-gray-400">Category:</span>
                            <span className="text-blue-400 ml-2">{request.category || "General"}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {channelRequests.length === 0 && (
                  <div className="text-center py-12">
                    <div className="text-gray-400 mb-4">
                      <Plus className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p className="text-lg">No channel requests yet</p>
                      <p className="text-sm">Channel requests will appear here when users submit them</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Summary Stats */}
              {channelRequests.length > 0 && (
                <div className="mt-6 pt-6 border-t border-white/10">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-white/5 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-white">
                        {channelRequests.filter((r) => r.status === "pending").length}
                      </div>
                      <div className="text-yellow-400 text-sm">Pending</div>
                    </div>
                    <div className="bg-white/5 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-white">
                        {channelRequests.filter((r) => r.status === "approved").length}
                      </div>
                      <div className="text-green-400 text-sm">Approved</div>
                    </div>
                    <div className="bg-white/5 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-white">
                        {channelRequests.filter((r) => r.status === "rejected").length}
                      </div>
                      <div className="text-red-400 text-sm">Rejected</div>
                    </div>
                    <div className="bg-white/5 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-white">{channelRequests.length}</div>
                      <div className="text-blue-400 text-sm">Total</div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === "user-ratings" && (
          <Card className="bg-white/10 backdrop-blur-lg border-white/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-white flex items-center">
                  <Star className="w-5 h-5 mr-2 text-yellow-400" />
                  User Ratings & Feedback
                </CardTitle>
                <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                  {userRatings.length} Ratings
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {/* Rating Stats */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
                {[5, 4, 3, 2, 1].map((star) => {
                  const count = userRatings.filter((r) => r.rating === star).length
                  const percentage = userRatings.length > 0 ? (count / userRatings.length) * 100 : 0
                  return (
                    <div key={star} className="bg-white/5 rounded-lg p-4 text-center">
                      <div className="flex items-center justify-center gap-1 mb-2">
                        {[...Array(star)].map((_, i) => (
                          <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        ))}
                      </div>
                      <div className="text-2xl font-bold text-white">{count}</div>
                      <div className="text-gray-400 text-xs">{percentage.toFixed(1)}%</div>
                    </div>
                  )
                })}
              </div>

              {/* Average Rating */}
              {userRatings.length > 0 && (
                <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-lg p-6 mb-6 text-center">
                  <div className="text-4xl font-bold text-white mb-2">
                    {(userRatings.reduce((sum, r) => sum + r.rating, 0) / userRatings.length).toFixed(1)}
                  </div>
                  <div className="flex items-center justify-center gap-1 mb-2">
                    {[...Array(5)].map((_, i) => {
                      const avg = userRatings.reduce((sum, r) => sum + r.rating, 0) / userRatings.length
                      return (
                        <Star
                          key={i}
                          className={`w-6 h-6 ${i < Math.round(avg) ? "fill-yellow-400 text-yellow-400" : "text-gray-600"}`}
                        />
                      )
                    })}
                  </div>
                  <div className="text-gray-400">Average Rating from {userRatings.length} reviews</div>
                </div>
              )}

              {/* Ratings List */}
              <div className="space-y-4">
                {userRatings.map((rating) => (
                  <Card key={rating.id} className="bg-white/5 border-white/10">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-white font-semibold">
                              {rating.user_type}: {rating.username || "Anonymous"}
                            </span>
                            <div className="flex items-center gap-0.5">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={`w-4 h-4 ${i < rating.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-600"}`}
                                />
                              ))}
                            </div>
                          </div>
                          <div className="text-gray-400 text-xs">{formatDate(rating.created_at)}</div>
                        </div>
                        <Badge
                          className={`
                            ${rating.rating >= 4 ? "bg-green-500/20 text-green-400 border-green-500/30" : ""}
                            ${rating.rating === 3 ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" : ""}
                            ${rating.rating <= 2 ? "bg-red-500/20 text-red-400 border-red-500/30" : ""}
                          `}
                        >
                          {rating.rating === 5 ? "Excellent" : rating.rating === 4 ? "Good" : rating.rating === 3 ? "Average" : rating.rating === 2 ? "Poor" : "Bad"}
                        </Badge>
                      </div>

                      {rating.satisfaction_comment && (
                        <div className="mb-3">
                          <div className="text-gray-400 text-xs mb-1">Comment:</div>
                          <div className="text-white text-sm bg-white/5 rounded p-2">{rating.satisfaction_comment}</div>
                        </div>
                      )}

                      {rating.complaint && (
                        <div className="mb-3">
                          <div className="text-red-400 text-xs mb-1">Complaint:</div>
                          <div className="text-white text-sm bg-red-500/10 border border-red-500/20 rounded p-2">{rating.complaint}</div>
                        </div>
                      )}

                      {rating.issues && rating.issues.length > 0 && (
                        <div className="mb-3">
                          <div className="text-orange-400 text-xs mb-1">Issues:</div>
                          <div className="flex flex-wrap gap-1">
                            {rating.issues.map((issue: string, i: number) => (
                              <Badge key={i} className="bg-orange-500/20 text-orange-400 border-orange-500/30 text-xs">
                                {issue}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {rating.features_to_add && (
                        <div className="mb-3">
                          <div className="text-blue-400 text-xs mb-1">Features Requested:</div>
                          <div className="text-white text-sm bg-blue-500/10 border border-blue-500/20 rounded p-2">{rating.features_to_add}</div>
                        </div>
                      )}

                      <div className="flex items-center gap-4 text-xs text-gray-500 mt-3 pt-3 border-t border-white/10">
                        <span>IP: {rating.user_ip}</span>
                        <span>ID: {rating.id.substring(0, 8)}...</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {userRatings.length === 0 && (
                  <div className="text-center py-12">
                    <Star className="w-12 h-12 mx-auto mb-4 text-gray-600" />
                    <p className="text-gray-400 text-lg">No user ratings yet</p>
                    <p className="text-gray-500 text-sm">User ratings will appear here when submitted</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Channel Manager Tab */}
        {activeTab === "channel-manager" && (
          <Card className="bg-white border border-gray-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-black text-2xl flex items-center gap-2">
                  <Tv className="w-6 h-6" />
                  Channel Manager
                </CardTitle>
                <p className="text-gray-600 mt-1">{dbChannels.length} channels total</p>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={async () => {
                    try {
                      const supabase = createClient()
                      const results = await Promise.allSettled(
                        allChannels.map(channel =>
                          supabase.from("channels").upsert({
                            id: channel.id,
                            name: channel.name,
                            url: channel.url,
                            logo: channel.logo || null,
                            category: channel.category,
                            is_hd: channel.isHD || false,
                            drm: channel.drm || null,
                            watermark: channel.watermark || null,
                            group_name: channel.group || null,
                          }, { onConflict: "id" })
                        )
                      )
                      const failed = results.filter(r => r.status === "rejected").length
                      if (failed > 0) console.error(`${failed} channels failed to import`)
                      const { data } = await supabase.from("channels").select("*").order("name")
                      setDbChannels(data || [])
                      alert(`Imported ${allChannels.length - failed} of ${allChannels.length} channels successfully.`)
                    } catch (err) {
                      console.error("Failed to import channels:", err)
                      alert("Import failed. Check console for details.")
                    }
                  }}
                  className="bg-black hover:bg-gray-800 text-white"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Import Hardcoded
                </Button>
                <Button
                  onClick={() => setShowAddChannelModal(true)}
                  className="bg-black hover:bg-gray-800 text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Channel
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Search and Filter */}
              <div className="mb-6 space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search channels..."
                    value={channelManagerSearch}
                    onChange={(e) => setChannelManagerSearch(e.target.value)}
                    className="bg-white border-gray-300 text-black pl-10"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  {["All", "Entertainment", "Kids", "Sports", "Movies", "News", "International", "EU", "Mediaquest", "ABS-CBN", "GMA", "TV5", "Other"].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setChannelManagerCategory(cat)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${channelManagerCategory === cat ? "bg-black text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300"}`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Channel List */}
              <div className="space-y-2">
                {dbChannels
                  .filter(ch => {
                    const matchesSearch = ch.name?.toLowerCase().includes(channelManagerSearch.toLowerCase())
                    const matchesCategory = channelManagerCategory === "All" || ch.category === channelManagerCategory || ch.group_name === channelManagerCategory
                    return matchesSearch && matchesCategory
                  })
                  .map((channel) => (
                    <div key={channel.id} className="flex items-center gap-4 p-4 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center overflow-hidden flex-shrink-0">
                        {channel.logo ? (
                          <img src={channel.logo} alt={channel.name} className="w-full h-full object-contain" />
                        ) : (
                          <Tv className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-black font-medium truncate">{channel.name}</h3>
                          {channel.is_hd && <span className="text-xs px-1.5 py-0.5 bg-black text-white rounded">HD</span>}
                          {channel.drm && <span className="text-xs px-1.5 py-0.5 bg-gray-800 text-white rounded">DRM</span>}
                          <span className={`text-xs px-1.5 py-0.5 rounded ${channel.is_active !== false ? "bg-green-500 text-white" : "bg-red-500 text-white"}`}>
                            {channel.is_active !== false ? "Active" : "Inactive"}
                          </span>
                        </div>
                        <p className="text-gray-500 text-sm truncate">{channel.url}</p>
                      </div>
                      <span className="text-gray-600 text-sm px-2 py-1 bg-gray-200 rounded">{channel.category || "Uncategorized"}</span>
                      <div className="flex gap-2">
                        {/* Activate/Deactivate Toggle */}
                        <button
                          onClick={async () => {
                            const supabase = createClient()
                            const newStatus = channel.is_active === false ? true : false
                            await supabase.from("channels").update({ is_active: newStatus }).eq("id", channel.id)
                            setDbChannels(prev => prev.map(c => c.id === channel.id ? { ...c, is_active: newStatus } : c))
                          }}
                          className={`p-2 rounded-lg transition-colors ${channel.is_active !== false ? "bg-green-100 text-green-600 hover:bg-green-200" : "bg-red-100 text-red-600 hover:bg-red-200"}`}
                          title={channel.is_active !== false ? "Deactivate channel" : "Activate channel"}
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        {/* Edit Button */}
                        <button
                          onClick={() => {
                            setEditingChannel(channel)
                            const drmKey = channel.drm?.clearkey ? Object.keys(channel.drm.clearkey)[0] : ""
                            const drmVal = channel.drm?.clearkey?.[drmKey] || ""
                            setEditChannelForm({
                              name: channel.name || "",
                              logo: channel.logo || "",
                              url: channel.url || "",
                              category: channel.category || "Entertainment",
                              group: channel.group_name || "Other",
                              drm_key_id: drmKey,
                              drm_key: drmVal,
                              is_hd: channel.is_hd || false,
                              non_hls: false,
                            })
                          }}
                          className="p-2 rounded-lg hover:bg-gray-200 text-gray-600 hover:text-black transition-colors"
                          title="Edit channel"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        {/* Delete Button */}
                        <button
                          onClick={async () => {
                            if (confirm(`Delete ${channel.name}?`)) {
                              const supabase = createClient()
                              await supabase.from("channels").delete().eq("id", channel.id)
                              setDbChannels(prev => prev.filter(c => c.id !== channel.id))
                            }
                          }}
                          className="p-2 rounded-lg hover:bg-red-100 text-gray-600 hover:text-red-600 transition-colors"
                          title="Remove channel"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
              </div>

              {dbChannels.length === 0 && (
                <div className="text-center py-12 border border-dashed border-gray-300 rounded-lg">
                  <Tv className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-600 text-lg">No channels found. Add your first channel above.</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Channel Status Manager Tab */}
        {activeTab === "channel-status" && (
          <Card className="bg-white border border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-black text-2xl flex items-center gap-2">
                <AlertTriangle className="w-6 h-6" />
                Channel Status Manager
              </CardTitle>
              <p className="text-gray-600">Manage channel availability and shutdown notices</p>
            </CardHeader>
            <CardContent>
              {/* Ceased Channels Alert */}
              {ceasedChannels.length === 0 ? (
                <div className="mb-6 p-4 bg-gray-100 border border-gray-300 rounded-lg">
                  <p className="text-gray-700 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5" />
                    No channels are currently marked as ceased.
                  </p>
                </div>
              ) : (
                <div className="mb-6 p-4 bg-gray-100 border border-gray-400 rounded-lg">
                  <p className="text-black flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" />
                    {ceasedChannels.length} channel(s) are currently marked as ceased.
                  </p>
                </div>
              )}

              {/* Channel Selector */}
              <div className="mb-6">
                <label className="text-black text-sm font-medium mb-2 block">Select Channel</label>
                <div className="relative mb-2">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search channels..."
                    value={channelStatusSearch}
                    className="bg-white border-gray-300 text-black pl-10"
                    onChange={(e) => setChannelStatusSearch(e.target.value)}
                  />
                </div>
                <select
                  value={selectedCeasedChannel || ""}
                  onChange={async (e) => {
                    const channelId = e.target.value
                    setSelectedCeasedChannel(channelId)
                    if (channelId) {
                      const supabase = createClient()
                      const { data } = await supabase.from("channel_status").select("*").eq("channel_id", channelId).single()
                      if (data) {
                        setCeasedChannelForm({
                          status_message: data.status_message || "",
                          reason: data.reason || "",
                          shutdown_image: data.shutdown_image || "",
                          shutdown_video: data.shutdown_video || "",
                          is_ceased: data.is_ceased || false
                        })
                      } else {
                        setCeasedChannelForm({ status_message: "", reason: "", shutdown_image: "", shutdown_video: "", is_ceased: false })
                      }
                    }
                  }}
                  className="w-full p-3 bg-white border border-gray-300 rounded-lg text-black"
                  size={8}
                >
                  <option value="">Choose a channel...</option>
                  {allChannels
                    .filter(ch => ch.name?.toLowerCase().includes(channelStatusSearch.toLowerCase()))
                    .map((ch) => (
                      <option key={ch.id} value={ch.id}>{ch.name} ({ch.id})</option>
                    ))}
                </select>
                <p className="text-gray-600 text-sm mt-2">{allChannels.length} channels found</p>
              </div>

              {/* Channel Status Form */}
              {selectedCeasedChannel && (
                <div className="space-y-6 border-t border-gray-200 pt-6">
                  {/* Mark as Ceased Toggle */}
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => setCeasedChannelForm(prev => ({ ...prev, is_ceased: !prev.is_ceased }))}
                      className={`w-12 h-12 rounded border-2 flex items-center justify-center ${ceasedChannelForm.is_ceased ? "bg-black border-black" : "bg-white border-gray-300"}`}
                    >
                      {ceasedChannelForm.is_ceased && (
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                    <span className="text-black font-medium">Mark as Ceased</span>
                  </div>

                  {/* Status Message */}
                  <div>
                    <label className="text-black text-sm mb-2 block">Status Message (shown to users)</label>
                    <Input
                      placeholder="E.g., This channel is temporarily unavailable"
                      value={ceasedChannelForm.status_message}
                      onChange={(e) => setCeasedChannelForm(prev => ({ ...prev, status_message: e.target.value }))}
                      className="bg-white border-gray-300 text-black"
                    />
                  </div>

                  {/* Reason */}
                  <div>
                    <label className="text-black text-sm mb-2 block">Reason (internal notes)</label>
                    <Input
                      placeholder="E.g., License expired, technical issues, etc."
                      value={ceasedChannelForm.reason}
                      onChange={(e) => setCeasedChannelForm(prev => ({ ...prev, reason: e.target.value }))}
                      className="bg-white border-gray-300 text-black"
                    />
                  </div>

                  {/* Shutdown Image */}
                  <div>
                    <label className="text-black text-sm mb-2 block">Shutdown Image URL</label>
                    <Input
                      placeholder="URL to display when channel is down"
                      value={ceasedChannelForm.shutdown_image}
                      onChange={(e) => setCeasedChannelForm(prev => ({ ...prev, shutdown_image: e.target.value }))}
                      className="bg-white border-gray-300 text-black"
                    />
                  </div>

                  {/* Shutdown Video */}
                  <div>
                    <label className="text-black text-sm mb-2 block">Shutdown Video URL (Repeating)</label>
                    <Input
                      placeholder="Video to loop when channel is down"
                      value={ceasedChannelForm.shutdown_video}
                      onChange={(e) => setCeasedChannelForm(prev => ({ ...prev, shutdown_video: e.target.value }))}
                      className="bg-white border-gray-300 text-black"
                    />
                  </div>

                  {/* Preview */}
                  {(ceasedChannelForm.shutdown_image || ceasedChannelForm.shutdown_video) && (
                    <div>
                      <label className="text-black text-sm mb-2 block">Preview</label>
                      <div className="aspect-video bg-gray-100 border border-gray-300 rounded-lg overflow-hidden">
                        {ceasedChannelForm.shutdown_video ? (
                          <video src={ceasedChannelForm.shutdown_video} className="w-full h-full object-contain" controls loop muted />
                        ) : ceasedChannelForm.shutdown_image ? (
                          <img src={ceasedChannelForm.shutdown_image} alt="Shutdown preview" className="w-full h-full object-contain" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-500">No preview available</div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Save Button */}
                  <Button
                    onClick={async () => {
                      if (!selectedCeasedChannel) return
                      const supabase = createClient()
                      const { error } = await supabase.from("channel_status").upsert({
                        channel_id: selectedCeasedChannel,
                        ...ceasedChannelForm,
                        updated_at: new Date().toISOString()
                      }, { onConflict: "channel_id" })
                      if (error) {
                        alert("Failed to save: " + error.message)
                        return
                      }
                      const { data } = await supabase.from("channel_status").select("*").eq("is_ceased", true)
                      setCeasedChannels(data || [])
                      alert("Channel status saved successfully!")
                    }}
                    className="w-full bg-black hover:bg-gray-800 text-white"
                  >
                    <Shield className="w-4 h-4 mr-2" />
                    Save Changes
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Moving Text Announcements Tab */}
        {activeTab === "moving-text" && (
          <div className="space-y-6">
            <Card className="bg-white border border-gray-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-black text-2xl flex items-center gap-2">
                  <MessageSquare className="w-6 h-6" />
                  Moving Text Announcements
                </CardTitle>
                <p className="text-gray-600">Create ticker announcements that scroll on the bottom of videos</p>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 space-y-5">
                  <h3 className="text-black font-semibold">Create New Announcement</h3>

                  {/* Message */}
                  <div>
                    <label className="text-gray-700 text-sm mb-1 block">Announcement Message</label>
                    <Textarea
                      placeholder="E.g., Channel will shutdown on Dec 31, 2026. Thank you for watching!"
                      value={newMovingText.message}
                      onChange={(e) => setNewMovingText(prev => ({ ...prev, message: e.target.value }))}
                      className="bg-white border-gray-300 text-black min-h-[80px]"
                    />
                  </div>

                  {/* Display Mode */}
                  <div>
                    <label className="text-gray-700 text-sm mb-2 block">Display Mode</label>
                    <div className="flex gap-2">
                      {(["scrolling", "static"] as const).map(mode => (
                        <button key={mode} onClick={() => setNewMovingText(prev => ({ ...prev, display_mode: mode }))}
                          className={`px-4 py-2 rounded-lg text-sm font-semibold capitalize ${newMovingText.display_mode === mode ? "bg-black text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300 border border-gray-300"}`}>
                          {mode}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Scroll Direction */}
                  {newMovingText.display_mode === "scrolling" && (
                    <div>
                      <label className="text-gray-700 text-sm mb-2 block">Scroll Direction</label>
                      <div className="flex gap-2">
                        <button onClick={() => setNewMovingText(prev => ({ ...prev, scroll_direction: "left" }))}
                          className={`px-4 py-2 rounded-lg text-sm font-semibold ${newMovingText.scroll_direction === "left" ? "bg-black text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300 border border-gray-300"}`}>
                          ← Scroll Left
                        </button>
                        <button onClick={() => setNewMovingText(prev => ({ ...prev, scroll_direction: "right" }))}
                          className={`px-4 py-2 rounded-lg text-sm font-semibold ${newMovingText.scroll_direction === "right" ? "bg-black text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300 border border-gray-300"}`}>
                          Scroll Right →
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Font */}
                  <div>
                    <label className="text-gray-700 text-sm mb-2 block">Font</label>
                    <div className="flex flex-wrap gap-2">
                      {["Segoe UI", "Arial", "Tahoma", "Verdana", "Comic Sans MS"].map(font => (
                        <button key={font} onClick={() => setNewMovingText(prev => ({ ...prev, font }))}
                          style={{ fontFamily: font }}
                          className={`px-3 py-2 rounded-lg text-sm ${newMovingText.font === font ? "bg-black text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300 border border-gray-300"}`}>
                          {font}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Scroll Speed */}
                  {newMovingText.display_mode === "scrolling" && (
                    <div>
                      <label className="text-gray-700 text-sm mb-2 block">Scroll Speed</label>
                      <div className="flex gap-2 items-center">
                        {[["Fast (10s)", 10], ["Normal (20s)", 20], ["Slow (30s)", 30]].map(([label, val]) => (
                          <button key={label as string} onClick={() => setNewMovingText(prev => ({ ...prev, scroll_speed: val as number }))}
                            className={`px-3 py-2 rounded-lg text-sm ${newMovingText.scroll_speed === val ? "bg-black text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300 border border-gray-300"}`}>
                            {label as string}
                          </button>
                        ))}
                        <Input type="number" value={newMovingText.scroll_speed}
                          onChange={(e) => setNewMovingText(prev => ({ ...prev, scroll_speed: Number(e.target.value) }))}
                          className="w-20 bg-white border-gray-300 text-black" />
                        <span className="text-gray-600 text-sm">seconds</span>
                      </div>
                    </div>
                  )}

                  {/* Target */}
                  <div>
                    <label className="text-gray-700 text-sm mb-2 block">Target</label>
                    <div className="flex gap-2">
                      {([["single", "Single Channel"], ["multiple", "Multiple Channels"], ["all", "All Channels"]] as const).map(([val, label]) => (
                        <button key={val} onClick={() => setNewMovingText(prev => ({ ...prev, target: val, channel_ids: [] }))}
                          className={`px-3 py-2 rounded-lg text-sm ${newMovingText.target === val ? "bg-black text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300 border border-gray-300"}`}>
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Channel Selector */}
                  {newMovingText.target !== "all" && (
                    <div>
                      <label className="text-gray-700 text-sm mb-2 block">Select Channels</label>
                      <div className="relative mb-2">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <Input placeholder="Search channels..."
                          value={movingTextChannelSearch}
                          onChange={(e) => setMovingTextChannelSearch(e.target.value)}
                          className="bg-white border-gray-300 text-black pl-10" />
                      </div>
                      <div className="border border-gray-300 rounded-lg max-h-48 overflow-y-auto bg-white">
                        {allChannels
                          .filter(ch => ch.name.toLowerCase().includes(movingTextChannelSearch.toLowerCase()))
                          .map(ch => (
                            <div key={ch.id}
                              onClick={() => {
                                const isSelected = newMovingText.channel_ids.includes(ch.id)
                                if (newMovingText.target === "single") {
                                  setNewMovingText(prev => ({ ...prev, channel_ids: isSelected ? [] : [ch.id] }))
                                } else {
                                  setNewMovingText(prev => ({
                                    ...prev,
                                    channel_ids: isSelected
                                      ? prev.channel_ids.filter(id => id !== ch.id)
                                      : [...prev.channel_ids, ch.id]
                                  }))
                                }
                              }}
                              className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-gray-100 border-b border-gray-200 last:border-0 ${newMovingText.channel_ids.includes(ch.id) ? "bg-gray-100" : ""}`}>
                              {ch.logo && <img src={ch.logo} alt="" className="w-8 h-8 rounded object-contain bg-gray-100" />}
                              <span className="text-black text-sm flex-1">{ch.name}</span>
                              <span className="text-gray-500 text-xs">{ch.id}</span>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Create Button */}
                  <Button
                    onClick={async () => {
                      if (!newMovingText.message.trim()) {
                        alert("Please enter an announcement message.")
                        return
                      }
                      if (newMovingText.target !== "all" && newMovingText.channel_ids.length === 0) {
                        alert("Please select at least one channel.")
                        return
                      }
                      const supabase = createClient()
                      const { error } = await supabase.from("moving_text_announcements").insert({
                        message: newMovingText.message,
                        display_mode: newMovingText.display_mode,
                        scroll_direction: newMovingText.scroll_direction,
                        font: newMovingText.font,
                        scroll_speed: newMovingText.scroll_speed,
                        target: newMovingText.target,
                        channel_ids: newMovingText.target === "all" ? [] : newMovingText.channel_ids,
                        is_active: true,
                        created_at: new Date().toISOString(),
                      })
                      if (error) { alert("Failed to create: " + error.message); return }
                      const { data } = await supabase.from("moving_text_announcements").select("*").order("created_at", { ascending: false })
                      setMovingTextAnnouncements(data || [])
                      setNewMovingText({ message: "", display_mode: "scrolling", scroll_direction: "left", font: "Segoe UI", scroll_speed: 20, target: "all", channel_ids: [], is_active: true })
                      alert("Announcement created!")
                    }}
                    className="w-full bg-black hover:bg-gray-800 text-white"
                  >
                    Create Announcement
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Active Moving Text Announcements */}
            <Card className="bg-white border border-gray-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-black">Active Ticker Announcements ({movingTextAnnouncements.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {movingTextAnnouncements.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No moving text announcements yet.</p>
                ) : (
                  <div className="space-y-3">
                    {movingTextAnnouncements.map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex-1 min-w-0">
                          <p className="text-black text-sm font-medium truncate">{item.message}</p>
                          <div className="flex gap-2 mt-1">
                            <span className="text-xs text-gray-600 bg-gray-200 px-2 py-0.5 rounded">{item.display_mode}</span>
                            <span className="text-xs text-gray-600 bg-gray-200 px-2 py-0.5 rounded">{item.target === "all" ? "All Channels" : `${item.channel_ids?.length || 0} channels`}</span>
                            <span className={`text-xs px-2 py-0.5 rounded ${item.is_active ? "bg-black text-white" : "bg-gray-200 text-gray-600"}`}>{item.is_active ? "Active" : "Inactive"}</span>
                          </div>
                        </div>
                        <div className="flex gap-2 ml-4">
                          <button
                            onClick={async () => {
                              const supabase = createClient()
                              await supabase.from("moving_text_announcements").update({ is_active: !item.is_active }).eq("id", item.id)
                              const { data } = await supabase.from("moving_text_announcements").select("*").order("created_at", { ascending: false })
                              setMovingTextAnnouncements(data || [])
                            }}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-200 text-gray-700 hover:bg-gray-300 border border-gray-300">
                            {item.is_active ? "Deactivate" : "Activate"}
                          </button>
                          <button
                            onClick={async () => {
                              if (!confirm("Delete this announcement?")) return
                              const supabase = createClient()
                              await supabase.from("moving_text_announcements").delete().eq("id", item.id)
                              setMovingTextAnnouncements(prev => prev.filter(a => a.id !== item.id))
                            }}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-200 text-gray-700 hover:bg-gray-300 border border-gray-300">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Add Channel Modal */}
        {showAddChannelModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white border border-gray-300 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl">
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="text-black text-xl font-bold">Add New Channel</h2>
                <button onClick={() => setShowAddChannelModal(false)} className="text-gray-500 hover:text-black">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="p-6 space-y-5">
                {/* Name + Logo */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-black text-sm mb-1 block font-medium">Name *</label>
                    <Input placeholder="e.g. CNN Philippines" value={addChannelForm.name}
                      onChange={(e) => setAddChannelForm(prev => ({ ...prev, name: e.target.value }))}
                      className="bg-white border-gray-300 text-black" />
                  </div>
                  <div>
                    <label className="text-black text-sm mb-1 block font-medium">Logo URL</label>
                    <Input placeholder="https://..." value={addChannelForm.logo}
                      onChange={(e) => setAddChannelForm(prev => ({ ...prev, logo: e.target.value }))}
                      className="bg-white border-gray-300 text-black" />
                  </div>
                </div>
                {/* Stream URL */}
                <div>
                  <label className="text-black text-sm mb-1 block font-medium">Stream URL *</label>
                  <Input placeholder="https://... (.m3u8, .mpd, etc.)" value={addChannelForm.url}
                    onChange={(e) => setAddChannelForm(prev => ({ ...prev, url: e.target.value }))}
                    className="bg-white border-gray-300 text-black" />
                </div>
                {/* Category */}
                <div>
                  <label className="text-black text-sm mb-2 block font-medium">Category</label>
                  <div className="flex flex-wrap gap-2">
                    {["Entertainment", "News", "Sports", "Kids", "Movies", "Anime", "Documentary", "Educational", "Music", "International"].map(cat => (
                      <button key={cat} onClick={() => setAddChannelForm(prev => ({ ...prev, category: cat }))}
                        className={`px-3 py-1.5 rounded-lg text-sm ${addChannelForm.category === cat ? "bg-black text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300"}`}>
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Section/Group */}
                <div>
                  <label className="text-black text-sm mb-2 block font-medium">Section (Group)</label>
                  <div className="flex flex-wrap gap-2">
                    {["Mediaquest", "ABS-CBN", "GMA", "TV5", "International", "Kids", "Sports", "News", "EU", "Other"].map(grp => (
                      <button key={grp} onClick={() => setAddChannelForm(prev => ({ ...prev, group: grp }))}
                        className={`px-3 py-1.5 rounded-lg text-sm ${addChannelForm.group === grp ? "bg-black text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300"}`}>
                        {grp}
                      </button>
                    ))}
                  </div>
                </div>
                {/* DRM */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-gray-600 text-sm mb-1 block">DRM Key ID (optional)</label>
                    <Input placeholder="e.g. ff8085fd9469913a..." value={addChannelForm.drm_key_id}
                      onChange={(e) => setAddChannelForm(prev => ({ ...prev, drm_key_id: e.target.value }))}
                      className="bg-white border-gray-300 text-black font-mono text-sm" />
                  </div>
                  <div>
                    <label className="text-gray-600 text-sm mb-1 block">DRM Key (optional)</label>
                    <Input placeholder="e.g. 2496ee469b2d1a19..." value={addChannelForm.drm_key}
                      onChange={(e) => setAddChannelForm(prev => ({ ...prev, drm_key: e.target.value }))}
                      className="bg-white border-gray-300 text-black font-mono text-sm" />
                  </div>
                </div>
                {/* Toggles */}
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg cursor-pointer" onClick={() => setAddChannelForm(prev => ({ ...prev, is_hd: !prev.is_hd }))}>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${addChannelForm.is_hd ? "bg-black border-black" : "bg-white border-gray-300"}`}>
                      {addChannelForm.is_hd && <div className="w-4 h-4 rounded-full bg-white" />}
                    </div>
                    <div>
                      <p className="text-black font-medium">HD Channel</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg cursor-pointer" onClick={() => setAddChannelForm(prev => ({ ...prev, non_hls: !prev.non_hls }))}>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${addChannelForm.non_hls ? "bg-black border-black" : "bg-white border-gray-300"}`}>
                      {addChannelForm.non_hls && <div className="w-4 h-4 rounded-full bg-white" />}
                    </div>
                    <div>
                      <p className="text-black font-medium">Non-HLS Fallback (MP4/WEBM/OGG)</p>
                      <p className="text-gray-500 text-sm">Enable direct video playback for non-HLS streams</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex gap-3 p-6 border-t border-gray-200">
                <Button
                  onClick={async () => {
                    if (!addChannelForm.name.trim() || !addChannelForm.url.trim()) {
                      alert("Name and Stream URL are required.")
                      return
                    }
                    const supabase = createClient()
                    const channelId = addChannelForm.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
                    const drmObj = addChannelForm.drm_key_id && addChannelForm.drm_key
                      ? { clearkey: { [addChannelForm.drm_key_id]: addChannelForm.drm_key } }
                      : null

                    // Build insert object with only existing columns
                    const channelData: Record<string, any> = {
                      id: channelId,
                      name: addChannelForm.name,
                      url: addChannelForm.url,
                      logo: addChannelForm.logo || null,
                      category: addChannelForm.category,
                      group_name: addChannelForm.group,
                      is_hd: addChannelForm.is_hd,
                      drm: drmObj,
                    }

                    // Try to add channel_number and is_active (may fail if columns don't exist)
                    try {
                      const { data: existingChannels } = await supabase
                        .from("channels")
                        .select("channel_number")
                        .order("channel_number", { ascending: false })
                        .limit(1)

                      if (existingChannels && existingChannels[0]?.channel_number !== undefined) {
                        const maxChannelNumber = existingChannels[0].channel_number || 88
                        channelData.channel_number = Math.max(89, maxChannelNumber + 1)
                        channelData.is_active = true
                      }
                    } catch {
                      // Columns don't exist yet, skip
                    }

                    const { error } = await supabase.from("channels").upsert(channelData, { onConflict: "id" })
                    if (error) { alert("Failed: " + error.message); return }
                    const { data } = await supabase.from("channels").select("*").order("name")
                    setDbChannels(data || [])
                    setShowAddChannelModal(false)
                    setAddChannelForm({ name: "", logo: "", url: "", category: "Entertainment", group: "Other", drm_key_id: "", drm_key: "", is_hd: true, non_hls: false })
                    alert("Channel added successfully!")
                  }}
                  className="flex-1 bg-black hover:bg-gray-800 text-white"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Add Channel
                </Button>
                <button onClick={() => setShowAddChannelModal(false)} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Channel Modal */}
        {editingChannel && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white border border-gray-300 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl">
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="text-black text-xl font-bold">Edit Channel: {editingChannel.name}</h2>
                <button onClick={() => setEditingChannel(null)} className="text-gray-500 hover:text-black">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="p-6 space-y-5">
                {/* Name + Logo */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-black text-sm mb-1 block font-medium">Name *</label>
                    <Input placeholder="e.g. CNN Philippines" value={editChannelForm.name}
                      onChange={(e) => setEditChannelForm(prev => ({ ...prev, name: e.target.value }))}
                      className="bg-white border-gray-300 text-black" />
                  </div>
                  <div>
                    <label className="text-black text-sm mb-1 block font-medium">Logo URL</label>
                    <Input placeholder="https://..." value={editChannelForm.logo}
                      onChange={(e) => setEditChannelForm(prev => ({ ...prev, logo: e.target.value }))}
                      className="bg-white border-gray-300 text-black" />
                  </div>
                </div>
                {/* Stream URL */}
                <div>
                  <label className="text-black text-sm mb-1 block font-medium">Stream URL *</label>
                  <Input placeholder="https://... (.m3u8, .mpd, etc.)" value={editChannelForm.url}
                    onChange={(e) => setEditChannelForm(prev => ({ ...prev, url: e.target.value }))}
                    className="bg-white border-gray-300 text-black" />
                </div>
                {/* Category */}
                <div>
                  <label className="text-black text-sm mb-2 block font-medium">Category</label>
                  <div className="flex flex-wrap gap-2">
                    {["Entertainment", "News", "Sports", "Kids", "Movies", "Anime", "Documentary", "Educational", "Music", "International"].map(cat => (
                      <button key={cat} onClick={() => setEditChannelForm(prev => ({ ...prev, category: cat }))}
                        className={`px-3 py-1.5 rounded-lg text-sm ${editChannelForm.category === cat ? "bg-black text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300"}`}>
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Section/Group */}
                <div>
                  <label className="text-black text-sm mb-2 block font-medium">Section (Group)</label>
                  <div className="flex flex-wrap gap-2">
                    {["Mediaquest", "ABS-CBN", "GMA", "TV5", "International", "Kids", "Sports", "News", "EU", "Other"].map(grp => (
                      <button key={grp} onClick={() => setEditChannelForm(prev => ({ ...prev, group: grp }))}
                        className={`px-3 py-1.5 rounded-lg text-sm ${editChannelForm.group === grp ? "bg-black text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300"}`}>
                        {grp}
                      </button>
                    ))}
                  </div>
                </div>
                {/* DRM */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-gray-600 text-sm mb-1 block">DRM Key ID (optional)</label>
                    <Input placeholder="e.g. ff8085fd9469913a..." value={editChannelForm.drm_key_id}
                      onChange={(e) => setEditChannelForm(prev => ({ ...prev, drm_key_id: e.target.value }))}
                      className="bg-white border-gray-300 text-black font-mono text-sm" />
                  </div>
                  <div>
                    <label className="text-gray-600 text-sm mb-1 block">DRM Key (optional)</label>
                    <Input placeholder="e.g. 2496ee469b2d1a19..." value={editChannelForm.drm_key}
                      onChange={(e) => setEditChannelForm(prev => ({ ...prev, drm_key: e.target.value }))}
                      className="bg-white border-gray-300 text-black font-mono text-sm" />
                  </div>
                </div>
                {/* HD Toggle */}
                <div className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg cursor-pointer" onClick={() => setEditChannelForm(prev => ({ ...prev, is_hd: !prev.is_hd }))}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${editChannelForm.is_hd ? "bg-black border-black" : "bg-white border-gray-300"}`}>
                    {editChannelForm.is_hd && <div className="w-4 h-4 rounded-full bg-white" />}
                  </div>
                  <div>
                    <p className="text-black font-medium">HD Channel</p>
                  </div>
                </div>
              </div>
              <div className="flex gap-3 p-6 border-t border-gray-200">
                <Button
                  onClick={async () => {
                    if (!editChannelForm.name.trim() || !editChannelForm.url.trim()) {
                      alert("Name and Stream URL are required.")
                      return
                    }
                    const supabase = createClient()
                    const drmObj = editChannelForm.drm_key_id && editChannelForm.drm_key
                      ? { clearkey: { [editChannelForm.drm_key_id]: editChannelForm.drm_key } }
                      : null
                    const { error } = await supabase.from("channels").update({
                      name: editChannelForm.name,
                      url: editChannelForm.url,
                      logo: editChannelForm.logo || null,
                      category: editChannelForm.category,
                      group_name: editChannelForm.group,
                      is_hd: editChannelForm.is_hd,
                      drm: drmObj,
                    }).eq("id", editingChannel.id)
                    if (error) { alert("Failed: " + error.message); return }
                    const { data } = await supabase.from("channels").select("*").order("name")
                    setDbChannels(data || [])
                    setEditingChannel(null)
                    alert("Channel updated successfully!")
                  }}
                  className="flex-1 bg-black hover:bg-gray-800 text-white"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Save Changes
                </Button>
                <button onClick={() => setEditingChannel(null)} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
