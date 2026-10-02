# AI Production E2E Smoke-Test Harness

Run against the deployed site from a network that can reach the production deployment:

```bash
node scripts/validate-ai-production-e2e.mjs https://jawed.co.in
```

No Cloudflare production secret or API key is required by this harness. The production endpoint uses the server-side Workers AI binding when configured.

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

The deterministic CI regression matrix does not execute this provider-backed harness because it would consume remote Workers AI allocation and depend on deployment availability. A real provider-backed E2E run must therefore be performed manually from a network that can reach `jawed.co.in`.

