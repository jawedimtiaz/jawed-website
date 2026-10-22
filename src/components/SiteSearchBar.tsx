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

export const SiteSearchBar: React.FC<SiteSearchBarProps> = ({ onNavigated }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<'all' | SiteCategory>('all');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const navigate = useNavigate();

  // Recommendations when query is empty
  const recommendations = useMemo(() => getQuickSearchRecommendations(), []);

  // Search results from aiKnowledgeEngine
  const searchResults = useMemo(() => {
    if (!query.trim()) {
      return {
        all: recommendations,
        guides: recommendations.filter((r) => r.category === 'guide'),
        tools: recommendations.filter((r) => r.category === 'tool'),
        pages: recommendations.filter((r) => r.category === 'page'),
        query: '',
        isPersonal: false,
      };
    }
    return searchSite(query);
  }, [query, recommendations]);

  // Filter by category tab
  const displayedItems = useMemo(() => {
    if (activeCategory === 'guide') return searchResults.guides;
    if (activeCategory === 'tool') return searchResults.tools;
    if (activeCategory === 'page') return searchResults.pages;
    return searchResults.all;
  }, [searchResults, activeCategory]);

  // Keep selectedIndex in bounds
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

  // Global keyboard shortcuts (Cmd+K, Ctrl+K, '/')
  useEffect(() => {
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
    return () => window.removeEventListener('keydown', handleKeyDown);
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
      let targetPath = item.url.replace(/\/+$/, '') || '/';
      // Map /notes/... to /guides/... if desired, or use directly as router supports both
      handleClose();
      if (onNavigated) onNavigated();
      navigate(targetPath);
    },
    [navigate, handleClose, onNavigated]
  );

  // Keyboard navigation within the results list
  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) =>
        displayedItems.length === 0 ? 0 : (prev + 1) % displayedItems.length
      );
      scrollItemIntoView((selectedIndex + 1) % displayedItems.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) =>
        displayedItems.length === 0
          ? 0
          : (prev - 1 + displayedItems.length) % displayedItems.length
      );
      scrollItemIntoView(
        (selectedIndex - 1 + displayedItems.length) % displayedItems.length
      );
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (displayedItems[selectedIndex]) {
        navigateToResult(displayedItems[selectedIndex]);
      }
    }
  };

  const scrollItemIntoView = (index: number) => {
    if (!listRef.current) return;
    const items = listRef.current.querySelectorAll('li');
    if (items[index]) {
      items[index].scrollIntoView({ block: 'nearest' });
    }
  };

  // Helper to highlight matching terms in text
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

  return (
    <div className="site-search-wrapper">
      {/* Search Header Trigger Button */}
      <button
        type="button"
        className="header-search-btn"
        onClick={handleOpen}
        aria-label="Search guides, tools, and pages (Press Ctrl+K or Cmd+K)"
        title="Search site (Ctrl+K or Cmd+K)"
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
        <span className="header-search-placeholder">Search site...</span>
        <kbd className="header-search-kbd" aria-hidden="true">
          <abbr title="Command" style={{ textDecoration: 'none' }}>⌘</abbr>K
        </kbd>
      </button>

      {/* Full-Screen Search Modal Overlay */}
      {isOpen && (
        <div
          className="search-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="Site Search Dialog"
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
                placeholder="Search technical guides, interactive tools, pages..."
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
                All Results ({searchResults.all.length})
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeCategory === 'guide'}
                className={`search-tab ${activeCategory === 'guide' ? 'is-active' : ''}`}
                onClick={() => setActiveCategory('guide')}
              >
                📘 Technical Guides ({searchResults.guides.length})
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
                aria-selected={activeCategory === 'page'}
                className={`search-tab ${activeCategory === 'page' ? 'is-active' : ''}`}
                onClick={() => setActiveCategory('page')}
              >
                📄 Pages ({searchResults.pages.length})
              </button>
            </div>

            {/* Results Container */}
            <div className="search-results-viewport">
              {/* Privacy Guardrail Interception */}
              {searchResults.isPersonal ? (
                <div className="search-guardrail-notice">
                  <div className="search-guardrail-header">
                    <span className="search-guardrail-badge">🔒 Privacy &amp; Support Guardrail</span>
                  </div>
                  <p className="search-guardrail-text">
                    I only share verified professional background, technical documentation, and interactive IT tools here.
                    For personal questions or direct inquiries, please reach out to Jawed directly.
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
                /* Empty State with Quick Suggestion Chips */
                <div className="search-empty-state">
                  <p className="search-empty-title">
                    No results found for &ldquo;<span className="text-accent">{query}</span>&rdquo;
                  </p>
                  <p className="search-empty-sub">
                    Try searching for specific technical terms, diagnostic workflows, or workplace tools:
                  </p>
                  <div className="search-suggestion-chips">
                    {[
                      'macOS',
                      'IT Troubleshooting',
                      'IPv4 Subnet',
                      'Jamf Pro',
                      'Server Rack BTU',
                      'Service Desk Note',
                      'AI Prompt Builder',
                      'Work Experience',
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
                  {!query.trim() && (
                    <div className="search-section-header">
                      <span>✨ Popular Guides, Tools &amp; Pages</span>
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
                      const badgeClass =
                        item.category === 'guide'
                          ? 'badge-guide'
                          : item.category === 'tool'
                          ? 'badge-tool'
                          : 'badge-page';

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
                                {item.category === 'guide'
                                  ? '📘 Guide'
                                  : item.category === 'tool'
                                  ? '🛠️ Tool'
                                  : '📄 Page'}
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
              <div className="search-footer-hints">
                <span className="search-footer-hint">
                  <kbd className="search-footer-kbd">↑</kbd>
                  <kbd className="search-footer-kbd">↓</kbd> Navigate
                </span>
                <span className="search-footer-hint">
                  <kbd className="search-footer-kbd">↵</kbd> Select
                </span>
                <span className="search-footer-hint">
                  <kbd className="search-footer-kbd">esc</kbd> Close
                </span>
              </div>
              <div className="search-footer-powered">
                <span>Powered by verified on-site AI knowledge index</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
