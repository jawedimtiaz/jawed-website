# Patch Series Transfer Package: PWA, Performance, Accessibility & Search/AI Port

**Project:** `jawed.co.in`  
**Repository:** `jawedimtiaz/jawed-website`  
**Base Commit SHA:** `4074ab64caec440f5ce9199f266cdd25950cf9cf`  
**Target Feature Branch:** `feat/pwa-performance-accessibility-port`  
**Generated Date:** 2026-10-22  

---

## 1. Verified Commit Sequence & SHAs

Apply patches strictly in numerical order:

1. `0001-feat-pwa-add-web-app-manifest-icons-service-worker-a.patch`
   * **Full Commit SHA:** `197673fb6ef05667b1603500d5e8397526f1e174`
   * **Parent Commit SHA:** `4074ab64caec440f5ce9199f266cdd25950cf9cf`
   * **Description:** Add web app manifests (`manifest.json`, `manifest.webmanifest`), complete PWA icon set, service worker (`sw.js`), and accessible offline fallback page (`offline.html`).

2. `0002-feat-perf-add-progressive-Image-component-and-WebP-a.patch`
   * **Full Commit SHA:** `c809806bba8a3797c711248ec1e7c7eefc642a1c`
   * **Parent Commit SHA:** `197673fb6ef05667b1603500d5e8397526f1e174`
   * **Description:** Add progressive `Image` component (`src/components/common/Image.tsx`), WebP social preview asset, and asset generation script (`scripts/generate-webp.js`).

3. `0003-feat-ux-add-top-reading-scroll-progress-indicator.patch`
   * **Full Commit SHA:** `537c739d3493ff2e23a9b9af935b9a6d095a7b06`
   * **Parent Commit SHA:** `c809806bba8a3797c711248ec1e7c7eefc642a1c`
   * **Description:** Add top reading scroll progress indicator component (`src/components/ScrollProgress.tsx`) integrated into `App.tsx`.

4. `0004-feat-search-ai-add-modal-site-search-and-web-speech-.patch`
   * **Full Commit SHA:** `cf2e0afe9f725a23507d62120e7943c0c2e505b6`
   * **Parent Commit SHA:** `537c739d3493ff2e23a9b9af935b9a6d095a7b06`
   * **Description:** Add modal site search (`src/components/SiteSearchBar.tsx`), Web Speech API voice dictation in `JawedAiWidget.tsx`, and responsive styling enhancements.

---

## 2. Transfer & Application Instructions

To apply this verified patch series to a fresh clone of `jawedimtiaz/jawed-website`:

```bash
# 1. Clone repository and checkout baseline commit
git clone https://github.com/jawedimtiaz/jawed-website.git
cd jawed-website
git checkout 4074ab64caec440f5ce9199f266cdd25950cf9cf

# 2. Create the target feature branch
git checkout -b feat/pwa-performance-accessibility-port

# 3. Apply the patch series in order
git am /path/to/extracted/patches/*.patch

# 4. Run local validation suite
npm install
npm run lint
npm run build
node scripts/validate-site-integrity.mjs
node scripts/validate-security-baseline.mjs
node scripts/validate-production-html-seo.mjs
node scripts/validate-adsense-readiness.mjs
node scripts/validate-ai-regression.mjs
node scripts/validate-pwa.mjs

# 5. Push branch to GitHub
git push -u origin feat/pwa-performance-accessibility-port
```

---

## 3. Integrity Verification

Verify checksums before applying:

```bash
sha256sum -c MANIFEST-SHA256.txt
```
