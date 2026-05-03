import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

/**
 * POST /api/admin/users/delete-rejected
 *
 * Permanently deletes every pending_users row whose status is "rejected" or
 * "declined". Used by the "Delete Rejected" bulk action in the admin panel.
 */
export async function POST(_request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("pending_users")
      .delete()
      .in("status", ["rejected", "declined"])
      .select("id")

    if (error) throw error

    return NextResponse.json({ success: true, deleted: data?.length || 0 })
  } catch (e) {
    console.error("[v0] Admin delete-rejected error:", e)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
