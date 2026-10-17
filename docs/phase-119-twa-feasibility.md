# Phase 119 — Android TWA / Play Store Feasibility Record

## Decision

**Decision: feasible in principle, but defer implementation.**

The site now has a production-verified installable PWA. A Trusted Web Activity (TWA) is technically compatible with the current architecture, but creating a Play Store package would introduce a new Android application identity, signing/release lifecycle, Play Console administration, Digital Asset Links, and store-policy/review obligations.

The current website does not contain an Android application project, package identifier, signing certificate, `AndroidManifest.xml`, Gradle project, or Digital Asset Links association. No such infrastructure should be added merely for experimentation.

## Evidence

### Existing PWA readiness

Phase 116/118 production evidence establishes that the website already has:

- Web App Manifest
- standalone display mode
- service worker
- offline fallback
- PWA icons
- production HTTPS
- successful Android device testing
- production deployment verification

Therefore the web foundation required for a TWA-style distribution path is already substantially in place.

### TWA / Android requirements

Current Android documentation confirms that verified website/app association is based on Digital Asset Links. The website must publish `/.well-known/assetlinks.json`, containing the Android application package name and SHA-256 certificate fingerprint. For Play App Signing, the production certificate fingerprint must correspond to the certificate Google uses to sign the released application.

The Android app would also need an application manifest and verified HTTPS App Links configuration where applicable.

### Current repository state

Repository search found no existing:

- AndroidManifest.xml
- Gradle Android project
- application package ID
- assetlinks.json
- Bubblewrap/TWA project
- Android signing configuration

This is expected and is not a defect.

## Value assessment

### Benefits if published

- Presence in Google Play
- App-launch surface in the Android app ecosystem
- A recognizable app entry for users who prefer installed applications
- Potentially cleaner distribution than asking users to install the PWA manually
- Future room for carefully scoped Android integrations if a genuine user need emerges

### Costs / risks

- Play Console account and developer verification requirements
- Android application ID and signing lifecycle
- Digital Asset Links maintenance
- Store listing, privacy, content and policy compliance
- Additional release and testing surface
- Ongoing responsibility for an app that is primarily a website shell
- Risk of creating a thin wrapper with little incremental user value

Google Play policies specifically prohibit low-value/repetitive or unauthorized web-view applications. Therefore any future submission must be positioned as a legitimate installed experience for the site owner, not merely a referral or unauthorized wrapper.

## Recommendation

**Do not build the Android package yet.**

Keep the production PWA as the primary Android experience.

Revisit TWA/Play Store implementation only if at least one of these becomes true:

1. The site gains enough recurring mobile users that Play distribution is strategically useful.
2. Users explicitly request a Play Store app.
3. Search/distribution data shows a meaningful opportunity for an installed app.
4. A concrete Android-only capability is identified that cannot be delivered appropriately by the PWA.
5. There is a clear business/distribution reason to maintain a second release channel.

If the threshold is met, the next bounded phase should be **TWA implementation feasibility-to-build**, including package naming, signing strategy, Digital Asset Links, Play Console prerequisites, privacy/policy review, and a local Android test build before any store submission.

## External documentation

- Android App Links and Digital Asset Links requirements: https://developer.android.com/training/app-links/configure-assetlinks
- Android App Links overview: https://developer.android.com/training/app-links/about
- Chrome for Developers — Web on Android / Trusted Web Activity: https://developer.chrome.com/docs/android
- Google Play Developer Programme Policy: https://support.google.com/googleplay/android-developer/answer/18258653

## Boundary

No production website code was changed in this phase.
