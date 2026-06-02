import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { ride_id } = body

  const { data: ride } = await supabase
    .from('rideflow_rides')
    .select('*, rider:rideflow_users!rider_id(stripe_customer_id, email, full_name)')
    .eq('id', ride_id)
    .single()

  if (!ride) return NextResponse.json({ error: 'Ride not found' }, { status: 404 })
  if (ride.rider_id !== user.id) return NextResponse.json({ error: 'Not your ride' }, { status: 403 })

  // Return existing payment intent if already has one
  if (ride.stripe_payment_intent_id) {
    const existing = await stripe.paymentIntents.retrieve(ride.stripe_payment_intent_id)
    return NextResponse.json({ clientSecret: existing.client_secret })
  }

  const amount = Math.round((ride.estimated_price || 5) * 100)

  let customerId = ride.rider?.stripe_customer_id
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: ride.rider?.email || user.email,
      name: ride.rider?.full_name || undefined,
    })
    customerId = customer.id
    await supabase
      .from('rideflow_users')
      .update({ stripe_customer_id: customerId })
      .eq('id', user.id)
  }

  const paymentIntent = await stripe.paymentIntents.create({
    amount,
    currency: 'usd',
    customer: customerId,
    capture_method: 'manual',
    metadata: { ride_id, rider_id: user.id },
  })

  await supabase
    .from('rideflow_rides')
    .update({ stripe_payment_intent_id: paymentIntent.id })
    .eq('id', ride_id)

  return NextResponse.json({ clientSecret: paymentIntent.client_secret })
}
