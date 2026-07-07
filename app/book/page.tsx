import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Navbar from '@/components/Navbar'
import BookRideClient from '@/components/BookRideClient'

export default async function BookPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('rideflow_users')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'rider') {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-[#0E0E0E]">
      <Navbar user={profile} />
      <main className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-[#F0ECE4] mb-6">Book a Ride</h1>
        <BookRideClient />
      </main>
    </div>
  )
}
