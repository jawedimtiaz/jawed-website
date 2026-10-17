# AI Regression Final Boundary Audit

Phase 20N found one remaining integration boundary: the API handler had deterministic coverage for validation, unconfigured behavior, and provider behavior was covered separately, but the configured handler-to-provider success and provider-error translation paths were not directly exercised together.

The API handler regression now mocks the provider and verifies:

- configured POST reaches the provider adapter
- successful reply, model, sources, and request ID are returned through the API contract
- provider-generated source links survive the handler boundary
- provider HTTP 429 is translated to the public `AI_PROVIDER_ERROR` contract
- generic provider failures remain free of provider details and retrieval metadata

The mock is restored to the deterministic provider tripwire after these cases. No live provider E2E claim is introduced.
