import React from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import blogData from '../data/blogData.json';
import { Breadcrumb } from '../components/Breadcrumb';

export const BlogPostPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const post = blogData.find(b => b.slug === slug);

  if (!post) {
    return <Navigate to="/blog" replace />;
  }

  return (
    <main className="container page">
      <Breadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'Blog', href: '/blog' },
          { label: post.title },
        ]}
        style={{ marginBottom: '16px' }}
      />

      <div
        className="blog-rendered-content"
        dangerouslySetInnerHTML={{ __html: post.content }}
      />

      <div style={{ marginTop: '32px', paddingTop: '20px', borderTop: '1px solid var(--line)' }}>
        <Link className="button button-secondary" to="/blog">
          ← Back to All Blog Posts
        </Link>
      </div>
    </main>
  );
};
