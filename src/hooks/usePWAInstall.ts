import { useState, useEffect, useCallback } from 'react';

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms?: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform?: string;
  }>;
  prompt(): Promise<void>;
}

let cachedDeferredPrompt: any = null;

export function resetCachedPWAInstallPrompt(): void {
  cachedDeferredPrompt = null;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(() => cachedDeferredPrompt);
  const [isInstallable, setIsInstallable] = useState<boolean>(() => Boolean(cachedDeferredPrompt));
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [isIOS, setIsIOS] = useState<boolean>(false);
  const [isStandalone, setIsStandalone] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Detect standalone display mode (running as installed PWA)
    const checkStandalone = () => {
      if (typeof window.matchMedia !== 'function') return;
      const isStandaloneMode =
        window.matchMedia('(display-mode: standalone)').matches ||
        window.matchMedia('(display-mode: fullscreen)').matches ||
        window.matchMedia('(display-mode: minimal-ui)').matches ||
        (window.navigator as unknown as { standalone?: boolean })?.standalone === true;

      setIsStandalone(Boolean(isStandaloneMode));
      if (isStandaloneMode) {
        setIsInstalled(true);
      }
    };

    checkStandalone();

    // Detect iOS devices (iPhone, iPad, iPod)
    const ua = window.navigator?.userAgent?.toLowerCase() || '';
    const isIOSDevice = /iphone|ipad|ipod/.test(ua) && !('MSStream' in window);
    setIsIOS(isIOSDevice);

    const handler = (e: any) => {
      if (typeof e?.preventDefault === 'function') {
        e.preventDefault();
      }
      cachedDeferredPrompt = e;
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      cachedDeferredPrompt = null;
      setIsInstallable(false);
      setDeferredPrompt(null);
      setIsInstalled(true);
    };

    const handleSyncState = () => {
      setDeferredPrompt(cachedDeferredPrompt);
      setIsInstallable(Boolean(cachedDeferredPrompt));
    };

    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('pwa-install-state-sync', handleSyncState);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('pwa-install-state-sync', handleSyncState);
    };
  }, []);

  const triggerInstall = useCallback(async (): Promise<boolean> => {
    const activePrompt = deferredPrompt || cachedDeferredPrompt;
    if (!activePrompt) return false;

    try {
      await activePrompt.prompt();
      const { outcome } = await activePrompt.userChoice;
      if (outcome === 'accepted') {
        cachedDeferredPrompt = null;
        setIsInstallable(false);
        setDeferredPrompt(null);
        setIsInstalled(true);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('pwa-install-state-sync'));
        }
        return true;
      }
      return false;
    } catch (err) {
      console.warn('[PWA] Installation prompt error:', err);
      return false;
    }
  }, [deferredPrompt]);

  return {
    isInstallable,
    triggerInstall,
    install: triggerInstall,
    deferredPrompt,
    isInstalled,
    isStandalone,
    isIOS: !isStandalone && isIOS,
  };
}

export default usePWAInstall;

