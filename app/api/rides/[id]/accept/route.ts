import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('rideflow_users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'driver') {
    return NextResponse.json({ error: 'Only drivers can accept rides' }, { status: 403 })
  }

  const { data: ride } = await supabase
    .from('rideflow_rides')
    .select('status')
    .eq('id', id)
    .single()

  if (ride?.status !== 'pending') {
    return NextResponse.json({ error: 'Ride is not pending' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('rideflow_rides')
    .update({ driver_id: user.id, status: 'accepted' })
    .eq('id', id)
    .eq('status', 'pending')
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
