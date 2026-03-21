'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { v4 as uuidv4 } from 'uuid';
import { initPostHog, posthog, trackConversion } from '@/lib/posthog';
import type { FunnelData } from '@/lib/types';

// ─────────────────────────────────────────────────────────
// CONTEXT SHAPE
// ─────────────────────────────────────────────────────────

interface FunnelContextValue {
  funnelData: FunnelData;
  updateFunnelData: (partial: Partial<FunnelData>) => void;
  setImageFile: (file: File | null) => void;

  step: number;
  handleNext: (targetStep?: number) => void;
  handleBack: () => void;

  submitting: boolean;
  submitError: string | null;
  handleSubmit: (finalData: Partial<FunnelData>) => Promise<void>;
  handleBookingConfirm: (bookingDate: string, bookingTimeSlot: 'morning' | 'afternoon') => Promise<void>;
  handleBookingSkip: () => void;
  handleOutOfAreaSubmit: (finalData: Partial<FunnelData>) => void;
  handleReset: () => void;

  hydrated: boolean;

  // Tenant context (passed from layout, used by client components)
  bookingEnabled: boolean;
  brandName: string;
  companyName: string;
  privacyPolicyUrl: string;
  tenantId: string;
}

const FunnelContext = createContext<FunnelContextValue | null>(null);

// ─────────────────────────────────────────────────────────
// STORAGE KEY
// ─────────────────────────────────────────────────────────

const STORAGE_KEY = 'funnel_state';

function loadFromStorage(): Partial<FunnelData> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function saveToStorage(data: FunnelData) {
  // Never serialise the File object
  const { imageFile: _, ...persistable } = data;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(persistable));
  } catch {
    // localStorage full or blocked — silent fail
  }
}

// ─────────────────────────────────────────────────────────
// PROVIDER
// ─────────────────────────────────────────────────────────

interface FunnelProviderProps {
  children: React.ReactNode;
  tenantId: string;
  brandName: string;
  companyName: string;
  privacyPolicyUrl: string;
  bookingEnabled: boolean;
}

export default function FunnelProvider({
  children,
  tenantId,
  brandName,
  companyName,
  privacyPolicyUrl,
  bookingEnabled,
}: FunnelProviderProps) {
  const [funnelData, setFunnelData] = useState<FunnelData>({});
  const [step, setStep] = useState(0);
  const [hydrated, setHydrated] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Track previous pathname for SPA pageview events
  const prevStep = useRef<number>(-1);
  // Skip scroll on the first render after hydration
  const didNavigate = useRef(false);

  // ── Hydration: restore from localStorage on mount ──
  useEffect(() => {
    const stored = loadFromStorage();
    if (stored && Object.keys(stored).length > 0) {
      setFunnelData(stored as FunnelData);
      if ((stored as FunnelData).submitted) {
        // Returning user — jump straight to results
        setStep(bookingEnabled ? 7 : 6);
      }
    }

    // Ensure a session ID exists
    if (!(stored as FunnelData).sessionId) {
      setFunnelData((prev) => ({ ...prev, sessionId: uuidv4() }));
    }

    initPostHog(tenantId);
    setHydrated(true);
  }, [tenantId, bookingEnabled]);

  // ── Persist on every change ──
  useEffect(() => {
    if (hydrated) {
      saveToStorage(funnelData);
    }
  }, [funnelData, hydrated]);

  // ── Pageview tracking on step change ──
  useEffect(() => {
    if (!hydrated) return;
    if (step === prevStep.current) return;
    prevStep.current = step;
    posthog?.capture('funnel_step_view', { step, tenant_id: tenantId });
  }, [step, hydrated, tenantId]);

  // ── Smooth scroll to top on every step navigation ──
  useEffect(() => {
    if (!hydrated) return;
    if (!didNavigate.current) {
      didNavigate.current = true;
      return;
    }
    import('gsap').then(({ gsap }) => {
      gsap.to(document.scrollingElement ?? document.documentElement, {
        scrollTop: 0,
        duration: 0.7,
        ease: 'power2.inOut',
      });
    });
  }, [step, hydrated]);

  // ─────────────────────────────────────────────────────
  // ACTIONS
  // ─────────────────────────────────────────────────────

  const updateFunnelData = useCallback((partial: Partial<FunnelData>) => {
    setFunnelData((prev) => ({ ...prev, ...partial }));
  }, []);

  const setImageFile = useCallback((file: File | null) => {
    setFunnelData((prev) => ({ ...prev, imageFile: file ?? undefined }));
  }, []);

  const handleNext = useCallback((targetStep?: number) => {
    setStep((s) => targetStep ?? s + 1);
  }, []);

  const handleBack = useCallback(() => {
    setStep((s) => Math.max(s - 1, 0));
  }, []);

  const handleReset = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setFunnelData({});
    setStep(0);
    setSubmitError(null);
  }, []);

  // ── Booking confirmation: fires booking webhook then advances to Results ──
  const handleBookingConfirm = useCallback(
    async (bookingDate: string, bookingTimeSlot: 'morning' | 'afternoon') => {
      const merged: FunnelData = {
        ...funnelData,
        bookingDate,
        bookingTimeSlot,
        bookingCompleted: true,
      };
      setFunnelData(merged);
      saveToStorage(merged);

      try {
        await fetch('/api/consultation-request', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: merged.name ?? '',
            phone: merged.phone ?? '',
            date: bookingDate,
            timeSlot: bookingTimeSlot,
            estimatedPrice: merged.estimatedPrice ?? 0,
            tenantId,
          }),
          signal: AbortSignal.timeout(8000),
        });
      } catch (err) {
        console.error('[booking] Consultation request error:', err);
        // Non-fatal
      }

      posthog?.capture('booking_confirmed', {
        tenant_id: tenantId,
        booking_date: bookingDate,
      });

      setStep(7);
    },
    [funnelData, tenantId]
  );

  // ── Booking skipped: store state and advance to Results ──
  const handleBookingSkip = useCallback(() => {
    const merged: FunnelData = { ...funnelData, bookingCompleted: false };
    setFunnelData(merged);
    saveToStorage(merged);
    setStep(7);
  }, [funnelData]);

  // ── Out-of-area shortcut: store locally, skip CRM ──
  const handleOutOfAreaSubmit = useCallback(
    (finalData: Partial<FunnelData>) => {
      const merged: FunnelData = {
        ...funnelData,
        ...finalData,
        isOutOfServiceArea: true,
        submitted: true,
        submittedAt: new Date().toISOString(),
      };
      setFunnelData(merged);
      saveToStorage(merged);
      // Jump to Results
      setStep(bookingEnabled ? 7 : 6);
    },
    [funnelData, bookingEnabled]
  );

  // ── Main submit: CRM webhook + conversion pixels ──
  const handleSubmit = useCallback(
    async (finalData: Partial<FunnelData>) => {
      setSubmitting(true);
      setSubmitError(null);

      const merged: FunnelData = {
        ...funnelData,
        ...finalData,
        submitted: true,
        submittedAt: new Date().toISOString(),
      };

      setFunnelData(merged);
      saveToStorage(merged);

      try {
        const res = await fetch('/api/submit-lead', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ funnelData: merged, tenantId }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.message ?? 'Submission failed');
        }

        // Fire conversion pixels
        trackConversion('Lead', 'conversion', {
          value: merged.estimatedPrice,
          currency: 'USD',
        });

        posthog?.capture('funnel_submitted', {
          tenant_id: tenantId,
          estimated_price: merged.estimatedPrice,
          pool_model: merged.poolModel,
          has_booking: merged.bookingCompleted,
        });

        // Navigate to Booking step (if enabled) or Results
        setStep(6);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
        setSubmitError(message);
        posthog?.capture('funnel_submit_error', { error: message, tenant_id: tenantId });
      } finally {
        setSubmitting(false);
      }
    },
    [funnelData, tenantId, bookingEnabled]
  );

  // ─────────────────────────────────────────────────────
  // CONTEXT VALUE
  // ─────────────────────────────────────────────────────

  const value = useMemo<FunnelContextValue>(
    () => ({
      funnelData,
      updateFunnelData,
      setImageFile,
      step,
      handleNext,
      handleBack,
      submitting,
      submitError,
      handleSubmit,
      handleBookingConfirm,
      handleBookingSkip,
      handleOutOfAreaSubmit,
      handleReset,
      hydrated,
      bookingEnabled,
      brandName,
      companyName,
      privacyPolicyUrl,
      tenantId,
    }),
    [
      funnelData, updateFunnelData, setImageFile,
      step, handleNext, handleBack,
      submitting, submitError, handleSubmit, handleBookingConfirm, handleBookingSkip, handleOutOfAreaSubmit, handleReset,
      hydrated, bookingEnabled, brandName, companyName, privacyPolicyUrl, tenantId,
    ]
  );

  return (
    <FunnelContext.Provider value={value}>
      {children}
    </FunnelContext.Provider>
  );
}

// ─────────────────────────────────────────────────────────
// HOOK
// ─────────────────────────────────────────────────────────

export function useFunnel(): FunnelContextValue {
  const ctx = useContext(FunnelContext);
  if (!ctx) throw new Error('useFunnel must be used inside <FunnelProvider>');
  return ctx;
}
