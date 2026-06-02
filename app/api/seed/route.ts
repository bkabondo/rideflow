import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const ACCOUNTS = [
  { email: 'kabondobenjamin1@gmail.com', password: 'Admin@Kabondo123!', full_name: 'Benjamin Kabondo', role: 'admin' },
  { email: 'testuser1@proj.com', password: 'TestUser1@123', full_name: 'Alice Johnson', role: 'driver' },
  { email: 'testuser2@proj.com', password: 'TestUser2@123', full_name: 'Bob Smith', role: 'rider' },
  { email: 'testuser3@proj.com', password: 'TestUser3@123', full_name: 'Carol Davis', role: 'rider' },
]

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url)
  if (searchParams.get('token') !== process.env.SETUP_TOKEN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const { data: { users: existing } } = await supabase.auth.admin.listUsers()
  const results: string[] = []

  for (const acc of ACCOUNTS) {
    let uid = existing.find(u => u.email === acc.email)?.id
    if (!uid) {
      const { data, error } = await supabase.auth.admin.createUser({
        email: acc.email, password: acc.password, email_confirm: true,
        user_metadata: { full_name: acc.full_name },
      })
      if (error) { results.push(`${acc.email}: AUTH_ERR ${error.message}`); continue }
      uid = data.user.id
    }

    const { error: profileErr } = await supabase.from('rideflow_users').upsert(
      { id: uid, email: acc.email, full_name: acc.full_name, role: acc.role },
      { onConflict: 'id' }
    )
    if (profileErr) { results.push(`${acc.email}: PROFILE_ERR ${profileErr.message}`); continue }

    if (acc.role === 'driver') {
      await supabase.from('rideflow_driver_profiles').upsert(
        { user_id: uid, vehicle_model: 'Toyota Camry', vehicle_plate: 'RF-001', vehicle_color: 'Blue' },
        { onConflict: 'user_id' }
      )
    }
    results.push(`${acc.email}: OK`)
  }

  return NextResponse.json({ seeded: results })
}
