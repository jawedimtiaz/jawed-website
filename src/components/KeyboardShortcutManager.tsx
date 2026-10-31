import React, { useState, useEffect, useCallback, useRef, useMemo, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  KeyboardShortcutContext,
  ShortcutItem,
  matchHotkey,
} from '../hooks/useKeyboardShortcuts';
import { KeyboardShortcutModal } from './KeyboardShortcutModal';

interface KeyboardShortcutManagerProps {
  children: ReactNode;
}

const FOCUSABLE_MODAL_SELECTOR =
  'button:not([disabled]):not([data-focus-guard]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]):not([data-focus-guard])';

export const KeyboardShortcutManager: React.FC<KeyboardShortcutManagerProps> = ({ children }) => {
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [activePrefix, setActivePrefix] = useState<string | null>(null);
  const [lastTriggeredAction, setLastTriggeredAction] = useState<{
    id: string;
    label: string;
    timestamp: number;
  } | null>(null);

  const activePrefixRef = useRef<string | null>(null);
  const prefixTimeoutRef = useRef<number | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const appWrapperRef = useRef<HTMLDivElement | null>(null);
  const modalWrapperRef = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();

  const clearPrefix = useCallback(() => {
    if (prefixTimeoutRef.current !== null) {
      window.clearTimeout(prefixTimeoutRef.current);
      prefixTimeoutRef.current = null;
    }
    activePrefixRef.current = null;
    setActivePrefix(null);
  }, []);

  const activatePrefix = useCallback((prefix: string) => {
    if (prefixTimeoutRef.current !== null) {
      window.clearTimeout(prefixTimeoutRef.current);
    }
    activePrefixRef.current = prefix;
    setActivePrefix(prefix);
    setLastTriggeredAction(null);
    prefixTimeoutRef.current = window.setTimeout(() => {
      activePrefixRef.current = null;
      setActivePrefix(null);
      prefixTimeoutRef.current = null;
    }, 1500);
  }, []);

  useEffect(() => {
    return () => {
      if (prefixTimeoutRef.current !== null) {
        window.clearTimeout(prefixTimeoutRef.current);
      }
    };
  }, []);

  const captureActiveElementBeforeOpen = useCallback((explicitTrigger?: HTMLElement | null) => {
    if (explicitTrigger && explicitTrigger !== document.body) {
      previousFocusRef.current = explicitTrigger;
      return;
    }
    const active = document.activeElement as HTMLElement | null;
    if (
      active &&
      active !== document.body &&
      active !== document.documentElement &&
      !modalWrapperRef.current?.contains(active)
    ) {
      previousFocusRef.current = active;
    }
  }, []);

  const restorePreviousFocus = useCallback(() => {
    const target = previousFocusRef.current;
    if (target && typeof target.focus === 'function') {
      if (document.body.contains(target)) {
        target.focus();
      }
      window.requestAnimationFrame(() => {
        if (document.body.contains(target)) {
          target.focus();
        } else {
          const fallbackTrigger = document.querySelector<HTMLElement>(
            '[data-shortcuts-trigger="true"]'
          );
          fallbackTrigger?.focus();
        }
      });
    }
  }, []);

  const openHelpModal = useCallback(() => {
    captureActiveElementBeforeOpen();
    setIsHelpModalOpen(true);
  }, [captureActiveElementBeforeOpen]);

  const closeHelpModal = useCallback(() => {
    setIsHelpModalOpen(false);
    restorePreviousFocus();
  }, [restorePreviousFocus]);

  const toggleHelpModal = useCallback(() => {
    setIsHelpModalOpen((prev) => {
      if (!prev) {
        captureActiveElementBeforeOpen();
        return true;
      }
      restorePreviousFocus();
      return false;
    });
  }, [captureActiveElementBeforeOpen, restorePreviousFocus]);

  // Enforce WCAG modal focus trapping and background aria-hidden while the cheatsheet modal is open
  useEffect(() => {
    const appContentEl = appWrapperRef.current;
    if (!isHelpModalOpen) {
      if (appContentEl) {
        appContentEl.removeAttribute('aria-hidden');
      }
      return;
    }

    if (appContentEl) {
      appContentEl.setAttribute('aria-hidden', 'true');
    }

    const handleModalFocusTrap = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !modalWrapperRef.current) return;

      const focusableElements = Array.from(
        modalWrapperRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_MODAL_SELECTOR)
      ).filter((el) => {
        if (el.hasAttribute('disabled') || el.getAttribute('aria-hidden') === 'true') {
          return false;
        }
        const style = window.getComputedStyle(el);
        return style.display !== 'none' && style.visibility !== 'hidden';
      });

      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement as HTMLElement | null;

      if (e.shiftKey) {
        if (activeElement === firstElement || !modalWrapperRef.current.contains(activeElement)) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        if (activeElement === lastElement || !modalWrapperRef.current.contains(activeElement)) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    window.addEventListener('keydown', handleModalFocusTrap, true);
    return () => {
      window.removeEventListener('keydown', handleModalFocusTrap, true);
      if (appContentEl) {
        appContentEl.removeAttribute('aria-hidden');
      }
    };
  }, [isHelpModalOpen]);

  const triggerToastNotification = useCallback((id: string, label: string) => {
    setLastTriggeredAction({ id, label, timestamp: Date.now() });
  }, []);

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
  }, [triggerToastNotification]);

  const handleFocusSearch = useCallback(() => {
    window.dispatchEvent(new CustomEvent('open-search-modal'));
    triggerToastNotification('search-focus', 'Focus Search Bar (/)');
  }, [triggerToastNotification]);

  const handleToggleAiWidget = useCallback(() => {
    window.dispatchEvent(new CustomEvent('toggle-ai-widget'));
    triggerToastNotification('ai-widget', 'Jawed AI Assistant Widget (Alt+A)');
  }, [triggerToastNotification]);

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
    triggerToastNotification('theme', `Theme: ${label} (T)`);
  }, [triggerToastNotification]);

  const handleCloseAll = useCallback(() => {
    if (isHelpModalOpen) {
      closeHelpModal();
      triggerToastNotification('esc', 'Closed Shortcuts Dialog (Esc)');
      return;
    }
    window.dispatchEvent(new CustomEvent('close-all-modals'));
  }, [isHelpModalOpen, closeHelpModal, triggerToastNotification]);

  // Navigation handlers
  const handleGoHome = useCallback(() => {
    navigate('/');
    triggerToastNotification('nav-home', 'Go to Home (G + H)');
  }, [navigate, triggerToastNotification]);

  const handleGoGuides = useCallback(() => {
    navigate('/guides');
    triggerToastNotification('nav-guides', 'Go to Guides (G + G)');
  }, [navigate, triggerToastNotification]);

  const handleGoTools = useCallback(() => {
    navigate('/tools');
    triggerToastNotification('nav-tools', 'Go to Tools (G + T)');
  }, [navigate, triggerToastNotification]);

  const handleGoServices = useCallback(() => {
    navigate('/services');
    triggerToastNotification('nav-services', 'Go to Services (Alt+S)');
  }, [navigate, triggerToastNotification]);

  const handleGoContact = useCallback(() => {
    navigate('/contact');
    triggerToastNotification('nav-contact', 'Go to Contact Page (Alt+C)');
  }, [navigate, triggerToastNotification]);

  // List of active global default shortcuts
  const defaultShortcuts: ShortcutItem[] = useMemo(
    () => [
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
    ],
    [
      handleGoHome,
      handleGoTools,
      handleGoGuides,
      handleToggleSearchModal,
      handleToggleTheme,
      handleFocusSearch,
      toggleHelpModal,
      handleCloseAll,
      handleToggleAiWidget,
      handleGoServices,
      handleGoContact,
    ]
  );

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
    const handleOpenShortcutsEvent = (evt: Event) => {
      const customEvt = evt as CustomEvent<{ triggerElement?: HTMLElement | null }>;
      captureActiveElementBeforeOpen(customEvt.detail?.triggerElement || null);
      setIsHelpModalOpen(true);
    };
    const handleToggleShortcutsEvent = () => {
      toggleHelpModal();
    };

    window.addEventListener('open-shortcuts-modal', handleOpenShortcutsEvent);
    window.addEventListener('toggle-shortcuts-modal', handleToggleShortcutsEvent);
    return () => {
      window.removeEventListener('open-shortcuts-modal', handleOpenShortcutsEvent);
      window.removeEventListener('toggle-shortcuts-modal', handleToggleShortcutsEvent);
    };
  }, [captureActiveElementBeforeOpen, toggleHelpModal]);

  // Helper to determine if the user is actively typing or editing in a form control or rich-text field
  const isUserTypingInEditableField = useCallback((e: KeyboardEvent): boolean => {
    if (e.isComposing || e.keyCode === 229) {
      return true;
    }

    const isElementEditable = (el: EventTarget | null): boolean => {
      if (!el || !(el instanceof HTMLElement)) return false;

      const tagName = el.tagName.toUpperCase();

      if (tagName === 'TEXTAREA') {
        const textarea = el as HTMLTextAreaElement;
        return !textarea.disabled && !textarea.readOnly;
      }

      if (tagName === 'SELECT') {
        const select = el as HTMLSelectElement;
        return !select.disabled;
      }

      if (tagName === 'INPUT') {
        const input = el as HTMLInputElement;
        if (input.disabled || input.readOnly) return false;
        const nonTypingInputTypes = new Set([
          'button',
          'submit',
          'reset',
          'checkbox',
          'radio',
          'range',
          'color',
          'file',
          'image',
          'hidden',
        ]);
        return !nonTypingInputTypes.has((input.type || 'text').toLowerCase());
      }

      if (el.isContentEditable) {
        return true;
      }

      const contentEditableAttr = el.getAttribute('contenteditable');
      if (
        contentEditableAttr === '' ||
        contentEditableAttr === 'true' ||
        contentEditableAttr === 'plaintext-only'
      ) {
        return true;
      }

      const role = el.getAttribute('role')?.toLowerCase();
      if (
        role === 'textbox' ||
        role === 'searchbox' ||
        role === 'combobox' ||
        role === 'spinbutton'
      ) {
        return el.getAttribute('aria-disabled') !== 'true' && el.getAttribute('aria-readonly') !== 'true';
      }

      const editableAncestor = el.closest(
        'textarea:not([disabled]):not([readonly]), input:not([disabled]):not([readonly]), select:not([disabled]), [contenteditable="true"], [contenteditable=""], [contenteditable="plaintext-only"], [role="textbox"], [role="searchbox"], [role="combobox"]'
      );
      if (editableAncestor && editableAncestor !== el) {
        return isElementEditable(editableAncestor);
      }

      return false;
    };

    if (isElementEditable(e.target) || isElementEditable(document.activeElement)) {
      return true;
    }

    if (typeof e.composedPath === 'function') {
      for (const node of e.composedPath()) {
        if (isElementEditable(node)) {
          return true;
        }
      }
    }

    return false;
  }, []);

  // Global Keydown Listener (supports Shift + ?, G prefix for G+H / G+T / G+G chords, T, Cmd/Ctrl+K, Esc, etc.)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isEditable = isUserTypingInEditableField(e);
      const lowerKey = e.key.toLowerCase();

      // Global Shift + ? trigger (also supports '?' or Shift + '/' across keyboard layouts)
      const isShiftQuestionTrigger =
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey &&
        (e.key === '?' || (e.shiftKey && (e.key === '/' || e.code === 'Slash')));

      // Ignore Shift + ? when the user is actively typing in an input, textarea, or editable field
      if (isShiftQuestionTrigger) {
        if (isEditable) {
          return;
        }
        e.preventDefault();
        clearPrefix();
        toggleHelpModal();
        return;
      }

      // If the shortcuts cheatsheet modal is open, Escape closes it and restores focus
      if (isHelpModalOpen) {
        if (e.key === 'Escape') {
          e.preventDefault();
          clearPrefix();
          closeHelpModal();
          triggerToastNotification('esc', 'Closed Shortcuts Dialog (Esc)');
        }
        return;
      }

      // Handle active 'G' (Go) prefix chord navigation (G+H -> Home, G+T -> Tools, G+G -> Guides)
      if (activePrefixRef.current === 'g') {
        if (isEditable) {
          clearPrefix();
          return;
        }

        // Ignore bare modifier keys while waiting for the second chord key
        if (['shift', 'control', 'alt', 'meta'].includes(lowerKey)) {
          return;
        }

        if (e.key === 'Escape') {
          e.preventDefault();
          clearPrefix();
          return;
        }

        if (!e.metaKey && !e.ctrlKey && !e.altKey) {
          if (lowerKey === 'h') {
            e.preventDefault();
            clearPrefix();
            handleGoHome();
            return;
          }
          if (lowerKey === 't') {
            e.preventDefault();
            clearPrefix();
            handleGoTools();
            return;
          }
          if (lowerKey === 'g') {
            e.preventDefault();
            clearPrefix();
            handleGoGuides();
            return;
          }

          const chordShortcut = defaultShortcuts.find((s) => s.combo === `g+${lowerKey}`);
          if (chordShortcut) {
            e.preventDefault();
            clearPrefix();
            chordShortcut.action();
            return;
          }
        }

        // Unrecognized second key cancels the active prefix
        clearPrefix();
      }

      // Activate 'G' (Go) prefix when 'G' is pressed outside of editable inputs
      if (!isEditable && !e.metaKey && !e.ctrlKey && !e.altKey && !e.shiftKey && lowerKey === 'g') {
        e.preventDefault();
        activatePrefix('g');
        return;
      }

      for (const s of defaultShortcuts) {
        if (s.combo.startsWith('g+') || s.id === 'shortcuts-help') continue;
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
  }, [
    defaultShortcuts,
    isHelpModalOpen,
    isUserTypingInEditableField,
    clearPrefix,
    activatePrefix,
    toggleHelpModal,
    closeHelpModal,
    triggerToastNotification,
    handleGoHome,
    handleGoTools,
    handleGoGuides,
  ]);

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
        activePrefix,
      }}
    >
      <div ref={appWrapperRef} className="keyboard-shortcut-app-scope">
        {children}
      </div>

      {/* Interactive Keyboard Shortcut Cheat Sheet Modal with Focus Trap & Focus Restoration */}
      <div ref={modalWrapperRef}>
        <KeyboardShortcutModal
          isOpen={isHelpModalOpen}
          onClose={closeHelpModal}
          shortcuts={defaultShortcuts}
          onTriggerShortcut={triggerShortcut}
          triggerElementRef={previousFocusRef}
        />
      </div>

      {/* Visual Feedback Toast when 'G' (Go) Prefix Key is Pressed */}
      {activePrefix === 'g' && (
        <div
          role="status"
          aria-live="polite"
          aria-atomic="true"
          data-testid="shortcut-prefix-toast"
          style={{
            position: 'fixed',
            bottom: '24px',
            left: '24px',
            zIndex: 10001,
            background: 'var(--card)',
            border: '1px solid var(--accent)',
            borderRadius: '10px',
            padding: '10px 16px',
            fontSize: '0.84rem',
            fontWeight: 700,
            color: 'var(--text-heading)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '10px',
            animation: 'slideUpFade 0.16s ease-out',
            pointerEvents: 'none',
          }}
        >
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              color: 'var(--accent)',
            }}
          >
            <kbd
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: '22px',
                height: '22px',
                padding: '0 6px',
                borderRadius: '5px',
                background: 'var(--accent)',
                color: '#fff',
                fontFamily: 'var(--font-mono, monospace)',
                fontSize: '0.76rem',
                fontWeight: 800,
              }}
            >
              G
            </kbd>
            <span>Go to…</span>
          </span>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '0.78rem',
              fontWeight: 600,
              color: 'var(--text-muted, var(--text))',
            }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <kbd
                style={{
                  padding: '1px 5px',
                  borderRadius: '4px',
                  border: '1px solid var(--border)',
                  background: 'var(--bg)',
                  fontFamily: 'var(--font-mono, monospace)',
                  fontSize: '0.72rem',
                  color: 'var(--text-heading)',
                }}
              >
                H
              </kbd>
              Home
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <kbd
                style={{
                  padding: '1px 5px',
                  borderRadius: '4px',
                  border: '1px solid var(--border)',
                  background: 'var(--bg)',
                  fontFamily: 'var(--font-mono, monospace)',
                  fontSize: '0.72rem',
                  color: 'var(--text-heading)',
                }}
              >
                T
              </kbd>
              Tools
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <kbd
                style={{
                  padding: '1px 5px',
                  borderRadius: '4px',
                  border: '1px solid var(--border)',
                  background: 'var(--bg)',
                  fontFamily: 'var(--font-mono, monospace)',
                  fontSize: '0.72rem',
                  color: 'var(--text-heading)',
                }}
              >
                G
              </kbd>
              Guides
            </span>
          </span>
        </div>
      )}

      {/* Floating Hotkey Execution Toast Popup */}
      {lastTriggeredAction && !activePrefix && (
        <div
          role="status"
          aria-live="polite"
          data-testid="shortcut-action-toast"
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
          <span style={{ color: 'var(--accent)', fontSize: '1rem' }} aria-hidden="true">
            ⌨️
          </span>
          <span>{lastTriggeredAction.label}</span>
        </div>
      )}
    </KeyboardShortcutContext.Provider>
  );
};

