# Phase 122GVH — Post-merge production verification record

**Date:** 2026-10-14  
**Repository:** `jawedimtiaz/jawed-website`  
**Production domain:** `https://jawed.co.in`  
**Scope:** Record the post-merge production browser evidence for the Phase 122GVF troubleshooting decision-path fix. This is an evidence record, not a site-wide accessibility audit or AdSense approval decision.

## Change under verification

- PR #790: https://github.com/jawedimtiaz/jawed-website/pull/790
- Merge commit: `ca8549e8da76dfd3393e41bd482bfec968879289`
- Fix: resolve category-specific troubleshooting nodes first and fall back to shared decision nodes, so the Microsoft sign-in path can reach the shared-service question.
- Added browser scenarios for Microsoft sign-in/shared-service scope, macOS and Windows change-comparison branches, general IT user-scope, and reset/focus behavior.

## Production evidence

The post-merge GitHub Actions browser-runtime workflow ran on the merge commit and explicitly targeted production.

- Workflow run: https://github.com/jawedimtiaz/jawed-website/actions/runs/38523475187
- Event: `push` to `main`
- Tested SHA: `ca8549e8da76dfd3393e41bd482bfec968879289`
- Environment recorded in the job log: `BASE_URL=https://jawed.co.in`
- Revision-marker wait: **PASS** — log reports “Production revision markers are live.”
- Desktop viewport 1440×1100: **PASS**
- Mobile viewport 390×844: **PASS**
- Overall browser runtime smoke: **PASS**
- Production Pages deployment run: https://github.com/jawedimtiaz/jawed-website/actions/runs/38523474316 — **success**

This evidence closes the specific question of whether the Phase 122GVF revision was served and passed the configured production browser smoke test after merge. The configured smoke covers selected journeys, not every route or state.

## Scope limits and remaining work

This run does not establish:
- complete WCAG conformance or screen-reader usability;
- 200% zoom/reflow, forced-colors, or reduced-motion behavior;
- manual review of all published pages and external links;
- live Google AdSense Policy Center status, crawler access, account setup, or approval.

Keep AdSense runtime inactive. Continue the content-quality and readiness work separately; do not infer resubmission readiness from a passing browser workflow.

## Decision

**Phase 122GVH production verification: PASS for the Phase 122GVF fix and the configured desktop/mobile browser journeys.** Site-wide accessibility, editorial review, and external/account readiness remain open.
