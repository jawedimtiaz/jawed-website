# Phase 122HB — Internal-link validation and critical external-reference audit

**Date:** 2026-10-13  
**Repository:** `jawedimtiaz/jawed-website`  
**Base commit:** `bd92d036939ca1fcb425b7ceb1f7b6db8a8272de`  
**Decision:** The existing site-integrity gate already checks local href/action routes and fragment targets across published HTML. This phase documents that coverage and its limits; it does not claim a fresh full link crawl or live external-link status verification.

## Existing automated coverage confirmed

Inspected `scripts/validate-site-integrity.mjs` and `.github/workflows/site-integrity.yml`.

The existing validator:
- compares sitemap routes with repository HTML source files;
- checks canonical metadata and primary navigation contracts;
- scans local `href` and `action` values in published HTML;
- validates local route targets against the published route inventory;
- checks fragment targets against IDs/names in the destination HTML;
- runs through the Site Integrity Gate on relevant pull requests and main pushes.

This is stronger than a manual spot check for internal routing because it is repository-wide and repeatable. It still needs an actual successful CI run tied to the target commit to count as execution evidence.

## Limitations and residual risks

- External HTTP(S) destinations are not comprehensively fetched by the internal-link scanner, so this does not prove third-party URLs respond, redirect safely or still contain the cited information.
- Exempted static assets and file-like paths are not equivalent to a live asset fetch check.
- JavaScript-generated destinations and interaction-only navigation may not be represented by static href/action scanning.
- Fragment checks are based on source text and do not prove the destination's rendered state is visible or accessible.
- A passing link checker does not validate editorial accuracy, whether an external page remains authoritative, or whether a reader can understand the link's purpose.
- Link validation does not replace keyboard, screen-reader or mobile interaction tests.

## Follow-up priorities

1. Confirm a passing Site Integrity Gate on the current merged `main` commit.
2. Maintain a small, intentional list of critical external references (official vendor documentation, privacy/legal references and financial-education sources) and check their status/content manually or via a bounded, rate-limited CI check.
3. Prefer official primary sources; label third-party or illustrative material clearly.
4. Check links embedded in generated outputs and interactive UI, not only static HTML.
5. For any confirmed defect, fix only the broken destination or misleading label, then rerun site-integrity and relevant production smoke checks.

## Decision

No public copy or link target was changed in this documentation-only phase because this source inspection did not establish a specific broken URL. Avoid adding an unrestricted external-link crawler without controls for rate limits, redirects, transient failures and third-party availability.

**AdSense remains inactive.** This audit does not establish Google crawler access, AdSense account status, or approval.
