import React, { useState, useEffect } from 'react';
import { Image } from './Image';

const STORAGE_KEY = 'ios_pwa_prompt_dismissed_until';
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export const IosInstallPrompt: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if running on client
    if (typeof window === 'undefined') return;

    // Detect iOS (iPhone, iPad, iPod)
    const ua = window.navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(ua) && !('MSStream' in window);

    // Detect if running in standalone PWA mode
    const isStandalone =
      (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
      window.matchMedia('(display-mode: standalone)').matches;

    // Check localStorage 30-day throttle
    const dismissedUntil = localStorage.getItem(STORAGE_KEY);
    const now = Date.now();
    const isThrottled = dismissedUntil ? parseInt(dismissedUntil, 10) > now : false;

    // Show prompt only if on iOS, NOT standalone, and NOT throttled
    if (isIOS && !isStandalone && !isThrottled) {
      // Delay prompt by 2 seconds for smooth initial page load
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    const futureTimestamp = Date.now() + THIRTY_DAYS_MS;
    try {
      localStorage.setItem(STORAGE_KEY, futureTimestamp.toString());
    } catch (e) {
      console.warn('Unable to save PWA prompt preference to localStorage:', e);
    }
  };

  if (!isVisible) return null;

  return (
    <div
      className="ios-pwa-bottom-sheet"
      role="dialog"
      aria-labelledby="ios-pwa-title"
      aria-describedby="ios-pwa-desc"
    >
      <div className="ios-pwa-content">
        <div className="ios-pwa-header">
          <div className="ios-pwa-icon" style={{ overflow: 'hidden', padding: 0 }}>
            <Image
              src="/apple-touch-icon.png"
              alt="Jawed Imtiaz PWA Icon"
              width={40}
              height={40}
              priority={true}
              style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '10px', display: 'block' }}
            />
          </div>
          <div className="ios-pwa-titles">
            <h3 id="ios-pwa-title">Install Jawed Imtiaz App</h3>
            <p id="ios-pwa-desc">Install on your iPhone or iPad home screen for fast access to IT field tools &amp; guides.</p>
          </div>
          <button
            type="button"
            className="ios-pwa-close-btn"
            onClick={handleDismiss}
            aria-label="Dismiss installation prompt for 30 days"
          >
            ✕
          </button>
        </div>

        <div className="ios-pwa-steps">
          <div className="ios-pwa-step">
            <span className="step-num">1</span>
            <span>Tap the <strong>Share</strong> icon <span className="share-icon-graphic">⎋</span> in Safari’s bottom toolbar.</span>
          </div>
          <div className="ios-pwa-step">
            <span className="step-num">2</span>
            <span>Scroll down and tap <strong>Add to Home Screen ⊞</strong>.</span>
          </div>
        </div>

        <div className="ios-pwa-actions">
          <button
            type="button"
            className="ios-pwa-dismiss-btn"
            onClick={handleDismiss}
          >
            Don’t Show Again (30 Days)
          </button>
        </div>
      </div>
    </div>
  );
};
