'use client';

import { useState } from 'react';
import { useFunnel } from '../FunnelProvider';
import { resolveCopy } from '@/lib/copy';
import StepProgress from '../StepProgress';
import type { TenantConfig } from '@/lib/types';

interface Props {
  tenant: TenantConfig;
}

const TIMELINE_OPTIONS = [
  { id: 'asap',     label: 'As soon as possible',  sub: 'I\'m ready to move forward' },
  { id: '1-3mo',   label: '1–3 months',            sub: 'Planning soon' },
  { id: '3-6mo',   label: '3–6 months',            sub: 'Still in early stages' },
  { id: '6-12mo',  label: '6–12 months',           sub: 'Looking ahead' },
  { id: 'exploring', label: 'Just exploring',      sub: 'No timeline yet' },
];

const TOTAL_STEPS = 5;

export default function TimelineStep({ tenant }: Props) {
  const { funnelData, updateFunnelData, handleNext, handleBack } = useFunnel();
  const copy = resolveCopy(tenant);

  const [selected, setSelected] = useState(funnelData.timeline ?? '');

  function handleContinue() {
    updateFunnelData({ timeline: selected });
    handleNext();
  }

  return (
    <main className="page-content">
      <div style={{ paddingTop: 'var(--space-xl)', width: '100%' }}>
        <StepProgress current={3} total={TOTAL_STEPS} />

        <div className="eyebrow">{copy.timeline.eyebrow}</div>
        <h2 className="headline-display" style={{ marginBottom: 'var(--space-sm)' }}>
          {copy.timeline.headline}
        </h2>
        <p className="subheadline" style={{ marginBottom: 'var(--space-xl)' }}>
          {copy.timeline.subheadline}
        </p>

        <div className="option-card-grid" style={{ gridTemplateColumns: '1fr', gap: 'var(--space-sm)' }}>
          {TIMELINE_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              className={`option-card${selected === opt.id ? ' selected' : ''}`}
              onClick={() => setSelected(opt.id)}
              type="button"
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexDirection: 'row' }}
            >
              <div>
                <div className="option-card-name">{opt.label}</div>
                <div className="option-card-desc" style={{ margin: 0 }}>{opt.sub}</div>
              </div>
            </button>
          ))}
        </div>

        <div className="step-nav">
          <button className="btn-ghost" onClick={handleBack}>← Back</button>
          <button
            className="btn-primary"
            onClick={handleContinue}
            disabled={!selected}
          >
            Continue
          </button>
        </div>
      </div>
    </main>
  );
}

