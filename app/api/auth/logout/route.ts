import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const { username } = await request.json()
    if (!username) {
      return NextResponse.json({ success: true })
    }
    const supabase = await createClient()
    await supabase.from("user_tokens").delete().eq("username", username)
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ success: true })
  }
}
