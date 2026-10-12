# Phase 122T — AI Conversation Privacy Disclosure

Status: **Changes prepared; CI and deployment verification pending**

## Finding

Jawed AI uses a server-side endpoint and Cloudflare Workers AI, and it can use recent conversation context for follow-up questions. The Privacy page described browser-only tools and general third-party services but did not clearly explain that AI questions and recent context are sent to the server-side AI service.

## Changes made

- Added a Privacy Policy section explaining the data flow from the AI page to the server-side endpoint and Cloudflare Workers AI.
- Clarified that the application's diagnostic logs are designed to record request identifiers and operational metadata rather than message text.
- Avoided making unsupported claims about provider-side retention.
- Added a warning not to submit credentials, sensitive personal information, confidential employer/customer information or restricted support-case details.
- Added a corresponding notice on the AI page and linked to the Privacy Policy.
- Updated and synchronized the Jawed AI knowledge summary.

## Safeguards

- No conversation contents or user data are added to the repository.
- No provider configuration, logging behavior, route, sitemap or AdSense activation changes.
- Disclosure describes the current code path and does not claim that AI answers are always accurate.

## Verification

Require privacy readiness, site-integrity, AI regression, security, SEO, performance and preview checks to pass. After merge, verify the main commit and successful Cloudflare Pages production deployment.
