"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, AlertTriangle, User, Lock, ArrowRight, ExternalLink } from "lucide-react"
import { setUserPreference } from "@/lib/user-preferences"
import { getDeviceId } from "@/lib/device-id"

export default function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [errorDetail, setErrorDetail] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setErrorDetail(null)
    setLoading(true)

    try {
      const deviceId = getDeviceId()
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, deviceId }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Login failed")
        if (data.detail) setErrorDetail(data.detail)
        return
      }

      await setUserPreference("musictv_user", {
        id: data.user.id,
        username: data.user.username,
        isPermanent: true,
        expiresAt: "2199-12-31T23:59:59.999Z",
      })

      if (data.token) {
        try {
          sessionStorage.setItem("currentToken", data.token)
        } catch {}
      }

      const target = data.token
        ? `/users/${encodeURIComponent(data.user.username)}?token=${encodeURIComponent(data.token)}`
        : "/playlistbe"
      router.push(target)
    } catch (err) {
      setError("An error occurred. Please try again.")
      console.error("[v0] Login error:", err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 relative overflow-hidden">
      <div
        className="absolute inset-0 opacity-30 pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(circle at 25% 25%, rgba(6, 182, 212, 0.08) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(6, 182, 212, 0.05) 0%, transparent 50%)",
        }}
      />

      <div className="relative z-10 w-full max-w-md">
        <div className="bg-[#0e0e10] border border-zinc-800/80 rounded-2xl p-8 shadow-2xl">
          <div className="text-center space-y-2 mb-6">
            <h1 className="text-2xl font-bold text-white">Welcome back</h1>
            <p className="text-sm text-zinc-400">Sign in to continue to OROTV</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-zinc-200 mb-2 block">Username</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full h-11 pl-10 pr-3 rounded-lg bg-[#1a1a1d] border border-zinc-800/80 text-white placeholder:text-zinc-500 outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500/40 transition-all"
                  required
                  disabled={loading}
                  autoComplete="username"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-zinc-200 mb-2 block">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-11 pl-10 pr-10 rounded-lg bg-[#1a1a1d] border border-zinc-800/80 text-white placeholder:text-zinc-500 outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500/40 transition-all"
                  required
                  disabled={loading}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                  disabled={loading}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 flex gap-2">
                <AlertTriangle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                <div className="text-sm text-red-300 leading-relaxed">
                  <div className="font-medium">{error}</div>
                  {errorDetail && <div className="mt-1 text-red-300/80 text-xs">{errorDetail}</div>}
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-lg bg-cyan-400 hover:bg-cyan-300 disabled:opacity-60 disabled:cursor-not-allowed text-black font-semibold flex items-center justify-center gap-2 transition-colors"
            >
              {loading ? "Signing in..." : (<>Sign In <ArrowRight className="h-4 w-4" /></>)}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-zinc-800/80 text-center">
            <p className="text-sm text-zinc-400">
              {"Don't have an account? "}
              <a href="/register" className="text-cyan-400 hover:text-cyan-300 font-semibold">
                Create one
              </a>
            </p>
          </div>

          <div className="mt-4 text-center">
            <a
              href="https://phcorner.org/direct-messages/add?to=PHC-SVWG"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-zinc-500 hover:text-cyan-400 inline-flex items-center gap-1"
            >
              Need help? Contact PHC-SVWG <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
