import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  const supabase = createServiceClient()
  const { ids } = await req.json() as { ids?: string[] }
  if (!ids || ids.length === 0) return NextResponse.json({ error: 'ids required' }, { status: 400 })
  const { error } = await supabase.from('conversations').delete().in('id', ids)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, deleted: ids.length })
}

export const runtime = 'nodejs'