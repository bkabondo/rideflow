import { Pool } from 'pg'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url)
  if (searchParams.get('token') !== process.env.SETUP_TOKEN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
  const client = await pool.connect()
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS rideflow_users (
        id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
        email TEXT NOT NULL UNIQUE, full_name TEXT,
        role TEXT DEFAULT 'rider' CHECK (role IN ('admin','driver','rider')),
        rating NUMERIC DEFAULT 5.0, stripe_customer_id TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      GRANT ALL ON rideflow_users TO anon, authenticated;
      ALTER TABLE rideflow_users ENABLE ROW LEVEL SECURITY;
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='rf_users_self' AND tablename='rideflow_users') THEN
          CREATE POLICY "rf_users_self" ON rideflow_users FOR ALL USING (auth.uid()=id OR (SELECT role FROM rideflow_users WHERE id=auth.uid())='admin');
        END IF;
      END $$;
      CREATE TABLE IF NOT EXISTS rideflow_driver_profiles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES rideflow_users(id) ON DELETE CASCADE UNIQUE,
        vehicle_model TEXT, vehicle_plate TEXT, vehicle_color TEXT,
        is_available BOOLEAN DEFAULT true, total_rides INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      GRANT ALL ON rideflow_driver_profiles TO anon, authenticated;
      ALTER TABLE rideflow_driver_profiles ENABLE ROW LEVEL SECURITY;
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='rf_driver_profiles_all' AND tablename='rideflow_driver_profiles') THEN
          CREATE POLICY "rf_driver_profiles_all" ON rideflow_driver_profiles FOR ALL USING (true);
        END IF;
      END $$;
      CREATE TABLE IF NOT EXISTS rideflow_rides (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        rider_id UUID NOT NULL REFERENCES rideflow_users(id) ON DELETE CASCADE,
        driver_id UUID REFERENCES rideflow_users(id),
        pickup_address TEXT NOT NULL, dropoff_address TEXT NOT NULL,
        ride_type TEXT DEFAULT 'economy' CHECK (ride_type IN ('economy','comfort','premium')),
        estimated_price NUMERIC, final_price NUMERIC,
        status TEXT DEFAULT 'pending' CHECK (status IN ('pending','accepted','in_progress','completed','cancelled')),
        stripe_payment_intent_id TEXT, stripe_payment_status TEXT DEFAULT 'unpaid',
        distance_km NUMERIC, duration_minutes INTEGER,
        created_at TIMESTAMPTZ DEFAULT NOW(), completed_at TIMESTAMPTZ
      );
      GRANT ALL ON rideflow_rides TO anon, authenticated;
      ALTER TABLE rideflow_rides ENABLE ROW LEVEL SECURITY;
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='rf_rides_parties' AND tablename='rideflow_rides') THEN
          CREATE POLICY "rf_rides_parties" ON rideflow_rides FOR ALL USING (rider_id=auth.uid() OR driver_id=auth.uid() OR (SELECT role FROM rideflow_users WHERE id=auth.uid()) IN ('admin','driver'));
        END IF;
      END $$;
      CREATE TABLE IF NOT EXISTS rideflow_inquiries (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        rider_id UUID NOT NULL REFERENCES rideflow_users(id) ON DELETE CASCADE,
        pickup_address TEXT NOT NULL,
        dropoff_address TEXT NOT NULL,
        pickup_datetime TIMESTAMPTZ NOT NULL,
        passengers INTEGER DEFAULT 1,
        luggage TEXT DEFAULT 'none',
        vehicle_type TEXT DEFAULT 'sedan' CHECK (vehicle_type IN ('sedan','suv','limousine','sprinter')),
        preferences JSONB DEFAULT '{}',
        status TEXT DEFAULT 'inquiry' CHECK (status IN ('inquiry','quoted','confirmed','declined','cancelled','in_progress','completed')),
        quoted_amount NUMERIC,
        suggested_price NUMERIC,
        market_ref_price NUMERIC,
        payment_mode TEXT DEFAULT 'required' CHECK (payment_mode IN ('required','optional','none')),
        quote_message TEXT,
        stripe_payment_intent_id TEXT,
        stripe_payment_status TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      GRANT ALL ON rideflow_inquiries TO anon, authenticated;
      ALTER TABLE rideflow_inquiries ENABLE ROW LEVEL SECURITY;
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='rf_inquiries_parties' AND tablename='rideflow_inquiries') THEN
          CREATE POLICY "rf_inquiries_parties" ON rideflow_inquiries FOR ALL USING (rider_id=auth.uid() OR (SELECT role FROM rideflow_users WHERE id=auth.uid())='admin');
        END IF;
      END $$;
      CREATE TABLE IF NOT EXISTS rideflow_ratings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        ride_id UUID NOT NULL REFERENCES rideflow_rides(id) ON DELETE CASCADE UNIQUE,
        rated_by UUID NOT NULL REFERENCES rideflow_users(id),
        rated_user UUID NOT NULL REFERENCES rideflow_users(id),
        score INTEGER NOT NULL CHECK (score BETWEEN 1 AND 5), comment TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      GRANT ALL ON rideflow_ratings TO anon, authenticated;
      ALTER TABLE rideflow_ratings ENABLE ROW LEVEL SECURITY;
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='rf_ratings_all' AND tablename='rideflow_ratings') THEN
          CREATE POLICY "rf_ratings_all" ON rideflow_ratings FOR ALL USING (true);
        END IF;
      END $$;
    `)
    return NextResponse.json({ status: 'Migration complete' })
  } catch (e: unknown) {
    const error = e as Error
    return NextResponse.json({ error: error.message }, { status: 500 })
  } finally {
    client.release()
    await pool.end()
  }
}
