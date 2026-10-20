import React, { useState, useRef, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { askJawedAi } from '../services/aiKnowledgeEngine';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  sources?: { url: string; title: string; summary: string }[];
  isFallback?: boolean;
  userQuery?: string;
}

export const JawedAiWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Hi! Ask me anything about Jawed's IT support experience, troubleshooting frameworks, or diagnostic tools.",
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Hide on /ai or /ai/ page
  if (location.pathname.startsWith('/ai')) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const userText = query.trim();
    if (!userText || loading) return;

    setMessages(prev => [...prev, { role: 'user', content: userText }]);
    setQuery('');
    setLoading(true);

    try {
      const result = await askJawedAi(userText);
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: result.reply,
          sources: result.sources,
          isFallback: result.isFallback,
          userQuery: result.userQuery,
        },
      ]);
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: "Sorry, I ran into an error while processing that question. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="jawed-ai-widget">
      {!isOpen && (
        <button
          className="jawed-ai-toggle"
          type="button"
          aria-expanded="false"
          aria-label="Open Jawed AI Assistant"
          onClick={() => setIsOpen(true)}
        >
          Ask AI
        </button>
      )}

      {isOpen && (
        <div className="jawed-ai-panel" role="region" aria-label="Jawed AI Assistant">
          <div className="jawed-ai-widget-header">
            <strong>Jawed AI Assistant</strong>
            <div className="jawed-ai-widget-actions">
              <button
                className="jawed-ai-close"
                type="button"
                aria-label="Close"
                onClick={() => setIsOpen(false)}
              >
                ×
              </button>
            </div>
          </div>

          <div className="jawed-ai-widget-privacy">
            Answers are grounded in Jawed's technical notes, career background, and tools.
          </div>

          <div className="jawed-ai-widget-messages">
            {messages.map((m, idx) => (
              <div key={idx} className={`jawed-ai-widget-message ${m.role}`}>
                <div>{m.content}</div>
                {m.isFallback && (
                  <div style={{ marginTop: '12px' }}>
                    <Link
                      to={`/contact?question=${encodeURIComponent(m.userQuery || '')}`}
                      onClick={() => setIsOpen(false)}
                      className="button button-primary"
                      style={{ fontSize: '0.8rem', padding: '7px 12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    >
                      ✉️ Ask Jawed Directly →
                    </Link>
                  </div>
                )}
                {m.sources && m.sources.length > 0 && (
                  <div className="jawed-ai-widget-sources" style={{ marginTop: '8px' }}>
                    <small style={{ fontWeight: 600 }}>Sources:</small>
                    {m.sources.map((src, sIdx) => (
                      <Link
                        key={sIdx}
                        to={src.url}
                        onClick={() => setIsOpen(false)}
                        style={{ display: 'block', fontSize: '0.8rem', color: 'var(--accent)' }}
                      >
                        {src.title}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="jawed-ai-widget-message assistant" style={{ fontStyle: 'italic', color: 'var(--muted)' }}>
                Thinking...
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form className="jawed-ai-widget-form" onSubmit={handleSubmit}>
            <input
              type="text"
              placeholder="e.g. How do I troubleshoot WiFi or calculate SIP?"
              value={query}
              onChange={e => setQuery(e.target.value)}
              disabled={loading}
              aria-label="Ask Jawed AI"
            />
            <button
              className="button button-primary"
              type="submit"
              disabled={loading || !query.trim()}
              style={{ width: '100%', marginTop: '6px' }}
            >
              Send
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
