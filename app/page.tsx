import Link from 'next/link';
import { dataset, getSlice, rankRows } from '@/src/lib/index-data';

export default function Home() {
  const slice = [...dataset.slices].sort((a,b)=>b.resultCount-a.resultCount)[0];
  const leaders = rankRows({ sliceId: slice.id, grouping:'best-per-accelerator' }).slice(0,5);
  const max = Math.max(...leaders.map(row=>row.value));
  return <>
    <section className="hero shell">
      <div className="eyebrow"><span>MLPerf Inference v6.0</span><span>Closed division</span><span>Official results</span></div>
      <div className="hero-grid">
        <div>
          <h1>Find the fastest <em>verified</em> inference hardware for your workload.</h1>
          <p className="hero-qualifier">Not fastest in general. Fastest inside one exact, comparable benchmark slice—with every row linked to the source commit.</p>
          <div className="hero-actions"><Link className="button primary" href="/leaderboard">Explore the leaderboard</Link><Link className="button ghost" href="/methodology">Read the methodology</Link></div>
        </div>
        <aside className="manifest-card">
          <div className="manifest-top"><span>Dataset manifest</span><span className="live-badge">PINNED</span></div>
          <dl><div><dt>Results</dt><dd>{dataset.manifest.recordCount}</dd></div><div><dt>Systems</dt><dd>{dataset.manifest.systemCount}</dd></div><div><dt>Accelerators</dt><dd>{dataset.manifest.acceleratorCount}</dd></div><div><dt>Exact slices</dt><dd>{dataset.slices.length}</dd></div></dl>
          <p className="hash">{dataset.manifest.snapshotSha256}</p>
          <a href={`https://github.com/mlcommons/inference_results_v6.0/tree/${dataset.manifest.sourceCommit}`} target="_blank" rel="noreferrer">Inspect source commit ↗</a>
        </aside>
      </div>
    </section>

    <section className="signal-band"><div className="shell signal-grid"><div><span className="kicker">Current comparison</span><h2>{slice.workload} · {slice.scenario}</h2><p>{slice.comparability}</p></div><div className="slice-code"><span>Slice ID</span><code>{slice.id}</code></div></div></section>

    <section className="shell section">
      <div className="section-head"><div><span className="kicker">Top systems by accelerator family</span><h2>One metric. One unit. No blended claims.</h2></div><Link href="/leaderboard">View all {slice.resultCount} results →</Link></div>
      <div className="leader-stack">{leaders.map(row=><article className="leader-row" key={row.resultId}><span className="rank">{String(row.rank).padStart(2,'0')}</span><div className="leader-name"><strong>{row.acceleratorFamily}</strong><span>{row.submitter} · {row.acceleratorCount} accelerators</span></div><div className="bar-track" aria-hidden="true"><i style={{width:`${Math.max(4,row.value/max*100)}%`}}/></div><div className="leader-value"><strong>{Intl.NumberFormat('en-US',{maximumFractionDigits:0}).format(row.value)}</strong><span>{row.unit}</span></div><a href={row.sourceUrl} target="_blank" rel="noreferrer" aria-label={`Source for ${row.acceleratorFamily}`}>↗</a></article>)}</div>
    </section>

    <section className="shell principle-grid section">
      <article><span>01</span><h3>Comparable or excluded</h3><p>Release, division, workload, scenario, accuracy target, metric and unit must match. Ambiguity enters quarantine—not the ranking.</p></article>
      <article><span>02</span><h3>Systems before chips</h3><p>The official submitted-system score is primary. Per-accelerator values appear only as labeled arithmetic when the source explicitly states count.</p></article>
      <article><span>03</span><h3>Source at every row</h3><p>Repository, commit, path, URL and SHA-256 travel with each published record. The index can be rebuilt and audited without trusting this interface.</p></article>
    </section>

    <section className="api-cta"><div className="shell api-cta-grid"><div><span className="kicker">For autonomous research agents</span><h2>Ask an exact question. Pay only for the exact answer.</h2><p>Status and five-row previews are free. Full rankings cost $0.02; exact 2–8 chip comparisons cost $0.03 on Base Sepolia when payment is configured.</p></div><div><code>POST /api/agent/entrypoints/<br/>rank-inference-chips/invoke</code><Link className="button light" href="/api">Open API guide</Link></div></div></section>
  </>;
}
