"use client"

import { useState } from "react"

import type React from "react"
import { useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createClient } from "@/lib/supabase/client"
import { usePathname } from "next/navigation"
import { setUserPreference } from "@/lib/user-preferences"

interface PasswordVerificationPopupProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  onFailure: () => void
}

export function PasswordVerificationPopup({ isOpen, onClose, onSuccess, onFailure }: PasswordVerificationPopupProps) {
  const [password, setPassword] = useState("")
  const [attempts, setAttempts] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [isLocked, setIsLocked] = useState(false)
  const [showError, setShowError] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    const checkLockStatus = async () => {
      if (!isOpen) return

      const supabase = createClient()
      let currentToken = "anonymous"
      if (pathname.startsWith("/") && pathname !== "/") {
        const pathToken = pathname.slice(1)
        if (pathToken && !pathToken.includes("/")) {
          currentToken = pathToken
        }
      }

      try {
        const { data, error } = await supabase
          .from("phcorner_usernames")
          .select("is_locked, failed_attempts")
          .eq("token_hash", currentToken)
          .single()

        if (data && data.is_locked) {
          console.log("[v0] Password Verification - Token is locked")
          setIsLocked(true)
          onFailure()
          return
        }

        if (data) {
          setAttempts(data.failed_attempts || 0)
        }
      } catch (error) {
        console.error("[v0] Password Verification - Error checking lock status:", error)
      }
    }

    checkLockStatus()
  }, [isOpen, pathname, onFailure])

  useEffect(() => {
    if (errorMessage) {
      setShowError(true)
      const timer = setTimeout(() => setShowError(false), 3000)
      return () => clearTimeout(timer)
    }
  }, [errorMessage])

  const handleSubmit = async () => {
    if (!password.trim() || isLocked) return

    console.log("[v0] Password Verification - Attempting verification")
    setIsSubmitting(true)
    setErrorMessage("")

    const supabase = createClient()

    try {
      let currentToken = "anonymous"
      if (pathname.startsWith("/") && pathname !== "/") {
        const pathToken = pathname.slice(1)
        if (pathToken && !pathToken.includes("/")) {
          currentToken = pathToken
        }
      }

      const { data, error } = await supabase
        .from("phcorner_usernames")
        .select("password, is_locked, failed_attempts")
        .eq("token_hash", currentToken)
        .single()

      if (error || !data) {
        console.error("[v0] Password Verification - Error fetching password:", error)
        await supabase.rpc("increment_failed_attempts", { token_hash_param: currentToken })
        setAttempts((prev) => prev + 1)
        setErrorMessage("Invalid password. Please try again.")

        if (attempts + 1 >= 3) {
          onFailure()
          return
        }
      } else if (data.is_locked) {
        console.log("[v0] Password Verification - Token is locked")
        onFailure()
        return
      } else if (data.password === password.trim()) {
        console.log("[v0] Password Verification - Password correct")
        await supabase.rpc("reset_attempts_on_success", { token_hash_param: currentToken })
        await setUserPreference(`auth_verified_${currentToken}`, true)
        onSuccess()
        onClose()
      } else {
        console.log("[v0] Password Verification - Password incorrect")
        const { data: lockResult } = await supabase.rpc("increment_failed_attempts", { token_hash_param: currentToken })

        setAttempts((prev) => prev + 1)
        setErrorMessage("Invalid password. Please try again.")

        if (lockResult || attempts + 1 >= 3) {
          onFailure()
          return
        }
      }
    } catch (error) {
      console.error("[v0] Password Verification - Error:", error)
      setAttempts((prev) => prev + 1)
      setErrorMessage("Error verifying password. Please try again.")

      if (attempts + 1 >= 3) {
        onFailure()
        return
      }
    } finally {
      setIsSubmitting(false)
      setPassword("")
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && password.trim() && !isSubmitting) {
      handleSubmit()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={() => {}} modal>
      <DialogContent className="sm:max-w-md bg-black/95 border-red-500/50 text-white animate-in fade-in-0 zoom-in-95 duration-300">
        <DialogHeader>
          <DialogTitle className="text-center text-xl font-bold text-red-400 animate-in slide-in-from-top-2 duration-500">
            {isLocked ? "Access Locked" : "Access Verification Required"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4 animate-in slide-in-from-bottom-2 duration-500 delay-150">
          {isLocked ? (
            <div className="text-center space-y-2 animate-in fade-in-0 duration-700 delay-300">
              <div className="text-4xl animate-bounce">🔒</div>
              <p className="text-red-400">This token has been locked due to multiple failed attempts.</p>
              <p className="text-sm text-gray-400">Access denied for security reasons.</p>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-white font-medium">
                  What's Your Password?
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Enter your password..."
                  className={`bg-gray-800/70 border-red-500/30 text-white placeholder-gray-400 focus:border-red-400 transition-all duration-300 focus:scale-[1.02] focus:shadow-lg focus:shadow-red-500/20 ${
                    showError ? "animate-pulse border-red-500 shake" : ""
                  }`}
                  disabled={isSubmitting}
                  autoFocus
                />
                {errorMessage && (
                  <p className="text-xs text-red-400 animate-in slide-in-from-left-2 duration-300">{errorMessage}</p>
                )}
                <p
                  className={`text-xs transition-all duration-300 ${
                    attempts >= 2 ? "text-red-400 animate-pulse" : "text-gray-400"
                  }`}
                >
                  Attempts remaining: {3 - attempts}
                </p>
              </div>

              <Button
                onClick={handleSubmit}
                disabled={!password.trim() || isSubmitting}
                className={`w-full transition-all duration-300 transform hover:scale-105 active:scale-95 ${
                  password.trim() && !isSubmitting
                    ? "bg-red-600 hover:bg-red-700 text-white shadow-lg hover:shadow-red-500/30"
                    : "bg-gray-600 text-gray-400 cursor-not-allowed"
                }`}
              >
                {isSubmitting ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Verifying...</span>
                  </div>
                ) : (
                  "Verify"
                )}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
;<style jsx>{`
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-5px); }
    75% { transform: translateX(5px); }
  }
  .shake {
    animation: shake 0.5s ease-in-out;
  }
`}</style>
