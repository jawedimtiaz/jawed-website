import React, { useState, useEffect, useMemo } from 'react';
import {
  generateTableOfContents,
  convertMarkdownHeadingsToHtml,
  parseRenderedHeadingsFromDom,
  jumpToHeadingSection,
  navigateToHashHeadingOnLoad,
  buildTocAnchorUrl,
  copyTocAnchorToClipboard,
  copySectionAnchorLink,
  injectHeadingCopyButtons,
  deriveTableCaptionText,
  wrapTablesInAccessibleContainers,
  ensureAccessibleTablesInDom,
  decodeCodeBlockEntities,
  formatCodeBlockAsMarkdown,
  copyCodeBlockAsMarkdown,
  injectCodeBlockMarkdownCopyButtons,
  shareNoteUrlAndTitle,
  slugifyHeading,
  decodeHtmlEntities,
  HEADING_COPY_BUTTON_LABEL,
  HEADING_COPY_TOAST_MESSAGE,
  CODE_MARKDOWN_BUTTON_LABEL,
  CODE_MARKDOWN_COPIED_LABEL,
  type TocItem,
  type GeneratedTocResult,
  type CopySectionAnchorResult,
  type AccessibleTableOptions,
  type FormatCodeMarkdownOptions,
  type CopyCodeMarkdownResult,
  type WebShareNavigatorLike,
  type ShareNoteResult,
} from '../utils/tocGenerator';
import {
  ReadTimeProgressIndicator,
  type ReadTimeProgressIndicatorProps,
} from './ReadTimeProgressIndicator';

export {
  generateTableOfContents,
  convertMarkdownHeadingsToHtml,
  parseRenderedHeadingsFromDom,
  jumpToHeadingSection,
  navigateToHashHeadingOnLoad,
  buildTocAnchorUrl,
  copyTocAnchorToClipboard,
  copySectionAnchorLink,
  injectHeadingCopyButtons,
  deriveTableCaptionText,
  wrapTablesInAccessibleContainers,
  ensureAccessibleTablesInDom,
  decodeCodeBlockEntities,
  formatCodeBlockAsMarkdown,
  copyCodeBlockAsMarkdown,
  injectCodeBlockMarkdownCopyButtons,
  shareNoteUrlAndTitle,
  slugifyHeading,
  decodeHtmlEntities,
  HEADING_COPY_BUTTON_LABEL,
  HEADING_COPY_TOAST_MESSAGE,
  CODE_MARKDOWN_BUTTON_LABEL,
  CODE_MARKDOWN_COPIED_LABEL,
  ReadTimeProgressIndicator,
  type TocItem,
  type GeneratedTocResult,
  type CopySectionAnchorResult,
  type AccessibleTableOptions,
  type FormatCodeMarkdownOptions,
  type CopyCodeMarkdownResult,
  type WebShareNavigatorLike,
  type ShareNoteResult,
  type ReadTimeProgressIndicatorProps,
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
   * Which layout mode to render:
   * - 'desktop': sticky side-mounted navigation menu
   * - 'mobile': collapsible mobile/tablet top bar
   * - 'floating': floating quick-jump navigation menu button & popover panel
   * - 'both': desktop + mobile
   * - 'all': desktop + mobile + floating
   */
  mode?: 'desktop' | 'mobile' | 'floating' | 'both' | 'all';
  /**
   * Controlled mobile open state (optional).
   */
  isMobileOpen?: boolean;
  /**
   * Controlled mobile toggle handler (optional).
   */
  onToggleMobile?: () => void;
  /**
   * Controlled floating menu open state (optional).
   */
  isFloatingOpen?: boolean;
  /**
   * Controlled floating menu toggle handler (optional).
   */
  onToggleFloating?: () => void;
  /**
   * Whether to display the scroll-triggered estimated read time progress indicator in the sidebar.
   * Defaults to true when content or estimatedTime is supplied.
   */
  showReadTime?: boolean;
  /**
   * Optional precomputed estimated read time (e.g. '5 min read' or number of minutes).
   */
  estimatedTime?: string | number;
}

export const TableOfContents: React.FC<TableOfContentsProps> = ({
  tocItems: propTocItems,
  content,
  containerSelector = '[data-testid="note-rendered-content"], .note-rendered-content, .article-body',
  activeHeadingId: controlledActiveId,
  copiedHeadingId = '',
  onSelectHeading,
  onCopyHeadingLink,
  onScrollToTop,
  mode = 'desktop',
  isMobileOpen: controlledMobileOpen,
  onToggleMobile,
  isFloatingOpen: controlledFloatingOpen,
  onToggleFloating,
  showReadTime = true,
  estimatedTime,
}) => {
  const [domTocItems, setDomTocItems] = useState<TocItem[]>([]);
  const [internalActiveId, setInternalActiveId] = useState<string>('');
  const [internalMobileOpen, setInternalMobileOpen] = useState<boolean>(false);
  const [internalFloatingOpen, setInternalFloatingOpen] = useState<boolean>(false);

  // Parse H2 and H3 headers from content if tocItems prop was not passed
  const contentTocItems = useMemo(() => {
    if (propTocItems && propTocItems.length > 0) return propTocItems;
    if (content) return generateTableOfContents(content).tocItems;
    return [];
  }, [propTocItems, content]);

  // Fallback to inspecting rendered DOM H2/H3 headings when neither propTocItems nor content is supplied
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
  const isFloatingTocOpen = controlledFloatingOpen ?? internalFloatingOpen;
  const activeItem = items.find((item) => item.id === activeHeadingId) || items[0];

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
    if (onToggleFloating) {
      if (isFloatingTocOpen) onToggleFloating();
    } else {
      setInternalFloatingOpen(false);
    }
    jumpToHeadingSection(headingId);
    onSelectHeading?.(headingId);
  };

  const handleScrollTopClick = () => {
    if (onToggleFloating && isFloatingTocOpen) {
      onToggleFloating();
    } else {
      setInternalFloatingOpen(false);
    }
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

  const [internalCopiedId, setInternalCopiedId] = useState<string>('');
  const activeCopiedId = copiedHeadingId || internalCopiedId;

  const handleCopyLinkClick = async (
    event: React.MouseEvent<HTMLButtonElement>,
    headingId: string
  ) => {
    if (onCopyHeadingLink) {
      onCopyHeadingLink(event, headingId);
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const currentBaseUrl = typeof window !== 'undefined' ? window.location.href : '';
    const anchorUrl = buildTocAnchorUrl(currentBaseUrl, headingId);
    await copyTocAnchorToClipboard(anchorUrl);
    setInternalCopiedId(headingId);
    setTimeout(() => {
      setInternalCopiedId((prev) => (prev === headingId ? '' : prev));
    }, 2000);
  };

  const renderTocList = (idPrefix: string) => (
    <ul className="note-toc-list" data-testid={`${idPrefix}-toc-list`}>
      {items.map((item) => {
        const isActive = activeHeadingId === item.id;
        const isCopied = activeCopiedId === item.id;
        return (
          <li
            key={item.id}
            className={`note-toc-item level-${item.level}`}
            data-heading-level={`h${item.level}`}
          >
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
              <button
                type="button"
                onClick={(e) => handleCopyLinkClick(e, item.id)}
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
            </div>
          </li>
        );
      })}
    </ul>
  );

  return (
    <>
      {(mode === 'mobile' || mode === 'both' || mode === 'all') && (
        <nav
          className="note-toc-mobile no-print"
          aria-label="Table of Contents (Mobile)"
          data-testid="note-toc-mobile"
        >
          <button
            type="button"
            className="note-toc-mobile-toggle"
            data-testid="note-toc-mobile-toggle"
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
              {showReadTime && (content || estimatedTime) && (
                <ReadTimeProgressIndicator
                  content={content}
                  estimatedTime={estimatedTime}
                  variant="sidebar"
                />
              )}
              {renderTocList('mobile')}
            </div>
          )}
        </nav>
      )}

      {(mode === 'desktop' || mode === 'both' || mode === 'all') && (
        <aside
          className="note-toc-sidebar sticky top-24 no-print"
          aria-label="Table of Contents"
          data-testid="note-toc-sidebar"
          style={{ position: 'sticky', top: '96px', alignSelf: 'start' }}
        >
          <nav aria-label="On this page">
            <div className="note-toc-header">
              <h2 className="note-toc-title">On this page</h2>
              <span className="note-toc-count">{items.length} sections</span>
            </div>
            {showReadTime && (content || estimatedTime) && (
              <ReadTimeProgressIndicator
                content={content}
                estimatedTime={estimatedTime}
                variant="sidebar"
              />
            )}
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

      {(mode === 'floating' || mode === 'all') && (
        <div
          className="note-toc-floating no-print"
          data-testid="note-toc-floating"
          aria-label="Floating Table of Contents Navigation"
        >
          {isFloatingTocOpen && (
            <div
              id="note-toc-floating-panel"
              className="note-toc-floating-panel"
              data-testid="note-toc-floating-panel"
              role="dialog"
              aria-label="Table of Contents Quick Jump"
            >
              <div className="note-toc-header">
                <span className="note-toc-title">Table of Contents</span>
                <span className="note-toc-count">{items.length} sections</span>
              </div>
              {renderTocList('floating')}
              <div
                style={{
                  marginTop: '12px',
                  paddingTop: '10px',
                  borderTop: '1px solid var(--border)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <button
                  type="button"
                  onClick={handleScrollTopClick}
                  className="footer-text-btn"
                  style={{ fontSize: '0.78rem', fontWeight: 600 }}
                >
                  ↑ Back to top
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (onToggleFloating) {
                      onToggleFloating();
                    } else {
                      setInternalFloatingOpen(false);
                    }
                  }}
                  className="footer-text-btn"
                  style={{ fontSize: '0.78rem', fontWeight: 600 }}
                  data-testid="note-toc-floating-close"
                >
                  Close ✕
                </button>
              </div>
            </div>
          )}
          <button
            type="button"
            className="note-toc-floating-toggle"
            data-testid="note-toc-floating-toggle"
            onClick={() => {
              if (onToggleFloating) {
                onToggleFloating();
              } else {
                setInternalFloatingOpen((prev) => !prev);
              }
            }}
            aria-expanded={isFloatingTocOpen}
            aria-controls="note-toc-floating-panel"
            title="Toggle floating Table of Contents menu"
          >
            <span className="note-toc-floating-badge" aria-hidden="true">
              TOC
            </span>
            <span className="note-toc-floating-current" data-testid="note-toc-floating-current">
              {activeItem?.text || 'Table of Contents'}
            </span>
            <span className="note-toc-floating-count" aria-hidden="true">
              {items.length}
            </span>
          </button>
        </div>
      )}
    </>
  );
};

export const AutomatedTableOfContents = TableOfContents;
export default TableOfContents;

