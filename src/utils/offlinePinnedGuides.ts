import notesData from '../data/notesData.json';

export const OFFLINE_GUIDES_STORAGE_KEY = 'jawed_offline_pinned_guides_v1';
export const OFFLINE_GUIDES_CACHE_NAME = 'jawed-offline-guides-cache-v1';
export const OFFLINE_GUIDES_EVENT_NAME = 'jawed-offline-guides-updated';
export const OFFLINE_DOWNLOAD_PROGRESS_EVENT_NAME = 'jawed-offline-download-progress';
export const DOWNLOAD_FOR_OFFLINE_LABEL = 'Download for Offline';
export const OFFLINE_PINNED_LABEL = 'Pinned for Offline';

export type OfflineGuideSyncStatus = 'synced' | 'update-available' | 'local-only';

export const OFFLINE_SYNC_STATUS_LABELS: Record<OfflineGuideSyncStatus, string> = {
  synced: 'Up to Date',
  'update-available': 'Update Available',
  'local-only': 'Local Copy',
};

export interface LatestGuideMetadataItem {
  slug: string;
  title?: string;
  description?: string;
  category?: string;
  content?: string;
  version?: string;
  lastUpdated?: string;
  updatedDate?: string;
}

export type OfflineGuideChangedField =
  | 'title'
  | 'description'
  | 'category'
  | 'content'
  | 'version'
  | 'lastUpdated';

export interface OfflineGuideSyncEvaluation {
  slug: string;
  status: OfflineGuideSyncStatus;
  isUpToDate: boolean;
  hasUpdateAvailable: boolean;
  label: string;
  storedVersion: string;
  latestVersion: string | null;
  storedLastUpdated: string;
  latestLastUpdated: string;
  changedFields: OfflineGuideChangedField[];
}

export type OfflineDownloadStage =
  | 'idle'
  | 'preparing'
  | 'caching'
  | 'verifying'
  | 'completed'
  | 'removed'
  | 'error';

export interface OfflineDownloadProgressState {
  visible: boolean;
  slug: string;
  title: string;
  action: 'pin' | 'unpin';
  stage: OfflineDownloadStage;
  progressPercent: number;
  statusMessage: string;
  sizeBytes: number;
  formattedSize: string;
  updatedAt: number;
}

export interface OfflinePinnedGuide {
  slug: string;
  title: string;
  description: string;
  category: string;
  content: string;
  route: string;
  aliases: string[];
  pinnedAt: string;
  sizeBytes: number;
  version: string;
  lastUpdated: string;
  metadataHash: string;
}

export interface OfflineGuideInput {
  slug: string;
  title: string;
  description?: string;
  category?: string;
  content?: string;
  route?: string;
  pinnedAt?: string;
  version?: string;
  lastUpdated?: string;
  updatedDate?: string;
}

export interface OfflineStorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem?(key: string): void;
}

function resolveOfflineStorage(
  customStorage?: OfflineStorageAdapter | null
): OfflineStorageAdapter | null {
  if (customStorage) return customStorage;
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage;
  }
  if (
    typeof globalThis !== 'undefined' &&
    'localStorage' in globalThis &&
    globalThis.localStorage
  ) {
    return globalThis.localStorage as OfflineStorageAdapter;
  }
  return null;
}

export function calculateUtf8ByteSize(text: string): number {
  const str = String(text || '');
  if (typeof TextEncoder !== 'undefined') {
    try {
      return new TextEncoder().encode(str).length;
    } catch {
      // Fallback to Blob or string length
    }
  }
  if (typeof Blob !== 'undefined') {
    try {
      return new Blob([str]).size;
    } catch {
      // Fallback to string length
    }
  }
  return str.length;
}

export function formatOfflineSize(sizeBytes: number): string {
  const bytes = Math.max(0, Number(sizeBytes) || 0);
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  const kb = bytes / 1024;
  if (kb < 1024) {
    return `${kb.toFixed(1)} KB`;
  }
  const mb = kb / 1024;
  return `${mb.toFixed(2)} MB`;
}

function buildGuideAliases(slug: string, primaryRoute?: string): string[] {
  const cleanSlug = String(slug || '').trim();
  const baseAliases = [
    primaryRoute || `/notes/${cleanSlug}`,
    `/notes/${cleanSlug}`,
    `/guides/${cleanSlug}`,
    `/field-guides/${cleanSlug}`,
  ];
  return Array.from(new Set(baseAliases.filter(Boolean)));
}

/**
 * Extracts the last updated date (e.g., '2026-10-13') from explicit metadata fields or embedded guide HTML.
 */
export function extractGuideUpdatedDate(
  guide?: Partial<LatestGuideMetadataItem> | null
): string {
  if (!guide) return '';
  const explicit = String(guide.lastUpdated || guide.updatedDate || '').trim();
  if (explicit) return explicit;

  const content = String(guide.content || '');
  if (!content) return '';

  const updatedMatch = content.match(
    /(?:Updated|Last Updated|updatedDate|lastUpdated)\s*:\s*([0-9]{4}-[0-9]{2}-[0-9]{2}|[A-Za-z]+\s+[0-9]{1,2},\s*[0-9]{4})/i
  );
  if (updatedMatch?.[1]) {
    return updatedMatch[1].trim();
  }

  const publishedMatch = content.match(
    /(?:Published|publishedDate)\s*:\s*([0-9]{4}-[0-9]{2}-[0-9]{2}|[A-Za-z]+\s+[0-9]{1,2},\s*[0-9]{4})/i
  );
  if (publishedMatch?.[1]) {
    return publishedMatch[1].trim();
  }

  return '';
}

/**
 * Computes a deterministic 32-bit FNV-1a hex fingerprint over a guide's metadata and content.
 */
export function computeGuideMetadataHash(
  guide?: Partial<LatestGuideMetadataItem> | null
): string {
  if (!guide) return '00000000';
  const updated = extractGuideUpdatedDate(guide);
  const payload = [
    String(guide.slug || '').trim(),
    String(guide.title || '').trim(),
    String(guide.description || '').trim(),
    String(guide.category || '').trim(),
    String(guide.version || '').trim(),
    updated,
    String(guide.content || '').trim(),
  ].join('|');

  let hash = 0x811c9dc5;
  for (let i = 0; i < payload.length; i += 1) {
    hash ^= payload.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

/**
 * Computes a human-readable version identifier combining explicit version / updated date and metadata hash.
 */
export function computeGuideMetadataVersion(
  guide?: Partial<LatestGuideMetadataItem> | null
): string {
  if (!guide) return 'v0-00000000';
  const explicitVersion = String(guide.version || '').trim();
  if (explicitVersion) {
    return explicitVersion;
  }
  const updated = extractGuideUpdatedDate(guide);
  const hash = computeGuideMetadataHash(guide);
  if (updated) {
    return `${updated}-${hash.slice(0, 6)}`;
  }
  return `v1-${hash.slice(0, 6)}`;
}

function normalizeOfflineGuide(
  raw: (Partial<OfflinePinnedGuide> & { updatedDate?: string }) | null | undefined
): OfflinePinnedGuide | null {
  if (!raw || typeof raw !== 'object') return null;
  const slug = String(raw.slug || '').trim();
  if (!slug) return null;

  const title = String(raw.title || slug).trim();
  const description = String(raw.description || '').trim();
  const category = String(raw.category || 'Technical Guide').trim();
  const content = String(raw.content || '').trim();
  const route = String(raw.route || `/notes/${slug}`).trim();
  const aliases = Array.isArray(raw.aliases) && raw.aliases.length > 0
    ? raw.aliases
    : buildGuideAliases(slug, route);
  const pinnedAt = String(raw.pinnedAt || new Date().toISOString()).trim();
  const lastUpdated = extractGuideUpdatedDate({
    lastUpdated: raw.lastUpdated,
    updatedDate: raw.updatedDate,
    content,
  });
  const metadataHash = computeGuideMetadataHash({
    slug,
    title,
    description,
    category,
    content,
    version: raw.version,
    lastUpdated,
  });
  const version = String(
    raw.version ||
      computeGuideMetadataVersion({
        slug,
        title,
        description,
        category,
        content,
        lastUpdated,
      })
  ).trim();
  const sizeBytes =
    typeof raw.sizeBytes === 'number' && raw.sizeBytes > 0
      ? raw.sizeBytes
      : calculateUtf8ByteSize(JSON.stringify({ slug, title, description, category, content }));

  return {
    slug,
    title,
    description,
    category,
    content,
    route,
    aliases,
    pinnedAt,
    sizeBytes,
    version,
    lastUpdated,
    metadataHash,
  };
}

function dispatchOfflineGuidesUpdated(guides: OfflinePinnedGuide[]): void {
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    window.dispatchEvent(
      new CustomEvent(OFFLINE_GUIDES_EVENT_NAME, {
        detail: guides,
      })
    );
  }
}

async function syncGuideToBrowserCacheStorage(
  guide: OfflinePinnedGuide,
  action: 'put' | 'delete'
): Promise<void> {
  if (typeof window === 'undefined' || !('caches' in window) || !window.caches) {
    return;
  }
  try {
    const cache = await window.caches.open(OFFLINE_GUIDES_CACHE_NAME);
    const cacheUrl = `${window.location?.origin || 'https://jawed.co.in'}${guide.route}`;
    if (action === 'put') {
      const response = new Response(JSON.stringify(guide), {
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      });
      await cache.put(cacheUrl, response);
    } else {
      await cache.delete(cacheUrl);
    }
  } catch {
    // Ignore Cache Storage errors in restricted or non-HTTPS environments
  }
}

/**
 * Returns all pinned/downloaded offline technical guides stored in localStorage.
 */
export function getOfflinePinnedGuides(
  storage?: OfflineStorageAdapter | null
): OfflinePinnedGuide[] {
  const targetStorage = resolveOfflineStorage(storage);
  if (!targetStorage) return [];

  try {
    const raw = targetStorage.getItem(OFFLINE_GUIDES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    const seen = new Set<string>();
    const list: OfflinePinnedGuide[] = [];
    for (const item of parsed) {
      const normalized = normalizeOfflineGuide(item);
      if (normalized && !seen.has(normalized.slug)) {
        seen.add(normalized.slug);
        list.push(normalized);
      }
    }
    return list;
  } catch {
    return [];
  }
}

/**
 * Saves the full list of offline pinned guides to localStorage.
 */
export function saveOfflinePinnedGuides(
  guides: OfflinePinnedGuide[],
  storage?: OfflineStorageAdapter | null
): OfflinePinnedGuide[] {
  const targetStorage = resolveOfflineStorage(storage);
  const seen = new Set<string>();
  const normalizedList: OfflinePinnedGuide[] = [];

  for (const item of guides) {
    const normalized = normalizeOfflineGuide(item);
    if (normalized && !seen.has(normalized.slug)) {
      seen.add(normalized.slug);
      normalizedList.push(normalized);
    }
  }

  if (targetStorage) {
    try {
      targetStorage.setItem(
        OFFLINE_GUIDES_STORAGE_KEY,
        JSON.stringify(normalizedList)
      );
    } catch {
      // Ignore quota errors
    }
  }

  dispatchOfflineGuidesUpdated(normalizedList);
  return normalizedList;
}

/**
 * Retrieves a specific pinned offline technical guide by slug.
 */
export function getOfflinePinnedGuideBySlug(
  slug: string,
  storage?: OfflineStorageAdapter | null
): OfflinePinnedGuide | null {
  const cleanSlug = String(slug || '').trim();
  if (!cleanSlug) return null;
  const guides = getOfflinePinnedGuides(storage);
  return guides.find((item) => item.slug === cleanSlug) || null;
}

/**
 * Checks whether a technical guide with the given slug is currently pinned/downloaded for offline access.
 */
export function isGuidePinnedForOffline(
  slug: string,
  storage?: OfflineStorageAdapter | null
): boolean {
  return Boolean(getOfflinePinnedGuideBySlug(slug, storage));
}

/**
 * Checks whether a URL pathname corresponds to a pinned/downloaded offline technical guide.
 */
export function isPinnedOfflineGuidePath(
  pathname: string,
  storage?: OfflineStorageAdapter | null
): boolean {
  if (!pathname) return false;
  const normalized =
    pathname.length > 1 && pathname.endsWith('/')
      ? pathname.slice(0, -1)
      : pathname;

  const guides = getOfflinePinnedGuides(storage);
  for (const guide of guides) {
    if (guide.route === normalized || guide.aliases.includes(normalized)) {
      return true;
    }
  }
  return false;
}

/**
 * Pins / downloads a technical guide for offline access in localStorage (and Cache Storage when available).
 */
export function pinGuideForOffline(
  guide: OfflineGuideInput,
  storage?: OfflineStorageAdapter | null
): OfflinePinnedGuide[] {
  const cleanSlug = String(guide?.slug || '').trim();
  const route = guide.route || `/notes/${cleanSlug}`;
  const normalized = normalizeOfflineGuide({
    ...guide,
    slug: cleanSlug,
    route,
    aliases: buildGuideAliases(cleanSlug, route),
    pinnedAt: guide.pinnedAt || new Date().toISOString(),
  });

  if (!normalized) {
    return getOfflinePinnedGuides(storage);
  }

  const existing = getOfflinePinnedGuides(storage).filter(
    (item) => item.slug !== normalized.slug
  );
  const updated = [normalized, ...existing];
  const saved = saveOfflinePinnedGuides(updated, storage);
  void syncGuideToBrowserCacheStorage(normalized, 'put');
  return saved;
}

/**
 * Unpins / removes a downloaded technical guide from offline storage by slug.
 */
export function unpinGuideFromOffline(
  slug: string,
  storage?: OfflineStorageAdapter | null
): OfflinePinnedGuide[] {
  const cleanSlug = String(slug || '').trim();
  const existing = getOfflinePinnedGuides(storage);
  const target = existing.find((item) => item.slug === cleanSlug);
  const updated = existing.filter((item) => item.slug !== cleanSlug);
  const saved = saveOfflinePinnedGuides(updated, storage);
  if (target) {
    void syncGuideToBrowserCacheStorage(target, 'delete');
  }
  return saved;
}

/**
 * Toggles the offline pin/download state for a technical guide.
 */
export function toggleGuideOfflinePin(
  guide: OfflineGuideInput,
  storage?: OfflineStorageAdapter | null
): {
  pinned: boolean;
  guides: OfflinePinnedGuide[];
  guide: OfflinePinnedGuide | null;
} {
  const cleanSlug = String(guide?.slug || '').trim();
  if (!cleanSlug) {
    return {
      pinned: false,
      guides: getOfflinePinnedGuides(storage),
      guide: null,
    };
  }

  if (isGuidePinnedForOffline(cleanSlug, storage)) {
    const guides = unpinGuideFromOffline(cleanSlug, storage);
    return { pinned: false, guides, guide: null };
  }

  const guides = pinGuideForOffline(guide, storage);
  const pinnedGuide = guides.find((g) => g.slug === cleanSlug) || null;
  return { pinned: true, guides, guide: pinnedGuide };
}

/**
 * Clears all pinned offline guides from localStorage.
 */
export function clearOfflinePinnedGuides(
  storage?: OfflineStorageAdapter | null
): OfflinePinnedGuide[] {
  const targetStorage = resolveOfflineStorage(storage);
  if (targetStorage) {
    try {
      if (typeof targetStorage.removeItem === 'function') {
        targetStorage.removeItem(OFFLINE_GUIDES_STORAGE_KEY);
      } else {
        targetStorage.setItem(OFFLINE_GUIDES_STORAGE_KEY, '[]');
      }
    } catch {
      // Ignore storage errors
    }
  }
  dispatchOfflineGuidesUpdated([]);
  return [];
}

/**
 * Returns the initial idle state for the offline download progress toast notification.
 */
export function createInitialOfflineDownloadProgressState(): OfflineDownloadProgressState {
  return {
    visible: false,
    slug: '',
    title: '',
    action: 'pin',
    stage: 'idle',
    progressPercent: 0,
    statusMessage: '',
    sizeBytes: 0,
    formattedSize: '0 B',
    updatedAt: 0,
  };
}

/**
 * Dispatches a browser custom event whenever the offline download/pin progress state updates.
 */
export function dispatchOfflineDownloadProgress(
  state: OfflineDownloadProgressState
): void {
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    window.dispatchEvent(
      new CustomEvent(OFFLINE_DOWNLOAD_PROGRESS_EVENT_NAME, {
        detail: state,
      })
    );
  }
}

/**
 * Builds the sequence of visual progress states for pinning/downloading or unpinning a technical guide.
 */
export function buildOfflineDownloadProgressSteps(
  guide: OfflineGuideInput,
  action: 'pin' | 'unpin' = 'pin',
  explicitSizeBytes?: number
): OfflineDownloadProgressState[] {
  const slug = String(guide?.slug || '').trim();
  const title = String(guide?.title || slug || 'Technical Guide').trim();
  const description = String(guide?.description || '').trim();
  const category = String(guide?.category || 'Technical Guide').trim();
  const content = String(guide?.content || '').trim();

  const sizeBytes =
    typeof explicitSizeBytes === 'number' && explicitSizeBytes > 0
      ? explicitSizeBytes
      : calculateUtf8ByteSize(
          JSON.stringify({ slug, title, description, category, content })
        );
  const formattedSize = formatOfflineSize(sizeBytes);
  const now = Date.now();

  if (action === 'unpin') {
    return [
      {
        visible: true,
        slug,
        title,
        action: 'unpin',
        stage: 'caching',
        progressPercent: 50,
        statusMessage: 'Removing guide from offline cache...',
        sizeBytes,
        formattedSize,
        updatedAt: now,
      },
      {
        visible: true,
        slug,
        title,
        action: 'unpin',
        stage: 'removed',
        progressPercent: 100,
        statusMessage: 'Removed from offline storage',
        sizeBytes,
        formattedSize,
        updatedAt: now + 1,
      },
    ];
  }

  return [
    {
      visible: true,
      slug,
      title,
      action: 'pin',
      stage: 'preparing',
      progressPercent: 25,
      statusMessage: 'Preparing offline guide package...',
      sizeBytes,
      formattedSize,
      updatedAt: now,
    },
    {
      visible: true,
      slug,
      title,
      action: 'pin',
      stage: 'caching',
      progressPercent: 65,
      statusMessage: `Caching guide content (${formattedSize})...`,
      sizeBytes,
      formattedSize,
      updatedAt: now + 1,
    },
    {
      visible: true,
      slug,
      title,
      action: 'pin',
      stage: 'verifying',
      progressPercent: 90,
      statusMessage: 'Verifying offline availability...',
      sizeBytes,
      formattedSize,
      updatedAt: now + 2,
    },
    {
      visible: true,
      slug,
      title,
      action: 'pin',
      stage: 'completed',
      progressPercent: 100,
      statusMessage: `Pinned & downloaded for offline access (${formattedSize})`,
      sizeBytes,
      formattedSize,
      updatedAt: now + 3,
    },
  ];
}

/**
 * Toggles the offline pin/download state for a technical guide and emits step-by-step
 * progress notifications for toast UI consumers.
 */
export function toggleGuideOfflinePinWithProgress(
  guide: OfflineGuideInput,
  onProgress?: (state: OfflineDownloadProgressState) => void,
  storage?: OfflineStorageAdapter | null
): {
  pinned: boolean;
  guides: OfflinePinnedGuide[];
  guide: OfflinePinnedGuide | null;
  steps: OfflineDownloadProgressState[];
  finalState: OfflineDownloadProgressState;
} {
  const result = toggleGuideOfflinePin(guide, storage);
  const action: 'pin' | 'unpin' = result.pinned ? 'pin' : 'unpin';
  const steps = buildOfflineDownloadProgressSteps(
    guide,
    action,
    result.guide?.sizeBytes
  );
  for (const step of steps) {
    if (typeof onProgress === 'function') {
      onProgress(step);
    }
    dispatchOfflineDownloadProgress(step);
  }
  const finalState =
    steps[steps.length - 1] || createInitialOfflineDownloadProgressState();
  return {
    ...result,
    steps,
    finalState,
  };
}

function resolveLatestGuideFromCatalog(
  slug: string,
  latestCatalog?: LatestGuideMetadataItem[] | Record<string, LatestGuideMetadataItem> | null
): LatestGuideMetadataItem | null {
  const cleanSlug = String(slug || '').trim();
  if (!cleanSlug) return null;

  if (Array.isArray(latestCatalog)) {
    return latestCatalog.find((item) => item && item.slug === cleanSlug) || null;
  }
  if (latestCatalog && typeof latestCatalog === 'object') {
    return latestCatalog[cleanSlug] || null;
  }

  const defaultCatalog = notesData as LatestGuideMetadataItem[];
  if (Array.isArray(defaultCatalog)) {
    return defaultCatalog.find((item) => item && item.slug === cleanSlug) || null;
  }
  return null;
}

/**
 * Evaluates whether a locally stored offline guide matches the latest metadata available
 * from the application (comparing version, lastUpdated, title, description, category, and content).
 */
export function evaluateOfflineGuideSyncStatus(
  storedGuide: OfflinePinnedGuide | OfflineGuideInput,
  latestCatalog?: LatestGuideMetadataItem[] | Record<string, LatestGuideMetadataItem> | null
): OfflineGuideSyncEvaluation {
  const normalizedStored = normalizeOfflineGuide(storedGuide);
  const slug = normalizedStored?.slug || String(storedGuide?.slug || '').trim();
  const storedVersion =
    normalizedStored?.version || computeGuideMetadataVersion(storedGuide);
  const storedLastUpdated =
    normalizedStored?.lastUpdated || extractGuideUpdatedDate(storedGuide);

  const latestGuide = resolveLatestGuideFromCatalog(slug, latestCatalog);
  if (!latestGuide) {
    return {
      slug,
      status: 'local-only',
      isUpToDate: true,
      hasUpdateAvailable: false,
      label: OFFLINE_SYNC_STATUS_LABELS['local-only'],
      storedVersion,
      latestVersion: null,
      storedLastUpdated,
      latestLastUpdated: storedLastUpdated,
      changedFields: [],
    };
  }

  const latestLastUpdated = extractGuideUpdatedDate(latestGuide);
  const latestVersion = computeGuideMetadataVersion(latestGuide);
  const changedFields: OfflineGuideChangedField[] = [];

  if (
    storedGuide.version &&
    latestGuide.version &&
    String(storedGuide.version).trim() !== String(latestGuide.version).trim()
  ) {
    changedFields.push('version');
  }

  if (
    storedLastUpdated &&
    latestLastUpdated &&
    storedLastUpdated !== latestLastUpdated
  ) {
    changedFields.push('lastUpdated');
  }

  if (
    latestGuide.title !== undefined &&
    String(storedGuide.title || '').trim() !== String(latestGuide.title || '').trim()
  ) {
    changedFields.push('title');
  }

  if (
    latestGuide.description !== undefined &&
    String(storedGuide.description || '').trim() !==
      String(latestGuide.description || '').trim()
  ) {
    changedFields.push('description');
  }

  if (
    latestGuide.category !== undefined &&
    String(storedGuide.category || '').trim() !==
      String(latestGuide.category || '').trim()
  ) {
    changedFields.push('category');
  }

  if (
    latestGuide.content !== undefined &&
    String(storedGuide.content || '').trim() !==
      String(latestGuide.content || '').trim()
  ) {
    changedFields.push('content');
  }

  const isUpToDate = changedFields.length === 0;
  const status: OfflineGuideSyncStatus = isUpToDate ? 'synced' : 'update-available';

  return {
    slug,
    status,
    isUpToDate,
    hasUpdateAvailable: !isUpToDate,
    label: OFFLINE_SYNC_STATUS_LABELS[status],
    storedVersion,
    latestVersion,
    storedLastUpdated,
    latestLastUpdated,
    changedFields,
  };
}

/**
 * Evaluates the sync status for all pinned offline guides against the latest application metadata.
 */
export function evaluateAllOfflineGuidesSyncStatus(
  guides?: OfflinePinnedGuide[],
  latestCatalog?: LatestGuideMetadataItem[] | Record<string, LatestGuideMetadataItem> | null,
  storage?: OfflineStorageAdapter | null
): Record<string, OfflineGuideSyncEvaluation> {
  const list = Array.isArray(guides) ? guides : getOfflinePinnedGuides(storage);
  const map: Record<string, OfflineGuideSyncEvaluation> = {};
  for (const guide of list) {
    if (!guide?.slug) continue;
    map[guide.slug] = evaluateOfflineGuideSyncStatus(guide, latestCatalog);
  }
  return map;
}

/**
 * Synchronizes a locally stored offline guide with the latest metadata available from the application.
 */
export function syncOfflineGuideWithLatestMetadata(
  slug: string,
  latestCatalog?: LatestGuideMetadataItem[] | Record<string, LatestGuideMetadataItem> | null,
  storage?: OfflineStorageAdapter | null
): OfflinePinnedGuide | null {
  const cleanSlug = String(slug || '').trim();
  if (!cleanSlug) return null;

  const existing = getOfflinePinnedGuideBySlug(cleanSlug, storage);
  const latest = resolveLatestGuideFromCatalog(cleanSlug, latestCatalog);
  if (!latest) {
    return existing;
  }

  const updatedList = pinGuideForOffline(
    {
      slug: cleanSlug,
      title: latest.title ?? existing?.title ?? cleanSlug,
      description: latest.description ?? existing?.description ?? '',
      category: latest.category ?? existing?.category ?? 'Technical Guide',
      content: latest.content ?? existing?.content ?? '',
      route: existing?.route || `/notes/${cleanSlug}`,
      version: latest.version,
      lastUpdated: latest.lastUpdated || latest.updatedDate,
    },
    storage
  );

  return updatedList.find((g) => g.slug === cleanSlug) || null;
}


