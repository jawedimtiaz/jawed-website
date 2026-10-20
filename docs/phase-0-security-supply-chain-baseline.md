# Phase 0 — Security Supply-Chain Gate Baseline

**Review date:** 2026-10-20  
**Production repository:** `jawedimtiaz/jawed-website`  
**Observed production commit:** `d66ea9fc5326a92d362dd135e735eab6e71f0678`  
**Failed run:** https://github.com/jawedimtiaz/jawed-website/actions/runs/39469253059

## Evidence

The recorded GitHub Actions job completed with failure in `node scripts/validate-security-supply-chain.mjs`. Its exact reported findings were:

- `Secret-like tracked file: .env.example`
- `Unexpected dependency manifest/lockfile detected: package.json`

The current `.env.example` contains only a sample `VITE_APP_TITLE` value. It does not contain a credential in the reviewed contents. This is a template file, not proof of a leaked secret.

The production `package.json` declares the React 18, TypeScript, Vite application and its build/lint scripts. Rejecting it makes the gate incompatible with the current repository. The contract still claimed that no package manifest applies, which is stale relative to the current app.

The workflow itself has `permissions: contents: read`, does not declare secret access, and pins the two referenced actions to full commit SHAs. These source-level observations are not a substitute for a successful CI run.

## Changes proposed on a review branch

- Allow the exact `.env.example` template filename while continuing to scan its contents for credential-like literals.
- Include `.example` files in the content scan.
- Validate that `package.json` exists, parses as JSON, and declares a name and scripts instead of rejecting the manifest.
- Update the security contract to describe the package manifest as expected and validated. Lockfile policy remains explicitly unenforced for now; dependency/lockfile policy should be decided separately rather than smuggled into this repair.

Branch: `fix/security-supply-chain-validator-policy`

## Status and limitations

- [x] Root cause identified from the validator, contract, and actual workflow log.
- [x] Minimal fix prepared on a branch; production `main` was not modified.
- [ ] GitHub Actions validation of the proposed change.
- [ ] Review latest repository CI and run the broader build, lint, SEO, integrity, performance, and AdSense checks.
- [ ] Capture live HTTPS/redirect, robots, sitemap, page-rendering, and performance evidence. The available web fetch in this session could not access the production URLs, so no claim is made that those live checks passed or failed.

No AdSense activation, deployment, or production content change is part of this repair.
