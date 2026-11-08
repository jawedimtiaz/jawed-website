import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Save,
  RotateCcw,
  Check,
  Sparkles,
  X,
  Wifi,
  WifiOff,
  FileCheck,
  Clock,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import {
  saveDiagnosticFormDraft,
  loadDiagnosticFormDraft,
  clearDiagnosticFormDraft,
  formatDiagnosticTimestamp,
  getElementIdentifier,
  DIAGNOSTIC_STORAGE_PREFIX,
  DEFAULT_PERIODIC_AUTOSAVE_MS,
} from '../hooks/useDiagnosticToolStorage';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import {
  ShareToolLinkButton,
  copyToolShareUrlToClipboard,
  resolveToolShareUrl,
  SHARE_TOAST_MESSAGE,
} from './common/ShareToolLinkButton';

export {
  ShareToolLinkButton,
  copyToolShareUrlToClipboard,
  resolveToolShareUrl,
  SHARE_TOAST_MESSAGE,
};

export const GLOBAL_DIAGNOSTIC_AUTO_KEY = 'diag_auto_';
export const PERIODIC_AUTOSAVE_INTERVAL_MS = 5000;

export interface ToolHeaderAutoSaveIndicatorProps {
  lastSavedTime: number | null;
  isOnline: boolean;
  isPeriodicSaving?: boolean;
  restoredCount?: number;
  onSaveNow?: () => void;
  onDiscardDraft?: () => void;
  compact?: boolean;
}

/**
 * Reassuring Tool Header Timestamp Indicator Component
 * Displays real-time 'Last saved' timestamp and 5-second periodic auto-save heartbeat.
 */
export const ToolHeaderAutoSaveIndicator: React.FC<ToolHeaderAutoSaveIndicatorProps> = ({
  lastSavedTime,
  isOnline,
  isPeriodicSaving = false,
  restoredCount = 0,
  onSaveNow,
  onDiscardDraft,
  compact = false,
}) => {
  const formattedTime = formatDiagnosticTimestamp(lastSavedTime);

  return (
    <div
      data-testid="tool-header-last-saved-indicator"
      className="tool-header-autosave-bar no-print"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '10px',
        padding: compact ? '6px 12px' : '10px 14px',
        borderRadius: '10px',
        background: !isOnline
          ? 'rgba(245, 158, 11, 0.12)'
          : isPeriodicSaving
          ? 'rgba(56, 189, 248, 0.14)'
          : 'rgba(15, 23, 42, 0.7)',
        border: !isOnline
          ? '1px solid rgba(245, 158, 11, 0.35)'
          : isPeriodicSaving
          ? '1px solid rgba(56, 189, 248, 0.45)'
          : '1px solid var(--line, rgba(255, 255, 255, 0.1))',
        fontSize: '0.8rem',
        marginBottom: '12px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
        transition: 'all 0.25s ease',
      }}
    >
      {/* Left: Auto-save status and Last Saved timestamp */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        {/* Pulsing auto-save heartbeat indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span
            style={{
              position: 'relative',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '10px',
              height: '10px',
            }}
          >
            <span
              style={{
                position: 'absolute',
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                backgroundColor: isPeriodicSaving ? '#38bdf8' : !isOnline ? '#fbbf24' : '#34d399',
                opacity: 0.75,
                animation: isPeriodicSaving ? 'ping 1s cubic-bezier(0, 0, 0.2, 1) infinite' : 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
              }}
            />
            <span
              style={{
                position: 'relative',
                display: 'inline-block',
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: isPeriodicSaving ? '#38bdf8' : !isOnline ? '#f59e0b' : '#10b981',
              }}
            />
          </span>

          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '2px 7px',
              borderRadius: '6px',
              fontSize: '0.7rem',
              fontWeight: 700,
              letterSpacing: '0.02em',
              background: 'rgba(56, 189, 248, 0.12)',
              color: '#38bdf8',
              border: '1px solid rgba(56, 189, 248, 0.25)',
            }}
            title="Auto-saves every 5 seconds to browser localStorage"
          >
            <Clock size={11} />
            <span>Auto-saving every 5s</span>
          </span>
        </div>

        {/* Primary Last Saved Timestamp Text */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span
            data-testid="last-saved-timestamp-text"
            style={{
              fontWeight: 700,
              color: isPeriodicSaving ? '#38bdf8' : 'var(--text-heading, #f8fafc)',
              fontSize: '0.82rem',
            }}
          >
            {isPeriodicSaving
              ? 'Saving draft...'
              : formattedTime
              ? `Last saved: ${formattedTime}`
              : 'Auto-save ready (inputs saved to local storage)'}
          </span>

          {formattedTime && !isPeriodicSaving && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
                fontSize: '0.7rem',
                color: '#34d399',
                fontWeight: 600,
              }}
              title="Verified: form data safely persisted to localStorage"
            >
              <Check size={12} />
              <span>Safe</span>
            </span>
          )}
        </div>

        {/* Reassurance helper text */}
        <span
          style={{
            fontSize: '0.73rem',
            color: 'var(--text-muted, #94a3b8)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <ShieldCheck size={13} color="var(--accent, #38bdf8)" style={{ flexShrink: 0 }} />
          <span>Inputs safe across page refresh, tab close, or connection drop</span>
        </span>
      </div>

      {/* Right: Actions and Connection Status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {/* Restored notice chip */}
        {restoredCount > 0 && (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '2px 8px',
              borderRadius: '6px',
              fontSize: '0.7rem',
              fontWeight: 600,
              background: 'rgba(56, 189, 248, 0.16)',
              color: '#38bdf8',
              border: '1px solid rgba(56, 189, 248, 0.3)',
            }}
          >
            <FileCheck size={12} />
            <span>{restoredCount} input{restoredCount > 1 ? 's' : ''} restored</span>
          </span>
        )}

        {/* Online / Offline indicator */}
        {!isOnline ? (
          <span
            data-testid="offline-mode-pill"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '2px 8px',
              borderRadius: '6px',
              fontSize: '0.7rem',
              fontWeight: 700,
              background: 'rgba(245, 158, 11, 0.2)',
              color: '#fbbf24',
              border: '1px solid rgba(245, 158, 11, 0.4)',
            }}
            title="Connection dropped — inputs are continuously saved to your browser"
          >
            <WifiOff size={11} />
            <span>Offline</span>
          </span>
        ) : (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '0.7rem',
              color: '#34d399',
              fontWeight: 600,
            }}
          >
            <Wifi size={11} />
            <span>Online</span>
          </span>
        )}

        {/* Discard / Reset Draft Button */}
        {onDiscardDraft && restoredCount > 0 && (
          <button
            type="button"
            data-testid="header-discard-draft-btn"
            onClick={onDiscardDraft}
            title="Discard saved draft and reload default values"
            style={{
              padding: '3px 8px',
              fontSize: '0.72rem',
              borderRadius: '6px',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              background: 'rgba(239, 68, 68, 0.15)',
              color: '#fca5a5',
              cursor: 'pointer',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <RotateCcw size={11} />
            <span>Reset</span>
          </button>
        )}

        {/* Manual Save Now Button */}
        {onSaveNow && (
          <button
            type="button"
            data-testid="header-save-now-btn"
            onClick={onSaveNow}
            title="Save draft immediately to browser localStorage"
            style={{
              padding: '3px 9px',
              fontSize: '0.72rem',
              borderRadius: '6px',
              border: '1px solid rgba(56, 189, 248, 0.4)',
              background: 'rgba(56, 189, 248, 0.15)',
              color: '#38bdf8',
              cursor: 'pointer',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              transition: 'all 0.15s ease',
            }}
          >
            <Save size={11} />
            <span>Save Now</span>
          </button>
        )}

        {/* Share Tool Link Button (copies tool URL + shows 'Link copied!' toast) */}
        <ShareToolLinkButton size="sm" label="Share" />
      </div>
    </div>
  );
};

/**
 * Universal Route-Level Form Persistence Component
 * Automatically watches, saves every 5 seconds, and restores form inputs across all diagnostic tools in /tools/*
 */
export const DiagnosticToolsAutoPersist: React.FC = () => {
  const { pathname } = useLocation();
  const isOnline = useOnlineStatus();
  const [restoredCount, setRestoredCount] = useState<number>(0);
  const [lastSavedTime, setLastSavedTime] = useState<number | null>(null);
  const [bannerVisible, setBannerVisible] = useState<boolean>(false);
  const [justSavedNotification, setJustSavedNotification] = useState<boolean>(false);
  const [isPeriodicSaving, setIsPeriodicSaving] = useState<boolean>(false);

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedSnapshotRef = useRef<string>('');

  const isToolRoute =
    pathname.startsWith('/tools/') ||
    pathname.startsWith('/diagnostic-tools') ||
    pathname.startsWith('/cable-length-') ||
    pathname.startsWith('/hardware-storage-') ||
    pathname.startsWith('/cctv-') ||
    pathname.startsWith('/raid-calculator') ||
    pathname.startsWith('/animate-');

  const toolSlug = pathname.replace(/^\/+|\/+$/g, '').replace(/^tools\//, '') || 'general_tool';
  const storageToolKey = `${GLOBAL_DIAGNOSTIC_AUTO_KEY}${toolSlug}`;

  // Serialize all interactive form elements currently in the tool DOM
  const serializeDomInputs = useCallback((): Record<string, any> => {
    if (typeof document === 'undefined') return {};

    const container = document.querySelector('.workspace, .panel, .tool-container, .card, .page, main');
    if (!container) return {};

    const elements = container.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
      'input, textarea, select'
    );

    const values: Record<string, any> = {};

    elements.forEach((el, idx) => {
      if (el instanceof HTMLInputElement) {
        const type = (el.type || '').toLowerCase();
        if (['password', 'file', 'submit', 'button', 'reset', 'image'].includes(type)) {
          return;
        }
        if (type === 'checkbox') {
          values[getElementIdentifier(el, idx)] = el.checked;
          return;
        }
        if (type === 'radio') {
          if (el.checked) {
            values[getElementIdentifier(el, idx)] = el.value;
          }
          return;
        }
        values[getElementIdentifier(el, idx)] = el.value;
        return;
      }

      if (el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) {
        values[getElementIdentifier(el, idx)] = el.value;
      }
    });

    return values;
  }, []);

  // Commit inputs to localStorage
  const persistCurrentDom = useCallback((isPeriodic = false) => {
    if (!isToolRoute) return;
    const data = serializeDomInputs();
    if (Object.keys(data).length > 0) {
      const jsonStr = JSON.stringify(data);
      lastSavedSnapshotRef.current = jsonStr;
      const savedAt = saveDiagnosticFormDraft(storageToolKey, data, 1, DIAGNOSTIC_STORAGE_PREFIX);
      if (savedAt) {
        setLastSavedTime(savedAt);
        if (isPeriodic) {
          setIsPeriodicSaving(true);
          setTimeout(() => setIsPeriodicSaving(false), 1200);
        }
      }
    }
  }, [isToolRoute, serializeDomInputs, storageToolKey]);

  // Attempt to restore saved inputs from storage into current DOM
  const restoreDomInputs = useCallback(() => {
    if (!isToolRoute || typeof document === 'undefined') return;

    const stored = loadDiagnosticFormDraft<Record<string, any>>(storageToolKey, {}, DIAGNOSTIC_STORAGE_PREFIX);
    if (!stored.isStored || !stored.data || Object.keys(stored.data).length === 0) {
      setBannerVisible(false);
      setRestoredCount(0);
      return;
    }

    const container = document.querySelector('.workspace, .panel, .tool-container, .card, .page, main');
    if (!container) return;

    const elements = container.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
      'input, textarea, select'
    );

    let restoredFieldsCount = 0;

    elements.forEach((el, idx) => {
      const identifier = getElementIdentifier(el, idx);
      if (!(identifier in stored.data)) return;

      const val = stored.data[identifier];
      if (val === undefined || val === null) return;

      if (el instanceof HTMLInputElement) {
        const type = (el.type || '').toLowerCase();
        if (['password', 'file', 'submit', 'button', 'reset', 'image'].includes(type)) {
          return;
        }
        if (type === 'checkbox') {
          if (el.checked !== Boolean(val)) {
            el.checked = Boolean(val);
            el.dispatchEvent(new Event('change', { bubbles: true }));
            restoredFieldsCount++;
          }
          return;
        }
        if (type === 'radio') {
          if (el.value === String(val) && !el.checked) {
            el.checked = true;
            el.dispatchEvent(new Event('change', { bubbles: true }));
            restoredFieldsCount++;
          }
          return;
        }
        if (el.value !== String(val)) {
          el.value = String(val);
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
          restoredFieldsCount++;
        }
        return;
      }

      if (el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) {
        if (el.value !== String(val)) {
          el.value = String(val);
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
          restoredFieldsCount++;
        }
      }
    });

    if (restoredFieldsCount > 0) {
      setRestoredCount(restoredFieldsCount);
      setLastSavedTime(stored.savedAt);
      lastSavedSnapshotRef.current = JSON.stringify(stored.data);
      setBannerVisible(true);
    }
  }, [isToolRoute, storageToolKey]);

  // Handle route change: restore on mount and on route change
  useEffect(() => {
    if (!isToolRoute) {
      setBannerVisible(false);
      setRestoredCount(0);
      setLastSavedTime(null);
      lastSavedSnapshotRef.current = '';
      return;
    }

    // Delay slightly to give React components time to mount their DOM elements
    const timer = setTimeout(() => {
      restoreDomInputs();
    }, 120);

    return () => clearTimeout(timer);
  }, [pathname, isToolRoute, restoreDomInputs]);

  // Event-driven listener for input and change events within diagnostic tools (350ms debounce)
  useEffect(() => {
    if (!isToolRoute) return;

    const handleInputOrChange = (e: Event) => {
      const target = e.target as HTMLElement;
      if (!target || !['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) {
        return;
      }

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        persistCurrentDom(false);
      }, 350);
    };

    document.addEventListener('input', handleInputOrChange, { capture: true });
    document.addEventListener('change', handleInputOrChange, { capture: true });

    return () => {
      document.removeEventListener('input', handleInputOrChange, { capture: true });
      document.removeEventListener('change', handleInputOrChange, { capture: true });
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [isToolRoute, persistCurrentDom]);

  // Periodic Auto-Saving: Executes every 5 seconds (PERIODIC_AUTOSAVE_INTERVAL_MS)
  useEffect(() => {
    if (!isToolRoute) return;

    const intervalId = setInterval(() => {
      const currentData = serializeDomInputs();
      const currentJson = JSON.stringify(currentData);

      // If inputs exist and differ from the last saved snapshot, perform periodic background auto-save
      if (Object.keys(currentData).length > 0 && currentJson !== lastSavedSnapshotRef.current) {
        persistCurrentDom(true);
      }
    }, PERIODIC_AUTOSAVE_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [isToolRoute, serializeDomInputs, persistCurrentDom]);

  // Immediate save on offline, beforeunload, pagehide
  useEffect(() => {
    if (!isToolRoute) return;

    const handleFlush = () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      persistCurrentDom(false);
    };

    window.addEventListener('offline', handleFlush);
    window.addEventListener('beforeunload', handleFlush);
    window.addEventListener('pagehide', handleFlush);

    return () => {
      window.removeEventListener('offline', handleFlush);
      window.removeEventListener('beforeunload', handleFlush);
      window.removeEventListener('pagehide', handleFlush);
      handleFlush();
    };
  }, [isToolRoute, persistCurrentDom]);

  // Manual save trigger
  const handleSaveNow = () => {
    persistCurrentDom(false);
    setJustSavedNotification(true);
    setTimeout(() => setJustSavedNotification(false), 2000);
  };

  // Discard saved draft for current tool
  const handleDiscardDraft = () => {
    clearDiagnosticFormDraft(storageToolKey, DIAGNOSTIC_STORAGE_PREFIX);
    setBannerVisible(false);
    setRestoredCount(0);
    setLastSavedTime(null);
    lastSavedSnapshotRef.current = '';
    window.location.reload();
  };

  if (!isToolRoute) {
    return null;
  }

  const formattedTime = formatDiagnosticTimestamp(lastSavedTime);

  return (
    <>
      {/* 1. Dedicated Tool Header 'Last Saved' Timestamp Indicator Bar */}
      <div
        className="diagnostic-header-autosave-container"
        style={{
          maxWidth: '1160px',
          margin: '0 auto',
          padding: '12px 20px 0',
          width: '100%',
          boxSizing: 'border-box',
        }}
      >
        <ToolHeaderAutoSaveIndicator
          lastSavedTime={lastSavedTime}
          isOnline={isOnline}
          isPeriodicSaving={isPeriodicSaving}
          restoredCount={restoredCount}
          onSaveNow={handleSaveNow}
          onDiscardDraft={bannerVisible ? handleDiscardDraft : undefined}
        />
      </div>

      {/* 2. Floating Bottom Notification when Draft Restored or User Saves */}
      {(bannerVisible || justSavedNotification || !isOnline) && (
        <div
          data-testid="diagnostic-persistence-indicator"
          style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            zIndex: 9998,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            background: 'rgba(15, 23, 42, 0.94)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(56, 189, 248, 0.4)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.35)',
            color: '#f8fafc',
            borderRadius: '10px',
            padding: '8px 14px',
            fontSize: '0.8rem',
            maxWidth: '420px',
            animation: 'fadeInUp 0.2s ease-out',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {!isOnline ? (
              <WifiOff size={16} color="#f59e0b" style={{ flexShrink: 0 }} />
            ) : (
              <FileCheck size={16} color="#38bdf8" style={{ flexShrink: 0 }} />
            )}
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.82rem' }}>
                {!isOnline
                  ? 'Offline Protection Active'
                  : justSavedNotification
                  ? 'Saved to Local Storage'
                  : bannerVisible
                  ? 'Form Progress Restored'
                  : 'Auto-Saved to localStorage'}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                {bannerVisible && restoredCount > 0
                  ? `Recovered ${restoredCount} input${restoredCount > 1 ? 's' : ''}${formattedTime ? ` (${formattedTime})` : ''}`
                  : formattedTime
                  ? `Last saved at ${formattedTime} (5s auto-save active)`
                  : 'Inputs preserved across navigation & refreshes'}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: 'auto' }}>
            {bannerVisible && (
              <button
                type="button"
                onClick={handleDiscardDraft}
                title="Discard saved draft and reload default values"
                style={{
                  padding: '4px 8px',
                  fontSize: '0.7rem',
                  borderRadius: '6px',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  background: 'rgba(239, 68, 68, 0.15)',
                  color: '#fca5a5',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                Reset
              </button>
            )}
            <button
              type="button"
              onClick={handleSaveNow}
              title="Save draft immediately"
              style={{
                padding: '4px 8px',
                fontSize: '0.7rem',
                borderRadius: '6px',
                border: '1px solid rgba(56, 189, 248, 0.4)',
                background: 'rgba(56, 189, 248, 0.15)',
                color: '#38bdf8',
                cursor: 'pointer',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              {justSavedNotification ? <Check size={12} /> : <Save size={12} />}
              {justSavedNotification ? 'Saved' : 'Save'}
            </button>
            <button
              type="button"
              onClick={() => setBannerVisible(false)}
              title="Dismiss notification"
              style={{
                background: 'transparent',
                border: 'none',
                color: '#64748b',
                cursor: 'pointer',
                padding: '2px',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export { useToolInteractionLogger } from '../hooks/useToolInteractionLogger';

