# AI Production Regression Matrix

Phase 20G consolidates the accumulated AI contracts into one deterministic repository-side regression entry point.

## Run

`node scripts/validate-ai-regression.mjs`

The matrix executes 11 deterministic validators covering:

1. knowledge coverage
2. retrieval/context behavior
3. source-set relevance and precision
4. response and output safety
5. production configuration readiness
6. browser operational behavior
7. production observability
8. production security/privacy
9. negative-path behavior
10. API handler behavior
11. provider contract behavior

The validator inventory is self-checked before execution, so this list must remain synchronized with the registered deterministic validator set.

It then checks the core cross-layer contracts directly, including request limits, rate limiting, server-side credentials, provider no-storage behavior, untrusted-data boundaries, bounded output, source attribution, link sanitization, safe DOM rendering with allowlisted source anchors, structured source URL validation, and memory-only browser history.

## Validator inventory contract

The regression matrix self-checks the `scripts/validate-ai-*.mjs` inventory before executing validators. Every deterministic AI validator must be registered in the matrix, preventing a future validator from being silently omitted.

Two scripts are explicitly excluded:

- `scripts/validate-ai-regression.mjs` — the matrix runner itself
- `scripts/validate-ai-production-e2e.mjs` — optional deployment/provider-backed E2E harness, which is not deterministic CI coverage

If a new `validate-ai-*.mjs` validator is added, CI will fail until it is intentionally registered or explicitly classified as an excluded non-deterministic harness.

## Scope

This is a deterministic repository regression suite. It does not claim that the public deployment is reachable or that a provider-backed request succeeds. The existing production E2E harness remains responsible for optional live provider testing when deployment and configuration permit it.

## Maintenance rule

When a future AI phase changes a contract, update the focused validator first and then update this matrix if the contract belongs to the cross-layer production boundary. Any new deterministic `validate-ai-*.mjs` validator must also be registered in the matrix; the inventory self-check enforces this rule.
