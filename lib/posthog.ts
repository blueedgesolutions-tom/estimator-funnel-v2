'use client';

import posthogJs from 'posthog-js';

let initialised = false;

export function initPostHog(tenantId: string) {
  if (initialised) return;
  if (typeof window === 'undefined') return;

  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;

  if (!key) return;

  posthogJs.init(key, {
    api_host: host ?? 'https://app.posthog.com',
    capture_pageview: false,  // we fire manually via PostHogPageView
    persistence: 'localStorage+cookie',
  });

  posthogJs.register({ tenant_id: tenantId });
  initialised = true;
}

export const posthog = posthogJs;

// ─────────────────────────────────────────────────────────
// CONVERSION TRACKING
// Fires Facebook Pixel and Google Ads conversion events
// when the relevant global scripts are on the page.
// ─────────────────────────────────────────────────────────

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    gtag?: (...args: unknown[]) => void;
  }
}

export function trackConversion(
  fbEvent: string,
  gtagEvent: string,
  params?: Record<string, unknown>
) {
  if (typeof window === 'undefined') return;

  if (window.fbq) {
    window.fbq('track', fbEvent, params);
  }

  if (window.gtag) {
    window.gtag('event', gtagEvent, params);
  }
}
