import type { FunnelData, TenantCatalog, PoolModel, PricingContext } from './types';

// ─────────────────────────────────────────────────────────
// FORMULA EVALUATOR
// Safely evaluates a dynamic pricing formula string.
// Returns null if the formula throws or returns non-finite.
// ─────────────────────────────────────────────────────────

export function evaluatePricingFormula(
  formula: string,
  ctx: PricingContext
): number | null {
  try {
    const fn = new Function(
      'poolWidth',
      'poolLength',
      'deckingSqft',
      'hasSpa',
      'selectedOptions',
      'Math',
      formula
    );
    const result = fn(
      ctx.poolWidth,
      ctx.poolLength,
      ctx.deckingSqft,
      ctx.hasSpa,
      ctx.selectedOptions,
      Math
    );
    if (typeof result !== 'number' || !isFinite(result)) return null;
    return result;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────
// DECKING SQFT CALCULATOR
// Uses the frame formula: outer area − pool area
// with a minimum enforced at minimumDeckingWidth.
// ─────────────────────────────────────────────────────────

export function calculateDeckingSquareFootage(
  pool: PoolModel,
  widthAround: number,
  minimumDeckingWidth: number
): number {
  const effectiveWidth = Math.max(widthAround, minimumDeckingWidth);
  const outer =
    (pool.width + 2 * effectiveWidth) * (pool.length + 2 * effectiveWidth);
  const inner = pool.width * pool.length;
  return outer - inner;
}

// ─────────────────────────────────────────────────────────
// MAIN PRICE CALCULATOR
// Formula: basePrice + optionsPrice + deckingPrice
// ─────────────────────────────────────────────────────────

export function calculatePrice(
  funnelData: FunnelData,
  catalog: TenantCatalog
): number {
  const { poolModel, options = [], deckingType, paverSquareFootage } = funnelData;

  // 1. Pool base price
  const pool = catalog.poolModels.find((m) => m.id === poolModel);
  const basePrice = pool?.basePrice ?? 0;

  // 2. Active selections — spa/heater incompatibility
  const hasSpa = options.includes('spa');
  const activeOptions = hasSpa
    ? options.filter((id) => id !== 'gas-heater')
    : options;

  // 3. Equipment options price
  const deckingSqft = paverSquareFootage ?? 0;
  const ctx: PricingContext = {
    poolWidth: pool?.width ?? 0,
    poolLength: pool?.length ?? 0,
    deckingSqft,
    hasSpa,
    selectedOptions: activeOptions,
  };

  const optionsPrice = activeOptions.reduce((sum, optionId) => {
    const option = catalog.equipmentOptions.find((o) => o.id === optionId);
    if (!option) return sum;

    if (option.dynamicPricing && option.pricing_formula) {
      const dynamic = evaluatePricingFormula(option.pricing_formula, ctx);
      return sum + (dynamic ?? option.price);
    }

    return sum + option.price;
  }, 0);

  // 4. Decking price
  const deckingOption = catalog.deckingOptions.find((d) => d.id === deckingType);
  const deckingPrice =
    deckingOption && paverSquareFootage
      ? deckingOption.pricePerSqft * paverSquareFootage
      : 0;

  return Math.round(basePrice + optionsPrice + deckingPrice);
}

// ─────────────────────────────────────────────────────────
// DISPLAY RANGE
// Returns the ±10% range displayed on the results page.
// ─────────────────────────────────────────────────────────

export function priceRange(estimatedPrice: number): { low: number; high: number } {
  return {
    low: Math.round(estimatedPrice * 0.9),
    high: Math.round(estimatedPrice * 1.1),
  };
}

// ─────────────────────────────────────────────────────────
// FINANCING CALCULATOR
// Standard amortisation formula: PMT = P × r(1+r)^n / ((1+r)^n − 1)
// ─────────────────────────────────────────────────────────

export function monthlyPayment(
  principal: number,
  aprPercent: number,
  termYears: number
): number {
  const r = aprPercent / 100 / 12;
  const n = termYears * 12;
  if (r === 0) return Math.round(principal / n);
  const payment = (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  return Math.round(payment);
}

// ─────────────────────────────────────────────────────────
// CURRENCY FORMATTER
// ─────────────────────────────────────────────────────────

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
}
