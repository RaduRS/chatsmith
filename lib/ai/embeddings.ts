import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function embedText(text: string, _model?: string): Promise<number[]> {
  const input = text.length > 8192 ? text.slice(0, 8192) : text;
  const res = await client.embeddings.create({ model: "text-embedding-3-small", input });
  return res.data[0].embedding as number[];
}
