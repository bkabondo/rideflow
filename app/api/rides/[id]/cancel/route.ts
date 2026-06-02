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

  const { data: profile } = await supabase
    .from('rideflow_users')
    .select('role')
    .eq('id', user.id)
    .single()

  const canCancel =
    ride.rider_id === user.id ||
    ride.driver_id === user.id ||
    profile?.role === 'admin'

  if (!canCancel) return NextResponse.json({ error: 'Cannot cancel this ride' }, { status: 403 })

  if (['completed', 'cancelled'].includes(ride.status)) {
    return NextResponse.json({ error: 'Ride already finalized' }, { status: 400 })
  }

  // Cancel Stripe PaymentIntent if exists
  if (ride.stripe_payment_intent_id) {
    try {
      await stripe.paymentIntents.cancel(ride.stripe_payment_intent_id)
    } catch (e) {
      console.error('Stripe cancel error:', e)
    }
  }

  const { data, error } = await supabase
    .from('rideflow_rides')
    .update({ status: 'cancelled' })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
