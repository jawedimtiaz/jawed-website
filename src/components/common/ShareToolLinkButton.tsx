import React, { useState, useRef, useEffect } from 'react';
import { Share2, Check } from 'lucide-react';

export const SHARE_TOAST_MESSAGE = 'Link copied!';

/**
 * Resolves the current tool's specific shareable URL.
 */
export function resolveToolShareUrl(explicitUrl?: string, pathname?: string): string {
  if (explicitUrl && explicitUrl.trim()) {
    return explicitUrl.trim();
  }
  if (typeof window !== 'undefined' && window.location?.href) {
    return window.location.href;
  }
  const cleanPath = pathname
    ? pathname.startsWith('/')
      ? pathname
      : `/${pathname}`
    : '/tools';
  return `https://jawed.co.in${cleanPath}`;
}

/**
 * Copies the current tool's specific URL to the clipboard and returns the
 * copied URL along with the 'Link copied!' toast message.
 */
export async function copyToolShareUrlToClipboard(
  explicitUrl?: string,
  pathname?: string
): Promise<{ ok: boolean; url: string; toastMessage: string }> {
  const targetUrl = resolveToolShareUrl(explicitUrl, pathname);

  try {
    if (
      typeof navigator !== 'undefined' &&
      navigator.clipboard &&
      typeof navigator.clipboard.writeText === 'function'
    ) {
      await navigator.clipboard.writeText(targetUrl);
      return { ok: true, url: targetUrl, toastMessage: SHARE_TOAST_MESSAGE };
    }

    if (typeof document !== 'undefined') {
      const textArea = document.createElement('textarea');
      textArea.value = targetUrl;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const copied = typeof document.execCommand === 'function' ? document.execCommand('copy') : true;
      document.body.removeChild(textArea);
      return { ok: Boolean(copied), url: targetUrl, toastMessage: SHARE_TOAST_MESSAGE };
    }

    return { ok: true, url: targetUrl, toastMessage: SHARE_TOAST_MESSAGE };
  } catch {
    return { ok: false, url: targetUrl, toastMessage: SHARE_TOAST_MESSAGE };
  }
}

export interface ShareToolLinkButtonProps {
  url?: string;
  label?: string;
  size?: 'sm' | 'md';
  className?: string;
  style?: React.CSSProperties;
  title?: string;
  onCopied?: (copiedUrl: string) => void;
}

export const ShareToolLinkButton: React.FC<ShareToolLinkButtonProps> = ({
  url,
  label = 'Share',
  size = 'md',
  className = '',
  style,
  title = "Copy this tool's URL to clipboard",
  onCopied,
}) => {
  const [toastVisible, setToastVisible] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState('');
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleShareClick = async () => {
    const result = await copyToolShareUrlToClipboard(url);
    setCopiedUrl(result.url);
    setToastVisible(true);
    onCopied?.(result.url);

    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = window.setTimeout(() => {
      setToastVisible(false);
    }, 2400);
  };

  const padding = size === 'sm' ? '4px 10px' : '6px 12px';
  const fontSize = size === 'sm' ? '0.78rem' : '0.825rem';
  const iconSize = size === 'sm' ? 13 : 14;

  return (
    <div
      className="share-tool-link-wrapper no-print"
      style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}
    >
      <button
        type="button"
        onClick={handleShareClick}
        data-testid="share-tool-link-btn"
        aria-label={`${label} — Copy tool link to clipboard`}
        title={title}
        className={`button button-secondary share-tool-link-btn no-print ${className}`.trim()}
        style={{
          padding,
          fontSize,
          display: 'inline-flex',
          alignItems: 'center',
          gap: '5px',
          whiteSpace: 'nowrap',
          cursor: 'pointer',
          borderColor: toastVisible ? 'rgba(52, 211, 153, 0.55)' : undefined,
          color: toastVisible ? '#34d399' : undefined,
          ...style,
        }}
      >
        {toastVisible ? (
          <Check width={iconSize} height={iconSize} className="text-emerald-400" aria-hidden="true" />
        ) : (
          <Share2 width={iconSize} height={iconSize} className="text-sky-400" aria-hidden="true" />
        )}
        <span>{label}</span>
      </button>

      {toastVisible && (
        <div
          role="status"
          aria-live="polite"
          data-testid="share-link-copied-toast"
          className="toast share-link-copied-toast no-print"
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 9999,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 16px',
            borderRadius: '10px',
            background: '#0f172a',
            border: '1px solid rgba(52, 211, 153, 0.5)',
            color: '#f8fafc',
            fontSize: '0.82rem',
            fontWeight: 600,
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.35)',
          }}
        >
          <Check width={15} height={15} className="text-emerald-400" aria-hidden="true" />
          <span>{SHARE_TOAST_MESSAGE}</span>
          {copiedUrl && (
            <span
              style={{
                fontSize: '0.72rem',
                color: '#94a3b8',
                fontFamily: 'monospace',
                maxWidth: '240px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {copiedUrl}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default ShareToolLinkButton;
