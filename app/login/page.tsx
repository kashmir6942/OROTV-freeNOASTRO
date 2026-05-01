"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Eye, EyeOff, AlertTriangle, Tv, ArrowLeft } from "lucide-react"

export default function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Login failed")
        setLoading(false)
        return
      }

      // Redirect to user page with token
      if (data.token && data.username) {
        router.push(`/users/${data.username}?token=${data.token}`)
      } else {
        setError("Login successful but no token received")
      }
    } catch (err) {
      setError("An error occurred. Please try again.")
      console.error("[v0] Login error:", err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background: 'linear-gradient(135deg, #0a1628 0%, #1a2744 50%, #0d1a2d 100%)',
      }}
    >
      <div className="w-full max-w-md space-y-6">
        {/* Back Button */}
        <button
          onClick={() => router.push('/')}
          className="flex items-center gap-2 text-gray-400 hover:text-cyan-400 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </button>

        {/* Logo and Title */}
        <div className="text-center space-y-4">
          <img 
            src="/images/light-logo.png" 
            alt="Light TV" 
            className="h-20 w-auto mx-auto"
            onError={(e) => {
              e.currentTarget.style.display = 'none'
            }}
          />
          <div className="flex items-center justify-center gap-2">
            <Tv className="w-8 h-8 text-cyan-400" />
            <h1 className="text-3xl font-bold text-cyan-400">Light TV</h1>
          </div>
          <p className="text-gray-400">Welcome back! Sign in to continue.</p>
        </div>

        {/* Login Form */}
        <div 
          className="p-8 rounded-2xl"
          style={{
            background: 'rgba(20, 35, 60, 0.6)',
            border: '1px solid rgba(100, 150, 200, 0.15)',
            backdropFilter: 'blur(10px)',
          }}
        >
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm text-gray-400">Username</label>
              <Input
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="bg-slate-900/50 border-slate-700 text-white placeholder:text-gray-500 h-12"
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm text-gray-400">Password</label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-slate-900/50 border-slate-700 text-white placeholder:text-gray-500 h-12 pr-12"
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                  disabled={loading}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {error && (
              <Alert className="border-red-500/50 bg-red-500/10">
                <AlertTriangle className="h-4 w-4 text-red-400" />
                <AlertDescription className="text-red-400">{error}</AlertDescription>
              </Alert>
            )}

            <Button 
              type="submit" 
              className="w-full h-12 text-lg font-semibold"
              style={{
                background: 'linear-gradient(90deg, #06b6d4 0%, #22d3ee 50%, #67e8f9 100%)',
              }}
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-700 text-center">
            <p className="text-gray-400">
              Don&apos;t have an account?{" "}
              <a href="/register" className="text-cyan-400 hover:underline font-semibold">
                Register here
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
