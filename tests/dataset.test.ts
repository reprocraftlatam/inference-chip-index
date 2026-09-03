import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { dataset, getSliceRows, rankRows, systems } from '../src/lib/index-data';

test('dataset is fixed to the reviewed MLPerf v6.0 boundary', () => {
  assert.equal(dataset.manifest.release, 'v6.0');
  assert.equal(dataset.manifest.division, 'Closed');
  assert.equal(dataset.manifest.sourceCommit, '4d3916ac9cf474b679cdfcf492d43a0559418ad1');
  assert.equal(dataset.manifest.recordCount, 145);
  assert.equal(dataset.manifest.quarantineCount, 0);
});

test('every result has exact provenance and an explicit accelerator count', () => {
  for (const result of dataset.results) {
    assert.match(result.source.sha256, /^sha256:[0-9a-f]{64}$/);
    assert.ok(result.source.url.includes(dataset.manifest.sourceCommit));
    assert.ok(systems.get(result.submittedSystemId)!.acceleratorCount > 0);
    assert.equal(result.perAccelerator, result.metric / systems.get(result.submittedSystemId)!.acceleratorCount);
  }
});

test('rankings never cross an exact comparison slice', () => {
  for (const slice of dataset.slices) {
    const rows = rankRows({ sliceId: slice.id, grouping: 'all-systems' });
    assert.equal(rows.length, getSliceRows(slice.id).length);
    assert.equal(rows.length, slice.resultCount);
    assert.ok(rows.every((row, i) => i === 0 || row.value <= rows[i - 1].value));
  }
});

test('best-per-accelerator deduplicates and vendor filters stay exact', () => {
  const slice = [...dataset.slices].sort((a, b) => b.resultCount - a.resultCount)[0];
  const rows = rankRows({ sliceId: slice.id, vendors: ['AMD'], grouping: 'best-per-accelerator' });
  assert.ok(rows.length > 0);
  assert.ok(rows.every(row => row.acceleratorVendor === 'AMD'));
  assert.equal(new Set(rows.map(row => row.acceleratorSlug)).size, rows.length);
});

test('stored source files agree with their SHA-256 attestations', () => {
  const sample = dataset.results.slice(0, 8);
  for (const result of sample) {
    const body = execFileSync('git', ['-C', '../mlperf-inference-v6', 'show', `${dataset.manifest.sourceCommit}:${result.source.path}`]);
    const hash = `sha256:${createHash('sha256').update(body).digest('hex')}`;
    assert.equal(hash, result.source.sha256);
  }
});
