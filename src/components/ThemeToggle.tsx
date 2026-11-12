import React, { useState, useEffect, useLayoutEffect, useCallback } from 'react';
import { Sun, Moon } from 'lucide-react';

export type ThemeMode = 'system' | 'light' | 'dark';

export const THEME_STORAGE_KEY = 'theme';

const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect;

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
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  className = '',
  onThemeChange,
  syncWithLocalStorage = true,
  storageKey = THEME_STORAGE_KEY,
}) => {
  // The initial React tree must be identical during SSG and browser hydration.
  // The saved preference is restored in the layout effect below.
  const [mode, setMode] = useState<ThemeMode>('system');
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  // Apply theme and optionally persist choice to localStorage
  const selectMode = useCallback(
    (newMode: ThemeMode) => {
      setMode(newMode);
      if (syncWithLocalStorage && typeof window !== 'undefined') {
        try {
          window.localStorage.setItem(storageKey, newMode);
        } catch {
          // Storage restricted
        }
      }
      applyThemeToDom(newMode);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('theme-changed', { detail: { theme: newMode } }));
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

  // Use a deterministic value until after hydration; the document theme itself
  // can still be applied synchronously by the existing pre-paint theme sync.
  const resolvedTheme = hasMounted ? getResolvedTheme(mode) : 'dark';
  const nextTheme: 'light' | 'dark' = resolvedTheme === 'dark' ? 'light' : 'dark';

  const handleToggle = () => {
    selectMode(nextTheme);
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      data-testid="theme-toggle-btn"
      data-theme-resolved={resolvedTheme}
      className={`theme-toggle-btn inline-flex items-center justify-center p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800/80 border border-slate-700/60 transition-all ${className}`.trim()}
      title={`Switch to ${nextTheme === 'light' ? 'Light' : 'Dark'} mode`}
      aria-label={`Switch to ${nextTheme === 'light' ? 'light' : 'dark'} mode`}
    >
      {resolvedTheme === 'dark' ? (
        <Sun size={18} aria-hidden="true" />
      ) : (
        <Moon size={18} aria-hidden="true" />
      )}
    </button>
  );
};


