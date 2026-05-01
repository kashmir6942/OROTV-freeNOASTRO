"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { validateTokenClient } from "@/lib/token-manager"
import Home from "@/components/home-experience"
import { useViewerTracking } from "@/hooks/use-viewer-tracking"

export default function TokenPage() {
  const params = useParams()
  const router = useRouter()
  const [isValidating, setIsValidating] = useState(true)
  const [isValid, setIsValid] = useState(false)
  const [tokenId, setTokenId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  useViewerTracking({
    tokenId,
    enabled: isValid && tokenId !== null,
  })

  useEffect(() => {
    const validateToken = async () => {
      const token = params.token as string

      if (!token) {
        router.push("/")
        return
      }

      console.log("[v0] Validating token:", token)

      const validationKey = `token_validated_${token}`
      const alreadyValidated = sessionStorage.getItem(validationKey) === "true"

      if (alreadyValidated) {
        console.log("[v0] Token already validated in this session, skipping validation")
        setIsValid(true)
        setError(null)
        setIsValidating(false)
        return
      }

      const tokenInfo = await validateTokenClient(token)
      console.log("[v0] Token validation result:", tokenInfo)

      if (tokenInfo.isValid) {
        // Store token in sessionStorage for the main page
        sessionStorage.setItem("currentToken", token)
        sessionStorage.setItem(validationKey, "true")
        setIsValid(true)
        setTokenId(tokenInfo.tokenId)
        setError(null)
      } else {
        setError(tokenInfo.error || "Invalid token")
        setIsValid(false)

        // Only redirect after showing error for a moment
        setTimeout(() => {
          router.push("/")
        }, 3000)
      }

      setIsValidating(false)
    }

    validateToken()
  }, [params.token, router])

  if (isValidating) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-foreground text-xl">Validating access...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="text-xl mb-4 text-destructive">Access Denied</div>
          <div className="text-sm text-muted-foreground">{error}</div>
          <div className="text-xs text-muted-foreground mt-2">Redirecting in 3 seconds...</div>
        </div>
      </div>
    )
  }

  if (!isValid) {
    return null // Will redirect
  }

  return <Home />
}
