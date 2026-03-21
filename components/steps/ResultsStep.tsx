'use client';

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { format, addDays, startOfDay, isWeekend } from 'date-fns';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/style.css';
import { ChevronDown, ChevronUp, Download, RotateCcw, Calendar, Percent, CircleDollarSign, Sunrise, Sun } from 'lucide-react';
import { useFunnel } from '../FunnelProvider';
import FaqAccordion from '../FaqAccordion';
import { resolveCopy, interpolate } from '@/lib/copy';
import { priceRange, monthlyPayment, formatCurrency, evaluatePricingFormula } from '@/lib/pricing';
import type { PricingContext } from '@/lib/types';
import type { TenantConfig } from '@/lib/types';

interface Props {
  tenant: TenantConfig;
}

// Weekday Date objects for DayPicker (2-day blackout, same as BookingStep)
function getAvailableConsultDays(count: number): Date[] {
  const days: Date[] = [];
  let cursor = addDays(startOfDay(new Date()), 2);
  while (days.length < count) {
    if (!isWeekend(cursor)) days.push(new Date(cursor));
    cursor = addDays(cursor, 1);
  }
  return days;
}


type ConsultationState = 'prompt' | 'picker' | 'confirmed';

export default function ResultsStep({ tenant }: Props) {
  const { funnelData, handleReset, tenantId } = useFunnel();
  const copy = resolveCopy(tenant);
  const { catalog, estimate, config } = tenant;

  const {
    estimatedPrice = 0,
    isOutOfServiceArea,
    name,
    bookingCompleted,
    bookingDate,
    bookingTimeSlot,
  } = funnelData;

  const { low, high } = priceRange(estimatedPrice);

  // ── Financing slider state (React owns this after animation completes) ──
  const defaultApr = estimate.financingApr ?? 8.99;
  const defaultTerm = estimate.financingTermYears ?? 10;
  const [loanTerm, setLoanTerm] = useState(defaultTerm);
  const [aprSlider, setAprSlider] = useState(Math.max(defaultApr, 6));
  const [downPaymentPct, setDownPaymentPct] = useState(10);

  const financingMonthly = useMemo(() => {
    const downAmt = estimatedPrice * (downPaymentPct / 100);
    const principalLow = Math.max(low - downAmt, 0);
    const principalHigh = Math.max(high - downAmt, 0);
    return {
      low: monthlyPayment(principalLow, aprSlider, loanTerm),
      high: monthlyPayment(principalHigh, aprSlider, loanTerm),
    };
  }, [low, high, aprSlider, loanTerm, downPaymentPct, estimatedPrice]);


  // Resolved catalog items for this submission
  const selectedPool = catalog.poolModels.find((m) => m.id === funnelData.poolModel);
  const selectedOptions = catalog.equipmentOptions.filter((o) =>
    (funnelData.options ?? []).includes(o.id)
  );
  const selectedDecking = catalog.deckingOptions.find((d) => d.id === funnelData.deckingType);

  // ── Section state ──
  const [whyOpen, setWhyOpen] = useState(false);

  // ── Consultation CTA state ──
  const initialConsultState: ConsultationState =
    bookingCompleted && bookingDate ? 'confirmed' : 'prompt';
  const [consultState, setConsultState] = useState<ConsultationState>(initialConsultState);
  const [consultDate, setConsultDate] = useState<Date | undefined>(undefined);
  const [consultTime, setConsultTime] = useState<'morning' | 'afternoon' | ''>('');
  const [consultLoading, setConsultLoading] = useState(false);
  const [consultError, setConsultError] = useState('');
  const [confirmedDate, setConfirmedDate] = useState(bookingDate ?? '');
  const [confirmedTime, setConfirmedTime] = useState<'morning' | 'afternoon'>(bookingTimeSlot ?? 'morning');

  const consultDays = getAvailableConsultDays(estimate.consultationDaysAhead ?? 21);

  async function handleBookConsultation() {
    if (!consultDate || !consultTime) return;
    setConsultLoading(true);
    setConsultError('');
    const dateStr = format(consultDate, 'yyyy-MM-dd');
    try {
      const res = await fetch('/api/consultation-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name ?? '',
          phone: funnelData.phone ?? '',
          date: dateStr,
          timeSlot: consultTime,
          estimatedPrice,
          tenantId,
        }),
      });
      if (!res.ok) throw new Error('Request failed');
      setConfirmedDate(dateStr);
      setConfirmedTime(consultTime);
      setConsultState('confirmed');
    } catch {
      setConsultError('Something went wrong. Please call us directly to book.');
    } finally {
      setConsultLoading(false);
    }
  }

  // ── PDF download ──
  const handleDownloadPdf = useCallback(async () => {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });

    const W  = 210;
    const H  = 297;
    const ml = 15;
    const mr = 15;
    const cw = W - ml - mr; // 180mm

    // Colour helpers
    function formatPhone(phone: string): string {
      const d = phone.replace(/\D/g, '');
      if (d.length === 10) return `(${d.slice(0,3)}) ${d.slice(3,6)}-${d.slice(6)}`;
      if (d.length === 11 && d[0] === '1') return `(${d.slice(1,4)}) ${d.slice(4,7)}-${d.slice(7)}`;
      return phone;
    }
    function hexRgb(hex: string): [number, number, number] {
      const h = (hex ?? '#1B6CA8').replace('#', '').padEnd(6, '0');
      return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)];
    }
    const [br, bg, bb] = hexRgb(config.theme.primary);
    // Very light brand tint for alternating rows and info bar
    const tR = Math.round(br + (255 - br) * 0.93);
    const tG = Math.round(bg + (255 - bg) * 0.93);
    const tB = Math.round(bb + (255 - bb) * 0.93);

    // Per-option price resolver
    const pricingCtx: PricingContext = {
      poolWidth:       selectedPool?.width  ?? 0,
      poolLength:      selectedPool?.length ?? 0,
      deckingSqft:     funnelData.paverSquareFootage ?? 0,
      hasSpa:          (funnelData.options ?? []).includes('spa'),
      selectedOptions: funnelData.options ?? [],
    };
    const resolveOptPrice = (opt: typeof selectedOptions[0]): number | null => {
      if (opt.dynamicPricing && opt.pricing_formula) {
        return evaluatePricingFormula(opt.pricing_formula, pricingCtx) ?? opt.price;
      }
      return opt.price ?? null;
    };

    // ═══════════════════════════════════════════
    // HEADER
    // ═══════════════════════════════════════════
    doc.setFillColor(br, bg, bb);
    doc.rect(0, 0, W, 40, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(255, 255, 255);
    doc.text(config.brand_name, ml, 17);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(255, 255, 255);
    doc.text('PRELIMINARY POOL ESTIMATE', ml, 26);
    doc.text(format(new Date(), 'MMMM d, yyyy'), W - mr, 26, { align: 'right' });

    // ═══════════════════════════════════════════
    // INFO BAR — client + metadata
    // ═══════════════════════════════════════════
    doc.setFillColor(tR, tG, tB);
    doc.rect(0, 40, W, 32, 'F');

    const c1 = ml;
    const c2 = ml + cw / 2 + 5;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(br, bg, bb);
    doc.text('PREPARED FOR', c1, 48);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(25, 25, 25);
    doc.text(name ?? '—', c1, 55);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(90, 90, 90);
    if (funnelData.phone) doc.text(formatPhone(funnelData.phone), c1, 61.5);
    const addr = funnelData.address?.formatted_address ?? '';
    if (addr) {
      const addrLines = doc.splitTextToSize(addr, cw / 2 - 8);
      doc.text(addrLines[0], c1, 67.5);
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(br, bg, bb);
    doc.text('ESTIMATE DETAILS', c2, 48);

    const meta: [string, string][] = [
      ['Date',     format(new Date(), 'MMM d, yyyy')],
      ['Status',   'Preliminary'],
    ];
    if (funnelData.timeline) meta.push(['Timeline', funnelData.timeline]);

    let my = 55;
    meta.forEach(([label, val]) => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(110, 110, 110);
      doc.text(label, c2, my);
      doc.setTextColor(25, 25, 25);
      doc.text(val, c2 + 22, my);
      my += 6.5;
    });

    // ═══════════════════════════════════════════
    // LINE ITEMS TABLE
    // ═══════════════════════════════════════════
    let y = 82;

    // Section label
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(br, bg, bb);
    doc.text('POOL CONFIGURATION', ml, y);
    y += 3.5;

    // Column x positions and widths
    const col1x = ml + 3;       // Item name
    const col2x = ml + 80;      // Specification
    const col3x = W - mr - 3;   // Amount (right-aligned)
    const col2w = 52;            // max width for spec text wrap

    // Table header
    doc.setFillColor(br, bg, bb);
    doc.rect(ml, y, cw, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);
    doc.text('Item', col1x, y + 5.3);
    doc.text('Specification', col2x, y + 5.3);
    doc.text('Amount', col3x, y + 5.3, { align: 'right' });
    y += 8;

    // Row renderer with variable height for wrapping spec text
    let rowIdx = 0;
    const tableRow = (item: string, spec: string, amount: string) => {
      const specLines = doc.splitTextToSize(spec, col2w);
      const rowH = Math.max(9.5, specLines.length * 4.6 + 5);

      if (rowIdx % 2 === 1) {
        doc.setFillColor(249, 249, 251);
        doc.rect(ml, y, cw, rowH, 'F');
      }
      doc.setDrawColor(232, 232, 236);
      doc.setLineWidth(0.2);
      doc.line(ml, y + rowH, W - mr, y + rowH);

      const midY = y + rowH / 2 + 1.6;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(22, 22, 22);
      doc.text(item, col1x, midY);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(95, 95, 95);
      const specOffsetY = y + rowH / 2 - (specLines.length - 1) * 2.3 + 1.6;
      doc.text(specLines, col2x, specOffsetY);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(22, 22, 22);
      doc.text(amount, col3x, midY, { align: 'right' });

      y += rowH;
      rowIdx++;
    };

    if (selectedPool) {
      tableRow(
        `${selectedPool.name} Pool`,
        `${selectedPool.width}' x ${selectedPool.length}'`,
        formatCurrency(selectedPool.basePrice)
      );
    }

    selectedOptions.forEach((opt) => {
      const price = resolveOptPrice(opt);
      tableRow(
        opt.name,
        opt.description ?? '',
        price !== null ? formatCurrency(price) : 'Included'
      );
    });

    if (selectedDecking && funnelData.paverSquareFootage) {
      const sqft     = funnelData.paverSquareFootage;
      const deckTotal = selectedDecking.pricePerSqft * sqft;
      tableRow(
        `${selectedDecking.name} Decking`,
        `${sqft.toLocaleString()} sqft  -  ${formatCurrency(selectedDecking.pricePerSqft)}/sqft`,
        formatCurrency(deckTotal)
      );
    }

    // Subtotal bar
    y += 1;
    doc.setFillColor(tR, tG, tB);
    doc.rect(ml, y, cw, 9, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(45, 45, 45);
    doc.text('Subtotal (before site conditions)', col1x, y + 6);
    doc.text(formatCurrency(estimatedPrice), col3x, y + 6, { align: 'right' });
    y += 9;

    // ═══════════════════════════════════════════
    // ESTIMATE RANGE CALLOUT
    // ═══════════════════════════════════════════
    y += 9;
    doc.setFillColor(br, bg, bb);
    doc.roundedRect(ml, y, cw, 28, 2.5, 2.5, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(255, 255, 255);
    doc.text('PRELIMINARY ESTIMATE RANGE', W / 2, y + 7.5, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(23);
    doc.setTextColor(255, 255, 255);
    doc.text(`${formatCurrency(low)}  –  ${formatCurrency(high)}`, W / 2, y + 21, { align: 'center' });
    y += 28;

    // Disclaimer
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(140, 140, 140);
    const disc = `This range reflects ±10% of the base estimate and accounts for typical site conditions. Your final price will be confirmed after an on-site evaluation by the ${config.company_name} design team.`;
    const discLines = doc.splitTextToSize(disc, cw);
    doc.text(discLines, W / 2, y, { align: 'center' });
    y += discLines.length * 3.8 + 8;

    // ═══════════════════════════════════════════
    // NEXT STEPS
    // ═══════════════════════════════════════════
    doc.setDrawColor(220, 220, 224);
    doc.setLineWidth(0.3);
    doc.line(ml, y, W - mr, y);
    y += 7;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(br, bg, bb);
    doc.text('NEXT STEPS', ml, y);
    y += 6;

    const steps = [
      'Review your estimate and keep this document for your records.',
      'Schedule your complimentary on-site design consultation at your convenience.',
      'Our team evaluates your property and delivers a precise, site-specific quote.',
      `Ready to move forward? Call ${config.contact_phone} or email ${config.contact_email}.`,
    ];

    steps.forEach((step, i) => {
      const stepLines = doc.splitTextToSize(step, cw - 11);
      const stepH = Math.max(8, stepLines.length * 4.5 + 3.5);

      // Circle sits beside the first line of text.
      // jsPDF text y = baseline; for 9pt Helvetica the visual midpoint of caps
      // is ~1.1mm above baseline, so circle center lands at y - 1.1.
      const circleY = y - 1.1;
      doc.setFillColor(br, bg, bb);
      doc.circle(ml + 3.2, circleY, 2.8, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(255, 255, 255);
      doc.text(String(i + 1), ml + 3.2, circleY + 0.9, { align: 'center' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(40, 40, 40);
      doc.text(stepLines, ml + 9, y);
      y += stepH;
    });

    // ═══════════════════════════════════════════
    // FOOTER
    // ═══════════════════════════════════════════
    const fY = H - 16;
    doc.setFillColor(br, bg, bb);
    doc.rect(0, fY - 0.5, W, 1, 'F');
    doc.setFillColor(247, 247, 249);
    doc.rect(0, fY + 0.5, W, H - fY, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(40, 40, 40);
    doc.text(config.company_name, W / 2, fY + 6, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(140, 140, 140);
    doc.text(`${config.contact_phone}  ·  ${config.contact_email}`, W / 2, fY + 11.5, { align: 'center' });

    doc.save(`Pool-Estimate-${(name ?? 'Estimate').replace(/\s+/g, '-')}.pdf`);
  }, [config, name, funnelData, selectedPool, selectedDecking, selectedOptions, low, high, estimatedPrice]);

  // ── Next-steps timeline animation ──
  const timelineRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!timelineRef.current) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let ctx: any;
    Promise.all([import('gsap'), import('gsap/ScrollTrigger')]).then(
      ([{ gsap }, { ScrollTrigger }]) => {
        gsap.registerPlugin(ScrollTrigger);
        ctx = gsap.context(() => {
          const items    = Array.from(timelineRef.current!.querySelectorAll<HTMLElement>('.nst-item'));
          const segments = Array.from(timelineRef.current!.querySelectorAll<HTMLElement>('.nst-segment'));
          if (!items.length) return;

          // Set initial states via GSAP (not CSS) — items stay visible if JS fails
          gsap.set(items,    { opacity: 0, x: (i) => i % 2 === 0 ? -28 : 28 });
          gsap.set(segments, { scaleY: 0 });

          // Single timeline + single ScrollTrigger — far more reliable on iOS
          // than many independent triggers
          const ITEM_DUR = 0.45;
          const SEG_DUR  = 0.6;
          const BEAT     = ITEM_DUR + SEG_DUR;

          const tl = gsap.timeline({
            scrollTrigger: {
              trigger: timelineRef.current,
              start: 'top bottom',
              once: true,
            },
          });

          items.forEach((item, i) => {
            tl.to(item,
              { opacity: 1, x: 0, duration: ITEM_DUR, ease: 'power2.out' },
              i * BEAT
            );
          });

          segments.forEach((seg, i) => {
            tl.to(seg,
              { scaleY: 1, duration: SEG_DUR, ease: 'power1.inOut', transformOrigin: 'top center' },
              i * BEAT + ITEM_DUR
            );
          });
        }, timelineRef);
      }
    );
    return () => ctx?.revert();
  }, []);

  // ── Price range count-up animation ──
  const priceDisplayRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!priceDisplayRef.current) return;
    const el = priceDisplayRef.current;
    const counter = { low: 0, high: 0 };
    import('gsap').then(({ gsap }) => {
      gsap.to(counter, {
        low,
        high,
        duration: 1.5,
        ease: 'power2.out',
        onUpdate() {
          el.textContent = `${formatCurrency(counter.low)} – ${formatCurrency(counter.high)}`;
        },
        onComplete() {
          el.textContent = `${formatCurrency(low)} – ${formatCurrency(high)}`;
        },
      });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Display helpers ──
  const firstName = (name ?? '').split(' ')[0] ?? 'there';
  const bookedDateLabel = confirmedDate
    ? format(new Date(confirmedDate + 'T12:00:00'), 'EEEE, MMMM d')
    : '';
  const bookedTimeLabel = confirmedTime === 'morning' ? 'morning (9am–12pm)' : 'afternoon (1pm–5pm)';

  return (
    <div style={{ width: '100%' }}>
      <main className="page-content">
        <div style={{ paddingTop: 'var(--space-xl)', width: '100%' }}>

          {/* ── Price range ── */}
          <div className="results-price-range">
            <div className="eyebrow" style={{ justifyContent: 'center' }}>{copy.results.eyebrow}</div>
            <div ref={priceDisplayRef} className="results-price-display">
              {formatCurrency(0)} – {formatCurrency(0)}
            </div>
            <p className="results-price-note">{copy.results.rangeNote}</p>
            <button
              className="why-range-toggle"
              onClick={() => setWhyOpen((o) => !o)}
            >
              {copy.results.whyRangeHeadline}
              {whyOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {whyOpen && (
              <div className="why-range-panel" style={{ marginTop: 'var(--space-sm)' }}>
                <div className="why-range-inner">{copy.results.whyRangeBody}</div>
              </div>
            )}
          </div>

          <div className="divider" />

          {/* ── Estimate card ── */}
          <div style={{ width: '100%', marginBottom: 'var(--space-xl)' }}>
            <div className="eyebrow">{copy.results.estimateCardEyebrow}</div>
            <h2 className="headline-section" style={{ marginBottom: 'var(--space-lg)' }}>
              {copy.results.estimateCardHeadline}
            </h2>
            <div className="estimate-card">
              <div className="estimate-card-header">
                {selectedPool ? (
                  <>
                    <div className="estimate-card-pool-name">{selectedPool.name} Pool</div>
                    <div className="estimate-card-pool-dims">
                      {selectedPool.width}′ × {selectedPool.length}′ · Base price {formatCurrency(selectedPool.basePrice)}
                    </div>
                  </>
                ) : (
                  <div className="estimate-card-pool-name">Custom pool</div>
                )}
              </div>

              {(selectedOptions.length > 0 || selectedDecking) && (
                <div className="estimate-features-grid">
                  {selectedOptions.map((opt) => (
                    <div key={opt.id} className="estimate-feature-cell">
                      <div className="estimate-feature-name">{opt.name}</div>
                      {opt.description && (
                        <div className="estimate-feature-desc">{opt.description}</div>
                      )}
                    </div>
                  ))}
                  {selectedDecking && (
                    <div className="estimate-feature-cell">
                      <div className="estimate-feature-name">{selectedDecking.name} Decking</div>
                      <div className="estimate-feature-desc">
                        {funnelData.paverSquareFootage} sqft · {formatCurrency(selectedDecking.pricePerSqft)}/sqft
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="estimate-card-total">
                <span className="estimate-card-total-label">Estimated range</span>
                <span className="estimate-card-total-value">
                  {formatCurrency(low)} – {formatCurrency(high)}
                </span>
              </div>
            </div>
          </div>

          {/* ── Consultation CTA (hidden for out-of-area) ── */}
          {!isOutOfServiceArea && (
            <div style={{ width: '100%', marginBottom: 'var(--space-xl)' }}>
              {consultState === 'confirmed' ? (
                <div className="consultation-confirmed">
                  <div className="consultation-confirmed-headline">
                    {interpolate(copy.results.bookedHeadline, { firstName })}
                  </div>
                  <p className="consultation-confirmed-sub">
                    {interpolate(copy.results.bookedSubheadline, {
                      date: bookedDateLabel,
                      timeSlot: bookedTimeLabel,
                    })}
                  </p>
                </div>
              ) : consultState === 'picker' ? (
                <div>
                  <div className="consultation-card" style={{ marginBottom: 'var(--space-md)' }}>
                    <div className="consultation-card-headline">{copy.results.ctaHeadline}</div>
                  </div>
                  {/* Calendar */}
                  <div style={{
                    background: 'var(--canvas-off-white)',
                    border: '1px solid var(--canvas-border)',
                    borderRadius: 'var(--radius-xl)',
                    padding: 'var(--space-lg)',
                    marginBottom: 'var(--space-md)',
                    display: 'flex',
                    justifyContent: 'center',
                  }}>
                    <DayPicker
                      mode="single"
                      selected={consultDate}
                      onSelect={setConsultDate}
                      disabled={(day) => isWeekend(day) || !consultDays.some(d => d.toDateString() === day.toDateString())}
                      fromDate={consultDays[0]}
                      toDate={consultDays[consultDays.length - 1]}
                      showOutsideDays={false}
                    />
                  </div>

                  {/* Time slots */}
                  <div style={{ marginBottom: 'var(--space-md)' }}>
                    <div style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--text-primary)', marginBottom: 'var(--space-sm)' }}>
                      Preferred time
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-sm)' }}>
                      {([
                        { value: 'morning', label: 'Morning', desc: '9am – 12pm', Icon: Sunrise },
                        { value: 'afternoon', label: 'Afternoon', desc: '1pm – 5pm', Icon: Sun },
                      ] as const).map(({ value, label, desc, Icon }) => (
                        <button
                          key={value}
                          className={`time-slot-card${consultTime === value ? ' selected' : ''}`}
                          onClick={() => setConsultTime(value)}
                          type="button"
                        >
                          <div className="time-slot-icon">
                            <Icon size={20} strokeWidth={1.5} />
                          </div>
                          <div>
                            <div className="time-slot-name">{label}</div>
                            <div className="time-slot-desc">{desc}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {consultError && (
                    <div className="status-banner error" style={{ marginBottom: 'var(--space-md)' }}>
                      {consultError}
                    </div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-sm)' }}>
                    <button
                      className="btn-primary"
                      onClick={handleBookConsultation}
                      disabled={!consultDate || !consultTime || consultLoading}
                    >
                      {consultLoading ? 'Confirming…' : 'Confirm appointment'}
                    </button>
                    <button className="btn-ghost" onClick={() => setConsultState('prompt')}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="consultation-card">
                  <div className="consultation-card-headline">{copy.results.ctaHeadline}</div>
                  <p className="consultation-card-sub">{copy.results.ctaSubheadline}</p>
                  <button
                    className="consultation-btn"
                    onClick={() => setConsultState('picker')}
                  >
                    {copy.results.ctaButton}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Out-of-area note */}
          {isOutOfServiceArea && (
            <div className="status-banner warning" style={{ marginBottom: 'var(--space-xl)' }}>
              {copy.results.outOfAreaNote}
            </div>
          )}

          {/* ── Financing calculator ── */}
          <div style={{ width: '100%', marginBottom: 'var(--space-xl)' }}>
            <div className="eyebrow">{copy.results.financingEyebrow}</div>
            <h2 className="headline-section" style={{ marginBottom: 'var(--space-lg)' }}>
              {copy.results.financingHeadline}
            </h2>
            <div className="financing-card">
              {/* Monthly range display */}
              <div className="financing-monthly-range">
                {formatCurrency(financingMonthly.low)} – {formatCurrency(financingMonthly.high)}<span style={{ fontSize: 'var(--text-lg)', fontFamily: 'var(--font-body)', fontWeight: 300, color: 'var(--text-secondary)' }}>/mo</span>
              </div>
              <div className="financing-range-label">Estimated monthly payment range</div>

              {/* Sliders */}
              <div className="financing-sliders">
                {/* Loan Term */}
                <div className="financing-slider-row">
                  <div className="financing-slider-header">
                    <span className="financing-slider-label">
                      <Calendar size={14} strokeWidth={1.5} />
                      Loan term
                    </span>
                    <span className="financing-slider-value">{loanTerm} yrs</span>
                  </div>
                  <input
                    type="range"
                    className="financing-slider"
                    min={5}
                    max={20}
                    step={1}
                    value={loanTerm}
                    onChange={(e) => setLoanTerm(Number(e.target.value))}
                    style={{ '--fill': `${((loanTerm - 5) / (20 - 5)) * 100}%` } as React.CSSProperties}
                  />
                </div>

                {/* Interest Rate */}
                <div className="financing-slider-row">
                  <div className="financing-slider-header">
                    <span className="financing-slider-label">
                      <Percent size={14} strokeWidth={1.5} />
                      Interest rate (APR)
                    </span>
                    <span className="financing-slider-value">{aprSlider.toFixed(1)}%</span>
                  </div>
                  <input
                    type="range"
                    className="financing-slider"
                    min={6}
                    max={15}
                    step={0.1}
                    value={aprSlider}
                    onChange={(e) => setAprSlider(Number(e.target.value))}
                    style={{ '--fill': `${((aprSlider - 6) / (15 - 6)) * 100}%` } as React.CSSProperties}
                  />
                </div>

                {/* Down Payment */}
                <div className="financing-slider-row">
                  <div className="financing-slider-header">
                    <span className="financing-slider-label">
                      <CircleDollarSign size={14} strokeWidth={1.5} />
                      Down payment
                    </span>
                    <span className="financing-slider-value">{downPaymentPct}%</span>
                  </div>
                  <input
                    type="range"
                    className="financing-slider"
                    min={0}
                    max={50}
                    step={5}
                    value={downPaymentPct}
                    onChange={(e) => setDownPaymentPct(Number(e.target.value))}
                    style={{ '--fill': `${(downPaymentPct / 50) * 100}%` } as React.CSSProperties}
                  />
                </div>
              </div>

              <p className="financing-instruction">
                Adjust the sliders to explore different financing scenarios based on your situation.
              </p>
              <p className="financing-disclaimer">
                Estimates are for illustration only and do not constitute a financing offer. Actual rates and terms depend on lender approval, credit profile, and loan program.
              </p>
              {config.financing_url && (
                <div style={{ marginTop: 'var(--space-lg)' }}>
                  <a
                    href={config.financing_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-primary"
                    style={{ display: 'inline-flex', textDecoration: 'none' }}
                  >
                    Get pre-approved
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* ── Not ready / PDF ── */}
          <div style={{ width: '100%', textAlign: 'center', marginBottom: 'var(--space-2xl)' }}>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginBottom: 'var(--space-md)' }}>
              {copy.results.notReadyHeadline}
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
              <button className="btn-secondary" onClick={handleDownloadPdf}>
                <Download size={16} strokeWidth={1.5} />
                {copy.results.notReadyCta}
              </button>
              <button className="btn-ghost" onClick={handleReset}>
                <RotateCcw size={14} />
                {copy.results.startOver}
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* ── Full-bleed sections ── */}

      {/* Testimonials (hidden for out-of-area) */}
      {!isOutOfServiceArea && copy.testimonials.length > 0 && (
        <section className="page-section bg-off-white">
          <div className="page-section-inner">
            <div className="eyebrow" style={{ justifyContent: 'center' }}>
              {copy.results.testimonialsEyebrow}
            </div>
            <h2 className="headline-section" style={{ marginBottom: 'var(--space-md)' }}>
              {copy.results.testimonialsHeadline}
            </h2>
            <div style={{ marginTop: 'var(--space-xl)' }}>
              <div className="testimonial-grid">
                {copy.testimonials.map((t, i) => (
                  <div key={i} className="testimonial-card">
                    <div className="testimonial-stars">
                      {'★'.repeat(t.rating)}{'☆'.repeat(5 - t.rating)}
                    </div>
                    <p className="testimonial-quote">&ldquo;{t.quote}&rdquo;</p>
                    <div className="testimonial-author">{t.author}</div>
                    {t.location && <div className="testimonial-location">{t.location}</div>}
                  </div>
                ))}
              </div>
            </div>
            <div className="testimonial-google-badge">
              <svg width="16" height="16" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              <span>Verified Google Reviews</span>
            </div>
          </div>
        </section>
      )}

      {/* What happens next (hidden for out-of-area) */}
      {!isOutOfServiceArea && (
        <section className="page-section bg-off-white">
          <div className="page-section-inner">
            <div className="eyebrow" style={{ justifyContent: 'center' }}>
              {copy.results.nextStepsEyebrow}
            </div>
            <h2 className="headline-section" style={{ marginBottom: 'var(--space-2xl)' }}>
              {copy.results.nextStepsHeadline}
            </h2>
            <div className="nst-timeline" ref={timelineRef}>
              {NEXT_STEPS.map((step, i) => {
                const isLeft = i % 2 === 0;
                return (
                  <React.Fragment key={i}>
                    <div className="nst-item">
                      {isLeft ? (
                        <>
                          <div className="nst-content nst-content-left">
                            <h4>{step.title}</h4>
                            <p>{step.desc}</p>
                          </div>
                          <div className="nst-dot">{i + 1}</div>
                          <div className="nst-spacer" />
                        </>
                      ) : (
                        <>
                          <div className="nst-spacer" />
                          <div className="nst-dot">{i + 1}</div>
                          <div className="nst-content nst-content-right">
                            <h4>{step.title}</h4>
                            <p>{step.desc}</p>
                          </div>
                        </>
                      )}
                    </div>
                    {i < NEXT_STEPS.length - 1 && (
                      <div className="nst-connector">
                        <div className="nst-segment" />
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* FAQ (hidden for out-of-area) */}
      {!isOutOfServiceArea && (
        <section className="page-section">
          <div className="page-section-inner">
            <div className="eyebrow" style={{ justifyContent: 'center' }}>
              {copy.results.faqEyebrow}
            </div>
            <h2 className="headline-section" style={{ marginBottom: 'var(--space-xl)' }}>
              {copy.results.faqHeadline}
            </h2>
            <div style={{ maxWidth: 640, margin: '0 auto' }}>
              <FaqAccordion items={copy.faqs} />
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

const NEXT_STEPS = [
  {
    title: 'Review your estimate',
    desc: 'Look over the breakdown above and download a copy for your records.',
  },
  {
    title: 'Free design consultation',
    desc: 'A pool design expert visits your property, refines every detail, and produces a precise quote.',
  },
  {
    title: '3D design & proposal',
    desc: 'We render your pool in 3D so you can visualise it in your yard before a single shovel breaks ground.',
  },
  {
    title: 'Break ground',
    desc: 'Our expert crew handles everything from permits to final inspection — you just show up for the reveal.',
  },
];
