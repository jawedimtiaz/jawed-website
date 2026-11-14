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

test('NoteDetailPage implements hover copy buttons for all H2 and H3 elements and shows a "Link copied!" toast notification', async () => {
  const fs = await import('node:fs');
  const path = await import('node:path');
  const { injectHeadingCopyButtons } = await import('../src/pages/NoteDetailPage');

  // 1. Verify injectHeadingCopyButtons injects interactive copy buttons into H2 and H3
  const sampleNoteHtml = `
    <h2>1. Network Diagnostic Workflow</h2>
    <p>Details about initial ping and trace route tests.</p>
    <h3>Step 1.1: Verify ARP Table &amp; Gateway</h3>
    <p>Sub-step description.</p>
    <h2>2. Firewall &amp; Security Group Verification</h2>
  `;

  const injected = injectHeadingCopyButtons(sampleNoteHtml);

  assert.ok(
    injected.includes('data-copy-heading-id="1-network-diagnostic-workflow"'),
    'Expected copy button for first H2 heading'
  );
  assert.ok(
    injected.includes('data-copy-heading-id="step-1-1-verify-arp-table-gateway"'),
    'Expected copy button for H3 heading'
  );
  assert.ok(
    injected.includes('data-copy-heading-id="2-firewall-security-group-verification"'),
    'Expected copy button for second H2 heading'
  );
  assert.ok(
    injected.includes('class="note-heading-copy-btn"'),
    'Expected note-heading-copy-btn class on injected buttons'
  );

  // 2. Verify CSS rules enforce hover appearance (opacity: 0 by default, opacity: 1 on h2:hover / h3:hover)
  const cssSource = fs.readFileSync(path.resolve(process.cwd(), 'src/index.css'), 'utf8');

  assert.ok(
    cssSource.includes('.note-heading-copy-btn {') &&
      cssSource.includes('opacity: 0;') &&
      cssSource.includes('pointer-events: none;'),
    'Expected .note-heading-copy-btn to be hidden by default (opacity: 0)'
  );
  assert.ok(
    cssSource.includes('.note-rendered-content h2:hover .note-heading-copy-btn') &&
      cssSource.includes('.note-rendered-content h3:hover .note-heading-copy-btn') &&
      cssSource.includes('opacity: 1;') &&
      cssSource.includes('pointer-events: auto;'),
    'Expected .note-heading-copy-btn to appear on h2 and h3 hover with opacity: 1'
  );

  // 3. Verify NoteDetailPage contains the "Link copied!" toast notification and triggers it on click
  const noteDetailSource = fs.readFileSync(
    path.resolve(process.cwd(), 'src/pages/NoteDetailPage.tsx'),
    'utf8'
  );

  assert.ok(
    noteDetailSource.includes('data-testid="heading-link-copied-toast"'),
    'Expected NoteDetailPage to render heading-link-copied-toast'
  );
  assert.ok(
    noteDetailSource.includes('Link copied!'),
    'Expected toast notification to display "Link copied!"'
  );
  assert.ok(
    noteDetailSource.includes('role="status"') &&
      noteDetailSource.includes('aria-live="polite"'),
    'Expected toast notification to use accessible status / aria-live attributes'
  );
  assert.ok(
    noteDetailSource.includes('setIsLinkCopiedToastVisible(true)'),
    'Expected copyHeadingDeepLink to activate toast visibility'
  );
});

test('ScrollProgressIndicator visually tracks scroll position as a percentage bar at the top of NoteDetailPage without disrupting CSS grid', async () => {
  const fs = await import('node:fs');
  const path = await import('node:path');

  const indicatorSource = fs.readFileSync(
    path.resolve(process.cwd(), 'src/components/ScrollProgressIndicator.tsx'),
    'utf8'
  );
  const noteDetailSource = fs.readFileSync(
    path.resolve(process.cwd(), 'src/pages/NoteDetailPage.tsx'),
    'utf8'
  );
  const cssSource = fs.readFileSync(
    path.resolve(process.cwd(), 'src/index.css'),
    'utf8'
  );

  // 1. Verify ScrollProgressIndicator provides required data-testids and accessibility roles
  assert.ok(
    indicatorSource.includes('data-testid="scroll-progress-indicator"'),
    'Expected scroll-progress-indicator data-testid'
  );
  assert.ok(
    indicatorSource.includes('data-testid="scroll-progress-bar"'),
    'Expected scroll-progress-bar data-testid'
  );
  assert.ok(
    indicatorSource.includes('data-testid="scroll-percentage-badge"') ||
      indicatorSource.includes('data-testid="scroll-percentage-text"'),
    'Expected scroll-percentage readout data-testid'
  );
  assert.ok(
    indicatorSource.includes('role="progressbar"') &&
      indicatorSource.includes('aria-valuenow={percent}'),
    'Expected role="progressbar" and aria-valuenow attributes'
  );

  // 2. Verify NoteDetailPage imports, renders, and re-exports ScrollProgressIndicator
  assert.ok(
    noteDetailSource.includes('<ScrollProgressIndicator'),
    'Expected NoteDetailPage to render <ScrollProgressIndicator />'
  );
  assert.ok(
    noteDetailSource.includes('ScrollProgressIndicator,') &&
      noteDetailSource.includes('type ScrollProgressIndicatorProps,'),
    'Expected NoteDetailPage to re-export ScrollProgressIndicator'
  );

  // 3. Verify ScrollProgressIndicator is placed at the top of NoteDetailPage OUTSIDE .note-detail-layout
  const indexOfIndicator = noteDetailSource.indexOf('<ScrollProgressIndicator');
  const indexOfLayoutGrid = noteDetailSource.indexOf("className={shouldShowToc ? 'note-detail-layout'");

  assert.ok(
    indexOfIndicator > 0 && indexOfLayoutGrid > 0 && indexOfIndicator < indexOfLayoutGrid,
    'Expected <ScrollProgressIndicator /> to be positioned before .note-detail-layout grid to avoid disrupting grid tracks'
  );

  // 4. Verify CSS styling for .scroll-progress-indicator in index.css
  assert.ok(
    cssSource.includes('.scroll-progress-indicator {') &&
      cssSource.includes('.scroll-progress-indicator-bar {') &&
      cssSource.includes('.scroll-progress-percentage-badge {'),
    'Expected src/index.css to define styling rules for .scroll-progress-indicator and percentage badge'
  );
});

test('NoteDetailPage includes a Share action button at the bottom of the article content utilizing Web Share API', async () => {
  const fs = await import('node:fs');
  const path = await import('node:path');

  const noteDetailSource = fs.readFileSync(
    path.resolve(process.cwd(), 'src/pages/NoteDetailPage.tsx'),
    'utf8'
  );

  // 1. Verify bottom share bar container and Web Share button render in NoteDetailPage
  assert.ok(
    noteDetailSource.includes('data-testid="note-bottom-share-bar"'),
    'Expected NoteDetailPage to render note-bottom-share-bar container'
  );
  assert.ok(
    noteDetailSource.includes('data-testid="note-web-share-btn"'),
    'Expected NoteDetailPage to render Share Note button with data-testid="note-web-share-btn"'
  );

  // 2. Verify handleWebShareNote handler uses navigator.share with fallback
  assert.ok(
    noteDetailSource.includes('navigator.share(shareData)') ||
      noteDetailSource.includes('navigator.share'),
    'Expected handleWebShareNote to invoke navigator.share Web Share API'
  );
  assert.ok(
    noteDetailSource.includes('Share Note'),
    'Expected Share Note label on the button'
  );
});

test('adds a Copy Link button to individual guide sections (h2/h3) in NoteDetailPage that copies the direct anchor link to the clipboard and displays a Link copied toast notification', async () => {
  const fs = await import('node:fs');
  const path = await import('node:path');
  const {
    injectHeadingCopyButtons,
    copySectionAnchorLink,
    HEADING_COPY_BUTTON_LABEL,
    HEADING_COPY_TOAST_MESSAGE,
  } = await import('../src/pages/NoteDetailPage');

  assert.equal(HEADING_COPY_BUTTON_LABEL, 'Copy Link');
  assert.equal(HEADING_COPY_TOAST_MESSAGE, 'Link copied');

  // 1. Verify 'Copy Link' button is injected into individual h2 and h3 guide sections with direct #anchor attributes
  const guideHtml = `
    <h2>1. Initial Switch Port Triage</h2>
    <p>Inspect physical layer counters.</p>
    <h3>1.1 Checking CRC &amp; Alignment Errors</h3>
    <p>Verify interface status.</p>
  `;
  const renderedHtml = injectHeadingCopyButtons(guideHtml);

  assert.ok(
    renderedHtml.includes('data-copy-heading-id="1-initial-switch-port-triage"') &&
      renderedHtml.includes('data-heading-anchor="#1-initial-switch-port-triage"') &&
      renderedHtml.includes('<span class="note-heading-copy-text">Copy Link</span>'),
    'Expected h2 section to contain a Copy Link button with direct #anchor attribute'
  );
  assert.ok(
    renderedHtml.includes('data-copy-heading-id="1-1-checking-crc-alignment-errors"') &&
      renderedHtml.includes('data-heading-anchor="#1-1-checking-crc-alignment-errors"'),
    'Expected h3 section to contain a Copy Link button with direct #anchor attribute'
  );

  // 2. Verify clicking/invoking copySectionAnchorLink copies the direct anchor link to the user's clipboard and returns 'Link copied'
  let clipboardText = '';
  const result = await copySectionAnchorLink(
    '1-1-checking-crc-alignment-errors',
    'https://jawed.co.in/notes/network-port-flapping-guide',
    {
      writeText: async (text: string) => {
        clipboardText = text;
      },
    }
  );

  assert.equal(result.ok, true);
  assert.equal(
    result.anchorUrl,
    'https://jawed.co.in/notes/network-port-flapping-guide#1-1-checking-crc-alignment-errors'
  );
  assert.equal(clipboardText, result.anchorUrl);
  assert.equal(result.toastMessage, 'Link copied');

  // 3. Verify copied button state displays 'Link copied' feedback and NoteDetailPage + FieldGuideDetailPage render the 'Link copied' toast
  const copiedRenderedHtml = injectHeadingCopyButtons(
    guideHtml,
    '1-initial-switch-port-triage'
  );
  assert.ok(
    copiedRenderedHtml.includes('<span class="note-heading-copy-text">Link copied</span>'),
    'Expected copied h2 button to display Link copied feedback'
  );

  const noteDetailSource = fs.readFileSync(
    path.resolve(process.cwd(), 'src/pages/NoteDetailPage.tsx'),
    'utf8'
  );
  const fieldGuideSource = fs.readFileSync(
    path.resolve(process.cwd(), 'src/pages/FieldGuideDetailPage.tsx'),
    'utf8'
  );

  assert.ok(
    noteDetailSource.includes('copySectionAnchorLink(headingId, currentBaseUrl)') &&
      noteDetailSource.includes('data-testid="heading-link-copied-toast"') &&
      noteDetailSource.includes('data-toast-message={HEADING_COPY_TOAST_MESSAGE}'),
    'Expected NoteDetailPage.tsx to invoke copySectionAnchorLink and display heading-link-copied-toast'
  );
  assert.ok(
    fieldGuideSource.includes('copySectionAnchorLink(headingId, baseUrl)') &&
      fieldGuideSource.includes('data-testid="heading-link-copied-toast"'),
    'Expected FieldGuideDetailPage.tsx to invoke copySectionAnchorLink and display heading-link-copied-toast'
  );
});

test('renders a "Was this guide helpful?" feedback component at the bottom of NoteDetailPage with upvote/downvote icons and a submission handler for improvement tracking', async () => {
  const fs = await import('node:fs');
  const path = await import('node:path');
  const {
    GUIDE_FEEDBACK_HEADING,
    GUIDE_FEEDBACK_STORAGE_KEY,
    submitGuideFeedback,
    getGuideFeedbackForSlug,
    getGuideFeedbackRecords,
  } = await import('../src/pages/NoteDetailPage');

  assert.equal(GUIDE_FEEDBACK_HEADING, 'Was this guide helpful?');

  // 1. Verify submission handler persists upvote/downvote and optional improvement note in storage
  const store = new Map<string, string>();
  const mockStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
  };

  assert.equal(getGuideFeedbackForSlug('diagnosing-network-port-flapping', mockStorage), null);

  // Upvote submission
  const upRecord = submitGuideFeedback(
    {
      slug: 'diagnosing-network-port-flapping',
      title: 'Diagnosing Network Port Flapping',
      vote: 'up',
    },
    mockStorage
  );
  assert.equal(upRecord.slug, 'diagnosing-network-port-flapping');
  assert.equal(upRecord.vote, 'up');
  assert.ok(upRecord.submittedAt.length > 0);
  assert.deepEqual(
    getGuideFeedbackForSlug('diagnosing-network-port-flapping', mockStorage),
    upRecord
  );

  // Downvote submission with improvement comment
  const downRecord = submitGuideFeedback(
    {
      slug: 'apple-macos-first-response-checklist',
      title: 'Apple macOS First Response Checklist',
      vote: 'down',
      comment: 'Add sysdiagnose CLI flag examples for Sonoma',
    },
    mockStorage
  );
  assert.equal(downRecord.vote, 'down');
  assert.equal(downRecord.comment, 'Add sysdiagnose CLI flag examples for Sonoma');

  const allRecords = getGuideFeedbackRecords(mockStorage);
  assert.ok(store.has(GUIDE_FEEDBACK_STORAGE_KEY));
  assert.equal(Object.keys(allRecords).length, 2);
  assert.equal(allRecords['apple-macos-first-response-checklist'].vote, 'down');

  // 2. Verify GuideFeedback.tsx and NoteDetailPage.tsx render the heading, upvote/downvote icons, and submission form
  const feedbackSource = fs.readFileSync(
    path.resolve(process.cwd(), 'src/components/GuideFeedback.tsx'),
    'utf8'
  );
  const noteDetailSource = fs.readFileSync(
    path.resolve(process.cwd(), 'src/pages/NoteDetailPage.tsx'),
    'utf8'
  );

  assert.ok(
    feedbackSource.includes("GUIDE_FEEDBACK_HEADING = 'Was this guide helpful?'") &&
      feedbackSource.includes('ThumbsUp') &&
      feedbackSource.includes('ThumbsDown') &&
      feedbackSource.includes('data-testid="guide-feedback-upvote-btn"') &&
      feedbackSource.includes('data-testid="guide-feedback-downvote-btn"') &&
      feedbackSource.includes('data-testid="guide-feedback-form"'),
    'Expected GuideFeedback.tsx to include "Was this guide helpful?", ThumbsUp/ThumbsDown icons, and submission form'
  );
  assert.ok(
    noteDetailSource.includes('<GuideFeedback') &&
      noteDetailSource.includes('slug={note.slug}'),
    'Expected NoteDetailPage.tsx to mount <GuideFeedback slug={note.slug} /> at the bottom of the guide'
  );
});

test('implements a Share button in NoteDetailPage that uses Web Share API to share the note URL and title and falls back to clipboard copy when unavailable', async () => {
  const fs = await import('node:fs');
  const path = await import('node:path');
  const { shareNoteUrlAndTitle } = await import('../src/pages/NoteDetailPage');

  // 1. When Web Share API (navigator.share) is available, shares the note's URL and title
  let sharedPayload: { title?: string; text?: string; url?: string } | null = null;
  const webShareResult = await shareNoteUrlAndTitle(
    {
      title: 'APIs Explained for IT Support',
      url: 'https://jawed.co.in/notes/apis-explained-for-it-support',
      text: 'Practical walkthrough of REST APIs and status codes.',
    },
    {
      canShare: () => true,
      share: async (data) => {
        sharedPayload = data;
      },
    }
  );

  assert.equal(webShareResult.ok, true);
  assert.equal(webShareResult.method, 'web-share');
  assert.deepEqual(sharedPayload, {
    title: 'APIs Explained for IT Support',
    text: 'Practical walkthrough of REST APIs and status codes.',
    url: 'https://jawed.co.in/notes/apis-explained-for-it-support',
  });

  // 2. When Web Share API is unavailable, falls back to clipboard copy
  let copiedUrl = '';
  const fallbackResult = await shareNoteUrlAndTitle(
    {
      title: 'APIs Explained for IT Support',
      url: 'https://jawed.co.in/notes/apis-explained-for-it-support',
    },
    {
      share: undefined,
      clipboard: {
        writeText: async (text: string) => {
          copiedUrl = text;
        },
      },
    }
  );

  assert.equal(fallbackResult.ok, true);
  assert.equal(fallbackResult.method, 'clipboard');
  assert.equal(copiedUrl, 'https://jawed.co.in/notes/apis-explained-for-it-support');

  // 3. When navigator.share throws a non-AbortError (e.g. NotAllowedError in iframe), falls back gracefully to clipboard copy
  let errorFallbackCopiedUrl = '';
  const errorFallbackResult = await shareNoteUrlAndTitle(
    {
      title: 'Diagnosing Network Port Flapping',
      url: 'https://jawed.co.in/notes/diagnosing-network-port-flapping',
    },
    {
      share: async () => {
        const err = new Error('Permission denied');
        err.name = 'NotAllowedError';
        throw err;
      },
      clipboard: {
        writeText: async (text: string) => {
          errorFallbackCopiedUrl = text;
        },
      },
    }
  );

  assert.equal(errorFallbackResult.ok, true);
  assert.equal(errorFallbackResult.method, 'clipboard');
  assert.equal(
    errorFallbackCopiedUrl,
    'https://jawed.co.in/notes/diagnosing-network-port-flapping'
  );

  // 4. Verify NoteDetailPage.tsx and delegated FieldGuideDetailPage.tsx render the Share button and invoke shareNoteUrlAndTitle
  const noteDetailSource = fs.readFileSync(
    path.resolve(process.cwd(), 'src/pages/NoteDetailPage.tsx'),
    'utf8'
  );
  const fieldGuideSource = fs.readFileSync(
    path.resolve(process.cwd(), 'src/pages/FieldGuideDetailPage.tsx'),
    'utf8'
  );
  assert.ok(
    noteDetailSource.includes('data-testid="note-share-btn"') &&
      noteDetailSource.includes('data-testid="note-web-share-btn"') &&
      noteDetailSource.includes('shareNoteUrlAndTitle(shareData)'),
    'Expected NoteDetailPage.tsx to render Share buttons and invoke shareNoteUrlAndTitle'
  );
  assert.ok(
    fieldGuideSource.includes('data-testid="note-share-btn"') &&
      fieldGuideSource.includes('shareNoteUrlAndTitle({'),
    'Expected FieldGuideDetailPage.tsx to render Share button and invoke shareNoteUrlAndTitle'
  );
});

test('implements a Read Time indicator in NoteDetailPage that calculates estimated reading time based on word count and displays it in the header', async () => {
  const fs = await import('node:fs');
  const path = await import('node:path');
  const {
    calculateWordCount,
    calculateReadTimeMinutes,
    calculateReadTime,
    getHeaderReadTimeDetails,
  } = await import('../src/pages/NoteDetailPage');

  // 1. Verify word count and read time calculation for short and multi-minute notes
  const shortHtml = '<h2>Quick Triage</h2><p>Check physical link light and VLAN tagging.</p>';
  const shortDetails = getHeaderReadTimeDetails(shortHtml);
  assert.equal(shortDetails.wordCount, 9);
  assert.equal(shortDetails.minutes, 1);
  assert.equal(shortDetails.formattedReadTime, '1 min read');
  assert.equal(shortDetails.label, 'Read Time: 1 min read (9 words)');

  const sixHundredWords = `<article><p>${Array.from({ length: 600 }, (_, i) => `token${i}`).join(' ')}</p></article>`;
  const mediumDetails = getHeaderReadTimeDetails(sixHundredWords);
  assert.equal(calculateWordCount(sixHundredWords), 600);
  assert.equal(calculateReadTimeMinutes(sixHundredWords), 3);
  assert.equal(calculateReadTime(sixHundredWords), '3 min read');
  assert.equal(mediumDetails.wordCount, 600);
  assert.equal(mediumDetails.minutes, 3);
  assert.equal(mediumDetails.formattedReadTime, '3 min read');

  // 2. Verify NoteDetailPage.tsx renders the Read Time indicator inside <header className="note-detail-header">
  const noteDetailSource = fs.readFileSync(
    path.resolve(process.cwd(), 'src/pages/NoteDetailPage.tsx'),
    'utf8'
  );
  assert.ok(
    noteDetailSource.includes('data-testid="note-detail-header"') &&
      noteDetailSource.includes('data-testid="note-header-read-time"') &&
      noteDetailSource.includes('data-testid="note-header-read-time-text"') &&
      noteDetailSource.includes('data-testid="note-header-word-count"') &&
      noteDetailSource.includes('getHeaderReadTimeDetails(cleanHtmlContent || note.description)'),
    'Expected NoteDetailPage.tsx header to render the Read Time indicator with word count and estimated minutes'
  );
});

test('wraps all tables in NoteDetailPage in an accessible container that explicitly enables horizontal scrolling on touch devices while ensuring proper screen reader captions', async () => {
  const fs = await import('node:fs');
  const path = await import('node:path');
  const {
    deriveTableCaptionText,
    wrapTablesInAccessibleContainers,
    injectHeadingCopyButtons,
  } = await import('../src/pages/NoteDetailPage');

  // 1. Verify deriveTableCaptionText extracts meaningful screen reader captions from preceding headings & column headers
  const sampleArticleHtml = `
    <h2>Worked example: two ETFs can still overlap</h2>
    <p>Suppose a hypothetical portfolio invests in ETF A and ETF B.</p>
    <table>
      <thead>
        <tr>
          <th>Holding</th>
          <th>Portfolio value</th>
          <th>Company X weight inside fund</th>
          <th>Portfolio exposure to Company X</th>
        </tr>
      </thead>
      <tbody>
        <tr><td>ETF A</td><td>₹5 lakh</td><td>50%</td><td>₹2.5 lakh (25%)</td></tr>
      </tbody>
    </table>
  `;

  const withCopyButtons = injectHeadingCopyButtons(sampleArticleHtml);
  const wrappedHtml = wrapTablesInAccessibleContainers(withCopyButtons, {
    noteTitle: 'US Stocks and ETFs: A Practical Starting Point',
  });

  // Verify accessible container with touch horizontal scrolling attributes
  assert.ok(
    wrappedHtml.includes('class="table-wrap note-accessible-table-container"') &&
      wrappedHtml.includes('role="region"') &&
      wrappedHtml.includes('tabindex="0"') &&
      wrappedHtml.includes('aria-labelledby="note-table-caption-1"') &&
      wrappedHtml.includes('data-testid="note-accessible-table-container"') &&
      wrappedHtml.includes('data-touch-scroll="horizontal"') &&
      wrappedHtml.includes('overflow-x: auto; -webkit-overflow-scrolling: touch; touch-action: pan-x pan-y;'),
    'Expected table to be wrapped in an accessible scroll container with explicit touch horizontal scrolling'
  );

  // Verify screen reader caption is injected with heading & column header context
  assert.ok(
    wrappedHtml.includes(
      '<caption id="note-table-caption-1" class="sr-only note-table-caption" data-testid="note-table-sr-caption">Worked example: two ETFs can still overlap — Table columns: Holding, Portfolio value, Company X weight inside fund, Portfolio exposure to Company X</caption>'
    ),
    'Expected screen reader <caption> to be injected inside the <table> with heading and column context'
  );

  // 2. Verify existing <caption> elements and pre-wrapped .table-wrap divs are preserved/upgraded without double-wrapping
  const preWrappedWithCaption = `
    <div class="table-wrap">
      <table>
        <caption>Cat6A and OS2 Fiber Minimum Bend Radius Specifications</caption>
        <thead><tr><th>Cable Type</th><th>Minimum Bend Radius</th></tr></thead>
        <tbody><tr><td>Cat6A</td><td>2.0 inches</td></tr></tbody>
      </table>
    </div>
  `;
  const upgradedHtml = wrapTablesInAccessibleContainers(preWrappedWithCaption);
  const containerMatches = upgradedHtml.match(/data-testid="note-accessible-table-container"/g) || [];
  assert.equal(containerMatches.length, 1, 'Expected pre-wrapped .table-wrap table not to be double-wrapped');
  assert.ok(
    upgradedHtml.includes('id="note-table-caption-1"') &&
      upgradedHtml.includes('class="sr-only note-table-caption"') &&
      upgradedHtml.includes('Cat6A and OS2 Fiber Minimum Bend Radius Specifications') &&
      upgradedHtml.includes('aria-label="Cat6A and OS2 Fiber Minimum Bend Radius Specifications"'),
    'Expected existing <caption> text to be preserved and linked to the accessible container'
  );

  // 3. Verify real notes in notesData.json containing tables (e.g., us-stocks-and-etfs-starting-point) are wrapped cleanly
  const noteWithTable = notesData.find((n) => n.content.includes('<table'));
  assert.ok(noteWithTable, 'Expected notesData.json to contain at least one note with a <table>');
  const processedNoteHtml = wrapTablesInAccessibleContainers(
    injectHeadingCopyButtons(noteWithTable!.content),
    { noteTitle: noteWithTable!.title }
  );
  assert.ok(
    processedNoteHtml.includes('data-testid="note-accessible-table-container"') &&
      processedNoteHtml.includes('data-testid="note-table-sr-caption"'),
    'Expected note table in notesData.json to be wrapped in accessible container with screen reader caption'
  );

  // 4. Verify NoteDetailPage.tsx and src/index.css wire accessible table wrapping and touch scrolling rules
  const noteDetailSource = fs.readFileSync(
    path.resolve(process.cwd(), 'src/pages/NoteDetailPage.tsx'),
    'utf8'
  );
  const cssSource = fs.readFileSync(
    path.resolve(process.cwd(), 'src/index.css'),
    'utf8'
  );

  assert.ok(
    noteDetailSource.includes('wrapTablesInAccessibleContainers(htmlWithCopyButtons') &&
      noteDetailSource.includes('ensureAccessibleTablesInDom(renderedContentRef.current') &&
      noteDetailSource.includes('injectCodeBlockMarkdownCopyButtons(htmlWithAccessibleTables'),
    'Expected NoteDetailPage.tsx to wrap all rendered tables in accessible containers'
  );

  assert.ok(
    cssSource.includes('.note-accessible-table-container') &&
      cssSource.includes('-webkit-overflow-scrolling: touch;') &&
      cssSource.includes('touch-action: pan-x pan-y;') &&
      cssSource.includes('.note-table-caption.sr-only'),
    'Expected src/index.css to define touch horizontal scrolling and screen-reader-only caption styles'
  );
});

test('adds a Copy as Markdown button to technical code blocks in NoteDetailPage allowing field technicians to copy formatted Markdown code for documentation or tickets', async () => {
  const fs = await import('node:fs');
  const path = await import('node:path');
  const {
    formatCodeBlockAsMarkdown,
    copyCodeBlockAsMarkdown,
    injectCodeBlockMarkdownCopyButtons,
    CODE_MARKDOWN_BUTTON_LABEL,
    CODE_MARKDOWN_COPIED_LABEL,
  } = await import('../src/pages/NoteDetailPage');

  assert.equal(CODE_MARKDOWN_BUTTON_LABEL, 'Copy as Markdown');
  assert.equal(CODE_MARKDOWN_COPIED_LABEL, 'Copied as Markdown');

  // 1. Verify formatCodeBlockAsMarkdown formats raw and HTML-tagged code into fenced Markdown blocks
  const formattedBash = formatCodeBlockAsMarkdown(
    '<code>sudo dscacheutil -flushcache &amp;&amp; sudo killall -HUP mDNSResponder</code>',
    { language: 'bash', label: 'Flush macOS DNS Cache', promptSymbol: '$' }
  );
  assert.equal(
    formattedBash,
    '**Flush macOS DNS Cache**\n```bash\n$ sudo dscacheutil -flushcache && sudo killall -HUP mDNSResponder\n```'
  );

  // 2. Verify copyCodeBlockAsMarkdown copies the formatted Markdown block to the user's clipboard
  let copiedClipboardMarkdown = '';
  const copyResult = await copyCodeBlockAsMarkdown(
    'show interface GigabitEthernet1/0/12 counters errors',
    {
      language: 'sh',
      blockId: 'note-code-block-1',
      output: 'Gi1/0/12  Align-Err: 0  FCS-Err: 4821',
    },
    {
      writeText: async (text: string) => {
        copiedClipboardMarkdown = text;
      },
    }
  );

  assert.equal(copyResult.ok, true);
  assert.equal(copyResult.blockId, 'note-code-block-1');
  assert.equal(copyResult.toastMessage, 'Copied as Markdown');
  assert.equal(
    copiedClipboardMarkdown,
    '```sh\nshow interface GigabitEthernet1/0/12 counters errors\n\n# Output:\nGi1/0/12  Align-Err: 0  FCS-Err: 4821\n```'
  );

  // 3. Verify injectCodeBlockMarkdownCopyButtons wraps <pre> blocks in NoteDetailPage HTML with a Copy as Markdown button
  const sampleNoteWithPre = `
    <h2>Track net worth</h2>
    <pre class="tool-output language-bash">Net worth = Total assets &minus; Total liabilities</pre>
  `;
  const enhancedHtml = injectCodeBlockMarkdownCopyButtons(sampleNoteWithPre);
  assert.ok(
    enhancedHtml.includes('data-testid="note-code-block-wrapper"') &&
      enhancedHtml.includes('data-testid="copy-code-markdown-btn"') &&
      enhancedHtml.includes('data-copy-code-markdown-id="note-code-block-1"') &&
      enhancedHtml.includes('<span class="note-code-copy-text">Copy as Markdown</span>'),
    'Expected <pre> code block to include a Copy as Markdown button'
  );

  const copiedStateHtml = injectCodeBlockMarkdownCopyButtons(
    sampleNoteWithPre,
    'note-code-block-1'
  );
  assert.ok(
    copiedStateHtml.includes('class="note-code-copy-markdown-btn is-copied"') &&
      copiedStateHtml.includes('<span class="note-code-copy-text">Copied as Markdown</span>'),
    'Expected Copy as Markdown button to display Copied as Markdown feedback when active'
  );

  // 4. Verify NoteDetailPage.tsx and CopyableCodeBlock.tsx wire the Copy as Markdown button
  const noteDetailSource = fs.readFileSync(
    path.resolve(process.cwd(), 'src/pages/NoteDetailPage.tsx'),
    'utf8'
  );
  const copyableCodeBlockSource = fs.readFileSync(
    path.resolve(process.cwd(), 'src/components/guides/CopyableCodeBlock.tsx'),
    'utf8'
  );

  assert.ok(
    noteDetailSource.includes('injectCodeBlockMarkdownCopyButtons(htmlWithAccessibleTables, copiedCodeBlockId)') &&
      noteDetailSource.includes('copyCodeBlockAsMarkdown(rawCode') &&
      noteDetailSource.includes('dangerouslySetInnerHTML={{ __html: htmlWithCodeMarkdownButtons }}'),
    'Expected NoteDetailPage.tsx to inject and handle Copy as Markdown buttons on code blocks'
  );

  assert.ok(
    copyableCodeBlockSource.includes('data-testid="copy-code-markdown-btn"') &&
      copyableCodeBlockSource.includes('copyCodeBlockAsMarkdown(command'),
    'Expected CopyableCodeBlock.tsx to render a Copy as Markdown button for interactive CLI blocks'
  );
});

test('TableOfContents parses h2 and h3 headers in NoteDetailPage and provides both side-mounted and floating navigation menus', async () => {
  const fs = await import('node:fs');
  const path = await import('node:path');
  const { generateTableOfContents, parseRenderedHeadingsFromDom } = await import(
    '../src/pages/NoteDetailPage'
  );

  // 1. Verify h2 and h3 headers are parsed in document order with hierarchical level-2 and level-3 metadata
  const longFormGuideHtml = `
    <h2>1. Physical Layer Verification</h2>
    <p>Inspect transceiver seating and patch cables.</p>
    <h3>1.1 Checking SFP+ DOM Optical Levels</h3>
    <p>Verify Rx/Tx dBm thresholds.</p>
    <h3>1.2 Inspecting Interface Error Counters</h3>
    <p>Check CRC and giant frame counts.</p>
    <h2>2. VLAN &amp; Trunk Configuration</h2>
    <h3>2.1 Verifying 802.1Q Native VLAN</h3>
  `;

  const parsed = generateTableOfContents(longFormGuideHtml);
  assert.equal(parsed.shouldShowToc, true);
  assert.deepEqual(parsed.tocItems, [
    { id: '1-physical-layer-verification', text: '1. Physical Layer Verification', level: 2 },
    { id: '1-1-checking-sfp-dom-optical-levels', text: '1.1 Checking SFP+ DOM Optical Levels', level: 3 },
    { id: '1-2-inspecting-interface-error-counters', text: '1.2 Inspecting Interface Error Counters', level: 3 },
    { id: '2-vlan-trunk-configuration', text: '2. VLAN & Trunk Configuration', level: 2 },
    { id: '2-1-verifying-802-1q-native-vlan', text: '2.1 Verifying 802.1Q Native VLAN', level: 3 },
  ]);

  // 2. Verify DOM heading parser extracts both H2 and H3 elements
  const domElements = [
    { tagName: 'H2', id: 'layer-1', textContent: '1. Physical Layer Verification' },
    { tagName: 'H3', id: 'sfp-dom', textContent: '1.1 Checking SFP+ DOM Optical Levels' },
  ];
  const domToc = parseRenderedHeadingsFromDom({ querySelectorAll: () => domElements });
  assert.equal(domToc.length, 2);
  assert.equal(domToc[0].level, 2);
  assert.equal(domToc[1].level, 3);

  // 3. Verify TableOfContents.tsx, NoteDetailPage.tsx, FieldGuideDetailPage.tsx, and index.css implement side-mounted and floating navigation menus
  const tocSource = fs.readFileSync(
    path.resolve(process.cwd(), 'src/components/TableOfContents.tsx'),
    'utf8'
  );
  const noteDetailSource = fs.readFileSync(
    path.resolve(process.cwd(), 'src/pages/NoteDetailPage.tsx'),
    'utf8'
  );
  const fieldGuideSource = fs.readFileSync(
    path.resolve(process.cwd(), 'src/pages/FieldGuideDetailPage.tsx'),
    'utf8'
  );
  const cssSource = fs.readFileSync(
    path.resolve(process.cwd(), 'src/index.css'),
    'utf8'
  );

  assert.ok(
    tocSource.includes('data-testid="note-toc-sidebar"') &&
      tocSource.includes('data-testid="note-toc-floating"') &&
      tocSource.includes('data-testid="note-toc-floating-toggle"') &&
      tocSource.includes('data-testid="note-toc-floating-panel"'),
    'Expected TableOfContents.tsx to provide both side-mounted (note-toc-sidebar) and floating (note-toc-floating) navigation menus'
  );
  assert.ok(
    noteDetailSource.includes('mode="desktop"') &&
      noteDetailSource.includes('mode="mobile"') &&
      noteDetailSource.includes('mode="floating"'),
    'Expected NoteDetailPage.tsx to mount side-mounted, mobile, and floating TableOfContents navigation menus'
  );
  assert.ok(
    fieldGuideSource.includes("querySelectorAll<HTMLHeadingElement>('h2, h3')") &&
      fieldGuideSource.includes('mode="floating"'),
    'Expected FieldGuideDetailPage.tsx to parse h2 and h3 headings and mount floating TableOfContents'
  );
  assert.ok(
    cssSource.includes('.note-toc-sidebar {') &&
      cssSource.includes('.note-toc-floating {') &&
      cssSource.includes('.note-toc-floating-panel {'),
    'Expected src/index.css to style both side-mounted and floating Table of Contents menus'
  );
});

test('ExportToPdfButton triggers browser native print dialog for active tool report or guide content with clean A4 export format', async () => {
  const fs = await import('node:fs');
  const path = await import('node:path');
  const {
    EXPORT_TO_PDF_LABEL,
    triggerA4PdfExport,
    formatPdfDocumentTitle,
  } = await import('../src/components/ExportToPdfButton');

  assert.equal(EXPORT_TO_PDF_LABEL, 'Export to PDF');
  assert.equal(
    formatPdfDocumentTitle('Diagnosing Network Port Flapping | Jawed Imtiaz'),
    'Diagnosing Network Port Flapping'
  );

  // 1. Verify triggerA4PdfExport sets A4 attributes, marks active target, sets document.title during window.print(), and restores state
  const rootAttrs = new Map<string, string>();
  const targetAttrs = new Map<string, string>();
  let titleDuringPrint = '';
  let targetActiveDuringPrint = '';
  let rootFormatDuringPrint = '';
  let printCount = 0;

  const mockDoc = {
    title: 'Original Browser Tab Title',
    documentElement: {
      setAttribute: (k: string, v: string) => {
        rootAttrs.set(k, v);
      },
      removeAttribute: (k: string) => {
        rootAttrs.delete(k);
      },
    },
    querySelector: (selector: string) => {
      if (selector === '.quick-note-article') {
        return {
          setAttribute: (k: string, v: string) => {
            targetAttrs.set(k, v);
          },
          removeAttribute: (k: string) => {
            targetAttrs.delete(k);
          },
        };
      }
      return null;
    },
  };

  const result = triggerA4PdfExport({
    documentTitle: 'IPv4 Subnet Calculator Engineering Report',
    targetSelector: '.quick-note-article',
    exportScope: 'tool-report',
    orientation: 'portrait',
    docOverride: mockDoc,
    winOverride: {
      print: () => {
        printCount += 1;
        titleDuringPrint = mockDoc.title;
        targetActiveDuringPrint = targetAttrs.get('data-active-print-target') || '';
        rootFormatDuringPrint = rootAttrs.get('data-print-format') || '';
      },
    },
  });

  assert.equal(result.ok, true);
  assert.equal(result.format, 'A4');
  assert.equal(result.orientation, 'portrait');
  assert.equal(result.exportScope, 'tool-report');
  assert.equal(printCount, 1);
  assert.equal(titleDuringPrint, 'IPv4 Subnet Calculator Engineering Report');
  assert.equal(targetActiveDuringPrint, 'true');
  assert.equal(rootFormatDuringPrint, 'A4');
  // Restored after print
  assert.equal(mockDoc.title, 'Original Browser Tab Title');
  assert.equal(targetAttrs.has('data-active-print-target'), false);

  // 2. Verify ExportToPdfButton component, NoteDetailPage, FieldGuideDetailPage, SocialShareBar, and @media print A4 rules
  const exportBtnSource = fs.readFileSync(
    path.resolve(process.cwd(), 'src/components/common/ExportToPdfButton.tsx'),
    'utf8'
  );
  const noteDetailSource = fs.readFileSync(
    path.resolve(process.cwd(), 'src/pages/NoteDetailPage.tsx'),
    'utf8'
  );
  const fieldGuideSource = fs.readFileSync(
    path.resolve(process.cwd(), 'src/pages/FieldGuideDetailPage.tsx'),
    'utf8'
  );
  const socialShareSource = fs.readFileSync(
    path.resolve(process.cwd(), 'src/components/SocialShareBar.tsx'),
    'utf8'
  );
  const cssSource = fs.readFileSync(
    path.resolve(process.cwd(), 'src/index.css'),
    'utf8'
  );

  assert.ok(
    exportBtnSource.includes("EXPORT_TO_PDF_LABEL = 'Export to PDF'") &&
      exportBtnSource.includes('data-testid="export-pdf-btn"') &&
      exportBtnSource.includes('data-export-format="A4"') &&
      exportBtnSource.includes('win.print()'),
    'Expected ExportToPdfButton.tsx to define "Export to PDF" button with A4 format and native window.print() invocation'
  );
  assert.ok(
    noteDetailSource.includes('<ExportToPdfButton') &&
      noteDetailSource.includes('targetSelector=".quick-note-article"'),
    'Expected NoteDetailPage.tsx to render <ExportToPdfButton /> targeting the active guide article'
  );
  assert.ok(
    fieldGuideSource.includes('<ExportToPdfButton') &&
      fieldGuideSource.includes('targetSelector=".article-body"'),
    'Expected FieldGuideDetailPage.tsx to render <ExportToPdfButton /> targeting the active field guide body'
  );
  assert.ok(
    socialShareSource.includes('<ExportToPdfButton'),
    'Expected SocialShareBar.tsx to render <ExportToPdfButton /> for tool reports and guides'
  );
  assert.ok(
    cssSource.includes('size: A4 portrait;') &&
      cssSource.includes('[data-active-print-target="true"]'),
    'Expected src/index.css @media print block to configure A4 page geometry and active print target rules'
  );
});

test('adds a Copy Link button on hover for each h2 and h3 heading in NoteDetailPage and supports direct navigation to that specific section', async () => {
  const fs = await import('node:fs');
  const path = await import('node:path');
  const {
    injectHeadingCopyButtons,
    copySectionAnchorLink,
    navigateToHashHeadingOnLoad,
    HEADING_COPY_BUTTON_LABEL,
  } = await import('../src/pages/NoteDetailPage');

  assert.equal(HEADING_COPY_BUTTON_LABEL, 'Copy Link');

  // 1. Verify each h2 and h3 heading receives a hover 'Copy Link' button with direct #anchor attribute
  const html = `
    <h2>1. Verify Switch Uplink Trunk</h2>
    <p>Check 802.1Q encapsulation.</p>
    <h3>1.1 Inspect Allowed VLAN List</h3>
  `;
  const rendered = injectHeadingCopyButtons(html);
  assert.ok(
    rendered.includes('data-copy-heading-id="1-verify-switch-uplink-trunk"') &&
      rendered.includes('data-heading-anchor="#1-verify-switch-uplink-trunk"') &&
      rendered.includes('<span class="note-heading-copy-text">Copy Link</span>'),
    'Expected h2 heading to render a Copy Link button on hover'
  );
  assert.ok(
    rendered.includes('data-copy-heading-id="1-1-inspect-allowed-vlan-list"') &&
      rendered.includes('data-heading-anchor="#1-1-inspect-allowed-vlan-list"') &&
      rendered.includes('data-testid="copy-heading-link-1-1-inspect-allowed-vlan-list"'),
    'Expected h3 heading to render a Copy Link button on hover'
  );

  // 2. Verify copying the section link writes the direct section URL (#anchor) to clipboard
  let copiedText = '';
  const copyRes = await copySectionAnchorLink(
    '1-1-inspect-allowed-vlan-list',
    'https://jawed.co.in/notes/vlan-trunk-troubleshooting',
    {
      writeText: async (t: string) => {
        copiedText = t;
      },
    }
  );
  assert.equal(copyRes.ok, true);
  assert.equal(
    copiedText,
    'https://jawed.co.in/notes/vlan-trunk-troubleshooting#1-1-inspect-allowed-vlan-list'
  );

  // 3. Verify direct navigation to the specific section via navigateToHashHeadingOnLoad
  let scrolledId = '';
  let updatedHash = '';
  const navigatedId = navigateToHashHeadingOnLoad(
    '#1-1-inspect-allowed-vlan-list',
    {
      getElementById: (id: string) => ({
        scrollIntoView: () => {
          scrolledId = id;
        },
      }),
    },
    {
      history: {
        replaceState: (_d: unknown, _u: string, url?: string | null) => {
          updatedHash = url || '';
        },
      },
    }
  );
  assert.equal(navigatedId, '1-1-inspect-allowed-vlan-list');
  assert.equal(scrolledId, '1-1-inspect-allowed-vlan-list');
  assert.equal(updatedHash, '#1-1-inspect-allowed-vlan-list');

  // 4. Verify hover CSS rules and NoteDetailPage integration
  const cssSource = fs.readFileSync(
    path.resolve(process.cwd(), 'src/index.css'),
    'utf8'
  );
  const noteDetailSource = fs.readFileSync(
    path.resolve(process.cwd(), 'src/pages/NoteDetailPage.tsx'),
    'utf8'
  );

  assert.ok(
    cssSource.includes('.note-rendered-content h2:hover .note-heading-copy-btn') &&
      cssSource.includes('.note-rendered-content h3:hover .note-heading-copy-btn'),
    'Expected src/index.css to reveal .note-heading-copy-btn on h2 and h3 hover'
  );
  assert.ok(
    noteDetailSource.includes('navigateToHashHeadingOnLoad(window.location.hash)') &&
      noteDetailSource.includes('jumpToHeadingSection(headingId)'),
    'Expected NoteDetailPage.tsx to navigate directly to the section on hash load and heading link click'
  );
});
