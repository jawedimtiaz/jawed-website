import React from 'react';
import { Link } from 'react-router-dom';
import blogData from '../data/blogData.json';

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
          <article key={post.slug} className="card">
            <h2>{post.title}</h2>
            <p>{post.description}</p>
            <Link to={`/blog/${post.slug}`}>Read Article →</Link>
          </article>
        ))}
      </div>
    </main>
  );
};
