import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function PATCH(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('rideflow_users').select('role').eq('id', user.id).single()
  const admin = createAdminClient()

  // Rider can decline their own; admin can decline any
  const query = admin.from('rideflow_inquiries').update({ status: 'declined', updated_at: new Date().toISOString() }).eq('id', id)
  if (profile?.role !== 'admin') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(query as any).eq('rider_id', user.id)
  }

  const { data, error } = await query.select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ inquiry: data })
}
