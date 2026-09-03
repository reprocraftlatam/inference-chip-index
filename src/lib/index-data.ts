import datasetJson from '@/data/generated/dataset.json';
import type { Accelerator, BenchmarkResult, ComparisonSlice, Dataset, SubmittedSystem } from './dataset-types';

export const dataset = datasetJson as Dataset;
export const accelerators = new Map(dataset.accelerators.map(item => [item.id, item]));
export const systems = new Map(dataset.systems.map(item => [item.id, item]));

export type MetricView = 'official' | 'derived';
export type Grouping = 'best-per-accelerator' | 'all-systems';

export type RankedRow = {
  rank: number;
  resultId: string;
  acceleratorSlug: string;
  acceleratorVendor: Accelerator['vendor'];
  acceleratorFamily: string;
  acceleratorModel: string;
  submittedSystem: string;
  submitter: string;
  acceleratorCount: number;
  value: number;
  unit: 'tokens/s' | 'tokens/s/accelerator';
  metricView: MetricView;
  sourceUrl: string;
  sourceSha256: string;
};

export function getSlice(id: string): ComparisonSlice | undefined {
  return dataset.slices.find(slice => slice.id === id);
}

export function getSliceRows(sliceId: string) {
  return dataset.results.filter(result => sliceIdFor(result) === sliceId);
}

export function sliceIdFor(result: BenchmarkResult) {
  return `${result.release}-closed-${result.workload}-${result.scenario.toLowerCase()}-${result.accuracyTarget}-${result.metricId}`;
}

export function rankRows(options: {
  sliceId: string;
  vendors?: string[];
  metricView?: MetricView;
  grouping?: Grouping;
}) {
  const metricView = options.metricView ?? 'official';
  const grouping = options.grouping ?? 'best-per-accelerator';
  const vendorSet = new Set(options.vendors ?? []);
  let records = getSliceRows(options.sliceId).filter(result => {
    const accelerator = accelerators.get(result.acceleratorId);
    return accelerator && (!vendorSet.size || vendorSet.has(accelerator.vendor));
  });
  if (metricView === 'derived') records = records.filter(result => result.perAccelerator !== null);
  records.sort((a, b) => metricValue(b, metricView) - metricValue(a, metricView) || a.id.localeCompare(b.id));
  if (grouping === 'best-per-accelerator') {
    const seen = new Set<string>();
    records = records.filter(record => seen.has(record.acceleratorId) ? false : (seen.add(record.acceleratorId), true));
  }
  return assignCompetitionRanks(records.map(result => ({ result, value: metricValue(result, metricView) })))
    .map(({ result, rank }) => toRow(result, metricView, rank));
}

export function assignCompetitionRanks<T extends { value: number }>(rows: T[]) {
  let previousValue: number | null = null;
  let previousRank = 0;
  return rows.map((row, index) => {
    const rank = previousValue === row.value ? previousRank : index + 1;
    previousValue = row.value;
    previousRank = rank;
    return { ...row, rank };
  });
}

export function paginateRows<T>(rows: T[], page: number, pageSize: number) {
  const safePage = Math.max(1, Math.floor(page));
  const safeSize = Math.min(50, Math.max(1, Math.floor(pageSize)));
  const start = (safePage - 1) * safeSize;
  return { page: safePage, pageSize: safeSize, total: rows.length, rows: rows.slice(start, start + safeSize) };
}

function metricValue(result: BenchmarkResult, view: MetricView) {
  return view === 'derived' ? result.perAccelerator ?? Number.NEGATIVE_INFINITY : result.metric;
}

function toRow(result: BenchmarkResult, metricView: MetricView, rank: number): RankedRow {
  const accelerator = accelerators.get(result.acceleratorId)!;
  const system = systems.get(result.submittedSystemId)!;
  return {
    rank,
    resultId: result.id,
    acceleratorSlug: accelerator.slug,
    acceleratorVendor: accelerator.vendor,
    acceleratorFamily: accelerator.family,
    acceleratorModel: accelerator.model,
    submittedSystem: system.name,
    submitter: system.submitter,
    acceleratorCount: system.acceleratorCount,
    value: metricValue(result, metricView),
    unit: metricView === 'derived' ? 'tokens/s/accelerator' : 'tokens/s',
    metricView,
    sourceUrl: result.source.url,
    sourceSha256: result.source.sha256,
  };
}

export function systemFor(result: BenchmarkResult): SubmittedSystem {
  return systems.get(result.submittedSystemId)!;
}
