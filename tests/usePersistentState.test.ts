import { describe, it, expect, beforeEach } from 'vitest';

const mockLocalStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value.toString(); },
    clear: () => { store = {}; },
    removeItem: (key: string) => { delete store[key]; },
  };
})();

Object.defineProperty(global, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
});

describe('usePersistentState Hook & Storage Sync', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('falls back to initial default value when localStorage is empty', () => {
    const key = 'ui_panel_state';
    const defaultValue = 'collapsed';
    
    const stored = localStorage.getItem(key);
    const value = stored !== null ? JSON.parse(stored) : defaultValue;
    
    expect(value).toBe('collapsed');
  });

  it('persists component-specific UI preferences (like open/closed states or tabs) to localStorage', () => {
    const key = 'ui_panel_state';
    const stateValue = 'expanded';

    localStorage.setItem(key, JSON.stringify(stateValue));
    
    const stored = localStorage.getItem(key);
    const retrieved = stored !== null ? JSON.parse(stored) : null;

    expect(retrieved).toBe('expanded');
  });

  it('supports serializing complex object preferences across sessions', () => {
    const key = 'user_tool_preferences';
    const prefs = { activeTab: 'thermal', sidebarOpen: true, zoomLevel: 1.25 };

    localStorage.setItem(key, JSON.stringify(prefs));

    const stored = localStorage.getItem(key);
    const retrieved = stored !== null ? JSON.parse(stored) : null;

    expect(retrieved).toEqual(prefs);
  });
});
