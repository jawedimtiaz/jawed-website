import rawConfig from '../../firebase-applet-config.json';

export interface FirebaseAppConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId: string;
  measurementId?: string;
  oAuthClientId?: string;
}

// Ensure Firebase config keys (apiKey, authDomain, projectId, appId) have non-empty fallbacks
// and are not resolving to undefined.
export const firebaseConfig: FirebaseAppConfig = {
  apiKey:
    (import.meta.env?.VITE_FIREBASE_API_KEY as string) ||
    rawConfig?.apiKey ||
    'AIzaSyC5s3Pqisu8QGKTsP97n5K6erHRVoTVXps',
  authDomain:
    (import.meta.env?.VITE_FIREBASE_AUTH_DOMAIN as string) ||
    rawConfig?.authDomain ||
    'gen-lang-client-0372868240.firebaseapp.com',
  projectId:
    (import.meta.env?.VITE_FIREBASE_PROJECT_ID as string) ||
    rawConfig?.projectId ||
    'gen-lang-client-0372868240',
  storageBucket:
    (import.meta.env?.VITE_FIREBASE_STORAGE_BUCKET as string) ||
    rawConfig?.storageBucket ||
    'gen-lang-client-0372868240.firebasestorage.app',
  messagingSenderId:
    (import.meta.env?.VITE_FIREBASE_MESSAGING_SENDER_ID as string) ||
    rawConfig?.messagingSenderId ||
    '356691586298',
  appId:
    (import.meta.env?.VITE_FIREBASE_APP_ID as string) ||
    rawConfig?.appId ||
    '1:356691586298:web:87d799690872c8d627ad43',
  oAuthClientId:
    (import.meta.env?.VITE_FIREBASE_OAUTH_CLIENT_ID as string) ||
    rawConfig?.oAuthClientId ||
    '356691586298-iorjt2os2utv36jnasq8givp5cqsflup.apps.googleusercontent.com',
};

// Defensive sanity logging
if (!firebaseConfig.apiKey) {
  console.error('Firebase API Key is missing. Check your Vite environment variables.');
}

/**
 * Categorizes Firebase Authentication error codes into helpful, user-friendly explanations
 * instead of cryptic raw error labels like `auth/network-request-failed`.
 */
export function categorizeGoogleAuthError(err: any): string {
  if (!err) return 'Failed to authenticate with Google.';
  const code = err.code || err.message || '';
  if (
    code === 'auth/network-request-failed' ||
    String(code).includes('network-request-failed') ||
    String(code).includes('Failed to fetch')
  ) {
    return 'Network connection failed. This usually occurs if an ad-blocker / strict tracking prevention is blocking Google Identity endpoints, or if you are offline. Please disable ad-blockers for this domain and try again.';
  } else if (code === 'auth/popup-blocked' || String(code).includes('popup-blocked')) {
    return 'Popup was blocked by your browser. Please allow popups for jawed.co.in to sign in.';
  } else if (
    code === 'auth/popup-closed-by-user' ||
    String(code).includes('popup-closed-by-user')
  ) {
    return 'Sign-in popup was closed before completion.';
  } else if (code === 'auth/cancelled-popup-request') {
    return 'Another sign-in request is already in progress.';
  } else if (code === 'auth/unauthorized-domain') {
    return 'This domain is not authorized for OAuth in the Firebase Console. Please add jawed.co.in to Authorized Domains.';
  }
  return err.message || 'Failed to authenticate with Google.';
}

export default firebaseConfig;
