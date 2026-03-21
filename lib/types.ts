// ─────────────────────────────────────────────────────────
// THEME
// ─────────────────────────────────────────────────────────

export interface TenantTheme {
  primary: string;
  primary_hover?: string;
  primary_light?: string;
  accent?: string;
}

export interface ResolvedTheme {
  primary: string;
  primary_hover: string;
  primary_light: string;
  accent: string;
}

// ─────────────────────────────────────────────────────────
// CATALOG
// ─────────────────────────────────────────────────────────

export interface PoolModel {
  id: string;
  name: string;
  width: number;   // feet
  length: number;  // feet
  basePrice: number;
  image?: string;
  description?: string;
  features?: string[];
  enabled?: boolean;
}

export interface EquipmentOption {
  id: string;
  name: string;
  description?: string;
  image?: string;
  price: number;
  dynamicPricing?: boolean;
  pricing_formula?: string;
  category?: string;
  incompatibleWith?: string[];  // option IDs that cannot be selected together
  enabled?: boolean;
}

export interface DeckingOption {
  id: string;
  name: string;
  description?: string;
  pricePerSqft: number;
  enabled?: boolean;
}

export interface DeckingPresetWidth {
  key: string;
  label: string;
  width: number;  // feet on each side
}

export interface TenantCatalog {
  poolModels: PoolModel[];
  equipmentOptions: EquipmentOption[];
  deckingOptions: DeckingOption[];
  deckingPresetWidths: DeckingPresetWidth[];
  minimumDeckingWidth: number;
}

// ─────────────────────────────────────────────────────────
// CONTENT
// ─────────────────────────────────────────────────────────

export interface FaqItem {
  question: string;
  answer: string;
}

export interface Testimonial {
  quote: string;
  author: string;
  location?: string;
  rating: number;  // 1–5
  project?: string;
}

export interface ContactFieldDef {
  id: string;
  label: string;
  type: 'text' | 'email' | 'tel' | 'checkbox' | 'select';
  placeholder?: string;
  required?: boolean;
  validation_pattern?: string;
  validation_message?: string;
  options?: string[];  // for select type
}

// ─────────────────────────────────────────────────────────
// SERVICE AREA
// ─────────────────────────────────────────────────────────

export interface ServiceAreaConfig {
  enabled: boolean;
  lat: number;
  lng: number;
  radiusMiles: number;
  warningMessage: string;
  strictMode: boolean;
  blockedZips?: string[];
  blockedStates?: string[];
  blockedCounties?: string[];
}

// ─────────────────────────────────────────────────────────
// ESTIMATE CONFIG
// ─────────────────────────────────────────────────────────

export interface TenantEstimateConfig {
  serviceArea: ServiceAreaConfig;
  bookingEnabled: boolean;
  bookingSkipEnabled?: boolean;
  consultationDaysAhead?: number;  // weekdays to show in consultation picker (default 21)
  financingApr?: number;           // default 8.99
  financingTermYears?: number;     // default 10
}

// ─────────────────────────────────────────────────────────
// TENANT CONFIG DATA
// ─────────────────────────────────────────────────────────

export interface TenantConfigData {
  brand_name: string;
  company_name: string;
  city: string;               // Used in copy tokens: {{city}}
  contact_phone: string;
  contact_email: string;
  logo_url: string;
  logo_height?: number;       // px — overrides default 36px
  privacy_policy_url: string;
  ghl_webhook_url: string;
  ghl_booking_webhook_url?: string;
  gtag_id?: string;
  fb_pixel_id?: string;
  area?: string;              // Broader region descriptor: "Central Texas"
  resend_from?: string;       // "AquaDreams <hello@aquadreams.com>"
  financing_url?: string;     // Pre-approval / financing partner referral link
  state_license?: string;     // State contractor license number (required for display in some states)
  theme: TenantTheme;
  testimonials?: Testimonial[];
  faqs?: FaqItem[];
  contactFields?: ContactFieldDef[];
}

// ─────────────────────────────────────────────────────────
// COPY OVERRIDES
// ─────────────────────────────────────────────────────────

// Flat string map. Keys mirror the DEFAULT_COPY_TEMPLATES keys in lib/copy.ts.
// Non-empty values override the default template before interpolation.
export type TenantCopy = Record<string, string>;

// ─────────────────────────────────────────────────────────
// FULL TENANT CONFIG
// ─────────────────────────────────────────────────────────

export interface TenantConfig {
  version: string;
  config: TenantConfigData;
  catalog: TenantCatalog;
  estimate: TenantEstimateConfig;
  copy?: TenantCopy;
}

// Raw format stored in Vercel Edge Config.
// Catalog items can omit fields that have defaults in lib/options.ts.
// Setting enabled: false removes an option for this tenant.
export interface RawCatalogPoolModel {
  id: string;
  name?: string;
  width?: number;
  length?: number;
  basePrice?: number;
  image?: string;
  description?: string;
  features?: string[];
  enabled?: boolean;
}

export interface RawCatalogEquipmentOption {
  id: string;
  price?: number;
  dynamicPricing?: boolean;
  pricing_formula?: string;
  enabled?: boolean;
}

export interface RawCatalogDeckingOption {
  id: string;
  pricePerSqft?: number;
  enabled?: boolean;
}

export interface RawTenantConfig {
  version: string;
  config: TenantConfigData;
  catalog: {
    poolModels: RawCatalogPoolModel[];
    equipmentOptions: RawCatalogEquipmentOption[];
    deckingOptions: RawCatalogDeckingOption[];
    deckingPresetWidths?: DeckingPresetWidth[];
    minimumDeckingWidth?: number;
  };
  estimate: TenantEstimateConfig;
  copy?: TenantCopy;
}

// ─────────────────────────────────────────────────────────
// FUNNEL DATA
// ─────────────────────────────────────────────────────────

export interface AddressData {
  formatted_address: string;
  place_id: string;
  lat: number;
  lng: number;
  street_number?: string;
  route?: string;
  locality?: string;                     // City
  administrative_area_level_1?: string;  // State (short)
  postal_code?: string;
  country?: string;
  county?: string;
}

export interface FunnelData {
  // Pool configuration
  poolModel?: string;
  options?: string[];
  deckingType?: string;
  paverSquareFootage?: number;
  paverSquareFootageOption?: string;  // preset key or 'custom'

  // Timeline
  timeline?: string;

  // Address
  address?: AddressData;
  isOutOfServiceArea?: boolean;

  // Contact
  name?: string;
  email?: string;
  phone?: string;
  contactFields?: Record<string, string | boolean>;

  // Computed
  estimatedPrice?: number;
  sessionId?: string;

  // Image (in-memory only — not serialised to localStorage)
  imageFile?: File;
  imageUrl?: string;

  // Booking
  bookingDate?: string;            // YYYY-MM-DD
  bookingTimeSlot?: 'morning' | 'afternoon';
  bookingCompleted?: boolean;

  // Submission tracking
  submitted?: boolean;
  submittedAt?: string;
}

// ─────────────────────────────────────────────────────────
// PRICING CONTEXT
// ─────────────────────────────────────────────────────────

export interface PricingContext {
  poolWidth: number;
  poolLength: number;
  deckingSqft: number;
  hasSpa: boolean;
  selectedOptions: string[];
}

// ─────────────────────────────────────────────────────────
// API PAYLOADS
// ─────────────────────────────────────────────────────────

export interface SubmitLeadPayload {
  funnelData: FunnelData;
  tenantId: string;
}

export interface ConsultationRequestPayload {
  name: string;
  phone: string;
  date: string;
  timeSlot: 'morning' | 'afternoon';
  estimatedPrice: number;
  tenantId: string;
}
