import React from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import blogData from '../data/blogData.json';
import { Breadcrumb } from '../components/Breadcrumb';
import { SocialShareBar } from '../components/SocialShareBar';
import { SeoHead } from '../components/SeoHead';
import { calculateReadTime } from '../utils/readTimeHelper';
import { NewsletterSubscribeForm } from '../components/NewsletterSubscribeForm';
import {
  GlobalImageLightbox,
  handleArticleImageLightboxClick,
  openGlobalImageLightbox,
} from '../components/GlobalImageLightbox';
import {
  RelatedArticlesSection,
  getRelatedArticles,
  extractArticleTopicsAndTags,
  getDefaultArticlePool,
  type ArticleCandidate,
  type RelatedArticleSuggestion,
} from '../components/RelatedArticlesSection';

export {
  GlobalImageLightbox,
  handleArticleImageLightboxClick,
  openGlobalImageLightbox,
  RelatedArticlesSection,
  getRelatedArticles,
  extractArticleTopicsAndTags,
  getDefaultArticlePool,
  type ArticleCandidate,
  type RelatedArticleSuggestion,
};

export const BlogPostPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const post = blogData.find(b => b.slug === slug);

  if (!post) {
    return <Navigate to="/blog" replace />;
  }

  const shareUrl = typeof window !== 'undefined' ? window.location.href : `https://jawed.co.in/blog/${post.slug}`;

  return (
    <main className="container page">
      <SeoHead
        title={post.title}
        description={post.description}
        canonicalUrl={shareUrl}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
        <Breadcrumb
          items={[
            { label: 'Home', href: '/' },
            { label: 'Blog', href: '/blog' },
            { label: post.title },
          ]}
          style={{ marginBottom: 0 }}
        />
        <SocialShareBar
          title={post.title}
          text={post.description}
          url={shareUrl}
        />
      </div>

      {/* Print-Only Blog Guide Header */}
      <div className="print-only print-document-header" data-testid="blog-print-header">
        <div className="print-header-top-row">
          <div>
            <div className="print-header-brand">
              Jawed Imtiaz • Technical Blog &amp; Engineering Perspectives
            </div>
            <h1 className="print-header-title">{post.title}</h1>
            {post.description && (
              <p className="print-header-subtitle">{post.description}</p>
            )}
          </div>
          <div className="print-header-meta">
            <div><strong>Format:</strong> Technical Article</div>
            <div><strong>Source:</strong> jawed.co.in/blog/{post.slug}</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap' }}>
        <span className="badge" style={{ background: 'rgba(56, 189, 248, 0.15)', color: 'var(--accent)', fontWeight: 600, fontSize: '0.8rem' }}>
          Blog Post
        </span>
        <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>•</span>
        <span style={{ fontSize: '0.85rem', color: 'var(--muted)', fontWeight: 500 }}>
          {calculateReadTime(post.content)}
        </span>
      </div>

      <div
        className="blog-rendered-content"
        data-testid="blog-rendered-content"
        data-lightbox-scope="true"
        onClick={handleArticleImageLightboxClick}
        dangerouslySetInnerHTML={{ __html: post.content }}
      />

      {/* Related Articles Section (3 posts matched by tags or topics) */}
      <RelatedArticlesSection
        currentArticle={{
          slug: post.slug,
          title: post.title,
          description: post.description,
          content: post.content,
          sourceType: 'blog',
        }}
        count={3}
      />

      {/* Newsletter Subscription Form */}
      <NewsletterSubscribeForm sourceLocation={`blog-${post.slug}`} />

      <div style={{ marginTop: '32px', paddingTop: '20px', borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <Link className="button button-secondary" to="/blog">
          ← Back to All Blog Posts
        </Link>
        <SocialShareBar
          title={post.title}
          text={post.description}
          url={shareUrl}
        />
      </div>

      {/* Print-Only Document Footer */}
      <footer className="print-only print-document-footer" data-testid="blog-print-footer">
        <div className="print-footer-row">
          <span>Official Technical Documentation • Jawed Imtiaz</span>
          <span>https://jawed.co.in/blog/{post.slug}</span>
        </div>
      </footer>
    </main>
  );
};
