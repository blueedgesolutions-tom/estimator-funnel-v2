import type {
  PoolModel,
  EquipmentOption,
  DeckingOption,
  DeckingPresetWidth,
} from './types';

// ─────────────────────────────────────────────────────────
// POOL MODELS
// Central definitions — prices are per-tenant overrideable.
// ─────────────────────────────────────────────────────────

export const DEFAULT_POOL_MODELS: PoolModel[] = [
  {
    id: 'plunge',
    name: 'Plunge',
    width: 12,
    length: 24,
    basePrice: 48000,
    description: 'Compact and elegant — ideal for smaller yards or a dedicated relaxation space.',
    features: ['Perfect for small–medium lots', 'Lower maintenance footprint', 'Great for entertaining'],
  },
  {
    id: 'classic',
    name: 'Classic',
    width: 14,
    length: 28,
    basePrice: 62000,
    description: 'The most popular choice — generous swimming space with a timeless shape.',
    features: ['Ideal for lap swimming', 'Fits most standard lots', 'Versatile design'],
  },
  {
    id: 'entertainer',
    name: 'Entertainer',
    width: 16,
    length: 32,
    basePrice: 79000,
    description: 'Built for gatherings — wide open water with room for everyone.',
    features: ['Perfect for families', 'Ample space for features', 'Great resale value'],
  },
  {
    id: 'resort',
    name: 'Resort',
    width: 18,
    length: 36,
    basePrice: 98000,
    description: 'A statement pool. Full resort-style dimensions for the ultimate backyard experience.',
    features: ['Hotel-quality proportions', 'Space for all water features', 'Maximum design flexibility'],
  },
  {
    id: 'estate',
    name: 'Estate',
    width: 20,
    length: 40,
    basePrice: 125000,
    description: 'The pinnacle of residential aquatics — a pool that defines the property.',
    features: ['Exceptional scale', 'Full customisation possible', 'Landmark backyard piece'],
  },
];

// ─────────────────────────────────────────────────────────
// EQUIPMENT OPTIONS
// ─────────────────────────────────────────────────────────

export const DEFAULT_EQUIPMENT_OPTIONS: EquipmentOption[] = [
  // Sanitization
  {
    id: 'saltwater',
    name: 'Saltwater System',
    description: 'Gentler on skin and eyes than traditional chlorine. Self-generating and easier to maintain.',
    category: 'Sanitization',
    price: 4500,
  },
  {
    id: 'uv-sanitizer',
    name: 'UV Sanitizer',
    description: 'A secondary sanitation layer that neutralises bacteria and reduces chemical use.',
    category: 'Sanitization',
    price: 2800,
  },

  // Heating
  {
    id: 'heat-pump',
    name: 'Heat Pump',
    description: 'Energy-efficient heating that extends your swim season by months.',
    category: 'Heating',
    price: 6500,
  },
  {
    id: 'gas-heater',
    name: 'Gas Heater',
    description: 'Fast, powerful heating ideal for pools that need rapid temperature changes.',
    category: 'Heating',
    price: 4200,
    incompatibleWith: ['spa'],  // spa includes its own heater
  },
  {
    id: 'solar-heating',
    name: 'Solar Heating',
    description: 'Harness the sun to heat your pool at near-zero operating cost.',
    category: 'Heating',
    price: 5800,
  },

  // Features
  {
    id: 'spa',
    name: 'Attached Spa',
    description: 'A seamlessly integrated spa/hot tub — the ultimate relaxation upgrade.',
    category: 'Features',
    price: 18000,
    incompatibleWith: ['gas-heater'],
  },
  {
    id: 'sun-shelf',
    name: 'Sun Shelf / Tanning Ledge',
    description: 'A shallow entry platform perfect for loungers, toddlers, and pets.',
    category: 'Features',
    price: 5500,
  },
  {
    id: 'waterfall',
    name: 'Waterfall Feature',
    description: 'A natural-look water cascade that adds ambience and soothing sound.',
    category: 'Features',
    price: 6500,
  },
  {
    id: 'deck-jets',
    name: 'Deck Jets',
    description: 'Elegant water arcs that shoot from the deck into the pool — a favourite with kids.',
    category: 'Features',
    price: 3200,
  },
  {
    id: 'led-lighting',
    name: 'LED Color Lighting',
    description: 'Multi-color LED lighting that transforms your pool at night.',
    category: 'Features',
    price: 3800,
  },

  // Automation
  {
    id: 'automation',
    name: 'Pool Automation System',
    description: 'Control everything — lights, pump, temperature, jets — from your phone.',
    category: 'Automation',
    price: 5200,
  },

  // Cover
  {
    id: 'auto-cover',
    name: 'Automatic Safety Cover',
    description: 'A motorised cover that protects, retains heat, and keeps the pool clean.',
    category: 'Safety',
    price: 9500,
  },
];

// ─────────────────────────────────────────────────────────
// DECKING OPTIONS
// ─────────────────────────────────────────────────────────

export const DEFAULT_DECKING_OPTIONS: DeckingOption[] = [
  {
    id: 'poured-concrete',
    name: 'Poured Concrete',
    description: 'Clean, durable, and cost-effective. Easy to maintain and highly customisable.',
    pricePerSqft: 12,
  },
  {
    id: 'stamped-concrete',
    name: 'Stamped Concrete',
    description: 'The look of stone or tile at a fraction of the price. Textured and slip-resistant.',
    pricePerSqft: 18,
  },
  {
    id: 'travertine',
    name: 'Travertine Pavers',
    description: 'Premium natural stone that stays cool underfoot and looks timeless.',
    pricePerSqft: 28,
  },
  {
    id: 'brick-pavers',
    name: 'Brick Pavers',
    description: 'Classic warmth and character. Individual pavers can be replaced if damaged.',
    pricePerSqft: 22,
  },
  {
    id: 'flagstone',
    name: 'Natural Flagstone',
    description: 'Organic, unique, and luxurious. No two flagstone decks look the same.',
    pricePerSqft: 35,
  },
];

// ─────────────────────────────────────────────────────────
// DECKING PRESET WIDTHS
// ─────────────────────────────────────────────────────────

export const DEFAULT_DECKING_PRESETS: DeckingPresetWidth[] = [
  { key: '4ft', label: 'Minimal — 4 ft around pool', width: 4 },
  { key: '6ft', label: 'Standard — 6 ft around pool', width: 6 },
  { key: '8ft', label: 'Generous — 8 ft around pool', width: 8 },
  { key: '10ft', label: 'Expansive — 10 ft around pool', width: 10 },
];

export const DEFAULT_MINIMUM_DECKING_WIDTH = 4;

// ─────────────────────────────────────────────────────────
// LOOKUP HELPERS
// ─────────────────────────────────────────────────────────

export function findPoolModel(id: string): PoolModel | undefined {
  return DEFAULT_POOL_MODELS.find((m) => m.id === id);
}

export function findEquipmentOption(id: string): EquipmentOption | undefined {
  return DEFAULT_EQUIPMENT_OPTIONS.find((o) => o.id === id);
}

export function findDeckingOption(id: string): DeckingOption | undefined {
  return DEFAULT_DECKING_OPTIONS.find((o) => o.id === id);
}

export function findDeckingPreset(key: string): DeckingPresetWidth | undefined {
  return DEFAULT_DECKING_PRESETS.find((p) => p.key === key);
}
