# AdSense Activation Contract

Status: **pre-activation**

This document records the account-dependent inputs that must exist before advertising code is introduced into the site.

## Required external inputs

1. **AdSense publisher account**
   - The site owner must have an active Google AdSense account and the domain must be submitted through Google's current site-review flow.
   - Do not invent or hard-code a publisher ID before it is supplied by the real AdSense account.

2. **Publisher ID**
   - Required before production AdSense tags or `ads.txt` entries are generated.
   - Store the real value only in the implementation location required by Google's current AdSense setup instructions.

3. **Consent management**
   - For personalized ads to users in the EEA, UK, or Switzerland, use a Google-certified CMP integrated with the IAB Transparency and Consent Framework as required by Google's current publisher policy.
   - The site currently has no AdSense CMP integration.

4. **Advertising decision**
   - Decide whether personalized, non-personalized, or another supported ad-serving mode will be used.
   - The privacy policy and consent flow must match the actual mode before ads are enabled.

## Repository activation rules

- Do not add `adsbygoogle` or Google publisher ad tags while the project remains `pre-activation`.
- Do not create an `ads.txt` publisher line without the real publisher account values.
- Do not load advertising scripts globally before the consent architecture is finalized.
- Keep `/privacy/`, `/contact/`, `/ai/`, and `/tools/` outside the initial ad inventory boundary.
- Revalidate the eligible inventory immediately before activation because page content and policy requirements can change.

## Activation order

AdSense account → real publisher ID → CMP/consent configuration → privacy verification → ad inventory verification → ad tags → ads.txt → production smoke test

## Current state

No publisher ID, AdSense ad tag, `ads.txt` publisher record, or CMP integration is present in this repository.

This contract is an implementation safeguard, not a statement that Google has approved the site.
