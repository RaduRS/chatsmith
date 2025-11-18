import { Card } from '@/components/ui/card'
import { createServiceClient } from '@/lib/supabase/server'

export default async function ConversationDetailPage({ params }: { params: { id: string } }) {
  const supabase = createServiceClient()
  const { data: convo } = await supabase
    .from('conversations')
    .select('id,chatbot_id,created_at,messages')
    .eq('id', params.id)
    .single()
  const { data: bot } = convo?.chatbot_id
    ? await supabase.from('chatbots').select('id,name').eq('id', convo.chatbot_id).single()
    : { data: null }
  let msgs: { role: 'user' | 'assistant' | 'system'; content: string }[] = []
  try {
    msgs = Array.isArray(convo?.messages)
      ? (convo?.messages as { role: 'user' | 'assistant' | 'system'; content: string }[])
      : (JSON.parse(String(convo?.messages)) as { role: 'user' | 'assistant' | 'system'; content: string }[])
  } catch {}
  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-600">Conversation</div>
            <div className="text-2xl font-semibold">{bot?.name ?? convo?.chatbot_id}</div>
          </div>
          <div className="text-sm">{convo ? new Date(convo.created_at).toLocaleString() : ''}</div>
        </div>
      </Card>
      <Card className="p-6">
        <div className="space-y-4">
          {msgs.map((m, i) => (
            <div key={i} className="flex gap-3">
              <div className={`px-2 py-1 rounded text-xs ${m.role === 'assistant' ? 'bg-blue-100 text-blue-700' : m.role === 'user' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>{m.role}</div>
              <div className="text-sm leading-relaxed">{m.content}</div>
            </div>
          ))}
          {msgs.length === 0 && <div className="text-sm text-gray-500">No messages</div>}
        </div>
      </Card>
    </div>
  )
}
export const dynamic = 'force-dynamic'
export const revalidate = 0