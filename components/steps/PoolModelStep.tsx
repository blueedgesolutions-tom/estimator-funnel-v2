'use client';

import { useState, useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { Images, ChevronLeft, ChevronRight } from 'lucide-react';
import { useFunnel } from '../FunnelProvider';
import { resolveCopy } from '@/lib/copy';
import StepProgress from '../StepProgress';
import { calculateDeckingSquareFootage } from '@/lib/pricing';
import { formatCurrency } from '@/lib/pricing';
import type { TenantConfig, PoolModel } from '@/lib/types';

gsap.registerPlugin(useGSAP);

interface Props {
  tenant: TenantConfig;
}

const TOTAL_STEPS = 5;

// ── Photo carousel ────────────────────────────────────────
function PhotoCarousel({ images, name }: { images: string[]; name: string }) {
  const [index, setIndex] = useState(0);
  const [dragStart, setDragStart] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  function advance(dir: 1 | -1) {
    setIndex((i) => Math.min(Math.max(i + dir, 0), images.length - 1));
  }

  function onTouchStart(e: React.TouchEvent) {
    setDragStart(e.touches[0].clientX);
    setIsDragging(true);
  }

  function onTouchMove(e: React.TouchEvent) {
    if (dragStart === null) return;
    setDragOffset(e.touches[0].clientX - dragStart);
  }

  function onTouchEnd() {
    const width = containerRef.current?.offsetWidth ?? 280;
    if (dragOffset < -(width * 0.3) && index < images.length - 1) advance(1);
    else if (dragOffset > width * 0.3 && index > 0) advance(-1);
    setDragOffset(0);
    setDragStart(null);
    setIsDragging(false);
  }

  return (
    <div
      ref={containerRef}
      style={{ position: 'relative', overflow: 'hidden' }}
      onClick={(e) => e.stopPropagation()}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Track */}
      <div style={{
        display: 'flex',
        transform: `translateX(calc(${-index * 100}% + ${dragOffset}px))`,
        transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        willChange: 'transform',
      }}>
        {images.map((src, i) => (
          <img
            key={i}
            src={src}
            alt={`${name} — photo ${i + 1}`}
            draggable={false}
            style={{ width: '100%', height: 180, objectFit: 'cover', flexShrink: 0, display: 'block' }}
          />
        ))}
      </div>

      {/* Prev / next — desktop */}
      {images.length > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); advance(-1); }}
            disabled={index === 0}
            style={{
              position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)',
              width: 28, height: 28, borderRadius: '50%',
              background: 'rgba(0,0,0,0.35)', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', opacity: index === 0 ? 0.25 : 0.8, transition: 'opacity 0.15s',
            }}
          >
            <ChevronLeft size={15} strokeWidth={2.5} />
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); advance(1); }}
            disabled={index === images.length - 1}
            style={{
              position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
              width: 28, height: 28, borderRadius: '50%',
              background: 'rgba(0,0,0,0.35)', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', opacity: index === images.length - 1 ? 0.25 : 0.8, transition: 'opacity 0.15s',
            }}
          >
            <ChevronRight size={15} strokeWidth={2.5} />
          </button>
        </>
      )}

      {/* Dot nav */}
      {images.length > 1 && (
        <div style={{
          position: 'absolute', bottom: 8, left: 0, right: 0,
          display: 'flex', justifyContent: 'center', gap: 5,
        }}>
          {images.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={(e) => { e.stopPropagation(); setIndex(i); }}
              style={{
                width: i === index ? 16 : 6, height: 6, borderRadius: 999,
                background: i === index ? '#fff' : 'rgba(255,255,255,0.45)',
                border: 'none', padding: 0, cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Model card with animated photo drawer ─────────────────
interface ModelCardProps {
  model: PoolModel;
  isSelected: boolean;
  isOpen: boolean;
  onSelect: (model: PoolModel) => void;
  onTogglePhoto: (id: string) => void;
}

function ModelCard({ model, isSelected, isOpen, onSelect, onTogglePhoto }: ModelCardProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    if (!drawerRef.current) return;
    if (isOpen) {
      gsap.to(drawerRef.current, { height: 'auto', duration: 0.38, ease: 'power2.out', overwrite: true });
    } else {
      gsap.to(drawerRef.current, { height: 0, duration: 0.28, ease: 'power2.in', overwrite: true });
    }
  }, { scope: wrapperRef, dependencies: [isOpen] });

  const hasPhotos = model.images && model.images.length > 0;

  return (
    <div ref={wrapperRef} style={{ position: 'relative' }}>
      <button
        className={`option-card${isSelected ? ' selected' : ''}`}
        onClick={() => onSelect(model)}
        type="button"
        style={{
          width: '100%',
          position: 'relative',
          zIndex: 2,
          transition: 'box-shadow 0.25s',
          ...(isOpen ? { boxShadow: '0 6px 16px rgba(0,0,0,0.13)' } : {}),
        }}
      >
        <div className="option-card-name">{model.name}</div>
        <div className="option-card-dims">{Math.round(model.width)}′ × {Math.round(model.length)}′</div>
        {model.description && (
          <div className="option-card-desc">{model.description}</div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'var(--space-sm)', gap: 'var(--space-sm)' }}>
          <div className="option-card-price" style={{ margin: 0 }}>
            {formatCurrency(model.basePrice)}
          </div>
          {hasPhotos && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onTogglePhoto(model.id); }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 14px',
                borderRadius: 999,
                border: '1px solid',
                borderColor: isOpen ? 'var(--brand-primary)' : 'var(--canvas-border)',
                background: isOpen ? 'color-mix(in srgb, var(--brand-primary) 10%, transparent)' : 'var(--canvas-off-white)',
                color: isOpen ? 'var(--brand-primary)' : 'var(--text-muted)',
                fontSize: 'var(--text-sm)',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.15s',
                flexShrink: 0,
              }}
            >
              <Images size={13} strokeWidth={1.8} />
              {isOpen ? 'Hide' : `${model.images!.length} photo${model.images!.length !== 1 ? 's' : ''}`}
            </button>
          )}
        </div>
      </button>

      {/* Photo drawer */}
      {hasPhotos && (
        <div
          ref={drawerRef}
          style={{
            height: 0,
            overflow: 'hidden',
            position: 'relative',
            zIndex: 1,
            marginTop: -12,
            background: 'var(--canvas-off-white)',
            borderRadius: '0 0 var(--radius-lg) var(--radius-lg)',
            border: '1px solid var(--canvas-border)',
            borderTop: 'none',
          }}
        >
          <div style={{ paddingTop: 16 }}>
            <PhotoCarousel images={model.images!} name={model.name} />
          </div>
        </div>
      )}
    </div>
  );
}

export default function PoolModelStep({ tenant }: Props) {
  const { funnelData, updateFunnelData, handleNext, handleBack } = useFunnel();
  const copy = resolveCopy(tenant);
  const { catalog } = tenant;

  // ── Material switcher ──
  const hasFiberglass = catalog.poolModels.some((m) => m.material === 'fiberglass');
  const [selectedMaterial, setSelectedMaterial] = useState<'concrete' | 'fiberglass'>(() => {
    if (!hasFiberglass) return 'concrete';
    const existing = catalog.poolModels.find((m) => m.id === funnelData.poolModel);
    return existing?.material === 'fiberglass' ? 'fiberglass' : 'concrete';
  });

  const visibleModels = hasFiberglass
    ? catalog.poolModels.filter((m) => (m.material ?? 'concrete') === selectedMaterial)
    : catalog.poolModels;

  const [selectedModel, setSelectedModel] = useState(funnelData.poolModel ?? '');
  const [openPhotoId, setOpenPhotoId] = useState<string | null>(null);
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

  function handleMaterialSwitch(material: 'concrete' | 'fiberglass') {
    setSelectedMaterial(material);
    setSelectedModel('');
    setOpenPhotoId(null);
  }

  function handleModelSelect(model: PoolModel) {
    setSelectedModel(model.id);
    if (openPhotoId !== model.id) setOpenPhotoId(null);
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

        {/* Material switcher — only shown when fiberglass models exist */}
        {hasFiberglass && (
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 'var(--space-lg)' }}>
            <div style={{
              position: 'relative',
              display: 'inline-flex',
              background: 'var(--canvas-off-white)',
              border: '1px solid var(--canvas-border)',
              borderRadius: 999,
              padding: 3,
            }}>
              {/* Sliding thumb */}
              <div style={{
                position: 'absolute',
                top: 3,
                left: 3,
                width: 'calc(50% - 3px)',
                height: 'calc(100% - 6px)',
                background: 'var(--brand-primary)',
                borderRadius: 999,
                transition: 'transform 0.22s cubic-bezier(0.4, 0, 0.2, 1)',
                transform: selectedMaterial === 'fiberglass' ? 'translateX(100%)' : 'translateX(0)',
                pointerEvents: 'none',
              }} />
              {(['concrete', 'fiberglass'] as const).map((mat) => (
                <button
                  key={mat}
                  type="button"
                  onClick={() => handleMaterialSwitch(mat)}
                  style={{
                    position: 'relative',
                    zIndex: 1,
                    padding: '7px 28px',
                    background: 'none',
                    border: 'none',
                    borderRadius: 999,
                    color: selectedMaterial === mat ? '#fff' : 'var(--text-secondary)',
                    fontSize: 'var(--text-sm)',
                    fontWeight: 500,
                    cursor: 'pointer',
                    textTransform: 'capitalize',
                    transition: 'color 0.22s',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {mat}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Pool model cards */}
        <div className="option-card-grid" style={{ marginBottom: 'var(--space-2xl)' }}>
          {visibleModels.map((model) => (
            <ModelCard
              key={model.id}
              model={model}
              isSelected={selectedModel === model.id}
              isOpen={openPhotoId === model.id}
              onSelect={handleModelSelect}
              onTogglePhoto={(id) => setOpenPhotoId((prev) => prev === id ? null : id)}
            />
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
