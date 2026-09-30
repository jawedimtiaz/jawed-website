# AI Response Contract & Adversarial Output QA

Phase 20F adds a final application-side validation boundary for provider output.

## Output contract

Before a provider response is returned to the browser, the server requires:

- a string response
- non-empty trimmed content
- no more than 6,000 characters
- no unsupported ASCII control characters
- existing exact Jawed.co.in source-link attribution when sources are supplied
- unsupported HTTP(S) markdown links sanitized to visible text

The provider remains separately capped at 700 output tokens.

## Browser safety

The browser continues to render assistant output with `textContent`, not HTML. Structured source links remain the separate navigation contract.

## Adversarial coverage

The response validator tests:

- empty provider output
- oversized output
- embedded control characters
- normal multiline/tabbed text
- allowed source links
- unsupported external markdown links
- missing source attribution
- prompt-injection content in transcript/source metadata

This is repository-side QA and does not claim provider-backed live E2E testing.
