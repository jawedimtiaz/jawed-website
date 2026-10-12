# Phase 122C — Windows and Network Content Remediation

Status: **Changes prepared; CI and production verification pending**

## Scope

Improve two existing published IT-support notes without adding routes or changing the sitemap, navigation, architecture, or AdSense activation configuration.

## Windows first-response checklist

Route: `/notes/windows-first-response-troubleshooting-checklist/`

The prior note offered a safe general sequence but little symptom-specific guidance. Added branches for application failures, sign-in, performance, update/installation failures, and multi-user impact. Added a clearly illustrative example, plus stop conditions for security controls, device management, data loss and escalation.

## Network connectivity checklist

Route: `/notes/network-connectivity-first-response-checklist/`

The prior note described progressive troubleshooting at a high level. Added a decision path from destination/symptom definition through local connection state, scope comparison, approved reachability/name-resolution tests, shared dependencies, and validation. Added an illustrative one-service-fails example and explicit limits on interpreting individual tests.

## AI grounding maintenance

Updated the two corresponding entries in `assets/data/ai-knowledge.json` and synchronized `functions/lib/ai-knowledge-data.js`. The sitemap coverage and source-review date are retained in the existing knowledge maintenance contract.

## Safety and editorial controls

- Examples are marked illustrative, not real incidents.
- No organization-specific hostnames, addresses, credentials or private details are published.
- No guidance instructs readers to bypass VPN, firewall, endpoint protection, device management or other security controls.
- Steps are conditional on approved tools and support permissions.
- The goal is more actionable guidance, not extra word count.

## Verification

Before merge, require the repository's site integrity, AI regression, AdSense readiness, security, SEO, performance and deployment preview gates to pass. After merge, verify the main commit and successful Cloudflare Pages production deployment. Production page fetches may be unavailable to external inspection tools; record that limitation rather than claiming a live response was manually inspected.

## Decision

These changes strengthen two existing notes but do not establish AdSense approval. The complete page-level inventory audit and final content/policy review remain required before another AdSense review is requested.
