import { NextRequest, NextResponse } from 'next/server';
import { getTenant, getTenantId } from '@/lib/tenant';
import type { SubmitLeadPayload, FunnelData, TenantCatalog } from '@/lib/types';
import { buildEstimateEmailHtml } from '@/lib/email';
import { logSubmission } from '@/lib/submission-log';

// ─────────────────────────────────────────────────────────
// Lead submission
//
// 1. Validates the payload
// 2. POSTs to the GoHighLevel webhook
// 3. Sends a confirmation email via Resend (optional)
// ─────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  let payload: SubmitLeadPayload;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ message: 'Invalid request body' }, { status: 400 });
  }

  const { funnelData } = payload;

  if (!funnelData.name || !funnelData.phone || !funnelData.email) {
    return NextResponse.json({ message: 'name, email and phone are required' }, { status: 400 });
  }

  // Get the tenant config server-side via the request headers
  const [tenant, tenantId] = await Promise.all([getTenant(), getTenantId()]);
  const { ghl_webhook_url, contact_email, brand_name, resend_from } =
    tenant.config;

  const errors: string[] = [];

  // ── 1. GoHighLevel CRM webhook ──
  if (ghl_webhook_url) {
    const ghlPayload = {
      first_name: funnelData.name.split(' ')[0],
      last_name:  funnelData.name.split(' ').slice(1).join(' '),
      full_name:  funnelData.name,
      phone:      funnelData.phone,
      email:      funnelData.email,
      address:    funnelData.address?.formatted_address ?? '',
      city:       funnelData.address?.locality ?? '',
      state:      funnelData.address?.administrative_area_level_1 ?? '',
      zip:        funnelData.address?.postal_code ?? '',
      pool_model: funnelData.poolModel ?? '',
      options:    (funnelData.options ?? []).join(', '),
      decking:    funnelData.deckingType ?? '',
      sqft:       String(funnelData.paverSquareFootage ?? ''),
      timeline:   funnelData.timeline ?? '',
      estimated_price: String(funnelData.estimatedPrice ?? ''),
      job_detail:      buildJobDetail(funnelData, tenant.catalog),
      is_out_of_area:  funnelData.isOutOfServiceArea ? 'yes' : 'no',
      session_id:       funnelData.sessionId ?? '',
      source:           brand_name,
      ...funnelData.contactFields,
    };

    try {
      const res = await fetch(ghl_webhook_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ghlPayload),
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) {
        errors.push(`GHL webhook responded with ${res.status}`);
      }
    } catch (err) {
      console.error('[submit-lead] GHL webhook error:', err);
      errors.push('GHL webhook failed');
    }

  }

  // ── 2. Confirmation email via Resend ──
  const resendKey = process.env.RESEND_API_KEY;
  const fromAddress = resend_from ?? `${brand_name} <${tenantId}@pooldesignrequest.com>`;

  if (resendKey && contact_email) {
    try {
      const { Resend } = await import('resend');
      const resend = new Resend(resendKey);

      // Internal lead notification to the company
      await resend.emails.send({
        from: fromAddress,
        to: [contact_email],
        subject: `New pool estimate lead — ${funnelData.name}`,
        html: buildLeadEmail(funnelData, brand_name),
      });

      // Customer-facing estimate summary
      if (funnelData.email) {
        await resend.emails.send({
          from: fromAddress,
          to: [funnelData.email],
          subject: `Your pool estimate from ${brand_name}`,
          html: buildEstimateEmailHtml({ funnelData, tenant }),
        });
      }
    } catch (err) {
      console.error('[submit-lead] Resend error:', err);
      // Non-fatal — don't fail the request over email
    }
  }

  // ── 3. Blob backup ──
  logSubmission(payload.tenantId, funnelData).catch((err) => {
    console.error('[submit-lead] Blob log error:', err);
  });

  // We consider the submission successful even if secondary services had issues.
  // The lead is stored in localStorage on the client regardless.
  if (errors.length > 0) {
    console.warn('[submit-lead] Non-fatal errors:', errors);
  }

  return NextResponse.json({ success: true });
}

function buildJobDetail(funnelData: FunnelData, catalog: TenantCatalog): string {
  const pool    = catalog.poolModels.find((m) => m.id === funnelData.poolModel);
  const optIds  = funnelData.options ?? [];
  const hasSpa  = optIds.includes('spa');
  const decking = catalog.deckingOptions.find((d) => d.id === funnelData.deckingType);
  const sqft    = funnelData.paverSquareFootage;

  const poolPart = pool
    ? `${Math.round(pool.width)}' x ${Math.round(pool.length)}' pool${hasSpa ? ' with a built-in spa' : ''}`
    : `pool${hasSpa ? ' with a built-in spa' : ''}`;

  const deckingPart = (decking && sqft)
    ? `${sqft}sqft of ${decking.name.toLowerCase()} decking`
    : null;

  const otherOptions = optIds
    .filter((id) => id !== 'spa')
    .map((id) => catalog.equipmentOptions.find((o) => o.id === id)?.name.toLowerCase())
    .filter(Boolean) as string[];

  const optionsPart = otherOptions.length > 0
    ? `the following ${otherOptions.length === 1 ? 'option' : 'options'}: ${otherOptions.join(', ')}`
    : null;

  const extras = [deckingPart, optionsPart].filter(Boolean) as string[];

  if (extras.length === 0) return `${poolPart}.`;
  if (extras.length === 1 && !hasSpa) return `${poolPart} with ${extras[0]}.`;
  if (extras.length === 1 &&  hasSpa) return `${poolPart} and ${extras[0]}.`;
  return `${poolPart}, ${extras[0]}, and ${extras[1]}.`;
}

function buildLeadEmail(data: SubmitLeadPayload['funnelData'], brandName: string): string {
  const price = data.estimatedPrice
    ? `$${Math.round(data.estimatedPrice * 0.9).toLocaleString()} – $${Math.round(data.estimatedPrice * 1.1).toLocaleString()}`
    : 'Not calculated';

  return `
    <h2 style="font-family:sans-serif;margin:0 0 16px">New lead from ${brandName} estimator</h2>
    <table style="font-family:sans-serif;font-size:14px;border-collapse:collapse;width:100%">
      <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;width:140px">Name</td><td style="padding:8px;border-bottom:1px solid #eee">${data.name}</td></tr>
      <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666">Email</td><td style="padding:8px;border-bottom:1px solid #eee">${data.email ?? ''}</td></tr>
      <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666">Phone</td><td style="padding:8px;border-bottom:1px solid #eee">${data.phone}</td></tr>
      <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666">Address</td><td style="padding:8px;border-bottom:1px solid #eee">${data.address?.formatted_address ?? '—'}</td></tr>
      <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666">Pool model</td><td style="padding:8px;border-bottom:1px solid #eee">${data.poolModel ?? '—'}</td></tr>
      <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666">Options</td><td style="padding:8px;border-bottom:1px solid #eee">${(data.options ?? []).join(', ') || 'None'}</td></tr>
      <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666">Timeline</td><td style="padding:8px;border-bottom:1px solid #eee">${data.timeline ?? '—'}</td></tr>
      <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666">Estimate</td><td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold">${price}</td></tr>
      <tr><td style="padding:8px;color:#666">Out of area</td><td style="padding:8px">${data.isOutOfServiceArea ? 'Yes' : 'No'}</td></tr>
    </table>
  `;
}
