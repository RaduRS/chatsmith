import { Card } from '@/components/ui/card'
import { createServiceClient } from '@/lib/supabase/server'
import DocumentsTable from '@/components/admin/documents-table'

type Doc = { id: string; filename: string; client_id: string | null; chatbot_id: string | null; created_at: string }
type Client = { id: string; name: string }
type Chatbot = { id: string; name: string }

async function getData() {
  const supabase = createServiceClient()
  const [docsRes, clientsRes, botsRes] = await Promise.all([
    supabase
      .from('documents')
      .select('id,filename,client_id,chatbot_id,created_at')
      .order('created_at', { ascending: false }),
    supabase.from('clients').select('id,name'),
    supabase.from('chatbots').select('id,name'),
  ])
  const documents: Doc[] = docsRes.data ?? []
  const clients: Client[] = clientsRes.data ?? []
  const chatbots: Chatbot[] = botsRes.data ?? []
  const clientMap = new Map(clients.map((c) => [c.id, c.name]))
  const botMap = new Map(chatbots.map((b) => [b.id, b.name]))
  return { documents, clientMap, botMap }
}

export default async function AdminDocumentsPage() {
  const { documents, clientMap, botMap } = await getData()
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Documents</h1>
          <p className="text-sm text-gray-600">All uploaded documents across clients and chatbots</p>
        </div>
      </div>
      <Card className="p-6">
        <DocumentsTable
          rows={documents.map(d => ({ id: d.id, filename: d.filename, uploaded: new Date(d.created_at).toISOString(), clientName: d.client_id ? (clientMap.get(d.client_id) ?? '—') : '—', chatbotName: d.chatbot_id ? (botMap.get(d.chatbot_id) ?? '—') : '—' }))}
          showClient={true}
          showChatbot={true}
        />
      </Card>
    </div>
  )
}
export const dynamic = 'force-dynamic'
export const revalidate = 0