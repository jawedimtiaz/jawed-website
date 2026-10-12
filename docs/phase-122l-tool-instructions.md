# Phase 122L — Tool Instructions and Practical Examples

Status: **Changes prepared; CI and deployment verification pending**

## Audit finding

The Service Desk Note Formatter and AI Prompt Builder are functional browser-based tools, but their pages had limited task-specific instruction around how to judge output quality. A functional control alone is not enough to help a visitor use the result correctly.

## Changes made

### Service Desk Note Formatter
- Added a concise workflow for recording symptoms, actual checks, current status and follow-up.
- Added a reusable note structure that requires bracketed fields to be replaced with verified facts.
- Reinforced the distinction between a confirmed resolution, workaround, pending action and unresolved issue.
- Added a review reminder against invented root causes and confidential data.

### AI Prompt Builder
- Added an example transforming a vague troubleshooting-guide request into a task with context, output criteria and constraints.
- Added a checklist for data minimization, audience, assumptions, constraints and review against trusted sources.
- Preserved the existing statement that the tool organizes text locally and does not connect to an AI service.

### AI knowledge
- Refreshed the two corresponding summaries and keywords.
- Synchronized the generated runtime knowledge copy.
- Retained the existing sitemap coverage and review date.

## Safeguards

- No user-entered information is added to the repository.
- No new routes, sitemap changes, ad tags, ads.txt or AdSense activation changes.
- The examples explicitly require real observed facts and verification.

## Verification

Require the relevant site-integrity, AI regression, AdSense readiness, security, SEO, performance and deployment-preview checks to pass. After merge, confirm the main commit and successful Cloudflare Pages production deployment.

## Decision

This improves the instructions and responsible use of two existing tools. Continue auditing the remaining interactive tools and published inventory; no AdSense approval is implied.
