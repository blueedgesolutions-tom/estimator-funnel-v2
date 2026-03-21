import { headers } from 'next/headers';
import type { TenantConfig, RawTenantConfig } from './types';
import { resolveCatalog } from './catalog';
import {
  DEFAULT_POOL_MODELS,
  DEFAULT_EQUIPMENT_OPTIONS,
  DEFAULT_DECKING_OPTIONS,
  DEFAULT_DECKING_PRESETS,
  DEFAULT_MINIMUM_DECKING_WIDTH,
} from './options';

// ─────────────────────────────────────────────────────────
// DEFAULT TENANT
// Used when no tenant is resolved (local dev without config,
// or the default/fallback subdomain).
// ─────────────────────────────────────────────────────────

export const DEFAULT_TENANT: TenantConfig = {
  version: '1.0',
  config: {
    brand_name: 'Pool Design',
    company_name: 'Pool Design Co.',
    city: 'Your City',
    area: 'your area',
    contact_phone: '(555) 000-0000',
    contact_email: 'info@example.com',
    logo_url: '',
    privacy_policy_url: '/privacy',
    ghl_webhook_url: '',
    financing_url: 'https://example.com/apply',
    state_license: 'LIC-0000000',
    testimonials: [
      {
        quote: 'From the first consultation to the final walkthrough, the whole process was smooth and stress-free. The team was communicative, on schedule, and the finished pool exceeded every expectation we had.',
        author: 'Michael R.',
        location: 'Austin, TX',
        rating: 5,
      },
      {
        quote: 'We got quotes from four different builders. Not only were they the most competitive, the attention to detail in their work is obvious. Our backyard is completely transformed.',
        author: 'Sarah & Tom K.',
        location: 'Charlotte, NC',
        rating: 5,
      },
      {
        quote: 'Six weeks start to finish. I was told that was fast and I believe it. Quality work, clean site, and they actually showed up when they said they would. Highly recommend.',
        author: 'James L.',
        location: 'Tampa, FL',
        rating: 5,
      },
    ],
    theme: {
      primary: '#1B6CA8',
    },
  },
  catalog: {
    poolModels: DEFAULT_POOL_MODELS,
    equipmentOptions: DEFAULT_EQUIPMENT_OPTIONS,
    deckingOptions: DEFAULT_DECKING_OPTIONS,
    deckingPresetWidths: DEFAULT_DECKING_PRESETS,
    minimumDeckingWidth: DEFAULT_MINIMUM_DECKING_WIDTH,
  },
  estimate: {
    serviceArea: {
      enabled: false,
      lat: 0,
      lng: 0,
      radiusMiles: 50,
      warningMessage: "We may not serve your area, but we'll be in touch!",
      strictMode: false,
    },
    bookingEnabled: true,
    bookingSkipEnabled: true,
    consultationDaysAhead: 21,
    financingApr: 7.99,
    financingTermYears: 15,
  },
};

// ─────────────────────────────────────────────────────────
// SERVER-SIDE HELPERS
// Only call these in async Server Components or Route Handlers.
// Never call in client components.
// ─────────────────────────────────────────────────────────

export async function getTenant(): Promise<TenantConfig> {
  const headersList = await headers();
  const configHeader = headersList.get('x-tenant-config');

  if (!configHeader) return DEFAULT_TENANT;

  try {
    const raw: RawTenantConfig = JSON.parse(configHeader);
    return {
      version: raw.version,
      config: raw.config,
      catalog: resolveCatalog(raw.catalog),
      estimate: raw.estimate,
      copy: raw.copy,
    };
  } catch (err) {
    console.error('[getTenant] Failed to parse x-tenant-config header:', err);
    return DEFAULT_TENANT;
  }
}

export async function getTenantId(): Promise<string> {
  const headersList = await headers();
  return headersList.get('x-tenant-id') ?? 'default';
}
