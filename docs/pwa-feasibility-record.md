# PWA Feasibility Record

## Decision

**Feasible: proceed with a bounded PWA implementation.**

The current Jawed.co.in site can support an installable Progressive Web App without changing its canonical URL model, sitemap, content architecture, AI endpoint, Career Toolkit, analytics, or Cloudflare Pages deployment model.

## Evidence reviewed

As of 2026-10-08:

- Production hosting is Cloudflare Pages with the GitHub production branch set to `main`.
- The active production deployment is built from merge commit `9ff083be45096c38ffa637dc6da12e4b7aba107d`.
- The site is already HTTPS and uses the existing production security-header/CSP contract.
- The repository currently has **no web app manifest** (`manifest.json` or equivalent).
- The repository currently has **no service worker registration** and no service-worker source file.
- Pages currently expose a standard viewport declaration and a single SVG favicon, but no PWA theme-color metadata or required installable icon set.
- The existing site uses canonical absolute URLs, a maintained sitemap, deferred analytics, and a server-side `/api/ai` endpoint.
- The site has an existing mobile navigation system and responsive layouts.
- The site-wide Jawed AI widget is already constrained to the mobile viewport and uses an explicit open/close state.
- Existing security policy permits `worker-src 'self' blob:`; any PWA worker must remain within the established security contract.

## PWA implementation boundary

The implementation should remain deliberately small:

1. Add a standards-compliant root manifest with:
   - `name` / `short_name`
   - `start_url` at the canonical site root
   - `scope` at the canonical root
   - `display: standalone`
   - `theme_color` and `background_color`
   - appropriate `description`
   - 192px and 512px icons
   - a maskable icon variant
2. Link the manifest from published HTML through the shared page contract.
3. Add only the service-worker behavior required for installable/offline resilience:
   - versioned static-shell caching;
   - network-first navigation fallback;
   - cache-first immutable/static assets where safe;
   - explicit bypass for `/api/`, analytics, and other dynamic responses;
   - no caching of private/user-entered AI content;
   - deterministic cache cleanup during activation.
4. Add a lightweight update strategy so old application shells do not remain indefinitely.
5. Add governance validators covering manifest, scope/start URL, icons, worker registration, cache boundaries, and required exclusions.

## Non-goals

- No native Android application.
- No Play Store/TWA packaging yet.
- No offline storage of user-entered resume, job-description, finance, or AI conversation data.
- No change to canonical URLs or sitemap URLs.
- No change to AdSense activation gating.
- No replacement of Cloudflare Pages with another hosting model.
- No redesign of the existing mobile UI.
- No broad runtime caching of dynamic HTML or API responses.

## Main risks and controls

| Risk | Control |
|---|---|
| Stale HTML after deployment | Network-first navigation plus versioned cache cleanup |
| AI responses becoming stale/private data being cached | Explicit `/api/` and dynamic-request bypass |
| Analytics being intercepted | Explicit analytics bypass |
| SEO/canonical changes | Manifest scope/start URL only; no route changes |
| CSP/security regression | Keep worker registration within current `worker-src` contract and add deterministic validation |
| Large cache footprint | Cache only an allowlisted static shell/assets |
| Broken offline behavior | Provide a bounded offline fallback rather than pretending all site features work offline |
| Mobile AI/widget regression | Preserve existing viewport and widget behavior; test on real Android devices in the next bounded phase |

## Conclusion

The value proposition is sufficient for this site: an installable, fast-access professional portfolio/tools experience on Android, while retaining one web codebase and the current SEO-first architecture.

Proceed next to **Phase 116 — PWA Implementation**, subject to the normal PR → CI → merge → production verification workflow.
