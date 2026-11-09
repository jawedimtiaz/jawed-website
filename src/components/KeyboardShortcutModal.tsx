import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { ShortcutItem, formatComboForDisplay } from '../hooks/useKeyboardShortcuts';
import { VOICE_COMMAND_RULES, VoiceCommandRule } from './KeyboardShortcutManager';

export type ShortcutDisplayMode = 'modal' | 'side-panel' | 'floating';

export interface KeyboardShortcutModalProps {
  isOpen: boolean;
  onClose: () => void;
  shortcuts: ShortcutItem[];
  onTriggerShortcut: (id: string) => void;
  triggerElementRef?: React.MutableRefObject<HTMLElement | null>;
  voiceCommands?: VoiceCommandRule[];
  isVoiceSupported?: boolean;
  isVoiceListening?: boolean;
  onToggleVoice?: () => void;
}

const FOCUSABLE_SELECTOR =
  'button:not([disabled]):not([data-focus-guard]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]):not([data-focus-guard])';

const SR_ONLY_STYLE: React.CSSProperties = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  padding: 0,
  margin: '-1px',
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: 0,
};

function isElementVisibleAndFocusable(el: HTMLElement): boolean {
  if (el.hasAttribute('disabled') || el.hasAttribute('hidden')) return false;
  if (el.getAttribute('aria-hidden') === 'true') return false;
  if (typeof window !== 'undefined' && typeof window.getComputedStyle === 'function') {
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden') {
      return false;
    }
  }
  return true;
}

export const KeyboardShortcutModal: React.FC<KeyboardShortcutModalProps> = ({
  isOpen,
  onClose,
  shortcuts,
  onTriggerShortcut,
  triggerElementRef,
  voiceCommands = VOICE_COMMAND_RULES,
  isVoiceSupported = false,
  isVoiceListening = false,
  onToggleVoice,
}) => {
  // Display Mode: 'modal' (Centered Dialog), 'side-panel' (Right Sliding Drawer), or 'floating' (Docked Floating Window)
  const [displayMode, setDisplayMode] = useState<ShortcutDisplayMode>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('shortcut_guide_display_mode');
      if (saved === 'side-panel' || saved === 'modal' || saved === 'floating') return saved;
    }
    return 'modal';
  });

  const [activeTab, setActiveTab] = useState<string>('all');
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [liveAnnouncement, setLiveAnnouncement] = useState<string>('');
  const [assertiveAnnouncement, setAssertiveAnnouncement] = useState<string>('');
  
  // Interactive Keypress Tester State
  const [isTesterActive, setIsTesterActive] = useState<boolean>(false);
  const [lastPressedKeys, setLastPressedKeys] = useState<string[]>([]);
  const [matchedShortcutId, setMatchedShortcutId] = useState<string | null>(null);

  const dialogCardRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const internalPreviousFocusRef = useRef<HTMLElement | null>(null);
  const wasOpenRef = useRef<boolean>(false);

  // Toggle display mode and persist
  const handleSetDisplayMode = (mode: ShortcutDisplayMode) => {
    setDisplayMode(mode);
    try {
      localStorage.setItem('shortcut_guide_display_mode', mode);
    } catch {}
    const modeLabel =
      mode === 'side-panel'
        ? 'Side Panel Drawer'
        : mode === 'floating'
        ? 'Floating Docked Window'
        : 'Centered Modal';
    setLiveAnnouncement(`Switched keyboard shortcuts guide to ${modeLabel} mode.`);
  };

  // Categories list
  const categories: string[] = useMemo(() => {
    const defaultCategories: string[] = ['Navigation', 'AI Tools & Assistant', 'Search & Modals', 'Global Controls'];
    const presentCategories = Array.from(new Set(shortcuts.map((s) => s.category || 'Tool Specific')));
    const combined = [...defaultCategories];
    for (const cat of presentCategories) {
      if (!combined.includes(cat)) {
        combined.push(cat);
      }
    }
    return combined;
  }, [shortcuts]);

  // Filtered shortcuts based on category tab & search query
  const filteredShortcuts = useMemo(() => {
    return shortcuts.filter((s) => {
      // Category Tab filter
      if (activeTab !== 'all' && activeTab !== 'voice') {
        const normTab = activeTab.toLowerCase();
        const normCat = (s.category || 'tool specific').toLowerCase();
        if (normTab === 'navigation' && normCat !== 'navigation') return false;
        if (normTab === 'search' && !normCat.includes('search') && !normCat.includes('modal')) return false;
        if (normTab === 'global' && !normCat.includes('global') && !normCat.includes('control')) return false;
        if (normTab === 'ai' && !normCat.includes('ai') && !normCat.includes('assistant')) return false;
        if (normTab === 'tool' && !normCat.includes('tool')) return false;
      }

      // Search text filter
      if (!searchFilter.trim()) return true;
      const term = searchFilter.toLowerCase();
      return (
        s.label.toLowerCase().includes(term) ||
        s.description.toLowerCase().includes(term) ||
        s.combo.toLowerCase().includes(term) ||
        s.category.toLowerCase().includes(term)
      );
    });
  }, [shortcuts, activeTab, searchFilter]);

  // Filtered voice commands for voice tab
  const filteredVoiceCommands = useMemo(() => {
    if (!searchFilter.trim()) return voiceCommands;
    const term = searchFilter.toLowerCase();
    return voiceCommands.filter((v) =>
      v.label.toLowerCase().includes(term) ||
      v.shortcutCombo.toLowerCase().includes(term) ||
      v.phrases.some((p) => p.toLowerCase().includes(term))
    );
  }, [voiceCommands, searchFilter]);

  const activeCategoryCount = useMemo(() => {
    return categories.filter((cat) =>
      filteredShortcuts.some((s) => s.category === cat)
    ).length;
  }, [categories, filteredShortcuts]);

  // Helper to get focusable elements strictly inside the card
  const getFocusableElements = useCallback((): HTMLElement[] => {
    if (!dialogCardRef.current) return [];
    return Array.from(
      dialogCardRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
    ).filter(isElementVisibleAndFocusable);
  }, []);

  const focusFirstElement = useCallback(() => {
    if (searchInputRef.current && isElementVisibleAndFocusable(searchInputRef.current)) {
      searchInputRef.current.focus();
      return;
    }
    const focusable = getFocusableElements();
    if (focusable.length > 0) {
      focusable[0].focus();
    } else if (closeButtonRef.current) {
      closeButtonRef.current.focus();
    } else {
      dialogCardRef.current?.focus();
    }
  }, [getFocusableElements]);

  const focusLastElement = useCallback(() => {
    const focusable = getFocusableElements();
    if (focusable.length > 0) {
      focusable[focusable.length - 1].focus();
    } else {
      closeButtonRef.current?.focus();
    }
  }, [getFocusableElements]);

  // Capture focus on open & restore on close
  useEffect(() => {
    if (!isOpen) {
      if (wasOpenRef.current) {
        wasOpenRef.current = false;
        setLiveAnnouncement('Keyboard Shortcuts guide closed. Focus restored.');
        setAssertiveAnnouncement('');
      }
      return;
    }

    wasOpenRef.current = true;

    const activeEl = document.activeElement as HTMLElement | null;
    if (
      activeEl &&
      activeEl !== document.body &&
      activeEl !== document.documentElement &&
      !dialogCardRef.current?.contains(activeEl)
    ) {
      internalPreviousFocusRef.current = activeEl;
    }

    // Only lock body scroll in centered modal mode
    const originalOverflow = document.body.style.overflow;
    if (displayMode === 'modal') {
      document.body.style.overflow = 'hidden';
    }

    focusFirstElement();
    const rafId = window.requestAnimationFrame(() => {
      if (
        dialogCardRef.current &&
        !dialogCardRef.current.contains(document.activeElement)
      ) {
        focusFirstElement();
      }
    });

    setLiveAnnouncement(
      `Keyboard Shortcuts guide opened in ${displayMode === 'side-panel' ? 'Side Panel Drawer' : 'Centered Modal'} mode. ${shortcuts.length} shortcuts available across ${categories.length} categories. Press Tab to navigate or Escape to close.`
    );

    const handleFocusIn = (e: FocusEvent) => {
      // In side panel mode, allow focusing outside panel so user can use app side-by-side!
      if (displayMode === 'side-panel') return;

      const card = dialogCardRef.current;
      if (!card) return;
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (target.dataset?.focusGuard === 'start') {
        focusLastElement();
        return;
      }
      if (target.dataset?.focusGuard === 'end') {
        focusFirstElement();
        return;
      }
      if (!card.contains(target)) {
        focusFirstElement();
      }
    };

    document.addEventListener('focusin', handleFocusIn, true);

    return () => {
      window.cancelAnimationFrame(rafId);
      document.removeEventListener('focusin', handleFocusIn, true);
      document.body.style.overflow = originalOverflow;
      setSearchFilter('');

      const targetToRestore =
        triggerElementRef?.current || internalPreviousFocusRef.current;
      const restore = () => {
        if (targetToRestore && typeof targetToRestore.focus === 'function' && document.body.contains(targetToRestore)) {
          targetToRestore.focus();
        }
      };
      restore();
      window.requestAnimationFrame(restore);
    };
  }, [
    isOpen,
    displayMode,
    triggerElementRef,
    shortcuts.length,
    categories.length,
    focusFirstElement,
    focusLastElement,
  ]);

  // Live Keypress Tester Event Listener
  useEffect(() => {
    if (!isOpen || !isTesterActive) return;

    const handleTesterKeyDown = (e: KeyboardEvent) => {
      // Don't capture when user is typing in search input
      if (document.activeElement === searchInputRef.current) return;

      const keys: string[] = [];
      if (e.ctrlKey) keys.push('Ctrl');
      if (e.metaKey) keys.push('Cmd');
      if (e.altKey) keys.push('Alt');
      if (e.shiftKey && e.key !== 'Shift') keys.push('Shift');

      let keyName = e.key;
      if (keyName === ' ') keyName = 'Space';
      if (keyName === 'Control' || keyName === 'Alt' || keyName === 'Shift' || keyName === 'Meta') {
        // Just modifier key pressed
      } else {
        keys.push(keyName.toUpperCase());
      }

      setLastPressedKeys(keys);

      // Attempt to match against known shortcuts
      const lowerKey = e.key.toLowerCase();
      let matched: ShortcutItem | undefined;

      if (e.shiftKey && (e.key === '?' || e.key === '/')) {
        matched = shortcuts.find((s) => s.id === 'shortcuts-help' || s.combo === 'shift+?');
      } else if ((e.metaKey || e.ctrlKey) && lowerKey === 'k') {
        matched = shortcuts.find((s) => s.id === 'search-modal' || s.combo === 'mod+k');
      } else if (e.altKey && lowerKey === 's') {
        matched = shortcuts.find((s) => s.combo === 'alt+s');
      } else if (e.altKey && lowerKey === 'c') {
        matched = shortcuts.find((s) => s.combo === 'alt+c');
      } else if (e.altKey && lowerKey === 'a') {
        matched = shortcuts.find((s) => s.combo === 'alt+a');
      } else if (!e.ctrlKey && !e.metaKey && !e.altKey && lowerKey === 't') {
        matched = shortcuts.find((s) => s.combo === 't');
      }

      if (matched) {
        setMatchedShortcutId(matched.id);
        setAssertiveAnnouncement(`Live Key Tester Matched: ${matched.label} (${matched.combo})`);
      } else {
        setMatchedShortcutId(null);
      }
    };

    window.addEventListener('keydown', handleTesterKeyDown, true);
    return () => window.removeEventListener('keydown', handleTesterKeyDown, true);
  }, [isOpen, isTesterActive, shortcuts]);

  // Trap Tab & Handle Escape
  const handleDialogKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
        return;
      }

      if (e.key === 'Tab' && dialogCardRef.current && displayMode === 'modal') {
        const focusableNodes = getFocusableElements();

        if (focusableNodes.length === 0) {
          e.preventDefault();
          dialogCardRef.current.focus();
          return;
        }

        const firstElement = focusableNodes[0];
        const lastElement = focusableNodes[focusableNodes.length - 1];
        const currentActive = document.activeElement as HTMLElement | null;

        if (e.shiftKey) {
          if (
            currentActive === firstElement ||
            !dialogCardRef.current.contains(currentActive)
          ) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (
            currentActive === lastElement ||
            !dialogCardRef.current.contains(currentActive)
          ) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    },
    [onClose, getFocusableElements, displayMode]
  );

  return (
    <>
      {/* ARIA Polite Announcement Region */}
      <div
        id="keyboard-shortcuts-live-region"
        role="status"
        aria-live="polite"
        aria-atomic="true"
        style={SR_ONLY_STYLE}
      >
        {liveAnnouncement}
      </div>

      {/* ARIA Assertive Announcement Region */}
      <div
        id="keyboard-shortcuts-alert-region"
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        style={SR_ONLY_STYLE}
      >
        {assertiveAnnouncement}
      </div>

      {isOpen && (
        <div
          className={`shortcut-guide-overlay mode-${displayMode}`}
          data-testid="keyboard-shortcuts-floating-modal"
          data-display-mode={displayMode}
          role="dialog"
          aria-modal={displayMode === 'modal'}
          aria-labelledby="keyboard-shortcuts-modal-title"
          aria-describedby="keyboard-shortcuts-modal-desc keyboard-shortcuts-live-summary"
          onClick={displayMode === 'modal' ? onClose : undefined}
          onKeyDown={handleDialogKeyDown}
          style={
            displayMode === 'modal'
              ? {
                  position: 'fixed',
                  inset: 0,
                  backgroundColor: 'rgba(2, 6, 23, 0.78)',
                  backdropFilter: 'blur(6px)',
                  zIndex: 9999,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '16px',
                  animation: 'fadeIn 0.2s ease-out',
                }
              : displayMode === 'side-panel'
              ? {
                  position: 'fixed',
                  top: 0,
                  right: 0,
                  bottom: 0,
                  width: 'min(100vw, 480px)',
                  zIndex: 9999,
                  display: 'flex',
                  boxShadow: '-10px 0 30px rgba(0,0,0,0.5)',
                  animation: 'slideLeft 0.25s ease-out',
                  pointerEvents: 'none', // backdrop click-through in side-panel
                }
              : {
                  position: 'fixed',
                  bottom: '74px',
                  left: '24px',
                  width: 'min(92vw, 560px)',
                  maxHeight: 'min(80vh, 650px)',
                  zIndex: 9999,
                  display: 'flex',
                  boxShadow: '0 20px 48px rgba(0,0,0,0.55)',
                  animation: 'slideUpFade 0.22s ease-out',
                  pointerEvents: 'none', // non-blocking backdrop in floating mode
                }
          }
        >
          {/* Start focus guard */}
          {displayMode === 'modal' && (
            <div
              tabIndex={0}
              data-focus-guard="start"
              aria-hidden="true"
              onFocus={focusLastElement}
              style={SR_ONLY_STYLE}
            />
          )}

          <div
            ref={dialogCardRef}
            tabIndex={-1}
            className={`shortcut-modal-card mode-${displayMode}`}
            data-testid="keyboard-shortcuts-modal"
            onClick={(e) => e.stopPropagation()}
            style={{
              pointerEvents: 'auto',
              background: 'var(--card)',
              border: displayMode === 'side-panel' ? 'none' : '1px solid var(--accent, #38bdf8)',
              borderLeft: displayMode === 'side-panel' ? '2px solid var(--accent)' : '1px solid var(--accent, #38bdf8)',
              borderRadius: displayMode === 'side-panel' ? '16px 0 0 16px' : '16px',
              width: '100%',
              maxWidth: displayMode === 'side-panel' ? '100%' : displayMode === 'floating' ? '560px' : '720px',
              height: displayMode === 'side-panel' ? '100vh' : 'auto',
              maxHeight: displayMode === 'side-panel' ? '100vh' : displayMode === 'floating' ? 'min(80vh, 650px)' : '88vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 40px -10px rgba(0,0,0,0.5)',
              overflow: 'hidden',
              outline: 'none',
            }}
          >
            {/* Header with Mode Toggles */}
            <div
              style={{
                padding: '18px 20px 14px',
                borderBottom: '1px solid var(--line)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                background: 'var(--surface-header, var(--card))',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span
                    aria-hidden="true"
                    style={{
                      fontSize: '1.25rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      background: 'rgba(56, 189, 248, 0.15)',
                      color: 'var(--accent)',
                    }}
                  >
                    ⌨️
                  </span>
                  <h3
                    id="keyboard-shortcuts-modal-title"
                    style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-heading)' }}
                  >
                    Interactive Shortcuts Guide
                  </h3>
                </div>
                <p
                  id="keyboard-shortcuts-modal-desc"
                  style={{ margin: '3px 0 0 40px', fontSize: '0.78rem', color: 'var(--muted)' }}
                >
                  {displayMode === 'side-panel'
                    ? 'Side Panel Mode • Keep open while navigating or testing tools.'
                    : displayMode === 'floating'
                    ? 'Floating Docked Mode • Persistent view while working with tools.'
                    : 'Centered Modal Mode • Quick reference cheatsheet and live tester.'}
                </p>
              </div>

              {/* View Mode Switcher & Close */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div
                  role="group"
                  aria-label="Display View Mode Switcher"
                  style={{
                    display: 'inline-flex',
                    background: 'var(--bg)',
                    padding: '2px',
                    borderRadius: '8px',
                    border: '1px solid var(--line)',
                  }}
                >
                  <button
                    type="button"
                    data-testid="shortcuts-display-mode-modal"
                    onClick={() => handleSetDisplayMode('modal')}
                    title="Switch to Centered Modal Dialog View"
                    style={{
                      padding: '4px 8px',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      borderRadius: '6px',
                      border: 'none',
                      cursor: 'pointer',
                      background: displayMode === 'modal' ? 'var(--accent)' : 'transparent',
                      color: displayMode === 'modal' ? '#ffffff' : 'var(--text-muted)',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    🗂️ Modal
                  </button>
                  <button
                    type="button"
                    data-testid="shortcuts-display-mode-side-panel"
                    onClick={() => handleSetDisplayMode('side-panel')}
                    title="Switch to Right Side Panel Drawer View"
                    style={{
                      padding: '4px 8px',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      borderRadius: '6px',
                      border: 'none',
                      cursor: 'pointer',
                      background: displayMode === 'side-panel' ? 'var(--accent)' : 'transparent',
                      color: displayMode === 'side-panel' ? '#ffffff' : 'var(--text-muted)',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    📑 Side Panel
                  </button>
                  <button
                    type="button"
                    data-testid="shortcuts-display-mode-floating"
                    onClick={() => handleSetDisplayMode('floating')}
                    title="Switch to Persistent Floating Docked View"
                    style={{
                      padding: '4px 8px',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      borderRadius: '6px',
                      border: 'none',
                      cursor: 'pointer',
                      background: displayMode === 'floating' ? 'var(--accent)' : 'transparent',
                      color: displayMode === 'floating' ? '#ffffff' : 'var(--text-muted)',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    🪟 Floating
                  </button>
                </div>

                <button
                  ref={closeButtonRef}
                  type="button"
                  data-testid="shortcuts-close-btn"
                  onClick={onClose}
                  aria-label="Close keyboard shortcuts guide (Escape)"
                  aria-keyshortcuts="Escape"
                  style={{
                    background: 'var(--bg)',
                    border: '1px solid var(--line)',
                    borderRadius: '8px',
                    padding: '5px 10px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    color: 'var(--muted)',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <kbd style={{ fontFamily: 'monospace', fontSize: '0.72rem', fontWeight: 700 }}>ESC</kbd> ✕
                </button>
              </div>
            </div>

            {/* Interactive Live Keypress Tester Bar */}
            <div
              style={{
                padding: '10px 20px',
                background: isTesterActive ? 'rgba(56, 189, 248, 0.12)' : 'var(--bg)',
                borderBottom: '1px solid var(--line)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '8px',
                transition: 'background 0.2s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-heading)' }}>
                  🎯 Live Key Tester
                </span>
                {isTesterActive ? (
                  <span
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      color: 'var(--emerald)',
                      background: 'rgba(16, 185, 129, 0.15)',
                      padding: '2px 8px',
                      borderRadius: '99px',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                    }}
                  >
                    Listening to keys...
                  </span>
                ) : (
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Press keys on physical keyboard to test hotkeys live
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {isTesterActive && lastPressedKeys.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>Pressed:</span>
                    {lastPressedKeys.map((k, idx) => (
                      <kbd
                        key={idx}
                        style={{
                          background: 'var(--card)',
                          border: '1px solid var(--accent)',
                          color: 'var(--accent)',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontSize: '0.72rem',
                          fontFamily: 'monospace',
                          fontWeight: 700,
                        }}
                      >
                        {k}
                      </kbd>
                    ))}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setIsTesterActive((prev) => !prev);
                    setLastPressedKeys([]);
                    setMatchedShortcutId(null);
                  }}
                  style={{
                    background: isTesterActive ? 'var(--accent)' : 'var(--card)',
                    color: isTesterActive ? '#ffffff' : 'var(--text)',
                    border: '1px solid var(--line)',
                    borderRadius: '6px',
                    padding: '4px 10px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {isTesterActive ? 'Stop Key Tester' : 'Start Key Tester'}
                </button>
              </div>
            </div>

            {/* Category Filter Tabs Bar */}
            <div
              style={{
                padding: '10px 20px 0',
                borderBottom: '1px solid var(--line)',
                background: 'var(--surface-hover, var(--card))',
                display: 'flex',
                gap: '6px',
                overflowX: 'auto',
                scrollbarWidth: 'none',
              }}
            >
              {[
                { id: 'all', label: `All (${shortcuts.length})`, testId: 'shortcuts-tab-all' },
                { id: 'navigation', label: 'Navigation', testId: 'shortcuts-tab-navigation' },
                { id: 'ai', label: 'AI Tools & Assistant', testId: 'shortcuts-tab-ai' },
                { id: 'search', label: 'Search & Modals', testId: 'shortcuts-tab-search' },
                { id: 'global', label: 'Global Controls', testId: 'shortcuts-tab-global' },
                { id: 'tool', label: 'Tool Specific', testId: 'shortcuts-tab-tool' },
                { id: 'voice', label: `🎙️ Voice (${voiceCommands.length})`, testId: 'shortcuts-tab-voice' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  data-testid={tab.testId}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    padding: '6px 12px',
                    fontSize: '0.78rem',
                    fontWeight: activeTab === tab.id ? 700 : 500,
                    borderRadius: '6px 6px 0 0',
                    border: '1px solid transparent',
                    borderBottom: activeTab === tab.id ? '2px solid var(--accent)' : '2px solid transparent',
                    background: activeTab === tab.id ? 'var(--card)' : 'transparent',
                    color: activeTab === tab.id ? 'var(--accent)' : 'var(--text-muted)',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Search Input Bar */}
            <div
              style={{
                padding: '10px 20px',
                borderBottom: '1px solid var(--line)',
                background: 'var(--bg)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <input
                ref={searchInputRef}
                id="keyboard-shortcuts-filter-input"
                data-testid="shortcuts-search-input"
                type="search"
                aria-label="Filter keyboard shortcuts or voice commands"
                placeholder={
                  activeTab === 'voice'
                    ? 'Search spoken voice phrases (e.g. "go home", "dark mode")...'
                    : 'Filter shortcuts (e.g. G + H, Tools, Search, Theme)...'
                }
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                style={{
                  flex: 1,
                  background: 'var(--card)',
                  border: '1px solid var(--line)',
                  borderRadius: '8px',
                  padding: '7px 12px',
                  fontSize: '0.84rem',
                  color: 'var(--text)',
                  outline: 'none',
                }}
              />
              {searchFilter.trim() && (
                <button
                  type="button"
                  onClick={() => setSearchFilter('')}
                  style={{
                    background: 'var(--card)',
                    border: '1px solid var(--line)',
                    borderRadius: '8px',
                    padding: '6px 10px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: 'var(--muted)',
                    cursor: 'pointer',
                  }}
                >
                  Clear
                </button>
              )}
            </div>

            {/* Main Interactive Guide Content Body */}
            <div
              id="keyboard-shortcuts-results-region"
              role="region"
              aria-label="Available keyboard shortcuts and voice commands"
              style={{
                padding: '16px 20px',
                overflowY: 'auto',
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                gap: '20px',
              }}
            >
              {activeTab === 'voice' ? (
                /* Voice Commands Guide Tab */
                <section>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '14px',
                      flexWrap: 'wrap',
                      gap: '8px',
                    }}
                  >
                    <div>
                      <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-heading)' }}>
                        🎙️ Hands-Free Voice Commands
                      </h4>
                      <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: 'var(--muted)' }}>
                        Speak natural language phrases to navigate pages and run shortcuts without typing.
                      </p>
                    </div>

                    {isVoiceSupported && onToggleVoice && (
                      <button
                        type="button"
                        onClick={onToggleVoice}
                        style={{
                          background: isVoiceListening ? 'rgba(239, 68, 68, 0.15)' : 'rgba(56, 189, 248, 0.15)',
                          border: `1px solid ${isVoiceListening ? 'rgba(239, 68, 68, 0.35)' : 'rgba(56, 189, 248, 0.35)'}`,
                          color: isVoiceListening ? '#f87171' : 'var(--accent)',
                          padding: '6px 12px',
                          borderRadius: '8px',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <span>{isVoiceListening ? '🔴 Stop Voice Input' : '🎙️ Test Voice Input'}</span>
                      </button>
                    )}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '10px' }}>
                    {filteredVoiceCommands.map((vRule) => (
                      <div
                        key={vRule.id}
                        style={{
                          background: 'var(--bg)',
                          border: '1px solid var(--line)',
                          borderRadius: '10px',
                          padding: '12px 14px',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <span style={{ fontWeight: 800, fontSize: '0.88rem', color: 'var(--text-heading)' }}>
                            {vRule.label}
                          </span>
                          <kbd
                            style={{
                              background: 'var(--card)',
                              border: '1px solid var(--line)',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontSize: '0.7rem',
                              fontFamily: 'monospace',
                              fontWeight: 700,
                              color: 'var(--accent)',
                            }}
                          >
                            {vRule.shortcutCombo.toUpperCase()}
                          </kbd>
                        </div>

                        <div style={{ fontSize: '0.76rem', color: 'var(--muted)', marginBottom: '8px' }}>
                          Target: {vRule.route || 'Action Trigger'}
                        </div>

                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                          {vRule.phrases.map((phrase, pIdx) => (
                            <span
                              key={pIdx}
                              style={{
                                fontSize: '0.72rem',
                                background: 'var(--card)',
                                border: '1px solid var(--line)',
                                padding: '2px 7px',
                                borderRadius: '99px',
                                color: 'var(--text)',
                              }}
                            >
                              &ldquo;{phrase}&rdquo;
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              ) : (
                /* Keyboard Shortcuts Categories */
                categories.map((cat) => {
                  const catShortcuts = filteredShortcuts.filter((s) => s.category === cat);
                  if (catShortcuts.length === 0) return null;

                  const categoryHeadingId = `shortcut-cat-${cat.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

                  return (
                    <section key={cat} aria-labelledby={categoryHeadingId}>
                      <h4
                        id={categoryHeadingId}
                        style={{
                          margin: '0 0 10px',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.06em',
                          color: 'var(--accent)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <span
                          aria-hidden="true"
                          style={{
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            background: 'var(--accent)',
                            display: 'inline-block',
                          }}
                        />
                        {cat}
                      </h4>

                      <div
                        role="list"
                        style={{
                          display: 'grid',
                          gridTemplateColumns: displayMode === 'side-panel' ? '1fr' : 'repeat(auto-fill, minmax(280px, 1fr))',
                          gap: '10px',
                        }}
                      >
                        {catShortcuts.map((s) => {
                          const { keys } = formatComboForDisplay(s.combo);
                          const isMatchedByTester = matchedShortcutId === s.id;

                          return (
                            <div
                              key={s.id}
                              role="listitem"
                              style={{
                                background: isMatchedByTester ? 'rgba(56, 189, 248, 0.18)' : 'var(--bg)',
                                border: isMatchedByTester
                                  ? '2px solid var(--accent)'
                                  : '1px solid var(--line)',
                                borderRadius: '10px',
                                padding: '10px 14px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '12px',
                                transition: 'all 0.15s ease',
                                boxShadow: isMatchedByTester ? '0 0 14px rgba(56, 189, 248, 0.3)' : 'none',
                              }}
                            >
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div
                                  style={{
                                    fontWeight: 700,
                                    fontSize: '0.88rem',
                                    color: 'var(--text-heading)',
                                    marginBottom: '2px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                  }}
                                >
                                  <span>{s.label}</span>
                                  {isMatchedByTester && (
                                    <span
                                      style={{
                                        fontSize: '0.68rem',
                                        fontWeight: 800,
                                        background: 'var(--accent)',
                                        color: '#ffffff',
                                        padding: '1px 6px',
                                        borderRadius: '99px',
                                      }}
                                    >
                                      MATCHED!
                                    </span>
                                  )}
                                </div>
                                <div style={{ fontSize: '0.76rem', color: 'var(--muted)', lineHeight: 1.3 }}>
                                  {s.description}
                                </div>
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                                <span
                                  role="group"
                                  aria-label={`Shortcut keys: ${keys.join(' plus ')}`}
                                  style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                                >
                                  {keys.map((k, kIdx) => (
                                    <React.Fragment key={kIdx}>
                                      {kIdx > 0 && (
                                        <span aria-hidden="true" style={{ fontSize: '0.7rem', color: 'var(--muted)', fontWeight: 700 }}>
                                          +
                                        </span>
                                      )}
                                      <kbd
                                        style={{
                                          background: 'var(--card)',
                                          border: '1px solid var(--line)',
                                          borderBottom: '2px solid var(--line)',
                                          borderRadius: '5px',
                                          padding: '2px 6px',
                                          fontSize: '0.74rem',
                                          fontWeight: 800,
                                          fontFamily: 'monospace',
                                          color: 'var(--text)',
                                        }}
                                      >
                                        {k}
                                      </kbd>
                                    </React.Fragment>
                                  ))}
                                </span>

                                <button
                                  type="button"
                                  aria-label={`Run ${s.label}`}
                                  onClick={() => {
                                    setAssertiveAnnouncement(`Executed shortcut: ${s.label}`);
                                    onTriggerShortcut(s.id);
                                    if (displayMode === 'modal') {
                                      onClose();
                                    }
                                  }}
                                  title={`Run ${s.label}`}
                                  style={{
                                    background: 'rgba(56, 189, 248, 0.12)',
                                    border: '1px solid rgba(56, 189, 248, 0.3)',
                                    borderRadius: '6px',
                                    padding: '3px 8px',
                                    fontSize: '0.72rem',
                                    fontWeight: 700,
                                    color: 'var(--accent)',
                                    cursor: 'pointer',
                                  }}
                                >
                                  Run
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </section>
                  );
                })
              )}

              {filteredShortcuts.length === 0 && activeTab !== 'voice' && (
                <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--muted)' }}>
                  <p style={{ margin: 0, fontWeight: 600 }}>No keyboard shortcuts match &ldquo;{searchFilter}&rdquo;.</p>
                  <button
                    type="button"
                    onClick={() => setSearchFilter('')}
                    style={{
                      marginTop: '10px',
                      background: 'var(--bg)',
                      border: '1px solid var(--line)',
                      borderRadius: '6px',
                      padding: '4px 10px',
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      color: 'var(--text)',
                    }}
                  >
                    Clear Search Filter
                  </button>
                </div>
              )}
            </div>

            {/* Footer */}
            <div
              style={{
                padding: '10px 20px',
                borderTop: '1px solid var(--line)',
                background: 'var(--bg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '0.76rem',
                color: 'var(--muted)',
                flexWrap: 'wrap',
                gap: '8px',
              }}
            >
              <div>
                Press <kbd style={{ padding: '2px 5px', borderRadius: '4px', background: 'var(--card)', border: '1px solid var(--line)', fontFamily: 'monospace' }}>Shift + ?</kbd> or <kbd style={{ padding: '2px 5px', borderRadius: '4px', background: 'var(--card)', border: '1px solid var(--line)', fontFamily: 'monospace' }}>Ctrl + /</kbd> anytime.
              </div>
              <div style={{ fontWeight: 600, color: 'var(--emerald)' }}>
                ✓ Interactive Guide &amp; Voice Controls Active
              </div>
            </div>
          </div>

          {/* End focus guard */}
          {displayMode === 'modal' && (
            <div
              tabIndex={0}
              data-focus-guard="end"
              aria-hidden="true"
              onFocus={focusFirstElement}
              style={SR_ONLY_STYLE}
            />
          )}
        </div>
      )}
    </>
  );
};

export default KeyboardShortcutModal;
