import React, { useEffect, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
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

const SITE_ORIGIN = 'https://jawed.co.in';

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

  return (
    <nav
      className={`breadcrumbs ${className}`.trim()}
      aria-label="Breadcrumb"
      style={style}
    >
      <ol className="breadcrumb-list">
        {breadcrumbItems.map((item, index) => {
          const isLast = index === breadcrumbItems.length - 1;
          return (
            <li key={index} className="breadcrumb-item">
              {index > 0 && (
                <span className="breadcrumb-separator" aria-hidden="true">
                  {separator}
                </span>
              )}
              {isLast || !item.href ? (
                <span
                  className="breadcrumb-current"
                  aria-current="page"
                  title={item.label}
                >
                  {item.label}
                </span>
              ) : (
                <Link to={item.href} className="breadcrumb-link">
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export default Breadcrumb;
