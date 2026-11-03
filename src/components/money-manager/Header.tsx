import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  ListFilter,
  Landmark,
  PieChart,
  Download,
  Plus,
  ShieldCheck,
  ArrowLeftRight,
  Repeat,
  AlertTriangle,
} from 'lucide-react';
import { formatINR, type MonthlyMetrics } from '../../db/db';

export type MoneyManagerTab = 'daily' | 'calendar' | 'accounts' | 'stats' | 'recurring';

export interface MoneyManagerHeaderProps {
  selectedMonth: string; // YYYY-MM
  onChangeMonth: (newMonth: string) => void;
  activeTab: MoneyManagerTab;
  onSelectTab: (tab: MoneyManagerTab) => void;
  metrics: MonthlyMetrics;
  totalNetWorth: number;
  overBudgetAlertCount?: number;
  onOpenAddModal: (defaultDate?: string) => void;
  onOpenBackupModal: () => void;
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
  onOpenAddModal,
  onOpenBackupModal,
}) => {
  const tabs: Array<{ id: MoneyManagerTab; label: string; icon: React.ReactNode }> = [
    { id: 'daily', label: 'Daily View', icon: <ListFilter size={16} /> },
    { id: 'calendar', label: 'Calendar View', icon: <Calendar size={16} /> },
    { id: 'accounts', label: 'Accounts View', icon: <Landmark size={16} /> },
    { id: 'stats', label: 'Stats & Budgets', icon: <PieChart size={16} /> },
    { id: 'recurring', label: 'Recurring Transactions', icon: <Repeat size={16} /> },
  ];

  return (
    <header className="mm-header-card">
      {/* Top Privacy & Action Bar */}
      <div className="mm-top-bar">
        <div className="mm-privacy-banner" role="status">
          <ShieldCheck size={15} className="mm-privacy-icon" />
          <span>🔒 100% Client-Side: Stored locally in your browser IndexedDB</span>
        </div>

        <div className="mm-top-actions">
          <button
            type="button"
            onClick={onOpenBackupModal}
            className="mm-btn mm-btn-secondary"
            data-testid="mm-open-backup-btn"
          >
            <Download size={15} />
            <span>Backup / Excel (.xlsx)</span>
          </button>
          <button
            type="button"
            onClick={() => onOpenAddModal()}
            className="mm-btn mm-btn-primary"
            data-testid="mm-header-add-btn"
          >
            <Plus size={16} />
            <span>Add Transaction</span>
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

      {/* 4 Primary Navigation Tabs */}
      <nav className="mm-tabs-nav" aria-label="Money Manager Views">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSelectTab(tab.id)}
              className={`mm-tab-btn${isActive ? ' is-active' : ''}`}
              aria-current={isActive ? 'page' : undefined}
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
            </button>
          );
        })}
      </nav>
    </header>
  );
};
