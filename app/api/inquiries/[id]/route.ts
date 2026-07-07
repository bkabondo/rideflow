import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('rideflow_users').select('role').eq('id', user.id).single()
  const queryClient = profile?.role === 'admin' ? createAdminClient() : supabase

  const { data, error } = await queryClient
    .from('rideflow_inquiries')
    .select('*, rider:rideflow_users!rider_id(id,full_name,email,rating)')
    .eq('id', id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
