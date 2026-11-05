import React, { useMemo, useState } from 'react';
import {
  Zap,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  RotateCcw,
} from 'lucide-react';
import {
  formatINR,
  type MoneyCategory,
  type MoneyTransaction,
  type MonthlyMetrics,
} from '../../db/db';

export interface CategoryVelocityForecastItem {
  categoryId: string;
  category: string;
  color: string;
  iconName: string;
  defaultFixedOrVariable: 'Fixed' | 'Variable';
  definedBudget: number;
  currentSpent: number;
  txCount: number;
  dailyVelocity: number;
  predictedMonthEndTotal: number;
  predictedVariance: number;
  predictedOverage: number;
  predictedHeadroom: number;
  predictedUtilizationPercent: number;
  velocityPaceRatio: number;
  comparisonStatus: 'predicted-over' | 'at-risk' | 'on-track' | 'unbudgeted';
  daysElapsed: number;
  daysRemaining: number;
  daysInMonth: number;
}

export interface BudgetForecastSummary {
  items: CategoryVelocityForecastItem[];
  totalDefinedBudget: number;
  totalCurrentSpent: number;
  totalPredictedMonthEnd: number;
  totalDailyVelocity: number;
  totalPredictedVariance: number;
  totalPredictedOverage: number;
  totalPredictedHeadroom: number;
  overallForecastUtilizationPercent: number;
  overallForecastStatus: 'predicted-over' | 'at-risk' | 'on-track' | 'unbudgeted';
  predictedOverCount: number;
  atRiskCount: number;
  onTrackCount: number;
  unbudgetedCount: number;
  daysInMonth: number;
  daysElapsed: number;
  daysRemaining: number;
}

export interface CalculateVelocityForecastOptions {
  referenceDayOfMonth?: number;
  thresholdOverrides?: Record<string, number> | number;
}

/**
 * Pure helper function that calculates spending velocity per day for the current month
 * and projects total month-end expenditure for each category against defined limits.
 */
export function calculateVelocityBudgetForecast(
  transactions: MoneyTransaction[],
  categories: MoneyCategory[],
  selectedMonth: string,
  options?: CalculateVelocityForecastOptions
): BudgetForecastSummary {
  const [yearStr, monthStr] = (selectedMonth || '').split('-');
  const year = Number.parseInt(yearStr, 10) || new Date().getFullYear();
  const monthIdx = Number.parseInt(monthStr, 10) ? Number.parseInt(monthStr, 10) - 1 : new Date().getMonth();

  const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();

  const now = new Date();
  const isCurrentMonth =
    now.getFullYear() === year && now.getMonth() === monthIdx;

  let daysElapsed = isCurrentMonth ? Math.max(1, now.getDate()) : daysInMonth;
  if (options?.referenceDayOfMonth && options.referenceDayOfMonth > 0) {
    daysElapsed = Math.min(daysInMonth, Math.max(1, options.referenceDayOfMonth));
  }

  const daysRemaining = Math.max(0, daysInMonth - daysElapsed);

  const monthTxs = transactions.filter(
    (tx) => tx.type === 'Expense' && (tx.date || '').startsWith(selectedMonth)
  );

  const categorySpendMap = new Map<string, { total: number; count: number }>();
  for (const tx of monthTxs) {
    const catName = tx.category || 'Uncategorized';
    const existing = categorySpendMap.get(catName) || { total: 0, count: 0 };
    categorySpendMap.set(catName, {
      total: existing.total + Math.abs(tx.amount),
      count: existing.count + 1,
    });
  }

  const expenseCategories = categories.filter((c) => c.type === 'Expense');

  let totalDefinedBudget = 0;
  let totalCurrentSpent = 0;
  let totalPredictedMonthEnd = 0;
  let totalDailyVelocity = 0;
  let totalPredictedOverage = 0;
  let totalPredictedHeadroom = 0;

  let predictedOverCount = 0;
  let atRiskCount = 0;
  let onTrackCount = 0;
  let unbudgetedCount = 0;

  const items: CategoryVelocityForecastItem[] = expenseCategories.map((cat) => {
    let definedBudget = cat.monthlyBudget || 0;
    if (options?.thresholdOverrides) {
      if (typeof options.thresholdOverrides === 'number') {
        definedBudget = options.thresholdOverrides;
      } else if (typeof options.thresholdOverrides[cat.name] === 'number') {
        definedBudget = options.thresholdOverrides[cat.name];
      }
    }

    const spendData = categorySpendMap.get(cat.name) || { total: 0, count: 0 };
    const currentSpent = spendData.total;
    const txCount = spendData.count;

    const dailyVelocity = currentSpent > 0 ? Math.round(currentSpent / daysElapsed) : 0;

    let predictedMonthEndTotal = currentSpent;
    if (cat.defaultFixedOrVariable === 'Fixed') {
      if (currentSpent > 0) {
        predictedMonthEndTotal = currentSpent;
      } else {
        predictedMonthEndTotal = definedBudget;
      }
    } else {
      if (currentSpent > 0) {
        predictedMonthEndTotal = Math.round((currentSpent / daysElapsed) * daysInMonth);
      } else {
        predictedMonthEndTotal = 0;
      }
    }

    const predictedVariance = definedBudget > 0 ? definedBudget - predictedMonthEndTotal : 0;
    const predictedOverage =
      definedBudget > 0 && predictedMonthEndTotal > definedBudget
        ? predictedMonthEndTotal - definedBudget
        : 0;
    const predictedHeadroom =
      definedBudget > 0 ? Math.max(0, definedBudget - predictedMonthEndTotal) : 0;

    const predictedUtilizationPercent =
      definedBudget > 0 ? Number(((predictedMonthEndTotal / definedBudget) * 100).toFixed(1)) : 0;

    const velocityPaceRatio =
      definedBudget > 0 ? Number((((dailyVelocity * daysInMonth) / definedBudget) * 100).toFixed(1)) : 0;

    let comparisonStatus: CategoryVelocityForecastItem['comparisonStatus'] = 'unbudgeted';
    if (definedBudget <= 0) {
      comparisonStatus = 'unbudgeted';
      unbudgetedCount += 1;
    } else if (predictedMonthEndTotal > definedBudget) {
      comparisonStatus = 'predicted-over';
      predictedOverCount += 1;
    } else if (predictedUtilizationPercent >= 85) {
      comparisonStatus = 'at-risk';
      atRiskCount += 1;
    } else {
      comparisonStatus = 'on-track';
      onTrackCount += 1;
    }

    totalDefinedBudget += definedBudget;
    totalCurrentSpent += currentSpent;
    totalPredictedMonthEnd += predictedMonthEndTotal;
    totalDailyVelocity += dailyVelocity;
    totalPredictedOverage += predictedOverage;
    totalPredictedHeadroom += predictedHeadroom;

    return {
      categoryId: cat.id,
      category: cat.name,
      color: cat.color || '#06b6d4',
      iconName: cat.iconName || 'Tag',
      defaultFixedOrVariable: cat.defaultFixedOrVariable || 'Variable',
      definedBudget,
      currentSpent,
      txCount,
      dailyVelocity,
      predictedMonthEndTotal,
      predictedVariance,
      predictedOverage,
      predictedHeadroom,
      predictedUtilizationPercent,
      velocityPaceRatio,
      comparisonStatus,
      daysElapsed,
      daysRemaining,
      daysInMonth,
    };
  });

  const overallForecastUtilizationPercent =
    totalDefinedBudget > 0
      ? Number(((totalPredictedMonthEnd / totalDefinedBudget) * 100).toFixed(1))
      : 0;

  const totalPredictedVariance = totalDefinedBudget - totalPredictedMonthEnd;

  let overallForecastStatus: BudgetForecastSummary['overallForecastStatus'] = 'unbudgeted';
  if (totalDefinedBudget <= 0) {
    overallForecastStatus = 'unbudgeted';
  } else if (totalPredictedMonthEnd > totalDefinedBudget) {
    overallForecastStatus = 'predicted-over';
  } else if (overallForecastUtilizationPercent >= 85) {
    overallForecastStatus = 'at-risk';
  } else {
    overallForecastStatus = 'on-track';
  }

  return {
    items,
    totalDefinedBudget,
    totalCurrentSpent,
    totalPredictedMonthEnd,
    totalDailyVelocity,
    totalPredictedVariance,
    totalPredictedOverage,
    totalPredictedHeadroom,
    overallForecastUtilizationPercent,
    overallForecastStatus,
    predictedOverCount,
    atRiskCount,
    onTrackCount,
    unbudgetedCount,
    daysInMonth,
    daysElapsed,
    daysRemaining,
  };
}

export interface BudgetForecastCardProps {
  transactions: MoneyTransaction[];
  categories: MoneyCategory[];
  selectedMonth: string;
  metrics?: MonthlyMetrics;
  onAlignCategoryBudget?: (categoryName: string, newLimit: number) => Promise<void> | void;
}

export const BudgetForecastCard: React.FC<BudgetForecastCardProps> = ({
  transactions,
  categories,
  selectedMonth,
  metrics,
  onAlignCategoryBudget,
}) => {
  const [filterStatus, setFilterStatus] = useState<
    'all' | 'predicted-over' | 'at-risk' | 'on-track' | 'unbudgeted'
  >('all');
  const [referenceDayOverride, setReferenceDayOverride] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const forecastSummary = useMemo(() => {
    return calculateVelocityBudgetForecast(transactions, categories, selectedMonth, {
      referenceDayOfMonth: referenceDayOverride ?? undefined,
    });
  }, [transactions, categories, selectedMonth, referenceDayOverride]);

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return forecastSummary.items.filter((item) => {
      if (filterStatus !== 'all' && item.comparisonStatus !== filterStatus) {
        return false;
      }
      if (q) {
        return (
          item.category.toLowerCase().includes(q) ||
          item.defaultFixedOrVariable.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [forecastSummary.items, filterStatus, searchQuery]);

  return (
    <article
      className="mm-stat-panel"
      role="region"
      aria-label="Budget Forecast Card"
      data-testid="mm-budget-forecast-card"
      style={{
        border:
          forecastSummary.predictedOverCount > 0
            ? '1.5px solid rgba(239, 68, 68, 0.4)'
            : '1.5px solid rgba(59, 130, 246, 0.35)',
        background:
          forecastSummary.predictedOverCount > 0
            ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.05), rgba(15, 23, 42, 0.02))'
            : 'linear-gradient(135deg, rgba(59, 130, 246, 0.05), rgba(15, 23, 42, 0.02))',
      }}
    >
      {/* Header Bar */}
      <div className="mm-stat-panel-header" style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 34,
              height: 34,
              borderRadius: 8,
              background:
                forecastSummary.predictedOverCount > 0
                  ? 'rgba(239, 68, 68, 0.15)'
                  : 'rgba(59, 130, 246, 0.15)',
              color: forecastSummary.predictedOverCount > 0 ? '#ef4444' : '#3b82f6',
            }}
          >
            <Zap size={18} />
          </span>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <h2
                className="mm-stat-panel-title"
                style={{ margin: 0 }}
                data-testid="mm-budget-forecast-title"
              >
                Budget Forecast ({selectedMonth})
              </h2>
              <span
                className={`mm-budget-status-pill is-${
                  forecastSummary.overallForecastStatus === 'predicted-over'
                    ? 'over'
                    : forecastSummary.overallForecastStatus === 'at-risk'
                    ? 'near'
                    : 'on-track'
                }`}
              >
                <strong data-testid="mm-budget-forecast-utilization">
                  {forecastSummary.overallForecastUtilizationPercent}%
                </strong>{' '}
                Forecast Utilization
              </span>
            </div>
            <p className="mm-section-desc" style={{ margin: '3px 0 0', fontSize: '0.8rem' }}>
              Extrapolates daily spending velocity (Day {forecastSummary.daysElapsed} of{' '}
              {forecastSummary.daysInMonth} · {forecastSummary.daysRemaining} days remaining) to predict total month-end expenditures compared to set category limits.
            </p>
          </div>
        </div>

        {/* Velocity Pace Day Slider Control */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: 'var(--muted)' }}>
            <label htmlFor="mm-budget-forecast-day-slider" style={{ fontWeight: 600 }}>
              Velocity Pace Day ({forecastSummary.daysElapsed}/{forecastSummary.daysInMonth}):
            </label>
            <input
              id="mm-budget-forecast-day-slider"
              type="range"
              min={1}
              max={forecastSummary.daysInMonth}
              value={forecastSummary.daysElapsed}
              onChange={(e) => setReferenceDayOverride(Number(e.target.value))}
              style={{ width: 100, cursor: 'pointer', accentColor: 'var(--accent)' }}
              aria-label="Simulate elapsed day for spending velocity"
              data-testid="mm-budget-forecast-day-slider"
            />
            {referenceDayOverride !== null && (
              <button
                type="button"
                onClick={() => setReferenceDayOverride(null)}
                className="mm-btn mm-btn-sm mm-btn-ghost"
                style={{ padding: '2px 6px', fontSize: '0.72rem' }}
                data-testid="mm-budget-forecast-day-reset"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* KPI Summary Strip */}
      <div
        className="mm-budget-planner-summary"
        style={{ marginBottom: 14 }}
        data-testid="mm-budget-forecast-summary-strip"
      >
        <div className="mm-budget-kpi-card">
          <span className="mm-budget-kpi-label">Current Spending Velocity</span>
          <strong
            className="mm-budget-kpi-value"
            style={{ color: 'var(--accent)' }}
            data-testid="mm-budget-forecast-daily-velocity"
          >
            {formatINR(forecastSummary.totalDailyVelocity)} / day
          </strong>
          <span className="mm-budget-kpi-sub">
            Based on {formatINR(forecastSummary.totalCurrentSpent)} spent over {forecastSummary.daysElapsed} days
          </span>
        </div>

        <div className="mm-budget-kpi-card">
          <span className="mm-budget-kpi-label">Predicted Month-End Total</span>
          <strong
            className="mm-budget-kpi-value"
            style={{
              color:
                forecastSummary.totalPredictedMonthEnd > forecastSummary.totalDefinedBudget &&
                forecastSummary.totalDefinedBudget > 0
                  ? '#ef4444'
                  : 'var(--text-heading)',
            }}
            data-testid="mm-budget-forecast-total-predicted"
          >
            {formatINR(forecastSummary.totalPredictedMonthEnd)}
          </strong>
          <span className="mm-budget-kpi-sub">
            vs {formatINR(forecastSummary.totalDefinedBudget)} total set limit
          </span>
        </div>

        <div className="mm-budget-kpi-card">
          <span className="mm-budget-kpi-label">Predicted Headroom / Overage</span>
          <strong
            className="mm-budget-kpi-value"
            style={{
              color:
                forecastSummary.totalPredictedOverage > 0 ? '#ef4444' : '#10b981',
            }}
            data-testid="mm-budget-forecast-headroom"
          >
            {forecastSummary.totalPredictedOverage > 0
              ? `+${formatINR(forecastSummary.totalPredictedOverage)} Overage`
              : `${formatINR(forecastSummary.totalPredictedHeadroom)} Headroom`}
          </strong>
          <span className="mm-budget-kpi-sub">
            {forecastSummary.totalPredictedOverage > 0
              ? 'Velocity exceeds planned budget'
              : 'Projected to finish within budget limit'}
          </span>
        </div>

        <div className="mm-budget-kpi-card">
          <span className="mm-budget-kpi-label">Velocity Alerts Status</span>
          <strong
            className="mm-budget-kpi-value"
            style={{
              color: forecastSummary.predictedOverCount > 0 ? '#ef4444' : '#10b981',
            }}
            data-testid="mm-budget-forecast-over-count"
          >
            {forecastSummary.predictedOverCount}{' '}
            {forecastSummary.predictedOverCount === 1 ? 'Category Over' : 'Categories Over'}
          </strong>
          <span className="mm-budget-kpi-sub">
            {forecastSummary.atRiskCount} at risk (≥85%) · {forecastSummary.onTrackCount} on pace
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
          flexWrap: 'wrap',
          marginBottom: 12,
        }}
        data-testid="mm-budget-forecast-filter-bar"
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setFilterStatus('all')}
            className={`mm-btn mm-btn-sm ${
              filterStatus === 'all' ? 'mm-btn-primary' : 'mm-btn-secondary'
            }`}
            data-testid="mm-budget-forecast-filter-all"
          >
            All Categories ({forecastSummary.items.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('predicted-over')}
            className={`mm-btn mm-btn-sm ${
              filterStatus === 'predicted-over' ? 'mm-btn-primary' : 'mm-btn-secondary'
            }`}
            data-testid="mm-budget-forecast-filter-over"
          >
            Predicted Over ({forecastSummary.predictedOverCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('at-risk')}
            className={`mm-btn mm-btn-sm ${
              filterStatus === 'at-risk' ? 'mm-btn-primary' : 'mm-btn-secondary'
            }`}
            data-testid="mm-budget-forecast-filter-risk"
          >
            At Risk ({forecastSummary.atRiskCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('on-track')}
            className={`mm-btn mm-btn-sm ${
              filterStatus === 'on-track' ? 'mm-btn-primary' : 'mm-btn-secondary'
            }`}
            data-testid="mm-budget-forecast-filter-ontrack"
          >
            On Pace ({forecastSummary.onTrackCount})
          </button>
        </div>

        <input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search forecast categories..."
          className="mm-input"
          style={{ maxWidth: 220, padding: '5px 10px', fontSize: '0.82rem' }}
          aria-label="Search forecast categories"
        />
      </div>

      {/* Category Velocity Grid Table */}
      <div style={{ overflowX: 'auto' }} data-testid="mm-budget-forecast-table">
        <table className="mm-table" style={{ width: '100%', fontSize: '0.84rem' }}>
          <thead>
            <tr>
              <th>Category</th>
              <th>Type</th>
              <th>Current Spend</th>
              <th>Spending Velocity</th>
              <th>Predicted Month-End</th>
              <th>Budget Limit</th>
              <th>Forecast Status</th>
              {onAlignCategoryBudget && <th style={{ textAlign: 'right' }}>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {filteredItems.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '24px 12px', color: 'var(--muted)' }}>
                  No categories match the selected forecast filter.
                </td>
              </tr>
            ) : (
              filteredItems.map((item) => {
                const isOver = item.comparisonStatus === 'predicted-over';
                const isRisk = item.comparisonStatus === 'at-risk';

                return (
                  <tr
                    key={item.category}
                    data-testid={`mm-budget-forecast-row-${item.category}`}
                  >
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span
                          className="mm-color-swatch"
                          style={{ backgroundColor: item.color, width: 10, height: 10 }}
                        />
                        <strong>{item.category}</strong>
                      </div>
                    </td>

                    <td>
                      <span
                        className={`mm-tx-fv-tag ${
                          item.defaultFixedOrVariable === 'Fixed'
                            ? 'mm-fv-fixed'
                            : 'mm-fv-variable'
                        }`}
                      >
                        {item.defaultFixedOrVariable}
                      </span>
                    </td>

                    <td>
                      <strong>{formatINR(item.currentSpent)}</strong>
                      <span style={{ fontSize: '0.74rem', color: 'var(--muted)', display: 'block' }}>
                        {item.txCount} {item.txCount === 1 ? 'tx' : 'txs'}
                      </span>
                    </td>

                    <td>
                      <span data-testid={`mm-budget-forecast-velocity-${item.category}`}>
                        <strong>{formatINR(item.dailyVelocity)}</strong> / day
                      </span>
                    </td>

                    <td>
                      <span
                        style={{
                          fontWeight: 700,
                          color: isOver ? '#ef4444' : isRisk ? '#f59e0b' : 'var(--text-heading)',
                        }}
                        data-testid={`mm-budget-forecast-predicted-${item.category}`}
                      >
                        {formatINR(item.predictedMonthEndTotal)}
                      </span>
                      {item.definedBudget > 0 && (
                        <span style={{ fontSize: '0.74rem', color: 'var(--muted)', display: 'block' }}>
                          {item.predictedUtilizationPercent}% of limit
                        </span>
                      )}
                    </td>

                    <td>
                      {item.definedBudget > 0 ? (
                        formatINR(item.definedBudget)
                      ) : (
                        <span style={{ color: 'var(--muted)', fontStyle: 'italic' }}>
                          Unbudgeted
                        </span>
                      )}
                    </td>

                    <td>
                      <span
                        className={`mm-budget-status-pill is-${
                          isOver ? 'over' : isRisk ? 'near' : 'on-track'
                        }`}
                        data-testid={`mm-budget-forecast-status-${item.category}`}
                      >
                        {isOver ? (
                          <>
                            <AlertTriangle size={11} /> Over by {formatINR(item.predictedOverage)}
                          </>
                        ) : isRisk ? (
                          <>At Risk ({item.predictedUtilizationPercent}%)</>
                        ) : item.definedBudget > 0 ? (
                          <>
                            <CheckCircle2 size={11} /> On Pace ({formatINR(item.predictedHeadroom)} headroom)
                          </>
                        ) : (
                          <>Unbudgeted</>
                        )}
                      </span>
                    </td>

                    {onAlignCategoryBudget && (
                      <td style={{ textAlign: 'right' }}>
                        {isOver && (
                          <button
                            type="button"
                            onClick={() =>
                              onAlignCategoryBudget(
                                item.category,
                                Math.ceil(item.predictedMonthEndTotal / 500) * 500
                              )
                            }
                            className="mm-btn mm-btn-sm mm-btn-secondary"
                            style={{ padding: '2px 8px', fontSize: '0.73rem' }}
                            data-testid={`mm-budget-forecast-align-btn-${item.category}`}
                            title={`Raise limit to match predicted month-end expenditure (${formatINR(
                              Math.ceil(item.predictedMonthEndTotal / 500) * 500
                            )})`}
                          >
                            Align Limit
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </article>
  );
};
