import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { askJawedAi, AiResponse } from '../services/aiKnowledgeEngine';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export const AiPage: React.FC = () => {
  const isOnline = useOnlineStatus();
  const [searchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const [query, setQuery] = useState(initialQuery);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AiResponse | null>(null);

  const handleAsk = async (textToAsk: string) => {
    const q = textToAsk.trim();
    if (!q) return;

    if (!isOnline) {
      setResult({
        reply: 'Jawed AI needs internet',
        sources: [],
        isFallback: true,
        userQuery: q
      });
      return;
    }

    setLoading(true);
    try {
      const res = await askJawedAi(q);
      setResult(res);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleAsk(query);
  };

  const sampleQuestions = [
    "How does Jawed approach IT troubleshooting?",
    "What are Jawed's certifications and current learning?",
    "How do I troubleshoot network connectivity layer by layer?",
    "What are the best practices for device provisioning and handoff?",
    "How do I calculate SIP compound growth?",
  ];

  return (
    <main className="container page">
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <Link to="/">Home</Link> &gt; <span>Ask AI</span>
      </nav>

      <p className="eyebrow">Interactive Knowledge</p>
      <h1>Jawed AI Assistant</h1>
      <p className="lead">
        Ask questions across Jawed's professional experience, IT troubleshooting frameworks, personal finance tools, and technical notes. Responses are retrieved directly from published website knowledge.
      </p>

      <div className="ai-shell">
        <div className="ai-header">
          <h2>Ask a Question</h2>
          <p style={{ color: 'var(--muted)', fontSize: '0.9rem', margin: 0 }}>
            Answers are strictly grounded in site documentation, without sending personal data to external APIs.
          </p>
        </div>

        {!isOnline && (
          <div
            style={{
              padding: '12px 16px',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              borderRadius: '10px',
              color: '#fca5a5',
              fontSize: '0.95rem',
              fontWeight: 600,
              margin: '16px 0',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
            role="status"
          >
            <span aria-hidden="true">📡</span> Jawed AI needs internet
          </div>
        )}

        <form className="ai-form" onSubmit={handleSubmit}>
          <div className="ai-form-row">
            <input
              type="text"
              className="discovery-input"
              placeholder={!isOnline ? 'Jawed AI needs internet' : 'e.g. How does Jawed approach ticket documentation?'}
              value={query}
              onChange={e => setQuery(e.target.value)}
              disabled={loading}
            />
            <button
              className="button button-primary"
              type="submit"
              disabled={loading || !query.trim()}
            >
              {loading ? 'Searching...' : 'Ask AI'}
            </button>
          </div>
        </form>

        <div style={{ marginTop: '16px' }}>
          <small style={{ fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: '8px' }}>
            Suggested questions:
          </small>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {sampleQuestions.map((q, idx) => (
              <button
                key={idx}
                type="button"
                className="button button-secondary"
                style={{ fontSize: '0.82rem', padding: '6px 12px' }}
                onClick={() => {
                  setQuery(q);
                  handleAsk(q);
                }}
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        {result && (
          <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid var(--line)' }}>
            <h3 style={{ marginBottom: '10px' }}>Answer:</h3>
            <div
              className="tool-output"
              style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7, fontSize: '0.95rem' }}
            >
              {result.reply}
            </div>

            {result.sources.length > 0 && (
              <div style={{ marginTop: '16px' }}>
                <h4 style={{ fontSize: '1rem', marginBottom: '8px' }}>Referenced Sources:</h4>
                <div className="card-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
                  {result.sources.map((src, idx) => (
                    <article key={idx} className="card" style={{ padding: '14px' }}>
                      <h4 style={{ margin: '0 0 6px', fontSize: '1rem' }}>{src.title}</h4>
                      <p style={{ margin: '0 0 10px', fontSize: '0.85rem', color: 'var(--muted)' }}>
                        {src.summary}
                      </p>
                      <Link to={src.url} style={{ fontSize: '0.85rem' }}>Read page →</Link>
                    </article>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
};
