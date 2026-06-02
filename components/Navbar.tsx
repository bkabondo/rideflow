'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Car, LogOut, Star } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { RideflowUser } from '@/lib/types'

interface NavbarProps {
  user: RideflowUser
}

const roleColors: Record<string, string> = {
  admin: 'bg-purple-100 text-purple-700',
  driver: 'bg-green-100 text-green-700',
  rider: 'bg-blue-100 text-blue-700',
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
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2">
            <Car className="h-6 w-6 text-blue-600" />
            <span className="text-xl font-bold text-gray-900">RideFlow</span>
          </Link>
          <nav className="hidden md:flex gap-4">
            <Link href="/dashboard" className="text-sm text-gray-600 hover:text-gray-900">Dashboard</Link>
            {user.role === 'rider' && (
              <Link href="/book" className="text-sm text-gray-600 hover:text-gray-900">Book Ride</Link>
            )}
            {user.role === 'admin' && (
              <Link href="/admin" className="text-sm text-gray-600 hover:text-gray-900">Admin Panel</Link>
            )}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2">
            <span className="text-sm text-gray-600">{user.full_name || user.email}</span>
            <Badge className={roleColors[user.role] || 'bg-gray-100 text-gray-700'}>
              {user.role}
            </Badge>
            <div className="flex items-center gap-1 text-sm text-amber-500">
              <Star className="h-3.5 w-3.5 fill-amber-500" />
              <span>{user.rating?.toFixed(1) || '5.0'}</span>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            className="text-gray-600 hover:text-red-600"
          >
            <LogOut className="h-4 w-4" />
            <span className="ml-1 hidden sm:inline">Sign out</span>
          </Button>
        </div>
      </div>
    </header>
  )
}
