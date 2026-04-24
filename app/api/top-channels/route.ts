import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = Number.parseInt(searchParams.get("limit") || "5")

    const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      cookies: {
        get: () => null,
        set: () => {},
        remove: () => {},
      },
    })

    const { data, error } = await supabase.rpc("get_top_viewed_channels", {
      limit_count: limit,
    })

    if (error) {
      console.error("[v0] Error fetching top channels:", error)
      return NextResponse.json({ error: "Failed to fetch top channels" }, { status: 500 })
    }

    return NextResponse.json({ channels: data || [] })
  } catch (error) {
    console.error("[v0] Error in top-channels API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
