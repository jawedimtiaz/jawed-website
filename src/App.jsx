import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Plus,
  Shield,
  Database,
  Sparkles,
  CheckCircle2,
  ListFilter,
  Calendar,
  Landmark,
  PieChart,
  Download,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import {
  useStoragePersistence,
  initializeAndSeedDatabase,
  calculateMonthlyMetrics,
  saveTransaction,
  deleteTransaction,
  saveAccount,
  saveCategory,
  deleteCategory,
  saveSinkingFund,
  deleteSinkingFund,
  formatINR,
} from './db.js';
import { BackupBanner } from './components/BackupBanner.jsx';
import { DailyView } from './components/DailyView.jsx';
import { CalendarView } from './components/CalendarView.jsx';
import { AccountsView } from './components/AccountsView.jsx';
import { StatsView, evaluateCategoryBudgetAlerts } from './components/StatsView.jsx';
import { TransactionModal } from './components/TransactionModal.jsx';
import { BackupRestoreModal } from './components/money-manager/BackupRestoreModal';
import { ReceiptLightboxModal } from './components/money-manager/ReceiptLightboxModal';

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

function formatMonthLabel(yearMonth) {
  const [yStr, mStr] = String(yearMonth || '2026-11').split('-');
  const year = Number.parseInt(yStr, 10) || 2026;
  const monthIdx = (Number.parseInt(mStr, 10) || 11) - 1;
  return `${year} ${MONTH_NAMES[monthIdx] || 'Nov'}`;
}

function shiftYearMonth(yearMonth, deltaMonths) {
  const [yStr, mStr] = String(yearMonth || '2026-11').split('-');
  const year = Number.parseInt(yStr, 10) || 2026;
  const monthIdx = (Number.parseInt(mStr, 10) || 11) - 1;
  const d = new Date(year, monthIdx + deltaMonths, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function App() {
  // 1. Automatic Storage Persistence hook
  const { isPersisted } = useStoragePersistence();

  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [sinkingFunds, setSinkingFunds] = useState([]);
  const [recurringRules, setRecurringRules] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Default to 2026-11 matching the specification & sample seed entries
  const [selectedMonth, setSelectedMonth] = useState('2026-11');
  const [activeTab, setActiveTab] = useState('daily');
  const [selectedAccountIdForDaily, setSelectedAccountIdForDaily] = useState('ALL');

  // Transaction Modal State
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [defaultTxDate, setDefaultTxDate] = useState(undefined);
  const [initialReceiptImageForModal, setInitialReceiptImageForModal] = useState(undefined);

  // Receipt Lightbox State
  const [lightboxState, setLightboxState] = useState({
    isOpen: false,
    images: [],
    title: '',
  });

  // Backup / Restore Modal State
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);

  // Toast feedback
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = useCallback((msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3200);
  }, []);

  const loadDatabaseState = useCallback(async () => {
    try {
      const todayIso = new Date().toISOString().slice(0, 10);
      const state = await initializeAndSeedDatabase(todayIso);
      setAccounts(state.accounts || []);
      setCategories(state.categories || []);
      setTransactions(state.transactions || []);
      setSinkingFunds(state.sinkingFunds || []);
      setRecurringRules(state.recurringRules || []);
    } catch (err) {
      console.error('Failed to initialize MoneyManagerDB:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDatabaseState();
  }, [loadDatabaseState]);

  // Derived Monthly Metrics (Transfers strictly isolated from Income & Expense totals)
  const monthlyMetrics = useMemo(
    () => calculateMonthlyMetrics(transactions, selectedMonth),
    [transactions, selectedMonth]
  );

  const totalNetWorth = useMemo(
    () => accounts.reduce((sum, acc) => sum + (acc.currentBalance || 0), 0),
    [accounts]
  );

  const overBudgetAlertCount = useMemo(
    () =>
      evaluateCategoryBudgetAlerts(
        transactions,
        selectedMonth,
        categories.length > 0 ? categories : undefined
      ).exceededCategories.length,
    [transactions, selectedMonth, categories]
  );

  // Handlers
  const handleOpenAddTransaction = (dateStr, receiptImage) => {
    setEditingTransaction(null);
    setDefaultTxDate(dateStr);
    setInitialReceiptImageForModal(receiptImage);
    setIsTxModalOpen(true);
  };

  const handleOpenEditTransaction = (tx) => {
    setEditingTransaction(tx);
    setDefaultTxDate(undefined);
    setInitialReceiptImageForModal(undefined);
    setIsTxModalOpen(true);
  };

  const handleSaveTransaction = async (txInput) => {
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

  const handleDeleteTransaction = async (id) => {
    await deleteTransaction(id);
    await loadDatabaseState();
    showToast('Transaction deleted from IndexedDB ledger.');
  };

  const handleSaveAccount = async (account) => {
    await saveAccount(account);
    await loadDatabaseState();
    showToast(`Updated account ${account.name}.`);
  };

  const handleSaveCategory = async (category) => {
    await saveCategory(category);
    await loadDatabaseState();
  };

  const handleDeleteCategory = async (id) => {
    await deleteCategory(id);
    await loadDatabaseState();
    showToast('Removed custom category.');
  };

  const handleSaveSinkingFund = async (fund) => {
    await saveSinkingFund(fund);
    await loadDatabaseState();
    showToast(`Saved provision fund: ${fund.name}.`);
  };

  const handleDeleteSinkingFund = async (id) => {
    await deleteSinkingFund(id);
    await loadDatabaseState();
    showToast('Removed provision fund.');
  };

  const handleSelectAccountInDailyView = (accountId) => {
    setSelectedAccountIdForDaily(accountId);
    setActiveTab('daily');
  };

  const handleOpenReceiptLightbox = (images, title) => {
    setLightboxState({
      isOpen: true,
      images,
      title,
    });
  };

  const tabs = [
    { id: 'daily', label: 'Daily Ledger', icon: <ListFilter size={16} /> },
    { id: 'calendar', label: 'Calendar', icon: <Calendar size={16} /> },
    { id: 'accounts', label: 'Accounts', icon: <Landmark size={16} /> },
    { id: 'stats', label: 'Stats & Budgets', icon: <PieChart size={16} /> },
  ];

  return (
    <div className="mm-page-shell" style={{ minHeight: '100vh', background: 'var(--bg, #0b0f19)' }}>
      <div className="mm-container" style={{ maxWidth: 1140, margin: '0 auto', padding: '16px 20px 80px' }}>
        {/* Toast Notification */}
        {toastMessage && (
          <div className="mm-toast" role="status" aria-live="polite">
            <CheckCircle2 size={16} />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* 30-Day Backup Alert Banner */}
        <BackupBanner
          onOpenBackupModal={() => setIsBackupModalOpen(true)}
          onBackupDownloaded={() => showToast('Backup JSON successfully downloaded & timer reset!')}
        />

        {/* Top Header Card */}
        <header className="mm-header-card">
          <div className="mm-top-bar">
            <div className="mm-privacy-banner" role="status">
              <Shield size={15} className="mm-privacy-icon" />
              <span>
                🔒 <strong>100% Client-Side:</strong> Stored locally in IndexedDB (<code>MoneyManagerDB</code>). Zero server costs.
              </span>
            </div>

            <div className="mm-top-actions">
              <button
                type="button"
                onClick={() => setIsBackupModalOpen(true)}
                className="mm-btn mm-btn-secondary"
                data-testid="mm-open-backup-btn"
              >
                <Download size={15} />
                <span>Backup / Excel (.xlsx)</span>
              </button>
            </div>
          </div>

          {/* Month Selector Bar (< 2026 Nov >) */}
          <div className="mm-month-bar">
            <button
              type="button"
              onClick={() => setSelectedMonth((m) => shiftYearMonth(m, -1))}
              className="mm-month-nav-btn"
              aria-label="Previous month"
            >
              <ChevronLeft size={18} />
            </button>

            <span className="mm-month-label" data-testid="mm-current-month-label">
              &lt; {formatMonthLabel(selectedMonth)} &gt;
            </span>

            <button
              type="button"
              onClick={() => setSelectedMonth((m) => shiftYearMonth(m, 1))}
              className="mm-month-nav-btn"
              aria-label="Next month"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Top Monthly Metrics Banner */}
          <div className="mm-metrics-row" data-testid="mm-metrics-row">
            <div className="mm-metric-card mm-metric-income">
              <span className="mm-metric-label">Total Income</span>
              <strong className="mm-metric-val mm-text-income" data-testid="mm-metric-income-val">
                {formatINR(monthlyMetrics.income)}
              </strong>
            </div>

            <div className="mm-metric-card mm-metric-expense">
              <span className="mm-metric-label">Total Expenses</span>
              <strong className="mm-metric-val mm-text-expense" data-testid="mm-metric-expense-val">
                {formatINR(monthlyMetrics.expense)}
              </strong>
            </div>

            <div className="mm-metric-card mm-metric-net">
              <span className="mm-metric-label">Net Balance</span>
              <strong
                className={`mm-metric-val ${
                  monthlyMetrics.netBalance >= 0 ? 'mm-text-net-positive' : 'mm-text-expense'
                }`}
                data-testid="mm-metric-net-val"
              >
                {formatINR(monthlyMetrics.netBalance, true)}
              </strong>
            </div>
          </div>

          {/* 4 Core Tabs Navigation matching Money Manager App */}
          <nav className="mm-tabs-nav" aria-label="Core Ledger Views">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`mm-tab-btn ${activeTab === tab.id ? 'is-active' : ''}`}
                data-testid={`mm-tab-${tab.id}`}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {tab.id === 'stats' && overBudgetAlertCount > 0 && (
                  <span className="mm-tab-badge is-danger">{overBudgetAlertCount}</span>
                )}
              </button>
            ))}
          </nav>
        </header>

        {/* Active Tab View Body */}
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
              onOpenReceiptLightbox={handleOpenReceiptLightbox}
              onOpenAddModal={handleOpenAddTransaction}
              onOpenAddModalWithReceipt={(receiptImg) => handleOpenAddTransaction(undefined, receiptImg)}
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
            />
          )}
        </section>

        {/* Footer info */}
        <footer className="mm-footer-bar" style={{ marginTop: 24 }}>
          <div className="mm-footer-privacy">
            <Shield size={16} className="mm-text-emerald" />
            <span>
              🔒 <strong>100% Client-Side:</strong> Stored locally in your browser IndexedDB (
              <code>MoneyManagerDB</code>). Zero telemetry, zero external servers.
            </span>
          </div>
          <div className="mm-footer-meta">
            <span>
              <Database size={14} /> {accounts.length} Accounts · {transactions.length} Entries ·{' '}
              {isPersisted ? 'Storage Persisted ✓' : 'IndexedDB Storage Active'}
            </span>
            <span>
              <Sparkles size={14} /> Double-Entry Accounting Engine Active
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
      />

      {/* Full-Screen Receipt Lightbox Modal */}
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
    </div>
  );
}

export default App;
