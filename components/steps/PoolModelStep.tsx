'use client';

import { useState } from 'react';
import { useFunnel } from '../FunnelProvider';
import { resolveCopy } from '@/lib/copy';
import StepProgress from '../StepProgress';
import { calculateDeckingSquareFootage } from '@/lib/pricing';
import { formatCurrency } from '@/lib/pricing';
import type { TenantConfig } from '@/lib/types';

interface Props {
  tenant: TenantConfig;
}

const TOTAL_STEPS = 5;

export default function PoolModelStep({ tenant }: Props) {
  const { funnelData, updateFunnelData, handleNext, handleBack } = useFunnel();
  const copy = resolveCopy(tenant);
  const { catalog } = tenant;

  const [selectedModel, setSelectedModel] = useState(funnelData.poolModel ?? '');
  const [selectedDecking, setSelectedDecking] = useState(funnelData.deckingType ?? '');
  const [presetKey, setPresetKey] = useState(funnelData.paverSquareFootageOption ?? '');
  const [customSqft, setCustomSqft] = useState(
    funnelData.paverSquareFootageOption === 'custom'
      ? String(funnelData.paverSquareFootage ?? '')
      : ''
  );

  const pool = catalog.poolModels.find((m) => m.id === selectedModel);

  function getSqft(): number | null {
    if (!pool || !selectedDecking) return null;
    if (presetKey === 'custom') {
      const n = parseInt(customSqft, 10);
      return isNaN(n) ? null : n;
    }
    const preset = catalog.deckingPresetWidths.find((p) => p.key === presetKey);
    if (!preset) return null;
    return calculateDeckingSquareFootage(pool, preset.width, catalog.minimumDeckingWidth);
  }

  const sqft = getSqft();

  function canContinue() {
    if (!selectedModel) return false;
    if (selectedDecking && presetKey) {
      if (presetKey === 'custom' && !sqft) return false;
    }
    return true;
  }

  function handleContinue() {
    updateFunnelData({
      poolModel: selectedModel,
      deckingType: selectedDecking || undefined,
      paverSquareFootageOption: presetKey || undefined,
      paverSquareFootage: sqft ?? undefined,
    });
    handleNext();
  }

  return (
    <main className="page-content">
      <div style={{ paddingTop: 'var(--space-xl)', width: '100%' }}>
        {/* Progress */}
        <StepProgress current={1} total={TOTAL_STEPS} />

        <div className="eyebrow">{copy.poolModel.eyebrow}</div>
        <h2 className="headline-display" style={{ marginBottom: 'var(--space-sm)' }}>
          {copy.poolModel.headline}
        </h2>
        <p className="subheadline" style={{ marginBottom: 'var(--space-xl)' }}>
          {copy.poolModel.subheadline}
        </p>

        {/* Pool model cards */}
        <div className="option-card-grid" style={{ marginBottom: 'var(--space-2xl)' }}>
          {catalog.poolModels.map((model) => (
            <button
              key={model.id}
              className={`option-card${selectedModel === model.id ? ' selected' : ''}`}
              onClick={() => setSelectedModel(model.id)}
              type="button"
            >
              <div className="option-card-name">{model.name}</div>
              <div className="option-card-dims">
                {model.width}′ × {model.length}′
              </div>
              {model.description && (
                <div className="option-card-desc">{model.description}</div>
              )}
              <div className="option-card-price">
                {formatCurrency(model.basePrice)}
              </div>
            </button>
          ))}
        </div>

        {/* Decking section */}
        {selectedModel && (
          <div style={{ width: '100%', marginBottom: 'var(--space-xl)' }}>
            <div style={{ marginBottom: 'var(--space-sm)' }}>
              <div style={{ fontSize: 'var(--text-base)', fontWeight: 500, color: 'var(--text-primary)', marginBottom: 'var(--space-xs)' }}>
                {copy.poolModel.deckingLabel}
              </div>
              <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', fontWeight: 300 }}>
                {copy.poolModel.deckingSubLabel}
              </div>
            </div>

            {/* Decking material */}
            <div className="option-card-grid cols-3" style={{ marginBottom: 'var(--space-md)' }}>
              <button
                className={`option-card${!selectedDecking ? ' selected' : ''}`}
                onClick={() => { setSelectedDecking(''); setPresetKey(''); }}
                type="button"
                style={{ gridColumn: '1 / -1' }}
              >
                <div className="option-card-name">No decking</div>
                <div className="option-card-desc">Skip decking for now — we can quote it separately.</div>
              </button>
              {catalog.deckingOptions.map((opt) => (
                <button
                  key={opt.id}
                  className={`option-card${selectedDecking === opt.id ? ' selected' : ''}`}
                  onClick={() => setSelectedDecking(opt.id)}
                  type="button"
                >
                  <div className="option-card-name">{opt.name}</div>
                  {opt.description && (
                    <div className="option-card-desc">{opt.description}</div>
                  )}
                  <div className="option-card-price">
                    {formatCurrency(opt.pricePerSqft)}/sqft
                  </div>
                </button>
              ))}
            </div>

            {/* Decking coverage */}
            {selectedDecking && (
              <div>
                <div style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--text-primary)', marginBottom: 'var(--space-sm)' }}>
                  How much decking?
                </div>
                <div className="option-card-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 'var(--space-sm)' }}>
                  {catalog.deckingPresetWidths.map((preset) => {
                    const estimatedSqft = pool
                      ? calculateDeckingSquareFootage(pool, preset.width, catalog.minimumDeckingWidth)
                      : null;
                    return (
                      <button
                        key={preset.key}
                        className={`option-card${presetKey === preset.key ? ' selected' : ''}`}
                        onClick={() => setPresetKey(preset.key)}
                        type="button"
                      >
                        <div className="option-card-name">{preset.label}</div>
                        {estimatedSqft && (
                          <div className="option-card-meta">≈ {estimatedSqft} sqft</div>
                        )}
                      </button>
                    );
                  })}
                  <div
                    className={`option-card${presetKey === 'custom' ? ' selected' : ''}`}
                    style={{ gridColumn: '1 / -1', width: '100%', cursor: presetKey === 'custom' ? 'default' : 'pointer' }}
                    onClick={() => { if (presetKey !== 'custom') setPresetKey('custom'); }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setPresetKey('custom'); }}
                  >
                    <div className="option-card-name">Enter exact sqft</div>
                    {presetKey === 'custom' ? (
                      <input
                        type="number"
                        className="form-input"
                        placeholder="e.g. 800"
                        value={customSqft}
                        onChange={(e) => setCustomSqft(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        min={1}
                        autoFocus
                        style={{ marginTop: 'var(--space-sm)' }}
                      />
                    ) : (
                      <div className="option-card-desc">I know the square footage I need.</div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Navigation */}
        <div className="step-nav">
          <button className="btn-ghost" onClick={handleBack}>← Back</button>
          <button
            className="btn-primary"
            onClick={handleContinue}
            disabled={!canContinue()}
          >
            Continue
          </button>
        </div>
      </div>
    </main>
  );
}

