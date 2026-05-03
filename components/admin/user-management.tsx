"use client"

import { useEffect, useMemo, useState } from "react"
import {
  Clock,
  CheckCircle2,
  XCircle,
  Users as UsersIcon,
  Search,
  Ban,
  LogOut,
  Trash2,
  RefreshCw,
  User as UserIcon,
  Shield,
  KeyRound,
  Eye,
  EyeOff,
  Smartphone,
  ShieldCheck,
} from "lucide-react"

interface PendingUser {
  id: string
  username: string
  password_plain: string | null
  phcorner_username: string | null
  status: "pending" | "approved" | "rejected" | "declined"
  decline_reason: string | null
  rejection_reason: string | null
  user_ip: string | null
  user_agent: string | null
  created_at: string
  decided_at: string | null
}

interface UserAccount {
  id: string
  username: string
  password_plain: string | null
  phcorner_username: string | null
  is_active: boolean | null
  is_approved: boolean | null
  is_banned: boolean | null
  ban_reason: string | null
  approved_at: string | null
  banned_at: string | null
  created_at: string | null
  last_login_at: string | null
}

interface ActiveSession {
  username: string
  device_id: string | null
  expires_at: string
  created_at: string | null
}

type Row =
  | { kind: "pending"; data: PendingUser }
  | { kind: "rejected"; data: PendingUser }
  | { kind: "approved"; data: UserAccount }
  | { kind: "banned"; data: UserAccount }

const formatDate = (iso: string | null | undefined) => {
  if (!iso) return "—"
  try {
    return new Date(iso).toLocaleDateString()
  } catch {
    return "—"
  }
}

export default function UserManagement() {
  const [pending, setPending] = useState<PendingUser[]>([])
  const [accounts, setAccounts] = useState<UserAccount[]>([])
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [actionPending, setActionPending] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [searchInput, setSearchInput] = useState("")
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, boolean>>({})

  const load = async (showSpinner = false) => {
    if (showSpinner) setRefreshing(true)
    try {
      const res = await fetch("/api/admin/users", { cache: "no-store" })
      const data = await res.json()
      if (data?.success) {
        setPending(data.pending || [])
        setAccounts(data.accounts || [])
        setActiveSessions(data.activeSessions || [])
      }
    } catch (e) {
      console.error("[v0] UserManagement load error:", e)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const activeSessionMap = useMemo(() => {
    const map: Record<string, ActiveSession> = {}
    activeSessions.forEach((s) => {
      if (!s.username) return
      const key = s.username.toLowerCase()
      const prev = map[key]
      if (!prev || new Date(s.expires_at) > new Date(prev.expires_at)) map[key] = s
    })
    return map
  }, [activeSessions])

  const stats = useMemo(() => {
    const pendingCount = pending.filter((p) => p.status === "pending").length
    const rejectedCount = pending.filter(
      (p) => p.status === "rejected" || p.status === "declined",
    ).length
    const approvedCount = accounts.filter((a) => a.is_approved && !a.is_banned).length
    return { pendingCount, approvedCount, rejectedCount }
  }, [pending, accounts])

  const rows: Row[] = useMemo(() => {
    const list: Row[] = []
    accounts.forEach((a) => {
      if (a.is_banned) list.push({ kind: "banned", data: a })
      else if (a.is_approved) list.push({ kind: "approved", data: a })
    })
    pending.forEach((p) => {
      if (p.status === "pending") list.push({ kind: "pending", data: p })
      else if (p.status === "rejected" || p.status === "declined")
        list.push({ kind: "rejected", data: p })
    })
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      return list.filter((r) => {
        const u = r.data.username?.toLowerCase() || ""
        const ph = (r.data as any).phcorner_username?.toLowerCase?.() || ""
        return u.includes(q) || ph.includes(q)
      })
    }
    return list
  }, [accounts, pending, search])

  const togglePassword = (id: string) =>
    setRevealedPasswords((prev) => ({ ...prev, [id]: !prev[id] }))

  const callApi = async (path: string, body: unknown, label: string) => {
    setActionPending(label)
    try {
      const res = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        alert(data?.error || "Action failed")
      }
    } catch (e) {
      console.error("[v0] action error:", e)
      alert("Action failed")
    } finally {
      setActionPending(null)
      await load(true)
    }
  }

  const approveOne = (id: string) => callApi("/api/admin/users/approve", { ids: [id] }, `approve-${id}`)
  const rejectOne = (id: string) =>
    callApi("/api/admin/users/decline", { ids: [id], reason: "Rejected by admin" }, `reject-${id}`)
  const banOne = (username: string) =>
    callApi("/api/admin/users/ban", { usernames: [username] }, `ban-${username}`)
  const unbanOne = (username: string) =>
    callApi("/api/admin/users/ban", { usernames: [username], unban: true }, `unban-${username}`)
  const forceLogoutOne = (username: string) =>
    callApi("/api/admin/users/force-logout", { usernames: [username] }, `fl-${username}`)

  const approveAllPending = () => {
    if (!stats.pendingCount) return
    if (!confirm(`Approve all ${stats.pendingCount} pending registrations?`)) return
    callApi("/api/admin/users/approve", { all: true }, "approve-all")
  }
  const rejectAllPending = () => {
    if (!stats.pendingCount) return
    if (!confirm(`Reject all ${stats.pendingCount} pending registrations?`)) return
    callApi(
      "/api/admin/users/decline",
      { all: true, reason: "Bulk rejected by admin" },
      "reject-all",
    )
  }
  const banAll = () => {
    const usernames = accounts.filter((a) => !a.is_banned && a.is_approved).map((a) => a.username)
    if (!usernames.length) return
    if (!confirm(`Ban all ${usernames.length} approved users? This will also force them out.`)) return
    callApi("/api/admin/users/ban", { usernames, reason: "Bulk banned by admin" }, "ban-all")
  }
  const unbanAll = () => {
    const usernames = accounts.filter((a) => a.is_banned).map((a) => a.username)
    if (!usernames.length) return
    if (!confirm(`Unban all ${usernames.length} banned users?`)) return
    callApi("/api/admin/users/ban", { usernames, unban: true }, "unban-all")
  }
  const forceLogoutAll = () => {
    const usernames = Object.keys(activeSessionMap)
    if (!usernames.length) return
    if (!confirm(`Force logout all ${usernames.length} signed-in users?`)) return
    callApi("/api/admin/users/force-logout", { usernames }, "fl-all")
  }
  const deleteRejected = () => {
    if (!stats.rejectedCount) return
    if (!confirm(`Permanently delete all ${stats.rejectedCount} rejected registrations?`)) return
    callApi("/api/admin/users/delete-rejected", {}, "delete-rejected")
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-zinc-400 text-sm">
        Loading user management...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">User Management</h2>
          <p className="text-sm text-zinc-400 mt-1">Approve and manage registered users</p>
        </div>
        <button
          onClick={() => load(true)}
          disabled={refreshing}
          className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 transition-colors disabled:opacity-50"
          aria-label="Refresh"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl bg-[#0e0e10] border border-white/5 p-6">
          <Clock className="h-5 w-5 text-yellow-400 mb-3" />
          <div className="text-4xl font-bold text-white">{stats.pendingCount}</div>
          <div className="text-sm text-zinc-400 mt-1">Pending</div>
        </div>
        <div className="rounded-xl bg-[#0e0e10] border border-white/5 p-6">
          <CheckCircle2 className="h-5 w-5 text-green-400 mb-3" />
          <div className="text-4xl font-bold text-white">{stats.approvedCount}</div>
          <div className="text-sm text-zinc-400 mt-1">Approved</div>
        </div>
        <div className="rounded-xl bg-[#0e0e10] border border-white/5 p-6">
          <XCircle className="h-5 w-5 text-red-400 mb-3" />
          <div className="text-4xl font-bold text-white">{stats.rejectedCount}</div>
          <div className="text-sm text-zinc-400 mt-1">Rejected</div>
        </div>
      </div>

      {/* Bulk actions */}
      <div className="rounded-xl bg-[#0e0e10] border border-white/5 p-5">
        <div className="flex items-center gap-2 mb-4">
          <UsersIcon className="h-4 w-4 text-zinc-300" />
          <span className="text-sm font-semibold text-white">Bulk Actions</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={approveAllPending}
            disabled={!stats.pendingCount || !!actionPending}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-green-500/10 hover:bg-green-500/20 border border-green-500/30 text-green-400 text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <CheckCircle2 className="h-4 w-4" />
            Approve All Pending ({stats.pendingCount})
          </button>
          <button
            onClick={rejectAllPending}
            disabled={!stats.pendingCount || !!actionPending}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <XCircle className="h-4 w-4" />
            Reject All Pending
          </button>
          <button
            onClick={banAll}
            disabled={!!actionPending}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/15 hover:bg-red-500/25 border border-red-500/40 text-red-300 text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Ban className="h-4 w-4" />
            Ban All Users
          </button>
          <button
            onClick={unbanAll}
            disabled={!!actionPending}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/30 text-yellow-300 text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ShieldCheck className="h-4 w-4" />
            Unban All Users
          </button>
          <button
            onClick={forceLogoutAll}
            disabled={Object.keys(activeSessionMap).length === 0 || !!actionPending}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-yellow-500/15 hover:bg-yellow-500/25 border border-yellow-500/40 text-yellow-300 text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <LogOut className="h-4 w-4" />
            Force Logout All ({Object.keys(activeSessionMap).length})
          </button>
          <button
            onClick={deleteRejected}
            disabled={!stats.rejectedCount || !!actionPending}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-300 text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Trash2 className="h-4 w-4" />
            Delete Rejected ({stats.rejectedCount})
          </button>
        </div>
      </div>

      {/* Search */}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          setSearch(searchInput)
        }}
        className="flex gap-2"
      >
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by username or PHCorner name..."
            className="w-full h-12 pl-11 pr-4 rounded-full bg-[#0e0e10] border border-white/5 text-white placeholder:text-zinc-500 outline-none focus:ring-2 focus:ring-cyan-500/40"
          />
        </div>
        <button
          type="submit"
          className="px-6 h-12 rounded-full bg-cyan-400 hover:bg-cyan-300 text-black font-semibold transition-colors"
        >
          Search
        </button>
      </form>

      {/* Rows */}
      <div className="space-y-3">
        {rows.length === 0 && (
          <div className="text-center py-12 text-zinc-500 text-sm border border-white/5 rounded-xl bg-[#0e0e10]">
            No users to display.
          </div>
        )}

        {rows.map((row) => {
          const isAccount = row.kind === "approved" || row.kind === "banned"
          const data = row.data
          const password = data.password_plain || ""
          const revealed = !!revealedPasswords[data.id]
          const session = isAccount ? activeSessionMap[data.username.toLowerCase()] : undefined
          const isSignedIn = !!session

          return (
            <div
              key={`${row.kind}-${data.id}`}
              className="rounded-xl bg-[#0e0e10] border border-white/5 p-5 flex flex-col md:flex-row md:items-start gap-4 md:justify-between"
            >
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <UserIcon className="h-4 w-4 text-zinc-400" />
                  <span className="font-semibold text-white">{data.username}</span>
                  {row.kind === "pending" && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-yellow-500/15 text-yellow-300 border border-yellow-500/30">
                      Pending
                    </span>
                  )}
                  {row.kind === "approved" && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-green-500/15 text-green-300 border border-green-500/30">
                      Approved
                    </span>
                  )}
                  {row.kind === "rejected" && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-red-500/15 text-red-300 border border-red-500/30">
                      Rejected
                    </span>
                  )}
                  {row.kind === "banned" && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-red-500/20 text-red-300 border border-red-500/40">
                      Banned
                    </span>
                  )}
                </div>

                <div className="mt-2 flex items-center gap-2 text-sm text-zinc-300">
                  <Shield className="h-3.5 w-3.5 text-zinc-500" />
                  PHCorner: {(data as any).phcorner_username || "—"}
                </div>

                {password && (
                  <div className="mt-2 flex items-center gap-2 text-sm">
                    <KeyRound className="h-3.5 w-3.5 text-yellow-500" />
                    <span className="text-zinc-400">Password:</span>
                    <code className="text-yellow-300 font-mono text-sm">
                      {revealed ? password : "•".repeat(Math.max(6, Math.min(password.length, 10)))}
                    </code>
                    <button
                      onClick={() => togglePassword(data.id)}
                      className="text-zinc-500 hover:text-zinc-300"
                      aria-label={revealed ? "Hide password" : "Show password"}
                    >
                      {revealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                )}

                <div className="mt-2 text-xs text-zinc-500">
                  Registered: {formatDate(data.created_at)}
                  {isAccount && (data as UserAccount).last_login_at && (
                    <> | Last login: {formatDate((data as UserAccount).last_login_at)}</>
                  )}
                </div>

                {row.kind === "rejected" && (data as PendingUser).decline_reason && (
                  <div className="mt-2 text-sm text-red-400">
                    Reason: {(data as PendingUser).decline_reason}
                  </div>
                )}
                {row.kind === "banned" && (data as UserAccount).ban_reason && (
                  <div className="mt-2 text-sm text-red-400">
                    Reason: {(data as UserAccount).ban_reason}
                  </div>
                )}

                {isSignedIn && (
                  <div className="mt-2 inline-flex items-center gap-1.5 text-xs text-cyan-400">
                    <Smartphone className="h-3.5 w-3.5" />
                    Device bound
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-2 md:w-44 shrink-0">
                {row.kind === "pending" && (
                  <>
                    <button
                      onClick={() => approveOne(data.id)}
                      disabled={!!actionPending}
                      className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-green-500/10 hover:bg-green-500/20 border border-green-500/30 text-green-300 text-sm font-medium transition-colors disabled:opacity-50"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Approve
                    </button>
                    <button
                      onClick={() => rejectOne(data.id)}
                      disabled={!!actionPending}
                      className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-300 text-sm font-medium transition-colors disabled:opacity-50"
                    >
                      <XCircle className="h-4 w-4" />
                      Reject
                    </button>
                  </>
                )}
                {row.kind === "rejected" && (
                  <button
                    onClick={() => approveOne(data.id)}
                    disabled={!!actionPending}
                    className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-green-500/10 hover:bg-green-500/20 border border-green-500/30 text-green-300 text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Approve
                  </button>
                )}
                {row.kind === "approved" && (
                  <>
                    <button
                      onClick={() => banOne(data.username)}
                      disabled={!!actionPending}
                      className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-300 text-sm font-medium transition-colors disabled:opacity-50"
                    >
                      <Ban className="h-4 w-4" />
                      Ban
                    </button>
                    {isSignedIn && (
                      <button
                        onClick={() => forceLogoutOne(data.username)}
                        disabled={!!actionPending}
                        className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/30 text-yellow-300 text-sm font-medium transition-colors disabled:opacity-50"
                      >
                        <LogOut className="h-4 w-4" />
                        Force Logout
                      </button>
                    )}
                  </>
                )}
                {row.kind === "banned" && (
                  <button
                    onClick={() => unbanOne(data.username)}
                    disabled={!!actionPending}
                    className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/30 text-yellow-300 text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    <ShieldCheck className="h-4 w-4" />
                    Unban
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
