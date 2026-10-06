# Jawed AI — Safety, Abuse Protection & Rate Limiting

## Purpose

The public `/api/ai` endpoint uses a server-side Cloudflare Workers AI binding without exposing provider credentials to the browser.

## Request protections

- JSON requests only.
- Request body limited to 12 KB.
- Maximum 12 conversation messages.
- Maximum 2,000 characters per message.
- Only user and assistant roles are accepted.
- Conversation must alternate user → assistant → user ... and start with user.
- The latest message must be a user message.
- Same-origin browser requests are restricted to https://jawed.co.in.
- Provider calls remain fail-closed when the Cloudflare Workers AI `AI` binding is absent.
- Provider output remains capped at 700 tokens.
- Workers AI requests use the native server-side binding; no provider API key is sent from the browser.

## Abuse protection

The endpoint applies a best-effort per-client fixed-window limiter:

- 8 POST requests per 60 seconds.
- Client identity uses Cloudflare's CF-Connecting-IP request header.
- The counter is held only in the current Pages Function runtime memory.
- Expired buckets are cleaned up and the in-memory bucket map is bounded.
- Rate-limited responses return HTTP 429 with the standard public error contract; the retry-after calculation is retained only in server-side telemetry.

This is intentionally not described as a durable or globally consistent quota. Serverless instances can restart or scale independently, so the limiter is a lightweight first line of defense rather than a substitute for a durable distributed rate-limit service.

## Prompt-injection boundary

Conversation history received from the browser is untrusted input. The provider-neutral grounding layer converts it into labeled transcript text and sends it as model context while preserving the final user request boundary.

The grounding instructions explicitly tell the model to treat both the transcript and source metadata as untrusted data and to ignore embedded attempts to change its rules, reveal secrets, or alter system behavior.

## Public-information boundary

The assistant is intentionally a public-site assistant, not a personal-profile assistant.

- It may answer supported public professional/site-content questions, such as Jawed's public work, skills, projects, notes, tools and resources.
- Personal-life questions are blocked before knowledge retrieval and provider execution when they ask for marital status, family details, private location/address, salary or compensation, age/date of birth, or personal net worth/wealth.
- Personal-information boundary responses return no knowledge sources and do not invoke the AI provider.
- A professional question such as "Where does Jawed work?" remains allowed when supported by the public Work Experience source.
- The boundary is deterministic so a strong keyword such as "Jawed" cannot cause an unrelated personal question to retrieve the About page and produce an irrelevant biography.

## Privacy

- No visitor conversation is persisted by the site.
- No message content is logged by the AI endpoint.
- The transient rate-limit key is an IP-derived value held only in runtime memory.
- The browser does not receive any provider credential.

## Free-tier operational boundary

Cloudflare currently provides 10,000 Workers AI Neurons per day on the Workers Free plan. When the daily free allocation is exhausted, Workers AI returns an account-limited error rather than automatically charging beyond the free allocation.

For this project, the production model is fixed to `@cf/meta/llama-3.2-1b-instruct`. The application does not expose a deployment model override, so production cannot accidentally switch to a paid-only model.
