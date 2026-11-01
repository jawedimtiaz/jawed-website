export interface ToolAnalyticsEvent {
  toolId: string;
  action: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

export const COOKIE_CONSENT_STORAGE_KEY = 'jawed_cookie_consent_v1';
export const ANALYTICS_EVENTS_STORAGE_KEY = 'jawed_analytics_events_v1';

export type CookieConsentStatus = 'accepted' | 'declined' | 'pending';

export function getCookieConsent(): CookieConsentStatus {
  if (typeof window === 'undefined') return 'pending';
  try {
    const val = localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY);
    if (val === 'accepted' || val === 'declined') {
      return val;
    }
  } catch {
    // ignore
  }
  return 'pending';
}

export function setCookieConsent(status: CookieConsentStatus) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, status);
    window.dispatchEvent(new CustomEvent('cookie-consent-changed', { detail: status }));
  } catch {
    // ignore
  }
}

export function logToolInteraction(toolId: string, action: string, metadata?: Record<string, any>) {
  if (getCookieConsent() !== 'accepted') {
    // Respect user cookie consent preference: do not log if not explicitly accepted
    return;
  }

  try {
    const event: ToolAnalyticsEvent = {
      toolId,
      action,
      timestamp: Date.now(),
      metadata,
    };

    const existingRaw = localStorage.getItem(ANALYTICS_EVENTS_STORAGE_KEY);
    const events: ToolAnalyticsEvent[] = existingRaw ? JSON.parse(existingRaw) : [];
    events.unshift(event);
    if (events.length > 100) events.pop();
    localStorage.setItem(ANALYTICS_EVENTS_STORAGE_KEY, JSON.stringify(events));
  } catch {
    // ignore
  }
}

export function getStoredAnalyticsEvents(): ToolAnalyticsEvent[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(ANALYTICS_EVENTS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
