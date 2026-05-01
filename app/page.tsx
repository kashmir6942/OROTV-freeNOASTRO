"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

export default function RootGate() {
  const router = useRouter()
  const [message, setMessage] = useState("Checking access...")

  useEffect(() => {
    let cancelled = false

    const decide = async () => {
      try {
        // Pull persisted session
        let session: { username?: string; token?: string; expiresAt?: string } = {}
        try {
          const raw = sessionStorage.getItem("orotv_session")
          if (raw) session = JSON.parse(raw)
        } catch {}

        if (!session?.username || !session?.token) {
          if (!cancelled) {
            setMessage("Redirecting to sign in...")
            router.replace("/login")
          }
          return
        }

        // Validate token still exists and is not expired
        const supabase = createClient()
        const { data: tokenRow } = await supabase
          .from("user_tokens")
          .select("token, expires_at")
          .eq("username", session.username)
          .eq("token", session.token)
          .maybeSingle()

        if (!tokenRow || new Date(tokenRow.expires_at) < new Date()) {
          try {
            sessionStorage.removeItem("orotv_session")
          } catch {}
          if (!cancelled) {
            setMessage("Session expired. Redirecting...")
            router.replace("/login")
          }
          return
        }

        // Confirm user is still allowed
        const { data: account } = await supabase
          .from("user_accounts")
          .select("is_active, is_approved, is_banned")
          .eq("username", session.username)
          .maybeSingle()

        if (!account || !account.is_approved || !account.is_active || account.is_banned) {
          try {
            sessionStorage.removeItem("orotv_session")
          } catch {}
          if (!cancelled) {
            setMessage("Access denied. Redirecting...")
            router.replace("/login")
          }
          return
        }

        if (!cancelled) {
          router.replace(
            `/users/${encodeURIComponent(session.username)}?token=${encodeURIComponent(tokenRow.token)}`,
          )
        }
      } catch (e) {
        console.error("[v0] Root gate error:", e)
        if (!cancelled) {
          router.replace("/login")
        }
      }
    }

    decide()

    return () => {
      cancelled = true
    }
  }, [router])

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="text-center space-y-4">
        <img src="/images/what-brand-logo.png" alt="OROTV" className="h-20 w-auto mx-auto" />
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-muted-foreground text-sm font-mono">{message}</p>
      </div>
    </div>
  )
}
