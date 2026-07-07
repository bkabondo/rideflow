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

// Uber Black / Lyft Lux reference pricing (public rate estimates)
export function getMarketRefPrice(distanceKm: number, durationMin: number): number {
  // Uber Black rates: booking $8 + base $5 + $0.55/min + $2.80/km
  const uberBlack = 8 + 5 + 0.55 * durationMin + 2.80 * distanceKm
  return Math.max(Math.round(uberBlack * 100) / 100, 25)
}

// Luxury pricing for fleet service
export function calculateLuxuryPrice(
  distanceKm: number,
  durationMin: number,
  vehicleType: string
): number {
  const configs: Record<string, { base: number; perMin: number; perKm: number; min: number }> = {
    sedan:     { base: 15, perMin: 0.55, perKm: 2.50, min: 35 },
    suv:       { base: 20, perMin: 0.65, perKm: 3.00, min: 50 },
    limousine: { base: 40, perMin: 0.90, perKm: 4.00, min: 100 },
    sprinter:  { base: 35, perMin: 0.80, perKm: 3.50, min: 80 },
  }
  const c = configs[vehicleType] || configs.sedan
  const price = c.base + c.perMin * durationMin + c.perKm * distanceKm
  return Math.max(Math.round(price * 100) / 100, c.min)
}
