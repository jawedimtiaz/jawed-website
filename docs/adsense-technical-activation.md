# AdSense Technical Activation Audit

Status: **pre-activation**

## Current baseline

- `ads.txt` is intentionally absent because there is no real AdSense publisher account/value to publish.
- The site uses a restrictive Content Security Policy.
- The current CSP allows the existing analytics/CDN sources but does not contain a pre-emptive AdSense exception.
- No AdSense publisher script or ad slot is present in the repository.

## Activation checks

Before enabling AdSense, re-audit:

1. **Publisher identity** — use the real publisher ID from the AdSense account.
2. **ads.txt** — add the exact Google-provided publisher record only when the account/integration requires it.
3. **CSP** — add only the domains actually required by the final Google ad implementation and verify that the resulting policy still blocks unrelated third-party execution.
4. **Consent/CMP** — verify that the final ad requests respect the configured consent mode and regional requirements.
5. **Network behavior** — confirm ad requests occur only on approved inventory and do not break existing AI, analytics, tools, or navigation behavior.
6. **Error handling** — verify that blocked/failed ad resources do not create broken layout, deceptive controls, or inaccessible content.

## Do not preconfigure

- Do not add guessed Google ad domains to CSP.
- Do not add an empty or placeholder `ads.txt`.
- Do not add a guessed publisher ID.
- Do not enable ad scripts globally before consent and inventory activation are complete.

This audit records the technical dependency boundary; it is not a Google approval determination.
