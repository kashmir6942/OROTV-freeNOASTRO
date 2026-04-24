import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"

export async function POST(request: NextRequest) {
  try {
    let tokenId: string

    const contentType = request.headers.get("content-type")

    if (contentType?.includes("application/json")) {
      const body = await request.json()
      tokenId = body.tokenId
    } else {
      const formData = await request.formData()
      tokenId = formData.get("tokenId") as string
    }

    if (!tokenId) {
      return NextResponse.json({ error: "Token ID is required" }, { status: 400 })
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(tokenId)) {
      return NextResponse.json({ error: "Invalid token ID format" }, { status: 400 })
    }

    const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      cookies: {
        get: () => null,
        set: () => {},
        remove: () => {},
      },
    })

    const { error } = await supabase.rpc("decrement_viewers", {
      token_id_param: tokenId,
    })

    if (error) {
      console.error("[v0] Error decrementing viewers:", error)
      return NextResponse.json({ error: "Failed to decrement viewers" }, { status: 500 })
    }

    console.log("[v0] Successfully decremented viewers for token:", tokenId)

    await supabase.rpc("update_channel_analytics_from_tokens")

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error in decrement-viewers API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
