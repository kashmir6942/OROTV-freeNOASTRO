import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"

export async function POST(request: NextRequest) {
  try {
    const { tokenId } = await request.json()

    if (!tokenId) {
      return NextResponse.json({ error: "Token ID is required" }, { status: 400 })
    }

    const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      cookies: {
        get: () => null,
        set: () => {},
        remove: () => {},
      },
    })

    const { error } = await supabase.rpc("reset_viewers", {
      token_id_param: tokenId,
    })

    if (error) {
      console.error("[v0] Error resetting viewers:", error)
      return NextResponse.json({ error: "Failed to reset viewers" }, { status: 500 })
    }

    console.log("[v0] Successfully reset viewers for token:", tokenId)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error in reset-viewers API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
