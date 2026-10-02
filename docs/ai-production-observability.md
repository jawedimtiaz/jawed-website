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

Events include the request ID, outcome code/status, source count, and normalized provider status where appropriate.

They deliberately do **not** include:

- provider credentials
- authorization headers
- user messages
- assistant transcript text
- source summaries or retrieval metadata
- provider error bodies

## Security boundary

Request IDs are correlation identifiers, not authentication tokens. They should not be used to authorize access or reveal internal logs to visitors.

Provider-backed E2E remains dependent on a reachable deployment with the Cloudflare Workers AI `AI` binding configured. A request ID or health response does not itself prove provider inference.
