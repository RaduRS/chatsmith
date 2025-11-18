'use client'

import { useEffect, useRef, useState } from 'react'
import { TypingDots } from '@/components/ui/typing-dots'
import { Markdown } from '@/components/ui/markdown'

type ChatItem = { role: 'user' | 'assistant'; content: string }

export default function ChatBox({ chatbotId, botName }: { chatbotId: string; botName?: string }) {
  const [messages, setMessages] = useState<ChatItem[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sources, setSources] = useState<{ id: string; filename?: string }[]>([])
  const listRef = useRef<HTMLDivElement | null>(null)
  const [autoScroll, setAutoScroll] = useState(true)
  function scrollToBottom() {
    const el = listRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }

  useEffect(() => {
    const el = listRef.current
    if (!el) return
    const node = el as HTMLDivElement
    function onScroll() {
      const nearBottom = node.scrollTop + node.clientHeight >= node.scrollHeight - 40
      setAutoScroll(nearBottom)
    }
    node.addEventListener('scroll', onScroll)
    return () => {
      node.removeEventListener('scroll', onScroll)
    }
  }, [])

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!input.trim()) return
    const userMsg: ChatItem = { role: 'user', content: input }
    setMessages(prev => [...prev, userMsg, { role: 'assistant', content: '' }])
    setLoading(true)
    setInput('')
    if (autoScroll) setTimeout(scrollToBottom, 0)
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chatbot_id: chatbotId, message: userMsg.content, history: messages.slice(-8) })
    })
    const reader = res.body?.getReader()
    const decoder = new TextDecoder()
    let assistantText = ''
    if (reader) {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        assistantText += chunk
        setMessages(prev => {
          const copy = [...prev]
          copy[copy.length - 1] = { role: 'assistant', content: assistantText }
          return copy
        })
        if (autoScroll) scrollToBottom()
      }
    }
    setSources([])
    setLoading(false)
  }

  return (
    <div className="space-y-4">
      <div ref={listRef} className="rounded-xl border bg-white p-4 space-y-3 max-h-80 overflow-auto">
        {messages.map((m, i) => (
          <div key={i} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
            <div className={m.role === 'user' ? 'max-w-[80%] rounded-2xl bg-black text-white px-3 py-2' : 'max-w-[80%] rounded-2xl bg-gray-100 text-gray-900 px-3 py-2'}>
              <div className="text-xs opacity-70 mb-1">{m.role === 'user' ? 'You' : botName || 'Assistant'}</div>
              {m.role === 'assistant' && !m.content && loading && i === messages.length - 1 ? (
                <div className="py-1"><TypingDots /></div>
              ) : (
                m.role === 'assistant' ? <Markdown text={m.content} /> : <div>{m.content}</div>
              )}
            </div>
          </div>
        ))}
        {messages.length === 0 && <div className="text-sm text-gray-500">Ask a question about the uploaded documents.</div>}
      </div>
      {sources.length > 0 && (
        <div className="text-xs text-gray-500">
          Sources: {sources.map(s => s.filename ?? s.id).join(', ')}
        </div>
      )}
      <form onSubmit={onSubmit} className="flex gap-2">
        <input value={input} onChange={e => setInput(e.target.value)} className="flex-1 rounded border px-3 py-2" placeholder="Type your question..." />
        <button className="rounded bg-black px-4 py-2 text-white" disabled={loading}>{loading ? 'Sending…' : 'Send'}</button>
      </form>
    </div>
  )
}