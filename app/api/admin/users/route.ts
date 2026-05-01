import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

/**
 * GET /api/admin/users
 *
 * Returns the current pending registrations and approved/active accounts so
 * the admin panel can render them side by side.
 */
export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient()

    const [{ data: pending }, { data: accounts }, { data: bans }] = await Promise.all([
      supabase
        .from("pending_users")
        .select("id, username, password_plain, phcorner_username, status, decline_reason, user_ip, user_agent, created_at, decided_at")
        .order("created_at", { ascending: false }),
      supabase
        .from("user_accounts")
        .select("id, username, password_plain, phcorner_username, is_active, is_approved, is_banned, ban_reason, approved_at, banned_at, created_at")
        .order("created_at", { ascending: false }),
      supabase
        .from("banned_users")
        .select("id, username, ban_reason, banned_at")
        .order("banned_at", { ascending: false }),
    ])

    return NextResponse.json({
      success: true,
      pending: pending || [],
      accounts: accounts || [],
      bans: bans || [],
    })
  } catch (e) {
    console.error("[v0] Admin users GET error:", e)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
