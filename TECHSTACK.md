# Tech Stack & Multi-Tenancy Reference

This document covers the infrastructure, libraries, and architectural patterns used in this project. It is intended for agents building new pages or tools in the same codebase so they can wire things up correctly without re-inventing what already exists.

---

## Core Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js (App Router) | 16.1.6 |
| Language | TypeScript | 5.x |
| Runtime | React | 19.2.3 |
| Hosting | Vercel | — |
| Styling | CSS custom properties (no Tailwind, no CSS-in-JS) | — |

**Next.js 16 note:** This version renamed `middleware.ts` to `proxy.ts`. The Edge Middleware export must be named `proxy` (not `default`) and the file lives at the project root as `proxy.ts`. The matcher config is exported as `config` from the same file, as normal.

---

## Multi-Tenancy

### How it works

Tenancy is resolved at the Vercel Edge, before any server component runs. The flow:

1. **`proxy.ts`** reads the `Host` header, extracts the subdomain, and looks up a slug-keyed JSON blob in **Vercel Edge Config** using `@vercel/edge-config`'s `get(slug)`.
2. If found, the full tenant config is serialised to a safe ASCII string (non-ASCII chars Unicode-escaped) and attached to the request as an `x-tenant-config` header. A second `x-tenant-id` header carries the slug.
3. Any server component or route handler calls `getTenant()` from `lib/tenant.ts`, which reads the header via Next.js's async `headers()` API and parses the JSON. If the header is absent, `getTenant()` returns `DEFAULT_TENANT`.

```
Request → proxy.ts → Edge Config get(slug) → sets x-tenant-config header → Next.js server component → getTenant() → TenantConfig
```

### Slug resolution order in `proxy.ts`

1. Subdomain of `Host` (e.g. `aquadreams.pooldesigntool.com` → `aquadreams`)
2. `?tenant=` query param (works on any host — primary local dev mechanism)
3. `DEV_TENANT_SLUG` environment variable (development only)

### Local dev override

Set `LOCAL_TENANT_CONFIG` in `.env.local` to a raw JSON string of a `RawTenantConfig` object. When present in development, `proxy.ts` skips the Edge Config lookup and injects it directly — useful for testing new config schemas without touching the live store.

Append `?tenant=aquadreams` to any localhost URL to load the real aquadreams config from Edge Config.

### Reading tenant data in server components

```ts
import { getTenant, getTenantId } from '@/lib/tenant';

// In any async server component or route handler:
const tenant = await getTenant();     // → TenantConfig
const tenantId = await getTenantId(); // → string slug (or 'default')
```

`headers()` is async in Next.js 15+. Always `await` it. Never call these functions in client components — they rely on server-only APIs.

### Passing tenant data to client components

Pass tenant fields as explicit props from the server component. Do not call `getTenant()` on the client. The root layout (`app/layout.tsx`) is the canonical example: it calls `getTenant()` server-side and passes `brandName`, `companyName`, `privacyPolicyUrl`, and `tenantId` as props to `FunnelProvider`.

---

## Vercel Edge Config

**Package:** `@vercel/edge-config` v1.4.3
**Env var:** `VERCEL_EDGE_CONFIG`

Edge Config is a globally distributed, read-only key/value store with very low read latency at the edge. Each tenant has its own key — the slug string (e.g. `"aquadreams"`) — and the value is a `RawTenantConfig` JSON object.

Usage:
```ts
import { get } from '@vercel/edge-config';
const tenantData = await get<RawTenantConfig>('aquadreams');
```

Edge Config reads must happen in Edge Runtime context (`proxy.ts`). Do not use it in Node.js route handlers — use the header that `proxy.ts` already set instead.

---

## TenantConfig Shape

The full type lives in `lib/types.ts`. Key sections:

```ts
interface TenantConfig {
  version: string;
  config: TenantConfigData;   // branding, contact info, integrations
  catalog: TenantCatalog;     // product options with resolved pricing
  estimate: TenantEstimateConfig;
  copy?: TenantCopy;          // optional per-tenant copy overrides
}
```

`TenantConfigData` fields relevant to most pages:

```ts
{
  brand_name: string;           // short brand label, used in <title>
  company_name: string;         // full legal/display name
  contact_phone: string;
  contact_email: string;
  logo_url: string;             // served via Vercel Blob or external CDN
  logo_height?: number;         // optional px override for logo height
  privacy_policy_url: string;
  ghl_webhook_url: string;      // GoHighLevel CRM webhook
  ghl_booking_webhook_url?: string;  // optional, only for booking flow
  gtag_id?: string;             // Google Tag Manager / GA4 ID
  fb_pixel_id?: string;         // Facebook Pixel ID
  area?: string;                // geographic service area descriptor
  theme: TenantTheme;           // { primary, primary_hover?, primary_light?, accent? }
}
```

The `catalog` and `estimate` fields are specific to the pool quoting funnel and not needed for general new pages.

### Raw vs. Resolved config

What lives in Edge Config is `RawTenantConfig`. The catalog section uses a compact boolean/price map format. `lib/catalog.ts`'s `resolveCatalog()` function merges this against the central option definitions to produce a `TenantCatalog` with full objects. `getTenant()` in `lib/tenant.ts` calls `resolveCatalog()` automatically, so consumers always receive resolved `TenantConfig`.

---

## Brand Token Injection (Zero FOUC)

Brand CSS tokens are set server-side in `app/layout.tsx` via an inline `<style>` tag in `<head>`, computed from `resolveTheme(tenant.config.theme)` in `lib/theme.ts`. This means the correct brand colours are in the first byte of HTML — no flash.

```ts
// app/layout.tsx
const theme = resolveTheme(tenant.config.theme);
const brandStyles = `
  :root {
    --brand-primary:       ${theme.primary};
    --brand-primary-hover: ${theme.primary_hover};
    --brand-primary-light: ${theme.primary_light};
    --brand-accent:        ${theme.accent};
  }
`;
// injected as <style dangerouslySetInnerHTML={{ __html: brandStyles }} />
```

`resolveTheme()` auto-derives `primary_hover`, `primary_light`, and `accent` from the primary hex if they are not explicitly set in the tenant config. See `BRANDING.md` for the derivation formulas.

For any new page added to this app, brand tokens are available automatically — no extra setup needed.

---

## Vercel Blob

**Package:** `@vercel/blob` v2.3.1
**Env var:** `BLOB_READ_WRITE_TOKEN`

Used to store uploaded/generated images/files. The Next.js image config whitelists the Blob hostname:

```ts
// next.config.ts
images: {
  remotePatterns: [{ protocol: 'https', hostname: '*.public.blob.vercel-storage.com' }],
}
```

This means `<Image>` from `next/image` works with Blob URLs directly. For `<img>` tags (e.g. inside complex layouts), use the URL as `src` normally.

---

## Client-Side State (React Context)

`components/FunnelProvider.tsx` is a `'use client'` React context provider that wraps the entire app from `app/layout.tsx`. It manages funnel-specific state and also handles PostHog initialisation and page view tracking.

For new pages that need cross-page state, you can either:
- Add fields to `FunnelProvider` if the state is genuinely shared across the funnel.
- Create a new separate context/provider for isolated features (preferred — keeps concerns separated).

**Persistence model:**
- `imageFile` — in-memory only, never persisted (a `File` object cannot be serialised).
- Everything else (selections, image URLs, session ID, contact info) — persisted to `localStorage` under the key `funnel_state` as a JSON blob.
- `hydrated` flag on the context is `false` until the `useEffect` mount completes — use this to avoid SSR/client mismatch when reading localStorage-backed state.

---

## Analytics

### PostHog

**Packages:** `posthog-js` v1.360.0 (client), `posthog-node` v5.28.0 (server)
**Env vars:** `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST`

`lib/posthog.ts` exports:
- `initPostHog(tenantId)` — initialises the client singleton; safe to call multiple times (no-ops after first call). Called on mount in `FunnelProvider`.
- `posthog` — the PostHog JS client instance; use `posthog.capture('event_name', { ...props })` anywhere in client components.
- `trackConversion(fbEvent, gtagEvent)` — fires `window.fbq` (Facebook Pixel) and `window.gtag` (Google Tag) if those globals exist. Both are injected by per-tenant scripts in `layout.tsx` and are optional.

Page views are automatically captured in `FunnelProvider` via a `PostHogPageView` component that fires on every `pathname` change.

All events are tagged with `tenant_id` via `posthog.register({ tenant_id })` on init.

### Google Tag / Facebook Pixel

Injected conditionally in `app/layout.tsx` `<head>` based on `gtag_id` and `fb_pixel_id` from `TenantConfigData`. No additional setup needed for new pages — they fire automatically once the scripts are on the page.

---

## Email — Resend

**Package:** `resend` v6.9.3
**Env var:** `RESEND_API_KEY`

Used for transactional emails (estimate delivery, booking confirmations). Only relevant to API routes that send email. The `from` address is per-tenant via `TenantConfigData.resend_from` (not in the base type but present in the Edge Config data for tenants that have it configured).

---

## CRM — GoHighLevel

Tenant configs carry `ghl_webhook_url` (lead capture) and optionally `ghl_booking_webhook_url` (booking). API routes `POST` a JSON payload to these URLs. The webhook URL being absent is handled gracefully — routes check for it and no-op rather than erroring.

---

## Redis

**Package:** `ioredis` v5.10.0
**Env var:** `REDIS_URL`

Used for async job state bridging. Not needed for synchronous pages or tools. If a new page has no async background processing, skip Redis entirely.

---

## Key Frontend Libraries

| Library | Version | Purpose |
|---------|---------|---------|
| `gsap` | 3.14.2 | Animation — accordion expand/collapse, reveal sequences |
| `lucide-react` | 0.577.0 | Icon set for UI chrome (nav, buttons, feature bullets) |
| `react-day-picker` | 9.14.0 | Calendar date picker on the booking screen |
| `date-fns` | 4.1.0 | Date utilities (companion to react-day-picker) |
| `uuid` | 13.0.0 | Session ID generation |
| `heic2any` | 0.0.4 | Client-side HEIC→JPEG conversion for iOS uploads |

**No UI component library.** Most of our components should be hand-rolled with CSS custom properties. Try not to introduce a component library (Radix, shadcn, etc.) for simply UI parts — favor writing the component directly using the established patterns in `globals.css`. Examples like our react-day-picker calendar date pickers are valid examples where handrolling wouldn't make sense. 

---

## Environment Variables Reference

```
# Required for all tenants
VERCEL_EDGE_CONFIG          Vercel Edge Config connection string

# Analytics
NEXT_PUBLIC_POSTHOG_KEY     PostHog project API key
NEXT_PUBLIC_POSTHOG_HOST    PostHog ingest host (proxied)

# Image storage
BLOB_READ_WRITE_TOKEN       Vercel Blob read/write token

# AI generation (funnel-specific — not needed for other pages)
KIE_AI_API_KEY              kie.ai Flux Kontext API key
KIE_CALLBACK_SECRET         Shared secret to validate kie.ai webhooks

# Email
RESEND_API_KEY              Resend transactional email API key

# Job state (funnel-specific)
REDIS_URL                   ioredis connection string (Vercel native Redis)

# Optional local dev
DEV_TENANT_SLUG             Slug to use when no subdomain/query param is set
LOCAL_TENANT_CONFIG         Raw JSON string to bypass Edge Config lookup
VERCEL_BYPASS_TOKEN         Vercel deployment protection bypass (for webhook callbacks)
```

`NEXT_PUBLIC_*` vars are available in client bundles. All others are server-only.

---

## Adding a New Page or Tool

Checklist for any new route added to this app:

1. **Tenant data:** Call `getTenant()` and `getTenantId()` server-side in your page component. Pass needed fields as props to any client components.
2. **Brand tokens:** Available automatically — no setup needed. Use `var(--brand-primary)` etc. in your CSS.
3. **Analytics:** `posthog.capture()` is available in any client component after `FunnelProvider` mounts (it wraps the whole app). Call `trackConversion()` for any conversion event that should also fire Facebook/Google pixels.
4. **Styling:** Add styles to `globals.css` following the existing token and class naming conventions. Do not create separate CSS files or use inline styles for anything beyond one-off layout overrides.
5. **Images from Blob:** Vercel Blob hostnames are whitelisted in `next.config.ts`. Use `<Image>` from `next/image` or a plain `<img>` tag.
6. **No new dependencies** unless strictly necessary. Check if the need can be met with GSAP, lucide-react, or plain CSS first.

---

## Local Development

```bash
# Preferred — avoids .bin symlink issues
node node_modules/next/dist/bin/next dev

# Standard
npm run dev
```

Append `?tenant=aquadreams` to any localhost URL to load tenant config from Edge Config:
```
http://localhost:3000/?tenant=aquadreams
```

Or set `LOCAL_TENANT_CONFIG` in `.env.local` to a raw JSON string for offline development.
