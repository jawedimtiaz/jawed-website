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
- The three hub URLs currently render the same combined listing. RouteSeo gives /guides its own canonical, /field-guides its own canonical, and /notes a canonical of /field-guides/. This is a duplicate-hub canonical inconsistency; likely target is /guides for all three hubs, subject to final approval and route tests.
- Sitemap generator, robots.txt, canonical metadata and tests use https://jawed.co.in. Cloudflare's active dynamic redirect rule confirms www → apex with HTTP 301 and preserves query strings. Both hostnames are active custom domains on the Pages project. The project-level instruction that says www is canonical is stale and should be corrected.

## Active pull requests reviewed
| PR | Purpose | Current assessment |
|---|---|---|
| [#965](https://github.com/jawedimtiaz/jawed-website/pull/965) | SEO canonical aliases | Draft/open. Its /guides and /notes hub → /field-guides canonical strategy is structurally defensible because all three hub routes render the same combined listing and detail pages retain separate content-specific URLs. Main's tests intentionally change with the candidate. Remaining hard blocker: Security Supply Chain finding; complete full diff/CI review before approval. |
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
5. Decide and verify canonical hostname before changing absolute canonical URLs, sitemap, robots and tests. Project documentation specifies www, but live redirect behavior remains unverified.
6. Current tests explicitly expect /guides and apex sitemap URLs. Update tests only after an intentional route/host decision—not to make a candidate pass.

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
1. Update project-level canonical-host documentation from www to apex, based on the active Cloudflare redirect rule. No Cloudflare rule change is required.
2. Complete PR #965 review: verify sitemap generation, runtime canonical tags, trailing-slash normalization and path alias behavior. Its /field-guides hub canonical strategy is acceptable if all tests and CI pass; security supply-chain finding remains unresolved.
3. Inspect public/_redirects and Cloudflare redirect rules for path aliases; verify destination equivalence and inbound-link handling before adding permanent redirects.
4. Recheck PR #966 dependency and security workflow after #965 route baseline is corrected.
5. Continue independent security supply-chain investigation without weakening controls.
6. Update this file and docs/WEBSITE_DEVELOPMENT_PROGRESS_LOG.md after each meaningful verified milestone.

## New-chat continuation prompt
Read PROJECT_STATUS.md first, then the latest entries in docs/WEBSITE_DEVELOPMENT_PROGRESS_LOG.md. Recheck GitHub main, open PRs and CI because this status is a dated snapshot. Continue from Immediate next actions. Do not repeat completed investigation, assume stale PR state, or modify/merge/deploy production without approval.
