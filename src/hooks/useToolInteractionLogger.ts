import { useCallback } from 'react';
import { logToolInteraction, getCookieConsent } from '../services/analyticsService';

export interface ToolInteractionOptions {
  toolId: string;
}

export function useToolInteractionLogger({ toolId }: ToolInteractionOptions) {
  const isAnalyticsAllowed = (): boolean => {
    try {
      const globalAllowed = localStorage.getItem('app_analytics_allowed_v1');
      if (globalAllowed !== null) {
        return globalAllowed === 'true';
      }
    } catch {
      // fallback
    }
    return getCookieConsent() === 'accepted';
  };

  const logInteraction = useCallback((action: 'calculation_submitted' | 'result_copied' | 'pdf_exported' | string, metadata?: Record<string, any>) => {
    if (!isAnalyticsAllowed()) {
      return; // Respect analyticsAllowed / cookie consent preference
    }

    logToolInteraction(toolId, action, {
      ...metadata,
      loggedAt: Date.now(),
    });
  }, [toolId]);

  return {
    logCalculationSubmitted: (metadata?: Record<string, any>) => logInteraction('calculation_submitted', metadata),
    logResultCopied: (metadata?: Record<string, any>) => logInteraction('result_copied', metadata),
    logPdfExported: (metadata?: Record<string, any>) => logInteraction('pdf_exported', metadata),
    logCustomInteraction: (action: string, metadata?: Record<string, any>) => logInteraction(action, metadata),
    analyticsAllowed: isAnalyticsAllowed(),
  };
}
