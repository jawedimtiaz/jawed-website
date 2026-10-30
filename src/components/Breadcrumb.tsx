import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, History } from 'lucide-react';
import notesData from '../data/notesData.json';
import { FIELD_GUIDES } from '../data/fieldGuidesData';
import { TOOLS } from '../data/toolsData';
import blogData from '../data/blogData.json';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface BreadcrumbProps {
  /**
   * Explicit list of breadcrumb items.
   * If omitted, the component automatically determines the hierarchy from the current URL path.
   */
  items?: BreadcrumbItem[];
  /**
   * Custom separator between breadcrumb items. Defaults to '>'.
   */
  separator?: React.ReactNode;
  /**
   * Optional custom CSS class name for the wrapper nav element.
   */
  className?: string;
  /**
   * Optional inline styles for the wrapper nav element.
   */
  style?: React.CSSProperties;
}

interface HistoryEntry {
  path: string;
  label: string;
  timestamp: number;
}

const SITE_ORIGIN = 'https://jawed.co.in';
const SESSION_HISTORY_KEY = 'app_session_nav_history_v1';

/**
 * Format a URL kebab-cased slug into a human-readable title.
 */
function formatSlugTitle(slug: string): string {
  return slug
    .split(/[-_]/)
    .filter(Boolean)
    .map(word => {
      // Keep acronyms uppercase
      const lower = word.toLowerCase();
      if (['ipv4', 'cidr', 'btu', 'it', 'itsm', 'star', 'kb', 'sop', 'pwa', 'sip', 'ai', 'cli', 'led'].includes(lower)) {
        return word.toUpperCase();
      }
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

export const Breadcrumb: React.FC<BreadcrumbProps> = ({
  items,
  separator = '>',
  className = '',
  style,
}) => {
  const location = useLocation();
  const [activeDropdownIndex, setActiveDropdownIndex] = useState<number | null>(null);
  const [historyDropdownOpen, setHistoryDropdownOpen] = useState(false);
  const [sessionHistory, setSessionHistory] = useState<HistoryEntry[]>([]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('.breadcrumb-quick-jump') && !(e.target as HTMLElement).closest('.breadcrumb-history-dropdown')) {
        setActiveDropdownIndex(null);
        setHistoryDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // If explicit items are passed, use them. Otherwise, automatically derive from current pathname.
  const breadcrumbItems = useMemo<BreadcrumbItem[]>(() => {
    if (items && items.length > 0) {
      return items;
    }

    const path = location.pathname.split(/[?#]/, 1)[0].replace(/\/+$/, '') || '/';
    if (path === '/') {
      return [{ label: 'Home' }];
    }

    const segments = path.split('/').filter(Boolean);
    const resolved: BreadcrumbItem[] = [{ label: 'Home', href: '/' }];

    if (segments.length === 0) return resolved;

    const first = segments[0];

    // Guides & Notes section
    if (first === 'guides' || first === 'field-guides' || first === 'notes') {
      if (segments.length === 1) {
        resolved.push({ label: 'Field Guides & Knowledge Base' });
      } else {
        resolved.push({ label: 'Guides', href: '/guides' });
        const slug = segments[1];
        const guide = FIELD_GUIDES.find(g => g.slug === slug);
        const note = (notesData as Array<{ slug: string; title: string }>).find(n => n.slug === slug);
        const title = guide ? guide.title : note ? note.title : formatSlugTitle(slug);
        resolved.push({ label: title });
      }
      return resolved;
    }

    // Tools & Calculators section
    if (first === 'tools' || first === 'diagnostic-tools') {
      if (segments.length === 1) {
        resolved.push({ label: 'Tools' });
      } else {
        resolved.push({ label: 'Tools', href: '/tools' });
        const toolId = segments[1];
        const tool = TOOLS.find(t => t.id === toolId || t.route.endsWith(`/${toolId}`));
        const title = tool ? tool.name : formatSlugTitle(toolId);
        resolved.push({ label: title });
      }
      return resolved;
    }

    // Blog section
    if (first === 'blog') {
      if (segments.length === 1) {
        resolved.push({ label: 'Blog' });
      } else {
        resolved.push({ label: 'Blog', href: '/blog' });
        const slug = segments[1];
        const post = (blogData as Array<{ slug: string; title: string }>).find(b => b.slug === slug);
        const title = post ? post.title : formatSlugTitle(slug);
        resolved.push({ label: title });
      }
      return resolved;
    }

    // Work / Portfolio section
    if (first === 'work') {
      if (segments.length === 1) {
        resolved.push({ label: 'Work' });
      } else {
        resolved.push({ label: 'Work', href: '/work' });
        resolved.push({ label: formatSlugTitle(segments[1]) });
      }
      return resolved;
    }

    // Generic fallback for any other top-level pages
    let accumulatedPath = '';
    segments.forEach((seg, idx) => {
      accumulatedPath += `/${seg}`;
      const isLast = idx === segments.length - 1;
      resolved.push({
        label: formatSlugTitle(seg),
        href: isLast ? undefined : accumulatedPath,
      });
    });

    return resolved;
  }, [items, location.pathname]);

  // Track navigation history in session storage
  useEffect(() => {
    try {
      const currentPath = location.pathname;
      const currentLabel = breadcrumbItems[breadcrumbItems.length - 1]?.label || formatSlugTitle(currentPath);
      
      const existingRaw = sessionStorage.getItem(SESSION_HISTORY_KEY);
      let history: HistoryEntry[] = existingRaw ? JSON.parse(existingRaw) : [];

      history = history.filter(h => h.path !== currentPath);
      history.unshift({
        path: currentPath,
        label: currentLabel,
        timestamp: Date.now(),
      });

      if (history.length > 10) {
        history = history.slice(0, 10);
      }

      sessionStorage.setItem(SESSION_HISTORY_KEY, JSON.stringify(history));
      setSessionHistory(history);
    } catch {
      // Ignore
    }
  }, [location.pathname, breadcrumbItems]);

  const clearSessionHistory = () => {
    try {
      sessionStorage.removeItem(SESSION_HISTORY_KEY);
      const currentPath = location.pathname;
      const currentLabel = breadcrumbItems[breadcrumbItems.length - 1]?.label || 'Current Page';
      setSessionHistory([{ path: currentPath, label: currentLabel, timestamp: Date.now() }]);
    } catch {
      // Ignore
    }
  };

  // Synchronize Schema.org BreadcrumbList structured data for search engine rich results
  useEffect(() => {
    const origin = typeof window !== 'undefined' ? window.location.origin : SITE_ORIGIN;
    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: breadcrumbItems.map((item, index) => {
        const itemData: Record<string, any> = {
          '@type': 'ListItem',
          position: index + 1,
          name: item.label,
        };
        if (item.href) {
          itemData.item = item.href.startsWith('http')
            ? item.href
            : `${origin}${item.href.startsWith('/') ? '' : '/'}${item.href}`;
        }
        return itemData;
      }),
    };

    let scriptEl = document.getElementById('breadcrumb-schema') as HTMLScriptElement | null;
    if (!scriptEl) {
      scriptEl = document.createElement('script');
      scriptEl.id = 'breadcrumb-schema';
      scriptEl.type = 'application/ld+json';
      document.head.appendChild(scriptEl);
    }
    scriptEl.textContent = JSON.stringify(jsonLd);
  }, [breadcrumbItems]);

  const getSiblingsForItem = (index: number, item: BreadcrumbItem): BreadcrumbItem[] => {
    if (index === 0 || item.href === '/') {
      return [
        { label: 'Home', href: '/' },
        { label: 'Field Guides', href: '/guides' },
        { label: 'Tools', href: '/tools' },
        { label: 'Blog', href: '/blog' },
        { label: 'Work', href: '/work' },
      ];
    }

    const currentPath = item.href || location.pathname;
    const segments = currentPath.split('/').filter(Boolean);
    const first = segments[0];

    if (first === 'guides' || first === 'field-guides' || first === 'notes') {
      if (segments.length <= 1) {
        return [
          { label: 'Field Guides', href: '/guides' },
          { label: 'Tools', href: '/tools' },
          { label: 'Blog', href: '/blog' },
        ];
      }
      const guideSiblings: BreadcrumbItem[] = FIELD_GUIDES.map(g => ({
        label: g.title,
        href: `/guides/${g.slug}`,
      }));
      const noteSiblings: BreadcrumbItem[] = (notesData as Array<{ slug: string; title: string }>).map(n => ({
        label: n.title,
        href: `/guides/${n.slug}`,
      }));
      return [...guideSiblings, ...noteSiblings];
    }

    if (first === 'tools' || first === 'diagnostic-tools') {
      if (segments.length <= 1) {
        return [
          { label: 'Tools', href: '/tools' },
          { label: 'Field Guides', href: '/guides' },
          { label: 'Blog', href: '/blog' },
        ];
      }
      return TOOLS.map(t => ({
        label: t.name,
        href: t.route,
      }));
    }

    if (first === 'blog') {
      if (segments.length <= 1) {
        return [
          { label: 'Blog', href: '/blog' },
          { label: 'Field Guides', href: '/guides' },
          { label: 'Tools', href: '/tools' },
        ];
      }
      return (blogData as Array<{ slug: string; title: string }>).map(b => ({
        label: b.title,
        href: `/blog/${b.slug}`,
      }));
    }

    return [];
  };

  return (
    <nav
      className={`breadcrumbs ${className}`.trim()}
      aria-label="Breadcrumb"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        ...style,
      }}
    >
      <ol className="breadcrumb-list" style={{ display: 'flex', alignItems: 'center', gap: '8px', listStyle: 'none', padding: 0, margin: 0, flexWrap: 'wrap' }}>
        {breadcrumbItems.map((item, index) => {
          const isLast = index === breadcrumbItems.length - 1;
          return (
            <li key={index} className="breadcrumb-item" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              {index > 0 && (
                <div className="breadcrumb-quick-jump" style={{ position: 'relative', display: 'inline-block' }}>
                  <button
                    type="button"
                    onClick={() => setActiveDropdownIndex(activeDropdownIndex === index ? null : index)}
                    className="breadcrumb-separator-btn"
                    style={{
                      background: activeDropdownIndex === index ? 'var(--surface-accent)' : 'transparent',
                      border: '1px solid',
                      borderColor: activeDropdownIndex === index ? 'var(--accent)' : 'transparent',
                      borderRadius: '4px',
                      padding: '2px 5px',
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                      color: 'var(--muted)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '2px',
                      transition: 'all 0.15s ease',
                    }}
                    title="Quick Jump: Click to see sibling pages"
                  >
                    <span>{separator}</span>
                    <span style={{ fontSize: '0.65rem', opacity: 0.8 }}>▼</span>
                  </button>

                  {activeDropdownIndex === index && (
                    <div
                      className="quick-jump-dropdown"
                      style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        marginTop: '4px',
                        minWidth: '220px',
                        maxHeight: '280px',
                        overflowY: 'auto',
                        background: 'var(--surface)',
                        border: '1px solid var(--border)',
                        borderRadius: '10px',
                        boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
                        padding: '6px',
                        zIndex: 100,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '2px',
                      }}
                    >
                      <div style={{ padding: '4px 8px', fontSize: '0.70rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid var(--border)', marginBottom: '4px' }}>
                        Quick Jump Siblings
                      </div>
                      {getSiblingsForItem(index, item).map((sibling, sIdx) => {
                        const isCurrent = location.pathname === sibling.href;
                        return (
                          <Link
                            key={sIdx}
                            to={sibling.href || '#'}
                            onClick={() => setActiveDropdownIndex(null)}
                            style={{
                              padding: '6px 10px',
                              borderRadius: '6px',
                              fontSize: '0.82rem',
                              color: isCurrent ? 'var(--accent)' : 'var(--text)',
                              background: isCurrent ? 'var(--surface-accent)' : 'transparent',
                              fontWeight: isCurrent ? 700 : 500,
                              textDecoration: 'none',
                              display: 'block',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {sibling.label}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
              {isLast || !item.href ? (
                <span
                  className="breadcrumb-current"
                  aria-current="page"
                  title={item.label}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    maxWidth: '220px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.14), rgba(99, 102, 241, 0.14))',
                    border: '1px solid rgba(56, 189, 248, 0.28)',
                    borderRadius: '6px',
                    padding: '2px 8px',
                  }}
                >
                  {index === 0 && <Home size={14} style={{ display: 'inline', verticalAlign: '-2px', marginRight: '4px', flexShrink: 0 }} aria-hidden="true" />}
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.label}
                  </span>
                </span>
              ) : (
                <Link
                  to={item.href}
                  className="breadcrumb-link"
                  title={item.label}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    maxWidth: '180px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {index === 0 && <Home size={14} style={{ display: 'inline', verticalAlign: '-2px', marginRight: '4px', flexShrink: 0 }} aria-hidden="true" />}
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.label}
                  </span>
                </Link>
              )}
            </li>
          );
        })}
      </ol>

      {/* Session Navigation History Dropdown */}
      <div className="breadcrumb-history-dropdown" style={{ position: 'relative' }}>
        <button
          type="button"
          onClick={() => setHistoryDropdownOpen(!historyDropdownOpen)}
          style={{
            background: historyDropdownOpen ? 'var(--surface-accent)' : 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            padding: '5px 10px',
            fontSize: '0.78rem',
            fontWeight: 600,
            color: 'var(--text)',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            transition: 'all 0.15s ease',
          }}
          title="View recent session navigation history"
        >
          <History size={13} color="var(--accent)" />
          <span>History ({sessionHistory.length})</span>
        </button>

        {historyDropdownOpen && (
          <div
            style={{
              position: 'absolute',
              right: 0,
              top: '100%',
              marginTop: '6px',
              minWidth: '260px',
              maxHeight: '300px',
              overflowY: 'auto',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              boxShadow: '0 12px 36px rgba(0,0,0,0.35)',
              padding: '8px',
              zIndex: 100,
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 8px', borderBottom: '1px solid var(--border)', marginBottom: '4px' }}>
              <span style={{ fontSize: '0.70rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Recent Session History
              </span>
              {sessionHistory.length > 1 && (
                <button
                  type="button"
                  onClick={clearSessionHistory}
                  style={{
                    background: 'transparent',
                    border: 0,
                    color: 'var(--rose)',
                    fontSize: '0.7rem',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  Clear
                </button>
              )}
            </div>

            {sessionHistory.map((entry, hIdx) => {
              const isCurrent = location.pathname === entry.path;
              return (
                <Link
                  key={hIdx}
                  to={entry.path}
                  onClick={() => setHistoryDropdownOpen(false)}
                  style={{
                    padding: '8px 10px',
                    borderRadius: '8px',
                    fontSize: '0.82rem',
                    color: isCurrent ? 'var(--accent)' : 'var(--text)',
                    background: isCurrent ? 'var(--surface-accent)' : 'transparent',
                    fontWeight: isCurrent ? 700 : 500,
                    textDecoration: 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px',
                    border: isCurrent ? '1px solid var(--accent)' : '1px solid transparent',
                  }}
                >
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {entry.label}
                  </span>
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                    {entry.path}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </nav>
  );
};

export default Breadcrumb;
