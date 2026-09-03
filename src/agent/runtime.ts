import 'server-only';
import { createAgent } from '@lucid-agents/core';
import { http } from '@lucid-agents/http';
import { payments, paymentsFromEnv } from '@lucid-agents/payments';
import { z } from 'zod';
import { accelerators, dataset, getSlice, paginateRows, rankRows } from '@/src/lib/index-data';

const sliceId = z.string().min(10).max(180);
const vendor = z.enum(['AMD', 'Intel', 'NVIDIA']);
const metricViewValue = z.enum(['official', 'derived']);
const groupingValue = z.enum(['best-per-accelerator', 'all-systems']);
const metricView = metricViewValue.default('official');
const grouping = groupingValue.default('best-per-accelerator');

const rowSchema = z.object({
  rank: z.number().int().positive(), resultId: z.string(), acceleratorSlug: z.string(),
  acceleratorVendor: vendor, acceleratorFamily: z.string(), acceleratorModel: z.string(),
  submittedSystem: z.string(), submitter: z.string(), acceleratorCount: z.number().int().positive(),
  value: z.number().positive(), unit: z.enum(['tokens/s', 'tokens/s/accelerator']), metricView: metricViewValue,
  sourceUrl: z.string().url(), sourceSha256: z.string().regex(/^sha256:[0-9a-f]{64}$/),
});

const statusOutput = z.object({
  manifest: z.object({
    release: z.literal('v6.0'), division: z.literal('Closed'), sourceCommit: z.string(), sourceRepository: z.string(),
    generatedAt: z.string(), reviewedAt: z.string(), freshness: z.literal('pinned'), snapshotSha256: z.string(),
    recordCount: z.number(), systemCount: z.number(), acceleratorCount: z.number(), quarantineCount: z.number(),
  }),
  source: z.object({ repository: z.string().url(), commit: z.string().url() }),
  sliceIds: z.array(z.string()),
  packageVersions: z.object({ core: z.literal('5.0.0'), http: z.literal('4.0.0'), payments: z.literal('5.0.0') }),
});

const paymentsConfig = paymentsFromEnv(undefined, {
  PAYMENTS_RECEIVABLE_ADDRESS: process.env.PAYMENTS_RECEIVABLE_ADDRESS,
  PAYMENTS_FACILITATOR_URL: process.env.PAYMENTS_FACILITATOR_URL,
  PAYMENTS_NETWORK: process.env.PAYMENTS_NETWORK,
  PAYMENTS_FACILITATOR_AUTH: process.env.PAYMENTS_FACILITATOR_AUTH,
});

export const runtime = await createAgent({
  name: 'Inference Chip Index',
  version: '1.0.0',
  description: 'Exact-slice MLPerf Inference v6.0 comparisons with immutable provenance.',
  url: process.env.NEXT_PUBLIC_SITE_URL,
  type: 'website',
})
  .use(payments({ config: paymentsConfig }))
  .use(http({ basePath: '/api/agent', servicePage: false }))
  .addEntrypoint({
    key: 'get-dataset-status',
    description: 'Free manifest, freshness, source commit, record counts, source links, and exact comparison slice IDs.',
    input: z.object({}).default({}),
    output: statusOutput,
    handler: async () => ({ output: {
      manifest: dataset.manifest,
      source: {
        repository: 'https://github.com/mlcommons/inference_results_v6.0',
        commit: `https://github.com/mlcommons/inference_results_v6.0/tree/${dataset.manifest.sourceCommit}`,
      },
      sliceIds: dataset.slices.map(slice => slice.id),
      packageVersions: { core: '5.0.0' as const, http: '4.0.0' as const, payments: '5.0.0' as const },
    } }),
  })
  .addEntrypoint({
    key: 'preview-inference-chips',
    description: 'Free preview of up to five verified rows for one exact comparison slice.',
    input: z.object({ sliceId: sliceId.optional() }).default({}),
    output: z.object({ datasetVersion: z.string(), slice: z.string(), comparability: z.string(), rows: z.array(rowSchema).max(5) }),
    handler: async ({ input }) => {
      const selected = input.sliceId && getSlice(input.sliceId) ? input.sliceId : [...dataset.slices].sort((a,b)=>b.resultCount-a.resultCount)[0].id;
      return { output: { datasetVersion: dataset.manifest.snapshotSha256, slice: selected, comparability: getSlice(selected)!.comparability, rows: rankRows({ sliceId: selected }).slice(0, 5) } };
    },
  })
  .addEntrypoint({
    key: 'rank-inference-chips',
    description: 'Paid exact-slice ranking with vendor filters, grouping, bounded pagination, and official or derived metric view.',
    input: z.object({ sliceId, vendors: z.array(vendor).max(3).optional(), metricView, grouping, page: z.number().int().min(1).max(100).default(1), pageSize: z.number().int().min(1).max(50).default(20) }),
    output: z.object({ datasetVersion: z.string(), slice: z.string(), comparability: z.string(), metricView: metricViewValue, grouping: groupingValue, page: z.number(), pageSize: z.number(), total: z.number(), rows: z.array(rowSchema).max(50) }),
    price: '0.02', paymentProtocol: 'x402', network: 'eip155:84532',
    handler: async ({ input }) => {
      const selected = getSlice(input.sliceId);
      if (!selected) throw new Error('Unknown exact comparison slice');
      const rows = rankRows(input);
      const page = paginateRows(rows, input.page, input.pageSize);
      return { output: { datasetVersion: dataset.manifest.snapshotSha256, slice: selected.id, comparability: selected.comparability, metricView: input.metricView, grouping: input.grouping, ...page } };
    },
  })
  .addEntrypoint({
    key: 'compare-inference-chips',
    description: 'Paid comparison of 2–8 accelerator slugs inside one exact slice, with explicit missing-evidence reasons and optional baseline deltas.',
    input: z.object({ sliceId, acceleratorSlugs: z.array(z.string()).min(2).max(8), baselineSlug: z.string().optional(), metricView }),
    output: z.object({ datasetVersion: z.string(), slice: z.string(), comparability: z.string(), metricView: metricViewValue, baselineSlug: z.string().nullable(), rows: z.array(rowSchema).max(8), missing: z.array(z.object({ acceleratorSlug: z.string(), reason: z.string() })).max(8), deltas: z.array(z.object({ acceleratorSlug: z.string(), baselineSlug: z.string(), absolute: z.number(), percent: z.number() })).max(8) }),
    price: '0.03', paymentProtocol: 'x402', network: 'eip155:84532',
    handler: async ({ input }) => {
      const selected = getSlice(input.sliceId);
      if (!selected) throw new Error('Unknown exact comparison slice');
      const ranked = rankRows({ sliceId: input.sliceId, metricView: input.metricView, grouping: 'best-per-accelerator' });
      const bySlug = new Map(ranked.map(row => [row.acceleratorSlug, row]));
      const rows = input.acceleratorSlugs.flatMap(slug => bySlug.get(slug) ? [bySlug.get(slug)!] : []);
      const missing = input.acceleratorSlugs.filter(slug => !bySlug.has(slug)).map(slug => ({ acceleratorSlug: slug, reason: accelerators.size && dataset.accelerators.some(a => a.slug === slug) ? 'No valid result exists for this exact slice.' : 'Unknown accelerator slug.' }));
      const baseline = input.baselineSlug ? bySlug.get(input.baselineSlug) : undefined;
      const deltas = baseline ? rows.filter(row => row.acceleratorSlug !== baseline.acceleratorSlug).map(row => ({ acceleratorSlug: row.acceleratorSlug, baselineSlug: baseline.acceleratorSlug, absolute: row.value - baseline.value, percent: ((row.value - baseline.value) / baseline.value) * 100 })) : [];
      return { output: { datasetVersion: dataset.manifest.snapshotSha256, slice: selected.id, comparability: selected.comparability, metricView: input.metricView, baselineSlug: baseline?.acceleratorSlug ?? null, rows, missing, deltas } };
    },
  })
  .build();
