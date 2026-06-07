'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Car } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/auth/reset-password`,
    })
    setLoading(false)
    if (error) toast.error(error.message)
    else setSent(true)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-8">
          <Car className="h-8 w-8 text-blue-400" />
          <span className="text-3xl font-bold text-white">RideFlow</span>
        </div>
        <Card className="bg-white/5 border-white/10 text-white">
          <CardHeader>
            <CardTitle className="text-2xl text-white">Reset Password</CardTitle>
            <CardDescription className="text-slate-400">
              Enter your email to receive a reset link
            </CardDescription>
          </CardHeader>
          {sent ? (
            <CardContent className="text-center space-y-4">
              <p className="text-4xl">📬</p>
              <p className="text-slate-300 text-sm">
                Check <strong className="text-white">{email}</strong> for a reset link.
              </p>
              <Link href="/login">
                <Button variant="outline" className="w-full border-white/20 text-slate-200 hover:bg-white/10">
                  Back to Sign In
                </Button>
              </Link>
            </CardContent>
          ) : (
            <>
              <CardContent>
                <form id="reset-form" onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-slate-300">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="bg-white/10 border-white/20 text-white placeholder:text-slate-500 focus:border-blue-400"
                    />
                  </div>
                </form>
              </CardContent>
              <CardFooter className="flex flex-col gap-3">
                <Button
                  type="submit"
                  form="reset-form"
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </Button>
                <p className="text-sm text-slate-400 text-center">
                  Remember it?{' '}
                  <Link href="/login" className="text-blue-400 hover:underline">Sign in</Link>
                </p>
              </CardFooter>
            </>
          )}
        </Card>
      </div>
    </div>
  )
}
