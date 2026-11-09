import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

describe('CSS Print Stylesheet & A4/Letter PDF Export Optimization Suite', () => {
  const rootDir = process.cwd();
  const printCssPath = path.resolve(rootDir, 'src/styles/print.css');
  const indexCssPath = path.resolve(rootDir, 'src/index.css');
  const mainTsxPath = path.resolve(rootDir, 'src/main.tsx');
  const noteDetailPath = path.resolve(rootDir, 'src/pages/NoteDetailPage.tsx');
  const blogDetailPath = path.resolve(rootDir, 'src/pages/BlogPostPage.tsx');
  const subnetCalcPath = path.resolve(rootDir, 'src/tools/Ipv4SubnetCalculator.tsx');
  const cablePoePath = path.resolve(rootDir, 'src/tools/CableLengthPoeChecker.tsx');
  const serverRackPath = path.resolve(rootDir, 'src/tools/ServerRackPowerBtuCalculator.tsx');

  it('provides dedicated src/styles/print.css imported in main.tsx and index.css', () => {
    assert.ok(fs.existsSync(printCssPath), 'Expected src/styles/print.css to exist');
    const printCss = fs.readFileSync(printCssPath, 'utf8');
    const mainTsx = fs.readFileSync(mainTsxPath, 'utf8');
    const indexCss = fs.readFileSync(indexCssPath, 'utf8');

    assert.ok(
      mainTsx.includes('./styles/print.css') || mainTsx.includes('print.css'),
      'Expected src/main.tsx to import print.css'
    );
    assert.ok(
      indexCss.includes('./styles/print.css') || indexCss.includes('print.css'),
      'Expected src/index.css to import print.css'
    );
    assert.ok(printCss.length > 500, 'Expected print.css to contain comprehensive styling rules');
  });

  it('configures @page for A4/Letter geometry with margins, page counters, and landscape support', () => {
    const printCss = fs.readFileSync(printCssPath, 'utf8');

    // 1. A4 portrait sizing and margins
    assert.ok(printCss.includes('@page {'), 'Expected @page declaration in print.css');
    assert.ok(
      printCss.includes('size: A4 portrait') || printCss.includes('size: auto') || printCss.includes('size: A4'),
      'Expected standard A4 page sizing'
    );
    assert.ok(printCss.includes('margin:'), 'Expected margin specification for page budgeting');

    // 2. Running page headers and footers with page counters
    assert.ok(
      printCss.includes('counter(page)') && printCss.includes('counter(pages)'),
      'Expected running page counter (Page X of Y) in @page margins'
    );

    // 3. Landscape support
    assert.ok(
      printCss.includes('landscape-report') && printCss.includes('.print-landscape'),
      'Expected landscape page configuration for wide data tables or diagrams'
    );

    // 4. Color adjustment
    assert.ok(
      printCss.includes('-webkit-print-color-adjust: exact') &&
        printCss.includes('print-color-adjust: exact'),
      'Expected exact print color adjust rules for reliable PDF exports'
    );
  });

  it('hides all non-printable UI elements (navigation, footers, AI widgets, modals, copy buttons, sidebars)', () => {
    const printCss = fs.readFileSync(printCssPath, 'utf8');

    const hiddenSelectors = [
      '.site-header',
      '.site-footer',
      '.menu-toggle',
      '.theme-toggle-btn',
      '.modal-overlay',
      '.jawed-ai-widget',
      '#jawed-ai-widget',
      '.shortcuts-help-modal',
      '.scroll-progress-toast',
      '.note-toc-sidebar',
      '.note-toc-mobile',
      '.print-this-tool-btn',
      '.pdf-export-btn',
      '.social-share-bar',
      '.note-heading-copy-btn',
      '.note-read-time-indicator.variant-floating',
      '.newsletter-subscribe-form',
    ];

    for (const selector of hiddenSelectors) {
      assert.ok(
        printCss.includes(selector),
        `Expected selector "${selector}" to be included in print.css hidden rules`
      );
    }
  });

  it('guards .print-only elements on screen and displays them strictly during @media print', () => {
    const printCss = fs.readFileSync(printCssPath, 'utf8');

    // Screen guard
    assert.ok(
      printCss.includes('@media screen {') &&
        printCss.includes('.print-only') &&
        printCss.includes('display: none !important;'),
      'Expected .print-only to be hidden on screen'
    );

    // Print visibility
    assert.ok(
      printCss.includes('@media print {') &&
        printCss.includes('.print-only {') &&
        printCss.includes('display: block !important;'),
      'Expected .print-only to be displayed as block during print'
    );

    assert.ok(
      printCss.includes('.print-only-flex') && printCss.includes('display: flex !important;'),
      'Expected .print-only-flex utility to be displayed as flex during print'
    );
  });

  it('formats technical guides with single-column layout, break avoidance, code styling, and repeated table headers', () => {
    const printCss = fs.readFileSync(printCssPath, 'utf8');

    // 1. Single-column full-width flow
    assert.ok(
      printCss.includes('.note-detail-layout') &&
        printCss.includes('display: block !important;') &&
        printCss.includes('grid-template-columns: minmax(0, 1fr) !important;'),
      'Expected .note-detail-layout to switch to single-column full-width on print'
    );

    // 2. Heading orphan prevention
    assert.ok(
      printCss.includes('page-break-after: avoid') && printCss.includes('break-after: avoid'),
      'Expected headings to avoid trailing page breaks'
    );

    // 3. Code block formatting
    assert.ok(
      printCss.includes('pre {') &&
        printCss.includes('white-space: pre-wrap !important;') &&
        printCss.includes('break-inside: avoid !important;'),
      'Expected pre code blocks to wrap cleanly and avoid breaks inside'
    );

    // 4. Table headers repeated across pages
    assert.ok(
      printCss.includes('thead {') &&
        printCss.includes('display: table-header-group !important;'),
      'Expected thead to repeat on every page of a multi-page table'
    );

    // 5. Image sizing and break avoidance
    assert.ok(
      printCss.includes('img,') &&
        printCss.includes('max-width: 100% !important;') &&
        printCss.includes('break-inside: avoid !important;'),
      'Expected images to fit within print boundaries without page splits'
    );
  });

  it('formats IT diagnostic tools (Subnet, Cable/PoE, Server Rack) with printable KPI grids, badges, and monospace tables', () => {
    const printCss = fs.readFileSync(printCssPath, 'utf8');

    // 1. Tool roots
    assert.ok(
      printCss.includes('.ipv4-subnet-calculator-root') &&
        printCss.includes('.cable-poe-root') &&
        printCss.includes('.server-rack-power-calc-root'),
      'Expected major IT tool roots to be covered in print.css'
    );

    // 2. Metric KPI grids
    assert.ok(
      printCss.includes('.card-grid.four') || printCss.includes('.grid-four-col') || printCss.includes('.kpi-grid'),
      'Expected 4-column KPI grids to be styled for A4/Letter page width'
    );

    // 3. High-contrast status badges
    assert.ok(
      printCss.includes('.badge.status-pass') || printCss.includes('.badge.badge-success'),
      'Expected pass/success badge print styling'
    );
    assert.ok(
      printCss.includes('.badge.status-warning') || printCss.includes('.badge.badge-warning'),
      'Expected warning badge print styling'
    );
    assert.ok(
      printCss.includes('.badge.status-critical') || printCss.includes('.badge.badge-danger'),
      'Expected critical/error badge print styling'
    );

    // 4. Monospace table cells
    assert.ok(
      printCss.includes('td.monospace') || printCss.includes('font-mono') || printCss.includes('ui-monospace'),
      'Expected monospace font styling for network addresses and electrical specs'
    );
  });

  it('integrates structured print-only headers and footers across NoteDetailPage, BlogPostPage, and IT Tools', () => {
    const noteDetail = fs.readFileSync(noteDetailPath, 'utf8');
    const blogDetail = fs.readFileSync(blogDetailPath, 'utf8');
    const subnetCalc = fs.readFileSync(subnetCalcPath, 'utf8');
    const cablePoe = fs.readFileSync(cablePoePath, 'utf8');
    const serverRack = fs.readFileSync(serverRackPath, 'utf8');

    // 1. NoteDetailPage
    assert.ok(
      noteDetail.includes('data-testid="guide-print-header"') &&
        noteDetail.includes('data-testid="guide-print-footer"') &&
        noteDetail.includes('print-document-header'),
      'Expected NoteDetailPage to include structured print-only header and footer'
    );

    // 2. BlogPostPage
    assert.ok(
      blogDetail.includes('data-testid="blog-print-header"') &&
        blogDetail.includes('data-testid="blog-print-footer"') &&
        blogDetail.includes('print-document-header'),
      'Expected BlogPostPage to include structured print-only header and footer'
    );

    // 3. IT Diagnostic Tools
    assert.ok(
      subnetCalc.includes('className="print-only"') &&
        subnetCalc.includes('IPv4 Subnet & CIDR Allocation Specification'),
      'Expected Ipv4SubnetCalculator to include structured print report header'
    );
    assert.ok(
      cablePoe.includes('className="print-only"') &&
        (cablePoe.includes('Cable Length &amp; PoE Budget Checker Specification') ||
         cablePoe.includes('Cable Length & PoE Budget Checker Specification')),
      'Expected CableLengthPoeChecker to include structured print report header'
    );
    assert.ok(
      serverRack.includes('className="print-only') &&
        (serverRack.includes('Server Rack Power &amp; BTU Heat Load Specification') ||
         serverRack.includes('Server Rack Power & BTU Heat Load Specification')),
      'Expected ServerRackPowerBtuCalculator to include structured print report header'
    );
  });

  it('provides print break and layout utility classes (.print-break-before, .print-break-after, .print-avoid-break)', () => {
    const printCss = fs.readFileSync(printCssPath, 'utf8');

    assert.ok(
      printCss.includes('.print-break-before') || printCss.includes('.page-break-before'),
      'Expected page-break-before utility class'
    );
    assert.ok(
      printCss.includes('.print-break-after') || printCss.includes('.page-break-after'),
      'Expected page-break-after utility class'
    );
    assert.ok(
      printCss.includes('.print-avoid-break') || printCss.includes('.page-break-avoid') || printCss.includes('.no-break'),
      'Expected break-inside: avoid utility class'
    );
  });
});
