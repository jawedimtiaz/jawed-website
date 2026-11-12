import { useState, useEffect, useRef, useCallback } from 'react';
import { useOnlineStatus } from './useOnlineStatus';

export interface StorageDraftEnvelope<T> {
  data: T;
  savedAt: number;
  version?: number;
}

export interface UseLocalStorageDraftOptions<T> {
  key: string;
  defaultValues: T;
  version?: number;
  autoSaveDelayMs?: number;
}

export interface UseLocalStorageDraftResult<T> {
  values: T;
  setValues: React.Dispatch<React.SetStateAction<T>>;
  updateField: <K extends keyof T>(field: K, value: T[K]) => void;
  saveDraftNow: () => boolean;
  clearDraft: () => void;
  lastSavedAt: number | null;
  formattedLastSaved: string;
  isOnline: boolean;
  isRestored: boolean;
  hasSavedDraft: boolean;
  isDirty: boolean;
  saveStatus: 'idle' | 'saving' | 'saved' | 'restored' | 'cleared';
  statusMessage: string;
}

/**
 * Formats a unix timestamp into a readable localized time string
 */
export function formatDraftTimestamp(timestamp: number | null): string {
  if (!timestamp) return '';
  try {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch {
    return '';
  }
}

/**
 * Safely reads a draft payload from window.localStorage
 */
export function readDraftFromStorage<T>(key: string, defaultValues: T): { data: T; savedAt: number | null; isStored: boolean } {
  if (typeof window === 'undefined' || !window.localStorage) {
    return { data: defaultValues, savedAt: null, isStored: false };
  }

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return { data: defaultValues, savedAt: null, isStored: false };
    }

    const parsed: StorageDraftEnvelope<T> | T = JSON.parse(raw);

    // Support both enveloped { data, savedAt } and direct object formats
    if (parsed && typeof parsed === 'object' && 'data' in parsed && 'savedAt' in parsed) {
      const envelope = parsed as StorageDraftEnvelope<T>;
      return {
        data: { ...defaultValues, ...envelope.data },
        savedAt: typeof envelope.savedAt === 'number' ? envelope.savedAt : null,
        isStored: true,
      };
    }

    // Direct object without envelope
    if (parsed && typeof parsed === 'object') {
      return {
        data: { ...defaultValues, ...(parsed as T) },
        savedAt: Date.now(),
        isStored: true,
      };
    }

    return { data: defaultValues, savedAt: null, isStored: false };
  } catch (err) {
    console.warn(`[useLocalStorageDraft] Failed to read draft for key "${key}":`, err);
    return { data: defaultValues, savedAt: null, isStored: false };
  }
}

/**
 * Safely writes a draft payload to window.localStorage
 */
export function writeDraftToStorage<T>(key: string, data: T, version: number = 1): number | null {
  if (typeof window === 'undefined' || !window.localStorage) {
    return null;
  }

  try {
    const savedAt = Date.now();
    const envelope: StorageDraftEnvelope<T> = {
      data,
      savedAt,
      version,
    };
    window.localStorage.setItem(key, JSON.stringify(envelope));
    return savedAt;
  } catch (err) {
    console.warn(`[useLocalStorageDraft] Failed to write draft for key "${key}":`, err);
    return null;
  }
}

/**
 * Safely removes a draft from window.localStorage
 */
export function removeDraftFromStorage(key: string): boolean {
  if (typeof window === 'undefined' || !window.localStorage) {
    return false;
  }

  try {
    window.localStorage.removeItem(key);
    return true;
  } catch (err) {
    console.warn(`[useLocalStorageDraft] Failed to remove draft for key "${key}":`, err);
    return false;
  }
}

/**
 * Custom React hook that automatically saves form progress to localStorage and protects against connection drops
 */
export function useLocalStorageDraft<T extends Record<string, any>>({
  key,
  defaultValues,
  version = 1,
  autoSaveDelayMs = 400,
}: UseLocalStorageDraftOptions<T>): UseLocalStorageDraftResult<T> {
  const isOnline = useOnlineStatus();

  // Start from deterministic defaults; restore browser storage after hydration.
  const [values, setValues] = useState<T>(defaultValues);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [isRestored, setIsRestored] = useState(false);
  const [hasSavedDraft, setHasSavedDraft] = useState(false);
  const [hasLoadedDraft, setHasLoadedDraft] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'restored' | 'cleared'>('idle');

  useEffect(() => {
    const stored = readDraftFromStorage(key, defaultValues);
    setValues(stored.data);
    setLastSavedAt(stored.savedAt);
    setIsRestored(stored.isStored);
    setHasSavedDraft(stored.isStored);
    setSaveStatus(stored.isStored ? 'restored' : 'idle');
    setHasLoadedDraft(true);
  }, [key, defaultValues]);

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const valuesRef = useRef<T>(values);
  valuesRef.current = values;

  // Determine if current values differ from default values
  const isDirty = JSON.stringify(values) !== JSON.stringify(defaultValues);

  // Immediate save helper
  const commitSave = useCallback(() => {
    if (!hasLoadedDraft) return false;
    const savedTimestamp = writeDraftToStorage(key, valuesRef.current, version);
    if (savedTimestamp !== null) {
      setLastSavedAt(savedTimestamp);
      setHasSavedDraft(true);
      setSaveStatus('saved');
      return true;
    }
    return false;
  }, [key, version, hasLoadedDraft]);

  // Update a single field cleanly
  const updateField = useCallback(<K extends keyof T>(field: K, value: T[K]) => {
    setValues((prev) => ({
      ...prev,
      [field]: value,
    }));
  }, []);

  // Debounced auto-save on value changes
  useEffect(() => {
    if (!hasLoadedDraft) return;

    setSaveStatus('saving');
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      commitSave();
    }, autoSaveDelayMs);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [values, autoSaveDelayMs, commitSave, hasLoadedDraft]);

  // Immediate flush on connection drop (offline event) or tab close/unload
  useEffect(() => {
    const handleImmediateSave = () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      commitSave();
    };

    window.addEventListener('offline', handleImmediateSave);
    window.addEventListener('beforeunload', handleImmediateSave);

    return () => {
      window.removeEventListener('offline', handleImmediateSave);
      window.removeEventListener('beforeunload', handleImmediateSave);
      // Do not persist pre-restoration defaults during hydration or early unmount.
      if (hasLoadedDraft) handleImmediateSave();
    };
  }, [commitSave, hasLoadedDraft]);

  // Manual save trigger
  const saveDraftNow = useCallback(() => {
    if (!hasLoadedDraft) return false;
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    return commitSave();
  }, [commitSave, hasLoadedDraft]);

  // Clear draft from storage and reset values to defaults
  const clearDraft = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    removeDraftFromStorage(key);
    setValues(defaultValues);
    setLastSavedAt(null);
    setHasSavedDraft(false);
    setIsRestored(false);
    setSaveStatus('cleared');
  }, [key, defaultValues]);

  const formattedLastSaved = formatDraftTimestamp(lastSavedAt);

  // Status message computation
  let statusMessage = '';
  if (!isOnline) {
    statusMessage = 'Offline Mode — Draft safely preserved in localStorage';
  } else if (saveStatus === 'saving') {
    statusMessage = 'Saving draft...';
  } else if (saveStatus === 'saved' && formattedLastSaved) {
    statusMessage = `Draft auto-saved locally (${formattedLastSaved})`;
  } else if (saveStatus === 'restored' && formattedLastSaved) {
    statusMessage = `Restored unsaved draft (${formattedLastSaved})`;
  } else if (saveStatus === 'cleared') {
    statusMessage = 'Draft cleared — reset to default template';
  } else if (hasSavedDraft && formattedLastSaved) {
    statusMessage = `Draft saved (${formattedLastSaved})`;
  }

  return {
    values,
    setValues,
    updateField,
    saveDraftNow,
    clearDraft,
    lastSavedAt,
    formattedLastSaved,
    isOnline,
    isRestored,
    hasSavedDraft,
    isDirty,
    saveStatus,
    statusMessage,
  };
}
