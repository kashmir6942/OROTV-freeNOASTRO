"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { X, AlertTriangle, Info, CheckCircle, Settings } from 'lucide-react'

interface Announcement {
  id: string
  title: string
  message: string
  type: "info" | "warning" | "maintenance" | "success"
  is_active: boolean
  priority: number
  show_popup: boolean
  auto_dismiss_seconds: number | null
  created_at: string
  expires_at: string | null
}

interface MaintenanceMode {
  id: string
  is_active: boolean
  title: string
  message: string
  custom_color: string // Added custom_color field
  estimated_duration: string | null
  start_time: string
  end_time: string | null
}

export function AnnouncementsSystem() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [maintenanceMode, setMaintenanceMode] = useState<MaintenanceMode | null>(null)
  const [dismissedAnnouncements, setDismissedAnnouncements] = useState<string[]>([])
  const [showBanner, setShowBanner] = useState(false)
  const [currentPopup, setCurrentPopup] = useState<Announcement | null>(null)

  useEffect(() => {
    const supabase = createClient()

    // Load initial data
    loadAnnouncements()
    loadMaintenanceMode()

    const announcementsChannel = supabase
      .channel("announcements-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "announcements" }, (payload) => {
        console.log("[v0] Announcements change:", payload)
        // Immediately reload to ensure sync
        loadAnnouncements()
      })
      .subscribe((status) => {
        console.log("[v0] Announcements subscription status:", status)
      })

    const maintenanceChannel = supabase
      .channel("maintenance-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "maintenance_mode" }, (payload) => {
        console.log("[v0] Maintenance mode change:", payload)
        if (payload.eventType === "UPDATE" && payload.new) {
          setMaintenanceMode(payload.new as MaintenanceMode)
        } else {
          // Fallback to reload if payload structure is unexpected
          loadMaintenanceMode()
        }
      })
      .subscribe((status) => {
        console.log("[v0] Maintenance subscription status:", status)
      })

    return () => {
      console.log("[v0] Cleaning up subscriptions")
      supabase.removeChannel(announcementsChannel)
      supabase.removeChannel(maintenanceChannel)
    }
  }, [])

  const loadAnnouncements = async () => {
    const supabase = createClient()
    try {
      const { data, error } = await supabase
        .from("announcements")
        .select("*")
        .eq("is_active", true)
        .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
        .order("priority", { ascending: false })
        .order("created_at", { ascending: false })

      if (error) {
        console.error("[v0] Error loading announcements:", error)
        return
      }

      const announcementData = Array.isArray(data) ? data : []
      setAnnouncements(announcementData)

      const popupAnnouncement = announcementData?.find((ann) => ann.show_popup && !dismissedAnnouncements.includes(ann.id))

      if (popupAnnouncement && !currentPopup) {
        setCurrentPopup(popupAnnouncement)

        // Auto-dismiss if configured
        if (popupAnnouncement.auto_dismiss_seconds) {
          setTimeout(() => {
            dismissAnnouncement(popupAnnouncement.id)
          }, popupAnnouncement.auto_dismiss_seconds * 1000)
        }
      }

      // Show banner if there are active announcements
      setShowBanner(announcementData && announcementData.length > 0)
    } catch (error) {
      console.error("[v0] Error loading announcements:", error)
    }
  }

  const loadMaintenanceMode = async () => {
    const supabase = createClient()
    try {
      const { data, error } = await supabase.from("maintenance_mode").select("*").single()

      if (error) {
        console.error("[v0] Error loading maintenance mode:", error)
        return
      }

      console.log("[v0] Loaded maintenance mode:", data)
      setMaintenanceMode(data)
    } catch (error) {
      console.error("[v0] Error loading maintenance mode:", error)
    }
  }

  const dismissAnnouncement = (announcementId: string) => {
    setDismissedAnnouncements((prev) => [...prev, announcementId])
    if (currentPopup?.id === announcementId) {
      setCurrentPopup(null)
    }
  }

  const getAnnouncementIcon = (type: string) => {
    switch (type) {
      case "warning":
        return <AlertTriangle className="w-5 h-5" />
      case "maintenance":
        return <Settings className="w-5 h-5" />
      case "success":
        return <CheckCircle className="w-5 h-5" />
      default:
        return <Info className="w-5 h-5" />
    }
  }

  const getAnnouncementColors = (type: string) => {
    switch (type) {
      case "warning":
        return "bg-yellow-500/20 border-yellow-500/30 text-yellow-200"
      case "maintenance":
        return "bg-red-500/20 border-red-500/30 text-red-200"
      case "success":
        return "bg-green-500/20 border-green-500/30 text-green-200"
      default:
        return "bg-blue-500/20 border-blue-500/30 text-blue-200"
    }
  }

  console.log("[v0] Current maintenance mode state:", maintenanceMode)

  // Maintenance Mode Overlay
  if (maintenanceMode?.is_active) {
    console.log("[v0] Rendering maintenance overlay")
    return (
      <div className="fixed inset-0 bg-black/95 z-[9999] flex items-center justify-center p-6 animate-in fade-in-0 duration-500">
        <div
          className="bg-gray-900 rounded-2xl p-8 max-w-md text-center shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-4 duration-700"
          style={{ borderColor: `${maintenanceMode.custom_color}50`, borderWidth: "1px" }}
        >
          <div className="mb-6">
            <div
              className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center animate-in zoom-in-95 duration-500 delay-300"
              style={{ backgroundColor: `${maintenanceMode.custom_color}20` }}
            >
              <Settings
                className="w-8 h-8 animate-spin"
                style={{
                  color: maintenanceMode.custom_color,
                  filter: "drop-shadow(0 0 8px currentColor)",
                }}
              />
            </div>
            <h2 className="text-2xl font-bold text-white mb-3 animate-in slide-in-from-top-2 duration-500 delay-500">
              {maintenanceMode.title}
            </h2>
            <p className="text-gray-300 leading-relaxed animate-in slide-in-from-bottom-2 duration-500 delay-700">
              {maintenanceMode.message}
            </p>
          </div>

          {maintenanceMode.estimated_duration && (
            <div className="mb-6 p-4 bg-gray-800/50 rounded-lg animate-in fade-in-0 duration-500 delay-1000">
              <p className="text-sm text-gray-400">Estimated Duration</p>
              <p className="text-white font-semibold">{maintenanceMode.estimated_duration}</p>
            </div>
          )}

          <div className="flex items-center justify-center space-x-2 text-xs text-gray-400 animate-in slide-in-from-bottom-2 duration-500 delay-1200">
            <div
              className="w-2 h-2 rounded-full animate-pulse"
              style={{
                backgroundColor: maintenanceMode.custom_color,
                boxShadow: `0 0 8px ${maintenanceMode.custom_color}50`,
              }}
            ></div>
            <span>We'll be back soon. Thank you for your patience.</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Announcement Banner */}
      {showBanner && announcements.length > 0 && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-gray-900 to-black border-b border-gray-700 animate-in slide-in-from-top-2 duration-500">
          <div className="max-w-7xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3 animate-in slide-in-from-left-2 duration-500 delay-150">
                <div className="animate-pulse">{getAnnouncementIcon(announcements[0].type)}</div>
                <div>
                  <h3 className="text-white font-semibold text-sm">{announcements[0].title}</h3>
                  <p className="text-gray-300 text-xs">{announcements[0].message}</p>
                </div>
              </div>
              <Button
                onClick={() => setShowBanner(false)}
                variant="ghost"
                size="sm"
                className="text-gray-400 hover:text-white transition-all duration-300 hover:scale-110 hover:rotate-90"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Announcement Popup */}
      {currentPopup && (
        <div className="fixed inset-0 bg-black/50 z-[9998] flex items-center justify-center p-6 animate-in fade-in-0 duration-300">
          <div
            className={`max-w-md w-full rounded-2xl border p-6 shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-4 duration-500 ${getAnnouncementColors(currentPopup.type)}`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3 animate-in slide-in-from-left-2 duration-500 delay-150">
                <div className="animate-pulse">{getAnnouncementIcon(currentPopup.type)}</div>
                <h3 className="font-bold text-lg">{currentPopup.title}</h3>
              </div>
              <Button
                onClick={() => dismissAnnouncement(currentPopup.id)}
                variant="ghost"
                size="sm"
                className="text-current hover:bg-white/10 transition-all duration-300 hover:scale-110 hover:rotate-90"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <p className="text-current/90 leading-relaxed mb-6 animate-in slide-in-from-bottom-2 duration-500 delay-300">
              {currentPopup.message}
            </p>

            <div className="flex justify-end space-x-3 animate-in slide-in-from-bottom-2 duration-500 delay-500">
              <Button
                onClick={() => dismissAnnouncement(currentPopup.id)}
                className="bg-white/20 hover:bg-white/30 text-current border-current/30 transition-all duration-300 hover:scale-105 active:scale-95"
              >
                Got it
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
