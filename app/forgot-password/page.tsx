'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Car, Mail } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/auth/reset-password`,
    })
    setLoading(false)
    if (error) toast.error(error.message)
    else setSent(true)
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-4" style={{ background: 'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(201,160,40,0.08) 0%, #0A0A0A 70%)' }}>
      <div className="w-full max-w-md">

        <div className="flex items-center justify-center gap-3 mb-10">
          <div className="h-10 w-10 rounded-xl bg-[#C9A028] flex items-center justify-center shadow-lg shadow-[#C9A028]/20">
            <Car className="h-5 w-5 text-black" />
          </div>
          <span className="text-3xl font-bold text-[#F0ECE4] tracking-tight">
            Ride<span className="text-[#C9A028]">Flow</span>
          </span>
        </div>

        <div className="bg-[#111111] border border-[#2A2A2A] rounded-2xl p-8 shadow-2xl">
          {sent ? (
            <div className="text-center space-y-5">
              <div className="h-16 w-16 rounded-full bg-[#C9A028]/10 border border-[#C9A028]/30 flex items-center justify-center mx-auto text-3xl">
                📬
              </div>
              <div>
                <h1 className="text-xl font-bold text-[#F0ECE4] mb-2">Check Your Inbox</h1>
                <p className="text-[#777] text-sm">
                  We sent a reset link to <strong className="text-[#C9A028]">{email}</strong>
                </p>
              </div>
              <Link href="/login"
                className="block w-full border border-[#363636] text-[#888] hover:border-[#C9A028] hover:text-[#C9A028] rounded-xl py-3 text-sm font-medium text-center transition-colors">
                Back to Sign In
              </Link>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-[#F0ECE4] mb-1">Reset Password</h1>
              <p className="text-[#666] text-sm mb-8">Enter your email to receive a reset link</p>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-[#A08020] text-[10px] font-bold uppercase tracking-widest">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#555]" />
                    <input type="email" placeholder="you@example.com" value={email}
                      onChange={e => setEmail(e.target.value)} required
                      className="w-full bg-[#1C1C1C] border border-[#363636] focus:border-[#C9A028] text-[#F0ECE4] placeholder:text-[#555] rounded-xl px-4 py-3 pl-11 text-sm focus:outline-none transition-colors" />
                  </div>
                </div>
                <button type="submit" disabled={loading}
                  className="w-full bg-[#C9A028] hover:bg-[#B8901E] disabled:opacity-60 text-black font-bold rounded-xl py-3.5 text-sm transition-colors">
                  {loading ? 'Sending…' : 'Send Reset Link'}
                </button>
              </form>
              <p className="text-[#666] text-sm text-center mt-6">
                Remember it?{' '}
                <Link href="/login" className="text-[#C9A028] hover:text-[#E8B830] font-medium transition-colors">Sign in</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
