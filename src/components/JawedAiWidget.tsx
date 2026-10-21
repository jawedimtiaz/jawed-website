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
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
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
  const launcherRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const location = useLocation();

  useEffect(() => {
    if (isOpen && !isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isMinimized]);

  useEffect(() => {
    if (isOpen && !isMinimized) {
      inputRef.current?.focus();
    }
  }, [isOpen, isMinimized]);

  // Hide widget on dedicated /ai page
  if (location.pathname.startsWith('/ai')) {
    return null;
  }

  const handleSend = async () => {
    const userText = query.trim();
    if (!userText || loading) return;

    const userMsgId = `user-${Date.now()}`;
    setMessages((prev) => [...prev, { id: userMsgId, role: 'user', content: userText }]);
    setQuery('');
    setLoading(true);

    try {
      const result = await askJawedAi(userText);
      const assistantMsgId = `assistant-${Date.now()}`;
      setMessages((prev) => [
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
    } catch {
      const errorMsgId = `err-${Date.now()}`;
      setMessages((prev) => [
        ...prev,
        {
          id: errorMsgId,
          role: 'assistant',
          content: 'Sorry, I ran into an error while processing that question. Please try again.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const openWidget = () => {
    setIsOpen(true);
    setIsMinimized(false);
  };

  const closeWidget = () => {
    setIsOpen(false);
    setIsMinimized(false);
    requestAnimationFrame(() => launcherRef.current?.focus());
  };

  const toggleMinimize = () => {
    setIsMinimized((prev) => !prev);
  };

  return (
    <div className="jawed-ai-widget">
      {/* 1. Closed State: Floating Action Launcher Trigger Pill */}
      {!isOpen && (
        <button
          className="jawed-ai-toggle"
          ref={launcherRef}
          type="button"
          aria-expanded="false"
          aria-label="Open Jawed AI Assistant"
          onClick={openWidget}
        >
          💬 Ask Jawed AI
        </button>
      )}

      {/* 2. Minimized State: Compact Bottom Bar */}
      {isOpen && isMinimized && (
        <div className="jawed-ai-minimized-bar">
          <button
            className="jawed-ai-minimized-info"
            type="button"
            aria-label="Expand Jawed AI Assistant"
            onClick={openWidget}
          >
            <span className="online-indicator" aria-hidden="true" />
            <strong>Jawed AI Assistant</strong>
          </button>
          <div className="jawed-ai-header-actions">
            <button
              className="jawed-ai-action-btn"
              type="button"
              aria-label="Expand Assistant"
              title="Expand"
              onClick={openWidget}
            >
              ▲
            </button>
            <button
              className="jawed-ai-action-btn"
              type="button"
              aria-label="Close Assistant"
              title="Close"
              onClick={closeWidget}
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* 3. Open State: Full Dialog */}
      {isOpen && !isMinimized && (
        <div className="jawed-ai-panel" role="region" aria-label="Jawed AI Assistant">
          {/* Header Bar */}
          <div className="jawed-ai-widget-header">
            <div className="jawed-ai-header-titles">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="online-indicator" aria-hidden="true" />
                <strong>Jawed AI Assistant</strong>
              </div>
              <span>Grounded in Jawed's notes &amp; tools</span>
            </div>
            <div className="jawed-ai-header-actions">
              <button
                className="jawed-ai-action-btn"
                type="button"
                aria-label="Minimize Assistant"
                title="Minimize"
                onClick={toggleMinimize}
              >
                −
              </button>
              <button
                className="jawed-ai-action-btn"
                type="button"
                aria-label="Close Assistant"
                title="Close"
                onClick={closeWidget}
              >
                ✕
              </button>
            </div>
          </div>

          <div className="jawed-ai-widget-privacy">
            🔒 Answers retrieved from published technical guides &amp; documentation.
          </div>

          {/* Contained Scrollable Message History */}
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

                {/* Interactive Direct Contact Button on Knowledge Fallback */}
                {m.isFallback && (
                  <div style={{ marginTop: '10px' }}>
                    <Link
                      to={`/contact?question=${encodeURIComponent(m.userQuery || '')}`}
                      onClick={closeWidget}
                      className="button button-primary"
                      style={{
                        fontSize: '0.82rem',
                        padding: '7px 14px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        textDecoration: 'none',
                        borderRadius: '8px',
                        background: '#0284c7',
                        color: '#ffffff',
                      }}
                    >
                      ✉️ Ask Jawed Directly →
                    </Link>
                  </div>
                )}

                {/* Documentation Source Chips */}
                {m.sources && m.sources.length > 0 && (
                  <div className="jawed-ai-widget-sources" style={{ marginTop: '8px' }}>
                    <small style={{ fontWeight: 600, color: 'var(--text-muted)' }}>Sources:</small>
                    {m.sources.map((src, sIdx) => (
                      <Link
                        key={sIdx}
                        to={src.url}
                        onClick={closeWidget}
                        style={{ display: 'block', fontSize: '0.8rem', color: 'var(--accent-hover)', marginTop: '2px' }}
                      >
                        {src.title}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div
                className="jawed-ai-widget-message assistant"
                style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}
              >
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
                ref={inputRef}
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
