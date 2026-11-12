# Firebase browser configuration security note

`firebase-applet-config.json` contains Firebase Web SDK configuration. The
`apiKey` in this file is a browser-visible project identifier used by the
Firebase client SDK; it is not a Firebase Admin SDK service-account key or a
private credential. Moving this value to a frontend build-time environment
variable would not make it secret because the browser must receive it.

The repository credential scanner therefore has one narrow exception:
- Exact file path: `firebase-applet-config.json`
- Exact field: `apiKey`
- Value must match the Firebase Web API key format.
- The same JSON object must contain a non-empty `projectId` and matching
  `<projectId>.firebaseapp.com` `authDomain`.

All other credential patterns remain blocked, including private keys,
service-account material, tokens, passwords, and API-key-like values in every
other file. Malformed or differently structured Firebase config does not
qualify for the exception.

## Required Google Cloud controls

This source-level exception does **not** prove that the key is adequately
restricted. Before treating the security review as complete, verify in Google
Cloud Console for the associated Firebase project:

1. Application restrictions limit the key to the production website's
   authorized HTTP referrers (including only the required apex and www hosts).
2. API restrictions allow only the APIs actually needed by the Firebase Web
   SDK and this website.
3. Firebase Authentication authorized domains and Firestore/Storage security
   rules are independently configured; the API key is not an authorization
   boundary.
4. No Admin SDK service-account JSON, private key, or privileged server
   credential is committed to the repository.

Do not add localhost, lab, preview, or third-party domains unless a documented
development or production requirement needs them. Revisit this allowlist if
the Firebase config file changes shape or the website moves to another
project.
