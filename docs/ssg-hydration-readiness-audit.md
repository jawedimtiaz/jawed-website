# Static Site Generation (SSG) & React Hydration Readiness Audit

**Status:** Read-only architecture audit; no runtime or production behavior changed  
**Target deployment:** Cloudflare Pages static hosting  
**Current rendering:** Vite-built HTML shell + client-side React 18 `createRoot`  
**Related work:** PR #962 (route-aware static metadata snapshots) — intentionally separate

## Executive decision

Use **build-time static generation (SSG)** rather than introducing a runtime SSR server.

The site is deployed as static assets on Cloudflare Pages. A build-time renderer can generate route-specific HTML and preserve the existing hosting model. A runtime Node/Express SSR service would add an always-on runtime and deployment complexity without a demonstrated requirement.

The target architecture is:

1. Build the client bundle and a server-only React rendering bundle.
2. Enumerate canonical routes from the same sitemap/route metadata source used by the current prerender.
3. Render each route using React's server renderer and a server-compatible router.
4. Write the rendered markup into each route's HTML document, preserving route-specific metadata and asset references.
5. Start the browser app with `hydrateRoot` rather than `createRoot`.
6. Keep browser-only integrations (PWA registration, local storage, media devices, clipboard, online/offline events) in client-only effects or event handlers.
7. Validate both no-JavaScript HTML and post-hydration behavior before widening route coverage.

## Current architecture observations

- `package.json` uses React/React DOM 18, React Router DOM 6, Vite 6, TypeScript, and `react-helmet-async`.
- `src/main.tsx` imports `BrowserRouter`, `HelmetProvider`, and the app; calls `syncThemeFromLocalStorage()`; registers the PWA service worker; then mounts with `ReactDOM.createRoot(...).render(...)`.
- `src/App.tsx` owns the route tree and global shell (header/footer, widgets, offline handling, route metadata and page/tool components).
- `vite.config.ts` configures Vite, PWA generation, sitemap generation, asset chunking and static output.
- `server.ts` is an Express API server with endpoints (including audio transcription); it is not currently an SSR renderer and should not become a production rendering dependency merely to support SSG.
- The current metadata prerender in PR #962 addresses route metadata, not page-body rendering. Keep that work isolated.

## Hydration blockers and risks identified

### 1. Browser-dependent initial state

The first render must be deterministic and equivalent on the build renderer and browser. These hooks/components currently derive initial state from browser-only data or current time:

| Area | Current behavior | Required SSG/hydration treatment |
|---|---|---|
| `useOnlineStatus` | Reads `navigator.onLine` when available; server fallback differs | Render a stable initial value, then subscribe/read browser status in an effect |
| `ThemeToggle` | Reads localStorage-backed theme state; `main.tsx` also synchronizes theme before render | Make React's first render deterministic; restore preference after hydration or use a deliberate pre-hydration class-only script that does not change rendered markup |
| `useUnitSystem` | Reads persisted unit preference during state initialization | Start from a stable default; restore persisted preference after mount |
| `usePersistentState` | Reads localStorage during initial state setup | Defer storage restoration until after hydration; avoid overwriting a saved value with the initial default |
| `useAnimationPreferences` | Initializes from localStorage | Same stable-first-render and post-mount restore pattern |
| `useLocalStorageDraft` | Initializes values, saved timestamp and restored-state flags from localStorage | Hydrate with defaults, restore the draft after mount, and suppress autosave until restoration is complete |
| `OfflineModeFallback` | Initializes displayed time with `new Date().toLocaleTimeString()` | Render a stable placeholder; populate the time after mount or after a user action |

### 2. Browser APIs and side effects

- PWA service-worker registration belongs only in the browser entry and must not be imported/executed by the server-rendering bundle.
- `window`, `document`, `navigator`, `localStorage`, `matchMedia`, clipboard, media devices, and browser event listeners must not be accessed during server rendering or at module import time.
- Browser event subscriptions and DOM mutations should remain in effects; user-initiated browser APIs should remain in event handlers.
- Audit every route component and every transitive import, not only the global shell. A single unguarded browser global can fail the whole build render.
- Firebase/browser SDK initialization and other client-only integrations need explicit boundaries so that they are not evaluated by the server renderer.

### 3. Router and metadata

- The client currently uses `BrowserRouter`. The build renderer needs a server-compatible location/router context (for example, React Router's `StaticRouter`) for each requested pathname.
- Route metadata must be resolved from the existing route metadata source of truth and emitted into the final HTML. Avoid maintaining a second independent route-to-title mapping.
- `react-helmet-async` must be rendered with a fresh provider context per route; metadata collected during one route render must not leak into another route.
- Unknown routes and intentional noindex routes (including `/ai` and `/offline`) need explicit output and robots policy.

### 4. Data and rendering boundaries

- Any page requiring remote or user-specific data needs a deterministic build-time fallback and a defined freshness strategy. Do not embed private user data, local drafts, account information, or secrets in generated HTML.
- Tools should render their explanatory content and usable static UI shell without requiring a browser API during render. Interactive behavior can initialize after hydration.
- Heavy browser-only libraries (charts, PDF generation, media capture, image/video tools) should be dynamically imported from client interactions or isolated client components where necessary.
- Avoid rendering time-dependent/random IDs or locale-dependent strings differently between build and browser.

## Recommended implementation sequence

### SSG-0 — Route and import safety inventory
- Enumerate all canonical sitemap routes plus explicit non-sitemap routes.
- Trace each route's transitive imports.
- Search for browser globals at module scope and in render paths.
- Classify components as server-safe, hydration-sensitive, or client-only.
- Add a CI inventory test so newly introduced unsafe imports are flagged.

### SSG-1 — Hydration-safe global primitives
- Refactor online status, theme, unit system, persistent state, animation preferences and local drafts to stable initial render semantics.
- Ensure saved drafts are restored before autosave can persist defaults over them.
- Replace render-time clock/locale values with post-mount values.
- Add unit tests for server render and first client render equivalence.

### SSG-2 — Minimal renderer proof of concept
- Add a server-only entry that renders a single low-risk route with ReactDOMServer and a static router.
- Use the existing metadata resolver/provider.
- Generate a route HTML document with correct Vite asset references.
- Verify output includes meaningful page body, H1, navigation and route metadata with JavaScript disabled.
- Verify browser hydration has no recoverable hydration errors and controls work.

### SSG-3 — Representative route expansion
Test at least:
- Home page
- About or Work page
- One blog/article route
- One informational tool route
- One interactive calculator
- Career Match & Resume Review
- One noindex route
- Not-found route

Do not expand to all routes until the representative set passes.

### SSG-4 — Full route generation and production hardening
- Generate all canonical sitemap routes and explicitly listed non-sitemap routes.
- Preserve aliases/redirect behavior, canonical URLs, robots directives, sitemap and 404 handling.
- Ensure Cloudflare Pages receives only static assets; do not add an SSR worker/server unless a later requirement proves it necessary.
- Test PWA navigation fallback and offline cached tools against generated HTML.
- Compare route output size and build time; split or defer heavy client-only bundles where needed.

## Required acceptance criteria

- Direct request to each generated route returns HTTP 200 and route-specific HTML.
- With JavaScript disabled, the page contains its actual primary content, a meaningful H1, navigation and route-specific metadata.
- No route has duplicate/conflicting title, description, canonical, robots or Open Graph tags.
- Browser hydration produces no mismatch/recoverable errors in automated tests.
- Existing forms, calculators, navigation, local persistence, theme selection, offline behavior and PWA installation continue to work.
- User-specific localStorage content is not included in generated HTML and is restored safely after hydration.
- No secrets or server credentials are included in client output.
- Sitemap, canonical aliases, 404 behavior and intentional noindex routes remain correct.
- All CI checks pass on a preview deployment before any production merge/deploy.

## Explicit non-goals

- Do not merge PR #962 as part of this audit.
- Do not change the production Cloudflare Pages project or deploy to the production domain.
- Do not introduce a permanent Node/Express SSR service.
- Do not rewrite the application framework or migrate away from React/Vite.
- Do not change content, page design, SEO copy or tool behavior as part of the initial rendering proof of concept.

## Recommendation

Proceed with SSG-0 and SSG-1 as a separate, bounded workstream. The highest-risk area is not the React router; it is deterministic initial rendering across the shared shell and the large set of browser-dependent tool components. Prove the rendering/hydration contract on a small representative route set before scaling to all routes.
