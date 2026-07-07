'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Car, Lock } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) { toast.error('Passwords do not match'); return }
    if (password.length < 8) { toast.error('Password must be at least 8 characters'); return }
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (error) toast.error(error.message)
    else { toast.success('Password updated!'); router.push('/dashboard') }
  }

  const inputCls = `w-full bg-[#1C1C1C] border border-[#363636] focus:border-[#C9A028] text-[#F0ECE4]
    placeholder:text-[#555] rounded-xl px-4 py-3 pl-11 text-sm focus:outline-none transition-colors`

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
          <h1 className="text-2xl font-bold text-[#F0ECE4] mb-1">Set New Password</h1>
          <p className="text-[#666] text-sm mb-8">Choose a strong password for your account</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-[#A08020] text-[10px] font-bold uppercase tracking-widest">New Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#555]" />
                <input type="password" placeholder="Min. 8 characters" value={password}
                  onChange={e => setPassword(e.target.value)} required className={inputCls} />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[#A08020] text-[10px] font-bold uppercase tracking-widest">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#555]" />
                <input type="password" placeholder="••••••••" value={confirm}
                  onChange={e => setConfirm(e.target.value)} required className={inputCls} />
              </div>
            </div>
            <button type="submit" disabled={loading}
              className="w-full bg-[#C9A028] hover:bg-[#B8901E] disabled:opacity-60 text-black font-bold rounded-xl py-3.5 text-sm transition-colors mt-2">
              {loading ? 'Updating…' : 'Update Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
