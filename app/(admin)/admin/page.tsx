import Link from "next/link";
import { Card, CardTitle, CardValue } from "@/components/ui/card";
import { createServiceClient } from "@/lib/supabase/server";
import { Users, Bot, FileText, MessageSquare } from "lucide-react";

async function getStats() {
  try {
    const supabase = createServiceClient();
    const [
      { count: clients },
      { count: chatbots },
      { count: documents },
      { count: conversations },
    ] = await Promise.all([
      supabase.from("clients").select("*", { count: "exact", head: true }),
      supabase.from("chatbots").select("*", { count: "exact", head: true }),
      supabase.from("documents").select("*", { count: "exact", head: true }),
      supabase
        .from("conversations")
        .select("*", { count: "exact", head: true }),
    ]);
    return {
      clients: clients ?? 0,
      chatbots: chatbots ?? 0,
      documents: documents ?? 0,
      conversations: conversations ?? 0,
    };
  } catch {
    return { clients: 0, chatbots: 0, documents: 0, conversations: 0 };
  }
}

export default async function AdminHomePage() {
  const stats = await getStats();
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-sm text-gray-600">Overview of your multi-tenant platform</p>
        </div>
      </div>
      <div className="grid grid-rows-2 md:grid-cols-2 auto-rows-fr gap-8 min-h-[calc(100vh-180px)]">
        <Link href="/admin/clients" className="block h-full">
          <Card className="p-12 h-full hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Clients</CardTitle>
                <CardValue>{stats.clients}</CardValue>
              </div>
              <Users className="h-16 w-16 text-gray-400" />
            </div>
          </Card>
        </Link>
        <Link href="/admin/chatbots" className="block h-full">
          <Card className="p-12 h-full hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Chatbots</CardTitle>
                <CardValue>{stats.chatbots}</CardValue>
              </div>
              <Bot className="h-16 w-16 text-gray-400" />
            </div>
          </Card>
        </Link>
        <Link href="/admin/documents" className="block h-full">
          <Card className="p-12 h-full hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Documents</CardTitle>
                <CardValue>{stats.documents}</CardValue>
              </div>
              <FileText className="h-16 w-16 text-gray-400" />
            </div>
          </Card>
        </Link>
        <Link href="/admin/conversations" className="block h-full">
          <Card className="p-12 h-full hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Conversations</CardTitle>
                <CardValue>{stats.conversations}</CardValue>
              </div>
              <MessageSquare className="h-16 w-16 text-gray-400" />
            </div>
          </Card>
        </Link>
      </div>
    </div>
  );
}
export const dynamic = 'force-dynamic'
export const revalidate = 0
