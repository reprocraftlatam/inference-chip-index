# Verification report

## Reproducible data

- Fixture snapshot: `sha256:ba1e54b100ccf786a9b1e1aab3431041aee848b0bf95ed48d728c140dee6385d`
- Full snapshot: `sha256:d953bc0bac8cd2a80fd2118a23628cf3e9bfa2148de1e79cb9fe973e28e671af`
- Full import: 145 accepted results, 50 systems, 13 accelerators, 9 slices, 0 quarantined records
- `npm run data:verify`: passed
- Automated tests: 17 passed, covering parsing, reviewed identity aliases, metrics, quarantine, exact-slice isolation, ranking order, ties, pagination, derivation, vendor filtering, deduplication, count guards, source-body hashes, Lucid architecture and response-size bounds
- TypeScript: passed
- Next.js production build: passed; 14 routes generated
- Production runtime smoke: 10 pages/routes, 2 free invocations and 2 paid fail-closed invocations passed

## Runtime checks

Local `/api/agent/health`, entrypoint discovery, agent card, `get-dataset-status` and `preview-inference-chips` returned 200. An unpaid `rank-inference-chips` call with no payment configuration returned 503 and:

```json
{"error":{"code":"payment_configuration_error","message":"Entrypoint \"rank-inference-chips\" selects x402, but that payment runtime is not configured."}}
```

That is the required fail-closed state: a priced handler is not reachable for free.

The canonical OASF route is mounted and returns the SDK's documented `404 not_found` optional-capability state because V1 intentionally installs only the three task-pinned SDK packages and no identity/OASF extension. The route module still delegates directly to `runtime.http.handlers.oasf`.

## Security review

No secrets or personal data are present in the repository. Inputs are Zod-bounded, output arrays and page sizes are bounded, exact slice IDs prevent cross-workload comparisons, external source links are immutable, and the runtime is server-only. `npm audit` reports advisories in transitive Hono/PostCSS packages required by the task-pinned Lucid/Next versions; no compatible automated fix exists without violating those pins. The app does not use Hono auth/JWT, CORS reflection, static serving, cookie helpers, JSX SSR or source-map parsing APIs implicated by those advisories. Upgrade the pinned SDK stack when compatible releases are mandated.
