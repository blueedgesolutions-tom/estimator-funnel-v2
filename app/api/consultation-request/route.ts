import { NextRequest, NextResponse } from 'next/server';
import { getTenant, getTenantId } from '@/lib/tenant';
import { formatCurrency } from '@/lib/pricing';
import type { ConsultationRequestPayload } from '@/lib/types';

// ─────────────────────────────────────────────────────────
// Post-estimate consultation booking
// Called from the Results page CTA (not the funnel booking step).
// POSTs to GHL booking webhook + sends an internal notification.
// ─────────────────────────────────────────────────────────

const TIME_LABELS: Record<string, string> = {
  morning:   'Morning (9am–12pm)',
  afternoon: 'Afternoon (1pm–5pm)',
};

export async function POST(req: NextRequest) {
  let payload: ConsultationRequestPayload;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ message: 'Invalid request body' }, { status: 400 });
  }

  const { name, phone, date, timeSlot, estimatedPrice } = payload;
  if (!name || !phone || !date || !timeSlot) {
    return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
  }

  const [tenant, tenantId] = await Promise.all([getTenant(), getTenantId()]);
  const { ghl_booking_webhook_url, contact_email, brand_name, resend_from } =
    tenant.config;

  if (ghl_booking_webhook_url) {
    const body = {
      full_name:    name,
      phone,
      booking_date: date,
      booking_time: timeSlot,
      estimated_price: String(estimatedPrice),
      source:       `${brand_name} Results Page`,
      note:         `Post-estimate consultation request for ${date} ${TIME_LABELS[timeSlot]}`,
    };

    try {
      await fetch(ghl_booking_webhook_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(8000),
      });
    } catch (err) {
      console.error('[consultation-request] Webhook error:', err);
      // Intentionally non-fatal
    }
  }

  // Internal notification email
  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey && contact_email) {
    try {
      const { Resend } = await import('resend');
      const resend = new Resend(resendKey);
      const fromAddress = resend_from ?? `${brand_name} <${tenantId}@pooldesignrequest.com>`;

      await resend.emails.send({
        from: fromAddress,
        to: [contact_email],
        subject: `Consultation request — ${name} · ${date}`,
        html: `
          <h2 style="font-family:sans-serif;margin:0 0 16px">New consultation request</h2>
          <table style="font-family:sans-serif;font-size:14px;border-collapse:collapse">
            <tr><td style="padding:8px;color:#666;width:140px">Name</td><td style="padding:8px">${name}</td></tr>
            <tr><td style="padding:8px;color:#666">Phone</td><td style="padding:8px">${phone}</td></tr>
            <tr><td style="padding:8px;color:#666">Date</td><td style="padding:8px">${date}</td></tr>
            <tr><td style="padding:8px;color:#666">Time</td><td style="padding:8px">${TIME_LABELS[timeSlot]}</td></tr>
            <tr><td style="padding:8px;color:#666">Estimate</td><td style="padding:8px;font-weight:bold">${formatCurrency(estimatedPrice)}</td></tr>
          </table>
        `,
      });
    } catch (err) {
      console.error('[consultation-request] Resend error:', err);
    }
  }

  return NextResponse.json({ success: true });
}
