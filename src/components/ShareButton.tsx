import React, { useState } from 'react';

export interface ShareButtonProps {
  /**
   * Title of the content being shared.
   */
  title: string;
  /**
   * Summary or excerpt text to accompany the shared URL.
   */
  text?: string;
  /**
   * Target URL to share. Defaults to `window.location.href`.
   */
  url?: string;
  /**
   * Optional custom CSS class name.
   */
  className?: string;
  /**
   * Optional inline styles.
   */
  style?: React.CSSProperties;
}

export const ShareButton: React.FC<ShareButtonProps> = ({
  title,
  text,
  url,
  className = '',
  style,
}) => {
  const [shareStatus, setShareStatus] = useState<'idle' | 'shared' | 'copied' | 'error'>('idle');

  const fallbackCopy = async (targetUrl: string) => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(targetUrl);
        setShareStatus('copied');
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = targetUrl;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        setShareStatus('copied');
      }
      setTimeout(() => setShareStatus('idle'), 2200);
    } catch {
      setShareStatus('error');
      setTimeout(() => setShareStatus('idle'), 2200);
    }
  };

  const handleShare = async () => {
    const targetUrl = url || (typeof window !== 'undefined' ? window.location.href : '');
    const summaryText = text || title;

    // Use Web Share API if supported by the browser/platform
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title,
          text: summaryText,
          url: targetUrl,
        });
        setShareStatus('shared');
        setTimeout(() => setShareStatus('idle'), 2200);
      } catch (err: unknown) {
        // If the user dismissed or cancelled the share dialog, do not treat as error
        if (err instanceof Error && err.name === 'AbortError') {
          return;
        }
        // Fallback to copying URL if native share encountered a non-abort failure
        await fallbackCopy(targetUrl);
      }
    } else {
      // Graceful fallback for browsers without Web Share API support
      await fallbackCopy(targetUrl);
    }
  };

  return (
    <button
      type="button"
      className={`button button-secondary ${className}`.trim()}
      onClick={handleShare}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        fontSize: '0.85rem',
        padding: '6px 14px',
        whiteSpace: 'nowrap',
        ...style,
      }}
      aria-label={`Share "${title}"`}
      title="Share page via Web Share API or copy link"
    >
      {shareStatus === 'shared' ? (
        <>
          <span aria-hidden="true" style={{ color: 'var(--teal)' }}>✓</span>
          <span>Shared!</span>
        </>
      ) : shareStatus === 'copied' ? (
        <>
          <span aria-hidden="true" style={{ color: 'var(--teal)' }}>✓</span>
          <span>Link Copied!</span>
        </>
      ) : shareStatus === 'error' ? (
        <>
          <span aria-hidden="true" style={{ color: 'var(--rose)' }}>✕</span>
          <span>Error</span>
        </>
      ) : (
        <>
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
          </svg>
          <span>Share</span>
        </>
      )}
    </button>
  );
};

export default ShareButton;
