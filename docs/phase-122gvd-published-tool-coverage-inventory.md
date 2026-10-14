# Phase 122GVD — Published interactive-tool coverage inventory

**Date:** 2026-10-14  
**Repository:** `jawedimtiaz/jawed-website`  
**Baseline:** main after Phase 122GVC merge, `03036539d7e5a4429aa0ccd6b814da238ffccde8`  
**Scope:** Reconcile tool routes in `sitemap.xml` with the existing browser-runtime and calculator-regression scripts. This is a source-level inventory, not a claim that every route or state has been tested.

## Evidence inspected

- `sitemap.xml` (59 listed URLs in the inspected source)
- `scripts/validate-finance-tools-browser-runtime.mjs`
- `scripts/validate-career-match-browser-runtime.mjs`
- `scripts/validate-finance-calculator-regression.mjs`
- `.github/workflows/finance-tools-browser-runtime.yml`
- `.github/workflows/career-match-browser-runtime.yml`

The finance/content-discovery browser gate has recorded a pass on PR #787 head `93dd4dd420c35e53d8752dabbcfeedc8b8511f2a`, including both 1440×1100 and 390×844 viewport runs. Finance regression and security supply-chain gates also passed for that PR. This establishes results for that test revision; it is not a full site accessibility audit or a post-merge production verification.

## Published tools coverage matrix

Status meanings:
- **Browser-tested (selected journeys):** a route is explicitly opened and meaningful behavior is asserted by the inspected browser script. This does not mean every state, keyboard path, or assistive technology is covered.
- **Partially covered:** the route is mentioned in a workflow or checked by source/math assertions, but full interactive runtime coverage is not established here.
- **No dedicated browser journey identified:** no route-specific journey was found in the inspected scripts. This is a gap to triage, not proof that the tool is defective.

| Sitemap route | Existing evidence | Inventory status / remaining gap |
|---|---|---|
| `/tools/` | Sitemap route; no dedicated tool-index journey identified in inspected scripts | No dedicated browser journey identified; verify catalog links, headings, search/filter if present, and mobile layout |
| `/tools/compound-growth-sip-calculator/` | Browser test exercises default result, changed input, reset, required-field invalid state; independent numeric vectors in finance regression | Browser-tested selected journeys; edge cases and keyboard-only journeys remain partial |
| `/tools/inflation-goal-planning-calculator/` | Browser test checks submit/reset, blank required input, and restored default result; regression script includes methodology assertions | Browser-tested selected journeys; further edge cases remain |
| `/tools/retirement-planning-calculator/` | Browser test checks submit/reset, required input, default corpus; regression script checks source/math behavior | Browser-tested selected journeys; further edge cases remain |
| `/tools/personal-finance-snapshot/` | Browser test checks default math, blank-input error/stale output clearing, reset | Browser-tested selected journeys; keyboard and broader numeric boundaries remain |
| `/tools/finance-planning-workspace/` | Browser test covers tabs with arrow/Home/End keys, selected/visible state, snapshot defaults, retirement validation/recovery, and switching panels | Browser-tested selected journeys; all tab content and state combinations not established |
| `/tools/ai-prompt-builder/` | Browser test builds prompt from goal/context and clears to empty state | Browser-tested selected journeys; length/edge/error states remain |
| `/tools/interview-preparation-planner/` | Browser test checks sample, clear, and short-job-description feedback | Browser-tested selected journeys; full planner variants and keyboard-only flow remain |
| `/tools/it-troubleshooting-assistant/` | Browser test follows a selected network decision path and checks clear/reset | Browser-tested selected journeys; not every decision-tree branch is covered |
| `/tools/resume-bullet-strength-checker/` | Browser test checks sample output and clear/reset | Browser-tested selected journeys; validation and varied input cases remain |
| `/tools/service-desk-note-formatter/` | Browser test checks output from issue/actions and clear/reset | Browser-tested selected journeys; all fields and malformed/empty input cases remain |
| `/tools/ticket-to-knowledge-base-draft/` | Browser test checks generated draft, safety placeholder, and clear/reset | Browser-tested selected journeys; other input combinations remain |
| `/tools/career-match-resume-review/` | Separate browser script runs desktop and mobile; covers analysis/results visibility, tracker add, save-analysis and saved-item workflow | Browser-tested selected journeys; all matching modes and accessible announcements not established |

## Findings and next actions

1. The inspected source supports a **route-level coverage inventory**, but not a claim of complete tool coverage. Most interactive tool pages have at least one meaningful browser journey.
2. The `/tools/` catalog page has no dedicated journey identified in the inspected scripts. It is the next low-risk candidate for a focused browser smoke test, especially link targets and mobile visibility.
3. Existing tool journeys mostly cover representative paths. The next expansion should prioritize keyboard operation and focus/state assertions for tool controls and result/error regions, rather than duplicating happy-path checks.
4. For the troubleshooting assistant, explicitly map the decision tree's branches before adding branch tests. For finance tools, extend boundary cases only where the tool's input contract defines meaningful cases.
5. A browser test that passes at 390×844 is evidence for that viewport, not proof of WCAG conformance, screen-reader usability, 200% zoom/reflow, forced colors, or reduced-motion support. Those remain separate checks.
6. Production reachability, Google crawler access, live AdSense Policy Center status, and approval are not established by this inventory.

## Acceptance criteria for follow-up

- Add or document a focused route-level smoke test for the tools catalog.
- Record explicit coverage and exclusions for each interactive route.
- Keep browser, regression, and security gates green for changes that touch their respective paths.
- Track manual assistive-technology, zoom/reflow, reduced-motion, and contrast checks separately.
- Keep AdSense inactive until the external/account and content-readiness gates are independently satisfied.

**Decision:** This phase records the current coverage map only. It makes no production changes and does not change the AdSense NO-GO decision.
