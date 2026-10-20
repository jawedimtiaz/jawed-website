# Phase 0 — Cloudflare Pages Routing and Deployment Findings

**Review date:** 2026-10-20  
**Production commit reviewed:** `d66ea9fc5326a92d362dd135e735eab6e71f0678`  
**Production deployment:** `9df97e2c-cf60-4774-8a1a-bfebec6249a4`  
**Cloudflare Pages project:** `jawed-website`

## Confirmed evidence

The Cloudflare API reports the production build command as `npm run build` and output directory `dist`. The successful deployment manifest includes `/index.html`, hashed Vite assets `/assets/index-BakcIRte.js` and `/assets/index-D7AeZ5cc.css`, and `/404.html`. It does not include `/_headers`, `/_redirects`, or `/_routes.json`. There is no `functions/` directory in the reviewed repository tree and Cloudflare reports `uses_functions: false`.

The Vite build log includes CSS syntax warnings around an orphaned block in `src/index.css`. The build completed, but those warnings should be removed.

Scheduled production monitors reported:
- `/notes/?q=automation`: expected 200, got 404.
- Multiple sitemap routes, including field guides and tools: expected 200, got 404.
- `/api/ai`: expected JSON 200, got HTML 404; POST monitor expected 403 but received 405.
- Old static asset probes for `/assets/css/style.css` and `/assets/js/main.js` return 404; the current Vite build emits hashed assets instead.

The current frontend's `askJawedAi` implementation uses bundled knowledge data in the browser and does not call `/api/ai`. Those API monitors are therefore inconsistent with the current architecture.

## Proposed branch-only repair

- Publish `_headers` and `_redirects` from `public/` so Vite copies them into `dist/`.
- Add explicit SPA rewrites for known React Router routes while retaining legacy redirects and the custom 404 response for unknown routes.
- Remove the confirmed orphaned CSS declaration block causing Vite minifier warnings.
- Update the deployment handoff to reflect the verified Vite/Cloudflare Pages architecture and the current client-side AI boundary.

Branch: `fix/cloudflare-pages-spa-routing`

## Limits and next steps

This is a diagnosis from Cloudflare deployment metadata, build logs, GitHub repository contents, and scheduled monitor output. The browser-rendering check was rate-limited, so no independent rendered screenshot or browser-console evidence was obtained. Do not claim that a blank homepage was conclusively explained by these findings.

- [ ] Validate preview deployment contents and direct-route behavior.
- [ ] Update stale monitoring contracts for the Vite hashed assets and client-side AI.
- [ ] Run current build and accessibility/SEO checks.
- [ ] Review the browser rendering/blank-page report and collect console/network evidence if the homepage still renders blank.
- [ ] Do not merge/deploy until relevant checks and route behavior have been reviewed.

No production mutation was made.
