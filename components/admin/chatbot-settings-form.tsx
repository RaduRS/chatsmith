'use client'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { useState } from 'react'
import { Spinner } from '@/components/ui/spinner'

type Settings = {
  greeting?: string
  chatModel?: string
  topK?: number
  minSimilarity?: number
  streaming?: boolean
}

export default function ChatbotSettingsForm({ id, name, settings }: { id: string; name: string; settings?: Settings }) {
  const [loading, setLoading] = useState(false)
  const [streaming, setStreaming] = useState<boolean>(settings?.streaming ?? true)
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const topK = settings?.topK ?? 4
    const minSimilarity = settings?.minSimilarity ?? 0.4
    const payload = {
      name: (form.elements.namedItem('name') as HTMLInputElement).value,
      settings: {
        greeting: (form.elements.namedItem('greeting') as HTMLInputElement).value,
        chatModel: (form.elements.namedItem('chatModel') as HTMLSelectElement).value,
        topK,
        minSimilarity,
        streaming,
      },
    }
    setLoading(true)
    const res = await fetch(`/api/admin/chatbots/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (res.ok) location.reload()
    setLoading(false)
  }
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <Label>Name</Label>
        <Input name="name" defaultValue={name} className="mt-1" />
      </div>
      <div>
        <Label>Greeting</Label>
        <Input name="greeting" defaultValue={settings?.greeting ?? ''} className="mt-1" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Chat model</Label>
          <select name="chatModel" defaultValue={settings?.chatModel ?? 'gpt-4o-mini'} className="mt-1 w-full rounded-md border bg-white p-2">
            <option value="gpt-4o-mini">gpt-4o-mini</option>
            <option value="gpt-4.1-nano">gpt-4.1-nano</option>
          </select>
        </div>
        
        <div className="md:col-span-2">
          <Label>Streaming</Label>
          <div className="flex items-center gap-3 mt-1">
            <Checkbox checked={streaming} onCheckedChange={setStreaming} />
            <span className="text-sm text-gray-600">Enable token streaming</span>
          </div>
        </div>
      </div>
      <div>
        <Button type="submit" disabled={loading} className="flex items-center gap-2">
          {loading && <Spinner />}
          {loading ? 'Saving…' : 'Save'}
        </Button>
      </div>
    </form>
  )
}