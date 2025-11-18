import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  const { client_id, name } = await req.json() as { client_id: string; name: string }
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('chatbots')
    .insert({ client_id, name, settings: { color: '#000000', greeting: 'Hello! How can I help?' } })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}