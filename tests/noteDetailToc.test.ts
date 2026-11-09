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

test('AutomatedTableOfContents / TableOfContents parses Markdown and rendered DOM headings and provides sticky side navigation jumping', async () => {
  const fs = await import('node:fs');
  const path = await import('node:path');
  const {
    convertMarkdownHeadingsToHtml,
    parseRenderedHeadingsFromDom,
    jumpToHeadingSection,
    generateTableOfContents: genToc,
  } = await import('../src/components/TableOfContents');

  // 1. Verify Markdown headings (## and ###) are parsed into H2/H3 TOC items with unique anchor IDs
  const sampleMarkdownAndHtml = `
# Guide Title
## 1. Initial Triage & Scope
Some paragraph text.
### 1.1 Check Network Connectivity
<pre><code>## Inside code block ignored</code></pre>
## 2. Escalation Handoff
  `;

  const converted = convertMarkdownHeadingsToHtml(sampleMarkdownAndHtml);
  assert.ok(converted.includes('<h2>1. Initial Triage & Scope</h2>'));
  assert.ok(converted.includes('<h3>1.1 Check Network Connectivity</h3>'));
  assert.ok(converted.includes('<pre><code>## Inside code block ignored</code></pre>'));

  const tocResult = genToc(sampleMarkdownAndHtml);
  assert.equal(tocResult.shouldShowToc, true);
  assert.deepEqual(tocResult.tocItems, [
    { id: '1-initial-triage-scope', text: '1. Initial Triage & Scope', level: 2 },
    { id: '1-1-check-network-connectivity', text: '1.1 Check Network Connectivity', level: 3 },
    { id: '2-escalation-handoff', text: '2. Escalation Handoff', level: 2 },
  ]);

  // 2. Verify parseRenderedHeadingsFromDom inspects live H2/H3 DOM elements and assigns unique IDs
  const mockElements = [
    { tagName: 'H2', id: '', textContent: 'Verify DNS Resolution Copy Link to Heading' },
    { tagName: 'H3', id: '', textContent: 'Check Authoritative NS' },
    { tagName: 'H2', id: '', textContent: 'Verify DNS Resolution' },
  ];
  const domItems = parseRenderedHeadingsFromDom({
    querySelectorAll: () => mockElements,
  });
  assert.deepEqual(domItems, [
    { id: 'verify-dns-resolution', text: 'Verify DNS Resolution', level: 2 },
    { id: 'check-authoritative-ns', text: 'Check Authoritative NS', level: 3 },
    { id: 'verify-dns-resolution-2', text: 'Verify DNS Resolution', level: 2 },
  ]);

  // 3. Verify jumpToHeadingSection scrolls smoothly to the target section and updates URL hash
  let scrolledToId = '';
  let replacedHash = '';
  const didJump = jumpToHeadingSection(
    'verify-dns-resolution',
    {
      getElementById: (id: string) => ({
        scrollIntoView: () => {
          scrolledToId = id;
        },
      }),
    },
    {
      history: {
        replaceState: (_data: any, _unused: string, url?: string | null) => {
          replacedHash = url || '';
        },
      },
    }
  );
  assert.equal(didJump, true);
  assert.equal(scrolledToId, 'verify-dns-resolution');
  assert.equal(replacedHash, '#verify-dns-resolution');

  // 4. Verify TableOfContents.tsx and NoteDetailPage.tsx provide sticky side navigation
  const tocComponentSource = fs.readFileSync(
    path.resolve(process.cwd(), 'src/components/TableOfContents.tsx'),
    'utf8'
  );
  const noteDetailSource = fs.readFileSync(
    path.resolve(process.cwd(), 'src/pages/NoteDetailPage.tsx'),
    'utf8'
  );

  assert.ok(
    tocComponentSource.includes('note-toc-sidebar sticky top-24') &&
      tocComponentSource.includes("position: 'sticky'") &&
      tocComponentSource.includes('data-testid="note-toc-sidebar"'),
    'Expected TableOfContents.tsx to render a sticky side navigation sidebar'
  );
  assert.ok(
    noteDetailSource.includes('<TableOfContents') &&
      noteDetailSource.includes('mode="desktop"'),
    'Expected NoteDetailPage.tsx to mount <TableOfContents mode="desktop" /> for sticky side navigation'
  );

  // 5. Verify NoteDetailPage respects existing page grid layout (.note-detail-layout)
  const cssSource = fs.readFileSync(
    path.resolve(process.cwd(), 'src/index.css'),
    'utf8'
  );

  assert.ok(
    cssSource.includes('.note-detail-layout {') &&
      cssSource.includes('grid-template-columns: minmax(0, 1fr) 290px;') &&
      cssSource.includes('gap: 32px;') &&
      cssSource.includes('align-items: start;'),
    'Expected .note-detail-layout to define a 2-column grid layout with 290px sticky sidebar column'
  );
  assert.ok(
    cssSource.includes('.note-detail-layout.no-toc {') &&
      cssSource.includes('grid-template-columns: minmax(0, 1fr);'),
    'Expected .note-detail-layout.no-toc to collapse to a single column when TOC is omitted'
  );
  assert.ok(
    noteDetailSource.includes("className={shouldShowToc ? 'note-detail-layout' : 'note-detail-layout no-toc'}"),
    'Expected NoteDetailPage to wrap article and TOC in .note-detail-layout grid'
  );
});

test('TableOfContents parses Markdown code fences and inline syntax without false headings', async () => {
  const { convertMarkdownHeadingsToHtml, generateTableOfContents } = await import(
    '../src/components/TableOfContents'
  );

  const markdownContent = `
# Markdown Guide
## 1. Introduction to \`APIs\`
Some intro text.

\`\`\`bash
# This is a comment inside code block
## Not a real heading
curl -X GET https://api.example.com
\`\`\`

## 2. **Authentication** & Tokens
Token details.

### 2.1 Generating API \`Key\`
Steps to generate.
  `;

  const converted = convertMarkdownHeadingsToHtml(markdownContent);
  assert.ok(converted.includes('<h2>1. Introduction to `APIs`</h2>'));
  assert.ok(converted.includes('<h2>2. **Authentication** & Tokens</h2>'));
  assert.ok(converted.includes('<h3>2.1 Generating API `Key`</h3>'));
  assert.ok(
    !converted.includes('<h2>Not a real heading</h2>'),
    'Expected headings inside fenced code blocks to NOT be converted into H2 tags'
  );

  const toc = generateTableOfContents(markdownContent);
  assert.equal(toc.tocItems.length, 3);
  assert.deepEqual(toc.tocItems[0], {
    id: '1-introduction-to-apis',
    text: '1. Introduction to APIs',
    level: 2,
  });
  assert.deepEqual(toc.tocItems[1], {
    id: '2-authentication-tokens',
    text: '2. Authentication & Tokens',
    level: 2,
  });
  assert.deepEqual(toc.tocItems[2], {
    id: '2-1-generating-api-key',
    text: '2.1 Generating API Key',
    level: 3,
  });
});

test('calculateRemainingReadTime accurately computes total and remaining time across scroll progress', async () => {
  const {
    calculateRemainingReadTime,
    calculateWordCount,
    calculateReadTimeMinutes,
    calculateReadTime,
  } = await import('../src/utils/readTimeHelper');

  // 1000 words = ~5 minutes at 200 WPM
  const words = Array.from({ length: 1000 }, (_, i) => `word${i}`).join(' ');
  const counted = calculateWordCount(words);
  assert.equal(counted, 1000);

  const totalMins = calculateReadTimeMinutes(words);
  assert.equal(totalMins, 5);
  assert.equal(calculateReadTime(words), '5 min read');

  // At 0% scroll progress:
  const start = calculateRemainingReadTime(words, 0);
  assert.equal(start.totalMinutes, 5);
  assert.equal(start.remainingMinutes, 5);
  assert.equal(start.formattedTotal, '5 min read');
  assert.equal(start.formattedRemaining, '5 min left');
  assert.equal(start.percent, 0);
  assert.equal(start.wordCount, 1000);

  // At 40% scroll progress:
  const mid = calculateRemainingReadTime(words, 0.4);
  assert.equal(mid.totalMinutes, 5);
  assert.equal(mid.remainingMinutes, 3);
  assert.equal(mid.formattedRemaining, '3 min left');
  assert.equal(mid.percent, 40);

  // At 85% scroll progress:
  const late = calculateRemainingReadTime(words, 0.85);
  assert.equal(late.remainingMinutes, 1);
  assert.equal(late.formattedRemaining, '1 min left');
  assert.equal(late.percent, 85);

  // At 95%+ scroll progress:
  const completed = calculateRemainingReadTime(words, 0.96);
  assert.equal(completed.remainingMinutes, 0);
  assert.equal(completed.formattedRemaining, 'Completed');
  assert.equal(completed.percent, 96);
});

test('ReadTimeProgressIndicator and NoteDetailPage integrate scroll-triggered read time into layout', async () => {
  const fs = await import('node:fs');
  const path = await import('node:path');

  const indicatorSource = fs.readFileSync(
    path.resolve(process.cwd(), 'src/components/ReadTimeProgressIndicator.tsx'),
    'utf8'
  );
  const noteDetailSource = fs.readFileSync(
    path.resolve(process.cwd(), 'src/pages/NoteDetailPage.tsx'),
    'utf8'
  );
  const tocSource = fs.readFileSync(
    path.resolve(process.cwd(), 'src/components/TableOfContents.tsx'),
    'utf8'
  );

  // 1. Verify ReadTimeProgressIndicator provides required data-testids
  assert.ok(
    indicatorSource.includes('data-testid="read-time-indicator"'),
    'Expected read-time-indicator data-testid'
  );
  assert.ok(
    indicatorSource.includes('data-testid="estimated-read-time-badge"'),
    'Expected estimated-read-time-badge data-testid'
  );
  assert.ok(
    indicatorSource.includes('data-testid="read-time-progress-bar"'),
    'Expected read-time-progress-bar data-testid'
  );
  assert.ok(
    indicatorSource.includes('data-testid="read-time-remaining"'),
    'Expected read-time-remaining data-testid'
  );

  // 2. Verify all variants are supported (sidebar, inline, floating)
  assert.ok(indicatorSource.includes("variant === 'sidebar'"));
  assert.ok(indicatorSource.includes("variant === 'floating'"));
  assert.ok(indicatorSource.includes("variant === 'inline'") || indicatorSource.includes('variant-inline'));

  // 3. Verify TableOfContents renders ReadTimeProgressIndicator in sidebar
  assert.ok(
    tocSource.includes('<ReadTimeProgressIndicator') &&
      tocSource.includes('variant="sidebar"'),
    'Expected TableOfContents to render ReadTimeProgressIndicator with variant="sidebar"'
  );

  // 4. Verify NoteDetailPage renders inline and floating ReadTimeProgressIndicator
  assert.ok(
    noteDetailSource.includes('<ReadTimeProgressIndicator') &&
      noteDetailSource.includes('variant="inline"'),
    'Expected NoteDetailPage to render inline ReadTimeProgressIndicator'
  );
  assert.ok(
    noteDetailSource.includes('<ReadTimeProgressIndicator') &&
      noteDetailSource.includes('variant="floating"'),
    'Expected NoteDetailPage to render floating ReadTimeProgressIndicator for mobile'
  );
});




