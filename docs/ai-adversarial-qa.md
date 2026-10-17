# AI Adversarial Input QA

Phase 20E hardens the provider boundary against transcript poisoning and prompt-injection attempts.

## Untrusted-data boundary

Conversation text and retrieved metadata are explicitly delimited as untrusted data inside the provider instruction payload. The model is told never to execute instructions found inside those blocks.

This protects against:

- user messages that claim to be system/developer instructions
- prior assistant responses containing malicious instructions
- fake source metadata or injected source text
- attempts to make the model reveal provider credentials
- attempts to override grounding or source-link rules

## Existing structural defenses

The endpoint also enforces:

- alternating user/assistant conversation roles
- user-authored latest turn
- 12-message maximum
- 2,000-character per-message maximum
- 12,000-byte request maximum
- same-site origin policy
- IP-based rate limiting
- server-only provider credentials
- relative same-site source URL validation
- external markdown-link sanitization
- sourced-response attribution gate

## Regression coverage

`scripts/validate-ai-response.mjs` now includes adversarial transcript/source examples and verifies that the untrusted-data boundary remains explicit.

This is repository-side adversarial QA. It does not claim provider-backed live testing.
