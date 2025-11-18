import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { generateApiKey } from '@/lib/utils/api-key-generator'

export async function GET() {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: Request) {
  const { name, email } = await req.json()
  const supabase = createServiceClient()
  const api_key = generateApiKey()
  const { data, error } = await supabase
    .from('clients')
    .insert({ name, email, api_key })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}