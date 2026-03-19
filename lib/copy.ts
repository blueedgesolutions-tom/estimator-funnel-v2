import type { TenantConfig, TenantConfigData, FaqItem, Testimonial } from './types';

// ─────────────────────────────────────────────────────────
// INTERPOLATION
// Replaces {{token}} placeholders with tenant data values.
// ─────────────────────────────────────────────────────────

export function interpolate(
  template: string,
  vars: Record<string, string>
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? '');
}

function buildVars(config: TenantConfigData): Record<string, string> {
  return {
    brandName: config.brand_name,
    companyName: config.company_name,
    city: config.city,
    area: config.area ?? config.city,
    phone: config.contact_phone,
    email: config.contact_email,
  };
}

// ─────────────────────────────────────────────────────────
// DEFAULT COPY TEMPLATES
// All {{token}} placeholders are resolved at runtime.
// Override any key via tenant.copy in Edge Config.
// ─────────────────────────────────────────────────────────

export const DEFAULT_COPY_TEMPLATES: Record<string, string> = {
  // Intro
  'intro.eyebrow':       'For {{city}} Homeowners Only',
  'intro.headline':      'Get an Accurate Price for Your Custom Pool Project',
  'intro.subheadline':   'See real numbers based on our actual pricing data. No rep required.',
  'intro.cta':           'Get my Instant Quote',
  'intro.trust1':        'Instant estimate',
  'intro.trust2':        'No obligation',
  'intro.trust3':        'Real Pricing',

  // Pool Model
  'poolModel.eyebrow':     'Step 1 of 5',
  'poolModel.headline':    'Choose your pool',
  'poolModel.subheadline': 'Select the model that best fits your yard and vision. All sizes are approximate and include both freeform and geometric layouts. We can refine during your consultation if needed.',
  'poolModel.deckingLabel': 'Add pool decking?',
  'poolModel.deckingSubLabel': 'Choose a material and coverage. We\'ll calculate the area based on your pool size.',

  // Options
  'options.eyebrow':     'Step 2 of 5',
  'options.headline':    'Personalise your pool',
  'options.subheadline': 'Select the features and upgrades you\'d like. Each is individually priced; simply spec out your project in a way that reflects your budget.',

  // Timeline
  'timeline.eyebrow':     'Step 3 of 5',
  'timeline.headline':    'When are you planning to build?',
  'timeline.subheadline': 'This helps us provide the best service timeline for you',


  // Address
  'address.eyebrow':     'Step 4 of 5',
  'address.headline':    'Where is the property?',
  'address.subheadline': 'We\'ll use this to confirm we serve your area and tailor your estimate.',
  'address.placeholder': 'Start typing your address…',

  // Contact
  'contact.eyebrow':     'Step 5 of 5',
  'contact.headline':    'Where should we send your estimate?',
  'contact.subheadline': 'Your personalised custom pool estimate will be ready in seconds.',
  'contact.consent':     'By continuing you agree to our privacy policy and consent to be contacted by {{companyName}} regarding your pool project.',

  // Booking
  'booking.eyebrow':     'One last step',
  'booking.headline':    'Book your free consultation',
  'booking.subheadline': 'A {{brandName}} design expert will walk you through your estimate, refine the details, and answer any questions. No cost, no obligation.',
  'booking.confirmCta':  'Confirm appointment',
  'booking.skipCta':     'Skip for now',

  // Results
  'results.eyebrow':              'Your Custom Pool Estimate',
  'results.headline':             'Here\'s your personalised pool estimate',
  'results.rangeNote':            'This estimate is based on your selections. Final pricing is confirmed after your free site consultation.',
  'results.whyRangeHeadline':     'Why is this a range?',
  'results.whyRangeBody':         'Pool costs vary based on site conditions, soil type, access, and material availability at the time of construction. Your consultation will produce a precise quote. The ±10% range reflects typical real-world variation on projects like yours.',
  'results.estimateCardEyebrow':  'Your Selection',
  'results.estimateCardHeadline': 'What\'s included',
  'results.ctaEyebrow':           'Next Step',
  'results.ctaHeadline':          'Talk to a pool design expert',
  'results.ctaSubheadline':       'Book a free, no-obligation consultation. We\'ll review your estimate, walk through the design options, and give you a precise quote for your specific property.',
  'results.ctaButton':            'Schedule a free consultation',
  'results.financingEyebrow':     'Financing Available',
  'results.financingHeadline':    'Make it work with your budget',
  'results.financingNote':        '*Estimated monthly payment based on {{apr}}% APR over {{term}} years. Subject to credit approval. Contact us for current financing options.',
  'results.testimonialsEyebrow':  'Real Results',
  'results.testimonialsHeadline': 'Here\'s what other homeowners had to say about working with {{brandName}}',
  'results.faqEyebrow':           'FAQ',
  'results.faqHeadline':          'Questions about your estimate',
  'results.nextStepsEyebrow':     'What Happens Next',
  'results.nextStepsHeadline':    'Your path to a finished pool',
  'results.notReadyHeadline':     'Not ready to talk yet?',
  'results.notReadySubheadline':  'Download your estimate and come back whenever you\'re ready.',
  'results.notReadyCta':          'Download estimate PDF',
  'results.startOver':            'Start over',

  // Booked confirmation
  'results.bookedHeadline':    'You\'re all set, {{firstName}}!',
  'results.bookedSubheadline': 'Your consultation is confirmed for {{date}} in the {{timeSlot}}. We\'ll be in touch shortly to confirm the details.',

  // Out of service area
  'results.outOfAreaNote':     'Your property is outside our standard service area. We\'ve saved your estimate — contact us directly to discuss your project.',
};

// ─────────────────────────────────────────────────────────
// DEFAULT FAQs
// ─────────────────────────────────────────────────────────

export const DEFAULT_FAQS: FaqItem[] = [
  {
    question: 'How accurate is this estimate?',
    answer: 'Our estimates are based on real project data and your specific selections. They typically come within 5–10% of the final quoted price. A site visit allows us to confirm soil conditions, access, and any site-specific factors that can affect cost.',
  },
  {
    question: 'What does the estimate include?',
    answer: 'The estimate covers pool shell construction, equipment (pump, filter, selected upgrades), plumbing, electrical, and decking if selected. It does not include permits (which vary by municipality), landscaping, or fencing.',
  },
  {
    question: 'How long does pool construction take?',
    answer: 'Most residential pools take 8–14 weeks from permit approval to completion, depending on weather, site conditions, and finish selections. We\'ll give you a precise timeline during your consultation.',
  },
  {
    question: 'Do you handle permits?',
    answer: 'Yes, we manage the full permitting process on your behalf. Permit costs are calculated based on your municipality\'s fee schedule and added to your final contract.',
  },
  {
    question: 'Is financing available?',
    answer: 'Yes. We partner with leading pool financing providers to offer competitive rates. Your consultant will walk you through options during your free consultation.',
  },
  {
    question: 'What is the warranty?',
    answer: 'We offer a structural warranty on the pool shell, plus manufacturer warranties on all equipment. Full warranty details are included in your project contract.',
  },
];

// ─────────────────────────────────────────────────────────
// RESOLVED COPY
// ─────────────────────────────────────────────────────────

export interface ResolvedCopy {
  // Intro
  intro: { eyebrow: string; headline: string; subheadline: string; cta: string; trust1: string; trust2: string; trust3: string };
  // Steps
  poolModel: { eyebrow: string; headline: string; subheadline: string; deckingLabel: string; deckingSubLabel: string };
  options: { eyebrow: string; headline: string; subheadline: string };
  timeline: { eyebrow: string; headline: string; subheadline: string };
  address: { eyebrow: string; headline: string; subheadline: string; placeholder: string };
  contact: { eyebrow: string; headline: string; subheadline: string; consent: string };
  booking: { eyebrow: string; headline: string; subheadline: string; confirmCta: string; skipCta: string };
  // Results
  results: {
    eyebrow: string; headline: string; rangeNote: string;
    whyRangeHeadline: string; whyRangeBody: string;
    estimateCardEyebrow: string; estimateCardHeadline: string;
    ctaEyebrow: string; ctaHeadline: string; ctaSubheadline: string; ctaButton: string;
    financingEyebrow: string; financingHeadline: string; financingNote: string;
    testimonialsEyebrow: string; testimonialsHeadline: string;
    faqEyebrow: string; faqHeadline: string;
    nextStepsEyebrow: string; nextStepsHeadline: string;
    notReadyHeadline: string; notReadySubheadline: string; notReadyCta: string; startOver: string;
    bookedHeadline: string; bookedSubheadline: string;
    outOfAreaNote: string;
  };
  // Content
  faqs: FaqItem[];
  testimonials: Testimonial[];
}

export function resolveCopy(
  tenant: TenantConfig,
  extraVars?: Record<string, string>
): ResolvedCopy {
  const vars = { ...buildVars(tenant.config), ...extraVars };

  const get = (key: string): string => {
    const template = tenant.copy?.[key] || DEFAULT_COPY_TEMPLATES[key] || '';
    return interpolate(template, vars);
  };

  return {
    intro: {
      eyebrow:    get('intro.eyebrow'),
      headline:   get('intro.headline'),
      subheadline: get('intro.subheadline'),
      cta:        get('intro.cta'),
      trust1:     get('intro.trust1'),
      trust2:     get('intro.trust2'),
      trust3:     get('intro.trust3'),
    },
    poolModel: {
      eyebrow:      get('poolModel.eyebrow'),
      headline:     get('poolModel.headline'),
      subheadline:  get('poolModel.subheadline'),
      deckingLabel:    get('poolModel.deckingLabel'),
      deckingSubLabel: get('poolModel.deckingSubLabel'),
    },
    options: {
      eyebrow:    get('options.eyebrow'),
      headline:   get('options.headline'),
      subheadline: get('options.subheadline'),
    },
    timeline: {
      eyebrow:    get('timeline.eyebrow'),
      headline:   get('timeline.headline'),
      subheadline: get('timeline.subheadline'),
    },
    address: {
      eyebrow:     get('address.eyebrow'),
      headline:    get('address.headline'),
      subheadline: get('address.subheadline'),
      placeholder: get('address.placeholder'),
    },
    contact: {
      eyebrow:     get('contact.eyebrow'),
      headline:    get('contact.headline'),
      subheadline: get('contact.subheadline'),
      consent:     get('contact.consent'),
    },
    booking: {
      eyebrow:     get('booking.eyebrow'),
      headline:    get('booking.headline'),
      subheadline: get('booking.subheadline'),
      confirmCta:  get('booking.confirmCta'),
      skipCta:     get('booking.skipCta'),
    },
    results: {
      eyebrow:               get('results.eyebrow'),
      headline:              get('results.headline'),
      rangeNote:             get('results.rangeNote'),
      whyRangeHeadline:      get('results.whyRangeHeadline'),
      whyRangeBody:          get('results.whyRangeBody'),
      estimateCardEyebrow:   get('results.estimateCardEyebrow'),
      estimateCardHeadline:  get('results.estimateCardHeadline'),
      ctaEyebrow:            get('results.ctaEyebrow'),
      ctaHeadline:           get('results.ctaHeadline'),
      ctaSubheadline:        get('results.ctaSubheadline'),
      ctaButton:             get('results.ctaButton'),
      financingEyebrow:      get('results.financingEyebrow'),
      financingHeadline:     get('results.financingHeadline'),
      financingNote:         get('results.financingNote'),
      testimonialsEyebrow:   get('results.testimonialsEyebrow'),
      testimonialsHeadline:  get('results.testimonialsHeadline'),
      faqEyebrow:            get('results.faqEyebrow'),
      faqHeadline:           get('results.faqHeadline'),
      nextStepsEyebrow:      get('results.nextStepsEyebrow'),
      nextStepsHeadline:     get('results.nextStepsHeadline'),
      notReadyHeadline:      get('results.notReadyHeadline'),
      notReadySubheadline:   get('results.notReadySubheadline'),
      notReadyCta:           get('results.notReadyCta'),
      startOver:             get('results.startOver'),
      bookedHeadline:        get('results.bookedHeadline'),
      bookedSubheadline:     get('results.bookedSubheadline'),
      outOfAreaNote:         get('results.outOfAreaNote'),
    },
    faqs:         tenant.config.faqs ?? DEFAULT_FAQS,
    testimonials: tenant.config.testimonials ?? [],
  };
}
