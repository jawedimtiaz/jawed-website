# Jawed AI Live Operational QA

This document validates the production-facing browser contracts that can be audited without provider credentials.

## Verified repository contracts

### Full AI page: `/ai/`

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

### Site-wide floating AI widget

The shared site shell also exposes a floating `Ask AI` widget on normal pages:

- mounts once and is excluded from `/ai/` to prevent duplicate assistants
- uses `POST /api/ai` directly; it does not perform a redundant health GET before each question
- sends JSON request bodies
- keeps at most 12 conversation messages
- bounds the input to 500 characters
- renders assistant text through safe DOM APIs
- exposes source links only for same-site relative paths and rejects protocol-relative URLs
- exposes accessible toggle, close, conversation-log, input, and status semantics
- supports Escape to close the panel
- handles `AI_NOT_CONFIGURED`, `AI_PROVIDER_ERROR`, and `AI_RATE_LIMITED`
- preserves the failed question in the input so the user can retry
- does not persist conversation history in browser storage

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

## Production smoke test

After the Workers AI binding is active and the site is deployed:

### Full AI page

1. Open `https://jawed.co.in/ai/`.
2. Submit a simple site-navigation question.
3. Confirm an assistant response appears.
4. Confirm relevant source links appear.
5. Ask a follow-up question and confirm recent context is retained.
6. Confirm no provider credential appears in browser-visible responses, page source, or network response bodies.

### Site-wide widget

1. Open a normal page such as the home page or a notes/tools page.
2. Confirm the floating **Ask AI** control appears.
3. Open the widget and confirm the panel receives focus in the question field.
4. Submit a simple site-navigation question.
5. Confirm an assistant response appears in the widget.
6. Confirm relevant source links appear when returned.
7. Ask a follow-up question and confirm recent context is retained.
8. Close the widget with the close control and with Escape.
9. Confirm the failed-question behavior preserves the question when the API reports a handled failure.
10. Open `/ai/` and confirm the floating widget is not duplicated there.

### Zero-cost/security boundary

- Confirm browser requests target only `/api/ai`.
- Confirm no provider API key is present in page source, JavaScript, request bodies, or response bodies.
- Do not add an OpenAI key or another paid provider credential.
- The deterministic repository validators mock `env.AI.run()`; they do not consume remote Workers AI allocation.

A successful health response alone does not prove end-to-end inference. Final provider-live verification requires a real POST request after the `AI` binding is active.
