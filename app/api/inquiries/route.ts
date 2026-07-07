import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getMarketRefPrice, calculateLuxuryPrice } from '@/lib/stripe'
import { sendOwnerNotificationEmail } from '@/lib/email'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('rideflow_users').select('role').eq('id', user.id).single()
  const queryClient = profile?.role === 'admin' ? createAdminClient() : supabase

  let query = queryClient
    .from('rideflow_inquiries')
    .select('*, rider:rideflow_users!rider_id(id,full_name,email,rating)')
    .order('created_at', { ascending: false })

  if (profile?.role === 'rider') query = query.eq('rider_id', user.id)
  // Drivers see only their assigned inquiries (via admin client to bypass RLS)
  if (profile?.role === 'driver') {
    const { data, error } = await createAdminClient()
      .from('rideflow_inquiries')
      .select('id,rider_id,driver_id,pickup_address,dropoff_address,pickup_datetime,passengers,luggage,vehicle_type,preferences,status,payment_mode,created_at,updated_at,rider:rideflow_users!rider_id(id,full_name,email,rating)')
      .eq('driver_id', user.id)
      .order('pickup_datetime', { ascending: true })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data ?? [])
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  let user = null
  try { const { data } = await supabase.auth.getUser(); user = data.user } catch {}

  const body = await request.json()
  const { pickup_address, dropoff_address, pickup_datetime, passengers, luggage, vehicle_type, preferences, guest_name, guest_email, guest_phone } = body

  if (!pickup_address || !dropoff_address || !pickup_datetime || !vehicle_type) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  if (!user && !guest_email) {
    return NextResponse.json({ error: 'Contact info required for guest bookings' }, { status: 400 })
  }

  // Estimate distance (mock for now; use geocoding in production)
  const distanceKm = Math.round((Math.random() * 25 + 5) * 10) / 10
  const durationMin = Math.round(distanceKm * 2.5)
  const marketRefPrice = getMarketRefPrice(distanceKm, durationMin)
  const suggestedPrice = calculateLuxuryPrice(distanceKm, durationMin, vehicle_type)

  const enrichedPreferences = {
    ...preferences,
    ...(guest_name ? { guest_name } : {}),
    ...(guest_email ? { guest_email } : {}),
    ...(guest_phone ? { guest_phone } : {}),
  }

  const adminSb = createAdminClient()
  const { data: inquiry, error } = await adminSb
    .from('rideflow_inquiries')
    .insert({
      rider_id: user?.id ?? null,
      pickup_address,
      dropoff_address,
      pickup_datetime,
      passengers: passengers ?? 1,
      luggage: luggage ?? 'none',
      vehicle_type,
      preferences: enrichedPreferences,
      status: 'inquiry',
      market_ref_price: marketRefPrice,
      suggested_price: suggestedPrice,
      payment_mode: 'required',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Notify owner
  let clientName = guest_name ?? 'A guest'
  let clientEmail = guest_email ?? ''

  if (user) {
    const { data: riderProfile } = await supabase
      .from('rideflow_users')
      .select('full_name, email')
      .eq('id', user.id)
      .single()
    clientName = riderProfile?.full_name ?? 'A client'
    clientEmail = riderProfile?.email ?? ''
  }

  const { data: ownerProfile } = await adminSb
    .from('rideflow_users')
    .select('email')
    .eq('role', 'admin')
    .single()

  if (ownerProfile?.email) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://rideflowbk.vercel.app'
    await sendOwnerNotificationEmail({
      to: ownerProfile.email,
      clientName,
      clientEmail,
      pickup: pickup_address,
      dropoff: dropoff_address,
      datetime: new Date(pickup_datetime).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }),
      vehicleType: vehicle_type,
      passengers: passengers ?? 1,
      occasion: preferences?.occasion ?? 'Not specified',
      specialRequests: preferences?.special_requests ?? '',
      marketRefPrice,
      inquiryId: inquiry.id,
      appUrl,
    })
  }

  return NextResponse.json({ inquiry, suggestedPrice, marketRefPrice })
}
