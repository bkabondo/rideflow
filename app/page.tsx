import Link from 'next/link'
import { Car, Shield, CreditCard, Star, Clock, MapPin, Calendar, Users, Sparkles, Phone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/server'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      {/* Navbar */}
      <nav className="flex items-center justify-between px-6 py-5 max-w-7xl mx-auto border-b border-[#1E1E1E]">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-lg bg-[#C9A028] flex items-center justify-center shadow-md shadow-[#C9A028]/20">
            <Car className="h-5 w-5 text-black" />
          </div>
          <span className="text-xl font-bold tracking-tight">
            Ride<span className="text-[#C9A028]">Flow</span>
          </span>
          <span className="hidden sm:inline text-xs text-[#C9A028] bg-[#C9A028]/10 border border-[#C9A028]/20 px-2 py-0.5 rounded-full ml-1">Premium</span>
        </div>
        <div className="flex gap-3">
          {user ? (
            <Link href="/dashboard">
              <Button className="bg-[#C9A028] hover:bg-[#B8901E] text-black font-bold">Dashboard</Button>
            </Link>
          ) : (
            <>
              <Link href="/login">
                <Button variant="ghost" className="text-[#999] hover:text-[#F0ECE4] hover:bg-white/5">Sign In</Button>
              </Link>
              <Link href="/reserve">
                <Button className="bg-[#C9A028] hover:bg-[#B8901E] text-black font-bold">Demo</Button>
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-6 py-28 text-center relative">
        <div className="absolute inset-0 bg-gradient-to-b from-[#C9A028]/5 to-transparent pointer-events-none" />
        <div className="inline-flex items-center gap-2 bg-[#C9A028]/10 text-[#C9A028] px-4 py-2 rounded-full text-sm font-medium mb-8 border border-[#C9A028]/20">
          <Star className="h-4 w-4 fill-[#C9A028]" />
          Premium Black Car &amp; Limousine Fleet
        </div>
        <h1 className="text-5xl md:text-7xl font-extrabold mb-6 leading-tight tracking-tight">
          Arrive in{' '}
          <span className="bg-gradient-to-r from-[#C9A028] to-[#F0D060] bg-clip-text text-transparent">
            Luxury.
          </span>
          <br />Every Time.
        </h1>
        <p className="text-xl text-[#888] max-w-2xl mx-auto mb-10 leading-relaxed">
          Executive sedans, premium SUVs, stretch limousines, and Sprinter vans.
          Reserve your ride, customize your experience, and get a personalized quote — all in minutes.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/reserve">
            <Button size="lg" className="bg-[#C9A028] hover:bg-[#B8901E] text-black font-bold text-lg px-10 py-6 h-auto rounded-xl">
              <Calendar className="mr-2 h-5 w-5" />Reserve a Ride
            </Button>
          </Link>
          <Link href="/reserve">
            <Button size="lg" variant="outline" className="border-[#2A2A2A] text-[#E8E4DC] hover:bg-white/5 hover:border-[#C9A028] text-lg px-10 py-6 h-auto rounded-xl">
              <Car className="mr-2 h-5 w-5" />Book Instantly
            </Button>
          </Link>
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <p className="text-[#C9A028] text-sm font-semibold uppercase tracking-widest text-center mb-3">How It Works</p>
        <h2 className="text-3xl font-bold text-[#F0ECE4] text-center mb-12">From Inquiry to Ride in 4 Steps</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            { step: '01', icon: <MapPin className="h-6 w-6 text-[#C9A028]" />, title: 'Submit Inquiry', desc: 'Enter your pickup, destination, date, and preferences.' },
            { step: '02', icon: <Sparkles className="h-6 w-6 text-[#C9A028]" />, title: 'Get a Custom Quote', desc: 'The owner reviews and sends you a personalized price quote.' },
            { step: '03', icon: <CreditCard className="h-6 w-6 text-[#C9A028]" />, title: 'Confirm & Pay', desc: 'Accept the quote and pay securely — or pay on the day.' },
            { step: '04', icon: <Car className="h-6 w-6 text-[#C9A028]" />, title: 'Enjoy the Ride', desc: 'Your chauffeur arrives on time. Sit back and enjoy.' },
          ].map(s => (
            <div key={s.step} className="relative">
              <div className="bg-[#141414] border border-[#2A2A2A] rounded-2xl p-6 h-full hover:border-[#C9A028]/30 transition-all">
                <div className="text-[#C9A028]/30 text-5xl font-black mb-4 leading-none">{s.step}</div>
                <div className="mb-3">{s.icon}</div>
                <h3 className="text-lg font-bold text-[#F0ECE4] mb-2">{s.title}</h3>
                <p className="text-[#777] text-sm leading-relaxed">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Fleet */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <p className="text-[#C9A028] text-sm font-semibold uppercase tracking-widest text-center mb-3">The Fleet</p>
        <h2 className="text-3xl font-bold text-[#F0ECE4] text-center mb-12">Choose Your Vehicle</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { emoji: '🚗', name: 'Executive Sedan', desc: 'Mercedes S-Class or similar. Perfect for business and airport runs.', seats: '1-3 pax', from: 'From $35' },
            { emoji: '🚙', name: 'Premium SUV', desc: 'Cadillac Escalade or similar. Extra space for groups and luggage.', seats: '1-6 pax', from: 'From $50' },
            { emoji: '🤵', name: 'Stretch Limousine', desc: 'Full-size limo for weddings, proms, and special occasions.', seats: '1-10 pax', from: 'From $100' },
            { emoji: '🚐', name: 'Sprinter Van', desc: 'Mercedes Sprinter executive van for large groups or tours.', seats: '1-12 pax', from: 'From $80' },
          ].map(v => (
            <div key={v.name} className="bg-[#141414] border border-[#2A2A2A] rounded-2xl p-6 text-center hover:border-[#C9A028]/40 hover:scale-105 transition-all">
              <div className="text-5xl mb-4">{v.emoji}</div>
              <h3 className="text-lg font-bold text-[#F0ECE4] mb-2">{v.name}</h3>
              <p className="text-[#777] text-sm mb-3 leading-relaxed">{v.desc}</p>
              <p className="text-[#555] text-xs mb-1">{v.seats}</p>
              <p className="text-[#C9A028] font-semibold">{v.from}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <h2 className="text-3xl font-bold text-[#F0ECE4] text-center mb-12">Why Choose RideFlow?</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { icon: <Sparkles className="h-7 w-7 text-[#C9A028]" />, title: 'Fully Customizable', desc: 'Choose your music, cabin temperature, extras like champagne, flowers, phone chargers, and more.' },
            { icon: <Shield className="h-7 w-7 text-[#C9A028]" />, title: 'Transparent Pricing', desc: "See Uber Black reference prices. Know you're getting a fair, competitive quote from a local provider." },
            { icon: <Phone className="h-7 w-7 text-[#C9A028]" />, title: 'Direct with the Owner', desc: 'No middleman. You deal directly with the fleet owner — faster responses, better service, real relationships.' },
            { icon: <Clock className="h-7 w-7 text-[#C9A028]" />, title: 'Advance Reservations', desc: 'Book days or weeks ahead. Ideal for airports, weddings, and corporate events that need reliability.' },
            { icon: <CreditCard className="h-7 w-7 text-[#C9A028]" />, title: 'Flexible Payments', desc: 'Pay securely by card via Stripe, or choose cash/invoice — the owner decides what works.' },
            { icon: <Users className="h-7 w-7 text-[#C9A028]" />, title: 'Any Group Size', desc: 'From solo executives to 12-person corporate teams. We have a vehicle for every occasion.' },
          ].map(f => (
            <div key={f.title} className="bg-[#141414] border border-[#2A2A2A] rounded-2xl p-6 hover:border-[#C9A028]/20 transition-all">
              <div className="mb-4">{f.icon}</div>
              <h3 className="text-lg font-semibold text-[#F0ECE4] mb-2">{f.title}</h3>
              <p className="text-[#777] text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-4xl mx-auto px-6 py-20 text-center">
        <div className="bg-gradient-to-br from-[#C9A028]/20 to-[#141414] border border-[#C9A028]/20 rounded-3xl p-12">
          <div className="h-16 w-16 bg-[#C9A028]/15 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Car className="h-8 w-8 text-[#C9A028]" />
          </div>
          <h2 className="text-3xl font-bold text-[#F0ECE4] mb-4">Ready to Ride in Style?</h2>
          <p className="text-[#888] mb-8 max-w-lg mx-auto">Submit a reservation, explore the full booking flow, and see how quotes, driver assignment, and payments all work together.</p>
          <Link href="/reserve">
            <Button size="lg" className="bg-[#C9A028] hover:bg-[#B8901E] text-black font-bold text-lg px-12 py-6 h-auto rounded-xl">
              Reserve Now — It&apos;s Free
            </Button>
          </Link>
        </div>
      </section>

      <footer className="border-t border-[#1E1E1E] py-8 text-center">
        <p className="text-[#444] text-sm">© 2026 RideFlow Premium. Powered by Next.js &amp; Stripe.</p>
      </footer>
    </div>
  )
}
