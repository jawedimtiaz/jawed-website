# AI Regression Contract Inventory QA

Phase 20M identified the provider adapter as the remaining meaningful coverage gap.

The regression matrix now directly exercises the provider adapter with a mocked fetch implementation. It verifies:

- Responses API endpoint and POST method
- server-side authorization header construction
- configured model fallback
- store:false
- output-token limit
- grounded instruction blocks
- successful provider response extraction
- provider HTTP status propagation

The provider test restores the original fetch after execution and never contacts the external provider.

The broader AI contract inventory remains covered by focused validators and the consolidated matrix. Live provider E2E remains intentionally outside this deterministic regression suite.
