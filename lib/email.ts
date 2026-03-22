import type { FunnelData, TenantConfig, PricingContext } from './types';
import { evaluatePricingFormula, priceRange, formatCurrency } from './pricing';

export function buildEstimateEmailHtml(params: {
  funnelData: FunnelData;
  tenant: TenantConfig;
}): string {
  const { funnelData, tenant } = params;
  const { config, catalog } = tenant;

  const primary = config.theme.primary;
  const emailLogoHeight = Math.round((config.logo_height ?? 36) * 0.75);

  const name = funnelData.name ?? 'there';
  const estimatedPrice = funnelData.estimatedPrice ?? 0;
  const { low, high } = priceRange(estimatedPrice);

  // Resolve selections from catalog
  const pool = catalog.poolModels.find((m) => m.id === funnelData.poolModel);
  const decking = catalog.deckingOptions.find((d) => d.id === funnelData.deckingType);
  const selectedOptionIds = funnelData.options ?? [];

  const hasSpa = selectedOptionIds.includes('spa');
  const activeOptionIds = hasSpa
    ? selectedOptionIds.filter((id) => id !== 'gas-heater')
    : selectedOptionIds;

  const pricingCtx: PricingContext = {
    poolWidth:       pool?.width  ?? 0,
    poolLength:      pool?.length ?? 0,
    deckingSqft:     funnelData.paverSquareFootage ?? 0,
    hasSpa,
    selectedOptions: activeOptionIds,
  };

  const selectedOptions = activeOptionIds
    .map((id) => catalog.equipmentOptions.find((o) => o.id === id))
    .filter((o): o is NonNullable<typeof o> => o !== undefined);

  const resolveOptionPrice = (opt: typeof selectedOptions[0]): number | null => {
    if (opt.dynamicPricing && opt.pricing_formula) {
      return evaluatePricingFormula(opt.pricing_formula, pricingCtx) ?? opt.price;
    }
    return opt.price ?? null;
  };

  const deckingTotal =
    decking && funnelData.paverSquareFootage
      ? decking.pricePerSqft * funnelData.paverSquareFootage
      : 0;

  // ─── Selections rows ───────────────────────────────────────
  const selectionRows = [
    pool
      ? row('Pool Model', `${pool.name} (${pool.width}′ × ${pool.length}′)`)
      : '',
    selectedOptions.length > 0
      ? row('Options', selectedOptions.map((o) => o.name).join(', '))
      : '',
    decking && funnelData.paverSquareFootage
      ? row('Decking', `${decking.name} — ${funnelData.paverSquareFootage.toLocaleString()} sq ft`)
      : '',
    funnelData.timeline
      ? row('Timeline', funnelData.timeline)
      : '',
  ].filter(Boolean).join('');

  // ─── Estimate breakdown rows ───────────────────────────────
  const breakdownRows = [
    pool
      ? lineItem(`${pool.name} Pool`, formatCurrency(pool.basePrice))
      : '',
    ...selectedOptions.map((opt) => {
      const price = resolveOptionPrice(opt);
      return lineItem(opt.name, price !== null ? formatCurrency(price) : 'Included');
    }),
    decking && deckingTotal > 0
      ? lineItem(
          `${decking.name} Decking (${funnelData.paverSquareFootage?.toLocaleString()} sq ft)`,
          formatCurrency(deckingTotal)
        )
      : '',
  ].filter(Boolean).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Your Pool Estimate</title>
</head>
<body style="margin:0;padding:0;background:#F8F7F5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:32px 16px;">

    <!-- Header -->
    ${config.logo_url ? `
    <div style="background:#fff;border-radius:12px 12px 0 0;padding:28px 32px;text-align:center;border:1px solid #E5E3DF;border-bottom:none;">
      <img src="${config.logo_url}" alt="${config.brand_name}" style="height:${emailLogoHeight}px;object-fit:contain;">
    </div>
    <div style="background:${primary};border-radius:0 0 12px 12px;padding:20px 32px;margin-bottom:24px;text-align:center;">
      <p style="color:rgba(255,255,255,0.85);font-size:14px;margin:0;">Your Preliminary Pool Estimate</p>
    </div>
    ` : `
    <div style="background:${primary};border-radius:12px;padding:32px;margin-bottom:24px;text-align:center;">
      <h1 style="font-family:Georgia,serif;font-size:28px;font-weight:400;color:#fff;margin:0 0 8px;">${config.brand_name}</h1>
      <p style="color:rgba(255,255,255,0.85);font-size:14px;margin:0;">Your Preliminary Pool Estimate</p>
    </div>
    `}

    <!-- Greeting -->
    <div style="background:#fff;border-radius:12px;padding:32px;margin-bottom:16px;border:1px solid #E5E3DF;">
      <p style="font-size:16px;color:#1A1A1A;margin:0 0 8px;">Hi ${name},</p>
      <p style="font-size:15px;color:#5A5A5A;line-height:1.6;margin:0;">Thanks for using our pool estimator. Based on your selections, here is your personalized preliminary estimate.</p>
    </div>

    <!-- Selections Summary -->
    <div style="background:#fff;border-radius:12px;padding:32px;margin-bottom:16px;border:1px solid #E5E3DF;">
      <h2 style="font-family:Georgia,serif;font-size:20px;font-weight:400;color:#1A1A1A;margin:0 0 20px;">Your Selections</h2>
      <table style="width:100%;border-collapse:collapse;">
        ${selectionRows}
      </table>
    </div>

    <!-- Estimate Breakdown -->
    <div style="background:#fff;border-radius:12px;padding:32px;margin-bottom:16px;border:1px solid #E5E3DF;">
      <h2 style="font-family:Georgia,serif;font-size:20px;font-weight:400;color:#1A1A1A;margin:0 0 20px;">Estimate Breakdown</h2>
      <table style="width:100%;border-collapse:collapse;">
        ${breakdownRows}
        <tr style="border-top:2px solid #E5E3DF;">
          <td style="padding:12px 0;font-size:15px;font-weight:600;color:#1A1A1A;">Subtotal</td>
          <td style="padding:12px 0;font-size:15px;font-weight:600;color:#1A1A1A;text-align:right;">${formatCurrency(estimatedPrice)}</td>
        </tr>
      </table>

      <!-- Range callout -->
      <div style="background:#F8F7F5;border-radius:8px;padding:20px;margin-top:20px;text-align:center;">
        <p style="font-size:12px;color:#9A9A9A;text-transform:uppercase;letter-spacing:0.08em;font-weight:600;margin:0 0 8px;">Estimated Project Range</p>
        <p style="font-family:Georgia,serif;font-size:32px;font-weight:400;color:${primary};margin:0;">${formatCurrency(low)} – ${formatCurrency(high)}</p>
        <p style="font-size:12px;color:#9A9A9A;margin:8px 0 0;">±10% estimated range based on final design and site conditions</p>
      </div>
    </div>

    <!-- CTA -->
    <div style="text-align:center;margin-bottom:24px;">
      <p style="font-size:14px;color:#5A5A5A;margin:0;">Our team will be in touch shortly to answer any questions and confirm your consultation if you've scheduled one.</p>
    </div>

    <!-- Footer -->
    <div style="text-align:center;padding-top:16px;border-top:1px solid #E5E3DF;">
      <p style="font-size:12px;color:#9A9A9A;margin:0 0 4px;">${config.company_name}</p>
      ${config.contact_phone ? `<p style="font-size:12px;color:#9A9A9A;margin:0 0 4px;">${config.contact_phone}</p>` : ''}
      ${config.contact_email ? `<p style="font-size:12px;color:#9A9A9A;margin:0 0 4px;"><a href="mailto:${config.contact_email}" style="color:#9A9A9A;">${config.contact_email}</a></p>` : ''}
      <p style="font-size:11px;color:#C0BEBC;margin:12px 0 0;">This is a preliminary estimate based on your selections. Final pricing is subject to on-site assessment and design specifications.</p>
    </div>

  </div>
</body>
</html>`;
}

// ─── Helpers ────────────────────────────────────────────────

function row(label: string, value: string): string {
  return `
  <tr style="border-bottom:1px solid #F2F1EF;">
    <td style="padding:10px 0;font-size:14px;color:#5A5A5A;">${label}</td>
    <td style="padding:10px 0;font-size:14px;color:#1A1A1A;font-weight:500;text-align:right;">${value}</td>
  </tr>`;
}

function lineItem(label: string, amount: string): string {
  return `
  <tr style="border-bottom:1px solid #F2F1EF;">
    <td style="padding:10px 0;font-size:14px;color:#5A5A5A;">${label}</td>
    <td style="padding:10px 0;font-size:14px;color:#1A1A1A;text-align:right;">${amount}</td>
  </tr>`;
}
