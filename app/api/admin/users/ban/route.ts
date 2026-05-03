import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

/**
 * POST /api/admin/users/ban
 *
 * body: { usernames: string[]; reason?: string; unban?: boolean }
 *
 * Bans (or unbans) one or more accounts. When banning we also revoke active
 * tokens so the user is kicked on their next request.
 */
export async function POST(request: NextRequest) {
  try {
    const { usernames, reason, unban } = await request.json()
    if (!Array.isArray(usernames) || usernames.length === 0) {
      return NextResponse.json({ error: "Missing usernames" }, { status: 400 })
    }
    const banReason = (reason && String(reason).trim()) || "Banned by administrator"
    const supabase = await createClient()

    if (unban) {
      const { error } = await supabase
        .from("user_accounts")
        .update({ is_banned: false, ban_reason: null, banned_at: null })
        .in("username", usernames)
      if (error) throw error
      await supabase.from("banned_users").delete().in("username", usernames)
      return NextResponse.json({ success: true, unbanned: usernames.length })
    }

    const { error: updateError } = await supabase
      .from("user_accounts")
      .update({
        is_banned: true,
        ban_reason: banReason,
        banned_at: new Date().toISOString(),
      })
      .in("username", usernames)
    if (updateError) throw updateError

    // Drop tokens immediately so the next API call kicks them out
    await supabase.from("user_tokens").delete().in("username", usernames)

    // Append to banned_users history. Column is `reason`, not `ban_reason`.
    const inserts = usernames.map((u: string) => ({ username: u, reason: banReason }))
    const { error: bhError } = await supabase.from("banned_users").insert(inserts)
    if (bhError) console.error("[v0] banned_users insert error:", bhError)

    return NextResponse.json({ success: true, banned: usernames.length })
  } catch (e) {
    console.error("[v0] Admin ban error:", e)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
