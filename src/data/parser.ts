import { z } from 'zod';

export const systemSchema = z.object({
  submitter: z.string().min(1),
  system_name: z.string().min(1),
  division: z.string().optional(),
  status: z.string().optional(),
  accelerator_model_name: z.string().min(1),
  accelerators_per_node: z.union([z.string(), z.number()]),
  number_of_nodes: z.union([z.string(), z.number()]),
  accelerator_memory_capacity: z.string().optional(),
  framework: z.string().optional(),
  operating_system: z.string().optional(),
});

export function numericInteger(value: string | number) {
  const text = String(value).trim();
  if (!/^\d+$/.test(text)) return null;
  const number = Number(text);
  return Number.isSafeInteger(number) && number > 0 && number <= 1024 ? number : null;
}

export function parseMetric(summary: string) {
  const match = summary.match(/^(?:Completed\s+)?Tokens per second\s*:\s*([0-9]+(?:\.[0-9]+)?)/im);
  const value = match ? Number(match[1]) : Number.NaN;
  return Number.isFinite(value) && value > 0 ? value : null;
}
