# Dataset update and rollback runbook

1. Select and review a new immutable MLCommons commit. Never import a moving branch.
2. Update only the source registry commit and reviewed timestamp.
3. Review changed system identities against the explicit alias registry; do not add fuzzy fallbacks.
4. Run `npm run data:fixture`; investigate any expected-hash change.
5. Run `npm run data:full` and inspect manifest, coverage, quarantine and changelog.
6. Run `npm run data:verify`, `npm test`, `npm run type-check`, and `npm run build`.
7. Review row-level immutable URLs and hashes from at least one result per vendor and slice.
8. Commit generated artifacts atomically with registry changes.
9. Deploy to preview, verify free and fail-closed paid routes, then promote.

Rollback by reverting the single dataset-promotion commit, rerunning verification and deploying. Never edit generated JSON manually. A rollback restores the previous immutable snapshot; it does not rewrite its manifest.
