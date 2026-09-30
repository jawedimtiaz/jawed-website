# Jawed AI Production Readiness

Jawed AI is implemented as a Cloudflare Pages Function at `/api/ai` with the public assistant UI at `/ai/`.

This document defines the configuration boundary required before the provider-backed assistant is considered production-ready.

## Required production secret

The Pages Function reads:

- `AI_PROVIDER_API_KEY` — required secret used server-side to call the OpenAI Responses API.
- `AI_PROVIDER_MODEL` — optional non-secret model override. If absent, the application uses its built-in default model.

The browser never receives the provider key.

## Cloudflare Pages production setup

In the Cloudflare dashboard:

1. Open **Workers & Pages** and select the Pages project serving `jawed.co.in`.
2. Open **Settings → Variables and Secrets**.
3. Add `AI_PROVIDER_API_KEY`.
4. Mark the value as **Encrypt** so it is stored as a secret.
5. Add `AI_PROVIDER_MODEL` only if a deliberate model override is required.
6. Configure the secret for the **Production** environment. Configure Preview separately if preview deployments should use the AI provider.
7. Redeploy the site after changing the production secret when required by the deployment configuration.

Cloudflare Pages Functions expose environment variables and secrets through the Function `env` object. Secrets are intended for sensitive values such as API keys.

## Local development

Do not commit provider credentials.

For local Pages Functions development, create a local `.dev.vars` file next to the project configuration and add values such as:

```dotenv
AI_PROVIDER_API_KEY="replace-with-your-local-key"
AI_PROVIDER_MODEL="gpt-5.6-luna"
```

Run the Pages application with Wrangler:

```bash
npx wrangler pages dev .
```

The actual local secret file is ignored by git. Never paste a real API key into a tracked file, issue, pull request, browser code, or client-side configuration.

## Readiness checks

The endpoint `GET /api/ai` exposes only non-secret readiness metadata:

- `status: "ready"` and `ok: true` when the provider key is configured.
- `status: "not_configured"` and `ok: false` when the key is absent.
- `configuration` reports only `configured` or `not_configured`; the secret value is never returned.
- `model` reports the active model name, not credentials.

A normal `POST /api/ai` request still returns `503 / AI_NOT_CONFIGURED` when the provider key is absent. This is the expected safe failure state.

## Production smoke test

After deployment:

1. Open `https://jawed.co.in/ai/`.
2. Ask a simple site-navigation question.
3. Confirm a normal assistant response is returned.
4. Confirm relevant Jawed.co.in source links are shown.
5. Confirm a follow-up question preserves the intended conversation context.
6. Confirm the browser does not expose the provider key.
7. Check Cloudflare Pages Function logs if the request fails.

Do not treat a successful HTTP health response alone as proof that an end-to-end provider request succeeded. A real provider-backed smoke test requires the production secret to be configured.

## Security boundary

- Provider credentials remain server-side.
- The provider request uses `store:false`.
- Existing origin validation, request-size limits, conversation limits, rate limiting, source sanitization, and grounding rules remain unchanged.
- The health endpoint must never return the API key or a secret-derived value.
