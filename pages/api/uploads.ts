import type { NextApiRequest, NextApiResponse } from 'next'
import { createServiceClient } from '@/lib/supabase/server'
import { chunkText } from '@/lib/utils/text'
import { embedText } from '@/lib/ai/embeddings'
import { summarizeText } from '@/lib/ai/summarize'
import pdfParse from 'pdf-parse'
import { z } from 'zod'

const UploadPayloadSchema = z.object({
  chatbot_id: z.string().uuid(),
  filename: z.string().min(1),
  file_base64: z.string().optional(),
  content: z.string().optional(),
})

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }
  try {
    const parse = UploadPayloadSchema.safeParse(req.body)
    if (!parse.success) return res.status(400).json({ error: 'invalid payload' })
    const { chatbot_id, filename, file_base64, content } = parse.data

    const supabase = createServiceClient()
    const { data: chatbot, error: chatbotErr } = await supabase
      .from('chatbots')
      .select('*')
      .eq('id', chatbot_id)
      .single()
    if (chatbotErr) return res.status(500).json({ error: chatbotErr.message })
    if (!chatbot) return res.status(400).json({ error: 'invalid chatbot_id' })

    let text = ''
    const lower = filename.toLowerCase()
    if (content) {
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
      return res.status(400).json({ error: 'file_base64 or content required' })
    }

    const normalized = (text || '').replace(/\s+/g, ' ').trim()
    const chunkCandidates = chunkText(normalized, 2000, 200)
    const chunks = chunkCandidates.filter(c => c.trim().length >= 20)
    if (chunks.length === 0) return res.status(422).json({ error: 'No extractable text found in file' })
    const embeddingModel = 'text-embedding-3-small'
    const summary = await summarizeText(normalized)
    {
      const embedding = await embedText(summary, embeddingModel)
      const { error } = await supabase
        .from('documents')
        .insert({ chatbot_id, client_id: chatbot.client_id, filename: `${filename}#summary`, content: summary, embedding })
      if (error) return res.status(500).json({ error: error.message })
    }
    for (const c of chunks) {
      const embedding = await embedText(c, embeddingModel)
      const { error } = await supabase
        .from('documents')
        .insert({ chatbot_id, client_id: chatbot.client_id, filename, content: c, embedding })
      if (error) return res.status(500).json({ error: error.message })
    }
    return res.status(200).json({ ok: true, chunks: chunks.length + 1 })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Upload failed'
    return res.status(500).json({ error: msg })
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '20mb',
    },
  },
}