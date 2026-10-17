# Jawed AI Agent Foundation

## Purpose

Jawed AI is planned as a focused assistant for discovering and navigating the knowledge, notes, and interactive tools published on jawed.co.in.

## v1 boundaries

- The website remains the source of truth for site knowledge.
- The browser must never contain an AI provider API key.
- AI requests will use a server-side endpoint under the site's deployment environment.
- Visitor conversations are not persisted by the initial implementation.
- The agent should prefer linking to relevant first-party Jawed.co.in content and tools.
- Financial, career, and technical guidance must remain educational and avoid unsupported claims or recommendations.
- The first release should be intentionally narrow; autonomous actions and account access are out of scope.

## Planned request flow

Visitor → Jawed AI UI → /api/ai server endpoint → AI model → selected Jawed.co.in context → response with relevant site links.

## Implementation sequence

1. Agent architecture and boundaries (this phase)
2. Chat UI
3. Secure server-side endpoint
4. Knowledge retrieval from Notes/Tools
5. Site-link and tool discovery
6. Privacy, rate limiting, and abuse controls
7. Accessibility, mobile UX, and SEO integration
8. End-to-end agent QA

## Security constraint

Do not add provider secrets, API keys, or private credentials to static HTML, CSS, JavaScript, sitemap files, or other client-delivered assets. Secrets belong only in the server-side deployment environment.