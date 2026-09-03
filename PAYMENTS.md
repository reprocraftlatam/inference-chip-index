# x402 payment behavior

Paid entrypoints are declared with `paymentProtocol: x402`, Base Sepolia network `eip155:84532`, and fixed USDC-denominated prices. Payment verification is middleware-owned and occurs before business handler execution.

Required server-only values are `PAYMENTS_RECEIVABLE_ADDRESS`, `PAYMENTS_FACILITATOR_URL`, `PAYMENTS_NETWORK`, and optional facilitator authentication. They must never be prefixed with `NEXT_PUBLIC_`. Incomplete configuration deliberately produces `503 payment_configuration_error` for priced invocations; it does not downgrade them to free routes.

Clients should discover current offers from the agent card or entrypoint listing, submit `{ "input": ... }`, honor the returned x402 challenge, and retry using a stable idempotency key. Input validation errors are deterministic 4xx responses. Callers should retry transient 5xx responses with bounded exponential backoff and must not assume settlement from a transport timeout alone.

The public evaluation deployment intentionally omits live payment credentials unless a reviewed facilitator is available. This preserves a truthful fail-closed demonstration without collecting real funds on a test network.
