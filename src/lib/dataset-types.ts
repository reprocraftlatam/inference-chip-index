export type SourceRef = {
  repository: string;
  commit: string;
  path: string;
  url: string;
  sha256: string;
};

export type Accelerator = {
  id: string;
  slug: string;
  vendor: 'AMD' | 'Intel' | 'NVIDIA';
  family: string;
  model: string;
  memory: string | null;
};

export type SubmittedSystem = {
  id: string;
  submitter: string;
  name: string;
  acceleratorId: string;
  acceleratorCount: number;
  nodeCount: number;
  framework: string | null;
  operatingSystem: string | null;
  source: SourceRef;
};

export type BenchmarkResult = {
  id: string;
  versionId: string;
  release: 'v6.0';
  division: 'Closed';
  workload: 'llama3.1-8b' | 'gpt-oss-120b' | 'deepseek-r1';
  scenario: 'Offline' | 'Server' | 'Interactive';
  accuracyTarget: 'official-default';
  metricId: 'tokens-per-second';
  metric: number;
  unit: 'tokens/s';
  direction: 'higher-is-better';
  acceleratorId: string;
  submittedSystemId: string;
  perAccelerator: number | null;
  valid: true;
  source: SourceRef;
};

export type ComparisonSlice = {
  id: string;
  release: 'v6.0';
  division: 'Closed';
  workload: BenchmarkResult['workload'];
  scenario: BenchmarkResult['scenario'];
  accuracyTarget: BenchmarkResult['accuracyTarget'];
  metricId: BenchmarkResult['metricId'];
  unit: BenchmarkResult['unit'];
  direction: BenchmarkResult['direction'];
  comparability: string;
  resultCount: number;
};

export type QuarantineRecord = {
  path: string;
  reason: string;
  detail: string;
};

export type Tombstone = {
  id: string;
  removedVersionId: string;
  reason: string;
  reviewedAt: string;
  replacementId: string | null;
};

export type Dataset = {
  manifest: {
    release: 'v6.0';
    division: 'Closed';
    sourceCommit: string;
    sourceRepository: string;
    generatedAt: string;
    reviewedAt: string;
    freshness: 'pinned';
    snapshotSha256: string;
    recordCount: number;
    systemCount: number;
    acceleratorCount: number;
    quarantineCount: number;
  };
  accelerators: Accelerator[];
  systems: SubmittedSystem[];
  results: BenchmarkResult[];
  slices: ComparisonSlice[];
  tombstones: Tombstone[];
};
