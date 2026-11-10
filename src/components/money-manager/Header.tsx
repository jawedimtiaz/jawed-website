import React, { useRef, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  ListFilter,
  Landmark,
  PieChart,
  Download,
  Upload,
  Plus,
  ShieldCheck,
  ArrowLeftRight,
  Repeat,
  AlertTriangle,
} from 'lucide-react';
import { formatINR, type MonthlyMetrics } from '../../db/db';
import { downloadSampleCsvTemplate } from './csvImporter';
import { exportIndexedDbTransactionsToCsv } from './excelExporter';

export type MoneyManagerTab = 'daily' | 'calendar' | 'accounts' | 'stats' | 'recurring';

export const SWIPEABLE_MONEY_MANAGER_TABS: readonly MoneyManagerTab[] = [
  'daily',
  'calendar',
  'accounts',
  'stats',
] as const;

export const ALL_MONEY_MANAGER_TABS: readonly MoneyManagerTab[] = [
  'daily',
  'calendar',
  'accounts',
  'stats',
  'recurring',
] as const;

export interface SwipeTabOptions {
  minSwipeDistance?: number;
  maxVerticalDriftRatio?: number;
  includeRecurring?: boolean;
  wrapAround?: boolean;
}

/**
 * Pure helper that resolves the next MoneyManagerTab given a horizontal touch swipe gesture (`deltaX = endX - startX`, `deltaY = endY - startY`).
 * - Swiping left (`deltaX < 0`) advances to the next tab (Daily -> Calendar -> Accounts -> Stats).
 * - Swiping right (`deltaX > 0`) moves to the previous tab (Stats -> Accounts -> Calendar -> Daily).
 * - Ignores short taps or vertical scroll gestures.
 */
export function getNextTabBySwipe(
  currentTab: MoneyManagerTab,
  deltaX: number,
  deltaY: number = 0,
  options: SwipeTabOptions = {}
): MoneyManagerTab {
  const minSwipeDistance = options.minSwipeDistance ?? 44;
  const maxVerticalDriftRatio = options.maxVerticalDriftRatio ?? 0.75;
  const tabSequence = options.includeRecurring
    ? ALL_MONEY_MANAGER_TABS
    : SWIPEABLE_MONEY_MANAGER_TABS;

  const absX = Math.abs(deltaX);
  const absY = Math.abs(deltaY);

  if (!Number.isFinite(deltaX) || absX < minSwipeDistance) {
    return currentTab;
  }
  if (Number.isFinite(deltaY) && absY > absX * maxVerticalDriftRatio) {
    return currentTab;
  }

  const currentIdx = tabSequence.indexOf(currentTab);
  if (currentIdx === -1) {
    return deltaX < 0 ? tabSequence[0] : tabSequence[tabSequence.length - 1];
  }

  // Swipe left (deltaX < 0) -> next tab; Swipe right (deltaX > 0) -> previous tab
  const step = deltaX < 0 ? 1 : -1;
  const targetIdx = currentIdx + step;

  if (targetIdx < 0) {
    return options.wrapAround ? tabSequence[tabSequence.length - 1] : tabSequence[0];
  }
  if (targetIdx >= tabSequence.length) {
    return options.wrapAround
      ? tabSequence[0]
      : tabSequence[tabSequence.length - 1];
  }

  return tabSequence[targetIdx];
}

export interface ActiveTabContrastTokens {
  mode: 'light' | 'dark';
  textColor: string;
  indicatorColor: string;
  backgroundColor: string;
  borderColor: string;
}

/**
 * Returns WCAG high-contrast visual indicator tokens for the active Money Manager tab in both light and dark modes.
 */
export function resolveActiveTabContrastTokens(
  mode: 'light' | 'dark' = 'dark'
): ActiveTabContrastTokens {
  if (mode === 'light') {
    return {
      mode: 'light',
      textColor: '#1e3a8a',
      indicatorColor: '#1d4ed8',
      backgroundColor: 'rgba(37, 99, 235, 0.14)',
      borderColor: 'rgba(29, 78, 216, 0.45)',
    };
  }
  return {
    mode: 'dark',
    textColor: '#f8fafc',
    indicatorColor: '#38bdf8',
    backgroundColor: 'rgba(56, 189, 248, 0.2)',
    borderColor: 'rgba(56, 189, 248, 0.55)',
  };
}

export interface MoneyManagerHeaderProps {
  selectedMonth: string; // YYYY-MM
  onChangeMonth: (newMonth: string) => void;
  activeTab: MoneyManagerTab;
  onSelectTab: (tab: MoneyManagerTab) => void;
  metrics: MonthlyMetrics;
  totalNetWorth: number;
  overBudgetAlertCount?: number;
  themeMode?: 'light' | 'dark';
  onOpenAddModal: (defaultDate?: string) => void;
  onOpenBackupModal: () => void;
  onOpenCsvImportModal?: () => void;
  onCsvFileSelect?: (file: File, csvText: string) => void;
  onDownloadSampleCsv?: () => void;
  onExportToCsv?: () => void | Promise<void>;
}

const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

export function formatMonthLabel(yearMonth: string): string {
  const [yStr, mStr] = yearMonth.split('-');
  const year = Number.parseInt(yStr, 10) || 2026;
  const monthIdx = (Number.parseInt(mStr, 10) || 11) - 1;
  return `${year} ${MONTH_NAMES[monthIdx] || 'Nov'}`;
}

export function shiftYearMonth(yearMonth: string, deltaMonths: number): string {
  const [yStr, mStr] = yearMonth.split('-');
  const year = Number.parseInt(yStr, 10) || 2026;
  const monthIdx = (Number.parseInt(mStr, 10) || 11) - 1;
  const d = new Date(year, monthIdx + deltaMonths, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export const MoneyManagerHeader: React.FC<MoneyManagerHeaderProps> = ({
  selectedMonth,
  onChangeMonth,
  activeTab,
  onSelectTab,
  metrics,
  totalNetWorth,
  overBudgetAlertCount = 0,
  themeMode = 'dark',
  onOpenAddModal,
  onOpenBackupModal,
  onOpenCsvImportModal,
  onCsvFileSelect,
  onDownloadSampleCsv,
  onExportToCsv,
}) => {
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);
  const contrastTokens = resolveActiveTabContrastTokens(themeMode);

  const handleCsvFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        if (text && text.trim().length > 0) {
          onCsvFileSelect?.(file, text);
        }
      } finally {
        e.target.value = '';
      }
    };
    reader.onerror = () => {
      e.target.value = '';
    };
    reader.readAsText(file);
  };

  const handleCsvFileChange = handleCsvFileUpload;

  const handleDownloadSampleCsv = () => {
    if (onDownloadSampleCsv) {
      onDownloadSampleCsv();
      return;
    }
    const sampleData = `Date,Type,Category,Amount,Description,Payment Method
2026-11-01,Expense,Food & Dining,450.00,Client lunch,Credit Card
2026-11-02,Expense,Workplace & Tools,1200.00,Network cable tester,Bank Transfer
2026-11-05,Income,Freelance / Consulting,15000.00,IT Field dispatch payout,UPI`;

    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      const blob = new Blob([sampleData], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'jawed-money-manager-sample.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else {
      downloadSampleCsvTemplate();
    }
  };

  const handleExportToCsv = async () => {
    if (onExportToCsv) {
      await onExportToCsv();
    } else {
      await exportIndexedDbTransactionsToCsv([], [], selectedMonth);
    }
  };

  const tabs: Array<{ id: MoneyManagerTab; label: string; shortLabel: string; icon: React.ReactNode }> = [
    { id: 'daily', label: 'Daily View', shortLabel: 'Daily', icon: <ListFilter size={16} /> },
    { id: 'calendar', label: 'Calendar View', shortLabel: 'Calendar', icon: <Calendar size={16} /> },
    { id: 'accounts', label: 'Accounts View', shortLabel: 'Accounts', icon: <Landmark size={16} /> },
    { id: 'stats', label: 'Stats & Budgets', shortLabel: 'Stats', icon: <PieChart size={16} /> },
    { id: 'recurring', label: 'Recurring Transactions', shortLabel: 'Recurring', icon: <Repeat size={16} /> },
  ];

  const handleTouchStart = (e: React.TouchEvent<HTMLElement>) => {
    const touch = e.touches[0];
    if (!touch) return;
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLElement>) => {
    if (!touchStartRef.current) return;
    const touch = e.changedTouches[0];
    if (!touch) return;
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;
    touchStartRef.current = null;

    const nextTab = getNextTabBySwipe(activeTab, deltaX, deltaY);
    if (nextTab !== activeTab) {
      onSelectTab(nextTab);
    }
  };

  const handleTabKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      const next = getNextTabBySwipe(activeTab, -80, 0, { includeRecurring: true, wrapAround: true });
      onSelectTab(next);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const prev = getNextTabBySwipe(activeTab, 80, 0, { includeRecurring: true, wrapAround: true });
      onSelectTab(prev);
    }
  };

  return (
    <header className="mm-header-card" data-theme={themeMode} data-testid="mm-header-card">
      {/* Top Privacy & Action Bar */}
      <div className="mm-top-bar">
        <div className="mm-privacy-banner" role="status">
          <ShieldCheck size={15} className="mm-privacy-icon" />
          <span>🔒 100% Client-Side: Stored locally in your browser IndexedDB</span>
        </div>

        <div className="mm-top-actions">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            style={{ display: 'none' }}
            onChange={handleCsvFileUpload}
            data-testid="mm-header-direct-csv-file-input"
          />
          <input
            ref={csvInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            style={{ display: 'none' }}
            onChange={handleCsvFileChange}
            data-testid="mm-header-csv-file-input"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="mm-btn mm-btn-secondary inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-800 text-xs text-slate-200 hover:bg-slate-700 hover:text-white transition"
            title="Bulk-import transactions from a bank statement CSV file into IndexedDB"
            data-testid="mm-header-import-csv-btn"
          >
            <Upload className="w-4 h-4 text-sky-400" size={15} />
            <span>Import CSV</span>
          </button>
          <button
            type="button"
            onClick={handleDownloadSampleCsv}
            className="mm-btn mm-btn-secondary inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-800 text-xs text-slate-200 hover:bg-slate-700 hover:text-white transition"
            title="Download a pre-formatted sample CSV template that guarantees valid imports into IndexedDB"
            data-testid="mm-header-download-sample-csv-btn"
          >
            <Download className="w-4 h-4 text-emerald-400" size={15} />
            <span>Download Sample CSV</span>
          </button>
          <button
            type="button"
            onClick={handleExportToCsv}
            className="mm-btn mm-btn-secondary"
            title="Flatten IndexedDB transactions state into CSV and trigger a browser download"
            data-testid="mm-header-export-csv-btn"
          >
            <Download size={15} />
            <span>Export to CSV</span>
          </button>
          <button
            type="button"
            onClick={onOpenBackupModal}
            className="mm-btn mm-btn-secondary"
            data-testid="mm-open-backup-btn"
          >
            <Download size={15} />
            <span>Cloud Sync / Backup (.xlsx)</span>
          </button>
          <button
            type="button"
            onClick={() => onOpenAddModal()}
            className="mm-btn mm-btn-primary"
            aria-keyshortcuts="Alt+N"
            title="Add New Transaction (Shortcut: Alt + N)"
            data-testid="mm-header-add-btn"
          >
            <Plus size={16} />
            <span>Add Transaction</span>
            <kbd
              style={{
                marginLeft: 4,
                padding: '1px 5px',
                borderRadius: 4,
                background: 'rgba(255, 255, 255, 0.18)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                fontSize: '0.68rem',
                fontWeight: 700,
                fontFamily: 'var(--font-mono, monospace)',
                color: '#ffffff',
              }}
              aria-hidden="true"
            >
              Alt+N
            </kbd>
          </button>
        </div>
      </div>

      {/* Brand Title & Realbyte-Style Month Selector */}
      <div className="mm-brand-row">
        <div>
          <h1 className="mm-title">Money Manager &amp; Multi-Bank Ledger</h1>
          <p className="mm-subtitle">
            Double-entry personal finance tracker across ICICI, SBI, UBI, Cash &amp; Credit Cards
          </p>
        </div>

        <div className="mm-month-selector" aria-label="Month selector">
          <button
            type="button"
            onClick={() => onChangeMonth(shiftYearMonth(selectedMonth, -1))}
            className="mm-month-nav-btn"
            aria-label="Previous month"
            data-testid="mm-prev-month-btn"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="mm-month-label" data-testid="mm-current-month-label">
            {formatMonthLabel(selectedMonth)}
          </span>
          <button
            type="button"
            onClick={() => onChangeMonth(shiftYearMonth(selectedMonth, 1))}
            className="mm-month-nav-btn"
            aria-label="Next month"
            data-testid="mm-next-month-btn"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Top-Level Realbyte Summary Banner: Income (Blue) | Expenses (Red/Coral) | Total Net Balance */}
      <div className="mm-summary-banner" data-testid="mm-summary-banner">
        <div className="mm-summary-cell">
          <span className="mm-summary-label">Income</span>
          <strong className="mm-summary-value mm-text-income" data-testid="mm-summary-income">
            {formatINR(metrics.income)}
          </strong>
          <span className="mm-summary-sub">Monthly credits</span>
        </div>

        <div className="mm-summary-cell">
          <span className="mm-summary-label">Expenses</span>
          <strong className="mm-summary-value mm-text-expense" data-testid="mm-summary-expense">
            {formatINR(metrics.expense)}
          </strong>
          <span className="mm-summary-sub">
            Fixed {metrics.fixedRatioPercent}% · Variable {metrics.variableRatioPercent}%
          </span>
        </div>

        <div className="mm-summary-cell">
          <span className="mm-summary-label">Total (Net Cash Flow)</span>
          <strong
            className={`mm-summary-value ${
              metrics.netBalance >= 0 ? 'mm-text-net-positive' : 'mm-text-expense'
            }`}
            data-testid="mm-summary-net"
          >
            {formatINR(metrics.netBalance, true)}
          </strong>
          <span className="mm-summary-sub">
            Savings Rate: {metrics.savingsRate}% · All Accounts: {formatINR(totalNetWorth)}
          </span>
        </div>
      </div>

      {metrics.transfersVolume > 0 && (
        <div className="mm-transfer-notice">
          <ArrowLeftRight size={14} />
          <span>
            Self-transfers this month: <strong>{formatINR(metrics.transfersVolume)}</strong> (excluded from Income &amp; Expense totals per double-entry accounting rules)
          </span>
        </div>
      )}

      {/* Primary Navigation Tabs with Touch Swipe Support & High-Contrast Active Indicator */}
      <nav
        className="mm-tabs-nav"
        aria-label="Money Manager Views"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onKeyDown={handleTabKeyDown}
        data-testid="mm-header-tabs-nav"
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-current={isActive ? 'page' : undefined}
              onClick={() => onSelectTab(tab.id)}
              className={`mm-tab-btn${isActive ? ' is-active active' : ''}`}
              data-testid={`mm-tab-${tab.id}`}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {tab.id === 'stats' && overBudgetAlertCount > 0 && (
                <span
                  className="mm-budget-alert-badge is-over"
                  style={{ marginLeft: 4, padding: '1px 6px', fontSize: '0.7rem' }}
                  title={`${overBudgetAlertCount} category budget alert(s) active`}
                  data-testid="mm-tab-stats-alert-badge"
                >
                  <AlertTriangle size={10} />
                  <span>{overBudgetAlertCount}</span>
                </span>
              )}
               {isActive && (
                <span
                  className="mm-active-tab-indicator"
                  aria-hidden="true"
                  style={{ backgroundColor: contrastTokens.indicatorColor }}
                  data-testid={`mm-active-tab-indicator-${tab.id}`}
                />
              )}
            </button>
          );
        })}
      </nav>
    </header>
  );
};

export interface MoneyManagerBottomNavProps {
  activeTab: MoneyManagerTab;
  onSelectTab: (tab: MoneyManagerTab) => void;
  overBudgetAlertCount?: number;
  themeMode?: 'light' | 'dark';
}

/**
 * Touch-friendly bottom tab navigation bar for switching between Daily, Calendar, Accounts, and Stats views
 * with horizontal swipe gestures and high-contrast light/dark active indicators.
 */
export const MoneyManagerBottomNav: React.FC<MoneyManagerBottomNavProps> = ({
  activeTab,
  onSelectTab,
  overBudgetAlertCount = 0,
  themeMode = 'dark',
}) => {
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const [swipeFeedbackDelta, setSwipeFeedbackDelta] = useState<number>(0);
  const contrastTokens = resolveActiveTabContrastTokens(themeMode);

  const bottomTabs: Array<{
    id: MoneyManagerTab;
    label: string;
    icon: React.ReactNode;
  }> = [
    { id: 'daily', label: 'Daily', icon: <ListFilter size={18} /> },
    { id: 'calendar', label: 'Calendar', icon: <Calendar size={18} /> },
    { id: 'accounts', label: 'Accounts', icon: <Landmark size={18} /> },
    { id: 'stats', label: 'Stats', icon: <PieChart size={18} /> },
  ];

  const handleTouchStart = (e: React.TouchEvent<HTMLElement>) => {
    const touch = e.touches[0];
    if (!touch) return;
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    setSwipeFeedbackDelta(0);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLElement>) => {
    if (!touchStartRef.current) return;
    const touch = e.touches[0];
    if (!touch) return;
    const dx = touch.clientX - touchStartRef.current.x;
    setSwipeFeedbackDelta(Math.max(-36, Math.min(36, dx * 0.25)));
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLElement>) => {
    if (!touchStartRef.current) return;
    const touch = e.changedTouches[0];
    if (!touch) return;
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;
    touchStartRef.current = null;
    setSwipeFeedbackDelta(0);

    const nextTab = getNextTabBySwipe(activeTab, deltaX, deltaY);
    if (nextTab !== activeTab) {
      onSelectTab(nextTab);
    }
  };

  return (
    <nav
      className="mm-bottom-tab-nav"
      aria-label="Money Manager Bottom View Switcher"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      data-theme={themeMode}
      data-testid="mm-bottom-tab-nav"
      style={{
        transform: swipeFeedbackDelta ? `translateX(${swipeFeedbackDelta}px)` : undefined,
        transition: swipeFeedbackDelta ? 'none' : 'transform 0.2s ease',
      }}
    >
      <div className="mm-bottom-tab-swipe-hint" aria-hidden="true">
        <span>← Swipe left or right to switch views (Daily · Calendar · Accounts · Stats) →</span>
      </div>
      <div className="mm-bottom-tab-grid" role="tablist">
        {bottomTabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-current={isActive ? 'page' : undefined}
              onClick={() => onSelectTab(tab.id)}
              className={`mm-bottom-tab-btn${isActive ? ' is-active active' : ''}`}
              data-testid={`mm-bottom-tab-${tab.id}`}
            >
              <span className="mm-bottom-tab-icon-wrap">
                {tab.icon}
                {tab.id === 'stats' && overBudgetAlertCount > 0 && (
                  <span
                    className="mm-budget-alert-badge is-over"
                    style={{
                      position: 'absolute',
                      top: -5,
                      right: -10,
                      padding: '0 5px',
                      fontSize: '0.65rem',
                    }}
                    data-testid="mm-bottom-tab-stats-alert-badge"
                  >
                    {overBudgetAlertCount}
                  </span>
                )}
              </span>
              <span className="mm-bottom-tab-label">{tab.label}</span>
              {isActive && (
                <span
                  className="mm-active-tab-indicator"
                  aria-hidden="true"
                  style={{ backgroundColor: contrastTokens.indicatorColor }}
                  data-testid="mm-active-tab-indicator"
                />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

