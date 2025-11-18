import { NextResponse, NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { chunkText } from '@/lib/utils/text'
import { embedText } from '@/lib/ai/embeddings'
import { summarizeText } from '@/lib/ai/summarize'
import pdfParse from 'pdf-parse'

type UploadPayload = {
  chatbot_id: string
  filename: string
  file_base64?: string
  content?: string
}

export async function POST(req: NextRequest) {
  console.log('[api/documents/upload] POST received')
  const body = (await req.json()) as Partial<UploadPayload>
  const chatbot_id = body.chatbot_id
  const filename = body.filename
  const file_base64 = body.file_base64
  const contentOverride = body.content

  if (!chatbot_id || !filename) {
    return NextResponse.json({ error: 'chatbot_id and filename required' }, { status: 400 })
  }

  const supabase = createServiceClient()
  const { data: chatbot, error: chatbotErr } = await supabase
    .from('chatbots')
    .select('*')
    .eq('id', chatbot_id)
    .single()
  if (chatbotErr) return NextResponse.json({ error: chatbotErr.message }, { status: 500 })
  if (!chatbot) return NextResponse.json({ error: 'invalid chatbot_id' }, { status: 400 })

  let text = ''
  const lower = filename.toLowerCase()
  if (contentOverride) {
    text = contentOverride
  } else if (file_base64) {
    const buf = Buffer.from(file_base64, 'base64')
    if (lower.endsWith('.pdf')) {
      const parsed = await pdfParse(buf)
      text = parsed.text
    } else {
      text = buf.toString('utf8')
    }
  } else {
    return NextResponse.json({ error: 'file_base64 or content required' }, { status: 400 })
  }

  const normalized = (text || '').replace(/\s+/g, ' ').trim()
  const chunkCandidates = chunkText(normalized, 2000, 200)
  const chunks = chunkCandidates.filter(c => c.trim().length >= 20)
  if (chunks.length === 0) return NextResponse.json({ error: 'No extractable text found in file' }, { status: 422 })
  const embeddingModel = 'text-embedding-3-small'
  const summary = await summarizeText(normalized)
  {
    const embedding = await embedText(summary, embeddingModel)
    const { error } = await supabase
      .from('documents')
      .insert({ chatbot_id, client_id: chatbot.client_id, filename: `${filename}#summary`, content: summary, embedding })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }
  for (const c of chunks) {
    const embedding = await embedText(c, embeddingModel)
    const { error } = await supabase
      .from('documents')
      .insert({ chatbot_id, client_id: chatbot.client_id, filename, content: c, embedding })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  console.log('[api/documents/upload] inserted', chunks.length + 1, 'chunks for', filename)
  return NextResponse.json({ ok: true, chunks: chunks.length + 1 })
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json({ ok: true })
}