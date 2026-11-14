export const OFFLINE_GUIDES_STORAGE_KEY = 'jawed_offline_pinned_guides_v1';
export const OFFLINE_GUIDES_CACHE_NAME = 'jawed-offline-guides-cache-v1';
export const OFFLINE_GUIDES_EVENT_NAME = 'jawed-offline-guides-updated';
export const DOWNLOAD_FOR_OFFLINE_LABEL = 'Download for Offline';
export const OFFLINE_PINNED_LABEL = 'Pinned for Offline';

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
}

export interface OfflineGuideInput {
  slug: string;
  title: string;
  description?: string;
  category?: string;
  content?: string;
  route?: string;
  pinnedAt?: string;
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

function normalizeOfflineGuide(
  raw: Partial<OfflinePinnedGuide> | null | undefined
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
