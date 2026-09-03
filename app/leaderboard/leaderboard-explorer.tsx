'use client';
import { useMemo, useState } from 'react';
import type { Dataset } from '@/src/lib/dataset-types';

type Props={dataset:Dataset};
type View='official'|'derived';
type Group='best-per-accelerator'|'all-systems';

export function LeaderboardExplorer({dataset}:Props){
  const [sliceId,setSliceId]=useState([...dataset.slices].sort((a,b)=>b.resultCount-a.resultCount)[0].id);
  const [vendor,setVendor]=useState('All'); const [submitter,setSubmitter]=useState('All'); const [view,setView]=useState<View>('official'); const [group,setGroup]=useState<Group>('best-per-accelerator'); const [query,setQuery]=useState(''); const [page,setPage]=useState(1);
  const accelerators=useMemo(()=>new Map(dataset.accelerators.map(a=>[a.id,a])),[dataset]); const systems=useMemo(()=>new Map(dataset.systems.map(s=>[s.id,s])),[dataset]); const slice=dataset.slices.find(s=>s.id===sliceId)!;
  const submitters=[...new Set(dataset.systems.map(s=>s.submitter))].sort();
  const workloads=[...new Set(dataset.slices.map(s=>s.workload))].sort();
  const scenarios=[...new Set(dataset.slices.filter(s=>s.workload===slice.workload).map(s=>s.scenario))].sort();
  const accuracyTargets=[...new Set(dataset.slices.filter(s=>s.workload===slice.workload&&s.scenario===slice.scenario).map(s=>s.accuracyTarget))].sort();
  const selectDimension=(next:Partial<Pick<typeof slice,'workload'|'scenario'|'accuracyTarget'>>)=>{
    const candidate=dataset.slices.find(s=>(!next.workload||s.workload===next.workload)&&(!next.scenario||s.scenario===next.scenario)&&(!next.accuracyTarget||s.accuracyTarget===next.accuracyTarget))
      ?? dataset.slices.find(s=>s.workload===(next.workload??slice.workload));
    if(candidate){setSliceId(candidate.id);setPage(1);}
  };
  const rows=useMemo(()=>{
    let items=dataset.results.filter(r=>`${r.release}-closed-${r.workload}-${r.scenario.toLowerCase()}-${r.accuracyTarget}-${r.metricId}`===sliceId).map(r=>({r,a:accelerators.get(r.acceleratorId)!,s:systems.get(r.submittedSystemId)!,value:view==='official'?r.metric:r.perAccelerator})).filter(x=>x.value!==null&& (vendor==='All'||x.a.vendor===vendor)&&(submitter==='All'||x.s.submitter===submitter)&&(`${x.a.family} ${x.a.model} ${x.s.name}`.toLowerCase().includes(query.toLowerCase()))).sort((a,b)=>b.value!-a.value!||a.r.id.localeCompare(b.r.id));
    if(group==='best-per-accelerator'){const seen=new Set<string>();items=items.filter(x=>seen.has(x.r.acceleratorId)?false:(seen.add(x.r.acceleratorId),true));}
    let prior:number|null=null,rank=0; return items.map((x,i)=>{if(x.value!==prior)rank=i+1;prior=x.value;return {...x,rank};});
  },[dataset,sliceId,view,vendor,submitter,query,group,accelerators,systems]);
  const pageSize=12,pages=Math.max(1,Math.ceil(rows.length/pageSize)),safePage=Math.min(page,pages),visible=rows.slice((safePage-1)*pageSize,safePage*pageSize);
  const set=<T,>(fn:(v:T)=>void)=>(v:T)=>{fn(v);setPage(1)};
  return <section className="explorer">
    <div className="filter-deck"><label>Release<select value="v6.0" disabled><option>v6.0</option></select></label><label>Division<select value="Closed" disabled><option>Closed</option></select></label><label>Workload<select value={slice.workload} onChange={e=>selectDimension({workload:e.target.value as typeof slice.workload})}>{workloads.map(x=><option key={x}>{x}</option>)}</select></label><label>Scenario<select value={slice.scenario} onChange={e=>selectDimension({workload:slice.workload,scenario:e.target.value as typeof slice.scenario})}>{scenarios.map(x=><option key={x}>{x}</option>)}</select></label><label>Accuracy target<select value={slice.accuracyTarget} onChange={e=>selectDimension({workload:slice.workload,scenario:slice.scenario,accuracyTarget:e.target.value as typeof slice.accuracyTarget})}>{accuracyTargets.map(x=><option key={x}>{x}</option>)}</select></label><label>Vendor<select value={vendor} onChange={e=>set(setVendor)(e.target.value)}><option>All</option><option>AMD</option><option>Intel</option><option>NVIDIA</option></select></label><label>Submitter<select value={submitter} onChange={e=>set(setSubmitter)(e.target.value)}><option>All</option>{submitters.map(x=><option key={x}>{x}</option>)}</select></label><label>Search<input value={query} onChange={e=>set(setQuery)(e.target.value)} placeholder="Family or system"/></label></div>
    <div className="comparison-contract"><div><span>Exact slice · {slice.id}</span><strong>{slice.workload} / {slice.scenario} / {slice.accuracyTarget} / tokens·s⁻¹</strong><p>{slice.comparability}</p></div><div className="segmented" aria-label="Metric view"><button aria-pressed={view==='official'} onClick={()=>set(setView)('official')}>Official system</button><button aria-pressed={view==='derived'} onClick={()=>set(setView)('derived')}>Derived / accelerator</button></div><div className="segmented" aria-label="Grouping"><button aria-pressed={group==='best-per-accelerator'} onClick={()=>set(setGroup)('best-per-accelerator')}>Best per chip</button><button aria-pressed={group==='all-systems'} onClick={()=>set(setGroup)('all-systems')}>All systems</button></div></div>
    {visible.length?<><div className="table-wrap"><table><thead><tr><th>Rank</th><th>Accelerator</th><th>Submitted system</th><th>Count</th><th>{view==='official'?'Official result':'Derived value'}</th><th>Evidence</th></tr></thead><tbody>{visible.map(x=><tr key={x.r.id}><td><span className="rank-chip">{x.rank}</span></td><td><span className={`vendor-mark ${x.a.vendor.toLowerCase()}`}>{x.a.vendor}</span><strong>{x.a.family}</strong><small>{x.a.model}</small></td><td><strong>{x.s.submitter}</strong><small>{x.s.name}</small></td><td>{x.s.acceleratorCount}</td><td className="metric"><strong>{Intl.NumberFormat('en-US',{maximumFractionDigits:view==='official'?0:2}).format(x.value!)}</strong><small>{view==='official'?'tokens/s':'tokens/s/accelerator'}</small></td><td><a href={x.r.source.url} target="_blank" rel="noreferrer">Source ↗</a><small>{x.r.source.sha256.slice(0,18)}…</small></td></tr>)}</tbody></table></div><div className="pagination"><span>{rows.length} comparable rows · page {safePage}/{pages}</span><div><button disabled={safePage===1} onClick={()=>setPage(safePage-1)}>Previous</button><button disabled={safePage===pages} onClick={()=>setPage(safePage+1)}>Next</button></div></div></>:<div className="empty-state"><span>0 comparable rows</span><h2>No evidence matches this filter set.</h2><p>Clear the vendor, submitter, or text filter. The index never fills an empty slice with incompatible results.</p><button onClick={()=>{setVendor('All');setSubmitter('All');setQuery('');setPage(1)}}>Reset filters</button></div>}
  </section>
}
