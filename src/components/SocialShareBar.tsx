import React, { useState } from 'react';
import { UniversalShareModal } from './common/UniversalShareModal';

export interface SocialShareBarProps {
  /**
   * Title of the page or article being shared.
   */
  title: string;
  /**
   * Summary or excerpt text accompanying the share.
   */
  text?: string;
  /**
   * Explicit target URL to share. Defaults to current browser `window.location.href`.
   */
  url?: string;
  /**
   * Optional custom CSS class name for the wrapper element.
   */
  className?: string;
  /**
   * Optional inline styles for the wrapper element.
   */
  style?: React.CSSProperties;
  /**
   * Whether to display a "Share:" text label preceding the buttons. Defaults to true.
   */
  showLabel?: boolean;
  /**
   * Size variant ('normal' | 'small'). Defaults to 'normal'.
   */
  size?: 'normal' | 'small';
  /**
   * Optional custom hashtags to pass through to the universal share modal.
   */
  hashtags?: string[];
}

export const SocialShareBar: React.FC<SocialShareBarProps> = ({
  title,
  text,
  url,
  className = '',
  style,
  showLabel = true,
  size = 'normal',
  hashtags,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'shared' | 'error'>('idle');

  const resolvedUrl = url || (typeof window !== 'undefined' ? window.location.href : '');
  const shareText = text ? `${title} — ${text}` : title;

  const encodedUrl = encodeURIComponent(resolvedUrl);
  const encodedText = encodeURIComponent(shareText);
  const encodedTitle = encodeURIComponent(title);

  // Social Intent Share URLs
  const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;
  const xTwitterUrl = `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`;
  const redditUrl = `https://www.reddit.com/submit?url=${encodedUrl}&title=${encodedTitle}`;

  const buttonPadding = size === 'small' ? '4px 10px' : '6px 12px';
  const fontSize = size === 'small' ? '0.78rem' : '0.825rem';
  const iconSize = size === 'small' ? 12 : 14;

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  return (
    <>
      <div
        className={`social-share-bar ${className}`.trim()}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          flexWrap: 'wrap',
          ...style,
        }}
        aria-label="Social media share options"
      >
        {showLabel && (
          <span
            style={{
              fontSize: '0.85rem',
              color: 'var(--muted)',
              fontWeight: 500,
              marginRight: '2px',
            }}
          >
            Share:
          </span>
        )}

        {/* Primary Universal Share Modal Button */}
        <button
          type="button"
          className="button button-secondary"
          onClick={handleOpenModal}
          style={{
            padding: buttonPadding,
            fontSize,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            whiteSpace: 'nowrap',
            cursor: 'pointer',
          }}
          aria-label={`Open universal share options for "${title}"`}
          title="Share via WhatsApp, LinkedIn, X, Telegram, Reddit, or Copy Link"
        >
          <svg
            width={iconSize}
            height={iconSize}
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
        </button>

        {/* Quick LinkedIn Shortcut */}
        <button
          type="button"
          onClick={handleOpenModal}
          className="button button-secondary"
          style={{
            padding: buttonPadding,
            fontSize,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            whiteSpace: 'nowrap',
            textDecoration: 'none',
            cursor: 'pointer',
          }}
          aria-label={`Share "${title}" on LinkedIn`}
          title="Share on LinkedIn (with automatic clipboard post text)"
        >
          <svg
            width={iconSize}
            height={iconSize}
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
          </svg>
          <span>LinkedIn</span>
        </button>

        {/* Quick X / Twitter Shortcut */}
        <a
          href={xTwitterUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="button button-secondary"
          style={{
            padding: buttonPadding,
            fontSize,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            whiteSpace: 'nowrap',
            textDecoration: 'none',
          }}
          aria-label={`Share "${title}" on X (formerly Twitter)`}
          title="Share on X / Twitter"
        >
          <svg
            width={iconSize}
            height={iconSize}
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
          <span>𝕏</span>
        </a>

        {/* Quick Reddit Shortcut */}
        <a
          href={redditUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="button button-secondary"
          style={{
            padding: buttonPadding,
            fontSize,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            whiteSpace: 'nowrap',
            textDecoration: 'none',
          }}
          aria-label={`Share "${title}" on Reddit`}
          title="Share on Reddit"
        >
          <svg
            width={iconSize}
            height={iconSize}
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.688-.562-1.249-1.25-1.249zm-4.566 3.875c-.086 0-.173.033-.239.099a.338.338 0 0 0 0 .478c.85.849 2.228.849 3.078 0a.338.338 0 0 0 0-.478.338.338 0 0 0-.478 0c-.588.588-1.534.588-2.122 0a.338.338 0 0 0-.239-.099z" />
          </svg>
          <span>Reddit</span>
        </a>
      </div>

      {/* Universal Share Modal */}
      <UniversalShareModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={title}
        url={resolvedUrl}
        defaultDescription={text}
        hashtags={hashtags}
      />
    </>
  );
};

export default SocialShareBar;
