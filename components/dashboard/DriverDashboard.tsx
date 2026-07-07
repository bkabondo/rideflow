'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Car, Clock, CheckCircle, DollarSign, RefreshCw, Loader2, Calendar, MapPin, Users } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import type { RideflowUser, Ride, Inquiry } from '@/lib/types'

interface DriverDashboardProps { user: RideflowUser }

export default function DriverDashboard({ user }: DriverDashboardProps) {
  const [rides, setRides] = useState<Ride[]>([])
  const [reservations, setReservations] = useState<Inquiry[]>([])
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState<string | null>(null)
  const [completing, setCompleting] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    const [ridesRes, inqRes] = await Promise.all([fetch('/api/rides'), fetch('/api/inquiries')])
    if (ridesRes.ok) setRides(await ridesRes.json())
    if (inqRes.ok) {
      const all: Inquiry[] = await inqRes.json()
      // Show confirmed reservations assigned to this driver (hide payment info)
      setReservations(all.filter(i => i.driver_id === user.id && ['confirmed', 'in_progress'].includes(i.status)))
    }
    setLoading(false)
  }, [user.id])

  useEffect(() => { fetchData() }, [fetchData])

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('driver-rides')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rideflow_rides' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rideflow_inquiries' }, fetchData)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [fetchData])

  async function acceptRide(rideId: string) {
    setAccepting(rideId)
    const res = await fetch(`/api/rides/${rideId}/accept`, { method: 'PATCH' })
    setAccepting(null)
    if (res.ok) { toast.success('Ride accepted! Head to pickup.'); fetchData() }
    else { const err = await res.json(); toast.error(err.error) }
  }

  async function completeRide(rideId: string) {
    setCompleting(rideId)
    const res = await fetch(`/api/rides/${rideId}/complete`, { method: 'PATCH' })
    setCompleting(null)
    if (res.ok) { toast.success('Ride completed! Payment captured.'); fetchData() }
    else { const err = await res.json(); toast.error(err.error) }
  }

  const pendingRides = rides.filter(r => r.status === 'pending')
  const myRides = rides.filter(r => r.driver_id === user.id)
  const myActiveRide = myRides.find(r => ['accepted', 'in_progress'].includes(r.status))
  const myCompletedRides = myRides.filter(r => r.status === 'completed')
  const earnings = myCompletedRides.reduce((sum, r) => sum + (r.final_price || 0), 0)

  const card = 'bg-[#141414] border border-[#2A2A2A] rounded-2xl p-5'

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Rides Done', value: myCompletedRides.length, icon: <Car className="h-5 w-5" />, color: 'text-[#C9A028]' },
          { label: 'Earnings', value: `$${earnings.toFixed(2)}`, icon: <DollarSign className="h-5 w-5" />, color: 'text-green-400' },
          { label: 'Assigned', value: reservations.length + pendingRides.length, icon: <Clock className="h-5 w-5" />, color: 'text-yellow-400' },
        ].map(stat => (
          <div key={stat.label} className={card}>
            <div className={`${stat.color} mb-2`}>{stat.icon}</div>
            <p className="text-[#777] text-xs">{stat.label}</p>
            <p className="text-2xl font-bold text-[#F5F0E8]">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Assigned Reservations (from inquiry system) */}
      {reservations.length > 0 && (
        <div className={card + ' space-y-4'}>
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-[#C9A028]" />
            <h3 className="text-[#F5F0E8] font-semibold">Your Scheduled Reservations ({reservations.length})</h3>
          </div>
          <div className="space-y-3">
            {reservations.map(res => {
              const prefs = res.preferences || {}
              return (
                <div key={res.id} className="border border-[#C9A028]/20 bg-[#C9A028]/3 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded border border-[#C9A028]/40 text-[#C9A028] bg-[#C9A028]/10">
                      Reservation #{res.id.slice(0, 6).toUpperCase()}
                    </span>
                    <span className="text-xs text-[#888]">
                      {new Date(res.pickup_datetime).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                      {' · '}
                      {new Date(res.pickup_datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <div className="h-2 w-2 rounded-full bg-green-400 mt-1.5 flex-shrink-0" />
                      <div>
                        <p className="text-[10px] text-[#777]">Pickup</p>
                        <p className="text-sm text-[#E8E4DC]">{res.pickup_address}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="h-2 w-2 rounded-full bg-red-400 mt-1.5 flex-shrink-0" />
                      <div>
                        <p className="text-[10px] text-[#777]">Dropoff</p>
                        <p className="text-sm text-[#E8E4DC]">{res.dropoff_address}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-[#888]">
                    <span className="flex items-center gap-1"><Car className="h-3 w-3 text-[#C9A028]" /><span className="capitalize">{res.vehicle_type}</span></span>
                    <span className="flex items-center gap-1"><Users className="h-3 w-3 text-[#C9A028]" />{res.passengers} pax</span>
                    <span className="flex items-center gap-1"><MapPin className="h-3 w-3 text-[#C9A028]" /><span className="capitalize">{res.luggage}</span></span>
                  </div>

                  {/* Preferences (visible to driver) */}
                  {(prefs.occasion || prefs.music || prefs.temperature || (prefs.extras?.length ?? 0) > 0 || prefs.special_requests) && (
                    <div className="bg-[#0E0E0E] border border-[#2A2A2A] rounded-xl p-3 text-xs space-y-1 text-[#888]">
                      <p className="text-[#A08020] font-semibold mb-1.5">Client Preferences</p>
                      {prefs.occasion && <p>🎉 <span>{prefs.occasion}</span></p>}
                      {prefs.music && <p>🎵 <span>{prefs.music}</span></p>}
                      {prefs.temperature && <p>🌡️ <span>{prefs.temperature}</span></p>}
                      {(prefs.extras?.length ?? 0) > 0 && <p>✨ <span className="text-[#C9A028]">{prefs.extras?.join(', ')}</span></p>}
                      {prefs.special_requests && <p className="italic">"{prefs.special_requests}"</p>}
                    </div>
                  )}

                  {/* Rider info */}
                  {res.rider && (
                    <div className="flex items-center gap-2 pt-1">
                      <div className="h-7 w-7 rounded-full bg-[#C9A028] flex items-center justify-center text-xs font-bold text-black">
                        {res.rider.full_name?.charAt(0) ?? 'R'}
                      </div>
                      <div>
                        <p className="text-sm text-[#E8E4DC] font-medium">{res.rider.full_name}</p>
                        <p className="text-xs text-[#777]">⭐ {res.rider.rating?.toFixed(1)}</p>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Active Ride */}
      {myActiveRide && (
        <div className="bg-[#141414] border border-green-500/30 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Car className="h-5 w-5 text-green-400" />
            <h3 className="text-[#F5F0E8] font-semibold">Current Ride</h3>
            <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded border border-green-500/50 text-green-400 bg-green-500/10">Active</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { dot: 'bg-green-400', label: 'Pickup', val: myActiveRide.pickup_address },
              { dot: 'bg-red-400', label: 'Dropoff', val: myActiveRide.dropoff_address },
            ].map(row => (
              <div key={row.label} className="flex items-start gap-2">
                <div className={`h-2 w-2 rounded-full ${row.dot} mt-1.5 flex-shrink-0`} />
                <div><p className="text-[10px] text-[#777]">{row.label}</p><p className="text-sm text-[#F5F0E8]">{row.val}</p></div>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between pt-1">
            <p className="text-xl font-bold text-[#C9A028]">${myActiveRide.estimated_price?.toFixed(2)}</p>
            <div className="flex gap-2">
              <Link href={`/rides/${myActiveRide.id}`}>
                <button className="text-sm text-[#888] hover:text-[#C9A028] border border-[#2A2A2A] px-3 py-1.5 rounded-lg hover:border-[#C9A028]/50 transition-all">Details</button>
              </Link>
              <Button size="sm" className="bg-[#C9A028] hover:bg-[#B8901E] text-black font-bold"
                onClick={() => completeRide(myActiveRide.id)} disabled={completing === myActiveRide.id}>
                {completing === myActiveRide.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-1" />}
                Mark Complete
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Available Rides (instant book rides) */}
      <div className={card + ' space-y-4'}>
        <div className="flex items-center justify-between">
          <h3 className="text-[#F5F0E8] font-semibold">Available Rides ({pendingRides.length})</h3>
          <button onClick={fetchData} className="text-[#777] hover:text-[#C9A028] transition-colors p-1">
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
        {loading ? (
          <div className="text-center py-8 text-[#777]">Loading…</div>
        ) : pendingRides.length === 0 ? (
          <div className="text-center py-8">
            <Clock className="h-10 w-10 text-[#252525] mx-auto mb-2" />
            <p className="text-[#777]">No pending rides right now</p>
            <p className="text-xs text-[#666]">Check back soon!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingRides.map(ride => (
              <div key={ride.id} className="border border-[#2A2A2A] hover:border-[#C9A028]/30 rounded-xl p-4 transition-all">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded border border-yellow-500/50 text-yellow-400 bg-yellow-500/10 capitalize">{ride.ride_type}</span>
                      <span className="text-xs text-[#777]">{ride.distance_km?.toFixed(1)} km · {ride.duration_minutes} min</span>
                    </div>
                    {ride.rider && (
                      <div className="flex items-center gap-2 mb-2">
                        <div className="bg-[#C9A028] text-black rounded-full h-6 w-6 flex items-center justify-center text-xs font-bold">
                          {(ride.rider as {full_name?: string}).full_name?.charAt(0) ?? 'R'}
                        </div>
                        <span className="text-sm text-[#888]">{(ride.rider as {full_name?: string}).full_name ?? 'Rider'}</span>
                        <span className="text-xs text-[#777]">⭐ {((ride.rider as {rating?: number}).rating ?? 5.0).toFixed(1)}</span>
                      </div>
                    )}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-green-400 flex-shrink-0" />
                        <p className="text-sm text-[#888] truncate">{ride.pickup_address}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-red-400 flex-shrink-0" />
                        <p className="text-sm text-[#888] truncate">{ride.dropoff_address}</p>
                      </div>
                    </div>
                  </div>
                  <div className="ml-4 text-right flex-shrink-0">
                    <p className="text-xl font-bold text-[#C9A028]">${ride.estimated_price?.toFixed(2)}</p>
                    <Button size="sm" className="mt-2 bg-[#C9A028] hover:bg-[#B8901E] text-black font-bold"
                      onClick={() => acceptRide(ride.id)} disabled={!!accepting || !!myActiveRide}>
                      {accepting === ride.id ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Accept'}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Completed History */}
      {myCompletedRides.length > 0 && (
        <div className={card + ' space-y-4'}>
          <h3 className="text-[#F5F0E8] font-semibold">Completed Rides</h3>
          <div className="space-y-2">
            {myCompletedRides.slice(0, 10).map(ride => (
              <Link key={ride.id} href={`/rides/${ride.id}`}>
                <div className="flex items-center justify-between p-3.5 rounded-xl border border-[#2A2A2A] hover:bg-[#111] transition-all cursor-pointer">
                  <div>
                    <p className="text-sm text-[#888]">{ride.pickup_address} → {ride.dropoff_address}</p>
                    <p className="text-[10px] text-[#777]">{new Date(ride.created_at).toLocaleDateString()}</p>
                  </div>
                  <p className="font-bold text-[#C9A028]">${(ride.final_price || 0).toFixed(2)}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
