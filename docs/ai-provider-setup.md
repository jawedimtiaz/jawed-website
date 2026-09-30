# Jawed AI provider setup

## Cloudflare Pages Functions

Jawed AI uses a server-side OpenAI Responses API adapter. The browser never receives the provider API key.

Configure these Cloudflare Pages environment variables/secrets:

- `AI_PROVIDER_API_KEY` — **Secret** containing the OpenAI API key.
- `AI_PROVIDER_MODEL` — optional non-secret variable; defaults to `gpt-5.6-luna`.

The endpoint is:

- `POST /api/ai`

The provider adapter uses the OpenAI Responses API with `store: false`. The request contains the validated conversation messages plus the top five first-party Jawed.co.in knowledge matches.

## Security boundaries

- Never place `AI_PROVIDER_API_KEY` in HTML, JavaScript served to browsers, Git history, or public documentation.
- Do not create a client-side OpenAI request.
- Keep the existing same-origin guard and request-size/message limits.
- The assistant is grounded in the public Jawed.co.in knowledge index and should state when that context does not answer a question.
- No visitor conversation is persisted by the website.

## Local/deployment verification

Without `AI_PROVIDER_API_KEY`, `POST /api/ai` intentionally returns `503 AI_NOT_CONFIGURED` and relevant source links. This makes an unconfigured deployment fail closed rather than silently making an ungrounded model request.

Once the secret is configured, the endpoint can return:

```json
{
  "reply": "…",
  "sources": [],
  "model": "gpt-5.6-luna"
}
```

Provider errors are normalized so provider-specific error details are not exposed to visitors.
