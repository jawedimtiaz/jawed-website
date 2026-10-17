# Phase 122GVU — Production rendered-content smoke evidence

**Date:** 2026-10-14  
**Repository:** `jawedimtiaz/jawed-website`  
**Scope:** Bounded production HTML/content smoke check after Phase 122GVT  
**Decision:** The sampled production pages returned HTML successfully and the contact fallback is present in the deployed markup. This is not a full interactive browser, accessibility, crawlability or AdSense approval test.

## Evidence checked

Used Cloudflare Browser Rendering's content endpoint against the live production hostname. The endpoint returned HTTP 200 for:

- `https://jawed.co.in/contact/`
- `https://jawed.co.in/tools/`
- `https://jawed.co.in/resources/`

The endpoint subsequently rate-limited another page request, so this was intentionally kept as a bounded sample rather than described as a complete site crawl.

### Contact page — Phase 122GVT deployment spot-check

The production HTML contains:

- The existing `mailto:webmaster@jawed.co.in` action and contact form.
- The new `Copy email address` button with the expected email in its data attribute.
- A polite live status region (`role="status"`, `aria-live="polite"`).
- The deferred `/assets/js/contact-copy-email.js` script.
- A clear fallback explanation stating that the site does not send or store the message.

This verifies that the relevant markup and script reference are served in production. It **does not** prove the Clipboard API, legacy fallback, keyboard behavior or assistive-technology announcements work in a real user browser; those behaviors are covered by the merged deterministic regression contract, with manual device verification still outstanding.

### Tools hub — content and discovery spot-check

The production HTML includes a page title and description aligned with practical IT, career, finance and productivity tools; a labeled search field and Clear control with a live status region; direct links to individual tools; a three-step career workflow (match, strengthen, prepare); and a caution to keep resume claims truthful. The sampled output showed no obvious placeholder-only hub content.

This is a content/markup observation, not evidence that search filtering or every destination works after JavaScript runs. Existing browser-runtime workflows remain the right place to verify interactive behavior.

### Resources hub — content and reference-first workflow

The production HTML includes six clearly labeled official reference destinations (Apple, Jamf, Microsoft, Cloudflare, GitHub and MDN), plus a practical reference-first workflow covering task scope, environment/version, primary sources, evidence-based diagnosis, permission boundaries and verification/documentation. Links opened in a new tab include `rel="noopener noreferrer"`.

The page also serves a `google-adsense-account` metadata tag. Its presence is only a site/configuration observation; it does not establish crawler access, account readiness, policy compliance or approval.

## Findings

1. **No new confirmed content defect** was established by this small rendered-HTML sample. Do not rewrite or pad these pages solely to increase word count.
2. Phase 122GVT's contact fallback markup is present on production.
3. Production HTML retrieval is working for the three sampled routes at the time of this check.
4. Browser interaction, complete internal/external link health, keyboard/screen-reader behavior, mobile layout and the rest of the published inventory remain outside this check's evidence.

## Next work

1. Continue the visitor-value audit on individual notes/articles and prioritize only specific reader-facing defects (missing steps, unsupported claims, repeated copy, incomplete examples or unsafe ambiguity).
2. Retrieve actual successful browser-runtime run results tied to the candidate commit; do not treat a workflow file or static HTML snapshot as a pass.
3. Complete keyboard-only, screen-reader, zoom/reflow and dynamic result/error checks on representative pages and tools.
4. Complete a bounded, systematic critical-link review and post-deployment smoke checks after any further changes.
5. Keep the account-owner AdSense/Policy Center check separate from repository checks.

**AdSense decision: no-go for resubmission and no live activation.** This phase supplies limited production HTML evidence only; it does not close the remaining account, crawler, browser-interaction or manual-accessibility blockers.
