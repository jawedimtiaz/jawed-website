# AI Production Regression Matrix

Phase 20G consolidates the accumulated AI contracts into one deterministic repository-side regression entry point.

## Run

`node scripts/validate-ai-regression.mjs`

The matrix executes the existing validators for:

1. knowledge coverage
2. retrieval/context behavior
3. response and output safety
4. production configuration readiness
5. browser operational behavior
6. production observability
7. production security/privacy

It then checks the core cross-layer contracts directly, including request limits, rate limiting, server-side credentials, provider no-storage behavior, untrusted-data boundaries, bounded output, source attribution, link sanitization, text-only rendering, structured source URL validation, and memory-only browser history.

## Scope

This is a deterministic repository regression suite. It does not claim that the public deployment is reachable or that a provider-backed request succeeds. The existing production E2E harness remains responsible for optional live provider testing when deployment and configuration permit it.

## Maintenance rule

When a future AI phase changes a contract, update the focused validator first and then update this matrix if the contract belongs to the cross-layer production boundary. The matrix should remain a single high-signal gate rather than duplicating every detailed assertion.
