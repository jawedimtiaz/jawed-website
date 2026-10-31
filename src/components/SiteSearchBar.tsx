import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  searchSite,
  getQuickSearchRecommendations,
  SiteSearchResult,
  SiteCategory,
} from '../services/aiKnowledgeEngine';

interface SiteSearchBarProps {
  onNavigated?: () => void;
}

const POPULAR_SEARCH_CATEGORIES: {
  label: string;
  badge: string;
  url: string;
  query: string;
  description: string;
}[] = [
  {
    label: 'IPv4 Calculator',
    badge: 'Networking',
    url: '/tools/ipv4-subnet-calculator',
    query: 'IPv4 Subnet Calculator',
    description: 'CIDR masks, host ranges & broadcast addresses',
  },
  {
    label: 'Resume Review',
    badge: 'Career & ATS',
    url: '/tools/career-match-resume-review',
    query: 'Resume Review',
    description: 'Match resume keywords against IT job descriptions',
  },
  {
    label: 'IT Field Guides',
    badge: 'Documentation',
    url: '/guides',
    query: 'IT Field Guides',
    description: 'SOPs for cabling, Windows, macOS & network triage',
  },
  {
    label: 'Cable Length & PoE',
    badge: 'Hardware',
    url: '/tools/cable-length-poe-budget-checker',
    query: 'Cable Length & PoE',
    description: 'Verify Cat5e/6/6a runs & switch PoE power budgets',
  },
  {
    label: 'Service Desk Notes',
    badge: 'ITSM',
    url: '/tools/service-desk-note-formatter',
    query: 'Service Desk Note Formatter',
    description: 'Format troubleshooting notes into clean ticket updates',
  },
  {
    label: 'AI Prompt Builder',
    badge: 'AI Tool',
    url: '/tools/ai-prompt-builder',
    query: 'AI Prompt Builder',
    description: 'Craft high-context technical & support prompts',
  },
];

export const SiteSearchBar: React.FC<SiteSearchBarProps> = ({ onNavigated }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<'all' | SiteCategory>('all');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const navigate = useNavigate();

  // Search History (localStorage last 5 queries)
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('jawed_site_recent_searches_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed.slice(0, 5);
      }
    } catch {}
    return [];
  });

  const addRecentSearch = useCallback((searchQuery: string) => {
    const trimmed = searchQuery.trim();
    if (!trimmed || trimmed.length < 2) return;
    setRecentSearches((prev) => {
      const filtered = prev.filter((q) => q.toLowerCase() !== trimmed.toLowerCase());
      const next = [trimmed, ...filtered].slice(0, 5);
      try {
        localStorage.setItem('jawed_site_recent_searches_v1', JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  const clearRecentSearches = useCallback(() => {
    setRecentSearches([]);
    try {
      localStorage.removeItem('jawed_site_recent_searches_v1');
    } catch {}
  }, []);

  // Recommendations when query is empty
  const recommendations = useMemo(() => getQuickSearchRecommendations(), []);

  // Search results from aiKnowledgeEngine
  const searchResults = useMemo(() => {
    if (!query.trim()) {
      return {
        all: recommendations,
        tools: recommendations.filter((r) => r.category === 'tool'),
        guides: recommendations.filter((r) => r.category === 'guide'),
        blogs: recommendations.filter((r) => r.category === 'blog'),
        pages: recommendations.filter((r) => r.category === 'page'),
        query: '',
        isPersonal: false,
      };
    }
    return searchSite(query);
  }, [query, recommendations]);

  // Filter by category tab
  const displayedItems = useMemo(() => {
    if (activeCategory === 'tool') return searchResults.tools;
    if (activeCategory === 'guide') return searchResults.guides;
    if (activeCategory === 'blog') return searchResults.blogs;
    if (activeCategory === 'page') return searchResults.pages;
    return searchResults.all;
  }, [searchResults, activeCategory]);

  // Reset selectedIndex on query or tab change
  useEffect(() => {
    setSelectedIndex(0);
  }, [query, activeCategory]);

  // Open modal handler
  const handleOpen = useCallback(() => {
    setIsOpen(true);
    setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 50);
  }, []);

  // Close modal handler
  const handleClose = useCallback(() => {
    setIsOpen(false);
    setQuery('');
    setActiveCategory('all');
  }, []);

  // Global keyboard shortcuts & custom event listeners (Cmd+K, Ctrl+K, '/', Esc)
  useEffect(() => {
    const handleToggleEvent = () => {
      if (isOpen) {
        handleClose();
      } else {
        handleOpen();
      }
    };

    const handleOpenEvent = () => {
      handleOpen();
    };

    const handleCloseEvent = () => {
      if (isOpen) {
        handleClose();
      }
    };

    window.addEventListener('toggle-search-modal', handleToggleEvent);
    window.addEventListener('open-search-modal', handleOpenEvent);
    window.addEventListener('close-all-modals', handleCloseEvent);

    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+K or Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) {
          handleClose();
        } else {
          handleOpen();
        }
        return;
      }

      // Forward slash '/' when not typing in an editable field
      if (
        e.key === '/' &&
        !isOpen &&
        !['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)
      ) {
        e.preventDefault();
        handleOpen();
        return;
      }

      // Escape to close
      if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        handleClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('toggle-search-modal', handleToggleEvent);
      window.removeEventListener('open-search-modal', handleOpenEvent);
      window.removeEventListener('close-all-modals', handleCloseEvent);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, handleOpen, handleClose]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  // Normalize URL for React Router navigation
  const navigateToResult = useCallback(
    (item: SiteSearchResult) => {
      if (query.trim()) {
        addRecentSearch(query);
      }
      let targetPath = item.url.replace(/\/+$/, '') || '/';
      handleClose();
      if (onNavigated) onNavigated();
      navigate(targetPath);
    },
    [navigate, handleClose, onNavigated, query, addRecentSearch]
  );

  const scrollItemIntoView = (index: number) => {
    if (!listRef.current) return;
    const items = listRef.current.querySelectorAll('li');
    if (items[index]) {
      items[index].scrollIntoView({ block: 'nearest' });
    }
  };

  // Keyboard navigation within the results list
  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => {
        const next = displayedItems.length === 0 ? 0 : (prev + 1) % displayedItems.length;
        scrollItemIntoView(next);
        return next;
      });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => {
        const next =
          displayedItems.length === 0
            ? 0
            : (prev - 1 + displayedItems.length) % displayedItems.length;
        scrollItemIntoView(next);
        return next;
      });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (query.trim()) {
        addRecentSearch(query);
      }
      if (displayedItems[selectedIndex]) {
        navigateToResult(displayedItems[selectedIndex]);
      }
    } else if (e.key === '?' && !query.trim()) {
      e.preventDefault();
      handleClose();
      window.dispatchEvent(new CustomEvent('open-shortcuts-modal'));
    }
  };

  // Highlight matching terms in text
  const highlightMatch = (text: string, term: string) => {
    if (!term || !term.trim()) return text;
    const words = term
      .trim()
      .split(/[^a-z0-9]+/i)
      .filter((w) => w.length >= 2);
    if (words.length === 0) return text;

    try {
      const pattern = new RegExp(`(${words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');
      const parts = text.split(pattern);
      return parts.map((part, i) =>
        words.some((w) => w.toLowerCase() === part.toLowerCase()) ? (
          <mark key={i} className="search-highlight">
            {part}
          </mark>
        ) : (
          part
        )
      );
    } catch {
      return text;
    }
  };

  const getCategoryBadgeClass = (category: SiteCategory) => {
    switch (category) {
      case 'tool':
        return 'badge-tool';
      case 'guide':
        return 'badge-guide';
      case 'blog':
        return 'badge-blog';
      default:
        return 'badge-page';
    }
  };

  const getCategoryLabel = (category: SiteCategory) => {
    switch (category) {
      case 'tool':
        return '🛠️ Tool';
      case 'guide':
        return '📘 Field Guide';
      case 'blog':
        return '📰 Blog Post';
      default:
        return '📄 Page';
    }
  };

  return (
    <div className="site-search-wrapper">
      {/* Header Search Trigger Button */}
      <button
        type="button"
        className="header-search-btn"
        onClick={handleOpen}
        aria-label="Global Search - Press Ctrl+K or Cmd+K"
        title="Search tools, field guides & blog posts (Ctrl+K or Cmd+K)"
      >
        <svg
          className="header-search-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <span className="header-search-placeholder">Search tools, guides &amp; blog...</span>
        <kbd className="header-search-kbd" aria-hidden="true">
          <abbr title="Control or Command" style={{ textDecoration: 'none' }}>⌘</abbr>K
        </kbd>
      </button>

      {/* Global Command Palette Modal Overlay */}
      {isOpen && (
        <div
          className="search-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="Global Site Search Command Palette"
          onClick={handleClose}
        >
          <div
            className="search-modal-box"
            onClick={(e) => e.stopPropagation()}
            role="document"
          >
            {/* Search Input Bar */}
            <div className="search-input-row">
              <svg
                className="search-input-icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                ref={inputRef}
                type="search"
                className="search-modal-input"
                placeholder="Search tools, field guides, blog posts, calculators..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleInputKeyDown}
                role="combobox"
                aria-autocomplete="list"
                aria-expanded={displayedItems.length > 0}
                aria-controls="search-results-list"
                autoComplete="off"
                spellCheck="false"
              />
              {query && (
                <button
                  type="button"
                  className="search-clear-btn"
                  onClick={() => {
                    setQuery('');
                    inputRef.current?.focus();
                  }}
                  aria-label="Clear search query"
                >
                  ✕
                </button>
              )}
              <button
                type="button"
                className="search-modal-close-btn"
                onClick={handleClose}
                aria-label="Close search (Esc)"
              >
                <span className="search-esc-badge">ESC</span>
              </button>
            </div>

            {/* Category Filter Tabs */}
            <div className="search-category-tabs" role="tablist" aria-label="Search Categories">
              <button
                type="button"
                role="tab"
                aria-selected={activeCategory === 'all'}
                className={`search-tab ${activeCategory === 'all' ? 'is-active' : ''}`}
                onClick={() => setActiveCategory('all')}
              >
                All ({searchResults.all.length})
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeCategory === 'tool'}
                className={`search-tab ${activeCategory === 'tool' ? 'is-active' : ''}`}
                onClick={() => setActiveCategory('tool')}
              >
                🛠️ Tools ({searchResults.tools.length})
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeCategory === 'guide'}
                className={`search-tab ${activeCategory === 'guide' ? 'is-active' : ''}`}
                onClick={() => setActiveCategory('guide')}
              >
                📘 Field Guides ({searchResults.guides.length})
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeCategory === 'blog'}
                className={`search-tab ${activeCategory === 'blog' ? 'is-active' : ''}`}
                onClick={() => setActiveCategory('blog')}
              >
                📰 Blog ({searchResults.blogs.length})
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeCategory === 'page'}
                className={`search-tab ${activeCategory === 'page' ? 'is-active' : ''}`}
                onClick={() => setActiveCategory('page')}
              >
                📄 Pages ({searchResults.pages.length})
              </button>
            </div>

            {/* Results Container */}
            <div className="search-results-viewport">
              {/* Privacy Guardrail */}
              {searchResults.isPersonal ? (
                <div className="search-guardrail-notice">
                  <div className="search-guardrail-header">
                    <span className="search-guardrail-badge">🔒 Privacy &amp; Support Guardrail</span>
                  </div>
                  <p className="search-guardrail-text">
                    I only share verified professional background, technical field guides, and interactive IT tools here.
                    For personal questions or direct consultation, please contact Jawed directly.
                  </p>
                  <div className="search-guardrail-actions">
                    <button
                      type="button"
                      className="search-guardrail-btn"
                      onClick={() => {
                        handleClose();
                        navigate(`/contact?question=${encodeURIComponent(query.trim())}`);
                      }}
                    >
                      ✉️ Ask Jawed Directly →
                    </button>
                  </div>
                </div>
              ) : displayedItems.length === 0 ? (
                /* Empty State */
                <div className="search-empty-state">
                  <p className="search-empty-title">
                    No results found for &ldquo;<span className="text-accent">{query}</span>&rdquo;
                  </p>
                  <p className="search-empty-sub">
                    Try searching for specific technical terms, diagnostic workflows, or workplace tools:
                  </p>
                  <div className="search-suggestion-chips">
                    {[
                      'IPv4 Calculator',
                      'Resume Review',
                      'IT Field Guides',
                      'Cable Length & PoE',
                      'AI Prompt Builder',
                      'Service Desk Note',
                      'RJ45 T568B',
                      'Audio Transcriber',
                    ].map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        className="search-suggestion-chip"
                        onClick={() => {
                          setQuery(suggestion);
                          inputRef.current?.focus();
                        }}
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                /* Results List */
                <div>
                  {!query.trim() && recentSearches.length > 0 && (
                    <div style={{ marginBottom: '16px' }}>
                      <div className="search-section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>⏱️ Recent Searches</span>
                        <button
                          type="button"
                          onClick={clearRecentSearches}
                          style={{
                            background: 'transparent',
                            border: 0,
                            color: 'var(--muted)',
                            fontSize: '0.75rem',
                            cursor: 'pointer',
                            padding: '2px 6px',
                            borderRadius: '4px',
                          }}
                          title="Clear recent searches"
                        >
                          Clear
                        </button>
                      </div>
                      <div className="search-suggestion-chips">
                        {recentSearches.map((rec) => (
                          <button
                            key={rec}
                            type="button"
                            className="search-suggestion-chip"
                            onClick={() => {
                              setQuery(rec);
                              inputRef.current?.focus();
                            }}
                          >
                            ⏱️ {rec}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {!query.trim() && (
                    <div style={{ marginBottom: '16px' }}>
                      <div className="search-section-header">
                        <span>🔥 Popular Searches</span>
                      </div>
                      <div
                        className="search-suggestion-chips"
                        style={{ padding: '4px 12px 6px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}
                        role="group"
                        aria-label="Popular Searches"
                      >
                        {POPULAR_SEARCH_CATEGORIES.map((item) => (
                          <button
                            key={item.label}
                            type="button"
                            className="search-suggestion-chip"
                            onClick={() => {
                              handleClose();
                              if (onNavigated) onNavigated();
                              navigate(item.url);
                            }}
                            title={`${item.label} — ${item.description}`}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                            }}
                          >
                            <span style={{ fontWeight: 600 }}>{item.label}</span>
                            <span
                              style={{
                                fontSize: '0.7rem',
                                opacity: 0.75,
                                padding: '1px 5px',
                                borderRadius: '4px',
                                background: 'rgba(128, 128, 128, 0.15)',
                              }}
                            >
                              {item.badge}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {!query.trim() && (
                    <div className="search-section-header">
                      <span>✨ Recommended Tools, Field Guides &amp; Blog Posts</span>
                    </div>
                  )}

                  <ul
                    id="search-results-list"
                    ref={listRef}
                    className="search-results-list"
                    role="listbox"
                    aria-label="Search results"
                  >
                    {displayedItems.map((item, index) => {
                      const isSelected = index === selectedIndex;
                      const badgeClass = getCategoryBadgeClass(item.category);
                      const badgeLabel = getCategoryLabel(item.category);

                      return (
                        <li
                          key={item.url + index}
                          role="option"
                          aria-selected={isSelected}
                          className={`search-result-item ${isSelected ? 'is-selected' : ''}`}
                          onClick={() => navigateToResult(item)}
                          onMouseEnter={() => setSelectedIndex(index)}
                        >
                          <div className="search-result-main">
                            <div className="search-result-header">
                              <span className={`search-category-pill ${badgeClass}`}>
                                {badgeLabel}
                              </span>
                              <span className="search-result-title">
                                {highlightMatch(item.title, query)}
                              </span>
                              <span className="search-result-url">
                                {item.url}
                              </span>
                            </div>
                            <p className="search-result-summary">
                              {highlightMatch(item.summary, query)}
                            </p>
                          </div>
                          <div className="search-result-enter-hint" aria-hidden="true">
                            ↵
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>

            {/* Modal Footer with Keyboard Shortcuts */}
            <div className="search-modal-footer">
              <div className="search-footer-hints" style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
                <span className="search-footer-hint">
                  Press <kbd className="search-footer-kbd">⌘K</kbd> or <kbd className="search-footer-kbd">/</kbd> to search
                </span>
                <span className="search-footer-hint">
                  <kbd className="search-footer-kbd">↑ ↓</kbd> to navigate
                </span>
                <span className="search-footer-hint">
                  <kbd className="search-footer-kbd">↵</kbd> to select
                </span>
                <span className="search-footer-hint">
                  <kbd className="search-footer-kbd">ESC</kbd> to close
                </span>
              </div>
              <div className="search-footer-powered">
                <button
                  type="button"
                  onClick={() => {
                    handleClose();
                    window.dispatchEvent(new CustomEvent('open-shortcuts-modal'));
                  }}
                  title="Open keyboard shortcut cheatsheet"
                  style={{
                    background: 'transparent',
                    border: 0,
                    color: 'inherit',
                    fontSize: 'inherit',
                    cursor: 'pointer',
                    padding: 0,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <span className="search-footer-hint">
                    Press <kbd className="search-footer-kbd">?</kbd> for all shortcuts
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
