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
});
