# Phase 37C — Ad Placement & Layout Stability Architecture

Status: **pre-activation architecture**

This phase defines the layout contract for future advertising without activating AdSense.

## Rules

1. Advertising must occupy a reserved layout region; it must not be injected into flowing content after the page has rendered.
2. A future ad container must have a predictable minimum/allocated height appropriate to its placement and responsive breakpoint.
3. No ad placement may displace the primary heading, navigation, article text, forms, or interactive controls after initial layout.
4. Ad containers must remain visually and semantically subordinate to the page's primary content.
5. No global ad slot is added to excluded surfaces: `/privacy/`, `/contact/`, `/ai/`, or `/tools/`.
6. No AdSense script, `adsbygoogle`, `ads.txt`, or advertising CSP domain is introduced by this phase.
7. Actual dimensions must be based on the final approved ad format rather than guessed values.

## Activation dependency

When AdSense becomes **Ready**, the final activation phase must select concrete placements and dimensions from the approved inventory, then validate mobile and desktop CLS with the actual rendered ad behavior.

## Current state

The repository contains no active ad slots. Therefore this phase establishes a contract rather than adding empty placeholders that would change today's page layout.
