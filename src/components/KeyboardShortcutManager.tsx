import React, { useState, useEffect, useCallback, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  KeyboardShortcutContext,
  ShortcutItem,
  matchHotkey,
  formatComboForDisplay,
} from '../hooks/useKeyboardShortcuts';
import { KeyboardShortcutHelpModal } from './KeyboardShortcutHelpModal';

interface KeyboardShortcutManagerProps {
  children: ReactNode;
}

export const KeyboardShortcutManager: React.FC<KeyboardShortcutManagerProps> = ({ children }) => {
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [lastTriggeredAction, setLastTriggeredAction] = useState<{
    id: string;
    label: string;
    timestamp: number;
  } | null>(null);
  const navigate = useNavigate();

  const openHelpModal = useCallback(() => setIsHelpModalOpen(true), []);
  const closeHelpModal = useCallback(() => setIsHelpModalOpen(false), []);
  const toggleHelpModal = useCallback(() => setIsHelpModalOpen((prev) => !prev), []);

  const triggerToastNotification = (id: string, label: string) => {
    setLastTriggeredAction({ id, label, timestamp: Date.now() });
  };

  // Auto-hide toast notification after 2 seconds
  useEffect(() => {
    if (!lastTriggeredAction) return;
    const timer = setTimeout(() => {
      setLastTriggeredAction(null);
    }, 2000);
    return () => clearTimeout(timer);
  }, [lastTriggeredAction]);

  // Actions
  const handleToggleSearchModal = useCallback(() => {
    window.dispatchEvent(new CustomEvent('toggle-search-modal'));
    triggerToastNotification('search', 'Global Search Command Palette (Ctrl+K)');
  }, []);

  const handleFocusSearch = useCallback(() => {
    window.dispatchEvent(new CustomEvent('open-search-modal'));
    triggerToastNotification('search-focus', 'Focus Search Bar (/)');
  }, []);

  const handleToggleAiWidget = useCallback(() => {
    window.dispatchEvent(new CustomEvent('toggle-ai-widget'));
    triggerToastNotification('ai-widget', 'Jawed AI Assistant Widget (Alt+A)');
  }, []);

  const handleToggleTheme = useCallback(() => {
    let currentMode: 'system' | 'light' | 'dark' = 'system';
    try {
      const saved = localStorage.getItem('theme');
      if (saved === 'system' || saved === 'light' || saved === 'dark') {
        currentMode = saved as 'system' | 'light' | 'dark';
      }
    } catch {}

    const cycle: Record<'system' | 'light' | 'dark', 'system' | 'light' | 'dark'> = {
      system: 'light',
      light: 'dark',
      dark: 'system',
    };
    const nextMode = cycle[currentMode] || 'light';

    const getSystem = () =>
      window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    const resolved = nextMode === 'system' ? getSystem() : nextMode;

    const doc = document.documentElement;
    doc.setAttribute('data-theme', resolved);
    if (resolved === 'dark') {
      doc.classList.add('dark');
      doc.classList.remove('light');
    } else {
      doc.classList.add('light');
      doc.classList.remove('dark');
    }

    try {
      localStorage.setItem('theme', nextMode);
    } catch {}

    window.dispatchEvent(new CustomEvent('theme-changed', { detail: { theme: nextMode } }));
    const label =
      nextMode === 'system'
        ? `SYSTEM (${resolved.toUpperCase()})`
        : nextMode.toUpperCase();
    triggerToastNotification('theme', `Theme: ${label} (Alt+T)`);
  }, []);

  const handleCloseAll = useCallback(() => {
    if (isHelpModalOpen) {
      closeHelpModal();
      triggerToastNotification('esc', 'Closed Shortcuts Dialog (Esc)');
      return;
    }
    window.dispatchEvent(new CustomEvent('close-all-modals'));
  }, [isHelpModalOpen, closeHelpModal]);

  // Navigation handlers
  const handleGoHome = useCallback(() => {
    navigate('/');
    triggerToastNotification('nav-home', 'Go to Home (G + H)');
  }, [navigate]);

  const handleGoGuides = useCallback(() => {
    navigate('/guides');
    triggerToastNotification('nav-guides', 'Go to Guides (G + G)');
  }, [navigate]);

  const handleGoTools = useCallback(() => {
    navigate('/tools');
    triggerToastNotification('nav-tools', 'Go to Tools (G + T)');
  }, [navigate]);

  const handleGoServices = useCallback(() => {
    navigate('/services');
    triggerToastNotification('nav-services', 'Go to Services (Alt+S)');
  }, [navigate]);

  const handleGoContact = useCallback(() => {
    navigate('/contact');
    triggerToastNotification('nav-contact', 'Go to Contact Page (Alt+C)');
  }, [navigate]);

  // List of active global default shortcuts
  const defaultShortcuts: ShortcutItem[] = [
    {
      id: 'nav-home',
      combo: 'g+h',
      label: 'Go to Home',
      description: 'G + H -> Go to Home',
      category: 'Navigation',
      allowInInput: false,
      action: handleGoHome,
    },
    {
      id: 'nav-tools',
      combo: 'g+t',
      label: 'Go to Tools',
      description: 'G + T -> Go to Tools',
      category: 'Navigation',
      allowInInput: false,
      action: handleGoTools,
    },
    {
      id: 'nav-guides',
      combo: 'g+g',
      label: 'Go to Guides',
      description: 'G + G -> Go to Guides',
      category: 'Navigation',
      allowInInput: false,
      action: handleGoGuides,
    },
    {
      id: 'search-modal',
      combo: 'mod+k',
      label: 'Open Search',
      description: '⌘ + K -> Open Search',
      category: 'Search & Modals',
      allowInInput: true,
      action: handleToggleSearchModal,
    },
    {
      id: 'toggle-theme',
      combo: 't',
      label: 'Toggle Theme (Dark / Light)',
      description: 'T -> Toggle Theme (Dark / Light)',
      category: 'Global Controls',
      allowInInput: false,
      action: handleToggleTheme,
    },
    {
      id: 'focus-search',
      combo: '/',
      label: 'Focus Search Input',
      description: 'Press / to quickly open search modal from anywhere',
      category: 'Search & Modals',
      allowInInput: false,
      action: handleFocusSearch,
    },
    {
      id: 'shortcuts-help',
      combo: 'shift+?',
      label: 'Keyboard Shortcuts',
      description: 'Open keyboard shortcuts cheatsheet modal (Shift + ?)',
      category: 'Search & Modals',
      allowInInput: false,
      action: toggleHelpModal,
    },
    {
      id: 'close-modals',
      combo: 'esc',
      label: 'Close Active Modals',
      description: 'Dismiss open search modal, AI widget, or dialogs',
      category: 'Search & Modals',
      allowInInput: true,
      action: handleCloseAll,
    },
    {
      id: 'ai-widget',
      combo: 'alt+a',
      label: 'Toggle AI Assistant',
      description: 'Open or minimize Jawed AI troubleshooting widget',
      category: 'AI Assistant',
      allowInInput: true,
      action: handleToggleAiWidget,
    },
    {
      id: 'nav-services',
      combo: 'alt+s',
      label: 'Go to Services',
      description: 'Navigate to IT field services dispatch',
      category: 'Navigation',
      allowInInput: false,
      action: handleGoServices,
    },
    {
      id: 'nav-contact',
      combo: 'alt+c',
      label: 'Go to Contact Page',
      description: 'Navigate to direct contact & support page',
      category: 'Navigation',
      allowInInput: false,
      action: handleGoContact,
    },
  ];

  const triggerShortcut = useCallback(
    (id: string) => {
      const match = defaultShortcuts.find((s) => s.id === id);
      if (match) {
        match.action();
      }
    },
    [defaultShortcuts]
  );

  // Listen for custom open/toggle events from Footer or Command Palette
  useEffect(() => {
    const handleOpenShortcutsEvent = () => setIsHelpModalOpen(true);
    const handleToggleShortcutsEvent = () => setIsHelpModalOpen((prev) => !prev);

    window.addEventListener('open-shortcuts-modal', handleOpenShortcutsEvent);
    window.addEventListener('toggle-shortcuts-modal', handleToggleShortcutsEvent);
    return () => {
      window.removeEventListener('open-shortcuts-modal', handleOpenShortcutsEvent);
      window.removeEventListener('toggle-shortcuts-modal', handleToggleShortcutsEvent);
    };
  }, []);

  // Global Keydown Listener (supports Shift+?, G+H / G+T / G+G chords, T, Cmd/Ctrl+K, etc.)
  useEffect(() => {
    let gPrefixTimestamp = 0;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isEditable =
        Boolean(
          target &&
            (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable)
        );

      const lowerKey = e.key.toLowerCase();

      // Shift + ? or '?' when not typing in an input opens/toggles the cheatsheet modal
      if ((e.key === '?' || (e.shiftKey && e.key === '/')) && !isEditable) {
        e.preventDefault();
        toggleHelpModal();
        return;
      }

      // Handle G + H, G + T, G + G two-key chord navigation when not in an input
      if (!isEditable && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const now = Date.now();
        if (now - gPrefixTimestamp < 1000) {
          if (lowerKey === 'h') {
            e.preventDefault();
            gPrefixTimestamp = 0;
            handleGoHome();
            return;
          }
          if (lowerKey === 't') {
            e.preventDefault();
            gPrefixTimestamp = 0;
            handleGoTools();
            return;
          }
          if (lowerKey === 'g') {
            e.preventDefault();
            gPrefixTimestamp = 0;
            handleGoGuides();
            return;
          }
        }

        if (lowerKey === 'g' && !e.shiftKey) {
          gPrefixTimestamp = now;
          return;
        }
      }

      for (const s of defaultShortcuts) {
        if (s.combo.startsWith('g+')) continue;
        if (matchHotkey(e, s.combo)) {
          if (isEditable && !s.allowInInput) {
            continue;
          }
          e.preventDefault();
          s.action();
          break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [defaultShortcuts, toggleHelpModal, handleGoHome, handleGoTools, handleGoGuides]);

  return (
    <KeyboardShortcutContext.Provider
      value={{
        shortcuts: defaultShortcuts,
        isHelpModalOpen,
        openHelpModal,
        closeHelpModal,
        toggleHelpModal,
        triggerShortcut,
        lastTriggeredAction,
      }}
    >
      {children}

      {/* Interactive Keyboard Shortcut Cheat Sheet Modal */}
      <KeyboardShortcutHelpModal
        isOpen={isHelpModalOpen}
        onClose={closeHelpModal}
        shortcuts={defaultShortcuts}
        onTriggerShortcut={triggerShortcut}
      />

      {/* Floating Hotkey Execution Toast Popup */}
      {lastTriggeredAction && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: 'fixed',
            bottom: '24px',
            left: '24px',
            zIndex: 10000,
            background: 'var(--card)',
            border: '1px solid var(--accent)',
            borderRadius: '10px',
            padding: '10px 16px',
            fontSize: '0.84rem',
            fontWeight: 700,
            color: 'var(--text-heading)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            animation: 'slideUpFade 0.2s ease-out',
            pointerEvents: 'none',
          }}
        >
          <span style={{ color: 'var(--accent)', fontSize: '1rem' }}>⌨️</span>
          <span>{lastTriggeredAction.label}</span>
        </div>
      )}
    </KeyboardShortcutContext.Provider>
  );
};
