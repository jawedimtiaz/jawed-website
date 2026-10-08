# Phase 120 — TWA Engineering

This directory contains the source configuration for the Android Trusted Web Activity (TWA) wrapper for jawed.co.in.

## Scope

- Package ID: `in.co.jawed.website`
- Production origin: `https://www.jawed.co.in/`
- Launch URL: `/`
- Generator: GoogleChromeLabs Bubblewrap
- Version: 1.0.0 / versionCode 1
- No Play Console account or store submission is performed by this repository phase.
- No signing keys or passwords are committed.

## Local build

Install Node.js 14.15+ and Bubblewrap:

```bash
npm i -g @bubblewrap/cli
```

From this directory:

```bubblewrap update --manifest=twa-manifest.json
bubblewrap build --manifest=twa-manifest.json
```

For a first build, Bubblewrap may install required Android/JDK tooling and will ask for signing-key information. Keep the keystore outside source control.

For a device test:

```bubblewrap install
```

A signed APK is suitable for local device testing. An App Bundle (AAB) is the artifact intended for Google Play.

## Digital Asset Links

Do **not** add a guessed certificate fingerprint. The production `/.well-known/assetlinks.json` must use the SHA-256 certificate of the key that actually signs the released app.

If Play App Signing is used, Google says to use the Play app-signing certificate fingerprint rather than a local upload-key fingerprint.

Once the final signing certificate fingerprint is known, add the production association through a separate bounded change.

## Account boundary

Google Play/Android developer-account registration, identity verification, payment, store listing, testing-track management, and final publication require the site owner. The repository does not store account credentials or signing secrets.
