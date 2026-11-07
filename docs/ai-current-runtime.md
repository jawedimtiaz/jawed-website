# Jawed AI — Current Production Runtime

**Status: authoritative for the current production website.**

This document describes the implementation represented by the current `main` branch and the production deployment contract. It supersedes older documents that describe a server-side `/api/ai` endpoint.

## Current implementation

The production website uses a browser-side, knowledge-grounded assistant:

- React route: `/ai/`
- Main implementation: `src/services/aiKnowledgeEngine.ts`
- Knowledge dataset: `src/data/aiKnowledge.json`
- UI: `src/pages/AiPage.tsx` and `src/components/JawedAiWidget.tsx`
- The engine searches bundled site knowledge and returns matching entries and source links.
- Personal-information guardrails are implemented in the knowledge engine.
- This implementation does not call Gemini, OpenAI, or a server-side `/api/ai` endpoint.

## Production hosting boundary

The site is built with Vite and deployed to Cloudflare Pages:

- Build command: `npm run build`
- Output directory: `dist`
- The current production deployment reports `uses_functions: false`.
- Do not assume that a source file, historical test, Cloudflare binding, or stored environment variable is active in the production request path.

## Google and Cloudflare credentials

The current browser-side knowledge assistant does not require a Gemini API key or `AI_PROVIDER_API_KEY`.

The existence of a Cloudflare Workers AI binding named `AI`, a stored secret, or a Google Cloud API key does not by itself prove that the current website consumes it. Do not delete, rotate, restrict, or otherwise change credentials or bindings based only on this document. Verify consumers and obtain explicit approval before infrastructure changes.

Firebase configuration used by another feature (for example, Money Manager Google Drive sync) must be assessed separately. A Firebase browser API key is not interchangeable with a Gemini API key.

## Authoritative regression checks

The current AI regression workflow is `.github/workflows/ai-regression.yml`. It runs:

1. `node scripts/validate-site-integrity.mjs`
2. `node scripts/validate-ai-regression.mjs`

The AI regression validator checks the current React/Vite implementation, bundled knowledge data, privacy guardrails, widget behavior, and source links.

The production smoke contract in `config/production-smoke-contract.json` checks the public `/ai/` page as an HTML route. It does not require a server-side AI endpoint.

## Historical server-side AI material

Some older documents and validators describe a Cloudflare Pages Function at `/api/ai` using the Workers AI binding. Treat those documents as historical design and test material, not as proof of the current production architecture. Do not use them to make production configuration changes without first confirming that the implementation has been reintroduced and deployed.

## Verification boundary

Repository checks establish source-level contracts. They do not prove that every browser interaction works on every device, nor do they prove external provider usage. Browser QA must be recorded separately, and no test should be described as passed without recorded evidence.
