# Jawed AI Response Grounding & Link QA

The provider response is treated as untrusted generated text.

## Link invariant

When the provider returns markdown links, the server preserves only links whose exact URL is present in the retrieved Jawed.co.in source set. Unsupported absolute URLs are converted to their visible link text before the response reaches the browser.

This prevents generated markdown from becoming an unverified navigation channel while keeping the structured `sources` response as the canonical navigation mechanism.

## Grounding boundary

- Retrieved Jawed.co.in source metadata remains the provider's grounding context, but it is not a copy of the page.
- The summary is the only high-level evidence field; title and keywords are discovery metadata and must not be treated as proof of detailed facts.
- A source can be relevant enough to retrieve while still being insufficient evidence for a detailed claim. In that case the provider should state the evidence limitation and point to the exact source page.
- Source order is relevance-ranked; higher-ranked sources are preferred when multiple supplied sources are relevant.
- An unmatched standalone query does not inherit sources solely from older conversation context. Context may fill the source set only for a clearly vague follow-up such as "explain more" or "tell me more."
- The provider is instructed not to invent site facts or URLs or infer page details from title/keyword matches alone.
- Supported Jawed.co.in factual claims should carry an immediate markdown link to the exact supporting retrieved source, improving claim-to-source traceability.
- Server-side link validation is defense in depth for generated output.
- When retrieved sources are supplied, the server requires the generated response to contain at least one exact allowed Jawed.co.in source link; a response with no valid source attribution is rejected.
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

This validates that an allowed retrieved Jawed.co.in URL is preserved while an unsupported external markdown URL is removed, that source metadata is not treated as full-page evidence, and that supported site claims have an explicit source-link contract plus a server-side attribution-presence gate.

## Knowledge evidence density

The AI knowledge index uses concise scope-level summaries as retrieval evidence. These summaries are intentionally not full-page copies and must not be used to infer detailed claims that are absent from the indexed evidence.

Each grounding entry must keep a non-empty title, summary, and keyword set, and summaries must be at least 70 characters so the provider receives useful high-level context rather than title-like fragments. The coverage validator also checks URL uniqueness and sitemap coverage.

Run:

```bash
node scripts/validate-ai-knowledge.mjs
```

## Retrieval precision QA

The retrieval index is scored with stronger weight for title matches, followed by keywords, summary terms, and URL terms. Richer scope-level summaries must not displace strong topic matches with generic cross-topic pages.

The regression suite covers retirement, Indian income tax, Jamf/device management, AI tools, unmatched queries, and vague follow-up context behavior.

Run:

```bash
node scripts/validate-ai-retrieval.mjs
```
