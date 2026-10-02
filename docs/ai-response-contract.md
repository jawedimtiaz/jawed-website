# Jawed AI Response Contract

The `POST /api/ai` success response has this contract:

- `reply`: non-empty string returned by the configured AI provider.
- `sources`: array of public Jawed.co.in source references.
  - `url`: relative same-site path beginning with `/`, never `//`.
  - `title`: non-empty display title.
- `model`: provider model identifier.

The API deliberately exposes only `url` and `title` for browser source references. Retrieval metadata such as summaries and keywords remains server-side provider context.

Error responses use:
- `AI_NOT_CONFIGURED` when the Cloudflare Workers AI `AI` binding is unavailable.
- `AI_RATE_LIMITED` when the request quota is exceeded.
- `AI_PROVIDER_ERROR` for provider failures.

The browser validates the relative-URL invariant before creating source links.

The provider's markdown links are separate from the structured `sources` contract; the structured source list is the canonical UI navigation mechanism.
