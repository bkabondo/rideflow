'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MapPin, Car, CreditCard, Loader2, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

type RideType = 'economy' | 'comfort' | 'premium'

interface RideData {
  id: string
  estimated_price: number
  distance_km: number
  duration_minutes: number
  ride_type: string
  pickup_address: string
  dropoff_address: string
}

const rideTypes = [
  { id: 'economy' as RideType, label: 'Economy', emoji: '🚗', desc: 'Affordable everyday ride', min: 'From $5' },
  { id: 'comfort' as RideType, label: 'Comfort', emoji: '🚙', desc: 'Extra space, premium feel', min: 'From $8' },
  { id: 'premium' as RideType, label: 'Premium', emoji: '🏎️', desc: 'Full luxury experience', min: 'From $12' },
]

const cardCls = 'bg-[#141414] border border-[#2A2A2A] rounded-2xl p-6'
const inputCls = 'w-full bg-[#1C1C1C] border border-[#363636] focus:border-[#C9A028] text-[#F0ECE4] placeholder:text-[#555] rounded-xl px-4 py-3 text-sm focus:outline-none transition-colors'
const labelCls = 'text-[#A08020] text-[10px] font-bold uppercase tracking-widest'
const goldBtn = 'w-full bg-[#C9A028] hover:bg-[#B8901E] disabled:opacity-60 text-black font-bold rounded-xl py-3 text-sm transition-colors flex items-center justify-center gap-2'
const ghostBtn = 'flex-1 border border-[#363636] text-[#999] hover:border-[#C9A028] hover:text-[#C9A028] bg-transparent rounded-xl py-3 text-sm font-medium transition-colors'

function PaymentForm({ clientSecret, rideId, onSuccess }: { clientSecret: string; rideId: string; onSuccess: () => void }) {
  const stripe = useStripe()
  const elements = useElements()
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!stripe || !elements) return
    setLoading(true)
    const { error, paymentIntent } = await stripe.confirmPayment({ elements, redirect: 'if_required' })
    if (error) { toast.error(error.message || 'Payment failed'); setLoading(false); return }
    if (paymentIntent?.status === 'requires_capture' || paymentIntent?.status === 'succeeded') {
      await fetch(`/api/rides/${rideId}/payment-authorized`, { method: 'PATCH' }).catch(() => {})
      toast.success('Payment authorized! Your ride is booked.')
      onSuccess()
    } else {
      toast.error('Payment not completed')
    }
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      <div className="bg-[#1A1500] border border-[#C9A028]/20 rounded-xl p-3 text-xs text-[#C9A028]/80">
        <p className="font-semibold text-[#C9A028] mb-1">Test Card</p>
        <p>4242 4242 4242 4242 &nbsp;|&nbsp; 12/30 &nbsp;|&nbsp; 123 &nbsp;|&nbsp; 42424</p>
      </div>
      <button type="submit" disabled={loading || !stripe} className={goldBtn}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
        Authorize Payment
      </button>
    </form>
  )
}

async function getAddressFromCoords(lat: number, lon: number): Promise<string> {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`, { headers: { 'Accept-Language': 'en' } })
    const data = await res.json()
    return data.display_name || `${lat.toFixed(4)}, ${lon.toFixed(4)}`
  } catch {
    return `${lat.toFixed(4)}, ${lon.toFixed(4)}`
  }
}

export default function BookRideClient() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [locating, setLocating] = useState(false)
  const [form, setForm] = useState({ pickup_address: '', dropoff_address: '', ride_type: 'economy' as RideType })
  const [rideData, setRideData] = useState<RideData | null>(null)
  const [clientSecret, setClientSecret] = useState<string | null>(null)

  async function useMyLocation() {
    if (!navigator.geolocation) { toast.error('Geolocation not supported'); return }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const address = await getAddressFromCoords(pos.coords.latitude, pos.coords.longitude)
        setForm(f => ({ ...f, pickup_address: address }))
        setLocating(false)
      },
      () => { toast.error('Could not get your location'); setLocating(false) }
    )
  }

  async function handleBookRide(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const res = await fetch('/api/rides', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    setLoading(false)
    if (!res.ok) { const err = await res.json(); toast.error(err.error || 'Failed to create ride'); return }
    const data = await res.json()
    setRideData(data.ride)
    setClientSecret(data.clientSecret)
    setStep(3)
  }

  return (
    <div className="space-y-6">
      {/* Steps */}
      <div className="flex items-center gap-2">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
              step > s ? 'bg-[#2D7A2D] text-white' : step === s ? 'bg-[#C9A028] text-black' : 'bg-[#1C1C1C] border border-[#363636] text-[#555]'
            }`}>
              {step > s ? <CheckCircle className="h-4 w-4" /> : s}
            </div>
            {s < 3 && <div className={`h-0.5 w-8 transition-colors ${step > s ? 'bg-[#2D7A2D]' : 'bg-[#252525]'}`} />}
          </div>
        ))}
        <div className="ml-2 text-sm text-[#777]">
          {step === 1 && 'Enter locations'}
          {step === 2 && 'Choose ride type'}
          {step === 3 && 'Payment'}
        </div>
      </div>

      {/* Step 1: Locations */}
      {step === 1 && (
        <div className={cardCls}>
          <h2 className="text-[#F0ECE4] font-bold text-lg mb-5 flex items-center gap-2">
            <MapPin className="h-5 w-5 text-[#C9A028]" /> Where are you going?
          </h2>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className={labelCls}>Pickup Location</label>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 h-2.5 w-2.5 rounded-full bg-[#2D7A2D]" />
                <input placeholder="Enter pickup address" value={form.pickup_address}
                  onChange={e => setForm({ ...form, pickup_address: e.target.value })}
                  className={inputCls + ' pl-8 pr-36'} />
                <button type="button" onClick={useMyLocation} disabled={locating}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-[#C9A028] hover:text-[#E8B830] font-medium flex items-center gap-1 px-2 py-1 rounded hover:bg-[#C9A028]/10 disabled:opacity-50 transition-colors">
                  <MapPin className="h-3 w-3" />
                  {locating ? 'Locating…' : 'My Location'}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className={labelCls}>Dropoff Location</label>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 h-2.5 w-2.5 rounded-full bg-red-500" />
                <input placeholder="Enter dropoff address" value={form.dropoff_address}
                  onChange={e => setForm({ ...form, dropoff_address: e.target.value })}
                  className={inputCls + ' pl-8'} />
              </div>
            </div>
            <button className={goldBtn} onClick={() => setStep(2)}
              disabled={!form.pickup_address || !form.dropoff_address}>
              Choose Ride Type
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Ride Type */}
      {step === 2 && (
        <div className={cardCls}>
          <h2 className="text-[#F0ECE4] font-bold text-lg mb-5 flex items-center gap-2">
            <Car className="h-5 w-5 text-[#C9A028]" /> Choose Your Ride
          </h2>
          <div className="space-y-3 mb-4">
            {rideTypes.map(rt => (
              <button key={rt.id} type="button" onClick={() => setForm({ ...form, ride_type: rt.id })}
                className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                  form.ride_type === rt.id
                    ? 'border-[#C9A028] bg-[#C9A028]/10'
                    : 'border-[#2A2A2A] hover:border-[#3A3A3A] bg-[#0E0E0E]'
                }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{rt.emoji}</span>
                    <div>
                      <p className={`font-semibold ${form.ride_type === rt.id ? 'text-[#C9A028]' : 'text-[#E8E4DC]'}`}>{rt.label}</p>
                      <p className="text-sm text-[#777]">{rt.desc}</p>
                    </div>
                  </div>
                  <span className={`text-sm font-medium ${form.ride_type === rt.id ? 'text-[#C9A028]' : 'text-[#666]'}`}>{rt.min}</span>
                </div>
              </button>
            ))}
          </div>
          <div className="bg-[#0E0E0E] border border-[#2A2A2A] rounded-xl p-3 text-sm text-[#777] mb-4">
            <p className="font-medium text-[#999] mb-1">Trip Summary</p>
            <p>📍 {form.pickup_address}</p>
            <p>🏁 {form.dropoff_address}</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setStep(1)} className={ghostBtn}>Back</button>
            <button className="flex-1 bg-[#C9A028] hover:bg-[#B8901E] disabled:opacity-60 text-black font-bold rounded-xl py-3 text-sm transition-colors flex items-center justify-center gap-2"
              onClick={handleBookRide} disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Confirm & Pay
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Payment */}
      {step === 3 && rideData && clientSecret && (
        <div className={cardCls}>
          <h2 className="text-[#F0ECE4] font-bold text-lg mb-5 flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-[#C9A028]" /> Payment Details
          </h2>
          <div className="bg-[#0E0E0E] border border-[#2A2A2A] rounded-xl p-4 space-y-2 mb-4">
            <div className="flex justify-between text-sm">
              <span className="text-[#777]">Ride Type</span>
              <span className="font-medium text-[#E8E4DC] capitalize">{rideData.ride_type}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[#777]">Distance</span>
              <span className="font-medium text-[#E8E4DC]">{rideData.distance_km?.toFixed(1)} km</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[#777]">Duration</span>
              <span className="font-medium text-[#E8E4DC]">{rideData.duration_minutes} min</span>
            </div>
            <div className="border-t border-[#2A2A2A] pt-2 flex justify-between">
              <span className="font-semibold text-[#F0ECE4]">Total</span>
              <span className="text-xl font-bold text-[#C9A028]">${rideData.estimated_price?.toFixed(2)}</span>
            </div>
          </div>
          <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'night', variables: { colorPrimary: '#C9A028' } } }}>
            <PaymentForm clientSecret={clientSecret} rideId={rideData.id} onSuccess={() => setTimeout(() => router.push('/dashboard'), 2000)} />
          </Elements>
        </div>
      )}
    </div>
  )
}
