import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-05-27.dahlia',
})

// Uber-style pricing: booking fee + base fare + (per-min * duration) + (per-km * distance)
export function calculateRidePrice(distanceKm: number, durationMin: number, rideType: string): number {
  const configs: Record<string, { bookingFee: number; baseFare: number; perMin: number; perKm: number; min: number }> = {
    economy: { bookingFee: 1.85, baseFare: 1.00, perMin: 0.22, perKm: 1.47, min: 5.00 },
    comfort:  { bookingFee: 2.50, baseFare: 1.50, perMin: 0.28, perKm: 1.77, min: 8.00 },
    premium:  { bookingFee: 3.75, baseFare: 2.50, perMin: 0.35, perKm: 2.42, min: 12.00 },
  }
  const c = configs[rideType] || configs.economy
  const price = c.bookingFee + c.baseFare + (c.perMin * durationMin) + (c.perKm * distanceKm)
  return Math.max(Math.round(price * 100) / 100, c.min)
}

export function getMockDistance(): number {
  return Math.round((Math.random() * 18 + 2) * 10) / 10 // 2-20km
}
