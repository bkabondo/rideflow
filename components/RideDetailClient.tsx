'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { MapPin, User, Car, Star, CreditCard, Clock, CheckCircle, XCircle, Loader2, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { Ride, RideflowUser, Rating } from '@/lib/types'

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-700', icon: <Clock className="h-4 w-4" /> },
  accepted: { label: 'Driver Assigned', color: 'bg-blue-100 text-blue-700', icon: <Car className="h-4 w-4" /> },
  in_progress: { label: 'In Progress', color: 'bg-purple-100 text-purple-700', icon: <Car className="h-4 w-4" /> },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-700', icon: <CheckCircle className="h-4 w-4" /> },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-700', icon: <XCircle className="h-4 w-4" /> },
}

interface RideDetailClientProps {
  ride: Ride & { rider?: RideflowUser; driver?: RideflowUser }
  user: RideflowUser
  existingRating: Rating | null
}

export default function RideDetailClient({ ride, user, existingRating }: RideDetailClientProps) {
  const router = useRouter()
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [submittingRating, setSubmittingRating] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [completing, setCompleting] = useState(false)
  const [accepting, setAccepting] = useState(false)

  const sc = statusConfig[ride.status] || statusConfig.pending
  const isRider = ride.rider_id === user.id
  const isDriver = ride.driver_id === user.id
  const isAdmin = user.role === 'admin'

  async function handleAccept() {
    setAccepting(true)
    const res = await fetch(`/api/rides/${ride.id}/accept`, { method: 'PATCH' })
    setAccepting(false)
    if (res.ok) {
      toast.success('Ride accepted!')
      router.refresh()
    } else {
      const err = await res.json()
      toast.error(err.error)
    }
  }

  async function handleComplete() {
    setCompleting(true)
    const res = await fetch(`/api/rides/${ride.id}/complete`, { method: 'PATCH' })
    setCompleting(false)
    if (res.ok) {
      toast.success('Ride completed! Payment captured.')
      router.refresh()
    } else {
      const err = await res.json()
      toast.error(err.error)
    }
  }

  async function handleCancel() {
    setCancelling(true)
    const res = await fetch(`/api/rides/${ride.id}/cancel`, { method: 'PATCH' })
    setCancelling(false)
    if (res.ok) {
      toast.success('Ride cancelled')
      router.refresh()
    } else {
      const err = await res.json()
      toast.error(err.error)
    }
  }

  async function handleRating() {
    if (!rating) return
    setSubmittingRating(true)
    const res = await fetch(`/api/rides/${ride.id}/rate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ score: rating, comment }),
    })
    setSubmittingRating(false)
    if (res.ok) {
      toast.success('Rating submitted!')
      router.refresh()
    } else {
      const err = await res.json()
      toast.error(err.error)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
        </Link>
        <h1 className="text-xl font-bold text-gray-900">Ride Details</h1>
      </div>

      {/* Status Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <Badge className={`${sc.color} flex items-center gap-1 text-sm px-3 py-1`}>
              {sc.icon}
              {sc.label}
            </Badge>
            <span className="text-sm text-gray-500">{new Date(ride.created_at).toLocaleString()}</span>
          </div>

          {/* Route */}
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="mt-1 h-3 w-3 rounded-full bg-green-500 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-500">Pickup</p>
                <p className="font-medium">{ride.pickup_address}</p>
              </div>
            </div>
            <div className="ml-1.5 border-l-2 border-dashed border-gray-200 h-4" />
            <div className="flex items-start gap-3">
              <div className="mt-1 h-3 w-3 rounded-full bg-red-500 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-500">Dropoff</p>
                <p className="font-medium">{ride.dropoff_address}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ride Info */}
      <Card>
        <CardHeader><CardTitle>Ride Info</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Type</p>
              <p className="font-medium capitalize">{ride.ride_type}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Distance</p>
              <p className="font-medium">{ride.distance_km?.toFixed(1)} km</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Duration</p>
              <p className="font-medium">{ride.duration_minutes} min</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Price</p>
              <p className="text-xl font-bold text-green-700">
                ${(ride.final_price || ride.estimated_price || 0).toFixed(2)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Status */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><CreditCard className="h-5 w-5" />Payment</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Payment Status</span>
            <Badge className={
              ride.stripe_payment_status === 'captured' ? 'bg-green-100 text-green-700' :
              ride.stripe_payment_status === 'authorized' ? 'bg-blue-100 text-blue-700' :
              ride.stripe_payment_status === 'failed' ? 'bg-red-100 text-red-700' :
              'bg-gray-100 text-gray-700'
            }>
              {ride.stripe_payment_status}
            </Badge>
          </div>
          {ride.stripe_payment_intent_id && (
            <p className="text-xs text-gray-400 mt-2">Intent: {ride.stripe_payment_intent_id.slice(0, 20)}...</p>
          )}
        </CardContent>
      </Card>

      {/* Rider / Driver info */}
      {(ride.rider || ride.driver) && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><User className="h-5 w-5" />People</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {ride.rider && (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">Rider</p>
                  <p className="font-medium">{ride.rider.full_name || ride.rider.email}</p>
                </div>
                <div className="flex items-center gap-1 text-amber-500">
                  <Star className="h-4 w-4 fill-amber-500" />
                  <span>{ride.rider.rating?.toFixed(1)}</span>
                </div>
              </div>
            )}
            {ride.driver && (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">Driver</p>
                  <p className="font-medium">{ride.driver.full_name || ride.driver.email}</p>
                </div>
                <div className="flex items-center gap-1 text-amber-500">
                  <Star className="h-4 w-4 fill-amber-500" />
                  <span>{ride.driver.rating?.toFixed(1)}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex flex-col gap-3">
        {/* Driver actions */}
        {user.role === 'driver' && ride.status === 'pending' && (
          <Button
            className="bg-blue-600 hover:bg-blue-700 text-white"
            onClick={handleAccept}
            disabled={accepting}
          >
            {accepting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Car className="h-4 w-4 mr-2" />}
            Accept Ride
          </Button>
        )}
        {isDriver && ['accepted', 'in_progress'].includes(ride.status) && (
          <Button
            className="bg-green-600 hover:bg-green-700 text-white"
            onClick={handleComplete}
            disabled={completing}
          >
            {completing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
            Mark as Completed
          </Button>
        )}
        {/* Cancel */}
        {(isRider || isDriver || isAdmin) && !['completed', 'cancelled'].includes(ride.status) && (
          <Button
            variant="destructive"
            onClick={handleCancel}
            disabled={cancelling}
          >
            {cancelling ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <XCircle className="h-4 w-4 mr-2" />}
            Cancel Ride
          </Button>
        )}
      </div>

      {/* Rating */}
      {ride.status === 'completed' && !existingRating && (isRider || isDriver) && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Star className="h-5 w-5 text-amber-500" />Rate Your {isRider ? 'Driver' : 'Rider'}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  key={s}
                  onClick={() => setRating(s)}
                  className={`text-3xl transition-transform hover:scale-110 ${s <= rating ? 'opacity-100' : 'opacity-30'}`}
                >
                  ⭐
                </button>
              ))}
            </div>
            <input
              type="text"
              placeholder="Leave a comment (optional)"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
            <Button
              className="bg-amber-500 hover:bg-amber-600 text-white"
              onClick={handleRating}
              disabled={!rating || submittingRating}
            >
              {submittingRating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Submit Rating
            </Button>
          </CardContent>
        </Card>
      )}

      {existingRating && (
        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="pt-6">
            <p className="text-amber-700 font-medium">You rated this ride {'⭐'.repeat(existingRating.score)}</p>
            {existingRating.comment && <p className="text-amber-600 text-sm mt-1">"{existingRating.comment}"</p>}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
