import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { stripe } from '@/lib/stripe'
import { sendQuoteEmail } from '@/lib/email'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('rideflow_users').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const { quoted_amount, payment_mode, quote_message } = body

  if (!quoted_amount || quoted_amount <= 0) {
    return NextResponse.json({ error: 'Invalid quote amount' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: inquiry, error } = await admin
    .from('rideflow_inquiries')
    .update({ quoted_amount, payment_mode: payment_mode ?? 'required', quote_message: quote_message ?? null, status: 'quoted', updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*, rider:rideflow_users!rider_id(id,full_name,email)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Create Stripe payment intent if payment required
  let clientSecret: string | null = null
  if ((payment_mode ?? 'required') === 'required') {
    const rider = inquiry.rider as { id: string; full_name: string; email: string } | null
    let customerId: string | undefined

    const { data: riderProfile } = await admin.from('rideflow_users').select('stripe_customer_id, email, full_name').eq('id', inquiry.rider_id).single()
    customerId = riderProfile?.stripe_customer_id ?? undefined

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: riderProfile?.email ?? rider?.email,
        name: riderProfile?.full_name ?? rider?.full_name ?? undefined,
        metadata: { supabase_id: inquiry.rider_id },
      })
      customerId = customer.id
      await admin.from('rideflow_users').update({ stripe_customer_id: customerId }).eq('id', inquiry.rider_id)
    }

    const pi = await stripe.paymentIntents.create({
      amount: Math.round(quoted_amount * 100),
      currency: 'usd',
      customer: customerId,
      capture_method: 'manual',
      metadata: { inquiry_id: id, rider_id: inquiry.rider_id },
    })
    clientSecret = pi.client_secret
    await admin.from('rideflow_inquiries').update({ stripe_payment_intent_id: pi.id, stripe_payment_status: 'unpaid' }).eq('id', id)
  }

  // Send quote email
  const rider = inquiry.rider as { full_name: string; email: string } | null
  if (rider?.email) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://rideflowbk.vercel.app'
    await sendQuoteEmail({
      to: rider.email,
      clientName: rider.full_name ?? 'Valued Client',
      pickup: inquiry.pickup_address,
      dropoff: inquiry.dropoff_address,
      datetime: new Date(inquiry.pickup_datetime).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }),
      vehicleType: inquiry.vehicle_type,
      quotedAmount: quoted_amount,
      paymentMode: payment_mode ?? 'required',
      quoteMessage: quote_message ?? '',
      inquiryId: id,
      appUrl,
    })
  }

  return NextResponse.json({ inquiry, clientSecret })
}
