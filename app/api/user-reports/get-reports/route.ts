import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()

    const { data, error } = await supabase
      .from("user_reports")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1000)

    if (error) {
      console.error("Error fetching reports:", error)
      return NextResponse.json({ error: "Failed to fetch reports" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      reports: data || [],
    })
  } catch (error) {
    console.error("Fetch reports error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
