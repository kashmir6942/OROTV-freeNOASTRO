'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  Search, 
  RefreshCw, 
  ArrowLeft,
  User,
  Eye,
  EyeOff,
  Ban,
  LogOut,
  Trash2,
  UserCheck,
  Users
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface PendingUser {
  id: string
  username: string
  phcorner_username: string | null
  password_plain: string | null
  user_ip: string | null
  user_agent: string | null
  status: string
  decline_reason: string | null
  created_at: string
  decided_at: string | null
}

interface UserAccount {
  id: string
  username: string
  phcorner_username: string | null
  password_plain: string | null
  is_active: boolean
  is_approved: boolean
  is_banned: boolean
  ban_reason: string | null
  approved_at: string | null
  banned_at: string | null
  created_at: string
  last_login_at: string | null
}

export function UserManagement({ onBack }: { onBack: () => void }) {
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([])
  const [accounts, setAccounts] = useState<UserAccount[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({})
  const [rejectReason, setRejectReason] = useState('')
  const [showRejectModal, setShowRejectModal] = useState<string | null>(null)

  const stats = {
    pending: pendingUsers.filter(u => u.status === 'pending').length,
    approved: accounts.filter(u => u.is_approved && !u.is_banned).length,
    rejected: pendingUsers.filter(u => u.status === 'declined' || u.status === 'rejected').length,
  }

  const loadUsers = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/admin/users')
      const data = await response.json()
      
      if (data.success) {
        setPendingUsers(data.pending || [])
        setAccounts(data.accounts || [])
      }
    } catch (error) {
      console.error('[v0] Failed to load users:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadUsers()
  }, [])

  const approveUser = async (id: string) => {
    try {
      const response = await fetch('/api/admin/users/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [id] }),
      })
      
      if (response.ok) {
        loadUsers()
      }
    } catch (error) {
      console.error('[v0] Failed to approve user:', error)
    }
  }

  const rejectUser = async (id: string, reason: string) => {
    try {
      const response = await fetch('/api/admin/users/decline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [id], reason }),
      })
      
      if (response.ok) {
        loadUsers()
        setShowRejectModal(null)
        setRejectReason('')
      }
    } catch (error) {
      console.error('[v0] Failed to reject user:', error)
    }
  }

  const approveAllPending = async () => {
    try {
      const response = await fetch('/api/admin/users/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true }),
      })
      
      if (response.ok) {
        loadUsers()
      }
    } catch (error) {
      console.error('[v0] Failed to approve all:', error)
    }
  }

  const rejectAllPending = async (reason: string) => {
    try {
      const response = await fetch('/api/admin/users/decline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true, reason }),
      })
      
      if (response.ok) {
        loadUsers()
      }
    } catch (error) {
      console.error('[v0] Failed to reject all:', error)
    }
  }

  const banUser = async (username: string, reason: string) => {
    const supabase = createClient()
    try {
      await supabase
        .from('user_accounts')
        .update({ 
          is_banned: true, 
          ban_reason: reason,
          banned_at: new Date().toISOString()
        })
        .eq('username', username)
      loadUsers()
    } catch (error) {
      console.error('[v0] Failed to ban user:', error)
    }
  }

  const unbanUser = async (username: string) => {
    const supabase = createClient()
    try {
      await supabase
        .from('user_accounts')
        .update({ 
          is_banned: false, 
          ban_reason: null,
          banned_at: null
        })
        .eq('username', username)
      loadUsers()
    } catch (error) {
      console.error('[v0] Failed to unban user:', error)
    }
  }

  const forceLogout = async (username: string) => {
    const supabase = createClient()
    try {
      await supabase
        .from('user_tokens')
        .delete()
        .eq('username', username)
      alert(`Force logged out: ${username}`)
    } catch (error) {
      console.error('[v0] Failed to force logout:', error)
    }
  }

  const deleteRejected = async () => {
    const supabase = createClient()
    try {
      await supabase
        .from('pending_users')
        .delete()
        .in('status', ['declined', 'rejected'])
      loadUsers()
    } catch (error) {
      console.error('[v0] Failed to delete rejected:', error)
    }
  }

  const togglePassword = (id: string) => {
    setShowPasswords(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const filteredPending = pendingUsers.filter(u => 
    u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.phcorner_username && u.phcorner_username.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const filteredAccounts = accounts.filter(u => 
    u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.phcorner_username && u.phcorner_username.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  return (
    <div className="min-h-screen bg-[#0d1117] text-white p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold">User Management</h1>
            <p className="text-gray-400 text-sm">Approve and manage registered users</p>
          </div>
        </div>
        <button onClick={loadUsers} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
          <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-4">
          <Clock className="w-5 h-5 text-yellow-400 mb-2" />
          <p className="text-3xl font-bold">{stats.pending}</p>
          <p className="text-gray-400 text-sm">Pending</p>
        </div>
        <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-4">
          <CheckCircle className="w-5 h-5 text-green-400 mb-2" />
          <p className="text-3xl font-bold">{stats.approved}</p>
          <p className="text-gray-400 text-sm">Approved</p>
        </div>
        <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-4">
          <XCircle className="w-5 h-5 text-red-400 mb-2" />
          <p className="text-3xl font-bold">{stats.rejected}</p>
          <p className="text-gray-400 text-sm">Rejected</p>
        </div>
      </div>

      {/* Bulk Actions */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-4 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Users className="w-5 h-5" />
          <span className="font-medium">Bulk Actions</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            className="border-green-500/30 text-green-400 hover:bg-green-500/10"
            onClick={approveAllPending}
            disabled={stats.pending === 0}
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Approve All Pending ({stats.pending})
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="border-red-500/30 text-red-400 hover:bg-red-500/10"
            onClick={() => rejectAllPending('Bulk rejected by admin')}
            disabled={stats.pending === 0}
          >
            <XCircle className="w-4 h-4 mr-2" />
            Reject All Pending
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="border-red-500/30 bg-red-500/20 text-red-400 hover:bg-red-500/30"
            onClick={deleteRejected}
            disabled={stats.rejected === 0}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete Rejected ({stats.rejected})
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
        <Input
          placeholder="Search by username or PHCorner name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 bg-[#0d1117] border-[#30363d] text-white"
        />
        {searchQuery && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-2 top-1/2 -translate-y-1/2"
            onClick={() => setSearchQuery('')}
          >
            Clear
          </Button>
        )}
      </div>

      {/* User List */}
      <div className="space-y-3">
        {/* Pending Users */}
        {filteredPending.filter(u => u.status === 'pending').map(user => (
          <div key={user.id} className="bg-[#161b22] border border-[#30363d] rounded-lg p-4">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <User className="w-4 h-4 text-gray-400" />
                  <span className="font-semibold">{user.username}</span>
                  <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs rounded-full font-medium">
                    PENDING
                  </span>
                </div>
                <p className="text-gray-400 text-sm mb-1">
                  <span className="text-cyan-400">PHCorner:</span> {user.phcorner_username || 'N/A'}
                </p>
                <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
                  <span className="text-cyan-400">Password:</span>
                  <span className={showPasswords[user.id] ? 'text-yellow-400' : ''}>
                    {showPasswords[user.id] ? user.password_plain : '••••••••'}
                  </span>
                  <button onClick={() => togglePassword(user.id)}>
                    {showPasswords[user.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-gray-500 text-xs mb-1">
                  <span className="text-cyan-400">IP:</span> {user.user_ip || 'unknown'}
                </p>
                <p className="text-gray-500 text-xs">
                  Registered: {new Date(user.created_at).toLocaleDateString()}
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <Button
                  size="sm"
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => approveUser(user.id)}
                >
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                  onClick={() => setShowRejectModal(user.id)}
                >
                  <XCircle className="w-4 h-4 mr-1" />
                  Reject
                </Button>
              </div>
            </div>
          </div>
        ))}

        {/* Approved Users */}
        {filteredAccounts.filter(u => u.is_approved && !u.is_banned).map(user => (
          <div key={user.id} className="bg-[#161b22] border border-[#30363d] rounded-lg p-4">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <User className="w-4 h-4 text-gray-400" />
                  <span className="font-semibold">{user.username}</span>
                  <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full font-medium">
                    APPROVED
                  </span>
                </div>
                <p className="text-gray-400 text-sm mb-1">
                  <span className="text-cyan-400">PHCorner:</span> {user.phcorner_username || 'N/A'}
                </p>
                <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
                  <span className="text-cyan-400">Password:</span>
                  <span className={showPasswords[user.id] ? 'text-yellow-400' : ''}>
                    {showPasswords[user.id] ? user.password_plain : '••••••••'}
                  </span>
                  <button onClick={() => togglePassword(user.id)}>
                    {showPasswords[user.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-gray-500 text-xs">
                  Registered: {new Date(user.created_at).toLocaleDateString()}
                  {user.last_login_at && ` | Last login: ${new Date(user.last_login_at).toLocaleDateString()}`}
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="border-red-800/50 bg-red-900/30 text-red-400 hover:bg-red-900/50"
                  onClick={() => banUser(user.username, 'Banned by admin')}
                >
                  <Ban className="w-4 h-4 mr-1" />
                  Ban
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-yellow-500/30 bg-yellow-900/20 text-yellow-400 hover:bg-yellow-900/30"
                  onClick={() => forceLogout(user.username)}
                >
                  <LogOut className="w-4 h-4 mr-1" />
                  Force Logout
                </Button>
              </div>
            </div>
          </div>
        ))}

        {/* Rejected Users */}
        {filteredPending.filter(u => u.status === 'declined' || u.status === 'rejected').map(user => (
          <div key={user.id} className="bg-[#161b22] border border-[#30363d] rounded-lg p-4">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <User className="w-4 h-4 text-gray-400" />
                  <span className="font-semibold">{user.username}</span>
                  <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded-full font-medium">
                    REJECTED
                  </span>
                </div>
                <p className="text-gray-400 text-sm mb-1">
                  <span className="text-cyan-400">PHCorner:</span> {user.phcorner_username || 'N/A'}
                </p>
                <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
                  <span className="text-cyan-400">Password:</span>
                  <span className={showPasswords[user.id] ? 'text-yellow-400' : ''}>
                    {showPasswords[user.id] ? user.password_plain : '••••••••'}
                  </span>
                  <button onClick={() => togglePassword(user.id)}>
                    {showPasswords[user.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-gray-500 text-xs mb-1">
                  Registered: {new Date(user.created_at).toLocaleDateString()}
                </p>
                {user.decline_reason && (
                  <p className="text-red-400 text-sm">
                    Reason: {user.decline_reason}
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <Button
                  size="sm"
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => approveUser(user.id)}
                >
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Approve
                </Button>
              </div>
            </div>
          </div>
        ))}

        {/* Banned Users */}
        {filteredAccounts.filter(u => u.is_banned).map(user => (
          <div key={user.id} className="bg-[#161b22] border border-red-900/50 rounded-lg p-4">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <User className="w-4 h-4 text-gray-400" />
                  <span className="font-semibold">{user.username}</span>
                  <span className="px-2 py-0.5 bg-red-900/50 text-red-400 text-xs rounded-full font-medium">
                    BANNED
                  </span>
                </div>
                <p className="text-gray-400 text-sm mb-1">
                  <span className="text-cyan-400">PHCorner:</span> {user.phcorner_username || 'N/A'}
                </p>
                {user.ban_reason && (
                  <p className="text-red-400 text-sm">
                    Ban reason: {user.ban_reason}
                  </p>
                )}
              </div>
              <Button
                size="sm"
                className="bg-green-600 hover:bg-green-700"
                onClick={() => unbanUser(user.username)}
              >
                <UserCheck className="w-4 h-4 mr-1" />
                Unban
              </Button>
            </div>
          </div>
        ))}

        {filteredPending.length === 0 && filteredAccounts.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            {searchQuery ? 'No users found matching your search.' : 'No users yet.'}
          </div>
        )}
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">Reject Registration</h3>
            <Input
              placeholder="Reason for rejection..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="mb-4 bg-[#0d1117] border-[#30363d] text-white"
            />
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setShowRejectModal(null)}>
                Cancel
              </Button>
              <Button 
                className="bg-red-600 hover:bg-red-700"
                onClick={() => rejectUser(showRejectModal, rejectReason || 'Registration declined by administrator')}
              >
                Reject
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
