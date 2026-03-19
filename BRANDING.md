# Design System & Branding Guidelines

This document is the authoritative reference for building new tools and pages that share the visual identity of the AI Pool Design Tool. Feed this document to any agent building a new screen, flow, or micro-tool, and it should produce output that looks and feels like it belongs to the same family.

---

## Philosophy

The aesthetic is **calm authority** — a premium, editorial feel that reads like a high-end home-services brand, not a SaaS startup. The visual language is rooted in quiet contrast: generous white space, a serif display typeface paired with a clean sans-serif body, warm off-whites for secondary surfaces, and a single brand colour doing most of the interactive work. Decorative elements are rare and purposeful. Icon usage is restrained: icons appear only in UI chrome (navigation, feature bullets, form controls) — never on selection cards where they would pre-load user expectations.

---

## Theming Architecture

There are two layers of tokens:

**Fixed system tokens** — defined once in `globals.css`, never overridden per client. These cover canvas colours, text hierarchy, spacing, radius, shadows, transitions, and layout widths.

**Brand tokens** — injected server-side into `<head>` as a `<style>` tag at SSR time (zero FOUC). They are the only things that differ between tenants.

```css
:root {
  --brand-primary:       /* e.g. #1B6CA8 — main CTA colour */
  --brand-primary-hover: /* ~12 lightness points darker */
  --brand-primary-light: /* ~42 lightness points lighter, ~20 saturation lower — tint for hover states */
  --brand-accent:        /* often matches primary; used for eyebrows, stars, score buttons */
}
```

When building a standalone tool, pick one primary hex and derive the rest:
- `primary_hover` = HSL lightness − 12
- `primary_light` = HSL lightness + 42, saturation − 20, clamped to max L 97
- `accent` = same as primary unless you want a distinct highlight colour (gold, amber, etc.)

---

## Colour Palette

### Canvas (backgrounds & borders)

| Token                  | Value     | Usage                                      |
|------------------------|-----------|--------------------------------------------|
| `--canvas-white`       | `#FFFFFF` | Default page background, card backgrounds  |
| `--canvas-off-white`   | `#F8F7F5` | Section alternates, upload zone bg, FAQ answer bg |
| `--canvas-light-gray`  | `#F2F1EF` | Icon container backgrounds, chip bg, hover bg |
| `--canvas-border`      | `#E5E3DF` | All borders, dividers, input outlines      |

### Text

| Token                | Value     | Usage                                        |
|----------------------|-----------|----------------------------------------------|
| `--text-primary`     | `#1A1A1A` | Headings, labels, primary body copy          |
| `--text-secondary`   | `#5A5A5A` | Subheadlines, supporting body, testimonial quotes |
| `--text-muted`       | `#9A9A9A` | Captions, placeholders, consent text, metadata |
| `--text-inverse`     | `#FFFFFF` | Text on brand-coloured and dark backgrounds  |

### Status

| Token                  | Value     | Usage                          |
|------------------------|-----------|--------------------------------|
| `--status-success`     | `#2D6A4F` | Success text                   |
| `--status-success-bg`  | `#EAF4EF` | Success icon background        |
| `--status-error`       | `#B5341C` | Error text                     |
| `--status-error-bg`    | `#FDF0ED` | Error icon background          |

---

## Typography

### Typefaces

```css
--font-display: 'DM Serif Display', Georgia, serif;
--font-body:    'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
```

Load from Google Fonts:
```
https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500;600&display=swap
```

**DM Serif Display** is the editorial voice: headings, display text, italic quotes, modal titles, loading quips, confirmation titles.

**DM Sans** is the functional voice: body copy, labels, buttons, form elements, metadata. Use weights 300 (light body), 400 (default), 500 (labels, nav), 600 (CTAs, section titles, emphasis).

### Type Scale

| Token          | Size  | Primary Use                                      |
|----------------|-------|--------------------------------------------------|
| `--text-xs`    | 11px  | Eyebrows, chip badges, metadata, consent text    |
| `--text-sm`    | 13px  | Supporting body, secondary labels, form hints    |
| `--text-base`  | 15px  | Default body, option card labels, form inputs    |
| `--text-md`    | 17px  | Subheadlines, large button text                  |
| `--text-lg`    | 21px  | Logo placeholder text                            |
| `--text-xl`    | 28px  | Modal titles, confirmation headlines, booking CTA |
| `--text-2xl`   | 38px  | Section headings (`.headline-section`), loading quip (mobile) |
| `--text-3xl`   | 52px  | Page display headings (`.headline-display`)      |
| `--text-hero`  | 68px  | Reserved for hero contexts (defined but rarely used) |

### Typography Classes

```css
/* Major page heading — DM Serif Display, 52px, weight 400, lh 1.15 */
.headline-display { font-family: var(--font-display); font-size: var(--text-3xl); font-weight: 400; line-height: 1.15; letter-spacing: -0.01em; }

/* Section heading — DM Serif Display, 38px, weight 400, lh 1.2 */
.headline-section { font-family: var(--font-display); font-size: var(--text-2xl); font-weight: 400; line-height: 1.2; }

/* Supporting paragraph — DM Sans, 17px, weight 300, lh 1.65 */
.subheadline { font-family: var(--font-body); font-size: var(--text-md); font-weight: 300; color: var(--text-secondary); line-height: 1.65; }
```

### Line Heights

| Context              | Line height |
|----------------------|-------------|
| Display headings     | 1.15        |
| Section headings     | 1.2         |
| Body / subheadline   | 1.65        |
| Default body         | 1.6         |
| FAQ answer body      | 1.7         |
| Loading italic quote | 1.65        |

### Mobile Typography Adjustments

At `max-width: 640px`:
- `.headline-display` drops from `--text-3xl` (52px) to `--text-2xl` (38px).
- Loading quip drops from `--text-2xl` (38px) to `--text-xl` (28px).

---

## Spacing Scale

All spacing is in multiples of 4px:

| Token         | Value | Use                                       |
|---------------|-------|-------------------------------------------|
| `--space-xs`  | 4px   | Micro gaps, label-to-input margin         |
| `--space-sm`  | 8px   | Icon gaps, tight stacking                 |
| `--space-md`  | 16px  | Default padding, form group margin        |
| `--space-lg`  | 24px  | Section padding, card inner spacing       |
| `--space-xl`  | 40px  | Header padding, primary vertical rhythm   |
| `--space-2xl` | 64px  | Page content bottom padding, major gaps   |
| `--space-3xl` | 96px  | Largest structural gaps (rare)            |

---

## Border Radius

| Token          | Value | Use                                              |
|----------------|-------|--------------------------------------------------|
| `--radius-sm`  | 4px   | Chip badges, score buttons, calendar day cells   |
| `--radius-md`  | 8px   | Buttons, form inputs, icon containers            |
| `--radius-lg`  | 12px  | Option cards, booking period cards, upload zone, image frames |
| `--radius-xl`  | 16px  | Modals, main booking card, survey notch, chip toggle |

---

## Shadows

```css
--shadow-sm: 0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.05);
--shadow-md: 0 4px 12px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04);
--shadow-lg: 0 16px 40px rgba(0,0,0,0.10), 0 4px 12px rgba(0,0,0,0.06);
--shadow-xl: 0 32px 64px rgba(0,0,0,0.12), 0 8px 24px rgba(0,0,0,0.08);
```

**When to use which:**
- `shadow-sm` — selected state on lightweight elements (cards, chips).
- `shadow-md` — button hover lift, upload zone hover.
- `shadow-lg` — booking card, testimonial containers.
- `shadow-xl` — modals, render image frame.

---

## Transitions

```css
--transition-fast: 150ms ease;   /* hover colours, border colours, opacity */
--transition-base: 250ms ease;   /* upload zone, general state changes */
--transition-slow: 400ms ease;   /* reserved for larger reveals */
```

All interactive elements (buttons, cards, inputs) use `--transition-fast` for colour/border and a `translateY(-1px)` lift on hover. **Never exceed 250ms for hover transitions** — the feel is snappy, not floaty.

For GSAP-animated panels (e.g. FAQ accordion), use `duration: 0.3, ease: 'power2.inOut'`.

The survey notch exit uses `transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)` — a deceleration curve for the slide-away.

---

## Layout & Max Widths

```css
--max-content: 680px;   /* Main funnel pages (centered column) */
--max-form:    480px;   /* Modal / form card width */
--max-wide:    960px;   /* Image frames, booking card, before/after grid */
```

### Page Structure

```html
<div class="page-wrapper">       <!-- min-height: 100vh, flex column -->
  <header class="site-header">  <!-- centered logo, absolute phone number right -->
  <main class="page-content">   <!-- flex column, centered, max-width: --max-content -->
  <section class="...">         <!-- full-bleed sections below the fold -->
</div>
```

`.page-content.wide` expands to `--max-wide` for image-heavy layouts.

Page content has `padding: 0 var(--space-xl) var(--space-2xl)` (collapses to `--space-md` on mobile).

---

## Components

### Buttons

**Primary** (`.btn-primary`): solid brand background, white text, 14px/28px padding, radius-md, font-weight 600, 0.01em letter-spacing. Hover: darker bg (`--brand-primary-hover`) + `translateY(-1px)` + shadow-md. Active: no lift, no shadow. Disabled: opacity 0.45.

**Primary large** (`.btn-primary.btn-lg`): 18px/40px padding, full width up to 400px, `--text-md` font size.

**Secondary** (`.btn-secondary`): transparent bg, `--canvas-border` border, `--text-secondary` colour, 10px/20px padding, font-weight 500, `--text-sm`. Hover: border darkens, bg goes to `--canvas-light-gray`.

**Ghost** (`.btn-ghost`): no border, no bg, `--text-muted` colour, underline with transparent decoration colour. Hover: colour shifts to `--text-secondary`, underline colour becomes `--canvas-border`. Use for "back" or "skip" type links.

### Eyebrow Labels (`.eyebrow`)

Pre-heading label in uppercase, 11px, weight 600, 0.12em letter-spacing, colour `--brand-accent`. Preceded by a 24px × 1px `--brand-accent` horizontal rule (CSS `::before` pseudo-element). Always appears immediately before the heading it introduces, with `margin-bottom: --space-md`.

```html
<div class="eyebrow">AI Pool Design</div>
<h1 class="headline-display">See your dream pool…</h1>
```

When used inside a centred section, add `style="justify-content: center"`.

### Upload Zone (`.upload-zone`)

Dashed border (`2px dashed --canvas-border`), radius-lg, `--canvas-off-white` bg, 48px/32px padding. Hover + drag-over: `--brand-primary` border, `--brand-primary-light` bg, shadow-md. Transition is `--transition-base` (250ms) for the slightly heavier feel.

### Form Inputs (`.form-input`)

Full width, 11px/14px padding, `--canvas-border` border, radius-md, background white. Focus: `--brand-primary` border + `0 0 0 3px rgba(0,0,0,0.06)` focus ring. Never use a coloured focus ring — the subtle dark shadow is enough.

`.form-label`: 13px, weight 500, `--text-primary`, `margin-bottom: --space-xs`.
`.form-group`: wraps label + input, `margin-bottom: --space-md`.

### Modals (`.modal-overlay` / `.modal-card`)

Overlay: `rgba(10,10,10,0.55)` + `backdrop-filter: blur(4px)`. Card: white, radius-xl, 40px padding (28px/20px mobile), shadow-xl, max-width `--max-form`, max-height 90vh with overflow-y scroll.

Close button: 32px circle, `--canvas-light-gray` bg, top-right 16px, hover to `--canvas-border`.

Modal title: DM Serif Display, `--text-xl`, weight 600. Sub: 13px, `--text-muted`.

### FAQ Accordion (`.faq-item`)

Items stacked with `gap: 2px` + `margin-top: --space-sm` between items. Each item is a card with `--canvas-border` border and radius-lg.

Question button: `--text-base`, weight 500, `--text-primary`. Hover + open: `--canvas-off-white` bg.

Chevron (`.faq-chevron`): 18px circle, pure CSS ×/+ icon using `::before` and `::after`. Closed = `+` shape. Open = rotates 45° to form `×`, circle fills to `--brand-primary-light`, lines become `--brand-primary`.

Answer panel: animated height 0 → full via GSAP `power2.inOut`, duration 0.3s. Background `--canvas-off-white`, `--text-base` size, weight 300, `--text-secondary`, lh 1.7.

### Dividers

`.divider` — full-width, 1px, `--canvas-border`, `margin: --space-xl 0`.

`.divider-accent` — 48px wide, 1.5px, `--brand-accent`, opacity 0.6. Use as a decorative sub-section break.

### Chip Badges (`.chip-badge`)

Frosted-glass overlay chips: `rgba(255,255,255,0.88)` bg + `backdrop-filter: blur(8px)`, radius-sm, 4px/10px padding, 11px size, weight 600, 0.06em letter-spacing, uppercase, subtle box-shadow. Used over images.

### Testimonial Cards (`.book-testimonial-card`)

`--canvas-off-white` bg, `--canvas-border` border, radius-lg, `--space-lg` padding. Stars in `--brand-accent`. Quote in italic DM Sans 13px `--text-secondary`, lh 1.7. Author name: 13px weight 600. Location/role: 11px `--text-muted`.

---

## Animations

### GSAP (via `gsap` npm package)

Used for accordion height animation. The core pattern:

```js
gsap.fromTo(el,
  { height: 0 },
  { height: el.scrollHeight, duration: 0.3, ease: 'power2.inOut' }
);
```

When closing one and opening another simultaneously, use a timeline with `'<'` position to run in parallel.

### CSS Transitions

Every interactive element should have a `transition` applied at rest (not just on `:hover`). This ensures smooth entry and exit from states.

Standard patterns:
```css
/* Colour + border */
transition: color var(--transition-fast), border-color var(--transition-fast), background var(--transition-fast);

/* Full interactive card */
transition: all var(--transition-fast);

/* Button with lift */
transition: background var(--transition-fast), transform var(--transition-fast), box-shadow var(--transition-fast);
```

### Loading / Progress Animations

The milestone stepper uses `transition: all 0.35s ease` on dots (size and colour change). Active dot grows from 10px to 14px with a soft glow shadow `0 0 0 4px rgba(0,0,0,0.07)`.

Progress line fill has no transition — it updates instantly when state changes.

### Survey Notch Slide-Away

```css
transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1);
```

On dismiss: `translateY(calc(100% + --space-md))`. Uses deceleration curve for natural physical feel.

---

## Page Sections Pattern

Full-bleed sections below the main content column follow a consistent pattern:

```html
<section class="[name]-section">          <!-- border-top + padding + background -->
  <div class="[name]-section-inner">      <!-- max-width centered, text-align center -->
    <div class="eyebrow" style="justify-content:center">Label</div>
    <h2 class="headline-section">Title</h2>
    <p class="subheadline">Supporting copy</p>
    <!-- section content -->
  </div>
</section>
```

Section backgrounds alternate: `--canvas-white` (FAQ) / `--canvas-off-white` (Before/After). All sections have `border-top: 1px solid --canvas-border` to separate them from the content above.

Section padding: `var(--space-2xl) var(--space-xl)` (collapses to `var(--space-xl) var(--space-md)` on mobile).

---

## Copy & Tone

- **Short, confident, no fluff.** Headlines make a promise or paint a picture. Subheadlines explain the mechanism in plain language.
- **Serif italic** is used for emotional moments: loading quips, testimonial quotes, score prompts. It signals craft and personality without changing the information architecture.
- Eyebrows are always uppercase, 2–3 words: "AI Pool Design", "Real Results", "FAQ".
- CTA copy uses action + object: "Continue with this photo", "Confirm appointment", "Get my estimate".
- Secondary/ghost CTAs use softer language: "Start over", "Skip for now".
- Legal and consent copy uses `--text-muted` + `--text-xs`. Never stylise it or draw attention to it.

---

## Header

Centred logo. Phone number (or optional secondary link) positioned absolutely to the right at `--space-xl`. Phone number: `--text-base`, weight 400, `--text-secondary`, hover to `--text-primary`. Logo: `height: var(--logo-height, 36px)` (scales to 75% on mobile). If no logo URL, use brand name in `--font-display` at `--text-lg`, weight 600, `--brand-primary`.

On mobile (`max-width: 640px`): phone number hides (`display: none`).

---

## Responsive Breakpoint

One breakpoint: `640px`. The design is not mobile-first or desktop-first — it's desktop-designed with targeted mobile overrides at 640px. Every component has explicit mobile rules rather than fluid scaling.

Key mobile deltas:
- `.headline-display`: 52px → 38px
- `.page-content` padding: `--space-xl` side → `--space-md` side
- `.site-header` padding: `--space-xl` → `--space-lg` / `--space-md`
- `.modal-card` padding: 40px → 28px/20px
- `.upload-zone` padding: 48px/32px → 32px/20px
- Multi-column grids (testimonials, booking periods, before/after): all collapse to single column
- `.site-header-phone`: hidden
- Image frame: radius-lg → radius-md

---

## Multi-Tenant Theming (reference)

If building on the same infrastructure, tenants are keyed by slug in Vercel Edge Config. The tenant config shape relevant to theming:

```ts
theme: {
  primary:        string;   // required hex
  primary_hover?: string;   // auto-derived if omitted
  primary_light?: string;   // auto-derived if omitted
  accent?:        string;   // defaults to primary
}
```

Derivation (from `lib/theme.ts`):
- `primary_hover` = HSL lightness − 12, capped at 0
- `primary_light` = HSL lightness + 42 (max 97), saturation − 20 (min 0)
- `accent` = `primary` if not set

The four derived tokens are injected as a `<style>` tag in `<head>` at SSR time. No runtime JS, no flash.

---

## Icon Usage Rules

Icons come from `lucide-react`. Key conventions:

- **Size 16, strokeWidth 1.5** for inline feature bullets and body-level UI.
- **Size 16, strokeWidth 2** for button icons (slightly heavier to match button weight).
- Colour: `var(--brand-accent)` for feature/benefit icons; inherit from parent for UI chrome.
- **Never place icons inside option/selection cards.** The card UI is intentionally text-only so users form their own mental model of the options.
- Navigation and interactive UI chrome (close buttons, chevrons, arrows) can use icons. Prefer CSS-only implementations (the FAQ chevron is pure CSS) for anything that animates.

---

## Do / Don't Quick Reference

| Do | Don't |
|----|-------|
| Use `--brand-primary` for all interactive / selected states | Hardcode a colour outside the token system |
| Use DM Serif Display for emotional + display moments | Use the display font for body copy or small labels |
| Keep body copy at weight 300 or 400 | Use weight 700+ anywhere except score buttons |
| Use `translateY(-1px)` for hover lift on primary buttons | Apply lift to secondary/ghost buttons |
| Use `backdrop-filter: blur` for overlays on images | Use solid dark overlays over content |
| Use `--canvas-off-white` for alternating section backgrounds | Use grey tones outside the defined canvas palette |
| Use a single `transition` declaration at rest | Add transitions only on `:hover` pseudoclass |
| Keep eyebrows to 2–4 uppercase words | Write long eyebrow labels |
| Keep the one breakpoint at 640px | Add intermediate breakpoints |
| Use shadow-xl only for modals and large image frames | Apply heavy shadows to small interactive elements |
