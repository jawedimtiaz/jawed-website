import React, { useState, useCallback } from 'react';
import { Copy, Check } from 'lucide-react';

export interface CopyButtonProps {
  /** Text or function that returns text to be copied to the clipboard */
  text: string | (() => string);
  /** Optional button label when not copied */
  label?: string;
  /** Optional button label when successfully copied */
  copiedLabel?: string;
  /** Visual style variant */
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'subtle' | 'header';
  /** Button size */
  size?: 'sm' | 'md' | 'lg';
  /** If true, renders only the icon without text */
  iconOnly?: boolean;
  /** Optional custom CSS classes */
  className?: string;
  /** Optional inline styles */
  style?: React.CSSProperties;
  /** Optional callback invoked after successful copy */
  onCopy?: () => void;
  /** Title tooltip attribute */
  title?: string;
  /** Custom data-testid attribute for unit tests */
  testId?: string;
}

/**
 * Safely writes text content to the user's clipboard using standard Clipboard API
 * with fallback to execCommand for compatibility in restricted iframe or legacy contexts.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (!text) return false;

  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (err) {
    console.warn('[copyToClipboard] Navigator clipboard failed, trying fallback:', err);
  }

  // Fallback using invisible textarea and execCommand
  try {
    if (typeof document === 'undefined') return false;
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.top = '0';
    textArea.style.left = '0';
    textArea.style.position = 'fixed';
    textArea.style.opacity = '0';
    textArea.style.pointerEvents = 'none';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch (fallbackErr) {
    console.warn('[copyToClipboard] Fallback execCommand failed:', fallbackErr);
    return false;
  }
}

export const CopyButton: React.FC<CopyButtonProps> = ({
  text,
  label = 'Copy',
  copiedLabel = 'Copied!',
  variant = 'secondary',
  size = 'md',
  iconOnly = false,
  className = '',
  style,
  onCopy,
  title = 'Copy to clipboard',
  testId = 'copy-to-clipboard-btn',
}) => {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = useCallback(async (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }

    const content = typeof text === 'function' ? text() : text;
    if (!content) return;

    const success = await copyToClipboard(content);
    if (success) {
      setIsCopied(true);
      if (onCopy) onCopy();

      setTimeout(() => {
        setIsCopied(false);
      }, 2000);
    }
  }, [text, onCopy]);

  // Variant styling helpers
  const getVariantStyles = (): React.CSSProperties => {
    const base: React.CSSProperties = {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '6px',
      cursor: 'pointer',
      fontWeight: 600,
      transition: 'all 0.18s ease-in-out',
      borderRadius: '6px',
      lineHeight: '1.2',
      border: '1px solid transparent',
      boxSizing: 'border-box',
    };

    const sizePadding =
      size === 'sm'
        ? iconOnly ? '4px' : '4px 8px'
        : size === 'lg'
        ? iconOnly ? '10px' : '10px 18px'
        : iconOnly ? '6px' : '6px 12px';

    const fontSize = size === 'sm' ? '0.75rem' : size === 'lg' ? '0.95rem' : '0.82rem';

    let colorStyles: React.CSSProperties = {};

    if (isCopied) {
      colorStyles = {
        background: 'rgba(52, 211, 153, 0.15)',
        color: '#34d399',
        borderColor: 'rgba(52, 211, 153, 0.4)',
      };
    } else {
      switch (variant) {
        case 'primary':
          colorStyles = {
            background: 'var(--accent, #38bdf8)',
            color: '#0f172a',
            borderColor: 'var(--accent, #38bdf8)',
          };
          break;
        case 'outline':
          colorStyles = {
            background: 'transparent',
            color: 'var(--text-heading, #f8fafc)',
            borderColor: 'var(--border, rgba(255, 255, 255, 0.15))',
          };
          break;
        case 'ghost':
          colorStyles = {
            background: 'transparent',
            color: 'var(--text-muted, #94a3b8)',
            borderColor: 'transparent',
          };
          break;
        case 'subtle':
          colorStyles = {
            background: 'rgba(56, 189, 248, 0.1)',
            color: 'var(--accent, #38bdf8)',
            borderColor: 'rgba(56, 189, 248, 0.25)',
          };
          break;
        case 'header':
          colorStyles = {
            background: 'rgba(15, 23, 42, 0.6)',
            color: 'var(--text-heading, #f8fafc)',
            borderColor: 'rgba(255, 255, 255, 0.15)',
          };
          break;
        case 'secondary':
        default:
          colorStyles = {
            background: 'var(--surface-hover, rgba(255, 255, 255, 0.08))',
            color: 'var(--text-heading, #f8fafc)',
            borderColor: 'var(--border, rgba(255, 255, 255, 0.12))',
          };
          break;
      }
    }

    return {
      ...base,
      padding: sizePadding,
      fontSize,
      ...colorStyles,
      ...style,
    };
  };

  const iconSize = size === 'sm' ? 13 : size === 'lg' ? 17 : 14;

  return (
    <button
      type="button"
      data-testid={testId}
      className={`copy-button ${isCopied ? 'copied' : ''} ${className}`}
      style={getVariantStyles()}
      onClick={handleCopy}
      title={isCopied ? 'Copied to clipboard' : title}
      aria-label={isCopied ? 'Copied to clipboard' : label || title}
    >
      {isCopied ? (
        <Check size={iconSize} color="#34d399" style={{ flexShrink: 0 }} />
      ) : (
        <Copy size={iconSize} style={{ flexShrink: 0 }} />
      )}
      {!iconOnly && <span>{isCopied ? copiedLabel : label}</span>}
    </button>
  );
};
