import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { getTenant, getTenantId } from '@/lib/tenant';

// ─────────────────────────────────────────────────────────
// Intake form submission
//
// 1. Saves catalog to blob as both latest.json and timestamped
// 2. Sends notification email to thomas@blueedgesolutions.co
// ─────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  let body: {
    poolModels: Array<{ id: string; basePrice: number }>;
    equipmentOptions: Array<{ id: string; price: number; enabled: boolean; dynamicPricing?: boolean }>;
    deckingOptions: Array<{ id: string; pricePerSqft: number }>;
    customPoolModels?: Array<Record<string, unknown>>;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: 'Invalid request body' }, { status: 400 });
  }

  const [tenant, tenantId] = await Promise.all([getTenant(), getTenantId()]);
  const { brand_name } = tenant.config;

  const record = {
    tenantId,
    brandName: brand_name,
    submittedAt: new Date().toISOString(),
    catalog: body,
  };

  const json = JSON.stringify(record, null, 2);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

  // Save both versioned and latest
  const [timestampedBlob] = await Promise.all([
    put(`intake/${tenantId}/${timestamp}.json`, json, {
      access: 'public',
      contentType: 'application/json',
    }),
    put(`intake/${tenantId}/latest.json`, json, {
      access: 'public',
      contentType: 'application/json',
      allowOverwrite: true,
    }),
  ]);

  // Send notification email
  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
    try {
      const { Resend } = await import('resend');
      const resend = new Resend(resendKey);

      await resend.emails.send({
        from: 'Blue Edge Solutions <noreply@blueedgesolutions.co>',
        to: ['thomas@blueedgesolutions.co'],
        subject: `New pricing intake — ${brand_name} (${tenantId})`,
        html: buildNotificationEmail(brand_name, tenantId, timestampedBlob.url),
      });
    } catch (err) {
      console.error('[intake-submit] Email error:', err);
      // Non-fatal
    }
  }

  return NextResponse.json({ success: true });
}

function buildNotificationEmail(brandName: string, tenantId: string, blobUrl: string): string {
  return `
    <div style="font-family:sans-serif;font-size:14px;color:#1a1a1a;max-width:560px">
      <h2 style="margin:0 0 16px;font-size:20px">New pricing intake received</h2>
      <table style="border-collapse:collapse;width:100%">
        <tr>
          <td style="padding:8px 0;color:#666;width:120px;vertical-align:top">Tenant</td>
          <td style="padding:8px 0;font-weight:600">${brandName}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#666;vertical-align:top">Tenant ID</td>
          <td style="padding:8px 0;font-family:monospace;font-size:13px">${tenantId}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#666;vertical-align:top">Blob</td>
          <td style="padding:8px 0">
            <a href="${blobUrl}" style="color:#1B6CA8">View intake JSON</a>
          </td>
        </tr>
      </table>
      <div style="margin-top:24px;padding:16px;background:#f8f7f5;border-radius:8px;font-size:13px;color:#5a5a5a">
        Import this into the admin panel at <strong>${tenantId}.poolquoterequest.com/admin</strong>
        using the &ldquo;Import client intake&rdquo; button in the Catalog Pricing section.
      </div>
    </div>
  `;
}
