import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { chunkText } from '@/lib/utils/text'
import { embedText } from '@/lib/ai/embeddings'

type Payload = { chatbot_id: string; filename: string; content: string }

export async function POST(req: Request) {
  const body = (await req.json()) as Partial<Payload>
  const { chatbot_id, filename, content } = body
  if (!chatbot_id || !filename || !content) {
    return NextResponse.json({ error: 'chatbot_id, filename and content required' }, { status: 400 })
  }
  const supabase = createServiceClient()
  const { data: chatbot, error: chatbotErr } = await supabase.from('chatbots').select('*').eq('id', chatbot_id).single()
  if (chatbotErr) return NextResponse.json({ error: chatbotErr.message }, { status: 500 })
  if (!chatbot) return NextResponse.json({ error: 'invalid chatbot_id' }, { status: 400 })

  const normalized = (content || '').replace(/\s+/g, ' ').trim()
  const chunkCandidates = chunkText(normalized, 1500, 200)
  const chunks = chunkCandidates.filter(c => c.trim().length >= 20)
  if (chunks.length === 0) return NextResponse.json({ error: 'No extractable text provided' }, { status: 422 })
  for (const c of chunks) {
    const embedding = await embedText(c)
    const { error } = await supabase
      .from('documents')
      .insert({ chatbot_id, client_id: chatbot.client_id, filename, content: c, embedding })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true, chunks: chunks.length })
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'