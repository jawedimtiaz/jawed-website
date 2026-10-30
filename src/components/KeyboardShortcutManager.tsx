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
    triggerToastNotification('nav-home', 'Navigated Home (Alt+H)');
  }, [navigate]);

  const handleGoGuides = useCallback(() => {
    navigate('/guides');
    triggerToastNotification('nav-guides', 'Navigated to Field Guides (Alt+G)');
  }, [navigate]);

  const handleGoTools = useCallback(() => {
    navigate('/tools');
    triggerToastNotification('nav-tools', 'Navigated to Diagnostic Tools (Alt+W)');
  }, [navigate]);

  const handleGoServices = useCallback(() => {
    navigate('/services');
    triggerToastNotification('nav-services', 'Navigated to Services Dispatch (Alt+S)');
  }, [navigate]);

  const handleGoContact = useCallback(() => {
    navigate('/contact');
    triggerToastNotification('nav-contact', 'Navigated to Contact Page (Alt+C)');
  }, [navigate]);

  // List of active global default shortcuts
  const defaultShortcuts: ShortcutItem[] = [
    {
      id: 'search-modal',
      combo: 'mod+k',
      label: 'Global Search Palette',
      description: 'Open or dismiss global search command palette',
      category: 'Search & Modals',
      allowInInput: true,
      action: handleToggleSearchModal,
    },
    {
      id: 'focus-search',
      combo: '/',
      label: 'Focus Search Input',
      description: 'Quickly open search modal from anywhere',
      category: 'Search & Modals',
      allowInInput: false,
      action: handleFocusSearch,
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
      id: 'ai-widget-ctrl-j',
      combo: 'ctrl+j',
      label: 'Toggle AI Assistant (Ctrl+J)',
      description: 'Alternative quick shortcut for Jawed AI Assistant',
      category: 'AI Assistant',
      allowInInput: true,
      action: handleToggleAiWidget,
    },
    {
      id: 'shortcuts-help',
      combo: 'shift+?',
      label: 'Shortcut Cheat Sheet',
      description: 'Display interactive list of all global hotkeys',
      category: 'Search & Modals',
      allowInInput: true,
      action: toggleHelpModal,
    },
    {
      id: 'shortcuts-help-alt',
      combo: 'ctrl+/',
      label: 'Shortcut Cheat Sheet (Ctrl+/)',
      description: 'Alternative hotkey for shortcut cheat sheet',
      category: 'Search & Modals',
      allowInInput: true,
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
      id: 'toggle-theme',
      combo: 'alt+t',
      label: 'Cycle Theme (System / Light / Dark)',
      description: 'Cycle application theme between System, Light, and Dark',
      category: 'Global Controls',
      allowInInput: true,
      action: handleToggleTheme,
    },
    {
      id: 'nav-home',
      combo: 'alt+h',
      label: 'Go to Home Page',
      description: 'Navigate to site homepage',
      category: 'Navigation',
      allowInInput: false,
      action: handleGoHome,
    },
    {
      id: 'nav-guides',
      combo: 'alt+g',
      label: 'Go to Field Guides',
      description: 'Navigate to IT technical notes & field guides',
      category: 'Navigation',
      allowInInput: false,
      action: handleGoGuides,
    },
    {
      id: 'nav-tools',
      combo: 'alt+w',
      label: 'Go to Diagnostic Tools',
      description: 'Navigate to workplace calculators & IT tools',
      category: 'Navigation',
      allowInInput: false,
      action: handleGoTools,
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

  // Global Keydown Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if user is typing inside an editable form element
      const target = e.target as HTMLElement | null;
      const isEditable =
        target &&
        (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable);

      for (const s of defaultShortcuts) {
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
  }, [defaultShortcuts]);

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
