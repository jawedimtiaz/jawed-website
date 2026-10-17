# AI Production Observability

## Purpose

AI failures must be diagnosable without exposing provider credentials, user prompts, conversation contents, or retrieval metadata.

## Request correlation

Every `POST /api/ai` request receives a server-generated UUID request ID.

- Returned in the JSON `request_id` field for API outcomes.
- Returned in the `x-request-id` response header.
- The ID is safe to share when reporting an AI failure.

## Failure stages

The endpoint distinguishes these operational boundaries:

- `AI_NOT_CONFIGURED` — Cloudflare Workers AI binding is not available to the runtime.
- `AI_RETRIEVAL_ERROR` — local knowledge retrieval failed before provider invocation.
- `AI_PROVIDER_ERROR` — provider invocation or grounded-response contract failed.
- `AI_RATE_LIMITED` — request exceeded the application rate limit.
- `AI_ORIGIN_NOT_ALLOWED` — request origin failed the same-site policy.
- Validation codes identify malformed requests without exposing internals.

## Server-side diagnostics

The endpoint emits structured JSON events to the runtime log:

- `ai_request_failure`
- `ai_request_unconfigured`
- `ai_request_success`

Events include the request ID and event-specific operational fields: failure events include outcome code/status and normalized provider status where appropriate; success events include source count and model; unconfigured events include the outcome code and matched source count.

They deliberately do **not** include provider credentials or other secret material. No OpenAI API keys or other provider API keys are required or logged; the production integration uses the Cloudflare Workers AI binding `AI`.

- provider credentials
- authorization headers
- user messages
- assistant transcript text
- source summaries or retrieval metadata
- provider error bodies

## Security boundary

Request IDs are correlation identifiers, not authentication tokens. They should not be used to authorize access or reveal internal logs to visitors.

Provider-backed E2E remains dependent on a reachable deployment with the Cloudflare Workers AI `AI` binding configured. A request ID or health response does not itself prove provider inference.
