import { NextResponse, NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { chunkText } from '@/lib/utils/text'
import { embedText } from '@/lib/ai/embeddings'
import { summarizeText } from '@/lib/ai/summarize'
import pdfParse from 'pdf-parse'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  console.log('[api/admin/chatbots/:id/documents] POST', params.id)
  const fd = await req.formData()
  const file = fd.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'file missing' }, { status: 400 })

  const supabase = createServiceClient()
  const { data: chatbot } = await supabase.from('chatbots').select('*').eq('id', params.id).single()
  if (!chatbot) return NextResponse.json({ error: 'chatbot not found' }, { status: 404 })

  const name = file.name
  const buf = Buffer.from(await file.arrayBuffer())
  let text = ''
  if (name.toLowerCase().endsWith('.pdf')) {
    const parsed = await pdfParse(buf)
    text = parsed.text
  } else {
    text = buf.toString('utf8')
  }

  const chunks = chunkText(text, 2000, 200)
  const embeddingModel = 'text-embedding-3-small'
  const summary = await summarizeText(text)
  {
    const embedding = await embedText(summary, embeddingModel)
    const { error } = await supabase
      .from('documents')
      .insert({ chatbot_id: params.id, client_id: chatbot.client_id, filename: `${name}#summary`, content: summary, embedding })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }
  for (const content of chunks) {
    const embedding = await embedText(content, embeddingModel)
    const { error } = await supabase
      .from('documents')
      .insert({ chatbot_id: params.id, client_id: chatbot.client_id, filename: name, content, embedding })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true, chunks: chunks.length })
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(_: Request, { params }: { params: { id: string } }) {
  console.log('[api/admin/chatbots/:id/documents] GET', params.id)
  return NextResponse.json({ ok: true })
}