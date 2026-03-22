import { KISOL_MODELS, KISOL_NAME } from './kisol';
import type { ManufacturerDef } from '../types';

export const MANUFACTURERS: ManufacturerDef[] = [
  { id: 'kisol', name: KISOL_NAME, models: KISOL_MODELS },
];

export function findManufacturer(id: string): ManufacturerDef | undefined {
  return MANUFACTURERS.find((m) => m.id === id);
}
