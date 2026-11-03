import React, { useMemo, useState } from 'react';
import {
  X,
  Plus,
  Pencil,
  Trash2,
  Image as ImageIcon,
  ArrowRight,
  Calendar as CalendarIcon,
} from 'lucide-react';
import { formatINR } from '../db/db';
import { renderCategoryIcon } from './money-manager/categoryIcons';

const DAY_HEADERS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * Monthly Calendar Grid View (Realbyte-style):
 * - Renders a full 7-column monthly grid with leading/trailing padding days.
 * - Displays daily Income (blue `#2563EB`) and daily Expenses (red/coral `#EF4444`) inside each date cell.
 * - Clicking any date opens a slide-over modal listing all transactions recorded on that specific day,
 *   along with quick actions to edit, delete, preview receipt images, or add a new transaction on that date.
 */
export const CalendarView = ({
  selectedMonth,
  transactions = [],
  accounts = [],
  categories = [],
  onEditTransaction,
  onDeleteTransaction,
  onOpenReceiptLightbox,
  onOpenAddModal,
}) => {
  const [selectedDateKey, setSelectedDateKey] = useState(null);

  const accountNameMap = useMemo(
    () => new Map(accounts.map((acc) => [acc.id, acc.name])),
    [accounts]
  );

  const categoryIconMap = useMemo(
    () => new Map(categories.map((cat) => [cat.name, cat.iconName])),
    [categories]
  );

  const calendarCells = useMemo(() => {
    const [yStr, mStr] = String(selectedMonth || '2026-11').split('-');
    const year = Number.parseInt(yStr, 10) || 2026;
    const monthIdx = (Number.parseInt(mStr, 10) || 11) - 1;

    const firstDayOfMonth = new Date(year, monthIdx, 1);
    const startWeekday = firstDayOfMonth.getDay(); // 0 (Sun) .. 6 (Sat)
    const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();

    // Group transactions by YYYY-MM-DD
    const txByDate = new Map();
    for (const tx of transactions) {
      if (!tx.date?.startsWith(selectedMonth)) continue;
      const dKey = tx.date.slice(0, 10);
      const list = txByDate.get(dKey) || [];
      list.push(tx);
      txByDate.set(dKey, list);
    }

    const cells = [];

    // Leading padding cells from previous month
    const prevMonthLastDate = new Date(year, monthIdx, 0).getDate();
    for (let i = startWeekday - 1; i >= 0; i -= 1) {
      const dayNum = prevMonthLastDate - i;
      cells.push({
        dateKey: `prev-${dayNum}`,
        dayOfMonth: dayNum,
        inCurrentMonth: false,
        income: 0,
        expense: 0,
        transfers: 0,
        items: [],
      });
    }

    // Current month cells
    for (let d = 1; d <= daysInMonth; d += 1) {
      const dateKey = `${selectedMonth}-${String(d).padStart(2, '0')}`;
      const items = txByDate.get(dateKey) || [];
      let income = 0;
      let expense = 0;
      let transfers = 0;

      for (const tx of items) {
        if (tx.type === 'Income') income += tx.amount;
        else if (tx.type === 'Expense') expense += tx.amount;
        else if (tx.type === 'Transfer') transfers += tx.amount;
      }

      cells.push({
        dateKey,
        dayOfMonth: d,
        inCurrentMonth: true,
        income,
        expense,
        transfers,
        items,
      });
    }

    // Trailing padding cells to complete the 7-column row
    const remainder = cells.length % 7;
    if (remainder !== 0) {
      const needed = 7 - remainder;
      for (let i = 1; i <= needed; i += 1) {
        cells.push({
          dateKey: `next-${i}`,
          dayOfMonth: i,
          inCurrentMonth: false,
          income: 0,
          expense: 0,
          transfers: 0,
          items: [],
        });
      }
    }

    return cells;
  }, [selectedMonth, transactions]);

  const activeDayData = useMemo(() => {
    if (!selectedDateKey) return null;
    return calendarCells.find((c) => c.dateKey === selectedDateKey) || null;
  }, [calendarCells, selectedDateKey]);

  return (
    <section className="mm-view-section" aria-label="Monthly Calendar View">
      <div className="mm-calendar-card">
        <div className="mm-calendar-legend">
          <div className="mm-legend-items">
            <span className="mm-legend-item">
              <span className="mm-dot mm-dot-income is-income" /> Income (Credits)
            </span>
            <span className="mm-legend-item">
              <span className="mm-dot mm-dot-expense is-expense" /> Expenses (Debits)
            </span>
          </div>
          <span className="mm-legend-hint">
            Click any date cell to inspect or add transactions for that day
          </span>
        </div>

        {/* Weekday Headers */}
        <div className="mm-calendar-weekdays mm-calendar-grid-header">
          {DAY_HEADERS.map((day, idx) => (
            <div
              key={day}
              className={`mm-calendar-weekday mm-calendar-weekday-cell${
                idx === 0 || idx === 6 ? ' weekend' : ''
              }`}
            >
              {day}
            </div>
          ))}
        </div>

        {/* Monthly Grid */}
        <div className="mm-calendar-grid" data-testid="mm-calendar-grid">
          {calendarCells.map((cell) => {
            if (!cell.inCurrentMonth) {
              return (
                <div
                  key={cell.dateKey}
                  className="mm-calendar-cell mm-calendar-cell-empty is-outside"
                  aria-hidden="true"
                >
                  <span className="mm-calendar-day-num">{cell.dayOfMonth}</span>
                </div>
              );
            }

            const hasActivity = cell.income > 0 || cell.expense > 0 || cell.transfers > 0;
            const isSelected = selectedDateKey === cell.dateKey;

            return (
              <button
                key={cell.dateKey}
                type="button"
                onClick={() => setSelectedDateKey(cell.dateKey)}
                className={`mm-calendar-cell${hasActivity ? ' has-activity' : ''}${
                  isSelected ? ' is-selected selected' : ''
                }`}
                data-testid={`mm-calendar-day-${cell.dateKey}`}
                aria-label={`Date ${cell.dateKey}, Income ${formatINR(
                  cell.income
                )}, Expense ${formatINR(cell.expense)}`}
              >
                <div className="mm-calendar-cell-top">
                  <span className="mm-calendar-day-num">{cell.dayOfMonth}</span>
                  {cell.items.length > 0 && (
                    <span className="mm-calendar-tx-count">{cell.items.length} tx</span>
                  )}
                </div>

                <div className="mm-calendar-cell-metrics">
                  {cell.income > 0 && (
                    <span className="mm-cal-metric mm-cal-income is-income">
                      +{formatINR(cell.income)}
                    </span>
                  )}
                  {cell.expense > 0 && (
                    <span className="mm-cal-metric mm-cal-expense is-expense">
                      -{formatINR(cell.expense)}
                    </span>
                  )}
                  {cell.income !== 0 || cell.expense !== 0 ? (
                    <span
                      className={`mm-cal-metric mm-cal-net is-net ${
                        cell.income - cell.expense >= 0 ? 'pos' : 'neg'
                      }`}
                    >
                      Net: {formatINR(cell.income - cell.expense, true)}
                    </span>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Slide-Over Day Transactions Modal */}
      {activeDayData && (
        <div
          className="mm-modal-backdrop mm-drawer-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label={`Transactions for ${activeDayData.dateKey}`}
          onClick={() => setSelectedDateKey(null)}
        >
          <div
            className="mm-slideover-panel mm-drawer-panel"
            onClick={(e) => e.stopPropagation()}
            data-testid="mm-calendar-day-drawer"
          >
            <div className="mm-slideover-header mm-drawer-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <CalendarIcon size={18} style={{ color: 'var(--accent)' }} />
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-heading)' }}>
                    Ledger for {activeDayData.dateKey}
                  </h3>
                  <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
                    {activeDayData.items.length} recorded{' '}
                    {activeDayData.items.length === 1 ? 'entry' : 'entries'}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDateKey(null)}
                className="mm-icon-action-btn"
                aria-label="Close day ledger drawer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mm-slideover-summary mm-drawer-summary-row">
              <div>
                <span>Daily Income</span>
                <strong className="mm-text-income">+{formatINR(activeDayData.income)}</strong>
              </div>
              <div>
                <span>Daily Expense</span>
                <strong className="mm-text-expense">-{formatINR(activeDayData.expense)}</strong>
              </div>
              <div>
                <span>Daily Net</span>
                <strong
                  className={
                    activeDayData.income - activeDayData.expense >= 0
                      ? 'mm-text-net-positive'
                      : 'mm-text-expense'
                  }
                >
                  {formatINR(activeDayData.income - activeDayData.expense, true)}
                </strong>
              </div>
            </div>

            <div className="mm-slideover-body mm-drawer-body">
              {activeDayData.items.length === 0 ? (
                <div className="mm-empty-state" style={{ padding: '28px 16px' }}>
                  <p className="mm-empty-title">
                    No transactions recorded on {activeDayData.dateKey}
                  </p>
                  <p className="mm-empty-subtitle">
                    Click below to record an income, expense, or transfer for this date.
                  </p>
                </div>
              ) : (
                <div className="mm-tx-list">
                  {activeDayData.items.map((tx) => {
                    const sourceAccount = accountNameMap.get(tx.accountId) || tx.accountId;
                    const targetAccount = tx.toAccountId
                      ? accountNameMap.get(tx.toAccountId) || tx.toAccountId
                      : '';
                    const iconName =
                      tx.type === 'Transfer'
                        ? 'ArrowLeftRight'
                        : categoryIconMap.get(tx.category);

                    return (
                      <div key={tx.id} className="mm-tx-row">
                        <div className="mm-tx-main">
                          <div className={`mm-tx-icon-box is-${tx.type.toLowerCase()}`}>
                            {renderCategoryIcon(iconName, 16)}
                          </div>
                          <div className="mm-tx-info">
                            <div className="mm-tx-title-line">
                              <strong className="mm-tx-category">
                                {tx.type === 'Transfer' ? 'Self Transfer' : tx.category}
                              </strong>
                              {tx.subCategory && (
                                <span className="mm-tx-subcategory">· {tx.subCategory}</span>
                              )}
                            </div>
                            <p className="mm-tx-note">{tx.note}</p>
                            <div className="mm-tx-submeta">
                              {tx.type === 'Transfer' ? (
                                <span className="mm-tx-account-route">
                                  <strong>{sourceAccount}</strong>
                                  <ArrowRight size={11} />
                                  <strong>{targetAccount}</strong>
                                </span>
                              ) : (
                                <span>{sourceAccount}</span>
                              )}
                              {tx.receiptImages?.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    onOpenReceiptLightbox?.(
                                      tx.receiptImages,
                                      `${tx.category} — ${activeDayData.dateKey}`
                                    )
                                  }
                                  className="mm-receipt-trigger-btn"
                                >
                                  <ImageIcon size={12} />
                                  <span>{tx.receiptImages.length} Receipt</span>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

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
                              onClick={() => {
                                setSelectedDateKey(null);
                                onEditTransaction?.(tx);
                              }}
                              className="mm-icon-action-btn"
                              aria-label="Edit transaction"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => onDeleteTransaction?.(tx.id)}
                              className="mm-icon-action-btn is-danger"
                              aria-label="Delete transaction"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="mm-slideover-footer">
              <button
                type="button"
                onClick={() => {
                  const targetDate = activeDayData.dateKey;
                  setSelectedDateKey(null);
                  onOpenAddModal?.(targetDate);
                }}
                className="mm-btn mm-btn-primary"
                style={{ width: '100%', justifyContent: 'center' }}
                data-testid="mm-calendar-add-on-date-btn"
              >
                <Plus size={16} />
                <span>Add Transaction on {activeDayData.dateKey}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default CalendarView;
