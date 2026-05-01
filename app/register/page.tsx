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
      <div className="min-h-screen bg-black text-white flex items-center justify-center px-6">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="flex justify-center mb-4">
            <CheckCircle className="w-16 h-16 text-white" />
          </div>
          <h2 className="text-3xl font-bold">Registration Submitted</h2>
          <p className="text-gray-400">
            Your registration has been submitted for admin approval. You will receive an email once your account is approved.
          </p>
          <Button
            onClick={() => router.push('/login')}
            className="w-full bg-white text-black hover:bg-gray-200 font-bold py-2"
          >
            Back to Login
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Header */}
      <div className="border-b border-gray-800 px-6 py-4">
        <button
          onClick={() => router.push('/')}
          className="flex items-center gap-2 text-gray-400 hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center px-6 py-20">
        <div className="max-w-md w-full space-y-8">
          
          {/* Logo and Title */}
          <div className="space-y-4 text-center">
            <div className="mb-6">
              <img 
                src="/logo.png" 
                alt="Light TV" 
                className="h-16 w-auto mx-auto"
                onError={(e) => {
                  e.currentTarget.style.display = 'none'
                }}
              />
            </div>
            <h1 className="text-4xl font-bold">Light TV</h1>
            <p className="text-gray-400">Create your account</p>
          </div>

          {/* Register Form */}
          <form onSubmit={handleRegister} className="space-y-6">
            {error && (
              <Alert className="bg-red-500/10 border-red-500/20">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                <AlertDescription className="text-red-500">{error}</AlertDescription>
              </Alert>
            )}

            {/* Username */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Username (min 3 characters)</label>
              <Input
                type="text"
                placeholder="Enter username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="bg-white/5 border-gray-800 text-white placeholder-gray-500"
              />
            </div>

            {/* PHCorner User */}
            <div className="space-y-2">
              <label className="text-sm font-medium">PHCorner User (optional)</label>
              <Input
                type="text"
                placeholder="Your PHCorner username"
                value={phcornerUser}
                onChange={(e) => setPhcornerUser(e.target.value)}
                className="bg-white/5 border-gray-800 text-white placeholder-gray-500"
              />
            </div>

            {/* Password */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Password (min 8 chars, 1 uppercase, 1 lowercase, 1 number)</label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-white/5 border-gray-800 text-white placeholder-gray-500 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Confirm Password</label>
              <Input
                type="password"
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="bg-white/5 border-gray-800 text-white placeholder-gray-500"
              />
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-white text-black hover:bg-gray-200 font-bold py-2"
            >
              {loading ? "Registering..." : "Register"}
            </Button>
          </form>

          {/* Login Link */}
          <div className="text-center">
            <p className="text-gray-400">
              Already have an account?{' '}
              <button
                onClick={() => router.push('/login')}
                className="text-white hover:underline font-medium"
              >
                Login here
              </button>
            </p>
          </div>

          {/* Terms Link */}
          <div className="text-center text-sm text-gray-500">
            By registering, you agree to our{' '}
            <a href="/terms" className="text-white hover:underline">Terms of Service</a>
          </div>
        </div>
      </div>
    </div>
  )
}
