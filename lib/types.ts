export type UserRole = 'admin' | 'driver' | 'rider'
export type RideStatus = 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled'
export type RideType = 'economy' | 'comfort' | 'premium'

export interface RideflowUser {
  id: string
  email: string
  full_name: string | null
  role: UserRole
  rating: number
  stripe_customer_id: string | null
  created_at: string
}

export interface DriverProfile {
  id: string
  user_id: string
  vehicle_model: string | null
  vehicle_plate: string | null
  vehicle_color: string | null
  is_available: boolean
  total_rides: number
  created_at: string
}

export interface Ride {
  id: string
  rider_id: string
  driver_id: string | null
  pickup_address: string
  dropoff_address: string
  ride_type: RideType
  estimated_price: number | null
  final_price: number | null
  status: RideStatus
  stripe_payment_intent_id: string | null
  stripe_payment_status: string
  distance_km: number | null
  duration_minutes: number | null
  created_at: string
  completed_at: string | null
  rider?: RideflowUser
  driver?: RideflowUser
}

export interface Rating {
  id: string
  ride_id: string
  rated_by: string
  rated_user: string
  score: number
  comment: string | null
  created_at: string
}
