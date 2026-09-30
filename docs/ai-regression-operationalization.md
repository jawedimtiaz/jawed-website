# AI Regression Operationalization

The consolidated AI regression matrix is the release gate for the site's AI surface.

## Local execution

Run:

```bash
node scripts/validate-ai-regression.mjs
```

The matrix executes every registered deterministic validator and then checks the cross-layer contract inventory. Each validator has a bounded 15-second execution timeout and failure diagnostics are bounded and redacted.

## CI execution

GitHub Actions runs the same matrix on pull requests and pushes to `main` when AI-relevant files change.

The workflow uses only repository code and deterministic mocks. It does not require or expose an AI provider API key, and it does not claim live provider E2E coverage.

## Gate behavior

A missing validator, failed assertion, missing completion signal, timeout, execution error, or failed cross-layer contract causes the workflow to fail.

The workflow has read-only repository permissions and a five-minute job timeout.
