# AI Production Security & Privacy Telemetry QA

Phase 20D verifies that operational diagnostics improve supportability without creating a new privacy or security data channel.

## Required boundaries

- Request IDs are random correlation identifiers, not authentication tokens.
- User prompts and assistant transcript text remain out of runtime telemetry.
- Provider API keys and authorization headers remain out of runtime telemetry and responses.
- Retrieval summaries, keywords, and source metadata remain out of generic failure responses and runtime telemetry.
- Rate-limit responses expose only the minimum retry timing needed by the existing client behavior.
- The browser does not persist AI conversation history or request IDs.
- Assistant output is rendered through safe DOM APIs: reply text remains text nodes, and only exact validated Jawed.co.in source URLs become anchors.
- Structured source URLs remain the canonical navigation data contract; inline source anchors are created only from that validated source set.

## Validation

Run:

```bash
node scripts/validate-ai-production-security.mjs
```

This is a repository contract check. It does not claim provider-backed live testing.

## Operational privacy rule

If a user reports an AI failure, the `x-request-id` value may be shared with the site operator for correlation. It must never be treated as a secret or as an authorization credential.
