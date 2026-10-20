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

type WidgetState = 'closed' | 'minimized' | 'open';

export const JawedAiWidget: React.FC = () => {
  const [widgetState, setWidgetState] = useState<WidgetState>('closed');
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
    if (widgetState === 'open') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, widgetState]);

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
      {/* Closed / Minimized Launcher Button */}
      {widgetState !== 'open' && (
        <button
          className="jawed-ai-toggle"
          type="button"
          aria-expanded="false"
          aria-label="Open Jawed AI Assistant"
          onClick={() => setWidgetState('open')}
        >
          💬 Ask Jawed AI
        </button>
      )}

      {/* Main Floating Chat Panel */}
      {widgetState === 'open' && (
        <div className="jawed-ai-panel" role="region" aria-label="Jawed AI Assistant">
          {/* Distinct Header Bar */}
          <div className="jawed-ai-widget-header">
            <div className="jawed-ai-header-titles">
              <strong>Jawed AI Assistant</strong>
              <span>Grounded in Jawed's notes &amp; tools</span>
            </div>
            <div className="jawed-ai-header-actions">
              <button
                className="jawed-ai-action-btn"
                type="button"
                aria-label="Minimize Jawed AI Assistant"
                title="Minimize"
                onClick={() => setWidgetState('minimized')}
              >
                −
              </button>
              <button
                className="jawed-ai-action-btn"
                type="button"
                aria-label="Close Jawed AI Assistant"
                title="Close"
                onClick={() => setWidgetState('closed')}
              >
                ✕
              </button>
            </div>
          </div>

          <div className="jawed-ai-widget-privacy">
            🔒 Answers are retrieved directly from published website knowledge.
          </div>

          {/* Contained Scrollable Message History Container */}
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

                {/* Pre-filled Contact Button on Knowledge Base Fallback */}
                {m.isFallback && (
                  <div style={{ marginTop: '10px' }}>
                    <Link
                      to={`/contact?question=${encodeURIComponent(m.userQuery || '')}`}
                      onClick={() => setWidgetState('closed')}
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

                {/* Referenced Documentation Source Link Chips */}
                {m.sources && m.sources.length > 0 && (
                  <div className="jawed-ai-widget-sources" style={{ marginTop: '8px' }}>
                    <small style={{ fontWeight: 600, color: 'var(--muted)' }}>Sources:</small>
                    {m.sources.map((src, sIdx) => (
                      <Link
                        key={sIdx}
                        to={src.url}
                        onClick={() => setWidgetState('closed')}
                        style={{ display: 'block', fontSize: '0.8rem', color: 'var(--accent)', marginTop: '2px' }}
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

          {/* Spacious & Accessible Input Form */}
          <form
            className="jawed-ai-widget-form"
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
          >
            <div className="jawed-ai-input-row">
              <input
                type="text"
                placeholder="Ask a question..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                disabled={loading}
                aria-label="Type your question for Jawed AI"
              />
              <button
                className="jawed-ai-send-btn"
                type="submit"
                disabled={loading || !query.trim()}
              >
                {loading ? '...' : 'Send'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
