import React, { useState, useEffect, useCallback } from 'react';
import { Sun, Moon } from 'lucide-react';

export type ThemeMode = 'system' | 'light' | 'dark';

export const getSystemTheme = (): 'light' | 'dark' => {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
};

export const getSavedThemeMode = (): ThemeMode => {
  if (typeof window === 'undefined') return 'system';
  try {
    const saved = window.localStorage.getItem('theme');
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

export const applyThemeToDom = (mode: ThemeMode) => {
  if (typeof document === 'undefined') return;
  const resolved = getResolvedTheme(mode);
  document.documentElement.setAttribute('data-theme', resolved);
  if (resolved === 'dark') {
    document.documentElement.classList.add('dark');
    document.documentElement.classList.remove('light');
  } else {
    document.documentElement.classList.add('light');
    document.documentElement.classList.remove('dark');
  }
};

interface ThemeToggleProps {
  className?: string;
  onThemeChange?: (mode: ThemeMode) => void;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ className = '', onThemeChange }) => {
  const [mode, setMode] = useState<ThemeMode>(getSavedThemeMode);

  // Apply theme and persist choice
  const selectMode = useCallback(
    (newMode: ThemeMode) => {
      setMode(newMode);
      try {
        window.localStorage.setItem('theme', newMode);
      } catch {
        // Storage restricted
      }
      applyThemeToDom(newMode);
      window.dispatchEvent(new CustomEvent('theme-changed', { detail: { theme: newMode } }));
      if (onThemeChange) {
        onThemeChange(newMode);
      }
    },
    [onThemeChange]
  );

  // Initial sync with DOM on mount
  useEffect(() => {
    applyThemeToDom(mode);
  }, [mode]);

  // Listen to OS preference changes when 'system' mode is active
  useEffect(() => {
    if (mode !== 'system' || typeof window === 'undefined') return;

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

  // Synchronize if external keyboard shortcut or component fires 'theme-changed'
  useEffect(() => {
    const handleExternalChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ theme: ThemeMode | 'light' | 'dark' }>;
      const incoming = customEvent.detail?.theme;
      if (incoming && (incoming === 'system' || incoming === 'light' || incoming === 'dark')) {
        setMode(incoming);
        applyThemeToDom(incoming);
      }
    };

    window.addEventListener('theme-changed', handleExternalChange);
    return () => window.removeEventListener('theme-changed', handleExternalChange);
  }, []);

  const resolvedTheme = getResolvedTheme(mode);
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

