# AI Production E2E Smoke-Test Harness

Run against the deployed site after the Cloudflare production secret is configured:

```bash
node scripts/validate-ai-production-e2e.mjs https://jawed.co.in
```

## Behavior

The harness first calls `GET /api/ai`.

- If the deployment is reachable and reports `not_configured`, the harness exits successfully but explicitly skips the provider request.
- If the deployment reports `configured`, it submits a real provider-backed question and validates the response and structured source contract.
- The harness never accepts an API key as a command-line argument and never prints credentials.

## Successful E2E criteria

A provider-backed pass requires:

1. `GET /api/ai` reports `configured`.
2. `POST /api/ai` returns HTTP 200.
3. A non-empty assistant reply is returned.
4. Structured sources are present and contain only same-site relative URLs with non-empty titles.
5. No API key is present in the health response.

## Current verification boundary

This environment could not reach `jawed.co.in` during Phase 20B network verification, so no live provider response is being claimed from this run. The repository harness is ready for execution from a network that can reach the deployment.
