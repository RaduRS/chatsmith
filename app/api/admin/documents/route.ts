import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { chunkText } from '@/lib/utils/text'
import { embedText } from '@/lib/ai/embeddings'
import { summarizeText } from '@/lib/ai/summarize'
import pdfParse from 'pdf-parse'

export async function POST(req: Request) {
  const fd = await req.formData()
  const file = fd.get('file') as File | null
  const chatbot_id = fd.get('chatbot_id') as string | null
  if (!file || !chatbot_id) return NextResponse.json({ error: 'file and chatbot_id required' }, { status: 400 })

  const supabase = createServiceClient()
  const { data: chatbot } = await supabase.from('chatbots').select('*').eq('id', chatbot_id).single()
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
      .insert({ chatbot_id, client_id: chatbot.client_id, filename: `${name}#summary`, content: summary, embedding })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }
  for (const content of chunks) {
    const embedding = await embedText(content, embeddingModel)
    const { error } = await supabase
      .from('documents')
      .insert({ chatbot_id, client_id: chatbot.client_id, filename: name, content, embedding })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true, chunks: chunks.length })
}

export async function DELETE(req: Request) {
  const supabase = createServiceClient()
  const { ids } = await req.json() as { ids?: string[] }
  if (!ids || ids.length === 0) return NextResponse.json({ error: 'ids required' }, { status: 400 })
  const { error } = await supabase.from('documents').delete().in('id', ids)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, deleted: ids.length })
}

export const runtime = 'nodejs'