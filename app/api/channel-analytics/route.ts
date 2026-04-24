import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = await createClient()

    const { data: analytics, error } = await supabase
      .from("channel_analytics")
      .select("*")
      .order("date", { ascending: false })
      .limit(50)

    if (error) throw error

    return NextResponse.json({ analytics })
  } catch (error) {
    console.error("[v0] Error fetching analytics:", error)
    return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { channelId, action } = await request.json()

    const supabase = await createClient()
    const today = new Date().toISOString().split("T")[0]

    if (action === "view") {
      const { data: existing, error: fetchError } = await supabase
        .from("channel_analytics")
        .select("*")
        .eq("channel_id", channelId)
        .eq("date", today)
        .single()

      if (fetchError && fetchError.code !== "PGRST116") throw fetchError

      if (existing) {
        // Update existing record
        const { error: updateError } = await supabase
          .from("channel_analytics")
          .update({
            view_count: existing.view_count + 1,
            total_viewers: existing.total_viewers + 1,
            last_viewed: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id)

        if (updateError) throw updateError
      } else {
        // Create new record
        const { error: insertError } = await supabase.from("channel_analytics").insert({
          channel_id: channelId,
          date: today,
          view_count: 1,
          total_viewers: 1,
          peak_viewers: 1,
          unique_viewers: 1,
          total_watch_time: 0,
          last_viewed: new Date().toISOString(),
        })

        if (insertError) throw insertError
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error updating analytics:", error)
    return NextResponse.json({ error: "Failed to update analytics" }, { status: 500 })
  }
}
