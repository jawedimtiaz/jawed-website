# Phase 122GY — Interactive-tool browser coverage and accessibility gap audit

**Date:** 2026-10-13  
**Repository:** `jawedimtiaz/jawed-website`  
**Base commit:** `98a2d8c406d7e31cbf6240c73b3e30213fc66544`  
**Decision:** Existing automated browser smoke tests provide meaningful coverage, but this repository-source inspection does not establish that current production tests have passed or that the entire site is accessible. AdSense remains inactive.

## Evidence inspected

- `.github/workflows/finance-tools-browser-runtime.yml`
- `scripts/validate-finance-tools-browser-runtime.mjs`
- `.github/workflows/career-match-browser-runtime.yml`
- `scripts/validate-career-match-browser-runtime.mjs`
- `scripts/validate-finance-calculator-regression.mjs`

The finance-tools workflow is designed to use Chrome and ChromeDriver against `https://jawed.co.in`, with desktop (1440×1100) and mobile-sized (390×844) viewports. Its scripted journeys exercise visibility/hit-testing for controls, calculation changes, required-field validation, reset behavior, finance workspace tabs, prompt generation, interview planning, troubleshooting decision paths, resume bullet analysis, note formatting, and knowledge-base draft placeholders. It also checks selected content-discovery pages, examples, and related links. A separate Career Match workflow checks its primary controls, sample flow, results and tracker behavior.

These are valuable existing checks; they should be reused rather than duplicated.

## Coverage classification

| Area | Source-level evidence | Current conclusion |
|---|---|---|
| Primary controls are visible and receive pointer hit-tests | Both browser scripts | Covered for selected controls, not every control on every page |
| Desktop and mobile-sized browser journeys | Both scripts define viewport runs | Designed into the checks; latest execution results were not established by this source inspection |
| Calculator calculations, invalid input and reset | Browser script plus independent deterministic regression script | Meaningful coverage exists; not proof every edge case is covered |
| Tool-specific generation / decision flows | Finance-tools browser script | Several important journeys are exercised |
| Selected links and content examples | Finance-tools browser script | Partial link/content coverage only |
| Keyboard-only operation and focus order | No comprehensive assertion identified in the inspected workflow/script sections | Gap to verify |
| Screen-reader names, roles, state and error announcements | No automated accessibility scan or assistive-technology run established by inspected files | Gap to verify |
| Reduced-motion behavior, zoom/reflow and high-contrast/forced-colors | Not established by inspected tests | Gap to verify |
| Full internal/external link inventory | Only selected links are tested | Gap to verify |
| Every published interactive tool and every state | Script targets a defined subset of tools/pages | Inventory reconciliation required |
| Live AdSense review state, Google crawler access and approval | Cannot be established by repository tests | Must remain a separate external/account verification |

## Next implementation / verification sequence

1. **Confirm current CI state** for the latest `main` commit and, when the workflows support it, run the existing browser-runtime gates. Record the actual run URL, commit, viewport results and failure details; never infer a pass from the presence of a workflow file.
2. **Map every published tool** in the sitemap to a test case or an explicit reason it is excluded. Add tests only for genuine coverage gaps.
3. **Add automated accessibility checks** using a maintained accessibility engine if repository dependencies and CI policy permit. Begin with WCAG-relevant structural checks (document title, landmarks, accessible names, label associations, contrast, heading structure, and invalid/duplicate IDs); automated checks do not replace manual testing.
4. **Add keyboard journeys** for navigation, tabs, dialogs/widgets and generated results: Tab/Shift+Tab order, visible focus, Enter/Space activation, Escape close behavior where applicable, and no keyboard traps.
5. **Manually verify screen-reader announcements** for dynamic results and validation errors, and inspect 200% zoom/reflow and reduced-motion settings.
6. **Run targeted fixes only** for confirmed defects, then repeat the relevant regression gates and verify the production revision after deployment.
7. Reconcile remaining link, content-quality, privacy and trust checks before making an AdSense readiness decision.

## Acceptance criteria for closing this audit

- The tool inventory is reconciled with sitemap/repository routes.
- Existing production browser workflows have recorded pass/fail evidence tied to a specific commit.
- Confirmed keyboard/accessibility issues are fixed or explicitly documented with a reasoned exception.
- Tool outputs, errors and resets remain coherent on desktop and mobile-sized viewports.
- Internal links and critical official external references are checked systematically.
- Production deployment and post-deployment smoke checks are confirmed.

**Scope limitation:** this is a review of the existing test source and its intended coverage, not a new execution of Chrome against production, a full accessibility conformance audit, or evidence of Google's AdSense approval. Do not claim those outcomes until the relevant runs or manual checks are actually completed.

**AdSense decision:** keep ads inactive; do not request another review based on this phase alone.
