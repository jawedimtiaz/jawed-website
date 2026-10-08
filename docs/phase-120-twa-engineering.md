# Phase 120 — TWA Engineering Preparation

## Decision

**Proceed with TWA engineering preparation. Do not register or publish the app yet.**

The production PWA is already installed/tested on Android. Current official Bubblewrap documentation supports generating an Android TWA project from the existing Web App Manifest, building a signed APK/AAB, and producing the Digital Asset Links information needed for domain verification.

## Implemented in this phase

- Reserved Android application ID: `in.co.jawed.website`
- Added Bubblewrap `twa-manifest.json`
- Bound the TWA to `https://www.jawed.co.in/`
- Preserved standalone presentation and existing PWA branding
- Disabled unnecessary notification capability
- Added a reproducible local build procedure
- Explicitly excluded signing keys, passwords, Play credentials, and account secrets from Git
- Kept Digital Asset Links deployment gated on the real signing certificate

## Why the assetlinks file is not deployed yet

Android requires `/.well-known/assetlinks.json` to contain the exact package name and SHA-256 signing certificate fingerprint. A guessed fingerprint would be incorrect and could break verification. If Play App Signing is used, the production certificate fingerprint comes from Play Console.

Therefore the website association is intentionally a later bounded change after the first real signing key is established.

## What I can complete

- Repository TWA configuration and documentation
- Android project generation/build instructions
- CI validation/build automation where useful
- Website-side Digital Asset Links once the real certificate fingerprint is supplied/available
- PR/CI/merge/Cloudflare verification
- Test-build troubleshooting

## What the owner must complete

- Android/Google developer-account identity verification
- Any required Play registration/payment
- Creation/confirmation of the Play application entry
- Play App Signing enrollment/acceptance
- Store listing declarations and policy answers
- Recruiting and managing any required closed-test testers
- Final Play production-access request and publication decision

## Cost boundary

The engineering preparation itself has no mandatory Google fee. Current Google documentation lists full Android/Google Play distribution registration at US$25 one time; limited distribution can be available without that fee for eligible closed distribution scenarios. The final distribution choice should be made in the owner's Google account.

## Testing boundary

If a new personal Google Play developer account is used, Google currently requires at least 12 testers to remain opted in continuously for 14 days before production access can be requested.

## Next step

Generate the Android project from this configuration and produce a local signed test APK. After the APK is successfully tested on the owner's Android device, establish the production Digital Asset Links association using the actual signing certificate. Only then decide whether to register/publish through Google Play.
