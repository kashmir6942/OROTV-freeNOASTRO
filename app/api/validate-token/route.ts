import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createHash } from "crypto"

export async function POST(request: NextRequest) {
  try {
    const { token, skipIncrement } = await request.json()

    console.log("[v0] Validating token:", token, "skipIncrement:", skipIncrement)

    if (!token) {
      console.log("[v0] No token provided")
      return NextResponse.json({ isValid: false, isPermanent: false, error: "No token provided" })
    }

    const supabase = await createClient()

    // Handle permanent token
    if (token === "permanent") {
      console.log("[v0] Permanent token validated")
      return NextResponse.json({ isValid: true, isPermanent: true })
    }

    // Hash the token for database lookup
    const tokenHash = createHash("sha256").update(token).digest("hex")
    console.log("[v0] Token hash:", tokenHash)

    try {
      // Check if token exists and is valid
      const { data: tokenData, error } = await supabase
        .from("access_tokens")
        .select("*")
        .eq("token_hash", tokenHash)
        .single()

      console.log("[v0] Database query result:", { tokenData, error })

      if (error) {
        // If table doesn't exist, return helpful error
        if (
          error.code === "PGRST116" ||
          error.message?.includes("relation") ||
          error.message?.includes("does not exist")
        ) {
          console.log("[v0] Database table doesn't exist")
          return NextResponse.json({
            isValid: false,
            isPermanent: false,
            error: "Database not set up. Please run the setup scripts first.",
          })
        }
        console.log("[v0] Database error:", error)
        return NextResponse.json({ isValid: false, isPermanent: false, error: "Invalid token" })
      }

      if (!tokenData) {
        console.log("[v0] No token data found")
        return NextResponse.json({ isValid: false, isPermanent: false, error: "Invalid token" })
      }

      // Check if token has expired
      const now = new Date()
      const expiresAt = new Date(tokenData.expires_at)
      console.log("[v0] Token expiry check:", { now, expiresAt, expired: now > expiresAt })

      if (now > expiresAt) {
        console.log("[v0] Token expired")
        return NextResponse.json({ isValid: false, isPermanent: false, error: "Token expired" })
      }

      if (!skipIncrement) {
        try {
          const { error: rpcError } = await supabase.rpc("increment_token_usage", {
            token_id: tokenData.id,
          })

          if (rpcError) {
            console.log("[v0] RPC increment failed:", rpcError)
            // Only use fallback if RPC function doesn't exist (not for other errors)
            if (
              rpcError.message?.includes("function increment_token_usage") &&
              rpcError.message?.includes("does not exist")
            ) {
              console.log("[v0] RPC function doesn't exist, using manual increment")
              await supabase
                .from("access_tokens")
                .update({ used_count: tokenData.used_count + 1 })
                .eq("id", tokenData.id)
            } else {
              console.log("[v0] RPC function exists but failed, not incrementing to avoid double count")
            }
          } else {
            console.log("[v0] Token usage incremented successfully via RPC")
          }
        } catch (rpcCallError) {
          console.log("[v0] RPC call failed completely:", rpcCallError)
          if (
            rpcCallError.message?.includes("function increment_token_usage") &&
            rpcCallError.message?.includes("does not exist")
          ) {
            console.log("[v0] Using manual increment as fallback")
            await supabase
              .from("access_tokens")
              .update({ used_count: tokenData.used_count + 1 })
              .eq("id", tokenData.id)
          } else {
            console.log("[v0] RPC call failed but function exists, not incrementing to avoid double count")
          }
        }
      } else {
        console.log("[v0] Skipping usage increment as requested")
      }

      console.log("[v0] Token validated successfully")
      return NextResponse.json({
        isValid: true,
        isPermanent: tokenData.is_permanent,
        tokenNumber: tokenData.token_number,
        tokenId: tokenData.id, // Add tokenId for viewer tracking
        expiresAt: tokenData.expires_at,
      })
    } catch (dbError) {
      console.error("[v0] Database error:", dbError)
      return NextResponse.json({
        isValid: false,
        isPermanent: false,
        error: "Database connection failed. Please check setup.",
      })
    }
  } catch (error) {
    console.error("[v0] Token validation error:", error)
    return NextResponse.json({ isValid: false, isPermanent: false, error: "Server error" }, { status: 500 })
  }
}
