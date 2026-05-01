"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Eye, EyeOff, AlertTriangle, ShieldCheck, CheckCircle2 } from "lucide-react"

export default function RegisterPage() {
  const router = useRouter()
  const [username, setUsername] = useState("")
  const [phcornerUsername, setPhcornerUsername] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  const usernameValid = username.trim().length >= 3 && /^[a-zA-Z0-9_.-]+$/.test(username.trim())
  const passwordValid = password.length >= 8
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!usernameValid) {
      setError("Username must be at least 3 characters and use letters, numbers, _ . -")
      return
    }
    if (!passwordValid) {
      setError("Password must be at least 8 characters")
      return
    }
    if (!passwordsMatch) {
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
          password,
          phcornerUsername: phcornerUsername.trim() || null,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Registration failed")
        return
      }

      setSubmitted(true)
    } catch (err) {
      setError("An error occurred. Please try again.")
      console.error("[v0] Register error:", err)
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center space-y-4">
            <img src="/images/what-brand-logo.png" alt="OROTV" className="h-24 w-auto mx-auto" />
            <div>
              <h1 className="text-3xl font-bold text-foreground">OROTV</h1>
              <p className="font-mono text-muted-foreground text-sm">SECURE STREAMING ACCESS</p>
            </div>
          </div>
          <Card className="bg-card border border-border">
            <CardContent className="p-8 text-center space-y-4">
              <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-xl font-semibold text-foreground">Registration submitted</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Your account is awaiting administrator approval. You&apos;ll be able to sign in once it&apos;s reviewed.
              </p>
              <Button onClick={() => router.push("/login")} className="w-full">
                Go to Sign In
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo + branding */}
        <div className="text-center space-y-4">
          <img src="/images/what-brand-logo.png" alt="OROTV" className="h-24 w-auto mx-auto" />
          <div>
            <h1 className="text-3xl font-bold text-foreground tracking-tight">Light - Owned By PHC SVWG</h1>
            <p className="font-mono text-muted-foreground text-xs">CREATE A NEW ACCOUNT</p>
          </div>
        </div>

        <Card className="bg-card border border-border">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary" />
              Register
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Accounts require administrator approval before sign-in is permitted.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-1.5">
                <Input
                  type="text"
                  placeholder="Username (min 3 characters)"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  disabled={loading}
                  autoComplete="username"
                />
                <p className="text-[11px] text-muted-foreground">
                  {username.length === 0
                    ? "Letters, numbers, underscore, dot, dash"
                    : usernameValid
                    ? "Looks good"
                    : "At least 3 characters using letters, numbers, _ . -"}
                </p>
              </div>

              <div className="space-y-1.5">
                <Input
                  type="text"
                  placeholder="PHCorner username (optional)"
                  value={phcornerUsername}
                  onChange={(e) => setPhcornerUsername(e.target.value)}
                  disabled={loading}
                />
                <p className="text-[11px] text-muted-foreground">
                  Used by the admin to verify your forum identity.
                </p>
              </div>

              <div className="space-y-1.5 relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password (min 8 characters)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-10"
                  required
                  disabled={loading}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                  disabled={loading}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
                <p className="text-[11px] text-muted-foreground">
                  {password.length === 0
                    ? "At least 8 characters"
                    : passwordValid
                    ? "Strong enough"
                    : `Need ${8 - password.length} more character${8 - password.length === 1 ? "" : "s"}`}
                </p>
              </div>

              <div className="space-y-2">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Confirm password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={loading}
                  autoComplete="new-password"
                />
              </div>

              {error && (
                <Alert className="border-destructive bg-destructive/10">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  <AlertDescription className="text-destructive">{error}</AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={loading || !usernameValid || !passwordValid || !passwordsMatch}
              >
                {loading ? "Submitting..." : "Submit for Approval"}
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t border-border text-center">
              <p className="text-sm text-muted-foreground">
                Already have an account?{" "}
                <a href="/login" className="text-primary hover:underline font-semibold">
                  Sign in here
                </a>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
