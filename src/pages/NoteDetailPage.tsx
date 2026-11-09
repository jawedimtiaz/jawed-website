import React from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { Share2 } from 'lucide-react';
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
  TableOfContents,
  AutomatedTableOfContents,
  generateTableOfContents,
  convertMarkdownHeadingsToHtml,
  parseRenderedHeadingsFromDom,
  jumpToHeadingSection,
  injectHeadingCopyButtons,
  slugifyHeading,
  decodeHtmlEntities,
  buildTocAnchorUrl,
  copyTocAnchorToClipboard,
  type TocItem,
  type GeneratedTocResult,
} from '../components/TableOfContents';

import { COMPONENT_MAPPER, getInteractiveComponentForSlug } from '../utils/componentMapper';
import {
  GlobalImageLightbox,
  handleArticleImageLightboxClick,
  openGlobalImageLightbox,
} from '../components/GlobalImageLightbox';
import {
  RelatedArticles,
  RelatedArticlesSection,
  getRelatedArticles,
  extractArticleTopicsAndTags,
  getDefaultArticlePool,
  type ArticleCandidate,
  type RelatedArticleSuggestion,
  type RelatedArticlesProps,
} from '../components/RelatedArticles';

import {
  ReadTimeProgressIndicator,
  type ReadTimeProgressIndicatorProps,
} from '../components/ReadTimeProgressIndicator';

import {
  ScrollProgressIndicator,
  type ScrollProgressIndicatorProps,
} from '../components/ScrollProgressIndicator';

import {
  PrintableBadge,
  type PrintableBadgeProps,
} from '../components/common/PrintableBadge';

export {
  TableOfContents,
  AutomatedTableOfContents,
  generateTableOfContents,
  convertMarkdownHeadingsToHtml,
  parseRenderedHeadingsFromDom,
  jumpToHeadingSection,
  injectHeadingCopyButtons,
  slugifyHeading,
  decodeHtmlEntities,
  buildTocAnchorUrl,
  copyTocAnchorToClipboard,
  GlobalImageLightbox,
  handleArticleImageLightboxClick,
  openGlobalImageLightbox,
  RelatedArticlesSection,
  RelatedArticles,
  getRelatedArticles,
  extractArticleTopicsAndTags,
  getDefaultArticlePool,
  ReadTimeProgressIndicator,
  ScrollProgressIndicator,
  PrintableBadge,
  type TocItem,
  type GeneratedTocResult,
  type ArticleCandidate,
  type RelatedArticleSuggestion,
  type ReadTimeProgressIndicatorProps,
  type ScrollProgressIndicatorProps,
  type PrintableBadgeProps,
  type RelatedArticlesProps,
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
  const [isLinkCopiedToastVisible, setIsLinkCopiedToastVisible] = React.useState<boolean>(false);
  const [copiedHeadingUrl, setCopiedHeadingUrl] = React.useState<string>('');
  const [isMobileTocOpen, setIsMobileTocOpen] = React.useState<boolean>(false);
  const copyFeedbackTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Inject 'Copy Link to Heading' button into every H2 and H3 tag in the rendered article HTML
  const htmlWithCopyButtons = React.useMemo(
    () => injectHeadingCopyButtons(htmlWithIds, copiedHeadingId),
    [htmlWithIds, copiedHeadingId]
  );

  // Cleanup copy feedback and toast timers on unmount
  React.useEffect(() => {
    return () => {
      if (copyFeedbackTimerRef.current) {
        clearTimeout(copyFeedbackTimerRef.current);
      }
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
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

  const copyHeadingDeepLink = async (headingId: string) => {
    if (!headingId) return;

    const currentBaseUrl =
      typeof window !== 'undefined' && window.location?.href
        ? window.location.href
        : shareUrl;
    const anchorUrl = buildTocAnchorUrl(currentBaseUrl, headingId);

    await copyTocAnchorToClipboard(anchorUrl);

    if (typeof window !== 'undefined' && window.history?.replaceState) {
      window.history.replaceState(null, '', `#${headingId}`);
    }

    setActiveHeadingId(headingId);
    setCopiedHeadingId(headingId);
    setCopiedHeadingUrl(anchorUrl);
    setIsLinkCopiedToastVisible(true);

    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    toastTimeoutRef.current = setTimeout(() => {
      setIsLinkCopiedToastVisible(false);
    }, 2400);

    if (copyFeedbackTimerRef.current) {
      clearTimeout(copyFeedbackTimerRef.current);
    }
    copyFeedbackTimerRef.current = setTimeout(() => {
      setCopiedHeadingId((prev) => (prev === headingId ? '' : prev));
    }, 2000);
  };

  const handleCopySectionLink = async (
    event: React.MouseEvent<HTMLButtonElement>,
    headingId: string
  ) => {
    event.preventDefault();
    event.stopPropagation();
    await copyHeadingDeepLink(headingId);
  };

  const handleRenderedContentClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement | null;
    const copyBtn = target?.closest<HTMLButtonElement>('[data-copy-heading-id]');
    if (copyBtn) {
      event.preventDefault();
      event.stopPropagation();
      const headingId = copyBtn.getAttribute('data-copy-heading-id') || '';
      if (headingId) {
        void copyHeadingDeepLink(headingId);
      }
      return;
    }

    handleArticleImageLightboxClick(event);
  };

  const handleWebShareNote = async () => {
    const shareTitle = guideMetadata.title || note?.title || 'Technical Note';
    const shareText = guideMetadata.description || note?.description || '';
    const shareData = {
      title: shareTitle,
      text: shareText,
      url: shareUrl,
    };

    try {
      if (
        typeof navigator !== 'undefined' &&
        typeof navigator.share === 'function' &&
        (typeof navigator.canShare !== 'function' || navigator.canShare(shareData))
      ) {
        await navigator.share(shareData);
        return;
      }
    } catch (err: unknown) {
      if ((err as Error)?.name === 'AbortError') {
        return;
      }
    }

    // Fallback: Copy link to clipboard and trigger toast
    await copyTocAnchorToClipboard(shareUrl);
    setCopiedHeadingUrl(shareUrl);
    setIsLinkCopiedToastVisible(true);
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    toastTimeoutRef.current = setTimeout(() => {
      setIsLinkCopiedToastVisible(false);
    }, 2400);
  };

  const handleScrollToTop = () => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    if (tocItems[0]?.id) {
      setActiveHeadingId(tocItems[0].id);
    }
  };

  const handleSelectTocHeading = (headingId: string) => {
    setActiveHeadingId(headingId);
    setIsMobileTocOpen(false);
  };

  return (
    <main className="container page">
      {/* Scroll Progress Indicator tracking reading percentage at top of page */}
      <ScrollProgressIndicator />

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

      {/* Print-Only Engineering Guide Header for Clean A4 / Letter PDF Exports */}
      <div className="print-only print-document-header" data-testid="guide-print-header">
        <div className="print-header-top-row">
          <div>
            <div className="print-header-brand">
              Jawed Imtiaz • Technical Engineering Guide &amp; Knowledge Base
            </div>
            <h1 className="print-header-title">{guideMetadata.title}</h1>
            {guideMetadata.description && (
              <p className="print-header-subtitle">{guideMetadata.description}</p>
            )}
          </div>
          <div className="print-header-meta">
            <div><strong>Category:</strong> {note.category || 'Technical Note'}</div>
            {guideMetadata.lastUpdated && (
              <div><strong>Last Verified:</strong> {guideMetadata.lastUpdated}</div>
            )}
            <div><strong>Source:</strong> jawed.co.in/notes/{note.slug}</div>
          </div>
        </div>
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
        <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>•</span>
        <PrintableBadge />
      </header>

      {/* Mobile / Tablet Collapsible Table of Contents Navigation */}
      {shouldShowToc && (
        <TableOfContents
          tocItems={tocItems}
          content={cleanHtmlContent}
          activeHeadingId={activeHeadingId}
          copiedHeadingId={copiedHeadingId}
          onSelectHeading={handleSelectTocHeading}
          onCopyHeadingLink={handleCopySectionLink}
          onScrollToTop={handleScrollToTop}
          mode="mobile"
          isMobileOpen={isMobileTocOpen}
          onToggleMobile={() => setIsMobileTocOpen((prev) => !prev)}
        />
      )}

      {/* Main Layout: Note Content + Sticky Table of Contents Sidebar */}
      <div className={shouldShowToc ? 'note-detail-layout' : 'note-detail-layout no-toc'}>
        {/* Rendered Note Content */}
        <article
          className="quick-note-article card"
          data-lightbox-scope="true"
          style={{ padding: '32px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px' }}
        >
          {/* Scroll-triggered Estimated Read Time & Progress Bar */}
          <ReadTimeProgressIndicator
            content={cleanHtmlContent}
            variant="inline"
            scrollTriggerThreshold={40}
          />

          <div
            className="note-rendered-content"
            data-testid="note-rendered-content"
            data-lightbox-scope="true"
            onClick={handleRenderedContentClick}
            dangerouslySetInnerHTML={{ __html: htmlWithCopyButtons }}
          />

          {/* Injected Automated Visual Modules */}
          {visualModule && (
            <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: '1px solid var(--border)' }}>
              {visualModule}
            </div>
          )}

          {/* Bottom Web Share Action Row */}
          <div
            className="note-bottom-share-bar no-print"
            data-testid="note-bottom-share-bar"
            style={{
              marginTop: '32px',
              paddingTop: '20px',
              borderTop: '1px solid var(--line)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Share2 className="w-4 h-4 text-sky-400" aria-hidden="true" style={{ color: 'var(--accent, #38bdf8)' }} />
              <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-heading)' }}>
                Found this technical note helpful?
              </span>
            </div>
            <button
              type="button"
              onClick={handleWebShareNote}
              data-testid="note-web-share-btn"
              className="button button-primary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 16px',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
              aria-label={`Share "${guideMetadata.title || note.title}"`}
              title="Share this note using native Web Share API or copy link"
            >
              <Share2 size={15} aria-hidden="true" />
              <span>Share Note</span>
            </button>
          </div>
        </article>

        {/* Sticky Sidebar Table of Contents for Desktop */}
        {shouldShowToc && (
          <TableOfContents
            tocItems={tocItems}
            content={cleanHtmlContent}
            activeHeadingId={activeHeadingId}
            copiedHeadingId={copiedHeadingId}
            onSelectHeading={handleSelectTocHeading}
            onCopyHeadingLink={handleCopySectionLink}
            onScrollToTop={handleScrollToTop}
            mode="desktop"
          />
        )}
      </div>

      {/* Related Articles Section (3 posts matched by tags or topics) */}
      <RelatedArticlesSection
        currentArticle={{
          slug: note.slug,
          title: guideMetadata.title || note.title,
          description: guideMetadata.description || note.description,
          category: note.category,
          content: note.content,
          sourceType: 'note',
        }}
        count={3}
      />

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

      {/* Floating Read Time Indicator for Mobile/Tablet Scroll Progress */}
      <ReadTimeProgressIndicator
        content={cleanHtmlContent}
        variant="floating"
        scrollTriggerThreshold={120}
      />

      {/* Print-Only Document Footer */}
      <footer className="print-only print-document-footer" data-testid="guide-print-footer">
        <div className="print-footer-row">
          <span>Official Technical Documentation • Jawed Imtiaz</span>
          <span>https://jawed.co.in/notes/{note.slug}</span>
        </div>
      </footer>

      {/* Toast Notification: 'Link copied!' for Heading Copy Actions */}
      {isLinkCopiedToastVisible && (
        <div
          role="status"
          aria-live="polite"
          data-testid="heading-link-copied-toast"
          data-toast-message="Link copied!"
          className="toast heading-link-copied-toast no-print"
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 9999,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            borderRadius: '10px',
            background: 'var(--bg-darker, #0f172a)',
            border: '1px solid rgba(52, 211, 153, 0.55)',
            color: 'var(--text, #f8fafc)',
            fontSize: '0.85rem',
            fontWeight: 600,
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.45)',
          }}
        >
          <span aria-hidden="true" style={{ color: 'var(--emerald, #10b981)', display: 'inline-flex', alignItems: 'center' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </span>
          <span>Link copied!</span>
          {copiedHeadingUrl && (
            <span
              style={{
                fontSize: '0.72rem',
                color: 'var(--muted, #94a3b8)',
                fontFamily: 'monospace',
                maxWidth: '220px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
              title={copiedHeadingUrl}
            >
              {copiedHeadingUrl.includes('#') ? `#${copiedHeadingUrl.split('#')[1]}` : ''}
            </span>
          )}
        </div>
      )}
    </main>
  );
};

export { NoteDetailPage as NotesDetailPage, NoteDetailPage as NotesDetail };
export default NoteDetailPage;


