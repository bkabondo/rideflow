import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-05-27.dahlia',
})

export function calculateRidePrice(distanceKm: number, rideType: string): number {
  const configs: Record<string, { base: number; perKm: number; min: number }> = {
    economy: { base: 2, perKm: 1.5, min: 5 },
    comfort: { base: 3, perKm: 2.0, min: 8 },
    premium: { base: 5, perKm: 3.0, min: 12 },
  }
  const config = configs[rideType] || configs.economy
  const price = config.base + config.perKm * distanceKm
  return Math.max(price, config.min)
}

export function getMockDistance(): number {
  return Math.round((Math.random() * 18 + 2) * 10) / 10 // 2-20km
}
