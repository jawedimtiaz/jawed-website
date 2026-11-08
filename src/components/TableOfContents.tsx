import React, { useState, useEffect, useMemo } from 'react';
import {
  generateTableOfContents,
  convertMarkdownHeadingsToHtml,
  parseRenderedHeadingsFromDom,
  jumpToHeadingSection,
  buildTocAnchorUrl,
  copyTocAnchorToClipboard,
  injectHeadingCopyButtons,
  slugifyHeading,
  decodeHtmlEntities,
  type TocItem,
  type GeneratedTocResult,
} from '../utils/tocGenerator';

export {
  generateTableOfContents,
  convertMarkdownHeadingsToHtml,
  parseRenderedHeadingsFromDom,
  jumpToHeadingSection,
  buildTocAnchorUrl,
  copyTocAnchorToClipboard,
  injectHeadingCopyButtons,
  slugifyHeading,
  decodeHtmlEntities,
  type TocItem,
  type GeneratedTocResult,
};

export interface TableOfContentsProps {
  /**
   * Pre-extracted Table of Contents items (H2 and H3).
   * If omitted, `content` or `containerSelector` is used to automatically parse headings.
   */
  tocItems?: TocItem[];
  /**
   * Raw Markdown or HTML content string to automatically parse if `tocItems` is not provided.
   */
  content?: string;
  /**
   * Optional DOM selector to inspect rendered H2/H3 headings from the page.
   */
  containerSelector?: string;
  /**
   * Currently active heading ID from scroll-spy or user selection.
   */
  activeHeadingId?: string;
  /**
   * Heading ID that was recently copied to the clipboard.
   */
  copiedHeadingId?: string;
  /**
   * Callback invoked when a user clicks a TOC link to jump to a heading.
   */
  onSelectHeading?: (headingId: string) => void;
  /**
   * Callback invoked when a user clicks the copy-link icon next to a TOC entry.
   */
  onCopyHeadingLink?: (event: React.MouseEvent<HTMLButtonElement>, headingId: string) => void;
  /**
   * Callback invoked when the user clicks "↑ Back to top".
   */
  onScrollToTop?: () => void;
  /**
   * Which layout mode to render: 'desktop' (sticky side navigation), 'mobile' (collapsible bar), or 'both'.
   */
  mode?: 'desktop' | 'mobile' | 'both';
  /**
   * Controlled mobile open state (optional).
   */
  isMobileOpen?: boolean;
  /**
   * Controlled mobile toggle handler (optional).
   */
  onToggleMobile?: () => void;
}

export const TableOfContents: React.FC<TableOfContentsProps> = ({
  tocItems: propTocItems,
  content,
  containerSelector = '[data-testid="note-rendered-content"], .note-rendered-content',
  activeHeadingId: controlledActiveId,
  copiedHeadingId = '',
  onSelectHeading,
  onCopyHeadingLink,
  onScrollToTop,
  mode = 'desktop',
  isMobileOpen: controlledMobileOpen,
  onToggleMobile,
}) => {
  const [domTocItems, setDomTocItems] = useState<TocItem[]>([]);
  const [internalActiveId, setInternalActiveId] = useState<string>('');
  const [internalMobileOpen, setInternalMobileOpen] = useState<boolean>(false);

  // Parse from content if tocItems prop was not passed
  const contentTocItems = useMemo(() => {
    if (propTocItems && propTocItems.length > 0) return propTocItems;
    if (content) return generateTableOfContents(content).tocItems;
    return [];
  }, [propTocItems, content]);

  // Fallback to inspecting rendered DOM headings when neither propTocItems nor content is supplied
  useEffect(() => {
    if (contentTocItems.length > 0 || typeof document === 'undefined') return;
    const container = document.querySelector(containerSelector);
    if (container) {
      const parsed = parseRenderedHeadingsFromDom(container);
      setDomTocItems(parsed);
    }
  }, [contentTocItems, containerSelector]);

  const items = contentTocItems.length > 0 ? contentTocItems : domTocItems;
  const activeHeadingId = controlledActiveId ?? (internalActiveId || items[0]?.id || '');
  const isMobileTocOpen = controlledMobileOpen ?? internalMobileOpen;

  // Built-in scroll-spy when activeHeadingId is not externally controlled
  useEffect(() => {
    if (controlledActiveId !== undefined || items.length === 0 || typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }

    const handleScrollSpy = () => {
      const scrollThreshold = 130;
      let currentId = items[0]?.id || '';

      for (const item of items) {
        const element = document.getElementById(item.id);
        if (element) {
          const rect = element.getBoundingClientRect();
          if (rect.top <= scrollThreshold) {
            currentId = item.id;
          } else {
            break;
          }
        }
      }

      setInternalActiveId((prev) => (prev === currentId ? prev : currentId));
    };

    window.addEventListener('scroll', handleScrollSpy, { passive: true });
    handleScrollSpy();

    return () => {
      window.removeEventListener('scroll', handleScrollSpy);
    };
  }, [controlledActiveId, items]);

  if (items.length === 0) {
    return null;
  }

  const handleLinkClick = (event: React.MouseEvent<HTMLAnchorElement>, headingId: string) => {
    event.preventDefault();
    setInternalActiveId(headingId);
    if (!onToggleMobile) {
      setInternalMobileOpen(false);
    }
    jumpToHeadingSection(headingId);
    onSelectHeading?.(headingId);
  };

  const handleScrollTopClick = () => {
    if (onScrollToTop) {
      onScrollToTop();
      return;
    }
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    if (items[0]?.id) {
      setInternalActiveId(items[0].id);
    }
  };

  const renderTocList = (idPrefix: string) => (
    <ul className="note-toc-list" data-testid={`${idPrefix}-toc-list`}>
      {items.map((item) => {
        const isActive = activeHeadingId === item.id;
        const isCopied = copiedHeadingId === item.id;
        return (
          <li key={item.id} className={`note-toc-item level-${item.level}`}>
            <div className="note-toc-row">
              <a
                href={`#${item.id}`}
                onClick={(e) => handleLinkClick(e, item.id)}
                className={`note-toc-link level-${item.level}${isActive ? ' is-active' : ''}`}
                aria-current={isActive ? 'location' : undefined}
                data-testid={`${idPrefix}-toc-jump-${item.id}`}
              >
                {item.text}
              </a>
              {onCopyHeadingLink && (
                <button
                  type="button"
                  onClick={(e) => onCopyHeadingLink(e, item.id)}
                  className={`note-toc-copy-btn${isCopied ? ' is-copied' : ''}`}
                  title={isCopied ? 'Link copied!' : 'Copy Link to Heading'}
                  aria-label={
                    isCopied
                      ? `Copied link to ${item.text}`
                      : `Copy Link to Heading: ${item.text}`
                  }
                  data-testid={`${idPrefix}-copy-toc-link-${item.id}`}
                >
                  {isCopied ? (
                    <>
                      <span aria-hidden="true">✓</span>
                      <span>Copied</span>
                    </>
                  ) : (
                    <svg
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                    </svg>
                  )}
                </button>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );

  return (
    <>
      {(mode === 'mobile' || mode === 'both') && (
        <nav className="note-toc-mobile" aria-label="Table of Contents (Mobile)">
          <button
            type="button"
            className="note-toc-mobile-toggle"
            onClick={() => {
              if (onToggleMobile) {
                onToggleMobile();
              } else {
                setInternalMobileOpen((prev) => !prev);
              }
            }}
            aria-expanded={isMobileTocOpen}
            aria-controls="note-toc-mobile-panel"
          >
            <span>On this page · {items.length} sections</span>
            <span aria-hidden="true" style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
              {isMobileTocOpen ? 'Hide ▲' : 'Show ▼'}
            </span>
          </button>
          {isMobileTocOpen && (
            <div id="note-toc-mobile-panel" className="note-toc-mobile-panel">
              {renderTocList('mobile')}
            </div>
          )}
        </nav>
      )}

      {(mode === 'desktop' || mode === 'both') && (
        <aside
          className="note-toc-sidebar sticky top-24"
          aria-label="Table of Contents"
          data-testid="note-toc-sidebar"
          style={{ position: 'sticky', top: '96px', alignSelf: 'start' }}
        >
          <nav aria-label="On this page">
            <div className="note-toc-header">
              <h2 className="note-toc-title">On this page</h2>
              <span className="note-toc-count">{items.length} sections</span>
            </div>
            {renderTocList('desktop')}
            <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
              <button
                type="button"
                onClick={handleScrollTopClick}
                className="footer-text-btn"
                style={{ fontSize: '0.8rem', fontWeight: 600 }}
              >
                ↑ Back to top
              </button>
            </div>
          </nav>
        </aside>
      )}
    </>
  );
};

export const AutomatedTableOfContents = TableOfContents;
export default TableOfContents;
