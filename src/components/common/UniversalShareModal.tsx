import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Share2,
  Copy,
  Check,
  ExternalLink,
  X,
  MessageSquare,
  Send,
  Globe,
  Sparkles,
} from 'lucide-react';

export interface UniversalShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  url: string;
  defaultDescription?: string;
  hashtags?: string[];
}

export const UniversalShareModal: React.FC<UniversalShareModalProps> = ({
  isOpen,
  onClose,
  title,
  url,
  defaultDescription,
  hashtags = ['ITFieldTech', 'SystemsEngineering', 'JawedImtiaz'],
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [clipboardNotice, setClipboardNotice] = useState<string | null>(null);
  const [copiedTextNotice, setCopiedTextNotice] = useState(false);

  // Normalize absolute URL
  const resolvedUrl = useMemo(() => {
    if (!url) {
      return typeof window !== 'undefined' ? window.location.href : 'https://jawed.co.in';
    }
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://jawed.co.in';
    return `${origin}${url.startsWith('/') ? '' : '/'}${url}`;
  }, [url]);

  // Formatted post text for clipboard and share intents
  const formattedPostText = useMemo(() => {
    const desc = defaultDescription ? defaultDescription.trim() : '';
    const tagString = hashtags && hashtags.length > 0
      ? hashtags.map((h) => `#${h.replace(/^#/, '')}`).join(' ')
      : '';

    let text = title;
    if (desc) {
      text += `\n\n${desc}`;
    }
    if (tagString) {
      text += `\n\n${tagString}`;
    }
    return text;
  }, [title, defaultDescription, hashtags]);

  // Native share capability detection
  const hasNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  // Robust clipboard copy with fallback
  const copyToClipboard = useCallback(async (textToCopy: string): Promise<boolean> => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(textToCopy);
        return true;
      }
      const el = document.createElement('textarea');
      el.value = textToCopy;
      el.style.position = 'fixed';
      el.style.left = '-9999px';
      el.style.top = '0';
      el.setAttribute('readonly', '');
      document.body.appendChild(el);
      el.select();
      const success = document.execCommand('copy');
      document.body.removeChild(el);
      return success;
    } catch {
      return false;
    }
  }, []);

  // Handle Escape key & body scroll lock
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Reset notices when closed
  useEffect(() => {
    if (!isOpen) {
      setCopiedLink(false);
      setClipboardNotice(null);
      setCopiedTextNotice(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Direct copy of URL
  const handleCopyUrl = async () => {
    const success = await copyToClipboard(resolvedUrl);
    if (success) {
      setCopiedLink(true);
      setClipboardNotice('Direct URL copied to clipboard!');
      setTimeout(() => setCopiedLink(false), 2400);
      setTimeout(() => setClipboardNotice(null), 3800);
    }
  };

  // Direct copy of full formatted text
  const handleCopyFullText = async () => {
    const fullTextWithUrl = `${formattedPostText}\n\n${resolvedUrl}`;
    const success = await copyToClipboard(fullTextWithUrl);
    if (success) {
      setCopiedTextNotice(true);
      setClipboardNotice('Full post text & link copied to clipboard!');
      setTimeout(() => setCopiedTextNotice(false), 2400);
      setTimeout(() => setClipboardNotice(null), 4000);
    }
  };

  // Native share sheet
  const handleNativeShare = async () => {
    if (!hasNativeShare) return;
    try {
      await navigator.share({
        title,
        text: defaultDescription || title,
        url: resolvedUrl,
      });
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      handleCopyUrl();
    }
  };

  // Safe window popup open helper
  const openShareWindow = (targetUrl: string, windowName: string) => {
    const width = 640;
    const height = 580;
    const left = typeof window !== 'undefined' ? Math.max(0, (window.screen.width - width) / 2) : 100;
    const top = typeof window !== 'undefined' ? Math.max(0, (window.screen.height - height) / 2) : 100;
    window.open(
      targetUrl,
      windowName,
      `width=${width},height=${height},top=${top},left=${left},toolbar=0,status=0,resizable=yes,scrollbars=yes`
    );
  };

  // Platform Share Handlers
  const handleTwitterShare = () => {
    const tweetText = defaultDescription ? `${title} — ${defaultDescription}` : title;
    const tagParam = hashtags && hashtags.length > 0
      ? `&hashtags=${encodeURIComponent(hashtags.map((h) => h.replace(/^#/, '')).join(','))}`
      : '';
    const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}&url=${encodeURIComponent(resolvedUrl)}${tagParam}`;
    openShareWindow(shareUrl, 'twitter-share');
  };

  const handleWhatsAppShare = () => {
    const msg = defaultDescription
      ? `*${title}*\n${defaultDescription}\n\n${resolvedUrl}`
      : `*${title}*\n${resolvedUrl}`;
    const shareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
    openShareWindow(shareUrl, 'whatsapp-share');
  };

  const handleTelegramShare = () => {
    const msg = defaultDescription ? `${title}\n\n${defaultDescription}` : title;
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(resolvedUrl)}&text=${encodeURIComponent(msg)}`;
    openShareWindow(shareUrl, 'telegram-share');
  };

  const handleRedditShare = () => {
    const shareUrl = `https://www.reddit.com/submit?url=${encodeURIComponent(resolvedUrl)}&title=${encodeURIComponent(title)}`;
    openShareWindow(shareUrl, 'reddit-share');
  };

  /**
   * LinkedIn Sharing:
   * LinkedIn intentionally ignores pre-filled body text for anti-spam compliance.
   * We automatically copy the formatted post text to clipboard and open the share dialog,
   * showing an inline notice to inform the user to press Ctrl+V / ⌘+V.
   */
  const handleLinkedInShare = async () => {
    const textToPaste = `${formattedPostText}\n\n${resolvedUrl}`;
    await copyToClipboard(textToPaste);
    setClipboardNotice('Post text copied to clipboard! Just press Ctrl+V / ⌘+V to paste into your LinkedIn post.');
    const shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(resolvedUrl)}`;
    openShareWindow(shareUrl, 'linkedin-share');
  };

  /**
   * Facebook Sharing:
   * Facebook sharer ignores pre-filled text in modern web dialogs.
   * We copy text to clipboard and notify the user before launching the dialog.
   */
  const handleFacebookShare = async () => {
    const textToPaste = `${formattedPostText}\n\n${resolvedUrl}`;
    await copyToClipboard(textToPaste);
    setClipboardNotice('Post text copied to clipboard! Just press Ctrl+V / ⌘+V to paste into your Facebook post.');
    const shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(resolvedUrl)}`;
    openShareWindow(shareUrl, 'facebook-share');
  };

  const handleEmailShare = () => {
    const subject = encodeURIComponent(title);
    const body = encodeURIComponent(`${title}\n\n${defaultDescription || ''}\n\nAccess here:\n${resolvedUrl}`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="universal-share-modal-title"
    >
      <div
        className="relative max-w-lg w-full rounded-2xl border border-slate-700/60 bg-slate-900 p-6 shadow-2xl text-slate-100 flex flex-col gap-5 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        style={{
          boxShadow: '0 25px 50px -12px rgba(2, 6, 23, 0.75), 0 0 0 1px rgba(51, 65, 85, 0.4)',
        }}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 shrink-0">
              <Share2 size={20} aria-hidden="true" />
            </div>
            <div>
              <h2
                id="universal-share-modal-title"
                className="text-lg font-bold text-slate-100 tracking-tight"
                style={{ margin: 0 }}
              >
                Share Resource
              </h2>
              <p className="text-xs text-slate-400 font-mono mt-0.5" style={{ margin: 0 }}>
                jawed.co.in · IT Field Engineering
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            aria-label="Close share dialog"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        {/* Content Preview Box */}
        <div className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-3.5 flex flex-col gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-sky-400">
            Preview
          </span>
          <h3 className="text-sm font-semibold text-slate-100 leading-snug" style={{ margin: 0 }}>
            {title}
          </h3>
          {defaultDescription && (
            <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed" style={{ margin: 0 }}>
              {defaultDescription}
            </p>
          )}
          {hashtags && hashtags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-1">
              {hashtags.slice(0, 4).map((tag) => (
                <span
                  key={tag}
                  className="text-[10px] text-slate-400 bg-slate-800/60 px-2 py-0.5 rounded font-mono"
                >
                  #{tag.replace(/^#/, '')}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Dynamic Inline Notice Banner (e.g. for LinkedIn / Facebook / Clipboard) */}
        {clipboardNotice && (
          <div
            className="rounded-xl border border-sky-500/30 bg-sky-500/10 px-3.5 py-2.5 text-xs text-sky-200 flex items-start gap-2.5 animate-fadeIn"
            role="status"
            aria-live="polite"
          >
            <Sparkles size={16} className="text-sky-400 shrink-0 mt-0.5" aria-hidden="true" />
            <div className="flex-1 leading-relaxed">
              {clipboardNotice}
            </div>
            <button
              type="button"
              onClick={() => setClipboardNotice(null)}
              className="text-sky-300 hover:text-sky-100 p-0.5"
              aria-label="Dismiss notice"
            >
              <X size={13} aria-hidden="true" />
            </button>
          </div>
        )}

        {/* Social Platforms Grid */}
        <div>
          <span className="text-xs font-semibold text-slate-400 block mb-2.5 uppercase tracking-wider">
            Share to Platform
          </span>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {/* LinkedIn */}
            <button
              type="button"
              onClick={handleLinkedInShare}
              className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-800 bg-slate-800/40 hover:bg-slate-800 hover:border-slate-700 text-left transition-all group"
              title="Copies text to clipboard & opens LinkedIn"
            >
              <div className="w-8 h-8 rounded-lg bg-[#0077b5]/15 border border-[#0077b5]/30 flex items-center justify-center text-[#0a84c1] shrink-0 group-hover:scale-105 transition-transform">
                <Globe size={16} aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold text-slate-200 group-hover:text-white truncate">
                  LinkedIn
                </div>
                <div className="text-[10px] text-slate-400 truncate">
                  Copy &amp; Open
                </div>
              </div>
              <ExternalLink size={12} className="text-slate-500 group-hover:text-slate-300 shrink-0" aria-hidden="true" />
            </button>

            {/* X (Twitter) */}
            <button
              type="button"
              onClick={handleTwitterShare}
              className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-800 bg-slate-800/40 hover:bg-slate-800 hover:border-slate-700 text-left transition-all group"
              title="Post to X / Twitter"
            >
              <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-200 shrink-0 group-hover:scale-105 transition-transform font-bold text-xs">
                𝕏
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold text-slate-200 group-hover:text-white truncate">
                  X / Twitter
                </div>
                <div className="text-[10px] text-slate-400 truncate">
                  Pre-filled Tweet
                </div>
              </div>
              <ExternalLink size={12} className="text-slate-500 group-hover:text-slate-300 shrink-0" aria-hidden="true" />
            </button>

            {/* WhatsApp */}
            <button
              type="button"
              onClick={handleWhatsAppShare}
              className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-800 bg-slate-800/40 hover:bg-slate-800 hover:border-slate-700 text-left transition-all group"
              title="Share via WhatsApp"
            >
              <div className="w-8 h-8 rounded-lg bg-[#25D366]/15 border border-[#25D366]/30 flex items-center justify-center text-[#25D366] shrink-0 group-hover:scale-105 transition-transform">
                <MessageSquare size={16} aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold text-slate-200 group-hover:text-white truncate">
                  WhatsApp
                </div>
                <div className="text-[10px] text-slate-400 truncate">
                  Chat &amp; Status
                </div>
              </div>
              <ExternalLink size={12} className="text-slate-500 group-hover:text-slate-300 shrink-0" aria-hidden="true" />
            </button>

            {/* Telegram */}
            <button
              type="button"
              onClick={handleTelegramShare}
              className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-800 bg-slate-800/40 hover:bg-slate-800 hover:border-slate-700 text-left transition-all group"
              title="Share on Telegram"
            >
              <div className="w-8 h-8 rounded-lg bg-[#229ED9]/15 border border-[#229ED9]/30 flex items-center justify-center text-[#229ED9] shrink-0 group-hover:scale-105 transition-transform">
                <Send size={15} aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold text-slate-200 group-hover:text-white truncate">
                  Telegram
                </div>
                <div className="text-[10px] text-slate-400 truncate">
                  Direct &amp; Channels
                </div>
              </div>
              <ExternalLink size={12} className="text-slate-500 group-hover:text-slate-300 shrink-0" aria-hidden="true" />
            </button>

            {/* Reddit */}
            <button
              type="button"
              onClick={handleRedditShare}
              className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-800 bg-slate-800/40 hover:bg-slate-800 hover:border-slate-700 text-left transition-all group"
              title="Submit to Reddit"
            >
              <div className="w-8 h-8 rounded-lg bg-[#FF4500]/15 border border-[#FF4500]/30 flex items-center justify-center text-[#FF4500] shrink-0 group-hover:scale-105 transition-transform font-bold text-xs">
                r/
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold text-slate-200 group-hover:text-white truncate">
                  Reddit
                </div>
                <div className="text-[10px] text-slate-400 truncate">
                  Communities
                </div>
              </div>
              <ExternalLink size={12} className="text-slate-500 group-hover:text-slate-300 shrink-0" aria-hidden="true" />
            </button>

            {/* Facebook */}
            <button
              type="button"
              onClick={handleFacebookShare}
              className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-800 bg-slate-800/40 hover:bg-slate-800 hover:border-slate-700 text-left transition-all group"
              title="Copies text & opens Facebook"
            >
              <div className="w-8 h-8 rounded-lg bg-[#1877F2]/15 border border-[#1877F2]/30 flex items-center justify-center text-[#1877F2] shrink-0 group-hover:scale-105 transition-transform font-bold text-xs">
                fb
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold text-slate-200 group-hover:text-white truncate">
                  Facebook
                </div>
                <div className="text-[10px] text-slate-400 truncate">
                  Copy &amp; Open
                </div>
              </div>
              <ExternalLink size={12} className="text-slate-500 group-hover:text-slate-300 shrink-0" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Quick Link Copy Field */}
        <div>
          <span className="text-xs font-semibold text-slate-400 block mb-2 uppercase tracking-wider">
            Copy Page Link
          </span>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                readOnly
                value={resolvedUrl}
                aria-label="Target share URL"
                className="w-full rounded-xl border border-slate-800 bg-slate-950/80 px-3.5 py-2.5 text-xs text-slate-300 font-mono focus:outline-none focus:ring-1 focus:ring-sky-400 select-all"
              />
            </div>
            <button
              type="button"
              onClick={handleCopyUrl}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 text-sky-400 hover:text-sky-300 font-semibold text-xs transition-colors shrink-0"
              title="Copy URL to clipboard"
            >
              {copiedLink ? (
                <>
                  <Check size={14} className="text-emerald-400" aria-hidden="true" />
                  <span className="text-emerald-400">Copied!</span>
                </>
              ) : (
                <>
                  <Copy size={14} aria-hidden="true" />
                  <span>Copy Link</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Bottom Auxiliary Actions: Copy Full Post Text & Native OS Sheet */}
        <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-800/80 text-xs">
          <button
            type="button"
            onClick={handleCopyFullText}
            className="inline-flex items-center gap-1.5 text-slate-400 hover:text-slate-200 transition-colors"
            title="Copy pre-formatted summary text with hashtags and link"
          >
            {copiedTextNotice ? (
              <>
                <Check size={13} className="text-emerald-400" aria-hidden="true" />
                <span className="text-emerald-400">Text Copied!</span>
              </>
            ) : (
              <>
                <Copy size={13} aria-hidden="true" />
                <span>Copy Summary Text</span>
              </>
            )}
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleEmailShare}
              className="inline-flex items-center gap-1.5 text-slate-400 hover:text-slate-200 transition-colors"
              title="Send via default Email client"
            >
              <Send size={13} aria-hidden="true" />
              <span>Email</span>
            </button>

            {hasNativeShare && (
              <button
                type="button"
                onClick={handleNativeShare}
                className="inline-flex items-center gap-1.5 text-sky-400 hover:text-sky-300 font-medium transition-colors"
                title="Open native operating system share drawer"
              >
                <Share2 size={13} aria-hidden="true" />
                <span>Device Options</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UniversalShareModal;
