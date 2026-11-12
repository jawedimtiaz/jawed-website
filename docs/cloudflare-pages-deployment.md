# Cloudflare Pages Deployment Contract

This repository currently builds a React single-page application with React Router and Vite, deployed to Cloudflare Pages.

## Verified production configuration

- **Cloudflare Pages project:** `jawed-website`
- **Production branch:** `main`
- **Build command:** `npm run build`
- **Build output directory:** `dist`
- **Root directory:** repository root
- **Production origins:** `https://jawed.co.in` and `https://www.jawed.co.in`
- **Current frontend AI:** client-side knowledge search in `src/services/aiKnowledgeEngine.ts`
- **Pages Functions:** no `functions/` directory was present in the reviewed production commit; do not assume `/api/ai` exists.

## Cloudflare Pages files and SPA routing

Vite copies files from `public/` into `dist/`. Therefore Cloudflare Pages configuration files that must be deployed with the build output belong in `public/`, including:

- `public/_headers` — security headers and CSP
- `public/_redirects` — legacy redirects and SPA rewrites only for non-canonical alias routes
- `public/404.html` — custom not-found page for paths that are not mapped to the application

The root-level `_headers` and `_redirects` are retained for repository-side contracts and review, but are not automatically copied into Vite's `dist/` output.

Canonical URLs listed in the generated sitemap are emitted as route-specific static HTML snapshots after the Vite build. Do not add a `200` rewrite that matches any canonical sitemap URL: it would send the homepage HTML and override the route-specific metadata. Keep `200` rewrites only for non-canonical aliases that are not in the sitemap, and keep those aliases synchronized with `src/App.tsx`. Preserve the custom `404.html` response for unknown paths.

## AI runtime boundary

The current React app imports `askJawedAi` from `src/services/aiKnowledgeEngine.ts`, which searches the bundled knowledge data in the browser. It does not call `/api/ai`. Existing checks that expect `/api/ai` or a Pages Functions directory are stale relative to this implementation and should be updated to validate the current client-side AI journey instead. Do not add a server endpoint, provider API key, or paid AI runtime just to satisfy an outdated monitor.

## Verification after a reviewed deployment

1. Confirm the Cloudflare Pages deployment succeeds and includes `_headers`, `_redirects`, the hashed Vite JS/CSS assets, and expected public assets.
2. Test the homepage and representative routes by direct URL, including `/notes/?q=automation`, `/field-guides/`, `/tools/`, and `/ai/`.
3. Confirm legacy redirects and the custom 404 behavior.
4. Verify security headers and CSP from the deployed response.
5. Exercise the client-side AI flow and its privacy guardrails in a browser.
6. Reconcile outdated scheduled monitors before treating their pass/fail state as a reliable deployment signal.

No production deployment or account setting change is authorized by this document.
