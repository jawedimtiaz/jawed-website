export const AUTOSYNC_FREQUENCY_STORAGE_KEY = 'jawed_autosync_frequency_v1';

export type AutoSyncFrequency = '5s' | '15s' | '30s' | '1m' | '5m' | 'manual';

export interface AutoSyncOption {
  id: AutoSyncFrequency;
  label: string;
  intervalMs: number;
}

export const AUTOSYNC_OPTIONS: AutoSyncOption[] = [
  { id: '5s', label: 'Every 5 Seconds (Real-time)', intervalMs: 5000 },
  { id: '15s', label: 'Every 15 Seconds', intervalMs: 15000 },
  { id: '30s', label: 'Every 30 Seconds', intervalMs: 30000 },
  { id: '1m', label: 'Every 1 Minute', intervalMs: 60000 },
  { id: '5m', label: 'Every 5 Minutes', intervalMs: 300000 },
  { id: 'manual', label: 'Manual Only (No Auto-sync)', intervalMs: 0 },
];

export function getStoredAutoSyncFrequency(): AutoSyncFrequency {
  if (typeof window === 'undefined') return '5s';
  try {
    const val = localStorage.getItem(AUTOSYNC_FREQUENCY_STORAGE_KEY) as AutoSyncFrequency;
    if (AUTOSYNC_OPTIONS.some(opt => opt.id === val)) {
      return val;
    }
  } catch {
    // ignore
  }
  return '5s';
}

export function setStoredAutoSyncFrequency(freq: AutoSyncFrequency) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(AUTOSYNC_FREQUENCY_STORAGE_KEY, freq);
    window.dispatchEvent(new CustomEvent('autosync-frequency-changed', { detail: freq }));
  } catch {
    // ignore
  }
}

export function getAutoSyncIntervalMs(): number {
  const freq = getStoredAutoSyncFrequency();
  const found = AUTOSYNC_OPTIONS.find(opt => opt.id === freq);
  return found ? found.intervalMs : 5000;
}
