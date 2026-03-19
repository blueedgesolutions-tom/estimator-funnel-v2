import { NextRequest, NextResponse } from 'next/server';
import { get } from '@vercel/edge-config';
import type { RawTenantConfig } from '@/lib/types';

// ─────────────────────────────────────────────────────────
// SAFE SERIALISER
// Ensures the header value is valid ASCII (HTTP spec).
// Non-ASCII characters are Unicode-escaped.
// ─────────────────────────────────────────────────────────

function safeSerialize(obj: unknown): string {
  return JSON.stringify(obj).replace(/[^\x00-\x7F]/g, (char) => {
    const code = char.codePointAt(0)!;
    return code > 0xffff
      ? `\\u${(code - 0x10000).toString(16).padStart(4, '0')}`
      : `\\u${code.toString(16).padStart(4, '0')}`;
  });
}

// ─────────────────────────────────────────────────────────
// EDGE MIDDLEWARE
//
// Next.js 16 renames middleware.ts → proxy.ts.
// The export must be named `proxy` (not `default`).
//
// Slug resolution order:
//   1. Subdomain of Host header
//   2. ?tenant= query param (local dev)
//   3. DEV_TENANT_SLUG env var (development fallback)
// ─────────────────────────────────────────────────────────

export async function proxy(request: NextRequest) {
  const url = new URL(request.url);
  const host = request.headers.get('host') ?? '';

  // 1. Try subdomain
  let slug = '';
  const parts = host.split('.');
  if (parts.length >= 3) {
    slug = parts[0];
  }

  // 2. Try ?tenant= query param
  const queryTenant = url.searchParams.get('tenant');
  if (queryTenant) {
    slug = queryTenant;
  }

  // 3. Dev fallback
  if (!slug) {
    slug = process.env.DEV_TENANT_SLUG ?? '';
  }

  const response = NextResponse.next();

  if (!slug) {
    return response;
  }

  try {
    let tenantConfig: RawTenantConfig | null = null;

    // Local dev: bypass Edge Config lookup with LOCAL_TENANT_CONFIG
    const localConfig = process.env.LOCAL_TENANT_CONFIG;
    if (localConfig) {
      tenantConfig = JSON.parse(localConfig) as RawTenantConfig;
    } else {
      tenantConfig = await get<RawTenantConfig>(slug) ?? null;
    }

    if (tenantConfig) {
      response.headers.set('x-tenant-config', safeSerialize(tenantConfig));
      response.headers.set('x-tenant-id', slug);
    }
  } catch (err) {
    console.error(`[proxy] Failed to load tenant config for slug "${slug}":`, err);
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
