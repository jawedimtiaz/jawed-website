# Jawed AI Live Operational QA

This document validates the production-facing browser contract that can be audited without provider credentials.

## Verified repository contracts

The public `/ai/` page:

- sends questions only to `/api/ai`
- sends JSON request bodies
- keeps at most 12 conversation messages
- renders assistant content through safe DOM APIs: text nodes for reply text plus anchors only for exact, allowlisted Jawed.co.in source URLs
- validates structured source URLs as same-site relative paths and rejects protocol-relative URLs
- handles `AI_NOT_CONFIGURED`
- handles `AI_PROVIDER_ERROR`
- handles `AI_RATE_LIMITED`
- keeps the user input bounded to 500 characters

Run:

```bash
node scripts/validate-ai-live-operational.mjs
```

## Live production boundary

A provider-backed end-to-end test requires the production Cloudflare Workers AI binding named `AI` to be active.

The following cannot be truthfully marked as provider-live from repository-only QA:

1. successful Cloudflare Workers AI response;
2. provider model acceptance;
3. production Workers AI free-allocation behavior;
4. real production rate-limit behavior under repeated traffic;
5. Cloudflare runtime logs and deployment-specific configuration.

After the Workers AI binding is active, perform this smoke test manually:

1. Open `/ai/`.
2. Submit a simple site-navigation question.
3. Confirm an assistant response appears.
4. Confirm relevant source links appear.
5. Ask a follow-up question and confirm recent context is retained.
6. Confirm no provider credential appears in browser-visible responses, page source, or network response bodies.

The deterministic repository validators mock `env.AI.run()`; they do not consume remote Workers AI allocation.
