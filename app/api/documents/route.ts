import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { chunkText } from '@/lib/utils/text'
import { embedText } from '@/lib/ai/embeddings'
import pdfParse from 'pdf-parse'

export async function POST(req: Request) {
  console.log('[api/documents] POST received')
  const fd = await req.formData()
  const fileEntry = fd.get('file')
  const idEntry = fd.get('chatbot_id')
  const file = fileEntry instanceof File ? fileEntry : null
  const chatbot_id = typeof idEntry === 'string' ? idEntry : null
  if (!file || !chatbot_id) return NextResponse.json({ error: 'file and chatbot_id required' }, { status: 400 })

  const supabase = createServiceClient()
  const { data: chatbot, error: chatbotErr } = await supabase.from('chatbots').select('*').eq('id', chatbot_id).single()
  if (chatbotErr) return NextResponse.json({ error: chatbotErr.message }, { status: 500 })
  if (!chatbot) return NextResponse.json({ error: 'invalid chatbot_id' }, { status: 400 })

  const name = file.name
  console.log('[api/documents] processing file', name, 'chatbot', chatbot_id)
  const buf = Buffer.from(await file.arrayBuffer())
  let text = ''
  if (name.toLowerCase().endsWith('.pdf')) {
    const parsed = await pdfParse(buf)
    text = parsed.text
  } else {
    text = buf.toString('utf8')
  }

  const chunks = chunkText(text, 1500, 200)
  console.log('[api/documents] chunk count', chunks.length)
  for (const content of chunks) {
    const embedding = await embedText(content)
    const { error } = await supabase
      .from('documents')
      .insert({ chatbot_id, client_id: chatbot.client_id, filename: name, content, embedding })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true, chunks: chunks.length })
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  console.log('[api/documents] GET health')
  return NextResponse.json({ ok: true })
}