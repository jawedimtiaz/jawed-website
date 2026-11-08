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

function parseInlineFormatting(text: string) {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
  return parts.map((segment, sIdx) => {
    if (segment.startsWith('`') && segment.endsWith('`')) {
      return (
        <code
          key={sIdx}
          style={{
            background: 'rgba(56, 189, 248, 0.15)',
            color: '#38bdf8',
            padding: '2px 4px',
            borderRadius: '4px',
            fontSize: '0.85em',
            fontFamily: 'monospace',
          }}
        >
          {segment.slice(1, -1)}
        </code>
      );
    }
    if (segment.startsWith('**') && segment.endsWith('**')) {
      return <strong key={sIdx} style={{ fontWeight: 700 }}>{segment.slice(2, -2)}</strong>;
    }
    return segment;
  });
}

function renderMarkdown(text: string) {
  if (!text) return null;
  const parts = text.split(/(```[\s\S]*?```)/g);

  return parts.map((part, index) => {
    if (part.startsWith('```') && part.endsWith('```')) {
      const lines = part.slice(3, -3).trim().split('\n');
      const firstLine = lines[0].trim();
      let codeContent = part.slice(3, -3).trim();
      if (firstLine && !firstLine.includes(' ') && lines.length > 1) {
        codeContent = lines.slice(1).join('\n');
      }
      return (
        <pre
          key={index}
          style={{
            background: '#020617',
            color: '#38bdf8',
            padding: '10px 12px',
            borderRadius: '8px',
            overflowX: 'auto',
            fontSize: '0.8rem',
            fontFamily: 'monospace',
            margin: '8px 0',
            border: '1px solid var(--border)',
          }}
        >
          <code>{codeContent}</code>
        </pre>
      );
    }

    const paragraphLines = part.split('\n');
    return (
      <div key={index} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {paragraphLines.map((line, lIdx) => {
          const trimmed = line.trim();
          if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
            const listText = trimmed.slice(2);
            return (
              <div key={lIdx} style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', marginLeft: '8px' }}>
                <span style={{ color: 'var(--accent)', fontWeight: 700 }}>•</span>
                <span>{parseInlineFormatting(listText)}</span>
              </div>
            );
          }
          const numMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
          if (numMatch) {
            const [, num, listText] = numMatch;
            return (
              <div key={lIdx} style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', marginLeft: '8px' }}>
                <span style={{ color: 'var(--accent)', fontWeight: 700 }}>{num}.</span>
                <span>{parseInlineFormatting(listText)}</span>
              </div>
            );
          }
          if (!trimmed) {
            return <div key={lIdx} style={{ height: '4px' }} />;
          }
          return (
            <div key={lIdx}>
              {parseInlineFormatting(line)}
            </div>
          );
        })}
      </div>
    );
  });
}

export interface SpeechTranscriptResult {
  finalTranscript: string;
  interimTranscript: string;
  combinedQuery: string;
}

export function getSpeechRecognitionConstructor(win?: unknown): (new () => any) | null {
  const targetWin =
    win !== undefined ? (win as Record<string, any>) : typeof window !== 'undefined' ? (window as Record<string, any>) : null;
  if (!targetWin) return null;
  return targetWin.SpeechRecognition || targetWin.webkitSpeechRecognition || null;
}

export function isWebSpeechApiSupported(win?: unknown): boolean {
  return Boolean(getSpeechRecognitionConstructor(win));
}

export function extractSpeechTranscript(
  event: any,
  baseQuery: string = ''
): SpeechTranscriptResult {
  let finalTranscript = '';
  let interimTranscript = '';

  const results = event?.results;
  if (results && typeof results.length === 'number') {
    for (let i = 0; i < results.length; i++) {
      const resultItem = results[i];
      const alternative = resultItem && resultItem[0];
      const piece = typeof alternative?.transcript === 'string' ? alternative.transcript : '';
      if (!piece) continue;
      if (resultItem.isFinal === false) {
        interimTranscript += piece;
      } else {
        finalTranscript += piece;
      }
    }
  }

  const cleanBase = (baseQuery || '').trim();
  const cleanFinal = finalTranscript.trim();
  const cleanInterim = interimTranscript.trim();
  const spoken = [cleanFinal, cleanInterim].filter(Boolean).join(' ').trim();
  const combinedQuery = [cleanBase, spoken].filter(Boolean).join(' ').trim();

  return {
    finalTranscript: cleanFinal,
    interimTranscript: cleanInterim,
    combinedQuery,
  };
}

export interface VoiceToTextSessionOptions {
  win?: unknown;
  lang?: string;
  baseQuery?: string;
  onStart?: () => void;
  onTranscript?: (result: SpeechTranscriptResult) => void;
  onError?: (errorCode: string, message: string) => void;
  onEnd?: () => void;
}

export function createVoiceToTextSession(options: VoiceToTextSessionOptions) {
  const SpeechRecognition = getSpeechRecognitionConstructor(options.win);
  if (!SpeechRecognition) {
    return null;
  }

  const recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = options.lang || 'en-US';

  recognition.onstart = () => {
    options.onStart?.();
  };

  recognition.onresult = (event: any) => {
    const parsed = extractSpeechTranscript(event, options.baseQuery || '');
    options.onTranscript?.(parsed);
  };

  recognition.onerror = (event: any) => {
    const code = event?.error || 'unknown';
    let message = `Voice recognition error: ${code}`;
    if (code === 'not-allowed' || code === 'service-not-allowed') {
      message = 'Microphone permission was denied. Please allow microphone access.';
    } else if (code === 'no-speech') {
      message = '';
    } else if (code === 'network') {
      message = 'Voice recognition network connection error.';
    }
    options.onError?.(code, message);
  };

  recognition.onend = () => {
    options.onEnd?.();
  };

  return {
    recognition,
    start: () => recognition.start(),
    stop: () => recognition.stop(),
    abort: () => {
      if (typeof recognition.abort === 'function') {
        recognition.abort();
      } else {
        recognition.stop();
      }
    },
  };
}

export const JawedAiWidget: React.FC = () => {
  const isOnline = useOnlineStatus();
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [speechSupported, setSpeechSupported] = useState(() => isWebSpeechApiSupported());
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
    setSpeechSupported(isWebSpeechApiSupported());
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
    setInterimTranscript('');
  }, []);

  useEffect(() => {
    const handleToggleWidget = () => {
      if (isOpen && !isMinimized) {
        setIsMinimized(true);
      } else {
        setIsOpen(true);
        setIsMinimized(false);
      }
    };

    const handleOpenWidget = () => {
      setIsOpen(true);
      setIsMinimized(false);
    };

    const handleCloseWidget = () => {
      if (isOpen) {
        stopListening();
        setIsOpen(false);
        setIsMinimized(false);
      }
    };

    window.addEventListener('toggle-ai-widget', handleToggleWidget);
    window.addEventListener('open-ai-widget', handleOpenWidget);
    window.addEventListener('close-all-modals', handleCloseWidget);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        stopListening();
        setIsOpen(false);
        setIsMinimized(false);
        requestAnimationFrame(() => launcherRef.current?.focus());
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('toggle-ai-widget', handleToggleWidget);
      window.removeEventListener('open-ai-widget', handleOpenWidget);
      window.removeEventListener('close-all-modals', handleCloseWidget);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, isMinimized, stopListening]);

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

    if (!isWebSpeechApiSupported(window)) {
      showNotice('Speech recognition is not supported in this browser. Try Chrome, Edge, or Safari.');
      return;
    }

    try {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }

      baseQueryRef.current = query.trim();

      const session = createVoiceToTextSession({
        win: window,
        lang: 'en-US',
        baseQuery: baseQueryRef.current,
        onStart: () => {
          setIsListening(true);
          setInterimTranscript('');
          setSpeechNotice(null);
        },
        onTranscript: (parsed) => {
          setInterimTranscript(parsed.interimTranscript);
          setQuery(parsed.combinedQuery);
        },
        onError: (_code, message) => {
          setIsListening(false);
          setInterimTranscript('');
          if (message) {
            showNotice(message);
          }
        },
        onEnd: () => {
          setIsListening(false);
          setInterimTranscript('');
        },
      });

      if (!session) {
        showNotice('Speech recognition is not supported in this browser. Try Chrome, Edge, or Safari.');
        return;
      }

      recognitionRef.current = session.recognition;
      session.start();
    } catch {
      setIsListening(false);
      setInterimTranscript('');
      showNotice('Could not start microphone. Please check browser permissions.');
    }
  };

  const toggleVoiceToTextMode = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
      inputRef.current?.focus();
    }
  };

  const toggleListening = toggleVoiceToTextMode;

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

          <div
            className="jawed-ai-widget-privacy"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px',
              flexWrap: 'wrap',
            }}
          >
            <span>🔒 Hands-free voice enabled for field technicians. Local notes grounded.</span>
            <button
              type="button"
              onClick={toggleVoiceToTextMode}
              disabled={loading}
              aria-pressed={isListening}
              data-testid="voice-to-text-mode-toggle"
              aria-label={isListening ? 'Disable voice-to-text mode' : 'Enable voice-to-text mode'}
              title={
                isListening
                  ? 'Voice-to-Text mode active — click to stop'
                  : 'Toggle Voice-to-Text mode (Web Speech API)'
              }
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '2px 8px',
                borderRadius: '999px',
                fontSize: '0.7rem',
                fontWeight: 700,
                cursor: 'pointer',
                border: isListening
                  ? '1px solid rgba(239, 68, 68, 0.55)'
                  : '1px solid rgba(56, 189, 248, 0.35)',
                background: isListening
                  ? 'rgba(239, 68, 68, 0.18)'
                  : 'rgba(56, 189, 248, 0.12)',
                color: isListening ? '#f87171' : '#38bdf8',
                transition: 'all 0.15s ease',
              }}
            >
              <span aria-hidden="true">{isListening ? '🔴' : '🎙️'}</span>
              <span>{isListening ? 'Voice-to-Text: ON' : 'Voice-to-Text'}</span>
            </button>
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
                <div>{renderMarkdown(m.content)}</div>

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
              <div
                className="jawed-ai-voice-bar"
                role="status"
                aria-live="polite"
                data-testid="jawed-ai-voice-bar"
              >
                <div className="jawed-ai-voice-bar-left">
                  <span className="voice-pulse-dot" aria-hidden="true" />
                  <span>
                    {interimTranscript
                      ? `Capturing: "${interimTranscript}"`
                      : 'Voice-to-Text active — speak your query'}
                  </span>
                </div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  {query.trim() && (
                    <button
                      type="button"
                      className="jawed-ai-voice-done-btn"
                      onClick={() => handleSend()}
                      style={{ background: '#0284c7' }}
                      aria-label="Send dictated voice query"
                    >
                      Ask Now
                    </button>
                  )}
                  <button
                    type="button"
                    className="jawed-ai-voice-done-btn"
                    onClick={stopListening}
                    aria-label="Finish voice dictation"
                  >
                    Done
                  </button>
                </div>
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
                    ? 'Voice-to-Text active... Speak into microphone...'
                    : 'Ask a question or describe an issue...'
                }
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                disabled={loading}
                aria-label="Type or dictate your question for Jawed AI"
                className={isListening ? 'is-listening' : ''}
              />

              {/* Web Speech API Voice-to-Text Toggle Button */}
              <button
                type="button"
                className={`jawed-ai-mic-btn ${isListening ? 'active' : ''}`}
                onClick={toggleVoiceToTextMode}
                disabled={loading}
                aria-pressed={isListening}
                data-testid="jawed-ai-mic-btn"
                aria-label={
                  isListening
                    ? 'Stop hands-free voice-to-text dictation'
                    : 'Start hands-free voice-to-text dictation'
                }
                title={
                  !speechSupported
                    ? 'Voice-to-Text mode (Web Speech API)'
                    : isListening
                    ? 'Disable Voice-to-Text mode'
                    : 'Enable Voice-to-Text mode (Web Speech API)'
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

