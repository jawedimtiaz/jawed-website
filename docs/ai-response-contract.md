# Jawed AI Response Contract

The `POST /api/ai` success response has this contract:

- `reply`: non-empty string returned by the configured AI provider.
- `sources`: array of public Jawed.co.in source references.
  - `url`: relative same-site path beginning with `/`, never `//`.
  - `title`: non-empty display title.
- `model`: provider model identifier.

The API deliberately exposes only `url` and `title` for browser source references. Retrieval metadata such as summaries and keywords remains server-side provider context.

Error responses use:
- `AI_ORIGIN_NOT_ALLOWED` when the request origin is outside the allowed site origin.
- `AI_INVALID_CONTENT_TYPE` when the request is not JSON.
- `AI_REQUEST_TOO_LARGE` when the request exceeds the request-size boundary.
- `AI_INVALID_JSON` when the request body is not valid JSON.
- `AI_INVALID_CONVERSATION` when the conversation structure or latest-message role is invalid.
- `AI_INVALID_MESSAGE` when a message has an invalid role, is empty, or exceeds the message-size boundary.
- `AI_RETRIEVAL_ERROR` when local knowledge retrieval fails.
- `AI_NOT_CONFIGURED` when the Cloudflare Workers AI `AI` binding is unavailable.
- `AI_RATE_LIMITED` when the request quota is exceeded.
- `AI_PROVIDER_ERROR` when the provider invocation or grounded-response contract fails.
- `AI_HANDLER_ERROR` when an unexpected handler-level failure occurs.

The browser validates the relative-URL invariant before creating source links.

The provider's markdown links are separate from the structured `sources` contract; the structured source list is the canonical UI navigation mechanism.
