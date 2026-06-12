import { useState } from 'react'
import { login } from '../db/index.js'

export default function LoginPage({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const user = await login(username, password)
      onLogin(user)
    } catch {
      setError('Invalid username or password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="bg-gray-800 rounded-xl p-8 w-full max-w-sm shadow-2xl">
        <div className="flex justify-center mb-6">
          <img src="/logo.png" alt="Omphalos" className="h-16 w-16 object-contain" />
        </div>
        <h1 className="text-2xl font-bold text-white text-center mb-6">Omphalos</h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Username</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
              autoFocus
              className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold rounded-lg py-2 transition-colors"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
