import type { Accelerator } from '@/src/lib/dataset-types';

type Match = Pick<Accelerator, 'vendor' | 'family'>;

const reviewedAliases: Array<{ test: RegExp; resolve: (model: string) => Match }> = [
  { test: /AMD\s+Instinct\s+MI355X/i, resolve: () => ({ vendor: 'AMD', family: 'Instinct MI355X' }) },
  { test: /AMD\s+Instinct\s+MI350X/i, resolve: () => ({ vendor: 'AMD', family: 'Instinct MI350X' }) },
  { test: /AMD\s+Instinct\s+MI325X/i, resolve: () => ({ vendor: 'AMD', family: 'Instinct MI325X' }) },
  { test: /Intel.*Arc.*B70/i, resolve: () => ({ vendor: 'Intel', family: 'Arc Pro B70' }) },
  { test: /Intel.*Arc.*B60/i, resolve: () => ({ vendor: 'Intel', family: 'Arc Pro B60' }) },
  { test: /Intel.*Gaudi\s*3/i, resolve: () => ({ vendor: 'Intel', family: 'Gaudi 3' }) },
  { test: /NVIDIA.*GB300/i, resolve: () => ({ vendor: 'NVIDIA', family: 'GB300 NVL72' }) },
  { test: /NVIDIA.*GB200/i, resolve: () => ({ vendor: 'NVIDIA', family: 'GB200 NVL72' }) },
  { test: /NVIDIA.*B300/i, resolve: () => ({ vendor: 'NVIDIA', family: 'B300' }) },
  { test: /NVIDIA.*B200/i, resolve: () => ({ vendor: 'NVIDIA', family: 'B200' }) },
  { test: /NVIDIA.*H200/i, resolve: () => ({ vendor: 'NVIDIA', family: 'H200' }) },
  { test: /NVIDIA.*H100/i, resolve: () => ({ vendor: 'NVIDIA', family: 'H100' }) },
  { test: /NVIDIA.*RTX\s*PRO\s*6000|NVIDIA.*RTXPro6000/i, resolve: () => ({ vendor: 'NVIDIA', family: 'RTX PRO 6000 Blackwell' }) },
  { test: /NVIDIA.*RTX\s*PRO\s*4500|NVIDIA.*RTXPro4500/i, resolve: () => ({ vendor: 'NVIDIA', family: 'RTX PRO 4500 Blackwell' }) },
  { test: /NVIDIA.*L40S/i, resolve: () => ({ vendor: 'NVIDIA', family: 'L40S' }) },
];

export function resolveAccelerator(model: string): Match | null {
  const value = model.trim();
  if (!value || /^(n\/?a|none|unknown)$/i.test(value)) return null;
  return reviewedAliases.find((entry) => entry.test.test(value))?.resolve(value) ?? null;
}

export function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
