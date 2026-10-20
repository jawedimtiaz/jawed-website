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

## Preview verification (2026-10-20)

The latest preview deployment for commit `049006cc325dc10732da8a680b995c0b50cf6356` completed successfully at https://b2fcf51d.jawed-website.pages.dev.

- Cloudflare build logs report **no infinite redirect-loop warnings** after rewrite targets were changed from `/index.html` to `/`. Sixteen informational messages suggest placing exact route rules before wildcard rules; they are performance hints, not loop failures.
- Cloudflare Browser Rendering fetched `/notes/?q=automation` from the preview and returned HTTP 200 with the React-rendered Field Guides page. The response included the expected CSP, HSTS, X-Frame-Options, X-Content-Type-Options, COOP, Referrer-Policy, Permissions-Policy, and X-Permitted-Cross-Domain-Policies headers.
- Site Integrity Gate passed: https://github.com/jawedimtiaz/jawed-website/actions/runs/39474067987
- Deployment Runtime Reliability Gate passed: https://github.com/jawedimtiaz/jawed-website/actions/runs/39474068042
- AdSense Readiness Gate still fails because its legacy validator opens missing `privacy/index.html`.
- AI Regression Gate still fails and needs separate root-cause analysis.
- Security Supply Chain Gate still fails on this branch because the separate manifest-policy correction has not been merged; see PR #883.

The preview route test does not prove that the public homepage blank-page symptom is resolved. It also did not verify post-render canonical metadata or JavaScript console errors.

## Next steps

- [x] Preview build completed.
- [x] Direct-route HTTP 200 and React-rendered content verified on preview.
- [x] No redirect-loop warnings in the latest preview build log.
- [x] Site Integrity and Deployment Runtime validators pass on the candidate branch.
- [ ] Reconcile the remaining stale AdSense, AI/API, and unhashed-asset monitors without weakening meaningful checks.
- [ ] Verify canonical metadata after client rendering and capture browser console/network evidence for the homepage.
- [ ] Do not merge/deploy until remaining relevant checks and the release candidate have been reviewed.

No production mutation was made.


## Continued gate repair (2026-10-20)

Further changes on the same review branch:

- Replaced the obsolete AI regression entry point, which imported retired `functions/lib/*` modules, with source/data checks for the current bundled client-side knowledge engine, personal-query guardrail, widget closed-by-default state, close/minimize handlers, and source links.
- Updated the AdSense privacy validator and final readiness validator to inspect the current React `src/pages/PrivacyPage.tsx` instead of assuming `privacy/index.html` exists.
- Corrected privacy wording that previously implied AdSense and GA4 were active and labelled the policy as GDPR/CCPA compliant. The page now describes advertising/analytics as conditional on actual configuration, consent, and activation gates. This is a source-level wording correction, not a legal compliance certification.
- Rebuilt the Career Match browser check to exercise the current React form and output, and changed its workflow to install dependencies, build Vite, and test the Vite preview instead of serving the repository root as plain static files.
- Corrected the security validator to allow only the named `.env.example` template while scanning its contents, and to validate the expected `package.json` instead of rejecting the app's manifest.

The latest CI runs for these changes are pending/in progress. Do not report these changes as passed until the corresponding workflow runs complete. The broader AdSense content audit still needs a review of legacy static-page assumptions and should continue to fail closed where published-content evidence is missing.


## SEO and monitor alignment update (2026-10-20)

The review branch now also addresses a confirmed SPA SEO gap: the shared `SeoHead` component was only used on the homepage, so client-side route navigation could retain homepage title/canonical metadata. A new `RouteSeo` component maps the current React routes and note/blog data to unique titles, descriptions, canonical URLs, Open Graph metadata, and robots directives. It removes the duplicate homepage title suffix and marks the interactive AI assistant page `noindex, follow`.

The sitemap is now synchronized at the repository root and in `public/` and includes **63 canonical URLs**: core pages, all 30 note guides, both blog posts, and 14 tool pages. Non-canonical aliases such as `/notes/`, `/guides/`, `/diagnostic-tools/`, and `/services/` are not listed; their route metadata points to the canonical page. The AdSense inventory now refers to the canonical `/field-guides/` page instead of the alias `/notes/`.

The production monitors have been reconciled with the current React/Vite architecture:
- Discover and validate hashed Vite JS/CSS assets from the homepage for static-asset and cache checks.
- Treat `/ai/` as a frontend route and assert that the retired `/api/ai` endpoint remains unavailable, instead of expecting a JSON AI API.
- Check the raw HTML shell separately from client-rendered route metadata.
- Validate sitemap URLs as React app-shell routes rather than expecting route-specific `h1` and canonical metadata in raw HTML.
- Compare robots directives as complete lines, avoiding a false positive where `Disallow: /` matched narrower paths such as `/api/`.
- Align the security baseline with the published `public/_headers`, `public/_redirects`, and `public/404.html` files rather than obsolete root-only static/Pages Functions assumptions.

Latest completed CI on commit `ad687921b9a5e17b62cd61dc8ad955da1ec64cf6`:
- Site Integrity, Deployment Runtime Reliability, Security Baseline, Security Supply Chain, AI Regression, AdSense Readiness, Finance Calculator Regression, production static assets/cache/robots/404/media, canonical origin, and availability checks: **PASS**.
- Career Match browser runtime: **PASS**.
- Interactive tools browser runtime: **in progress** when this note was written; its final result must be checked before marking Phase 0 complete.

The production homepage was independently rendered successfully earlier in this review, but production direct-route and header checks remain tied to a deployment of this branch. The current production deployment has not been changed. AdSense remains pre-activation; CI readiness is not a Google approval or legal compliance certification.
