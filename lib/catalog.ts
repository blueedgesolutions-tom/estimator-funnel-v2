import type { RawTenantConfig, TenantCatalog } from './types';
import {
  DEFAULT_POOL_MODELS,
  DEFAULT_EQUIPMENT_OPTIONS,
  DEFAULT_DECKING_OPTIONS,
  DEFAULT_DECKING_PRESETS,
  DEFAULT_MINIMUM_DECKING_WIDTH,
} from './options';

// ─────────────────────────────────────────────────────────
// resolveCatalog
//
// Merges tenant-specific pricing/enabled overrides from the
// raw Edge Config data against the central option definitions
// in lib/options.ts. Filters out items with enabled: false.
// ─────────────────────────────────────────────────────────

export function resolveCatalog(
  raw: RawTenantConfig['catalog']
): TenantCatalog {
  // Pool models — disabled items are kept with enabled: false so the admin
  // can see and manage them; funnel steps filter them out at render time.
  const poolModels = DEFAULT_POOL_MODELS
    .map((def) => {
      const override = raw.poolModels.find((r) => r.id === def.id);
      return {
        ...def,
        ...(override ?? {}),
        enabled: override?.enabled === false ? false : undefined,
      };
    }) as TenantCatalog['poolModels'];

  // Equipment options
  const equipmentOptions = DEFAULT_EQUIPMENT_OPTIONS
    .map((def) => {
      const override = raw.equipmentOptions.find((r) => r.id === def.id);
      return {
        ...def,
        ...(override ? {
          price: override.price ?? def.price,
          dynamicPricing: override.dynamicPricing ?? def.dynamicPricing,
          pricing_formula: override.pricing_formula ?? def.pricing_formula,
        } : {}),
        enabled: override?.enabled === false ? false : undefined,
      };
    }) as TenantCatalog['equipmentOptions'];

  // Decking options
  const deckingOptions = DEFAULT_DECKING_OPTIONS
    .map((def) => {
      const override = raw.deckingOptions.find((r) => r.id === def.id);
      return {
        ...def,
        pricePerSqft: override?.pricePerSqft ?? def.pricePerSqft,
        enabled: override?.enabled === false ? false : undefined,
      };
    }) as TenantCatalog['deckingOptions'];

  return {
    poolModels: [...poolModels, ...(raw.customPoolModels ?? [])],
    equipmentOptions,
    deckingOptions,
    deckingPresetWidths: raw.deckingPresetWidths ?? DEFAULT_DECKING_PRESETS,
    minimumDeckingWidth: raw.minimumDeckingWidth ?? DEFAULT_MINIMUM_DECKING_WIDTH,
  };
}
