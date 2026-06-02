'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Car, Users, DollarSign, TrendingUp, RefreshCw, Shield } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { RideflowUser, Ride } from '@/lib/types'

interface AdminDashboardProps {
  user: RideflowUser
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  accepted: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-purple-100 text-purple-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
}

export default function AdminDashboard({ user: _user }: AdminDashboardProps) {
  const [rides, setRides] = useState<Ride[]>([])
  const [users, setUsers] = useState<RideflowUser[]>([])
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  const fetchData = useCallback(async () => {
    const [ridesRes, usersData] = await Promise.all([
      fetch('/api/rides'),
      supabase.from('rideflow_users').select('*').order('created_at', { ascending: false }),
    ])

    if (ridesRes.ok) setRides(await ridesRes.json())
    if (!usersData.error) setUsers(usersData.data || [])
    setLoading(false)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const totalRevenue = rides.filter(r => r.status === 'completed').reduce((sum, r) => sum + (r.final_price || 0), 0)
  const activeDrivers = users.filter(u => u.role === 'driver').length
  const totalRiders = users.filter(u => u.role === 'rider').length
  const completedRides = rides.filter(r => r.status === 'completed').length
  const pendingRides = rides.filter(r => r.status === 'pending').length

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Shield className="h-6 w-6 text-purple-600" />
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Revenue', value: `$${totalRevenue.toFixed(2)}`, icon: <DollarSign className="h-5 w-5 text-green-600" />, bg: 'bg-green-100' },
          { label: 'Total Rides', value: rides.length, icon: <Car className="h-5 w-5 text-blue-600" />, bg: 'bg-blue-100' },
          { label: 'Active Drivers', value: activeDrivers, icon: <Users className="h-5 w-5 text-purple-600" />, bg: 'bg-purple-100' },
          { label: 'Total Riders', value: totalRiders, icon: <TrendingUp className="h-5 w-5 text-amber-600" />, bg: 'bg-amber-100' },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className={`${stat.bg} p-2 rounded-lg`}>{stat.icon}</div>
                <div>
                  <p className="text-sm text-gray-500">{stat.label}</p>
                  <p className="text-xl font-bold">{stat.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Completed', value: completedRides, color: 'text-green-600' },
          { label: 'Pending', value: pendingRides, color: 'text-yellow-600' },
          { label: 'Cancelled', value: rides.filter(r => r.status === 'cancelled').length, color: 'text-red-600' },
          { label: 'In Progress', value: rides.filter(r => ['accepted', 'in_progress'].includes(r.status)).length, color: 'text-blue-600' },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-6 text-center">
              <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-sm text-gray-500 mt-1">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* All Rides */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>All Rides ({rides.length})</CardTitle>
          <Button variant="ghost" size="sm" onClick={fetchData}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-gray-400">Loading...</div>
          ) : rides.length === 0 ? (
            <div className="text-center py-8 text-gray-400">No rides yet</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 text-gray-500 font-medium">Ride</th>
                    <th className="text-left py-2 text-gray-500 font-medium">Type</th>
                    <th className="text-left py-2 text-gray-500 font-medium">Status</th>
                    <th className="text-left py-2 text-gray-500 font-medium">Price</th>
                    <th className="text-left py-2 text-gray-500 font-medium">Date</th>
                    <th className="text-left py-2 text-gray-500 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rides.map((ride) => (
                    <tr key={ride.id} className="border-b hover:bg-gray-50">
                      <td className="py-2">
                        <div className="max-w-xs">
                          <p className="font-medium truncate">{ride.pickup_address}</p>
                          <p className="text-gray-400 truncate">{ride.dropoff_address}</p>
                        </div>
                      </td>
                      <td className="py-2">
                        <Badge className="capitalize">{ride.ride_type}</Badge>
                      </td>
                      <td className="py-2">
                        <Badge className={statusColors[ride.status] || 'bg-gray-100'}>
                          {ride.status.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className="py-2 font-medium">
                        ${(ride.final_price || ride.estimated_price || 0).toFixed(2)}
                      </td>
                      <td className="py-2 text-gray-500">
                        {new Date(ride.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-2">
                        <Link href={`/rides/${ride.id}`}>
                          <Button variant="ghost" size="sm">View</Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* All Users */}
      <Card>
        <CardHeader>
          <CardTitle>All Users ({users.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 text-gray-500 font-medium">User</th>
                  <th className="text-left py-2 text-gray-500 font-medium">Role</th>
                  <th className="text-left py-2 text-gray-500 font-medium">Rating</th>
                  <th className="text-left py-2 text-gray-500 font-medium">Joined</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b hover:bg-gray-50">
                    <td className="py-2">
                      <p className="font-medium">{u.full_name || 'N/A'}</p>
                      <p className="text-gray-400">{u.email}</p>
                    </td>
                    <td className="py-2">
                      <Badge className={
                        u.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                        u.role === 'driver' ? 'bg-green-100 text-green-700' :
                        'bg-blue-100 text-blue-700'
                      }>
                        {u.role}
                      </Badge>
                    </td>
                    <td className="py-2">⭐ {u.rating?.toFixed(1) || '5.0'}</td>
                    <td className="py-2 text-gray-500">{new Date(u.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
