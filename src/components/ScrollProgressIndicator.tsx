import React, { useState, useEffect, useRef, useMemo } from 'react';

export interface ScrollProgressIndicatorProps {
  /** Target element selector to measure progress through. Defaults to article content */
  targetSelector?: string;
  /** Layout placement: 'fixed-top' (fixed at viewport top), 'sticky-top' (sticky below header), or 'top-bar' */
  placement?: 'fixed-top' | 'sticky-top' | 'top-bar';
  /** Whether to show percentage badge readout alongside the bar */
  showPercentageLabel?: boolean;
  /** Scroll distance in pixels before activating/fading in the indicator */
  threshold?: number;
  /** Custom CSS classes */
  className?: string;
  /** Optional custom inline style overrides */
  style?: React.CSSProperties;
}

/**
 * ScrollProgressIndicator
 * Visually tracks the reader's scroll position as a sleek percentage bar
 * at the top of NoteDetailPage, integrating seamlessly with the layout
 * without disrupting the 2-column CSS grid structure.
 */
export const ScrollProgressIndicator: React.FC<ScrollProgressIndicatorProps> = ({
  targetSelector = '[data-testid="note-rendered-content"], .note-rendered-content, .quick-note-article',
  placement = 'sticky-top',
  showPercentageLabel = true,
  threshold = 10,
  className = '',
  style,
}) => {
  const [progress, setProgress] = useState<number>(0);
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const rafId = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const calculateScrollProgress = (): number => {
      // 1. Try to measure scroll progress through the target article element
      const targetEl = document.querySelector(targetSelector) as HTMLElement | null;

      if (targetEl) {
        const rect = targetEl.getBoundingClientRect();
        const elementHeight = targetEl.offsetHeight;
        const windowHeight = window.innerHeight;

        // Scrolled distance into target article
        const scrolled = -rect.top + 80;
        const total = elementHeight - windowHeight + 160;

        if (total <= 0) return 0;
        return Math.min(Math.max(scrolled / total, 0), 1);
      }

      // 2. Fallback to measuring window document scroll
      const docElement = document.documentElement;
      const body = document.body;
      const scrollTop = window.scrollY || docElement.scrollTop || body.scrollTop || 0;
      const scrollHeight = Math.max(
        docElement.scrollHeight,
        body.scrollHeight,
        docElement.offsetHeight,
        body.offsetHeight
      );
      const clientHeight = window.innerHeight || docElement.clientHeight;
      const totalScrollable = scrollHeight - clientHeight;

      if (totalScrollable <= 20) return 0;
      return Math.min(Math.max(scrollTop / totalScrollable, 0), 1);
    };

    const handleScroll = () => {
      if (rafId.current !== null) return;

      rafId.current = window.requestAnimationFrame(() => {
        const currentProgress = calculateScrollProgress();
        setProgress(currentProgress);
        setIsVisible(window.scrollY > threshold || currentProgress > 0.01);
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
  }, [targetSelector, threshold]);

  const percent = useMemo(() => Math.round(progress * 100), [progress]);
  const isCompleted = percent >= 95;

  return (
    <div
      className={`scroll-progress-indicator placement-${placement} ${isVisible ? 'is-active' : ''} ${className} no-print`.trim()}
      data-testid="scroll-progress-indicator"
      data-placement={placement}
      role="progressbar"
      aria-label="Article reading scroll progress"
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={100}
      title={`Reading progress: ${percent}%`}
      style={style}
    >
      <div className="scroll-progress-indicator-inner">
        {/* Progress bar track & fill */}
        <div className="scroll-progress-indicator-track">
          <div
            className="scroll-progress-indicator-bar"
            data-testid="scroll-progress-bar"
            style={{
              width: `${percent}%`,
            }}
          />
        </div>

        {/* Optional Percentage Badge / Label */}
        {showPercentageLabel && (
          <div
            className={`scroll-progress-percentage-badge ${isCompleted ? 'is-completed' : ''}`}
            data-testid="scroll-percentage-badge"
            aria-hidden="true"
          >
            {isCompleted ? (
              <span className="scroll-percentage-text" data-testid="scroll-percentage-text">
                ✓ 100%
              </span>
            ) : (
              <span className="scroll-percentage-text" data-testid="scroll-percentage-text">
                {percent}%
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ScrollProgressIndicator;
