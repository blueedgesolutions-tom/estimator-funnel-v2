'use client';

import { useState, useRef, useCallback } from 'react';
import { CheckCircle, XCircle, Loader } from 'lucide-react';
import { useFunnel } from '../FunnelProvider';
import StepProgress from '../StepProgress';
import { resolveCopy } from '@/lib/copy';
import { calculatePrice } from '@/lib/pricing';
import type { TenantConfig } from '@/lib/types';

interface Props {
  tenant: TenantConfig;
}

type PhoneStatus = 'idle' | 'validating' | 'valid' | 'invalid' | 'api-error';

// Phone formatter: raw digits → (XXX) XXX-XXXX display
function formatPhone(digits: string): string {
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
}

function extractDigits(value: string): string {
  let digits = value.replace(/\D/g, '');
  // Strip leading country code: US +1 produces 11 digits starting with 1
  if (digits.length === 11 && digits.startsWith('1')) {
    digits = digits.slice(1);
  }
  return digits.slice(0, 10);
}

const TOTAL_STEPS = 5;

export default function ContactStep({ tenant }: Props) {
  const { funnelData, updateFunnelData, submitting, submitError, handleSubmit, handleNext, handleBack, bookingEnabled } = useFunnel();
  const copy = resolveCopy(tenant);

  const [name, setName] = useState(funnelData.name ?? '');
  const [email, setEmail] = useState(funnelData.email ?? '');
  const [phoneDigits, setPhoneDigits] = useState(
    funnelData.phone ? extractDigits(funnelData.phone) : ''
  );
  const [phoneDisplay, setPhoneDisplay] = useState(
    funnelData.phone ? formatPhone(extractDigits(funnelData.phone)) : ''
  );
  const [phoneStatus, setPhoneStatus] = useState<PhoneStatus>('idle');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [extraFields, setExtraFields] = useState<Record<string, string | boolean>>(
    funnelData.contactFields ?? {}
  );

  // Cache validated phones to avoid redundant API calls
  const validatedCache = useRef<Map<string, PhoneStatus>>(new Map());

  // ── Phone input handler ──
  function handlePhoneChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digits = extractDigits(e.target.value);
    const display = formatPhone(digits);
    setPhoneDigits(digits);
    setPhoneDisplay(display);
    setPhoneStatus('idle');
  }

  // ── Phone validation on blur ──
  const validatePhone = useCallback(async () => {
    if (phoneDigits.length !== 10) return;
    if (validatedCache.current.has(phoneDigits)) {
      setPhoneStatus(validatedCache.current.get(phoneDigits)!);
      return;
    }

    setPhoneStatus('validating');
    try {
      const res = await fetch('/api/validate-phone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phoneDigits }),
      });
      const data = await res.json();
      const status: PhoneStatus = data.valid ? 'valid' : 'invalid';
      setPhoneStatus(status);
      validatedCache.current.set(phoneDigits, status);
    } catch {
      setPhoneStatus('api-error');
      validatedCache.current.set(phoneDigits, 'api-error');
    }
  }, [phoneDigits]);

  // ── Validate and submit ──
  function validate(): boolean {
    const errors: Record<string, string> = {};
    if (!name.trim()) errors.name = 'Please enter your name.';
    if (!email.trim()) errors.email = 'Please enter your email address.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errors.email = 'Please enter a valid email address.';
    if (phoneDigits.length !== 10) errors.phone = 'Please enter a valid 10-digit phone number.';
    if (phoneStatus === 'invalid') errors.phone = 'This phone number appears to be invalid. Please check and try again.';

    // Custom contact field validation
    for (const field of tenant.config.contactFields ?? []) {
      if (field.required && !extraFields[field.id]) {
        errors[field.id] = `${field.label} is required.`;
      }
      if (field.validation_pattern && extraFields[field.id]) {
        const pattern = new RegExp(field.validation_pattern);
        if (!pattern.test(String(extraFields[field.id]))) {
          errors[field.id] = field.validation_message ?? `Invalid ${field.label}.`;
        }
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    // Gate: phone must be valid or api-error (not invalid)
    if (phoneStatus === 'invalid') return;

    const estimatedPrice = calculatePrice(funnelData, tenant.catalog);
    const finalData = {
      name: name.trim(),
      email: email.trim(),
      phone: phoneDigits,
      contactFields: extraFields,
      estimatedPrice,
    };

    if (bookingEnabled) {
      // Save contact data to context and advance to Booking step.
      // The actual API submission happens when the user confirms or skips booking.
      updateFunnelData(finalData);
      handleNext();
    } else {
      await handleSubmit(finalData);
    }
  }

  const canSubmit =
    name.trim().length > 0 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) &&
    phoneDigits.length === 10 &&
    phoneStatus !== 'invalid' &&
    !submitting;

  return (
    <main className="page-content">
      <div style={{ paddingTop: 'var(--space-xl)', width: '100%' }}>
        <StepProgress current={5} total={TOTAL_STEPS} />

        <div className="eyebrow">{copy.contact.eyebrow}</div>
        <h2 className="headline-display" style={{ marginBottom: 'var(--space-sm)' }}>
          {copy.contact.headline}
        </h2>
        <p className="subheadline" style={{ marginBottom: 'var(--space-xl)' }}>
          {copy.contact.subheadline}
        </p>

        <form onSubmit={handleFormSubmit} noValidate style={{ width: '100%' }}>
          {/* Name */}
          <div className="form-group">
            <label className="form-label">Full name</label>
            <input
              type="text"
              className={`form-input${fieldErrors.name ? ' has-error' : ''}`}
              placeholder="Jane Smith"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
            />
            {fieldErrors.name && (
              <div className="form-error">{fieldErrors.name}</div>
            )}
          </div>

          {/* Email */}
          <div className="form-group">
            <label className="form-label">Email address</label>
            <input
              type="email"
              className={`form-input${fieldErrors.email ? ' has-error' : ''}`}
              placeholder="jane@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
            {fieldErrors.email && (
              <div className="form-error">{fieldErrors.email}</div>
            )}
          </div>

          {/* Phone */}
          <div className="form-group">
            <label className="form-label">Phone number</label>
            <div style={{ position: 'relative' }}>
              <input
                type="tel"
                className={`form-input${fieldErrors.phone ? ' has-error' : ''}`}
                placeholder="(555) 000-0000"
                value={phoneDisplay}
                onChange={handlePhoneChange}
                onBlur={validatePhone}
                autoComplete="tel"
                inputMode="numeric"
              />
              {/* Status icon */}
              <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)' }}>
                {phoneStatus === 'validating' && <Loader size={16} style={{ color: 'var(--text-muted)', animation: 'spin 1s linear infinite' }} />}
                {phoneStatus === 'valid' && <CheckCircle size={16} style={{ color: 'var(--status-success)' }} />}
                {phoneStatus === 'invalid' && <XCircle size={16} style={{ color: 'var(--status-error)' }} />}
                {phoneStatus === 'api-error' && <CheckCircle size={16} style={{ color: 'var(--text-muted)' }} />}
              </div>
            </div>
            {phoneStatus === 'invalid' && (
              <div className="form-error">
                <XCircle size={13} />
                This number doesn&apos;t appear to be valid. Please double-check it.
              </div>
            )}
            {phoneStatus === 'api-error' && (
              <div className="form-hint">We couldn&apos;t verify this number, but you can still continue.</div>
            )}
            {fieldErrors.phone && phoneStatus !== 'invalid' && (
              <div className="form-error">{fieldErrors.phone}</div>
            )}
          </div>

          {/* Extra contact fields */}
          {(tenant.config.contactFields ?? []).map((field) => (
            <div className="form-group" key={field.id}>
              <label className="form-label">{field.label}</label>
              {field.type === 'checkbox' ? (
                <label className="admin-toggle">
                  <input
                    type="checkbox"
                    checked={Boolean(extraFields[field.id])}
                    onChange={(e) => setExtraFields((prev) => ({ ...prev, [field.id]: e.target.checked }))}
                  />
                  <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>{field.label}</span>
                </label>
              ) : field.type === 'select' ? (
                <select
                  className="form-input"
                  value={String(extraFields[field.id] ?? '')}
                  onChange={(e) => setExtraFields((prev) => ({ ...prev, [field.id]: e.target.value }))}
                >
                  <option value="">Select…</option>
                  {(field.options ?? []).map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              ) : (
                <input
                  type={field.type}
                  className={`form-input${fieldErrors[field.id] ? ' has-error' : ''}`}
                  placeholder={field.placeholder}
                  value={String(extraFields[field.id] ?? '')}
                  onChange={(e) => setExtraFields((prev) => ({ ...prev, [field.id]: e.target.value }))}
                />
              )}
              {fieldErrors[field.id] && (
                <div className="form-error">{fieldErrors[field.id]}</div>
              )}
            </div>
          ))}

          {/* Submit error */}
          {submitError && (
            <div className="status-banner error" style={{ marginBottom: 'var(--space-md)' }}>
              {submitError}
            </div>
          )}

          {/* Consent */}
          <p style={{
            fontSize: 'var(--text-xs)',
            color: 'var(--text-muted)',
            lineHeight: 1.6,
            marginBottom: 'var(--space-xl)',
          }}>
            {copy.contact.consent}{' '}
            <a href={tenant.config.privacy_policy_url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'underline' }}>
              Privacy policy
            </a>.
          </p>

          <div className="step-nav">
            <button type="button" className="btn-ghost" onClick={handleBack}>← Back</button>
            <button
              type="submit"
              className="btn-primary"
              disabled={!canSubmit}
            >
              {submitting ? 'Submitting…' : bookingEnabled ? 'Continue' : 'Get my estimate'}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}

