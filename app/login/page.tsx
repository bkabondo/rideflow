'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Car, Loader2, Lock, Mail } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ email: '', password: '' })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email: form.email, password: form.password })
    setLoading(false)
    if (error) { toast.error(error.message); return }
    toast.success('Welcome back!')
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
          <h1 className="text-2xl font-bold text-[#F0ECE4] mb-1">Sign In</h1>
          <p className="text-[#666] text-sm mb-8">Enter your credentials to access your account</p>

          <form onSubmit={handleSubmit} className="space-y-5">
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
                <input type="password" placeholder="••••••••" value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })} required className={inputCls} />
              </div>
            </div>

            <div className="flex justify-end">
              <Link href="/forgot-password" className="text-xs text-[#777] hover:text-[#C9A028] transition-colors">
                Forgot password?
              </Link>
            </div>

            <button type="submit" disabled={loading}
              className="w-full bg-[#C9A028] hover:bg-[#B8901E] disabled:opacity-60 text-black font-bold rounded-xl py-3.5 text-sm transition-colors flex items-center justify-center gap-2">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Sign In
            </button>
          </form>

          <p className="text-[#666] text-sm text-center mt-6">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="text-[#C9A028] hover:text-[#E8B830] font-medium transition-colors">Sign up</Link>
          </p>
        </div>

        {/* Test accounts */}
        <div className="mt-4 p-4 bg-[#111] border border-[#222] rounded-xl text-xs text-[#666] space-y-1">
          <p className="font-semibold text-[#888] mb-2">Test Accounts:</p>
          <p>Admin: kabondobenjamin1@gmail.com / Admin@Kabondo123!</p>
          <p>Driver: testuser1@proj.com / TestUser1@123</p>
          <p>Rider: testuser2@proj.com / TestUser2@123</p>
        </div>
      </div>
    </div>
  )
}
