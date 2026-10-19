/**
 * Client-side logging service for tracking contact form submission attempts.
 * Reports attempt outcomes (success/fail), reason codes, and validation metadata
 * to the server-side API, which persists them to a local JSON file.
 */

export interface ContactSubmissionLogEntry {
  status: 'success' | 'fail';
  reason:
    | 'SUBMISSION_SUCCESS'
    | 'VALIDATION_ERROR'
    | 'NETWORK_ERROR'
    | 'SERVER_ERROR'
    | 'EMAIL_CLIENT_OPENED'
    | string;
  name?: string;
  email?: string;
  topic?: string;
  messageLength?: number;
  error?: string;
  submissionMethod?: 'api' | 'email-client';
  timestamp?: string;
}

export interface ContactLogServiceResponse {
  success: boolean;
  logged: boolean;
  error?: string;
}

/**
 * Dispatches a contact form submission attempt log to the server-side API.
 * Uses keepalive where supported so that logs finish even if the user closes or navigates.
 * Fails gracefully and silently to ensure user submission is never blocked.
 */
export async function logContactAttempt(entry: ContactSubmissionLogEntry): Promise<boolean> {
  try {
    const payload = {
      ...entry,
      timestamp: entry.timestamp || new Date().toISOString(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      url: typeof window !== 'undefined' ? window.location.pathname : '/contact/'
    };

    const res = await fetch('/api/contact/log', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify(payload),
      keepalive: true
    });

    return res.ok;
  } catch (err) {
    // Non-blocking: Logging failure should never degrade user experience
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[ContactLogger] Log dispatch error:', err);
    }
    return false;
  }
}
