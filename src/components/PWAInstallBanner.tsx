import React, { useState, useEffect } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Image } from './Image';

const ANDROID_DISMISS_KEY = 'pwa_android_prompt_dismissed_until';
const IOS_DISMISS_KEY = 'ios_pwa_prompt_dismissed_until';
const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;

export const PWAInstallBanner: React.FC = () => {
  const { isInstallable, isInstalled, isStandalone, isIOS, install } = usePWAInstall();
  const [showAndroidBanner, setShowAndroidBanner] = useState<boolean>(false);
  const [showIOSSheet, setShowIOSSheet] = useState<boolean>(false);
  const [installing, setInstalling] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (isStandalone || isInstalled) return;

    const now = Date.now();

    // Check Android / Desktop prompt eligibility
    if (isInstallable) {
      const dismissedUntil = localStorage.getItem(ANDROID_DISMISS_KEY);
      const isThrottled = dismissedUntil ? parseInt(dismissedUntil, 10) > now : false;
      if (!isThrottled) {
        const timer = setTimeout(() => setShowAndroidBanner(true), 2500);
        return () => clearTimeout(timer);
      }
    }

    // Check iOS prompt eligibility
    if (isIOS) {
      const dismissedUntil = localStorage.getItem(IOS_DISMISS_KEY);
      const isThrottled = dismissedUntil ? parseInt(dismissedUntil, 10) > now : false;
      if (!isThrottled) {
        const timer = setTimeout(() => setShowIOSSheet(true), 3000);
        return () => clearTimeout(timer);
      }
    }
  }, [isInstallable, isIOS, isInstalled, isStandalone]);

  // Listen for manual trigger (e.g. from Header "Install" button)
  useEffect(() => {
    const handleManualTrigger = () => {
      if (isInstallable) {
        setShowAndroidBanner(true);
      } else if (isIOS) {
        setShowIOSSheet(true);
      }
    };

    window.addEventListener('open-pwa-install', handleManualTrigger);
    return () => window.removeEventListener('open-pwa-install', handleManualTrigger);
  }, [isInstallable, isIOS]);

  const handleDismissAndroid = () => {
    setShowAndroidBanner(false);
    try {
      localStorage.setItem(ANDROID_DISMISS_KEY, (Date.now() + FOURTEEN_DAYS_MS).toString());
    } catch {
      // Ignore storage errors
    }
  };

  const handleDismissIOS = () => {
    setShowIOSSheet(false);
    try {
      localStorage.setItem(IOS_DISMISS_KEY, (Date.now() + FOURTEEN_DAYS_MS).toString());
    } catch {
      // Ignore storage errors
    }
  };

  const handleInstallClick = async () => {
    setInstalling(true);
    try {
      const success = await install();
      if (success) {
        setShowAndroidBanner(false);
      }
    } finally {
      setInstalling(false);
    }
  };

  // If already installed or running as standalone PWA, suppress all prompts
  if (isStandalone || isInstalled) {
    return null;
  }

  return (
    <>
      {/* Android / Desktop Install Prompt Banner */}
      {showAndroidBanner && isInstallable && (
        <aside
          className="pwa-install-banner"
          role="dialog"
          aria-labelledby="pwa-install-title"
          aria-describedby="pwa-install-desc"
        >
          <div className="pwa-install-content">
            <div className="pwa-install-icon">
              <Image
                src="/pwa-192x192.png"
                alt="Jawed Imtiaz App Icon"
                width={48}
                height={48}
                priority={true}
                style={{ width: '48px', height: '48px', borderRadius: '12px', objectFit: 'cover' }}
              />
            </div>
            <div className="pwa-install-info">
              <strong id="pwa-install-title">Install Jawed Imtiaz App</strong>
              <p id="pwa-install-desc">Fast offline access to IT diagnostic tools, subnetting, and field guides.</p>
            </div>
            <div className="pwa-install-buttons">
              <button
                type="button"
                className="button button-primary pwa-install-action-btn"
                onClick={handleInstallClick}
                disabled={installing}
              >
                {installing ? 'Installing...' : '📲 Install App'}
              </button>
              <button
                type="button"
                className="pwa-install-close-btn"
                onClick={handleDismissAndroid}
                aria-label="Dismiss installation prompt"
                title="Dismiss"
              >
                ✕
              </button>
            </div>
          </div>
        </aside>
      )}

      {/* iOS Safari "Add to Home Screen" Bottom Sheet */}
      {showIOSSheet && isIOS && (
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
                  alt="Jawed Imtiaz App Icon"
                  width={44}
                  height={44}
                  priority={true}
                  style={{ width: '44px', height: '44px', objectFit: 'cover', borderRadius: '10px', display: 'block' }}
                />
              </div>
              <div className="ios-pwa-titles">
                <h3 id="ios-pwa-title">Install on iPhone / iPad</h3>
                <p id="ios-pwa-desc">Add to Home Screen for fast, full-screen offline access to IT tools.</p>
              </div>
              <button
                type="button"
                className="ios-pwa-close-btn"
                onClick={handleDismissIOS}
                aria-label="Dismiss installation prompt"
              >
                ✕
              </button>
            </div>

            <div className="ios-pwa-steps">
              <div className="ios-pwa-step">
                <span className="step-num">1</span>
                <span>Tap the <strong>Share</strong> icon <span className="share-icon-graphic">⎋</span> in Safari’s bottom navigation bar.</span>
              </div>
              <div className="ios-pwa-step">
                <span className="step-num">2</span>
                <span>Scroll down and select <strong>Add to Home Screen ⊞</strong>.</span>
              </div>
            </div>

            <div className="ios-pwa-actions">
              <button
                type="button"
                className="ios-pwa-dismiss-btn"
                onClick={handleDismissIOS}
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
