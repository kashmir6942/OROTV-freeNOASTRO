import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, channel_id, session_id, user_agent } = body

    const supabase = await createClient()
    const clientIP = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown"

    switch (action) {
      case "start":
        // Create new viewer session
        const { data: sessionData, error: sessionError } = await supabase
          .from("viewer_sessions")
          .insert([
            {
              channel_id,
              user_ip: clientIP,
              user_agent,
              session_start: new Date().toISOString(),
              last_heartbeat: new Date().toISOString(),
              is_active: true,
            },
          ])
          .select("id")
          .single()

        if (sessionError) {
          console.error("Error creating viewer session:", sessionError)
          return NextResponse.json({ error: "Failed to start session" }, { status: 500 })
        }

        const today = new Date().toISOString().split("T")[0]

        // Get current viewer count for this channel
        const { data: currentViewers, error: countError } = await supabase
          .from("viewer_sessions")
          .select("id", { count: "exact" })
          .eq("channel_id", channel_id)
          .eq("is_active", true)
          .gte("last_heartbeat", new Date(Date.now() - 5 * 60 * 1000).toISOString())

        const viewerCount = currentViewers?.length || 1

        // Update analytics
        const { data: existingAnalytics, error: fetchError } = await supabase
          .from("channel_analytics")
          .select("*")
          .eq("channel_id", channel_id)
          .eq("date", today)
          .single()

        if (fetchError && fetchError.code !== "PGRST116") {
          console.error("Error fetching analytics:", fetchError)
        }

        if (existingAnalytics) {
          // Update existing record
          const { error: updateError } = await supabase
            .from("channel_analytics")
            .update({
              total_viewers: existingAnalytics.total_viewers + 1,
              peak_viewers: Math.max(existingAnalytics.peak_viewers, viewerCount),
              unique_viewers: existingAnalytics.unique_viewers + 1,
              updated_at: new Date().toISOString(),
            })
            .eq("id", existingAnalytics.id)

          if (updateError) {
            console.error("Error updating analytics:", updateError)
          }
        } else {
          // Create new record
          const { error: insertError } = await supabase.from("channel_analytics").insert({
            channel_id,
            date: today,
            total_viewers: 1,
            peak_viewers: viewerCount,
            unique_viewers: 1,
            total_watch_time: 0,
            view_count: 1,
            updated_at: new Date().toISOString(),
          })

          if (insertError) {
            console.error("Error inserting analytics:", insertError)
          }
        }

        return NextResponse.json({
          success: true,
          session_id: sessionData.id,
        })

      case "heartbeat":
        // Update last heartbeat and calculate watch time
        const { error: heartbeatError } = await supabase
          .from("viewer_sessions")
          .update({
            last_heartbeat: new Date().toISOString(),
            is_active: true,
          })
          .eq("id", session_id)

        if (heartbeatError) {
          console.error("Error updating heartbeat:", heartbeatError)
          return NextResponse.json({ error: "Failed to update heartbeat" }, { status: 500 })
        }

        const { data: sessionInfo, error: sessionFetchError } = await supabase
          .from("viewer_sessions")
          .select("channel_id, session_start")
          .eq("id", session_id)
          .single()

        if (!sessionFetchError && sessionInfo) {
          const watchTimeSeconds = Math.floor((Date.now() - new Date(sessionInfo.session_start).getTime()) / 1000)
          const todayDate = new Date().toISOString().split("T")[0]

          await supabase
            .from("channel_analytics")
            .update({
              total_watch_time: watchTimeSeconds,
              updated_at: new Date().toISOString(),
            })
            .eq("channel_id", sessionInfo.channel_id)
            .eq("date", todayDate)
        }

        return NextResponse.json({ success: true })

      case "end":
        // End viewer session
        const { error: endError } = await supabase
          .from("viewer_sessions")
          .update({
            session_end: new Date().toISOString(),
            is_active: false,
          })
          .eq("id", session_id)

        if (endError) {
          console.error("Error ending session:", endError)
          return NextResponse.json({ error: "Failed to end session" }, { status: 500 })
        }

        return NextResponse.json({ success: true })

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }
  } catch (error) {
    console.error("Viewer tracking error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
