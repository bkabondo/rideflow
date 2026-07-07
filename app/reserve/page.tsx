import { createClient } from '@/lib/supabase/server'
import ReserveClient from '@/components/ReserveClient'
import Navbar from '@/components/Navbar'

export default async function ReservePage() {
  const supabase = await createClient()
  let user = null
  try { const { data } = await supabase.auth.getUser(); user = data.user } catch {}

  let profile = null
  if (user) {
    const { data } = await supabase.from('rideflow_users').select('*').eq('id', user.id).single()
    profile = data
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      <Navbar user={profile} />
      <ReserveClient isGuest={!user} />
    </div>
  )
}
