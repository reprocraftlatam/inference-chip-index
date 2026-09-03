import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { z } from 'zod';
import type { Dataset } from '../src/lib/dataset-types';

const dataset = JSON.parse(readFileSync(resolve('data/generated/dataset.json'), 'utf8')) as Dataset;
const failures: string[] = [];
if (!dataset.results.length) failures.push('no accepted results');
if (new Set(dataset.results.map(r => r.id)).size !== dataset.results.length) failures.push('duplicate logical result IDs');
if (new Set(dataset.results.map(r => r.versionId)).size !== dataset.results.length) failures.push('duplicate content version IDs');
for (const result of dataset.results) {
  if (!Number.isFinite(result.metric) || result.metric <= 0) failures.push(`${result.id}: invalid metric`);
  if (!result.source.url.includes(dataset.manifest.sourceCommit) || !result.source.sha256.startsWith('sha256:')) failures.push(`${result.id}: incomplete provenance`);
  if (result.unit !== 'tokens/s' || result.metricId !== 'tokens-per-second') failures.push(`${result.id}: unknown unit/metric`);
}
const strongest = dataset.slices.map(slice => ({ slice, rows: dataset.results.filter(r => `${r.release}-closed-${r.workload}-${r.scenario.toLowerCase()}-${r.accuracyTarget}-${r.metricId}` === slice.id) }))
  .sort((a,b) => b.rows.length - a.rows.length)[0];
if (!strongest || strongest.rows.length < 3) failures.push('no comparison slice with at least 3 results');
if (strongest) {
  const acceleratorMap = new Map(dataset.accelerators.map(a => [a.id, a]));
  const vendors = new Set(strongest.rows.map(r => acceleratorMap.get(r.acceleratorId)?.vendor));
  const families = new Set(strongest.rows.map(r => acceleratorMap.get(r.acceleratorId)?.family));
  if (vendors.size < 2 || families.size < 2) failures.push('strongest slice lacks two vendors/families');
}
if (!Array.isArray(dataset.tombstones)) failures.push('missing tombstone registry');
if (new Set(dataset.tombstones.map(t => t.id)).size !== dataset.tombstones.length) failures.push('duplicate tombstone IDs');
const snapshotBody = JSON.stringify({ accelerators: dataset.accelerators, systems: dataset.systems, results: dataset.results, slices: dataset.slices, tombstones: dataset.tombstones });
const digest = `sha256:${createHash('sha256').update(snapshotBody).digest('hex')}`;
if (digest !== dataset.manifest.snapshotSha256) failures.push('snapshot hash mismatch');
if (!z.string().regex(/^sha256:[0-9a-f]{64}$/).safeParse(digest).success) failures.push('invalid digest format');
if (failures.length) { console.error(JSON.stringify({ ok: false, failures }, null, 2)); process.exit(1); }
console.log(JSON.stringify({ ok: true, strongestSlice: strongest?.slice.id, strongestRows: strongest?.rows.length, manifest: dataset.manifest }, null, 2));
