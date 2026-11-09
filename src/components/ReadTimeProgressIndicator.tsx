import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  calculateRemainingReadTime,
  calculateReadTimeMinutes,
  calculateWordCount,
} from '../utils/readTimeHelper';

export interface ReadTimeProgressIndicatorProps {
  /** The article's raw or rendered text content used to calculate word count and read time */
  content?: string;
  /** Pre-calculated estimated read time string (e.g. '5 min read') or minutes number */
  estimatedTime?: string | number;
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
  targetSelector = '[data-testid="note-rendered-content"], .note-rendered-content',
  variant = 'sidebar',
  scrollTriggerThreshold = 40,
  className = '',
}) => {
  const [scrollProgress, setScrollProgress] = useState<number>(0);
  const [isScrolledPastThreshold, setIsScrolledPastThreshold] = useState<boolean>(false);
  const rafId = useRef<number | null>(null);

  // Compute base read time and word stats
  const { totalMinutes, wordCount } = useMemo(() => {
    if (typeof estimatedTime === 'number') {
      return { totalMinutes: estimatedTime, wordCount: estimatedTime * 200 };
    }
    if (typeof estimatedTime === 'string') {
      const match = estimatedTime.match(/(\d+)/);
      if (match) {
        const mins = Number.parseInt(match[1], 10);
        return { totalMinutes: mins, wordCount: mins * 200 };
      }
    }
    const count = calculateWordCount(content);
    const mins = calculateReadTimeMinutes(content);
    return { totalMinutes: mins, wordCount: count };
  }, [content, estimatedTime]);

  // Compute dynamic remaining time based on current scroll progress
  const { formattedTotal, formattedRemaining, percent, remainingMinutes } = useMemo(() => {
    return calculateRemainingReadTime(content || `${totalMinutes * 200} words`, scrollProgress);
  }, [content, totalMinutes, scrollProgress]);

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
            title={`${wordCount.toLocaleString()} words (~200 words per minute)`}
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

  // 3. Inline Article Header Variant
  return (
    <div
      className={`note-read-time-indicator variant-inline ${isScrolledPastThreshold ? 'is-active' : ''} ${className}`}
      data-testid="read-time-indicator"
      data-testid-variant="inline"
      role="status"
      aria-label={`Estimated reading time: ${formattedTotal}, ${wordCount} words`}
    >
      <div className="read-time-inline-row">
        <span aria-hidden="true" className="read-time-icon">
          ⏱️
        </span>
        <span
          className="read-time-badge"
          data-testid="estimated-read-time-badge"
        >
          {formattedTotal}
        </span>
        <span className="read-time-separator" aria-hidden="true">•</span>
        <span className="read-time-words">
          ~{wordCount.toLocaleString()} words
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
