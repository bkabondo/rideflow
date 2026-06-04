'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Car, Clock, MapPin, CheckCircle, DollarSign, RefreshCw, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { RideflowUser, Ride } from '@/lib/types'

interface DriverDashboardProps {
  user: RideflowUser
}

export default function DriverDashboard({ user }: DriverDashboardProps) {
  const [rides, setRides] = useState<Ride[]>([])
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState<string | null>(null)
  const [completing, setCompleting] = useState<string | null>(null)

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
      .channel('driver-rides')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rideflow_rides' }, () => {
        fetchRides()
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [fetchRides])

  async function acceptRide(rideId: string) {
    setAccepting(rideId)
    const res = await fetch(`/api/rides/${rideId}/accept`, { method: 'PATCH' })
    setAccepting(null)
    if (res.ok) {
      toast.success('Ride accepted! Head to pickup location.')
      fetchRides()
    } else {
      const err = await res.json()
      toast.error(err.error)
    }
  }

  async function completeRide(rideId: string) {
    setCompleting(rideId)
    const res = await fetch(`/api/rides/${rideId}/complete`, { method: 'PATCH' })
    setCompleting(null)
    if (res.ok) {
      toast.success('Ride completed! Payment captured.')
      fetchRides()
    } else {
      const err = await res.json()
      toast.error(err.error)
    }
  }

  const pendingRides = rides.filter(r => r.status === 'pending')
  const myRides = rides.filter(r => r.driver_id === user.id)
  const myActiveRide = myRides.find(r => ['accepted', 'in_progress'].includes(r.status))
  const myCompletedRides = myRides.filter(r => r.status === 'completed')
  const earnings = myCompletedRides.reduce((sum, r) => sum + (r.final_price || 0), 0)

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
                <p className="text-2xl font-bold">{myCompletedRides.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="bg-green-100 p-2 rounded-lg"><DollarSign className="h-5 w-5 text-green-600" /></div>
              <div>
                <p className="text-sm text-gray-500">Total Earnings</p>
                <p className="text-2xl font-bold">${earnings.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="bg-yellow-100 p-2 rounded-lg"><Clock className="h-5 w-5 text-yellow-600" /></div>
              <div>
                <p className="text-sm text-gray-500">Pending Rides</p>
                <p className="text-2xl font-bold">{pendingRides.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Current Active Ride */}
      {myActiveRide && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Car className="h-5 w-5 text-green-600" />
              Current Ride
              <Badge className="bg-green-100 text-green-700">Active</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-green-600 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-500">Pickup</p>
                  <p className="font-medium text-sm">{myActiveRide.pickup_address}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-red-600 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-500">Dropoff</p>
                  <p className="font-medium text-sm">{myActiveRide.dropoff_address}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between pt-2">
              <p className="text-lg font-bold text-green-700">${myActiveRide.estimated_price?.toFixed(2)}</p>
              <div className="flex gap-2">
                <Link href={`/rides/${myActiveRide.id}`}>
                  <Button variant="outline" size="sm">Details</Button>
                </Link>
                <Button
                  size="sm"
                  className="bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => completeRide(myActiveRide.id)}
                  disabled={completing === myActiveRide.id}
                >
                  {completing === myActiveRide.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-1" />}
                  Mark Complete
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Available Rides */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Available Rides ({pendingRides.length})</CardTitle>
          <Button variant="ghost" size="sm" onClick={fetchRides}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-gray-400">Loading rides...</div>
          ) : pendingRides.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="h-10 w-10 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500">No pending rides available</p>
              <p className="text-sm text-gray-400">Check back soon!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingRides.map((ride) => (
                <div key={ride.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className="bg-yellow-100 text-yellow-700 capitalize">{ride.ride_type}</Badge>
                        <span className="text-sm text-gray-500">{ride.distance_km?.toFixed(1)} km • {ride.duration_minutes} min</span>
                      </div>
                      {/* Rider info */}
                      {ride.rider && (
                        <div className="flex items-center gap-2 mb-2 text-sm text-gray-600">
                          <div className="bg-gray-200 rounded-full h-6 w-6 flex items-center justify-center text-xs font-bold">
                            {(ride.rider as {full_name?: string}).full_name?.charAt(0) ?? 'R'}
                          </div>
                          <span>{(ride.rider as {full_name?: string}).full_name ?? 'Rider'}</span>
                          <span className="text-gray-400">⭐ {((ride.rider as {rating?: number}).rating ?? 5.0).toFixed(1)}</span>
                        </div>
                      )}
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-green-500" />
                          <p className="text-sm truncate">{ride.pickup_address}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-red-500" />
                          <p className="text-sm truncate">{ride.dropoff_address}</p>
                        </div>
                      </div>
                    </div>
                    <div className="ml-4 text-right">
                      <p className="text-xl font-bold text-green-700">${ride.estimated_price?.toFixed(2)}</p>
                      <Button
                        size="sm"
                        className="mt-2 bg-blue-600 hover:bg-blue-700 text-white"
                        onClick={() => acceptRide(ride.id)}
                        disabled={!!accepting || !!myActiveRide}
                      >
                        {accepting === ride.id ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Accept'}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ride History */}
      {myCompletedRides.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Completed Rides</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {myCompletedRides.slice(0, 10).map((ride) => (
                <Link key={ride.id} href={`/rides/${ride.id}`}>
                  <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50 transition-colors cursor-pointer">
                    <div>
                      <p className="text-sm font-medium">{ride.pickup_address} → {ride.dropoff_address}</p>
                      <p className="text-xs text-gray-400">{new Date(ride.created_at).toLocaleDateString()}</p>
                    </div>
                    <p className="font-bold text-green-700">${(ride.final_price || 0).toFixed(2)}</p>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
