import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { score, comment } = body

  if (!score || score < 1 || score > 5) {
    return NextResponse.json({ error: 'Score must be between 1 and 5' }, { status: 400 })
  }

  const { data: ride } = await supabase
    .from('rideflow_rides')
    .select('*')
    .eq('id', id)
    .single()

  if (!ride) return NextResponse.json({ error: 'Ride not found' }, { status: 404 })
  if (ride.status !== 'completed') return NextResponse.json({ error: 'Can only rate completed rides' }, { status: 400 })

  const isRider = ride.rider_id === user.id
  const isDriver = ride.driver_id === user.id

  if (!isRider && !isDriver) {
    return NextResponse.json({ error: 'Not part of this ride' }, { status: 403 })
  }

  const rated_user = isRider ? ride.driver_id : ride.rider_id

  const { data, error } = await supabase
    .from('rideflow_ratings')
    .insert({
      ride_id: id,
      rated_by: user.id,
      rated_user,
      score,
      comment: comment || null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Update user average rating
  const { data: ratings } = await supabase
    .from('rideflow_ratings')
    .select('score')
    .eq('rated_user', rated_user)

  if (ratings && ratings.length > 0) {
    const avg = ratings.reduce((sum, r) => sum + r.score, 0) / ratings.length
    await supabase
      .from('rideflow_users')
      .update({ rating: Math.round(avg * 10) / 10 })
      .eq('id', rated_user)
  }

  return NextResponse.json(data)
}
