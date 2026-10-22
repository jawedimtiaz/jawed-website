import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

export interface ScrollProgressProps {
  /** If specified, tracks scroll within or relative to this container instead of window */
  targetRef?: React.RefObject<HTMLElement>;
  /** Force the progress bar to show even on non-guide pages */
  forceShow?: boolean;
}

/**
 * Subtle top-of-page progress indicator that updates based on the user's
 * scroll depth to help users navigate long-form IT guides.
 */
export const ScrollProgress: React.FC<ScrollProgressProps> = ({
  targetRef,
  forceShow = false,
}) => {
  const [progress, setProgress] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const location = useLocation();
  const rafId = useRef<number | null>(null);

  // Check if current route is a long-form IT guide or article
  const isGuideRoute = /^\/(guides|field-guides|notes|blog)(\/|$)/.test(location.pathname);
  const shouldActivate = forceShow || isGuideRoute;

  useEffect(() => {
    if (!shouldActivate) {
      setProgress(0);
      setIsVisible(false);
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
  }, [shouldActivate, targetRef, location.pathname]);

  if (!shouldActivate) {
    return null;
  }

  const percent = Math.round(progress * 100);

  return (
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
  );
};

export const ReadingProgressBar = ScrollProgress;
export default ScrollProgress;
