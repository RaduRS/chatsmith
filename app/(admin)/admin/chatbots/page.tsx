import Link from "next/link";
import { Card } from "@/components/ui/card";
import { createServiceClient } from "@/lib/supabase/server";
import type { Client } from "@/lib/types";
import CreateChatbotForm from "@/components/admin/create-chatbot-form";

export default async function ChatbotsPage() {
  const supabase = createServiceClient();
  const { data: chatbotsRaw } = await supabase
    .from("chatbots")
    .select("id,name,client_id,created_at,clients(name,email)")
    .order("created_at", { ascending: false });

  type ChatbotWithClient = {
    id: string;
    name: string;
    client_id: string;
    created_at: string;
    clients?: { name?: string; email?: string }[];
  };
  const chatbots: ChatbotWithClient[] = (chatbotsRaw ?? []) as ChatbotWithClient[];

  const counts = await Promise.all(
    chatbots.map(async (b: ChatbotWithClient) => {
      const { count } = await supabase
        .from("documents")
        .select("*", { count: "exact", head: true })
        .eq("chatbot_id", b.id);
      return count ?? 0;
    })
  );

  const { data: clients } = await supabase.from("clients").select("*").order("name");
  const clientMap = new Map((clients ?? []).map((c: Client) => [c.id, c.name]));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Chatbots</h1>
          <p className="text-sm text-gray-600">Create and manage assistants per client</p>
        </div>
      </div>
      <Card className="p-6">
        <CreateChatbotForm clients={(clients ?? []) as Client[]} />
      </Card>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {chatbots.map((b: ChatbotWithClient, i: number) => (
          <Link key={b.id} href={`/admin/chatbots/${b.id}`} className="block">
            <Card className="p-6 hover:shadow-lg transition-shadow h-full">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-600">Chatbot</div>
                  <div className="text-lg font-semibold">{b.name}</div>
                </div>
                <div className="text-sm text-gray-500">{new Date(b.created_at).toLocaleDateString()}</div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
                <div>
                  <div className="text-gray-600">Client</div>
                  <div className="font-medium">{clientMap.get(b.client_id) ?? b.clients?.[0]?.name ?? 'Unknown'}</div>
                </div>
                <div>
                  <div className="text-gray-600">Documents</div>
                  <div className="font-medium">{counts[i] ?? 0}</div>
                </div>
                <div>
                  <div className="text-gray-600">ID</div>
                  <div className="font-mono text-xs text-gray-500">{b.id.slice(0, 8)}…</div>
                </div>
              </div>
            </Card>
          </Link>
        ))}
        {(!chatbots || chatbots.length === 0) && (
          <Card className="p-6">
            <div className="text-sm text-gray-500">No chatbots yet</div>
          </Card>
        )}
      </div>
    </div>
  );
}
export const dynamic = 'force-dynamic'
export const revalidate = 0
