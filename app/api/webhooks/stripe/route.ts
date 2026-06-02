import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 })
  }

  let event
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err: unknown) {
    const error = err as Error
    return NextResponse.json({ error: `Webhook Error: ${error.message}` }, { status: 400 })
  }

  const supabase = createAdminClient()

  switch (event.type) {
    case 'payment_intent.succeeded': {
      const pi = event.data.object
      await supabase
        .from('rideflow_rides')
        .update({ stripe_payment_status: 'captured' })
        .eq('stripe_payment_intent_id', pi.id)
      break
    }
    case 'payment_intent.payment_failed': {
      const pi = event.data.object
      await supabase
        .from('rideflow_rides')
        .update({ stripe_payment_status: 'failed' })
        .eq('stripe_payment_intent_id', pi.id)
      break
    }
    case 'payment_intent.amount_capturable_updated': {
      const pi = event.data.object
      await supabase
        .from('rideflow_rides')
        .update({ stripe_payment_status: 'authorized' })
        .eq('stripe_payment_intent_id', pi.id)
      break
    }
    default:
      console.log(`Unhandled event type: ${event.type}`)
  }

  return NextResponse.json({ received: true })
}
