"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Eye, EyeOff, AlertTriangle, Tv, ArrowLeft, CheckCircle } from "lucide-react"

export default function RegisterPage() {
  const router = useRouter()
  const [username, setUsername] = useState("")
  const [phcornerUser, setPhcornerUser] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const validatePassword = (pwd: string): string | null => {
    if (pwd.length < 8) {
      return "Password must be at least 8 characters"
    }
    if (!/[A-Z]/.test(pwd)) {
      return "Password must contain at least one uppercase letter"
    }
    if (!/[a-z]/.test(pwd)) {
      return "Password must contain at least one lowercase letter"
    }
    if (!/[0-9]/.test(pwd)) {
      return "Password must contain at least one number"
    }
    return null
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    // Validation
    if (username.length < 3) {
      setError("Username must be at least 3 characters")
      setLoading(false)
      return
    }

    const passwordError = validatePassword(password)
    if (passwordError) {
      setError(passwordError)
      setLoading(false)
      return
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      setLoading(false)
      return
    }

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          username, 
          password,
          phcornerUser: phcornerUser || null,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Registration failed")
        setLoading(false)
        return
      }

      // Show success message
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
      <div 
        className="min-h-screen flex items-center justify-center p-4"
        style={{
          background: 'linear-gradient(135deg, #0a1628 0%, #1a2744 50%, #0d1a2d 100%)',
        }}
      >
        <div 
          className="w-full max-w-md p-8 rounded-2xl text-center"
          style={{
            background: 'rgba(20, 35, 60, 0.6)',
            border: '1px solid rgba(100, 150, 200, 0.15)',
            backdropFilter: 'blur(10px)',
          }}
        >
          <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Registration Submitted!</h2>
          <p className="text-gray-400 mb-6">
            Your account is pending admin approval. You will be able to login once approved.
          </p>
          <Button 
            onClick={() => router.push('/login')}
            className="w-full"
            style={{
              background: 'linear-gradient(90deg, #06b6d4 0%, #22d3ee 50%, #67e8f9 100%)',
            }}
          >
            Go to Login
          </Button>
        </div>
      </div>
    )
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
          <p className="text-gray-400">Create a new account to get started.</p>
        </div>

        {/* Register Form */}
        <div 
          className="p-8 rounded-2xl"
          style={{
            background: 'rgba(20, 35, 60, 0.6)',
            border: '1px solid rgba(100, 150, 200, 0.15)',
            backdropFilter: 'blur(10px)',
          }}
        >
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm text-gray-400">Username <span className="text-red-400">*</span></label>
              <Input
                type="text"
                placeholder="Min 3 characters"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="bg-slate-900/50 border-slate-700 text-white placeholder:text-gray-500 h-12"
                required
                disabled={loading}
                minLength={3}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm text-gray-400">PHCorner Username <span className="text-gray-600">(optional)</span></label>
              <Input
                type="text"
                placeholder="Your PHCorner username"
                value={phcornerUser}
                onChange={(e) => setPhcornerUser(e.target.value)}
                className="bg-slate-900/50 border-slate-700 text-white placeholder:text-gray-500 h-12"
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm text-gray-400">Password <span className="text-red-400">*</span></label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Min 8 chars, uppercase, lowercase, number"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-slate-900/50 border-slate-700 text-white placeholder:text-gray-500 h-12 pr-12"
                  required
                  disabled={loading}
                  minLength={8}
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
              <p className="text-xs text-gray-500">
                Must contain: 8+ characters, uppercase, lowercase, number
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-gray-400">Confirm Password <span className="text-red-400">*</span></label>
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Retype your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="bg-slate-900/50 border-slate-700 text-white placeholder:text-gray-500 h-12"
                required
                disabled={loading}
              />
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
              {loading ? "Creating account..." : "Create Account"}
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-700 text-center">
            <p className="text-gray-400">
              Already have an account?{" "}
              <a href="/login" className="text-cyan-400 hover:underline font-semibold">
                Sign in here
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
