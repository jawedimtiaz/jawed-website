import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Helmet, HelmetProvider } from 'react-helmet-async';
import { Plus, Shield, Database, Sparkles, CheckCircle2 } from 'lucide-react';
import { SeoHead } from '../components/SeoHead';
import {
  type AccountSummary,
  type MoneyAccount,
  type MoneyCategory,
  type MoneyTransaction,
  type SinkingFund,
  type RecurringRule,
  initializeAndSeedDatabase,
  calculateMonthlyMetrics,
  saveTransaction,
  deleteTransaction,
  saveAccount,
  saveCategory,
  deleteCategory,
  saveSinkingFund,
  deleteSinkingFund,
  saveRecurringRule,
  deleteRecurringRule,
  processDueRecurringRules,
  syncRecurringTransactionsForMonth,
  triggerRecurringRuleNow,
  formatINR,
} from '../db/db';
import { MoneyManagerHeader, type MoneyManagerTab } from '../components/money-manager/Header';
import { DailyView } from '../components/money-manager/DailyView';
import { CalendarView } from '../components/money-manager/CalendarView';
import { AccountsView } from '../components/money-manager/AccountsView';
import {
  StatsView,
  evaluateCategoryBudgetAlerts,
  evaluate95PercentBudgetAlerts,
} from '../components/money-manager/StatsView';
import { RecurringView } from '../components/money-manager/RecurringView';
import { TransactionModal } from '../components/money-manager/TransactionModal';
import { ReceiptLightboxModal } from '../components/money-manager/ReceiptLightboxModal';
import { BackupRestoreModal } from '../components/money-manager/BackupRestoreModal';
import { BackupBanner } from '../components/BackupBanner';
import { enableStoragePersistence } from '../db';

export const MONEY_MANAGER_SEO = {
  route: '/tools/money-manager',
  canonicalUrl: 'https://jawed.co.in/tools/money-manager',
  title: 'Money Manager & Multi-Bank Ledger – Client-Side Personal Finance Tracker | Jawed Imtiaz',
  description:
    'Track income, expenses, bank transfers, receipt photos, and annual sinking funds across multiple accounts (ICICI, SBI, UBI, Cash) 100% locally in your browser IndexedDB.',
  ogTitle: 'Money Manager & Multi-Bank Ledger | Private IndexedDB Expense & Bank Tracker',
  ogDescription:
    'Realbyte-styled double-entry personal finance ledger with Daily, Calendar, Accounts, and Stats views, photo receipts, sinking funds, and SheetJS Excel export.',
  keywords:
    'money manager, personal finance ledger, multi-bank expense tracker, indexeddb finance app, budget forecast, sinking funds, jawed imtiaz tools',
} as const;

export const MoneyManager: React.FC = () => {
  const [accounts, setAccounts] = useState<AccountSummary[]>([]);
  const [categories, setCategories] = useState<MoneyCategory[]>([]);
  const [transactions, setTransactions] = useState<MoneyTransaction[]>([]);
  const [sinkingFunds, setSinkingFunds] = useState<SinkingFund[]>([]);
  const [recurringRules, setRecurringRules] = useState<RecurringRule[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Default to '2026-11' matching the Realbyte `< 2026 Nov >` specification & sample seed entries
  const [selectedMonth, setSelectedMonth] = useState<string>('2026-11');
  const [activeTab, setActiveTab] = useState<MoneyManagerTab>('daily');
  const [selectedAccountIdForDaily, setSelectedAccountIdForDaily] = useState<string>('ALL');

  // Transaction Modal State
  const [isTxModalOpen, setIsTxModalOpen] = useState<boolean>(false);
  const [editingTransaction, setEditingTransaction] = useState<MoneyTransaction | null>(null);
  const [defaultTxDate, setDefaultTxDate] = useState<string | undefined>(undefined);
  const [initialReceiptImageForModal, setInitialReceiptImageForModal] = useState<string | undefined>(undefined);

  // Receipt Lightbox State
  const [lightboxState, setLightboxState] = useState<{
    isOpen: boolean;
    images: string[];
    title: string;
  }>({ isOpen: false, images: [], title: '' });

  // Backup / Restore Modal State
  const [isBackupModalOpen, setIsBackupModalOpen] = useState<boolean>(false);

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3200);
  }, []);

  const loadDatabaseState = useCallback(async () => {
    try {
      const todayIso = new Date().toISOString().slice(0, 10);
      const state = await initializeAndSeedDatabase(todayIso);
      setAccounts(state.accounts);
      setCategories(state.categories);
      setTransactions(state.transactions);
      setSinkingFunds(state.sinkingFunds);
      setRecurringRules(state.recurringRules);
    } catch (err) {
      console.error('Failed to initialize JawedMoneyManagerDB:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDatabaseState();
    enableStoragePersistence();
  }, [loadDatabaseState]);

  // Derived Monthly Metrics (Strictly excluding Transfers from Income & Expense)
  const monthlyMetrics = useMemo(
    () => calculateMonthlyMetrics(transactions, selectedMonth),
    [transactions, selectedMonth]
  );

  // Total Net Worth across all accounts
  const totalNetWorth = useMemo(
    () => accounts.reduce((sum, acc) => sum + acc.currentBalance, 0),
    [accounts]
  );

  // Real-time over-budget alert count for the selected month
  const overBudgetAlertCount = useMemo(
    () =>
      evaluateCategoryBudgetAlerts(
        transactions,
        selectedMonth,
        categories.length > 0 ? categories : undefined
      ).exceededCategories.length,
    [transactions, selectedMonth, categories]
  );

  // Automatic 95% Category Budget Alert System: Sends toast notification when user approaches/exceeds 95% of a monthly category budget
  const notified95PercentCategoriesRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (isLoading || transactions.length === 0) return;

    const alertResult = evaluate95PercentBudgetAlerts(
      transactions,
      selectedMonth,
      categories.length > 0 ? categories : undefined
    );

    for (const item of alertResult.warning95Categories) {
      const alertKey = `${selectedMonth}:${item.category}:${item.spent}:${item.monthlyLimit}`;
      if (!notified95PercentCategoriesRef.current.has(alertKey)) {
        notified95PercentCategoriesRef.current.add(alertKey);
        const msg =
          item.spent > item.monthlyLimit
            ? `⚠️ Budget Exceeded: ${item.category} is at ${item.utilizationPercent}% of limit (${formatINR(item.spent)} / ${formatINR(item.monthlyLimit)})`
            : `⚠️ Budget Warning: ${item.category} has reached ${item.utilizationPercent}% of limit (${formatINR(item.spent)} / ${formatINR(item.monthlyLimit)})`;

        setTimeout(() => {
          showToast(msg);
        }, 500);
        break;
      }
    }
  }, [transactions, selectedMonth, categories, isLoading, showToast]);

  // Handlers
  const handleOpenAddTransaction = (dateStr?: string, receiptImage?: string) => {
    setEditingTransaction(null);
    setDefaultTxDate(dateStr);
    setInitialReceiptImageForModal(receiptImage);
    setIsTxModalOpen(true);
  };

  const handleOpenEditTransaction = (tx: MoneyTransaction) => {
    setEditingTransaction(tx);
    setDefaultTxDate(undefined);
    setInitialReceiptImageForModal(undefined);
    setIsTxModalOpen(true);
  };

  const handleSaveTransaction = async (txInput: Omit<MoneyTransaction, 'id'> & { id?: string }) => {
    const saved = await saveTransaction(txInput);
    await loadDatabaseState();
    const txMonth = saved.date.slice(0, 7);
    if (txMonth && txMonth !== selectedMonth) {
      setSelectedMonth(txMonth);
    }
    showToast(
      editingTransaction
        ? `Updated ${saved.type.toLowerCase()} entry (${saved.category})`
        : `Saved ${saved.type.toLowerCase()} entry to ${saved.category}`
    );
  };

  const handleDeleteTransaction = async (id: string) => {
    await deleteTransaction(id);
    await loadDatabaseState();
    showToast('Transaction deleted from IndexedDB ledger.');
  };

  const handleSaveAccount = async (account: MoneyAccount) => {
    await saveAccount(account);
    await loadDatabaseState();
    showToast(`Updated account ${account.name}.`);
  };

  const handleSaveCategory = async (category: MoneyCategory) => {
    await saveCategory(category);
    await loadDatabaseState();
  };

  const handleDeleteCategory = async (id: string) => {
    await deleteCategory(id);
    await loadDatabaseState();
    showToast('Removed custom category.');
  };

  const handleSaveSinkingFund = async (fund: SinkingFund) => {
    await saveSinkingFund(fund);
    await loadDatabaseState();
    showToast(`Saved provision fund: ${fund.name}.`);
  };

  const handleDeleteSinkingFund = async (id: string) => {
    await deleteSinkingFund(id);
    await loadDatabaseState();
    showToast('Removed provision fund.');
  };

  const handleSaveRecurringRule = async (
    ruleInput: Omit<RecurringRule, 'id' | 'generatedCount'> & {
      id?: string;
      generatedCount?: number;
    }
  ) => {
    const saved = await saveRecurringRule(ruleInput);
    await loadDatabaseState();
    showToast(`Saved recurring schedule: ${saved.title} (${saved.frequency}).`);
  };

  const handleDeleteRecurringRule = async (id: string) => {
    await deleteRecurringRule(id);
    await loadDatabaseState();
    showToast('Deleted recurring transaction schedule.');
  };

  const handleTriggerRecurringRuleNow = async (ruleId: string, customDateStr?: string) => {
    const generatedTx = await triggerRecurringRuleNow(ruleId, customDateStr);
    await loadDatabaseState();
    if (generatedTx) {
      const txMonth = generatedTx.date.slice(0, 7);
      if (txMonth && txMonth !== selectedMonth) {
        setSelectedMonth(txMonth);
      }
      showToast(
        `Generated recurring transaction (${generatedTx.category}) on ${generatedTx.date.slice(0, 10)}.`
      );
    }
  };

  const handleProcessDueRulesUpToDate = async (cutoffDateStr: string) => {
    const result = await processDueRecurringRules(cutoffDateStr);
    await loadDatabaseState();
    if (result.generatedTransactions.length > 0) {
      showToast(
        `Auto-generated ${result.generatedTransactions.length} due recurring transaction(s) up to ${cutoffDateStr}.`
      );
    } else {
      showToast(`No recurring schedules were due up to ${cutoffDateStr}.`);
    }
  };

  const handleSyncMonthRecurring = async (yearMonth: string) => {
    const result = await syncRecurringTransactionsForMonth(yearMonth);
    await loadDatabaseState();
    if (result.generatedTransactions.length > 0) {
      showToast(
        `Synced ${result.generatedTransactions.length} recurring transaction(s) into ${yearMonth} feed.`
      );
    }
  };

  const handleSelectAccountInDailyView = (accountId: string) => {
    setSelectedAccountIdForDaily(accountId);
    setActiveTab('daily');
  };

  const handleOpenReceiptLightbox = (images: string[], title: string) => {
    setLightboxState({
      isOpen: true,
      images,
      title,
    });
  };

  const jsonLdSchema = useMemo(
    () => ({
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: 'Money Manager & Multi-Bank Ledger',
      url: MONEY_MANAGER_SEO.canonicalUrl,
      applicationCategory: 'FinanceApplication',
      operatingSystem: 'All',
      description: MONEY_MANAGER_SEO.description,
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'INR',
      },
      author: {
        '@type': 'Person',
        name: 'Jawed Imtiaz',
        url: 'https://jawed.co.in/',
      },
    }),
    []
  );

  return (
    <HelmetProvider>
      <main className="mm-page-shell">
        <Helmet prioritizeSeoTags>
          <title>{MONEY_MANAGER_SEO.title}</title>
          <meta name="description" content={MONEY_MANAGER_SEO.description} />
          <meta name="keywords" content={MONEY_MANAGER_SEO.keywords} />
          <meta name="robots" content="index, follow" />
          <link rel="canonical" href={MONEY_MANAGER_SEO.canonicalUrl} />
          <meta property="og:type" content="website" />
          <meta property="og:site_name" content="Jawed Imtiaz" />
          <meta property="og:title" content={MONEY_MANAGER_SEO.ogTitle} />
          <meta property="og:description" content={MONEY_MANAGER_SEO.ogDescription} />
          <meta property="og:url" content={MONEY_MANAGER_SEO.canonicalUrl} />
          <meta name="twitter:card" content="summary_large_image" />
          <meta name="twitter:title" content={MONEY_MANAGER_SEO.ogTitle} />
          <meta name="twitter:description" content={MONEY_MANAGER_SEO.ogDescription} />
          <script type="application/ld+json">{JSON.stringify(jsonLdSchema)}</script>
        </Helmet>
        <SeoHead
          title={MONEY_MANAGER_SEO.title}
          description={MONEY_MANAGER_SEO.description}
          ogTitle={MONEY_MANAGER_SEO.ogTitle}
          ogDescription={MONEY_MANAGER_SEO.ogDescription}
          canonicalUrl={MONEY_MANAGER_SEO.canonicalUrl}
          ogType="website"
        />
        <div className="mm-container">
        {/* Toast Notification */}
        {toastMessage && (
          <div className="mm-toast" role="status" aria-live="polite">
            <CheckCircle2 size={16} />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* 30-Day Routine Backup Alert Banner */}
        <BackupBanner
          onOpenBackupModal={() => setIsBackupModalOpen(true)}
          onBackupDownloaded={() => showToast('Backup JSON downloaded successfully & timer reset!')}
        />

        {/* Prominent Realbyte-Styled Header */}
        <MoneyManagerHeader
          selectedMonth={selectedMonth}
          onChangeMonth={setSelectedMonth}
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          metrics={monthlyMetrics}
          totalNetWorth={totalNetWorth}
          overBudgetAlertCount={overBudgetAlertCount}
          onOpenAddModal={handleOpenAddTransaction}
          onOpenBackupModal={() => setIsBackupModalOpen(true)}
        />

        {/* Active View Body */}
        <section className="mm-main-stage" aria-busy={isLoading}>
          {activeTab === 'daily' && (
            <DailyView
              selectedMonth={selectedMonth}
              transactions={transactions}
              accounts={accounts}
              categories={categories}
              recurringRules={recurringRules}
              initialAccountFilter={selectedAccountIdForDaily}
              onEditTransaction={handleOpenEditTransaction}
              onDeleteTransaction={handleDeleteTransaction}
              onUpdateTransaction={async (updatedTx) => {
                await saveTransaction(updatedTx);
                await loadDatabaseState();
                showToast(`Updated receipt attachments for ${updatedTx.category}.`);
              }}
              onSaveRecurringRule={handleSaveRecurringRule}
              onSyncMonthRecurring={handleSyncMonthRecurring}
              onOpenReceiptLightbox={handleOpenReceiptLightbox}
              onOpenAddModal={handleOpenAddTransaction}
              onOpenAddModalWithReceipt={(receiptImg) => handleOpenAddTransaction(undefined, receiptImg)}
              onBulkImportComplete={async (imported) => {
                await loadDatabaseState();
                showToast(`Imported ${imported.length} bank transactions into ledger.`);
              }}
            />
          )}

          {activeTab === 'calendar' && (
            <CalendarView
              selectedMonth={selectedMonth}
              transactions={transactions}
              accounts={accounts}
              categories={categories}
              onEditTransaction={handleOpenEditTransaction}
              onDeleteTransaction={handleDeleteTransaction}
              onOpenReceiptLightbox={handleOpenReceiptLightbox}
              onOpenAddModal={handleOpenAddTransaction}
            />
          )}

          {activeTab === 'accounts' && (
            <AccountsView
              accounts={accounts}
              onSaveAccount={handleSaveAccount}
              onSelectAccountInDailyView={handleSelectAccountInDailyView}
            />
          )}

          {activeTab === 'stats' && (
            <StatsView
              selectedMonth={selectedMonth}
              transactions={transactions}
              metrics={monthlyMetrics}
              sinkingFunds={sinkingFunds}
              categories={categories}
              recurringRules={recurringRules}
              accounts={accounts}
              onSaveCategory={handleSaveCategory}
              onDeleteCategory={handleDeleteCategory}
              onSaveSinkingFund={handleSaveSinkingFund}
              onDeleteSinkingFund={handleDeleteSinkingFund}
              onToggleRecurringRule={async (rule) => {
                await handleSaveRecurringRule({
                  ...rule,
                  active: !rule.active,
                });
              }}
              onDeleteRecurringRule={handleDeleteRecurringRule}
              onOpenRecurringScheduler={() => setActiveTab('recurring')}
            />
          )}

          {activeTab === 'recurring' && (
            <RecurringView
              selectedMonth={selectedMonth}
              recurringRules={recurringRules}
              accounts={accounts}
              categories={categories}
              onSaveRule={handleSaveRecurringRule}
              onDeleteRule={handleDeleteRecurringRule}
              onTriggerRuleNow={handleTriggerRecurringRuleNow}
              onProcessDueRules={handleProcessDueRulesUpToDate}
            />
          )}
        </section>

        {/* Bottom Privacy & Double-Entry Architecture Footer Note */}
        <footer className="mm-footer-bar">
          <div className="mm-footer-privacy">
            <Shield size={16} className="mm-text-emerald" />
            <span>
              🔒 <strong>100% Client-Side:</strong> Stored locally in your browser IndexedDB (
              <code>JawedMoneyManagerDB</code>). Zero telemetry, zero external servers.
            </span>
          </div>
          <div className="mm-footer-meta">
            <span>
              <Database size={14} /> {accounts.length} Accounts · {transactions.length} Entries ·{' '}
              {recurringRules.length} Schedules
            </span>
            <span>
              <Sparkles size={14} /> Double-Entry Transfer Isolation Active
            </span>
          </div>
        </footer>
      </div>

      {/* Floating Action Button (+) */}
      <button
        type="button"
        className="mm-fab"
        onClick={() => handleOpenAddTransaction()}
        aria-label="Add new transaction"
        title="Add Income, Expense, or Bank Transfer (+)"
        data-testid="mm-fab-add-btn"
      >
        <Plus size={26} />
        <span className="mm-fab-label">Add Entry</span>
      </button>

      {/* Add / Edit Transaction Modal */}
      <TransactionModal
        isOpen={isTxModalOpen}
        editingTransaction={editingTransaction}
        defaultDate={defaultTxDate}
        accounts={accounts}
        categories={categories}
        transactions={transactions}
        initialReceiptImage={initialReceiptImageForModal}
        onClose={() => {
          setIsTxModalOpen(false);
          setEditingTransaction(null);
          setInitialReceiptImageForModal(undefined);
        }}
        onSave={handleSaveTransaction}
        onSaveRecurringRule={handleSaveRecurringRule}
      />

      {/* Full-Screen Receipt Image Lightbox Modal */}
      <ReceiptLightboxModal
        isOpen={lightboxState.isOpen}
        images={lightboxState.images}
        title={lightboxState.title}
        onClose={() => setLightboxState({ isOpen: false, images: [], title: '' })}
      />

        {/* Backup, Restore & SheetJS Excel Export Modal */}
        <BackupRestoreModal
          isOpen={isBackupModalOpen}
          accounts={accounts}
          categories={categories}
          transactions={transactions}
          sinkingFunds={sinkingFunds}
          selectedMonth={selectedMonth}
          onClose={() => setIsBackupModalOpen(false)}
          onDataRestored={loadDatabaseState}
        />
      </main>
    </HelmetProvider>
  );
};

export default MoneyManager;
