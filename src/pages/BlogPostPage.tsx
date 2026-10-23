import React from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import blogData from '../data/blogData.json';
import { Breadcrumb } from '../components/Breadcrumb';
import { ShareButton } from '../components/ShareButton';

export const BlogPostPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const post = blogData.find(b => b.slug === slug);

  if (!post) {
    return <Navigate to="/blog" replace />;
  }

  const shareUrl = typeof window !== 'undefined' ? window.location.href : `https://jawed.co.in/blog/${post.slug}`;

  return (
    <main className="container page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
        <Breadcrumb
          items={[
            { label: 'Home', href: '/' },
            { label: 'Blog', href: '/blog' },
            { label: post.title },
          ]}
          style={{ marginBottom: 0 }}
        />
        <ShareButton
          title={post.title}
          text={post.description}
          url={shareUrl}
        />
      </div>

      <div
        className="blog-rendered-content"
        dangerouslySetInnerHTML={{ __html: post.content }}
      />

      <div style={{ marginTop: '32px', paddingTop: '20px', borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <Link className="button button-secondary" to="/blog">
          ← Back to All Blog Posts
        </Link>
        <ShareButton
          title={post.title}
          text={post.description}
          url={shareUrl}
        />
      </div>
    </main>
  );
};
