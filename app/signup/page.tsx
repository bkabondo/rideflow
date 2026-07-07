'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Car, Loader2, Mail, Lock, User } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

export default function SignupPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ email: '', password: '', full_name: '', role: 'rider' as 'rider' | 'driver' })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const supabase = createClient()
    const { data, error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: { data: { full_name: form.full_name, role: form.role } },
    })
    if (error) { setLoading(false); toast.error(error.message); return }
    if (data.user) {
      await supabase.from('rideflow_users').insert({ id: data.user.id, email: form.email, full_name: form.full_name, role: form.role })
      if (form.role === 'driver') await supabase.from('rideflow_driver_profiles').insert({ user_id: data.user.id })
    }
    setLoading(false)
    toast.success('Account created! Welcome.')
    router.push('/dashboard')
    router.refresh()
  }

  const inputCls = `w-full bg-[#1C1C1C] border border-[#363636] focus:border-[#C9A028] text-[#F0ECE4]
    placeholder:text-[#555] rounded-xl px-4 py-3 pl-11 text-sm focus:outline-none transition-colors`

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-4" style={{ background: 'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(201,160,40,0.08) 0%, #0A0A0A 70%)' }}>
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-10">
          <div className="h-10 w-10 rounded-xl bg-[#C9A028] flex items-center justify-center shadow-lg shadow-[#C9A028]/20">
            <Car className="h-5 w-5 text-black" />
          </div>
          <span className="text-3xl font-bold text-[#F0ECE4] tracking-tight">
            Ride<span className="text-[#C9A028]">Flow</span>
          </span>
        </div>

        {/* Card */}
        <div className="bg-[#111111] border border-[#2A2A2A] rounded-2xl p-8 shadow-2xl">
          <h1 className="text-2xl font-bold text-[#F0ECE4] mb-1">Create Account</h1>
          <p className="text-[#666] text-sm mb-8">Join RideFlow — premium rides at your fingertips</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-[#A08020] text-[10px] font-bold uppercase tracking-widest">Full Name</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#555]" />
                <input type="text" placeholder="John Doe" value={form.full_name}
                  onChange={e => setForm({ ...form, full_name: e.target.value })} required className={inputCls} />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[#A08020] text-[10px] font-bold uppercase tracking-widest">Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#555]" />
                <input type="email" placeholder="you@example.com" value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })} required className={inputCls} />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[#A08020] text-[10px] font-bold uppercase tracking-widest">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#555]" />
                <input type="password" placeholder="Min. 8 characters" value={form.password} minLength={8}
                  onChange={e => setForm({ ...form, password: e.target.value })} required className={inputCls} />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[#A08020] text-[10px] font-bold uppercase tracking-widest">I want to join as</label>
              <div className="grid grid-cols-2 gap-3">
                {(['rider', 'driver'] as const).map(role => (
                  <button key={role} type="button" onClick={() => setForm({ ...form, role })}
                    className={`p-3.5 rounded-xl border-2 text-sm font-semibold capitalize transition-all ${
                      form.role === role
                        ? 'bg-[#C9A028]/10 border-[#C9A028] text-[#C9A028]'
                        : 'bg-[#161616] border-[#2A2A2A] text-[#777] hover:border-[#444]'
                    }`}>
                    {role === 'rider' ? '🛡️ Rider' : '🚗 Driver'}
                  </button>
                ))}
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full bg-[#C9A028] hover:bg-[#B8901E] disabled:opacity-60 text-black font-bold rounded-xl py-3.5 text-sm transition-colors flex items-center justify-center gap-2 mt-2">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Create Account
            </button>
          </form>

          <p className="text-[#666] text-sm text-center mt-6">
            Already have an account?{' '}
            <Link href="/login" className="text-[#C9A028] hover:text-[#E8B830] font-medium transition-colors">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
