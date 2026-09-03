import type { Metadata } from 'next';
import { dataset } from '@/src/lib/index-data';
import { LeaderboardExplorer } from './leaderboard-explorer';

export const metadata: Metadata = { title: 'Leaderboard' };

export default function LeaderboardPage() {
  return <div className="shell page-space"><div className="page-intro"><span className="kicker">Exact-slice leaderboard</span><h1>Compare only what can be compared.</h1><p>Every control changes the comparison contract. Rank is computed before pagination, and tied values share a position.</p></div><LeaderboardExplorer dataset={dataset}/></div>;
}
