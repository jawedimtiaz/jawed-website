import * as XLSX from 'xlsx';
import {
  calculateMonthlyMetrics,
  formatINR,
  getAllAccounts,
  getAllTransactions,
  type AccountSummary,
  type MoneyCategory,
  type MoneyTransaction,
  type SinkingFund,
} from '../../db/db';

export interface ExcelExportInput {
  accounts: AccountSummary[];
  categories: MoneyCategory[];
  transactions: MoneyTransaction[];
  sinkingFunds: SinkingFund[];
  selectedMonth: string;
}

/**
 * Generates a multi-tab SheetJS WorkBook matching standard Realbyte / multi-bank expense tracking columns.
 */
export function buildMoneyManagerWorkbook(input: ExcelExportInput): XLSX.WorkBook {
  const { accounts, transactions, sinkingFunds, selectedMonth } = input;
  const accountMap = new Map(accounts.map((acc) => [acc.id, acc.name]));
  const wb = XLSX.utils.book_new();

  // Sheet 1: Transactions Ledger
  const ledgerRows = transactions.map((tx) => ({
    'Transaction ID': tx.id,
    'Date & Time': tx.date.replace('T', ' '),
    Month: tx.date.slice(0, 7),
    Type: tx.type,
    'Account / Bank': accountMap.get(tx.accountId) || tx.accountId,
    'Target Account (Transfer)': tx.type === 'Transfer' ? accountMap.get(tx.toAccountId || '') || tx.toAccountId || '' : '',
    Category: tx.category,
    'Sub-Category': tx.subCategory,
    'Fixed / Variable': tx.fixedOrVariable,
    'Amount (INR)': tx.amount,
    'Formatted Amount': formatINR(tx.amount),
    Note: tx.note,
    'Anomaly Spike': tx.isAnomaly ? 'YES' : 'NO',
    'Receipts Attached': tx.receiptImages?.length || 0,
  }));

  const ledgerSheet = XLSX.utils.json_to_sheet(
    ledgerRows.length > 0
      ? ledgerRows
      : [
          {
            'Transaction ID': '',
            'Date & Time': '',
            Month: selectedMonth,
            Type: '',
            'Account / Bank': '',
            'Target Account (Transfer)': '',
            Category: '',
            'Sub-Category': '',
            'Fixed / Variable': '',
            'Amount (INR)': 0,
            'Formatted Amount': '₹0',
            Note: 'No transactions recorded',
            'Anomaly Spike': 'NO',
            'Receipts Attached': 0,
          },
        ]
  );
  XLSX.utils.book_append_sheet(wb, ledgerSheet, 'Transactions Ledger');

  // Sheet 2: Account Balances
  const accountRows = accounts.map((acc) => ({
    'Account ID': acc.id,
    'Account Name': acc.name,
    'Account Type': acc.type,
    'Opening Balance (INR)': acc.openingBalance,
    'Total Credits (+)': acc.totalCredits,
    'Total Debits (-)': acc.totalDebits,
    'Current Balance (INR)': acc.currentBalance,
    'Reconciliation Status': acc.reconciled ? 'Reconciled' : 'Pending Review',
    'Last Reconciled Date': acc.lastReconciledAt || 'N/A',
  }));
  const accountSheet = XLSX.utils.json_to_sheet(accountRows);
  XLSX.utils.book_append_sheet(wb, accountSheet, 'Account Balances');

  // Sheet 3: Monthly Cash Flow Summary
  const metrics = calculateMonthlyMetrics(transactions, selectedMonth);
  const summaryRows = [
    { Metric: 'Selected Month', Value: metrics.yearMonth },
    { Metric: 'Monthly Income (INR)', Value: metrics.income },
    { Metric: 'Monthly Expenses (INR)', Value: metrics.expense },
    { Metric: 'Net Cash Flow (INR)', Value: metrics.netBalance },
    { Metric: 'Monthly Transfers Volume (Excluded from Cash Flow)', Value: metrics.transfersVolume },
    { Metric: 'Savings Rate (%)', Value: `${metrics.savingsRate}%` },
    { Metric: 'Fixed Expenses (INR)', Value: metrics.fixedExpense },
    { Metric: 'Variable Expenses (INR)', Value: metrics.variableExpense },
    { Metric: 'Unbudgeted Anomaly Spikes Count', Value: metrics.anomalyCount },
    { Metric: 'Unbudgeted Anomaly Spikes Total (INR)', Value: metrics.anomalyTotal },
  ];
  const summarySheet = XLSX.utils.json_to_sheet(summaryRows);
  XLSX.utils.book_append_sheet(wb, summarySheet, 'Monthly Summary');

  // Sheet 4: Sinking Funds & Annual Provisions
  const fundRows = sinkingFunds.map((sf) => ({
    'Fund Name': sf.name,
    'Target Amount (INR)': sf.targetAmount,
    'Monthly Contribution Target (INR)': sf.monthlyTarget,
    'Current Accrued (INR)': sf.currentAccrued,
    'Remaining Shortfall (INR)': Math.max(0, sf.targetAmount - sf.currentAccrued),
    'Progress (%)':
      sf.targetAmount > 0 ? `${Math.min(100, Math.round((sf.currentAccrued / sf.targetAmount) * 100))}%` : '0%',
  }));
  const fundSheet = XLSX.utils.json_to_sheet(fundRows);
  XLSX.utils.book_append_sheet(wb, fundSheet, 'Sinking Funds');

  return wb;
}

/**
 * Triggers a browser download of the generated multi-tab Excel (.xlsx) file.
 */
export function downloadMoneyManagerExcel(input: ExcelExportInput): void {
  const wb = buildMoneyManagerWorkbook(input);
  const fileName = `jawed-money-manager-${input.selectedMonth}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

export interface CsvExportInput {
  transactions: MoneyTransaction[];
  accounts?: AccountSummary[];
  selectedMonth?: string;
}

function escapeCsvCell(value: unknown): string {
  const str = value === null || value === undefined ? '' : String(value);
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Formats all ledger transactions into a standard RFC-4180 CSV table compatible with
 * accounting software (Tally, Zoho Books, QuickBooks, Excel) and bank statement mappers.
 */
export function formatTransactionsToCsv(
  transactions: MoneyTransaction[],
  accounts: AccountSummary[] = []
): string {
  const accountMap = new Map(accounts.map((acc) => [acc.id, acc.name]));

  const headers = [
    'Transaction ID',
    'Date',
    'Time',
    'Type',
    'Account / Bank',
    'Target Account',
    'Category',
    'Sub-Category',
    'Fixed / Variable',
    'Withdrawal Amt.',
    'Deposit Amt.',
    'Amount (INR)',
    'Narration',
    'Anomaly Flag',
  ];

  const rows = transactions.map((tx) => {
    const [datePart = '', timePart = ''] = String(tx.date || '').split('T');
    const sourceAccount = accountMap.get(tx.accountId) || tx.accountId || '';
    const targetAccount =
      tx.type === 'Transfer' && tx.toAccountId
        ? accountMap.get(tx.toAccountId) || tx.toAccountId
        : '';
    const amount = Number(tx.amount) || 0;
    const withdrawalAmt = tx.type === 'Expense' || tx.type === 'Transfer' ? amount : '';
    const depositAmt = tx.type === 'Income' ? amount : '';

    return [
      tx.id,
      datePart,
      timePart.slice(0, 5),
      tx.type,
      sourceAccount,
      targetAccount,
      tx.category || '',
      tx.subCategory || '',
      tx.fixedOrVariable || 'Variable',
      withdrawalAmt,
      depositAmt,
      amount,
      tx.note || '',
      tx.isAnomaly ? 'YES' : 'NO',
    ]
      .map(escapeCsvCell)
      .join(',');
  });

  return [headers.map(escapeCsvCell).join(','), ...rows].join('\r\n');
}

/**
 * Triggers a browser download of all ledger transactions formatted as a standard accounting CSV file.
 */
export function downloadMoneyManagerCsv(input: CsvExportInput): string {
  const csvContent = formatTransactionsToCsv(input.transactions, input.accounts || []);
  if (typeof document !== 'undefined' && typeof URL !== 'undefined') {
    const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const dateStamp = input.selectedMonth || new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `jawed-money-manager-ledger-${dateStamp}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
  return csvContent;
}

/**
 * Reads all ledger transactions and accounts directly from IndexedDB (`JawedMoneyManagerDB`),
 * formats them into a standard accounting CSV table, and triggers a browser download.
 */
export async function exportTransactionsCsvFromDb(selectedMonth?: string): Promise<{
  csvContent: string;
  transactionCount: number;
}> {
  const [idbTransactions, idbAccounts] = await Promise.all([
    getAllTransactions(),
    getAllAccounts(),
  ]);
  const csvContent = downloadMoneyManagerCsv({
    transactions: idbTransactions,
    accounts: idbAccounts,
    selectedMonth,
  });
  return {
    csvContent,
    transactionCount: idbTransactions.length,
  };
}

export interface BulkCsvExportOptions {
  scope?: 'full-history' | 'selected-month';
  selectedMonth?: string;
  accountId?: string;
  typeFilter?: 'ALL' | 'Income' | 'Expense' | 'Transfer';
  sortOrder?: 'asc' | 'desc';
  formatMode?: 'split-debit-credit' | 'single-signed-amount';
  includeMultiCurrencyColumns?: boolean;
  fallbackTransactions?: MoneyTransaction[];
  fallbackAccounts?: AccountSummary[];
}

export interface BulkCsvExportSummary {
  csvContent: string;
  fileName: string;
  transactionCount: number;
  incomeCount: number;
  expenseCount: number;
  transferCount: number;
  totalIncome: number;
  totalExpense: number;
  totalTransfers: number;
  earliestDate: string | null;
  latestDate: string | null;
  headers: string[];
}

/**
 * Formats ledger transactions into an RFC-4180 CSV with full import parity.
 * Supports both split Debit/Credit columns (default) and single signed Amount columns,
 * plus optional multi-currency metadata columns (`Currency`, `Original Amount`, `Exchange Rate to INR`).
 */
export function formatLedgerTransactionsToParityCsv(
  transactions: MoneyTransaction[],
  accounts: AccountSummary[] = [],
  options: Pick<BulkCsvExportOptions, 'formatMode' | 'includeMultiCurrencyColumns'> = {}
): string {
  const formatMode = options.formatMode || 'split-debit-credit';
  const hasMultiCurrencyTx = transactions.some(
    (tx) => tx.currency && tx.currency !== 'INR' && tx.originalAmount
  );
  const includeCurrencyCols =
    options.includeMultiCurrencyColumns ?? hasMultiCurrencyTx;

  if (formatMode === 'split-debit-credit' && !includeCurrencyCols) {
    return formatTransactionsToCsv(transactions, accounts);
  }

  const accountMap = new Map(accounts.map((acc) => [acc.id, acc.name]));

  const headers =
    formatMode === 'single-signed-amount'
      ? [
          'Transaction ID',
          'Date',
          'Time',
          'Type',
          'Account / Bank',
          'Target Account',
          'Category',
          'Sub-Category',
          'Fixed / Variable',
          'Amount',
          'Amount (INR)',
          ...(includeCurrencyCols
            ? ['Currency', 'Original Amount', 'Exchange Rate to INR']
            : []),
          'Narration',
          'Anomaly Flag',
        ]
      : [
          'Transaction ID',
          'Date',
          'Time',
          'Type',
          'Account / Bank',
          'Target Account',
          'Category',
          'Sub-Category',
          'Fixed / Variable',
          'Withdrawal Amt.',
          'Deposit Amt.',
          'Amount (INR)',
          ...(includeCurrencyCols
            ? ['Currency', 'Original Amount', 'Exchange Rate to INR']
            : []),
          'Narration',
          'Anomaly Flag',
        ];

  const rows = transactions.map((tx) => {
    const [datePart = '', timePart = ''] = String(tx.date || '').split('T');
    const sourceAccount = accountMap.get(tx.accountId) || tx.accountId || '';
    const targetAccount =
      tx.type === 'Transfer' && tx.toAccountId
        ? accountMap.get(tx.toAccountId) || tx.toAccountId
        : '';
    const amount = Number(tx.amount) || 0;
    const withdrawalAmt = tx.type === 'Expense' || tx.type === 'Transfer' ? amount : '';
    const depositAmt = tx.type === 'Income' ? amount : '';
    const signedAmt = tx.type === 'Income' ? amount : -amount;
    const currency = tx.currency || 'INR';
    const originalAmt =
      currency !== 'INR' && tx.originalAmount ? tx.originalAmount : amount;
    const exchangeRate =
      currency !== 'INR' && tx.exchangeRateToINR ? tx.exchangeRateToINR : 1;

    const cells =
      formatMode === 'single-signed-amount'
        ? [
            tx.id,
            datePart,
            timePart.slice(0, 5),
            tx.type,
            sourceAccount,
            targetAccount,
            tx.category || '',
            tx.subCategory || '',
            tx.fixedOrVariable || 'Variable',
            signedAmt,
            amount,
            ...(includeCurrencyCols ? [currency, originalAmt, exchangeRate] : []),
            tx.note || '',
            tx.isAnomaly ? 'YES' : 'NO',
          ]
        : [
            tx.id,
            datePart,
            timePart.slice(0, 5),
            tx.type,
            sourceAccount,
            targetAccount,
            tx.category || '',
            tx.subCategory || '',
            tx.fixedOrVariable || 'Variable',
            withdrawalAmt,
            depositAmt,
            amount,
            ...(includeCurrencyCols ? [currency, originalAmt, exchangeRate] : []),
            tx.note || '',
            tx.isAnomaly ? 'YES' : 'NO',
          ];

    return cells.map(escapeCsvCell).join(',');
  });

  return [headers.map(escapeCsvCell).join(','), ...rows].join('\r\n');
}

/**
 * Generates a Bulk CSV Export containing the full history of ledger transactions
 * (or filtered subset when configured) formatted for external accounting software
 * (Tally Prime, Zoho Books, QuickBooks, Xero, Excel) and lossless Money Manager CSV re-import.
 */
export function generateBulkLedgerCsvExport(
  transactions: MoneyTransaction[],
  accounts: AccountSummary[] = [],
  options: BulkCsvExportOptions = {}
): BulkCsvExportSummary {
  const scope = options.scope || 'full-history';
  const accountId = options.accountId || 'ALL';
  const typeFilter = options.typeFilter || 'ALL';
  const sortOrder = options.sortOrder || 'asc';

  const filtered = transactions.filter((tx) => {
    if (scope === 'selected-month' && options.selectedMonth) {
      if (!String(tx.date || '').startsWith(options.selectedMonth)) {
        return false;
      }
    }
    if (accountId !== 'ALL') {
      const matchesSource = tx.accountId === accountId;
      const matchesTarget = tx.type === 'Transfer' && tx.toAccountId === accountId;
      if (!matchesSource && !matchesTarget) {
        return false;
      }
    }
    if (typeFilter !== 'ALL' && tx.type !== typeFilter) {
      return false;
    }
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    const cmp = String(a.date || '').localeCompare(String(b.date || ''));
    if (cmp !== 0) {
      return sortOrder === 'asc' ? cmp : -cmp;
    }
    return sortOrder === 'asc'
      ? String(a.id || '').localeCompare(String(b.id || ''))
      : String(b.id || '').localeCompare(String(a.id || ''));
  });

  let incomeCount = 0;
  let expenseCount = 0;
  let transferCount = 0;
  let totalIncome = 0;
  let totalExpense = 0;
  let totalTransfers = 0;
  let earliestDate: string | null = null;
  let latestDate: string | null = null;

  for (const tx of sorted) {
    const amt = Number(tx.amount) || 0;
    if (tx.type === 'Income') {
      incomeCount += 1;
      totalIncome += amt;
    } else if (tx.type === 'Expense') {
      expenseCount += 1;
      totalExpense += amt;
    } else if (tx.type === 'Transfer') {
      transferCount += 1;
      totalTransfers += amt;
    }

    const dateOnly = String(tx.date || '').slice(0, 10);
    if (dateOnly) {
      if (!earliestDate || dateOnly < earliestDate) earliestDate = dateOnly;
      if (!latestDate || dateOnly > latestDate) latestDate = dateOnly;
    }
  }

  const csvContent = formatLedgerTransactionsToParityCsv(sorted, accounts, {
    formatMode: options.formatMode,
    includeMultiCurrencyColumns: options.includeMultiCurrencyColumns,
  });
  const firstLine = csvContent.split(/\r?\n/)[0] || '';
  const headers = firstLine ? firstLine.split(',') : [];

  const scopeSlug =
    scope === 'selected-month' && options.selectedMonth
      ? options.selectedMonth
      : 'full-history';
  const fileName = `jawed-money-manager-bulk-ledger-${scopeSlug}.csv`;

  return {
    csvContent,
    fileName,
    transactionCount: sorted.length,
    incomeCount,
    expenseCount,
    transferCount,
    totalIncome,
    totalExpense,
    totalTransfers,
    earliestDate,
    latestDate,
    headers,
  };
}

/**
 * Fetches the full history of ledger transactions from IndexedDB, generates the
 * Bulk CSV Export payload, and triggers a browser file download.
 */
export async function exportBulkLedgerHistoryCsvFromDb(
  options: BulkCsvExportOptions = {}
): Promise<BulkCsvExportSummary> {
  const [idbTransactions, idbAccounts] = await Promise.all([
    getAllTransactions(),
    getAllAccounts(),
  ]);

  const sourceTransactions =
    idbTransactions.length > 0
      ? idbTransactions
      : options.fallbackTransactions || [];
  const sourceAccounts =
    idbAccounts.length > 0 ? idbAccounts : options.fallbackAccounts || [];

  const summary = generateBulkLedgerCsvExport(
    sourceTransactions,
    sourceAccounts,
    options
  );

  if (typeof document !== 'undefined' && typeof URL !== 'undefined') {
    const blob = new Blob([`\uFEFF${summary.csvContent}`], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = summary.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return summary;
}

/**
 * Exports the current local IndexedDB (`JawedMoneyManagerDB`) transaction ledger
 * into a downloadable CSV file with full column parity for re-importing via `bulkImportCsvToLedger`.
 */
export async function exportIndexedDbLedgerToCsv(
  options: BulkCsvExportOptions = {}
): Promise<BulkCsvExportSummary> {
  return exportBulkLedgerHistoryCsvFromDb(options);
}




