import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import * as XLSX from 'xlsx';
import {
  initializeAndSeedDatabase,
  resetDatabaseToDefaults,
  calculateAccountSummaries,
  calculateMonthlyMetrics,
  calculateCategoryBreakdown,
  calculateSixMonthTrend,
  calculateTwelveMonthTrend,
  saveTransaction,
  deleteTransaction,
  saveAccount,
  saveSinkingFund,
  deleteSinkingFund,
  saveRecurringRule,
  deleteRecurringRule,
  computeNextRecurringDate,
  processDueRecurringRules,
  triggerRecurringRuleNow,
  bulkImportTransactions,
  exportDatabaseBackup,
  restoreDatabaseBackup,
  formatINR,
  SAMPLE_RECEIPT_DATA_URL,
  type MoneyTransaction,
} from '../src/db/db';
import { buildMoneyManagerWorkbook } from '../src/components/money-manager/excelExporter';
import {
  parseCsvText,
  autoDetectCsvMapping,
  mapCsvRowsToTransactions,
  SAMPLE_BANK_STATEMENT_CSV,
} from '../src/components/money-manager/csvImporter';
import {
  normalizeReceiptDate,
  parseCurrencyAmount,
  extractMerchantFromReceiptText,
  extractDateFromReceiptText,
  extractAmountFromReceiptText,
  extractLineItemsFromReceiptText,
  parseReceiptFromText,
  parseSvgReceipt,
  scanReceiptImage,
} from '../src/components/money-manager/receiptScanner';
import { filterDailyTransactions } from '../src/components/money-manager/DailyView';

describe('Money Manager & Multi-Bank Ledger (JawedMoneyManagerDB)', () => {
  beforeEach(async () => {
    await resetDatabaseToDefaults();
  });

  it('auto-seeds ICICI, SBI, UBI, Cash, and Credit Card accounts along with categories, transactions, sinking funds, and recurring rules', async () => {
    const state = await initializeAndSeedDatabase();

    const accountNames = state.accounts.map((a) => a.name);
    assert.ok(accountNames.includes('ICICI'), 'Expected ICICI account');
    assert.ok(accountNames.includes('SBI'), 'Expected SBI account');
    assert.ok(accountNames.includes('UBI'), 'Expected UBI account');
    assert.ok(accountNames.includes('Cash'), 'Expected Cash account');
    assert.ok(accountNames.includes('Credit Card'), 'Expected Credit Card account');

    assert.ok(state.categories.length >= 8, 'Expected seeded categories');
    assert.ok(state.transactions.length >= 8, 'Expected seeded transactions');
    assert.ok(state.sinkingFunds.length >= 2, 'Expected seeded sinking funds');
    assert.ok(state.recurringRules.length >= 5, 'Expected seeded recurring rules');
  });

  it('enforces double-entry accounting: Current Balance = Opening Balance + Total Credits - Total Debits', async () => {
    const state = await initializeAndSeedDatabase();
    const summaries = calculateAccountSummaries(state.accounts, state.transactions);

    for (const acc of summaries) {
      const expectedBalance = acc.openingBalance + acc.totalCredits - acc.totalDebits;
      assert.equal(
        acc.currentBalance,
        expectedBalance,
        `Account ${acc.name} balance mismatch: got ${acc.currentBalance}, expected ${expectedBalance}`
      );
    }

    const icici = summaries.find((a) => a.id === 'acc-icici');
    assert.ok(icici);
    assert.equal(icici.openingBalance, 145000);
    assert.equal(icici.currentBalance, icici.openingBalance + icici.totalCredits - icici.totalDebits);
  });

  it('strictly excludes Bank-to-Bank and ATM Transfers from monthly Income, Expense, and Savings Rate metrics', async () => {
    const state = await initializeAndSeedDatabase();
    const beforeMetrics = calculateMonthlyMetrics(state.transactions, '2026-11');
    const beforeTotalNetWorth = state.accounts.reduce((sum, a) => sum + a.currentBalance, 0);

    // Record a large inter-bank Transfer of ₹50,000 from ICICI to UBI
    const transferTx: MoneyTransaction = {
      id: 'tx-test-transfer-50k',
      date: '2026-11-20T14:30',
      type: 'Transfer',
      accountId: 'acc-icici',
      toAccountId: 'acc-ubi',
      amount: 50000,
      category: 'Transfer',
      subCategory: 'NEFT / IMPS Self Transfer',
      fixedOrVariable: 'Variable',
      note: 'Internal bank transfer test',
      receiptImages: [],
      isAnomaly: false,
    };

    await saveTransaction(transferTx);
    const updatedState = await initializeAndSeedDatabase();
    const afterMetrics = calculateMonthlyMetrics(updatedState.transactions, '2026-11');
    const afterTotalNetWorth = updatedState.accounts.reduce((sum, a) => sum + a.currentBalance, 0);

    // Monthly Income, Monthly Expense, Net Balance, and Savings Rate MUST remain completely unchanged by a Transfer
    assert.equal(afterMetrics.income, beforeMetrics.income);
    assert.equal(afterMetrics.expense, beforeMetrics.expense);
    assert.equal(afterMetrics.netBalance, beforeMetrics.netBalance);
    assert.equal(afterMetrics.savingsRate, beforeMetrics.savingsRate);

    // Transfer Volume should increase by ₹50,000
    assert.equal(afterMetrics.transfersVolume, beforeMetrics.transfersVolume + 50000);

    // Total Net Worth across all accounts should remain invariant under an internal transfer
    assert.equal(afterTotalNetWorth, beforeTotalNetWorth);

    // Individual source and target account balances must reflect the ₹50,000 debit and credit
    const iciciBefore = state.accounts.find((a) => a.id === 'acc-icici')!;
    const iciciAfter = updatedState.accounts.find((a) => a.id === 'acc-icici')!;
    const ubiBefore = state.accounts.find((a) => a.id === 'acc-ubi')!;
    const ubiAfter = updatedState.accounts.find((a) => a.id === 'acc-ubi')!;

    assert.equal(iciciAfter.currentBalance, iciciBefore.currentBalance - 50000);
    assert.equal(ubiAfter.currentBalance, ubiBefore.currentBalance + 50000);
  });

  it('supports full CRUD for transactions, accounts, and sinking funds', async () => {
    const newTx: MoneyTransaction = {
      id: 'tx-custom-expense',
      date: '2026-11-22T19:00',
      type: 'Expense',
      accountId: 'acc-sbi',
      amount: 2500,
      category: 'Medical & Health',
      subCategory: 'Doctor Consultation',
      fixedOrVariable: 'Variable',
      note: 'Routine dental cleaning',
      receiptImages: [
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      ],
      isAnomaly: false,
    };

    await saveTransaction(newTx);
    let state = await initializeAndSeedDatabase();
    assert.ok(state.transactions.some((t) => t.id === 'tx-custom-expense'));

    await deleteTransaction('tx-custom-expense');
    state = await initializeAndSeedDatabase();
    assert.ok(!state.transactions.some((t) => t.id === 'tx-custom-expense'));

    // Account update
    const sbi = state.accounts.find((a) => a.id === 'acc-sbi')!;
    await saveAccount({ ...sbi, openingBalance: 90000 });
    state = await initializeAndSeedDatabase();
    assert.equal(state.accounts.find((a) => a.id === 'acc-sbi')?.openingBalance, 90000);

    // Sinking fund CRUD
    await saveSinkingFund({
      id: 'sf-new-laptop',
      name: 'Workstation Upgrade Reserve',
      targetAmount: 120000,
      monthlyTarget: 10000,
      currentAccrued: 40000,
    });
    state = await initializeAndSeedDatabase();
    assert.ok(state.sinkingFunds.some((sf) => sf.id === 'sf-new-laptop'));

    await deleteSinkingFund('sf-new-laptop');
    state = await initializeAndSeedDatabase();
    assert.ok(!state.sinkingFunds.some((sf) => sf.id === 'sf-new-laptop'));
  });

  it('computes Daily, Weekly, and Monthly recurring dates and automatically generates due transactions on specified dates', async () => {
    // 1. Verify date progression helper across Daily, Weekly, and Monthly (including month-end clamping)
    assert.equal(computeNextRecurringDate('2026-11-05', 'Daily'), '2026-11-06');
    assert.equal(computeNextRecurringDate('2026-11-28', 'Weekly'), '2026-12-05');
    assert.equal(computeNextRecurringDate('2026-01-31', 'Monthly'), '2026-02-28');

    // 2. Create a Daily recurring rule starting 2026-11-20 through 2026-11-22 (3 occurrences)
    const dailyRule = await saveRecurringRule({
      id: 'rec-daily-commute',
      title: 'Daily Metro & Commute Pass',
      frequency: 'Daily',
      type: 'Expense',
      accountId: 'acc-cash',
      amount: 120,
      category: 'Lifestyle & Shopping',
      subCategory: 'Metro Transit',
      fixedOrVariable: 'Variable',
      note: 'Automated daily metro recharge',
      startDate: '2026-11-20',
      nextRunDate: '2026-11-20',
      endDate: '2026-11-22',
      timeOfDay: '08:15',
      active: true,
    });
    assert.equal(dailyRule.id, 'rec-daily-commute');

    // 3. Process all due rules up to 2026-11-25
    const runResult = await processDueRecurringRules('2026-11-25');
    const commuteTxs = runResult.generatedTransactions.filter((t) =>
      t.id.startsWith('tx-rec-rec-daily-commute-')
    );
    // Should generate exactly 3 occurrences: Nov 20, Nov 21, Nov 22 and then deactivate past endDate
    assert.equal(commuteTxs.length, 3);
    assert.equal(commuteTxs[0].date, '2026-11-20T08:15');
    assert.equal(commuteTxs[1].date, '2026-11-21T08:15');
    assert.equal(commuteTxs[2].date, '2026-11-22T08:15');

    // Re-running for the same cutoff date must be idempotent (0 duplicate entries)
    const secondRun = await processDueRecurringRules('2026-11-25');
    assert.equal(secondRun.generatedTransactions.length, 0);

    // 4. Test manual trigger of a single occurrence via triggerRecurringRuleNow
    const manualTx = await triggerRecurringRuleNow('rec-monthly-salary');
    assert.ok(manualTx);
    assert.equal(manualTx.amount, 118000);
    assert.equal(manualTx.type, 'Income');

    // Verify rule nextRunDate advanced to 2027-01-01
    const afterManualState = await initializeAndSeedDatabase();
    const updatedSalaryRule = afterManualState.recurringRules.find(
      (r) => r.id === 'rec-monthly-salary'
    );
    assert.ok(updatedSalaryRule);
    assert.equal(updatedSalaryRule.nextRunDate, '2027-01-01');

    // 5. Delete custom rule
    await deleteRecurringRule('rec-daily-commute');
    const finalState = await initializeAndSeedDatabase();
    assert.ok(!finalState.recurringRules.some((r) => r.id === 'rec-daily-commute'));
  });

  it('exports and restores JSON database backups in both replace and merge modes', async () => {
    const backup = await exportDatabaseBackup();
    assert.equal(backup.database, 'JawedMoneyManagerDB');
    assert.ok(backup.accounts.length >= 5);
    assert.ok(backup.recurringRules.length >= 5);

    // Modify backup payload and restore in replace mode
    const modifiedBackup = {
      ...backup,
      sinkingFunds: [
        {
          id: 'sf-custom-only',
          name: 'Custom Backup Provision',
          targetAmount: 50000,
          monthlyTarget: 5000,
          currentAccrued: 25000,
        },
      ],
    };

    const result = await restoreDatabaseBackup(modifiedBackup, 'replace');
    assert.equal(result.sinkingFunds.length, 1);
    assert.equal(result.sinkingFunds[0].id, 'sf-custom-only');
  });

  it('generates a multi-tab SheetJS (.xlsx) workbook with 4 sheets', async () => {
    const state = await initializeAndSeedDatabase();
    const workbook = buildMoneyManagerWorkbook({
      accounts: state.accounts,
      categories: state.categories,
      transactions: state.transactions,
      sinkingFunds: state.sinkingFunds,
      selectedMonth: '2026-11',
    });

    assert.deepEqual(workbook.SheetNames, [
      'Transactions Ledger',
      'Account Balances',
      'Monthly Summary',
      'Sinking Funds',
    ]);

    const ledgerRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(
      workbook.Sheets['Transactions Ledger']
    );
    assert.equal(ledgerRows.length, state.transactions.length);

    const accountRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(
      workbook.Sheets['Account Balances']
    );
    assert.equal(accountRows.length, state.accounts.length);
  });

  it('computes category breakdown and 6-month trend accurately', async () => {
    const state = await initializeAndSeedDatabase();
    const breakdown = calculateCategoryBreakdown(state.transactions, '2026-11');
    assert.ok(breakdown.length > 0);
    const totalPct = breakdown.reduce((sum, item) => sum + item.percentage, 0);
    assert.ok(Math.abs(totalPct - 100) < 0.5);

    const trend = calculateSixMonthTrend(state.transactions, '2026-11');
    assert.equal(trend.length, 6);
    assert.equal(trend[5].yearMonth, '2026-11');

    const twelveTrend = calculateTwelveMonthTrend(state.transactions, '2026-11');
    assert.equal(twelveTrend.length, 12);
    assert.equal(twelveTrend[0].yearMonth, '2025-12');
    assert.equal(twelveTrend[11].yearMonth, '2026-11');
    assert.ok(formatINR(118000).includes('1,18,000'));
  });

  it('exposes identical idb stores and initial seeding logic via src/db/db.js', async () => {
    const dbJs = await import('../src/db/db.js');
    assert.equal(dbJs.DB_NAME, 'JawedMoneyManagerDB');
    assert.equal(dbJs.INITIAL_ACCOUNTS.length, 5);
    assert.ok(dbJs.INITIAL_CATEGORIES.length >= 8);
    assert.ok(dbJs.INITIAL_TRANSACTIONS.length >= 8);
    assert.ok(dbJs.INITIAL_SINKING_FUNDS.length >= 2);
    assert.ok(dbJs.INITIAL_RECURRING_RULES.length >= 5);

    const seeded = await dbJs.initializeAndSeedDatabase();
    assert.equal(seeded.accounts.length, 5);
    assert.ok(seeded.categories.length >= 8);
    assert.ok(seeded.transactions.length >= 8);
    assert.ok(seeded.sinkingFunds.length >= 2);
    assert.ok(seeded.recurringRules.length >= 5);
  });

  it('parses bank statement CSVs, auto-detects columns, maps rows, and bulk-imports into the transactions store', async () => {
    const beforeState = await initializeAndSeedDatabase();
    const initialTxCount = beforeState.transactions.length;

    const parsed = parseCsvText(SAMPLE_BANK_STATEMENT_CSV);
    assert.equal(parsed.headers.length, 6);
    assert.equal(parsed.rows.length, 5);

    const mapping = autoDetectCsvMapping(parsed.headers);
    assert.equal(mapping.dateColumn, 'Date');
    assert.equal(mapping.noteColumn, 'Narration');
    assert.equal(mapping.debitColumn, 'Withdrawal Amt.');
    assert.equal(mapping.creditColumn, 'Deposit Amt.');
    assert.equal(mapping.categoryColumn, 'Category');
    assert.equal(mapping.accountColumn, 'Bank');

    const mappedTransactions = mapCsvRowsToTransactions(parsed.rows, mapping, {
      defaultAccountId: 'acc-icici',
      defaultMonth: '2026-11',
      accounts: beforeState.accounts,
      categories: beforeState.categories,
    });

    assert.equal(mappedTransactions.length, 5);
    assert.equal(mappedTransactions[0].type, 'Expense');
    assert.equal(mappedTransactions[0].amount, 845);
    assert.equal(mappedTransactions[1].type, 'Income');
    assert.equal(mappedTransactions[1].amount, 24500);
    assert.equal(mappedTransactions[1].accountId, 'acc-sbi');
    assert.equal(mappedTransactions[4].type, 'Transfer');
    assert.equal(mappedTransactions[4].amount, 10000);

    const inserted = await bulkImportTransactions(mappedTransactions);
    assert.equal(inserted.length, 5);

    const afterState = await initializeAndSeedDatabase();
    assert.equal(afterState.transactions.length, initialTxCount + 5);
  });

  it('automatically infers category and matches bank accounts when CSV statements lack explicit category columns', async () => {
    const state = await initializeAndSeedDatabase();

    const csvWithoutCategories = `Date,Narration,Withdrawal Amt.,Deposit Amt.,Bank
2026-11-20,UPI/Swiggy Instamart Fresh Groceries,845,,ICICI
2026-11-21,POS/Apollo Pharmacy Medicines,640,,UBI
2026-11-22,ACH/BESCOM Electricity Utility Bill,2180,,SBI`;

    const parsed = parseCsvText(csvWithoutCategories);
    const mapping = autoDetectCsvMapping(parsed.headers);

    const mapped = mapCsvRowsToTransactions(parsed.rows, mapping, {
      defaultAccountId: 'acc-icici',
      defaultMonth: '2026-11',
      accounts: state.accounts,
      categories: state.categories,
      historicalTransactions: state.transactions,
    });

    assert.equal(mapped.length, 3);

    // Row 1: Swiggy Instamart -> Food & Groceries, ICICI -> acc-icici
    assert.equal(mapped[0].category, 'Food & Groceries');
    assert.equal(mapped[0].accountId, 'acc-icici');

    // Row 2: Apollo Pharmacy -> Medical & Health, UBI -> acc-ubi
    assert.equal(mapped[1].category, 'Medical & Health');
    assert.equal(mapped[1].accountId, 'acc-ubi');

    // Row 3: BESCOM Electricity -> Utilities & Broadband, SBI -> acc-sbi
    assert.equal(mapped[2].category, 'Utilities & Broadband');
    assert.equal(mapped[2].accountId, 'acc-sbi');

    const imported = await bulkImportTransactions(mapped);
    assert.equal(imported.length, 3);
  });

  it('instantly filters Daily View transactions by note text or category name', async () => {
    const { filterDailyTransactions } = await import(
      '../src/components/money-manager/DailyView'
    );
    const state = await initializeAndSeedDatabase();
    const accountNameMap = new Map(state.accounts.map((a) => [a.id, a.name]));

    // 1. Filter by category name ("Rent & Housing")
    const byCategory = filterDailyTransactions(state.transactions, {
      selectedMonth: '2026-11',
      searchQuery: 'Rent & Housing',
      accountNameMap,
    });
    assert.ok(byCategory.length >= 1);
    assert.ok(byCategory.every((tx) => tx.category === 'Rent & Housing'));

    // 2. Filter by note substring ("broadband" or "payroll")
    const byNote = filterDailyTransactions(state.transactions, {
      selectedMonth: '2026-11',
      searchQuery: 'payroll',
      accountNameMap,
    });
    assert.ok(byNote.length >= 1);
    assert.ok(
      byNote.every(
        (tx) =>
          tx.note.toLowerCase().includes('payroll') ||
          tx.subCategory.toLowerCase().includes('payroll')
      )
    );

    // 3. Non-matching query returns empty array
    const noMatch = filterDailyTransactions(state.transactions, {
      selectedMonth: '2026-11',
      searchQuery: 'non-existent-keyword-xyz-999',
      accountNameMap,
    });
    assert.equal(noMatch.length, 0);
  });

  it('evaluates category budget alerts against user-defined thresholds and persists updated limits', async () => {
    const { evaluateCategoryBudgetAlerts } = await import(
      '../src/components/money-manager/StatsView'
    );
    const { saveCategory } = await import('../src/db/db');

    const state = await initializeAndSeedDatabase();

    // 1. Default seeded thresholds: Medical & Health spent ₹7,850 vs ₹5,000 limit -> Over Budget
    const initialAlerts = evaluateCategoryBudgetAlerts(
      state.transactions,
      '2026-11',
      state.categories
    );
    assert.equal(initialAlerts.alertSeverity, 'critical');
    assert.equal(initialAlerts.totalOverBudgetAmount, 2850);
    assert.ok(initialAlerts.highestOverageCategory);
    assert.equal(initialAlerts.highestOverageCategory.category, 'Medical & Health');

    const medicalAlert = initialAlerts.exceededCategories.find(
      (item) => item.category === 'Medical & Health'
    );
    assert.ok(medicalAlert);
    assert.equal(medicalAlert.amount, 7850);
    assert.equal(medicalAlert.monthlyBudget, 5000);
    assert.equal(medicalAlert.isOverBudget, true);
    assert.equal(medicalAlert.overBudgetAmount, 2850);

    // Near-limit detection: Rent & Housing spent ₹22,000 vs ₹24,000 limit (91.7% >= 85%)
    const rentNearAlert = initialAlerts.nearLimitCategories.find(
      (item) => item.category === 'Rent & Housing'
    );
    assert.ok(rentNearAlert);
    assert.equal(rentNearAlert.isOverBudget, false);
    assert.equal(rentNearAlert.budgetUtilizationPercent, 91.7);

    // 2. Uniform user-defined threshold of ₹4,000 flags all categories spending > ₹4,000
    const uniformAlerts = evaluateCategoryBudgetAlerts(state.transactions, '2026-11', 4000);
    assert.equal(uniformAlerts.alertSeverity, 'critical');
    assert.ok(uniformAlerts.exceededCategories.length >= 4);
    assert.ok(uniformAlerts.totalOverBudgetAmount > 20000);
    assert.ok(
      uniformAlerts.exceededCategories.every(
        (item) => item.amount > 4000 && item.isOverBudget === true
      )
    );

    // 3. Persist updated category threshold via saveCategory
    const foodCat = state.categories.find((c) => c.name === 'Food & Groceries');
    assert.ok(foodCat);
    await saveCategory({ ...foodCat, monthlyBudget: 3000 });

    const updatedState = await initializeAndSeedDatabase();
    const afterUpdateAlerts = evaluateCategoryBudgetAlerts(
      updatedState.transactions,
      '2026-11',
      updatedState.categories
    );
    const foodAlert = afterUpdateAlerts.exceededCategories.find(
      (item) => item.category === 'Food & Groceries'
    );
    assert.ok(foodAlert);
    assert.equal(foodAlert.monthlyBudget, 3000);
    assert.equal(foodAlert.overBudgetAmount, 450);
    assert.equal(afterUpdateAlerts.totalOverBudgetAmount, 2850 + 450);

    // 4. Resolving all over-budget thresholds transitions alertSeverity from 'critical' to 'warning'
    const resolvedAlerts = evaluateCategoryBudgetAlerts(
      updatedState.transactions,
      '2026-11',
      {
        'Medical & Health': 10000,
        'Food & Groceries': 6000,
        'Rent & Housing': 24000,
      },
      updatedState.categories
    );
    assert.equal(resolvedAlerts.exceededCategories.length, 0);
    assert.equal(resolvedAlerts.totalOverBudgetAmount, 0);
    assert.equal(resolvedAlerts.alertSeverity, 'warning');
  });

  it('triggers automatic 95% budget limit alerts when category spending approaches or exceeds 95% threshold', async () => {
    const { evaluate95PercentBudgetAlerts, computeMonthlyBudgetPlan } = await import(
      '../src/components/money-manager/StatsView'
    );
    const state = await initializeAndSeedDatabase();

    // 1. Initial seeded state: Medical & Health is at 157% (>95%) and Rent & Housing is at 91.7% (<95%)
    const initial95 = evaluate95PercentBudgetAlerts(
      state.transactions,
      '2026-11',
      state.categories
    );
    assert.ok(initial95.has95PercentWarning);
    assert.ok(
      initial95.warning95Categories.some((i) => i.category === 'Medical & Health')
    );
    assert.ok(
      initial95.alertMessages.some((msg) => msg.includes('Medical & Health'))
    );
    assert.ok(
      !initial95.warning95Categories.some((i) => i.category === 'Rent & Housing')
    );

    // 2. Record an additional expense of ₹1,000 in Rent & Housing (pushing spend from ₹22,000 to ₹23,000 / ₹24,000 = 95.8%)
    await saveTransaction({
      id: 'tx-rent-topup-95',
      date: '2026-11-20T11:00',
      type: 'Expense',
      accountId: 'acc-icici',
      amount: 1000,
      category: 'Rent & Housing',
      subCategory: 'Apartment Maintenance Top-up',
      fixedOrVariable: 'Fixed',
      note: 'Additional maintenance charge',
      receiptImages: [],
      isAnomaly: false,
    });

    const updatedState = await initializeAndSeedDatabase();
    const updated95 = evaluate95PercentBudgetAlerts(
      updatedState.transactions,
      '2026-11',
      updatedState.categories
    );

    assert.ok(updated95.has95PercentWarning);
    const rentItem = updated95.warning95Categories.find(
      (i) => i.category === 'Rent & Housing'
    );
    assert.ok(rentItem);
    assert.equal(rentItem.spent, 23000);
    assert.equal(rentItem.monthlyLimit, 24000);
    assert.equal(rentItem.utilizationPercent, 95.8);
    assert.equal(rentItem.isExceeding95Percent, true);

    const rentAlertMsg = updated95.alertMessages.find((msg) =>
      msg.includes('Rent & Housing')
    );
    assert.ok(rentAlertMsg);
    assert.ok(rentAlertMsg.includes('95.8%'));
    assert.ok(rentAlertMsg.includes('23,000'));
  });

  it('formats all ledger transactions into a standard accounting CSV table for Download CSV', async () => {
    const {
      formatTransactionsToCsv,
      exportTransactionsCsvFromDb,
    } = await import('../src/components/money-manager/BackupRestoreModal');
    const state = await initializeAndSeedDatabase();

    const csvText = formatTransactionsToCsv(state.transactions, state.accounts);
    assert.ok(csvText.length > 100);

    const dbExport = await exportTransactionsCsvFromDb('2026-11');
    assert.equal(dbExport.transactionCount, state.transactions.length);
    assert.equal(dbExport.csvContent, csvText);

    const parsed = parseCsvText(csvText);
    assert.deepEqual(parsed.headers, [
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
    ]);
    assert.equal(parsed.rows.length, state.transactions.length);

    // Verify Income row populates Deposit Amt. and Expense row populates Withdrawal Amt.
    const salaryRow = parsed.rows.find((r) => r['Transaction ID'] === 'tx-2026-11-01-salary');
    assert.ok(salaryRow);
    assert.equal(salaryRow['Type'], 'Income');
    assert.equal(salaryRow['Account / Bank'], 'ICICI');
    assert.equal(salaryRow['Deposit Amt.'], '118000');
    assert.equal(salaryRow['Withdrawal Amt.'], '');

    const rentRow = parsed.rows.find((r) => r['Transaction ID'] === 'tx-2026-11-01-rent');
    assert.ok(rentRow);
    assert.equal(rentRow['Type'], 'Expense');
    assert.equal(rentRow['Withdrawal Amt.'], '22000');
    assert.equal(rentRow['Deposit Amt.'], '');
  });

  it('assigns custom colors to spending categories in Category Manager and reflects them in StatsView Donut and Bar chart breakdowns', async () => {
    const { evaluateCategoryBudgetAlerts } = await import(
      '../src/components/money-manager/StatsView'
    );
    const { saveCategory, calculateCategoryBreakdown } = await import('../src/db/db');

    const state = await initializeAndSeedDatabase();
    const rentCat = state.categories.find((c) => c.name === 'Rent & Housing');
    const foodCat = state.categories.find((c) => c.name === 'Food & Groceries');
    assert.ok(rentCat);
    assert.ok(foodCat);

    // Assign custom colors via saveCategory
    await saveCategory({ ...rentCat, color: '#e11d48' });
    await saveCategory({ ...foodCat, color: '#06b6d4' });

    const updatedState = await initializeAndSeedDatabase();
    const breakdown = calculateCategoryBreakdown(
      updatedState.transactions,
      '2026-11',
      updatedState.categories
    );

    const rentChartEntry = breakdown.find((b) => b.category === 'Rent & Housing');
    const foodChartEntry = breakdown.find((b) => b.category === 'Food & Groceries');
    assert.ok(rentChartEntry);
    assert.ok(foodChartEntry);
    assert.equal(rentChartEntry.color, '#e11d48');
    assert.equal(foodChartEntry.color, '#06b6d4');

    // Also verify evaluateCategoryBudgetAlerts preserves custom colors even when numeric threshold is passed
    const alertResult = evaluateCategoryBudgetAlerts(
      updatedState.transactions,
      '2026-11',
      5000,
      updatedState.categories
    );
    assert.equal(
      alertResult.breakdown.find((b) => b.category === 'Rent & Housing')?.color,
      '#e11d48'
    );
    assert.equal(
      alertResult.breakdown.find((b) => b.category === 'Food & Groceries')?.color,
      '#06b6d4'
    );
  });

  it('computes monthly budget planning items for all Expense categories and updates real-time progress against custom limits', async () => {
    const {
      computeMonthlyBudgetPlan,
      computeIncomeBasedBudgetAllocation,
    } = await import('../src/components/money-manager/StatsView');
    const { saveCategory } = await import('../src/db/db');

    const state = await initializeAndSeedDatabase();
    const expenseCategories = state.categories.filter((c) => c.type === 'Expense');

    // 1. Compute initial monthly budget plan for 2026-11
    const plan = computeMonthlyBudgetPlan(state.transactions, '2026-11', state.categories);
    assert.equal(plan.items.length, expenseCategories.length);
    assert.ok(plan.totalBudgeted > 0);
    assert.ok(plan.totalSpent > 0);

    // Verify category with ₹0 spending in 2026-11 (Lifestyle & Family) is still included in the budget planner
    const lifestylePlan = plan.items.find((i) => i.category === 'Lifestyle & Family');
    assert.ok(lifestylePlan);
    assert.equal(lifestylePlan.spent, 0);
    assert.equal(lifestylePlan.monthlyLimit, 8000);
    assert.equal(lifestylePlan.remaining, 8000);
    assert.equal(lifestylePlan.utilizationPercent, 0);
    assert.ok(lifestylePlan.shareOfTotalBudgetPercent > 0);
    assert.equal(lifestylePlan.dailySafeSpend, 800);
    assert.equal(lifestylePlan.status, 'on-track');

    // Verify Medical & Health is flagged as 'over' (spent ₹7,850 vs ₹5,000 limit)
    const medicalPlan = plan.items.find((i) => i.category === 'Medical & Health');
    assert.ok(medicalPlan);
    assert.equal(medicalPlan.spent, 7850);
    assert.equal(medicalPlan.monthlyLimit, 5000);
    assert.equal(medicalPlan.overage, 2850);
    assert.equal(medicalPlan.status, 'over');

    // Verify Rent & Housing is flagged as 'near' (spent ₹22,000 vs ₹24,000 limit -> 91.7%)
    const rentPlan = plan.items.find((i) => i.category === 'Rent & Housing');
    assert.ok(rentPlan);
    assert.equal(rentPlan.spent, 22000);
    assert.equal(rentPlan.monthlyLimit, 24000);
    assert.equal(rentPlan.remaining, 2000);
    assert.equal(rentPlan.utilizationPercent, 91.7);
    assert.equal(rentPlan.status, 'near');

    // 2. Increase Medical & Health limit to ₹10,000 and verify real-time status shifts to 'on-track'
    const medicalCat = state.categories.find((c) => c.name === 'Medical & Health');
    assert.ok(medicalCat);
    await saveCategory({ ...medicalCat, monthlyBudget: 10000 });

    const updatedState = await initializeAndSeedDatabase();
    const updatedPlan = computeMonthlyBudgetPlan(
      updatedState.transactions,
      '2026-11',
      updatedState.categories
    );

    const updatedMedical = updatedPlan.items.find((i) => i.category === 'Medical & Health');
    assert.ok(updatedMedical);
    assert.equal(updatedMedical.monthlyLimit, 10000);
    assert.equal(updatedMedical.remaining, 2150);
    assert.equal(updatedMedical.overage, 0);
    assert.equal(updatedMedical.utilizationPercent, 78.5);
    assert.equal(updatedMedical.status, 'on-track');

    // 3. Verify Fixed vs. Variable budget split and real-time threshold overrides
    assert.equal(
      updatedPlan.fixedBudgeted + updatedPlan.variableBudgeted,
      updatedPlan.totalBudgeted
    );
    assert.equal(
      updatedPlan.fixedSpent + updatedPlan.variableSpent,
      updatedPlan.totalSpent
    );
    assert.ok(updatedPlan.fixedUtilizationPercent > 0);
    assert.ok(updatedPlan.variableUtilizationPercent > 0);

    const overridePlan = computeMonthlyBudgetPlan(
      updatedState.transactions,
      '2026-11',
      updatedState.categories,
      { 'Rent & Housing': 25000 }
    );
    const overriddenRent = overridePlan.items.find((i) => i.category === 'Rent & Housing');
    assert.ok(overriddenRent);
    assert.equal(overriddenRent.monthlyLimit, 25000);
    assert.equal(overriddenRent.remaining, 3000);
    assert.equal(overriddenRent.utilizationPercent, 88);
    assert.equal(overriddenRent.status, 'near');

    // 4. Verify 50/30/20 income-based smart budget allocation
    const smartAllocation = computeIncomeBasedBudgetAllocation(120000, updatedPlan.items);
    assert.ok(smartAllocation['Rent & Housing'] > 0);
    assert.ok(smartAllocation['Food & Groceries'] > 0);
  });

  it('aggregates attached transaction receipts into a searchable Receipt Gallery grid and supports attaching and deleting receipt images', async () => {
    const { aggregateTransactionReceipts } = await import(
      '../src/components/money-manager/DailyView'
    );
    const {
      attachReceiptToTransaction,
      removeReceiptFromTransaction,
      SAMPLE_RECEIPT_DATA_URL,
    } = await import('../src/db/db');

    const state = await initializeAndSeedDatabase();
    const accountNameMap = new Map(state.accounts.map((a) => [a.id, a.name]));

    // 1. Seeded transactions include the grocery receipt on tx-2026-11-02-groceries
    const initialReceipts = aggregateTransactionReceipts(state.transactions, {
      selectedMonth: '2026-11',
      accountNameMap,
    });
    assert.equal(initialReceipts.length, 1);
    assert.equal(initialReceipts[0].transactionId, 'tx-2026-11-02-groceries');
    assert.equal(initialReceipts[0].category, 'Food & Groceries');
    assert.equal(initialReceipts[0].accountName, 'ICICI');

    // 2. Attach an additional receipt image to tx-2026-11-01-rent
    const updatedRentTx = await attachReceiptToTransaction(
      'tx-2026-11-01-rent',
      SAMPLE_RECEIPT_DATA_URL
    );
    assert.ok(updatedRentTx);
    assert.equal(updatedRentTx.receiptImages.length, 1);

    const stateAfterAttach = await initializeAndSeedDatabase();
    const allReceipts = aggregateTransactionReceipts(stateAfterAttach.transactions, {
      selectedMonth: '2026-11',
      accountNameMap,
    });
    assert.equal(allReceipts.length, 2);

    // 3. Search filter in Receipt Gallery by note/category ("Rent & Housing")
    const searchedReceipts = aggregateTransactionReceipts(stateAfterAttach.transactions, {
      selectedMonth: '2026-11',
      searchQuery: 'Rent & Housing',
      accountNameMap,
    });
    assert.equal(searchedReceipts.length, 1);
    assert.equal(searchedReceipts[0].transactionId, 'tx-2026-11-01-rent');

    // 4. Delete the receipt image from tx-2026-11-01-rent and verify removal
    const afterRemoveTx = await removeReceiptFromTransaction('tx-2026-11-01-rent', 0);
    assert.ok(afterRemoveTx);
    assert.equal(afterRemoveTx.receiptImages.length, 0);

    const stateAfterDelete = await initializeAndSeedDatabase();
    const finalReceipts = aggregateTransactionReceipts(stateAfterDelete.transactions, {
      selectedMonth: '2026-11',
      accountNameMap,
    });
    assert.equal(finalReceipts.length, 1);
    assert.equal(finalReceipts[0].transactionId, 'tx-2026-11-02-groceries');
  });

  it('generates a Bulk CSV Export containing the full multi-month history of ledger transactions for external accounting software', async () => {
    const {
      generateBulkLedgerCsvExport,
      exportBulkLedgerHistoryCsvFromDb,
    } = await import('../src/components/money-manager/BackupRestoreModal');

    const initialState = await initializeAndSeedDatabase();

    // Add a historical May 2026 transaction to verify full multi-month history export
    await saveTransaction({
      id: 'tx-2026-05-15-audit',
      date: '2026-05-15T10:30',
      amount: 14500,
      type: 'Income',
      category: 'Freelance & Consulting',
      subCategory: 'Web Architecture Audit',
      accountId: 'acc-sbi',
      fixedOrVariable: 'Variable',
      note: 'May milestone invoice payment',
      isAnomaly: false,
      receiptImages: [],
      createdAt: '2026-05-15T10:30:00.000Z',
    });

    // 1. Export full history from IndexedDB across all months (2026-05 through 2026-11)
    const fullHistoryExport = await exportBulkLedgerHistoryCsvFromDb({
      scope: 'full-history',
      sortOrder: 'asc',
    });

    assert.equal(fullHistoryExport.transactionCount, initialState.transactions.length + 1);
    assert.equal(fullHistoryExport.earliestDate, '2026-05-15');
    assert.equal(fullHistoryExport.latestDate, '2026-11-02');
    assert.equal(
      fullHistoryExport.fileName,
      'jawed-money-manager-bulk-ledger-full-history.csv'
    );
    assert.ok(fullHistoryExport.totalIncome > 118000);
    assert.ok(fullHistoryExport.totalExpense > 0);
    assert.ok(fullHistoryExport.totalTransfers > 0);

    // Verify chronological ordering (oldest May entry appears first) and accounting columns
    const parsedFull = parseCsvText(fullHistoryExport.csvContent);
    assert.equal(parsedFull.rows.length, initialState.transactions.length + 1);
    assert.equal(parsedFull.rows[0]['Date'], '2026-05-15');
    assert.equal(parsedFull.rows[0]['Account / Bank'], 'SBI');
    assert.equal(parsedFull.rows[0]['Deposit Amt.'], '14500');
    assert.equal(parsedFull.rows[0]['Narration'], 'May milestone invoice payment');

    // 2. Verify account filter in generateBulkLedgerCsvExport
    const updatedState = await initializeAndSeedDatabase();
    const sbiOnlyExport = generateBulkLedgerCsvExport(
      updatedState.transactions,
      updatedState.accounts,
      {
        scope: 'full-history',
        accountId: 'acc-sbi',
        sortOrder: 'desc',
      }
    );
    assert.ok(sbiOnlyExport.transactionCount >= 2);
    const parsedSbi = parseCsvText(sbiOnlyExport.csvContent);
    assert.ok(
      parsedSbi.rows.every(
        (r) => r['Account / Bank'] === 'SBI' || r['Target Account'] === 'SBI'
      )
    );
  });

  it('exports monthly budget data and real-time spending progress as a structured CSV file for external tracking', async () => {
    const {
      computeMonthlyBudgetPlan,
      formatMonthlyBudgetPlanToCsv,
      generateMonthlyBudgetCsvExport,
      MONTHLY_BUDGET_CSV_HEADERS,
    } = await import('../src/components/money-manager/StatsView');

    const state = await initializeAndSeedDatabase();
    const plan = computeMonthlyBudgetPlan(state.transactions, '2026-11', state.categories);

    // 1. Export without summary row
    const rawCsv = formatMonthlyBudgetPlanToCsv(plan, '2026-11');
    const parsedRaw = parseCsvText(rawCsv);
    assert.deepEqual(parsedRaw.headers, [...MONTHLY_BUDGET_CSV_HEADERS]);
    assert.equal(parsedRaw.rows.length, plan.items.length);

    const medicalRow = parsedRaw.rows.find((r) => r['Category'] === 'Medical & Health');
    assert.ok(medicalRow);
    assert.equal(medicalRow['Month'], '2026-11');
    assert.equal(medicalRow['Monthly Limit (INR)'], '5000');
    assert.equal(medicalRow['Actual Spent (INR)'], '7850');
    assert.equal(medicalRow['Overage Amount (INR)'], '2850');
    assert.equal(medicalRow['Budget Status'], 'Over Budget');

    const rentRow = parsedRaw.rows.find((r) => r['Category'] === 'Rent & Housing');
    assert.ok(rentRow);
    assert.equal(rentRow['Expense Type'], 'Fixed');
    assert.equal(rentRow['Monthly Limit (INR)'], '24000');
    assert.equal(rentRow['Actual Spent (INR)'], '22000');
    assert.equal(rentRow['Remaining Headroom (INR)'], '2000');
    assert.equal(rentRow['Budget Status'], 'Near Limit');

    // 2. Generate full export payload with summary row included
    const exportPayload = generateMonthlyBudgetCsvExport(plan, '2026-11', {
      includeSummaryRow: true,
    });
    assert.equal(
      exportPayload.fileName,
      'jawed-money-manager-budget-plan-2026-11.csv'
    );
    assert.equal(exportPayload.categoryCount, plan.items.length);
    assert.equal(exportPayload.overBudgetCount, 1);
    assert.equal(exportPayload.totalBudgeted, plan.totalBudgeted);
    assert.equal(exportPayload.totalSpent, plan.totalSpent);

    const parsedWithSummary = parseCsvText(exportPayload.csvContent);
    assert.equal(parsedWithSummary.rows.length, plan.items.length + 1);
    const summaryRow = parsedWithSummary.rows[parsedWithSummary.rows.length - 1];
    assert.equal(summaryRow['Category ID'], 'TOTAL-SUMMARY');
    assert.equal(summaryRow['Category'], 'Total Monthly Budget Summary');
    assert.equal(summaryRow['Monthly Limit (INR)'], String(plan.totalBudgeted));
    assert.equal(summaryRow['Actual Spent (INR)'], String(plan.totalSpent));
  });

  it('computes 6-month Cash Flow (Income vs. Expenses & Net Cash Flow) trend data for the StatsView Recharts visualization', async () => {
    const { computeSixMonthCashFlowTrend } = await import(
      '../src/components/money-manager/StatsView'
    );

    const state = await initializeAndSeedDatabase();
    const cashFlow = computeSixMonthCashFlowTrend(state.transactions, '2026-11');

    // 1. Must cover exactly the last 6 months ending at 2026-11 (2026-06 through 2026-11)
    assert.equal(cashFlow.points.length, 6);
    assert.equal(cashFlow.points[0].yearMonth, '2026-06');
    assert.equal(cashFlow.points[5].yearMonth, '2026-11');
    assert.equal(cashFlow.points[5].label, "Nov '26");

    // 2. Verify aggregate 6-month totals match the sum of individual monthly points
    const sumIncome = cashFlow.points.reduce((acc, p) => acc + p.income, 0);
    const sumExpense = cashFlow.points.reduce((acc, p) => acc + p.expense, 0);
    const sumNet = cashFlow.points.reduce((acc, p) => acc + p.net, 0);

    assert.equal(cashFlow.totalSixMonthIncome, sumIncome);
    assert.equal(cashFlow.totalSixMonthExpense, sumExpense);
    assert.equal(cashFlow.totalSixMonthNet, sumNet);
    assert.equal(cashFlow.points[5].cumulativeNet, sumNet);
    assert.equal(cashFlow.surplusMonthsCount, 6);
    assert.equal(cashFlow.deficitMonthsCount, 0);
    assert.ok(cashFlow.averageSavingsRate > 40);
    assert.ok(cashFlow.peakIncomeMonth);
    assert.ok(cashFlow.peakExpenseMonth);
  });

  it('automatically categorizes new transactions using the ML Naive Bayes + weighted keyword-rule engine', async () => {
    const {
      predictTransactionCategory,
      autoCategorizeTransactionInput,
    } = await import('../src/components/money-manager/mlCategorizer');

    const state = await initializeAndSeedDatabase();

    // 1. Keyword rule classification across common merchant & bill descriptions
    const foodPred = predictTransactionCategory('UPI/Swiggy Instamart Fresh Groceries & Milk', {
      txType: 'Expense',
      historicalTransactions: state.transactions,
      categories: state.categories,
    });
    assert.equal(foodPred.category, 'Food & Groceries');
    assert.ok(foodPred.confidence >= 70);
    assert.ok(foodPred.matchedKeywords.includes('swiggy') || foodPred.matchedKeywords.includes('groceries'));

    const utilityPred = predictTransactionCategory('ACH BESCOM Electricity Bill & JioFiber Broadband', {
      txType: 'Expense',
      historicalTransactions: state.transactions,
      categories: state.categories,
    });
    assert.equal(utilityPred.category, 'Utilities & Broadband');
    assert.equal(utilityPred.fixedOrVariable, 'Fixed');
    assert.ok(utilityPred.confidence >= 75);

    const medicalPred = predictTransactionCategory('POS Apollo Pharmacy cough syrup and medicines', {
      txType: 'Expense',
      historicalTransactions: state.transactions,
      categories: state.categories,
    });
    assert.equal(medicalPred.category, 'Medical & Health');
    assert.equal(medicalPred.subCategory, 'Pharmacy & Medicines');

    const fuelPred = predictTransactionCategory('Indian Oil Petrol Pump full tank fuel refill', {
      txType: 'Expense',
      historicalTransactions: state.transactions,
      categories: state.categories,
    });
    assert.equal(fuelPred.category, 'Transport & Fuel');
    assert.equal(fuelPred.subCategory, 'Petrol / Fuel');

    // 2. Naive Bayes learning from historical transactions for novel description keywords
    const customHistory: MoneyTransaction[] = [
      ...state.transactions,
      {
        id: 'tx-ml-train-1',
        date: '2026-11-01T10:00',
        type: 'Expense',
        accountId: 'acc-icici',
        amount: 4200,
        category: 'Education',
        subCategory: 'Technical Certifications',
        fixedOrVariable: 'Variable',
        note: 'KubeCon CloudNative Kubernetes Lab Voucher',
        receiptImages: [],
        isAnomaly: false,
      },
    ];

    const learnedPred = predictTransactionCategory('KubeCon CloudNative exam registration', {
      txType: 'Expense',
      historicalTransactions: customHistory,
      categories: state.categories,
    });
    assert.equal(learnedPred.category, 'Education');
    assert.equal(learnedPred.source, 'ml-naive-bayes');
    assert.ok(learnedPred.matchedKeywords.includes('kubecon'));

    // 3. Custom user rule priority override
    const customRulePred = predictTransactionCategory('Decathlon badminton racquet strings', {
      txType: 'Expense',
      historicalTransactions: state.transactions,
      categories: state.categories,
      customRules: [
        {
          id: 'custom-sports-1',
          type: 'Expense',
          category: 'Medical & Health',
          subCategory: 'Fitness & Sports',
          fixedOrVariable: 'Variable',
          keywords: ['decathlon', 'badminton'],
          weight: 2.0,
          isCustom: true,
        },
      ],
    });
    assert.equal(customRulePred.category, 'Medical & Health');
    assert.equal(customRulePred.source, 'custom-rule');

    // 4. Auto-categorize new transaction input payload
    const autoResult = autoCategorizeTransactionInput(
      {
        date: '2026-11-25T14:00',
        type: 'Expense',
        accountId: 'acc-icici',
        amount: 22000,
        category: 'Lifestyle & Family',
        subCategory: '',
        fixedOrVariable: 'Variable',
        note: 'Monthly apartment rent to landlord',
        receiptImages: [],
        isAnomaly: false,
      },
      {
        historicalTransactions: state.transactions,
        categories: state.categories,
      }
    );
    assert.equal(autoResult.transaction.category, 'Rent & Housing');
    assert.equal(autoResult.transaction.subCategory, 'Apartment Rent');
    assert.equal(autoResult.transaction.fixedOrVariable, 'Fixed');
  });

  it('forecasts month-end Projected Spending per category based on transaction history and daily burn velocity', async () => {
    const {
      computeMonthlyBudgetPlan,
      computeProjectedSpendingForecast,
    } = await import('../src/components/money-manager/StatsView');

    const state = await initializeAndSeedDatabase();

    // 1. Early-month projection at Day 5 of 30 in November 2026
    const forecast = computeProjectedSpendingForecast(
      state.transactions,
      '2026-11',
      state.categories,
      { 'Food & Groceries': 6000 },
      { referenceDayOfMonth: 5 }
    );

    assert.equal(forecast.daysInMonth, 30);
    assert.equal(forecast.daysElapsed, 5);
    assert.equal(forecast.daysRemaining, 25);
    assert.ok(forecast.totalProjectedSpend >= forecast.totalSpent);
    assert.ok(forecast.projectedOverBudgetCount >= 2);

    // Food & Groceries: currently spent ₹3,450 vs ₹6,000 limit (status === 'on-track'),
    // but at Day 5 of 30 pace + historical average, projected to exceed ₹6,000 by month-end
    const foodItem = forecast.items.find((i) => i.category === 'Food & Groceries');
    assert.ok(foodItem);
    assert.equal(foodItem.status, 'on-track');
    assert.ok(foodItem.dailyBurnRate > 0);
    assert.ok(foodItem.historicalMonthlyAvg > 0);
    assert.ok(foodItem.projectedSpend > foodItem.monthlyLimit);
    assert.equal(foodItem.forecastStatus, 'projected-over');
    assert.ok(foodItem.projectedOverage > 0);

    // Rent & Housing (Fixed): single recurring rent payment of ₹22,000 stays within ₹24,000 limit
    const rentItem = forecast.items.find((i) => i.category === 'Rent & Housing');
    assert.ok(rentItem);
    assert.equal(rentItem.defaultFixedOrVariable, 'Fixed');
    assert.equal(rentItem.projectedSpend, 22000);
    assert.equal(rentItem.forecastStatus, 'at-risk'); // 91.7% utilization

    // 2. Late-month simulation (Day 28 of 30) against default ₹16,000 Food & Groceries limit:
    // lower daily burn rate keeps Food & Groceries comfortably on-track
    const lateMonthForecast = computeMonthlyBudgetPlan(
      state.transactions,
      '2026-11',
      state.categories,
      undefined,
      { referenceDayOfMonth: 28 }
    );
    const lateFoodItem = lateMonthForecast.items.find((i) => i.category === 'Food & Groceries');
    assert.ok(lateFoodItem);
    assert.ok(lateFoodItem.projectedSpend < foodItem.projectedSpend);
    assert.ok(lateFoodItem.projectedSpend <= lateFoodItem.monthlyLimit);
    assert.equal(lateFoodItem.forecastStatus, 'on-track');
  });

  it('defines recurring transactions across frequencies and automatically surfaces them in the monthly feed', async () => {
    const {
      computeRecurringOccurrencesForMonth,
      buildRecurringFeedTransactionsForMonth,
      syncRecurringTransactionsForMonth,
    } = await import('../src/db/db');
    const { filterDailyTransactions } = await import(
      '../src/components/money-manager/DailyView'
    );

    const state = await initializeAndSeedDatabase();

    // 1. Verify extended frequencies in computeNextRecurringDate
    assert.equal(computeNextRecurringDate('2026-11-01', 'Bi-Weekly'), '2026-11-15');
    assert.equal(computeNextRecurringDate('2026-11-15', 'Quarterly'), '2027-02-15');
    assert.equal(computeNextRecurringDate('2026-11-10', 'Yearly'), '2027-11-10');

    // 2. Define a new Monthly subscription rule and a Bi-Weekly recurring expense rule
    const netflixRule = await saveRecurringRule({
      id: 'rec-monthly-netflix-cloud',
      title: 'Netflix & Cloud Storage Subscription',
      frequency: 'Monthly',
      type: 'Expense',
      accountId: 'acc-card',
      amount: 849,
      category: 'Lifestyle & Family',
      subCategory: 'Subscriptions',
      fixedOrVariable: 'Fixed',
      note: 'Monthly streaming & cloud backup subscription',
      startDate: '2026-11-12',
      nextRunDate: '2026-11-12',
      timeOfDay: '10:30',
      active: true,
    });

    const biWeeklyRule = await saveRecurringRule({
      id: 'rec-biweekly-cleaning',
      title: 'Bi-Weekly Deep Home Cleaning',
      frequency: 'Bi-Weekly',
      type: 'Expense',
      accountId: 'acc-cash',
      amount: 900,
      category: 'Rent & Housing',
      subCategory: 'Society Maintenance',
      fixedOrVariable: 'Fixed',
      note: 'Bi-weekly apartment cleaning service',
      startDate: '2026-11-03',
      nextRunDate: '2026-11-03',
      timeOfDay: '11:00',
      active: true,
    });

    // 3. Verify occurrence dates within 2026-11 and 2026-12
    assert.deepEqual(computeRecurringOccurrencesForMonth(netflixRule, '2026-11'), ['2026-11-12']);
    assert.deepEqual(computeRecurringOccurrencesForMonth(netflixRule, '2026-12'), ['2026-12-12']);
    assert.deepEqual(computeRecurringOccurrencesForMonth(biWeeklyRule, '2026-11'), [
      '2026-11-03',
      '2026-11-17',
    ]);

    // 4. Verify recurring entries automatically appear in the monthly feed (DailyView)
    const afterRuleState = await initializeAndSeedDatabase();
    const feedNov = filterDailyTransactions(afterRuleState.transactions, {
      selectedMonth: '2026-11',
      recurringRules: afterRuleState.recurringRules,
    });

    const netflixInNovFeed = feedNov.find(
      (tx) => tx.recurringRuleId === 'rec-monthly-netflix-cloud'
    );
    assert.ok(netflixInNovFeed, 'Expected Monthly Netflix subscription to appear in Nov feed');
    assert.equal(netflixInNovFeed.amount, 849);
    assert.equal(netflixInNovFeed.date, '2026-11-12T10:30');

    const cleaningInNovFeed = feedNov.filter(
      (tx) => tx.recurringRuleId === 'rec-biweekly-cleaning'
    );
    assert.equal(cleaningInNovFeed.length, 2, 'Expected 2 Bi-Weekly occurrences in Nov feed');

    // Also verify future month feed (2026-12) automatically displays repeating entries
    const feedDec = buildRecurringFeedTransactionsForMonth(
      afterRuleState.transactions,
      afterRuleState.recurringRules,
      '2026-12'
    ).filter((tx) => tx.date.startsWith('2026-12'));
    assert.ok(
      feedDec.some((tx) => tx.recurringRuleId === 'rec-monthly-netflix-cloud'),
      'Expected Monthly subscription to automatically repeat in Dec 2026 feed'
    );
    assert.ok(
      feedDec.some((tx) => tx.recurringRuleId === 'rec-monthly-rent'),
      'Expected Monthly rent to automatically repeat in Dec 2026 feed'
    );

    // 5. Verify RECURRING_ONLY filter in DailyView
    const recurringOnlyNov = filterDailyTransactions(afterRuleState.transactions, {
      selectedMonth: '2026-11',
      recurringRules: afterRuleState.recurringRules,
      recurringFilter: 'RECURRING_ONLY',
    });
    assert.ok(recurringOnlyNov.length >= 5);
    assert.ok(
      recurringOnlyNov.every(
        (tx) =>
          Boolean(tx.recurringRuleId) ||
          tx.id.startsWith('tx-rec-') ||
          /\[(?:Auto-)?Recurring/i.test(tx.note || '')
      )
    );

    // 6. Sync recurring transactions for 2026-11 into IndexedDB and verify no duplicates in feed
    const syncRes = await syncRecurringTransactionsForMonth('2026-11');
    assert.ok(syncRes.generatedTransactions.length >= 3);

    const syncedState = await initializeAndSeedDatabase();
    const postSyncFeed = filterDailyTransactions(syncedState.transactions, {
      selectedMonth: '2026-11',
      recurringRules: syncedState.recurringRules,
    });
    assert.equal(
      postSyncFeed.filter((tx) => tx.recurringRuleId === 'rec-monthly-netflix-cloud').length,
      1,
      'Expected exactly 1 Netflix entry in Nov feed after syncing to IndexedDB'
    );
  });

  it('extracts merchant, date, and amount accurately using receipt normalization heuristics', () => {
    // 1. Date normalization across formats
    assert.equal(normalizeReceiptDate('2026-11-02 18:40'), '2026-11-02T18:40');
    assert.equal(normalizeReceiptDate('02-11-2026 18:40'), '2026-11-02T18:40');
    assert.equal(normalizeReceiptDate('15/08/2026'), '2026-08-15');
    assert.equal(normalizeReceiptDate('invalid-date-string'), null);

    // 2. Currency and amount parsing
    assert.equal(parseCurrencyAmount('₹3,450.00'), 3450);
    assert.equal(parseCurrencyAmount('Rs. 1,299.50'), 1299.5);
    assert.equal(parseCurrencyAmount('INR 850'), 850);
    assert.equal(parseCurrencyAmount('Total: 499'), 499);
    assert.equal(parseCurrencyAmount('No numbers here'), null);

    // 3. OCR text heuristics for merchant, date, and amount
    const rawReceiptText = `
      TAX INVOICE
      BLUE TOKAI COFFEE ROASTERS
      Date: 2026-11-04 09:15
      Flat White           ₹260.00
      Almond Croissant     ₹220.00
      Subtotal:            ₹480.00
      CGST 2.5% + SGST 2.5% ₹24.00
      Total Amount: ₹504.00
      Paid via UPI SBI
    `;

    assert.equal(extractMerchantFromReceiptText(rawReceiptText), 'BLUE TOKAI COFFEE ROASTERS');
    assert.equal(extractDateFromReceiptText(rawReceiptText), '2026-11-04T09:15');
    assert.equal(extractAmountFromReceiptText(rawReceiptText), 504);

    const items = extractLineItemsFromReceiptText(`
      Item Qty Amount
      Flat White 1 260
      Almond Croissant 1 220
      Total: 480
    `);
    assert.ok(items.length >= 2);
    assert.equal(items[0].name, 'Flat White');
    assert.equal(items[0].price, 260);
  });

  it('scans SVG receipt data URL and extracts merchant, date, amount, items, and predicts category', async () => {
    const state = await initializeAndSeedDatabase();
    const result = parseSvgReceipt(SAMPLE_RECEIPT_DATA_URL, {
      categories: state.categories,
      accounts: state.accounts,
    });

    assert.equal(result.merchant, 'METRO FRESH SUPERMARKET');
    assert.equal(result.date, '2026-11-02T18:40');
    assert.equal(result.amount, 3450);
    assert.equal(result.suggestedCategory, 'Food & Groceries');
    assert.equal(result.suggestedAccountId, 'acc-icici');
    assert.ok(result.items.length >= 5);
    assert.ok(result.items.some((item) => item.name.includes('Basmati Rice')));
    assert.ok(result.confidence >= 90);
  });

  it('automatically scans receipt images to auto-fill and persist ledger transactions in IndexedDB', async () => {
    const state = await initializeAndSeedDatabase();

    // 1. Run full receipt scanning engine
    const scanOutput = await scanReceiptImage(SAMPLE_RECEIPT_DATA_URL, {
      categories: state.categories,
      accounts: state.accounts,
      skipServerAi: true, // Test local/svg engine
    });

    assert.equal(scanOutput.merchant, 'METRO FRESH SUPERMARKET');
    assert.equal(scanOutput.date, '2026-11-02T18:40');
    assert.equal(scanOutput.amount, 3450);
    assert.equal(scanOutput.suggestedCategory, 'Food & Groceries');

    // 2. Simulate transaction form auto-fill and submission into JawedMoneyManagerDB
    const savedTx = await saveTransaction({
      date: scanOutput.date,
      type: scanOutput.suggestedType,
      accountId: scanOutput.suggestedAccountId || 'acc-icici',
      amount: scanOutput.amount,
      category: scanOutput.suggestedCategory,
      subCategory: scanOutput.suggestedSubCategory,
      fixedOrVariable: scanOutput.suggestedFixedOrVariable,
      note: scanOutput.note,
      receiptImages: [SAMPLE_RECEIPT_DATA_URL],
      isAnomaly: false,
    });

    assert.ok(savedTx.id);
    assert.equal(savedTx.amount, 3450);
    assert.equal(savedTx.date, '2026-11-02T18:40');
    assert.ok(savedTx.note.includes('METRO FRESH SUPERMARKET'));
    assert.equal(savedTx.receiptImages.length, 1);

    // 3. Verify it is reflected in monthly metrics and daily feed
    const updatedState = await initializeAndSeedDatabase();
    const metrics = calculateMonthlyMetrics(updatedState.transactions, '2026-11');
    assert.ok(metrics.expense >= 3450);

    const feedNov = filterDailyTransactions(updatedState.transactions, {
      selectedMonth: '2026-11',
      searchQuery: 'METRO FRESH',
    });
    assert.ok(feedNov.length >= 1);
    assert.equal(feedNov[0].amount, 3450);
    assert.equal(feedNov[0].receiptImages[0], SAMPLE_RECEIPT_DATA_URL);
  });

  it('calculates the Total Monthly Burn Rate progress bar metrics as current spending against the sum of all set monthly budgets', async () => {
    const { computeMonthlyBudgetPlan } = await import(
      '../src/components/money-manager/StatsView'
    );
    const state = await initializeAndSeedDatabase();

    // 1. Calculate baseline budget plan
    const plan = computeMonthlyBudgetPlan(state.transactions, '2026-11', state.categories);

    // Sum of all set monthly budgets
    assert.ok(plan.totalBudgeted > 0, 'Expected positive total budgeted sum');
    // Current spending against set monthly budgets
    assert.ok(plan.totalSpent > 0, 'Expected positive total spent in baseline month');

    // Expected burn rate calculation: current spending / sum of all set monthly budgets * 100
    const expectedBurnRate = Number(
      ((plan.totalSpent / plan.totalBudgeted) * 100).toFixed(1)
    );
    assert.equal(plan.overallUtilizationPercent, expectedBurnRate);
    assert.equal(plan.totalMonthlyBurnRatePercent, expectedBurnRate);
    assert.equal(plan.totalMonthlyBurnRate, expectedBurnRate);

    // 2. Test exact synthetic scenario: current spending against set limits
    const customThresholds: Record<string, number> = {
      'Food & Groceries': 20000,
      'Rent & Housing': 30000,
    };
    const syntheticTransactions: MoneyTransaction[] = [
      {
        id: 'tx-burn-1',
        date: '2026-11-05T12:00',
        type: 'Expense',
        accountId: 'acc-icici',
        amount: 15000,
        category: 'Food & Groceries',
        subCategory: 'Groceries',
        fixedOrVariable: 'Variable',
        note: 'Supermarket test',
        receiptImages: [],
        isAnomaly: false,
      },
      {
        id: 'tx-burn-2',
        date: '2026-11-05T14:00',
        type: 'Expense',
        accountId: 'acc-icici',
        amount: 10000,
        category: 'Rent & Housing',
        subCategory: 'Apartment Rent',
        fixedOrVariable: 'Fixed',
        note: 'Rent test',
        receiptImages: [],
        isAnomaly: false,
      },
    ];

    const syntheticPlan = computeMonthlyBudgetPlan(
      syntheticTransactions,
      '2026-11',
      state.categories,
      customThresholds
    );

    assert.equal(syntheticPlan.totalSpent, 25000);
    const expectedSyntheticBurnRate = Number(
      ((syntheticPlan.totalSpent / syntheticPlan.totalBudgeted) * 100).toFixed(1)
    );
    assert.equal(syntheticPlan.totalMonthlyBurnRatePercent, expectedSyntheticBurnRate);
    assert.equal(syntheticPlan.overallUtilizationPercent, expectedSyntheticBurnRate);
    assert.ok(syntheticPlan.totalRemaining >= 0);
  });

  it('triggers visual warnings when a spending category exceeds 90% of its defined limit', async () => {
    const { computeMonthlyBudgetPlan } = await import(
      '../src/components/money-manager/StatsView'
    );
    const state = await initializeAndSeedDatabase();

    // 1. Scenario with one category at 92% (>= 90%) and one at 75% (< 90%)
    const customThresholds: Record<string, number> = {
      'Food & Groceries': 10000,
      'Entertainment & Leisure': 8000,
      'Shopping & Personal': 5000,
    };

    const syntheticTransactions: MoneyTransaction[] = [
      {
        id: 'tx-warn-1',
        date: '2026-11-08T11:00',
        type: 'Expense',
        accountId: 'acc-icici',
        amount: 9200, // 92% of 10,000 -> Exceeds 90%
        category: 'Food & Groceries',
        subCategory: 'Groceries',
        fixedOrVariable: 'Variable',
        note: 'Supermarket spend hitting 92%',
        receiptImages: [],
        isAnomaly: false,
      },
      {
        id: 'tx-warn-2',
        date: '2026-11-09T15:00',
        type: 'Expense',
        accountId: 'acc-icici',
        amount: 6000, // 75% of 8,000 -> Under 90%
        category: 'Entertainment & Leisure',
        subCategory: 'Dining Out',
        fixedOrVariable: 'Variable',
        note: 'Weekend dining',
        receiptImages: [],
        isAnomaly: false,
      },
      {
        id: 'tx-warn-3',
        date: '2026-11-10T19:00',
        type: 'Expense',
        accountId: 'acc-icici',
        amount: 4500, // 90.0% of 5,000 -> Exactly 90%
        category: 'Shopping & Personal',
        subCategory: 'Apparel',
        fixedOrVariable: 'Variable',
        note: 'Clothing purchase hitting exactly 90%',
        receiptImages: [],
        isAnomaly: false,
      },
    ];

    const plan = computeMonthlyBudgetPlan(
      syntheticTransactions,
      '2026-11',
      state.categories,
      customThresholds
    );

    // Verify Food & Groceries item
    const foodItem = plan.items.find((i) => i.category === 'Food & Groceries');
    assert.ok(foodItem, 'Food & Groceries item should exist');
    assert.equal(foodItem.monthlyLimit, 10000);
    assert.equal(foodItem.spent, 9200);
    assert.equal(foodItem.utilizationPercent, 92);
    assert.equal(foodItem.isExceeding90Percent, true);

    // Verify Shopping & Personal item (exactly 90%)
    const shoppingItem = plan.items.find((i) => i.category === 'Shopping & Personal');
    assert.ok(shoppingItem, 'Shopping & Personal item should exist');
    assert.equal(shoppingItem.monthlyLimit, 5000);
    assert.equal(shoppingItem.spent, 4500);
    assert.equal(shoppingItem.utilizationPercent, 90);
    assert.equal(shoppingItem.isExceeding90Percent, true);

    // Verify Entertainment & Leisure item (75% - below 90%)
    const entertainmentItem = plan.items.find((i) => i.category === 'Entertainment & Leisure');
    assert.ok(entertainmentItem, 'Entertainment & Leisure item should exist');
    assert.equal(entertainmentItem.monthlyLimit, 8000);
    assert.equal(entertainmentItem.spent, 6000);
    assert.equal(entertainmentItem.utilizationPercent, 75);
    assert.equal(entertainmentItem.isExceeding90Percent, false);

    // Verify summary warning calculations
    assert.equal(plan.has90PercentWarning, true);
    assert.equal(plan.warning90Count, 2);
    assert.equal(plan.warning90Categories.length, 2);
    const warningNames = plan.warning90Categories.map((c) => c.category);
    assert.ok(warningNames.includes('Food & Groceries'));
    assert.ok(warningNames.includes('Shopping & Personal'));
    assert.ok(!warningNames.includes('Entertainment & Leisure'));

    // 2. Scenario where no category exceeds 90%
    const safeTransactions: MoneyTransaction[] = [
      {
        id: 'tx-safe-1',
        date: '2026-11-08T11:00',
        type: 'Expense',
        accountId: 'acc-icici',
        amount: 5000, // 50% of 10,000
        category: 'Food & Groceries',
        subCategory: 'Groceries',
        fixedOrVariable: 'Variable',
        note: 'Low spend',
        receiptImages: [],
        isAnomaly: false,
      },
    ];

    const safePlan = computeMonthlyBudgetPlan(
      safeTransactions,
      '2026-11',
      state.categories,
      customThresholds
    );

    assert.equal(safePlan.has90PercentWarning, false);
    assert.equal(safePlan.warning90Count, 0);
    assert.equal(safePlan.warning90Categories.length, 0);
  });

  it('provides storage persistence helpers and accurate 30-day backup alert detection in src/db.js', async () => {
    const dbModule = await import('../src/db.js');

    assert.ok(dbModule.DB_NAME, 'Expected DB_NAME in src/db.js');
    assert.ok(typeof dbModule.enableStoragePersistence === 'function');
    assert.ok(typeof dbModule.isStoragePersisted === 'function');
    assert.ok(typeof dbModule.shouldShowBackupAlert === 'function');
    assert.ok(typeof dbModule.getDaysSinceLastBackup === 'function');
    assert.ok(typeof dbModule.recordBackupTaken === 'function');

    // Test backup due detection when no backup was taken
    dbModule.clearBackupDate();
    assert.equal(dbModule.getLastBackupDate(), null);
    assert.equal(dbModule.getDaysSinceLastBackup(), null);
    assert.equal(dbModule.shouldShowBackupAlert(30), true, 'Should trigger backup alert if never backed up');

    // Test backup taken just now (0 days elapsed)
    dbModule.recordBackupTaken();
    assert.ok(dbModule.getLastBackupDate());
    assert.equal(dbModule.getDaysSinceLastBackup(), 0);
    assert.equal(dbModule.shouldShowBackupAlert(30), false, 'Should not trigger backup alert immediately after backup');

    // Test backup taken 35 days ago (overdue)
    const thirtyFiveDaysAgo = new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString();
    dbModule.recordBackupTaken(thirtyFiveDaysAgo);
    assert.ok(dbModule.getDaysSinceLastBackup()! >= 35);
    assert.equal(dbModule.shouldShowBackupAlert(30), true, 'Should trigger backup alert after 35 days');

    // Reset back to fresh state
    dbModule.recordBackupTaken();
    assert.equal(dbModule.shouldShowBackupAlert(30), false);
  });

  it('exports all 8 required standalone Money Manager modules cleanly', async () => {
    const db = await import('../src/db.js');
    const BackupBanner = await import('../src/components/BackupBanner.jsx');
    const TransactionModal = await import('../src/components/TransactionModal.jsx');
    const DailyView = await import('../src/components/DailyView.jsx');
    const CalendarView = await import('../src/components/CalendarView.jsx');
    const AccountsView = await import('../src/components/AccountsView.jsx');
    const StatsView = await import('../src/components/StatsView.jsx');
    const App = await import('../src/App.jsx');

    assert.ok(db.initializeAndSeedDatabase, 'Expected db helpers in src/db.js');
    assert.ok(BackupBanner.BackupBanner || BackupBanner.default, 'Expected BackupBanner component');
    assert.ok(TransactionModal.TransactionModal || TransactionModal.default, 'Expected TransactionModal component');
    assert.ok(DailyView.DailyView || DailyView.default, 'Expected DailyView component');
    assert.ok(CalendarView.CalendarView || CalendarView.default, 'Expected CalendarView component');
    assert.ok(AccountsView.AccountsView || AccountsView.default, 'Expected AccountsView component');
    assert.ok(StatsView.StatsView || StatsView.default, 'Expected StatsView component');
    assert.ok(App.App || App.default, 'Expected App component in src/App.jsx');
  });

  it('generates a formatted monthly spending report PDF summary cleanly without unicode errors', async () => {
    const {
      generateMonthlySpendingPdf,
      formatPdfINR,
      getFullMonthYearLabel,
    } = await import('../src/components/money-manager/spendingPdfReport');
    const { computeMonthlyBudgetPlan } = await import(
      '../src/components/money-manager/StatsView'
    );
    const { calculateMonthlyMetrics } = await import('../src/db/db');

    const state = await initializeAndSeedDatabase();
    const metrics = calculateMonthlyMetrics(state.transactions, '2026-11');
    const plan = computeMonthlyBudgetPlan(
      state.transactions,
      '2026-11',
      state.categories,
      {}
    );

    // 1. Verify ASCII-safe currency formatting
    assert.equal(formatPdfINR(125000), 'Rs. 1,25,000');
    assert.equal(formatPdfINR(0), 'Rs. 0');
    assert.equal(formatPdfINR(4500, true), '+Rs. 4,500');
    assert.equal(formatPdfINR(-3200, true), '-Rs. 3,200');

    // 2. Verify month label formatter
    assert.equal(getFullMonthYearLabel('2026-11'), 'November 2026');
    assert.equal(getFullMonthYearLabel('2025-01'), 'January 2025');

    // 3. Generate PDF document in-memory
    const doc = generateMonthlySpendingPdf({
      selectedMonth: '2026-11',
      plan,
      metrics,
      transactions: state.transactions,
      sinkingFunds: state.sinkingFunds,
      reportTitle: 'Executive Monthly Financial Health Summary',
      includeCategoryBreakdown: true,
      includeTopTransactions: true,
      topTransactionsLimit: 5,
      includeSinkingFunds: true,
      customNotes: 'All critical spending targets were maintained within authorized thresholds for November.',
    });

    assert.ok(doc, 'Expected generateMonthlySpendingPdf to return a jsPDF instance');
    const pageCount = doc.getNumberOfPages();
    assert.ok(pageCount >= 1, `Expected at least 1 page, got ${pageCount}`);

    // Verify PDF binary output header starts with %PDF
    const pdfDataUri = doc.output('datauristring');
    assert.ok(pdfDataUri.startsWith('data:application/pdf;filename=generated.pdf;base64,'), 'Expected valid PDF data URI');
    const pdfArrayBuffer = doc.output('arraybuffer');
    assert.ok(pdfArrayBuffer.byteLength > 1000, 'Expected non-trivial PDF byte size');

    // Test with optional sections toggled off
    const minimalDoc = generateMonthlySpendingPdf({
      selectedMonth: '2026-11',
      plan,
      metrics,
      transactions: state.transactions,
      includeCategoryBreakdown: false,
      includeTopTransactions: false,
      includeSinkingFunds: false,
    });
    assert.ok(minimalDoc.getNumberOfPages() >= 1);
  });

  it('mines historical spending trends from IndexedDB to project end-of-month category totals and compares against defined budgets', async () => {
    const { calculateBudgetProjections } = await import(
      '../src/components/money-manager/BudgetProjectionSection'
    );
    const { BudgetProjectionSection } = await import('../src/components/StatsView.jsx');
    assert.ok(BudgetProjectionSection, 'Expected BudgetProjectionSection re-export from StatsView.jsx');

    const state = await initializeAndSeedDatabase();

    // 1. Run projection engine for 2026-11 with default hybrid pace model
    const projection = calculateBudgetProjections(
      state.transactions,
      state.categories,
      '2026-11'
    );

    assert.ok(projection, 'Expected calculateBudgetProjections to return a summary object');
    assert.ok(projection.items.length >= 7, 'Expected projection items for all expense categories');
    assert.ok(
      projection.historicalMonthsAnalyzed >= 1,
      `Expected historical months analyzed from IndexedDB records, got ${projection.historicalMonthsAnalyzed}`
    );
    assert.ok(projection.totalDefinedBudget > 0, 'Expected positive total defined budget');
    assert.ok(projection.totalCurrentSpent > 0, 'Expected current spent to date');
    assert.ok(projection.totalEstimatedMonthEnd > 0, 'Expected positive estimated month-end total');

    // 2. Verify individual category projection comparison against defined budget
    // Rent & Housing: Defined limit ₹24,000, current spend ₹22,000 -> Fixed expense projected to finish at ₹22,000 (Safe Headroom)
    const rentItem = projection.items.find((i) => i.category === 'Rent & Housing');
    assert.ok(rentItem, 'Expected Rent & Housing category item');
    assert.equal(rentItem.definedBudget, 24000);
    assert.equal(rentItem.currentSpent, 22000);
    assert.equal(rentItem.estimatedMonthEndTotal, 22000);
    assert.equal(rentItem.comparisonStatus, 'at-risk');
    assert.equal(rentItem.projectedHeadroom, 2000);
    assert.equal(rentItem.projectedOverage, 0);

    // Medical & Health: Defined limit ₹5,000, current spend ₹7,850 -> Already exceeds defined limit (Projected Over)
    const medicalItem = projection.items.find((i) => i.category === 'Medical & Health');
    assert.ok(medicalItem, 'Expected Medical & Health category item');
    assert.equal(medicalItem.definedBudget, 5000);
    assert.equal(medicalItem.currentSpent, 7850);
    assert.ok(
      medicalItem.estimatedMonthEndTotal >= 7850,
      'Estimated total should be at least current spent'
    );
    assert.equal(medicalItem.comparisonStatus, 'projected-over');
    assert.ok(medicalItem.projectedOverage >= 2850);
    assert.equal(medicalItem.projectedHeadroom, 0);

    // Food & Groceries: Variable category with current spent ₹3,450
    const foodItem = projection.items.find((i) => i.category === 'Food & Groceries');
    assert.ok(foodItem, 'Expected Food & Groceries category item');
    assert.equal(foodItem.definedBudget, 16000);
    assert.equal(foodItem.currentSpent, 3450);
    assert.ok(
      foodItem.estimatedMonthEndTotal > foodItem.currentSpent,
      'Variable category should project additional spend for remaining days'
    );

    // 3. Test different projection models: historical trend vs linear daily run-rate
    const histModelProj = calculateBudgetProjections(
      state.transactions,
      state.categories,
      '2026-11',
      { model: 'historical' }
    );
    assert.equal(histModelProj.modelUsed, 'historical');
    assert.ok(histModelProj.totalEstimatedMonthEnd > 0);

    const runRateProj = calculateBudgetProjections(
      state.transactions,
      state.categories,
      '2026-11',
      { model: 'run-rate', referenceDayOfMonth: 10 }
    );
    assert.equal(runRateProj.modelUsed, 'run-rate');
    assert.equal(runRateProj.daysElapsed, 10);
    assert.equal(runRateProj.daysRemaining, 20);

    // 4. Test user threshold overrides (e.g. uniform limit of ₹10,000)
    const uniformOverrideProj = calculateBudgetProjections(
      state.transactions,
      state.categories,
      '2026-11',
      { thresholdOverrides: 10000 }
    );
    assert.ok(
      uniformOverrideProj.items.every((i) => i.definedBudget === 10000),
      'Expected all categories to reflect uniform threshold override'
    );
  });

  it('accurately identifies budget overrun categories, computes overage amounts, and reflects in summary table', async () => {
    const { computeMonthlyBudgetPlan } = await import(
      '../src/components/money-manager/StatsView'
    );
    const { BudgetOverrunAlertList } = await import('../src/components/StatsView.jsx');
    assert.ok(BudgetOverrunAlertList, 'Expected BudgetOverrunAlertList export');

    const state = await initializeAndSeedDatabase();

    // 1. Initial seeded state: Medical & Health has ₹5,000 budget vs ₹7,850 spent -> Overrun of ₹2,850 (157.0%)
    const plan = computeMonthlyBudgetPlan(
      state.transactions,
      '2026-11',
      state.categories
    );

    const overrunCategories = plan.items.filter(
      (item) => item.status === 'over' || (item.monthlyLimit > 0 && item.spent > item.monthlyLimit)
    );

    assert.equal(overrunCategories.length, 1, 'Expected exactly 1 overrun category');
    const medicalOverrun = overrunCategories[0];
    assert.equal(medicalOverrun.category, 'Medical & Health');
    assert.equal(medicalOverrun.monthlyLimit, 5000);
    assert.equal(medicalOverrun.spent, 7850);
    assert.equal(medicalOverrun.overage, 2850);
    assert.equal(medicalOverrun.utilizationPercent, 157.0);

    // Sum of overages in the alert summary
    const totalOverrunAmount = overrunCategories.reduce((sum, item) => sum + item.overage, 0);
    assert.equal(totalOverrunAmount, 2850);

    // 2. Simulate resolving the overrun by raising Medical & Health budget to ₹8,000
    const resolvedCategories = state.categories.map((cat) =>
      cat.name === 'Medical & Health' ? { ...cat, monthlyBudget: 8000 } : cat
    );

    const resolvedPlan = computeMonthlyBudgetPlan(
      state.transactions,
      '2026-11',
      resolvedCategories
    );

    const resolvedOverruns = resolvedPlan.items.filter(
      (item) => item.status === 'over' || (item.monthlyLimit > 0 && item.spent > item.monthlyLimit)
    );
    assert.equal(resolvedOverruns.length, 0, 'Expected 0 overrun categories after limit adjustment');
    assert.equal(resolvedPlan.overBudgetCount, 0);

    // Medical is now within limit (₹7,850 / ₹8,000 = 98.1%)
    const resolvedMedical = resolvedPlan.items.find((i) => i.category === 'Medical & Health');
    assert.ok(resolvedMedical);
    assert.equal(resolvedMedical.status, 'near');
    assert.equal(resolvedMedical.overage, 0);
    assert.equal(resolvedMedical.remaining, 150);
  });

  it('tracks progress against user-defined monthly savings target and persists target preferences', async () => {
    const {
      MonthlySavingsGoalsSection,
      getStoredSavingsTarget,
    } = await import('../src/components/StatsView.jsx');
    const { calculateMonthlyMetrics } = await import('../src/db/db');

    assert.ok(MonthlySavingsGoalsSection, 'Expected MonthlySavingsGoalsSection export');

    const state = await initializeAndSeedDatabase();
    const metrics = calculateMonthlyMetrics(state.transactions, '2026-11');

    // 1. Initial metrics for 2026-11:
    // Income: ₹1,32,500, Expense: ₹48,230 -> Net Savings: ₹84,270 (63.6% savings rate)
    assert.ok(metrics.income > 100000);
    assert.ok(metrics.expense > 40000);
    const netSavings = metrics.netBalance;
    assert.equal(netSavings, metrics.income - metrics.expense);

    // 2. Default target derived or stored
    const defaultTarget = getStoredSavingsTarget('2026-11', metrics.income);
    assert.ok(defaultTarget > 0);

    // 3. Store custom target of ₹50,000 for 2026-11
    const { storeSavingsTarget } = await import(
      '../src/components/money-manager/MonthlySavingsGoalsSection'
    );
    storeSavingsTarget('2026-11', 50000);
    const loadedTarget = getStoredSavingsTarget('2026-11', metrics.income);
    assert.equal(loadedTarget, 50000);

    // 4. Target Progress calculation: ₹84,270 achieved vs ₹50,000 target -> 168.5% progress (Target Achieved)
    const progressPercent = Number(((netSavings / loadedTarget) * 100).toFixed(1));
    assert.ok(progressPercent >= 100, `Expected >= 100% progress, got ${progressPercent}%`);
    assert.ok(netSavings >= loadedTarget);
  });

  it('supports dashboard card reordering configuration, default order, and custom labels', async () => {
    const {
      DEFAULT_SUMMARY_CARD_ORDER,
      SUMMARY_CARD_LABELS,
    } = await import('../src/components/money-manager/StatsView');

    assert.deepEqual(DEFAULT_SUMMARY_CARD_ORDER, [
      'burn-rate',
      'budget-forecast',
      'budget-overrun',
      'savings-goals',
      'projections',
    ]);

    assert.equal(SUMMARY_CARD_LABELS['burn-rate'], 'Burn Rate Summary');
    assert.equal(SUMMARY_CARD_LABELS['budget-forecast'], 'Budget Forecast (Velocity)');
    assert.equal(SUMMARY_CARD_LABELS['budget-overrun'], 'Budget Overrun Alerts');
    assert.equal(SUMMARY_CARD_LABELS['savings-goals'], 'Monthly Savings Goals');
    assert.equal(SUMMARY_CARD_LABELS['projections'], 'Budget Projections');
  });

  it('uses current month spending velocity to predict total month-end expenditures for each category compared to set limits', async () => {
    const { calculateVelocityBudgetForecast } = await import(
      '../src/components/money-manager/BudgetForecastCard'
    );
    const { BudgetForecastCard } = await import('../src/components/StatsView.jsx');
    assert.ok(BudgetForecastCard, 'Expected BudgetForecastCard export');

    const state = await initializeAndSeedDatabase();

    // Calculate forecast for 2026-11 with reference day 15 (halfway through 30-day month)
    const forecast = calculateVelocityBudgetForecast(
      state.transactions,
      state.categories,
      '2026-11',
      { referenceDayOfMonth: 15 }
    );

    assert.ok(forecast);
    assert.equal(forecast.daysInMonth, 30);
    assert.equal(forecast.daysElapsed, 15);
    assert.equal(forecast.daysRemaining, 15);
    assert.ok(forecast.totalCurrentSpent > 0);
    assert.ok(forecast.totalDailyVelocity > 0);
    assert.ok(forecast.totalPredictedMonthEnd > 0);

    // Food & Groceries: Variable category with spend extrapolated based on daily velocity
    const foodItem = forecast.items.find((i) => i.category === 'Food & Groceries');
    assert.ok(foodItem, 'Expected Food & Groceries category item');
    assert.equal(foodItem.dailyVelocity, Math.round(foodItem.currentSpent / 15));
    assert.equal(foodItem.predictedMonthEndTotal, Math.round((foodItem.currentSpent / 15) * 30));
  });

  it('triggers a JSON backup download of the entire financial ledger for safekeeping', async () => {
    const { triggerJsonBackupDownload, exportDatabaseBackup } = await import(
      '../src/db/db'
    );

    await initializeAndSeedDatabase();

    const backupPayload = await exportDatabaseBackup();
    assert.ok(backupPayload);
    assert.ok(backupPayload.accounts.length > 0);
    assert.ok(backupPayload.categories.length > 0);
    assert.ok(backupPayload.transactions.length > 0);

    const downloadResult = await triggerJsonBackupDownload();
    assert.ok(downloadResult);
    assert.ok(downloadResult.fileName.startsWith('jawed-money-manager-backup-'));
    assert.ok(downloadResult.fileName.endsWith('.json'));
    assert.ok(downloadResult.recordCount > 0);
  });
});









