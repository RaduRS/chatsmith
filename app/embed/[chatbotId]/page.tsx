import ChatBox from '@/components/admin/chatbox'
import { createServiceClient } from '@/lib/supabase/server'

export default async function EmbedPage({ params, searchParams }: { params: { chatbotId: string }, searchParams?: { api_key?: string } }) {
  const chatbotId = params.chatbotId
  const apiKey = searchParams?.api_key
  const supabase = createServiceClient()
  const { data: chatbot } = await supabase.from('chatbots').select('id,name').eq('id', chatbotId).single()
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-xl mx-auto px-4 py-6">
        <div className="mb-4">
          <div className="text-sm text-gray-500">{chatbot?.name ?? 'Chatbot'}</div>
        </div>
        <ChatBox chatbotId={chatbotId} apiKey={apiKey} botName={chatbot?.name} />
      </div>
    </div>
  )
}