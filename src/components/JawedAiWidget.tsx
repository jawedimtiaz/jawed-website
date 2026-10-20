import React, { useState, useRef, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { askJawedAi } from '../services/aiKnowledgeEngine';

interface Message {
  id: string;
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
      id: 'msg-welcome',
      role: 'assistant',
      content: "Hi! Ask me anything about Jawed's IT field tech experience, networking guides, or diagnostic tools.",
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Hide widget on dedicated /ai page
  if (location.pathname.startsWith('/ai')) {
    return null;
  }

  const handleSend = async () => {
    const userText = query.trim();
    if (!userText || loading) return;

    const userMsgId = `user-${Date.now()}`;
    setMessages(prev => [...prev, { id: userMsgId, role: 'user', content: userText }]);
    setQuery('');
    setLoading(true);

    try {
      const result = await askJawedAi(userText);
      const assistantMsgId = `assistant-${Date.now()}`;
      setMessages(prev => [
        ...prev,
        {
          id: assistantMsgId,
          role: 'assistant',
          content: result.reply,
          sources: result.sources,
          isFallback: result.isFallback,
          userQuery: result.userQuery || userText,
        },
      ]);
    } catch (err) {
      const errorMsgId = `err-${Date.now()}`;
      setMessages(prev => [
        ...prev,
        {
          id: errorMsgId,
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
          🤖 Ask AI
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
                aria-label="Close Jawed AI Assistant"
                onClick={() => setIsOpen(false)}
              >
                ×
              </button>
            </div>
          </div>

          <div className="jawed-ai-widget-privacy">
            Answers are grounded in Jawed's published technical documentation &amp; tools.
          </div>

          {/* Scrollable Chat Bubble Thread with WCAG Accessible Live Region */}
          <div
            className="jawed-ai-widget-messages"
            role="log"
            aria-live="polite"
            aria-relevant="additions"
            aria-atomic="false"
          >
            {messages.map((m) => (
              <div key={m.id} className={`jawed-ai-widget-message ${m.role}`}>
                <div>{m.content}</div>

                {/* Interactive Contact Button on Knowledge Base Fallback */}
                {m.isFallback && (
                  <div style={{ marginTop: '10px' }}>
                    <Link
                      to={`/contact?question=${encodeURIComponent(m.userQuery || '')}`}
                      onClick={() => setIsOpen(false)}
                      className="button button-primary"
                      style={{
                        fontSize: '0.8rem',
                        padding: '6px 12px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        textDecoration: 'none',
                      }}
                    >
                      ✉️ Ask Jawed Directly →
                    </Link>
                  </div>
                )}

                {/* Referenced Documentation Sources */}
                {m.sources && m.sources.length > 0 && (
                  <div className="jawed-ai-widget-sources" style={{ marginTop: '8px' }}>
                    <small style={{ fontWeight: 600, color: 'var(--muted)' }}>Sources:</small>
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
                Searching documentation...
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Controlled Form Submission Handler */}
          <form
            className="jawed-ai-widget-form"
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
          >
            <input
              type="text"
              placeholder="e.g. How do I crimp RJ45 or calculate subnets?"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={loading}
              aria-label="Ask Jawed AI a question"
            />
            <button
              className="button button-primary"
              type="submit"
              disabled={loading || !query.trim()}
              style={{ width: '100%', marginTop: '6px' }}
            >
              {loading ? 'Sending...' : 'Send'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
