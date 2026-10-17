# Jawed AI Response Contract

The `POST /api/ai` success response has this contract:

- `reply`: non-empty string returned by the configured AI provider.
- `sources`: array of public Jawed.co.in source references.
  - `url`: relative same-site path beginning with `/`, never `//`.
  - `title`: non-empty display title.
- `model`: provider model identifier.
- `request_id`: server-generated request identifier, also returned as the `x-request-id` response header.

The API deliberately exposes only `url` and `title` for browser source references. Retrieval metadata such as summaries and keywords remains server-side provider context.

Error responses use these public HTTP statuses:
- `AI_ORIGIN_NOT_ALLOWED` — HTTP 403 when the request origin is outside the allowed site origin.
- `AI_INVALID_CONTENT_TYPE` — HTTP 415 when the request is not JSON.
- `AI_REQUEST_TOO_LARGE` — HTTP 413 when the request exceeds the request-size boundary.
- `AI_INVALID_JSON` — HTTP 400 when the request body is not valid JSON.
- `AI_INVALID_CONVERSATION` — HTTP 400 when the conversation structure or latest-message role is invalid.
- `AI_INVALID_MESSAGE` — HTTP 400 when a message has an invalid role, is empty, or exceeds the message-size boundary.
- `AI_RETRIEVAL_ERROR` — HTTP 502 when local knowledge retrieval fails.
- `AI_NOT_CONFIGURED` — HTTP 503 when the Cloudflare Workers AI `AI` binding is unavailable.
- `AI_RATE_LIMITED` — HTTP 429 when the application request quota is exceeded.
- `AI_PROVIDER_ERROR` — HTTP 429, 502, or 504 depending on the normalized provider failure.
- `AI_HANDLER_ERROR` — HTTP 502 for an unexpected handler-level failure.

Error bodies include `error`, `code`, and `request_id`. Provider failures may additionally include an allowlisted `diagnostic` value; the same normalized diagnostic is returned through `x-ai-provider-diagnostic`. Unexpected handler failures may additionally expose an allowlisted handler diagnostic through `x-ai-handler-diagnostic`.

The browser validates the relative-URL invariant before creating source links.

The provider's markdown links are separate from the structured `sources` contract; the structured source list is the canonical UI navigation mechanism.
