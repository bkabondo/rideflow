import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import RiderDashboard from '@/components/dashboard/RiderDashboard'
import DriverDashboard from '@/components/dashboard/DriverDashboard'
import AdminDashboard from '@/components/dashboard/AdminDashboard'
import Navbar from '@/components/Navbar'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  let { data: profile } = await supabase
    .from('rideflow_users')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) {
    const admin = createAdminClient()
    await admin.from('rideflow_users').upsert(
      {
        id: user.id,
        email: user.email ?? '',
        full_name: user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? 'Rider',
        role: 'rider',
      },
      { onConflict: 'id' }
    )
    const { data } = await admin.from('rideflow_users').select('*').eq('id', user.id).single()
    if (!data) redirect('/login')
    profile = data
  }

  return (
    <div className="min-h-screen bg-[#0E0E0E]">
      <Navbar user={profile} />
      <main className="max-w-7xl mx-auto px-4 py-8">
        {profile.role === 'rider' && <RiderDashboard user={profile} />}
        {profile.role === 'driver' && <DriverDashboard user={profile} />}
        {profile.role === 'admin' && <AdminDashboard user={profile} />}
      </main>
    </div>
  )
}
