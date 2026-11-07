import React, { useMemo, useState } from 'react';
import { BarChart3, Plus } from 'lucide-react';
import {
  INITIAL_CATEGORIES,
  formatINR,
  type MoneyCategory,
  type MoneyTransaction,
} from '../../db/db';
import {
  computeMonthlyBudgetPlan,
  type MonthlyBudgetPlanItem,
  type MonthlyBudgetPlanSummary,
} from './StatsView';

export type CategoryProgressColorTier =
  | 'healthy'
  | 'moderate'
  | 'warning'
  | 'over-budget'
  | 'unbudgeted';

export interface CategoryProgressColorConfig {
  tier: CategoryProgressColorTier;
  barColor: string;
  trackColor: string;
  textColor: string;
  statusLabel: string;
}

export interface CategoryBudgetProgressEntry {
  categoryId: string;
  category: string;
  expenseType: 'Fixed' | 'Variable';
  spent: number;
  monthlyLimit: number;
  remaining: number;
  overage: number;
  utilizationPercent: number;
  clampedProgressWidthPercent: number;
  txCount: number;
  tier: CategoryProgressColorTier;
  barColor: string;
  trackColor: string;
  textColor: string;
  statusLabel: string;
}

/**
 * Pure helper that resolves the percentage-based color-coded progress bar tokens
 * for a category's monthly budget utilization percentage:
 * - < 70%: Healthy (Emerald #10b981)
 * - 70% – 89.9%: Moderate / Watch (Amber #f59e0b)
 * - 90% – 99.9%: Critical Warning (Orange #f97316)
 * - >= 100%: Over Budget (Red #ef4444)
 * - Unbudgeted (monthlyLimit <= 0): Neutral Slate (#64748b)
 */
export function resolveCategoryProgressColor(
  utilizationPercent: number,
  monthlyLimit: number = 1,
  spent: number = 0
): CategoryProgressColorConfig {
  if (monthlyLimit <= 0) {
    return {
      tier: 'unbudgeted',
      barColor: '#64748b',
      trackColor: 'rgba(100, 116, 139, 0.18)',
      textColor: '#94a3b8',
      statusLabel: 'No Limit Set',
    };
  }

  if (utilizationPercent >= 100 || spent > monthlyLimit) {
    return {
      tier: 'over-budget',
      barColor: '#ef4444',
      trackColor: 'rgba(239, 68, 68, 0.2)',
      textColor: '#ef4444',
      statusLabel: 'Over Budget',
    };
  }

  if (utilizationPercent >= 90) {
    return {
      tier: 'warning',
      barColor: '#f97316',
      trackColor: 'rgba(249, 115, 22, 0.2)',
      textColor: '#f97316',
      statusLabel: 'Critical (90–99%)',
    };
  }

  if (utilizationPercent >= 70) {
    return {
      tier: 'moderate',
      barColor: '#f59e0b',
      trackColor: 'rgba(245, 158, 11, 0.18)',
      textColor: '#f59e0b',
      statusLabel: 'Approaching (70–89%)',
    };
  }

  return {
    tier: 'healthy',
    barColor: '#10b981',
    trackColor: 'rgba(16, 185, 129, 0.16)',
    textColor: '#10b981',
    statusLabel: 'On Track (<70%)',
  };
}

/**
 * Pure helper that transforms a MonthlyBudgetPlanSummary or transaction list into
 * percentage-based color-coded CategoryBudgetProgressEntry items for all categories.
 */
export function computeCategoryBudgetProgressItems(
  planOrTransactions: MonthlyBudgetPlanSummary | MoneyTransaction[],
  selectedMonth: string = '2026-11',
  categories: MoneyCategory[] = INITIAL_CATEGORIES,
  thresholdOverrides?: Record<string, number> | number
): CategoryBudgetProgressEntry[] {
  const plan: MonthlyBudgetPlanSummary = Array.isArray(planOrTransactions)
    ? computeMonthlyBudgetPlan(
        planOrTransactions,
        selectedMonth,
        categories,
        thresholdOverrides
      )
    : planOrTransactions;

  return plan.items.map((item: MonthlyBudgetPlanItem) => {
    const colorConfig = resolveCategoryProgressColor(
      item.utilizationPercent,
      item.monthlyLimit,
      item.spent
    );
    const clampedProgressWidthPercent =
      item.monthlyLimit > 0
        ? Math.min(100, Math.max(0, Number(item.utilizationPercent.toFixed(1))))
        : 0;

    return {
      categoryId: item.categoryId,
      category: item.category,
      expenseType: item.defaultFixedOrVariable,
      spent: item.spent,
      monthlyLimit: item.monthlyLimit,
      remaining: item.remaining,
      overage: item.overage,
      utilizationPercent: item.utilizationPercent,
      clampedProgressWidthPercent,
      txCount: item.txCount,
      tier: colorConfig.tier,
      barColor: colorConfig.barColor,
      trackColor: colorConfig.trackColor,
      textColor: colorConfig.textColor,
      statusLabel: colorConfig.statusLabel,
    };
  });
}

export interface CategoryBudgetProgressCardProps {
  plan: MonthlyBudgetPlanSummary;
  selectedMonth: string;
  onAdjustCategoryBudget?: (categoryName: string, newLimit: number) => Promise<void> | void;
}

export const CategoryBudgetProgressCard: React.FC<CategoryBudgetProgressCardProps> = ({
  plan,
  selectedMonth,
  onAdjustCategoryBudget,
}) => {
  const [tierFilter, setTierFilter] = useState<
    'all' | 'over-budget' | 'warning-zone' | 'healthy'
  >('all');
  const [sortBy, setSortBy] = useState<'pct-desc' | 'spent-desc' | 'name-asc'>('pct-desc');

  const allProgressItems = useMemo(
    () => computeCategoryBudgetProgressItems(plan, selectedMonth),
    [plan, selectedMonth]
  );

  const tierCounts = useMemo(() => {
    let overCount = 0;
    let warningZoneCount = 0;
    let healthyCount = 0;

    for (const item of allProgressItems) {
      if (item.tier === 'over-budget') {
        overCount += 1;
      } else if (item.tier === 'warning' || item.tier === 'moderate') {
        warningZoneCount += 1;
      } else if (item.tier === 'healthy') {
        healthyCount += 1;
      }
    }

    return {
      all: allProgressItems.length,
      overCount,
      warningZoneCount,
      healthyCount,
    };
  }, [allProgressItems]);

  const displayedItems = useMemo(() => {
    const filtered = allProgressItems.filter((item) => {
      if (tierFilter === 'over-budget') return item.tier === 'over-budget';
      if (tierFilter === 'warning-zone')
        return item.tier === 'warning' || item.tier === 'moderate';
      if (tierFilter === 'healthy') return item.tier === 'healthy';
      return true;
    });

    return [...filtered].sort((a, b) => {
      if (sortBy === 'pct-desc') {
        return b.utilizationPercent - a.utilizationPercent || b.spent - a.spent;
      }
      if (sortBy === 'spent-desc') {
        return b.spent - a.spent || b.utilizationPercent - a.utilizationPercent;
      }
      return a.category.localeCompare(b.category);
    });
  }, [allProgressItems, tierFilter, sortBy]);

  return (
    <article
      className="mm-stat-panel"
      data-testid="mm-category-budget-progress-card"
      aria-label="Category Budget Progress Card"
      style={{
        marginBottom: 14,
        padding: '20px',
        borderRadius: 14,
        border: '1px solid var(--border)',
        background: 'var(--surface)',
      }}
    >
      {/* Card Header */}
      <div
        className="mm-stat-panel-header"
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
          marginBottom: 14,
        }}
      >
        <div>
          <h3
            className="mm-stat-panel-title"
            style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <BarChart3 size={18} style={{ color: 'var(--accent)' }} />
            <span>Category Monthly Budget Progress ({selectedMonth})</span>
          </h3>
          <p className="mm-section-desc" style={{ margin: '4px 0 0', fontSize: '0.82rem' }}>
            All {allProgressItems.length} spending categories with percentage-based color-coded progress bars ·{' '}
            <strong style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--text-heading)' }}>
              {formatINR(plan.totalSpent)}
            </strong>{' '}
            spent of{' '}
            <strong style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--text-heading)' }}>
              {formatINR(plan.totalBudgeted)}
            </strong>{' '}
            total budget ({plan.overallUtilizationPercent}%)
          </p>
        </div>

        {/* Interactive Filter & Sort Controls */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            flexWrap: 'wrap',
          }}
        >
          <div
            role="group"
            aria-label="Filter categories by budget progress tier"
            style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}
          >
            <button
              type="button"
              onClick={() => setTierFilter('all')}
              className={`mm-btn mm-btn-sm ${
                tierFilter === 'all' ? 'mm-btn-primary' : 'mm-btn-secondary'
              }`}
              data-testid="mm-cat-progress-filter-all"
            >
              All ({tierCounts.all})
            </button>
            <button
              type="button"
              onClick={() => setTierFilter('over-budget')}
              className={`mm-btn mm-btn-sm ${
                tierFilter === 'over-budget' ? 'mm-btn-primary' : 'mm-btn-secondary'
              }`}
              data-testid="mm-cat-progress-filter-over"
            >
              Over Budget ({tierCounts.overCount})
            </button>
            <button
              type="button"
              onClick={() => setTierFilter('warning-zone')}
              className={`mm-btn mm-btn-sm ${
                tierFilter === 'warning-zone' ? 'mm-btn-primary' : 'mm-btn-secondary'
              }`}
              data-testid="mm-cat-progress-filter-warning"
            >
              70–99% ({tierCounts.warningZoneCount})
            </button>
            <button
              type="button"
              onClick={() => setTierFilter('healthy')}
              className={`mm-btn mm-btn-sm ${
                tierFilter === 'healthy' ? 'mm-btn-primary' : 'mm-btn-secondary'
              }`}
              data-testid="mm-cat-progress-filter-healthy"
            >
              Healthy &lt;70% ({tierCounts.healthyCount})
            </button>
          </div>

          <select
            aria-label="Sort category budget progress list"
            value={sortBy}
            onChange={(e) =>
              setSortBy(e.target.value as 'pct-desc' | 'spent-desc' | 'name-asc')
            }
            className="mm-select"
            style={{ height: 32, fontSize: '0.78rem', padding: '0 10px' }}
            data-testid="mm-cat-progress-sort-select"
          >
            <option value="pct-desc">Sort: Highest % Used</option>
            <option value="spent-desc">Sort: Highest Spend (₹)</option>
            <option value="name-asc">Sort: Category Name (A–Z)</option>
          </select>
        </div>
      </div>

      {/* Color-Coding Key Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 10,
          padding: '8px 12px',
          marginBottom: 14,
          borderRadius: 8,
          background: 'var(--surface-muted)',
          border: '1px solid var(--border)',
          fontSize: '0.76rem',
          color: 'var(--muted)',
        }}
        data-testid="mm-category-progress-legend"
      >
        <span>
          <strong style={{ color: '#10b981' }}>&lt;70% On Track (Emerald)</strong>
          <span aria-hidden="true"> · </span>
          <strong style={{ color: '#f59e0b' }}>70–89% Approaching (Amber)</strong>
          <span aria-hidden="true"> · </span>
          <strong style={{ color: '#f97316' }}>90–99% Critical (Orange)</strong>
          <span aria-hidden="true"> · </span>
          <strong style={{ color: '#ef4444' }}>&ge;100% Over Budget (Red)</strong>
        </span>
        <span style={{ fontVariantNumeric: 'tabular-nums' }}>
          Showing {displayedItems.length} of {allProgressItems.length} categories
        </span>
      </div>

      {/* Category Progress Bar Rows */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: 12,
        }}
        data-testid="mm-category-budget-progress-list"
      >
        {displayedItems.map((item) => {
          const isOver = item.tier === 'over-budget' || (item.spent > item.monthlyLimit && item.monthlyLimit > 0);

          return (
            <div
              key={item.categoryId}
              className={`mm-category-progress-row ${isOver ? 'is-over-budget' : ''}`}
              data-testid={`mm-category-progress-row-${item.category}`}
              data-category={item.category}
              data-tier={item.tier}
              data-over-budget={isOver ? 'true' : 'false'}
              style={{
                padding: '12px 14px',
                borderRadius: 10,
                border: isOver ? '1.5px solid rgba(239, 68, 68, 0.65)' : '1px solid var(--border)',
                borderLeft: isOver ? '4px solid #ef4444' : undefined,
                background: isOver ? 'rgba(239, 68, 68, 0.09)' : 'var(--surface-muted)',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              {/* Top Row: Category Name & Percentage / Spend Readout */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  justifyContent: 'space-between',
                  gap: 8,
                  flexWrap: 'wrap',
                }}
              >
                <div>
                  <strong
                    style={{
                      fontSize: '0.9rem',
                      color: isOver ? '#ef4444' : 'var(--text-heading)',
                    }}
                  >
                    {item.category}
                  </strong>
                <div
                  style={{
                    fontSize: '0.74rem',
                    color: 'var(--muted)',
                    marginTop: 2,
                  }}
                >
                  <span>{item.expenseType}</span>
                  <span aria-hidden="true"> · </span>
                  <span>
                    {item.txCount} {item.txCount === 1 ? 'entry' : 'entries'}
                  </span>
                  <span aria-hidden="true"> · </span>
                  <span style={{ color: item.textColor, fontWeight: 600 }}>
                    {item.statusLabel}
                  </span>
                </div>
              </div>

              <div
                style={{
                  textAlign: 'right',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                <strong
                  style={{
                    fontSize: '0.92rem',
                    color: item.textColor,
                  }}
                  data-testid={`mm-category-progress-percent-${item.category}`}
                >
                  {item.utilizationPercent}%
                </strong>
                <div
                  style={{
                    fontSize: '0.76rem',
                    color: 'var(--muted)',
                  }}
                >
                  <strong style={{ color: 'var(--text-heading)' }}>
                    {formatINR(item.spent)}
                  </strong>{' '}
                  / {item.monthlyLimit > 0 ? formatINR(item.monthlyLimit) : 'Unbudgeted'}
                </div>
              </div>
            </div>

            {/* Percentage-Based Color-Coded Progress Bar */}
            <div
              role="progressbar"
              aria-label={`${item.category} budget progress`}
              aria-valuenow={Math.round(item.utilizationPercent)}
              aria-valuemin={0}
              aria-valuemax={100}
              data-testid={`mm-category-progress-bar-${item.category}`}
              style={{
                width: '100%',
                height: 9,
                borderRadius: 999,
                backgroundColor: item.trackColor,
                overflow: 'hidden',
              }}
            >
              <div
                data-testid={`mm-category-progress-fill-${item.category}`}
                data-progress-tier={item.tier}
                data-progress-color={item.barColor}
                style={{
                  width: `${item.clampedProgressWidthPercent}%`,
                  height: '100%',
                  borderRadius: 999,
                  backgroundColor: item.barColor,
                  transition: 'width 0.3s ease, background-color 0.25s ease',
                }}
              />
            </div>

            {/* Bottom Metadata & Quick Limit Step */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
                fontSize: '0.75rem',
                color: 'var(--muted)',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              <span>
                {item.monthlyLimit <= 0 ? (
                  'No monthly budget limit configured'
                ) : item.overage > 0 ? (
                  <strong style={{ color: '#ef4444' }}>
                    Over limit by +{formatINR(item.overage)}
                  </strong>
                ) : (
                  <>
                    Remaining:{' '}
                    <strong style={{ color: 'var(--text-heading)' }}>
                      {formatINR(item.remaining)}
                    </strong>
                  </>
                )}
              </span>

              {onAdjustCategoryBudget && (
                <button
                  type="button"
                  onClick={() =>
                    onAdjustCategoryBudget(item.category, item.monthlyLimit + 1000)
                  }
                  className="mm-btn mm-btn-sm mm-btn-ghost"
                  style={{ padding: '2px 8px', fontSize: '0.72rem' }}
                  title={`Increase ${item.category} monthly budget by ₹1,000`}
                  data-testid={`mm-category-progress-bump-${item.category}`}
                >
                  <Plus size={11} />
                  <span>₹1k Limit</span>
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
    </article>
  );
};

export default CategoryBudgetProgressCard;
