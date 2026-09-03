import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'Inference Chip Index', template: '%s — Inference Chip Index' },
  description: 'Workload-specific MLPerf Inference v6.0 accelerator comparisons with source-level provenance.',
};

const nav = [['Leaderboard','/leaderboard'],['Methodology','/methodology'],['API','/api'],['Updates','/updates']];

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>
    <header className="site-header">
      <Link className="brand" href="/"><span className="brand-mark">ICI</span><span>Inference Chip Index</span></Link>
      <nav aria-label="Primary">{nav.map(([label,href])=><Link href={href} key={href}>{label}</Link>)}</nav>
      <a className="source-pill" href="https://github.com/mlcommons/inference_results_v6.0/tree/4d3916ac9cf474b679cdfcf492d43a0559418ad1" target="_blank" rel="noreferrer"><span className="status-dot"/>Pinned v6.0</a>
    </header>
    <main>{children}</main>
    <footer className="site-footer">
      <div><strong>Inference Chip Index</strong><p>Exact slices. Official systems. No universal “fastest” claim.</p></div>
      <div className="footer-links">{nav.map(([label,href])=><Link href={href} key={href}>{label}</Link>)}<a href="/api/agent/.well-known/agent-card.json">Agent card</a></div>
      <p className="fine-print">Independent normalization of public MLCommons evidence. MLPerf is a trademark of MLCommons. Results are not hardware recommendations.</p>
    </footer>
  </body></html>;
}
