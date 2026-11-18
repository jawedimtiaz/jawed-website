# jawed.co.in — Project Status & Next Actions

**Last verified:** 2026-11-17  
**Status:** Active audit; no production changes authorized or made in this review.

## Project identity
- Production site: https://jawed.co.in/ (verified canonical host); https://www.jawed.co.in/ redirects to apex with HTTP 301.
- Production repository: https://github.com/jawedimtiaz/jawed-website
- Production branch: main
- Hosting: Cloudflare Pages (verify deployment settings before any infrastructure change)
- Separate Lab: jawedimtiaz/jawed-website-ai-studio-lab, deployed as a Cloudflare Worker at lab.jawed.co.in. Never mix Lab or customer-project code/configuration into this repository.

## Verified repository baseline
- Last baseline commit reviewed: 423d05fae8f73475887e8ab05f042746f3aab451 — “feat: add Prism.js syntax highlighting and download functionality”.
- The repository is a React 18 / TypeScript / Vite 6 application; verify package manifests again before implementation.
- Current main sitemap tests expect /guides as a canonical hub and apex-host sitemap URLs.
- App route declarations identify /guides as the primary listing route; /field-guides and /notes render the same combined listing page as backward-compatible aliases.
- Header navigation links only to /guides and /services.
- The combined listing contains two distinct datasets: FIELD_GUIDES entries and notesData quick notes. Guide cards link to /field-guides/:slug; quick-note cards link to /notes/:slug.
- Detail routing is content-aware: field-guide slugs render FieldGuideDetailPage and canonicalize to /field-guides/:slug; quick-note slugs render from notesData and canonicalize to /notes/:slug. RouteSeo also recognizes /guides/:slug and resolves canonical URLs by content type.
- The three hub URLs render the same combined listing. Current reviewed candidate decision in PR #965: use `/field-guides` as the single hub canonical for `/guides`, `/field-guides` and `/notes`; retain content-specific detail canonicals (`/field-guides/:slug` and `/notes/:slug`). This is a candidate branch change only, not yet merged or approved for production.
- Sitemap generator, robots.txt, canonical metadata and tests use https://jawed.co.in. Cloudflare's active dynamic redirect rule confirms www → apex with HTTP 301 and preserves query strings. Both hostnames are active custom domains on the Pages project. The project-level instruction that says www is canonical is stale and should be corrected.

## Active pull requests reviewed
| PR | Purpose | Current assessment |
|---|---|---|
| [#965](https://github.com/jawedimtiaz/jawed-website/pull/965) | SEO canonical aliases | Draft/open. Its /guides and /notes hub → /field-guides canonical strategy is structurally defensible because all three hub routes render the same combined listing and detail pages retain separate content-specific URLs. It also changes /ai to noindex, follow although this is not described in the PR summary; require rationale/review. Remaining hard blocker: Security Supply Chain finding; complete full diff/CI review before approval. |
| [#966](https://github.com/jawedimtiaz/jawed-website/pull/966) | Deterministic browser capability state / hydration | Draft/open and stacked on #965. Retarget to main and rerun checks only after dependency/canonical baseline is resolved. |
| [#962](https://github.com/jawedimtiaz/jawed-website/pull/962) | Route-specific metadata HTML snapshots | Review/rebase required; do not merge based on PR description alone. |
| [#963](https://github.com/jawedimtiaz/jawed-website/pull/963) | SSG and hydration readiness audit | Separate workstream; do not assume it implements full SSG/SSR. |
| [#958](https://github.com/jawedimtiaz/jawed-website/pull/958) | Service-worker sitemap bypass | Stale/diverged per prior comparison; main already includes sitemap/robots bypass logic. Recheck before action. |
| [#882](https://github.com/jawedimtiaz/jawed-website/pull/882) | Earlier project handoff document | Open historical handoff PR; review before treating its content as current. |

PR states and head SHAs must be rechecked live before acting.

## Current verified findings / blockers

### SEO and canonical routing
1. /guides, /field-guides and /notes render the same combined listing. PR #965 proposes /field-guides as the single hub canonical, which is a valid candidate despite /guides being the navigation path; retain distinct detail canonicals (/field-guides/:slug and /notes/:slug).
2. /services and /services-dispatch mount the same page; /services is the primary navigation path. PR #965 correctly proposes /services as the canonical destination.
3. Canonical hostname is verified as `https://jawed.co.in/` (apex): Cloudflare's enabled dynamic redirect rule sends `https://www.jawed.co.in/*` to the apex with HTTP 301 and preserves query strings. Both hostnames are active custom domains on Pages. Repository canonical URLs and sitemap already use apex; do not migrate them to www.
4. PR #965's `canonicalUrl()` applies `normalizePath()`, which strips trailing slashes from non-root paths. Its `/field-guides/` metadata value therefore renders as `https://jawed.co.in/field-guides`, matching sitemap slash convention. Add a regression assertion against the rendered canonical URL for stronger coverage.

### Security supply-chain
- PR #965 reports a Security Supply Chain failure due to a credential-like literal in firebase-applet-config.json. PR #966 inherits the same dependency/blocker.
- firebase-applet-config.json contains a Firebase-format Web API key. src/lib/firebase.ts also contains a duplicate hardcoded fallback equal to that JSON key (value intentionally not reproduced here).
- The security scanner flags the JSON key and fails the supply-chain gate; its source-file extension allowlist omits .ts and .tsx, so the duplicate TypeScript fallback is not currently scanned.
- Google Cloud API restrictions and authorized HTTP referrers have not been owner-verified. Do not change the key or introduce a scanner exception until that review is complete.
- Do not weaken or broadly suppress secret scanning. Verify key restrictions, remove redundant hardcoded fallback only if safe, extend scanner coverage, and implement a narrowly scoped schema-aware public Firebase config exception only with evidence and tests.

### Sitemap / service worker
- Main's service worker and Workbox config were previously inspected and include sitemap/robots bypass rules.
- Verify deployed behavior separately; repository source alone does not prove production behavior.
- Sitemap previously contained 86 URLs; regenerate and recount from current main before relying on that number.

## Change-control rules
1. Inspect current main, current PRs and relevant files before each workstream.
2. Use a dedicated branch and bounded PR; never commit directly to production main.
3. No production configuration, DNS, Cloudflare settings, credentials, secrets, or account settings changes without explicit approval.
4. No merge/deployment without explicit approval.
5. Run relevant tests and CI; report actual outcomes only.
6. Review complete diff and preserve existing routes, APIs, integrations and security controls.
7. Keep production website, Studio Lab and customer projects strictly separate.

## Immediate next actions
1. Resolve the Security Supply Chain gate without weakening Phase 38C: owner-side verification of Firebase API restrictions/referrer restrictions is still required before deciding on a narrowly scoped public-config exception.
2. Ask the PR #965 author to justify or remove the unexplained `/ai` `noindex, follow` change; it is outside the stated canonical-alias scope.
3. Strengthen PR #965 tests to assert the rendered canonical URL after `canonicalUrl()` normalization, then rerun all CI.
4. Keep `/guides`, `/field-guides`, `/notes` aliases as SPA rewrites for now; any permanent path redirects require a separate backlink/UX decision.
5. Once #965 is resolved, retarget #966 to `main` and rerun its complete checks.
6. Correct the progress log's older entries only by adding a newer dated correction; preserve historical audit notes.

## New-chat continuation prompt
Read PROJECT_STATUS.md first, then the latest entries in docs/WEBSITE_DEVELOPMENT_PROGRESS_LOG.md. Recheck GitHub main, open PRs and CI because this status is a dated snapshot. Continue from Immediate next actions. Do not repeat completed investigation, assume stale PR state, or modify/merge/deploy production without approval.


## 2026-11-18 follow-up verification

- PRs #965, #966 and #967 were rechecked live: all remain draft/open and unmerged. Their current reviewed heads are #965 `b706f422058de79c28f7dbb1620cd0e9bd1342f7`, #966 `d01e801fd42b853cb196a9e034ed6767bc2b7341`, and #967 `d65493721ba8192e85bfe2cee389bb4b45094b32`. Each still has a failing Security Supply Chain workflow for the Firebase client-config JSON credential-like literal.
- Cloudflare Pages project configuration confirms production branch `main`, build command `npm run build`, and only `AI_PROVIDER_API_KEY` in production environment variable metadata; no `VITE_FIREBASE_API_KEY` is configured. The Firebase JSON key is therefore currently part of the runtime configuration path. Do not remove it or its fallback without a replacement plan and authentication regression tests.
- Latest Cloudflare preview for #967: https://33dbe1da.jawed-website.pages.dev, successful build and deploy for commit `d65493721ba8192e85bfe2cee389bb4b45094b32`. This is preview only; production remains main commit `423d05fae8f73475887e8ab05f042746f3aab451`.
- PR #965 adds `noindex, follow` to `/ai` while its sitemap generator and test explicitly keep `/ai` in the sitemap. Resolve this inconsistency before approval. Recommendation: retain `index, follow` unless a documented indexing decision supports noindex.
- PR #965 should also assert the final normalized canonical URL (not only metadata path) in regression tests.
- Outstanding owner action: verify Firebase Web API key API restrictions and authorized HTTP referrers in Google Cloud Console. Do not paste key values into chat.
- No application code, production configuration, DNS, Cloudflare settings, credentials, merges or production deployments were changed during this review.


## 2026-11-18 — Follow-up verification (latest PR #965 candidate)

- PR #965 is draft/open, unmerged, based on `main`, and mergeable at head `d972afe456ab6453a1aa7fb26f712261dd50f918`. Its PR description has been refreshed with the current validation state.
- On this exact head, Security Baseline, Production Cache Reliability, Production Static Asset Reliability, Site Integrity, Finance Calculator Regression, AdSense Readiness, Deployment Runtime Reliability, AI Regression, Interactive Tools and Content Discovery Browser Runtime, and Career Match Browser Runtime all passed. Security Supply Chain remains failed on the credential-like literal in `firebase-applet-config.json`.
- Cloudflare Pages preview `https://c12a697f.jawed-website.pages.dev` completed build and deploy successfully for this exact head. This is preview only; production remains unchanged.
- PR #965 now keeps `/ai` indexable and removes the previous noindex exception from sitemap generation. Its sitemap test asserts the normalized slashless canonical URL for the field-guides hub.
- Additional code review found an authentication/CSP validation gap: `src/pages/tools/MoneyManager.tsx` on the PR branch still imports and calls `signInWithPopup` in both Google sign-in handlers, despite the nearby redirect-based implementation and test description claiming popup-free redirect auth. The current test asserts no popup for `src/tools/MoneyManager.tsx` and the Drive sync helper, but does not assert this for the page-level file. Treat this as a separate defect requiring a bounded fix and runtime test before claiming all Money Manager auth flows are redirect-only.
- The candidate CSP permits `https://*.firebaseapp.com` and `https://accounts.google.com` in `frame-src`. This is a broad wildcard; assess whether the Firebase frame source can be narrowed to the exact configured auth domain and verify actual redirect-auth runtime requirements. Do not remove required origins without testing.
- PR #967 remains draft/open and unmerged at its currently verified head; its documentation preview `https://723d3317.jawed-website.pages.dev` completed build and deploy successfully for commit `29c05546aede73499fa811b9109c8475156291c4`.
- PR #966 remains dependent on #965 and must not be retargeted or merged until #965's security and auth review is resolved.
- Owner-side Google Cloud API restrictions and authorized HTTP referrer verification remain outstanding. Do not remove Firebase client configuration, suppress the scanner, or add a broad allowlist. No production changes, merges, DNS or Cloudflare configuration changes were made.

### Next actions
1. Obtain owner confirmation that the Firebase browser key is restricted to the required APIs and production HTTP referrers; never request or paste the key itself.
2. Correct the Money Manager page-level popup/redirect inconsistency in a bounded branch and strengthen tests to cover every sign-in handler.
3. Review whether the CSP wildcard can be narrowed to the exact Firebase auth domain, then test sign-in and redirect return paths.
4. Resolve the Phase 38C scanner finding with TypeScript/TSX coverage and a narrowly schema-aware client-config treatment only after owner-side key restrictions are verified.
5. Rerun all CI and review the complete diffs. Keep all PRs draft/open until blockers are resolved; no production merge/deploy without explicit approval.
