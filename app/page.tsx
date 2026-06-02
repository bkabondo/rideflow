import Link from 'next/link'
import { Car, Shield, CreditCard, Star, Clock, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/server'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900">
      {/* Navbar */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <Car className="h-7 w-7 text-blue-400" />
          <span className="text-2xl font-bold text-white">RideFlow</span>
        </div>
        <div className="flex gap-3">
          {user ? (
            <Link href="/dashboard">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white">Dashboard</Button>
            </Link>
          ) : (
            <>
              <Link href="/login">
                <Button variant="ghost" className="text-white hover:bg-white/10">Sign In</Button>
              </Link>
              <Link href="/signup">
                <Button className="bg-blue-600 hover:bg-blue-700 text-white">Get Started</Button>
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-6 py-24 text-center">
        <div className="inline-flex items-center gap-2 bg-blue-600/20 text-blue-300 px-4 py-2 rounded-full text-sm font-medium mb-6 border border-blue-500/30">
          <Star className="h-4 w-4" />
          Trusted by thousands of riders
        </div>
        <h1 className="text-5xl md:text-7xl font-extrabold text-white mb-6 leading-tight">
          Your Ride,{' '}
          <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
            Your Way
          </span>
        </h1>
        <p className="text-xl text-slate-300 max-w-2xl mx-auto mb-10">
          Book a ride in seconds. Choose Economy, Comfort, or Premium.
          Safe, reliable, and affordable — RideFlow gets you there.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href={user ? '/book' : '/signup'}>
            <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white text-lg px-8 py-6 h-auto">
              <Car className="mr-2 h-5 w-5" />
              Book a Ride Now
            </Button>
          </Link>
          <Link href="/login">
            <Button size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10 text-lg px-8 py-6 h-auto">
              Sign In to Drive
            </Button>
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <h2 className="text-3xl font-bold text-white text-center mb-12">Why Choose RideFlow?</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              icon: <Clock className="h-8 w-8 text-blue-400" />,
              title: 'Instant Booking',
              desc: 'Book your ride in under 30 seconds. Drivers accept in real-time.',
            },
            {
              icon: <Shield className="h-8 w-8 text-green-400" />,
              title: 'Safe & Secure',
              desc: 'Verified drivers, live ride tracking, and 24/7 support for peace of mind.',
            },
            {
              icon: <CreditCard className="h-8 w-8 text-purple-400" />,
              title: 'Secure Payments',
              desc: 'Pay with Stripe. Your payment is only captured after a safe arrival.',
            },
          ].map((feature) => (
            <div key={feature.title} className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center hover:bg-white/10 transition-all">
              <div className="flex justify-center mb-4">{feature.icon}</div>
              <h3 className="text-xl font-semibold text-white mb-3">{feature.title}</h3>
              <p className="text-slate-400">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Ride Types */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <h2 className="text-3xl font-bold text-white text-center mb-12">Choose Your Ride</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { type: 'Economy', emoji: '🚗', desc: 'Affordable daily rides', price: 'From $5', color: 'from-blue-500/20 to-blue-600/10', border: 'border-blue-500/30' },
            { type: 'Comfort', emoji: '🚙', desc: 'Extra space & comfort', price: 'From $8', color: 'from-purple-500/20 to-purple-600/10', border: 'border-purple-500/30' },
            { type: 'Premium', emoji: '🏎️', desc: 'Luxury experience', price: 'From $12', color: 'from-amber-500/20 to-amber-600/10', border: 'border-amber-500/30' },
          ].map((rt) => (
            <div key={rt.type} className={`bg-gradient-to-br ${rt.color} border ${rt.border} rounded-2xl p-8 text-center hover:scale-105 transition-transform`}>
              <div className="text-5xl mb-4">{rt.emoji}</div>
              <h3 className="text-xl font-bold text-white mb-2">{rt.type}</h3>
              <p className="text-slate-400 mb-4">{rt.desc}</p>
              <span className="text-white font-semibold">{rt.price}</span>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-4xl mx-auto px-6 py-20 text-center">
        <div className="bg-gradient-to-r from-blue-600/30 to-cyan-600/30 border border-blue-500/30 rounded-3xl p-12">
          <MapPin className="h-12 w-12 text-blue-400 mx-auto mb-4" />
          <h2 className="text-3xl font-bold text-white mb-4">Ready to Roll?</h2>
          <p className="text-slate-300 mb-8">Join thousands of happy riders. Create your account and book your first ride.</p>
          <Link href={user ? '/book' : '/signup'}>
            <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white text-lg px-10 py-6 h-auto">
              Get Started — It&apos;s Free
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8 text-center">
        <p className="text-slate-500">© 2026 RideFlow. Built with Next.js & Stripe.</p>
      </footer>
    </div>
  )
}
