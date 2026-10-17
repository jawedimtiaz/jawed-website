# Phase 122U — Floating AI Widget Privacy Notice

Status: **Changes prepared; CI and deployment verification pending**

## Finding

Phase 122T clarified AI conversation processing on the Privacy page and the dedicated AI page. The floating AI widget, however, is available on other site pages and could be used without visiting either disclosure first.

## Changes made

- Added a short privacy notice inside the floating AI widget, before the message input.
- Linked directly to the Privacy Policy.
- Added compact styling so the notice remains readable without dominating the chat panel.
- Added a site-integrity contract requiring the notice and policy link to remain present.

## Safeguards

- The notice warns against passwords, authentication codes, sensitive personal information and confidential work data.
- No conversation content is logged or stored by this change.
- No provider, endpoint, request, rate-limit or retention behavior changed.
- No new route, sitemap, ads.txt or AdSense activation change.

## Verification

Require JavaScript syntax, site-integrity, AI regression, accessibility-related, security, performance and preview gates to pass. After merge, verify the main commit and successful Cloudflare Pages production deployment.
