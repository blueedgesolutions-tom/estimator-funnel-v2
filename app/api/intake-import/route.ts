import { NextResponse } from 'next/server';
import { list } from '@vercel/blob';
import { getTenantId } from '@/lib/tenant';

// ─────────────────────────────────────────────────────────
// Returns the latest client intake submission for the
// current tenant, used by the admin "Import" button.
// ─────────────────────────────────────────────────────────

export async function GET() {
  const tenantId = await getTenantId();

  const { blobs } = await list({ prefix: `intake/${tenantId}/latest.json` });

  if (blobs.length === 0) {
    return NextResponse.json({ message: 'No intake submission found for this tenant.' }, { status: 404 });
  }

  try {
    const res = await fetch(blobs[0].url);
    const data = await res.json();
    return NextResponse.json({
      submittedAt: data.submittedAt,
      brandName: data.brandName,
      catalog: data.catalog,
    });
  } catch {
    return NextResponse.json({ message: 'Failed to fetch intake data.' }, { status: 500 });
  }
}
