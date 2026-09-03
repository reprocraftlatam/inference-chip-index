# Inference Chip Index

A reproducible Next.js leaderboard and Lucid Agents API for workload-specific MLPerf Inference v6.0 accelerator comparisons.

## WebMCP Challenge extension (August 25–September 3, 2026)

The leaderboard is now a shared human-and-agent research surface. This extension was created during the WebMCP Challenge submission period and adds four browser-native tools through the imperative `document.modelContext.registerTool()` API:

| WebMCP tool | Shared outcome |
| --- | --- |
| `list_inference_slices` | Discovers safe exact comparison boundaries and counts. |
| `configure_inference_leaderboard` | Changes the filters the human sees, keeping both participants on the same view. |
| `compare_inference_accelerators` | Builds and renders a 2–8 chip comparison with missing-evidence reasons and immutable sources. |
| `clear_inference_comparison` | Removes the shared comparison without disturbing the chosen leaderboard filters. |

The browser tools reuse the checked-in normalized dataset and exact-slice invariants. They do not create a parallel ranking system, fetch untrusted runtime data, or bypass the existing x402 API. Chrome requires WebMCP testing to be enabled; ChatGPT's in-app browser supports it directly. See [WEBMCP.md](WEBMCP.md) for prompts, architecture, security boundaries, and a repeatable demo.

The index never claims that one chip is universally fastest. Every ranking is confined to an exact comparison slice: release, Closed division, workload, scenario, accuracy target, metric and unit. Official submitted-system throughput is the default; per-accelerator numbers are labeled derived arithmetic and appear only when the source states an integer accelerator count.

## Evidence boundary

- Repository: `mlcommons/inference_results_v6.0`
- Pinned commit: `4d3916ac9cf474b679cdfcf492d43a0559418ad1`
- Accepted workloads: `llama3.1-8b`, `gpt-oss-120b`, `deepseek-r1`
- Accepted scenarios: `Server`, `Interactive`, `Offline`
- Division: `Closed`
- Imported: 145 valid results, 50 submitted systems, 13 normalized accelerators, 9 exact slices
- Dataset snapshot: `sha256:d953bc0bac8cd2a80fd2118a23628cf3e9bfa2148de1e79cb9fe973e28e671af`

Each result includes the repository, commit, path, immutable GitHub URL and SHA-256 of its source summary. The importer reads Git objects at the pinned commit, rejects non-VALID summaries, refuses ambiguous device identities or counts, and produces deterministic JSON manifests.

## Run locally

```bash
npm ci
npm run data:fixture
npm run data:full
npm run verify
npm run dev
```

The full importer expects a sibling clone at `../mlperf-inference-v6`. It reads files with `git show`, so a checkout is unnecessary:

```bash
git clone --filter=blob:none --no-checkout https://github.com/mlcommons/inference_results_v6.0 ../mlperf-inference-v6
git -C ../mlperf-inference-v6 fetch origin 4d3916ac9cf474b679cdfcf492d43a0559418ad1
```

## Lucid API

One server-only runtime owns all four entrypoints under `/api/agent`; Next route modules only call canonical `runtime.http.handlers` methods.

| Entrypoint | Price | Purpose |
| --- | ---: | --- |
| `get-dataset-status` | Free | Manifest, freshness, sources, counts and exact slice IDs |
| `preview-inference-chips` | Free | At most five verified rows from one slice |
| `rank-inference-chips` | $0.02 | Filtered, grouped and paginated exact-slice ranking |
| `compare-inference-chips` | $0.03 | Compare 2–8 accelerator slugs with optional baseline deltas |

Pinned SDKs: `@lucid-agents/core@5.0.0`, `@lucid-agents/http@4.0.0`, `@lucid-agents/payments@5.0.0`. Paid routes declare x402 on Base Sepolia (`eip155:84532`). If the payment runtime is incomplete, discovery and free endpoints remain available while paid invocation returns `503 payment_configuration_error`; the handler never runs for free.

Example free invocation:

```bash
curl -sS -X POST https://inference-chip-index.assorted-client-a65.workers.dev/api/agent/entrypoints/get-dataset-status/invoke \
  -H 'content-type: application/json' \
  --data '{"input":{}}'
```

## Data products

- `data/generated/dataset.json`: normalized accelerators, submitted systems, results and slices
- `manifest.json`: atomic snapshot identity and counts
- `coverage.json`: workload/scenario/vendor/family coverage
- `quarantine.json`: rejected records and reasons
- `tombstones.json`: reviewed removals retained across future snapshot promotions
- `changelog.json`: deterministic promotion history

See [METHODOLOGY.md](METHODOLOGY.md), [DATA_SOURCES.md](DATA_SOURCES.md), [PAYMENTS.md](PAYMENTS.md), [UPDATE_RUNBOOK.md](UPDATE_RUNBOOK.md), [DEPLOYMENT.md](DEPLOYMENT.md), and [VERIFICATION.md](VERIFICATION.md).

## License and marks

This is an independent normalization of public MLCommons evidence. MLPerf is a trademark of MLCommons. Source results retain their upstream terms. The interface and original code are provided for evaluation; results are evidence, not purchasing advice.

The original application code is licensed under the [MIT License](LICENSE). Third-party benchmark data remains subject to its upstream terms.
