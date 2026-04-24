import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const supabase = createClient()

    // Get real-time analytics summary
    const { data: analyticsData, error: analyticsError } = await supabase.rpc("get_real_time_analytics")

    if (analyticsError) {
      console.error("Analytics error:", analyticsError)
      return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 })
    }

    // Get top channels
    const { data: topChannelsData, error: topChannelsError } = await supabase.rpc("get_top_viewed_channels", {
      limit_count: 10,
    })

    if (topChannelsError) {
      console.error("Top channels error:", topChannelsError)
      return NextResponse.json({ error: "Failed to fetch top channels" }, { status: 500 })
    }

    // Get channel viewer stats
    const { data: channelStatsData, error: channelStatsError } = await supabase.rpc("get_channel_viewer_stats")

    if (channelStatsError) {
      console.error("Channel stats error:", channelStatsError)
      return NextResponse.json({ error: "Failed to fetch channel stats" }, { status: 500 })
    }

    const analytics = analyticsData?.[0] || {
      total_active_viewers: 0,
      total_active_channels: 0,
      peak_channel_id: "N/A",
      peak_channel_viewers: 0,
      total_tokens: 0,
    }

    return NextResponse.json({
      success: true,
      analytics,
      topChannels: topChannelsData || [],
      channelStats: channelStatsData || [],
    })
  } catch (error) {
    console.error("Analytics API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
