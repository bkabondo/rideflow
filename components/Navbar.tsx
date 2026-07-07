'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Car, LogOut, Star, LayoutDashboard, Calendar } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import type { RideflowUser } from '@/lib/types'

interface NavbarProps { user: RideflowUser | null }

const ROLE_BADGE: Record<string, string> = {
  admin:  'border-purple-500/60 text-purple-400 bg-purple-500/10',
  driver: 'border-green-500/60 text-green-400 bg-green-500/10',
  rider:  'border-[#C9A028]/60 text-[#C9A028] bg-[#C9A028]/10',
}

export default function Navbar({ user }: NavbarProps) {
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    toast.success('Signed out')
    router.push('/')
    router.refresh()
  }

  return (
    <header className="bg-[#0E0E0E] border-b border-[#2A2A2A] sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="h-8 w-8 rounded-lg bg-[#C9A028] flex items-center justify-center">
              <Car className="h-4 w-4 text-black" />
            </div>
            <span className="text-lg font-bold text-[#F5F0E8] group-hover:text-[#C9A028] transition-colors tracking-tight">
              Ride<span className="text-[#C9A028] group-hover:text-[#F5F0E8] transition-colors">Flow</span>
            </span>
          </Link>
          {user && (
            <nav className="hidden md:flex items-center gap-6">
              <Link href="/dashboard" className="flex items-center gap-1.5 text-sm text-[#777] hover:text-[#C9A028] transition-colors font-medium">
                <LayoutDashboard className="h-3.5 w-3.5" />Dashboard
              </Link>
              {user.role === 'rider' && (
                <Link href="/reserve" className="flex items-center gap-1.5 text-sm text-[#777] hover:text-[#C9A028] transition-colors font-medium">
                  <Calendar className="h-3.5 w-3.5" />Reserve
                </Link>
              )}
            </nav>
          )}
        </div>
        <div className="flex items-center gap-4">
          {user ? (
            <>
              <div className="hidden sm:flex items-center gap-3">
                <span className="text-sm text-[#888]">{user.full_name || user.email}</span>
                <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border ${ROLE_BADGE[user.role] || 'border-[#333] text-[#888]'}`}>
                  {user.role}
                </span>
                {user.rating && (
                  <div className="flex items-center gap-1 text-sm text-[#C9A028]">
                    <Star className="h-3.5 w-3.5 fill-[#C9A028]" />
                    <span>{user.rating.toFixed(1)}</span>
                  </div>
                )}
              </div>
              <button onClick={handleSignOut}
                className="flex items-center gap-1.5 text-sm text-[#777] hover:text-red-400 transition-colors font-medium px-3 py-1.5 rounded-lg hover:bg-red-500/10">
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Sign out</span>
              </button>
            </>
          ) : (
            <Link href="/login" className="text-sm text-[#777] hover:text-[#C9A028] transition-colors font-medium px-3 py-1.5 rounded-lg hover:bg-white/5">
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}
