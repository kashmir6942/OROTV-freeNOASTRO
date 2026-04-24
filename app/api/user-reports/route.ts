import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { channel_id, report_type, description, error_details } = body

    console.log("[v0] Report API - Received body:", { channel_id, report_type, description: description?.substring(0, 50) })

    const supabase = createClient()
    const clientIP = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown"

    console.log("[v0] Report API - Attempting to insert report for channel:", channel_id)

    const { data, error } = await supabase
      .from("user_reports")
      .insert([
        {
          channel_id,
          report_type: report_type || "playback_error",
          description,
          error_details,
          user_ip: clientIP,
          user_agent: error_details?.user_agent || "unknown",
          status: "pending",
        },
      ])
      .select()

    if (error) {
      console.error("[v0] Error creating user report - Supabase error:", error)
      console.error("[v0] Error details:", {
        code: error.code,
        message: error.message,
        details: error.details,
      })
      return NextResponse.json({ error: "Failed to create report", details: error.message }, { status: 500 })
    }

    if (!data || data.length === 0) {
      console.error("[v0] No data returned from insert - the insert succeeded but returned no rows")
      return NextResponse.json({ error: "Failed to create report - no data returned" }, { status: 500 })
    }

    console.log("[v0] User report created successfully:", data[0].id)
    return NextResponse.json({
      success: true,
      report_id: data[0].id,
      message: "Report submitted successfully",
    })
  } catch (error) {
    console.error("[v0] User report error - Exception:", error)
    console.error("[v0] Error type:", typeof error, error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
