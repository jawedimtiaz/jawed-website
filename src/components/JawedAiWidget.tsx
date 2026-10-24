import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { askJawedAi } from '../services/aiKnowledgeEngine';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: { url: string; title: string; summary: string }[];
  isFallback?: boolean;
  userQuery?: string;
}

export const JawedAiWidget: React.FC = () => {
  const isOnline = useOnlineStatus();
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [speechNotice, setSpeechNotice] = useState<string | null>(null);

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
  const recognitionRef = useRef<any>(null);
  const baseQueryRef = useRef<string>('');
  const noticeTimeoutRef = useRef<any>(null);
  const location = useLocation();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        setSpeechSupported(true);
      }
    }
  }, []);

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

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore if already stopped
      }
    }
    setIsListening(false);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        stopListening();
        setIsOpen(false);
        setIsMinimized(false);
        requestAnimationFrame(() => launcherRef.current?.focus());
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, stopListening]);

  // Cleanup on unmount or when closed
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }
      if (noticeTimeoutRef.current) {
        clearTimeout(noticeTimeoutRef.current);
      }
    };
  }, []);

  // Hide widget on dedicated /ai page
  if (location.pathname.startsWith('/ai')) {
    return null;
  }

  const showNotice = (msg: string) => {
    setSpeechNotice(msg);
    if (noticeTimeoutRef.current) {
      clearTimeout(noticeTimeoutRef.current);
    }
    noticeTimeoutRef.current = setTimeout(() => {
      setSpeechNotice(null);
    }, 4500);
  };

  const startListening = () => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      showNotice('Speech recognition is not supported in this browser. Try Chrome, Edge, or Safari.');
      return;
    }

    try {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      baseQueryRef.current = query.trim();

      recognition.onstart = () => {
        setIsListening(true);
        setSpeechNotice(null);
      };

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.resultIndex !== undefined ? event.results[i][0].transcript : '';
        }

        const base = baseQueryRef.current;
        const newText = base ? `${base} ${transcript.trim()}` : transcript.trim();
        setQuery(newText);
      };

      recognition.onerror = (event: any) => {
        setIsListening(false);
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          showNotice('Microphone permission was denied. Please allow microphone access.');
        } else if (event.error === 'no-speech') {
          // Silent timeout
        } else if (event.error === 'network') {
          showNotice('Voice recognition network connection error.');
        } else {
          showNotice(`Voice recognition error: ${event.error}`);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setIsListening(false);
      showNotice('Could not start microphone. Please check browser permissions.');
    }
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const handleSend = async () => {
    if (isListening) {
      stopListening();
    }

    const userText = query.trim();
    if (!userText || loading) return;

    const userMsgId = `user-${Date.now()}`;
    setMessages((prev) => [...prev, { id: userMsgId, role: 'user', content: userText }]);
    setQuery('');

    if (!isOnline) {
      const assistantMsgId = `assistant-${Date.now()}`;
      setMessages((prev) => [
        ...prev,
        {
          id: assistantMsgId,
          role: 'assistant',
          content: 'Jawed AI needs internet',
          isFallback: true,
          userQuery: userText,
        },
      ]);
      return;
    }

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
    stopListening();
    setIsOpen(false);
    setIsMinimized(false);
    requestAnimationFrame(() => launcherRef.current?.focus());
  };

  const toggleMinimize = () => {
    if (!isMinimized) {
      stopListening();
    }
    setIsMinimized((prev) => !prev);
  };

  return (
    <div className="jawed-ai-widget">
      {/* 1. Closed State: Floating Action Launcher Trigger Pill */}
      {!isOpen && (
        <button
          ref={launcherRef}
          className="jawed-ai-toggle"
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
                <span
                  className={isOnline ? "online-indicator" : "offline-indicator"}
                  aria-hidden="true"
                  style={!isOnline ? { background: '#ef4444' } : undefined}
                />
                <strong>Jawed AI Assistant</strong>
                {!isOnline && (
                  <span style={{ fontSize: '0.72rem', background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                    Offline
                  </span>
                )}
              </div>
              <span>{isOnline ? "Grounded in Jawed's notes & tools" : "Jawed AI needs internet"}</span>
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
            🔒 Hands-free voice enabled for field technicians. Local notes grounded.
          </div>

          {/* Contained Scrollable Message History */}
          <div
            className="jawed-ai-widget-messages"
            role="log"
            aria-live="polite"
            aria-relevant="additions"
            aria-atomic="false"
            aria-busy={loading}
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
                role="status"
                aria-live="polite"
              >
                Searching documentation...
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Spacious & Accessible Input Form with Web Speech API */}
          <form
            className="jawed-ai-widget-form"
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
          >
            {/* Real-time Hands-free Listening Bar */}
            {isListening && (
              <div className="jawed-ai-voice-bar" role="status" aria-live="polite">
                <div className="jawed-ai-voice-bar-left">
                  <span className="voice-pulse-dot" aria-hidden="true" />
                  <span>Listening hands-free... Speak your troubleshooting issue</span>
                </div>
                <button
                  type="button"
                  className="jawed-ai-voice-done-btn"
                  onClick={stopListening}
                  aria-label="Finish voice dictation"
                >
                  Done
                </button>
              </div>
            )}

            {/* Error or browser support notice */}
            {speechNotice && (
              <div className="jawed-ai-voice-notice" role="alert">
                {speechNotice}
              </div>
            )}

            <div className="jawed-ai-input-row">
              <input
                ref={inputRef}
                type="text"
                placeholder={
                  !isOnline
                    ? 'Jawed AI needs internet'
                    : isListening
                    ? 'Listening... Speak into microphone...'
                    : 'Ask a question or describe an issue...'
                }
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                disabled={loading}
                aria-label="Type or dictate your question for Jawed AI"
                className={isListening ? 'is-listening' : ''}
              />

              {/* Web Speech API Voice Dictation Button */}
              <button
                type="button"
                className={`jawed-ai-mic-btn ${isListening ? 'active' : ''}`}
                onClick={toggleListening}
                disabled={loading}
                aria-label={
                  isListening
                    ? 'Stop hands-free voice dictation'
                    : 'Start hands-free voice dictation'
                }
                title={
                  !speechSupported
                    ? 'Voice dictation (Web Speech API)'
                    : isListening
                    ? 'Stop listening'
                    : 'Dictate hands-free issue (Web Speech API)'
                }
              >
                {isListening ? (
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <rect x="6" y="6" width="12" height="12" rx="2" />
                  </svg>
                ) : (
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                    <line x1="12" y1="19" x2="12" y2="22" />
                  </svg>
                )}
              </button>

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
