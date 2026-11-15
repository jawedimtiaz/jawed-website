import React, { useState, useRef, useCallback } from 'react';
import { Copy, Check, Terminal } from 'lucide-react';
import { copyToClipboard } from './CopyButton';

export const TOOL_OUTPUT_COPY_BUTTON_LABEL = 'Copy to Clipboard';
export const TOOL_OUTPUT_COPIED_LABEL = 'Copied to Clipboard!';
export const TOOL_OUTPUT_LIVE_REGION_MESSAGE = 'Tool output copied to clipboard.';

export interface ClipboardWriterAdapter {
  writeText?: (text: string) => Promise<void>;
}

export interface CopyToolOutputResult {
  ok: boolean;
  copiedText: string;
  label: string;
  announcement: string;
}

/**
 * Copies tool output text to the user's clipboard with support for dependency-injected
 * clipboard adapters (for unit testing) and fallback DOM copy in restricted environments.
 */
export async function copyToolOutputText(
  content: string,
  clipboardOverride?: ClipboardWriterAdapter
): Promise<CopyToolOutputResult> {
  const normalized = typeof content === 'string' ? content : String(content ?? '');
  if (!normalized.trim()) {
    return {
      ok: false,
      copiedText: '',
      label: TOOL_OUTPUT_COPY_BUTTON_LABEL,
      announcement: 'No tool output available to copy.',
    };
  }

  let ok = false;
  if (clipboardOverride && typeof clipboardOverride.writeText === 'function') {
    try {
      await clipboardOverride.writeText(normalized);
      ok = true;
    } catch {
      ok = false;
    }
  } else {
    ok = await copyToClipboard(normalized);
  }

  return {
    ok,
    copiedText: ok ? normalized : '',
    label: ok ? TOOL_OUTPUT_COPIED_LABEL : TOOL_OUTPUT_COPY_BUTTON_LABEL,
    announcement: ok ? TOOL_OUTPUT_LIVE_REGION_MESSAGE : 'Failed to copy tool output.',
  };
}

export interface ToolOutputProps {
  /** Optional HTML id attribute for the .tool-output element */
  id?: string;
  /** Explicit text string or getter function to copy when 'Copy to Clipboard' is clicked */
  content?: string | (() => string);
  /** Rendered output content inside the .tool-output block */
  children?: React.ReactNode;
  /** Accessible title/label for the output region and toolbar */
  title?: string;
  /** Custom label for the copy button in idle state (defaults to 'Copy to Clipboard') */
  copyLabel?: string;
  /** Custom label for the copy button after copying (defaults to 'Copied to Clipboard!') */
  copiedLabel?: string;
  /** HTML element tag used for the .tool-output surface (defaults to 'pre') */
  as?: 'pre' | 'div';
  /** Whether to display the integrated header bar with the 'Copy to Clipboard' button */
  showToolbar?: boolean;
  /** Whether to display the inline 'Copy to Clipboard' button directly inside .tool-output */
  showInlineCopyButton?: boolean;
  /** Additional CSS class names applied to the .tool-output element */
  className?: string;
  /** Inline styles applied to the .tool-output element */
  style?: React.CSSProperties;
  /** Test ID for the .tool-output element */
  testId?: string;
  /** Test ID for the 'Copy to Clipboard' button */
  copyButtonTestId?: string;
  /** Optional callback fired when the output is copied to the clipboard */
  onCopy?: (copiedText: string) => void;
}

/**
 * Accessible ToolOutput component that wraps `.tool-output` content with a built-in
 * 'Copy to Clipboard' button directly inside `.tool-output` (and in its header toolbar),
 * keyboard focus support, and ARIA live-region announcements.
 */
export const ToolOutput: React.FC<ToolOutputProps> = ({
  id,
  content,
  children,
  title = 'Tool Output',
  copyLabel = TOOL_OUTPUT_COPY_BUTTON_LABEL,
  copiedLabel = TOOL_OUTPUT_COPIED_LABEL,
  as: ComponentTag = 'pre',
  showToolbar = true,
  showInlineCopyButton = true,
  className = '',
  style,
  testId = 'tool-output',
  copyButtonTestId = 'tool-output-copy-btn',
  onCopy,
}) => {
  const [isCopied, setIsCopied] = useState(false);
  const [liveAnnouncement, setLiveAnnouncement] = useState('');
  const outputRef = useRef<HTMLSpanElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const evaluatedContent = typeof content === 'function' ? content() : content;

  const resolveOutputText = useCallback((): string => {
    const resolvedProp = typeof content === 'function' ? content() : content;
    if (typeof resolvedProp === 'string' && resolvedProp.length > 0) {
      return resolvedProp;
    }
    if (typeof children === 'string') {
      return children;
    }
    if (typeof children === 'number') {
      return String(children);
    }
    if (outputRef.current?.textContent) {
      return outputRef.current.textContent;
    }
    return '';
  }, [content, children]);

  const handleCopyClick = useCallback(
    async (event: React.MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.stopPropagation();

      const textToCopy = resolveOutputText();
      const result = await copyToolOutputText(textToCopy);
      if (result.ok) {
        setIsCopied(true);
        setLiveAnnouncement(result.announcement);
        if (onCopy) {
          onCopy(result.copiedText);
        }
        if (timerRef.current) {
          clearTimeout(timerRef.current);
        }
        timerRef.current = setTimeout(() => {
          setIsCopied(false);
          setLiveAnnouncement('');
        }, 2200);
      }
    },
    [resolveOutputText, onCopy]
  );

  return (
    <div
      className="tool-output-wrapper"
      data-testid="tool-output-wrapper"
      role="region"
      aria-label={title}
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: '10px',
      }}
    >
      {showToolbar && (
        <div
          className="tool-output-toolbar no-print"
          data-testid="tool-output-toolbar"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            flexWrap: 'wrap',
            padding: '6px 12px',
            background: 'var(--surface-accent, rgba(15, 23, 42, 0.55))',
            border: '1px solid var(--border, rgba(148, 163, 184, 0.2))',
            borderBottom: 'none',
            borderTopLeftRadius: '10px',
            borderTopRightRadius: '10px',
          }}
        >
          <span
            className="tool-output-toolbar-label"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.75rem',
              fontWeight: 700,
              color: 'var(--muted, #94a3b8)',
              letterSpacing: '0.03em',
              textTransform: 'uppercase',
            }}
          >
            <Terminal size={13} aria-hidden="true" style={{ color: 'var(--accent, #38bdf8)' }} />
            <span>{title}</span>
          </span>

          <button
            type="button"
            onClick={handleCopyClick}
            data-testid={copyButtonTestId}
            data-copied={isCopied}
            className={`tool-output-copy-btn copy-button ${isCopied ? 'is-copied copied' : ''}`}
            aria-label={isCopied ? `${copiedLabel} (${title})` : `${copyLabel} (${title})`}
            title={isCopied ? copiedLabel : copyLabel}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              borderRadius: '6px',
              fontSize: '0.76rem',
              fontWeight: 600,
              cursor: 'pointer',
              background: isCopied
                ? 'rgba(16, 185, 129, 0.16)'
                : 'var(--surface, rgba(30, 41, 59, 0.85))',
              color: isCopied ? 'var(--emerald, #10b981)' : 'var(--text-heading, #f8fafc)',
              border: isCopied
                ? '1px solid rgba(16, 185, 129, 0.45)'
                : '1px solid var(--border, rgba(148, 163, 184, 0.28))',
              transition: 'all 0.16s ease',
            }}
          >
            {isCopied ? (
              <Check size={13} aria-hidden="true" style={{ color: 'var(--emerald, #10b981)', flexShrink: 0 }} />
            ) : (
              <Copy size={13} aria-hidden="true" style={{ color: 'var(--accent, #38bdf8)', flexShrink: 0 }} />
            )}
            <span data-testid={`${copyButtonTestId}-label`}>
              {isCopied ? copiedLabel : copyLabel}
            </span>
          </button>
        </div>
      )}

      {/* Screen-reader live region for clipboard copy confirmation */}
      <span
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        data-testid="tool-output-copy-status"
      >
        {liveAnnouncement}
      </span>

      <ComponentTag
        id={id}
        className={`tool-output ${className}`.trim()}
        data-testid={testId}
        tabIndex={0}
        aria-label={`${title} content`}
        style={{
          position: 'relative',
          marginTop: 0,
          ...(showToolbar
            ? {
                borderTopLeftRadius: 0,
                borderTopRightRadius: 0,
              }
            : {}),
          ...style,
        }}
      >
        {showInlineCopyButton && (
          <span
            className="tool-output-inline-copy-wrap no-print"
            style={{
              float: 'right',
              marginLeft: '12px',
              marginBottom: '8px',
            }}
          >
            <button
              type="button"
              onClick={handleCopyClick}
              data-testid={`${copyButtonTestId}-inline`}
              data-copied={isCopied}
              className={`tool-output-copy-btn tool-output-inline-copy-btn copy-button ${
                isCopied ? 'is-copied copied' : ''
              }`}
              aria-label={isCopied ? `${copiedLabel} (${title})` : `${copyLabel} (${title})`}
              title={isCopied ? copiedLabel : copyLabel}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '3px 9px',
                borderRadius: '6px',
                fontSize: '0.74rem',
                fontWeight: 600,
                fontFamily: 'system-ui, -apple-system, sans-serif',
                cursor: 'pointer',
                background: isCopied
                  ? 'rgba(16, 185, 129, 0.18)'
                  : 'rgba(15, 23, 42, 0.88)',
                color: isCopied ? 'var(--emerald, #10b981)' : 'var(--text-heading, #f8fafc)',
                border: isCopied
                  ? '1px solid rgba(16, 185, 129, 0.45)'
                  : '1px solid rgba(148, 163, 184, 0.3)',
                transition: 'all 0.16s ease',
              }}
            >
              {isCopied ? (
                <Check size={12} aria-hidden="true" style={{ color: 'var(--emerald, #10b981)', flexShrink: 0 }} />
              ) : (
                <Copy size={12} aria-hidden="true" style={{ color: 'var(--accent, #38bdf8)', flexShrink: 0 }} />
              )}
              <span data-testid={`${copyButtonTestId}-inline-label`}>
                {isCopied ? copiedLabel : copyLabel}
              </span>
            </button>
          </span>
        )}
        <span
          ref={outputRef}
          className="tool-output-content"
          data-testid={`${testId}-content`}
        >
          {children ?? evaluatedContent}
        </span>
      </ComponentTag>
    </div>
  );
};

export default ToolOutput;
