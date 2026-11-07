import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
} from 'recharts';
import { BarChart3, Layers, TrendingUp, CalendarRange } from 'lucide-react';
import {
  INITIAL_CATEGORIES,
  formatINR,
  resolveTransactionInrAmount,
  type MoneyCategory,
  type MoneyTransaction,
} from '../../db/db';
import { renderCategoryIcon } from './categoryIcons';

export interface SixMonthWindowPoint {
  yearMonth: string;
  label: string;
}

export interface CategoryMonthSpendPoint {
  yearMonth: string;
  label: string;
  spent: number;
}

export interface SixMonthCategoryComparisonRow {
  categoryId: string;
  category: string;
  color: string;
  iconName: string;
  defaultFixedOrVariable: 'Fixed' | 'Variable';
  monthlyLimit: number;
  sixMonthBudgetLimit: number;
  totalSixMonthSpent: number;
  averageMonthlySpent: number;
  shareOfSixMonthSpendPercent: number;
  sixMonthUtilizationPercent: number;
  txCount: number;
  peakMonth: CategoryMonthSpendPoint | null;
  monthlyBreakdown: CategoryMonthSpendPoint[];
}

export interface SixMonthCategoryComparisonSummary {
  referenceYearMonth: string;
  startYearMonth: string;
  periodLabel: string;
  months: SixMonthWindowPoint[];
  categories: SixMonthCategoryComparisonRow[];
  monthlyStackedData: Array<Record<string, string | number>>;
  grandTotalSixMonthSpent: number;
  grandTotalSixMonthBudget: number;
  averageMonthlyTotalSpent: number;
  topSpendingCategory: SixMonthCategoryComparisonRow | null;
  activeCategoriesCount: number;
}

const MONTH_SHORT_NAMES = [
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

/**
 * Generates the ordered 6-month window ending at `referenceYearMonth` (e.g. '2026-11').
 */
export function buildSixMonthWindow(referenceYearMonth: string): SixMonthWindowPoint[] {
  const [rawYear, rawMonth] = String(referenceYearMonth || '2026-11')
    .split('-')
    .map(Number);
  const baseYear = Number.isFinite(rawYear) && rawYear > 1970 ? rawYear : 2026;
  const baseMonth = Number.isFinite(rawMonth) && rawMonth >= 1 && rawMonth <= 12 ? rawMonth : 11;

  const result: SixMonthWindowPoint[] = [];
  for (let offset = 5; offset >= 0; offset -= 1) {
    const d = new Date(baseYear, baseMonth - 1 - offset, 1);
    const yyyy = d.getFullYear();
    const mm = d.getMonth() + 1;
    const yearMonth = `${yyyy}-${String(mm).padStart(2, '0')}`;
    const shortYear = String(yyyy).slice(-2);
    const label = `${MONTH_SHORT_NAMES[mm - 1]} '${shortYear}`;
    result.push({ yearMonth, label });
  }
  return result;
}

/**
 * Computes total spending across all categories over the 6-month window ending at `referenceYearMonth`.
 * Excludes internal bank transfers and income entries, converting any foreign-currency expenses to INR.
 */
export function computeSixMonthCategoryComparison(
  transactions: MoneyTransaction[],
  referenceYearMonth: string,
  categories: MoneyCategory[] = INITIAL_CATEGORIES
): SixMonthCategoryComparisonSummary {
  const months = buildSixMonthWindow(referenceYearMonth);
  const monthSet = new Set(months.map((m) => m.yearMonth));

  const categoryDefs =
    Array.isArray(categories) && categories.length > 0 ? categories : INITIAL_CATEGORIES;

  // Map category name -> definition
  const categoryMap = new Map<string, MoneyCategory>();
  for (const cat of categoryDefs) {
    categoryMap.set(cat.name, cat);
  }

  // Also include any custom expense categories present in the 6-month transaction window
  for (const tx of transactions || []) {
    if (!tx || tx.type !== 'Expense') continue;
    const ym = String(tx.date || '').slice(0, 7);
    if (!monthSet.has(ym)) continue;
    const catName = tx.category || 'Uncategorized';
    if (!categoryMap.has(catName)) {
      categoryMap.set(catName, {
        id: `cat-custom-${catName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
        name: catName,
        type: 'Expense',
        subCategories: [],
        defaultFixedOrVariable: tx.fixedOrVariable || 'Variable',
        iconName: 'Tag',
        color: '#64748b',
        monthlyBudget: 0,
      });
    }
  }

  // Track per-category, per-month spending and transaction count
  const spendByCatAndMonth = new Map<string, Map<string, number>>();
  const txCountByCat = new Map<string, number>();

  for (const catName of categoryMap.keys()) {
    const monthMap = new Map<string, number>();
    for (const m of months) {
      monthMap.set(m.yearMonth, 0);
    }
    spendByCatAndMonth.set(catName, monthMap);
    txCountByCat.set(catName, 0);
  }

  for (const tx of transactions || []) {
    if (!tx || tx.type !== 'Expense') continue;
    const ym = String(tx.date || '').slice(0, 7);
    if (!monthSet.has(ym)) continue;

    const catName = tx.category || 'Uncategorized';
    const amountInINR = resolveTransactionInrAmount(tx);
    if (!Number.isFinite(amountInINR) || amountInINR <= 0) continue;

    const monthMap = spendByCatAndMonth.get(catName);
    if (monthMap) {
      monthMap.set(ym, Number(((monthMap.get(ym) || 0) + amountInINR).toFixed(2)));
    }
    txCountByCat.set(catName, (txCountByCat.get(catName) || 0) + 1);
  }

  let grandTotalSixMonthSpent = 0;
  let grandTotalSixMonthBudget = 0;

  const rawRows: Omit<SixMonthCategoryComparisonRow, 'shareOfSixMonthSpendPercent'>[] = [];

  for (const [catName, def] of categoryMap.entries()) {
    const monthMap = spendByCatAndMonth.get(catName) || new Map<string, number>();
    const monthlyBreakdown: CategoryMonthSpendPoint[] = months.map((m) => ({
      yearMonth: m.yearMonth,
      label: m.label,
      spent: Math.round(monthMap.get(m.yearMonth) || 0),
    }));

    const totalSixMonthSpent = monthlyBreakdown.reduce((sum, pt) => sum + pt.spent, 0);
    const averageMonthlySpent = Math.round(totalSixMonthSpent / months.length);
    const monthlyLimit = Math.max(0, Number(def.monthlyBudget) || 0);
    const sixMonthBudgetLimit = monthlyLimit * months.length;
    const sixMonthUtilizationPercent =
      sixMonthBudgetLimit > 0
        ? Number(((totalSixMonthSpent / sixMonthBudgetLimit) * 100).toFixed(1))
        : 0;

    const activeMonths = monthlyBreakdown.filter((pt) => pt.spent > 0);
    const peakMonth =
      activeMonths.length > 0
        ? [...activeMonths].sort((a, b) => b.spent - a.spent)[0]
        : null;

    grandTotalSixMonthSpent += totalSixMonthSpent;
    grandTotalSixMonthBudget += sixMonthBudgetLimit;

    rawRows.push({
      categoryId: def.id,
      category: catName,
      color: def.color || '#38bdf8',
      iconName: def.iconName || 'Tag',
      defaultFixedOrVariable: def.defaultFixedOrVariable || 'Variable',
      monthlyLimit,
      sixMonthBudgetLimit,
      totalSixMonthSpent,
      averageMonthlySpent,
      sixMonthUtilizationPercent,
      txCount: txCountByCat.get(catName) || 0,
      peakMonth,
      monthlyBreakdown,
    });
  }

  // Sort categories by 6-month total spending descending (then by monthly limit descending)
  const categoriesSorted: SixMonthCategoryComparisonRow[] = rawRows
    .map((row) => ({
      ...row,
      shareOfSixMonthSpendPercent:
        grandTotalSixMonthSpent > 0
          ? Number(((row.totalSixMonthSpent / grandTotalSixMonthSpent) * 100).toFixed(1))
          : 0,
    }))
    .sort((a, b) => {
      if (b.totalSixMonthSpent !== a.totalSixMonthSpent) {
        return b.totalSixMonthSpent - a.totalSixMonthSpent;
      }
      return b.monthlyLimit - a.monthlyLimit;
    });

  // Build monthly stacked dataset for Recharts
  const monthlyStackedData: Array<Record<string, string | number>> = months.map((m) => {
    const point: Record<string, string | number> = {
      yearMonth: m.yearMonth,
      label: m.label,
      totalExpense: 0,
    };
    let monthTotal = 0;
    for (const row of categoriesSorted) {
      const mEntry = row.monthlyBreakdown.find((b) => b.yearMonth === m.yearMonth);
      const val = mEntry ? mEntry.spent : 0;
      point[row.category] = val;
      monthTotal += val;
    }
    point.totalExpense = monthTotal;
    return point;
  });

  const activeCategories = categoriesSorted.filter((c) => c.totalSixMonthSpent > 0);
  const topSpendingCategory = activeCategories.length > 0 ? activeCategories[0] : null;
  const startYearMonth = months[0]?.yearMonth || referenceYearMonth;
  const periodLabel = `${months[0]?.label || ''} – ${months[months.length - 1]?.label || ''}`;

  return {
    referenceYearMonth,
    startYearMonth,
    periodLabel,
    months,
    categories: categoriesSorted,
    monthlyStackedData,
    grandTotalSixMonthSpent,
    grandTotalSixMonthBudget,
    averageMonthlyTotalSpent: Math.round(grandTotalSixMonthSpent / months.length),
    topSpendingCategory,
    activeCategoriesCount: activeCategories.length,
  };
}

export interface SixMonthCategoryComparisonCardProps {
  transactions: MoneyTransaction[];
  selectedMonth: string;
  categories?: MoneyCategory[];
}

export const SixMonthCategoryComparisonCard: React.FC<SixMonthCategoryComparisonCardProps> = ({
  transactions,
  selectedMonth,
  categories = INITIAL_CATEGORIES,
}) => {
  const [chartViewMode, setChartViewMode] = useState<'category-totals' | 'monthly-stacked'>(
    'category-totals'
  );
  const [showSixMonthBudgetBars, setShowSixMonthBudgetBars] = useState<boolean>(false);

  const summary = useMemo(
    () => computeSixMonthCategoryComparison(transactions, selectedMonth, categories),
    [transactions, selectedMonth, categories]
  );

  return (
    <article
      className="mm-stat-panel mm-six-month-category-comparison-card"
      data-testid="mm-six-month-category-comparison-card"
      style={{ marginTop: 14, marginBottom: 14 }}
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
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 32,
                height: 32,
                borderRadius: 8,
                background: 'rgba(56, 189, 248, 0.14)',
                color: 'var(--accent, #38bdf8)',
              }}
            >
              <BarChart3 size={18} />
            </span>
            <h2 className="mm-stat-panel-title" style={{ margin: 0 }}>
              6-Month Category Spending Comparison ({summary.periodLabel})
            </h2>
            <span
              style={{
                fontSize: '0.72rem',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: 999,
                background: 'rgba(56, 189, 248, 0.14)',
                color: 'var(--accent, #38bdf8)',
                border: '1px solid rgba(56, 189, 248, 0.3)',
              }}
              data-testid="mm-six-month-category-period-badge"
            >
              Last 6 Months · {summary.categories.length} Categories
            </span>
          </div>
          <p className="mm-section-desc" style={{ margin: '4px 0 0' }}>
            Compares cumulative category expenditures across {summary.periodLabel} alongside monthly averages and 6-month budget capacity.
          </p>
        </div>

        {/* Interactive Chart Mode Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {chartViewMode === 'category-totals' && (
            <button
              type="button"
              onClick={() => setShowSixMonthBudgetBars((prev) => !prev)}
              className={`mm-btn mm-btn-sm ${
                showSixMonthBudgetBars ? 'mm-btn-primary' : 'mm-btn-secondary'
              }`}
              data-testid="mm-six-month-toggle-budget-bars-btn"
              title="Overlay 6-month cumulative budget limit bars for each category"
            >
              <span>{showSixMonthBudgetBars ? 'Hide 6M Budget' : 'Compare 6M Budget'}</span>
            </button>
          )}
          <div style={{ display: 'inline-flex', gap: 6 }}>
            <button
              type="button"
              onClick={() => setChartViewMode('category-totals')}
              className={`mm-btn mm-btn-sm ${
                chartViewMode === 'category-totals' ? 'mm-btn-primary' : 'mm-btn-secondary'
              }`}
              data-testid="mm-six-month-category-totals-mode-btn"
            >
              <BarChart3 size={13} />
              <span>Total by Category (6M)</span>
            </button>
            <button
              type="button"
              onClick={() => setChartViewMode('monthly-stacked')}
              className={`mm-btn mm-btn-sm ${
                chartViewMode === 'monthly-stacked' ? 'mm-btn-primary' : 'mm-btn-secondary'
              }`}
              data-testid="mm-six-month-category-stacked-mode-btn"
            >
              <Layers size={13} />
              <span>Monthly Stack</span>
            </button>
          </div>
        </div>
      </div>

      {/* 6-Month Summary KPI Strip */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(185px, 1fr))',
          gap: 10,
          marginTop: 12,
          marginBottom: 14,
        }}
        data-testid="mm-six-month-category-kpi-strip"
      >
        <div
          style={{
            padding: '10px 12px',
            borderRadius: 10,
            border: '1px solid var(--border)',
            background: 'var(--surface-muted)',
          }}
        >
          <span style={{ fontSize: '0.73rem', color: 'var(--muted)', display: 'block' }}>
            6-Month Cumulative Spend
          </span>
          <strong
            style={{ fontSize: '1.08rem', color: 'var(--text-heading)' }}
            data-testid="mm-six-month-category-grand-total"
          >
            {formatINR(summary.grandTotalSixMonthSpent)}
          </strong>
          <span style={{ fontSize: '0.72rem', color: 'var(--muted)', display: 'block', marginTop: 2 }}>
            Across {summary.activeCategoriesCount} active categories
          </span>
        </div>

        <div
          style={{
            padding: '10px 12px',
            borderRadius: 10,
            border: '1px solid var(--border)',
            background: 'var(--surface-muted)',
          }}
        >
          <span style={{ fontSize: '0.73rem', color: 'var(--muted)', display: 'block' }}>
            Avg. Monthly Spend (6M)
          </span>
          <strong
            style={{ fontSize: '1.08rem', color: 'var(--accent)' }}
            data-testid="mm-six-month-category-avg-monthly"
          >
            {formatINR(summary.averageMonthlyTotalSpent)}/mo
          </strong>
          <span style={{ fontSize: '0.72rem', color: 'var(--muted)', display: 'block', marginTop: 2 }}>
            6M Budget Capacity: {formatINR(summary.grandTotalSixMonthBudget)}
          </span>
        </div>

        <div
          style={{
            padding: '10px 12px',
            borderRadius: 10,
            border: '1px solid var(--border)',
            background: 'var(--surface-muted)',
          }}
        >
          <span style={{ fontSize: '0.73rem', color: 'var(--muted)', display: 'block' }}>
            Highest 6-Month Category
          </span>
          <strong
            style={{ fontSize: '1.02rem', color: 'var(--text-heading)' }}
            data-testid="mm-six-month-top-category-name"
          >
            {summary.topSpendingCategory ? summary.topSpendingCategory.category : 'No Expenses'}
          </strong>
          <span style={{ fontSize: '0.72rem', color: 'var(--muted)', display: 'block', marginTop: 2 }}>
            {summary.topSpendingCategory
              ? `${formatINR(summary.topSpendingCategory.totalSixMonthSpent)} (${summary.topSpendingCategory.shareOfSixMonthSpendPercent}% of 6M spend)`
              : '0% of 6-month total'}
          </span>
        </div>
      </div>

      {/* Recharts Bar Chart Container */}
      <div
        style={{ width: '100%', height: 320, marginBottom: 14 }}
        data-testid="mm-six-month-category-bar-chart"
      >
        <ResponsiveContainer width="100%" height="100%">
          {chartViewMode === 'category-totals' ? (
            <BarChart
              data={summary.categories}
              margin={{ top: 12, right: 16, left: 6, bottom: 32 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.18)" />
              <XAxis
                dataKey="category"
                stroke="var(--muted)"
                fontSize={11}
                interval={0}
                angle={-16}
                textAnchor="end"
              />
              <YAxis
                stroke="var(--muted)"
                fontSize={11}
                tickFormatter={(val: number) =>
                  val >= 1000 ? `₹${Math.round(val / 1000)}k` : `₹${val}`
                }
              />
              <RechartsTooltip
                formatter={(value: number, name: string) => [formatINR(Number(value) || 0), name]}
                labelFormatter={(label: string) => {
                  const row = summary.categories.find((c) => c.category === label);
                  if (!row) return label;
                  return `${label} · ${row.shareOfSixMonthSpendPercent}% of 6M Total (${row.txCount} txns)`;
                }}
                contentStyle={{
                  backgroundColor: 'var(--surface)',
                  borderColor: 'var(--border)',
                  borderRadius: '10px',
                  color: 'var(--text)',
                }}
              />
              <Legend />
              <Bar
                dataKey="totalSixMonthSpent"
                name="6-Month Total Spent (₹)"
                radius={[6, 6, 0, 0]}
              >
                {summary.categories.map((entry) => (
                  <Cell key={entry.categoryId} fill={entry.color} />
                ))}
              </Bar>
              <Bar
                dataKey="averageMonthlySpent"
                name="Avg. Monthly Spend (₹)"
                fill="#38bdf8"
                radius={[5, 5, 0, 0]}
              />
              {showSixMonthBudgetBars && (
                <Bar
                  dataKey="sixMonthBudgetLimit"
                  name="6-Month Budget Cap (₹)"
                  fill="rgba(148, 163, 184, 0.45)"
                  radius={[5, 5, 0, 0]}
                />
              )}
            </BarChart>
          ) : (
            <BarChart
              data={summary.monthlyStackedData}
              margin={{ top: 12, right: 16, left: 6, bottom: 8 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.18)" />
              <XAxis dataKey="label" stroke="var(--muted)" fontSize={12} />
              <YAxis
                stroke="var(--muted)"
                fontSize={11}
                tickFormatter={(val: number) =>
                  val >= 1000 ? `₹${Math.round(val / 1000)}k` : `₹${val}`
                }
              />
              <RechartsTooltip
                formatter={(value: number, name: string) => [formatINR(Number(value) || 0), name]}
                contentStyle={{
                  backgroundColor: 'var(--surface)',
                  borderColor: 'var(--border)',
                  borderRadius: '10px',
                  color: 'var(--text)',
                }}
              />
              <Legend />
              {summary.categories.map((cat) => (
                <Bar
                  key={cat.categoryId}
                  dataKey={cat.category}
                  name={cat.category}
                  stackId="sixMonthCategoryStack"
                  fill={cat.color}
                />
              ))}
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Compact 6-Month Category Breakdown Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
          gap: 10,
        }}
        data-testid="mm-six-month-category-breakdown-grid"
      >
        {summary.categories.map((row) => (
          <div
            key={row.categoryId}
            data-testid={`mm-six-month-category-item-${row.categoryId}`}
            style={{
              padding: '10px 12px',
              borderRadius: 10,
              border: '1px solid var(--border)',
              background: 'var(--surface-muted)',
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                <span
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 7,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: `${row.color}22`,
                    color: row.color,
                    flexShrink: 0,
                  }}
                >
                  {renderCategoryIcon(row.iconName, 14)}
                </span>
                <strong
                  style={{
                    fontSize: '0.84rem',
                    color: 'var(--text-heading)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {row.category}
                </strong>
              </div>
              <span
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  padding: '2px 6px',
                  borderRadius: 6,
                  background: `${row.color}20`,
                  color: row.color,
                }}
              >
                {row.shareOfSixMonthSpendPercent}%
              </span>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'baseline',
                justifyContent: 'space-between',
                gap: 8,
                fontSize: '0.78rem',
              }}
            >
              <span style={{ color: 'var(--muted)' }}>6M Total:</span>
              <strong style={{ color: 'var(--text-heading)', fontSize: '0.9rem' }}>
                {formatINR(row.totalSixMonthSpent)}
              </strong>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
                fontSize: '0.73rem',
                color: 'var(--muted)',
              }}
            >
              <span>
                <TrendingUp size={11} style={{ verticalAlign: 'middle', marginRight: 3 }} />
                Avg: {formatINR(row.averageMonthlySpent)}/mo
              </span>
              <span>
                <CalendarRange size={11} style={{ verticalAlign: 'middle', marginRight: 3 }} />
                {row.peakMonth
                  ? `Peak: ${row.peakMonth.label} (${formatINR(row.peakMonth.spent)})`
                  : 'No spend in 6M'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </article>
  );
};

export default SixMonthCategoryComparisonCard;
