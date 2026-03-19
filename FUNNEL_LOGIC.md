# Funnel Logic & Flow Reference

This document covers the logic skeleton of the estimator funnel: step order, data collection, pricing calculation, lead verification, and results display. It is intended as a spec for building new tools with the same mechanics — not a guide to the implementation details of this specific codebase.

---

## Funnel Steps (in order)

| # | Step | Data Collected | Affects Pricing |
|---|------|---------------|-----------------|
| 1 | Intro | None | No |
| 2 | Pool Model | `poolModel`, `deckingType`, `paverSquareFootage`, `paverSquareFootageOption` | Yes |
| 3 | Options | `options` (array of selected option IDs) | Yes |
| 4 | Timeline | `timeline` | No |
| 5 | Address | Full address object + coordinates + `isOutOfServiceArea` flag | No |
| 6 | Contact | `name`, `phone` (+ any additional contact fields) | No |
| 7 | Booking *(conditional)* | `bookingDate`, `bookingTimeSlot`, `bookingCompleted` | No |
| 8 | Results | Terminal — displays estimate | — |

The Booking step is feature-flagged. If disabled, the Contact step submits the lead directly and routes straight to Results.

---

## Full Data Object

All collected data lives in a single `FunnelData` object that accumulates across steps:

```
poolModel                  string           Pool model ID
options                    string[]         Selected equipment option IDs
deckingType                string           Decking material ID
paverSquareFootage         number           Total decking sqft
paverSquareFootageOption   string           Preset width key or "custom"
timeline                   string           Purchase timeline selection
address
  formatted_address        string
  place_id                 string
  lat                      number
  lng                      number
  street_number            string
  route                    string
  locality                 string           City
  administrative_area_level_1  string       State (short)
  postal_code              string
  country                  string
  isOutOfServiceArea       boolean
name                       string
phone                      string
contactFields              Record<string, string|boolean>   Extra contact fields
estimatedPrice             number           Computed total
isOutOfServiceArea         boolean          Promoted to top-level for routing logic
bookingDate                string           YYYY-MM-DD
bookingTimeSlot            string           "morning" | "afternoon"
bookingCompleted           boolean
```

---

## Navigation Logic

**Standard flow:** each step calls `handleNext()` to increment the step counter, `handleBack()` to decrement. Back button hidden on step 0.

**Out-of-service-area shortcut (non-strict mode):** if the user's address is flagged `isOutOfServiceArea` and the funnel is not in strict mode, the Continue button on the Address step skips Contact, Booking, and lead submission entirely — it calls the submit handler directly, stores the result locally, and routes to Results. No CRM webhook, no pixel fires.

**Contact → Booking vs. Contact → Results:** if Booking is enabled, the Contact step has an `onNext` callback (advance to booking). If disabled, it has an `onSubmit` callback (submit and go to Results).

**Booking → Results:** the confirm button submits with `bookingCompleted: true`; a skip button (if enabled) submits with `bookingCompleted: false`.

**Returning users:** on mount, the app checks `localStorage` for a stored submission. If one exists, it restores state and renders the Results step directly, bypassing the entire funnel.

---

## Pricing Logic

### Formula

```
totalPrice = poolBasePrice + equipmentOptionsPrice + deckingPrice
```

**1. Pool base price**
Looked up by `poolModel` ID from the tenant config.

**2. Equipment options price**
For each selected option ID in `funnelData.options`:
- Check if the option has a `dynamicPricing` flag and a `pricing_formula` string.
  - If yes: evaluate the formula (see below) with the current pricing context.
  - If the formula returns null or fails: fall back to the static price from the tenant config.

**3. Decking price**
```
deckingPrice = deckingOption.pricePerSqft × funnelData.paverSquareFootage
```
Only calculated if both `deckingType` and `paverSquareFootage` are present.

**Spa/heater incompatibility:** selecting a spa automatically removes the gas heater option from the selection before pricing.

### Dynamic Pricing Formula

Formulas are JavaScript expression strings stored in the tenant config per option. They are evaluated with `new Function()` and receive a fixed set of named parameters:

```
poolWidth         number   Pool model width in feet
poolLength        number   Pool model length in feet
deckingSqft       number   Total decking area
hasSpa            boolean  Whether spa is selected
selectedOptions   string[] All currently selected option IDs
Math              object   Native Math (explicitly injected)
```

Example formula string:
```js
return poolWidth * poolLength * 50 + (hasSpa ? 5000 : 0);
```

If the formula throws or returns a non-finite number, pricing falls back to the static value.

### Decking Sqft Calculation

When the user selects a preset width-around-pool option rather than entering sqft manually:

```
sqft = (poolWidth + 2×widthAround) × (poolLength + 2×widthAround) − (poolWidth × poolLength)
```

A minimum decking sqft is enforced, calculated with a `minimumDeckingWidth` config value using the same formula.

---

## Lead Verification

### Phone Verification

**When:** triggered automatically on blur when the phone field contains exactly 10 digits.

**Mechanism:** calls a backend edge function (`validate-phone`) with the raw digit string. Results are cached in memory per phone number to avoid redundant calls.

**States:**
- `valid` — passes; form can proceed.
- `invalid` — fails; blocks submission. User must correct the number.
- `api-error` — the validation service is unreachable; the form allows proceeding with a warning (does not hard-block).
- `idle` — not yet validated.

**Format:** the input formats as `(XXX) XXX-XXXX` while the user types. Validation operates on the 10-digit string underneath.

**Gate:** form submission is blocked until `phoneValid` is either `valid` or `api-error`. `invalid` always blocks.

---

### Google Maps Address Autocomplete

**When:** applies to the address field in the Address step only.

**Mechanism:** as the user types, input is debounced (1000ms) then sent to a backend edge function (`places-autocomplete`), which proxies a Google Places Autocomplete request. The response is a list of place predictions (place ID + formatted description + structured main/secondary text).

The user selects a prediction from a dropdown. Selection triggers a second call to a `geocode-place` edge function, which resolves the `place_id` to full coordinates and address components (street number, route, city, state, zip, county, country).

Keyboard navigation (arrow keys, Enter, Escape) is supported on the dropdown.

---

### Service Area Check

**When:** runs immediately after a place is geocoded and coordinates are available.

**Configuration shape:**
```
enabled           boolean  Whether service area checking is active
lat               number   Center point latitude
lng               number   Center point longitude
radiusMiles       number   Service radius
warningMessage    string   Shown to out-of-area users in non-strict mode
strictMode        boolean  If true, blocks submission; if false, warns but allows continue
blockedZips       string[] Zip codes to block regardless of radius
blockedStates     string[] State abbreviations to block
blockedCounties   string[] County names to block
```

**Logic (in order):**

1. **Radius check** using the Haversine formula:
   ```
   a = sin²(Δlat/2) + cos(lat1) × cos(lat2) × sin²(Δlng/2)
   distance = 3958.8 × 2 × arctan2(√a, √(1−a))   (miles)
   inArea = distance <= radiusMiles
   ```

2. If outside radius: flag `isOutOfServiceArea = true`. Apply strict/non-strict behaviour (see below).

3. If inside radius: check blocked zones.
   - Zip match: exact string match against `blockedZips`.
   - State match: case-insensitive match against `blockedStates`.
   - County match: case-insensitive match against `blockedCounties`.
   - Any match flags `isOutOfServiceArea = true`.

**Strict mode behaviour:**
- `strictMode: true` — shows an error with an X icon and a "Try Different Address" button. The Continue button is unavailable.
- `strictMode: false` — shows a warning with a triangle icon and the configured `warningMessage`. The user can still continue; the flow takes the out-of-area shortcut described in the Navigation section above.

**Submission behaviour for out-of-area leads:**
- Lead is NOT sent to the CRM webhook.
- Conversion tracking pixels (Facebook, Google Ads) are NOT fired.
- Funnel data IS stored to localStorage.
- Results page IS shown but with consultation sections hidden.

---

### Other Validation

**Email:** client-side regex (`/^[^\s@]+@[^\s@]+\.[^\s@]+$/`). No third-party verification.

**Custom field patterns:** contact fields can carry an optional `validation_pattern` regex and `validation_message`. Applied at form submission.

**No CAPTCHA** is used anywhere in the funnel.

---

## Results Page

### Price Display

The base estimate is stored as a single number (`estimatedPrice`). The results page always displays it as a ±10% range:

```
lowPrice  = Math.round(estimatedPrice × 0.9)
highPrice = Math.round(estimatedPrice × 1.1)
```

The range is shown large and prominently at the top of the page, and again inside the estimate summary card.

### Sections

Results is built as a list of named sections rendered in the following order:

1. `priceRange` — large `$low–$high` display, note about what the estimate includes
2. `whyRange` — collapsible explanation of why prices vary
3. `estimateCard` — pool image, name, dimensions, selected features grid (image + name + description per feature), decking sqft
4. `consultationCta` — main call to action (see below)
5. `financingCalculator` — monthly payment estimate
6. `testimonials` — featured project testimonials
7. `faq` — FAQ accordion
8. `whatHappensNext` — timeline of next steps
9. `notReady` — PDF download link


### Consultation CTA States

The CTA section has three states:

**1. Pre-booking prompt:** a button that expands the date/time picker.

**2. Picker open:**
- Date dropdown: next 21 weekdays (Monday–Friday only, no weekends).
- Time dropdown: "Morning (9am–12pm)" or "Afternoon (1pm–5pm)".
- Submit enabled only when both are selected.
- Submit calls a `consultation-request` edge function, then shows the confirmation state.

**3. Booked confirmation:** green success box showing the user's first name, booked date, and time slot. The CTA section is replaced and a `whatHappensNextBooking` variant (if configured) replaces the standard next-steps section. Booking info remains logged in local memory to ensure booking isn't requested to the user twice (remains in green success box state)

### Out-of-Service-Area Results

When `isOutOfServiceArea` is true, the following sections are hidden:
- `consultationCta`
- `testimonials`
- `faq`
- `whatHappensNext`
- `notReady`

Remaining visible: `priceRange`, `estimateCard`, `financingCalculator`.

The estimate is still shown in full — the user just cannot book a consultation.

### PDF Download

"Download Estimate" triggers client-side PDF generation (jsPDF). Contents:
- Header: brand name + generation date
- Customer: name, phone, address
- Pool model: name + dimensions
- Selected features: list (no per-item pricing)
- Estimated total range: `$lowPrice – $highPrice`
- Next steps: 3–4 bullet CTAs
- Footer: brand contact info

File is named `Pool-Estimate-{name}.pdf`.

### Start Over

Clears the localStorage submission entry and resets all state back to step 0 (Intro).

---

## End-to-End Data Flow Summary

```
Intro
  ↓
Pool Model         ← pricing data read from tenant config
  ↓
Options            ← dynamic formulas evaluated as selections change
  ↓
Timeline
  ↓
Address            ← geocode place_id → coordinates + components
                   ← service area check (radius + blocked zones)
                     ├─ out of area (strict)    → blocked, must retry
                     ├─ out of area (non-strict) → warn, skip to Results
                     └─ in area                 → continue
  ↓
Contact            ← phone validation on blur
  ↓
[Booking]          ← optional; if disabled, Contact submits directly
  ↓
handleSubmit()
  ├─ in area:  POST to submit-lead edge function (CRM + email)
  │            fire Facebook Pixel + Google Ads conversion events
  │            store to localStorage
  └─ out of area: store to localStorage only (no CRM, no pixels)
  ↓
Results            ← reads from state (or localStorage on return visit)
```
