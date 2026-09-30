# Jawed AI Conversation Context & Follow-up Grounding

## Retrieval behavior

The `POST /api/ai` endpoint uses the latest user message as the primary retrieval signal and adds up to the two most recent prior user messages as context.

The current user message is passed separately as the primary retrieval signal. Its tokens receive a stronger capped weight than tokens from prior user turns, so follow-up context can inform retrieval without displacing the current request. Assistant responses are deliberately excluded from retrieval-query construction because they are model-generated and are already treated as untrusted transcript data by the provider layer.

The retrieval query is capped at 6,000 characters before it reaches the knowledge scorer.

## Why this matters

Follow-up questions such as "what about that?", "can you explain more?", or "how about the second option?" often contain too little standalone vocabulary for the knowledge index. Recent user turns provide the missing subject while keeping retrieval anchored to what the visitor actually asked.

This improves source selection without changing the public API response contract, browser history limits, provider privacy settings, or source-link security invariant. When at least three relevant sources match the current request, older context does not fill the remaining source slots; context is used to fill the set only when the current request has fewer than three strong matches.

## Boundaries

- Current user request remains the primary retrieval signal and is evaluated as a separate source set.
- When three or more current-request sources are available, prior-user context cannot displace them or dilute the returned source set.
- Prior user context can fill remaining source slots only when fewer than three current-request sources are available.
- Only the two most recent prior user messages contribute retrieval context.
- Assistant-generated text is never added to the retrieval query.
- The existing 12-message conversation limit remains unchanged.
- The existing 2,000-character per-message validation remains unchanged.
- Retrieval metadata remains server-side.
