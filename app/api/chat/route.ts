import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { embedText } from "@/lib/ai/embeddings";
import OpenAI from "openai";

type ChatHistoryItem = { role: "user" | "assistant"; content: string };
type ChatRequest = {
  chatbot_id: string;
  message: string;
  history?: ChatHistoryItem[];
};

function toMessageParam(
  h: ChatHistoryItem
): OpenAI.Chat.Completions.ChatCompletionMessageParam {
  const role: "user" | "assistant" =
    h.role === "assistant" ? "assistant" : "user";
  return { role, content: h.content };
}

function systemMsg(
  content: string
): OpenAI.Chat.Completions.ChatCompletionMessageParam {
  return { role: "system", content };
}

function userMsg(
  content: string
): OpenAI.Chat.Completions.ChatCompletionMessageParam {
  return { role: "user", content };
}

export async function POST(req: Request) {
  const body = (await req.json()) as ChatRequest;
  const { chatbot_id, message, history } = body;
  if (!chatbot_id || !message)
    return NextResponse.json(
      { error: "chatbot_id and message required" },
      { status: 400 }
    );

  const supabase = createServiceClient();
  const { data: chatbot, error: cbErr } = await supabase
    .from("chatbots")
    .select("*")
    .eq("id", chatbot_id)
    .single();
  if (cbErr || !chatbot)
    return NextResponse.json({ error: "chatbot not found" }, { status: 404 });

  const lowerMsg = message.toLowerCase().trim();
  const overviewIntent =
    /(summary|overview|describe|description|minimal summary|what are they about|what.*about)/i.test(
      lowerMsg
    );
  const broadIntent = /(info|information|about|overview)/i.test(lowerMsg)

  const { data: docList } = await supabase
    .from("documents")
    .select("filename")
    .eq("chatbot_id", chatbot_id);
  const docNames = (docList ?? []).map(
    (d) => (d as { filename: string }).filename
  );
  const uniqueDocNames = Array.from(new Set(docNames));

  const s = chatbot.settings || {};
  const embeddingModel: string = "text-embedding-3-small";
  const topK: number = 10;
  const minSim: number = 0.3;
  const chatModel: string =
    s.chatModel ?? process.env.OPENAI_CHAT_MODEL ?? "gpt-4o-mini";
  const streaming: boolean =
    typeof s.streaming === "boolean" ? s.streaming : true;

  const queryEmbedding = await embedText(message, embeddingModel);
  const { data: matches, error: mErr } = await supabase.rpc("match_documents", {
    query_embedding: queryEmbedding,
    match_threshold: minSim,
    match_count: topK,
    filter_client_id: chatbot.client_id,
  });
  if (mErr) return NextResponse.json({ error: mErr.message }, { status: 500 });

  const matchList = (matches ?? []) as Array<{
    id: string;
    content: string;
    similarity: number;
  }>;
  let context = matchList
    .map((m) => (m.content || "").trim())
    .filter((c) => c.length > 0)
    .join("\n\n")
    .slice(0, 8000);

  if (!context || overviewIntent) {
    const { data: docs } = await supabase
      .from("documents")
      .select("content")
      .eq("chatbot_id", chatbot_id)
      .limit(50);
    const docContext = (docs ?? [])
      .map((d) => (d as { content: string }).content?.trim() || "")
      .filter((c) => c.length > 0)
      .join("\n\n")
      .slice(0, 8000);
    if (docContext) context = docContext;
  }
  if (broadIntent && context) context = context.slice(0, 2000)

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const model = chatModel;
  const limitedHistory: ChatHistoryItem[] = Array.isArray(history)
    ? history.slice(-8)
    : [];
  const hasDocs = uniqueDocNames.length > 0;
  const greetIntent = /^(hi|hello|hey|sup|howdy)([!.\s]|$)/i.test(lowerMsg);
  const offTopicIntent = /(\bcapital\b|\bweather\b|\bforecast\b|\btemperature\b|\bpopulation\b|\bpresident\b|\bprime\s+minister\b|\btime\b|\bstock\b|\bexchange\b|\bsports\b|\bscore\b)/i.test(lowerMsg);
  if (greetIntent && !overviewIntent) {
    const greeting = hasDocs
      ? `Hi, I'm ${chatbot.name}. I can help with questions about your uploaded documents.`
      : `Hi, I'm ${chatbot.name}. Upload a document or paste text and I can help analyze it.`;
    const conversationMessages = [
      ...limitedHistory,
      { role: "user", content: message },
      { role: "assistant", content: greeting },
    ];
    await supabase
      .from("conversations")
      .insert({ chatbot_id, client_id: chatbot.client_id, messages: conversationMessages });
    const readable = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(greeting));
        controller.close();
      },
    });
    return new Response(readable, {
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-cache" },
    });
  }
  if (offTopicIntent) {
    const reply = hasDocs
      ? `I focus on your uploaded documents. Please ask about topics covered in those files.`
      : `I focus on uploaded documents. Upload a file or paste text and I can help with that content.`;
    const conversationMessages = [
      ...limitedHistory,
      { role: "user", content: message },
      { role: "assistant", content: reply },
    ];
    await supabase
      .from("conversations")
      .insert({ chatbot_id, client_id: chatbot.client_id, messages: conversationMessages });
    const readable = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(reply));
        controller.close();
      },
    });
    return new Response(readable, {
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-cache" },
    });
  }
  const guidance = hasDocs
    ? "You are a friendly assistant. Reference uploaded documents when relevant using the provided context. If context is insufficient, say so and ask for a more specific question."
    : "You are a friendly assistant. There are currently no documents uploaded for this assistant. Do not claim you can see documents. Offer general help, and suggest uploading documents or pasting text to analyze.";
  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    systemMsg(guidance),
    systemMsg('Respond in clean Markdown. Use ### headings and bullet lists; keep paragraphs short.'),
    ...(broadIntent ? [systemMsg('The user asked broadly. Provide a brief overview (max 4 bullets) and then ask a clarifying question offering options like: Summary, Key figures, Specific term, Action steps. Do not dump long content.')] : []),
    ...limitedHistory.map(toMessageParam),
    ...(hasDocs
      ? [
          userMsg(
            `Documents available (${uniqueDocNames.length}): ${uniqueDocNames
              .slice(0, 8)
              .join(", ")}`
          ),
        ]
      : []),
    ...(context ? [userMsg(`Context:\n${context}`)] : []),
    userMsg(message),
  ];
  const supportsCustomTemperature = !model.includes("nano");
  const baseParams: {
    model: string;
    messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[];
    temperature?: number;
  } = { model, messages };
  if (supportsCustomTemperature) baseParams.temperature = 0.5;
  if (streaming) {
    const stream = await client.chat.completions.create({
      ...baseParams,
      stream: true,
    });
    let fullAnswer = "";
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const part of stream) {
            const delta = part.choices?.[0]?.delta?.content ?? "";
            if (delta) {
              fullAnswer += delta;
              controller.enqueue(new TextEncoder().encode(delta));
            }
          }
        } finally {
          const conversationMessages = [
            ...limitedHistory,
            { role: "user", content: message },
            { role: "assistant", content: fullAnswer },
          ];
          await supabase
            .from("conversations")
            .insert({
              chatbot_id,
              client_id: chatbot.client_id,
              messages: conversationMessages,
            });
          controller.close();
        }
      },
    });
    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
      },
    });
  } else {
    const completion = await client.chat.completions.create(baseParams);
    const answer = completion.choices?.[0]?.message?.content ?? "";
    const conversationMessages = [
      ...limitedHistory,
      { role: "user", content: message },
      { role: "assistant", content: answer },
    ];
    await supabase
      .from("conversations")
      .insert({
        chatbot_id,
        client_id: chatbot.client_id,
        messages: conversationMessages,
      });
    return new Response(answer, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
      },
    });
  }
}

export const runtime = "nodejs";
