# Cloudflare Pages Deployment Contract

This repository is deployed as a Cloudflare Pages site with Pages Functions under `functions/`.

## Expected deployment configuration

- **Build command:** none
- **Build output directory:** repository root (`.`)
- **Functions:** discovered from `functions/`
- **Production domain:** `https://jawed.co.in`
- **AI provider configuration:** Cloudflare Pages production secret `AI_PROVIDER_API_KEY`; optional `AI_PROVIDER_MODEL`

The site is intentionally dependency-free at build time. Do not add a package manifest or framework build step solely to satisfy deployment tooling.

## Verification

After a production deployment:

1. `GET /api/ai` must return JSON readiness metadata.
2. `/ai/` must load as HTML.
3. A discovery URL such as `/notes/?q=automation` must load and preserve the query parameter.
4. Cloudflare deployment logs must be checked if a Pages deployment reports failure.

A failed Cloudflare preview notification without accessible build/runtime logs is not sufficient evidence for changing application code.
