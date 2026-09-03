import type { Dataset } from '@/src/lib/dataset-types';

export type WebMcpMetricView = 'official' | 'derived';
export type WebMcpGrouping = 'best-per-accelerator' | 'all-systems';

export type WebMcpConfiguration = {
  sliceId: string;
  vendor: 'All' | 'AMD' | 'Intel' | 'NVIDIA';
  submitter: string;
  metricView: WebMcpMetricView;
  grouping: WebMcpGrouping;
  search: string;
};

export function listComparisonSlices(dataset: Dataset) {
  return [...dataset.slices]
    .sort((a, b) => b.resultCount - a.resultCount || a.id.localeCompare(b.id))
    .map(slice => ({
      id: slice.id,
      workload: slice.workload,
      scenario: slice.scenario,
      accuracyTarget: slice.accuracyTarget,
      metric: slice.metricId,
      unit: slice.unit,
      resultCount: slice.resultCount,
      comparability: slice.comparability,
    }));
}

export function resolveConfiguration(
  dataset: Dataset,
  current: WebMcpConfiguration,
  input: Partial<WebMcpConfiguration>,
): WebMcpConfiguration {
  const next = { ...current, ...input };
  if (!dataset.slices.some(slice => slice.id === next.sliceId)) throw new Error(`Unknown exact comparison slice: ${next.sliceId}`);
  if (!['All', 'AMD', 'Intel', 'NVIDIA'].includes(next.vendor)) throw new Error(`Unknown vendor: ${next.vendor}`);
  const submitters = new Set(dataset.systems.map(system => system.submitter));
  if (next.submitter !== 'All' && !submitters.has(next.submitter)) throw new Error(`Unknown submitter: ${next.submitter}`);
  if (!['official', 'derived'].includes(next.metricView)) throw new Error(`Unknown metric view: ${next.metricView}`);
  if (!['best-per-accelerator', 'all-systems'].includes(next.grouping)) throw new Error(`Unknown grouping: ${next.grouping}`);
  if (next.search.length > 120) throw new Error('Search text must be at most 120 characters.');
  return next;
}

export function compareAccelerators(
  dataset: Dataset,
  input: { sliceId: string; acceleratorSlugs: string[]; metricView?: WebMcpMetricView },
) {
  const slice = dataset.slices.find(candidate => candidate.id === input.sliceId);
  if (!slice) throw new Error(`Unknown exact comparison slice: ${input.sliceId}`);
  const slugs = [...new Set(input.acceleratorSlugs.map(slug => slug.trim()).filter(Boolean))];
  if (slugs.length < 2 || slugs.length > 8) throw new Error('Choose between 2 and 8 unique accelerator slugs.');
  const metricView = input.metricView ?? 'official';
  const accelerators = new Map(dataset.accelerators.map(accelerator => [accelerator.id, accelerator]));
  const systems = new Map(dataset.systems.map(system => [system.id, system]));
  const wanted = new Set(slugs);
  const candidates = dataset.results
    .filter(result => sliceIdFor(result) === input.sliceId)
    .map(result => ({ result, accelerator: accelerators.get(result.acceleratorId), system: systems.get(result.submittedSystemId) }))
    .filter(item => item.accelerator && item.system && wanted.has(item.accelerator.slug))
    .map(item => ({ ...item, value: metricView === 'official' ? item.result.metric : item.result.perAccelerator }))
    .filter(item => item.value !== null)
    .sort((a, b) => b.value! - a.value! || a.result.id.localeCompare(b.result.id));

  const best = new Map<string, (typeof candidates)[number]>();
  for (const item of candidates) if (!best.has(item.accelerator!.slug)) best.set(item.accelerator!.slug, item);
  const rows = slugs.flatMap(slug => {
    const item = best.get(slug);
    if (!item) return [];
    return [{
      acceleratorSlug: slug,
      vendor: item.accelerator!.vendor,
      family: item.accelerator!.family,
      model: item.accelerator!.model,
      submittedSystem: item.system!.name,
      submitter: item.system!.submitter,
      acceleratorCount: item.system!.acceleratorCount,
      value: item.value!,
      unit: metricView === 'official' ? 'tokens/s' : 'tokens/s/accelerator',
      resultId: item.result.id,
      sourceUrl: item.result.source.url,
      sourceSha256: item.result.source.sha256,
    }];
  }).sort((a, b) => b.value - a.value || a.acceleratorSlug.localeCompare(b.acceleratorSlug));
  const found = new Set(rows.map(row => row.acceleratorSlug));
  const missing = slugs.filter(slug => !found.has(slug)).map(slug => ({ slug, reason: `No verified ${metricView} result exists in this exact slice.` }));
  return {
    slice: { id: slice.id, comparability: slice.comparability },
    metricView,
    rows: rows.map((row, index) => ({ ...row, position: index + 1 })),
    missing,
    datasetVersion: dataset.manifest.snapshotSha256,
  };
}

function sliceIdFor(result: Dataset['results'][number]) {
  return `${result.release}-closed-${result.workload}-${result.scenario.toLowerCase()}-${result.accuracyTarget}-${result.metricId}`;
}
