import React from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, ArrowRight, Tag } from 'lucide-react';
import {
  getRelatedArticles,
  extractArticleTopicsAndTags,
  getDefaultArticlePool,
  type ArticleCandidate,
  type RelatedArticleSuggestion,
} from '../utils/relatedArticles';

export {
  getRelatedArticles,
  extractArticleTopicsAndTags,
  getDefaultArticlePool,
  type ArticleCandidate,
  type RelatedArticleSuggestion,
};

export interface RelatedArticlesSectionProps {
  currentArticle: ArticleCandidate;
  candidates?: ArticleCandidate[];
  count?: number;
  heading?: string;
  subtitle?: string;
}

export const RelatedArticlesSection: React.FC<RelatedArticlesSectionProps> = ({
  currentArticle,
  candidates,
  count = 3,
  heading = 'Related Articles',
  subtitle = 'Recommended posts and technical guides matched by shared tags and topics.',
}) => {
  const relatedPosts = React.useMemo(
    () => getRelatedArticles(currentArticle, candidates, count),
    [currentArticle, candidates, count]
  );

  if (relatedPosts.length === 0) {
    return null;
  }

  return (
    <section
      className="related-articles-section"
      data-testid="related-articles-section"
      aria-label={heading}
      style={{
        marginTop: '40px',
        paddingTop: '32px',
        borderTop: '2px solid var(--line)',
      }}
    >
      <div style={{ marginBottom: '20px' }}>
        <h2
          style={{
            fontSize: '1.45rem',
            margin: '0 0 6px',
            color: 'var(--text-heading)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <BookOpen className="w-5 h-5 text-sky-400" aria-hidden="true" />
          <span>{heading}</span>
        </h2>
        <p style={{ color: 'var(--muted)', margin: 0, fontSize: '0.92rem' }}>
          {subtitle}
        </p>
      </div>

      <div className="card-grid three" data-testid="related-articles-grid">
        {relatedPosts.map((post) => (
          <article
            key={post.slug}
            className="card related-article-card"
            data-testid={`related-article-card-${post.slug}`}
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '12px',
            }}
          >
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px',
                  flexWrap: 'wrap',
                  marginBottom: '8px',
                }}
              >
                <span
                  className="badge"
                  style={{
                    fontSize: '0.75rem',
                    background: 'rgba(56, 189, 248, 0.14)',
                    color: 'var(--accent)',
                    fontWeight: 600,
                  }}
                >
                  {post.category}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                  {post.readTime}
                </span>
              </div>

              <h3
                style={{
                  fontSize: '1.08rem',
                  margin: '6px 0 10px',
                  lineHeight: 1.35,
                }}
              >
                <Link
                  to={post.href}
                  style={{
                    textDecoration: 'none',
                    color: 'var(--text-heading)',
                  }}
                >
                  {post.title}
                </Link>
              </h3>

              <p
                style={{
                  fontSize: '0.875rem',
                  color: 'var(--muted)',
                  margin: '0 0 12px',
                  display: '-webkit-box',
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                {post.description}
              </p>

              {post.matchedTopics.length > 0 && (
                <div
                  data-testid={`related-article-topics-${post.slug}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    flexWrap: 'wrap',
                    marginTop: '8px',
                  }}
                >
                  {post.matchedTopics.map((topic) => (
                    <span
                      key={topic}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '0.7rem',
                        padding: '2px 7px',
                        borderRadius: '6px',
                        background: 'var(--bg-darker)',
                        border: '1px solid var(--border)',
                        color: 'var(--muted-light)',
                      }}
                    >
                      <Tag className="w-2.5 h-2.5 text-sky-400" aria-hidden="true" />
                      <span>{topic}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingTop: '12px',
                borderTop: '1px solid var(--line)',
                fontSize: '0.82rem',
              }}
            >
              <Link
                to={post.href}
                style={{
                  fontWeight: 600,
                  color: 'var(--accent)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                }}
              >
                <span>Read Article</span>
                <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              </Link>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
};

export default RelatedArticlesSection;
