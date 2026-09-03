# WebMCP: shared, exact-slice hardware research

Inference hardware research is a poor fit for blind browser automation. A model can easily mix workloads, scenarios, accuracy targets, or system-level and per-accelerator metrics while clicking through dense tables. WebMCP lets the page expose the valid comparison operations directly while a human watches and refines the same visible workspace.

## Human + agent workflow

1. Open `/leaderboard` in ChatGPT's in-app browser or Chrome with WebMCP testing enabled.
2. Ask: “List the available exact inference comparison slices.”
3. Ask: “For the largest GPT-OSS Offline slice, compare AMD MI355X, NVIDIA B200 and Intel Arc Pro B60 using official system results.”
4. The agent calls `list_inference_slices`, then `compare_inference_accelerators` with exact IDs. The comparison appears on the page with official source links and any missing-evidence explanation.
5. The human can change a filter manually or ask the agent to reconfigure the visible leaderboard. Both operate on one stateful view.

Example accelerator slugs:

- `amd-instinct-mi355x-amd-instinct-mi355x-288gb-hbm3e`
- `nvidia-b200-nvidia-b200-sxm-180gb`
- `intel-arc-pro-b60-intel-r-arc-pro-r-b60`

## Implementation

The client leaderboard registers four imperative tools in one React lifecycle. An `AbortController` unregisters them on unmount without interrupting completed calls. Pure validation and comparison logic lives in `src/webmcp/leaderboard-tools.ts`; browser registration and visible state updates live in `app/leaderboard/leaderboard-explorer.tsx`.

All tool schemas reject extra properties. Slice, vendor, submitter, view and grouping values are checked against the checked-in dataset. Comparisons accept 2–8 unique slugs and return structured evidence, immutable source URLs, source hashes, and explicit missing-result reasons. Read-only metadata is annotated as such. No tool writes to a server, spends money, invokes the paid API, or exposes secrets.

The site sends `Origin-Agent-Cluster: ?1`, remains HTTPS-only in production, and relies on the WebMCP `tools` permissions-policy default of `self`.

## Verify

```bash
npm ci
npm run type-check
npm test
npm run build
```

The WebMCP tests cover deterministic slice discovery, invalid configuration rejection, exact-slice comparison, missing-evidence reporting, and immutable source provenance.
