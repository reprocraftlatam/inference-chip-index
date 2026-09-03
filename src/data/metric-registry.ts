export const METRICS = {
  'tokens-per-second': {
    id: 'tokens-per-second',
    label: 'Official submitted-system throughput',
    unit: 'tokens/s',
    direction: 'higher-is-better',
    workloads: ['llama3.1-8b', 'gpt-oss-120b', 'deepseek-r1'],
    scenarios: ['Offline', 'Server', 'Interactive'],
    upstreamKeys: ['Tokens per second', 'Completed tokens per second'],
    validityRequired: 'Result is : VALID',
    derivedPerAcceleratorAllowed: true,
    derivation: 'official submitted-system tokens/s divided by explicit accelerators_per_node × number_of_nodes',
  },
} as const;
