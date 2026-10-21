# Phase 1 — Notes metadata title and article H1 review

Date: 2026-10-21  
Scope: `src/data/notesData.json` on main commit `87e77bde01a57943fefbf2eefeee97f6f499d909`  
Status: source-level editorial triage; no article or metadata changes made.

## Purpose

Each note has a metadata `title` used in the notes list/search, the detail breadcrumb, and route SEO metadata. The HTML content separately includes an H1 and its own breadcrumb. These strings do not have to be identical: a concise listing/SEO title can be useful while an H1 gives a fuller editorial framing. The acceptance criterion should be semantic alignment, not exact string equality.

## Findings

A source scan of 30 notes found 14 exact metadata-title/H1 matches and 16 differences. The 16 differences are listed below. These are candidates for human review, not 16 confirmed defects.

| Slug | Metadata/list/SEO title | Article H1 | Triage recommendation |
|---|---|---|---|
| `ai-prompting-everyday-work` | AI Prompting for Everyday Work: A Simple Guide | AI Prompting for Everyday Work: A Simple Starting Pattern | Likely acceptable: same topic and promise; H1 emphasizes the reusable pattern. Keep unless analytics/user research supports a change. |
| `apis-explained-for-it-support` | APIs for IT Support: A Practical Guide | APIs Explained for IT Support: A Practical Starting Point | Likely acceptable: same subject and beginner intent. |
| `apple-device-management-enrollment-models` | Apple Device Management: Enrollment Models | Apple Device Management: Understanding Enrollment Models | Acceptable descriptive variation; same intent. |
| `building-safe-browser-based-it-tools` | Safe Browser-Based IT Tools: Design Guide | Building Safe Browser-Based IT Tools: A Practical Framework | Likely acceptable; listing title is shorter but preserves the topic. |
| `indian-mutual-funds-index-etfs-starting-point` | Indian Mutual Funds, Index Funds and ETFs | Indian Mutual Funds, Index Funds and ETFs: A Practical Starting Point | Acceptable: H1 adds a reader-oriented qualifier. |
| `interactive-tools-ai-assisted-experiences-architecture` | Interactive Tools and AI Architecture | Interactive Tools & AI-Assisted Experiences: A Practical Architecture | Review terminology: H1 is more specific about AI-assisted experiences. Consider aligning the listing title to that wording if the page content supports it. |
| `it-troubleshooting-guide-knowledge-base` | IT Troubleshooting Guides from Incidents | Writing Better IT Troubleshooting Guides: From Incident to Knowledge Base | **Highest-priority review.** The titles have different framing and the H1 describes converting incident knowledge into reusable guidance. Consider a concise aligned metadata title such as “IT Troubleshooting Guides: From Incident to Knowledge Base” after confirming it matches the article's intended query and scope. |
| `microsoft-sign-in-troubleshooting-guide` | Microsoft Sign-In Troubleshooting Guide | Microsoft Sign-In Troubleshooting: A Practical First-Response Guide | Likely acceptable: same subject; H1 clarifies first-response scope. |
| `money-basics-budget-emergency-net-worth` | Money Basics: Budget, Emergency Fund, Net Worth | Money Basics: Budgeting, Emergency Funds and Net Worth | Acceptable wording variation; both cover the same three concepts. |
| `network-connectivity-first-response-checklist` | Network Connectivity First-Response Checklist | Network Connectivity First-Response Troubleshooting Checklist | Acceptable; H1 makes troubleshooting explicit. |
| `networking-layer-by-layer-diagnostic-framework` | Layer-by-Layer Network Troubleshooting | Networking Troubleshooting: A Layer-by-Layer Diagnostic Framework | Acceptable; same diagnostic intent, with the H1 more descriptive. |
| `new-vs-old-tax-regime-comparison` | New vs Old Tax Regime: Key Differences | New vs Old Tax Regime: How to Think About the Comparison | Review for search-intent alignment: the metadata promises key differences while the H1 frames a decision process. Confirm that the article delivers both; otherwise align one title to the actual content. |
| `portfolio-allocation-rebalancing-framework` | Portfolio Allocation and Rebalancing | Portfolio Allocation and Rebalancing: A Practical Framework | Acceptable; H1 adds the framework format. |
| `retirement-withdrawals-sequence-risk-income-review` | Retirement Withdrawals: Sequence Risk and Income | Retirement Withdrawals: Sequence Risk, Income and Annual Reviews | Likely acceptable; H1 adds annual-review coverage. |
| `scoping-it-issues-user-device-service` | Scoping IT Issues: User, Device or Service? | User, Device or Service? A Simple Way to Scope IT Issues | Acceptable variation; both express the same scope-triage purpose. |
| `small-it-automation-starting-point` | IT Automation: Start With Repetitive Work | Building Small IT Automations: Start With the Repetitive Step | Likely acceptable; same practical entry point, different wording. |

## Recommended rule

1. Do not enforce exact metadata-title/H1 equality globally.
2. Require semantic alignment: both titles should describe the same reader task, subject, and scope without promising different content.
3. Prefer a concise listing/SEO title when it improves scanning, while the H1 can state the fuller article framing.
4. Prioritize manual review of the knowledge-base article and tax-regime comparison, then the AI-assisted architecture terminology.
5. If a title is intentionally different, record the reason in the editorial ledger; do not add keyword stuffing or alter content solely to satisfy an automated equality check.

## Validation boundary

The scan compared JSON `title` values with the first H1 extracted from each note's HTML content. It did not render pages in a browser, measure search performance, verify live indexing, or establish whether Google prefers either title. No code, content, redirects, or monetization configuration was changed.
