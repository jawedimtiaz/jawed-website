import React, { useState, useRef, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { askJawedAi, ChatMessage, ChatSource } from '../../services/aiService';

interface WidgetMessage {
  role: 'user' | 'assistant';
  content: string;
  sources?: ChatSource[];
}

export const JawedAiWidget: React.FC = () => {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [inputVal, setInputVal] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [messages, setMessages] = useState<WidgetMessage[]>([
    {
      role: 'assistant',
      content: 'Hi. Ask me about Jawed.co.in notes, tools, resources or work.'
    }
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  // Don't render floating widget on the dedicated /ai/ page
  const isAiPage = location.pathname.startsWith('/ai');

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setStatus('');
    };
    const handleOffline = () => {
      setIsOnline(false);
      setStatus('Jawed AI needs internet');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [isOpen, messages]);

  if (isAiPage) {
    return null;
  }

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = inputVal.trim();
    if (!q || busy) return;

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setStatus('Jawed AI needs internet');
      setMessages((prev) => [
        ...prev,
        { role: 'user', content: q },
        {
          role: 'assistant',
          content: '📡 Jawed AI needs internet to search site knowledge. Please check your connection and try again.'
        }
      ]);
      setInputVal('');
      return;
    }

    const userMsg: WidgetMessage = { role: 'user', content: q };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInputVal('');
    setBusy(true);
    setStatus('Thinking…');

    try {
      const historyForApi: ChatMessage[] = updatedMessages.map((m) => ({
        role: m.role,
        content: m.content
      }));

      const res = await askJawedAi(historyForApi);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: res.reply,
          sources: res.sources
        }
      ]);
      setStatus('');
    } catch {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        setStatus('Jawed AI needs internet');
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: '📡 Jawed AI needs internet to search site knowledge. Please check your connection and try again.'
          }
        ]);
      } else {
        setStatus('Unable to retrieve an answer right now. Please try again.');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="jawed-ai-widget">
      <button
        type="button"
        className="jawed-ai-toggle"
        aria-expanded={isOpen}
        aria-controls="jawed-ai-panel"
        aria-label={isOpen ? 'Close Jawed AI' : 'Open Jawed AI'}
        onClick={handleToggle}
      >
        <span>Ask AI</span>
      </button>

      {isOpen && (
        <section
          id="jawed-ai-panel"
          className="jawed-ai-panel"
          role="dialog"
          aria-modal="false"
          aria-labelledby="jawed-ai-title"
        >
          <div className="jawed-ai-widget-header">
            <strong id="jawed-ai-title">Jawed AI</strong>
            <div className="jawed-ai-widget-actions">
              <button
                type="button"
                className="jawed-ai-btn"
                aria-label="Minimize Jawed AI"
                onClick={handleClose}
              >
                −
              </button>
              <button
                type="button"
                className="jawed-ai-btn"
                aria-label="Close Jawed AI"
                onClick={handleClose}
              >
                ×
              </button>
            </div>
          </div>

          {!isOnline && (
            <div
              style={{
                backgroundColor: '#fef3c7',
                color: '#92400e',
                padding: '8px 12px',
                fontSize: '0.82rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                borderBottom: '1px solid #fde68a'
              }}
            >
              <span>📡</span>
              <span>Jawed AI needs internet to search site knowledge.</span>
            </div>
          )}

          <p className="jawed-ai-widget-privacy">
            Questions and recent context are processed by the site’s AI service. Do not enter passwords, authentication codes, sensitive personal information or confidential work data.{' '}
            <Link to="/privacy/" onClick={handleClose}>
              Privacy details
            </Link>
            .
          </p>

          <div
            className="jawed-ai-widget-messages"
            role="log"
            aria-live="polite"
            aria-label="Jawed AI conversation"
          >
            {messages.map((m, idx) => (
              <div key={idx} className={`jawed-ai-bubble ${m.role}`}>
                <div>{m.content}</div>
                {m.sources && m.sources.length > 0 && (
                  <div className="ai-sources-box" style={{ marginTop: '6px' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.8rem' }}>Sources:</span>
                    <ul>
                      {m.sources.slice(0, 3).map((s, sIdx) => (
                        <li key={sIdx}>
                          <Link to={s.url} onClick={handleClose}>
                            {s.title}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <form className="jawed-ai-widget-form" onSubmit={handleSubmit}>
            <input
              ref={inputRef}
              type="text"
              placeholder="Ask about this site…"
              maxLength={500}
              value={inputVal}
              disabled={busy}
              onChange={(e) => setInputVal(e.target.value)}
              aria-label="Ask Jawed AI"
            />
            <button
              type="submit"
              className="button"
              style={{ marginTop: '8px', width: '100%' }}
              disabled={busy || !inputVal.trim()}
            >
              {busy ? 'Thinking…' : 'Ask'}
            </button>
            {status && (
              <p
                style={{
                  margin: '6px 0 0',
                  fontSize: '0.82rem',
                  color: 'var(--muted)'
                }}
              >
                {status}
              </p>
            )}
          </form>
        </section>
      )}
    </div>
  );
};
