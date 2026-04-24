export interface TokenInfo {
  isValid: boolean
  isPermanent: boolean
  tokenNumber?: number
  tokenId?: number // Add tokenId for viewer tracking
  expiresAt?: string
  error?: string
}

export interface SessionInfo {
  canGenerate: boolean
  cooldownEndsAt?: string
  error?: string
}

// Client-side token validation
export async function validateTokenClient(token: string): Promise<TokenInfo> {
  try {
    // Check if this token has already been used in this session
    const sessionKey = `token_used_${token}`
    const alreadyUsed = sessionStorage.getItem(sessionKey) === "true"

    const response = await fetch("/api/validate-token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        token,
        skipIncrement: alreadyUsed, // Skip increment if already used in this session
      }),
    })

    if (!response.ok) {
      return { isValid: false, isPermanent: false, error: "Validation failed" }
    }

    const result = await response.json()

    if (result.isValid && !alreadyUsed) {
      sessionStorage.setItem(sessionKey, "true")
    }

    return result
  } catch (error) {
    console.error("Token validation error:", error)
    return { isValid: false, isPermanent: false, error: "Network error" }
  }
}

// Client-side session check
export async function checkSessionClient(): Promise<SessionInfo> {
  try {
    const response = await fetch("/api/check-session")

    if (!response.ok) {
      return { canGenerate: false, error: "Session check failed" }
    }

    return await response.json()
  } catch (error) {
    console.error("Session check error:", error)
    return { canGenerate: false, error: "Network error" }
  }
}

// Client-side token generation
export async function generateTokenClient(): Promise<{
  success: boolean
  token?: string
  tokenNumber?: number
  tokenId?: number
  expiresAt?: string
  error?: string
}> {
  try {
    const response = await fetch("/api/generate-token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      const errorData = await response.json()
      return { success: false, error: errorData.error || "Generation failed" }
    }

    const data = await response.json()
    return {
      success: data.success,
      token: data.token,
      tokenNumber: data.tokenNumber,
      tokenId: data.tokenId,
      expiresAt: data.expiresAt,
      error: data.error,
    }
  } catch (error) {
    console.error("Token generation error:", error)
    return { success: false, error: "Network error" }
  }
}
