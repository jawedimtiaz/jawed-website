import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { blogPosts } from '../data/blogData';

export const BlogDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const cleanSlug = slug?.replace(/\/$/, '');
  const post = blogPosts.find((p) => p.slug === cleanSlug);

  if (!post) {
    return (
      <main id="main-content" className="container page" style={{ textAlign: 'center', padding: '4rem 1rem' }}>
        <h1>Article Not Found</h1>
        <p style={{ color: 'var(--muted)', marginBottom: '2rem' }}>
          The requested blog post or case study could not be found.
        </p>
        <Link to="/blog/" className="button">
          ← Back to All Articles
        </Link>
      </main>
    );
  }

  return (
    <main id="main-content" className="container page">
      {/* Breadcrumbs */}
      <div className="breadcrumbs" style={{ fontSize: '0.875rem', color: 'var(--muted)', marginBottom: '1rem' }}>
        <Link to="/">Home</Link>
        <span style={{ margin: '0 0.5rem' }}>/</span>
        <Link to="/blog/">Blog</Link>
        <span style={{ margin: '0 0.5rem' }}>/</span>
        <span style={{ color: 'var(--text)', fontWeight: 600 }}>{post.title}</span>
      </div>

      <p className="eyebrow">{post.eyebrow}</p>
      <h1 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.75rem)', lineHeight: 1.2, marginBottom: '1rem' }}>
        {post.title}
      </h1>

      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', color: 'var(--muted)', fontSize: '0.9rem', marginBottom: '1.75rem', borderBottom: '1px solid var(--line)', paddingBottom: '1rem' }}>
        <span><strong>Category:</strong> {post.category}</span>
        <span>•</span>
        <span><strong>Published:</strong> {post.publishedDate}</span>
        <span>•</span>
        <span><strong>Updated:</strong> {post.updatedDate}</span>
        <span>•</span>
        <span><strong>Read Time:</strong> {post.readTime}</span>
      </div>

      <p className="lead" style={{ maxWidth: '50rem', marginBottom: '2.5rem' }}>
        {post.lead}
      </p>

      {/* Post paragraphs */}
      <div className="content-body" style={{ maxWidth: '50rem', lineHeight: 1.8, fontSize: '1.05rem' }}>
        {post.content.map((paragraph, idx) => (
          <p key={idx} style={{ marginBottom: '1.5rem' }}>
            {paragraph}
          </p>
        ))}
      </div>

      {/* Case Study Takeaway Card */}
      <div style={{ backgroundColor: 'var(--surface)', padding: '1.75rem', borderRadius: '8px', border: '1px solid var(--line)', margin: '3rem 0', maxWidth: '50rem' }}>
        <h3 style={{ margin: '0 0 0.5rem' }}>Key Takeaways &amp; Engineering Discipline</h3>
        <ul style={{ paddingLeft: '1.25rem', margin: 0, lineHeight: 1.7, fontSize: '0.95rem' }}>
          <li>Always test and isolate the smallest variable first before making changes.</li>
          <li>Build for durability: avoid fragile server dependencies when client-side execution is faster and safer.</li>
          <li>Preserve user privacy: never collect or store sensitive company credentials or personal data.</li>
          <li>Document every test outcome so teammates can continue without duplicating effort.</li>
        </ul>
      </div>

      <div style={{ borderTop: '1px solid var(--line)', paddingTop: '1.5rem', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', maxWidth: '50rem' }}>
        <Link to="/blog/" className="button button-secondary">
          ← Back to Blog
        </Link>
        <Link to="/contact/" className="button">
          Discuss this Case Study →
        </Link>
      </div>
    </main>
  );
};
