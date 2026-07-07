'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { MapPin, User, Car, Star, CreditCard, Clock, CheckCircle, XCircle, Loader2, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import type { Ride, RideflowUser, Rating } from '@/lib/types'

const statusConfig: Record<string, { label: string; cls: string }> = {
  pending:     { label: 'Pending',         cls: 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' },
  accepted:    { label: 'Driver Assigned', cls: 'bg-[#C9A028]/10 text-[#C9A028] border border-[#C9A028]/20' },
  in_progress: { label: 'In Progress',     cls: 'bg-purple-500/10 text-purple-400 border border-purple-500/20' },
  completed:   { label: 'Completed',       cls: 'bg-green-500/10 text-green-400 border border-green-500/20' },
  cancelled:   { label: 'Cancelled',       cls: 'bg-red-500/10 text-red-400 border border-red-500/20' },
}

const paymentCls: Record<string, string> = {
  captured:   'bg-green-500/10 text-green-400 border border-green-500/20',
  authorized: 'bg-[#C9A028]/10 text-[#C9A028] border border-[#C9A028]/20',
  failed:     'bg-red-500/10 text-red-400 border border-red-500/20',
}

const cardCls = 'bg-[#141414] border border-[#2A2A2A] rounded-2xl p-5'

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
    if (res.ok) { toast.success('Ride accepted!'); router.refresh() }
    else { const e = await res.json(); toast.error(e.error) }
  }

  async function handleComplete() {
    setCompleting(true)
    const res = await fetch(`/api/rides/${ride.id}/complete`, { method: 'PATCH' })
    setCompleting(false)
    if (res.ok) { toast.success('Ride completed! Payment captured.'); router.refresh() }
    else { const e = await res.json(); toast.error(e.error) }
  }

  async function handleCancel() {
    setCancelling(true)
    const res = await fetch(`/api/rides/${ride.id}/cancel`, { method: 'PATCH' })
    setCancelling(false)
    if (res.ok) { toast.success('Ride cancelled'); router.refresh() }
    else { const e = await res.json(); toast.error(e.error) }
  }

  async function handleRating() {
    if (!rating) return
    setSubmittingRating(true)
    const res = await fetch(`/api/rides/${ride.id}/rate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ score: rating, comment }) })
    setSubmittingRating(false)
    if (res.ok) { toast.success('Rating submitted!'); router.refresh() }
    else { const e = await res.json(); toast.error(e.error) }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/dashboard"
          className="flex items-center gap-1.5 text-[#777] hover:text-[#C9A028] text-sm transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <h1 className="text-xl font-bold text-[#F0ECE4]">Ride Details</h1>
      </div>

      {/* Status */}
      <div className={cardCls}>
        <div className="flex items-center justify-between mb-4">
          <span className={`${sc.cls} text-sm font-semibold px-3 py-1 rounded-full`}>{sc.label}</span>
          <span className="text-xs text-[#555]">{new Date(ride.created_at).toLocaleString()}</span>
        </div>
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="mt-1.5 h-2.5 w-2.5 rounded-full bg-[#2D7A2D] flex-shrink-0" />
            <div>
              <p className="text-[#A08020] text-[10px] font-bold uppercase tracking-widest">Pickup</p>
              <p className="text-[#E8E4DC] text-sm">{ride.pickup_address}</p>
            </div>
          </div>
          <div className="ml-[5px] border-l-2 border-dashed border-[#2A2A2A] h-4" />
          <div className="flex items-start gap-3">
            <div className="mt-1.5 h-2.5 w-2.5 rounded-full bg-red-500 flex-shrink-0" />
            <div>
              <p className="text-[#A08020] text-[10px] font-bold uppercase tracking-widest">Dropoff</p>
              <p className="text-[#E8E4DC] text-sm">{ride.dropoff_address}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Ride Info */}
      <div className={cardCls}>
        <h2 className="text-[#A08020] text-[10px] font-bold uppercase tracking-widest mb-4">Ride Info</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-[#555] text-xs mb-0.5">Type</p>
            <p className="text-[#E8E4DC] font-medium capitalize">{ride.ride_type}</p>
          </div>
          <div>
            <p className="text-[#555] text-xs mb-0.5">Distance</p>
            <p className="text-[#E8E4DC] font-medium">{ride.distance_km?.toFixed(1)} km</p>
          </div>
          <div>
            <p className="text-[#555] text-xs mb-0.5">Duration</p>
            <p className="text-[#E8E4DC] font-medium">{ride.duration_minutes} min</p>
          </div>
          <div>
            <p className="text-[#555] text-xs mb-0.5">Price</p>
            <p className="text-xl font-bold text-[#C9A028]">
              ${(ride.final_price || ride.estimated_price || 0).toFixed(2)}
            </p>
          </div>
        </div>
      </div>

      {/* Payment */}
      <div className={cardCls}>
        <h2 className="text-[#A08020] text-[10px] font-bold uppercase tracking-widest mb-3 flex items-center gap-2">
          <CreditCard className="h-4 w-4" /> Payment
        </h2>
        <div className="flex items-center justify-between">
          <span className="text-[#777] text-sm">Status</span>
          <span className={`${paymentCls[ride.stripe_payment_status || ''] || 'bg-[#1C1C1C] text-[#777] border border-[#2A2A2A]'} text-xs font-semibold px-3 py-1 rounded-full`}>
            {ride.stripe_payment_status || 'pending'}
          </span>
        </div>
        {ride.stripe_payment_intent_id && (
          <p className="text-xs text-[#444] mt-2 font-mono">Intent: {ride.stripe_payment_intent_id.slice(0, 20)}…</p>
        )}
      </div>

      {/* People */}
      {(ride.rider || ride.driver) && (
        <div className={cardCls}>
          <h2 className="text-[#A08020] text-[10px] font-bold uppercase tracking-widest mb-3 flex items-center gap-2">
            <User className="h-4 w-4" /> People
          </h2>
          <div className="space-y-3">
            {ride.rider && (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[#555] text-xs mb-0.5">Rider</p>
                  <p className="text-[#E8E4DC] font-medium">{ride.rider.full_name || ride.rider.email}</p>
                </div>
                <div className="flex items-center gap-1 text-[#C9A028]">
                  <Star className="h-4 w-4 fill-[#C9A028]" />
                  <span className="text-sm font-semibold">{ride.rider.rating?.toFixed(1)}</span>
                </div>
              </div>
            )}
            {ride.driver && (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[#555] text-xs mb-0.5">Driver</p>
                  <p className="text-[#E8E4DC] font-medium">{ride.driver.full_name || ride.driver.email}</p>
                </div>
                <div className="flex items-center gap-1 text-[#C9A028]">
                  <Star className="h-4 w-4 fill-[#C9A028]" />
                  <span className="text-sm font-semibold">{ride.driver.rating?.toFixed(1)}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col gap-3">
        {user.role === 'driver' && ride.status === 'pending' && (
          <button onClick={handleAccept} disabled={accepting}
            className="w-full bg-[#C9A028] hover:bg-[#B8901E] disabled:opacity-60 text-black font-bold rounded-xl py-3 text-sm flex items-center justify-center gap-2 transition-colors">
            {accepting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Car className="h-4 w-4" />}
            Accept Ride
          </button>
        )}
        {isDriver && ['accepted', 'in_progress'].includes(ride.status) && (
          <button onClick={handleComplete} disabled={completing}
            className="w-full bg-green-700 hover:bg-green-600 disabled:opacity-60 text-white font-bold rounded-xl py-3 text-sm flex items-center justify-center gap-2 transition-colors">
            {completing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
            Mark as Completed
          </button>
        )}
        {(isRider || isDriver || isAdmin) && !['completed', 'cancelled'].includes(ride.status) && (
          <button onClick={handleCancel} disabled={cancelling}
            className="w-full bg-red-900/40 hover:bg-red-900/70 border border-red-800/50 disabled:opacity-60 text-red-400 font-bold rounded-xl py-3 text-sm flex items-center justify-center gap-2 transition-colors">
            {cancelling ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
            Cancel Ride
          </button>
        )}
      </div>

      {/* Rating */}
      {ride.status === 'completed' && !existingRating && (isRider || isDriver) && (
        <div className={cardCls}>
          <h2 className="text-[#A08020] text-[10px] font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
            <Star className="h-4 w-4" /> Rate Your {isRider ? 'Driver' : 'Rider'}
          </h2>
          <div className="flex gap-2 mb-4">
            {[1, 2, 3, 4, 5].map(s => (
              <button key={s} onClick={() => setRating(s)}
                className={`text-3xl transition-transform hover:scale-110 ${s <= rating ? 'opacity-100' : 'opacity-30'}`}>
                ⭐
              </button>
            ))}
          </div>
          <input type="text" placeholder="Leave a comment (optional)" value={comment}
            onChange={e => setComment(e.target.value)}
            className="w-full bg-[#1C1C1C] border border-[#363636] focus:border-[#C9A028] text-[#F0ECE4] placeholder:text-[#555] rounded-xl px-4 py-3 text-sm focus:outline-none transition-colors mb-4" />
          <button onClick={handleRating} disabled={!rating || submittingRating}
            className="w-full bg-[#C9A028] hover:bg-[#B8901E] disabled:opacity-60 text-black font-bold rounded-xl py-3 text-sm flex items-center justify-center gap-2 transition-colors">
            {submittingRating && <Loader2 className="h-4 w-4 animate-spin" />}
            Submit Rating
          </button>
        </div>
      )}

      {existingRating && (
        <div className="bg-[#C9A028]/5 border border-[#C9A028]/20 rounded-2xl p-5">
          <p className="text-[#C9A028] font-semibold">You rated this ride {'⭐'.repeat(existingRating.score)}</p>
          {existingRating.comment && <p className="text-[#999] text-sm mt-1">"{existingRating.comment}"</p>}
        </div>
      )}
    </div>
  )
}
