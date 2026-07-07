'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { MapPin, Calendar, Car, Users, CheckCircle, Clock, XCircle, Loader2, CreditCard, ChevronLeft } from 'lucide-react'
import { toast } from 'sonner'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { Button } from '@/components/ui/button'
import type { Inquiry } from '@/lib/types'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

const STATUS_CONFIG = {
  inquiry:     { label: 'Awaiting Quote', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', icon: <Clock className="h-4 w-4" /> },
  quoted:      { label: 'Quote Ready', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: <CreditCard className="h-4 w-4" /> },
  confirmed:   { label: 'Confirmed', color: 'bg-green-500/20 text-green-400 border-green-500/30', icon: <CheckCircle className="h-4 w-4" /> },
  declined:    { label: 'Declined', color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: <XCircle className="h-4 w-4" /> },
  cancelled:   { label: 'Cancelled', color: 'bg-slate-500/20 text-slate-400 border-slate-500/30', icon: <XCircle className="h-4 w-4" /> },
  in_progress: { label: 'In Progress', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30', icon: <Car className="h-4 w-4" /> },
  completed:   { label: 'Completed', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', icon: <CheckCircle className="h-4 w-4" /> },
}

function PaymentForm({ clientSecret, inquiryId, onSuccess }: { clientSecret: string; inquiryId: string; onSuccess: () => void }) {
  const stripe = useStripe()
  const elements = useElements()
  const [loading, setLoading] = useState(false)

  async function handlePay(e: React.FormEvent) {
    e.preventDefault()
    if (!stripe || !elements) return
    setLoading(true)
    const { error, paymentIntent } = await stripe.confirmPayment({ elements, redirect: 'if_required' })
    if (error) { toast.error(error.message || 'Payment failed'); setLoading(false); return }
    if (paymentIntent?.status === 'requires_capture' || paymentIntent?.status === 'succeeded') {
      await fetch(`/api/inquiries/${inquiryId}/confirm`, { method: 'PATCH' })
      toast.success('Booking confirmed!')
      onSuccess()
    }
    setLoading(false)
  }

  return (
    <form onSubmit={handlePay} className="space-y-4">
      <PaymentElement />
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 text-sm text-slate-400">
        Test card: 4242 4242 4242 4242 · 12/30 · 123 · 42424
      </div>
      <Button type="submit" disabled={loading || !stripe} className="w-full bg-amber-500 hover:bg-amber-600 text-black font-bold py-3">
        {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CreditCard className="h-4 w-4 mr-2" />}
        Pay & Confirm Booking
      </Button>
    </form>
  )
}

export default function InquiryDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [inquiry, setInquiry] = useState<Inquiry | null>(null)
  const [loading, setLoading] = useState(true)
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  async function load() {
    const res = await fetch(`/api/inquiries/${id}`)
    if (res.ok) setInquiry(await res.json())
    setLoading(false)
  }

  useEffect(() => { load() }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleConfirmWithPayment() {
    if (!inquiry) return
    setActionLoading(true)
    const res = await fetch(`/api/inquiries/${id}/payment-intent`)
    const data = await res.json()
    if (res.ok && data.clientSecret) {
      setClientSecret(data.clientSecret)
    } else {
      toast.error(data.error || 'Could not initialize payment')
    }
    setActionLoading(false)
  }

  async function handleConfirmWithoutPayment() {
    setActionLoading(true)
    const res = await fetch(`/api/inquiries/${id}/confirm`, { method: 'PATCH' })
    if (res.ok) { toast.success('Booking confirmed!'); load() }
    else toast.error('Failed to confirm')
    setActionLoading(false)
  }

  async function handleDecline() {
    setActionLoading(true)
    const res = await fetch(`/api/inquiries/${id}/decline`, { method: 'PATCH' })
    if (res.ok) { toast.success('Inquiry declined'); load() }
    else toast.error('Failed to decline')
    setActionLoading(false)
  }

  if (loading) return (
    <div className="min-h-screen bg-[#0E0E0E] flex items-center justify-center">
      <Loader2 className="h-8 w-8 text-[#C9A028] animate-spin" />
    </div>
  )

  if (!inquiry) return (
    <div className="min-h-screen bg-[#0E0E0E] flex items-center justify-center text-[#777]">Inquiry not found</div>
  )

  const sc = STATUS_CONFIG[inquiry.status] || STATUS_CONFIG.inquiry
  const prefs = inquiry.preferences || {}

  const card = 'bg-[#141414] border border-[#2A2A2A] rounded-2xl'

  return (
    <div className="min-h-screen bg-[#0E0E0E] text-[#F5F0E8]">
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-5">
        <button onClick={() => router.push('/dashboard')} className="flex items-center gap-2 text-[#777] hover:text-[#C9A028] text-sm transition-colors">
          <ChevronLeft className="h-4 w-4" />Back to Dashboard
        </button>

        {/* Status header */}
        <div className={card + ' p-6'}>
          <div className="flex items-center justify-between mb-5">
            <h1 className="text-lg font-bold text-[#F5F0E8]">Reservation #{inquiry.id.slice(0, 8).toUpperCase()}</h1>
            <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${sc.color}`}>
              {sc.icon}{sc.label}
            </span>
          </div>
          <div className="space-y-3 text-sm">
            {[
              { icon: <MapPin className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />, label: 'Pickup', val: inquiry.pickup_address },
              { icon: <MapPin className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />, label: 'Dropoff', val: inquiry.dropoff_address },
              { icon: <Calendar className="h-4 w-4 text-[#C9A028] mt-0.5 flex-shrink-0" />, label: 'Date & Time', val: new Date(inquiry.pickup_datetime).toLocaleString() },
              { icon: <Car className="h-4 w-4 text-[#888] mt-0.5 flex-shrink-0" />, label: 'Vehicle', val: inquiry.vehicle_type },
              { icon: <Users className="h-4 w-4 text-[#888] mt-0.5 flex-shrink-0" />, label: 'Passengers / Luggage', val: `${inquiry.passengers} pax · ${inquiry.luggage}` },
            ].map(row => (
              <div key={row.label} className="flex items-start gap-3">
                {row.icon}
                <div>
                  <p className="text-[#777] text-xs">{row.label}</p>
                  <p className="text-[#F5F0E8] capitalize">{row.val}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Preferences */}
        {(prefs.music || prefs.extras?.length || prefs.occasion || prefs.special_requests) && (
          <div className={card + ' p-5'}>
            <h3 className="text-[#C9A028] text-[10px] font-bold uppercase tracking-widest mb-3">Your Preferences</h3>
            <div className="space-y-2 text-sm">
              {prefs.occasion && <div className="flex gap-2"><span className="text-[#777] w-28">Occasion</span><span className="text-[#F5F0E8]">{prefs.occasion}</span></div>}
              {prefs.music && <div className="flex gap-2"><span className="text-[#777] w-28">Music</span><span className="text-[#F5F0E8]">{prefs.music}</span></div>}
              {prefs.temperature && <div className="flex gap-2"><span className="text-[#777] w-28">Temperature</span><span className="text-[#F5F0E8]">{prefs.temperature}</span></div>}
              {(prefs.extras?.length ?? 0) > 0 && <div className="flex gap-2"><span className="text-[#777] w-28">Extras</span><span className="text-[#C9A028]">{(prefs.extras ?? []).join(', ')}</span></div>}
              {prefs.special_requests && <div className="flex gap-2"><span className="text-[#777] w-28">Notes</span><span className="text-[#888] italic">"{prefs.special_requests}"</span></div>}
            </div>
          </div>
        )}

        {/* Quote section */}
        {inquiry.status === 'quoted' && inquiry.quoted_amount && (
          <div className="bg-[#C9A028]/5 border border-[#C9A028]/30 rounded-2xl p-6 space-y-4">
            <h2 className="text-lg font-bold text-[#F5F0E8]">Your Quote is Ready</h2>
            {inquiry.quote_message && <p className="text-[#888] italic text-sm">"{inquiry.quote_message}"</p>}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[#777] text-sm">Quoted Price</p>
                <p className="text-[#C9A028] font-bold text-5xl">${inquiry.quoted_amount.toFixed(2)}</p>
              </div>
              {inquiry.market_ref_price && (
                <div className="text-right">
                  <p className="text-[#777] text-xs">Uber Black est.</p>
                  <p className="text-[#777] line-through">${inquiry.market_ref_price.toFixed(2)}</p>
                  <p className="text-green-400 text-sm font-semibold">
                    Save ${(inquiry.market_ref_price - inquiry.quoted_amount).toFixed(2)}
                  </p>
                </div>
              )}
            </div>
            <p className="text-[#777] text-xs">
              {inquiry.payment_mode === 'required' ? 'Payment required to confirm booking.' : inquiry.payment_mode === 'optional' ? 'No upfront payment required — pay on the day.' : 'No charge — cash or invoice on the day.'}
            </p>

            {!clientSecret && (
              <div className="flex gap-3">
                {inquiry.payment_mode === 'required' ? (
                  <Button onClick={handleConfirmWithPayment} disabled={actionLoading} className="flex-1 bg-[#C9A028] hover:bg-[#B8901E] text-black font-bold">
                    {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Accept & Pay
                  </Button>
                ) : (
                  <Button onClick={handleConfirmWithoutPayment} disabled={actionLoading} className="flex-1 bg-[#C9A028] hover:bg-[#B8901E] text-black font-bold">
                    {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Confirm Booking
                  </Button>
                )}
                <Button onClick={handleDecline} disabled={actionLoading} className="flex-1 border border-red-800/60 text-red-400 bg-transparent hover:bg-red-900/20">Decline</Button>
              </div>
            )}

            {clientSecret && (
              <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'night' } }}>
                <PaymentForm clientSecret={clientSecret} inquiryId={id} onSuccess={() => setTimeout(() => router.push('/dashboard'), 2000)} />
              </Elements>
            )}
          </div>
        )}

        {inquiry.status === 'confirmed' && (
          <div className="bg-green-900/10 border border-green-500/20 rounded-2xl p-6 text-center space-y-3">
            <div className="h-14 w-14 rounded-full border-2 border-green-500/50 flex items-center justify-center mx-auto">
              <CheckCircle className="h-7 w-7 text-green-400" />
            </div>
            <h2 className="text-xl font-bold text-[#F5F0E8]">Booking Confirmed!</h2>
            <p className="text-[#777]">Your ride is confirmed. You&apos;ll hear from us before your pickup date.</p>
          </div>
        )}

        {inquiry.status === 'inquiry' && (
          <div className={card + ' p-6 text-center space-y-3'}>
            <div className="h-14 w-14 rounded-full border-2 border-[#C9A028]/40 flex items-center justify-center mx-auto">
              <Clock className="h-7 w-7 text-[#C9A028]" />
            </div>
            <h2 className="text-xl font-bold text-[#F5F0E8]">Waiting for Quote</h2>
            <p className="text-[#777]">The team is reviewing your request. You&apos;ll receive a quote by email shortly.</p>
            {inquiry.market_ref_price && (
              <p className="text-[#777] text-sm">Uber Black reference: ~${inquiry.market_ref_price.toFixed(2)}</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
