# jawed.co.in — Project Status & Next Actions

**Last verified:** 2026-11-17  
**Status:** Active audit; no production changes authorized or made in this review.

## Project identity
- Production site: https://www.jawed.co.in/ (documented canonical hostname); https://jawed.co.in/
- Production repository: https://github.com/jawedimtiaz/jawed-website
- Production branch: main
- Hosting: Cloudflare Pages (verify deployment settings before any infrastructure change)
- Separate Lab: jawedimtiaz/jawed-website-ai-studio-lab, deployed as a Cloudflare Worker at lab.jawed.co.in. Never mix Lab or customer-project code/configuration into this repository.

## Verified repository baseline
- Last baseline commit reviewed: 423d05fae8f73475887e8ab05f042746f3aab451 — “feat: add Prism.js syntax highlighting and download functionality”.
- The repository is a React 18 / TypeScript / Vite 6 application; verify package manifests again before implementation.
- Current main sitemap tests expect /guides as a canonical hub and apex-host sitemap URLs.
- App route declarations identify /guides as the primary navigation route and /field-guides and /notes as backward-compatible aliases to the same listing page.
- RouteSeo.tsx currently maps the /notes hub to /field-guides/, which appears inconsistent and needs route/content review.
- Sitemap generator, robots.txt, canonical metadata and tests use https://jawed.co.in; project-level configuration documents https://www.jawed.co.in/ as the canonical host. Production redirect behavior has not been independently verified in this review.

## Active pull requests reviewed
| PR | Purpose | Current assessment |
|---|---|---|
| [#965](https://github.com/jawedimtiaz/jawed-website/pull/965) | SEO canonical aliases | Draft/open. Do not merge as-is: proposed /guides → /field-guides canonical direction conflicts with current router declarations and sitemap regression tests. |
| [#966](https://github.com/jawedimtiaz/jawed-website/pull/966) | Deterministic browser capability state / hydration | Draft/open and stacked on #965. Retarget to main and rerun checks only after dependency/canonical baseline is resolved. |
| [#962](https://github.com/jawedimtiaz/jawed-website/pull/962) | Route-specific metadata HTML snapshots | Review/rebase required; do not merge based on PR description alone. |
| [#963](https://github.com/jawedimtiaz/jawed-website/pull/963) | SSG and hydration readiness audit | Separate workstream; do not assume it implements full SSG/SSR. |
| [#958](https://github.com/jawedimtiaz/jawed-website/pull/958) | Service-worker sitemap bypass | Stale/diverged per prior comparison; main already includes sitemap/robots bypass logic. Recheck before action. |
| [#882](https://github.com/jawedimtiaz/jawed-website/pull/882) | Earlier project handoff document | Open historical handoff PR; review before treating its content as current. |

PR states and head SHAs must be rechecked live before acting.

## Current verified findings / blockers

### SEO and canonical routing
1. Preserve /guides as the primary hub unless evidence and an approved route decision establish otherwise.
2. Determine whether /field-guides is only a legacy alias or an independently intended content hub.
3. Review /notes canonical metadata against actual content/navigation; do not redirect until equivalence is established.
4. /services-dispatch versus /services needs the same content-equivalence and redirect review.
5. Decide and verify canonical hostname before changing absolute canonical URLs, sitemap, robots and tests. Project documentation specifies www, but live redirect behavior remains unverified.
6. Current tests explicitly expect /guides and apex sitemap URLs. Update tests only after an intentional route/host decision—not to make a candidate pass.

### Security supply-chain
- PR #965 and #966 report a Security Supply Chain failure due to a credential-like literal in firebase-applet-config.json.
- The Firebase Web API key is client-side configuration, but restrictions/referrers have not been owner-verified in Google Cloud Console.
- The scanner extension list was observed to omit .ts and .tsx; confirm current main before modifying.
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
1. Complete route taxonomy review: inspect navigation links, listing/detail components, content records and canonical metadata for /guides, /field-guides, /notes, /services and /services-dispatch.
2. Verify documented www canonical host against actual Cloudflare redirect configuration/live HTTP responses before changing source.
3. Prepare a bounded revision plan for PR #965; do not merge it as-is.
4. Recheck PR #966 dependency and security workflow after #965 route baseline is corrected.
5. Continue independent security supply-chain investigation without weakening controls.
6. Update this file and docs/WEBSITE_DEVELOPMENT_PROGRESS_LOG.md after each meaningful verified milestone.

## New-chat continuation prompt
Read PROJECT_STATUS.md first, then the latest entries in docs/WEBSITE_DEVELOPMENT_PROGRESS_LOG.md. Recheck GitHub main, open PRs and CI because this status is a dated snapshot. Continue from Immediate next actions. Do not repeat completed investigation, assume stale PR state, or modify/merge/deploy production without approval.
