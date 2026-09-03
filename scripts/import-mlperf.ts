import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { resolveAccelerator, slugify } from '../src/data/alias-registry';
import { METRICS } from '../src/data/metric-registry';
import { numericInteger, parseMetric, systemSchema } from '../src/data/parser';
import { SOURCE, sourceUrl } from '../src/data/source-registry';
import type { Accelerator, BenchmarkResult, ComparisonSlice, Dataset, QuarantineRecord, SourceRef, SubmittedSystem } from '../src/lib/dataset-types';

const mode = process.argv.includes('--mode') ? process.argv[process.argv.indexOf('--mode') + 1] : 'fixture';
if (mode !== 'fixture' && mode !== 'full-source') throw new Error(`Unknown mode: ${mode}`);

const repo = resolve(process.env.MLPERF_REPO ?? '../mlperf-inference-v6');
const outDir = resolve('data/generated');
const fixtureSelection = [
  'closed/AMD/results/8xMI355X_2xEPYC_9575F/gpt-oss-120b/Offline/performance/run_1/mlperf_log_summary.txt',
  'closed/Intel/results/1-node-4x-BMG-B60/gpt-oss-120b/Offline/performance/run_1/mlperf_log_summary.txt',
  'closed/NVIDIA/results/B300-SXM-270GBx8_TRT/gpt-oss-120b/Offline/performance/run_1/mlperf_log_summary.txt',
];

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');
const stable = (value: unknown) => JSON.stringify(value, Object.keys(value as object).sort());

function git(...args: string[]) {
  return execFileSync('git', ['-C', repo, ...args], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
}

function readAt(path: string) {
  return git('show', `${SOURCE.commit}:${path}`).replace(/\r\n/g, '\n');
}

function ref(path: string, body: string): SourceRef {
  return { repository: SOURCE.repository, commit: SOURCE.commit, path, url: sourceUrl(path), sha256: `sha256:${sha256(body)}` };
}

function resultPaths() {
  const paths = git('ls-tree', '-r', '--name-only', SOURCE.commit).split(/\r?\n/).filter(Boolean);
  const accepted = paths.filter((path) => /^closed\/[^/]+\/results\/[^/]+\/(llama3\.1-8b|gpt-oss-120b|deepseek-r1)\/(Offline|Server|Interactive)\/performance\/run_1\/mlperf_log_summary\.txt$/.test(path));
  return mode === 'fixture' ? fixtureSelection : accepted;
}

function parsePath(path: string) {
  const parts = path.split('/');
  return { submitter: parts[1], systemKey: parts[3], workload: parts[4] as BenchmarkResult['workload'], scenario: parts[5] as BenchmarkResult['scenario'] };
}

const accelerators = new Map<string, Accelerator>();
const systems = new Map<string, SubmittedSystem>();
const results: BenchmarkResult[] = [];
const quarantine: QuarantineRecord[] = [];

for (const path of resultPaths()) {
  try {
    const parsedPath = parsePath(path);
    const systemPath = `closed/${parsedPath.submitter}/systems/${parsedPath.systemKey}.json`;
    let systemBody: string;
    try { systemBody = readAt(systemPath); }
    catch { quarantine.push({ path, reason: 'missing-system-evidence', detail: systemPath }); continue; }

    const parsedSystem = systemSchema.safeParse(JSON.parse(systemBody));
    if (!parsedSystem.success) { quarantine.push({ path, reason: 'invalid-system-schema', detail: parsedSystem.error.issues.map(i => i.path.join('.')).join(', ') }); continue; }
    const sourceSystem = parsedSystem.data;
    const alias = resolveAccelerator(sourceSystem.accelerator_model_name);
    if (!alias) { quarantine.push({ path, reason: 'unreviewed-accelerator-identity', detail: sourceSystem.accelerator_model_name }); continue; }
    const perNode = numericInteger(sourceSystem.accelerators_per_node);
    const nodeCount = numericInteger(sourceSystem.number_of_nodes);
    if (!perNode || !nodeCount) { quarantine.push({ path, reason: 'ambiguous-accelerator-count', detail: `${sourceSystem.accelerators_per_node} × ${sourceSystem.number_of_nodes}` }); continue; }

    const summary = readAt(path);
    if (!/Result is\s*:\s*VALID/i.test(summary)) { quarantine.push({ path, reason: 'invalid-official-result', detail: 'Summary does not contain Result is : VALID' }); continue; }
    const loadgenScenario = summary.match(/^Scenario\s*:\s*([^\r\n]+)/im)?.[1]?.trim();
    const conventionalInteractive = parsedPath.scenario === 'Interactive' && loadgenScenario === 'Server';
    if (loadgenScenario !== parsedPath.scenario && !conventionalInteractive) { quarantine.push({ path, reason: 'scenario-mismatch', detail: `path=${parsedPath.scenario}, summary=${loadgenScenario ?? 'missing'}` }); continue; }
    const metric = parseMetric(summary);
    if (!metric) { quarantine.push({ path, reason: 'unknown-or-invalid-metric', detail: METRICS['tokens-per-second'].upstreamKeys.join(' | ') }); continue; }

    const acceleratorId = `acc_${slugify(`${alias.vendor}-${alias.family}-${sourceSystem.accelerator_model_name}`)}`;
    accelerators.set(acceleratorId, {
      id: acceleratorId,
      slug: slugify(`${alias.vendor}-${alias.family}-${sourceSystem.accelerator_model_name}`),
      vendor: alias.vendor,
      family: alias.family,
      model: sourceSystem.accelerator_model_name.trim(),
      memory: sourceSystem.accelerator_memory_capacity?.trim() || null,
    });

    const submittedSystemId = `sys_${slugify(`${parsedPath.submitter}-${parsedPath.systemKey}`)}`;
    systems.set(submittedSystemId, {
      id: submittedSystemId,
      submitter: sourceSystem.submitter,
      name: sourceSystem.system_name,
      acceleratorId,
      acceleratorCount: perNode * nodeCount,
      nodeCount,
      framework: sourceSystem.framework?.trim() || null,
      operatingSystem: sourceSystem.operating_system?.trim() || null,
      source: ref(systemPath, systemBody),
    });

    const logical = `${SOURCE.release}|Closed|${parsedPath.workload}|${parsedPath.scenario}|official-default|tokens-per-second|${submittedSystemId}`;
    const baseRecord = {
      id: `res_${sha256(logical).slice(0, 20)}`,
      release: 'v6.0' as const,
      division: 'Closed' as const,
      workload: parsedPath.workload,
      scenario: parsedPath.scenario,
      accuracyTarget: 'official-default' as const,
      metricId: 'tokens-per-second' as const,
      metric,
      unit: 'tokens/s' as const,
      direction: 'higher-is-better' as const,
      acceleratorId,
      submittedSystemId,
      perAccelerator: metric / (perNode * nodeCount),
      valid: true as const,
      source: ref(path, summary),
    };
    results.push({ ...baseRecord, versionId: `ver_${sha256(JSON.stringify(baseRecord)).slice(0, 24)}` });
  } catch (error) {
    quarantine.push({ path, reason: 'parser-exception', detail: error instanceof Error ? error.message : String(error) });
  }
}

if (mode === 'fixture') {
  const invalid = JSON.parse(readFileSync(resolve('fixtures/invalid-ambiguous-system.json'), 'utf8'));
  if (numericInteger(invalid.accelerators_per_node) !== null || resolveAccelerator(invalid.accelerator_model_name) !== null) throw new Error('Negative fixture unexpectedly accepted');
  quarantine.push({ path: 'fixtures/invalid-ambiguous-system.json', reason: 'deliberate-negative-fixture', detail: 'Ambiguous model and count correctly excluded' });
}

results.sort((a, b) => a.id.localeCompare(b.id));
const acceleratorList = [...accelerators.values()].sort((a, b) => a.id.localeCompare(b.id));
const systemList = [...systems.values()].sort((a, b) => a.id.localeCompare(b.id));
const tombstones: Dataset['tombstones'] = [];
const grouped = new Map<string, BenchmarkResult[]>();
for (const result of results) {
  const id = `${result.release}-closed-${result.workload}-${result.scenario.toLowerCase()}-${result.accuracyTarget}-${result.metricId}`;
  grouped.set(id, [...(grouped.get(id) ?? []), result]);
}
const slices: ComparisonSlice[] = [...grouped].map(([id, members]) => ({
  id,
  release: 'v6.0' as const, division: 'Closed' as const, workload: members[0].workload, scenario: members[0].scenario,
  accuracyTarget: 'official-default' as const, metricId: 'tokens-per-second' as const, unit: 'tokens/s' as const, direction: 'higher-is-better' as const,
  comparability: `All rows use MLPerf Inference v6.0 Closed division, ${members[0].workload}, ${members[0].scenario}, official-default accuracy evidence, and official submitted-system tokens/s. Per-accelerator values are derived and never the default.`,
  resultCount: members.length,
})).sort((a, b) => a.id.localeCompare(b.id));

const snapshotBody = JSON.stringify({ accelerators: acceleratorList, systems: systemList, results, slices, tombstones });
if (mode === 'fixture') {
  const expected = readFileSync(resolve('fixtures/expected-fixture-sha256.txt'), 'utf8').trim();
  const actual = `sha256:${sha256(snapshotBody)}`;
  if (actual !== expected) throw new Error(`Fixture snapshot changed: expected ${expected}, got ${actual}`);
}
const dataset: Dataset = {
  manifest: {
    release: 'v6.0', division: 'Closed', sourceCommit: SOURCE.commit, sourceRepository: SOURCE.repository,
    generatedAt: SOURCE.reviewedAt, reviewedAt: SOURCE.reviewedAt, freshness: 'pinned', snapshotSha256: `sha256:${sha256(snapshotBody)}`,
    recordCount: results.length, systemCount: systemList.length, acceleratorCount: acceleratorList.length, quarantineCount: quarantine.length,
  },
  accelerators: acceleratorList, systems: systemList, results, slices, tombstones,
};

const coverage = SOURCE.workloads.flatMap(workload => SOURCE.scenarios.map(scenario => {
  const rows = results.filter(r => r.workload === workload && r.scenario === scenario);
  return { workload, scenario, accepted: rows.length, vendors: [...new Set(rows.map(r => accelerators.get(r.acceleratorId)?.vendor).filter(Boolean))].sort(), families: [...new Set(rows.map(r => accelerators.get(r.acceleratorId)?.family).filter(Boolean))].sort() };
}));
const changelog = [{ version: dataset.manifest.snapshotSha256, generatedAt: dataset.manifest.generatedAt, mode, added: results.length, changed: 0, tombstoned: 0, note: 'Initial pinned MLPerf Inference v6.0 Closed snapshot.' }];

mkdirSync(outDir, { recursive: true });
writeFileSync(resolve(outDir, 'dataset.json'), JSON.stringify(dataset, null, 2) + '\n');
writeFileSync(resolve(outDir, 'manifest.json'), JSON.stringify(dataset.manifest, null, 2) + '\n');
writeFileSync(resolve(outDir, 'quarantine.json'), JSON.stringify(quarantine.sort((a,b)=>a.path.localeCompare(b.path)), null, 2) + '\n');
writeFileSync(resolve(outDir, 'tombstones.json'), JSON.stringify(tombstones, null, 2) + '\n');
writeFileSync(resolve(outDir, 'coverage.json'), JSON.stringify(coverage, null, 2) + '\n');
writeFileSync(resolve(outDir, 'changelog.json'), JSON.stringify(changelog, null, 2) + '\n');
console.log(JSON.stringify({ mode, ...dataset.manifest, slices: slices.length, coverage }, null, 2));
