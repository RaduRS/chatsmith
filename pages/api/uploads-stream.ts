import type { NextApiRequest, NextApiResponse } from 'next'
import { createServiceClient } from '@/lib/supabase/server'
import { chunkText } from '@/lib/utils/text'
import { embedText } from '@/lib/ai/embeddings'
import { summarizeText } from '@/lib/ai/summarize'
import pdfParse from 'pdf-parse'
import { analyzeImageFromBase64 } from '@/lib/ai/vision'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')

  function send(obj: unknown) {
    res.write(`data: ${JSON.stringify(obj)}\n\n`)
  }

  try {
    const { chatbot_id, filename, file_base64, content, image_base64 } = req.body as { chatbot_id?: string; filename?: string; file_base64?: string; content?: string; image_base64?: string }
    if (!chatbot_id || !filename) { send({ error: 'chatbot_id and filename required' }); res.end(); return }

    const supabase = createServiceClient()
    const { data: chatbot, error: chatbotErr } = await supabase
      .from('chatbots')
      .select('*')
      .eq('id', chatbot_id)
      .single()
    if (chatbotErr || !chatbot) { send({ error: chatbotErr?.message || 'invalid chatbot_id' }); res.end(); return }

    let text = ''
    const lower = filename.toLowerCase()
    if (image_base64) {
      text = await analyzeImageFromBase64(image_base64)
    } else if (content) {
      text = content
    } else if (file_base64) {
      const buf = Buffer.from(file_base64, 'base64')
      if (lower.endsWith('.pdf')) {
        const parsed = await pdfParse(buf)
        text = parsed.text
      } else {
        text = buf.toString('utf8')
      }
    } else {
      send({ error: 'image_base64 or file_base64 or content required' }); res.end(); return
    }

    const normalized = (text || '').replace(/\s+/g, ' ').trim()
    const chunkCandidates = chunkText(normalized, 2000, 200)
    const chunks = chunkCandidates.filter(c => c.trim().length >= 20)
    if (chunks.length === 0) { send({ error: 'No extractable text found in file' }); res.end(); return }

    const summary = await summarizeText(normalized)
    const total = chunks.length + 1

    const embeddingModel = 'text-embedding-3-small'
    // Insert summary chunk first
    {
      const embedding = await embedText(summary, 'text-embedding-3-small')
      const { error } = await supabase
        .from('documents')
        .insert({ chatbot_id, client_id: chatbot.client_id, filename: `${filename}#summary`, content: summary, embedding })
      if (error) { send({ error: error.message }); res.end(); return }
      send({ progress: Math.floor((1 / total) * 100) })
    }

    for (let i = 0; i < chunks.length; i++) {
      const c = chunks[i]
      const embedding = await embedText(c, embeddingModel)
      const { error } = await supabase
        .from('documents')
        .insert({ chatbot_id, client_id: chatbot.client_id, filename, content: c, embedding })
      if (error) { send({ error: error.message }); res.end(); return }
      const pct = Math.floor(((i + 2) / total) * 100)
      send({ progress: pct })
    }
    send({ ok: true, chunks: total })
    res.end()
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Upload failed'
    send({ error: msg })
    res.end()
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '20mb',
    },
  },
}