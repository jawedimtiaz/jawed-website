# Phase 37A — Performance & Monetization Baseline

Status: **baseline established / pre-activation**

## Scope

This phase establishes a repository-level performance baseline before live advertising is enabled. It does not activate AdSense and does not claim a Lighthouse/PageSpeed score.

## Current baseline

- Site architecture is static HTML/CSS/JS with Cloudflare Pages deployment.
- Main stylesheet: `assets/css/style.css` — approximately 10.5 KB source text.
- Main JavaScript: `assets/js/main.js` — approximately 13.3 KB source text.
- Analytics loader: `assets/js/analytics.js` — approximately 0.6 KB source text.
- Page JavaScript is loaded with `defer`.
- Analytics is scheduled after the page load event through `requestIdleCallback` where supported, with a timeout fallback, and then loads Google Tag Manager/gtag asynchronously.
- No AdSense runtime script or visible ad slot is active.
- No `ads.txt` is present.
- The existing CSP remains restrictive and does not contain speculative advertising domains.
- No repository-side image lazy-loading contract or performance-budget contract was previously established; these remain candidates for later bounded work rather than assumptions to change blindly.

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

1. Static-page architecture keeps the core delivery path simple.
2. Main JavaScript uses `defer`.
3. Analytics loading is deferred until after page load and scheduled during idle time.
4. AdSense runtime code is absent, so there is currently no advertising-network performance cost.
5. CSP is not widened in anticipation of unknown ad endpoints.

### Items deliberately not changed in 37A

- No image markup was globally rewritten to add speculative `loading="lazy"`.
- No `preload` hints were added without identifying a critical resource.
- No CSS was split or minified solely from source-size inspection.
- No third-party domains were added to CSP.
- No AdSense code was activated while the external Google approval state is not confirmed as **Ready**.

## Measurement requirement

A real-user or lab performance score must be recorded separately from this repository baseline. Source inspection alone cannot establish Core Web Vitals or PageSpeed/Lighthouse scores.

## Next phase

**37B — Core Web Vitals protection** should address only measurable or reproducible opportunities and establish explicit regression checks before any live advertising activation.
