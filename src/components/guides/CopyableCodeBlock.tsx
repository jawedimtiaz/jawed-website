import React, { useState } from 'react';
import { Copy, Check, Terminal, FileCode } from 'lucide-react';
import {
  copyCodeBlockAsMarkdown,
  formatCodeBlockAsMarkdown,
  CODE_MARKDOWN_BUTTON_LABEL,
  CODE_MARKDOWN_COPIED_LABEL,
} from '../../utils/tocGenerator';

export interface CopyableCodeBlockProps {
  label?: string;
  command: string;
  output?: string;
  promptSymbol?: '$' | '#' | 'Switch#' | 'MacBook:~';
  language?: string;
}

export const CopyableCodeBlock: React.FC<CopyableCodeBlockProps> = ({
  label,
  command,
  output,
  promptSymbol = '#',
  language = 'bash',
}) => {
  const [copied, setCopied] = useState(false);
  const [copiedMarkdown, setCopiedMarkdown] = useState(false);

  const handleCopy = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      void navigator.clipboard.writeText(command);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyMarkdown = async () => {
    await copyCodeBlockAsMarkdown(command, {
      language,
      label,
      promptSymbol,
      output,
    });
    setCopiedMarkdown(true);
    setTimeout(() => setCopiedMarkdown(false), 2000);
  };

  const markdownPreview = formatCodeBlockAsMarkdown(command, {
    language,
    label,
    promptSymbol,
    output,
  });

  return (
    <div
      className="note-code-block-wrapper"
      data-testid="copyable-cli-block"
      style={{
        background: 'var(--bg-darker)',
        border: '1px solid var(--line)',
        borderRadius: '12px',
        margin: '20px 0',
        overflow: 'hidden',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
      }}
    >
      <div
        className="note-code-block-toolbar"
        style={{
          background: 'var(--surface)',
          borderBottom: '1px solid var(--line)',
          padding: '8px 14px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Terminal size={16} style={{ color: 'var(--accent)' }} />
          <span
            style={{
              fontSize: '0.8rem',
              fontWeight: 700,
              color: 'var(--text-heading)',
              fontFamily: 'monospace',
            }}
          >
            {label || 'CLI COMMAND'}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={handleCopyMarkdown}
            data-testid="copy-code-markdown-btn"
            data-markdown-content={markdownPreview}
            className={`note-code-copy-markdown-btn${copiedMarkdown ? ' is-copied' : ''}`}
            style={{
              background: copiedMarkdown ? 'rgba(52, 211, 153, 0.15)' : 'var(--bg-darker)',
              border: copiedMarkdown ? '1px solid var(--emerald)' : '1px solid var(--line)',
              color: copiedMarkdown ? 'var(--emerald)' : 'var(--nav-link)',
              padding: '4px 10px',
              borderRadius: '6px',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease',
            }}
            title="Copy formatted code block as Markdown for documentation or tickets"
            aria-label={copiedMarkdown ? CODE_MARKDOWN_COPIED_LABEL : CODE_MARKDOWN_BUTTON_LABEL}
          >
            {copiedMarkdown ? <Check size={14} /> : <FileCode size={14} />}
            <span>{copiedMarkdown ? CODE_MARKDOWN_COPIED_LABEL : CODE_MARKDOWN_BUTTON_LABEL}</span>
          </button>

          <button
            type="button"
            onClick={handleCopy}
            data-testid="copy-cli-raw-btn"
            style={{
              background: copied ? 'rgba(52, 211, 153, 0.15)' : 'var(--bg-darker)',
              border: copied ? '1px solid var(--emerald)' : '1px solid var(--line)',
              color: copied ? 'var(--emerald)' : 'var(--nav-link)',
              padding: '4px 10px',
              borderRadius: '6px',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease',
            }}
            title="Copy command to clipboard"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            <span>{copied ? 'Copied!' : 'Copy'}</span>
          </button>
        </div>
      </div>

      <div
        style={{
          padding: '16px',
          fontFamily: 'monospace',
          fontSize: '0.9rem',
          lineHeight: 1.6,
          overflowX: 'auto',
        }}
      >
        <div style={{ color: 'var(--accent)', display: 'flex', gap: '10px' }}>
          <span style={{ color: 'var(--teal)', userSelect: 'none', fontWeight: 700 }}>
            {promptSymbol}
          </span>
          <span style={{ color: 'var(--text-heading)', fontWeight: 600 }}>{command}</span>
        </div>

        {output && (
          <div
            style={{
              marginTop: '12px',
              paddingTop: '10px',
              borderTop: '1px dashed var(--line)',
              color: 'var(--emerald)',
              fontSize: '0.85rem',
              whiteSpace: 'pre-wrap',
              lineHeight: 1.5,
            }}
          >
            {output}
          </div>
        )}
      </div>
    </div>
  );
};

