'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { useState } from 'react'
import { Spinner } from '@/components/ui/spinner'

export default function CreateClientForm() {
  const [loading, setLoading] = useState(false)
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const data = {
      name: (form.elements.namedItem('name') as HTMLInputElement).value,
      email: (form.elements.namedItem('email') as HTMLInputElement).value,
    }
    setLoading(true)
    const res = await fetch('/api/admin/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (res.ok) location.reload()
    setLoading(false)
  }
  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
      <div>
        <Label>Name</Label>
        <Input name="name" className="mt-1" required />
      </div>
      <div>
        <Label>Email</Label>
        <Input name="email" type="email" className="mt-1" required />
      </div>
      <div>
        <Button type="submit" className="w-full flex items-center justify-center gap-2" disabled={loading}>
          {loading && <Spinner />}
          {loading ? 'Creating…' : 'Create'}
        </Button>
      </div>
    </form>
  )
}