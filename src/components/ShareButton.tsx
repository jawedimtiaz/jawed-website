import React, { useState } from 'react';
import { Share2 } from 'lucide-react';
import { UniversalShareModal } from './common/UniversalShareModal';

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
  /**
   * Optional hashtags.
   */
  hashtags?: string[];
  /**
   * Button label. Defaults to "Share".
   */
  label?: string;
}

export const ShareButton: React.FC<ShareButtonProps> = ({
  title,
  text,
  url,
  className = '',
  style,
  hashtags,
  label = 'Share',
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const resolvedUrl = url || (typeof window !== 'undefined' ? window.location.href : '');

  return (
    <>
      <button
        type="button"
        className={`button button-secondary ${className}`.trim()}
        onClick={() => setIsModalOpen(true)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '0.85rem',
          padding: '6px 14px',
          whiteSpace: 'nowrap',
          cursor: 'pointer',
          ...style,
        }}
        aria-label={`Share "${title}"`}
        title="Share resource via WhatsApp, LinkedIn, X, Telegram, Reddit, or Copy Link"
      >
        <Share2 size={15} aria-hidden="true" />
        <span>{label}</span>
      </button>

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

export default ShareButton;
