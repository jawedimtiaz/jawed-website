import React, { useState, useEffect } from 'react';
import { ThumbsUp, ThumbsDown, CheckCircle2, MessageSquarePlus } from 'lucide-react';

export type GuideFeedbackVote = 'up' | 'down';

export interface GuideFeedbackRecord {
  slug: string;
  title?: string;
  vote: GuideFeedbackVote;
  comment?: string;
  submittedAt: string;
}

export const GUIDE_FEEDBACK_STORAGE_KEY = 'jawed_guide_feedback_records_v1';
export const GUIDE_FEEDBACK_HEADING = 'Was this guide helpful?';

export interface FeedbackStorageLike {
  getItem: (key: string) => string | null;
  setItem?: (key: string, value: string) => void;
}

/**
 * Reads all stored guide improvement feedback records from localStorage.
 */
export function getGuideFeedbackRecords(
  storageOverride?: Pick<FeedbackStorageLike, 'getItem'>
): Record<string, GuideFeedbackRecord> {
  const storage =
    storageOverride ??
    (typeof window !== 'undefined' ? window.localStorage : undefined);

  if (!storage || typeof storage.getItem !== 'function') {
    return {};
  }

  try {
    const raw = storage.getItem(GUIDE_FEEDBACK_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, GuideFeedbackRecord>;
    }
  } catch {
    // Ignore malformed JSON or restricted storage environments
  }

  return {};
}

/**
 * Retrieves the saved feedback record for a specific guide slug, if any.
 */
export function getGuideFeedbackForSlug(
  slug: string,
  storageOverride?: Pick<FeedbackStorageLike, 'getItem'>
): GuideFeedbackRecord | null {
  if (!slug) return null;
  const records = getGuideFeedbackRecords(storageOverride);
  return records[slug] ?? null;
}

/**
 * Submission handler for guide improvement tracking.
 * Saves the upvote/downvote and optional comment to localStorage and dispatches
 * a `guide-feedback-submitted` event.
 */
export function submitGuideFeedback(
  payload: {
    slug: string;
    title?: string;
    vote: GuideFeedbackVote;
    comment?: string;
  },
  storageOverride?: FeedbackStorageLike
): GuideFeedbackRecord {
  const cleanSlug = (payload.slug || 'unknown-guide').trim();
  const cleanComment = payload.comment?.trim() || undefined;
  const record: GuideFeedbackRecord = {
    slug: cleanSlug,
    title: payload.title?.trim() || undefined,
    vote: payload.vote,
    ...(cleanComment ? { comment: cleanComment } : {}),
    submittedAt: new Date().toISOString(),
  };

  const storage =
    storageOverride ??
    (typeof window !== 'undefined' ? window.localStorage : undefined);

  if (storage && typeof storage.getItem === 'function' && typeof storage.setItem === 'function') {
    try {
      const existing = getGuideFeedbackRecords(storage);
      existing[cleanSlug] = record;
      storage.setItem(GUIDE_FEEDBACK_STORAGE_KEY, JSON.stringify(existing));
    } catch {
      // Ignore storage quota or private browsing errors
    }
  }

  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    try {
      window.dispatchEvent(
        new CustomEvent('guide-feedback-submitted', { detail: record })
      );
    } catch {
      // Ignore CustomEvent error in minimal test environments
    }
  }

  return record;
}

export interface GuideFeedbackProps {
  slug: string;
  title?: string;
  onSubmitFeedback?: (record: GuideFeedbackRecord) => void;
  className?: string;
}

export const GuideFeedback: React.FC<GuideFeedbackProps> = ({
  slug,
  title,
  onSubmitFeedback,
  className = '',
}) => {
  const [selectedVote, setSelectedVote] = useState<GuideFeedbackVote | null>(() => {
    const saved = getGuideFeedbackForSlug(slug);
    return saved?.vote ?? null;
  });
  const [comment, setComment] = useState<string>(() => {
    const saved = getGuideFeedbackForSlug(slug);
    return saved?.comment ?? '';
  });
  const [isSubmitted, setIsSubmitted] = useState<boolean>(() => {
    return Boolean(getGuideFeedbackForSlug(slug));
  });
  const [commentSavedToast, setCommentSavedToast] = useState<boolean>(false);

  // Sync state when navigating between different guide slugs
  useEffect(() => {
    const saved = getGuideFeedbackForSlug(slug);
    setSelectedVote(saved?.vote ?? null);
    setComment(saved?.comment ?? '');
    setIsSubmitted(Boolean(saved));
    setCommentSavedToast(false);
  }, [slug]);

  const handleVoteClick = (vote: GuideFeedbackVote) => {
    setSelectedVote(vote);
    setIsSubmitted(true);
    const record = submitGuideFeedback({
      slug,
      title,
      vote,
      comment,
    });
    onSubmitFeedback?.(record);
  };

  const handleFormSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const voteToSave: GuideFeedbackVote = selectedVote ?? 'up';
    setSelectedVote(voteToSave);
    setIsSubmitted(true);
    setCommentSavedToast(true);
    const record = submitGuideFeedback({
      slug,
      title,
      vote: voteToSave,
      comment,
    });
    onSubmitFeedback?.(record);
  };

  return (
    <section
      aria-label="Guide Helpful Feedback"
      data-testid="guide-feedback-component"
      data-guide-slug={slug}
      data-feedback-vote={selectedVote || ''}
      className={`guide-feedback-card no-print ${className}`.trim()}
      style={{
        marginTop: '28px',
        padding: '20px 24px',
        borderRadius: '14px',
        background: 'var(--bg-darker, rgba(15, 23, 42, 0.65))',
        border: '1px solid var(--border, rgba(148, 163, 184, 0.2))',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <h3
            data-testid="guide-feedback-heading"
            style={{
              margin: 0,
              fontSize: '0.98rem',
              fontWeight: 700,
              color: 'var(--text-heading, #f8fafc)',
            }}
          >
            {GUIDE_FEEDBACK_HEADING}
          </h3>
          <p
            style={{
              margin: '4px 0 0',
              fontSize: '0.82rem',
              color: 'var(--muted, #94a3b8)',
            }}
          >
            Your vote helps prioritize technical accuracy updates and field checklist improvements.
          </p>
        </div>

        <div
          role="group"
          aria-label={GUIDE_FEEDBACK_HEADING}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '10px' }}
        >
          <button
            type="button"
            onClick={() => handleVoteClick('up')}
            data-testid="guide-feedback-upvote-btn"
            aria-pressed={selectedVote === 'up'}
            aria-label="Yes, this guide was helpful (Upvote)"
            title="Upvote: This guide was helpful"
            className={`button button-secondary ${selectedVote === 'up' ? 'is-active' : ''}`.trim()}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '7px',
              padding: '8px 14px',
              fontSize: '0.84rem',
              fontWeight: 600,
              borderRadius: '10px',
              cursor: 'pointer',
              borderColor:
                selectedVote === 'up'
                  ? 'rgba(16, 185, 129, 0.65)'
                  : 'var(--border, rgba(148, 163, 184, 0.25))',
              background:
                selectedVote === 'up'
                  ? 'rgba(16, 185, 129, 0.15)'
                  : 'var(--surface, rgba(30, 41, 59, 0.7))',
              color:
                selectedVote === 'up'
                  ? 'var(--emerald, #10b981)'
                  : 'var(--text, #f8fafc)',
            }}
          >
            <ThumbsUp size={15} aria-hidden="true" />
            <span>Yes</span>
          </button>

          <button
            type="button"
            onClick={() => handleVoteClick('down')}
            data-testid="guide-feedback-downvote-btn"
            aria-pressed={selectedVote === 'down'}
            aria-label="No, this guide needs improvement (Downvote)"
            title="Downvote: This guide needs improvement"
            className={`button button-secondary ${selectedVote === 'down' ? 'is-active' : ''}`.trim()}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '7px',
              padding: '8px 14px',
              fontSize: '0.84rem',
              fontWeight: 600,
              borderRadius: '10px',
              cursor: 'pointer',
              borderColor:
                selectedVote === 'down'
                  ? 'rgba(245, 158, 11, 0.65)'
                  : 'var(--border, rgba(148, 163, 184, 0.25))',
              background:
                selectedVote === 'down'
                  ? 'rgba(245, 158, 11, 0.15)'
                  : 'var(--surface, rgba(30, 41, 59, 0.7))',
              color:
                selectedVote === 'down'
                  ? '#fbbf24'
                  : 'var(--text, #f8fafc)',
            }}
          >
            <ThumbsDown size={15} aria-hidden="true" />
            <span>No</span>
          </button>
        </div>
      </div>

      {isSubmitted && (
        <div
          style={{
            marginTop: '14px',
            paddingTop: '14px',
            borderTop: '1px solid var(--border, rgba(148, 163, 184, 0.15))',
          }}
        >
          <div
            role="status"
            aria-live="polite"
            data-testid="guide-feedback-confirmation"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '0.84rem',
              fontWeight: 600,
              color:
                selectedVote === 'up'
                  ? 'var(--emerald, #10b981)'
                  : '#fbbf24',
              marginBottom: '10px',
            }}
          >
            <CheckCircle2 size={15} aria-hidden="true" />
            <span>
              {selectedVote === 'up'
                ? 'Thanks for your feedback! Glad this guide helped.'
                : 'Thanks for your feedback — logged for guide improvement tracking.'}
            </span>
          </div>

          <form
            onSubmit={handleFormSubmit}
            data-testid="guide-feedback-form"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ position: 'relative', flex: '1 1 240px' }}>
              <input
                type="text"
                value={comment}
                onChange={(e) => {
                  setComment(e.target.value);
                  setCommentSavedToast(false);
                }}
                placeholder={
                  selectedVote === 'down'
                    ? 'What was missing or unclear in this guide? (optional)'
                    : 'Any suggestions to make this guide even better? (optional)'
                }
                aria-label="Improvement tracking note"
                data-testid="guide-feedback-comment-input"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  fontSize: '0.82rem',
                  borderRadius: '8px',
                  border: '1px solid var(--border, rgba(148, 163, 184, 0.25))',
                  background: 'var(--surface, rgba(15, 23, 42, 0.8))',
                  color: 'var(--text, #f8fafc)',
                }}
              />
            </div>
            <button
              type="submit"
              data-testid="guide-feedback-submit-btn"
              className="button button-primary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 14px',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <MessageSquarePlus size={14} aria-hidden="true" />
              <span>{commentSavedToast ? 'Saved!' : 'Submit Note'}</span>
            </button>
          </form>
        </div>
      )}
    </section>
  );
};

export default GuideFeedback;
