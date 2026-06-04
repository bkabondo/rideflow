import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { stripe, calculateRidePrice, getMockDistance } from '@/lib/stripe'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('rideflow_users')
    .select('role')
    .eq('id', user.id)
    .single()

  // Admin uses service-role client to bypass RLS and see all rides
  const queryClient = profile?.role === 'admin' ? createAdminClient() : supabase

  let query = queryClient
    .from('rideflow_rides')
    .select('*, rider:rideflow_users!rider_id(id,full_name,email,rating), driver:rideflow_users!driver_id(id,full_name,email,rating)')
    .order('created_at', { ascending: false })

  if (profile?.role === 'rider') {
    query = query.eq('rider_id', user.id)
  } else if (profile?.role === 'driver') {
    query = query.or(`driver_id.eq.${user.id},status.eq.pending`)
  }
  // admin: no filter — see everything

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { pickup_address, dropoff_address, ride_type } = body

  if (!pickup_address || !dropoff_address || !ride_type) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const distance_km = getMockDistance()
  const duration_minutes = Math.round(distance_km * 2.5)
  const estimated_price = calculateRidePrice(distance_km, duration_minutes, ride_type)

  // Get or create Stripe customer
  const { data: userProfile } = await supabase
    .from('rideflow_users')
    .select('stripe_customer_id, email, full_name')
    .eq('id', user.id)
    .single()

  let customerId = userProfile?.stripe_customer_id
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: userProfile?.email || user.email,
      name: userProfile?.full_name || undefined,
      metadata: { supabase_id: user.id },
    })
    customerId = customer.id
    await supabase
      .from('rideflow_users')
      .update({ stripe_customer_id: customerId })
      .eq('id', user.id)
  }

  // Create PaymentIntent
  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(estimated_price * 100),
    currency: 'usd',
    customer: customerId,
    capture_method: 'manual',
    metadata: { rider_id: user.id, ride_type, pickup_address, dropoff_address },
  })

  // Create ride
  const { data: ride, error } = await supabase
    .from('rideflow_rides')
    .insert({
      rider_id: user.id,
      pickup_address,
      dropoff_address,
      ride_type,
      estimated_price,
      distance_km,
      duration_minutes,
      stripe_payment_intent_id: paymentIntent.id,
      stripe_payment_status: 'unpaid',
      status: 'pending',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    ride,
    clientSecret: paymentIntent.client_secret,
  })
}
