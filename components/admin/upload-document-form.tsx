'use client'
import { useRef, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'

export default function UploadDocumentForm({ chatbotId }: { chatbotId: string }) {
  const [selected, setSelected] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [errorOpen, setErrorOpen] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [progress, setProgress] = useState(0)
  const [phase, setPhase] = useState<'idle' | 'reading' | 'uploading'>('idle')
  const readerRef = useRef<FileReader | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const fileInput = form.elements.namedItem('file') as HTMLInputElement
    const file = selected || (fileInput.files ? fileInput.files[0] : null)
    if (!file) return
    const filename = file.name
    const lower = filename.toLowerCase()
    setUploading(true)
    setProgress(0)
    const payload: { chatbot_id: string; filename: string; file_base64?: string; content?: string; image_base64?: string } = {
      chatbot_id: chatbotId,
      filename,
    }
    if (lower.endsWith('.pdf')) {
      setPhase('reading')
      const reader = new FileReader()
      readerRef.current = reader
      reader.onprogress = e => {
        if (e.lengthComputable) setProgress(Math.min(45, Math.floor((e.loaded / e.total) * 45)))
      }
      reader.onload = () => {
        const result = String(reader.result || '')
        const base64 = result.includes(',') ? result.split(',')[1] : result
        payload.file_base64 = base64
        startUpload(payload)
      }
      reader.onerror = () => {
        setErrorMsg('Failed to read file')
        setErrorOpen(true)
        setUploading(false)
        setPhase('idle')
      }
      reader.readAsDataURL(file)
    } else if (lower.endsWith('.png') || lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.webp')) {
      setPhase('reading')
      const reader = new FileReader()
      readerRef.current = reader
      reader.onprogress = e => {
        if (e.lengthComputable) setProgress(Math.min(45, Math.floor((e.loaded / e.total) * 45)))
      }
      reader.onload = () => {
        const result = String(reader.result || '')
        const base64 = result.includes(',') ? result.split(',')[1] : result
        payload.image_base64 = base64
        startUpload(payload)
      }
      reader.onerror = () => {
        setErrorMsg('Failed to read image')
        setErrorOpen(true)
        setUploading(false)
        setPhase('idle')
      }
      reader.readAsDataURL(file)
    } else {
      setPhase('reading')
      const reader = new FileReader()
      readerRef.current = reader
      reader.onprogress = e => {
        if (e.lengthComputable) setProgress(Math.min(45, Math.floor((e.loaded / e.total) * 45)))
      }
      reader.onload = () => {
        payload.content = String(reader.result || '')
        startUpload(payload)
      }
      reader.onerror = () => {
        setErrorMsg('Failed to read file')
        setErrorOpen(true)
        setUploading(false)
        setPhase('idle')
      }
      reader.readAsText(file)
    }
  }

  async function startUpload(payload: { chatbot_id: string; filename: string; file_base64?: string; content?: string }) {
    setPhase('uploading')
    const ac = new AbortController()
    abortRef.current = ac
    try {
      const res = await fetch('/api/uploads-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: ac.signal,
      })
      const reader = res.body?.getReader()
      const decoder = new TextDecoder()
      // maintain baseline from reading (up to 45%)
      setProgress(p => Math.max(p, 45))
      if (!reader) {
        setUploading(false)
        setPhase('idle')
        return
      }
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        const parts = chunk.split('\n\n').filter(Boolean)
        for (const p of parts) {
          if (!p.startsWith('data:')) continue
          const json = p.slice(5).trim()
          try {
            const msg = JSON.parse(json) as { progress?: number; ok?: boolean; error?: string }
            if (typeof msg.progress === 'number') {
              const mapped = Math.min(100, 45 + Math.floor(msg.progress * 0.55))
              setProgress(mapped)
            }
            if (msg.error) {
              setErrorMsg(msg.error)
              setErrorOpen(true)
            }
          } catch {}
        }
      }
      setProgress(100)
      setUploading(false)
      setPhase('idle')
      setTimeout(() => location.reload(), 300)
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        setUploading(false)
        setPhase('idle')
        setProgress(0)
      } else {
        setErrorMsg('Upload failed')
        setErrorOpen(true)
        setUploading(false)
        setPhase('idle')
      }
    }
  }

  function cancel() {
    if (phase === 'reading' && readerRef.current) readerRef.current.abort()
    if (phase === 'uploading' && abortRef.current) abortRef.current.abort()
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div
        className="rounded-xl border-2 border-dashed border-gray-300 p-6 text-center hover:border-gray-400"
        onDragOver={e => e.preventDefault()}
        onDrop={e => {
          e.preventDefault()
          const f = e.dataTransfer.files?.[0]
          if (f) setSelected(f)
        }}
      >
        <div className="text-sm text-gray-600">Drag & drop a .txt or .pdf, or browse</div>
        <div className="mt-3 flex items-center justify-center">
          <Input name="file" type="file" accept=".txt,application/pdf,image/*" onChange={e => setSelected(e.target.files?.[0] ?? null)} />
        </div>
        {selected && <div className="mt-2 text-xs text-gray-500">Selected: {selected.name}</div>}
      </div>
      <div>
        <div className="flex items-center gap-3">
          <Button type="submit" className="flex-1" disabled={uploading}>{uploading ? 'Uploading…' : 'Upload'}</Button>
          {uploading && (
            <Button type="button" variant="secondary" onClick={cancel}>Cancel</Button>
          )}
        </div>
        {uploading && (
          <div className="mt-3 space-y-2">
            <div className="flex items-center justify-between text-xs text-gray-600">
              <div>{phase === 'reading' ? 'Reading file…' : 'Uploading…'}</div>
              <div>{Math.floor(progress)}%</div>
            </div>
            <Progress value={progress} />
          </div>
        )}
      </div>
      <Dialog open={errorOpen} onOpenChange={setErrorOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload failed</DialogTitle>
            <DialogDescription>{errorMsg}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose onClick={() => setErrorOpen(false)} />
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </form>
  )
}