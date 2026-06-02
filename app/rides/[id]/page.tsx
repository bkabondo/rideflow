import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Navbar from '@/components/Navbar'
import RideDetailClient from '@/components/RideDetailClient'

export default async function RidePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('rideflow_users')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  const { data: ride } = await supabase
    .from('rideflow_rides')
    .select('*, rider:rideflow_users!rider_id(id,full_name,email,rating), driver:rideflow_users!driver_id(id,full_name,email,rating)')
    .eq('id', id)
    .single()

  if (!ride) notFound()

  // Check access
  const canView =
    ride.rider_id === user.id ||
    ride.driver_id === user.id ||
    profile.role === 'admin'

  if (!canView) redirect('/dashboard')

  const { data: rating } = await supabase
    .from('rideflow_ratings')
    .select('*')
    .eq('ride_id', id)
    .eq('rated_by', user.id)
    .single()

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar user={profile} />
      <main className="max-w-2xl mx-auto px-4 py-8">
        <RideDetailClient ride={ride} user={profile} existingRating={rating} />
      </main>
    </div>
  )
}
