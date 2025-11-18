import ChatBox from '@/components/admin/chatbox'

export default function EmbedPage({ params, searchParams }: { params: { chatbotId: string }, searchParams?: { api_key?: string } }) {
  const chatbotId = params.chatbotId
  const apiKey = searchParams?.api_key
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-xl mx-auto px-4 py-6">
        <div className="mb-4">
          <div className="text-sm text-gray-500">Chatbot</div>
          <div className="text-lg font-medium">Ask questions about the uploaded documents</div>
        </div>
        <ChatBox chatbotId={chatbotId} apiKey={apiKey} />
      </div>
    </div>
  )
}