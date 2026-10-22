# Route-specific SEO metadata delivery review

**Status:** Source audit complete; live raw-HTML behavior not yet independently verified.  
**Scope:** Technical SEO metadata only. No runtime, routing, hosting, or monetization changes in this review.

## Confirmed source facts

- The application is a React 18 + React Router 6 single-page application built with Vite.
- The current production build script is `tsc && vite build`; the checked `vite.config.ts` configures the React plugin and does not configure SSR or prerendering.
- `index.html` ships homepage title, description, canonical URL, Open Graph and Twitter metadata, plus homepage-oriented JSON-LD.
- `src/components/RouteSeo.tsx` resolves route-specific metadata for static pages, tools, notes/field guides, and blog posts.
- `src/components/SeoHead.tsx` writes the resolved title, description, robots, social metadata and canonical link inside React `useEffect`.
- `public/_redirects` includes SPA fallbacks for known React Router routes. That enables the application to load for direct navigation but does not itself produce route-specific HTML metadata.

## Risk statement

For a deep route, the initial HTML template contains homepage metadata. Route-specific values are set only after client-side JavaScript runs. Therefore, a consumer that reads the initial HTML without executing the app may see homepage metadata instead of the route's title/description/canonical/social preview. This is a source-level risk, not proof of a live crawler failure or a statement about Google's current rendering behavior.

## Important route-resolution detail

The route metadata resolver explicitly handles `/notes/:slug`, `/guides/:slug`, `/field-guides/:slug`, and `/blog/:slug`. Before choosing a prerendering strategy, route samples should cover:
- Home page: `/`
- Static page: `/about/`
- Tool page: `/tools/career-match-resume-review`
- Note page: a real slug under `/notes/`
- Field guide page: a real slug under `/field-guides/`
- Blog post: a real slug under `/blog/`
- Unknown path: a non-existent route

## Safest next steps

1. Capture the raw response HTML for those representative production URLs using an independent browser/network client or crawler that is not subject to this assistant's outbound-request restrictions.
2. Record the HTTP status, final URL/redirect chain, initial title, description, canonical, Open Graph title/URL and robots directives before JavaScript executes.
3. Compare those values with the metadata expected from `RouteSeo.tsx`; separately test the rendered DOM after JavaScript runs.
4. If the initial HTML is confirmed to have homepage metadata on deep routes, prepare a bounded proof of concept on a non-production branch for route-aware prerendering/static HTML. Keep the existing SPA fallback, canonical origin, dynamic tools, and unknown-route noindex behavior intact.
5. Require CI build + direct-route smoke tests + a metadata contract covering the route sample before any production merge. Do not migrate the framework or alter Cloudflare routing in the absence of a measured need.

## Out of scope

- No framework migration or full-site SSR rollout.
- No changes to production DNS, Cloudflare configuration, redirects, canonical origin, ads, AdSense scripts, ads.txt, or CSP.
- No claim that live HTTP responses or crawler previews were verified in this source-only audit.

## Acceptance criteria for a future implementation

- Representative route HTML has route-appropriate metadata before client-side JavaScript executes.
- Canonicals remain on `https://jawed.co.in` and preserve each route's existing canonical-path rules.
- Unknown paths remain `noindex, follow` and do not become indexable through prerendering.
- Direct navigation and client-side navigation produce consistent titles and metadata.
- Existing build, security, privacy, interactive-tool, and deployment checks remain green.
