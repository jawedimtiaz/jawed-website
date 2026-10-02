# Cloudflare Pages Deployment Contract

This repository is deployed as a Cloudflare Pages site with Pages Functions under `functions/`.

## Expected deployment configuration

- **Build command:** none
- **Build output directory:** repository root (`.`)
- **Functions:** discovered from `functions/`
- **Production domain:** `https://jawed.co.in`
- **AI provider configuration:** Cloudflare Pages **Workers AI binding** named `AI`
- **AI model:** fixed `@cf/meta/llama-3.2-1b-instruct`

The site is intentionally dependency-free at build time. Do not add a package manifest or framework build step solely to satisfy deployment tooling.

The production application does not expose a deployment model override. The fixed model boundary is intentional so configuration cannot accidentally select a paid-only model.

## Verification

After a production deployment:

1. `GET /api/ai` must return JSON readiness metadata.
2. `/ai/` must load as HTML.
3. A discovery URL such as `/notes/?q=automation` must load and preserve the query parameter.
4. Cloudflare deployment logs must be checked if a Pages deployment reports failure.
5. When the Workers AI binding is configured, a real `POST /api/ai` request must return a non-empty assistant response and safe Jawed.co.in source metadata.

The repository's deterministic validators mock the Workers AI binding and do not consume remote AI allocation.
