import React, { useState, useEffect, useLayoutEffect, useCallback } from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';

export type ThemeMode = 'system' | 'light' | 'dark';

export const THEME_MODES: readonly ThemeMode[] = ['system', 'light', 'dark'] as const;

export const THEME_MODE_OPTIONS: readonly {
  mode: ThemeMode;
  label: 'Light' | 'Dark' | 'System';
  testId: string;
}[] = [
  { mode: 'light', label: 'Light', testId: 'theme-mode-btn-light' },
  { mode: 'dark', label: 'Dark', testId: 'theme-mode-btn-dark' },
  { mode: 'system', label: 'System', testId: 'theme-mode-btn-system' },
] as const;

export const THEME_STORAGE_KEY = 'theme';

const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect;

export const getNextThemeMode = (currentMode: ThemeMode): ThemeMode => {
  switch (currentMode) {
    case 'system':
      return 'light';
    case 'light':
      return 'dark';
    case 'dark':
    default:
      return 'system';
  }
};

export const getThemeModeLabel = (mode: ThemeMode): 'System' | 'Light' | 'Dark' => {
  switch (mode) {
    case 'light':
      return 'Light';
    case 'dark':
      return 'Dark';
    case 'system':
    default:
      return 'System';
  }
};

export const getSystemTheme = (): 'light' | 'dark' => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return 'dark';
  }
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
};

export const getSavedThemeMode = (storageKey: string = THEME_STORAGE_KEY): ThemeMode => {
  if (typeof window === 'undefined') return 'system';
  try {
    const saved = window.localStorage.getItem(storageKey);
    if (saved === 'light' || saved === 'dark' || saved === 'system') {
      return saved;
    }
  } catch {
    // Restricted environment (e.g. cookies/storage blocked)
  }
  return 'system';
};

export const getResolvedTheme = (mode: ThemeMode = getSavedThemeMode()): 'light' | 'dark' => {
  return mode === 'system' ? getSystemTheme() : mode;
};

export const applyThemeToDom = (mode: ThemeMode): 'light' | 'dark' => {
  const resolved = getResolvedTheme(mode);
  if (typeof document === 'undefined' || !document.documentElement) {
    return resolved;
  }
  const root = document.documentElement;
  root.setAttribute('data-theme', resolved);
  root.setAttribute('data-theme-mode', mode);
  if (resolved === 'dark') {
    root.classList.add('dark');
    root.classList.remove('light');
  } else {
    root.classList.add('light');
    root.classList.remove('dark');
  }
  if (root.style) {
    root.style.colorScheme = resolved;
  }
  return resolved;
};

/**
 * Explicitly sets the theme mode ('light' | 'dark' | 'system'), persists it to localStorage,
 * updates `document.documentElement`'s `data-theme` and `data-theme-mode` attributes,
 * and dispatches the global `theme-changed` event.
 */
export const setThemePreference = (
  newMode: ThemeMode,
  storageKey: string = THEME_STORAGE_KEY
): { mode: ThemeMode; resolvedTheme: 'light' | 'dark' } => {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(storageKey, newMode);
    } catch {
      // Storage restricted
    }
  }
  const resolvedTheme = applyThemeToDom(newMode);
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    try {
      window.dispatchEvent(
        new CustomEvent('theme-changed', { detail: { theme: newMode, resolvedTheme } })
      );
    } catch {
      // Ignore CustomEvent error in minimal test environments
    }
  }
  return { mode: newMode, resolvedTheme };
};

/**
 * Synchronously checks localStorage for a saved user theme preference ('dark' | 'light' | 'system')
 * and immediately updates `document.documentElement` classes (`dark` / `light`) and `data-theme`
 * on page load to eliminate Flash of Unstyled Content (FOUC).
 */
export const syncThemeFromLocalStorage = (options?: {
  storageKey?: string;
  fallbackTheme?: 'light' | 'dark';
}): 'light' | 'dark' => {
  const storageKey = options?.storageKey || THEME_STORAGE_KEY;
  let savedMode: ThemeMode = 'system';

  if (typeof window !== 'undefined') {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw === 'dark' || raw === 'light' || raw === 'system') {
        savedMode = raw;
      }
    } catch {
      // Ignore storage access errors in strict browsing modes
    }
  }

  const resolved: 'light' | 'dark' =
    savedMode === 'dark' || savedMode === 'light'
      ? savedMode
      : options?.fallbackTheme ?? getSystemTheme();

  if (typeof document !== 'undefined' && document.documentElement) {
    const root = document.documentElement;
    root.setAttribute('data-theme', resolved);
    root.setAttribute('data-theme-mode', savedMode);
    if (resolved === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }
    if (root.style) {
      root.style.colorScheme = resolved;
    }
  }

  return resolved;
};

// Execute immediate synchronous theme check on module evaluation to prevent FOUC
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  syncThemeFromLocalStorage();
}

export interface ThemeToggleProps {
  className?: string;
  onThemeChange?: (mode: ThemeMode) => void;
  /**
   * When true (default), persists and reads theme preference from localStorage
   * and immediately updates `document.documentElement` class on mount/load.
   */
  syncWithLocalStorage?: boolean;
  storageKey?: string;
  showLabel?: boolean;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  className = '',
  onThemeChange,
  syncWithLocalStorage = true,
  storageKey = THEME_STORAGE_KEY,
  showLabel = true,
}) => {
  const [mode, setMode] = useState<ThemeMode>(() => {
    if (syncWithLocalStorage) {
      const initialSaved = getSavedThemeMode(storageKey);
      applyThemeToDom(initialSaved);
      return initialSaved;
    }
    if (typeof document !== 'undefined' && document.documentElement) {
      const modeAttr = document.documentElement.getAttribute?.('data-theme-mode');
      if (modeAttr === 'system' || modeAttr === 'light' || modeAttr === 'dark') {
        return modeAttr;
      }
      if (document.documentElement.classList.contains('light')) return 'light';
      if (document.documentElement.classList.contains('dark')) return 'dark';
    }
    return 'system';
  });

  // Track OS color scheme dynamically so 'system' mode re-renders when OS preference changes
  const [, setSystemRevision] = useState(0);

  // Apply theme and optionally persist choice to localStorage
  const selectMode = useCallback(
    (newMode: ThemeMode) => {
      setMode(newMode);
      if (syncWithLocalStorage) {
        setThemePreference(newMode, storageKey);
      } else {
        applyThemeToDom(newMode);
      }
      if (onThemeChange) {
        onThemeChange(newMode);
      }
    },
    [onThemeChange, syncWithLocalStorage, storageKey]
  );

  // Synchronous layout effect before paint to ensure zero FOUC
  useIsomorphicLayoutEffect(() => {
    if (syncWithLocalStorage) {
      const saved = getSavedThemeMode(storageKey);
      if (saved !== mode) {
        setMode(saved);
      }
      applyThemeToDom(saved);
    } else {
      applyThemeToDom(mode);
    }
  }, [syncWithLocalStorage, storageKey]);

  // Keep DOM synchronized whenever mode changes
  useEffect(() => {
    applyThemeToDom(mode);
  }, [mode]);

  // Listen to OS preference changes when 'system' mode is active
  useEffect(() => {
    if (mode !== 'system' || typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: light)');
    const handleSystemChange = () => {
      applyThemeToDom('system');
      setSystemRevision((r) => r + 1);
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleSystemChange);
      return () => mediaQuery.removeEventListener('change', handleSystemChange);
    } else {
      mediaQuery.addListener(handleSystemChange);
      return () => mediaQuery.removeListener(handleSystemChange);
    }
  }, [mode]);

  // Synchronize if external keyboard shortcut, cross-tab storage event, or component fires 'theme-changed'
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleExternalChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ theme: ThemeMode | 'light' | 'dark' }>;
      const incoming = customEvent.detail?.theme;
      if (incoming && (incoming === 'system' || incoming === 'light' || incoming === 'dark')) {
        setMode(incoming);
        applyThemeToDom(incoming);
      }
    };

    const handleStorageEvent = (e: StorageEvent) => {
      if (!syncWithLocalStorage) return;
      if (e.key === storageKey) {
        const nextSaved =
          e.newValue === 'light' || e.newValue === 'dark' || e.newValue === 'system'
            ? e.newValue
            : 'system';
        setMode(nextSaved);
        applyThemeToDom(nextSaved);
      }
    };

    window.addEventListener('theme-changed', handleExternalChange);
    window.addEventListener('storage', handleStorageEvent);
    return () => {
      window.removeEventListener('theme-changed', handleExternalChange);
      window.removeEventListener('storage', handleStorageEvent);
    };
  }, [syncWithLocalStorage, storageKey]);

  const resolvedTheme = getResolvedTheme(mode);
  const nextMode: ThemeMode = getNextThemeMode(mode);
  const resolvedLabel = resolvedTheme === 'light' ? 'Light' : 'Dark';

  return (
    <div
      role="group"
      aria-label="Theme mode selector"
      data-testid="theme-toggle-btn"
      data-theme-mode={mode}
      data-theme-resolved={resolvedTheme}
      data-next-theme-mode={nextMode}
      className={`theme-toggle-group ${className}`.trim()}
    >
      {THEME_MODE_OPTIONS.map((opt) => {
        const isActive = mode === opt.mode;
        return (
          <button
            key={opt.mode}
            type="button"
            onClick={() => selectMode(opt.mode)}
            data-testid={opt.testId}
            data-theme-option={opt.mode}
            aria-pressed={isActive}
            aria-label={
              opt.mode === 'system'
                ? `System theme mode (currently ${resolvedLabel})`
                : `${opt.label} theme mode`
            }
            title={
              opt.mode === 'system'
                ? `System mode (follows OS preference: ${resolvedLabel})`
                : `Switch to ${opt.label} mode`
            }
            className={`theme-toggle-btn-option ${isActive ? 'is-active' : ''}`.trim()}
          >
            {opt.mode === 'light' ? (
              <Sun size={14} aria-hidden="true" />
            ) : opt.mode === 'dark' ? (
              <Moon size={14} aria-hidden="true" />
            ) : (
              <Monitor size={14} aria-hidden="true" />
            )}
            {showLabel && (
              <span className="theme-toggle-btn-label" data-testid={`theme-mode-label-${opt.mode}`}>
                {opt.label}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

export const HeaderThemeToggle = ThemeToggle;
export default ThemeToggle;
