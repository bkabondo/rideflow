const FROM = 'RideFlow <noreply@rideflow.app>'

async function sendEmail(to: string, subject: string, html: string) {
  if (!process.env.RESEND_API_KEY) {
    console.log(`[Email skipped — no RESEND_API_KEY] To: ${to} | Subject: ${subject}`)
    return
  }
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: FROM, to, subject, html }),
  })
}

export async function sendQuoteEmail(opts: {
  to: string
  clientName: string
  pickup: string
  dropoff: string
  datetime: string
  vehicleType: string
  quotedAmount: number
  paymentMode: string
  quoteMessage: string
  inquiryId: string
  appUrl: string
}) {
  const paymentNote =
    opts.paymentMode === 'required'
      ? `<p style="color:#1d4ed8">Payment of <strong>$${opts.quotedAmount.toFixed(2)}</strong> will be required to confirm your booking.</p>`
      : opts.paymentMode === 'optional'
      ? `<p style="color:#059669">No upfront payment required — you can pay on the day or via invoice.</p>`
      : `<p style="color:#059669">No charge — cash or invoice on the day.</p>`

  const html = `
<div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#0f172a;color:#e2e8f0;border-radius:16px;overflow:hidden">
  <div style="background:linear-gradient(135deg,#1e3a5f,#0f172a);padding:32px;text-align:center">
    <h1 style="color:#fff;margin:0;font-size:28px">🚗 RideFlow</h1>
    <p style="color:#94a3b8;margin:8px 0 0">Premium Black Car Service</p>
  </div>
  <div style="padding:32px">
    <h2 style="color:#fff;margin:0 0 8px">Your Quote is Ready, ${opts.clientName}!</h2>
    <p style="color:#94a3b8">Your reservation inquiry has been reviewed and quoted.</p>
    <div style="background:#1e293b;border-radius:12px;padding:20px;margin:24px 0">
      <p style="margin:0 0 12px;color:#94a3b8;font-size:14px">TRIP DETAILS</p>
      <p style="margin:0 0 8px">📍 <strong>From:</strong> ${opts.pickup}</p>
      <p style="margin:0 0 8px">🏁 <strong>To:</strong> ${opts.dropoff}</p>
      <p style="margin:0 0 8px">📅 <strong>Date & Time:</strong> ${opts.datetime}</p>
      <p style="margin:0">🚗 <strong>Vehicle:</strong> ${opts.vehicleType}</p>
    </div>
    <div style="background:#1e293b;border-radius:12px;padding:20px;margin:0 0 24px">
      <p style="margin:0 0 12px;color:#94a3b8;font-size:14px">QUOTE</p>
      <p style="font-size:36px;font-weight:bold;color:#34d399;margin:0">$${opts.quotedAmount.toFixed(2)}</p>
      ${paymentNote}
      ${opts.quoteMessage ? `<p style="margin:16px 0 0;color:#cbd5e1;font-style:italic">"${opts.quoteMessage}"</p>` : ''}
    </div>
    <a href="${opts.appUrl}/inquiries/${opts.inquiryId}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:bold;font-size:16px">
      View & Confirm Your Quote →
    </a>
    <p style="color:#475569;font-size:12px;margin:24px 0 0">This quote is valid for 48 hours. If you have questions, reply to this email.</p>
  </div>
</div>`

  await sendEmail(opts.to, `Your RideFlow Quote: $${opts.quotedAmount.toFixed(2)}`, html)
}

export async function sendConfirmationEmail(opts: {
  to: string
  clientName: string
  pickup: string
  dropoff: string
  datetime: string
  vehicleType: string
  confirmedAmount: number
  paymentMode: string
  inquiryId: string
  appUrl: string
}) {
  const html = `
<div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#0f172a;color:#e2e8f0;border-radius:16px;overflow:hidden">
  <div style="background:linear-gradient(135deg,#064e3b,#0f172a);padding:32px;text-align:center">
    <h1 style="color:#fff;margin:0;font-size:28px">✅ Booking Confirmed</h1>
    <p style="color:#6ee7b7;margin:8px 0 0">RideFlow Premium Service</p>
  </div>
  <div style="padding:32px">
    <h2 style="color:#fff;margin:0 0 8px">You're all set, ${opts.clientName}!</h2>
    <p style="color:#94a3b8">Your ride is confirmed. We'll be there.</p>
    <div style="background:#1e293b;border-radius:12px;padding:20px;margin:24px 0">
      <p style="margin:0 0 8px">📍 <strong>From:</strong> ${opts.pickup}</p>
      <p style="margin:0 0 8px">🏁 <strong>To:</strong> ${opts.dropoff}</p>
      <p style="margin:0 0 8px">📅 <strong>Date & Time:</strong> ${opts.datetime}</p>
      <p style="margin:0 0 8px">🚗 <strong>Vehicle:</strong> ${opts.vehicleType}</p>
      <p style="margin:0;color:#34d399;font-size:20px;font-weight:bold">Total: $${opts.confirmedAmount.toFixed(2)}</p>
    </div>
    <a href="${opts.appUrl}/inquiries/${opts.inquiryId}" style="display:inline-block;background:#059669;color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:bold;font-size:16px">
      View Booking Details →
    </a>
  </div>
</div>`

  await sendEmail(opts.to, `Booking Confirmed — RideFlow`, html)
}

export async function sendOwnerNotificationEmail(opts: {
  to: string
  clientName: string
  clientEmail: string
  pickup: string
  dropoff: string
  datetime: string
  vehicleType: string
  passengers: number
  occasion: string
  specialRequests: string
  marketRefPrice: number | null
  inquiryId: string
  appUrl: string
}) {
  const html = `
<div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#0f172a;color:#e2e8f0;border-radius:16px;overflow:hidden">
  <div style="background:linear-gradient(135deg,#3730a3,#0f172a);padding:32px;text-align:center">
    <h1 style="color:#fff;margin:0;font-size:28px">🔔 New Inquiry</h1>
    <p style="color:#a5b4fc;margin:8px 0 0">RideFlow — Action Required</p>
  </div>
  <div style="padding:32px">
    <h2 style="color:#fff;margin:0 0 4px">New reservation request from ${opts.clientName}</h2>
    <p style="color:#94a3b8;margin:0 0 24px">${opts.clientEmail}</p>
    <div style="background:#1e293b;border-radius:12px;padding:20px;margin:0 0 24px">
      <p style="margin:0 0 8px">📍 <strong>From:</strong> ${opts.pickup}</p>
      <p style="margin:0 0 8px">🏁 <strong>To:</strong> ${opts.dropoff}</p>
      <p style="margin:0 0 8px">📅 <strong>Date & Time:</strong> ${opts.datetime}</p>
      <p style="margin:0 0 8px">🚗 <strong>Vehicle:</strong> ${opts.vehicleType}</p>
      <p style="margin:0 0 8px">👥 <strong>Passengers:</strong> ${opts.passengers}</p>
      <p style="margin:0 0 8px">🎉 <strong>Occasion:</strong> ${opts.occasion}</p>
      ${opts.specialRequests ? `<p style="margin:0;font-style:italic;color:#94a3b8">"${opts.specialRequests}"</p>` : ''}
    </div>
    ${opts.marketRefPrice ? `<p style="color:#94a3b8;font-size:14px">💡 Uber Black reference estimate: <strong style="color:#fbbf24">$${opts.marketRefPrice.toFixed(2)}</strong></p>` : ''}
    <a href="${opts.appUrl}/dashboard" style="display:inline-block;background:#7c3aed;color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:bold;font-size:16px">
      Review & Quote →
    </a>
  </div>
</div>`

  await sendEmail(opts.to, `New Inquiry: ${opts.pickup} → ${opts.dropoff} on ${opts.datetime}`, html)
}
