import { Card } from '@/components/ui/card'
import { createServiceClient } from '@/lib/supabase/server'
import type { Document } from '@/lib/types'

export default async function ClientDocumentsPage({ searchParams }: { searchParams: { chatbot_id?: string } }) {
  const chatbot_id = searchParams?.chatbot_id
  if (!chatbot_id) {
    return (
      <div className="p-8">
        <Card>
          <div className="text-sm text-gray-600">Provide a chatbot_id in the URL query.</div>
        </Card>
      </div>
    )
  }

  const supabase = createServiceClient()
  const { data } = await supabase
    .from('documents')
    .select('id,filename,created_at')
    .eq('chatbot_id', chatbot_id)
    .order('created_at', { ascending: false })
  const documents = (data ?? []) as Pick<Document, 'id' | 'filename' | 'created_at'>[]

  return (
    <div className="p-8 space-y-6">
      <Card>
        <div className="text-lg font-semibold">Documents</div>
      </Card>
      <Card>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left">
              <th className="p-2">File</th>
              <th className="p-2">Uploaded</th>
            </tr>
          </thead>
          <tbody>
            {documents.map(d => (
              <tr key={d.id} className="border-t">
                <td className="p-2">{d.filename}</td>
                <td className="p-2">{new Date(d.created_at).toLocaleString()}</td>
              </tr>
            ))}
            {documents.length === 0 && (
              <tr>
                <td className="p-4 text-gray-500" colSpan={2}>No documents yet</td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  )
}