import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';

export interface ScrollProgressProps {
  /** If specified, tracks scroll within or relative to this container instead of window */
  targetRef?: React.RefObject<HTMLElement>;
  /** Force the progress bar to show even on non-guide pages */
  forceShow?: boolean;
  /** Scroll completion threshold between 0 and 1 (defaults to 0.88 or 88%) */
  completionThreshold?: number;
  /** Whether to show the subtle completion toast at the end of the article (defaults to true) */
  showCompletionToast?: boolean;
  /** Optional custom callback when jumping to related articles */
  onJumpToRelated?: () => void;
}

/**
 * Subtle top-of-page progress indicator and end-of-article completion toast
 * that updates based on the user's scroll depth and encourages engaging with
 * the 'Related Articles' section.
 */
export const ScrollProgress: React.FC<ScrollProgressProps> = ({
  targetRef,
  forceShow = false,
  completionThreshold = 0.88,
  showCompletionToast = true,
  onJumpToRelated,
}) => {
  const [progress, setProgress] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [hasReachedEnd, setHasReachedEnd] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [hasRelatedSection, setHasRelatedSection] = useState(false);
  const location = useLocation();
  const rafId = useRef<number | null>(null);

  // Check if current route is a long-form IT guide, note, or technical blog article
  const isGuideRoute = /^\/(guides|field-guides|notes|blog)(\/|$)/.test(location.pathname);
  const shouldActivate = forceShow || isGuideRoute;

  // Check if page contains a Related Articles section
  const checkForRelatedSection = useCallback(() => {
    if (typeof document === 'undefined') return false;
    const el = document.querySelector(
      '.related-articles-section, [data-testid="related-articles-section"], #related-articles'
    );
    return Boolean(el);
  }, []);

  // Reset completion toast state on route navigation
  useEffect(() => {
    setIsDismissed(false);
    setHasReachedEnd(false);

    const check = () => {
      setHasRelatedSection(checkForRelatedSection());
    };

    check();
    const timer = setTimeout(check, 600);
    return () => clearTimeout(timer);
  }, [location.pathname, checkForRelatedSection]);

  useEffect(() => {
    if (!shouldActivate) {
      setProgress(0);
      setIsVisible(false);
      setHasReachedEnd(false);
      return;
    }

    const calculateProgress = () => {
      if (targetRef && targetRef.current) {
        const el = targetRef.current;
        const rect = el.getBoundingClientRect();
        const elementHeight = el.offsetHeight;
        const windowHeight = window.innerHeight;

        const scrolled = -rect.top;
        const total = elementHeight - windowHeight;
        if (total <= 0) return 0;
        return Math.min(Math.max(scrolled / total, 0), 1);
      }

      const docElement = document.documentElement;
      const body = document.body;
      const scrollTop = window.scrollY || docElement.scrollTop || body.scrollTop || 0;
      const scrollHeight = Math.max(
        docElement.scrollHeight,
        body.scrollHeight,
        docElement.offsetHeight,
        body.offsetHeight,
        docElement.clientHeight
      );
      const clientHeight = window.innerHeight || docElement.clientHeight;
      const totalScrollable = scrollHeight - clientHeight;

      if (totalScrollable <= 20) {
        return 0;
      }

      return Math.min(Math.max(scrollTop / totalScrollable, 0), 1);
    };

    const handleScroll = () => {
      if (rafId.current !== null) {
        return;
      }
      rafId.current = window.requestAnimationFrame(() => {
        const currentProgress = calculateProgress();
        setProgress(currentProgress);
        setIsVisible(currentProgress > 0.005 || window.scrollY > 20);

        // Check if user has reached the end of the article
        if (currentProgress >= completionThreshold) {
          const hasSection = hasRelatedSection || checkForRelatedSection();
          if (hasSection) {
            setHasRelatedSection(true);
            setHasReachedEnd(true);
          }
        } else if (currentProgress < completionThreshold - 0.15) {
          setHasReachedEnd(false);
        }

        rafId.current = null;
      });
    };

    // Initial check
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
  }, [
    shouldActivate,
    targetRef,
    location.pathname,
    completionThreshold,
    hasRelatedSection,
    checkForRelatedSection,
  ]);

  const handleJumpToRelated = useCallback(() => {
    if (onJumpToRelated) {
      onJumpToRelated();
      return;
    }

    if (typeof document === 'undefined') return;
    const targetElement = document.querySelector(
      '.related-articles-section, [data-testid="related-articles-section"], #related-articles'
    );

    if (targetElement && typeof targetElement.scrollIntoView === 'function') {
      targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      const focusableChild = targetElement.querySelector<HTMLElement>('h2, a, [tabindex]');
      if (focusableChild && typeof focusableChild.focus === 'function') {
        focusableChild.focus();
      }
    }
  }, [onJumpToRelated]);

  if (!shouldActivate) {
    return null;
  }

  const percent = Math.round(progress * 100);
  const shouldShowToast =
    showCompletionToast &&
    hasReachedEnd &&
    !isDismissed &&
    hasRelatedSection;

  return (
    <>
      <div
        className={`scroll-progress-container ${isVisible ? 'is-visible' : ''}`}
        role="progressbar"
        aria-label="Reading progress"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        title={`Reading progress: ${percent}%`}
      >
        <div
          className="scroll-progress-bar"
          style={{
            transform: `scaleX(${progress})`,
          }}
        />
      </div>

      {/* Subtle End-of-Article Percentage Completion Toast */}
      {shouldShowToast && (
        <aside
          role="status"
          aria-live="polite"
          className="scroll-completion-toast"
          data-testid="scroll-completion-toast"
          aria-label="Article reading completion and related articles recommendation"
        >
          <div className="scroll-completion-toast-content">
            <span
              className="scroll-completion-badge"
              data-testid="completion-percentage-badge"
              title={`Article ${Math.max(percent, 90)}% completed`}
            >
              <span aria-hidden="true" className="scroll-completion-icon">
                ✓
              </span>
              <span>{Math.max(percent, 90)}% Completed</span>
            </span>
            <span className="scroll-completion-text">
              Finished reading? Explore recommended articles below.
            </span>
          </div>

          <div className="scroll-completion-actions">
            <button
              type="button"
              onClick={handleJumpToRelated}
              className="scroll-completion-cta-btn"
              data-testid="jump-to-related-articles-btn"
              title="Jump directly to Related Articles section"
            >
              <span>Related Articles</span>
              <span aria-hidden="true" style={{ fontSize: '0.85rem' }}>
                ↓
              </span>
            </button>
            <button
              type="button"
              onClick={() => setIsDismissed(true)}
              className="scroll-completion-dismiss-btn"
              data-testid="dismiss-completion-toast-btn"
              aria-label="Dismiss reading completion toast"
              title="Dismiss"
            >
              ✕
            </button>
          </div>
        </aside>
      )}
    </>
  );
};

export const ReadingProgressBar = ScrollProgress;
export {
  ScrollProgressIndicator,
  type ScrollProgressIndicatorProps,
} from './ScrollProgressIndicator';
export default ScrollProgress;
