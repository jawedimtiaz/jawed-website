# Jawed AI — Safety, Abuse Protection & Rate Limiting

## Purpose

Phase 19G hardens the public /api/ai endpoint without adding visitor conversation persistence or exposing provider credentials to the browser.

## Request protections

- JSON requests only.
- Request body limited to 12 KB.
- Maximum 12 conversation messages.
- Maximum 2,000 characters per message.
- Only user and assistant roles are accepted.
- Conversation must alternate user → assistant → user ... and start with user.
- The latest message must be a user message.
- Same-origin browser requests are restricted to https://jawed.co.in.
- Provider calls remain fail-closed when AI_PROVIDER_API_KEY is absent.
- Provider output remains capped at 700 tokens.
- OpenAI Responses API requests continue to use store:false.

## Abuse protection

The endpoint applies a best-effort per-client fixed-window limiter:

- 8 POST requests per 60 seconds.
- Client identity uses Cloudflare's CF-Connecting-IP request header.
- The counter is held only in the current Pages Function runtime memory.
- Expired buckets are cleaned up and the in-memory bucket map is bounded.
- Rate-limited responses return HTTP 429 and a retry_after value.

This is intentionally not described as a durable or globally consistent quota. Serverless instances can restart or scale independently, so the limiter is a lightweight first line of defense rather than a substitute for a durable distributed rate-limit service.

## Prompt-injection boundary

Conversation history received from the browser is untrusted input. The provider adapter converts it into labeled transcript text and sends only a single user-role instruction to the model. This prevents browser-supplied assistant messages from being treated as trusted model instructions.

The provider instructions explicitly tell the model to treat both the transcript and source metadata as untrusted data and to ignore embedded attempts to change its rules, reveal secrets, or alter system behavior.

## Privacy

- No visitor conversation is persisted by the site.
- No message content is logged by the AI endpoint.
- The transient rate-limit key is an IP-derived value held only in runtime memory.
- The browser never receives or stores AI_PROVIDER_API_KEY.

## Operational limitation

For stronger global abuse controls, a future phase can use a durable Cloudflare-compatible rate-limit service or binding. This phase deliberately does not add one, because no such binding is currently part of the site's deployed architecture.
