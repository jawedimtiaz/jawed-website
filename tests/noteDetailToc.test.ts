import test from 'node:test';
import assert from 'node:assert/strict';
import notesData from '../src/data/notesData.json';
import {
  generateTableOfContents,
  injectHeadingCopyButtons,
  slugifyHeading,
  decodeHtmlEntities,
  buildTocAnchorUrl,
  copyTocAnchorToClipboard,
} from '../src/pages/NoteDetailPage';

test('generateTableOfContents extracts H2 and H3 tags in order and ignores H1/H4', () => {
  const sampleHtml = `
    <h1>Guide Main Title</h1>
    <p class="lead">Overview paragraph.</p>
    <section class="content-section">
      <h2>1. Understand the Symptom</h2>
      <p>Details about symptoms.</p>
      <h3>Checking Client Logs &amp; Events</h3>
      <p>Sub-step details.</p>
      <h4>Minor note ignored</h4>
    </section>
    <section class="content-section">
      <h2 id="custom-validation-id">2. Validate the Fix</h2>
      <h3>Verify with <code>ping</code> &amp; DNS</h3>
    </section>
  `;

  const result = generateTableOfContents(sampleHtml);

  assert.equal(result.shouldShowToc, true);
  assert.equal(result.tocItems.length, 4);

  assert.deepEqual(result.tocItems[0], {
    id: '1-understand-the-symptom',
    text: '1. Understand the Symptom',
    level: 2,
  });

  assert.deepEqual(result.tocItems[1], {
    id: 'checking-client-logs-events',
    text: 'Checking Client Logs & Events',
    level: 3,
  });

  assert.deepEqual(result.tocItems[2], {
    id: 'custom-validation-id',
    text: '2. Validate the Fix',
    level: 2,
  });

  assert.deepEqual(result.tocItems[3], {
    id: 'verify-with-ping-dns',
    text: 'Verify with ping & DNS',
    level: 3,
  });

  // Verify IDs are injected into the output HTML
  assert.ok(result.htmlWithIds.includes('<h2 id="1-understand-the-symptom">1. Understand the Symptom</h2>'));
  assert.ok(result.htmlWithIds.includes('<h3 id="checking-client-logs-events">Checking Client Logs &amp; Events</h3>'));
  assert.ok(result.htmlWithIds.includes('<h2 id="custom-validation-id">2. Validate the Fix</h2>'));
  assert.ok(result.htmlWithIds.includes('<h3 id="verify-with-ping-dns">Verify with <code>ping</code> &amp; DNS</h3>'));
});

test('generateTableOfContents deduplicates identical heading texts and duplicate IDs', () => {
  const sampleHtml = `
    <h2>Troubleshooting Steps</h2>
    <h3>Common Checks</h3>
    <h2>Troubleshooting Steps</h2>
    <h3>Common Checks</h3>
  `;

  const result = generateTableOfContents(sampleHtml);

  assert.equal(result.tocItems.length, 4);
  assert.equal(result.tocItems[0].id, 'troubleshooting-steps');
  assert.equal(result.tocItems[1].id, 'common-checks');
  assert.equal(result.tocItems[2].id, 'troubleshooting-steps-2');
  assert.equal(result.tocItems[3].id, 'common-checks-2');
});

test('generateTableOfContents respects minHeadings threshold for short vs longer guides', () => {
  const singleHeadingHtml = '<h2>Only One Section</h2><p>Short note content.</p>';
  const shortResult = generateTableOfContents(singleHeadingHtml);
  assert.equal(shortResult.tocItems.length, 1);
  assert.equal(shortResult.shouldShowToc, false);

  const customThresholdResult = generateTableOfContents(singleHeadingHtml, { minHeadings: 1 });
  assert.equal(customThresholdResult.shouldShowToc, true);
});

test('slugifyHeading and decodeHtmlEntities clean markup and entities accurately', () => {
  assert.equal(decodeHtmlEntities('Apple &amp; Jamf: <code>sysadminctl</code> &quot;Check&quot;'), 'Apple & Jamf: sysadminctl "Check"');
  assert.equal(slugifyHeading('1. What is an API? (Request & Response)'), '1-what-is-an-api-request-response');
  assert.equal(slugifyHeading('   '), 'section');
});

test('all published notes in notesData.json generate valid TOCs with unique anchor IDs', () => {
  assert.ok(notesData.length >= 25);

  for (const note of notesData) {
    const result = generateTableOfContents(note.content);
    assert.equal(
      result.shouldShowToc,
      true,
      `Expected note "${note.slug}" to display a Table of Contents`
    );
    assert.ok(
      result.tocItems.length >= 3,
      `Expected note "${note.slug}" to have at least 3 extracted H2/H3 headings, got ${result.tocItems.length}`
    );

    const ids = new Set<string>();
    for (const item of result.tocItems) {
      assert.ok(item.id.length > 0, `Empty TOC id in note ${note.slug}`);
      assert.ok(item.text.length > 0, `Empty TOC text in note ${note.slug}`);
      assert.ok(item.level === 2 || item.level === 3, `Invalid level ${item.level} in note ${note.slug}`);
      assert.equal(ids.has(item.id), false, `Duplicate TOC id "${item.id}" in note ${note.slug}`);
      ids.add(item.id);

      assert.ok(
        result.htmlWithIds.includes(`id="${item.id}"`),
        `Expected rendered HTML for "${note.slug}" to include id="${item.id}"`
      );
    }
  }
});

test('buildTocAnchorUrl constructs clean shareable anchor URLs and replaces prior hash fragments', () => {
  assert.equal(
    buildTocAnchorUrl('https://jawed.co.in/notes/apis-explained-for-it-support', 'what-is-an-api'),
    'https://jawed.co.in/notes/apis-explained-for-it-support#what-is-an-api'
  );
  assert.equal(
    buildTocAnchorUrl('https://jawed.co.in/notes/apis-explained-for-it-support#old-section', '#status-codes'),
    'https://jawed.co.in/notes/apis-explained-for-it-support#status-codes'
  );
  assert.equal(
    buildTocAnchorUrl('https://jawed.co.in/notes/apis-explained-for-it-support#old-section', ''),
    'https://jawed.co.in/notes/apis-explained-for-it-support'
  );
});

test('copyTocAnchorToClipboard writes the anchor URL using Clipboard API and handles errors gracefully', async () => {
  let copiedValue = '';
  const mockClipboard = {
    async writeText(text: string) {
      copiedValue = text;
    },
  };

  const targetUrl = 'https://jawed.co.in/notes/ai-for-it-support-practical-workflow#a-five-step-workflow';
  const ok = await copyTocAnchorToClipboard(targetUrl, mockClipboard);

  assert.equal(ok, true);
  assert.equal(copiedValue, targetUrl);

  const emptyResult = await copyTocAnchorToClipboard('', mockClipboard);
  assert.equal(emptyResult, false);
});

test('injectHeadingCopyButtons adds a Copy Link to Heading button for every h2 and h3 and ignores h1/h4', () => {
  const sampleHtml = `
    <h1>Main Title</h1>
    <h2>1. First Section</h2>
    <p>Paragraph text</p>
    <h3>1.1 Sub Section</h3>
    <h4>Minor Heading</h4>
  `;

  const enhancedHtml = injectHeadingCopyButtons(sampleHtml);

  assert.ok(
    enhancedHtml.includes('data-copy-heading-id="1-first-section"'),
    'Expected Copy Link to Heading button injected into h2'
  );
  assert.ok(
    enhancedHtml.includes('data-copy-heading-id="1-1-sub-section"'),
    'Expected Copy Link to Heading button injected into h3'
  );
  assert.ok(
    enhancedHtml.includes('title="Copy Link to Heading"'),
    'Expected Copy Link to Heading title attribute'
  );
  assert.ok(
    !enhancedHtml.includes('data-copy-heading-id="main-title"') &&
      !enhancedHtml.includes('data-copy-heading-id="minor-heading"'),
    'Expected h1 and h4 to remain untouched without heading copy buttons'
  );

  // Verify copied feedback state
  const copiedHtml = injectHeadingCopyButtons(sampleHtml, '1-first-section');
  assert.ok(
    copiedHtml.includes('class="note-heading-copy-btn is-copied" data-copy-heading-id="1-first-section"'),
    'Expected is-copied state when copiedHeadingId matches h2 id'
  );
});


