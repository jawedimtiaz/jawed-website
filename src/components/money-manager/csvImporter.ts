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

export interface BulkCsvImportLedgerResult {
  importedTransactions: MoneyTransaction[];
  parsedRowCount: number;
  skippedRowCount: number;
  columnMapping: CsvColumnMapping;
  summary: BulkCsvImportSummaryMetrics;
  validation?: CsvValidationReport;
  malformedRows?: CsvRowValidationError[];
  errorMessage?: string | null;
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
    return year >= 1900 && year <= 2100 && month >= 1 && month <= 12 && day >= 1 && day <= 31;
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
    return year >= 1900 && year <= 2100 && month >= 1 && month <= 12 && day >= 1 && day <= 31;
  }

  // DD MMM YYYY or DD-MMM-YY (e.g. 16 Nov 2026, 16-Nov-2026, 16-Nov-26)
  const textMonthMatch = clean.match(/^(\d{1,2})[\s-]+([A-Za-z]{3,})[\s,-]+(\d{2,4})$/);
  if (textMonthMatch) {
    const day = Number.parseInt(textMonthMatch[1], 10);
    const monKey = textMonthMatch[2].slice(0, 3).toLowerCase();
    return Boolean(MONTH_LOOKUP[monKey]) && day >= 1 && day <= 31;
  }

  // MMM DD, YYYY (e.g. Nov 16, 2026)
  const mdyTextMatch = clean.match(/^([A-Za-z]{3,})\s+(\d{1,2}),?\s+(\d{4})$/);
  if (mdyTextMatch) {
    const monKey = mdyTextMatch[1].slice(0, 3).toLowerCase();
    const day = Number.parseInt(mdyTextMatch[2], 10);
    return Boolean(MONTH_LOOKUP[monKey]) && day >= 1 && day <= 31;
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
 * and returns a structured report with helpful per-row error messages for any malformed rows.
 */
export function validateCsvRows(
  rows: Record<string, string>[],
  headers: string[],
  customMapping?: Partial<CsvColumnMapping>
): CsvValidationReport {
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
      columnErrorMessage,
      validRows: [],
      malformedRows: [],
      rowErrorMessages: columnErrorMessage ? [columnErrorMessage] : [],
      summaryErrorMessage: columnErrorMessage,
    };
  }

  const validRows: Record<string, string>[] = [];
  const malformedRows: CsvRowValidationError[] = [];

  rows.forEach((row, idx) => {
    const rowNumber = idx + 1;
    const csvLineNumber = idx + 2;
    const missingOrInvalidFields: CsvMandatoryColumnName[] = [];
    const reasons: string[] = [];

    // 1. Validate Date
    const rawDate = (row[resolvedMapping.dateColumn] || '').trim();
    if (!rawDate) {
      missingOrInvalidFields.push('Date');
      reasons.push('Date is missing');
    } else if (!isValidBankDateInput(rawDate)) {
      missingOrInvalidFields.push('Date');
      reasons.push(`Date "${rawDate}" is invalid (expected YYYY-MM-DD or DD/MM/YYYY)`);
    }

    // 2. Validate Amount (either single amountColumn or split debitColumn/creditColumn)
    const rawSingleAmt = resolvedMapping.amountColumn
      ? (row[resolvedMapping.amountColumn] || '').trim()
      : '';
    const rawDebitAmt = resolvedMapping.debitColumn
      ? (row[resolvedMapping.debitColumn] || '').trim()
      : '';
    const rawCreditAmt = resolvedMapping.creditColumn
      ? (row[resolvedMapping.creditColumn] || '').trim()
      : '';

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
        reasons.push('Amount is missing');
      } else {
        reasons.push(`Amount "${badValue}" is not a valid non-zero number`);
      }
    }

    // 3. Validate Description (Narration / Note)
    const rawDescription = (row[resolvedMapping.noteColumn] || '').trim();
    if (!rawDescription) {
      missingOrInvalidFields.push('Description');
      reasons.push('Description is missing');
    }

    if (missingOrInvalidFields.length > 0) {
      const message = `Row ${rowNumber} (line ${csvLineNumber}): Invalid or missing ${missingOrInvalidFields.join(
        ', '
      )} — ${reasons.join('; ')}.`;
      malformedRows.push({
        rowNumber,
        csvLineNumber,
        missingOrInvalidFields,
        message,
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

  return {
    isValid: malformedRows.length === 0 && validRows.length > 0,
    hasMandatoryColumns: true,
    missingColumns: [],
    columnErrorMessage: null,
    validRows,
    malformedRows,
    rowErrorMessages,
    summaryErrorMessage,
  };
}

/**
 * Parses CSV text and executes strict mandatory-column and row-level validation.
 */
export function validateAndParseCsvText(
  csvContent: string,
  customMapping?: Partial<CsvColumnMapping>
): ParsedCsvResult & { validation: CsvValidationReport } {
  const parsed = parseCsvText(csvContent);
  const validation = validateCsvRows(parsed.rows, parsed.headers, customMapping);
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
    return {
      importedTransactions: [],
      parsedRowCount: parsed.rows.length,
      skippedRowCount: parsed.rows.length,
      columnMapping,
      summary: summarizeMappedCsvTransactions([]),
      validation,
      malformedRows: validation.malformedRows,
      errorMessage: validation.summaryErrorMessage,
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

  return {
    importedTransactions,
    parsedRowCount: parsed.rows.length,
    skippedRowCount: Math.max(0, parsed.rows.length - importedTransactions.length),
    columnMapping,
    summary,
    validation,
    malformedRows: validation.malformedRows,
    errorMessage: validation.summaryErrorMessage,
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


