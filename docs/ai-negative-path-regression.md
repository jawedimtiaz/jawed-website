# AI Negative-Path Regression

Phase 20H verifies deterministic failure behavior without requiring a live Cloudflare or AI-provider environment.

## Covered endpoint failures

The regression contract checks explicit handling for:

- disallowed origin
- unsupported content type
- oversized request body
- invalid JSON
- invalid conversation shape
- invalid message content/length
- assistant-last conversations
- retrieval failure
- missing provider configuration
- provider failure
- provider rate limiting

It also verifies that generic failures return only the documented error code/message/request correlation contract.

## Rate limiting

The test exercises the real rate-limit module and verifies:

- exactly 8 requests are allowed in the configured window
- the next request is rejected
- retry timing is positive when rejected
- the next window resets the allowance
- the anonymous fallback remains rate-limitable

## Scope

This is deterministic repository-side negative-path QA. It does not claim live deployment behavior or provider-backed failure simulation.
