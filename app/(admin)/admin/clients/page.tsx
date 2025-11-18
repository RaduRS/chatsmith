import { Card } from '@/components/ui/card'
import { createServiceClient } from '@/lib/supabase/server'
import CreateClientForm from '@/components/admin/create-client-form'
import { CardTitle } from '@/components/ui/card'
import DeleteClientButton from '@/components/admin/delete-client-button'
import type { Client } from '@/lib/types'

export default async function ClientsPage() {
  const supabase = createServiceClient()
  const { data } = await supabase.from('clients').select('*').order('created_at', { ascending: false })
  const clients: Client[] = (data ?? []) as Client[]
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Clients</h1>
          <p className="text-sm text-gray-600">Manage tenants and their API keys</p>
        </div>
      </div>
      <Card className="p-6">
        <CardTitle>Create Client</CardTitle>
        <div className="mt-4">
          <CreateClientForm />
        </div>
      </Card>
      <Card className="p-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left">
              <th className="p-2">Name</th>
              <th className="p-2">Email</th>
              <th className="p-2">API Key</th>
              <th className="p-2">Created</th>
              <th className="p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((c: Client) => (
              <tr key={c.id} className="border-t">
                <td className="p-2">{c.name}</td>
                <td className="p-2">{c.email}</td>
                <td className="p-2">{c.api_key}</td>
                <td className="p-2">{new Date(c.created_at).toLocaleString()}</td>
                <td className="p-2"><DeleteClientButton id={c.id} /></td>
              </tr>
            ))}
            {clients.length === 0 && (
              <tr>
                <td className="p-4 text-gray-500" colSpan={5}>No clients yet</td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
export const dynamic = 'force-dynamic'
export const revalidate = 0