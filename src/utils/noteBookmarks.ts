export const NOTE_BOOKMARKS_STORAGE_KEY = 'jawed_bookmarked_notes_v1';
export const NOTE_BOOKMARKS_EVENT_NAME = 'jawed-note-bookmarks-updated';

export interface BookmarkedNoteItem {
  slug: string;
  title: string;
  description: string;
  category: string;
  route: string;
  savedAt: string;
}

export interface BookmarkInput {
  slug: string;
  title: string;
  description?: string;
  category?: string;
  route?: string;
  savedAt?: string;
}

export interface BookmarkStorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem?(key: string): void;
}

export type QuickActionsTab = 'tools' | 'bookmarks';

function resolveBookmarkStorage(
  customStorage?: BookmarkStorageAdapter | null
): BookmarkStorageAdapter | null {
  if (customStorage) return customStorage;
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage;
  }
  if (typeof globalThis !== 'undefined' && 'localStorage' in globalThis && globalThis.localStorage) {
    return globalThis.localStorage as BookmarkStorageAdapter;
  }
  return null;
}

function normalizeBookmarkedItem(raw: Partial<BookmarkedNoteItem> | null | undefined): BookmarkedNoteItem | null {
  if (!raw || typeof raw !== 'object') return null;
  const slug = String(raw.slug || '').trim();
  if (!slug) return null;
  const title = String(raw.title || slug).trim();
  const description = String(raw.description || '').trim();
  const category = String(raw.category || 'Technical Guide').trim();
  const route = String(raw.route || `/notes/${slug}`).trim();
  const savedAt = String(raw.savedAt || new Date().toISOString()).trim();

  return {
    slug,
    title,
    description,
    category,
    route,
    savedAt,
  };
}

function dispatchBookmarksUpdatedEvent(bookmarks: BookmarkedNoteItem[]): void {
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    window.dispatchEvent(
      new CustomEvent(NOTE_BOOKMARKS_EVENT_NAME, {
        detail: bookmarks,
      })
    );
  }
}

/**
 * Reads all bookmarked technical notes/guides from localStorage.
 */
export function getBookmarkedNotes(
  storage?: BookmarkStorageAdapter | null
): BookmarkedNoteItem[] {
  const targetStorage = resolveBookmarkStorage(storage);
  if (!targetStorage) return [];

  try {
    const raw = targetStorage.getItem(NOTE_BOOKMARKS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    const seen = new Set<string>();
    const valid: BookmarkedNoteItem[] = [];
    for (const entry of parsed) {
      const normalized = normalizeBookmarkedItem(entry);
      if (normalized && !seen.has(normalized.slug)) {
        seen.add(normalized.slug);
        valid.push(normalized);
      }
    }
    return valid;
  } catch {
    return [];
  }
}

/**
 * Persists a full list of bookmarked notes to localStorage.
 */
export function saveBookmarkedNotes(
  bookmarks: BookmarkedNoteItem[],
  storage?: BookmarkStorageAdapter | null
): BookmarkedNoteItem[] {
  const targetStorage = resolveBookmarkStorage(storage);
  const seen = new Set<string>();
  const normalizedList: BookmarkedNoteItem[] = [];

  for (const item of bookmarks) {
    const normalized = normalizeBookmarkedItem(item);
    if (normalized && !seen.has(normalized.slug)) {
      seen.add(normalized.slug);
      normalizedList.push(normalized);
    }
  }

  if (targetStorage) {
    try {
      targetStorage.setItem(NOTE_BOOKMARKS_STORAGE_KEY, JSON.stringify(normalizedList));
    } catch {
      // Ignore storage quota errors in restricted environments
    }
  }

  dispatchBookmarksUpdatedEvent(normalizedList);
  return normalizedList;
}

/**
 * Checks whether a note with the given slug is currently bookmarked in localStorage.
 */
export function isNoteBookmarked(
  slug: string,
  storage?: BookmarkStorageAdapter | null
): boolean {
  const cleanSlug = String(slug || '').trim();
  if (!cleanSlug) return false;
  const bookmarks = getBookmarkedNotes(storage);
  return bookmarks.some((item) => item.slug === cleanSlug);
}

/**
 * Adds or updates a technical note bookmark in localStorage (placing the newest bookmark first).
 */
export function addBookmarkedNote(
  note: BookmarkInput,
  storage?: BookmarkStorageAdapter | null
): BookmarkedNoteItem[] {
  const normalized = normalizeBookmarkedItem({
    ...note,
    route: note.route || `/notes/${String(note.slug || '').trim()}`,
    savedAt: note.savedAt || new Date().toISOString(),
  });
  if (!normalized) {
    return getBookmarkedNotes(storage);
  }

  const existing = getBookmarkedNotes(storage).filter(
    (item) => item.slug !== normalized.slug
  );
  const updated = [normalized, ...existing];
  return saveBookmarkedNotes(updated, storage);
}

/**
 * Removes a bookmarked technical note by slug from localStorage.
 */
export function removeBookmarkedNote(
  slug: string,
  storage?: BookmarkStorageAdapter | null
): BookmarkedNoteItem[] {
  const cleanSlug = String(slug || '').trim();
  const existing = getBookmarkedNotes(storage);
  const updated = existing.filter((item) => item.slug !== cleanSlug);
  return saveBookmarkedNotes(updated, storage);
}

/**
 * Toggles the bookmark status of a technical note in localStorage.
 */
export function toggleBookmarkedNote(
  note: BookmarkInput,
  storage?: BookmarkStorageAdapter | null
): { bookmarked: boolean; bookmarks: BookmarkedNoteItem[] } {
  const cleanSlug = String(note?.slug || '').trim();
  if (!cleanSlug) {
    return { bookmarked: false, bookmarks: getBookmarkedNotes(storage) };
  }

  if (isNoteBookmarked(cleanSlug, storage)) {
    const bookmarks = removeBookmarkedNote(cleanSlug, storage);
    return { bookmarked: false, bookmarks };
  }

  const bookmarks = addBookmarkedNote(note, storage);
  return { bookmarked: true, bookmarks };
}

/**
 * Clears all saved note bookmarks from localStorage.
 */
export function clearBookmarkedNotes(
  storage?: BookmarkStorageAdapter | null
): BookmarkedNoteItem[] {
  const targetStorage = resolveBookmarkStorage(storage);
  if (targetStorage) {
    try {
      if (typeof targetStorage.removeItem === 'function') {
        targetStorage.removeItem(NOTE_BOOKMARKS_STORAGE_KEY);
      } else {
        targetStorage.setItem(NOTE_BOOKMARKS_STORAGE_KEY, '[]');
      }
    } catch {
      // Ignore storage errors
    }
  }
  dispatchBookmarksUpdatedEvent([]);
  return [];
}

/**
 * Filters bookmarked notes by search query across title, description, category, slug, and route.
 */
export function filterBookmarkedNotes(
  queryOrItems: string | BookmarkedNoteItem[],
  itemsOrQuery: BookmarkedNoteItem[] | string = []
): BookmarkedNoteItem[] {
  const query = Array.isArray(queryOrItems)
    ? typeof itemsOrQuery === 'string'
      ? itemsOrQuery
      : ''
    : queryOrItems;
  const items = Array.isArray(queryOrItems)
    ? queryOrItems
    : Array.isArray(itemsOrQuery)
      ? itemsOrQuery
      : getBookmarkedNotes();

  const cleanQuery = String(query || '').trim().toLowerCase();
  if (!cleanQuery) return items;

  return items.filter((item) => {
    return (
      item.title.toLowerCase().includes(cleanQuery) ||
      item.description.toLowerCase().includes(cleanQuery) ||
      item.category.toLowerCase().includes(cleanQuery) ||
      item.slug.toLowerCase().includes(cleanQuery) ||
      item.route.toLowerCase().includes(cleanQuery)
    );
  });
}
