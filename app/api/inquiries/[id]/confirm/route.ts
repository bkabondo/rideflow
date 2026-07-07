import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendConfirmationEmail } from '@/lib/email'

export async function PATCH(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data: inquiry, error } = await admin
    .from('rideflow_inquiries')
    .update({ status: 'confirmed', updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('rider_id', user.id)
    .select('*, rider:rideflow_users!rider_id(id,full_name,email)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const rider = inquiry.rider as { full_name: string; email: string } | null
  if (rider?.email && inquiry.quoted_amount) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://rideflowbk.vercel.app'
    await sendConfirmationEmail({
      to: rider.email,
      clientName: rider.full_name ?? 'Valued Client',
      pickup: inquiry.pickup_address,
      dropoff: inquiry.dropoff_address,
      datetime: new Date(inquiry.pickup_datetime).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }),
      vehicleType: inquiry.vehicle_type,
      confirmedAmount: inquiry.quoted_amount,
      paymentMode: inquiry.payment_mode,
      inquiryId: id,
      appUrl,
    })
  }

  return NextResponse.json({ inquiry })
}
