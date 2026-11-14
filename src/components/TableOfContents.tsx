import React, { useState, useEffect, useMemo } from 'react';
import {
  generateTableOfContents,
  convertMarkdownHeadingsToHtml,
  parseRenderedHeadingsFromDom,
  extractTocHeadings,
  groupTocItemsByH2,
  smoothScrollToHeading,
  jumpToHeadingSection,
  navigateToHashHeadingOnLoad,
  buildTocAnchorUrl,
  copyTocAnchorToClipboard,
  copySectionAnchorLink,
  ensureHeadingIdsAndCopyButtonsInDom,
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
  TOC_AUTO_COLLAPSE_HEADING_THRESHOLD,
  shouldAutoExpandToc,
  shouldDefaultCollapseToc,
  HEADING_COPY_BUTTON_LABEL,
  HEADING_COPY_TOAST_MESSAGE,
  CODE_MARKDOWN_BUTTON_LABEL,
  CODE_MARKDOWN_COPIED_LABEL,
  type TocItem,
  type GroupedTocSection,
  type SmoothScrollTocResult,
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
  extractTocHeadings,
  groupTocItemsByH2,
  smoothScrollToHeading,
  jumpToHeadingSection,
  navigateToHashHeadingOnLoad,
  buildTocAnchorUrl,
  copyTocAnchorToClipboard,
  copySectionAnchorLink,
  ensureHeadingIdsAndCopyButtonsInDom,
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
  TOC_AUTO_COLLAPSE_HEADING_THRESHOLD,
  shouldAutoExpandToc,
  shouldDefaultCollapseToc,
  HEADING_COPY_BUTTON_LABEL,
  HEADING_COPY_TOAST_MESSAGE,
  CODE_MARKDOWN_BUTTON_LABEL,
  CODE_MARKDOWN_COPIED_LABEL,
  ReadTimeProgressIndicator,
  type TocItem,
  type GroupedTocSection,
  type SmoothScrollTocResult,
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
   * - 'desktop': sticky side-mounted navigation menu (with collapsible toggle)
   * - 'mobile': collapsible mobile/tablet top bar
   * - 'collapsible': inline collapsible Table of Contents accordion panel
   * - 'floating': floating quick-jump navigation menu button & popover panel
   * - 'both': desktop + mobile
   * - 'all': desktop + mobile + floating
   */
  mode?: 'desktop' | 'mobile' | 'collapsible' | 'floating' | 'both' | 'all';
  /**
   * Whether the TOC panel can be collapsed/expanded by the user. Defaults to true.
   */
  collapsible?: boolean;
  /**
   * Whether the collapsible TOC starts collapsed on initial render.
   * When omitted, automatically expands if the page has fewer than 5 headings (`items.length < 5`),
   * and defaults to collapsed when the page has 5 or more headings (`items.length >= 5`).
   */
  defaultCollapsed?: boolean;
  /**
   * Controlled collapsed state (optional).
   */
  isCollapsed?: boolean;
  /**
   * Callback invoked when the user toggles the collapsed state (optional).
   */
  onToggleCollapse?: (nextCollapsed: boolean) => void;
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
  collapsible = true,
  defaultCollapsed,
  isCollapsed: controlledCollapsed,
  onToggleCollapse,
  isMobileOpen: controlledMobileOpen,
  onToggleMobile,
  isFloatingOpen: controlledFloatingOpen,
  onToggleFloating,
  showReadTime = true,
  estimatedTime,
}) => {
  const [domTocItems, setDomTocItems] = useState<TocItem[]>([]);
  const [internalActiveId, setInternalActiveId] = useState<string>('');
  const [userCollapsedOverride, setUserCollapsedOverride] = useState<boolean | null>(null);
  const [userMobileOpenOverride, setUserMobileOpenOverride] = useState<boolean | null>(null);
  const [internalFloatingOpen, setInternalFloatingOpen] = useState<boolean>(false);

  // Automatically extract all H2 and H3 headings from content if tocItems prop was not passed
  const contentTocItems = useMemo(() => {
    if (propTocItems && propTocItems.length > 0) return propTocItems;
    if (content) return extractTocHeadings(content);
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

  // Automatically expand if the current page has fewer than 5 headings; otherwise default to collapsed
  const computedDefaultCollapsed =
    defaultCollapsed !== undefined ? defaultCollapsed : shouldDefaultCollapseToc(items.length);
  const isAutoExpanded = shouldAutoExpandToc(items.length);

  // Reset manual toggle override when navigating to a page with a different set of headings
  const headingSignature = useMemo(() => items.map((i) => i.id).join('|'), [items]);
  useEffect(() => {
    setUserCollapsedOverride(null);
    setUserMobileOpenOverride(null);
  }, [headingSignature, defaultCollapsed]);

  const activeHeadingId = controlledActiveId ?? (internalActiveId || items[0]?.id || '');
  const isTocCollapsed =
    controlledCollapsed ??
    (userCollapsedOverride !== null ? userCollapsedOverride : computedDefaultCollapsed);
  const isMobileTocOpen =
    controlledMobileOpen ??
    (userMobileOpenOverride !== null ? userMobileOpenOverride : !computedDefaultCollapsed);
  const isFloatingTocOpen = controlledFloatingOpen ?? internalFloatingOpen;
  const activeItem = items.find((item) => item.id === activeHeadingId) || items[0];

  const handleToggleDesktopCollapse = () => {
    const nextCollapsed = !isTocCollapsed;
    if (controlledCollapsed === undefined) {
      setUserCollapsedOverride(nextCollapsed);
    }
    onToggleCollapse?.(nextCollapsed);
  };

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
      setUserMobileOpenOverride(false);
    }
    if (onToggleFloating) {
      if (isFloatingTocOpen) onToggleFloating();
    } else {
      setInternalFloatingOpen(false);
    }
    smoothScrollToHeading(headingId);
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
    await copySectionAnchorLink(headingId, currentBaseUrl);
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
      {mode === 'collapsible' && (
        <nav
          className={`note-toc-collapsible no-print${isTocCollapsed ? ' is-collapsed' : ' is-expanded'}`}
          aria-label="Collapsible Table of Contents"
          data-testid="collapsible-table-of-contents"
          data-collapsed={isTocCollapsed}
          data-heading-count={items.length}
          data-auto-expanded={isAutoExpanded}
          data-default-collapsed={computedDefaultCollapsed}
        >
          <button
            type="button"
            className="note-toc-collapsible-toggle"
            data-testid="collapsible-toc-toggle"
            onClick={handleToggleDesktopCollapse}
            aria-expanded={!isTocCollapsed}
            aria-controls="collapsible-toc-panel"
          >
            <span className="note-toc-collapsible-heading">
              <span className="note-toc-title">Table of Contents</span>
              <span className="note-toc-count">{items.length} sections</span>
            </span>
            <span className="note-toc-collapsible-status">
              {isTocCollapsed && activeItem && (
                <span className="note-toc-collapsed-active" data-testid="collapsible-toc-active-preview">
                  {activeItem.text}
                </span>
              )}
              <span aria-hidden="true" className="note-toc-chevron">
                {isTocCollapsed ? 'Show ▼' : 'Hide ▲'}
              </span>
            </span>
          </button>
          {!isTocCollapsed && (
            <div
              id="collapsible-toc-panel"
              className="note-toc-collapsible-panel"
              data-testid="collapsible-toc-panel"
            >
              {showReadTime && (content || estimatedTime) && (
                <ReadTimeProgressIndicator
                  content={content}
                  estimatedTime={estimatedTime}
                  variant="sidebar"
                />
              )}
              {renderTocList('collapsible')}
            </div>
          )}
        </nav>
      )}

      {(mode === 'mobile' || mode === 'both' || mode === 'all') && (
        <nav
          className="note-toc-mobile no-print"
          aria-label="Table of Contents (Mobile)"
          data-testid="note-toc-mobile"
          data-heading-count={items.length}
          data-auto-expanded={isAutoExpanded}
          data-default-collapsed={computedDefaultCollapsed}
        >
          <button
            type="button"
            className="note-toc-mobile-toggle"
            data-testid="note-toc-mobile-toggle"
            onClick={() => {
              if (onToggleMobile) {
                onToggleMobile();
              } else {
                setUserMobileOpenOverride(!isMobileTocOpen);
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
          className={`note-toc-sidebar sticky top-24 no-print${isTocCollapsed ? ' is-collapsed' : ''}`}
          aria-label="Table of Contents"
          data-testid="note-toc-sidebar"
          data-collapsed={isTocCollapsed}
          data-heading-count={items.length}
          data-auto-expanded={isAutoExpanded}
          data-default-collapsed={computedDefaultCollapsed}
          style={{ position: 'sticky', top: '96px', alignSelf: 'start' }}
        >
          <nav aria-label="On this page">
            <div className="note-toc-header">
              <div>
                <h2 className="note-toc-title">On this page</h2>
                <span className="note-toc-count">{items.length} sections</span>
              </div>
              {collapsible && (
                <button
                  type="button"
                  onClick={handleToggleDesktopCollapse}
                  className="note-toc-collapse-btn"
                  data-testid="note-toc-collapse-toggle"
                  aria-expanded={!isTocCollapsed}
                  aria-controls="note-toc-desktop-body"
                  title={isTocCollapsed ? 'Expand Table of Contents' : 'Collapse Table of Contents'}
                >
                  <span>{isTocCollapsed ? 'Show' : 'Hide'}</span>
                  <span aria-hidden="true">{isTocCollapsed ? '▼' : '▲'}</span>
                </button>
              )}
            </div>
            {isTocCollapsed ? (
              <div
                className="note-toc-collapsed-summary"
                data-testid="note-toc-collapsed-summary"
              >
                <span className="note-toc-collapsed-label">Current section:</span>
                <a
                  href={`#${activeItem?.id || ''}`}
                  onClick={(e) => activeItem && handleLinkClick(e, activeItem.id)}
                  className="note-toc-link is-active"
                  data-testid="note-toc-collapsed-active-link"
                >
                  {activeItem?.text || 'Overview'}
                </a>
              </div>
            ) : (
              <div id="note-toc-desktop-body" data-testid="note-toc-desktop-body">
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
              </div>
            )}
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

export const CollapsibleTableOfContents: React.FC<TableOfContentsProps> = (props) => (
  <TableOfContents collapsible={true} mode="collapsible" {...props} />
);

export const AutomatedTableOfContents = TableOfContents;
export default TableOfContents;
