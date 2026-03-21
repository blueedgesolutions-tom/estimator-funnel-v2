import { NextRequest, NextResponse } from 'next/server';
import { list, put, del } from '@vercel/blob';

// ─────────────────────────────────────────────────────────
// Weekly submission rollup cron
//
// Runs every Monday at 03:00 UTC (configured in vercel.json).
// Collects all individual JSON submission files from the
// previous week, merges them into a single CSV, uploads it,
// then deletes the individual files.
//
// Output path:
//   submissions/rollups/{tenantId}/{YYYY}-W{WW}.csv
// ─────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  // Vercel automatically sends CRON_SECRET as a bearer token.
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();

  // Collect files from the previous 7 days
  const cutoff = new Date(now);
  cutoff.setUTCDate(cutoff.getUTCDate() - 7);

  // ISO week label for the rollup filename (e.g. 2026-W12)
  const weekLabel = getISOWeekLabel(cutoff);

  // List all submission JSON files
  const { blobs } = await list({ prefix: 'submissions/', mode: 'folded' });

  // Filter to individual submission files (not rollups) from the past week
  const targets = blobs.filter((b) => {
    if (!b.pathname.endsWith('.json')) return false;
    if (b.pathname.includes('/rollups/')) return false;
    return new Date(b.uploadedAt) >= cutoff;
  });

  if (targets.length === 0) {
    return NextResponse.json({ message: 'No submissions to roll up', week: weekLabel });
  }

  // Fetch all individual records
  const records: Record<string, unknown>[] = [];
  await Promise.all(
    targets.map(async (blob) => {
      try {
        const res = await fetch(blob.url);
        const data = await res.json();
        records.push(data);
      } catch {
        console.error(`[rollup] Failed to fetch ${blob.pathname}`);
      }
    })
  );

  if (records.length === 0) {
    return NextResponse.json({ message: 'All fetches failed', week: weekLabel }, { status: 500 });
  }

  // Group by tenantId for separate per-tenant CSVs
  const byTenant = new Map<string, Record<string, unknown>[]>();
  for (const record of records) {
    const tenantId = String(record.tenantId ?? 'unknown');
    if (!byTenant.has(tenantId)) byTenant.set(tenantId, []);
    byTenant.get(tenantId)!.push(record);
  }

  const rollupPaths: string[] = [];

  for (const [tenantId, rows] of byTenant) {
    const csv = toCsv(rows);
    const pathname = `submissions/rollups/${tenantId}/${weekLabel}.csv`;
    await put(pathname, csv, { access: 'public', contentType: 'text/csv' });
    rollupPaths.push(pathname);
  }

  // Delete the individual files that were rolled up
  await Promise.all(targets.map((b) => del(b.url).catch(() => {})));

  return NextResponse.json({
    week: weekLabel,
    rolled: targets.length,
    rollups: rollupPaths,
  });
}

// ── Helpers ──────────────────────────────────────────────

function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return '';

  // Collect all unique keys across all rows
  const keys = Array.from(new Set(rows.flatMap((r) => Object.keys(r))));

  const escape = (v: unknown): string => {
    const s = v == null ? '' : String(v);
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };

  const header = keys.join(',');
  const body = rows
    .map((row) => keys.map((k) => escape(row[k])).join(','))
    .join('\n');

  return `${header}\n${body}`;
}

function getISOWeekLabel(date: Date): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}
