import React, { useRef, useState, useEffect } from 'react';
import { Upload, Download } from 'lucide-react';
import {
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  signInWithPopup,
  type Auth,
  type User,
} from 'firebase/auth';
import { firebaseConfig, categorizeGoogleAuthError } from '../../lib/firebase';

if (!firebaseConfig.apiKey) {
  console.error('Firebase API Key is missing. Check your Vite environment variables.');
}
import {
  MoneyManager,
  MONEY_MANAGER_SEO,
  SCOPES,
  DRIVE_APPDATA_SCOPE,
  getMoneyManagerAuth,
  setCachedGoogleAccessToken,
  checkGoogleRedirectResult,
  createGoogleDriveAuthProvider,
  googleDriveSignIn,
  bulkImportTransactions,
  BackupRestoreModal,
  formatTransactionsToCsv,
  formatLedgerTransactionsToParityCsv,
  downloadMoneyManagerCsv,
  exportTransactionsCsvFromDb,
  generateBulkLedgerCsvExport,
  exportBulkLedgerHistoryCsvFromDb,
  exportIndexedDbLedgerToCsv,
  downloadLedgerFromIndexedDbAsCsv,
  flattenTransactionsForCsvExport,
  exportIndexedDbTransactionsToCsv,
  CsvImportModal,
  CsvImportFeedbackBanner,
  parseCsvText,
  autoDetectCsvMapping,
  mapCsvRowsToTransactions,
  bulkImportCsvToLedger,
  bulkImportCsvFileToLedger,
  summarizeMappedCsvTransactions,
  normalizeBankDateToIso,
  isRealCalendarDate,
  isValidIsoYyyyMmDdDate,
  isValidBankDateInput,
  isValidCsvAmountInput,
  buildCsvValidationErrorToast,
  validateCsvRowServerSchema,
  validateCsvServerSide,
  validateCsvMandatoryColumns,
  validateCsvRows,
  validateAndParseCsvText,
  MANDATORY_CSV_COLUMNS,
  buildCsvImportFeedback,
  buildTransactionFingerprint,
  isDuplicateCsvTransaction,
  SAMPLE_BANK_STATEMENT_CSV,
  SAMPLE_CSV_FILENAME,
  downloadSampleCsvTemplate,
  RecurringHistoricalProjectionCard,
  computeRecurringAndHistoricalSpendingProjection,
  normalizeRecurringRuleToMonthlyAmount,
  RollingThreeMonthTrendCard,
  computeRollingThreeMonthTrend,
  computeSpendingCardProgress,
  computeCategorySpendingCardProgressList,
  BudgetVsActualSummaryCard,
  computeBudgetVsActualSummary,
  calculateCategoryBudgetVariance,
  type BudgetVsActualCategoryItem,
  type BudgetVsActualSummary,
  type BudgetVsActualSummaryCardProps,
  type CsvMandatoryColumnName,
  type CsvRowValidationError,
  type CsvValidationReport,
  type ServerSideRowValidationResult,
  type ServerSideCsvValidationResult,
  type CsvImportFeedbackStatus,
  type CsvImportFeedbackState,
  type CsvImportFeedbackBannerProps,
} from '../../tools/MoneyManager';
import { CategoryManager } from '../../components/money-manager/CategoryManager';
import {
  saveCategory as dbSaveCategory,
  getAllCategories,
  type MoneyCategory,
} from '../../db/db';

/**
 * Saves or updates a category's monthly budget limit in IndexedDB.
 */
async function saveCategoryBudgetLimit(
  categoryIdOrName: string,
  monthlyBudget: number | undefined
): Promise<MoneyCategory> {
  const all = await getAllCategories();
  const category = all.find(
    (c) => c.id === categoryIdOrName || c.name === categoryIdOrName
  );
  if (!category) {
    throw new Error(`Category not found: ${categoryIdOrName}`);
  }
  const updated: MoneyCategory = {
    ...category,
    monthlyBudget:
      monthlyBudget !== undefined && Number(monthlyBudget) > 0
        ? Number(monthlyBudget)
        : undefined,
  };
  return await dbSaveCategory(updated);
}

const updateCategoryMonthlyBudget = saveCategoryBudgetLimit;

interface CategoryBudgetLimitSettingRowProps {
  category: MoneyCategory;
  onBudgetUpdated?: (updated: MoneyCategory) => void;
  className?: string;
}

const CategoryBudgetLimitSettingRow: React.FC<CategoryBudgetLimitSettingRowProps> = ({
  category,
  onBudgetUpdated,
  className = '',
}) => {
  const [val, setVal] = useState<string>(
    category.monthlyBudget !== undefined ? String(category.monthlyBudget) : ''
  );
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    setVal(category.monthlyBudget !== undefined ? String(category.monthlyBudget) : '');
  }, [category.monthlyBudget]);

  const handleChange = async (newVal: string) => {
    setVal(newVal);
    const parsed = Math.max(0, Number.parseFloat(newVal) || 0);
    const updated = await saveCategoryBudgetLimit(
      category.id,
      parsed > 0 ? parsed : undefined
    );
    onBudgetUpdated?.(updated);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  return (
    <div
      className={`inline-flex items-center gap-2 ${className}`}
      data-testid={`category-budget-setting-row-${category.name}`}
    >
      <label
        htmlFor={`cat-budget-input-${category.id}`}
        className="text-xs text-slate-300 font-medium"
      >
        Monthly Budget (₹):
      </label>
      <input
        id={`cat-budget-input-${category.id}`}
        type="number"
        min="0"
        step="500"
        placeholder="e.g. 5000"
        value={val}
        onChange={(e) => handleChange(e.target.value)}
        className="w-24 px-2.5 py-1 rounded-lg border border-slate-700 bg-slate-800 text-xs font-semibold text-slate-100 text-right focus:outline-none focus:ring-1 focus:ring-indigo-500"
        aria-label={`Monthly budget limit for ${category.name}`}
        data-testid={`mm-category-budget-limit-input-${category.name}`}
      />
      {isSaved && (
        <span className="text-[10px] text-emerald-400 font-semibold">
          Saved to IndexedDB
        </span>
      )}
    </div>
  );
};


export interface DirectCsvImportFileInputProps {
  defaultMonth?: string;
  onImportComplete?: (importedTransactions: any[]) => void;
  onError?: (errorMessage: string) => void;
}

export const DirectCsvImportFileInput: React.FC<DirectCsvImportFileInputProps> = ({
  onImportComplete,
  onError,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [, setTransactions] = useState<any[]>([]);

  const saveTransactionsToDb = async (items: any[]) => {
    await bulkImportTransactions(items, { skipDuplicates: false });
  };

  const handleCsvFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        if (!text || text.trim().length === 0) {
          onError?.('The selected file is empty.');
          return;
        }

        // Split lines and handle Windows (\r\n) & Unix (\n) line breaks
        const rawLines = text
          .split(/\r?\n/)
          .map((l) => l.trim())
          .filter((l) => l.length > 0);
        if (rawLines.length < 2) {
          onError?.('CSV must contain at least a header row and one transaction row.');
          return;
        }

        // Parse headers
        const headers = rawLines[0]
          .split(',')
          .map((h) => h.replace(/^["']|["']$/g, '').trim().toLowerCase());

        const dateIdx = headers.findIndex((h) => h.includes('date'));
        const typeIdx = headers.findIndex((h) => h.includes('type'));
        const catIdx = headers.findIndex((h) => h.includes('category') || h.includes('cat'));
        const amtIdx = headers.findIndex(
          (h) =>
            h.includes('amount') ||
            h.includes('val') ||
            h.includes('inr') ||
            h.includes('total') ||
            h.includes('amt')
        );
        const descIdx = headers.findIndex(
          (h) =>
            h.includes('desc') ||
            h.includes('note') ||
            h.includes('detail') ||
            h.includes('narrative') ||
            h.includes('narration') ||
            h.includes('particular')
        );
        const methodIdx = headers.findIndex(
          (h) =>
            h.includes('method') ||
            h.includes('mode') ||
            h.includes('account') ||
            h.includes('bank') ||
            h.includes('payment')
        );

        if (amtIdx === -1) {
          onError?.("CSV format error: Missing 'Amount' column. Please check the sample format.");
          return;
        }

        const importedTransactions: any[] = [];

        for (let i = 1; i < rawLines.length; i++) {
          // Regex to parse comma-separated values while respecting quotes
          const cols = rawLines[i]
            .split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/)
            .map((c) => c.replace(/^["']|["']$/g, '').trim());
          if (cols.length < 2) continue;

          const rawAmount = cols[amtIdx] ? cols[amtIdx].replace(/[^0-9.-]/g, '') : '0';
          const parsedAmount = Math.abs(parseFloat(rawAmount));
          if (isNaN(parsedAmount) || parsedAmount <= 0) continue;

          const rawDate =
            dateIdx !== -1 && cols[dateIdx]
              ? cols[dateIdx]
              : new Date().toISOString().split('T')[0];
          let validDate = rawDate;
          if (isNaN(new Date(validDate).getTime())) {
            validDate = new Date().toISOString().split('T')[0];
          }

          const rawType = typeIdx !== -1 && cols[typeIdx] ? cols[typeIdx].toLowerCase() : '';
          const itemType =
            rawType.includes('inc') || rawType.includes('cr') ? 'Income' : 'Expense';

          const itemCategory = catIdx !== -1 && cols[catIdx] ? cols[catIdx] : 'Other';
          const itemDesc =
            descIdx !== -1 && cols[descIdx] ? cols[descIdx] : 'Imported CSV item';
          const itemMethod =
            methodIdx !== -1 && cols[methodIdx] ? cols[methodIdx] : 'Bank Transfer';

          importedTransactions.push({
            id:
              typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
                ? crypto.randomUUID()
                : `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            date: validDate,
            type: itemType,
            accountId: 'acc-icici',
            category: itemCategory,
            subCategory: itemMethod,
            fixedOrVariable: 'Variable',
            amount: parsedAmount,
            note: itemDesc,
            description: itemDesc,
            paymentMethod: itemMethod,
            receiptImages: [],
            isAnomaly: false,
            createdAt: new Date().toISOString(),
          });
        }

        if (importedTransactions.length === 0) {
          onError?.(
            'No valid transactions found in the CSV. Please check the date and amount values.'
          );
          return;
        }

        // Update React State immediately
        setTransactions((prev: any[]) => [...importedTransactions, ...prev]);

        // Save into IndexedDB helper
        if (typeof saveTransactionsToDb === 'function') {
          await saveTransactionsToDb(importedTransactions);
        }

        onImportComplete?.(importedTransactions);
      } catch (err: any) {
        console.error('CSV Import Failure:', err);
        onError?.(`Error reading CSV: ${err?.message || 'Unknown error'}`);
      } finally {
        // Clear input so selecting the same file again triggers onChange
        e.target.value = '';
      }
    };

    reader.onerror = () => {
      onError?.('Browser error: Unable to read the selected file.');
      e.target.value = '';
    };

    reader.readAsText(file);
  };

  const handleDownloadSampleCsv = () => {
    const sampleData = `Date,Type,Category,Amount,Description,Payment Method
2026-11-01,Expense,Food & Dining,450.00,Client lunch,Credit Card
2026-11-02,Expense,Workplace & Tools,1200.00,Network cable tester,Bank Transfer
2026-11-05,Income,Freelance / Consulting,15000.00,IT Field dispatch payout,UPI`;

    const blob = new Blob([sampleData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'jawed-money-manager-sample.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="inline-flex items-center gap-2">
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={handleCsvFileUpload}
      />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-800 text-xs text-slate-200 hover:bg-slate-700 hover:text-white transition"
      >
        <Upload className="w-4 h-4 text-sky-400" />
        <span>Import CSV</span>
      </button>
      <button
        type="button"
        onClick={handleDownloadSampleCsv}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-800 text-xs text-slate-200 hover:bg-slate-700 hover:text-white transition"
      >
        <Download className="w-4 h-4 text-emerald-400" />
        <span>Download Sample CSV</span>
      </button>
    </div>
  );
};

export interface GoogleSignInHandlerOptions {
  auth?: Auth | null;
  setUser?: (user: User) => void;
  setSyncError?: (error: string | null) => void;
  setIsSyncing?: (syncing: boolean) => void;
}

/**
 * Robust Google Sign-In handler that executes popup sign-in with scope and clear error categorization.
 */
const handleGoogleSignIn = async (options?: GoogleSignInHandlerOptions) => {
  const auth = options?.auth ?? getMoneyManagerAuth();
  options?.setSyncError?.(null);
  options?.setIsSyncing?.(true);

  try {
    const provider = new GoogleAuthProvider();
    provider.addScope('https://www.googleapis.com/auth/drive.appdata');
    provider.setCustomParameters({ prompt: 'select_account' });

    if (!auth) {
      throw new Error('Firebase Auth is not available.');
    }

    const result = await signInWithPopup(auth, provider);
    if (result.user) {
      options?.setUser?.(result.user);
      // proceed with Drive sync
      return result.user;
    }
  } catch (err: any) {
    console.error('Google Auth Error:', err);

    if (err.code === 'auth/network-request-failed') {
      options?.setSyncError?.(
        'Network connection failed. This usually occurs if an ad-blocker / strict tracking prevention is blocking Google Identity endpoints, or if you are offline. Please disable ad-blockers for this domain and try again.'
      );
    } else if (err.code === 'auth/popup-blocked') {
      options?.setSyncError?.(
        'Popup was blocked by your browser. Please allow popups for jawed.co.in to sign in.'
      );
    } else if (err.code === 'auth/popup-closed-by-user') {
      options?.setSyncError?.('Sign-in popup was closed before completion.');
    } else {
      options?.setSyncError?.(err.message || 'Failed to sign in with Google.');
    }
    throw err;
  } finally {
    options?.setIsSyncing?.(false);
  }
};

/**
 * Hook providing reactive state and wrapped handleGoogleSignIn handler for Cloud Sync modals.
 */
function useGoogleAuthModalSync() {
  const [user, setUser] = useState<User | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const auth = getMoneyManagerAuth();

  const handleSignIn = async () => {
    setSyncError(null);
    setIsSyncing(true);

    try {
      const provider = new GoogleAuthProvider();
      provider.addScope('https://www.googleapis.com/auth/drive.appdata');
      provider.setCustomParameters({ prompt: 'select_account' });

      if (!auth) {
        throw new Error('Firebase Auth is not available.');
      }

      const result = await signInWithPopup(auth, provider);
      if (result.user) {
        setUser(result.user);
        // proceed with Drive sync
      }
    } catch (err: any) {
      console.error('Google Auth Error:', err);

      if (err.code === 'auth/network-request-failed') {
        setSyncError(
          'Network connection failed. This usually occurs if an ad-blocker / strict tracking prevention is blocking Google Identity endpoints, or if you are offline. Please disable ad-blockers for this domain and try again.'
        );
      } else if (err.code === 'auth/popup-blocked') {
        setSyncError(
          'Popup was blocked by your browser. Please allow popups for jawed.co.in to sign in.'
        );
      } else if (err.code === 'auth/popup-closed-by-user') {
        setSyncError('Sign-in popup was closed before completion.');
      } else {
        setSyncError(err.message || 'Failed to sign in with Google.');
      }
    } finally {
      setIsSyncing(false);
    }
  };

  return {
    user,
    setUser,
    syncError,
    setSyncError,
    isSyncing,
    setIsSyncing,
    handleGoogleSignIn: handleSignIn,
  };
}

export {
  MoneyManager,
  MONEY_MANAGER_SEO,
  SCOPES,
  DRIVE_APPDATA_SCOPE,
  getMoneyManagerAuth,
  setCachedGoogleAccessToken,
  checkGoogleRedirectResult,
  createGoogleDriveAuthProvider,
  googleDriveSignIn,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  signInWithPopup,
  handleGoogleSignIn,
  useGoogleAuthModalSync,
  firebaseConfig,
  categorizeGoogleAuthError,
  bulkImportTransactions,
  BackupRestoreModal,
  formatTransactionsToCsv,
  formatLedgerTransactionsToParityCsv,
  downloadMoneyManagerCsv,
  exportTransactionsCsvFromDb,
  generateBulkLedgerCsvExport,
  exportBulkLedgerHistoryCsvFromDb,
  exportIndexedDbLedgerToCsv,
  downloadLedgerFromIndexedDbAsCsv,
  flattenTransactionsForCsvExport,
  exportIndexedDbTransactionsToCsv,
  CsvImportModal,
  CsvImportFeedbackBanner,
  parseCsvText,
  autoDetectCsvMapping,
  mapCsvRowsToTransactions,
  bulkImportCsvToLedger,
  bulkImportCsvFileToLedger,
  summarizeMappedCsvTransactions,
  normalizeBankDateToIso,
  isRealCalendarDate,
  isValidIsoYyyyMmDdDate,
  isValidBankDateInput,
  isValidCsvAmountInput,
  buildCsvValidationErrorToast,
  validateCsvRowServerSchema,
  validateCsvServerSide,
  validateCsvMandatoryColumns,
  validateCsvRows,
  validateAndParseCsvText,
  MANDATORY_CSV_COLUMNS,
  buildCsvImportFeedback,
  buildTransactionFingerprint,
  isDuplicateCsvTransaction,
  SAMPLE_BANK_STATEMENT_CSV,
  SAMPLE_CSV_FILENAME,
  downloadSampleCsvTemplate,
  RecurringHistoricalProjectionCard,
  computeRecurringAndHistoricalSpendingProjection,
  normalizeRecurringRuleToMonthlyAmount,
  RollingThreeMonthTrendCard,
  computeRollingThreeMonthTrend,
  computeSpendingCardProgress,
  computeCategorySpendingCardProgressList,
  BudgetVsActualSummaryCard,
  computeBudgetVsActualSummary,
  calculateCategoryBudgetVariance,
  CategoryManager,
  saveCategoryBudgetLimit,
  updateCategoryMonthlyBudget,
  CategoryBudgetLimitSettingRow,
};
export type {
  CsvMandatoryColumnName,
  CsvRowValidationError,
  CsvValidationReport,
  ServerSideRowValidationResult,
  ServerSideCsvValidationResult,
  CsvImportFeedbackStatus,
  CsvImportFeedbackState,
  CsvImportFeedbackBannerProps,
  BudgetVsActualCategoryItem,
  BudgetVsActualSummary,
  BudgetVsActualSummaryCardProps,
  CategoryBudgetLimitSettingRowProps,
};
export default MoneyManager;
