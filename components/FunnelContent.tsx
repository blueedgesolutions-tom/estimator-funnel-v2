'use client';

import { useFunnel } from './FunnelProvider';
import type { TenantConfig } from '@/lib/types';

import IntroStep from './steps/IntroStep';
import PoolModelStep from './steps/PoolModelStep';
import OptionsStep from './steps/OptionsStep';
import TimelineStep from './steps/TimelineStep';
import AddressStep from './steps/AddressStep';
import ContactStep from './steps/ContactStep';
import BookingStep from './steps/BookingStep';
import ResultsStep from './steps/ResultsStep';

interface FunnelContentProps {
  tenant: TenantConfig;
}

export default function FunnelContent({ tenant }: FunnelContentProps) {
  const { step, hydrated, bookingEnabled } = useFunnel();

  // Show nothing until localStorage is hydrated to avoid SSR/client mismatch
  if (!hydrated) {
    return (
      <main className="page-content">
        <div style={{ paddingTop: 'var(--space-2xl)' }} />
      </main>
    );
  }

  // Step index mapping differs based on whether the booking step is active
  // With booking:    0 Intro | 1 PoolModel | 2 Options | 3 Timeline | 4 Address | 5 Contact | 6 Booking | 7 Results
  // Without booking: 0 Intro | 1 PoolModel | 2 Options | 3 Timeline | 4 Address | 5 Contact | 6 Results
  const maxStep = bookingEnabled ? 7 : 6;
  const currentStep = Math.min(step, maxStep);

  if (currentStep === 0) return <IntroStep tenant={tenant} />;
  if (currentStep === 1) return <PoolModelStep tenant={tenant} />;
  if (currentStep === 2) return <OptionsStep tenant={tenant} />;
  if (currentStep === 3) return <TimelineStep tenant={tenant} />;
  if (currentStep === 4) return <AddressStep tenant={tenant} />;
  if (currentStep === 5) return <ContactStep tenant={tenant} />;
  if (currentStep === 6 && bookingEnabled) return <BookingStep tenant={tenant} />;
  return <ResultsStep tenant={tenant} />;
}
