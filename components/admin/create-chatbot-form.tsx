'use client'
import { useState } from 'react'
import type { Client } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'

export default function CreateChatbotForm({ clients }: { clients: Client[] }) {
  const [clientId, setClientId] = useState(clients[0]?.id ?? '')
  const [name, setName] = useState('My Chatbot')
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const res = await fetch('/api/admin/chatbots', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: clientId, name }),
    })
    if (res.ok) location.reload()
    setLoading(false)
  }

  return (
    <form onSubmit={onSubmit} className="flex items-end gap-2">
      <div className="flex-1">
        <label className="block text-sm">Client</label>
        <select value={clientId} onChange={e => setClientId(e.target.value)} className="mt-1 w-full rounded border px-3 py-2" required>
          {clients.map(c => (
            <option key={c.id} value={c.id}>{c.name} ({c.email})</option>
          ))}
        </select>
      </div>
      <div className="flex-1">
        <label className="block text-sm">Name</label>
        <input value={name} onChange={e => setName(e.target.value)} className="mt-1 w-full rounded border px-3 py-2" required />
      </div>
      <Button type="submit" disabled={loading} className="flex items-center gap-2">
        {loading && <Spinner />}
        {loading ? 'Creating…' : 'Create'}
      </Button>
    </form>
  )
}