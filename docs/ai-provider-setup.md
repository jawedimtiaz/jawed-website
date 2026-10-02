# Jawed AI provider setup

## Cloudflare Pages Functions

Jawed AI uses a server-side **Cloudflare Workers AI** binding. The browser never receives provider credentials, and the production endpoint does not depend on an OpenAI API key.

Configure a Workers AI binding for the production Pages environment:

- Binding variable name: `AI`
- Binding type: **Workers AI**

Cloudflare's Pages Functions documentation supports configuring the binding from **Workers & Pages → Pages project → Settings → Bindings → Add → Workers AI**. Redeploy after adding or changing the binding. The Function accesses it as `env.AI`. citeturn0search1

The endpoint is:

- `POST /api/ai`

The default production model is:

- `@cf/meta/llama-3.2-1b-instruct`

The model is intentionally selected because it is available on Workers Free and has relatively low Neuron consumption. Cloudflare currently provides 10,000 Workers AI Neurons per day at no charge on the Workers Free plan. If the daily free allocation is exhausted, further inference fails rather than silently creating paid usage. citeturn1search0turn1search2turn1search3

An optional `AI_PROVIDER_MODEL` variable may override the default, but only a model documented as available on the Workers Free plan should be used for the user's $0 requirement.

## Security boundaries

- Do not add an OpenAI API key for this production path.
- Do not create a client-side AI request.
- Keep the existing same-origin guard and request-size/message limits.
- The assistant is grounded in the public Jawed.co.in knowledge index and should state when that context does not answer a question.
- No visitor conversation is persisted by the website.
- The provider-neutral grounding layer treats conversation text and source metadata as untrusted data.
- Only allowlisted Jawed.co.in source URLs can survive response-link sanitization.

## Local/deployment verification

Repository regression tests mock `env.AI.run()`; they do not invoke remote Workers AI.

Cloudflare notes that Workers AI local development accesses the account and incurs AI usage, so do not run a real local inference test merely to satisfy deterministic CI. citeturn0search0turn0search1

Without the `AI` binding, `POST /api/ai` intentionally returns `503 AI_NOT_CONFIGURED` and relevant source links. This makes an unconfigured deployment fail closed.

When configured, a successful response has the shape:

```json
{
  "reply": "…",
  "sources": [],
  "model": "@cf/meta/llama-3.2-1b-instruct"
}
```

Workers AI errors are normalized so provider-specific error details are not exposed to visitors.
