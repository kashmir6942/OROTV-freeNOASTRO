"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { X, Send, Loader2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

interface ChannelRequestModalProps {
  isOpen: boolean
  onClose: () => void
}

export function ChannelRequestModal({ isOpen, onClose }: ChannelRequestModalProps) {
  const [formData, setFormData] = useState({
    channelName: "",
    channelLogo: "",
    channelLink: "",
    clearkeyDrm: "",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "error">("idle")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.channelName || !formData.channelLogo || !formData.channelLink) {
      alert("Please fill in all required fields")
      return
    }

    setIsSubmitting(true)
    setSubmitStatus("idle")

    try {
      const supabase = createClient()

      const { error } = await supabase.from("channel_requests").insert([
        {
          channel_name: formData.channelName,
          channel_logo: formData.channelLogo,
          channel_link: formData.channelLink,
          clearkey_drm: formData.clearkeyDrm || null,
          user_ip: "unknown", // Will be populated by server if needed
          user_agent: navigator.userAgent,
        },
      ])

      if (error) throw error

      setSubmitStatus("success")
      setFormData({
        channelName: "",
        channelLogo: "",
        channelLink: "",
        clearkeyDrm: "",
      })

      setTimeout(() => {
        onClose()
        setSubmitStatus("idle")
      }, 2000)
    } catch (error) {
      console.error("Error submitting channel request:", error)
      setSubmitStatus("error")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-blue-600 via-purple-600 to-pink-500 p-1 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="bg-background rounded-xl p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Add Your Requested Channels 😊</h2>
              <p className="text-muted-foreground text-sm mt-1">(will be stored in admin panel)</p>
            </div>
            <Button onClick={onClose} variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-muted">
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Channel Name */}
              <div className="space-y-2">
                <Label htmlFor="channelName" className="text-sm font-medium">
                  Channel name <span className="text-red-500">(REQUIRED)</span>
                </Label>
                <Input
                  id="channelName"
                  value={formData.channelName}
                  onChange={(e) => setFormData({ ...formData, channelName: e.target.value })}
                  placeholder="Enter channel name..."
                  className="brutalist-input"
                  required
                />
              </div>

              {/* Channel Logo */}
              <div className="space-y-2">
                <Label htmlFor="channelLogo" className="text-sm font-medium">
                  Channel Logo <span className="text-red-500">(REQUIRED)</span>
                </Label>
                <Input
                  id="channelLogo"
                  value={formData.channelLogo}
                  onChange={(e) => setFormData({ ...formData, channelLogo: e.target.value })}
                  placeholder="Enter logo URL..."
                  className="brutalist-input"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Channel Link */}
              <div className="space-y-2">
                <Label htmlFor="channelLink" className="text-sm font-medium">
                  Channel Link, Be m3u8, ts, or mpd <span className="text-red-500">(REQUIRED)</span>
                </Label>
                <Textarea
                  id="channelLink"
                  value={formData.channelLink}
                  onChange={(e) => setFormData({ ...formData, channelLink: e.target.value })}
                  placeholder="Enter streaming URL..."
                  className="brutalist-input min-h-[80px]"
                  required
                />
              </div>

              {/* Clearkey DRM */}
              <div className="space-y-2">
                <Label htmlFor="clearkeyDrm" className="text-sm font-medium">
                  KEY:KEY <span className="text-muted-foreground">(Optional, for clearkey mpd drm)</span>
                </Label>
                <Textarea
                  id="clearkeyDrm"
                  value={formData.clearkeyDrm}
                  onChange={(e) => setFormData({ ...formData, clearkeyDrm: e.target.value })}
                  placeholder="Enter clearkey if needed..."
                  className="brutalist-input min-h-[80px]"
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end pt-4">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="brutalist-button bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white px-8"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Submit Request
                  </>
                )}
              </Button>
            </div>

            {/* Status Messages */}
            {submitStatus === "success" && (
              <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                <p className="text-green-600 text-sm font-medium">
                  ✅ Channel request submitted successfully! It will be reviewed by admins.
                </p>
              </div>
            )}

            {submitStatus === "error" && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                <p className="text-red-600 text-sm font-medium">❌ Failed to submit request. Please try again.</p>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  )
}
