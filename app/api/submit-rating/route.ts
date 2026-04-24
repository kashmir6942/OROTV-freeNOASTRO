import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { user_type, username, rating, satisfaction_comment, complaint, issues, features_to_add } = body

    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json({ error: "Rating is required and must be between 1-5" }, { status: 400 })
    }

    const supabase = await createClient()
    
    // Get client IP and user agent
    const forwarded = request.headers.get("x-forwarded-for")
    const user_ip = forwarded ? forwarded.split(",")[0].trim() : "unknown"
    const user_agent = request.headers.get("user-agent") || "unknown"

    const { data, error } = await supabase.from("user_ratings").insert([
      {
        user_type: user_type || "Anonymous",
        username: username || null,
        rating,
        satisfaction_comment: satisfaction_comment || null,
        complaint: complaint || null,
        issues: issues || [],
        features_to_add: features_to_add || null,
        user_ip,
        user_agent,
      },
    ]).select().single()

    if (error) {
      console.error("Error submitting rating:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("Error in submit-rating API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("user_ratings")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100)

    if (error) {
      console.error("Error fetching ratings:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, ratings: data })
  } catch (error) {
    console.error("Error in get ratings API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
