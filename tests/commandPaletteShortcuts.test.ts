import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  NAV_ROUTE_MAP,
  FALLBACK_SHORTCUTS,
  LOCAL_PALETTE_SHORTCUTS,
  type PaletteShortcutDisplayItem,
} from '../src/components/CommandPalette';

describe('CommandPalette - Shortcut Filtering & Navigational Execution Logic', () => {
  const allShortcuts: PaletteShortcutDisplayItem[] = [
    ...FALLBACK_SHORTCUTS,
    ...LOCAL_PALETTE_SHORTCUTS,
  ];

  // Helper function mimicking CommandPalette's subquery extractor
  function extractSubQuery(query: string): string {
    const trimmed = query.trim().toLowerCase();
    const raw = trimmed.replace(/\?/g, '').trim();
    const triggerWords = ['help', 'shortcut', 'shortcuts', 'hotkey', 'hotkeys'];
    if (!raw || triggerWords.includes(raw)) {
      return '';
    }
    return raw;
  }

  // Helper function mimicking CommandPalette's matchingShortcuts filter logic
  function filterShortcuts(
    shortcuts: PaletteShortcutDisplayItem[],
    query: string,
    scopeFilter: 'all' | 'Global' | 'Local' = 'all',
    categoryFilter: string = 'all'
  ): PaletteShortcutDisplayItem[] {
    let list = shortcuts;

    if (scopeFilter !== 'all') {
      list = list.filter((s) => (s.scope || 'Global') === scopeFilter);
    }

    if (categoryFilter !== 'all') {
      list = list.filter((s) => s.category.toLowerCase() === categoryFilter.toLowerCase());
    }

    const subQuery = extractSubQuery(query);
    if (!subQuery) {
      return [...list].sort((a, b) => {
        if (a.category === 'Navigation' && b.category !== 'Navigation') return -1;
        if (b.category === 'Navigation' && a.category !== 'Navigation') return 1;
        return 0;
      });
    }

    const term = subQuery.toLowerCase();
    const filtered = list.filter((s) => {
      const itemScope = (s.scope || 'Global').toLowerCase();
      const itemCategory = (s.category || '').toLowerCase();
      const itemLabel = s.label.toLowerCase();
      const itemDesc = s.description.toLowerCase();
      const itemCombo = s.combo.toLowerCase();
      const itemRoute = (s.route || '').toLowerCase();

      return (
        itemLabel.includes(term) ||
        itemDesc.includes(term) ||
        itemCombo.includes(term) ||
        itemCategory.includes(term) ||
        itemScope.includes(term) ||
        itemRoute.includes(term)
      );
    });

    return filtered.sort((a, b) => {
      const aNav = a.category === 'Navigation';
      const bNav = b.category === 'Navigation';
      const aStarts =
        a.label.toLowerCase().startsWith(term) ||
        (a.route && a.route.toLowerCase().includes(term));
      const bStarts =
        b.label.toLowerCase().startsWith(term) ||
        (b.route && b.route.toLowerCase().includes(term));
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
      if (aNav && !bNav) return -1;
      if (!aNav && bNav) return 1;
      return 0;
    });
  }

  it('maps all expected navigational actions to valid site routes', () => {
    const expectedNavShortcuts = [
      { id: 'nav-home', route: '/' },
      { id: 'nav-tools', route: '/tools' },
      { id: 'nav-guides', route: '/guides' },
      { id: 'nav-services', route: '/services' },
      { id: 'nav-contact', route: '/contact' },
      { id: 'nav-notes', route: '/notes' },
      { id: 'nav-blog', route: '/blog' },
      { id: 'nav-work', route: '/work' },
      { id: 'nav-about', route: '/about' },
      { id: 'nav-topics', route: '/topics' },
      { id: 'nav-resources', route: '/resources' },
    ];

    for (const expected of expectedNavShortcuts) {
      assert.strictEqual(
        NAV_ROUTE_MAP[expected.id],
        expected.route,
        `Route map should have correct destination for ${expected.id}`
      );

      const shortcut = FALLBACK_SHORTCUTS.find((s) => s.id === expected.id);
      assert.ok(shortcut, `Shortcut ${expected.id} should exist in FALLBACK_SHORTCUTS`);
      assert.strictEqual(shortcut?.category, 'Navigation');
      assert.strictEqual(shortcut?.route, expected.route);
    }
  });

  it('filters all shortcuts when user queries "?" without subquery', () => {
    const results = filterShortcuts(allShortcuts, '?');
    assert.strictEqual(results.length, allShortcuts.length);

    // Navigational items should be prioritized at the beginning
    assert.strictEqual(results[0].category, 'Navigation');
  });

  it('filters to navigational shortcuts when user types "? nav" or "? navigation"', () => {
    const resultsNav = filterShortcuts(allShortcuts, '? nav');
    assert.ok(resultsNav.length > 0);
    for (const item of resultsNav) {
      assert.ok(
        item.category.toLowerCase().includes('nav') ||
          item.label.toLowerCase().includes('nav') ||
          item.description.toLowerCase().includes('nav')
      );
    }

    const resultsNavigation = filterShortcuts(allShortcuts, '? navigation');
    assert.ok(resultsNavigation.length >= 10);
    assert.ok(resultsNavigation.every((s) => s.category === 'Navigation'));
  });

  it('finds specific page targets when typing "? tools", "? home", "? guides", "? contact"', () => {
    const toolsResult = filterShortcuts(allShortcuts, '? tools');
    assert.ok(toolsResult.length > 0);
    assert.strictEqual(toolsResult[0].id, 'nav-tools');
    assert.strictEqual(toolsResult[0].route, '/tools');

    const homeResult = filterShortcuts(allShortcuts, '? home');
    assert.ok(homeResult.length > 0);
    assert.strictEqual(homeResult[0].id, 'nav-home');
    assert.strictEqual(homeResult[0].route, '/');

    const guidesResult = filterShortcuts(allShortcuts, '? guides');
    assert.ok(guidesResult.length > 0);
    assert.strictEqual(guidesResult[0].id, 'nav-guides');
    assert.strictEqual(guidesResult[0].route, '/guides');

    const contactResult = filterShortcuts(allShortcuts, '? contact');
    assert.ok(contactResult.length > 0);
    assert.strictEqual(contactResult[0].id, 'nav-contact');
    assert.strictEqual(contactResult[0].route, '/contact');

    const notesResult = filterShortcuts(allShortcuts, '? notes');
    assert.ok(notesResult.length > 0);
    assert.strictEqual(notesResult[0].id, 'nav-notes');
    assert.strictEqual(notesResult[0].route, '/notes');
  });

  it('filters by category chip selection correctly', () => {
    const navItems = filterShortcuts(allShortcuts, '?', 'all', 'Navigation');
    assert.ok(navItems.length >= 11);
    assert.ok(navItems.every((s) => s.category === 'Navigation'));

    const controlsItems = filterShortcuts(allShortcuts, '?', 'all', 'Global Controls');
    assert.ok(controlsItems.length >= 1);
    assert.ok(controlsItems.every((s) => s.category === 'Global Controls'));

    const localItems = filterShortcuts(allShortcuts, '?', 'all', 'Local Palette');
    assert.ok(localItems.length >= 1);
    assert.ok(localItems.every((s) => s.category === 'Local Palette'));
  });

  it('filters by scope (Global vs Local) correctly', () => {
    const globalItems = filterShortcuts(allShortcuts, '?', 'Global', 'all');
    assert.ok(globalItems.every((s) => (s.scope || 'Global') === 'Global'));

    const localItems = filterShortcuts(allShortcuts, '?', 'Local', 'all');
    assert.ok(localItems.every((s) => s.scope === 'Local'));
  });

  it('groups search modal results by category (Guides, Tools, Blog, Pages) and highlights matching text segments within the result summary', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const {
      SEARCH_RESULT_CATEGORY_ORDER,
      groupSearchResultsByCategory,
      segmentTextByQuery,
      extractSummarySnippetWithMatch,
    } = await import('../src/components/CommandPalette');
    const { getQuickSearchRecommendations, searchSite } = await import(
      '../src/services/aiKnowledgeEngine'
    );

    // 1. Verify SEARCH_RESULT_CATEGORY_ORDER is Guides, Tools, Blog, Pages
    assert.deepEqual(
      SEARCH_RESULT_CATEGORY_ORDER.map((c) => c.label),
      ['Guides', 'Tools', 'Blog', 'Pages']
    );

    // 2. Verify groupSearchResultsByCategory groups mixed results into Guides, Tools, Blog, Pages
    const recommendations = getQuickSearchRecommendations();
    const groupedAll = groupSearchResultsByCategory(recommendations, 'all');
    assert.deepEqual(
      groupedAll.map((g) => g.label),
      ['Guides', 'Tools', 'Blog', 'Pages']
    );
    assert.ok(groupedAll[0].items.every((item) => item.category === 'guide'));
    assert.ok(groupedAll[1].items.every((item) => item.category === 'tool'));
    assert.ok(groupedAll[2].items.every((item) => item.category === 'blog'));
    assert.ok(groupedAll[3].items.every((item) => item.category === 'page'));

    // 3. Verify single-category filter returns only that category group
    const guidesOnly = groupSearchResultsByCategory(recommendations, 'guide');
    assert.equal(guidesOnly.length, 1);
    assert.equal(guidesOnly[0].label, 'Guides');

    // 4. Verify segmentTextByQuery highlights matching text segment within a result summary
    const sampleSummary =
      'Verify Cat5e/6/6a distance limits, voltage drop and 802.3af/at/bt switch power budgets.';
    const phraseSegments = segmentTextByQuery(sampleSummary, 'voltage drop');
    const matchedSegments = phraseSegments.filter((s) => s.isMatch);
    assert.equal(matchedSegments.length, 1);
    assert.equal(matchedSegments[0].text.toLowerCase(), 'voltage drop');

    // 5. Verify extractSummarySnippetWithMatch centers around matching segment in long summaries
    const longSummary =
      'Enterprise workplace infrastructure documentation covering hardware provisioning, macOS fleet management, Jamf policies, and automated zero-touch enrollment workflows across global offices.';
    const snippet = extractSummarySnippetWithMatch(longSummary, 'zero-touch enrollment', 90);
    assert.ok(
      snippet.toLowerCase().includes('zero-touch enrollment'),
      'Expected extracted snippet to contain the matching text segment'
    );

    // 6. Verify live site search results group cleanly and CommandPalette.tsx renders category groups + highlightSummaryMatch
    const searchRes = searchSite('network');
    const groupedSearch = groupSearchResultsByCategory(searchRes.all, 'all');
    assert.ok(groupedSearch.length > 0);

    const paletteSource = fs.readFileSync(
      path.resolve(process.cwd(), 'src/components/CommandPalette.tsx'),
      'utf8'
    );
    assert.ok(
      paletteSource.includes('search-category-group') &&
        paletteSource.includes('highlightSummaryMatch(item.summary, query)'),
      'Expected CommandPalette.tsx to render grouped categories and highlightSummaryMatch in result summaries'
    );
  });

  it('implements arrow-key navigation (ArrowDown, ArrowUp, wrap-around, Home, End, PageUp, PageDown) for search result items in the search modal', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const {
      computeSearchResultNavigationIndex,
      getNextSearchResultIndex,
      groupSearchResultsByCategory,
    } = await import('../src/components/CommandPalette');
    const { getQuickSearchRecommendations } = await import('../src/services/aiKnowledgeEngine');

    const grouped = groupSearchResultsByCategory(getQuickSearchRecommendations(), 'all');
    const flattenedItems = grouped.flatMap((g) => g.items);
    const total = flattenedItems.length;
    assert.ok(total > 5, 'Expected multiple search result items for arrow-key navigation');

    // 1. ArrowDown increments selection and wraps around from last item to index 0
    assert.equal(computeSearchResultNavigationIndex(0, total, 'ArrowDown'), 1);
    assert.equal(computeSearchResultNavigationIndex(1, total, 'ArrowDown'), 2);
    assert.equal(computeSearchResultNavigationIndex(total - 1, total, 'ArrowDown'), 0);

    // 2. ArrowUp decrements selection and wraps around from index 0 to last item
    assert.equal(computeSearchResultNavigationIndex(2, total, 'ArrowUp'), 1);
    assert.equal(computeSearchResultNavigationIndex(0, total, 'ArrowUp'), total - 1);

    // 3. Home / End / PageDown / PageUp / Alt+Arrow jump behavior
    assert.equal(computeSearchResultNavigationIndex(3, total, 'Home'), 0);
    assert.equal(computeSearchResultNavigationIndex(0, total, 'End'), total - 1);
    assert.equal(computeSearchResultNavigationIndex(0, total, 'PageDown'), Math.min(total - 1, 5));
    assert.equal(computeSearchResultNavigationIndex(4, total, 'PageUp'), 0);
    assert.equal(
      getNextSearchResultIndex(0, total, 'ArrowDown', { altKey: true }),
      Math.min(total - 1, 5)
    );
    assert.equal(getNextSearchResultIndex(0, 0, 'ArrowDown'), 0);

    // 4. Verify CommandPalette.tsx wires arrow-key navigation, aria-activedescendant, roving tabIndex, and handleResultItemKeyDown on search result items
    const paletteSource = fs.readFileSync(
      path.resolve(process.cwd(), 'src/components/CommandPalette.tsx'),
      'utf8'
    );
    assert.ok(
      paletteSource.includes('handleResultItemKeyDown') &&
        paletteSource.includes('aria-activedescendant={activeDescendantId}') &&
        paletteSource.includes('tabIndex={isSelected ? 0 : -1}') &&
        paletteSource.includes('data-result-index={globalIndex}'),
      'Expected CommandPalette.tsx to implement arrow-key navigation and accessibility attributes on search result items'
    );
  });

  it('adds visual focus-ring support to search result items as the user moves and triggers route navigation on Enter', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const {
      getSearchResultItemFocusClass,
      normalizeSearchResultRoute,
      resolveSelectedRouteOnEnter,
      handleSearchResultKeyStep,
      groupSearchResultsByCategory,
    } = await import('../src/components/CommandPalette');
    const { getQuickSearchRecommendations } = await import('../src/services/aiKnowledgeEngine');

    const grouped = groupSearchResultsByCategory(getQuickSearchRecommendations(), 'all');
    const flattenedItems = grouped.flatMap((g) => g.items);
    const targets = flattenedItems.map((item, idx) => ({
      kind: 'result' as const,
      item,
      indexInGroup: idx,
    }));

    // 1. Verify getSearchResultItemFocusClass adds visual focus-ring classes only to the selected item
    const unselectedClass = getSearchResultItemFocusClass(false);
    const selectedClass = getSearchResultItemFocusClass(true);
    assert.equal(unselectedClass, 'search-result-item');
    assert.ok(selectedClass.includes('is-selected'));
    assert.ok(selectedClass.includes('focus-ring'));
    assert.ok(selectedClass.includes('ring-2'));

    // 2. Verify moving down/up shifts the active focusRingIndex and pressing Enter triggers navigation to the selected route
    const step1 = handleSearchResultKeyStep({
      key: 'ArrowDown',
      currentIndex: 0,
      targets,
    });
    assert.equal(step1.nextIndex, 1);
    assert.equal(step1.focusRingIndex, 1);
    assert.equal(step1.triggeredRoute, null);

    const step2 = handleSearchResultKeyStep({
      key: 'ArrowDown',
      currentIndex: step1.nextIndex,
      targets,
    });
    assert.equal(step2.nextIndex, 2);
    assert.equal(step2.focusRingIndex, 2);

    let navigatedTo: string | null = null;
    const enterStep = handleSearchResultKeyStep({
      key: 'Enter',
      currentIndex: step2.nextIndex,
      targets,
      onNavigate: (route) => {
        navigatedTo = route;
      },
    });
    const expectedRoute = normalizeSearchResultRoute(targets[2].item.url);
    assert.equal(enterStep.triggeredRoute, expectedRoute);
    assert.equal(navigatedTo, expectedRoute);
    assert.equal(resolveSelectedRouteOnEnter(targets, 2), expectedRoute);

    // 3. Verify CSS and JSX include focus-ring support and Enter route attributes
    const cssSource = fs.readFileSync(path.resolve(process.cwd(), 'src/index.css'), 'utf8');
    assert.ok(
      cssSource.includes('.search-result-item.focus-ring'),
      'Expected src/index.css to style .search-result-item.focus-ring'
    );
  });

  it("implements a 'Print this Tool' button across IT Tools workspace pages (Subnet Calculator, Cable Budget Checker) that triggers window.print() and leverages @media print CSS rules", async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const { triggerToolPrint } = await import('../src/components/common/PrintToolButton');

    // 1. Verify triggerToolPrint invokes window.print() and restores document.title
    const originalWindow = (globalThis as Record<string, unknown>).window;
    const originalDocument = (globalThis as Record<string, unknown>).document;
    let printCalls = 0;
    let printTimeTitle = '';
    const mockDoc = { title: 'Original Page Title' };

    (globalThis as Record<string, unknown>).document = mockDoc;
    (globalThis as Record<string, unknown>).window = {
      print: () => {
        printCalls += 1;
        printTimeTitle = mockDoc.title;
      },
    };

    try {
      const triggered = triggerToolPrint({
        documentTitle: 'IPv4 Subnet & CIDR Calculator — Engineering Report',
      });
      assert.equal(triggered, true);
      assert.equal(printCalls, 1);
      assert.equal(printTimeTitle, 'IPv4 Subnet & CIDR Calculator — Engineering Report');
      assert.equal(mockDoc.title, 'Original Page Title');
    } finally {
      (globalThis as Record<string, unknown>).window = originalWindow;
      (globalThis as Record<string, unknown>).document = originalDocument;
    }

    // 2. Verify IT Tools workspace pages (Subnet Calculator, Cable Budget Checker) and SocialShareBar render 'Print this Tool'
    const subnetSource = fs.readFileSync(
      path.resolve(process.cwd(), 'src/tools/Ipv4SubnetCalculator.tsx'),
      'utf8'
    );
    const cableSource = fs.readFileSync(
      path.resolve(process.cwd(), 'src/tools/CableLengthPoeChecker.tsx'),
      'utf8'
    );
    const shareBarSource = fs.readFileSync(
      path.resolve(process.cwd(), 'src/components/SocialShareBar.tsx'),
      'utf8'
    );
    const cssSource = fs.readFileSync(path.resolve(process.cwd(), 'src/index.css'), 'utf8');

    assert.ok(
      subnetSource.includes('PrintToolButton') && subnetSource.includes('Print this Tool'),
      'Expected Ipv4SubnetCalculator.tsx to include the Print this Tool button'
    );
    assert.ok(
      cableSource.includes('PrintToolButton') && cableSource.includes('Print this Tool'),
      'Expected CableLengthPoeChecker.tsx to include the Print this Tool button'
    );
    assert.ok(
      shareBarSource.includes('PrintToolButton'),
      'Expected SocialShareBar.tsx to include PrintToolButton for all IT tool workspaces'
    );
    assert.ok(
      cssSource.includes('@media print') &&
        cssSource.includes('.print-this-tool-btn') &&
        cssSource.includes('.ipv4-subnet-calculator-root') &&
        cssSource.includes('.cable-poe-root'),
      'Expected src/index.css @media print rules to hide .print-this-tool-btn and format tool workspaces'
    );
  });
});



