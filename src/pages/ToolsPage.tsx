import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Search, Share2, Check } from 'lucide-react';
import { Breadcrumb } from '../components/Breadcrumb';
import { SocialShareBar } from '../components/SocialShareBar';
import { PrintableBadge } from '../components/common/PrintableBadge';
import {
  ShareToolLinkButton,
  buildToolConfigurationDeepLink,
  getSavedToolConfigurationState,
} from '../components/common/ShareToolLinkButton';
import {
  TOOLS,
  TOOL_CATEGORIES,
  type ToolItem,
  type ToolCategoryId,
  type BaseToolCategoryId,
  type BaseToolCategoryLabel,
  determineToolCategoryId,
  determineToolCategory,
} from '../data/toolsData';

export {
  TOOLS,
  TOOL_CATEGORIES,
  type ToolCategoryId,
  type ToolItem,
  ShareToolLinkButton,
  buildToolConfigurationDeepLink,
  getSavedToolConfigurationState,
};

export interface SearchableTool extends ToolItem {
  resolvedCategory: BaseToolCategoryId;
  resolvedCategoryLabel: BaseToolCategoryLabel;
  searchString: string;
}

const VALID_CATEGORY_IDS = new Set<ToolCategoryId>(['all', 'it', 'career', 'finance', 'ai']);

/**
 * Builds a shareable URL encoding the currently active search query and category filter on `/tools`.
 */
export function buildToolsFilterShareUrl(
  baseUrl: string = 'https://jawed.co.in/tools',
  searchTerm: string = '',
  activeCategory: ToolCategoryId = 'all'
): string {
  const cleanSearch = (searchTerm || '').trim();
  const cleanCategory: ToolCategoryId = VALID_CATEGORY_IDS.has(activeCategory)
    ? activeCategory
    : 'all';

  try {
    const isAbsolute = /^https?:\/\//i.test(baseUrl);
    const parsed = new URL(isAbsolute ? baseUrl : `https://jawed.co.in${baseUrl.startsWith('/') ? '' : '/'}${baseUrl}`);
    parsed.searchParams.delete('q');
    parsed.searchParams.delete('search');
    parsed.searchParams.delete('category');

    if (cleanSearch) {
      parsed.searchParams.set('q', cleanSearch);
    }
    if (cleanCategory !== 'all') {
      parsed.searchParams.set('category', cleanCategory);
    }

    if (!isAbsolute) {
      return `${parsed.pathname}${parsed.search}${parsed.hash}`;
    }
    return parsed.toString();
  } catch {
    const params = new URLSearchParams();
    if (cleanSearch) params.set('q', cleanSearch);
    if (cleanCategory !== 'all') params.set('category', cleanCategory);
    const qs = params.toString();
    const baseWithoutQuery = baseUrl.split('?')[0] || 'https://jawed.co.in/tools';
    return qs ? `${baseWithoutQuery}?${qs}` : baseWithoutQuery;
  }
}

/**
 * Parses `searchTerm` and `activeCategory` from a URL query string (e.g. `?q=subnet&category=it`).
 */
export function parseToolsFilterFromSearch(locationSearch: string): {
  searchTerm: string;
  activeCategory: ToolCategoryId;
} {
  if (!locationSearch) {
    return { searchTerm: '', activeCategory: 'all' };
  }
  const normalized = locationSearch.startsWith('?') ? locationSearch.slice(1) : locationSearch;
  const params = new URLSearchParams(normalized);
  const rawQuery = (params.get('q') ?? params.get('search') ?? '').trim();
  const rawCategory = (params.get('category') ?? 'all').trim().toLowerCase() as ToolCategoryId;
  const activeCategory: ToolCategoryId = VALID_CATEGORY_IDS.has(rawCategory) ? rawCategory : 'all';

  return {
    searchTerm: rawQuery,
    activeCategory,
  };
}

export interface ToolsFilterShareNavigatorLike {
  share?: (data: { title?: string; text?: string; url?: string }) => Promise<void>;
  canShare?: (data: { title?: string; text?: string; url?: string }) => boolean;
  clipboard?: {
    writeText?: (text: string) => Promise<void>;
  };
}

export interface ToolsFilterShareResult {
  ok: boolean;
  url: string;
  method: 'web-share' | 'clipboard' | 'aborted' | 'failed';
  copiedToClipboard: boolean;
}

/**
 * Shares and copies the link to the currently active ToolsPage search or filter configuration
 * using the Web Share API (`navigator.share`) and Clipboard API (`navigator.clipboard.writeText`).
 */
export async function shareToolsFilterConfiguration(
  params: {
    baseUrl?: string;
    searchTerm: string;
    activeCategory: ToolCategoryId;
  },
  navOverride?: ToolsFilterShareNavigatorLike
): Promise<ToolsFilterShareResult> {
  const defaultBaseUrl =
    typeof window !== 'undefined' && window.location?.origin
      ? `${window.location.origin}/tools`
      : 'https://jawed.co.in/tools';
  const shareUrl = buildToolsFilterShareUrl(
    params.baseUrl || defaultBaseUrl,
    params.searchTerm,
    params.activeCategory
  );

  const categoryLabel =
    TOOL_CATEGORIES.find(c => c.id === params.activeCategory)?.label || 'All Tools';
  const cleanSearch = (params.searchTerm || '').trim();
  const shareTitle = cleanSearch
    ? `IT Tools matching "${cleanSearch}" (${categoryLabel}) | Jawed Imtiaz`
    : `${categoryLabel} | Jawed Imtiaz Tools & Calculators`;
  const shareText = cleanSearch
    ? `Filtered IT tools and calculators matching "${cleanSearch}" in ${categoryLabel}.`
    : `Browse interactive ${categoryLabel} utilities on jawed.co.in.`;

  const nav: ToolsFilterShareNavigatorLike | undefined =
    navOverride ??
    (typeof navigator !== 'undefined'
      ? (navigator as unknown as ToolsFilterShareNavigatorLike)
      : undefined);

  let copiedToClipboard = false;
  if (nav?.clipboard && typeof nav.clipboard.writeText === 'function') {
    try {
      await nav.clipboard.writeText(shareUrl);
      copiedToClipboard = true;
    } catch {
      // Ignore clipboard write error if restricted
    }
  } else if (typeof document !== 'undefined' && typeof document.createElement === 'function') {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = shareUrl;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      if (typeof document.execCommand === 'function') {
        copiedToClipboard = Boolean(document.execCommand('copy'));
      }
      document.body.removeChild(textarea);
    } catch {
      // Ignore DOM fallback error
    }
  }

  const shareData = {
    title: shareTitle,
    text: shareText,
    url: shareUrl,
  };

  if (nav && typeof nav.share === 'function') {
    const canShareData = typeof nav.canShare === 'function' ? nav.canShare(shareData) : true;
    if (canShareData) {
      try {
        await nav.share(shareData);
        return {
          ok: true,
          url: shareUrl,
          method: 'web-share',
          copiedToClipboard,
        };
      } catch (err: unknown) {
        if ((err as Error)?.name === 'AbortError') {
          return {
            ok: copiedToClipboard,
            url: shareUrl,
            method: copiedToClipboard ? 'clipboard' : 'aborted',
            copiedToClipboard,
          };
        }
      }
    }
  }

  return {
    ok: copiedToClipboard,
    url: shareUrl,
    method: copiedToClipboard ? 'clipboard' : 'failed',
    copiedToClipboard,
  };
}

/**
 * Checks whether a tool matches a local search query specifically against its name or description
 * (supporting both exact substring and multi-word token matching).
 */
export function matchesToolNameOrDescription(
  tool: Pick<ToolItem, 'name' | 'description'>,
  query: string
): boolean {
  const trimmed = (query || '').trim().toLowerCase();
  if (!trimmed) return true;

  const nameLower = (tool.name || '').toLowerCase();
  const descLower = (tool.description || '').toLowerCase();
  if (nameLower.includes(trimmed) || descLower.includes(trimmed)) {
    return true;
  }

  const combinedNameAndDesc = `${nameLower} ${descLower}`;
  const tokens = trimmed.split(/\s+/).filter(Boolean);
  if (tokens.length > 1) {
    return tokens.every(token => combinedNameAndDesc.includes(token));
  }

  return false;
}

/**
 * Checks whether a tool matches the filter query based on its name or description
 * (with fallback support for category label and keywords).
 */
export function matchesToolSearchQuery(
  tool: Pick<ToolItem, 'name' | 'description' | 'keywords' | 'category'>,
  query: string
): boolean {
  const trimmed = (query || '').trim().toLowerCase();
  if (!trimmed) return true;

  if (matchesToolNameOrDescription(tool, trimmed)) {
    return true;
  }

  const nameLower = (tool.name || '').toLowerCase();
  const descLower = (tool.description || '').toLowerCase();
  const kwLower = (tool.keywords || []).join(' ').toLowerCase();
  const catLower = (tool.category || '').toLowerCase();
  const combined = `${nameLower} ${descLower} ${catLower} ${kwLower}`;

  if (combined.includes(trimmed)) {
    return true;
  }

  // Also support multi-word token matching across name + description + keywords
  const tokens = trimmed.split(/\s+/).filter(Boolean);
  if (tokens.length > 1) {
    return tokens.every(token => combined.includes(token));
  }

  return false;
}

/**
 * Filters the current list of tool cards by local search query (matching tool name or description).
 */
export function filterToolsByLocalSearch<
  T extends Pick<ToolItem, 'name' | 'description' | 'keywords' | 'category'>
>(tools: readonly T[], searchTerm: string): T[] {
  const trimmed = (searchTerm || '').trim();
  if (!trimmed) return [...tools];
  return tools.filter(tool => matchesToolSearchQuery(tool, trimmed));
}

/**
 * Filters a list of tools by search query (name or description) and active category.
 */
export function filterToolsBySearchAndCategory<T extends ToolItem>(
  tools: readonly T[],
  searchTerm: string,
  activeCategory: ToolCategoryId = 'all'
): T[] {
  const categoryFiltered = tools.filter(tool => {
    const resolvedCategory = determineToolCategoryId(tool);
    return activeCategory === 'all' || resolvedCategory === activeCategory;
  });
  return filterToolsByLocalSearch(categoryFiltered, searchTerm);
}

/**
 * Computes a visibility map (tool.id -> boolean) indicating which Tool Cards are shown vs hidden
 * for a given search query and category filter.
 */
export function computeToolVisibilityMap<T extends ToolItem>(
  tools: readonly T[],
  searchTerm: string,
  activeCategory: ToolCategoryId = 'all'
): Record<string, boolean> {
  const map: Record<string, boolean> = {};
  for (const tool of tools) {
    const resolvedCategory = determineToolCategoryId(tool);
    const matchesCategory = activeCategory === 'all' || resolvedCategory === activeCategory;
    const matchesSearch = matchesToolSearchQuery(tool, searchTerm);
    map[tool.id] = matchesCategory && matchesSearch;
  }
  return map;
}

export function highlightToolTextMatch(text: string, query: string): React.ReactNode {
  const trimmed = (query || '').trim();
  if (!trimmed || !text) return text;

  try {
    const tokens = Array.from(
      new Set(
        trimmed
          .split(/\s+/)
          .map(t => t.trim())
          .filter(Boolean)
      )
    ).sort((a, b) => b.length - a.length);

    if (tokens.length === 0) return text;

    const pattern = tokens
      .map(token => token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      .join('|');
    const regex = new RegExp(`(${pattern})`, 'gi');
    const parts = text.split(regex);
    if (parts.length <= 1) return text;

    const lowerTokens = new Set(tokens.map(t => t.toLowerCase()));
    return parts.map((part, idx) =>
      lowerTokens.has(part.toLowerCase()) ? (
        <mark
          key={idx}
          className="search-highlight"
          style={{
            background: 'rgba(56, 189, 248, 0.25)',
            color: 'inherit',
            padding: '0 2px',
            borderRadius: '3px',
          }}
        >
          {part}
        </mark>
      ) : (
        part
      )
    );
  } catch {
    return text;
  }
}

export const ToolsPage: React.FC = () => {
  const initialFilterState = useMemo(() => {
    if (typeof window !== 'undefined' && window.location?.search) {
      return parseToolsFilterFromSearch(window.location.search);
    }
    return { searchTerm: '', activeCategory: 'all' as ToolCategoryId };
  }, []);

  const [activeCategory, setActiveCategory] = useState<ToolCategoryId>(
    initialFilterState.activeCategory
  );
  const [searchTerm, setSearchTerm] = useState<string>(initialFilterState.searchTerm);
  const [isFilterLinkCopied, setIsFilterLinkCopied] = useState<boolean>(false);
  const [sharedFilterUrl, setSharedFilterUrl] = useState<string>('');
  const copyToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copyToastTimerRef.current) {
        clearTimeout(copyToastTimerRef.current);
      }
    };
  }, []);

  // Keep browser URL query string synced with active search/category filter state
  useEffect(() => {
    if (typeof window === 'undefined' || !window.history?.replaceState) return;
    const nextRelativeUrl = buildToolsFilterShareUrl(
      window.location.pathname || '/tools',
      searchTerm,
      activeCategory
    );
    const currentRelative = `${window.location.pathname}${window.location.search}`;
    if (nextRelativeUrl !== currentRelative) {
      window.history.replaceState(null, '', nextRelativeUrl);
    }
  }, [searchTerm, activeCategory]);

  const handleShareFilterConfiguration = async () => {
    const baseUrl =
      typeof window !== 'undefined' && window.location?.origin
        ? `${window.location.origin}/tools`
        : 'https://jawed.co.in/tools';
    const result = await shareToolsFilterConfiguration({
      baseUrl,
      searchTerm,
      activeCategory,
    });
    setSharedFilterUrl(result.url);
    setIsFilterLinkCopied(true);
    if (copyToastTimerRef.current) {
      clearTimeout(copyToastTimerRef.current);
    }
    copyToastTimerRef.current = setTimeout(() => {
      setIsFilterLinkCopied(false);
    }, 2400);
  };

  // Pre-index tools with resolved categories and lowercase search strings once
  const indexedTools = useMemo<SearchableTool[]>(() => {
    return TOOLS.map(tool => {
      const resolvedCategory = determineToolCategoryId(tool);
      const resolvedCategoryLabel = determineToolCategory(tool);
      const kw = (tool.keywords || []).join(' ');
      return {
        ...tool,
        resolvedCategory,
        resolvedCategoryLabel,
        searchString: `${tool.name} ${tool.description} ${resolvedCategoryLabel} ${kw}`.toLowerCase(),
      };
    });
  }, []);

  // Memoized calculation of dynamic category counts synced with active search query
  const categoryCounts = useMemo<Record<ToolCategoryId, number>>(() => {
    const counts: Record<ToolCategoryId, number> = {
      all: 0,
      it: 0,
      career: 0,
      finance: 0,
      ai: 0,
    };

    for (let i = 0; i < indexedTools.length; i++) {
      const tool = indexedTools[i];
      if (matchesToolSearchQuery(tool, searchTerm)) {
        counts.all++;
        counts[tool.resolvedCategory]++;
      }
    }

    return counts;
  }, [indexedTools, searchTerm]);

  // Memoized filtered tool items based on active category and local search query (name or description)
  const filteredTools = useMemo<SearchableTool[]>(() => {
    return filterToolsBySearchAndCategory(indexedTools, searchTerm, activeCategory);
  }, [indexedTools, activeCategory, searchTerm]);

  return (
    <main className="container page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
        <Breadcrumb
          items={[
            { label: 'Home', href: '/' },
            { label: 'Tools' },
          ]}
          style={{ marginBottom: 0 }}
        />
        <SocialShareBar
          title="IT Tools & Calculators | Jawed Imtiaz"
          text="Free, browser-based utilities for IT service desk workflows, resume optimization, career preparation, and personal finance planning."
          url={typeof window !== 'undefined' ? `${window.location.origin}/tools` : 'https://jawed.co.in/tools'}
        />
      </div>

      <p className="eyebrow">Interactive Utilities</p>
      <h1>Tools &amp; Calculators</h1>
      <p className="lead">
        Free, browser-based utilities for IT service desk workflows, resume optimization, career preparation, and personal finance planning. No sign-up or data upload required.
      </p>

      <div className="discovery-panel" style={{ padding: '16px', borderRadius: '12px', marginBottom: '24px', border: '1px solid var(--line)' }}>
        {/* Dynamic Category Filter Pills */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
          {TOOL_CATEGORIES.map(cat => {
            const count = categoryCounts[cat.id] ?? 0;
            const isSelected = activeCategory === cat.id;
            const isDisabled = count === 0 && !isSelected;

            return (
              <button
                key={cat.id}
                type="button"
                className={`tab-button ${isSelected ? 'active' : ''}`}
                onClick={() => {
                  if (count > 0 || isSelected) {
                    setActiveCategory(cat.id);
                  }
                }}
                disabled={isDisabled}
                aria-disabled={isDisabled}
                aria-label={`${cat.label} (${count} ${count === 1 ? 'tool' : 'tools'})`}
                style={{
                  opacity: isDisabled ? 0.45 : 1,
                  cursor: isDisabled ? 'not-allowed' : 'pointer',
                  transition: 'opacity 0.15s ease, background-color 0.15s ease, color 0.15s ease, border-color 0.15s ease',
                }}
                title={count === 0 ? `No matching tools in ${cat.label}` : undefined}
              >
                {cat.label} ({count})
              </button>
            );
          })}
        </div>

        <div
          className="discovery-controls"
          data-testid="tools-local-search-filter"
          style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}
        >
          <div style={{ position: 'relative', flex: '1 1 260px', display: 'flex', alignItems: 'center' }}>
            <Search
              size={15}
              aria-hidden="true"
              style={{
                position: 'absolute',
                left: '12px',
                color: 'var(--muted, #94a3b8)',
                pointerEvents: 'none',
              }}
            />
            <input
              id="tools-search-filter-input"
              data-testid="tools-search-filter-input"
              type="search"
              className="discovery-input"
              aria-label="Filter tools by name or description"
              placeholder="Search tools by name or description..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Escape' && searchTerm) {
                  e.preventDefault();
                  setSearchTerm('');
                }
              }}
              style={{ width: '100%', paddingLeft: '36px' }}
            />
          </div>
          {searchTerm && (
            <button
              data-testid="tools-filter-clear-btn"
              className="button button-secondary discovery-reset"
              type="button"
              onClick={() => setSearchTerm('')}
            >
              Clear
            </button>
          )}
          <button
            type="button"
            onClick={handleShareFilterConfiguration}
            data-testid="tools-filter-share-btn"
            className="button button-secondary no-print"
            aria-label="Share current tools search and filter configuration"
            title="Share or copy link to current search and category filter configuration"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 13px',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer',
              borderColor: isFilterLinkCopied
                ? 'rgba(16, 185, 129, 0.55)'
                : undefined,
              color: isFilterLinkCopied
                ? 'var(--emerald, #10b981)'
                : undefined,
            }}
          >
            {isFilterLinkCopied ? (
              <>
                <Check size={14} aria-hidden="true" />
                <span>Link copied!</span>
              </>
            ) : (
              <>
                <Share2 size={14} aria-hidden="true" />
                <span>Share</span>
              </>
            )}
          </button>
          <span
            data-testid="tools-filter-results-count"
            aria-live="polite"
            style={{ fontSize: '0.82rem', color: 'var(--muted)', fontWeight: 600 }}
          >
            Showing {filteredTools.length} of {indexedTools.length} tools
          </span>
        </div>
        {isFilterLinkCopied && sharedFilterUrl && (
          <div
            role="status"
            aria-live="polite"
            data-testid="tools-filter-share-toast"
            style={{
              marginTop: '10px',
              padding: '6px 12px',
              borderRadius: '8px',
              background: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.35)',
              color: 'var(--emerald, #10b981)',
              fontSize: '0.78rem',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Check size={13} aria-hidden="true" />
            <span>Link copied!</span>
            <code
              style={{
                fontSize: '0.73rem',
                color: 'var(--muted-light, #cbd5e1)',
                background: 'rgba(15, 23, 42, 0.5)',
                padding: '1px 6px',
                borderRadius: '4px',
              }}
            >
              {sharedFilterUrl}
            </code>
          </div>
        )}
      </div>

      <div className="card-grid" data-testid="tools-card-grid">
        {filteredTools.map(tool => {
          const baseToolUrl =
            typeof window !== 'undefined'
              ? `${window.location.origin}${tool.route}`
              : `https://jawed.co.in${tool.route}`;
          return (
            <article
              key={tool.id}
              className="card tool-card"
              data-testid={`tool-card-${tool.id}`}
              data-tool-id={tool.id}
              data-tool-name={tool.name}
              data-visible="true"
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', gap: '8px' }}>
                <span className="badge" style={{ fontSize: '0.75rem', background: 'rgba(56, 189, 248, 0.15)', color: 'var(--accent)' }}>
                  {tool.resolvedCategoryLabel}
                </span>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <PrintableBadge />
                  <ShareToolLinkButton
                    url={baseToolUrl}
                    toolRoute={tool.route}
                    toolId={tool.id}
                    size="sm"
                    label="Share State"
                    title={`Copy deep link to ${tool.name} with current configuration state`}
                  />
                </div>
              </div>
              <h3>{highlightToolTextMatch(tool.name, searchTerm)}</h3>
              <p>{highlightToolTextMatch(tool.description, searchTerm)}</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '12px', borderTop: '1px solid var(--line)', flexWrap: 'wrap', gap: '8px' }}>
                <Link to={tool.route} style={{ fontWeight: 600, color: 'var(--accent)' }}>Open Tool →</Link>
                <SocialShareBar
                  title={tool.name}
                  text={tool.description}
                  url={baseToolUrl}
                  size="small"
                  showLabel={false}
                />
              </div>
            </article>
          );
        })}
      </div>

      {filteredTools.length === 0 && (
        <div
          data-testid="tools-filter-empty-state"
          style={{ textAlign: 'center', padding: '36px 20px', background: 'var(--surface)', borderRadius: '12px', border: '1px solid var(--line)', marginTop: '20px' }}
        >
          <p style={{ fontSize: '1.05rem', color: 'var(--text-heading)', fontWeight: 600, marginBottom: '8px' }}>
            No tools found matching your criteria.
          </p>
          <p style={{ fontSize: '0.9rem', color: 'var(--muted)', maxWidth: '480px', margin: '0 auto 16px' }}>
            No tools match {activeCategory !== 'all' ? `category "${TOOL_CATEGORIES.find(c => c.id === activeCategory)?.label}"` : 'your filter'}{searchTerm ? ` and search query "${searchTerm}"` : ''}.
          </p>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
            {activeCategory !== 'all' && (
              <button
                type="button"
                className="button button-secondary"
                onClick={() => setActiveCategory('all')}
                style={{ padding: '6px 14px', fontSize: '0.85rem' }}
              >
                Reset to All Tools
              </button>
            )}
            {searchTerm && (
              <button
                type="button"
                className="button button-secondary"
                onClick={() => setSearchTerm('')}
                style={{ padding: '6px 14px', fontSize: '0.85rem' }}
              >
                Clear Search
              </button>
            )}
          </div>
        </div>
      )}
    </main>
  );
};

