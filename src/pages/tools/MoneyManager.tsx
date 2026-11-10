import React, { useRef, useState } from 'react';
import { Upload, Download } from 'lucide-react';
import {
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
} from 'firebase/auth';
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
  type CsvMandatoryColumnName,
  type CsvRowValidationError,
  type CsvValidationReport,
  type ServerSideRowValidationResult,
  type ServerSideCsvValidationResult,
  type CsvImportFeedbackStatus,
  type CsvImportFeedbackState,
  type CsvImportFeedbackBannerProps,
} from '../../tools/MoneyManager';

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
};
export default MoneyManager;
