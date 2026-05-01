import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

/**
 * POST /api/admin/users/decline
 *
 * body: { ids?: string[]; all?: boolean; reason?: string }
 *
 * Rejects one, many, or all pending registrations. The decline reason is
 * persisted so the user sees it on their next login attempt.
 */
export async function POST(request: NextRequest) {
  try {
    const { ids, all, reason } = await request.json()
    const declineReason = (reason && String(reason).trim()) || "Registration declined by administrator"
    const supabase = await createClient()

    let query = supabase
      .from("pending_users")
      .update({
        status: "declined",
        decline_reason: declineReason,
        decided_at: new Date().toISOString(),
      })
      .eq("status", "pending")

    if (!all) {
      if (!Array.isArray(ids) || ids.length === 0) {
        return NextResponse.json({ error: "Missing ids" }, { status: 400 })
      }
      query = query.in("id", ids)
    }

    const { error, data } = await query.select("id")
    if (error) throw error

    return NextResponse.json({ success: true, declined: data?.length || 0, reason: declineReason })
  } catch (e) {
    console.error("[v0] Admin decline error:", e)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
