'use client'

import { useState, useEffect, useCallback } from 'react'
import { Car, DollarSign, TrendingUp, RefreshCw, Shield, Clock, CheckCircle, XCircle, Send, FileText, ChevronDown, ChevronUp, UserCheck } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { RideflowUser, Inquiry } from '@/lib/types'

interface AdminDashboardProps { user: RideflowUser }

const QUOTE_TEMPLATES = [
  { name: 'Airport Transfer', multiplier: 1.0, note: 'Standard airport transfer rate. Includes meet & greet, luggage assistance.' },
  { name: 'Wedding / Special Event', multiplier: 1.4, note: 'Premium event rate. Includes decorations setup, extended wait time.' },
  { name: 'Hourly Charter (2h)', multiplier: null, flat: 150, note: 'Flat 2-hour charter rate. Driver on standby for your schedule.' },
  { name: 'Corporate Rate', multiplier: 0.85, note: 'Discounted corporate rate. Invoice available on request.' },
  { name: 'Custom', multiplier: null, flat: null, note: '' },
]

const STATUS_COLORS: Record<string, string> = {
  inquiry:     'border-yellow-500/50 text-yellow-400 bg-yellow-500/10',
  quoted:      'border-[#C9A028]/60 text-[#C9A028] bg-[#C9A028]/10',
  confirmed:   'border-green-500/50 text-green-400 bg-green-500/10',
  declined:    'border-red-500/50 text-red-400 bg-red-500/10',
  cancelled:   'border-[#333] text-[#777] bg-[#111]',
  in_progress: 'border-purple-500/50 text-purple-400 bg-purple-500/10',
  completed:   'border-green-500/50 text-green-400 bg-green-500/10',
}

interface DriverOption { id: string; full_name: string | null; email: string; rating: number }

function QuoteModal({ inquiry, onClose, onQuoted }: { inquiry: Inquiry; onClose: () => void; onQuoted: () => void }) {
  const suggestedPrice = (inquiry as Inquiry & { suggested_price?: number }).suggested_price ?? 0
  const [amount, setAmount] = useState(suggestedPrice.toFixed(2))
  const [paymentMode, setPaymentMode] = useState<'required' | 'optional' | 'none'>('required')
  const [message, setMessage] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState(-1)
  const [loading, setLoading] = useState(false)

  function applyTemplate(idx: number) {
    setSelectedTemplate(idx)
    const t = QUOTE_TEMPLATES[idx]
    if (t.flat) {
      setAmount(t.flat.toFixed(2))
      setMessage(t.note)
    } else if (t.multiplier && suggestedPrice) {
      setAmount((suggestedPrice * t.multiplier).toFixed(2))
      setMessage(t.note)
    } else {
      setMessage(t.note)
    }
  }

  async function sendQuote() {
    const amt = parseFloat(amount)
    if (!amt || amt <= 0) { toast.error('Enter a valid amount'); return }
    setLoading(true)
    const res = await fetch(`/api/inquiries/${inquiry.id}/quote`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quoted_amount: amt, payment_mode: paymentMode, quote_message: message }),
    })
    if (res.ok) {
      toast.success('Quote sent! Customer notified via email.')
      onQuoted()
      onClose()
    } else {
      const err = await res.json()
      toast.error(err.error || 'Failed to send quote')
    }
    setLoading(false)
  }

  const prefs = inquiry.preferences || {}

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#141414] border border-[#2A2A2A] rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-[#F5F0E8]">Send Quote</h2>
            <button onClick={onClose} className="text-[#777] hover:text-red-400 transition-colors"><XCircle className="h-5 w-5" /></button>
          </div>

          <div className="bg-[#0E0E0E] border border-[#2A2A2A] rounded-xl p-4 text-sm space-y-1.5">
            <p className="text-[#C9A028] text-[10px] font-bold uppercase tracking-widest mb-2">Inquiry Summary</p>
            <p className="text-[#F5F0E8]">📍 {inquiry.pickup_address}</p>
            <p className="text-[#F5F0E8]">🏁 {inquiry.dropoff_address}</p>
            <p className="text-[#888]">📅 {new Date(inquiry.pickup_datetime).toLocaleString()}</p>
            <p className="text-[#888]">🚗 {inquiry.vehicle_type} · {inquiry.passengers} pax · {inquiry.luggage}</p>
            {prefs.occasion && <p className="text-[#888]">🎉 {prefs.occasion}</p>}
            {(prefs.extras?.length ?? 0) > 0 && <p className="text-[#C9A028]">✨ {(prefs.extras ?? []).join(', ')}</p>}
            {prefs.special_requests && <p className="text-[#777] italic">"{prefs.special_requests}"</p>}
            {inquiry.market_ref_price && <p className="text-[#777] text-xs mt-2">Uber Black reference: ${inquiry.market_ref_price.toFixed(2)}</p>}
            {suggestedPrice > 0 && <p className="text-[#C9A028] text-xs">Suggested: ${suggestedPrice.toFixed(2)}</p>}
          </div>

          <div>
            <p className="text-[#777] text-[10px] font-bold uppercase tracking-widest mb-2 flex items-center gap-1">
              <FileText className="h-3 w-3" />Quick Templates
            </p>
            <div className="flex flex-wrap gap-2">
              {QUOTE_TEMPLATES.map((t, i) => (
                <button key={t.name} type="button" onClick={() => applyTemplate(i)}
                  className={`px-3 py-1.5 rounded-full text-xs border transition-all font-medium ${
                    selectedTemplate === i
                      ? 'bg-[#C9A028]/20 border-[#C9A028] text-[#C9A028]'
                      : 'border-[#363636] text-[#777] hover:border-[#444] hover:text-[#888]'
                  }`}>{t.name}</button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[#A08020] text-xs font-semibold uppercase tracking-widest">Quote Amount</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#C9A028] font-bold">$</span>
              <Input type="number" value={amount} onChange={e => setAmount(e.target.value)}
                className="bg-[#1C1C1C] border-[#363636] focus:border-[#C9A028] text-[#F5F0E8] pl-7 text-2xl font-bold h-14 rounded-xl"
                step="0.01" min="0" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[#A08020] text-xs font-semibold uppercase tracking-widest">Payment Option</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'required', label: 'Card Required', desc: 'Must pay to confirm' },
                { value: 'optional', label: 'Optional', desc: 'Pay on the day' },
                { value: 'none', label: 'No Charge', desc: 'Cash / Invoice' },
              ].map(opt => (
                <button key={opt.value} type="button" onClick={() => setPaymentMode(opt.value as 'required' | 'optional' | 'none')}
                  className={`p-3 rounded-xl border text-left transition-all ${paymentMode === opt.value ? 'bg-[#C9A028]/10 border-[#C9A028]' : 'border-[#363636] hover:border-[#505050]'}`}>
                  <p className={`text-xs font-semibold ${paymentMode === opt.value ? 'text-[#C9A028]' : 'text-[#888]'}`}>{opt.label}</p>
                  <p className="text-[10px] text-[#777] mt-0.5">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[#A08020] text-xs font-semibold uppercase tracking-widest">Message to Client</label>
            <textarea value={message} onChange={e => setMessage(e.target.value)}
              placeholder="Add a personal note to the customer…" rows={3}
              className="w-full bg-[#111] border border-[#2A2A2A] text-[#F5F0E8] rounded-xl px-4 py-3 text-sm placeholder:text-[#777] resize-none focus:outline-none focus:border-[#C9A028] transition-colors" />
          </div>

          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 h-11 border border-[#2A2A2A] text-[#777] hover:text-[#888] rounded-xl transition-colors text-sm font-medium">Cancel</button>
            <Button onClick={sendQuote} disabled={loading} className="flex-1 h-11 bg-[#C9A028] hover:bg-[#B8901E] text-black font-bold">
              {loading ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
              Send Quote
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

function AssignDriverModal({ inquiry, drivers, onClose, onAssigned }: {
  inquiry: Inquiry
  drivers: DriverOption[]
  onClose: () => void
  onAssigned: () => void
}) {
  const [selectedDriver, setSelectedDriver] = useState(inquiry.driver_id ?? '')
  const [loading, setLoading] = useState(false)

  async function assign() {
    if (!selectedDriver) { toast.error('Select a driver'); return }
    setLoading(true)
    const res = await fetch(`/api/inquiries/${inquiry.id}/assign-driver`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ driver_id: selectedDriver }),
    })
    const data = await res.json()
    setLoading(false)
    if (res.ok) {
      toast.success(`Driver ${data.driverName} assigned!`)
      onAssigned()
      onClose()
    } else {
      toast.error(data.error || 'Failed to assign driver')
    }
  }

  async function unassign() {
    setLoading(true)
    const res = await fetch(`/api/inquiries/${inquiry.id}/assign-driver`, { method: 'DELETE' })
    setLoading(false)
    if (res.ok) { toast.success('Driver removed'); onAssigned(); onClose() }
    else { const d = await res.json(); toast.error(d.error) }
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#141414] border border-[#2A2A2A] rounded-2xl w-full max-w-md shadow-2xl">
        <div className="p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-[#F5F0E8]">Assign Driver</h2>
            <button onClick={onClose} className="text-[#777] hover:text-red-400 transition-colors"><XCircle className="h-5 w-5" /></button>
          </div>

          <div className="bg-[#0E0E0E] border border-[#2A2A2A] rounded-xl p-3 text-xs text-[#888] space-y-0.5">
            <p className="text-[#C9A028] font-semibold">Reservation #{inquiry.id.slice(0, 8).toUpperCase()}</p>
            <p>📍 {inquiry.pickup_address}</p>
            <p>🏁 {inquiry.dropoff_address}</p>
            <p>📅 {new Date(inquiry.pickup_datetime).toLocaleString()}</p>
          </div>

          <div className="space-y-1.5">
            <label className="text-[#A08020] text-[10px] font-bold uppercase tracking-widest">Select Driver</label>
            {drivers.length === 0 ? (
              <p className="text-[#777] text-sm">No drivers registered yet</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {drivers.map(d => (
                  <button key={d.id} type="button" onClick={() => setSelectedDriver(d.id)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border-2 text-left transition-all ${
                      selectedDriver === d.id
                        ? 'border-[#C9A028] bg-[#C9A028]/10'
                        : 'border-[#2A2A2A] hover:border-[#3A3A3A] bg-[#0E0E0E]'
                    }`}>
                    <div>
                      <p className={`text-sm font-semibold ${selectedDriver === d.id ? 'text-[#C9A028]' : 'text-[#E8E4DC]'}`}>
                        {d.full_name ?? d.email}
                      </p>
                      <p className="text-[#777] text-xs">{d.email}</p>
                    </div>
                    <span className="text-xs text-[#888]">⭐ {d.rating.toFixed(1)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-3">
            {inquiry.driver_id && (
              <button onClick={unassign} disabled={loading}
                className="flex-1 h-10 border border-red-800/50 text-red-400 hover:bg-red-900/20 rounded-xl text-sm transition-colors disabled:opacity-50">
                Remove Driver
              </button>
            )}
            <button onClick={assign} disabled={loading || !selectedDriver}
              className="flex-1 h-10 bg-[#C9A028] hover:bg-[#B8901E] disabled:opacity-60 text-black font-bold rounded-xl text-sm flex items-center justify-center gap-2 transition-colors">
              {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <UserCheck className="h-4 w-4" />}
              Assign Driver
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function InquiryRow({ inq, drivers, onRefresh }: { inq: Inquiry & { suggested_price?: number }; drivers: DriverOption[]; onRefresh: () => void }) {
  const [expanded, setExpanded] = useState(false)
  const [quoting, setQuoting] = useState(false)
  const [assigning, setAssigning] = useState(false)
  const prefs = inq.preferences || {}
  const rider = inq.rider as (RideflowUser & { email: string }) | null
  const assignedDriver = drivers.find(d => d.id === inq.driver_id)

  return (
    <>
      <tr className="border-b border-[#2A2A2A] hover:bg-[#111] transition-colors">
        <td className="py-3 px-3">
          <p className="font-medium text-[#F5F0E8] text-sm truncate max-w-[180px]">{inq.pickup_address}</p>
          <p className="text-[#777] text-xs truncate max-w-[180px]">{inq.dropoff_address}</p>
        </td>
        <td className="py-3 px-3 text-xs">
          <p className="text-[#888]">{new Date(inq.pickup_datetime).toLocaleDateString()}</p>
          <p className="text-[#777]">{new Date(inq.pickup_datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
        </td>
        <td className="py-3 px-3 text-xs">
          <p className="capitalize text-[#888]">{inq.vehicle_type}</p>
          <p className="text-[#777]">{inq.passengers} pax</p>
        </td>
        <td className="py-3 px-3">
          <p className="text-[#888] text-sm">{rider?.full_name ?? 'N/A'}</p>
          <p className="text-[#777] text-xs">{rider?.email ?? ''}</p>
        </td>
        <td className="py-3 px-3">
          <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded border ${STATUS_COLORS[inq.status] || 'border-[#333] text-[#777]'}`}>
            {inq.status.replace('_', ' ')}
          </span>
          {assignedDriver && (
            <p className="text-[10px] text-[#C9A028] mt-1 truncate max-w-[100px]">👤 {assignedDriver.full_name}</p>
          )}
        </td>
        <td className="py-3 px-3 text-sm">
          {inq.quoted_amount
            ? <span className="text-[#C9A028] font-bold">${inq.quoted_amount.toFixed(2)}</span>
            : <span className="text-[#666]">—</span>}
        </td>
        <td className="py-3 px-3">
          <div className="flex items-center gap-2">
            {inq.status === 'inquiry' && (
              <Button size="sm" onClick={() => setQuoting(true)} className="bg-[#C9A028] hover:bg-[#B8901E] text-black text-xs font-bold px-3 py-1 h-7">
                <Send className="h-3 w-3 mr-1" />Quote
              </Button>
            )}
            {inq.status === 'confirmed' && (
              <Button size="sm" onClick={() => setAssigning(true)} className={`text-xs font-bold px-3 py-1 h-7 ${inq.driver_id ? 'bg-green-700 hover:bg-green-600 text-white' : 'bg-[#1C1C1C] border border-[#C9A028]/40 text-[#C9A028] hover:bg-[#C9A028]/10'}`}>
                <UserCheck className="h-3 w-3 mr-1" />{inq.driver_id ? 'Driver ✓' : 'Assign'}
              </Button>
            )}
            <button onClick={() => setExpanded(e => !e)} className="text-[#777] hover:text-[#C9A028] transition-colors p-1">
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          </div>
        </td>
      </tr>
      {expanded && (
        <tr className="border-b border-[#2A2A2A] bg-[#0E0E0E]">
          <td colSpan={7} className="px-4 py-3">
            <div className="grid grid-cols-2 gap-4 text-xs text-[#777]">
              <div className="space-y-1">
                {prefs.occasion && <p>🎉 <span className="text-[#888]">{prefs.occasion}</span></p>}
                {prefs.music && <p>🎵 <span className="text-[#888]">{prefs.music}</span></p>}
                {prefs.temperature && <p>🌡️ <span className="text-[#888]">{prefs.temperature}</span></p>}
                <p>🧳 <span className="text-[#888] capitalize">{inq.luggage}</span></p>
              </div>
              <div className="space-y-1">
                {(prefs.extras?.length ?? 0) > 0 && <p>✨ <span className="text-[#C9A028]">{(prefs.extras ?? []).join(', ')}</span></p>}
                {prefs.special_requests && <p className="italic text-[#777]">"{prefs.special_requests}"</p>}
                {inq.market_ref_price && <p>Uber Black: <span className="text-yellow-400">${inq.market_ref_price.toFixed(2)}</span></p>}
                {(inq as Inquiry & { suggested_price?: number }).suggested_price && <p>Suggested: <span className="text-[#C9A028]">${(inq as Inquiry & { suggested_price?: number }).suggested_price?.toFixed(2)}</span></p>}
                {assignedDriver && <p>Driver: <span className="text-[#C9A028]">{assignedDriver.full_name}</span></p>}
              </div>
            </div>
          </td>
        </tr>
      )}
      {quoting && <tr><td colSpan={7}><QuoteModal inquiry={inq} onClose={() => setQuoting(false)} onQuoted={onRefresh} /></td></tr>}
      {assigning && <tr><td colSpan={7}><AssignDriverModal inquiry={inq} drivers={drivers} onClose={() => setAssigning(false)} onAssigned={onRefresh} /></td></tr>}
    </>
  )
}

export default function AdminDashboard({ user: _user }: AdminDashboardProps) {
  const [inquiries, setInquiries] = useState<(Inquiry & { suggested_price?: number })[]>([])
  const [drivers, setDrivers] = useState<DriverOption[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'inquiries' | 'all'>('inquiries')

  const load = useCallback(async () => {
    setLoading(true)
    const [inqRes, drvRes] = await Promise.all([fetch('/api/inquiries'), fetch('/api/drivers')])
    if (inqRes.ok) setInquiries(await inqRes.json())
    if (drvRes.ok) setDrivers(await drvRes.json())
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const pending = inquiries.filter(i => i.status === 'inquiry')
  const quoted = inquiries.filter(i => i.status === 'quoted')
  const confirmed = inquiries.filter(i => i.status === 'confirmed')
  const revenue = inquiries.filter(i => i.status === 'completed').reduce((s, i) => s + (i.quoted_amount ?? 0), 0)

  const displayed = tab === 'inquiries'
    ? inquiries.filter(i => ['inquiry', 'quoted', 'confirmed'].includes(i.status))
    : inquiries

  const card = 'bg-[#141414] border border-[#2A2A2A] rounded-2xl'

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-[#C9A028]/10 border border-[#C9A028]/30 flex items-center justify-center">
          <Shield className="h-5 w-5 text-[#C9A028]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[#F5F0E8]">Owner Dashboard</h1>
          <p className="text-[#777] text-sm">Manage reservations, send quotes, assign drivers</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'New Inquiries', value: pending.length, icon: <Clock className="h-5 w-5" />, color: 'text-yellow-400', border: 'border-yellow-500/20' },
          { label: 'Quoted', value: quoted.length, icon: <Send className="h-5 w-5" />, color: 'text-[#C9A028]', border: 'border-[#C9A028]/20' },
          { label: 'Confirmed', value: confirmed.length, icon: <CheckCircle className="h-5 w-5" />, color: 'text-green-400', border: 'border-green-500/20' },
          { label: 'Revenue', value: `$${revenue.toFixed(2)}`, icon: <DollarSign className="h-5 w-5" />, color: 'text-[#C9A028]', border: 'border-[#C9A028]/20' },
        ].map(stat => (
          <div key={stat.label} className={`${card} ${stat.border} p-4`}>
            <div className={`${stat.color} mb-2`}>{stat.icon}</div>
            <p className="text-[#777] text-xs">{stat.label}</p>
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button onClick={() => setTab('inquiries')}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${tab === 'inquiries' ? 'bg-[#C9A028] text-black' : 'bg-[#111] border border-[#2A2A2A] text-[#777] hover:text-[#888]'}`}>
          Action Required
          {pending.length > 0 && <span className="ml-1.5 bg-red-500 text-white text-[10px] rounded-full px-1.5 py-0.5">{pending.length}</span>}
        </button>
        <button onClick={() => setTab('all')}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${tab === 'all' ? 'bg-[#C9A028] text-black' : 'bg-[#111] border border-[#2A2A2A] text-[#777] hover:text-[#888]'}`}>
          All Reservations
        </button>
        <button onClick={load} className="ml-auto p-2 bg-[#111] border border-[#2A2A2A] rounded-xl text-[#777] hover:text-[#C9A028] transition-colors">
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {/* Table */}
      <div className={card + ' overflow-hidden'}>
        {loading ? (
          <div className="text-center py-12 text-[#777]">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-3 text-[#C9A028]" />Loading inquiries…
          </div>
        ) : displayed.length === 0 ? (
          <div className="text-center py-12">
            <Car className="h-10 w-10 text-[#1E1E1E] mx-auto mb-3" />
            <p className="text-[#777]">{tab === 'inquiries' ? 'No pending inquiries' : 'No reservations yet'}</p>
            <p className="text-[#666] text-sm mt-1">Share your booking link to start receiving inquiries</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-[#2A2A2A]">
                <tr>
                  {['Route', 'Date', 'Vehicle', 'Client', 'Status', 'Quote', 'Actions'].map(h => (
                    <th key={h} className="text-left py-3 px-3 text-[#666] text-[10px] font-bold uppercase tracking-widest">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayed.map(inq => <InquiryRow key={inq.id} inq={inq} drivers={drivers} onRefresh={load} />)}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Tips */}
      <div className={card + ' p-5'}>
        <h3 className="text-[#C9A028] text-[10px] font-bold uppercase tracking-widest mb-3 flex items-center gap-1">
          <TrendingUp className="h-3 w-3" />Business Tips
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          {[
            { icon: '⚡', title: 'Quote fast', desc: 'Clients who receive quotes within 30 min are 3× more likely to confirm.' },
            { icon: '🚗', title: 'Assign drivers', desc: 'Assign a driver to confirmed bookings so they can see all trip details.' },
            { icon: '📧', title: 'Email included', desc: 'Quotes and confirmations are sent to clients automatically.' },
          ].map(tip => (
            <div key={tip.title} className="bg-[#0E0E0E] border border-[#2A2A2A] rounded-xl p-3">
              <p className="text-lg mb-1">{tip.icon}</p>
              <p className="font-semibold text-[#F5F0E8]">{tip.title}</p>
              <p className="text-[#777] mt-0.5">{tip.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
