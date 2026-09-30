# AI Regression Coverage Gap Audit

Phase 20J closes a coverage gap at the API handler boundary.

The regression matrix now directly exercises the exported AI handlers for:

- GET /api/ai configured and unconfigured health states
- health response headers and request-ID correlation
- health metadata and rate-limit configuration reporting
- POST origin rejection through the real handler
- real unconfigured POST behavior
- structured public-source shape and relative URL safety
- generic response headers and JSON contracts
- empty user-message validation through the real handler

Focused source-marker validators remain useful for contracts that are intentionally static, but handler-level behavior is now covered where it can be exercised deterministically without a provider credential.

The matrix does not claim live provider-backed E2E.
