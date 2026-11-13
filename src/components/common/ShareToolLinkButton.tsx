import React, { useState, useRef, useEffect } from 'react';
import { Share2, Check } from 'lucide-react';

export const SHARE_TOAST_MESSAGE = 'Link copied!';

const DEFAULT_ORIGIN = 'https://jawed.co.in';

function getStorageInstance(
  explicitStorage?: Pick<Storage, 'getItem'> | null
): Pick<Storage, 'getItem'> | null {
  if (explicitStorage !== undefined) {
    return explicitStorage;
  }
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
    if (typeof localStorage !== 'undefined') {
      return localStorage;
    }
  } catch {}
  return null;
}

/**
 * Extracts a clean tool slug from a full URL, route path, or tool ID.
 * E.g. 'https://jawed.co.in/tools/ipv4-subnet-calculator?ip=10.0.0.1' -> 'ipv4-subnet-calculator'
 */
export function normalizeToolSlug(routeOrUrl?: string): string {
  if (!routeOrUrl || !routeOrUrl.trim()) return '';
  let pathPart = routeOrUrl.trim();
  try {
    if (pathPart.startsWith('http://') || pathPart.startsWith('https://')) {
      const parsed = new URL(pathPart);
      pathPart = parsed.pathname;
    } else {
      pathPart = pathPart.split('?')[0].split('#')[0];
    }
  } catch {
    pathPart = pathPart.split('?')[0].split('#')[0];
  }

  return pathPart
    .replace(/^\/+|\/+$/g, '')
    .replace(/^tools\//, '')
    .replace(/^diagnostic-tools\/?/, '');
}

/**
 * Reads saved configuration state for a given tool route or ID from localStorage
 * across diagnostic auto-persist and tool draft storage keys.
 */
export function getSavedToolConfigurationState(
  routeOrId?: string,
  storage?: Pick<Storage, 'getItem'> | null
): Record<string, string | number | boolean> {
  const targetStorage = getStorageInstance(storage);
  if (!targetStorage || typeof targetStorage.getItem !== 'function') {
    return {};
  }

  const slug = normalizeToolSlug(routeOrId);
  if (!slug) return {};

  const sanitizedSlug = slug.replace(/[^a-zA-Z0-9_-]/g, '_');
  const candidateKeys = [
    `diagnostic_tool_draft_diag_auto_${slug}`,
    `diagnostic_tool_draft_diag_auto_${sanitizedSlug}`,
    `diagnostic_tool_draft_${sanitizedSlug}`,
    `diagnostic_tool_draft_${slug}`,
    `diagnostic_tool_draft_dom_${sanitizedSlug}`,
  ];

  const mergedState: Record<string, string | number | boolean> = {};

  for (const key of candidateKeys) {
    try {
      const raw = targetStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      const payload =
        parsed && typeof parsed === 'object' && 'data' in parsed && parsed.data && typeof parsed.data === 'object'
          ? (parsed.data as Record<string, unknown>)
          : parsed && typeof parsed === 'object'
          ? (parsed as Record<string, unknown>)
          : null;

      if (!payload) continue;

      for (const [k, v] of Object.entries(payload)) {
        if (!k || k === 'savedAt' || k === 'version' || k === 'toolId') continue;
        if (typeof v === 'boolean' || typeof v === 'number') {
          if (typeof v === 'number' && !Number.isFinite(v)) continue;
          mergedState[k] = v;
        } else if (typeof v === 'string') {
          const trimmed = v.trim();
          if (trimmed.length > 0 && trimmed.length <= 500) {
            mergedState[k] = trimmed;
          }
        }
      }
    } catch {
      // Ignore malformed storage entries
    }
  }

  return mergedState;
}

/**
 * Parses URL search query string into a key-value map for restoring deep-linked tool state.
 */
export function parseToolConfigurationFromSearch(search: string): Record<string, string> {
  if (!search || !search.trim()) return {};
  const result: Record<string, string> = {};
  try {
    const params = new URLSearchParams(search.startsWith('?') ? search : `?${search}`);
    params.forEach((value, key) => {
      if (key && value !== '') {
        result[key] = value;
      }
    });
  } catch {}
  return result;
}

/**
 * Resolves the current tool's specific shareable URL, optionally appending saved or explicit
 * tool configuration state as query parameters for deep linking.
 */
export function resolveToolShareUrl(
  explicitUrl?: string,
  pathname?: string,
  configState?: Record<string, unknown> | null,
  storage?: Pick<Storage, 'getItem'> | null
): string {
  let baseUrl = '';

  if (explicitUrl && explicitUrl.trim()) {
    const trimmed = explicitUrl.trim();
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      baseUrl = trimmed;
    } else {
      const origin =
        typeof window !== 'undefined' && window.location?.origin
          ? window.location.origin
          : DEFAULT_ORIGIN;
      const cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
      baseUrl = `${origin}${cleanPath}`;
    }
  } else if (typeof window !== 'undefined' && window.location?.href) {
    baseUrl = window.location.href;
  } else {
    const cleanPath = pathname
      ? pathname.startsWith('/')
        ? pathname
        : `/${pathname}`
      : '/tools';
    baseUrl = `${DEFAULT_ORIGIN}${cleanPath}`;
  }

  // Merge saved configuration state from localStorage + any explicit configState
  const savedConfig = getSavedToolConfigurationState(explicitUrl || pathname || baseUrl, storage);
  const combinedConfig: Record<string, unknown> = {
    ...savedConfig,
    ...(configState || {}),
  };

  const entries = Object.entries(combinedConfig).filter(([, val]) => {
    if (val === undefined || val === null) return false;
    if (typeof val === 'string') return val.trim().length > 0 && val.trim().length <= 500;
    if (typeof val === 'number') return Number.isFinite(val);
    if (typeof val === 'boolean') return true;
    return false;
  });

  if (entries.length === 0) {
    return baseUrl;
  }

  try {
    const urlObj = new URL(baseUrl, DEFAULT_ORIGIN);
    for (const [key, val] of entries) {
      urlObj.searchParams.set(key, String(val));
    }
    return urlObj.toString();
  } catch {
    return baseUrl;
  }
}

/**
 * Builds a shareable deep link URL for a tool card or tool page, encoding current configuration state.
 */
export function buildToolConfigurationDeepLink(
  baseUrlOrRoute?: string,
  configState?: Record<string, unknown> | null,
  storage?: Pick<Storage, 'getItem'> | null
): string {
  const isRoutePath =
    typeof baseUrlOrRoute === 'string' &&
    baseUrlOrRoute.trim().length > 0 &&
    !baseUrlOrRoute.trim().startsWith('http');

  return resolveToolShareUrl(
    isRoutePath ? undefined : baseUrlOrRoute,
    isRoutePath ? baseUrlOrRoute : undefined,
    configState,
    storage
  );
}

/**
 * Copies the current tool's specific URL (including deep-link configuration state) to the clipboard
 * and returns the copied URL along with the 'Link copied!' toast message.
 */
export async function copyToolShareUrlToClipboard(
  explicitUrl?: string,
  pathname?: string,
  configState?: Record<string, unknown> | null,
  storage?: Pick<Storage, 'getItem'> | null
): Promise<{ ok: boolean; url: string; toastMessage: string }> {
  const targetUrl = resolveToolShareUrl(explicitUrl, pathname, configState, storage);

  try {
    if (
      typeof navigator !== 'undefined' &&
      navigator.clipboard &&
      typeof navigator.clipboard.writeText === 'function'
    ) {
      await navigator.clipboard.writeText(targetUrl);
      return { ok: true, url: targetUrl, toastMessage: SHARE_TOAST_MESSAGE };
    }

    if (typeof document !== 'undefined') {
      const textArea = document.createElement('textarea');
      textArea.value = targetUrl;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const copied = typeof document.execCommand === 'function' ? document.execCommand('copy') : true;
      document.body.removeChild(textArea);
      return { ok: Boolean(copied), url: targetUrl, toastMessage: SHARE_TOAST_MESSAGE };
    }

    return { ok: true, url: targetUrl, toastMessage: SHARE_TOAST_MESSAGE };
  } catch {
    return { ok: false, url: targetUrl, toastMessage: SHARE_TOAST_MESSAGE };
  }
}

export interface ShareToolLinkButtonProps {
  url?: string;
  toolRoute?: string;
  toolId?: string;
  configState?: Record<string, unknown> | null;
  label?: string;
  size?: 'sm' | 'md';
  className?: string;
  style?: React.CSSProperties;
  title?: string;
  onCopied?: (copiedUrl: string) => void;
}

export const ShareToolLinkButton: React.FC<ShareToolLinkButtonProps> = ({
  url,
  toolRoute,
  toolId,
  configState,
  label = 'Share',
  size = 'md',
  className = '',
  style,
  title = "Copy a deep link to this tool's current configuration state",
  onCopied,
}) => {
  const [toastVisible, setToastVisible] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState('');
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const targetRouteOrUrl = url || toolRoute || (toolId ? `/tools/${toolId.replace(/^\/+|\/+$/g, '').replace(/^tools\//, '')}` : undefined);

  const handleShareClick = async () => {
    const result = await copyToolShareUrlToClipboard(
      url,
      toolRoute || (toolId ? `/tools/${toolId.replace(/^\/+|\/+$/g, '').replace(/^tools\//, '')}` : undefined),
      configState
    );
    setCopiedUrl(result.url);
    setToastVisible(true);
    onCopied?.(result.url);

    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = window.setTimeout(() => {
      setToastVisible(false);
    }, 2400);
  };

  const padding = size === 'sm' ? '4px 10px' : '6px 12px';
  const fontSize = size === 'sm' ? '0.78rem' : '0.825rem';
  const iconSize = size === 'sm' ? 13 : 14;

  return (
    <div
      className="share-tool-link-wrapper no-print"
      style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}
    >
      <button
        type="button"
        onClick={handleShareClick}
        data-testid="share-tool-link-btn"
        data-tool-route={toolRoute || targetRouteOrUrl || ''}
        aria-label={`${label} — Copy tool deep link to clipboard`}
        title={title}
        className={`button button-secondary share-tool-link-btn no-print ${className}`.trim()}
        style={{
          padding,
          fontSize,
          display: 'inline-flex',
          alignItems: 'center',
          gap: '5px',
          whiteSpace: 'nowrap',
          cursor: 'pointer',
          borderColor: toastVisible ? 'rgba(52, 211, 153, 0.55)' : undefined,
          color: toastVisible ? '#34d399' : undefined,
          ...style,
        }}
      >
        {toastVisible ? (
          <Check width={iconSize} height={iconSize} className="text-emerald-400" aria-hidden="true" />
        ) : (
          <Share2 width={iconSize} height={iconSize} className="text-sky-400" aria-hidden="true" />
        )}
        <span>{label}</span>
      </button>

      {toastVisible && (
        <div
          role="status"
          aria-live="polite"
          data-testid="share-link-copied-toast"
          className="toast share-link-copied-toast no-print"
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 9999,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 16px',
            borderRadius: '10px',
            background: '#0f172a',
            border: '1px solid rgba(52, 211, 153, 0.5)',
            color: '#f8fafc',
            fontSize: '0.82rem',
            fontWeight: 600,
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.35)',
          }}
        >
          <Check width={15} height={15} className="text-emerald-400" aria-hidden="true" />
          <span>{SHARE_TOAST_MESSAGE}</span>
          {copiedUrl && (
            <span
              style={{
                fontSize: '0.72rem',
                color: '#94a3b8',
                fontFamily: 'monospace',
                maxWidth: '240px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {copiedUrl}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default ShareToolLinkButton;

