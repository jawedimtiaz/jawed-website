import React, { useState } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { FIELD_GUIDES, FieldGuide, determineCategory } from '../data/fieldGuidesData';
import { AdUnitPlaceholder } from '../components/AdUnitPlaceholder';
import { SeoHead } from '../components/SeoHead';
import { Breadcrumb } from '../components/Breadcrumb';
import { SocialShareBar } from '../components/SocialShareBar';
import { Image } from '../components/Image';

export const FieldGuideDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [copied, setCopied] = useState(false);

  const guide = FIELD_GUIDES.find(g => g.slug === slug);

  if (!guide) {
    return <Navigate to="/guides" replace />;
  }

  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';

  const handleCopyLink = () => {
    navigator.clipboard.writeText(currentUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareOnTwitter = () => {
    const text = encodeURIComponent(`Check out "${guide.title}" by Jawed Imtiaz`);
    const url = encodeURIComponent(currentUrl);
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank', 'noopener,noreferrer');
  };

  const shareOnLinkedIn = () => {
    const url = encodeURIComponent(currentUrl);
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${url}`, '_blank', 'noopener,noreferrer');
  };

  const shareByEmail = () => {
    const subject = encodeURIComponent(`IT Field Guide: ${guide.title}`);
    const body = encodeURIComponent(`Read this detailed IT field guide: ${guide.title}\n\n${currentUrl}`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const relatedGuides = FIELD_GUIDES.filter(g => g.slug !== guide.slug);

  return (
    <main className="container page">
      <SeoHead
        title={guide.title}
        description={guide.description}
        canonicalUrl={currentUrl}
      />

      {/* Breadcrumbs */}
      <Breadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'Guides', href: '/guides' },
          { label: guide.title },
        ]}
      />

      {/* Top Leaderboard Ad Unit (Zero CLS Reserved Container) */}
      <AdUnitPlaceholder slotType="top-leaderboard" />

      <article className="field-guide-article">
        {/* Header Metadata */}
        <header style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap' }}>
            <span className="badge" style={{ background: 'rgba(56, 189, 248, 0.15)', color: 'var(--accent)', fontWeight: 600 }}>
              {guide.category || determineCategory(guide)}
            </span>
            <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>•</span>
            <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>{guide.readTime}</span>
            <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>•</span>
            <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>Published {guide.publishedDate}</span>
            {guide.updatedDate && guide.updatedDate !== guide.publishedDate && (
              <>
                <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>•</span>
                <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>Updated {guide.updatedDate}</span>
              </>
            )}
          </div>

          <h1 style={{ fontSize: '2.2rem', lineHeight: 1.25, marginBottom: '16px', color: 'var(--text-heading)' }}>
            {guide.title}
          </h1>

          <p className="lead" style={{ fontSize: '1.1rem', color: 'var(--muted-light)', marginBottom: '20px' }}>
            {guide.description}
          </p>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', paddingTop: '16px', borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)', paddingBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', overflow: 'hidden', border: '1px solid var(--line)', flexShrink: 0 }}>
                <Image
                  src="/apple-touch-icon.png"
                  alt={guide.author}
                  width={40}
                  height={40}
                  loading="lazy"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
              </div>
              <div>
                <strong style={{ display: 'block', color: 'var(--text-heading)', fontSize: '0.95rem' }}>{guide.author}</strong>
                <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>IT Support &amp; Workplace Engineering Lead</span>
              </div>
            </div>

            {/* Social Share Bar */}
            <SocialShareBar
              title={guide.title}
              text={guide.description}
              url={currentUrl}
            />
          </div>
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 280px', gap: '36px', alignItems: 'start' }} className="article-layout">
          {/* Main Article Content */}
          <div className="article-body">
            {/* Rendered HTML Content */}
            <div
              className="note-rendered-content"
              dangerouslySetInnerHTML={{ __html: guide.contentHtml }}
            />

            {/* In-Feed Native Ad Unit */}
            <AdUnitPlaceholder slotType="in-feed" />

            {/* Article Footer & Keywords */}
            <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid var(--line)' }}>
              <p style={{ fontSize: '0.85rem', color: 'var(--muted)', marginBottom: '12px' }}>
                <strong>Keywords:</strong> {guide.keywords.join(' • ')}
              </p>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <Link className="button button-primary" to="/tools/it-troubleshooting-assistant">
                  Launch IT Troubleshooting Assistant →
                </Link>
                <Link className="button button-secondary" to="/field-guides">
                  ← Back to Field Guides List
                </Link>
              </div>
            </div>
          </div>

          {/* Sticky Sidebar */}
          <aside className="article-sidebar" style={{ position: 'sticky', top: '90px' }}>
            <div className="card" style={{ padding: '20px', background: 'var(--surface)', border: '1px solid var(--line)' }}>
              <h3 style={{ fontSize: '1.05rem', margin: '0 0 14px', color: 'var(--text-heading)', borderBottom: '1px solid var(--line)', paddingBottom: '8px' }}>
                📋 Table of Contents
              </h3>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '10px' }}>
                {guide.toc.map(item => (
                  <li key={item.id}>
                    <a
                      href={`#${item.id}`}
                      style={{ fontSize: '0.875rem', color: 'var(--muted-light)', textDecoration: 'none', display: 'block', lineHeight: '1.4' }}
                      className="toc-link"
                    >
                      {item.text}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Help Callout */}
            <div className="card" style={{ marginTop: '20px', padding: '16px', background: 'var(--bg-darker)', border: '1px solid var(--line)' }}>
              <strong style={{ fontSize: '0.9rem', color: 'var(--accent)', display: 'block', marginBottom: '6px' }}>
                ⚡ Need Field Dispatch?
              </strong>
              <p style={{ fontSize: '0.825rem', color: 'var(--muted)', margin: '0 0 12px' }}>
                On-site server rack cabling or emergency network port troubleshooting required?
              </p>
              <Link to="/services" className="button button-secondary" style={{ width: '100%', textAlign: 'center', fontSize: '0.8rem', padding: '6px' }}>
                Book IT Dispatch →
              </Link>
            </div>

            {/* Sidebar Skyscraper / Rectangle Ad Unit */}
            <AdUnitPlaceholder slotType="sidebar-unit" />
          </aside>
        </div>

        {/* Related Articles Widget */}
        <section style={{ marginTop: '60px', paddingTop: '40px', borderTop: '2px solid var(--line)' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '8px', color: 'var(--text-heading)' }}>
            📚 Related Technical Field Guides
          </h2>
          <p style={{ color: 'var(--muted)', marginBottom: '24px', fontSize: '0.95rem' }}>
            Deep-dive troubleshooting procedures and field checklists written by IT engineers.
          </p>

          <div className="card-grid three">
            {relatedGuides.map(rel => (
              <article key={rel.slug} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <span className="badge" style={{ fontSize: '0.75rem', marginBottom: '8px', display: 'inline-block' }}>
                    {rel.category}
                  </span>
                  <h3 style={{ fontSize: '1.1rem', margin: '6px 0 10px', lineHeight: '1.3' }}>
                    <Link to={`/guides/${rel.slug}`} style={{ textDecoration: 'none', color: 'var(--text-heading)' }}>
                      {rel.title}
                    </Link>
                  </h3>
                  <p style={{ fontSize: '0.875rem', color: 'var(--muted)', margin: '0 0 16px', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {rel.description}
                  </p>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', borderTop: '1px solid var(--line)', fontSize: '0.8rem', color: 'var(--muted)' }}>
                  <span>{rel.readTime}</span>
                  <Link to={`/guides/${rel.slug}`} style={{ fontWeight: 600, color: 'var(--accent)' }}>
                    Read Guide →
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>
      </article>
    </main>
  );
};
