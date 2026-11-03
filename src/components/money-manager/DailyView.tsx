import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Search,
  Image as ImageIcon,
  AlertTriangle,
  ArrowRight,
  Pencil,
  Trash2,
  RotateCcw,
  Plus,
  X,
  LayoutGrid,
  ListFilter,
  Eye,
  Upload,
  Sparkles,
} from 'lucide-react';
import {
  formatINR,
  SAMPLE_RECEIPT_DATA_URL,
  saveTransaction as dbSaveTransaction,
  removeReceiptFromTransaction as dbRemoveReceiptFromTransaction,
  attachReceiptToTransaction as dbAttachReceiptToTransaction,
  type AccountSummary,
  type MoneyCategory,
  type MoneyTransaction,
} from '../../db/db';
import { renderCategoryIcon } from './categoryIcons';

export type DailySubView = 'feed' | 'gallery';

export interface ReceiptGalleryItem {
  id: string;
  transactionId: string;
  receiptIndex: number;
  totalReceiptsOnTx: number;
  imageUrl: string;
  date: string;
  dateKey: string;
  type: MoneyTransaction['type'];
  amount: number;
  category: string;
  subCategory: string;
  note: string;
  accountId: string;
  accountName: string;
  fixedOrVariable: 'Fixed' | 'Variable';
  transaction: MoneyTransaction;
}

export interface DailyViewProps {
  selectedMonth: string;
  transactions: MoneyTransaction[];
  accounts: AccountSummary[];
  categories: MoneyCategory[];
  initialAccountFilter?: string;
  onEditTransaction: (tx: MoneyTransaction) => void;
  onDeleteTransaction: (txId: string) => void;
  onUpdateTransaction?: (tx: MoneyTransaction) => Promise<void>;
  onOpenReceiptLightbox: (images: string[], title: string) => void;
  onOpenAddModal: (defaultDate?: string) => void;
}

export interface DailyFilterCriteria {
  selectedMonth: string;
  searchQuery?: string;
  accountFilter?: string;
  categoryFilter?: string;
  typeFilter?: string;
  natureFilter?: string;
  accountNameMap?: Map<string, string>;
}

export interface ReceiptGalleryFilterCriteria {
  selectedMonth?: string;
  includeAllMonths?: boolean;
  searchQuery?: string;
  accountFilter?: string;
  categoryFilter?: string;
  typeFilter?: string;
  accountNameMap?: Map<string, string>;
}

interface DayGroup {
  dateKey: string; // YYYY-MM-DD
  dayNumber: string;
  weekdayLabel: string;
  monthYearLabel: string;
  dailyIncome: number;
  dailyExpense: number;
  items: MoneyTransaction[];
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function formatDayHeaderParts(dateKey: string) {
  const [y, m, d] = dateKey.split('-').map((n) => Number.parseInt(n, 10));
  const dateObj = new Date(y || 2026, (m || 11) - 1, d || 1);
  return {
    dayNumber: String(d || 1).padStart(2, '0'),
    weekdayLabel: WEEKDAYS[dateObj.getDay()] || 'Monday',
    monthYearLabel: `${SHORT_MONTHS[(m || 11) - 1] || 'Nov'} ${y || 2026}`,
  };
}

/**
 * Pure helper that filters transactions by month, note text / category name search query,
 * bank account, category dropdown, transaction type, and fixed/variable nature.
 */
export function filterDailyTransactions(
  transactions: MoneyTransaction[],
  criteria: DailyFilterCriteria
): MoneyTransaction[] {
  const {
    selectedMonth,
    searchQuery = '',
    accountFilter = 'ALL',
    categoryFilter = 'ALL',
    typeFilter = 'ALL',
    natureFilter = 'ALL',
    accountNameMap,
  } = criteria;

  const q = searchQuery.trim().toLowerCase();

  return transactions.filter((tx) => {
    if (selectedMonth && !tx.date?.startsWith(selectedMonth)) return false;

    if (accountFilter !== 'ALL') {
      const matchesSource = tx.accountId === accountFilter;
      const matchesTarget = tx.type === 'Transfer' && tx.toAccountId === accountFilter;
      if (!matchesSource && !matchesTarget) return false;
    }

    if (categoryFilter !== 'ALL' && tx.category !== categoryFilter) {
      return false;
    }

    if (typeFilter !== 'ALL' && tx.type !== typeFilter) {
      return false;
    }

    if (natureFilter === 'Fixed' && tx.fixedOrVariable !== 'Fixed') {
      return false;
    }
    if (natureFilter === 'Variable' && tx.fixedOrVariable !== 'Variable') {
      return false;
    }
    if (natureFilter === 'ANOMALY' && !tx.isAnomaly) {
      return false;
    }

    if (q) {
      const accountLabel = accountNameMap?.get(tx.accountId) || tx.accountId || '';
      const targetAccountLabel = tx.toAccountId
        ? accountNameMap?.get(tx.toAccountId) || tx.toAccountId
        : '';
      const haystack = `${tx.category || ''} ${tx.subCategory || ''} ${tx.note || ''} ${accountLabel} ${targetAccountLabel}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }

    return true;
  });
}

/**
 * Pure helper that aggregates all attached transaction receipts into a searchable list
 * of ReceiptGalleryItem objects, sorted newest first.
 */
export function aggregateTransactionReceipts(
  transactions: MoneyTransaction[],
  criteria: ReceiptGalleryFilterCriteria = {}
): ReceiptGalleryItem[] {
  const {
    selectedMonth = '',
    includeAllMonths = false,
    searchQuery = '',
    accountFilter = 'ALL',
    categoryFilter = 'ALL',
    typeFilter = 'ALL',
    accountNameMap,
  } = criteria;

  const q = searchQuery.trim().toLowerCase();
  const sortedTxs = [...transactions].sort((a, b) => b.date.localeCompare(a.date));
  const items: ReceiptGalleryItem[] = [];

  for (const tx of sortedTxs) {
    if (!Array.isArray(tx.receiptImages) || tx.receiptImages.length === 0) continue;

    if (!includeAllMonths && selectedMonth && !tx.date?.startsWith(selectedMonth)) {
      continue;
    }

    if (accountFilter !== 'ALL') {
      const matchesSource = tx.accountId === accountFilter;
      const matchesTarget = tx.type === 'Transfer' && tx.toAccountId === accountFilter;
      if (!matchesSource && !matchesTarget) continue;
    }

    if (categoryFilter !== 'ALL' && tx.category !== categoryFilter) {
      continue;
    }

    if (typeFilter !== 'ALL' && tx.type !== typeFilter) {
      continue;
    }

    const accountName = accountNameMap?.get(tx.accountId) || tx.accountId || '';
    const dateKey = String(tx.date || '').slice(0, 10);

    if (q) {
      const haystack = `${tx.category || ''} ${tx.subCategory || ''} ${tx.note || ''} ${accountName} ${dateKey} ${tx.amount}`.toLowerCase();
      if (!haystack.includes(q)) continue;
    }

    tx.receiptImages.forEach((imgUrl, idx) => {
      if (!imgUrl) return;
      items.push({
        id: `${tx.id}-rcpt-${idx}`,
        transactionId: tx.id,
        receiptIndex: idx,
        totalReceiptsOnTx: tx.receiptImages.length,
        imageUrl: imgUrl,
        date: tx.date,
        dateKey,
        type: tx.type,
        amount: tx.amount,
        category: tx.category,
        subCategory: tx.subCategory,
        note: tx.note,
        accountId: tx.accountId,
        accountName,
        fixedOrVariable: tx.fixedOrVariable,
        transaction: tx,
      });
    });
  }

  return items;
}

function highlightMatch(text: string, query: string): React.ReactNode {
  const cleanQuery = query.trim();
  if (!cleanQuery || !text) return text;

  const lowerText = text.toLowerCase();
  const lowerQuery = cleanQuery.toLowerCase();
  const matchIdx = lowerText.indexOf(lowerQuery);
  if (matchIdx === -1) return text;

  const before = text.slice(0, matchIdx);
  const match = text.slice(matchIdx, matchIdx + cleanQuery.length);
  const after = text.slice(matchIdx + cleanQuery.length);

  return (
    <>
      {before}
      <mark className="search-highlight">{match}</mark>
      {after}
    </>
  );
}

export const DailyView: React.FC<DailyViewProps> = ({
  selectedMonth,
  transactions,
  accounts,
  categories,
  initialAccountFilter = 'ALL',
  onEditTransaction,
  onDeleteTransaction,
  onUpdateTransaction,
  onOpenReceiptLightbox,
  onOpenAddModal,
}) => {
  const [dailySubView, setDailySubView] = useState<DailySubView>('feed');
  const [includeAllMonthsInGallery, setIncludeAllMonthsInGallery] = useState<boolean>(false);
  const [localTransactions, setLocalTransactions] = useState<MoneyTransaction[]>(transactions);
  const [accountFilter, setAccountFilter] = useState<string>(initialAccountFilter);
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [natureFilter, setNatureFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedTxIdForAttach, setSelectedTxIdForAttach] = useState<string>('');
  const receiptUploadInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setLocalTransactions(transactions);
  }, [transactions]);

  useEffect(() => {
    setAccountFilter(initialAccountFilter);
  }, [initialAccountFilter]);

  const accountNameMap = useMemo(() => {
    return new Map(accounts.map((acc) => [acc.id, acc.name]));
  }, [accounts]);

  const categoryIconMap = useMemo(() => {
    return new Map(categories.map((cat) => [cat.name, cat.iconName]));
  }, [categories]);

  const monthTransactions = useMemo(
    () => localTransactions.filter((tx) => tx.date?.startsWith(selectedMonth)),
    [localTransactions, selectedMonth]
  );

  const monthTransactionsCount = monthTransactions.length;

  useEffect(() => {
    if (!selectedTxIdForAttach && monthTransactions.length > 0) {
      setSelectedTxIdForAttach(monthTransactions[0].id);
    }
  }, [monthTransactions, selectedTxIdForAttach]);

  const filteredTransactions = useMemo(
    () =>
      filterDailyTransactions(localTransactions, {
        selectedMonth,
        searchQuery,
        accountFilter,
        categoryFilter,
        typeFilter,
        natureFilter,
        accountNameMap,
      }),
    [
      localTransactions,
      selectedMonth,
      searchQuery,
      accountFilter,
      categoryFilter,
      typeFilter,
      natureFilter,
      accountNameMap,
    ]
  );

  const receiptGalleryItems = useMemo(
    () =>
      aggregateTransactionReceipts(localTransactions, {
        selectedMonth,
        includeAllMonths: includeAllMonthsInGallery,
        searchQuery,
        accountFilter,
        categoryFilter,
        typeFilter,
        accountNameMap,
      }),
    [
      localTransactions,
      selectedMonth,
      includeAllMonthsInGallery,
      searchQuery,
      accountFilter,
      categoryFilter,
      typeFilter,
      accountNameMap,
    ]
  );

  const totalMonthReceiptsCount = useMemo(
    () =>
      aggregateTransactionReceipts(localTransactions, {
        selectedMonth,
        includeAllMonths: false,
        accountNameMap,
      }).length,
    [localTransactions, selectedMonth, accountNameMap]
  );

  const totalAllReceiptsCount = useMemo(
    () =>
      aggregateTransactionReceipts(localTransactions, {
        includeAllMonths: true,
        accountNameMap,
      }).length,
    [localTransactions, accountNameMap]
  );

  const handleDeleteReceiptImage = async (transactionId: string, receiptIndex: number) => {
    const targetTx = localTransactions.find((tx) => tx.id === transactionId);
    if (!targetTx) return;

    const updatedReceipts = (targetTx.receiptImages || []).filter(
      (_, idx) => idx !== receiptIndex
    );
    const updatedTx: MoneyTransaction = {
      ...targetTx,
      receiptImages: updatedReceipts,
    };

    setLocalTransactions((prev) =>
      prev.map((tx) => (tx.id === transactionId ? updatedTx : tx))
    );

    if (onUpdateTransaction) {
      await onUpdateTransaction(updatedTx);
    } else {
      await dbRemoveReceiptFromTransaction(transactionId, receiptIndex);
    }
  };

  const handleAttachReceiptDataUrl = async (transactionId: string, dataUrl: string) => {
    const targetTx = localTransactions.find((tx) => tx.id === transactionId);
    if (!targetTx || !dataUrl) return;

    const updatedTx: MoneyTransaction = {
      ...targetTx,
      receiptImages: [...(targetTx.receiptImages || []), dataUrl],
    };

    setLocalTransactions((prev) =>
      prev.map((tx) => (tx.id === transactionId ? updatedTx : tx))
    );

    if (onUpdateTransaction) {
      await onUpdateTransaction(updatedTx);
    } else {
      await dbAttachReceiptToTransaction(transactionId, dataUrl);
      await dbSaveTransaction(updatedTx);
    }
  };

  const handleReceiptFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const targetId = selectedTxIdForAttach || monthTransactions[0]?.id || localTransactions[0]?.id;
    if (!file || !targetId) return;

    const reader = new FileReader();
    reader.onload = async () => {
      if (typeof reader.result === 'string') {
        await handleAttachReceiptDataUrl(targetId, reader.result);
      }
    };
    reader.readAsDataURL(file);
    if (receiptUploadInputRef.current) {
      receiptUploadInputRef.current.value = '';
    }
  };

  const filteredTotals = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const tx of filteredTransactions) {
      if (tx.type === 'Income') income += tx.amount;
      if (tx.type === 'Expense') expense += tx.amount;
    }
    return { income, expense };
  }, [filteredTransactions]);

  const dayGroups = useMemo<DayGroup[]>(() => {
    const groupsMap = new Map<string, MoneyTransaction[]>();
    for (const tx of filteredTransactions) {
      const dateKey = tx.date.slice(0, 10);
      const list = groupsMap.get(dateKey) || [];
      list.push(tx);
      groupsMap.set(dateKey, list);
    }

    const sortedDates = [...groupsMap.keys()].sort((a, b) => b.localeCompare(a));

    return sortedDates.map((dateKey) => {
      const items = groupsMap.get(dateKey) || [];
      let dailyIncome = 0;
      let dailyExpense = 0;

      for (const tx of items) {
        if (tx.type === 'Income') dailyIncome += tx.amount;
        if (tx.type === 'Expense') dailyExpense += tx.amount;
      }

      const parts = formatDayHeaderParts(dateKey);

      return {
        dateKey,
        ...parts,
        dailyIncome,
        dailyExpense,
        items,
      };
    });
  }, [filteredTransactions]);

  const hasActiveFilters =
    accountFilter !== 'ALL' ||
    categoryFilter !== 'ALL' ||
    typeFilter !== 'ALL' ||
    natureFilter !== 'ALL' ||
    searchQuery.trim() !== '';

  const resetFilters = () => {
    setAccountFilter('ALL');
    setCategoryFilter('ALL');
    setTypeFilter('ALL');
    setNatureFilter('ALL');
    setSearchQuery('');
  };

  return (
    <section className="mm-view-section" aria-label="Daily Ledger View">
      {/* Daily Feed vs Receipt Gallery View Switcher Bar */}
      <div
        className="mm-filter-bar"
        data-testid="mm-daily-mode-bar"
        style={{ padding: '12px 16px' }}
      >
        <div className="mm-stat-panel-header" style={{ width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <ListFilter size={17} style={{ color: 'var(--accent)' }} />
            <strong>Daily Ledger &amp; Receipt Vault</strong>
            <span className="mm-stat-panel-sub" style={{ margin: 0 }}>
              ({monthTransactionsCount} entries in {selectedMonth} · {totalMonthReceiptsCount}{' '}
              {totalMonthReceiptsCount === 1 ? 'receipt' : 'receipts'} attached)
            </span>
          </div>

          <div
            role="group"
            aria-label="Switch between Daily Feed and Receipt Gallery"
            style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}
          >
            <button
              type="button"
              onClick={() => setDailySubView('feed')}
              className={`mm-btn mm-btn-sm ${
                dailySubView === 'feed' ? 'mm-btn-primary' : 'mm-btn-secondary'
              }`}
              data-testid="mm-daily-mode-feed-btn"
            >
              <ListFilter size={14} />
              <span>Daily Transactions ({filteredTransactions.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setDailySubView('gallery')}
              className={`mm-btn mm-btn-sm ${
                dailySubView === 'gallery' ? 'mm-btn-primary' : 'mm-btn-secondary'
              }`}
              data-testid="mm-daily-mode-gallery-btn"
            >
              <LayoutGrid size={14} />
              <span>
                Receipt Gallery (
                {includeAllMonthsInGallery ? totalAllReceiptsCount : totalMonthReceiptsCount})
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Multi-Facet Search & Filter Bar */}
      <div className="mm-filter-bar">
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: '10px',
            width: '100%',
          }}
        >
          <div className="mm-search-input-wrap" style={{ position: 'relative', flex: '1 1 260px' }}>
            <Search size={15} className="mm-search-icon" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Instant filter by note text, category, or sub-category..."
              className="mm-filter-input"
              style={{ paddingRight: searchQuery ? '34px' : '12px' }}
              aria-label="Search transactions by note or category"
              data-testid="mm-daily-search-input"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="mm-filter-clear-icon"
                aria-label="Clear search query"
                title="Clear search"
                data-testid="mm-daily-search-clear-btn"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <select
            value={accountFilter}
            onChange={(e) => setAccountFilter(e.target.value)}
            className="mm-filter-select"
            aria-label="Filter by Bank or Account"
            data-testid="mm-filter-account"
          >
            <option value="ALL">All Accounts &amp; Banks</option>
            {accounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.name} ({acc.type})
              </option>
            ))}
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="mm-filter-select"
            aria-label="Filter by Category"
            data-testid="mm-filter-category"
          >
            <option value="ALL">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.name}>
                {cat.name}
              </option>
            ))}
            <option value="Transfer">Transfer</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="mm-filter-select"
            aria-label="Filter by Transaction Type"
            data-testid="mm-filter-type"
          >
            <option value="ALL">All Types</option>
            <option value="Expense">Expense</option>
            <option value="Income">Income</option>
            <option value="Transfer">Transfer</option>
          </select>

          <select
            value={natureFilter}
            onChange={(e) => setNatureFilter(e.target.value)}
            className="mm-filter-select"
            aria-label="Filter by Fixed or Variable"
            data-testid="mm-filter-nature"
          >
            <option value="ALL">Fixed &amp; Variable</option>
            <option value="Fixed">Fixed Only</option>
            <option value="Variable">Variable Only</option>
            <option value="ANOMALY">⚠️ Anomalies Only</option>
          </select>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="mm-btn mm-btn-ghost"
              title="Reset all filters"
              data-testid="mm-reset-filters-btn"
            >
              <RotateCcw size={14} />
              <span>Reset</span>
            </button>
          )}
        </div>

        {/* Instant Search / Filter Summary Strip */}
        <div className="mm-filter-summary-strip" data-testid="mm-daily-filter-summary">
          <span>
            Showing <strong>{filteredTransactions.length}</strong> of{' '}
            <strong>{monthTransactionsCount}</strong> entries in {selectedMonth}
            {searchQuery.trim() ? (
              <>
                {' '}
                matching <strong>&ldquo;{searchQuery.trim()}&rdquo;</strong>
              </>
            ) : null}
          </span>

          <div className="mm-filter-pills">
            <span className="mm-pill mm-pill-income">
              Filtered Income: +{formatINR(filteredTotals.income)}
            </span>
            <span className="mm-pill mm-pill-expense">
              Filtered Expense: -{formatINR(filteredTotals.expense)}
            </span>
          </div>
        </div>
      </div>

      {/* Receipt Gallery View vs Grouped Daily Transaction Feed */}
      {dailySubView === 'gallery' ? (
        <article
          className="mm-stat-panel"
          data-testid="mm-receipt-gallery-view"
          style={{ marginTop: 4 }}
        >
          <div className="mm-stat-panel-header">
            <div>
              <h2 className="mm-stat-panel-title">
                <ImageIcon
                  size={18}
                  style={{
                    verticalAlign: 'middle',
                    marginRight: 8,
                    color: 'var(--accent)',
                  }}
                />
                Receipt Gallery &amp; Attachment Manager
              </h2>
              <p className="mm-section-desc" style={{ margin: '4px 0 0' }}>
                Search, inspect, attach, and delete transaction receipt images stored locally in IndexedDB
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setIncludeAllMonthsInGallery((prev) => !prev)}
                className="mm-btn mm-btn-sm mm-btn-secondary"
                data-testid="mm-receipt-scope-toggle-btn"
              >
                {includeAllMonthsInGallery
                  ? `Showing All Months (${totalAllReceiptsCount})`
                  : `Showing ${selectedMonth} Only (${totalMonthReceiptsCount})`}
              </button>
            </div>
          </div>

          {/* Quick Attach Receipt to Transaction Bar */}
          <div
            className="mm-inline-form-card"
            data-testid="mm-receipt-quick-attach-bar"
            style={{
              marginBottom: 14,
              display: 'flex',
              alignItems: 'flex-end',
              gap: 10,
              flexWrap: 'wrap',
            }}
          >
            <div className="mm-field" style={{ flex: '1 1 260px' }}>
              <label htmlFor="mm-receipt-attach-tx-select">
                Attach Receipt Image to Transaction Entry
              </label>
              <select
                id="mm-receipt-attach-tx-select"
                value={selectedTxIdForAttach}
                onChange={(e) => setSelectedTxIdForAttach(e.target.value)}
                className="mm-select"
                data-testid="mm-receipt-attach-tx-select"
              >
                {(includeAllMonthsInGallery ? localTransactions : monthTransactions).map((tx) => (
                  <option key={tx.id} value={tx.id}>
                    {tx.date.slice(0, 10)} · {tx.category} ({formatINR(tx.amount)}) —{' '}
                    {(tx.receiptImages || []).length} receipt(s)
                  </option>
                ))}
              </select>
            </div>

            <input
              ref={receiptUploadInputRef}
              type="file"
              accept="image/*"
              onChange={handleReceiptFileSelected}
              className="mm-sr-only"
              data-testid="mm-receipt-file-input"
            />

            <button
              type="button"
              onClick={() => receiptUploadInputRef.current?.click()}
              className="mm-btn mm-btn-primary mm-btn-sm"
              data-testid="mm-receipt-attach-upload-btn"
            >
              <Upload size={14} />
              <span>Upload Receipt Image</span>
            </button>

            <button
              type="button"
              onClick={() => {
                const targetId =
                  selectedTxIdForAttach || monthTransactions[0]?.id || localTransactions[0]?.id;
                if (targetId) {
                  handleAttachReceiptDataUrl(targetId, SAMPLE_RECEIPT_DATA_URL);
                }
              }}
              className="mm-btn mm-btn-secondary mm-btn-sm"
              data-testid="mm-receipt-attach-sample-btn"
            >
              <Sparkles size={14} />
              <span>Attach Sample Receipt</span>
            </button>
          </div>

          {receiptGalleryItems.length === 0 ? (
            <div className="mm-empty-state" data-testid="mm-receipt-gallery-empty">
              <ImageIcon size={28} />
              <p className="mm-empty-title" style={{ margin: '8px 0 4px' }}>
                No attached receipts match your current search or filters.
              </p>
              <p className="mm-empty-subtitle">
                Upload a receipt image above, attach a sample receipt, or clear your search filter.
              </p>
            </div>
          ) : (
            <div
              className="mm-receipt-gallery-grid"
              data-testid="mm-receipt-gallery-grid"
            >
              {receiptGalleryItems.map((item) => (
                <div
                  key={item.id}
                  className="mm-receipt-gallery-card"
                  data-testid={`mm-receipt-card-${item.transactionId}-${item.receiptIndex}`}
                >
                  <button
                    type="button"
                    className="mm-receipt-thumb-btn"
                    onClick={() =>
                      onOpenReceiptLightbox(
                        item.transaction.receiptImages,
                        `${item.category} (${formatINR(item.amount)}) — ${item.dateKey}`
                      )
                    }
                    title="Click to inspect full-size receipt"
                    data-testid={`mm-receipt-thumb-${item.transactionId}-${item.receiptIndex}`}
                  >
                    <img
                      src={item.imageUrl}
                      alt={`Receipt for ${item.category} on ${item.dateKey}`}
                      className="mm-receipt-thumb-img"
                    />
                    <span className="mm-receipt-thumb-badge">
                      Receipt #{item.receiptIndex + 1} of {item.totalReceiptsOnTx}
                    </span>
                  </button>

                  <div className="mm-receipt-card-body">
                    <div className="mm-receipt-card-top">
                      <div>
                        <strong className="mm-receipt-card-category">
                          {highlightMatch(item.category, searchQuery)}
                        </strong>
                        {item.subCategory && (
                          <span className="mm-receipt-card-subcat">
                            {' '}
                            · {highlightMatch(item.subCategory, searchQuery)}
                          </span>
                        )}
                      </div>
                      <strong
                        className={`mm-receipt-card-amount ${
                          item.type === 'Income'
                            ? 'mm-text-income'
                            : item.type === 'Expense'
                            ? 'mm-text-expense'
                            : 'mm-text-transfer'
                        }`}
                      >
                        {formatINR(item.amount)}
                      </strong>
                    </div>

                    <p className="mm-receipt-card-note">
                      {item.note ? highlightMatch(item.note, searchQuery) : 'No memo attached'}
                    </p>

                    <div className="mm-receipt-card-meta">
                      <span className="mm-tx-account-name">{item.accountName}</span>
                      <span>·</span>
                      <span>{item.dateKey}</span>
                      <span>·</span>
                      <span>{item.fixedOrVariable}</span>
                    </div>

                    <div className="mm-receipt-card-actions">
                      <button
                        type="button"
                        onClick={() =>
                          onOpenReceiptLightbox(
                            item.transaction.receiptImages,
                            `${item.category} (${formatINR(item.amount)}) — ${item.dateKey}`
                          )
                        }
                        className="mm-btn mm-btn-sm mm-btn-secondary"
                        data-testid={`mm-receipt-view-btn-${item.transactionId}-${item.receiptIndex}`}
                      >
                        <Eye size={13} />
                        <span>View</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onEditTransaction(item.transaction)}
                        className="mm-btn mm-btn-sm mm-btn-secondary"
                        title="Manage transaction & receipts"
                        data-testid={`mm-receipt-edit-tx-btn-${item.transactionId}-${item.receiptIndex}`}
                      >
                        <Pencil size={13} />
                        <span>Manage</span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          handleDeleteReceiptImage(item.transactionId, item.receiptIndex)
                        }
                        className="mm-icon-action-btn is-danger"
                        title="Delete this receipt image"
                        aria-label={`Delete receipt #${item.receiptIndex + 1} for ${item.category}`}
                        data-testid={`mm-receipt-delete-btn-${item.transactionId}-${item.receiptIndex}`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </article>
      ) : dayGroups.length === 0 ? (
        <div className="mm-empty-state" data-testid="mm-daily-empty">
          <p className="mm-empty-title">No transactions match the current month or filters.</p>
          <p className="mm-empty-subtitle">
            Add a new income, expense, or bank transfer entry, or clear your active filters.
          </p>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '14px' }}>
            {hasActiveFilters && (
              <button type="button" onClick={resetFilters} className="mm-btn mm-btn-secondary">
                Clear Filters
              </button>
            )}
            <button
              type="button"
              onClick={() => onOpenAddModal(`${selectedMonth}-01`)}
              className="mm-btn mm-btn-primary"
            >
              <Plus size={15} />
              <span>Record Transaction</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="mm-day-groups-list" data-testid="mm-day-groups-list">
          {dayGroups.map((group) => (
            <article key={group.dateKey} className="mm-day-card">
              {/* Realbyte Day Header Bar */}
              <div className="mm-day-header">
                <div className="mm-day-date-cluster">
                  <span className="mm-day-number">{group.dayNumber}</span>
                  <div>
                    <strong className="mm-day-weekday">{group.weekdayLabel}</strong>
                    <span className="mm-day-month-year"> · {group.monthYearLabel}</span>
                  </div>
                </div>

                <div className="mm-day-totals">
                  <span className="mm-day-income" title="Daily Income">
                    +{formatINR(group.dailyIncome)}
                  </span>
                  <span className="mm-day-expense" title="Daily Expense">
                    -{formatINR(group.dailyExpense)}
                  </span>
                </div>
              </div>

              {/* Day Transactions List */}
              <div className="mm-tx-list">
                {group.items.map((tx) => {
                  const sourceAccount = accountNameMap.get(tx.accountId) || tx.accountId;
                  const targetAccount = tx.toAccountId
                    ? accountNameMap.get(tx.toAccountId) || tx.toAccountId
                    : '';
                  const timePart = tx.date.includes('T') ? tx.date.split('T')[1]?.slice(0, 5) : '';
                  const iconName =
                    tx.type === 'Transfer' ? 'ArrowLeftRight' : categoryIconMap.get(tx.category);
                  const hasReceipts = Array.isArray(tx.receiptImages) && tx.receiptImages.length > 0;
                  const categoryLabel = tx.type === 'Transfer' ? 'Self Transfer' : tx.category;

                  return (
                    <div key={tx.id} className="mm-tx-row" data-testid={`mm-tx-row-${tx.id}`}>
                      {/* Left: Category Icon + Details */}
                      <div className="mm-tx-main">
                        <div className={`mm-tx-icon-box is-${tx.type.toLowerCase()}`}>
                          {renderCategoryIcon(iconName, 18)}
                        </div>

                        <div className="mm-tx-info">
                          <div className="mm-tx-title-line">
                            <strong className="mm-tx-category">
                              {highlightMatch(categoryLabel, searchQuery)}
                            </strong>
                            {tx.subCategory && (
                              <span className="mm-tx-subcategory">
                                · {highlightMatch(tx.subCategory, searchQuery)}
                              </span>
                            )}
                            <span className="mm-tx-meta-sep">·</span>
                            <span className="mm-tx-nature">{tx.fixedOrVariable}</span>
                            {tx.isAnomaly && (
                              <span
                                className="mm-tx-anomaly-flag"
                                title="Unbudgeted spike / anomaly flagged"
                              >
                                <AlertTriangle size={12} />
                                <span>Spike</span>
                              </span>
                            )}
                          </div>

                          <p className="mm-tx-note">
                            {tx.note
                              ? highlightMatch(tx.note, searchQuery)
                              : 'No memo attached'}
                          </p>

                          <div className="mm-tx-submeta">
                            {tx.type === 'Transfer' ? (
                              <span className="mm-tx-account-route">
                                <strong>{sourceAccount}</strong>
                                <ArrowRight size={12} />
                                <strong>{targetAccount}</strong>
                              </span>
                            ) : (
                              <span className="mm-tx-account-name">{sourceAccount}</span>
                            )}
                            {timePart && (
                              <>
                                <span>·</span>
                                <span>{timePart}</span>
                              </>
                            )}
                            {hasReceipts && (
                              <button
                                type="button"
                                onClick={() =>
                                  onOpenReceiptLightbox(
                                    tx.receiptImages,
                                    `${tx.category} (${formatINR(tx.amount)}) — ${group.dateKey}`
                                  )
                                }
                                className="mm-receipt-trigger-btn"
                                title="View attached receipt photo(s)"
                                data-testid={`mm-receipt-btn-${tx.id}`}
                              >
                                <ImageIcon size={13} />
                                <span>
                                  {tx.receiptImages.length}{' '}
                                  {tx.receiptImages.length === 1 ? 'Receipt' : 'Receipts'}
                                </span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Amount + Row Actions */}
                      <div className="mm-tx-right">
                        <strong
                          className={`mm-tx-amount ${
                            tx.type === 'Income'
                              ? 'mm-text-income'
                              : tx.type === 'Expense'
                              ? 'mm-text-expense'
                              : 'mm-text-transfer'
                          }`}
                        >
                          {tx.type === 'Income'
                            ? `+${formatINR(tx.amount)}`
                            : tx.type === 'Expense'
                            ? `-${formatINR(tx.amount)}`
                            : formatINR(tx.amount)}
                        </strong>

                        <div className="mm-tx-actions">
                          <button
                            type="button"
                            onClick={() => onEditTransaction(tx)}
                            className="mm-icon-action-btn"
                            title="Edit transaction"
                            aria-label={`Edit ${tx.category} transaction`}
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteTransaction(tx.id)}
                            className="mm-icon-action-btn is-danger"
                            title="Delete transaction"
                            aria-label={`Delete ${tx.category} transaction`}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
};

export default DailyView;

