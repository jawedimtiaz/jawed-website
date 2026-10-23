import React from 'react';
import { Link } from 'react-router-dom';
import blogData from '../data/blogData.json';
import { calculateReadTime } from '../utils/readTimeHelper';

export const BlogListPage: React.FC = () => {
  return (
    <main className="container page">
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <Link to="/">Home</Link> &gt; <span>Blog</span>
      </nav>

      <p className="eyebrow">Writing &amp; Case Studies</p>
      <h1>Blog</h1>
      <p className="lead">
        In-depth writeups on website architecture, workplace app triage, and real-world IT problem solving.
      </p>

      <div className="card-grid">
        {blogData.map(post => (
          <article key={post.slug} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span className="badge" style={{ fontSize: '0.75rem', background: 'rgba(56, 189, 248, 0.15)', color: 'var(--accent)' }}>
                  Blog
                </span>
                <span style={{ fontSize: '0.8rem', color: 'var(--muted)', fontWeight: 500 }}>
                  {calculateReadTime(post.content || post.description)}
                </span>
              </div>
              <h2 style={{ fontSize: '1.2rem', marginTop: 0, marginBottom: '8px', lineHeight: '1.35' }}>{post.title}</h2>
              <p style={{ fontSize: '0.875rem', color: 'var(--muted)', marginBottom: '16px' }}>{post.description}</p>
            </div>
            <div style={{ marginTop: '14px', paddingTop: '10px', borderTop: '1px solid var(--line)' }}>
              <Link to={`/blog/${post.slug}`} style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--accent)' }}>
                Read Article →
              </Link>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
};
