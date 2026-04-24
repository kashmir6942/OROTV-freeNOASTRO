"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createClient } from "@/lib/supabase/client"
import { usePathname } from 'next/navigation'
import { setUserPreference } from "@/lib/user-preferences"

interface PHCornerUsernamePopupProps {
  isOpen: boolean
  onClose: () => void
}

export function PHCornerUsernamePopup({ isOpen, onClose }: PHCornerUsernamePopupProps) {
  const [username, setUsername] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const pathname = usePathname()

  const characterCount = username.trim().length
  const isOkButtonEnabled = characterCount > 2

  const handleSubmit = async () => {
    if (!isOkButtonEnabled) return

    console.log("[v0] PHCorner Popup - Submitting username:", username)
    setIsSubmitting(true)
    const supabase = createClient()

    try {
      // Get current token from URL or sessionStorage
      let currentToken = "anonymous"

      if (pathname.startsWith("/") && pathname !== "/") {
        // Extract token from URL path
        const pathToken = pathname.slice(1)
        if (pathToken && !pathToken.includes("/")) {
          currentToken = pathToken
        }
      }

      // Also check sessionStorage for current token
      const sessionToken = sessionStorage.getItem("currentToken")
      if (sessionToken) {
        currentToken = sessionToken
      }

      console.log("[v0] PHCorner Popup - Using token:", currentToken)

      // Get client IP
      let clientIP = "unknown"
      try {
        const ipResponse = await fetch("/api/get-client-ip")
        const ipData = await ipResponse.json()
        clientIP = ipData.ip || "unknown"
      } catch (error) {
        console.error("[v0] PHCorner Popup - Error getting IP:", error)
      }

      const { error } = await supabase.from("phcorner_usernames").insert({
        username: username.trim(),
        token_hash: currentToken,
        user_ip: clientIP,
        user_agent: navigator.userAgent,
      })

      if (error) {
        console.error("[v0] PHCorner Popup - Error storing username:", error)
      } else {
        console.log("[v0] PHCorner Popup - Successfully stored username")
      }

      await setUserPreference("phcorner_username_submitted", true)
      await setUserPreference("phcorner_username", username.trim())
      await setUserPreference(`auth_verified_${currentToken}`, true)

      onClose()
    } catch (error) {
      console.error("[v0] PHCorner Popup - Error submitting username:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  console.log("[v0] PHCorner Popup - Render state:", {
    isOpen,
    username,
    characterCount,
    isOkButtonEnabled,
  })

  return (
    <Dialog open={isOpen} onOpenChange={() => {}} modal>
      <DialogContent className="sm:max-w-md bg-black/95 border-purple-500/50 text-white backdrop-blur-lg animate-in fade-in-0 zoom-in-95 duration-300">
        <DialogHeader>
          <DialogTitle className="text-center text-xl font-bold text-purple-400 animate-in slide-in-from-top-2 duration-500">
            This Website Is Created By Sky Bronze
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4 animate-in slide-in-from-bottom-2 duration-500 delay-150">
          <div className="space-y-2">
            <Label htmlFor="username" className="text-white font-medium">
              What's Your PHCorner Username?
            </Label>
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your PHCorner username (more than 2 letters)..."
              className="bg-gray-800/70 border-purple-500/30 text-white placeholder-gray-400 focus:border-purple-400 transition-all duration-300 focus:scale-[1.02] focus:shadow-lg focus:shadow-purple-500/20"
              disabled={isSubmitting}
              autoFocus
            />
            <p
              className={`text-xs transition-all duration-300 ${
                characterCount > 2 ? "text-green-400 animate-pulse" : "text-gray-400"
              }`}
            >
              Current character count: {characterCount} (need more than 2 letters)
            </p>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={!isOkButtonEnabled || isSubmitting}
            className={`w-full transition-all duration-300 transform hover:scale-105 active:scale-95 ${
              isOkButtonEnabled
                ? "bg-purple-600 hover:bg-purple-700 text-white shadow-lg hover:shadow-purple-500/30 animate-pulse"
                : "bg-gray-600 text-gray-400 cursor-not-allowed"
            }`}
          >
            {isSubmitting ? (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>Submitting...</span>
              </div>
            ) : (
              "Ok"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
