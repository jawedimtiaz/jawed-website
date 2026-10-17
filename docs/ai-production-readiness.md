# Jawed AI Production Readiness

Jawed AI is implemented as a Cloudflare Pages Function at `/api/ai` with the public assistant UI at `/ai/`.

This phase removes the production dependency on the OpenAI API and uses the native Cloudflare Workers AI binding instead.

## Required production binding

The Pages Function reads:

- `AI` — required Workers AI binding.
- The application uses the fixed free-tier model `@cf/meta/llama-3.2-1b-instruct`; there is no deployment model override.

No `AI_PROVIDER_API_KEY` is required for production.

## Cloudflare Pages production setup

In the Cloudflare dashboard:

1. Open **Workers & Pages** and select the Pages project serving `jawed.co.in`.
2. Open **Settings → Bindings** for the production environment.
3. Choose **Add → Workers AI**.
4. Set the variable name to **AI**.
5. Save the binding.
6. Redeploy the production site.

Cloudflare documents this Pages Functions binding flow and exposes the binding as `context.env.AI`.

Do not add `AI_PROVIDER_API_KEY` for this zero-cost architecture.

## Free usage boundary

Cloudflare currently includes 10,000 Workers AI Neurons per day at no charge on Workers Free. When that allocation is exhausted, Workers AI returns a 429 account-limited error; the application reports a safe retry-later message rather than instructing the user to add provider credits.

The selected default model, `@cf/meta/llama-3.2-1b-instruct`, is documented as a Cloudflare-hosted text-generation model and is suitable for the current focused assistant workload.

## Readiness checks

The endpoint `GET /api/ai` exposes only non-secret readiness metadata:

- `status: "ready"` and `ok: true` when the Workers AI binding is available.
- `status: "not_configured"` and `ok: false` when the binding is absent.
- `configuration` reports only `configured` or `not_configured`.
- `model` reports the active model name.

A normal `POST /api/ai` request returns `503 / AI_NOT_CONFIGURED` when the binding is absent. This is the expected safe failure state.

## Production smoke test

After the Workers AI binding is added and the site is redeployed:

1. Open `https://jawed.co.in/ai/`.
2. Ask a simple site-navigation question.
3. Confirm a normal assistant response is returned.
4. Confirm relevant Jawed.co.in source links are shown.
5. Confirm a follow-up question preserves the intended conversation context.
6. Confirm no provider API key is exposed to the browser.
7. Check Cloudflare Pages Function logs if the request fails.

A successful health response alone does not prove end-to-end inference. The final production verification requires a real POST request after the `AI` binding is active.

## Security boundary

- Provider access remains server-side.
- Existing origin validation, request-size limits, conversation limits, rate limiting, source sanitization, and grounding rules remain unchanged.
- The health endpoint must never return provider credentials or secret-derived values.
