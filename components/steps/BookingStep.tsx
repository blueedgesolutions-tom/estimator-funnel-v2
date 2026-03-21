'use client';

import { useState } from 'react';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/style.css';
import { format, addDays, startOfDay, isWeekend } from 'date-fns';
import { Sunrise, Sun } from 'lucide-react';
import { useFunnel } from '../FunnelProvider';
import { resolveCopy } from '@/lib/copy';
import type { TenantConfig } from '@/lib/types';

interface Props {
  tenant: TenantConfig;
}

function getAvailableWeekdays(count: number): Date[] {
  const days: Date[] = [];
  // Block today and tomorrow as calendar dates (not 48 real hours)
  let cursor = addDays(startOfDay(new Date()), 2);
  while (days.length < count) {
    if (!isWeekend(cursor)) {
      days.push(new Date(cursor));
    }
    cursor = addDays(cursor, 1);
  }
  return days;
}

export default function BookingStep({ tenant }: Props) {
  const {
    funnelData,
    handleBookingConfirm,
    handleBookingSkip,
    handleBack,
    bookingEnabled,
  } = useFunnel();

  const [loading, setLoading] = useState(false);
  const [bookingError, setBookingError] = useState('');
  const copy = resolveCopy(tenant);
  const { bookingSkipEnabled, consultationDaysAhead = 21 } = tenant.estimate;

  const availableDays = getAvailableWeekdays(consultationDaysAhead);
  const disabledDays = { before: availableDays[0], after: availableDays[availableDays.length - 1] };

  const [selectedDay, setSelectedDay] = useState<Date | undefined>(
    funnelData.bookingDate ? new Date(funnelData.bookingDate) : undefined
  );
  const [timeSlot, setTimeSlot] = useState<'morning' | 'afternoon' | ''>(
    funnelData.bookingTimeSlot ?? ''
  );

  // Disable days that are weekends or outside available range
  function isDayDisabled(day: Date): boolean {
    return isWeekend(day) || !availableDays.some(
      (d) => d.toDateString() === day.toDateString()
    );
  }

  async function handleConfirm() {
    if (!selectedDay || !timeSlot) return;
    setLoading(true);
    setBookingError('');
    try {
      await handleBookingConfirm(format(selectedDay, 'yyyy-MM-dd'), timeSlot);
    } catch {
      setBookingError('Something went wrong. Please try again or skip to continue.');
      setLoading(false);
    }
  }

  function handleSkip() {
    handleBookingSkip();
  }

  const canConfirm = selectedDay !== undefined && timeSlot !== '' && !loading;

  if (!bookingEnabled) return null;

  return (
    <main className="page-content">
      <div style={{ paddingTop: 'var(--space-xl)', width: '100%' }}>
        <div className="eyebrow">{copy.booking.eyebrow}</div>
        <h2 className="headline-display" style={{ marginBottom: 'var(--space-sm)' }}>
          {copy.booking.headline}
        </h2>
        <p className="subheadline" style={{ marginBottom: 'var(--space-xl)' }}>
          {copy.booking.subheadline}
        </p>

        {/* Calendar */}
        <div style={{
          background: 'var(--canvas-off-white)',
          border: '1px solid var(--canvas-border)',
          borderRadius: 'var(--radius-xl)',
          padding: 'var(--space-lg)',
          marginBottom: 'var(--space-md)',
          width: '100%',
          display: 'flex',
          justifyContent: 'center',
        }}>
          <DayPicker
            mode="single"
            selected={selectedDay}
            onSelect={setSelectedDay}
            disabled={isDayDisabled}
            fromDate={availableDays[0]}
            toDate={availableDays[availableDays.length - 1]}
            showOutsideDays={false}
          />
        </div>

        {/* Time slot */}
        <div style={{ width: '100%', marginBottom: 'var(--space-xl)' }}>
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
                className={`time-slot-card${timeSlot === value ? ' selected' : ''}`}
                onClick={() => setTimeSlot(value)}
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

        {/* Selected summary */}
        {selectedDay && timeSlot && (
          <div className="status-banner success" style={{ marginBottom: 'var(--space-md)' }}>
            <div>
              <strong>{format(selectedDay, 'EEEE, MMMM d')}</strong>
              {' · '}
              {timeSlot === 'morning' ? 'Morning (9am–12pm)' : 'Afternoon (1pm–5pm)'}
            </div>
          </div>
        )}

        {bookingError && (
          <div className="status-banner error" style={{ marginBottom: 'var(--space-md)' }}>
            {bookingError}
          </div>
        )}

        {/* Navigation */}
        <div className="step-nav">
          <button className="btn-ghost" onClick={handleBack}>← Back</button>
          <div style={{ display: 'flex', gap: 'var(--space-md)', alignItems: 'center' }}>
            {bookingSkipEnabled && (
              <button
                className="btn-ghost"
                onClick={handleSkip}
                disabled={loading}
              >
                {copy.booking.skipCta}
              </button>
            )}
            <button
              className="btn-primary"
              onClick={handleConfirm}
              disabled={!canConfirm}
            >
              {loading ? 'Confirming…' : copy.booking.confirmCta}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
