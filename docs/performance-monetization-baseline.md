# Phase 37A — Performance & Monetization Baseline

Status: **baseline established / pre-activation**

## Scope

This phase establishes a repository-level performance baseline before live advertising is enabled. It does not activate AdSense and does not claim a Lighthouse/PageSpeed score.

## Current baseline

- The production site uses a React/Vite application entry point (`index.html` loads `/src/main.tsx`); this is not the legacy static HTML architecture described in earlier baseline notes.
- A legacy analytics loader remains at `assets/js/analytics.js`. Its implementation schedules GA4 loading after the page load event through `requestIdleCallback` where supported, with a timeout fallback.
- The current React entry point does not directly include the legacy analytics loader. Do not claim that analytics is active or delivered on the SPA solely because the legacy loader file exists. Any future integration must explicitly preserve the site’s consent expectations and be validated separately.
- No AdSense runtime script or visible ad slot is active.
- No `ads.txt` is present.
- Core Web Vitals values in `config/performance-budget.json` are targets, not measured results.
- The CSP should remain limited to origins required by actual page resources; do not add speculative advertising domains.

## Monetization performance boundary

Before Google AdSense reports **Ready**, performance work is limited to infrastructure and regression protection. Live ad scripts, ad slots, `ads.txt`, and publisher-specific CSP changes remain blocked by the Phase 36 activation gate.

After activation, the performance review must measure the actual effect of advertising on:
- Largest Contentful Paint (LCP)
- Interaction to Next Paint (INP)
- Cumulative Layout Shift (CLS)
- total blocking time / main-thread work
- network requests and transferred bytes
- mobile rendering and layout stability

## Current observations

### Positive controls

1. The React/Vite entry point is explicit in `index.html`.
2. The legacy analytics loader defers third-party script insertion until after page load and idle time where supported.
3. The current SPA entry point does not reference that loader, so this baseline does not assert that GA4 is actively running.
4. AdSense runtime code is absent, so there is currently no advertising-network performance cost.
5. No real-world Core Web Vitals result is claimed without dated measurement evidence.

### Items deliberately not changed in 37A

- No image markup was globally rewritten to add speculative `loading="lazy"`.
- No `preload` hints were added without identifying a critical resource.
- No CSS was split or minified solely from source-size inspection.
- No speculative advertising domains were added to CSP.
- No AdSense code was activated while the external Google approval state is not confirmed as **Ready**.

## Measurement requirement

A real-user or lab performance score must be recorded separately from this repository baseline. Source inspection alone cannot establish Core Web Vitals or PageSpeed/Lighthouse scores.

## Next phase

**37B — Core Web Vitals protection** should address only measurable or reproducible opportunities and establish explicit regression checks before any live advertising activation.
