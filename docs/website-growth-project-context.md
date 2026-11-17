# Website Growth Project — Working Context and Handoff

**Owner:** Jawed Imtiaz  
**Primary website:** https://jawed.co.in/  
**Production repository:** https://github.com/jawedimtiaz/jawed-website  
**GAIS lab repository:** https://github.com/jawedimtiaz/jawed-website-ai-studio-lab  
**Roadmap issue:** https://github.com/jawedimtiaz/jawed-website/issues/881  
**Last context review:** 2026-10-20

## Purpose

Improve the existing website in a phased, evidence-led way, focusing on reader value, organic search, professional credibility, accessibility, performance, analytics, and AdSense readiness. The owner is not expected to know coding or manage technical implementation. Explain important decisions in plain language and handle repository analysis and implementation wherever connected tools and permissions allow.

## Working agreement

- Treat the existing repositories, contracts, documentation, validators, and history as the source of project context; inspect before proposing duplicate work.
- Work in small, reviewable phases and record findings, evidence, and next steps in GitHub.
- Protect the live site. Prefer a branch and pull request for code/documentation changes; do not push speculative changes directly to production's default branch.
- Never claim a check passed unless the actual run/result is available. Distinguish repository source review, CI evidence, live browser checks, and account-owner checks.
- Do not claim Google approval, search ranking improvements, traffic, or revenue is guaranteed.
- Do not request or commit passwords, API keys, publisher secrets, or account verification secrets.
- If access to a private account or a manual owner action is required, explain the exact step in plain language and request only the minimum evidence needed.

## Repository map

- jawedimtiaz/jawed-website is the production repository and should be treated as the source of truth for live-site changes unless deployment evidence establishes otherwise.
- jawedimtiaz/jawed-website-ai-studio-lab is the lab/experimentation repository. Compare relevant work before proposing a port; do not assume the lab is automatically production-ready.
- Production is a React 18 + TypeScript + Vite application with React Router, plus existing Cloudflare Pages configuration, site content, tools, AI widget, security policies, and many validation scripts.
- Existing docs/configuration already cover SEO, content readiness, AI quality and privacy, deployment, security, accessibility, performance, and monetization. Reuse these contracts.

## Current important findings (reviewed 2026-10-20)

1. Existing documentation says AdSense must remain pre-activation until external Google status and all required checks are satisfied.
2. docs/adsense-final-readiness.md records a historical AdSense status of “Needs attention — Low value content” on 2026-10-12. This is not a verified current account status; the owner must check the live AdSense account.
3. The initial ad inventory excludes /ai/, /tools/ and tool pages, /contact/, and /privacy/. Do not widen the eligible inventory without a fresh review.
4. Do not activate live AdSense scripts, visible slots, ads.txt, or publisher-specific CSP changes until Google explicitly marks the site Ready, content/live/policy/consent checks are evidenced, and the owner explicitly authorizes activation.
5. The latest production Security Supply Chain Gate observed during this review failed on commit d66ea9fc5326a92d362dd135e735eab6e71f0678 (2026-10-20). The validator flagged .env.example as a secret-like tracked file and package.json as an unexpected dependency manifest/lockfile. This is a validator finding, not proof that a real secret leaked. Investigate the validator's expected manifest policy and .env.example handling before changing rules or files.
6. Latest Actions run observed: https://github.com/jawedimtiaz/jawed-website/actions/runs/39469253059
7. Existing performance budgets specify targets of LCP 2.5 seconds, INP 200 ms, and CLS 0.1, but these are targets, not measured results. Capture dated baseline measurements before claiming performance status.
8. The repository already has numerous validators and prior phase reports. A script existing in the repo is not evidence it passed, and automated checks do not replace manual editorial, accessibility, live deployment, or account review.

## Phased roadmap

Track detailed tasks and checkboxes in GitHub issue #881. Summary:

### Phase 0 — Baseline and safe process
- Confirm source of truth, deployment target/release path, current commit, and recent CI.
- Investigate the failing Security Supply Chain Gate.
- Run relevant build/lint/integrity/SEO/security/performance/AdSense validators and record actual outcomes.
- Capture production reachability, redirects, sitemap/robots, representative page behavior, and dated performance baseline where possible.
- Do not change production during the audit.

### Phase 1 — Editorial and AdSense content readiness
- Review each sitemap URL for distinct purpose, original reader value, accuracy, completeness, currency, structure, useful contextual links, and sourcing.
- Prioritize practical IT notes, blog, topic/resource hubs, About, and professional experience.
- Fix specific demonstrated weaknesses; do not add filler or chase word counts.
- Preserve the current initial ad exclusions and document page-level evidence.

### Phase 2 — Messaging, navigation, and UX
- Improve the homepage's clear explanation of practical IT support/workplace technology while preserving the professional portfolio.
- Improve discovery, introductions, scanability, related-resource labels, and useful next steps.
- Test desktop/mobile, keyboard, focus, contrast, touch targets, and zoom/reflow.
- Preserve existing tools and AI behavior while testing their journeys.

### Phase 3 — Technical SEO and site integrity
- Verify rendered titles, descriptions, canonical URLs, headings, social metadata, and structured data.
- Check sitemap, robots, legacy redirects, 404 behavior, internal links/fragments, and critical external links.
- Verify HTTPS/canonical redirects, crawler access, CSP/security headers, cache, and assets.
- Avoid duplicate URLs and broken legacy inbound links.

### Phase 4 — Performance and accessibility
- Measure before changing code.
- Fix only measurable/reproducible issues and retain existing performance budgets/regression gates.
- Test interactive tools, AI widget states, errors, keyboard and mobile behavior.
- Record dated before/after evidence.

### Phase 5 — Analytics and growth measurement
- Verify Search Console and sitemap processing, and GA4 setup/privacy disclosure without duplicate tags.
- Establish actual baselines for search impressions/clicks, organic engagement, and useful page outcomes.
- Use data to prioritize content and UX improvements. Never fabricate analytics.

### Phase 6 — Content improvement
- Refresh useful existing pages first.
- Develop focused, genuinely distinct IT-support content clusters only when supported by original knowledge/testing.
- Prefer practical steps, prerequisites, expected results, failure paths, safety boundaries, authoritative references, and clear author/update details.
- Avoid near-duplicate mass-generated content.

### Phase 7 — AdSense external readiness
- Owner checks live AdSense Sites status and Policy Center.
- Recheck site verification/ad-code instructions, crawler access, applicable consent/privacy requirements, ads.txt, and final inventory.
- Request review only when evidence supports readiness and owner explicitly approves.
- Activate only after Google explicitly authorizes it; then run a production smoke test.

### Phase 8 — 30-day review
- Compare actual search, engagement, performance, and (if activated) revenue metrics with baseline.
- Prioritize evidence-backed work and maintain a monthly review cadence.

## Next action

Start with Phase 0: inspect the security validator and its workflow, understand why the current production check fails, run the relevant existing checks on a known commit where possible, and record a baseline report. Do not weaken security rules merely to make CI green; fix the mismatch with evidence.

## Continuity note for future ChatGPT sessions

This document and GitHub issue #881 are the durable project handoff. At the start of future work, read this file and issue #881, inspect the current repository state and latest CI, update the status based on evidence, and continue from the next incomplete phase. Do not assume this context is automatically available in a new chat.
