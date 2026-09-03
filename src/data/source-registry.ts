export const SOURCE = {
  repository: 'mlcommons/inference_results_v6.0',
  repositoryUrl: 'https://github.com/mlcommons/inference_results_v6.0',
  commit: '4d3916ac9cf474b679cdfcf492d43a0559418ad1',
  release: 'v6.0',
  division: 'Closed',
  workloads: ['llama3.1-8b', 'gpt-oss-120b', 'deepseek-r1'] as const,
  scenarios: ['Offline', 'Server', 'Interactive'] as const,
  reviewedAt: '2026-09-02T07:45:00.000Z',
};

export function sourceUrl(path: string) {
  return `${SOURCE.repositoryUrl}/blob/${SOURCE.commit}/${path}`;
}
