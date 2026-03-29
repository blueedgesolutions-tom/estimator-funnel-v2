'use client';

import { useState, useMemo } from 'react';
import { useFunnel } from '../FunnelProvider';
import { resolveCopy } from '@/lib/copy';
import StepProgress from '../StepProgress';
import { formatCurrency } from '@/lib/pricing';
import type { TenantConfig } from '@/lib/types';

interface Props {
  tenant: TenantConfig;
}

const TOTAL_STEPS = 5;

export default function OptionsStep({ tenant }: Props) {
  const { funnelData, updateFunnelData, handleNext, handleBack } = useFunnel();
  const copy = resolveCopy(tenant);
  const { catalog } = tenant;

  const [selected, setSelected] = useState<string[]>(funnelData.options ?? []);

  const selectedMaterial = catalog.poolModels.find(
    (m) => m.id === funnelData.poolModel
  )?.material ?? 'concrete';

  const compatibleOptions = useMemo(
    () => catalog.equipmentOptions.filter(
      (o) => o.enabled !== false && (!o.materials || o.materials.includes(selectedMaterial))
    ),
    [catalog.equipmentOptions, selectedMaterial]
  );

  // Group options by category
  const grouped = useMemo(() => {
    const map = new Map<string, typeof catalog.equipmentOptions>();
    for (const opt of compatibleOptions) {
      const cat = opt.category ?? 'Other';
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(opt);
    }
    return map;
  }, [compatibleOptions]);

  function toggleOption(id: string) {
    const opt = catalog.equipmentOptions.find((o) => o.id === id);
    if (!opt) return;

    setSelected((prev) => {
      if (prev.includes(id)) {
        return prev.filter((i) => i !== id);
      }
      // Remove incompatible options
      const filtered = opt.incompatibleWith
        ? prev.filter((i) => !opt.incompatibleWith!.includes(i))
        : prev;
      return [...filtered, id];
    });
  }

  function handleContinue() {
    // Enforce spa/heater incompatibility on save
    const hasSpa = selected.includes('spa');
    const finalOptions = hasSpa
      ? selected.filter((id) => id !== 'gas-heater' && id !== 'heat-pump')
      : selected;

    updateFunnelData({ options: finalOptions });
    handleNext();
  }


  return (
    <main className="page-content">
      <div style={{ paddingTop: 'var(--space-xl)', width: '100%' }}>
        <StepProgress current={2} total={TOTAL_STEPS} />

        <div className="eyebrow">{copy.options.eyebrow}</div>
        <h2 className="headline-display" style={{ marginBottom: 'var(--space-sm)' }}>
          {copy.options.headline}
        </h2>
        <p className="subheadline" style={{ marginBottom: 'var(--space-md)' }}>
          {copy.options.subheadline}
        </p>

        {/* Options by category */}
        {Array.from(grouped.entries()).map(([category, options]) => (
          <div key={category} style={{ marginBottom: 'var(--space-xl)', width: '100%' }}>
            <div style={{
              fontSize: 'var(--text-xs)',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: 'var(--text-muted)',
              marginBottom: 'var(--space-sm)',
            }}>
              {category}
            </div>
            <div className="option-card-grid">
              {options.map((opt) => {
                const isSelected = selected.includes(opt.id);
                const isDisabledByIncompat = selected.some((selId) => {
                  const selOpt = catalog.equipmentOptions.find((o) => o.id === selId);
                  return selOpt?.incompatibleWith?.includes(opt.id);
                });

                return (
                  <button
                    key={opt.id}
                    className={`option-card${isSelected ? ' selected' : ''}${isDisabledByIncompat ? ' disabled' : ''}`}
                    onClick={() => !isDisabledByIncompat && toggleOption(opt.id)}
                    type="button"
                    style={isDisabledByIncompat ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                  >
                    <div className="option-card-name">{opt.name}</div>
                    {opt.description && (
                      <div className="option-card-desc">{opt.description}</div>
                    )}
                    {isDisabledByIncompat && opt.incompatibilityNote ? (
                      <div className="option-card-incompat-note">{opt.incompatibilityNote}</div>
                    ) : !tenant.config.hide_prices ? (
                      <div className="option-card-price">
                        {opt.dynamicPricing ? 'Price based on dimensions' : `+ ${formatCurrency(opt.price)}`}
                      </div>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {/* Navigation */}
        <div className="step-nav">
          <button className="btn-ghost" onClick={handleBack}>← Back</button>
          <button className="btn-primary" onClick={handleContinue}>
            Continue
          </button>
        </div>
      </div>
    </main>
  );
}

