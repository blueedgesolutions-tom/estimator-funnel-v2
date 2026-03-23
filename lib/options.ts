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
    id: 'cocktail',
    name: 'Cocktail',
    width: 8,
    length: 16,
    basePrice: 42000,
    description: 'The perfect entry-level pool for small suburban yards. Currently a very popular option.',
    features: ['Best choice for small yards', 'Great budget-friendly option', 'Great for a relaxing summer evening dip']
  },
  {
    id: 'plunge',
    name: 'Plunge',
    width: 12,
    length: 24,
    basePrice: 48000,
    description: 'The compact and sensible option. Great middle ground for smaller yards while maintaining decent swimming space.',
    features: ['Perfect for small–medium lots', 'Surprisingly useable foot-print', 'Often considered our best \"bang-for-buck\"'],
  },
  {
    id: 'classic',
    name: 'Classic',
    width: 15,
    length: 30,
    basePrice: 62000,
    description: 'The most popular choice. Generous swimming space with a timeless form factor.',
    features: ['Ideal for most normal-sized backyards', 'Perfect size for all kinds of aquatic games', 'Dimensions allow for a very customizable layout'],
  },
  {
    id: 'resort',
    name: 'Resort',
    width: 18,
    length: 36,
    basePrice: 98000,
    description: 'A statement pool. Full-sized dimensions for the ultimate backyard experience.',
    features: ['Hotel-quality proportions', 'Space for all water features', 'Maximum design flexibility'],
  },
  {
    id: 'estate',
    name: 'Estate',
    width: 20,
    length: 40,
    basePrice: 125000,
    description: 'The pinnacle of residential swimming pools. A piece that defines the property.',
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
    description: 'Gentler on skin and eyes than traditional chlorine. Cheaper to run. Self-generating and easier to maintain.',
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
    incompatibleWith: ['spa'],
    incompatibilityNote: 'Heating is included with the Built-in Spa.',
  },
  {
    id: 'gas-heater',
    name: 'Gas Heater',
    description: 'Fast, powerful heating ideal for pools that need rapid temperature changes (e.g. vacation home).',
    category: 'Heating',
    price: 4200,
    incompatibleWith: ['spa'],
    incompatibilityNote: 'Heating is included with the Built-in Spa.',
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
    name: 'Built-in Spa',
    description: 'A seamlessly integrated spa/hot tub. Either level or raised. Will instantly level up any backyard pool project.',
    category: 'Features',
    price: 18000,
    incompatibleWith: ['gas-heater', 'heat-pump'],
    materials: ['concrete'],
  },
  {
    id: 'sun-shelf',
    name: 'Sun Shelf / Tanning Ledge',
    description: 'A shallow entry platform perfect for loungers, toddlers, and pets.',
    category: 'Features',
    price: 5500,
    materials: ['concrete'],
  },
  {
    id: 'sheer-water-feature',
    name: 'Sheer-Descent Water Feature',
    description: 'Raised backwall allowing installation of an elegant sheer-descent water feature. Another instant level up to any pool project.',
    category: 'Features',
    price: 6500,
  },
  {
    id: 'deck-jets',
    name: 'Deck Jets',
    description: 'Elegant water arcs that shoot from the deck into the pool. Very popular with kids and pets.',
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
  {
    id: 'screened-enclosure',
    name: 'Aluminum Screened Enclosure',
    description: 'Frames the yard nicely and protects against bugs and other creatures entiring pool perimeter.',
    category: 'Features',
    price: 25000,
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
    description: 'Clean, durable, and cost-effective. Easy to maintain and highly customisable. Can be sealed at addionnal cost.',
    pricePerSqft: 12,
  },
  {
    id: 'stamped-concrete',
    name: 'Stamped Concrete',
    description: 'The look of stone or tile at a fraction of the price. Textured and slip-resistant. Can be sealed at addionnal cost.',
    pricePerSqft: 18,
  },
  {
    id: 'travertine',
    name: 'Travertine Pavers',
    description: 'Premium natural stone that stays cool underfoot and looks timeless. Typically available in Ivory, Silver, and Noce colors.',
    pricePerSqft: 28,
  },
  {
    id: 'tumbled-pavers',
    name: 'Standard Pavers',
    description: 'Classic warmth and character. Individual pavers can be replaced if damaged.',
    pricePerSqft: 22,
  },
  {
    id: 'flagstone',
    name: 'Natural Flagstone',
    description: 'Organic, unique, and luxurious. No two flagstone decks look the same.',
    pricePerSqft: 35,
  },
  {
    id: 'bluestone',
    name: 'Bluestone Pavers',
    description: 'A classic premium decking material. Popular in higher-end builds.',
    pricePerSqft: 35,
  },
  {
    id: 'porcelain-tile',
    name: 'Porcelain Tiles',
    description: 'Our highest-end finish. Will level up any backyard to a new level of luxury. Many options available.',
    pricePerSqft: 40,
  }
];

// ─────────────────────────────────────────────────────────
// DECKING PRESET WIDTHS
// ─────────────────────────────────────────────────────────

export const DEFAULT_DECKING_PRESETS: DeckingPresetWidth[] = [
  { key: '4ft', label: 'Minimal | 4 ft around pool', width: 4 },
  { key: '6ft', label: 'Standard | 6 ft around pool', width: 6 },
  { key: '8ft', label: 'Generous | 8 ft around pool', width: 8 },
  { key: '10ft', label: 'Expansive | 10 ft around pool', width: 10 },
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
