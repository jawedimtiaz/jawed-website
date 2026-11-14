import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  AVERAGE_READING_SPEED_WPM,
  calculateEstimatedReadTime,
  calculateRemainingReadTime,
  calculateReadTimeMinutes,
  calculateWordCount,
  type EstimatedReadTimeStats,
} from '../utils/readTimeHelper';

export {
  AVERAGE_READING_SPEED_WPM,
  calculateEstimatedReadTime,
  type EstimatedReadTimeStats,
};

export interface ReadTimeProgressIndicatorProps {
  /** The article's raw or rendered text content used to calculate word count and read time */
  content?: string;
  /** Pre-calculated estimated read time string (e.g. '5 min read') or minutes number */
  estimatedTime?: string | number;
  /** Reading speed in words per minute (defaults to AVERAGE_READING_SPEED_WPM = 200 WPM) */
  wpm?: number;
  /** Target element selector to measure scroll progress through (defaults to article content) */
  targetSelector?: string;
  /** Layout presentation variant: 'sidebar' (sticky TOC sidebar), 'inline' (top of article), or 'floating' (mobile floating pill) */
  variant?: 'sidebar' | 'inline' | 'floating';
  /** Scroll distance in pixels before activating the scroll-triggered indicator */
  scrollTriggerThreshold?: number;
  /** Optional custom CSS classes */
  className?: string;
}

export const ReadTimeProgressIndicator: React.FC<ReadTimeProgressIndicatorProps> = ({
  content = '',
  estimatedTime,
  wpm = AVERAGE_READING_SPEED_WPM,
  targetSelector = '[data-testid="note-rendered-content"], .note-rendered-content',
  variant = 'sidebar',
  scrollTriggerThreshold = 40,
  className = '',
}) => {
  const [scrollProgress, setScrollProgress] = useState<number>(0);
  const [isScrolledPastThreshold, setIsScrolledPastThreshold] = useState<boolean>(false);
  const [domTextFallback, setDomTextFallback] = useState<string>('');
  const rafId = useRef<number | null>(null);
  const safeWpm = wpm > 0 ? wpm : AVERAGE_READING_SPEED_WPM;

  // Dynamically inspect rendered DOM text when content prop is empty
  useEffect(() => {
    if (content || typeof document === 'undefined') return;
    const targetEl = document.querySelector(targetSelector) as HTMLElement | null;
    if (targetEl?.textContent) {
      setDomTextFallback(targetEl.textContent);
    }
  }, [content, targetSelector]);

  const effectiveContent = content || domTextFallback;

  // Compute base read time and word stats based on average reading speed (~200 WPM)
  const { totalMinutes, wordCount } = useMemo(() => {
    if (typeof estimatedTime === 'number') {
      return { totalMinutes: estimatedTime, wordCount: estimatedTime * safeWpm };
    }
    if (typeof estimatedTime === 'string') {
      const match = estimatedTime.match(/(\d+)/);
      if (match) {
        const mins = Number.parseInt(match[1], 10);
        return { totalMinutes: mins, wordCount: mins * safeWpm };
      }
    }
    const count = calculateWordCount(effectiveContent);
    const mins = calculateReadTimeMinutes(effectiveContent, safeWpm);
    return { totalMinutes: mins, wordCount: count };
  }, [effectiveContent, estimatedTime, safeWpm]);

  // Compute dynamic remaining time based on current scroll progress and WPM
  const { formattedTotal, formattedRemaining, percent, remainingMinutes } = useMemo(() => {
    return calculateRemainingReadTime(
      effectiveContent || `${totalMinutes * safeWpm} words`,
      scrollProgress,
      safeWpm
    );
  }, [effectiveContent, totalMinutes, scrollProgress, safeWpm]);

  // Track scroll position through article
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const calculateScroll = () => {
      const targetEl = document.querySelector(targetSelector) as HTMLElement | null;

      if (targetEl) {
        const rect = targetEl.getBoundingClientRect();
        const elementHeight = targetEl.offsetHeight;
        const windowHeight = window.innerHeight;

        // Scrolled distance into the target article
        const scrolled = -rect.top + 80;
        const total = elementHeight - windowHeight + 120;

        if (total <= 0) return 0;
        return Math.min(Math.max(scrolled / total, 0), 1);
      }

      // Fallback to window scroll
      const docElement = document.documentElement;
      const body = document.body;
      const scrollTop = window.scrollY || docElement.scrollTop || body.scrollTop || 0;
      const scrollHeight = Math.max(docElement.scrollHeight, body.scrollHeight);
      const clientHeight = window.innerHeight || docElement.clientHeight;
      const totalScrollable = scrollHeight - clientHeight;

      if (totalScrollable <= 20) return 0;
      return Math.min(Math.max(scrollTop / totalScrollable, 0), 1);
    };

    const handleScroll = () => {
      if (rafId.current !== null) return;

      rafId.current = window.requestAnimationFrame(() => {
        const currentProgress = calculateScroll();
        setScrollProgress(currentProgress);
        setIsScrolledPastThreshold(window.scrollY > scrollTriggerThreshold || currentProgress > 0.02);
        rafId.current = null;
      });
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll, { passive: true });

    return () => {
      if (rafId.current !== null) {
        window.cancelAnimationFrame(rafId.current);
      }
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, [targetSelector, scrollTriggerThreshold]);

  const isCompleted = percent >= 95 || remainingMinutes === 0;

  // 1. Sidebar Variant (injected into Table of Contents sticky sidebar)
  if (variant === 'sidebar') {
    return (
      <div
        className={`note-read-time-indicator variant-sidebar ${isScrolledPastThreshold ? 'is-active' : ''} ${className}`}
        data-testid="read-time-indicator"
        data-testid-variant="sidebar"
        data-wpm={safeWpm}
        data-word-count={wordCount}
        data-estimated-minutes={totalMinutes}
        role="status"
        aria-label={`Estimated read time: ${formattedTotal}. Reading progress: ${percent}%`}
      >
        <div className="read-time-header">
          <div className="read-time-title-wrap">
            <span aria-hidden="true" className="read-time-icon">
              ⏱️
            </span>
            <span className="read-time-title">Estimated Read Time</span>
          </div>
          <span
            className="read-time-badge"
            data-testid="estimated-read-time-badge"
            title={`${wordCount.toLocaleString()} words (~${safeWpm} words per minute)`}
          >
            {formattedTotal}
          </span>
        </div>

        {/* Dynamic Progress Bar */}
        <div
          className="read-time-progress-track"
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Article reading progress"
        >
          <div
            className="read-time-progress-fill"
            data-testid="read-time-progress-bar"
            style={{ width: `${percent}%` }}
          />
        </div>

        {/* Dynamic Remaining Time readout */}
        <div className="read-time-footer">
          <span
            className={`read-time-remaining ${isCompleted ? 'is-completed' : ''}`}
            data-testid="read-time-remaining"
          >
            {isCompleted ? (
              <>
                <span aria-hidden="true" style={{ color: 'var(--emerald)' }}>✓</span> Completed
              </>
            ) : isScrolledPastThreshold && percent > 0 ? (
              formattedRemaining
            ) : (
              `~${wordCount.toLocaleString()} words`
            )}
          </span>
          <span className="read-time-percent">{percent}% read</span>
        </div>
      </div>
    );
  }

  // 2. Floating Mobile/Tablet Pill Variant
  if (variant === 'floating') {
    if (!isScrolledPastThreshold) return null;

    return (
      <aside
        className={`note-read-time-indicator variant-floating ${isCompleted ? 'is-completed' : ''} ${className}`}
        data-testid="read-time-indicator"
        data-testid-variant="floating"
        data-wpm={safeWpm}
        data-word-count={wordCount}
        data-estimated-minutes={totalMinutes}
        role="status"
        aria-live="polite"
        aria-label={`Reading progress: ${percent}%, ${formattedRemaining}`}
      >
        <span aria-hidden="true" className="read-time-icon">
          {isCompleted ? '✓' : '⏱️'}
        </span>
        <span
          className="read-time-badge"
          data-testid="estimated-read-time-badge"
        >
          {formattedTotal}
        </span>
        <span className="read-time-separator" aria-hidden="true">•</span>
        <span
          className="read-time-remaining"
          data-testid="read-time-remaining"
        >
          {isCompleted ? 'Completed' : `${formattedRemaining} (${percent}%)`}
        </span>
      </aside>
    );
  }

  // 3. Inline Article Header Variant (Top of NoteDetailPage content)
  return (
    <div
      className={`note-read-time-indicator variant-inline ${isScrolledPastThreshold ? 'is-active' : ''} ${className}`}
      data-testid="read-time-indicator"
      data-testid-variant="inline"
      data-wpm={safeWpm}
      data-word-count={wordCount}
      data-estimated-minutes={totalMinutes}
      role="status"
      aria-label={`Estimated reading time: ${formattedTotal}, ${wordCount} words (~${safeWpm} WPM)`}
    >
      <div className="read-time-inline-row">
        <span aria-hidden="true" className="read-time-icon">
          ⏱️
        </span>
        <span
          className="read-time-inline-label"
          data-testid="estimated-read-time-label"
        >
          Estimated read time:
        </span>
        <span
          className="read-time-badge"
          data-testid="estimated-read-time-badge"
        >
          {formattedTotal}
        </span>
        <span className="read-time-separator" aria-hidden="true">•</span>
        <span
          className="read-time-words"
          data-testid="estimated-read-time-words"
        >
          ~{wordCount.toLocaleString()} words ({safeWpm} WPM)
        </span>
        {isScrolledPastThreshold && percent > 0 && (
          <>
            <span className="read-time-separator" aria-hidden="true">•</span>
            <span
              className={`read-time-remaining ${isCompleted ? 'is-completed' : ''}`}
              data-testid="read-time-remaining"
            >
              {isCompleted ? '✓ Completed' : `${formattedRemaining} (${percent}%)`}
            </span>
          </>
        )}
      </div>

      <div
        className="read-time-progress-track inline-track"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="read-time-progress-fill"
          data-testid="read-time-progress-bar"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
};

export default ReadTimeProgressIndicator;
