'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { Dataset } from '@/src/lib/dataset-types';
import {
  compareAccelerators,
  listComparisonSlices,
  resolveConfiguration,
  type WebMcpConfiguration,
} from '@/src/webmcp/leaderboard-tools';

type Props = { dataset: Dataset };
type View = 'official' | 'derived';
type Group = 'best-per-accelerator' | 'all-systems';

export function LeaderboardExplorer({ dataset }: Props) {
  const [sliceId, setSliceId] = useState([...dataset.slices].sort((a, b) => b.resultCount - a.resultCount)[0].id);
  const [vendor, setVendor] = useState('All');
  const [submitter, setSubmitter] = useState('All');
  const [view, setView] = useState<View>('official');
  const [group, setGroup] = useState<Group>('best-per-accelerator');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [agentComparison, setAgentComparison] = useState<ReturnType<typeof compareAccelerators> | null>(null);

  const accelerators = useMemo(() => new Map(dataset.accelerators.map(a => [a.id, a])), [dataset]);
  const systems = useMemo(() => new Map(dataset.systems.map(s => [s.id, s])), [dataset]);
  const slice = dataset.slices.find(s => s.id === sliceId)!;
  const submitters = [...new Set(dataset.systems.map(s => s.submitter))].sort();
  const workloads = [...new Set(dataset.slices.map(s => s.workload))].sort();
  const scenarios = [...new Set(dataset.slices.filter(s => s.workload === slice.workload).map(s => s.scenario))].sort();
  const accuracyTargets = [...new Set(dataset.slices.filter(s => s.workload === slice.workload && s.scenario === slice.scenario).map(s => s.accuracyTarget))].sort();

  const selectDimension = (next: Partial<Pick<typeof slice, 'workload' | 'scenario' | 'accuracyTarget'>>) => {
    const candidate = dataset.slices.find(s =>
      (!next.workload || s.workload === next.workload) &&
      (!next.scenario || s.scenario === next.scenario) &&
      (!next.accuracyTarget || s.accuracyTarget === next.accuracyTarget))
      ?? dataset.slices.find(s => s.workload === (next.workload ?? slice.workload));
    if (candidate) { setSliceId(candidate.id); setPage(1); }
  };

  const rows = useMemo(() => {
    let items = dataset.results
      .filter(r => `${r.release}-closed-${r.workload}-${r.scenario.toLowerCase()}-${r.accuracyTarget}-${r.metricId}` === sliceId)
      .map(r => ({ r, a: accelerators.get(r.acceleratorId)!, s: systems.get(r.submittedSystemId)!, value: view === 'official' ? r.metric : r.perAccelerator }))
      .filter(x => x.value !== null && (vendor === 'All' || x.a.vendor === vendor) && (submitter === 'All' || x.s.submitter === submitter) && (`${x.a.family} ${x.a.model} ${x.s.name}`.toLowerCase().includes(query.toLowerCase())))
      .sort((a, b) => b.value! - a.value! || a.r.id.localeCompare(b.r.id));
    if (group === 'best-per-accelerator') {
      const seen = new Set<string>();
      items = items.filter(x => seen.has(x.r.acceleratorId) ? false : (seen.add(x.r.acceleratorId), true));
    }
    let prior: number | null = null;
    let rank = 0;
    return items.map((x, i) => { if (x.value !== prior) rank = i + 1; prior = x.value; return { ...x, rank }; });
  }, [dataset, sliceId, view, vendor, submitter, query, group, accelerators, systems]);

  const pageSize = 12;
  const pages = Math.max(1, Math.ceil(rows.length / pageSize));
  const safePage = Math.min(page, pages);
  const visible = rows.slice((safePage - 1) * pageSize, safePage * pageSize);
  const set = <T,>(fn: (v: T) => void) => (value: T) => { fn(value); setPage(1); };

  const stateRef = useRef<WebMcpConfiguration>({
    sliceId,
    vendor: 'All',
    submitter: 'All',
    metricView: 'official',
    grouping: 'best-per-accelerator',
    search: '',
  });
  stateRef.current = { sliceId, vendor: vendor as WebMcpConfiguration['vendor'], submitter, metricView: view, grouping: group, search: query };

  useEffect(() => {
    if (!document.modelContext) return;
    const controller = new AbortController();
    const register = async () => {
      await document.modelContext!.registerTool({
        name: 'list_inference_slices',
        title: 'List verified comparison slices',
        description: 'List exact MLPerf v6.0 Closed comparison slices available on this page. Call this before configuring or comparing hardware so incompatible workloads, scenarios, accuracy targets, metrics, and units are never mixed.',
        inputSchema: { type: 'object', properties: {}, additionalProperties: false },
        annotations: { readOnlyHint: true, untrustedContentHint: false },
        execute: async () => ({ datasetVersion: dataset.manifest.snapshotSha256, slices: listComparisonSlices(dataset) }),
      }, { signal: controller.signal });

      await document.modelContext!.registerTool({
        name: 'configure_inference_leaderboard',
        title: 'Configure the visible leaderboard',
        description: 'Change the human-visible leaderboard to one exact slice and optional vendor, submitter, metric view, grouping, or search filter. The page updates immediately so person and agent share the same view.',
        inputSchema: {
          type: 'object',
          properties: {
            sliceId: { type: 'string', description: 'Exact slice ID returned by list_inference_slices.' },
            vendor: { type: 'string', enum: ['All', 'AMD', 'Intel', 'NVIDIA'] },
            submitter: { type: 'string' },
            metricView: { type: 'string', enum: ['official', 'derived'] },
            grouping: { type: 'string', enum: ['best-per-accelerator', 'all-systems'] },
            search: { type: 'string', maxLength: 120 },
          },
          required: ['sliceId'],
          additionalProperties: false,
        },
        annotations: { readOnlyHint: false, untrustedContentHint: false },
        execute: async input => {
          const next = resolveConfiguration(dataset, stateRef.current, input as Partial<WebMcpConfiguration>);
          setSliceId(next.sliceId);
          setVendor(next.vendor);
          setSubmitter(next.submitter);
          setView(next.metricView);
          setGroup(next.grouping);
          setQuery(next.search);
          setPage(1);
          return { updated: true, configuration: next, message: 'The visible leaderboard now matches this exact comparison configuration.' };
        },
      }, { signal: controller.signal });

      await document.modelContext!.registerTool({
        name: 'compare_inference_accelerators',
        title: 'Build a verified chip comparison',
        description: 'Compare 2 to 8 accelerator slugs inside one exact MLPerf slice. Returns the best verified records, missing-evidence reasons, immutable source URLs, and renders the comparison for the person on the page.',
        inputSchema: {
          type: 'object',
          properties: {
            sliceId: { type: 'string', description: 'Exact slice ID returned by list_inference_slices.' },
            acceleratorSlugs: { type: 'array', items: { type: 'string' }, minItems: 2, maxItems: 8, uniqueItems: true },
            metricView: { type: 'string', enum: ['official', 'derived'] },
          },
          required: ['sliceId', 'acceleratorSlugs'],
          additionalProperties: false,
        },
        annotations: { readOnlyHint: false, untrustedContentHint: false },
        execute: async input => {
          const result = compareAccelerators(dataset, input as { sliceId: string; acceleratorSlugs: string[]; metricView?: View });
          setAgentComparison(result);
          setSliceId(result.slice.id);
          setView(result.metricView);
          setPage(1);
          return result;
        },
      }, { signal: controller.signal });

      await document.modelContext!.registerTool({
        name: 'clear_inference_comparison',
        title: 'Clear the shared comparison',
        description: 'Remove the agent-built comparison card from the page without changing the leaderboard filters.',
        inputSchema: { type: 'object', properties: {}, additionalProperties: false },
        annotations: { readOnlyHint: false, untrustedContentHint: false },
        execute: async () => { setAgentComparison(null); return { cleared: true }; },
      }, { signal: controller.signal });
    };
    void register().catch(error => console.warn('WebMCP tool registration failed', error));
    return () => controller.abort();
  }, [dataset]);

  return <section className="explorer">
    <div className="webmcp-banner">
      <span>Agent-ready</span>
      <div><strong>Human + agent research workspace</strong><p>Four WebMCP tools can discover exact slices, configure this view, and render source-linked comparisons beside you.</p></div>
    </div>
    <div className="filter-deck">
      <label>Release<select value="v6.0" disabled><option>v6.0</option></select></label>
      <label>Division<select value="Closed" disabled><option>Closed</option></select></label>
      <label>Workload<select value={slice.workload} onChange={e => selectDimension({ workload: e.target.value as typeof slice.workload })}>{workloads.map(x => <option key={x}>{x}</option>)}</select></label>
      <label>Scenario<select value={slice.scenario} onChange={e => selectDimension({ workload: slice.workload, scenario: e.target.value as typeof slice.scenario })}>{scenarios.map(x => <option key={x}>{x}</option>)}</select></label>
      <label>Accuracy target<select value={slice.accuracyTarget} onChange={e => selectDimension({ workload: slice.workload, scenario: slice.scenario, accuracyTarget: e.target.value as typeof slice.accuracyTarget })}>{accuracyTargets.map(x => <option key={x}>{x}</option>)}</select></label>
      <label>Vendor<select value={vendor} onChange={e => set(setVendor)(e.target.value)}><option>All</option><option>AMD</option><option>Intel</option><option>NVIDIA</option></select></label>
      <label>Submitter<select value={submitter} onChange={e => set(setSubmitter)(e.target.value)}><option>All</option>{submitters.map(x => <option key={x}>{x}</option>)}</select></label>
      <label>Search<input value={query} onChange={e => set(setQuery)(e.target.value)} placeholder="Family or system" /></label>
    </div>
    <div className="comparison-contract">
      <div><span>Exact slice · {slice.id}</span><strong>{slice.workload} / {slice.scenario} / {slice.accuracyTarget} / tokens·s⁻¹</strong><p>{slice.comparability}</p></div>
      <div className="segmented" aria-label="Metric view"><button aria-pressed={view === 'official'} onClick={() => set(setView)('official')}>Official system</button><button aria-pressed={view === 'derived'} onClick={() => set(setView)('derived')}>Derived / accelerator</button></div>
      <div className="segmented" aria-label="Grouping"><button aria-pressed={group === 'best-per-accelerator'} onClick={() => set(setGroup)('best-per-accelerator')}>Best per chip</button><button aria-pressed={group === 'all-systems'} onClick={() => set(setGroup)('all-systems')}>All systems</button></div>
    </div>
    {agentComparison && <aside className="agent-comparison" aria-live="polite">
      <div className="agent-comparison-head"><div><span>Shared agent comparison</span><strong>{agentComparison.slice.id}</strong><p>{agentComparison.slice.comparability}</p></div><button onClick={() => setAgentComparison(null)}>Clear</button></div>
      <div className="comparison-grid">{agentComparison.rows.map(row => <article key={row.acceleratorSlug}><span>#{row.position} · {row.vendor}</span><h3>{row.family}</h3><p>{row.model}</p><strong>{Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(row.value)} <small>{row.unit}</small></strong><a href={row.sourceUrl} target="_blank">Verify official source ↗</a></article>)}</div>
      {agentComparison.missing.length > 0 && <p className="missing-evidence">Missing evidence: {agentComparison.missing.map(item => `${item.slug} — ${item.reason}`).join(' ')}</p>}
    </aside>}
    {visible.length ? <>
      <div className="table-wrap"><table><thead><tr><th>Rank</th><th>Accelerator</th><th>Submitted system</th><th>Count</th><th>{view === 'official' ? 'Official result' : 'Derived value'}</th><th>Evidence</th></tr></thead><tbody>{visible.map(x => <tr key={x.r.id}><td><span className="rank-chip">{x.rank}</span></td><td><span className={`vendor-mark ${x.a.vendor.toLowerCase()}`}>{x.a.vendor}</span><strong>{x.a.family}</strong><small>{x.a.model}</small></td><td><strong>{x.s.submitter}</strong><small>{x.s.name}</small></td><td>{x.s.acceleratorCount}</td><td className="metric"><strong>{Intl.NumberFormat('en-US', { maximumFractionDigits: view === 'official' ? 0 : 2 }).format(x.value!)}</strong><small>{view === 'official' ? 'tokens/s' : 'tokens/s/accelerator'}</small></td><td><a href={x.r.source.url} target="_blank">source ↗</a><small className="hash">{x.r.source.sha256.slice(0, 9)}…</small></td></tr>)}</tbody></table></div>
      <div className="pagination"><button disabled={safePage === 1} onClick={() => setPage(p => Math.max(1, p - 1))}>← Previous</button><span>Page {safePage} of {pages} · {rows.length} comparable records</span><button disabled={safePage === pages} onClick={() => setPage(p => Math.min(pages, p + 1))}>Next →</button></div>
    </> : <div className="empty-state"><span>0 verified matches</span><h3>No comparable results for these filters.</h3><p>Change one filter at a time. The index will never fill gaps by mixing incompatible benchmark dimensions.</p><button onClick={() => { setVendor('All'); setSubmitter('All'); setQuery(''); }}>Clear optional filters</button></div>}
  </section>;
}
