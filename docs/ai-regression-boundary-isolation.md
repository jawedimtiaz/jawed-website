# AI Regression Boundary & Mock Isolation QA

Phase 20K ensures deterministic API handler regression tests cannot accidentally become provider-backed tests.

## Isolation contract

The API handler validator installs a local fetch tripwire that:

- counts attempted outbound provider calls
- throws immediately if any call occurs
- asserts the final call count is zero

POST tests intentionally use an environment without a provider credential. GET configuration checks only exercise configuration reporting and do not invoke the provider.

Rate-limit tests use unique client keys so their state cannot collide with unrelated deterministic tests.

The regression matrix continues to run each validator in a separate Node process with a bounded timeout.

No live provider E2E is claimed by this validator.
