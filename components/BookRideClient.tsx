'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MapPin, Car, CreditCard, Loader2, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

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
  { id: 'economy' as RideType, label: 'Economy', emoji: '🚗', desc: 'Affordable', min: '$5' },
  { id: 'comfort' as RideType, label: 'Comfort', emoji: '🚙', desc: 'Extra space', min: '$8' },
  { id: 'premium' as RideType, label: 'Premium', emoji: '🏎️', desc: 'Luxury', min: '$12' },
]

function PaymentForm({ clientSecret, rideId, onSuccess }: { clientSecret: string; rideId: string; onSuccess: () => void }) {
  const stripe = useStripe()
  const elements = useElements()
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!stripe || !elements) return
    setLoading(true)

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
    })

    if (error) {
      toast.error(error.message || 'Payment failed')
      setLoading(false)
      return
    }

    if (paymentIntent?.status === 'requires_capture' || paymentIntent?.status === 'succeeded') {
      // Update ride payment status
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
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
        <p className="font-medium">Test Card</p>
        <p>4242 4242 4242 4242 | 12/30 | 123 | 42424</p>
      </div>
      <Button
        type="submit"
        disabled={loading || !stripe}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CreditCard className="h-4 w-4 mr-2" />}
        Authorize Payment
      </Button>
    </form>
  )
}

async function getAddressFromCoords(lat: number, lon: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`,
      { headers: { 'Accept-Language': 'en' } }
    )
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
  const [form, setForm] = useState({
    pickup_address: '',
    dropoff_address: '',
    ride_type: 'economy' as RideType,
  })

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
  const [rideData, setRideData] = useState<RideData | null>(null)
  const [clientSecret, setClientSecret] = useState<string | null>(null)

  async function handleBookRide(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const res = await fetch('/api/rides', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })

    setLoading(false)

    if (!res.ok) {
      const err = await res.json()
      toast.error(err.error || 'Failed to create ride')
      return
    }

    const data = await res.json()
    setRideData(data.ride)
    setClientSecret(data.clientSecret)
    setStep(3)
  }

  function handlePaymentSuccess() {
    setTimeout(() => router.push('/dashboard'), 2000)
  }

  return (
    <div className="space-y-6">
      {/* Steps indicator */}
      <div className="flex items-center gap-2">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold ${
              step > s ? 'bg-green-600 text-white' : step === s ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
            }`}>
              {step > s ? <CheckCircle className="h-4 w-4" /> : s}
            </div>
            {s < 3 && <div className={`h-0.5 w-8 ${step > s ? 'bg-green-600' : 'bg-gray-200'}`} />}
          </div>
        ))}
        <div className="ml-2 text-sm text-gray-500">
          {step === 1 && 'Enter locations'}
          {step === 2 && 'Choose ride type'}
          {step === 3 && 'Payment'}
        </div>
      </div>

      {/* Step 1: Locations */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-blue-600" />
              Where are you going?
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pickup">Pickup Location</Label>
              <div className="relative">
                <div className="absolute left-3 top-3 h-2 w-2 rounded-full bg-green-500" />
                <Input
                  id="pickup"
                  placeholder="Enter pickup address"
                  value={form.pickup_address}
                  onChange={(e) => setForm({ ...form, pickup_address: e.target.value })}
                  className="pl-8 pr-36"
                />
                <button
                  type="button"
                  onClick={useMyLocation}
                  disabled={locating}
                  className="absolute right-2 top-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 px-2 py-1 rounded hover:bg-blue-50 disabled:opacity-50"
                >
                  <MapPin className="h-3 w-3" />
                  {locating ? 'Locating…' : 'Use My Location'}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="dropoff">Dropoff Location</Label>
              <div className="relative">
                <div className="absolute left-3 top-3 h-2 w-2 rounded-full bg-red-500" />
                <Input
                  id="dropoff"
                  placeholder="Enter dropoff address"
                  value={form.dropoff_address}
                  onChange={(e) => setForm({ ...form, dropoff_address: e.target.value })}
                  className="pl-8"
                />
              </div>
            </div>
            <Button
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              onClick={() => setStep(2)}
              disabled={!form.pickup_address || !form.dropoff_address}
            >
              Choose Ride Type
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Ride Type */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Car className="h-5 w-5 text-blue-600" />
              Choose Your Ride
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              {rideTypes.map((rt) => (
                <button
                  key={rt.id}
                  type="button"
                  onClick={() => setForm({ ...form, ride_type: rt.id })}
                  className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                    form.ride_type === rt.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{rt.emoji}</span>
                      <div>
                        <p className="font-semibold">{rt.label}</p>
                        <p className="text-sm text-gray-500">{rt.desc}</p>
                      </div>
                    </div>
                    <span className="text-sm font-medium text-gray-600">From {rt.min}</span>
                  </div>
                </button>
              ))}
            </div>
            <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600">
              <p className="font-medium mb-1">Trip Summary</p>
              <p>📍 {form.pickup_address}</p>
              <p>🏁 {form.dropoff_address}</p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                Back
              </Button>
              <Button
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                onClick={handleBookRide}
                disabled={loading}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Confirm & Pay
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Payment */}
      {step === 3 && rideData && clientSecret && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-blue-600" />
              Payment Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Ride Type</span>
                <span className="font-medium capitalize">{rideData.ride_type}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Distance</span>
                <span className="font-medium">{rideData.distance_km?.toFixed(1)} km</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Duration</span>
                <span className="font-medium">{rideData.duration_minutes} min</span>
              </div>
              <div className="border-t pt-2 flex justify-between">
                <span className="font-semibold">Total</span>
                <span className="text-xl font-bold text-green-700">${rideData.estimated_price?.toFixed(2)}</span>
              </div>
            </div>
            <Elements
              stripe={stripePromise}
              options={{
                clientSecret,
                appearance: { theme: 'stripe' },
              }}
            >
              <PaymentForm
                clientSecret={clientSecret}
                rideId={rideData.id}
                onSuccess={handlePaymentSuccess}
              />
            </Elements>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
