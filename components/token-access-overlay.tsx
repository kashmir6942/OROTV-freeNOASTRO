"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Clock, Copy, CheckCircle, Zap } from "lucide-react"
import { checkSessionClient, generateTokenClient } from "@/lib/token-manager"

interface TokenAccessOverlayProps {
  onAccessGranted: () => void
}

export function TokenAccessOverlay({ onAccessGranted }: TokenAccessOverlayProps) {
  const [canGenerate, setCanGenerate] = useState(false)
  const [cooldownEndsAt, setCooldownEndsAt] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedToken, setGeneratedToken] = useState<string | null>(null)
  const [tokenNumber, setTokenNumber] = useState<number | null>(null)
  const [copied, setCopied] = useState(false)
  const [timeLeft, setTimeLeft] = useState<string>("")
  const [isCheckingSession, setIsCheckingSession] = useState(true)
  const [sessionError, setSessionError] = useState<string | null>(null)

  useEffect(() => {
    checkSession()
  }, [])

  useEffect(() => {
    if (cooldownEndsAt) {
      const interval = setInterval(() => {
        const now = new Date()
        const cooldownEnd = new Date(cooldownEndsAt)
        const diff = cooldownEnd.getTime() - now.getTime()

        if (diff <= 0) {
          setCanGenerate(true)
          setCooldownEndsAt(null)
          setTimeLeft("")
        } else {
          const hours = Math.floor(diff / (1000 * 60 * 60))
          const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
          setTimeLeft(`${hours}h ${minutes}m`)
        }
      }, 1000)

      return () => clearInterval(interval)
    }
  }, [cooldownEndsAt])

  const checkSession = async () => {
    setIsCheckingSession(true)
    setSessionError(null)
    console.log("[v0] Checking session for token generation...")

    try {
      const sessionInfo = await checkSessionClient()
      console.log("[v0] Session check result:", sessionInfo)

      if (sessionInfo.error) {
        if (sessionInfo.error.includes("Database error") || sessionInfo.error.includes("Server error")) {
          setSessionError("Database setup required - check setup guide")
        } else {
          setSessionError(sessionInfo.error)
        }
        setCanGenerate(true)
      } else {
        setCanGenerate(sessionInfo.canGenerate)
        if (sessionInfo.cooldownEndsAt) {
          setCooldownEndsAt(sessionInfo.cooldownEndsAt)
        }
      }
    } catch (error) {
      console.error("[v0] Session check failed:", error)
      setSessionError("Setup required - check database configuration")
      setCanGenerate(true)
    } finally {
      setIsCheckingSession(false)
    }
  }

  const handleGenerateToken = async () => {
    setIsGenerating(true)
    console.log("[v0] Generating token...")
    const result = await generateTokenClient()
    console.log("[v0] Token generation result:", result)

    if (result.success && result.token) {
      setGeneratedToken(result.token)
      setTokenNumber(result.tokenNumber || 0)
      setCanGenerate(false)
      setCooldownEndsAt(result.expiresAt || new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString())
    } else {
      alert(result.error || "Failed to generate token")
    }

    setIsGenerating(false)
  }

  const copyToClipboard = async () => {
    if (generatedToken) {
      const fullUrl = `${window.location.origin}/${generatedToken}`
      await navigator.clipboard.writeText(fullUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleAccessWithToken = () => {
    if (generatedToken && tokenNumber) {
      sessionStorage.setItem("currentToken", generatedToken)
      const tokenUrl = `${window.location.origin}/${generatedToken}`
      window.location.href = tokenUrl
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md border border-border">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto mb-4 w-14 h-14 bg-primary rounded-xl flex items-center justify-center">
            <Zap className="w-7 h-7 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl font-bold text-foreground">
            Sky Bronze
          </CardTitle>
          <p className="text-muted-foreground mt-1 text-sm">Premium Streaming Access</p>
        </CardHeader>

        <CardContent className="space-y-5">
          {!generatedToken ? (
            <>
              <div className="space-y-2 text-center">
                <Badge className="mx-auto bg-primary/10 text-primary border-primary/20">
                  <Clock className="w-3.5 h-3.5 mr-1.5" />
                  48 Hour Access Token
                </Badge>
                <p className="text-xs text-muted-foreground">Safe, secure streaming • No restrictions</p>
              </div>

              {isCheckingSession ? (
                <div className="text-center space-y-3 py-4">
                  <div className="flex justify-center">
                    <div className="animate-spin w-7 h-7 border-2 border-primary/30 border-t-primary rounded-full"></div>
                  </div>
                  <p className="text-muted-foreground text-sm">Checking access...</p>
                </div>
              ) : canGenerate ? (
                <>
                  <Button
                    onClick={handleGenerateToken}
                    disabled={isGenerating}
                    className="w-full py-5 text-base"
                    size="lg"
                  >
                    {isGenerating ? (
                      <>
                        <div className="animate-spin w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full mr-2"></div>
                        Generating...
                      </>
                    ) : (
                      <>
                        <Zap className="w-5 h-5 mr-2" />
                        Generate Access Token
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-center text-muted-foreground">One token per 24 hours</p>
                </>
              ) : (
                <div className="text-center space-y-4 py-4">
                  <div className="space-y-2">
                    <p className="text-muted-foreground text-sm font-medium">Cooldown Period Active</p>
                    <div className="text-3xl font-bold text-primary">
                      {timeLeft}
                    </div>
                  </div>
                  <div className="bg-muted border border-border rounded-lg p-3">
                    <p className="text-muted-foreground text-xs">Next token available in {timeLeft}</p>
                  </div>
                  {sessionError && <p className="text-destructive text-xs mt-2">{sessionError}</p>}
                </div>
              )}
            </>
          ) : (
            <div className="space-y-4 py-2">
              <div className="text-center space-y-3">
                <div className="w-12 h-12 bg-green-500 rounded-xl mx-auto flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground mb-1">Token Generated!</h3>
                  <Badge className="bg-primary/10 text-primary border-primary/20">
                    Token #{tokenNumber}
                  </Badge>
                </div>
              </div>

              <div className="bg-muted border border-border rounded-lg p-4 break-all">
                <p className="text-xs text-muted-foreground mb-2">Access Link</p>
                <p className="text-sm text-primary font-mono font-semibold">
                  {window.location.origin}/{generatedToken}
                </p>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={copyToClipboard}
                  variant="outline"
                  className="flex-1"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  {copied ? "Copied!" : "Copy Link"}
                </Button>

                <Button
                  onClick={handleAccessWithToken}
                  className="flex-1"
                >
                  <Zap className="w-4 h-4 mr-2" />
                  Access Now
                </Button>
              </div>

              <div className="bg-muted border border-border rounded-lg p-3">
                <p className="text-muted-foreground text-xs text-center">
                  Token valid for 48 hours • Save the link for later access
                </p>
              </div>
            </div>
          )}

          <div className="text-center pt-4 border-t border-border">
            <p className="text-muted-foreground text-xs">Enterprise-grade security • Instant access</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
