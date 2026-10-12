# Phase 122I — AdSense Inventory Content Scorecard

Status: **Preliminary repository scorecard; final site-wide review still required**

## Why this scorecard exists

Google's current AdSense decision for `jawed.co.in` is **Low value content**. Technical gates passing does not mean the site meets Google's editorial standards. This scorecard records what was actually reviewed in the initial candidate inventory and separates demonstrated strengths from remaining risks.

Ratings describe the repository content observed on 12 October 2026; they are not Google policy decisions and do not predict approval.

## Candidate inventory review

| Page | Preliminary rating | Evidence and remaining work |
|---|---|---|
| `/` Home | Strong gateway; dependent on destination content | Clearly identifies the site owner and professional focus, links to practical work examples, and guides visitors into notes and tools. Keep homepage concise; improve destinations rather than padding the hero. |
| `/about/` About | Good personal context | First-person professional background, career direction, learning and reason for the site. Keep claims factual and connect interests to relevant public evidence. |
| `/work/` Work hub | Useful but partly navigational | Organizes experience, skills, qualifications and projects and links to supporting notes. Watch duplication across cards and ensure each child page has distinct purpose. |
| `/work/experience/` Experience | Improved | Describes roles and responsibilities, clarifies recognition labels, and now explains the support approach with links to public-safe examples. No unsupported numerical performance claims added. |
| `/work/skills/` Skills | Moderate; list-heavy | Skill categories are present and connected to selected examples. The page should continue to emphasize demonstrated practice rather than expand the technology list without evidence. |
| `/work/certifications/` Certifications | Moderate; inherently a credential list | Lists completed, historical and current learning categories. Added context connecting learning to practical notes and clarifying that credentials are not a substitute for current documentation. |
| `/work/projects/` Projects | Good public-safe evidence foundation | Includes sanitized examples for troubleshooting, device handoff, documentation and the site rebuild. Keep scenarios accurate and clearly distinguish illustrative patterns from actual measured outcomes. |
| `/notes/` Notes index | Useful discovery hub | Search/filter and a broad catalogue of task-focused notes. The index itself is a gateway; individual notes must remain distinct, actionable and accurate. |
| `/blog/` Blog index | Collection still developing | The collection is now more substantial than the original single-post state, including an expanded rebuild case study and an original illustrative IT triage walkthrough. Continue publishing only when there is distinct value. |
| `/topics/` Topics | Useful taxonomy, review for duplication | Groups technology, AI, finance and tools with internal links and a financial disclosure. Check that topic cards guide real tasks and do not merely repeat the same link in multiple categories. |
| `/resources/` Resources | Improved curated reference hub | Links to primary documentation and now provides a reference-first workflow plus task-oriented paths. Keep summaries contextual and avoid reproducing third-party documentation. |

## Work completed in the remediation series

- **122A:** documented the rejection trigger and page-quality rubric.
- **122B:** improved the macOS first-response note and ticket documentation examples; refreshed AI knowledge and fixed an AI source-lookup regression-gate limitation.
- **122C:** improved Windows and network triage guidance; refreshed AI knowledge.
- **122D:** expanded the existing website rebuild article into a technical case study.
- **122E:** improved work-experience clarity and award presentation.
- **122F:** added task-oriented guidance to the resource hub.
- **122G:** added a distinct, clearly illustrative IT triage article, sitemap entry, AI knowledge entry and integrity contract.
- **122H:** connected credentials/current learning to practical notes.
- **122J:** added a scoping decision table, an illustrative troubleshooting example and a ticket-update template to two foundational IT notes.
- **122K:** strengthened AI-for-IT-support guidance with an applied example and an output-review checklist.
- **122L:** added practical usage instructions to the Service Desk Note Formatter and AI Prompt Builder.
- **122M:** added evidence-based interview preparation guidance and a truthful resume-bullet revision pattern.
- **122N:** added illustrative cash-flow, emergency-reserve and net-worth examples to the money-basics note and replaced a US-oriented reference with RBI financial-education material.
- **122O:** fixed a double-escaped newline defect in the AI Prompt Builder and added a regression contract.
- **122P:** refreshed the AdSense scorecard to distinguish structural inventory screening from the still-pending deep editorial review.
- **122Q:** standardized homepage award and recognition labels to match the Experience page and avoid year/number-based presentation.
- **122R:** removed unsupported numerical claims from the resume checker’s sample text.
- **122S:** aligned visible update dates and Article `dateModified` metadata on six revised technical notes.
- **122T:** documented AI conversation processing and safe-use boundaries on the AI and Privacy pages.
- **122U:** added a privacy warning and Privacy Policy link to the floating AI widget.
- **122V:** moved a compact privacy notice before the dedicated AI page’s prompt form.
- **122W:** fixed a false-positive in resume metric detection and added a behavioral regression test.
- **122Y:** aligned Article `dateModified` metadata with the visible update date on the AI-for-IT-support and money-basics notes, preserving their original publication dates.
- **122AA:** surfaced a Career Match privacy note before the resume/job-description inputs, warning against confidential information and disclosing browser-local storage and third-party PDF/DOCX libraries. The production browser smoke initially exposed a mobile scroll/hit-test issue; the test harness was stabilized and then passed at desktop and mobile viewports.
- **122AB:** corrected a literal escaped character in the privacy notice and refreshed this scorecard to record the privacy work.
- **122AC:** removed a duplicate opening `<section>` tag in the Interactive Tools & AI-Assisted Experiences note after focused source inspection found unnecessary nested section markup.
- **122AE:** added an authoritative MDN Web Docs further-reading reference to the API fundamentals note and aligned its visible update date with Article `dateModified`, preserving its original publication date.

The merged remediation commits through Phase 122AE passed their applicable CI gates. Cloudflare Pages confirmed a successful production deployment for Phase 122AE commit `3bab03216f6b031eb578632dbc4516a0cd77d154`.

Each merged phase passed its applicable repository CI gates and had a successful Cloudflare Pages production deployment associated with the merge commit.

## Important limits and remaining work

1. A structural inventory screen has now covered all 58 sitemap URLs: 30 notes, 13 tool URLs (including the tools hub), 3 blog URLs, and the remaining profile, work, topic, resource, AI, contact and privacy pages. This included title/visible-content counts and focused inspection of several lower-depth pages. It is not yet a full manual editorial review of every page or every interactive tool state.
2. Google may evaluate the whole site, not only pages intended for ads. The remaining notes and tools should be checked for thin, duplicate, outdated or misleading content.
3. The financial education section is broader than the site's primary IT-support focus. Maintain clear disclosures, source current claims, avoid personalized recommendations, and decide whether any pages need further qualification or consolidation.
4. The site has a small blog collection. Continue building original depth without repetitive articles or arbitrary word-count targets.
5. Production deployment success has been confirmed through Cloudflare Pages metadata. Direct page fetching through the available external inspection environment was not reliable, so do not claim a manual live-browser content inspection from that environment.
6. AdSense approval, ads.txt detection, payment setup and site review are separate external/account states. Passing code checks does not change those states.

## Final review gate

Before requesting another AdSense review:
- complete a page-level audit of the remaining published inventory, including notes and interactive surfaces;
- correct high-priority factual, duplication, usability and content-depth issues;
- verify sitemap parity, internal links, metadata, AI knowledge freshness and production deployment;
- recheck current Google policies, privacy disclosures and planned ad placement;
- confirm the owner is satisfied with the published changes and the AdSense dashboard prerequisites.

## Decision

**Do not request another review yet.** The content remediation has made measurable repository changes, but this scorecard is a checkpoint, not a final approval recommendation. Continue with the remaining site-wide content audit and final readiness review.

## Phase 122AG — Career Match storage disclosure alignment (2026-10-12)

The Career Match & Resume Review tool's privacy note now explicitly names the theme preference alongside saved analyses and Application Tracker entries stored in browser local storage. This aligns the tool-specific note with the main Privacy Policy and the tool's actual storage behavior. The change is disclosure-only; no storage behavior or analytics behavior changed.

PR #616 merged as `a2d052efd9acbbecfca018614db3b7e24c6d1921`. Applicable repository checks passed, including the build, AdSense privacy readiness, site integrity, AI production regression matrix, performance baseline, SEO reliability, supply-chain baseline and Cloudflare Pages deployment. Cloudflare Pages production deployment for this merge completed successfully.

## Phase 122AI — Microsoft sign-in note markup and structured data (2026-10-12)

A focused page-level inspection found that `notes/microsoft-sign-in-troubleshooting-guide/index.html` opened the document body without closing the head and lacked the Article and BreadcrumbList JSON-LD present on comparable note pages. The remediation closes the head correctly and adds Article and BreadcrumbList metadata aligned to the existing visible title, description, canonical URL, author and publication date. The article's prose and visible publication date were preserved.

PR #618 merged as `1b0a57beb3a02ce19ebee4e8f7edf46e03f66c30`. The build, production smoke reliability, site integrity, HTML SEO reliability, performance baseline, AdSense privacy readiness, AI regression matrix, supply-chain baseline and Cloudflare Pages checks passed; the corresponding Cloudflare Pages production deployment succeeded.

## Phase 122AL — Career Match textarea accessibility (2026-10-12)

A focused accessibility pass across the interactive tools found that the resume-paste textarea in `tools/career-match-resume-review/index.html` relied on placeholder text without an associated visible label. A visible `label for="resume"` has been added. The Career Match browser runtime and applicable site/SEO/security/performance checks passed on the PR before merge. This is a small accessibility correction; it does not change resume processing or storage behavior.

PR #621 merged as `1f2367bfad074dcd496a4120a593172e09e9410a`. The remaining page-level editorial audit and external AdSense prerequisites remain open.

## Recent verified changes after Phase 122AL (2026-10-12)

These entries record repository changes without treating engineering hardening as evidence of AdSense approval or as a substitute for the outstanding page-level editorial review.

- **122AM:** recorded the Career Match resume-textarea accessibility correction in the scorecard.
- **122AN:** aligned the Android TWA configuration and engineering documentation with the canonical production origin, `https://jawed.co.in/`. No Digital Asset Links fingerprint was guessed or deployed.
- **122AO:** fixed the PWA navigation-failure fallback to await the requested-page, cached-home, and offline-page lookups in sequence; the PWA contract validator was extended to protect this behavior.
- **122AP:** clarified that the original PWA feasibility record is historical and recorded the implemented PWA status and remaining owner-controlled TWA publication prerequisites.
- **122AQ:** extended the TWA configuration validator to ensure the TWA icon URLs reference paths declared in the website's `manifest.json`. The TWA validation and signing-material guard passed, and the change was merged as `2f0f79a0ebf1b1f84c8002bc1fbcc223f144fe04`; Cloudflare Pages production deployment succeeded.

These phases do not change the AdSense decision boundary. The content-readiness scorecard remains preliminary, the complete manual page-level editorial review remains unfinished, and AdSense stays pre-activation until external account/publisher/consent prerequisites and the final inventory review are complete.

## Phase 122AS — Source-level note and tool structure sweep (2026-10-12)

A repository-source sweep covered all 29 published note-page HTML files and all 12 published interactive-tool HTML files on `main`.

- **Notes (29/29):** each inspected file had one `<title>`, one H1, one canonical link, a closing `</head>` before `<body>`, and JSON-LD blocks that parsed as valid JSON. Pages may have one or more valid JSON-LD blocks; uniform schema-block counts were not required.
- **Interactive tools (12/12):** the static check found no `input`, `textarea`, or `select` element lacking either a matching HTML label or an `aria-label`/ `aria-labelledby` attribute.

This was a source-level structural/accessibility-name check only. It did not verify rendered visibility, color contrast, keyboard operation, dynamic controls created at runtime, calculation correctness, factual accuracy, originality, content depth, or Google indexing. Those remain separate review items; this result does not complete the manual editorial review or change the AdSense pre-activation decision.

## Phase 122AT — Finance calculator input validation (2026-10-12)

A focused code review found that the Retirement Planning, Compound Growth & SIP, and Inflation & Goal Planning calculators used `novalidate` forms and converted field values with `Number(...)`. Empty strings can convert to zero, allowing a cleared required field to be interpreted as a valid assumption. The calculation handlers now reject blank fields and explicitly check the HTML input validity constraints before calculating. Legitimate zero values remain accepted where the fields permit them; formulas, defaults, and financial guidance were not changed.

PR #629 merged as `ee7c3c0d298a18a081c9b9aa656ccb478887cd0f`. Applicable regression, SEO, privacy readiness, performance, security supply-chain, site-integrity and Core Web Vitals checks passed. Cloudflare Pages production deployment for the merge commit succeeded.

This correction improves input handling only. Phase 122AV added independent numeric regression vectors and source guards for the three calculator methodologies. Rendered-browser verification of each calculator remains outstanding. The site-wide editorial review and external AdSense prerequisites remain open.


## Phase 122AU — Record calculator validation findings (2026-10-12)

The scorecard now records Phase 122AT's finance-calculator input-validation finding and the remaining test boundaries. This documentation-only phase did not change site behavior. PR #630 merged as `41b16c3c2651176e9ea92134ce64be0202d495ef`; applicable checks passed and the Cloudflare Pages deployment succeeded.

## Phase 122AV — Finance calculator mathematical regression gate (2026-10-12)

Added `scripts/validate-finance-calculator-regression.mjs` with independent numeric test vectors for SIP growth, inflation-adjusted goal planning, and retirement-corpus estimates, including zero-rate and zero-period cases. The new workflow runs on relevant calculator changes and on manual dispatch. It also guards the published formula implementations and explicit input validity checks. PR #631 merged as `f5110368e02e332567fe8a8216005525b49aa4a3`; the regression workflow and applicable repository checks passed, and Cloudflare Pages production deployment succeeded.

This deterministic gate does not emulate a browser or prove that controls render, are usable on real devices, or behave correctly under every interaction. Rendered-browser verification remains outstanding.

## Phase 122AW — SIP calculator reset consistency (2026-10-12)

A focused interaction review found that the Compound Growth & SIP calculator restored its default inputs on Reset but cleared the displayed results, unlike its initial-load behavior and the other finance calculators. Reset now restores the form defaults, clears the validation message, and recalculates the default result. The finance regression gate protects this reset behavior, and the existing site-integrity reset contract was updated to match the intended behavior.

PR #632 merged as `450ae3e765f32beeff3598aae6886217380ec3de`. The finance regression gate, site integrity, AI production regression matrix, SEO, privacy readiness, performance, supply-chain and Core Web Vitals checks passed. Cloudflare Pages production deployment for the merge commit succeeded.

The change does not alter any calculation formula or financial assumption. Full rendered-browser verification and the remaining page-level editorial review remain open; AdSense remains pre-activation pending external prerequisites and final inventory review.


## Phase 122AY — Retirement corpus example arithmetic (2026-10-12)

A page-level review of the financial education notes independently recalculated the example in `notes/retirement-corpus-calculation-framework/index.html`. The finite-horizon real-return annuity formula gives approximately ₹294.01 lakh (₹2.94 crore) for ₹15 lakh of first-year spending, a 30-year horizon and a 3% real return. The published example was corrected from ₹296 lakh / ₹2.96 crore, and the finance-calculator regression gate now checks the example's arithmetic and published text.

PR #634 merged as `b358956e7c173f79baf7001562e461595b879395`. The finance regression gate, site integrity, AI production regression matrix, SEO, privacy readiness, performance, supply-chain and Core Web Vitals checks passed; Cloudflare Pages production deployment succeeded.

This is an arithmetic correction to an illustrative example, not a change to the retirement calculator formula or a personalized recommendation. Rendered-browser verification and the remaining page-level editorial review remain open. AdSense remains pre-activation pending external prerequisites and final inventory review.


## Phase 122BA — Tax-regime comparison table clarity (2026-10-12)

A page-level financial content review found that the AY 2026-27 tax-regime comparison mixed marginal slab rates with wording that could be mistaken for standalone cumulative tax formulas. The table now consistently shows the marginal rate for each income band, and its note explicitly says that these are not total-tax amounts. The published tax year and rate values were preserved, and the finance-content regression gate now guards the table's rate presentation and explanation.

PR #636 merged as `607b8b9114520615bcf855e406b98be350702b17`. The finance-content regression gate, site integrity, AI production regression matrix, SEO, privacy readiness, performance, supply-chain and Core Web Vitals checks passed. Cloudflare Pages production deployment for the merge commit succeeded.

This change clarifies educational content; it does not calculate individual tax liability. The official Income Tax Department guidance and calculator remain the appropriate sources for a taxpayer's actual case. The remaining page-level editorial review and external AdSense prerequisites remain open.


## Phase 122BC — Align financial-note update dates and Article metadata (2026-10-12)

After the retirement-corpus example and tax-regime comparison were substantively corrected, their visible `Updated` dates and Article `dateModified` fields were found to still show 2026-09-28. Both now show 2026-10-12 while preserving the original `datePublished` value. The tax note's source-check date was also refreshed after checking the official Income Tax Department guidance for AY 2026-27.

PR #638 merged as `50a6f3c6ed459c13bf3b3d115a5a8bc8007c0cf1`. The finance-content regression gate, site integrity, AI production regression matrix, SEO, privacy readiness, performance, supply-chain and Core Web Vitals checks passed. Cloudflare Pages production deployment for the merge commit succeeded.

The modified-date alignment is now covered by the finance-content regression gate. This is still a source-level check; it does not claim rendered-browser verification. The wider page-level editorial review and external AdSense prerequisites remain open.


## Phase 122BE — Note date metadata integrity gate (2026-10-12)

A source-level audit checked visible publication/update dates against Article structured data across all 29 published note pages. No mismatches remained after the corrections in Phases 122BC and 122BA. The site-integrity validator now enforces the same contract: notes with separate Published/Updated labels must match `datePublished`/`dateModified`, while older single-date templates must use matching publication/modification metadata and display the date.

PR #640 merged as `9454525fce73dff3f4b802a054f5f0955dc2c75b`. Site integrity, AI production regression matrix, supply-chain checks and Cloudflare Pages preview checks passed; production deployment for the merge commit succeeded.

This is a source-level consistency check, not proof of rendered page visibility or Google indexing. The wider page-level editorial review and external AdSense prerequisites remain open.


## Phase 122BF — Record note date integrity gate (2026-10-12)

The site-integrity validator now checks visible and structured publication/update dates across all 29 published note pages. Explicit Published/Updated labels must match Article `datePublished`/`dateModified`; legacy single-date note templates must show a date matching equal publication/modification metadata.

PR #640 merged as `9454525fce73dff3f4b802a054f5f0955dc2c75b`. The applicable site-integrity, AI regression, supply-chain and Cloudflare Pages checks passed. Cloudflare Pages production deployment for the merge commit `d13bd75300af095c47322693b6858ca0e4b4df8d` succeeded.

The gate checks source consistency, not rendered date visibility or search-engine indexing. The broader editorial review and external AdSense prerequisites remain open.


## Phase 122BH — Regression coverage for published finance examples (2026-10-12)

The finance regression gate now includes independent arithmetic checks for the inflation-goal example (₹10 lakh at 6% for 10 years), emergency-reserve examples (three and six months of ₹35,000 essential costs), and a net-worth example (₹8 lakh of assets minus ₹3 lakh of liabilities). These examples were consistent with their stated assumptions; the tests protect them from future arithmetic drift.

PR #643 merged as `7498f5d2a5e37bb007d3992b645ef3412fe8b5e0`. The finance regression gate and applicable supply-chain and Cloudflare Pages checks passed. Cloudflare Pages production deployment for the merge commit succeeded.

The tests validate arithmetic and selected source wording only. They do not validate the suitability of any financial assumption, provide personal advice, or replace rendered-browser testing. The wider editorial review and external AdSense prerequisites remain open.


## Phase 122BJ — Personal Finance Snapshot blank-input validation (2026-10-12)

A source-level sweep of the 12 interactive tool pages found one additional blank-number issue in Personal Finance Snapshot: `Number("")` evaluates to zero, so clearing a field could pass the existing non-negative check. The snapshot now explicitly rejects blank numeric values while preserving valid zeroes and existing formulas. The regression gate covers the validation predicate, invalid-state output clearing, and independent default math vectors.

PR #645 merged as `6c5ee0a6b8796d90366d1fde03968bd752409072`. The finance regression gate, site integrity, AI production regression matrix, SEO, privacy readiness, performance, supply-chain and Core Web Vitals checks passed. Cloudflare Pages production deployment for the merge commit succeeded.

This source-level sweep is not a substitute for rendered-browser testing across the tool inventory. The broader page-level editorial review and external AdSense prerequisites remain open.
