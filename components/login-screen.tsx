"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Eye, EyeOff, AlertTriangle, Copy, Check } from 'lucide-react'
import type { User } from "@/data/types/channel"
import { setUserPreference } from "@/lib/user-preferences"

interface LoginScreenProps {
  onLogin: (user: User) => void
}

const PERMANENT_ACCOUNTS = [
  { username: "vince", password: "salvador" },
  { username: "itel", password: "vistatab30" },
  { username: "salvador", password: "don_bosco" },
]

const ADJECTIVES = ["swift", "bright", "cool", "fast", "smart", "quick", "bold", "sharp", "clear", "strong"]
const NOUNS = ["stream", "view", "play", "watch", "cast", "flow", "beam", "wave", "link", "feed"]

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [showWarning, setShowWarning] = useState(false)
  const [showGenerateAccount, setShowGenerateAccount] = useState(false)
  const [generatedAccount, setGeneratedAccount] = useState<{ username: string; password: string } | null>(null)
  const [copied, setCopied] = useState(false)

  const generateRandomCredentials = () => {
    const adjective = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)]
    const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)]
    const number = Math.floor(1000 + Math.random() * 9000)
    const username = `${adjective}${noun}${number}`

    const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789"
    let password = ""
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length))
    }

    return { username, password }
  }

  const handleGenerateAccount = () => {
    setShowWarning(true)
    setTimeout(() => {
      setShowWarning(false)
      const credentials = generateRandomCredentials()
      setGeneratedAccount(credentials)
      setShowGenerateAccount(true)
    }, 3000)
  }

  const handleCopyCredentials = async () => {
    if (generatedAccount) {
      const text = `Username: ${generatedAccount.username}\nPassword: ${generatedAccount.password}`
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    // Check permanent accounts
    const permanentAccount = PERMANENT_ACCOUNTS.find((acc) => acc.username === username && acc.password === password)

    if (permanentAccount) {
      const user: User = {
        username,
        isPermanent: true,
        expiresAt: "2199-12-31T23:59:59.999Z",
      }
      await setUserPreference("musictv_user", user)
      onLogin(user)
      return
    }

    // Check generated account
    if (generatedAccount && username === generatedAccount.username && password === generatedAccount.password) {
      const expiresAt = new Date()
      expiresAt.setHours(expiresAt.getHours() + 24)

      const user: User = {
        username,
        isPermanent: false,
        expiresAt: expiresAt.toISOString(),
      }
      await setUserPreference("musictv_user", user)
      onLogin(user)
      return
    }

    setError("Invalid credentials. Please check your username and password.")
  }

  const handleUseGeneratedAccount = () => {
    if (generatedAccount) {
      setUsername(generatedAccount.username)
      setPassword(generatedAccount.password)
      setShowGenerateAccount(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 brutalist-grid-pattern">
      <div className="w-full max-w-md space-y-6">
        {/* Logo and Title */}
        <div className="text-center space-y-4">
          <img src="/images/sky-bronze-logo.png" alt="Sky Bronze" className="h-24 w-auto mx-auto" />
          <div>
            <h1 className="brutalist-text-large text-foreground text-shadow-brutal">Sky Bronze</h1>
            <p className="font-mono font-bold uppercase text-muted-foreground">STREAM. WATCH. CONNECT.</p>
          </div>
        </div>

        {/* Warning Alert */}
        {showWarning && (
          <Alert className="brutalist-card border-destructive bg-destructive/10">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <AlertDescription className="font-mono font-bold uppercase text-destructive">
              THIS IPTV IS NOT FOR SALE! PLEASE TAKE CAUTION OF RESELLERS.
            </AlertDescription>
          </Alert>
        )}

        {/* Login Form */}
        <Card className="brutalist-card bg-card">
          <CardHeader>
            <CardTitle className="font-mono font-black uppercase text-foreground">SIGN IN</CardTitle>
            <CardDescription className="font-mono text-muted-foreground">
              ENTER YOUR CREDENTIALS TO ACCESS SKY BRONZE
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Input
                  type="text"
                  placeholder="USERNAME"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="brutalist-input font-mono font-bold uppercase placeholder:text-muted-foreground"
                  required
                />
              </div>

              <div className="space-y-2 relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="PASSWORD"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="brutalist-input font-mono font-bold uppercase placeholder:text-muted-foreground pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {error && (
                <Alert className="brutalist-card border-destructive bg-destructive/10">
                  <AlertDescription className="font-mono font-bold text-destructive">{error}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" className="w-full brutalist-button">
                SIGN IN
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t-4 border-border">
              <Button
                onClick={handleGenerateAccount}
                className="w-full brutalist-button bg-secondary text-secondary-foreground border-secondary"
                disabled={showWarning}
              >
                GENERATE 24-HOUR ACCOUNT
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Generated Account Modal */}
        <Dialog open={showGenerateAccount} onOpenChange={setShowGenerateAccount}>
          <DialogContent className="brutalist-card bg-card">
            <DialogHeader>
              <DialogTitle className="font-mono font-black uppercase text-foreground">
                24-HOUR ACCOUNT GENERATED
              </DialogTitle>
              <DialogDescription className="font-mono text-muted-foreground">
                YOUR TEMPORARY ACCOUNT CREDENTIALS (EXPIRES IN 24 HOURS):
              </DialogDescription>
            </DialogHeader>

            {generatedAccount && (
              <div className="space-y-4">
                <div className="brutalist-data-display bg-muted font-mono text-sm">
                  <div className="text-muted-foreground">
                    USERNAME: <span className="text-foreground font-bold">{generatedAccount.username}</span>
                  </div>
                  <div className="text-muted-foreground">
                    PASSWORD: <span className="text-foreground font-bold">{generatedAccount.password}</span>
                  </div>
                </div>

                <div className="flex space-x-2">
                  <Button
                    onClick={handleCopyCredentials}
                    className="flex-1 brutalist-button bg-secondary text-secondary-foreground border-secondary"
                  >
                    {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                    {copied ? "COPIED!" : "COPY"}
                  </Button>
                  <Button onClick={handleUseGeneratedAccount} className="flex-1 brutalist-button">
                    USE ACCOUNT
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
