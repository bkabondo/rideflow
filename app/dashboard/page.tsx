import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import RiderDashboard from '@/components/dashboard/RiderDashboard'
import DriverDashboard from '@/components/dashboard/DriverDashboard'
import AdminDashboard from '@/components/dashboard/AdminDashboard'
import Navbar from '@/components/Navbar'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('rideflow_users')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) {
    // Auto-create profile if missing
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar user={profile} />
      <main className="max-w-7xl mx-auto px-4 py-8">
        {profile.role === 'rider' && <RiderDashboard user={profile} />}
        {profile.role === 'driver' && <DriverDashboard user={profile} />}
        {profile.role === 'admin' && <AdminDashboard user={profile} />}
      </main>
    </div>
  )
}
