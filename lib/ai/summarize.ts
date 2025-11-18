import OpenAI from 'openai'

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function summarizeText(text: string): Promise<string> {
  try {
    const res = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.2,
      messages: [
        { role: 'system', content: 'Summarize clearly in Markdown with ### Summary and up to 6 bullet points. Keep it grounded in the input and avoid speculation.' },
        { role: 'user', content: text.slice(0, 10000) },
      ],
    })
    const out = res.choices?.[0]?.message?.content?.trim()
    if (out && out.length > 0) return out
  } catch {}
  const trimmed = text.replace(/\s+/g, ' ').slice(0, 600)
  return `### Summary\n- ${trimmed}`
}