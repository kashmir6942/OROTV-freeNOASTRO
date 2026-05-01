"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  AlertTriangle,
  Ban,
  Check,
  CheckCircle2,
  LogOut,
  RefreshCw,
  Search,
  ShieldCheck,
  UserCheck,
  UserX,
  X,
} from "lucide-react"

type Pending = {
  id: string
  username: string
  password_plain: string | null
  phcorner_username: string | null
  status: string
  decline_reason: string | null
  user_ip: string | null
  user_agent: string | null
  created_at: string
  decided_at: string | null
}

type Account = {
  id: string
  username: string
  password_plain: string | null
  phcorner_username: string | null
  is_active: boolean
  is_approved: boolean
  is_banned: boolean
  ban_reason: string | null
  approved_at: string | null
  banned_at: string | null
  created_at: string
}

export function AdminUserApprovals() {
  const [pending, setPending] = useState<Pending[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [search, setSearch] = useState("")
  const [selectedPending, setSelectedPending] = useState<Set<string>>(new Set())
  const [selectedAccounts, setSelectedAccounts] = useState<Set<string>>(new Set())
  const [declineReason, setDeclineReason] = useState("")
  const [banReason, setBanReason] = useState("")
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)

  const load = async () => {
    setError(null)
    try {
      const res = await fetch("/api/admin/users")
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.error || "Failed to load")
      setPending(json.pending || [])
      setAccounts(json.accounts || [])
    } catch (e: any) {
      setError(e.message || "Failed to load users")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    const interval = setInterval(load, 10000)
    return () => clearInterval(interval)
  }, [])

  const filteredPending = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return pending
    return pending.filter(
      (p) =>
        p.username.toLowerCase().includes(q) ||
        (p.phcorner_username || "").toLowerCase().includes(q) ||
        (p.user_ip || "").toLowerCase().includes(q),
    )
  }, [pending, search])

  const filteredAccounts = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return accounts
    return accounts.filter(
      (a) =>
        a.username.toLowerCase().includes(q) ||
        (a.phcorner_username || "").toLowerCase().includes(q) ||
        (a.ban_reason || "").toLowerCase().includes(q),
    )
  }, [accounts, search])

  const togglePending = (id: string) => {
    setSelectedPending((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAccount = (username: string) => {
    setSelectedAccounts((prev) => {
      const next = new Set(prev)
      if (next.has(username)) next.delete(username)
      else next.add(username)
      return next
    })
  }

  const showFeedback = (msg: string) => {
    setFeedback(msg)
    setTimeout(() => setFeedback(null), 3000)
  }

  const callJson = async (url: string, body: any) => {
    setBusy(true)
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.error || "Action failed")
      return json
    } finally {
      setBusy(false)
    }
  }

  const approveSelected = async () => {
    if (selectedPending.size === 0) return
    try {
      const res = await callJson("/api/admin/users/approve", { ids: Array.from(selectedPending) })
      showFeedback(`Approved ${res.approved} user${res.approved === 1 ? "" : "s"}`)
      setSelectedPending(new Set())
      await load()
    } catch (e: any) {
      setError(e.message)
    }
  }

  const approveAll = async () => {
    if (pending.filter((p) => p.status === "pending").length === 0) return
    if (!confirm("Approve ALL pending registrations?")) return
    try {
      const res = await callJson("/api/admin/users/approve", { all: true })
      showFeedback(`Approved ${res.approved} user${res.approved === 1 ? "" : "s"}`)
      setSelectedPending(new Set())
      await load()
    } catch (e: any) {
      setError(e.message)
    }
  }

  const declineSelected = async () => {
    if (selectedPending.size === 0) return
    try {
      const res = await callJson("/api/admin/users/decline", {
        ids: Array.from(selectedPending),
        reason: declineReason,
      })
      showFeedback(`Declined ${res.declined} user${res.declined === 1 ? "" : "s"}`)
      setSelectedPending(new Set())
      setDeclineReason("")
      await load()
    } catch (e: any) {
      setError(e.message)
    }
  }

  const declineAll = async () => {
    if (pending.filter((p) => p.status === "pending").length === 0) return
    if (!confirm("Reject ALL pending registrations?")) return
    try {
      const res = await callJson("/api/admin/users/decline", {
        all: true,
        reason: declineReason,
      })
      showFeedback(`Declined ${res.declined} user${res.declined === 1 ? "" : "s"}`)
      setSelectedPending(new Set())
      setDeclineReason("")
      await load()
    } catch (e: any) {
      setError(e.message)
    }
  }

  const banSelected = async () => {
    if (selectedAccounts.size === 0) return
    try {
      await callJson("/api/admin/users/ban", {
        usernames: Array.from(selectedAccounts),
        reason: banReason,
      })
      showFeedback(`Banned ${selectedAccounts.size} user${selectedAccounts.size === 1 ? "" : "s"}`)
      setSelectedAccounts(new Set())
      setBanReason("")
      await load()
    } catch (e: any) {
      setError(e.message)
    }
  }

  const unbanSelected = async () => {
    if (selectedAccounts.size === 0) return
    try {
      await callJson("/api/admin/users/ban", {
        usernames: Array.from(selectedAccounts),
        unban: true,
      })
      showFeedback(`Unbanned ${selectedAccounts.size} user${selectedAccounts.size === 1 ? "" : "s"}`)
      setSelectedAccounts(new Set())
      await load()
    } catch (e: any) {
      setError(e.message)
    }
  }

  const forceLogoutSelected = async () => {
    if (selectedAccounts.size === 0) return
    try {
      await callJson("/api/admin/users/force-logout", {
        usernames: Array.from(selectedAccounts),
      })
      showFeedback(`Forced logout for ${selectedAccounts.size} user${selectedAccounts.size === 1 ? "" : "s"}`)
      setSelectedAccounts(new Set())
      await load()
    } catch (e: any) {
      setError(e.message)
    }
  }

  const formatDate = (s: string | null) => (s ? new Date(s).toLocaleString() : "-")

  const pendingOnly = filteredPending.filter((p) => p.status === "pending")

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <Card className="bg-white/10 backdrop-blur-lg border-white/20">
        <CardContent className="p-4 flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search username, PHCorner, IP..."
              className="pl-9 bg-white/10 border-white/20 text-white placeholder:text-gray-400"
            />
          </div>
          <div className="flex gap-2 items-center text-sm text-gray-300">
            <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30">
              {pending.filter((p) => p.status === "pending").length} pending
            </Badge>
            <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
              {accounts.filter((a) => !a.is_banned).length} active
            </Badge>
            <Badge className="bg-red-500/20 text-red-300 border-red-500/30">
              {accounts.filter((a) => a.is_banned).length} banned
            </Badge>
            <Button
              size="sm"
              variant="outline"
              onClick={load}
              disabled={busy}
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${busy ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="p-3 rounded-md bg-red-500/15 border border-red-500/40 text-red-300 text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" /> {error}
        </div>
      )}
      {feedback && (
        <div className="p-3 rounded-md bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" /> {feedback}
        </div>
      )}

      {/* Pending registrations */}
      <Card className="bg-white/10 backdrop-blur-lg border-white/20">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-amber-400" />
            Pending Registrations ({pendingOnly.length})
          </CardTitle>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={approveSelected}
              disabled={busy || selectedPending.size === 0}
              className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/30"
            >
              <Check className="w-4 h-4 mr-1" /> Approve Selected
            </Button>
            <Button
              size="sm"
              onClick={approveAll}
              disabled={busy || pendingOnly.length === 0}
              className="bg-emerald-500/30 text-emerald-200 border-emerald-500/40 hover:bg-emerald-500/40"
            >
              Approve All
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            <Textarea
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              placeholder="Decline reason (optional, shown to user on next login)"
              className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
              rows={2}
            />
            <div className="flex gap-2 items-start">
              <Button
                size="sm"
                onClick={declineSelected}
                disabled={busy || selectedPending.size === 0}
                className="bg-red-500/20 text-red-300 border-red-500/30 hover:bg-red-500/30"
              >
                <X className="w-4 h-4 mr-1" /> Decline Selected
              </Button>
              <Button
                size="sm"
                onClick={declineAll}
                disabled={busy || pendingOnly.length === 0}
                className="bg-red-500/30 text-red-200 border-red-500/40 hover:bg-red-500/40"
              >
                Reject All
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/20">
                  <th className="w-10 py-2 px-2"></th>
                  <th className="text-left py-2 px-3 text-gray-400">PHCorner</th>
                  <th className="text-left py-2 px-3 text-gray-400">User</th>
                  <th className="text-left py-2 px-3 text-gray-400">Password</th>
                  <th className="text-left py-2 px-3 text-gray-400">IP</th>
                  <th className="text-left py-2 px-3 text-gray-400">Submitted</th>
                  <th className="text-left py-2 px-3 text-gray-400">Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-gray-400">
                      Loading...
                    </td>
                  </tr>
                ) : filteredPending.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-gray-400">
                      No pending registrations
                    </td>
                  </tr>
                ) : (
                  filteredPending.map((p) => (
                    <tr key={p.id} className="border-b border-white/10 hover:bg-white/5">
                      <td className="py-2 px-2">
                        <input
                          type="checkbox"
                          checked={selectedPending.has(p.id)}
                          onChange={() => togglePending(p.id)}
                          disabled={p.status !== "pending"}
                          className="accent-emerald-500"
                          aria-label={`Select ${p.username}`}
                        />
                      </td>
                      <td className="py-2 px-3 text-purple-300">{p.phcorner_username || "-"}</td>
                      <td className="py-2 px-3 text-white font-medium">{p.username}</td>
                      <td className="py-2 px-3">
                        <code className="bg-black/40 px-2 py-0.5 rounded text-amber-300 text-xs">
                          {p.password_plain || "-"}
                        </code>
                      </td>
                      <td className="py-2 px-3 text-gray-400 text-xs">{p.user_ip || "-"}</td>
                      <td className="py-2 px-3 text-gray-400 text-xs">{formatDate(p.created_at)}</td>
                      <td className="py-2 px-3">
                        {p.status === "pending" ? (
                          <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30">Pending</Badge>
                        ) : p.status === "approved" ? (
                          <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
                            Approved
                          </Badge>
                        ) : (
                          <Badge
                            className="bg-red-500/20 text-red-300 border-red-500/30"
                            title={p.decline_reason || ""}
                          >
                            Declined
                          </Badge>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Active accounts */}
      <Card className="bg-white/10 backdrop-blur-lg border-white/20">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            Approved Accounts ({filteredAccounts.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            <Input
              value={banReason}
              onChange={(e) => setBanReason(e.target.value)}
              placeholder="Ban reason (shown to user)"
              className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
            />
            <div className="flex flex-wrap gap-2 items-start">
              <Button
                size="sm"
                onClick={forceLogoutSelected}
                disabled={busy || selectedAccounts.size === 0}
                className="bg-amber-500/20 text-amber-300 border-amber-500/30 hover:bg-amber-500/30"
              >
                <LogOut className="w-4 h-4 mr-1" /> Force Logout
              </Button>
              <Button
                size="sm"
                onClick={banSelected}
                disabled={busy || selectedAccounts.size === 0}
                className="bg-red-500/20 text-red-300 border-red-500/30 hover:bg-red-500/30"
              >
                <Ban className="w-4 h-4 mr-1" /> Ban Selected
              </Button>
              <Button
                size="sm"
                onClick={unbanSelected}
                disabled={busy || selectedAccounts.size === 0}
                className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/30"
              >
                <UserX className="w-4 h-4 mr-1" /> Unban Selected
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/20">
                  <th className="w-10 py-2 px-2"></th>
                  <th className="text-left py-2 px-3 text-gray-400">PHCorner</th>
                  <th className="text-left py-2 px-3 text-gray-400">User</th>
                  <th className="text-left py-2 px-3 text-gray-400">Password</th>
                  <th className="text-left py-2 px-3 text-gray-400">Status</th>
                  <th className="text-left py-2 px-3 text-gray-400">Approved</th>
                  <th className="text-left py-2 px-3 text-gray-400">Reason</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-gray-400">
                      Loading...
                    </td>
                  </tr>
                ) : filteredAccounts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-gray-400">
                      No approved accounts
                    </td>
                  </tr>
                ) : (
                  filteredAccounts.map((a) => (
                    <tr key={a.id} className="border-b border-white/10 hover:bg-white/5">
                      <td className="py-2 px-2">
                        <input
                          type="checkbox"
                          checked={selectedAccounts.has(a.username)}
                          onChange={() => toggleAccount(a.username)}
                          className="accent-emerald-500"
                          aria-label={`Select ${a.username}`}
                        />
                      </td>
                      <td className="py-2 px-3 text-purple-300">{a.phcorner_username || "-"}</td>
                      <td className="py-2 px-3 text-white font-medium">{a.username}</td>
                      <td className="py-2 px-3">
                        <code className="bg-black/40 px-2 py-0.5 rounded text-amber-300 text-xs">
                          {a.password_plain || "(hashed)"}
                        </code>
                      </td>
                      <td className="py-2 px-3">
                        {a.is_banned ? (
                          <Badge className="bg-red-500/20 text-red-300 border-red-500/30">Banned</Badge>
                        ) : a.is_approved && a.is_active ? (
                          <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
                            Active
                          </Badge>
                        ) : (
                          <Badge className="bg-gray-500/20 text-gray-300 border-gray-500/30">Disabled</Badge>
                        )}
                      </td>
                      <td className="py-2 px-3 text-gray-400 text-xs">{formatDate(a.approved_at)}</td>
                      <td className="py-2 px-3 text-gray-400 text-xs max-w-[220px] truncate">
                        {a.is_banned ? a.ban_reason || "-" : "-"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
