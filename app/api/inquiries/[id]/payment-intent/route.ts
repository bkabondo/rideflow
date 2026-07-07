import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { stripe } from '@/lib/stripe'

// GET — rider retrieves the clientSecret for their existing payment intent
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data: inquiry, error } = await admin
    .from('rideflow_inquiries')
    .select('id, rider_id, status, stripe_payment_intent_id, quoted_amount, payment_mode')
    .eq('id', id)
    .single()

  if (error || !inquiry) return NextResponse.json({ error: 'Inquiry not found' }, { status: 404 })
  if (inquiry.rider_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (inquiry.status !== 'quoted') return NextResponse.json({ error: 'Inquiry is not in quoted status' }, { status: 400 })

  // If no payment intent yet (edge case: admin sent quote with payment_mode=required but PI creation failed)
  if (!inquiry.stripe_payment_intent_id) {
    if (!inquiry.quoted_amount) return NextResponse.json({ error: 'No quote amount' }, { status: 400 })

    // Get or create Stripe customer for rider
    const { data: riderProfile } = await admin.from('rideflow_users').select('stripe_customer_id, email, full_name').eq('id', user.id).single()
    let customerId = riderProfile?.stripe_customer_id ?? undefined

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: riderProfile?.email,
        name: riderProfile?.full_name ?? undefined,
        metadata: { supabase_id: user.id },
      })
      customerId = customer.id
      await admin.from('rideflow_users').update({ stripe_customer_id: customerId }).eq('id', user.id)
    }

    const pi = await stripe.paymentIntents.create({
      amount: Math.round(inquiry.quoted_amount * 100),
      currency: 'usd',
      customer: customerId,
      capture_method: 'manual',
      metadata: { inquiry_id: id, rider_id: user.id },
    })
    await admin.from('rideflow_inquiries').update({ stripe_payment_intent_id: pi.id, stripe_payment_status: 'unpaid' }).eq('id', id)
    return NextResponse.json({ clientSecret: pi.client_secret })
  }

  // Retrieve existing payment intent from Stripe
  const pi = await stripe.paymentIntents.retrieve(inquiry.stripe_payment_intent_id)
  if (!pi.client_secret) return NextResponse.json({ error: 'Could not retrieve payment intent' }, { status: 500 })

  // If the PI was already used/cancelled, create a fresh one
  if (['succeeded', 'canceled'].includes(pi.status)) {
    const { data: riderProfile } = await admin.from('rideflow_users').select('stripe_customer_id, email, full_name').eq('id', user.id).single()
    const newPi = await stripe.paymentIntents.create({
      amount: Math.round((inquiry.quoted_amount ?? 0) * 100),
      currency: 'usd',
      customer: riderProfile?.stripe_customer_id ?? undefined,
      capture_method: 'manual',
      metadata: { inquiry_id: id, rider_id: user.id },
    })
    await admin.from('rideflow_inquiries').update({ stripe_payment_intent_id: newPi.id, stripe_payment_status: 'unpaid' }).eq('id', id)
    return NextResponse.json({ clientSecret: newPi.client_secret })
  }

  return NextResponse.json({ clientSecret: pi.client_secret })
}
