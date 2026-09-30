# Jawed AI Live Operational QA

Phase 20A validates the production-facing browser contract that can be audited without access to provider credentials.

## Verified repository contracts

The public `/ai/` page:

- sends questions only to `/api/ai`
- sends JSON request bodies
- keeps at most 12 conversation messages
- displays assistant content through DOM text content rather than HTML
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

A provider-backed end-to-end test additionally requires the production `AI_PROVIDER_API_KEY` to be configured in Cloudflare.

The following cannot be truthfully marked as provider-live from repository-only QA:

1. successful OpenAI provider response;
2. provider model acceptance;
3. production API quota/billing behavior;
4. real production rate-limit behavior under repeated traffic;
5. Cloudflare runtime logs and deployment-specific configuration.

After the production secret is configured, perform this smoke test manually:

1. Open `/ai/`.
2. Submit a simple site-navigation question.
3. Confirm an assistant response appears.
4. Confirm relevant source links appear.
5. Ask a follow-up question and confirm recent context is retained.
6. Temporarily verify the missing-key failure path only in a non-production environment if needed.
7. Confirm no provider credential appears in browser-visible responses, page source, or network response bodies.

Do not expose or paste the provider secret during testing.
