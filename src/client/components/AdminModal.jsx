import { useState, useEffect } from 'react'
import { adminApi } from '../db/index.js'
import { useApp } from '../context/AppContext.jsx'

export default function AdminModal({ onClose }) {
  const { state } = useApp()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(null)

  const [newUsername, setNewUsername] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newRole, setNewRole] = useState('Player')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')

  useEffect(() => {
    adminApi.getUsers()
      .then(setUsers)
      .catch(() => setError('Failed to load users'))
      .finally(() => setLoading(false))
  }, [])

  async function handleCreate(e) {
    e.preventDefault()
    setCreateError('')
    setCreating(true)
    try {
      const user = await adminApi.createUser(newUsername, newPassword, newRole)
      setUsers(prev => [...prev, user])
      setNewUsername('')
      setNewPassword('')
      setNewRole('Player')
    } catch {
      setCreateError('Failed to create user — username may already exist')
    } finally {
      setCreating(false)
    }
  }

  async function handleDelete(id) {
    try {
      await adminApi.deleteUser(id)
      setUsers(prev => prev.filter(u => u.id !== id))
    } catch {
      setError('Failed to delete user')
    } finally {
      setConfirmDelete(null)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={onClose}>
      <div
        className="bg-[#2d2d2d] rounded-lg w-[520px] p-6 fade-in max-h-[80vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-[#d4a574]">User Management</h2>
          <button onClick={onClose} className="text-[#999999] hover:text-[#f0f0f0] text-2xl leading-none">×</button>
        </div>

        {/* User list */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {loading && <p className="text-[#999999] text-sm">Loading…</p>}
          {error && <p className="text-red-400 text-sm">{error}</p>}
          {!loading && users.length === 0 && <p className="text-[#999999] text-sm">No users found.</p>}
          {!loading && users.map(u => (
            <div
              key={u.id}
              className="flex items-center justify-between py-2.5 border-b border-[#3d3d3d] last:border-0"
            >
              <div>
                <span className="text-[#f0f0f0] text-sm font-medium">{u.username}</span>
                <span className={`ml-2 text-xs px-1.5 py-0.5 rounded ${
                  u.role === 'Admin'
                    ? 'bg-[#d4a574]/20 text-[#d4a574]'
                    : 'bg-[#3d3d3d] text-[#999999]'
                }`}>{u.role}</span>
              </div>
              {u.id !== state.user?.id && (
                confirmDelete === u.id ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#999999]">Delete?</span>
                    <button
                      onClick={() => handleDelete(u.id)}
                      className="text-xs px-2 py-1 bg-[#b24545] hover:bg-[#922b2b] text-white rounded transition-colors"
                    >
                      Yes
                    </button>
                    <button
                      onClick={() => setConfirmDelete(null)}
                      className="text-xs px-2 py-1 bg-[#3d3d3d] hover:bg-[#4d4d4d] text-[#f0f0f0] rounded transition-colors"
                    >
                      No
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDelete(u.id)}
                    className="text-xs px-2 py-1 bg-[#3d3d3d] hover:bg-[#b24545] text-[#999999] hover:text-white rounded transition-colors"
                  >
                    Delete
                  </button>
                )
              )}
            </div>
          ))}
        </div>

        {/* Create user form */}
        <div className="border-t border-[#3d3d3d] pt-4 mt-4">
          <h3 className="text-sm font-medium text-[#f0f0f0] mb-3">Add User</h3>
          <form onSubmit={handleCreate} className="flex flex-col gap-2">
            <div className="flex gap-2">
              <input
                className="flex-1 bg-[#1a1a1a] border border-[#3d3d3d] rounded px-3 py-1.5 text-[#f0f0f0] text-sm focus:outline-none focus:border-[#d4a574]"
                placeholder="Username"
                value={newUsername}
                onChange={e => setNewUsername(e.target.value)}
                required
              />
              <input
                className="flex-1 bg-[#1a1a1a] border border-[#3d3d3d] rounded px-3 py-1.5 text-[#f0f0f0] text-sm focus:outline-none focus:border-[#d4a574]"
                placeholder="Password"
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                required
              />
              <select
                className="bg-[#1a1a1a] border border-[#3d3d3d] rounded px-3 py-1.5 text-[#f0f0f0] text-sm focus:outline-none focus:border-[#d4a574]"
                value={newRole}
                onChange={e => setNewRole(e.target.value)}
              >
                <option value="Player">Player</option>
                <option value="Admin">Admin</option>
              </select>
            </div>
            {createError && <p className="text-red-400 text-xs">{createError}</p>}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={creating}
                className="px-4 py-1.5 bg-[#d4a574] hover:bg-[#c49464] disabled:opacity-50 text-[#1a1a1a] font-medium text-sm rounded transition-colors"
              >
                {creating ? 'Creating…' : 'Add User'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
