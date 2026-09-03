# Data sources

## Canonical source

Inference Chip Index uses only the public MLCommons repository `mlcommons/inference_results_v6.0` at immutable commit `4d3916ac9cf474b679cdfcf492d43a0559418ad1`.

- Repository: https://github.com/mlcommons/inference_results_v6.0
- Commit: https://github.com/mlcommons/inference_results_v6.0/tree/4d3916ac9cf474b679cdfcf492d43a0559418ad1
- Dataset release: MLPerf Inference v6.0
- Division: Closed

No vendor marketing pages, live scraped values, supplemental benchmarks or inferred results enter the dataset.

## Accepted files

System identity and explicit device topology come from `closed/<submitter>/systems/<system>.json`. Official throughput and validity come from the matching `closed/<submitter>/results/<system>/<workload>/<scenario>/performance/run_1/mlperf_log_summary.txt`.

Every normalized result stores both the summary reference and a stable submitted-system reference through its system ID. Source references include repository, commit, path, immutable HTTPS URL and SHA-256 of the exact file body read from Git.

## Review boundary

The source registry allowlists three workloads and three scenarios. The reviewed alias registry recognizes only explicit accelerator model patterns present in the pinned source. The metric registry recognizes the upstream throughput keys, canonical unit, winning direction, validity rule and derivation permission. Anything outside these registries is quarantined for review rather than guessed.

## Licensing and marks

Upstream results and documentation remain governed by the MLCommons repository's terms. MLPerf is a trademark of MLCommons. This project republishes normalized factual references and hashes for independent comparison and does not claim endorsement by MLCommons or hardware vendors.
