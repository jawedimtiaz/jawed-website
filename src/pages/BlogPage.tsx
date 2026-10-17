import React from 'react';
import { Link } from 'react-router-dom';
import { blogPosts } from '../data/blogData';

export const BlogPage: React.FC = () => {
  return (
    <main id="main-content" className="container page">
      <p className="eyebrow">Case Studies &amp; Reflections</p>
      <h1>Blog &amp; Technical Case Studies</h1>
      <p className="lead" style={{ maxWidth: '48rem', marginBottom: '2.5rem' }}>
        Detailed engineering retrospectives, operational problem-solving writeups, and the architectural principles behind building this portfolio and workplace technology tools.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        {blogPosts.map((post) => (
          <article key={post.slug} className="card" style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <span className="badge">{post.category}</span>
              <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
                {post.readTime} read · {post.publishedDate}
              </span>
            </div>
            <h2 style={{ fontSize: '1.5rem', margin: '0.5rem 0' }}>
              <Link to={`/blog/${post.slug}/`} style={{ textDecoration: 'none', color: 'inherit' }}>
                {post.title}
              </Link>
            </h2>
            <p style={{ fontSize: '1.05rem', color: 'var(--text)', lineHeight: 1.6, marginBottom: '1.25rem' }}>
              {post.summary}
            </p>
            <Link to={`/blog/${post.slug}/`} className="button button-secondary" style={{ alignSelf: 'flex-start' }}>
              Read Case Study →
            </Link>
          </article>
        ))}
      </div>
    </main>
  );
};
