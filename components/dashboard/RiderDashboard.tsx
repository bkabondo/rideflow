'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Car, Plus, Clock, MapPin, CheckCircle, XCircle, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { RideflowUser, Ride } from '@/lib/types'

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-700', icon: <Clock className="h-3 w-3" /> },
  accepted: { label: 'Accepted', color: 'bg-blue-100 text-blue-700', icon: <Car className="h-3 w-3" /> },
  in_progress: { label: 'In Progress', color: 'bg-purple-100 text-purple-700', icon: <Car className="h-3 w-3" /> },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-700', icon: <CheckCircle className="h-3 w-3" /> },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-700', icon: <XCircle className="h-3 w-3" /> },
}

interface RiderDashboardProps {
  user: RideflowUser
}

export default function RiderDashboard({ user }: RiderDashboardProps) {
  const [rides, setRides] = useState<Ride[]>([])
  const [loading, setLoading] = useState(true)

  const fetchRides = useCallback(async () => {
    const res = await fetch('/api/rides')
    if (res.ok) {
      const data = await res.json()
      setRides(data)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchRides()
  }, [fetchRides])

  // Real-time updates
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('rider-rides')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rideflow_rides', filter: `rider_id=eq.${user.id}` }, () => {
        fetchRides()
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [user.id, fetchRides])

  async function cancelRide(rideId: string) {
    const res = await fetch(`/api/rides/${rideId}/cancel`, { method: 'PATCH' })
    if (res.ok) {
      toast.success('Ride cancelled')
      fetchRides()
    } else {
      const err = await res.json()
      toast.error(err.error)
    }
  }

  const activeRide = rides.find(r => ['pending', 'accepted', 'in_progress'].includes(r.status))
  const completedRides = rides.filter(r => r.status === 'completed')
  const totalSpent = completedRides.reduce((sum, r) => sum + (r.final_price || 0), 0)

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 p-2 rounded-lg"><Car className="h-5 w-5 text-blue-600" /></div>
              <div>
                <p className="text-sm text-gray-500">Total Rides</p>
                <p className="text-2xl font-bold">{rides.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="bg-green-100 p-2 rounded-lg"><CheckCircle className="h-5 w-5 text-green-600" /></div>
              <div>
                <p className="text-sm text-gray-500">Completed</p>
                <p className="text-2xl font-bold">{completedRides.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="bg-purple-100 p-2 rounded-lg"><span className="text-purple-600 font-bold text-sm">$</span></div>
              <div>
                <p className="text-sm text-gray-500">Total Spent</p>
                <p className="text-2xl font-bold">${totalSpent.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Book a Ride CTA */}
      {!activeRide && (
        <Card className="border-dashed border-2 border-blue-200 bg-blue-50">
          <CardContent className="pt-6 text-center">
            <Car className="h-12 w-12 text-blue-400 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Ready to go somewhere?</h3>
            <p className="text-gray-500 mb-4">Book a ride in seconds</p>
            <Link href="/book">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                <Plus className="h-4 w-4 mr-2" />
                Book a Ride
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Active Ride */}
      {activeRide && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Car className="h-5 w-5 text-blue-600" />
              Active Ride
              <Badge className={statusConfig[activeRide.status]?.color}>
                {statusConfig[activeRide.status]?.label}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 text-green-600 mt-0.5" />
              <div>
                <p className="text-xs text-gray-500">Pickup</p>
                <p className="font-medium">{activeRide.pickup_address}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 text-red-600 mt-0.5" />
              <div>
                <p className="text-xs text-gray-500">Dropoff</p>
                <p className="font-medium">{activeRide.dropoff_address}</p>
              </div>
            </div>
            <div className="flex items-center justify-between pt-2">
              <div>
                <p className="text-sm text-gray-500">Estimated Price</p>
                <p className="text-xl font-bold text-green-700">${activeRide.estimated_price?.toFixed(2)}</p>
              </div>
              <div className="flex gap-2">
                <Link href={`/rides/${activeRide.id}`}>
                  <Button variant="outline" size="sm">View Details</Button>
                </Link>
                {activeRide.status === 'pending' && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => cancelRide(activeRide.id)}
                  >
                    Cancel
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Ride History */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Ride History</CardTitle>
          <Button variant="ghost" size="sm" onClick={fetchRides}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-gray-400">Loading rides...</div>
          ) : rides.length === 0 ? (
            <div className="text-center py-8 text-gray-400">No rides yet. Book your first ride!</div>
          ) : (
            <div className="space-y-3">
              {rides.map((ride) => {
                const sc = statusConfig[ride.status] || statusConfig.pending
                return (
                  <Link key={ride.id} href={`/rides/${ride.id}`}>
                    <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50 transition-colors cursor-pointer">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className={sc.color + ' flex items-center gap-1'}>
                            {sc.icon}
                            {sc.label}
                          </Badge>
                          <span className="text-xs text-gray-400 capitalize">{ride.ride_type}</span>
                        </div>
                        <p className="text-sm font-medium truncate">{ride.pickup_address} → {ride.dropoff_address}</p>
                        <p className="text-xs text-gray-400">{new Date(ride.created_at).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right ml-3">
                        <p className="font-bold text-gray-800">${(ride.final_price || ride.estimated_price || 0).toFixed(2)}</p>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
