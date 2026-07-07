import { Pool } from 'pg'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url)
  if (searchParams.get('token') !== process.env.SETUP_TOKEN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const dbUrl = process.env.DATABASE_URL
  if (!dbUrl) return NextResponse.json({ error: 'DATABASE_URL not set' }, { status: 500 })

  const pool = new Pool({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } })
  let client: import('pg').PoolClient | null = null

  try {
    client = await pool.connect()

    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name='rideflow_inquiries' AND column_name='driver_id'
        ) THEN
          ALTER TABLE rideflow_inquiries ADD COLUMN driver_id UUID REFERENCES rideflow_users(id);
        END IF;
      END $$;
    `)

    // Drop old policy and recreate with driver access
    await client.query(`
      DROP POLICY IF EXISTS "rf_inquiries_parties" ON rideflow_inquiries;
    `)
    await client.query(`
      CREATE POLICY "rf_inquiries_parties" ON rideflow_inquiries FOR ALL
        USING (
          rider_id = auth.uid()
          OR driver_id = auth.uid()
          OR (SELECT role FROM rideflow_users WHERE id = auth.uid()) = 'admin'
        );
    `)

    return NextResponse.json({ status: 'Migration complete — driver_id column added, RLS updated' })
  } catch (e: unknown) {
    const err = e as Error
    return NextResponse.json({ error: err.message, stack: err.stack?.slice(0, 500) }, { status: 500 })
  } finally {
    if (client) client.release()
    try { await pool.end() } catch (_) { /* ignore */ }
  }
}
