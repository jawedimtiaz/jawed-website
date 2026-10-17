# Jawed AI Knowledge Coverage & Freshness

The Jawed AI knowledge index is intentionally narrower than the public sitemap.

## Coverage boundary

Included:
- public pages that contain factual Jawed.co.in content
- notes, tools, work/about content, topic/index pages, blog content, and resources

Excluded:
- `/ai/` is intentionally indexed as the AI self-description source; it is not excluded from grounding
- `/contact/` — contact/transaction page
- `/privacy/` — privacy/legal page

The index records `reviewed_against_sitemap_on` so the last coverage review is explicit.

## Validation

From the repository root:

```bash
node scripts/validate-ai-knowledge.mjs
```

The validator checks:
- duplicate sitemap URLs
- duplicate knowledge URLs
- missing intended sitemap content pages
- knowledge URLs that are not in the sitemap
- excluded pages accidentally entering the index
- malformed knowledge entries
- grounding source-file freshness since the recorded review date
- failure to verify git history is treated as a validation error rather than silently passing

This validates **coverage, index integrity, and freshness of the recorded grounding review**. It does not claim that summaries remain textually identical to page content; when a page's substance changes, its AI summary/keywords should be reviewed as part of the content update.

## Maintenance rule

When adding or materially changing a public content page:
1. Add/update the sitemap entry.
2. Add/update the corresponding AI knowledge entry if the page belongs to the grounding boundary.
3. Update `reviewed_against_sitemap_on` during the next coverage review.
4. Run the validator before merging.
