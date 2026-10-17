import React, { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const PwaInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Check if already in standalone display mode
    const isStandaloneMode =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;

    setIsStandalone(isStandaloneMode);
    if (isStandaloneMode) return;

    // Check if iOS
    const ua = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(ua) && !(window as unknown as { MSStream?: unknown }).MSStream;
    setIsIOS(isIOSDevice);

    // Listen for Chrome / Android beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Check if dismissed in this session
      if (!sessionStorage.getItem('pwa_prompt_dismissed')) {
        setShowBanner(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setShowBanner(false);
        setDeferredPrompt(null);
      }
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    setShowIOSGuide(false);
    sessionStorage.setItem('pwa_prompt_dismissed', 'true');
  };

  if (isStandalone) {
    return null;
  }

  return (
    <>
      {/* Android & Desktop Banner */}
      {showBanner && deferredPrompt && (
        <div
          role="region"
          aria-label="App Installation Banner"
          style={{
            position: 'fixed',
            bottom: '1.25rem',
            left: '1.25rem',
            zIndex: 998,
            maxWidth: '360px',
            backgroundColor: '#ffffff',
            border: '1px solid var(--line)',
            borderRadius: '10px',
            padding: '1rem',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <img
              src="/assets/icons/pwa-192.png"
              alt="Jawed Imtiaz IT Support &amp; Workplace Technology application launcher icon"
              style={{ width: '42px', height: '42px', borderRadius: '8px' }}
            />
            <div>
              <strong style={{ display: 'block', fontSize: '0.95rem' }}>Install Jawed App</strong>
              <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
                Offline access to IT tools &amp; guides
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={handleDismiss}
              className="button button-secondary"
              style={{ padding: '0.35rem 0.75rem', fontSize: '0.85rem' }}
            >
              Not now
            </button>
            <button
              type="button"
              onClick={handleInstallClick}
              className="button"
              style={{ padding: '0.35rem 0.9rem', fontSize: '0.85rem' }}
            >
              Install App
            </button>
          </div>
        </div>
      )}

      {/* iOS Modal Guide */}
      {showIOSGuide && isIOS && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="ios-guide-title"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 9999,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '1rem'
          }}
        >
          <div
            style={{
              backgroundColor: '#fff',
              maxWidth: '380px',
              width: '100%',
              borderRadius: '12px',
              padding: '1.75rem',
              boxShadow: '0 12px 32px rgba(0,0,0,0.2)',
              textAlign: 'center'
            }}
          >
            <img
              src="/assets/icons/apple-touch-icon.png"
              alt="Jawed Imtiaz Apple Touch Icon for iOS Home Screen"
              style={{ width: '56px', height: '56px', borderRadius: '12px', margin: '0 auto 1rem' }}
            />
            <h3 id="ios-guide-title" style={{ margin: '0 0 0.5rem', fontSize: '1.25rem' }}>
              Add to Home Screen
            </h3>
            <p style={{ fontSize: '0.92rem', color: 'var(--muted)', lineHeight: 1.5, margin: '0 0 1.25rem' }}>
              Install <strong>Jawed Imtiaz</strong> on your iPhone or iPad for quick access to IT checklists and calculators:
            </p>
            <ol
              style={{
                textAlign: 'left',
                paddingLeft: '1.25rem',
                margin: '0 0 1.5rem',
                fontSize: '0.9rem',
                lineHeight: 1.6
              }}
            >
              <li>
                Tap the <strong>Share</strong> button at the bottom of Safari (the square with an arrow pointing up).
              </li>
              <li>
                Scroll down and tap <strong>Add to Home Screen</strong>.
              </li>
              <li>
                Tap <strong>Add</strong> in the top right corner.
              </li>
            </ol>
            <button
              type="button"
              className="button"
              onClick={() => setShowIOSGuide(false)}
              style={{ width: '100%' }}
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {/* Manual Trigger Hook exposed to window for footer or help button */}
      <div id="pwa-trigger-container" style={{ display: 'none' }}>
        <button
          id="pwa-install-btn"
          type="button"
          onClick={() => {
            if (isIOS) setShowIOSGuide(true);
            else if (deferredPrompt) handleInstallClick();
          }}
        />
      </div>
    </>
  );
};
