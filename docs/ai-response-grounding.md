# Jawed AI Response Grounding & Link QA

The provider response is treated as untrusted generated text.

## Link invariant

When the provider returns markdown links, the server preserves only links whose exact URL is present in the retrieved Jawed.co.in source set. Unsupported absolute URLs are converted to their visible link text before the response reaches the browser.

This prevents generated markdown from becoming an unverified navigation channel while keeping the structured `sources` response as the canonical navigation mechanism.

## Grounding boundary

- Retrieved Jawed.co.in source metadata remains the provider's grounding context.
- The provider is instructed not to invent site facts or URLs.
- Server-side link validation is defense in depth for generated output.
- No external URL is added to the structured `sources` array.
- The browser continues to render AI reply text as text, not HTML.
- No provider storage or browser persistence is introduced.

## Factual grounding boundary

Conversation history may be used to resolve references and understand follow-up intent, but prior user or assistant claims are never evidence for Jawed.co.in facts. If the retrieved source context does not support a factual site claim, the response must not present that claim as a site fact.

## Validation

Run:

```bash
node scripts/validate-ai-response.mjs
```

This validates that an allowed retrieved Jawed.co.in URL is preserved while an unsupported external markdown URL is removed.
