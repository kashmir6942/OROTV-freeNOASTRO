"use client"

import type React from "react"
import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default function DevToolsProtection() {
  const [showAuth, setShowAuth] = useState(false)
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [error, setError] = useState("")

  const ADMIN_USERNAME = "vince"
  const ADMIN_PASSWORD = "salvador2394"

  const handleContextMenu = useCallback((e: MouseEvent) => {
    e.preventDefault()
  }, [])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // F12 key
      if (e.key === "F12") {
        e.preventDefault()
        if (!isAuthenticated) {
          setShowAuth(true)
        }
        return
      }

      // Ctrl+Shift+I (Chrome DevTools)
      if (e.ctrlKey && e.shiftKey && e.key === "I") {
        e.preventDefault()
        if (!isAuthenticated) {
          setShowAuth(true)
        }
        return
      }

      // Ctrl+Shift+J (Chrome Console)
      if (e.ctrlKey && e.shiftKey && e.key === "J") {
        e.preventDefault()
        if (!isAuthenticated) {
          setShowAuth(true)
        }
        return
      }

      // Ctrl+U (View Source)
      if (e.ctrlKey && e.key === "u") {
        e.preventDefault()
        if (!isAuthenticated) {
          setShowAuth(true)
        }
        return
      }
    },
    [isAuthenticated],
  )

  useEffect(() => {
    // Check if already authenticated via cookies
    const authCookie = document.cookie.split("; ").find((row) => row.startsWith("devtools_auth="))

    if (authCookie && authCookie.split("=")[1] === "true") {
      setIsAuthenticated(true)
      return
    }

    document.addEventListener("keydown", handleKeyDown, { passive: false })
    document.addEventListener("contextmenu", handleContextMenu, { passive: false })

    return () => {
      document.removeEventListener("keydown", handleKeyDown)
      document.removeEventListener("contextmenu", handleContextMenu)
    }
  }, [handleKeyDown, handleContextMenu])

  const handleLogin = useCallback(() => {
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      setIsAuthenticated(true)
      setShowAuth(false)
      setError("")

      // Set cookie to remember authentication (expires in 30 days)
      const expiryDate = new Date()
      expiryDate.setDate(expiryDate.getDate() + 30)
      document.cookie = `devtools_auth=true; expires=${expiryDate.toUTCString()}; path=/`

      // Clear form
      setUsername("")
      setPassword("")
    } else {
      setError("Invalid credentials")
    }
  }, [username, password, ADMIN_USERNAME, ADMIN_PASSWORD])

  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        handleLogin()
      }
    },
    [handleLogin],
  )

  const handleCancel = useCallback(() => {
    setShowAuth(false)
  }, [])

  if (!showAuth) return null

  return (
    <div
      className="fixed inset-0 bg-black/95 z-[9999] flex items-center justify-center p-4"
      style={{ touchAction: "none" }}
    >
      <div className="bg-gray-900 border border-gray-700 rounded-lg shadow-2xl w-full max-w-sm p-6 space-y-4">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-white">Developer Access Required</h2>
          <p className="text-sm text-gray-300 mt-1">Enter credentials to access developer tools</p>
        </div>

        <div className="space-y-3">
          <Input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyPress={handleKeyPress}
            className="w-full bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:border-purple-400 focus:ring-purple-400"
          />
          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyPress={handleKeyPress}
            className="w-full bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:border-purple-400 focus:ring-purple-400"
          />
          {error && <p className="text-red-400 text-sm text-center font-medium">{error}</p>}

          <div className="space-y-2">
            <Button onClick={handleLogin} className="w-full bg-purple-500 hover:bg-purple-600 text-white font-medium">
              Access Developer Tools
            </Button>
            <Button
              onClick={handleCancel}
              variant="outline"
              className="w-full bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white"
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
