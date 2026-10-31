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

import { COMPONENT_MAPPER, getInteractiveComponentForSlug } from '../utils/componentMapper';

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

  // Check if slug belongs to a Field Guide first
  const fieldGuide = FIELD_GUIDES.find(g => g.slug === slug);
  if (fieldGuide) {
    return <FieldGuideDetailPage />;
  }

  // Otherwise check notesData
  const note = (notesData as NoteSchemaItem[]).find(n => n.slug === slug);

  if (!note) {
    return <Navigate to="/guides" replace />;
  }

  const shareUrl = typeof window !== 'undefined' ? window.location.href : `https://jawed.co.in/notes/${note.slug}`;

  // Dynamically extract frontmatter title/description & update document head (title and meta description) upon guide load
  const guideMetadata = useSeoMetadata(note, slug);

  // Strip frontmatter header block from HTML content prior to rendering
  const cleanHtmlContent = note.content ? note.content.replace(/^---\s*[\r\n]+[\s\S]*?[\r\n]+---\s*/, '') : '';

  // Retrieve injected visual module from centralized componentMapper utility
  const visualModule = getInteractiveComponentForSlug(slug);

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

      {/* Rendered Note Content */}
      <article className="quick-note-article card" style={{ padding: '32px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px' }}>
        <div
          className="note-rendered-content"
          dangerouslySetInnerHTML={{ __html: cleanHtmlContent }}
        />

        {/* Injected Automated Visual Modules */}
        {visualModule && (
          <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: '1px solid var(--border)' }}>
            {visualModule}
          </div>
        )}
      </article>

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

