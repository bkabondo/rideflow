'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Car, Plus, Clock, MapPin, CheckCircle, XCircle, RefreshCw, Calendar, Send } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import type { RideflowUser, Ride, Inquiry } from '@/lib/types'

const statusConfig: Record<string, { label: string; color: string }> = {
  pending:     { label: 'Pending',     color: 'border-yellow-500/50 text-yellow-400 bg-yellow-500/10' },
  accepted:    { label: 'Accepted',    color: 'border-blue-500/50 text-blue-400 bg-blue-500/10' },
  in_progress: { label: 'In Progress', color: 'border-purple-500/50 text-purple-400 bg-purple-500/10' },
  completed:   { label: 'Completed',   color: 'border-green-500/50 text-green-400 bg-green-500/10' },
  cancelled:   { label: 'Cancelled',   color: 'border-red-500/50 text-red-400 bg-red-500/10' },
}

const INQUIRY_STATUS: Record<string, { label: string; color: string }> = {
  inquiry:     { label: 'Awaiting Quote', color: 'border-yellow-500/50 text-yellow-400 bg-yellow-500/10' },
  quoted:      { label: 'Quote Ready',    color: 'border-[#C9A028]/60 text-[#C9A028] bg-[#C9A028]/10' },
  confirmed:   { label: 'Confirmed',      color: 'border-green-500/50 text-green-400 bg-green-500/10' },
  declined:    { label: 'Declined',       color: 'border-red-500/50 text-red-400 bg-red-500/10' },
  cancelled:   { label: 'Cancelled',      color: 'border-[#333] text-[#777] bg-[#111]' },
  in_progress: { label: 'In Progress',    color: 'border-purple-500/50 text-purple-400 bg-purple-500/10' },
  completed:   { label: 'Completed',      color: 'border-green-500/50 text-green-400 bg-green-500/10' },
}

interface RiderDashboardProps { user: RideflowUser }

export default function RiderDashboard({ user }: RiderDashboardProps) {
  const [rides, setRides] = useState<Ride[]>([])
  const [inquiries, setInquiries] = useState<Inquiry[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    const [ridesRes, inquiriesRes] = await Promise.all([
      fetch('/api/rides'),
      fetch('/api/inquiries'),
    ])
    if (ridesRes.ok) setRides(await ridesRes.json())
    if (inquiriesRes.ok) setInquiries(await inquiriesRes.json())
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('rider-rides')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rideflow_rides', filter: `rider_id=eq.${user.id}` }, fetchData)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [user.id, fetchData])

  async function cancelRide(rideId: string) {
    const res = await fetch(`/api/rides/${rideId}/cancel`, { method: 'PATCH' })
    if (res.ok) { toast.success('Ride cancelled'); fetchData() }
    else { const err = await res.json(); toast.error(err.error) }
  }

  const activeRide = rides.find(r => ['pending', 'accepted', 'in_progress'].includes(r.status))
  const completedRides = rides.filter(r => r.status === 'completed')
  const totalSpent = completedRides.reduce((sum, r) => sum + (r.final_price || 0), 0)
  const quotedInquiries = inquiries.filter(i => i.status === 'quoted')

  const card = 'bg-[#141414] border border-[#2A2A2A] rounded-2xl p-5'

  return (
    <div className="space-y-6">
      {/* Quote Alert */}
      {quotedInquiries.length > 0 && (
        <div className="bg-[#C9A028]/10 border border-[#C9A028]/40 rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-2 w-2 rounded-full bg-[#C9A028] animate-pulse" />
            <p className="text-[#C9A028] font-semibold text-sm">
              {quotedInquiries.length} quote{quotedInquiries.length > 1 ? 's' : ''} ready for your review
            </p>
          </div>
          <Link href={`/inquiries/${quotedInquiries[0].id}`}>
            <button className="text-xs font-bold text-black bg-[#C9A028] px-3 py-1.5 rounded-lg hover:bg-[#B8901E] transition-colors">
              View Quote
            </button>
          </Link>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Rides', value: rides.length, icon: <Car className="h-5 w-5" />, color: 'text-[#C9A028]' },
          { label: 'Completed', value: completedRides.length, icon: <CheckCircle className="h-5 w-5" />, color: 'text-green-400' },
          { label: 'Total Spent', value: `$${totalSpent.toFixed(2)}`, icon: <span className="font-bold text-sm">$</span>, color: 'text-purple-400' },
        ].map(stat => (
          <div key={stat.label} className={card}>
            <div className={`${stat.color} mb-2`}>{stat.icon}</div>
            <p className="text-[#777] text-xs">{stat.label}</p>
            <p className="text-2xl font-bold text-[#F5F0E8]">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* CTAs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-[#141414] border-2 border-[#C9A028]/30 hover:border-[#C9A028]/60 rounded-2xl p-5 text-center transition-colors group">
          <div className="h-12 w-12 rounded-xl bg-[#C9A028]/10 flex items-center justify-center mx-auto mb-3 group-hover:bg-[#C9A028]/20 transition-colors">
            <Calendar className="h-6 w-6 text-[#C9A028]" />
          </div>
          <h3 className="font-semibold text-[#F5F0E8] mb-1">Reserve a Black Car</h3>
          <p className="text-[#777] text-xs mb-4">Schedule luxury rides in advance</p>
          <Link href="/reserve">
            <Button className="bg-[#C9A028] hover:bg-[#B8901E] text-black font-bold w-full">
              <Send className="h-4 w-4 mr-2" />Reserve a Ride
            </Button>
          </Link>
        </div>
        {!activeRide && (
          <div className={card + ' text-center'}>
            <div className="h-12 w-12 rounded-xl bg-[#1A1A1A] flex items-center justify-center mx-auto mb-3">
              <Car className="h-6 w-6 text-[#777]" />
            </div>
            <h3 className="font-semibold text-[#F5F0E8] mb-1">Instant Ride</h3>
            <p className="text-[#777] text-xs mb-4">Economy, Comfort or Premium now</p>
            <Link href="/book">
              <Button className="bg-[#1A1A1A] hover:bg-[#222] text-[#888] border border-[#2A2A2A] w-full">
                <Plus className="h-4 w-4 mr-2" />Book Now
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* Reservations */}
      {inquiries.length > 0 && (
        <div className={card + ' space-y-4'}>
          <div className="flex items-center justify-between">
            <h3 className="text-[#F5F0E8] font-semibold flex items-center gap-2">
              <Calendar className="h-4 w-4 text-[#C9A028]" />My Reservations
            </h3>
          </div>
          <div className="space-y-2">
            {inquiries.map(inq => {
              const sc = INQUIRY_STATUS[inq.status] || INQUIRY_STATUS.inquiry
              return (
                <Link key={inq.id} href={`/inquiries/${inq.id}`}>
                  <div className="flex items-center justify-between p-3.5 rounded-xl border border-[#2A2A2A] hover:border-[#C9A028]/30 hover:bg-[#111] transition-all cursor-pointer group">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded border ${sc.color}`}>{sc.label}</span>
                        <span className="text-[10px] text-[#777] capitalize">{inq.vehicle_type}</span>
                      </div>
                      <p className="text-sm text-[#888] group-hover:text-[#F5F0E8] truncate transition-colors">
                        {inq.pickup_address} → {inq.dropoff_address}
                      </p>
                      <p className="text-[10px] text-[#777] mt-0.5">{new Date(inq.pickup_datetime).toLocaleString()}</p>
                    </div>
                    <div className="text-right ml-3 flex-shrink-0">
                      {inq.quoted_amount ? (
                        <p className="font-bold text-[#C9A028]">${inq.quoted_amount.toFixed(2)}</p>
                      ) : inq.market_ref_price ? (
                        <p className="text-[#777] text-xs">~${inq.market_ref_price.toFixed(2)}</p>
                      ) : null}
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* Active Ride */}
      {activeRide && (
        <div className="bg-[#141414] border border-[#C9A028]/30 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Car className="h-5 w-5 text-[#C9A028]" />
            <h3 className="text-[#F5F0E8] font-semibold">Active Ride</h3>
            <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded border ${statusConfig[activeRide.status]?.color}`}>
              {statusConfig[activeRide.status]?.label}
            </span>
          </div>
          {activeRide.driver && (
            <div className="flex items-center gap-3 bg-[#111] rounded-xl p-3">
              <div className="bg-[#C9A028] text-black rounded-full h-9 w-9 flex items-center justify-center font-bold text-sm">
                {(activeRide.driver as {full_name?: string}).full_name?.charAt(0) ?? 'D'}
              </div>
              <div>
                <p className="font-semibold text-[#F5F0E8] text-sm">{(activeRide.driver as {full_name?: string}).full_name ?? 'Your Driver'}</p>
                <p className="text-[10px] text-[#777]">⭐ {((activeRide.driver as {rating?: number}).rating ?? 5.0).toFixed(1)} · On the way</p>
              </div>
            </div>
          )}
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <div className="h-2 w-2 rounded-full bg-green-400 mt-1.5 flex-shrink-0" />
              <div><p className="text-[10px] text-[#777]">Pickup</p><p className="text-sm text-[#F5F0E8]">{activeRide.pickup_address}</p></div>
            </div>
            <div className="flex items-start gap-2">
              <div className="h-2 w-2 rounded-full bg-red-400 mt-1.5 flex-shrink-0" />
              <div><p className="text-[10px] text-[#777]">Dropoff</p><p className="text-sm text-[#F5F0E8]">{activeRide.dropoff_address}</p></div>
            </div>
          </div>
          <div className="flex items-center justify-between pt-1">
            <p className="text-xl font-bold text-[#C9A028]">${activeRide.estimated_price?.toFixed(2)}</p>
            <div className="flex gap-2">
              <Link href={`/rides/${activeRide.id}`}>
                <button className="text-sm text-[#888] hover:text-[#C9A028] border border-[#2A2A2A] px-3 py-1.5 rounded-lg hover:border-[#C9A028]/50 transition-all">Details</button>
              </Link>
              {activeRide.status === 'pending' && (
                <button onClick={() => cancelRide(activeRide.id)}
                  className="text-sm text-red-400 hover:text-red-300 border border-red-800/40 px-3 py-1.5 rounded-lg hover:bg-red-900/20 transition-all">
                  Cancel
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Ride History */}
      <div className={card + ' space-y-4'}>
        <div className="flex items-center justify-between">
          <h3 className="text-[#F5F0E8] font-semibold">Ride History</h3>
          <button onClick={fetchData} className="text-[#777] hover:text-[#C9A028] transition-colors p-1">
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
        {loading ? (
          <div className="text-center py-8 text-[#777]">Loading…</div>
        ) : rides.length === 0 ? (
          <div className="text-center py-8 text-[#777]">No rides yet. Reserve your first ride above.</div>
        ) : (
          <div className="space-y-2">
            {rides.map((ride) => {
              const sc = statusConfig[ride.status] || statusConfig.pending
              return (
                <Link key={ride.id} href={`/rides/${ride.id}`}>
                  <div className="flex items-center justify-between p-3.5 rounded-xl border border-[#2A2A2A] hover:border-[#2A2A2A] hover:bg-[#111] transition-all cursor-pointer">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded border ${sc.color}`}>{sc.label}</span>
                        <span className="text-[10px] text-[#777] capitalize">{ride.ride_type}</span>
                      </div>
                      <p className="text-sm text-[#888] truncate">{ride.pickup_address} → {ride.dropoff_address}</p>
                      <p className="text-[10px] text-[#777]">{new Date(ride.created_at).toLocaleDateString()}</p>
                    </div>
                    <p className="font-bold text-[#F5F0E8] ml-3">${(ride.final_price || ride.estimated_price || 0).toFixed(2)}</p>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
