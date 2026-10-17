# AI Regression Test Evidence & Failure Diagnostics QA

Phase 20L hardens failure reporting for the consolidated regression matrix.

## Failure classification

Validator failures are classified as:

- TIMEOUT — the child validator exceeded the matrix timeout
- EXECUTION_ERROR — the validator process could not be started
- VALIDATOR_FAILURE — assertion, completion-signal, or other validator failure

## Diagnostic safety

Captured child-process output is:

- bounded to 4,000 characters
- redacted for credential-like fields such as API keys, authorization, bearer tokens, passwords, secrets, and tokens
- stripped of raw HTTP URLs
- stripped of explicitly marked untrusted transcript/source blocks

The matrix reports the validator name and failure class while retaining concise actionable evidence.

This diagnostic layer does not change application behavior and does not claim provider-backed live E2E.
