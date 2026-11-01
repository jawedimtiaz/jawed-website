import { useEffect, useCallback } from 'react';
import { logToolInteraction, getCookieConsent } from '../services/analyticsService';

export function useToolAnalytics(toolId: string) {
  useEffect(() => {
    // Log tool mount / view
    logToolInteraction(toolId, 'view_tool', { path: window.location.pathname });
  }, [toolId]);

  const trackAction = useCallback((action: string, metadata?: Record<string, any>) => {
    logToolInteraction(toolId, action, metadata);
  }, [toolId]);

  return {
    trackAction,
    isConsentAccepted: getCookieConsent() === 'accepted',
  };
}
