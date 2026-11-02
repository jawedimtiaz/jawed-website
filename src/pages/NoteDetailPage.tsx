import React from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import notesData from '../data/notesData.json';
import { FIELD_GUIDES } from '../data/fieldGuidesData';
import { FieldGuideDetailPage } from './FieldGuideDetailPage';
import { Breadcrumb } from '../components/Breadcrumb';
import { SocialShareBar } from '../components/SocialShareBar';
import { SeoHead } from '../components/SeoHead';
import { calculateReadTime } from '../utils/readTimeHelper';
import { NewsletterSubscribeForm } from '../components/NewsletterSubscribeForm';
import { extractContentFreshness, type NoteSchemaItem } from '../utils/contentFreshness';
import {
  generateTableOfContents,
  slugifyHeading,
  decodeHtmlEntities,
  buildTocAnchorUrl,
  copyTocAnchorToClipboard,
  type TocItem,
  type GeneratedTocResult,
} from '../utils/tocGenerator';

import { COMPONENT_MAPPER, getInteractiveComponentForSlug } from '../utils/componentMapper';

export {
  generateTableOfContents,
  slugifyHeading,
  decodeHtmlEntities,
  buildTocAnchorUrl,
  copyTocAnchorToClipboard,
  type TocItem,
  type GeneratedTocResult,
};

/**
 * Helper function: extractGuideMetadata
 * Extracts 'title', 'description', 'publishedDate', and 'lastUpdated' fields from markdown frontmatter (YAML block),
 * schema properties, or embedded HTML metadata/heading/lead elements.
 */
export const extractGuideMetadata = (note: {
  title?: string;
  description?: string;
  content?: string;
  publishedDate?: string;
  updatedDate?: string;
  lastUpdated?: string;
}) => {
  let metaTitle = note.title || '';
  let metaDescription = note.description || '';

  if (note.content) {
    const rawContent = note.content;

    // 1. Check for YAML frontmatter block: --- title: "..." description: "..." ---
    const frontmatterMatch = rawContent.match(/^\s*---\s*[\r\n]+([\s\S]*?)[\r\n]+---/);

    if (frontmatterMatch) {
      const yamlBlock = frontmatterMatch[1];
      const titleMatch = yamlBlock.match(/^(?:title|Title):\s*(?:"([^"]+)"|'([^']+)'|([^\r\n]+))/m);
      const descMatch = yamlBlock.match(/^(?:description|Description):\s*(?:"([^"]+)"|'([^']+)'|([^\r\n]+))/m);

      if (titleMatch) {
        const extractedTitle = (titleMatch[1] || titleMatch[2] || titleMatch[3] || '').trim();
        if (extractedTitle) metaTitle = extractedTitle;
      }
      if (descMatch) {
        const extractedDesc = (descMatch[1] || descMatch[2] || descMatch[3] || '').trim();
        if (extractedDesc) metaDescription = extractedDesc;
      }
    }

    // 2. Fallback to <h1> / <p class="lead"> HTML elements if missing
    if (!metaTitle) {
      const h1Match = rawContent.match(/<h1[^>]*>(.*?)<\/h1>/i);
      if (h1Match?.[1]) {
        metaTitle = h1Match[1].replace(/<[^>]+>/g, '').trim();
      }
    }

    if (!metaDescription) {
      const leadMatch = rawContent.match(/<p\s+class=["']lead["'][^>]*>(.*?)<\/p>/i);
      if (leadMatch?.[1]) {
        metaDescription = leadMatch[1].replace(/<[^>]+>/g, '').trim();
      }
    }
  }

  const freshness = extractContentFreshness(note);

  return {
    title: metaTitle,
    description: metaDescription,
    publishedDate: freshness.publishedFormatted,
    lastUpdated: freshness.updatedFormatted,
    isoUpdated: freshness.isoUpdated,
    isoPublished: freshness.isoPublished,
  };
};

/**
 * Custom React Hook: useSeoMetadata
 * Accepts frontmatter object (or loaded note) and active slug, dynamically updates
 * document.title and injects/updates <meta name="description"> tag whenever active slug
 * or metadata changes, with an explicit cleanup function upon component unmount.
 */
export const useSeoMetadata = (
  frontmatter?: {
    title?: string;
    description?: string;
    content?: string;
    publishedDate?: string;
    updatedDate?: string;
    lastUpdated?: string;
  },
  slug?: string
) => {
  const metadata = React.useMemo(() => {
    if (!frontmatter) {
      return {
        title: '',
        description: '',
        publishedDate: '',
        lastUpdated: '',
        isoUpdated: '',
        isoPublished: '',
      };
    }
    return extractGuideMetadata(frontmatter);
  }, [
    frontmatter?.title,
    frontmatter?.description,
    frontmatter?.content,
    frontmatter?.publishedDate,
    frontmatter?.updatedDate,
    frontmatter?.lastUpdated,
  ]);

  React.useEffect(() => {
    const defaultTitle = 'Jawed Imtiaz | Guides, Tools & Services';
    const defaultDesc = 'Technical guides, subnet calculators, server rack power calculators, and interactive diagnostic tools by Jawed Imtiaz.';

    // Dynamically update document title
    if (metadata.title) {
      const fullTitle = metadata.title.includes('Jawed Imtiaz')
        ? metadata.title
        : `${metadata.title} | Jawed Imtiaz`;
      document.title = fullTitle;
    } else {
      document.title = defaultTitle;
    }

    // Inject or update <meta name="description"> tag dynamically
    let metaDescElement = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    let createdNewTag = false;

    if (!metaDescElement) {
      metaDescElement = document.createElement('meta');
      metaDescElement.setAttribute('name', 'description');
      document.head.appendChild(metaDescElement);
      createdNewTag = true;
    }

    const previousContent = metaDescElement.getAttribute('content') || defaultDesc;
    metaDescElement.setAttribute('content', metadata.description || defaultDesc);

    // Cleanup function: resets title & meta description on unmount or slug transition
    return () => {
      document.title = defaultTitle;
      if (metaDescElement) {
        if (createdNewTag && metaDescElement.parentNode) {
          metaDescElement.parentNode.removeChild(metaDescElement);
        } else {
          metaDescElement.setAttribute('content', previousContent);
        }
      }
    };
  }, [slug, metadata.title, metadata.description]);

  return metadata;
};

export const NoteDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();

  const fieldGuide = FIELD_GUIDES.find((g) => g.slug === slug);
  const note = (notesData as NoteSchemaItem[]).find((n) => n.slug === slug);

  // Dynamically extract frontmatter title/description & update document head (title and meta description) upon guide load
  const guideMetadata = useSeoMetadata(note, slug);

  // Strip frontmatter header block from HTML content prior to rendering
  const cleanHtmlContent = React.useMemo(() => {
    if (!note?.content) return '';
    return note.content.replace(/^---\s*[\r\n]+[\s\S]*?[\r\n]+---\s*/, '');
  }, [note?.content]);

  // Extract all H2 and H3 headings and inject unique anchor IDs into the rendered HTML
  const { htmlWithIds, tocItems, shouldShowToc } = React.useMemo(
    () => generateTableOfContents(cleanHtmlContent),
    [cleanHtmlContent]
  );

  const [activeHeadingId, setActiveHeadingId] = React.useState<string>('');
  const [copiedHeadingId, setCopiedHeadingId] = React.useState<string>('');
  const [isMobileTocOpen, setIsMobileTocOpen] = React.useState<boolean>(false);
  const copyFeedbackTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup copy feedback timer on unmount
  React.useEffect(() => {
    return () => {
      if (copyFeedbackTimerRef.current) {
        clearTimeout(copyFeedbackTimerRef.current);
      }
    };
  }, []);

  // Reset mobile TOC, copy feedback, and initialize active heading when note slug or TOC items change
  React.useEffect(() => {
    setIsMobileTocOpen(false);
    setCopiedHeadingId('');
    setActiveHeadingId(tocItems[0]?.id || '');
  }, [slug, tocItems]);

  // Scroll-spy: highlight the active H2/H3 heading as the reader scrolls through the guide
  React.useEffect(() => {
    if (!shouldShowToc || typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }

    const handleScrollSpy = () => {
      const scrollThreshold = 130;
      let currentId = tocItems[0]?.id || '';

      for (const item of tocItems) {
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

      setActiveHeadingId((prev) => (prev === currentId ? prev : currentId));
    };

    window.addEventListener('scroll', handleScrollSpy, { passive: true });
    handleScrollSpy();

    return () => {
      window.removeEventListener('scroll', handleScrollSpy);
    };
  }, [shouldShowToc, tocItems]);

  // Check if slug belongs to a Field Guide first
  if (fieldGuide) {
    return <FieldGuideDetailPage />;
  }

  if (!note) {
    return <Navigate to="/guides" replace />;
  }

  const shareUrl = typeof window !== 'undefined' ? window.location.href : `https://jawed.co.in/notes/${note.slug}`;

  // Retrieve injected visual module from centralized componentMapper utility
  const visualModule = getInteractiveComponentForSlug(slug);

  const handleTocLinkClick = (event: React.MouseEvent<HTMLAnchorElement>, headingId: string) => {
    event.preventDefault();
    setActiveHeadingId(headingId);
    setIsMobileTocOpen(false);

    if (typeof document !== 'undefined') {
      const targetElement = document.getElementById(headingId);
      if (targetElement) {
        targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }

    if (typeof window !== 'undefined' && window.history?.replaceState) {
      window.history.replaceState(null, '', `#${headingId}`);
    }
  };

  const handleCopySectionLink = async (
    event: React.MouseEvent<HTMLButtonElement>,
    headingId: string
  ) => {
    event.preventDefault();
    event.stopPropagation();

    const currentBaseUrl =
      typeof window !== 'undefined' && window.location?.href
        ? window.location.href
        : shareUrl;
    const anchorUrl = buildTocAnchorUrl(currentBaseUrl, headingId);

    await copyTocAnchorToClipboard(anchorUrl);

    if (typeof window !== 'undefined' && window.history?.replaceState) {
      window.history.replaceState(null, '', `#${headingId}`);
    }

    setCopiedHeadingId(headingId);
    if (copyFeedbackTimerRef.current) {
      clearTimeout(copyFeedbackTimerRef.current);
    }
    copyFeedbackTimerRef.current = setTimeout(() => {
      setCopiedHeadingId((prev) => (prev === headingId ? '' : prev));
    }, 2000);
  };

  const handleScrollToTop = () => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    if (tocItems[0]?.id) {
      setActiveHeadingId(tocItems[0].id);
    }
  };

  const renderTocList = (idPrefix: string) => (
    <ul className="note-toc-list" data-testid={`${idPrefix}-toc-list`}>
      {tocItems.map((item) => {
        const isActive = activeHeadingId === item.id;
        const isCopied = copiedHeadingId === item.id;
        return (
          <li
            key={item.id}
            className={`note-toc-item level-${item.level}`}
          >
            <div className="note-toc-row">
              <a
                href={`#${item.id}`}
                onClick={(e) => handleTocLinkClick(e, item.id)}
                className={`note-toc-link level-${item.level}${isActive ? ' is-active' : ''}`}
                aria-current={isActive ? 'location' : undefined}
              >
                {item.text}
              </a>
              <button
                type="button"
                onClick={(e) => handleCopySectionLink(e, item.id)}
                className={`note-toc-copy-btn${isCopied ? ' is-copied' : ''}`}
                title={isCopied ? 'Link copied!' : 'Copy link to clipboard'}
                aria-label={
                  isCopied
                    ? `Copied link to ${item.text}`
                    : `Copy link to clipboard for ${item.text}`
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
    <main className="container page">
      {/* Dynamically set head tags (title, description, OpenGraph, Twitter cards, canonical link) */}
      <SeoHead
        title={guideMetadata.title}
        description={guideMetadata.description}
        canonicalUrl={`https://jawed.co.in/notes/${note.slug}`}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
        <Breadcrumb
          items={[
            { label: 'Home', href: '/' },
            { label: 'Guides', href: '/guides' },
            { label: guideMetadata.title },
          ]}
          style={{ marginBottom: 0 }}
        />
        <SocialShareBar
          title={guideMetadata.title}
          text={guideMetadata.description}
          url={shareUrl}
        />
      </div>

      {/* Note Metadata Header Bar with Dynamic 'Last Updated' Timestamp */}
      <header
        className="note-detail-header"
        style={{
          display: 'flex',
          gap: '12px',
          alignItems: 'center',
          marginBottom: '16px',
          flexWrap: 'wrap',
        }}
      >
        <span className="badge" style={{ background: 'rgba(56, 189, 248, 0.15)', color: 'var(--accent)', fontWeight: 600, fontSize: '0.8rem' }}>
          {note.category || 'Quick Note'}
        </span>
        <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>•</span>
        <span style={{ fontSize: '0.85rem', color: 'var(--muted)', fontWeight: 500 }}>
          {calculateReadTime(cleanHtmlContent || note.description)}
        </span>
        {guideMetadata.lastUpdated && (
          <>
            <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>•</span>
            <span
              className="note-last-updated-badge"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.82rem',
                color: 'var(--muted-light)',
                padding: '3px 10px',
                borderRadius: '6px',
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                fontWeight: 500,
              }}
              title={`Content verified and last updated on ${guideMetadata.lastUpdated}`}
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
                <time dateTime={guideMetadata.isoUpdated} style={{ fontWeight: 600, color: 'var(--text-heading)' }}>
                  {guideMetadata.lastUpdated}
                </time>
              </span>
            </span>
          </>
        )}
      </header>

      {/* Mobile / Tablet Collapsible Table of Contents Navigation */}
      {shouldShowToc && (
        <nav className="note-toc-mobile" aria-label="Table of Contents (Mobile)">
          <button
            type="button"
            className="note-toc-mobile-toggle"
            onClick={() => setIsMobileTocOpen((prev) => !prev)}
            aria-expanded={isMobileTocOpen}
            aria-controls="note-toc-mobile-panel"
          >
            <span>On this page · {tocItems.length} sections</span>
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

      {/* Main Layout: Note Content + Sticky Table of Contents Sidebar */}
      <div className={shouldShowToc ? 'note-detail-layout' : 'note-detail-layout no-toc'}>
        {/* Rendered Note Content */}
        <article
          className="quick-note-article card"
          style={{ padding: '32px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px' }}
        >
          <div
            className="note-rendered-content"
            dangerouslySetInnerHTML={{ __html: htmlWithIds }}
          />

          {/* Injected Automated Visual Modules */}
          {visualModule && (
            <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: '1px solid var(--border)' }}>
              {visualModule}
            </div>
          )}
        </article>

        {/* Sticky Sidebar Table of Contents for Desktop */}
        {shouldShowToc && (
          <aside className="note-toc-sidebar" aria-label="Table of Contents" data-testid="note-toc-sidebar">
            <nav aria-label="On this page">
              <div className="note-toc-header">
                <h2 className="note-toc-title">On this page</h2>
                <span className="note-toc-count">{tocItems.length} sections</span>
              </div>
              {renderTocList('desktop')}
              <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
                <button
                  type="button"
                  onClick={handleScrollToTop}
                  className="footer-text-btn"
                  style={{ fontSize: '0.8rem', fontWeight: 600 }}
                >
                  ↑ Back to top
                </button>
              </div>
            </nav>
          </aside>
        )}
      </div>

      {/* Newsletter Subscription Form */}
      <NewsletterSubscribeForm sourceLocation={`note-${note.slug}`} />

      <div style={{ marginTop: '32px', paddingTop: '20px', borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <Link className="button button-secondary" to="/guides">
            ← Back to All Guides &amp; Notes
          </Link>
          <Link className="button button-primary" to="/tools/it-troubleshooting-assistant">
            Launch IT Troubleshooting Assistant →
          </Link>
        </div>
        <SocialShareBar
          title={guideMetadata.title}
          text={guideMetadata.description}
          url={shareUrl}
        />
      </div>
    </main>
  );
};

