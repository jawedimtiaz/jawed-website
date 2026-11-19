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

test('automatically generates unique IDs for every h2 and h3 heading in NoteDetailPage and updates Copy Link to append #hash to the URL', async () => {
  const fs = await import('node:fs');
  const path = await import('node:path');
  const {
    generateTableOfContents,
    injectHeadingCopyButtons,
    ensureHeadingIdsAndCopyButtonsInDom,
    copySectionAnchorLink,
    buildTocAnchorUrl,
  } = await import('../src/pages/NoteDetailPage');

  // 1. Verify HTML string parser generates unique IDs for every h2 and h3 heading (including duplicates)
  const rawHtml = `
    <h2>BGP Neighbor States</h2>
    <h3>Active vs Connect</h3>
    <h3>Active vs Connect</h3>
    <h2>BGP Neighbor States</h2>
  `;
  const { htmlWithIds, tocItems } = generateTableOfContents(rawHtml);
  assert.deepEqual(
    tocItems.map((item) => ({ id: item.id, level: item.level })),
    [
      { id: 'bgp-neighbor-states', level: 2 },
      { id: 'active-vs-connect', level: 3 },
      { id: 'active-vs-connect-2', level: 3 },
      { id: 'bgp-neighbor-states-2', level: 2 },
    ]
  );

  const htmlWithButtons = injectHeadingCopyButtons(htmlWithIds);
  for (const item of tocItems) {
    assert.ok(
      htmlWithButtons.includes(`id="${item.id}"`),
      `Expected heading to have id="${item.id}"`
    );
    assert.ok(
      htmlWithButtons.includes(`data-copy-heading-id="${item.id}"`) &&
        htmlWithButtons.includes(`data-heading-anchor="#${item.id}"`),
      `Expected Copy Link button to include data-copy-heading-id="${item.id}" and data-heading-anchor="#${item.id}"`
    );
  }

  // 2. Verify live DOM enhancer (ensureHeadingIdsAndCopyButtonsInDom) assigns unique IDs to h2/h3 nodes missing an ID
  const createMockHeading = (tagName: string, textContent: string, initialId = '') => {
    const attrs = new Map<string, string>();
    if (initialId) attrs.set('id', initialId);
    const children: Array<{
      className: string;
      textContent: string;
      attrs: Map<string, string>;
      setAttribute: (n: string, v: string) => void;
      getAttribute: (n: string) => string | null;
      querySelector: (sel: string) => { textContent: string | null } | null;
    }> = [];

    return {
      tagName,
      id: initialId,
      textContent,
      ownerDocument: {
        createElement: (_tag: string) => {
          const btnAttrs = new Map<string, string>();
          let innerText = 'Copy Link';
          return {
            type: 'button',
            className: '',
            innerHTML: '',
            get textContent() {
              return innerText;
            },
            set textContent(v: string) {
              innerText = v;
            },
            setAttribute: (n: string, v: string) => {
              btnAttrs.set(n, v);
            },
            getAttribute: (n: string) => btnAttrs.get(n) ?? null,
            querySelector: (sel: string) =>
              sel === '.note-heading-copy-text'
                ? {
                    get textContent() {
                      return innerText;
                    },
                    set textContent(v: string | null) {
                      innerText = v || '';
                    },
                  }
                : null,
            attrs: btnAttrs,
          };
        },
      },
      getAttribute: (n: string) => (n === 'id' ? initialId || attrs.get('id') || null : attrs.get(n) ?? null),
      setAttribute: function (n: string, v: string) {
        attrs.set(n, v);
        if (n === 'id') {
          this.id = v;
        }
      },
      querySelector: (sel: string) => {
        if (sel === '.note-heading-copy-btn') {
          return children[0] || null;
        }
        return null;
      },
      appendChild: (child: (typeof children)[number]) => {
        children.push(child);
      },
      children,
    };
  };

  const mockHeadings = [
    createMockHeading('H2', 'OSPF Area Types'),
    createMockHeading('H3', 'Stub & Totally Stubby Areas'),
    createMockHeading('H3', 'Stub & Totally Stubby Areas'),
  ];

  const domTocItems = ensureHeadingIdsAndCopyButtonsInDom({
    querySelectorAll: () => mockHeadings as unknown as NodeListOf<HTMLElement>,
  });

  assert.deepEqual(
    domTocItems.map((item) => item.id),
    ['ospf-area-types', 'stub-totally-stubby-areas', 'stub-totally-stubby-areas-2']
  );
  assert.equal(mockHeadings[0].id, 'ospf-area-types');
  assert.equal(mockHeadings[1].id, 'stub-totally-stubby-areas');
  assert.equal(mockHeadings[2].id, 'stub-totally-stubby-areas-2');
  assert.equal(
    mockHeadings[1].children[0]?.getAttribute('data-heading-anchor'),
    '#stub-totally-stubby-areas'
  );

  // 3. Verify Copy Link appends #hash to the URL (stripping any old hash) and updates browser URL hash via history.replaceState
  let copiedUrl = '';
  let historyReplacedHash = '';
  const copyResult = await copySectionAnchorLink(
    'stub-totally-stubby-areas-2',
    'https://jawed.co.in/notes/ospf-design-guide#old-section',
    {
      writeText: async (text: string) => {
        copiedUrl = text;
      },
    },
    {
      location: { href: 'https://jawed.co.in/notes/ospf-design-guide#old-section' },
      history: {
        replaceState: (_data: unknown, _unused: string, url?: string | null) => {
          historyReplacedHash = url || '';
        },
      },
    }
  );

  assert.equal(copyResult.ok, true);
  assert.equal(
    copyResult.anchorUrl,
    'https://jawed.co.in/notes/ospf-design-guide#stub-totally-stubby-areas-2'
  );
  assert.equal(
    copiedUrl,
    buildTocAnchorUrl('https://jawed.co.in/notes/ospf-design-guide', 'stub-totally-stubby-areas-2')
  );
  assert.equal(historyReplacedHash, '#stub-totally-stubby-areas-2');

  const noteDetailSource = fs.readFileSync(
    path.resolve(process.cwd(), 'src/pages/NoteDetailPage.tsx'),
    'utf8'
  );
  assert.ok(
    noteDetailSource.includes('ensureHeadingIdsAndCopyButtonsInDom') &&
      noteDetailSource.includes('buildTocAnchorUrl(baseNoteUrl, currentHashId)'),
    'Expected NoteDetailPage.tsx to invoke ensureHeadingIdsAndCopyButtonsInDom and append #hash via buildTocAnchorUrl'
  );
});

test('CollapsibleTableOfContents automatically extracts all h2 and h3 headings and provides smooth-scroll navigation in NoteDetailPage', async () => {
  const fs = await import('node:fs');
  const path = await import('node:path');
  const {
    CollapsibleTableOfContents,
    extractTocHeadings,
    groupTocItemsByH2,
    smoothScrollToHeading,
  } = await import('../src/components/CollapsibleTableOfContents');

  assert.equal(typeof CollapsibleTableOfContents, 'function');

  // 1. Verify automatic extraction of all h2 and h3 headings from HTML/Markdown content and DOM elements
  const guideHtml = `
    <h1>Guide Title</h1>
    <h2>1. BGP Session Establishment</h2>
    <h3>1.1 TCP Port 179 Reachability</h3>
    <h3>1.2 Hold Timer &amp; Keepalive Negotiation</h3>
    <h2>2. Prefix Filtering &amp; Route Maps</h2>
    <h3>2.1 Inbound AS-Path Prepending</h3>
    <h4>Ignored Level 4</h4>
  `;

  const extractedFromString = extractTocHeadings(guideHtml);
  assert.deepEqual(extractedFromString, [
    { id: '1-bgp-session-establishment', text: '1. BGP Session Establishment', level: 2 },
    { id: '1-1-tcp-port-179-reachability', text: '1.1 TCP Port 179 Reachability', level: 3 },
    { id: '1-2-hold-timer-keepalive-negotiation', text: '1.2 Hold Timer & Keepalive Negotiation', level: 3 },
    { id: '2-prefix-filtering-route-maps', text: '2. Prefix Filtering & Route Maps', level: 2 },
    { id: '2-1-inbound-as-path-prepending', text: '2.1 Inbound AS-Path Prepending', level: 3 },
  ]);

  const grouped = groupTocItemsByH2(extractedFromString);
  assert.equal(grouped.length, 2);
  assert.equal(grouped[0].section.id, '1-bgp-session-establishment');
  assert.equal(grouped[0].subsections.length, 2);
  assert.equal(grouped[1].section.id, '2-prefix-filtering-route-maps');
  assert.equal(grouped[1].subsections.length, 1);

  // 2. Verify smooth-scroll navigation (`behavior: 'smooth'`) and URL hash synchronization
  let scrollOptionsReceived: { behavior?: string; block?: string } | null = null;
  let updatedHash = '';
  const scrollResult = smoothScrollToHeading(
    '#1-2-hold-timer-keepalive-negotiation',
    {
      getElementById: (id: string) =>
        id === '1-2-hold-timer-keepalive-negotiation'
          ? {
              scrollIntoView: (opts: { behavior?: string; block?: string }) => {
                scrollOptionsReceived = opts;
              },
            }
          : null,
    },
    {
      history: {
        replaceState: (_data: unknown, _unused: string, url?: string | null) => {
          updatedHash = url || '';
        },
      },
    }
  );

  assert.equal(scrollResult.scrolled, true);
  assert.equal(scrollResult.headingId, '1-2-hold-timer-keepalive-negotiation');
  assert.equal(scrollResult.hash, '#1-2-hold-timer-keepalive-negotiation');
  assert.deepEqual(scrollOptionsReceived, { behavior: 'smooth', block: 'start' });
  assert.equal(updatedHash, '#1-2-hold-timer-keepalive-negotiation');

  // 3. Verify CollapsibleTableOfContents and NoteDetailPage integration
  const tocSource = fs.readFileSync(
    path.resolve(process.cwd(), 'src/components/TableOfContents.tsx'),
    'utf8'
  );
  const noteDetailSource = fs.readFileSync(
    path.resolve(process.cwd(), 'src/pages/NoteDetailPage.tsx'),
    'utf8'
  );

  assert.ok(
    tocSource.includes('data-testid="collapsible-table-of-contents"') &&
      tocSource.includes('data-testid="collapsible-toc-toggle"') &&
      tocSource.includes('data-testid="collapsible-toc-panel"') &&
      tocSource.includes('data-testid="note-toc-collapse-toggle"') &&
      tocSource.includes('smoothScrollToHeading(headingId)'),
    'Expected TableOfContents.tsx to implement collapsible toggles and smoothScrollToHeading'
  );

  assert.ok(
    noteDetailSource.includes('<CollapsibleTableOfContents') &&
      noteDetailSource.includes('collapsible={true}') &&
      noteDetailSource.includes('isCollapsed={isTocCollapsed}'),
    'Expected NoteDetailPage.tsx to mount CollapsibleTableOfContents and collapsible sidebar TableOfContents'
  );
});

test('TableOfContents automatically expands if the current page has fewer than 5 headings, otherwise defaults to collapsed', async () => {
  const fs = await import('node:fs');
  const path = await import('node:path');
  const {
    TOC_AUTO_COLLAPSE_HEADING_THRESHOLD,
    shouldAutoExpandToc,
    shouldDefaultCollapseToc,
    generateTableOfContents,
  } = await import('../src/pages/NoteDetailPage');

  assert.equal(TOC_AUTO_COLLAPSE_HEADING_THRESHOLD, 5);

  // 1. Verify pages with fewer than 5 headings (1..4) automatically expand
  for (const count of [1, 2, 3, 4]) {
    assert.equal(
      shouldAutoExpandToc(count),
      true,
      `Expected shouldAutoExpandToc(${count}) to be true (< 5 headings)`
    );
    assert.equal(
      shouldDefaultCollapseToc(count),
      false,
      `Expected shouldDefaultCollapseToc(${count}) to be false (< 5 headings)`
    );
  }

  // 2. Verify pages with 5 or more headings default to collapsed
  for (const count of [5, 6, 8, 12]) {
    assert.equal(
      shouldAutoExpandToc(count),
      false,
      `Expected shouldAutoExpandToc(${count}) to be false (>= 5 headings)`
    );
    assert.equal(
      shouldDefaultCollapseToc(count),
      true,
      `Expected shouldDefaultCollapseToc(${count}) to be true (>= 5 headings)`
    );
  }

  // 3. Verify generateTableOfContents sets defaultCollapsed=false for 4 headings and defaultCollapsed=true for 5 headings
  const fourHeadingsHtml = `
    <h2>1. Overview</h2>
    <h3>1.1 Scope</h3>
    <h2>2. Verification</h2>
    <h3>2.1 CLI Checks</h3>
  `;
  const fourResult = generateTableOfContents(fourHeadingsHtml);
  assert.equal(fourResult.tocItems.length, 4);
  assert.equal(fourResult.shouldAutoExpand, true);
  assert.equal(fourResult.defaultCollapsed, false);

  const fiveHeadingsHtml = `
    <h2>1. Overview</h2>
    <h3>1.1 Scope</h3>
    <h2>2. Verification</h2>
    <h3>2.1 CLI Checks</h3>
    <h2>3. Escalation</h2>
  `;
  const fiveResult = generateTableOfContents(fiveHeadingsHtml);
  assert.equal(fiveResult.tocItems.length, 5);
  assert.equal(fiveResult.shouldAutoExpand, false);
  assert.equal(fiveResult.defaultCollapsed, true);

  // 4. Verify TableOfContents.tsx and NoteDetailPage.tsx wire the < 5 heading auto-expand logic
  const tocSource = fs.readFileSync(
    path.resolve(process.cwd(), 'src/components/TableOfContents.tsx'),
    'utf8'
  );
  const noteDetailSource = fs.readFileSync(
    path.resolve(process.cwd(), 'src/pages/NoteDetailPage.tsx'),
    'utf8'
  );

  assert.ok(
    tocSource.includes('shouldDefaultCollapseToc(items.length)') &&
      tocSource.includes('shouldAutoExpandToc(items.length)') &&
      tocSource.includes('data-auto-expanded={isAutoExpanded}') &&
      tocSource.includes('data-default-collapsed={computedDefaultCollapsed}'),
    'Expected TableOfContents.tsx to compute default collapse state from shouldDefaultCollapseToc(items.length)'
  );
  assert.ok(
    noteDetailSource.includes('shouldDefaultCollapseToc(tocItems.length)') &&
      noteDetailSource.includes('defaultCollapsed={defaultCollapsed}'),
    'Expected NoteDetailPage.tsx to initialize and pass defaultCollapsed based on shouldDefaultCollapseToc(tocItems.length)'
  );
});

test('renders a dynamic estimated read time indicator at the top of NoteDetailPage content calculated at ~200 WPM', async () => {
  const fs = await import('node:fs');
  const path = await import('node:path');
  const {
    AVERAGE_READING_SPEED_WPM,
    calculateEstimatedReadTime,
    calculateReadTimeMinutes,
    calculateReadTime,
  } = await import('../src/pages/NoteDetailPage');

  // 1. Verify default reading speed constant is 200 WPM
  assert.equal(AVERAGE_READING_SPEED_WPM, 200);

  // 2. Verify dynamic calculation across short, medium, and long technical guides at 200 WPM
  const shortContent = '<p>Check interface status and optical transceiver Rx power levels.</p>';
  const shortStats = calculateEstimatedReadTime(shortContent);
  assert.equal(shortStats.wordCount, 9);
  assert.equal(shortStats.minutes, 1);
  assert.equal(shortStats.wpm, 200);
  assert.equal(shortStats.formattedReadTime, '1 min read');
  assert.equal(shortStats.estimatedLabel, 'Estimated read time: 1 min read');
  assert.equal(shortStats.speedLabel, '~200 WPM');

  const fourHundredOneWords = `<h2>Guide</h2><p>${Array.from({ length: 400 }, (_, i) => `word${i}`).join(' ')}</p>`;
  const multiMinStats = calculateEstimatedReadTime(fourHundredOneWords);
  assert.equal(multiMinStats.wordCount, 401);
  assert.equal(multiMinStats.minutes, 3); // ceil(401 / 200) = 3
  assert.equal(calculateReadTimeMinutes(fourHundredOneWords, 200), 3);
  assert.equal(calculateReadTime(fourHundredOneWords, 200), '3 min read');
  assert.equal(multiMinStats.formattedReadTime, '3 min read');

  // 3. Verify ReadTimeProgressIndicator (variant="inline") and NoteDetailPage top-of-content integration
  const indicatorSource = fs.readFileSync(
    path.resolve(process.cwd(), 'src/components/ReadTimeProgressIndicator.tsx'),
    'utf8'
  );
  const noteDetailSource = fs.readFileSync(
    path.resolve(process.cwd(), 'src/pages/NoteDetailPage.tsx'),
    'utf8'
  );

  assert.ok(
    indicatorSource.includes('wpm = AVERAGE_READING_SPEED_WPM') &&
      indicatorSource.includes('data-wpm={safeWpm}') &&
      indicatorSource.includes('data-word-count={wordCount}') &&
      indicatorSource.includes('data-estimated-minutes={totalMinutes}') &&
      indicatorSource.includes('data-testid="estimated-read-time-label"') &&
      indicatorSource.includes('Estimated read time:'),
    'Expected ReadTimeProgressIndicator.tsx to calculate and display Estimated read time at ~200 WPM'
  );

  assert.ok(
    noteDetailSource.includes('wpm={AVERAGE_READING_SPEED_WPM}') &&
      noteDetailSource.includes('variant="inline"'),
    'Expected NoteDetailPage.tsx to mount ReadTimeProgressIndicator at the top of the article content with wpm={AVERAGE_READING_SPEED_WPM}'
  );
});

test('PrintPreviewModal renders a simulated A4 view of the current guide and allows toggling Table of Contents, images, and code blocks before sending to the native printer', async () => {
  const {
    A4_DIMENSIONS_MM,
    DEFAULT_PRINT_PREVIEW_OPTIONS,
    applyPrintPreviewTogglesToHtml,
    syncPrintPreviewAttributesToDom,
    sendPreviewToNativePrinter,
  } = await import('../src/pages/NoteDetailPage');

  // 1. Verify ISO 216 A4 dimensions and default toggles
  assert.equal(A4_DIMENSIONS_MM.widthMm, 210);
  assert.equal(A4_DIMENSIONS_MM.heightMm, 297);
  assert.deepEqual(DEFAULT_PRINT_PREVIEW_OPTIONS, {
    includeToc: true,
    includeImages: true,
    includeCodeBlocks: true,
    includeMetadataHeader: true,
  });

  // 2. Verify applyPrintPreviewTogglesToHtml keeps or removes images/diagrams and code blocks
  const sampleHtml = `
    <h2 id="overview">Overview<button class="note-heading-copy-btn">Copy Link</button></h2>
    <p>Inspect the fiber patch panel.</p>
    <figure><img src="/images/fiber.png" alt="Fiber Patch Panel" /></figure>
    <pre><code>show interfaces status</code></pre>
  `;

  const withAllEnabled = applyPrintPreviewTogglesToHtml(sampleHtml, {
    includeImages: true,
    includeCodeBlocks: true,
  });
  assert.ok(withAllEnabled.includes('<img src="/images/fiber.png"'));
  assert.ok(withAllEnabled.includes('<pre><code>show interfaces status</code></pre>'));
  assert.ok(
    !withAllEnabled.includes('note-heading-copy-btn'),
    'Expected interactive heading copy buttons to be stripped from simulated A4 view'
  );

  const withoutImages = applyPrintPreviewTogglesToHtml(sampleHtml, {
    includeImages: false,
    includeCodeBlocks: true,
  });
  assert.ok(!withoutImages.includes('<img'));
  assert.ok(!withoutImages.includes('<figure>'));
  assert.ok(withoutImages.includes('<pre><code>show interfaces status</code></pre>'));

  const withoutCode = applyPrintPreviewTogglesToHtml(sampleHtml, {
    includeImages: true,
    includeCodeBlocks: false,
  });
  assert.ok(withoutCode.includes('<img src="/images/fiber.png"'));
  assert.ok(!withoutCode.includes('<pre>'));

  // 3. Verify syncPrintPreviewAttributesToDom and sendPreviewToNativePrinter configure DOM attributes and invoke native print
  const rootAttrs = new Map<string, string>();
  let recordedDuringPrint: Record<string, string | undefined> = {};
  let printCalls = 0;

  const mockDoc = {
    title: 'Original Page Title',
    documentElement: {
      setAttribute: (name: string, val: string) => {
        rootAttrs.set(name, val);
      },
      removeAttribute: (name: string) => {
        rootAttrs.delete(name);
      },
    },
    querySelector: () => ({
      setAttribute: () => {},
      removeAttribute: () => {},
    }),
  };

  syncPrintPreviewAttributesToDom(
    { includeToc: false, includeImages: false },
    mockDoc
  );
  assert.equal(rootAttrs.get('data-print-hide-toc'), 'true');
  assert.equal(rootAttrs.get('data-print-hide-images'), 'true');

  const printResult = sendPreviewToNativePrinter({
    documentTitle: 'RJ45 Wiring Guide',
    includeToc: false,
    includeImages: true,
    docOverride: mockDoc,
    winOverride: {
      print: () => {
        printCalls += 1;
        recordedDuringPrint = {
          hideToc: rootAttrs.get('data-print-hide-toc'),
          hideImages: rootAttrs.get('data-print-hide-images'),
          format: rootAttrs.get('data-print-format'),
        };
      },
    },
  });

  assert.equal(printResult.ok, true);
  assert.equal(printCalls, 1);
  assert.equal(printResult.format, 'A4');
  assert.equal(recordedDuringPrint.hideToc, 'true');
  assert.equal(recordedDuringPrint.hideImages, 'false');
  assert.equal(recordedDuringPrint.format, 'A4');

  // 4. Verify PrintPreviewModal.tsx and NoteDetailPage.tsx integration
  const fs = await import('node:fs');
  const path = await import('node:path');
  const modalSource = fs.readFileSync(
    path.resolve(process.cwd(), 'src/components/PrintPreviewModal.tsx'),
    'utf8'
  );
  const noteDetailSource = fs.readFileSync(
    path.resolve(process.cwd(), 'src/pages/NoteDetailPage.tsx'),
    'utf8'
  );

  assert.ok(
    modalSource.includes('data-testid="print-preview-modal"') &&
      modalSource.includes('data-testid="print-preview-a4-sheet"') &&
      modalSource.includes('data-testid="print-preview-toggle-toc"') &&
      modalSource.includes('data-testid="print-preview-toggle-images"') &&
      modalSource.includes('data-testid="print-preview-confirm-print-btn"'),
    'Expected PrintPreviewModal.tsx to render simulated A4 sheet and TOC/image toggles'
  );

  assert.ok(
    noteDetailSource.includes('<PrintPreviewButton') &&
      noteDetailSource.includes('<PrintPreviewModal'),
    'Expected NoteDetailPage.tsx to mount PrintPreviewButton and PrintPreviewModal'
  );
});

test('expands offline mode capabilities to allow pinning/downloading technical guides for offline access with a Download for Offline button in NoteDetailPage toolbar', async () => {
  const fs = await import('node:fs');
  const path = await import('node:path');
  const {
    OFFLINE_GUIDES_STORAGE_KEY,
    DOWNLOAD_FOR_OFFLINE_LABEL,
    OFFLINE_PINNED_LABEL,
    getOfflinePinnedGuides,
    getOfflinePinnedGuideBySlug,
    isGuidePinnedForOffline,
    isPinnedOfflineGuidePath,
    pinGuideForOffline,
    unpinGuideFromOffline,
    toggleGuideOfflinePin,
    formatOfflineSize,
  } = await import('../src/pages/NoteDetailPage');
  const { isCachedOfflineToolPath } = await import(
    '../src/components/OfflineModeFallback'
  );

  assert.equal(DOWNLOAD_FOR_OFFLINE_LABEL, 'Download for Offline');
  assert.equal(OFFLINE_PINNED_LABEL, 'Pinned for Offline');

  const store = new Map<string, string>();
  const mockStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => {
      store.set(k, v);
    },
    removeItem: (k: string) => {
      store.delete(k);
    },
  };

  // 1. Initially no guides are pinned for offline access
  assert.equal(getOfflinePinnedGuides(mockStorage).length, 0);
  assert.equal(isGuidePinnedForOffline('rj45-ethernet-wiring-color-codes', mockStorage), false);
  assert.equal(
    isPinnedOfflineGuidePath('/notes/rj45-ethernet-wiring-color-codes', mockStorage),
    false
  );

  // 2. Toggle offline pin on a technical guide -> stores full content and metadata in localStorage
  const toggleOn = toggleGuideOfflinePin(
    {
      slug: 'rj45-ethernet-wiring-color-codes',
      title: 'RJ45 T568A & T568B Pinout Reference',
      description: 'Ethernet termination pinout and pair color coding.',
      category: 'Networking',
      content: '<h2>Pinout Table</h2><p>Pin 1 White/Orange...</p>',
    },
    mockStorage
  );

  assert.equal(toggleOn.pinned, true);
  assert.ok(store.has(OFFLINE_GUIDES_STORAGE_KEY));
  assert.equal(isGuidePinnedForOffline('rj45-ethernet-wiring-color-codes', mockStorage), true);
  assert.equal(
    isPinnedOfflineGuidePath('/notes/rj45-ethernet-wiring-color-codes', mockStorage),
    true
  );
  assert.equal(
    isCachedOfflineToolPath('/notes/rj45-ethernet-wiring-color-codes', mockStorage),
    true
  );

  const pinnedRecord = getOfflinePinnedGuideBySlug(
    'rj45-ethernet-wiring-color-codes',
    mockStorage
  );
  assert.ok(pinnedRecord);
  assert.equal(pinnedRecord?.title, 'RJ45 T568A & T568B Pinout Reference');
  assert.ok(pinnedRecord!.sizeBytes > 0);
  assert.ok(formatOfflineSize(pinnedRecord!.sizeBytes).length > 0);

  // 3. Pin a second guide and then unpin the first
  pinGuideForOffline(
    {
      slug: 'vlan-trunking-8021q-guide',
      title: 'IEEE 802.1Q VLAN Trunking Guide',
      description: 'Configure native VLANs and allowed VLAN lists.',
      category: 'Switching',
      content: '<h2>802.1Q Tagging</h2><p>4-byte header...</p>',
    },
    mockStorage
  );
  assert.equal(getOfflinePinnedGuides(mockStorage).length, 2);

  unpinGuideFromOffline('rj45-ethernet-wiring-color-codes', mockStorage);
  assert.equal(isGuidePinnedForOffline('rj45-ethernet-wiring-color-codes', mockStorage), false);
  assert.equal(getOfflinePinnedGuides(mockStorage).length, 1);

  // 4. Verify NoteDetailPage.tsx toolbar button and OfflineModeFallback.tsx pinned guides section
  const noteDetailSource = fs.readFileSync(
    path.resolve(process.cwd(), 'src/pages/NoteDetailPage.tsx'),
    'utf8'
  );
  const offlineFallbackSource = fs.readFileSync(
    path.resolve(process.cwd(), 'src/components/OfflineModeFallback.tsx'),
    'utf8'
  );

  assert.ok(
    noteDetailSource.includes('data-testid="note-download-offline-btn"') &&
      noteDetailSource.includes('DOWNLOAD_FOR_OFFLINE_LABEL') &&
      noteDetailSource.includes('handleToggleOfflinePin'),
    'Expected NoteDetailPage.tsx toolbar to render the Download for Offline button'
  );

  assert.ok(
    offlineFallbackSource.includes('data-testid="offline-pinned-guides-section"') &&
      offlineFallbackSource.includes('data-testid="offline-pinned-guides-count"'),
    'Expected OfflineModeFallback.tsx to render the pinned offline technical guides section'
  );
});

test('displays a visual progress notification toast when pinning or downloading a guide for offline access', async () => {
  const fs = await import('node:fs');
  const path = await import('node:path');
  const {
    createInitialOfflineDownloadProgressState,
    buildOfflineDownloadProgressSteps,
    toggleGuideOfflinePinWithProgress,
    clearOfflinePinnedGuides,
  } = await import('../src/pages/NoteDetailPage');

  const store = new Map<string, string>();
  const mockStorage = {
    getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
    setItem: (key: string, val: string) => store.set(key, val),
    removeItem: (key: string) => store.delete(key),
  };

  clearOfflinePinnedGuides(mockStorage);

  // 1. Verify initial idle state
  const initial = createInitialOfflineDownloadProgressState();
  assert.equal(initial.visible, false);
  assert.equal(initial.stage, 'idle');
  assert.equal(initial.progressPercent, 0);

  // 2. Verify pin progress steps sequence (25% -> 65% -> 90% -> 100%)
  const pinSteps = buildOfflineDownloadProgressSteps(
    {
      slug: 'bgp-route-reflector-design',
      title: 'BGP Route Reflector Design Guide',
      description: 'Redundant RR cluster architecture and loop prevention.',
      category: 'Routing',
      content: '<h2>Cluster ID</h2><p>ORIGINATOR_ID and CLUSTER_LIST attributes.</p>',
    },
    'pin'
  );

  assert.equal(pinSteps.length, 4);
  assert.deepEqual(
    pinSteps.map((s) => s.stage),
    ['preparing', 'caching', 'verifying', 'completed']
  );
  assert.deepEqual(
    pinSteps.map((s) => s.progressPercent),
    [25, 65, 90, 100]
  );
  assert.ok(pinSteps.every((s) => s.visible === true && s.action === 'pin'));
  assert.ok(pinSteps[3].statusMessage.includes('Pinned & downloaded for offline access'));

  // 3. Verify toggleGuideOfflinePinWithProgress emits progress steps for both pin and unpin
  const emittedPinSteps: ReturnType<typeof buildOfflineDownloadProgressSteps> = [];
  const pinResult = toggleGuideOfflinePinWithProgress(
    {
      slug: 'bgp-route-reflector-design',
      title: 'BGP Route Reflector Design Guide',
      content: '<h2>Cluster ID</h2><p>ORIGINATOR_ID and CLUSTER_LIST attributes.</p>',
    },
    (step) => emittedPinSteps.push(step),
    mockStorage
  );

  assert.equal(pinResult.pinned, true);
  assert.equal(emittedPinSteps.length, 4);
  assert.equal(pinResult.finalState.stage, 'completed');
  assert.equal(pinResult.finalState.progressPercent, 100);

  const emittedUnpinSteps: ReturnType<typeof buildOfflineDownloadProgressSteps> = [];
  const unpinResult = toggleGuideOfflinePinWithProgress(
    {
      slug: 'bgp-route-reflector-design',
      title: 'BGP Route Reflector Design Guide',
    },
    (step) => emittedUnpinSteps.push(step),
    mockStorage
  );

  assert.equal(unpinResult.pinned, false);
  assert.equal(emittedUnpinSteps.length, 2);
  assert.equal(unpinResult.finalState.stage, 'removed');
  assert.equal(unpinResult.finalState.progressPercent, 100);

  // 4. Verify NoteDetailPage.tsx renders the visual progress notification toast with progress bar
  const noteDetailSource = fs.readFileSync(
    path.resolve(process.cwd(), 'src/pages/NoteDetailPage.tsx'),
    'utf8'
  );

  assert.ok(
    noteDetailSource.includes('data-testid="offline-download-progress-toast"') &&
      noteDetailSource.includes('data-testid="offline-download-progress-bar"') &&
      noteDetailSource.includes('data-testid="offline-download-progress-bar-fill"') &&
      noteDetailSource.includes('data-testid="offline-download-toast-percent"') &&
      noteDetailSource.includes('data-testid="offline-download-toast-status"'),
    'Expected NoteDetailPage.tsx to render the visual offline download progress toast and progressbar'
  );
});

test('adds a Copy link button to each item in the Table of Contents of NoteDetailPage that copies a deep link to that specific section header to the clipboard', async () => {
  const fs = await import('node:fs');
  const path = await import('node:path');
  const {
    TOC_ITEM_COPY_LINK_LABEL,
    TOC_ITEM_COPIED_LABEL,
    copyTocItemDeepLink,
    generateTableOfContents,
    buildTocAnchorUrl,
  } = await import('../src/pages/NoteDetailPage');

  assert.equal(TOC_ITEM_COPY_LINK_LABEL, 'Copy link');
  assert.equal(TOC_ITEM_COPIED_LABEL, 'Copied');

  // 1. Extract TOC items for a technical guide
  const html = `
    <h2>1. Inspecting LACP EtherChannel Bundles</h2>
    <p>Check member port state flags.</p>
    <h3>1.1 Verifying LACP PDU Timers</h3>
    <p>Fast (1s) vs Slow (30s) LACP rate.</p>
    <h2>2. Diagnosing Port-Channel Load Balancing</h2>
  `;
  const { tocItems } = generateTableOfContents(html);
  assert.equal(tocItems.length, 3);

  // 2. Verify copying a deep link for each TOC item writes the exact section URL (#heading-id) to the user's clipboard
  const copiedLinks: string[] = [];
  const replacedHashes: string[] = [];
  const baseUrl = 'https://jawed.co.in/notes/lacp-etherchannel-troubleshooting';

  for (const item of tocItems) {
    const result = await copyTocItemDeepLink(
      item.id,
      baseUrl,
      {
        writeText: async (text: string) => {
          copiedLinks.push(text);
        },
      },
      {
        location: { href: baseUrl },
        history: {
          replaceState: (_data: unknown, _unused: string, url?: string | null) => {
            if (url) replacedHashes.push(url);
          },
        },
      }
    );

    assert.equal(result.ok, true);
    assert.equal(result.headingId, item.id);
    assert.equal(result.anchorUrl, buildTocAnchorUrl(baseUrl, item.id));
  }

  assert.deepEqual(copiedLinks, [
    'https://jawed.co.in/notes/lacp-etherchannel-troubleshooting#1-inspecting-lacp-etherchannel-bundles',
    'https://jawed.co.in/notes/lacp-etherchannel-troubleshooting#1-1-verifying-lacp-pdu-timers',
    'https://jawed.co.in/notes/lacp-etherchannel-troubleshooting#2-diagnosing-port-channel-load-balancing',
  ]);
  assert.deepEqual(replacedHashes, [
    '#1-inspecting-lacp-etherchannel-bundles',
    '#1-1-verifying-lacp-pdu-timers',
    '#2-diagnosing-port-channel-load-balancing',
  ]);

  // 3. Verify TableOfContents.tsx renders the 'Copy link' button for each TOC item and NoteDetailPage.tsx wires onCopyHeadingLink
  const tocSource = fs.readFileSync(
    path.resolve(process.cwd(), 'src/components/TableOfContents.tsx'),
    'utf8'
  );
  const noteDetailSource = fs.readFileSync(
    path.resolve(process.cwd(), 'src/pages/NoteDetailPage.tsx'),
    'utf8'
  );

  assert.ok(
    tocSource.includes('data-toc-copy-heading-id={item.id}') &&
      tocSource.includes('data-toc-deep-link={deepLinkUrl}') &&
      tocSource.includes('data-testid={`${idPrefix}-copy-toc-link-${item.id}`}') &&
      tocSource.includes('TOC_ITEM_COPY_LINK_LABEL'),
    'Expected TableOfContents.tsx to render a Copy link button with deep-link attributes for each TOC item'
  );

  assert.ok(
    noteDetailSource.includes('onCopyHeadingLink={handleCopySectionLink}') &&
      noteDetailSource.includes('copyHeadingDeepLink(headingId)'),
    'Expected NoteDetailPage.tsx to wire onCopyHeadingLink to copy the section deep link and show toast feedback'
  );
});

test('introduces a Print Guide button to the NoteDetailPage toolbar that triggers a print-friendly version of the guide formatted for optimal reading on paper', async () => {
  const fs = await import('node:fs');
  const path = await import('node:path');
  const {
    PrintGuideButton,
    PRINT_GUIDE_LABEL,
    triggerPaperFriendlyGuidePrint,
  } = await import('../src/pages/NoteDetailPage');

  assert.equal(PRINT_GUIDE_LABEL, 'Print Guide');
  assert.equal(typeof PrintGuideButton, 'function');
  assert.equal(typeof triggerPaperFriendlyGuidePrint, 'function');

  // 1. Verify triggerPaperFriendlyGuidePrint applies paper-optimized attributes on <html> and target guide element during print and restores cleanly afterward
  const docElementAttrs = new Map<string, string>();
  const targetElementAttrs = new Map<string, string>();
  let printExecuted = false;
  let capturedPaperOptimizedDuringPrint: string | undefined;
  let capturedTargetAttrDuringPrint: string | undefined;

  const mockTargetElement = {
    getAttribute: (name: string) => targetElementAttrs.get(name) ?? null,
    setAttribute: (name: string, value: string) => {
      targetElementAttrs.set(name, value);
    },
    removeAttribute: (name: string) => {
      targetElementAttrs.delete(name);
    },
  };

  const mockDoc = {
    title: 'Original Site Title',
    documentElement: {
      getAttribute: (name: string) => docElementAttrs.get(name) ?? null,
      setAttribute: (name: string, value: string) => {
        docElementAttrs.set(name, value);
      },
      removeAttribute: (name: string) => {
        docElementAttrs.delete(name);
      },
    },
    querySelector: (selector: string) => {
      if (selector === '.quick-note-article') {
        return mockTargetElement as unknown as Element;
      }
      return null;
    },
  } as unknown as Document;

  const mockWin = {
    print: () => {
      printExecuted = true;
      capturedPaperOptimizedDuringPrint = docElementAttrs.get('data-print-paper-optimized');
      capturedTargetAttrDuringPrint = targetElementAttrs.get('data-paper-friendly-guide');
    },
    addEventListener: () => {},
    removeEventListener: () => {},
  } as unknown as Window;

  const result = triggerPaperFriendlyGuidePrint({
    documentTitle: 'BGP Path Selection & Route Reflector Design',
    targetSelector: '.quick-note-article',
    win: mockWin,
    doc: mockDoc,
  });

  assert.equal(printExecuted, true, 'Expected window.print() to be invoked when Print Guide is triggered');
  assert.equal(result.printed, true);
  assert.equal(result.paperOptimized, true);
  assert.equal(result.format, 'A4');
  assert.equal(result.exportScope, 'guide');
  assert.equal(
    capturedPaperOptimizedDuringPrint,
    'true',
    'Expected html[data-print-paper-optimized="true"] to be active while printing'
  );
  assert.equal(
    capturedTargetAttrDuringPrint,
    'true',
    'Expected .quick-note-article[data-paper-friendly-guide="true"] to be active while printing'
  );
  assert.equal(
    docElementAttrs.has('data-print-paper-optimized'),
    false,
    'Expected data-print-paper-optimized attribute to be cleaned up after printing completes'
  );
  assert.equal(
    targetElementAttrs.has('data-paper-friendly-guide'),
    false,
    'Expected data-paper-friendly-guide attribute to be cleaned up after printing completes'
  );

  // 2. Verify NoteDetailPage.tsx renders <PrintGuideButton> in the toolbar alongside PrintableBadge, PrintPreviewButton, and ExportToPdfButton
  const noteDetailSource = fs.readFileSync(
    path.resolve(process.cwd(), 'src/pages/NoteDetailPage.tsx'),
    'utf8'
  );
  assert.ok(
    noteDetailSource.includes('<PrintGuideButton') &&
      noteDetailSource.includes('targetSelector=".quick-note-article"'),
    'Expected NoteDetailPage.tsx toolbar to render <PrintGuideButton> targeting .quick-note-article'
  );

  // 3. Verify ExportToPdfButton.tsx defines data-testid="note-print-guide-btn" and data-print-mode="paper-friendly"
  const exportBtnSource = fs.readFileSync(
    path.resolve(process.cwd(), 'src/components/common/ExportToPdfButton.tsx'),
    'utf8'
  );
  assert.ok(
    exportBtnSource.includes('data-testid="note-print-guide-btn"') &&
      exportBtnSource.includes('data-print-mode="paper-friendly"'),
    'Expected PrintGuideButton to expose data-testid="note-print-guide-btn" and data-print-mode="paper-friendly"'
  );

  // 4. Verify src/styles/print.css includes paper-friendly reading typography and hides the Print Guide button in @media print
  const printCssSource = fs.readFileSync(
    path.resolve(process.cwd(), 'src/styles/print.css'),
    'utf8'
  );
  assert.ok(
    printCssSource.includes('[data-testid="note-print-guide-btn"]') &&
      printCssSource.includes('.print-guide-btn') &&
      printCssSource.includes('html[data-print-paper-optimized="true"] .quick-note-article') &&
      printCssSource.includes('[data-paper-friendly-guide="true"]'),
    'Expected src/styles/print.css to hide the Print Guide button in @media print and apply paper-optimized reading styles'
  );
});

test('adds a visual sync status indicator and icon to the offline guides list showing whether the locally stored guide version matches the latest metadata available from the application', async () => {
  const fs = await import('node:fs');
  const path = await import('node:path');
  const {
    OFFLINE_SYNC_STATUS_LABELS,
    pinGuideForOffline,
    getOfflinePinnedGuideBySlug,
    clearOfflinePinnedGuides,
    evaluateOfflineGuideSyncStatus,
    evaluateAllOfflineGuidesSyncStatus,
    syncOfflineGuideWithLatestMetadata,
  } = await import('../src/components/OfflineModeFallback');

  const store = new Map<string, string>();
  const mockStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => {
      store.set(k, v);
    },
    removeItem: (k: string) => {
      store.delete(k);
    },
  };

  clearOfflinePinnedGuides(mockStorage);

  // 1. Pin a guide from notesData.json so its local metadata matches the application catalog
  const sampleNote = notesData[0]!;
  pinGuideForOffline(
    {
      slug: sampleNote.slug,
      title: sampleNote.title,
      description: sampleNote.description,
      category: sampleNote.category,
      content: sampleNote.content,
    },
    mockStorage
  );

  const storedMatching = getOfflinePinnedGuideBySlug(sampleNote.slug, mockStorage)!;
  assert.ok(storedMatching, 'Expected guide to be stored in offline storage');

  const syncedEvaluation = evaluateOfflineGuideSyncStatus(storedMatching);
  assert.equal(syncedEvaluation.status, 'synced');
  assert.equal(syncedEvaluation.isUpToDate, true);
  assert.equal(syncedEvaluation.hasUpdateAvailable, false);
  assert.equal(syncedEvaluation.label, OFFLINE_SYNC_STATUS_LABELS.synced);
  assert.equal(syncedEvaluation.changedFields.length, 0);
  assert.equal(syncedEvaluation.storedVersion, syncedEvaluation.latestVersion);

  // 2. Simulate an updated version in the application metadata catalog (updated description + lastUpdated date)
  const updatedAppCatalog = [
    {
      slug: sampleNote.slug,
      title: sampleNote.title,
      description: `${sampleNote.description} (Revised with 2026 enterprise security controls)`,
      category: sampleNote.category,
      content: sampleNote.content.replace('Updated: 2026-10-13', 'Updated: 2026-11-15'),
      lastUpdated: '2026-11-15',
      version: '2026.11.15-r2',
    },
  ];

  const outdatedEvaluation = evaluateOfflineGuideSyncStatus(storedMatching, updatedAppCatalog);
  assert.equal(outdatedEvaluation.status, 'update-available');
  assert.equal(outdatedEvaluation.isUpToDate, false);
  assert.equal(outdatedEvaluation.hasUpdateAvailable, true);
  assert.equal(outdatedEvaluation.label, OFFLINE_SYNC_STATUS_LABELS['update-available']);
  assert.ok(outdatedEvaluation.changedFields.includes('description'));
  assert.ok(outdatedEvaluation.changedFields.includes('lastUpdated'));

  const batchEvaluations = evaluateAllOfflineGuidesSyncStatus(
    [storedMatching],
    updatedAppCatalog,
    mockStorage
  );
  assert.equal(batchEvaluations[sampleNote.slug]?.status, 'update-available');

  // 3. Synchronize the locally stored guide with the latest application metadata and verify it becomes 'synced'
  const resyncedGuide = syncOfflineGuideWithLatestMetadata(
    sampleNote.slug,
    updatedAppCatalog,
    mockStorage
  );
  assert.ok(resyncedGuide);
  assert.equal(
    resyncedGuide?.description,
    `${sampleNote.description} (Revised with 2026 enterprise security controls)`
  );

  const postSyncEvaluation = evaluateOfflineGuideSyncStatus(resyncedGuide!, updatedAppCatalog);
  assert.equal(postSyncEvaluation.status, 'synced');
  assert.equal(postSyncEvaluation.isUpToDate, true);
  assert.equal(postSyncEvaluation.hasUpdateAvailable, false);

  // 4. Verify OfflineModeFallback.tsx renders the visual sync status indicator, icon, and Sync Latest button
  const offlineFallbackSource = fs.readFileSync(
    path.resolve(process.cwd(), 'src/components/OfflineModeFallback.tsx'),
    'utf8'
  );
  assert.ok(
    offlineFallbackSource.includes('data-testid={`offline-guide-sync-status-${guide.slug}`}') &&
      offlineFallbackSource.includes('data-testid={`offline-guide-sync-icon-${guide.slug}`}') &&
      offlineFallbackSource.includes('data-testid={`offline-sync-guide-btn-${guide.slug}`}') &&
      offlineFallbackSource.includes('data-testid="offline-guides-sync-summary"'),
    'Expected OfflineModeFallback.tsx to render the visual sync status indicator, icon, summary badge, and Sync Latest button'
  );
});

test('adds a dynamic estimated read time indicator to the top of each NoteDetailPage calculating time based on word count and displaying it as a compact badge', async () => {
  const fs = await import('node:fs');
  const path = await import('node:path');
  const {
    AVERAGE_READING_SPEED_WPM,
    formatCompactReadTimeBadge,
    getHeaderReadTimeDetails,
    EstimatedReadTimeBadge,
  } = await import('../src/pages/NoteDetailPage');

  assert.equal(typeof EstimatedReadTimeBadge, 'function');
  assert.equal(typeof formatCompactReadTimeBadge, 'function');

  // 1. Verify dynamic word count and read time calculation for short, medium, and long notes
  const shortNoteHtml = '<h2>Check Link Status</h2><p>Verify SFP+ optical signal and VLAN trunk encapsulation.</p>';
  const shortBadge = formatCompactReadTimeBadge(shortNoteHtml);
  assert.equal(shortBadge.wordCount, 11);
  assert.equal(shortBadge.minutes, 1);
  assert.equal(shortBadge.wpm, AVERAGE_READING_SPEED_WPM);
  assert.equal(shortBadge.badgeText, '1 min read');
  assert.equal(shortBadge.compactLabel, 'Estimated read time: 1 min read');
  assert.equal(shortBadge.fullBadgeLabel, '1 min read • 11 words');
  assert.equal(shortBadge.tooltip, 'Estimated read time: 1 min read (11 words at ~200 WPM)');

  const eightHundredFiftyWords = `<h2>Enterprise OSPF Troubleshooting</h2><p>${Array.from(
    { length: 847 },
    (_, idx) => `packet${idx}`
  ).join(' ')}</p>`;
  const multiMinBadge = formatCompactReadTimeBadge(eightHundredFiftyWords);
  assert.equal(multiMinBadge.wordCount, 850);
  assert.equal(multiMinBadge.minutes, 5); // ceil(850 / 200) = 5
  assert.equal(multiMinBadge.badgeText, '5 min read');
  assert.equal(multiMinBadge.fullBadgeLabel, '5 min read • 850 words');

  // 2. Verify all published notes in notesData.json produce valid compact badge metrics
  for (const note of notesData) {
    const details = getHeaderReadTimeDetails(note.content || note.description);
    assert.ok(details.wordCount > 0, `Expected positive word count for ${note.slug}`);
    assert.ok(details.minutes >= 1, `Expected >= 1 min read time for ${note.slug}`);
    assert.equal(details.badgeText, `${details.minutes} min read`);
    assert.ok(details.tooltip.includes(`${details.minutes} min read`));
  }

  // 3. Verify NoteDetailPage.tsx, FieldGuideDetailPage.tsx, and ReadTimeProgressIndicator.tsx render the compact badge at the top of each page
  const noteDetailSource = fs.readFileSync(
    path.resolve(process.cwd(), 'src/pages/NoteDetailPage.tsx'),
    'utf8'
  );
  const fieldGuideSource = fs.readFileSync(
    path.resolve(process.cwd(), 'src/pages/FieldGuideDetailPage.tsx'),
    'utf8'
  );
  const indicatorSource = fs.readFileSync(
    path.resolve(process.cwd(), 'src/components/ReadTimeProgressIndicator.tsx'),
    'utf8'
  );

  assert.ok(
    indicatorSource.includes('export const EstimatedReadTimeBadge') &&
      indicatorSource.includes('note-read-time-compact-badge') &&
      indicatorSource.includes('data-compact-badge="true"'),
    'Expected ReadTimeProgressIndicator.tsx to export EstimatedReadTimeBadge with compact badge attributes'
  );

  assert.ok(
    noteDetailSource.includes('note-estimated-read-time-badge note-read-time-compact-badge') &&
      noteDetailSource.includes('data-compact-badge="true"') &&
      noteDetailSource.includes('<EstimatedReadTimeBadge'),
    'Expected NoteDetailPage.tsx to display the dynamic estimated read time compact badge at the top of the page'
  );

  assert.ok(
    fieldGuideSource.includes('<EstimatedReadTimeBadge') &&
      fieldGuideSource.includes('targetSelector=".article-body"'),
    'Expected FieldGuideDetailPage.tsx to display the dynamic EstimatedReadTimeBadge in the top header'
  );
});

test('adds a Copy to Clipboard button to the tool-output component for better accessibility and user workflow', async () => {
  const fs = await import('node:fs');
  const path = await import('node:path');
  const {
    ToolOutput,
    TOOL_OUTPUT_COPY_BUTTON_LABEL,
    TOOL_OUTPUT_COPIED_LABEL,
    TOOL_OUTPUT_LIVE_REGION_MESSAGE,
    copyToolOutputText,
    copyCodeBlockRawText,
    injectCodeBlockMarkdownCopyButtons,
  } = await import('../src/pages/NoteDetailPage');

  assert.equal(typeof ToolOutput, 'function');
  assert.equal(TOOL_OUTPUT_COPY_BUTTON_LABEL, 'Copy to Clipboard');
  assert.equal(TOOL_OUTPUT_COPIED_LABEL, 'Copied to Clipboard!');
  assert.equal(TOOL_OUTPUT_LIVE_REGION_MESSAGE, 'Tool output copied to clipboard.');

  // 1. Verify copyToolOutputText copies output text and returns accessible status announcement
  let copiedOutput = '';
  const copyRes = await copyToolOutputText(
    'Ticket: INC-84920 | Status: Resolved | Root Cause: Cached OAuth token mismatch',
    {
      writeText: async (text: string) => {
        copiedOutput = text;
      },
    }
  );
  assert.equal(copyRes.ok, true);
  assert.equal(
    copiedOutput,
    'Ticket: INC-84920 | Status: Resolved | Root Cause: Cached OAuth token mismatch'
  );
  assert.equal(copyRes.label, 'Copied to Clipboard!');
  assert.equal(copyRes.announcement, 'Tool output copied to clipboard.');

  // Empty output returns ok: false gracefully
  const emptyRes = await copyToolOutputText('   ', {
    writeText: async () => {},
  });
  assert.equal(emptyRes.ok, false);
  assert.equal(emptyRes.label, 'Copy to Clipboard');

  // 2. Verify <pre class="tool-output"> blocks in NoteDetailPage receive a Copy to Clipboard button alongside Copy as Markdown
  const sampleToolOutputHtml = `
    <h2>Net-worth example</h2>
    <pre class="tool-output">Net worth = ₹8,00,000 &minus; ₹3,00,000 = ₹5,00,000</pre>
  `;
  const enhancedHtml = injectCodeBlockMarkdownCopyButtons(sampleToolOutputHtml);
  assert.ok(
    enhancedHtml.includes('data-testid="tool-output-copy-btn"') &&
      enhancedHtml.includes('data-copy-tool-output-id="note-code-block-1"') &&
      enhancedHtml.includes('<span class="tool-output-copy-text">Copy to Clipboard</span>'),
    'Expected <pre class="tool-output"> to include a Copy to Clipboard button'
  );

  const rawCopiedStateHtml = injectCodeBlockMarkdownCopyButtons(
    sampleToolOutputHtml,
    'raw:note-code-block-1'
  );
  assert.ok(
    rawCopiedStateHtml.includes('class="tool-output-copy-btn note-code-copy-raw-btn is-copied"') &&
      rawCopiedStateHtml.includes('<span class="tool-output-copy-text">Copied to Clipboard!</span>'),
    'Expected Copy to Clipboard button to render Copied to Clipboard! state when active'
  );

  let rawBlockCopied = '';
  const rawBlockRes = await copyCodeBlockRawText(
    'Net worth = ₹8,00,000 &amp; ₹3,00,000',
    { blockId: 'note-code-block-1' },
    {
      writeText: async (t: string) => {
        rawBlockCopied = t;
      },
    }
  );
  assert.equal(rawBlockRes.ok, true);
  assert.equal(rawBlockCopied, 'Net worth = ₹8,00,000 & ₹3,00,000');
  assert.equal(rawBlockRes.toastMessage, 'Copied to Clipboard!');

  // 3. Verify ToolOutput.tsx and tool components integrate the accessible Copy to Clipboard button
  const toolOutputSource = fs.readFileSync(
    path.resolve(process.cwd(), 'src/components/common/ToolOutput.tsx'),
    'utf8'
  );
  const serviceDeskSource = fs.readFileSync(
    path.resolve(process.cwd(), 'src/tools/ServiceDeskNoteFormatter.tsx'),
    'utf8'
  );
  const ticketKbSource = fs.readFileSync(
    path.resolve(process.cwd(), 'src/tools/TicketToKbDraft.tsx'),
    'utf8'
  );
  const triageSource = fs.readFileSync(
    path.resolve(process.cwd(), 'src/tools/ItTroubleshootingAssistant.tsx'),
    'utf8'
  );
  const promptBuilderSource = fs.readFileSync(
    path.resolve(process.cwd(), 'src/tools/AiPromptBuilder.tsx'),
    'utf8'
  );

  const ipv4Source = fs.readFileSync(
    path.resolve(process.cwd(), 'src/tools/Ipv4SubnetCalculator.tsx'),
    'utf8'
  );
  const rackPowerSource = fs.readFileSync(
    path.resolve(process.cwd(), 'src/tools/ServerRackPowerBtuCalculator.tsx'),
    'utf8'
  );
  const inflationSource = fs.readFileSync(
    path.resolve(process.cwd(), 'src/tools/InflationGoalCalculator.tsx'),
    'utf8'
  );
  const compoundSource = fs.readFileSync(
    path.resolve(process.cwd(), 'src/tools/CompoundGrowthCalculator.tsx'),
    'utf8'
  );
  const retirementSource = fs.readFileSync(
    path.resolve(process.cwd(), 'src/tools/RetirementPlanningCalculator.tsx'),
    'utf8'
  );
  const financeSnapshotSource = fs.readFileSync(
    path.resolve(process.cwd(), 'src/tools/PersonalFinanceSnapshot.tsx'),
    'utf8'
  );
  const interviewPrepSource = fs.readFileSync(
    path.resolve(process.cwd(), 'src/tools/InterviewPrepPlanner.tsx'),
    'utf8'
  );
  const resumeBulletSource = fs.readFileSync(
    path.resolve(process.cwd(), 'src/tools/ResumeBulletStrengthChecker.tsx'),
    'utf8'
  );

  assert.ok(
    toolOutputSource.includes("TOOL_OUTPUT_COPY_BUTTON_LABEL = 'Copy to Clipboard'") &&
      toolOutputSource.includes('tool-output-inline-copy-btn') &&
      toolOutputSource.includes('data-testid={`${copyButtonTestId}-inline`}') &&
      toolOutputSource.includes('data-testid="tool-output-copy-status"') &&
      toolOutputSource.includes('aria-live="polite"') &&
      toolOutputSource.includes('tabIndex={0}'),
    'Expected ToolOutput.tsx to render the Copy to Clipboard button directly inside tool-output, with ARIA live status and keyboard focus support'
  );

  assert.ok(
    serviceDeskSource.includes('<ToolOutput') &&
      ticketKbSource.includes('<ToolOutput') &&
      triageSource.includes('<ToolOutput') &&
      promptBuilderSource.includes('<ToolOutput') &&
      ipv4Source.includes('<ToolOutput') &&
      rackPowerSource.includes('<ToolOutput') &&
      inflationSource.includes('<ToolOutput') &&
      compoundSource.includes('<ToolOutput') &&
      retirementSource.includes('<ToolOutput') &&
      financeSnapshotSource.includes('<ToolOutput') &&
      interviewPrepSource.includes('<ToolOutput') &&
      resumeBulletSource.includes('<ToolOutput'),
    'Expected all utility tool components to render <ToolOutput> with an inline Copy to Clipboard button directly inside the tool-output component'
  );
});

test('adds a feature to the tool-output component that allows users to download the output content as a text file', async () => {
  const {
    ToolOutput,
    TOOL_OUTPUT_DOWNLOAD_BUTTON_LABEL,
    TOOL_OUTPUT_DOWNLOADED_LABEL,
    TOOL_OUTPUT_DOWNLOAD_LIVE_REGION_MESSAGE,
    formatToolOutputFilename,
    downloadToolOutputText,
    injectCodeBlockMarkdownCopyButtons,
  } = await import('../src/pages/NoteDetailPage');

  assert.equal(typeof ToolOutput, 'function');
  assert.equal(TOOL_OUTPUT_DOWNLOAD_BUTTON_LABEL, 'Download .txt');
  assert.equal(TOOL_OUTPUT_DOWNLOADED_LABEL, 'Downloaded!');
  assert.equal(
    TOOL_OUTPUT_DOWNLOAD_LIVE_REGION_MESSAGE,
    'Tool output downloaded as text file.'
  );

  // 1. Verify formatToolOutputFilename normalizes titles and custom filenames into clean .txt filenames
  assert.equal(
    formatToolOutputFilename('IPv4 Subnet & CIDR Allocation Specification'),
    'ipv4-subnet-and-cidr-allocation-specification.txt'
  );
  assert.equal(
    formatToolOutputFilename('service-desk-note.txt'),
    'service-desk-note.txt'
  );
  assert.equal(formatToolOutputFilename('   '), 'tool-output.txt');

  // 2. Verify downloadToolOutputText triggers text/plain UTF-8 download with filename and returns accessible status
  let capturedDownload: { content: string; filename: string; mimeType: string } | null = null;
  const sampleOutput =
    '=== Service Desk Note ===\nIssue: VPN tunnel auth timeout\nResolution: Rotated RADIUS shared secret';
  const downloadRes = downloadToolOutputText(
    sampleOutput,
    { title: 'Service Desk Note' },
    {
      triggerDownload: (payload) => {
        capturedDownload = payload;
      },
    }
  );

  assert.equal(downloadRes.ok, true);
  assert.equal(downloadRes.filename, 'service-desk-note.txt');
  assert.equal(downloadRes.downloadedText, sampleOutput);
  assert.equal(downloadRes.mimeType, 'text/plain;charset=utf-8');
  assert.ok(downloadRes.byteSize > 0);
  assert.equal(downloadRes.label, 'Downloaded!');
  assert.equal(downloadRes.announcement, 'Tool output downloaded as text file.');
  assert.deepEqual(capturedDownload, {
    content: sampleOutput,
    filename: 'service-desk-note.txt',
    mimeType: 'text/plain;charset=utf-8',
  });

  // Empty output returns ok: false gracefully without triggering download
  let emptyTriggered = false;
  const emptyRes = downloadToolOutputText(
    '   ',
    { filename: 'empty-output.txt' },
    {
      triggerDownload: () => {
        emptyTriggered = true;
      },
    }
  );
  assert.equal(emptyRes.ok, false);
  assert.equal(emptyTriggered, false);
  assert.equal(emptyRes.filename, 'empty-output.txt');
  assert.equal(emptyRes.label, 'Download .txt');

  // 3. Verify <pre class="tool-output"> blocks in NoteDetailPage also include a Download .txt button
  const sampleToolOutputHtml = `
    <h2>Rack Thermal Summary</h2>
    <pre class="tool-output">Total Active Power: 4,800 Watts | Thermal Dissipation: 16,378 BTU/hr</pre>
  `;
  const enhancedHtml = injectCodeBlockMarkdownCopyButtons(sampleToolOutputHtml);
  assert.ok(
    enhancedHtml.includes('data-testid="tool-output-download-btn"') &&
      enhancedHtml.includes('data-download-tool-output-id="note-code-block-1"') &&
      enhancedHtml.includes('<span class="tool-output-download-text">Download .txt</span>'),
    'Expected <pre class="tool-output"> toolbar to include a Download .txt button'
  );

  const downloadedStateHtml = injectCodeBlockMarkdownCopyButtons(
    sampleToolOutputHtml,
    'download:note-code-block-1'
  );
  assert.ok(
    downloadedStateHtml.includes(
      'class="tool-output-download-btn note-code-download-raw-btn is-downloaded"'
    ) &&
      downloadedStateHtml.includes('<span class="tool-output-download-text">Downloaded!</span>'),
    'Expected Download .txt button to render Downloaded! state when active'
  );

  // 4. Verify ToolOutput.tsx renders both toolbar and inline Download .txt buttons inside .tool-output
  const fs = await import('node:fs');
  const path = await import('node:path');
  const toolOutputSource = fs.readFileSync(
    path.resolve(process.cwd(), 'src/components/common/ToolOutput.tsx'),
    'utf8'
  );
  assert.ok(
    toolOutputSource.includes("TOOL_OUTPUT_DOWNLOAD_BUTTON_LABEL = 'Download .txt'") &&
      toolOutputSource.includes('data-testid={downloadButtonTestId}') &&
      toolOutputSource.includes('data-testid={`${downloadButtonTestId}-inline`}') &&
      toolOutputSource.includes('tool-output-inline-download-btn') &&
      toolOutputSource.includes('data-download-filename={resolvedFilename}'),
    'Expected ToolOutput.tsx to render toolbar and inline Download .txt buttons with filename metadata'
  );
});

test('enhances tool-output component with Prism.js syntax highlighting to automatically detect and colorize code snippets, logs, and command outputs', async () => {
  const fs = await import('node:fs');
  const path = await import('node:path');
  const {
    detectToolOutputFormat,
    highlightToolOutputContent,
    TOOL_OUTPUT_FORMAT_LABELS,
    injectCodeBlockMarkdownCopyButtons,
  } = await import('../src/pages/NoteDetailPage');

  // 1. Verify automatic format detection across JSON, Bash CLI, PowerShell, SQL, Network/CIDR, and structured Logs
  assert.equal(
    detectToolOutputFormat('{"ticketId": "INC-90210", "status": "resolved", "latencyMs": 14}'),
    'json'
  );
  assert.equal(
    detectToolOutputFormat('$ sudo systemctl restart networking && ping -c 4 1.1.1.1'),
    'bash'
  );
  assert.equal(
    detectToolOutputFormat('PS C:\\> Test-NetConnection -ComputerName 10.20.4.1 -Port 443'),
    'powershell'
  );
  assert.equal(
    detectToolOutputFormat('SELECT hostname, ip_address FROM assets WHERE rack_id = 4;'),
    'sql'
  );
  assert.equal(
    detectToolOutputFormat(
      '• Target IP / Prefix: 192.168.1.50/24\n• Subnet Mask: 255.255.255.0\n• Binary Mask: 11111111.11111111.11111111.00000000'
    ),
    'network'
  );
  assert.equal(
    detectToolOutputFormat(
      '2026-11-15T09:10:00Z ERROR [INC-4091] RADIUS authentication timeout on VLAN 40'
    ),
    'log'
  );

  // Explicit language hint overrides auto-detection cleanly
  assert.equal(detectToolOutputFormat('plain snippet', 'ps1'), 'powershell');
  assert.equal(TOOL_OUTPUT_FORMAT_LABELS.network, 'NETWORK / CIDR');
  assert.equal(TOOL_OUTPUT_FORMAT_LABELS.log, 'LOG / REPORT');

  // 2. Verify highlightToolOutputContent produces Prism.js <span class="token ..."> markup for each format
  const jsonHighlight = highlightToolOutputContent(
    '{"service": "dns", "healthy": true, "port": 53}'
  );
  assert.equal(jsonHighlight.format, 'json');
  assert.ok(jsonHighlight.tokenCount > 0, 'Expected JSON tokens to be highlighted by Prism.js');
  assert.ok(
    jsonHighlight.highlightedHtml.includes('<span class="token property">') &&
      jsonHighlight.highlightedHtml.includes('<span class="token boolean">true</span>') &&
      jsonHighlight.highlightedHtml.includes('<span class="token number">53</span>'),
    'Expected Prism.js JSON tokens for property, boolean, and number'
  );

  const networkHighlight = highlightToolOutputContent(
    '• Target IP / Prefix: 10.100.4.15/22\n• Subnet Mask: 255.255.252.0\n• Binary IP: 00001010.01100100.00000100.00001111'
  );
  assert.equal(networkHighlight.format, 'network');
  assert.ok(networkHighlight.tokenCount > 0);
  assert.ok(
    networkHighlight.highlightedHtml.includes('10.100.4.15/22') &&
      networkHighlight.highlightedHtml.includes('token'),
    'Expected network/CIDR specification to be tokenized by Prism.js'
  );

  const logHighlight = highlightToolOutputContent(
    '=== Service Desk Note ===\nStatus: RESOLVED\nTicket: INC-84920\nSeverity: ERROR'
  );
  assert.equal(logHighlight.format, 'log');
  assert.ok(logHighlight.tokenCount > 0);
  assert.ok(
    logHighlight.highlightedHtml.includes('RESOLVED') &&
      logHighlight.highlightedHtml.includes('INC-84920') &&
      logHighlight.highlightedHtml.includes('<span class="token'),
    'Expected structured log/report output to be tokenized by Prism.js'
  );

  // 3. Verify injectCodeBlockMarkdownCopyButtons applies Prism.js syntax highlighting to <pre class="tool-output"> blocks
  const sampleCliNoteHtml = `
    <h2>Verify DNS Resolver</h2>
    <pre class="tool-output">$ dig @1.1.1.1 example.com +short</pre>
  `;
  const highlightedNoteHtml = injectCodeBlockMarkdownCopyButtons(sampleCliNoteHtml);
  assert.ok(
    highlightedNoteHtml.includes('data-format="bash"') &&
      highlightedNoteHtml.includes('class="tool-output-code language-bash"') &&
      highlightedNoteHtml.includes('<span class="token'),
    'Expected <pre class="tool-output"> in NoteDetailPage to be auto-detected as bash and syntax-highlighted'
  );

  // 4. Verify ToolOutput.tsx and src/index.css wire Prism.js and token color rules
  const toolOutputSource = fs.readFileSync(
    path.resolve(process.cwd(), 'src/components/common/ToolOutput.tsx'),
    'utf8'
  );
  const cssSource = fs.readFileSync(
    path.resolve(process.cwd(), 'src/index.css'),
    'utf8'
  );

  assert.ok(
    toolOutputSource.includes("import Prism from 'prismjs'") &&
      toolOutputSource.includes('highlightToolOutputContent') &&
      toolOutputSource.includes('data-testid="tool-output-format-badge"') &&
      toolOutputSource.includes('dangerouslySetInnerHTML={{ __html: highlightResult.highlightedHtml }}'),
    'Expected ToolOutput.tsx to integrate Prism.js and render syntax-highlighted tokens and format badge'
  );

  assert.ok(
    cssSource.includes('.tool-output .token.property') &&
      cssSource.includes('.tool-output .token.keyword') &&
      cssSource.includes('.tool-output .token.number'),
    'Expected src/index.css to define Prism.js token color styles for .tool-output'
  );
});

test('adds a text size control button in the tool-output toolbar that lets users toggle between small, medium, and large font sizes for better readability', async () => {
  const fs = await import('node:fs');
  const path = await import('node:path');
  const {
    TOOL_OUTPUT_FONT_SIZES,
    TOOL_OUTPUT_FONT_SIZE_CONFIG,
    getNextToolOutputFontSize,
    resolveToolOutputFontSizeStyle,
    injectCodeBlockMarkdownCopyButtons,
  } = await import('../src/pages/NoteDetailPage');

  // 1. Verify small, medium, and large font size configuration and toggle cycle (small -> medium -> large -> small)
  assert.deepEqual(TOOL_OUTPUT_FONT_SIZES, ['small', 'medium', 'large']);
  assert.equal(getNextToolOutputFontSize('small'), 'medium');
  assert.equal(getNextToolOutputFontSize('medium'), 'large');
  assert.equal(getNextToolOutputFontSize('large'), 'small');
  assert.equal(getNextToolOutputFontSize(undefined), 'medium');

  // 2. Verify resolveToolOutputFontSizeStyle returns distinct fontSize, lineHeight, shortLabel, and sizeClass
  const smallStyle = resolveToolOutputFontSizeStyle('small');
  const mediumStyle = resolveToolOutputFontSizeStyle('medium');
  const largeStyle = resolveToolOutputFontSizeStyle('large');

  assert.equal(smallStyle.label, 'Small');
  assert.equal(smallStyle.shortLabel, 'A-');
  assert.equal(smallStyle.fontSize, '0.78rem');
  assert.equal(smallStyle.sizeClass, 'tool-output-font-small');

  assert.equal(mediumStyle.label, 'Medium');
  assert.equal(mediumStyle.shortLabel, 'A');
  assert.equal(mediumStyle.fontSize, '0.88rem');
  assert.equal(mediumStyle.sizeClass, 'tool-output-font-medium');

  assert.equal(largeStyle.label, 'Large');
  assert.equal(largeStyle.shortLabel, 'A+');
  assert.equal(largeStyle.fontSize, '1.02rem');
  assert.equal(largeStyle.sizeClass, 'tool-output-font-large');

  assert.equal(TOOL_OUTPUT_FONT_SIZE_CONFIG.small.next, 'medium');
  assert.equal(TOOL_OUTPUT_FONT_SIZE_CONFIG.medium.next, 'large');
  assert.equal(TOOL_OUTPUT_FONT_SIZE_CONFIG.large.next, 'small');

  // 3. Verify injectCodeBlockMarkdownCopyButtons includes the text size toggle button in .note-code-block-toolbar
  const sampleHtml = `
    <h2>Subnet Calculation Output</h2>
    <pre class="tool-output">• Target IP / Prefix: 192.168.1.50/24</pre>
  `;
  const enhancedHtml = injectCodeBlockMarkdownCopyButtons(sampleHtml);
  assert.ok(
    enhancedHtml.includes('data-testid="tool-output-text-size-btn"') &&
      enhancedHtml.includes('data-toggle-tool-output-size-id="note-code-block-1"') &&
      enhancedHtml.includes('data-font-size="medium"') &&
      enhancedHtml.includes('Text: Medium'),
    'Expected <pre class="tool-output"> toolbar in NoteDetailPage to include the text size control button'
  );

  // 4. Verify ToolOutput.tsx and src/index.css wire the toolbar text size control button and CSS font classes
  const toolOutputSource = fs.readFileSync(
    path.resolve(process.cwd(), 'src/components/common/ToolOutput.tsx'),
    'utf8'
  );
  const cssSource = fs.readFileSync(
    path.resolve(process.cwd(), 'src/index.css'),
    'utf8'
  );

  assert.ok(
    toolOutputSource.includes("textSizeButtonTestId = 'tool-output-text-size-btn'") &&
      toolOutputSource.includes('handleToggleFontSize') &&
      toolOutputSource.includes('data-font-size={fontSizeStyle.size}') &&
      toolOutputSource.includes('Text: {fontSizeStyle.label}'),
    'Expected ToolOutput.tsx to render the text size control button in the toolbar and apply fontSizeStyle to .tool-output'
  );

  assert.ok(
    cssSource.includes('.tool-output.tool-output-font-small') &&
      cssSource.includes('.tool-output.tool-output-font-medium') &&
      cssSource.includes('.tool-output.tool-output-font-large'),
    'Expected src/index.css to define small, medium, and large font size rules for .tool-output'
  );
});

test('adds a Toggle Word Wrap button and Copy to Clipboard button to the tool-output toolbar switching between white-space: pre-wrap and white-space: pre', async () => {
  const fs = await import('node:fs');
  const path = await import('node:path');
  const {
    TOOL_OUTPUT_WORD_WRAP_BUTTON_LABEL,
    TOOL_OUTPUT_COPY_BUTTON_LABEL,
    toggleToolOutputWordWrap,
    resolveToolOutputWordWrapStyle,
    copyToolOutputText,
    injectCodeBlockMarkdownCopyButtons,
  } = await import('../src/pages/NoteDetailPage');

  // 1. Verify labels and word wrap toggle transitions between pre-wrap and pre
  assert.equal(TOOL_OUTPUT_WORD_WRAP_BUTTON_LABEL, 'Toggle Word Wrap');
  assert.equal(TOOL_OUTPUT_COPY_BUTTON_LABEL, 'Copy to Clipboard');
  assert.equal(toggleToolOutputWordWrap(true), false);
  assert.equal(toggleToolOutputWordWrap(false), true);

  const wrappedStyle = resolveToolOutputWordWrapStyle(true);
  assert.equal(wrappedStyle.wordWrap, true);
  assert.equal(wrappedStyle.whiteSpace, 'pre-wrap');
  assert.equal(wrappedStyle.wordBreak, 'break-word');
  assert.equal(wrappedStyle.wrapClass, 'tool-output-wrap-pre-wrap');
  assert.equal(wrappedStyle.statusLabel, 'On');

  const unwrappedStyle = resolveToolOutputWordWrapStyle(false);
  assert.equal(unwrappedStyle.wordWrap, false);
  assert.equal(unwrappedStyle.whiteSpace, 'pre');
  assert.equal(unwrappedStyle.wordBreak, 'normal');
  assert.equal(unwrappedStyle.overflowX, 'auto');
  assert.equal(unwrappedStyle.wrapClass, 'tool-output-wrap-pre');
  assert.equal(unwrappedStyle.statusLabel, 'Off');

  // 2. Verify copying full multi-line tool output content via copyToolOutputText
  const longOutput = [
    'Line 1: curl -sSL https://api.example.internal/v2/diagnostics/cluster?include=nodes,pods,network,storage,events',
    'Line 2: {"status":"ok","nodes":12,"uptime":"99.998%"}',
  ].join('\n');
  let capturedClipboard = '';
  const copyRes = await copyToolOutputText(longOutput, {
    writeText: async (text: string) => {
      capturedClipboard = text;
    },
  });
  assert.equal(copyRes.ok, true);
  assert.equal(capturedClipboard, longOutput);

  // 3. Verify injectCodeBlockMarkdownCopyButtons renders both Toggle Word Wrap and Copy to Clipboard in the toolbar
  const sampleHtml = `
    <h2>Long Diagnostic Command</h2>
    <pre class="tool-output">$ curl -sSL https://api.example.internal/v2/diagnostics/cluster?include=nodes,pods,network</pre>
  `;
  const enhancedHtml = injectCodeBlockMarkdownCopyButtons(sampleHtml);
  assert.ok(
    enhancedHtml.includes('data-testid="tool-output-word-wrap-btn"') &&
      enhancedHtml.includes('data-toggle-tool-output-wrap-id="note-code-block-1"') &&
      enhancedHtml.includes('data-white-space="pre-wrap"') &&
      enhancedHtml.includes('Toggle Word Wrap') &&
      enhancedHtml.includes('data-testid="tool-output-copy-btn"') &&
      enhancedHtml.includes('Copy to Clipboard'),
    'Expected <pre class="tool-output"> toolbar in NoteDetailPage to include Toggle Word Wrap and Copy to Clipboard buttons'
  );

  // 4. Verify ToolOutput.tsx and src/index.css wire Toggle Word Wrap (pre-wrap / pre) and Copy to Clipboard in the toolbar
  const toolOutputSource = fs.readFileSync(
    path.resolve(process.cwd(), 'src/components/common/ToolOutput.tsx'),
    'utf8'
  );
  const cssSource = fs.readFileSync(
    path.resolve(process.cwd(), 'src/index.css'),
    'utf8'
  );

  assert.ok(
    toolOutputSource.includes("TOOL_OUTPUT_WORD_WRAP_BUTTON_LABEL = 'Toggle Word Wrap'") &&
      toolOutputSource.includes("wordWrapButtonTestId = 'tool-output-word-wrap-btn'") &&
      toolOutputSource.includes('handleToggleWordWrap') &&
      toolOutputSource.includes('whiteSpace: wordWrapStyle.whiteSpace') &&
      toolOutputSource.includes('data-white-space={wordWrapStyle.whiteSpace}') &&
      toolOutputSource.includes('data-testid={copyButtonTestId}'),
    'Expected ToolOutput.tsx toolbar to render Toggle Word Wrap (pre-wrap/pre) and Copy to Clipboard buttons'
  );

  assert.ok(
    cssSource.includes('.tool-output.tool-output-wrap-pre-wrap') &&
      cssSource.includes('white-space: pre-wrap !important;') &&
      cssSource.includes('.tool-output.tool-output-wrap-pre') &&
      cssSource.includes('white-space: pre !important;'),
    'Expected src/index.css to define white-space: pre-wrap and white-space: pre rules for .tool-output'
  );
});






