import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import {
  getAuth,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  onAuthStateChanged,
  type Auth,
  type User,
} from 'firebase/auth';
import { firebaseConfig, categorizeGoogleAuthError } from '../../lib/firebase';
import {
  exportDatabaseBackup,
  restoreDatabaseBackup,
  type MoneyManagerBackupPayload,
} from '../../db/db';

export const DRIVE_APPDATA_SCOPE = 'https://www.googleapis.com/auth/drive.appdata';
export const DRIVE_FILE_SCOPE = 'https://www.googleapis.com/auth/drive.file';
export const SCOPES = [
  DRIVE_APPDATA_SCOPE,
  DRIVE_FILE_SCOPE,
] as const;

export const DRIVE_BACKUP_FILE_PREFIX = 'jawed-money-manager-cloud-sync';
export const DRIVE_BACKUP_MIME_TYPE = 'application/json';
export const ENCRYPTED_LEDGER_FORMAT = 'jawed-money-manager-encrypted-ledger';
export const PBKDF2_ITERATIONS = 120000;

let firebaseAppInstance: FirebaseApp | null = null;
let firebaseAuthInstance: Auth | null = null;
let googleProviderInstance: GoogleAuthProvider | null = null;

// Flag to indicate if we are in the middle of a sign-in flow.
let isSigningIn = false;
// Cache the OAuth access token strictly in memory (never in localStorage/sessionStorage).
let cachedAccessToken: string | null = null;

function ensureFirebaseAuth(): { auth: Auth; provider: GoogleAuthProvider } {
  if (!firebaseAppInstance) {
    firebaseAppInstance = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  }
  if (!firebaseAuthInstance) {
    firebaseAuthInstance = getAuth(firebaseAppInstance);
  }
  if (!googleProviderInstance) {
    googleProviderInstance = new GoogleAuthProvider();
    googleProviderInstance.addScope('https://www.googleapis.com/auth/drive.appdata');
    for (const scope of SCOPES) {
      googleProviderInstance.addScope(scope);
    }
  }
  return { auth: firebaseAuthInstance, provider: googleProviderInstance };
}

/**
 * Safely returns the initialized Firebase Auth instance in browser environments,
 * or null in non-browser test environments where Auth DOM APIs are unavailable.
 */
export function getMoneyManagerAuth(): Auth | null {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    return ensureFirebaseAuth().auth;
  } catch {
    return null;
  }
}

/**
 * Creates a configured GoogleAuthProvider with the Google Drive appdata scope.
 */
export function createGoogleDriveAuthProvider(): GoogleAuthProvider {
  const provider = new GoogleAuthProvider();
  provider.addScope('https://www.googleapis.com/auth/drive.appdata');
  for (const scope of SCOPES) {
    provider.addScope(scope);
  }
  return provider;
}

/**
 * Updates the in-memory cached Google OAuth access token after a redirect sign-in completes.
 */
export function setCachedGoogleAccessToken(token: string | null): void {
  cachedAccessToken = token;
}

/**
 * Checks for and resolves any pending Google Sign-In redirect result on component mount.
 */
export const checkGoogleRedirectResult = async (
  customAuth?: Auth | null
): Promise<{
  user: User;
  accessToken: string | null;
} | null> => {
  if (typeof window === 'undefined') return null;
  const targetAuth = customAuth ?? getMoneyManagerAuth();
  if (!targetAuth) return null;

  const result = await getRedirectResult(targetAuth);
  if (result?.user) {
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (credential?.accessToken) {
      cachedAccessToken = credential.accessToken;
    }
    return {
      user: result.user,
      accessToken: cachedAccessToken,
    };
  }
  return null;
};

/**
 * Initializes the Firebase Auth state listener and resolves any pending redirect result.
 */
export const initGoogleDriveAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: (errorMessage?: string) => void
): (() => void) => {
  if (typeof window === 'undefined') {
    onAuthFailure?.();
    return () => {};
  }
  try {
    const { auth } = ensureFirebaseAuth();

    void getRedirectResult(auth)
      .then((result) => {
        if (result?.user) {
          const credential = GoogleAuthProvider.credentialFromResult(result);
          if (credential?.accessToken) {
            cachedAccessToken = credential.accessToken;
          }
          onAuthSuccess?.(result.user, cachedAccessToken || '');
        }
      })
      .catch((error: any) => {
        console.error('Redirect auth error:', error);
        onAuthFailure?.(categorizeGoogleAuthError(error));
      });

    return onAuthStateChanged(auth, async (user: User | null) => {
      if (user) {
        onAuthSuccess?.(user, cachedAccessToken || '');
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        onAuthFailure?.();
      }
    });
  } catch (error: any) {
    onAuthFailure?.(categorizeGoogleAuthError(error));
    return () => {};
  }
};

/**
 * Initiates a Google OAuth redirect sign-in requesting the Google Drive (`drive.appdata`) scope.
 * Uses `signInWithRedirect` so Private/Incognito browsers do not fail with
 * `Firebase: Error (auth/internal-error)` when cross-origin third-party cookies are blocked.
 */
export const googleDriveSignIn = async (
  customAuth?: Auth | null
): Promise<{
  user: User;
  accessToken: string;
} | null> => {
  try {
    isSigningIn = true;
    const targetAuth = customAuth ?? ensureFirebaseAuth().auth;
    const provider = new GoogleAuthProvider();
    provider.addScope('https://www.googleapis.com/auth/drive.appdata');
    for (const scope of SCOPES) {
      provider.addScope(scope);
    }
    await signInWithRedirect(targetAuth, provider);
    return null;
  } catch (error) {
    console.error('Google Drive sign-in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

/**
 * Returns the in-memory cached Google OAuth access token.
 */
export const getGoogleDriveAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

/**
 * Signs out of Firebase Auth and clears the in-memory Google Drive access token.
 */
export const googleDriveLogout = async (): Promise<void> => {
  try {
    const { auth } = ensureFirebaseAuth();
    await auth.signOut();
  } finally {
    cachedAccessToken = null;
  }
};

/**
 * Test helper to inject or clear an in-memory access token during automated unit tests.
 */
export const setMockAccessTokenForTest = (token: string | null): void => {
  cachedAccessToken = token;
};

export interface EncryptedDriveLedgerEnvelope {
  format: typeof ENCRYPTED_LEDGER_FORMAT;
  version: 1;
  cipher: 'AES-256-GCM';
  kdf: 'PBKDF2-SHA256';
  iterations: number;
  saltBase64: string;
  ivBase64: string;
  ciphertextBase64: string;
  encryptedAt: string;
  metadata: {
    transactionCount: number;
    accountCount: number;
    categoryCount: number;
    sinkingFundCount: number;
  };
}

export interface DriveBackupFileMetadata {
  id: string;
  name: string;
  modifiedTime: string;
  size?: string;
  appProperties?: {
    app?: string;
    encrypted?: string;
    transactionCount?: string;
    accountCount?: string;
  };
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return globalThis.btoa(binary);
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = globalThis.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function deriveAesGcmKey(
  passphrase: string,
  salt: Uint8Array,
  iterations: number = PBKDF2_ITERATIONS
): Promise<CryptoKey> {
  const normalizedPassphrase = passphrase.trim();
  if (normalizedPassphrase.length < 4) {
    throw new Error('Encryption passphrase must be at least 4 characters long.');
  }

  const subtle = globalThis.crypto?.subtle;
  if (!subtle) {
    throw new Error('Web Crypto API (crypto.subtle) is required for AES-256-GCM encryption.');
  }

  const encoder = new TextEncoder();
  const keyMaterial = await subtle.importKey(
    'raw',
    encoder.encode(normalizedPassphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as BufferSource,
      iterations,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts a MoneyManagerBackupPayload in the browser using AES-256-GCM and PBKDF2-SHA256.
 */
export async function encryptLedgerPayload(
  payload: MoneyManagerBackupPayload,
  passphrase: string
): Promise<EncryptedDriveLedgerEnvelope> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) {
    throw new Error('Web Crypto API is unavailable in this environment.');
  }

  const salt = new Uint8Array(16);
  const iv = new Uint8Array(12);
  globalThis.crypto.getRandomValues(salt);
  globalThis.crypto.getRandomValues(iv);

  const key = await deriveAesGcmKey(passphrase, salt, PBKDF2_ITERATIONS);
  const encoder = new TextEncoder();
  const plaintextBytes = encoder.encode(JSON.stringify(payload));

  const ciphertextBuffer = await subtle.encrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    key,
    plaintextBufferSource(plaintextBytes)
  );

  return {
    format: ENCRYPTED_LEDGER_FORMAT,
    version: 1,
    cipher: 'AES-256-GCM',
    kdf: 'PBKDF2-SHA256',
    iterations: PBKDF2_ITERATIONS,
    saltBase64: uint8ArrayToBase64(salt),
    ivBase64: uint8ArrayToBase64(iv),
    ciphertextBase64: uint8ArrayToBase64(new Uint8Array(ciphertextBuffer)),
    encryptedAt: new Date().toISOString(),
    metadata: {
      transactionCount: Array.isArray(payload.transactions) ? payload.transactions.length : 0,
      accountCount: Array.isArray(payload.accounts) ? payload.accounts.length : 0,
      categoryCount: Array.isArray(payload.categories) ? payload.categories.length : 0,
      sinkingFundCount: Array.isArray(payload.sinkingFunds) ? payload.sinkingFunds.length : 0,
    },
  };
}

function plaintextBufferSource(bytes: Uint8Array): BufferSource {
  return bytes as BufferSource;
}

/**
 * Type guard verifying whether a parsed JSON object is an EncryptedDriveLedgerEnvelope.
 */
export function isEncryptedDriveLedgerEnvelope(
  value: unknown
): value is EncryptedDriveLedgerEnvelope {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return (
    candidate.format === ENCRYPTED_LEDGER_FORMAT &&
    candidate.cipher === 'AES-256-GCM' &&
    typeof candidate.saltBase64 === 'string' &&
    typeof candidate.ivBase64 === 'string' &&
    typeof candidate.ciphertextBase64 === 'string'
  );
}

/**
 * Decrypts an EncryptedDriveLedgerEnvelope back into a MoneyManagerBackupPayload using the user's passphrase.
 */
export async function decryptLedgerPayload(
  envelopeOrJson: EncryptedDriveLedgerEnvelope | string,
  passphrase: string
): Promise<MoneyManagerBackupPayload> {
  const envelope: unknown =
    typeof envelopeOrJson === 'string' ? JSON.parse(envelopeOrJson) : envelopeOrJson;

  if (!isEncryptedDriveLedgerEnvelope(envelope)) {
    throw new Error('Invalid encrypted ledger format. Expected an AES-256-GCM Money Manager backup.');
  }

  const subtle = globalThis.crypto?.subtle;
  if (!subtle) {
    throw new Error('Web Crypto API is unavailable in this environment.');
  }

  const salt = base64ToUint8Array(envelope.saltBase64);
  const iv = base64ToUint8Array(envelope.ivBase64);
  const ciphertext = base64ToUint8Array(envelope.ciphertextBase64);
  const iterations =
    typeof envelope.iterations === 'number' && envelope.iterations >= 1000
      ? envelope.iterations
      : PBKDF2_ITERATIONS;

  const key = await deriveAesGcmKey(passphrase, salt, iterations);

  try {
    const decryptedBuffer = await subtle.decrypt(
      { name: 'AES-GCM', iv: iv as BufferSource },
      key,
      ciphertext as BufferSource
    );
    const decoder = new TextDecoder();
    const jsonText = decoder.decode(decryptedBuffer);
    const parsed = JSON.parse(jsonText) as MoneyManagerBackupPayload;
    if (!parsed || !Array.isArray(parsed.transactions) || !Array.isArray(parsed.accounts)) {
      throw new Error('Decrypted payload is missing required ledger stores.');
    }
    return parsed;
  } catch (err) {
    if (err instanceof Error && err.message.includes('missing required ledger')) {
      throw err;
    }
    throw new Error(
      'Decryption failed. Please verify that your encryption passphrase is correct.'
    );
  }
}

export interface DriveApiRequestOptions {
  accessToken?: string;
  fetchImpl?: typeof fetch;
}

async function resolveToken(explicitToken?: string): Promise<string> {
  const token = explicitToken || (await getGoogleDriveAccessToken());
  if (!token) {
    throw new Error('Authentication required. Please sign in with Google to sync with Google Drive.');
  }
  return token;
}

/**
 * Lists encrypted Money Manager backup files stored in the user's Google Drive.
 */
export async function listDriveLedgerBackups(
  options: DriveApiRequestOptions = {}
): Promise<DriveBackupFileMetadata[]> {
  const token = await resolveToken(options.accessToken);
  const fetchFn = options.fetchImpl || globalThis.fetch;

  const query = encodeURIComponent(
    `name contains '${DRIVE_BACKUP_FILE_PREFIX}' and trashed = false`
  );
  const fields = encodeURIComponent(
    'files(id,name,modifiedTime,size,appProperties)'
  );
  const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=${fields}&orderBy=modifiedTime%20desc&pageSize=20`;

  const response = await fetchFn(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(
      `Failed to list Google Drive backups (HTTP ${response.status}): ${errText || response.statusText}`
    );
  }

  const data = (await response.json()) as { files?: DriveBackupFileMetadata[] };
  return Array.isArray(data.files) ? data.files : [];
}

export interface UploadEncryptedLedgerOptions extends DriveApiRequestOptions {
  existingFileId?: string;
  customFileName?: string;
}

/**
 * Encrypts the ledger payload with AES-256-GCM and uploads it to Google Drive via multipart upload.
 */
export async function uploadEncryptedLedgerToDrive(
  payload: MoneyManagerBackupPayload,
  passphrase: string,
  options: UploadEncryptedLedgerOptions = {}
): Promise<DriveBackupFileMetadata> {
  const token = await resolveToken(options.accessToken);
  const fetchFn = options.fetchImpl || globalThis.fetch;

  const envelope = await encryptLedgerPayload(payload, passphrase);
  const dateStamp = envelope.encryptedAt.slice(0, 10);
  const fileName =
    options.customFileName || `${DRIVE_BACKUP_FILE_PREFIX}-${dateStamp}.enc.json`;

  const metadata = {
    name: fileName,
    mimeType: DRIVE_BACKUP_MIME_TYPE,
    description: 'Encrypted Jawed Money Manager Ledger Backup (AES-256-GCM)',
    appProperties: {
      app: 'jawed-money-manager',
      encrypted: 'AES-256-GCM',
      transactionCount: String(envelope.metadata.transactionCount),
      accountCount: String(envelope.metadata.accountCount),
    },
  };

  const boundary = '-------JawedMoneyManagerDriveSyncBoundary314159';
  const multipartBody = [
    `--${boundary}`,
    'Content-Type: application/json; charset=UTF-8',
    '',
    JSON.stringify(metadata),
    `--${boundary}`,
    `Content-Type: ${DRIVE_BACKUP_MIME_TYPE}`,
    '',
    JSON.stringify(envelope, null, 2),
    `--${boundary}--`,
  ].join('\r\n');

  const isUpdate = Boolean(options.existingFileId);
  const uploadUrl = isUpdate
    ? `https://www.googleapis.com/upload/drive/v3/files/${encodeURIComponent(
        options.existingFileId!
      )}?uploadType=multipart&fields=id,name,modifiedTime,size,appProperties`
    : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,modifiedTime,size,appProperties';

  const response = await fetchFn(uploadUrl, {
    method: isUpdate ? 'PATCH' : 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body: multipartBody,
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(
      `Failed to upload encrypted ledger to Google Drive (HTTP ${response.status}): ${
        errText || response.statusText
      }`
    );
  }

  return (await response.json()) as DriveBackupFileMetadata;
}

/**
 * Downloads an encrypted backup file from Google Drive and decrypts it using the provided passphrase.
 */
export async function downloadAndDecryptLedgerFromDrive(
  fileId: string,
  passphrase: string,
  options: DriveApiRequestOptions = {}
): Promise<MoneyManagerBackupPayload> {
  if (!fileId) {
    throw new Error('A valid Google Drive file ID is required to import a cloud backup.');
  }
  const token = await resolveToken(options.accessToken);
  const fetchFn = options.fetchImpl || globalThis.fetch;

  const downloadUrl = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(
    fileId
  )}?alt=media`;

  const response = await fetchFn(downloadUrl, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(
      `Failed to download encrypted backup from Google Drive (HTTP ${response.status}): ${
        errText || response.statusText
      }`
    );
  }

  const encryptedText = await response.text();
  return decryptLedgerPayload(encryptedText, passphrase);
}

/**
 * Deletes an encrypted backup file from Google Drive.
 */
export async function deleteDriveLedgerBackup(
  fileId: string,
  options: DriveApiRequestOptions = {}
): Promise<void> {
  if (!fileId) {
    throw new Error('A valid Google Drive file ID is required to delete a cloud backup.');
  }
  const token = await resolveToken(options.accessToken);
  const fetchFn = options.fetchImpl || globalThis.fetch;

  const deleteUrl = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}`;
  const response = await fetchFn(deleteUrl, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(
      `Failed to delete backup from Google Drive (HTTP ${response.status}): ${
        errText || response.statusText
      }`
    );
  }
}

/**
 * High-level helper that exports the current local IndexedDB ledger, encrypts it with AES-256-GCM,
 * and uploads it to Google Drive.
 */
export async function exportDatabaseToEncryptedDrive(
  passphrase: string,
  options: UploadEncryptedLedgerOptions = {}
): Promise<{
  file: DriveBackupFileMetadata;
  transactionCount: number;
  accountCount: number;
}> {
  const backupPayload = await exportDatabaseBackup();
  const file = await uploadEncryptedLedgerToDrive(backupPayload, passphrase, options);
  return {
    file,
    transactionCount: backupPayload.transactions.length,
    accountCount: backupPayload.accounts.length,
  };
}

/**
 * High-level helper that downloads an encrypted backup from Google Drive, decrypts it with AES-256-GCM,
 * and restores it into the local IndexedDB ledger (`merge` or `replace` mode).
 */
export async function importDatabaseFromEncryptedDrive(
  fileId: string,
  passphrase: string,
  mode: 'merge' | 'replace' = 'merge',
  options: DriveApiRequestOptions = {}
) {
  const decryptedPayload = await downloadAndDecryptLedgerFromDrive(
    fileId,
    passphrase,
    options
  );
  const restored = await restoreDatabaseBackup(decryptedPayload, mode);
  return {
    decryptedPayload,
    restored,
  };
}

/**
 * Bidirectional cross-device synchronization helper:
 * - If an encrypted backup exists on Google Drive (either `options.existingFileId` or the most recent backup file),
 *   downloads and decrypts it, merges its records with the local IndexedDB ledger, and uploads the unified
 *   AES-256-GCM encrypted ledger back to Google Drive.
 * - If no cloud backup exists yet, encrypts and uploads the local ledger as a new Google Drive backup file.
 */
export async function syncLedgerWithEncryptedDrive(
  passphrase: string,
  options: UploadEncryptedLedgerOptions = {}
): Promise<{
  file: DriveBackupFileMetadata;
  transactionCount: number;
  accountCount: number;
  syncAction: 'created' | 'merged-and-updated';
}> {
  let targetFileId = options.existingFileId;
  let targetFileName = options.customFileName;

  if (!targetFileId) {
    const existingFiles = await listDriveLedgerBackups(options);
    if (existingFiles.length > 0) {
      targetFileId = existingFiles[0].id;
      targetFileName = targetFileName || existingFiles[0].name;
    }
  }

  if (targetFileId) {
    const remotePayload = await downloadAndDecryptLedgerFromDrive(
      targetFileId,
      passphrase,
      options
    );
    await restoreDatabaseBackup(remotePayload, 'merge');
    const unifiedPayload = await exportDatabaseBackup();
    const updatedFile = await uploadEncryptedLedgerToDrive(
      unifiedPayload,
      passphrase,
      {
        ...options,
        existingFileId: targetFileId,
        customFileName: targetFileName,
      }
    );
    return {
      file: updatedFile,
      transactionCount: unifiedPayload.transactions.length,
      accountCount: unifiedPayload.accounts.length,
      syncAction: 'merged-and-updated',
    };
  }

  const created = await exportDatabaseToEncryptedDrive(passphrase, options);
  return {
    ...created,
    syncAction: 'created',
  };
}

