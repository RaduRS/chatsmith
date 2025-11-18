import { Card } from '@/components/ui/card'
import { createServiceClient } from '@/lib/supabase/server'
import ChatbotSettingsForm from '@/components/admin/chatbot-settings-form'
import UploadDocumentForm from '@/components/admin/upload-document-form'
import ChatBox from '@/components/admin/chatbox'
import DeleteChatbotButton from '@/components/admin/delete-chatbot-button'
import DocumentsTable from '@/components/admin/documents-table'

export default async function ChatbotDetailPage({ params }: { params: { id: string } }) {
  const supabase = createServiceClient()
  const { data: chatbot } = await supabase.from('chatbots').select('*').eq('id', params.id).single()
  const { data: client } = chatbot ? await supabase.from('clients').select('id,api_key').eq('id', chatbot.client_id).single() : { data: null }
  const { count: docCount } = await supabase.from('documents').select('*', { count: 'exact', head: true }).eq('chatbot_id', params.id)
  const { count: convoCount } = await supabase.from('conversations').select('*', { count: 'exact', head: true }).eq('chatbot_id', params.id)
  const { data: documents } = await supabase.from('documents').select('id,filename,created_at').eq('chatbot_id', params.id).order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-600">Chatbot</div>
            <div className="text-2xl font-semibold">{chatbot?.name}</div>
            {chatbot?.settings?.greeting && (
              <div className="text-sm text-gray-500 mt-1">{chatbot.settings.greeting}</div>
            )}
          </div>
          <div className="text-sm">
            <span className="mr-4">Documents: {docCount ?? 0}</span>
            <span>Conversations: {convoCount ?? 0}</span>
          </div>
          <div>
            <DeleteChatbotButton id={params.id} />
          </div>
        </div>
      </Card>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <div className="text-lg font-semibold mb-4">Settings</div>
          <ChatbotSettingsForm
            id={params.id}
            name={chatbot?.name ?? ''}
            settings={{
              greeting: chatbot?.settings?.greeting ?? '',
              chatModel: chatbot?.settings?.chatModel ?? 'gpt-4o-mini',
              topK: chatbot?.settings?.topK ?? 4,
              minSimilarity: chatbot?.settings?.minSimilarity ?? 0.4,
              streaming: chatbot?.settings?.streaming ?? true,
            }}
          />
        </Card>
        <Card className="p-6">
          <div className="text-lg font-semibold mb-4">Upload Document</div>
          <UploadDocumentForm chatbotId={params.id} />
        </Card>
      </div>
      <Card className="p-6">
        <div className="text-lg font-semibold mb-4">Chat</div>
        <ChatBox chatbotId={params.id} botName={chatbot?.name} apiKey={client?.api_key} />
      </Card>
      <Card className="p-6">
        <div className="text-lg font-semibold mb-4">Documents</div>
        <DocumentsTable rows={(documents ?? []).map(d => ({ id: d.id, filename: d.filename, uploaded: new Date(d.created_at).toISOString() }))} showClient={false} showChatbot={false} />
      </Card>
    </div>
  )
}
export const dynamic = 'force-dynamic'
export const revalidate = 0