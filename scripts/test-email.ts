import { Resend } from 'resend';
import { buildEstimateEmailHtml } from '../lib/email';
import type { TenantConfig, FunnelData } from '../lib/types';

const tenant: TenantConfig = {
  version: '1.0',
  config: {
    brand_name: 'AquaDreams',
    company_name: 'AquaDreams Pool Company',
    city: 'Austin',
    contact_phone: '(512) 555-0100',
    contact_email: 'hello@aquadreams.com',
    logo_url: '',
    privacy_policy_url: '',
    ghl_webhook_url: '',
    theme: { primary: '#1B6CA8' },
  },
  catalog: {
    poolModels: [
      { id: 'laguna', name: 'Laguna', width: 14, length: 28, basePrice: 62000 },
    ],
    equipmentOptions: [
      { id: 'spa',          name: 'Built-in Spa',         price: 18000 },
      { id: 'led-lighting', name: 'LED Color Lighting',   price: 3200 },
      { id: 'automation',   name: 'Smart Automation',     price: 4500 },
    ],
    deckingOptions: [
      { id: 'travertine', name: 'Travertine Pavers', pricePerSqft: 28 },
    ],
    deckingPresetWidths: [],
    minimumDeckingWidth: 4,
  },
  estimate: {
    serviceArea: { enabled: false, lat: 0, lng: 0, radiusMiles: 0, warningMessage: '', strictMode: false },
    bookingEnabled: true,
  },
};

const funnelData: FunnelData = {
  name:                 'Thomas Larouche',
  email:                'thomas_larouche@outlook.com',
  phone:                '(512) 555-0199',
  poolModel:            'laguna',
  options:              ['spa', 'led-lighting', 'automation'],
  deckingType:          'travertine',
  paverSquareFootage:   650,
  timeline:             '6–12 months',
  estimatedPrice:       97050,
  address: {
    formatted_address: '4821 Shoal Creek Blvd, Austin, TX 78756',
    place_id: '',
    lat: 0,
    lng: 0,
  },
};

const html = buildEstimateEmailHtml({ funnelData, tenant });

const resend = new Resend(process.env.RESEND_API_KEY);

resend.emails.send({
  from: 'AquaDreams <noreply@pooldesignrequest.com>',
  to: ['thomas_larouche@outlook.com'],
  subject: 'Your pool estimate from AquaDreams',
  html,
}).then(({ data, error }) => {
  if (error) {
    console.error('Send failed:', error);
  } else {
    console.log('Sent:', data?.id);
  }
});
