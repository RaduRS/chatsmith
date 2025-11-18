'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    if (res.ok) {
      router.push('/admin')
    } else {
      try {
        const data = await res.json()
        setError(data.error || 'Login failed')
      } catch {
        const text = await res.text()
        setError(text || 'Login failed')
      }
    }
  }

  return (
    <div className="flex items-center justify-center h-screen">
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4 rounded border bg-white p-6">
        <h1 className="text-xl font-semibold">Admin Login</h1>
        <div>
          <label className="block text-sm">Email</label>
          <input className="mt-1 w-full rounded border px-3 py-2" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
        </div>
        <div>
          <label className="block text-sm">Password</label>
          <input className="mt-1 w-full rounded border px-3 py-2" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button className="w-full rounded bg-black px-4 py-2 text-white">Login</button>
      </form>
    </div>
  )
}