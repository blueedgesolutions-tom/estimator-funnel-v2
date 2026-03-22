import type { PoolModel } from '../types';

export const KISOL_NAME = 'Kisol';

export const KISOL_MODELS: Omit<PoolModel, 'basePrice' | 'enabled'>[] = [
  {
    id: 'kisol-havai',
    name: 'Hawaii',
    width: 11.3,
    length: 19.7,
    material: 'fiberglass',
    manufacturer: 'Kisol',
    images: ['https://ngmvirieuuayqpqqowqx.supabase.co/storage/v1/object/public/funnel-assets/pools/1772989521455-c27kur.webp'],
  },
  {
    id: 'kisol-infinity-escada',
    name: 'Infinity Escada',
    width: 9.8,
    length: 19.6,
    material: 'fiberglass',
    manufacturer: 'Kisol',
    images: ['https://ngmvirieuuayqpqqowqx.supabase.co/storage/v1/object/public/funnel-assets/pools/1772989528808-wjgs3.webp'],
  },
  {
    id: 'kisol-infinity-praia',
    name: 'Infinity Praia',
    width: 9.8,
    length: 19.6,
    material: 'fiberglass',
    manufacturer: 'Kisol',
    images: ['https://ngmvirieuuayqpqqowqx.supabase.co/storage/v1/object/public/funnel-assets/pools/1772989533485-t5zqtb.webp'],
  },
  {
    id: 'kisol-mediterranea',
    name: 'Mediterranea',
    width: 9.9,
    length: 19.7,
    material: 'fiberglass',
    manufacturer: 'Kisol',
    images: ['https://ngmvirieuuayqpqqowqx.supabase.co/storage/v1/object/public/funnel-assets/pools/1772989537071-ul8mq.webp'],
  },
];
