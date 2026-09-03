import assert from 'node:assert/strict';
import test from 'node:test';
import { assignCompetitionRanks, dataset, paginateRows, rankRows } from '../src/lib/index-data';

test('competition ranking preserves ties and skips following positions', () => {
  assert.deepEqual(assignCompetitionRanks([{ value: 10 }, { value: 10 }, { value: 8 }]).map(x => x.rank), [1, 1, 3]);
});

test('pagination preserves global ranks and enforces response bounds', () => {
  const slice = [...dataset.slices].sort((a, b) => b.resultCount - a.resultCount)[0];
  const ranked = rankRows({ sliceId: slice.id, grouping: 'all-systems' });
  const second = paginateRows(ranked, 2, 5);
  assert.equal(second.rows[0].rank >= 6, true);
  assert.equal(second.total, ranked.length);
  assert.equal(paginateRows(ranked, 1, 500).pageSize, 50);
});

test('official and derived views keep units explicit and arithmetic traceable', () => {
  const slice = [...dataset.slices].sort((a, b) => b.resultCount - a.resultCount)[0];
  const official = rankRows({ sliceId: slice.id, metricView: 'official', grouping: 'all-systems' });
  const derived = rankRows({ sliceId: slice.id, metricView: 'derived', grouping: 'all-systems' });
  assert.ok(official.every(row => row.unit === 'tokens/s' && row.metricView === 'official'));
  assert.ok(derived.every(row => row.unit === 'tokens/s/accelerator' && row.metricView === 'derived'));
  for (const row of derived) {
    const original = dataset.results.find(result => result.id === row.resultId)!;
    assert.equal(row.value, original.metric / row.acceleratorCount);
  }
});

test('maximum ranked response remains below one MiB', () => {
  const slice = [...dataset.slices].sort((a, b) => b.resultCount - a.resultCount)[0];
  const rows = paginateRows(rankRows({ sliceId: slice.id, grouping: 'all-systems' }), 1, 50);
  assert.ok(Buffer.byteLength(JSON.stringify(rows)) < 1024 * 1024);
});
