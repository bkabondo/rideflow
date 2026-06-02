import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: ride } = await supabase
    .from('rideflow_rides')
    .select('*')
    .eq('id', id)
    .single()

  if (!ride) return NextResponse.json({ error: 'Ride not found' }, { status: 404 })
  if (ride.driver_id !== user.id) return NextResponse.json({ error: 'Not your ride' }, { status: 403 })
  if (ride.status !== 'accepted' && ride.status !== 'in_progress') {
    return NextResponse.json({ error: 'Cannot complete this ride' }, { status: 400 })
  }

  let paymentStatus = ride.stripe_payment_status

  // Capture payment if authorized
  if (ride.stripe_payment_intent_id && ride.stripe_payment_status === 'authorized') {
    try {
      await stripe.paymentIntents.capture(ride.stripe_payment_intent_id)
      paymentStatus = 'captured'
    } catch (e) {
      console.error('Stripe capture error:', e)
    }
  }

  const { data, error } = await supabase
    .from('rideflow_rides')
    .update({
      status: 'completed',
      final_price: ride.estimated_price,
      stripe_payment_status: paymentStatus,
      completed_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Update driver total_rides
  await supabase
    .from('rideflow_driver_profiles')
    .update({ total_rides: ride.total_rides + 1, is_available: true })
    .eq('user_id', user.id)

  return NextResponse.json(data)
}
