import React, { useState } from 'react';
import { ShortcutItem, formatComboForDisplay } from '../hooks/useKeyboardShortcuts';

interface KeyboardShortcutHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  shortcuts: ShortcutItem[];
  onTriggerShortcut: (id: string) => void;
}

export const KeyboardShortcutHelpModal: React.FC<KeyboardShortcutHelpModalProps> = ({
  isOpen,
  onClose,
  shortcuts,
  onTriggerShortcut,
}) => {
  const [searchFilter, setSearchFilter] = useState('');

  if (!isOpen) return null;

  const categories: ShortcutItem['category'][] = [
    'Search & Modals',
    'AI Assistant',
    'Global Controls',
    'Navigation',
  ];

  const filteredShortcuts = shortcuts.filter((s) => {
    if (!searchFilter.trim()) return true;
    const term = searchFilter.toLowerCase();
    return (
      s.label.toLowerCase().includes(term) ||
      s.description.toLowerCase().includes(term) ||
      s.combo.toLowerCase().includes(term) ||
      s.category.toLowerCase().includes(term)
    );
  });

  return (
    <div
      className="shortcut-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard Shortcuts Cheat Sheet"
      onClick={onClose}
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
      <div
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
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-heading)' }}>
                Keyboard Shortcuts &amp; Hotkeys
              </h3>
            </div>
            <p style={{ margin: '4px 0 0 40px', fontSize: '0.82rem', color: 'var(--muted)' }}>
              Speed up your workflow using global keyboard hotkeys from anywhere on the site.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close keyboard shortcuts dialog"
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
            <span>ESC</span> ✕
          </button>
        </div>

        {/* Search Bar */}
        <div style={{ padding: '12px 24px', borderBottom: '1px solid var(--line)', background: 'var(--bg)' }}>
          <input
            type="search"
            placeholder="Search hotkeys (e.g. Search, AI, Theme, Ctrl+K)..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            style={{
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
        </div>

        {/* Content Body */}
        <div
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

            return (
              <div key={cat}>
                <h4
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
                          {keys.map((k, kIdx) => (
                            <kbd
                              key={kIdx}
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
                          ))}

                          <button
                            type="button"
                            onClick={() => {
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
              </div>
            );
          })}

          {filteredShortcuts.length === 0 && (
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
    </div>
  );
};
