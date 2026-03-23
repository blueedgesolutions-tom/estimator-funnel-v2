'use client';

import { useState, useEffect, useCallback } from 'react';
import { CheckCircle, AlertCircle, Info, Zap, ChevronDown, ChevronUp } from 'lucide-react';
import type { TenantCatalog, PoolModel, EquipmentOption, DeckingOption } from '@/lib/types';
import { MANUFACTURERS } from '@/lib/manufacturers/index';

// ─────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────

interface EquipmentState {
  enabled: boolean;
  price: string;
  dynamicPricing: boolean;
}

interface PoolModelState {
  price: string;
  enabled: boolean;
}

interface DeckingState {
  price: string;
  enabled: boolean;
}

interface FiberglassModelState {
  enabled: boolean;
  price: string;
}

interface IntakeSaveState {
  poolModels: Record<string, PoolModelState>;
  equipment: Record<string, EquipmentState>;
  decking: Record<string, DeckingState>;
  fiberglassModels: Record<string, FiberglassModelState>;
}

interface Props {
  tenantId: string;
  brandName: string;
  logoUrl: string;
  catalog: TenantCatalog;
}

// ─────────────────────────────────────────────────────────
// Small helpers
// ─────────────────────────────────────────────────────────

function Callout({ children }: { children: React.ReactNode }) {
  return (
    <div className="intake-callout">
      <Info size={15} className="intake-callout-icon" />
      <span>{children}</span>
    </div>
  );
}

function SectionHeader({ number, title, subtitle }: { number: number; title: string; subtitle: string }) {
  return (
    <div className="intake-section-header">
      <div className="intake-section-number">{number}</div>
      <div>
        <div className="intake-section-title">{title}</div>
        <div className="intake-section-subtitle">{subtitle}</div>
      </div>
    </div>
  );
}

function PriceInput({
  label,
  value,
  onChange,
  placeholder,
  unit = '$',
  unitPosition = 'prefix',
  hasError = false,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  unit?: string;
  unitPosition?: 'prefix' | 'suffix';
  hasError?: boolean;
  disabled?: boolean;
}) {
  return (
    <div className="intake-price-field">
      <div className="intake-price-label">{label}</div>
      <div className="intake-price-input-wrap">
        {unitPosition === 'prefix' && <span className="intake-price-unit intake-price-unit--prefix">{unit}</span>}
        <input
          type="number"
          min="0"
          step="any"
          className={`intake-price-input${unitPosition === 'prefix' ? ' has-prefix' : ''}${unitPosition === 'suffix' ? ' has-suffix' : ''}${hasError ? ' has-error' : ''}`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onWheel={(e) => e.currentTarget.blur()}
          placeholder={placeholder}
          disabled={disabled}
        />
        {unitPosition === 'suffix' && <span className="intake-price-unit intake-price-unit--suffix">{unit}</span>}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Item cards
// ─────────────────────────────────────────────────────────

function PoolModelCard({
  model,
  state,
  onStateChange,
  hasError,
}: {
  model: PoolModel;
  state: PoolModelState;
  onStateChange: (update: Partial<PoolModelState>) => void;
  hasError: boolean;
}) {
  return (
    <div className={`intake-item-card${!state.enabled ? ' is-disabled' : ''}${hasError ? ' has-error' : ''}`}>
      <div className="intake-item-top">
        <div>
          <div className="intake-item-name">{model.name}</div>
          <div className="intake-item-meta">{Math.round(model.width)}′ × {Math.round(model.length)}′</div>
        </div>
        <label className="intake-toggle-wrap">
          <div
            className={`intake-toggle${state.enabled ? ' is-on' : ''}`}
            onClick={() => onStateChange({ enabled: !state.enabled })}
            role="switch"
            aria-checked={state.enabled}
            tabIndex={0}
            onKeyDown={(e) => e.key === ' ' && onStateChange({ enabled: !state.enabled })}
          />
          <span className="intake-toggle-label">{state.enabled ? 'Offered' : 'Not offered'}</span>
        </label>
      </div>
      {model.description && (
        <div className="intake-item-desc">{model.description}</div>
      )}
      {state.enabled && (
        <div className="intake-pricing-area">
          <PriceInput
            label="Starting base price"
            value={state.price}
            onChange={(v) => onStateChange({ price: v })}
            placeholder="e.g. 62000"
            hasError={hasError}
          />
          {hasError && <div className="intake-field-error">A base price is required for this model.</div>}
        </div>
      )}
    </div>
  );
}

function EquipmentCard({
  opt,
  state,
  onStateChange,
  hasError,
}: {
  opt: EquipmentOption;
  state: EquipmentState;
  onStateChange: (update: Partial<EquipmentState>) => void;
  hasError: boolean;
}) {
  return (
    <div className={`intake-item-card${!state.enabled ? ' is-disabled' : ''}${hasError ? ' has-error' : ''}`}>
      <div className="intake-item-top">
        <div>
          <div className="intake-item-name">{opt.name}</div>
        </div>
        <label className="intake-toggle-wrap">
          <div
            className={`intake-toggle${state.enabled ? ' is-on' : ''}`}
            onClick={() => onStateChange({ enabled: !state.enabled })}
            role="switch"
            aria-checked={state.enabled}
            tabIndex={0}
            onKeyDown={(e) => e.key === ' ' && onStateChange({ enabled: !state.enabled })}
          />
          <span className="intake-toggle-label">{state.enabled ? 'Offered' : 'Not offered'}</span>
        </label>
      </div>

      {opt.description && (
        <div className="intake-item-desc">{opt.description}</div>
      )}

      {state.enabled && (
        <div className="intake-pricing-area">
          <div className="intake-price-row">
            <PriceInput
              label={state.dynamicPricing ? 'Fallback price (used while formula is configured)' : 'Your price'}
              value={state.price}
              onChange={(v) => onStateChange({ price: v })}
              placeholder="e.g. 4500"
              hasError={hasError}
            />
            <button
              type="button"
              className={`intake-dynamic-btn${state.dynamicPricing ? ' is-active' : ''}`}
              onClick={() => onStateChange({ dynamicPricing: !state.dynamicPricing })}
              title="Enable dynamic pricing"
            >
              <Zap size={13} />
              Dynamic pricing
            </button>
          </div>

          {state.dynamicPricing && (
            <div className="intake-dynamic-panel">
              <div className="intake-dynamic-badge">Dynamic pricing enabled</div>
              <p className="intake-dynamic-explain">
                This item needs a custom pricing formula. Thomas will follow up with you to identify
                the variables involved (e.g. pool size, sqft) and build the formula together.
                In the meantime, enter a flat fallback price above — that&apos;s what customers will
                see until the formula is live.
              </p>
            </div>
          )}

          {hasError && (
            <div className="intake-field-error">
              {state.dynamicPricing
                ? 'A fallback price is required when dynamic pricing is enabled.'
                : 'A price is required for this add-on.'}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DeckingCard({
  opt,
  state,
  onStateChange,
  hasError,
}: {
  opt: DeckingOption;
  state: DeckingState;
  onStateChange: (update: Partial<DeckingState>) => void;
  hasError: boolean;
}) {
  return (
    <div className={`intake-item-card${!state.enabled ? ' is-disabled' : ''}${hasError ? ' has-error' : ''}`}>
      <div className="intake-item-top">
        <div className="intake-item-name">{opt.name}</div>
        <label className="intake-toggle-wrap">
          <div
            className={`intake-toggle${state.enabled ? ' is-on' : ''}`}
            onClick={() => onStateChange({ enabled: !state.enabled })}
            role="switch"
            aria-checked={state.enabled}
            tabIndex={0}
            onKeyDown={(e) => e.key === ' ' && onStateChange({ enabled: !state.enabled })}
          />
          <span className="intake-toggle-label">{state.enabled ? 'Offered' : 'Not offered'}</span>
        </label>
      </div>
      {opt.description && (
        <div className="intake-item-desc">{opt.description}</div>
      )}
      {state.enabled && (
        <div className="intake-pricing-area">
          <PriceInput
            label="Installed price"
            value={state.price}
            onChange={(v) => onStateChange({ price: v })}
            placeholder="e.g. 18"
            unit="/ sq ft"
            unitPosition="suffix"
            hasError={hasError}
          />
          {hasError && <div className="intake-field-error">A price per sq ft is required.</div>}
        </div>
      )}
    </div>
  );
}

function CategoryGroup({
  label,
  children,
  defaultOpen = true,
}: {
  label: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="intake-category-group">
      <button
        type="button"
        className="intake-category-toggle"
        onClick={() => setOpen((o) => !o)}
      >
        <span className="intake-category-label">{label}</span>
        {open ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
      </button>
      {open && <div className="intake-category-items">{children}</div>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Success screen
// ─────────────────────────────────────────────────────────

function SuccessScreen({ brandName }: { brandName: string }) {
  return (
    <div className="intake-success">
      <div className="intake-success-icon">
        <CheckCircle size={52} strokeWidth={1.5} />
      </div>
      <h1 className="intake-success-title">Pricing submitted!</h1>
      <p className="intake-success-body">
        Your pricing catalog for <strong>{brandName}</strong> has been received.
        Thomas will review your submission and reach out shortly to confirm everything
        looks right before your estimator goes live.
      </p>
      <p className="intake-success-footnote">
        Questions? Email{' '}
        <a href="mailto:thomas@blueedgesolutions.co">thomas@blueedgesolutions.co</a>
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Main form
// ─────────────────────────────────────────────────────────

export default function IntakeForm({ tenantId, brandName, catalog }: Props) {
  const storageKey = `intake-${tenantId}`;

  // ── State init from catalog defaults ──
  const concreteModels = catalog.poolModels.filter((m) => !m.manufacturer);

  const [poolModels, setPoolModels] = useState<Record<string, PoolModelState>>(() =>
    Object.fromEntries(concreteModels.map((m) => [m.id, { price: String(m.basePrice), enabled: true }]))
  );

  const [equipment, setEquipment] = useState<Record<string, EquipmentState>>(() =>
    Object.fromEntries(
      catalog.equipmentOptions.map((o) => [
        o.id,
        { enabled: true, price: String(o.price), dynamicPricing: o.dynamicPricing ?? false },
      ])
    )
  );

  const [decking, setDecking] = useState<Record<string, DeckingState>>(() =>
    Object.fromEntries(catalog.deckingOptions.map((d) => [d.id, { price: String(d.pricePerSqft), enabled: true }]))
  );

  const [fiberglassModels, setFiberglassModels] = useState<Record<string, FiberglassModelState>>({});
  const [initialized, setInitialized] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [submitError, setSubmitError] = useState('');
  const [errorIds, setErrorIds] = useState<Set<string>>(new Set());

  // ── Load from localStorage on mount ──
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const saved: Partial<IntakeSaveState> = JSON.parse(raw);

        if (saved.poolModels) {
          setPoolModels((prev) => {
            const merged = { ...prev };
            for (const [id, val] of Object.entries(saved.poolModels!)) {
              if (id in merged) merged[id] = val;
            }
            return merged;
          });
        }
        if (saved.equipment) {
          setEquipment((prev) => {
            const merged = { ...prev };
            for (const [id, val] of Object.entries(saved.equipment!)) {
              if (id in merged) merged[id] = val;
            }
            return merged;
          });
        }
        if (saved.decking) {
          setDecking((prev) => {
            const merged = { ...prev };
            for (const [id, val] of Object.entries(saved.decking!)) {
              if (id in merged) merged[id] = val;
            }
            return merged;
          });
        }
        if (saved.fiberglassModels) {
          setFiberglassModels((prev) => ({ ...prev, ...saved.fiberglassModels }));
        }
      }
    } catch {
      // Ignore corrupted storage
    }
    setInitialized(true);
  }, [storageKey]);

  // ── Auto-save to localStorage ──
  useEffect(() => {
    if (!initialized) return;
    try {
      const payload: IntakeSaveState = { poolModels, equipment, decking, fiberglassModels };
      localStorage.setItem(storageKey, JSON.stringify(payload));
    } catch {
      // Ignore storage errors
    }
  }, [poolModels, equipment, decking, fiberglassModels, initialized, storageKey]);

  // ── Helpers ──
  function updateEquipment(id: string, update: Partial<EquipmentState>) {
    setEquipment((prev) => ({ ...prev, [id]: { ...prev[id], ...update } }));
  }

  function updatePoolModel(id: string, update: Partial<PoolModelState>) {
    setPoolModels((prev) => ({ ...prev, [id]: { ...prev[id], ...update } }));
  }

  function updateDecking(id: string, update: Partial<DeckingState>) {
    setDecking((prev) => ({ ...prev, [id]: { ...prev[id], ...update } }));
  }

  // ── Validation ──
  const validate = useCallback((): { errors: string[]; ids: Set<string> } => {
    const errors: string[] = [];
    const ids = new Set<string>();

    for (const model of concreteModels) {
      const state = poolModels[model.id];
      if (!state?.enabled) continue;
      const price = parseFloat(state.price ?? '0');
      if (!price || price <= 0) {
        errors.push(`${model.name} — base price is required.`);
        ids.add(model.id);
      }
    }

    for (const opt of catalog.equipmentOptions) {
      const state = equipment[opt.id];
      if (!state?.enabled) continue;
      const price = parseFloat(state.price ?? '0');
      if (!price || price <= 0) {
        errors.push(`${opt.name} — ${state.dynamicPricing ? 'fallback price' : 'price'} is required.`);
        ids.add(opt.id);
      }
    }

    for (const opt of catalog.deckingOptions) {
      const state = decking[opt.id];
      if (!state?.enabled) continue;
      const price = parseFloat(state.price ?? '0');
      if (!price || price <= 0) {
        errors.push(`${opt.name} — price per sq ft is required.`);
        ids.add(opt.id);
      }
    }

    for (const mfr of MANUFACTURERS) {
      for (const model of mfr.models) {
        const state = fiberglassModels[model.id];
        if (!state?.enabled) continue;
        const price = parseFloat(state.price ?? '0');
        if (!price || price <= 0) {
          errors.push(`${model.name} (${mfr.name}) — base price is required.`);
          ids.add(model.id);
        }
      }
    }

    return { errors, ids };
  }, [catalog, poolModels, equipment, decking, fiberglassModels]);

  // ── Submit ──
  async function handleSubmit() {
    const { errors, ids } = validate();
    if (errors.length > 0) {
      setValidationErrors(errors);
      setErrorIds(ids);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setValidationErrors([]);
    setErrorIds(new Set());
    setSubmitError('');
    setSubmitting(true);

    try {
      const activeManufacturerModels = MANUFACTURERS.flatMap((mfr) =>
        mfr.models
          .filter((m) => fiberglassModels[m.id]?.enabled)
          .map((m) => ({
            ...m,
            basePrice: parseFloat(fiberglassModels[m.id].price) || 0,
            enabled: true,
          }))
      );

      const body = {
        poolModels: concreteModels.map((m) => ({
          id: m.id,
          basePrice: parseFloat(poolModels[m.id]?.price ?? '0') || 0,
          enabled: poolModels[m.id]?.enabled !== false ? undefined : false,
        })),
        equipmentOptions: catalog.equipmentOptions.map((o) => ({
          id: o.id,
          enabled: equipment[o.id]?.enabled ?? true,
          price: parseFloat(equipment[o.id]?.price ?? '0') || 0,
          ...(equipment[o.id]?.dynamicPricing ? { dynamicPricing: true } : {}),
        })),
        deckingOptions: catalog.deckingOptions.map((d) => ({
          id: d.id,
          pricePerSqft: parseFloat(decking[d.id]?.price ?? '0') || 0,
          enabled: decking[d.id]?.enabled !== false ? undefined : false,
        })),
        ...(activeManufacturerModels.length > 0 ? { customPoolModels: activeManufacturerModels } : {}),
      };

      const res = await fetch('/api/intake-submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error('Submission failed');

      localStorage.removeItem(storageKey);
      setSubmitted(true);
    } catch {
      setSubmitError('Something went wrong. Please try again, or email thomas@blueedgesolutions.co directly.');
    } finally {
      setSubmitting(false);
    }
  }

  // ── Group equipment by category ──
  const categories = Array.from(
    new Set(catalog.equipmentOptions.map((o) => o.category ?? 'Other'))
  );
  const byCategory = new Map<string, EquipmentOption[]>();
  for (const opt of catalog.equipmentOptions) {
    const cat = opt.category ?? 'Other';
    if (!byCategory.has(cat)) byCategory.set(cat, []);
    byCategory.get(cat)!.push(opt);
  }

  if (submitted) return <SuccessScreen brandName={brandName} />;

  return (
    <div className="intake-wrapper">

      {/* Validation error banner */}
      {validationErrors.length > 0 && (
        <div className="intake-error-banner">
          <AlertCircle size={18} className="intake-error-banner-icon" />
          <div>
            <div className="intake-error-banner-title">
              {validationErrors.length} item{validationErrors.length !== 1 ? 's' : ''} need attention before submitting.
            </div>
            <ul className="intake-error-list">
              {validationErrors.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          </div>
        </div>
      )}

      {/* Hero */}
      <div className="intake-hero">
        <div className="intake-hero-eyebrow">Pricing Setup</div>
        <h1 className="intake-hero-title">Set up your pricing catalog</h1>
        <p className="intake-hero-subtitle">
          Welcome, <strong>{brandName}.</strong> Work through the three sections below to enter your
          pricing for pool models, equipment add-ons, and decking materials.
          Your progress saves automatically as you go, so you can close this page and come back at any time.
        </p>
        <div className="intake-hero-saves">
          <div className="intake-saves-dot" />
          Auto-saving your progress
        </div>
      </div>

      {/* ── Section 1: Pool Models ── */}
      <section className="intake-section">
        <SectionHeader
          number={1}
          title="Pool Models"
          subtitle="Base shell packages you install"
        />
        <Callout>
          These are the base pool packages available on your estimator. Enter your starting
          installation price for each model — this is the cost of the shell and basic installation
          before any add-ons or decking.
        </Callout>
        <div className="intake-items">
          {concreteModels.map((model) => (
            <PoolModelCard
              key={model.id}
              model={model}
              state={poolModels[model.id] ?? { price: '', enabled: true }}
              onStateChange={(update) => updatePoolModel(model.id, update)}
              hasError={errorIds.has(model.id)}
            />
          ))}
        </div>
      </section>

      {/* ── Section 2: Equipment & Add-ons ── */}
      <section className="intake-section">
        <SectionHeader
          number={2}
          title="Equipment & Add-ons"
          subtitle="Optional upgrades customers can select"
        />
        <Callout>
          Toggle off any items you don&apos;t currently offer. For everything you do offer, enter your
          installed price. If an item&apos;s cost varies based on pool size or other factors, enable
          Dynamic Pricing and enter an approximate fallback price — the exact formula will be
          configured separately.
        </Callout>
        <div className="intake-items">
          {categories.map((cat) => (
            <CategoryGroup key={cat} label={cat}>
              {byCategory.get(cat)!.map((opt) => (
                <EquipmentCard
                  key={opt.id}
                  opt={opt}
                  state={equipment[opt.id] ?? { enabled: true, price: '', dynamicPricing: false }}
                  onStateChange={(update) => updateEquipment(opt.id, update)}
                  hasError={errorIds.has(opt.id)}
                />
              ))}
            </CategoryGroup>
          ))}
        </div>
      </section>

      {/* ── Section 3: Decking ── */}
      <section className="intake-section">
        <SectionHeader
          number={3}
          title="Decking Materials"
          subtitle="Poolside surround options"
        />
        <Callout>
          Enter your installed cost per square foot for each decking material. Customers will choose
          a material and deck width, and the estimator will calculate the total decking cost automatically.
        </Callout>
        <div className="intake-items">
          {catalog.deckingOptions.map((opt) => (
            <DeckingCard
              key={opt.id}
              opt={opt}
              state={decking[opt.id] ?? { price: '', enabled: true }}
              onStateChange={(update) => updateDecking(opt.id, update)}
              hasError={errorIds.has(opt.id)}
            />
          ))}
        </div>
      </section>

      {/* ── Section 4: Fiberglass Models (Optional) ── */}
      {MANUFACTURERS.length > 0 && (
        <section className="intake-section">
          <SectionHeader
            number={4}
            title="Fiberglass Models"
            subtitle="Optional — select models you install"
          />
          <Callout>
            If you install fiberglass pools, select the models you offer below and enter your
            installed price for each. Leave this section blank if you only install concrete pools.
          </Callout>

          {MANUFACTURERS.map((mfr) => (
            <div key={mfr.id} style={{ marginBottom: 'var(--space-xl)' }}>
              <div style={{
                fontSize: 'var(--text-xs)',
                fontWeight: 600,
                textTransform: 'uppercase' as const,
                letterSpacing: '0.1em',
                color: 'var(--text-muted)',
                marginBottom: 'var(--space-sm)',
                paddingBottom: 'var(--space-xs)',
                borderBottom: '1px solid var(--canvas-border)',
              }}>
                {mfr.name}
              </div>
              <div className="intake-items">
                {mfr.models.map((model) => {
                  const state = fiberglassModels[model.id] ?? { enabled: false, price: '' };
                  const hasError = errorIds.has(model.id);
                  return (
                    <div key={model.id} className={`intake-item-card${!state.enabled ? ' is-disabled' : ''}${hasError ? ' has-error' : ''}`}>
                      <div className="intake-item-top">
                        <div>
                          <div className="intake-item-name">{model.name}</div>
                          <div className="intake-item-meta">{Math.round(model.width)}′ × {Math.round(model.length)}′</div>
                        </div>
                        <label className="intake-toggle-wrap">
                          <div
                            className={`intake-toggle${state.enabled ? ' is-on' : ''}`}
                            onClick={() => setFiberglassModels((prev) => ({
                              ...prev,
                              [model.id]: { ...state, enabled: !state.enabled },
                            }))}
                            role="switch"
                            aria-checked={state.enabled}
                            tabIndex={0}
                            onKeyDown={(e) => e.key === ' ' && setFiberglassModels((prev) => ({
                              ...prev,
                              [model.id]: { ...state, enabled: !state.enabled },
                            }))}
                          />
                          <span className="intake-toggle-label">{state.enabled ? 'Offered' : 'Not offered'}</span>
                        </label>
                      </div>

                      {state.enabled && (
                        <div className="intake-pricing-area">
                          <PriceInput
                            label="Your installed price"
                            value={state.price}
                            onChange={(v) => setFiberglassModels((prev) => ({
                              ...prev,
                              [model.id]: { ...state, price: v },
                            }))}
                            placeholder="e.g. 45000"
                            hasError={hasError}
                          />
                          {hasError && <div className="intake-field-error">A base price is required for this model.</div>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Bottom spacer for sticky bar */}
      <div style={{ height: 96 }} />

      {/* Sticky submit bar */}
      <div className="intake-submit-bar">
        <div className="intake-submit-bar-left">
          {submitError ? (
            <div className="intake-submit-error">{submitError}</div>
          ) : (
            <div className="intake-submit-hint">
              All fields save automatically. Submit when you&apos;re ready.
            </div>
          )}
        </div>
        <button
          type="button"
          className="btn-primary intake-submit-btn"
          onClick={handleSubmit}
          disabled={submitting}
        >
          {submitting ? 'Submitting...' : 'Submit my pricing'}
        </button>
      </div>
    </div>
  );
}
