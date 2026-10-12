# Phase 122B — Practical IT Content Remediation

Status: **Two existing notes improved; PR and production verification pending**

## Scope

This phase makes bounded changes to two existing IT-support notes already in the published sitemap. It does not add pages or change the sitemap, website architecture, ad inventory, ad tags, or monetization activation.

## Page 1: macOS First-Response Troubleshooting Checklist

Route: `/notes/apple-macos-first-response-checklist/`

### Observed gap

The prior note gave a safe first-response sequence but was mostly a general checklist. It did not give enough symptom-to-next-check guidance for a reader to distinguish common app, network, sign-in, performance/storage, and recent-change patterns.

### Change made

- Added symptom-specific triage branches.
- Added a clearly labeled illustrative application-launch example.
- Added stop/escalation boundaries for privileged, security-sensitive, out-of-scope, and data-loss-risk actions.
- Reinforced evidence capture, least-disruptive troubleshooting, and validation of the original task.
- Explicitly prohibited sharing credentials, verification codes, recovery keys, session tokens, or confidential details.

### Review considerations

The new content is generic first-response guidance, not a claim to diagnose every macOS issue. Organization-specific procedures and management permissions take precedence. The illustrative example is labeled and does not claim to describe a real incident.

## Page 2: Writing Better Service Desk Ticket Notes

Route: `/notes/service-desk-ticket-documentation/`

### Observed gap

The prior note explained the components of a good ticket but did not demonstrate the difference between activity-only notes and evidence-based notes.

### Change made

- Added an explicitly illustrative weak-versus-useful ticket-note comparison.
- Added a short ticket-quality checklist covering symptom, evidence, fact versus hypothesis, changes, validation, ownership/next action, and sensitive-data handling.
- Warned readers to record only checks actually performed and not to invent root causes or publish confidential details.

### Review considerations

The example is a writing pattern, not a universal technical diagnosis or a claim about an actual incident. Readers must adapt it to their approved workflows and only record observed facts.

## Verification required

Before merge:
- Inspect the complete diff for both pages.
- Confirm the HTML structure remains valid and content is inserted in the intended sections.
- Run repository CI and the deployment preview.
- Verify the two public routes, mobile rendering, internal links, and existing metadata/schema remain intact.

After merge:
- Confirm the merged commit on `main`.
- Verify both routes in production.
- Check the sitemap and page-integrity gates.
- Keep AdSense review deferred until the full initial inventory audit and broader readiness gate are complete.

## Decision

These are substantive improvements to two existing pages, not proof of AdSense eligibility. Continue the page-level audit and prioritize only evidence-backed improvements; do not inflate pages with filler or publish confidential work examples.
