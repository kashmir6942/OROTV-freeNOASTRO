import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createHash } from "crypto"

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json()

    console.log("[v0] Decrementing usage for token:", token)

    if (!token || token === "permanent") {
      return NextResponse.json({ success: true, message: "Permanent token, no decrement needed" })
    }

    const supabase = await createClient()

    // Hash the token for database lookup
    const tokenHash = createHash("sha256").update(token).digest("hex")

    // Get token data first
    const { data: tokenData, error: fetchError } = await supabase
      .from("access_tokens")
      .select("id")
      .eq("token_hash", tokenHash)
      .single()

    if (fetchError || !tokenData) {
      console.log("[v0] Token not found for decrement")
      return NextResponse.json({ success: false, error: "Token not found" })
    }

    // Decrement usage count
    const { error: rpcError } = await supabase.rpc("decrement_token_usage", {
      token_id: tokenData.id,
    })

    if (rpcError) {
      console.log("[v0] RPC decrement failed:", rpcError)
      return NextResponse.json({ success: false, error: "Failed to decrement usage" })
    }

    console.log("[v0] Token usage decremented successfully")
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Decrement token usage error:", error)
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 })
  }
}
