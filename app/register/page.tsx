"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  Eye,
  EyeOff,
  AlertTriangle,
  User,
  Lock,
  Mail,
  Info,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  ExternalLink,
} from "lucide-react"

const PHC_OWNER_URL = "https://phcorner.org/direct-messages/add?to=PHC-SVWG"

export default function RegisterPage() {
  const router = useRouter()
  const [username, setUsername] = useState("")
  const [phcornerUsername, setPhcornerUsername] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [showLearnMore, setShowLearnMore] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (username.trim().length < 3) {
      setError("Username must be at least 3 characters")
      return
    }
    if (!phcornerUsername.trim()) {
      setError("PHCorner username is required for verification")
      return
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters")
      return
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    setLoading(true)
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim(),
          phcornerUsername: phcornerUsername.trim(),
          email: email.trim() || null,
          password,
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        setError(data.error || "Registration failed")
        return
      }

      setSuccess(true)
    } catch (err) {
      setError("An error occurred. Please try again.")
      console.error("[v0] Register error:", err)
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4 relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-30 pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(circle at 25% 25%, rgba(6, 182, 212, 0.08) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(34, 197, 94, 0.05) 0%, transparent 50%)",
          }}
        />
        <div className="relative z-10 w-full max-w-md">
          <div className="bg-[#0e0e10] border border-zinc-800/80 rounded-2xl p-8 shadow-2xl">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center mb-4">
                <CheckCircle2 className="h-8 w-8 text-green-400" />
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-white mb-2 text-balance">
                Registration Successful!
              </h1>
              <p className="text-sm text-zinc-400 text-pretty leading-relaxed">
                Your account has been created and is pending approval.
              </p>
            </div>

            <div className="mt-6 rounded-xl border border-zinc-800/80 bg-[#141417] p-5">
              <p className="text-sm font-semibold text-cyan-400 mb-3">Next Steps:</p>
              <ol className="space-y-2 text-sm text-zinc-300">
                <li className="flex gap-3">
                  <span className="text-cyan-400 font-mono">1.</span>
                  <span>Go to PHCorner and message the owner</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-cyan-400 font-mono">2.</span>
                  <span>
                    Include your username:{" "}
                    <span className="font-semibold text-white">{username}</span>
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="text-cyan-400 font-mono">3.</span>
                  <span>Wait for admin approval</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-cyan-400 font-mono">4.</span>
                  <span>You will be able to login once approved</span>
                </li>
              </ol>
            </div>

            <div className="mt-6 flex flex-col gap-3">
              <a
                href={PHC_OWNER_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full h-11 rounded-lg bg-cyan-400 hover:bg-cyan-300 text-black font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                <ExternalLink className="h-4 w-4" />
                Message PHCorner Owner
              </a>
              <button
                onClick={() => router.push("/login")}
                className="w-full h-11 rounded-lg bg-[#1a1a1d] hover:bg-[#222226] text-white font-semibold border border-zinc-800/80 transition-colors"
              >
                Go to Login
              </button>
            </div>
          </div>
        </div>
      </div>
    )
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

      <div className="relative z-10 w-full max-w-md py-8">
        <div className="bg-[#0e0e10] border border-zinc-800/80 rounded-2xl p-8 shadow-2xl">
          <div className="text-center space-y-2 mb-6">
            <h1 className="text-2xl font-bold text-white">Create your account</h1>
            <p className="text-sm text-zinc-400">PHCorner verification required</p>
          </div>

          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-zinc-200 mb-2 block">Username</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Choose a username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full h-11 pl-10 pr-3 rounded-lg bg-[#1a1a1d] border border-zinc-800/80 text-white placeholder:text-zinc-500 outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500/40 transition-all"
                  required
                  disabled={loading}
                  minLength={3}
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-zinc-200 mb-2 block">PHCorner Username</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Your PHCorner username"
                  value={phcornerUsername}
                  onChange={(e) => setPhcornerUsername(e.target.value)}
                  className="w-full h-11 pl-10 pr-3 rounded-lg bg-[#1a1a1d] border border-zinc-800/80 text-white placeholder:text-zinc-500 outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500/40 transition-all"
                  required
                  disabled={loading}
                />
              </div>
              <p className="text-xs text-zinc-500 mt-1.5">
                Used for verification - must match your PHCorner account
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-zinc-200 mb-2 block">Email (Optional)</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                <input
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-11 pl-10 pr-3 rounded-lg bg-[#1a1a1d] border border-zinc-800/80 text-white placeholder:text-zinc-500 outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500/40 transition-all"
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-zinc-200 mb-2 block">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Min 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-11 pl-10 pr-10 rounded-lg bg-[#1a1a1d] border border-zinc-800/80 text-white placeholder:text-zinc-500 outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500/40 transition-all"
                  required
                  disabled={loading}
                  minLength={6}
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

            <div>
              <label className="text-sm font-medium text-zinc-200 mb-2 block">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full h-11 pl-10 pr-3 rounded-lg bg-[#1a1a1d] border border-zinc-800/80 text-white placeholder:text-zinc-500 outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500/40 transition-all"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4">
              <p className="text-sm text-cyan-300 leading-relaxed">
                After registration, you must message the PHCorner owner for verification. Your
                account will be manually approved.
              </p>
              <button
                type="button"
                onClick={() => setShowLearnMore((v) => !v)}
                className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-cyan-400 hover:text-cyan-300"
              >
                <Info className="h-3.5 w-3.5" />
                Learn More
                {showLearnMore ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </button>
              {showLearnMore && (
                <ul className="mt-3 space-y-1.5 text-xs text-cyan-200/80 list-disc list-inside leading-relaxed">
                  <li>Submit this form to create a pending registration.</li>
                  <li>Open PHCorner and DM PHC-SVWG with your username.</li>
                  <li>Wait for the admin to approve your account.</li>
                  <li>Once approved, sign in to access streaming.</li>
                </ul>
              )}
            </div>

            {error && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 flex gap-2">
                <AlertTriangle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                <p className="text-sm text-red-300">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-lg bg-cyan-400 hover:bg-cyan-300 disabled:opacity-60 disabled:cursor-not-allowed text-black font-semibold transition-colors"
            >
              {loading ? "Creating Account..." : "Create Account"}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-zinc-800/80 text-center">
            <p className="text-sm text-zinc-400">
              Already have an account?{" "}
              <a href="/login" className="text-cyan-400 hover:text-cyan-300 font-semibold">
                Sign in
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
