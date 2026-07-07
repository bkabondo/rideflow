'use client'

import { useState, useRef, useCallback } from 'react'
import { useJsApiLoader, Autocomplete as GAutocomplete } from '@react-google-maps/api'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  MapPin, Calendar, Users, Car, Sparkles, ChevronRight, ChevronLeft,
  CheckCircle, Loader2, Music, Thermometer, Gift, Navigation,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { GeoPoint } from './MapView'

const MapView = dynamic(() => import('./MapView'), { ssr: false })

type VehicleType = 'sedan' | 'suv' | 'limousine' | 'sprinter'
type Libraries = ('places')[]
const LIBRARIES: Libraries = ['places']

const VEHICLES = [
  { id: 'sedan' as VehicleType, name: 'Executive Sedan', desc: 'Mercedes S-Class or similar', emoji: '🚗', seats: '1-3 pax', from: '$35' },
  { id: 'suv' as VehicleType, name: 'Premium SUV', desc: 'Cadillac Escalade or similar', emoji: '🚙', seats: '1-6 pax', from: '$50' },
  { id: 'limousine' as VehicleType, name: 'Stretch Limousine', desc: '10-passenger luxury limo', emoji: '🤵', seats: '1-10 pax', from: '$100' },
  { id: 'sprinter' as VehicleType, name: 'Sprinter Van', desc: 'Mercedes Sprinter executive', emoji: '🚐', seats: '1-12 pax', from: '$80' },
]

const MUSIC_OPTIONS = ['Hip-Hop', 'Pop', 'Jazz', 'Classical', 'R&B', 'Electronic', 'No preference']
const TEMP_OPTIONS = ['Cool (68°F)', 'Comfortable (72°F)', 'Warm (76°F)']
const EXTRAS = ['Bottled Water', 'Phone Charger', 'Privacy Divider', 'Champagne/Sparkling Water', 'Child Seat', 'Flowers/Decoration']
const OCCASIONS = ['Business/Corporate', 'Airport Transfer', 'Wedding', 'Prom/Formal', 'Anniversary/Date Night', 'Night Out', 'Medical Appointment', 'Tour/Sightseeing', 'Other']

export default function ReserveClient({ isGuest = false }: { isGuest?: boolean }) {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [locating, setLocating] = useState(false)
  const [loading, setLoading] = useState(false)

  const [guestName, setGuestName] = useState('')
  const [guestEmail, setGuestEmail] = useState('')
  const [guestPhone, setGuestPhone] = useState('')

  const [pickup, setPickup] = useState('')
  const [dropoff, setDropoff] = useState('')
  const [pickupGeo, setPickupGeo] = useState<GeoPoint | null>(null)
  const [dropoffGeo, setDropoffGeo] = useState<GeoPoint | null>(null)

  const pickupRef = useRef<google.maps.places.Autocomplete | null>(null)
  const dropoffRef = useRef<google.maps.places.Autocomplete | null>(null)

  const [form, setForm] = useState({
    pickup_datetime: '',
    passengers: 1,
    luggage: 'none',
    vehicle_type: 'sedan' as VehicleType,
    music: 'No preference',
    temperature: 'Comfortable (72°F)',
    extras: [] as string[],
    occasion: '',
    special_requests: '',
  })

  const [inquiryResult, setInquiryResult] = useState<{
    inquiryId: string; suggestedPrice: number; marketRefPrice: number
  } | null>(null)

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries: LIBRARIES,
  })

  function extractPlace(place: google.maps.places.PlaceResult): GeoPoint | null {
    const lat = place.geometry?.location?.lat()
    const lng = place.geometry?.location?.lng()
    const label = place.formatted_address || place.name || ''
    if (lat == null || lng == null) return null
    return { lat, lng, label }
  }

  function onPickupChanged() {
    if (!pickupRef.current) return
    const place = pickupRef.current.getPlace()
    const geo = extractPlace(place)
    const label = place.formatted_address || place.name || ''
    setPickup(label)
    setPickupGeo(geo)
  }

  function onDropoffChanged() {
    if (!dropoffRef.current) return
    const place = dropoffRef.current.getPlace()
    const geo = extractPlace(place)
    const label = place.formatted_address || place.name || ''
    setDropoff(label)
    setDropoffGeo(geo)
  }

  async function useMyLocation() {
    if (!navigator.geolocation) { toast.error('Geolocation not supported'); return }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      async ({ coords: { latitude: lat, longitude: lng } }) => {
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
            { headers: { 'Accept-Language': 'en' } }
          )
          const data = await res.json()
          const label = data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`
          setPickup(label)
          setPickupGeo({ lat, lng, label })
        } catch {
          const label = `${lat.toFixed(5)}, ${lng.toFixed(5)}`
          setPickup(label)
          setPickupGeo({ lat, lng, label })
        }
        setLocating(false)
      },
      () => { toast.error('Could not get location'); setLocating(false) }
    )
  }

  function toggleExtra(extra: string) {
    setForm(f => ({
      ...f,
      extras: f.extras.includes(extra) ? f.extras.filter(e => e !== extra) : [...f.extras, extra],
    }))
  }

  async function submitInquiry() {
    if (isGuest && (!guestName.trim() || !guestEmail.trim())) {
      toast.error('Please enter your name and email')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pickup_address: pickup,
          dropoff_address: dropoff,
          pickup_datetime: form.pickup_datetime,
          passengers: form.passengers,
          luggage: form.luggage,
          vehicle_type: form.vehicle_type,
          preferences: {
            music: form.music,
            temperature: form.temperature,
            extras: form.extras,
            occasion: form.occasion,
            special_requests: form.special_requests,
          },
          ...(isGuest ? { guest_name: guestName, guest_email: guestEmail, guest_phone: guestPhone } : {}),
        }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Failed to submit'); setLoading(false); return }
      setInquiryResult({ inquiryId: data.inquiry.id, suggestedPrice: data.suggestedPrice, marketRefPrice: data.marketRefPrice })
      setStep(5)
      toast.success("Inquiry submitted! You'll receive a quote shortly.")
    } catch {
      toast.error('Failed to submit inquiry')
    }
    setLoading(false)
  }

  const selectedVehicle = VEHICLES.find(v => v.id === form.vehicle_type)!
  const stepLabels = ['Locations', 'Vehicle', 'Date & Guests', 'Experience', 'Submitted']

  /* ── Style constants ──────────────────────────────── */
  const goldBtn = 'bg-[#C9A028] hover:bg-[#B8901E] text-black font-bold transition-colors'
  const ghostBtn = 'border border-[#363636] text-[#999] hover:border-[#C9A028] hover:text-[#C9A028] bg-transparent transition-colors'
  const cardCls = 'bg-[#141414] border border-[#2A2A2A] rounded-2xl'
  const selectCls = 'w-full bg-[#1C1C1C] border border-[#363636] text-[#E8E4DC] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#C9A028] transition-colors'
  const inputCls = 'bg-[#1C1C1C] border-[#363636] focus:border-[#C9A028] text-[#E8E4DC] placeholder:text-[#555] h-12 rounded-xl transition-colors'
  const chipActive = 'bg-[#C9A028]/15 border-[#C9A028] text-[#C9A028]'
  const chipIdle = 'border-[#303030] text-[#777] hover:border-[#555] hover:text-[#AAA]'
  const labelCls = 'text-[#A08020] text-[10px] font-bold uppercase tracking-widest'

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      <div className="border-b border-[#1E1E1E] px-6 py-4">
        <button onClick={() => router.push(isGuest ? '/' : '/dashboard')} className="flex items-center gap-2 text-[#666] hover:text-[#C9A028] text-sm transition-colors">
          <ChevronLeft className="h-4 w-4" />{isGuest ? 'Back to Home' : 'Back to Dashboard'}
        </button>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#F0ECE4]">Reserve Your <span className="text-[#C9A028]">Black Car</span></h1>
          <p className="text-[#666] text-sm mt-1">Premium fleet · Personalized service · Direct with owner</p>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-0 mb-10">
          {[1, 2, 3, 4, 5].map((s, i) => (
            <div key={s} className="flex items-center flex-1 last:flex-none">
              <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 border-2 transition-all ${
                step > s ? 'bg-[#C9A028] border-[#C9A028] text-black' :
                step === s ? 'border-[#C9A028] text-[#C9A028] bg-transparent' :
                'border-[#2A2A2A] text-[#555] bg-transparent'
              }`}>
                {step > s ? <CheckCircle className="h-4 w-4" /> : s}
              </div>
              {i < 4 && <div className={`h-px flex-1 mx-2 transition-all ${step > s ? 'bg-[#C9A028]' : 'bg-[#222]'}`} />}
            </div>
          ))}
        </div>
        <p className="text-[#C9A028] text-[10px] font-bold uppercase tracking-widest mb-8 -mt-6">{stepLabels[step - 1]}</p>

        {/* Two-column layout */}
        <div className="flex flex-col lg:flex-row gap-6">

          {/* ── Form column ───────────────────── */}
          <div className="flex-1 min-w-0">

            {/* Step 1 */}
            {step === 1 && (
              <div className={cardCls + ' p-6 space-y-5'}>
                <h2 className="text-xl font-bold text-[#F0ECE4] flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-[#C9A028]" />Where are you going?
                </h2>

                {/* Pickup */}
                <div className="space-y-1.5">
                  <Label className={labelCls}>Pickup Address</Label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 h-2.5 w-2.5 rounded-full bg-green-400 z-10 pointer-events-none" />
                    {isLoaded ? (
                      <GAutocomplete
                        onLoad={ac => { pickupRef.current = ac }}
                        onPlaceChanged={onPickupChanged}
                      >
                        <input
                          value={pickup}
                          onChange={e => { setPickup(e.target.value); if (!e.target.value) setPickupGeo(null) }}
                          placeholder="Start typing your pickup location…"
                          autoComplete="off"
                          className={`w-full pl-9 pr-36 h-12 text-sm rounded-xl border transition-colors bg-[#1C1C1C] border-[#363636] focus:border-[#C9A028] text-[#E8E4DC] placeholder:text-[#555] focus:outline-none`}
                        />
                      </GAutocomplete>
                    ) : (
                      <input
                        value={pickup}
                        onChange={e => setPickup(e.target.value)}
                        placeholder="Start typing your pickup location…"
                        className={`w-full pl-9 pr-36 h-12 text-sm rounded-xl border bg-[#1C1C1C] border-[#363636] text-[#E8E4DC] placeholder:text-[#555] focus:outline-none`}
                      />
                    )}
                    <button type="button" onClick={useMyLocation} disabled={locating}
                      className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 text-xs text-[#C9A028] hover:text-[#E8B830] font-semibold px-2 py-1 rounded-lg hover:bg-[#1A1A1A] disabled:opacity-50 transition-all">
                      <Navigation className="h-3 w-3" />
                      {locating ? 'Locating…' : 'My Location'}
                    </button>
                  </div>
                </div>

                {/* Dropoff */}
                <div className="space-y-1.5">
                  <Label className={labelCls}>Drop-off Address</Label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 h-2.5 w-2.5 rounded-full bg-red-500 z-10 pointer-events-none" />
                    {isLoaded ? (
                      <GAutocomplete
                        onLoad={ac => { dropoffRef.current = ac }}
                        onPlaceChanged={onDropoffChanged}
                      >
                        <input
                          value={dropoff}
                          onChange={e => { setDropoff(e.target.value); if (!e.target.value) setDropoffGeo(null) }}
                          placeholder="Start typing your destination…"
                          autoComplete="off"
                          className={`w-full pl-9 h-12 text-sm rounded-xl border transition-colors bg-[#1C1C1C] border-[#363636] focus:border-[#C9A028] text-[#E8E4DC] placeholder:text-[#555] focus:outline-none`}
                        />
                      </GAutocomplete>
                    ) : (
                      <input
                        value={dropoff}
                        onChange={e => setDropoff(e.target.value)}
                        placeholder="Start typing your destination…"
                        className={`w-full pl-9 h-12 text-sm rounded-xl border bg-[#1C1C1C] border-[#363636] text-[#E8E4DC] placeholder:text-[#555] focus:outline-none`}
                      />
                    )}
                  </div>
                </div>

                <Button onClick={() => setStep(2)} disabled={!pickup || !dropoff} className={goldBtn + ' w-full h-12 mt-2'}>
                  Continue <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            )}

            {/* Step 2 */}
            {step === 2 && (
              <div className={cardCls + ' p-6 space-y-5'}>
                <h2 className="text-xl font-bold text-[#F0ECE4] flex items-center gap-2">
                  <Car className="h-5 w-5 text-[#C9A028]" />Choose Your Vehicle
                </h2>
                <div className="space-y-3">
                  {VEHICLES.map(v => (
                    <button key={v.id} type="button" onClick={() => setForm(f => ({ ...f, vehicle_type: v.id }))}
                      className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                        form.vehicle_type === v.id
                          ? 'border-[#C9A028] bg-[#C9A028]/8'
                          : 'border-[#252525] hover:border-[#383838] bg-[#1A1A1A]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-3xl">{v.emoji}</span>
                          <div>
                            <p className="font-semibold text-[#F0ECE4]">{v.name}</p>
                            <p className="text-xs text-[#666]">{v.desc} · {v.seats}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-[#C9A028] font-bold text-sm">From {v.from}</span>
                          {form.vehicle_type === v.id && <div className="text-[10px] text-[#C9A028]/60 mt-0.5">Selected ✓</div>}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
                <div className="flex gap-3 pt-2">
                  <Button onClick={() => setStep(1)} className={ghostBtn + ' flex-1 h-11'}><ChevronLeft className="h-4 w-4 mr-1" />Back</Button>
                  <Button onClick={() => setStep(3)} className={goldBtn + ' flex-1 h-11'}>Continue <ChevronRight className="h-4 w-4 ml-1" /></Button>
                </div>
              </div>
            )}

            {/* Step 3 */}
            {step === 3 && (
              <div className={cardCls + ' p-6 space-y-5'}>
                <h2 className="text-xl font-bold text-[#F0ECE4] flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-[#C9A028]" />Date, Time & Guests
                </h2>
                <div className="space-y-1.5">
                  <Label className={labelCls}>Pickup Date & Time</Label>
                  <Input
                    type="datetime-local"
                    value={form.pickup_datetime}
                    onChange={e => setForm(f => ({ ...f, pickup_datetime: e.target.value }))}
                    className={inputCls}
                    min={new Date().toISOString().slice(0, 16)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className={labelCls + ' flex items-center gap-1'}><Users className="h-3 w-3" />Passengers</Label>
                    <select value={form.passengers} onChange={e => setForm(f => ({ ...f, passengers: Number(e.target.value) }))} className={selectCls}>
                      {[1,2,3,4,5,6,7,8,9,10].map(n => <option key={n} value={n}>{n} pax</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className={labelCls}>Luggage</Label>
                    <select value={form.luggage} onChange={e => setForm(f => ({ ...f, luggage: e.target.value }))} className={selectCls}>
                      <option value="none">No luggage</option>
                      <option value="light">Light (1-2 bags)</option>
                      <option value="heavy">Heavy (3+ bags)</option>
                      <option value="oversized">Oversized / Golf bags</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className={labelCls}>Occasion</Label>
                  <select value={form.occasion} onChange={e => setForm(f => ({ ...f, occasion: e.target.value }))} className={selectCls}>
                    <option value="">Select occasion (optional)</option>
                    {OCCASIONS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div className="flex gap-3 pt-2">
                  <Button onClick={() => setStep(2)} className={ghostBtn + ' flex-1 h-11'}><ChevronLeft className="h-4 w-4 mr-1" />Back</Button>
                  <Button onClick={() => setStep(4)} disabled={!form.pickup_datetime} className={goldBtn + ' flex-1 h-11'}>Continue <ChevronRight className="h-4 w-4 ml-1" /></Button>
                </div>
              </div>
            )}

            {/* Step 4 */}
            {step === 4 && (
              <div className={cardCls + ' p-6 space-y-6'}>
                <h2 className="text-xl font-bold text-[#F0ECE4] flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-[#C9A028]" />Customize Your Experience
                </h2>

                <div className="space-y-3">
                  <Label className={labelCls + ' flex items-center gap-1.5'}><Music className="h-3.5 w-3.5" />Music Preference</Label>
                  <div className="flex flex-wrap gap-2">
                    {MUSIC_OPTIONS.map(m => (
                      <button key={m} type="button" onClick={() => setForm(f => ({ ...f, music: m }))}
                        className={`px-3 py-1.5 rounded-full text-xs border font-medium transition-all ${form.music === m ? chipActive : chipIdle}`}>{m}</button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className={labelCls + ' flex items-center gap-1.5'}><Thermometer className="h-3.5 w-3.5" />Cabin Temperature</Label>
                  <div className="flex flex-wrap gap-2">
                    {TEMP_OPTIONS.map(t => (
                      <button key={t} type="button" onClick={() => setForm(f => ({ ...f, temperature: t }))}
                        className={`px-3 py-1.5 rounded-full text-xs border font-medium transition-all ${form.temperature === t ? chipActive : chipIdle}`}>{t}</button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className={labelCls + ' flex items-center gap-1.5'}><Gift className="h-3.5 w-3.5" />Add-ons & Extras</Label>
                  <div className="flex flex-wrap gap-2">
                    {EXTRAS.map(extra => (
                      <button key={extra} type="button" onClick={() => toggleExtra(extra)}
                        className={`px-3 py-1.5 rounded-full text-xs border font-medium transition-all ${form.extras.includes(extra) ? chipActive : chipIdle}`}>
                        {form.extras.includes(extra) ? '✓ ' : ''}{extra}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className={labelCls}>Special Requests</Label>
                  <textarea
                    value={form.special_requests}
                    onChange={e => setForm(f => ({ ...f, special_requests: e.target.value }))}
                    placeholder="Any special instructions for the driver…"
                    rows={3}
                    className="w-full bg-[#1C1C1C] border border-[#363636] text-[#E8E4DC] rounded-xl px-4 py-3 placeholder:text-[#555] resize-none focus:outline-none focus:border-[#C9A028] transition-colors text-sm"
                  />
                </div>

                {/* Summary */}
                <div className="bg-[#0E0E0E] border border-[#1E1E1E] rounded-xl p-4 space-y-2 text-sm">
                  <p className="text-[#C9A028] text-[10px] font-bold uppercase tracking-widest mb-3">Reservation Summary</p>
                  {[
                    { label: 'From', val: pickup },
                    { label: 'To', val: dropoff },
                    { label: 'Date', val: form.pickup_datetime ? new Date(form.pickup_datetime).toLocaleString() : '—' },
                    { label: 'Vehicle', val: selectedVehicle.name },
                    { label: 'Passengers', val: `${form.passengers} pax` },
                  ].map(row => (
                    <div key={row.label} className="flex justify-between gap-4">
                      <span className="text-[#666] flex-shrink-0">{row.label}</span>
                      <span className="text-[#E8E4DC] text-right truncate max-w-[220px]">{row.val}</span>
                    </div>
                  ))}
                  {form.extras.length > 0 && (
                    <div className="flex justify-between gap-4">
                      <span className="text-[#666]">Extras</span>
                      <span className="text-[#C9A028] text-right">{form.extras.join(', ')}</span>
                    </div>
                  )}
                </div>

                {isGuest && (
                  <div className="space-y-3 pt-2 border-t border-[#2A2A2A] mt-4">
                    <p className={labelCls}>Your Contact Info</p>
                    <Input
                      placeholder="Full name *"
                      value={guestName}
                      onChange={e => setGuestName(e.target.value)}
                      className={inputCls}
                    />
                    <Input
                      type="email"
                      placeholder="Email address *"
                      value={guestEmail}
                      onChange={e => setGuestEmail(e.target.value)}
                      className={inputCls}
                    />
                    <Input
                      placeholder="Phone (optional)"
                      value={guestPhone}
                      onChange={e => setGuestPhone(e.target.value)}
                      className={inputCls}
                    />
                    <p className="text-xs text-[#666]">We&apos;ll send your confirmation to this email. <Link href="/signup" className="text-[#C9A028] hover:underline">Create an account</Link> to track all your rides.</p>
                  </div>
                )}

                <div className="flex gap-3">
                  <Button onClick={() => setStep(3)} className={ghostBtn + ' flex-1 h-11'}><ChevronLeft className="h-4 w-4 mr-1" />Back</Button>
                  <Button onClick={submitInquiry} disabled={loading} className={goldBtn + ' flex-1 h-11'}>
                    {loading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Submitting…</> : <>Submit Inquiry <ChevronRight className="h-4 w-4 ml-1" /></>}
                  </Button>
                </div>
              </div>
            )}

            {/* Step 5 */}
            {step === 5 && inquiryResult && (
              <div className={cardCls + ' p-8 text-center space-y-6'}>
                <div className="w-16 h-16 rounded-full border-2 border-[#C9A028] flex items-center justify-center mx-auto">
                  <CheckCircle className="h-8 w-8 text-[#C9A028]" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-[#F0ECE4] mb-2">Inquiry Submitted!</h2>
                  <p className="text-[#777] text-sm">We&apos;ve received your reservation and will send you a custom quote within the hour.</p>
                </div>
                <div className="bg-[#0E0E0E] border border-[#1E1E1E] rounded-xl p-5 space-y-3 text-sm text-left">
                  <div className="flex justify-between items-center">
                    <span className="text-[#666]">Suggested price</span>
                    <span className="text-[#C9A028] font-bold text-xl">${inquiryResult.suggestedPrice.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[#666]">Uber Black reference</span>
                    <span className="text-[#555] line-through">${inquiryResult.marketRefPrice.toFixed(2)}</span>
                  </div>
                  <p className="text-[#555] text-xs pt-2 border-t border-[#1A1A1A]">Reference pricing is for comparison only. Final quote is set by the owner.</p>
                </div>
                <Button onClick={() => router.push(isGuest ? '/' : '/dashboard')} className={ghostBtn + ' w-full h-11'}>
                  {isGuest ? 'Back to Home' : 'Track Your Inquiry in Dashboard'}
                </Button>
              </div>
            )}
          </div>

          {/* ── Map column ──────────────────── */}
          <div className="lg:w-[480px] xl:w-[560px] flex-shrink-0">
            <div className="lg:sticky lg:top-6">
              <div className="h-[420px] lg:h-[580px] rounded-2xl overflow-hidden border border-[#2A2A2A] shadow-2xl">
                <MapView pickup={pickupGeo} dropoff={dropoffGeo} isLoaded={isLoaded} />
              </div>
              {(pickupGeo || dropoffGeo) && (
                <div className="mt-3 bg-[#141414] border border-[#2A2A2A] rounded-xl px-4 py-3 space-y-1.5 text-xs">
                  {pickupGeo && (
                    <div className="flex items-start gap-2">
                      <div className="h-2 w-2 rounded-full bg-green-400 mt-0.5 flex-shrink-0" />
                      <span className="text-[#888] line-clamp-1">{pickupGeo.label}</span>
                    </div>
                  )}
                  {dropoffGeo && (
                    <div className="flex items-start gap-2">
                      <div className="h-2 w-2 rounded-full bg-red-500 mt-0.5 flex-shrink-0" />
                      <span className="text-[#888] line-clamp-1">{dropoffGeo.label}</span>
                    </div>
                  )}
                </div>
              )}
              {!pickupGeo && !dropoffGeo && (
                <div className="mt-3 bg-[#141414] border border-[#2A2A2A] rounded-xl px-4 py-4 text-center">
                  <p className="text-[#555] text-xs">Enter addresses above to see your route on the map</p>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
