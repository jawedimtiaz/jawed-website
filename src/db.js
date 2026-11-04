import { useEffect, useState, useCallback } from 'react';
import * as dbCore from './db/db';

export const DB_NAME = 'MoneyManagerDB';
export const ALT_DB_NAME = dbCore.DB_NAME;
export const DB_VERSION = dbCore.DB_VERSION;

export const BACKUP_STORAGE_KEY = 'money_manager_last_backup_date';
export const BACKUP_DUE_DAYS = 30;

/**
 * Automatically requests storage persistence via navigator.storage.persist()
 * so the browser does not evict IndexedDB records under disk pressure.
 */
export async function enableStoragePersistence() {
  if (typeof navigator !== 'undefined' && navigator.storage && typeof navigator.storage.persist === 'function') {
    try {
      const persisted = await navigator.storage.persist();
      return persisted;
    } catch (err) {
      console.warn('[StorageManager] Failed to request persistent storage:', err);
      return false;
    }
  }
  return false;
}

/**
 * Checks whether persistent storage is currently granted by the browser.
 */
export async function isStoragePersisted() {
  if (typeof navigator !== 'undefined' && navigator.storage && typeof navigator.storage.persisted === 'function') {
    try {
      return await navigator.storage.persisted();
    } catch (err) {
      console.warn('[StorageManager] Failed to query persistent storage state:', err);
      return false;
    }
  }
  return false;
}

/**
 * React hook that automatically calls navigator.storage.persist() on mount
 * and provides real-time persistence status.
 */
export function useStoragePersistence() {
  const [isPersisted, setIsPersisted] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  const checkAndRequest = useCallback(async () => {
    setIsChecking(true);
    try {
      let active = await isStoragePersisted();
      if (!active) {
        active = await enableStoragePersistence();
      }
      setIsPersisted(Boolean(active));
    } catch (e) {
      setIsPersisted(false);
    } finally {
      setIsChecking(false);
    }
  }, []);

  useEffect(() => {
    checkAndRequest();
  }, [checkAndRequest]);

  return { isPersisted, isChecking, requestPersistence: checkAndRequest };
}

const memStorage = new Map();

function getStorage() {
  if (typeof globalThis !== 'undefined' && globalThis.localStorage) {
    return globalThis.localStorage;
  }
  return {
    getItem: (key) => memStorage.get(key) || null,
    setItem: (key, val) => memStorage.set(key, String(val)),
    removeItem: (key) => memStorage.delete(key),
    clear: () => memStorage.clear(),
  };
}

/**
 * Reads the timestamp of the last recorded JSON backup from storage.
 */
export function getLastBackupDate() {
  return getStorage().getItem(BACKUP_STORAGE_KEY);
}

/**
 * Updates the timestamp of the last recorded JSON backup in storage to now.
 */
export function recordBackupTaken(dateIso = new Date().toISOString()) {
  getStorage().setItem(BACKUP_STORAGE_KEY, dateIso);
}

/**
 * Clears the recorded backup timestamp (useful for testing or resetting).
 */
export function clearBackupDate() {
  getStorage().removeItem(BACKUP_STORAGE_KEY);
}

/**
 * Calculates how many days have elapsed since the last backup.
 * Returns null if no backup has ever been taken.
 */
export function getDaysSinceLastBackup() {
  const lastIso = getLastBackupDate();
  if (!lastIso) return null;
  const lastTime = new Date(lastIso).getTime();
  if (Number.isNaN(lastTime)) return null;
  const elapsedMs = Math.max(0, Date.now() - lastTime);
  return Math.floor(elapsedMs / (1000 * 60 * 60 * 24));
}

/**
 * Determines whether the 30-day backup alert should be triggered.
 */
export function shouldShowBackupAlert(thresholdDays = BACKUP_DUE_DAYS) {
  const days = getDaysSinceLastBackup();
  if (days === null) return true; // Never backed up
  return days >= thresholdDays;
}

/**
 * One-click helper that exports the entire database, triggers a browser file download,
 * and resets the 30-day backup timer.
 */
export async function downloadBackupJson(customFilename) {
  const payload = await dbCore.exportDatabaseBackup();
  const dateStr = new Date().toISOString().slice(0, 10);
  const fileName = customFilename || `MoneyManager_Backup_${dateStr}.json`;

  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);

  recordBackupTaken();
  return payload;
}

// Re-export full database engine functions & seed data
export const {
  INITIAL_ACCOUNTS,
  INITIAL_CATEGORIES,
  INITIAL_TRANSACTIONS,
  INITIAL_SINKING_FUNDS,
  INITIAL_RECURRING_RULES,
  SAMPLE_RECEIPT_DATA_URL,
  initializeAndSeedDatabase,
  resetDatabaseToDefaults,
  getAllLedgerState,
  getAllAccounts,
  getAllTransactions,
  saveTransaction,
  deleteTransaction,
  saveAccount,
  deleteAccount,
  saveCategory,
  deleteCategory,
  saveSinkingFund,
  deleteSinkingFund,
  saveRecurringRule,
  deleteRecurringRule,
  processDueRecurringRules,
  syncRecurringTransactionsForMonth,
  triggerRecurringRuleNow,
  computeNextRecurringDate,
  exportDatabaseBackup,
  restoreDatabaseBackup,
  bulkImportTransactions,
  calculateAccountSummaries,
  calculateMonthlyMetrics,
  calculateCategoryBreakdown,
  calculateSixMonthTrend,
  formatINR,
  attachReceiptToTransaction,
  removeReceiptFromTransaction,
} = dbCore;

export default {
  DB_NAME,
  DB_VERSION,
  enableStoragePersistence,
  isStoragePersisted,
  useStoragePersistence,
  getLastBackupDate,
  recordBackupTaken,
  getDaysSinceLastBackup,
  shouldShowBackupAlert,
  downloadBackupJson,
  ...dbCore,
};
