import assert from 'node:assert/strict';
import test from 'node:test';
import { dataset } from '@/src/lib/index-data';
import { compareAccelerators, listComparisonSlices, resolveConfiguration } from '@/src/webmcp/leaderboard-tools';

const largestSlice = 'v6.0-closed-gpt-oss-120b-offline-official-default-tokens-per-second';
const amd = 'amd-instinct-mi355x-amd-instinct-mi355x-288gb-hbm3e';
const nvidia = 'nvidia-b200-nvidia-b200-sxm-180gb';

test('WebMCP slice discovery is deterministic and keeps exact dimensions', () => {
  const slices = listComparisonSlices(dataset);
  assert.equal(slices[0].id, largestSlice);
  assert.equal(slices[0].resultCount, 27);
  assert.equal(slices.length, dataset.slices.length);
  assert.ok(slices.every(slice => slice.id.includes(slice.workload) && slice.id.includes(slice.scenario.toLowerCase())));
});

test('WebMCP configuration rejects a nonexistent exact slice', () => {
  const current = { sliceId: largestSlice, vendor: 'All' as const, submitter: 'All', metricView: 'official' as const, grouping: 'best-per-accelerator' as const, search: '' };
  assert.throws(() => resolveConfiguration(dataset, current, { sliceId: 'universal-fastest' }), /Unknown exact comparison slice/);
});

test('WebMCP comparison returns only requested verified slugs with immutable provenance', () => {
  const result = compareAccelerators(dataset, { sliceId: largestSlice, acceleratorSlugs: [amd, nvidia], metricView: 'official' });
  assert.equal(result.rows.length, 2);
  assert.equal(result.missing.length, 0);
  assert.deepEqual(new Set(result.rows.map(row => row.acceleratorSlug)), new Set([amd, nvidia]));
  assert.ok(result.rows.every(row => row.sourceUrl.includes('4d3916ac9cf474b679cdfcf492d43a0559418ad1')));
  assert.ok(result.rows.every(row => /^sha256:[a-f0-9]{64}$/.test(row.sourceSha256)));
  assert.ok(result.rows[0].value >= result.rows[1].value);
});

test('WebMCP comparison explains missing evidence instead of fabricating it', () => {
  const result = compareAccelerators(dataset, { sliceId: largestSlice, acceleratorSlugs: [amd, 'fictional-accelerator'], metricView: 'official' });
  assert.equal(result.rows.length, 1);
  assert.deepEqual(result.missing, [{ slug: 'fictional-accelerator', reason: 'No verified official result exists in this exact slice.' }]);
});
