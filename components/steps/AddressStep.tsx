'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { MapPin, AlertTriangle, XCircle } from 'lucide-react';
import { useFunnel } from '../FunnelProvider';
import StepProgress from '../StepProgress';
import { resolveCopy } from '@/lib/copy';
import { calculatePrice } from '@/lib/pricing';
import type { TenantConfig, AddressData } from '@/lib/types';

interface Props {
  tenant: TenantConfig;
}

interface PlacePrediction {
  place_id: string;
  description: string;
  main_text: string;
  secondary_text: string;
}

type ServiceAreaStatus = 'idle' | 'in-area' | 'out-strict' | 'out-warn';

// ─────────────────────────────────────────────────────────
// HAVERSINE FORMULA
// ─────────────────────────────────────────────────────────

function haversineDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 3958.8; // miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function checkServiceArea(
  address: AddressData,
  config: TenantConfig['estimate']['serviceArea']
): ServiceAreaStatus {
  if (!config.enabled) return 'in-area';

  const distance = haversineDistance(
    config.lat, config.lng,
    address.lat, address.lng
  );

  if (distance > config.radiusMiles) {
    return config.strictMode ? 'out-strict' : 'out-warn';
  }

  // Inside radius — check blocked zones
  const zip = address.postal_code ?? '';
  const state = (address.administrative_area_level_1 ?? '').toUpperCase();
  const county = (address.county ?? '').toLowerCase();

  if (config.blockedZips?.includes(zip)) {
    return config.strictMode ? 'out-strict' : 'out-warn';
  }
  if (config.blockedStates?.map((s) => s.toUpperCase()).includes(state)) {
    return config.strictMode ? 'out-strict' : 'out-warn';
  }
  if (config.blockedCounties?.some((c) => c.toLowerCase() === county)) {
    return config.strictMode ? 'out-strict' : 'out-warn';
  }

  return 'in-area';
}

const TOTAL_STEPS = 5;

export default function AddressStep({ tenant }: Props) {
  const { funnelData, updateFunnelData, handleNext, handleBack, handleOutOfAreaSubmit } = useFunnel();
  const copy = resolveCopy(tenant);
  const { serviceArea } = tenant.estimate;

  const [query, setQuery] = useState(funnelData.address?.formatted_address ?? '');
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<AddressData | null>(
    funnelData.address ?? null
  );
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [loadingPredictions, setLoadingPredictions] = useState(false);
  const [loadingGeocode, setLoadingGeocode] = useState(false);
  const [serviceStatus, setServiceStatus] = useState<ServiceAreaStatus>(
    funnelData.address ? (funnelData.isOutOfServiceArea ? 'out-warn' : 'in-area') : 'idle'
  );

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Debounced autocomplete search ──
  const fetchPredictions = useCallback(async (input: string) => {
    if (input.length < 3) { setPredictions([]); return; }
    setLoadingPredictions(true);
    try {
      const res = await fetch(`/api/places-autocomplete?input=${encodeURIComponent(input)}`);
      const data = await res.json();
      setPredictions(data.predictions ?? []);
    } catch {
      setPredictions([]);
    } finally {
      setLoadingPredictions(false);
    }
  }, []);

  function handleQueryChange(value: string) {
    setQuery(value);
    setSelectedAddress(null);
    setServiceStatus('idle');
    setHighlightIndex(-1);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchPredictions(value), 1000);
  }

  // ── Geocode a selected prediction ──
  async function selectPrediction(prediction: PlacePrediction) {
    setQuery(prediction.description);
    setPredictions([]);
    setLoadingGeocode(true);

    try {
      const res = await fetch(`/api/geocode-place?place_id=${encodeURIComponent(prediction.place_id)}`);
      const data = await res.json();
      const address: AddressData = data.address;
      setSelectedAddress(address);

      const status = checkServiceArea(address, serviceArea);
      setServiceStatus(status);
    } catch {
      setServiceStatus('idle');
    } finally {
      setLoadingGeocode(false);
    }
  }

  // ── Keyboard navigation on dropdown ──
  function handleKeyDown(e: React.KeyboardEvent) {
    if (!predictions.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIndex((i) => Math.min(i + 1, predictions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && highlightIndex >= 0) {
      e.preventDefault();
      selectPrediction(predictions[highlightIndex]);
    } else if (e.key === 'Escape') {
      setPredictions([]);
    }
  }

  const canContinue =
    selectedAddress !== null && serviceStatus !== 'out-strict';

  function handleContinue() {
    if (!selectedAddress) return;
    const isOut = serviceStatus === 'out-warn';

    updateFunnelData({
      address: selectedAddress,
      isOutOfServiceArea: isOut,
    });

    if (isOut) {
      // Out-of-area shortcut: skip contact/booking, go straight to results
      const price = calculatePrice(funnelData, tenant.catalog);
      handleOutOfAreaSubmit({
        address: selectedAddress,
        isOutOfServiceArea: true,
        estimatedPrice: price,
      });
    } else {
      handleNext();
    }
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (inputRef.current && !inputRef.current.contains(e.target as Node)) {
        setPredictions([]);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <main className="page-content">
      <div style={{ paddingTop: 'var(--space-xl)', width: '100%' }}>
        <StepProgress current={4} total={TOTAL_STEPS} />

        <div className="eyebrow">{copy.address.eyebrow}</div>
        <h2 className="headline-display" style={{ marginBottom: 'var(--space-sm)' }}>
          {copy.address.headline}
        </h2>
        <p className="subheadline" style={{ marginBottom: 'var(--space-xl)' }}>
          {copy.address.subheadline}
        </p>

        {/* Address input */}
        <div className="form-group">
          <label className="form-label">Property address</label>
          <div className="autocomplete-wrapper" ref={inputRef as React.Ref<HTMLDivElement>}>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                className="form-input"
                placeholder={copy.address.placeholder}
                value={query}
                onChange={(e) => handleQueryChange(e.target.value)}
                onKeyDown={handleKeyDown}
                autoComplete="off"
              />
              {(loadingPredictions || loadingGeocode) && (
                <div style={{
                  position: 'absolute',
                  right: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  fontSize: 'var(--text-xs)',
                  color: 'var(--text-muted)',
                }}>
                  …
                </div>
              )}
            </div>

            {predictions.length > 0 && (
              <div className="autocomplete-dropdown">
                {predictions.map((pred, i) => (
                  <button
                    key={pred.place_id}
                    className={`autocomplete-item${i === highlightIndex ? ' highlighted' : ''}`}
                    onClick={() => selectPrediction(pred)}
                    type="button"
                  >
                    <span className="autocomplete-item-main">{pred.main_text}</span>
                    <span className="autocomplete-item-secondary">{pred.secondary_text}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Service area feedback */}
        {serviceStatus === 'in-area' && selectedAddress && (
          <div className="status-banner success" style={{ marginBottom: 'var(--space-md)' }}>
            <MapPin size={16} strokeWidth={1.5} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>We serve this area. </span>
          </div>
        )}

        {serviceStatus === 'out-warn' && (
          <div className="status-banner warning" style={{ marginBottom: 'var(--space-md)' }}>
            <AlertTriangle size={16} strokeWidth={1.5} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>{serviceArea.warningMessage}</span>
          </div>
        )}

        {serviceStatus === 'out-strict' && (
          <div className="status-banner error" style={{ marginBottom: 'var(--space-md)' }}>
            <XCircle size={16} strokeWidth={1.5} style={{ flexShrink: 0, marginTop: 1 }} />
            <div>
              <div style={{ fontWeight: 500 }}>Outside our service area</div>
              <div style={{ marginTop: 4, fontWeight: 300 }}>
                Unfortunately we don&apos;t currently serve this location. Please try a different address.
              </div>
              <button
                className="btn-ghost"
                onClick={() => { setQuery(''); setSelectedAddress(null); setServiceStatus('idle'); }}
                style={{ marginTop: 8 }}
              >
                Try a different address
              </button>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="step-nav">
          <button className="btn-ghost" onClick={handleBack}>← Back</button>
          <button
            className="btn-primary"
            onClick={handleContinue}
            disabled={!canContinue || loadingGeocode}
          >
            {serviceStatus === 'out-warn' ? 'Continue anyway' : 'Continue'}
          </button>
        </div>
      </div>
    </main>
  );
}

