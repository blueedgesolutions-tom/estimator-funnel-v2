import { put } from '@vercel/blob';
import { v4 as uuid } from 'uuid';
import type { FunnelData } from '@/lib/types';

// ─────────────────────────────────────────────────────────
// Submission log — writes each lead as an individual JSON file
// to Vercel Blob as a backup in case the CRM webhook fails.
//
// Path structure:
//   submissions/{tenantId}/{YYYY}/{MM}/{DD}/{uuid}.json
// ─────────────────────────────────────────────────────────

export async function logSubmission(tenantId: string, funnelData: FunnelData): Promise<void> {
  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm   = String(now.getUTCMonth() + 1).padStart(2, '0');
  const dd   = String(now.getUTCDate()).padStart(2, '0');

  const pathname = `submissions/${tenantId}/${yyyy}/${mm}/${dd}/${uuid()}.json`;

  const record = {
    tenantId,
    submittedAt: now.toISOString(),
    ...funnelData,
  };

  await put(pathname, JSON.stringify(record, null, 2), {
    access: 'public',
    contentType: 'application/json',
  });
}
