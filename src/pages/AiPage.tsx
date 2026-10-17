import React, { useState, useRef, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { askJawedAi, ChatMessage, ChatSource } from '../services/aiService';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  sources?: ChatSource[];
}

export const AiPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialQ = searchParams.get('q') || '';

  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content:
        'Hi! I’m Jawed AI. I can help you explore practical IT troubleshooting guides, interactive browser tools, workplace technology case studies, and resources on Jawed.co.in.\n\nTry questions like: "How can I troubleshoot a Windows sign-in issue?", "Where can I explore retirement planning?", or "Who is Jawed?"'
    }
  ]);
  const [inputVal, setInputVal] = useState(initialQ);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const chatBottomRef = useRef<HTMLDivElement>(null);

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
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, busy]);

  // If initial query provided via URL param, auto-send or set
  useEffect(() => {
    if (initialQ.trim() && messages.length === 1) {
      handleAsk(initialQ.trim());
    }
  }, []);

  const handleAsk = async (question: string) => {
    const q = question.trim();
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

    setInputVal('');
    setStatus('Thinking…');
    setBusy(true);

    // Append user message
    const updatedMessages: Message[] = [...messages, { role: 'user', content: q }];
    setMessages(updatedMessages);

    try {
      const historyToSend: ChatMessage[] = updatedMessages
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .map((m) => ({ role: m.role, content: m.content }));

      const response = await askJawedAi(historyToSend);

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: response.reply,
          sources: response.sources
        }
      ]);
      setStatus('');
    } catch (err) {
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
        setStatus('Unable to process question. Please try again.');
      }
    } finally {
      setBusy(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleAsk(inputVal);
  };

  const suggestedPrompts = [
    'What IT support skills does Jawed have?',
    'Which tools can help my career?',
    'How does Jawed approach troubleshooting?',
    'What is Jawed learning?',
    'How can I contact Jawed?'
  ];

  return (
    <main id="main-content" className="container narrow page">
      <p className="eyebrow">Jawed AI</p>
      <h1>Jawed AI</h1>
      <p className="lead">
        A grounded assistant for discovering practical IT notes, browser tools, career insights, and resources on Jawed.co.in.
      </p>

      {/* Suggested Prompts */}
      <div style={{ marginBottom: '1.5rem' }}>
        <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--muted)', marginBottom: '0.5rem' }}>
          Suggested questions:
        </p>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {suggestedPrompts.map((prompt) => (
            <button
              key={prompt}
              type="button"
              className="button button-secondary"
              onClick={() => handleAsk(prompt)}
              disabled={busy}
              style={{ fontSize: '0.82rem', padding: '0.35rem 0.75rem', borderRadius: '16px' }}
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>

      {!isOnline && (
        <div
          style={{
            backgroundColor: '#fef3c7',
            color: '#92400e',
            padding: '12px 16px',
            borderRadius: '8px',
            marginBottom: '1.5rem',
            fontWeight: 600,
            fontSize: '0.92rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            border: '1px solid #fde68a'
          }}
        >
          <span>📡</span>
          <span>Jawed AI needs internet. Please reconnect to Wi-Fi or mobile data to submit questions.</span>
        </div>
      )}

      {/* Main Chat Shell */}
      <section className="ai-shell" aria-labelledby="ai-title" style={{ border: '1px solid var(--line)', borderRadius: '8px', padding: '1.5rem', backgroundColor: 'var(--surface)' }}>
        <div className="ai-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--line)', paddingBottom: '0.75rem' }}>
          <div>
            <h2 id="ai-title" style={{ margin: 0, fontSize: '1.25rem' }}>Ask about this site</h2>
            <p className="form-note" style={{ margin: 0, color: 'var(--muted)', fontSize: '0.85rem' }}>
              Follow-up questions maintain recent context.
            </p>
          </div>
          {messages.length > 1 && (
            <button
              type="button"
              onClick={() =>
                setMessages([
                  {
                    role: 'assistant',
                    content: 'Chat cleared. How can I help you find guides, tools, or work info today?'
                  }
                ])
              }
              className="button button-secondary"
              style={{ padding: '0.25rem 0.6rem', fontSize: '0.8rem' }}
            >
              Clear Chat
            </button>
          )}
        </div>

        {/* Message Thread */}
        <div
          id="ai-messages"
          className="ai-messages"
          role="log"
          aria-live="polite"
          style={{
            maxHeight: '480px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            paddingRight: '0.5rem',
            marginBottom: '1rem'
          }}
        >
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`ai-message ${m.role === 'user' ? 'ai-message-user' : 'ai-message-assistant'}`}
              style={{
                alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '88%',
                backgroundColor: m.role === 'user' ? 'var(--accent)' : '#fff',
                color: m.role === 'user' ? '#fff' : 'var(--text)',
                padding: '1rem',
                borderRadius: '8px',
                border: m.role === 'user' ? 'none' : '1px solid var(--line)',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
              }}
            >
              <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.4rem', opacity: 0.9 }}>
                {m.role === 'user' ? 'You' : 'Jawed AI'}
              </div>
              <div style={{ whiteSpace: 'pre-line', lineHeight: 1.6, fontSize: '0.95rem' }}>
                {m.content}
              </div>

              {/* Source Badges */}
              {m.sources && m.sources.length > 0 && (
                <div style={{ marginTop: '0.75rem', paddingTop: '0.5rem', borderTop: '1px solid var(--line)' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: '0.35rem' }}>
                    Relevant Pages on Jawed.co.in:
                  </span>
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                    {m.sources.map((s, sIdx) => (
                      <Link
                        key={sIdx}
                        to={s.url}
                        style={{
                          fontSize: '0.75rem',
                          background: 'var(--surface-accent)',
                          color: 'var(--accent)',
                          padding: '0.2rem 0.5rem',
                          borderRadius: '4px',
                          textDecoration: 'none',
                          fontWeight: 500,
                          border: '1px solid var(--line)'
                        }}
                      >
                        📄 {s.title}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}

          {busy && (
            <div
              style={{
                alignSelf: 'flex-start',
                backgroundColor: '#fff',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                border: '1px solid var(--line)',
                fontSize: '0.9rem',
                color: 'var(--muted)'
              }}
            >
              Thinking and searching site knowledge…
            </div>
          )}
          <div ref={chatBottomRef} />
        </div>

        {/* Privacy Note */}
        <p className="form-note ai-privacy-note" style={{ fontSize: '0.8rem', color: 'var(--muted)', marginBottom: '0.75rem' }}>
          🔒 Queries are processed with client-side knowledge retrieval and deterministic guardrails. Do not enter passwords, private keys, or confidential employer data. <Link to="/privacy/">Privacy Policy</Link>.
        </p>

        {/* Question Form */}
        <form id="ai-form" className="ai-form" onSubmit={handleSubmit}>
          <label htmlFor="ai-input" style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.4rem' }}>
            Your Question
          </label>
          <div className="ai-form-row" style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              id="ai-input"
              name="question"
              type="text"
              autoComplete="off"
              placeholder="Ask about Jawed.co.in…"
              maxLength={500}
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              disabled={busy}
              style={{ flex: 1, padding: '0.65rem 0.85rem', border: '1px solid var(--line)', borderRadius: '6px', fontSize: '0.95rem' }}
              required
            />
            <button className="button" type="submit" disabled={busy || !inputVal.trim()} style={{ minWidth: '80px' }}>
              {busy ? '…' : 'Ask'}
            </button>
          </div>
          {status && (
            <p id="ai-status" className="form-note" role="status" aria-live="polite" style={{ marginTop: '0.5rem', color: 'var(--accent)', fontSize: '0.85rem' }}>
              {status}
            </p>
          )}
        </form>
      </section>

      {/* What Jawed AI Covers */}
      <section className="content-section" style={{ marginTop: '3rem' }}>
        <h2>What Jawed AI Covers</h2>
        <div className="card-grid two">
          <article className="card">
            <h3>Notes &amp; Troubleshooting</h3>
            <p>Step-by-step diagnostic workflows for Windows, macOS, networking, and IT Service Desk triage.</p>
            <Link to="/notes/">Browse Notes →</Link>
          </article>
          <article className="card">
            <h3>Interactive Tools</h3>
            <p>Browser-based utilities for ticket note formatting, career match, SIP calculations, and goal planning.</p>
            <Link to="/tools/">Explore Tools →</Link>
          </article>
          <article className="card">
            <h3>Official Resources</h3>
            <p>Curated documentation links across Apple platform deployment, Microsoft 365, and ITIL practices.</p>
            <Link to="/resources/">Browse Resources →</Link>
          </article>
          <article className="card">
            <h3>Professional Work</h3>
            <p>Jawed’s background, enterprise experience, certifications, recognition, and operational philosophy.</p>
            <Link to="/work/">View Work Profile →</Link>
          </article>
        </div>
      </section>

      <section className="content-section">
        <h2>Privacy and Safe Use Notice</h2>
        <p style={{ color: 'var(--muted)', fontSize: '0.95rem', lineHeight: 1.6 }}>
          Jawed AI is designed to help you quickly navigate public content on this site. It will never ask for or store passwords, confidential company credentials, or personally identifiable information. Responses are grounded in published notes and documentation.
        </p>
      </section>
    </main>
  );
};
