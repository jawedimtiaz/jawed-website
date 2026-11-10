import {
  bulkImportTransactions,
  getAllLedgerState,
  FALLBACK_RATES_TO_INR,
  normalizeCurrencyCode,
  type AccountSummary,
  type CurrencyCode,
  type FixedOrVariable,
  type MoneyCategory,
  type MoneyTransaction,
  type TransactionType,
} from '../../db/db';
import { predictTransactionCategory } from './mlCategorizer';

export const MANDATORY_CSV_COLUMNS = ['Date', 'Amount', 'Description'] as const;
export type CsvMandatoryColumnName = (typeof MANDATORY_CSV_COLUMNS)[number];

export interface CsvRowValidationError {
  rowNumber: number;
  csvLineNumber: number;
  missingOrInvalidFields: CsvMandatoryColumnName[];
  message: string;
  rawRow: Record<string, string>;
}

export interface CsvValidationReport {
  isValid: boolean;
  hasMandatoryColumns: boolean;
  missingColumns: CsvMandatoryColumnName[];
  columnErrorMessage: string | null;
  validRows: Record<string, string>[];
  malformedRows: CsvRowValidationError[];
  rowErrorMessages: string[];
  summaryErrorMessage: string | null;
  errorToastMessage?: string | null;
}

export interface ServerSideRowValidationResult {
  isValid: boolean;
  rowNumber: number;
  csvLineNumber: number;
  missingOrInvalidFields: CsvMandatoryColumnName[];
  errors: string[];
  errorMessage: string | null;
  normalizedRow: {
    date: string;
    amount: number;
    description: string;
  } | null;
}

export interface ServerSideCsvValidationResult {
  isValid: boolean;
  hasMandatoryColumns: boolean;
  missingColumns: CsvMandatoryColumnName[];
  validRows: Record<string, string>[];
  invalidRows: CsvRowValidationError[];
  rowResults: ServerSideRowValidationResult[];
  errorToastMessage: string | null;
}

export interface ParsedCsvResult {
  headers: string[];
  rows: Record<string, string>[];
}

export interface CsvColumnMapping {
  dateColumn: string;
  amountColumn: string;
  debitColumn: string;
  creditColumn: string;
  typeColumn: string;
  categoryColumn: string;
  subCategoryColumn: string;
  noteColumn: string;
  accountColumn: string;
  toAccountColumn: string;
  currencyColumn?: string;
}

export interface CsvMappingOptions {
  defaultAccountId: string;
  defaultToAccountId?: string;
  defaultCategory?: string;
  defaultMonth?: string; // YYYY-MM
  accounts: AccountSummary[];
  categories: MoneyCategory[];
  historicalTransactions?: MoneyTransaction[];
  skipDuplicates?: boolean;
  strictValidation?: boolean;
  onMalformedRow?: (error: CsvRowValidationError) => void;
}

export interface BulkCsvImportSummaryMetrics {
  totalCount: number;
  incomeCount: number;
  incomeTotal: number;
  expenseCount: number;
  expenseTotal: number;
  transferCount: number;
  transferTotal: number;
}

export type CsvImportFeedbackStatus = 'idle' | 'processing' | 'success' | 'warning' | 'error';

export interface CsvImportFeedbackState {
  status: CsvImportFeedbackStatus;
  progressPercent: number;
  totalRows: number;
  importedCount: number;
  failedValidationCount: number;
  skippedDuplicateCount: number;
  title: string;
  message: string;
  validationErrors: string[];
  timestamp: string;
}

export interface BulkCsvImportLedgerResult {
  importedTransactions: MoneyTransaction[];
  parsedRowCount: number;
  skippedRowCount: number;
  columnMapping: CsvColumnMapping;
  summary: BulkCsvImportSummaryMetrics;
  validation?: CsvValidationReport;
  malformedRows?: CsvRowValidationError[];
  errorMessage?: string | null;
  feedback?: CsvImportFeedbackState;
}

export function buildCsvImportFeedback(params: {
  totalRows: number;
  importedCount: number;
  failedValidationCount: number;
  skippedDuplicateCount?: number;
  validationErrors?: string[];
  progressPercent?: number;
  isProcessing?: boolean;
  customErrorMessage?: string | null;
}): CsvImportFeedbackState {
  const totalRows = Math.max(0, Number(params.totalRows) || 0);
  const importedCount = Math.max(0, Number(params.importedCount) || 0);
  const failedValidationCount = Math.max(0, Number(params.failedValidationCount) || 0);
  const skippedDuplicateCount = Math.max(0, Number(params.skippedDuplicateCount) || 0);
  const validationErrors = Array.isArray(params.validationErrors) ? params.validationErrors : [];
  const progressPercent =
    typeof params.progressPercent === 'number'
      ? Math.min(100, Math.max(0, Math.round(params.progressPercent)))
      : params.isProcessing
      ? 55
      : 100;

  let status: CsvImportFeedbackStatus = 'success';
  let title = 'CSV Import Complete';
  let message = '';

  if (params.isProcessing) {
    status = 'processing';
    title = 'Importing CSV Transactions...';
    message = `Validating and importing ${totalRows} CSV row(s) (${progressPercent}%)...`;
  } else if (params.customErrorMessage && importedCount === 0) {
    status = 'error';
    title = 'CSV Import Validation Failed';
    message = `${params.customErrorMessage} (0 records imported, ${failedValidationCount} row(s) failed validation).`;
  } else if (importedCount === 0 && failedValidationCount > 0) {
    status = 'error';
    title = 'CSV Import Validation Failed';
    message = `0 records imported — ${failedValidationCount} of ${totalRows} row(s) failed validation. ${
      validationErrors[0] || ''
    }`.trim();
  } else if (importedCount > 0 && failedValidationCount > 0) {
    status = 'warning';
    title = 'CSV Imported with Validation Warnings';
    const dupPart =
      skippedDuplicateCount > 0 ? `, ${skippedDuplicateCount} duplicate(s) skipped` : '';
    message = `Successfully imported ${importedCount} record(s); ${failedValidationCount} row(s) failed validation${dupPart}.`;
  } else if (importedCount > 0) {
    status = 'success';
    title = 'CSV Import Successful';
    const dupPart =
      skippedDuplicateCount > 0 ? ` (${skippedDuplicateCount} duplicate row(s) skipped)` : '';
    message = `Successfully imported ${importedCount} record(s) into ledger (0 failed validation)${dupPart}.`;
  } else {
    status = skippedDuplicateCount > 0 ? 'warning' : 'error';
    title = skippedDuplicateCount > 0 ? 'No New Records Imported' : 'CSV Import Failed';
    message =
      skippedDuplicateCount > 0
        ? `0 new records imported — ${skippedDuplicateCount} duplicate row(s) skipped (0 failed validation).`
        : '0 records imported. Please verify Date, Amount, and Description columns.';
  }

  return {
    status,
    progressPercent,
    totalRows,
    importedCount,
    failedValidationCount,
    skippedDuplicateCount,
    title,
    message,
    validationErrors,
    timestamp: new Date().toISOString(),
  };
}

export const SAMPLE_BANK_STATEMENT_CSV = `Date,Narration,Withdrawal Amt.,Deposit Amt.,Category,Bank
2026-11-16,UPI/Swiggy Instamart Fresh Groceries,845,,Food & Groceries,ICICI
2026-11-17,NEFT/Client Consulting Retainer Milestone,,24500,Freelance & Consulting,SBI
2026-11-18,ACH/BESCOM Electricity Utility Bill,2180,,Utilities & Broadband,ICICI
2026-11-19,POS/Apollo Pharmacy Medicines,640,,Medical & Health,UBI
2026-11-21,IMPS/Self Transfer ICICI to SBI Reserve,10000,,Transfer,ICICI`;

/**
 * Parses raw CSV text into headers and key-value row objects.
 * Supports RFC-4180 quoted values, commas inside quotes, escaped quotes (""), and CRLF/LF newlines.
 */
export function parseCsvText(csvContent: string): ParsedCsvResult {
  const cleaned = String(csvContent || '').replace(/^\uFEFF/, '').trim();
  if (!cleaned) {
    return { headers: [], rows: [] };
  }

  const rawRows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < cleaned.length; i += 1) {
    const char = cleaned[i];
    const nextChar = cleaned[i + 1];

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        currentField += '"';
        i += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        currentField += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      currentRow.push(currentField.trim());
      currentField = '';
    } else if (char === '\r' && nextChar === '\n') {
      currentRow.push(currentField.trim());
      if (currentRow.some((cell) => cell.length > 0)) {
        rawRows.push(currentRow);
      }
      currentRow = [];
      currentField = '';
      i += 1;
    } else if (char === '\n' || char === '\r') {
      currentRow.push(currentField.trim());
      if (currentRow.some((cell) => cell.length > 0)) {
        rawRows.push(currentRow);
      }
      currentRow = [];
      currentField = '';
    } else {
      currentField += char;
    }
  }

  currentRow.push(currentField.trim());
  if (currentRow.some((cell) => cell.length > 0)) {
    rawRows.push(currentRow);
  }

  if (rawRows.length === 0) {
    return { headers: [], rows: [] };
  }

  const headers = rawRows[0].map((h, idx) => h || `Column_${idx + 1}`);
  const rows: Record<string, string>[] = [];

  for (let r = 1; r < rawRows.length; r += 1) {
    const values = rawRows[r];
    if (values.every((val) => !val)) continue;
    const rowRecord: Record<string, string> = {};
    for (let c = 0; c < headers.length; c += 1) {
      rowRecord[headers[c]] = values[c] ?? '';
    }
    rows.push(rowRecord);
  }

  return { headers, rows };
}

/**
 * Automatically detects column mapping from bank statement CSV headers.
 */
export function autoDetectCsvMapping(headers: string[]): CsvColumnMapping {
  const findHeader = (patterns: RegExp[]): string => {
    for (const pattern of patterns) {
      const match = headers.find((h) => pattern.test(h.trim()));
      if (match) return match;
    }
    return '';
  };

  return {
    dateColumn: findHeader([
      /^date$/i,
      /txn\s*date/i,
      /transaction\s*date/i,
      /value\s*date/i,
      /posting\s*date/i,
      /date/i,
    ]),
    amountColumn: findHeader([
      /^amount$/i,
      /amount\s*\(inr\)/i,
      /txn\s*amount/i,
      /transaction\s*amount/i,
      /^amt$/i,
      /amount/i,
      /^value$/i,
      /^total$/i,
      /^price$/i,
      /^cost$/i,
      /^paid$/i,
    ]),
    debitColumn: findHeader([
      /withdrawal/i,
      /^debit/i,
      /debit\s*amt/i,
      /^dr$/i,
      /outflow/i,
      /spent/i,
    ]),
    creditColumn: findHeader([
      /deposit/i,
      /^credit/i,
      /credit\s*amt/i,
      /^cr$/i,
      /inflow/i,
      /received/i,
    ]),
    typeColumn: findHeader([
      /^type$/i,
      /txn\s*type/i,
      /transaction\s*type/i,
      /dr\s*\/\s*cr/i,
      /^cr\/dr$/i,
    ]),
    categoryColumn: findHeader([/^category$/i, /expense\s*category/i, /category/i]),
    subCategoryColumn: findHeader([/sub[-_\s]*category/i, /merchant/i, /payee/i]),
    noteColumn: findHeader([
      /narration/i,
      /description/i,
      /particulars/i,
      /remarks/i,
      /^note$/i,
      /notes/i,
      /memo/i,
      /details/i,
      /title/i,
    ]),
    accountColumn: findHeader([
      /^account$/i,
      /^bank$/i,
      /account\s*\/\s*bank/i,
      /source\s*account/i,
      /bank\s*account/i,
      /payment\s*method/i,
      /^method$/i,
      /^mode$/i,
      /payment/i,
    ]),
    toAccountColumn: findHeader([
      /target\s*account/i,
      /to\s*account/i,
      /transfer\s*to/i,
    ]),
  };
}

const MONTH_LOOKUP: Record<string, string> = {
  jan: '01',
  feb: '02',
  mar: '03',
  apr: '04',
  may: '05',
  jun: '06',
  jul: '07',
  aug: '08',
  sep: '09',
  oct: '10',
  nov: '11',
  dec: '12',
};

/**
 * Normalizes common bank statement date formats into `YYYY-MM-DDTHH:mm`.
 */
export function normalizeBankDateToIso(rawDate: string, fallbackMonth = '2026-11'): string {
  const clean = String(rawDate || '').trim();
  if (!clean) return `${fallbackMonth}-01T12:00`;

  // Already ISO YYYY-MM-DDTHH:mm
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(clean)) {
    return clean.slice(0, 16);
  }

  // YYYY-MM-DD HH:mm or YYYY/MM/DD HH:mm
  if (/^\d{4}[/-]\d{2}[/-]\d{2}\s+\d{2}:\d{2}/.test(clean)) {
    return clean.replace(/\//g, '-').replace(/\s+/, 'T').slice(0, 16);
  }

  // YYYY-MM-DD or YYYY/MM/DD
  if (/^\d{4}[/-]\d{2}[/-]\d{2}$/.test(clean)) {
    return `${clean.replace(/\//g, '-')}T12:00`;
  }

  // DD/MM/YYYY, DD-MM-YYYY, DD/MM/YY, or DD-MM-YY
  const dmyMatch = clean.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/);
  if (dmyMatch) {
    const first = Number.parseInt(dmyMatch[1], 10);
    const second = Number.parseInt(dmyMatch[2], 10);
    const rawYear = dmyMatch[3];
    const year = rawYear.length === 2 ? `20${rawYear}` : rawYear;
    // Assume DD/MM/YYYY for Indian bank statements unless second > 12
    const day = second > 12 ? second : first;
    const month = second > 12 ? first : second;
    const mm = String(Math.min(12, Math.max(1, month))).padStart(2, '0');
    const dd = String(Math.min(31, Math.max(1, day))).padStart(2, '0');
    return `${year}-${mm}-${dd}T12:00`;
  }

  // DD MMM YYYY or DD-MMM-YY (e.g. 16 Nov 2026, 16-Nov-2026, 16-Nov-26)
  const textMonthMatch = clean.match(/^(\d{1,2})[\s-]+([A-Za-z]{3,})[\s,-]+(\d{2,4})/);
  if (textMonthMatch) {
    const day = String(Number.parseInt(textMonthMatch[1], 10)).padStart(2, '0');
    const monKey = textMonthMatch[2].slice(0, 3).toLowerCase();
    const mm = MONTH_LOOKUP[monKey] || '11';
    const rawYear = textMonthMatch[3];
    const year = rawYear.length === 2 ? `20${rawYear}` : rawYear;
    return `${year}-${mm}-${day}T12:00`;
  }

  // MMM DD, YYYY (e.g. Nov 16, 2026)
  const mdyTextMatch = clean.match(/^([A-Za-z]{3,})\s+(\d{1,2}),?\s+(\d{4})/);
  if (mdyTextMatch) {
    const monKey = mdyTextMatch[1].slice(0, 3).toLowerCase();
    const mm = MONTH_LOOKUP[monKey] || '11';
    const day = String(Number.parseInt(mdyTextMatch[2], 10)).padStart(2, '0');
    const year = mdyTextMatch[3];
    return `${year}-${mm}-${day}T12:00`;
  }

  return `${fallbackMonth}-01T12:00`;
}

/**
 * Validates whether a given year, month, and day form a real calendar date (including leap years).
 */
export function isRealCalendarDate(year: number, month: number, day: number): boolean {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return false;
  }
  if (year < 1900 || year > 2100 || month < 1 || month > 12 || day < 1) {
    return false;
  }
  const isLeapYear = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  const daysInMonth = [31, isLeapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return day <= daysInMonth[month - 1];
}

/**
 * Strictly validates that a date string is formatted as `YYYY-MM-DD` (with optional ISO time suffix)
 * and represents a real calendar date.
 */
export function isValidIsoYyyyMmDdDate(rawDate: string | undefined): boolean {
  const clean = String(rawDate || '').trim();
  if (!clean) return false;

  const match = clean.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s]\d{2}:\d{2}(?::\d{2})?)?$/);
  if (!match) return false;

  const year = Number.parseInt(match[1], 10);
  const month = Number.parseInt(match[2], 10);
  const day = Number.parseInt(match[3], 10);
  return isRealCalendarDate(year, month, day);
}

/**
 * Strictly validates whether a raw CSV date string is a recognizable, valid bank calendar date.
 */
export function isValidBankDateInput(rawDate: string | undefined): boolean {
  const clean = String(rawDate || '').trim();
  if (!clean) return false;

  // ISO YYYY-MM-DDTHH:mm or YYYY-MM-DD HH:mm or YYYY/MM/DD
  const isoMatch = clean.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})(?:[T\s]+\d{1,2}:\d{2}(?::\d{2})?)?$/);
  if (isoMatch) {
    const year = Number.parseInt(isoMatch[1], 10);
    const month = Number.parseInt(isoMatch[2], 10);
    const day = Number.parseInt(isoMatch[3], 10);
    return isRealCalendarDate(year, month, day);
  }

  // DD/MM/YYYY, DD-MM-YYYY, DD/MM/YY, or DD-MM-YY
  const dmyMatch = clean.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})(?:\s+\d{1,2}:\d{2}(?::\d{2})?)?$/);
  if (dmyMatch) {
    const first = Number.parseInt(dmyMatch[1], 10);
    const second = Number.parseInt(dmyMatch[2], 10);
    const rawYear = dmyMatch[3];
    const year = Number.parseInt(rawYear.length === 2 ? `20${rawYear}` : rawYear, 10);
    const day = second > 12 ? second : first;
    const month = second > 12 ? first : second;
    return isRealCalendarDate(year, month, day);
  }

  // DD MMM YYYY or DD-MMM-YY (e.g. 16 Nov 2026, 16-Nov-2026, 16-Nov-26)
  const textMonthMatch = clean.match(/^(\d{1,2})[\s-]+([A-Za-z]{3,})[\s,-]+(\d{2,4})$/);
  if (textMonthMatch) {
    const day = Number.parseInt(textMonthMatch[1], 10);
    const monKey = textMonthMatch[2].slice(0, 3).toLowerCase();
    const mm = MONTH_LOOKUP[monKey];
    if (!mm) return false;
    const rawYear = textMonthMatch[3];
    const year = Number.parseInt(rawYear.length === 2 ? `20${rawYear}` : rawYear, 10);
    return isRealCalendarDate(year, Number.parseInt(mm, 10), day);
  }

  // MMM DD, YYYY (e.g. Nov 16, 2026)
  const mdyTextMatch = clean.match(/^([A-Za-z]{3,})\s+(\d{1,2}),?\s+(\d{4})$/);
  if (mdyTextMatch) {
    const monKey = mdyTextMatch[1].slice(0, 3).toLowerCase();
    const mm = MONTH_LOOKUP[monKey];
    if (!mm) return false;
    const day = Number.parseInt(mdyTextMatch[2], 10);
    const year = Number.parseInt(mdyTextMatch[3], 10);
    return isRealCalendarDate(year, Number.parseInt(mm, 10), day);
  }

  return false;
}

function parseCurrencyNumber(raw: string | undefined): number {
  if (!raw) return 0;
  const cleaned = String(raw)
    .replace(/[₹$,€£¥\s]/g, '')
    .replace(/\(([\d.]+)\)/, '-$1')
    .replace(/[^\d.-]/g, '');
  const parsed = Number.parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Strictly validates whether a raw CSV amount cell is a valid non-zero numeric currency value
 * (and rejects malformed alphabetic strings like "abc" or "N/A").
 */
export function isValidCsvAmountInput(rawAmount: string | undefined): boolean {
  const clean = String(rawAmount || '').trim();
  if (!clean) return false;

  // Strip currency symbols/codes, whitespace, commas, parentheses, and trailing CR/DR markers
  const stripped = clean
    .replace(/\b(INR|USD|EUR|GBP|AED|SGD|JPY|CAD|AUD|CR|DR)\b/gi, '')
    .replace(/[₹$,€£¥\s]/g, '')
    .replace(/^\(([-+]?\d+(?:\.\d+)?)\)$/, '-$1')
    .trim();

  if (!/^[-+]?(?:\d+\.?\d*|\.\d+)$/.test(stripped)) {
    return false;
  }

  const numeric = Number.parseFloat(stripped);
  return Number.isFinite(numeric) && Math.abs(numeric) > 0;
}

/**
 * Builds a user-friendly error toast message for CSV rows failing server-side-like validation checks
 * (YYYY-MM-DD dates, numeric amounts, and non-empty descriptions).
 */
export function buildCsvValidationErrorToast(
  malformedRows: CsvRowValidationError[],
  columnErrorMessage?: string | null
): string | null {
  if (columnErrorMessage) {
    return `CSV Validation Error: ${columnErrorMessage}`;
  }
  if (!malformedRows || malformedRows.length === 0) {
    return null;
  }
  const preview = malformedRows
    .slice(0, 2)
    .map((item) => item.message)
    .join(' ');
  const moreSuffix =
    malformedRows.length > 2 ? ` (+${malformedRows.length - 2} more invalid row(s))` : '';
  return `CSV Validation Error (${malformedRows.length} row(s) failed): ${preview}${moreSuffix}`;
}

/**
 * Server-side-like schema validator for a single CSV row.
 * Ensures that the row contains:
 * 1. Properly formatted Date (`YYYY-MM-DD` by default, or recognizable bank date when `strictIsoDateOnly: false`)
 * 2. Numeric non-zero Amount
 * 3. Non-empty Description
 */
export function validateCsvRowServerSchema(
  row: Record<string, string>,
  rowNumber: number,
  mapping: CsvColumnMapping,
  options?: { strictIsoDateOnly?: boolean }
): ServerSideRowValidationResult {
  const strictIsoDateOnly = options?.strictIsoDateOnly ?? true;
  const csvLineNumber = rowNumber + 1;
  const missingOrInvalidFields: CsvMandatoryColumnName[] = [];
  const errors: string[] = [];

  // 1. Validate Date (YYYY-MM-DD)
  const rawDate = (row[mapping.dateColumn] || '').trim();
  if (!rawDate) {
    missingOrInvalidFields.push('Date');
    errors.push('Date is missing (required format: YYYY-MM-DD)');
  } else if (strictIsoDateOnly ? !isValidIsoYyyyMmDdDate(rawDate) : !isValidBankDateInput(rawDate)) {
    missingOrInvalidFields.push('Date');
    errors.push(
      strictIsoDateOnly
        ? `Date "${rawDate}" is invalid (expected YYYY-MM-DD)`
        : `Date "${rawDate}" is invalid (expected YYYY-MM-DD or DD/MM/YYYY)`
    );
  }

  // 2. Validate numeric Amount
  const rawSingleAmt = mapping.amountColumn ? (row[mapping.amountColumn] || '').trim() : '';
  const rawDebitAmt = mapping.debitColumn ? (row[mapping.debitColumn] || '').trim() : '';
  const rawCreditAmt = mapping.creditColumn ? (row[mapping.creditColumn] || '').trim() : '';

  const hasValidSingle = rawSingleAmt ? isValidCsvAmountInput(rawSingleAmt) : false;
  const hasValidDebit = rawDebitAmt ? isValidCsvAmountInput(rawDebitAmt) : false;
  const hasValidCredit = rawCreditAmt ? isValidCsvAmountInput(rawCreditAmt) : false;

  const hasMalformedSingle = Boolean(rawSingleAmt && !hasValidSingle);
  const hasMalformedDebit = Boolean(rawDebitAmt && !hasValidDebit);
  const hasMalformedCredit = Boolean(rawCreditAmt && !hasValidCredit);

  if (
    (!hasValidSingle && !hasValidDebit && !hasValidCredit) ||
    (hasMalformedSingle && !hasValidDebit && !hasValidCredit) ||
    (hasMalformedDebit && !hasValidCredit && !hasValidSingle) ||
    (hasMalformedCredit && !hasValidDebit && !hasValidSingle)
  ) {
    missingOrInvalidFields.push('Amount');
    const badValue = rawSingleAmt || rawDebitAmt || rawCreditAmt;
    if (!badValue) {
      errors.push('Amount is missing (must be a non-zero number)');
    } else {
      errors.push(`Amount "${badValue}" is not a valid non-zero number`);
    }
  }

  // 3. Validate non-empty Description
  const rawDescription = (row[mapping.noteColumn] || '').trim();
  if (!rawDescription) {
    missingOrInvalidFields.push('Description');
    errors.push('Description is missing (must be non-empty)');
  }

  const isValid = missingOrInvalidFields.length === 0;
  const errorMessage = isValid
    ? null
    : `Row ${rowNumber} (line ${csvLineNumber}): Invalid or missing ${missingOrInvalidFields.join(
        ', '
      )} — ${errors.join('; ')}.`;

  let numericAmount = 0;
  if (hasValidSingle) {
    numericAmount = parseCurrencyNumber(rawSingleAmt);
  } else if (hasValidDebit) {
    numericAmount = -Math.abs(parseCurrencyNumber(rawDebitAmt));
  } else if (hasValidCredit) {
    numericAmount = Math.abs(parseCurrencyNumber(rawCreditAmt));
  }

  return {
    isValid,
    rowNumber,
    csvLineNumber,
    missingOrInvalidFields,
    errors,
    errorMessage,
    normalizedRow: isValid
      ? {
          date: normalizeBankDateToIso(rawDate).slice(0, 10),
          amount: numericAmount,
          description: rawDescription,
        }
      : null,
  };
}

/**
 * Validates that the CSV headers / column mapping include all mandatory columns:
 * Date, Amount (single Amount or split Debit/Credit), and Description (Narration / Note).
 */
export function validateCsvMandatoryColumns(
  headers: string[],
  customMapping?: Partial<CsvColumnMapping>
): {
  hasMandatoryColumns: boolean;
  missingColumns: CsvMandatoryColumnName[];
  columnErrorMessage: string | null;
  resolvedMapping: CsvColumnMapping;
} {
  const normalizedHeaders = headers
    .map((h) => String(h || '').trim())
    .filter((h) => h.length > 0 && !/^Column_\d+$/.test(h));
  const headerSet = new Set(normalizedHeaders);
  const autoMap = autoDetectCsvMapping(normalizedHeaders);
  const resolvedMapping: CsvColumnMapping = {
    ...autoMap,
    ...(customMapping || {}),
  };

  const hasDateCol = Boolean(
    resolvedMapping.dateColumn && headerSet.has(resolvedMapping.dateColumn)
  );
  const hasAmountCol = Boolean(
    (resolvedMapping.amountColumn && headerSet.has(resolvedMapping.amountColumn)) ||
      (resolvedMapping.debitColumn && headerSet.has(resolvedMapping.debitColumn)) ||
      (resolvedMapping.creditColumn && headerSet.has(resolvedMapping.creditColumn))
  );
  const hasDescriptionCol = Boolean(
    resolvedMapping.noteColumn && headerSet.has(resolvedMapping.noteColumn)
  );

  const missingColumns: CsvMandatoryColumnName[] = [];
  if (!hasDateCol) missingColumns.push('Date');
  if (!hasAmountCol) missingColumns.push('Amount');
  if (!hasDescriptionCol) missingColumns.push('Description');

  const hasMandatoryColumns = missingColumns.length === 0;
  const columnErrorMessage = hasMandatoryColumns
    ? null
    : `Missing mandatory CSV column(s): ${missingColumns.join(
        ', '
      )}. Please ensure your CSV includes Date, Amount (or Withdrawal/Deposit), and Description (or Narration) headers.`;

  return {
    hasMandatoryColumns,
    missingColumns,
    columnErrorMessage,
    resolvedMapping,
  };
}

/**
 * Strictly validates parsed CSV rows against mandatory columns (Date, Amount, Description)
 * and returns a structured report with helpful per-row error messages and an error toast string for any malformed rows.
 */
export function validateCsvRows(
  rows: Record<string, string>[],
  headers: string[],
  customMapping?: Partial<CsvColumnMapping>,
  options?: { strictIsoDateOnly?: boolean }
): CsvValidationReport {
  const {
    hasMandatoryColumns,
    missingColumns,
    columnErrorMessage,
    resolvedMapping,
  } = validateCsvMandatoryColumns(headers, customMapping);

  if (!hasMandatoryColumns) {
    const errorToastMessage = buildCsvValidationErrorToast([], columnErrorMessage);
    return {
      isValid: false,
      hasMandatoryColumns: false,
      missingColumns,
      columnErrorMessage,
      validRows: [],
      malformedRows: [],
      rowErrorMessages: columnErrorMessage ? [columnErrorMessage] : [],
      summaryErrorMessage: columnErrorMessage,
      errorToastMessage,
    };
  }

  const validRows: Record<string, string>[] = [];
  const malformedRows: CsvRowValidationError[] = [];
  const strictIsoDateOnly = options?.strictIsoDateOnly ?? false;

  rows.forEach((row, idx) => {
    const rowResult = validateCsvRowServerSchema(row, idx + 1, resolvedMapping, {
      strictIsoDateOnly,
    });
    if (!rowResult.isValid && rowResult.errorMessage) {
      malformedRows.push({
        rowNumber: rowResult.rowNumber,
        csvLineNumber: rowResult.csvLineNumber,
        missingOrInvalidFields: rowResult.missingOrInvalidFields,
        message: rowResult.errorMessage,
        rawRow: row,
      });
    } else {
      validRows.push(row);
    }
  });

  const rowErrorMessages = malformedRows.map((item) => item.message);
  let summaryErrorMessage: string | null = null;
  if (malformedRows.length > 0) {
    const preview = rowErrorMessages.slice(0, 3).join(' ');
    const moreSuffix =
      malformedRows.length > 3 ? ` (+${malformedRows.length - 3} more row(s))` : '';
    summaryErrorMessage = `Found ${malformedRows.length} malformed CSV row(s): ${preview}${moreSuffix}`;
  }

  const errorToastMessage = buildCsvValidationErrorToast(malformedRows, null);

  return {
    isValid: malformedRows.length === 0 && validRows.length > 0,
    hasMandatoryColumns: true,
    missingColumns: [],
    columnErrorMessage: null,
    validRows,
    malformedRows,
    rowErrorMessages,
    summaryErrorMessage,
    errorToastMessage,
  };
}

/**
 * Executes server-side-like validation across raw CSV text or parsed row objects,
 * enforcing YYYY-MM-DD formatted dates, numeric amounts, and non-empty descriptions,
 * and returning a user-friendly `errorToastMessage` when any row fails validation.
 */
export function validateCsvServerSide(
  csvInput: string | Record<string, string>[],
  customMapping?: Partial<CsvColumnMapping>,
  options?: { strictIsoDateOnly?: boolean; headers?: string[] }
): ServerSideCsvValidationResult {
  const strictIsoDateOnly = options?.strictIsoDateOnly ?? true;
  let headers: string[] = [];
  let rows: Record<string, string>[] = [];

  if (typeof csvInput === 'string') {
    const parsed = parseCsvText(csvInput);
    headers = parsed.headers;
    rows = parsed.rows;
  } else if (Array.isArray(csvInput)) {
    rows = csvInput;
    headers = options?.headers || (rows[0] ? Object.keys(rows[0]) : []);
  }

  const {
    hasMandatoryColumns,
    missingColumns,
    columnErrorMessage,
    resolvedMapping,
  } = validateCsvMandatoryColumns(headers, customMapping);

  if (!hasMandatoryColumns) {
    return {
      isValid: false,
      hasMandatoryColumns: false,
      missingColumns,
      validRows: [],
      invalidRows: [],
      rowResults: [],
      errorToastMessage: buildCsvValidationErrorToast([], columnErrorMessage),
    };
  }

  const validRows: Record<string, string>[] = [];
  const invalidRows: CsvRowValidationError[] = [];
  const rowResults: ServerSideRowValidationResult[] = [];

  rows.forEach((row, idx) => {
    const result = validateCsvRowServerSchema(row, idx + 1, resolvedMapping, {
      strictIsoDateOnly,
    });
    rowResults.push(result);
    if (result.isValid) {
      validRows.push(row);
    } else if (result.errorMessage) {
      invalidRows.push({
        rowNumber: result.rowNumber,
        csvLineNumber: result.csvLineNumber,
        missingOrInvalidFields: result.missingOrInvalidFields,
        message: result.errorMessage,
        rawRow: row,
      });
    }
  });

  return {
    isValid: invalidRows.length === 0 && validRows.length > 0,
    hasMandatoryColumns: true,
    missingColumns: [],
    validRows,
    invalidRows,
    rowResults,
    errorToastMessage: buildCsvValidationErrorToast(invalidRows, null),
  };
}

/**
 * Parses CSV text and executes strict mandatory-column and row-level validation.
 */
export function validateAndParseCsvText(
  csvContent: string,
  customMapping?: Partial<CsvColumnMapping>,
  options?: { strictIsoDateOnly?: boolean }
): ParsedCsvResult & { validation: CsvValidationReport } {
  const parsed = parseCsvText(csvContent);
  const validation = validateCsvRows(parsed.rows, parsed.headers, customMapping, options);
  return {
    ...parsed,
    validation,
  };
}

/**
 * Infers a category & sub-category from bank narration keywords and ML Naive Bayes priors
 * when no explicit category is present.
 */
function inferCategoryFromNarration(
  narration: string,
  txType: TransactionType,
  categories: MoneyCategory[],
  historicalTransactions?: MoneyTransaction[]
): { category: string; subCategory: string; fixedOrVariable: FixedOrVariable } {
  const prediction = predictTransactionCategory(narration, {
    txType,
    categories,
    historicalTransactions,
  });

  return {
    category: prediction.category,
    subCategory: prediction.subCategory,
    fixedOrVariable: prediction.fixedOrVariable,
  };
}

/**
 * Builds a normalized duplicate-detection fingerprint matching existing `date + amount + description` (note).
 */
export function buildTransactionFingerprint(tx: {
  date: string;
  amount: number;
  note?: string;
  description?: string;
}): string {
  const dateOnly = String(tx.date || '').slice(0, 10);
  const roundedAmt = Math.round(Math.abs(Number(tx.amount) || 0) * 100);
  const cleanDescription = String(tx.note ?? tx.description ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
  return `${dateOnly}|${roundedAmt}|${cleanDescription}`;
}

/**
 * Checks whether a candidate CSV transaction matches an existing transaction by `date + amount + description`.
 */
export function isDuplicateCsvTransaction(
  candidate: { date: string; amount: number; note?: string; description?: string },
  existingTransactions: Array<{ date: string; amount: number; note?: string; description?: string }>
): boolean {
  const candidateFp = buildTransactionFingerprint(candidate);
  return existingTransactions.some(
    (existing) => buildTransactionFingerprint(existing) === candidateFp
  );
}

/**
 * Computes summary metrics (income, expense, transfer counts and totals) for a list of mapped transactions.
 */
export function summarizeMappedCsvTransactions(
  mappedTransactions: Array<Pick<MoneyTransaction, 'type' | 'amount'>>
): BulkCsvImportSummaryMetrics {
  let incomeCount = 0;
  let incomeTotal = 0;
  let expenseCount = 0;
  let expenseTotal = 0;
  let transferCount = 0;
  let transferTotal = 0;

  for (const tx of mappedTransactions) {
    const amt = Number(tx.amount) || 0;
    if (tx.type === 'Income') {
      incomeCount += 1;
      incomeTotal += amt;
    } else if (tx.type === 'Expense') {
      expenseCount += 1;
      expenseTotal += amt;
    } else if (tx.type === 'Transfer') {
      transferCount += 1;
      transferTotal += amt;
    }
  }

  return {
    totalCount: mappedTransactions.length,
    incomeCount,
    incomeTotal,
    expenseCount,
    expenseTotal,
    transferCount,
    transferTotal,
  };
}

/**
 * Maps parsed CSV rows into validated MoneyTransaction inputs ready for bulk IndexedDB insertion.
 */
export function mapCsvRowsToTransactions(
  rows: Record<string, string>[],
  mapping: CsvColumnMapping,
  options: CsvMappingOptions
): Array<Omit<MoneyTransaction, 'id'> & { id?: string }> {
  const {
    defaultAccountId,
    defaultToAccountId,
    defaultCategory,
    defaultMonth = '2026-11',
    accounts,
    categories,
    historicalTransactions = [],
    skipDuplicates = true,
  } = options;

  const accountByName = new Map<string, string>();
  for (const acc of accounts) {
    accountByName.set(acc.name.toLowerCase(), acc.id);
    accountByName.set(acc.id.toLowerCase(), acc.id);
  }

  const existingFingerprints = new Set<string>();
  if (skipDuplicates && historicalTransactions.length > 0) {
    for (const hTx of historicalTransactions) {
      existingFingerprints.add(buildTransactionFingerprint(hTx));
    }
  }

  const results: Array<Omit<MoneyTransaction, 'id'> & { id?: string }> = [];

  const strictValidation = options.strictValidation ?? true;

  rows.forEach((row, rowIdx) => {
    const rawDate = mapping.dateColumn ? (row[mapping.dateColumn] || '').trim() : '';
    const rawNarration = mapping.noteColumn ? (row[mapping.noteColumn] || '').trim() : '';
    const rawSingleCell = mapping.amountColumn ? (row[mapping.amountColumn] || '').trim() : '';
    const rawDebitCell = mapping.debitColumn ? (row[mapping.debitColumn] || '').trim() : '';
    const rawCreditCell = mapping.creditColumn ? (row[mapping.creditColumn] || '').trim() : '';

    if (strictValidation) {
      const missingOrInvalidFields: CsvMandatoryColumnName[] = [];
      const reasons: string[] = [];

      if (mapping.dateColumn) {
        if (!rawDate) {
          missingOrInvalidFields.push('Date');
          reasons.push('Date is missing');
        } else if (!isValidBankDateInput(rawDate)) {
          missingOrInvalidFields.push('Date');
          reasons.push(`Date "${rawDate}" is invalid`);
        }
      }

      const validSingle = rawSingleCell ? isValidCsvAmountInput(rawSingleCell) : false;
      const validDebit = rawDebitCell ? isValidCsvAmountInput(rawDebitCell) : false;
      const validCredit = rawCreditCell ? isValidCsvAmountInput(rawCreditCell) : false;
      if (!validSingle && !validDebit && !validCredit) {
        missingOrInvalidFields.push('Amount');
        const badAmt = rawSingleCell || rawDebitCell || rawCreditCell;
        reasons.push(badAmt ? `Amount "${badAmt}" is invalid` : 'Amount is missing');
      }

      if (mapping.noteColumn && !rawNarration) {
        missingOrInvalidFields.push('Description');
        reasons.push('Description is missing');
      }

      if (missingOrInvalidFields.length > 0) {
        options.onMalformedRow?.({
          rowNumber: rowIdx + 1,
          csvLineNumber: rowIdx + 2,
          missingOrInvalidFields,
          message: `Row ${rowIdx + 1} (line ${rowIdx + 2}): Invalid or missing ${missingOrInvalidFields.join(
            ', '
          )} — ${reasons.join('; ')}.`,
          rawRow: row,
        });
        return;
      }
    }

    const rawTime = (row['Time'] || row['time'] || '').trim();
    const combinedDateInput =
      rawDate && rawTime && !rawDate.includes('T') && !/\s+\d{2}:\d{2}/.test(rawDate)
        ? `${rawDate} ${rawTime}`
        : rawDate;
    const date = normalizeBankDateToIso(combinedDateInput, defaultMonth);

    const rawType = mapping.typeColumn ? (row[mapping.typeColumn] || '').trim() : '';
    const rawCategory = mapping.categoryColumn ? (row[mapping.categoryColumn] || '').trim() : '';
    const rawSubCategory = mapping.subCategoryColumn
      ? (row[mapping.subCategoryColumn] || '').trim()
      : '';

    const rawCurrencyCell =
      (mapping.currencyColumn && row[mapping.currencyColumn]) ||
      row['Currency'] ||
      row['currency'] ||
      '';
    const resolvedCurrency: CurrencyCode = rawCurrencyCell
      ? normalizeCurrencyCode(rawCurrencyCell)
      : 'INR';

    // Determine amount and transaction type
    let rawNumericAmount = 0;
    let txType: TransactionType = 'Expense';

    const debitVal =
      mapping.debitColumn && isValidCsvAmountInput(rawDebitCell)
        ? Math.abs(parseCurrencyNumber(rawDebitCell))
        : 0;
    const creditVal =
      mapping.creditColumn && isValidCsvAmountInput(rawCreditCell)
        ? Math.abs(parseCurrencyNumber(rawCreditCell))
        : 0;
    const singleAmt =
      mapping.amountColumn && isValidCsvAmountInput(rawSingleCell)
        ? parseCurrencyNumber(rawSingleCell)
        : 0;

    if (debitVal > 0 && creditVal === 0) {
      rawNumericAmount = debitVal;
      txType = 'Expense';
    } else if (creditVal > 0 && debitVal === 0) {
      rawNumericAmount = creditVal;
      txType = 'Income';
    } else if (singleAmt !== 0) {
      rawNumericAmount = Math.abs(singleAmt);
      if (singleAmt < 0) {
        txType = 'Expense';
      } else if (/^(income|credit|cr|deposit)$/i.test(rawType)) {
        txType = 'Income';
      } else if (/^(transfer|self\s*transfer|contra)$/i.test(rawType)) {
        txType = 'Transfer';
      } else if (/^(expense|debit|dr|withdrawal)$/i.test(rawType)) {
        txType = 'Expense';
      } else if (
        /salary|freelance|consulting|dividend|payout|refund|interest|stipend|bonus|retainer/i.test(
          `${rawCategory} ${rawNarration}`
        )
      ) {
        txType = 'Income';
      } else {
        txType = 'Expense';
      }
    }

    // Check if category or narration explicitly marks a self-transfer
    if (
      /^transfer$/i.test(rawCategory) ||
      /^transfer$/i.test(rawType) ||
      /self\s*transfer|icici\s*to\s*sbi|sbi\s*to\s*icici|atm\s*withdrawal/i.test(rawNarration)
    ) {
      txType = 'Transfer';
    }

    if (!Number.isFinite(rawNumericAmount) || rawNumericAmount <= 0) {
      return;
    }

    const rawOriginalAmtCell = row['Original Amount'] || row['originalAmount'] || '';
    const parsedOriginalAmt = Math.abs(parseCurrencyNumber(rawOriginalAmtCell));
    const rawExchangeRateCell =
      row['Exchange Rate to INR'] || row['exchangeRateToINR'] || '';
    const parsedExchangeRate = parseCurrencyNumber(rawExchangeRateCell);
    const hasExplicitInrColumn = Boolean(row['Amount (INR)'] || row['Withdrawal Amt.'] || row['Deposit Amt.']);

    const exchangeRateToINR =
      resolvedCurrency !== 'INR'
        ? parsedExchangeRate > 0
          ? parsedExchangeRate
          : FALLBACK_RATES_TO_INR[resolvedCurrency] || 1
        : 1;

    const resolvedOriginalAmount =
      resolvedCurrency !== 'INR' && parsedOriginalAmt > 0
        ? parsedOriginalAmt
        : rawNumericAmount;

    const amount =
      resolvedCurrency !== 'INR'
        ? hasExplicitInrColumn && parsedOriginalAmt > 0
          ? rawNumericAmount
          : Number((resolvedOriginalAmount * exchangeRateToINR).toFixed(2))
        : rawNumericAmount;

    // Resolve source account
    let resolvedAccountId = defaultAccountId || accounts[0]?.id || 'acc-icici';
    if (mapping.accountColumn && row[mapping.accountColumn]) {
      const candidate = row[mapping.accountColumn].trim().toLowerCase();
      const matchedAccId = accountByName.get(candidate);
      if (matchedAccId) {
        resolvedAccountId = matchedAccId;
      }
    }

    // Resolve destination account for Transfer
    let resolvedToAccountId: string | undefined;
    if (txType === 'Transfer') {
      if (mapping.toAccountColumn && row[mapping.toAccountColumn]) {
        const candidateTo = row[mapping.toAccountColumn].trim().toLowerCase();
        resolvedToAccountId = accountByName.get(candidateTo);
      }
      if (!resolvedToAccountId || resolvedToAccountId === resolvedAccountId) {
        resolvedToAccountId =
          defaultToAccountId && defaultToAccountId !== resolvedAccountId
            ? defaultToAccountId
            : accounts.find((a) => a.id !== resolvedAccountId)?.id || 'acc-sbi';
      }
    }

    const inferred = inferCategoryFromNarration(
      rawNarration,
      txType,
      categories,
      options.historicalTransactions
    );
    const finalCategory =
      txType === 'Transfer'
        ? 'Transfer'
        : rawCategory || defaultCategory || inferred.category;
    const finalSubCategory = rawSubCategory || inferred.subCategory;
    const finalNote = rawNarration || `CSV Imported ${txType} (${finalCategory})`;

    const rawFixedOrVar = (
      row['Fixed / Variable'] ||
      row['Fixed/Variable'] ||
      row['fixedOrVariable'] ||
      ''
    ).trim();
    const resolvedFixedOrVariable: FixedOrVariable =
      /^fixed$/i.test(rawFixedOrVar)
        ? 'Fixed'
        : /^variable$/i.test(rawFixedOrVar)
        ? 'Variable'
        : inferred.fixedOrVariable;

    const rawAnomalyFlag = (row['Anomaly Flag'] || row['isAnomaly'] || '').trim();
    const resolvedIsAnomaly = /^(yes|true|1)$/i.test(rawAnomalyFlag);

    const uniqueId =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = (Math.random() * 16) | 0;
            const v = c === 'x' ? r : (r & 0x3) | 0x8;
            return v.toString(16);
          });

    const candidateTx: Omit<MoneyTransaction, 'id'> & { id?: string } = {
      id: uniqueId,
      date,
      type: txType,
      accountId: resolvedAccountId,
      toAccountId: txType === 'Transfer' ? resolvedToAccountId : undefined,
      amount,
      ...(resolvedCurrency !== 'INR'
        ? {
            currency: resolvedCurrency,
            originalAmount: resolvedOriginalAmount,
            exchangeRateToINR,
            rateDate: date.slice(0, 10),
          }
        : {}),
      category: finalCategory,
      subCategory: finalSubCategory,
      fixedOrVariable: resolvedFixedOrVariable,
      note: finalNote,
      receiptImages: [],
      isAnomaly: resolvedIsAnomaly,
    };

    if (skipDuplicates) {
      const fp = buildTransactionFingerprint(candidateTx);
      const rawFp = rawNarration
        ? buildTransactionFingerprint({
            date: candidateTx.date,
            amount: candidateTx.amount,
            description: rawNarration,
          })
        : fp;
      if (existingFingerprints.has(fp) || existingFingerprints.has(rawFp)) {
        return;
      }
      existingFingerprints.add(fp);
      existingFingerprints.add(rawFp);
    }

    results.push(candidateTx);
  });

  return results;
}

/**
 * End-to-end bulk CSV import helper:
 * Parses CSV text, strictly validates mandatory columns (Date, Amount, Description) and rows,
 * maps valid rows into MoneyTransactions, and persists them into IndexedDB (`JawedMoneyManagerDB`).
 */
export async function bulkImportCsvToLedger(
  csvContent: string,
  options?: Partial<CsvMappingOptions> & {
    customMapping?: Partial<CsvColumnMapping>;
    skipDuplicates?: boolean;
  }
): Promise<BulkCsvImportLedgerResult> {
  const parsed = parseCsvText(csvContent);
  const autoMap = autoDetectCsvMapping(parsed.headers);
  const columnMapping: CsvColumnMapping = {
    ...autoMap,
    ...(options?.customMapping || {}),
  };
  const validation = validateCsvRows(parsed.rows, parsed.headers, columnMapping);

  if (parsed.rows.length === 0 || !validation.hasMandatoryColumns) {
    const feedback = buildCsvImportFeedback({
      totalRows: parsed.rows.length,
      importedCount: 0,
      failedValidationCount: validation.malformedRows.length || parsed.rows.length,
      skippedDuplicateCount: 0,
      validationErrors: validation.rowErrorMessages,
      customErrorMessage:
        validation.columnErrorMessage ||
        validation.summaryErrorMessage ||
        'CSV file is empty or missing mandatory columns (Date, Amount, Description).',
    });
    return {
      importedTransactions: [],
      parsedRowCount: parsed.rows.length,
      skippedRowCount: parsed.rows.length,
      columnMapping,
      summary: summarizeMappedCsvTransactions([]),
      validation,
      malformedRows: validation.malformedRows,
      errorMessage: validation.summaryErrorMessage,
      feedback,
    };
  }

  let accounts = options?.accounts;
  let categories = options?.categories;
  let historicalTransactions = options?.historicalTransactions;

  if (!accounts || !categories || !historicalTransactions) {
    const state = await getAllLedgerState();
    accounts = accounts || state.accounts;
    categories = categories || state.categories;
    historicalTransactions = historicalTransactions || state.transactions;
  }

  const shouldSkipDuplicates = options?.skipDuplicates ?? true;
  const defaultAccountId = options?.defaultAccountId || accounts[0]?.id || 'acc-icici';
  const mapped = mapCsvRowsToTransactions(validation.validRows, columnMapping, {
    defaultAccountId,
    defaultToAccountId: options?.defaultToAccountId,
    defaultCategory: options?.defaultCategory,
    defaultMonth: options?.defaultMonth || '2026-11',
    accounts,
    categories,
    historicalTransactions,
    skipDuplicates: shouldSkipDuplicates,
    strictValidation: true,
  });

  const mappedWithUuids = mapped.map((tx) => ({
    ...tx,
    id:
      tx.id ||
      (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : undefined),
  }));

  const importedTransactions = await bulkImportTransactions(mappedWithUuids, {
    skipDuplicates: shouldSkipDuplicates,
  });
  const summary = summarizeMappedCsvTransactions(importedTransactions);
  const skippedDuplicateCount = Math.max(
    0,
    validation.validRows.length - importedTransactions.length
  );
  const feedback = buildCsvImportFeedback({
    totalRows: parsed.rows.length,
    importedCount: importedTransactions.length,
    failedValidationCount: validation.malformedRows.length,
    skippedDuplicateCount,
    validationErrors: validation.rowErrorMessages,
    customErrorMessage: validation.summaryErrorMessage,
  });

  return {
    importedTransactions,
    parsedRowCount: parsed.rows.length,
    skippedRowCount: Math.max(0, parsed.rows.length - importedTransactions.length),
    columnMapping,
    summary,
    validation,
    malformedRows: validation.malformedRows,
    errorMessage: validation.summaryErrorMessage,
    feedback,
  };
}

/**
 * Reads a CSV File / Blob and bulk-imports its transactions into the local IndexedDB ledger.
 */
export async function bulkImportCsvFileToLedger(
  file: { text: () => Promise<string> },
  options?: Partial<CsvMappingOptions> & {
    customMapping?: Partial<CsvColumnMapping>;
    skipDuplicates?: boolean;
  }
): Promise<BulkCsvImportLedgerResult> {
  const text = await file.text();
  return bulkImportCsvToLedger(text, options);
}

export const SAMPLE_CSV_FILENAME = 'jawed-money-manager-sample-statement.csv';

/**
 * Generates and triggers a browser file download of a pre-formatted sample CSV template
 * that guarantees valid imports into IndexedDB (`JawedMoneyManagerDB`) and React state.
 */
export function downloadSampleCsvTemplate(
  customFileName: string = SAMPLE_CSV_FILENAME,
  customCsvContent: string = SAMPLE_BANK_STATEMENT_CSV
): { fileName: string; csvContent: string } {
  const csvContent = customCsvContent || SAMPLE_BANK_STATEMENT_CSV;
  const fileName = customFileName || SAMPLE_CSV_FILENAME;

  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    const blob = new Blob([`\uFEFF${csvContent}`], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return { fileName, csvContent };
}

export { formatTransactionsToCsv, downloadMoneyManagerCsv } from './excelExporter';


