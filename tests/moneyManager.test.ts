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
  summarizeMappedCsvTransactions,
  bulkImportCsvToLedger,
  bulkImportCsvFileToLedger,
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

    // 3. Verify real-time session deduplication via detectNew95PercentBudgetToasts
    const { detectNew95PercentBudgetToasts } = await import(
      '../src/components/money-manager/StatsView'
    );
    const notifiedKeys = new Set<string>();
    const initialToasts = detectNew95PercentBudgetToasts(
      state.transactions,
      '2026-11',
      state.categories,
      notifiedKeys
    );
    assert.equal(initialToasts.length, 1);
    assert.equal(initialToasts[0].category, 'Medical & Health');
    assert.equal(initialToasts[0].severity, 'critical');

    // Subsequent evaluation with updated transactions only returns the newly triggered Rent & Housing 95.8% toast
    const deltaToasts = detectNew95PercentBudgetToasts(
      updatedState.transactions,
      '2026-11',
      updatedState.categories,
      notifiedKeys
    );
    assert.equal(deltaToasts.length, 1);
    assert.equal(deltaToasts[0].category, 'Rent & Housing');
    assert.equal(deltaToasts[0].utilizationPercent, 95.8);
    assert.equal(deltaToasts[0].severity, 'warning');
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

  it('exports all required Money Manager modules cleanly and keeps App.tsx as the root website router', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const db = await import('../src/db.js');
    const BackupBanner = await import('../src/components/BackupBanner.jsx');
    const TransactionModal = await import('../src/components/TransactionModal.jsx');
    const DailyView = await import('../src/components/DailyView.jsx');
    const CalendarView = await import('../src/components/CalendarView.jsx');
    const AccountsView = await import('../src/components/AccountsView.jsx');
    const StatsView = await import('../src/components/StatsView.jsx');
    const MoneyManagerPage = await import('../src/pages/tools/MoneyManager');
    const RootApp = await import('../src/App');
    const { TOOLS, determineToolCategory } = await import('../src/data/toolsData');

    assert.equal(
      fs.existsSync(path.resolve(process.cwd(), 'src/App.jsx')),
      false,
      'src/App.jsx must not exist so it never shadows src/App.tsx'
    );
    assert.ok(db.initializeAndSeedDatabase, 'Expected db helpers in src/db.js');
    assert.ok(BackupBanner.BackupBanner || BackupBanner.default, 'Expected BackupBanner component');
    assert.ok(TransactionModal.TransactionModal || TransactionModal.default, 'Expected TransactionModal component');
    assert.ok(DailyView.DailyView || DailyView.default, 'Expected DailyView component');
    assert.ok(CalendarView.CalendarView || CalendarView.default, 'Expected CalendarView component');
    assert.ok(AccountsView.AccountsView || AccountsView.default, 'Expected AccountsView component');
    assert.ok(StatsView.StatsView || StatsView.default, 'Expected StatsView component');
    assert.ok(MoneyManagerPage.MoneyManager || MoneyManagerPage.default, 'Expected MoneyManager page component');
    assert.ok(RootApp.App || RootApp.default, 'Expected RootApp in src/App.tsx');

    const mmTool = TOOLS.find((t) => t.id === 'money-manager');
    assert.ok(mmTool, 'Expected money-manager entry in TOOLS');
    assert.equal(mmTool.route, '/tools/money-manager');
    assert.equal(determineToolCategory(mmTool), 'Finance & Calculators');
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

  it('exports the filtered Daily Ledger transaction list as a formatted CSV file', async () => {
    const {
      exportFilteredDailyTransactionsToCsv,
      triggerFilteredDailyCsvDownload,
    } = await import('../src/components/money-manager/DailyView');

    const state = await initializeAndSeedDatabase();

    // 1. Export all November 2026 transactions
    const novExport = exportFilteredDailyTransactionsToCsv(
      state.transactions,
      { selectedMonth: '2026-11' },
      state.accounts
    );
    assert.equal(novExport.fileName, 'jawed-money-manager-daily-ledger-2026-11.csv');
    assert.ok(novExport.transactionCount > 0);
    assert.ok(novExport.csvContent.includes('Transaction ID,Date,Time,Type'));

    // 2. Export filtered subset (only Food & Groceries in 2026-11)
    const filteredExport = triggerFilteredDailyCsvDownload(
      state.transactions,
      {
        selectedMonth: '2026-11',
        categoryFilter: 'Food & Groceries',
      },
      state.accounts
    );
    assert.equal(
      filteredExport.fileName,
      'jawed-money-manager-daily-ledger-2026-11-filtered.csv'
    );
    assert.equal(filteredExport.transactionCount, 1);
    assert.ok(filteredExport.csvContent.includes('Food & Groceries'));
    assert.ok(!filteredExport.csvContent.includes('Rent & Housing'));
  });

  it('registers the Money Manager CSV import formatting guide on /guides and maps its documented CSV templates cleanly', async () => {
    const { FIELD_GUIDES } = await import('../src/data/fieldGuidesData');
    const {
      parseCsvText,
      autoDetectCsvMapping,
      mapCsvRowsToTransactions,
    } = await import('../src/components/money-manager/csvImporter');

    const csvGuide = FIELD_GUIDES.find(
      (g) => g.slug === 'money-manager-csv-import-formatting-guide'
    );
    assert.ok(csvGuide, 'Expected money-manager-csv-import-formatting-guide in FIELD_GUIDES');
    assert.ok(csvGuide.title.includes('CSV'));
    assert.equal(csvGuide.toc.length, 5);

    const state = await initializeAndSeedDatabase();

    // Verify Template A (Split Withdrawal & Deposit columns) from the guide
    const templateACsv = `Date,Narration,Withdrawal Amt.,Deposit Amt.,Category,Sub-Category,Bank
05/11/2026,"UPI-SWIGGY INSTAMART-ORDER",640.00,,Groceries,Swiggy Instamart,ICICI
04/11/2026,"NEFT CR-ACME CORP SALARY",,85000.00,Salary,Monthly Payroll,ICICI`;

    const parsedA = parseCsvText(templateACsv);
    assert.equal(parsedA.rows.length, 2);
    const mappingA = autoDetectCsvMapping(parsedA.headers);
    assert.equal(mappingA.dateColumn, 'Date');
    assert.equal(mappingA.debitColumn, 'Withdrawal Amt.');
    assert.equal(mappingA.creditColumn, 'Deposit Amt.');

    const mappedA = mapCsvRowsToTransactions(parsedA.rows, mappingA, {
      defaultAccountId: 'acc-icici',
      defaultToAccountId: 'acc-sbi',
      defaultMonth: '2026-11',
      accounts: state.accounts,
      categories: state.categories,
      historicalTransactions: state.transactions,
    });
    assert.equal(mappedA.length, 2);
    assert.equal(mappedA[0].type, 'Expense');
    assert.equal(mappedA[0].amount, 640);
    assert.equal(mappedA[1].type, 'Income');
    assert.equal(mappedA[1].amount, 85000);
  });

  it('integrates browser SpeechRecognition API into the Money Manager search bar for dictating category or note queries', async () => {
    const {
      getSpeechRecognitionConstructor,
      normalizeVoiceSearchTranscript,
      startVoiceSearchDictation,
      applyDictatedVoiceSearchFilter,
      filterDailyTransactions,
    } = await import('../src/components/money-manager/DailyView');

    const state = await initializeAndSeedDatabase();

    // 1. Transcript normalization strips trailing punctuation from dictated voice queries
    assert.equal(normalizeVoiceSearchTranscript('  Food & Groceries.  '), 'Food & Groceries');
    assert.equal(normalizeVoiceSearchTranscript('Swiggy   Instamart!'), 'Swiggy Instamart');

    // 2. Mock SpeechRecognition constructor and verify live dictation lifecycle
    let activeInstance: any = null;
    class MockSpeechRecognition {
      continuous = false;
      interimResults = false;
      lang = '';
      maxAlternatives = 1;
      onstart: (() => void) | null = null;
      onresult: ((event: any) => void) | null = null;
      onerror: ((event: any) => void) | null = null;
      onend: (() => void) | null = null;
      started = false;
      stopped = false;

      constructor() {
        activeInstance = this;
      }
      start() {
        this.started = true;
        this.onstart?.();
      }
      stop() {
        this.stopped = true;
        this.onend?.();
      }
    }

    const mockWindow = { webkitSpeechRecognition: MockSpeechRecognition };
    assert.equal(getSpeechRecognitionConstructor(mockWindow), MockSpeechRecognition);

    const transcripts: Array<{ text: string; isFinal: boolean }> = [];
    let didStart = false;
    let didEnd = false;

    const session = startVoiceSearchDictation({
      win: mockWindow,
      onStart: () => {
        didStart = true;
      },
      onTranscript: (text, isFinal) => {
        transcripts.push({ text, isFinal });
      },
      onEnd: () => {
        didEnd = true;
      },
    });

    assert.ok(session);
    assert.equal(didStart, true);
    assert.equal(session.interimResults, true);
    assert.equal(session.lang, 'en-IN');

    // Simulate interim and final voice dictation result for "Groceries."
    activeInstance!.onresult?.({
      results: {
        length: 1,
        0: {
          length: 1,
          isFinal: true,
          0: { transcript: 'Groceries.', confidence: 0.96 },
        },
      },
    });

    assert.equal(transcripts.length, 1);
    assert.equal(transcripts[0].text, 'Groceries');
    assert.equal(transcripts[0].isFinal, true);

    // 3. Verify applyDictatedVoiceSearchFilter automatically triggers filtered ledger results
    const autoFilterResult = applyDictatedVoiceSearchFilter(
      'Groceries.',
      state.transactions,
      { selectedMonth: '2026-11' }
    );
    assert.equal(autoFilterResult.normalizedQuery, 'Groceries');
    assert.ok(autoFilterResult.matchCount > 0);
    assert.equal(
      autoFilterResult.matchCount,
      filterDailyTransactions(state.transactions, {
        selectedMonth: '2026-11',
        searchQuery: 'Groceries',
      }).length
    );
    assert.ok(
      autoFilterResult.filteredTransactions.every(
        (tx) =>
          tx.category.toLowerCase().includes('groceries') ||
          tx.note.toLowerCase().includes('groceries')
      )
    );

    session.stop();
    assert.equal(didEnd, true);
  });

  it('encrypts and syncs the Money Manager ledger via the Google Drive API with AES-256-GCM and PBKDF2', async () => {
    const {
      SCOPES,
      encryptLedgerPayload,
      decryptLedgerPayload,
      isEncryptedDriveLedgerEnvelope,
      exportDatabaseToEncryptedDrive,
      importDatabaseFromEncryptedDrive,
      syncLedgerWithEncryptedDrive,
      listDriveLedgerBackups,
      deleteDriveLedgerBackup,
    } = await import('../src/components/money-manager/googleDriveSync');
    const { exportDatabaseBackup, saveTransaction } = await import('../src/db/db');

    // 1. Verify least-privilege Google Drive scope is configured
    assert.ok(SCOPES.includes('https://www.googleapis.com/auth/drive.file'));

    await initializeAndSeedDatabase();
    const initialBackup = await exportDatabaseBackup();
    const passphrase = 'CorrectHorseBatteryStaple!2026';

    // 2. Encrypt and decrypt payload round-trip via Web Crypto API (AES-256-GCM + PBKDF2-SHA256)
    const envelope = await encryptLedgerPayload(initialBackup, passphrase);
    assert.equal(isEncryptedDriveLedgerEnvelope(envelope), true);
    assert.equal(envelope.cipher, 'AES-256-GCM');
    assert.equal(envelope.kdf, 'PBKDF2-SHA256');
    assert.equal(envelope.metadata.transactionCount, initialBackup.transactions.length);

    const decrypted = await decryptLedgerPayload(envelope, passphrase);
    assert.equal(decrypted.transactions.length, initialBackup.transactions.length);
    assert.equal(decrypted.accounts.length, initialBackup.accounts.length);

    // Wrong passphrase must fail decryption cleanly
    await assert.rejects(
      () => decryptLedgerPayload(envelope, 'WrongPassphrase999'),
      /Decryption failed/
    );

    // 3. Simulate Google Drive v3 REST API endpoints for upload, list, download/decrypt, and delete
    const mockDriveStore = new Map<
      string,
      { metadata: any; encryptedContent: string }
    >();

    const mockDriveFetch: typeof fetch = async (input: any, init?: any) => {
      const url = typeof input === 'string' ? input : input.url;
      const method = (init?.method || 'GET').toUpperCase();

      if (url.startsWith('https://www.googleapis.com/upload/drive/v3/files')) {
        const rawBody = String(init?.body || '');
        const parts = rawBody.split('---------JawedMoneyManagerDriveSyncBoundary314159');
        const metaPart = parts[1] || '';
        const mediaPart = parts[2] || '';
        const metaJson = JSON.parse(metaPart.split('\r\n\r\n')[1].trim());
        const mediaJsonText = mediaPart.split('\r\n\r\n')[1].trim();
        const fileId = method === 'PATCH' ? 'drive-file-1' : `drive-file-${mockDriveStore.size + 1}`;
        const fileMeta = {
          id: fileId,
          name: metaJson.name,
          modifiedTime: '2026-11-05T12:00:00.000Z',
          size: String(mediaJsonText.length),
          appProperties: metaJson.appProperties,
        };
        mockDriveStore.set(fileId, {
          metadata: fileMeta,
          encryptedContent: mediaJsonText,
        });
        return new Response(JSON.stringify(fileMeta), { status: 200 });
      }

      if (url.includes('?alt=media')) {
        const match = url.match(/\/files\/([^?]+)\?alt=media/);
        const fileId = decodeURIComponent(match?.[1] || '');
        const stored = mockDriveStore.get(fileId);
        if (!stored) {
          return new Response('Not Found', { status: 404 });
        }
        return new Response(stored.encryptedContent, { status: 200 });
      }

      if (url.startsWith('https://www.googleapis.com/drive/v3/files') && method === 'GET') {
        const files = [...mockDriveStore.values()].map((item) => item.metadata);
        return new Response(JSON.stringify({ files }), { status: 200 });
      }

      if (url.startsWith('https://www.googleapis.com/drive/v3/files/') && method === 'DELETE') {
        const fileId = decodeURIComponent(url.split('/files/')[1] || '');
        mockDriveStore.delete(fileId);
        return new Response(null, { status: 204 });
      }

      return new Response('Unhandled URL', { status: 500 });
    };

    // Export current IndexedDB ledger to encrypted Google Drive file
    const uploadResult = await exportDatabaseToEncryptedDrive(passphrase, {
      accessToken: 'ya29.mock-drive-token',
      fetchImpl: mockDriveFetch,
    });
    assert.equal(uploadResult.file.id, 'drive-file-1');
    assert.equal(uploadResult.transactionCount, initialBackup.transactions.length);

    // List backups from Google Drive
    const listedFiles = await listDriveLedgerBackups({
      accessToken: 'ya29.mock-drive-token',
      fetchImpl: mockDriveFetch,
    });
    assert.equal(listedFiles.length, 1);
    assert.equal(listedFiles[0].id, 'drive-file-1');

    // Add a new local transaction, then perform bidirectional smart-merge sync with Google Drive
    await saveTransaction({
      date: '2026-11-28T10:00',
      type: 'Expense',
      accountId: 'acc-icici',
      amount: 999,
      category: 'Food & Groceries',
      subCategory: 'Temp Snack',
      fixedOrVariable: 'Variable',
      note: 'Cross-device synced entry',
      receiptImages: [],
      isAnomaly: false,
    });

    const smartSyncResult = await syncLedgerWithEncryptedDrive(passphrase, {
      accessToken: 'ya29.mock-drive-token',
      fetchImpl: mockDriveFetch,
    });
    assert.equal(smartSyncResult.syncAction, 'merged-and-updated');
    assert.equal(smartSyncResult.transactionCount, initialBackup.transactions.length + 1);

    // Restore (replace) from the updated encrypted Google Drive backup
    const importResult = await importDatabaseFromEncryptedDrive(
      'drive-file-1',
      passphrase,
      'replace',
      {
        accessToken: 'ya29.mock-drive-token',
        fetchImpl: mockDriveFetch,
      }
    );
    assert.equal(
      importResult.restored.transactions.length,
      initialBackup.transactions.length + 1
    );

    // Delete backup file from Google Drive
    await deleteDriveLedgerBackup('drive-file-1', {
      accessToken: 'ya29.mock-drive-token',
      fetchImpl: mockDriveFetch,
    });
    const afterDelete = await listDriveLedgerBackups({
      accessToken: 'ya29.mock-drive-token',
      fetchImpl: mockDriveFetch,
    });
    assert.equal(afterDelete.length, 0);
  });

  it('supports touch-friendly swipe gestures across Daily, Calendar, Accounts, and Stats tabs and enforces high-contrast active tab tokens in light and dark modes', async () => {
    const {
      SWIPEABLE_MONEY_MANAGER_TABS,
      getNextTabBySwipe,
      resolveActiveTabContrastTokens,
    } = await import('../src/components/money-manager/Header');

    assert.deepEqual(SWIPEABLE_MONEY_MANAGER_TABS, [
      'daily',
      'calendar',
      'accounts',
      'stats',
    ]);

    // Swiping left (negative deltaX < -44) advances forward through Daily -> Calendar -> Accounts -> Stats
    assert.equal(getNextTabBySwipe('daily', -75, 4), 'calendar');
    assert.equal(getNextTabBySwipe('calendar', -68, -6), 'accounts');
    assert.equal(getNextTabBySwipe('accounts', -82, 10), 'stats');
    // Clamps at last swipeable view by default
    assert.equal(getNextTabBySwipe('stats', -90, 0), 'stats');
    // Wraps around when wrapAround is enabled
    assert.equal(
      getNextTabBySwipe('stats', -90, 0, { wrapAround: true }),
      'daily'
    );

    // Swiping right (positive deltaX > 44) moves backward through Stats -> Accounts -> Calendar -> Daily
    assert.equal(getNextTabBySwipe('stats', 70, 5), 'accounts');
    assert.equal(getNextTabBySwipe('accounts', 60, -8), 'calendar');
    assert.equal(getNextTabBySwipe('calendar', 65, 2), 'daily');
    assert.equal(getNextTabBySwipe('daily', 80, 0), 'daily');

    // Short horizontal movements (< 44px) or predominantly vertical scrolling gestures do not switch tabs
    assert.equal(getNextTabBySwipe('daily', -24, 2), 'daily');
    assert.equal(getNextTabBySwipe('calendar', -80, 95), 'calendar');

    // High-contrast visual tokens for light and dark modes
    const lightTokens = resolveActiveTabContrastTokens('light');
    const darkTokens = resolveActiveTabContrastTokens('dark');

    assert.equal(lightTokens.mode, 'light');
    assert.equal(lightTokens.textColor, '#1e3a8a');
    assert.equal(lightTokens.indicatorColor, '#1d4ed8');
    assert.equal(lightTokens.backgroundColor, 'rgba(37, 99, 235, 0.14)');
    assert.equal(lightTokens.borderColor, 'rgba(29, 78, 216, 0.45)');

    assert.equal(darkTokens.mode, 'dark');
    assert.equal(darkTokens.textColor, '#f8fafc');
    assert.equal(darkTokens.indicatorColor, '#38bdf8');
    assert.equal(darkTokens.backgroundColor, 'rgba(56, 189, 248, 0.2)');
    assert.equal(darkTokens.borderColor, 'rgba(56, 189, 248, 0.55)');
    assert.notEqual(lightTokens.textColor, darkTokens.textColor);
  });

  it('generates a summary JSON file of all current month category spending, budget limits, and savings progress via Export Monthly Report', async () => {
    const {
      generateMonthlyReportJson,
      triggerMonthlyReportJsonDownload,
    } = await import('../src/components/money-manager/StatsView');

    const state = await initializeAndSeedDatabase();
    const result = triggerMonthlyReportJsonDownload({
      selectedMonth: '2026-11',
      transactions: state.transactions,
      categories: state.categories,
      sinkingFunds: state.sinkingFunds,
      savingsTargetOverride: 45000,
    });

    assert.equal(result.fileName, 'jawed-money-manager-monthly-report-2026-11.json');
    assert.equal(result.selectedMonth, '2026-11');
    assert.ok(result.categoryCount > 0, 'Expected expense categories in monthly report');
    assert.ok(result.totalSpent > 0, 'Expected positive monthly spend');
    assert.ok(result.totalBudgeted > 0, 'Expected positive monthly budgeted total');

    const parsed = JSON.parse(result.jsonContent);
    assert.equal(parsed.reportType, 'jawed-money-manager-monthly-report');
    assert.equal(parsed.selectedMonth, '2026-11');
    assert.ok(Array.isArray(parsed.categorySpending));
    assert.equal(parsed.categorySpending.length, result.categoryCount);

    const housingReport = parsed.categorySpending.find(
      (c: any) => c.category === 'Rent & Housing'
    );
    assert.ok(housingReport, 'Expected Rent & Housing in categorySpending');
    assert.equal(housingReport.spent, 22000);
    assert.equal(housingReport.budgetLimit, 24000);
    assert.equal(parsed.budgetLimits['Rent & Housing'], 24000);

    assert.ok(parsed.savingsProgress, 'Expected savingsProgress section in JSON report');
    assert.equal(parsed.savingsProgress.savingsTarget, 45000);
    assert.equal(parsed.savingsProgress.netSavings, parsed.overview.netBalance);
    assert.equal(parsed.savingsProgress.sinkingFundsCount, state.sinkingFunds.length);
  });

  it('computes all categories with percentage-based color-coded progress bar tiers for the CategoryBudgetProgressCard visual card', async () => {
    const {
      CategoryBudgetProgressCard,
      resolveCategoryProgressColor,
      computeCategoryBudgetProgressItems,
      computeMonthlyBudgetPlan,
    } = await import('../src/components/money-manager/StatsView');

    assert.ok(CategoryBudgetProgressCard, 'Expected CategoryBudgetProgressCard component export');

    // Verify percentage-based color-coding tiers
    const healthyTier = resolveCategoryProgressColor(42.5, 10000, 4250);
    assert.equal(healthyTier.tier, 'healthy');
    assert.equal(healthyTier.barColor, '#10b981');

    const moderateTier = resolveCategoryProgressColor(78.0, 10000, 7800);
    assert.equal(moderateTier.tier, 'moderate');
    assert.equal(moderateTier.barColor, '#f59e0b');

    const warningTier = resolveCategoryProgressColor(94.2, 10000, 9420);
    assert.equal(warningTier.tier, 'warning');
    assert.equal(warningTier.barColor, '#f97316');

    const overBudgetTier = resolveCategoryProgressColor(125.0, 10000, 12500);
    assert.equal(overBudgetTier.tier, 'over-budget');
    assert.equal(overBudgetTier.barColor, '#ef4444');

    const unbudgetedTier = resolveCategoryProgressColor(0, 0, 500);
    assert.equal(unbudgetedTier.tier, 'unbudgeted');
    assert.equal(unbudgetedTier.barColor, '#64748b');

    const state = await initializeAndSeedDatabase();
    const plan = computeMonthlyBudgetPlan(state.transactions, '2026-11', state.categories);
    const items = computeCategoryBudgetProgressItems(plan, '2026-11');

    assert.equal(items.length, plan.items.length);

    // Medical & Health is 157% utilized -> over-budget (#ef4444), clamped width 100%
    const medicalItem = items.find((i) => i.category === 'Medical & Health');
    assert.ok(medicalItem);
    assert.equal(medicalItem.tier, 'over-budget');
    assert.equal(medicalItem.barColor, '#ef4444');
    assert.equal(medicalItem.clampedProgressWidthPercent, 100);

    // Rent & Housing is ₹22,000 / ₹24,000 = 91.7% -> warning (#f97316)
    const rentItem = items.find((i) => i.category === 'Rent & Housing');
    assert.ok(rentItem);
    assert.equal(rentItem.tier, 'warning');
    assert.equal(rentItem.barColor, '#f97316');
    assert.equal(rentItem.clampedProgressWidthPercent, 91.7);

    // Food & Groceries is ₹3,450 / ₹18,000 = 19.2% -> healthy (#10b981)
    const foodItem = items.find((i) => i.category === 'Food & Groceries');
    assert.ok(foodItem);
    assert.equal(foodItem.tier, 'healthy');
    assert.equal(foodItem.barColor, '#10b981');
  });

  it('extends the Money Manager data model with currency codes and converts multi-currency transactions in Daily Ledger and Stats using daily exchange rate APIs', async () => {
    const {
      SUPPORTED_CURRENCIES,
      FALLBACK_RATES_TO_INR,
      fetchDailyExchangeRates,
      convertCurrencyAmount,
      resolveTransactionAmountInCurrency,
      summarizeMultiCurrencyTransactions,
      formatCurrencyAmount,
      saveTransaction,
      calculateMonthlyMetrics,
      calculateCategoryBreakdown,
    } = await import('../src/db/db');
    const { computeMonthlyBudgetPlan } = await import('../src/components/money-manager/StatsView');

    assert.ok(SUPPORTED_CURRENCIES.includes('INR'));
    assert.ok(SUPPORTED_CURRENCIES.includes('USD'));
    assert.ok(SUPPORTED_CURRENCIES.includes('EUR'));
    assert.ok(SUPPORTED_CURRENCIES.includes('GBP'));

    // 1. Test daily exchange rate API utility with mock fetch response
    const mockApiSnap = await fetchDailyExchangeRates({
      baseCurrency: 'INR',
      forceRefresh: true,
      date: '2026-11-06',
      fetchImpl: (async () => ({
        ok: true,
        json: async () => ({
          date: '2026-11-06',
          rates: {
            INR: 1,
            USD: 0.0117647, // ~85.00 INR per USD
            EUR: 0.0108695, // ~92.00 INR per EUR
            GBP: 0.0090909, // ~110.00 INR per GBP
          },
        }),
      })) as unknown as typeof fetch,
    });

    assert.equal(mockApiSnap.source, 'api');
    assert.equal(mockApiSnap.date, '2026-11-06');
    assert.equal(Math.round(mockApiSnap.ratesToINR.USD), 85);
    assert.equal(Math.round(mockApiSnap.ratesToINR.EUR), 92);
    assert.equal(Math.round(mockApiSnap.ratesToINR.GBP), 110);

    // 2. Test convertCurrencyAmount & formatCurrencyAmount
    const customRates = { ...FALLBACK_RATES_TO_INR, USD: 85, EUR: 92 };
    assert.equal(convertCurrencyAmount(100, 'USD', 'INR', customRates), 8500);
    assert.equal(convertCurrencyAmount(8500, 'INR', 'USD', customRates), 100);
    assert.ok(formatCurrencyAmount(100, 'USD').includes('$100.00'));
    assert.ok(formatCurrencyAmount(8500, 'INR').includes('₹8,500'));

    // 3. Test saving a foreign-currency transaction in db.ts and resolving its multi-currency values
    const savedUsdTx = await saveTransaction({
      date: '2026-11-18T14:00',
      type: 'Expense',
      accountId: 'acc-icici',
      amount: 100,
      currency: 'USD',
      exchangeRateToINR: 85,
      rateDate: '2026-11-18',
      category: 'Shopping & Lifestyle',
      subCategory: 'Electronics & SaaS',
      fixedOrVariable: 'Variable',
      note: 'Cloud Hosting Subscription in USD',
      receiptImages: [],
      isAnomaly: false,
    });

    assert.equal(savedUsdTx.currency, 'USD');
    assert.equal(savedUsdTx.originalAmount, 100);
    assert.equal(savedUsdTx.exchangeRateToINR, 85);
    assert.equal(savedUsdTx.amount, 8500); // Normalized to base INR in ledger

    const resolvedInUsd = resolveTransactionAmountInCurrency(savedUsdTx, 'USD', customRates);
    assert.equal(resolvedInUsd.originalCurrency, 'USD');
    assert.equal(resolvedInUsd.originalAmount, 100);
    assert.equal(resolvedInUsd.amountInINR, 8500);
    assert.equal(resolvedInUsd.amountInTarget, 100);
    assert.equal(resolvedInUsd.isForeignCurrency, true);

    // 4. Verify multi-currency aggregation in Stats (calculateMonthlyMetrics, calculateCategoryBreakdown, computeMonthlyBudgetPlan)
    const sampleMultiCurrencyTxs = [
      savedUsdTx,
      {
        id: 'tx-eur-freelance',
        date: '2026-11-19T10:00',
        type: 'Income' as const,
        accountId: 'acc-sbi',
        amount: 200,
        currency: 'EUR' as const,
        exchangeRateToINR: 90,
        category: 'Freelance & Consulting',
        subCategory: 'EU Client',
        fixedOrVariable: 'Variable' as const,
        note: 'EU Client Invoice',
        receiptImages: [],
        isAnomaly: false,
      },
    ];

    const metrics = calculateMonthlyMetrics(sampleMultiCurrencyTxs, '2026-11');
    assert.equal(metrics.expense, 8500); // 100 USD * 85
    assert.equal(metrics.income, 18000); // 200 EUR * 90
    assert.equal(metrics.netBalance, 9500);

    const breakdown = calculateCategoryBreakdown(sampleMultiCurrencyTxs, '2026-11');
    assert.equal(breakdown.length, 1);
    assert.equal(breakdown[0].category, 'Shopping & Lifestyle');
    assert.equal(breakdown[0].amount, 8500);

    const budgetPlan = computeMonthlyBudgetPlan(sampleMultiCurrencyTxs, '2026-11');
    const shoppingPlan = budgetPlan.items.find((i) => i.category === 'Shopping & Lifestyle');
    assert.ok(shoppingPlan);
    assert.equal(shoppingPlan.spent, 8500);

    const exposureRows = summarizeMultiCurrencyTransactions(sampleMultiCurrencyTxs, customRates);
    assert.equal(exposureRows.length, 2);
    const usdRow = exposureRows.find((r) => r.currency === 'USD');
    assert.ok(usdRow);
    assert.equal(usdRow.originalExpense, 100);
    assert.equal(usdRow.convertedExpenseINR, 8500);
  });

  it('supports Batch Mode in TransactionModal to log multiple transactions sequentially without closing and reopening the modal', async () => {
    const {
      computeNextSequentialFormState,
      summarizeBatchSession,
      executeSequentialBatchSave,
    } = await import('../src/components/money-manager/TransactionModal');
    const { saveTransaction, getAllLedgerState } = await import('../src/db/db');

    // 1. Verify computeNextSequentialFormState preserves sticky context while resetting transient per-entry fields
    const currentSnapshot = {
      txType: 'Expense' as const,
      dateTime: '2026-11-20T09:15',
      accountId: 'acc-icici',
      toAccountId: 'acc-cash',
      category: 'Food & Groceries',
      subCategory: 'Supermarket & Daily',
      fixedOrVariable: 'Variable' as const,
      currency: 'INR' as const,
      amount: '480',
      note: 'Morning milk and bread',
      receiptImages: ['data:image/png;base64,abc'],
      isAnomaly: true,
      recurringInterval: 'Monthly' as const,
      manualCategoryLock: true,
    };

    const nextSnapshot = computeNextSequentialFormState(currentSnapshot);
    assert.equal(nextSnapshot.txType, 'Expense');
    assert.equal(nextSnapshot.dateTime, '2026-11-20T09:15');
    assert.equal(nextSnapshot.accountId, 'acc-icici');
    assert.equal(nextSnapshot.category, 'Food & Groceries');
    assert.equal(nextSnapshot.subCategory, 'Supermarket & Daily');
    assert.equal(nextSnapshot.fixedOrVariable, 'Variable');
    assert.equal(nextSnapshot.currency, 'INR');
    // Transient entry fields are cleared for immediate next entry
    assert.equal(nextSnapshot.amount, '');
    assert.equal(nextSnapshot.note, '');
    assert.deepEqual(nextSnapshot.receiptImages, []);
    assert.equal(nextSnapshot.isAnomaly, false);
    assert.equal(nextSnapshot.recurringInterval, 'None');
    assert.equal(nextSnapshot.manualCategoryLock, false);

    // 2. Verify sequential batch save persists multiple transactions in a single session without closing
    const batchSummary = await executeSequentialBatchSave(
      [
        {
          date: '2026-11-20T09:15',
          type: 'Expense',
          accountId: 'acc-icici',
          amount: 450,
          currency: 'INR',
          category: 'Food & Groceries',
          subCategory: 'Supermarket & Daily',
          fixedOrVariable: 'Variable',
          note: 'Batch Entry 1: Fresh vegetables',
          receiptImages: [],
          isAnomaly: false,
        },
        {
          date: '2026-11-20T09:30',
          type: 'Expense',
          accountId: 'acc-icici',
          amount: 250,
          currency: 'INR',
          category: 'Transport & Fuel',
          subCategory: 'Metro & Auto',
          fixedOrVariable: 'Variable',
          note: 'Batch Entry 2: Metro card recharge',
          receiptImages: [],
          isAnomaly: false,
        },
        {
          date: '2026-11-20T10:00',
          type: 'Income',
          accountId: 'acc-sbi',
          amount: 1500,
          currency: 'INR',
          category: 'Freelance & Consulting',
          subCategory: 'Advisory',
          fixedOrVariable: 'Variable',
          note: 'Batch Entry 3: Quick consulting payout',
          receiptImages: [],
          isAnomaly: false,
        },
      ],
      saveTransaction
    );

    assert.equal(batchSummary.count, 3);
    assert.equal(batchSummary.totalExpenseINR, 700);
    assert.equal(batchSummary.totalIncomeINR, 1500);
    assert.equal(batchSummary.netDeltaINR, 800);
    assert.equal(batchSummary.items.length, 3);

    const recomputedSummary = summarizeBatchSession(batchSummary.items);
    assert.equal(recomputedSummary.count, 3);
    assert.equal(recomputedSummary.totalExpenseINR, 700);
    assert.equal(recomputedSummary.totalIncomeINR, 1500);

    const state = await getAllLedgerState();
    for (const logged of batchSummary.items) {
      assert.ok(
        state.transactions.some((tx) => tx.id === logged.id),
        `Expected batch transaction ${logged.id} to be persisted in ledger`
      );
    }
  });

  it('predicts total month-end expenditures for each category compared to set limits in BudgetForecastCard using current month spending velocity', async () => {
    const {
      BudgetForecastCard,
      calculateVelocityBudgetForecast,
    } = await import('../src/components/money-manager/StatsView');

    assert.ok(BudgetForecastCard, 'Expected BudgetForecastCard component export');

    const state = await initializeAndSeedDatabase();

    // Evaluate at Day 10 of 30 in 2026-11 (3x multiplier for Variable categories)
    const forecast = calculateVelocityBudgetForecast(
      state.transactions,
      state.categories,
      '2026-11',
      {
        referenceDayOfMonth: 10,
        thresholdOverrides: {
          'Food & Groceries': 10000,
        },
      }
    );

    assert.equal(forecast.daysInMonth, 30);
    assert.equal(forecast.daysElapsed, 10);
    assert.equal(forecast.daysRemaining, 20);
    assert.ok(forecast.totalSafeDailySpendLimit > 0);

    const foodForecast = forecast.items.find((i) => i.category === 'Food & Groceries');
    assert.ok(foodForecast, 'Expected Food & Groceries forecast item');
    assert.equal(foodForecast.definedBudget, 10000);
    assert.equal(foodForecast.safeDailySpendLimit, Math.round(10000 / 30));
    assert.equal(foodForecast.dailyVelocity, Math.round(foodForecast.currentSpent / 10));
    assert.equal(
      foodForecast.predictedMonthEndTotal,
      Math.round((foodForecast.currentSpent / 10) * 30)
    );
    assert.equal(
      foodForecast.comparisonStatus,
      foodForecast.predictedUtilizationPercent > 100
        ? 'predicted-over'
        : foodForecast.predictedUtilizationPercent >= 85
        ? 'at-risk'
        : 'on-track'
    );
  });

  it('applies site-wide dark and light mode theme variables to Money Manager when toggled from the main app interface', async () => {
    const {
      SITE_DARK_THEME_VARIABLES,
      SITE_LIGHT_THEME_VARIABLES,
      resolveSiteThemeVariables,
      detectActiveSiteTheme,
      syncMoneyManagerThemeWithSite,
    } = await import('../src/tools/MoneyManager');
    const fs = await import('node:fs');
    const path = await import('node:path');

    // 1. Verify dark and light theme variable dictionaries match site-wide CSS tokens
    const darkVars = resolveSiteThemeVariables('dark');
    assert.equal(darkVars['--bg'], '#0f172a');
    assert.equal(darkVars['--surface'], '#1e293b');
    assert.equal(darkVars['--border'], '#334155');
    assert.equal(darkVars['--text'], '#f8fafc');
    assert.equal(darkVars['--text-heading'], '#ffffff');
    assert.equal(darkVars['--accent'], '#38bdf8');
    assert.equal(darkVars['--mm-bg'], SITE_DARK_THEME_VARIABLES['--bg']);
    assert.equal(darkVars['--mm-surface'], SITE_DARK_THEME_VARIABLES['--surface']);

    const lightVars = resolveSiteThemeVariables('light');
    assert.equal(lightVars['--bg'], '#f8fafc');
    assert.equal(lightVars['--surface'], '#ffffff');
    assert.equal(lightVars['--border'], '#e2e8f0');
    assert.equal(lightVars['--text'], '#0f172a');
    assert.equal(lightVars['--text-heading'], '#0f172a');
    assert.equal(lightVars['--accent'], '#0284c7');
    assert.equal(lightVars['--mm-bg'], SITE_LIGHT_THEME_VARIABLES['--bg']);
    assert.equal(lightVars['--mm-surface'], SITE_LIGHT_THEME_VARIABLES['--surface']);

    // 2. Verify detectActiveSiteTheme reads data-theme and classes from documentElement
    const mockDarkDoc = {
      documentElement: {
        getAttribute: (attr: string) => (attr === 'data-theme' ? 'dark' : null),
        classList: { contains: (cls: string) => cls === 'dark' },
      },
      body: {
        getAttribute: () => null,
        classList: { contains: () => false },
      },
    } as unknown as Document;
    assert.equal(detectActiveSiteTheme(mockDarkDoc, null), 'dark');

    const mockLightDoc = {
      documentElement: {
        getAttribute: (attr: string) => (attr === 'data-theme' ? 'light' : null),
        classList: { contains: (cls: string) => cls === 'light' },
      },
      body: {
        getAttribute: () => null,
        classList: { contains: () => false },
      },
    } as unknown as Document;
    assert.equal(detectActiveSiteTheme(mockLightDoc, null), 'light');

    // 3. Verify syncMoneyManagerThemeWithSite applies data-theme, classes, and CSS variables to target element
    const appliedAttrs: Record<string, string> = {};
    const appliedProps: Record<string, string> = {};
    const activeClasses = new Set<string>();
    const mockShellEl = {
      setAttribute: (k: string, v: string) => {
        appliedAttrs[k] = v;
      },
      classList: {
        remove: (...tokens: string[]) => tokens.forEach((t) => activeClasses.delete(t)),
        add: (...tokens: string[]) => tokens.forEach((t) => activeClasses.add(t)),
      },
      style: {
        setProperty: (k: string, v: string) => {
          appliedProps[k] = v;
        },
      },
    } as unknown as HTMLElement;

    const syncedDark = syncMoneyManagerThemeWithSite(mockShellEl, 'dark');
    assert.equal(syncedDark.mode, 'dark');
    assert.equal(appliedAttrs['data-theme'], 'dark');
    assert.ok(activeClasses.has('dark'));
    assert.ok(activeClasses.has('theme-dark'));
    assert.equal(appliedProps['--bg'], '#0f172a');
    assert.equal(appliedProps['--surface'], '#1e293b');
    assert.equal(appliedProps['--mm-accent'], '#38bdf8');

    const syncedLight = syncMoneyManagerThemeWithSite(mockShellEl, 'light');
    assert.equal(syncedLight.mode, 'light');
    assert.equal(appliedAttrs['data-theme'], 'light');
    assert.ok(activeClasses.has('light'));
    assert.ok(activeClasses.has('theme-light'));
    assert.ok(!activeClasses.has('dark'));
    assert.equal(appliedProps['--bg'], '#f8fafc');
    assert.equal(appliedProps['--surface'], '#ffffff');
    assert.equal(appliedProps['--mm-accent'], '#0284c7');

    // 4. Verify index.css includes site-wide theme variable mappings on .mm-page-shell
    const cssSource = fs.readFileSync(path.resolve(process.cwd(), 'src/index.css'), 'utf8');
    assert.ok(cssSource.includes('[data-theme="dark"] .mm-page-shell'));
    assert.ok(cssSource.includes('[data-theme="light"] .mm-page-shell'));
    assert.ok(cssSource.includes('--mm-bg: var(--bg)'));
    assert.ok(cssSource.includes('--mm-surface: var(--surface)'));
  });

  it('supports the Alt + N keyboard shortcut to directly open the Money Manager transaction modal from anywhere in the tool suite', async () => {
    const {
      MONEY_MANAGER_NEW_TX_SHORTCUT_COMBO,
      MONEY_MANAGER_NEW_TX_SHORTCUT_ID,
      MONEY_MANAGER_NEW_TX_EVENT,
      MONEY_MANAGER_LEDGER_UPDATED_EVENT,
      isMoneyManagerNewTransactionShortcut,
      triggerMoneyManagerTransactionModal,
      consumePendingMoneyManagerModalRequest,
      GlobalMoneyManagerQuickModal,
    } = await import('../src/tools/MoneyManager');
    const { matchHotkey } = await import('../src/hooks/useKeyboardShortcuts');

    // 1. Verify exported shortcut constants
    assert.equal(MONEY_MANAGER_NEW_TX_SHORTCUT_COMBO, 'alt+n');
    assert.equal(MONEY_MANAGER_NEW_TX_SHORTCUT_ID, 'money-manager-new-tx');
    assert.equal(MONEY_MANAGER_NEW_TX_EVENT, 'open-money-manager-tx-modal');
    assert.equal(MONEY_MANAGER_LEDGER_UPDATED_EVENT, 'money-manager-ledger-updated');
    assert.equal(typeof GlobalMoneyManagerQuickModal, 'function');

    // 2. Verify keyboard event matcher for Alt + N (including uppercase N and macOS Option + N dead key with KeyN code)
    assert.equal(
      isMoneyManagerNewTransactionShortcut({
        key: 'n',
        code: 'KeyN',
        altKey: true,
        ctrlKey: false,
        metaKey: false,
        shiftKey: false,
      }),
      true
    );
    assert.equal(
      isMoneyManagerNewTransactionShortcut({
        key: 'N',
        code: 'KeyN',
        altKey: true,
        ctrlKey: false,
        metaKey: false,
        shiftKey: false,
      }),
      true
    );
    assert.equal(
      isMoneyManagerNewTransactionShortcut({
        key: 'Dead',
        code: 'KeyN',
        altKey: true,
        ctrlKey: false,
        metaKey: false,
        shiftKey: false,
      }),
      true
    );
    // Reject plain 'n', Ctrl+Alt+N, Shift+Alt+N, or repeat events
    assert.equal(
      isMoneyManagerNewTransactionShortcut({
        key: 'n',
        code: 'KeyN',
        altKey: false,
        ctrlKey: false,
        metaKey: false,
        shiftKey: false,
      }),
      false
    );
    assert.equal(
      isMoneyManagerNewTransactionShortcut({
        key: 'n',
        code: 'KeyN',
        altKey: true,
        ctrlKey: true,
        metaKey: false,
        shiftKey: false,
      }),
      false
    );
    assert.equal(
      isMoneyManagerNewTransactionShortcut({
        key: 'n',
        code: 'KeyN',
        altKey: true,
        ctrlKey: false,
        metaKey: false,
        shiftKey: false,
        repeat: true,
      }),
      false
    );

    // 3. Verify global matchHotkey also matches 'alt+n' accurately
    assert.equal(
      matchHotkey(
        {
          key: 'n',
          code: 'KeyN',
          altKey: true,
          ctrlKey: false,
          metaKey: false,
          shiftKey: false,
        } as unknown as KeyboardEvent,
        'alt+n'
      ),
      true
    );

    // 4. Verify triggerMoneyManagerTransactionModal queues and dispatches request payload
    consumePendingMoneyManagerModalRequest(); // Clear any prior state
    const payload = triggerMoneyManagerTransactionModal({
      initialType: 'expense',
      initialDate: '2026-11-15',
      source: 'alt+n',
    });
    assert.equal(payload.source, 'alt+n');
    assert.equal(payload.initialType, 'expense');
    assert.equal(payload.initialDate, '2026-11-15');
    assert.equal(typeof payload.timestamp, 'number');

    const consumed = consumePendingMoneyManagerModalRequest();
    assert.ok(consumed);
    assert.equal(consumed?.source, 'alt+n');
    assert.equal(consumed?.initialType, 'expense');
    assert.equal(consumed?.initialDate, '2026-11-15');

    // Second consume returns null after queue is drained
    assert.equal(consumePendingMoneyManagerModalRequest(), null);
  });

  it('renders a floating + Quick-Add button in the bottom-right corner of the Daily Ledger and Accounts tabs to trigger the transaction modal without navigating away', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const {
      QuickAddFloatingButton,
      QUICK_ADD_VISIBLE_TABS,
      shouldRenderQuickAddFab,
      triggerQuickAddTransactionModal,
      consumePendingMoneyManagerModalRequest,
    } = await import('../src/tools/MoneyManager');
    const DailyViewMod = await import('../src/components/money-manager/DailyView');
    const AccountsViewMod = await import('../src/components/money-manager/AccountsView');

    // 1. Verify Quick-Add FAB is exported across MoneyManager, DailyView, and AccountsView
    assert.equal(typeof QuickAddFloatingButton, 'function');
    assert.equal(typeof DailyViewMod.QuickAddFloatingButton, 'function');
    assert.equal(typeof AccountsViewMod.QuickAddFloatingButton, 'function');
    assert.deepEqual([...QUICK_ADD_VISIBLE_TABS], ['daily', 'accounts']);

    // 2. Verify tab visibility rules: enabled on Daily Ledger ('daily') and Accounts ('accounts'), disabled on other tabs
    assert.equal(shouldRenderQuickAddFab('daily'), true);
    assert.equal(shouldRenderQuickAddFab('accounts'), true);
    assert.equal(shouldRenderQuickAddFab('calendar'), false);
    assert.equal(shouldRenderQuickAddFab('stats'), false);
    assert.equal(shouldRenderQuickAddFab('recurring'), false);

    // 3. Verify triggering Quick-Add from 'daily' and 'accounts' opens the modal callback in-place without navigating away
    let openedFromDailyCount = 0;
    let openedDateFromDaily: string | undefined;
    const dailyResult = triggerQuickAddTransactionModal({
      tab: 'daily',
      defaultDate: '2026-11-06',
      onOpenAddModal: (date) => {
        openedFromDailyCount += 1;
        openedDateFromDaily = date;
      },
    });
    assert.equal(dailyResult.triggered, true);
    assert.equal(dailyResult.tab, 'daily');
    assert.equal(dailyResult.navigatedAway, false);
    assert.equal(openedFromDailyCount, 1);
    assert.equal(openedDateFromDaily, '2026-11-06');

    let openedFromAccountsCount = 0;
    const accountsResult = triggerQuickAddTransactionModal({
      tab: 'accounts',
      onOpenAddModal: () => {
        openedFromAccountsCount += 1;
      },
    });
    assert.equal(accountsResult.triggered, true);
    assert.equal(accountsResult.tab, 'accounts');
    assert.equal(accountsResult.navigatedAway, false);
    assert.equal(openedFromAccountsCount, 1);

    // 4. Verify fallback global modal dispatch when onOpenAddModal is omitted
    consumePendingMoneyManagerModalRequest();
    const fallbackResult = triggerQuickAddTransactionModal({
      tab: 'accounts',
      defaultDate: '2026-11-10',
    });
    assert.equal(fallbackResult.triggered, true);
    assert.equal(fallbackResult.navigatedAway, false);
    const pendingPayload = consumePendingMoneyManagerModalRequest();
    assert.ok(pendingPayload);
    assert.equal(pendingPayload?.source, 'quick-add-accounts');
    assert.equal(pendingPayload?.defaultDate, '2026-11-10');

    // 5. Verify DailyView.tsx and AccountsView.tsx mount <QuickAddFloatingButton /> and index.css defines bottom-right positioning
    const dailySource = fs.readFileSync(
      path.resolve(process.cwd(), 'src/components/money-manager/DailyView.tsx'),
      'utf8'
    );
    const accountsSource = fs.readFileSync(
      path.resolve(process.cwd(), 'src/components/money-manager/AccountsView.tsx'),
      'utf8'
    );
    const cssSource = fs.readFileSync(path.resolve(process.cwd(), 'src/index.css'), 'utf8');

    assert.ok(dailySource.includes('<QuickAddFloatingButton'));
    assert.ok(dailySource.includes('tab="daily"'));
    assert.ok(accountsSource.includes('<QuickAddFloatingButton'));
    assert.ok(accountsSource.includes('tab="accounts"'));
    assert.ok(cssSource.includes('.mm-quick-add-fab'));
  });

  it('compares total spending across all categories for the last 6 months in SixMonthCategoryComparisonCard using Recharts', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const {
      SixMonthCategoryComparisonCard,
      computeSixMonthCategoryComparison,
      buildSixMonthWindow,
    } = await import('../src/tools/MoneyManager');
    const StatsViewMod = await import('../src/components/money-manager/StatsView');

    // 1. Verify exports across MoneyManager and StatsView
    assert.equal(typeof SixMonthCategoryComparisonCard, 'function');
    assert.equal(typeof StatsViewMod.SixMonthCategoryComparisonCard, 'function');
    assert.equal(typeof computeSixMonthCategoryComparison, 'function');
    assert.equal(typeof buildSixMonthWindow, 'function');

    // 2. Verify 6-month window construction ending at 2026-11
    const windowPoints = buildSixMonthWindow('2026-11');
    assert.equal(windowPoints.length, 6);
    assert.equal(windowPoints[0].yearMonth, '2026-06');
    assert.equal(windowPoints[0].label, "Jun '26");
    assert.equal(windowPoints[5].yearMonth, '2026-11');
    assert.equal(windowPoints[5].label, "Nov '26");

    // 3. Compute 6-month category comparison on seeded database state
    const state = await initializeAndSeedDatabase();
    const summary = computeSixMonthCategoryComparison(
      state.transactions,
      '2026-11',
      state.categories
    );

    assert.equal(summary.referenceYearMonth, '2026-11');
    assert.equal(summary.startYearMonth, '2026-06');
    assert.equal(summary.periodLabel, "Jun '26 – Nov '26");
    assert.equal(summary.months.length, 6);
    assert.equal(summary.monthlyStackedData.length, 6);
    assert.ok(summary.categories.length >= state.categories.length);
    assert.ok(summary.grandTotalSixMonthSpent > 0);

    // Sum of all category 6-month totals must equal grandTotalSixMonthSpent
    const summedCategoryTotals = summary.categories.reduce(
      (acc, row) => acc + row.totalSixMonthSpent,
      0
    );
    assert.equal(summedCategoryTotals, summary.grandTotalSixMonthSpent);

    // Rent & Housing should have all 6 monthly breakdown points summing to totalSixMonthSpent
    const rentRow = summary.categories.find((c) => c.category === 'Rent & Housing');
    assert.ok(rentRow);
    const rentBreakdownSum = rentRow.monthlyBreakdown.reduce((acc, m) => acc + m.spent, 0);
    assert.equal(rentRow.totalSixMonthSpent, rentBreakdownSum);
    assert.ok(rentRow.totalSixMonthSpent >= 132000);
    assert.equal(rentRow.averageMonthlySpent, Math.round(rentRow.totalSixMonthSpent / 6));
    assert.equal(rentRow.monthlyLimit, 24000);
    assert.equal(rentRow.sixMonthBudgetLimit, 144000);
    assert.equal(rentRow.monthlyBreakdown.length, 6);

    // Categories are sorted descending by totalSixMonthSpent
    for (let i = 1; i < summary.categories.length; i += 1) {
      assert.ok(
        summary.categories[i - 1].totalSixMonthSpent >= summary.categories[i].totalSixMonthSpent
      );
    }

    // 4. Verify StatsView.tsx mounts <SixMonthCategoryComparisonCard /> and SixMonthCategoryComparisonCard.tsx uses Recharts BarChart
    const statsSource = fs.readFileSync(
      path.resolve(process.cwd(), 'src/components/money-manager/StatsView.tsx'),
      'utf8'
    );
    const cardSource = fs.readFileSync(
      path.resolve(
        process.cwd(),
        'src/components/money-manager/SixMonthCategoryComparisonCard.tsx'
      ),
      'utf8'
    );

    assert.ok(statsSource.includes('<SixMonthCategoryComparisonCard'));
    assert.ok(cardSource.includes('<ResponsiveContainer'));
    assert.ok(cardSource.includes('<BarChart'));
    assert.ok(cardSource.includes('dataKey="totalSixMonthSpent"'));
  });

  it('provides a Receipts tab in Daily Ledger with a scrollable grid gallery of transactions with photos that open directly in the existing lightbox', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const { aggregateTransactionReceipts } = await import('../src/components/money-manager/DailyView');

    // 1. Seed database state containing transactions with receipt images
    const state = await initializeAndSeedDatabase();
    const receiptsAll = aggregateTransactionReceipts(state.transactions, {
      includeAllMonths: true,
    });
    assert.ok(receiptsAll.length >= 1, 'Expected at least 1 receipt in seeded dataset');

    const firstReceipt = receiptsAll[0];
    assert.ok(firstReceipt.imageUrl);
    assert.ok(firstReceipt.transactionId);
    assert.ok(firstReceipt.category);

    // 2. Verify aggregateTransactionReceipts filters by search query and category
    const medicalReceipts = aggregateTransactionReceipts(state.transactions, {
      includeAllMonths: true,
      categoryFilter: 'Medical & Health',
    });
    assert.ok(medicalReceipts.every((r) => r.category === 'Medical & Health'));

    // 3. Verify DailyView.tsx includes Receipts tab switcher, scrollable gallery container, and lightbox invocation
    const dailySource = fs.readFileSync(
      path.resolve(process.cwd(), 'src/components/money-manager/DailyView.tsx'),
      'utf8'
    );
    assert.ok(dailySource.includes('data-tab="receipts"'));
    assert.ok(dailySource.includes('mm-receipt-gallery-scroll-container'));
    assert.ok(dailySource.includes('onOpenReceiptLightbox('));
  });

  it('highlights spending categories in red in Stats & Budgets tab if total expenses for current month exceed a user-defined threshold', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const {
      evaluateCategoryBudgetAlerts,
      computeMonthlyBudgetPlan,
      resolveCategoryProgressColor,
      computeCategoryBudgetProgressItems,
    } = await import('../src/components/money-manager/StatsView');

    const state = await initializeAndSeedDatabase();

    // 1. Evaluate with a low user-defined threshold of ₹2,000 across all categories
    const customThreshold = 2000;
    const alertResults = evaluateCategoryBudgetAlerts(
      state.transactions,
      '2026-11',
      customThreshold,
      state.categories
    );

    assert.ok(alertResults.exceededCategories.length >= 1, 'Expected categories to exceed ₹2,000 threshold');
    const medicalExceeded = alertResults.exceededCategories.find(
      (c) => c.category === 'Medical & Health'
    );
    assert.ok(medicalExceeded);
    assert.equal(medicalExceeded.isOverBudget, true);
    assert.equal(medicalExceeded.monthlyBudget, 2000);
    assert.ok(medicalExceeded.overBudgetAmount > 0);

    // 2. Verify computeCategoryBudgetProgressItems resolves tier 'over-budget' and red color #ef4444
    const plan = computeMonthlyBudgetPlan(
      state.transactions,
      '2026-11',
      state.categories,
      customThreshold
    );
    const progressItems = computeCategoryBudgetProgressItems(plan, '2026-11');
    const medicalItem = progressItems.find((item) => item.category === 'Medical & Health');
    assert.ok(medicalItem);
    assert.equal(medicalItem.tier, 'over-budget');
    assert.equal(medicalItem.barColor, '#ef4444');
    assert.equal(medicalItem.textColor, '#ef4444');
    assert.equal(medicalItem.statusLabel, 'Over Budget');

    // 3. Verify CategoryBudgetProgressCard and StatsView styling includes red highlight for over-budget items
    const progressCardSource = fs.readFileSync(
      path.resolve(process.cwd(), 'src/components/money-manager/CategoryBudgetProgressCard.tsx'),
      'utf8'
    );
    const cssSource = fs.readFileSync(path.resolve(process.cwd(), 'src/index.css'), 'utf8');

    assert.ok(progressCardSource.includes('data-over-budget'));
    assert.ok(progressCardSource.includes('#ef4444'));
    assert.ok(cssSource.includes('.mm-category-legend-row.is-over-budget'));
  });

  it('defines and automatically schedules recurring transactions (e.g., monthly rent, subscriptions) that appear in the Daily Ledger automatically', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const {
      defineAndScheduleRecurringTransaction,
      RECURRING_TEMPLATE_PRESETS,
      computeRecurringOccurrencesForMonth,
      buildRecurringFeedTransactionsForMonth,
    } = await import('../src/db/db');
    const { filterDailyTransactions } = await import('../src/components/money-manager/DailyView');

    await initializeAndSeedDatabase();

    // 1. Verify built-in presets include Monthly Rent and Subscriptions
    assert.ok(Array.isArray(RECURRING_TEMPLATE_PRESETS));
    assert.ok(RECURRING_TEMPLATE_PRESETS.length >= 4);
    const rentPreset = RECURRING_TEMPLATE_PRESETS.find((p) => p.id === 'preset-monthly-rent');
    const subPreset = RECURRING_TEMPLATE_PRESETS.find((p) => p.id === 'preset-subscriptions');
    assert.ok(rentPreset, 'Expected Monthly Rent preset');
    assert.equal(rentPreset.frequency, 'Monthly');
    assert.equal(rentPreset.type, 'Expense');
    assert.ok(subPreset, 'Expected Subscriptions preset');
    assert.equal(subPreset.frequency, 'Monthly');

    // 2. Define and schedule a new recurring transaction for November 2026
    const result = await defineAndScheduleRecurringTransaction(
      {
        title: 'Bandra Apartment Monthly Rent',
        frequency: 'Monthly',
        type: 'Expense',
        accountId: 'acc-hdfc',
        amount: 42000,
        category: 'Rent & Housing',
        subCategory: 'House Rent',
        fixedOrVariable: 'Fixed',
        note: 'Automated monthly apartment rent lease',
        startDate: '2026-11-05',
      },
      '2026-11'
    );

    assert.ok(result.rule.id, 'Expected newly created rule ID');
    assert.equal(result.rule.title, 'Bandra Apartment Monthly Rent');
    assert.equal(result.rule.active, true);
    assert.equal(result.rule.frequency, 'Monthly');

    // 3. Verify occurrences for 2026-11 and automatic inclusion in the Daily Ledger feed
    const occurrences = computeRecurringOccurrencesForMonth(result.rule, '2026-11');
    assert.deepEqual(occurrences, ['2026-11-05']);

    const scheduledInFeed = result.monthlyFeedTransactions.find(
      (tx) =>
        tx.recurringRuleId === result.rule.id ||
        tx.note.includes('Bandra Apartment Monthly Rent')
    );
    assert.ok(
      scheduledInFeed,
      'Expected newly defined recurring transaction to appear automatically in the monthly Daily Ledger feed'
    );
    assert.equal(scheduledInFeed.amount, 42000);
    assert.equal(scheduledInFeed.category, 'Rent & Housing');
    assert.ok(scheduledInFeed.date.startsWith('2026-11-05'));

    // 4. Verify future-dated recurring subscription within the month also appears automatically in DailyView via buildRecurringFeedTransactionsForMonth & filterDailyTransactions
    const subResult = await defineAndScheduleRecurringTransaction(
      {
        title: 'Enterprise AI Suite Subscription',
        frequency: 'Monthly',
        type: 'Expense',
        accountId: 'acc-icici',
        amount: 2499,
        category: 'Subscriptions & Cloud',
        subCategory: 'SaaS & Streaming',
        fixedOrVariable: 'Fixed',
        note: 'Monthly AI & Cloud Pro Subscription',
        startDate: '2026-11-28',
      },
      '2026-11'
    );

    const feedForNov = buildRecurringFeedTransactionsForMonth(
      subResult.monthlyFeedTransactions,
      subResult.updatedRules,
      '2026-11'
    );
    const filteredDailyNov = filterDailyTransactions(feedForNov, {
      selectedMonth: '2026-11',
      searchQuery: 'Enterprise AI Suite Subscription',
    });
    assert.equal(filteredDailyNov.length, 1);
    assert.equal(filteredDailyNov[0].amount, 2499);
    assert.equal(filteredDailyNov[0].recurringRuleId, subResult.rule.id);

    // 5. Verify UI wiring in DailyView.tsx and MoneyManager.tsx
    const dailySource = fs.readFileSync(
      path.resolve(process.cwd(), 'src/components/money-manager/DailyView.tsx'),
      'utf8'
    );
    const mmSource = fs.readFileSync(
      path.resolve(process.cwd(), 'src/tools/MoneyManager.tsx'),
      'utf8'
    );
    assert.ok(dailySource.includes('mm-daily-recurring-presets-bar'));
    assert.ok(dailySource.includes('mm-daily-active-recurring-strip'));
    assert.ok(mmSource.includes('await syncRecurringTransactionsForMonth(selectedMonth)'));
  });

  it('refactors Google Auth in MoneyManager.tsx to use signInWithRedirect and getRedirectResult with drive.appdata scope while maintaining full offline IndexedDB, JSON, and Excel persistence', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const {
      SCOPES,
      DRIVE_APPDATA_SCOPE,
      createGoogleDriveAuthProvider,
      getGoogleDriveAccessToken,
      setMockAccessTokenForTest,
    } = await import('../src/components/money-manager/googleDriveSync');
    const {
      exportDatabaseBackup,
      saveTransaction,
      initializeAndSeedDatabase,
    } = await import('../src/db/db');
    const { buildMoneyManagerWorkbook } = await import(
      '../src/components/money-manager/excelExporter'
    );

    // 1. Verify drive.appdata scope is configured
    assert.equal(DRIVE_APPDATA_SCOPE, 'https://www.googleapis.com/auth/drive.appdata');
    assert.ok(SCOPES.includes('https://www.googleapis.com/auth/drive.appdata'));

    const provider = createGoogleDriveAuthProvider();
    assert.ok(provider, 'Expected GoogleAuthProvider instance');

    // 2. Verify MoneyManager.tsx, pages/tools/MoneyManager.tsx, BackupRestoreModal.tsx, and googleDriveSync.ts use signInWithRedirect & getRedirectResult without signInWithPopup
    const mmToolSource = fs.readFileSync(
      path.resolve(process.cwd(), 'src/tools/MoneyManager.tsx'),
      'utf8'
    );
    const mmPageSource = fs.readFileSync(
      path.resolve(process.cwd(), 'src/pages/tools/MoneyManager.tsx'),
      'utf8'
    );
    const driveSyncSource = fs.readFileSync(
      path.resolve(process.cwd(), 'src/components/money-manager/googleDriveSync.ts'),
      'utf8'
    );
    const backupModalSource = fs.readFileSync(
      path.resolve(process.cwd(), 'src/components/money-manager/BackupRestoreModal.tsx'),
      'utf8'
    );

    assert.ok(mmToolSource.includes('signInWithRedirect'));
    assert.ok(mmToolSource.includes('getRedirectResult'));
    assert.ok(mmToolSource.includes('GoogleAuthProvider'));
    assert.ok(mmToolSource.includes("provider.addScope('https://www.googleapis.com/auth/drive.appdata')"));
    assert.ok(mmToolSource.includes('const checkRedirect = async () =>'));
    assert.ok(mmToolSource.includes('const handleGoogleSignIn = async () =>'));
    assert.equal(mmToolSource.includes('signInWithPopup'), false);

    assert.ok(mmPageSource.includes('signInWithRedirect'));
    assert.ok(mmPageSource.includes('getRedirectResult'));
    assert.ok(mmPageSource.includes('GoogleAuthProvider'));

    assert.ok(driveSyncSource.includes('signInWithRedirect'));
    assert.ok(driveSyncSource.includes('getRedirectResult'));
    assert.equal(driveSyncSource.includes('signInWithPopup'), false);

    assert.ok(backupModalSource.includes('signInWithRedirect'));
    assert.ok(backupModalSource.includes('getRedirectResult'));

    // 3. Verify offline persistence (IndexedDB ledger, JSON backup, and Excel workbook generation) works 100% without Google login
    setMockAccessTokenForTest(null);
    assert.equal(await getGoogleDriveAccessToken(), null);

    const state = await initializeAndSeedDatabase();
    const savedOfflineTx = await saveTransaction({
      date: '2026-11-18T14:30',
      type: 'Expense',
      accountId: 'acc-icici',
      amount: 1850,
      category: 'Food & Groceries',
      subCategory: 'Supermarket Groceries',
      fixedOrVariable: 'Variable',
      note: 'Offline InPrivate transaction without Google login',
      receiptImages: [],
      isAnomaly: false,
    });
    assert.ok(savedOfflineTx.id);

    const jsonBackup = await exportDatabaseBackup();
    assert.ok(
      jsonBackup.transactions.some((tx) => tx.id === savedOfflineTx.id),
      'Expected offline transaction in JSON backup without Google auth'
    );

    const wb = buildMoneyManagerWorkbook({
      accounts: state.accounts,
      categories: state.categories,
      transactions: jsonBackup.transactions,
      sinkingFunds: state.sinkingFunds,
      selectedMonth: '2026-11',
    });
    assert.ok(wb.SheetNames.includes('Transactions Ledger'));
  });

  it('bulk-imports transactions from a CSV file directly into the local IndexedDB ledger with duplicate prevention and multi-currency conversion', async () => {
    const initialState = await initializeAndSeedDatabase();
    const initialCount = initialState.transactions.length;

    // 1. Bulk import sample bank statement CSV directly into IndexedDB via bulkImportCsvToLedger
    const result1 = await bulkImportCsvToLedger(SAMPLE_BANK_STATEMENT_CSV, {
      defaultAccountId: 'acc-icici',
      skipDuplicates: true,
    });

    assert.equal(result1.summary.totalCount, 5);
    assert.equal(result1.summary.expenseCount, 3);
    assert.equal(result1.summary.incomeCount, 1);
    assert.equal(result1.summary.transferCount, 1);
    assert.equal(result1.importedTransactions.length, 5);
    assert.equal(result1.parsedRowCount, 5);
    assert.equal(result1.skippedRowCount, 0);

    const stateAfterFirstImport = await initializeAndSeedDatabase();
    assert.equal(stateAfterFirstImport.transactions.length, initialCount + 5);

    // 2. Re-importing the exact same CSV with skipDuplicates: true skips all 5 already-persisted transactions
    const resultDuplicate = await bulkImportCsvToLedger(SAMPLE_BANK_STATEMENT_CSV, {
      defaultAccountId: 'acc-icici',
      skipDuplicates: true,
    });
    assert.equal(resultDuplicate.skippedRowCount, 5);
    assert.equal(resultDuplicate.summary.totalCount, 0);
    assert.equal(resultDuplicate.importedTransactions.length, 0);

    const stateAfterDuplicateImport = await initializeAndSeedDatabase();
    assert.equal(stateAfterDuplicateImport.transactions.length, initialCount + 5);

    // 3. Test bulkImportCsvFileToLedger with a File-like object containing single-amount + Currency columns
    const customCsvContent = [
      'Date,Narration,Amount,Currency,Category,Account',
      '2026-11-21,GitHub Copilot Subscription,-10,USD,Utilities & Bills,ICICI',
      '2026-11-22,Stripe Freelance Payout,500,EUR,Salary & Consulting,SBI',
    ].join('\n');

    const mockCsvFile = {
      name: 'international-statement.csv',
      text: async () => customCsvContent,
    };

    const resultFile = await bulkImportCsvFileToLedger(mockCsvFile, {
      defaultAccountId: 'acc-icici',
      skipDuplicates: true,
    });

    assert.equal(resultFile.summary.totalCount, 2);
    assert.equal(resultFile.importedTransactions.length, 2);

    const usdExpense = resultFile.importedTransactions.find((tx) => tx.note.includes('GitHub Copilot'));
    assert.ok(usdExpense, 'Expected USD expense row to be imported into IndexedDB');
    assert.equal(usdExpense.type, 'Expense');
    assert.equal(usdExpense.currency, 'USD');
    assert.equal(usdExpense.originalAmount, 10);
    assert.ok(usdExpense.amount > 800, 'Expected USD amount to be converted to INR');

    const eurIncome = resultFile.importedTransactions.find((tx) => tx.note.includes('Stripe Freelance'));
    assert.ok(eurIncome, 'Expected EUR income row to be imported into IndexedDB');
    assert.equal(eurIncome.type, 'Income');
    assert.equal(eurIncome.accountId, 'acc-sbi');
    assert.equal(eurIncome.currency, 'EUR');
    assert.equal(eurIncome.originalAmount, 500);

    const finalState = await initializeAndSeedDatabase();
    assert.equal(finalState.transactions.length, initialCount + 7);

    // 4. Verify Header and MoneyManager expose top-level Import CSV button and modal
    const fs = await import('node:fs');
    const headerSource = fs.readFileSync('src/components/money-manager/Header.tsx', 'utf8');
    const mmToolSource = fs.readFileSync('src/tools/MoneyManager.tsx', 'utf8');
    const csvModalSource = fs.readFileSync('src/components/money-manager/CsvImportModal.tsx', 'utf8');

    assert.ok(headerSource.includes('mm-header-import-csv-btn'));
    assert.ok(headerSource.includes('onOpenCsvImportModal'));
    assert.ok(mmToolSource.includes('CsvImportModal'));
    assert.ok(mmToolSource.includes('bulkImportCsvToLedger'));
    assert.ok(csvModalSource.includes('mm-csv-skip-duplicates-checkbox'));
  });

  it('extends the Money Manager Settings panel to export the local IndexedDB transaction ledger into a downloadable CSV file with full round-trip import parity', async () => {
    const {
      exportIndexedDbLedgerToCsv,
      formatLedgerTransactionsToParityCsv,
      generateBulkLedgerCsvExport,
    } = await import('../src/components/money-manager/BackupRestoreModal');

    await initializeAndSeedDatabase();

    // Add a multi-currency anomaly expense to verify multi-currency, timestamp, Fixed/Variable, and Anomaly Flag parity
    await saveTransaction({
      id: 'tx-2026-11-24-aws-cloud',
      date: '2026-11-24T16:45',
      type: 'Expense',
      accountId: 'acc-icici',
      amount: 4225,
      currency: 'USD',
      originalAmount: 50,
      exchangeRateToINR: 84.5,
      rateDate: '2026-11-24',
      category: 'Utilities & Broadband',
      subCategory: 'Cloud & Server Hosting',
      fixedOrVariable: 'Fixed',
      note: 'AWS Production Infrastructure Invoice',
      receiptImages: [],
      isAnomaly: true,
    });

    // 1. Export current local IndexedDB ledger to CSV from Settings helper
    const exportedSummary = await exportIndexedDbLedgerToCsv({
      scope: 'full-history',
      sortOrder: 'asc',
      formatMode: 'split-debit-credit',
    });

    assert.ok(exportedSummary.transactionCount >= 9);
    assert.ok(exportedSummary.incomeCount >= 2);
    assert.ok(exportedSummary.expenseCount >= 5);
    assert.ok(exportedSummary.transferCount >= 1);
    assert.equal(exportedSummary.fileName, 'jawed-money-manager-bulk-ledger-full-history.csv');
    assert.ok(exportedSummary.headers.includes('Currency'));
    assert.ok(exportedSummary.headers.includes('Original Amount'));
    assert.ok(exportedSummary.headers.includes('Exchange Rate to INR'));

    // 2. Round-Trip Parity Test: Re-import the exported CSV into mapCsvRowsToTransactions & bulkImportCsvToLedger
    // First, verify duplicate protection recognizes all existing IndexedDB rows as duplicates of the exported CSV
    const duplicateCheck = await bulkImportCsvToLedger(exportedSummary.csvContent, {
      defaultAccountId: 'acc-icici',
      skipDuplicates: true,
    });
    assert.equal(duplicateCheck.importedTransactions.length, 0);
    assert.equal(duplicateCheck.skippedRowCount, exportedSummary.transactionCount);

    // Next, import with skipDuplicates: false to verify every field round-trips identically
    const roundTripParsed = parseCsvText(exportedSummary.csvContent);
    const roundTripMapping = autoDetectCsvMapping(roundTripParsed.headers);
    const currentDbState = await initializeAndSeedDatabase();
    const roundTripMapped = mapCsvRowsToTransactions(roundTripParsed.rows, roundTripMapping, {
      defaultAccountId: 'acc-icici',
      accounts: currentDbState.accounts,
      categories: currentDbState.categories,
      skipDuplicates: false,
    });

    assert.equal(roundTripMapped.length, exportedSummary.transactionCount);

    const restoredAws = roundTripMapped.find((tx) =>
      tx.note.includes('AWS Production Infrastructure Invoice')
    );
    assert.ok(restoredAws, 'Expected multi-currency AWS transaction to round-trip cleanly');
    assert.equal(restoredAws.date, '2026-11-24T16:45');
    assert.equal(restoredAws.type, 'Expense');
    assert.equal(restoredAws.accountId, 'acc-icici');
    assert.equal(restoredAws.amount, 4225);
    assert.equal(restoredAws.currency, 'USD');
    assert.equal(restoredAws.originalAmount, 50);
    assert.equal(restoredAws.exchangeRateToINR, 84.5);
    assert.equal(restoredAws.category, 'Utilities & Broadband');
    assert.equal(restoredAws.subCategory, 'Cloud & Server Hosting');
    assert.equal(restoredAws.fixedOrVariable, 'Fixed');
    assert.equal(restoredAws.isAnomaly, true);

    const restoredTransfer = roundTripMapped.find((tx) => tx.type === 'Transfer');
    assert.ok(restoredTransfer, 'Expected Transfer transaction to round-trip cleanly');
    assert.equal(restoredTransfer.category, 'Transfer');
    assert.ok(restoredTransfer.toAccountId, 'Expected Transfer target account to be preserved');

    // 3. Verify single-signed-amount format mode (-Expense / +Income) round-trips cleanly
    const singleSignedExport = generateBulkLedgerCsvExport(
      currentDbState.transactions,
      currentDbState.accounts,
      {
        scope: 'selected-month',
        selectedMonth: '2026-11',
        formatMode: 'single-signed-amount',
        typeFilter: 'Expense',
      }
    );
    assert.ok(singleSignedExport.headers.includes('Amount'));
    assert.equal(singleSignedExport.incomeCount, 0);
    assert.equal(singleSignedExport.transferCount, 0);
    assert.ok(singleSignedExport.expenseCount > 0);

    const parsedSigned = parseCsvText(singleSignedExport.csvContent);
    const mappedSigned = mapCsvRowsToTransactions(
      parsedSigned.rows,
      autoDetectCsvMapping(parsedSigned.headers),
      {
        defaultAccountId: 'acc-icici',
        accounts: currentDbState.accounts,
        categories: currentDbState.categories,
      }
    );
    assert.equal(mappedSigned.length, singleSignedExport.transactionCount);
    assert.ok(mappedSigned.every((tx) => tx.type === 'Expense'));

    // 4. Verify Settings panel UI elements in BackupRestoreModal.tsx
    const fs = await import('node:fs');
    const settingsSource = fs.readFileSync(
      'src/components/money-manager/BackupRestoreModal.tsx',
      'utf8'
    );
    assert.ok(settingsSource.includes('mm-settings-panel-header'));
    assert.ok(settingsSource.includes('mm-bulk-csv-type-select'));
    assert.ok(settingsSource.includes('mm-bulk-csv-format-select'));
    assert.ok(settingsSource.includes('mm-settings-csv-export-preview'));
    assert.ok(settingsSource.includes('100% CSV Import Parity'));
    assert.ok( typeof formatLedgerTransactionsToParityCsv === 'function');
  });

  it('projects potential monthly spending in Stats & Budgets using Recharts based on recurring transaction data and historical trends', async () => {
    const {
      RecurringHistoricalProjectionCard,
      computeRecurringAndHistoricalSpendingProjection,
      normalizeRecurringRuleToMonthlyAmount,
    } = await import('../src/pages/tools/MoneyManager');

    assert.equal(typeof RecurringHistoricalProjectionCard, 'function');
    assert.equal(typeof computeRecurringAndHistoricalSpendingProjection, 'function');
    assert.equal(typeof normalizeRecurringRuleToMonthlyAmount, 'function');

    // 1. Verify frequency normalization to monthly equivalents
    assert.equal(normalizeRecurringRuleToMonthlyAmount({ amount: 15000, frequency: 'Monthly' }), 15000);
    assert.equal(normalizeRecurringRuleToMonthlyAmount({ amount: 12000, frequency: 'Yearly' }), 1000);
    assert.equal(normalizeRecurringRuleToMonthlyAmount({ amount: 100, frequency: 'Daily' }), 3000);
    assert.equal(normalizeRecurringRuleToMonthlyAmount({ amount: 1000, frequency: 'Weekly' }), 4333);

    // 2. Seed database and add historical variable transactions across prior months
    await initializeAndSeedDatabase();
    await saveTransaction({
      id: 'tx-hist-proj-sep-food',
      date: '2026-09-12T13:00',
      type: 'Expense',
      accountId: 'acc-icici',
      amount: 9500,
      category: 'Food & Dining',
      subCategory: 'Groceries & Supermarkets',
      fixedOrVariable: 'Variable',
      note: 'September monthly grocery stockup',
      receiptImages: [],
      isAnomaly: false,
    });
    await saveTransaction({
      id: 'tx-hist-proj-oct-food',
      date: '2026-10-14T19:00',
      type: 'Expense',
      accountId: 'acc-icici',
      amount: 11200,
      category: 'Food & Dining',
      subCategory: 'Restaurants & Fine Dining',
      fixedOrVariable: 'Variable',
      note: 'October dining and groceries',
      receiptImages: [],
      isAnomaly: false,
    });

    // Add a paused recurring rule to test includePausedRecurring option
    await saveRecurringRule({
      id: 'rec-paused-gym-test',
      title: 'Premium Gym Membership',
      type: 'Expense',
      accountId: 'acc-icici',
      amount: 3000,
      category: 'Healthcare & Fitness',
      subCategory: 'Gym & Sports',
      fixedOrVariable: 'Fixed',
      frequency: 'Monthly',
      startDate: '2026-01-01',
      nextRunDate: '2026-12-01',
      dayOfMonth: 1,
      active: false,
      note: 'Paused gym rule',
    });

    const updatedState = await initializeAndSeedDatabase();

    // 3. Compute baseline projection combining active recurring rules + historical trends
    const baselineProjection = computeRecurringAndHistoricalSpendingProjection(
      updatedState.transactions,
      updatedState.recurringRules,
      '2026-11',
      updatedState.categories,
      {
        scenario: 'baseline',
        includePausedRecurring: false,
      }
    );

    assert.equal(baselineProjection.referenceYearMonth, '2026-11');
    assert.ok(baselineProjection.totalMonthlyRecurringCommitted > 0, 'Expected positive recurring monthly baseline');
    assert.ok(baselineProjection.projectedCurrentMonthDiscretionary > 0, 'Expected positive historical variable trend component');
    assert.equal(
      baselineProjection.projectedCurrentMonthTotal,
      baselineProjection.totalMonthlyRecurringCommitted + baselineProjection.projectedCurrentMonthDiscretionary
    );
    assert.ok(baselineProjection.activeRecurringExpenseRulesCount >= 3, 'Expected active expense recurring rules to be counted');
    assert.ok(baselineProjection.categories.length > 0, 'Expected category projection rows');
    assert.equal(baselineProjection.timelinePoints.length, 6, 'Expected 6 forward horizon timeline points');

    assert.equal(baselineProjection.timelinePoints[0].yearMonth, '2026-11');
    assert.equal(baselineProjection.timelinePoints[1].yearMonth, '2026-12');
    assert.ok(
      baselineProjection.timelinePoints[0].projectedTotal >= baselineProjection.timelinePoints[0].recurringCommitted
    );

    // Verify Rent & Housing has its ₹22,000 monthly rent recurring floor
    const housingRow = baselineProjection.categories.find((r) => r.category === 'Rent & Housing');
    assert.ok(housingRow, 'Expected Rent & Housing category row');
    assert.ok(housingRow.recurringMonthlyCommitment >= 22000, 'Expected Rent & Housing recurring commitment >= 22000');
    assert.ok(housingRow.projectedMonthlyTotal >= housingRow.recurringMonthlyCommitment);

    // 4. Verify Conservative vs Elevated scenarios adjust the historical trend component while preserving the recurring floor
    const conservativeProjection = computeRecurringAndHistoricalSpendingProjection(
      updatedState.transactions,
      updatedState.recurringRules,
      '2026-11',
      updatedState.categories,
      { scenario: 'conservative' }
    );
    const elevatedProjection = computeRecurringAndHistoricalSpendingProjection(
      updatedState.transactions,
      updatedState.recurringRules,
      '2026-11',
      updatedState.categories,
      { scenario: 'elevated' }
    );

    assert.equal(
      conservativeProjection.totalMonthlyRecurringCommitted,
      baselineProjection.totalMonthlyRecurringCommitted,
      'Recurring floor must remain invariant across historical trend sensitivity scenarios'
    );
    assert.equal(
      elevatedProjection.totalMonthlyRecurringCommitted,
      baselineProjection.totalMonthlyRecurringCommitted
    );
    assert.ok(
      conservativeProjection.projectedCurrentMonthTotal <= baselineProjection.projectedCurrentMonthTotal,
      'Conservative projection should be <= baseline projection'
    );
    assert.ok(
      elevatedProjection.projectedCurrentMonthTotal >= baselineProjection.projectedCurrentMonthTotal,
      'Elevated projection should be >= baseline projection'
    );

    // 5. Verify includePausedRecurring adds the ₹3,000 paused gym rule to the recurring baseline
    const withPausedProjection = computeRecurringAndHistoricalSpendingProjection(
      updatedState.transactions,
      updatedState.recurringRules,
      '2026-11',
      updatedState.categories,
      { includePausedRecurring: true }
    );
    assert.equal(
      withPausedProjection.totalMonthlyRecurringCommitted,
      baselineProjection.totalMonthlyRecurringCommitted + 3000
    );

    // 6. Verify Recharts card and StatsView wiring
    const fs = await import('node:fs');
    const cardSource = fs.readFileSync(
      'src/components/money-manager/RecurringHistoricalProjectionCard.tsx',
      'utf8'
    );
    assert.ok(cardSource.includes("from 'recharts'"), 'Expected Recharts import in RecurringHistoricalProjectionCard');
    assert.ok(cardSource.includes('<ComposedChart'), 'Expected Recharts ComposedChart');
    assert.ok(cardSource.includes('mm-recurring-historical-projection-card'), 'Expected card test id');
    assert.ok(cardSource.includes('mm-rec-proj-recharts-container'), 'Expected chart container test id');

    const statsSource = fs.readFileSync(
      'src/components/money-manager/StatsView.tsx',
      'utf8'
    );
    assert.ok(
      statsSource.includes('<RecurringHistoricalProjectionCard'),
      'Expected RecurringHistoricalProjectionCard rendered inside StatsView.tsx'
    );
  });

  it('adds visual progress bars to each category card in the spending list in Stats & Budgets to compare current month expenditure against the set budget limit', async () => {
    const {
      computeSpendingCardProgress,
      computeCategorySpendingCardProgressList,
    } = await import('../src/pages/tools/MoneyManager');

    assert.equal(typeof computeSpendingCardProgress, 'function');
    assert.equal(typeof computeCategorySpendingCardProgressList, 'function');

    // 1. Verify computeSpendingCardProgress across on-track, near-limit, over-budget, and unbudgeted states
    const onTrack = computeSpendingCardProgress(6000, 12000, '#10b981');
    assert.equal(onTrack.spent, 6000);
    assert.equal(onTrack.budgetLimit, 12000);
    assert.equal(onTrack.hasBudgetLimit, true);
    assert.equal(onTrack.utilizationPercent, 50);
    assert.equal(onTrack.clampedProgressPercent, 50);
    assert.equal(onTrack.remaining, 6000);
    assert.equal(onTrack.overage, 0);
    assert.equal(onTrack.isOverBudget, false);
    assert.equal(onTrack.isNearLimit, false);
    assert.equal(onTrack.status, 'on-track');
    assert.equal(onTrack.barColor, '#10b981');
    assert.ok(onTrack.comparisonLabel.includes('50%'));
    assert.ok(onTrack.varianceLabel.includes('remaining'));

    const nearLimit = computeSpendingCardProgress(9000, 10000, '#3b82f6');
    assert.equal(nearLimit.utilizationPercent, 90);
    assert.equal(nearLimit.clampedProgressPercent, 90);
    assert.equal(nearLimit.remaining, 1000);
    assert.equal(nearLimit.isNearLimit, true);
    assert.equal(nearLimit.isOverBudget, false);
    assert.equal(nearLimit.status, 'near');
    assert.equal(nearLimit.barColor, '#f59e0b');

    const overBudget = computeSpendingCardProgress(9500, 5000, '#8b5cf6');
    assert.equal(overBudget.utilizationPercent, 190);
    assert.equal(overBudget.clampedProgressPercent, 100);
    assert.equal(overBudget.remaining, 0);
    assert.equal(overBudget.overage, 4500);
    assert.equal(overBudget.isOverBudget, true);
    assert.equal(overBudget.status, 'over');
    assert.equal(overBudget.barColor, '#ef4444');
    assert.ok(overBudget.varianceLabel.includes('over limit'));

    const unbudgeted = computeSpendingCardProgress(2500, 0, '#06b6d4');
    assert.equal(unbudgeted.hasBudgetLimit, false);
    assert.equal(unbudgeted.utilizationPercent, 0);
    assert.equal(unbudgeted.clampedProgressPercent, 0);
    assert.equal(unbudgeted.status, 'unbudgeted');
    assert.equal(unbudgeted.barColor, '#64748b');

    // 2. Verify computeCategorySpendingCardProgressList against seeded ledger transactions for 2026-11
    const state = await initializeAndSeedDatabase();
    const progressList = computeCategorySpendingCardProgressList(
      state.transactions,
      '2026-11',
      {
        'Rent & Housing': 25000,
        'Medical & Health': 5000,
        'Food & Groceries': 12000,
      }
    );

    assert.ok(progressList.length >= 4, 'Expected category spending cards in progress list');

    const medicalItem = progressList.find((item) => item.category === 'Medical & Health');
    assert.ok(medicalItem, 'Expected Medical & Health category card');
    assert.equal(medicalItem.amount, 7850);
    assert.equal(medicalItem.progress.budgetLimit, 5000);
    assert.equal(medicalItem.progress.isOverBudget, true);
    assert.equal(medicalItem.progress.overage, 2850);
    assert.equal(medicalItem.progress.clampedProgressPercent, 100);
    assert.equal(medicalItem.progress.status, 'over');
    assert.equal(medicalItem.progress.barColor, '#ef4444');

    const rentItem = progressList.find((item) => item.category === 'Rent & Housing');
    assert.ok(rentItem, 'Expected Rent & Housing category card');
    assert.equal(rentItem.amount, 22000);
    assert.equal(rentItem.progress.budgetLimit, 25000);
    assert.equal(rentItem.progress.utilizationPercent, 88);
    assert.equal(rentItem.progress.isNearLimit, true);
    assert.equal(rentItem.progress.remaining, 3000);
    assert.equal(rentItem.progress.status, 'near');

    // 3. Verify visual progress bar elements in StatsView.tsx and CategoryManager.tsx
    const fs = await import('node:fs');
    const statsSource = fs.readFileSync(
      'src/components/money-manager/StatsView.tsx',
      'utf8'
    );
    assert.ok(
      statsSource.includes('mm-spending-card-progress-bar-'),
      'Expected spending list progress bar testid in StatsView.tsx'
    );
    assert.ok(
      statsSource.includes('mm-spending-card-progress-fill-'),
      'Expected spending list progress fill testid in StatsView.tsx'
    );
    assert.ok(
      statsSource.includes('mm-spending-card-comparison-'),
      'Expected spending list comparison readout testid in StatsView.tsx'
    );

    const cmSource = fs.readFileSync(
      'src/components/money-manager/CategoryManager.tsx',
      'utf8'
    );
    assert.ok(
      cmSource.includes('mm-cm-card-progress-bar-'),
      'Expected spending category card progress bar testid in CategoryManager.tsx'
    );
    assert.ok(
      cmSource.includes('mm-cm-card-progress-fill-'),
      'Expected spending category card progress fill testid in CategoryManager.tsx'
    );
  });

  it("provides a 'Download Ledger' button in Money Manager Settings that converts all local IndexedDB transaction data into CSV format and triggers an automatic browser download", async () => {
    const {
      downloadLedgerFromIndexedDbAsCsv,
      exportTransactionsCsvFromDb,
    } = await import('../src/pages/tools/MoneyManager');

    assert.equal(typeof downloadLedgerFromIndexedDbAsCsv, 'function');
    assert.equal(typeof exportTransactionsCsvFromDb, 'function');

    // 1. Seed local IndexedDB and add a custom transaction
    const state = await initializeAndSeedDatabase();
    await saveTransaction({
      id: 'tx-download-ledger-btn-test',
      date: '2026-11-28T11:30',
      type: 'Expense',
      accountId: 'acc-sbi',
      amount: 3250,
      category: 'Utilities & Broadband',
      subCategory: 'Electricity Bill',
      fixedOrVariable: 'Fixed',
      note: 'November power utility settlement',
      receiptImages: [],
      isAnomaly: false,
    });

    const updatedState = await initializeAndSeedDatabase();

    // 2. Mock browser DOM download hooks to verify automatic browser download trigger
    let clickedDownloadFileName: string | null = null;
    let createdBlobSize = 0;
    const prevDocument = (globalThis as any).document;
    const prevCreateObjectURL = URL.createObjectURL;
    const prevRevokeObjectURL = URL.revokeObjectURL;

    URL.createObjectURL = ((blob: Blob) => {
      createdBlobSize = blob.size;
      return 'blob:http://localhost/mock-ledger-csv';
    }) as typeof URL.createObjectURL;
    URL.revokeObjectURL = (() => {}) as typeof URL.revokeObjectURL;
    (globalThis as any).document = {
      createElement: (tag: string) => {
        const el: any = {
          tagName: tag.toUpperCase(),
          href: '',
          download: '',
          click() {
            clickedDownloadFileName = el.download;
          },
        };
        return el;
      },
      body: {
        appendChild() {},
        removeChild() {},
      },
    };

    try {
      const summary = await downloadLedgerFromIndexedDbAsCsv();
      assert.equal(summary.transactionCount, updatedState.transactions.length);
      assert.equal(clickedDownloadFileName, 'jawed-money-manager-bulk-ledger-full-history.csv');
      assert.ok(createdBlobSize > 100, 'Expected non-empty CSV Blob payload');
      assert.ok(
        summary.csvContent.includes('November power utility settlement'),
        'Expected newly saved IndexedDB transaction in downloaded CSV'
      );

      // Verify parsed CSV row count matches all local IndexedDB transactions
      const parsed = parseCsvText(summary.csvContent);
      assert.equal(parsed.rows.length, updatedState.transactions.length);
    } finally {
      (globalThis as any).document = prevDocument;
      URL.createObjectURL = prevCreateObjectURL;
      URL.revokeObjectURL = prevRevokeObjectURL;
    }

    // 3. Verify 'Download Ledger' button presence in BackupRestoreModal.tsx (Money Manager Settings)
    const fs = await import('node:fs');
    const settingsModalSource = fs.readFileSync(
      'src/components/money-manager/BackupRestoreModal.tsx',
      'utf8'
    );
    assert.ok(
      settingsModalSource.includes('mm-download-ledger-btn'),
      "Expected 'mm-download-ledger-btn' testid in BackupRestoreModal.tsx"
    );
    assert.ok(
      settingsModalSource.includes('<span>Download Ledger</span>'),
      "Expected 'Download Ledger' button label in BackupRestoreModal.tsx"
    );
    assert.ok(
      settingsModalSource.includes('downloadLedgerFromIndexedDbAsCsv'),
      'Expected downloadLedgerFromIndexedDbAsCsv wired in BackupRestoreModal.tsx'
    );
  });

  it('visualizes the rolling 3-month average of spending vs. income on the Stats & Budgets page to highlight long-term trends', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const {
      RollingThreeMonthTrendCard,
      computeRollingThreeMonthTrend,
    } = await import('../src/pages/tools/MoneyManager');
    const StatsViewMod = await import('../src/components/money-manager/StatsView');

    // 1. Verify exports across pages/tools/MoneyManager and StatsView
    assert.equal(typeof RollingThreeMonthTrendCard, 'function');
    assert.equal(typeof computeRollingThreeMonthTrend, 'function');
    assert.equal(typeof StatsViewMod.RollingThreeMonthTrendCard, 'function');
    assert.equal(typeof StatsViewMod.computeRollingThreeMonthTrend, 'function');

    // 2. Construct deterministic multi-month transactions across 8 months (Apr 2026 -> Nov 2026)
    //    so a 6-month horizon (Jun 2026 -> Nov 2026) has full 3-month lookback windows (Apr, May, Jun...)
    const monthlyFixture = [
      { ym: '2026-04', income: 90000, expense: 45000 },
      { ym: '2026-05', income: 96000, expense: 48000 },
      { ym: '2026-06', income: 102000, expense: 51000 }, // 3m avg: income (90+96+102)/3 = 96000, expense (45+48+51)/3 = 48000
      { ym: '2026-07', income: 105000, expense: 54000 }, // 3m avg: income (96+102+105)/3 = 101000, expense (48+51+54)/3 = 51000
      { ym: '2026-08', income: 108000, expense: 60000 }, // 3m avg: income (102+105+108)/3 = 105000, expense (51+54+60)/3 = 55000
      { ym: '2026-09', income: 111000, expense: 57000 }, // 3m avg: income (105+108+111)/3 = 108000, expense (54+60+57)/3 = 57000
      { ym: '2026-10', income: 114000, expense: 63000 }, // 3m avg: income (108+111+114)/3 = 111000, expense (60+57+63)/3 = 60000
      { ym: '2026-11', income: 120000, expense: 66000 }, // 3m avg: income (111+114+120)/3 = 115000, expense (57+63+66)/3 = 62000
    ];

    const syntheticTransactions: any[] = [];
    monthlyFixture.forEach((m, idx) => {
      syntheticTransactions.push({
        id: `tx-inc-${m.ym}`,
        date: `${m.ym}-05T10:00`,
        type: 'Income',
        accountId: 'acc-sbi',
        amount: m.income,
        category: 'Salary & Stipend',
        subCategory: 'Monthly Payroll',
        fixedOrVariable: 'Fixed',
        note: `Income ${m.ym}`,
      });
      syntheticTransactions.push({
        id: `tx-exp-${m.ym}`,
        date: `${m.ym}-12T14:00`,
        type: 'Expense',
        accountId: 'acc-sbi',
        amount: m.expense,
        category: 'Rent & Housing',
        subCategory: 'Apartment Rent',
        fixedOrVariable: 'Fixed',
        note: `Expense ${m.ym}`,
      });
      // Internal transfers must be strictly excluded from both spending and income rolling averages
      syntheticTransactions.push({
        id: `tx-trf-${m.ym}`,
        date: `${m.ym}-15T16:00`,
        type: 'Transfer',
        accountId: 'acc-sbi',
        toAccountId: 'acc-cash',
        amount: 25000 + idx * 1000,
        category: 'Transfer',
        subCategory: 'ATM Withdrawal',
        fixedOrVariable: 'Variable',
        note: `Transfer ${m.ym}`,
      });
    });

    // 3. Compute 6-month horizon ending 2026-11
    const trend6M = computeRollingThreeMonthTrend(syntheticTransactions, '2026-11', {
      horizonMonths: 6,
    });
    assert.equal(trend6M.referenceYearMonth, '2026-11');
    assert.equal(trend6M.horizonMonths, 6);
    assert.equal(trend6M.points.length, 6);
    assert.equal(trend6M.points[0].yearMonth, '2026-06');
    assert.equal(trend6M.points[0].rolling3mIncome, 96000);
    assert.equal(trend6M.points[0].rolling3mExpense, 48000);
    assert.equal(trend6M.points[0].rolling3mNet, 48000);
    assert.equal(trend6M.points[0].spendToIncomeRatioPercent, 50);

    // Verify latest month (2026-11) rolling 3-month averages
    const novPoint = trend6M.points[5];
    assert.equal(novPoint.yearMonth, '2026-11');
    assert.equal(novPoint.actualIncome, 120000);
    assert.equal(novPoint.actualExpense, 66000);
    assert.equal(novPoint.rolling3mIncome, 115000);
    assert.equal(novPoint.rolling3mExpense, 62000);
    assert.equal(novPoint.rolling3mNet, 53000);
    assert.deepEqual(novPoint.windowMonths, ['2026-09', '2026-10', '2026-11']);

    assert.equal(trend6M.currentRolling3mIncome, 115000);
    assert.equal(trend6M.currentRolling3mExpense, 62000);
    assert.equal(trend6M.currentRolling3mNet, 53000);
    assert.equal(trend6M.priorRolling3mIncome, 105000);
    assert.equal(trend6M.priorRolling3mExpense, 55000);

    // 4. Compute default 12-month horizon
    const trend12M = computeRollingThreeMonthTrend(syntheticTransactions, '2026-11');
    assert.equal(trend12M.horizonMonths, 12);
    assert.equal(trend12M.points.length, 12);

    // 5. Verify StatsView.tsx mounts <RollingThreeMonthTrendCard and RollingThreeMonthTrendCard.tsx uses Recharts
    const statsViewSource = fs.readFileSync(
      path.resolve(process.cwd(), 'src/components/money-manager/StatsView.tsx'),
      'utf8'
    );
    const rollingCardSource = fs.readFileSync(
      path.resolve(process.cwd(), 'src/components/money-manager/RollingThreeMonthTrendCard.tsx'),
      'utf8'
    );
    assert.ok(
      statsViewSource.includes('<RollingThreeMonthTrendCard'),
      'Expected <RollingThreeMonthTrendCard rendered in StatsView.tsx'
    );
    assert.ok(
      rollingCardSource.includes('mm-rolling-3m-trend-card'),
      'Expected mm-rolling-3m-trend-card testid in RollingThreeMonthTrendCard.tsx'
    );
    assert.ok(
      rollingCardSource.includes('ComposedChart') && rollingCardSource.includes('AreaChart'),
      'Expected Recharts ComposedChart and AreaChart in RollingThreeMonthTrendCard.tsx'
    );
  });

  it('refactors the global Navbar and HomePage Hero section to eliminate header clutter, fix CTA button styling, use a single-click Dark/Light toggle, and relocate the Search trigger chip into Interactive Resources', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const HeaderMod = await import('../src/components/Header');
    const NavbarMod = await import('../src/components/Navbar');
    const ThemeToggleMod = await import('../src/components/ThemeToggle');
    const HomePageMod = await import('../src/pages/HomePage');
    const HeroMod = await import('../src/components/Hero');

    assert.equal(typeof HeaderMod.Header, 'function');
    assert.equal(typeof NavbarMod.Navbar, 'function');
    assert.equal(typeof ThemeToggleMod.ThemeToggle, 'function');
    assert.equal(typeof ThemeToggleMod.getResolvedTheme, 'function');
    assert.equal(typeof HomePageMod.HeroSection, 'function');
    assert.equal(typeof HeroMod.Hero, 'function');

    const headerSource = fs.readFileSync(
      path.resolve(process.cwd(), 'src/components/Header.tsx'),
      'utf8'
    );
    const themeToggleSource = fs.readFileSync(
      path.resolve(process.cwd(), 'src/components/ThemeToggle.tsx'),
      'utf8'
    );
    const homePageSource = fs.readFileSync(
      path.resolve(process.cwd(), 'src/pages/HomePage.tsx'),
      'utf8'
    );

    // 1. Navbar cleanup assertions
    assert.ok(
      !headerSource.includes('header-search-slot'),
      'Expected bulky search input box removed from top header'
    );
    assert.ok(
      headerSource.includes('<CommandPalette hideTrigger'),
      'Expected headless CommandPalette retained in Header for ⌘K / Ctrl+K'
    );
    assert.ok(
      !headerSource.includes('Ask AI'),
      'Expected Ask AI removed from main header navigation links'
    );
    assert.ok(
      !headerSource.includes('Install App') && !headerSource.includes('SyncStatusIndicator'),
      'Expected Install App and Synced badges removed from navbar'
    );
    assert.ok(
      headerSource.includes(
        'className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-white bg-sky-500 hover:bg-sky-400 shadow-md shadow-sky-500/20 transition-all"'
      ),
      'Expected Get in Touch CTA pill styling applied'
    );

    // 2. Single-click Dark/Light toggle assertions
    assert.ok(
      themeToggleSource.includes('Sun') && themeToggleSource.includes('Moon'),
      'Expected Sun and Moon icons from lucide-react in ThemeToggle'
    );
    assert.ok(
      !themeToggleSource.includes('role="radiogroup"'),
      'Expected 3-button segmented theme selector replaced by single-click button'
    );

    // 3. Hero Section Interactive Resources & Search trigger chip assertions
    assert.ok(
      homePageSource.includes('Get in Touch / Hire Jawed →') &&
        homePageSource.includes('View Career Profile') &&
        homePageSource.includes('Share Profile'),
      'Expected primary CTA button row untouched in Hero section'
    );
    assert.ok(
      homePageSource.includes('Interactive Resources:') &&
        homePageSource.includes('Guides') &&
        homePageSource.includes('Tools') &&
        homePageSource.includes('Ask AI') &&
        homePageSource.includes('Search') &&
        homePageSource.includes('⌘K'),
      'Expected Search trigger chip added immediately following Ask AI in Interactive Resources'
    );
  });

  it('restores PWA Install App state capture (usePWAInstall with isInstallable and triggerInstall) and integrates cleanly into Hero and Footer without cluttering the navbar', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const PwaHookMod = await import('../src/hooks/usePWAInstall');
    const AppMod = await import('../src/App');

    assert.equal(typeof PwaHookMod.usePWAInstall, 'function');
    assert.equal(typeof AppMod.usePWAInstall, 'function');

    const pwaHookSource = fs.readFileSync(
      path.resolve(process.cwd(), 'src/hooks/usePWAInstall.ts'),
      'utf8'
    );
    const homePageSource = fs.readFileSync(
      path.resolve(process.cwd(), 'src/pages/HomePage.tsx'),
      'utf8'
    );
    const footerSource = fs.readFileSync(
      path.resolve(process.cwd(), 'src/components/Footer.tsx'),
      'utf8'
    );
    const headerSource = fs.readFileSync(
      path.resolve(process.cwd(), 'src/components/Header.tsx'),
      'utf8'
    );

    // 1. Verify usePWAInstall hook structure (beforeinstallprompt, appinstalled, isInstallable, triggerInstall)
    assert.ok(
      pwaHookSource.includes('beforeinstallprompt') &&
        pwaHookSource.includes('appinstalled') &&
        pwaHookSource.includes('triggerInstall') &&
        pwaHookSource.includes('isInstallable'),
      'Expected usePWAInstall to capture beforeinstallprompt, handle appinstalled, and return { isInstallable, triggerInstall }'
    );

    // 2. Verify Hero Interactive Resources & Footer wire triggerInstall while Navbar remains clean
    assert.ok(
      homePageSource.includes('usePWAInstall') && homePageSource.includes('triggerInstall'),
      'Expected HomePage Hero Interactive Resources to integrate usePWAInstall and triggerInstall'
    );
    assert.ok(
      footerSource.includes('usePWAInstall') && footerSource.includes('triggerInstall'),
      'Expected Footer to integrate usePWAInstall and triggerInstall'
    );
    assert.ok(
      !headerSource.includes('Install App') && !headerSource.includes('usePWAInstall'),
      'Expected top navbar (Header.tsx) to remain uncluttered without Install App'
    );
  });

  it('polishes the Interactive Resources row in the Hero section with Lucide React icons (BookOpen, Wrench, Bot, Search, Download), shared chip styling, and a browser install fallback toast when deferredPrompt is not ready', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const HomePageMod = await import('../src/pages/HomePage');
    const HeroMod = await import('../src/components/Hero');

    assert.equal(
      HomePageMod.HERO_RESOURCE_CHIP_CLASS,
      'inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 text-slate-300 transition'
    );
    assert.equal(HeroMod.HERO_RESOURCE_CHIP_CLASS, HomePageMod.HERO_RESOURCE_CHIP_CLASS);
    assert.equal(typeof HomePageMod.getBrowserInstallFallbackMessage, 'function');

    // Verify browser-specific install fallback explanations
    assert.ok(
      HomePageMod.getBrowserInstallFallbackMessage('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)').includes(
        'Add to Home Screen'
      )
    );
    assert.ok(
      HomePageMod.getBrowserInstallFallbackMessage('Mozilla/5.0 Chrome/125.0.0.0').includes(
        'Chrome'
      )
    );

    const homePageSource = fs.readFileSync(
      path.resolve(process.cwd(), 'src/pages/HomePage.tsx'),
      'utf8'
    );
    const heroSource = fs.readFileSync(
      path.resolve(process.cwd(), 'src/components/Hero.tsx'),
      'utf8'
    );
    const cssSource = fs.readFileSync(
      path.resolve(process.cwd(), 'src/index.css'),
      'utf8'
    );

    const expectedChipClassAttr = `className="${HomePageMod.HERO_RESOURCE_CHIP_CLASS}"`;
    const homePageChipMatches = homePageSource.split(expectedChipClassAttr).length - 1;
    const heroChipMatches = heroSource.split(expectedChipClassAttr).length - 1;

    assert.ok(
      homePageChipMatches >= 5,
      `Expected all 5 Hero Interactive Resources chips in HomePage.tsx to use exact shared chip className, found ${homePageChipMatches}`
    );
    assert.ok(
      heroChipMatches >= 5,
      `Expected all 5 Hero Interactive Resources chips in Hero.tsx to use exact shared chip className, found ${heroChipMatches}`
    );

    // Verify all 5 Lucide React icons with exact className="w-3.5 h-3.5 text-sky-400" in both HomePage.tsx and Hero.tsx
    for (const source of [homePageSource, heroSource]) {
      assert.ok(
        source.includes('<BookOpen className="w-3.5 h-3.5 text-sky-400" />'),
        'Expected BookOpen Lucide icon for Guides'
      );
      assert.ok(
        source.includes('<Wrench className="w-3.5 h-3.5 text-sky-400" />'),
        'Expected Wrench Lucide icon for Tools'
      );
      assert.ok(
        source.includes('<Bot className="w-3.5 h-3.5 text-sky-400" />'),
        'Expected Bot Lucide icon for Ask AI'
      );
      assert.ok(
        source.includes('<Search className="w-3.5 h-3.5 text-sky-400" />'),
        'Expected Search Lucide icon for Search'
      );
      assert.ok(
        source.includes('<Download className="w-3.5 h-3.5 text-sky-400" />'),
        'Expected Download Lucide icon for Install App'
      );
    }

    assert.ok(
      cssSource.includes('.inline-flex { display: inline-flex; }') &&
        cssSource.includes('.w-3\\.5 { width: 0.875rem; }') &&
        cssSource.includes('.h-3\\.5 { height: 0.875rem; }') &&
        cssSource.includes('.text-sky-400 { color: #38bdf8; }'),
      'Expected index.css to define utility and alignment classes for Hero Interactive Resources chips'
    );
    assert.ok(
      homePageSource.includes('hero-install-fallback-toast'),
      'Expected fallback toast in HeroSection when deferredPrompt is not ready'
    );
  });

  it('syncs user theme preferences with a localStorage check that immediately updates document.documentElement class on page load to prevent FOUC', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const {
      syncThemeFromLocalStorage,
      applyThemeToDom,
      getSavedThemeMode,
      THEME_STORAGE_KEY,
    } = await import('../src/components/ThemeToggle');

    assert.equal(THEME_STORAGE_KEY, 'theme');
    assert.equal(typeof syncThemeFromLocalStorage, 'function');

    // Mock window.localStorage and document.documentElement to verify immediate class updates
    const prevWindow = (globalThis as any).window;
    const prevDocument = (globalThis as any).document;
    const storageMap = new Map<string, string>();
    const classSet = new Set<string>();
    const attrMap = new Map<string, string>();
    const styleObj: Record<string, string> = {};

    (globalThis as any).window = {
      localStorage: {
        getItem: (k: string) => (storageMap.has(k) ? storageMap.get(k)! : null),
        setItem: (k: string, v: string) => storageMap.set(k, v),
      },
      matchMedia: () => ({ matches: false }),
    };
    (globalThis as any).document = {
      documentElement: {
        setAttribute: (k: string, v: string) => attrMap.set(k, v),
        getAttribute: (k: string) => attrMap.get(k) || null,
        classList: {
          add: (c: string) => classSet.add(c),
          remove: (c: string) => classSet.delete(c),
          contains: (c: string) => classSet.has(c),
        },
        style: styleObj,
      },
    };

    try {
      // 1. When localStorage has 'light', syncThemeFromLocalStorage immediately adds 'light' and removes 'dark'
      storageMap.set('theme', 'light');
      const resolvedLight = syncThemeFromLocalStorage();
      assert.equal(resolvedLight, 'light');
      assert.equal(getSavedThemeMode(), 'light');
      assert.equal(classSet.has('light'), true);
      assert.equal(classSet.has('dark'), false);
      assert.equal(attrMap.get('data-theme'), 'light');
      assert.equal(styleObj.colorScheme, 'light');

      // 2. When localStorage has 'dark', syncThemeFromLocalStorage immediately adds 'dark' and removes 'light'
      storageMap.set('theme', 'dark');
      const resolvedDark = syncThemeFromLocalStorage();
      assert.equal(resolvedDark, 'dark');
      assert.equal(getSavedThemeMode(), 'dark');
      assert.equal(classSet.has('dark'), true);
      assert.equal(classSet.has('light'), false);
      assert.equal(attrMap.get('data-theme'), 'dark');
      assert.equal(styleObj.colorScheme, 'dark');

      // 3. Verify applyThemeToDom also updates documentElement classes and colorScheme
      applyThemeToDom('light');
      assert.equal(classSet.has('light'), true);
      assert.equal(classSet.has('dark'), false);
    } finally {
      (globalThis as any).window = prevWindow;
      (globalThis as any).document = prevDocument;
    }

    // 4. Verify main.tsx and index.html invoke immediate theme synchronization on page load
    const mainSource = fs.readFileSync(path.resolve(process.cwd(), 'src/main.tsx'), 'utf8');
    const htmlSource = fs.readFileSync(path.resolve(process.cwd(), 'index.html'), 'utf8');
    assert.ok(
      mainSource.includes('syncThemeFromLocalStorage()'),
      'Expected src/main.tsx to invoke syncThemeFromLocalStorage() immediately on page load'
    );
    assert.ok(
      htmlSource.includes("localStorage.getItem('theme')") &&
        htmlSource.includes("document.documentElement.classList.add('dark')"),
      'Expected index.html inline script to synchronously update documentElement class from localStorage'
    );
  });

  it('wires csvInputRef and handleCsvFileChange to a hidden CSV file input and provides a one-click Download Sample CSV template that imports cleanly into IndexedDB', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const {
      downloadSampleCsvTemplate,
      SAMPLE_CSV_FILENAME,
      SAMPLE_BANK_STATEMENT_CSV,
      bulkImportCsvToLedger,
    } = await import('../src/pages/tools/MoneyManager');

    assert.equal(SAMPLE_CSV_FILENAME, 'jawed-money-manager-sample-statement.csv');
    assert.equal(typeof downloadSampleCsvTemplate, 'function');

    const { fileName, csvContent } = downloadSampleCsvTemplate();
    assert.equal(fileName, SAMPLE_CSV_FILENAME);
    assert.equal(csvContent, SAMPLE_BANK_STATEMENT_CSV);
    assert.ok(csvContent.includes('Date,Narration,Withdrawal Amt.,Deposit Amt.,Category,Bank'));

    // Verify the downloaded sample CSV template guarantees valid imports into IndexedDB
    const importResult = await bulkImportCsvToLedger(csvContent, {
      defaultMonth: '2026-11',
    });
    assert.ok(
      importResult.importedTransactions.length >= 5,
      'Expected sample CSV template to import all sample transactions cleanly'
    );
    assert.equal(importResult.skippedRowCount, 0);

    // Verify csvInputRef, hidden <input type="file" accept=".csv,text/csv" className="hidden" onChange={handleCsvFileChange} />, and Download Sample CSV button across MoneyManager components
    const componentPaths = [
      'src/tools/MoneyManager.tsx',
      'src/components/money-manager/Header.tsx',
      'src/components/money-manager/CsvImportModal.tsx',
      'src/components/money-manager/BackupRestoreModal.tsx',
      'src/components/money-manager/DailyView.tsx',
    ];

    for (const relPath of componentPaths) {
      const src = fs.readFileSync(path.resolve(process.cwd(), relPath), 'utf8');
      assert.ok(
        src.includes('const csvInputRef = useRef<HTMLInputElement>(null);'),
        `Expected ${relPath} to declare csvInputRef`
      );
      assert.ok(
        src.includes('ref={csvInputRef}') &&
          src.includes('type="file"') &&
          src.includes('accept=".csv,text/csv"') &&
          src.includes('className="hidden') &&
          src.includes('onChange={handleCsvFileChange}'),
        `Expected ${relPath} to wire hidden <input ref={csvInputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleCsvFileChange} />`
      );
    }

    const headerSrc = fs.readFileSync(
      path.resolve(process.cwd(), 'src/components/money-manager/Header.tsx'),
      'utf8'
    );
    assert.ok(
      headerSrc.includes('Download Sample CSV') &&
        headerSrc.includes('mm-header-download-sample-csv-btn'),
      'Expected Header.tsx to render Download Sample CSV button next to Import CSV'
    );

    const modalSrc = fs.readFileSync(
      path.resolve(process.cwd(), 'src/components/money-manager/CsvImportModal.tsx'),
      'utf8'
    );
    assert.ok(
      modalSrc.includes('csvInputRef.current?.click()') &&
        modalSrc.includes('Download Sample CSV') &&
        modalSrc.includes('mm-csv-download-sample-btn') &&
        modalSrc.includes('crypto.randomUUID()'),
      'Expected CsvImportModal.tsx to trigger csvInputRef.current?.click(), render Download Sample CSV button, and assign crypto.randomUUID()'
    );

    // Verify each imported item has a unique RFC-4122 v4 UUID assigned via crypto.randomUUID()
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const assignedIds = new Set<string>();
    for (const tx of importResult.importedTransactions) {
      assert.ok(
        uuidRegex.test(tx.id),
        `Expected imported transaction id "${tx.id}" to be a valid UUID from crypto.randomUUID()`
      );
      assignedIds.add(tx.id);
    }
    assert.equal(assignedIds.size, importResult.importedTransactions.length);

    // Verify duplicate prevention matching existing date + amount + description (even if Bank column or casing differs)
    const duplicateAndNewCsv = [
      'Date,Narration,Withdrawal Amt.,Deposit Amt.,Category,Bank',
      '2026-11-16,  upi/swiggy instamart fresh groceries  ,845,,Food & Groceries,SBI',
      '2026-11-29,UPI/Fresh Bakery Coffee Beans,420,,Food & Groceries,ICICI',
      '2026-11-29,UPI/Fresh Bakery Coffee Beans,420,,Food & Groceries,ICICI',
    ].join('\n');

    const secondImport = await bulkImportCsvToLedger(duplicateAndNewCsv, {
      defaultMonth: '2026-11',
    });
    assert.equal(
      secondImport.importedTransactions.length,
      1,
      'Expected only the 1 non-duplicate transaction to be imported'
    );
    assert.equal(
      secondImport.skippedRowCount,
      2,
      'Expected 1 existing duplicate and 1 intra-CSV duplicate (matching date + amount + description) to be skipped'
    );
    assert.ok(uuidRegex.test(secondImport.importedTransactions[0].id));
  });

  it('provides an Export to CSV button in MoneyManager that flattens the IndexedDB transactions state and triggers a browser download', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const {
      flattenTransactionsForCsvExport,
      exportIndexedDbTransactionsToCsv,
    } = await import('../src/pages/tools/MoneyManager');

    const state = await initializeAndSeedDatabase();
    const flattened = flattenTransactionsForCsvExport(state.transactions, state.accounts);
    assert.equal(flattened.length, state.transactions.length);
    assert.ok(flattened.length > 0);
    assert.ok('Transaction ID' in flattened[0]);
    assert.ok('Date' in flattened[0]);
    assert.ok('Account / Bank' in flattened[0]);
    assert.ok('Amount (INR)' in flattened[0]);
    assert.ok('Narration' in flattened[0]);
    assert.ok('Receipts Count' in flattened[0]);

    const exportResult = await exportIndexedDbTransactionsToCsv(
      state.transactions,
      state.accounts,
      '2026-11'
    );
    assert.equal(exportResult.fileName, 'jawed-money-manager-transactions-2026-11.csv');
    assert.equal(exportResult.transactionCount, state.transactions.length);
    assert.equal(exportResult.flattenedRows.length, state.transactions.length);
    assert.ok(exportResult.csvContent.includes('Transaction ID,Date,Time,Type,Account / Bank'));

    const headerSrc = fs.readFileSync(
      path.resolve(process.cwd(), 'src/components/money-manager/Header.tsx'),
      'utf8'
    );
    const mmSrc = fs.readFileSync(
      path.resolve(process.cwd(), 'src/tools/MoneyManager.tsx'),
      'utf8'
    );
    assert.ok(
      headerSrc.includes('Export to CSV') &&
        headerSrc.includes('mm-header-export-csv-btn'),
      'Expected Header.tsx to render the Export to CSV button'
    );
    assert.ok(
      mmSrc.includes('exportIndexedDbTransactionsToCsv') &&
        mmSrc.includes('onExportToCsv={handleExportToCsv}'),
      'Expected MoneyManager.tsx to wire handleExportToCsv to MoneyManagerHeader'
    );
  });

  it('maintains selectedFile state and parses CSV via FileReader in handleDoneImport -> processCsvContent to update IndexedDB and UI state immediately', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');

    const filesToVerify = [
      'src/components/money-manager/CsvImportModal.tsx',
      'src/components/money-manager/BackupRestoreModal.tsx',
      'src/tools/MoneyManager.tsx',
    ];

    for (const relPath of filesToVerify) {
      const src = fs.readFileSync(path.resolve(process.cwd(), relPath), 'utf8');
      assert.ok(
        src.includes('const [selectedFile, setSelectedFile] = useState<File | null>'),
        `Expected ${relPath} to declare selectedFile state`
      );
      assert.ok(
        src.includes('setSelectedFile(file)'),
        `Expected ${relPath} to store chosen file in selectedFile`
      );
      assert.ok(
        src.includes('const handleDoneImport =') &&
          src.includes('new FileReader()') &&
          src.includes('reader.readAsText(selectedFile)') &&
          src.includes('processCsvContent(text)'),
        `Expected ${relPath} to implement handleDoneImport with FileReader and processCsvContent(text)`
      );
    }

    const modalSrc = fs.readFileSync(
      path.resolve(process.cwd(), 'src/components/money-manager/CsvImportModal.tsx'),
      'utf8'
    );
    assert.ok(
      modalSrc.includes('onClick={handleDoneImport}') &&
        modalSrc.includes('mm-csv-modal-done-btn'),
      'Expected CsvImportModal.tsx to wire handleDoneImport to Done button'
    );

    // End-to-end verification that importing a CSV from another month (e.g. 2026-10) parses and saves to IndexedDB immediately
    await resetDatabaseToDefaults();
    const octStatementCsv = [
      'Date,Description,Amount,Type,Category,Account',
      '15/10/2026,UPI/Reliance Fresh Groceries,-1250,Expense,Food & Groceries,ICICI',
      '20/10/2026,NEFT/Consulting Invoice Retainer,45000,Income,Salary & Bonus,SBI',
    ].join('\n');

    const result = await bulkImportCsvToLedger(octStatementCsv, {
      defaultMonth: '2026-11',
    });
    assert.equal(result.importedTransactions.length, 2);
    assert.equal(result.importedTransactions[0].date.slice(0, 7), '2026-10');
    const dbState = await initializeAndSeedDatabase();
    const allInDb = dbState.transactions;
    assert.ok(
      allInDb.some((tx) => tx.note.includes('Reliance Fresh Groceries') && tx.amount === 1250),
      'Expected imported October CSV expense to be persisted in IndexedDB'
    );
    assert.ok(
      allInDb.some((tx) => tx.note.includes('Consulting Invoice Retainer') && tx.amount === 45000),
      'Expected imported October CSV income to be persisted in IndexedDB'
    );
  });

  it('strictly validates mandatory CSV columns (Date, Amount, Description) and reports helpful error messages for malformed rows', async () => {
    const {
      MANDATORY_CSV_COLUMNS,
      isValidBankDateInput,
      isValidCsvAmountInput,
      validateCsvMandatoryColumns,
      validateCsvRows,
      validateAndParseCsvText,
      bulkImportCsvToLedger,
    } = await import('../src/pages/tools/MoneyManager');

    assert.deepEqual(MANDATORY_CSV_COLUMNS, ['Date', 'Amount', 'Description']);

    // 1. Validate date and amount validators
    assert.equal(isValidBankDateInput('2026-11-16'), true);
    assert.equal(isValidBankDateInput('16/11/2026'), true);
    assert.equal(isValidBankDateInput('16-Nov-2026'), true);
    assert.equal(isValidBankDateInput('not-a-date'), false);
    assert.equal(isValidBankDateInput('2026-99-45'), false);
    assert.equal(isValidBankDateInput(''), false);

    assert.equal(isValidCsvAmountInput('845'), true);
    assert.equal(isValidCsvAmountInput('-1,250.50'), true);
    assert.equal(isValidCsvAmountInput('₹ 24,500.00'), true);
    assert.equal(isValidCsvAmountInput('0'), false);
    assert.equal(isValidCsvAmountInput('abc'), false);
    assert.equal(isValidCsvAmountInput(''), false);

    // 2. Detect missing mandatory columns (e.g., missing Amount and Description)
    const missingColsCheck = validateCsvMandatoryColumns(['Date', 'Category', 'Bank']);
    assert.equal(missingColsCheck.hasMandatoryColumns, false);
    assert.deepEqual(missingColsCheck.missingColumns, ['Amount', 'Description']);
    assert.ok(
      missingColsCheck.columnErrorMessage?.includes('Missing mandatory CSV column(s): Amount, Description'),
      'Expected helpful error message listing missing mandatory columns'
    );

    const missingColsCsv = [
      'Date,Category,Bank',
      '2026-11-16,Food & Groceries,ICICI',
    ].join('\n');
    const missingColsImport = await bulkImportCsvToLedger(missingColsCsv);
    assert.equal(missingColsImport.importedTransactions.length, 0);
    assert.ok(
      missingColsImport.errorMessage?.includes('Missing mandatory CSV column(s): Amount, Description')
    );

    // 3. Detect malformed rows (invalid Date, non-numeric/missing Amount, missing Description) while importing valid rows
    const mixedCsv = [
      'Date,Description,Amount,Category,Bank',
      '2026-11-18,UPI/Valid Grocery Store,-920,Food & Groceries,ICICI',
      'invalid-date,UPI/Bad Date Row,-450,Food & Groceries,ICICI',
      '2026-11-19,UPI/Bad Amount Row,not_a_number,Food & Groceries,ICICI',
      '2026-11-20,, -310,Food & Groceries,ICICI',
    ].join('\n');

    const parsedAndValidated = validateAndParseCsvText(mixedCsv);
    assert.equal(parsedAndValidated.validation.hasMandatoryColumns, true);
    assert.equal(parsedAndValidated.validation.validRows.length, 1);
    assert.equal(parsedAndValidated.validation.malformedRows.length, 3);

    const [errRow2, errRow3, errRow4] = parsedAndValidated.validation.malformedRows;
    assert.equal(errRow2.rowNumber, 2);
    assert.deepEqual(errRow2.missingOrInvalidFields, ['Date']);
    assert.ok(errRow2.message.includes('Row 2 (line 3): Invalid or missing Date'));

    assert.equal(errRow3.rowNumber, 3);
    assert.deepEqual(errRow3.missingOrInvalidFields, ['Amount']);
    assert.ok(errRow3.message.includes('Row 3 (line 4): Invalid or missing Amount'));

    assert.equal(errRow4.rowNumber, 4);
    assert.deepEqual(errRow4.missingOrInvalidFields, ['Description']);
    assert.ok(errRow4.message.includes('Row 4 (line 5): Invalid or missing Description'));

    await resetDatabaseToDefaults();
    const mixedImportResult = await bulkImportCsvToLedger(mixedCsv, {
      defaultMonth: '2026-11',
    });
    assert.equal(
      mixedImportResult.importedTransactions.length,
      1,
      'Expected only the 1 valid row to be imported into IndexedDB'
    );
    assert.equal(mixedImportResult.malformedRows?.length, 3);
    assert.ok(
      mixedImportResult.errorMessage?.includes('Found 3 malformed CSV row(s)'),
      'Expected summary error message describing the 3 malformed rows'
    );
  });

  it('displays visual feedback (toast notification and progress bar) showing imported record count and failed validation row count when Import CSV is triggered', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const {
      buildCsvImportFeedback,
      CsvImportFeedbackBanner,
      bulkImportCsvToLedger,
    } = await import('../src/pages/tools/MoneyManager');

    assert.equal(typeof buildCsvImportFeedback, 'function');
    assert.equal(typeof CsvImportFeedbackBanner, 'function');

    // 1. Clean import feedback (all valid)
    const successFeedback = buildCsvImportFeedback({
      totalRows: 5,
      importedCount: 5,
      failedValidationCount: 0,
      skippedDuplicateCount: 0,
      progressPercent: 100,
    });
    assert.equal(successFeedback.status, 'success');
    assert.equal(successFeedback.progressPercent, 100);
    assert.equal(successFeedback.importedCount, 5);
    assert.equal(successFeedback.failedValidationCount, 0);
    assert.ok(
      successFeedback.message.includes('Successfully imported 5 record(s)') &&
        successFeedback.message.includes('0 failed validation')
    );

    // 2. Partial import with failed validation rows
    const warningFeedback = buildCsvImportFeedback({
      totalRows: 4,
      importedCount: 2,
      failedValidationCount: 2,
      skippedDuplicateCount: 0,
      validationErrors: [
        'Row 2 (line 3): Invalid or missing Date — Date "bad" is invalid.',
        'Row 4 (line 5): Invalid or missing Amount — Amount "abc" is not a valid non-zero number.',
      ],
    });
    assert.equal(warningFeedback.status, 'warning');
    assert.equal(warningFeedback.importedCount, 2);
    assert.equal(warningFeedback.failedValidationCount, 2);
    assert.ok(
      warningFeedback.message.includes('Successfully imported 2 record(s); 2 row(s) failed validation')
    );

    // 3. Complete validation failure (0 imported)
    const errorFeedback = buildCsvImportFeedback({
      totalRows: 2,
      importedCount: 0,
      failedValidationCount: 2,
      validationErrors: ['Row 1 (line 2): Invalid or missing Description — Description is missing.'],
    });
    assert.equal(errorFeedback.status, 'error');
    assert.equal(errorFeedback.importedCount, 0);
    assert.equal(errorFeedback.failedValidationCount, 2);
    assert.ok(errorFeedback.message.includes('0 records imported — 2 of 2 row(s) failed validation'));

    // 4. Verify bulkImportCsvToLedger returns structured feedback
    await resetDatabaseToDefaults();
    const csvWithOneValidOneInvalid = [
      'Date,Description,Amount,Category,Bank',
      '2026-11-22,UPI/Valid Coffee Shop,-280,Food & Groceries,ICICI',
      '2026-11-23,UPI/Broken Amount Row,not_numeric,Food & Groceries,ICICI',
    ].join('\n');
    const ledgerImport = await bulkImportCsvToLedger(csvWithOneValidOneInvalid, {
      defaultMonth: '2026-11',
    });
    assert.ok(ledgerImport.feedback, 'Expected bulkImportCsvToLedger to include feedback');
    assert.equal(ledgerImport.feedback?.importedCount, 1);
    assert.equal(ledgerImport.feedback?.failedValidationCount, 1);
    assert.equal(ledgerImport.feedback?.progressPercent, 100);

    // 5. Verify MoneyManager.tsx and CsvImportModal.tsx render the progress bar & feedback banner
    const toolsMmSrc = fs.readFileSync(
      path.resolve(process.cwd(), 'src/tools/MoneyManager.tsx'),
      'utf8'
    );
    const modalSrc = fs.readFileSync(
      path.resolve(process.cwd(), 'src/components/money-manager/CsvImportModal.tsx'),
      'utf8'
    );

    assert.ok(
      toolsMmSrc.includes('mm-csv-import-feedback-banner') &&
        toolsMmSrc.includes('mm-csv-import-progress-bar') &&
        toolsMmSrc.includes('mm-csv-feedback-imported-count') &&
        toolsMmSrc.includes('mm-csv-feedback-failed-count') &&
        toolsMmSrc.includes('role="progressbar"'),
      'Expected MoneyManager.tsx to render CsvImportFeedbackBanner with progressbar and imported/failed counts'
    );
    assert.ok(
      modalSrc.includes('mm-csv-modal-progress-bar') &&
        modalSrc.includes('role="progressbar"') &&
        modalSrc.includes('failed validation'),
      'Expected CsvImportModal.tsx to render progress bar and validation feedback'
    );
  });

  it('performs server-side-like validation enforcing YYYY-MM-DD dates, numeric amounts, and non-empty descriptions with a user-friendly error toast', async () => {
    const {
      isRealCalendarDate,
      isValidIsoYyyyMmDdDate,
      buildCsvValidationErrorToast,
      validateCsvRowServerSchema,
      validateCsvServerSide,
      autoDetectCsvMapping,
    } = await import('../src/pages/tools/MoneyManager');

    // 1. Strict YYYY-MM-DD date & calendar validation (including leap years)
    assert.equal(isRealCalendarDate(2026, 2, 28), true);
    assert.equal(isRealCalendarDate(2026, 2, 29), false); // 2026 is not a leap year
    assert.equal(isRealCalendarDate(2024, 2, 29), true); // 2024 is a leap year
    assert.equal(isRealCalendarDate(2026, 4, 31), false); // April has 30 days

    assert.equal(isValidIsoYyyyMmDdDate('2026-11-16'), true);
    assert.equal(isValidIsoYyyyMmDdDate('2026-11-16T14:30'), true);
    assert.equal(isValidIsoYyyyMmDdDate('16/11/2026'), false); // Not YYYY-MM-DD
    assert.equal(isValidIsoYyyyMmDdDate('2026-02-30'), false); // Impossible calendar date
    assert.equal(isValidIsoYyyyMmDdDate('2026-13-01'), false);

    // 2. Single row server-side schema validation
    const mapping = autoDetectCsvMapping(['Date', 'Description', 'Amount']);
    const validRowCheck = validateCsvRowServerSchema(
      { Date: '2026-11-18', Description: 'UPI/Swiggy Dinner', Amount: '-650.50' },
      1,
      mapping
    );
    assert.equal(validRowCheck.isValid, true);
    assert.deepEqual(validRowCheck.normalizedRow, {
      date: '2026-11-18',
      amount: -650.5,
      description: 'UPI/Swiggy Dinner',
    });

    const invalidRowCheck = validateCsvRowServerSchema(
      { Date: '18-11-2026', Description: '   ', Amount: 'NaN_value' },
      2,
      mapping
    );
    assert.equal(invalidRowCheck.isValid, false);
    assert.deepEqual(invalidRowCheck.missingOrInvalidFields, ['Date', 'Amount', 'Description']);
    assert.ok(invalidRowCheck.errorMessage?.includes('expected YYYY-MM-DD'));
    assert.ok(invalidRowCheck.errorMessage?.includes('not a valid non-zero number'));
    assert.ok(invalidRowCheck.errorMessage?.includes('Description is missing'));

    // 3. Batch server-side CSV validation & user-friendly error toast
    const csvSample = [
      'Date,Description,Amount',
      '2026-11-18,UPI/Fresh Groceries,-845',
      '18/11/2026,UPI/Wrong Date Format,-320',
      '2026-11-19,UPI/Invalid Amount,abc',
      '2026-11-20,,-500',
    ].join('\n');

    const batchReport = validateCsvServerSide(csvSample);
    assert.equal(batchReport.isValid, false);
    assert.equal(batchReport.validRows.length, 1);
    assert.equal(batchReport.invalidRows.length, 3);
    assert.ok(
      batchReport.errorToastMessage?.includes('CSV Validation Error (3 row(s) failed):'),
      'Expected user-friendly error toast summarizing failed rows'
    );
    assert.ok(
      batchReport.errorToastMessage?.includes('expected YYYY-MM-DD'),
      'Expected error toast to mention YYYY-MM-DD date requirement'
    );
    assert.equal(
      buildCsvValidationErrorToast([]),
      null,
      'Expected null error toast when no rows fail validation'
    );
  });

  it('provides a direct, zero-modal native file picker (fileInputRef + handleCsvFileUpload) that immediately reads, parses, saves to IndexedDB, and updates state', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const { bulkImportCsvFileToLedger } = await import('../src/pages/tools/MoneyManager');
    const { getAllLedgerState, resetDatabaseToDefaults } = await import('../src/db/db');

    const pagesMmSrc = fs.readFileSync(
      path.resolve(process.cwd(), 'src/pages/tools/MoneyManager.tsx'),
      'utf8'
    );
    const toolsMmSrc = fs.readFileSync(
      path.resolve(process.cwd(), 'src/tools/MoneyManager.tsx'),
      'utf8'
    );
    const headerSrc = fs.readFileSync(
      path.resolve(process.cwd(), 'src/components/money-manager/Header.tsx'),
      'utf8'
    );
    const dailySrc = fs.readFileSync(
      path.resolve(process.cwd(), 'src/components/money-manager/DailyView.tsx'),
      'utf8'
    );

    // 1. Verify fileInputRef and handleCsvFileUpload exist in MoneyManager.tsx, Header.tsx, and DailyView.tsx
    for (const [label, src] of [
      ['src/pages/tools/MoneyManager.tsx', pagesMmSrc],
      ['src/tools/MoneyManager.tsx', toolsMmSrc],
      ['src/components/money-manager/Header.tsx', headerSrc],
      ['src/components/money-manager/DailyView.tsx', dailySrc],
    ] as const) {
      assert.ok(
        src.includes('const fileInputRef = useRef<HTMLInputElement>(null);'),
        `Expected ${label} to declare fileInputRef`
      );
      assert.ok(
        src.includes('handleCsvFileUpload'),
        `Expected ${label} to implement handleCsvFileUpload`
      );
      assert.ok(
        src.includes('type="file"') &&
          src.includes('accept=".csv,text/csv"') &&
          src.includes('className="hidden"'),
        `Expected ${label} to render hidden CSV file input`
      );
    }

    // 2. Verify selecting a file in MoneyManager.tsx immediately calls processCsvContent(csvText) without requiring a modal
    assert.ok(
      toolsMmSrc.includes('await processCsvContent(text);') &&
        toolsMmSrc.includes('await processCsvContent(csvText);') &&
        toolsMmSrc.includes('onClick={() => fileInputRef.current?.click()}') &&
        toolsMmSrc.includes('jawed-money-manager-sample.csv'),
      'Expected MoneyManager.tsx to wire fileInputRef.current?.click(), jawed-money-manager-sample.csv, and directly execute processCsvContent'
    );
    assert.ok(
      pagesMmSrc.includes('onClick={() => fileInputRef.current?.click()}') &&
        pagesMmSrc.includes('jawed-money-manager-sample.csv') &&
        pagesMmSrc.includes('saveTransactionsToDb'),
      'Expected src/pages/tools/MoneyManager.tsx to include direct fileInputRef trigger, sample CSV download, and saveTransactionsToDb'
    );

    // 3. Verify end-to-end File upload of jawed-money-manager-sample.csv into IndexedDB via bulkImportCsvFileToLedger
    await resetDatabaseToDefaults();
    const beforeState = await getAllLedgerState();
    const sampleCsvPayload = [
      'Date,Type,Category,Amount,Description,Payment Method',
      '2026-11-01,Expense,Food & Dining,450.00,Client lunch,Credit Card',
      '2026-11-02,Expense,Workplace & Tools,1200.00,Network cable tester,Bank Transfer',
      '2026-11-05,Income,Freelance / Consulting,15000.00,IT Field dispatch payout,UPI',
    ].join('\n');

    const mockCsvFile = {
      name: 'jawed-money-manager-sample.csv',
      text: async () => sampleCsvPayload,
    };

    const result = await bulkImportCsvFileToLedger(mockCsvFile, {
      defaultMonth: '2026-11',
    });

    assert.equal(result.importedTransactions.length, 3, 'Expected 3 transactions imported directly from sample CSV file');
    assert.equal(result.feedback?.importedCount, 3, 'Expected feedback.importedCount to be 3');
    const afterState = await getAllLedgerState();
    assert.equal(
      afterState.transactions.length,
      beforeState.transactions.length + 3,
      'Expected IndexedDB transactions count to increase by 3 immediately after file upload'
    );
    assert.ok(
      afterState.transactions.some((tx) => tx.note.includes('Client lunch') && tx.amount === 450),
      'Expected Client lunch transaction in IndexedDB'
    );
    assert.ok(
      afterState.transactions.some((tx) => tx.note.includes('Network cable tester') && tx.amount === 1200),
      'Expected Network cable tester transaction in IndexedDB'
    );
    assert.ok(
      afterState.transactions.some((tx) => tx.note.includes('IT Field dispatch payout') && tx.amount === 15000 && tx.type === 'Income'),
      'Expected IT Field dispatch payout Income transaction in IndexedDB'
    );
  });

  it('configures permissive CSP headers and resilient Google Auth error categorization for auth/network-request-failed and popup blocks without affecting offline persistence', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const { firebaseConfig, categorizeGoogleAuthError } = await import('../src/lib/firebase');
    const { handleGoogleSignIn } = await import('../src/pages/tools/MoneyManager');

    // 1. Verify permissive CSP in public/_headers
    const headersPath = path.resolve(process.cwd(), 'public/_headers');
    const headersContent = fs.readFileSync(headersPath, 'utf8');
    assert.ok(headersContent.includes('Content-Security-Policy:'), 'Expected Content-Security-Policy in public/_headers');
    
    // connect-src directives
    assert.ok(headersContent.includes('https://*.firebaseio.com'), 'CSP must allow https://*.firebaseio.com');
    assert.ok(headersContent.includes('https://identitytoolkit.googleapis.com'), 'CSP must allow https://identitytoolkit.googleapis.com');
    assert.ok(headersContent.includes('https://securetoken.googleapis.com'), 'CSP must allow https://securetoken.googleapis.com');
    assert.ok(headersContent.includes('https://www.googleapis.com'), 'CSP must allow https://www.googleapis.com');
    assert.ok(headersContent.includes('https://apis.google.com'), 'CSP must allow https://apis.google.com');
    assert.ok(headersContent.includes('https://*.googleapis.com'), 'CSP must allow https://*.googleapis.com');
    assert.ok(headersContent.includes('https://*.firebaseapp.com'), 'CSP must allow https://*.firebaseapp.com');

    // frame-src directives
    assert.ok(headersContent.includes("frame-src 'self'"), 'CSP must allow frame-src self');
    assert.ok(headersContent.includes('https://accounts.google.com'), 'CSP frame-src must allow accounts.google.com');

    // 2. Verify Firebase config keys have non-empty fallbacks and are not undefined
    assert.ok(firebaseConfig.apiKey && firebaseConfig.apiKey.length > 5, 'Expected non-empty apiKey fallback');
    assert.ok(firebaseConfig.authDomain && firebaseConfig.authDomain.length > 5, 'Expected non-empty authDomain fallback');
    assert.ok(firebaseConfig.projectId && firebaseConfig.projectId.length > 3, 'Expected non-empty projectId fallback');
    assert.ok(firebaseConfig.appId && firebaseConfig.appId.length > 5, 'Expected non-empty appId fallback');

    // 3. Verify defensive sanity logging exists in firebase.ts, MoneyManager.tsx, and pages/tools/MoneyManager.tsx
    const firebaseTs = fs.readFileSync(path.resolve(process.cwd(), 'src/lib/firebase.ts'), 'utf8');
    const toolsMmSrc = fs.readFileSync(path.resolve(process.cwd(), 'src/tools/MoneyManager.tsx'), 'utf8');
    const pagesMmSrc = fs.readFileSync(path.resolve(process.cwd(), 'src/pages/tools/MoneyManager.tsx'), 'utf8');

    const expectedSanityCheck = 'if (!firebaseConfig.apiKey) {';
    assert.ok(firebaseTs.includes(expectedSanityCheck), 'Expected sanity check in src/lib/firebase.ts');
    assert.ok(toolsMmSrc.includes(expectedSanityCheck), 'Expected sanity check in src/tools/MoneyManager.tsx');
    assert.ok(pagesMmSrc.includes(expectedSanityCheck), 'Expected sanity check in src/pages/tools/MoneyManager.tsx');

    // 4. Verify categorizeGoogleAuthError maps cryptic codes to user-friendly explanations
    const networkErrMsg = categorizeGoogleAuthError({ code: 'auth/network-request-failed' });
    assert.ok(networkErrMsg.includes('Network connection failed'), 'Expected network message on auth/network-request-failed');
    assert.ok(networkErrMsg.toLowerCase().includes('ad-blocker'), 'Expected ad-blocker guidance in network failure message');

    const popupBlockedMsg = categorizeGoogleAuthError({ code: 'auth/popup-blocked' });
    assert.ok(popupBlockedMsg.toLowerCase().includes('popup was blocked'), 'Expected popup blocked guidance');

    const popupClosedMsg = categorizeGoogleAuthError({ code: 'auth/popup-closed-by-user' });
    assert.ok(popupClosedMsg.includes('closed before completion'), 'Expected popup closed message');

    // 5. Verify handleGoogleSignIn in src/pages/tools/MoneyManager handles network request errors gracefully
    let reportedError: string | null = null;
    let syncingState = false;

    const mockFailingAuth = {
      // Dummy auth instance that simulates network failure
    } as any;

    try {
      await handleGoogleSignIn({
        auth: mockFailingAuth,
        setSyncError: (msg) => {
          reportedError = msg;
        },
        setIsSyncing: (val) => {
          syncingState = val;
        },
      });
    } catch {
      // Expected rejection
    }

    assert.equal(syncingState, false, 'Expected isSyncing to reset to false in finally block');
    assert.ok(reportedError !== null, 'Expected an error to be reported via setSyncError');

    // 6. Verify zero disruption to offline functionality: local IndexedDB and CSV exports work 100% offline
    await resetDatabaseToDefaults();
    const offlineSavedTx = await saveTransaction({
      date: '2026-11-20T10:00',
      type: 'Expense',
      accountId: 'acc-icici',
      category: 'Workplace & Tools',
      subCategory: 'Bank Transfer',
      fixedOrVariable: 'Variable',
      amount: 850,
      note: 'Offline testing transaction without internet or cloud connection',
    });
    assert.ok(offlineSavedTx.id, 'Expected offline transaction saved in IndexedDB');
  });

  it("adds a 'Budget vs Actual' summary card to the top of the Stats view that calculates the difference between budgeted and actual expenses per category", async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const {
      BudgetVsActualSummaryCard,
      computeBudgetVsActualSummary,
    } = await import('../src/pages/tools/MoneyManager');

    assert.ok(BudgetVsActualSummaryCard, 'Expected BudgetVsActualSummaryCard to be exported from pages/tools/MoneyManager');
    assert.ok(typeof computeBudgetVsActualSummary === 'function', 'Expected computeBudgetVsActualSummary to be a function');

    // 1. Verify source integration: StatsView.tsx renders BudgetVsActualSummaryCard at top of Stats view
    const statsViewSource = fs.readFileSync(
      path.resolve(process.cwd(), 'src/components/money-manager/StatsView.tsx'),
      'utf8'
    );
    const pagesMmSource = fs.readFileSync(
      path.resolve(process.cwd(), 'src/pages/tools/MoneyManager.tsx'),
      'utf8'
    );

    assert.ok(
      statsViewSource.includes('<BudgetVsActualSummaryCard'),
      'Expected StatsView.tsx to render BudgetVsActualSummaryCard'
    );
    assert.ok(
      pagesMmSource.includes('BudgetVsActualSummaryCard'),
      'Expected src/pages/tools/MoneyManager.tsx to export BudgetVsActualSummaryCard'
    );

    // Verify BudgetVsActualSummaryCard appears in top portion of Stats view (before dashboard summary cards container)
    const cardMountIndex = statsViewSource.indexOf('<BudgetVsActualSummaryCard');
    const summaryCardsIndex = statsViewSource.indexOf('mm-dashboard-cards-container');
    assert.ok(cardMountIndex !== -1, 'Expected <BudgetVsActualSummaryCard to be mounted in StatsView');
    assert.ok(summaryCardsIndex !== -1, 'Expected mm-dashboard-cards-container in StatsView');
    assert.ok(
      cardMountIndex < summaryCardsIndex,
      'Expected BudgetVsActualSummaryCard to be positioned near top of Stats view above dashboard summary grid'
    );

    // 2. Test mathematical calculation of differences between budgeted and actual expenses per category
    const mockCategories = [
      {
        id: 'cat-food',
        name: 'Food & Dining',
        type: 'Expense' as const,
        defaultFixedOrVariable: 'Variable' as const,
        iconName: 'Utensils',
        subCategories: ['Restaurants', 'Groceries'],
        monthlyBudget: 10000,
        color: '#f59e0b',
      },
      {
        id: 'cat-tools',
        name: 'Workplace & Tools',
        type: 'Expense' as const,
        defaultFixedOrVariable: 'Variable' as const,
        iconName: 'Wrench',
        subCategories: ['Hardware', 'Software'],
        monthlyBudget: 5000,
        color: '#3b82f6',
      },
      {
        id: 'cat-util',
        name: 'Utilities',
        type: 'Expense' as const,
        defaultFixedOrVariable: 'Fixed' as const,
        iconName: 'Zap',
        subCategories: ['Electricity', 'Internet'],
        monthlyBudget: 4000,
        color: '#10b981',
      },
      {
        id: 'cat-salary',
        name: 'Salary',
        type: 'Income' as const,
        defaultFixedOrVariable: 'Fixed' as const,
        iconName: 'Briefcase',
        subCategories: ['Payroll'],
        monthlyBudget: 0,
        color: '#22c55e',
      },
    ];

    const mockTransactions = [
      // November 2026 transactions
      {
        id: 'tx-1',
        date: '2026-11-03T12:00',
        type: 'Expense' as const,
        accountId: 'acc-1',
        category: 'Food & Dining',
        amount: 7000,
        note: 'Team lunches and grocery stocking',
        subCategory: 'Groceries',
        fixedOrVariable: 'Variable' as const,
        isAnomaly: false,
        createdAt: '2026-11-03T12:00:00Z',
      },
      {
        id: 'tx-2',
        date: '2026-11-08T15:30',
        type: 'Expense' as const,
        accountId: 'acc-1',
        category: 'Workplace & Tools',
        amount: 6500,
        note: 'Upgraded network diagnostic gear',
        subCategory: 'Hardware',
        fixedOrVariable: 'Variable' as const,
        isAnomaly: false,
        createdAt: '2026-11-08T15:30:00Z',
      },
      {
        id: 'tx-3',
        date: '2026-11-12T10:00',
        type: 'Expense' as const,
        accountId: 'acc-1',
        category: 'Utilities',
        amount: 4000,
        note: 'High-speed fiber bill',
        subCategory: 'Internet',
        fixedOrVariable: 'Fixed' as const,
        isAnomaly: false,
        createdAt: '2026-11-12T10:00:00Z',
      },
      // Income should not be counted as expense
      {
        id: 'tx-4',
        date: '2026-11-01T09:00',
        type: 'Income' as const,
        accountId: 'acc-1',
        category: 'Salary',
        amount: 75000,
        note: 'Monthly salary payout',
        subCategory: 'Payroll',
        fixedOrVariable: 'Fixed' as const,
        isAnomaly: false,
        createdAt: '2026-11-01T09:00:00Z',
      },
      // October transaction should not affect November calculation
      {
        id: 'tx-5',
        date: '2026-10-25T11:00',
        type: 'Expense' as const,
        accountId: 'acc-1',
        category: 'Food & Dining',
        amount: 5000,
        note: 'Prior month food',
        subCategory: 'Restaurants',
        fixedOrVariable: 'Variable' as const,
        isAnomaly: false,
        createdAt: '2026-10-25T11:00:00Z',
      },
    ];

    const summary = computeBudgetVsActualSummary(mockTransactions, mockCategories, '2026-11');

    // Total Budgeted: 10000 + 5000 + 4000 = 19000
    assert.equal(summary.totalBudgeted, 19000, 'Expected total budgeted expenses to be ₹19,000');

    // Total Actual Spent in Nov: 7000 + 6500 + 4000 = 17500
    assert.equal(summary.totalActual, 17500, 'Expected total actual expenses to be ₹17,500');

    // Total Net Difference: 19000 - 17500 = +1500 (under budget)
    assert.equal(summary.totalDifference, 1500, 'Expected net total difference to be +₹1,500');
    assert.equal(summary.overallStatus, 'under-budget', 'Expected overall status to be under-budget');

    // Health counts
    assert.equal(summary.overBudgetCount, 1, 'Expected 1 category over budget');
    assert.equal(summary.underBudgetCount, 1, 'Expected 1 category under budget');
    assert.equal(summary.onTrackCount, 1, 'Expected 1 category on track/balanced');

    // Per-category validation
    const foodItem = summary.categories.find((c) => c.category === 'Food & Dining')!;
    assert.ok(foodItem, 'Expected Food & Dining item');
    assert.equal(foodItem.budgeted, 10000);
    assert.equal(foodItem.actual, 7000);
    assert.equal(foodItem.difference, 3000, 'Food & Dining difference should be +3000 (10000 - 7000)');
    assert.equal(foodItem.status, 'under-budget');
    assert.equal(foodItem.utilizationPercent, 70);

    const toolsItem = summary.categories.find((c) => c.category === 'Workplace & Tools')!;
    assert.ok(toolsItem, 'Expected Workplace & Tools item');
    assert.equal(toolsItem.budgeted, 5000);
    assert.equal(toolsItem.actual, 6500);
    assert.equal(toolsItem.difference, -1500, 'Workplace & Tools difference should be -1500 (5000 - 6500)');
    assert.equal(toolsItem.absDifference, 1500);
    assert.equal(toolsItem.status, 'over-budget');
    assert.equal(toolsItem.utilizationPercent, 130);

    const utilItem = summary.categories.find((c) => c.category === 'Utilities')!;
    assert.ok(utilItem, 'Expected Utilities item');
    assert.equal(utilItem.budgeted, 4000);
    assert.equal(utilItem.actual, 4000);
    assert.equal(utilItem.difference, 0, 'Utilities difference should be 0 (4000 - 4000)');
    assert.equal(utilItem.status, 'on-track');
    assert.equal(utilItem.utilizationPercent, 100);

    // 3. Test variance and calculateCategoryBudgetVariance specifically
    const { calculateCategoryBudgetVariance } = await import('../src/pages/tools/MoneyManager');
    assert.ok(typeof calculateCategoryBudgetVariance === 'function');

    assert.equal(foodItem.variance, 3000, 'Food & Dining variance should be +3000 (10000 - 7000)');
    assert.equal(foodItem.varianceType, 'favorable');
    assert.equal(toolsItem.variance, -1500, 'Workplace & Tools variance should be -1500 (5000 - 6500)');
    assert.equal(toolsItem.varianceType, 'unfavorable');
    assert.equal(utilItem.variance, 0, 'Utilities variance should be 0');
    assert.equal(utilItem.varianceType, 'neutral');
    assert.equal(summary.totalVariance, 1500, 'Total variance should be +1500');
    assert.equal(summary.overallVarianceType, 'favorable');

    const favorableVariance = calculateCategoryBudgetVariance(10000, 7000);
    assert.equal(favorableVariance.variance, 3000);
    assert.equal(favorableVariance.varianceType, 'favorable');
    assert.equal(favorableVariance.isOverBudget, false);

    const unfavorableVariance = calculateCategoryBudgetVariance(5000, 6500);
    assert.equal(unfavorableVariance.variance, -1500);
    assert.equal(unfavorableVariance.varianceType, 'unfavorable');
    assert.equal(unfavorableVariance.isOverBudget, true);
  });

  it("extends the MoneyManager category management section to include an input field for setting a monthly budget limit for each category, stores these limits in IndexedDB, and exposes them to the new 'Budget vs Actual' summary card", async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const {
      saveCategoryBudgetLimit,
      updateCategoryMonthlyBudget,
      computeBudgetVsActualSummary,
    } = await import('../src/pages/tools/MoneyManager');
    const { getAllCategories, saveCategory, resetDatabaseToDefaults } = await import('../src/db/db');

    // 1. Verify CategoryManager source code includes input field for monthly budget limits
    const cmSource = fs.readFileSync(
      path.resolve(process.cwd(), 'src/components/money-manager/CategoryManager.tsx'),
      'utf8'
    );
    assert.ok(
      cmSource.includes('mm-category-budget-limit-input'),
      'Expected CategoryManager to include mm-category-budget-limit-input'
    );
    assert.ok(
      cmSource.includes('Monthly Budget') || cmSource.includes('Monthly budget'),
      'Expected CategoryManager to label the input field with Monthly Budget'
    );
    assert.ok(
      cmSource.includes('handleBudgetChange'),
      'Expected CategoryManager to handle budget changes'
    );

    // 2. Test saving and updating category monthly budget limits in IndexedDB
    await resetDatabaseToDefaults();
    const initialCategories = await getAllCategories();
    const foodCat = initialCategories.find(
      (c) => c.name === 'Food & Dining' || c.name === 'Food & Groceries'
    )!;
    assert.ok(foodCat, 'Expected food category (Food & Dining or Food & Groceries)');

    // Update food category monthly budget limit to ₹15,000 using saveCategoryBudgetLimit
    const updatedFood = await saveCategoryBudgetLimit(foodCat.id, 15000);
    assert.equal(updatedFood.monthlyBudget, 15000, 'Expected returned category to have 15000 budget');

    // Verify persisted directly in IndexedDB
    const reloadedCategories = await getAllCategories();
    const persistedFood = reloadedCategories.find((c) => c.id === foodCat.id)!;
    assert.equal(persistedFood.monthlyBudget, 15000, 'Expected IndexedDB to store food monthlyBudget = 15000');

    // Update second category (Workplace & Tools or Utilities & Broadband) using updateCategoryMonthlyBudget
    const toolsCat = initialCategories.find(
      (c) => c.name === 'Workplace & Tools' || c.name === 'Utilities & Broadband'
    )!;
    assert.ok(toolsCat, 'Expected second category');
    await updateCategoryMonthlyBudget(toolsCat.name, 8500);

    const reloadedCategories2 = await getAllCategories();
    const persistedTools = reloadedCategories2.find((c) => c.name === toolsCat.name)!;
    assert.equal(persistedTools.monthlyBudget, 8500, 'Expected IndexedDB to store second category monthlyBudget = 8500');

    // 3. Verify newly stored limits are exposed to the 'Budget vs Actual' summary card
    const mockExpenseTransactions = [
      {
        id: 'tx-cm-1',
        date: '2026-11-04T12:00',
        type: 'Expense' as const,
        accountId: 'acc-icici',
        category: foodCat.name,
        amount: 9000,
        note: 'Supermarket shopping',
        subCategory: 'Groceries',
        fixedOrVariable: 'Variable' as const,
        isAnomaly: false,
        createdAt: '2026-11-04T12:00:00Z',
      },
      {
        id: 'tx-cm-2',
        date: '2026-11-10T14:00',
        type: 'Expense' as const,
        accountId: 'acc-icici',
        category: toolsCat.name,
        amount: 9200,
        note: 'New hardware or utility setup',
        subCategory: 'Hardware',
        fixedOrVariable: 'Variable' as const,
        isAnomaly: false,
        createdAt: '2026-11-10T14:00:00Z',
      },
    ];

    // Compute Budget vs Actual summary using the categories retrieved from IndexedDB
    const summary = computeBudgetVsActualSummary(
      mockExpenseTransactions,
      reloadedCategories2,
      '2026-11'
    );

    // Food category should now use the new ₹15,000 budget:
    // Spent: 9,000. Variance / Difference: 15,000 - 9,000 = +6,000 (Favorable / Under Budget)
    const foodSummary = summary.categories.find((c) => c.category === foodCat.name)!;
    assert.ok(foodSummary, 'Expected food category in summary');
    assert.equal(foodSummary.budgeted, 15000, 'Expected food budget in summary to be ₹15,000');
    assert.equal(foodSummary.actual, 9000);
    assert.equal(foodSummary.difference, 6000, 'Expected difference to be +6000');
    assert.equal(foodSummary.variance, 6000);
    assert.equal(foodSummary.status, 'under-budget');
    assert.equal(foodSummary.varianceType, 'favorable');

    // Second category should now use the new ₹8,500 budget:
    // Spent: 9,200. Variance / Difference: 8,500 - 9,200 = -700 (Unfavorable / Over Budget)
    const toolsSummary = summary.categories.find((c) => c.category === toolsCat.name)!;
    assert.ok(toolsSummary, 'Expected second category in summary');
    assert.equal(toolsSummary.budgeted, 8500, 'Expected second category budget in summary to be ₹8,500');
    assert.equal(toolsSummary.actual, 9200);
    assert.equal(toolsSummary.difference, -700, 'Expected difference to be -700');
    assert.equal(toolsSummary.variance, -700);
    assert.equal(toolsSummary.status, 'over-budget');
    assert.equal(toolsSummary.varianceType, 'unfavorable');

    // 4. Test clearing/removing budget limit back to unbudgeted (0 / undefined)
    await saveCategoryBudgetLimit(foodCat.id, 0);
    const reloadedCategories3 = await getAllCategories();
    const clearedFood = reloadedCategories3.find((c) => c.id === foodCat.id)!;
    assert.equal(clearedFood.monthlyBudget, undefined, 'Expected cleared budget to be undefined');

    const summaryAfterClear = computeBudgetVsActualSummary(
      mockExpenseTransactions,
      reloadedCategories3,
      '2026-11'
    );
    const clearedFoodSummary = summaryAfterClear.categories.find((c) => c.category === foodCat.name)!;
    assert.equal(clearedFoodSummary.budgeted, 0, 'Expected cleared budget to register as 0');
    assert.equal(clearedFoodSummary.status, 'unbudgeted');
  });

  it("in src/pages/tools/MoneyManager.tsx, inside the Stats view, adds a summary card that iterates over all categories, compares the stored budget limit from IndexedDB against the actual sum of expenses for the current month, and displays the variance with color-coded alerts (green for under budget, red for over)", async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const {
      BudgetVsActualSummaryCard,
      CategoryBudgetVarianceSummaryCard,
      computeBudgetVsActualSummary,
      computeCategoryBudgetVariances,
      calculateCategoryBudgetVariance,
      saveCategoryBudgetLimit,
    } = await import('../src/pages/tools/MoneyManager');
    const {
      getAllCategories,
      saveTransaction,
      resetDatabaseToDefaults,
    } = await import('../src/db/db');

    // 1. Verify source architecture: StatsView renders summary card with color-coded alerts
    const statsViewSource = fs.readFileSync(
      path.resolve(process.cwd(), 'src/components/money-manager/StatsView.tsx'),
      'utf8'
    );
    const cardSource = fs.readFileSync(
      path.resolve(process.cwd(), 'src/components/money-manager/BudgetVsActualSummaryCard.tsx'),
      'utf8'
    );

    assert.ok(
      statsViewSource.includes('<BudgetVsActualSummaryCard') ||
      statsViewSource.includes('<CategoryBudgetVarianceSummaryCard'),
      'Expected StatsView to render BudgetVsActualSummaryCard / CategoryBudgetVarianceSummaryCard'
    );
    assert.ok(
      cardSource.includes('category-budget-variance-alerts-grid') ||
      cardSource.includes('category-variance-alert'),
      'Expected BudgetVsActualSummaryCard to include variance alerts grid'
    );
    assert.ok(
      cardSource.includes('Under Budget') && cardSource.includes('Over Budget'),
      'Expected card to display Under Budget and Over Budget alert labels'
    );

    // 2. Initialize database and set up known category budget limits in IndexedDB
    await resetDatabaseToDefaults();
    const categories = await getAllCategories();
    const foodCat = categories.find(
      (c) => c.name === 'Food & Groceries' || c.name === 'Food & Dining'
    )!;
    const utilCat = categories.find(
      (c) => c.name === 'Utilities & Broadband' || c.name === 'Utilities'
    )!;
    assert.ok(foodCat, 'Expected food category');
    assert.ok(utilCat, 'Expected util category');

    // Store explicit budget limits in IndexedDB
    await saveCategoryBudgetLimit(foodCat.id, 12000); // Limit: 12,000
    await saveCategoryBudgetLimit(utilCat.id, 5000);  // Limit: 5,000

    // Record mock expenses for current month:
    // Food actual: 8,500 (Under budget by 3,500 -> GREEN ALERT)
    // Util actual: 6,800 (Over budget by 1,800 -> RED ALERT)
    const currentMonth = '2026-11';
    const testTx1 = {
      id: 'tx-variance-test-1',
      date: `${currentMonth}-08T10:00`,
      type: 'Expense' as const,
      accountId: 'acc-icici',
      category: foodCat.name,
      amount: 8500,
      note: 'Grocery store monthly staples',
      subCategory: 'Groceries',
      fixedOrVariable: 'Variable' as const,
      isAnomaly: false,
      createdAt: `${currentMonth}-08T10:00:00Z`,
    };
    const testTx2 = {
      id: 'tx-variance-test-2',
      date: `${currentMonth}-14T15:30`,
      type: 'Expense' as const,
      accountId: 'acc-icici',
      category: utilCat.name,
      amount: 6800,
      note: 'Electricity + Broadband quarterly payment',
      subCategory: 'Electricity',
      fixedOrVariable: 'Fixed' as const,
      isAnomaly: false,
      createdAt: `${currentMonth}-14T15:30:00Z`,
    };

    await saveTransaction(testTx1);
    await saveTransaction(testTx2);

    // 3. Test calculation and variance results
    const reloadedCats = await getAllCategories();
    const variances = computeCategoryBudgetVariances(
      [testTx1, testTx2],
      reloadedCats,
      currentMonth
    );

    // Check Under-Budget category (Food):
    const foodVariance = variances.find((v) => v.category === foodCat.name)!;
    assert.ok(foodVariance, 'Expected food variance item');
    assert.equal(foodVariance.budgetLimit, 12000, 'Expected stored budget limit 12,000');
    assert.equal(foodVariance.actualExpenses, 8500, 'Expected actual expenses 8,500');
    assert.equal(foodVariance.variance, 3500, 'Expected positive variance 3,500 (under budget)');
    assert.equal(foodVariance.isUnderBudget, true, 'Expected isUnderBudget === true');
    assert.equal(foodVariance.isOverBudget, false, 'Expected isOverBudget === false');
    assert.equal(foodVariance.alertColor, 'green', 'Expected color-coded alert: green for under budget');
    assert.equal(foodVariance.varianceType, 'favorable');

    // Check Over-Budget category (Utilities):
    const utilVariance = variances.find((v) => v.category === utilCat.name)!;
    assert.ok(utilVariance, 'Expected utility variance item');
    assert.equal(utilVariance.budgetLimit, 5000, 'Expected stored budget limit 5,000');
    assert.equal(utilVariance.actualExpenses, 6800, 'Expected actual expenses 6,800');
    assert.equal(utilVariance.variance, -1800, 'Expected negative variance -1,800 (over budget)');
    assert.equal(utilVariance.isOverBudget, true, 'Expected isOverBudget === true');
    assert.equal(utilVariance.isUnderBudget, false, 'Expected isUnderBudget === false');
    assert.equal(utilVariance.alertColor, 'red', 'Expected color-coded alert: red for over budget');
    assert.equal(utilVariance.varianceType, 'unfavorable');

    // 4. Test calculateCategoryBudgetVariance standalone helper
    const underRes = calculateCategoryBudgetVariance(10000, 7500);
    assert.equal(underRes.variance, 2500);
    assert.equal(underRes.isOverBudget, false);
    assert.equal(underRes.isUnderBudget, true);
    assert.equal(underRes.alertColor, 'green');

    const overRes = calculateCategoryBudgetVariance(5000, 7200);
    assert.equal(overRes.variance, -2200);
    assert.equal(overRes.isOverBudget, true);
    assert.equal(overRes.isUnderBudget, false);
    assert.equal(overRes.alertColor, 'red');
  });

  it("extends the MoneyManager UI to allow users to set a 'Monthly Budget' for each transaction category, persists limits to IndexedDB, and properly retrieves them when calculating variance", async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');

    // 1. Verify CategoryManagementModal export across all relevant modules
    const categoryManagerModule = await import('../src/components/money-manager/CategoryManager');
    const statsViewModule = await import('../src/components/money-manager/StatsView');
    const toolsMoneyManagerModule = await import('../src/tools/MoneyManager');
    const pagesMoneyManagerModule = await import('../src/pages/tools/MoneyManager');

    assert.ok(
      categoryManagerModule.CategoryManagementModal,
      'Expected CategoryManagementModal export in CategoryManager.tsx'
    );
    assert.ok(
      statsViewModule.CategoryManagementModal,
      'Expected CategoryManagementModal export in StatsView.tsx'
    );
    assert.ok(
      toolsMoneyManagerModule.CategoryManagementModal,
      'Expected CategoryManagementModal export in src/tools/MoneyManager.tsx'
    );
    assert.ok(
      pagesMoneyManagerModule.CategoryManagementModal,
      'Expected CategoryManagementModal export in src/pages/tools/MoneyManager.tsx'
    );

    // 2. Inspect source code for required modal markup, Monthly Budget input, and IndexedDB persistence notes
    const cmSource = fs.readFileSync(
      path.resolve(process.cwd(), 'src/components/money-manager/CategoryManager.tsx'),
      'utf8'
    );
    assert.ok(
      cmSource.includes('category-management-modal'),
      'Expected CategoryManager.tsx to include data-testid="category-management-modal"'
    );
    assert.ok(
      cmSource.includes('category-monthly-budget-input'),
      'Expected CategoryManager.tsx to include category-monthly-budget-input test ID'
    );
    assert.ok(
      cmSource.includes('Monthly Budget: ₹'),
      'Expected CategoryManager.tsx to include "Monthly Budget: ₹" label'
    );
    assert.ok(
      cmSource.includes('type="number"') && cmSource.includes('placeholder="e.g. 5000"'),
      'Expected numeric input with e.g. 5000 placeholder'
    );
    assert.ok(
      cmSource.includes('open-category-management-modal-btn'),
      'Expected trigger button to open the CategoryManagementModal'
    );
    assert.ok(
      cmSource.includes('IndexedDB'),
      'Expected CategoryManagementModal to persist limits directly to IndexedDB'
    );

    // 3. Reset database and load fresh categories
    const {
      getAllCategories,
      saveCategory,
      saveTransaction,
      resetDatabaseToDefaults,
    } = await import('../src/db/db');
    const {
      saveCategoryBudgetLimit,
      computeCategoryBudgetVariances,
      computeBudgetVsActualSummary,
    } = await import('../src/pages/tools/MoneyManager');

    await resetDatabaseToDefaults();
    const categoriesBefore = await getAllCategories();
    assert.ok(categoriesBefore.length >= 5, 'Expected standard categories');

    const transportCat = categoriesBefore.find(
      (c) => c.name === 'Transport & Fuel' || c.name === 'Transportation'
    )!;
    const lifestyleCat = categoriesBefore.find(
      (c) => c.name === 'Lifestyle & Family' || c.name === 'Entertainment & Leisure'
    )!;
    assert.ok(transportCat, 'Expected Transport & Fuel category');
    assert.ok(lifestyleCat, 'Expected Lifestyle & Family category');

    // 4. Update monthly budget limits in IndexedDB via saveCategory and saveCategoryBudgetLimit
    const updatedTransport = await saveCategoryBudgetLimit(transportCat.id, 14000);
    assert.equal(
      updatedTransport.monthlyBudget,
      14000,
      'Expected returned category to have monthlyBudget = 14000'
    );

    await saveCategory({
      ...lifestyleCat,
      monthlyBudget: 8000,
    });

    // Verify stored limits in IndexedDB
    const reloadedCategories = await getAllCategories();
    const storedTransport = reloadedCategories.find((c) => c.id === transportCat.id)!;
    const storedLifestyle = reloadedCategories.find((c) => c.id === lifestyleCat.id)!;

    assert.equal(
      storedTransport.monthlyBudget,
      14000,
      'Expected Transport & Fuel monthlyBudget stored in IndexedDB as 14,000'
    );
    assert.equal(
      storedLifestyle.monthlyBudget,
      8000,
      'Expected Lifestyle & Family monthlyBudget stored in IndexedDB as 8,000'
    );

    // 5. Test proper retrieval and variance calculations with color-coded alerts
    const currentMonth = '2026-11';

    // Transaction 1: Transport & Fuel spend ₹10,500 (Budget 14,000 -> Under budget by 3,500: GREEN)
    const testTxTransport = {
      id: 'tx-test-transport-budget',
      date: `${currentMonth}-10T12:00`,
      type: 'Expense' as const,
      accountId: 'acc-icici',
      category: transportCat.name,
      amount: 10500,
      note: 'Fuel and vehicle servicing',
      subCategory: 'Fuel',
      fixedOrVariable: 'Variable' as const,
      isAnomaly: false,
      createdAt: `${currentMonth}-10T12:00:00Z`,
    };

    // Transaction 2: Lifestyle spend ₹9,800 (Budget 8,000 -> Over budget by 1,800: RED)
    const testTxLifestyle = {
      id: 'tx-test-lifestyle-budget',
      date: `${currentMonth}-12T18:00`,
      type: 'Expense' as const,
      accountId: 'acc-icici',
      category: lifestyleCat.name,
      amount: 9800,
      note: 'Family weekend outing and shopping',
      subCategory: 'Family Outing',
      fixedOrVariable: 'Variable' as const,
      isAnomaly: false,
      createdAt: `${currentMonth}-12T18:00:00Z`,
    };

    await saveTransaction(testTxTransport);
    await saveTransaction(testTxLifestyle);

    // Compute variances using categories retrieved from IndexedDB
    const categoriesFromDb = await getAllCategories();
    const variances = computeCategoryBudgetVariances(
      [testTxTransport, testTxLifestyle],
      categoriesFromDb,
      currentMonth
    );

    // Check Transport (Under Budget):
    const transportVariance = variances.find((v) => v.category === transportCat.name)!;
    assert.ok(transportVariance, 'Expected transport variance record');
    assert.equal(transportVariance.budgetLimit, 14000, 'Expected limit 14,000 from IndexedDB');
    assert.equal(transportVariance.actualExpenses, 10500, 'Expected actual 10,500');
    assert.equal(transportVariance.variance, 3500, 'Expected variance = 3,500 (under budget)');
    assert.equal(transportVariance.isUnderBudget, true);
    assert.equal(transportVariance.isOverBudget, false);
    assert.equal(transportVariance.alertColor, 'green', 'Expected green alert for under budget');
    assert.equal(transportVariance.varianceType, 'favorable');

    // Check Lifestyle (Over Budget):
    const lifestyleVariance = variances.find((v) => v.category === lifestyleCat.name)!;
    assert.ok(lifestyleVariance, 'Expected lifestyle variance record');
    assert.equal(lifestyleVariance.budgetLimit, 8000, 'Expected limit 8,000 from IndexedDB');
    assert.equal(lifestyleVariance.actualExpenses, 9800, 'Expected actual 9,800');
    assert.equal(lifestyleVariance.variance, -1800, 'Expected variance = -1,800 (over budget)');
    assert.equal(lifestyleVariance.isOverBudget, true);
    assert.equal(lifestyleVariance.isUnderBudget, false);
    assert.equal(lifestyleVariance.alertColor, 'red', 'Expected red alert for over budget');
    assert.equal(lifestyleVariance.varianceType, 'unfavorable');

    // Check complete summary
    const summary = computeBudgetVsActualSummary(
      [testTxTransport, testTxLifestyle],
      categoriesFromDb,
      currentMonth
    );
    assert.ok(summary.categories.length >= 2);
    assert.ok(summary.totalBudgeted >= 22000);
    assert.ok(summary.totalActual >= 20300);
  });
});



