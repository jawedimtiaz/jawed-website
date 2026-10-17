# AdSense Content Readiness Audit

Status: **pre-activation review**

## Official Google guidance used

Primary review checklist: [What to do when your site is not ready to show ads](https://support.google.com/adsense/answer/12176698).

Google's guidance identifies several readiness dimensions that must be checked separately:

1. **Enough unique, valuable content and a good user experience** — verify that each public content page has a clear purpose, original/useful material, readable structure, and useful navigation. Avoid treating page count, word count, metadata, or automated checks as proof of value.
2. **Reachability and crawl access** — confirm the submitted canonical URL is live, HTTPS works, redirects are correct, and AdSense's crawler is not blocked by access controls or robots.txt.
3. **Policy compliance** — inspect the actual pages and the AdSense Policy Center for issues; resolve violations before review.
4. **Ad code/site verification** — Google notes that missing or incomplete code can prevent readiness checks. Keep this as a distinct account/setup gate. For this project, do not activate ad-serving code or live slots while the account remains unready; complete the content remediation first, then follow Google's current account instructions when a review is authorized.
5. **Review submission** — request review in AdSense only after the content, reachability, policy, and account/setup checks are addressed. Google says reviews often take a few days but may take 2–4 weeks.

This checklist is based on Google's published guidance and is not a claim that Google has approved the site.

## Current site assessment

### Strong initial content candidates
- / — clear site identity, topic discovery, professional context and original site content.
- /about/ — original first-person professional profile and background.
- /work/ and its substantive child pages — original professional experience, skills, certifications and project evidence.
- /notes/ and individual notes — original practical knowledge and task-focused documentation.
- /topics/ — substantive topic hub with navigation into original notes.
- /resources/ — curated reference material with contextual descriptions and links.
- /blog/ — original long-form writing; currently a small collection, so page-level review should continue as content grows.

These are candidate groups, not blanket approval: each page still needs a manual reader-value review.

### Initial ad exclusions
- /ai/ — interactive AI surface; keep excluded from the initial ad rollout.
- /tools/ and tool pages — interactive utilities; keep excluded initially to reduce accidental-click and control-adjacency risk.
- /contact/ — communication-focused page; keep excluded initially.
- /privacy/ — policy/disclosure page; keep excluded initially.

## Remaining evidence checklist

- [ ] Finish the manual editorial review of all sitemap pages; record real page-level defects and bounded fixes.
- [ ] Check each page for original reader value, clear purpose, useful structure, working contextual links, and accurate disclosures—not merely automated SEO or metadata signals.
- [ ] Verify production reachability, canonical/HTTPS redirects, crawler access, and robots rules.
- [ ] Check the AdSense Policy Center and resolve any reported policy issues.
- [ ] Recheck the account's site-verification/ad-code instructions at the time review is authorized; do not infer account status from repository checks.
- [ ] Reconcile the final eligible page inventory and exclusions before requesting review.
- [ ] Submit for review only after the above checks are supported by evidence and the user's explicit activation gate is satisfied.

## Important limitation

This is a site-specific readiness assessment, not a Google approval or policy determination. Google evaluates the actual site and may change its policies. Each page should be rechecked immediately before ads are enabled. Repository checks cannot establish account approval or replace a manual editorial review.

## Activation rule

Ads should initially be restricted to the approved inventory boundary in config/adsense-inventory.json. Any expansion to tools, AI, contact, privacy, or other surfaces requires a fresh policy and placement review. Do not activate live ads or resubmit while the account is not explicitly marked ready.
