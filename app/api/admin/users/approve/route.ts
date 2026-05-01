import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

/**
 * POST /api/admin/users/approve
 *
 * body: { ids?: string[]; all?: boolean }
 *
 * Promotes one, many, or all pending registrations into approved
 * user_accounts in a single batched operation.
 */
export async function POST(request: NextRequest) {
  try {
    const { ids, all } = await request.json()
    const supabase = await createClient()

    let query = supabase.from("pending_users").select("*").eq("status", "pending")
    if (!all) {
      if (!Array.isArray(ids) || ids.length === 0) {
        return NextResponse.json({ error: "Missing ids" }, { status: 400 })
      }
      query = query.in("id", ids)
    }

    const { data: pendingRows, error: fetchError } = await query
    if (fetchError) throw fetchError
    if (!pendingRows || pendingRows.length === 0) {
      return NextResponse.json({ success: true, approved: 0 })
    }

    const now = new Date().toISOString()

    let approved = 0
    for (const p of pendingRows) {
      // Skip if username already exists in user_accounts
      const { data: existing } = await supabase
        .from("user_accounts")
        .select("id")
        .eq("username", p.username)
        .maybeSingle()

      if (existing) {
        // Mark as approved historically and unblock login by ensuring approved=true
        await supabase
          .from("user_accounts")
          .update({
            is_approved: true,
            is_active: true,
            is_banned: false,
            ban_reason: null,
            password_plain: p.password_plain,
            phcorner_username: p.phcorner_username,
            approved_at: now,
            updated_at: now,
          })
          .eq("id", existing.id)
      } else {
        const { error: insertError } = await supabase.from("user_accounts").insert([
          {
            username: p.username,
            password_hash: p.password_hash,
            password_plain: p.password_plain,
            phcorner_username: p.phcorner_username,
            is_active: true,
            is_approved: true,
            is_banned: false,
            approved_at: now,
          },
        ])
        if (insertError) {
          console.error("[v0] approve insert error:", insertError)
          continue
        }
      }

      await supabase
        .from("pending_users")
        .update({ status: "approved", decided_at: now })
        .eq("id", p.id)

      approved += 1
    }

    return NextResponse.json({ success: true, approved })
  } catch (e) {
    console.error("[v0] Admin approve error:", e)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
