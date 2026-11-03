import type {
  AccountSummary,
  FixedOrVariable,
  MoneyCategory,
  MoneyTransaction,
  TransactionType,
} from '../../db/db';

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
}

export interface CsvMappingOptions {
  defaultAccountId: string;
  defaultToAccountId?: string;
  defaultCategory?: string;
  defaultMonth?: string; // YYYY-MM
  accounts: AccountSummary[];
  categories: MoneyCategory[];
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
    ]),
    debitColumn: findHeader([
      /withdrawal/i,
      /^debit/i,
      /debit\s*amt/i,
      /^dr$/i,
      /outflow/i,
    ]),
    creditColumn: findHeader([
      /deposit/i,
      /^credit/i,
      /credit\s*amt/i,
      /^cr$/i,
      /inflow/i,
    ]),
    typeColumn: findHeader([
      /^type$/i,
      /txn\s*type/i,
      /transaction\s*type/i,
      /dr\s*\/\s*cr/i,
      /^cr\/dr$/i,
    ]),
    categoryColumn: findHeader([/^category$/i, /expense\s*category/i]),
    subCategoryColumn: findHeader([/sub[-_\s]*category/i, /merchant/i, /payee/i]),
    noteColumn: findHeader([
      /narration/i,
      /description/i,
      /particulars/i,
      /remarks/i,
      /^note$/i,
      /memo/i,
      /details/i,
    ]),
    accountColumn: findHeader([/^account$/i, /^bank$/i, /account\s*\/\s*bank/i, /source\s*account/i]),
    toAccountColumn: findHeader([/target\s*account/i, /to\s*account/i]),
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

  // YYYY-MM-DD HH:mm
  if (/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}/.test(clean)) {
    return clean.replace(/\s+/, 'T').slice(0, 16);
  }

  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
    return `${clean}T12:00`;
  }

  // DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = clean.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  if (dmyMatch) {
    const first = Number.parseInt(dmyMatch[1], 10);
    const second = Number.parseInt(dmyMatch[2], 10);
    const year = dmyMatch[3];
    // Assume DD/MM/YYYY for Indian bank statements unless second > 12
    const day = second > 12 ? second : first;
    const month = second > 12 ? first : second;
    const mm = String(Math.min(12, Math.max(1, month))).padStart(2, '0');
    const dd = String(Math.min(31, Math.max(1, day))).padStart(2, '0');
    return `${year}-${mm}-${dd}T12:00`;
  }

  // DD MMM YYYY (e.g. 16 Nov 2026 or 16-Nov-2026)
  const textMonthMatch = clean.match(/^(\d{1,2})[\s-]+([A-Za-z]{3,})[\s,-]+(\d{4})/);
  if (textMonthMatch) {
    const day = String(Number.parseInt(textMonthMatch[1], 10)).padStart(2, '0');
    const monKey = textMonthMatch[2].slice(0, 3).toLowerCase();
    const mm = MONTH_LOOKUP[monKey] || '11';
    const year = textMonthMatch[3];
    return `${year}-${mm}-${day}T12:00`;
  }

  return `${fallbackMonth}-01T12:00`;
}

function parseCurrencyNumber(raw: string | undefined): number {
  if (!raw) return 0;
  const cleaned = String(raw)
    .replace(/[₹$,\s]/g, '')
    .replace(/\(([\d.]+)\)/, '-$1')
    .replace(/[^\d.-]/g, '');
  const parsed = Number.parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Infers a category & sub-category from bank narration keywords when no explicit category is present.
 */
function inferCategoryFromNarration(
  narration: string,
  txType: TransactionType,
  categories: MoneyCategory[]
): { category: string; subCategory: string; fixedOrVariable: FixedOrVariable } {
  if (txType === 'Transfer') {
    return {
      category: 'Transfer',
      subCategory: 'NEFT / IMPS Self Transfer',
      fixedOrVariable: 'Variable',
    };
  }

  const text = narration.toLowerCase();

  if (txType === 'Income') {
    if (/salary|payroll|stipend/i.test(text)) {
      return { category: 'Salary', subCategory: 'Monthly Payroll', fixedOrVariable: 'Fixed' };
    }
    return {
      category: 'Freelance & Consulting',
      subCategory: 'IT Field Advisory',
      fixedOrVariable: 'Variable',
    };
  }

  if (/swiggy|zomato|grocery|bigbasket|blinkit|dairy|vegetable|supermarket|food|restaurant/i.test(text)) {
    return {
      category: 'Food & Groceries',
      subCategory: 'Monthly Ration & Staples',
      fixedOrVariable: 'Variable',
    };
  }
  if (/rent|maintenance|society|housing/i.test(text)) {
    return {
      category: 'Rent & Housing',
      subCategory: 'Apartment Rent',
      fixedOrVariable: 'Fixed',
    };
  }
  if (/electricity|bescom|broadband|jiofiber|airtel|water|gas|utility|bill/i.test(text)) {
    return {
      category: 'Utilities & Broadband',
      subCategory: 'Electricity Bill',
      fixedOrVariable: 'Fixed',
    };
  }
  if (/pharmacy|apollo|hospital|clinic|doctor|medical|diagnostic|health/i.test(text)) {
    return {
      category: 'Medical & Health',
      subCategory: 'Pharmacy & Medicines',
      fixedOrVariable: 'Variable',
    };
  }
  if (/school|tuition|college|udemy|course|book|education/i.test(text)) {
    return {
      category: 'Education',
      subCategory: 'School Tuition',
      fixedOrVariable: 'Fixed',
    };
  }
  if (/petrol|fuel|indian oil|hpcl|bpcl|uber|ola|metro|irctc|flight/i.test(text)) {
    return {
      category: 'Transport & Fuel',
      subCategory: 'Petrol / Fuel',
      fixedOrVariable: 'Variable',
    };
  }

  const fallbackCat = categories.find((c) => c.type === txType);
  return {
    category: fallbackCat?.name || (txType === 'Expense' ? 'Lifestyle & Family' : 'Salary'),
    subCategory: fallbackCat?.subCategories?.[0] || 'General',
    fixedOrVariable: fallbackCat?.defaultFixedOrVariable || 'Variable',
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
  } = options;

  const accountByName = new Map<string, string>();
  for (const acc of accounts) {
    accountByName.set(acc.name.toLowerCase(), acc.id);
    accountByName.set(acc.id.toLowerCase(), acc.id);
  }

  const results: Array<Omit<MoneyTransaction, 'id'> & { id?: string }> = [];

  rows.forEach((row, index) => {
    const rawDate = mapping.dateColumn ? row[mapping.dateColumn] : '';
    const date = normalizeBankDateToIso(rawDate, defaultMonth);

    const rawNarration = mapping.noteColumn ? row[mapping.noteColumn] : '';
    const rawType = mapping.typeColumn ? (row[mapping.typeColumn] || '').trim() : '';
    const rawCategory = mapping.categoryColumn ? (row[mapping.categoryColumn] || '').trim() : '';
    const rawSubCategory = mapping.subCategoryColumn
      ? (row[mapping.subCategoryColumn] || '').trim()
      : '';

    // Determine amount and transaction type
    let amount = 0;
    let txType: TransactionType = 'Expense';

    const debitVal = mapping.debitColumn ? Math.abs(parseCurrencyNumber(row[mapping.debitColumn])) : 0;
    const creditVal = mapping.creditColumn
      ? Math.abs(parseCurrencyNumber(row[mapping.creditColumn]))
      : 0;
    const singleAmt = mapping.amountColumn ? parseCurrencyNumber(row[mapping.amountColumn]) : 0;

    if (debitVal > 0 && creditVal === 0) {
      amount = debitVal;
      txType = 'Expense';
    } else if (creditVal > 0 && debitVal === 0) {
      amount = creditVal;
      txType = 'Income';
    } else if (singleAmt !== 0) {
      amount = Math.abs(singleAmt);
      if (singleAmt < 0) {
        txType = 'Expense';
      } else if (/^(income|credit|cr|deposit)$/i.test(rawType)) {
        txType = 'Income';
      } else if (/^(transfer|self\s*transfer|contra)$/i.test(rawType)) {
        txType = 'Transfer';
      } else if (/^(expense|debit|dr|withdrawal)$/i.test(rawType)) {
        txType = 'Expense';
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

    if (!Number.isFinite(amount) || amount <= 0) {
      return;
    }

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

    const inferred = inferCategoryFromNarration(rawNarration, txType, categories);
    const finalCategory =
      txType === 'Transfer'
        ? 'Transfer'
        : rawCategory || defaultCategory || inferred.category;
    const finalSubCategory =
      rawSubCategory || inferred.subCategory;

    results.push({
      id: `tx-csv-${Date.now()}-${index}`,
      date,
      type: txType,
      accountId: resolvedAccountId,
      toAccountId: txType === 'Transfer' ? resolvedToAccountId : undefined,
      amount,
      category: finalCategory,
      subCategory: finalSubCategory,
      fixedOrVariable: inferred.fixedOrVariable,
      note: rawNarration || `CSV Imported ${txType} (${finalCategory})`,
      receiptImages: [],
      isAnomaly: false,
    });
  });

  return results;
}

export { formatTransactionsToCsv, downloadMoneyManagerCsv } from './excelExporter';

