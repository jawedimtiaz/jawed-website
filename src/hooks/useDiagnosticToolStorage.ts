import { useState, useEffect, useRef, useCallback } from 'react';
import { useOnlineStatus } from './useOnlineStatus';

export const DIAGNOSTIC_STORAGE_PREFIX = 'diagnostic_tool_draft_';
export const DEFAULT_PERIODIC_AUTOSAVE_MS = 5000;

export interface DiagnosticDraftEnvelope<T> {
  data: T;
  savedAt: number;
  version?: number;
  toolId: string;
}

export interface UseDiagnosticToolStorageOptions<T> {
  /**
   * Unique identifier or route path for the diagnostic tool (e.g. 'ipv4-subnet-calculator' or '/tools/ticket-to-knowledge-base-draft')
   */
  toolId: string;
  /**
   * Default fallback values
   */
  defaultValues: T;
  /**
   * Schema version number
   */
  version?: number;
  /**
   * Delay in milliseconds before saving after an input change
   */
  autoSaveDelayMs?: number;
  /**
   * Periodic auto-save interval in milliseconds (defaults to 5000ms / 5s)
   */
  periodicAutoSaveIntervalMs?: number;
  /**
   * Storage prefix override if needed
   */
  prefix?: string;
}

export interface UseDiagnosticToolStorageResult<T> {
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
  storageKey: string;
}

/**
 * Normalizes a route path or tool name into a clean storage key
 */
export function getDiagnosticStorageKey(toolId: string, prefix = DIAGNOSTIC_STORAGE_PREFIX): string {
  const sanitized = toolId
    .trim()
    .replace(/^\/+|\/+$/g, '')
    .replace(/^tools\//, '')
    .replace(/[^a-zA-Z0-9_-]/g, '_');
  return `${prefix}${sanitized}`;
}

/**
 * Formats a unix timestamp into a readable localized time string
 */
export function formatDiagnosticTimestamp(timestamp: number | null): string {
  if (!timestamp) return '';
  try {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch {
    return '';
  }
}

/**
 * Safely writes diagnostic tool draft data to localStorage
 */
export function saveDiagnosticFormDraft<T>(
  toolId: string,
  data: T,
  version = 1,
  prefix = DIAGNOSTIC_STORAGE_PREFIX
): number | null {
  if (typeof window === 'undefined' || !window.localStorage) {
    return null;
  }

  try {
    const key = getDiagnosticStorageKey(toolId, prefix);
    const savedAt = Date.now();
    const envelope: DiagnosticDraftEnvelope<T> = {
      data,
      savedAt,
      version,
      toolId,
    };
    window.localStorage.setItem(key, JSON.stringify(envelope));
    return savedAt;
  } catch (err) {
    console.warn(`[useDiagnosticToolStorage] Failed to write draft for "${toolId}":`, err);
    return null;
  }
}

/**
 * Safely loads diagnostic tool draft data from localStorage
 */
export function loadDiagnosticFormDraft<T>(
  toolId: string,
  defaultValues: T,
  prefix = DIAGNOSTIC_STORAGE_PREFIX
): { data: T; savedAt: number | null; isStored: boolean; version?: number } {
  if (typeof window === 'undefined' || !window.localStorage) {
    return { data: defaultValues, savedAt: null, isStored: false };
  }

  try {
    const key = getDiagnosticStorageKey(toolId, prefix);
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return { data: defaultValues, savedAt: null, isStored: false };
    }

    const parsed = JSON.parse(raw);

    // Support enveloped structure
    if (parsed && typeof parsed === 'object' && 'data' in parsed && 'savedAt' in parsed) {
      const envelope = parsed as DiagnosticDraftEnvelope<T>;
      return {
        data: typeof defaultValues === 'object' && defaultValues !== null && !Array.isArray(defaultValues)
          ? { ...defaultValues, ...envelope.data }
          : (envelope.data as T),
        savedAt: typeof envelope.savedAt === 'number' ? envelope.savedAt : null,
        isStored: true,
        version: envelope.version,
      };
    }

    // Direct object support
    if (parsed && typeof parsed === 'object') {
      return {
        data: typeof defaultValues === 'object' && defaultValues !== null && !Array.isArray(defaultValues)
          ? { ...defaultValues, ...(parsed as T) }
          : (parsed as T),
        savedAt: Date.now(),
        isStored: true,
      };
    }

    return { data: defaultValues, savedAt: null, isStored: false };
  } catch (err) {
    console.warn(`[useDiagnosticToolStorage] Failed to read draft for "${toolId}":`, err);
    return { data: defaultValues, savedAt: null, isStored: false };
  }
}

/**
 * Safely removes diagnostic tool draft from localStorage
 */
export function clearDiagnosticFormDraft(toolId: string, prefix = DIAGNOSTIC_STORAGE_PREFIX): boolean {
  if (typeof window === 'undefined' || !window.localStorage) {
    return false;
  }

  try {
    const key = getDiagnosticStorageKey(toolId, prefix);
    window.localStorage.removeItem(key);
    return true;
  } catch (err) {
    console.warn(`[useDiagnosticToolStorage] Failed to remove draft for "${toolId}":`, err);
    return false;
  }
}

/**
 * Lists all currently saved diagnostic tool drafts in localStorage
 */
export function listAllDiagnosticDrafts(prefix = DIAGNOSTIC_STORAGE_PREFIX): Array<{
  key: string;
  toolId: string;
  savedAt: number | null;
  sizeBytes: number;
}> {
  if (typeof window === 'undefined' || !window.localStorage) {
    return [];
  }

  const drafts: Array<{ key: string; toolId: string; savedAt: number | null; sizeBytes: number }> = [];

  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key && key.startsWith(prefix)) {
        const raw = window.localStorage.getItem(key);
        if (raw) {
          let savedAt: number | null = null;
          let toolId = key.slice(prefix.length);
          try {
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === 'object' && 'savedAt' in parsed) {
              savedAt = parsed.savedAt;
            }
            if (parsed && typeof parsed === 'object' && parsed.toolId) {
              toolId = parsed.toolId;
            }
          } catch {
            // Unparseable
          }
          drafts.push({
            key,
            toolId,
            savedAt,
            sizeBytes: raw.length,
          });
        }
      }
    }
  } catch (err) {
    console.warn('[useDiagnosticToolStorage] Failed to enumerate storage drafts:', err);
  }

  return drafts;
}

/**
 * React hook providing state management, auto-save debouncing, offline preservation,
 * and restore notifications for any diagnostic tool form.
 */
export function useDiagnosticToolStorage<T extends Record<string, any>>({
  toolId,
  defaultValues,
  version = 1,
  autoSaveDelayMs = 400,
  periodicAutoSaveIntervalMs = DEFAULT_PERIODIC_AUTOSAVE_MS,
  prefix = DIAGNOSTIC_STORAGE_PREFIX,
}: UseDiagnosticToolStorageOptions<T>): UseDiagnosticToolStorageResult<T> {
  const isOnline = useOnlineStatus();
  const storageKey = getDiagnosticStorageKey(toolId, prefix);

  // Read initial data from localStorage
  const [initialState] = useState(() => loadDiagnosticFormDraft(toolId, defaultValues, prefix));
  const [values, setValues] = useState<T>(initialState.data);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(initialState.savedAt);
  const [isRestored, setIsRestored] = useState<boolean>(initialState.isStored);
  const [hasSavedDraft, setHasSavedDraft] = useState<boolean>(initialState.isStored);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'restored' | 'cleared'>(
    initialState.isStored ? 'restored' : 'idle'
  );

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const valuesRef = useRef<T>(values);
  valuesRef.current = values;
  const lastSavedJsonRef = useRef<string>(JSON.stringify(initialState.data));

  // Track if current values differ from default values
  const isDirty = JSON.stringify(values) !== JSON.stringify(defaultValues);

  // Commit current values to storage immediately
  const commitSave = useCallback(() => {
    const timestamp = saveDiagnosticFormDraft(toolId, valuesRef.current, version, prefix);
    if (timestamp !== null) {
      lastSavedJsonRef.current = JSON.stringify(valuesRef.current);
      setLastSavedAt(timestamp);
      setHasSavedDraft(true);
      setSaveStatus('saved');
      return true;
    }
    return false;
  }, [toolId, version, prefix]);

  // Update a single property
  const updateField = useCallback(<K extends keyof T>(field: K, value: T[K]) => {
    setValues((prev) => ({
      ...prev,
      [field]: value,
    }));
  }, []);

  // Debounced auto-save on value changes
  useEffect(() => {
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
  }, [values, autoSaveDelayMs, commitSave]);

  // Immediate save on connection drop (offline event), pagehide, or window beforeunload
  useEffect(() => {
    const handleImmediateFlush = () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      commitSave();
    };

    window.addEventListener('offline', handleImmediateFlush);
    window.addEventListener('beforeunload', handleImmediateFlush);
    window.addEventListener('pagehide', handleImmediateFlush);

    return () => {
      window.removeEventListener('offline', handleImmediateFlush);
      window.removeEventListener('beforeunload', handleImmediateFlush);
      window.removeEventListener('pagehide', handleImmediateFlush);
      handleImmediateFlush();
    };
  }, [commitSave]);

  // Periodic auto-save every 5 seconds (5000ms) to ensure continuous background persistence
  useEffect(() => {
    if (!periodicAutoSaveIntervalMs || periodicAutoSaveIntervalMs <= 0) return;

    const intervalId = setInterval(() => {
      const currentJson = JSON.stringify(valuesRef.current);
      if (currentJson !== lastSavedJsonRef.current) {
        commitSave();
      }
    }, periodicAutoSaveIntervalMs);

    return () => clearInterval(intervalId);
  }, [periodicAutoSaveIntervalMs, commitSave]);

  // Force manual immediate save
  const saveDraftNow = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    return commitSave();
  }, [commitSave]);

  // Clear draft and revert values back to default
  const clearDraft = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    clearDiagnosticFormDraft(toolId, prefix);
    setValues(defaultValues);
    setLastSavedAt(null);
    setHasSavedDraft(false);
    setIsRestored(false);
    setSaveStatus('cleared');
  }, [toolId, prefix, defaultValues]);

  const formattedLastSaved = formatDiagnosticTimestamp(lastSavedAt);

  let statusMessage = '';
  if (!isOnline) {
    statusMessage = 'Offline Mode — Form progress safely stored in localStorage';
  } else if (saveStatus === 'saving') {
    statusMessage = 'Saving draft...';
  } else if (saveStatus === 'saved' && formattedLastSaved) {
    statusMessage = `Draft auto-saved locally (${formattedLastSaved})`;
  } else if (saveStatus === 'restored' && formattedLastSaved) {
    statusMessage = `Restored unsaved draft (${formattedLastSaved})`;
  } else if (saveStatus === 'cleared') {
    statusMessage = 'Draft cleared — reset to defaults';
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
    storageKey,
  };
}

/**
 * Options for the DOM-level auto-persist hook
 */
export interface AutoPersistFormOptions {
  toolId?: string;
  autoSaveDelayMs?: number;
  periodicAutoSaveIntervalMs?: number;
  prefix?: string;
  ignoreTypes?: string[];
}

/**
 * Extracts a robust key/identifier from a form control element
 */
export function getElementIdentifier(el: HTMLElement, index: number): string {
  const formElement = el as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
  if (formElement.name && formElement.name.trim().length > 0) {
    return formElement.name.trim();
  }
  if (formElement.id && formElement.id.trim().length > 0) {
    return formElement.id.trim();
  }
  const dataField = formElement.getAttribute('data-field') || formElement.getAttribute('data-testid');
  if (dataField && dataField.trim().length > 0) {
    return dataField.trim();
  }
  return `input_${el.tagName.toLowerCase()}_${index}`;
}

/**
 * DOM-level auto persistence hook that discovers and saves all form controls
 * (input, textarea, select) within a referenced container without requiring explicit state wiring.
 */
export function useAutoPersistForm(
  containerRef: React.RefObject<HTMLElement | null>,
  options: AutoPersistFormOptions = {}
) {
  const toolId = options.toolId || (typeof window !== 'undefined' ? window.location.pathname : 'default_tool');
  const prefix = options.prefix || `${DIAGNOSTIC_STORAGE_PREFIX}dom_`;
  const autoSaveDelayMs = options.autoSaveDelayMs ?? 400;
  const periodicAutoSaveIntervalMs = options.periodicAutoSaveIntervalMs ?? DEFAULT_PERIODIC_AUTOSAVE_MS;
  const isOnline = useOnlineStatus();

  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [isRestored, setIsRestored] = useState<boolean>(false);
  const [hasDraft, setHasDraft] = useState<boolean>(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedSnapshotJsonRef = useRef<string>('');

  // Serializes all inputs inside container into a key-value record
  const serializeInputs = useCallback((): Record<string, string | boolean | number> => {
    const container = containerRef.current;
    if (!container) return {};

    const values: Record<string, string | boolean | number> = {};
    const elements = container.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
      'input, textarea, select'
    );

    elements.forEach((el, idx) => {
      // Skip password, file, submit, button, and hidden inputs
      if (el instanceof HTMLInputElement) {
        const type = (el.type || '').toLowerCase();
        if (['password', 'file', 'submit', 'button', 'reset', 'image'].includes(type)) {
          return;
        }
        if (type === 'checkbox') {
          values[getElementIdentifier(el, idx)] = el.checked;
          return;
        }
        if (type === 'radio') {
          if (el.checked) {
            values[getElementIdentifier(el, idx)] = el.value;
          }
          return;
        }
        values[getElementIdentifier(el, idx)] = el.value;
        return;
      }

      if (el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) {
        values[getElementIdentifier(el, idx)] = el.value;
      }
    });

    return values;
  }, [containerRef]);

  // Restores saved values into DOM elements
  const restoreInputs = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const stored = loadDiagnosticFormDraft<Record<string, any>>(toolId, {}, prefix);
    if (!stored.isStored || !stored.data || Object.keys(stored.data).length === 0) {
      return;
    }

    const elements = container.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
      'input, textarea, select'
    );

    let restoredAny = false;

    elements.forEach((el, idx) => {
      const identifier = getElementIdentifier(el, idx);
      if (!(identifier in stored.data)) return;

      const val = stored.data[identifier];

      if (el instanceof HTMLInputElement) {
        const type = (el.type || '').toLowerCase();
        if (['password', 'file', 'submit', 'button', 'reset', 'image'].includes(type)) {
          return;
        }
        if (type === 'checkbox') {
          el.checked = Boolean(val);
          restoredAny = true;
          el.dispatchEvent(new Event('change', { bubbles: true }));
          return;
        }
        if (type === 'radio') {
          if (el.value === String(val)) {
            el.checked = true;
            restoredAny = true;
            el.dispatchEvent(new Event('change', { bubbles: true }));
          }
          return;
        }
        el.value = String(val ?? '');
        restoredAny = true;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        return;
      }

      if (el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) {
        el.value = String(val ?? '');
        restoredAny = true;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });

    if (restoredAny) {
      setIsRestored(true);
      setHasDraft(true);
      setLastSavedAt(stored.savedAt);
    }
  }, [containerRef, toolId, prefix]);

  // Saves current snapshot to localStorage
  const saveSnapshot = useCallback(() => {
    const data = serializeInputs();
    if (Object.keys(data).length > 0) {
      const saved = saveDiagnosticFormDraft(toolId, data, 1, prefix);
      if (saved) {
        lastSavedSnapshotJsonRef.current = JSON.stringify(data);
        setLastSavedAt(saved);
        setHasDraft(true);
      }
    }
  }, [serializeInputs, toolId, prefix]);

  // Periodic auto-save every 5 seconds (5000ms)
  useEffect(() => {
    if (!periodicAutoSaveIntervalMs || periodicAutoSaveIntervalMs <= 0) return;

    const intervalId = setInterval(() => {
      const currentData = serializeInputs();
      const currentJson = JSON.stringify(currentData);
      if (Object.keys(currentData).length > 0 && currentJson !== lastSavedSnapshotJsonRef.current) {
        saveSnapshot();
      }
    }, periodicAutoSaveIntervalMs);

    return () => clearInterval(intervalId);
  }, [periodicAutoSaveIntervalMs, serializeInputs, saveSnapshot]);

  // Clear saved inputs
  const clearSavedInputs = useCallback(() => {
    clearDiagnosticFormDraft(toolId, prefix);
    setHasDraft(false);
    setIsRestored(false);
    setLastSavedAt(null);
  }, [toolId, prefix]);

  // Auto-restore on mount
  useEffect(() => {
    // Short timeout to allow initial render of form components
    const timer = setTimeout(() => {
      restoreInputs();
    }, 50);
    return () => clearTimeout(timer);
  }, [restoreInputs]);

  // Listen to input and change events inside container
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleChangeOrInput = (e: Event) => {
      const target = e.target as HTMLElement;
      if (!target || !['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) {
        return;
      }

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(() => {
        saveSnapshot();
      }, autoSaveDelayMs);
    };

    container.addEventListener('input', handleChangeOrInput, { capture: true });
    container.addEventListener('change', handleChangeOrInput, { capture: true });

    return () => {
      container.removeEventListener('input', handleChangeOrInput, { capture: true });
      container.removeEventListener('change', handleChangeOrInput, { capture: true });
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [containerRef, autoSaveDelayMs, saveSnapshot]);

  // Flush on offline or pagehide/beforeunload
  useEffect(() => {
    const handleFlush = () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      saveSnapshot();
    };

    window.addEventListener('offline', handleFlush);
    window.addEventListener('beforeunload', handleFlush);
    window.addEventListener('pagehide', handleFlush);

    return () => {
      window.removeEventListener('offline', handleFlush);
      window.removeEventListener('beforeunload', handleFlush);
      window.removeEventListener('pagehide', handleFlush);
      handleFlush();
    };
  }, [saveSnapshot]);

  return {
    clearSavedInputs,
    saveSnapshot,
    restoreInputs,
    isRestored,
    hasDraft,
    lastSavedAt,
    formattedLastSaved: formatDiagnosticTimestamp(lastSavedAt),
    isOnline,
  };
}
