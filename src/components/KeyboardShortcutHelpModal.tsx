import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { ShortcutItem, formatComboForDisplay } from '../hooks/useKeyboardShortcuts';

export interface KeyboardShortcutHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  shortcuts: ShortcutItem[];
  onTriggerShortcut: (id: string) => void;
  triggerElementRef?: React.MutableRefObject<HTMLElement | null>;
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

export const KeyboardShortcutHelpModal: React.FC<KeyboardShortcutHelpModalProps> = ({
  isOpen,
  onClose,
  shortcuts,
  onTriggerShortcut,
  triggerElementRef,
}) => {
  const [searchFilter, setSearchFilter] = useState('');
  const [liveAnnouncement, setLiveAnnouncement] = useState('');
  const [assertiveAnnouncement, setAssertiveAnnouncement] = useState('');
  const dialogCardRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const internalPreviousFocusRef = useRef<HTMLElement | null>(null);

  const categories: ShortcutItem['category'][] = useMemo(
    () => ['Navigation', 'Search & Modals', 'Global Controls', 'AI Assistant'],
    []
  );

  const filteredShortcuts = useMemo(() => {
    return shortcuts.filter((s) => {
      if (!searchFilter.trim()) return true;
      const term = searchFilter.toLowerCase();
      return (
        s.label.toLowerCase().includes(term) ||
        s.description.toLowerCase().includes(term) ||
        s.combo.toLowerCase().includes(term) ||
        s.category.toLowerCase().includes(term)
      );
    });
  }, [shortcuts, searchFilter]);

  const activeCategoryCount = useMemo(() => {
    return categories.filter((cat) =>
      filteredShortcuts.some((s) => s.category === cat)
    ).length;
  }, [categories, filteredShortcuts]);

  // Helper to get ordered focusable elements strictly inside the dialog card
  const getFocusableElements = useCallback((): HTMLElement[] => {
    if (!dialogCardRef.current) return [];
    return Array.from(
      dialogCardRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
    ).filter(
      (el) =>
        !el.hasAttribute('disabled') &&
        el.getAttribute('aria-hidden') !== 'true' &&
        (el.offsetParent !== null || el === document.activeElement)
    );
  }, []);

  // Focus first interactive element inside the modal
  const focusFirstElement = useCallback(() => {
    if (searchInputRef.current) {
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

  // Focus last interactive element inside the modal
  const focusLastElement = useCallback(() => {
    const focusable = getFocusableElements();
    if (focusable.length > 0) {
      focusable[focusable.length - 1].focus();
    } else {
      closeButtonRef.current?.focus();
    }
  }, [getFocusableElements]);

  // Capture focus on open, move focus into modal, lock body scroll, announce via ARIA live region, and restore focus on close
  useEffect(() => {
    if (!isOpen) {
      setLiveAnnouncement('');
      setAssertiveAnnouncement('');
      return;
    }

    const activeEl = document.activeElement as HTMLElement | null;
    if (
      activeEl &&
      activeEl !== document.body &&
      activeEl !== document.documentElement &&
      !dialogCardRef.current?.contains(activeEl)
    ) {
      internalPreviousFocusRef.current = activeEl;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Immediate + fallback focus transfer into the modal for WCAG 2.4.3 compliance
    const rafId = window.requestAnimationFrame(() => {
      focusFirstElement();
    });
    const focusTimer = window.setTimeout(() => {
      if (
        dialogCardRef.current &&
        !dialogCardRef.current.contains(document.activeElement)
      ) {
        focusFirstElement();
      }
    }, 25);

    // Announce dialog open state and navigation instructions to screen readers
    const announceTimer = window.setTimeout(() => {
      setLiveAnnouncement(
        `Keyboard Shortcuts dialog opened. ${shortcuts.length} shortcuts available across ${categories.length} categories. Type in the filter input to search, press Tab to navigate shortcuts, or press Escape to close.`
      );
    }, 40);

    // Keep focus strictly inside the modal if focusin occurs outside
    const handleFocusIn = (e: FocusEvent) => {
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
      window.clearTimeout(focusTimer);
      window.clearTimeout(announceTimer);
      document.removeEventListener('focusin', handleFocusIn, true);
      document.body.style.overflow = originalOverflow;
      setSearchFilter('');

      // Restore focus to the element that triggered the modal (WCAG 2.4.3 Focus Order)
      const targetToRestore =
        triggerElementRef?.current || internalPreviousFocusRef.current;
      if (targetToRestore && typeof targetToRestore.focus === 'function') {
        window.requestAnimationFrame(() => {
          if (document.body.contains(targetToRestore)) {
            targetToRestore.focus();
          } else {
            const fallbackTrigger = document.querySelector<HTMLElement>(
              '[data-shortcuts-trigger="true"]'
            );
            fallbackTrigger?.focus();
          }
        });
      }
    };
  }, [
    isOpen,
    triggerElementRef,
    shortcuts.length,
    categories.length,
    focusFirstElement,
    focusLastElement,
  ]);

  // Update ARIA live region announcement when user filters shortcuts
  useEffect(() => {
    if (!isOpen) return;
    const trimmed = searchFilter.trim();
    if (!trimmed) {
      setAssertiveAnnouncement('');
      setLiveAnnouncement(
        `Showing all ${shortcuts.length} keyboard shortcuts across ${activeCategoryCount} categories.`
      );
      return;
    }

    if (filteredShortcuts.length === 0) {
      const emptyMsg = `No keyboard shortcuts match "${trimmed}". Press Escape or activate Clear Search Filter to reset.`;
      setLiveAnnouncement(emptyMsg);
      setAssertiveAnnouncement(emptyMsg);
    } else {
      setAssertiveAnnouncement('');
      setLiveAnnouncement(
        `Showing ${filteredShortcuts.length} of ${shortcuts.length} keyboard ${
          filteredShortcuts.length === 1 ? 'shortcut' : 'shortcuts'
        } matching "${trimmed}" across ${activeCategoryCount} ${
          activeCategoryCount === 1 ? 'category' : 'categories'
        }.`
      );
    }
  }, [
    isOpen,
    searchFilter,
    filteredShortcuts.length,
    shortcuts.length,
    activeCategoryCount,
  ]);

  // Trap Tab / Shift+Tab focus cycle and handle Escape inside the modal
  const handleDialogKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
        return;
      }

      if (e.key === 'Tab' && dialogCardRef.current) {
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
    [onClose, getFocusableElements]
  );

  if (!isOpen) return null;

  return (
    <div
      className="shortcut-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="keyboard-shortcuts-modal-title"
      aria-describedby="keyboard-shortcuts-modal-desc keyboard-shortcuts-live-summary"
      onClick={onClose}
      onKeyDown={handleDialogKeyDown}
      style={{
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
      }}
    >
      {/* Screen-reader polite ARIA live region for modal status and filter updates */}
      <div
        id="keyboard-shortcuts-live-region"
        role="status"
        aria-live="polite"
        aria-atomic="true"
        style={SR_ONLY_STYLE}
      >
        {liveAnnouncement}
      </div>

      {/* Screen-reader assertive ARIA live region for empty filter states and executed shortcuts */}
      <div
        id="keyboard-shortcuts-alert-region"
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        style={SR_ONLY_STYLE}
      >
        {assertiveAnnouncement}
      </div>

      {/* Start focus-trap sentinel for WCAG 2.1.2 No Keyboard Trap / Modal Focus Containment */}
      <div
        tabIndex={0}
        data-focus-guard="start"
        aria-hidden="true"
        onFocus={focusLastElement}
        style={SR_ONLY_STYLE}
      />

      <div
        ref={dialogCardRef}
        tabIndex={-1}
        className="shortcut-modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--card)',
          border: '1px solid var(--line)',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '680px',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 40px -10px rgba(0,0,0,0.5)',
          overflow: 'hidden',
          outline: 'none',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px 16px',
            borderBottom: '1px solid var(--line)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
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
                style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-heading)' }}
              >
                Keyboard Shortcuts
              </h3>
            </div>
            <p
              id="keyboard-shortcuts-modal-desc"
              style={{ margin: '4px 0 0 40px', fontSize: '0.82rem', color: 'var(--muted)' }}
            >
              Navigate across Guides, Tools, Search, and Theme controls using quick keyboard shortcuts.
            </p>
          </div>

          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close keyboard shortcuts dialog (Escape)"
            aria-keyshortcuts="Escape"
            style={{
              background: 'var(--bg)',
              border: '1px solid var(--line)',
              borderRadius: '8px',
              padding: '6px 10px',
              fontSize: '0.8rem',
              fontWeight: 700,
              color: 'var(--muted)',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <kbd
              style={{
                fontFamily: 'monospace',
                fontSize: '0.75rem',
                fontWeight: 700,
              }}
            >
              ESC
            </kbd>{' '}
            <span aria-hidden="true">✕</span>
          </button>
        </div>

        {/* Search Bar + Live Result Count */}
        <div
          style={{
            padding: '12px 24px',
            borderBottom: '1px solid var(--line)',
            background: 'var(--bg)',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <input
              ref={searchInputRef}
              id="keyboard-shortcuts-filter-input"
              type="search"
              aria-label="Filter keyboard shortcuts"
              aria-controls="keyboard-shortcuts-results-region"
              aria-describedby="keyboard-shortcuts-live-summary"
              placeholder="Filter shortcuts (e.g. G + H, Tools, Search, Theme)..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              style={{
                flex: 1,
                width: '100%',
                background: 'var(--card)',
                border: '1px solid var(--line)',
                borderRadius: '8px',
                padding: '8px 12px',
                fontSize: '0.88rem',
                color: 'var(--text)',
                outline: 'none',
              }}
            />
            {searchFilter.trim().length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setSearchFilter('');
                  searchInputRef.current?.focus();
                }}
                aria-label="Clear shortcut filter"
                style={{
                  background: 'var(--card)',
                  border: '1px solid var(--line)',
                  borderRadius: '8px',
                  padding: '7px 10px',
                  fontSize: '0.76rem',
                  fontWeight: 700,
                  color: 'var(--muted)',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                Clear
              </button>
            )}
          </div>

          <div
            id="keyboard-shortcuts-live-summary"
            role="status"
            aria-live="polite"
            aria-atomic="true"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.74rem',
              color: 'var(--muted)',
            }}
          >
            <span>
              Showing <strong style={{ color: 'var(--text)' }}>{filteredShortcuts.length}</strong> of{' '}
              <strong style={{ color: 'var(--text)' }}>{shortcuts.length}</strong> shortcuts
              {searchFilter.trim() ? ` for "${searchFilter.trim()}"` : ''}
            </span>
            <span>
              {activeCategoryCount} {activeCategoryCount === 1 ? 'category' : 'categories'}
            </span>
          </div>
        </div>

        {/* Content Body */}
        <div
          id="keyboard-shortcuts-results-region"
          role="region"
          aria-label="Available keyboard shortcuts"
          aria-live="polite"
          aria-relevant="additions removals"
          style={{
            padding: '20px 24px',
            overflowY: 'auto',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: '24px',
          }}
        >
          {categories.map((cat) => {
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
                  aria-labelledby={categoryHeadingId}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                    gap: '10px',
                  }}
                >
                  {catShortcuts.map((s) => {
                    const { keys } = formatComboForDisplay(s.combo);

                    return (
                      <div
                        key={s.id}
                        role="listitem"
                        style={{
                          background: 'var(--bg)',
                          border: '1px solid var(--line)',
                          borderRadius: '10px',
                          padding: '10px 14px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '12px',
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              fontWeight: 700,
                              fontSize: '0.88rem',
                              color: 'var(--text-heading)',
                              marginBottom: '2px',
                            }}
                          >
                            {s.label}
                          </div>
                          <div style={{ fontSize: '0.76rem', color: 'var(--muted)', lineHeight: 1.3 }}>
                            {s.description}
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                          <span
                            role="group"
                            aria-label={`Shortcut keys: ${keys.join(' plus ')}`}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          >
                            {keys.map((k, kIdx) => (
                              <React.Fragment key={kIdx}>
                                {kIdx > 0 && (
                                  <span
                                    aria-hidden="true"
                                    style={{ fontSize: '0.72rem', color: 'var(--muted)', fontWeight: 700 }}
                                  >
                                    +
                                  </span>
                                )}
                                <kbd
                                  style={{
                                    background: 'var(--card)',
                                    border: '1px solid var(--line)',
                                    borderBottom: '2px solid var(--line)',
                                    borderRadius: '6px',
                                    padding: '3px 7px',
                                    fontSize: '0.76rem',
                                    fontWeight: 800,
                                    fontFamily: 'monospace',
                                    color: 'var(--text)',
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                                  }}
                                >
                                  {k}
                                </kbd>
                              </React.Fragment>
                            ))}
                          </span>

                          <button
                            type="button"
                            aria-label={`Run ${s.label} (${keys.join(' + ')})`}
                            aria-keyshortcuts={keys.join('+')}
                            onClick={() => {
                              setAssertiveAnnouncement(`Executed shortcut: ${s.label}`);
                              onTriggerShortcut(s.id);
                              onClose();
                            }}
                            title={`Run ${s.label}`}
                            style={{
                              background: 'rgba(56, 189, 248, 0.1)',
                              border: '1px solid rgba(56, 189, 248, 0.25)',
                              borderRadius: '6px',
                              padding: '3px 7px',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              color: 'var(--accent)',
                              cursor: 'pointer',
                              marginLeft: '6px',
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
          })}

          {filteredShortcuts.length === 0 && (
            <div
              role="status"
              aria-live="polite"
              style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--muted)' }}
            >
              <p style={{ margin: 0, fontWeight: 600 }}>No keyboard shortcuts match &ldquo;{searchFilter}&rdquo;.</p>
              <button
                type="button"
                onClick={() => {
                  setSearchFilter('');
                  searchInputRef.current?.focus();
                }}
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
            padding: '12px 24px',
            borderTop: '1px solid var(--line)',
            background: 'var(--bg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.78rem',
            color: 'var(--muted)',
            flexWrap: 'wrap',
            gap: '8px',
          }}
        >
          <div>
            Press <kbd style={{ padding: '2px 5px', borderRadius: '4px', background: 'var(--card)', border: '1px solid var(--line)', fontFamily: 'monospace' }}>Shift + ?</kbd> or <kbd style={{ padding: '2px 5px', borderRadius: '4px', background: 'var(--card)', border: '1px solid var(--line)', fontFamily: 'monospace' }}>Ctrl + /</kbd> anytime to open this sheet.
          </div>
          <div style={{ fontWeight: 600, color: 'var(--emerald)' }}>
            ✓ Keyboard Accessible Navigation Active
          </div>
        </div>
      </div>

      {/* End focus-trap sentinel for WCAG 2.1.2 No Keyboard Trap / Modal Focus Containment */}
      <div
        tabIndex={0}
        data-focus-guard="end"
        aria-hidden="true"
        onFocus={focusFirstElement}
        style={SR_ONLY_STYLE}
      />
    </div>
  );
};

