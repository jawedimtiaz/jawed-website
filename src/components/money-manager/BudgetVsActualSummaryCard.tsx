import React, { useMemo, useState, useEffect } from 'react';
import {
  Scale,
  Target,
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
  Search,
  ChevronDown,
  ChevronUp,
  ArrowDownRight,
  ArrowUpRight,
} from 'lucide-react';
import {
  formatINR,
  type MoneyCategory,
  type MoneyTransaction,
  INITIAL_CATEGORIES,
  getAllCategories,
  getAllLedgerState,
} from '../../db/db';

export interface BudgetVsActualCategoryItem {
  categoryId: string;
  category: string;
  type: 'Expense' | 'Income';
  budgeted: number;
  actual: number;
  /**
   * difference = budgeted - actual
   * Positive value: Under budget (remaining budget / savings)
   * Negative value: Over budget (overspent)
   */
  difference: number;
  absDifference: number;
  /**
   * variance between budgeted and actual expenses
   * Positive: Favorable (Under budget)
   * Negative: Unfavorable (Over budget)
   */
  variance: number;
  absVariance: number;
  variancePercent: number;
  varianceType: 'favorable' | 'unfavorable' | 'neutral';
  utilizationPercent: number;
  status: 'under-budget' | 'over-budget' | 'on-track' | 'unbudgeted';
  color: string;
  txCount: number;
  isOverBudget?: boolean;
  isUnderBudget?: boolean;
  alertColor?: 'green' | 'red' | 'gray';
  alertMessage?: string;
}

export interface BudgetVsActualSummary {
  selectedMonth: string;
  totalBudgeted: number;
  totalActual: number;
  /**
   * totalDifference = totalBudgeted - totalActual
   * Positive: Overall under budget
   * Negative: Overall over budget
   */
  totalDifference: number;
  absTotalDifference: number;
  totalVariance: number;
  absTotalVariance: number;
  overallVarianceType: 'favorable' | 'unfavorable' | 'neutral';
  overallUtilizationPercent: number;
  overallStatus: 'under-budget' | 'over-budget' | 'on-track';
  overBudgetCount: number;
  underBudgetCount: number;
  onTrackCount: number;
  unbudgetedCount: number;
  categories: BudgetVsActualCategoryItem[];
}

/**
 * Calculates the variance between budgeted and actual expenses for a category.
 * Positive variance: Favorable (Under Budget)
 * Negative variance: Unfavorable (Over Budget)
 */
export function calculateCategoryBudgetVariance(
  budgeted: number,
  actual: number
): {
  variance: number;
  absVariance: number;
  variancePercent: number;
  varianceType: 'favorable' | 'unfavorable' | 'neutral';
  isOverBudget: boolean;
  isUnderBudget: boolean;
  alertColor: 'green' | 'red' | 'gray';
  alertMessage: string;
} {
  const variance = budgeted - actual;
  const absVariance = Math.abs(variance);
  const variancePercent =
    budgeted > 0 ? Number((((budgeted - actual) / budgeted) * 100).toFixed(1)) : 0;
  const varianceType =
    variance > 0 ? 'favorable' : variance < 0 ? 'unfavorable' : 'neutral';
  const isOverBudget = actual > budgeted && budgeted > 0;
  const isUnderBudget = actual < budgeted && budgeted > 0;
  const alertColor = isOverBudget ? 'red' : isUnderBudget ? 'green' : 'gray';
  const alertMessage = isOverBudget
    ? `Over budget by ${formatINR(absVariance)}`
    : isUnderBudget
    ? `Under budget with ${formatINR(variance)} remaining`
    : budgeted === 0
    ? 'Unbudgeted'
    : 'Balanced';

  return {
    variance,
    absVariance,
    variancePercent,
    varianceType,
    isOverBudget,
    isUnderBudget,
    alertColor,
    alertMessage,
  };
}

/**
 * Pure calculation helper that computes the difference between budgeted and actual
 * expenses per category for a given month.
 */
export function computeBudgetVsActualSummary(
  transactions: MoneyTransaction[],
  categoriesOrMonth: MoneyCategory[] | string = INITIAL_CATEGORIES,
  monthOrCategories: string | MoneyCategory[] = new Date().toISOString().slice(0, 7),
  thresholdOverrides?: Record<string, number> | number
): BudgetVsActualSummary {
  let categories: MoneyCategory[];
  let selectedMonth: string;

  if (typeof categoriesOrMonth === 'string') {
    selectedMonth = categoriesOrMonth;
    categories = Array.isArray(monthOrCategories) ? monthOrCategories : INITIAL_CATEGORIES;
  } else {
    categories = Array.isArray(categoriesOrMonth) ? categoriesOrMonth : INITIAL_CATEGORIES;
    selectedMonth =
      typeof monthOrCategories === 'string'
        ? monthOrCategories
        : new Date().toISOString().slice(0, 7);
  }

  // 1. Filter expense transactions matching selected month
  const monthExpenseTx = transactions.filter(
    (tx) => tx.type === 'Expense' && tx.date && tx.date.startsWith(selectedMonth)
  );

  // 2. Sum actual spend and tx count per category
  const actualMap = new Map<string, { total: number; count: number }>();
  for (const tx of monthExpenseTx) {
    const catName = tx.category || 'Other';
    const amount = Number(tx.amount) || 0;
    const current = actualMap.get(catName) || { total: 0, count: 0 };
    actualMap.set(catName, {
      total: current.total + amount,
      count: current.count + 1,
    });
  }

  // 3. Process categories (focusing on Expense categories or any category with spend/budget)
  const expenseCategories = categories.filter(
    (cat) => cat.type === 'Expense' || (!cat.type && cat.name !== 'Salary')
  );

  // Catch any custom categories used in transactions not in categories list
  const knownCatNames = new Set(expenseCategories.map((c) => c.name));
  for (const [catName] of actualMap.entries()) {
    if (!knownCatNames.has(catName) && catName !== 'Salary' && catName !== 'IT Consulting') {
      expenseCategories.push({
        id: `custom-${catName.toLowerCase().replace(/\s+/g, '-')}`,
        name: catName,
        type: 'Expense',
        defaultFixedOrVariable: 'Variable',
        iconName: 'MoreHorizontal',
        subCategories: [],
        monthlyBudget: 0,
        color: '#94a3b8',
      });
      knownCatNames.add(catName);
    }
  }

  let totalBudgeted = 0;
  let totalActual = 0;
  let overBudgetCount = 0;
  let underBudgetCount = 0;
  let onTrackCount = 0;
  let unbudgetedCount = 0;

  const categoryItems: BudgetVsActualCategoryItem[] = expenseCategories.map((cat) => {
    const override =
      typeof thresholdOverrides === 'number' && thresholdOverrides > 0
        ? thresholdOverrides
        : thresholdOverrides && typeof thresholdOverrides === 'object' && thresholdOverrides[cat.name] !== undefined
        ? Math.max(0, thresholdOverrides[cat.name])
        : undefined;

    const budgeted = override !== undefined ? override : Math.max(0, Number(cat.monthlyBudget) || 0);
    const actualData = actualMap.get(cat.name) || { total: 0, count: 0 };
    const actual = actualData.total;
    const difference = budgeted - actual;
    const absDifference = Math.abs(difference);

    totalBudgeted += budgeted;
    totalActual += actual;

    let status: 'under-budget' | 'over-budget' | 'on-track' | 'unbudgeted';
    let utilizationPercent = 0;

    if (budgeted === 0) {
      status = actual > 0 ? 'unbudgeted' : 'on-track';
      utilizationPercent = actual > 0 ? 100 : 0;
      if (actual > 0) unbudgetedCount++;
      else onTrackCount++;
    } else {
      utilizationPercent = Number(((actual / budgeted) * 100).toFixed(1));
      if (actual > budgeted) {
        status = 'over-budget';
        overBudgetCount++;
      } else if (actual === budgeted) {
        status = 'on-track';
        onTrackCount++;
      } else {
        status = 'under-budget';
        underBudgetCount++;
      }
    }

    const varianceData = calculateCategoryBudgetVariance(budgeted, actual);

    return {
      categoryId: cat.id,
      category: cat.name,
      type: 'Expense',
      budgeted,
      actual,
      difference,
      absDifference,
      variance: varianceData.variance,
      absVariance: varianceData.absVariance,
      variancePercent: varianceData.variancePercent,
      varianceType: varianceData.varianceType,
      isOverBudget: varianceData.isOverBudget,
      isUnderBudget: varianceData.isUnderBudget,
      alertColor: varianceData.alertColor,
      alertMessage: varianceData.alertMessage,
      utilizationPercent,
      status,
      color: cat.color || '#64748b',
      txCount: actualData.count,
    };
  });

  // Sort: Over-budget first (highest overage), then highest actual spend
  categoryItems.sort((a, b) => {
    if (a.status === 'over-budget' && b.status !== 'over-budget') return -1;
    if (b.status === 'over-budget' && a.status !== 'over-budget') return 1;
    if (a.status === 'over-budget' && b.status === 'over-budget') {
      return a.difference - b.difference; // more negative first
    }
    return b.actual - a.actual || b.budgeted - a.budgeted;
  });

  const totalDifference = totalBudgeted - totalActual;
  const absTotalDifference = Math.abs(totalDifference);
  const totalVariance = totalDifference;
  const absTotalVariance = absTotalDifference;
  const overallVarianceType: 'favorable' | 'unfavorable' | 'neutral' =
    totalVariance > 0 ? 'favorable' : totalVariance < 0 ? 'unfavorable' : 'neutral';
  const overallUtilizationPercent =
    totalBudgeted > 0 ? Number(((totalActual / totalBudgeted) * 100).toFixed(1)) : 0;

  const overallStatus: 'under-budget' | 'over-budget' | 'on-track' =
    totalActual > totalBudgeted
      ? 'over-budget'
      : totalActual === totalBudgeted
      ? 'on-track'
      : 'under-budget';

  return {
    selectedMonth,
    totalBudgeted,
    totalActual,
    totalDifference,
    absTotalDifference,
    totalVariance,
    absTotalVariance,
    overallVarianceType,
    overallUtilizationPercent,
    overallStatus,
    overBudgetCount,
    underBudgetCount,
    onTrackCount,
    unbudgetedCount,
    categories: categoryItems,
  };
}

export interface CategoryBudgetVarianceResult {
  categoryId: string;
  category: string;
  budgetLimit: number;
  actualExpenses: number;
  variance: number;
  absVariance: number;
  variancePercent: number;
  varianceType: 'favorable' | 'unfavorable' | 'neutral';
  isOverBudget: boolean;
  isUnderBudget: boolean;
  alertColor: 'green' | 'red' | 'gray';
  alertMessage: string;
  status: 'under-budget' | 'over-budget' | 'on-track' | 'unbudgeted';
  color: string;
}

/**
 * Iterates over all categories, comparing budget limits against actual expenses
 * for the current month, returning color-coded variance records.
 */
export function computeCategoryBudgetVariances(
  transactions: MoneyTransaction[],
  categories: MoneyCategory[],
  selectedMonth: string = new Date().toISOString().slice(0, 7),
  thresholdOverrides?: Record<string, number> | number
): CategoryBudgetVarianceResult[] {
  const summary = computeBudgetVsActualSummary(
    transactions,
    categories,
    selectedMonth,
    thresholdOverrides
  );
  return summary.categories.map((c) => ({
    categoryId: c.categoryId,
    category: c.category,
    budgetLimit: c.budgeted,
    actualExpenses: c.actual,
    variance: c.variance,
    absVariance: c.absVariance,
    variancePercent: c.variancePercent,
    varianceType: c.varianceType,
    isOverBudget: Boolean(c.isOverBudget ?? c.status === 'over-budget'),
    isUnderBudget: Boolean(c.isUnderBudget ?? c.status === 'under-budget'),
    alertColor: c.alertColor || (c.status === 'over-budget' ? 'red' : c.status === 'under-budget' ? 'green' : 'gray'),
    alertMessage: c.alertMessage || '',
    status: c.status,
    color: c.color,
  }));
}

/**
 * Loads stored budget limits and transactions directly from IndexedDB, compares
 * budget limits against actual sum of expenses for the given month, and returns variances.
 */
export async function loadCategoryBudgetVariancesFromIndexedDb(
  selectedMonth: string = new Date().toISOString().slice(0, 7)
): Promise<CategoryBudgetVarianceResult[]> {
  const [categories, state] = await Promise.all([
    getAllCategories(),
    getAllLedgerState().catch(() => ({ transactions: [] as MoneyTransaction[] })),
  ]);
  return computeCategoryBudgetVariances(
    state.transactions || [],
    categories && categories.length > 0 ? categories : INITIAL_CATEGORIES,
    selectedMonth
  );
}

export interface BudgetVsActualSummaryCardProps {
  selectedMonth: string;
  transactions: MoneyTransaction[];
  categories?: MoneyCategory[];
  thresholdOverrides?: Record<string, number> | number;
  className?: string;
  defaultExpanded?: boolean;
}

export const BudgetVsActualSummaryCard: React.FC<BudgetVsActualSummaryCardProps> = ({
  selectedMonth,
  transactions,
  categories = INITIAL_CATEGORIES,
  thresholdOverrides,
  className = '',
  defaultExpanded = true,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(defaultExpanded);
  const [filterStatus, setFilterStatus] = useState<'all' | 'over' | 'under'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [dbCategories, setDbCategories] = useState<MoneyCategory[]>(categories);

  useEffect(() => {
    let isMounted = true;
    getAllCategories()
      .then((cats) => {
        if (isMounted && Array.isArray(cats) && cats.length > 0) {
          setDbCategories(cats);
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, [categories, selectedMonth]);

  const effectiveCategories = useMemo(() => {
    if (categories && categories !== INITIAL_CATEGORIES && categories.length > 0) {
      const dbBudgetMap = new Map<string, number>();
      for (const dc of dbCategories) {
        if (typeof dc.monthlyBudget === 'number' && dc.monthlyBudget > 0) {
          dbBudgetMap.set(dc.name, dc.monthlyBudget);
          dbBudgetMap.set(dc.id, dc.monthlyBudget);
        }
      }
      return categories.map((c) => {
        const storedBudget = dbBudgetMap.get(c.id) ?? dbBudgetMap.get(c.name);
        return storedBudget !== undefined && (c.monthlyBudget === undefined || c.monthlyBudget === 0)
          ? { ...c, monthlyBudget: storedBudget }
          : c;
      });
    }
    return dbCategories.length > 0 ? dbCategories : INITIAL_CATEGORIES;
  }, [categories, dbCategories]);

  const summary = useMemo(() => {
    return computeBudgetVsActualSummary(
      transactions,
      effectiveCategories,
      selectedMonth,
      thresholdOverrides
    );
  }, [transactions, effectiveCategories, selectedMonth, thresholdOverrides]);

  const filteredCategories = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return summary.categories.filter((item) => {
      if (filterStatus === 'over' && item.status !== 'over-budget') return false;
      if (filterStatus === 'under' && item.status !== 'under-budget') return false;
      if (q && !item.category.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [summary.categories, filterStatus, searchQuery]);

  const isNetUnder = summary.totalDifference >= 0;

  return (
    <article
      className={`rounded-2xl border border-slate-700/80 bg-slate-900/90 p-4 sm:p-5 text-slate-100 shadow-xl backdrop-blur-md mb-4 transition-all ${className}`}
      data-testid="budget-vs-actual-summary-card"
      data-card="category-budget-variance-summary-card"
      aria-label="Budget vs Actual Summary"
    >
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-inner">
            <Scale className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Budget vs Actual Summary
              </h3>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                {selectedMonth}
              </span>
              {isNetUnder ? (
                <span
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                  data-testid="bva-overall-status-badge"
                >
                  <ArrowDownRight className="h-3 w-3" />
                  <span>+{formatINR(summary.totalDifference)} Remaining</span>
                </span>
              ) : (
                <span
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30"
                  data-testid="bva-overall-status-badge"
                >
                  <ArrowUpRight className="h-3 w-3" />
                  <span>-{formatINR(summary.absTotalDifference)} Over Budget</span>
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Calculates real-time variance between planned budget limits and actual expenses per category
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          <button
            type="button"
            onClick={() => setIsExpanded((prev) => !prev)}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-800/80 text-xs font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition"
            data-testid="bva-toggle-expand-btn"
          >
            <span>{isExpanded ? 'Collapse' : 'Expand Details'}</span>
            {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {/* Aggregate Metric Highlights (Top Cards) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
        {/* Total Budgeted */}
        <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 flex flex-col">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Total Budgeted</span>
            <Target className="h-3.5 w-3.5 text-indigo-400" />
          </div>
          <span
            className="text-lg sm:text-xl font-extrabold text-white mt-1"
            data-testid="bva-total-budgeted"
          >
            {formatINR(summary.totalBudgeted)}
          </span>
          <span className="text-[11px] text-slate-400 mt-0.5">
            Across {summary.categories.filter((c) => c.budgeted > 0).length} budgeted categories
          </span>
        </div>

        {/* Total Actual */}
        <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 flex flex-col">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Actual Expenses</span>
            <TrendingDown className="h-3.5 w-3.5 text-rose-400" />
          </div>
          <span
            className="text-lg sm:text-xl font-extrabold text-white mt-1"
            data-testid="bva-total-actual"
          >
            {formatINR(summary.totalActual)}
          </span>
          <span className="text-[11px] text-slate-400 mt-0.5">
            {summary.overallUtilizationPercent}% of total planned limit
          </span>
        </div>

        {/* Net Difference */}
        <div
          className={`p-3 rounded-xl border flex flex-col ${
            isNetUnder
              ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-950/20 border-rose-500/30 text-rose-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs opacity-90">
            <span>Net Difference</span>
            {isNetUnder ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
            ) : (
              <AlertTriangle className="h-3.5 w-3.5 text-rose-400" />
            )}
          </div>
          <span
            className="text-lg sm:text-xl font-extrabold mt-1"
            data-testid="bva-total-difference"
          >
            {isNetUnder ? `+${formatINR(summary.totalDifference)}` : `-${formatINR(summary.absTotalDifference)}`}
          </span>
          <span className="text-[11px] opacity-80 mt-0.5">
            {isNetUnder ? 'Under budget (savings buffer)' : 'Over budget across categories'}
          </span>
        </div>

        {/* Category Health */}
        <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 flex flex-col">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Category Health</span>
            <Scale className="h-3.5 w-3.5 text-sky-400" />
          </div>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-base sm:text-lg font-bold text-emerald-400">
              {summary.underBudgetCount} Under
            </span>
            <span className="text-xs text-slate-400">·</span>
            <span className="text-base sm:text-lg font-bold text-rose-400">
              {summary.overBudgetCount} Over
            </span>
          </div>
          <span className="text-[11px] text-slate-400 mt-0.5">
            {summary.onTrackCount} on track · {summary.unbudgetedCount} unbudgeted
          </span>
        </div>
      </div>

      {/* Category Budget Variance Alerts Grid (Color-coded: Green for under budget, Red for over) */}
      <div
        className="mt-4 pt-4 border-t border-slate-800"
        data-testid="category-budget-variance-alerts-section"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <Scale className="h-4 w-4 text-indigo-400" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Category Budget Variance Alerts ({selectedMonth})
            </h4>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span
              className="inline-flex items-center gap-1.5 text-emerald-400 font-medium"
              data-testid="bva-under-budget-count"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>{summary.underBudgetCount} Under Budget (Green)</span>
            </span>
            <span className="text-slate-600">·</span>
            <span
              className="inline-flex items-center gap-1.5 text-rose-400 font-medium"
              data-testid="bva-over-budget-count"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
              <span>{summary.overBudgetCount} Over Budget (Red)</span>
            </span>
          </div>
        </div>

        <div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
          data-testid="category-budget-variance-alerts-grid"
        >
          {summary.categories.map((item) => {
            const isOver = item.status === 'over-budget';
            const isUnder = item.status === 'under-budget';
            const alertColor = isOver ? 'red' : isUnder ? 'green' : 'neutral';

            return (
              <div
                key={item.categoryId || item.category}
                className={`p-3.5 rounded-xl border transition-all ${
                  isOver
                    ? 'bg-rose-950/20 border-rose-500/35 text-rose-100 shadow-sm'
                    : isUnder
                    ? 'bg-emerald-950/20 border-emerald-500/35 text-emerald-100 shadow-sm'
                    : 'bg-slate-800/40 border-slate-700/50 text-slate-300'
                }`}
                data-testid={`category-variance-alert-${item.category}`}
                data-status={item.status}
                data-alert-color={alertColor}
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 truncate">
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-xs font-bold truncate text-white">
                      {item.category}
                    </span>
                  </div>

                  {isOver && (
                    <span
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/25 text-rose-300 border border-rose-500/40"
                      data-testid={`category-variance-alert-over-${item.category}`}
                      data-alert="over"
                    >
                      <AlertTriangle className="h-3 w-3 text-rose-400" />
                      <span>Over Budget</span>
                    </span>
                  )}
                  {isUnder && (
                    <span
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/25 text-emerald-300 border border-emerald-500/40"
                      data-testid={`category-variance-alert-under-${item.category}`}
                      data-alert="under"
                    >
                      <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                      <span>Under Budget</span>
                    </span>
                  )}
                  {!isOver && !isUnder && (
                    <span className="text-[10px] text-slate-400 font-medium">
                      {item.status === 'unbudgeted' ? 'Unbudgeted' : 'On Track'}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs font-mono mb-2">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-sans">
                      Stored Limit:
                    </span>
                    <span className="font-semibold text-slate-200">
                      {item.budgeted > 0 ? formatINR(item.budgeted) : '₹0'}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block font-sans">
                      Actual Expenses:
                    </span>
                    <span className="font-semibold text-white">
                      {formatINR(item.actual)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-700/50 text-xs font-mono">
                  <span className="text-[10px] text-slate-400 font-sans">Variance:</span>
                  <span
                    className={`font-bold ${
                      isOver
                        ? 'text-rose-400'
                        : isUnder
                        ? 'text-emerald-400'
                        : 'text-slate-300'
                    }`}
                    data-testid={`category-variance-value-${item.category}`}
                  >
                    {isOver
                      ? `-${formatINR(item.absVariance)}`
                      : isUnder
                      ? `+${formatINR(item.variance)}`
                      : '₹0'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Expanded Per-Category Breakdown Table & List */}
      {isExpanded && (
        <div className="mt-5 pt-4 border-t border-slate-800">
          {/* Controls bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs text-slate-400 font-medium mr-1">Filter:</span>
              <button
                type="button"
                onClick={() => setFilterStatus('all')}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                  filterStatus === 'all'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
                data-testid="bva-status-filter-all"
              >
                All ({summary.categories.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus('over')}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                  filterStatus === 'over'
                    ? 'bg-rose-600 text-white'
                    : 'bg-slate-800 text-rose-300 hover:bg-slate-700'
                }`}
                data-testid="bva-status-filter-over"
              >
                Over Budget ({summary.overBudgetCount})
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus('under')}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                  filterStatus === 'under'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-800 text-emerald-300 hover:bg-slate-700'
                }`}
                data-testid="bva-status-filter-under"
              >
                Under Budget ({summary.underBudgetCount})
              </button>
            </div>

            <div className="relative w-full sm:w-56">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search category…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800/80 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                data-testid="bva-search-input"
              />
            </div>
          </div>

          {/* Table / List */}
          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/60">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-800/50 text-slate-400 font-semibold">
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3 text-right">Budgeted</th>
                  <th className="py-2.5 px-3 text-right">Actual Spent</th>
                  <th className="py-2.5 px-3 text-right">Difference (Variance)</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 w-32">Utilization</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredCategories.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-slate-500">
                      No categories found matching filter.
                    </td>
                  </tr>
                ) : (
                  filteredCategories.map((item) => {
                    const isOver = item.status === 'over-budget';
                    const isUnder = item.status === 'under-budget';
                    const isUnbudgeted = item.status === 'unbudgeted';
                    const barFill = Math.min(100, item.utilizationPercent);
                    const barColor = isOver
                      ? 'bg-rose-500'
                      : item.utilizationPercent >= 85
                      ? 'bg-amber-500'
                      : 'bg-emerald-500';

                    return (
                      <tr
                        key={item.categoryId || item.category}
                        className="hover:bg-slate-800/30 transition-colors"
                        data-testid={`bva-category-row-${item.category}`}
                        data-status={item.status}
                      >
                        <td className="py-2.5 px-3 font-medium text-slate-200">
                          <div className="flex items-center gap-2">
                            <span
                              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                              style={{ backgroundColor: item.color }}
                            />
                            <span>{item.category}</span>
                            {item.txCount > 0 && (
                              <span className="text-[10px] text-slate-500 font-normal">
                                ({item.txCount} tx)
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-right font-medium text-slate-300">
                          {formatINR(item.budgeted)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-semibold text-white">
                          {formatINR(item.actual)}
                        </td>
                        <td
                          className={`py-2.5 px-3 text-right font-bold ${
                            isOver
                              ? 'text-rose-400 text-red-400'
                              : isUnder
                              ? 'text-emerald-400 text-green-400'
                              : 'text-slate-300'
                          }`}
                          data-testid={`bva-difference-${item.category}`}
                          data-color={isOver ? 'red' : isUnder ? 'green' : 'gray'}
                        >
                          {item.difference > 0
                            ? `+${formatINR(item.difference)} (Remaining)`
                            : item.difference < 0
                            ? `-${formatINR(item.absDifference)} (Over)`
                            : `₹0 (Balanced)`}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {isOver && (
                            <span
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-500/15 text-rose-400 text-red-400 border border-rose-500/30 border-red-500/30"
                              data-color="red"
                              data-testid={`bva-alert-${item.category}`}
                            >
                              <AlertTriangle className="h-3 w-3" />
                              <span>Over</span>
                            </span>
                          )}
                          {isUnder && (
                            <span
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/15 text-emerald-400 text-green-400 border border-emerald-500/30 border-green-500/30"
                              data-color="green"
                              data-testid={`bva-alert-${item.category}`}
                            >
                              <CheckCircle2 className="h-3 w-3" />
                              <span>Under</span>
                            </span>
                          )}
                          {item.status === 'on-track' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-800 text-slate-300 border border-slate-700">
                              Balanced
                            </span>
                          )}
                          {isUnbudgeted && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                              Unbudgeted
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 rounded-full bg-slate-800 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-300 ${barColor}`}
                                style={{ width: `${barFill}%` }}
                              />
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono w-9 text-right">
                              {item.utilizationPercent}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </article>
  );
};

export const CategoryBudgetVarianceSummaryCard = BudgetVsActualSummaryCard;
export const BudgetVarianceSummaryCard = BudgetVsActualSummaryCard;

export default BudgetVsActualSummaryCard;
