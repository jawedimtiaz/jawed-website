import React, { useState, useEffect, useCallback } from 'react';
import { Sun, Moon, Monitor, type LucideIcon } from 'lucide-react';

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

export const applyThemeToDom = (mode: ThemeMode) => {
  if (typeof document === 'undefined') return;
  const resolved = mode === 'system' ? getSystemTheme() : mode;
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
      // Fallback for older browser engines
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

  const options: { id: ThemeMode; label: string; icon: LucideIcon }[] = [
    { id: 'system', label: 'System', icon: Monitor },
    { id: 'light', label: 'Light', icon: Sun },
    { id: 'dark', label: 'Dark', icon: Moon },
  ];

  return (
    <div
      role="radiogroup"
      aria-label="Theme selection"
      className={`theme-toggle-group ${className}`}
    >
      {options.map((opt) => {
        const Icon = opt.icon;
        const isActive = mode === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            role="radio"
            aria-checked={isActive}
            className={`theme-toggle-btn-option ${isActive ? 'is-active' : ''}`}
            onClick={() => selectMode(opt.id)}
            title={`Switch to ${opt.label} mode${opt.id === 'system' ? ` (follows OS, currently ${getSystemTheme()})` : ''}`}
            aria-label={`${opt.label} theme`}
          >
            <Icon size={14} aria-hidden="true" />
            <span className="theme-toggle-btn-label">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
};
