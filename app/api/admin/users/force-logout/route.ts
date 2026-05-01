import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

/**
 * POST /api/admin/users/force-logout
 *
 * body: { usernames: string[] }
 *
 * Invalidates the user's active tokens and inserts a forced_logouts row so
 * the client's next heartbeat / token refresh forces them back to /login.
 */
export async function POST(request: NextRequest) {
  try {
    const { usernames } = await request.json()
    if (!Array.isArray(usernames) || usernames.length === 0) {
      return NextResponse.json({ error: "Missing usernames" }, { status: 400 })
    }
    const supabase = await createClient()

    await supabase.from("user_tokens").delete().in("username", usernames)
    const inserts = usernames.map((u: string) => ({ username: u, consumed: false }))
    await supabase.from("forced_logouts").insert(inserts)

    return NextResponse.json({ success: true, signedOut: usernames.length })
  } catch (e) {
    console.error("[v0] Admin force-logout error:", e)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
