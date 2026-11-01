import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useKeyboardShortcuts, type ShortcutItem } from '../hooks/useKeyboardShortcuts';
import { KeyboardShortcutModal } from './KeyboardShortcutModal';
import { getSiteLastUpdated } from '../utils/contentFreshness';

interface FooterProps {
  onOpenCookieModal?: () => void;
  onOpenShortcutsModal?: () => void;
}

const FALLBACK_SHORTCUTS: ShortcutItem[] = [
  {
    id: 'nav-home',
    combo: 'g+h',
    label: 'Go to Home',
    description: 'G + H -> Go to Home',
    category: 'Navigation',
    action: () => {},
  },
  {
    id: 'nav-tools',
    combo: 'g+t',
    label: 'Go to Tools',
    description: 'G + T -> Go to Tools',
    category: 'Navigation',
    action: () => {},
  },
  {
    id: 'nav-guides',
    combo: 'g+g',
    label: 'Go to Guides',
    description: 'G + G -> Go to Guides',
    category: 'Navigation',
    action: () => {},
  },
  {
    id: 'search-modal',
    combo: 'mod+k',
    label: 'Open Search',
    description: '⌘ + K -> Open Search',
    category: 'Search & Modals',
    action: () => {},
  },
  {
    id: 'toggle-theme',
    combo: 't',
    label: 'Toggle Theme (Dark / Light)',
    description: 'T -> Toggle Theme (Dark / Light)',
    category: 'Global Controls',
    action: () => {},
  },
  {
    id: 'shortcuts-help',
    combo: 'shift+?',
    label: 'Keyboard Shortcuts',
    description: 'Open keyboard shortcuts cheatsheet modal (Shift + ?)',
    category: 'Search & Modals',
    action: () => {},
  },
  {
    id: 'close-modals',
    combo: 'esc',
    label: 'Close Active Modals',
    description: 'Dismiss open search modal, AI widget, or dialogs',
    category: 'Search & Modals',
    action: () => {},
  },
];

export const Footer: React.FC<FooterProps> = ({ onOpenCookieModal, onOpenShortcutsModal }) => {
  const currentYear = new Date().getFullYear();
  const location = useLocation();
  const {
    shortcuts,
    isHelpModalOpen,
    openHelpModal,
    activePrefix: contextActivePrefix,
  } = useKeyboardShortcuts();
  const [isFallbackModalOpen, setIsFallbackModalOpen] = useState(false);
  const [fallbackActivePrefix, setFallbackActivePrefix] = useState<string | null>(null);
  const fallbackPrefixRef = useRef<string | null>(null);
  const fallbackTimerRef = useRef<number | null>(null);

  const lastUpdatedInfo = useMemo(
    () => getSiteLastUpdated(location.pathname),
    [location.pathname]
  );

  const hasGlobalShortcutManager = shortcuts.length > 0;
  const isShortcutsModalOpen = hasGlobalShortcutManager ? isHelpModalOpen : isFallbackModalOpen;
  const effectiveActivePrefix = hasGlobalShortcutManager
    ? contextActivePrefix
    : fallbackActivePrefix;

  // Standalone prefix key listener when Footer is rendered outside KeyboardShortcutManager
  useEffect(() => {
    if (hasGlobalShortcutManager) return;

    const clearFallbackPrefix = () => {
      if (fallbackTimerRef.current !== null) {
        window.clearTimeout(fallbackTimerRef.current);
        fallbackTimerRef.current = null;
      }
      fallbackPrefixRef.current = null;
      setFallbackActivePrefix(null);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isEditable =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable);

      const lowerKey = e.key.toLowerCase();

      if (fallbackPrefixRef.current) {
        if (['shift', 'control', 'alt', 'meta'].includes(lowerKey)) return;
        clearFallbackPrefix();
        return;
      }

      if (!isEditable && !e.metaKey && !e.ctrlKey && !e.altKey && !e.shiftKey && lowerKey === 'g') {
        e.preventDefault();
        if (fallbackTimerRef.current !== null) {
          window.clearTimeout(fallbackTimerRef.current);
        }
        fallbackPrefixRef.current = 'g';
        setFallbackActivePrefix('g');
        fallbackTimerRef.current = window.setTimeout(() => {
          fallbackPrefixRef.current = null;
          setFallbackActivePrefix(null);
          fallbackTimerRef.current = null;
        }, 1500);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (fallbackTimerRef.current !== null) {
        window.clearTimeout(fallbackTimerRef.current);
      }
    };
  }, [hasGlobalShortcutManager]);

  const handleOpenShortcuts = (e: React.MouseEvent<HTMLButtonElement>) => {
    const triggerEl = e.currentTarget;
    if (onOpenShortcutsModal) {
      onOpenShortcutsModal();
    }
    if (hasGlobalShortcutManager) {
      openHelpModal();
    } else {
      setIsFallbackModalOpen(true);
    }
    window.dispatchEvent(
      new CustomEvent('open-shortcuts-modal', {
        detail: { triggerElement: triggerEl },
      })
    );
  };

  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-grid">
          {/* Column 1: Company/Author Bio & Expertise Statement */}
          <div className="footer-col">
            <h4>Jawed Imtiaz — IT Field Tech</h4>
            <p>
              Professional IT Field Engineer specializing in Service Desk operations, workplace technology, Apple macOS &amp; Jamf device management, and Microsoft enterprise systems. Delivering practical field guides, diagnostic utilities, and IT dispatch services.
            </p>
          </div>

          {/* Column 2: Quick Links to Main Sections */}
          <div className="footer-col">
            <h4>Main Sections</h4>
            <ul className="footer-links">
              <li><Link to="/guides">Guides &amp; KB</Link></li>
              <li><Link to="/tools">Tools</Link></li>
              <li><Link to="/services">Services</Link></li>
              <li><Link to="/work">Work &amp; Portfolio</Link></li>
              <li><Link to="/about">About Jawed</Link></li>
              <li><Link to="/contact">Contact Us</Link></li>
            </ul>
          </div>

          {/* Column 3: Featured Diagnostic Utilities */}
          <div className="footer-col">
            <h4>Featured Utilities</h4>
            <ul className="footer-links">
              <li><Link to="/tools/ipv4-subnet-calculator">IPv4 Subnet &amp; CIDR Calculator</Link></li>
              <li><Link to="/tools/server-rack-power-btu-calculator">Server Rack Power &amp; BTU Calculator</Link></li>
              <li><Link to="/tools/it-troubleshooting-assistant">IT Troubleshooting Assistant</Link></li>
              <li><Link to="/tools/service-desk-note-formatter">Service Desk Note Formatter</Link></li>
              <li><Link to="/tools/ai-prompt-builder">AI Prompt Builder</Link></li>
              <li><Link to="/ai">Jawed AI Assistant</Link></li>
            </ul>
          </div>

          {/* Column 4: Legal & Preferences */}
          <div className="footer-col">
            <h4>Legal &amp; Preferences</h4>
            <ul className="footer-links">
              <li><Link to="/privacy">Privacy Policy</Link></li>
              <li><Link to="/terms">Terms of Service</Link></li>
              <li><Link to="/cookies">Cookie Policy</Link></li>
              <li>
                <button
                  type="button"
                  className="cookie-trigger-btn"
                  onClick={onOpenCookieModal}
                >
                  ⚙ Cookie Preferences
                </button>
              </li>
              <li>
                <button
                  type="button"
                  className="cookie-trigger-btn"
                  onClick={handleOpenShortcuts}
                  data-shortcuts-trigger-col="true"
                  title="Open Keyboard Shortcuts Cheatsheet (Shift + ?)"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    marginTop: '2px',
                  }}
                >
                  <span>⌨️ Shortcuts</span>
                  <kbd style={{ fontSize: '0.7rem', opacity: 0.85, fontFamily: 'monospace' }}>Shift+?</kbd>
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Footer Bottom Bar */}
        <div className="footer-bottom">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <p style={{ margin: 0 }}>
              © {currentYear} Jawed Imtiaz. All rights reserved. IT Field Support &amp; Workplace Engineering.
            </p>
            <span style={{ color: 'var(--muted)', opacity: 0.6 }} aria-hidden="true">•</span>
            <span
              className="footer-last-updated"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.82rem',
                color: 'var(--muted)',
              }}
              title="Content freshness timestamp derived from notes & field guides metadata"
            >
              <span
                aria-hidden="true"
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: 'var(--emerald, #10b981)',
                  display: 'inline-block',
                }}
              />
              <span>
                Last Updated:{' '}
                <time dateTime={lastUpdatedInfo.iso} style={{ fontWeight: 600, color: 'var(--text)' }}>
                  {lastUpdatedInfo.formatted}
                </time>
              </span>
            </span>
          </div>

          {/* Grouped Bottom Navigation: Privacy & Legal Links alongside Keyboard Shortcuts */}
          <div
            className="footer-bottom-links"
            style={{
              display: 'flex',
              gap: '14px',
              alignItems: 'center',
              flexWrap: 'wrap',
            }}
          >
            {/* Privacy & Legal Cluster */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '12px',
                flexWrap: 'wrap',
              }}
            >
              <Link to="/privacy">Privacy Policy</Link>
              <span aria-hidden="true" style={{ color: 'var(--muted)', opacity: 0.5 }}>•</span>
              <Link to="/terms">Terms of Service</Link>
              <span aria-hidden="true" style={{ color: 'var(--muted)', opacity: 0.5 }}>•</span>
              <Link to="/cookies">Cookie Preferences</Link>
            </div>

            <span aria-hidden="true" style={{ color: 'var(--muted)', opacity: 0.4 }}>|</span>

            {/* Clearly Visible Keyboard Shortcuts Action Button */}
            <button
              type="button"
              className="footer-text-btn"
              data-shortcuts-trigger="true"
              data-shortcut-active={effectiveActivePrefix ? 'true' : 'false'}
              aria-haspopup="dialog"
              aria-expanded={isShortcutsModalOpen}
              aria-keyshortcuts="Shift+?"
              title="Open Keyboard Shortcuts Cheatsheet (Shift + ?)"
              onClick={handleOpenShortcuts}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                borderRadius: '6px',
                background: effectiveActivePrefix
                  ? 'rgba(56, 189, 248, 0.22)'
                  : 'var(--surface, rgba(255, 255, 255, 0.05))',
                border: effectiveActivePrefix
                  ? '1px solid var(--accent)'
                  : '1px solid var(--line, rgba(255, 255, 255, 0.14))',
                color: effectiveActivePrefix ? 'var(--accent)' : 'var(--text-heading, var(--text))',
                fontWeight: 600,
                fontSize: '0.82rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                textDecoration: 'none',
              }}
            >
              <span aria-hidden="true">⌨️</span>
              <span>Keyboard Shortcuts</span>
              <kbd
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '1px 5px',
                  borderRadius: '4px',
                  background: 'var(--bg-darker, rgba(0, 0, 0, 0.25))',
                  border: '1px solid var(--line, rgba(255, 255, 255, 0.18))',
                  fontSize: '0.7rem',
                  fontFamily: 'monospace',
                  fontWeight: 700,
                  color: 'var(--muted)',
                }}
              >
                Shift + ?
              </kbd>
            </button>
          </div>
        </div>
      </div>

      {/* Host container for the subtle 'Shortcut Active' indicator in the footer / corner toast */}
      <div data-footer-shortcut-host="true" data-testid="footer-shortcut-host">
        {!hasGlobalShortcutManager && effectiveActivePrefix && (
          <div
            role="status"
            aria-live="polite"
            aria-atomic="true"
            aria-label={`Shortcut active: prefix ${effectiveActivePrefix.toUpperCase()} initiated, listening for secondary key`}
            data-testid="shortcut-prefix-toast"
            data-prefix-key={effectiveActivePrefix}
            style={{
              position: 'fixed',
              bottom: '24px',
              left: '24px',
              zIndex: 10001,
              background: 'var(--card)',
              border: '1px solid var(--accent)',
              borderRadius: '10px',
              padding: '10px 16px',
              fontSize: '0.82rem',
              fontWeight: 700,
              color: 'var(--text-heading)',
              boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
              display: 'flex',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '10px',
              pointerEvents: 'none',
            }}
          >
            <span
              data-testid="shortcut-active-indicator"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '2px 8px',
                borderRadius: '999px',
                background: 'rgba(56, 189, 248, 0.14)',
                border: '1px solid rgba(56, 189, 248, 0.35)',
                color: 'var(--accent)',
                fontSize: '0.73rem',
                fontWeight: 700,
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  background: 'var(--emerald, #10b981)',
                  display: 'inline-block',
                }}
              />
              <span>Shortcut Active</span>
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--accent)' }}>
              <kbd
                style={{
                  padding: '0 6px',
                  borderRadius: '5px',
                  background: 'var(--accent)',
                  color: '#fff',
                  fontFamily: 'var(--font-mono, monospace)',
                  fontSize: '0.76rem',
                  fontWeight: 800,
                }}
              >
                {effectiveActivePrefix.toUpperCase()}
              </kbd>
              <span>Go to…</span>
              <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--muted)' }}>
                (Listening for secondary key)
              </span>
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem' }}>
              <span><kbd>H</kbd> Home</span>
              <span><kbd>T</kbd> Tools</span>
              <span><kbd>G</kbd> Guides</span>
              <span><kbd>Esc</kbd> Cancel</span>
            </span>
          </div>
        )}
      </div>

      {!hasGlobalShortcutManager && (
        <KeyboardShortcutModal
          isOpen={isFallbackModalOpen}
          onClose={() => setIsFallbackModalOpen(false)}
          shortcuts={FALLBACK_SHORTCUTS}
          onTriggerShortcut={() => {}}
        />
      )}
    </footer>
  );
};

