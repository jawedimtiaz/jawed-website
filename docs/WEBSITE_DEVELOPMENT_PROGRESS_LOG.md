# Website Development Progress Log

This is the chronological engineering record for the personal website jawed.co.in only. The current summary and next action are in [PROJECT_STATUS.md](../PROJECT_STATUS.md).

## 2026-11-17 — SEO route taxonomy and continuity review

### Scope
- Rechecked production repository jawedimtiaz/jawed-website and open PR context.
- Reviewed route declarations in src/App.tsx, route metadata in src/components/RouteSeo.tsx, sitemap generation in src/utils/sitemapGenerator.ts, sitemap regression tests in tests/sitemapGenerator.test.ts, and route/listing content implementation.
- No application code, production configuration, DNS, credentials, or deployment settings changed.

### Verified observations
1. src/App.tsx declares /guides as the primary listing route; /field-guides and /notes are described as backward-compatible aliases to the same listing page.
2. Sitemap tests on main explicitly require /guides in the sitemap and assert canonical URLs start with https://jawed.co.in/.
3. Sitemap generation separately includes /notes/:slug and /field-guides/:slug detail URLs.
4. RouteSeo.tsx has a suspicious /notes hub canonical mapping to /field-guides/; this requires a content and route review before changing.
5. Current repository code, robots.txt, sitemap and tests use the apex host, while project instructions document https://www.jawed.co.in/ as the canonical hostname. Live redirect behavior was not confirmed during this review.
6. PR #965 proposes canonicalizing /guides to /field-guides and removing /guides from the sitemap. That proposal conflicts with current router declarations and sitemap tests; PR #965 should not be merged as-is.
7. PR #966 is stacked on #965 and should not be merged until the dependency is resolved, it is retargeted to main, and all checks are rerun.
8. Security Supply Chain is reported failing in #965/#966 because of a credential-like literal in firebase-applet-config.json. Do not suppress broadly or weaken controls. Owner-side API-key restriction verification remains outstanding.

### Decisions
- Keep /guides as the presumed primary hub for the next review, based on current router declarations and tests. This is a working decision, not a completed canonical migration.
- Do not implement permanent redirects until destination content equivalence and inbound-link implications are checked.
- Do not change canonical host strings until live redirect behavior and Cloudflare configuration are verified.
- Keep PR #965 and #966 unmerged pending corrections and security review.

### Next work
- Inspect nav links, listing/detail components and actual content taxonomy for /guides, /field-guides and /notes.
- Inspect /services and /services-dispatch content before considering alias consolidation.
- Verify production apex/www redirects and Cloudflare Pages configuration.
- Continue security scanner/key restriction investigation as a separate bounded workstream.

### Evidence / references
- Main baseline reviewed: [423d05fae8f73475887e8ab05f042746f3aab451](https://github.com/jawedimtiaz/jawed-website/commit/423d05fae8f73475887e8ab05f042746f3aab451).
- [PR #965](https://github.com/jawedimtiaz/jawed-website/pull/965)
- [PR #966](https://github.com/jawedimtiaz/jawed-website/pull/966)
- [PR #962](https://github.com/jawedimtiaz/jawed-website/pull/962)
- [PR #963](https://github.com/jawedimtiaz/jawed-website/pull/963)
- [PR #882 — earlier handoff document](https://github.com/jawedimtiaz/jawed-website/pull/882)

## Progress-recording standard
For every subsequent entry, record:
- Date and phase/workstream
- Scope and exact files/URLs/PRs inspected
- Findings with evidence
- Decisions and rationale
- Changes made (or explicitly state none)
- Tests/CI with exact outcomes and links
- Outstanding owner actions/approvals
- Exact next action

Never label work complete without test or verification evidence. Distinguish source review, CI, preview deployment, production verification and owner-side account checks.
