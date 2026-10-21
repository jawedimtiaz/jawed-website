# Phase 0 — Security Supply-Chain Gate Baseline

**Review date:** 2026-10-20  
**Production repository:** `jawedimtiaz/jawed-website`  
**Observed production commit:** `1269a1a758216e529b8fb6caaf7556f36a578955`  
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
- [x] The corrected security supply-chain validator passed CI on the merged production candidate.
- [x] Site Integrity and Security Supply Chain gates passed after the routing/SEO changes.
- [x] Production AI route, smoke, security-header, legacy-redirect, sitemap, and HTML SEO gates passed on post-deployment reruns; immediate first-run failures were caused by checks racing ahead of deployment or by a strict raw-HTML substring comparison.
- [ ] Decide whether and when to introduce a committed dependency lockfile. The current policy explicitly remains unenforced.
- [ ] Continue the separate Phase 1 editorial/AdSense readiness audit. CI readiness does not imply Google AdSense approval.

No AdSense activation, deployment, or production content change is part of this repair.
