'use client';

import { useState, useCallback, useRef } from 'react';
import { Check, Copy, ChevronDown, ChevronUp, Download } from 'lucide-react';
import { resolveTheme } from '@/lib/theme';
import { DEFAULT_COPY_TEMPLATES } from '@/lib/copy';
import type { TenantConfig, RawTenantConfig, TenantCopy, PoolModel } from '@/lib/types';
import AssetUploader from './AssetUploader';

interface Props {
  tenant: TenantConfig;
  tenantId: string;
}

// ─────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────

function Field({
  label,
  id,
  value,
  onChange,
  type = 'text',
  placeholder,
  hint,
  fullWidth,
}: {
  label: string;
  id: string;
  value: string | number;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  hint?: string;
  fullWidth?: boolean;
}) {
  return (
    <div className={`form-group${fullWidth ? ' admin-field-full' : ''}`}>
      <label className="form-label" htmlFor={id}>{label}</label>
      <input
        id={id}
        type={type}
        className="form-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
      {hint && <div className="form-hint">{hint}</div>}
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
  hint,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  hint?: string;
}) {
  return (
    <div className="form-group">
      <label className="admin-toggle">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span style={{ fontSize: 'var(--text-sm)', fontWeight: 500 }}>{label}</span>
      </label>
      {hint && <div className="form-hint">{hint}</div>}
    </div>
  );
}

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="admin-card">
      <div className="admin-card-title">{title}</div>
      {children}
    </div>
  );
}

function CollapsibleCard({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="admin-card">
      <button
        className="admin-section-toggle"
        onClick={() => setOpen((o) => !o)}
        style={{ paddingTop: 0, borderTop: 'none', marginTop: 0, fontWeight: 600, fontSize: 'var(--text-md)', color: 'var(--text-primary)' }}
      >
        {title}
        {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </button>
      {open && children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// MAIN ADMIN EDITOR
// ─────────────────────────────────────────────────────────

export default function AdminEditor({ tenant, tenantId }: Props) {
  const cfg = tenant.config;
  const est = tenant.estimate;
  const sa = est.serviceArea;

  // ── Brand & Identity ──
  const [brandName, setBrandName] = useState(cfg.brand_name);
  const [companyName, setCompanyName] = useState(cfg.company_name);
  const [city, setCity] = useState(cfg.city);
  const [area, setArea] = useState(cfg.area ?? '');
  const [logoUrl, setLogoUrl] = useState(cfg.logo_url);
  const [logoHeight, setLogoHeight] = useState(String(cfg.logo_height ?? ''));

  // ── Contact & Integrations ──
  const [phone, setPhone] = useState(cfg.contact_phone);
  const [email, setEmail] = useState(cfg.contact_email);
  const [privacyUrl, setPrivacyUrl] = useState(cfg.privacy_policy_url);
  const [stateLicense, setStateLicense] = useState(cfg.state_license ?? '');
  const [financingUrl, setFinancingUrl] = useState(cfg.financing_url ?? '');
  const [ghlWebhook, setGhlWebhook] = useState(cfg.ghl_webhook_url);
  const [ghlBookingWebhook, setGhlBookingWebhook] = useState(cfg.ghl_booking_webhook_url ?? '');
  const [gtagId, setGtagId] = useState(cfg.gtag_id ?? '');
  const [fbPixelId, setFbPixelId] = useState(cfg.fb_pixel_id ?? '');
  const [resendFrom, setResendFrom] = useState(cfg.resend_from ?? '');

  // ── Theme ──
  const [primaryColor, setPrimaryColor] = useState(cfg.theme.primary);
  const previewTheme = resolveTheme({ primary: primaryColor });

  // ── Service area ──
  const [serviceAreaEnabled, setServiceAreaEnabled] = useState(sa.enabled);
  const [serviceAreaLat, setServiceAreaLat] = useState(String(sa.lat));
  const [serviceAreaLng, setServiceAreaLng] = useState(String(sa.lng));
  const [serviceAreaRadius, setServiceAreaRadius] = useState(String(sa.radiusMiles));
  const [serviceAreaStrict, setServiceAreaStrict] = useState(sa.strictMode);
  const [serviceAreaWarning, setServiceAreaWarning] = useState(sa.warningMessage);
  const [blockedZips, setBlockedZips] = useState((sa.blockedZips ?? []).join(', '));
  const [blockedStates, setBlockedStates] = useState((sa.blockedStates ?? []).join(', '));

  // ── Service area center autocomplete ──
  const [saQuery, setSaQuery] = useState('');
  const [saPredictions, setSaPredictions] = useState<{ place_id: string; description: string; main_text: string; secondary_text: string }[]>([]);
  const [saLoadingPredictions, setSaLoadingPredictions] = useState(false);
  const [saLoadingGeocode, setSaLoadingGeocode] = useState(false);
  const saDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchSaPredictions = useCallback(async (input: string) => {
    if (input.length < 3) { setSaPredictions([]); return; }
    setSaLoadingPredictions(true);
    try {
      const res = await fetch(`/api/places-autocomplete?input=${encodeURIComponent(input)}`);
      const data = await res.json();
      setSaPredictions(data.predictions ?? []);
    } catch {
      setSaPredictions([]);
    } finally {
      setSaLoadingPredictions(false);
    }
  }, []);

  function handleSaQueryChange(value: string) {
    setSaQuery(value);
    if (saDebounceRef.current) clearTimeout(saDebounceRef.current);
    saDebounceRef.current = setTimeout(() => fetchSaPredictions(value), 500);
  }

  async function selectSaPrediction(prediction: { place_id: string; description: string }) {
    setSaQuery(prediction.description);
    setSaPredictions([]);
    setSaLoadingGeocode(true);
    try {
      const res = await fetch(`/api/geocode-place?place_id=${encodeURIComponent(prediction.place_id)}`);
      const data = await res.json();
      if (data.address?.lat != null) setServiceAreaLat(String(data.address.lat));
      if (data.address?.lng != null) setServiceAreaLng(String(data.address.lng));
    } finally {
      setSaLoadingGeocode(false);
    }
  }
  const [blockedCounties, setBlockedCounties] = useState((sa.blockedCounties ?? []).join(', '));

  // ── Booking ──
  const [bookingEnabled, setBookingEnabled] = useState(est.bookingEnabled);
  const [bookingSkipEnabled, setBookingSkipEnabled] = useState(est.bookingSkipEnabled ?? true);
  const [consultDays, setConsultDays] = useState(String(est.consultationDaysAhead ?? 21));
  const [financingApr, setFinancingApr] = useState(String(est.financingApr ?? 8.99));
  const [financingTerm, setFinancingTerm] = useState(String(est.financingTermYears ?? 10));

  // ── Copy overrides ──
  // Flat map of key → override value. Only non-empty strings are saved.
  const [copyOverrides, setCopyOverrides] = useState<TenantCopy>(tenant.copy ?? {});

  function setCopyOverride(key: string, value: string) {
    setCopyOverrides((prev) => ({ ...prev, [key]: value }));
  }

  // ── Catalog pricing ──
  const [poolModelPrices, setPoolModelPrices] = useState<Record<string, string>>(
    Object.fromEntries(
      tenant.catalog.poolModels.map((m) => [m.id, String(m.basePrice)])
    )
  );
  const [optionPrices, setOptionPrices] = useState<Record<string, string>>(
    Object.fromEntries(
      tenant.catalog.equipmentOptions.map((o) => [o.id, String(o.price)])
    )
  );
  const [optionEnabled, setOptionEnabled] = useState<Record<string, boolean>>(
    Object.fromEntries(
      tenant.catalog.equipmentOptions.map((o) => [o.id, o.enabled !== false])
    )
  );
  const [deckingPrices, setDeckingPrices] = useState<Record<string, string>>(
    Object.fromEntries(
      tenant.catalog.deckingOptions.map((d) => [d.id, String(d.pricePerSqft)])
    )
  );
  const [poolModelEnabled, setPoolModelEnabled] = useState<Record<string, boolean>>(
    Object.fromEntries(tenant.catalog.poolModels.map((m) => [m.id, m.enabled !== false]))
  );
  // Fiberglass (custom) models — state-driven so import can add new ones
  const [customModels, setCustomModels] = useState<PoolModel[]>(
    tenant.catalog.poolModels.filter((m) => !!m.manufacturer)
  );
  const [deckingEnabled, setDeckingEnabled] = useState<Record<string, boolean>>(
    Object.fromEntries(tenant.catalog.deckingOptions.map((d) => [d.id, d.enabled !== false]))
  );
  const [optionDynamic, setOptionDynamic] = useState<Record<string, boolean>>(
    Object.fromEntries(
      tenant.catalog.equipmentOptions.map((o) => [o.id, o.dynamicPricing ?? false])
    )
  );
  const [optionFormulas, setOptionFormulas] = useState<Record<string, string>>(
    Object.fromEntries(
      tenant.catalog.equipmentOptions
        .filter((o) => o.dynamicPricing && o.pricing_formula)
        .map((o) => [o.id, o.pricing_formula ?? ''])
    )
  );

  // ── Intake import ──
  const [importStatus, setImportStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [importMeta, setImportMeta] = useState<{ brandName: string; submittedAt: string } | null>(null);

  async function handleImportIntake() {
    setImportStatus('loading');
    try {
      const res = await fetch('/api/intake-import');
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message ?? 'Import failed');
      }
      const data = await res.json();
      const { catalog } = data;

      // Apply pool model prices and enabled state
      if (catalog.poolModels) {
        setPoolModelPrices((prev) => {
          const next = { ...prev };
          for (const m of catalog.poolModels) {
            if (m.id in next) next[m.id] = String(m.basePrice);
          }
          return next;
        });
        setPoolModelEnabled((prev) => {
          const next = { ...prev };
          for (const m of catalog.poolModels) {
            if (m.id in next) next[m.id] = m.enabled !== false;
          }
          return next;
        });
      }

      // Apply fiberglass (custom) model prices, enabled state, and model list
      if (catalog.customPoolModels && catalog.customPoolModels.length > 0) {
        setCustomModels(catalog.customPoolModels as PoolModel[]);
        setPoolModelPrices((prev) => {
          const next = { ...prev };
          for (const m of catalog.customPoolModels) {
            next[m.id] = String(m.basePrice);
          }
          return next;
        });
        setPoolModelEnabled((prev) => {
          const next = { ...prev };
          for (const m of catalog.customPoolModels) {
            next[m.id] = m.enabled !== false;
          }
          return next;
        });
      }

      // Apply equipment prices and enabled states
      if (catalog.equipmentOptions) {
        setOptionPrices((prev) => {
          const next = { ...prev };
          for (const o of catalog.equipmentOptions) {
            if (o.id in next) next[o.id] = String(o.price);
          }
          return next;
        });
        setOptionEnabled((prev) => {
          const next = { ...prev };
          for (const o of catalog.equipmentOptions) {
            if (o.id in next) next[o.id] = o.enabled !== false;
          }
          return next;
        });
      }

      // Apply decking prices and enabled state
      if (catalog.deckingOptions) {
        setDeckingPrices((prev) => {
          const next = { ...prev };
          for (const d of catalog.deckingOptions) {
            if (d.id in next) next[d.id] = String(d.pricePerSqft);
          }
          return next;
        });
        setDeckingEnabled((prev) => {
          const next = { ...prev };
          for (const d of catalog.deckingOptions) {
            if (d.id in next) next[d.id] = d.enabled !== false;
          }
          return next;
        });
      }

      setImportMeta({ brandName: data.brandName, submittedAt: data.submittedAt });
      setImportStatus('success');
    } catch (err) {
      console.error('[admin] Intake import error:', err);
      setImportStatus('error');
    }
  }

  // ── Copy / validation / clipboard ──
  const [copied, setCopied] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const validate = useCallback((): string[] => {
    const errors: string[] = [];
    if (!brandName.trim()) errors.push('Brand name is required.');
    if (!companyName.trim()) errors.push('Company name is required.');
    if (!city.trim()) errors.push('City is required (used in copy tokens).');
    if (!phone.trim()) errors.push('Contact phone is required.');
    if (!email.trim()) errors.push('Contact email is required.');
    if (!privacyUrl.trim()) errors.push('Privacy policy URL is required.');
    if (!ghlWebhook.trim()) errors.push('GHL webhook URL is required for lead submission.');
    if (!primaryColor.match(/^#[0-9a-fA-F]{6}$/)) errors.push('Primary color must be a valid 6-digit hex (e.g. #1B6CA8).');
    if (serviceAreaEnabled) {
      if (!serviceAreaLat || isNaN(parseFloat(serviceAreaLat))) errors.push('Service area: valid latitude required.');
      if (!serviceAreaLng || isNaN(parseFloat(serviceAreaLng))) errors.push('Service area: valid longitude required.');
      if (!serviceAreaRadius || isNaN(parseFloat(serviceAreaRadius))) errors.push('Service area: valid radius required.');
    }
    return errors;
  }, [brandName, companyName, city, phone, email, privacyUrl, ghlWebhook, primaryColor, serviceAreaEnabled, serviceAreaLat, serviceAreaLng, serviceAreaRadius]);

  function buildConfig(): RawTenantConfig {
    // Build a clean copy overrides object — exclude empty strings
    const cleanCopy: TenantCopy = {};
    for (const [k, v] of Object.entries(copyOverrides)) {
      if (v && v.trim()) cleanCopy[k] = v.trim();
    }

    return {
      version: tenant.version,
      config: {
        brand_name:            brandName.trim(),
        company_name:          companyName.trim(),
        city:                  city.trim(),
        area:                  area.trim() || undefined,
        contact_phone:         phone.trim(),
        contact_email:         email.trim(),
        logo_url:              logoUrl.trim(),
        logo_height:           logoHeight ? parseInt(logoHeight) : undefined,
        privacy_policy_url:    privacyUrl.trim(),
        ghl_webhook_url:       ghlWebhook.trim(),
        ghl_booking_webhook_url: ghlBookingWebhook.trim() || undefined,
        gtag_id:               gtagId.trim() || undefined,
        fb_pixel_id:           fbPixelId.trim() || undefined,
        resend_from:           resendFrom.trim() || undefined,
        state_license:         stateLicense.trim() || undefined,
        financing_url:         financingUrl.trim() || undefined,
        theme: {
          primary: primaryColor,
        },
        testimonials:  cfg.testimonials,
        faqs:          cfg.faqs,
        contactFields: cfg.contactFields,
      },
      catalog: {
        poolModels: tenant.catalog.poolModels
          .filter((m) => !m.manufacturer)
          .map((m) => ({
            id: m.id,
            basePrice: parseInt(poolModelPrices[m.id] ?? String(m.basePrice)) || m.basePrice,
            enabled: poolModelEnabled[m.id] !== false ? undefined : false,
          })),
        customPoolModels: customModels.length > 0
          ? customModels.map((m) => ({
              ...m,
              basePrice: parseInt(poolModelPrices[m.id] ?? String(m.basePrice)) || m.basePrice,
              enabled: poolModelEnabled[m.id] !== false ? undefined : false,
            }))
          : undefined,
        equipmentOptions: tenant.catalog.equipmentOptions.map((o) => ({
          id: o.id,
          price: parseInt(optionPrices[o.id] ?? String(o.price)) || o.price,
          enabled: optionEnabled[o.id] !== false ? undefined : false,
          ...(optionDynamic[o.id] ? { dynamicPricing: true, pricing_formula: optionFormulas[o.id] ?? '' } : { dynamicPricing: false }),
        })),
        deckingOptions: tenant.catalog.deckingOptions.map((d) => ({
          id: d.id,
          pricePerSqft: parseFloat(deckingPrices[d.id] ?? String(d.pricePerSqft)) || d.pricePerSqft,
          enabled: deckingEnabled[d.id] !== false ? undefined : false,
        })),
      },
      estimate: {
        serviceArea: {
          enabled:        serviceAreaEnabled,
          lat:            parseFloat(serviceAreaLat) || 0,
          lng:            parseFloat(serviceAreaLng) || 0,
          radiusMiles:    parseFloat(serviceAreaRadius) || 50,
          warningMessage: serviceAreaWarning,
          strictMode:     serviceAreaStrict,
          blockedZips:    blockedZips.split(',').map((s) => s.trim()).filter(Boolean),
          blockedStates:  blockedStates.split(',').map((s) => s.trim()).filter(Boolean),
          blockedCounties: blockedCounties.split(',').map((s) => s.trim()).filter(Boolean),
        },
        bookingEnabled,
        bookingSkipEnabled,
        consultationDaysAhead: parseInt(consultDays) || 21,
        financingApr:          parseFloat(financingApr) || 8.99,
        financingTermYears:    parseInt(financingTerm) || 10,
      },
      copy: Object.keys(cleanCopy).length > 0 ? cleanCopy : undefined,
    };
  }

  async function handleCopy() {
    const errors = validate();
    if (errors.length > 0) {
      setValidationErrors(errors);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setValidationErrors([]);

    const config = buildConfig();
    const json = JSON.stringify(config, null, 2);

    try {
      await navigator.clipboard.writeText(json);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      // Fallback: open in a new window
      const w = window.open('', '_blank');
      if (w) {
        w.document.write(`<pre style="font-family:monospace;font-size:13px;padding:16px">${json.replace(/</g, '&lt;')}</pre>`);
      }
    }
  }

  // ── Copy key groups for the overrides section ──
  const COPY_GROUPS: Array<{ label: string; keys: string[] }> = [
    {
      label: 'Intro page',
      keys: ['intro.eyebrow', 'intro.headline', 'intro.subheadline', 'intro.cta', 'intro.trust1', 'intro.trust2', 'intro.trust3'],
    },
    {
      label: 'Pool Model step',
      keys: ['poolModel.headline', 'poolModel.subheadline'],
    },
    {
      label: 'Options step',
      keys: ['options.headline', 'options.subheadline'],
    },
    {
      label: 'Contact step',
      keys: ['contact.headline', 'contact.subheadline', 'contact.consent'],
    },
    {
      label: 'Booking step',
      keys: ['booking.headline', 'booking.subheadline'],
    },
    {
      label: 'Results page',
      keys: [
        'results.ctaHeadline', 'results.ctaSubheadline', 'results.ctaButton',
        'results.testimonialsHeadline', 'results.faqHeadline', 'results.nextStepsHeadline',
        'results.notReadyHeadline',
      ],
    },
  ];

  return (
    <div className="admin-wrapper">
      {/* Header */}
      <div className="admin-header">
        <div>
          <div className="admin-header-title">Tenant Configuration</div>
          <div className="admin-header-tenant" style={{ marginTop: 4 }}>
            Editing: <strong style={{ color: 'var(--text-primary)' }}>{tenantId}</strong>
            <span style={{ marginLeft: 8, color: 'var(--text-muted)' }}>·</span>
            <span style={{ color: 'var(--text-muted)', marginLeft: 8 }}>
              Copy JSON → paste into Vercel Edge Config
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
          {copied && (
            <div className="admin-copy-success">
              <Check size={14} /> Copied to clipboard!
            </div>
          )}
          <button className="btn-primary" onClick={handleCopy}>
            <Copy size={16} strokeWidth={2} />
            Copy JSON
          </button>
        </div>
      </div>

      <div className="admin-body">

        {/* Validation errors */}
        {validationErrors.length > 0 && (
          <div className="status-banner error">
            <div>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>Please fix the following before copying:</div>
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                {validationErrors.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            </div>
          </div>
        )}

        {/* Brand & Identity */}
        <SectionCard title="Brand & Identity">
          <div className="admin-field-grid">
            <Field label="Brand name" id="brand_name" value={brandName} onChange={setBrandName}
              placeholder="AquaDreams" hint="Short name used in page titles and copy templates" />
            <Field label="Company name" id="company_name" value={companyName} onChange={setCompanyName}
              placeholder="AquaDreams Pool & Spa" />
            <Field label="City" id="city" value={city} onChange={setCity}
              placeholder="Austin" hint="Used in {{city}} copy tokens" />
            <Field label="Service area" id="area" value={area} onChange={setArea}
              placeholder="Central Texas" hint="Used in {{area}} copy tokens (broader region)" />
            <Field label="Logo URL" id="logo_url" value={logoUrl} onChange={setLogoUrl}
              placeholder="https://..." fullWidth />
            <Field label="Logo height (px)" id="logo_height" value={logoHeight} onChange={setLogoHeight}
              type="number" placeholder="36" hint="Overrides the default 36px logo height" />
            <Field label="State contractor license #" id="state_license" value={stateLicense} onChange={setStateLicense}
              placeholder="CGC1234567" hint="Displayed in the footer where legally required (e.g. Florida)" />
          </div>
        </SectionCard>

        {/* Asset Library */}
        <CollapsibleCard title="Asset Library" defaultOpen={false}>
          <div style={{ marginTop: 'var(--space-md)' }}>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginBottom: 'var(--space-md)', lineHeight: 1.6 }}>
              Upload images to Vercel Blob. Use <strong>Use as logo</strong> to instantly fill the Logo URL field above.
            </p>
            <AssetUploader tenantId={tenantId} onUseUrl={setLogoUrl} />
          </div>
        </CollapsibleCard>

        {/* Contact & Integrations */}
        <SectionCard title="Contact & Integrations">
          <div className="admin-field-grid">
            <Field label="Contact phone" id="phone" value={phone} onChange={setPhone}
              placeholder="(555) 000-0000" type="tel" />
            <Field label="Contact email" id="email" value={email} onChange={setEmail}
              placeholder="hello@company.com" type="email" />
            <Field label="Privacy policy URL" id="privacy_url" value={privacyUrl} onChange={setPrivacyUrl}
              placeholder="https://..." />
            <Field label="Email sender address" id="resend_from" value={resendFrom} onChange={setResendFrom}
              placeholder='Pool Co. <hello@yourcompany.com>'
              hint="Optional. Overrides the default shared sender. Must be a verified domain in Resend." />
            <Field label="GHL webhook URL" id="ghl_webhook" value={ghlWebhook} onChange={setGhlWebhook}
              placeholder="https://services.leadconnectorhq.com/hooks/..." fullWidth />
            <Field label="GHL booking webhook URL" id="ghl_booking_webhook" value={ghlBookingWebhook}
              onChange={setGhlBookingWebhook}
              placeholder="https://services.leadconnectorhq.com/hooks/..." fullWidth
              hint="Optional — only needed if booking webhook differs from lead webhook" />
            <Field label="Google Tag ID" id="gtag_id" value={gtagId} onChange={setGtagId}
              placeholder="G-XXXXXXXXXX or GTM-XXXXXXX" />
            <Field label="Facebook Pixel ID" id="fb_pixel_id" value={fbPixelId} onChange={setFbPixelId}
              placeholder="123456789012345" />
            <Field label="Financing / pre-approval URL" id="financing_url" value={financingUrl} onChange={setFinancingUrl}
              placeholder="https://..." fullWidth
              hint="Optional. Shows a 'Get pre-approved' button on the results page financing section." />
          </div>
        </SectionCard>

        {/* Theme */}
        <SectionCard title="Brand Colour">
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 'var(--space-md)' }}>
            <div className="form-group" style={{ flex: 1, margin: 0 }}>
              <label className="form-label" htmlFor="primary_color">Primary colour</label>
              <input
                id="primary_color"
                type="text"
                className="form-input"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                placeholder="#1B6CA8"
              />
              <div className="form-hint">Must be a 6-digit hex. Hover/light/accent are auto-derived.</div>
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-sm)', marginBottom: 'var(--space-md)' }}>
              {([
                ['Primary', previewTheme.primary],
                ['Hover', previewTheme.primary_hover],
                ['Light', previewTheme.primary_light],
              ] as const).map(([label, color]) => (
                <div key={label} style={{ textAlign: 'center' }}>
                  <div
                    className="admin-color-preview"
                    style={{ background: color, width: 40, height: 40 }}
                    title={color}
                  />
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>{label}</div>
                </div>
              ))}
            </div>
          </div>
        </SectionCard>

        {/* Service area */}
        <SectionCard title="Service Area">
          <Toggle
            label="Enable service area check"
            checked={serviceAreaEnabled}
            onChange={setServiceAreaEnabled}
            hint="When enabled, addresses are checked against the radius and blocked zones below."
          />
          {serviceAreaEnabled && (
            <div className="admin-field-grid" style={{ marginTop: 'var(--space-md)' }}>

              {/* Address search — fills lat/lng automatically */}
              <div className="form-group admin-field-full">
                <label className="form-label">Search center address</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    className="form-input"
                    value={saQuery}
                    onChange={(e) => handleSaQueryChange(e.target.value)}
                    placeholder="123 Main St, Austin, TX"
                  />
                  {(saLoadingPredictions || saLoadingGeocode) && (
                    <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                      {saLoadingGeocode ? 'Locating…' : 'Searching…'}
                    </div>
                  )}
                  {saPredictions.length > 0 && (
                    <div className="autocomplete-dropdown">
                      {saPredictions.map((pred) => (
                        <button
                          key={pred.place_id}
                          type="button"
                          className="autocomplete-item"
                          onClick={() => selectSaPrediction(pred)}
                        >
                          <span className="autocomplete-item-main">{pred.main_text}</span>
                          <span className="autocomplete-item-secondary">{pred.secondary_text}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="form-hint">Selects a location and auto-fills the coordinates below.</div>
              </div>

              <Field label="Center latitude" id="sa_lat" value={serviceAreaLat} onChange={setServiceAreaLat}
                type="number" placeholder="30.2672" />
              <Field label="Center longitude" id="sa_lng" value={serviceAreaLng} onChange={setServiceAreaLng}
                type="number" placeholder="-97.7431" />
              <Field label="Radius (miles)" id="sa_radius" value={serviceAreaRadius} onChange={setServiceAreaRadius}
                type="number" placeholder="50" />
              <div className="form-group">
                <Toggle
                  label="Strict mode (block out-of-area completely)"
                  checked={serviceAreaStrict}
                  onChange={setServiceAreaStrict}
                  hint="When off, out-of-area leads see a warning but can still continue."
                />
              </div>
              <Field label="Warning message (non-strict mode)" id="sa_warning" value={serviceAreaWarning}
                onChange={setServiceAreaWarning} fullWidth
                placeholder="We may not serve your area, but we'll be in touch!" />
              <Field label="Blocked ZIP codes" id="blocked_zips" value={blockedZips} onChange={setBlockedZips}
                fullWidth placeholder="78701, 78702" hint="Comma-separated" />
              <Field label="Blocked states" id="blocked_states" value={blockedStates} onChange={setBlockedStates}
                placeholder="NV, AZ" hint="Comma-separated abbreviations" />
              <Field label="Blocked counties" id="blocked_counties" value={blockedCounties}
                onChange={setBlockedCounties}
                placeholder="Travis County, Williamson County" hint="Comma-separated" />
            </div>
          )}
        </SectionCard>

        {/* Booking */}
        <SectionCard title="Booking & Consultation">
          <div className="admin-field-grid">
            <div>
              <Toggle label="Enable booking step" checked={bookingEnabled} onChange={setBookingEnabled}
                hint="When enabled, Contact → Booking → Results. When disabled, Contact → Results." />
              <Toggle label="Allow users to skip booking" checked={bookingSkipEnabled}
                onChange={setBookingSkipEnabled} hint="Shows a 'Skip for now' option in the booking step." />
            </div>
            <div>
              <Field label="Consultation days ahead" id="consult_days" value={consultDays}
                onChange={setConsultDays} type="number" placeholder="21"
                hint="Number of weekdays to show in the date picker" />
            </div>
            <Field label="Financing APR (%)" id="financing_apr" value={financingApr}
              onChange={setFinancingApr} type="number" placeholder="8.99" />
            <Field label="Financing term (years)" id="financing_term" value={financingTerm}
              onChange={setFinancingTerm} type="number" placeholder="10" />
          </div>
        </SectionCard>

        {/* Copy overrides */}
        <CollapsibleCard title="Copy Overrides" defaultOpen={false}>
          <div style={{ marginTop: 'var(--space-md)' }}>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginBottom: 'var(--space-lg)', lineHeight: 1.6 }}>
              Leave any field blank to use the default copy. Available tokens:{' '}
              <code style={{ background: 'var(--canvas-light-gray)', padding: '1px 4px', borderRadius: 3 }}>
                {'{{brandName}} {{companyName}} {{city}} {{area}} {{phone}}'}
              </code>
            </p>
            {COPY_GROUPS.map((group) => (
              <div key={group.label} style={{ marginBottom: 'var(--space-xl)' }}>
                <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: 'var(--space-sm)' }}>
                  {group.label}
                </div>
                {group.keys.map((key) => {
                  const defaultVal = DEFAULT_COPY_TEMPLATES[key] ?? '';
                  const rows = Math.max(2, Math.ceil(defaultVal.length / 58));
                  return (
                    <div className="form-group" key={key}>
                      <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{key}</span>
                      </label>
                      <textarea
                        className="form-input"
                        rows={rows}
                        value={copyOverrides[key] ?? ''}
                        onChange={(e) => setCopyOverride(key, e.target.value)}
                        placeholder={defaultVal}
                        style={{ resize: 'vertical', lineHeight: 1.5 }}
                      />
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </CollapsibleCard>

        {/* Catalog pricing */}
        <CollapsibleCard title="Catalog Pricing" defaultOpen={false}>
          <div style={{ marginTop: 'var(--space-md)' }}>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginBottom: 'var(--space-md)' }}>
              Update pricing for this tenant. Leave blank to use the global defaults.
            </p>

            {/* Intake import */}
            <div className="admin-intake-import">
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, marginBottom: 2 }}>
                  Import client intake
                </div>
                {importStatus === 'success' && importMeta ? (
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--status-success)' }}>
                    Imported from {importMeta.brandName} — submitted {new Date(importMeta.submittedAt).toLocaleDateString()}
                  </div>
                ) : importStatus === 'error' ? (
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--status-error)' }}>
                    No intake found for this tenant, or the import failed.
                  </div>
                ) : (
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                    Fills all pricing fields from the client&apos;s submitted intake form.
                  </div>
                )}
              </div>
              <button
                className="btn-secondary"
                onClick={handleImportIntake}
                disabled={importStatus === 'loading'}
                style={{ display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}
              >
                <Download size={14} />
                {importStatus === 'loading' ? 'Importing...' : 'Import intake'}
              </button>
            </div>

            {/* Pool models */}
            <div style={{ marginBottom: 'var(--space-xl)' }}>
              <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: 'var(--space-sm)' }}>
                Pool models — base price ($)
              </div>
              {tenant.catalog.poolModels.filter((m) => !m.manufacturer).map((model) => (
                <div key={model.id} className="admin-catalog-row">
                  <div>
                    <div className="admin-catalog-name">{model.name}</div>
                    <div className="admin-catalog-sub">{Math.round(model.width)}′ × {Math.round(model.length)}′</div>
                  </div>
                  <label className="admin-toggle" style={{ gap: 6 }}>
                    <input
                      type="checkbox"
                      checked={poolModelEnabled[model.id] !== false}
                      onChange={(e) => setPoolModelEnabled((prev) => ({ ...prev, [model.id]: e.target.checked }))}
                    />
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                      {poolModelEnabled[model.id] !== false ? 'On' : 'Off'}
                    </span>
                  </label>
                  <input
                    type="number"
                    className="admin-price-input"
                    value={poolModelEnabled[model.id] !== false ? (poolModelPrices[model.id] ?? '') : ''}
                    onChange={(e) => setPoolModelPrices((prev) => ({ ...prev, [model.id]: e.target.value }))}
                    placeholder={String(model.basePrice)}
                    disabled={poolModelEnabled[model.id] === false}
                  />
                </div>
              ))}
              {customModels.length > 0 && (
                <>
                  <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', margin: 'var(--space-md) 0 var(--space-sm)' }}>
                    Fiberglass models — base price ($)
                  </div>
                  {customModels.map((model) => (
                    <div key={model.id} className="admin-catalog-row">
                      <div>
                        <div className="admin-catalog-name">{model.name}</div>
                        <div className="admin-catalog-sub">{Math.round(model.width)}′ × {Math.round(model.length)}′ · {model.manufacturer}</div>
                      </div>
                      <label className="admin-toggle" style={{ gap: 6 }}>
                        <input
                          type="checkbox"
                          checked={poolModelEnabled[model.id] !== false}
                          onChange={(e) => setPoolModelEnabled((prev) => ({ ...prev, [model.id]: e.target.checked }))}
                        />
                        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                          {poolModelEnabled[model.id] !== false ? 'On' : 'Off'}
                        </span>
                      </label>
                      <input
                        type="number"
                        className="admin-price-input"
                        value={poolModelEnabled[model.id] !== false ? (poolModelPrices[model.id] ?? '') : ''}
                        onChange={(e) => setPoolModelPrices((prev) => ({ ...prev, [model.id]: e.target.value }))}
                        placeholder={String(model.basePrice)}
                        disabled={poolModelEnabled[model.id] === false}
                      />
                    </div>
                  ))}
                </>
              )}
            </div>

            {/* Equipment options */}
            <div style={{ marginBottom: 'var(--space-xl)' }}>
              <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: 'var(--space-sm)' }}>
                Equipment options — price ($) · toggle to enable/disable
              </div>
              {tenant.catalog.equipmentOptions.map((opt) => (
                <div key={opt.id} style={{ marginBottom: 'var(--space-sm)' }}>
                  <div className="admin-catalog-row">
                    <div>
                      <div className="admin-catalog-name">{opt.name}</div>
                      <div className="admin-catalog-sub">
                        {opt.category}
                        {opt.materials && (
                          <span style={{ marginLeft: 6, padding: '1px 6px', borderRadius: 4, background: 'var(--canvas-off-white)', border: '1px solid var(--canvas-border)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                            {opt.materials.join(' + ')} only
                          </span>
                        )}
                      </div>
                    </div>
                    <label className="admin-toggle" style={{ gap: 6 }}>
                      <input
                        type="checkbox"
                        checked={optionEnabled[opt.id] !== false}
                        onChange={(e) => setOptionEnabled((prev) => ({ ...prev, [opt.id]: e.target.checked }))}
                      />
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                        {optionEnabled[opt.id] !== false ? 'On' : 'Off'}
                      </span>
                    </label>
                    <input
                      type="number"
                      className="admin-price-input"
                      value={optionEnabled[opt.id] !== false ? (optionPrices[opt.id] ?? '') : ''}
                      onChange={(e) => setOptionPrices((prev) => ({ ...prev, [opt.id]: e.target.value }))}
                      placeholder={String(opt.price)}
                      disabled={optionEnabled[opt.id] === false}
                    />
                  </div>
                  {optionEnabled[opt.id] !== false && (
                    <div style={{ padding: '6px 0 0 0', display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', width: 'fit-content' }}>
                        <input
                          type="checkbox"
                          checked={optionDynamic[opt.id] ?? false}
                          onChange={(e) => setOptionDynamic((prev) => ({ ...prev, [opt.id]: e.target.checked }))}
                        />
                        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Dynamic pricing formula</span>
                      </label>
                      {optionDynamic[opt.id] && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <textarea
                            className="form-input"
                            rows={2}
                            value={optionFormulas[opt.id] ?? ''}
                            onChange={(e) => setOptionFormulas((prev) => ({ ...prev, [opt.id]: e.target.value }))}
                            placeholder={opt.pricing_formula ?? 'e.g. poolWidth * poolLength * 12'}
                            style={{ fontFamily: 'monospace', fontSize: 12, resize: 'vertical' }}
                          />
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                            Available variables:{' '}
                            {['poolWidth', 'poolLength', 'deckingSqft', 'hasSpa', 'selectedOptions', 'Math'].map((v, i, arr) => (
                              <span key={v}>
                                <code style={{ fontFamily: 'monospace', background: 'var(--canvas-off-white)', border: '1px solid var(--canvas-border)', borderRadius: 3, padding: '0 3px' }}>{v}</code>
                                {i < arr.length - 1 ? ' ' : ''}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Decking options */}
            <div>
              <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: 'var(--space-sm)' }}>
                Decking — price per sqft ($)
              </div>
              {tenant.catalog.deckingOptions.map((opt) => (
                <div key={opt.id} className="admin-catalog-row">
                  <div>
                    <div className="admin-catalog-name">{opt.name}</div>
                  </div>
                  <label className="admin-toggle" style={{ gap: 6 }}>
                    <input
                      type="checkbox"
                      checked={deckingEnabled[opt.id] !== false}
                      onChange={(e) => setDeckingEnabled((prev) => ({ ...prev, [opt.id]: e.target.checked }))}
                    />
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                      {deckingEnabled[opt.id] !== false ? 'On' : 'Off'}
                    </span>
                  </label>
                  <input
                    type="number"
                    className="admin-price-input"
                    value={deckingEnabled[opt.id] !== false ? (deckingPrices[opt.id] ?? '') : ''}
                    onChange={(e) => setDeckingPrices((prev) => ({ ...prev, [opt.id]: e.target.value }))}
                    placeholder={String(opt.pricePerSqft)}
                    disabled={deckingEnabled[opt.id] === false}
                  />
                </div>
              ))}
            </div>
          </div>
        </CollapsibleCard>

        {/* Instructions */}
        <div className="admin-card" style={{ background: 'var(--canvas-off-white)' }}>
          <div className="admin-card-title">How to deploy changes</div>
          <ol style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: 1.8, paddingLeft: 20 }}>
            <li>Make your edits above.</li>
            <li>Click <strong>Copy JSON</strong> at the top of the page.</li>
            <li>Open your <a href="https://vercel.com" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--brand-primary)' }}>Vercel dashboard</a> and navigate to your project&apos;s Edge Config store.</li>
            <li>Find the key <code style={{ background: 'var(--canvas-light-gray)', padding: '1px 4px', borderRadius: 3 }}>{tenantId}</code> and paste the copied JSON as its value.</li>
            <li>Save. Changes take effect immediately — no redeploy needed.</li>
          </ol>
        </div>

        {/* Bottom spacer for sticky footer */}
        <div style={{ height: 80 }} />
      </div>

      {/* Sticky footer */}
      <div className="admin-footer">
        <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
          Tenant: <strong style={{ color: 'var(--text-primary)' }}>{tenantId}</strong>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
          {copied && (
            <div className="admin-copy-success">
              <Check size={14} /> Copied!
            </div>
          )}
          <button className="btn-primary" onClick={handleCopy}>
            <Copy size={16} strokeWidth={2} />
            Copy JSON
          </button>
        </div>
      </div>
    </div>
  );
}
