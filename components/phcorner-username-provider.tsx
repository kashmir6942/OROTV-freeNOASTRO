"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { usePathname } from "next/navigation"
import { PHCornerUsernamePopup } from "./phcorner-username-popup"
import { Error403Popup } from "./error-403-popup"
import { getUserPreference, setUserPreference } from "@/lib/user-preferences"

interface PHCornerUsernameProviderProps {
  children: React.ReactNode
}

export function PHCornerUsernameProvider({ children }: PHCornerUsernameProviderProps) {
  const [showUsernamePopup, setShowUsernamePopup] = useState(false)
  const [showPasswordPopup, setShowPasswordPopup] = useState(false)
  const [show403Error, setShow403Error] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    const checkAuthStatus = async () => {
      console.log("[v0] PHCorner Provider - Current pathname:", pathname)

      // Token routes should only be paths like /tokenno1, /tokenno123, etc.
      const isTokenRoute = /^\/tokenno\d+$/.test(pathname)

      console.log("[v0] PHCorner Provider - Is token route:", isTokenRoute)

      if (!isTokenRoute) {
        console.log("[v0] PHCorner Provider - Not a token route, not showing popup")
        return
      }

      // Get current token
      let currentToken = "anonymous"
      if (pathname.startsWith("/") && pathname !== "/") {
        const pathToken = pathname.slice(1)
        if (pathToken && !pathToken.includes("/")) {
          currentToken = pathToken
        }
      }

      const isVerified = await getUserPreference(`auth_verified_${currentToken}`, false)
      console.log("[v0] PHCorner Provider - Is verified for token:", isVerified)

      if (isVerified) {
        console.log("[v0] PHCorner Provider - User already verified, no popup needed")
        return
      }

      const hasUsername = await getUserPreference("phcorner_username", "")
      const hasSubmittedBefore = await getUserPreference("phcorner_username_submitted", false)
      console.log("[v0] PHCorner Provider - Has username:", hasUsername)
      console.log("[v0] PHCorner Provider - Has submitted before:", hasSubmittedBefore)

      if (hasUsername && hasUsername.trim().length > 2) {
        console.log("[v0] PHCorner Provider - User has username, auto-verifying")
        await setUserPreference(`auth_verified_${currentToken}`, true)
        return
      }

      if (!hasSubmittedBefore) {
        // New user - show username popup
        console.log("[v0] PHCorner Provider - New user, showing username popup")
        const timer = setTimeout(() => {
          setShowUsernamePopup(true)
        }, 2000)
        return () => clearTimeout(timer)
      } else {
        // User submitted before but no username stored, showing username popup
        console.log("[v0] PHCorner Provider - User submitted before but no username stored, showing username popup")
        const timer = setTimeout(() => {
          setShowUsernamePopup(true)
        }, 2000)
        return () => clearTimeout(timer)
      }
    }

    checkAuthStatus()
  }, [pathname])

  const handleUsernameSuccess = async () => {
    const currentToken = pathname.slice(1)
    // This will be handled by the PHCornerUsernamePopup component
    setShowUsernamePopup(false)
  }

  const handlePasswordSuccess = () => {
    console.log("[v0] PHCorner Provider - Password verification successful")
    setShowPasswordPopup(false)
  }

  const handlePasswordFailure = () => {
    console.log("[v0] PHCorner Provider - Password verification failed, showing 403")
    setShowPasswordPopup(false)
    setShow403Error(true)
  }

  return (
    <>
      {children}
      <PHCornerUsernamePopup isOpen={showUsernamePopup} onClose={handleUsernameSuccess} />
      <Error403Popup isOpen={show403Error} />
    </>
  )
}
