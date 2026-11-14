import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  NOTE_BOOKMARKS_STORAGE_KEY,
  NOTE_BOOKMARKS_EVENT_NAME,
  getBookmarkedNotes,
  saveBookmarkedNotes,
  isNoteBookmarked,
  addBookmarkedNote,
  removeBookmarkedNote,
  toggleBookmarkedNote,
  clearBookmarkedNotes,
  filterBookmarkedNotes,
  type BookmarkedNoteItem,
  type BookmarkInput,
  type BookmarkStorageAdapter,
  type QuickActionsTab,
} from '../utils/noteBookmarks';

export {
  NOTE_BOOKMARKS_STORAGE_KEY,
  NOTE_BOOKMARKS_EVENT_NAME,
  getBookmarkedNotes,
  saveBookmarkedNotes,
  isNoteBookmarked,
  addBookmarkedNote,
  removeBookmarkedNote,
  toggleBookmarkedNote,
  clearBookmarkedNotes,
  filterBookmarkedNotes,
  type BookmarkedNoteItem,
  type BookmarkInput,
  type BookmarkStorageAdapter,
  type QuickActionsTab,
};

export interface QuickActionToolItem {
  id: string;
  title: string;
  route: string;
  description: string;
  category: string;
  shortcut: string;
  badge: string;
  icon: string;
}

export const QUICK_ACTIONS_TABS: Array<{ id: QuickActionsTab; label: string; icon: string }> = [
  { id: 'tools', label: 'Tools', icon: '⚡' },
  { id: 'bookmarks', label: 'Bookmarks', icon: '🔖' },
];

/**
 * Frequently used engineering and diagnostic tools available for one-click launch
 * from the Quick Actions floating menu (`Ctrl+K` / `Cmd+K`).
 */
export const QUICK_ACTION_TOOLS: QuickActionToolItem[] = [
  {
    id: 'ipv4-subnet-calculator',
    title: 'IPv4 Subnet Calculator',
    route: '/tools/ipv4-subnet-calculator',
    description: 'Calculate CIDR blocks, subnet masks, broadcast addresses, and usable host ranges.',
    category: 'Networking',
    shortcut: 'Alt+1',
    badge: 'Networking',
    icon: '🌐',
  },
  {
    id: 'ai-prompt-builder',
    title: 'AI Prompt Builder',
    route: '/tools/ai-prompt-builder',
    description: 'Build structured system prompts and context blocks for engineering workflows.',
    category: 'AI & Automation',
    shortcut: 'Alt+P',
    badge: 'AI Tool',
    icon: '✨',
  },
  {
    id: 'it-troubleshooting-assistant',
    title: 'IT Troubleshooting Assistant',
    route: '/tools/it-troubleshooting-assistant',
    description: 'Step-by-step diagnostic workflows for network, macOS, Windows, and server incidents.',
    category: 'Diagnostics',
    shortcut: 'Alt+T',
    badge: 'Diagnostics',
    icon: '🛠️',
  },
  {
    id: 'cable-length-poe-budget-checker',
    title: 'Cable Length & PoE Budget Checker',
    route: '/tools/cable-length-poe-budget-checker',
    description: 'Validate Cat5e/Cat6/Cat6A cable distance limits and 802.3af/at/bt PoE power budgets.',
    category: 'Infrastructure',
    shortcut: 'Alt+2',
    badge: 'PoE / Cabling',
    icon: '🔌',
  },
  {
    id: 'server-rack-power-btu-calculator',
    title: 'Server Rack Power & BTU Calculator',
    route: '/tools/server-rack-power-btu-calculator',
    description: 'Estimate rack kVA load, UPS runtime capacity, and thermal BTU/hr cooling requirements.',
    category: 'Data Center',
    shortcut: 'Alt+3',
    badge: 'Power / Thermal',
    icon: '⚡',
  },
  {
    id: 'service-desk-note-formatter',
    title: 'Service Desk Note Formatter',
    route: '/tools/service-desk-note-formatter',
    description: 'Format structured incident triage notes and escalation handoff summaries.',
    category: 'IT Operations',
    shortcut: 'Alt+4',
    badge: 'ITSM',
    icon: '📋',
  },
];

export const QUICK_ACTIONS_SHORTCUT_LABEL = 'Ctrl+K / Cmd+K';

/**
 * Checks whether a keyboard event matches the Quick Actions shortcut (`Ctrl+K` or `Cmd+K`).
 */
export function isQuickActionsShortcutEvent(event: {
  key?: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
}): boolean {
  if (!event) return false;
  const key = String(event.key || '').toLowerCase();
  const hasMod = Boolean(event.ctrlKey || event.metaKey);
  return hasMod && !event.altKey && key === 'k';
}

/**
 * Filters Quick Action tools by search query across title, description, category, badge, and route.
 */
export function filterQuickActionTools(
  queryOrItems: string | QuickActionToolItem[],
  itemsOrQuery: QuickActionToolItem[] | string = QUICK_ACTION_TOOLS
): QuickActionToolItem[] {
  const query = Array.isArray(queryOrItems)
    ? typeof itemsOrQuery === 'string'
      ? itemsOrQuery
      : ''
    : queryOrItems;
  const items = Array.isArray(queryOrItems)
    ? queryOrItems
    : Array.isArray(itemsOrQuery)
      ? itemsOrQuery
      : QUICK_ACTION_TOOLS;

  const cleanQuery = String(query || '').trim().toLowerCase();
  if (!cleanQuery) return items;

  return items.filter((item) => {
    return (
      item.title.toLowerCase().includes(cleanQuery) ||
      item.description.toLowerCase().includes(cleanQuery) ||
      item.category.toLowerCase().includes(cleanQuery) ||
      item.badge.toLowerCase().includes(cleanQuery) ||
      item.route.toLowerCase().includes(cleanQuery) ||
      item.id.toLowerCase().includes(cleanQuery)
    );
  });
}

/**
 * Executes a one-click Quick Action tool navigation by tool item, ID, title, or route.
 */
export function executeQuickActionToolSelect(
  toolOrIdentifier: string | QuickActionToolItem,
  navigateFn?: (route: string) => void,
  itemsOrOnClose: QuickActionToolItem[] | (() => void) = QUICK_ACTION_TOOLS
): QuickActionToolItem | null {
  const items = Array.isArray(itemsOrOnClose) ? itemsOrOnClose : QUICK_ACTION_TOOLS;
  const onClose = typeof itemsOrOnClose === 'function' ? itemsOrOnClose : undefined;

  const matched =
    typeof toolOrIdentifier === 'object' && toolOrIdentifier !== null
      ? toolOrIdentifier
      : items.find(
          (item) =>
            item.id === toolOrIdentifier ||
            item.route === toolOrIdentifier ||
            item.title.toLowerCase() === String(toolOrIdentifier).toLowerCase()
        ) || null;

  if (!matched) return null;

  if (typeof navigateFn === 'function') {
    navigateFn(matched.route);
  }

  if (typeof onClose === 'function') {
    onClose();
  }

  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    window.dispatchEvent(
      new CustomEvent('quick-action-executed', {
        detail: matched,
      })
    );
  }

  return matched;
}

/**
 * Executes one-click navigation to a bookmarked technical guide from the Bookmarks tab.
 */
export function executeQuickActionBookmarkSelect(
  bookmarkOrSlug: string | BookmarkedNoteItem,
  navigateFn?: (route: string) => void,
  bookmarksOrOnClose?: BookmarkedNoteItem[] | (() => void)
): BookmarkedNoteItem | null {
  const bookmarks = Array.isArray(bookmarksOrOnClose)
    ? bookmarksOrOnClose
    : getBookmarkedNotes();
  const onClose =
    typeof bookmarksOrOnClose === 'function' ? bookmarksOrOnClose : undefined;

  const matched =
    typeof bookmarkOrSlug === 'object' && bookmarkOrSlug !== null
      ? bookmarkOrSlug
      : bookmarks.find(
          (item) =>
            item.slug === bookmarkOrSlug ||
            item.route === bookmarkOrSlug ||
            item.title.toLowerCase() === String(bookmarkOrSlug).toLowerCase()
        ) || null;

  if (!matched) return null;

  const targetRoute = matched.route || `/notes/${matched.slug}`;

  if (typeof navigateFn === 'function') {
    navigateFn(targetRoute);
  }

  if (typeof onClose === 'function') {
    onClose();
  }

  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    window.dispatchEvent(
      new CustomEvent('quick-action-bookmark-selected', {
        detail: matched,
      })
    );
  }

  return matched;
}

export function openQuickActionsMenu(tab?: QuickActionsTab): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('open-quick-actions', { detail: { tab } })
    );
  }
}

export function closeQuickActionsMenu(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('close-quick-actions'));
  }
}

export function toggleQuickActionsMenu(tab?: QuickActionsTab): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('toggle-quick-actions', { detail: { tab } })
    );
  }
}

export interface QuickActionsMenuProps {
  /** Optional custom list of quick action tools (defaults to QUICK_ACTION_TOOLS) */
  tools?: QuickActionToolItem[];
  /** Optional custom list of bookmarked technical guides (defaults to localStorage bookmarks) */
  bookmarks?: BookmarkedNoteItem[];
  /** Whether the floating menu starts open on initial render */
  defaultOpen?: boolean;
  /** Initial active tab ('tools' or 'bookmarks') */
  defaultTab?: QuickActionsTab;
  /** Controlled active tab */
  activeTab?: QuickActionsTab;
  /** Callback when active tab changes */
  onTabChange?: (tab: QuickActionsTab) => void;
  /** Controlled open state */
  isOpen?: boolean;
  /** Callback when open state changes */
  onOpenChange?: (open: boolean) => void;
  /** Callback invoked when a tool is clicked/selected */
  onSelectTool?: (tool: QuickActionToolItem) => void;
  /** Callback invoked when a bookmarked technical guide is clicked/selected */
  onSelectBookmark?: (bookmark: BookmarkedNoteItem) => void;
  /** Whether to listen to global Ctrl+K / Cmd+K keyboard shortcut (defaults to true) */
  enableShortcut?: boolean;
}

export const QuickActionsMenu: React.FC<QuickActionsMenuProps> = ({
  tools = QUICK_ACTION_TOOLS,
  bookmarks: controlledBookmarks,
  defaultOpen = false,
  defaultTab = 'tools',
  activeTab: controlledTab,
  onTabChange,
  isOpen: controlledOpen,
  onOpenChange,
  onSelectTool,
  onSelectBookmark,
  enableShortcut = true,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [internalOpen, setInternalOpen] = useState<boolean>(defaultOpen);
  const [internalTab, setInternalTab] = useState<QuickActionsTab>(defaultTab);
  const [storedBookmarks, setStoredBookmarks] = useState<BookmarkedNoteItem[]>(() =>
    getBookmarkedNotes()
  );
  const [filterQuery, setFilterQuery] = useState<string>('');
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const isMenuOpen = controlledOpen ?? internalOpen;
  const currentTab = controlledTab ?? internalTab;
  const activeBookmarks = controlledBookmarks ?? storedBookmarks;

  const setActiveTab = useCallback(
    (nextTab: QuickActionsTab) => {
      if (controlledTab === undefined) {
        setInternalTab(nextTab);
      }
      onTabChange?.(nextTab);
      setActiveIndex(0);
    },
    [controlledTab, onTabChange]
  );

  const setMenuOpen = useCallback(
    (next: boolean | ((prev: boolean) => boolean)) => {
      const resolved = typeof next === 'function' ? next(isMenuOpen) : next;
      if (controlledOpen === undefined) {
        setInternalOpen(resolved);
      }
      onOpenChange?.(resolved);
      if (resolved) {
        setStoredBookmarks(getBookmarkedNotes());
      } else {
        setFilterQuery('');
        setActiveIndex(0);
      }
    },
    [controlledOpen, isMenuOpen, onOpenChange]
  );

  // Sync saved bookmarks whenever localStorage or custom bookmark events fire
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const refreshBookmarks = () => {
      setStoredBookmarks(getBookmarkedNotes());
    };

    window.addEventListener(NOTE_BOOKMARKS_EVENT_NAME, refreshBookmarks);
    window.addEventListener('storage', refreshBookmarks);

    return () => {
      window.removeEventListener(NOTE_BOOKMARKS_EVENT_NAME, refreshBookmarks);
      window.removeEventListener('storage', refreshBookmarks);
    };
  }, []);

  const filteredTools = useMemo(
    () => filterQuickActionTools(filterQuery, tools),
    [filterQuery, tools]
  );

  const filteredBookmarks = useMemo(
    () => filterBookmarkedNotes(filterQuery, activeBookmarks),
    [filterQuery, activeBookmarks]
  );

  const currentListLength =
    currentTab === 'bookmarks' ? filteredBookmarks.length : filteredTools.length;

  // Close menu automatically when route changes
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname, setMenuOpen]);

  // Focus filter input when menu opens
  useEffect(() => {
    if (!isMenuOpen) return;
    const timer = setTimeout(() => {
      searchInputRef.current?.focus();
    }, 20);
    return () => clearTimeout(timer);
  }, [isMenuOpen]);

  // Listen to Ctrl+K / Cmd+K keyboard shortcut and custom window events
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (enableShortcut && isQuickActionsShortcutEvent(event)) {
        event.preventDefault();
        setMenuOpen((prev) => !prev);
        return;
      }

      if (!isMenuOpen) return;

      if (event.key === 'Escape') {
        event.preventDefault();
        setMenuOpen(false);
      } else if (event.key === 'ArrowDown') {
        event.preventDefault();
        setActiveIndex((prev) =>
          currentListLength > 0 ? (prev + 1) % currentListLength : 0
        );
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        setActiveIndex((prev) =>
          currentListLength > 0
            ? (prev - 1 + currentListLength) % currentListLength
            : 0
        );
      } else if (event.key === 'Enter') {
        if (currentTab === 'tools' && filteredTools[activeIndex]) {
          event.preventDefault();
          const target = filteredTools[activeIndex];
          executeQuickActionToolSelect(target, navigate, tools);
          onSelectTool?.(target);
          setMenuOpen(false);
        } else if (currentTab === 'bookmarks' && filteredBookmarks[activeIndex]) {
          event.preventDefault();
          const targetBookmark = filteredBookmarks[activeIndex];
          executeQuickActionBookmarkSelect(targetBookmark, navigate, activeBookmarks);
          onSelectBookmark?.(targetBookmark);
          setMenuOpen(false);
        }
      }
    };

    const handleOpenEvent = (event: Event) => {
      const customEvt = event as CustomEvent<{ tab?: QuickActionsTab }>;
      if (customEvt.detail?.tab) {
        setActiveTab(customEvt.detail.tab);
      }
      setMenuOpen(true);
    };
    const handleCloseEvent = () => setMenuOpen(false);
    const handleToggleEvent = (event: Event) => {
      const customEvt = event as CustomEvent<{ tab?: QuickActionsTab }>;
      if (customEvt.detail?.tab) {
        setActiveTab(customEvt.detail.tab);
      }
      setMenuOpen((prev) => !prev);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('open-quick-actions', handleOpenEvent);
    window.addEventListener('close-quick-actions', handleCloseEvent);
    window.addEventListener('toggle-quick-actions', handleToggleEvent);
    window.addEventListener('close-all-modals', handleCloseEvent);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('open-quick-actions', handleOpenEvent);
      window.removeEventListener('close-quick-actions', handleCloseEvent);
      window.removeEventListener('toggle-quick-actions', handleToggleEvent);
      window.removeEventListener('close-all-modals', handleCloseEvent);
    };
  }, [
    enableShortcut,
    isMenuOpen,
    currentTab,
    currentListLength,
    filteredTools,
    filteredBookmarks,
    activeIndex,
    navigate,
    tools,
    activeBookmarks,
    onSelectTool,
    onSelectBookmark,
    setMenuOpen,
    setActiveTab,
  ]);

  const handleSelectTool = (tool: QuickActionToolItem) => {
    executeQuickActionToolSelect(tool, navigate, tools);
    onSelectTool?.(tool);
    setMenuOpen(false);
  };

  const handleSelectBookmark = (bookmark: BookmarkedNoteItem) => {
    executeQuickActionBookmarkSelect(bookmark, navigate, activeBookmarks);
    onSelectBookmark?.(bookmark);
    setMenuOpen(false);
  };

  const handleRemoveBookmark = (
    event: React.MouseEvent<HTMLButtonElement>,
    slug: string
  ) => {
    event.preventDefault();
    event.stopPropagation();
    const updated = removeBookmarkedNote(slug);
    setStoredBookmarks(updated);
  };

  return (
    <div
      ref={containerRef}
      className="quick-actions-floating-menu no-print"
      data-testid="quick-actions-floating-menu"
      data-open={isMenuOpen}
      data-active-tab={currentTab}
      data-shortcut="Ctrl+K"
    >
      {isMenuOpen && (
        <div
          id="quick-actions-floating-panel"
          className="quick-actions-floating-panel"
          data-testid="quick-actions-floating-panel"
          role="dialog"
          aria-modal="false"
          aria-label="Quick Actions — Tools and Bookmarked Technical Guides"
        >
          <div className="quick-actions-header">
            <div className="quick-actions-title-group">
              <span aria-hidden="true" className="quick-actions-bolt">
                ⚡
              </span>
              <span className="quick-actions-title">Quick Actions</span>
              <span className="quick-actions-badge">
                {currentTab === 'bookmarks'
                  ? `${filteredBookmarks.length} saved`
                  : `${filteredTools.length} tools`}
              </span>
            </div>
            <div className="quick-actions-header-controls">
              <kbd className="quick-actions-kbd" aria-label="Control K or Command K">
                ⌘K / Ctrl+K
              </kbd>
              <button
                type="button"
                className="quick-actions-close-btn"
                data-testid="quick-actions-close-btn"
                onClick={() => setMenuOpen(false)}
                aria-label="Close Quick Actions menu"
                title="Close (Esc)"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Quick Actions Tabs: Tools & Bookmarks */}
          <div
            className="quick-actions-tabs"
            role="tablist"
            aria-label="Quick Actions sections"
            data-testid="quick-actions-tabs"
          >
            <button
              type="button"
              role="tab"
              id="quick-actions-tab-tools"
              aria-selected={currentTab === 'tools'}
              aria-controls="quick-actions-panel-tools"
              className={`quick-actions-tab-btn${currentTab === 'tools' ? ' is-active' : ''}`}
              data-testid="quick-actions-tab-tools"
              onClick={() => setActiveTab('tools')}
            >
              <span aria-hidden="true">⚡</span>
              <span>Tools</span>
              <span className="quick-actions-tab-count">{tools.length}</span>
            </button>
            <button
              type="button"
              role="tab"
              id="quick-actions-tab-bookmarks"
              aria-selected={currentTab === 'bookmarks'}
              aria-controls="quick-actions-panel-bookmarks"
              className={`quick-actions-tab-btn${currentTab === 'bookmarks' ? ' is-active' : ''}`}
              data-testid="quick-actions-tab-bookmarks"
              onClick={() => setActiveTab('bookmarks')}
            >
              <span aria-hidden="true">🔖</span>
              <span>Bookmarks</span>
              <span
                className="quick-actions-tab-count"
                data-testid="quick-actions-bookmarks-count"
              >
                {activeBookmarks.length}
              </span>
            </button>
          </div>

          <div className="quick-actions-search-bar">
            <input
              ref={searchInputRef}
              type="search"
              value={filterQuery}
              onChange={(e) => {
                setFilterQuery(e.target.value);
                setActiveIndex(0);
              }}
              placeholder={
                currentTab === 'bookmarks'
                  ? 'Filter bookmarked technical guides...'
                  : 'Filter quick actions (e.g., IPv4 Subnet Calculator, AI Prompt Builder)...'
              }
              className="quick-actions-search-input"
              data-testid="quick-actions-search-input"
              aria-label={
                currentTab === 'bookmarks'
                  ? 'Filter bookmarked technical guides'
                  : 'Filter Quick Actions tools'
              }
            />
          </div>

          {currentTab === 'tools' ? (
            <div
              id="quick-actions-panel-tools"
              className="quick-actions-list"
              role="tabpanel"
              aria-labelledby="quick-actions-tab-tools"
              data-testid="quick-actions-tool-list"
            >
              {filteredTools.map((tool, index) => {
                const isSelected = index === activeIndex;
                return (
                  <button
                    key={tool.id}
                    type="button"
                    role="menuitem"
                    className={`quick-action-tool-btn${isSelected ? ' is-selected' : ''}`}
                    data-testid={`quick-action-tool-${tool.id}`}
                    data-tool-id={tool.id}
                    data-tool-route={tool.route}
                    onClick={() => handleSelectTool(tool)}
                    onMouseEnter={() => setActiveIndex(index)}
                    title={`${tool.title} — ${tool.description}`}
                  >
                    <span className="quick-action-tool-icon" aria-hidden="true">
                      {tool.icon}
                    </span>
                    <span className="quick-action-tool-content">
                      <span className="quick-action-tool-top">
                        <span className="quick-action-tool-title">{tool.title}</span>
                        <span className="quick-action-tool-category">{tool.badge}</span>
                      </span>
                      <span className="quick-action-tool-desc">{tool.description}</span>
                    </span>
                    <kbd className="quick-action-tool-shortcut" aria-hidden="true">
                      {tool.shortcut}
                    </kbd>
                  </button>
                );
              })}

              {filteredTools.length === 0 && (
                <div
                  className="quick-actions-empty"
                  data-testid="quick-actions-empty"
                >
                  No matching quick action tools found for &ldquo;{filterQuery}&rdquo;.
                </div>
              )}
            </div>
          ) : (
            <div
              id="quick-actions-panel-bookmarks"
              className="quick-actions-list quick-actions-bookmarks-list"
              role="tabpanel"
              aria-labelledby="quick-actions-tab-bookmarks"
              data-testid="quick-actions-bookmarks-list"
            >
              {filteredBookmarks.map((bookmark, index) => {
                const isSelected = index === activeIndex;
                return (
                  <div
                    key={bookmark.slug}
                    className={`quick-action-bookmark-row${isSelected ? ' is-selected' : ''}`}
                    data-testid={`quick-action-bookmark-row-${bookmark.slug}`}
                    onMouseEnter={() => setActiveIndex(index)}
                  >
                    <button
                      type="button"
                      className={`quick-action-tool-btn quick-action-bookmark-btn${isSelected ? ' is-selected' : ''}`}
                      data-testid={`quick-action-bookmark-${bookmark.slug}`}
                      data-bookmark-slug={bookmark.slug}
                      data-bookmark-route={bookmark.route}
                      onClick={() => handleSelectBookmark(bookmark)}
                      title={`Open saved guide: ${bookmark.title}`}
                    >
                      <span className="quick-action-tool-icon" aria-hidden="true">
                        🔖
                      </span>
                      <span className="quick-action-tool-content">
                        <span className="quick-action-tool-top">
                          <span className="quick-action-tool-title">{bookmark.title}</span>
                          <span className="quick-action-tool-category">
                            {bookmark.category || 'Technical Guide'}
                          </span>
                        </span>
                        {bookmark.description && (
                          <span className="quick-action-tool-desc">
                            {bookmark.description}
                          </span>
                        )}
                      </span>
                    </button>
                    <button
                      type="button"
                      className="quick-action-bookmark-remove-btn"
                      data-testid={`quick-action-bookmark-remove-${bookmark.slug}`}
                      onClick={(e) => handleRemoveBookmark(e, bookmark.slug)}
                      aria-label={`Remove bookmark for "${bookmark.title}"`}
                      title="Remove bookmark"
                    >
                      ✕
                    </button>
                  </div>
                );
              })}

              {filteredBookmarks.length === 0 && (
                <div
                  className="quick-actions-empty"
                  data-testid="quick-actions-bookmarks-empty"
                >
                  {activeBookmarks.length === 0
                    ? 'No saved technical guides yet. Click the "Bookmark" button on any technical note or guide to save it here for quick access.'
                    : `No bookmarked guides match "${filterQuery}".`}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <button
        type="button"
        className={`quick-actions-floating-trigger${isMenuOpen ? ' is-open' : ''}`}
        data-testid="quick-actions-floating-trigger"
        onClick={() => setMenuOpen((prev) => !prev)}
        aria-expanded={isMenuOpen}
        aria-controls="quick-actions-floating-panel"
        aria-keyshortcuts="Control+K Meta+K"
        aria-label="Toggle Quick Actions menu (Ctrl+K or Cmd+K)"
        title="Quick Actions — One-click access to IPv4 Subnet Calculator, AI Prompt Builder & saved Bookmarks (Ctrl+K / Cmd+K)"
      >
        <span aria-hidden="true" className="quick-actions-trigger-icon">
          ⚡
        </span>
        <span className="quick-actions-trigger-label">Quick Actions</span>
        {activeBookmarks.length > 0 && (
          <span
            className="quick-actions-trigger-bookmark-badge"
            data-testid="quick-actions-trigger-bookmark-count"
            title={`${activeBookmarks.length} saved technical guide${activeBookmarks.length === 1 ? '' : 's'}`}
          >
            🔖 {activeBookmarks.length}
          </span>
        )}
        <kbd className="quick-actions-trigger-kbd" aria-hidden="true">
          ⌘K
        </kbd>
      </button>
    </div>
  );
};

export const QuickActionsFloatingMenu = QuickActionsMenu;
export default QuickActionsMenu;
