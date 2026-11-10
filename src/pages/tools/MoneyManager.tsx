import React, { useRef } from 'react';
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
  onImportComplete?: (result: Awaited<ReturnType<typeof bulkImportCsvToLedger>>) => void;
  onError?: (errorMessage: string) => void;
}

export const DirectCsvImportFileInput: React.FC<DirectCsvImportFileInputProps> = ({
  defaultMonth,
  onImportComplete,
  onError,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCsvFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const result = await bulkImportCsvFileToLedger(file, { defaultMonth });
      onImportComplete?.(result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to import CSV file.';
      onError?.(msg);
    } finally {
      e.target.value = '';
    }
  };

  return (
    <input
      ref={fileInputRef}
      type="file"
      accept=".csv,text/csv"
      className="hidden"
      onChange={handleCsvFileUpload}
    />
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
