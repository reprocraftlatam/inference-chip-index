# Methodology

## Unit of comparison

A row can be ranked with another row only when release, division, workload, scenario, accuracy target, metric and unit are identical. The slice identifier encodes those fields. There is no cross-workload score and no composite “best chip” score.

## Selection

The importer enumerates only paths matching `closed/{submitter}/results/{system}/{workload}/{scenario}/performance/run_1/mlperf_log_summary.txt`. It accepts the three allowlisted generative workloads and the Server, Interactive and Offline scenarios. A summary must state `Result is : VALID` and expose the reviewed throughput label. Accuracy evidence is represented as `official-default` because V1 does not merge alternate high-accuracy result trees.

## Identity and count

The submitted-system JSON at the same pinned commit is the authoritative system record. Accelerator names pass through a small reviewed alias registry; fuzzy matching is forbidden. `accelerators_per_node` and `number_of_nodes` must both be explicit positive integers. Unknown or ambiguous identities and counts enter quarantine.

## Metrics

Official mode reports the submitted system's throughput in `tokens/s`. Derived mode divides that exact value by the explicit accelerator count and labels the result `tokens/s/accelerator`. Derived output is never the default and should not be interpreted as an independently measured single-device benchmark.

## Ranking

Higher throughput ranks first. Equal numeric values share the same competition rank. `best-per-accelerator` retains the strongest submitted system for each normalized accelerator identity; `all-systems` preserves every valid submission. Pagination is applied only after the global ranking, so rank numbers do not reset on later pages.

## Provenance and reproducibility

Every source body is SHA-256 hashed. Generated arrays are sorted by stable identifiers before hashing. The reviewed timestamp is fixed in the source registry rather than using wall-clock time. Fixture mode contains three real positive examples and one deliberate negative ambiguity; a committed expected hash detects accidental parser drift.

## Limitations

V1 covers only the stated MLPerf v6.0 Closed generative slices. Results describe whole submitted systems, not price, availability, energy, latency distribution, software maturity or performance outside the tested configuration. A missing accelerator means “no accepted evidence in this exact slice,” not “incapable.” The Interactive path naming convention observed in the pinned source is mapped only where the parsed LoadGen scenario confirms the intended scenario.
