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


## 2026-11-17 — Continuity documentation PR opened

### Changes
- Created PROJECT_STATUS.md as the first-read project handoff.
- Created docs/WEBSITE_DEVELOPMENT_PROGRESS_LOG.md as the chronological record.
- Updated both documents on the documentation branch with route taxonomy and redirect findings.
- PR: [#967 — Add current project status and development progress log](https://github.com/jawedimtiaz/jawed-website/pull/967).
- Branch: docs/project-continuity-handoff-2026-11.
- Latest branch commit at time of this entry: 0ca62c7195534dfbd21a8ba63da07169c986a728.

### Validation / deployment
- Reviewed the complete PR diff; two documentation files only.
- Combined commit status and PR-triggered workflow-run lookup for the latest commit returned no status entries/runs at the time checked. Do not claim CI passed.
- Cloudflare Pages had reported a build in progress for an earlier PR head; the latest commit's deployment result is not confirmed.
- PR remains draft/open and unmerged. No production code or configuration changed.

### Next action
- Recheck PR #967 latest checks and Cloudflare preview result.
- Keep PR #967 unmerged until documentation diff and CI/preview status are reviewed.
- Continue route canonical/host verification and security supply-chain investigation on main.


## 2026-11-17 — Cloudflare canonical-host configuration verified

### Scope
- Read-only inspection of the authenticated Cloudflare account, Pages project, custom domains, zone rulesets and the active dynamic redirect ruleset.
- Cloudflare account: Jawed@jawed.co.in's Account.
- Pages project: jawed-website.
- Zone: jawed.co.in.
- No Cloudflare settings or DNS records changed.

### Verified configuration
1. Cloudflare Pages project jawed-website is connected to GitHub repository jawedimtiaz/jawed-website with production branch main.
2. Both custom domains jawed.co.in and www.jawed.co.in are active and verified on the Pages project.
3. The zone has an enabled ruleset in phase http_request_dynamic_redirect.
4. Its enabled rule is named "Redirect www → apex", uses HTTP 301, matches https://www.jawed.co.in/* and rewrites to https://jawed.co.in/1. Query strings are preserved.
5. Therefore, the configured canonical hostname is https://jawed.co.in/ (apex), not www. The previous project instruction documenting www as canonical is stale.
6. This matches the repository's current RouteSeo, sitemap and robots host origin (apex). Do not migrate these to www.
7. The Pages project's canonical production deployment is currently associated with main commit 423d05fae8f73475887e8ab05f042746f3aab451; the documentation branch preview is separate and does not replace production.
8. The preview deployment for PR #967 completed successfully at https://62a8edbc.jawed-website.pages.dev for commit 100ad7d02d6d0e2a6709f9cb243b3e4f6c378c64. This confirms the Pages preview build/deploy, not production deployment or application tests.

### Decision
- Use https://jawed.co.in/ as the single canonical origin for SEO metadata, sitemap and robots.txt.
- Update stale project instructions/documentation that claim www is canonical.
- Do not change Cloudflare redirect configuration; it already implements www → apex.
- Continue investigating path-level duplicate hubs and /services-dispatch separately; the hostname redirect does not resolve those path duplicates.

### Next work
- Recheck PR #967 latest head and preview deployment status.
- Correct stale canonical-host wording in the project handoff documents.
- Prepare bounded changes to PR #965 for hub alias canonicals and service route duplication, preserving distinct detail-page URLs.
- Continue security supply-chain investigation as an independent workstream.


## 2026-11-17 — PR #965 canonical strategy re-evaluation

### Scope
- Re-read PR #965 description and complete eight-file patch.
- Compared its proposed metadata/sitemap changes with main's RouteSeo.tsx, App.tsx and current combined listing/detail route behavior.
- No code changes made to PR #965 or main.

### Findings
1. PR #965 explicitly chooses /field-guides as the canonical hub for the combined listing and changes /guides metadata to point there; /notes already points to /field-guides. /field-guides remains self-canonical.
2. Although /guides is the visible navigation path, /guides, /field-guides and /notes all render the same combined listing. A canonical hub that differs from the menu route is technically valid; the earlier assessment that this direction inherently conflicts with routing was too strong.
3. PR #965 preserves content-specific detail URLs: /field-guides/:slug for FIELD_GUIDES entries and /notes/:slug for quick notes. This avoids collapsing distinct article detail pages.
4. PR #965 changes sitemap generation and tests to include /field-guides and exclude /guides, and changes /services-dispatch metadata/sitemap treatment to canonical /services. This is internally coherent with the shared components.
5. PR #965 does not add permanent path redirects in public/_redirects. The alias URLs continue to be SPA rewrites; canonical metadata is the deduplication mechanism. Permanent redirects should be a separate decision after backlink and UX impact review.
6. PR #965 validation summary reports all listed browser/runtime/security-baseline gates passing except Security Supply Chain. The scanner reports a credential-like literal in firebase-applet-config.json; this remains the principal blocker. Independently recheck current CI before approval.

### Updated assessment
- Do not reject PR #965 solely because /guides canonicalizes to /field-guides. This is a defensible taxonomy choice given the identical hub content and separate detail URL families.
- Continue full diff review, verify the candidate's generated sitemap and runtime canonical tags, and resolve the security scanner finding without weakening controls.
- Keep PR #965 draft/unmerged until all checks and security review are complete.


## 2026-11-17 — Security supply-chain root-cause inspection

### Scope
- Inspected main: scripts/validate-security-supply-chain.mjs, src/lib/firebase.ts, firebase-applet-config.json, config/security-supply-chain-contract.json and package.json.
- Inspected PR #965 GitHub check runs for head b706f422058de79c28f7dbb1620cd0e9bd1342f7.
- Did not expose or reproduce any API-key value in this log.

### Verified findings
1. firebase-applet-config.json contains a 39-character value matching the Firebase Web API key format (AIza prefix).
2. src/lib/firebase.ts contains a second hardcoded fallback for apiKey, and programmatic comparison confirms it is identical to the JSON apiKey. The value is intentionally redacted from all notes.
3. The scanner's source extension allowlist includes .js, .mjs, .json, .yml, .yaml, .html, .css, .txt, .toml, .conf, .config and .example, but omits .ts and .tsx.
4. As a result, the scanner currently detects the JSON occurrence but does not scan the duplicate fallback in src/lib/firebase.ts.
5. The scanner also blocks common private-key/token patterns and has workflow controls for untrusted shell interpolation, trigger elevation, action SHA pinning, explicit contents-read permissions and workflow secret access. These controls are part of active Phase 38C and must not be weakened.
6. config/security-supply-chain-contract.json declares credential-like literals blocked; it does not currently define a public Firebase client-config exception.
7. PR #965 check-runs at the reviewed head: Site Integrity, Interactive Tools/Content Discovery Browser Runtime, Career Match Browser Runtime, Finance Calculator Regression, AI Production Regression, Deployment Runtime Reliability, Production Cache Reliability, Production Static Asset Reliability, Security Baseline, AdSense Privacy Readiness and Cloudflare Pages completed successfully. Secrets and Supply-chain Baseline failed. This is a point-in-time run; recheck before approval.

### Safe remediation candidate (not implemented)
- Owner must first verify Google Cloud API restrictions and authorized HTTP referrers for the Firebase key. This account-side verification remains outstanding.
- Remove the redundant hardcoded apiKey fallback from src/lib/firebase.ts if the JSON config and Vite env resolution are confirmed to cover every supported runtime.
- Extend scanner coverage to .ts and .tsx and add tests proving secret patterns are detected in those extensions.
- If retaining the Firebase client key in JSON, add only a narrowly scoped schema-aware allowlist for the exact firebase-applet-config.json apiKey field, gated on the owner-side restriction review. Continue scanning all other fields and all TypeScript/TSX files. Do not allowlist a whole file or broad key-pattern.
- Add tests for accepted expected Firebase config, malformed config rejection, and unrelated secrets in JSON/TS/TSX still failing.
- Keep the Phase 38C contract active; review full diff and run all CI before merge.

### Outstanding owner action
- Verify the Firebase Web API key's API restrictions and HTTP referrer restrictions in Google Cloud Console for the intended Firebase project. No key value needs to be shared in chat.

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
