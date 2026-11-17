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

## 2026-11-17 — Navigation, content taxonomy and duplicate-route review

### Scope
- Inspected src/components/Header.tsx, src/pages/NotesListPage.tsx, src/pages/NoteDetailPage.tsx, src/pages/FieldGuideDetailPage.tsx, src/pages/ServicesDispatchPage.tsx, src/App.tsx and relevant RouteSeo.tsx sections on main.
- Read route and component behavior; no application changes made.

### Additional verified observations
1. Header navigation points to /guides and /services as the primary navigation destinations.
2. /guides, /field-guides and /notes all mount NotesListPage. The listing is a combined hub with two distinct data sets: FIELD_GUIDES (featured in-depth guides) and notesData (quick notes).
3. Guide cards link to /field-guides/:slug; quick-note cards link to /notes/:slug.
4. Detail routing is content-aware. NoteDetailPage detects FIELD_GUIDES slugs and delegates to FieldGuideDetailPage; otherwise it loads a notesData record. Field-guide details canonicalize to /field-guides/:slug; quick notes canonicalize to /notes/:slug. RouteSeo resolves /guides/:slug by content type, preserving these detail destinations.
5. The three hub routes render the same combined listing, but metadata currently gives /guides its own canonical, /field-guides its own canonical, and /notes a canonical of /field-guides/. This is inconsistent with /guides being the primary navigation hub. A coherent candidate is to canonicalize both alias hubs to /guides while retaining content-specific detail canonicals.
6. /services and /services-dispatch both mount the exact same ServicesDispatchPage component. Header navigation points to /services, but RouteSeo currently gives /services and /services-dispatch separate self-canonicals. A coherent candidate is /services as canonical, with /services-dispatch redirected only after checking redirect configuration and inbound-link implications.

### Working recommendation (not yet implemented)
- Keep /guides as canonical hub; /field-guides and /notes as duplicate hub aliases.
- Keep /field-guides/:slug canonical for FIELD_GUIDES detail records and /notes/:slug canonical for notesData detail records.
- Keep /services as canonical for the shared service page; consolidate /services-dispatch after redirect review.
- Do not change the hostname until apex/www redirect behavior is verified.
- These are source-backed recommendations, not approved production changes.

### Next work
- Inspect current public/_redirects and all redirect/host configuration files on main.
- Verify apex/www redirects using live HTTP status and Location headers and inspect Cloudflare Pages configuration where accessible.
- Prepare the exact bounded PR #965 correction plan; keep PR #965 unmerged until reviewed and all checks pass.
- Review canonical metadata and sitemap test coverage for hub aliases versus detail-page canonicals.

## 2026-11-17 — Redirect configuration review

### Scope
- Inspected public/_redirects, public/_headers, vite.config.ts and checked likely root-level deployment config candidates (wrangler.toml, netlify.toml, cloudflare-pages.toml).
- Attempted to open the apex and www route URLs for /guides and /services-dispatch through the available web viewer; those endpoints were inaccessible to that viewer, so no live HTTP status or Location header was established.

### Verified observations
1. public/_redirects contains HTTP 200 SPA rewrite rules for /guides, /guides/*, /field-guides, /field-guides/*, /services, /services/*, /services-dispatch and /services-dispatch/*.
2. Therefore, these repository rules do not perform permanent canonical redirects for the alias paths; they serve the SPA shell and leave route/canonical handling to the application.
3. public/_headers includes a Content-Security-Policy but does not establish apex/www host redirects.
4. No wrangler.toml, netlify.toml or cloudflare-pages.toml was present at the repository root. This does not rule out Cloudflare dashboard-level redirect rules.
5. Live requests to the apex/www route URLs could not be verified through the available web viewer. Do not infer their redirect status from source files.

### Next work
- Verify Cloudflare Pages custom domains and redirect/bulk redirect rules in the Cloudflare account, or obtain actual HTTP response headers from a reliable live request.
- Then finalize hostname policy and route alias redirect plan.
- Update PROJECT_STATUS.md with verified Cloudflare rule evidence when available.

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
