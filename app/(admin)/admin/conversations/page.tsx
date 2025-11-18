import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { createServiceClient } from '@/lib/supabase/server'
import ConversationsTable from '@/components/admin/conversations-table'

export default async function ConversationsPage() {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('conversations')
    .select('id,chatbot_id,client_id,created_at,messages')
    .order('created_at', { ascending: false })
    .limit(100)
  const { data: chatbots } = await supabase.from('chatbots').select('id,name')
  const { data: clients } = await supabase.from('clients').select('id,name')
  const botMap = new Map((chatbots ?? []).map((b: { id: string; name: string }) => [b.id, b.name]))
  const clientMap = new Map((clients ?? []).map((c: { id: string; name: string }) => [c.id, c.name]))
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Conversations</h1>
          <p className="text-sm text-gray-600">All conversations across chatbots</p>
        </div>
      </div>
      <Card className="p-6">
        <ConversationsTable
          rows={(data ?? []).map((c: { id: string; chatbot_id: string; client_id: string; created_at: string; messages: unknown }) => {
            let msgs: Array<{ role: 'user' | 'assistant' | 'system'; content: string }> = []
            if (Array.isArray(c.messages)) {
              msgs = c.messages as Array<{ role: 'user' | 'assistant' | 'system'; content: string }>
            } else {
              try {
                const parsed = JSON.parse(String(c.messages)) as Array<{ role: 'user' | 'assistant' | 'system'; content: string }>
                if (Array.isArray(parsed)) msgs = parsed
              } catch {}
            }
            const lastUser = [...msgs].reverse().find(m => m.role === 'user')?.content ?? ''
            const lastAssistant = [...msgs].reverse().find(m => m.role === 'assistant')?.content ?? ''
            return {
              id: c.id,
              chatbotName: botMap.get(c.chatbot_id) ?? c.chatbot_id,
              clientName: clientMap.get(c.client_id) ?? '',
              lastUser,
              lastAssistant,
              uploaded: new Date(c.created_at).toISOString(),
            }
          })}
        />
      </Card>
    </div>
  )
}

export const dynamic = 'force-dynamic'
export const revalidate = 0