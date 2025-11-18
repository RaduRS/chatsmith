import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function analyzeImageFromBase64(imageBase64: string): Promise<string> {
  const res = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: "Extract any readable text verbatim. Then, provide a concise 2–3 sentence description of what the image depicts. Return plain text only (no markup)." },
          { type: "image_url", image_url: { url: `data:image/*;base64,${imageBase64}` } },
        ],
      },
    ],
  });
  return res.choices?.[0]?.message?.content ?? "";
}