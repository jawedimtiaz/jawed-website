import React, { useState } from 'react';
import { Copy, Check, Terminal } from 'lucide-react';

export interface CopyableCodeBlockProps {
  label?: string;
  command: string;
  output?: string;
  promptSymbol?: '$' | '#' | 'Switch#' | 'MacBook:~';
}

export const CopyableCodeBlock: React.FC<CopyableCodeBlockProps> = ({
  label,
  command,
  output,
  promptSymbol = '#'
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{
      background: 'var(--bg-darker)',
      border: '1px solid var(--line)',
      borderRadius: '12px',
      margin: '20px 0',
      overflow: 'hidden',
      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)'
    }}>
      <div style={{
        background: 'var(--surface)',
        borderBottom: '1px solid var(--line)',
        padding: '8px 14px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Terminal size={16} style={{ color: 'var(--accent)' }} />
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-heading)', fontFamily: 'monospace' }}>
            {label || 'CLI COMMAND'}
          </span>
        </div>

        <button
          onClick={handleCopy}
          style={{
            background: copied ? 'rgba(52, 211, 153, 0.15)' : 'var(--bg-darker)',
            border: copied ? '1px solid var(--emerald)' : '1px solid var(--line)',
            color: copied ? 'var(--emerald)' : 'var(--nav-link)',
            padding: '4px 10px',
            borderRadius: '6px',
            fontSize: '0.75rem',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.15s ease'
          }}
          title="Copy command to clipboard"
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>

      <div style={{ padding: '16px', fontFamily: 'monospace', fontSize: '0.9rem', lineHeight: 1.6, overflowX: 'auto' }}>
        <div style={{ color: 'var(--accent)', display: 'flex', gap: '10px' }}>
          <span style={{ color: 'var(--teal)', userSelect: 'none', fontWeight: 700 }}>{promptSymbol}</span>
          <span style={{ color: 'var(--text-heading)', fontWeight: 600 }}>{command}</span>
        </div>

        {output && (
          <div style={{
            marginTop: '12px',
            paddingTop: '10px',
            borderTop: '1px dashed var(--line)',
            color: 'var(--emerald)',
            fontSize: '0.85rem',
            whiteSpace: 'pre-wrap',
            lineHeight: 1.5
          }}>
            {output}
          </div>
        )}
      </div>
    </div>
  );
};
