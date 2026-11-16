# Route-aware static SEO metadata proof of concept

**Branch:** `fix/route-aware-static-seo-metadata`  
**Base:** `main`  
**Status:** Preview validation required; not approved for production merge.

## Confirmed production defect

Cloudflare Browser Rendering was used against the production URL
`https://jawed.co.in/tools/career-match-resume-review` with JavaScript disabled.
The response returned HTTP 200 but contained the homepage title and canonical URL,
no H1, and only an empty React mount point. This matches the existing source
architecture: `RouteSeo` updates document metadata through `useEffect`, after
the initial HTML response.

The production sitemap endpoint separately returned HTTP 200 with
`Content-Type: application/xml`. Cloudflare's 10 November build log reported
83 generated canonical URLs.

## POC implementation

- Reuses the existing `resolveMetadata` and `canonicalUrl` route resolver.
- Reads the generated sitemap from `dist/sitemap.xml` after the Vite build and also snapshots every explicitly declared `STATIC_METADATA` and `TOOL_METADATA` route, including noindex destinations such as `/ai` and `/offline`.
- Emits route-specific title, description, robots, canonical, Open Graph and
  Twitter metadata into static HTML snapshots for each sitemap URL.
- Uses extensionless `.html` snapshots for slashless canonical routes and
  directory `index.html` snapshots for trailing-slash routes.
- Keeps explicit noindex destinations and the custom unknown-route `404.html` response `noindex, follow`.
- Ensures canonical sitemap routes and explicit metadata routes are not intercepted by SPA rewrite rules; only dynamic, non-canonical aliases retain rewrites.
- Adds unit coverage and a Site Integrity Gate check for build integration.

## Verified Cloudflare preview evidence

- Preview deployment `9a8d6892` returned HTTP 200 for
  `/tools/career-match-resume-review` with JavaScript disabled. The initial HTML
  contained the Career Match title, route description, canonical URL and
  `index, follow` robots metadata rather than the homepage metadata.
- Preview deployment `6b364996` returned HTTP 200 for `/ai` with JavaScript
  disabled. The initial HTML contained the AI Assistant title, canonical
  `https://jawed.co.in/ai/` and `noindex, follow` robots metadata.
- Both responses retained the empty React mount point by design; the client
  application still renders the page after JavaScript executes.

These are preview-only deployments. Production remains on the unchanged
`main` commit until review and merge approval.

## Important limitation

This POC prerenders **head metadata only**. It does not server-render React page
content into the body. Deep-route snapshots still contain the React mount point,
so it does not yet resolve Ahrefs findings for missing H1, low word count,
missing outgoing links, orphan detection, or JavaScript execution errors.

Those findings require a separate rendered-content/SSR or static-generation
solution. Do not claim the full Ahrefs audit is fixed based on this POC.

## Preview acceptance criteria

1. TypeScript build and all tests pass.
2. Site Integrity Gate passes.
3. Cloudflare Pages preview contains static HTML snapshots for representative
   static, tool, note, field-guide, blog and unknown routes.
4. Raw HTML (JavaScript disabled) has the expected route-specific metadata.
5. Static files do not break React hydration, direct navigation, client-side
   navigation, or PWA behavior.
6. Canonical paths and hostname remain unchanged.
7. Production is not changed until preview evidence and the remaining SEO
   remediation plan are reviewed.
